/**
 * Texte « À propos », validé par Hugo.
 * C'est le seul endroit à modifier : titre (avec une partie en italique dans <em>),
 * petit sur-titre, et paragraphes. Le HTML simple (<em>, <strong>, <a>) est permis.
 */
export const ABOUT = {
  fr: {
    kicker: 'Le pilote',
    photoAlt: 'Portrait de Hugo Hismans',
    title: "Bonjour, <em>moi c'est Hugo.</em>",
    paragraphs: [
      "J'aime faire des projets. Beaucoup de sujets m'intéressent, des jeux à la physique en passant par les maths et les petits outils du quotidien, et ça finit souvent par devenir quelque chose qu'on peut essayer ici.",
      "Certains sont nés en un week-end, d'autres m'ont occupé des mois. Je les garde tous ici, finis ou pas, parce que c'est comme ça que j'apprends : en construisant.",
    ],
  },
  en: {
    kicker: 'The pilot',
    photoAlt: 'Portrait of Hugo Hismans',
    title: "Hello, <em>I'm Hugo.</em>",
    paragraphs: [
      'I like making projects. A lot of things interest me, from games to physics, maths and small everyday tools, and they often end up as something you can try right here.',
      "Some were born over a weekend, others kept me busy for months. I keep them all here, finished or not, because that's how I learn: by building.",
    ],
  },
} as const;
