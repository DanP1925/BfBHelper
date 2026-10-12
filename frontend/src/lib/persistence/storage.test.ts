import { beforeEach, describe, expect, it } from "vitest";
import type { DraftState, HeroId } from "../draft/types";
import { createInitialBattleState } from "../battle/reducer";
import { BIT_STARTING_HP, TOWER_STARTING_HP } from "../battle/constants";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../../data/mapSpaces";
import type { BattleState, HeroBattleState } from "../battle/types";
import {
  BATTLE_STATE_STORAGE_KEY,
  CURRENT_BATTLE_SCHEMA_VERSION,
  CURRENT_DRAFT_SCHEMA_VERSION,
  STORAGE_KEY,
  VIEW_STORAGE_KEY,
} from "./schema";
import {
  clearDraft,
  loadBattleState,
  loadDraft,
  loadView,
  saveBattleState,
  saveDraft,
  saveView,
} from "./storage";

const midDraftState: DraftState = {
  initiative: "p1",
  picks: {
    p1: ["agatha-trunch"],
    p2: ["baldwin", "boreas"],
  },
};

const sampleBattleState: BattleState = createInitialBattleState(
  [
    {
      id: "agatha-trunch",
      name: "Agatha Trunch",
      className: "Minotaur",
      portrait: "/heroes/agatha-trunch.png",
      battleToken: "/heroes-tokens/agatha-trunch.png",
      baseHp: 10,
    },
  ],
  [
    {
      id: "baldwin",
      name: "Baldwin",
      className: "Bard",
      portrait: "/heroes/baldwin.png",
      battleToken: "/heroes-tokens/baldwin.png",
      baseHp: 9,
    },
  ],
  "p1",
);

/** A valid draft whose coin-flip winner is p2 — distinct from
 * `sampleBattleState`'s "p1", so a migration's defaulted `initiative`
 * visibly comes from the draft. */
const p2InitiativeDraft: DraftState = {
  initiative: "p2",
  picks: { p1: [], p2: ["baldwin"] },
};

/** One side's team as an older save stored it: heroes without the given
 * fields (`attackTokens` before schema 4, intent/06; `confused` before
 * schema 5, intent/07). */
function withoutHeroFields(team: BattleState["p1"], ...fields: (keyof HeroBattleState)[]) {
  return {
    ...team,
    heroes: Object.fromEntries(
      Object.entries(team.heroes).map(([id, hero]) => {
        const legacy: Partial<HeroBattleState> = { ...hero };
        for (const field of fields) delete legacy[field];
        return [id, legacy];
      }),
    ),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveDraft", () => {
  // Scenario 14
  it("writes JSON with schemaVersion === CURRENT_DRAFT_SCHEMA_VERSION", () => {
    saveDraft(midDraftState);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.schemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);
  });
});

describe("loadDraft", () => {
  // Scenario 15
  it("returns null with no persisted key", () => {
    expect(loadDraft()).toBeNull();
  });

  // Scenario 16
  it("round-trips a partial (mid-draft) state through save -> load exactly", () => {
    saveDraft(midDraftState);

    const loaded = loadDraft();

    expect(loaded).toEqual(midDraftState);
  });

  // Scenario 17
  it("returns null and clears the key on corrupt/invalid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    expect(loadDraft()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  describe("schemaVersion validation (scenario 18)", () => {
    it("returns null and clears the key when schemaVersion is missing entirely", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          initiative: "p1",
          picks: { p1: [], p2: [] },
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when schemaVersion is a string", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: "1",
          initiative: "p1",
          picks: { p1: [], p2: [] },
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when schemaVersion is newer than current", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 2,
          initiative: "p1",
          picks: { p1: [], p2: [] },
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when schemaVersion is older than current with no migration path", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 0,
          initiative: "p1",
          picks: { p1: [], p2: [] },
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("structural pick validation (scenario 19)", () => {
    function persistRawPicks(picks: { p1: string[]; p2: string[] }) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
          initiative: "p1",
          picks,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    it("returns null and clears the key on a duplicate id within one player's picks", () => {
      persistRawPicks({ p1: ["agatha-trunch", "agatha-trunch"], p2: [] });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key on a duplicate id across both players", () => {
      persistRawPicks({ p1: ["agatha-trunch"], p2: ["agatha-trunch"] });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when one player has more than 4 picks", () => {
      persistRawPicks({
        p1: ["agatha-trunch", "baldwin", "boreas", "caligar", "ceralin"],
        p2: [],
      });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when total picks exceed 8", () => {
      persistRawPicks({
        p1: ["agatha-trunch", "baldwin", "boreas", "caligar"],
        p2: ["ceralin", "cynthia", "cyrus", "dazeem", "dolgolae"],
      });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when a pick references an unknown hero id", () => {
      persistRawPicks({ p1: ["not-a-real-hero"], p2: [] });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when pick counts don't match the deterministic turn order", () => {
      // Valid hero ids, valid per-player/overall counts — but step 1 is
      // always the initiative player's single pick first, so p2 holding 2
      // picks while p1 (the initiative player) holds 0 can never happen.
      persistRawPicks({ p1: [], p2: ["agatha-trunch", "baldwin"] });

      expect(loadDraft()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // Scenario 20
  it("reflects a fresh New Draft state after overwriting an in-progress persisted draft", () => {
    saveDraft(midDraftState);

    const freshState: DraftState = {
      initiative: "p2",
      picks: { p1: [], p2: [] },
    };
    saveDraft(freshState);

    expect(loadDraft()).toEqual(freshState);
  });
});

describe("saveBattleState / loadBattleState", () => {
  it("returns null with no persisted key", () => {
    expect(loadBattleState()).toBeNull();
  });

  it("round-trips a battle state through save -> load exactly", () => {
    saveBattleState(sampleBattleState);

    expect(loadBattleState()).toEqual(sampleBattleState);
  });

  it("returns null and clears the key on corrupt/invalid JSON", () => {
    window.localStorage.setItem(BATTLE_STATE_STORAGE_KEY, "{not valid json");

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when schemaVersion is missing", () => {
    window.localStorage.setItem(
      BATTLE_STATE_STORAGE_KEY,
      JSON.stringify({ p1: sampleBattleState.p1, p2: sampleBattleState.p2 }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when schemaVersion is newer than current", () => {
    window.localStorage.setItem(
      BATTLE_STATE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 6, p1: sampleBattleState.p1, p2: sampleBattleState.p2 }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when a hero id is outside the known roster", () => {
    const corrupted: BattleState = {
      ...sampleBattleState,
      p1: {
        ...sampleBattleState.p1,
        heroes: {
          "not-a-real-hero": { hp: 5, level: 1, attackTokens: 0, confused: false },
        } as unknown as BattleState["p1"]["heroes"],
      },
    };
    window.localStorage.setItem(
      BATTLE_STATE_STORAGE_KEY,
      JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when a structure's HP is above its ceiling", () => {
    const corrupted: BattleState = {
      ...sampleBattleState,
      p1: {
        ...sampleBattleState.p1,
        structures: { ...sampleBattleState.p1.structures, top: TOWER_STARTING_HP + 1 },
      },
    };
    window.localStorage.setItem(
      BATTLE_STATE_STORAGE_KEY,
      JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when gold is negative", () => {
    const corrupted: BattleState = {
      ...sampleBattleState,
      p1: { ...sampleBattleState.p1, gold: -1 },
    };
    window.localStorage.setItem(
      BATTLE_STATE_STORAGE_KEY,
      JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("the Bit's ceiling (16) is independent of a Tower's (11)", () => {
    const state: BattleState = {
      ...sampleBattleState,
      p1: {
        ...sampleBattleState.p1,
        structures: { ...sampleBattleState.p1.structures, bit: BIT_STARTING_HP },
      },
    };
    saveBattleState(state);

    expect(loadBattleState()).toEqual(state);
  });

  describe("schema-1 -> 5 migration (intents 04 + 05 + 06 + 07)", () => {
    beforeEach(() => {
      saveDraft(p2InitiativeDraft);
    });

    function persistRawSchema1(
      p1Heroes: Record<string, { hp: number; level: number }>,
      p2Heroes: Record<string, { hp: number; level: number }>,
    ) {
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          p1: {
            gold: 0,
            heroes: p1Heroes,
            structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
          },
          p2: {
            gold: 0,
            heroes: p2Heroes,
            structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
          },
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    it("upgrades a schema-1 payload instead of rejecting it as corrupt", () => {
      persistRawSchema1(
        { "agatha-trunch": { hp: 10, level: 1 } },
        { baldwin: { hp: 9, level: 1 } },
      );

      const loaded = loadBattleState();

      expect(loaded).not.toBeNull();
      expect(loaded?.schemaVersion).toBe(5);
      expect(loaded?.initiative).toBe("p2");
      expect(loaded?.p1.heroes).toEqual({
        "agatha-trunch": { hp: 10, level: 1, attackTokens: 0, confused: false },
      });
      expect(loaded?.p2.heroes).toEqual({
        baldwin: { hp: 9, level: 1, attackTokens: 0, confused: false },
      });
      expect(loaded?.p1.heroPositions).toEqual({ "agatha-trunch": null });
      expect(loaded?.p2.heroPositions).toEqual({ baldwin: null });
      expect(loaded?.goldPiles).toEqual(
        Object.fromEntries(GOLD_PILE_SPACE_IDS.map((id) => [id, GOLD_PILE_STARTING_COUNT])),
      );
    });

    it("saving the migrated result (the real load -> save flow useBattle drives) persists schema 5 on disk", () => {
      persistRawSchema1(
        { "agatha-trunch": { hp: 10, level: 1 } },
        { baldwin: { hp: 9, level: 1 } },
      );
      const migrated = loadBattleState();
      expect(migrated).not.toBeNull();

      saveBattleState(migrated as BattleState);

      const raw = window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY);
      const parsed = JSON.parse(raw as string);
      expect(parsed.schemaVersion).toBe(5);
      expect(parsed.initiative).toBe("p2");
      expect(parsed.p1.heroPositions["agatha-trunch"]).toBeNull();
      expect(parsed.p1.heroes["agatha-trunch"].attackTokens).toBe(0);
      expect(parsed.p1.heroes["agatha-trunch"].confused).toBe(false);
    });
  });

  describe("schema-2 -> 5 migration (intents 05 + 06 + 07)", () => {
    function persistRawSchema2(state: BattleState) {
      const { initiative: _omitted, ...rest } = state;
      void _omitted;
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...rest,
          p1: withoutHeroFields(rest.p1, "attackTokens", "confused"),
          p2: withoutHeroFields(rest.p2, "attackTokens", "confused"),
          schemaVersion: 2,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    it("upgrades in place, defaulting initiative to the draft's coin-flip winner", () => {
      saveDraft(p2InitiativeDraft);
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
      const midBattle: BattleState = {
        ...sampleBattleState,
        p1: {
          ...sampleBattleState.p1,
          gold: 4,
          heroPositions: { ...sampleBattleState.p1.heroPositions, [heroId]: MAP_SPACE_IDS[0] },
        },
      };
      persistRawSchema2(midBattle);

      // midBattle's heroes already have attackTokens: 0 and confused: false,
      // which is what the v3 -> v4 and v4 -> v5 steps add back to the
      // stripped schema-2 payload.
      expect(loadBattleState()).toEqual({ ...midBattle, schemaVersion: 5, initiative: "p2" });
    });

    it("returns null and clears the key when there's no valid draft to default from", () => {
      persistRawSchema2(sampleBattleState);

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("still rejects a schema-2 payload whose other fields are invalid", () => {
      saveDraft(p2InitiativeDraft);
      persistRawSchema2({ ...sampleBattleState, p1: { ...sampleBattleState.p1, gold: -1 } });

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });
  });

  describe("schema-3 -> 5 migration (intents 06 + 07)", () => {
    function persistRawSchema3(state: BattleState) {
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...state,
          p1: withoutHeroFields(state.p1, "attackTokens", "confused"),
          p2: withoutHeroFields(state.p2, "attackTokens", "confused"),
          schemaVersion: 3,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    it("upgrades in place, every hero at 0 tokens, unconfused, everything else unchanged", () => {
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
      const midBattle: BattleState = {
        ...sampleBattleState,
        initiative: "p2",
        p1: {
          ...sampleBattleState.p1,
          gold: 4,
          heroes: {
            ...sampleBattleState.p1.heroes,
            [heroId]: { hp: 3, level: 2, attackTokens: 0, confused: false },
          },
          heroPositions: { ...sampleBattleState.p1.heroPositions, [heroId]: MAP_SPACE_IDS[0] },
          structures: { ...sampleBattleState.p1.structures, top: 5 },
        },
      };
      persistRawSchema3(midBattle);

      expect(loadBattleState()).toEqual(midBattle);
    });

    it("doesn't need a draft (unlike the v2 -> v3 step)", () => {
      persistRawSchema3(sampleBattleState);

      expect(loadBattleState()).toEqual(sampleBattleState);
    });

    it("returns null and clears the key when a team has no heroes object", () => {
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...sampleBattleState,
          p1: { ...sampleBattleState.p1, heroes: null },
          schemaVersion: 3,
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("still rejects a schema-3 payload whose other fields are invalid", () => {
      persistRawSchema3({ ...sampleBattleState, p1: { ...sampleBattleState.p1, gold: -1 } });

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });
  });

  describe("schema-4 -> 5 migration (intent/07)", () => {
    function persistRawSchema4(state: BattleState) {
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...state,
          p1: withoutHeroFields(state.p1, "confused"),
          p2: withoutHeroFields(state.p2, "confused"),
          schemaVersion: 4,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    it("upgrades in place, every hero unconfused, attack tokens and everything else kept", () => {
      const p1HeroId = Object.keys(sampleBattleState.p1.heroes)[0];
      const p2HeroId = Object.keys(sampleBattleState.p2.heroes)[0];
      const midBattle: BattleState = {
        ...sampleBattleState,
        initiative: "p2",
        p1: {
          ...sampleBattleState.p1,
          gold: 4,
          heroes: {
            ...sampleBattleState.p1.heroes,
            [p1HeroId]: { hp: 0, level: 2, attackTokens: 3, confused: false },
          },
          heroPositions: { ...sampleBattleState.p1.heroPositions, [p1HeroId]: MAP_SPACE_IDS[0] },
        },
        p2: {
          ...sampleBattleState.p2,
          heroes: {
            ...sampleBattleState.p2.heroes,
            [p2HeroId]: { hp: 9, level: 1, attackTokens: 1, confused: false },
          },
        },
      };
      persistRawSchema4(midBattle);

      expect(loadBattleState()).toEqual(midBattle);
    });

    it("returns null and clears the key when a team has no heroes object", () => {
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...sampleBattleState,
          p2: { ...sampleBattleState.p2, heroes: null },
          schemaVersion: 4,
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("still rejects a schema-4 payload whose other fields are invalid", () => {
      persistRawSchema4({ ...sampleBattleState, p1: { ...sampleBattleState.p1, gold: -1 } });

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });
  });

  describe("confused validation (intent/07)", () => {
    it.each([
      ["missing", undefined],
      ["0", 0],
      ['"true"', "true"],
      ["null", null],
    ])("returns null and clears the key when a hero's confused is %s", (_label, confused) => {
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({
          ...sampleBattleState,
          p1: {
            ...sampleBattleState.p1,
            heroes: { [heroId]: { hp: 5, level: 1, attackTokens: 0, confused } },
          },
          updatedAt: new Date().toISOString(),
        }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("round-trips a confused hero", () => {
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0] as HeroId;
      const confused: BattleState = {
        ...sampleBattleState,
        p1: {
          ...sampleBattleState.p1,
          heroes: {
            ...sampleBattleState.p1.heroes,
            [heroId]: { ...sampleBattleState.p1.heroes[heroId], confused: true },
          },
        },
      };
      saveBattleState(confused);

      expect(loadBattleState()).toEqual(confused);
    });
  });

  describe("attackTokens validation (intent/06)", () => {
    it.each([
      ["missing", undefined],
      ["negative", -1],
      ["above 9", 10],
      ["non-numeric", "2"],
    ])(
      "returns null and clears the key when a hero's attackTokens is %s",
      (_label, attackTokens) => {
        const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
        window.localStorage.setItem(
          BATTLE_STATE_STORAGE_KEY,
          JSON.stringify({
            ...sampleBattleState,
            p1: {
              ...sampleBattleState.p1,
              heroes: { [heroId]: { hp: 5, level: 1, attackTokens, confused: false } },
            },
            updatedAt: new Date().toISOString(),
          }),
        );

        expect(loadBattleState()).toBeNull();
        expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
      },
    );

    it("round-trips a non-zero count", () => {
      const heroId = Object.keys(sampleBattleState.p2.heroes)[0];
      const withTokens: BattleState = {
        ...sampleBattleState,
        p2: {
          ...sampleBattleState.p2,
          heroes: {
            ...sampleBattleState.p2.heroes,
            [heroId]: { hp: 9, level: 1, attackTokens: 9, confused: false },
          },
        },
      };
      saveBattleState(withTokens);

      expect(loadBattleState()).toEqual(withTokens);
    });
  });

  describe("initiative validation (intent/05)", () => {
    it.each([["p3"], [null], [undefined]])(
      "returns null and clears the key when initiative is %s",
      (initiative) => {
        window.localStorage.setItem(
          BATTLE_STATE_STORAGE_KEY,
          JSON.stringify({ ...sampleBattleState, initiative, updatedAt: new Date().toISOString() }),
        );

        expect(loadBattleState()).toBeNull();
        expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
      },
    );

    it("round-trips either holder", () => {
      const p2Holds: BattleState = { ...sampleBattleState, initiative: "p2" };
      saveBattleState(p2Holds);

      expect(loadBattleState()).toEqual(p2Holds);
    });
  });

  describe("heroPositions / goldPiles validation (intent/04)", () => {
    it("returns null and clears the key when a hero is missing its heroPositions entry", () => {
      const corrupted = {
        ...sampleBattleState,
        p1: {
          ...sampleBattleState.p1,
          heroPositions: {},
        },
      };
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when a heroPositions value isn't a real map-space id", () => {
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
      const corrupted = {
        ...sampleBattleState,
        p1: {
          ...sampleBattleState.p1,
          heroPositions: { ...sampleBattleState.p1.heroPositions, [heroId]: "not-a-real-space" },
        },
      };
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("accepts a real map-space id as a heroPositions value", () => {
      const heroId = Object.keys(sampleBattleState.p1.heroes)[0];
      const realSpaceId = MAP_SPACE_IDS[0];
      const state = {
        ...sampleBattleState,
        p1: {
          ...sampleBattleState.p1,
          heroPositions: { ...sampleBattleState.p1.heroPositions, [heroId]: realSpaceId },
        },
      };
      saveBattleState(state);

      expect(loadBattleState()).toEqual(state);
    });

    it("returns null and clears the key when goldPiles is missing a known pile", () => {
      const incompletePiles = Object.fromEntries(
        Object.entries(sampleBattleState.goldPiles).filter(([id]) => id !== GOLD_PILE_SPACE_IDS[0]),
      );
      const corrupted = { ...sampleBattleState, goldPiles: incompletePiles };
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears the key when a gold pile's value is above its ceiling", () => {
      const corrupted = {
        ...sampleBattleState,
        goldPiles: {
          ...sampleBattleState.goldPiles,
          [GOLD_PILE_SPACE_IDS[0]]: GOLD_PILE_STARTING_COUNT + 1,
        },
      };
      window.localStorage.setItem(
        BATTLE_STATE_STORAGE_KEY,
        JSON.stringify({ ...corrupted, updatedAt: new Date().toISOString() }),
      );

      expect(loadBattleState()).toBeNull();
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    });
  });

  describe("draft/battle-state schema-version independence (intent/04 regression)", () => {
    // The exact bug the CURRENT_DRAFT_SCHEMA_VERSION/CURRENT_BATTLE_SCHEMA_VERSION
    // split exists to prevent: bumping the battle schema must never make
    // loadDraft() also expect a migration that doesn't exist for drafts.
    it("loadDraft still loads a schema-1 draft after CURRENT_BATTLE_SCHEMA_VERSION has been bumped past 1", () => {
      expect(CURRENT_BATTLE_SCHEMA_VERSION).toBe(5);
      saveDraft(midDraftState);

      expect(loadDraft()).toEqual(midDraftState);
    });
  });
});

describe("clearDraft", () => {
  // Scenario 21
  it("removes the persisted key so a subsequent loadDraft() returns null", () => {
    saveDraft(midDraftState);

    clearDraft();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadDraft()).toBeNull();
  });

  it("also clears the persisted view flag, since it's meaningless without a draft", () => {
    saveDraft(midDraftState);
    saveView("battle");

    clearDraft();

    expect(window.localStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
    expect(loadView()).toBe("results");
  });

  it("also clears the persisted battle state, since it's meaningless without a draft", () => {
    saveDraft(midDraftState);
    saveBattleState(sampleBattleState);

    clearDraft();

    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
    expect(loadBattleState()).toBeNull();
  });
});

describe("loadView / saveView", () => {
  it("defaults to 'results' when nothing is persisted", () => {
    expect(loadView()).toBe("results");
  });

  it("round-trips 'battle'", () => {
    saveView("battle");
    expect(loadView()).toBe("battle");
  });

  it("round-trips 'win'", () => {
    saveView("win");
    expect(loadView()).toBe("win");
  });

  it("saving 'results' clears the key rather than storing it", () => {
    saveView("battle");
    saveView("results");

    expect(window.localStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
    expect(loadView()).toBe("results");
  });

  it("defaults to 'results' and clears a stale/unrecognized value instead of leaving it behind", () => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, "some-future-view");

    expect(loadView()).toBe("results");
    expect(window.localStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
  });
});
