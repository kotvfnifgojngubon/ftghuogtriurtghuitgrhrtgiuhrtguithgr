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

### Munitions d'aile et missiles spécialisés

Les munitions sous les ailes et en vol sont aussi des fonctions de forme, nez vers +x : `ordShape(code, L)` (missile `a`,
roquettes `u` et `d`, torpille) et `smisShape(s, L)` pour les douze missiles spécialisés (`SMIS`, codes `α` à `μ`).
`ordSprite(code, L, angle, chargement)` les met en cache par angle (64 pas). Le plan `s` d'un missile spécialisé donne :
rayon du corps `r`, nez `nk` (`cone`, `ogive`, `facet`, `reinf`, `lens`, `blunt`), ailettes (`fin`, `fh`, `fl`, `tri`),
canards, bandes, hachures, rayures, anneaux, antennes, renflement.

Deux pièges vus en les dessinant :
- la forme doit renvoyer 0 hors de sa longueur (`u < 0` ou `u > 1`), sinon la tuyère et la pointe filent jusqu'au bord de
  l'image en un trait d'un pixel ;
- un nez se compte en pixels (2 à 4), pas en fraction de la longueur : un nez long n'est qu'une aiguille, en pointillé
  une fois tournée.

En vol, `smisFx` ajoute la flamme (cycle de trois images, palette `SFLM` du blanc au rouge, deux pixels d'épaisseur pour
les lourds) et les voyants animés (anneaux de l'Ancre Noire, reflet de la lentille du Faux-Spectre). Les leurres des
contre-mesures (`CMLURES`, dessinés par `drawCMLures`) suivent la même règle : rampes de couleurs courtes, cycles de 3 ou 4
images, aucun anticrénelage, et un `flashAt` bref quand ils doivent éclairer la scène.

### Coques dessinées à la main (Machines et Xal'thar)

Les Machines et les grands Xal'thar sont des plans `shipDef` écrits à la main avec des briques partagées :
- Machines : `mSpon` (sponson à liseré de bronze), `mNac` (nacelle moteur), `mTower`/`mTowerXY` (tour à étages),
  `mRibs`, `mBays`, `mVents`, `mTruss` (ferme), `mDeck` (pont d'envol), `mSpikes` (flèches plantées dans la coque) ;
- Xal'thar : `xHull`/`xLayer` (coque lissée et couches en gradins), `xPod`, `xPylon`, `xBridge` (passerelle en goutte),
  `xBlist` (cloque de tourelle), `xFin`, `xSeams`, `xlSpon`, `xBays`, `xlPanels` (plaques en relief), `xStern`.

Leçons : un nom de fonction ne doit pas déjà exister dans le jeu (la dernière déclaration gagne) ; le relief projette
les pièces surélevées vers le bas de l'écran, donc une pièce métallique posée pile sur le bord inférieur d'une coque
déborde côté tribord — la reculer de deux unités ; `buildUnique` retire désormais toute miette de coque détachée
(moins de 4 % des pixels), ce qui évite les débris dès la première image.

Xal'thar, version anguleuse (corvettes à porte-flottes) : `xWar(L,H,o)` assemble une coque à partir d'un profil
(`o.P`), de nacelles anguleuses (`xNacA`), d'étais droits (`xStrut`), de sponsons à tranchée (`xSponA`), d'affûts
hexagonaux (`xMount`) et de plaques étagées (`xDetail`). Plus de boules ni de demi-arcs : tout est pan coupé.
Calibres : `C` (petite batterie), `K` (moyenne), `k` (capitale) ; réacteurs `R`, `ρ` (moyen), `r` (capital), `Ρ` (titan).

### Plateformes d'amarrage (`dockDef`)

Une plateforme est un secteur de station construit par `dockDef(clé, faction, o)` : une épine centrale (`o.ys`,
`o.sw`), un moyeu côté station (`o.hub = [longueur, au-dessus, au-dessous]`) et des darses `[x0, longueur, largeur,
côté, classe]` ouvertes vers l'extérieur (pont `dark` à grille, rails de guidage, berceaux, môles à chaque bout, sas
`I`, feux de lèvre et d'axe, équerres peintes). Classes : `M` (corvettes, cargos moyens), `L` (frégates, gros cargos),
`C` (capitaux) ; le vaisseau amarré est tiré de `DOCK_SHIPS` à la taille de la darse (`dockPick`). Une plateforme
asymétrique (darse capitale d'un seul côté) doit garder `asym:true` (sinon les modules sont doublés en miroir) et
`edge:false` ; pas de livrée ni de bandes corsaires (`liv=null`, `noHaz`). Au placement dans `CPLX`, mettre le bout
du moyeu contre le noyau (centre = rayon du noyau + longueur/2) et décaler perpendiculairement de l'écart de l'épine
pour qu'elle reste dans l'axe. Sur une plateforme tournée vers l'ouest, `berthFace` retourne le vaisseau amarré
pour qu'il ne soit jamais la tête en bas. Les bras de serrage, la passerelle et les conduites sont dessinés en jeu
(`drawBayMoor`).

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
  refroidit le long de `XFIRE` (9 tons, du blanc au jaune, à l'orange, au rouge et à la braise ; l'auteur du jeu a essayé
  une rampe plus rouge et préféré celle-ci). `smk` lui fait laisser une fumée en mourant ;
- **le feu** se peint en disques opaques, en passes : tous les liserés, une trame de transition (`blitDiscD`, un pixel sur
  deux selon Bayer), tous les corps éclairés en haut à gauche, le halo tramé puis le point chaud. Seule la silhouette de la
  boule garde un bord sombre ;
- **la fumée** (`XSMOKE`, gris violacé) se peint opaque dans un calque à part, en trois passes (ombre en bas à droite, corps, calotte
  éclairée), puis se pose d'un bloc à 50 % d'opacité. C'est un nuage, pas des bulles, et une coque reste lisible au travers ;
- `addRing(x,y,vx,vy,r0,r1,durée,épaisseur,col)` : un anneau (sortie en cubique, il s'amincit en s'éloignant). Les
  explosions n'en posent **plus** (décision de l'auteur du jeu : pas d'ondes). Il reste l'éclair du départ (`col` nul) :
  trois disques pleins, blanc chaud au cœur, pendant une ou deux images ;
- **le plafond** est `puffMax()` = `PMAX / 22`, qui baisse avec le plafond des particules quand la machine peine ;
- **les sprites de disques** sont en cache (`discSprite`, `blitDisc`, pas plus grossier au-delà de 12 px de rayon) ;
  `fillDisc` et `fillRing` dessinent ligne par ligne, en pixels nets ;
- `updatePuffs` les fait vieillir, `drawPuffs` les dessine (après les débris opaques, avant la lumière additive) et `drawXRings`
  dessine les anneaux, dans la passe additive.

**Débris** (`addChunk(x,y,vx,vy,durée,taille,chaleur,sillage)`, liste `chunks`) :
- ce sont de petits morceaux de coque irréguliers de 2 à 6 px. Ils sont ombrés comme les coques (reflet en haut à gauche,
  ombre, contour sombre) et tournent par crans de 45°. Il y a 24 formes en cache (`chunkSprite`) ;
- `chaleur` (0 à 1) : un débris sort chauffé à blanc ou au rouge et refroidit vers le métal (palettes `CHK`). Avec
  `sillage`, tant qu'il est chaud, il laisse un trait serré de particules de feu puis de fumée (des particules, pas des
  bouffées : il ne prend pas la place de la fumée de l'explosion) ;
- le plafond est `chunkMax()` = `PMAX / 45` ;
- `explosion` en lance 4 + 4k, dont un sur deux brûlant (version `lite` : moins de débris, sans sillage) ;
- `bigBlast` en lance de plus gros sur toute la coque ;
- les braises (type 13) sont plus nombreuses et scintillent en refroidissant.

**Événements différés** : `later(délai, fn)` exécute `fn` plus tard, au rythme du jeu (240 au plus, vidés avec le monde).
Il sert aux chaînes d'explosions le long d'une coque et à la couronne d'explosions qui précède une rupture.

**Mort des grands vaisseaux** (`bigShip`), en trois actes :
1. **L'agonie** (`capDying`) monte en puissance avec `p`, qui va de 0 au premier signe à 1 quand le réacteur cède :
   - les explosions se rapprochent, grossissent avec la coque (`gk`) et gagnent toute sa longueur ;
   - le cœur rougit (`heatCell`) et le réacteur pulse (`flashAt`) ;
   - des conduites cèdent en chaîne (`later`).

   Ces explosions sont en version allégée (`explosion(…, lite)`) et s'espacent quand le jeu abaisse `PMAX`.
2. **La rupture** (`bigDeath`) : la cascade de `bigBlast`, puis la coupure en tronçons, avec des explosions serrées tout le
   long de la cassure.
3. **L'après** : chaque grand tronçon garde ses cellules de cassure (`_brk`) et, pendant 4,5 à 7 s (`_burnT`), il fume,
   crache du feu et pète encore le long de la cassure (`updatePuffs`).

**Lumière** (`collectLights`, puis `renderLighting`) :
- `addLight(x,y,r,col,a,rim)` ajoute une lumière. Il y a deux cartes de lumière, à demi-résolution :
  - **lumières douces** (moteurs, faisceaux, tirs) : elles s'ajoutent aux coques (à 50 %) et teintent très faiblement le
    vide autour d'elles ;
  - **lumières `rim`** (éclairs d'explosion, feu) : une carte à part, qui ne touche **que les coques**. Leurs paliers
    dessinaient des anneaux concentriques dans le vide. Les lumières y gardent la plus forte (`lighten`) au lieu de
    s'additionner : une somme d'oranges plafonne le rouge et vire au jaune-vert. Leurs paliers sont tramés
    (`lightSpriteD`), donc sans anneaux nets sur la tôle, et elles **teintent** la coque vers leur couleur (mélange à 60 %)
    au lieu de s'y ajouter : une explosion rougit la tôle au lieu de la blanchir ;
- `rim` : la lumière peut allumer le **liseré** des coques tournées vers elle (`rimLight`). Ont ce droit les éclairs
  (`flashAt`) et les bouffées de feu, pas les moteurs. Le liseré, c'est la coque moins la coque décalée de 2 px vers la
  source, coloré par la carte de lumière (amplifiée ×4) et **posé par-dessus**, pas ajouté (sur une coque claire, une
  lumière ajoutée sature au blanc et ne se voit pas). Il touche 6 coques par image au plus, rognées à la portée de la
  lumière, et il est ignoré quand la lumière est trop petite pour la coque (`L.r < b.rad*0.22`) ;
- les incendies éclairent leur coque (deux lumières qui vacillent par coque, dix en tout).

Autres effets :
- `flashAt(x,y,r,col,durée)` : lueur en anneaux tramés (elle éclaire aussi les coques voisines, liseré compris) ;
- `fballs` : anciennes boules de feu (`drawFireballs`), que `explosion` n'utilise plus ;
- `addShock(x,y,puissance,max,{col})` : onde de choc de réacteur. Ses dégâts restent, mais elle **n'est plus dessinée**
  (pas d'ondes) ; seule l'onde nucléaire garde son front, qui montre la zone mortelle ;
- `blasts` (nucléaire) et `amBlast` (torpilles, missiles lourds) : souffles. `amBlast` n'a plus de dôme ni d'anneaux.
  C'est un éclair blanc de 0,06 s, une boule de feu en bouffées et langues de feu, un noyau rouge et blanc qui persiste,
  des braises, puis une longue fumée ;
- `bigBlast(b)` : la fin d'un grand vaisseau, **sans grosse boule** (demande de l'auteur du jeu). C'est une cascade
  d'explosions de la recette des petites :
  - au réacteur : une seule explosion de la taille de celle d'un croiseur ;
  - la chambre du réacteur cède en quelques coups serrés ;
  - puis, sur 10 à 34 points du bord et de l'intérieur, chaque point explose d'autant plus tard qu'il est loin du réacteur
    (une seconde environ), plus gros au cœur et plus petit aux extrémités ;
  - éclats et braises.

  Les positions sont prises avant la rupture et suivent la dérive du vaisseau. `bigDeath` y ajoute une rangée
  d'explosions serrées le long de la cassure ;
- `trails` : traits de rail ;
- `explosion(x,y,k,vx,vy,lite)` : la recette complète, à l'échelle `k` (0,4 : une roquette ; 1 : un module ; 2,4 : une
  frégate ; 3,4 : un croiseur ; jusqu'à 5 sur la coque d'un géant), en six temps (`lite` : deux fois moins de bouffées) :
  1. éclair ;
  2. langues de feu (petites bouffées projetées loin, qui découpent le bord de la boule) ;
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

## 7. Intérieurs des vaisseaux (`inBuild`, `inTile`, `inSprite`)

Vue de dessus de trois quarts, au pixel de coque (1 px = 2/3 m), proue à droite, bâbord en haut, comme le plan rayons X.
- Données : `xrBuild` (composants, emprises x/y/z, réseaux, cloisons étanches), `buildInterior` (salles, coursives,
  portes du jeu), `CREW_N` et le rôle du plan (équipage), `st.fighters` / `loadoutOf` (porte-flottes). Construire le
  gabarit (`xrTpl`) avant `xrBuild`, sinon le plan relâche un grand gabarit et tout est recalculé.
- Grille : `walk` (1 debout, 2 accroupi, 3 à quatre pattes selon la hauteur du volume), `area`, `doorAt`, `block`
  (équipement qui bloque, seulement dans les salles, avec une allée le long des cloisons), `wall` (blanc, face sud en
  relief). `inConnect` relie toute poche isolée par un passage et le note dans `M.hyp`.
- Tuiles de 256 px rendues à la demande (`inTile`) : sols par type de salle, marquages (`M.decals` : liserés jaune et
  noir autour des machines, trappes, siphons, traces, allées peintes, emblème), lumières, cloisons, équipements du plan
  (`inEq3`), mobilier (`inProp`, `i2c_propdraw`), réseaux masqués sous les sols (25 %), nets dans les espaces techniques.
- Mobilier (`inProps`, catalogue `IN_FURN` par genre de salle) : rangées le long des cloisons nord, sud, est et ouest,
  îlots en grille au centre (couchettes, tables, établis, tours, imprimantes, pupitres de quart, conteneurs…), objets
  épars. Un meuble de cloison exige 2 px libres devant lui et ne doit pas augmenter le nombre de parties de la salle ;
  un îlot garde une allée libre tout autour. Les postes de l'équipage viennent du mobilier (`IN_PPOST`, `inPropPosts`) :
  places assises aux tables et aux pupitres, lits d'infirmerie, établis… au plus une personne debout pour ~32 px².
- Équipage visible : les postes du plan plus quelques passants dans les coursives ; le reste est « sur les autres ponts
  ou au repos » (bandeau). Attablés et assis aux pupitres : seul le haut du corps est dessiné (de dos devant le meuble,
  de face derrière le plateau).
- Équipements du plan (`inEq3`, `inEqTop`, `i2d_eqdraw`) : socle, corps en volume, face avant (portes, grilles, voyants,
  étiquette), dessus par famille. Au-delà de ~4 px de coque, les détails restent à taille humaine et se répètent
  (`inPlating` : tôles de 1,7 m rivetées ; vannes, manomètres, échelles, passerelles, pochoirs `inStencil` ; rangées de
  baies ; pompes reliées par des collecteurs ; couronne de bobines) au lieu de grossir avec l'objet.
- Squelette des personnages (`IC_SK`) : proportions de la planche (tête et casquette ~19 % de la hauteur, épaules de
  ~10 px, taille haute, jambes longues), trois-quarts réel en direction 2 (épaule éloignée rentrée) ; assis : bassin
  abaissé de `IC_SITB`, hanches en `IC_SITHIP` (sert au dessin à mi-corps des attablés).
- Personnages : `inSprite(look, pose, dir, frame, S)`, 32 × 56 px au zoom 15, pieds en (16, 53) ; S = échelle de
  peinture (zoom / 15 au-delà de 1,2) : chaque forme est tracée à la résolution de l'écran et les détails fins
  (`icDot`, `icLine` : visage, aiguillette à trois cordons, galons de manche, boutons, jugulaire, écusson) n'existent
  qu'en haute définition. Tenues `std` (grade 0 à 11), `espace`, `combat`, `abordage`, `ceremonie`, `hiver`,
  `commandement` ; poses `stand`, `walk`, `run`, `sit`, `type`, `eat`, `crouch`, `crawl`, `sleep`, `work`.
- Sons (`i6_snd`) : recettes synthétisées ajoutées à `SND_JOBS` (portes coulissantes, cloisons étanches, trappes,
  pas selon le sol, bips, fauteuil), joués par `inSnd` (volume et panoramique selon la distance au joueur, étouffés en
  combinaison) ; ambiances en boucle de 4 s par famille de salles (`inAmbStep`), coupées à la sortie.
- Seuls les vaisseaux humains sont visitables (`inHumanSrc`) ; les styles des autres constructeurs restent dans le code
  mais ne servent pas.
- Intérieurs humains (`i2f_human`, `i2g_human`, `i2h_deco`) : sièges multi-pièces (`inSeat` : commandement, console,
  réfectoire), couchettes militaires (`inBunkH`), effets personnels sans emprise (sac, bottes, uniforme plié, affiche,
  étagère murale, prise), cuisine (distributeur, recycleur, tableau d'affichage), passerelle (plaque du vaisseau,
  panneau d'état ; pupitres en arc autour du fauteuil du commandant, rangées si la salle est coupée), CIC en anneau
  autour de la table tactique, atelier (établis outillés, servantes, casiers à pièces, compresseur), machines (groupe
  hydraulique, collecteur), boucliers (bobines à trois couches, isolateurs, condensateurs), batteries, armurerie
  (présentoir de casques et gilets), tourelles (pupitre de pointage, obus), missiles détaillés, hangars (stations de
  ravitaillement, bras de maintenance ; places des appareils réservées), sas (pupitre de pressurisation).
  Marquages (`inHumanDecals`) : numéros de secteur et flèches des coursives, conduites au sol entre machines,
  passerelle grillagée du réacteur, marques de stationnement, zones de chargement, brûlures de soudure.
- Constructeurs (`IN_ST`, `inFacOf`, `inST`, `inApplyStyle`) : humain (militaire industriel), pirate (récupération,
  rouille, rustines, câbles), xalthar (organique, courbes, veines bioluminescentes), anciens / Machines (géométrie,
  chanfreins, circuits cyan). Le style change les formes du kit (`inPropKit` : `path` nette, rapiécée, arrondie,
  chanfreinée), les matières (`tex`), les accents (`deco`), les sols (`inFloorCol`), les cloisons (`inWalls`), la
  lumière, les portes (`inDoorDraw`) et l'équipage (tenues `corsaire`, `nocturne`, `machine`). `IN_SUBST` remplace
  le mobilier qui n'a pas de sens pour un constructeur (alcôves de recharge des Machines, capsules Xal'thar, hamacs).
- Bibliothèque de mobilier : `IN_PD[type](K, p, x, y, W, H, Z, M, g)` (`i2c_furn`, `i2c_rooms`, `i2c_more`), repli
  sur `inPropOld` ; sièges `inSeat` (bureau, réfectoire, tabouret, commandement, coque, cadre) ; variantes par
  `p.v` et `p.var` (couchette double ou lit simple, table longue, carrée ou ronde) ; graine par vaisseau et par salle.
- Tuile : sols, marquages, seuils de porte, cloisons (panneaux, renforts, bandeau lumineux, conduites, boîtiers,
  grilles, écrans, signalétique, baies d'observation sur l'extérieur), objets, puis passe de lumière (`inLightPass` :
  ambiance par salle, plafonniers, halos des écrans) ; couche plafond séparée (`inCeil`, `T.ov`) dessinée au-dessus
  de l'équipage. Couche animée (`inAnims`, `i5b_anim`) : écrans, voyants, ventilateurs, holo, moniteurs, consoles
  qui s'éveillent à l'approche, plafonniers qui grésillent ; seuls les éléments visibles sont redessinés.
- Vérifier avec un balayage de tous les vaisseaux : équipements du plan présents, portes du plan posées,
  zones atteignables depuis la passerelle ou le poste, places des porte-flottes égales à la capacité.
