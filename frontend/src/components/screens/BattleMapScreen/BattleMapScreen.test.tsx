import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialBattleState } from "../../../lib/battle/reducer";
import type { BattleState, HeroBattleState } from "../../../lib/battle/types";
import type { Hero } from "../../../lib/draft/types";
import { ARENA_POSITION } from "../../../lib/map/constants";
import { createFreshGoldPiles, MAP_SPACE_IDS } from "../../../data/mapSpaces";
import {
  bearTrapDragTransfer,
  dropBearTrap,
  dropHero,
  dropIceWall,
  fakeDataTransfer,
} from "../../../test/heroDrag";
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
    role: "damage",
  };
}

const p1Heroes: Hero[] = [makeHero("boreas", "Boreas"), makeHero("caligar", "Caligar")];
const p2Heroes: Hero[] = [makeHero("sterling", "Sterling")];

function makeBattleState(overrides?: Partial<BattleState>): BattleState {
  return {
    schemaVersion: 16,
    initiative: "p1",
    iceWall: null,
    bearTrap: null,
    round: 1,
    phase: "orders",
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
 * and page.test. The Ice Wall's tests (`renderWall`) pass their own
 * `setIceWall` and, where they need it, a camera; the Bear Trap's
 * (`renderTrap`) their own `setBearTrap`. The round-and-phase tests pass
 * their own phase callbacks. */
const fixedProps = {
  camera: INITIAL_MAP_CAMERA,
  onCameraChange: () => {},
  onPassInitiative: () => {},
  onAdvancePhase: () => {},
  onStepPhaseBack: () => {},
  setIceWall: () => {},
  setBearTrap: () => {},
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

  it("shows the round and phase in the top bar, and the arrows call the phase props (intent/21)", () => {
    const onAdvancePhase = vi.fn();
    const onStepPhaseBack = vi.fn();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={makeBattleState({ round: 3, phase: "movement" })}
        winner={null}
        setHeroPosition={() => {}}
        setGoldPile={() => {}}
        onNewDraft={() => {}}
        onEndBattle={() => {}}
        onSwitchView={() => {}}
        {...fixedProps}
        onAdvancePhase={onAdvancePhase}
        onStepPhaseBack={onStepPhaseBack}
      />,
    );

    expect(screen.getByText("Round").parentElement).toHaveTextContent("Round3");
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Movement");

    fireEvent.click(screen.getByRole("button", { name: "Forward to Round 3, Action" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Round 3, Orders" }));
    expect(onAdvancePhase).toHaveBeenCalledOnce();
    expect(onStepPhaseBack).toHaveBeenCalledOnce();
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

  it("shows each team's level in the status panel header, in place of its gold", () => {
    const base = makeBattleState();
    render(
      <BattleMapScreen
        p1Heroes={p1Heroes}
        p2Heroes={p2Heroes}
        battleState={{
          ...base,
          p1: {
            ...base.p1,
            gold: 7,
            heroes: {
              ...base.p1.heroes,
              boreas: { ...base.p1.heroes.boreas, level: 3 },
              // Defeated (0 HP), but a hero keeps their level (intent/20).
              caligar: { ...base.p1.heroes.caligar, level: 2 },
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

    const p1Level = screen.getByRole("img", { name: "Player 1 team level 3" });
    expect(screen.getByRole("img", { name: "Player 2 team level 0" })).toBeInTheDocument();
    // The header holds the label and the level only: no team gold (intent/20).
    expect(p1Level.parentElement).toHaveTextContent(/^Player 1Lv3$/);
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

  describe("Runika's Artifacts (intent/17)", () => {
    /** Any Artifact icon's accessible name ("Battle Fist: +1 Attack", …). */
    const ANY_ARTIFACT = /^(Battle Fist|Auto Deflector|Shield Amulet):/;

    /** Renders the Map with Runika added to Player 2 holding `runika`, or
     * without her when it's `null`. */
    function renderWithRunika(runika: Partial<HeroBattleState> | null) {
      const base = makeBattleState();
      render(
        <BattleMapScreen
          p1Heroes={p1Heroes}
          p2Heroes={runika ? [...p2Heroes, makeHero("runika", "Runika")] : p2Heroes}
          battleState={
            runika
              ? {
                  ...base,
                  p2: {
                    ...base.p2,
                    heroes: {
                      ...base.p2.heroes,
                      runika: { hp: 9, level: 1, ...NO_TOKENS, ...runika },
                    },
                    heroPositions: { ...base.p2.heroPositions, runika: null },
                  },
                }
              : base
          }
          winner={null}
          setHeroPosition={() => {}}
          setGoldPile={() => {}}
          onNewDraft={() => {}}
          onEndBattle={() => {}}
          onSwitchView={() => {}}
          {...fixedProps}
        />,
      );
    }

    it("shows an icon per face-up Artifact after her tokens, and none for face-down ones", () => {
      renderWithRunika({ attackTokens: 2, autoDeflectorFaceUp: false });

      const fist = screen.getByLabelText("Battle Fist: +1 Attack");
      expect(fist).toHaveAttribute("title", "Battle Fist: +1 Attack (face-up)");
      expect(fist.style.getPropertyValue("--token-accent")).toBe("var(--color-artifact)");
      expect(
        screen.getByLabelText("Shield Amulet: +1 defense vs magic attacks"),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Auto Deflector/)).not.toBeInTheDocument();
      const attack = screen.getByLabelText("2 +1 Attack tokens");
      expect(attack.compareDocumentPosition(fist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("gives her a token line for face-up Artifacts alone", () => {
      renderWithRunika({});
      expect(screen.getAllByLabelText(ANY_ARTIFACT)).toHaveLength(3);
    });

    it("drops the line when all three are face-down and she holds nothing", () => {
      renderWithRunika({
        battleFistFaceUp: false,
        autoDeflectorFaceUp: false,
        shieldAmuletFaceUp: false,
      });
      expect(screen.queryByLabelText(ANY_ARTIFACT)).not.toBeInTheDocument();
    });

    it("shows no Artifacts for other heroes, though their flags are face-up too", () => {
      renderWithRunika(null);
      expect(screen.queryByLabelText(ANY_ARTIFACT)).not.toBeInTheDocument();
    });
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
    expect(boardLayer?.querySelectorAll('img[src="/structures/tower-blue.png"]').length).toBe(2);
    // The other side's (p2, red) Towers are untouched.
    expect(boardLayer?.querySelectorAll('img[src="/structures/tower-red.png"]').length).toBe(3);
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
    // No Boreas: his Bear Trap holder would add a draggable marker.
    const crowdedHeroes = [
      makeHero("dolgolae", "Dolgolae"),
      makeHero("caligar", "Caligar"),
      makeHero("ceralin", "Ceralin"),
      makeHero("cynthia", "Cynthia"),
    ];
    const sharedSpace = MAP_SPACE_IDS[0];
    const battleState: BattleState = {
      schemaVersion: 16,
      initiative: "p1",
      iceWall: null,
      bearTrap: null,
      round: 1,
      phase: "orders",
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

  describe("the Ice Wall (intent/16)", () => {
    const dazeemTeam = [makeHero("dazeem", "Dazeem"), makeHero("boreas", "Boreas")];
    const otherTeam = [makeHero("sterling", "Sterling")];

    function renderWall({
      p1 = dazeemTeam,
      p2 = otherTeam,
      iceWall = null,
      adjust = (state) => state,
      camera = INITIAL_MAP_CAMERA,
      onCameraChange = () => {},
    }: {
      p1?: Hero[];
      p2?: Hero[];
      iceWall?: BattleState["iceWall"];
      /** Further changes to the fresh battle, e.g. Felix's level. */
      adjust?: (state: BattleState) => BattleState;
      camera?: typeof INITIAL_MAP_CAMERA;
      onCameraChange?: () => void;
    } = {}) {
      const setIceWall = vi.fn();
      const setHeroPosition = vi.fn();
      const battleState = adjust({ ...createInitialBattleState(p1, p2, "p1"), iceWall });
      const { container } = render(
        <BattleMapScreen
          p1Heroes={p1}
          p2Heroes={p2}
          battleState={battleState}
          winner={null}
          setHeroPosition={setHeroPosition}
          setGoldPile={() => {}}
          onNewDraft={() => {}}
          onEndBattle={() => {}}
          onSwitchView={() => {}}
          {...fixedProps}
          setIceWall={setIceWall}
          camera={camera}
          onCameraChange={onCameraChange}
        />,
      );
      // The board art sits in the pan/zoom layer, inside the board viewport.
      const boardTransform = container.querySelector('img[src="/map/board.jpg"]')!
        .parentElement as HTMLElement;
      return { setIceWall, setHeroPosition, boardTransform, board: boardTransform.parentElement! };
    }

    const holder = () => screen.queryByRole("region", { name: "Ice Wall" });
    const respawnArea = (label: string) =>
      screen.getByRole("region", { name: `${label} respawning area` });

    it("shows nothing without Dazeem", () => {
      renderWall({ p1: [makeHero("boreas", "Boreas")], iceWall: { xPct: 50, yPct: 50 } });
      expect(holder()).toBeNull();
      expect(screen.queryByRole("img", { name: "Ice Wall" })).toBeNull();
    });

    it.each([
      ["p1", "Player 1"],
      ["p2", "Player 2"],
    ] as const)("puts the holder beside Dazeem's column when he's on %s", (side, label) => {
      const teams =
        side === "p1" ? { p1: dazeemTeam, p2: otherTeam } : { p1: otherTeam, p2: dazeemTeam };
      renderWall(teams);
      const column = respawnArea(label).parentElement!;
      // In the margin outside his column, hung from it, so nothing in it moves.
      const zones = holder()!.parentElement!;
      expect(zones.parentElement).toBe(column);
      expect(zones.className).toContain(side === "p1" ? "outerZonesP1" : "outerZonesP2");
    });

    it("holds the wall while it's off the board", () => {
      renderWall();
      expect(within(holder()!).getByRole("img", { name: "Ice Wall" })).toBeInTheDocument();
      expect(screen.getAllByRole("img", { name: "Ice Wall" })).toHaveLength(1);
    });

    it("draws a placed wall at its spot on the board art, not in the holder", () => {
      const { boardTransform } = renderWall({ iceWall: { xPct: 48.6, yPct: 21.9 } });
      const marker = within(boardTransform).getByRole("img", { name: "Ice Wall" });
      expect(marker.style.left).toBe("48.6%");
      expect(marker.style.top).toBe("21.9%");
      expect(within(holder()!).queryByRole("img", { name: "Ice Wall" })).toBeNull();
    });

    it("places the wall where it's dropped on the board, as a percentage of the art", () => {
      const { setIceWall, board, boardTransform } = renderWall();
      vi.spyOn(boardTransform, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 50,
        width: 500,
        height: 500,
      } as DOMRect);

      dropIceWall(board, { clientX: 350, clientY: 175 });

      expect(setIceWall).toHaveBeenCalledWith({ xPct: 50, yPct: 25 });
    });

    it("takes a wall dropped over a space, without moving any hero", () => {
      const { setIceWall, setHeroPosition, boardTransform } = renderWall();
      vi.spyOn(boardTransform, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
      } as DOMRect);
      // A `MapSpace` drop target (its `.space` class), not a structure icon.
      const space = boardTransform.querySelector('[class*="space"]')!;

      dropIceWall(space, { clientX: 40, clientY: 80 });

      expect(setIceWall).toHaveBeenCalledWith({ xPct: 10, yPct: 20 });
      expect(setHeroPosition).not.toHaveBeenCalled();
    });

    it("sends the wall back to the holder on a drop there", () => {
      const { setIceWall } = renderWall({ iceWall: { xPct: 50, yPct: 50 } });
      dropIceWall(holder()!, { clientX: 0, clientY: 0 });
      expect(setIceWall).toHaveBeenCalledWith(null);
    });

    it.each(["p1", "p2"] as const)(
      "with Felix on p1 and Dazeem on %s, puts the Arena beside Felix's column, above the holder",
      (dazeemSide) => {
        const felix = makeHero("felix", "Felix");
        const dazeem = makeHero("dazeem", "Dazeem");
        const [p1, p2] =
          dazeemSide === "p2"
            ? [[felix], [dazeem]]
            : [[felix, dazeem], [makeHero("sterling", "Sterling")]];
        // Felix at level 4 on a space: the Arena shows.
        renderWall({
          p1,
          p2,
          adjust: (base) => ({
            ...base,
            p1: {
              ...base.p1,
              heroes: { ...base.p1.heroes, felix: { ...base.p1.heroes.felix, level: 4 } },
              heroPositions: { ...base.p1.heroPositions, felix: MAP_SPACE_IDS[0] },
            },
          }),
        });
        const arenaPanel = screen.getByRole("region", { name: "The Arena" });
        const felixZones = arenaPanel.parentElement!;
        expect(felixZones.className).toContain("outerZonesP1");
        expect(within(felixZones.parentElement!).getByText("Player 1")).toBeInTheDocument();
        if (dazeemSide === "p1") {
          // Same margin: the Arena first, then the holder.
          expect(holder()!.parentElement).toBe(felixZones);
          expect(arenaPanel.compareDocumentPosition(holder()!)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        } else {
          expect(holder()!.parentElement!.className).toContain("outerZonesP2");
        }
      },
    );

    it("ignores a hero dropped on bare board art", () => {
      const { setIceWall, setHeroPosition, board } = renderWall();
      dropHero(board, { side: "p1", heroId: "dazeem" });
      expect(setIceWall).not.toHaveBeenCalled();
      expect(setHeroPosition).not.toHaveBeenCalled();
    });

    it("lets the pointer through the placed wall only while a hero is dragged", () => {
      const { boardTransform } = renderWall({ iceWall: { xPct: 50, yPct: 50 } });
      const marker = within(boardTransform).getByRole("img", { name: "Ice Wall" });
      const heroToken = screen.getAllByAltText("Boreas")[0];
      expect(marker.style.pointerEvents).toBe("");

      fireEvent.dragStart(heroToken, { dataTransfer: fakeDataTransfer() });
      expect(marker.style.pointerEvents).toBe("none");

      dropHero(screen.getByRole("region", { name: "Player 1 respawning area" }), {
        side: "p1",
        heroId: "boreas",
      });
      expect(marker.style.pointerEvents).toBe("");

      // Dragging the wall itself never makes it click-through.
      fireEvent.dragStart(marker, { dataTransfer: fakeDataTransfer() });
      expect(marker.style.pointerEvents).toBe("");
    });

    it("doesn't pan the board when the wall's icon is pressed", () => {
      const onCameraChange = vi.fn();
      const { boardTransform } = renderWall({
        iceWall: { xPct: 50, yPct: 50 },
        camera: { zoomIndex: 2, pan: { x: 0, y: 0 } },
        onCameraChange,
      });
      // The press lands on the brick icon's SVG, inside the draggable tile.
      const icon = within(boardTransform)
        .getByRole("img", { name: "Ice Wall" })
        .querySelector("path")!;

      fireEvent.mouseDown(icon, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(icon, { clientX: 140, clientY: 130 });

      expect(onCameraChange).not.toHaveBeenCalled();
    });

    it("lets the pointer through the placed wall while the Bear Trap is dragged too", () => {
      const { boardTransform } = renderWall({
        iceWall: { xPct: 50, yPct: 50 },
        adjust: (base) => ({ ...base, bearTrap: MAP_SPACE_IDS[0] }),
      });
      const marker = within(boardTransform).getByRole("img", { name: "Ice Wall" });
      const trap = within(boardTransform).getByRole("img", { name: "Bear Trap" });

      fireEvent.dragStart(trap, { dataTransfer: fakeDataTransfer() });
      expect(marker.style.pointerEvents).toBe("none");
    });
  });

  describe("the Bear Trap (intent/18)", () => {
    const boreasTeam = [makeHero("boreas", "Boreas"), makeHero("caligar", "Caligar")];
    const otherTeam = [makeHero("sterling", "Sterling")];

    function renderTrap({
      p1 = boreasTeam,
      p2 = otherTeam,
      bearTrap = null,
      adjust = (state) => state,
    }: {
      p1?: Hero[];
      p2?: Hero[];
      bearTrap?: BattleState["bearTrap"];
      adjust?: (state: BattleState) => BattleState;
    } = {}) {
      const setBearTrap = vi.fn();
      const setHeroPosition = vi.fn();
      const battleState = adjust({ ...createInitialBattleState(p1, p2, "p1"), bearTrap });
      const { container } = render(
        <BattleMapScreen
          p1Heroes={p1}
          p2Heroes={p2}
          battleState={battleState}
          winner={null}
          setHeroPosition={setHeroPosition}
          setGoldPile={() => {}}
          onNewDraft={() => {}}
          onEndBattle={() => {}}
          onSwitchView={() => {}}
          {...fixedProps}
          setBearTrap={setBearTrap}
        />,
      );
      const boardTransform = container.querySelector('img[src="/map/board.jpg"]')!
        .parentElement as HTMLElement;
      // Every `MapSpace` drop target (its `.space` class), in MAP_SPACES order.
      const spaces = Array.from(boardTransform.querySelectorAll('[class*="space"]')).filter(
        (el) => !el.className.includes("structureIcon"),
      );
      return {
        setBearTrap,
        setHeroPosition,
        boardTransform,
        board: boardTransform.parentElement!,
        spaces,
      };
    }

    const holder = () => screen.queryByRole("region", { name: "Bear Trap" });
    const respawnArea = (label: string) =>
      screen.getByRole("region", { name: `${label} respawning area` });

    it("shows nothing without Boreas", () => {
      renderTrap({ p1: [makeHero("caligar", "Caligar")], bearTrap: MAP_SPACE_IDS[0] });
      expect(holder()).toBeNull();
      expect(screen.queryByRole("img", { name: "Bear Trap" })).toBeNull();
    });

    it.each([
      ["p1", "Player 1"],
      ["p2", "Player 2"],
    ] as const)("puts the holder beside Boreas's column when he's on %s", (side, label) => {
      const teams =
        side === "p1" ? { p1: boreasTeam, p2: otherTeam } : { p1: otherTeam, p2: boreasTeam };
      renderTrap(teams);
      const zones = holder()!.parentElement!;
      expect(zones.parentElement).toBe(respawnArea(label).parentElement);
      expect(zones.className).toContain(side === "p1" ? "outerZonesP1" : "outerZonesP2");
    });

    it("comes after the Ice Wall holder when Dazeem shares Boreas's team", () => {
      renderTrap({ p1: [...boreasTeam, makeHero("dazeem", "Dazeem")] });
      const wallHolder = screen.getByRole("region", { name: "Ice Wall" });
      expect(holder()!.parentElement).toBe(wallHolder.parentElement);
      expect(wallHolder.compareDocumentPosition(holder()!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it("holds the trap while it's off the board", () => {
      renderTrap();
      expect(within(holder()!).getByRole("img", { name: "Bear Trap" })).toBeInTheDocument();
      expect(screen.getAllByRole("img", { name: "Bear Trap" })).toHaveLength(1);
    });

    it("draws a placed trap inside its space, not in the holder", () => {
      const { spaces } = renderTrap({ bearTrap: MAP_SPACE_IDS[2] });
      expect(within(spaces[2] as HTMLElement).getByRole("img", { name: "Bear Trap" })).toBeTruthy();
      expect(screen.getAllByRole("img", { name: "Bear Trap" })).toHaveLength(1);
      expect(within(holder()!).queryByRole("img", { name: "Bear Trap" })).toBeNull();
    });

    it("snaps the trap to the space it's dropped on, without moving any hero", () => {
      const { setBearTrap, setHeroPosition, spaces } = renderTrap();
      dropBearTrap(spaces[3]);
      expect(setBearTrap).toHaveBeenCalledWith(MAP_SPACE_IDS[3]);
      expect(setHeroPosition).not.toHaveBeenCalled();
    });

    it("sends the trap back to the holder on a drop there", () => {
      const { setBearTrap } = renderTrap({ bearTrap: MAP_SPACE_IDS[0] });
      dropBearTrap(holder()!);
      expect(setBearTrap).toHaveBeenCalledWith(null);
    });

    it("ignores a trap dropped between spaces, in a respawn area or the Arena", () => {
      const felix = makeHero("felix", "Felix");
      const { setBearTrap, board } = renderTrap({
        p1: [...boreasTeam, felix],
        adjust: (base) => ({
          ...base,
          p1: {
            ...base.p1,
            heroes: { ...base.p1.heroes, felix: { ...base.p1.heroes.felix, level: 4 } },
            heroPositions: { ...base.p1.heroPositions, felix: MAP_SPACE_IDS[0] },
          },
        }),
      });
      dropBearTrap(board);
      dropBearTrap(respawnArea("Player 1"));
      dropBearTrap(screen.getByRole("region", { name: "The Arena" }));
      expect(setBearTrap).not.toHaveBeenCalled();
    });

    it("moves a hero dropped onto the trapped space, and leaves the trap", () => {
      const { setBearTrap, setHeroPosition, spaces } = renderTrap({ bearTrap: MAP_SPACE_IDS[1] });
      const trap = within(spaces[1] as HTMLElement).getByRole("img", { name: "Bear Trap" });
      // Dropped right on the trap's tile: it bubbles to its space.
      dropHero(trap, { side: "p2", heroId: "sterling" });
      expect(setHeroPosition).toHaveBeenCalledWith("p2", "sterling", MAP_SPACE_IDS[1]);
      expect(setBearTrap).not.toHaveBeenCalled();
    });

    it("highlights a space for the trap as well as for a hero", () => {
      const { spaces } = renderTrap();
      fireEvent.dragEnter(spaces[0], { dataTransfer: bearTrapDragTransfer() });
      expect(spaces[0].className).toContain("spaceDragOver");
      fireEvent.dragLeave(spaces[0]);
      expect(spaces[0].className).not.toContain("spaceDragOver");
    });
  });
});
