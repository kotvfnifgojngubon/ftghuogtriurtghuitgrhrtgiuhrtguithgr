// Le bureau du chef du gouvernement : pièce, mobilier, éclairage. Tout est modélisé ici, en code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { mulberry32 } from './noise.js';

export const ROOM = { x0: -6, x1: 6, z0: -5, z1: 5, h: 3.8 };
export const SPOTS = {
  chair: { x: 0, z: -3.62, face: 0 },
  carte: { x: -0.95, z: -4.15, face: Math.PI },
  fenetre: { x: -5.1, z: -2.4, face: -Math.PI / 2 },
  journal: { x: -3.45, z: 0.75, face: -Math.PI / 2 },
  globe: { x: 4.0, z: 1.25, face: Math.PI / 2 + 0.6 },
  porte: { x: 5.15, z: 2.6, face: Math.PI / 2 },
  start: { x: -4.9, z: -2.4, face: -Math.PI / 2 },
};

// ---------- utilitaires de géométrie ----------
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function m4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export function boxGeo(w, h, d, unit = 0.9) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, (uv.getX(i) * dims[f][0]) / unit, (uv.getY(i) * dims[f][1]) / unit);
  }
  return g;
}
export function rboxGeo(w, h, d, r = 0.02, seg = 3, unit = 0.9) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.max(w, d)) / unit, (uv.getY(i) * h) / unit);
  return g;
}
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// Regroupe la géométrie statique par matériau pour limiter les appels de dessin.
class Batch {
  constructor() { this.groups = new Map(); this.base = new THREE.Matrix4(); }
  add(mat, geo, m, flags = 'cr') {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g === geo) g = geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    const mm = this.base.clone();
    if (m) mm.multiply(m);
    g.applyMatrix4(mm);
    const key = mat.uuid + flags;
    if (!this.groups.has(key)) this.groups.set(key, { mat, flags, list: [] });
    this.groups.get(key).list.push(g);
    return g;
  }
  box(mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, flags) { return this.add(mat, boxGeo(w, h, d), m4(x, y, z, rx, ry, rz), flags); }
  rbox(mat, w, h, d, r, x, y, z, rx = 0, ry = 0, rz = 0, flags) { return this.add(mat, rboxGeo(w, h, d, r), m4(x, y, z, rx, ry, rz), flags); }
  with(m, fn) {
    const prev = this.base;
    this.base = prev.clone().multiply(m);
    fn();
    this.base = prev;
  }
  build(parent) {
    for (const { mat, flags, list } of this.groups.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = flags.includes('c');
      mesh.receiveShadow = flags.includes('r');
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.groups.clear();
  }
}

// ---------- matériaux ----------
function materials() {
  const wood = TX.woodMaps(1024);
  const woodCol = TX.toTexture(wood.col);
  const woodBump = TX.toTexture(wood.gray, { srgb: false });
  const marble = TX.marbleMaps(1024);
  const marbleCol = TX.toTexture(marble.col, { repeat: [5, 10 / 2.4] });
  const marbleRough = TX.toTexture(marble.gray, { srgb: false, repeat: [5, 10 / 2.4] });
  const leather = TX.leatherMaps(512);
  const tuft = TX.leatherMaps(512, { tufted: true });
  const leatherCol = TX.toTexture(leather.col), leatherBump = TX.toTexture(leather.gray, { srgb: false });
  const tuftCol = TX.toTexture(tuft.col), tuftBump = TX.toTexture(tuft.gray, { srgb: false });
  const greenLeather = TX.leatherMaps(256, { tint: [0.45, 0.9, 0.55] });

  const M = {
    desk: new THREE.MeshPhysicalMaterial({ map: woodCol, bumpMap: woodBump, bumpScale: 2, roughness: 0.42, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
    panel: new THREE.MeshPhysicalMaterial({ map: woodCol, bumpMap: woodBump, bumpScale: 1.5, color: 0x9a8070, roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
    panelDark: new THREE.MeshStandardMaterial({ map: woodCol, color: 0x5a4438, roughness: 0.7 }),
    trim: new THREE.MeshPhysicalMaterial({ map: woodCol, color: 0x7a5e4e, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    floor: new THREE.MeshPhysicalMaterial({ map: marbleCol, roughnessMap: marbleRough, roughness: 1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    rug: new THREE.MeshStandardMaterial({ map: TX.toTexture(TX.rugTexture(), { wrap: false }), roughness: 0.96 }),
    ceiling: new THREE.MeshStandardMaterial({ map: TX.plasterTexture(), color: 0xb7aa96, roughness: 0.95 }),
    leather: new THREE.MeshPhysicalMaterial({ map: leatherCol, bumpMap: leatherBump, bumpScale: 1.2, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    tufted: new THREE.MeshPhysicalMaterial({ map: tuftCol, bumpMap: tuftBump, bumpScale: 6, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    inlay: new THREE.MeshStandardMaterial({ map: TX.toTexture(greenLeather.col), roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a253, metalness: 1, roughness: 0.28 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.2 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, metalness: 0.9, roughness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.4 }),
    blackGloss: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.7, roughness: 0.42 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe8dec6, roughness: 0.9 }),
    manila: new THREE.MeshStandardMaterial({ map: TX.paperTexture([206, 176, 118]), roughness: 0.85 }),
    folderRed: new THREE.MeshStandardMaterial({ map: TX.paperTexture([150, 40, 34]), roughness: 0.8 }),
    folderBlue: new THREE.MeshStandardMaterial({ map: TX.paperTexture([40, 62, 104]), roughness: 0.8 }),
    phone: new THREE.MeshPhysicalMaterial({ color: 0x9e0f18, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    shade: new THREE.MeshStandardMaterial({ color: 0xf2dcae, emissive: 0xffbd70, emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc98a, emissiveIntensity: 2.2 }),
    panelLight: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe9cc, emissiveIntensity: 1.05 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xaab8c4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0xe8eef2, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }),
    whisky: new THREE.MeshStandardMaterial({ color: 0x8a4a12, roughness: 0.1, transparent: true, opacity: 0.85 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ map: TX.leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }),
    slat: new THREE.MeshStandardMaterial({ color: 0x8e8372, roughness: 0.7 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.6 }),
    bookStrip: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffcf8a, emissiveIntensity: 1.6 }),
    cloth: new THREE.MeshPhysicalMaterial({ color: 0x1c1d22, roughness: 0.9, sheen: 1, sheenColor: 0x444444 }),
    olive: new THREE.MeshStandardMaterial({ color: 0x3d4128, roughness: 0.7 }),
  };
  return M;
}

// ---------- construction ----------
export function buildRoom(scene, geo) {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'bureau';
  scene.add(root);
  const S = new Batch();
  const colliders = [];
  const interact = {};
  const dyn = { anim: [] };
  const R = mulberry32(7);
  const col = (cx, cz, w, d) => colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  const mesh = (geom, mat, x = 0, y = 0, z = 0, cast = true) => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  // Sol, tapis, plafond
  {
    const fg = new THREE.PlaneGeometry(12, 10);
    S.add(M.floor, fg, m4(0, 0, 0, -Math.PI / 2), 'r');
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 5.1), M.rug);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.006, -1.55);
    rug.receiveShadow = true;
    add(rug);
    S.box(M.ceiling, 12, 0.05, 10, 0, ROOM.h + 0.02, 0, 0, 0, 0, 'r');
    // Caissons : poutres en bois sombre.
    for (const x of [-6, -4, -2, 0, 2, 4, 6]) S.box(M.panelDark, 0.22, 0.22, 10, x, ROOM.h - 0.1, 0, 0, 0, 0, 'r');
    for (const z of [-5, -3, -1, 1, 3, 5]) S.box(M.panelDark, 12, 0.2, 0.22, 0, ROOM.h - 0.1, z, 0, 0, 0, 'r');
    for (const x of [-5, -3, -1, 1, 3, 5]) for (const z of [-4, 0, 2, 4]) {
      if (z === 0 && Math.abs(x) < 2) continue;
      S.add(M.brass, new THREE.TorusGeometry(0.075, 0.012, 8, 24), m4(x, ROOM.h - 0.005, z, Math.PI / 2), '');
      S.add(M.glow, new THREE.CircleGeometry(0.068, 24), m4(x, ROOM.h - 0.008, z, Math.PI / 2), '');
    }
    // Grand panneau lumineux au-dessus du bureau (comme sur les références).
    S.box(M.trim, 2.7, 0.07, 1.5, 0, ROOM.h - 0.245, -2.0, 0, 0, 0, '');
    S.add(M.panelLight, new THREE.PlaneGeometry(2.5, 1.3), m4(0, ROOM.h - 0.282, -2.0, Math.PI / 2), '');
    for (const sx of [-1, 1]) S.add(M.brass, new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), m4(sx * 1.2, ROOM.h - 0.12, -2.0), '');
  }

  // ----- Murs lambrissés -----
  const H = ROOM.h;
  const wallDefs = [
    { name: 'back', m: m4(0, 0, -5, 0, 0), len: 12, openings: [], noBays: [[-6, -2.2], [2.2, 6]] },
    { name: 'front', m: m4(0, 0, 5, 0, Math.PI), len: 12, openings: [], noBays: [] },
    { name: 'left', m: m4(-6, 0, 0, 0, Math.PI / 2), len: 10, openings: [{ s0: 1.55, s1: 3.25, y0: 0.55, y1: 3.05 }, { s0: -3.25, s1: -1.55, y0: 0.55, y1: 3.05 }], noBays: [] },
    { name: 'right', m: m4(6, 0, 0, 0, -Math.PI / 2), len: 10, openings: [{ s0: 2.05, s1: 3.15, y0: 0, y1: 2.4, door: true }], noBays: [] },
  ];
  for (const W of wallDefs) {
    S.with(W.m, () => {
      const half = W.len / 2;
      const ops = [...W.openings].sort((a, b) => a.s0 - b.s0);
      // Surface du mur, découpée autour des ouvertures.
      let s = -half;
      for (const o of ops) {
        if (o.s0 > s) S.box(M.panel, o.s0 - s, H, 0.1, (s + o.s0) / 2, H / 2, -0.05, 0, 0, 0, 'r');
        if (o.y0 > 0) S.box(M.panel, o.s1 - o.s0, o.y0, 0.1, (o.s0 + o.s1) / 2, o.y0 / 2, -0.05, 0, 0, 0, 'r');
        S.box(M.panel, o.s1 - o.s0, H - o.y1, 0.1, (o.s0 + o.s1) / 2, (H + o.y1) / 2, -0.05, 0, 0, 0, 'r');
        s = o.s1;
      }
      if (s < half) S.box(M.panel, half - s, H, 0.1, (s + half) / 2, H / 2, -0.05, 0, 0, 0, 'r');

      // Segments pleins (hors ouvertures) pour les moulures.
      const segs = [];
      s = -half;
      for (const o of ops) { if (o.s0 > s) segs.push([s, o.s0]); s = o.s1; }
      if (s < half) segs.push([s, half]);
      for (const [a, b] of segs) {
        const L = b - a, c = (a + b) / 2;
        S.box(M.trim, L, 0.2, 0.035, c, 0.1, 0.0175, 0, 0, 0, 'r');
        S.box(M.trim, L, 0.16, 0.12, c, H - 0.26, 0.06, 0, 0, 0, 'r');
        S.box(M.trim, L, 0.06, 0.17, c, H - 0.16, 0.085, 0, 0, 0, 'r');
        S.box(M.trim, L, 0.08, 0.06, c, H - 0.4, 0.03, 0, 0, 0, 'r');
        const blocked = W.noBays.some(([x0, x1]) => a >= x0 - 0.01 && b <= x1 + 0.01);
        if (blocked) continue;
        const centerMap = W.name === 'back';
        if (!centerMap) S.box(M.trim, L, 0.06, 0.05, c, 1.0, 0.025, 0, 0, 0, 'r');
        const n = Math.max(1, Math.round(L / 1.25));
        const bw = L / n;
        for (let i = 0; i < n; i++) {
          const cx = a + bw * (i + 0.5);
          const frame = (w, h, y) => {
            const t = 0.045, d = 0.03;
            S.box(M.trim, w, t, d, cx, y + h / 2, d / 2, 0, 0, 0, 'r');
            S.box(M.trim, w, t, d, cx, y - h / 2, d / 2, 0, 0, 0, 'r');
            S.box(M.trim, t, h, d, cx - w / 2, y, d / 2, 0, 0, 0, 'r');
            S.box(M.trim, t, h, d, cx + w / 2, y, d / 2, 0, 0, 0, 'r');
          };
          frame(bw - 0.24, 0.55, 0.58);
          if (!centerMap) frame(bw - 0.24, 2.0, 2.2);
        }
      }

      // Fenêtres : embrasure, croisillons, vitre, appui.
      for (const o of ops) {
        const cx = (o.s0 + o.s1) / 2, w = o.s1 - o.s0, h = o.y1 - o.y0, cy = (o.y0 + o.y1) / 2;
        if (o.door) {
          S.box(M.trim, 0.12, h + 0.12, 0.06, o.s0 - 0.06, cy + 0.06, 0.03);
          S.box(M.trim, 0.12, h + 0.12, 0.06, o.s1 + 0.06, cy + 0.06, 0.03);
          S.box(M.trim, w + 0.36, 0.14, 0.07, cx, o.y1 + 0.07, 0.035);
          S.box(M.panelDark, w, h, 0.05, cx, cy, -0.08);
          continue;
        }
        S.box(M.trim, 0.1, h, 0.32, o.s0 + 0.05, cy, -0.12);
        S.box(M.trim, 0.1, h, 0.32, o.s1 - 0.05, cy, -0.12);
        S.box(M.trim, w, 0.1, 0.32, cx, o.y1 - 0.05, -0.12);
        S.box(M.trim, w + 0.24, 0.06, 0.44, cx, o.y0 - 0.03, -0.04);
        S.box(M.trim, 0.06, h, 0.06, cx, cy, -0.2);
        S.box(M.trim, w, 0.06, 0.06, cx, o.y0 + h * 0.68, -0.2);
        S.box(M.trim, w - 0.04, 0.05, 0.06, cx, o.y0 + 0.05, -0.2);
        S.add(M.glass, new THREE.PlaneGeometry(w - 0.1, h - 0.1), m4(cx, cy, -0.22), '');
        // Habillage autour de l'ouverture.
        S.box(M.trim, 0.1, h + 0.16, 0.05, o.s0 - 0.05, cy, 0.025);
        S.box(M.trim, 0.1, h + 0.16, 0.05, o.s1 + 0.05, cy, 0.025);
        S.box(M.trim, w + 0.3, 0.12, 0.05, cx, o.y1 + 0.06, 0.025);
      }
    });
  }

  // ----- Ville à l'extérieur + stores vénitiens -----
  {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: TX.skylineTexture }));
    sky.position.set(-11, 1.2, 0);
    sky.rotation.y = Math.PI / 2;
    add(sky);
    dyn.sky = sky;
    const count = 2 * 52;
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.004, 0.05), M.slat, count);
    slats.castShadow = true;
    slats.receiveShadow = true;
    dyn.blinds = slats;
    const windows = [-2.4, 2.4];
    // Les lames sont orientées le long de z (largeur de la fenêtre) ; tilt = inclinaison.
    dyn.setBlinds = (tilt, open = 1) => {
      let i = 0;
      for (const wz of windows) {
        for (let k = 0; k < 52; k++) {
          const y = 3.0 - k * 0.047 * (0.55 + 0.45 * open);
          const mm = new THREE.Matrix4().compose(new THREE.Vector3(-5.95, y, wz), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, Math.PI / 2, 0, 'YXZ')), new THREE.Vector3(1.6, 1, 1));
          slats.setMatrixAt(i++, mm);
        }
      }
      slats.instanceMatrix.needsUpdate = true;
    };
    dyn.setBlinds(0.85);
    add(slats);
    for (const wz of windows) {
      S.box(M.trim, 0.1, 0.08, 1.66, -5.94, 3.04, wz);
      S.add(M.slat, new THREE.CylinderGeometry(0.004, 0.004, 2.3, 4), m4(-5.9, 1.9, wz + 0.7), '');
    }
  }

  // ----- Bibliothèques encastrées (mur du fond) -----
  const books = [];
  const bands = [];
  const bookColors = [0x5a1a14, 0x2c3b2a, 0x1f2a3d, 0x3d2a1a, 0x6b4a2a, 0x222226, 0x4a1f2a, 0x7a5a3a, 0x1d3330, 0x8a6a40, 0x2a2f4a];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -5.78 : 2.22, x1 = side < 0 ? -2.22 : 5.78;
    const bays = 3, bw = (x1 - x0) / bays;
    const zb = -5;
    S.box(M.panelDark, x1 - x0, 3.35, 0.02, (x0 + x1) / 2, 1.675, zb + 0.01, 0, 0, 0, 'r');
    for (let i = 0; i <= bays; i++) S.box(M.trim, 0.06, 3.35, 0.48, x0 + i * bw, 1.675, zb + 0.24);
    S.box(M.trim, x1 - x0 + 0.1, 0.08, 0.52, (x0 + x1) / 2, 3.39, zb + 0.26);
    S.box(M.trim, x1 - x0 + 0.16, 0.06, 0.58, (x0 + x1) / 2, 3.45, zb + 0.29);
    // Meuble bas à portes.
    S.box(M.panel, x1 - x0, 0.9, 0.5, (x0 + x1) / 2, 0.45, zb + 0.25, 0, 0, 0, 'cr');
    S.box(M.desk, x1 - x0 + 0.06, 0.045, 0.56, (x0 + x1) / 2, 0.925, zb + 0.28);
    for (let i = 0; i < bays * 2; i++) {
      const dw = bw / 2, cx = x0 + dw * (i + 0.5);
      const t = 0.035, d = 0.02, w = dw - 0.12, h = 0.66, y = 0.47, z = zb + 0.5 + d / 2;
      S.box(M.trim, w, t, d, cx, y + h / 2, z); S.box(M.trim, w, t, d, cx, y - h / 2, z);
      S.box(M.trim, t, h, d, cx - w / 2, y, z); S.box(M.trim, t, h, d, cx + w / 2, y, z);
      S.add(M.brass, new THREE.SphereGeometry(0.018, 12, 8), m4(cx + (i % 2 ? -1 : 1) * (dw / 2 - 0.08), 0.5, zb + 0.53), '');
    }
    const levels = [0.95, 1.47, 1.97, 2.47, 2.97];
    for (let li = 1; li < levels.length; li++) S.box(M.trim, x1 - x0, 0.035, 0.4, (x0 + x1) / 2, levels[li] - 0.0175, zb + 0.22);
    // Bandeaux lumineux sous la corniche.
    S.box(M.bookStrip, x1 - x0 - 0.1, 0.012, 0.02, (x0 + x1) / 2, 3.33, zb + 0.4, 0, 0, 0, '');
    for (let b = 0; b < bays; b++) {
      for (let li = 0; li < levels.length - 1; li++) {
        const y0 = levels[li], bx0 = x0 + b * bw + 0.05, bx1 = x0 + (b + 1) * bw - 0.05;
        const roll = R();
        if (roll < 0.22) {
          // Trophées et objets.
          const cx = (bx0 + bx1) / 2;
          S.add(M.gold, lathe([[0.0, 0], [0.07, 0], [0.07, 0.02], [0.02, 0.04], [0.015, 0.12], [0.07, 0.17], [0.09, 0.27], [0.085, 0.28], [0.0, 0.2]]), m4(cx - 0.15, y0, zb + 0.24), 'c');
          S.add(M.bronze, lathe([[0, 0], [0.05, 0], [0.05, 0.03], [0.03, 0.05], [0.04, 0.16], [0.025, 0.24], [0.035, 0.29], [0, 0.31]]), m4(cx + 0.18, y0, zb + 0.24), 'c');
          S.box(M.black, 0.18, 0.025, 0.12, cx + 0.18, y0 + 0.0125, zb + 0.24);
          continue;
        }
        const binders = roll < 0.4;
        let x = bx0 + (roll > 0.85 ? 0.25 : 0);
        while (x < bx1 - 0.03) {
          const w = binders ? 0.07 : 0.025 + R() * 0.045;
          if (x + w > bx1) break;
          const h = binders ? 0.32 : 0.2 + R() * 0.14;
          const d = binders ? 0.28 : 0.17 + R() * 0.08;
          const lean = x + w > bx1 - 0.06 && R() < 0.3 ? 0.12 : 0;
          const c = binders ? (R() < 0.5 ? 0x15161a : 0x1d2a44) : bookColors[Math.floor(R() * bookColors.length)];
          books.push({ x: x + w / 2, y: y0 + h / 2, z: zb + 0.06 + d / 2 + (0.36 - d) * 0.6, w, h, d, c, lean });
          if (!binders && R() < 0.65) bands.push({ x: x + w / 2, y: y0 + h * 0.82, z: zb + 0.06 + d + (0.36 - d) * 0.6 + 0.001, w: w * 0.98, lean });
          if (!binders && R() < 0.4) bands.push({ x: x + w / 2, y: y0 + h * 0.18, z: zb + 0.06 + d + (0.36 - d) * 0.6 + 0.001, w: w * 0.98, lean });
          x += w + (R() < 0.08 ? 0.03 : 0.002);
        }
      }
    }
    col((x0 + x1) / 2, -4.72, x1 - x0, 0.56);
  }
  {
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), books.length);
    const c = new THREE.Color();
    books.forEach((b, i) => {
      bm.setMatrixAt(i, m4(b.x, b.y, b.z, 0, 0, b.lean, b.w, b.h, b.d));
      bm.setColorAt(i, c.setHex(b.c).offsetHSL(0, 0, (R() - 0.5) * 0.06));
    });
    bm.castShadow = true;
    bm.receiveShadow = true;
    add(bm);
    const gm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 0.004), M.gold, bands.length);
    bands.forEach((b, i) => gm.setMatrixAt(i, m4(b.x, b.y, b.z, 0, 0, b.lean, b.w, 1, 1)));
    add(gm);
  }

  // ----- Carte de Belgique encadrée -----
  {
    const mapCanvas = TX.canvas(2048, 1365);
    const mapTex = TX.toTexture(mapCanvas, { wrap: false, aniso: 8 });
    const mat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.75, emissive: 0xffffff, emissiveMap: mapTex, emissiveIntensity: 0.06 });
    const W = 3.6, Hm = 2.4, y = 2.2, z = -4.94;
    const plane = mesh(new THREE.PlaneGeometry(W, Hm), mat, 0, y, z, false);
    add(plane);
    S.box(M.black, W + 0.08, Hm + 0.08, 0.03, 0, y, z - 0.02, 0, 0, 0, 'r');
    const fw = 0.09;
    S.rbox(M.gold, W + fw * 2, fw, 0.07, 0.01, 0, y + Hm / 2 + fw / 2, z + 0.01);
    S.rbox(M.gold, W + fw * 2, fw, 0.07, 0.01, 0, y - Hm / 2 - fw / 2, z + 0.01);
    S.rbox(M.gold, fw, Hm, 0.07, 0.01, -W / 2 - fw / 2, y, z + 0.01);
    S.rbox(M.gold, fw, Hm, 0.07, 0.01, W / 2 + fw / 2, y, z + 0.01);
    // Rampes d'éclairage de tableau.
    for (const x of [-1, 1]) {
      S.add(M.brass, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 16), m4(x * 0.85, y + Hm / 2 + 0.28, z + 0.22, 0, 0, Math.PI / 2), '');
      S.add(M.brass, new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), m4(x * 0.85, y + Hm / 2 + 0.2, z + 0.1, Math.PI / 3), '');
      S.box(M.glow, 1.1, 0.008, 0.02, x * 0.85, y + Hm / 2 + 0.255, z + 0.22, 0, 0, 0, '');
    }
    dyn.map = { canvas: mapCanvas, tex: mapTex, mesh: plane };
    interact.carte = { objects: [plane], label: 'Examiner la carte', spot: 'carte' };
  }

  // ----- Bureau en acajou -----
  const desk = new THREE.Group();
  desk.position.set(0, 0, -2.7);
  add(desk);
  S.with(m4(0, 0, -2.7), () => {
    S.rbox(M.desk, 2.5, 0.06, 1.15, 0.02, 0, 0.75, 0);
    S.box(M.gold, 2.52, 0.012, 0.012, 0, 0.73, 0.58);
    S.box(M.gold, 2.52, 0.012, 0.012, 0, 0.73, -0.58);
    S.add(M.inlay, new THREE.PlaneGeometry(1.3, 0.62), m4(0, 0.781, -0.12, -Math.PI / 2), 'r');
    S.box(M.trim, 2.3, 0.08, 1.0, 0, 0.68, 0);
    for (const sx of [-1, 1]) {
      const px = sx * 0.9;
      S.box(M.desk, 0.66, 0.64, 1.08, px, 0.37, 0);
      S.box(M.trim, 0.72, 0.06, 1.14, px, 0.03, 0);
      for (let d = 0; d < 3; d++) {
        const dy = 0.16 + d * 0.19;
        S.box(M.desk, 0.58, 0.17, 0.02, px, dy, -0.545);
        S.box(M.brass, 0.12, 0.018, 0.025, px, dy, -0.565);
      }
      // Face avant : panneaux en relief, liserés dorés.
      const fz = 0.545;
      S.box(M.trim, 0.5, 0.48, 0.025, px, 0.37, fz);
      S.box(M.gold, 0.44, 0.008, 0.01, px, 0.6, fz + 0.015);
      S.box(M.gold, 0.44, 0.008, 0.01, px, 0.14, fz + 0.015);
      S.box(M.gold, 0.008, 0.46, 0.01, px - 0.22, 0.37, fz + 0.015);
      S.box(M.gold, 0.008, 0.46, 0.01, px + 0.22, 0.37, fz + 0.015);
      for (const ex of [-0.32, 0.32]) S.add(M.desk, new THREE.CylinderGeometry(0.03, 0.03, 0.64, 16), m4(px + ex, 0.37, fz + 0.01));
    }
    S.box(M.desk, 1.2, 0.56, 0.04, 0, 0.42, 0.5);
    S.box(M.trim, 1.0, 0.4, 0.02, 0, 0.42, 0.525);
    S.box(M.gold, 0.9, 0.008, 0.01, 0, 0.6, 0.537);
    S.box(M.gold, 0.9, 0.008, 0.01, 0, 0.24, 0.537);
  });
  col(0, -2.7, 2.6, 1.2);

  // ----- Fauteuil présidentiel -----
  const chair = new THREE.Group();
  chair.position.set(SPOTS.chair.x, 0, -3.62);
  add(chair);
  {
    const g = new Batch();
    g.rbox(M.tufted, 0.64, 0.13, 0.58, 0.05, 0, 0.5, 0.02);
    g.with(m4(0, 0.58, -0.27, -0.12), () => {
      g.rbox(M.tufted, 0.66, 0.86, 0.14, 0.05, 0, 0.45, 0);
      g.add(M.leather, new THREE.CylinderGeometry(0.075, 0.075, 0.7, 20), m4(0, 0.9, 0.02, 0, 0, Math.PI / 2));
    });
    for (const sx of [-1, 1]) {
      g.rbox(M.leather, 0.1, 0.07, 0.48, 0.03, sx * 0.36, 0.72, 0.02);
      g.box(M.black, 0.04, 0.16, 0.06, sx * 0.36, 0.62, 0.12);
      g.box(M.black, 0.04, 0.16, 0.06, sx * 0.36, 0.62, -0.12);
    }
    g.add(M.chrome, new THREE.CylinderGeometry(0.035, 0.035, 0.32, 16), m4(0, 0.28, 0));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.box(M.black, 0.34, 0.04, 0.05, Math.cos(a) * 0.17, 0.08, Math.sin(a) * 0.17, 0, -a);
      g.add(M.black, new THREE.SphereGeometry(0.03, 10, 8), m4(Math.cos(a) * 0.33, 0.03, Math.sin(a) * 0.33));
    }
    g.build(chair);
  }

  // ----- Fauteuils club et canapé Chesterfield -----
  const chesterfield = (L, D, seatH, backH, armH, arms = true) => {
    S.box(M.leather, L - 0.08, 0.26, D - 0.1, 0, 0.22, 0.02);
    S.box(M.trim, L, 0.06, D, 0, 0.06, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.add(M.trim, new THREE.SphereGeometry(0.04, 12, 8), m4(sx * (L / 2 - 0.06), 0.03, sz * (D / 2 - 0.06)));
    const n = Math.max(1, Math.round((L - 0.5) / 0.62));
    const cw = (L - 0.44) / n;
    for (let i = 0; i < n; i++) S.rbox(M.leather, cw - 0.02, 0.14, D - 0.32, 0.05, -L / 2 + 0.22 + cw * (i + 0.5), seatH, 0.1);
    S.rbox(M.tufted, L, backH - 0.3, 0.22, 0.06, 0, 0.3 + (backH - 0.3) / 2, -D / 2 + 0.11);
    S.add(M.leather, new THREE.CylinderGeometry(0.06, 0.06, L, 20), m4(0, backH, -D / 2 + 0.12, 0, 0, Math.PI / 2));
    if (arms) for (const sx of [-1, 1]) {
      S.rbox(M.tufted, 0.2, armH - 0.12, D, 0.05, sx * (L / 2 - 0.1), 0.12 + (armH - 0.12) / 2, 0);
      S.add(M.leather, new THREE.CylinderGeometry(0.11, 0.11, D, 20), m4(sx * (L / 2 - 0.1), armH, 0.0, Math.PI / 2));
      S.add(M.leather, new THREE.CircleGeometry(0.11, 20), m4(sx * (L / 2 - 0.1), armH, D / 2 + 0.001), '');
    }
  };
  S.with(m4(-5.35, 0, 0, 0, Math.PI / 2), () => chesterfield(2.2, 0.95, 0.45, 0.8, 0.68));
  col(-5.35, 0, 1.0, 2.25);
  for (const sx of [-1, 1]) {
    S.with(m4(sx * 0.82, 0, -1.3, 0, Math.PI + sx * 0.18), () => chesterfield(0.9, 0.85, 0.44, 0.86, 0.66));
    col(sx * 0.82, -1.3, 0.95, 0.9);
  }

  // Table basse et journaux
  {
    S.rbox(M.desk, 0.7, 0.05, 1.25, 0.02, -4.15, 0.44, 0);
    S.box(M.trim, 0.6, 0.04, 1.15, -4.15, 0.12, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.add(M.desk, new THREE.CylinderGeometry(0.025, 0.02, 0.42, 12), m4(-4.15 + sx * 0.3, 0.21, sz * 0.56));
    col(-4.15, 0, 0.75, 1.3);
    const papers = TX.drawn(1024, 768, () => {});
    const nmat = new THREE.MeshStandardMaterial({ map: papers, roughness: 0.9 });
    const news = mesh(new THREE.PlaneGeometry(0.5, 0.375), nmat, -4.15, 0.468, 0.1, false);
    news.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + 0.15);
    add(news);
    const news2 = mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), M.paper, -4.18, 0.47, -0.32);
    news2.rotation.y = 0.4;
    add(news2);
    dyn.tableNews = papers;
    interact.journal = { objects: [news, news2], label: 'Lire la presse du jour', spot: 'journal' };
    // Carafe et verres.
    S.add(M.crystal, lathe([[0, 0], [0.07, 0], [0.08, 0.05], [0.08, 0.16], [0.03, 0.22], [0.025, 0.28], [0, 0.28]]), m4(-4.05, 0.465, 0.42), '');
    S.add(M.whisky, lathe([[0, 0], [0.065, 0], [0.072, 0.05], [0.072, 0.1], [0, 0.1]]), m4(-4.05, 0.47, 0.42), '');
  }

  // Lampadaire et lampe de table près du canapé
  const lamp = (x, y, z, h, shadeR, light = true, intensity = 3.2) => {
    S.add(M.brass, lathe([[0, 0], [0.09, 0], [0.09, 0.02], [0.03, 0.04], [0.015, 0.06], [0.015, h - 0.06], [0.03, h - 0.04], [0, h - 0.02]]), m4(x, y, z), 'c');
    const shade = mesh(lathe([[shadeR, 0], [shadeR * 0.65, shadeR * 1.05]], 32), M.shade, x, y + h - 0.18, z, false);
    add(shade);
    S.add(M.bulb, new THREE.SphereGeometry(0.035, 12, 8), m4(x, y + h - 0.1, z), '');
    if (!light) return null;
    const pl = new THREE.PointLight(0xffb871, intensity, 5.5, 2);
    pl.position.set(x, y + h - 0.08, z);
    add(pl);
    return { light: pl, shade };
  };
  const floorLamp = lamp(-5.45, 0, -1.32, 1.65, 0.24, true, 3.4);
  col(-5.45, -1.32, 0.35, 0.35);
  S.rbox(M.desk, 0.45, 0.04, 0.45, 0.01, -5.4, 0.6, 1.36);
  S.box(M.trim, 0.36, 0.58, 0.36, -5.4, 0.29, 1.36);
  const sideLamp = lamp(-5.4, 0.62, 1.36, 0.62, 0.18, true, 2.6);
  col(-5.4, 1.36, 0.48, 0.48);

  // ----- Classeurs métalliques (mur droit) -----
  for (let i = 0; i < 3; i++) {
    const z = -2.55 + i * 0.64;
    S.rbox(M.steel, 0.56, 1.32, 0.62, 0.01, 5.7, 0.66, z);
    for (let d = 0; d < 4; d++) {
      const y = 0.18 + d * 0.31;
      S.box(M.steel, 0.02, 0.28, 0.58, 5.415, y, z);
      S.box(M.chrome, 0.03, 0.025, 0.16, 5.395, y + 0.06, z);
      S.box(M.paper, 0.005, 0.05, 0.1, 5.4, y + 0.11, z);
    }
  }
  col(5.7, -1.91, 0.62, 1.95);
  const cabLamp = lamp(5.7, 1.32, -2.55, 0.55, 0.17, true, 2.4);
  S.add(M.gold, lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0.015, 0.04], [0.012, 0.11], [0.06, 0.16], [0.07, 0.24], [0, 0.18]]), m4(5.7, 1.32, -1.3), 'c');

  // ----- Horloge murale (mur droit) -----
  {
    const face = TX.drawn(512, 512, (ctx, w) => {
      ctx.fillStyle = '#efe5cc'; ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 214, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#1e1810'; ctx.font = '600 46px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      nums.forEach((n, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; ctx.fillText(n, 256 + Math.cos(a) * 178, 256 + Math.sin(a) * 178); });
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; ctx.lineWidth = i % 5 ? 2 : 5; ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * 228, 256 + Math.sin(a) * 228); ctx.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); ctx.stroke(); }
      ctx.font = 'italic 500 26px "Cormorant Garamond", serif'; ctx.fillText('Bruxelles', 256, 340);
    });
    const clock = new THREE.Group();
    clock.position.set(5.94, 2.62, -1.9);
    clock.rotation.y = -Math.PI / 2;
    add(clock);
    clock.add(mesh(new THREE.CircleGeometry(0.34, 48), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), 0, 0, 0.01, false));
    const rim = mesh(new THREE.TorusGeometry(0.35, 0.035, 16, 64), M.brass, 0, 0, 0.02);
    clock.add(rim);
    const hand = (len, w) => {
      const p = new THREE.Group();
      const m = mesh(new THREE.BoxGeometry(w, len, 0.006), M.black, 0, len / 2 - 0.03, 0, false);
      p.add(m);
      p.position.z = 0.03;
      clock.add(p);
      return p;
    };
    dyn.clock = { hour: hand(0.18, 0.018), minute: hand(0.27, 0.01) };
    clock.add(mesh(new THREE.SphereGeometry(0.018, 12, 8), M.brass, 0, 0, 0.035));
  }

  // ----- Globe terrestre -----
  {
    const g = new THREE.Group();
    g.position.set(4.6, 0, 0.75);
    add(g);
    const b = new Batch();
    b.add(M.desk, lathe([[0, 0], [0.26, 0], [0.26, 0.04], [0.06, 0.08], [0.04, 0.5], [0.07, 0.55], [0, 0.56]]), m4(0, 0, 0));
    for (let k = 0; k < 3; k++) b.add(M.desk, new THREE.CylinderGeometry(0.025, 0.02, 0.55, 10), m4(Math.cos(k * 2.09) * 0.2, 0.3, Math.sin(k * 2.09) * 0.2, Math.sin(k * 2.09) * 0.35, 0, -Math.cos(k * 2.09) * 0.35));
    b.add(M.brass, new THREE.TorusGeometry(0.37, 0.012, 8, 64), m4(0, 0.98, 0, 0, Math.PI / 2, 0.41));
    b.add(M.desk, new THREE.TorusGeometry(0.4, 0.03, 8, 64, Math.PI), m4(0, 0.98, 0, Math.PI / 2, 0, 0));
    b.build(g);
    const sphere = mesh(new THREE.SphereGeometry(0.35, 48, 32), new THREE.MeshPhysicalMaterial({ map: TX.globeTexture(geo.world), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }), 0, 0.98, 0);
    sphere.rotation.z = 0.41;
    g.add(sphere);
    dyn.globe = sphere;
    col(4.6, 0.75, 0.6, 0.6);
    interact.globe = { objects: [sphere], label: 'Faire tourner le globe', spot: 'globe' };
  }

  // ----- Porte -----
  {
    const door = new THREE.Group();
    door.position.set(5.96, 0, 2.6);
    add(door);
    const b = new Batch();
    b.box(M.desk, 0.05, 2.38, 1.08, 0, 1.19, 0);
    for (const [y, h] of [[0.55, 0.7], [1.65, 1.1]]) for (const z of [-0.25, 0.25]) {
      b.box(M.trim, 0.02, h, 0.035, -0.035, y, z - 0.18); b.box(M.trim, 0.02, h, 0.035, -0.035, y, z + 0.18);
      b.box(M.trim, 0.02, 0.035, 0.36, -0.035, y + h / 2, z); b.box(M.trim, 0.02, 0.035, 0.36, -0.035, y - h / 2, z);
    }
    b.add(M.brass, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12), m4(-0.07, 1.05, -0.42, Math.PI / 2, 0, 0));
    b.add(M.brass, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), m4(-0.035, 1.05, -0.42, 0, 0, Math.PI / 2));
    b.build(door);
    interact.porte = { objects: door.children, label: 'Ouvrir la porte', spot: 'porte' };
  }

  // Portemanteau avec manteau
  {
    S.add(M.desk, new THREE.CylinderGeometry(0.025, 0.03, 1.85, 12), m4(5.4, 0.925, 4.35));
    S.add(M.desk, lathe([[0, 0], [0.22, 0], [0.22, 0.03], [0.04, 0.06], [0, 0.06]]), m4(5.4, 0, 4.35));
    for (let k = 0; k < 4; k++) S.add(M.brass, new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8), m4(5.4 + Math.cos(k * 1.57) * 0.08, 1.75, 4.35 + Math.sin(k * 1.57) * 0.08, Math.sin(k * 1.57) * 0.8, 0, -Math.cos(k * 1.57) * 0.8));
    S.add(M.cloth, lathe([[0.03, 1.72], [0.17, 1.55], [0.2, 1.3], [0.18, 0.75], [0.0, 0.72]], 20), m4(5.33, 0, 4.35, 0, 0, 0, 1, 1, 0.6));
    col(5.4, 4.35, 0.5, 0.5);
  }

  // ----- Plantes en pot -----
  const plant = (x, z, s = 1) => {
    S.add(M.brass, lathe([[0, 0], [0.18, 0], [0.22, 0.05], [0.26, 0.42], [0.27, 0.46], [0, 0.46]].map(([r, y]) => [r * s, y * s])), m4(x, 0, z), 'c');
    S.add(M.soil, new THREE.CircleGeometry(0.25 * s, 20), m4(x, 0.445 * s, z, -Math.PI / 2), '');
    const n = 16;
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(0.2, 0.85, 1, 8);
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const yy = pos.getY(k) + 0.425;
        pos.setZ(k, -Math.pow(yy / 0.85, 2) * 0.35);
        pos.setY(k, yy);
      }
      g.computeVertexNormals();
      const a = (i / n) * Math.PI * 2 + R() * 0.4;
      const tilt = 0.25 + R() * 0.55;
      const len = (0.8 + R() * 0.6) * s;
      S.add(M.leaf, g, m4(x, 0.42 * s, z, -tilt, a, 0, len, len, len), 'c');
    }
    col(x, z, 0.55 * s, 0.55 * s);
  };
  plant(-5.3, -4.0, 1.1);
  plant(5.35, -3.95, 1.0);
  plant(-5.3, 4.3, 1.2);

  // ----- Mur avant : buffet, tableau, appliques -----
  {
    S.rbox(M.desk, 2.4, 0.05, 0.56, 0.015, 0, 0.86, 4.68);
    S.box(M.panel, 2.3, 0.8, 0.5, 0, 0.42, 4.7);
    for (let i = 0; i < 4; i++) {
      const cx = -0.86 + i * 0.573;
      S.box(M.trim, 0.45, 0.6, 0.02, cx, 0.45, 4.44);
      S.add(M.brass, new THREE.SphereGeometry(0.016, 10, 8), m4(cx + (i % 2 ? -0.17 : 0.17), 0.5, 4.42), '');
    }
    col(0, 4.68, 2.45, 0.62);
    S.add(M.crystal, lathe([[0, 0], [0.08, 0], [0.09, 0.06], [0.08, 0.2], [0.03, 0.26], [0.03, 0.34], [0, 0.34]]), m4(-0.25, 0.885, 4.62), '');
    S.add(M.whisky, lathe([[0, 0], [0.075, 0], [0.083, 0.06], [0.083, 0.13], [0, 0.13]]), m4(-0.25, 0.89, 4.62), '');
    S.add(M.crystal, lathe([[0, 0], [0.04, 0], [0.045, 0.09], [0, 0.09]]), m4(0.0, 0.885, 4.58), '');
    S.add(M.bronze, lathe([[0, 0], [0.08, 0], [0.06, 0.03], [0.05, 0.25], [0.07, 0.32], [0.04, 0.4], [0, 0.42]]), m4(0.6, 0.885, 4.66), 'c');
    // Tableau : marine nocturne.
    const paint = TX.drawn(1024, 640, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2b2a2c'); g.addColorStop(0.55, '#6b5a44'); g.addColorStop(0.6, '#3a3a36'); g.addColorStop(1, '#141618');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const RR = mulberry32(9);
      for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(${200 + RR() * 50},${170 + RR() * 50},${120 + RR() * 40},${RR() * 0.06})`; ctx.fillRect(RR() * w, RR() * h, 30 + RR() * 60, 3 + RR() * 5); }
      ctx.fillStyle = '#0c0d10';
      ctx.beginPath(); ctx.moveTo(260, 420); ctx.lineTo(780, 420); ctx.lineTo(720, 470); ctx.lineTo(320, 470); ctx.closePath(); ctx.fill();
      ctx.fillRect(470, 330, 120, 95); ctx.fillRect(520, 280, 20, 60);
      ctx.fillStyle = 'rgba(255,210,140,0.7)'; for (let i = 0; i < 8; i++) ctx.fillRect(350 + i * 48, 436, 8, 6);
    });
    const pm = mesh(new THREE.PlaneGeometry(1.9, 1.19), new THREE.MeshStandardMaterial({ map: paint, roughness: 0.8 }), 0, 2.15, 4.94, false);
    pm.rotation.y = Math.PI;
    add(pm);
    for (const [w, h, x, y] of [[2.1, 0.1, 0, 2.15 + 0.645], [2.1, 0.1, 0, 2.15 - 0.645], [0.1, 1.19, -1.0, 2.15], [0.1, 1.19, 1.0, 2.15]]) S.rbox(M.gold, w, h, 0.06, 0.01, x, y, 4.95);
    for (const sx of [-1, 1]) {
      S.add(M.brass, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), m4(sx * 1.6, 2.3, 4.98, Math.PI / 2), '');
      const sh = mesh(lathe([[0.09, 0], [0.06, 0.14]], 24), M.shade, sx * 1.6, 2.33, 4.88, false);
      add(sh);
    }
  }
  const credLight = new THREE.PointLight(0xffb36a, 1.6, 4, 2);
  credLight.position.set(0, 2.4, 4.7);
  add(credLight);

  // ----- Drapeaux -----
  const flagTex = (draw) => TX.drawn(512, 768, draw);
  const makeFlag = (x, z, tex, poleH = 2.55) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    add(g);
    const b = new Batch();
    b.add(M.brass, lathe([[0, 0], [0.2, 0], [0.2, 0.04], [0.06, 0.1], [0, 0.1]]), m4(0, 0, 0));
    b.add(M.desk, new THREE.CylinderGeometry(0.022, 0.025, poleH, 12), m4(0, poleH / 2, 0));
    b.add(M.gold, lathe([[0, 0], [0.04, 0.02], [0.05, 0.08], [0.02, 0.14], [0.005, 0.22], [0, 0.22]]), m4(0, poleH, 0));
    b.build(g);
    const W = 0.95, Hf = 1.55;
    const cg = new THREE.PlaneGeometry(W, Hf, 24, 24);
    cg.translate(W / 2, -Hf / 2, 0);
    const base = cg.attributes.position.array.slice();
    const cloth = mesh(cg, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.75, sheen: 0.8, sheenColor: 0x887766, side: THREE.DoubleSide }), 0.02, poleH - 0.06, 0);
    cloth.rotation.y = -0.5;
    g.add(cloth);
    const anim = (t) => {
      const p = cg.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const u = base[i] / W, v = -base[i + 1] / Hf;
        const sag = u * u * 0.55;
        p[i] = base[i] * (1 - sag * 0.6);
        p[i + 1] = base[i + 1] - sag * (0.6 + v * 0.2);
        p[i + 2] = Math.sin(u * 13 + v * 2 + t * 0.7) * 0.05 * u + Math.sin(u * 5 + t * 0.4) * 0.03 * u;
      }
      cg.attributes.position.needsUpdate = true;
      cg.computeVertexNormals();
    };
    anim(0);
    return { group: g, anim, cloth };
  };
  const belgian = makeFlag(1.95, -4.3, flagTex((ctx, w, h) => {
    ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, w / 3, h);
    ctx.fillStyle = '#f2c81f'; ctx.fillRect(w / 3, 0, w / 3, h);
    ctx.fillStyle = '#c8202f'; ctx.fillRect((2 * w) / 3, 0, w / 3, h);
    ctx.fillStyle = '#d6b25a'; for (let y = 0; y < h; y += 14) ctx.fillRect(w - 10, y, 10, 7);
  }));
  dyn.anim.push(belgian.anim);
  col(1.95, -4.3, 0.42, 0.42);
  const royal = makeFlag(-1.95, -4.3, flagTex((ctx, w, h) => {
    ctx.fillStyle = '#7d1022'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 18; ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = '#e0bb5e';
    ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.45); ctx.lineTo(w * 0.3, h * 0.33); ctx.lineTo(w * 0.4, h * 0.4); ctx.lineTo(w * 0.5, h * 0.28); ctx.lineTo(w * 0.6, h * 0.4); ctx.lineTo(w * 0.7, h * 0.33); ctx.lineTo(w * 0.7, h * 0.45); ctx.closePath(); ctx.fill();
    ctx.font = '700 64px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.fillText('L’UNION', w / 2, h * 0.6); ctx.fillText('FAIT LA FORCE', w / 2, h * 0.68);
  }));
  royal.group.visible = false;
  dyn.anim.push(royal.anim);
  dyn.royalStandard = royal.group;

  // ----- Objets du bureau -----
  const deskTopY = 0.78;
  const props = new THREE.Group();
  add(props);
  dyn.props = props;

  // Ordinateur
  {
    const g = new THREE.Group();
    g.position.set(-0.6, deskTopY, -2.62);
    g.rotation.y = Math.PI - 0.3;
    props.add(g);
    const screenCanvas = TX.canvas(1024, 576);
    const screenTex = TX.toTexture(screenCanvas, { wrap: false });
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.16), M.black, 0, 0.006, 0));
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.3, 0.025), M.black, 0, 0.16, -0.03));
    g.add(mesh(rboxGeo(0.7, 0.42, 0.03, 0.008), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 }), 0, 0.42, 0));
    const scr = mesh(new THREE.PlaneGeometry(0.66, 0.37), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.25, roughness: 0.25 }), 0, 0.425, 0.016, false);
    g.add(scr);
    const kb = mesh(rboxGeo(0.44, 0.02, 0.14, 0.006), M.black, 0.05, 0.01, 0.34);
    kb.rotation.y = 0.05;
    g.add(kb);
    const mouse = mesh(new THREE.SphereGeometry(0.035, 16, 10), M.black, 0.36, 0.012, 0.35);
    mouse.scale.set(0.8, 0.35, 1.2);
    g.add(mouse);
    dyn.screen = { canvas: screenCanvas, tex: screenTex };
    interact.ordinateur = { objects: [scr, ...g.children], label: 'Utiliser l’ordinateur', spot: 'chair' };
  }
  // Téléphone rouge à cadran
  {
    const g = new THREE.Group();
    g.position.set(0.72, deskTopY, -3.0);
    g.rotation.y = Math.PI + 0.35;
    props.add(g);
    const body = new THREE.Group();
    g.add(body);
    body.add(mesh(rboxGeo(0.22, 0.09, 0.24, 0.035), M.phone, 0, 0.045, 0));
    body.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), M.phone, 0, 0.09, -0.04));
    const dial = mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.015, 32), M.chrome, 0, 0.098, 0.06);
    dial.rotation.x = 0.35;
    body.add(dial);
    const dialFace = mesh(new THREE.CircleGeometry(0.045, 24), M.paper, 0, 0.108, 0.063, false);
    dialFace.rotation.x = -Math.PI / 2 + 0.35;
    body.add(dialFace);
    const handset = new THREE.Group();
    handset.position.set(0, 0.14, -0.03);
    body.add(handset);
    const hc = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.11, 0, 0), new THREE.Vector3(-0.06, 0.03, 0), new THREE.Vector3(0.06, 0.03, 0), new THREE.Vector3(0.11, 0, 0)]);
    handset.add(mesh(new THREE.TubeGeometry(hc, 20, 0.018, 10), M.phone));
    for (const sx of [-1, 1]) handset.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 20), M.phone, sx * 0.115, -0.005, 0));
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.1, 0.05, 0.05), new THREE.Vector3(-0.2, 0.01, 0.1), new THREE.Vector3(-0.25, 0.005, -0.05), new THREE.Vector3(-0.15, 0.005, -0.18)]);
    body.add(mesh(new THREE.TubeGeometry(cord, 30, 0.006, 6), M.phone));
    const ringLight = new THREE.PointLight(0xff3020, 0, 1.5, 2);
    ringLight.position.set(0, 0.3, 0);
    g.add(ringLight);
    dyn.phone = { group: g, body, handset, light: ringLight };
    interact.telephone = { objects: [g], label: 'Décrocher le téléphone', spot: 'chair' };
  }
  // Lampe de bureau
  {
    const g = new THREE.Group();
    g.position.set(-1.12, deskTopY, -2.22);
    props.add(g);
    g.add(mesh(lathe([[0, 0], [0.1, 0], [0.1, 0.02], [0.03, 0.05], [0.015, 0.07], [0.015, 0.42], [0.03, 0.44], [0, 0.45]]), M.brass));
    const sh = mesh(lathe([[0.17, 0], [0.12, 0.08], [0.06, 0.13]], 32), new THREE.MeshPhysicalMaterial({ color: 0x1f5a3a, roughness: 0.15, clearcoat: 1, emissive: 0x0f3a20, emissiveIntensity: 0.6, side: THREE.DoubleSide }), 0, 0.36, 0);
    g.add(sh);
    const pl = new THREE.PointLight(0xffc98c, 2.4, 4.5, 2);
    pl.position.set(0, 0.33, 0);
    g.add(pl);
    dyn.deskLamp = pl;
  }
  // Plaque, sous-main, stylos, agenda
  {
    const plate = TX.drawn(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#c9a253'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#20180e'; ctx.textAlign = 'center';
      ctx.font = '700 46px "Cormorant Garamond", serif'; ctx.fillText('LE GÉNÉRAL', w / 2, 56);
      ctx.font = 'italic 500 30px "Cormorant Garamond", serif'; ctx.fillText('Chef du Gouvernement', w / 2, 100);
    });
    const pg = new THREE.Group();
    pg.position.set(0, deskTopY, -2.2);
    props.add(pg);
    const pmat = new THREE.MeshStandardMaterial({ map: plate, metalness: 0.9, roughness: 0.3 });
    const pp = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.012), [M.desk, M.desk, M.desk, M.desk, pmat, M.desk], 0, 0.06, 0);
    pp.rotation.x = -0.35;
    pg.add(pp);
    pg.add(mesh(new THREE.BoxGeometry(0.45, 0.025, 0.08), M.desk, 0, 0.012, -0.01));
    // Pot à crayons et stylos
    props.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.11, 16, 1, true), M.brass, -0.25, deskTopY + 0.055, -3.1));
    for (let i = 0; i < 4; i++) {
      const p = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 6), i % 2 ? M.black : M.gold, -0.25 + (i - 1.5) * 0.012, deskTopY + 0.12, -3.1 + (i % 2) * 0.01);
      p.rotation.z = (i - 1.5) * 0.15;
      props.add(p);
    }
    // Encrier
    props.add(mesh(new THREE.BoxGeometry(0.22, 0.03, 0.12), M.desk, 0.1, deskTopY + 0.015, -3.12));
    props.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.05, 12), M.crystal, 0.05, deskTopY + 0.055, -3.12));
    // Agenda (clore la journée)
    const ag = new THREE.Group();
    ag.position.set(0.32, deskTopY, -2.95);
    ag.rotation.y = 0.15;
    props.add(ag);
    ag.add(mesh(rboxGeo(0.24, 0.04, 0.32, 0.008), new THREE.MeshStandardMaterial({ color: 0x3a1410, roughness: 0.55 }), 0, 0.02, 0));
    ag.add(mesh(new THREE.BoxGeometry(0.23, 0.032, 0.3), M.paper, 0.004, 0.02, 0));
    ag.add(mesh(new THREE.BoxGeometry(0.012, 0.042, 0.04), M.gold, -0.11, 0.021, 0.08));
    interact.agenda = { objects: [ag], label: 'Clore la journée', spot: 'chair' };
    // Journal du jour sur le bureau
    const dn = TX.drawn(1024, 768, () => {});
    const dnm = mesh(new THREE.PlaneGeometry(0.42, 0.315), new THREE.MeshStandardMaterial({ map: dn, roughness: 0.9 }), -0.05, deskTopY + 0.004, -2.45, false);
    dnm.rotation.set(-Math.PI / 2, 0, Math.PI - 0.12);
    props.add(dnm);
    dyn.deskNews = dn;
  }
  // Piles de dossiers (dynamiques)
  {
    const tray = new THREE.Group();
    tray.position.set(0.98, deskTopY, -2.48);
    tray.rotation.y = -0.1;
    props.add(tray);
    tray.add(mesh(new THREE.BoxGeometry(0.34, 0.012, 0.28), M.brass, 0, 0.006, 0));
    const fm = [M.manila, M.manila, M.folderRed, M.manila, M.folderBlue];
    dyn.folders = [];
    for (let i = 0; i < 16; i++) {
      const f = mesh(new THREE.BoxGeometry(0.31, 0.016, 0.24), fm[i % fm.length], (R() - 0.5) * 0.02, 0.02 + i * 0.017, (R() - 0.5) * 0.02);
      f.rotation.y = (R() - 0.5) * 0.12;
      f.visible = false;
      tray.add(f);
      dyn.folders.push(f);
    }
    const pile = new THREE.Group();
    pile.position.set(-1.0, deskTopY, -3.05);
    props.add(pile);
    dyn.archive = [];
    for (let i = 0; i < 14; i++) {
      const f = mesh(new THREE.BoxGeometry(0.3, 0.02, 0.23), fm[(i + 2) % fm.length], (R() - 0.5) * 0.04, 0.01 + i * 0.021, (R() - 0.5) * 0.03);
      f.rotation.y = 0.3 + (R() - 0.5) * 0.2;
      f.visible = false;
      pile.add(f);
      dyn.archive.push(f);
    }
    interact.dossiers = { objects: [tray, pile], label: 'Consulter les dossiers', spot: 'chair' };
  }
  // Tasses de café, whisky, objets d'orientation politique (masqués au départ)
  {
    dyn.cups = [];
    const cupPos = [[0.45, -3.2], [-0.42, -2.35], [0.6, -2.3], [-0.85, -2.95], [1.12, -3.05]];
    for (const [x, z] of cupPos) {
      const c = new THREE.Group();
      c.position.set(x, deskTopY, z);
      c.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 20), M.paper, 0, 0.003, 0));
      c.add(mesh(lathe([[0, 0], [0.03, 0], [0.042, 0.06], [0.045, 0.075], [0, 0.07]], 20), M.paper, 0, 0.006, 0));
      c.add(mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), M.paper, 0.05, 0.045, 0));
      c.visible = false;
      props.add(c);
      dyn.cups.push(c);
    }
    const wh = new THREE.Group();
    wh.position.set(-0.35, deskTopY, -3.25);
    wh.add(mesh(lathe([[0, 0], [0.07, 0], [0.075, 0.05], [0.07, 0.18], [0.03, 0.23], [0.03, 0.3], [0, 0.3]]), M.crystal));
    wh.add(mesh(lathe([[0, 0], [0.066, 0], [0.07, 0.05], [0.066, 0.12], [0, 0.12]]), M.whisky));
    wh.add(mesh(lathe([[0, 0], [0.04, 0], [0.042, 0.08], [0, 0.08]]), M.crystal, 0.13, 0, 0.05));
    wh.add(mesh(lathe([[0, 0], [0.038, 0], [0.04, 0.03], [0, 0.03]]), M.whisky, 0.13, 0.002, 0.05));
    wh.visible = false;
    props.add(wh);
    dyn.whisky = wh;

    // Petits drapeaux régionaux (Flandre, Wallonie)
    const small = (x, color, draw) => {
      const g = new THREE.Group();
      g.position.set(x, deskTopY, -2.3);
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16), M.brass, 0, 0.01, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 6), M.gold, 0, 0.17, 0));
      const t = TX.drawn(128, 96, (ctx, w, h) => { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); draw(ctx, w, h); });
      g.add(mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide }), 0.08, 0.27, 0, false));
      g.visible = false;
      props.add(g);
      return g;
    };
    const lion = (ctx, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(64, 54, 26, 20, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(80, 30, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(44, 64, 8, 22); ctx.fillRect(72, 64, 8, 22);
      ctx.beginPath(); ctx.moveTo(38, 50); ctx.quadraticCurveTo(20, 20, 30, 12); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
    };
    dyn.regionFlags = [
      small(-0.5, '#f5d324', (ctx) => lion(ctx, '#111')),
      small(-0.32, '#f5d324', (ctx) => {
        ctx.fillStyle = '#c8202f';
        ctx.beginPath(); ctx.ellipse(60, 56, 24, 18, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(80, 32, 11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(36, 50); ctx.lineTo(18, 24); ctx.lineTo(30, 56); ctx.fill();
        ctx.fillRect(54, 70, 5, 18); ctx.fillRect(66, 70, 5, 18);
      }),
    ];
    // Tracts du Rempart
    const tracts = new THREE.Group();
    tracts.position.set(0.42, deskTopY, -2.35);
    const tt = TX.drawn(256, 360, (ctx, w, h) => {
      ctx.fillStyle = '#16120f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b3202c'; ctx.fillRect(0, h * 0.62, w, 26);
      ctx.fillStyle = '#efe6d2'; ctx.font = '800 54px "IBM Plex Sans", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('LE', w / 2, 110); ctx.fillText('REMPART', w / 2, 170);
      ctx.font = '600 22px "IBM Plex Sans", sans-serif'; ctx.fillText("L'ORDRE, MAINTENANT.", w / 2, h * 0.62 + 19);
    });
    for (let i = 0; i < 3; i++) {
      const p = mesh(new THREE.PlaneGeometry(0.15, 0.21), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.7 }), i * 0.03, 0.003 + i * 0.002, i * 0.02, false);
      p.rotation.set(-Math.PI / 2, 0, Math.PI + 0.3 + i * 0.25);
      tracts.add(p);
    }
    tracts.visible = false;
    props.add(tracts);
    dyn.tracts = tracts;
    // Accord encadré (voie du compromis) sur le buffet
    const acc = new THREE.Group();
    acc.position.set(0.95, 0.885, 4.62);
    acc.rotation.y = Math.PI + 0.2;
    const at = TX.drawn(256, 340, (ctx, w, h) => {
      ctx.fillStyle = '#efe6d0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a2018'; ctx.textAlign = 'center'; ctx.font = '700 22px "Cormorant Garamond", serif';
      ctx.fillText('ACCORD', w / 2, 50); ctx.font = 'italic 16px "Cormorant Garamond", serif'; ctx.fillText('de la Cellule interfédérale', w / 2, 74);
      ctx.fillStyle = 'rgba(40,30,20,0.4)'; for (let y = 100; y < 260; y += 14) ctx.fillRect(30, y, w - 60, 3);
      ctx.strokeStyle = '#1d2d6a'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(30 + k * 52, 300); ctx.bezierCurveTo(40 + k * 52, 280, 50 + k * 52, 320, 70 + k * 52, 295); ctx.stroke(); }
    });
    acc.add(mesh(new THREE.BoxGeometry(0.26, 0.34, 0.02), M.gold, 0, 0.17, 0));
    acc.add(mesh(new THREE.PlaneGeometry(0.22, 0.29), new THREE.MeshStandardMaterial({ map: at }), 0, 0.17, 0.011, false));
    acc.rotation.x = -0.12;
    acc.visible = false;
    add(acc);
    dyn.accord = acc;
    // Radio militaire (armée déployée)
    const radio = new THREE.Group();
    radio.position.set(1.85, 0, -2.2);
    radio.add(mesh(new THREE.BoxGeometry(0.42, 0.62, 0.34), M.olive, 0, 0.31, 0));
    radio.add(mesh(new THREE.BoxGeometry(0.34, 0.2, 0.01), M.black, 0, 0.45, 0.171));
    radio.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.0, 6), M.black, 0.15, 1.1, -0.1));
    for (let i = 0; i < 3; i++) radio.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), M.chrome, -0.1 + i * 0.1, 0.28, 0.175).rotateX(Math.PI / 2));
    const rl = mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0x55ff66 }), 0.15, 0.56, 0.172, false);
    radio.add(rl);
    radio.visible = false;
    add(radio);
    dyn.radio = radio;
  }

  // ----- Éclairage -----
  const L = {};
  L.hemi = new THREE.HemisphereLight(0xa0a8c0, 0x2a1a10, 0.25);
  add(L.hemi);
  L.window = new THREE.DirectionalLight(0xc8d6ff, 1.6);
  L.window.position.set(-15, 8.5, 1.5);
  L.window.target.position.set(-1, 0, -0.8);
  L.window.castShadow = true;
  L.window.shadow.mapSize.set(2048, 2048);
  Object.assign(L.window.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 4, far: 30 });
  L.window.shadow.bias = -0.0004;
  L.window.shadow.normalBias = 0.02;
  add(L.window);
  add(L.window.target);
  L.panel = new THREE.RectAreaLight(0xffe7c4, 3.2, 2.5, 1.3);
  L.panel.position.set(0, ROOM.h - 0.29, -2.0);
  L.panel.lookAt(0, 0, -2.0);
  add(L.panel);
  L.deskSpot = new THREE.SpotLight(0xffd6a0, 22, 9, 0.62, 0.7, 1.6);
  L.deskSpot.position.set(0.9, ROOM.h - 0.05, -1.3);
  L.deskSpot.target.position.set(0, 0.7, -2.8);
  L.deskSpot.castShadow = true;
  L.deskSpot.shadow.mapSize.set(1024, 1024);
  L.deskSpot.shadow.bias = -0.0006;
  L.deskSpot.shadow.normalBias = 0.02;
  add(L.deskSpot); add(L.deskSpot.target);
  L.mapSpot = new THREE.SpotLight(0xffd9a6, 14, 6, 0.75, 0.6, 1.5);
  L.mapSpot.position.set(0, ROOM.h - 0.1, -3.6);
  L.mapSpot.target.position.set(0, 2.1, -5);
  add(L.mapSpot); add(L.mapSpot.target);
  L.shelfSpots = [-4, 4].map((x) => {
    const s = new THREE.SpotLight(0xffc98e, 10, 6, 0.7, 0.8, 1.6);
    s.position.set(x, ROOM.h - 0.1, -3.6);
    s.target.position.set(x, 1.6, -5);
    add(s); add(s.target);
    return s;
  });
  L.sofaSpot = new THREE.SpotLight(0xffd0a0, 8, 6, 0.8, 0.8, 1.6);
  L.sofaSpot.position.set(-4.4, ROOM.h - 0.1, 0);
  L.sofaSpot.target.position.set(-4.6, 0, 0);
  add(L.sofaSpot); add(L.sofaSpot.target);
  L.police = new THREE.PointLight(0x3b5bff, 0, 14, 1.4);
  L.police.position.set(-8.5, 1.5, 0);
  add(L.police);
  L.lamps = [floorLamp, sideLamp, cabLamp].filter(Boolean);
  L.credenza = credLight;
  L.deskLamp = dyn.deskLamp;
  L.mats = { panelLight: M.panelLight, glow: M.glow, shade: M.shade, bookStrip: M.bookStrip };

  S.build(root);
  root.traverse((o) => { if (o.isMesh && o.material === M.leaf) o.castShadow = true; });

  return { root, M, colliders, interact, dyn, lights: L, chair };
}
