import type { Hero } from "../../lib/draft/types";
import styles from "./HeroCard.module.css";

type HeroCardProps = {
  hero: Hero;
  /**
   * 'pool' = clickable grid card (draft pool) — shows the whole card, name/
   * class baked into the art. 'slot' (team panel) and 'result' (results
   * screen) both crop into the portrait+stats region only (per the
   * mockup) and add their own text caption below, since that crop hides
   * the baked-in name/class text.
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

  const isResult = variant === "result";
  const cardClass = isResult ? styles.resultCard : styles.slot;
  const wrapperClass = isResult ? styles.resultImageWrapper : styles.slotImageWrapper;
  const imageClass = isResult ? styles.resultImage : styles.slotImage;
  const infoClass = isResult ? styles.resultInfo : styles.slotInfo;
  const nameClass = isResult ? styles.resultName : styles.slotName;
  const classClass = isResult ? styles.resultClass : styles.slotClass;

  return (
    <div className={cardClass}>
      <div className={wrapperClass}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
        <img src={hero.portrait} alt="" className={imageClass} />
      </div>
      <div className={infoClass}>
        <div className={nameClass}>{hero.name}</div>
        <div className={classClass}>{hero.className}</div>
      </div>
    </div>
  );
}
