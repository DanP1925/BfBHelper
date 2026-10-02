import type { Hero, HeroId } from "../lib/draft/types";

export const HERO_ROSTER: Hero[] = [
  {
    id: "agatha-trunch",
    name: "Agatha Trunch",
    className: "Minotaur",
    portrait: "/heroes/agatha-trunch.png",
    battleToken: "/heroes-tokens/agatha-trunch.png",
    baseHp: 10,
  },
  {
    id: "baldwin",
    name: "Baldwin",
    className: "Bard",
    portrait: "/heroes/baldwin.png",
    battleToken: "/heroes-tokens/baldwin.png",
    baseHp: 9,
  },
  {
    id: "boreas",
    name: "Boreas",
    className: "Hunter",
    portrait: "/heroes/boreas.png",
    battleToken: "/heroes-tokens/boreas.png",
    baseHp: 10,
  },
  {
    id: "caligar",
    name: "Caligar",
    className: "Cleric",
    portrait: "/heroes/caligar.png",
    battleToken: "/heroes-tokens/caligar.png",
    baseHp: 10,
  },
  {
    id: "ceralin",
    name: "Ceralin",
    className: "Fighter",
    portrait: "/heroes/ceralin.png",
    battleToken: "/heroes-tokens/ceralin.png",
    baseHp: 10,
  },
  {
    id: "cynthia",
    name: "Cynthia",
    className: "Fire Mage",
    portrait: "/heroes/cynthia.png",
    battleToken: "/heroes-tokens/cynthia.png",
    baseHp: 8,
  },
  {
    id: "cyrus",
    name: "Cyrus",
    className: "Paladin",
    portrait: "/heroes/cyrus.png",
    battleToken: "/heroes-tokens/cyrus.png",
    baseHp: 9,
  },
  {
    id: "dazeem",
    name: "Dazeem",
    className: "Ice Mage",
    portrait: "/heroes/dazeem.png",
    battleToken: "/heroes-tokens/dazeem.png",
    baseHp: 8,
  },
  {
    id: "dolgolae",
    name: "Dolgolae",
    className: "Yomp",
    portrait: "/heroes/dolgolae.png",
    battleToken: "/heroes-tokens/dolgolae.png",
    baseHp: 10,
  },
  {
    id: "felix",
    name: "Felix",
    className: "Duelist",
    portrait: "/heroes/felix.png",
    battleToken: "/heroes-tokens/felix.png",
    baseHp: 9,
  },
  {
    id: "ken-obi",
    name: "Ken Obi",
    className: "Apprentice",
    portrait: "/heroes/ken-obi.png",
    battleToken: "/heroes-tokens/ken-obi.png",
    baseHp: 9,
  },
  {
    id: "kerrick",
    name: "Kerrick",
    className: "Wizard",
    portrait: "/heroes/kerrick.png",
    battleToken: "/heroes-tokens/kerrick.png",
    baseHp: 8,
  },
  {
    id: "kunoichi",
    name: "Kunoichi",
    className: "Assassin",
    portrait: "/heroes/kunoichi.png",
    battleToken: "/heroes-tokens/kunoichi.png",
    baseHp: 9,
  },
  {
    id: "longshanks",
    name: "Longshanks",
    className: "Pirate",
    portrait: "/heroes/longshanks.png",
    battleToken: "/heroes-tokens/longshanks.png",
    baseHp: 10,
  },
  {
    id: "motley",
    name: "Motley",
    className: "Monk",
    portrait: "/heroes/motley.png",
    battleToken: "/heroes-tokens/motley.png",
    baseHp: 10,
  },
  {
    id: "runika",
    name: "Runika",
    className: "Artificer",
    portrait: "/heroes/runika.png",
    battleToken: "/heroes-tokens/runika.png",
    baseHp: 8,
  },
  {
    id: "sedusa",
    name: "Sedusa",
    className: "Gorgon",
    portrait: "/heroes/sedusa.png",
    battleToken: "/heroes-tokens/sedusa.png",
    baseHp: 9,
  },
  {
    id: "sterling",
    name: "Sterling",
    className: "Archer",
    portrait: "/heroes/sterling.png",
    battleToken: "/heroes-tokens/sterling.png",
    baseHp: 7,
  },
  {
    id: "vladiator",
    name: "Vladiator",
    className: "Barbarian",
    portrait: "/heroes/vladiator.png",
    battleToken: "/heroes-tokens/vladiator.png",
    baseHp: 10,
  },
];

export const HERO_IDS: HeroId[] = HERO_ROSTER.map((hero) => hero.id);

const HERO_BY_ID = new Map(HERO_ROSTER.map((hero) => [hero.id, hero]));

export function getHeroById(id: HeroId): Hero {
  const hero = HERO_BY_ID.get(id);
  if (!hero) {
    throw new Error(`Unknown hero id: ${id}`);
  }
  return hero;
}
