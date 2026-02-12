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

if (!PRIVATE_KEY) {
    console.error("❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY");
    process.exit(1);
}

async function main() {
    console.log("🔑 正在生成 Polymarket API 凭证...\n");

    const provider = new providers.JsonRpcProvider(POLYGON_RPC);
    const signer = new Wallet(PRIVATE_KEY, provider);
    const address = signer.address;

    console.log("钱包地址:", address);
    console.log("\n" + "=".repeat(50));

    // 创建无凭证的客户端来生成 API key
    const client = new ClobClient(CLOB_HOST, 137, signer);

    try {
        // 生成或获取 API 凭证
        const creds = await client.createOrDeriveApiKey();

        console.log("✅ API 凭证生成成功!\n");
        console.log("API Key:", creds.apiKey);
        console.log("Secret:", creds.secret);
        console.log("Passphrase:", creds.passphrase);

        console.log("\n" + "=".repeat(50));
        console.log("⚠️  重要: 将这些凭证添加到 .env 文件中:\n");
        console.log(`POLY_API_KEY=${creds.apiKey}`);
        console.log(`POLY_SECRET=${creds.secret}`);
        console.log(`POLY_PASSPHRASE=${creds.passphrase}`);

        // 更新 .env 文件
        const envPath = path.join(__dirname, "..", ".env");
        let envContent = "";
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, "utf-8");
        }

        // 替换或添加凭证
        const lines = envContent.split("\n");
        const newLines = lines.filter(line => 
            !line.startsWith("POLY_API_KEY=") && 
            !line.startsWith("POLY_SECRET=") && 
            !line.startsWith("POLY_PASSPHRASE=")
        );
        newLines.push(`POLY_API_KEY=${creds.apiKey}`);
        newLines.push(`POLY_SECRET=${creds.secret}`);
        newLines.push(`POLY_PASSPHRASE=${creds.passphrase}`);

        fs.writeFileSync(envPath, newLines.join("\n"));
        console.log("\n✅ 凭证已自动保存到 .env 文件");

        // 测试凭证
        console.log("\n🧪 正在测试凭证...");
        const testClient = new ClobClient(
            CLOB_HOST,
            137,
            signer,
            {
                key: creds.apiKey,
                secret: creds.secret,
                passphrase: creds.passphrase,
            },
            0,
            address
        );

        const balance = await testClient.getBalanceAllowance({ asset_type: "COLLATERAL" });
        console.log("✅ 凭证测试成功!");
        console.log("USDC 余额:", (parseFloat(balance.balance) / 1000000).toFixed(2), "USDC");

    } catch (error) {
        console.error("❌ 生成凭证失败:", error.message);
        process.exit(1);
    }
}

main();
