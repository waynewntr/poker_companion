import { Card } from "./cards";

export type GameMode = "cash" | "tournament";
export type Street = "preflop" | "flop" | "turn" | "river";
export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type PotType = "srp" | "3bet" | "4bet";

export interface PokerHand {
  gameMode: GameMode;
  heroCards: Card[];
  board: Card[];
  street: Street;
  pot: number;
  amountToCall: number;
  heroStack?: number;
  villainStack?: number;
  isAllIn: boolean;
}

export interface PreFlopContext {
  heroPosition?: Position;
  villainPosition?: Position;
  preflopAggressor?: "hero" | "villain";
  potType?: PotType;
  numPlayers: number;
}
