import type { DraftAction, DraftState } from "./types";
import { isDraftDone } from "./sequence";
import { getCurrentTurnPlayer, getTotalPicks } from "./selectors";
import { HERO_IDS } from "../../data/heroes";

const KNOWN_HERO_IDS = new Set(HERO_IDS);

/**
 * Pure reducer over the only stored/dispatched draft state. NEW_DRAFT resets
 * to zero picks with the given (already-decided) initiative. PICK_HERO is a
 * no-op — returning the same state reference — whenever the action fails any
 * validity check: draft already done, wrong player's turn, unknown hero id,
 * or hero already picked by either side.
 */
export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "NEW_DRAFT":
      return { initiative: action.initiative, picks: { p1: [], p2: [] } };

    case "PICK_HERO": {
      if (isDraftDone(getTotalPicks(state))) {
        return state;
      }
      if (action.player !== getCurrentTurnPlayer(state)) {
        return state;
      }
      if (!KNOWN_HERO_IDS.has(action.heroId)) {
        return state;
      }
      const alreadyPicked =
        state.picks.p1.includes(action.heroId) || state.picks.p2.includes(action.heroId);
      if (alreadyPicked) {
        return state;
      }

      return {
        ...state,
        picks: {
          ...state.picks,
          [action.player]: [...state.picks[action.player], action.heroId],
        },
      };
    }

    default:
      return state;
  }
}
