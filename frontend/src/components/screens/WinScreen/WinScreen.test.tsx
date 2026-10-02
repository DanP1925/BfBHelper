import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BattleState } from "../../../lib/battle/types";
import type { Hero } from "../../../lib/draft/types";
import { WinScreen } from "./WinScreen";

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
const p2Heroes: Hero[] = [makeHero("sterling", "Sterling"), makeHero("felix", "Felix")];

function makeBattleState(): BattleState {
  return {
    schemaVersion: 1,
    p1: {
      gold: 5,
      heroes: {
        boreas: { hp: 10, level: 2 },
        caligar: { hp: 0, level: 1 },
      },
      structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
    },
    p2: {
      gold: 3,
      heroes: {
        sterling: { hp: 7, level: 3 },
        felix: { hp: 9, level: 1 },
      },
      structures: { top: 11, middle: 0, bottom: 11, bit: 0 },
    },
  } as BattleState;
}

describe("WinScreen", () => {
  it("renders a 'Player 1 Wins!' heading and a Winner ribbon when p1 wins", () => {
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner="p1"
        onNewDraft={() => {}}
      />,
    );
    expect(screen.getByText("Player 1 Wins!")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });

  it("renders a 'Player 2 Wins!' heading when p2 wins", () => {
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner="p2"
        onNewDraft={() => {}}
      />,
    );
    expect(screen.getByText("Player 2 Wins!")).toBeInTheDocument();
  });

  it("renders a 'Draw' heading with no Winner ribbon on either side", () => {
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner="draw"
        onNewDraft={() => {}}
      />,
    );
    expect(screen.getByText("Draw")).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("calls onNewDraft when the footer button is clicked", () => {
    const onNewDraft = vi.fn();
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState()}
        winner="draw"
        onNewDraft={onNewDraft}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /new draft/i }));
    expect(onNewDraft).toHaveBeenCalledOnce();
  });
});
