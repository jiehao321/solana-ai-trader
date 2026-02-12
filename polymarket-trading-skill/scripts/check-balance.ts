import { ClobClient } from "@polymarket/clob-client";
import { Wallet, providers } from "ethers";
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
const CLOB_HOST = process.env.CLOB_HOST || "https://clob.polymarket.com";
const POLY_API_KEY = process.env.POLY_API_KEY;
const POLY_SECRET = process.env.POLY_SECRET;
const POLY_PASSPHRASE = process.env.POLY_PASSPHRASE;

if (!PRIVATE_KEY) {
    console.error("❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY");
    process.exit(1);
}

async function main() {
    const provider = new providers.JsonRpcProvider(POLYGON_RPC);
    const signer = new Wallet(PRIVATE_KEY, provider);
    const address = signer.address;

    console.log("💰 检查钱包余额\n");
    console.log("钱包地址:", address);
    console.log("Polymarket 资料:", `https://polymarket.com/profile/${address}`);
    console.log("\n" + "=".repeat(50));

    // 检查 MATIC 余额
    const maticBalance = await provider.getBalance(address);
    const maticFormatted = parseFloat(maticBalance.toString()) / 1e18;

    console.log("\n⛽ Gas 余额 (MATIC):");
    console.log("  余额:", maticFormatted.toFixed(4), "MATIC");

    if (maticFormatted < 0.01) {
        console.log("  ❌ MATIC 不足! 需要至少 0.01 MATIC 支付 gas");
    } else {
        console.log("  ✅ MATIC 充足");
    }

    // 如果有 API 凭证，检查 USDC 余额
    if (POLY_API_KEY && POLY_SECRET && POLY_PASSPHRASE) {
        try {
            const client = new ClobClient(
                CLOB_HOST,
                137,
                signer,
                {
                    key: POLY_API_KEY,
                    secret: POLY_SECRET,
                    passphrase: POLY_PASSPHRASE,
                },
                0,
                address
            );

            const balance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
            const usdcBalance = parseFloat(balance.balance) / 1000000;
            const usdcAllowance = parseFloat(balance.allowance) / 1000000;

            console.log("\n💵 交易余额 (USDC):");
            console.log("  余额:", usdcBalance.toFixed(2), "USDC");
            console.log("  授权额度:", usdcAllowance.toFixed(2), "USDC");

            if (usdcBalance < 5) {
                console.log("  ❌ USDC 不足! 建议至少 5 USDC 开始交易");
            } else {
                console.log("  ✅ USDC 充足");
            }

            if (usdcAllowance < usdcBalance) {
                console.log("  ⚠️  授权额度不足，需要运行 setup-allowances.ts");
            }

        } catch (error) {
            console.log("\n💵 交易余额 (USDC):");
            console.log("  ⚠️  无法获取余额，API 凭证可能无效");
            console.log("  请运行: bun run scripts/check-creds.ts");
        }
    } else {
        console.log("\n💵 交易余额 (USDC):");
        console.log("  ⚠️  未配置 API 凭证");
        console.log("  请运行: bun run scripts/check-creds.ts");
    }

    console.log("\n" + "=".repeat(50));
}

main();
