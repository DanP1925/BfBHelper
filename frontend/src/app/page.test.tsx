import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";
import { getHeroById, HERO_IDS } from "../data/heroes";
import { battleReducer, createInitialBattleState } from "../lib/battle/reducer";
import { saveBattleState, saveDraft, saveView } from "../lib/persistence/storage";

/** Saves a finished draft (first 8 heroes, split 4/4) and returns a fresh
 * battle state for it — callers save it as-is or after edits. */
function seedDoneDraft() {
  const p1Ids = HERO_IDS.slice(0, 4);
  const p2Ids = HERO_IDS.slice(4, 8);
  saveDraft({ initiative: "p1", picks: { p1: p1Ids, p2: p2Ids } });
  return createInitialBattleState(p1Ids.map(getHeroById), p2Ids.map(getHeroById), "p1");
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
    expect(option(p1Name, /^Add \+1 Attack, 2 held/)).toHaveTextContent("×2");

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
