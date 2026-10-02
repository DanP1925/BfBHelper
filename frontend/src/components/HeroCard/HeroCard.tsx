import type { Hero } from "../../lib/draft/types";
import { HERO_MAX_LEVEL } from "../../lib/battle/constants";
import styles from "./HeroCard.module.css";

type HeroCardProps = {
  hero: Hero;
  /**
   * 'pool' = clickable grid card (draft pool) — shows the whole card, name/
   * class baked into the art. 'slot' (team panel) and 'result' (results
   * screen) both crop into the portrait+stats region only (per the
   * mockup) and add their own text caption below, since that crop hides
   * the baked-in name/class text. 'battle' (Battle Board) uses the
   * separate map-token art (`hero.battleToken`, no card chrome) instead,
   * with its own explicit HP badge and level meter — HP weighted above
   * level, per the Battle Board mockup.
   */
  variant: "pool" | "slot" | "result" | "battle";
  /** Required when variant === 'battle'. */
  level?: number;
  onClick?: () => void;
};

export function HeroCard({ hero, variant, level, onClick }: HeroCardProps) {
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

  if (variant === "battle") {
    return (
      <div className={styles.battleCard}>
        <div className={styles.battleTokenWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src={hero.battleToken} alt="" className={styles.battleToken} />
        </div>
        <div className={styles.battleInfo}>
          <div>
            <div className={styles.battleName}>{hero.name}</div>
            <div className={styles.battleClass}>{hero.className}</div>
          </div>
          <div className={styles.hpBadge} aria-label={`${hero.baseHp} HP`}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="var(--color-hp)"
              aria-hidden="true"
            >
              <path d="M12 21s-6.716-4.35-9.428-8.106C.414 9.967 1.5 6 5.1 6c2.1 0 3.6 1.2 4.5 2.7C10.5 7.2 12 6 14.1 6c3.6 0 4.686 3.967 2.528 6.894C18.716 16.65 12 21 12 21z" />
            </svg>
            <span className={styles.hpValue}>{hero.baseHp}</span>
            <span className={styles.hpUnit}>HP</span>
          </div>
          <div className={styles.levelRow} aria-label={`Level ${level} of ${HERO_MAX_LEVEL}`}>
            <span className={styles.levelLabel}>Lv</span>
            <div className={styles.levelPips}>
              {Array.from({ length: HERO_MAX_LEVEL }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < (level ?? 0) ? styles.levelPipFilled : styles.levelPip
                  }
                />
              ))}
            </div>
            <span className={styles.levelValue}>
              {level}/{HERO_MAX_LEVEL}
            </span>
          </div>
        </div>
      </div>
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
