export interface PotOddsResult {
  ratio: number;
  requiredEquity: number;
}

export function calculatePotOdds(pot: number, call: number): PotOddsResult {
  if (call <= 0) return { ratio: Infinity, requiredEquity: 0 };
  return {
    ratio: pot / call,
    requiredEquity: call / (pot + call),
  };
}
