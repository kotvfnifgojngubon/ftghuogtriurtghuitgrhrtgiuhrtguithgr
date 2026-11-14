# Rue de la Loi

Jeu de stratégie politique narratif en 3D. Vous gouvernez la Belgique en crise sans jamais quitter votre bureau : vous lisez des dossiers, vous utilisez l’ordinateur et vous répondez au téléphone.

**Prototype :** une crise de quatre jours, « la Nuit noire ». Le réseau électrique s’effondre par −9 °C. Le pays a un gouvernement d’urgence, dirigé par un général de 22 ans, et le Parlement vote la confiance le jeudi soir.

## Jouer en local

```bash
cd le-bureau
node tools/serve.mjs 8080
```

Puis ouvrir http://localhost:8080/. Il faut une connexion pour charger les polices ; three.js est inclus dans `vendor/`.

**Commandes :**

- se déplacer : ZQSD ou WASD, ou cliquer au sol ;
- tourner la caméra : glisser ;
- interagir : E, ou cliquer sur l’objet ;
- fermer une fenêtre : Échap.

## Ce que contient le prototype

- **Le bureau en 3D**, entièrement modélisé en code : boiseries, marbre, tapis, bibliothèques, fauteuils Chesterfield, téléphone rouge, ordinateur, drapeaux, plafond à caissons et fenêtres sur Bruxelles. Les textures sont procédurales.
- **La carte de Belgique murale**, avec les provinces et régions réelles (Natural Earth, domaine public). Elle montre les coupures de courant, les tensions régionales, les repères d’incidents et les décisions qui touchent au territoire.
- **Le Général**, personnage procédural en uniforme de cérémonie. Il marche, s’assoit au bureau, tape au clavier, tient le combiné et se tient « au repos » mains dans le dos.
- **Un décor qui raconte le mandat.** Les dossiers s’empilent et les tasses s’accumulent. Le whisky apparaît quand ça va mal. Selon vos choix, on voit l’étendard royal, les tracts du Rempart, les petits drapeaux régionaux, l’accord encadré ou la radio militaire. Les gyrophares passent derrière les stores. Le plafonnier vacille sur groupe électrogène, et la ville s’éteint ou se rallume.
- **Le téléphone.** Vous appelez trois interlocuteurs : l’Intérieur, la Défense et votre cheffe de cabinet. Avec chacun, vous pouvez demander un point de situation, donner un ordre ou écouter une demande. D’autres personnes vous appellent aussi. Un ordre peut réussir, réussir en partie ou échouer, selon la confiance, la légalité et les institutions. Son compte rendu arrive plus tard.
- **L’ordinateur.** Il affiche un arbre de 4 voies et 19 orientations :
  - la Couronne ;
  - le Rempart (mouvement d’extrême droite fictif) ;
  - les Régions ;
  - le Compromis.

  Il y a des prérequis et des exclusions. Chaque orientation coûte du capital politique et du temps.
- **Les dossiers.** Cinq dossiers suivis évoluent chaque matin : réseau, victimes, enquête, presse et Parlement. S’y ajoutent des dossiers ponctuels et des comptes rendus. Les sources se contredisent ; vous pouvez annoter chaque source comme fiable ou douteuse.
- **Des événements aléatoires et des conséquences différées**, dont certaines ne sont jamais annoncées.
- **Une fin de journée** avec le journal du lendemain, la nuit, les indicateurs et ce qui reste incertain. Le prototype se termine par un vote de confiance et un épilogue selon la voie suivie.

Tous les personnages, partis, organisations et événements sont fictifs.

## Outils

| Commande | Rôle |
|---|---|
| `node tools/serve.mjs` | serveur local |
| `node tools/simulate.mjs 300` | joue 300 parties au hasard et vérifie qu’aucune ne plante |
| `node tools/strategies.mjs` | joue une stratégie par voie et affiche l’issue |
| `npm install && node tools/build-artifact.mjs` | construit `dist/rue-de-la-loi.html`, une page autonome |
| `python3 -I tools/extract_geo.py <dossier_natural_earth> src/data/geo.js` | régénère les données cartographiques |

## Structure

```
src/
  main.js              orchestration (scène, jeu, interfaces, son)
  audio.js             sons synthétisés (WebAudio)
  world/               3D : pièce, personnage, carte, caméra, éclairage, post-traitement
  game/engine.js       moteur (temps, effets, appels, dossiers, arbre, sauvegarde)
  game/content/        contenu : personnages, ordres, arbre, dossiers, événements, simulation
  ui/                  interfaces HTML/CSS
  data/geo.js          provinces belges et pays voisins (Natural Earth)
vendor/three/          three.js r187 (licence MIT)
```
