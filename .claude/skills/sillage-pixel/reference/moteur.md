# Le moteur graphique de Sillage Stellaire, pour qui le modifie

Tout est dans un seul fichier, `jeu/Sillage_Stellaire.html`, dans une fermeture `(function(){'use strict'; … })()`.
Les numéros de ligne bougent à chaque version : cherche les fonctions **par leur nom**, par exemple
`grep -n "^function buildUnique(" jeu/Sillage_Stellaire.html`.

Repères fixes :
- l'écran du jeu fait 320 × 180 pixels logiques, agrandis par `SCALE` (paliers `ZL`, de 1/4 à 6) ;
- 1 pixel de coque = 1 mètre. Les coques des factions sont dessinées 1,5 fois plus grandes que leur plan (`SHIP_K`) ;
- **l'avant est à droite (+x)**. Le haut du plan, c'est bâbord. Les coques humaines sont symétriques haut/bas ;
- le soleil est à l'origine du monde. L'éclairage d'une coque dépend de l'angle sous lequel le vaisseau le voit (`sunBucket`, 32 crans).

## 1. Le corps pixelisé : `class Body`

Chaque vaisseau, épave ou astéroïde est une grille de cellules **destructibles**, une par pixel :
- `type` : 0 = vide, `T_HULL`, `T_ARMOR`, `T_ENGINE`, `T_CORE`, `T_GUN`, `T_ROCK`, `T_ORE` ;
- `col` : la couleur de base (0xRRGGBB) ;
- `hp`, `heat`, `scorch` : la vie, la chaleur et la brûlure de la cellule ;
- `emi` : 1 pour un pixel émissif (néon, hublot, verrière, tuyère). Il ne reçoit pas d'ombre et nourrit le halo ;
- `lc` : la normale du bord, sur 16 directions, avec une force de 0 à 3. `normals()` la calcule depuis la distance au bord (chanfrein jusqu'à 6 px).

`repaint()` puis `paintRect()` composent la couleur finale. Dans l'ordre :
1. la brûlure assombrit (`SCORCHF`) ;
2. `SHADE_T` décale le ton selon le soleil, de −2 à +2 : liseré `RIM` au maximum, ombre bleutée au minimum ;
3. la chaleur tire vers `HOTC` (blanc, jaune, orange, rouge) ;
4. les pixels émissifs et le métal très chaud vont dans un second calque. `haloRect()` en tire un **halo en 4 paliers**, ajouté par-dessus (`lighter`).

Un vaisseau de plus de 90 000 pixels (`BIGB`) se repeint par bandes, sur plusieurs images. Les outils le terminent (`STU.settle`) avant chaque photo.

`drawBody(b)` pose la coque, tournée par crans de 2,25° (`QSTEP`) sauf pour les géants, puis son halo.
Ensuite, `render()` dessine dans l'ordre :
1. `drawExhaust` : les flammes, sous la coque ;
2. `drawBody` : la coque ;
3. `drawShipFX` : réacteurs, trappes, hangars ;
4. `drawTurrets` : les tourelles, au-dessus de tout ça.

## 2. Les coques des factions : `shipDef` puis `buildUnique`

Un plan de coque s'écrit avec `shipDef(L, H, fn)`, dans `HUMAN_SHIPS` (coques de base) ou `MODEL_SHIPS`
(modèles des marques et des factions). `fn` reçoit `{c, part, eng, mir, S, bx}` :

| outil | rôle |
|---|---|
| `c` | l'axe (H/2) |
| `part(matière, hauteur, polygone, miroir)` | une pièce de la silhouette ; les pièces s'empilent, la dernière recouvre |
| `S(points)` | referme un profil : les points du bord haut, de la poupe au nez, suivis de leur reflet |
| `mir(points)` | le reflet haut/bas d'un polygone |
| `bx(x0,y0,x1,y1,pan)` | un rectangle aux coins coupés |
| `eng(y, hauteur, longueur, groupe, miroir, groupeDuReflet, xCloche)` | une tuyère à la poupe |
| `ellPoly(cx,cy,rx,ry,n)` | une ellipse en polygone (coques organiques) |
| `blade(part, points, l0, l1, z, matière, miroir)` | une lame courbe (spline + ruban qui s'effile de `l0` à `l1`), pour les ailes des Xal'thar |

**Matières** (`HMAT`, cinq tons de l'ombre au reflet) : `hull`, `plate`, `dark`, `blue`, `white`, `metal`, `vent`, `gun`, `engine`.
**Hauteur** (`z`) : c'est elle qui fait la lumière. `buildUnique` floute la carte des hauteurs pour obtenir la pente. Ce qui
monte vers le bas-droite regarde la lumière (en haut à gauche), ce qui est haut s'éclaircit, et ce qui dépasse projette une ombre
(`shadow`). Les valeurs du jeu vont de 1 (aile) à environ 2 (épine dorsale, tourelle).

La fonction renvoie la fiche du vaisseau :

| champ | sens |
|---|---|
| `id` | identifiant unique ; un id existant remplace la coque |
| `decor(a)` | peinture et détails (voir plus bas) |
| `mods` | modules à poste fixe : `[code, x, y]`, ou `[code, x, y, xBouche, yBouche]` pour une arme d'aile |
| `thr` | poussée de référence des flammes |
| `armorX` | début du blindage de proue |
| `pyl` | points d'emport sous les ailes `[x, y, longueur, 'i' ou 'o']` |
| `st` | caractéristiques (vitesse, accélération, virage, bouclier, énergie, soute, équipage…) |
| `info` | fiche affichée (nom, classe, longueur…) |
| `tscale` | échelle des tourelles |
| `shadow` | longueur des ombres portées |
| `panel` | pas des tôles |
| `edge` | `false` : pas de blocs en saillie sur les grands bords |
| `seed` | graine des détails (le hasard de la coque passe par `mulberry`/`hash2`, jamais par `Math.random`) |
| `engPal` | palette des flammes (`XAL_ENG`…) |
| `skin` | `'xal'` : chair de nacre |
| `pal` | `'anciens'` : métal ancien |
| `pirate` | coque rapiécée, asymétrique |
| `emb` | emblème (`EMBLEM`, `PEMBLEM`, `XEMBLEM`, `AEMBLEM`) |
| `tag` | immatriculation (police `FONT3`) |
| `fac` | faction |

**Le décor** (`a`), en coordonnées du plan, reçoit les options `{m: matière, e: 0xcouleurÉmissive, z, dz, add, t, seam}` :
- `a.poly(P,o)`, `a.rect(x0,y0,x1,y1,o)`, `a.disc(x,y,r,o)` : formes pleines ;
- `a.band(points, épaisseur, o)` : liserés et conduites ;
- `a.lights(x0,x1,y,pas,couleur,proba)` : une rangée de hublots ;
- `a.vents(x0,y0,x1,y1)` : des grilles ;
- `a.text(str,x,y,matière,taille)`, `a.emblem(x,y,taille)` : immatriculation et emblème ;
- `a.zAt(x,y)` : lit la hauteur à cet endroit ;
- `bands2(a,H,P,ép,o)` : une paire de liserés symétriques.

**Codes de modules** (`MODS`) :

| code | module | code | module | code | module |
|---|---|---|---|---|---|
| `H` | coque | `C` | canon | `w` | mitrailleuse d'aile |
| `A` | blindage | `K` | obusier | `a` | missile d'aile |
| `R` | réacteur | `Q` | rail | `u` | roquette |
| `r` | réacteur capital | `L` | laser | `d` | roquette lourde |
| `D` | quartiers | `X` | lance solaire | `b`, `h`, `l` | bombes |
| `E` | propulseur | `U` | nuée | `x` | torpilles |
| `e` | propulseur capital | `M` | roquettes | `p` | plasma |
| `B` | batterie | `Z` | bélier | `i` | leurres |
| `S` | bouclier | `J` | Dard | `o` | bouclier orbital |
| `s` | bouclier capital | `G` | Faucon | `y` | drones |
| `P` | défense rapprochée | `Y` | Marteau | `n` | mines |
| `F` | extincteur | `N` | nucléaire | `z` | coupe-jus |
| `I` | sas | `k` | batterie capitale | `T` | grappin |
| `O` | soute | `q` | spinal | `c` | canon titan |
| `V` | hangar | `m` | croisière | `t` | tracteur |

**Étapes de `buildUnique`** (commentées dans le code, de 1 à 8) :
1. silhouette ;
2. tôles symétriques ;
3. tuyères ;
4. décor ;
5. grille des modules ;
6. équipement de la faction ;
7. contour, relief lissé et lumière (puis 7 bis : corsaires) ;
8. à qui appartient chaque pixel, puis les feux de position.

**Un modèle** (`MODELS`) combine une coque (`ship` ou la coque `hull` de sa catégorie), une marque (`BRANDS` : `liv` = livrée),
un profil (`p` : « Vit +1 · Bli −1 », qui change la coque : rebords de blindage, rétrofusées, réservoirs…) et ses équipements (`extra`).
Les corsaires réutilisent des coques humaines repeintes (`fac:'pirate'`, marque `prouille`, `psang` ou `pjaune`).

**Identité visuelle des factions** (ce que les contrôles comparent) :

| faction | ce qui la définit à l'image |
|---|---|
| Humains | tôles rivetées grises, symétrie stricte, liseré bleu de l'Armée (`blue`), verrière bleu clair, feux rouge et vert, flammes bleues (`HENG`) |
| Corsaires | acier nu soudé de travers, rouille, bandes de danger, aucune symétrie, flammes orange, palette très chargée (c'est voulu) |
| Xal'thar | nacre violette, courbes et lames (`blade`, `ellPoly`), organes et veines qui luisent (`XAL_LIT`, `XAL_HOT`), flammes violettes (`XENG`) |
| Anciens | fer noirci et bronze, alvéoles hexagonales, pistes de circuits ambrées, carters octogonaux (`MTS`), flammes ambrées (`AENG`) |

## 3. Les tourelles

Les sprites des tourelles se calculent pixel par pixel à partir d'une fonction (`htSprite`, mis en cache par angle) :
- `HTS` : humains ;
- `MTS` : Machines ou Anciens ;
- `XTS` : titanesques.

Chaque entrée a un rayon `r` et une fonction `f(x, y)` qui renvoie `[matière, hauteur]` ou `null`, avec les canons vers +x.
Les fûts (`HBAR`, `MBAR`, `XBAR`) sont décrits par leur décalage, leur longueur, leur frein de bouche, leur recul (`rec`) et leur retour (`ret`).
La lumière vient d'en haut à gauche de l'écran, quel que soit l'angle de la tourelle.

## 4. Les vaisseaux modulaires (ancien chantier)

`buildShip(rows, pal)` assemble des modules de 10 × 10 pixels (`MS`), écrits comme une grille de lettres (`PRESETS`, `ENEMY_DESIGNS`).
Il trace une enveloppe continue, puis peint les panneaux, les rivets, la livrée (`PALS`) et les équipements (`modEquip`).
Ce chantier est désactivé (`MODULAIRE=false`), mais `buildShip` sert encore pour les capitaux en blocs (`expandCap`).

## 5. Les effets

Les particules sont dans `parts`. `addP(x, y, vx, vy, durée, type, couleur, freinage, taille)` en ajoute une, et `updateParticles(dt)`
fait vieillir toutes les listes d'effets. Le rendu trie les particules par type :

| type | rendu | palette (du jeune au vieux) |
|---|---|---|
| 0 | traînée de moteur | `ENGC` (blanc, cyan, bleu nuit) |
| 1 | étincelle (étirée en trait par sa vitesse au-delà de 70 px/s : tête vive, queue plus sombre) | `SPKC` |
| 2 | débris opaque | couleur fixe |
| 3 / 7 | moteurs corsaires / boss | `EENG` / `BENG` |
| 5 | feu | `FIREC` |
| 6 | couleur fixe, clignote en fin de vie | |
| 9 | lueur | `GLOWC` |
| 10 | fumée (opaque, transparente) | `SMOKEC` |
| 12 | couleur qui scintille dès la mi-vie | |
| 13 | braise (opaque) | `EMBC`, du blanc à la cendre |
| 14 | éclat qui tourne | `addShard` |
| 15 | mousse d'extincteur | |
| 16 | vapeur | `VAPC` |
| 17 / 18 / 19 | moteurs humains / Xal'thar / Anciens | `HENG` / `XENG` / `AENG` |

Les opaques (2, 10, 11, 13, 14, 15) passent avant l'éclairage, les autres en mode additif.

**Bouffées et anneaux** (le système des explosions, juste après `let fballs`) :
- `addPuff(x,y,vx,vy,durée,rayon,feu,{drag,smk,delay,warm})` : une bouffée de feu (`feu` vrai) ou de fumée. Le feu
  refroidit le long de `XFIRE` (9 tons, du blanc à la braise). `smk` lui fait laisser une fumée en mourant ;
- **le feu** se peint en disques opaques, en trois passes : tous les liserés, tous les corps éclairés en haut à gauche, puis
  les points chauds. Seule la silhouette de la boule garde un bord sombre ;
- **la fumée** (`XSMOKE`) se peint opaque dans un calque à part, en trois passes (ombre en bas à droite, corps, calotte
  éclairée), puis se pose d'un bloc à 50 % d'opacité. C'est un nuage, pas des bulles, et une coque reste lisible au travers ;
- `addRing(x,y,vx,vy,r0,r1,durée,épaisseur,col)` : un anneau de choc (sortie en cubique, il s'amincit en s'éloignant).
  Avec `col` nul, c'est l'éclair du départ : trois disques pleins, blanc au cœur, pendant une ou deux images ;
- **le plafond** est `puffMax()` = `PMAX / 22`, qui baisse avec le plafond des particules quand la machine peine ;
- **les sprites de disques** sont en cache (`discSprite`, `blitDisc`, pas plus grossier au-delà de 12 px de rayon) ;
  `fillDisc` et `fillRing` dessinent ligne par ligne, en pixels nets ;
- `updatePuffs` les fait vieillir, `drawPuffs` les dessine (après les débris opaques, avant la lumière additive) et `drawXRings`
  dessine les anneaux, dans la passe additive.

**Événements différés** : `later(délai, fn)` exécute `fn` plus tard, au rythme du jeu (240 au plus, vidés avec le monde).
Il sert aux chaînes d'explosions le long d'une coque et à la couronne d'explosions qui précède une rupture.

**Mort des grands vaisseaux** (`bigShip`), en trois actes :
1. **L'agonie** (`capDying`) monte en puissance avec `p`, qui va de 0 au premier signe à 1 quand le réacteur cède :
   - les explosions se rapprochent, grossissent avec la coque (`gk`) et gagnent toute sa longueur ;
   - le cœur rougit (`heatCell`) et le réacteur pulse (`flashAt`) ;
   - des conduites cèdent en chaîne (`later`).

   Ces explosions sont en version allégée (`explosion(…, lite)`) et s'espacent quand le jeu abaisse `PMAX`.
2. **La rupture** (`bigDeath`) : une couronne d'explosions court sur toute la coque en un tiers de seconde, puis le souffle
   du réacteur (`amBlast`, éclair de 0,09 s) et la coupure en tronçons.
3. **L'après** : chaque grand tronçon garde ses cellules de cassure (`_brk`) et, pendant 4,5 à 7 s (`_burnT`), il fume,
   crache du feu et pète encore le long de la cassure (`updatePuffs`).

**Lumière** (`collectLights`, puis `renderLighting`) :
- `addLight(x,y,r,col,a,rim)` ajoute une lumière. La carte de lumière est calculée à demi-résolution, posée sur les coques
  (masque, à 50 %) et, très faiblement, sur tout l'écran ;
- `rim` : la lumière peut allumer le **liseré** des coques tournées vers elle (`rimLight`). Ont ce droit les éclairs
  (`flashAt`) et les bouffées de feu, pas les moteurs. Le liseré, c'est la coque moins la coque décalée de 2 px vers la
  source, coloré par la carte de lumière (amplifiée ×4) et **posé par-dessus**, pas ajouté (sur une coque claire, une
  lumière ajoutée sature au blanc et ne se voit pas). Il touche 6 coques par image au plus, rognées à la portée de la
  lumière, et il est ignoré quand la lumière est trop petite pour la coque (`L.r < b.rad*0.22`) ;
- les incendies éclairent leur coque (deux lumières qui vacillent par coque, dix en tout).

Autres effets :
- `flashAt(x,y,r,col,durée)` : lueur en anneaux tramés (elle éclaire aussi les coques voisines, liseré compris) ;
- `fballs` : anciennes boules de feu (`drawFireballs`), que `explosion` n'utilise plus ;
- `addShock(x,y,puissance,max,{col})` : onde de choc de réacteur (dégâts compris), dessinée en couronnes de pixels nets
  (halo, front blanc, traîne en deux paliers) ;
- `blasts` (nucléaire) et `amBlast` (réacteur des grands vaisseaux, torpilles, missiles lourds) : souffles. Le dôme
  d'`amBlast` est un front blanc et une bande bleutée, pas un aplat ; il laisse des bouffées de feu puis de fumée ;
- `trails` : traits de rail ;
- `explosion(x,y,k,vx,vy)` : la recette complète, à l'échelle `k` (0,4 : une roquette ; 1 : un module ; 2,4 : une
  frégate ; 3,4 : un croiseur), en six temps :
  1. éclair ;
  2. anneaux (un seul, fin, sous k = 0,9) ;
  3. cœur chauffé à blanc ;
  4. boule de bouffées serrées qui refroidissent ;
  5. fumée de 1 à 2,5 s ;
  6. retombée : étincelles étirées, braises, éclats.
- `fxMuzzle`, `fxImpact`, `drawFxBullet` : bouches, impacts et projectiles propres à chaque faction (`fx` = `kin`, `kinp`, `xal`, `xalw`, `arc`, `fusion`) ;
- `drawExhaust` : flammes en sprites (`flameSprite`, palettes `FLAME_PAL[trail]`, 4 images d'animation) ;
- `drawShield` : bulle de bouclier ;
- `damageAt(b,lx,ly,dmg,rad,feu)` : cratère dans une coque ;
- `ignite` : incendie ;
- `detonateNuke` : arme nucléaire.

Le tramage commun est `bay(x, y)` (Bayer 4 × 4, `BAY`). Pour mélanger deux couleurs, `mixI(a, b, t)`.
Le bruit déterministe vient de `hash2`, `hash3`, `vnoise3`, `fbm3`, et de `pnoise2`/`pfbm2` qui tuilent sans raccord.

## 6. Le décor

- `drawSun`, `drawPlanet` ;
- les nébuleuses `gasFar`, `gasTeal`, `gasViolet`, `gasDust`, générées pas à pas pendant l'écran titre ;
- les étoiles `stars1` et `stars2` en parallaxe (`drawTiled`) ;
- `drawTwinkles` ;
- les relais `drawStation`.
