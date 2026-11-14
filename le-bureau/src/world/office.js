// Le décor raconte le mandat : piles de dossiers, tasses, drapeaux, lumière, ville, carte, journaux.
import * as THREE from 'three';
import { renderMap } from './mapboard.js';
import { drawSkyline, skylineTexture } from './textures.js';
import { DAYS } from '../game/engine.js';
import { TREE } from '../game/content/tree.js';

// Phase du jour en janvier à Bruxelles : 0 = plein jour, 1 = nuit.
export function dayPhase(hour) {
  if (hour < 8.6) return 0.75;
  if (hour < 10) return 0.75 - (hour - 8.6) * 0.45;
  if (hour < 15.5) return 0.1;
  if (hour < 17.2) return 0.1 + (hour - 15.5) * 0.5;
  return 1;
}

export function createOffice(stage) {
  const { room } = stage;
  const { dyn, lights: L } = room;
  let lastSky = '';
  let lastEnvKey = '';
  let mapDirty = true;
  const base = {
    panel: L.panel.intensity, deskSpot: L.deskSpot.intensity, mapSpot: L.mapSpot.intensity,
    shelf: L.shelfSpots[0].intensity, sofa: L.sofaSpot.intensity, panelEm: L.mats.panelLight.emissiveIntensity, glow: L.mats.glow.emissiveIntensity,
  };
  const fx = { ring: false, ringT: 0, generator: false, police: 0, flicker: 0 };

  function drawPaper(tex, hl, dateText) {
    tex.userData.redraw((ctx, w, h) => {
      ctx.fillStyle = '#e9e1cc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1a1612';
      ctx.textAlign = 'center';
      ctx.font = '700 64px "Cormorant Garamond", serif';
      ctx.fillText(hl.paper.toUpperCase(), w / 2, 78);
      ctx.fillRect(40, 96, w - 80, 4);
      ctx.font = '500 20px "IBM Plex Sans", sans-serif';
      ctx.fillText(dateText, w / 2, 126);
      ctx.fillRect(40, 138, w - 80, 1.5);
      ctx.font = '700 58px "Cormorant Garamond", serif';
      wrap(ctx, hl.title, w / 2, 210, w - 100, 60);
      ctx.fillStyle = '#4a4036';
      ctx.font = 'italic 500 28px "Cormorant Garamond", serif';
      wrap(ctx, hl.sub, w / 2, 360, w - 160, 32);
      ctx.fillStyle = '#2a2622';
      ctx.fillRect(60, 440, 420, 280);
      ctx.fillStyle = '#4a443c';
      for (let i = 0; i < 6; i++) ctx.fillRect(90 + i * 60, 600 - i * 18, 40, 120 + i * 18);
      ctx.fillStyle = 'rgba(40,34,28,0.55)';
      for (let col = 0; col < 2; col++) for (let y = 450; y < 730; y += 16) ctx.fillRect(520 + col * 250, y, 220 - (y % 48 === 0 ? 60 : 0), 6);
    });
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = t;
    }
    ctx.fillText(line, x, yy);
  }

  function drawScreen(G) {
    const s = G.state;
    const c = dyn.screen.canvas, ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e1c26'); g.addColorStop(1, '#060c10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#79c2e0'; ctx.font = '500 26px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText('BELNET-S · RÉSEAU GOUVERNEMENTAL', 34, 50);
    ctx.fillStyle = '#6f8b97'; ctx.font = '22px "IBM Plex Mono", monospace';
    ctx.fillText(`${DAYS[s.day]} · capital ${s.capital}`, 34, 86);
    ctx.strokeStyle = 'rgba(121,194,224,0.3)'; ctx.beginPath(); ctx.moveTo(34, 104); ctx.lineTo(W - 34, 104); ctx.stroke();
    // mini-arbre
    const nodes = Object.values(TREE.nodes);
    for (const n of nodes) {
      const st = G.nodeStatus(n.id);
      const x = 60 + n.col * 76 + ['couronne', 'rempart', 'regions', 'compromis'].indexOf(n.branch) * 10, y = 150 + n.row * 74;
      ctx.fillStyle = st === 'adopte' ? '#e8c987' : st === 'disponible' ? '#79c2e0' : 'rgba(121,194,224,0.18)';
      ctx.fillRect(x, y, 40, 40);
    }
    ctx.fillStyle = '#cfe3ea'; ctx.font = '20px "IBM Plex Mono", monospace';
    const last = s.log.slice(-3).reverse();
    last.forEach((e, i) => ctx.fillText((e.text.length > 70 ? e.text.slice(0, 68) + '…' : e.text), 34, 470 + i * 30));
    dyn.screen.tex.needsUpdate = true;
  }

  function apply(G, opts = {}) {
    const s = G.state;
    // Dossiers non lus sur le plateau, archives qui s'empilent jour après jour.
    const unread = G.unread();
    dyn.folders.forEach((f, i) => { f.visible = i < Math.min(16, unread + 1); });
    const archived = Math.min(dyn.archive.length, (s.day - 1) * 4 + Math.floor(s.dossiers.filter((d) => d.read).length / 3));
    dyn.archive.forEach((f, i) => { f.visible = i < archived; });
    const cups = Math.min(dyn.cups.length, s.day - 1 + (s.hour >= 14 ? 1 : 0) + (s.stats.stabilite < 30 ? 1 : 0));
    dyn.cups.forEach((c, i) => { c.visible = i < cups; });
    dyn.whisky.visible = s.stats.stabilite < 30 || (s.day >= 3 && s.hour >= 17);
    const a = (id) => s.adopted.includes(id);
    dyn.regionFlags.forEach((f) => { f.visible = a('regions_crise'); });
    dyn.royalStandard.visible = a('conseil_couronne') || s.world.couronne >= 45;
    dyn.tracts.visible = a('dialogue_rempart') || !!s.flags.pacte_rempart;
    dyn.accord.visible = a('cellule_interfederale');
    dyn.radio.visible = !!s.flags.armee || !!s.flags.patrouilles;

    // Carte murale.
    if (mapDirty || opts.map) {
      const c = dyn.map.canvas;
      renderMap(c.getContext('2d'), c.width, c.height, G.mapState());
      dyn.map.tex.needsUpdate = true;
      mapDirty = false;
    }
    // Journaux : celui du matin sur le bureau, celui de la veille sur la table basse.
    const hlToday = s.headlines?.[s.day] || { paper: 'Le Courrier de Bruxelles', title: 'Nuit noire sur la Belgique', sub: '1,9 million de foyers sans courant par −9 °C. Le gouvernement d’urgence face à sa première crise.' };
    const key = `${s.day}`;
    if (dyn.deskNews.userData.key !== key) {
      drawPaper(dyn.deskNews, hlToday, DAYS[s.day]);
      dyn.deskNews.userData.key = key;
      const prev = s.headlines?.[s.day - 1] || { paper: 'De Ochtendpost', title: 'Regering van de laatste kans', sub: 'Un général de 22 ans à la tête du pays : la Flandre s’interroge.' };
      drawPaper(dyn.tableNews, prev, s.day > 1 ? DAYS[s.day - 1] : 'Dimanche 12 janvier');
    }
    drawScreen(G);
    lighting(G);
  }

  function lighting(G) {
    const s = G.state;
    const ph = dayPhase(s.hour);
    const bxl = s.world.power.bruxelles;
    fx.generator = bxl < 60;
    fx.police = s.world.unrest > 58 || s.flags.patrouilles || s.flags.couvrefeu ? 1 : 0;
    // Ville : moins de fenêtres éclairées quand Bruxelles est dans le noir.
    const lit = Math.max(0.05, Math.min(1, (bxl - 15) / 85));
    const skyKey = `${ph.toFixed(2)}|${lit.toFixed(2)}|${fx.police}`;
    if (skyKey !== lastSky) {
      drawSkyline({ lit, phase: ph, police: fx.police * 0.6 });
      skylineTexture.needsUpdate = true;
      lastSky = skyKey;
    }
    // Lumière de la fenêtre.
    const day = 1 - ph;
    L.window.color.setRGB(0.55 + 0.33 * day, 0.62 + 0.3 * day, 0.85 + 0.12 * day);
    L.window.intensity = 0.45 + 2.6 * day;
    L.hemi.intensity = 0.12 + 0.35 * day;
    // Intérieur : groupe électrogène = plafonnier faible, ambiance plus chaude.
    const gen = fx.generator ? 0.45 : 1;
    const night = 0.75 + 0.25 * ph;
    L.panel.intensity = base.panel * gen * night;
    L.mats.panelLight.emissiveIntensity = base.panelEm * gen;
    L.mats.glow.emissiveIntensity = base.glow * (fx.generator ? 0.35 : 1);
    L.deskSpot.intensity = base.deskSpot * (fx.generator ? 0.7 : 1);
    L.shelfSpots.forEach((sp) => { sp.intensity = base.shelf * (fx.generator ? 0.5 : 1) * night; });
    L.sofaSpot.intensity = base.sofa * (fx.generator ? 0.4 : 1);
    L.mapSpot.intensity = base.mapSpot;
    stage.renderer.toneMappingExposure = 1.0 + 0.12 * ph;
    dyn.setBlinds(ph > 0.6 ? 1.15 : 0.7);
    const envKey = `${Math.round(ph * 4)}|${fx.generator}`;
    if (envKey !== lastEnvKey) { lastEnvKey = envKey; stage.rebuildEnv(); }
  }

  const _v = new THREE.Vector3();
  function tick(dt, t, G) {
    const s = G.state;
    // Horloge murale.
    const hr = s.hour + (t % 60) / 3600;
    dyn.clock.hour.rotation.z = -((hr % 12) / 12) * Math.PI * 2;
    dyn.clock.minute.rotation.z = -((hr % 1)) * Math.PI * 2;
    // Téléphone qui sonne.
    const ph = dyn.phone;
    if (fx.ring) {
      fx.ringT += dt;
      const on = fx.ringT % 1.2 < 0.75;
      ph.body.rotation.z = on ? Math.sin(t * 60) * 0.03 : 0;
      ph.handset.position.y = 0.14 + (on ? Math.abs(Math.sin(t * 45)) * 0.008 : 0);
      ph.light.intensity = on ? 1.6 : 0.3;
    } else {
      ph.body.rotation.z = 0;
      ph.handset.position.y = 0.14;
      ph.light.intensity = 0;
    }
    // Gyrophares derrière les stores.
    if (fx.police) {
      const k = Math.sin(t * 7) > 0.2 ? 1 : 0;
      L.police.color.setHex(Math.sin(t * 3.5) > 0 ? 0x3b5bff : 0xff2a2a);
      L.police.intensity = k * 9;
    } else L.police.intensity = 0;
    // Groupe électrogène : le plafonnier vacille parfois.
    if (fx.generator) {
      fx.flicker -= dt;
      if (fx.flicker < -2 - Math.random() * 6) fx.flicker = 0.25;
      const f = fx.flicker > 0 ? (Math.random() < 0.5 ? 0.2 : 1) : 1;
      L.panel.intensity = base.panel * 0.45 * f;
      L.mats.panelLight.emissiveIntensity = base.panelEm * 0.45 * f;
    }
    // Le globe tourne doucement s'il a été lancé.
    if (dyn.globe.userData.spin) {
      dyn.globe.rotation.y += dyn.globe.userData.spin * dt;
      dyn.globe.userData.spin *= Math.exp(-dt * 0.4);
      if (dyn.globe.userData.spin < 0.01) dyn.globe.userData.spin = 0;
    }
    void _v;
  }

  return {
    apply,
    tick,
    markMap() { mapDirty = true; },
    setRinging(v) { fx.ring = v; fx.ringT = 0; },
    spinGlobe() { dyn.globe.userData.spin = 4; },
  };
}
