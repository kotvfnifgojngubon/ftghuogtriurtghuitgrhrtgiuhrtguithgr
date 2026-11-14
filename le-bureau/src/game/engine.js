// Moteur de jeu : état, temps, effets immédiats et différés, appels, dossiers, arbre de décisions.
// Aucune dépendance graphique : il peut tourner seul (tests en Node).
import { CONTACTS, ORDERS, REQUESTS, greeting, situation } from './content/contacts.js';
import { TREE } from './content/tree.js';
import { DOSSIERS, CORE_DOSSIERS } from './content/dossiers.js';
import { SCRIPTED, RANDOM, CALLS } from './content/events.js';
import { simulateNight, epilogue, voteOfConfidence, headline, CONSEQUENCES as WORLD_CONSEQUENCES, HINTS } from './content/world.js';

export const DAY_START = 8;
export const DAY_END = 20;
export const LAST_DAY = 4;
export const DAYS = ['', 'Lundi 13 janvier', 'Mardi 14 janvier', 'Mercredi 15 janvier', 'Jeudi 16 janvier'];
export const STATS = {
  stabilite: { label: 'Stabilité du gouvernement', short: 'Stabilité' },
  population: { label: 'Confiance de la population', short: 'Population' },
  cohesion: { label: 'Cohésion des régions', short: 'Cohésion' },
  economie: { label: 'État de l’économie', short: 'Économie' },
  institutions: { label: 'Confiance des institutions', short: 'Institutions' },
  libertes: { label: 'Libertés publiques', short: 'Libertés' },
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function newState(seed = (Date.now() % 1e9) | 0) {
  const r = rng(seed);
  const truths = ['negligence', 'cyber', 'interne'];
  return {
    version: 1,
    seed,
    rngState: Math.floor(r() * 1e9),
    day: 1,
    hour: DAY_START,
    stats: { stabilite: 42, population: 38, cohesion: 45, economie: 50, institutions: 48, libertes: 72 },
    capital: 30,
    world: { power: { flandre: 74, bruxelles: 52, wallonie: 28 }, victimes: 0, victimesJour: 0, unrest: 34, rempart: 18, separatisme: 24, couronne: 20, enquete: 0 },
    truth: truths[Math.floor(r() * 3)],
    flags: {},
    adopted: [],
    trust: { verhaegen: 55, dufrasne: 60, lenoir: 70 },
    resigned: {},
    dossiers: [],
    seq: 0,
    scheduled: [],
    events: { fired: [], planned: [] },
    ringing: null,
    callsToday: {},
    ordersGiven: [],
    log: [],
    dayStart: null,
    history: [],
    markers: [],
    notes: [],
    tutorial: 0,
    ended: null,
  };
}

export function createGame(state = newState()) {
  const listeners = {};
  const emit = (ev, data) => (listeners[ev] || []).forEach((f) => f(data));
  const S = () => G.state;
  let rand = rng(state.rngState);
  const roll = () => {
    const v = rand();
    G.state.rngState = Math.floor(v * 1e9) + 1;
    rand = rng(G.state.rngState);
    return v;
  };

  // ---------- outil d'effets ----------
  function effects(source) {
    const s = S();
    const E = {
      s,
      roll,
      stat(k, v) {
        if (!v) return E;
        const before = s.stats[k];
        s.stats[k] = clamp(before + v);
        const d = s.stats[k] - before;
        if (d) emit('delta', { k, d, source });
        return E;
      },
      world(k, v) { s.world[k] = clamp((s.world[k] || 0) + v, 0, k === 'victimes' || k === 'victimesJour' ? 1e6 : 100); return E; },
      power(region, v) { s.world.power[region] = clamp(s.world.power[region] + v); return E; },
      trust(c, v) { s.trust[c] = clamp((s.trust[c] ?? 50) + v); return E; },
      capital(v) { s.capital = Math.max(0, s.capital + v); return E; },
      flag(k, v = true) { s.flags[k] = v; return E; },
      log(text, kind = 'info') { s.log.push({ day: s.day, hour: s.hour, text, kind }); return E; },
      schedule(inDays, id, data = {}, hour = null) { s.scheduled.push({ day: s.day + inDays, hour, id, data, from: source }); return E; },
      dossier(id, data = {}, delayHours = 0) { return addDossier(id, data, delayHours); },
      marker(m) { s.markers = s.markers.filter((x) => x.id !== m.id); s.markers.push(m); return E; },
      unmarker(id) { s.markers = s.markers.filter((x) => x.id !== id); return E; },
      note(n) { s.notes = s.notes.filter((x) => x.id !== n.id); s.notes.push(n); return E; },
      ring(callId, data = {}) { queueCall(callId, data); return E; },
      notify(text, kind = 'info') { emit('notify', { text, kind }); return E; },
    };
    return E;
  }

  // ---------- dossiers ----------
  function addDossier(id, data = {}, delayHours = 0) {
    const s = S();
    const tpl = DOSSIERS[id];
    if (!tpl) throw new Error('Dossier inconnu : ' + id);
    const inst = {
      uid: ++s.seq,
      id,
      day: s.day,
      hour: s.hour + delayHours,
      data,
      read: false,
      mark: null,
      done: false,
      archived: false,
    };
    // Une nouvelle version d'un dossier suivi archive l'ancienne.
    if (tpl.core) s.dossiers.filter((d) => d.id === id && !d.archived).forEach((d) => { d.archived = true; });
    s.dossiers.push(inst);
    if (delayHours <= 0) emit('dossier', inst);
    return inst;
  }
  function dossierView(inst) {
    const tpl = DOSSIERS[inst.id];
    const s = S();
    const ctx = { ...inst.data, day: inst.day, inst };
    const val = (x) => (typeof x === 'function' ? x(s, ctx) : x);
    const actions = (tpl.actions || [])
      .map((a, i) => ({ ...a, index: i, label: val(a.label), hint: val(a.hint), available: !inst.done && (a.avail ? a.avail(s, ctx) : true) }))
      .filter((a) => a.available || inst.chosen === a.index);
    return {
      uid: inst.uid,
      id: inst.id,
      title: val(tpl.title),
      source: val(tpl.source),
      kind: tpl.kind,
      stamp: tpl.stamp ? val(tpl.stamp) : null,
      body: val(tpl.body),
      day: inst.day,
      hour: inst.hour,
      read: inst.read,
      mark: inst.mark,
      done: inst.done,
      chosen: inst.chosen,
      urgent: !!val(tpl.urgent) && !inst.done,
      archived: inst.archived,
      actions,
    };
  }
  function visibleDossiers() {
    const s = S();
    return s.dossiers
      .filter((d) => d.day < s.day || d.hour <= s.hour)
      .sort((a, b) => (b.day - a.day) || (b.hour - a.hour) || (b.uid - a.uid))
      .map(dossierView);
  }

  // ---------- temps ----------
  const dayEnd = () => DAY_END + (S().flags.heuresBonus || 0);
  function spend(hours) {
    const s = S();
    const before = s.hour;
    s.hour = Math.min(dayEnd(), s.hour + hours);
    // Dossiers différés qui arrivent.
    s.dossiers.filter((d) => d.day === s.day && d.hour > before && d.hour <= s.hour).forEach((d) => emit('dossier', d));
    checkEvents();
    emit('change');
  }
  const hoursLeft = () => dayEnd() - S().hour;

  // ---------- appels entrants ----------
  function queueCall(id, data = {}) {
    const s = S();
    if (s.ringing && s.ringing.id === id) return;
    s.ringing = s.ringing || { id, data };
    if (s.ringing.id === id) emit('ring', s.ringing);
    else (s.callQueue = s.callQueue || []).push({ id, data });
  }

  function checkEvents() {
    const s = S();
    // Conséquences programmées pour aujourd'hui avec une heure précise.
    const due = s.scheduled.filter((x) => x.day === s.day && x.hour !== null && x.hour <= s.hour);
    s.scheduled = s.scheduled.filter((x) => !due.includes(x));
    due.forEach(runScheduled);
    // Événements scénarisés et aléatoires planifiés.
    const evs = [...SCRIPTED.filter((e) => e.day === s.day), ...s.events.planned.filter((p) => p.day === s.day).map((p) => ({ ...RANDOM.find((r) => r.id === p.id), hour: p.hour }))];
    for (const e of evs) {
      if (!e || s.events.fired.includes(e.id + '@' + s.day)) continue;
      if (e.hour > s.hour) continue;
      if (e.cond && !e.cond(s)) { if (e.skipIfFalse !== false) s.events.fired.push(e.id + '@' + s.day); continue; }
      if (s.ringing && e.call) continue; // une seule ligne à la fois : on réessaie plus tard
      s.events.fired.push(e.id + '@' + s.day);
      const E = effects(e.id);
      e.fire?.(s, E);
      if (e.call) queueCall(e.call, e.data || {});
      if (e.dossier) addDossier(e.dossier, e.data || {});
    }
  }

  function runScheduled(x) {
    const fn = CONSEQUENCES[x.id];
    if (!fn) throw new Error('Conséquence inconnue : ' + x.id);
    fn(S(), effects(x.id), x.data);
  }

  // ---------- conséquences différées (définies avec les contenus) ----------
  let CONSEQUENCES = { ...WORLD_CONSEQUENCES };
  const registerConsequences = (map) => { CONSEQUENCES = { ...CONSEQUENCES, ...map }; };

  // ---------- arbre ----------
  function nodeStatus(id) {
    const s = S();
    const n = TREE.nodes[id];
    if (s.adopted.includes(id)) return 'adopte';
    if (n.future) return 'futur';
    if ((n.excludes || []).some((x) => s.adopted.includes(x)) || Object.values(TREE.nodes).some((o) => s.adopted.includes(o.id) && (o.excludes || []).includes(id))) return 'exclu';
    const reqOk = (n.requires || []).every((r) => (Array.isArray(r) ? r.some((x) => s.adopted.includes(x)) : s.adopted.includes(r)));
    if (!reqOk) return 'verrouille';
    if (n.minDay && s.day < n.minDay) return 'verrouille';
    if (n.cond && !n.cond(s)) return 'verrouille';
    return 'disponible';
  }
  function adopt(id) {
    const s = S();
    const n = TREE.nodes[id];
    if (nodeStatus(id) !== 'disponible') return { ok: false, msg: 'Cette orientation n’est pas accessible.' };
    if (s.capital < n.cost) return { ok: false, msg: `Il vous faut ${n.cost} points de capital politique.` };
    if (hoursLeft() < n.hours) return { ok: false, msg: 'Il ne reste pas assez d’heures aujourd’hui.' };
    s.capital -= n.cost;
    s.adopted.push(id);
    const E = effects(id);
    E.log(`Orientation adoptée : ${n.title}.`, 'decision');
    n.effect(s, E);
    spend(n.hours);
    emit('adopt', id);
    return { ok: true };
  }

  // ---------- appels sortants ----------
  function canCall(c) {
    const s = S();
    if (s.resigned[c]) return { ok: false, msg: CONTACTS[c].resignedText || 'Ce poste est vacant.' };
    if (hoursLeft() < 1) return { ok: false, msg: 'La journée est terminée.' };
    if ((s.callsToday[c] || 0) >= 2) return { ok: false, msg: 'Vous l’avez déjà eu deux fois aujourd’hui. Son cabinet filtre vos appels.' };
    return { ok: true };
  }

  function outgoingCall(c) {
    const s = S();
    const C = CONTACTS[c];
    s.callsToday[c] = (s.callsToday[c] || 0) + 1;
    const E = effects('call:' + c);
    E.log(`Appel à ${C.name} (${C.role}).`, 'call');
    spend(1);
    const session = { contact: c, lines: [], done: { info: false, order: false, request: false }, ended: false, pending: null };
    const say = (who, text) => session.lines.push({ who, text });
    say(c, greeting(c, s));
    const req = REQUESTS.find((r) => r.contact === c && r.day <= s.day && !s.flags['req:' + r.id] && (!r.cond || r.cond(s)));

    session.options = () => {
      if (session.ended) return [];
      if (session.pending) return session.pending;
      const o = [];
      if (!session.done.info) o.push({ label: 'Demander un point de situation', act: () => { session.done.info = true; const t = situation(c, s); say('vous', 'Où en êtes-vous ?'); say(c, t); addDossier('cr_appel', { contact: c, text: t }); } });
      if (!session.done.order) o.push({ label: 'Donner un ordre…', act: () => { session.pending = orderMenu(); } });
      if (req && !session.done.request) o.push({ label: 'L’écouter : « J’ai une demande… »', act: () => { session.done.request = true; say(c, req.text(s)); session.pending = req.choices.map((ch) => ({ label: ch.label, hint: ch.hint, act: () => { say('vous', ch.reply); s.flags['req:' + req.id] = ch.key; const E2 = effects('req:' + req.id); ch.fx(s, E2); E2.log(`${C.name} : ${ch.logText}`, 'call'); say(c, ch.answer); session.pending = null; } })); } });
      o.push({ label: 'Raccrocher', act: () => { say('vous', 'Merci. Tenez-moi informé.'); session.ended = true; emit('change'); } });
      return o;
    };

    function orderMenu() {
      const list = ORDERS.filter((o) => o.contact === c && !s.ordersGiven.includes(o.id) && (!o.avail || o.avail(s)));
      const items = list.map((o) => ({
        label: o.label,
        hint: legalHint(o, s),
        act: () => {
          say('vous', o.ask);
          const w = o.willing ? o.willing(s) : { mode: 'oui' };
          const reply = w.text || (w.mode === 'oui' ? 'Bien, mon Général. Je m’en occupe.' : w.mode === 'reticent' ? 'C’est risqué. Mais si vous l’ordonnez…' : 'Je ne peux pas faire ça.');
          say(c, reply);
          if (w.mode === 'refus') {
            session.pending = [
              { label: 'Insister (vous perdrez de sa confiance)', act: () => { say('vous', 'Je ne vous le demande pas. Je vous l’ordonne.'); const E3 = effects('order:' + o.id); E3.trust(c, -12); give(o, true); } },
              { label: 'Renoncer', act: () => { say('vous', 'Très bien. Oubliez cela.'); session.pending = null; } },
            ];
          } else {
            give(o, false, w.mode === 'reticent');
          }
        },
      }));
      items.push({ label: 'Revenir', act: () => { session.pending = null; } });
      return items;
    }

    function give(o, insisted, reluctant) {
      session.done.order = true;
      session.pending = null;
      s.ordersGiven.push(o.id);
      const p = orderChance(o, s, { insisted, reluctant });
      const r = roll();
      const outcome = r < p ? 'succes' : r < p + 0.22 ? 'partiel' : 'echec';
      const E = effects('order:' + o.id);
      E.log(`Ordre donné à ${C.name} : ${o.label}.`, 'order');
      o.immediate?.(s, E, outcome);
      if (o.ack) say(c, typeof o.ack === 'function' ? o.ack(s) : o.ack);
      const delay = o.reportDelay ?? 3;
      if (delay >= 0 && s.hour + delay <= dayEnd()) {
        s.scheduled.push({ day: s.day, hour: s.hour + delay, id: '__order', data: { order: o.id, outcome, insisted: !!insisted } });
      } else {
        s.scheduled.push({ day: s.day + 1, hour: null, id: '__order', data: { order: o.id, outcome, insisted: !!insisted } });
      }
    }
    session.choose = (opt) => { opt.act(); emit('change'); };
    return session;
  }

  function legalHint(o, s) {
    const L = typeof o.legal === 'function' ? o.legal(s) : o.legal;
    if (L === true) return 'Légal';
    if (L === 'douteux') return 'Légalité discutable';
    return 'Illégal';
  }
  function orderChance(o, s, { insisted, reluctant } = {}) {
    const L = typeof o.legal === 'function' ? o.legal(s) : o.legal;
    let p = o.base;
    p += (s.trust[o.contact] - 50) / 220;
    p += (s.stats.institutions - 50) / 260;
    if (L === 'douteux') p -= 0.1;
    if (L === false) p -= 0.22;
    if (insisted) p -= 0.12;
    if (reluctant) p -= 0.05;
    if (o.mod) p += o.mod(s);
    return Math.max(0.08, Math.min(0.95, p));
  }

  registerConsequences({
    __order(s, E, data) {
      const o = ORDERS.find((x) => x.id === data.order);
      o.resolve(s, E, data.outcome, data);
      const rep = o.report[data.outcome];
      addDossier('cr_ordre', { order: o.id, outcome: data.outcome, text: typeof rep === 'function' ? rep(s, data) : rep, contact: o.contact });
    },
  });

  // ---------- appels entrants (graphes de dialogue) ----------
  function answerCall() {
    const s = S();
    if (!s.ringing) return null;
    const { id, data } = s.ringing;
    s.ringing = null;
    if (s.callQueue?.length) {
      const next = s.callQueue.shift();
      setTimeout(() => queueCall(next.id, next.data), 0);
    }
    const graph = CALLS[id];
    const E = effects('incoming:' + id);
    E.log(`Appel reçu : ${CONTACTS[graph.contact].name}.`, 'call');
    spend(graph.hours ?? 0.5);
    const session = { contact: graph.contact, lines: [], ended: false, incoming: true, id };
    const ctx = { ...data };
    const go = (nodeId) => {
      const n = graph.nodes[nodeId];
      if (!n) { session.ended = true; return; }
      if (n.fx) n.fx(s, effects('incoming:' + id), ctx);
      const text = typeof n.text === 'function' ? n.text(s, ctx) : n.text;
      if (text) session.lines.push({ who: n.who || graph.contact, text });
      session.node = n;
      if (n.end) session.ended = true;
      else if (n.next && !n.choices) go(typeof n.next === 'function' ? n.next(s, ctx) : n.next);
    };
    session.options = () => {
      if (session.ended) return [{ label: 'Raccrocher', act: () => { session.closed = true; } }];
      return (session.node.choices || [])
        .filter((ch) => !ch.cond || ch.cond(s, ctx))
        .map((ch) => ({
          label: typeof ch.label === 'function' ? ch.label(s, ctx) : ch.label,
          hint: ch.hint,
          act: () => {
            if (ch.say) session.lines.push({ who: 'vous', text: ch.say });
            if (ch.fx) ch.fx(s, effects('incoming:' + id), ctx);
            if (ch.log) effects('incoming:' + id).log(ch.log, 'call');
            go(typeof ch.to === 'function' ? ch.to(s, ctx) : ch.to);
          },
        }));
    };
    session.choose = (opt) => { opt.act(); emit('change'); };
    go(graph.start);
    return session;
  }
  function declineCall() {
    const s = S();
    if (!s.ringing) return;
    const graph = CALLS[s.ringing.id];
    const E = effects('decline');
    E.log(`Appel ignoré : ${CONTACTS[graph.contact].name}.`, 'call');
    graph.onDecline?.(s, E);
    if (graph.contact in s.trust) E.trust(graph.contact, -4);
    s.ringing = null;
    if (s.callQueue?.length) { const n = s.callQueue.shift(); queueCall(n.id, n.data); }
    emit('change');
  }

  // ---------- actions sur dossier ----------
  function dossierAction(uid, index) {
    const s = S();
    const inst = s.dossiers.find((d) => d.uid === uid);
    const tpl = DOSSIERS[inst.id];
    const a = tpl.actions[index];
    const cost = a.hours ?? 1;
    if (hoursLeft() < cost) return { ok: false, msg: 'Il ne reste pas assez d’heures aujourd’hui.' };
    if (a.capital && s.capital < a.capital) return { ok: false, msg: `Il faut ${a.capital} points de capital politique.` };
    inst.done = true;
    inst.chosen = index;
    if (a.capital) s.capital -= a.capital;
    const E = effects('dossier:' + inst.id);
    const label = typeof a.label === 'function' ? a.label(s, inst.data) : a.label;
    E.log(`${typeof tpl.title === 'function' ? tpl.title(s, inst.data) : tpl.title} : ${a.logText || label}.`, 'decision');
    a.fx(s, E, inst.data);
    spend(cost);
    return { ok: true };
  }

  // ---------- journée ----------
  function beginDay() {
    const s = S();
    s.hour = DAY_START;
    s.callsToday = {};
    s.dayStart = { stats: { ...s.stats }, world: JSON.parse(JSON.stringify(s.world)), capital: s.capital, logLen: s.log.length };
    // Conséquences de la nuit (sans heure précise).
    const due = s.scheduled.filter((x) => x.day === s.day && x.hour === null);
    s.scheduled = s.scheduled.filter((x) => !due.includes(x));
    due.forEach(runScheduled);
    // Dossiers suivis : nouvelle version chaque matin.
    for (const id of CORE_DOSSIERS) {
      const tpl = DOSSIERS[id];
      if (!tpl.fromDay || s.day >= tpl.fromDay) addDossier(id, {});
    }
    // Événements aléatoires du jour.
    const pool = RANDOM.filter((e) => (!e.days || e.days.includes(s.day)) && !s.events.fired.some((f) => f.startsWith(e.id + '@')) && (!e.precond || e.precond(s)));
    const n = s.day === LAST_DAY ? 1 : 2;
    const picked = [];
    for (let i = 0; i < n && pool.length; i++) {
      const tot = pool.reduce((a, e) => a + (e.weight || 1), 0);
      let r = roll() * tot;
      const k = pool.findIndex((e) => (r -= e.weight || 1) < 0);
      picked.push(pool.splice(k < 0 ? 0 : k, 1)[0]);
    }
    s.events.planned = s.events.planned.filter((p) => p.day !== s.day);
    picked.forEach((e, i) => s.events.planned.push({ id: e.id, day: s.day, hour: 10 + Math.floor(roll() * 6) + i }));
    checkEvents();
    emit('day', s.day);
    emit('change');
  }

  function endDay() {
    const s = S();
    const E = effects('nuit');
    const startLog = s.dayStart?.logLen ?? 0;
    const dayLog = s.log.slice(startLog);
    const nightNotes = simulateNight(s, E);
    s.history.push({ day: s.day, stats: { ...s.stats }, world: JSON.parse(JSON.stringify(s.world)) });
    const summary = {
      day: s.day,
      date: DAYS[s.day],
      log: dayLog,
      night: nightNotes,
      before: s.dayStart?.stats || s.stats,
      after: { ...s.stats },
      world: JSON.parse(JSON.stringify(s.world)),
      worldBefore: s.dayStart?.world,
      pending: s.scheduled.filter((x) => x.day > s.day || x.hour === null).map((x) => pendingHint(x)).filter(Boolean),
      headline: headline(s),
    };
    s.headlines = s.headlines || {};
    s.headlines[s.day + 1] = summary.headline;
    // Effondrement anticipé.
    if (s.stats.stabilite <= 6 || s.stats.population <= 4) {
      s.ended = { kind: 'chute', vote: null };
    } else if (s.day >= LAST_DAY) {
      const vote = voteOfConfidence(s);
      s.ended = { kind: vote.kind, vote };
    }
    if (s.ended) summary.ending = epilogue(s);
    emit('endday', summary);
    return summary;
  }
  function pendingHint(x) {
    if (x.id === '__order') {
      const o = ORDERS.find((q) => q.id === x.data.order);
      return `Ordre « ${o.label} » : compte rendu attendu demain matin.`;
    }
    const h = CONSEQUENCE_HINTS[x.id];
    return typeof h === 'function' ? h(S(), x.data) : h || null;
  }
  let CONSEQUENCE_HINTS = { ...HINTS };
  function nextDay() {
    const s = S();
    if (s.ended) return;
    s.day += 1;
    beginDay();
  }

  // ---------- carte ----------
  function mapState() {
    const s = S();
    const p = s.world.power;
    const tension = (base) => clamp(base);
    const lc = 100 - s.stats.cohesion;
    const power = {
      wvl: p.flandre, ovl: p.flandre, ant: Math.min(100, p.flandre + 6), lim: p.flandre - 4, vbr: p.flandre - 2,
      bru: p.bruxelles, wbr: Math.min(100, p.wallonie + 14), hai: p.wallonie - 6, nam: p.wallonie + 6, lie: p.wallonie - 3, lux: p.wallonie + 12,
    };
    for (const k of Object.keys(power)) power[k] = clamp(power[k]);
    const overlays = [];
    if (s.adopted.includes('scinder_reseau')) overlays.push('scission');
    if (s.adopted.includes('conference_confederale')) overlays.push('confederal');
    if (s.adopted.includes('cellule_interfederale')) overlays.push('interfederal');
    if (s.adopted.includes('recentraliser')) overlays.push('centralisation');
    return {
      regions: {
        flandre: { tension: tension(lc * 0.7 + s.world.separatisme * 0.5 + (s.flags.priorite === 'equite' ? 12 : 0)) },
        wallonie: { tension: tension(lc * 0.7 + s.world.unrest * 0.5 + (100 - p.wallonie) * 0.2) },
        bruxelles: { tension: tension(lc * 0.5 + s.world.unrest * 0.4) },
      },
      power,
      curfew: s.flags.couvrefeu ? ['hai', 'lie'] : [],
      markers: s.markers,
      notes: s.notes,
      overlays,
      showSmall: ['courcelles', 'seraing', 'eupen', 'wavre', 'verviers'].filter((c) => s.markers.some((m) => m.city === c) || c === 'courcelles'),
      caption: 'Carte de situation — Centre de crise',
      stamp: `${DAYS[s.day]} · ${String(Math.floor(s.hour)).padStart(2, '0')} h ${s.hour % 1 ? '30' : '00'}`,
    };
  }

  // ---------- sauvegarde ----------
  const SAVE_KEY = 'rue-de-la-loi:save:v1';
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S())); return true; } catch { return false; }
  }

  const G = {
    state,
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => { listeners[ev] = listeners[ev].filter((f) => f !== fn); }; },
    emit,
    effects,
    roll,
    spend,
    hoursLeft,
    dayEnd,
    nodeStatus,
    adopt,
    canCall,
    outgoingCall,
    answerCall,
    declineCall,
    dossierAction,
    visibleDossiers,
    dossierView,
    readDossier(uid) { const d = S().dossiers.find((x) => x.uid === uid); if (d && !d.read) { d.read = true; emit('read', d); emit('change'); } },
    markDossier(uid, mark) { const d = S().dossiers.find((x) => x.uid === uid); if (d) { d.mark = d.mark === mark ? null : mark; emit('change'); } },
    beginDay,
    endDay,
    nextDay,
    mapState,
    save,
    orderChance,
    registerConsequences,
    registerHints(h) { CONSEQUENCE_HINTS = { ...CONSEQUENCE_HINTS, ...h }; },
    unread() { return visibleDossiers().filter((d) => !d.read && !d.archived).length; },
    pendingUrgent() { return visibleDossiers().filter((d) => d.urgent && !d.archived).length; },
  };
  return G;
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem('rue-de-la-loi:save:v1');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === 1 ? s : null;
  } catch {
    return null;
  }
}
export function clearSaved() {
  try { localStorage.removeItem('rue-de-la-loi:save:v1'); } catch { /* stockage indisponible */ }
}
