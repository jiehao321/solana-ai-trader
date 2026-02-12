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

if (!PRIVATE_KEY || !POLY_API_KEY || !POLY_SECRET || !POLY_PASSPHRASE) {
    console.error("❌ 错误: 请在 .env 文件中设置所有必需的环境变量");
    process.exit(1);
}

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const params: any = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace("--", "");
        const value = args[i + 1];
        params[key] = value;
    }
    
    return params;
}

async function main() {
    const args = parseArgs();
    
    const provider = new providers.JsonRpcProvider(POLYGON_RPC);
    const signer = new Wallet(PRIVATE_KEY, provider);
    const address = signer.address;

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

    // 取消特定订单
    if (args.order) {
        console.log("🗑️  取消订单:", args.order);
        try {
            await client.cancelOrder({ orderID: args.order });
            console.log("✅ 订单已取消");
        } catch (error: any) {
            console.error("❌ 取消失败:", error.message);
        }
        return;
    }

    // 取消所有订单
    if (args.all) {
        console.log("🗑️  取消所有订单...");
        try {
            await client.cancelAll();
            console.log("✅ 所有订单已取消");
        } catch (error: any) {
            console.error("❌ 取消失败:", error.message);
        }
        return;
    }

    // 显示帮助
    console.log("用法:");
    console.log("  bun run scripts/cancel-orders.ts --order ORDER_ID");
    console.log("  bun run scripts/cancel-orders.ts --all");
}

main();
