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

async function main() {
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

    console.log("📋 活跃订单\n");

    try {
        const orders = await client.getOpenOrders();
        
        if (orders.length === 0) {
            console.log("没有活跃订单");
            return;
        }

        console.log(`找到 ${orders.length} 个活跃订单:\n`);
        
        orders.forEach((order: any, index: number) => {
            console.log(`${index + 1}. 订单 ID: ${order.id}`);
            console.log(`   代币: ${order.tokenID}`);
            console.log(`   方向: ${order.side}`);
            console.log(`   价格: ${order.price}`);
            console.log(`   数量: ${order.size}`);
            console.log(`   类型: ${order.type}`);
            console.log("");
        });

    } catch (error: any) {
        console.error("❌ 获取订单失败:", error.message);
    }
}

main();
