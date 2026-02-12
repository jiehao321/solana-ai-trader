// 策略 1: 均值回归策略
// 当价格偏离 0.5 较远时，押注回归

interface Market {
    name: string;
    tokenID: string;
    yesPrice: number;
    noPrice: number;
}

// 模拟市场数据
const mockMarkets: Market[] = [
    { name: "Trump wins 2024", tokenID: "12345", yesPrice: 0.52, noPrice: 0.48 },
    { name: "BTC > $100k in 2024", tokenID: "12346", yesPrice: 0.15, noPrice: 0.85 },
    { name: "ETH ETF approved", tokenID: "12347", yesPrice: 0.88, noPrice: 0.12 },
];

// 均值回归策略
function meanReversionStrategy(markets: Market[]) {
    console.log("📊 均值回归策略分析\n");
    console.log("策略: 当价格偏离 0.5 超过 0.3 时，押注回归\n");
    
    const signals = [];
    
    for (const market of markets) {
        const yesDeviation = Math.abs(market.yesPrice - 0.5);
        const noDeviation = Math.abs(market.noPrice - 0.5);
        
        // YES 价格极低 - 买入 YES
        if (market.yesPrice < 0.2) {
            signals.push({
                market: market.name,
                action: "BUY_YES",
                price: market.yesPrice,
                reason: `价格 ${market.yesPrice} 严重低估，预期回归 0.5`,
                confidence: (0.2 - market.yesPrice) / 0.2 * 100
            });
        }
        
        // YES 价格极高 - 买入 NO
        if (market.yesPrice > 0.8) {
            signals.push({
                market: market.name,
                action: "BUY_NO",
                price: market.noPrice,
                reason: `YES 价格 ${market.yesPrice} 严重高估，押注回归`,
                confidence: (market.yesPrice - 0.8) / 0.2 * 100
            });
        }
    }
    
    if (signals.length === 0) {
        console.log("🤔 当前没有符合条件的交易信号");
        console.log("建议: 等待市场出现极端价格");
    } else {
        console.log(`发现 ${signals.length} 个交易信号:\n`);
        signals.forEach((s, i) => {
            console.log(`${i + 1}. ${s.market}`);
            console.log(`   操作: ${s.action}`);
            console.log(`   价格: $${s.price}`);
            console.log(`   理由: ${s.reason}`);
            console.log(`   置信度: ${s.confidence.toFixed(1)}%`);
            console.log("");
        });
    }
    
    return signals;
}

// 策略 2: 趋势跟踪
function trendFollowingStrategy(marketHistory: { price: number; time: string }[]) {
    console.log("\n📈 趋势跟踪策略分析\n");
    
    if (marketHistory.length < 5) {
        console.log("历史数据不足，需要至少 5 个数据点");
        return;
    }
    
    // 计算移动平均线
    const recent = marketHistory.slice(-5);
    const avg = recent.reduce((sum, h) => sum + h.price, 0) / recent.length;
    const current = marketHistory[marketHistory.length - 1].price;
    
    console.log("当前价格:", current);
    console.log("5期均价:", avg.toFixed(3));
    
    if (current > avg * 1.05) {
        console.log("📊 信号: 上涨趋势，建议买入 YES");
        console.log("止损: 跌破均价时退出");
    } else if (current < avg * 0.95) {
        console.log("📊 信号: 下跌趋势，建议买入 NO");
        console.log("止损: 突破均价时退出");
    } else {
        console.log("📊 信号: 震荡行情，观望");
    }
}

// 策略 3: 凯利公式仓位管理
function kellyCriterion(winRate: number, avgWin: number, avgLoss: number) {
    console.log("\n💰 凯利公式仓位计算\n");
    
    // 凯利公式: f = (p*b - q) / b
    // p = 胜率, q = 败率, b = 盈亏比
    const p = winRate;
    const q = 1 - winRate;
    const b = avgWin / avgLoss;
    
    const kelly = (p * b - q) / b;
    const halfKelly = kelly / 2; // 保守起见用半凯利
    
    console.log(`胜率: ${(p * 100).toFixed(1)}%`);
    console.log(`盈亏比: ${b.toFixed(2)}`);
    console.log(`凯利比例: ${(kelly * 100).toFixed(1)}%`);
    console.log(`建议仓位 (半凯利): ${(halfKelly * 100).toFixed(1)}%`);
    
    if (kelly <= 0) {
        console.log("⚠️  期望值为负，不建议交易");
    }
    
    return halfKelly;
}

// 策略 4: 波动率突破
function volatilityBreakout(prices: number[]) {
    console.log("\n📊 波动率突破策略\n");
    
    if (prices.length < 20) {
        console.log("需要至少 20 个价格数据");
        return;
    }
    
    // 计算布林带
    const period = 20;
    const recent = prices.slice(-period);
    const sma = recent.reduce((a, b) => a + b, 0) / period;
    
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upperBand = sma + 2 * stdDev;
    const lowerBand = sma - 2 * stdDev;
    const current = prices[prices.length - 1];
    
    console.log("上轨:", upperBand.toFixed(3));
    console.log("中轨:", sma.toFixed(3));
    console.log("下轨:", lowerBand.toFixed(3));
    console.log("当前:", current.toFixed(3));
    
    if (current > upperBand) {
        console.log("🚀 突破上轨，强烈看涨信号");
    } else if (current < lowerBand) {
        console.log("🔻 突破下轨，强烈看跌信号");
    } else {
        console.log("➡️ 价格在通道内，观望");
    }
}

// 运行示例
console.log("=".repeat(60));
console.log("Polymarket 交易策略示例");
console.log("=".repeat(60));

// 1. 均值回归
meanReversionStrategy(mockMarkets);

// 2. 趋势跟踪
const history = [
    { price: 0.45, time: "t-4" },
    { price: 0.47, time: "t-3" },
    { price: 0.50, time: "t-2" },
    { price: 0.53, time: "t-1" },
    { price: 0.58, time: "now" },
];
trendFollowingStrategy(history);

// 3. 凯利公式
kellyCriterion(0.55, 100, 50);

// 4. 波动率突破
const prices = Array.from({ length: 20 }, () => 0.5 + (Math.random() - 0.5) * 0.1);
prices[19] = 0.65; // 模拟突破
volatilityBreakout(prices);

console.log("\n" + "=".repeat(60));
console.log("提示: 这些只是示例策略，实盘需谨慎");
console.log("=".repeat(60));
