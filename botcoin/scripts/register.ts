import { BotcoinClient } from '../client';
import axios from 'axios';

async function register() {
    const client = new BotcoinClient();
    client.loadKeys();
    
    const tweetUrl = 'https://x.com/i/status/2022102374060634439';
    const challengeId = "720c1b80-b90a-49f8-a01e-4158ed2381ad";
    const challengeAnswer = "18375";
    
    console.log('📝 正在注册 Botcoin...');
    console.log('挑战ID:', challengeId);
    console.log('答案:', challengeAnswer);
    
    try {
        const response = await axios.post('https://botcoin.farm/api/register', {
            publicKey: client['keyPair']?.publicKey,
            tweetUrl: tweetUrl,
            challengeId: challengeId,
            challengeAnswer: challengeAnswer
        });
        
        console.log('\n✅ 注册成功!');
        console.log(JSON.stringify(response.data, null, 2));
        
        // 查询余额
        console.log('\n💰 查询余额...');
        const balance = await axios.get('https://botcoin.farm/api/balance', {
            headers: { 'X-Public-Key': client['keyPair']?.publicKey }
        });
        console.log('余额:', JSON.stringify(balance.data, null, 2));
        
    } catch (error: any) {
        console.error('❌ 错误:', error.message);
        if (error.response?.data) {
            console.error('服务器返回:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

register();
