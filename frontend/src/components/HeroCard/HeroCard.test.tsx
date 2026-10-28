import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHeroById } from "../../data/heroes";
import type { CountedTokenField } from "../../lib/battle/types";
import type { HeroId } from "../../lib/draft/types";
import { HeroCard } from "./HeroCard";

const boreas = getHeroById("boreas");

/** The hero-specific tokens (`deathMarked`, `shieldTokens`, `stoneTokens`,
 * `chillTokens`, `favoredEnemy`) are only passed when set, as the Board does
 * for heroes who can take them. */
type RowState = {
  attackTokens?: number;
  confused?: boolean;
  immobilized?: boolean;
  deathMarked?: boolean;
  shieldTokens?: number;
  stoneTokens?: number;
  chillTokens?: number;
  favoredEnemy?: boolean;
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
    favoredEnemy: vi.fn(),
  };
  // A counted token's props, or undefined when it isn't passed. +1 Attack
  // is always passed, at 0 by default.
  const counts: RowState = { attackTokens: 0, ...state };
  const counted = (field: CountedTokenField, onChange: () => void) => {
    const count = counts[field];
    return count === undefined
      ? undefined
      : {
          count,
          onChange,
          expanded: openChip === field,
          onExpandedChange: vi.fn(),
        };
  };
  render(
    <HeroCard
      hero={boreas}
      variant="battle"
      hp={10}
      level={1}
      tokenPicker={{ expanded: open, onExpandedChange: vi.fn() }}
      tokens={{
        attackTokens: counted("attackTokens", handlers.attack)!,
        confused: { on: state.confused ?? false, onChange: handlers.confused },
        immobilized: { on: state.immobilized ?? false, onChange: handlers.immobilized },
        deathMarked:
          state.deathMarked === undefined
            ? undefined
            : { on: state.deathMarked, onChange: handlers.deathMarked },
        shieldTokens: counted("shieldTokens", handlers.shield),
        stoneTokens: counted("stoneTokens", handlers.stone),
        chillTokens: counted("chillTokens", handlers.chill),
        favoredEnemy:
          state.favoredEnemy === undefined
            ? undefined
            : { on: state.favoredEnemy, onChange: handlers.favoredEnemy },
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

  it("offers Favored Enemy last, after +1 Chill, and picking it turns it on", () => {
    const handlers = renderRow({ chillTokens: 0, favoredEnemy: false });

    expect(optionNames()).toEqual([
      "Add +1 Attack",
      "Add Confuse",
      "Add Immobilize",
      "Add +1 Chill",
      "Add Favored Enemy",
    ]);
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add Favored Enemy" }));
    expect(handlers.favoredEnemy).toHaveBeenCalledWith(true);
  });

  it("shows a lit Favored Enemy chip after Chill while held, not in the picker, and a tap removes it", () => {
    const handlers = renderRow({ chillTokens: 1, favoredEnemy: true });

    expect(optionNames()).not.toContain("Add Favored Enemy");
    const chip = screen.getByRole("button", { name: "Favored Enemy token on Boreas" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const chill = screen.getByRole("button", { name: /^Boreas: 1 \+1 Chill token/ });
    expect(chill.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(chip);
    expect(handlers.favoredEnemy).toHaveBeenCalledWith(false);
  });

  it("offers no Favored Enemy when it isn't passed", () => {
    renderRow();
    expect(optionNames()).not.toContain("Add Favored Enemy");
  });

  it("has no token row without a picker (the Win Screen)", () => {
    render(<HeroCard hero={boreas} variant="battle" hp={10} level={1} />);

    expect(screen.queryByRole("button", { name: "Add a token to Boreas" })).toBeNull();
  });
});

describe("HeroCard Artifacts (intent/17)", () => {
  const runika = getHeroById("runika");

  function renderRunika({ withArtifacts = true } = {}) {
    const onChange = vi.fn();
    render(
      <HeroCard
        hero={runika}
        variant="battle"
        hp={9}
        level={1}
        tokenPicker={{ expanded: true, onExpandedChange: vi.fn() }}
        tokens={{
          attackTokens: { count: 0, onChange: vi.fn(), expanded: false, onExpandedChange: vi.fn() },
          confused: { on: false, onChange: vi.fn() },
          immobilized: { on: false, onChange: vi.fn() },
        }}
        artifacts={
          withArtifacts
            ? {
                faces: {
                  battleFistFaceUp: true,
                  autoDeflectorFaceUp: false,
                  shieldAmuletFaceUp: true,
                },
                onChange,
              }
            : undefined
        }
      />,
    );
    return onChange;
  }

  const artifactGroup = () => screen.queryByRole("group", { name: "Runika's Artifacts" });

  it("has no artifact row when `artifacts` isn't passed", () => {
    renderRunika({ withArtifacts: false });
    expect(artifactGroup()).toBeNull();
  });

  it("shows all three in order, face-down ones still there, with name and bonus", () => {
    renderRunika();
    const pills = within(artifactGroup()!).getAllByRole("button");
    expect(pills.map((pill) => pill.getAttribute("aria-label"))).toEqual([
      "Battle Fist: +1 Attack, on Runika",
      "Auto Deflector: +1 defense vs melee attacks, on Runika",
      "Shield Amulet: +1 defense vs magic attacks, on Runika",
    ]);
    expect(pills.map((pill) => pill.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "true",
    ]);
  });

  it("a tap flips just that Artifact", () => {
    const onChange = renderRunika();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Auto Deflector: +1 defense vs melee attacks, on Runika",
      }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("autoDeflectorFaceUp", true);
  });

  it("keeps the Artifacts out of the token row and the picker", () => {
    renderRunika();
    const picker = screen.getByRole("group", { name: "Add a token to Runika" });
    expect(within(picker).queryByText(/Battle Fist|Auto Deflector|Shield Amulet/)).toBeNull();
    expect(artifactGroup()!.contains(picker)).toBe(false);
  });
});

describe("HeroCard level-up gold (intent/22)", () => {
  function renderLevel(heroId: HeroId, level: number, canAffordLevelUp?: boolean) {
    render(
      <HeroCard
        hero={getHeroById(heroId)}
        variant="battle"
        hp={8}
        level={level}
        onLevelChange={vi.fn()}
        canAffordLevelUp={canAffordLevelUp}
      />,
    );
  }
  const cost = () => screen.queryByRole("img", { name: /next level costs/ });

  it("shows the level as text, not a typed input", () => {
    renderLevel("ceralin", 2, true);
    expect(screen.queryByRole("spinbutton", { name: "Ceralin level" })).toBeNull();
    expect(screen.getByRole("status", { name: "Ceralin level" })).toHaveTextContent("2");
  });

  it("shows the next level's price when the team can afford it", () => {
    renderLevel("ceralin", 2, true);
    expect(cost()).toHaveAccessibleName("Ceralin's next level costs 3 gold");
    expect(cost()).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Increase Ceralin level" })).not.toBeDisabled();
  });

  it("shows Ken Obi's discounted price", () => {
    renderLevel("ken-obi", 1, true);
    expect(cost()).toHaveAccessibleName("Ken Obi's next level costs 1 gold");
  });

  it("hides the price and disables + when the team can't afford it", () => {
    renderLevel("ceralin", 2, false);
    expect(cost()).toBeNull();
    expect(screen.getByRole("button", { name: "Increase Ceralin level" })).toBeDisabled();
  });

  it("hides the price at level 4", () => {
    renderLevel("ceralin", 4, false);
    expect(cost()).toBeNull();
    expect(screen.getByRole("button", { name: "Increase Ceralin level" })).toBeDisabled();
  });
});

describe("HeroCard respawn window (intent/24)", () => {
  function renderWindow(hp: number, respawnWindow?: { from: number; to: number | null } | null) {
    render(
      <HeroCard
        hero={boreas}
        variant="battle"
        hp={hp}
        level={1}
        onHpChange={vi.fn()}
        respawnWindow={respawnWindow}
      />,
    );
  }

  const band = () => screen.queryByTitle(/^Boreas respawns /);

  it("shows the window over a defeated hero's portrait", () => {
    renderWindow(0, { from: 4, to: 6 });
    expect(band()).toHaveAttribute("title", "Boreas respawns Round 4–6");
    expect(band()).toHaveTextContent(/^RespawnRound 4–6$/);
  });

  it("shows the single-round and open-ended forms", () => {
    renderWindow(0, { from: 7, to: null });
    expect(band()).toHaveTextContent("Round 7+");
  });

  it("shows nothing on a standing hero, or a defeated one with no window", () => {
    renderWindow(5, { from: 4, to: 6 });
    expect(band()).toBeNull();
    renderWindow(0, null);
    expect(band()).toBeNull();
    renderWindow(0);
    expect(band()).toBeNull();
  });
});
