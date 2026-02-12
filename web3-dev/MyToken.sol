// 示例 ERC-20 代币合约
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 10亿
    
    // 交易税
    uint256 public buyTax = 0;
    uint256 public sellTax = 0;
    
    // 税收地址
    address public taxWallet;
    
    // 是否开启交易
    bool public tradingEnabled = false;
    
    // 白名单
    mapping(address => bool) public whitelist;
    
    event TradingEnabled();
    event TaxUpdated(uint256 buyTax, uint256 sellTax);
    
    constructor(
        string memory name,
        string memory symbol,
        address _taxWallet
    ) ERC20(name, symbol) Ownable(msg.sender) {
        taxWallet = _taxWallet;
        whitelist[msg.sender] = true;
        whitelist[address(this)] = true;
        
        // 铸造初始供应给合约创建者
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // 开启交易
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled();
    }
    
    // 设置税收
    function setTax(uint256 _buyTax, uint256 _sellTax) external onlyOwner {
        require(_buyTax <= 1000, "Buy tax too high"); // 最大 10%
        require(_sellTax <= 1000, "Sell tax too high");
        buyTax = _buyTax;
        sellTax = _sellTax;
        emit TaxUpdated(_buyTax, _sellTax);
    }
    
    // 添加白名单
    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
    }
    
    // 移除白名单
    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
    }
    
    // 转账前检查
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // 如果不是白名单，检查交易是否开启
        if (!whitelist[from] && !whitelist[to]) {
            require(tradingEnabled, "Trading not enabled");
        }
    }
    
    // 转账时收取税费
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        uint256 taxAmount = 0;
        
        // 计算税费
        if (!whitelist[from] && !whitelist[to]) {
            if (to == address(0) || from == address(0)) {
                // 铸造/销毁不收税
            } else {
                // 这里简化处理，实际需要判断买卖
                // 实际项目中需要集成 DEX 路由
            }
        }
        
        if (taxAmount > 0) {
            super._transfer(from, taxWallet, taxAmount);
            amount -= taxAmount;
        }
        
        super._transfer(from, to, amount);
    }
}
