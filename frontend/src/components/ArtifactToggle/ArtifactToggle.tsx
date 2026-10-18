import type { ReactNode } from "react";
import styles from "./ArtifactToggle.module.css";

type ArtifactToggleProps = {
  faceUp: boolean;
  onChange: (faceUp: boolean) => void;
  /** Decorative, `aria-hidden` (e.g. `<BattleFistIcon size={12} />`): the
   * only visible label. */
  icon: ReactNode;
  /** The Artifact's name and bonus (artifactSummary), e.g.
   * "Battle Fist: +1 Attack". */
  summary: string;
  heroName: string;
};

/**
 * One of Runika's Artifacts on her Board card (intent/17): always rendered,
 * unlike TokenToggle, and a tap flips it. Face-up is the lit pill in
 * `--color-artifact`; face-down is greyed out with a dashed outline, so the
 * state doesn't rest on color alone. `aria-pressed` carries the state, so
 * the label stays fixed. No state of its own.
 */
export function ArtifactToggle({ faceUp, onChange, icon, summary, heroName }: ArtifactToggleProps) {
  return (
    <button
      type="button"
      className={faceUp ? `${styles.toggle} ${styles.faceUp}` : styles.toggle}
      aria-pressed={faceUp}
      aria-label={`${summary}, on ${heroName}`}
      title={`${summary} (${faceUp ? "face-up" : "face-down"}, tap to flip)`}
      onClick={() => onChange(!faceUp)}
    >
      {icon}
    </button>
  );
}
