// 打狗交易系统 - 整合监控和交易
import { SolanaNewTokenMonitor, NewToken, TokenSafety } from './monitors/tokenMonitor';
import { DogeTrader, TradeDecision } from './analysis/decisionEngine';

interface Trade {
    id: string;
    token: NewToken;
    decision: TradeDecision;
    entryTime: number;
    status: 'PENDING' | 'EXECUTED' | 'CLOSED';
    pnl?: number;
}

interface TradingConfig {
    minSafetyScore: number;
    maxRiskCount: number;
    maxDailyTrades: number;
    maxPositionSize: number;
    autoTrade: boolean;
}

export class DogeTradingSystem {
    private monitor: SolanaNewTokenMonitor;
    private trader: DogeTrader;
    private config: TradingConfig;
    private trades: Trade[] = [];
    private activeTrades: Map<string, Trade> = new Map();
    private dailyTradeCount: number = 0;
    private lastTradeDate: string = '';

    constructor(config: TradingConfig) {
        this.config = config;
        this.monitor = new SolanaNewTokenMonitor();
        this.trader = new DogeTrader();
        
        this.setupCallbacks();
    }

    // 设置回调
    private setupCallbacks(): void {
        this.monitor.onNewToken((token, safety) => {
            this.handleNewToken(token, safety);
        });
    }

    // 处理新代币
    private async handleNewToken(token: NewToken, safety: TokenSafety): Promise<void> {
        console.log('\n' + '='.repeat(70));
        console.log(`🔔 收到新币: ${token.name} ($${token.symbol})`);
        
        // 检查每日限制
        this.resetDailyCounterIfNeeded();
        if (this.dailyTradeCount >= this.config.maxDailyTrades) {
            console.log('⚠️ 已达到每日交易上限');
            return;
        }

        // 检查是否已在交易列表中
        if (this.activeTrades.has(token.mint)) {
            console.log('ℹ️ 已在交易列表中');
            return;
        }

        // 分析并做出决策
        const decision = this.trader.analyze(token, safety);
        this.trader.displayDecision(token, decision);

        if (decision.shouldTrade && decision.action === 'BUY') {
            await this.executeTrade(token, decision);
        }
    }

    // 执行交易
    private async executeTrade(token: NewToken, decision: TradeDecision): Promise<void> {
        console.log('\n🚀 执行交易!');

        const trade: Trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            token,
            decision,
            entryTime: Date.now(),
            status: 'PENDING'
        };

        this.activeTrades.set(token.mint, trade);
        this.dailyTradeCount++;

        if (this.config.autoTrade) {
            // 实际执行交易（需要接入 Jupiter 或 Raydium）
            console.log('📝 发送交易到链上...');
            console.log(`买入 $${decision.positionSize} 的 ${token.symbol}`);
            
            // 模拟交易成功
            trade.status = 'EXECUTED';
            console.log('✅ 交易已执行');
            
            // 设置自动卖出定时器
            this.scheduleExit(trade);
        } else {
            console.log('⏸️ 手动模式 - 请手动执行交易');
            console.log(`建议: 买入 $${decision.positionSize} 的 ${token.symbol}`);
            console.log(`目标: ${((decision.targetPrice/decision.entryPrice-1)*100).toFixed(0)}% 利润`);
            console.log(`止损: ${((decision.stopLoss/decision.entryPrice-1)*100).toFixed(0)}% 亏损`);
        }

        this.trades.push(trade);
    }

    // 设置自动退出
    private scheduleExit(trade: Trade): void {
        const checkInterval = setInterval(async () => {
            const tradeData = this.activeTrades.get(trade.token.mint);
            if (!tradeData || tradeData.status !== 'EXECUTED') {
                clearInterval(checkInterval);
                return;
            }

            // 检查是否达到时间限制
            const holdTime = (Date.now() - trade.entryTime) / 1000 / 60; // 分钟
            
            if (holdTime >= trade.decision.timeLimit) {
                console.log(`\n⏰ 持仓时间到达 ${trade.decision.timeLimit} 分钟，卖出 ${trade.token.symbol}`);
                await this.closeTrade(trade, 'TIME_LIMIT');
                clearInterval(checkInterval);
            }
        }, 60000); // 每分钟检查一次
    }

    // 平仓
    private async closeTrade(trade: Trade, reason: string): Promise<void> {
        // 模拟卖出
        const exitPrice = trade.token.currentPrice * (0.9 + Math.random() * 0.3); // 模拟价格波动
        const pnl = (exitPrice - trade.decision.entryPrice) / trade.decision.entryPrice * trade.decision.positionSize;
        
        trade.status = 'CLOSED';
        trade.pnl = pnl;
        
        this.activeTrades.delete(trade.token.mint);
        
        const emoji = pnl > 0 ? '🟢' : '🔴';
        console.log(`${emoji} 平仓: ${trade.token.symbol}`);
        console.log(`原因: ${reason}`);
        console.log(`盈亏: $${pnl.toFixed(2)}`);
    }

    // 重置每日计数器
    private resetDailyCounterIfNeeded(): void {
        const today = new Date().toISOString().split('T')[0];
        if (today !== this.lastTradeDate) {
            this.dailyTradeCount = 0;
            this.lastTradeDate = today;
        }
    }

    // 启动系统
    async start(): Promise<void> {
        console.log('='.repeat(70));
        console.log('🤖 Solana 打狗交易系统启动');
        console.log('='.repeat(70));
        console.log('配置:');
        console.log(`  最低安全评分: ${this.config.minSafetyScore}`);
        console.log(`  每日最大交易: ${this.config.maxDailyTrades}`);
        console.log(`  最大仓位: $${this.config.maxPositionSize}`);
        console.log(`  自动交易: ${this.config.autoTrade ? '开启' : '关闭'}`);
        console.log('='.repeat(70) + '\n');

        await this.monitor.start();
    }

    // 获取系统状态
    getStatus() {
        const totalPnl = this.trades
            .filter(t => t.status === 'CLOSED')
            .reduce((sum, t) => sum + (t.pnl || 0), 0);

        const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0);
        const winRate = this.trades.length > 0 
            ? (winningTrades.length / this.trades.length * 100).toFixed(1)
            : '0';

        return {
            activeTrades: this.activeTrades.size,
            totalTrades: this.trades.length,
            dailyTrades: this.dailyTradeCount,
            totalPnl: totalPnl.toFixed(2),
            winRate: `${winRate}%`,
            monitoredTokens: this.monitor.getTokens().length
        };
    }
}

// 主函数
async function main() {
    const config = {
        minSafetyScore: 75,
        maxRiskCount: 2,
        maxDailyTrades: 10,
        maxPositionSize: 500,
        autoTrade: false // 手动模式，确认后再交易
    };

    const system = new DogeTradingSystem(config);

    // 显示状态
    setInterval(() => {
        const status = system.getStatus();
        console.log('\n📊 系统状态:', status);
    }, 30000);

    await system.start();
}

if (require.main === module) {
    main().catch(console.error);
}

export { TradingConfig, Trade };
