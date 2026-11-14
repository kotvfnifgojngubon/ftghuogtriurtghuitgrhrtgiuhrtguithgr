// Le Général : personnage procédural (1,83 m) en uniforme de cérémonie, animé en code.
import * as THREE from 'three';
import { rboxGeo } from './room.js';

const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function createGeneral() {
  const mat = {
    jacket: new THREE.MeshPhysicalMaterial({ color: 0x23261d, roughness: 0.82, sheen: 0.6, sheenColor: 0x3a3e30 }),
    trousers: new THREE.MeshPhysicalMaterial({ color: 0x1f2119, roughness: 0.85, sheen: 0.5, sheenColor: 0x353828 }),
    red: new THREE.MeshStandardMaterial({ color: 0xa01a20, roughness: 0.6 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 1, roughness: 0.3 }),
    goldCord: new THREE.MeshStandardMaterial({ color: 0xcfa548, metalness: 0.9, roughness: 0.45 }),
    skin: new THREE.MeshPhysicalMaterial({ color: 0xd2a07f, roughness: 0.55, sheen: 0.3, sheenColor: 0xffc0a0 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.8 }),
    shoe: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.45 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.2 }),
    white: new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.4 }),
  };
  const ribbon = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const M = (g, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

  const root = new THREE.Group();
  root.name = 'general';
  const hips = new THREE.Group();
  hips.position.y = 0.97;
  root.add(hips);

  // Bassin
  hips.add(M(rboxGeo(0.32, 0.2, 0.22, 0.08), mat.trousers, 0, -0.03, 0));

  // Jambes
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.095, -0.06, 0);
    hips.add(hip);
    hip.add(M(cap(0.078, 0.33), mat.trousers, 0, -0.235, 0));
    hip.add(M(new THREE.BoxGeometry(0.012, 0.4, 0.035), mat.red, sx * 0.077, -0.24, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.47;
    hip.add(knee);
    knee.add(M(cap(0.062, 0.32), mat.trousers, 0, -0.21, 0));
    knee.add(M(new THREE.BoxGeometry(0.012, 0.36, 0.03), mat.red, sx * 0.062, -0.2, 0));
    const ankle = new THREE.Group();
    ankle.position.y = -0.43;
    knee.add(ankle);
    ankle.add(M(rboxGeo(0.1, 0.075, 0.28, 0.035), mat.shoe, 0, -0.035, 0.05));
    legs.push({ hip, knee, ankle });
  }

  // Torse (veste)
  const spine = new THREE.Group();
  spine.position.y = 0.0;
  hips.add(spine);
  const torso = M(lathe([[0.0, -0.17], [0.17, -0.17], [0.18, -0.05], [0.158, 0.1], [0.172, 0.25], [0.192, 0.36], [0.19, 0.46], [0.15, 0.53], [0.08, 0.57], [0.0, 0.575]]), mat.jacket);
  torso.scale.set(1.12, 1, 0.72);
  spine.add(torso);
  // Ceinturon et boucle
  const belt = M(new THREE.CylinderGeometry(0.162, 0.162, 0.045, 32, 1, true), mat.black, 0, 0.1, 0);
  belt.scale.set(1.13, 1, 0.75);
  spine.add(belt);
  spine.add(M(new THREE.BoxGeometry(0.06, 0.045, 0.012), mat.gold, 0, 0.1, 0.123));
  // Boutons
  for (let i = 0; i < 4; i++) spine.add(M(new THREE.SphereGeometry(0.0095, 10, 8), mat.gold, 0, 0.16 + i * 0.085, 0.13 + (i > 1 ? 0.004 : 0)));
  // Poches de poitrine
  for (const sx of [-1, 1]) {
    spine.add(M(new THREE.BoxGeometry(0.1, 0.035, 0.012), mat.jacket, sx * 0.095, 0.385, 0.128));
    spine.add(M(new THREE.SphereGeometry(0.007, 8, 6), mat.gold, sx * 0.095, 0.38, 0.136));
    spine.add(M(new THREE.BoxGeometry(0.11, 0.04, 0.012), mat.jacket, sx * 0.1, -0.02, 0.13));
  }
  // Col, chemise, cravate, pattes rouges
  spine.add(M(new THREE.CylinderGeometry(0.07, 0.078, 0.07, 20), mat.jacket, 0, 0.57, 0.0));
  const shirt = M(new THREE.ConeGeometry(0.05, 0.12, 3), mat.shirt, 0, 0.52, 0.098);
  shirt.rotation.x = Math.PI;
  shirt.scale.z = 0.3;
  spine.add(shirt);
  spine.add(M(new THREE.BoxGeometry(0.022, 0.1, 0.008), mat.black, 0, 0.5, 0.118));
  for (const sx of [-1, 1]) {
    const tab = M(new THREE.BoxGeometry(0.035, 0.045, 0.01), mat.red, sx * 0.055, 0.565, 0.06);
    tab.rotation.y = sx * 0.6;
    spine.add(tab);
    spine.add(M(new THREE.SphereGeometry(0.006, 6, 6), mat.gold, sx * 0.057, 0.565, 0.067));
  }
  // Barrettes de décorations (couleurs inspirées de la fiche)
  const ribbons = [0xf2c81f, 0x111111, 0xc8202f, 0x2d4f9a];
  ribbons.forEach((c, i) => {
    spine.add(M(new THREE.BoxGeometry(0.026, 0.018, 0.008), ribbon(c), -0.135 + i * 0.027, 0.425, 0.128));
    const md = M(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 12), mat.gold, -0.135 + i * 0.027, 0.395, 0.131);
    md.rotation.x = Math.PI / 2;
    spine.add(md);
  });
  const star = M(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 8), mat.gold, -0.09, 0.32, 0.133);
  star.rotation.x = Math.PI / 2;
  spine.add(star);
  spine.add(M(new THREE.SphereGeometry(0.008, 8, 6), mat.red, -0.09, 0.32, 0.137));
  // Aiguillette dorée (épaule droite vers la poitrine)
  for (const [a, b, c, d] of [[0.17, 0.08, -0.02, 0.03], [0.17, 0.13, 0.04, 0.05]]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-a, 0.5, 0.0), new THREE.Vector3(-a - 0.02, 0.38, 0.06), new THREE.Vector3(-b, 0.3 + c, 0.12), new THREE.Vector3(-0.03, 0.4 + d, 0.13),
    ]);
    spine.add(M(new THREE.TubeGeometry(curve, 24, 0.008, 6), mat.goldCord));
  }
  spine.add(M(new THREE.ConeGeometry(0.012, 0.05, 8), mat.gold, -0.08, 0.31, 0.13));

  // Tête et casquette
  const neck = new THREE.Group();
  neck.position.y = 0.58;
  spine.add(neck);
  neck.add(M(new THREE.CylinderGeometry(0.048, 0.052, 0.09, 16), mat.skin, 0, 0.04, 0));
  const head = new THREE.Group();
  head.position.y = 0.17;
  neck.add(head);
  const skull = M(new THREE.SphereGeometry(0.1, 32, 24), mat.skin, 0, 0, 0);
  skull.scale.set(0.88, 1.1, 1.0);
  head.add(skull);
  const jaw = M(new THREE.SphereGeometry(0.075, 20, 14), mat.skin, 0, -0.06, 0.025);
  jaw.scale.set(1.0, 0.8, 1.0);
  head.add(jaw);
  const nose = M(new THREE.ConeGeometry(0.016, 0.045, 10), mat.skin, 0, -0.005, 0.1);
  nose.rotation.x = Math.PI / 2 + 0.25;
  head.add(nose);
  for (const sx of [-1, 1]) {
    const ear = M(new THREE.SphereGeometry(0.024, 10, 8), mat.skin, sx * 0.088, 0.0, 0.0);
    ear.scale.set(0.4, 1.0, 0.7);
    head.add(ear);
    head.add(M(new THREE.SphereGeometry(0.011, 10, 8), mat.white, sx * 0.034, 0.022, 0.087));
    head.add(M(new THREE.SphereGeometry(0.0065, 8, 6), mat.eye, sx * 0.034, 0.022, 0.096));
    const brow = M(new THREE.BoxGeometry(0.034, 0.007, 0.012), mat.hair, sx * 0.035, 0.044, 0.092);
    brow.rotation.z = sx * -0.12;
    head.add(brow);
  }
  head.add(M(new THREE.BoxGeometry(0.035, 0.006, 0.01), new THREE.MeshStandardMaterial({ color: 0x8a5544, roughness: 0.6 }), 0, -0.058, 0.093));
  const hair = M(new THREE.SphereGeometry(0.104, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mat.hair, 0, 0.012, -0.008);
  hair.scale.set(0.9, 1.08, 1.02);
  hair.rotation.x = -0.35;
  head.add(hair);
  // Casquette à visière
  const capG = new THREE.Group();
  capG.position.set(0, 0.07, -0.005);
  capG.rotation.x = -0.06;
  head.add(capG);
  const crownCap = M(lathe([[0.104, 0], [0.108, 0.04], [0.135, 0.085], [0.138, 0.1], [0.11, 0.112], [0, 0.115]], 40), mat.jacket);
  crownCap.scale.z = 1.08;
  capG.add(crownCap);
  const band = M(new THREE.CylinderGeometry(0.106, 0.104, 0.045, 40, 1, true), mat.black, 0, 0.022, 0);
  band.scale.z = 1.08;
  capG.add(band);
  for (const y of [0.004, 0.04]) {
    const gb = M(new THREE.CylinderGeometry(0.108, 0.107, 0.008, 40, 1, true), mat.gold, 0, y, 0);
    gb.scale.z = 1.08;
    capG.add(gb);
  }
  const visor = M(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 32, 1, false, -Math.PI / 2, Math.PI), mat.visor, 0, 0.0, 0.03);
  visor.scale.set(1.0, 1, 0.65);
  visor.rotation.x = 0.28;
  capG.add(visor);
  // Broderie de feuilles de chêne sur la visière + insigne couronné
  for (let i = -3; i <= 3; i++) {
    const leaf = M(new THREE.SphereGeometry(0.009, 6, 4), mat.gold, i * 0.022, 0.004 - Math.abs(i) * 0.002, 0.1 - Math.abs(i) * 0.008);
    leaf.scale.set(1.6, 0.4, 0.8);
    capG.add(leaf);
  }
  const badge = new THREE.Group();
  badge.position.set(0, 0.07, 0.122);
  badge.rotation.x = -0.25;
  capG.add(badge);
  badge.add(M(new THREE.BoxGeometry(0.04, 0.016, 0.006), mat.gold, 0, -0.005, 0));
  for (let i = -1; i <= 1; i++) badge.add(M(new THREE.ConeGeometry(0.007, 0.022, 6), mat.gold, i * 0.014, 0.012, 0));
  badge.add(M(new THREE.SphereGeometry(0.006, 8, 6), mat.red, 0, 0.003, 0.004));

  // Bras
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.2, 0.48, -0.005);
    spine.add(sh);
    sh.add(M(new THREE.SphereGeometry(0.068, 16, 12), mat.jacket, 0, -0.01, 0));
    const ep = M(rboxGeo(0.1, 0.022, 0.085, 0.01), mat.red, -sx * 0.02, 0.052, 0);
    ep.rotation.z = -sx * 0.25;
    sh.add(ep);
    const epg = M(rboxGeo(0.07, 0.006, 0.05, 0.002), mat.gold, -sx * 0.02, 0.065, 0);
    epg.rotation.z = -sx * 0.25;
    sh.add(epg);
    sh.add(M(cap(0.058, 0.22), mat.jacket, 0, -0.16, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    sh.add(elbow);
    elbow.add(M(cap(0.05, 0.19), mat.jacket, 0, -0.13, 0));
    elbow.add(M(new THREE.CylinderGeometry(0.053, 0.053, 0.03, 16, 1, true), mat.gold, 0, -0.22, 0));
    const hand = new THREE.Group();
    hand.position.y = -0.27;
    elbow.add(hand);
    const palm = M(rboxGeo(0.06, 0.09, 0.035, 0.016), mat.skin, 0, -0.045, 0.005);
    hand.add(palm);
    const thumb = M(cap(0.012, 0.03), mat.skin, -sx * 0.032, -0.03, 0.018);
    thumb.rotation.z = sx * 0.5;
    hand.add(thumb);
    arms.push({ sh, elbow, hand, sx });
  }
  // Combiné téléphonique (visible pendant un appel)
  const handset = new THREE.Group();
  const hsCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.025, 0.05, 0), new THREE.Vector3(0.025, -0.05, 0), new THREE.Vector3(0, -0.1, 0)]);
  handset.add(M(new THREE.TubeGeometry(hsCurve, 16, 0.016, 8), new THREE.MeshPhysicalMaterial({ color: 0x9e0f18, roughness: 0.22, clearcoat: 1 })));
  handset.position.set(0, -0.08, 0.04);
  handset.visible = false;
  arms[0].hand.add(handset);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // ---------- Animation ----------
  const st = { phase: 0, speed: 0, sit: 0, sitTarget: 0, idle: 0, phone: 0, phoneTarget: 0, t: 0, typing: 0, typingTarget: 0 };
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  function update(dt, speed) {
    st.t += dt;
    st.speed = damp(st.speed, speed, 12, dt);
    const walk = Math.min(1, st.speed / 1.4);
    st.phase += dt * st.speed * 4.6;
    st.idle = speed < 0.05 ? Math.min(1, st.idle + dt * 0.6) : Math.max(0, st.idle - dt * 4);
    st.sit = damp(st.sit, st.sitTarget, 5, dt);
    st.phone = damp(st.phone, st.phoneTarget, 7, dt);
    st.typing = damp(st.typing, st.typingTarget, 6, dt);
    handset.visible = st.phone > 0.5;

    const s = Math.sin(st.phase), c = Math.cos(st.phase);
    const sit = st.sit;
    const rest = st.idle * (1 - sit) * (1 - st.phone);
    const breath = Math.sin(st.t * 1.6) * 0.008;

    // Bassin et colonne
    hips.position.y = lerp(0.97 + Math.abs(c) * 0.028 * walk, 0.62, sit);
    hips.position.z = lerp(0, -0.12, sit);
    hips.rotation.y = s * 0.08 * walk;
    spine.rotation.y = -s * 0.12 * walk;
    spine.rotation.x = lerp(0.04 * walk - rest * 0.03, 0.08, sit) + breath;
    spine.scale.set(1 + breath * 0.6, 1, 1 + breath);
    neck.rotation.x = lerp(-0.04 + rest * 0.04, 0.12 + st.typing * 0.1, sit);
    neck.rotation.y = Math.sin(st.t * 0.37) * 0.12 * st.idle * (1 - sit);

    // Jambes
    legs.forEach((L, i) => {
      const ph = i === 0 ? s : -s;
      const kneeBend = Math.max(0, -(i === 0 ? Math.sin(st.phase - 0.9) : -Math.sin(st.phase - 0.9)));
      L.hip.rotation.x = lerp(-ph * 0.5 * walk, -1.5, sit);
      L.hip.rotation.z = lerp(0, (i === 0 ? -1 : 1) * 0.06, sit);
      L.knee.rotation.x = lerp(kneeBend * 0.9 * walk, 1.5, sit);
      L.ankle.rotation.x = lerp(ph * 0.15 * walk, 0.0, sit);
    });

    // Bras : balancier, mains derrière le dos au repos, assis au bureau, téléphone.
    arms.forEach((A, i) => {
      const ph = i === 0 ? -s : s;
      let shX = ph * 0.45 * walk, shZ = A.sx * -0.06, elX = -0.25 - Math.max(0, ph) * 0.3 * walk, hY = 0;
      // Repos : mains jointes derrière le dos (pose « au repos »).
      shX = lerp(shX, 0.42, rest);
      shZ = lerp(shZ, A.sx * -0.12, rest);
      elX = lerp(elX, -1.25, rest);
      hY = lerp(0, A.sx * 0.8, rest);
      // Assis : avant-bras posés sur le bureau.
      const type = Math.sin(st.t * 14 + i * 2) * 0.04 * st.typing;
      shX = lerp(shX, -0.55 - st.typing * 0.2, sit);
      shZ = lerp(shZ, A.sx * -0.18, sit);
      elX = lerp(elX, -0.95 + type, sit);
      // Téléphone (main gauche du personnage = bras 0) porté à l'oreille.
      if (i === 0) {
        shX = lerp(shX, -1.1, st.phone);
        shZ = lerp(shZ, -0.55, st.phone);
        elX = lerp(elX, -2.3, st.phone);
        hY = lerp(hY, 0.4, st.phone);
      }
      A.sh.rotation.set(shX, 0, shZ);
      A.elbow.rotation.set(elX, 0, 0);
      A.hand.rotation.set(0, hY, 0);
    });
  }

  return {
    root,
    update,
    setSit(v) { st.sitTarget = v ? 1 : 0; },
    setPhone(v) { st.phoneTarget = v ? 1 : 0; },
    setTyping(v) { st.typingTarget = v ? 1 : 0; },
    get sitting() { return st.sit > 0.5; },
    headWorld: (v) => head.getWorldPosition(v),
  };
}
