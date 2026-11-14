// La scène 3D : rendu, caméra, personnage, déplacements et interactions avec les objets du bureau.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildRoom, ROOM, SPOTS } from './room.js';
import { createGeneral } from './character.js';
import { createNav } from './nav.js';
import { createPost } from './post.js';
import GEO from '../data/geo.js';

export const SHOTS = {
  ordinateur: { pos: [-0.05, 1.42, -4.05], target: [-0.62, 1.12, -2.6] },
  telephone: { pos: [1.75, 1.55, -1.75], target: [0.35, 1.05, -3.35] },
  dossiers: { pos: [0.55, 1.95, -2.05], target: [0.55, 0.78, -2.95] },
  agenda: { pos: [0.4, 2.2, 0.6], target: [0, 1.1, -3.0] },
  carte: { pos: [0, 2.05, -1.25], target: [0, 2.15, -5] },
  fenetre: { pos: [-4.1, 1.75, -1.6], target: [-8, 1.5, -2.7] },
  journal: { pos: [-3.0, 1.5, 1.6], target: [-4.15, 0.5, 0.05] },
  globe: { pos: [3.3, 1.55, 2.1], target: [4.6, 1.0, 0.75] },
  porte: { pos: [3.2, 1.7, 1.2], target: [6, 1.2, 2.6] },
  nuit: { pos: [3.8, 2.6, 3.6], target: [-0.5, 1.0, -2.8] },
};

export async function createStage(canvas, { quality = 2 } = {}) {
  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  const maxDpr = quality >= 2 ? 1.5 : quality === 1 ? 1.25 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);

  const room = buildRoom(scene, GEO);
  if (quality === 0) {
    room.lights.window.shadow.mapSize.set(1024, 1024);
    room.lights.deskSpot.castShadow = false;
  }
  const general = createGeneral();
  scene.add(general.root);
  const nav = createNav(room.colliders, ROOM);
  const post = createPost(renderer, scene, camera, quality);

  // ----- état du joueur -----
  const player = { x: SPOTS.start.x, z: SPOTS.start.z, face: SPOTS.start.face, path: [], arrive: null, speed: 0, seated: false };
  const keys = new Set();
  let locked = false;
  const api = { onInteract: null, onHover: null, onArrive: null, onMoveStart: null };

  // ----- caméra -----
  const cam = { mode: 'orbit', yaw: 0.4, pitch: 0.36, dist: 4.4, pos: new THREE.Vector3(2, 2.2, 3), look: new THREE.Vector3(0, 1.3, -2), shot: null, orbitT: 0 };
  camera.position.copy(cam.pos);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
    post.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  // ----- environnement réfléchi (la pièce elle-même) -----
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  function rebuildEnv() {
    general.root.visible = false;
    const old = envRT;
    envRT = pmrem.fromScene(scene, 0.0, 0.1, 30, { size: 256, position: new THREE.Vector3(0, 1.7, -0.8) });
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.6;
    general.root.visible = true;
    if (old) old.dispose();
  }

  // ----- entrées -----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = [];
  for (const [name, it] of Object.entries(room.interact)) for (const o of it.objects) o.traverse((m) => { if (m.isMesh) { m.userData.interact = name; pickables.push(m); } });
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit && hit.distance < 14) return { interact: hit.object.userData.interact };
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(floorPlane, p)) return { floor: p };
    return {};
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, button: e.button };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.moved && cam.mode === 'follow') {
        cam.yaw -= dx * 0.006;
        cam.pitch = Math.max(0.05, Math.min(1.1, cam.pitch + dy * 0.004));
      }
      drag.x = e.clientX; drag.y = e.clientY;
      return;
    }
    if (locked || e.pointerType !== 'mouse') return;
    const p = pick(e.clientX, e.clientY);
    const label = p.interact ? room.interact[p.interact].label : null;
    canvas.style.cursor = label ? 'pointer' : 'default';
    api.onHover?.(label, e.clientX, e.clientY, p.interact);
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasClick = !drag.moved && drag.button === 0;
    drag = null;
    if (!wasClick || locked) return;
    const p = pick(e.clientX, e.clientY);
    if (p.interact) api.onInteract?.(p.interact);
    else if (p.floor && cam.mode === 'follow') walkTo(p.floor.x, p.floor.z, null);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    if (cam.mode !== 'follow') return;
    cam.dist = Math.max(1.6, Math.min(7, cam.dist * (1 + Math.sign(e.deltaY) * 0.1)));
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // ----- déplacements -----
  function standUp() {
    if (!player.seated) return;
    player.seated = false;
    general.setSit(false);
    general.setTyping(false);
    player.z = Math.max(player.z, SPOTS.chair.z);
    player.x = SPOTS.chair.x + 0.55;
  }
  function walkTo(x, z, arrive) {
    standUp();
    player.path = nav.findPath(player.x, player.z, x, z);
    player.arrive = arrive;
    api.onMoveStart?.();
  }
  function goToSpot(name, arrive) {
    const s = SPOTS[name];
    const d = Math.hypot(player.x - s.x, player.z - s.z);
    if (name === 'chair' && player.seated) { arrive?.(); return; }
    if (d < 0.12) {
      player.path = [];
      player.face = s.face;
      if (name === 'chair') sit();
      arrive?.();
      return;
    }
    walkTo(s.x, s.z, () => {
      player.face = s.face;
      if (name === 'chair') sit();
      arrive?.();
    });
  }
  function sit() {
    player.seated = true;
    player.x = SPOTS.chair.x;
    player.z = SPOTS.chair.z;
    player.face = 0;
    general.setSit(true);
  }

  const angDamp = (a, b, rate, dt) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * (1 - Math.exp(-rate * dt));
  };

  function updatePlayer(dt) {
    let vx = 0, vz = 0;
    if (!locked && cam.mode === 'follow') {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      if (f || r) {
        if (player.seated) standUp();
        player.path = [];
        player.arrive = null;
        const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
        const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
        vx = fx * f + rx * r;
        vz = fz * f + rz * r;
        const l = Math.hypot(vx, vz);
        vx = (vx / l) * 2.0;
        vz = (vz / l) * 2.0;
      }
    }
    if (!vx && !vz && player.path.length) {
      const t = player.path[0];
      const dx = t.x - player.x, dz = t.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.06) {
        player.path.shift();
        if (!player.path.length) {
          const cb = player.arrive;
          player.arrive = null;
          cb?.();
        }
      } else {
        const sp = Math.min(1.9, d * 4 + 0.6);
        vx = (dx / d) * sp;
        vz = (dz / d) * sp;
      }
    }
    if (vx || vz) {
      player.x += vx * dt;
      player.z += vz * dt;
      const p = nav.resolve({ x: player.x, z: player.z });
      if (!player.path.length || Math.hypot(p.x - player.x, p.z - player.z) < 0.05) { player.x = p.x; player.z = p.z; }
      player.face = Math.atan2(vx, vz);
    }
    const speed = Math.hypot(vx, vz);
    player.speed = speed;
    const g = general.root;
    g.position.set(player.x, 0, player.z);
    g.rotation.y = angDamp(g.rotation.y, player.face, speed > 0 ? 10 : 6, dt);
    general.update(dt, speed);
  }

  // ----- caméra -----
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * (cam.mode === 'focus' ? 3.2 : 6));
    if (cam.mode === 'follow') {
      const tgt = tmp2.set(player.x, general.sitting ? 1.15 : 1.45, player.z);
      const cp = Math.cos(cam.pitch);
      tmp.set(tgt.x + Math.sin(cam.yaw) * cp * cam.dist, tgt.y + Math.sin(cam.pitch) * cam.dist, tgt.z + Math.cos(cam.yaw) * cp * cam.dist);
      tmp.x = Math.max(ROOM.x0 + 0.25, Math.min(ROOM.x1 - 0.25, tmp.x));
      tmp.z = Math.max(-4.35, Math.min(ROOM.z1 - 0.25, tmp.z));
      tmp.y = Math.max(0.5, Math.min(ROOM.h - 0.25, tmp.y));
      cam.pos.lerp(tmp, k);
      cam.look.lerp(tgt, k);
    } else if (cam.mode === 'focus' && cam.shot) {
      cam.pos.lerp(tmp.fromArray(cam.shot.pos), k);
      cam.look.lerp(tmp2.fromArray(cam.shot.target), k);
    } else if (cam.mode === 'orbit') {
      cam.orbitT += dt * 0.05;
      const a = cam.orbitT;
      tmp.set(Math.sin(a) * 3.6, 2.1 + Math.sin(a * 0.7) * 0.25, 1.2 + Math.cos(a) * 2.2);
      cam.pos.lerp(tmp, 1 - Math.exp(-dt * 1.5));
      cam.look.lerp(tmp2.set(0, 1.4, -2.8), 1 - Math.exp(-dt * 1.5));
    }
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
  }

  function nearestInteractable() {
    let best = null, bd = 1.35;
    for (const [name, it] of Object.entries(room.interact)) {
      const s = SPOTS[it.spot];
      const d = Math.hypot(player.x - s.x, player.z - s.z);
      if (d < bd) { bd = d; best = name; }
    }
    if (best && SPOTS[room.interact[best].spot] === SPOTS.chair) {
      return ['telephone', 'ordinateur', 'dossiers', 'agenda'];
    }
    return best ? [best] : [];
  }

  let elapsed = 0;
  function frame(dt) {
    elapsed += dt;
    updatePlayer(dt);
    updateCamera(dt);
    for (const f of room.dyn.anim) f(elapsed);
    post.render(elapsed);
  }

  Object.assign(api, {
    renderer, scene, camera, room, general, nav, post, player,
    frame, rebuildEnv, resize, walkTo, goToSpot, standUp, nearestInteractable,
    get locked() { return locked; },
    setLocked(v) { locked = v; if (v) keys.clear(); },
    focus(name) { cam.mode = 'focus'; cam.shot = SHOTS[name] || SHOTS.agenda; },
    follow() {
      if (cam.mode !== 'follow') {
        const dx = cam.pos.x - player.x, dz = cam.pos.z - player.z;
        cam.yaw = Math.atan2(dx, dz);
        cam.dist = Math.max(2.6, Math.min(5.2, Math.hypot(dx, dz)));
      }
      cam.mode = 'follow';
      cam.shot = null;
    },
    orbit() { cam.mode = 'orbit'; },
    get camMode() { return cam.mode; },
    snapCamera() { updateCamera(10); },
    keysDown: keys,
  });
  return api;
}
