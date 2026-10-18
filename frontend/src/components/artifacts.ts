import type { ComponentType } from "react";
import type { ArtifactField } from "../lib/battle/types";
import { AutoDeflectorIcon } from "./ArtifactToggle/AutoDeflectorIcon";
import { BattleFistIcon } from "./ArtifactToggle/BattleFistIcon";
import { ShieldAmuletIcon } from "./ArtifactToggle/ShieldAmuletIcon";

/** How one of Runika's Artifacts looks (intent/17), shared by her Board
 * card (ArtifactToggle) and the Map's token line. */
export type ArtifactLook = {
  field: ArtifactField;
  /** The name everywhere: the pill's tooltip and accessible name, the Map
   * icon's. */
  name: string;
  /** The bonus a face-up Artifact gives Runika, printed on its token
   * (intent/17's Rules). Shown after the name, never applied. */
  bonus: string;
  Icon: ComponentType<{ size: number }>;
};

/** In ARTIFACT_FIELDS' order. One accent for all three: --color-artifact. */
export const ARTIFACTS: readonly ArtifactLook[] = [
  {
    field: "battleFistFaceUp",
    name: "Battle Fist",
    bonus: "+1 Attack",
    Icon: BattleFistIcon,
  },
  {
    field: "autoDeflectorFaceUp",
    name: "Auto Deflector",
    bonus: "+1 defense vs melee attacks",
    Icon: AutoDeflectorIcon,
  },
  {
    field: "shieldAmuletFaceUp",
    name: "Shield Amulet",
    bonus: "+1 defense vs magic attacks",
    Icon: ShieldAmuletIcon,
  },
];

/** "Battle Fist: +1 Attack", the start of every tooltip and accessible name
 * for an Artifact. */
export function artifactSummary({ name, bonus }: ArtifactLook): string {
  return `${name}: ${bonus}`;
}
