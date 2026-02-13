// 实盘数据获取 - 接入真实交易所 API
import axios from 'axios';

interface PriceData {
    symbol: string;
    price: number;
    timestamp: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    change24h: number;
}

// Binance API (免费，无需认证)
export class BinanceDataFeed {
    private baseUrl = 'https://api.binance.com';
    
    // 获取实时价格
    async getPrice(symbol: string): Promise<PriceData> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`
            );
            
            const data = response.data;
            return {
                symbol: data.symbol,
                price: parseFloat(data.lastPrice),
                timestamp: Date.now(),
                volume24h: parseFloat(data.volume),
                high24h: parseFloat(data.highPrice),
                low24h: parseFloat(data.lowPrice),
                change24h: parseFloat(data.priceChangePercent)
            };
        } catch (error: any) {
            console.error(`获取 ${symbol} 价格失败:`, error.message);
            throw error;
        }
    }
    
    // 获取历史K线数据
    async getKlines(
        symbol: string,
        interval: string = '1h',
        limit: number = 100
    ): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v3/klines`,
                {
                    params: {
                        symbol,
                        interval,
                        limit
                    }
                }
            );
            
            return response.data.map((k: any[]) => ({
                timestamp: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));
        } catch (error: any) {
            console.error(`获取 ${symbol} K线失败:`, error.message);
            throw error;
        }
    }
    
    // 获取所有交易对
    async getSymbols(): Promise<string[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/exchangeInfo`);
            return response.data.symbols
                .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
                .map((s: any) => s.symbol)
                .slice(0, 100);
        } catch (error: any) {
            console.error('获取交易对失败:', error.message);
            throw error;
        }
    }
}

// CoinGecko API (备用)
export class CoinGeckoFeed {
    private baseUrl = 'https://api.coingecko.com/api/v3';
    
    async getPrice(coinId: string): Promise<PriceData> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/coins/${coinId}`,
                {
                    params: {
                        localization: false,
                        tickers: false,
                        market_data: true,
                        community_data: false,
                        developer_data: false
                    }
                }
            );
            
            const data = response.data.market_data;
            return {
                symbol: response.data.symbol.toUpperCase(),
                price: data.current_price.usd,
                timestamp: Date.now(),
                volume24h: data.total_volume.usd,
                high24h: data.high_24h.usd,
                low24h: data.low_24h.usd,
                change24h: data.price_change_percentage_24h
            };
        } catch (error: any) {
            console.error(`获取 ${coinId} 价格失败:`, error.message);
            throw error;
        }
    }
}

// 测试数据获取
async function testDataFeed() {
    console.log('📊 测试实盘数据获取...\n');
    
    const binance = new BinanceDataFeed();
    
    // 获取 BTC 价格
    console.log('1. 获取 BTC/USDT 实时价格:');
    const btcPrice = await binance.getPrice('BTCUSDT');
    console.log(`   价格: $${btcPrice.price.toLocaleString()}`);
    console.log(`   24h变化: ${btcPrice.change24h.toFixed(2)}%`);
    console.log(`   24h成交量: ${(btcPrice.volume24h * btcPrice.price / 1e9).toFixed(2)}B\n`);
    
    // 获取历史数据
    console.log('2. 获取 BTC/USDT 历史K线 (最近10条):');
    const klines = await binance.getKlines('BTCUSDT', '1h', 10);
    klines.forEach((k, i) => {
        const date = new Date(k.timestamp).toLocaleString();
        console.log(`   ${date}: O:${k.open.toFixed(0)} H:${k.high.toFixed(0)} L:${k.low.toFixed(0)} C:${k.close.toFixed(0)}`);
    });
    
    // 获取交易对列表
    console.log('\n3. 获取热门交易对:');
    const symbols = await binance.getSymbols();
    console.log(`   找到 ${symbols.length} 个交易对`);
    console.log(`   前10个: ${symbols.slice(0, 10).join(', ')}`);
}

if (require.main === module) {
    testDataFeed().catch(console.error);
}

export { PriceData };
