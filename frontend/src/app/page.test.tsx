import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Home from "./page";
import { getHeroById, HERO_IDS } from "../data/heroes";
import { battleReducer, createInitialBattleState } from "../lib/battle/reducer";
import type { HeroId } from "../lib/draft/types";
import { saveBattleState, saveDraft, saveView } from "../lib/persistence/storage";
import { installFakeAnimations, type FakeAnimations } from "../test/fakeAnimations";
import { stubMatchMedia } from "../test/stubMatchMedia";

/** Saves a finished draft (first 8 heroes, split 4/4) and returns a fresh
 * battle state for it — callers save it as-is or after edits. */
function seedDoneDraft() {
  const p1Ids = HERO_IDS.slice(0, 4);
  const p2Ids = HERO_IDS.slice(4, 8);
  saveDraft({ initiative: "p1", picks: { p1: p1Ids, p2: p2Ids } });
  return createInitialBattleState(p1Ids.map(getHeroById), p2Ids.map(getHeroById), "p1");
}

/** Saves a draft one pick from done (initiative p1: Player 1 makes the 8th
 * pick) and returns the hero that pick should take. */
function seedLastPick() {
  saveDraft({ initiative: "p1", picks: { p1: HERO_IDS.slice(0, 3), p2: HERO_IDS.slice(3, 7) } });
  return getHeroById(HERO_IDS[7]);
}

function pickHero(heroId: HeroId) {
  const hero = getHeroById(heroId);
  fireEvent.click(screen.getByRole("button", { name: `Pick ${hero.name}, ${hero.className}` }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home", () => {
  it("renders the Start screen when no draft is in progress", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /battle for biternia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start draft/i })).toBeInTheDocument();
  });

  it("moves a picked hero from the pool to its team at once (no motion in jsdom)", () => {
    saveDraft({ initiative: "p1", picks: { p1: [], p2: [] } });
    render(<Home />);

    const hero = getHeroById(HERO_IDS[0]);
    fireEvent.click(screen.getByRole("button", { name: `Pick ${hero.name}, ${hero.className}` }));

    expect(screen.queryByRole("button", { name: new RegExp(`^Pick ${hero.name},`) })).toBeNull();
    expect(screen.getByText(hero.name)).toBeInTheDocument();
    expect(document.body.querySelector(":scope > img")).toBeNull();
  });

  describe("the draft's finale (intent/10)", () => {
    // jsdom can't animate, so motion is off unless a test turns it on: the
    // real `motionAllowed()` check, against faked animation APIs.
    let fakes: FakeAnimations | null = null;

    function turnMotionOn() {
      fakes = installFakeAnimations();
      stubMatchMedia(false);
      return fakes;
    }

    afterEach(() => {
      fakes?.restore();
      fakes = null;
    });

    it("without motion, the 8th pick goes straight to a settled Draft Results", () => {
      const last = seedLastPick();
      render(<Home />);
      pickHero(last.id);

      expect(screen.getByText("Draft Complete")).toBeInTheDocument();
      expect(screen.getByText("VS")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Skip intro" })).toBeNull();
    });

    it("with motion, the board stays up until the last hero lands, then the entrance plays", () => {
      const { flushFrames, animationsOn } = turnMotionOn();
      const last = seedLastPick();
      render(<Home />);
      pickHero(last.id);

      // The draft is done, but the Draft Board is still up for the last hero.
      expect(screen.getByText("Draft complete")).toBeInTheDocument();
      expect(screen.queryByText("Draft Complete")).toBeNull();

      act(() => flushFrames());
      const [reveal] = animationsOn((element) => element.hasAttribute("data-slot-hero"));
      expect(reveal.element.getAttribute("data-slot-hero")).toBe(last.id);
      act(() => reveal.finish());

      expect(screen.getByText("Draft Complete")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
      expect(screen.queryByRole("button", { name: "Skip intro" })).toBeNull();
      expect(screen.getByRole("button", { name: "Start Battle →" })).toBeInTheDocument();
    });

    it("New Draft during the last hero's landing starts a clean draft", () => {
      turnMotionOn();
      const last = seedLastPick();
      render(<Home />);
      pickHero(last.id);
      expect(screen.getByText("Draft complete")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "New Draft" }));
      // Reduced motion from here on, so the new draft has no finale of its own.
      stubMatchMedia(true);

      // A full new draft ends on Draft Results: nothing from the old
      // finale holds the board up.
      for (let i = 0; i < 8; i++) {
        fireEvent.click(screen.getAllByRole("button", { name: /^Pick / })[0]);
      }
      expect(screen.getByText("Draft Complete")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Skip intro" })).toBeNull();
    });
  });

  it("renders the Win Screen when a completed battle's persisted view is 'win'", () => {
    const fresh = seedDoneDraft();
    const p1BitDown = battleReducer(fresh, {
      type: "SET_STRUCTURE_HP",
      side: "p1",
      slot: "bit",
      value: 0,
    });
    saveBattleState(p1BitDown);
    saveView("win");

    render(<Home />);
    expect(screen.getByText(/player 2 wins!/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new draft/i })).toBeInTheDocument();
  });

  it("keeps the Map's zoom when switching to the Board and back", () => {
    saveBattleState(seedDoneDraft());
    saveView("map");

    render(<Home />);
    // Zoom out is disabled at 100%, so it being enabled means "zoomed in".
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.queryByRole("button", { name: "Zoom out" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });

  describe("the JRPG theme (intents 28 and 29)", () => {
    // jsdom applies no CSS, so these check the switch every themed rule keys
    // on; the look itself is checked in the browser.
    const themedRoots = () => document.querySelectorAll('[data-theme="jrpg"]');

    it("themes the Battle Board and the Battle Map", () => {
      saveBattleState(seedDoneDraft());
      saveView("battle");
      render(<Home />);
      expect(themedRoots()).toHaveLength(1);
      // The top bar renders inside the themed root.
      expect(themedRoots()[0]).toContainElement(screen.getByRole("button", { name: "Map" }));

      fireEvent.click(screen.getByRole("button", { name: "Map" }));
      expect(themedRoots()).toHaveLength(1);
      expect(themedRoots()[0]).toContainElement(screen.getByRole("button", { name: "Zoom in" }));
    });

    it("themes the Draft", () => {
      saveDraft({ initiative: "p1", picks: { p1: [], p2: [] } });
      render(<Home />);
      expect(themedRoots()).toHaveLength(1);
      expect(themedRoots()[0]).toContainElement(
        screen.getByRole("group", { name: "Filter heroes by role" }),
      );
      expect(themedRoots()[0]).toContainElement(screen.getByRole("button", { name: "New Draft" }));
    });

    it("leaves the Start screen unthemed", () => {
      render(<Home />);
      expect(themedRoots()).toHaveLength(0);
    });
  });

  it("starts a new battle with initiative on the draft's coin-flip winner", () => {
    seedDoneDraft();
    saveView("battle");

    render(<Home />);
    expect(screen.getByRole("button", { name: /^Initiative: Player 1\./ })).toBeInTheDocument();
  });

  it("passing initiative on the Board shows on the Map too, and survives a reload", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");

    const { unmount } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /^Initiative: Player 1\./ }));
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();

    unmount();
    render(<Home />);
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();
  });

  it("stepping past Cleanup on the Board starts Round 2 and passes initiative, on the Map too (intent/21)", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");

    render(<Home />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: /^Forward to/ }));
    }
    expect(screen.getByText("Round").parentElement).toHaveTextContent("Round2");
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByText("Round").parentElement).toHaveTextContent("Round2");
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Orders");
  });

  it("shows only the '+' on a hero with no tokens", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    const p1Name = getHeroById(HERO_IDS[0]).name;

    render(<Home />);
    expect(addButton(p1Name)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: attackChipName(p1Name) })).toBeNull();
    expect(screen.queryByRole("button", { name: `Confuse token on ${p1Name}` })).toBeNull();
    expect(screen.queryByRole("button", { name: `Immobilized on ${p1Name}` })).toBeNull();
  });

  it("keeps at most one picker or +1 Attack chip open on the Board, across both teams", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    const p1Name = getHeroById(HERO_IDS[0]).name;
    const p1Other = getHeroById(HERO_IDS[1]).name;
    const p2Name = getHeroById(HERO_IDS[4]).name;
    const chip = (name: string) => screen.getByRole("button", { name: attackChipName(name) });

    render(<Home />);
    // One open and two taps: the picker stays open across picks.
    fireEvent.click(addButton(p1Name));
    fireEvent.click(option(p1Name, /^Add \+1 Attack/));
    fireEvent.click(option(p1Name, /^Add \+1 Attack/));
    expect(chip(p1Name)).toHaveAccessibleName(new RegExp(`^${p1Name}: 2 \\+1 Attack tokens`));
    expect(picker(p1Name)).not.toHaveTextContent("×");

    // Same team: the outside mousedown closes the first, the click opens the second.
    fireEvent.mouseDown(addButton(p1Other));
    fireEvent.click(addButton(p1Other));
    expect(picker(p1Name)).toBeNull();
    expect(picker(p1Other)).not.toBeNull();

    // A chip and a picker share the one-open rule.
    fireEvent.mouseDown(chip(p1Name));
    fireEvent.click(chip(p1Name));
    expect(picker(p1Other)).toBeNull();
    expect(chip(p1Name)).toHaveAttribute("aria-expanded", "true");

    // Other team's panel.
    fireEvent.mouseDown(addButton(p2Name));
    fireEvent.click(addButton(p2Name));
    expect(chip(p1Name)).toHaveAttribute("aria-expanded", "false");
    expect(picker(p2Name)).not.toBeNull();

    // A second tap of "+" closes it.
    fireEvent.click(addButton(p2Name));
    expect(picker(p2Name)).toBeNull();
  });

  it("removes a +1 Attack chip once its stepper closes at 0", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    const p1Name = getHeroById(HERO_IDS[0]).name;
    const chip = () => screen.queryByRole("button", { name: attackChipName(p1Name) });

    render(<Home />);
    fireEvent.click(addButton(p1Name));
    fireEvent.click(option(p1Name, /^Add \+1 Attack/));
    fireEvent.click(addButton(p1Name));

    fireEvent.click(chip()!);
    fireEvent.click(screen.getByRole("button", { name: `Remove +1 Attack token from ${p1Name}` }));
    // Still there at 0 while open, so − / + don't vanish under the finger.
    expect(chip()).toHaveAccessibleName(new RegExp(`^${p1Name}: 0 \\+1 Attack tokens`));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(chip()).toBeNull();
  });

  it("adds Confuse through the picker on one hero only, and a tap on the chip removes it", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    const p1Name = getHeroById(HERO_IDS[0]).name;
    const p1Other = getHeroById(HERO_IDS[1]).name;
    const confuse = (name: string) =>
      screen.queryByRole("button", { name: `Confuse token on ${name}` });

    render(<Home />);
    fireEvent.click(addButton(p1Other));
    fireEvent.click(option(p1Other, "Add Confuse"));
    expect(confuse(p1Other)).toHaveAttribute("aria-pressed", "true");
    expect(confuse(p1Name)).toBeNull();
    // Held on/off tokens drop out of the picker, which stays open.
    expect(
      within(picker(p1Other)!).queryByRole("button", { name: "Add Confuse" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(confuse(p1Other)!);
    expect(confuse(p1Other)).toBeNull();

    fireEvent.click(addButton(p1Other));
    expect(option(p1Other, "Add Confuse")).toBeInTheDocument();
  });

  it("adds and removes Immobilize without touching others or its Confuse", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    const p1Name = getHeroById(HERO_IDS[0]).name;
    const p1Other = getHeroById(HERO_IDS[1]).name;
    const immobilize = (name: string) =>
      screen.queryByRole("button", { name: `Immobilized on ${name}` });

    render(<Home />);
    fireEvent.click(addButton(p1Name));
    fireEvent.click(option(p1Name, "Add Immobilize"));
    expect(immobilize(p1Name)).toHaveAttribute("aria-pressed", "true");
    expect(immobilize(p1Name)).toHaveAttribute("title", "Immobilized (tap to remove)");
    expect(immobilize(p1Other)).toBeNull();
    expect(screen.queryByRole("button", { name: `Confuse token on ${p1Name}` })).toBeNull();
    expect(option(p1Name, "Add Confuse")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(immobilize(p1Name)!);
    expect(immobilize(p1Name)).toBeNull();
  });
});

/** Saves a finished draft with these rosters and its fresh battle state. */
function seedDraft(p1Ids: HeroId[], p2Ids: HeroId[]) {
  saveDraft({ initiative: "p1", picks: { p1: p1Ids, p2: p2Ids } });
  saveBattleState(createInitialBattleState(p1Ids.map(getHeroById), p2Ids.map(getHeroById), "p1"));
  saveView("battle");
}

/** Whether this hero's "+" picker lists `option` (e.g. "Add Death Mark"):
 * opens the picker, looks, and closes it again. */
function offersToken(heroId: HeroId, option: string): boolean {
  const name = getHeroById(heroId).name;
  fireEvent.click(addButton(name));
  const offered = within(picker(name)!).queryByRole("button", { name: option });
  fireEvent.click(addButton(name));
  return offered !== null;
}

/** This hero's held "+1 `token`" chip (e.g. "Shield"), or null. */
function countedChip(heroName: string, token: string): HTMLElement | null {
  return screen.queryByRole("button", {
    name: new RegExp(`^${heroName}: \\d+ \\+1 ${token} token`),
  });
}

/** This hero's held on/off "`token` token" chip (e.g. "Death Mark"), or null. */
function onOffChip(heroName: string, token: string): HTMLElement | null {
  return screen.queryByRole("button", { name: `${token} token on ${heroName}` });
}

describe("Home: Death Mark (intent/09)", () => {
  const offersDeathMark = (heroId: HeroId) => offersToken(heroId, "Add Death Mark");

  it("offers it only on Kunoichi's enemies when she's on Player 1", () => {
    seedDraft(
      ["kunoichi", "baldwin", "boreas", "caligar"],
      ["ceralin", "cynthia", "cyrus", "dazeem"],
    );
    render(<Home />);

    for (const id of ["ceralin", "cynthia", "cyrus", "dazeem"] as const) {
      expect(offersDeathMark(id)).toBe(true);
    }
    for (const id of ["kunoichi", "baldwin", "boreas", "caligar"] as const) {
      expect(offersDeathMark(id)).toBe(false);
    }
  });

  it("offers it only on Player 1 when Kunoichi is on Player 2", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "cyrus", "dazeem", "kunoichi"],
    );
    render(<Home />);

    expect(offersDeathMark("baldwin")).toBe(true);
    expect(offersDeathMark("cynthia")).toBe(false);
    expect(offersDeathMark("kunoichi")).toBe(false);
  });

  it("offers it to nobody without Kunoichi", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");
    render(<Home />);

    for (const id of HERO_IDS.slice(0, 8)) {
      expect(offersDeathMark(id)).toBe(false);
    }
  });

  it("marks one enemy only, leaves its other tokens, and still works with Kunoichi at 0 HP", () => {
    seedDraft(
      ["kunoichi", "baldwin", "boreas", "caligar"],
      ["ceralin", "cynthia", "cyrus", "dazeem"],
    );
    render(<Home />);
    const kunoichi = getHeroById("kunoichi").name;
    const ceralin = getHeroById("ceralin").name;
    const mark = (name: string) => onOffChip(name, "Death Mark");

    // Kunoichi at 0 HP still counts as in the battle.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${kunoichi} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);
    expect(screen.getByLabelText(`${kunoichi} HP`, { exact: true })).toHaveValue(0);

    fireEvent.click(addButton(ceralin));
    fireEvent.click(option(ceralin, "Add Confuse"));
    fireEvent.click(option(ceralin, "Add Death Mark"));
    expect(mark(ceralin)).toHaveAttribute("aria-pressed", "true");
    expect(mark(getHeroById("cynthia").name)).toBeNull();
    expect(screen.getByRole("button", { name: `Confuse token on ${ceralin}` })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(mark(ceralin)!);
    expect(mark(ceralin)).toBeNull();
    expect(screen.getByRole("button", { name: `Confuse token on ${ceralin}` })).toBeInTheDocument();
  });
});

describe("Home: +1 Shield (intent/11)", () => {
  const offersShield = (heroId: HeroId) => offersToken(heroId, "Add +1 Shield");
  const shieldChip = (name: string) => countedChip(name, "Shield");

  it("offers it only on Cyrus's team, Cyrus included, when he's on Player 1", () => {
    seedDraft(["cyrus", "baldwin", "boreas", "caligar"], ["ceralin", "cynthia", "dazeem", "felix"]);
    render(<Home />);

    for (const id of ["cyrus", "baldwin", "boreas", "caligar"] as const) {
      expect(offersShield(id)).toBe(true);
    }
    for (const id of ["ceralin", "cynthia", "dazeem", "felix"] as const) {
      expect(offersShield(id)).toBe(false);
    }
  });

  it("offers it only on Player 2 when Cyrus is on Player 2", () => {
    seedDraft(["baldwin", "boreas", "caligar", "ceralin"], ["cynthia", "cyrus", "dazeem", "felix"]);
    render(<Home />);

    expect(offersShield("cynthia")).toBe(true);
    expect(offersShield("cyrus")).toBe(true);
    expect(offersShield("baldwin")).toBe(false);
  });

  it("offers it to nobody without Cyrus", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "dazeem", "felix", "kerrick"],
    );
    render(<Home />);

    for (const id of ["baldwin", "boreas", "caligar", "ceralin", "cynthia", "dazeem"] as const) {
      expect(offersShield(id)).toBe(false);
    }
  });

  it("adds one per tap after the other tokens, works with Cyrus at 0 HP, and shares the one-open rule", () => {
    // No Dazeem on p2, so Baldwin's picker lists no "+1 Chill".
    seedDraft(
      ["cyrus", "baldwin", "boreas", "caligar"],
      ["ceralin", "cynthia", "dolgolae", "felix"],
    );
    render(<Home />);
    const cyrus = getHeroById("cyrus").name;
    const baldwin = getHeroById("baldwin").name;

    // Cyrus at 0 HP still counts as in the battle.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${cyrus} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);

    fireEvent.click(addButton(baldwin));
    expect(
      within(picker(baldwin)!)
        .getAllByRole("button")
        .map((row) => row.getAttribute("aria-label")),
    ).toEqual(["Add +1 Attack", "Add Confuse", "Add Immobilize", "Add +1 Shield"]);
    fireEvent.click(option(baldwin, "Add +1 Shield"));
    fireEvent.click(option(baldwin, "Add +1 Shield"));
    fireEvent.click(option(baldwin, "Add Confuse"));
    expect(shieldChip(baldwin)).toHaveAccessibleName(
      `${baldwin}: 2 +1 Shield tokens. Show controls`,
    );
    expect(shieldChip(cyrus)).toBeNull();

    // Shield comes after Confuse in the row, whatever order they were added.
    const confuse = screen.getByRole("button", { name: `Confuse token on ${baldwin}` });
    expect(
      confuse.compareDocumentPosition(shieldChip(baldwin)!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Opening the Shield stepper closes the picker.
    fireEvent.mouseDown(shieldChip(baldwin)!);
    fireEvent.click(shieldChip(baldwin)!);
    expect(picker(baldwin)).toBeNull();
    expect(shieldChip(baldwin)).toHaveAttribute("aria-expanded", "true");

    // Stepping to 0 removes the chip once its stepper closes.
    const remove = screen.getByRole("button", { name: `Remove +1 Shield token from ${baldwin}` });
    fireEvent.click(remove);
    fireEvent.click(remove);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(shieldChip(baldwin)).toBeNull();
  });
});

describe("Home: +1 Stone (intent/12)", () => {
  const offersStone = (heroId: HeroId) => offersToken(heroId, "Add +1 Stone");
  const stoneChip = (name: string) => countedChip(name, "Stone");

  it("offers it only on Sedusa's enemies when she's on Player 1, never on her own team", () => {
    seedDraft(
      ["sedusa", "baldwin", "boreas", "caligar"],
      ["ceralin", "cynthia", "dazeem", "felix"],
    );
    render(<Home />);

    for (const id of ["ceralin", "cynthia", "dazeem", "felix"] as const) {
      expect(offersStone(id)).toBe(true);
    }
    for (const id of ["sedusa", "baldwin", "boreas", "caligar"] as const) {
      expect(offersStone(id)).toBe(false);
    }
  });

  it("offers it only on Player 1 when Sedusa is on Player 2", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "sedusa", "dazeem", "felix"],
    );
    render(<Home />);

    expect(offersStone("baldwin")).toBe(true);
    expect(offersStone("cynthia")).toBe(false);
    expect(offersStone("sedusa")).toBe(false);
  });

  it("offers it to nobody without Sedusa", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "dazeem", "felix", "kerrick"],
    );
    render(<Home />);

    for (const id of ["baldwin", "boreas", "caligar", "ceralin", "cynthia", "dazeem"] as const) {
      expect(offersStone(id)).toBe(false);
    }
  });

  it("adds one per tap up to 3, after Shield, and still works with Sedusa at 0 HP", () => {
    // Cyrus with Sedusa's enemies, so the picker shows both counted
    // hero-specific tokens.
    seedDraft(["sedusa", "baldwin", "boreas", "caligar"], ["cyrus", "cynthia", "dazeem", "felix"]);
    render(<Home />);
    const sedusa = getHeroById("sedusa").name;
    const cynthia = getHeroById("cynthia").name;

    // Sedusa at 0 HP still counts as in the battle.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${sedusa} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);

    fireEvent.click(addButton(cynthia));
    expect(
      within(picker(cynthia)!)
        .getAllByRole("button")
        .map((row) => row.getAttribute("aria-label")),
    ).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add +1 Shield",
      "Add +1 Stone",
      "Add Favored Enemy",
    ]);
    for (let i = 0; i < 3; i++) fireEvent.click(option(cynthia, "Add +1 Stone"));
    expect(option(cynthia, "Add +1 Stone")).toBeDisabled();
    fireEvent.click(option(cynthia, "Add +1 Shield"));
    expect(stoneChip(cynthia)).toHaveAccessibleName(`${cynthia}: 3 +1 Stone tokens. Show controls`);

    // Stone comes after Shield in the row, whatever order they were added.
    const shield = screen.getByRole("button", { name: new RegExp(`^${cynthia}: 1 \\+1 Shield`) });
    expect(
      shield.compareDocumentPosition(stoneChip(cynthia)!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Reaching 3 doesn't defeat the hero: HP is untouched.
    expect(screen.getByLabelText(`${cynthia} HP`, { exact: true })).not.toHaveValue(0);
  });
});

describe("Home: +1 Chill (intent/13)", () => {
  const offersChill = (heroId: HeroId) => offersToken(heroId, "Add +1 Chill");
  const chillChip = (name: string) => countedChip(name, "Chill");

  it("offers it only on Dazeem's enemies when he's on Player 1, never on his own team", () => {
    seedDraft(
      ["dazeem", "baldwin", "boreas", "caligar"],
      ["ceralin", "cynthia", "felix", "kerrick"],
    );
    render(<Home />);

    for (const id of ["ceralin", "cynthia", "felix", "kerrick"] as const) {
      expect(offersChill(id)).toBe(true);
    }
    for (const id of ["dazeem", "baldwin", "boreas", "caligar"] as const) {
      expect(offersChill(id)).toBe(false);
    }
  });

  it("offers it only on Player 1 when Dazeem is on Player 2", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "dazeem", "felix", "kerrick"],
    );
    render(<Home />);

    expect(offersChill("baldwin")).toBe(true);
    expect(offersChill("cynthia")).toBe(false);
    expect(offersChill("dazeem")).toBe(false);
  });

  it("offers it to nobody without Dazeem", () => {
    seedDraft(
      ["baldwin", "boreas", "caligar", "ceralin"],
      ["cynthia", "dolgolae", "felix", "kerrick"],
    );
    render(<Home />);

    for (const id of ["baldwin", "boreas", "caligar", "ceralin", "cynthia", "dolgolae"] as const) {
      expect(offersChill(id)).toBe(false);
    }
  });

  it("adds one per tap up to 5, after Stone, kept apart from +1 Attack, with Dazeem at 0 HP", () => {
    // Sedusa and Dazeem against Cyrus's team, so the picker shows all
    // three counted hero-specific tokens.
    seedDraft(["sedusa", "dazeem", "boreas", "caligar"], ["cyrus", "cynthia", "baldwin", "felix"]);
    render(<Home />);
    const dazeem = getHeroById("dazeem").name;
    const cynthia = getHeroById("cynthia").name;

    // Dazeem at 0 HP still counts as in the battle.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${dazeem} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);

    fireEvent.click(addButton(cynthia));
    expect(
      within(picker(cynthia)!)
        .getAllByRole("button")
        .map((row) => row.getAttribute("aria-label")),
    ).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add +1 Shield",
      "Add +1 Stone",
      "Add +1 Chill",
      "Add Favored Enemy",
    ]);
    for (let i = 0; i < 5; i++) fireEvent.click(option(cynthia, "Add +1 Chill"));
    expect(option(cynthia, "Add +1 Chill")).toBeDisabled();
    fireEvent.click(option(cynthia, "Add +1 Stone"));
    fireEvent.click(option(cynthia, "Add +1 Attack"));
    expect(chillChip(cynthia)).toHaveAccessibleName(`${cynthia}: 5 +1 Chill tokens. Show controls`);
    // +1 Attack is its own count: never netted against Chill.
    expect(screen.getByRole("button", { name: attackChipName(cynthia) })).toHaveAccessibleName(
      `${cynthia}: 1 +1 Attack token. Show controls`,
    );

    // Chill comes after Stone in the row, whatever order they were added.
    const stone = screen.getByRole("button", { name: new RegExp(`^${cynthia}: 1 \\+1 Stone`) });
    expect(
      stone.compareDocumentPosition(chillChip(cynthia)!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("Home: Favored Enemy (intent/15)", () => {
  const offersFavoredEnemy = (heroId: HeroId) => offersToken(heroId, "Add Favored Enemy");
  const favoredChip = (name: string) => onOffChip(name, "Favored Enemy");

  it("offers it only on Boreas's enemies when he's on Player 1, never on his own team", () => {
    seedDraft(
      ["boreas", "baldwin", "caligar", "ceralin"],
      ["cynthia", "felix", "kerrick", "motley"],
    );
    render(<Home />);

    for (const id of ["cynthia", "felix", "kerrick", "motley"] as const) {
      expect(offersFavoredEnemy(id)).toBe(true);
    }
    for (const id of ["boreas", "baldwin", "caligar", "ceralin"] as const) {
      expect(offersFavoredEnemy(id)).toBe(false);
    }
  });

  it("offers it only on Player 1 when Boreas is on Player 2", () => {
    seedDraft(
      ["baldwin", "caligar", "ceralin", "cynthia"],
      ["boreas", "felix", "kerrick", "motley"],
    );
    render(<Home />);

    expect(offersFavoredEnemy("baldwin")).toBe(true);
    expect(offersFavoredEnemy("felix")).toBe(false);
    expect(offersFavoredEnemy("boreas")).toBe(false);
  });

  it("offers it to nobody without Boreas", () => {
    seedDraft(
      ["baldwin", "caligar", "ceralin", "cynthia"],
      ["dolgolae", "felix", "kerrick", "motley"],
    );
    render(<Home />);

    for (const id of ["baldwin", "caligar", "ceralin", "cynthia", "dolgolae", "felix"] as const) {
      expect(offersFavoredEnemy(id)).toBe(false);
    }
  });

  it("goes on one enemy at a time: hidden from the others until tapped off, with Boreas at 0 HP", () => {
    seedDraft(
      ["boreas", "baldwin", "caligar", "ceralin"],
      ["cynthia", "felix", "kerrick", "motley"],
    );
    render(<Home />);
    const boreas = getHeroById("boreas").name;
    const cynthia = getHeroById("cynthia").name;
    const felix = getHeroById("felix").name;

    // Boreas at 0 HP still counts as in the battle.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${boreas} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);

    fireEvent.click(addButton(cynthia));
    // Last in the picker, after the general tokens.
    expect(
      within(picker(cynthia)!)
        .getAllByRole("button")
        .map((row) => row.getAttribute("aria-label")),
    ).toEqual(["Add +1 Attack", "Add Confuse", "Add Immobilize", "Add Favored Enemy"]);
    fireEvent.click(option(cynthia, "Add Favored Enemy"));
    fireEvent.click(option(cynthia, "Add Confuse"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(favoredChip(cynthia)).toHaveAttribute("aria-pressed", "true");

    // Held by Cynthia, so no other enemy's picker offers it.
    for (const id of ["felix", "kerrick", "motley"] as const) {
      expect(offersFavoredEnemy(id)).toBe(false);
    }

    // Tapped off, it's offered to every enemy again, Cynthia included.
    fireEvent.click(favoredChip(cynthia)!);
    expect(favoredChip(cynthia)).toBeNull();
    expect(screen.getByRole("button", { name: `Confuse token on ${cynthia}` })).toBeInTheDocument();
    for (const id of ["cynthia", "felix", "kerrick", "motley"] as const) {
      expect(offersFavoredEnemy(id)).toBe(true);
    }

    fireEvent.click(addButton(felix));
    fireEvent.click(option(felix, "Add Favored Enemy"));
    expect(favoredChip(felix)).toHaveAttribute("aria-pressed", "true");
    expect(offersFavoredEnemy("cynthia")).toBe(false);
  });
});

describe("Home: Runika's Artifacts (intent/17)", () => {
  const artifactGroups = () => screen.queryAllByRole("group", { name: /'s Artifacts$/ });
  const autoDeflector = () =>
    screen.getByRole("button", {
      name: "Auto Deflector: +1 defense vs melee attacks, on Runika",
    });

  it.each([
    [
      "Player 1",
      ["runika", "baldwin", "caligar", "ceralin"],
      ["cynthia", "felix", "kerrick", "motley"],
    ],
    [
      "Player 2",
      ["baldwin", "caligar", "ceralin", "cynthia"],
      ["runika", "felix", "kerrick", "motley"],
    ],
  ] as const)("shows the row on Runika's card alone when she's on %s", (_label, p1, p2) => {
    seedDraft([...p1], [...p2]);
    render(<Home />);

    const groups = artifactGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveAccessibleName("Runika's Artifacts");
    expect(within(groups[0]).getAllByRole("button")).toHaveLength(3);
  });

  it("shows no row without Runika", () => {
    seedDraft(
      ["baldwin", "caligar", "ceralin", "cynthia"],
      ["dolgolae", "felix", "kerrick", "motley"],
    );
    render(<Home />);

    expect(artifactGroups()).toHaveLength(0);
  });

  it("flips at 0 HP in the respawn area, and the face survives a reload", () => {
    seedDraft(
      ["runika", "baldwin", "caligar", "ceralin"],
      ["cynthia", "felix", "kerrick", "motley"],
    );
    const { unmount } = render(<Home />);
    const runika = getHeroById("runika").name;

    // Every hero starts in the respawn area; take her to 0 HP too.
    const decreaseHp = screen.getByRole("button", { name: `Decrease ${runika} HP` });
    while (!decreaseHp.hasAttribute("disabled")) fireEvent.click(decreaseHp);

    expect(autoDeflector()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(autoDeflector());
    expect(autoDeflector()).toHaveAttribute("aria-pressed", "false");
    unmount();

    render(<Home />);
    expect(autoDeflector()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(autoDeflector());
    expect(autoDeflector()).toHaveAttribute("aria-pressed", "true");
  });
});

function attackChipName(heroName: string): RegExp {
  return new RegExp(`^${heroName}: \\d+ \\+1 Attack token`);
}

function addButton(heroName: string): HTMLElement {
  return screen.getByRole("button", { name: `Add a token to ${heroName}` });
}

/** A hero's open picker popover, or `null` while closed. */
function picker(heroName: string): HTMLElement | null {
  return screen.queryByRole("group", { name: `Add a token to ${heroName}` });
}

function option(heroName: string, name: string | RegExp): HTMLElement {
  return within(picker(heroName)!).getByRole("button", { name });
}
