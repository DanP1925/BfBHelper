import { describe, expect, it } from "vitest";
import type { Hero } from "../draft/types";
import { BIT_STARTING_HP, HERO_HP_CEILING, TOWER_STARTING_HP } from "./constants";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../../data/mapSpaces";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";
import { battleReducer, createInitialBattleState } from "./reducer";
import type { BattleState } from "./types";

const HERO_A: Hero = {
  id: "baldwin",
  name: "Baldwin",
  className: "Bard",
  portrait: "/heroes/baldwin.png",
  battleToken: "/heroes-tokens/baldwin.png",
  baseHp: 9,
};

const HERO_B: Hero = {
  id: "cyrus",
  name: "Cyrus",
  className: "Paladin",
  portrait: "/heroes/cyrus.png",
  battleToken: "/heroes-tokens/cyrus.png",
  baseHp: 9,
};

function baseState(): BattleState {
  return createInitialBattleState([HERO_A], [HERO_B]);
}

describe("createInitialBattleState", () => {
  it("seeds each hero's hp from their own baseHp, not a flat default", () => {
    const state = createInitialBattleState([HERO_A], []);
    expect(state.p1.heroes[HERO_A.id]).toEqual({ hp: HERO_A.baseHp, level: 1 });
  });

  it("seeds gold and structures at the intent-02 starting values", () => {
    const state = baseState();
    expect(state.p1.gold).toBe(0);
    expect(state.p1.structures).toEqual({
      top: TOWER_STARTING_HP,
      middle: TOWER_STARTING_HP,
      bottom: TOWER_STARTING_HP,
      bit: BIT_STARTING_HP,
    });
  });

  it("seeds every hero's heroPositions as null (its team's respawn area)", () => {
    const state = baseState();
    expect(state.p1.heroPositions).toEqual({ [HERO_A.id]: null });
    expect(state.p2.heroPositions).toEqual({ [HERO_B.id]: null });
  });

  it("seeds every gold pile at GOLD_PILE_STARTING_COUNT, schemaVersion 2", () => {
    const state = baseState();
    expect(state.schemaVersion).toBe(2);
    for (const id of GOLD_PILE_SPACE_IDS) {
      expect(state.goldPiles[id]).toBe(GOLD_PILE_STARTING_COUNT);
    }
  });
});

describe("battleReducer", () => {
  it("SET_GOLD clamps and replaces", () => {
    const state = baseState();
    const next = battleReducer(state, { type: "SET_GOLD", side: "p1", value: 5 });
    expect(next.p1.gold).toBe(5);
    expect(next).not.toBe(state);
  });

  it("SET_GOLD is a no-op (same reference) when the clamped value is unchanged", () => {
    const state = baseState();
    const next = battleReducer(state, { type: "SET_GOLD", side: "p1", value: -5 });
    expect(next).toBe(state);
  });

  it("SET_HERO_HP clamps and replaces", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_HERO_HP",
      side: "p1",
      heroId: HERO_A.id,
      value: 99,
    });
    expect(next.p1.heroes[HERO_A.id].hp).toBe(HERO_HP_CEILING);
    expect(next).not.toBe(state);
  });

  it("SET_HERO_HP is a no-op for an unknown heroId", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_HERO_HP",
      side: "p1",
      heroId: "sterling",
      value: 5,
    });
    expect(next).toBe(state);
  });

  it("SET_HERO_HP is a no-op when the clamped value is unchanged", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_HERO_HP",
      side: "p1",
      heroId: HERO_A.id,
      value: HERO_A.baseHp,
    });
    expect(next).toBe(state);
  });

  it("SET_HERO_LEVEL clamps and replaces", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_HERO_LEVEL",
      side: "p1",
      heroId: HERO_A.id,
      value: 3,
    });
    expect(next.p1.heroes[HERO_A.id].level).toBe(3);
    expect(next).not.toBe(state);
  });

  it("SET_HERO_LEVEL is a no-op for an unknown heroId", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_HERO_LEVEL",
      side: "p1",
      heroId: "sterling",
      value: 3,
    });
    expect(next).toBe(state);
  });

  it("SET_STRUCTURE_HP clamps and replaces, per-structure ceiling", () => {
    const state = baseState();
    const nextBit = battleReducer(state, {
      type: "SET_STRUCTURE_HP",
      side: "p2",
      slot: "bit",
      value: 99,
    });
    expect(nextBit.p2.structures.bit).toBe(BIT_STARTING_HP);

    const nextTower = battleReducer(state, {
      type: "SET_STRUCTURE_HP",
      side: "p1",
      slot: "top",
      value: 99,
    });
    expect(nextTower.p1.structures.top).toBe(TOWER_STARTING_HP);
  });

  it("SET_STRUCTURE_HP is a no-op when the clamped value is unchanged", () => {
    const state = baseState();
    const next = battleReducer(state, {
      type: "SET_STRUCTURE_HP",
      side: "p1",
      slot: "top",
      value: TOWER_STARTING_HP,
    });
    expect(next).toBe(state);
  });

  it("never mutates a field on the other side", () => {
    const state = baseState();
    const next = battleReducer(state, { type: "SET_GOLD", side: "p1", value: 5 });
    expect(next.p2).toBe(state.p2);
  });

  describe("SET_HERO_POSITION", () => {
    it("moves a hero from the respawn area (null) onto a real space", () => {
      const state = baseState();
      const spaceId = MAP_SPACE_IDS[0];
      const next = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId,
      });
      expect(next.p1.heroPositions[HERO_A.id]).toBe(spaceId);
      expect(next).not.toBe(state);
    });

    it("moves a hero from a real space back to the respawn area (null)", () => {
      const placed = battleReducer(baseState(), {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      const next = battleReducer(placed, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: null,
      });
      expect(next.p1.heroPositions[HERO_A.id]).toBeNull();
      expect(next).not.toBe(placed);
    });

    it("is a no-op (same reference) when the target spaceId is unchanged", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: null,
      });
      expect(next).toBe(state);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: "sterling",
        spaceId: MAP_SPACE_IDS[0],
      });
      expect(next).toBe(state);
    });

    it("never mutates the other side", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      expect(next.p2).toBe(state.p2);
    });
  });

  describe("SET_GOLD_PILE", () => {
    it("clamps and replaces", () => {
      const state = baseState();
      const pileId = GOLD_PILE_SPACE_IDS[0];
      const next = battleReducer(state, { type: "SET_GOLD_PILE", pileId, value: 1 });
      expect(next.goldPiles[pileId]).toBe(1);
      expect(next).not.toBe(state);
    });

    it("clamps an out-of-range value to the ceiling", () => {
      const state = baseState();
      const pileId = GOLD_PILE_SPACE_IDS[0];
      const next = battleReducer(state, { type: "SET_GOLD_PILE", pileId, value: 99 });
      expect(next.goldPiles[pileId]).toBe(GOLD_PILE_STARTING_COUNT);
    });

    it("is a no-op (same reference) when the clamped value is unchanged", () => {
      const state = baseState();
      const pileId = GOLD_PILE_SPACE_IDS[0];
      const next = battleReducer(state, {
        type: "SET_GOLD_PILE",
        pileId,
        value: GOLD_PILE_STARTING_COUNT,
      });
      expect(next).toBe(state);
    });

    it("never touches either team's own gold", () => {
      const state = baseState();
      const pileId = GOLD_PILE_SPACE_IDS[0];
      const next = battleReducer(state, { type: "SET_GOLD_PILE", pileId, value: 0 });
      expect(next.p1.gold).toBe(state.p1.gold);
      expect(next.p2.gold).toBe(state.p2.gold);
    });
  });
});
