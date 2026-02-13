import axios from 'axios';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const PUBLIC_KEY = 'ckKg2OrR/EEyUAgcyiHaGFYYMoae0Y2RSpr1tZsRj7M=';
const SECRET_KEY = '你的私钥'; // 需要从 botcoin-keys.json 读取

async function pickHunt(huntId: number) {
    console.log(`🎯 选择寻宝 #${huntId}...\n`);
    
    // 读取密钥
    const fs = require('fs');
    const keys = JSON.parse(fs.readFileSync('./botcoin-keys.json', 'utf-8'));
    
    const transaction = {
        type: 'pick',
        huntId,
        publicKey: keys.publicKey,
        timestamp: Date.now()
    };
    
    // 签名
    const message = JSON.stringify(transaction);
    const messageBytes = new TextEncoder().encode(message);
    const secretKeyBytes = decodeBase64(keys.secretKey);
    const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
    
    try {
        const response = await axios.post('https://botcoin.farm/api/hunts/pick', {
            transaction,
            signature: encodeBase64(signature)
        });
        
        console.log('✅ 已选择寻宝!');
        console.log('谜题:', response.data.poem || response.data);
        
    } catch (error: any) {
        console.error('❌ 选择失败:', error.message);
        if (error.response?.data) {
            console.error('服务器返回:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 选择最新的寻宝
pickHunt(98);
