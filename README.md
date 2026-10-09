# hugohismans.github.io

Le site vitrine de Hugo Hismans : une carte du ciel qu'on traverse en défilant, du
Système solaire jusqu'à Sagittarius A*. Chaque projet est une étoile, rangée dans
un amas (Jeux, Sciences, Outils…). La page d'accueil raconte le voyage (hero, À propos,
escales des projets phares, atlas filtrable, horizon) ; chaque projet a aussi sa
propre page, en « planche d'almanach », en français et en anglais.

- Français : <https://hugohismans.github.io/>
- Anglais : <https://hugohismans.github.io/en/>
- Une fiche : `/projets/<slug>/` (FR) et `/en/projects/<slug>/` (EN)

Le site est statique (Astro), sans framework d'interface. La galaxie, la lentille
gravitationnelle et le disque d'accrétion sont rendus avec Three.js, chargé seulement
après l'affichage du contenu, et jamais en mode « animations réduites ».

## Ajouter un projet

1. Ajouter une entrée dans `data/catalogue.json` (tableau `projets`). Les champs
   bilingues sont des objets `{ "fr": "…", "en": "…" }` : si `en` est vide, le site
   affiche le français. Le plus simple est de copier une entrée existante.
   - `slug` : identifiant unique et définitif (il sert dans l'URL).
   - `hh` : numéro de catalogue HH·NNN, attribué une fois pour toutes.
   - `categorie` : l'`id` d'une catégorie existante (ou d'une nouvelle, voir plus bas).
   - `mise_en_avant.score` (1 à 10) : taille de l'étoile et tri « par éclat ».
   - `mise_en_avant.phare` : un rang (1, 2, 3…) pour en faire une escale du voyage,
     ou `null`. Le nombre de phares n'est pas limité.
   - `visibilite` : voir plus bas.
2. Déposer les captures dans `src/assets/captures/` :
   - `<slug>.webp` : capture d'ordinateur, au format 16:10 (1440×900 ou plus) ;
   - `<slug>-mobile.webp` : capture de téléphone (facultative ; mettre
     `"visuel": { "mobile": "aucun" }` s'il n'y en a pas).
   Les formats AVIF et WebP et les différentes tailles sont produits au build.
3. Pousser sur `main` : GitHub Actions construit et publie le site.

C'est tout : les compteurs (projets, commits, mois d'activité, technos), les filtres,
la position de l'étoile dans la galaxie et les liens « Dans la même constellation »
(`lies`) sont calculés à partir des données. Le build s'arrête avec un message clair
si une capture manque, si un slug ou un numéro HH est en double, ou si une catégorie
est inconnue.

Une nouvelle catégorie s'ajoute de la même façon, dans le tableau `categories`
(`id`, `label`, `intro`, `couleur`, `ordre`, et facultativement `lettre`). Son amas est
placé automatiquement dans la galaxie ; on peut imposer sa place avec
`"amas": { "angle": 200, "rayon": 30 }` (degrés, unités de la scène).

## Visibilité

Chaque projet a un champ `visibilite` :

- `public` : publié ;
- `a-valider` : publié aussi (en attendant la décision) ;
- `masque` : jamais généré, ni page, ni carte, ni lien.

La liste des états publiés est une seule constante, `VISIBLE_STATES`, dans
`src/config/site.ts`. Pour ne publier que les projets validés, la remplacer par
`['public']`. Aucune note interne n'est stockée dans ce dépôt.

## Textes

- Interface (boutons, titres de section…) : `src/i18n/ui.ts`, en français et en anglais.
- Texte « À propos » (provisoire) : `src/i18n/about.ts`, seul endroit à modifier.
- Familles de technos du « spectre d'émission » et réglages divers : `src/config/site.ts`.

## Travailler en local

Il faut Node 22.

```sh
npm ci            # installe les dépendances (versions figées)
npm run dev       # serveur de développement : http://localhost:4321/
npm run check     # vérification des types (astro check)
npm run build     # construit le site dans dist/
npm run preview   # sert dist/ en local
```

Le premier build optimise toutes les captures (environ deux minutes) ; les suivants
réutilisent le cache.

Adresses utiles pour tester :

- `/?nogl` ou `/#sans3d` : force le ciel sans 3D ;
- `/#avec3d` : réautorise la 3D sur un appareil où elle a été coupée ;
- `/?still` : fige l'intro de la caméra (captures d'écran) ;
- `/?q=high` : qualité maximale de la 3D, sans adaptation.

## Organisation

```
data/catalogue.json          catalogue des projets et des catégories (source unique)
src/config/site.ts           réglages : visibilité, familles de technos…
src/i18n/                    textes d'interface (ui.ts) et À propos (about.ts)
src/lib/catalogue.ts         lecture, validation et chiffres calculés au build
src/lib/images.ts            captures trouvées par convention à partir du slug
src/components/              sections de l'accueil, fiche projet, en-tête…
src/pages/                   accueil FR/EN, pages projet FR/EN, 404, sitemap
src/styles/                  CSS en couches (@layer) : tokens, base, sections, lite, calme
src/scripts/                 scripts : en-tête, atlas, fiche, effets, garde-fou 3D
src/scripts/cosmos/          scène Three.js : galaxie, étoiles, lentille, caméra, étiquettes
.github/workflows/deploy.yml publication sur GitHub Pages
```

## Mobile et sûreté

Sur téléphone, tablette ou écran étroit, la page s'affiche d'abord avec un ciel en CSS
et tout son contenu. La 3D ne démarre qu'ensuite, en version légère (moins de 8 000
particules, résolution 1×, sans nébuleuses ni tampon flottant). Un garde-fou note
chaque démarrage de la 3D : si un chargement s'arrête pendant ce démarrage (plantage
de l'onglet), la 3D est coupée pour de bon sur cet appareil et le ciel CSS reste
affiché. Si la 3D est trop lente sur un téléphone, elle s'efface d'elle-même.
