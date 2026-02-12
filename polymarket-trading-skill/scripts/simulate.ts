// 模拟交易系统 - 不用真钱练习
import * as fs from "fs";
import * as path from "path";

const SIMULATION_FILE = path.join(__dirname, "..", "simulation.json");

// 初始资金
const INITIAL_BALANCE = 10000;

interface Position {
    id: string;
    tokenID: string;
    marketName: string;
    side: "YES" | "NO";
    entryPrice: number;
    size: number; // 份额数量
    entryTime: string;
    stopLoss?: number;
    takeProfit?: number;
}

interface Trade {
    id: string;
    tokenID: string;
    marketName: string;
    side: "YES" | "NO";
    type: "BUY" | "SELL";
    price: number;
    size: number;
    pnl: number;
    time: string;
    reason: string;
}

interface SimulationData {
    balance: number;
    positions: Position[];
    trades: Trade[];
    startDate: string;
}

// 加载模拟数据
function loadSimulation(): SimulationData {
    if (fs.existsSync(SIMULATION_FILE)) {
        return JSON.parse(fs.readFileSync(SIMULATION_FILE, "utf-8"));
    }
    return {
        balance: INITIAL_BALANCE,
        positions: [],
        trades: [],
        startDate: new Date().toISOString()
    };
}

// 保存模拟数据
function saveSimulation(data: SimulationData) {
    fs.writeFileSync(SIMULATION_FILE, JSON.stringify(data, null, 2));
}

// 生成唯一ID
function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

// 显示账户状态
function showStatus(data: SimulationData) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 模拟交易账户\n");
    console.log("初始资金: $", INITIAL_BALANCE.toFixed(2));
    console.log("当前余额: $", data.balance.toFixed(2));
    
    const totalPnl = data.trades.reduce((sum, t) => sum + t.pnl, 0);
    const unrealizedPnl = data.positions.reduce((sum, p) => {
        // 这里简化计算，实际需要获取当前价格
        return sum + (0.5 - p.entryPrice) * p.size * (p.side === "YES" ? 1 : -1);
    }, 0);
    
    console.log("总盈亏: $", totalPnl.toFixed(2), totalPnl >= 0 ? "🟢" : "🔴");
    console.log("未实现盈亏: $", unrealizedPnl.toFixed(2));
    console.log("胜率:", calculateWinRate(data.trades), "%");
    console.log("交易次数:", data.trades.length);
    console.log("持仓数量:", data.positions.length);
    
    if (data.positions.length > 0) {
        console.log("\n📦 当前持仓:");
        data.positions.forEach((pos, i) => {
            console.log(`  ${i + 1}. ${pos.marketName} ${pos.side} @ $${pos.entryPrice} x ${pos.size}`);
        });
    }
    
    console.log("=".repeat(60));
}

// 计算胜率
function calculateWinRate(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => t.pnl > 0).length;
    return Math.round((wins / trades.length) * 100);
}

// 模拟买入
function simulateBuy(data: SimulationData, marketName: string, tokenID: string, side: "YES" | "NO", price: number, size: number, reason: string) {
    const cost = price * size;
    
    if (cost > data.balance) {
        console.log("❌ 余额不足! 需要 $", cost.toFixed(2), "，当前 $", data.balance.toFixed(2));
        return false;
    }
    
    // 检查是否已有该仓位
    const existingPos = data.positions.find(p => p.tokenID === tokenID);
    if (existingPos) {
        console.log("⚠️  已有该市场持仓，请先平仓");
        return false;
    }
    
    // 创建仓位
    const position: Position = {
        id: generateId(),
        tokenID,
        marketName,
        side,
        entryPrice: price,
        size,
        entryTime: new Date().toISOString()
    };
    
    data.positions.push(position);
    data.balance -= cost;
    
    // 记录交易
    data.trades.push({
        id: generateId(),
        tokenID,
        marketName,
        side,
        type: "BUY",
        price,
        size,
        pnl: 0,
        time: new Date().toISOString(),
        reason
    });
    
    console.log(`✅ 买入成功: ${marketName} ${side} @ $${price} x ${size}`);
    console.log(`   花费: $${cost.toFixed(2)}`);
    console.log(`   理由: ${reason}`);
    
    return true;
}

// 模拟卖出/平仓
function simulateSell(data: SimulationData, positionId: string, exitPrice: number, reason: string) {
    const posIndex = data.positions.findIndex(p => p.id === positionId);
    if (posIndex === -1) {
        console.log("❌ 未找到该仓位");
        return false;
    }
    
    const pos = data.positions[posIndex];
    
    // 计算盈亏
    let pnl = 0;
    if (pos.side === "YES") {
        pnl = (exitPrice - pos.entryPrice) * pos.size;
    } else {
        pnl = (pos.entryPrice - exitPrice) * pos.size;
    }
    
    const exitValue = exitPrice * pos.size;
    data.balance += exitValue;
    
    // 记录交易
    data.trades.push({
        id: generateId(),
        tokenID: pos.tokenID,
        marketName: pos.marketName,
        side: pos.side,
        type: "SELL",
        price: exitPrice,
        size: pos.size,
        pnl,
        time: new Date().toISOString(),
        reason
    });
    
    // 移除仓位
    data.positions.splice(posIndex, 1);
    
    console.log(`✅ 卖出成功: ${pos.marketName} ${pos.side} @ $${exitPrice}`);
    console.log(`   获得: $${exitValue.toFixed(2)}`);
    console.log(`   盈亏: $${pnl.toFixed(2)} ${pnl >= 0 ? "🟢" : "🔴"}`);
    console.log(`   理由: ${reason}`);
    
    return true;
}

// 显示交易历史
function showTrades(data: SimulationData) {
    console.log("\n📜 交易历史\n");
    
    if (data.trades.length === 0) {
        console.log("暂无交易记录");
        return;
    }
    
    data.trades.forEach((trade, i) => {
        const pnlStr = trade.type === "SELL" ? ` | 盈亏: $${trade.pnl.toFixed(2)}` : "";
        console.log(`${i + 1}. [${trade.type}] ${trade.marketName} ${trade.side} @ $${trade.price} x ${trade.size}${pnlStr}`);
        console.log(`   时间: ${new Date(trade.time).toLocaleString()}`);
        console.log(`   理由: ${trade.reason}`);
        console.log("");
    });
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const data = loadSimulation();
    
    switch (command) {
        case "status":
            showStatus(data);
            break;
            
        case "buy":
            // bun run simulate.ts buy "市场名称" TOKEN_ID YES/NO 价格 数量 "理由"
            if (args.length < 6) {
                console.log("用法: bun run simulate.ts buy \"市场名称\" TOKEN_ID YES/NO 价格 数量 \"理由\"");
                break;
            }
            simulateBuy(data, args[1], args[2], args[3] as "YES" | "NO", parseFloat(args[4]), parseFloat(args[5]), args[6] || "");
            break;
            
        case "sell":
            // bun run simulate.ts sell 仓位ID 价格 "理由"
            if (args.length < 4) {
                console.log("用法: bun run simulate.ts sell 仓位ID 价格 \"理由\"");
                console.log("先用 'bun run simulate.ts status' 查看仓位ID");
                break;
            }
            simulateSell(data, args[1], parseFloat(args[2]), args[3] || "");
            break;
            
        case "history":
            showTrades(data);
            break;
            
        case "reset":
            console.log("🗑️  重置模拟账户...");
            const newData: SimulationData = {
                balance: INITIAL_BALANCE,
                positions: [],
                trades: [],
                startDate: new Date().toISOString()
            };
            saveSimulation(newData);
            console.log("✅ 账户已重置为 $", INITIAL_BALANCE);
            break;
            
        default:
            console.log("Polymarket 模拟交易系统\n");
            console.log("命令:");
            console.log("  status                    - 查看账户状态");
            console.log("  buy 市场 TOKEN 方向 价格 数量 理由  - 买入");
            console.log("  sell 仓位ID 价格 理由     - 卖出");
            console.log("  history                   - 查看交易历史");
            console.log("  reset                     - 重置账户");
            console.log("\n示例:");
            console.log('  bun run simulate.ts buy "Trump 2024" 12345 YES 0.55 100 "民调领先"');
            console.log('  bun run simulate.ts sell abc123 0.60 "达到目标价"');
    }
    
    saveSimulation(data);
}

main();
