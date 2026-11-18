# Graphe de `jeu/Sillage_Stellaire.html`

1407 fonctions de premier niveau, 3347 liens d'appel (A cite B dans son corps), 57 sections.

Méthode : analyse statique par expressions régulières. Un appel est compté quand le nom d'une fonction apparaît dans le corps d'une autre et n'y est pas redéclaré localement. Les appels indirects (tables `IN_PD`, gestionnaires d'événements, `requestAnimationFrame`) ne sont pas tous vus.

## Fonctions les plus appelées

- `toast` — appelée par 83 fonctions · Interface : HUD, relais, configurateur
- `floater` — appelée par 77 fonctions · Particules, lumières, textes flottants
- `addP` — appelée par 53 fonctions · Particules, lumières, textes flottants
- `mpSend` — appelée par 48 fonctions · Multijoueur
- `mkCanvas` — appelée par 46 fonctions · Utilitaires
- `onScreen` — appelée par 36 fonctions · Rendu
- `flashAt` — appelée par 29 fonctions · Particules, lumières, textes flottants
- `hash2` — appelée par 29 fonctions · Bruit
- `addShake` — appelée par 26 fonctions · Particules, lumières, textes flottants
- `sparks` — appelée par 26 fonctions · Particules, lumières, textes flottants
- `save` — appelée par 26 fonctions · État du jeu
- `uniqueTpl` — appelée par 24 fonctions · Vaisseaux uniques des factions
- `explosion` — appelée par 24 fonctions · Particules, lumières, textes flottants
- `misStepOf` — appelée par 19 fonctions · Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche
- `hEl` — appelée par 19 fonctions · Interface : HUD, relais, configurateur
- `shipComputerRender` — appelée par 18 fonctions · ShipComputer — l'ordinateur de bord (F1)
- `netAuth` — appelée par 17 fonctions · Monde partagé : couche réseau (NetworkManager)
- `bigShip` — appelée par 16 fonctions · Armes
- `inShade` — appelée par 16 fonctions · Intérieurs jouables des vaisseaux humains
- `terrOf` — appelée par 16 fonctions · Données du système

## Fonctions qui appellent le plus d'autres fonctions

- `render` — 56 fonctions appelées · 176 lignes · Rendu
- `update` — 52 fonctions appelées · 60 lignes · Mise à jour
- `updateMissiles` — 33 fonctions appelées · 80 lignes · Armes
- `updateEnemies` — 31 fonctions appelées · 93 lignes · Mise à jour
- `loop` — 23 fonctions appelées · 25 lignes · Boucle
- `mpRecv` — 23 fonctions appelées · 31 lignes · Multijoueur
- `misUpdate` — 21 fonctions appelées · 44 lignes · Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche
- `updateBullets` — 21 fonctions appelées · 42 lignes · Armes
- `updatePlayer` — 19 fonctions appelées · 71 lignes · Mise à jour
- `finishEnemy` — 17 fonctions appelées · 19 lignes · Entités
- `netRecv` — 17 fonctions appelées · 23 lignes · Monde partagé : couche réseau (NetworkManager)
- `renderSpecs` — 17 fonctions appelées · 52 lignes · Interface : HUD, relais, configurateur
- `xNode` — 17 fonctions appelées · 218 lignes · Vaisseaux uniques des factions
- `inOpenNow` — 16 fonctions appelées · 17 lignes · Intérieurs jouables des vaisseaux humains
- `boardFight` — 15 fonctions appelées · 50 lignes · Assaut des marines (touche K)

## Plus longues fonctions

- `ASTRO` — 349 lignes · Noyau des astres
- `buildUnique` — 303 lignes · Vaisseaux uniques des factions
- `dockDef` — 275 lignes · Vaisseaux uniques des factions
- `inPropOld` — 220 lignes · Intérieurs jouables des vaisseaux humains
- `xNode` — 218 lignes · Vaisseaux uniques des factions
- `render` — 176 lignes · Rendu
- `modEquip` — 168 lignes · Modules de vaisseau (10 x 10 pixels chacun)
- `xrSmall` — 152 lignes · Plans techniques en rayons X
- `xrLarge` — 137 lignes · Plans techniques en rayons X
- `icBody` — 136 lignes · Intérieurs jouables des vaisseaux humains
- `inEqTop` — 119 lignes · Intérieurs jouables des vaisseaux humains
- `buildShip` — 112 lignes · Modules de vaisseau (10 x 10 pixels chacun)

## Liens les plus forts entre sections

- Armes → Particules, lumières, textes flottants : 56 liens
- Monde partagé : couche réseau (NetworkManager) → Multijoueur : 51 liens
- Vaisseaux capitaux : cuirassés et porte-nefs corsaires, bastion allié → Particules, lumières, textes flottants : 27 liens
- Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche → MissionManager — missions et contrats, gérés depuis l'ordinateur de bord (F1) : 27 liens
- Interface : HUD, relais, configurateur → État du jeu : 23 liens
- Monde partagé : couche réseau (NetworkManager) → Interface : HUD, relais, configurateur : 23 liens
- ShipComputer — l'ordinateur de bord (F1) → Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche : 23 liens
- Interface : HUD, relais, configurateur → Vaisseaux uniques des factions : 21 liens
- Multijoueur → Monde partagé : couche réseau (NetworkManager) : 21 liens
- Arcs scénarisés → MissionManager — missions et contrats, gérés depuis l'ordinateur de bord (F1) : 20 liens
- Interface : HUD, relais, configurateur → Modules de vaisseau (10 x 10 pixels chacun) : 19 liens
- Mise à jour → Armes : 17 liens
- Armes spéciales des factions → Particules, lumières, textes flottants : 16 liens
- Campagne « Le Silence d'Halcyon » (6 chapitres, trois voies) → MissionManager — missions et contrats, gérés depuis l'ordinateur de bord (F1) : 16 liens
- Assaut des marines (touche K) → Particules, lumières, textes flottants : 16 liens
- Mise à jour → Entités : 15 liens
- Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche → Interface : HUD, relais, configurateur : 15 liens
- Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche → Multijoueur : 15 liens
- Assaut des marines (touche K) → Sas d'amarrage : une passerelle rigide sort à angle droit du flanc, toujours au même endroit : 14 liens
- Rendu → Utilitaires : 13 liens

## Fonctions sans lien par leur nom : 34

`bands2`, `annulus`, `edgeX`, `mVents`, `xKeel`, `xSpon`, `xRound`, `xRibs`, `modelPrice`, `cxLinks`, `mkBuf`, `finish`, `grain`, `resonate`, `spaceOut`, `fillDisc`, `igniteEdge`, `missionGetActive`, `strokeReach`, `drawCrew`, `hopTxt`, `fillControls`, `entityExists`, `netApplyQ`, `mpAllReady`, `shipsAll`, `vent_`, `inMissile`, `inHazard`, `inRxPipe`, `inRxWheel`, `inRxDial`, `joyEnd`, `togglePerf`


Elles peuvent être appelées autrement (événements, tables, chaînes de caractères) : « sans lien » ne veut pas dire « inutilisée ».


## Taille des sections

- Intérieurs jouables des vaisseaux humains : 146 fonctions
- Vaisseaux uniques des factions : 108 fonctions
- Monde partagé : couche réseau (NetworkManager) : 105 fonctions
- Interface : HUD, relais, configurateur : 87 fonctions
- Rendu : 71 fonctions
- Offres : le marché des contrats et les missions disponibles, reçus par le réseau du relais le plus proche : 60 fonctions
- ShipComputer — l'ordinateur de bord (F1) : 60 fonctions
- Plans techniques en rayons X : 56 fonctions
- Mégastructures : liaisons entre secteurs, pistes, navires à quai, chantiers, grues de déchargement : 46 fonctions
- Génération des astres : 46 fonctions
- Assaut des marines (touche K) : 44 fonctions
- Armes : 42 fonctions
- Équipage, compartiments et pression : 39 fonctions
- Carte : le système (échelle radiale comprimée) et, en reculant à la molette, la galaxie : 38 fonctions
- Multijoueur : 33 fonctions
- Particules, lumières, textes flottants : 25 fonctions
- MissionManager — missions et contrats, gérés depuis l'ordinateur de bord (F1) : 24 fonctions
- Avaries : dégâts internes d'après les plans en rayons X : 24 fonctions
- Armes spéciales des factions : 24 fonctions
- Sas d'amarrage : une passerelle rigide sort à angle droit du flanc, toujours au même endroit : 23 fonctions
- Mégastructures des factions : 22 fonctions
- Saut de sillage : le voyage entre les systèmes : 20 fonctions
- État du jeu : 19 fonctions
- Destruction au pixel : 17 fonctions
- Entités : 16 fonctions
- Campagne « Le Silence d'Halcyon » (6 chapitres, trois voies) : 16 fonctions
- Vaisseaux capitaux : cuirassés et porte-nefs corsaires, bastion allié : 16 fonctions
- Boucliers : membrane élastique, invisible au repos : 15 fonctions
- Mise à jour : 14 fonctions
- Modules de vaisseau (10 x 10 pixels chacun) : 13 fonctions
- Données du système : 13 fonctions
- Écran, zoom, police bitmap 3x5 : 10 fonctions
- Trafic : convois, transports, escortes, patrouilles, raids : 10 fonctions
- Bruitages (refaits de zéro) : des graves ronds, des aigus filtrés, des attaques adoucies : 10 fonctions
- Soudure Frankenstein : on greffe une épave sur sa propre coque : 10 fonctions
- Décompression : une brèche reste ouverte jusqu'à ce que l'équipage la colmate : 10 fonctions
- Arcs scénarisés : 8 fonctions
- Rayon tracteur (vaisseaux capitaux) : attire ce qu'on vise : 8 fonctions
- Arène d'essai : on teste un plan sans rien risquer : 8 fonctions
- Entrées : 7 fonctions
- Bruit : 6 fonctions
- Utilitaires : 5 fonctions
- Ondes de choc : 5 fonctions
- Boucle : 5 fonctions
- Incendies : le feu ronge les cellules et gagne les voisines : 4 fonctions
- Récupération : les modules intacts des corsaires vont au stock du chantier : 3 fonctions
- Contrats du relais : 3 fonctions
- MissionGenerator — contrats du marché : 3 fonctions
- Galaxies : le Sillage (sept systèmes) et Ysoria (neuf, plus bas), reliés par le saut de sillage : 2 fonctions
- Ton épave : elle reste là où tu es tombé, avec la cargaison : 2 fonctions
- Génération progressive : 2 fonctions
- Astéroïdes : 1 fonctions
- Noyau des astres : 1 fonctions
- Organisation de l'univers (plan stratégique) : 1 fonctions
- Missions scénarisées (plusieurs actes, personnages récurrents, choix et conséquences) : 1 fonctions