const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 创建新钱包
function createWallet() {
    // 生成随机钱包
    const wallet = ethers.Wallet.createRandom();
    
    console.log('=== 新钱包已创建 ===');
    console.log('地址:', wallet.address);
    console.log('私钥:', wallet.privateKey);
    console.log('助记词:', wallet.mnemonic.phrase);
    
    // 保存到文件（注意：实际使用要保护好这些文件）
    const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
        createdAt: new Date().toISOString()
    };
    
    const savePath = path.join(__dirname, 'wallet.json');
    fs.writeFileSync(savePath, JSON.stringify(walletData, null, 2));
    console.log('\n钱包信息已保存到:', savePath);
    
    return wallet;
}

// 从助记词恢复钱包
function recoverWallet(mnemonic) {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    console.log('=== 钱包已恢复 ===');
    console.log('地址:', wallet.address);
    return wallet;
}

// 连接到 Base 网络
function connectToBase(wallet) {
    // Base Mainnet RPC
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const connectedWallet = wallet.connect(provider);
    
    console.log('\n=== 已连接到 Base 网络 ===');
    console.log('网络: Base Mainnet');
    console.log('RPC: https://mainnet.base.org');
    console.log('Chain ID: 8453');
    
    return connectedWallet;
}

// 查询余额
async function getBalance(address) {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const balance = await provider.getBalance(address);
    console.log('\n=== 账户余额 ===');
    console.log('地址:', address);
    console.log('余额:', ethers.formatEther(balance), 'ETH');
    return balance;
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'create') {
        const wallet = createWallet();
        connectToBase(wallet);
        
        // 查询余额
        await getBalance(wallet.address);
        
    } else if (command === 'recover' && args[1]) {
        const wallet = recoverWallet(args[1]);
        connectToBase(wallet);
        await getBalance(wallet.address);
        
    } else if (command === 'balance' && args[1]) {
        await getBalance(args[1]);
        
    } else {
        console.log('用法:');
        console.log('  node wallet.js create           - 创建新钱包');
        console.log('  node wallet.js recover "助记词"  - 从助记词恢复钱包');
        console.log('  node wallet.js balance 地址      - 查询地址余额');
    }
}

main().catch(console.error);
