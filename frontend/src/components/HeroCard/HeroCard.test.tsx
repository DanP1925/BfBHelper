import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHeroById } from "../../data/heroes";
import type { CountedTokenField } from "../battleTokens";
import { HeroCard } from "./HeroCard";

const boreas = getHeroById("boreas");

/** The hero-specific tokens (`deathMarked`, `shieldTokens`, `stoneTokens`,
 * `chillTokens`) are only passed when set, as the Board does for heroes who
 * can take them. */
type RowState = {
  attackTokens?: number;
  confused?: boolean;
  immobilized?: boolean;
  deathMarked?: boolean;
  shieldTokens?: number;
  stoneTokens?: number;
  chillTokens?: number;
};

/** `openChip` names the counted chip whose stepper is open, if any. */
function renderRow(
  state: RowState = {},
  { open = true, openChip }: { open?: boolean; openChip?: CountedTokenField } = {},
) {
  const handlers = {
    attack: vi.fn(),
    confused: vi.fn(),
    immobilized: vi.fn(),
    deathMarked: vi.fn(),
    shield: vi.fn(),
    stone: vi.fn(),
    chill: vi.fn(),
  };
  render(
    <HeroCard
      hero={boreas}
      variant="battle"
      hp={10}
      level={1}
      tokenPicker={{ expanded: open, onExpandedChange: vi.fn() }}
      tokens={{
        attackTokens: {
          count: state.attackTokens ?? 0,
          onChange: handlers.attack,
          expanded: openChip === "attackTokens",
          onExpandedChange: vi.fn(),
        },
        confused: { on: state.confused ?? false, onChange: handlers.confused },
        immobilized: { on: state.immobilized ?? false, onChange: handlers.immobilized },
        deathMarked:
          state.deathMarked === undefined
            ? undefined
            : { on: state.deathMarked, onChange: handlers.deathMarked },
        shieldTokens:
          state.shieldTokens === undefined
            ? undefined
            : {
                count: state.shieldTokens,
                onChange: handlers.shield,
                expanded: openChip === "shieldTokens",
                onExpandedChange: vi.fn(),
              },
        stoneTokens:
          state.stoneTokens === undefined
            ? undefined
            : {
                count: state.stoneTokens,
                onChange: handlers.stone,
                expanded: openChip === "stoneTokens",
                onExpandedChange: vi.fn(),
              },
        chillTokens:
          state.chillTokens === undefined
            ? undefined
            : {
                count: state.chillTokens,
                onChange: handlers.chill,
                expanded: openChip === "chillTokens",
                onExpandedChange: vi.fn(),
              },
      }}
    />,
  );
  return handlers;
}

const popover = () => screen.queryByRole("group", { name: "Add a token to Boreas" });
const optionNames = () =>
  within(popover()!)
    .getAllByRole("button")
    .map((row) => row.getAttribute("aria-label"));

function renderMarkable(deathMarked: boolean, open: boolean) {
  const onChange = vi.fn();
  render(
    <HeroCard
      hero={boreas}
      variant="battle"
      hp={0}
      level={1}
      tokenPicker={{ expanded: open, onExpandedChange: vi.fn() }}
      tokens={{
        attackTokens: { count: 0, onChange: vi.fn(), expanded: false, onExpandedChange: vi.fn() },
        confused: { on: false, onChange: vi.fn() },
        immobilized: { on: true, onChange: vi.fn() },
        deathMarked: { on: deathMarked, onChange },
      }}
    />,
  );
  return onChange;
}

describe("HeroCard Death Mark (intent/09)", () => {
  it("is the last option, even on a hero at 0 HP, and picking it marks the hero", () => {
    const onChange = renderMarkable(false, true);

    expect(optionNames()).toEqual(["Add +1 Attack", "Add Confuse", "Add Death Mark"]);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add Death Mark" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows a crimson chip after Immobilize while marked, and a tap removes it", () => {
    const onChange = renderMarkable(true, false);

    const chip = screen.getByRole("button", { name: "Death Mark token on Boreas" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("title", "Death Mark token (tap to remove)");
    expect(chip.style.getPropertyValue("--token-accent")).toBe("var(--color-death-mark)");
    const immobilized = screen.getByRole("button", { name: "Immobilized on Boreas" });
    expect(
      immobilized.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("HeroCard token row", () => {
  it("shows only the '+' when nothing is held", () => {
    renderRow({}, { open: false });

    expect(screen.getByRole("button", { name: "Add a token to Boreas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+1 Attack token/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Confuse token on Boreas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Immobilized on Boreas" })).toBeNull();
  });

  it("offers every token, in the fixed order, while nothing is held", () => {
    renderRow();

    expect(optionNames()).toEqual(["Add +1 Attack", "Add Confuse", "Add Immobilize"]);
  });

  it("shows held chips in the fixed order, then the '+'", () => {
    renderRow({ attackTokens: 2, confused: true, immobilized: true }, { open: false });

    const inOrder = [
      "Boreas: 2 +1 Attack tokens. Show controls",
      "Confuse token on Boreas",
      "Immobilized on Boreas",
      "Add a token to Boreas",
    ].map((name) => screen.getByRole("button", { name }));
    for (let i = 1; i < inOrder.length; i++) {
      expect(
        inOrder[i - 1].compareDocumentPosition(inOrder[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("drops held on/off tokens from the picker but keeps +1 Attack, with no count", () => {
    renderRow({ attackTokens: 2, immobilized: true });

    expect(optionNames()).toEqual(["Add +1 Attack", "Add Confuse"]);
    expect(popover()).not.toHaveTextContent("×");
  });

  it("picking adds one +1 Attack, or turns an on/off token on", () => {
    const handlers = renderRow({ attackTokens: 2 });

    fireEvent.click(within(popover()!).getByRole("button", { name: /^Add \+1 Attack/ }));
    expect(handlers.attack).toHaveBeenCalledWith(3);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add Confuse" }));
    expect(handlers.confused).toHaveBeenCalledWith(true);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add Immobilize" }));
    expect(handlers.immobilized).toHaveBeenCalledWith(true);
  });

  it("disables +1 Attack in the picker at the ceiling", () => {
    renderRow({ attackTokens: 9 });

    expect(within(popover()!).getByRole("button", { name: "Add +1 Attack" })).toBeDisabled();
  });

  it("a tap on a held on/off chip removes it", () => {
    const handlers = renderRow({ confused: true }, { open: false });

    fireEvent.click(screen.getByRole("button", { name: "Confuse token on Boreas" }));
    expect(handlers.confused).toHaveBeenCalledWith(false);
  });

  it("keeps the +1 Attack chip at 0 while its stepper is open", () => {
    renderRow({ attackTokens: 0 }, { open: false, openChip: "attackTokens" });

    expect(
      screen.getByRole("button", { name: "Boreas: 0 +1 Attack tokens. Hide controls" }),
    ).toBeInTheDocument();
  });

  it("offers Death Mark only when it's passed, after Immobilize", () => {
    renderRow();
    expect(optionNames()).not.toContain("Add Death Mark");
  });

  it("offers +1 Shield last, after Death Mark, adding one per tap, with its chip while held", () => {
    const handlers = renderRow({ deathMarked: false, shieldTokens: 2 });

    expect(optionNames()).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add Death Mark",
      "Add +1 Shield",
    ]);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add +1 Shield" }));
    expect(handlers.shield).toHaveBeenCalledWith(3);
    const chip = screen.getByRole("button", { name: "Boreas: 2 +1 Shield tokens. Show controls" });
    expect(chip).toHaveTextContent("×2");
    expect(chip).toHaveAttribute("title", "+1 Shield tokens");
  });

  it("disables +1 Shield in the picker at the ceiling", () => {
    renderRow({ shieldTokens: 9 });

    expect(within(popover()!).getByRole("button", { name: "Add +1 Shield" })).toBeDisabled();
  });

  it("offers no +1 Shield when it isn't passed", () => {
    renderRow();
    expect(optionNames()).not.toContain("Add +1 Shield");
  });

  it("offers +1 Stone last, after +1 Shield, adding one per tap, with its grey chip while held", () => {
    const handlers = renderRow({ deathMarked: false, shieldTokens: 0, stoneTokens: 1 });

    expect(optionNames()).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add Death Mark",
      "Add +1 Shield",
      "Add +1 Stone",
    ]);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add +1 Stone" }));
    expect(handlers.stone).toHaveBeenCalledWith(2);
    const chip = screen.getByRole("button", { name: "Boreas: 1 +1 Stone token. Show controls" });
    expect(chip).toHaveTextContent("×1");
    expect(chip).toHaveAttribute("title", "+1 Stone tokens");
  });

  it("disables +1 Stone at 3, in the picker and on the open chip's +", () => {
    renderRow({ stoneTokens: 3 }, { openChip: "stoneTokens" });

    expect(within(popover()!).getByRole("button", { name: "Add +1 Stone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add +1 Stone token to Boreas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove +1 Stone token from Boreas" })).toBeEnabled();
  });

  it("offers no +1 Stone when it isn't passed, and shows no chip at 0", () => {
    renderRow();
    expect(optionNames()).not.toContain("Add +1 Stone");
    expect(screen.queryByRole("button", { name: /\+1 Stone token/ })).toBeNull();
  });

  it("offers +1 Chill last, after +1 Stone, adding one per tap, with its cyan chip while held", () => {
    const handlers = renderRow({ shieldTokens: 0, stoneTokens: 0, chillTokens: 2 });

    expect(optionNames()).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add +1 Shield",
      "Add +1 Stone",
      "Add +1 Chill",
    ]);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add +1 Chill" }));
    expect(handlers.chill).toHaveBeenCalledWith(3);
    const chip = screen.getByRole("button", { name: "Boreas: 2 +1 Chill tokens. Show controls" });
    expect(chip).toHaveTextContent("×2");
    expect(chip).toHaveAttribute("title", "+1 Chill tokens");
  });

  it("disables +1 Chill at 5, in the picker and on the open chip's +", () => {
    renderRow({ chillTokens: 5 }, { openChip: "chillTokens" });

    expect(within(popover()!).getByRole("button", { name: "Add +1 Chill" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add +1 Chill token to Boreas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove +1 Chill token from Boreas" })).toBeEnabled();
  });

  it("shows no Chill chip at 0", () => {
    renderRow({ chillTokens: 0 }, { open: false });
    expect(screen.queryByRole("button", { name: /\+1 Chill token/ })).toBeNull();
  });

  it("offers no +1 Chill option when chillTokens isn't passed", () => {
    renderRow();
    expect(optionNames()).not.toContain("Add +1 Chill");
  });

  it("has no token row without a picker (the Win Screen)", () => {
    render(<HeroCard hero={boreas} variant="battle" hp={10} level={1} />);

    expect(screen.queryByRole("button", { name: "Add a token to Boreas" })).toBeNull();
  });
});
