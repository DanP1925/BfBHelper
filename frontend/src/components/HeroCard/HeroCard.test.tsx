import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHeroById } from "../../data/heroes";
import { HeroCard } from "./HeroCard";

const boreas = getHeroById("boreas");

type RowState = { attackTokens?: number; confused?: boolean; immobilized?: boolean };

function renderRow(state: RowState = {}, { open = true, chipOpen = false } = {}) {
  const handlers = {
    attack: vi.fn(),
    confused: vi.fn(),
    immobilized: vi.fn(),
  };
  render(
    <HeroCard
      hero={boreas}
      variant="battle"
      hp={10}
      level={1}
      tokenPicker={{ expanded: open, onExpandedChange: vi.fn() }}
      attackTokens={{
        count: state.attackTokens ?? 0,
        onChange: handlers.attack,
        expanded: chipOpen,
        onExpandedChange: vi.fn(),
      }}
      confused={{ on: state.confused ?? false, onChange: handlers.confused }}
      immobilized={{ on: state.immobilized ?? false, onChange: handlers.immobilized }}
    />,
  );
  return handlers;
}

const popover = () => screen.queryByRole("group", { name: "Add a token to Boreas" });
const optionNames = () =>
  within(popover()!)
    .getAllByRole("button")
    .map((row) => row.getAttribute("aria-label"));

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

  it("drops held on/off tokens from the picker but keeps +1 Attack with its count", () => {
    renderRow({ attackTokens: 2, immobilized: true });

    expect(optionNames()).toEqual(["Add +1 Attack, 2 held", "Add Confuse"]);
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

    expect(
      within(popover()!).getByRole("button", { name: "Add +1 Attack, 9 held" }),
    ).toBeDisabled();
  });

  it("a tap on a held on/off chip removes it", () => {
    const handlers = renderRow({ confused: true }, { open: false });

    fireEvent.click(screen.getByRole("button", { name: "Confuse token on Boreas" }));
    expect(handlers.confused).toHaveBeenCalledWith(false);
  });

  it("keeps the +1 Attack chip at 0 while its stepper is open", () => {
    renderRow({ attackTokens: 0 }, { open: false, chipOpen: true });

    expect(
      screen.getByRole("button", { name: "Boreas: 0 +1 Attack tokens. Hide controls" }),
    ).toBeInTheDocument();
  });

  it("has no token row without a picker (the Win Screen)", () => {
    render(<HeroCard hero={boreas} variant="battle" hp={10} level={1} />);

    expect(screen.queryByRole("button", { name: "Add a token to Boreas" })).toBeNull();
  });
});
