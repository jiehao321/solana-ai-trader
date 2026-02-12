# 智能合约安全审计指南

## 常见漏洞类型

### 1. 重入攻击 (Reentrancy)

**漏洞代码**:
```solidity
// 危险！先转账后更新余额
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}(""); // 外部调用
    require(success, "Transfer failed");
    balances[msg.sender] = 0; // 后更新
}
```

**攻击原理**:
1. 攻击合约调用 withdraw
2. 收到 ETH 时触发 fallback
3. fallback 再次调用 withdraw
4. 余额还没更新，可以重复提取

**修复方案**:
```solidity
// 安全：先更新后转账
function withdraw() external {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0; // 先更新
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// 或使用 ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function withdraw() external nonReentrant {
    // ...
}
```

---

### 2. 整数溢出/下溢

**Solidity < 0.8**:
```solidity
function transfer(address to, uint256 amount) external {
    balances[msg.sender] -= amount; // 下溢！如果 amount > balance
    balances[to] += amount;
}
```

**修复**:
- 使用 Solidity 0.8+（自动检查）
- 或使用 SafeMath

```solidity
// Solidity 0.8+
function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount; // 会自动检查下溢
    balances[to] += amount;
}
```

---

### 3. 访问控制缺失

**漏洞**:
```solidity
function mint(address to, uint256 amount) external {
    // 任何人都可以调用！
    _mint(to, amount);
}
```

**修复**:
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
}
```

---

### 4. 前端运行/抢跑 (Frontrunning)

**场景**:
- 用户在 DEX 下单
- 矿工/机器人看到交易
- 以更高 gas 抢跑
- 用户以 worse price 成交

**防护**:
```solidity
function swap(uint256 minAmountOut) external {
    uint256 amountOut = _swap();
    require(amountOut >= minAmountOut, "Slippage too high");
}
```

---

### 5. 随机数可预测

**漏洞**:
```solidity
function random() public view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(block.timestamp)));
    // 可以预测！
}
```

**修复**: 使用 Chainlink VRF
```solidity
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Random is VRFConsumerBase {
    function getRandomNumber() public returns (bytes32 requestId) {
        return requestRandomness(keyHash, fee);
    }
}
```

---

### 6. 拒绝服务 (DoS)

**漏洞**:
```solidity
function distribute() external {
    for (uint i = 0; i < recipients.length; i++) {
        recipients[i].transfer(amount); // 如果某个地址拒绝接收？
    }
}
```

**修复**: 拉取模式替代推送
```solidity
mapping(address => uint256) public pendingWithdrawals;

function distribute() external {
    for (uint i = 0; i < recipients.length; i++) {
        pendingWithdrawals[recipients[i]] += amount;
    }
}

function withdraw() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    msg.sender.transfer(amount);
}
```

---

## 审计工具

### 1. Slither

**安装**:
```bash
pip install slither-analyzer
```

**使用**:
```bash
slither .
```

**输出示例**:
```
INFO:Detectors:
Reentrancy in Contract.withdraw (Contract.sol#10-15):
    External calls:
    - msg.sender.call{value: amount}("") (Contract.sol#12)
    State variables written after the call(s):
    - balances[msg.sender] = 0 (Contract.sol#14)
```

### 2. Mythril

**安装**:
```bash
pip install mythril
```

**使用**:
```bash
myth analyze Contract.sol
```

### 3. Echidna (模糊测试)

**安装**:
```bash
docker pull trailofbits/echidna
```

**使用**:
```solidity
contract TestToken is Token {
    function echidna_balance() public view returns (bool) {
        return balanceOf(msg.sender) <= totalSupply();
    }
}
```

### 4. Hardhat 测试覆盖

```javascript
// 测试重入攻击
describe("Reentrancy", function() {
    it("Should prevent reentrancy attack", async function() {
        const attacker = await deployAttacker();
        
        await expect(
            attacker.attack({ value: ethers.parseEther("1") })
        ).to.be.reverted;
    });
});
```

---

## 审计检查清单

### 代码质量
- [ ] 使用最新 Solidity 版本
- [ ] 遵循命名规范
- [ ] 足够的注释
- [ ] 无编译警告

### 安全性
- [ ] 重入保护
- [ ] 访问控制
- [ ] 输入验证
- [ ] 溢出检查
- [ ] 紧急暂停功能

### 经济模型
- [ ] 代币经济学合理
- [ ] 无无限铸币
- [ ] 权限可放弃
- [ ] LP 锁定机制

### 测试
- [ ] 单元测试覆盖 > 80%
- [ ] 集成测试
- [ ] 模糊测试
- [ ] 主网 fork 测试

---

## 著名攻击案例

### 1. The DAO (2016)
- **漏洞**: 重入攻击
- **损失**: 360万 ETH
- **结果**: 以太坊硬分叉

### 2. Poly Network (2021)
- **漏洞**: 跨链验证缺失
- **损失**: $6.1亿
- **结果**: 黑客归还资金

### 3. Ronin Network (2022)
- **漏洞**: 私钥泄露
- **损失**: $6.25亿
- **结果**: 加强安全措施

### 4. Wormhole (2022)
- **漏洞**: 签名验证绕过
- **损失**: $3.2亿

---

## 学习资源

### 书籍
- "Mastering Ethereum"
- "Building Secure Smart Contracts"

### 网站
- [SWC Registry](https://swcregistry.io) - 智能合约漏洞分类
- [Consensys Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Capture The Ether](https://capturetheether.com) - 安全游戏

### CTF 练习
- [Ethernaut](https://ethernaut.openzeppelin.com)
- [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz)
- [Paradigm CTF](https://github.com/paradigmxyz/paradigm-ctf)

---

## 审计报告模板

```markdown
# 智能合约安全审计报告

## 项目信息
- 项目名称: XXX
- 审计日期: 2024-XX-XX
- 审计师: XXX

## 严重问题 (Critical)
1. [C-01] 重入攻击风险
   - 位置: Contract.sol:45
   - 描述: withdraw 函数存在重入漏洞
   - 修复: 使用 checks-effects-interactions 模式

## 高危问题 (High)
...

## 中危问题 (Medium)
...

## 低危问题 (Low)
...

## 信息性问题 (Informational)
...

## 总结
- 严重: 2
- 高危: 1
- 中危: 3
- 低危: 5

建议修复所有严重和高危问题后再部署。
```
