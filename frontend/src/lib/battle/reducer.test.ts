import { describe, expect, it } from "vitest";
import type { Hero } from "../draft/types";
import {
  BIT_STARTING_HP,
  HERO_ATTACK_TOKEN_CEILING,
  HERO_HP_CEILING,
  TOWER_STARTING_HP,
} from "./constants";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../../data/mapSpaces";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";
import { battleReducer, createInitialBattleState, createInitialHeroState } from "./reducer";
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
  return createInitialBattleState([HERO_A], [HERO_B], "p1");
}

describe("createInitialHeroState", () => {
  it("starts at baseHp + starting level, clamped to the HP ceiling, with no tokens", () => {
    expect(createInitialHeroState({ ...HERO_A, baseHp: 10 })).toEqual({
      hp: 11,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
      deathMarked: false,
    });
    expect(createInitialHeroState({ ...HERO_A, baseHp: HERO_HP_CEILING })).toEqual({
      hp: HERO_HP_CEILING,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
      deathMarked: false,
    });
  });
});

describe("createInitialBattleState", () => {
  it("seeds each hero's hp as their own baseHp + starting level, not a flat default", () => {
    const state = createInitialBattleState([HERO_A], [], "p1");
    expect(state.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp + 1,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
      deathMarked: false,
    });
  });

  it("starts initiative on the given holder", () => {
    expect(createInitialBattleState([HERO_A], [HERO_B], "p1").initiative).toBe("p1");
    expect(createInitialBattleState([HERO_A], [HERO_B], "p2").initiative).toBe("p2");
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

  it("seeds every gold pile at GOLD_PILE_STARTING_COUNT, schemaVersion 7", () => {
    const state = baseState();
    expect(state.schemaVersion).toBe(7);
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
      value: HERO_A.baseHp + 1,
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

  describe("SET_HERO_ATTACK_TOKENS", () => {
    it("clamps and replaces", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: 3,
      });
      expect(next.p1.heroes[HERO_A.id].attackTokens).toBe(3);
      expect(next).not.toBe(state);

      const capped = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: 99,
      });
      expect(capped.p1.heroes[HERO_A.id].attackTokens).toBe(HERO_ATTACK_TOKEN_CEILING);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: "sterling",
        value: 2,
      });
      expect(next).toBe(state);
    });

    it("is a no-op (same reference) when the clamped value is unchanged", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: -1,
      });
      expect(next).toBe(state);
    });

    it("changes nothing but that hero's count", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: 2,
      });
      expect(next.p1.heroes[HERO_A.id]).toEqual({ ...state.p1.heroes[HERO_A.id], attackTokens: 2 });
      expect(next.p1.heroPositions).toBe(state.p1.heroPositions);
      expect(next.p2).toBe(state.p2);
    });

    it("SET_HERO_HP to 0 keeps the hero's tokens", () => {
      const withTokens = battleReducer(baseState(), {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: 2,
      });
      const defeated = battleReducer(withTokens, {
        type: "SET_HERO_HP",
        side: "p1",
        heroId: HERO_A.id,
        value: 0,
      });
      expect(defeated.p1.heroes[HERO_A.id].attackTokens).toBe(2);
    });
  });

  describe("SET_HERO_CONFUSED", () => {
    function confuse(state: BattleState, value: boolean): BattleState {
      return battleReducer(state, {
        type: "SET_HERO_CONFUSED",
        side: "p1",
        heroId: HERO_A.id,
        value,
      });
    }

    it("turns the flag on and off, changing nothing but that hero's flag", () => {
      const state = baseState();
      const on = confuse(state, true);
      expect(on.p1.heroes[HERO_A.id]).toEqual({ ...state.p1.heroes[HERO_A.id], confused: true });
      expect(on.p1.heroPositions).toBe(state.p1.heroPositions);
      expect(on.p2).toBe(state.p2);

      const off = confuse(on, false);
      expect(off.p1.heroes[HERO_A.id].confused).toBe(false);
      expect(off).not.toBe(on);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_CONFUSED",
        side: "p1",
        heroId: "sterling",
        value: true,
      });
      expect(next).toBe(state);
    });

    it("is a no-op (same reference) when the value is unchanged", () => {
      const state = baseState();
      expect(confuse(state, false)).toBe(state);
      const on = confuse(state, true);
      expect(confuse(on, true)).toBe(on);
    });

    it("survives SET_HERO_HP to 0, SET_HERO_POSITION and PASS_INITIATIVE", () => {
      let state = confuse(baseState(), true);
      state = battleReducer(state, {
        type: "SET_HERO_HP",
        side: "p1",
        heroId: HERO_A.id,
        value: 0,
      });
      state = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: null,
      });
      state = battleReducer(state, { type: "PASS_INITIATIVE" });
      expect(state.p1.heroes[HERO_A.id].confused).toBe(true);
    });
  });

  describe("SET_HERO_IMMOBILIZED", () => {
    function immobilize(state: BattleState, value: boolean): BattleState {
      return battleReducer(state, {
        type: "SET_HERO_IMMOBILIZED",
        side: "p1",
        heroId: HERO_A.id,
        value,
      });
    }

    it("turns the flag on and off, changing nothing but that hero's flag", () => {
      const state = baseState();
      const on = immobilize(state, true);
      expect(on.p1.heroes[HERO_A.id]).toEqual({
        ...state.p1.heroes[HERO_A.id],
        immobilized: true,
      });
      expect(on.p1.heroPositions).toBe(state.p1.heroPositions);
      expect(on.p2).toBe(state.p2);

      const off = immobilize(on, false);
      expect(off.p1.heroes[HERO_A.id].immobilized).toBe(false);
      expect(off).not.toBe(on);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_IMMOBILIZED",
        side: "p1",
        heroId: "sterling",
        value: true,
      });
      expect(next).toBe(state);
    });

    it("is a no-op (same reference) when the value is unchanged", () => {
      const state = baseState();
      expect(immobilize(state, false)).toBe(state);
      const on = immobilize(state, true);
      expect(immobilize(on, true)).toBe(on);
    });

    it("never blocks a move: SET_HERO_POSITION moves an immobilized hero and keeps the flag", () => {
      const moved = battleReducer(immobilize(baseState(), true), {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      expect(moved.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);
      expect(moved.p1.heroes[HERO_A.id].immobilized).toBe(true);
    });

    it("survives SET_HERO_HP to 0, a move to respawn, SET_HERO_CONFUSED and PASS_INITIATIVE", () => {
      let state = immobilize(baseState(), true);
      state = battleReducer(state, {
        type: "SET_HERO_HP",
        side: "p1",
        heroId: HERO_A.id,
        value: 0,
      });
      state = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: null,
      });
      state = battleReducer(state, {
        type: "SET_HERO_CONFUSED",
        side: "p1",
        heroId: HERO_A.id,
        value: true,
      });
      state = battleReducer(state, { type: "PASS_INITIATIVE" });
      expect(state.p1.heroes[HERO_A.id].immobilized).toBe(true);
      expect(state.p1.heroes[HERO_A.id].confused).toBe(true);
    });
  });

  describe("SET_HERO_DEATH_MARKED", () => {
    function mark(state: BattleState, side: "p1" | "p2", value: boolean): BattleState {
      return battleReducer(state, {
        type: "SET_HERO_DEATH_MARKED",
        side,
        heroId: side === "p1" ? HERO_A.id : HERO_B.id,
        value,
      });
    }

    it("turns the flag on and off, changing nothing but that hero's flag", () => {
      const state = baseState();
      const on = mark(state, "p1", true);
      expect(on.p1.heroes[HERO_A.id]).toEqual({
        ...state.p1.heroes[HERO_A.id],
        deathMarked: true,
      });
      expect(on.p1.heroPositions).toBe(state.p1.heroPositions);
      expect(on.p2).toBe(state.p2);

      const off = mark(on, "p1", false);
      expect(off.p1.heroes[HERO_A.id].deathMarked).toBe(false);
      expect(off).not.toBe(on);
    });

    it("doesn't check visibility: any hero on either side can be marked", () => {
      // Neither roster has Kunoichi; the UI alone decides who gets a control.
      const state = mark(mark(baseState(), "p1", true), "p2", true);
      expect(state.p1.heroes[HERO_A.id].deathMarked).toBe(true);
      expect(state.p2.heroes[HERO_B.id].deathMarked).toBe(true);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      const next = battleReducer(state, {
        type: "SET_HERO_DEATH_MARKED",
        side: "p1",
        heroId: "sterling",
        value: true,
      });
      expect(next).toBe(state);
    });

    it("is a no-op (same reference) when the value is unchanged", () => {
      const state = baseState();
      expect(mark(state, "p1", false)).toBe(state);
      const on = mark(state, "p1", true);
      expect(mark(on, "p1", true)).toBe(on);
    });

    it("survives SET_HERO_HP to 0, a move, the other tokens and PASS_INITIATIVE", () => {
      let state = mark(baseState(), "p1", true);
      state = battleReducer(state, {
        type: "SET_HERO_HP",
        side: "p1",
        heroId: HERO_A.id,
        value: 0,
      });
      state = battleReducer(state, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      state = battleReducer(state, {
        type: "SET_HERO_ATTACK_TOKENS",
        side: "p1",
        heroId: HERO_A.id,
        value: 2,
      });
      state = battleReducer(state, {
        type: "SET_HERO_CONFUSED",
        side: "p1",
        heroId: HERO_A.id,
        value: true,
      });
      state = battleReducer(state, {
        type: "SET_HERO_IMMOBILIZED",
        side: "p1",
        heroId: HERO_A.id,
        value: true,
      });
      state = battleReducer(state, { type: "PASS_INITIATIVE" });
      expect(state.p1.heroes[HERO_A.id]).toMatchObject({
        hp: 0,
        attackTokens: 2,
        confused: true,
        immobilized: true,
        deathMarked: true,
      });
    });
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

  describe("PASS_INITIATIVE", () => {
    it("hands initiative to the other player, and back on a second pass", () => {
      const state = baseState();
      const once = battleReducer(state, { type: "PASS_INITIATIVE" });
      expect(once.initiative).toBe("p2");
      const twice = battleReducer(once, { type: "PASS_INITIATIVE" });
      expect(twice.initiative).toBe("p1");
    });

    it("changes nothing but the initiative holder", () => {
      const state = baseState();
      const next = battleReducer(state, { type: "PASS_INITIATIVE" });
      expect({ ...next, initiative: state.initiative }).toEqual(state);
      expect(next.p1).toBe(state.p1);
      expect(next.p2).toBe(state.p2);
      expect(next.goldPiles).toBe(state.goldPiles);
    });
  });
});
