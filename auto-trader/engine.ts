// 主交易引擎
import { Strategy, MarketData, Signal } from './strategies';
import { RiskManager, RiskConfig, Position } from './utils/riskManager';
import { logger, logTrade, logStrategy } from './utils/logger';

interface Trade {
    id: string;
    marketId: string;
    side: 'BUY' | 'SELL';
    size: number;
    price: number;
    timestamp: Date;
    strategy: string;
    pnl?: number;
    status: 'OPEN' | 'CLOSED';
}

interface TraderConfig {
    risk: RiskConfig;
    strategies: {
        type: string;
        params: any;
        weight: number;
    }[];
    initialBalance: number;
}

export class TradingEngine {
    private riskManager: RiskManager;
    private strategies: Strategy[] = [];
    private marketData: Map<string, MarketData[]> = new Map();
    private trades: Trade[] = [];
    private isRunning: boolean = false;
    private config: TraderConfig;

    constructor(config: TraderConfig) {
        this.config = config;
        this.riskManager = new RiskManager(config.risk, config.initialBalance);
        
        // 初始化策略
        for (const stratConfig of config.strategies) {
            const strategy = this.createStrategy(stratConfig.type, stratConfig.params);
            this.strategies.push(strategy);
            logger.info(`加载策略: ${strategy.getName()} (权重: ${stratConfig.weight})`);
        }

        logger.info('交易引擎初始化完成');
    }

    // 创建策略实例
    private createStrategy(type: string, params: any) {
        const { StrategyFactory } = require('./strategies');
        return StrategyFactory.create(type, params);
    }

    // 启动交易引擎
    async start(): Promise<void> {
        this.isRunning = true;
        logger.info('交易引擎启动');

        // 主循环
        while (this.isRunning) {
            try {
                await this.tick();
                // 每秒检查一次
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error('交易循环错误:', error);
            }
        }
    }

    // 停止交易引擎
    stop(): void {
        this.isRunning = false;
        logger.info('交易引擎停止');
    }

    // 主循环逻辑
    private async tick(): Promise<void> {
        // 1. 更新市场数据
        await this.fetchMarketData();

        // 2. 检查现有持仓的退出条件
        await this.checkExitConditions();

        // 3. 运行策略生成信号
        const signals = await this.generateSignals();

        // 4. 执行交易
        for (const signal of signals) {
            await this.executeSignal(signal);
        }

        // 5. 记录状态
        this.logStatus();
    }

    // 获取市场数据（模拟）
    private async fetchMarketData(): Promise<void> {
        // 实际使用时接入真实数据源
        // 这里使用模拟数据演示
        const markets = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
        
        for (const marketId of markets) {
            if (!this.marketData.has(marketId)) {
                this.marketData.set(marketId, []);
            }

            const data = this.marketData.get(marketId)!;
            
            // 模拟价格更新
            const lastPrice = data.length > 0 ? data[data.length - 1].price : 50000;
            const change = (Math.random() - 0.5) * 0.02; // ±1% 波动
            const newPrice = lastPrice * (1 + change);

            data.push({
                marketId,
                price: newPrice,
                timestamp: Date.now(),
                volume24h: Math.random() * 1000000
            });

            // 保持最近 100 个数据点
            if (data.length > 100) {
                data.shift();
            }
        }
    }

    // 检查退出条件
    private async checkExitConditions(): Promise<void> {
        const positions = this.riskManager.getPositions();

        for (const position of positions) {
            const marketData = this.marketData.get(position.marketId);
            if (!marketData || marketData.length === 0) continue;

            const currentPrice = marketData[marketData.length - 1].price;
            
            const exitCheck = this.riskManager.checkExitConditions(position.id, currentPrice);
            
            if (exitCheck.shouldExit) {
                logger.info(`触发退出: ${position.id}, 原因: ${exitCheck.reason}`);
                await this.closePosition(position.id, currentPrice, exitCheck.reason!);
            }
        }
    }

    // 生成交易信号
    private async generateSignals(): Promise<Signal[]> {
        const signals: Signal[] = [];

        for (const marketId of this.marketData.keys()) {
            const data = this.marketData.get(marketId)!;
            if (data.length < 20) continue;

            // 运行所有策略
            for (const strategy of this.strategies) {
                const signal = strategy.analyze(data);
                if (signal && signal.action !== 'HOLD' && signal.confidence > 0.5) {
                    signals.push({
                        ...signal,
                        marketId
                    } as Signal);
                }
            }
        }

        return signals;
    }

    // 执行交易信号
    private async executeSignal(signal: Signal & { marketId: string }): Promise<void> {
        // 检查风险限制
        const positionSize = 100; // 默认仓位大小
        const riskCheck = this.riskManager.canOpenPosition(positionSize);

        if (!riskCheck.allowed) {
            logger.warn(`风险检查未通过: ${riskCheck.reason}`);
            return;
        }

        // 检查是否已有该市场持仓
        const existingPositions = this.riskManager.getPositions()
            .filter(p => p.marketId === signal.marketId);
        
        if (existingPositions.length > 0) {
            logger.warn(`已有 ${signal.marketId} 持仓，跳过`);
            return;
        }

        // 执行交易
        const marketData = this.marketData.get(signal.marketId)!;
        const currentPrice = marketData[marketData.length - 1].price;

        const side = signal.action === 'BUY' ? 'LONG' : 'SHORT';
        
        // 创建持仓
        const position: Position = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            marketId: signal.marketId,
            side,
            entryPrice: currentPrice,
            size: positionSize,
            entryTime: new Date(),
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit
        };

        this.riskManager.addPosition(position);

        // 记录交易
        const trade: Trade = {
            id: position.id,
            marketId: signal.marketId,
            side: signal.action,
            size: positionSize,
            price: currentPrice,
            timestamp: new Date(),
            strategy: 'multi-strategy',
            status: 'OPEN'
        };
        this.trades.push(trade);

        logTrade('OPEN', {
            marketId: signal.marketId,
            side: signal.action,
            price: currentPrice,
            size: positionSize,
            reason: signal.reason
        });

        logger.info(`开仓: ${signal.marketId} ${signal.action} @ $${currentPrice.toFixed(2)}`);
    }

    // 平仓
    private async closePosition(positionId: string, exitPrice: number, reason: string): Promise<void> {
        const result = this.riskManager.removePosition(positionId, exitPrice);
        
        // 更新交易记录
        const trade = this.trades.find(t => t.id === positionId);
        if (trade) {
            trade.status = 'CLOSED';
            trade.pnl = result.pnl;
        }

        logTrade('CLOSE', {
            positionId,
            exitPrice,
            pnl: result.pnl,
            pnlPercent: result.pnlPercent,
            reason
        });

        logger.info(`平仓: ${positionId}, 盈亏: $${result.pnl.toFixed(2)} (${result.pnlPercent.toFixed(2)}%)`);
    }

    // 记录状态
    private logStatus(): void {
        const status = this.riskManager.getStatus();
        logger.info(`状态: 余额 $${status.currentBalance.toFixed(2)}, ` +
                   `盈亏 $${status.totalPnl.toFixed(2)}, ` +
                   `持仓 ${status.openPositions}, ` +
                   `回撤 ${status.drawdown.toFixed(2)}%`);
    }

    // 获取交易历史
    getTradeHistory(): Trade[] {
        return this.trades;
    }

    // 获取当前状态
    getStatus() {
        return {
            ...this.riskManager.getStatus(),
            isRunning: this.isRunning,
            strategies: this.strategies.map(s => s.getName())
        };
    }
}
