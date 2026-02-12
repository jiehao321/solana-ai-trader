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

    console.log("📦 当前持仓\n");

    try {
        const positions = await client.getPositions();
        
        if (!positions || positions.length === 0) {
            console.log("没有持仓");
            return;
        }

        console.log(`持有 ${positions.length} 个仓位:\n`);
        
        positions.forEach((pos: any, index: number) => {
            console.log(`${index + 1}. 代币: ${pos.tokenID || pos.asset}`);
            console.log(`   数量: ${pos.size || pos.balance}`);
            console.log("");
        });

    } catch (error: any) {
        console.error("❌ 获取持仓失败:", error.message);
    }
}

main();
