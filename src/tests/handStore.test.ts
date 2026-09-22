import { describe, it, expect, beforeEach } from "vitest";
import { useHandStore, convertAmount } from "@/state/handStore";

describe("handStore", () => {
  beforeEach(() => {
    // Reset store before each test
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { newHand } = useHandStore.getState();
    useHandStore.setState({
      slots: {
        hero1: null, hero2: null, hero3: null, hero4: null,
        flop1: null, flop2: null, flop3: null,
        turn: null, river: null,
      },
      pot: 0,
      amountToCall: 0,
      heroStack: undefined,
      villainStack: undefined,
      isAllIn: false,
      gameMode: "cash",
      gameType: "nlhe",
      heroPosition: undefined,
      villainPosition: undefined,
      villainArchetype: undefined,
      preflopAggressor: undefined,
      preflopAction: undefined,
      preflopActionSize: null,
      amountUnit: "R",
      potType: undefined,
      numPlayers: 2,
      activeSlot: "hero1",
    });
  });

  describe("state initialization", () => {
    it("initializes preflopAction as undefined", () => {
      const store = useHandStore.getState();
      expect(store.preflopAction).toBeUndefined();
    });

    it("initializes preflopActionSize as null", () => {
      const store = useHandStore.getState();
      expect(store.preflopActionSize).toBeNull();
    });

    it("initializes amountUnit as 'R'", () => {
      const store = useHandStore.getState();
      expect(store.amountUnit).toBe("R");
    });
  });

  describe("setPreflopAction", () => {
    it("sets preflopAction to OPEN_RAISE", () => {
      const { setPreflopAction } = useHandStore.getState();
      setPreflopAction("OPEN_RAISE");
      expect(useHandStore.getState().preflopAction).toBe("OPEN_RAISE");
    });

    it("sets preflopAction to THREE_BET", () => {
      const { setPreflopAction } = useHandStore.getState();
      setPreflopAction("THREE_BET");
      expect(useHandStore.getState().preflopAction).toBe("THREE_BET");
    });

    it("clears preflopAction when set to undefined", () => {
      const { setPreflopAction } = useHandStore.getState();
      setPreflopAction("OPEN_RAISE");
      setPreflopAction(undefined);
      expect(useHandStore.getState().preflopAction).toBeUndefined();
    });

    it("supports all valid action types", () => {
      const { setPreflopAction } = useHandStore.getState();
      const actions: Array<"OPEN_RAISE" | "LIMP" | "CALL_OPEN" | "THREE_BET" | "FOUR_BET" | "ISO_RAISE" | "SQUEEZE" | "FOLD"> = [
        "OPEN_RAISE", "LIMP", "CALL_OPEN", "THREE_BET", "FOUR_BET", "ISO_RAISE", "SQUEEZE", "FOLD"
      ];

      actions.forEach(action => {
        setPreflopAction(action);
        expect(useHandStore.getState().preflopAction).toBe(action);
      });
    });
  });

  describe("setPreflopActionSize", () => {
    it("sets preflopActionSize to a multiplier string", () => {
      const { setPreflopActionSize } = useHandStore.getState();
      setPreflopActionSize("3.5x BB");
      expect(useHandStore.getState().preflopActionSize).toBe("3.5x BB");
    });

    it("sets preflopActionSize to an 'x open' multiplier", () => {
      const { setPreflopActionSize } = useHandStore.getState();
      setPreflopActionSize("2.5x open");
      expect(useHandStore.getState().preflopActionSize).toBe("2.5x open");
    });

    it("sets preflopActionSize to an absolute amount", () => {
      const { setPreflopActionSize } = useHandStore.getState();
      setPreflopActionSize("50");
      expect(useHandStore.getState().preflopActionSize).toBe("50");
    });

    it("clears preflopActionSize when set to null", () => {
      const { setPreflopActionSize } = useHandStore.getState();
      setPreflopActionSize("3.5x BB");
      setPreflopActionSize(null);
      expect(useHandStore.getState().preflopActionSize).toBeNull();
    });
  });

  describe("setAmountUnit", () => {
    it("sets amountUnit to 'BB'", () => {
      const { setAmountUnit } = useHandStore.getState();
      setAmountUnit("BB");
      expect(useHandStore.getState().amountUnit).toBe("BB");
    });

    it("sets amountUnit back to 'R'", () => {
      const { setAmountUnit } = useHandStore.getState();
      setAmountUnit("BB");
      setAmountUnit("R");
      expect(useHandStore.getState().amountUnit).toBe("R");
    });

    it("toggles between 'R' and 'BB'", () => {
      const { setAmountUnit } = useHandStore.getState();
      let store = useHandStore.getState();
      expect(store.amountUnit).toBe("R");

      setAmountUnit("BB");
      store = useHandStore.getState();
      expect(store.amountUnit).toBe("BB");

      setAmountUnit("R");
      store = useHandStore.getState();
      expect(store.amountUnit).toBe("R");
    });
  });

  describe("newHand", () => {
    it("clears preflopAction and preflopActionSize", () => {
      const { setPreflopAction, setPreflopActionSize, newHand } = useHandStore.getState();
      setPreflopAction("OPEN_RAISE");
      setPreflopActionSize("3.5x BB");

      newHand();

      const store = useHandStore.getState();
      expect(store.preflopAction).toBeUndefined();
      expect(store.preflopActionSize).toBeNull();
    });

    it("preserves amountUnit across newHand calls", () => {
      const { setAmountUnit, newHand } = useHandStore.getState();
      setAmountUnit("BB");

      newHand();

      const store = useHandStore.getState();
      expect(store.amountUnit).toBe("BB");
    });

    it("clears slots and money", () => {
      const { setPot, setAmountToCall, newHand } = useHandStore.getState();
      setPot(100);
      setAmountToCall(25);

      newHand();

      const store = useHandStore.getState();
      expect(store.pot).toBe(0);
      expect(store.amountToCall).toBe(0);
      expect(store.slots.hero1).toBeNull();
    });

    it("retains position and villain settings", () => {
      const { setHeroPosition, setVillainPosition, setVillainArchetype, newHand } = useHandStore.getState();
      setHeroPosition("BTN");
      setVillainPosition("BB");
      setVillainArchetype("tight");

      newHand();

      const store = useHandStore.getState();
      expect(store.heroPosition).toBe("BTN");
      expect(store.villainPosition).toBe("BB");
      expect(store.villainArchetype).toBe("tight");
    });

    it("retains game settings", () => {
      const { setGameType, setGameMode, setNumPlayers, newHand } = useHandStore.getState();
      setGameType("plo");
      setGameMode("tournament");
      setNumPlayers(6);

      newHand();

      const store = useHandStore.getState();
      expect(store.gameType).toBe("plo");
      expect(store.gameMode).toBe("tournament");
      expect(store.numPlayers).toBe(6);
    });
  });

  describe("setGameType", () => {
    it("preserves preflopAction when switching game type", () => {
      const { setPreflopAction, setGameType } = useHandStore.getState();
      setPreflopAction("THREE_BET");

      setGameType("plo");

      const store = useHandStore.getState();
      expect(store.preflopAction).toBe("THREE_BET");
      expect(store.gameType).toBe("plo");
    });

    it("preserves preflopAction and amountUnit when switching from NLHE to PLO", () => {
      const { setPreflopAction, setAmountUnit, setGameType } = useHandStore.getState();
      setPreflopAction("OPEN_RAISE");
      setAmountUnit("BB");

      setGameType("plo");

      const store = useHandStore.getState();
      expect(store.preflopAction).toBe("OPEN_RAISE");
      expect(store.amountUnit).toBe("BB");
      expect(store.gameType).toBe("plo");
    });

    it("preserves preflopAction when switching from PLO to NLHE", () => {
      const { setGameType, setPreflopAction } = useHandStore.getState();
      setGameType("plo");
      setPreflopAction("FOUR_BET");

      setGameType("nlhe");

      const store = useHandStore.getState();
      expect(store.preflopAction).toBe("FOUR_BET");
      expect(store.gameType).toBe("nlhe");
    });

    it("clears slots and money but retains context", () => {
      const { setPot, setAmountToCall, setPreflopAction, setGameType } = useHandStore.getState();
      setPot(100);
      setAmountToCall(25);
      setPreflopAction("LIMP");

      setGameType("plo");

      const store = useHandStore.getState();
      expect(store.pot).toBe(0);
      expect(store.amountToCall).toBe(0);
      expect(store.preflopAction).toBe("LIMP");
    });
  });
});

describe("convertAmount", () => {
  it("returns the same value when converting from R to R", () => {
    const result = convertAmount(100, "R", "R", 50);
    expect(result).toBe(100);
  });

  it("returns the same value when converting from BB to BB", () => {
    const result = convertAmount(2, "BB", "BB", 50);
    expect(result).toBe(2);
  });

  it("converts from R to BB correctly", () => {
    const result = convertAmount(100, "R", "BB", 50);
    expect(result).toBe(2.0);
  });

  it("converts from BB to R correctly", () => {
    const result = convertAmount(2, "BB", "R", 50);
    expect(result).toBe(100);
  });

  it("round-trips without precision loss (R → BB → R)", () => {
    const original = 100;
    const bigBlind = 50;

    const toMM = convertAmount(original, "R", "BB", bigBlind);
    const back = convertAmount(toMM, "BB", "R", bigBlind);

    expect(back).toBe(original);
  });

  it("round-trips without precision loss (BB → R → BB)", () => {
    const original = 2;
    const bigBlind = 50;

    const toR = convertAmount(original, "BB", "R", bigBlind);
    const back = convertAmount(toR, "R", "BB", bigBlind);

    expect(back).toBe(original);
  });

  it("rounds to 2 decimal places when converting R to BB", () => {
    const result = convertAmount(123.456, "R", "BB", 50);
    expect(result).toBe(2.47);
  });

  it("rounds to 2 decimal places when converting BB to R", () => {
    const result = convertAmount(2.468, "BB", "R", 50);
    expect(result).toBe(123.4);
  });

  it("handles fractional big blind amounts", () => {
    const result = convertAmount(100, "R", "BB", 25.5);
    expect(result).toBe(Math.round((100 / 25.5) * 100) / 100);
  });

  it("handles very small amounts", () => {
    const result = convertAmount(0.5, "R", "BB", 50);
    expect(result).toBe(0.01);
  });

  it("handles zero amount", () => {
    const result = convertAmount(0, "R", "BB", 50);
    expect(result).toBe(0);
  });
});
