// 计算挑战答案
const challenge = "((6566844 * 4383) + 36783) mod 54651";

console.log('🧮 解数学题:', challenge);

// 分步计算
const step1 = 6566844 * 4383;
console.log(`6566844 * 4383 = ${step1.toLocaleString()}`);

const step2 = step1 + 36783;
console.log(`${step1} + 36783 = ${step2.toLocaleString()}`);

const answer = step2 % 54651;
console.log(`${step2} mod 54651 = ${answer}`);

console.log('\n✅ 答案:', answer);
