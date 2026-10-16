import { Fragment, type ReactNode } from "react";
import type { Hero } from "../../lib/draft/types";
import { HERO_HP_CEILING, HERO_MAX_LEVEL, HERO_STARTING_LEVEL } from "../../lib/battle/constants";
import { BATTLE_TOKENS, type CountedToken, type OnOffToken } from "../battleTokens";
import { NumberStepper } from "../NumberStepper/NumberStepper";
import { TokenChip } from "../TokenChip/TokenChip";
import { TokenPicker, type TokenPickerOption } from "../TokenPicker/TokenPicker";
import { TokenToggle } from "../TokenToggle/TokenToggle";
import styles from "./HeroCard.module.css";

type HeroCardCommonProps = {
  hero: Hero;
  onClick?: () => void;
};

/**
 * 'pool' = clickable grid card (draft pool) — shows the whole card, name/
 * class baked into the art. 'slot' (team panel) and 'result' (results
 * screen) both crop into the portrait+stats region only (per the mockup)
 * and add their own text caption below, since that crop hides the
 * baked-in name/class text. 'battle' (Battle Board) uses the separate
 * map-token art (`hero.battleToken`, no card chrome) instead, with its
 * own explicit HP badge and level meter — HP weighted above level, per
 * the Battle Board mockup. `hp`/`level` are discriminated-union members
 * (not plain optional props) so a `"battle"` card can't compile without
 * them. `onHpChange`/`onLevelChange` are optional: when provided (the
 * Battle Board), the HP badge/level meter render a `NumberStepper`; when
 * omitted (the Win Screen), they stay the existing read-only text/pips.
 * `hp === 0` always shows "defeated" styling, in either mode.
 */
type HeroCardProps =
  | (HeroCardCommonProps & { variant: "pool" | "slot" | "result" })
  | (HeroCardCommonProps & {
      variant: "battle";
      hp: number;
      level: number;
      onHpChange?: (value: number) => void;
      onLevelChange?: (value: number) => void;
      /** The "+" picker's open state (intent/09). The token row renders only
       * when this is provided (the Battle Board), so the Win Screen's cards
       * stay as they are. */
      tokenPicker?: HeroCardPickerProps;
      /** +1 Attack tokens (intent/06). Only the Battle Board passes it. */
      attackTokens?: HeroCardTokenProps;
      /** Confuse token (intent/07). Only the Battle Board passes it. */
      confused?: HeroCardToggleProps;
      /** Immobilized (intent/08). Only the Battle Board passes it. */
      immobilized?: HeroCardToggleProps;
      /** Death Mark (intent/09). The Battle Board passes it only on
       * Kunoichi's enemies, which is how its visibility reaches the picker. */
      deathMarked?: HeroCardToggleProps;
      /** +1 Shield tokens (intent/11). The Battle Board passes it only on
       * Cyrus's team, which is how its visibility reaches the picker. */
      shieldTokens?: HeroCardTokenProps;
    });

/** One counted token's value, setter and open state, passed all together
 * so the chip can't be wired half-way. */
export type HeroCardTokenProps = {
  count: number;
  onChange: (value: number) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

/** One on/off token's value and setter. */
export type HeroCardToggleProps = {
  on: boolean;
  onChange: (next: boolean) => void;
};

/** The "+" picker's open state, owned by the Board like a chip's. */
export type HeroCardPickerProps = {
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

/** One token in the row: its held chip (or `null` while not held) and its
 * picker option (or `null` while it can't be added). */
type TokenEntry = { key: string; chip: ReactNode; option: TokenPickerOption | null };

/** A counted token's entry: its chip while held or open, and an option that
 * adds 1 per tap up to its ceiling. */
function countedEntry(
  { field, Icon, label, optionLabel, accent, max }: CountedToken,
  token: HeroCardTokenProps,
  heroName: string,
): TokenEntry {
  const { count, onChange } = token;
  return {
    key: field,
    // Stays while its stepper is open at 0, gone once it closes there.
    chip:
      count > 0 || token.expanded ? (
        <TokenChip
          {...token}
          max={max}
          icon={<Icon size={12} />}
          label={label}
          accent={accent}
          heroName={heroName}
        />
      ) : null,
    // Always offered, 1 per tap.
    option: {
      key: field,
      icon: <Icon size={14} />,
      label: optionLabel,
      accent,
      disabled: count >= max,
      onPick: () => onChange(count + 1),
    },
  };
}

/** An on/off token's entry: a lit chip while held, an option while not. */
function toggleEntry(
  { field, Icon, chipLabel, optionLabel, accent }: OnOffToken,
  toggle: HeroCardToggleProps,
  heroName: string,
): TokenEntry {
  return {
    key: field,
    chip: toggle.on ? (
      <TokenToggle
        {...toggle}
        icon={<Icon size={12} />}
        label={chipLabel}
        heroName={heroName}
        accent={accent}
      />
    ) : null,
    option: toggle.on
      ? null
      : {
          key: field,
          icon: <Icon size={14} />,
          label: optionLabel,
          accent,
          onPick: () => toggle.onChange(true),
        },
  };
}

export function HeroCard(props: HeroCardProps) {
  const { hero, variant, onClick } = props;
  const altText = `${hero.name}, ${hero.className}`;

  if (variant === "pool") {
    return (
      <button
        type="button"
        className={styles.poolCard}
        onClick={onClick}
        aria-label={`Pick ${altText}`}
        data-pool-hero={hero.id}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
        <img src={hero.portrait} alt={altText} className={styles.poolImage} />
      </button>
    );
  }

  if (variant === "battle") {
    const { hp, level, onHpChange, onLevelChange, tokenPicker } = props;
    const { attackTokens, confused, immobilized, deathMarked, shieldTokens } = props;
    const isDefeated = hp === 0;

    // The fixed order (BATTLE_TOKENS): +1 Attack, Confuse, Immobilize, then
    // the hero-specific tokens. The row's chips and the picker's options
    // both come from this one list, so they can't disagree, and a row never
    // reshuffles by the order of adding. A token whose prop isn't passed
    // (a hero-specific one this hero can't take) is skipped.
    const counted = { attackTokens, shieldTokens };
    const toggles = { confused, immobilized, deathMarked };
    const tokenEntries = BATTLE_TOKENS.flatMap((token): TokenEntry[] => {
      if (token.kind === "counted") {
        const props = counted[token.field];
        return props ? [countedEntry(token, props, hero.name)] : [];
      }
      const toggle = toggles[token.field];
      return toggle ? [toggleEntry(token, toggle, hero.name)] : [];
    });
    return (
      <div className={styles.battleCard}>
        <div className={styles.battleTokenWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img
            src={hero.battleToken}
            alt=""
            className={
              isDefeated ? `${styles.battleToken} ${styles.tokenDefeated}` : styles.battleToken
            }
          />
        </div>
        <div className={styles.battleInfo}>
          <div>
            <div className={styles.battleName}>{hero.name}</div>
            <div className={styles.battleClass}>{hero.className}</div>
          </div>
          <div className={styles.hpBadge} aria-label={onHpChange ? undefined : `${hp} HP`}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="var(--color-hp)"
              aria-hidden="true"
            >
              <path d="M12 21s-6.716-4.35-9.428-8.106C.414 9.967 1.5 6 5.1 6c2.1 0 3.6 1.2 4.5 2.7C10.5 7.2 12 6 14.1 6c3.6 0 4.686 3.967 2.528 6.894C18.716 16.65 12 21 12 21z" />
            </svg>
            {onHpChange ? (
              <NumberStepper
                value={hp}
                min={0}
                max={HERO_HP_CEILING}
                onChange={onHpChange}
                label={`${hero.name} HP`}
              />
            ) : (
              <>
                <span className={styles.hpValue}>{hp}</span>
                <span className={styles.hpUnit}>HP</span>
              </>
            )}
          </div>
          <div
            className={styles.levelRow}
            aria-label={onLevelChange ? undefined : `Level ${level} of ${HERO_MAX_LEVEL}`}
          >
            <span className={styles.levelLabel}>Lv</span>
            {onLevelChange ? (
              <NumberStepper
                value={level}
                min={HERO_STARTING_LEVEL}
                max={HERO_MAX_LEVEL}
                onChange={onLevelChange}
                label={`${hero.name} level`}
              />
            ) : (
              <>
                <div className={styles.levelPips}>
                  {Array.from({ length: HERO_MAX_LEVEL }, (_, index) => (
                    <span
                      key={index}
                      className={index < level ? styles.levelPipFilled : styles.levelPip}
                    />
                  ))}
                </div>
                <span className={styles.levelValue}>
                  {level}/{HERO_MAX_LEVEL}
                </span>
              </>
            )}
          </div>
          {tokenPicker && (
            <div className={styles.tokenRow}>
              {tokenEntries.map((entry) =>
                entry.chip ? <Fragment key={entry.key}>{entry.chip}</Fragment> : null,
              )}
              <TokenPicker
                {...tokenPicker}
                heroName={hero.name}
                options={tokenEntries.flatMap((entry) => (entry.option ? [entry.option] : []))}
              />
            </div>
          )}
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
    // data-slot-hero lets the draft's pick animation find the slot a hero
    // just landed in (intent/10).
    <div className={cardClass} data-slot-hero={hero.id}>
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
