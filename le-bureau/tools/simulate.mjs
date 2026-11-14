// Joue des parties complètes au hasard pour vérifier le contenu (aucune erreur, fins atteignables).
// Usage : node tools/simulate.mjs [nombre_de_parties]
import { createGame, newState } from '../src/game/engine.js';
import { CALLS } from '../src/game/content/events.js';
import { DOSSIERS } from '../src/game/content/dossiers.js';
import { TREE } from '../src/game/content/tree.js';

const problems = [];
// Graphes de dialogue : chaque cible doit exister.
for (const [id, c] of Object.entries(CALLS)) {
  if (!c.nodes[c.start]) problems.push(`${id} : nœud de départ manquant`);
  for (const [nid, n] of Object.entries(c.nodes)) {
    if (!n.end && !n.next && !n.choices) problems.push(`${id}.${nid} : impasse`);
    if (typeof n.next === 'string' && !c.nodes[n.next]) problems.push(`${id}.${nid} : next → ${n.next} introuvable`);
    for (const ch of n.choices || []) if (typeof ch.to === 'string' && !c.nodes[ch.to]) problems.push(`${id}.${nid} : choix → ${ch.to} introuvable`);
  }
}
for (const [id, n] of Object.entries(TREE.nodes)) {
  for (const r of (n.requires || []).flat()) if (!TREE.nodes[r]) problems.push(`arbre ${id} : prérequis ${r} inconnu`);
  for (const x of n.excludes || []) if (!TREE.nodes[x]) problems.push(`arbre ${id} : exclusion ${x} inconnue`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const N = Number(process.argv[2] || 300);
const endings = {}, paths = {}, votes = [], victims = [];
let seenDossiers = new Set();
for (let i = 0; i < N; i++) {
  const g = createGame(newState(1000 + i));
  const r = () => g.roll();
  const pick = (a) => a[Math.floor(r() * a.length)];
  let summary;
  g.beginDay();
  while (true) {
    let guard = 0;
    while (g.hoursLeft() > 0 && guard++ < 60) {
      const s = g.state;
      if (s.ringing) {
        if (r() < 0.9) {
          const sess = g.answerCall();
          let k = 0;
          while (!sess.ended && k++ < 20) { const o = sess.options(); if (!o.length) break; sess.choose(pick(o)); }
        } else g.declineCall();
        continue;
      }
      const roll = r();
      if (roll < 0.3) {
        const ds = g.visibleDossiers();
        ds.forEach((d) => { g.readDossier(d.uid); seenDossiers.add(d.id); if (r() < 0.2) g.markDossier(d.uid, pick(['fiable', 'douteux'])); });
        const act = ds.filter((d) => d.actions.some((a) => a.available));
        if (act.length) { const d = pick(act); const a = pick(d.actions.filter((x) => x.available)); g.dossierAction(d.uid, a.index); }
      } else if (roll < 0.55) {
        const avail = Object.keys(TREE.nodes).filter((id) => g.nodeStatus(id) === 'disponible');
        if (avail.length) g.adopt(pick(avail)); else g.spend(1);
      } else if (roll < 0.9) {
        const c = pick(['verhaegen', 'dufrasne', 'lenoir']);
        if (!g.canCall(c).ok) { g.spend(0.5); continue; }
        const sess = g.outgoingCall(c);
        let k = 0;
        while (!sess.ended && k++ < 12) { const o = sess.options(); if (!o.length) break; sess.choose(pick(o)); }
      } else break;
    }
    // Les appels qui sonnent encore en fin de journée sont ignorés.
    while (g.state.ringing) g.declineCall();
    summary = g.endDay();
    if (g.state.ended) break;
    g.nextDay();
  }
  const e = g.state.ended;
  endings[e.kind] = (endings[e.kind] || 0) + 1;
  paths[summary.ending.path] = (paths[summary.ending.path] || 0) + 1;
  if (e.vote?.pour) votes.push(e.vote.pour);
  victims.push(g.state.world.victimes);
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
console.log('Parties :', N);
console.log('Fins :', endings);
console.log('Voies dominantes :', paths);
console.log('Voix pour (moy., min, max) :', avg(votes), Math.min(...votes), Math.max(...votes));
console.log('Décès (moy., min, max) :', avg(victims), Math.min(...victims), Math.max(...victims));
const never = Object.keys(DOSSIERS).filter((d) => !seenDossiers.has(d));
console.log('Dossiers jamais vus :', never.join(', ') || 'aucun');
