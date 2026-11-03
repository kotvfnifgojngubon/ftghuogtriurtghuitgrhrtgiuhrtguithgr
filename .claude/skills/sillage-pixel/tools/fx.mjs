#!/usr/bin/env node
// Effets : déclenche un effet du jeu (ou un brouillon) et photographie son déroulé, image par image.
//
//   node fx.mjs list                                    effets connus
//   node fx.mjs explosion --opts '{"k":2}'              planche records/fx/explosion/sheet.png
//   node fx.mjs hit --ship epervier --frames 16         dégâts sur un vaisseau, puis incendie
//   node fx.mjs mon-effet --draft drafts/fx/mon-effet.js --gif     brouillon d'effet + GIF (ffmpeg)
//
// Options : --frames n (12)  --dt s (1/30 : une image photographiée toutes les dt secondes)  --size LxH (160x120)
//           --scale k (3)  --x --y (position, relative au centre)  --ship id (vaisseau au centre)  --thr 0..2
//           --repeat s (relance l'effet toutes les s secondes, pour les effets continus)  --seed n  --gif  --mp4
//           --out dossier  --name nom
//
// Brouillon d'effet : un fichier qui vaut une fonction (x, y, o, S) appelée DANS le jeu, où x, y sont
// les coordonnées du monde ; elle peut utiliser addP, flashAt, sparks, addShard, explosion, fballs,
// addShock, les palettes (FIREC, SMOKEC, EMBC...) et le tramage bay(x, y).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { openStudio, parseArgs, writeDataUrl, RECORDS, rel, ensureDir } from './harness.mjs';

const A = parseArgs(process.argv.slice(2));
const g = await openStudio({ game: A.game, seed: +A.seed || 1 });
try {
  if (A.draft) {
    const src = fs.readFileSync(A.draft, 'utf8').replace(/^\s*(export\s+default\s+)?/, '').replace(/;\s*$/, '');
    const name = A._[0] || path.basename(A.draft).replace(/\.[^.]+$/, '');
    await g.st(`(()=>{const f=STU.run('('+A.src+')');if(typeof f!=='function')throw new Error('Le brouillon doit valoir une fonction (x, y, o, S)');
      STU.FX[A.name]=(x,y,o)=>{const c=STU.origin();f(c.x+x,c.y+y,o,STU);};return true;})()`, { src, name });
    A._[0] = name;
  }
  if (A._[0] === 'list' || !A._[0]) {
    console.log((await g.st('Object.keys(STU.FX)')).join('\n'));
    console.log('\n+ tout code du jeu avec --draft (voir l’en-tête de ce fichier)');
  } else {
    const name = A._[0];
    const [w, h] = String(A.size || '160x120').split('x').map(Number);
    const o = A.opts ? JSON.parse(A.opts) : {};
    const frames = +A.frames || 12, dt = A.dt ? +A.dt : 1 / 30, scale = +A.scale || 3;
    const res = await g.st(`(()=>{const S=STU,a=A;S.reset(a.w,a.h);S.clearShots();
      let b=null;if(a.ship){b=S.ship(a.ship,{thr:a.thr});a.o.b=b;}
      const sub=4,fire=()=>S.fx(a.name,a.x,a.y,a.o);
      S.step(1/60,2);fire();const t0=now;let lastFire=now;const log=[];
      for(let f=0;f<a.frames;f++){
        S.snap((f*a.dt).toFixed(2)+' s');log.push(S.counts());
        for(let k=0;k<sub;k++){S.step(a.dt/sub,1);if(a.repeat&&now-lastFire>=a.repeat){fire();lastFire=now;}}
      }
      return {sheet:S.sheet({scale:a.scale,cols:Math.min(6,a.frames),title:a.name+'  '+JSON.stringify(Object.fromEntries(Object.entries(a.o).filter(([k])=>k!=='b')))}),
        frames:a.gif?S.frames():null,log};})()`,
      { name, w, h, o, frames, dt, scale, x: +A.x || 0, y: +A.y || 0, ship: A.ship || null, thr: A.thr === undefined ? 0.6 : +A.thr, repeat: A.repeat ? +A.repeat : 0, gif: !!(A.gif || A.mp4) });
    const dir = path.resolve(A.out || path.join(RECORDS, 'fx', A.name || name));
    const f = writeDataUrl(path.join(dir, 'sheet.png'), res.sheet);
    console.log(rel(f));
    const peak = res.log.reduce((m, c) => Math.max(m, c.parts), 0), end = res.log[res.log.length - 1];
    console.log(`particules : pic ${peak}, à la fin ${end.parts}  ·  lueurs ${end.flashes}  boules de feu ${end.fballs}  ondes ${end.shocks}`);
    if (res.frames) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sillage-fx-'));
      res.frames.forEach((u, i) => writeDataUrl(path.join(tmp, `f${String(i).padStart(3, '0')}.png`), u));
      const fps = Math.max(1, Math.round(1 / dt)), sc = `scale=iw*${scale}:ih*${scale}:flags=neighbor`;
      try {
        if (A.gif) { const out = path.join(dir, 'anim.gif');
          execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%03d.png'), '-vf', `${sc},split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse=dither=none`, out]); console.log(rel(out)); }
        if (A.mp4) { const out = path.join(dir, 'anim.mp4');
          execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%03d.png'), '-vf', `${sc},pad=ceil(iw/2)*2:ceil(ih/2)*2`, '-pix_fmt', 'yuv420p', out]); console.log(rel(out)); }
      } catch (e) { console.log('ffmpeg absent ou en échec : seule la planche est écrite.'); }
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  if (g.errors.length) console.log('Erreurs du jeu pendant le rendu :\n  ' + g.errors.join('\n  '));
} finally { await g.close(); }
