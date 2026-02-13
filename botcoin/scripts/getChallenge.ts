import { BotcoinClient } from '../client';

async function getChallenge() {
    const client = new BotcoinClient();
    client.loadKeys();
    
    console.log('🔍 获取验证挑战...');
    const challenge = await client.getChallenge();
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 请在 X(Twitter) 发布以下推文:');
    console.log('='.repeat(60));
    console.log(challenge.tweetText);
    console.log('='.repeat(60));
    console.log('\n发布后把推文链接发给我，格式:');
    console.log('https://x.com/你的用户名/status/推文ID');
}

getChallenge().catch(console.error);
