// Carte de situation de la Belgique : dessinée sur canevas, utilisée sur le mur et en vue rapprochée.
import GEO from '../data/geo.js';

const VIEW = { lon0: 1.45, lon1: 7.65, latC: 50.52 };
const COS = Math.cos((50.5 * Math.PI) / 180);

export const CITIES = {
  bruxelles: { name: 'Bruxelles', lon: 4.3517, lat: 50.8503, cap: true, west: true },
  anvers: { name: 'Anvers', lon: 4.4025, lat: 51.2194 },
  gand: { name: 'Gand', lon: 3.7174, lat: 51.0543 },
  bruges: { name: 'Bruges', lon: 3.2247, lat: 51.2093 },
  ostende: { name: 'Ostende', lon: 2.9196, lat: 51.2254 },
  courtrai: { name: 'Courtrai', lon: 3.2649, lat: 50.8279 },
  louvain: { name: 'Louvain', lon: 4.7005, lat: 50.8798 },
  malines: { name: 'Malines', lon: 4.4777, lat: 51.0259 },
  hasselt: { name: 'Hasselt', lon: 5.3378, lat: 50.9307 },
  liege: { name: 'Liège', lon: 5.5797, lat: 50.6326 },
  seraing: { name: 'Seraing', lon: 5.4994, lat: 50.5833, small: true },
  verviers: { name: 'Verviers', lon: 5.8667, lat: 50.5891, small: true },
  eupen: { name: 'Eupen', lon: 6.0353, lat: 50.6295, small: true },
  charleroi: { name: 'Charleroi', lon: 4.4446, lat: 50.4108 },
  courcelles: { name: 'Courcelles', lon: 4.3747, lat: 50.4636, small: true, west: true },
  namur: { name: 'Namur', lon: 4.8719, lat: 50.4674 },
  mons: { name: 'Mons', lon: 3.9523, lat: 50.4542 },
  tournai: { name: 'Tournai', lon: 3.3878, lat: 50.6056 },
  wavre: { name: 'Wavre', lon: 4.6111, lat: 50.7167, small: true },
  arlon: { name: 'Arlon', lon: 5.8167, lat: 49.6833 },
  bastogne: { name: 'Bastogne', lon: 5.7167, lat: 50.0, small: true },
};

// Communauté germanophone (contour approximatif, découpé par la frontière belge au rendu).
const DG = [[5.93, 50.78], [6.6, 50.78], [6.6, 50.1], [6.02, 50.1], [6.0, 50.25], [6.08, 50.36], [6.14, 50.44], [6.05, 50.5], [6.0, 50.58], [5.94, 50.66]];

const PAL = {
  bg: '#16130f', sea: '#10161a', seaLine: 'rgba(120,150,160,0.07)',
  land: '#221d17', landEdge: 'rgba(190,160,100,0.35)', brass: '#c9a45c', brassDim: 'rgba(201,164,92,0.55)',
  flandre: [128, 104, 52], wallonie: [122, 74, 48], bruxelles: [168, 138, 78], ink: '#e8dcc0', red: '#d0302a', blue: '#3a62c8',
};

export function project(lon, lat, W, H) {
  const k = W / ((VIEW.lon1 - VIEW.lon0) * COS);
  return [(lon - VIEW.lon0) * COS * k, H / 2 + (VIEW.latC - lat) * k];
}

function ringPath(ctx, ring, W, H) {
  ring.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat, W, H);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function provincePath(ctx, prov, W, H) {
  ctx.beginPath();
  for (const r of prov.rings) ringPath(ctx, r, W, H);
}

function belgiumPath(ctx, W, H) {
  ctx.beginPath();
  for (const p of GEO.provinces) for (const r of p.rings) ringPath(ctx, r, W, H);
}

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function hatch(ctx, W, H, color, spacing, width, angle = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let k = -H; k < W + H; k += spacing) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + H * angle, H);
  }
  ctx.stroke();
}

function pin(ctx, x, y, s, color, glyph) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = s * 0.6;
  ctx.shadowOffsetY = s * 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - s * 1.1, s * 0.75, Math.PI * 0.85, Math.PI * 2.15);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f4ead6';
  ctx.font = `700 ${Math.round(s * 0.85)}px "IBM Plex Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y - s * 1.12);
}

const MARKER_STYLE = {
  hopital: { color: '#b3202c', glyph: '+' },
  emeute: { color: '#e0662a', glyph: '!' },
  sabotage: { color: '#141414', glyph: '×' },
  armee: { color: '#556b3a', glyph: 'A' },
  police: { color: '#2d4f9a', glyph: 'P' },
  manif: { color: '#7a1f2b', glyph: 'M' },
  brigade: { color: '#2a2a2a', glyph: 'V' },
  chaleur: { color: '#b07a2a', glyph: 'C' },
  note: { color: '#a08850', glyph: '•' },
};

// mapState : { regions:{flandre:{tension,power}...}, power:{provinceId:0..100}, markers:[], notes:[], overlays:[], caption }
export function renderMap(ctx, W, H, ms = {}) {
  const s = W / 2048; // échelle de référence
  ctx.save();
  ctx.fillStyle = PAL.sea;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 1;
  hatch(ctx, W, H, PAL.seaLine, 14 * s, 1.2 * s, 0.25);
  ctx.restore();

  // Pays voisins.
  for (const n of GEO.neighbours) {
    if (n.code === 'BEL') continue;
    ctx.beginPath();
    for (const r of n.rings) ringPath(ctx, r, W, H);
    ctx.fillStyle = PAL.land;
    ctx.fill('evenodd');
    ctx.strokeStyle = PAL.landEdge;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,175,120,0.32)';
  ctx.textAlign = 'center';
  ctx.font = `600 ${Math.round(34 * s)}px "Cormorant Garamond", serif`;
  const lbl = (t, lon, lat) => { const [x, y] = project(lon, lat, W, H); spaced(ctx, t, x, y, 9 * s); };
  lbl('PAYS-BAS', 5.15, 51.55);
  lbl('FRANCE', 4.05, 49.42);
  lbl('ALLEMAGNE', 6.85, 50.95);
  lbl('LUXEMBOURG', 6.05, 49.8);
  ctx.font = `italic 500 ${Math.round(30 * s)}px "Cormorant Garamond", serif`;
  ctx.fillStyle = 'rgba(150,180,190,0.35)';
  lbl('Mer du Nord', 2.35, 51.47);

  // Provinces par région, teintées selon la tension.
  const regions = ms.regions || {};
  for (const p of GEO.provinces) {
    const reg = regions[p.region] || { tension: 30 };
    const base = PAL[p.region];
    const t = Math.min(1, Math.max(0, (reg.tension - 30) / 70));
    const c = [base[0] + (170 - base[0]) * t * 0.6, base[1] * (1 - t * 0.45), base[2] * (1 - t * 0.5)];
    provincePath(ctx, p, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(c, 0.92));
    g.addColorStop(1, rgba(c.map((x) => x * 0.8), 0.92));
    ctx.fillStyle = g;
    ctx.fill('evenodd');
  }

  // Coupures de courant : hachures sombres proportionnelles au manque de courant.
  const power = ms.power || {};
  for (const p of GEO.provinces) {
    const pw = power[p.id] ?? 100;
    if (pw >= 98) continue;
    ctx.save();
    provincePath(ctx, p, W, H);
    ctx.clip('evenodd');
    const dark = (100 - pw) / 100;
    ctx.fillStyle = `rgba(8,8,12,${0.15 + dark * 0.45})`;
    ctx.fillRect(0, 0, W, H);
    hatch(ctx, W, H, `rgba(0,0,0,${0.35 + dark * 0.4})`, (18 - dark * 8) * s, 3 * s);
    ctx.restore();
  }

  // Couvre-feu : liseré rouge hachuré.
  if (ms.curfew && ms.curfew.length) {
    for (const p of GEO.provinces) {
      if (!ms.curfew.includes(p.id)) continue;
      ctx.save();
      provincePath(ctx, p, W, H);
      ctx.clip('evenodd');
      hatch(ctx, W, H, 'rgba(190,30,30,0.35)', 26 * s, 2 * s, -1);
      ctx.restore();
    }
  }

  // Limites provinciales.
  ctx.strokeStyle = 'rgba(240,220,170,0.38)';
  ctx.lineWidth = 1.6 * s;
  for (const p of GEO.provinces) { provincePath(ctx, p, W, H); ctx.stroke(); }

  // Frontière linguistique (entre provinces flamandes et wallonnes) : on la souligne en traçant les régions.
  ctx.strokeStyle = PAL.brass;
  ctx.lineWidth = 3 * s;
  for (const reg of ['flandre', 'bruxelles']) {
    ctx.beginPath();
    for (const p of GEO.provinces) if (p.region === reg) for (const r of p.rings) ringPath(ctx, r, W, H);
    ctx.stroke();
  }
  // Frontière nationale.
  belgiumPath(ctx, W, H);
  ctx.strokeStyle = '#e2c27c';
  ctx.lineWidth = 4.5 * s;
  ctx.stroke();

  // Communauté germanophone : pointillés.
  ctx.save();
  belgiumPath(ctx, W, H);
  ctx.clip('evenodd');
  ctx.beginPath();
  DG.forEach(([lo, la], i) => { const [x, y] = project(lo, la, W, H); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath();
  ctx.setLineDash([6 * s, 6 * s]);
  ctx.strokeStyle = 'rgba(240,225,190,0.6)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Scission des réseaux : ligne rouge.
  if (ms.overlays?.includes('scission')) {
    ctx.save();
    ctx.setLineDash([22 * s, 12 * s]);
    ctx.strokeStyle = 'rgba(214,40,40,0.9)';
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    for (const p of GEO.provinces) if (p.region === 'flandre') for (const r of p.rings) ringPath(ctx, r, W, H);
    ctx.stroke();
    ctx.restore();
    note(ctx, project(3.0, 50.62, W, H), 'Réseaux scindés ?', s, '#c62a2a', -0.05);
  }

  // Noms de régions.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,240,205,0.5)';
  ctx.font = `600 ${Math.round((ms.overlays?.includes('confederal') ? 56 : 40) * s)}px "Cormorant Garamond", serif`;
  { const [x, y] = project(3.28, 50.99, W, H); spaced(ctx, 'FLANDRE', x, y, 12 * s); }
  { const [x, y] = project(5.15, 50.18, W, H); spaced(ctx, 'WALLONIE', x, y, 14 * s); }

  // Villes.
  for (const [id, c] of Object.entries(CITIES)) {
    const [x, y] = project(c.lon, c.lat, W, H);
    ctx.fillStyle = c.cap ? '#f6e3b0' : '#e8d6a8';
    ctx.strokeStyle = '#1a140e';
    ctx.lineWidth = 2 * s;
    if (c.cap) {
      star5(ctx, x, y, 13 * s);
    } else {
      ctx.beginPath(); ctx.arc(x, y, (c.small ? 4.5 : 6.5) * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (c.small && !ms.showSmall?.includes(id)) continue;
    ctx.font = `${c.cap ? 700 : 600} ${Math.round((c.cap ? 34 : c.small ? 22 : 27) * s)}px "Cormorant Garamond", serif`;
    ctx.textAlign = c.west ? 'right' : 'left';
    const tx = c.west ? x - 13 * s : x + 11 * s;
    ctx.lineWidth = 5 * s;
    ctx.strokeStyle = 'rgba(16,12,8,0.85)';
    ctx.strokeText(c.name, tx, y - 8 * s);
    ctx.fillStyle = '#f2e5c4';
    ctx.fillText(c.name, tx, y - 8 * s);
  }

  // Cellule interfédérale, centralisation : symboles autour de Bruxelles.
  const [bx, by] = project(CITIES.bruxelles.lon, CITIES.bruxelles.lat, W, H);
  if (ms.overlays?.includes('interfederal')) {
    ctx.strokeStyle = 'rgba(240,230,200,0.85)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(bx, by, 46 * s, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.4;
      ctx.fillStyle = ['#e6c66a', '#d0302a', '#2d4f9a', '#f0ead8'][k];
      ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 46 * s, by + Math.sin(a) * 46 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (ms.overlays?.includes('centralisation')) {
    ctx.strokeStyle = 'rgba(226,194,124,0.55)';
    ctx.lineWidth = 2 * s;
    for (const id of ['anvers', 'gand', 'liege', 'charleroi', 'namur', 'hasselt', 'mons', 'arlon', 'bruges']) {
      const [x, y] = project(CITIES[id].lon, CITIES[id].lat, W, H);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
    }
    crown(ctx, bx, by - 58 * s, 26 * s);
  }

  // Marqueurs d'événements.
  for (const m of ms.markers || []) {
    const st = MARKER_STYLE[m.type] || MARKER_STYLE.note;
    const [x, y] = project(m.lon, m.lat, W, H);
    pin(ctx, x + (m.dx || 0) * s, y + (m.dy || 0) * s, 22 * s, st.color, st.glyph);
  }

  // Notes manuscrites.
  for (const n of ms.notes || []) {
    note(ctx, project(n.lon, n.lat, W, H), n.text, s, n.color || '#c62a2a', n.rot || -0.04, n.dx, n.dy);
  }

  // Cartouche.
  ctx.save();
  ctx.translate(60 * s, H - 210 * s);
  ctx.fillStyle = 'rgba(14,12,9,0.78)';
  ctx.strokeStyle = PAL.brassDim;
  ctx.lineWidth = 2 * s;
  ctx.fillRect(0, 0, 560 * s, 150 * s);
  ctx.strokeRect(8 * s, 8 * s, 544 * s, 134 * s);
  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.brass;
  ctx.font = `700 ${Math.round(40 * s)}px "Cormorant Garamond", serif`;
  spacedLeft(ctx, 'ROYAUME DE BELGIQUE', 28 * s, 58 * s, 5 * s);
  ctx.fillStyle = 'rgba(232,220,192,0.8)';
  ctx.font = `italic 500 ${Math.round(27 * s)}px "Cormorant Garamond", serif`;
  ctx.fillText(ms.caption || 'Carte de situation — Centre de crise', 28 * s, 100 * s);
  ctx.font = `500 ${Math.round(20 * s)}px "IBM Plex Sans", sans-serif`;
  ctx.fillStyle = 'rgba(232,220,192,0.55)';
  ctx.fillText(ms.stamp || '', 28 * s, 128 * s);
  ctx.restore();

  // Légende.
  ctx.save();
  ctx.translate(W - 400 * s, H - 250 * s);
  ctx.fillStyle = 'rgba(14,12,9,0.78)';
  ctx.fillRect(0, 0, 360 * s, 210 * s);
  ctx.strokeStyle = PAL.brassDim;
  ctx.strokeRect(8 * s, 8 * s, 344 * s, 194 * s);
  ctx.font = `500 ${Math.round(21 * s)}px "IBM Plex Sans", sans-serif`;
  ctx.textAlign = 'left';
  const row = (i, draw, text) => {
    const y = (44 + i * 44) * s;
    draw(26 * s, y);
    ctx.fillStyle = 'rgba(232,220,192,0.85)';
    ctx.fillText(text, 70 * s, y + 7 * s);
  };
  row(0, (x, y) => { ctx.fillStyle = rgba(PAL.flandre, 1); ctx.fillRect(x, y - 9 * s, 30 * s, 18 * s); ctx.fillStyle = rgba(PAL.wallonie, 1); ctx.fillRect(x + 15 * s, y - 9 * s, 15 * s, 18 * s); }, 'Tension (teinte rouge)');
  row(1, (x, y) => { ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x, y - 9 * s, 30 * s, 18 * s); ctx.strokeStyle = '#555'; ctx.strokeRect(x, y - 9 * s, 30 * s, 18 * s); }, 'Coupure de courant');
  row(2, (x, y) => pin(ctx, x + 15 * s, y + 10 * s, 13 * s, '#b3202c', '+'), 'Urgence / incident');
  row(3, (x, y) => { ctx.setLineDash([5 * s, 5 * s]); ctx.strokeStyle = 'rgba(240,225,190,0.8)'; ctx.strokeRect(x, y - 9 * s, 30 * s, 18 * s); ctx.setLineDash([]); }, 'Germanophones');
  ctx.restore();
  ctx.restore();
}

function spaced(ctx, text, x, y, sp) {
  const w = [...text].reduce((a, ch) => a + ctx.measureText(ch).width + sp, -sp);
  ctx.textAlign = 'left';
  let cx = x - w / 2;
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
  ctx.textAlign = 'center';
}
function spacedLeft(ctx, text, x, y, sp) {
  let cx = x;
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
}
function star5(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function crown(ctx, x, y, r) {
  ctx.fillStyle = '#e2c27c';
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.5);
  ctx.lineTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.5, y + r * 0.15); ctx.lineTo(x, y - r * 0.6);
  ctx.lineTo(x + r * 0.5, y + r * 0.15); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x + r, y + r * 0.5);
  ctx.closePath();
  ctx.fill();
}
function note(ctx, [x, y], text, s, color, rot = -0.04, dx = 40, dy = -50) {
  ctx.save();
  ctx.translate(x + (dx ?? 40) * s, y + (dy ?? -50) * s);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(34 * s)}px "Caveat", cursive`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4 * s;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + ((dx ?? 40) - 4) * s, y + ((dy ?? -50) + 6) * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
