// 代币分析和交易决策系统
import { PumpToken, TokenScore } from '../monitors/pumpMonitor';
import { SmartWallet, TradeActivity } from '../monitors/smartWalletMonitor';

interface TradingDecision {
    shouldTrade: boolean;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;  // 0-100
    size: number;        // 建议仓位大小
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    reasons: string[];
    risks: string[];
}

interface MarketContext {
    token: PumpToken;
    tokenScore: TokenScore;
    smartWalletActivity?: {
        buyCount: number;
        sellCount: number;
        totalVolume: number;
        topWallets: string[];
    };
    marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    timeSinceLaunch: number; // 分钟
}

export class TokenAnalyzer {
    private minConfidence: number = 75;  // 最低置信度
    private maxRiskScore: number = 30;   // 最大风险分数

    constructor(config?: { minConfidence?: number; maxRiskScore?: number }) {
        if (config?.minConfidence) this.minConfidence = config.minConfidence;
        if (config?.maxRiskScore) this.maxRiskScore = config.maxRiskScore;
    }

    // 分析代币并做出交易决策
    analyze(context: MarketContext): TradingDecision {
        const { token, tokenScore, smartWalletActivity, marketSentiment, timeSinceLaunch } = context;
        
        const reasons: string[] = [];
        const risks: string[] = [...tokenScore.risks];
        let confidence = tokenScore.overall;
        let shouldTrade = false;
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let size = 0;

        // ============ 基础评分检查 ============
        if (tokenScore.overall < this.minConfidence) {
            risks.push(`综合评分 ${tokenScore.overall} 低于最低要求 ${this.minConfidence}`);
            return this.createDecision(false, 'HOLD', confidence, 0, reasons, risks);
        }

        if (tokenScore.safety < 50) {
            risks.push('安全性评分过低');
            return this.createDecision(false, 'HOLD', confidence, 0, reasons, risks);
        }

        // ============ 聪明钱活动分析 ============
        if (smartWalletActivity) {
            const { buyCount, sellCount, totalVolume, topWallets } = smartWalletActivity;
            
            // 聪明钱买入信号
            if (buyCount > sellCount * 2 && totalVolume > 0) {
                confidence += 15;
                reasons.push(`聪明钱强烈买入: ${buyCount}买/${sellCount}卖`);
                shouldTrade = true;
                action = 'BUY';
            }
            // 聪明钱卖出信号
            else if (sellCount > buyCount * 2 && totalVolume < 0) {
                confidence -= 10;
                reasons.push(`聪明钱大量卖出: ${buyCount}买/${sellCount}卖`);
                if (confidence < 60) {
                    action = 'SELL';
                }
            }
            // 顶级钱包参与
            if (topWallets.length >= 2) {
                confidence += 10;
                reasons.push(`${topWallets.length} 个顶级钱包参与`);
            }
        }

        // ============ 市场情绪分析 ============
        switch (marketSentiment) {
            case 'BULLISH':
                confidence += 10;
                reasons.push('市场整体看涨');
                break;
            case 'BEARISH':
                confidence -= 15;
                risks.push('市场整体看跌');
                break;
            case 'NEUTRAL':
                // 中性市场不影响
                break;
        }

        // ============ 时间窗口分析 ============
        if (timeSinceLaunch < 30) {
            // 新币（30分钟内）
            if (token.holders > 50 && token.volume24h > 5000) {
                confidence += 10;
                reasons.push('新币但已有良好流动性');
                shouldTrade = true;
                action = 'BUY';
            } else {
                risks.push('新币流动性不足，建议观望');
                confidence -= 10;
            }
        } else if (timeSinceLaunch < 120) {
            // 早期（2小时内）
            if (token.currentPrice > token.initialPrice * 1.5) {
                confidence += 5;
                reasons.push('价格已上涨 50%+，趋势良好');
            }
        } else {
            // 老币（2小时以上）
            if (token.currentPrice < token.initialPrice) {
                risks.push('价格已跌破发行价');
                confidence -= 20;
            }
        }

        // ============ 技术指标分析 ============
        // 持有者增长
        if (token.holders > 200) {
            confidence += 10;
            reasons.push('持有者超过 200 人，社区活跃');
        }

        // 流动性检查
        if (token.liquidity > 10000) {
            confidence += 5;
            reasons.push('流动性充足');
        } else if (token.liquidity < 3000) {
            risks.push('流动性不足，滑点可能较大');
            confidence -= 10;
        }

        // 市值评估
        if (token.marketCap < 100000) {
            reasons.push('小市值，高增长潜力');
        } else if (token.marketCap > 1000000) {
            reasons.push('大市值，相对稳定');
            confidence -= 5; // 增长空间有限
        }

        // ============ 最终决策 ============
        confidence = Math.max(0, Math.min(100, confidence));

        if (confidence >= this.minConfidence && risks.length <= 2) {
            shouldTrade = true;
            action = action === 'HOLD' ? 'BUY' : action;
            
            // 计算仓位大小
            size = this.calculatePositionSize(confidence, tokenScore.safety, token.marketCap);
        }

        // 计算价格目标
        const entryPrice = token.currentPrice;
        const stopLoss = entryPrice * 0.92;  // 8% 止损
        const takeProfit = entryPrice * 1.25; // 25% 止盈

        return this.createDecision(
            shouldTrade,
            action,
            confidence,
            size,
            reasons,
            risks,
            entryPrice,
            stopLoss,
            takeProfit
        );
    }

    // 计算仓位大小
    private calculatePositionSize(
        confidence: number,
        safety: number,
        marketCap: number
    ): number {
        // 基础仓位
        let baseSize = 100; // $100

        // 根据置信度调整
        if (confidence > 85) baseSize *= 1.5;
        if (confidence > 90) baseSize *= 1.5;

        // 根据安全性调整
        if (safety > 80) baseSize *= 1.2;
        if (safety < 60) baseSize *= 0.5;

        // 根据市值调整
        if (marketCap < 50000) baseSize *= 0.7; // 小市值风险高
        if (marketCap > 500000) baseSize *= 0.8; // 大市值增长慢

        return Math.round(baseSize);
    }

    // 创建决策对象
    private createDecision(
        shouldTrade: boolean,
        action: 'BUY' | 'SELL' | 'HOLD',
        confidence: number,
        size: number,
        reasons: string[],
        risks: string[],
        entryPrice?: number,
        stopLoss?: number,
        takeProfit?: number
    ): TradingDecision {
        return {
            shouldTrade,
            action,
            confidence,
            size,
            entryPrice,
            stopLoss,
            takeProfit,
            reasons,
            risks
        };
    }

    // 批量分析多个代币
    analyzeBatch(contexts: MarketContext[]): { context: MarketContext; decision: TradingDecision }[] {
        return contexts.map(context => ({
            context,
            decision: this.analyze(context)
        }));
    }

    // 获取最佳交易机会
    getBestOpportunities(
        analyses: { context: MarketContext; decision: TradingDecision }[],
        topN: number = 3
    ): { context: MarketContext; decision: TradingDecision }[] {
        return analyses
            .filter(a => a.decision.shouldTrade && a.decision.action === 'BUY')
            .sort((a, b) => b.decision.confidence - a.decision.confidence)
            .slice(0, topN);
    }
}

// 使用示例
function example() {
    const analyzer = new TokenAnalyzer({
        minConfidence: 75,
        maxRiskScore: 30
    });

    // 模拟分析
    const context: MarketContext = {
        token: {
            mint: 'ExampleToken123',
            name: 'PEPE SOL',
            symbol: 'PEPE',
            creator: 'Creator123',
            createdAt: Date.now() - 15 * 60 * 1000, // 15分钟前
            initialPrice: 0.0001,
            currentPrice: 0.00015,
            marketCap: 75000,
            holders: 180,
            volume24h: 25000,
            liquidity: 12000,
            socialLinks: { twitter: 'https://twitter.com/pepesol' }
        },
        tokenScore: {
            overall: 82,
            safety: 85,
            popularity: 78,
            potential: 80,
            risks: []
        },
        smartWalletActivity: {
            buyCount: 8,
            sellCount: 2,
            totalVolume: 5000,
            topWallets: ['SmartTrader_1', 'AlphaHunter']
        },
        marketSentiment: 'BULLISH',
        timeSinceLaunch: 15
    };

    const decision = analyzer.analyze(context);

    console.log('\n========== 交易决策 ==========');
    console.log(`交易建议: ${decision.shouldTrade ? '✅ 买入' : '❌ 观望'}`);
    console.log(`置信度: ${decision.confidence}/100`);
    console.log(`建议仓位: $${decision.size}`);
    if (decision.entryPrice) {
        console.log(`入场价格: $${decision.entryPrice.toFixed(6)}`);
        console.log(`止损价格: $${decision.stopLoss?.toFixed(6)}`);
        console.log(`止盈价格: $${decision.takeProfit?.toFixed(6)}`);
    }
    console.log('\n理由:');
    decision.reasons.forEach(r => console.log(`  ✓ ${r}`));
    if (decision.risks.length > 0) {
        console.log('\n风险:');
        decision.risks.forEach(r => console.log(`  ⚠ ${r}`));
    }
    console.log('==============================\n');
}

if (require.main === module) {
    example();
}

export { TradingDecision, MarketContext };
