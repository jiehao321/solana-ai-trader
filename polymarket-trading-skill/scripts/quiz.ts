// Web3 知识测验
import * as readline from "readline";

interface Question {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
}

const questions: Question[] = [
    {
        question: "什么是 Gas？",
        options: [
            "一种加密货币",
            "执行操作的手续费",
            "区块链的燃料",
            "矿工的奖励"
        ],
        correct: 1,
        explanation: "Gas 是在以太坊网络上执行操作所需的手续费，支付给矿工/验证者。"
    },
    {
        question: "Polymarket 上的价格 0.75 意味着什么？",
        options: [
            "每个代币价值 $0.75",
            "市场认为事件有 75% 概率发生",
            "交易手续费是 0.75%",
            "最小交易金额是 $0.75"
        ],
        correct: 1,
        explanation: "Polymarket 的价格代表市场认为事件发生的概率，0.75 = 75% 概率。"
    },
    {
        question: "什么是无常损失？",
        options: [
            "钱包丢失私钥",
            "LP 提供流动性时因价格波动造成的损失",
            "交易失败的手续费",
            "智能合约被黑客攻击"
        ],
        correct: 1,
        explanation: "无常损失是 AMM 流动性提供者因代币价格相对变化而遭受的损失。"
    },
    {
        question: "凯利公式的目的是什么？",
        options: [
            "预测市场趋势",
            "计算最优仓位大小",
            "评估智能合约安全性",
            "选择交易对"
        ],
        correct: 1,
        explanation: "凯利公式用于计算给定胜率和盈亏比下的最优仓位比例，最大化长期收益。"
    },
    {
        question: "ERC-20 是什么？",
        options: [
            "一种区块链",
            "同质化代币标准",
            "NFT 标准",
            "钱包应用"
        ],
        correct: 1,
        explanation: "ERC-20 是以太坊上的同质化代币标准，USDC、UNI 等都遵循此标准。"
    },
    {
        question: "在 Polymarket 中，限价单和市价单的 size 参数有什么区别？",
        options: [
            "没有区别",
            "限价单是份额数量，市价单是美元金额",
            "限价单是美元金额，市价单是份额数量",
            "取决于市场"
        ],
        correct: 1,
        explanation: "限价单的 size 是份额数量，市价单的 size 是美元金额 - 这是常见的错误来源！"
    },
    {
        question: "什么是 Layer 2？",
        options: [
            "第二层区块链",
            "以太坊的扩容解决方案",
            "一种钱包类型",
            "交易所的备用服务器"
        ],
        correct: 1,
        explanation: "Layer 2 是构建在以太坊之上的扩容方案，如 Base、Arbitrum、Optimism，降低 gas 费提高速度。"
    },
    {
        question: "预测市场的价格如何反映信息？",
        options: [
            "由平台设定",
            "买卖双方博弈形成，反映群体智慧",
            "根据历史数据计算",
            "由专家决定"
        ],
        correct: 1,
        explanation: "预测市场价格由市场参与者买卖形成，聚合了众人的信息和判断。"
    }
];

function askQuestion(q: Question, index: number): Promise<boolean> {
    return new Promise((resolve) => {
        console.log(`\n问题 ${index + 1}/${questions.length}: ${q.question}\n`);
        q.options.forEach((opt, i) => {
            console.log(`  ${i + 1}. ${opt}`);
        });
        console.log("");

        // 模拟回答（实际使用需要用户输入）
        // 这里随机回答用于演示
        const randomAnswer = Math.floor(Math.random() * 4);
        const isCorrect = randomAnswer === q.correct;
        
        console.log(`选择: ${randomAnswer + 1}`);
        console.log(isCorrect ? "✅ 正确!" : "❌ 错误!");
        console.log(`\n💡 ${q.explanation}`);
        
        resolve(isCorrect);
    });
}

async function runQuiz() {
    console.log("=".repeat(60));
    console.log("🎓 Web3 & 预测市场知识测验");
    console.log("=".repeat(60));
    
    let score = 0;
    
    for (let i = 0; i < questions.length; i++) {
        const correct = await askQuestion(questions[i], i);
        if (correct) score++;
    }
    
    console.log("\n" + "=".repeat(60));
    console.log(`📊 测验完成! 得分: ${score}/${questions.length}`);
    
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) {
        console.log("🏆 优秀! 你对 Web3 很了解");
    } else if (percentage >= 60) {
        console.log("👍 不错! 继续学习");
    } else {
        console.log("📚 建议多学习 WEB3_LEARNING.md 的内容");
    }
    console.log("=".repeat(60));
}

runQuiz();
