// Textures procédurales du bureau (aucune image externe) : bois, marbre, cuir, tapis, ville...
import * as THREE from 'three';
import { makeNoise, smooth, mix, clamp01, mulberry32 } from './noise.js';

const N = makeNoise(1831); // 1831 : l'année de la Constitution belge.

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(c, { srgb = true, repeat = [1, 1], aniso = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

// Remplit deux canevas (couleur + niveau de gris) pixel par pixel.
function paint(w, h, fn) {
  const col = canvas(w, h), gray = canvas(w, h);
  const cc = col.getContext('2d'), gc = gray.getContext('2d');
  const ci = cc.createImageData(w, h), gi = gc.createImageData(w, h);
  const cd = ci.data, gd = gi.data;
  const out = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      fn(x / w, v, out);
      const i = (y * w + x) * 4;
      cd[i] = out[0]; cd[i + 1] = out[1]; cd[i + 2] = out[2]; cd[i + 3] = 255;
      const g = out[3] * 255;
      gd[i] = g; gd[i + 1] = g; gd[i + 2] = g; gd[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0);
  gc.putImageData(gi, 0, 0);
  return { col, gray };
}

// Acajou verni : veinage dans le sens U.
export function woodMaps(size = 1024) {
  const dark = [34, 14, 7], mid = [74, 31, 15], light = [116, 52, 25];
  return paint(size, size, (u, v, o) => {
    const warp = N.fbm(u, v, 2, 3, 4);
    const band = v * 9 + warp * 2.4;
    const f = band - Math.floor(band);
    const ribbon = smooth(0.15, 0.5, f) * (1 - smooth(0.55, 0.95, f));
    const streak = N.fbm(u, v, 2, 96, 3);
    const fine = N.noise(u * 512, v * 48, 512, 48);
    let t = 0.5 * streak + 0.32 * ribbon + 0.18 * fine;
    const pore = N.noise(u * 900, v * 140, 900, 140) > 0.86 ? 0.55 : 1;
    t = clamp01(t);
    const a = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const c0 = t < 0.5 ? dark : mid, c1 = t < 0.5 ? mid : light;
    o[0] = mix(c0[0], c1[0], a) * pore;
    o[1] = mix(c0[1], c1[1], a) * pore;
    o[2] = mix(c0[2], c1[2], a) * pore;
    o[3] = clamp01(0.35 + t * 0.5 - (pore < 1 ? 0.2 : 0));
  });
}

// Marbre noir veiné d'or, 2 x 2 dalles par répétition, joints sombres.
export function marbleMaps(size = 1024) {
  return paint(size, size, (u, v, o) => {
    const cloud = N.fbm(u, v, 4, 4, 5);
    const turb = N.fbm(u + 0.37, v + 0.11, 3, 3, 5);
    const s1 = 1 - Math.abs(Math.sin((u * 2 + v * 3 + turb * 5.5) * Math.PI));
    const vein = Math.pow(s1, 34);
    const s2 = 1 - Math.abs(Math.sin((u * 5 - v * 2 + cloud * 7) * Math.PI));
    const vein2 = Math.pow(s2, 70);
    const tu = (u * 2) % 1, tv = (v * 2) % 1;
    const seam = tu < 0.0025 || tu > 0.9975 || tv < 0.0025 || tv > 0.9975;
    let r = mix(14, 34, cloud), g = mix(12, 29, cloud), b = mix(11, 26, cloud);
    r += vein * 150 + vein2 * 70;
    g += vein * 118 + vein2 * 66;
    b += vein * 74 + vein2 * 62;
    if (seam) { r = 6; g = 5; b = 5; }
    o[0] = r; o[1] = g; o[2] = b;
    o[3] = seam ? 0.9 : clamp01(0.07 + vein * 0.25 + (1 - cloud) * 0.08); // rugosité
  });
}

// Cuir brun ; tufted = capitonnage Chesterfield (losanges + boutons).
export function leatherMaps(size = 512, { tufted = false, cols = 6, rows = 4, tint = [1, 1, 1] } = {}) {
  return paint(size, size, (u, v, o) => {
    const n = N.fbm(u, v, 8, 8, 5);
    const crack = Math.abs(N.noise(u * 48, v * 48, 48, 48) - 0.5) * 2;
    const crease = 1 - smooth(0, 0.1, crack);
    let h = 0.55 + n * 0.25 - crease * 0.25;
    let shade = 1 - crease * 0.3;
    if (tufted) {
      const gx = u * cols, gy = v * rows;
      const a = gx + gy, b = gx - gy;
      const fa = a - Math.floor(a), fb = b - Math.floor(b);
      const pillow = Math.pow(Math.max(0, Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb)), 0.45);
      h = h * 0.25 + pillow * 0.75;
      shade *= 0.45 + 0.55 * pillow;
      const lineA = 1 - smooth(0, 0.035, Math.min(fa, 1 - fa));
      const lineB = 1 - smooth(0, 0.035, Math.min(fb, 1 - fb));
      shade *= 1 - 0.25 * Math.max(lineA, lineB) * (1 - pillow);
    }
    o[0] = mix(40, 96, n) * shade * tint[0];
    o[1] = mix(19, 48, n) * shade * tint[1];
    o[2] = mix(10, 26, n) * shade * tint[2];
    o[3] = clamp01(h);
  });
}

// Tapis persan sombre : bordures, champ à motifs, médaillon central.
export function rugTexture(W = 2048, H = 1536) {
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const R = mulberry32(42);
  const C = { field: '#3a120e', navy: '#151b2c', gold: '#a8814a', cream: '#c9b48a', red: '#6d2216', dark: '#1a0b08', rose: '#8a3a26' };
  ctx.fillStyle = C.field;
  ctx.fillRect(0, 0, W, H);

  const band = (inset, width, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(inset, inset, W - inset * 2, width);
    ctx.fillRect(inset, H - inset - width, W - inset * 2, width);
    ctx.fillRect(inset, inset, width, H - inset * 2);
    ctx.fillRect(W - inset - width, inset, width, H - inset * 2);
  };
  band(0, 150, C.navy);
  band(18, 6, C.gold);
  band(126, 6, C.gold);
  band(150, 40, C.red);
  band(190, 8, C.cream);
  band(198, 4, C.dark);

  // Motifs de bordure : losanges et rosettes le long du ruban bleu.
  const motif = (x, y, s, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.6, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.cream;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75, s * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  for (let x = 110; x < W - 100; x += 92) { motif(x, 72, 34, 0); motif(x, H - 72, 34, 0); }
  for (let y = 160; y < H - 140; y += 92) { motif(72, y, 34, Math.PI / 2); motif(W - 72, y, 34, Math.PI / 2); }

  // Champ : treillis de losanges.
  ctx.save();
  ctx.beginPath(); ctx.rect(202, 202, W - 404, H - 404); ctx.clip();
  ctx.strokeStyle = C.rose; ctx.lineWidth = 3; ctx.globalAlpha = 0.55;
  for (let k = -H; k < W + H; k += 120) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k, H); ctx.lineTo(k + H, 0); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let y = 262; y < H - 200; y += 120) {
    for (let x = 262 + ((y / 120) % 2) * 60; x < W - 200; x += 120) {
      ctx.fillStyle = R() < 0.5 ? C.gold : C.navy;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Écoinçons.
  const corner = (x, y, sx, sy) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.fillStyle = C.navy;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(380, 0);
    ctx.quadraticCurveTo(300, 220, 0, 300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
  };
  corner(202, 202, 1, 1); corner(W - 202, 202, -1, 1); corner(202, H - 202, 1, -1); corner(W - 202, H - 202, -1, -1);

  // Médaillon central en étoile.
  const star = (r1, r2, n, color, rot = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = i % 2 ? r2 : r1;
      ctx.lineTo(W / 2 + Math.cos(a) * r * 1.25, H / 2 + Math.sin(a) * r);
    }
    ctx.fill();
  };
  star(420, 330, 16, C.gold);
  star(400, 315, 16, C.navy);
  star(300, 250, 12, C.red, 0.13);
  star(240, 190, 12, C.cream, 0.13);
  star(225, 178, 12, C.field, 0.13);
  star(150, 110, 8, C.navy);
  star(70, 50, 8, C.gold, 0.2);
  ctx.restore();

  // Fibres et usure.
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const fiber = 0.82 + 0.3 * N.noise(x * 0.9, y * 0.25);
      const wear = 0.85 + 0.25 * N.fbm(x / W, y / H, 6, 5, 4);
      const k = fiber * wear;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Panorama urbain derrière les fenêtres. lit = part des fenêtres éclairées (0..1), phase : 0 jour .. 1 nuit.
const skyCanvas = canvas(2048, 1024);
export function drawSkyline({ lit = 1, phase = 1, police = 0 } = {}) {
  const W = skyCanvas.width, H = skyCanvas.height;
  const ctx = skyCanvas.getContext('2d');
  const R = mulberry32(1958);
  const lerpCol = (a, b, t) => a.map((x, i) => Math.round(mix(x, b[i], t)));
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const dayTop = [104, 118, 136], dayHor = [196, 202, 208];
  const nightTop = [5, 7, 14], nightHor = lit > 0.5 ? [52, 38, 40] : [16, 20, 32];
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  g.addColorStop(0, rgb(lerpCol(dayTop, nightTop, phase)));
  g.addColorStop(1, rgb(lerpCol(dayHor, nightHor, phase)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (phase > 0.6) {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(220,225,255,${0.2 + R() * 0.5 * (lit < 0.5 ? 1 : 0.4)})`;
      ctx.fillRect(R() * W, R() * H * 0.4, 1.5, 1.5);
    }
  }
  const layers = [
    { base: 0.62, hMin: 60, hMax: 260, wMin: 40, wMax: 120, col: [[120, 128, 140], [18, 20, 30]], win: 0.5 },
    { base: 0.72, hMin: 90, hMax: 420, wMin: 70, wMax: 180, col: [[92, 98, 108], [12, 14, 22]], win: 0.8 },
    { base: 0.86, hMin: 160, hMax: 560, wMin: 140, wMax: 300, col: [[70, 74, 80], [8, 9, 14]], win: 1 },
  ];
  for (const L of layers) {
    let x = -20;
    while (x < W) {
      const bw = L.wMin + R() * (L.wMax - L.wMin);
      const bh = L.hMin + R() * (L.hMax - L.hMin);
      const top = H * L.base - bh;
      ctx.fillStyle = rgb(lerpCol(L.col[0], L.col[1], phase));
      ctx.fillRect(x, top, bw, H - top);
      const cw = 10 * L.win + 4, chh = 14 * L.win + 5;
      for (let wy = top + 10; wy < H * L.base + 200; wy += chh + 6) {
        for (let wx = x + 7; wx < x + bw - cw; wx += cw + 7) {
          const on = R() < lit * 0.62;
          const hue = R();
          if (phase > 0.35 && on) {
            ctx.fillStyle = hue < 0.6 ? `rgba(255,214,150,${0.55 + 0.4 * phase})` : hue < 0.85 ? `rgba(255,236,200,${0.5 + 0.4 * phase})` : `rgba(190,215,255,${0.45 + 0.4 * phase})`;
          } else {
            ctx.fillStyle = phase < 0.5 ? 'rgba(70,82,96,0.55)' : 'rgba(10,12,18,0.7)';
          }
          ctx.fillRect(wx, wy, cw, chh);
        }
      }
      if (bh > 380 && phase > 0.5) {
        ctx.fillStyle = 'rgba(255,40,30,0.95)';
        ctx.beginPath(); ctx.arc(x + bw / 2, top - 4, 3, 0, Math.PI * 2); ctx.fill();
      }
      x += bw + R() * 14;
    }
  }
  if (police > 0) {
    const pg = ctx.createRadialGradient(W * 0.55, H * 0.95, 10, W * 0.55, H * 0.95, 500);
    pg.addColorStop(0, `rgba(60,90,255,${0.45 * police})`);
    pg.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, W, H);
  }
  return skyCanvas;
}
export const skylineTexture = toTexture(skyCanvas, { wrap: false, aniso: 4 });

// Globe : planisphère ancien à partir des contours mondiaux.
export function globeTexture(world) {
  const W = 1024, H = 512;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#25332f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(200,170,110,0.25)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { const x = (lon + 180) / 360 * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#b39463';
  ctx.strokeStyle = '#6e5634';
  for (const ring of world) {
    ctx.beginPath();
    for (let i = 0; i < ring.length; i += 2) {
      const x = (ring[i] / 10 + 180) / 360 * W, y = (90 - ring[i + 1] / 10) / 180 * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const img = ctx.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, k = 0.8 + 0.3 * N.fbm(x / W, y / H, 8, 4, 4);
    img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { wrap: false });
}

// Feuille de plante (alpha) pour les palmiers en pot.
export function leafTexture() {
  const c = canvas(256, 512);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#1f3a17'); g.addColorStop(0.5, '#4f7a2c'); g.addColorStop(1, '#1f3a17');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.bezierCurveTo(250, 120, 230, 380, 128, 512);
  ctx.bezierCurveTo(26, 380, 6, 120, 128, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,210,120,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 512); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,40,10,0.5)'; ctx.lineWidth = 1.5;
  for (let y = 40; y < 500; y += 22) {
    ctx.beginPath(); ctx.moveTo(128, y); ctx.lineTo(40, y + 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, y); ctx.lineTo(216, y + 50); ctx.stroke();
  }
  return toTexture(c, { wrap: false });
}

// Papier / chemises cartonnées.
export function paperTexture(color = [214, 196, 150], size = 256) {
  const { col } = paint(size, size, (u, v, o) => {
    const n = 0.88 + 0.14 * N.fbm(u, v, 16, 16, 4);
    o[0] = color[0] * n; o[1] = color[1] * n; o[2] = color[2] * n; o[3] = 0.5;
  });
  return toTexture(col);
}

// Plâtre du plafond.
export function plasterTexture() {
  const { col } = paint(256, 256, (u, v, o) => {
    const n = 0.9 + 0.1 * N.fbm(u, v, 12, 12, 4);
    o[0] = 196 * n; o[1] = 186 * n; o[2] = 168 * n; o[3] = 0.9;
  });
  return toTexture(col, { repeat: [4, 4] });
}

// Petite aide pour les textures dessinées (horloge, journal, plaque...).
export function drawn(w, h, draw, opts) {
  const c = canvas(w, h);
  draw(c.getContext('2d'), w, h);
  const t = toTexture(c, { wrap: false, ...opts });
  t.userData.canvas = c;
  t.userData.redraw = (fn) => { fn(c.getContext('2d'), w, h); t.needsUpdate = true; };
  return t;
}
