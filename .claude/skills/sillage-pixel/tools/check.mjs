#!/usr/bin/env node
// Contrôle : mesure les gabarits de vaisseaux et signale ce qui trahit un pixel art bâclé ou un bug de rendu.
//
//   node check.mjs epervier                 un vaisseau
//   node check.mjs chasseur xalthar         des catégories, factions ou marques
//   node check.mjs all                      tout le catalogue (une minute environ)
//   node check.mjs epervier --draft drafts/epervier-b.js      le brouillon, comparé à sa catégorie
//
//   node check.mjs --baseline               recalcule les médianes du catalogue (baseline.json)
//
// Chaque vaisseau est comparé à la médiane de sa faction, à taille égale (les autres modèles du jeu servent
// de barre : un corsaire rouillé n'est pas jugé comme un chasseur humain impeccable) :
//   ERREUR  exception pendant la construction, rendu non reproductible, coque vide
//   ALERTE  poussière (pixels isolés ou accrochés par un coin, avec leurs coordonnées dans le gabarit), bruit (pixel seul d'une autre couleur au milieu d'un aplat),
//           asymétrie d'une coque humaine (dessinées en miroir), trop ou pas assez de pixels émissifs,
//           palette ou bruit très au-dessus de la catégorie, construction lente
// Sortie : 0 si aucune erreur ni alerte, 1 sinon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStudio, parseArgs } from './harness.mjs';

// médianes du catalogue, par faction ; à régénérer (--baseline) quand le jeu change beaucoup
const BASE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'baseline.json');

const A = parseArgs(process.argv.slice(2));
const g = await openStudio({ game: A.game, seed: +A.seed || 1 });
let bad = 0;
const baseline = (() => { try { return A.baseline ? {} : JSON.parse(fs.readFileSync(BASE, 'utf8')); } catch (e) { return {}; } })();
try {
  let draftId = null;
  if (A.draft) draftId = (await g.st('STU.draft(A)', fs.readFileSync(A.draft, 'utf8'))).id;
  if (A.baseline && !A._.length) A._ = ['all'];
  const ids = A._.length ? await g.st('STU.ids(A)', A._.join(',')) : draftId ? [draftId] : [];
  if (!ids.length) { console.error('Rien à contrôler : donne des ids, des mots ou « all ».'); process.exit(1); }
  const res = await g.st(`(()=>{const out=[],cat={};const ships=STU.ships(),by=Object.fromEntries(ships.map(s=>[s.id,s]));
    const hashOf=t=>{let h=2166136261;for(let i=0;i<t.col.length;i++){h^=t.type[i]?t.col[i]:0;h=Math.imul(h,16777619);}return h>>>0;};
    for(const id of A.ids){const r={id,cat:(by[id]||{}).cat,fac:(by[id]||{}).fac,errs:[]};
      try{delete UNIQ_TPL[id];const t0=performance.now();const t=uniqueTpl(id);r.ms=Math.round(performance.now()-t0);
        const h1=hashOf(t);delete UNIQ_TPL[id];const h2=hashOf(uniqueTpl(id));if(h1!==h2)r.errs.push('rendu non reproductible (deux constructions donnent des pixels différents : Math.random dans la coque ?)');
        Object.assign(r,STU.stats(id));if(!r.cells)r.errs.push('coque vide');
        // un vaisseau posé dans une scène et rendu une fois : attrape les exceptions du dessin (tourelles, flammes, effets)
        STU.reset(Math.min(900,t.w+80),Math.min(600,t.h+80));STU.ship(id,{thr:1});STU.step(1/60,3);render();
      }catch(e){r.errs.push('exception : '+(e&&e.message||e));}
      out.push(r);}
    // médianes par faction (la barre à atteindre), sur les vaisseaux du jeu (pas les brouillons) : lues dans
    // baseline.json, sinon calculées ici pour les seules factions concernées ; --baseline recalcule tout.
    // Mesures indépendantes de la taille : couleurs / √pixels, bruit / pixels, émissifs / √pixels
    const need=new Set(A.all?ships.map(s=>s.fac):out.map(r=>r.fac));
    for(const f of need){if(A.have[f])continue;const L=ships.filter(q=>q.fac===f&&!(q.cat==='brouillon')).map(q=>{try{return STU.stats(q.id);}catch(e){return null;}}).filter(q=>q&&q.cells);
      const med=fn=>{const v=L.map(fn).sort((a,b)=>a-b);return v[v.length>>1]||0;};
      cat[f]={n:L.length,cps:med(q=>q.colors/Math.sqrt(q.cells)),spk:med(q=>q.speckles/q.cells),eps:med(q=>q.cells*q.emiPct/100/Math.sqrt(q.cells))};}
    return {out,cat};})()`, { ids, have: baseline, all: !!A.baseline });
  Object.assign(baseline, res.cat);
  if (A.baseline || Object.keys(res.cat).length) fs.writeFileSync(BASE, JSON.stringify(baseline, null, 1));
  const f2 = v => v.toFixed(1).replace('.', ',');
  for (const r of res.out) {
    const warn = [], C = baseline[r.fac] || {}, sq = Math.sqrt(Math.max(1, r.cells));
    const cps = (r.colors || 0) / sq, spk = (r.speckles || 0) / Math.max(1, r.cells), emiN = (r.cells || 0) * (r.emiPct || 0) / 100;
    if (!r.errs.length) {
      const xy = L => L.map(([x, y]) => `(${x},${y})`).join(' ');
      if (r.comps > 1) warn.push(`${r.comps - 1} morceau(x) de coque détaché(s) du corps (une pièce qui flotte : elle tombera comme une épave)`);
      if (r.orphans > 0) warn.push(`${r.orphans} pixel(s) isolé(s), détaché(s) de la coque : ${xy(r.orphanAt)}`);
      if (r.corners > 0) warn.push(`${r.corners} pixel(s) accroché(s) par un seul coin, point parasite sur le bord : ${xy(r.cornerAt)}`);
      if (C.spk && spk > C.spk * 3 && spk > 0.01) warn.push(`bruit : ${r.speckles} pixels seuls au milieu d’un aplat, ${f2(spk / C.spk)}× la médiane ${r.fac}`);
      if (C.cps && cps > C.cps * 2.5) warn.push(`palette chargée : ${r.colors} couleurs, ${f2(cps / C.cps)}× la médiane ${r.fac} à taille égale`);
      if (r.fac === 'humain' && r.asymPct > 3) warn.push(`asymétrie haut/bas ${f2(r.asymPct)} % (les coques humaines sont en miroir)`);
      if (r.emiPct > 25) warn.push(`${f2(r.emiPct)} % de pixels émissifs : le vaisseau va baver de lumière`);
      if (emiN < 0.4 * sq) warn.push(`${Math.round(emiN)} pixels émissifs seulement : trop peu de hublots, feux ou verrières pour sa taille`);
      if (!r.nozzles) warn.push('aucune tuyère : pas de flamme de moteur');
      if (r.ms > 400 && r.cells < 50000) warn.push(`construction lente : ${r.ms} ms`);
    }
    const tag = r.errs.length ? 'ERREUR' : warn.length ? 'ALERTE' : 'ok';
    if (tag !== 'ok') bad++;
    console.log(`${tag.padEnd(6)} ${r.id.padEnd(14)} ${r.w || '?'}×${r.h || '?'}  ${r.cells || 0} px  ${r.colors || 0} coul.  émissif ${r.emiPct ?? '?'} %  ${r.ms ?? '?'} ms`);
    for (const e of r.errs) console.log('       ✗ ' + e);
    for (const w of warn) console.log('       ! ' + w);
  }
  if (g.errors.length) { bad++; console.log('Erreurs du jeu :\n  ' + [...new Set(g.errors)].join('\n  ')); }
  console.log(bad ? `\n${bad} vaisseau(x) à reprendre.` : '\nTout passe.');
} finally { await g.close(); }
process.exit(bad ? 1 : 0);
