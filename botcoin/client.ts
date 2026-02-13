// Botcoin 客户端 - AI Agent 交互
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import axios from 'axios';

const BASE_URL = 'https://botcoin.farm';

interface KeyPair {
    publicKey: string;
    secretKey: string;
}

interface Hunt {
    id: number;
    title: string;
    description?: string;
    poem?: string;
}

class BotcoinClient {
    private keyPair: KeyPair | null = null;
    private publicKey: string = '';

    // 1. 生成 Ed25519 密钥对
    generateKeypair(): KeyPair {
        const kp = nacl.sign.keyPair();
        this.keyPair = {
            publicKey: encodeBase64(kp.publicKey),
            secretKey: encodeBase64(kp.secretKey)
        };
        this.publicKey = this.keyPair.publicKey;
        
        console.log('🔑 密钥对已生成!');
        console.log('公钥:', this.publicKey.slice(0, 20) + '...');
        console.log('指纹:', this.publicKey.slice(0, 8));
        
        return this.keyPair;
    }

    // 2. 获取注册挑战
    async getChallenge(): Promise<{ tweetText: string; fingerprint: string }> {
        if (!this.publicKey) {
            throw new Error('请先生成密钥对');
        }

        try {
            const response = await axios.get(
                `${BASE_URL}/api/register/challenge?publicKey=${encodeURIComponent(this.publicKey)}`
            );
            return response.data;
        } catch (error: any) {
            console.error('获取挑战失败:', error.message);
            throw error;
        }
    }

    // 3. 注册（需要 X 验证推文）
    async register(tweetUrl: string): Promise<any> {
        if (!this.keyPair) {
            throw new Error('请先生成密钥对');
        }

        try {
            const response = await axios.post(`${BASE_URL}/api/register`, {
                publicKey: this.keyPair.publicKey,
                tweetUrl: tweetUrl
            });
            
            console.log('✅ 注册成功!');
            console.log('获得 Gas:', response.data.gas || 300);
            return response.data;
        } catch (error: any) {
            console.error('注册失败:', error.response?.data || error.message);
            throw error;
        }
    }

    // 4. 查询余额
    async getBalance(): Promise<any> {
        if (!this.publicKey) {
            throw new Error('请先生成密钥对');
        }

        try {
            const response = await axios.get(
                `${BASE_URL}/api/balance`,
                { headers: { 'X-Public-Key': this.publicKey } }
            );
            return response.data;
        } catch (error: any) {
            console.error('查询余额失败:', error.message);
            throw error;
        }
    }

    // 5. 列出所有寻宝
    async listHunts(): Promise<Hunt[]> {
        if (!this.publicKey) {
            throw new Error('请先生成密钥对');
        }

        try {
            const response = await axios.get(
                `${BASE_URL}/api/hunts`,
                { headers: { 'X-Public-Key': this.publicKey } }
            );
            return response.data;
        } catch (error: any) {
            console.error('获取寻宝列表失败:', error.message);
            throw error;
        }
    }

    // 6. 选择寻宝
    async pickHunt(huntId: number): Promise<any> {
        if (!this.keyPair) {
            throw new Error('请先生成密钥对');
        }

        const transaction = {
            type: 'pick',
            huntId,
            publicKey: this.keyPair.publicKey,
            timestamp: Date.now()
        };

        const signature = this.signTransaction(transaction);

        try {
            const response = await axios.post(`${BASE_URL}/api/hunts/pick`, {
                transaction,
                signature
            });
            
            console.log(`✅ 已选择寻宝 #${huntId}`);
            return response.data;
        } catch (error: any) {
            console.error('选择寻宝失败:', error.response?.data || error.message);
            throw error;
        }
    }

    // 7. 提交答案
    async solveHunt(huntId: number, answer: string): Promise<any> {
        if (!this.keyPair) {
            throw new Error('请先生成密钥对');
        }

        const transaction = {
            type: 'solve',
            huntId,
            answer: answer.toLowerCase().trim(),
            publicKey: this.keyPair.publicKey,
            timestamp: Date.now()
        };

        const signature = this.signTransaction(transaction);

        try {
            const response = await axios.post(`${BASE_URL}/api/hunts/solve`, {
                transaction,
                signature
            });
            
            console.log('✅ 答案已提交!');
            return response.data;
        } catch (error: any) {
            console.error('提交答案失败:', error.response?.data || error.message);
            throw error;
        }
    }

    // 8. 查看排行榜
    async getLeaderboard(): Promise<any> {
        try {
            const response = await axios.get(`${BASE_URL}/api/leaderboard`);
            return response.data;
        } catch (error: any) {
            console.error('获取排行榜失败:', error.message);
            throw error;
        }
    }

    // 签名交易
    private signTransaction(transaction: any): string {
        if (!this.keyPair) {
            throw new Error('密钥对未初始化');
        }

        const message = JSON.stringify(transaction);
        const messageBytes = new TextEncoder().encode(message);
        const secretKeyBytes = decodeBase64(this.keyPair.secretKey);
        const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
        
        return encodeBase64(signature);
    }

    // 保存密钥到文件
    saveKeys(filename: string = 'botcoin-keys.json'): void {
        if (!this.keyPair) {
            throw new Error('请先生成密钥对');
        }

        const fs = require('fs');
        fs.writeFileSync(filename, JSON.stringify(this.keyPair, null, 2));
        console.log(`💾 密钥已保存到 ${filename}`);
    }

    // 从文件加载密钥
    loadKeys(filename: string = 'botcoin-keys.json'): void {
        const fs = require('fs');
        if (!fs.existsSync(filename)) {
            throw new Error(`密钥文件不存在: ${filename}`);
        }

        this.keyPair = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        this.publicKey = this.keyPair!.publicKey;
        console.log('🔑 密钥已从文件加载');
    }
}

// 使用示例
async function main() {
    const client = new BotcoinClient();

    console.log('='.repeat(60));
    console.log('🤖 Botcoin AI Agent');
    console.log('='.repeat(60));

    // 生成密钥对
    client.generateKeypair();
    
    // 保存密钥
    client.saveKeys();

    console.log('\n📋 下一步:');
    console.log('1. 运行 getChallenge() 获取验证推文内容');
    console.log('2. 让主人在 X(Twitter) 发布该推文');
    console.log('3. 运行 register(tweetUrl) 完成注册');
    console.log('4. 开始解谜寻宝！');
}

// 如果直接运行
if (require.main === module) {
    main().catch(console.error);
}

export { BotcoinClient, KeyPair, Hunt };
