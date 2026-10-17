import { describe, expect, it } from "vitest";
import type { Hero } from "../draft/types";
import {
  BIT_STARTING_HP,
  HERO_HP_CEILING,
  ON_OFF_TOKEN_FIELDS,
  TOWER_STARTING_HP,
} from "./constants";
import { COUNTED_TOKENS } from "../../test/countedTokens";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../../data/mapSpaces";
import { ARENA_POSITION, GOLD_PILE_STARTING_COUNT } from "../map/constants";
import {
  battleReducer,
  createInitialBattleState,
  createInitialHeroState,
  type BattleAction,
} from "./reducer";
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
      shieldTokens: 0,
      stoneTokens: 0,
      chillTokens: 0,
      favoredEnemy: false,
    });
    expect(createInitialHeroState({ ...HERO_A, baseHp: HERO_HP_CEILING })).toEqual({
      hp: HERO_HP_CEILING,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
      deathMarked: false,
      shieldTokens: 0,
      stoneTokens: 0,
      chillTokens: 0,
      favoredEnemy: false,
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
      shieldTokens: 0,
      stoneTokens: 0,
      chillTokens: 0,
      favoredEnemy: false,
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

  it("seeds every gold pile at GOLD_PILE_STARTING_COUNT, schemaVersion 12", () => {
    const state = baseState();
    expect(state.schemaVersion).toBe(12);
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

  // Every on/off token (intents 07-09) goes through the same
  // SET_HERO_ON_OFF_TOKEN: replace, manual only, no visibility check.
  describe.each(ON_OFF_TOKEN_FIELDS.map((field) => ({ field })))(
    "SET_HERO_ON_OFF_TOKEN ($field)",
    ({ field }) => {
      function set(state: BattleState, side: "p1" | "p2", value: boolean): BattleState {
        return battleReducer(state, {
          type: "SET_HERO_ON_OFF_TOKEN",
          field,
          side,
          heroId: side === "p1" ? HERO_A.id : HERO_B.id,
          value,
        });
      }

      it("turns the flag on and off, changing nothing but that hero's flag", () => {
        const state = baseState();
        const on = set(state, "p1", true);
        expect(on.p1.heroes[HERO_A.id]).toEqual({ ...state.p1.heroes[HERO_A.id], [field]: true });
        expect(on.p1.heroPositions).toBe(state.p1.heroPositions);
        expect(on.p2).toBe(state.p2);

        const off = set(on, "p1", false);
        expect(off.p1.heroes[HERO_A.id][field]).toBe(false);
        expect(off).not.toBe(on);
      });

      it("doesn't check visibility: either side can hold it", () => {
        // Neither roster has a token's owner; the UI alone decides who gets
        // a control.
        const state = set(set(baseState(), "p1", true), "p2", true);
        expect(state.p1.heroes[HERO_A.id][field]).toBe(true);
        expect(state.p2.heroes[HERO_B.id][field]).toBe(true);
      });

      it("is a no-op for an unknown heroId", () => {
        const state = baseState();
        expect(
          battleReducer(state, {
            type: "SET_HERO_ON_OFF_TOKEN",
            field,
            side: "p1",
            heroId: "sterling",
            value: true,
          }),
        ).toBe(state);
      });

      it("is a no-op (same reference) when the value is unchanged", () => {
        const state = baseState();
        expect(set(state, "p1", false)).toBe(state);
        const on = set(state, "p1", true);
        expect(set(on, "p1", true)).toBe(on);
      });

      it("survives SET_HERO_HP to 0, moves, the other tokens and PASS_INITIATIVE", () => {
        const hero = { side: "p1", heroId: HERO_A.id } as const;
        const others: BattleAction[] = [
          { type: "SET_HERO_HP", ...hero, value: 0 },
          { type: "SET_HERO_POSITION", ...hero, spaceId: null },
          { type: "SET_HERO_POSITION", ...hero, spaceId: MAP_SPACE_IDS[0] },
          { type: "SET_HERO_COUNTED_TOKEN", ...hero, field: "attackTokens", value: 2 },
          ...ON_OFF_TOKEN_FIELDS.filter((other) => other !== field).map((other): BattleAction => ({
            type: "SET_HERO_ON_OFF_TOKEN",
            ...hero,
            field: other,
            value: true,
          })),
          { type: "PASS_INITIATIVE" },
        ];
        const state = others.reduce(battleReducer, set(baseState(), "p1", true));
        expect(state.p1.heroes[HERO_A.id]).toMatchObject({
          hp: 0,
          attackTokens: 2,
          ...Object.fromEntries(ON_OFF_TOKEN_FIELDS.map((f) => [f, true])),
        });
        expect(state.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);
      });
    },
  );

  it("never blocks a move: SET_HERO_POSITION moves an immobilized hero and keeps the flag", () => {
    const immobilized = battleReducer(baseState(), {
      type: "SET_HERO_ON_OFF_TOKEN",
      field: "immobilized",
      side: "p1",
      heroId: HERO_A.id,
      value: true,
    });
    const moved = battleReducer(immobilized, {
      type: "SET_HERO_POSITION",
      side: "p1",
      heroId: HERO_A.id,
      spaceId: MAP_SPACE_IDS[0],
    });
    expect(moved.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);
    expect(moved.p1.heroes[HERO_A.id].immobilized).toBe(true);
  });

  it("never moves Favored Enemy: setting it on a second hero leaves the first one's alone (intent/15)", () => {
    const twoHeroes = createInitialBattleState([HERO_A, HERO_B], [], "p1");
    const favor = (state: BattleState, heroId: Hero["id"]): BattleState =>
      battleReducer(state, {
        type: "SET_HERO_ON_OFF_TOKEN",
        field: "favoredEnemy",
        side: "p1",
        heroId,
        value: true,
      });
    const both = favor(favor(twoHeroes, HERO_A.id), HERO_B.id);
    expect(both.p1.heroes[HERO_A.id].favoredEnemy).toBe(true);
    expect(both.p1.heroes[HERO_B.id].favoredEnemy).toBe(true);
  });

  // Every counted token (intents 06, 11-13) goes through the same
  // SET_HERO_COUNTED_TOKEN: clamp-and-replace, manual only, no visibility
  // check.
  describe.each(COUNTED_TOKENS)("SET_HERO_COUNTED_TOKEN ($field)", ({ field, ceiling }) => {
    function set(state: BattleState, side: "p1" | "p2", value: number): BattleState {
      return battleReducer(state, {
        type: "SET_HERO_COUNTED_TOKEN",
        field,
        side,
        heroId: side === "p1" ? HERO_A.id : HERO_B.id,
        value,
      });
    }

    it("clamps and replaces, changing nothing but that hero's count", () => {
      const state = baseState();
      const next = set(state, "p1", 2);
      expect(next.p1.heroes[HERO_A.id]).toEqual({ ...state.p1.heroes[HERO_A.id], [field]: 2 });
      expect(next.p1.heroPositions).toBe(state.p1.heroPositions);
      expect(next.p2).toBe(state.p2);

      expect(set(next, "p1", 1).p1.heroes[HERO_A.id][field]).toBe(1);
      expect(set(state, "p1", ceiling + 1).p1.heroes[HERO_A.id][field]).toBe(ceiling);
    });

    it("reaching the ceiling leaves HP and position alone (no auto-defeat)", () => {
      const placed = battleReducer(baseState(), {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      const next = set(placed, "p1", ceiling);
      expect(next.p1.heroes[HERO_A.id].hp).toBe(placed.p1.heroes[HERO_A.id].hp);
      expect(next.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);
    });

    it("doesn't check visibility: either side can hold it", () => {
      // HERO_B is Cyrus and neither hero is Sedusa; the UI alone decides
      // who gets a control.
      const state = set(set(baseState(), "p1", 1), "p2", 2);
      expect(state.p1.heroes[HERO_A.id][field]).toBe(1);
      expect(state.p2.heroes[HERO_B.id][field]).toBe(2);
    });

    it("is a no-op for an unknown heroId", () => {
      const state = baseState();
      expect(
        battleReducer(state, {
          type: "SET_HERO_COUNTED_TOKEN",
          field,
          side: "p1",
          heroId: "sterling",
          value: 2,
        }),
      ).toBe(state);
    });

    it("is a no-op (same reference) when the clamped value is unchanged", () => {
      const state = baseState();
      expect(set(state, "p1", -1)).toBe(state);
      const two = set(state, "p1", 2);
      expect(set(two, "p1", 2)).toBe(two);
    });

    it("survives SET_HERO_HP to 0, a move, the other tokens and PASS_INITIATIVE", () => {
      const hero = { side: "p1", heroId: HERO_A.id } as const;
      const others: BattleAction[] = [
        { type: "SET_HERO_HP", ...hero, value: 0 },
        { type: "SET_HERO_POSITION", ...hero, spaceId: MAP_SPACE_IDS[0] },
        { type: "SET_HERO_COUNTED_TOKEN", ...hero, field: "attackTokens", value: 2 },
        ...ON_OFF_TOKEN_FIELDS.map((field): BattleAction => ({
          type: "SET_HERO_ON_OFF_TOKEN",
          ...hero,
          field,
          value: true,
        })),
        { type: "SET_HERO_COUNTED_TOKEN", ...hero, field: "shieldTokens", value: 1 },
        { type: "SET_HERO_COUNTED_TOKEN", ...hero, field: "stoneTokens", value: 1 },
        { type: "SET_HERO_COUNTED_TOKEN", ...hero, field: "chillTokens", value: 1 },
        { type: "PASS_INITIATIVE" },
      ];
      const state = others
        .filter((action) => !("field" in action && action.field === field))
        .reduce(battleReducer, set(baseState(), "p1", 3));
      expect(state.p1.heroes[HERO_A.id]).toMatchObject({
        hp: 0,
        attackTokens: 2,
        ...Object.fromEntries(ON_OFF_TOKEN_FIELDS.map((f) => [f, true])),
        [field]: 3,
      });
    });
  });

  it("never nets Chill against +1 Attack: each write leaves the other count alone (intent/13)", () => {
    const set = (state: BattleState, field: "attackTokens" | "chillTokens", value: number) =>
      battleReducer(state, {
        type: "SET_HERO_COUNTED_TOKEN",
        side: "p1",
        heroId: HERO_A.id,
        field,
        value,
      });
    const chilled = set(baseState(), "chillTokens", 2);
    const both = set(chilled, "attackTokens", 3);
    expect(both.p1.heroes[HERO_A.id]).toMatchObject({ attackTokens: 3, chillTokens: 2 });
    const lessChill = set(both, "chillTokens", 1);
    expect(lessChill.p1.heroes[HERO_A.id]).toMatchObject({ attackTokens: 3, chillTokens: 1 });
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

    // intent/14: the Arena is just another position, with no rule here
    // (Baldwin and Cyrus, no Felix drafted, still get in).
    it("moves a hero into the Arena and back out to a space or the respawn area", () => {
      const toArena = (state: BattleState) =>
        battleReducer(state, {
          type: "SET_HERO_POSITION",
          side: "p1",
          heroId: HERO_A.id,
          spaceId: ARENA_POSITION,
        });
      const inArena = toArena(baseState());
      expect(inArena.p1.heroPositions[HERO_A.id]).toBe(ARENA_POSITION);
      expect(toArena(inArena)).toBe(inArena);

      const onSpace = battleReducer(inArena, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: MAP_SPACE_IDS[0],
      });
      expect(onSpace.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);

      const respawning = battleReducer(inArena, {
        type: "SET_HERO_POSITION",
        side: "p1",
        heroId: HERO_A.id,
        spaceId: null,
      });
      expect(respawning.p1.heroPositions[HERO_A.id]).toBeNull();
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
