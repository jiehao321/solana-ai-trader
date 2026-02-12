// 回测系统
import { Strategy, MarketData, Signal } from './strategies';
import { logger } from './utils/logger';

interface BacktestConfig {
    initialBalance: number;
    strategy: {
        type: string;
        params: any;
    };
    riskPerTrade: number;  // 每笔交易风险百分比
    stopLossPercent: number;
    takeProfitPercent: number;
}

interface BacktestResult {
    finalBalance: number;
    totalReturn: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: BacktestTrade[];
}

interface BacktestTrade {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    side: 'LONG' | 'SHORT';
    size: number;
    pnl: number;
    pnlPercent: number;
    exitReason: string;
}

export class Backtester {
    private config: BacktestConfig;

    constructor(config: BacktestConfig) {
        this.config = config;
    }

    // 运行回测
    run(data: MarketData[]): BacktestResult {
        logger.info('开始回测...');
        logger.info(`数据点: ${data.length}`);
        logger.info(`初始资金: $${this.config.initialBalance}`);

        // 创建策略实例
        const StrategyClass = this.getStrategyClass(this.config.strategy.type);
        const strategy = new StrategyClass(this.config.strategy.params);

        let balance = this.config.initialBalance;
        let maxBalance = balance;
        let maxDrawdown = 0;
        
        const trades: BacktestTrade[] = [];
        let currentPosition: {
            entryTime: number;
            entryPrice: number;
            side: 'LONG' | 'SHORT';
            size: number;
            stopLoss: number;
            takeProfit: number;
        } | null = null;

        // 遍历数据
        for (let i = 20; i < data.length; i++) {
            const currentData = data.slice(0, i + 1);
            const currentPrice = data[i].price;
            const currentTime = data[i].timestamp;

            // 检查是否需要平仓
            if (currentPosition) {
                const shouldClose = this.checkCloseCondition(
                    currentPosition,
                    currentPrice
                );

                if (shouldClose.shouldClose) {
                    // 计算盈亏
                    const pnl = this.calculatePnl(
                        currentPosition,
                        currentPrice,
                        currentPosition.size
                    );

                    balance += pnl;

                    // 更新最大回撤
                    if (balance > maxBalance) {
                        maxBalance = balance;
                    }
                    const drawdown = (maxBalance - balance) / maxBalance;
                    if (drawdown > maxDrawdown) {
                        maxDrawdown = drawdown;
                    }

                    trades.push({
                        entryTime: currentPosition.entryTime,
                        exitTime: currentTime,
                        entryPrice: currentPosition.entryPrice,
                        exitPrice: currentPrice,
                        side: currentPosition.side,
                        size: currentPosition.size,
                        pnl,
                        pnlPercent: (pnl / currentPosition.size) * 100,
                        exitReason: shouldClose.reason
                    });

                    currentPosition = null;
                }
            }

            // 检查是否可以开新仓
            if (!currentPosition) {
                const signal = strategy.analyze(currentData);

                if (signal && signal.action !== 'HOLD' && signal.confidence > 0.5) {
                    const positionSize = balance * (this.config.riskPerTrade / 100);
                    
                    currentPosition = {
                        entryTime: currentTime,
                        entryPrice: currentPrice,
                        side: signal.action === 'BUY' ? 'LONG' : 'SHORT',
                        size: positionSize,
                        stopLoss: signal.stopLoss || currentPrice * 0.95,
                        takeProfit: signal.takeProfit || currentPrice * 1.1
                    };
                }
            }
        }

        // 计算结果
        const result = this.calculateResults(trades, balance, maxDrawdown);
        
        this.printResults(result);
        
        return result;
    }

    // 获取策略类
    private getStrategyClass(type: string) {
        const strategies = require('./strategies');
        switch (type) {
            case 'meanReversion':
                return strategies.MeanReversionStrategy;
            case 'trendFollowing':
                return strategies.TrendFollowingStrategy;
            case 'breakout':
                return strategies.BreakoutStrategy;
            case 'volatility':
                return strategies.VolatilityStrategy;
            default:
                throw new Error(`未知策略: ${type}`);
        }
    }

    // 检查平仓条件
    private checkCloseCondition(
        position: any,
        currentPrice: number
    ): { shouldClose: boolean; reason?: string } {
        // 止损
        if (position.side === 'LONG' && currentPrice <= position.stopLoss) {
            return { shouldClose: true, reason: 'STOP_LOSS' };
        }
        if (position.side === 'SHORT' && currentPrice >= position.stopLoss) {
            return { shouldClose: true, reason: 'STOP_LOSS' };
        }

        // 止盈
        if (position.side === 'LONG' && currentPrice >= position.takeProfit) {
            return { shouldClose: true, reason: 'TAKE_PROFIT' };
        }
        if (position.side === 'SHORT' && currentPrice <= position.takeProfit) {
            return { shouldClose: true, reason: 'TAKE_PROFIT' };
        }

        return { shouldClose: false };
    }

    // 计算盈亏
    private calculatePnl(
        position: any,
        exitPrice: number,
        size: number
    ): number {
        const priceDiff = position.side === 'LONG'
            ? exitPrice - position.entryPrice
            : position.entryPrice - exitPrice;
        
        return priceDiff * (size / position.entryPrice);
    }

    // 计算回测结果
    private calculateResults(
        trades: BacktestTrade[],
        finalBalance: number,
        maxDrawdown: number
    ): BacktestResult {
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl <= 0);
        
        const totalReturn = ((finalBalance - this.config.initialBalance) / this.config.initialBalance) * 100;
        
        // 计算夏普比率（简化版）
        const returns = trades.map(t => t.pnlPercent);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        return {
            finalBalance,
            totalReturn,
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
            maxDrawdown: maxDrawdown * 100,
            sharpeRatio,
            trades
        };
    }

    // 打印结果
    private printResults(result: BacktestResult): void {
        logger.info('\n' + '='.repeat(60));
        logger.info('📊 回测结果');
        logger.info('='.repeat(60));
        logger.info(`初始资金: $${this.config.initialBalance}`);
        logger.info(`最终资金: $${result.finalBalance.toFixed(2)}`);
        logger.info(`总收益率: ${result.totalReturn.toFixed(2)}%`);
        logger.info(`总交易次数: ${result.totalTrades}`);
        logger.info(`盈利次数: ${result.winningTrades}`);
        logger.info(`亏损次数: ${result.losingTrades}`);
        logger.info(`胜率: ${result.winRate.toFixed(1)}%`);
        logger.info(`最大回撤: ${result.maxDrawdown.toFixed(2)}%`);
        logger.info(`夏普比率: ${result.sharpeRatio.toFixed(2)}`);
        logger.info('='.repeat(60));

        // 显示最近的交易
        if (result.trades.length > 0) {
            logger.info('\n最近 5 笔交易:');
            result.trades.slice(-5).forEach((trade, i) => {
                const emoji = trade.pnl > 0 ? '🟢' : '🔴';
                logger.info(`${emoji} ${trade.side} | 盈亏: $${trade.pnl.toFixed(2)} | 原因: ${trade.exitReason}`);
            });
        }
    }
}

// 生成模拟数据用于回测
export function generateMockData(
    startPrice: number,
    days: number,
    volatility: number = 0.02
): MarketData[] {
    const data: MarketData[] = [];
    let price = startPrice;
    
    const now = Date.now();
    
    for (let i = 0; i < days * 24; i++) { // 每小时一个数据点
        const change = (Math.random() - 0.5) * volatility;
        price = price * (1 + change);
        
        data.push({
            marketId: 'MOCK',
            price,
            timestamp: now - (days * 24 - i) * 3600 * 1000,
            volume24h: Math.random() * 1000000
        });
    }
    
    return data;
}

// 运行回测示例
async function runBacktest() {
    const config: BacktestConfig = {
        initialBalance: 10000,
        strategy: {
            type: 'meanReversion',
            params: { window: 20, threshold: 0.02 }
        },
        riskPerTrade: 10,
        stopLossPercent: 5,
        takeProfitPercent: 10
    };

    // 生成模拟数据
    const data = generateMockData(50000, 90); // 90 天数据，起始价格 50000

    const backtester = new Backtester(config);
    backtester.run(data);
}

// 如果直接运行此文件
if (require.main === module) {
    runBacktest();
}
