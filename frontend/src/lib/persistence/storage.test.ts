import { beforeEach, describe, expect, it } from "vitest";
import type { DraftState } from "../draft/types";
import { createInitialBattleState } from "../battle/reducer";
import { BIT_STARTING_HP, TOWER_STARTING_HP } from "../battle/constants";
import type { BattleState } from "../battle/types";
import {
  BATTLE_STATE_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
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
);

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveDraft", () => {
  // Scenario 14
  it("writes JSON with schemaVersion === CURRENT_SCHEMA_VERSION", () => {
    saveDraft(midDraftState);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
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
          schemaVersion: CURRENT_SCHEMA_VERSION,
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
      JSON.stringify({ schemaVersion: 2, p1: sampleBattleState.p1, p2: sampleBattleState.p2 }),
    );

    expect(loadBattleState()).toBeNull();
    expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears the key when a hero id is outside the known roster", () => {
    const corrupted: BattleState = {
      ...sampleBattleState,
      p1: {
        ...sampleBattleState.p1,
        heroes: { "not-a-real-hero": { hp: 5, level: 1 } } as unknown as BattleState["p1"]["heroes"],
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
