import type { Hero } from "../../lib/draft/types";
import styles from "./HeroCard.module.css";

type HeroCardProps = {
  hero: Hero;
  /**
   * 'pool' = clickable grid card (draft pool). 'slot' = compact panel row
   * (team panel, mid-draft). 'result' = non-interactive card (results
   * screen, draft complete). The source art is a full illustrated card
   * (name/class/stats/ability all baked in), so every variant just shows
   * the whole image at a different size — no separate text overlay.
   */
  variant: "pool" | "slot" | "result";
  onClick?: () => void;
};

export function HeroCard({ hero, variant, onClick }: HeroCardProps) {
  const altText = `${hero.name}, ${hero.className}`;
  const imageClassName =
    variant === "pool"
      ? styles.poolImage
      : variant === "slot"
        ? styles.slotImage
        : styles.resultImage;

  if (variant === "pool") {
    return (
      <button
        type="button"
        className={styles.poolCard}
        onClick={onClick}
        aria-label={`Pick ${altText}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
        <img src={hero.portrait} alt={altText} className={imageClassName} />
      </button>
    );
  }

  return (
    <div className={variant === "slot" ? styles.slot : styles.resultCard}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
      <img src={hero.portrait} alt={altText} className={imageClassName} />
    </div>
  );
}
