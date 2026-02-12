import { Wallet, providers, Contract } from "ethers";
import * as fs from "fs";
import * as path from "path";

// 加载 .env 文件
function loadEnv() {
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach(line => {
            const [key, value] = line.split("=");
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC || "https://polygon-rpc.com";

if (!PRIVATE_KEY) {
    console.error("❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY");
    process.exit(1);
}

// 合约地址
const ADDRESSES = {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
    CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045", // Conditional Tokens
    REGULAR_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    NEGRISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
    NEGRISK_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
};

// ERC20 ABI
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
];

// CTF ABI
const CTF_ABI = [
    "function setApprovalForAll(address operator, bool approved) public",
    "function isApprovedForAll(address account, address operator) public view returns (bool)",
];

async function main() {
    const provider = new providers.JsonRpcProvider(POLYGON_RPC);
    const signer = new Wallet(PRIVATE_KEY, provider);
    const address = signer.address;

    console.log("🔍 检查合约授权\n");
    console.log("钱包:", address);
    console.log("\n" + "=".repeat(50));

    const usdc = new Contract(ADDRESSES.USDC, ERC20_ABI, signer);
    const ctf = new Contract(ADDRESSES.CTF, CTF_ABI, signer);

    // 检查当前授权
    const usdcRegular = await usdc.allowance(address, ADDRESSES.REGULAR_EXCHANGE);
    const usdcNegRiskAdapter = await usdc.allowance(address, ADDRESSES.NEGRISK_ADAPTER);
    const usdcNegRiskExchange = await usdc.allowance(address, ADDRESSES.NEGRISK_EXCHANGE);
    
    const ctfRegular = await ctf.isApprovedForAll(address, ADDRESSES.REGULAR_EXCHANGE);
    const ctfNegRisk = await ctf.isApprovedForAll(address, ADDRESSES.NEGRISK_EXCHANGE);

    console.log("\n📊 USDC 授权:");
    console.log("  常规交易所:", usdcRegular.gt(0) ? "✅ 已授权" : "❌ 未授权");
    console.log("  NegRisk 适配器:", usdcNegRiskAdapter.gt(0) ? "✅ 已授权" : "❌ 未授权");
    console.log("  NegRisk 交易所:", usdcNegRiskExchange.gt(0) ? "✅ 已授权" : "❌ 未授权");

    console.log("\n📊 CTF 授权:");
    console.log("  常规交易所:", ctfRegular ? "✅ 已授权" : "❌ 未授权");
    console.log("  NegRisk 交易所:", ctfNegRisk ? "✅ 已授权" : "❌ 未授权");

    const allApproved = usdcRegular.gt(0) && usdcNegRiskAdapter.gt(0) && usdcNegRiskExchange.gt(0) && ctfRegular && ctfNegRisk;

    if (allApproved) {
        console.log("\n" + "=".repeat(50));
        console.log("✅ 所有合约已授权! 可以开始交易了。");
        return;
    }

    console.log("\n" + "=".repeat(50));
    console.log("⚠️  需要授权合约，正在处理...\n");

    const maxUint = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    // 1. 授权 USDC 给常规交易所
    if (!usdcRegular.gt(0)) {
        console.log("1️⃣  授权 USDC 给常规交易所...");
        try {
            const tx = await usdc.approve(ADDRESSES.REGULAR_EXCHANGE, maxUint);
            await tx.wait();
            console.log("   ✅ 完成");
        } catch (e: any) {
            console.error("   ❌ 失败:", e.message);
        }
    }

    // 2. 授权 CTF 给常规交易所
    if (!ctfRegular) {
        console.log("2️⃣  授权 CTF 给常规交易所...");
        try {
            const tx = await ctf.setApprovalForAll(ADDRESSES.REGULAR_EXCHANGE, true);
            await tx.wait();
            console.log("   ✅ 完成");
        } catch (e: any) {
            console.error("   ❌ 失败:", e.message);
        }
    }

    // 3. 授权 USDC 给 NegRisk 适配器
    if (!usdcNegRiskAdapter.gt(0)) {
        console.log("3️⃣  授权 USDC 给 NegRisk 适配器...");
        try {
            const tx = await usdc.approve(ADDRESSES.NEGRISK_ADAPTER, maxUint);
            await tx.wait();
            console.log("   ✅ 完成");
        } catch (e: any) {
            console.error("   ❌ 失败:", e.message);
        }
    }

    // 4. 授权 USDC 给 NegRisk 交易所
    if (!usdcNegRiskExchange.gt(0)) {
        console.log("4️⃣  授权 USDC 给 NegRisk 交易所...");
        try {
            const tx = await usdc.approve(ADDRESSES.NEGRISK_EXCHANGE, maxUint);
            await tx.wait();
            console.log("   ✅ 完成");
        } catch (e: any) {
            console.error("   ❌ 失败:", e.message);
        }
    }

    // 5. 授权 CTF 给 NegRisk 交易所
    if (!ctfNegRisk) {
        console.log("5️⃣  授权 CTF 给 NegRisk 交易所...");
        try {
            const tx = await ctf.setApprovalForAll(ADDRESSES.NEGRISK_EXCHANGE, true);
            await tx.wait();
            console.log("   ✅ 完成");
        } catch (e: any) {
            console.error("   ❌ 失败:", e.message);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 合约授权完成! 现在可以开始交易了。");
}

main().catch(console.error);
