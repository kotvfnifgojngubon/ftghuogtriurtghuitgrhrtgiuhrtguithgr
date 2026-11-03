// Exemple de brouillon d'effet : « sortie de Trame », l'éclair d'arrivée d'un vaisseau après un saut.
// Direction artistique : un point blanc qui claque (1 image), un anneau cyan qui s'ouvre vite puis freine,
// des éclats tirés vers l'arrière (le vaisseau arrive de la gauche), une lueur qui retombe en 0,3 s.
// Rendu : node .claude/skills/sillage-pixel/tools/fx.mjs --draft .claude/skills/sillage-pixel/exemples/effet-sortie-de-trame.js --frames 12 --dt 0.04
//
// La fonction est appelée DANS le jeu : (x, y) sont des coordonnées du monde, o les options (--opts),
// S le studio. Tout ce qu'elle pose passe par le moteur du jeu (addP, flashAt, sparks...), donc se
// dessine, s'éclaire et s'efface exactement comme en partie.
//   addP(x, y, vx, vy, durée, type, couleur, freinage, taille)
//   types utiles : 0 traînée de moteur (palette ENGC), 1 étincelle (SPKC), 5 feu (FIREC), 6 couleur fixe,
//   9 lueur (GLOWC), 10 fumée (SMOKEC, opaque), 12 couleur qui scintille, 13 braise (EMBC, opaque)
(x,y,o,S)=>{
  const k=o.k||1,R=(o.r||26)*k;
  // 2e tour : la lueur grise devient cyan saturé, l'anneau ne se défait plus en pointillés (deux fois plus de
  // points, type 6 qui ne clignote qu'en fin de vie, durées égales pour qu'il s'éteigne d'un bloc),
  // un second anneau plus lent donne de l'épaisseur, la traînée arrière est plus longue et plus vive
  flashAt(x,y,R*1.8,'#2ff0d0',0.16);           // éclat large et bref, à la couleur des moteurs
  flashAt(x,y,R*0.6,'#ffffff',0.06);           // cœur blanc : deux images
  // anneau : vitesse forte et freinage fort, il s'ouvre puis s'arrête net (rapide à l'entrée, lent à la sortie)
  const n=Math.round(72*k);
  for(let i=0;i<n;i++){const a=i/n*TAU,v=R*5.5;addP(x,y,Math.cos(a)*v,Math.sin(a)*v,0.3,6,i%5?'#5ee8e0':'#ffffff',6.5,1);}
  // anneau intérieur, plus lent et plus sombre : il reste un instant après le premier
  for(let i=0;i<n/2;i++){const a=(i+0.5)/(n/2)*TAU,v=R*3.4;addP(x,y,Math.cos(a)*v,Math.sin(a)*v,0.4,6,'#1f9fb0',6.5,1);}
  // traînée vers l'arrière, dans l'axe d'arrivée : palette des moteurs (blanc → cyan → bleu nuit)
  for(let i=0;i<Math.round(24*k);i++){const a=PI+rnd(-0.18,0.18),v=rnd(120,420)*k;addP(x+rnd(-2,2),y+rnd(-2,2),Math.cos(a)*v,Math.sin(a)*v,rnd(0.25,0.5),0,null,4,i%3?1:2);}
  // quelques étincelles blanches tout autour
  sparks(x,y,Math.round(10*k),140*k,'#ffffff');
}
