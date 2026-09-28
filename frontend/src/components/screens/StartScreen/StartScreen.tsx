import styles from "./StartScreen.module.css";

type StartScreenProps = {
  onStartDraft: () => void;
};

export function StartScreen({ onStartDraft }: StartScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>Battle for Biternia</h1>
        <div className={styles.subtitle}>Hero Draft Picker · 2 Player</div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
      <img
        src="/heroes/card-back.png"
        alt="Card back"
        className={styles.cardBack}
      />
      <p className={styles.description}>
        Gather round, for the rite begins. Let Fate flip the coin to name who
        claims initiative, then champion and rival shall choose in turn from
        nineteen heroes bound to this realm — no bans, no mercy, only glory.
      </p>
      <button type="button" className={styles.startButton} onClick={onStartDraft}>
        Start Draft
      </button>
    </div>
  );
}
