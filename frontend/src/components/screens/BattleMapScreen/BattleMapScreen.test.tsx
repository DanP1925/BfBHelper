import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BattleState } from "../../../lib/battle/types";
import type { Hero } from "../../../lib/draft/types";
import { createFreshGoldPiles, MAP_SPACE_IDS } from "../../../data/mapSpaces";
import { BattleMapScreen } from "./BattleMapScreen";

function makeHero(id: Hero["id"], name: string): Hero {
  return {
    id,
    name,
    className: "Test Class",
    portrait: `/portraits/${id}.png`,
    battleToken: `/heroes-tokens/${id}.png`,
    baseHp: 10,
  };
}

const p1Heroes: Hero[] = [makeHero("boreas", "Boreas"), makeHero("caligar", "Caligar")];
const p2Heroes: Hero[] = [makeHero("sterling", "Sterling")];

function makeBattleState(overrides?: Partial<BattleState>): BattleState {
  return {
    schemaVersion: 2,
    p1: {
      gold: 0,
      heroes: { boreas: { hp: 10, level: 1 }, caligar: { hp: 0, level: 1 } },
      structures: { top: 11, middle: 11, bottom: 0, bit: 16 },
      heroPositions: { boreas: MAP_SPACE_IDS[0], caligar: null },
    },
    p2: {
      gold: 0,
      heroes: { sterling: { hp: 8, level: 1 } },
      structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
      heroPositions: { sterling: null },
    },
    goldPiles: createFreshGoldPiles(),
    ...overrides,
  } as BattleState;
}

describe("BattleMapScreen", () => {
  it("renders a deployed hero's token on the board, not in the respawn area", () => {
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    // getByAltText, not getByText — MapTeamStatusPanel also shows every
    // hero's name as plain text, so a deployed hero's name is on the page
    // twice; its MapToken (an <img alt={hero.name}>) renders exactly once.
    expect(screen.getByAltText("Boreas")).toBeInTheDocument();
  });

  it("renders an undeployed/defeated hero in its side's respawn area", () => {
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    expect(screen.getByAltText("Caligar")).toBeInTheDocument();
    expect(screen.getByAltText("Sterling")).toBeInTheDocument();
  });

  it('shows "End Battle" in the menu only once a winner exists', () => {
    const { rerender } = render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    expect(screen.queryByRole("menuitem", { name: "End Battle" })).not.toBeInTheDocument();

    // The menu is still open (OverflowMenu's own state persists across
    // this rerender) — no second click, which would instead toggle it closed.
    rerender(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner="p1"
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );
    expect(screen.getByRole("menuitem", { name: "End Battle" })).toBeInTheDocument();
  });

  it("calls onSwitchView with \"battle\" when the Board toggle is clicked", () => {
    const onSwitchView = vi.fn();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={onSwitchView}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    expect(onSwitchView).toHaveBeenCalledWith("battle");
  });

  it("doesn't render a destroyed structure's icon", () => {
    // makeBattleState's p1.structures.bottom is already 0.
    const { container } = render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    // Scoped to the board itself (a sibling of its background art, inside
    // .boardTransform) — MapTeamStatusPanel also renders this same icon
    // path for its (dimmed, not hidden) Structures row, which would
    // otherwise inflate this count independent of what's on the board.
    const boardLayer = container.querySelector('img[src="/map/board.jpg"]')?.parentElement;
    // 3 p1 Tower slots total (top/middle/bottom) share this one icon path;
    // "bottom" is destroyed (hp 0, see makeBattleState) and MapSpace hides
    // a destroyed structure's icon entirely, so only the other 2 (top,
    // middle) should render on the board.
    expect(boardLayer?.querySelectorAll('img[src="/structures/tower-red.png"]').length).toBe(2);
  });

  it("doesn't render an emptied gold pile's on-board marker", () => {
    const goldPiles = createFreshGoldPiles();
    const emptiedId = Object.keys(goldPiles)[0] as keyof typeof goldPiles;
    goldPiles[emptiedId] = 0;

    const { container } = render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState({ goldPiles })}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    // 3 gold spaces total; 1 emptied -> only 2 on-board markers, not 3.
    // (Scoped to div, not img: GoldPilesBar's own gold icons share a
    // similarly-named class and render regardless of count.)
    expect(container.querySelectorAll('div[class*="goldMarker"]').length).toBe(2);
  });

  it("fans out 4+ heroes sharing one space instead of collapsing to a point", () => {
    const crowdedHeroes = [
      makeHero("boreas", "Boreas"),
      makeHero("caligar", "Caligar"),
      makeHero("ceralin", "Ceralin"),
      makeHero("cynthia", "Cynthia"),
    ];
    const sharedSpace = MAP_SPACE_IDS[0];
    const battleState: BattleState = {
      schemaVersion: 2,
      p1: {
        gold: 0,
        heroes: Object.fromEntries(crowdedHeroes.map((h) => [h.id, { hp: 10, level: 1 }])),
        structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
        heroPositions: Object.fromEntries(crowdedHeroes.map((h) => [h.id, sharedSpace])),
      },
      p2: { gold: 0, heroes: {}, structures: { top: 11, middle: 11, bottom: 11, bit: 16 }, heroPositions: {} },
      goldPiles: createFreshGoldPiles(),
    } as BattleState;

    const { container } = render(
      <BattleMapScreen
        p1Heroes={crowdedHeroes}
        p2Heroes={[]}
        battleState={battleState}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    // Only MapToken renders draggable divs — and with every hero already
    // placed (no one in a respawn area), these 4 are the whole result.
    const offsets = Array.from(container.querySelectorAll('div[draggable="true"]')).map(
      (el) => (el as HTMLElement).style.transform,
    );
    expect(offsets).toHaveLength(4);
    // No two tokens in the group land on the exact same transform (which
    // would mean the fan-out collapsed them on top of each other).
    expect(new Set(offsets).size).toBe(4);
  });
});
