// Exemple de brouillon de coque : un intercepteur humain de 30 m, « Sillon ».
// Direction artistique : flèche fine et nerveuse, ailes delta reculées, deux plans canard, une grosse tuyère
// centrale et deux petites ; liseré bleu de l'Armée, verrière émissive à l'avant.
// Rendu : node .claude/skills/sillage-pixel/tools/ships.mjs --draft .claude/skills/sillage-pixel/exemples/coque-sillon.js
//
// Repères (ceux de shipDef) : x de la poupe (0) au nez (L), y de haut en bas, axe au milieu (c = H/2).
// Tout ce qui est décrit pour l'aile du haut est reflété en bas quand le dernier argument vaut 1.
shipDef(30,22,({c,part,eng,S})=>{
  // ailes delta : polygone de l'aile du haut, reflétée (matière plate, hauteur 1)
  part('plate',1,[[4,c-2],[15,c-2],[11,c-10],[7.5,c-10]],1);
  // plans canard, plus haut que l'aile pour accrocher la lumière
  part('plate',1.2,[[19,c-1.6],[22.5,c-1.6],[20.5,c-4.2],[19.4,c-4.2]],1);
  // fuselage : S() referme le profil du haut par son reflet ; c'est la pièce la plus haute (1,45)
  part('hull',1.45,S([[1,c-2.4],[14,c-2.4],[22,c-1.6],[27,c-0.8],[29.7,c]]));
  // dos surélevé (épine) : donne un chanfrein net sur l'axe
  part('plate',1.7,S([[6,c-0.9],[20,c-0.7],[23,c]]));
  // tuyères : (y, hauteur, longueur, groupe) ; la grosse au centre, deux petites en miroir
  eng(c,3.2,2,0);eng(c-1.9,1.4,1.4,1,1,1);
  return{id:'sillon',cat:'intercepteur',fac:'humain',thr:6,armorX:26,
    decor:(a)=>{
      a.rect(4,c-0.5,21,c-0.5,{m:'blue'});                        // liseré de l'axe
      a.band([[8,c-3],[10.5,c-8.5]],1,{m:'blue'});a.band([[8,c+3],[10.5,c+8.5]],1,{m:'blue'});
      a.poly([[21,c-0.8],[25,c-0.5],[26.5,c],[25,c+0.5],[21,c+0.8]],{e:0x7fc4ff});   // verrière
      a.rect(21,c-0.8,22,c-0.8,{e:0xe2f3ff});                    // reflet de la verrière
      a.vents(2,c-1.6,4,c+1.6);                                   // grilles devant la tuyère
    },
    // modules : réacteur, deux mitrailleuses d'aile (position, puis bouche du canon)
    mods:[['R',10,c],['w',12,c-5,24,c-1.6],['w',12,c+5,24,c+1.6]],
    st:{spd:380,acc:460,turn:3.9,shield:0,regen:0,energy:80,eRegen:22,cargo:6,magnet:85,crew:1},
    info:{name:'Sillon',cls:'Intercepteur',len:'30 m',m:30}};
})
