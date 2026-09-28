import type { Hero, HeroId } from "../lib/draft/types";

export const HERO_ROSTER: Hero[] = [
  {
    id: "agatha-trunch",
    name: "Agatha Trunch",
    className: "Minotaur",
    portrait: "/heroes/agatha-trunch.png",
  },
  {
    id: "baldwin",
    name: "Baldwin",
    className: "Bard",
    portrait: "/heroes/baldwin.png",
  },
  {
    id: "boreas",
    name: "Boreas",
    className: "Hunter",
    portrait: "/heroes/boreas.png",
  },
  {
    id: "caligar",
    name: "Caligar",
    className: "Cleric",
    portrait: "/heroes/caligar.png",
  },
  {
    id: "ceralin",
    name: "Ceralin",
    className: "Fighter",
    portrait: "/heroes/ceralin.png",
  },
  {
    id: "cynthia",
    name: "Cynthia",
    className: "Fire Mage",
    portrait: "/heroes/cynthia.png",
  },
  {
    id: "cyrus",
    name: "Cyrus",
    className: "Paladin",
    portrait: "/heroes/cyrus.png",
  },
  {
    id: "dazeem",
    name: "Dazeem",
    className: "Ice Mage",
    portrait: "/heroes/dazeem.png",
  },
  {
    id: "dolgolae",
    name: "Dolgolae",
    className: "Yomp",
    portrait: "/heroes/dolgolae.png",
  },
  {
    id: "felix",
    name: "Felix",
    className: "Duelist",
    portrait: "/heroes/felix.png",
  },
  {
    id: "ken-obi",
    name: "Ken Obi",
    className: "Apprentice",
    portrait: "/heroes/ken-obi.png",
  },
  {
    id: "kerrick",
    name: "Kerrick",
    className: "Wizard",
    portrait: "/heroes/kerrick.png",
  },
  {
    id: "kunoichi",
    name: "Kunoichi",
    className: "Assassin",
    portrait: "/heroes/kunoichi.png",
  },
  {
    id: "longshanks",
    name: "Longshanks",
    className: "Pirate",
    portrait: "/heroes/longshanks.png",
  },
  {
    id: "motley",
    name: "Motley",
    className: "Monk",
    portrait: "/heroes/motley.png",
  },
  {
    id: "runika",
    name: "Runika",
    className: "Artificer",
    portrait: "/heroes/runika.png",
  },
  {
    id: "sedusa",
    name: "Sedusa",
    className: "Gorgon",
    portrait: "/heroes/sedusa.png",
  },
  {
    id: "sterling",
    name: "Sterling",
    className: "Archer",
    portrait: "/heroes/sterling.png",
  },
  {
    id: "vladiator",
    name: "Vladiator",
    className: "Barbarian",
    portrait: "/heroes/vladiator.png",
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
