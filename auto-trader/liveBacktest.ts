// 实盘数据回测
import { BinanceDataFeed } from './dataFeed';
import { StrategyFactory, MarketData, Signal } from './strategies';
import { logger } from './utils/logger';

interface BacktestConfig {
    symbol: string;           // 交易对，如 BTCUSDT
    interval: string;         // K线周期，如 1h, 4h, 1d
    startTime: number;        // 开始时间戳
    endTime: number;          // 结束时间戳
    initialBalance: number;   // 初始资金
    strategy: {
        type: string;
        params: any;
    };
    riskPerTrade: number;     // 每笔交易风险百分比
    stopLossPercent: number;
    takeProfitPercent: number;
}

interface Trade {
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

interface BacktestResult {
    symbol: string;
    period: string;
    initialBalance: number;
    finalBalance: number;
    totalReturn: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
    trades: Trade[];
}

export class LiveBacktester {
    private dataFeed: BinanceDataFeed;

    constructor() {
        this.dataFeed = new BinanceDataFeed();
    }

    async run(config: BacktestConfig): Promise<BacktestResult> {
        logger.info('='.repeat(70));
        logger.info('📊 实盘数据回测开始');
        logger.info('='.repeat(70));
        logger.info(`交易对: ${config.symbol}`);
        logger.info(`周期: ${config.interval}`);
        logger.info(`策略: ${config.strategy.type}`);
        logger.info(`初始资金: $${config.initialBalance}`);

        // 1. 获取历史数据
        logger.info('\n📥 获取历史数据...');
        const klines = await this.dataFeed.getKlines(
            config.symbol,
            config.interval,
            500  // 获取500条数据
        );

        logger.info(`获取到 ${klines.length} 条K线数据`);

        // 2. 创建策略实例
        const strategy = StrategyFactory.create(
            config.strategy.type,
            config.strategy.params
        );

        // 3. 运行回测
        const result = this.simulate(klines, strategy, config);

        // 4. 打印结果
        this.printResults(result);

        return result;
    }

    private simulate(
        klines: any[],
        strategy: any,
        config: BacktestConfig
    ): BacktestResult {
        let balance = config.initialBalance;
        let maxBalance = balance;
        let maxDrawdown = 0;
        
        const trades: Trade[] = [];
        let currentPosition: {
            entryTime: number;
            entryPrice: number;
            side: 'LONG' | 'SHORT';
            size: number;
            stopLoss: number;
            takeProfit: number;
        } | null = null;

        // 转换为策略所需格式
        const marketData: MarketData[] = klines.map(k => ({
            marketId: config.symbol,
            price: k.close,
            timestamp: k.timestamp,
            volume24h: k.volume
        }));

        // 遍历数据
        for (let i = 50; i < marketData.length; i++) {
            const currentData = marketData.slice(0, i + 1);
            const currentPrice = marketData[i].price;
            const currentTime = marketData[i].timestamp;

            // 检查是否需要平仓
            if (currentPosition) {
                const shouldClose = this.checkCloseCondition(
                    currentPosition,
                    currentPrice,
                    config.stopLossPercent,
                    config.takeProfitPercent
                );

                if (shouldClose.shouldClose) {
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

                if (signal && signal.action !== 'HOLD' && signal.confidence > 0.6) {
                    const positionSize = balance * (config.riskPerTrade / 100);
                    
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
        return this.calculateResults(
            trades,
            balance,
            maxDrawdown,
            config
        );
    }

    private checkCloseCondition(
        position: any,
        currentPrice: number,
        stopLossPercent: number,
        takeProfitPercent: number
    ): { shouldClose: boolean; reason?: string } {
        const priceDiff = currentPrice - position.entryPrice;
        const percentChange = (priceDiff / position.entryPrice) * 100;

        // 止损
        if (position.side === 'LONG' && percentChange <= -stopLossPercent) {
            return { shouldClose: true, reason: 'STOP_LOSS' };
        }
        if (position.side === 'SHORT' && percentChange >= stopLossPercent) {
            return { shouldClose: true, reason: 'STOP_LOSS' };
        }

        // 止盈
        if (position.side === 'LONG' && percentChange >= takeProfitPercent) {
            return { shouldClose: true, reason: 'TAKE_PROFIT' };
        }
        if (position.side === 'SHORT' && percentChange <= -takeProfitPercent) {
            return { shouldClose: true, reason: 'TAKE_PROFIT' };
        }

        return { shouldClose: false };
    }

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

    private calculateResults(
        trades: Trade[],
        finalBalance: number,
        maxDrawdown: number,
        config: BacktestConfig
    ): BacktestResult {
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl <= 0);
        
        const totalReturn = ((finalBalance - config.initialBalance) / config.initialBalance) * 100;
        
        const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

        const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

        const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
        const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;

        // 计算夏普比率
        const returns = trades.map(t => t.pnlPercent);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        return {
            symbol: config.symbol,
            period: config.interval,
            initialBalance: config.initialBalance,
            finalBalance,
            totalReturn,
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
            maxDrawdown: maxDrawdown * 100,
            sharpeRatio,
            profitFactor,
            avgWin,
            avgLoss,
            largestWin,
            largestLoss,
            trades
        };
    }

    private printResults(result: BacktestResult): void {
        logger.info('\n' + '='.repeat(70));
        logger.info('📊 实盘回测结果');
        logger.info('='.repeat(70));
        logger.info(`交易对: ${result.symbol}`);
        logger.info(`周期: ${result.period}`);
        logger.info(`初始资金: $${result.initialBalance.toLocaleString()}`);
        logger.info(`最终资金: $${result.finalBalance.toFixed(2)}`);
        logger.info(`总收益率: ${result.totalReturn.toFixed(2)}%`);
        logger.info(`总交易次数: ${result.totalTrades}`);
        logger.info(`盈利次数: ${result.winningTrades}`);
        logger.info(`亏损次数: ${result.losingTrades}`);
        logger.info(`胜率: ${result.winRate.toFixed(1)}%`);
        logger.info(`最大回撤: ${result.maxDrawdown.toFixed(2)}%`);
        logger.info(`夏普比率: ${result.sharpeRatio.toFixed(2)}`);
        logger.info(`盈亏比: ${result.profitFactor.toFixed(2)}`);
        logger.info(`平均盈利: $${result.avgWin.toFixed(2)}`);
        logger.info(`平均亏损: $${result.avgLoss.toFixed(2)}`);
        logger.info(`最大盈利: $${result.largestWin.toFixed(2)}`);
        logger.info(`最大亏损: $${result.largestLoss.toFixed(2)}`);
        logger.info('='.repeat(70));

        // 显示最近的交易
        if (result.trades.length > 0) {
            logger.info('\n最近 5 笔交易:');
            result.trades.slice(-5).forEach((trade, i) => {
                const emoji = trade.pnl > 0 ? '🟢' : '🔴';
                const date = new Date(trade.exitTime).toLocaleDateString();
                logger.info(`${emoji} ${date} | ${trade.side} | 盈亏: $${trade.pnl.toFixed(2)} | ${trade.exitReason}`);
            });
        }
    }
}

// 运行实盘回测
async function main() {
    const backtester = new LiveBacktester();

    // 测试不同策略
    const configs: BacktestConfig[] = [
        {
            symbol: 'BTCUSDT',
            interval: '1h',
            startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
            endTime: Date.now(),
            initialBalance: 10000,
            strategy: {
                type: 'meanReversion',
                params: { window: 20, threshold: 0.02 }
            },
            riskPerTrade: 10,
            stopLossPercent: 3,
            takeProfitPercent: 6
        },
        {
            symbol: 'ETHUSDT',
            interval: '1h',
            startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
            endTime: Date.now(),
            initialBalance: 10000,
            strategy: {
                type: 'trendFollowing',
                params: { shortWindow: 5, longWindow: 20 }
            },
            riskPerTrade: 10,
            stopLossPercent: 3,
            takeProfitPercent: 6
        },
        {
            symbol: 'SOLUSDT',
            interval: '1h',
            startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
            endTime: Date.now(),
            initialBalance: 10000,
            strategy: {
                type: 'breakout',
                params: { lookback: 15, threshold: 0.015 }
            },
            riskPerTrade: 10,
            stopLossPercent: 3,
            takeProfitPercent: 6
        }
    ];

    for (const config of configs) {
        await backtester.run(config);
        await new Promise(r => setTimeout(r, 2000)); // 避免请求过快
    }
}

if (require.main === module) {
    main().catch(console.error);
}
