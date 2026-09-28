import type { Hero } from "../../../lib/draft/types";
import { HeroCard } from "../../HeroCard/HeroCard";
import styles from "./ResultsScreen.module.css";

type ResultsScreenProps = {
  p1Picks: Hero[];
  p2Picks: Hero[];
  onNewDraft: () => void;
};

export function ResultsScreen({ p1Picks, p2Picks, onNewDraft }: ResultsScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.titleBlock}>
        <div className={styles.eyebrow}>Battle for Biternia</div>
        <div className={styles.title}>Draft Complete</div>
      </div>

      <div className={styles.teams}>
        <div className={styles.team}>
          <div className={styles.teamHeader} style={{ borderBottomColor: "var(--color-p1)" }}>
            Player 1
          </div>
          <div className={styles.grid}>
            {p1Picks.map((hero) => (
              <HeroCard key={hero.id} hero={hero} variant="result" />
            ))}
          </div>
        </div>

        <div className={styles.team}>
          <div className={styles.teamHeader} style={{ borderBottomColor: "var(--color-p2)" }}>
            Player 2
          </div>
          <div className={styles.grid}>
            {p2Picks.map((hero) => (
              <HeroCard key={hero.id} hero={hero} variant="result" />
            ))}
          </div>
        </div>
      </div>

      <button type="button" className={styles.newDraftLink} onClick={onNewDraft}>
        ← New Draft
      </button>
    </div>
  );
}
