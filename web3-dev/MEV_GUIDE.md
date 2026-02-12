# MEV (最大可提取价值) 完全指南

## 什么是 MEV？

MEV = Maximal Extractable Value（最大可提取价值）

矿工/验证者通过重新排序、插入或审查交易可以获得的额外利润。

**简单理解**: 抢在别人前面交易，赚取差价。

---

## MEV 的主要类型

### 1. 套利 (Arbitrage)

**原理**: 同一资产在不同 DEX 价格不同

```
Uniswap: ETH/USDC = 2000
SushiSwap: ETH/USDC = 1990

在 Sushi 买入，在 Uni 卖出
利润 = 10 USDC per ETH
```

**代码示例**:
```solidity
contract Arbitrage {
    function arbitrage(
        address dex1,
        address dex2,
        address token,
        uint256 amount
    ) external {
        // 1. 从 dex1 买入
        uint256 bought = IDex(dex1).swap(token, amount);
        
        // 2. 在 dex2 卖出
        uint256 received = IDex(dex2).swap(token, bought);
        
        // 3. 确保盈利
        require(received > amount, "No profit");
    }
}
```

### 2. 清算 (Liquidation)

**原理**: 借贷协议中抵押不足的仓位可以被清算

**利润来源**: 清算奖励（通常 5-10%）

**流程**:
1. 监控 Aave/Compound 仓位
2. 发现健康因子 < 1 的仓位
3. 触发清算
4. 获得清算奖励

### 3. 三明治攻击 (Sandwich Attack)

**原理**: 在大额交易前后插入交易

```
用户: 买入 100 ETH (会推高价格)

攻击者:
  1. 前置交易: 买入 ETH (推高价格)
  2. 用户交易: 以更高价格买入
  3. 后置交易: 卖出 ETH (获利)
```

**风险**: 需要精确计算 gas，竞争激烈

### 4. JIT 流动性 (Just-In-Time)

**原理**: 在大额交易前提供流动性，交易后立即撤出

**利润**: 赚取大额交易的手续费

---

## MEV 基础设施

### 1. Flashbots

**是什么**: 私有交易池，防止 frontrunning

**使用场景**:
- 大额交易保护
- 复杂的 MEV 策略
- 失败交易不付 gas

**基本使用**:
```javascript
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");

const flashbotsProvider = await FlashbotsBundleProvider.create(
    standardProvider,
    wallet
);

const bundle = [
    {
        transaction: {
            to: contractAddress,
            data: txData,
            gasLimit: 300000,
            maxFeePerGas: 50e9,
        },
        signer: wallet
    }
];

const response = await flashbotsProvider.sendBundle(bundle, targetBlock);
```

### 2. Eden Network

类似 Flashbots 的 MEV 保护方案

### 3. MEV-Share

Flashbots 的新协议，允许用户分享 MEV 收益

---

## 套利机器人架构

```
┌─────────────────────────────────────────┐
│           监听层 (Listener)              │
│  - 监听 mempool                         │
│  - 监听新区块                           │
│  - 监听价格变化                         │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           策略层 (Strategy)              │
│  - 计算套利机会                         │
│  - 评估风险和收益                       │
│  - 选择最优路径                         │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           执行层 (Execution)             │
│  - 构建交易 bundle                      │
│  - 发送到 Flashbots/Mempool             │
│  - 监控执行结果                         │
└─────────────────────────────────────────┘
```

---

## 实战：简单的套利检测脚本

```javascript
const { ethers } = require('ethers');

// Uniswap V2 Router ABI (简化)
const ROUTER_ABI = [
    "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)"
];

const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

class ArbitrageDetector {
    constructor(provider) {
        this.provider = provider;
        this.uniRouter = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, provider);
        this.sushiRouter = new ethers.Contract(SUSHISWAP_ROUTER, ROUTER_ABI, provider);
    }

    async detectArbitrage(tokenA, tokenB, amountIn) {
        const path = [tokenA, tokenB];
        
        // 获取两个 DEX 的报价
        const uniAmounts = await this.uniRouter.getAmountsOut(amountIn, path);
        const sushiAmounts = await this.sushiRouter.getAmountsOut(amountIn, path);
        
        const uniOut = uniAmounts[1];
        const sushiOut = sushiAmounts[1];
        
        // 计算差价
        if (uniOut > sushiOut) {
            const profit = uniOut - sushiOut;
            const profitPercent = (profit / amountIn) * 100;
            
            console.log(`套利机会: Sushi -> Uni`);
            console.log(`投入: ${ethers.formatEther(amountIn)} ETH`);
            console.log(`利润: ${ethers.formatEther(profit)} ETH (${profitPercent.toFixed(2)}%)`);
            
            return {
                direction: "SUSHI_TO_UNI",
                profit: profit,
                profitPercent: profitPercent
            };
        } else if (sushiOut > uniOut) {
            const profit = sushiOut - uniOut;
            const profitPercent = (profit / amountIn) * 100;
            
            console.log(`套利机会: Uni -> Sushi`);
            console.log(`投入: ${ethers.formatEther(amountIn)} ETH`);
            console.log(`利润: ${ethers.formatEther(profit)} ETH (${profitPercent.toFixed(2)}%)`);
            
            return {
                direction: "UNI_TO_SUSHI",
                profit: profit,
                profitPercent: profitPercent
            };
        }
        
        return null;
    }
}

// 使用示例
async function main() {
    const provider = new ethers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY");
    const detector = new ArbitrageDetector(provider);
    
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC = "0xA0b86a33E6441E6C7D3D4B4f6c7e8F9a0B1c2D3e";
    
    // 检测 1 ETH 的套利机会
    await detector.detectArbitrage(WETH, USDC, ethers.parseEther("1"));
}
```

---

## 风险管理

### 1. Gas 费风险
- 套利利润必须 > gas 费
- 使用 gas 估算

### 2. 价格波动
- 交易执行期间价格变化
- 设置滑点保护

### 3. 抢跑风险
- 其他 MEV 机器人竞争
- 使用 Flashbots

### 4. 智能合约风险
- DEX 合约漏洞
- 使用已审计的协议

---

## 收益计算

```
总收益 = 套利利润 - gas费 - 协议手续费

净利润率 = (总收益 / 投入本金) * 100%

示例:
投入: 10 ETH
套利利润: 0.05 ETH
gas费: 0.01 ETH
手续费: 0.003 ETH

总收益 = 0.05 - 0.01 - 0.003 = 0.037 ETH
净利润率 = 0.37%
```

---

## 学习资源

### 文档
- [Flashbots 文档](https://docs.flashbots.net)
- [MEV-Explore](https://explore.flashbots.net)
- [Ethereum MEV 研究](https://arxiv.org/abs/1904.05234)

### 工具
- [Flashbots Protect](https://protect.flashbots.net)
- [MEV-Inspect](https://github.com/flashbots/mev-inspect-rs)
- [Tenderly](https://tenderly.co) - 交易模拟

### 社区
- [Flashbots Discord](https://discord.gg/flashbots)
- [MEV Research](https://github.com/flashbots/mev-research)

---

## ⚠️ 警告

**MEV 竞争激烈**:
- 专业团队使用硬件优化
- 需要大量资金
- 技术要求高

**建议**:
- 先从小额开始
- 使用测试网练习
- 深入了解后再实盘
- 考虑加入 MEV 合作社群
