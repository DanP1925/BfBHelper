import type { Hero } from "../../lib/draft/types";
import styles from "./HeroCard.module.css";

type HeroCardProps = {
  hero: Hero;
  /**
   * 'pool' = clickable grid card (draft pool). 'slot' = compact panel row
   * (team panel, mid-draft). 'result' = non-interactive, cropped-portrait
   * card (results screen, draft complete).
   *
   * The source art is a full illustrated card (name/class/stats/ability
   * all baked in). 'pool'/'slot' just show the whole image. 'result'
   * zooms into the portrait+stats region only (per the updated mockup) —
   * since that crop hides the baked-in name/class text, it's the one
   * variant with its own text caption below the image.
   */
  variant: "pool" | "slot" | "result";
  onClick?: () => void;
};

export function HeroCard({ hero, variant, onClick }: HeroCardProps) {
  const altText = `${hero.name}, ${hero.className}`;

  if (variant === "pool") {
    return (
      <button
        type="button"
        className={styles.poolCard}
        onClick={onClick}
        aria-label={`Pick ${altText}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
        <img src={hero.portrait} alt={altText} className={styles.poolImage} />
      </button>
    );
  }

  if (variant === "result") {
    return (
      <div className={styles.resultCard}>
        <div className={styles.resultImageWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src={hero.portrait} alt="" className={styles.resultImage} />
        </div>
        <div className={styles.resultInfo}>
          <div className={styles.resultName}>{hero.name}</div>
          <div className={styles.resultClass}>{hero.className}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.slot}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
      <img src={hero.portrait} alt={altText} className={styles.slotImage} />
    </div>
  );
}
