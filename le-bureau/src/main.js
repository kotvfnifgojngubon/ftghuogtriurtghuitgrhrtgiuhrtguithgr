// Point d'entrée : relie la scène 3D, le moteur de jeu, les interfaces et le son.
import { createStage } from './world/stage.js';
import { createOffice, dayPhase } from './world/office.js';
import { createGame, newState, loadSaved, clearSaved, DAYS, STATS } from './game/engine.js';
import { CALLS } from './game/content/events.js';
import { CONTACTS } from './game/content/contacts.js';
import { createAudio } from './audio.js';
import { h, typo, icon, fmtHour, statColor, statWord } from './ui/dom.js';
import { phonePanel, dossiersPanel, computerPanel, mapPanel, endDayPanel, epiloguePanel, flavorPanel, openPanel, closePanel, currentPanel } from './ui/panels.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem('rue-de-la-loi:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rue-de-la-loi:' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const coarse = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
const quality = Number(params.get('q') ?? store.get('quality', coarse ? 1 : 2));
const audio = createAudio();
audio.setEnabled(store.get('sound', true));

// ---------- chargement ----------
const setLoading = (t, p) => { $('loading-text').textContent = t; $('loading-bar').style.width = `${p}%`; };
setLoading('Chargement des polices…', 8);
await Promise.race([
  Promise.all(['600 20px "Cormorant Garamond"', '500 20px "IBM Plex Sans"', '400 20px "IBM Plex Mono"', '700 20px "Caveat"', '400 20px "Courier Prime"'].map((f) => document.fonts.load(f))),
  wait(4000),
]).catch(() => {});
setLoading('Construction du bureau : bois, marbre, cuir…', 25);
await nextFrame();
const stage = await createStage($('scene'), { quality });
setLoading('Éclairage de la pièce…', 75);
await nextFrame();
const office = createOffice(stage);
let G = createGame(newState(7));
G.state.hour = 21;
office.apply(G, { map: true });
stage.orbit();
stage.snapCamera();
setLoading('Prêt.', 100);
window.stage = stage;

// ---------- boucle de rendu ----------
let last = performance.now();
let promptKey = '';
// Mode test (?test) : on ne dessine qu'à la demande, pour les captures automatiques.
const testMode = params.has('test');
let pendingFrames = 0;
window.renderFrames = (n = 1) => { pendingFrames += n; };
stage.renderer.setAnimationLoop(() => {
  if (testMode) { if (pendingFrames <= 0) return; pendingFrames--; }
  const now = performance.now();
  const dt = testMode ? 1 / 20 : Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  stage.frame(dt);
  office.tick(dt, now / 1000, G);
  if (!testMode) adapt(dt);
  if (playing && !currentPanel()) updatePrompt();
});

// Qualité adaptative : si l'image est trop lente, on allège (occlusion, puis résolution).
const perf = { t: 0, n: 0, sum: 0, steps: 0 };
function adapt(dt) {
  if (perf.steps >= 2 || document.hidden) return;
  perf.t += dt; perf.n++; perf.sum += dt;
  if (perf.t < 4) return;
  const avg = perf.sum / perf.n;
  perf.t = 0; perf.n = 0; perf.sum = 0;
  if (avg < 0.042) return;
  if (stage.post.gtao?.enabled) { stage.post.gtao.enabled = false; perf.steps++; return; }
  if (stage.renderer.getPixelRatio() > 1) { stage.renderer.setPixelRatio(1); stage.resize(); perf.steps++; return; }
  perf.steps = 2;
}

// ---------- écran titre ----------
let playing = false;
$('loading').hidden = true;
const saved = loadSaved();
const hotState = window.claude?.hot?.data?.state;
if (saved && !saved.ended) $('btn-continue').hidden = false;
$('opt-quality').value = String(quality);
$('opt-quality').onchange = (e) => { store.set('quality', Number(e.target.value)); location.reload(); };
$('opt-sound').checked = audio.enabled;
$('opt-sound').onchange = (e) => { audio.setEnabled(e.target.checked); store.set('sound', e.target.checked); };
$('btn-new').onclick = () => startNew();
$('btn-continue').onclick = () => startGame(createGame(saved), false);
function boot() {
  const go = (data = {}) => {
    const hs = data.state || hotState;
    if (params.has('autostart')) startGame(createGame(newState(Number(params.get('seed') || 42))), true, true);
    else if (hs && !hs.ended) startGame(createGame(hs), false);
    else $('title').hidden = false;
  };
  window.claude?.hot?.snapshot?.(() => ({ state: playing ? G.state : null }));
  if (window.claude?.hot?.ready) window.claude.hot.ready(go); else go(window.claude?.hot?.data ?? {});
}

async function startNew() {
  audio.init();
  audio.resume();
  clearSaved();
  $('title').hidden = true;
  const intro = $('intro');
  intro.hidden = false;
  const t = $('intro-text');
  t.innerHTML = '';
  t.append(h('span', { class: 'stamp' }, 'Bruxelles · Lundi 13 janvier · 7 h 52'));
  const lines = [
    'Il y a six jours, le gouvernement est tombé.',
    'Le Roi vous a nommé à la tête d’un gouvernement d’urgence. Vous avez vingt-deux ans. Vous portez encore l’uniforme.',
    'Cette nuit, à 3 h 02, le réseau électrique s’est effondré. 1,9 million de foyers sont dans le noir. Il fait −9 °C.',
    'Jeudi à 18 heures, le Parlement votera la confiance.',
    'D’ici là, vous ne quitterez pas ce bureau.',
  ];
  const skip = { v: false };
  intro.onclick = () => { skip.v = true; };
  for (const l of lines) {
    const p = h('p', {}, '');
    t.append(p);
    for (const ch of typo(l)) {
      p.textContent += ch;
      if (!skip.v) await wait(18);
    }
    if (!skip.v) await wait(420);
  }
  intro.onclick = null;
  const b = $('btn-intro');
  b.hidden = false;
  b.focus();
  b.onclick = () => {
    b.hidden = true;
    intro.hidden = true;
    startGame(createGame(newState()), true);
  };
}

// ---------- partie ----------
let tutoStep = 0;
function startGame(game, fresh, skipIntro = false) {
  audio.init();
  audio.resume();
  G = game;
  window.game = G;
  playing = true;
  $('title').hidden = true;
  $('hud').hidden = false;
  const s = G.state;
  stage.player.x = -4.9; stage.player.z = -2.4; stage.player.face = -Math.PI / 2;
  G.on('change', onChange);
  G.on('ring', onRing);
  G.on('dossier', onDossier);
  G.on('delta', onDelta);
  G.on('notify', ({ text, kind }) => toast(text, kind));
  G.on('read', () => { if (tutoStep === 1 && G.state.dossiers.filter((d) => d.read).length >= 2) tuto(2); });
  G.on('adopt', () => { if (tutoStep <= 3) tuto(3); office.markMap(); });
  tutoStep = fresh ? 0 : store.get('tuto', 6);
  if (fresh) { G.beginDay(); tuto(0); }
  else if (s.ringing) onRing(s.ringing);
  stage.follow();
  stage.snapCamera();
  office.markMap();
  refresh();
  if (skipIntro) { /* tests */ }
}

let dossierBurst = [];
function onDossier(d) {
  dossierBurst.push(d);
  clearTimeout(onDossier.t);
  onDossier.t = setTimeout(() => {
    const n = dossierBurst.length;
    if (n === 1) {
      const v = G.dossierView(dossierBurst[0]);
      toast(`Nouveau dossier : ${v.title}`, v.urgent ? 'alert' : 'info');
    } else if (n > 1) toast(`${n} nouveaux dossiers sur votre bureau.`);
    dossierBurst = [];
    audio.paper();
  }, 60);
  office.markMap();
}
function onRing(r) {
  audio.ring();
  office.setRinging(true);
  const who = CALLS[r.id].contact;
  toast(`Le téléphone sonne : ${CONTACTS[who].name}, ${CONTACTS[who].role}.`, 'alert');
  refresh();
}
function onDelta({ k, d }) {
  const el = document.querySelector(`[data-stat="${k}"]`);
  if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); }
  void d;
}
let changeQueued = false;
function onChange() {
  if (changeQueued) return;
  changeQueued = true;
  requestAnimationFrame(() => {
    changeQueued = false;
    office.markMap();
    refresh();
    G.save();
    if (!G.state.ringing) { audio.stopRing(); office.setRinging(false); }
    const p = currentPanel();
    if (p?.rerender && p.name !== 'telephone') p.rerender();
    if (G.state.ringing && p?.name === 'telephone') p.rerender();
    if (tutoStep === 4 && G.state.hour >= 15) tuto(5);
  });
}

// ---------- HUD ----------
function refresh() {
  const s = G.state;
  office.apply(G);
  $('hud-date').textContent = DAYS[s.day];
  $('hud-time').textContent = fmtHour(s.hour);
  const left = G.hoursLeft();
  $('hud-left').textContent = left > 0 ? `${left} h restantes` : 'journée terminée';
  $('hud-capital').textContent = s.capital;
  const sc = $('hud-stats');
  sc.innerHTML = '';
  for (const [k, def] of Object.entries(STATS)) {
    const v = s.stats[k];
    sc.append(h('span', { class: 'stat-name' }, def.short), h('div', { class: 'stat-bar', 'data-stat': k, title: `${def.label} : ${v}/100` }, h('i', { style: { width: `${v}%`, background: statColor(v) } })), h('span', { class: 'stat-word' }, statWord(k, v)));
  }
  const unread = G.unread();
  const bd = $('badge-dossiers');
  bd.hidden = !unread;
  bd.textContent = unread;
  $('badge-phone').hidden = !s.ringing;
  audio.setSiren(s.world.unrest > 58 || !!s.flags.patrouilles);
  audio.setHum(s.world.power.bruxelles < 60);
  if (left <= 0 && !refresh.warned) { refresh.warned = true; toast('La journée est terminée. Il ne vous reste qu’à la clore (agenda).', 'alert'); }
  if (left > 0) refresh.warned = false;
}
$('hud-stats').onclick = () => handle('ordinateur', 'indic');
for (const b of document.querySelectorAll('.dock-btn')) b.onclick = () => handle(b.dataset.go);
for (const s of document.querySelectorAll('[data-ico]')) s.replaceWith(icon(s.dataset.ico));

function toast(text, kind = 'info') {
  const t = h('div', { class: `toast ${kind}` }, typo(text));
  $('toasts').append(t);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => t.remove(), kind === 'alert' ? 6500 : 4500);
}

const LABELS = { telephone: 'Téléphone', ordinateur: 'Ordinateur', dossiers: 'Dossiers', agenda: 'Clore la journée', carte: 'Examiner la carte', fenetre: 'Regarder dehors', journal: 'Lire la presse', globe: 'Faire tourner le globe', porte: 'Ouvrir la porte' };
function updatePrompt() {
  const near = stage.nearestInteractable();
  const key = near.join(',') + (G.state.ringing ? '!' : '');
  if (key === promptKey) return;
  promptKey = key;
  const p = $('prompt');
  p.innerHTML = '';
  p.hidden = !near.length;
  near.forEach((n, i) => p.append(h('button', { onclick: () => handle(n) }, i === 0 ? h('kbd', {}, 'E') : null, n === 'telephone' && G.state.ringing ? 'Décrocher' : LABELS[n] || n)));
}
stage.onHover = (label, x, y) => {
  const el = $('hover-label');
  if (!label || !playing || currentPanel()) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = label;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
};
stage.onInteract = (name) => { if (playing && !currentPanel()) handle(name); };
stage.onMoveStart = () => { $('hover-label').hidden = true; };

window.addEventListener('keydown', (e) => {
  if (!playing) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) busy = false;
  if (e.code === 'Escape' && currentPanel() && currentPanel().dismissable !== false) { closePanel(); e.preventDefault(); return; }
  if (currentPanel()) return;
  if (e.code === 'KeyE' || e.code === 'Enter') {
    const near = stage.nearestInteractable();
    if (near.length) handle(G.state.ringing && near.includes('telephone') ? 'telephone' : near[0]);
  }
});

// ---------- interactions ----------
let busy = false;
function handle(name, sub) {
  if (!playing || busy || currentPanel()) return;
  if (G.state.ended && !['fenetre', 'globe', 'porte', 'carte'].includes(name)) return;
  const spot = { telephone: 'chair', ordinateur: 'chair', dossiers: 'chair', agenda: 'chair', carte: 'carte', fenetre: 'fenetre', journal: 'journal', globe: 'globe', porte: 'porte' }[name];
  busy = true;
  $('prompt').hidden = true;
  promptKey = '';
  stage.goToSpot(spot, () => {
    busy = false;
    open(name, sub);
  });
  // Un déplacement au clavier annule l'action.
  setTimeout(() => { busy = false; }, 6000);
}

const panelCtx = () => ({
  G, audio, toast,
  onClose: () => { stage.general.setTyping(false); stage.setLocked(false); stage.follow(); refresh(); },
});

function open(name, sub) {
  stage.setLocked(true);
  stage.focus(name);
  audio.click();
  if (name === 'telephone') {
    stage.general.setPhone(false);
    phonePanel({ ...panelCtx(), callContact: (id) => CALLS[id].contact, onCall: (on) => { stage.general.setPhone(on); if (!on && tutoStep === 0) tuto(1); if (!on && tutoStep === 3 && G.state.log.some((l) => l.text.startsWith('Appel à'))) tuto(4); } });
  } else if (name === 'dossiers' || name === 'journal') {
    const presse = name === 'journal' ? G.visibleDossiers().find((d) => d.id === 'presse' && !d.archived) : null;
    dossiersPanel({ ...panelCtx(), select: presse?.uid });
  } else if (name === 'ordinateur') {
    stage.general.setTyping(true);
    computerPanel({ ...panelCtx(), tab: sub === 'indic' ? 'indic' : 'arbre' });
    if (tutoStep === 2) tuto(3);
  } else if (name === 'carte') {
    mapPanel(panelCtx());
    if (tutoStep === 4) tuto(5);
  } else if (name === 'agenda') {
    confirmEndDay();
  } else if (name === 'fenetre') {
    flavorPanel(panelCtx(), 'Par la fenêtre', windowText());
  } else if (name === 'globe') {
    office.spinGlobe();
    flavorPanel(panelCtx(), 'Le globe', G.state.flags.accusation ? 'Le globe tourne sous vos doigts. Trois ambassades ont demandé des explications ce matin. Le monde lit les mêmes dépêches que vous, avec moins d’indulgence.' : 'Le globe tourne sous vos doigts. Quelque part, des chancelleries lisent les mêmes dépêches que vous et se demandent combien de temps la Belgique tiendra.');
  } else if (name === 'porte') {
    flavorPanel(panelCtx(), 'La porte', ['', 'Vous posez la main sur la poignée. Derrière, des huissiers, des caméras, des questions. Vous ne sortirez pas tant que le pays sera dans le noir.', 'Dans le couloir, on chuchote. Un huissier vous apporte un café que vous n’avez pas demandé. Vous refermez.', 'Par l’entrebâillement, vous apercevez des cartons de dossiers empilés jusqu’au plafond. Vous refermez doucement.', 'Le couloir est vide. Tout le monde est déjà parti pour l’hémicycle. Vous restez.'][G.state.day] || 'Vous restez.');
  }
}

function windowText() {
  const s = G.state;
  const ph = dayPhase(s.hour);
  const b = s.world.power.bruxelles;
  const parts = [];
  if (ph > 0.6) parts.push(b < 55 ? 'Bruxelles est noire. Quelques bougies aux fenêtres, les phares des voitures, et le ciel étrangement étoilé au-dessus du quartier européen.' : 'La ville s’est rallumée par îlots. Les tours du quartier Nord brillent, le parc de Bruxelles reste une tache sombre.');
  else parts.push('Un ciel blanc de janvier. Le givre colle aux vitres.');
  if (s.flags.patrouilles) parts.push('En bas, rue de la Loi, deux véhicules blindés stationnent devant le Parlement. Des soldats battent la semelle.');
  else if (s.flags.armee) parts.push('Un convoi militaire passe, chargé de groupes électrogènes.');
  else if (s.world.unrest > 55) parts.push('Des gyrophares bleus balaient les façades. On entend des cris, loin.');
  else parts.push('Une file s’étire devant la seule boulangerie équipée d’un groupe électrogène.');
  if (s.flags.brigades) parts.push('Au coin de la rue, trois hommes en brassard noir contrôlent un livreur.');
  if (s.flags.pacte_rempart || s.adopted.includes('dialogue_rempart')) parts.push('Sur un mur d’en face, une affiche fraîche : « Le Rempart. L’ordre, maintenant. »');
  return parts.join(' ');
}

// ---------- notes de la cheffe de cabinet (tutoriel intégré) ----------
const TUTO = [
  'Le téléphone sonne : c’est l’Intérieur. Approchez-vous du bureau (ZQSD, ou cliquez au sol) et décrochez. Vous pouvez aussi cliquer directement sur le téléphone rouge.',
  'Les premiers rapports sont dans la corbeille, sur votre bureau. Lisez-les : ils ne disent pas tous la même chose.',
  'L’ordinateur fixe le cap : quatre voies, aucune n’est gratuite. Chaque orientation coûte du capital politique et des heures.',
  'Le téléphone sert aussi à appeler vos trois interlocuteurs : point de situation, ordres, demandes. Un ordre n’est pas toujours exécuté comme prévu.',
  'La carte, derrière votre fauteuil, montre le pays tel que le Centre de crise le voit. Elle change avec vos décisions.',
  'Quand vous avez fini, l’agenda sur le bureau clôt la journée. Les conséquences arrivent souvent pendant la nuit.',
];
function tuto(step) {
  tutoStep = step;
  store.set('tuto', step);
  const n = $('note');
  if (step >= TUTO.length) { n.hidden = true; return; }
  $('note-text').textContent = typo(TUTO[step]);
  n.hidden = false;
}
document.querySelector('.note-close').onclick = () => { $('note').hidden = true; };

// ---------- fin de journée ----------
function confirmEndDay() {
  const left = G.hoursLeft();
  const ringing = G.state.ringing;
  openPanel('confirm', (api, r) => {
    const panel = h('div', { class: 'panel flavor', role: 'dialog', 'aria-label': 'Clore la journée' });
    r.append(panel);
    panel.append(
      h('div', { class: 'panel-head' }, h('h2', {}, 'Clore la journée ?'), h('div', { class: 'spacer' }), h('button', { class: 'close', 'aria-label': 'Fermer', onclick: () => closePanel() }, '×')),
      h('div', { class: 'panel-body' },
        typo(left > 0 ? `Il reste ${left} h. Ce que vous ne faites pas aujourd’hui ne se fera pas tout seul.` : 'La journée est finie. Le pays attend la nuit.'),
        ringing ? h('p', { style: { color: 'var(--red-hi)', fontStyle: 'normal', fontFamily: 'var(--f-ui)', fontSize: '14px' } }, 'Le téléphone sonne encore. Si vous partez, l’appel restera sans réponse.') : null,
        h('div', { class: 'end-actions' }, h('button', { class: 'btn', onclick: () => closePanel() }, 'Pas encore'), h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { closePanel(true); endDay(); } }, 'Clore la journée'))));
  }, panelCtx().onClose);
}

async function endDay() {
  while (G.state.ringing) G.declineCall();
  audio.stopRing();
  office.setRinging(false);
  stage.setLocked(true);
  stage.focus('nuit');
  audio.night();
  if (tutoStep < 6) tuto(6);
  const sum = G.endDay();
  office.markMap();
  refresh();
  await wait(900);
  endDayPanel({
    onContinue: async () => {
      closePanel(true);
      if (G.state.ended) {
        stage.focus('agenda');
        epiloguePanel({ onRestart: () => { clearSaved(); location.reload(); }, onLook: () => { closePanel(true); stage.setLocked(false); stage.follow(); } }, sum.ending);
        G.save();
        return;
      }
      const intro = $('intro');
      const t = $('intro-text');
      t.innerHTML = '';
      t.append(h('span', { class: 'stamp' }, `${DAYS[G.state.day + 1]} · 8 h 00`), h('p', {}, typo(['', '', 'Deuxième jour. Le café est froid avant d’être servi.', 'Troisième jour. Vous avez dormi deux heures, sur le canapé.', 'Dernier jour. Ce soir, le Parlement vote.'][G.state.day + 1] || '')));
      intro.hidden = false;
      await wait(1900);
      G.nextDay();
      intro.hidden = true;
      stage.setLocked(false);
      stage.follow();
      refresh();
      G.save();
    },
  }, sum);
}

window.ui = { handle, open, endDay, toast };
boot();
