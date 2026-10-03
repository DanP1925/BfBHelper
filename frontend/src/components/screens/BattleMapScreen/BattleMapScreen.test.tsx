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
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    expect(screen.getByText("Boreas")).toBeInTheDocument();
  });

  it("renders an undeployed/defeated hero in its side's respawn area", () => {
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
      />,
    );

    expect(screen.getByText("Caligar")).toBeInTheDocument();
    expect(screen.getByText("Sterling")).toBeInTheDocument();
  });

  it('shows "End Battle" in the menu only once a winner exists', () => {
    const { rerender } = render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner={null}
        setHeroPosition={() => {}}
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
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={onSwitchView}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    expect(onSwitchView).toHaveBeenCalledWith("battle");
  });
});
