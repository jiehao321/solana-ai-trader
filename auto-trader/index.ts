// 自动化交易系统入口
import { TradingEngine } from './engine';
import { logger } from './utils/logger';

// 配置
const CONFIG = {
    // 风险管理配置
    risk: {
        maxPositionSize: 500,        // 单笔最大 $500
        maxTotalExposure: 2000,      // 总敞口 $2000
        maxDrawdown: 20,             // 最大回撤 20%
        stopLossPercent: 5,          // 止损 5%
        takeProfitPercent: 10,       // 止盈 10%
        maxDailyTrades: 10,          // 每日最多 10 笔
        maxConcurrentPositions: 3    // 最多 3 个持仓
    },
    
    // 策略配置
    strategies: [
        {
            type: 'meanReversion',
            params: { window: 20, threshold: 0.02 },
            weight: 0.3
        },
        {
            type: 'trendFollowing',
            params: { shortWindow: 5, longWindow: 20 },
            weight: 0.4
        },
        {
            type: 'breakout',
            params: { lookback: 15, threshold: 0.015 },
            weight: 0.3
        }
    ],
    
    // 初始资金
    initialBalance: 10000
};

async function main() {
    logger.info('='.repeat(60));
    logger.info('🤖 自动化交易系统启动');
    logger.info('='.repeat(60));

    // 显示配置
    logger.info('风险管理配置:');
    logger.info(`  单笔最大: $${CONFIG.risk.maxPositionSize}`);
    logger.info(`  总敞口: $${CONFIG.risk.maxTotalExposure}`);
    logger.info(`  止损: ${CONFIG.risk.stopLossPercent}%`);
    logger.info(`  止盈: ${CONFIG.risk.takeProfitPercent}%`);
    
    logger.info('策略配置:');
    for (const strat of CONFIG.strategies) {
        logger.info(`  - ${strat.type} (权重: ${strat.weight})`);
    }

    // 创建交易引擎
    const engine = new TradingEngine(CONFIG);

    // 处理退出信号
    process.on('SIGINT', () => {
        logger.info('\n收到退出信号，正在关闭...');
        engine.stop();
        
        // 显示最终报告
        const status = engine.getStatus();
        logger.info('\n' + '='.repeat(60));
        logger.info('📊 交易报告');
        logger.info('='.repeat(60));
        logger.info(`初始资金: $${status.initialBalance}`);
        logger.info(`最终资金: $${status.currentBalance.toFixed(2)}`);
        logger.info(`总盈亏: $${status.totalPnl.toFixed(2)} (${(status.totalPnl/status.initialBalance*100).toFixed(2)}%)`);
        logger.info(`交易次数: ${status.dailyTrades}`);
        logger.info(`当前持仓: ${status.openPositions}`);
        
        const trades = engine.getTradeHistory();
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
        const winRate = closedTrades.length > 0 
            ? (winningTrades.length / closedTrades.length * 100).toFixed(1)
            : '0';
        
        logger.info(`胜率: ${winRate}%`);
        logger.info('='.repeat(60));
        
        process.exit(0);
    });

    // 启动引擎
    await engine.start();
}

main().catch(error => {
    logger.error('系统错误:', error);
    process.exit(1);
});
