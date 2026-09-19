export interface ImpliedOddsResult {
  futureWinningsRequired: number;
  effectiveStackAvailable?: number;
  possible: boolean;
}

export function calculateImpliedOdds(
  pot: number,
  call: number,
  probability: number,
  effectiveStack?: number
): ImpliedOddsResult {
  if (probability <= 0 || call <= 0) {
    return { futureWinningsRequired: Infinity, ...(effectiveStack !== undefined ? { effectiveStackAvailable: effectiveStack } : {}), possible: false };
  }
  const totalRequired = call / probability;
  const futureWinningsRequired = Math.max(0, totalRequired - pot - call);
  const possible = effectiveStack !== undefined
    ? futureWinningsRequired <= effectiveStack
    : futureWinningsRequired < pot * 2;

  return { futureWinningsRequired, ...(effectiveStack !== undefined ? { effectiveStackAvailable: effectiveStack } : {}), possible };
}
