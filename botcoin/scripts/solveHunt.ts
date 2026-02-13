import axios from 'axios';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

async function solveHunt(huntId: number, answer: string) {
    console.log(`📝 提交答案: "${answer}"\n`);
    
    const fs = require('fs');
    const keys = JSON.parse(fs.readFileSync('./botcoin-keys.json', 'utf-8'));
    
    const transaction = {
        type: 'solve',
        huntId,
        answer: answer.toLowerCase().trim(),
        publicKey: keys.publicKey,
        timestamp: Date.now()
    };
    
    const message = JSON.stringify(transaction);
    const messageBytes = new TextEncoder().encode(message);
    const secretKeyBytes = decodeBase64(keys.secretKey);
    const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
    
    try {
        const response = await axios.post('https://botcoin.farm/api/hunts/solve', {
            transaction,
            signature: encodeBase64(signature)
        });
        
        console.log('✅ 答案正确!');
        console.log('结果:', JSON.stringify(response.data, null, 2));
        
    } catch (error: any) {
        console.error('❌ 答案错误:', error.message);
        if (error.response?.data) {
            console.error('服务器返回:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 尝试答案
const answer = process.argv[2] || 'heartbleed';
solveHunt(98, answer);
