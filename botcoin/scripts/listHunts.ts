import axios from 'axios';

const PUBLIC_KEY = 'ckKg2OrR/EEyUAgcyiHaGFYYMoae0Y2RSpr1tZsRj7M=';

async function listHunts() {
    console.log('🔍 获取寻宝列表...\n');
    
    try {
        const response = await axios.get('https://botcoin.farm/api/hunts', {
            headers: { 'X-Public-Key': PUBLIC_KEY }
        });
        
        console.log('原始响应:', JSON.stringify(response.data, null, 2));
        
    } catch (error: any) {
        console.error('❌ 获取失败:', error.message);
        if (error.response?.data) {
            console.error('服务器返回:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

listHunts();
