// Joue quatre stratégies écrites à la main et affiche l'issue de chacune.
// Usage : node tools/strategies.mjs
import { createGame, newState } from '../src/game/engine.js';

const plans = {
  compromis: { prio: 0, nodes: [['cellule_interfederale'], ['commission_enquete', 'solidarite'], ['elections'], []], orders: [['v_chaleur', 'd_logistique'], ['l_majorite', 'd_garde'], ['l_allocution'], []] },
  rempart: { prio: 1, nodes: [['dialogue_rempart'], ['brigades'], ['etat_exception', 'boucs_emissaires'], []], orders: [['d_patrouilles'], ['v_couvrefeu'], [], []] },
  couronne: { prio: 1, nodes: [['conseil_couronne'], ['message_royal', 'recentraliser'], ['pouvoirs_speciaux'], []], orders: [['d_logistique', 'd_garde'], ['l_majorite'], ['l_allocution'], []] },
  regions: { prio: 2, nodes: [['regions_crise'], ['scinder_reseau'], ['conference_confederale'], []], orders: [['v_chaleur'], ['l_majorite'], [], []] },
};
for (const [name, plan] of Object.entries(plans)) {
  for (const truthSeed of [11, 12, 13]) {
    const g = createGame(newState(truthSeed));
    g.beginDay();
    while (true) {
      const d = g.state.day;
      const answer = (pick) => { while (g.state.ringing) { const s = g.answerCall(); let k = 0; while (!s.ended && k++ < 10) { const o = s.options(); if (!o.length) break; s.choose(o[Math.min(pick, o.length - 1)]); } } };
      answer(plan.prio);
      for (const n of plan.nodes[d - 1]) g.adopt(n);
      for (const oid of plan.orders[d - 1]) {
        const c = oid.startsWith('v_') ? 'verhaegen' : oid.startsWith('d_') ? 'dufrasne' : 'lenoir';
        if (!g.canCall(c).ok) continue;
        const s = g.outgoingCall(c);
        s.choose(s.options().find((o) => o.label.startsWith('Donner')));
        const opt = s.options().find((o) => o.label.toLowerCase().includes(oid.split('_')[1].slice(0, 5))) || s.options()[0];
        s.choose(opt);
        if (s.options().some((o) => o.label.startsWith('Insister'))) s.choose(s.options()[0]);
      }
      answer(0);
      for (const dv of g.visibleDossiers()) { g.readDossier(dv.uid); const a = dv.actions.find((x) => x.available); if (a && g.hoursLeft() >= 1) g.dossierAction(dv.uid, a.index); }
      answer(0);
      const sum = g.endDay();
      if (g.state.ended) { console.log(`${name.padEnd(10)} vérité=${g.state.truth.padEnd(10)} fin=${g.state.ended.kind.padEnd(9)} voix=${g.state.ended.vote?.pour ?? '-'} voie=${sum.ending.path} morts=${g.state.world.victimes}`); break; }
      g.nextDay();
    }
  }
}
