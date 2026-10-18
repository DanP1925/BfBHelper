import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BattleState } from "../../../lib/battle/types";
import type { Hero } from "../../../lib/draft/types";
import { NO_TOKENS } from "../../../test/heroState";
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
    schemaVersion: 11,
    initiative: "p1",
    p1: {
      gold: 5,
      heroes: {
        boreas: {
          hp: 10,
          level: 2,
          ...NO_TOKENS,
        },
        caligar: {
          hp: 0,
          level: 1,
          ...NO_TOKENS,
        },
      },
      structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
      heroPositions: { boreas: null, caligar: null },
    },
    p2: {
      gold: 3,
      heroes: {
        sterling: {
          hp: 7,
          level: 3,
          ...NO_TOKENS,
        },
        felix: {
          hp: 9,
          level: 1,
          ...NO_TOKENS,
        },
      },
      structures: { top: 11, middle: 0, bottom: 11, bit: 0 },
      heroPositions: { sterling: null, felix: null },
    },
    goldPiles: { "gold-ne": 3, "gold-mid": 3, "gold-sw": 3 },
  } as unknown as BattleState;
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

  it("shows no token controls on the cards (intents 06-13)", () => {
    const base = makeBattleState();
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              boreas: {
                ...base.p1.heroes.boreas,
                shieldTokens: 3,
                stoneTokens: 2,
                chillTokens: 4,
                favoredEnemy: true,
              },
            },
          },
        }}
        winner="p1"
        onNewDraft={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Confuse token on / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Immobilized on / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+1 Attack token/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add a token to / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Death Mark token on / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+1 Shield token/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+1 Stone token/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+1 Chill token/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Favored Enemy token on / }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Favored Enemy")).not.toBeInTheDocument();
  });

  it("shows no Artifacts on Runika's card (intent/17)", () => {
    const base = makeBattleState();
    render(
      <WinScreen
        p1Heroes={p1Heroes}
        p2Heroes={[...p2Heroes, makeHero("runika", "Runika")]}
        battleState={{
          ...base,
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              runika: { hp: 9, level: 1, ...NO_TOKENS, autoDeflectorFaceUp: false },
            },
          },
        }}
        winner="p2"
        onNewDraft={() => {}}
      />,
    );
    expect(screen.queryByRole("group", { name: "Runika's Artifacts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Battle Fist/ })).not.toBeInTheDocument();
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
