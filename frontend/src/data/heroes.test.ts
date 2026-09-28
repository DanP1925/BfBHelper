import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HERO_ROSTER } from "./heroes";

// Tests run with `frontend/` as cwd, so public assets resolve from there.
const PUBLIC_DIR = path.join(process.cwd(), "public");

describe("HERO_ROSTER", () => {
  it("has 19 heroes", () => {
    expect(HERO_ROSTER).toHaveLength(19);
  });

  it("has unique hero ids", () => {
    const ids = HERO_ROSTER.map((hero) => hero.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a portrait file on disk for every hero", () => {
    for (const hero of HERO_ROSTER) {
      const relativePath = hero.portrait.replace(/^\//, "");
      const absolutePath = path.join(PUBLIC_DIR, relativePath);
      expect(existsSync(absolutePath), `missing portrait for ${hero.id}: ${absolutePath}`).toBe(
        true,
      );
    }
  });

  it("has a card-back asset", () => {
    expect(existsSync(path.join(PUBLIC_DIR, "heroes", "card-back.png"))).toBe(true);
  });
});
