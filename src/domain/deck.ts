import { Card, RANKS, SUITS } from "./cards";

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function removeCards(deck: Card[], used: Card[]): Card[] {
  const usedKeys = new Set(used.map(c => `${c.rank}${c.suit}`));
  return deck.filter(c => !usedKeys.has(`${c.rank}${c.suit}`));
}

export function hasNoDuplicates(cards: Card[]): boolean {
  const seen = new Set<string>();
  for (const c of cards) {
    const k = `${c.rank}${c.suit}`;
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ];
}
