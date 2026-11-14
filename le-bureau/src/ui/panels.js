// Panneaux : téléphone, dossiers, ordinateur (arbre), carte, fin de journée, épilogue, regards.
import { h, typo, icon, svgIcon, KIND_ICON, KIND_LABEL, fmtHour, statColor, statWord } from './dom.js';
import { CONTACTS } from '../game/content/contacts.js';
import { TREE } from '../game/content/tree.js';
import { STATS, DAYS } from '../game/engine.js';
import { renderMap } from '../world/mapboard.js';

const root = () => document.getElementById('panel-root');
let current = null;

export function openPanel(name, build, onClose) {
  closePanel(true);
  const r = root();
  r.hidden = false;
  r.innerHTML = '';
  const api = { name, el: null, rerender: null, onClose };
  current = api;
  build(api, r);
  r.onclick = (e) => { if (e.target === r && api.dismissable !== false) closePanel(); };
  setTimeout(() => r.querySelector('[data-autofocus]')?.focus() || r.querySelector('button')?.focus(), 30);
  return api;
}
export function closePanel(silent) {
  const r = root();
  if (!current) { r.hidden = true; return; }
  const c = current;
  current = null;
  r.hidden = true;
  r.innerHTML = '';
  if (!silent) c.onClose?.();
  else c.onClose?.('replaced');
}
export const currentPanel = () => current;

function head(title, sub, onClose) {
  return h('div', { class: 'panel-head' },
    h('div', {}, h('h2', {}, typo(title)), sub ? h('div', { class: 'sub' }, typo(sub)) : null),
    h('div', { class: 'spacer' }),
    h('button', { class: 'close', 'aria-label': 'Fermer', onclick: () => onClose() }, '×'));
}
const monogram = (c) => h('div', { class: 'monogram', style: { background: `radial-gradient(circle at 35% 30%, ${CONTACTS[c].tone}, #0b0806 120%)` } }, CONTACTS[c].initials);
const bar = (v, color) => h('div', { class: 'stat-bar' }, h('i', { style: { width: `${v}%`, background: color || statColor(v) } }));

// ======================= TÉLÉPHONE =======================
export function phonePanel(ctx) {
  const { G } = ctx;
  let session = ctx.session || null;
  let selected = session?.contact || 'verhaegen';
  let message = '';
  return openPanel('telephone', (api, r) => {
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-label': 'Téléphone' });
    r.append(panel);
    const render = () => {
      const s = G.state;
      panel.innerHTML = '';
      panel.append(head('Téléphone rouge', `Chaque appel sortant prend une heure. Il reste ${Math.max(0, G.hoursLeft())} h aujourd’hui.`, () => closePanel()));
      const list = h('div', { class: 'contacts' });
      for (const c of ['verhaegen', 'dufrasne', 'lenoir']) {
        const C = CONTACTS[c];
        const can = G.canCall(c);
        const btn = h('button', { class: `contact${selected === c ? ' active' : ''}`, disabled: (session && !session.ended) || s.resigned[c] ? true : null, onclick: () => {
          selected = c;
          const ok = G.canCall(c);
          if (!ok.ok) { message = ok.msg; render(); return; }
          message = '';
          session = G.outgoingCall(c);
          ctx.onCall?.(true);
          ctx.audio?.pickup();
          render();
        } },
        monogram(c),
        h('div', {}, h('div', { class: 'who' }, C.name), h('div', { class: 'role' }, s.resigned[c] ? 'Poste vacant' : C.role),
          h('div', { class: 'trust' }, 'Confiance', bar(s.trust[c]), can.ok ? '' : '')));
        list.append(btn);
      }
      list.append(h('div', { class: 'contact-bio' }, typo(CONTACTS[selected].bio || '')));
      const call = h('div', { class: 'call' });
      if (!session && s.ringing) {
        const id = s.ringing.id;
        const who = ctx.callContact(id);
        call.append(h('div', { class: 'incoming' },
          monogram(who),
          h('div', { class: 'eyebrow' }, 'Appel entrant'),
          h('h3', {}, CONTACTS[who].name),
          h('div', { class: 'muted' }, CONTACTS[who].role),
          h('div', { class: 'title-actions' },
            h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { session = G.answerCall(); ctx.onCall?.(true); ctx.audio?.pickup(); render(); } }, 'Décrocher'),
            h('button', { class: 'btn ghost', onclick: () => { G.declineCall(); ctx.audio?.stopRing(); render(); } }, 'Laisser sonner'))));
      } else if (!session) {
        call.append(h('div', { class: 'idle' }, typo(message || 'Choisissez un interlocuteur. Vous pouvez demander un point de situation, donner un ordre ou écouter une demande.')));
      } else {
        const tr = h('div', { class: 'transcript' });
        for (const l of session.lines) {
          const me = l.who === 'vous';
          tr.append(h('div', { class: `line${me ? ' me' : ''}` }, h('span', { class: 'spk' }, me ? 'Vous' : CONTACTS[l.who]?.name || l.who), typo(l.text)));
        }
        const ch = h('div', { class: 'choices' });
        const opts = session.options();
        if (session.ended && (!session.incoming || session.closed)) {
          tr.append(h('div', { class: 'line' }, h('span', { class: 'spk' }, '—'), 'Fin de l’appel.'));
          ch.append(h('button', { class: 'choice', 'data-autofocus': true, onclick: () => { session = null; ctx.onCall?.(false); ctx.audio?.hangup(); render(); } }, 'Reposer le combiné'));
        } else {
          for (const o of opts) {
            const tag = o.hint ? h('span', { class: `tag${o.hint === 'Illégal' ? ' bad' : o.hint === 'Légalité discutable' ? ' mid' : ''}` }, o.hint) : null;
            const isTag = o.hint === 'Légal' || o.hint === 'Illégal' || o.hint === 'Légalité discutable';
            ch.append(h('button', { class: 'choice', onclick: () => { session.choose(o); ctx.audio?.click(); render(); } }, isTag ? tag : null, typo(o.label), !isTag && o.hint ? h('small', {}, typo(o.hint)) : null));
          }
        }
        call.append(tr, ch);
        setTimeout(() => { tr.scrollTop = tr.scrollHeight; }, 0);
      }
      panel.append(h('div', { class: 'phone' }, list, call));
    };
    api.rerender = render;
    api.dismissable = false;
    render();
  }, () => { if (session && !session.ended) { /* raccrocher en fermant */ } ctx.onCall?.(false); ctx.onClose?.(); });
}

// ======================= DOSSIERS =======================
export function dossiersPanel(ctx) {
  const { G } = ctx;
  let selected = ctx.select || null;
  return openPanel('dossiers', (api, r) => {
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-label': 'Dossiers' });
    r.append(panel);
    const render = () => {
      const s = G.state;
      const all = G.visibleDossiers();
      if (!selected || !all.some((d) => d.uid === selected)) selected = (all.find((d) => !d.read && !d.archived) || all[0])?.uid;
      if (selected) G.readDossier(selected);
      const view = all.find((d) => d.uid === selected);
      panel.innerHTML = '';
      const unread = all.filter((d) => !d.read && !d.archived).length;
      panel.append(head('Dossiers', `${unread ? `${unread} non lu${unread > 1 ? 's' : ''} · ` : ''}Lire est gratuit. Agir sur un dossier prend du temps.`, () => closePanel()));
      const list = h('div', { class: 'dlist' });
      const today = all.filter((d) => d.day === s.day && !d.archived);
      const older = all.filter((d) => d.day !== s.day || d.archived);
      const item = (d) => h('button', { class: `ditem${d.uid === selected ? ' active' : ''}${!d.read ? ' unread' : ''}${d.urgent ? ' urgent' : ''}`, onclick: () => { selected = d.uid; ctx.audio?.paper(); render(); } },
        icon(KIND_ICON[d.kind]),
        h('div', {}, h('div', { class: 't' }, typo(d.title), d.mark ? h('span', { class: 'dmark' }, d.mark === 'fiable' ? 'fiable' : 'douteux') : null),
          h('div', { class: 's' }, `${KIND_LABEL[d.kind]} · ${d.day === s.day ? fmtHour(d.hour) : DAYS[d.day].split(' ')[0]}${d.urgent ? ' · urgent' : ''}`)));
      list.append(h('div', { class: 'dgroup' }, 'Aujourd’hui'), ...today.map(item));
      if (older.length) list.append(h('div', { class: 'dgroup' }, 'Archives'), ...older.map(item));
      const dv = h('div', { class: 'dview' });
      if (view) {
        const paper = h('article', { class: `paper k-${view.kind}` },
          view.stamp ? h('div', { class: 'stampbox' }, view.stamp) : null,
          h('div', { class: 'src' }, typo(view.source)),
          h('h3', {}, typo(view.title)),
          h('div', { class: 'meta' }, `${KIND_LABEL[view.kind]} · ${DAYS[view.day]}, ${fmtHour(view.hour)}${view.archived ? ' · version archivée' : ''}`));
        for (const para of view.body || []) {
          const m = /^(Fait|Échec|Incertain) :(.*)$/s.exec(para);
          paper.append(m ? h('p', {}, h('span', { class: 'lbl' }, m[1] + ' :'), typo(m[2])) : h('p', {}, typo(para)));
        }
        paper.append(h('div', { class: 'annot' }, 'Votre annotation :',
          h('button', { class: view.mark === 'fiable' ? 'on' : '', onclick: () => { G.markDossier(view.uid, 'fiable'); render(); } }, 'Source fiable'),
          h('button', { class: view.mark === 'douteux' ? 'on' : '', onclick: () => { G.markDossier(view.uid, 'douteux'); render(); } }, 'Source douteuse')));
        dv.append(paper);
        if (view.actions.length) {
          const acts = h('div', { class: 'dactions' }, h('h4', {}, view.done ? 'Décision prise' : 'Décision à prendre'));
          for (const a of view.actions) {
            if (view.done) { if (view.chosen === a.index) acts.append(h('div', { class: 'chosen' }, '✓ ', typo(a.label))); continue; }
            const cost = `${a.hours ?? 1} h${a.capital ? ` · ${a.capital} capital` : ''}`;
            acts.append(h('button', { class: 'choice', onclick: () => {
              const res = G.dossierAction(view.uid, a.index);
              if (!res.ok) ctx.toast(res.msg, 'alert'); else ctx.audio?.stamp();
              render();
            } }, h('span', { class: 'tag' }, cost), typo(a.label)));
          }
          dv.append(acts);
        }
      } else dv.append(h('div', { class: 'idle' }, 'Aucun dossier.'));
      panel.append(h('div', { class: 'dossiers' }, list, dv));
    };
    api.rerender = render;
    render();
  }, ctx.onClose);
}

// ======================= ORDINATEUR =======================
const COLW = 152, ROWH = 158, TOP = 96;
const branchIndex = (b) => TREE.branches.findIndex((x) => x.id === b);
const nodeX = (n) => n.col * COLW + branchIndex(n.branch) * 26 + 10;
const nodeY = (n) => TOP + n.row * ROWH;

export function computerPanel(ctx) {
  const { G } = ctx;
  let tab = ctx.tab || 'arbre';
  let sel = ctx.select || Object.keys(TREE.nodes).find((id) => G.nodeStatus(id) === 'disponible') || 'conseil_couronne';
  let scrollX = null;
  return openPanel('ordinateur', (api, r) => {
    const box = h('div', { class: 'computer', role: 'dialog', 'aria-label': 'Ordinateur' });
    r.append(box);
    const render = () => {
      const s = G.state;
      box.innerHTML = '';
      const os = h('div', { class: 'os' });
      const tabs = h('div', { class: 'os-tabs' }, ...[['arbre', 'Orientations'], ['indic', 'Indicateurs'], ['log', 'Dépêches']].map(([k, l]) => h('button', { class: `os-tab${tab === k ? ' on' : ''}`, onclick: () => { tab = k; ctx.audio?.key(); render(); } }, l)));
      os.append(h('div', { class: 'os-bar' }, h('b', {}, 'BELNET-S'), 'Réseau gouvernemental sécurisé', tabs, h('span', { style: { flex: 1 } }),
        `${DAYS[s.day]} · ${fmtHour(s.hour)} · capital ${s.capital} · ${Math.max(0, G.hoursLeft())} h`,
        h('button', { class: 'close', 'aria-label': 'Fermer', style: { width: '28px', height: '28px', fontSize: '16px' }, onclick: () => closePanel() }, '×')));
      if (tab === 'arbre') os.append(treeView());
      if (tab === 'indic') os.append(h('div', { class: 'os-body full' }, statsView()));
      if (tab === 'log') os.append(h('div', { class: 'os-body full' }, logView()));
      box.append(os);
    };
    function treeView() {
      const s = G.state;
      const body = h('div', { class: 'os-body' });
      const wrap = h('div', { class: 'tree-wrap' });
      const branchX = (b) => b.cols[0] * COLW + branchIndex(b.id) * 26;
      const nav = h('div', { class: 'tree-nav' }, 'Aller à :', ...TREE.branches.map((b) => h('button', { class: 'chip', style: { '--bc': b.color }, onclick: () => wrap.scrollTo({ left: branchX(b), behavior: 'smooth' }) }, b.title)), h('span', { class: 'hint' }, 'Glissez pour parcourir l’arbre.'));
      // Glisser pour faire défiler l'arbre.
      let dragX = null;
      wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.node')) return; dragX = e.clientX; wrap.setPointerCapture(e.pointerId); });
      wrap.addEventListener('pointermove', (e) => { if (dragX === null) return; wrap.scrollLeft -= e.clientX - dragX; dragX = e.clientX; });
      wrap.addEventListener('pointerup', () => { dragX = null; });
      wrap.addEventListener('scroll', () => { scrollX = wrap.scrollLeft; });
      setTimeout(() => { wrap.scrollLeft = scrollX ?? Math.max(0, nodeX(TREE.nodes[sel]) - 140); }, 0);
      const maxCol = 11, maxRow = 3;
      const W = nodeX({ col: maxCol, branch: 'compromis' }) + 142, H = nodeY({ row: maxRow }) + 110;
      const tree = h('div', { class: 'tree', style: { width: `${W}px`, height: `${H}px` } });
      // Liens (coudés, comme un organigramme).
      let paths = '';
      for (const n of Object.values(TREE.nodes)) {
        for (const req of n.requires || []) {
          const alts = Array.isArray(req) ? req : [req];
          for (const pid of alts) {
            const p = TREE.nodes[pid];
            const x1 = nodeX(p) + 66, y1 = nodeY(p) + 60, x2 = nodeX(n) + 66, y2 = nodeY(n) - 2;
            const my = (y1 + y2) / 2 + 14;
            const done = s.adopted.includes(pid);
            const col = TREE.branches.find((b) => b.id === n.branch).color;
            paths += `<path d="M${x1} ${y1} V${my} H${x2} V${y2}" stroke="${done ? col : 'rgba(121,194,224,0.28)'}" stroke-width="${done ? 2.4 : 1.6}" fill="none" ${Array.isArray(req) ? 'stroke-dasharray="5 5"' : ''}/>`;
          }
        }
      }
      tree.append(h('svg', { class: 'links', width: W, height: H, html: paths }));
      for (const b of TREE.branches) {
        const x0 = b.cols[0] * COLW + branchIndex(b.id) * 26 + 10, x1 = b.cols[1] * COLW + branchIndex(b.id) * 26 + 10 + 132;
        tree.append(h('div', { class: 'branch-head', style: { left: `${x0}px`, width: `${x1 - x0}px`, '--bc': b.color } }, h('div', { class: 'bt', style: { color: b.color } }, b.title), h('div', { class: 'bs' }, typo(b.subtitle))));
      }
      for (const n of Object.values(TREE.nodes)) {
        const st = G.nodeStatus(n.id);
        const b = TREE.branches.find((x) => x.id === n.branch);
        const lock = st === 'adopte' ? '✓' : st === 'exclu' ? '✕' : st === 'futur' ? 'plus tard' : st === 'verrouille' ? (n.minDay && s.day < n.minDay ? `jour ${n.minDay}` : '…') : `${n.cost}`;
        tree.append(h('button', { class: `node ${st}${sel === n.id ? ' sel' : ''}`, style: { left: `${nodeX(n)}px`, top: `${nodeY(n)}px`, '--bc': b.color }, onclick: () => { sel = n.id; ctx.audio?.key(); render(); }, 'aria-label': `${n.title} (${st})` },
          h('span', { class: 'lock' }, lock),
          h('span', { class: 'emb', html: svgIcon(n.icon) }),
          h('span', { class: 'nt' }, typo(n.title))));
      }
      wrap.append(tree);
      body.append(h('div', { class: 'tree-col' }, nav, wrap), sideView());
      return body;
    }
    function sideView() {
      const s = G.state;
      const n = TREE.nodes[sel];
      const b = TREE.branches.find((x) => x.id === n.branch);
      const st = G.nodeStatus(sel);
      const side = h('div', { class: 'side' });
      side.append(h('div', { class: 'k', style: { color: b.color } }, b.title), h('h3', {}, typo(n.title)), h('p', {}, typo(n.desc)));
      side.append(h('div', { class: 'k' }, 'Ce que l’on peut prévoir'), h('p', {}, typo(n.known)));
      if (!n.future) side.append(h('div', { class: 'cost' }, h('span', {}, `Capital ${n.cost}`), h('span', {}, `Temps ${n.hours} h`)));
      const reqs = (n.requires || []).map((r) => (Array.isArray(r) ? r.map((x) => TREE.nodes[x].title).join(' ou ') : TREE.nodes[r].title));
      if (reqs.length) side.append(h('div', { class: 'k' }, 'Nécessite'), h('p', {}, typo(reqs.join(' ; '))));
      const excl = [...(n.excludes || []), ...Object.values(TREE.nodes).filter((o) => (o.excludes || []).includes(sel)).map((o) => o.id)];
      if (excl.length) side.append(h('div', { class: 'k' }, 'Incompatible avec'), h('p', {}, typo([...new Set(excl)].map((x) => TREE.nodes[x].title).join(' ; '))));
      if (n.minDay && s.day < n.minDay) side.append(h('p', { class: 'warn' }, `Disponible à partir du ${DAYS[n.minDay].toLowerCase()}.`));
      if (st === 'adopte') side.append(h('p', { class: 'chosen' }, '✓ Orientation adoptée.'));
      else if (st === 'exclu') side.append(h('p', { class: 'warn' }, 'Exclue par une orientation déjà adoptée.'));
      else if (st === 'futur') side.append(h('p', { class: 'warn' }, 'Cette voie s’ouvrira après la crise (hors prototype).'));
      else if (st === 'disponible') {
        const enough = s.capital >= n.cost && G.hoursLeft() >= n.hours;
        side.append(h('button', { class: 'btn os-btn', disabled: enough ? null : true, onclick: () => {
          const res = G.adopt(sel);
          if (!res.ok) ctx.toast(res.msg, 'alert');
          else { ctx.audio?.stamp(); ctx.toast(`Orientation adoptée : ${n.title}`, 'good'); }
          render();
        } }, 'Adopter cette orientation'));
        if (!enough) side.append(h('p', { class: 'warn', style: { marginTop: '10px' } }, s.capital < n.cost ? `Capital insuffisant (${s.capital}/${n.cost}).` : 'Pas assez d’heures aujourd’hui.'));
      } else side.append(h('p', { class: 'warn' }, 'Conditions non remplies.'));
      return side;
    }
    function statsView() {
      const s = G.state;
      const grid = h('div', { class: 'statgrid' });
      const series = (k) => [...s.history.map((x) => x.stats[k]), s.stats[k]];
      for (const [k, def] of Object.entries(STATS)) {
        const ser = series(k);
        const pts = ser.map((v, i) => `${ser.length === 1 ? 50 : (i / (ser.length - 1)) * 100},${46 - (v / 100) * 42}`).join(' ');
        grid.append(h('div', { class: 'statcard' },
          h('div', { class: 'n' }, def.label),
          h('div', { class: 'v', style: { color: statColor(s.stats[k]) } }, `${s.stats[k]}`, h('span', { style: { fontSize: '13px', color: 'var(--screen-dim)' } }, ` / 100 · ${statWord(k, s.stats[k])}`)),
          h('svg', { viewBox: '0 0 100 46', preserveAspectRatio: 'none', html: `<polyline points="0,25 100,25" stroke="rgba(121,194,224,0.15)" stroke-dasharray="2 3" fill="none"/><polyline points="${pts}" stroke="${statColor(s.stats[k])}" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>` })));
      }
      const w = s.world;
      const q = (v) => (v > 55 ? 'forte' : v > 35 ? 'en hausse' : 'contenue');
      grid.append(h('div', { class: 'statcard' }, h('div', { class: 'n' }, 'Le pays'),
        h('div', { class: 'w' }, typo(`Courant : Flandre ${w.power.flandre} %, Bruxelles ${w.power.bruxelles} %, Wallonie ${w.power.wallonie} %.`)),
        h('div', { class: 'w' }, typo(`Décès liés au froid : ${w.victimes}.`)),
        h('div', { class: 'w' }, typo(`Agitation dans la rue : ${w.unrest > 60 ? 'forte' : w.unrest > 40 ? 'réelle' : 'limitée'}. Influence du Rempart : ${q(w.rempart)}. Tentation séparatiste : ${q(w.separatisme)}.`))));
      return grid;
    }
    function logView() {
      const s = G.state;
      const feed = h('div', { class: 'feed' });
      for (const e of [...s.log].reverse()) feed.append(h('div', { class: `row ${e.kind}` }, h('span', { class: 'h' }, `${DAYS[e.day].split(' ')[0]} ${fmtHour(e.hour)}`), h('span', { class: 'x' }, typo(e.text))));
      if (!s.log.length) feed.append(h('div', {}, 'Aucune dépêche.'));
      return feed;
    }
    api.rerender = render;
    render();
  }, ctx.onClose);
}

// ======================= CARTE =======================
export function mapPanel(ctx) {
  const { G } = ctx;
  return openPanel('carte', (api, r) => {
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-label': 'Carte de situation' });
    r.append(panel);
    const render = () => {
      const s = G.state;
      const ms = G.mapState();
      panel.innerHTML = '';
      panel.append(head('Carte de situation', 'Mise à jour par le Centre de crise à chaque nouvelle information.', () => closePanel()));
      const c = h('canvas', { class: 'mapcanvas', width: 2048, height: 1365, 'aria-label': 'Carte de la Belgique' });
      renderMap(c.getContext('2d'), 2048, 1365, ms);
      const reg = (name, key, power) => {
        const t = ms.regions[key].tension;
        return h('div', { class: 'region' }, h('b', {}, name), h('span', {}, `${power} % de courant`), h('span', { style: { gridColumn: '1 / -1' } }, `Tension : ${t > 70 ? 'très forte' : t > 50 ? 'forte' : t > 35 ? 'réelle' : 'faible'}`));
      };
      const legend = h('div', { class: 'legend' },
        h('h4', {}, 'Régions'),
        reg('Flandre', 'flandre', s.world.power.flandre),
        reg('Bruxelles-Capitale', 'bruxelles', s.world.power.bruxelles),
        reg('Wallonie', 'wallonie', s.world.power.wallonie),
        h('h4', {}, 'Repères'),
        h('p', { class: 'muted' }, typo(ms.markers.length ? `${ms.markers.length} repère${ms.markers.length > 1 ? 's' : ''} sur la carte : urgences (+), incidents (!), armée (A), police (P), brigades (V), centres chauffés (C).` : 'Aucun repère pour l’instant.')),
        ...ms.notes.map((n) => h('p', { style: { fontFamily: 'var(--f-hand)', fontSize: '20px', color: n.color || '#e0574d', margin: '4px 0' } }, n.text)),
        h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '14px' } }, 'Fond de carte : Natural Earth (domaine public).'));
      panel.append(h('div', { class: 'mapview' }, c, legend));
    };
    api.rerender = render;
    render();
  }, ctx.onClose);
}

// ======================= FIN DE JOURNÉE =======================
export function endDayPanel(ctx, sum) {
  return openPanel('fin', (api, r) => {
    api.dismissable = false;
    const panel = h('div', { class: 'panel endday', role: 'dialog', 'aria-label': 'Fin de journée' });
    r.append(panel);
    panel.append(head(`Fin de journée · ${sum.date}`, 'Le bureau se vide. Le pays, lui, ne dort pas.', () => ctx.onContinue()));
    const b = h('div', { class: 'bulletin panel-body' });
    b.append(h('div', { class: 'news' },
      h('div', { class: 'paper-name' }, sum.headline.paper, h('span', {}, sum.ending ? 'Édition spéciale' : `Édition de demain matin`)),
      h('div', { class: 'head' }, typo(sum.headline.title)),
      h('div', { class: 'subh' }, typo(sum.headline.sub))));
    const deltas = h('div', { class: 'deltas' });
    for (const [k, def] of Object.entries(STATS)) {
      const d = sum.after[k] - sum.before[k];
      deltas.append(h('span', {}, def.short), h('span', { class: 'muted', style: { fontSize: '12px' } }, statWord(k, sum.after[k])), h('span', { class: `d ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}` }, d > 0 ? `+${d}` : d < 0 ? `${d}` : '='));
    }
    const lg = sum.log.filter((e) => ['decision', 'order', 'alert'].includes(e.kind) || e.kind === 'call');
    b.append(h('div', { class: 'cols' },
      h('div', {}, h('h4', {}, 'Votre journée'), h('ul', {}, ...(lg.length ? lg : [{ text: 'Vous n’avez rien décidé aujourd’hui.' }]).slice(-12).map((e) => h('li', {}, typo(e.text))))),
      h('div', {}, h('h4', {}, 'Cette nuit'), h('ul', {}, ...sum.night.map((t) => h('li', {}, typo(t)))))));
    b.append(h('div', { class: 'cols', style: { marginTop: '20px' } },
      h('div', {}, h('h4', {}, 'Indicateurs'), deltas),
      h('div', {}, h('h4', {}, 'Ce qui reste incertain'), h('ul', {}, ...(sum.pending.length ? sum.pending : ['Rien d’annoncé. Ce qui n’est pas annoncé n’est pas forcément absent.']).map((t) => h('li', {}, typo(t)))))));
    b.append(h('div', { class: 'end-actions' }, h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => ctx.onContinue() }, sum.ending ? 'Jeudi, 18 h 52…' : 'Passer la nuit')));
    panel.append(b);
  });
}

export function epiloguePanel(ctx, e) {
  return openPanel('epilogue', (api, r) => {
    api.dismissable = false;
    const panel = h('div', { class: 'panel endday', role: 'dialog', 'aria-label': 'Épilogue' });
    r.append(panel);
    const b = h('div', { class: 'bulletin panel-body epi' });
    b.append(h('div', { class: 'eyebrow' }, 'Épilogue · fin du prototype'), h('h3', {}, typo(e.title)), h('div', { class: 'verdict' }, typo(e.verdict)));
    b.append(h('div', { class: 'path' }, e.pathName));
    e.paragraphs.forEach((p) => b.append(h('p', {}, typo(p))));
    b.append(h('div', { class: 'figs' }, ...e.figures.map(([n, v]) => h('div', { class: 'fig' }, h('div', { class: 'fv' }, v), h('div', { class: 'fn' }, n)))));
    b.append(h('div', { class: 'path' }, 'La panne'), h('p', {}, typo(e.truth)));
    b.append(h('div', { class: 'path' }, 'Ce qu’ils sont devenus'), h('ul', { style: { lineHeight: '1.6' } }, ...e.fates.map((f) => h('li', {}, typo(f)))));
    b.append(h('p', { class: 'muted', style: { fontStyle: 'italic', marginTop: '18px' } }, typo('Le mandat continue au-delà de cette crise. Ce prototype s’arrête ici.')));
    b.append(h('div', { class: 'end-actions' }, h('button', { class: 'btn', onclick: () => ctx.onLook() }, 'Regarder le bureau'), h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => ctx.onRestart() }, 'Rejouer')));
    panel.append(b);
  });
}

export function flavorPanel(ctx, title, text) {
  return openPanel('regard', (api, r) => {
    const panel = h('div', { class: 'panel flavor', role: 'dialog', 'aria-label': title });
    r.append(panel);
    panel.append(head(title, null, () => closePanel()), h('div', { class: 'panel-body' }, typo(text)));
  }, ctx.onClose);
}
