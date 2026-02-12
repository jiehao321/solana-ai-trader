import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
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
    
    if (!args.token || !args.price || !args.size) {
        console.log("用法:");
        console.log("  bun run scripts/sell.ts --token TOKEN_ID --price 0.50 --size 100 --type limit");
        console.log("  bun run scripts/sell.ts --token TOKEN_ID --price 0.50 --size 100 --type market");
        console.log("\n参数:");
        console.log("  --token    代币 ID (必需)");
        console.log("  --price    价格 (0-1 之间, 必需)");
        console.log("  --size     数量 (必需)");
        console.log("  --type     订单类型: limit 或 market (默认: limit)");
        process.exit(1);
    }

    const tokenID = args.token;
    const price = parseFloat(args.price);
    const size = parseFloat(args.size);
    const orderType = args.type || "limit";

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

    console.log("📉 卖出订单\n");
    console.log("代币:", tokenID);
    console.log("价格:", price);
    console.log("数量:", size);
    console.log("类型:", orderType.toUpperCase());
    console.log("\n" + "=".repeat(50));

    try {
        // 获取当前订单簿价格
        const askRes = await fetch(`${CLOB_HOST}/price?side=SELL&token_id=${tokenID}`);
        const bidRes = await fetch(`${CLOB_HOST}/price?side=BUY&token_id=${tokenID}`);
        const midRes = await fetch(`${CLOB_HOST}/midpoint?token_id=${tokenID}`);
        
        const ask = await askRes.json();
        const bid = await bidRes.json();
        const mid = await midRes.json();

        console.log("\n📊 当前市场:");
        console.log("  ASK (卖出价):", ask.price || "N/A");
        console.log("  BID (买入价):", bid.price || "N/A");
        console.log("  Midpoint:", mid.mid || "N/A");

        if (orderType === "market") {
            console.log("\n🚀 执行市价单...");
            const order = await client.createMarketOrder({
                side: Side.SELL,
                tokenID,
                amount: size,
                price,
            });
            
            const response = await client.postOrder(order, OrderType.FOK);
            console.log("✅ 市价单已执行!");
            console.log("订单 ID:", response.orderID);
            console.log("获得:", size, "USDC");
            
        } else {
            console.log("\n📝 提交限价单...");
            const order = await client.createAndPostOrder({
                tokenID,
                price,
                size,
                side: Side.SELL,
            });
            
            console.log("✅ 限价单已提交!");
            console.log("订单 ID:", order.orderID);
            console.log("预计获得:", (size * price).toFixed(2), "USDC");
        }

    } catch (error: any) {
        console.error("\n❌ 交易失败:", error.message);
        process.exit(1);
    }
}

main();
