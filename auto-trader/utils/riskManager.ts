// 风险管理模块
import { logger, logError } from '../utils/logger';

export interface RiskConfig {
    maxPositionSize: number;        // 单笔最大仓位（USDC）
    maxTotalExposure: number;       // 总敞口上限（USDC）
    maxDrawdown: number;            // 最大回撤（百分比）
    stopLossPercent: number;        // 止损比例
    takeProfitPercent: number;      // 止盈比例
    maxDailyTrades: number;         // 每日最大交易次数
    maxConcurrentPositions: number; // 最大同时持仓数
}

export interface Position {
    id: string;
    marketId: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    size: number;                   // 仓位大小（USDC）
    entryTime: Date;
    stopLoss?: number;
    takeProfit?: number;
}

export class RiskManager {
    private config: RiskConfig;
    private positions: Map<string, Position> = new Map();
    private dailyTrades: number = 0;
    private lastTradeDate: string = '';
    private initialBalance: number;
    private currentBalance: number;

    constructor(config: RiskConfig, initialBalance: number) {
        this.config = config;
        this.initialBalance = initialBalance;
        this.currentBalance = initialBalance;
        logger.info(`风险管理初始化: 初始资金 $${initialBalance}`);
    }

    // 检查是否可以开新仓
    canOpenPosition(size: number): { allowed: boolean; reason?: string } {
        // 检查单笔仓位限制
        if (size > this.config.maxPositionSize) {
            return { 
                allowed: false, 
                reason: `仓位大小 $${size} 超过限制 $${this.config.maxPositionSize}` 
            };
        }

        // 检查总敞口
        const totalExposure = this.getTotalExposure();
        if (totalExposure + size > this.config.maxTotalExposure) {
            return { 
                allowed: false, 
                reason: `总敞口 $${totalExposure + size} 超过限制 $${this.config.maxTotalExposure}` 
            };
        }

        // 检查持仓数量
        if (this.positions.size >= this.config.maxConcurrentPositions) {
            return { 
                allowed: false, 
                reason: `持仓数量 ${this.positions.size} 达到上限` 
            };
        }

        // 检查每日交易次数
        this.resetDailyCounterIfNeeded();
        if (this.dailyTrades >= this.config.maxDailyTrades) {
            return { 
                allowed: false, 
                reason: `今日交易次数 ${this.dailyTrades} 达到上限` 
            };
        }

        // 检查回撤
        const drawdown = this.getDrawdown();
        if (drawdown > this.config.maxDrawdown) {
            return { 
                allowed: false, 
                reason: `当前回撤 ${drawdown.toFixed(2)}% 超过限制 ${this.config.maxDrawdown}%` 
            };
        }

        return { allowed: true };
    }

    // 添加持仓
    addPosition(position: Position): void {
        this.positions.set(position.id, position);
        this.dailyTrades++;
        logger.info(`添加持仓: ${position.id}, 大小: $${position.size}`);
    }

    // 移除持仓
    removePosition(positionId: string, exitPrice: number): { pnl: number; pnlPercent: number } {
        const position = this.positions.get(positionId);
        if (!position) {
            throw new Error(`持仓不存在: ${positionId}`);
        }

        // 计算盈亏
        const priceDiff = position.side === 'LONG' 
            ? exitPrice - position.entryPrice 
            : position.entryPrice - exitPrice;
        
        const pnl = priceDiff * position.size;
        const pnlPercent = (priceDiff / position.entryPrice) * 100;

        // 更新余额
        this.currentBalance += pnl;

        // 移除持仓
        this.positions.delete(positionId);

        logger.info(`移除持仓: ${positionId}, 盈亏: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);

        return { pnl, pnlPercent };
    }

    // 检查是否需要止损/止盈
    checkExitConditions(positionId: string, currentPrice: number): { 
        shouldExit: boolean; 
        reason?: string;
        exitPrice?: number;
    } {
        const position = this.positions.get(positionId);
        if (!position) return { shouldExit: false };

        const priceDiff = currentPrice - position.entryPrice;
        const percentChange = (priceDiff / position.entryPrice) * 100;

        // 检查止损
        if (position.side === 'LONG' && percentChange <= -this.config.stopLossPercent) {
            return { 
                shouldExit: true, 
                reason: 'STOP_LOSS',
                exitPrice: currentPrice
            };
        }

        if (position.side === 'SHORT' && percentChange >= this.config.stopLossPercent) {
            return { 
                shouldExit: true, 
                reason: 'STOP_LOSS',
                exitPrice: currentPrice
            };
        }

        // 检查止盈
        if (position.side === 'LONG' && percentChange >= this.config.takeProfitPercent) {
            return { 
                shouldExit: true, 
                reason: 'TAKE_PROFIT',
                exitPrice: currentPrice
            };
        }

        if (position.side === 'SHORT' && percentChange <= -this.config.takeProfitPercent) {
            return { 
                shouldExit: true, 
                reason: 'TAKE_PROFIT',
                exitPrice: currentPrice
            };
        }

        return { shouldExit: false };
    }

    // 计算凯利公式仓位
    calculateKellyPosition(winRate: number, avgWin: number, avgLoss: number): number {
        const b = avgWin / avgLoss; // 盈亏比
        const q = 1 - winRate;       // 败率
        
        const kelly = (winRate * b - q) / b;
        const halfKelly = Math.max(0, kelly / 2); // 使用半凯利，更保守
        
        const positionSize = this.currentBalance * halfKelly;
        
        // 不超过最大仓位限制
        return Math.min(positionSize, this.config.maxPositionSize);
    }

    // 获取总敞口
    getTotalExposure(): number {
        let total = 0;
        for (const pos of this.positions.values()) {
            total += pos.size;
        }
        return total;
    }

    // 计算回撤
    getDrawdown(): number {
        if (this.currentBalance >= this.initialBalance) return 0;
        return ((this.initialBalance - this.currentBalance) / this.initialBalance) * 100;
    }

    // 获取账户状态
    getStatus() {
        return {
            initialBalance: this.initialBalance,
            currentBalance: this.currentBalance,
            totalPnl: this.currentBalance - this.initialBalance,
            drawdown: this.getDrawdown(),
            openPositions: this.positions.size,
            totalExposure: this.getTotalExposure(),
            dailyTrades: this.dailyTrades,
            availableExposure: this.config.maxTotalExposure - this.getTotalExposure()
        };
    }

    // 获取所有持仓
    getPositions(): Position[] {
        return Array.from(this.positions.values());
    }

    // 重置每日计数器
    private resetDailyCounterIfNeeded(): void {
        const today = new Date().toISOString().split('T')[0];
        if (today !== this.lastTradeDate) {
            this.dailyTrades = 0;
            this.lastTradeDate = today;
        }
    }
}
