# 🤖 自动化交易系统

一个完整的自动化交易框架，支持多策略、风险管理和回测。

## 📁 项目结构

```
auto-trader/
├── index.ts              # 主入口
├── engine.ts             # 交易引擎
├── backtest.ts           # 回测系统
├── strategies/           # 策略目录
│   └── index.ts          # 策略实现
├── utils/                # 工具函数
│   ├── logger.ts         # 日志系统
│   └── riskManager.ts    # 风险管理
└── package.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd auto-trader
bun install
```

### 2. 运行回测

```bash
bun run backtest
```

### 3. 启动交易引擎（模拟模式）

```bash
bun run start
```

按 `Ctrl+C` 停止并查看交易报告。

---

## 📊 内置策略

### 1. 均值回归 (MeanReversion)
- **原理**: 价格偏离均值时押注回归
- **参数**:
  - `window`: 计算均值的周期
  - `threshold`: 偏离阈值

### 2. 趋势跟踪 (TrendFollowing)
- **原理**: 均线金叉买入，死叉卖出
- **参数**:
  - `shortWindow`: 短期均线周期
  - `longWindow`: 长期均线周期

### 3. 突破策略 (Breakout)
- **原理**: 突破前高买入，跌破前低卖出
- **参数**:
  - `lookback`: 回看周期
  - `threshold`: 突破阈值

### 4. 波动率策略 (Volatility)
- **原理**: 基于 ATR 的布林带交易
- **参数**:
  - `atrPeriod`: ATR 计算周期
  - `multiplier`: 带宽倍数

---

## ⚙️ 配置说明

### 风险管理配置

```typescript
const riskConfig = {
    maxPositionSize: 500,        // 单笔最大 $500
    maxTotalExposure: 2000,      // 总敞口 $2000
    maxDrawdown: 20,             // 最大回撤 20%
    stopLossPercent: 5,          // 止损 5%
    takeProfitPercent: 10,       // 止盈 10%
    maxDailyTrades: 10,          // 每日最多 10 笔
    maxConcurrentPositions: 3    // 最多 3 个持仓
};
```

### 策略配置

```typescript
const strategies = [
    {
        type: 'meanReversion',
        params: { window: 20, threshold: 0.02 },
        weight: 0.3
    },
    {
        type: 'trendFollowing', 
        params: { shortWindow: 5, longWindow: 20 },
        weight: 0.4
    }
];
```

---

## 📈 回测结果示例

```
============================================================
📊 回测结果
============================================================
初始资金: $10000
最终资金: $10127.21
总收益率: 1.27%
总交易次数: 36
盈利次数: 25
亏损次数: 11
胜率: 69.4%
最大回撤: 1.55%
夏普比率: 0.10
============================================================
```

---

## 🔧 扩展开发

### 添加新策略

```typescript
export class MyStrategy extends Strategy {
    constructor(params: any) {
        super('MyStrategy', params);
    }

    analyze(data: MarketData[]): Signal | null {
        // 实现策略逻辑
        return {
            action: 'BUY',  // 或 'SELL', 'HOLD'
            confidence: 0.8,
            reason: '策略触发原因',
            stopLoss: currentPrice * 0.95,
            takeProfit: currentPrice * 1.1
        };
    }
}
```

### 接入真实交易所

修改 `engine.ts` 中的 `fetchMarketData()` 和交易执行方法：

```typescript
// 示例：接入 Polymarket
private async fetchMarketData(): Promise<void> {
    const markets = await this.polymarketClient.getMarkets();
    for (const market of markets) {
        const price = await this.polymarketClient.getPrice(market.id);
        // 更新数据...
    }
}
```

---

## ⚠️ 风险提示

**这是一个教育性质的框架，实盘使用前请注意：**

1. **充分回测** - 在不同市场条件下测试策略
2. **小额开始** - 先用小额资金验证
3. **监控运行** - 自动化系统需要持续监控
4. **设置止损** - 严格的风险管理是生存关键
5. **了解代码** - 不要运行你不理解的策略

---

## 📚 学习资源

- [Polymarket CLOB 文档](https://docs.polymarket.com/developers/CLOB)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Jupiter 聚合器](https://docs.jup.ag/)
- [Technical Analysis 书籍](https://www.amazon.com/Technical-Analysis-Financial-Markets-Comprehensive/dp/0735200661)

---

## 🎯 下一步

1. ✅ 回测验证策略
2. 🔜 接入真实数据源
3. 🔜 实现交易执行
4. 🔜 添加更多策略
5. 🔜 优化风险管理

**祝你交易顺利！**
