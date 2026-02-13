// 打狗交易决策系统
import { NewToken, TokenSafety } from '../monitors/tokenMonitor';

interface TradeDecision {
    shouldTrade: boolean;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    positionSize: number;
    timeLimit: number; // 持仓时间限制（分钟）
    reasons: string[];
    risks: string[];
}

interface MarketCondition {
    solanaPrice: number;
    solanaChange24h: number;
    marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    memeCoinIndex: number; // Meme币热度指数
}

export class DogeTrader {
    private minSafetyScore: number = 75;
    private maxRiskCount: number = 2;
    private marketCondition: MarketCondition;

    constructor() {
        // 初始化市场条件
        this.marketCondition = {
            solanaPrice: 100,
            solanaChange24h: 5,
            marketSentiment: 'BULLISH',
            memeCoinIndex: 70
        };
    }

    // 分析并做出交易决策
    analyze(token: NewToken, safety: TokenSafety): TradeDecision {
        const reasons: string[] = [];
        const risks: string[] = [...safety.risks];
        let confidence = safety.score;

        console.log(`\n🧠 分析代币: ${token.name} ($${token.symbol})`);

        // ========== 基础安全检查 ==========
        if (safety.score < this.minSafetyScore) {
            risks.push(`安全评分 ${safety.score} 低于最低要求 ${this.minSafetyScore}`);
            return this.createDecision(false, 'HOLD', 0, token, reasons, risks);
        }

        if (safety.risks.length > this.maxRiskCount) {
            risks.push(`风险项过多: ${safety.risks.length}`);
            return this.createDecision(false, 'HOLD', 0, token, reasons, risks);
        }

        // ========== 代币经济学分析 ==========
        
        // 市值评估
        if (token.marketCap < 5000) {
            confidence += 15;
            reasons.push('小市值，高增长潜力');
        } else if (token.marketCap > 1000000) {
            confidence -= 10;
            risks.push('市值过大，增长空间有限');
        }

        // 流动性评估
        if (token.liquidity > 20000) {
            confidence += 10;
            reasons.push('流动性充足，易于进出');
        }

        // 持有者分析
        if (token.holders > 50 && token.holders < 200) {
            confidence += 10;
            reasons.push('持有者数量健康，社区活跃');
        }

        // 交易量分析
        const volumeToMcapRatio = token.volume24h / token.marketCap;
        if (volumeToMcapRatio > 0.1) {
            confidence += 10;
            reasons.push('交易活跃，关注度高');
        }

        // ========== 合约安全分析 ==========
        
        if (!safety.isMintable) {
            confidence += 10;
            reasons.push('不可增发，供应固定');
        }

        if (!safety.hasBlacklist) {
            confidence += 5;
            reasons.push('无黑名单，交易自由');
        }

        if (safety.lpLocked && safety.lpLockDuration && safety.lpLockDuration > 30) {
            confidence += 10;
            reasons.push('LP已锁定，防拉地毯');
        }

        if (safety.topHolderPercent < 15) {
            confidence += 5;
            reasons.push('筹码分布分散');
        }

        // ========== 市场情绪分析 ==========
        
        if (this.marketCondition.marketSentiment === 'BULLISH') {
            confidence += 10;
            reasons.push('市场整体看涨');
        }

        if (this.marketCondition.memeCoinIndex > 60) {
            confidence += 5;
            reasons.push('Meme币热度高');
        }

        // ========== 时间窗口分析 ==========
        
        const age = (Date.now() - token.createdAt) / 1000 / 60; // 分钟
        
        if (age < 5) {
            confidence += 15;
            reasons.push('极早期，抢跑优势');
        } else if (age < 30) {
            confidence += 10;
            reasons.push('早期入场机会');
        } else if (age > 120) {
            confidence -= 20;
            risks.push('代币已发布超过2小时，可能错过最佳时机');
        }

        // ========== 最终决策 ==========
        
        confidence = Math.max(0, Math.min(100, confidence));

        let shouldTrade = false;
        let positionSize = 0;
        let timeLimit = 60; // 默认持仓1小时

        if (confidence >= 80 && risks.length <= 1) {
            shouldTrade = true;
            positionSize = this.calculatePositionSize(confidence, token);
            timeLimit = age < 10 ? 30 : 60; // 新币持仓30分钟，老币1小时
        } else if (confidence >= 70 && risks.length <= 2) {
            shouldTrade = true;
            positionSize = this.calculatePositionSize(confidence, token) * 0.5; // 半仓
            timeLimit = 30;
        }

        // 计算价格目标
        const entryPrice = token.currentPrice;
        const targetPrice = entryPrice * (age < 10 ? 2 : 1.5); // 新币目标翻倍，老币50%
        const stopLoss = entryPrice * 0.85; // 15% 止损

        return this.createDecision(
            shouldTrade,
            shouldTrade ? 'BUY' : 'HOLD',
            confidence,
            token,
            reasons,
            risks,
            entryPrice,
            targetPrice,
            stopLoss,
            positionSize,
            timeLimit
        );
    }

    // 计算仓位大小
    private calculatePositionSize(confidence: number, token: NewToken): number {
        // 基础仓位 $100
        let baseSize = 100;

        // 根据置信度调整
        if (confidence > 85) baseSize *= 1.5;
        if (confidence > 90) baseSize *= 1.5;

        // 根据市值调整
        if (token.marketCap < 10000) baseSize *= 0.8; // 小市值风险高
        if (token.marketCap > 500000) baseSize *= 0.6; // 大市值增长慢

        // 根据流动性调整
        if (token.liquidity < 10000) baseSize *= 0.7;

        return Math.round(baseSize);
    }

    // 更新市场条件
    updateMarketCondition(condition: Partial<MarketCondition>): void {
        this.marketCondition = { ...this.marketCondition, ...condition };
    }

    // 创建决策对象
    private createDecision(
        shouldTrade: boolean,
        action: 'BUY' | 'SELL' | 'HOLD',
        confidence: number,
        token: NewToken,
        reasons: string[],
        risks: string[],
        entryPrice?: number,
        targetPrice?: number,
        stopLoss?: number,
        positionSize?: number,
        timeLimit?: number
    ): TradeDecision {
        return {
            shouldTrade,
            action,
            confidence,
            entryPrice: entryPrice || token.currentPrice,
            targetPrice: targetPrice || token.currentPrice * 1.5,
            stopLoss: stopLoss || token.currentPrice * 0.85,
            positionSize: positionSize || 0,
            timeLimit: timeLimit || 60,
            reasons,
            risks
        };
    }

    // 显示决策
    displayDecision(token: NewToken, decision: TradeDecision): void {
        console.log('\n' + '='.repeat(70));
        console.log('🎯 交易决策');
        console.log('='.repeat(70));
        console.log(`代币: ${token.name} ($${token.symbol})`);
        console.log(`合约: ${token.mint}`);
        console.log(`来源: ${token.source}`);
        console.log(`市值: $${token.marketCap.toLocaleString()}`);
        console.log(`流动性: $${token.liquidity.toLocaleString()}`);
        console.log(`持有者: ${token.holders}`);
        console.log('');
        console.log(`决策: ${decision.shouldTrade ? '🟢 买入' : '🔴 观望'}`);
        console.log(`置信度: ${decision.confidence}%`);
        console.log(`建议仓位: $${decision.positionSize}`);
        console.log(`入场价格: $${decision.entryPrice.toFixed(10)}`);
        console.log(`目标价格: $${decision.targetPrice.toFixed(10)} (${((decision.targetPrice/decision.entryPrice-1)*100).toFixed(0)}%)`);
        console.log(`止损价格: $${decision.stopLoss.toFixed(10)} (${((decision.stopLoss/decision.entryPrice-1)*100).toFixed(0)}%)`);
        console.log(`持仓时限: ${decision.timeLimit}分钟`);
        
        if (decision.reasons.length > 0) {
            console.log('\n✅ 买入理由:');
            decision.reasons.forEach(r => console.log(`  • ${r}`));
        }

        if (decision.risks.length > 0) {
            console.log('\n⚠️ 风险提示:');
            decision.risks.forEach(r => console.log(`  • ${r}`));
        }
        console.log('='.repeat(70));
    }
}

export { TradeDecision, MarketCondition };
