export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
export type Suit = "s" | "h" | "d" | "c";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export const SUITS: Suit[] = ["s", "h", "d", "c"];

export const RANK_VALUES: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠", h: "♥", d: "♦", c: "♣",
};

export const RANK_NAMES: Record<number, string> = {
  14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "Ten",
  9: "Nine", 8: "Eight", 7: "Seven", 6: "Six", 5: "Five",
  4: "Four", 3: "Three", 2: "Two",
};

export function cardKey(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
