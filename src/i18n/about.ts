/**
 * Texte « À propos » — PROVISOIRE, à réécrire avec Hugo.
 * C'est le seul endroit à modifier : titre (avec une partie en italique dans <em>),
 * petit sur-titre, et paragraphes. Le HTML simple (<em>, <strong>, <a>) est permis.
 */
export const ABOUT = {
  fr: {
    kicker: 'Le pilote',
    title: "Bonjour, <em>moi c'est Hugo.</em>",
    paragraphs: [
      "Je construis des choses qui se lancent d'un clic : des jeux pour un ou pour toute une tablée, des simulations où la physique se manipule à la main, et des outils qui servent au quotidien.",
      'Beaucoup naissent en un week-end, certains deviennent des chantiers de plusieurs mois. Tous sont ici, rangés en amas comme des étoiles : la taille de chacune dit à quel point le projet brille, sa couleur dit où il vit.',
    ],
  },
  en: {
    kicker: 'The pilot',
    title: "Hello, <em>I'm Hugo.</em>",
    paragraphs: [
      'I build things that launch in one click: games for one player or a whole table, simulations where you can handle physics with your hands, and tools that are useful every day.',
      'Many are born over a weekend, some grow into projects that last months. They are all here, grouped into clusters like stars: the size of each one tells how brightly the project shines, its colour tells where it lives.',
    ],
  },
} as const;
