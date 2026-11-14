// Déplacements dans le bureau : collisions cercle/rectangles et recherche de chemin A* sur grille.
export function createNav(colliders, room, radius = 0.27) {
  const cell = 0.15;
  const nx = Math.ceil((room.x1 - room.x0) / cell);
  const nz = Math.ceil((room.z1 - room.z0) / cell);
  const margin = radius + 0.02;

  const insideAny = (x, z, pad) => colliders.some((c) => x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
  const freeAt = (x, z) => x > room.x0 + margin && x < room.x1 - margin && z > room.z0 + margin && z < room.z1 - margin && !insideAny(x, z, radius);

  const grid = new Uint8Array(nx * nz);
  const cx = (i) => room.x0 + (i + 0.5) * cell;
  const cz = (j) => room.z0 + (j + 0.5) * cell;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) grid[j * nx + i] = freeAt(cx(i), cz(j)) ? 1 : 0;

  const toCell = (x, z) => [Math.max(0, Math.min(nx - 1, Math.floor((x - room.x0) / cell))), Math.max(0, Math.min(nz - 1, Math.floor((z - room.z0) / cell)))];

  function nearestFree(i, j) {
    if (grid[j * nx + i]) return [i, j];
    for (let r = 1; r < 20; r++) {
      let best = null, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= nz || !grid[b * nx + a]) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [a, b]; }
      }
      if (best) return best;
    }
    return [i, j];
  }

  function lineFree(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.ceil(d / (cell * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n);
      const [i, j] = toCell(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
      if (!grid[j * nx + i]) return false;
    }
    return true;
  }

  function findPath(fx, fz, tx, tz) {
    let [si, sj] = nearestFree(...toCell(fx, fz));
    const [gi, gj] = nearestFree(...toCell(tx, tz));
    const N = nx * nz;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = [];
    const h = (i, j) => Math.hypot(i - gi, j - gj);
    const start = sj * nx + si, goal = gj * nx + gi;
    g[start] = 0;
    open.push([h(si, sj), start]);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, cur] = open.splice(bi, 1)[0];
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % nx, cj = (cur / nx) | 0;
      for (const [di, dj, cost] of dirs) {
        const a = ci + di, b = cj + dj;
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const id = b * nx + a;
        if (!grid[id] || closed[id]) continue;
        if (di && dj && (!grid[cj * nx + a] || !grid[b * nx + ci])) continue;
        const ng = g[cur] + cost;
        if (ng < g[id]) {
          g[id] = ng;
          came[id] = cur;
          open.push([ng + h(a, b), id]);
        }
      }
    }
    if (came[goal] === -1 && goal !== start) return [{ x: tx, z: tz }];
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: cx(c % nx), z: cz((c / nx) | 0) }));
    pts[pts.length - 1] = { x: tx, z: tz };
    // Lissage par visibilité.
    const out = [{ x: fx, z: fz }];
    let k = 0;
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = pts.length - 1; m > k + 1; m--) {
        const from = out[out.length - 1];
        if (lineFree(from.x, from.z, pts[m].x, pts[m].z)) { far = m; break; }
      }
      out.push(pts[far]);
      k = far;
    }
    out.shift();
    return out;
  }

  // Pousse un cercle hors des obstacles et des murs.
  function resolve(p, ignore) {
    for (const c of colliders) {
      if (c === ignore) continue;
      const qx = Math.max(c.x0, Math.min(p.x, c.x1));
      const qz = Math.max(c.z0, Math.min(p.z, c.z1));
      let dx = p.x - qx, dz = p.z - qz;
      const d = Math.hypot(dx, dz);
      if (d < radius) {
        if (d < 1e-5) {
          const pen = [p.x - c.x0, c.x1 - p.x, p.z - c.z0, c.z1 - p.z];
          const m = Math.min(...pen);
          if (m === pen[0]) p.x = c.x0 - radius; else if (m === pen[1]) p.x = c.x1 + radius;
          else if (m === pen[2]) p.z = c.z0 - radius; else p.z = c.z1 + radius;
        } else {
          dx /= d; dz /= d;
          p.x = qx + dx * radius;
          p.z = qz + dz * radius;
        }
      }
    }
    p.x = Math.max(room.x0 + margin, Math.min(room.x1 - margin, p.x));
    p.z = Math.max(room.z0 + margin, Math.min(room.z1 - margin, p.z));
    return p;
  }

  return { findPath, resolve, freeAt, lineFree };
}
