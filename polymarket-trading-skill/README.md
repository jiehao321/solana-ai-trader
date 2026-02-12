# Polymarket 自动交易 Skill

基于 TypeScript/Bun 的 Polymarket 预测市场自动交易工具。

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的私钥：
```
PRIVATE_KEY=0x你的私钥
```

### 2. 检查余额

```bash
bun run scripts/check-balance.ts
```

确保有足够的：
- **MATIC** - 支付 gas 费（至少 0.01）
- **USDC.e** - 交易资金（建议至少 5 USDC）

### 3. 生成 API 凭证

```bash
bun run scripts/check-creds.ts
```

这会自动生成 API key/secret/passphrase 并保存到 `.env` 文件。

### 4. 授权交易合约 ⚠️ 关键步骤

```bash
bun run scripts/setup-allowances.ts
```

**必须先完成这步才能交易！** 需要授权 5 个合约，消耗约 $1-2 的 MATIC。

---

## 交易命令

### 买入

**限价单**（size = 份额数量）：
```bash
bun run scripts/buy.ts --token TOKEN_ID --price 0.50 --size 100 --type limit
```

**市价单**（size = 美元金额）：
```bash
bun run scripts/buy.ts --token TOKEN_ID --price 0.50 --size 100 --type market
```

### 卖出

```bash
bun run scripts/sell.ts --token TOKEN_ID --price 0.50 --size 100 --type limit
```

### 查看订单

```bash
bun run scripts/check-orders.ts
```

### 取消订单

```bash
# 取消特定订单
bun run scripts/cancel-orders.ts --order ORDER_ID

# 取消所有订单
bun run scripts/cancel-orders.ts --all
```

---

## 重要概念

### 市价单 vs 限价单

| 类型 | `--size` 含义 | 示例 |
|------|--------------|------|
| **LIMIT** | 份额数量 | `--size 100` = 买100份 |
| **MARKET** | 美元金额 | `--size 100` = 花$100 |

### 价格精度

价格必须是 **0.001** 的倍数，如：0.500, 0.501, 0.505

---

## 目录结构

```
polymarket-trading-skill/
├── .env              # 环境变量（私钥、API凭证）
├── package.json      # 项目配置
├── scripts/
│   ├── check-creds.ts       # 生成 API 凭证
│   ├── setup-allowances.ts  # 授权合约（必须！）
│   ├── check-balance.ts     # 检查余额
│   ├── check-holdings.ts    # 查看持仓
│   ├── check-orders.ts      # 查看活跃订单
│   ├── buy.ts               # 买入
│   ├── sell.ts              # 卖出
│   └── cancel-orders.ts     # 取消订单
```

---

## 安全提醒

⚠️ **永远不要提交 `.env` 文件到 Git！**

`.env` 包含你的私钥和 API 凭证，已经添加到 `.gitignore`。

---

## 获取 Token ID

需要配合 `polymarket` skill 使用，搜索市场并获取 `clobTokenIds`。

或者使用 Polymarket API：
```bash
curl "https://gamma-api.polymarket.com/events"
```
