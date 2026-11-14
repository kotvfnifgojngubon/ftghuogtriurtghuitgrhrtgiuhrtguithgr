// Bruit de valeur 2D, raccordable (périodique), et générateur pseudo-aléatoire reproductible.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed = 1) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rand();

  const hash = (x, y) => vals[perm[(perm[x & 255] + y) & 255]];

  // Bruit lissé ; px/py = période en cellules (pour des textures qui se raccordent).
  function noise(x, y, px = 256, py = 256) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const x0 = ((ix % px) + px) % px, y0 = ((iy % py) + py) % py;
    const x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const a = hash(x0, y0), b = hash(x1, y0), c = hash(x0, y1), d = hash(x1, y1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  // Somme d'octaves ; u, v dans [0,1[ et fréquence entière => raccordable.
  function fbm(u, v, fu, fv, oct = 5) {
    let s = 0, amp = 0.5, norm = 0, mu = fu, mv = fv;
    for (let i = 0; i < oct; i++) {
      s += amp * noise(u * mu, v * mv, mu, mv);
      norm += amp;
      amp *= 0.5;
      mu *= 2;
      mv *= 2;
    }
    return s / norm;
  }

  return { noise, fbm, rand };
}

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;
