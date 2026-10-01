import { beforeEach, describe, expect, it } from "vitest";
import type { DraftState } from "../draft/types";
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY } from "./schema";
import { clearDraft, loadDraft, saveDraft } from "./storage";

const midDraftState: DraftState = {
  initiative: "p1",
  picks: {
    p1: ["agatha-trunch"],
    p2: ["baldwin", "boreas"],
  },
};

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

describe("clearDraft", () => {
  // Scenario 21
  it("removes the persisted key so a subsequent loadDraft() returns null", () => {
    saveDraft(midDraftState);

    clearDraft();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadDraft()).toBeNull();
  });
});
