import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialBattleState } from "../../../lib/battle/reducer";
import type { BattleState } from "../../../lib/battle/types";
import type { Hero } from "../../../lib/draft/types";
import { ARENA_POSITION } from "../../../lib/map/constants";
import { createFreshGoldPiles, MAP_SPACE_IDS } from "../../../data/mapSpaces";
import { dropHero } from "../../../test/heroDrag";
import { NO_TOKENS } from "../../../test/heroState";
import { BattleMapScreen, INITIAL_MAP_CAMERA } from "./BattleMapScreen";

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
    schemaVersion: 11,
    initiative: "p1",
    p1: {
      gold: 0,
      heroes: {
        boreas: {
          hp: 10,
          level: 1,
          ...NO_TOKENS,
        },
        caligar: {
          hp: 0,
          level: 1,
          ...NO_TOKENS,
        },
      },
      structures: { top: 11, middle: 11, bottom: 0, bit: 16 },
      heroPositions: { boreas: MAP_SPACE_IDS[0], caligar: null },
    },
    p2: {
      gold: 0,
      heroes: {
        sterling: {
          hp: 8,
          level: 1,
          ...NO_TOKENS,
        },
      },
      structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
      heroPositions: { sterling: null },
    },
    goldPiles: createFreshGoldPiles(),
    ...overrides,
  } as BattleState;
}

/** No test here exercises zoom/pan, so the camera is fixed at its default;
 * the initiative badge's own behavior is covered by InitiativeBadge.test
 * and page.test. */
const fixedProps = {
  camera: INITIAL_MAP_CAMERA,
  onCameraChange: () => {},
  onPassInitiative: () => {},
};

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
        {...fixedProps}
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
        {...fixedProps}
      />,
    );

    expect(screen.getByAltText("Caligar")).toBeInTheDocument();
    expect(screen.getByAltText("Sterling")).toBeInTheDocument();
  });

  it("shows a hero's +1 Attack tokens in the status panel only above 0", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: {
                hp: 0,
                level: 1,
                ...NO_TOKENS,
                attackTokens: 2,
              },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Only Caligar has tokens, and a defeated hero keeps them (intent/06).
    expect(screen.getAllByLabelText(/\+1 Attack token/)).toHaveLength(1);
    expect(screen.getByLabelText("2 +1 Attack tokens")).toBeInTheDocument();
  });

  it("shows a hero's Confuse token in the status panel only while confused", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: {
                hp: 0,
                level: 1,
                ...NO_TOKENS,
                attackTokens: 2,
                confused: true,
              },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: {
                hp: 8,
                level: 1,
                ...NO_TOKENS,
                confused: true,
              },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar holds both tokens on one line; Sterling, with no +1 Attack
    // tokens, still gets a token line for Confuse alone. Boreas has neither.
    expect(screen.getAllByLabelText("Confused")).toHaveLength(2);
    expect(screen.getAllByLabelText(/\+1 Attack token/)).toHaveLength(1);
  });

  it("shows a hero's Immobilize icon in the status panel only while immobilized", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: {
                hp: 0,
                level: 1,
                ...NO_TOKENS,
                attackTokens: 2,
                confused: true,
                immobilized: true,
              },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: {
                hp: 8,
                level: 1,
                ...NO_TOKENS,
                immobilized: true,
              },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar holds all three on one line (and keeps it at 0 HP); Sterling,
    // with no other token, still gets a token line for Immobilize alone.
    // Boreas isn't immobilized.
    const icons = screen.getAllByLabelText("Immobilized");
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveAttribute("title", "Immobilized");
    expect(screen.getAllByLabelText("Confused")).toHaveLength(1);
    expect(screen.getAllByLabelText(/\+1 Attack token/)).toHaveLength(1);
  });

  it("shows a hero's Death Mark icon in the status panel only while marked", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: {
                hp: 0,
                level: 1,
                ...NO_TOKENS,
                attackTokens: 2,
                confused: true,
                immobilized: true,
                deathMarked: true,
              },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: {
                hp: 8,
                level: 1,
                ...NO_TOKENS,
                deathMarked: true,
              },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar holds all four (and keeps them at 0 HP); Sterling, with no
    // other token, still gets a token line for the Death Mark alone. Boreas
    // isn't marked.
    const icons = screen.getAllByLabelText("Death Mark");
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveAttribute("title", "Death Mark token");
  });

  it("shows a hero's +1 Shield count in the status panel only above 0, after Death Mark", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: { ...base.p1.heroes.caligar, deathMarked: true, shieldTokens: 3 },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: { ...base.p2.heroes.sterling, shieldTokens: 1 },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar (0 HP) keeps his; Sterling gets a token line for Shield alone;
    // Boreas holds none.
    expect(screen.getAllByLabelText(/\+1 Shield token/)).toHaveLength(2);
    const caligarShield = screen.getByLabelText("3 +1 Shield tokens");
    expect(caligarShield).toHaveTextContent("3");
    expect(caligarShield).toHaveAttribute("title", "+1 Shield tokens");
    expect(caligarShield.style.getPropertyValue("--token-accent")).toBe("var(--color-shield)");
    expect(screen.getByLabelText("1 +1 Shield token")).toBeInTheDocument();
    const mark = screen.getByLabelText("Death Mark");
    expect(
      mark.compareDocumentPosition(caligarShield) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows a hero's +1 Stone count in the status panel only above 0, after Shield", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: { ...base.p1.heroes.caligar, shieldTokens: 2, stoneTokens: 3 },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: { ...base.p2.heroes.sterling, stoneTokens: 1 },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar (0 HP) keeps his 3; Sterling gets a token line for Stone alone;
    // Boreas holds none.
    expect(screen.getAllByLabelText(/\+1 Stone token/)).toHaveLength(2);
    const caligarStone = screen.getByLabelText("3 +1 Stone tokens");
    expect(caligarStone).toHaveTextContent("3");
    expect(caligarStone).toHaveAttribute("title", "+1 Stone tokens");
    expect(caligarStone.style.getPropertyValue("--token-accent")).toBe("var(--color-stone)");
    expect(screen.getByLabelText("1 +1 Stone token")).toBeInTheDocument();
    const shield = screen.getByLabelText("2 +1 Shield tokens");
    expect(
      shield.compareDocumentPosition(caligarStone) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows a hero's +1 Chill count in the status panel only above 0, after Stone", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: { ...base.p1.heroes.caligar, stoneTokens: 2, chillTokens: 5 },
            },
          },
          p2: {
            ...base.p2,
            heroes: {
              ...base.p2.heroes,
              sterling: { ...base.p2.heroes.sterling, chillTokens: 1 },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Caligar (0 HP) keeps his 5; Sterling gets a token line for Chill alone;
    // Boreas holds none.
    expect(screen.getAllByLabelText(/\+1 Chill token/)).toHaveLength(2);
    const caligarChill = screen.getByLabelText("5 +1 Chill tokens");
    expect(caligarChill).toHaveTextContent("5");
    expect(caligarChill).toHaveAttribute("title", "+1 Chill tokens");
    expect(caligarChill.style.getPropertyValue("--token-accent")).toBe("var(--color-chill)");
    expect(screen.getByLabelText("1 +1 Chill token")).toBeInTheDocument();
    const stone = screen.getByLabelText("2 +1 Stone tokens");
    expect(
      stone.compareDocumentPosition(caligarChill) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows Favored Enemy in the status panel only while held, after Chill", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            heroes: {
              ...base.p1.heroes,
              caligar: { ...base.p1.heroes.caligar, chillTokens: 2, favoredEnemy: true },
            },
          },
        }}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
      />,
    );

    // Only Caligar (0 HP, still shown) holds it.
    const favored = screen.getByLabelText("Favored Enemy");
    expect(screen.getAllByLabelText("Favored Enemy")).toHaveLength(1);
    expect(favored).toHaveAttribute("title", "Favored Enemy token");
    expect(favored.style.getPropertyValue("--token-accent")).toBe("var(--color-favored-enemy)");
    const chill = screen.getByLabelText("2 +1 Chill tokens");
    expect(chill.compareDocumentPosition(favored) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
        {...fixedProps}
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
        {...fixedProps}
      />,
    );
    expect(screen.getByRole("menuitem", { name: "End Battle" })).toBeInTheDocument();
  });

  it('calls onSwitchView with "battle" when the Board toggle is clicked', () => {
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
        {...fixedProps}
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
        {...fixedProps}
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
        {...fixedProps}
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
      schemaVersion: 12,
      initiative: "p1",
      p1: {
        gold: 0,
        heroes: Object.fromEntries(
          crowdedHeroes.map((h) => [
            h.id,
            {
              hp: 10,
              level: 1,
              ...NO_TOKENS,
            },
          ]),
        ),
        structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
        heroPositions: Object.fromEntries(crowdedHeroes.map((h) => [h.id, sharedSpace])),
      },
      p2: {
        gold: 0,
        heroes: {},
        structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
        heroPositions: {},
      },
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
        {...fixedProps}
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

  describe("the Arena (intent/14)", () => {
    const felixTeam = [makeHero("felix", "Felix"), makeHero("boreas", "Boreas")];
    const enemyTeam = [makeHero("sterling", "Sterling"), makeHero("caligar", "Caligar")];

    /** Felix (p1) deployed at `felixLevel`, with `inArena` already inside. */
    function arenaState(felixLevel: number, inArena: Hero["id"][] = []): BattleState {
      const base = createInitialBattleState(felixTeam, enemyTeam, "p1");
      const place = (side: "p1" | "p2") =>
        Object.fromEntries(
          Object.keys(base[side].heroPositions).map((id) => [
            id,
            inArena.includes(id as Hero["id"]) ? ARENA_POSITION : MAP_SPACE_IDS[0],
          ]),
        ) as BattleState["p1"]["heroPositions"];
      return {
        ...base,
        p1: {
          ...base.p1,
          heroes: { ...base.p1.heroes, felix: { ...base.p1.heroes.felix, level: felixLevel } },
          heroPositions: place("p1"),
        },
        p2: { ...base.p2, heroPositions: place("p2") },
      };
    }

    function renderArena(battleState: BattleState, setHeroPosition = vi.fn()) {
      render(
        <BattleMapScreen
          p1Heroes={felixTeam}
          p2Heroes={enemyTeam}
          battleState={battleState}
          winner={null}
          setHeroPosition={setHeroPosition}
          setGoldPile={() => {}}
          onNewDraft={() => {}}
          onEndBattle={() => {}}
          onSwitchView={() => {}}
          {...fixedProps}
        />,
      );
      return setHeroPosition;
    }

    function dropOnArena(side: "p1" | "p2", heroId: Hero["id"]) {
      dropHero(screen.getByRole("region", { name: "The Arena" }), { side, heroId });
    }

    it("isn't shown without Felix", () => {
      renderArena(makeBattleState());
      expect(screen.queryByRole("region", { name: "The Arena" })).toBeNull();
    });

    it("isn't shown with Felix below level 4", () => {
      renderArena(arenaState(3));
      expect(screen.queryByRole("region", { name: "The Arena" })).toBeNull();
    });

    it("shows an empty Arena with Felix at level 4", () => {
      renderArena(arenaState(4));
      const arena = screen.getByRole("region", { name: "The Arena" });
      expect(arena.querySelectorAll('div[draggable="true"]')).toHaveLength(0);
    });

    it("shows its occupants in the Arena, not on their space", () => {
      renderArena(arenaState(4, ["felix", "sterling"]));
      const arena = screen.getByRole("region", { name: "The Arena" });
      expect(within(arena).getByAltText("Felix")).toBeInTheDocument();
      expect(within(arena).getByAltText("Sterling")).toBeInTheDocument();
      // Each hero's token renders once: the Arena's copy is the only one.
      expect(screen.getAllByAltText("Felix")).toHaveLength(1);
      expect(screen.getAllByAltText("Sterling")).toHaveLength(1);
    });

    it("stays shown while occupied, even with Felix set back to level 1", () => {
      renderArena(arenaState(1, ["sterling"]));
      expect(screen.getByRole("region", { name: "The Arena" })).toBeInTheDocument();
    });

    it("moves Felix or an enemy in on a drop", () => {
      const setHeroPosition = renderArena(arenaState(4));
      dropOnArena("p2", "sterling");
      expect(setHeroPosition).toHaveBeenCalledWith("p2", "sterling", ARENA_POSITION);
    });

    it("refuses Felix's ally and a second enemy", () => {
      const setHeroPosition = renderArena(arenaState(4, ["sterling"]));
      dropOnArena("p1", "boreas");
      dropOnArena("p2", "caligar");
      expect(setHeroPosition).not.toHaveBeenCalled();
    });
  });
});
