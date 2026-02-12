// 策略基类和实现
import { logger, logStrategy } from '../utils/logger';

export interface MarketData {
    marketId: string;
    price: number;
    timestamp: number;
    volume24h?: number;
    bid?: number;
    ask?: number;
}

export interface Signal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;  // 0-1
    reason: string;
    suggestedSize?: number;
    stopLoss?: number;
    takeProfit?: number;
}

// 策略基类
export abstract class Strategy {
    protected name: string;
    protected params: any;

    constructor(name: string, params: any = {}) {
        this.name = name;
        this.params = params;
    }

    abstract analyze(data: MarketData[]): Signal | null;

    getName(): string {
        return this.name;
    }
}

// 1. 均值回归策略
export class MeanReversionStrategy extends Strategy {
    private window: number;
    private threshold: number;

    constructor(params: { window?: number; threshold?: number } = {}) {
        super('MeanReversion', params);
        this.window = params.window || 20;
        this.threshold = params.threshold || 0.15; // 15% 偏离阈值
    }

    analyze(data: MarketData[]): Signal | null {
        if (data.length < this.window) return null;

        const prices = data.map(d => d.price);
        const currentPrice = prices[prices.length - 1];
        
        // 计算移动平均线
        const recentPrices = prices.slice(-this.window);
        const mean = recentPrices.reduce((a, b) => a + b, 0) / this.window;
        
        // 计算标准差
        const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / this.window;
        const stdDev = Math.sqrt(variance);
        
        // 计算 Z-score
        const zScore = (currentPrice - mean) / stdDev;
        
        // 价格过高，卖出
        if (currentPrice > mean * (1 + this.threshold)) {
            const confidence = Math.min(Math.abs(zScore) / 2, 1);
            logStrategy(this.name, `价格过高: ${currentPrice.toFixed(4)} > 均值 ${mean.toFixed(4)}`);
            return {
                action: 'SELL',
                confidence,
                reason: `价格偏离均值 +${((currentPrice/mean-1)*100).toFixed(1)}%, Z-score: ${zScore.toFixed(2)}`,
                stopLoss: currentPrice * 1.05,
                takeProfit: mean
            };
        }
        
        // 价格过低，买入
        if (currentPrice < mean * (1 - this.threshold)) {
            const confidence = Math.min(Math.abs(zScore) / 2, 1);
            logStrategy(this.name, `价格过低: ${currentPrice.toFixed(4)} < 均值 ${mean.toFixed(4)}`);
            return {
                action: 'BUY',
                confidence,
                reason: `价格偏离均值 -${((1-currentPrice/mean)*100).toFixed(1)}%, Z-score: ${zScore.toFixed(2)}`,
                stopLoss: currentPrice * 0.95,
                takeProfit: mean
            };
        }

        return { action: 'HOLD', confidence: 0, reason: '价格在正常范围内' };
    }
}

// 2. 趋势跟踪策略
export class TrendFollowingStrategy extends Strategy {
    private shortWindow: number;
    private longWindow: number;

    constructor(params: { shortWindow?: number; longWindow?: number } = {}) {
        super('TrendFollowing', params);
        this.shortWindow = params.shortWindow || 5;
        this.longWindow = params.longWindow || 20;
    }

    analyze(data: MarketData[]): Signal | null {
        if (data.length < this.longWindow) return null;

        const prices = data.map(d => d.price);
        const currentPrice = prices[prices.length - 1];

        // 计算短期和长期均线
        const shortMA = this.calculateMA(prices, this.shortWindow);
        const longMA = this.calculateMA(prices, this.longWindow);

        // 金叉：短期上穿长期，买入
        if (shortMA > longMA * 1.02) {
            const prevShortMA = this.calculateMA(prices.slice(0, -1), this.shortWindow);
            const prevLongMA = this.calculateMA(prices.slice(0, -1), this.longWindow);
            
            if (prevShortMA <= prevLongMA) {
                logStrategy(this.name, `金叉信号: 短期MA ${shortMA.toFixed(4)} 上穿长期MA ${longMA.toFixed(4)}`);
                return {
                    action: 'BUY',
                    confidence: 0.7,
                    reason: `金叉: 短期MA(${this.shortWindow})上穿长期MA(${this.longWindow})`,
                    stopLoss: longMA * 0.98,
                    takeProfit: currentPrice * 1.1
                };
            }
        }

        // 死叉：短期下穿长期，卖出
        if (shortMA < longMA * 0.98) {
            const prevShortMA = this.calculateMA(prices.slice(0, -1), this.shortWindow);
            const prevLongMA = this.calculateMA(prices.slice(0, -1), this.longWindow);
            
            if (prevShortMA >= prevLongMA) {
                logStrategy(this.name, `死叉信号: 短期MA ${shortMA.toFixed(4)} 下穿长期MA ${longMA.toFixed(4)}`);
                return {
                    action: 'SELL',
                    confidence: 0.7,
                    reason: `死叉: 短期MA(${this.shortWindow})下穿长期MA(${this.longWindow})`,
                    stopLoss: longMA * 1.02,
                    takeProfit: currentPrice * 0.9
                };
            }
        }

        return { action: 'HOLD', confidence: 0, reason: '无明确趋势' };
    }

    private calculateMA(prices: number[], period: number): number {
        const recent = prices.slice(-period);
        return recent.reduce((a, b) => a + b, 0) / period;
    }
}

// 3. 突破策略
export class BreakoutStrategy extends Strategy {
    private lookback: number;
    private breakoutThreshold: number;

    constructor(params: { lookback?: number; threshold?: number } = {}) {
        super('Breakout', params);
        this.lookback = params.lookback || 20;
        this.breakoutThreshold = params.threshold || 0.02;
    }

    analyze(data: MarketData[]): Signal | null {
        if (data.length < this.lookback) return null;

        const prices = data.map(d => d.price);
        const currentPrice = prices[prices.length - 1];
        const lookbackPrices = prices.slice(-this.lookback, -1);

        const highest = Math.max(...lookbackPrices);
        const lowest = Math.min(...lookbackPrices);
        const range = highest - lowest;

        // 向上突破
        if (currentPrice > highest * (1 + this.breakoutThreshold)) {
            logStrategy(this.name, `向上突破: ${currentPrice.toFixed(4)} > 前高 ${highest.toFixed(4)}`);
            return {
                action: 'BUY',
                confidence: 0.75,
                reason: `突破前${this.lookback}周期高点`,
                stopLoss: highest * 0.99,
                takeProfit: currentPrice + range
            };
        }

        // 向下突破
        if (currentPrice < lowest * (1 - this.breakoutThreshold)) {
            logStrategy(this.name, `向下突破: ${currentPrice.toFixed(4)} < 前低 ${lowest.toFixed(4)}`);
            return {
                action: 'SELL',
                confidence: 0.75,
                reason: `跌破前${this.lookback}周期低点`,
                stopLoss: lowest * 1.01,
                takeProfit: currentPrice - range
            };
        }

        return { action: 'HOLD', confidence: 0, reason: '无突破信号' };
    }
}

// 4. 波动率策略
export class VolatilityStrategy extends Strategy {
    private atrPeriod: number;
    private multiplier: number;

    constructor(params: { atrPeriod?: number; multiplier?: number } = {}) {
        super('Volatility', params);
        this.atrPeriod = params.atrPeriod || 14;
        this.multiplier = params.multiplier || 2;
    }

    analyze(data: MarketData[]): Signal | null {
        if (data.length < this.atrPeriod + 1) return null;

        const prices = data.map(d => d.price);
        const currentPrice = prices[prices.length - 1];

        // 简化版 ATR 计算
        const atr = this.calculateATR(prices, this.atrPeriod);
        
        // 波动率过低，可能即将有大波动
        const recentPrices = prices.slice(-this.atrPeriod);
        const avgRange = atr;
        
        // 使用布林带思路
        const sma = recentPrices.reduce((a, b) => a + b, 0) / this.atrPeriod;
        const upperBand = sma + (atr * this.multiplier);
        const lowerBand = sma - (atr * this.multiplier);

        if (currentPrice > upperBand) {
            return {
                action: 'SELL',
                confidence: 0.6,
                reason: `价格上穿波动率上轨`,
                stopLoss: currentPrice * 1.02,
                takeProfit: sma
            };
        }

        if (currentPrice < lowerBand) {
            return {
                action: 'BUY',
                confidence: 0.6,
                reason: `价格下穿波动率下轨`,
                stopLoss: currentPrice * 0.98,
                takeProfit: sma
            };
        }

        return { action: 'HOLD', confidence: 0, reason: '波动率正常' };
    }

    private calculateATR(prices: number[], period: number): number {
        let sum = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const high = Math.max(prices[i], prices[i-1]);
            const low = Math.min(prices[i], prices[i-1]);
            sum += high - low;
        }
        return sum / period;
    }
}

// 策略工厂
export class StrategyFactory {
    static create(type: string, params: any = {}): Strategy {
        switch (type) {
            case 'meanReversion':
                return new MeanReversionStrategy(params);
            case 'trendFollowing':
                return new TrendFollowingStrategy(params);
            case 'breakout':
                return new BreakoutStrategy(params);
            case 'volatility':
                return new VolatilityStrategy(params);
            default:
                throw new Error(`未知策略类型: ${type}`);
        }
    }
}
