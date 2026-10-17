import { describe, expectTypeOf, it } from "vitest";
import { HERO_COUNTED_TOKEN_CEILINGS, ON_OFF_TOKEN_FIELDS } from "./constants";
import type { CountedTokenField, OnOffTokenField } from "./types";

describe("token field tables", () => {
  // Storage validation loops over these, so a stored field missing from its
  // table would never be validated. These fail `tsc` if one is left out.
  it("ON_OFF_TOKEN_FIELDS lists every on/off token field", () => {
    expectTypeOf<(typeof ON_OFF_TOKEN_FIELDS)[number]>().toEqualTypeOf<OnOffTokenField>();
  });

  it("HERO_COUNTED_TOKEN_CEILINGS has every counted token field", () => {
    expectTypeOf<keyof typeof HERO_COUNTED_TOKEN_CEILINGS>().toEqualTypeOf<CountedTokenField>();
  });
});
