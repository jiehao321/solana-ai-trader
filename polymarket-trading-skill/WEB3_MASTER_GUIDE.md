# Web3 智能合约大师学习路线 + 打狗指南

## 📚 顶级 GitHub 学习资源

### 1. 智能合约基础

| 资源 | 链接 | 说明 |
|------|------|------|
| **OpenZeppelin Contracts** | github.com/OpenZeppelin/openzeppelin-contracts | 最安全的合约库 |
| **Solidity 课程** | github.com/smartcontractkit/full-blockchain-solidity-course-js | 32小时完整课程 |
| **CryptoZombies** | cryptozombies.io | 游戏化学习 Solidity |
| **Speed Run Ethereum** | speedrunethereum.com | 快速实战项目 |

### 2. 开发工具

| 工具 | 用途 |
|------|------|
| **Hardhat** | 以太坊开发环境 |
| **Foundry** | 更快的测试框架 (Rust) |
| **Ethers.js** | 与区块链交互 |
| **OpenZeppelin Wizard** | 合约生成器 |

---

## 🎯 打狗（新币狙击）完全指南

### 什么是"打狗"？

在 DEX（如 Uniswap、PancakeSwap）上新币发布时，第一时间买入，希望币价暴涨后卖出获利。

**风险极高！90% 的新币是骗局！**

### 打狗的核心要素

#### 1. 信息源
- **Token Sniffer** - 检测合约风险
- **DEXTools** - 新币监控
- **Telegram 群组** - 内部消息
- **Twitter** - KOL 喊单

#### 2. 技术准备

**MEV 机器人** - 抢跑其他买家
```solidity
// 简化的狙击合约概念
contract Sniper {
    function snipe(address token, uint amount) external {
        // 1. 监听 mempool 中的 addLiquidity 交易
        // 2. 用更高的 gas 抢跑
        // 3. 买入后立即设置限价卖出
    }
}
```

**关键参数**:
- Gas Price: 比当前高 20-50%
- Gas Limit: 300,000+
- Slippage: 10-20% (新币波动大)

#### 3. 风险检查清单

买入前必须检查：
- [ ] 合约是否开源
- [ ] 是否有 mint 函数（可以无限增发）
- [ ] 是否有黑名单功能
- [ ] 是否有交易税（tax）
- [ ] LP 是否锁定
- [ ] 开发者是否放弃所有权
- [ ] 是否有貔貅模式（只能买不能卖）

### 常见骗局类型

| 类型 | 特征 | 如何避免 |
|------|------|---------|
| **貔貅盘** | 只能买不能卖 | 先用小额测试卖出 |
| **蜜罐** | 特定条件触发无法卖出 | 用 Token Sniffer 检测 |
| **拉地毯** | 开发者撤走流动性 | 检查 LP 锁定 |
| **无限铸币** | 可以无限增发 | 检查合约代码 |
| **黑名单** | 特定地址无法交易 | 检查合约功能 |

---

## 💻 实战：创建一个简单的狙击脚本

### 1. 监听新币发布

```javascript
const { ethers } = require('ethers');
const provider = new ethers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY');

// Uniswap V2 Factory
const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';

// 监听 PairCreated 事件
provider.on({
    address: UNISWAP_FACTORY,
    topics: [PAIR_CREATED_TOPIC]
}, async (log) => {
    const token0 = '0x' + log.topics[1].slice(26);
    const token1 = '0x' + log.topics[2].slice(26);
    const pair = '0x' + log.data.slice(26, 66);
    
    console.log('新交易对创建!');
    console.log('Token0:', token0);
    console.log('Token1:', token1);
    console.log('Pair:', pair);
    
    // 检查是否是 WETH 交易对
    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    if (token0 === WETH || token1 === WETH) {
        const newToken = token0 === WETH ? token1 : token0;
        console.log('🎯 发现新代币:', newToken);
        // 这里可以触发买入逻辑
    }
});
```

### 2. 合约安全检查脚本

```javascript
async function checkTokenSafety(tokenAddress) {
    const code = await provider.getCode(tokenAddress);
    
    // 检查常见危险函数
    const dangers = [];
    
    if (code.includes('0x40c10f19')) { // mint(address,uint256)
        dangers.push('有铸币功能');
    }
    if (code.includes('0xf9f51466')) { // blacklist(address)
        dangers.push('有黑名单功能');
    }
    if (code.includes('0x8af416f6')) { // pause()
        dangers.push('可暂停交易');
    }
    
    return {
        safe: dangers.length === 0,
        dangers
    };
}
```

---

## 🛡️ 安全最佳实践

### 钱包管理
```
热钱包 (小金额)     冷钱包 (大金额)
    ↓                    ↓
日常交易、打狗       长期存储
    ↓                    ↓
MetaMask            Ledger/Trezor
```

### 交易安全
1. **永远先用小额测试**
2. **检查合约代码** - 用 Etherscan
3. **设置滑点保护** - 防止被夹
4. **使用专用钱包** - 打狗和主资产分开

### 常见错误
- ❌ 把全部资金投入一个新币
- ❌ 不检查合约就买入
- ❌ FOMO 追高
- ❌ 不设置止损
- ❌ 使用主钱包打狗

---

## 📖 推荐学习顺序

### 第 1 周：Solidity 基础
- [ ] 完成 CryptoZombies 前 5 章
- [ ] 理解 ERC-20 标准
- [ ] 部署第一个合约到测试网

### 第 2 周：开发工具
- [ ] 安装 Hardhat
- [ ] 学习 Ethers.js
- [ ] 编写测试用例

### 第 3 周：实战项目
- [ ] 创建一个 ERC-20 代币
- [ ] 部署到测试网
- [ ] 在 Uniswap 添加流动性

### 第 4 周：高级主题
- [ ] 学习 MEV 原理
- [ ] 理解 Flashbots
- [ ] 研究成功狙击案例

---

## 🔗 更多资源

### 文档
- [Solidity 官方文档](https://docs.soliditylang.org)
- [Ethers.js 文档](https://docs.ethers.io)
- [Hardhat 文档](https://hardhat.org/docs)
- [Uniswap V2 白皮书](https://uniswap.org/whitepaper.pdf)

### 工具网站
- [Etherscan](https://etherscan.io) - 区块浏览器
- [DEXTools](https://dextools.io) - DEX 分析
- [Token Sniffer](https://tokensniffer.com) - 合约检测
- [Revoke.cash](https://revoke.cash) - 撤销授权

### 社区
- [Ethereum StackExchange](https://ethereum.stackexchange.com)
- [r/ethdev](https://reddit.com/r/ethdev)
- [OpenZeppelin Forum](https://forum.openzeppelin.com)

---

## ⚠️ 重要警告

**打狗是高风险行为：**
- 90% 的新币在 24 小时内归零
- MEV 竞争激烈，散户很难赢过专业机器人
- 很多项目是蜜罐骗局
- Gas 费可能吞噬利润

**建议：**
- 只用亏得起的钱
- 先学习，再实战
- 从小额开始
- 永远 DYOR (Do Your Own Research)
