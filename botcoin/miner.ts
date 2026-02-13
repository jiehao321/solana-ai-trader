// Botcoin 自动挖矿机器人
import axios from 'axios';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import * as fs from 'fs';

const BASE_URL = 'https://botcoin.farm';
const PUBLIC_KEY = 'ckKg2OrR/EEyUAgcyiHaGFYYMoae0Y2RSpr1tZsRj7M=';

// 可能的答案列表
const POSSIBLE_ANSWERS = [
    // 网络安全事件
    'solarwinds', 'heartbleed', 'notpetya', 'stuxnet', 'wannacry',
    'equifax', 'target', 'sony', 'colonial', 'nordstream',
    
    // 技术/公司
    'kaspersky', 'telegram', 'vpnfilter', 'industroyer', 'blackenergy',
    'badrabbit', 'petya', 'eternalblue', 'doubledragon', 'darkhotel',
    
    // 概念
    'backdoor', 'rootkit', 'keylogger', 'phishing', 'ddos',
    'zeroday', 'malware', 'ransomware', 'trojan', 'worm',
    
    // 密码学
    'rsa', 'sha256', 'enigma', 'caesar', 'vigenere',
    'aes', 'des', 'md5', 'bcrypt', 'scrypt',
    
    // 人物
    'turing', 'snowden', 'assange', 'nakamoto', 'rivest',
    'shamir', 'adleman', 'diffie', 'hellman', 'merkle'
];

class BotcoinMiner {
    private keys: any;
    private attemptedAnswers: Map<number, string[]> = new Map();
    private lockouts: Map<number, number> = new Map();

    constructor() {
        this.keys = JSON.parse(fs.readFileSync('./botcoin-keys.json', 'utf-8'));
    }

    // 获取所有可用寻宝
    async getAvailableHunts(): Promise<any[]> {
        try {
            const response = await axios.get(`${BASE_URL}/api/hunts`, {
                headers: { 'X-Public-Key': PUBLIC_KEY }
            });
            
            // 过滤掉已被认领和正在锁定的
            return response.data.hunts.filter((hunt: any) => {
                if (hunt.claimed_by) return false;
                const lockoutTime = this.lockouts.get(hunt.id);
                if (lockoutTime && Date.now() < lockoutTime) return false;
                return true;
            });
        } catch (error) {
            console.error('获取寻宝列表失败:', error);
            return [];
        }
    }

    // 选择寻宝
    async pickHunt(huntId: number): Promise<any> {
        const transaction = {
            type: 'pick',
            huntId,
            publicKey: this.keys.publicKey,
            timestamp: Date.now()
        };

        const signature = this.sign(transaction);

        try {
            const response = await axios.post(`${BASE_URL}/api/hunts/pick`, {
                transaction,
                signature
            });
            
            console.log(`✅ 已选择寻宝 #${huntId}`);
            console.log('谜题:', response.data.poem || '无谜题');
            return response.data;
            
        } catch (error: any) {
            console.error('选择失败:', error.response?.data || error.message);
            return null;
        }
    }

    // 尝试答案
    async tryAnswer(huntId: number, answer: string): Promise<{ success: boolean; locked?: boolean; attempts?: number }> {
        // 记录已尝试的答案
        if (!this.attemptedAnswers.has(huntId)) {
            this.attemptedAnswers.set(huntId, []);
        }
        this.attemptedAnswers.get(huntId)!.push(answer);

        const transaction = {
            type: 'solve',
            huntId,
            answer: answer.toLowerCase().trim(),
            publicKey: this.keys.publicKey,
            timestamp: Date.now()
        };

        const signature = this.sign(transaction);

        try {
            const response = await axios.post(`${BASE_URL}/api/hunts/solve`, {
                transaction,
                signature
            });
            
            console.log(`🎉 答案正确! 寻宝 #${huntId} 完成!`);
            console.log('奖励:', response.data);
            return { success: true };
            
        } catch (error: any) {
            const data = error.response?.data;
            
            if (data?.error === 'Locked out') {
                const lockedUntil = new Date(data.lockedUntil);
                this.lockouts.set(huntId, lockedUntil.getTime());
                console.log(`⏰ 寻宝 #${huntId} 被锁定直到 ${lockedUntil.toLocaleString()}`);
                return { success: false, locked: true };
            }
            
            if (data?.attempts) {
                console.log(`❌ 答案错误 (尝试 ${data.attempts}/3): ${answer}`);
                return { success: false, attempts: data.attempts };
            }
            
            return { success: false };
        }
    }

    // 智能解谜
    async solvePuzzle(huntId: number, poem: string): Promise<boolean> {
        console.log(`\n🧩 解谜寻宝 #${huntId}`);
        console.log('谜题:', poem);
        
        // 从谜题中提取关键词
        const keywords = this.extractKeywords(poem);
        console.log('提取关键词:', keywords);
        
        // 优先尝试与关键词相关的答案
        const prioritizedAnswers = this.prioritizeAnswers(keywords);
        
        for (const answer of prioritizedAnswers) {
            // 检查是否已经尝试过
            const attempted = this.attemptedAnswers.get(huntId) || [];
            if (attempted.includes(answer)) continue;
            
            console.log(`\n💡 尝试: ${answer}`);
            const result = await this.tryAnswer(huntId, answer);
            
            if (result.success) return true;
            if (result.locked) return false;
            
            // 等待一下避免请求过快
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`\n😔 寻宝 #${huntId} 未能解开`);
        return false;
    }

    // 提取关键词
    private extractKeywords(poem: string): string[] {
        const keywords: string[] = [];
        const lower = poem.toLowerCase();
        
        // 技术词汇
        if (lower.includes('pipeline')) keywords.push('pipeline', 'colonial', 'nordstream');
        if (lower.includes('heart')) keywords.push('heartbleed', 'heart');
        if (lower.includes('sun') || lower.includes('solar')) keywords.push('solarwinds', 'sun');
        if (lower.includes('worm') || lower.includes('crawl')) keywords.push('worm', 'stuxnet');
        if (lower.includes('lock')) keywords.push('ransomware', 'lock');
        if (lower.includes('key')) keywords.push('keylogger', 'encryption');
        if (lower.includes('door') || lower.includes('gate')) keywords.push('backdoor');
        if (lower.includes('poison')) keywords.push('malware', 'virus');
        if (lower.includes('frozen') || lower.includes('cold')) keywords.push('cold', 'freeze');
        if (lower.includes('russia') || lower.includes('moscow')) keywords.push('kaspersky', 'telegram');
        
        return keywords;
    }

    // 根据关键词优先排序答案
    private prioritizeAnswers(keywords: string[]): string[] {
        const prioritized: string[] = [];
        
        // 先添加与关键词匹配的
        for (const keyword of keywords) {
            for (const answer of POSSIBLE_ANSWERS) {
                if (answer.includes(keyword) || keyword.includes(answer)) {
                    if (!prioritized.includes(answer)) {
                        prioritized.push(answer);
                    }
                }
            }
        }
        
        // 添加剩余答案
        for (const answer of POSSIBLE_ANSWERS) {
            if (!prioritized.includes(answer)) {
                prioritized.push(answer);
            }
        }
        
        return prioritized;
    }

    // 签名交易
    private sign(transaction: any): string {
        const message = JSON.stringify(transaction);
        const messageBytes = new TextEncoder().encode(message);
        const secretKeyBytes = decodeBase64(this.keys.secretKey);
        const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
        return encodeBase64(signature);
    }

    // 主挖矿循环
    async startMining(): Promise<void> {
        console.log('='.repeat(60));
        console.log('⛏️  Botcoin 自动挖矿启动');
        console.log('='.repeat(60));
        console.log(`公钥: ${PUBLIC_KEY.slice(0, 20)}...`);
        console.log(`答案库: ${POSSIBLE_ANSWERS.length} 个候选`);
        console.log('='.repeat(60) + '\n');

        while (true) {
            try {
                // 获取可用寻宝
                const hunts = await this.getAvailableHunts();
                console.log(`\n📋 发现 ${hunts.length} 个可用寻宝`);

                if (hunts.length === 0) {
                    console.log('⏳ 没有可用寻宝，1小时后重试...');
                    await new Promise(r => setTimeout(r, 3600000));
                    continue;
                }

                // 尝试最新的寻宝
                for (const hunt of hunts.slice(0, 3)) {
                    console.log(`\n🎯 尝试寻宝 #${hunt.id}: ${hunt.name}`);
                    
                    // 选择寻宝
                    const picked = await this.pickHunt(hunt.id);
                    if (!picked || !picked.poem) {
                        console.log('无法获取谜题，跳过');
                        continue;
                    }

                    // 解谜
                    const solved = await this.solvePuzzle(hunt.id, picked.poem);
                    
                    if (solved) {
                        console.log('🎉 挖矿成功！');
                        // 查询余额
                        await this.checkBalance();
                    }
                    
                    // 等待一下再试下一个
                    await new Promise(r => setTimeout(r, 5000));
                }

                // 等待一段时间后继续
                console.log('\n⏳ 本轮完成，30分钟后继续...');
                await new Promise(r => setTimeout(r, 1800000));
                
            } catch (error) {
                console.error('挖矿循环错误:', error);
                await new Promise(r => setTimeout(r, 60000));
            }
        }
    }

    // 查询余额
    async checkBalance(): Promise<void> {
        try {
            const response = await axios.get(`${BASE_URL}/api/balance`, {
                headers: { 'X-Public-Key': PUBLIC_KEY }
            });
            console.log('\n💰 当前余额:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.error('查询余额失败:', error);
        }
    }
}

// 运行
const miner = new BotcoinMiner();
miner.startMining();
