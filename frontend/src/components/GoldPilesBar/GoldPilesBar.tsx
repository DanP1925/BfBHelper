import { GOLD_PILE_SPACE_IDS } from "../../data/mapSpaces";
import type { GoldPileSpaceId } from "../../data/mapSpaces";
import { GOLD_PILE_STARTING_COUNT } from "../../lib/map/constants";
import { NumberStepper } from "../NumberStepper/NumberStepper";
import styles from "./GoldPilesBar.module.css";

/** Derived straight from each gold id (`gold-ne`/`gold-mid`/`gold-sw`) —
 * no separate id->label map to keep in sync. */
const PILE_LABEL: Record<GoldPileSpaceId, string> = {
  "gold-ne": "NE",
  "gold-mid": "Mid",
  "gold-sw": "SW",
};

type GoldPilesBarProps = {
  goldPiles: Record<GoldPileSpaceId, number>;
  onChange: (pileId: GoldPileSpaceId, value: number) => void;
};

/**
 * The real `-`/number/`+` controls for the board's 3 neutral gold piles,
 * centered below the board/respawn-column row. The on-board marker
 * (`MapSpace`) is deliberately read-only — a gold node is also a shared
 * front-line space heroes stand on, and a `NumberStepper` squeezed onto
 * that same node has nowhere to go without overlapping a token.
 */
export function GoldPilesBar({ goldPiles, onChange }: GoldPilesBarProps) {
  return (
    <div className={styles.bar}>
      {GOLD_PILE_SPACE_IDS.map((pileId) => (
        <div key={pileId} className={styles.item}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src="/structures/gold.png" alt="" className={styles.icon} draggable={false} />
          <NumberStepper
            value={goldPiles[pileId]}
            min={0}
            max={GOLD_PILE_STARTING_COUNT}
            onChange={(value) => onChange(pileId, value)}
            label={`${PILE_LABEL[pileId]} gold pile`}
          />
          <span className={styles.label}>{PILE_LABEL[pileId]}</span>
        </div>
      ))}
    </div>
  );
}
