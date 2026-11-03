#!/usr/bin/env node
// Vaisseaux : catalogue, planches contact, brouillons.
//
//   node ships.mjs list [mots]                 catalogue (id, nom, catégorie, faction, taille)
//   node ships.mjs <ids|mots> [options]        une planche par vaisseau dans records/ships/<id>/
//   node ships.mjs epervier --draft drafts/epervier-b.js     rend un brouillon de coque (shipDef) à la place de l'original
//
// Options : --scale k (agrandissement, auto par défaut)  --thr 0..2  --sun angle°  --seed n  --space (fond étoilé)
//           --only light|thrust|turn|damage|views    --game fichier.html   --out dossier
//           --zoom x,y,l,h[,k]   gros plan d'une zone du gabarit (pixels du vaisseau, origine en haut à gauche,
//                                avant à droite), agrandi k fois : pour juger le détail des grands vaisseaux
//
// La planche montre, avec le rendu du jeu (éclairage, halos, flammes, tourelles) :
//   1. le vaisseau à l'échelle du jeu, sous quatre directions de soleil
//   2. moteurs coupés, croisière, plein boost
//   3. trois angles de rotation (lisibilité une fois tourné)
//   4. trois états de dégâts (cratères, incendies, métal chauffé)
//   5. analyse : silhouette, pixels émissifs, découpage en modules
import fs from 'node:fs';
import path from 'node:path';
import { openStudio, parseArgs, writeDataUrl, RECORDS, rel } from './harness.mjs';

const A = parseArgs(process.argv.slice(2));
const g = await openStudio({ game: A.game, seed: +A.seed || 1 });
try {
  if (A._[0] === 'list') {
    const all = await g.st('STU.ships()');
    const q = A._.slice(1).join(' ').toLowerCase();
    const rows = all.filter(s => !q || q.split(/\s+/).some(k => [s.id, s.name, s.cat, s.fac, s.brand].join(' ').toLowerCase().includes(k)));
    for (const s of rows) console.log(`${s.id.padEnd(14)} ${String(s.name).padEnd(18)} ${String(s.cat).padEnd(13)} ${String(s.fac).padEnd(8)} ${s.L}×${s.H}`);
    console.log(`${rows.length} vaisseau(x)`);
  } else {
    let ids = [];
    if (A.draft) {
      const src = fs.readFileSync(A.draft, 'utf8');
      const d = await g.st('STU.draft(A)', src);
      console.log(`brouillon ${rel(A.draft)} → coque « ${d.id} » ${d.L}×${d.H}${d.model ? '' : ' (nouvelle coque)'}`);
      ids = A._.length ? await g.st('STU.ids(A)', A._.join(',')) : [d.id];
      if (!ids.length) ids = [d.id];
    } else {
      if (!A._.length) { console.error('Donne un id, des mots (catégorie, faction, marque) ou « all ». Voir : node ships.mjs list'); process.exit(1); }
      ids = await g.st('STU.ids(A)', A._.join(','));
    }
    if (!ids.length) { console.error('Aucun vaisseau ne correspond.'); process.exit(1); }
    const only = A.only ? String(A.only).split(',') : A.zoom ? [] : null;
    const want = k => !only || only.includes(k);
    const sun0 = A.sun !== undefined ? (+A.sun) * Math.PI / 180 : -Math.PI * 0.75;
    for (const id of ids) {
      const t0 = Date.now();
      const res = await g.st(`(()=>{const id=A.id,o=A.o;const S=STU;
        const t=uniqueTpl(id),L=Math.max(t.w,t.h),box=Math.ceil(L*1.25+Math.max(24,t.w*0.35)),vw=Math.ceil(t.w*1.3+Math.max(30,t.w*0.5)),vh=Math.ceil(Math.max(t.h*1.3,t.w*0.75)+16);
        const k=o.scale||Math.max(1,Math.min(6,Math.floor(640/Math.max(vw,vh*1.4))));
        const shot=(label,setup,sun,steps)=>{S.reset(vw,vh,{sun:sun===undefined?o.sun0:sun,space:o.space});const b=S.ship(id,{thr:o.thr});if(setup)setup(b);S.step(1/60,steps||20);S.snap(label);};
        const out=[];
        S.reset(vw,vh);
        const groups=[];
        if(o.want.base){S.clearShots();shot('jeu, soleil haut-gauche',null,o.sun0);groups.push(['base',1]);}
        // les grands vaisseaux passent sur une ou deux colonnes pour que la planche reste lisible
        const cols=vw>700?1:vw>320?2:4;
        const add=(name,fn)=>{if(!o.want[name])return;S.clearShots();fn();out.push([name,S.sheet({scale:k,cols,title:id+' — '+name})]);};
        // gros plan : une zone du gabarit (x, y, largeur, hauteur en pixels du vaisseau, avant à droite), très agrandie
        if(o.zoom){const [zx,zy,zw,zh,zk]=o.zoom;S.clearShots();
          S.reset(vw,vh,{sun:o.sun0,space:o.space});const b=S.ship(id,{thr:o.thr});S.step(1/60,20);S.render(); // render() place la caméra (ox, oy)
          S.snapRect('zone '+zx+','+zy+' '+zw+'×'+zh,Math.round(b.x-ox-b.cx+zx),Math.round(b.y-oy-b.cy+zy),zw,zh);
          out.push(['zoom-'+zx+'-'+zy,S.sheet({scale:zk||Math.max(2,Math.min(12,Math.floor(900/Math.max(zw,zh)))),cols:1,title:id+' — gros plan'})]);}
        add('light',()=>{for(const [lab,a] of [['soleil haut-gauche',-PI*0.75],['soleil haut-droite',-PI*0.25],['soleil bas-droite',PI*0.25],['soleil bas-gauche',PI*0.75]])shot(lab,null,a);});
        add('thrust',()=>{for(const [lab,th] of [['moteurs coupés',0],['croisière 0,6',0.6],['pleine poussée 1',1],['boost 2',2]])shot(lab,b=>{b.thr=th;});});
        add('turn',()=>{for(const deg of [0,-30,-90,180])shot('angle '+deg+'°',b=>{b.a=deg*PI/180;b.setAngle();for(const m of b.mods)m.ang=b.a;});});
        // cratères proportionnés à la coque : un petit chasseur ne survit pas à ce qu'encaisse un croiseur
        const hr=Math.max(1.5,Math.min(14,L*0.045));
        add('damage',()=>{for(const [lab,n] of [['intact',0],['légers',3],['lourds',7],['en feu',12]])shot(lab,b=>{for(let i=0;i<n;i++)S.fx('hit',0,0,{b,dmg:3,rad:hr*(0.7+(i%3)*0.25),fire:n>8?1:0.4,k:Math.min(2,hr/4)});},undefined,n?75:20);});
        add('views',()=>{S.tplViews(id);});
        return {k,vw,vh,out,stats:S.stats(id)};})()`, { id, o: { scale: +A.scale || 0, thr: A.thr === undefined ? 0.6 : +A.thr, sun0, space: !!A.space, zoom: A.zoom ? String(A.zoom).split(',').map(Number) : null, want: { base: false, light: want('light'), thrust: want('thrust'), turn: want('turn'), damage: want('damage'), views: want('views') } } });
      const dir = path.resolve(A.out || path.join(RECORDS, 'ships', id));
      const files = res.out.map(([name, url]) => writeDataUrl(path.join(dir, `${name}.png`), url));
      fs.writeFileSync(path.join(dir, 'stats.json'), JSON.stringify(res.stats, null, 2));
      const s = res.stats;
      console.log(`${id}  ${s.w}×${s.h}  ${s.cells} px  ${s.colors} couleurs  émissif ${s.emiPct}%  ×${res.k}  (${Date.now() - t0} ms)`);
      for (const f of files) console.log('   ' + rel(f));
    }
  }
  if (g.errors.length) console.log('Erreurs du jeu pendant le rendu :\n  ' + g.errors.join('\n  '));
} finally { await g.close(); }
