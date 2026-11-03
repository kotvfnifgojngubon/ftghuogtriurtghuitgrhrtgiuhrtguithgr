---
name: sillage-pixel
description: Dessiner, retoucher et animer le pixel art de Sillage Stellaire (jeu spatial en un seul fichier HTML) — vaisseaux et coques des factions (shipDef, buildUnique), modules, tourelles, flammes de moteur, explosions, impacts, boucliers, particules et tout effet animé. À utiliser dès qu'on crée ou modifie un vaisseau, une coque, une palette, une animation ou un effet visuel du jeu, ou qu'on veut juger leur rendu. Rend chaque brouillon avec le vrai moteur du jeu (planches contact, GIF, gros plans), puis le compare aux modèles existants.
---

# Sillage Stellaire : pixel art et effets

Ce skill applique à ton jeu la méthode de pixelfx (Hugo Duprez) : « le code est de la glaise, fais confiance à tes yeux, nourris-toi de références ».
Un prompt en un seul jet donne un vaisseau médiocre. Un bon vaisseau sort de brouillons qu'on **rend, regarde et corrige**.

Dans ce jeu, **rien n'est dessiné à la main**. Les coques sont du code : des polygones, des hauteurs et un décor, que `buildUnique` éclaire, chanfreine, tôle et raye.
Les effets sont des particules du moteur. Il ne faut donc jamais essayer de « dessiner des pixels ». On écrit du code, puis on regarde ce que **le moteur du jeu** en fait.
Les outils chargent le jeu dans Chromium sans écran, entrent dans sa fermeture (`window.__SS`) et photographient le canevas. Ce que tu vois est exactement ce que voit le joueur.

## Mise en place

- Le jeu se trouve dans `jeu/Sillage_Stellaire.html`. Pour une autre version, passe `--game chemin.html` ou `SILLAGE_GAME=…`.
- Il faut Node 18 ou plus et Playwright (`npm i` à la racine, puis `npx playwright install chromium` si aucun Chromium n'est installé). ffmpeg est facultatif (GIF et MP4).
- Les rendus vont dans `records/` (ignoré par git). **Ouvre chaque PNG avec Read : c'est l'étape qui compte.**

Les outils sont dans `.claude/skills/sillage-pixel/tools/` (abrégé `T/` plus bas) :

| commande | ce qu'elle fait |
|---|---|
| `node T/ships.mjs list [mots]` | catalogue : 75 coques et modèles, avec catégorie, faction et taille |
| `node T/ships.mjs <id ou mots>` | planches `light`, `thrust`, `turn`, `damage`, `views` + `stats.json` dans `records/ships/<id>/` |
| `node T/ships.mjs <id> --zoom x,y,l,h` | gros plan d'une zone du gabarit (indispensable au-delà de 300 px de long) |
| `node T/ships.mjs --draft fichier.js` | rend un brouillon de coque `shipDef(...)` à la place de l'original, ou comme une coque nouvelle |
| `node T/fx.mjs list` / `node T/fx.mjs <effet> [--ship id] [--opts json]` | déroulé d'un effet, image par image (`records/fx/<nom>/sheet.png`, `--gif`) |
| `node T/fx.mjs <effet> --times 0,0.03,0.1,0.3,1,2,4 --end 4` | photos aux instants choisis (attaque serrée, longue retombée) ; contrôle : éteint à `--end` |
| `node T/fx.mjs <effet> --compare avant.html` | même effet, même graine, même instant : une rangée par version du jeu (avant / après) |
| `node T/fx.mjs death --ship id --opts '{"pre":0.8}'` | agonie puis mort d'un vaisseau : explosions sur la coque, explosion finale, éclatement en épaves, onde du réacteur |
| `node T/fx.mjs --draft effet.js` | rend un brouillon d'effet, une fonction `(x, y, o, S)` exécutée dans le jeu |
| `node T/check.mjs <id> [--draft f]` | contrôle chiffré, comparé aux médianes de la faction (`tools/baseline.json`) |

Planches de `ships.mjs` :
- `light` : quatre soleils ;
- `thrust` : moteurs coupés, croisière, pleine poussée et boost ;
- `turn` : 0°, −30°, −90° et 180° ;
- `damage` : intact, légers, lourds, en feu ;
- `views` : silhouette, pixels émissifs et découpage en modules.

Avant de toucher au moteur, lis `reference/moteur.md` : corps destructibles, API `shipDef` et décor, matières, codes de modules, types de particules, identité des factions.
Deux brouillons commentés servent de modèles : `exemples/coque-sillon.js` (une coque) et `exemples/effet-sortie-de-trame.js` (un effet).

## 1. Chercher avant d'écrire

1. Lance `node T/ships.mjs list <mots>`. La plupart des demandes sont un modèle existant à retoucher, pas une coque nouvelle. Un modèle se décline déjà par marque (livrée), profil (`p`) et équipements (`extra`).
2. Pour un effet, regarde d'abord `node T/fx.mjs list`, puis les recettes du jeu : `explosion`, `fxImpact`, `fxMuzzle`, `drawFxBullet`, `drawExhaust`.
3. Lis le code des **deux ou trois vaisseaux les plus proches** (même faction, même catégorie) et rends-les. Ce sont eux, ta barre : si le leur a plus de détail, de lumière ou de vie à taille égale à l'écran, le tien n'est pas fini.

## 2. Créer ou retoucher : la boucle

1. **Direction artistique en une ligne** : silhouette, rôle, faction, taille en mètres, accents de couleur, où brille la lumière.
   Exemple : « intercepteur humain de 30 m, flèche fine, ailes delta reculées, liseré bleu, une grosse tuyère ».
2. **Brouillon** dans `drafts/<id>-a.js`. C'est un `shipDef(L, H, ({c, part, eng, S}) => {...})` qui renvoie `{id, decor, mods, ...}`.
   - Pour **retoucher** un vaisseau, copie sa définition depuis le jeu et garde son `id` : le brouillon remplace l'original dans le rendu.
   - Pour une demande ouverte, écris **3 à 5 variantes** (`-a` à `-e`), rends-les toutes et compare les planches avant de choisir.
3. **Rendre, regarder, juger, corriger** : `node T/ships.mjs --draft drafts/<id>-a.js`, puis Read sur chaque planche.
   Juge comme un pixel artiste exigeant (grille ci-dessous), corrige **le pire défaut**, recommence. **Trois tours au minimum.**
   Sur un grand vaisseau, ajoute des gros plans (`--zoom`) sur la proue, les tourelles et les tuyères.
4. **Contrôler** avec `node T/check.mjs --draft drafts/<id>-a.js`. Corrige jusqu'à ce que tout passe, ou justifie chaque alerte (un corsaire est sale exprès).
5. **Intégrer** dans le jeu (section 4), puis relancer `ships.mjs` et `check.mjs` **sans** `--draft` pour vérifier la version intégrée.

Pour un effet, la boucle est la même avec `fx.mjs --draft` :
- choisis `--dt` selon la durée de l'effet (0,02 à 0,05 s pour un impact, 0,1 à 0,25 s pour une fumée) ;
- règle `--frames` pour voir l'effet **jusqu'à ce qu'il soit vide** ;
- ajoute `--ship id` pour le juger sur une coque.

Le compteur `particules : pic N, à la fin M` doit revenir près de 0 pour un effet ponctuel, et rester stable avec `--repeat` pour un effet continu.

## 3. Grille de jugement

**Vaisseau** (à l'échelle du jeu d'abord, la planche ×1 compte plus que le gros plan) :
- **Silhouette** : la vue `silhouette` seule doit dire le rôle (chasseur, cargo, capital) et la faction. Pas de bord en escalier mou, pas de pixel parasite (`check` les signale).
- **Hiérarchie des hauteurs** : 3 à 4 niveaux de `z` nets (aile, fuselage, épine ou tourelle). Si tout est à la même hauteur, la coque est plate et sans chanfrein. Si chaque pièce a sa propre hauteur, c'est de la bouillie.
- **Lumière** : sur la planche `light`, la coque garde sa lecture sous les quatre soleils. Les reflets sont du côté de la lumière, et l'ombre ne mange pas les détails.
- **Émissifs** : la vue `émissifs` montre quelques points francs (verrière, hublots, feux, tuyères). C'est un accent, pas une nappe : au-delà de 25 %, ça bave.
- **Détail à l'échelle** : un détail plus petit que 2 px à l'écran est du bruit. Mieux vaut trois éléments lisibles que vingt grains.
- **Flammes** : sur la planche `thrust`, la longueur reste en rapport avec la coque, les tuyères sont dégagées vers l'arrière et la flamme ne traverse pas la coque.
- **Dégâts** : sur la planche `damage`, les cratères se lisent, le métal chauffe puis refroidit, et le feu reste sur la coque.
- **Faction** : compare aux autres modèles de la faction (tableau dans `reference/moteur.md`). Un Xal'thar en tôles rivetées est raté, même s'il est beau.

**Effet** (la barre de pixelfx, `docs/AUTHORING.md` de leur dépôt, adaptée au vide). Compare toujours avant et après avec `--compare` :
1. **Des lignes et de la lumière, pas des aplats.** Anneaux d'un ou deux pixels, traits, étincelles. Un grand disque plein de couleur pâle ou saturée est presque toujours faux. Le blanc est réservé au cœur le plus chaud.
2. **De la lumière partout, mais brève.** Une lueur large et faible, un point chaud serré, de la lumière sur les coques voisines (`flashAt`, lumières des bouffées).
3. **Des volumes translucides.** La fumée est une forme fondue, ombrée en bas à droite, éclairée en haut à gauche, posée en transparence. Jamais un damier ni des bulles qui se recouvrent.
4. **Un vrai mouvement.** Rapide à l'entrée, lent à la sortie (vitesse forte, freinage fort). Les étincelles s'étirent avec la vitesse. Les éclats tournent. Le feu refroidit en fumée. Dans le vide, rien ne monte ni ne tombe : tout part du centre et dérive avec la vitesse du vaisseau touché.
5. **Une chorégraphie en phases.** Éclair (une ou deux images blanches), choc, boule, dispersion, longue retombée. Beaucoup de petits événements, chacun varié en taille, vitesse, retard et durée.
6. **Un rythme.** Un impact claque en 0,3 à 0,8 s. Une grosse explosion traîne 2 à 4 s, le temps que la fumée se dissipe. Une petite ne doit pas noyer le vaisseau touché.
7. **Lisible à l'échelle du jeu** : un point focal, pas de bruit à l'intérieur des formes.
8. **Propre.** L'effet est éteint à la fin (`--end`). Le pic de particules reste loin de `PMAX`. Le coût d'une image reste raisonnable : surveille-le avec `--compare` et un profil (le rendu sans carte graphique des outils est plus lent qu'un vrai navigateur, mais l'écart entre versions compte).

**Symptôme → correction** :

| on voit | on corrige |
|---|---|
| coque plate, sans relief | écarter les `z` des pièces (fuselage 1,4, épine 1,7, aile 1) ; poser des `part('plate', …)` surélevées |
| coque moutonneuse, bruitée | moins de petites pièces ; des aplats plus grands ; agrandir `panel` sur une grande coque |
| silhouette illisible ×1 | grossir les 2 ou 3 masses principales ; creuser les vides entre aile et fuselage ; supprimer les appendices fins de 1 px |
| liseré qui scintille en rotation | bande d'au moins 1,2 d'épaisseur dans le plan (`band(P, 1.2, …)`) ; éviter les diagonales presque horizontales |
| pixel accroché par un coin | ajuster le sommet du polygone pour que le pixel touche par un côté, ou le supprimer |
| tout brille | moins de `{e: …}` ; les feux en `lights(…, p)` avec une probabilité plus basse |
| rien ne brille | une verrière émissive, deux ou trois hublots, des tuyères bien placées (`eng`) |
| explosion molle, « floue » | entrée rapide et sortie lente (vitesse forte, freinage fort) ; 1 ou 2 images blanches au départ (`flashAt` court) |
| effet en pointillés qui se défait | plus de particules, et des durées égales pour qu'il s'éteigne d'un bloc ; type 6 plutôt que 12 |
| fumée en damier | type 10 (fumée tramée du jeu) plutôt que des points colorés |
| effet qui ne finit jamais | durées bornées ; vérifier `pic → fin` dans la sortie de `fx.mjs` |
| boule de feu en grappe de boules | bouffées plus serrées et plus lentes ; peindre tous les liserés, puis tous les corps (`drawPuffs`) |
| fumée en bulles ou en tas de cailloux | la fondre dans un calque, ombres, corps et calottes en trois passes, puis la poser d'un bloc |
| écran délavé par un grand souffle | un front lumineux et une bande fine, un voile très léger, au lieu d'un disque plein |
| anneau lisse et flou, « vectoriel » | couronnes de pixels (`fillRing`), en paliers d'opacité, plutôt qu'un dégradé radial |
| effet trop coûteux en combat | moins de bouffées sur les petites tailles, sprites en cache, lumières bornées (nombre et rayon) |

## 4. Intégrer dans le jeu

Le jeu est un seul gros fichier : modifie-le avec Edit, jamais avec sed, et jamais en entier. Repère les endroits avec Grep.
- **Coque retouchée** : remplace le `shipDef(...)` de même `id` dans `HUMAN_SHIPS` ou `MODEL_SHIPS`, en gardant le commentaire d'en-tête (nom, longueur, silhouette) mis à jour.
- **Coque nouvelle** :
  1. ajoute le `shipDef` dans `MODEL_SHIPS`, près de ses cousins, avec un commentaire d'en-tête dans le même style ;
  2. ajoute son modèle dans `MODELS` (catégorie `cat`, marque `b`, nom `n`, profil `p`, fiche) ;
  3. vérifie qu'il apparaît dans `node T/ships.mjs list`.
- **Effet** : écris une fonction à côté de ses cousines (`fxImpact`, `explosion`…), avec les palettes existantes, puis branche-la là où le jeu déclenche l'événement.
- Commentaires **en français**, dans le style du fichier : ce que fait le bloc et pourquoi.

## 5. Règles

- **Jamais de `Math.random` dans une coque.** Dans le décor, prends le générateur à graine que le jeu passe en second argument (`decor:(a,R)=>…`, puis `R()`). Ailleurs, utilise `hash2(x, y, graine)`. Une coque doit être identique à chaque construction (`check` le vérifie). Les effets, eux, peuvent utiliser `rnd` et `Math.random` comme le reste du jeu.
- L'avant est à droite, le haut est bâbord, et les coques humaines sont en miroir (`S()`, dernier argument de `part` à 1).
- 1 px = 1 m (×1,5 pour les factions, via `SHIP_K`) : respecte les longueurs des fiches.
- Pense aux géants : au-delà de 300 px de long, pas de boucle par pixel qui teste tous les modules (le jeu cherche par anneaux de cases). Garde un œil sur le temps de construction affiché par `check`.
- Ne recrée jamais les vaisseaux, logos ou personnages d'une œuvre existante. Inspire-toi des codes d'un genre, pas d'un vaisseau précis.
- Ne publie rien d'autre que ce qui a été rendu et regardé. Montre les planches à l'utilisateur, avant et après.
