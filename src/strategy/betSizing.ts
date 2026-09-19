export function suggestBetSizes(pot: number, fractions: number[]): number[] {
  return fractions.map((fraction) => {
    const boundedFraction = Math.min(2, Math.max(0, fraction));
    return Math.round((pot * boundedFraction) / 5) * 5;
  });
}