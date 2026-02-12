# Web3 开发环境设置指南

## 1. 安装 Hardhat

```bash
# 创建项目目录
mkdir my-web3-project
cd my-web3-project

# 初始化 npm
npm init -y

# 安装 Hardhat
npm install --save-dev hardhat

# 创建 Hardhat 项目
npx hardhat init
# 选择: Create a TypeScript project
```

## 2. 安装依赖

```bash
# OpenZeppelin 合约库
npm install @openzeppelin/contracts

# 测试工具
npm install --save-dev chai @nomicfoundation/hardhat-chai-matchers

# Ethers.js
npm install ethers
```

## 3. 配置 hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
      },
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
      accounts: [process.env.PRIVATE_KEY!],
    },
    mainnet: {
      url: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
```

## 4. 创建 .env 文件

```
PRIVATE_KEY=0x你的私钥
ALCHEMY_API_KEY=你的Alchemy密钥
ETHERSCAN_API_KEY=你的Etherscan密钥
```

## 5. 常用命令

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到本地网络
npx hardhat run scripts/deploy.ts

# 部署到测试网
npx hardhat run scripts/deploy.ts --network sepolia

# 验证合约
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS

# 启动本地节点
npx hardhat node

# 运行脚本在本地节点
npx hardhat run scripts/deploy.ts --network localhost
```

## 6. 项目结构

```
my-web3-project/
├── contracts/          # Solidity 合约
│   ├── MyToken.sol
│   └── ...
├── scripts/            # 部署脚本
│   └── deploy.ts
├── test/               # 测试文件
│   └── MyToken.test.ts
├── hardhat.config.ts   # Hardhat 配置
└── .env               # 环境变量
```

## 7. 示例部署脚本

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy(
    "My Token",
    "MTK",
    deployer.address
  );

  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main().catch(console.error);
```

## 8. 获取测试网 ETH

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)

## 9. 学习资源

- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 文档](https://docs.openzeppelin.com)
- [Ethers.js 文档](https://docs.ethers.io)
- [Solidity by Example](https://solidity-by-example.org)
