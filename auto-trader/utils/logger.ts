// 简化版日志
export const logger = {
    info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
};

export function logTrade(action: string, details: any) {
    console.log(`[TRADE:${action}]`, JSON.stringify(details));
}

export function logStrategy(strategy: string, message: string) {
    console.log(`[STRATEGY:${strategy}] ${message}`);
}

export function logError(context: string, error: any) {
    console.error(`[ERROR:${context}]`, error.message || error);
}
