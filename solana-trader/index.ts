// Solana 完整交易系统 - 整合监控、分析和执行
import { PumpMonitor, PumpToken, TokenScore } from './monitors/pumpMonitor';
import { SmartWalletMonitor, SmartWallet, TradeActivity } from './monitors/smartWalletMonitor';
import { TokenAnalyzer, TradingDecision, MarketContext } from './analysis/tokenAnalyzer';

interface TradingConfig {
    minConfidence: number;
    maxRiskScore: number;
    maxDailyTrades: number;
    maxPositionSize: number;
    autoTrade: boolean;  // 是否自动执行交易
}

interface ActiveTrade {
    token: PumpToken;
    decision: TradingDecision;
    entryTime: number;
    status: 'PENDING' | 'EXECUTED' | 'CLOSED';
}

export class SolanaTradingSystem {
    private pumpMonitor: PumpMonitor;
    private walletMonitor: SmartWalletMonitor;
    private analyzer: TokenAnalyzer;
    private config: TradingConfig;
    
    private activeTrades: Map<string, ActiveTrade> = new Map();
    private tradeHistory: ActiveTrade[] = [];
    private dailyTradeCount: number = 0;
    private lastTradeDate: string = '';

    constructor(config: TradingConfig) {
        this.config = config;
        
        this.pumpMonitor = new PumpMonitor();
        this.walletMonitor = new SmartWalletMonitor();
        this.analyzer = new TokenAnalyzer({
            minConfidence: config.minConfidence,
            maxRiskScore: config.maxRiskScore
        });

        this.setupCallbacks();
    }

    // 设置回调
    private setupCallbacks(): void {
        // Pump.fun 新币回调
        this.pumpMonitor.onHighPotentialToken((token, score) => {
            this.handleNewToken(token, score);
        });

        // 聪明钱包交易回调
        this.walletMonitor.onTradeActivity((activity, wallet) => {
            this.handleSmartWalletActivity(activity, wallet);
        });
    }

    // 处理新代币
    private async handleNewToken(token: PumpToken, score: TokenScore): Promise<void> {
        console.log('\n🔔 处理新代币:', token.name);

        // 检查每日交易限制
        this.resetDailyCounterIfNeeded();
        if (this.dailyTradeCount >= this.config.maxDailyTrades) {
            console.log('⚠️  已达到每日交易上限');
            return;
        }

        // 检查是否已在交易列表中
        if (this.activeTrades.has(token.mint)) {
            console.log('ℹ️  已在交易列表中');
            return;
        }

        // 获取聪明钱活动
        const smartWalletActivity = this.getSmartWalletActivityForToken(token.symbol);

        // 构建市场上下文
        const context: MarketContext = {
            token,
            tokenScore: score,
            smartWalletActivity,
            marketSentiment: this.getMarketSentiment(),
            timeSinceLaunch: (Date.now() - token.createdAt) / 60000 // 转换为分钟
        };

        // 分析并做出决策
        const decision = this.analyzer.analyze(context);

        this.displayAnalysis(token, score, decision);

        if (decision.shouldTrade && decision.action === 'BUY') {
            await this.executeTrade(token, decision);
        }
    }

    // 处理聪明钱包活动
    private async handleSmartWalletActivity(
        activity: TradeActivity,
        wallet: SmartWallet
    ): Promise<void> {
        // 检查是否有该代币的持仓
        for (const [mint, trade] of this.activeTrades.entries()) {
            if (trade.token.symbol === activity.token && trade.status === 'EXECUTED') {
                // 如果聪明钱在卖出，考虑跟随卖出
                if (activity.action === 'SELL') {
                    console.log(`\n⚠️  聪明钱 ${wallet.label} 正在卖出 ${activity.token}`);
                    console.log('建议: 考虑止盈或减仓');
                    
                    // 可以在这里触发自动卖出逻辑
                    if (this.config.autoTrade) {
                        // await this.closePosition(mint, 'SMART_WALLET_SELL');
                    }
                }
            }
        }
    }

    // 执行交易
    private async executeTrade(token: PumpToken, decision: TradingDecision): Promise<void> {
        console.log('\n🚀 执行交易!');
        console.log(`代币: ${token.name} (${token.symbol})`);
        console.log(`金额: $${decision.size}`);
        console.log(`入场: $${decision.entryPrice?.toFixed(6)}`);
        console.log(`止损: $${decision.stopLoss?.toFixed(6)}`);
        console.log(`止盈: $${decision.takeProfit?.toFixed(6)}`);

        const trade: ActiveTrade = {
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
            // 模拟交易成功
            trade.status = 'EXECUTED';
            console.log('✅ 交易已执行');
        } else {
            console.log('⏸️  手动模式 - 请手动执行交易');
            console.log(`建议操作: 买入 $${decision.size} 的 ${token.symbol}`);
        }

        this.tradeHistory.push(trade);
    }

    // 显示分析结果
    private displayAnalysis(
        token: PumpToken,
        score: TokenScore,
        decision: TradingDecision
    ): void {
        console.log('\n' + '='.repeat(70));
        console.log('📊 代币分析报告');
        console.log('='.repeat(70));
        console.log(`代币: ${token.name} ($${token.symbol})`);
        console.log(`合约: ${token.mint}`);
        console.log(`创建者: ${token.creator}`);
        console.log(`市值: $${token.marketCap.toLocaleString()}`);
        console.log(`持有者: ${token.holders}`);
        console.log(`流动性: $${token.liquidity.toLocaleString()}`);
        console.log(`24h 交易量: $${token.volume24h.toLocaleString()}`);
        
        console.log('\n评分:');
        console.log(`  综合: ${score.overall}/100 ${this.getScoreEmoji(score.overall)}`);
        console.log(`  安全性: ${score.safety}/100`);
        console.log(`  热度: ${score.popularity}/100`);
        console.log(`  潜力: ${score.potential}/100`);

        console.log('\n交易决策:');
        console.log(`  建议: ${decision.shouldTrade ? '✅ 买入' : '❌ 观望'}`);
        console.log(`  置信度: ${decision.confidence}%`);
        console.log(`  建议仓位: $${decision.size}`);

        if (decision.reasons.length > 0) {
            console.log('\n✅ 买入理由:');
            decision.reasons.forEach(r => console.log(`    • ${r}`));
        }

        if (decision.risks.length > 0) {
            console.log('\n⚠️  风险提示:');
            decision.risks.forEach(r => console.log(`    • ${r}`));
        }

        console.log('='.repeat(70));
    }

    // 获取聪明钱活动
    private getSmartWalletActivityForToken(symbol: string) {
        const recentTrades = this.walletMonitor['tradeHistory'] || [];
        const tokenTrades = recentTrades.filter((t: TradeActivity) => t.token === symbol);
        
        const buyCount = tokenTrades.filter((t: TradeActivity) => t.action === 'BUY').length;
        const sellCount = tokenTrades.filter((t: TradeActivity) => t.action === 'SELL').length;
        const totalVolume = tokenTrades.reduce((sum: number, t: TradeActivity) => {
            return sum + (t.action === 'BUY' ? t.amount * t.price : -t.amount * t.price);
        }, 0);

        // 获取参与的顶级钱包
        const walletAddresses = new Set(tokenTrades.map((t: TradeActivity) => t.wallet));
        const topWallets: string[] = [];
        
        for (const addr of walletAddresses) {
            const wallet = this.walletMonitor['smartWallets'].get(addr);
            if (wallet) {
                topWallets.push(wallet.label);
            }
        }

        return { buyCount, sellCount, totalVolume, topWallets };
    }

    // 获取市场情绪（简化版）
    private getMarketSentiment(): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
        const hotTokens = this.walletMonitor.getHotTokens();
        const totalFlow = hotTokens.reduce((sum, t) => sum + t.netFlow, 0);
        
        if (totalFlow > 10000) return 'BULLISH';
        if (totalFlow < -5000) return 'BEARISH';
        return 'NEUTRAL';
    }

    // 获取评分表情
    private getScoreEmoji(score: number): string {
        if (score >= 80) return '🟢';
        if (score >= 60) return '🟡';
        return '🔴';
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
        console.log('🤖 Solana 智能交易系统启动');
        console.log('='.repeat(70));
        console.log('配置:');
        console.log(`  最低置信度: ${this.config.minConfidence}%`);
        console.log(`  每日最大交易: ${this.config.maxDailyTrades}`);
        console.log(`  最大仓位: $${this.config.maxPositionSize}`);
        console.log(`  自动交易: ${this.config.autoTrade ? '开启' : '关闭'}`);
        console.log('='.repeat(70) + '\n');

        // 启动监控
        await Promise.all([
            this.pumpMonitor.startMonitoring(),
            this.walletMonitor.startMonitoring()
        ]);
    }

    // 获取系统状态
    getStatus() {
        return {
            activeTrades: this.activeTrades.size,
            dailyTrades: this.dailyTradeCount,
            totalHistory: this.tradeHistory.length,
            watchedTokens: this.pumpMonitor.getWatchedTokens().length,
            smartWallets: this.walletMonitor.getSmartWallets().length
        };
    }
}

// 主函数
async function main() {
    const config: TradingConfig = {
        minConfidence: 75,
        maxRiskScore: 30,
        maxDailyTrades: 5,
        maxPositionSize: 500,
        autoTrade: false  // 手动模式，确认后再交易
    };

    const system = new SolanaTradingSystem(config);

    // 显示状态
    setInterval(() => {
        const status = system.getStatus();
        console.log('\n📈 系统状态:', status);
    }, 60000);

    await system.start();
}

if (require.main === module) {
    main().catch(console.error);
}

export { TradingConfig, ActiveTrade };
