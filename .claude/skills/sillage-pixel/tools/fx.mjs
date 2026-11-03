#!/usr/bin/env node
// Effets : déclenche un effet du jeu (ou un brouillon) et photographie son déroulé.
//
//   node fx.mjs list                                    effets connus
//   node fx.mjs explosion --opts '{"k":2}'              planche records/fx/explosion/sheet.png
//   node fx.mjs explosion --times 0,0.03,0.1,0.3,1,2,3  photos à ces instants (attaque serrée, longue retombée)
//   node fx.mjs death --ship lame --opts '{"pre":0.8}'  agonie puis mort d'un vaisseau (éclatement, onde du réacteur)
//   node fx.mjs hit --ship epervier --frames 16         dégâts sur un vaisseau, puis incendie
//   node fx.mjs mon-effet --draft drafts/fx/mon-effet.js --gif     brouillon d'effet + GIF (ffmpeg)
//   node fx.mjs explosion --compare avant.html          même effet, même graine : une rangée par version du jeu
//
// Options : --frames n (12)  --dt s (1/30)  ou  --times t0,t1,…  (secondes depuis le déclenchement)
//           --size LxH (160x120)  --scale k (3)  --x --y (position, relative au centre)  --ship id  --thr 0..2
//           --repeat s (relance l'effet toutes les s secondes, pour les effets continus)  --seed n  --gif  --mp4
//           --end s (contrôle : l'effet doit être éteint à cet instant ; défaut : le dernier instant photographié)
//           --compare autre.html (rangée du haut : l'autre jeu ; en bas : celui de --game)  --out dossier  --name nom
//
// Contrôle affiché à la fin (repris de pixelfx) : pic de particules et part du plafond du jeu (PMAX),
// ce qui reste allumé à la fin, coût du rendu d'une image (médiane et pire), erreurs du jeu.
//
// Brouillon d'effet : un fichier qui vaut une fonction (x, y, o, S) appelée DANS le jeu, où x, y sont
// les coordonnées du monde ; elle peut utiliser addP, flashAt, sparks, addShard, explosion, fballs,
// addShock, les palettes (FIREC, SMOKEC, EMBC...) et le tramage bay(x, y).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { openStudio, parseArgs, writeDataUrl, RECORDS, rel, DEFAULT_GAME } from './harness.mjs';

const A = parseArgs(process.argv.slice(2));
const name0 = A._[0];

async function run(game) {
  const g = await openStudio({ game, seed: +A.seed || 1 });
  try {
    let name = name0;
    if (A.draft) {
      const src = fs.readFileSync(A.draft, 'utf8').replace(/^\s*(export\s+default\s+)?/, '').replace(/;\s*$/, '');
      name = name0 || path.basename(A.draft).replace(/\.[^.]+$/, '');
      await g.st(`(()=>{const f=STU.run('('+A.src+')');if(typeof f!=='function')throw new Error('Le brouillon doit valoir une fonction (x, y, o, S)');
        STU.FX[A.name]=(x,y,o)=>{const c=STU.origin();f(c.x+x,c.y+y,o,STU);};return true;})()`, { src, name });
    }
    if (name === 'list' || !name) { console.log((await g.st('Object.keys(STU.FX)')).join('\n')); console.log('\n+ tout code du jeu avec --draft (voir l’en-tête de ce fichier)'); return null; }
    const [w, h] = String(A.size || '160x120').split('x').map(Number);
    const o = A.opts ? JSON.parse(A.opts) : {};
    const dt = A.dt ? +A.dt : 1 / 30, frames = +A.frames || 12;
    const times = A.times ? String(A.times).split(',').map(Number) : Array.from({ length: frames }, (_, i) => i * dt);
    const res = await g.st(`(()=>{const S=STU,a=A;S.reset(a.w,a.h);S.clearShots();
      let b=null;if(a.ship){b=S.ship(a.ship,{thr:a.thr});a.o.b=b;}
      const fire=()=>S.fx(a.name,a.x,a.y,a.o);
      S.step(1/60,2);fire();const t0=now;let lastFire=now,peak=0;const log=[];
      // pas de simulation de 1/120 s au plus, comme la boucle du jeu (qui découpe en pas de 1/45 s au plus)
      for(const T of a.times){while(now-t0<T-1e-9){const d=Math.min(1/120,T-(now-t0));S.step(d,1);const c=parts.length;if(c>peak)peak=c;
          if(a.repeat&&now-lastFire>=a.repeat){fire();lastFire=now;}}
        S.snap(T.toFixed(2)+' s');log.push(S.counts());}
      const end=S.counts();
      return {sheet:S.sheet({scale:a.scale,cols:Math.min(a.cols||6,a.times.length),title:a.title}),
        frames:a.gif?S.frames():null,peak,pmax:PMAX,end,ms:S.renderMs()};})()`,
      { name, w, h, o, times, scale: +A.scale || 3, cols: +A.cols || 0, title: `${name}  ${JSON.stringify(o)}  —  ${path.basename(game)}`, x: +A.x || 0, y: +A.y || 0, ship: A.ship || null, thr: A.thr === undefined ? 0.6 : +A.thr, repeat: A.repeat ? +A.repeat : 0, gif: !!(A.gif || A.mp4) });
    res.errors = [...new Set(g.errors)]; res.name = name; res.times = times;
    return res;
  } finally { await g.close(); }
}

const main = await run(A.game || DEFAULT_GAME);
if (main) {
  const dir = path.resolve(A.out || path.join(RECORDS, 'fx', A.name || main.name));
  let sheet = main.sheet;
  if (A.compare) {
    // l'autre version au-dessus, celle de --game en dessous : deux planches empilées, même graine, mêmes instants
    const other = await run(A.compare);
    const g = await openStudio({ game: A.game || DEFAULT_GAME });
    sheet = await g.page.evaluate(async ([a, b]) => {
      const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const c = document.createElement('canvas'); c.width = Math.max(ia.width, ib.width); c.height = ia.height + ib.height;
      const x = c.getContext('2d'); x.fillStyle = '#14161c'; x.fillRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); x.drawImage(ib, 0, ia.height); return c.toDataURL();
    }, [other.sheet, main.sheet]);
    await g.close();
    const f2 = writeDataUrl(path.join(dir, 'compare.png'), sheet);
    console.log(rel(f2));
    report('avant', other);
  } else console.log(rel(writeDataUrl(path.join(dir, 'sheet.png'), sheet)));
  const bad = report(A.compare ? 'après' : '', main);
  if (main.frames) video(main, dir);
  process.exitCode = bad ? 1 : 0;
}

function report(tag, r) {
  const e = r.end, live = e.parts + e.flashes + e.fballs + e.shocks + e.blasts + (e.puffs || 0) + (e.rings || 0);
  const T = r.times[r.times.length - 1], p = s => (tag ? tag + ' · ' : '') + s;
  console.log(p(`particules : pic ${r.peak} (${Math.round(100 * r.peak / r.pmax)} % du plafond PMAX ${r.pmax}), à ${T.toFixed(2)} s : ${e.parts} particules, ${e.puffs || 0} bouffées, ${e.rings || 0} anneaux, ${e.flashes} lueurs, ${e.fballs} boules de feu, ${e.shocks} ondes, ${e.live} épaves`));
  console.log(p(`rendu d'une image : médiane ${r.ms.med.toFixed(2)} ms, pire ${r.ms.max.toFixed(2)} ms`));
  let bad = 0;
  const end = A.end !== undefined ? +A.end : null;
  if (end !== null && T >= end && live > 0 && !A.repeat) { console.log(p(`! encore ${live} élément(s) allumé(s) à ${T.toFixed(2)} s : un effet ponctuel doit être éteint à ${end} s`)); bad++; }
  if (r.peak > r.pmax * 0.5) { console.log(p(`! le pic prend ${Math.round(100 * r.peak / r.pmax)} % du plafond : en combat, plusieurs effets à la fois seront rognés`)); bad++; }
  if (r.ms.max > 4) { console.log(p(`! image à ${r.ms.max.toFixed(1)} ms au pire (scène vide autour) : trop lourd pour la boucle du jeu`)); bad++; }
  for (const er of r.errors) { console.log(p('✗ erreur du jeu : ' + er)); bad++; }
  return bad;
}

function video(r, dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sillage-fx-'));
  r.frames.forEach((u, i) => writeDataUrl(path.join(tmp, `f${String(i).padStart(3, '0')}.png`), u));
  const dt = A.dt ? +A.dt : 1 / 30, fps = Math.max(1, Math.round(1 / dt)), k = +A.scale || 3, sc = `scale=iw*${k}:ih*${k}:flags=neighbor`;
  try {
    if (A.gif) { const out = path.join(dir, 'anim.gif');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%03d.png'), '-vf', `${sc},split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse=dither=none`, out]); console.log(rel(out)); }
    if (A.mp4) { const out = path.join(dir, 'anim.mp4');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%03d.png'), '-vf', `${sc},pad=ceil(iw/2)*2:ceil(ih/2)*2`, '-pix_fmt', 'yuv420p', out]); console.log(rel(out)); }
  } catch (e) { console.log('ffmpeg absent ou en échec : seule la planche est écrite.'); }
  fs.rmSync(tmp, { recursive: true, force: true });
}
