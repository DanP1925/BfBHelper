import { describe, expect, it } from "vitest";
import type { Hero } from "../draft/types";
import { BIT_STARTING_HP, HERO_HP_CEILING, TOWER_STARTING_HP } from "./constants";
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
});
