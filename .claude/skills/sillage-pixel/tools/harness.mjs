// Harnais commun : charge Sillage Stellaire dans Chromium sans écran, sans lancer la boucle du jeu,
// et donne accès à tout son moteur (variables et fonctions internes) par window.__SS(code).
//
//   import { openGame } from './harness.mjs';
//   const g = await openGame();               // jeu par défaut : jeu/Sillage_Stellaire.html
//   const n = await g.ev('MODELS.length');    // code évalué DANS la fermeture du jeu
//   await g.close();
//
// Le hasard est rendu reproductible (Math.random remplacé par un générateur à graine) : deux rendus
// avec la même graine donnent les mêmes pixels.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

// require() trouve aussi un Playwright installé globalement (NODE_PATH), ce que import ne fait pas
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright manque : lance « npm i -D playwright && npx playwright install chromium » à la racine du projet.'); process.exit(2); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../../../..');
export const DEFAULT_GAME = process.env.SILLAGE_GAME || path.join(ROOT, 'jeu', 'Sillage_Stellaire.html');
export const RECORDS = path.join(ROOT, 'records');

// la toute dernière ligne du script principal : on y glisse la porte d'accès au moteur
const ANCHOR = 'if(hot&&hot.ready)hot.ready(boot);else boot((hot&&hot.data)||{});';
const HOOK = 'window.__SS=function(__src){return eval(__src);};';

export function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), nx = argv[i + 1];
      if (nx === undefined || nx.startsWith('--')) o[k] = true; else { o[k] = nx; i++; }
    } else o._.push(a);
  }
  return o;
}

export async function openGame({ game = DEFAULT_GAME, seed = 1, run = false, width = 960, height = 540 } = {}) {
  if (!fs.existsSync(game)) throw new Error(`Jeu introuvable : ${game} (passe --game <fichier.html> ou SILLAGE_GAME)`);
  const src = fs.readFileSync(game, 'utf8');
  const at = src.lastIndexOf(ANCHOR);
  if (at < 0) throw new Error('Point d’ancrage introuvable dans le jeu : la fin du script principal a changé (voir ANCHOR dans harness.mjs).');
  const patched = src.slice(0, at) + HOOK + src.slice(at);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sillage-'));
  const file = path.join(dir, 'jeu.html');
  fs.writeFileSync(file, patched);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  // pas de réseau : polices et autres ressources externes coupées (le jeu a ses propres polices bitmap)
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(({ seed, run }) => {
    let s = seed >>> 0 || 1;
    window.__seed = v => { s = v >>> 0 || 1; };
    Math.random = function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    if (!run) window.requestAnimationFrame = () => 0; // la boucle du jeu ne tourne pas : c'est l'outil qui fait avancer le temps
    try { localStorage.clear(); } catch (e) {}
  }, { seed, run });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__SS === 'function', null, { timeout: 30000 });

  const ev = async (code) => page.evaluate(c => {
    const r = window.__SS(c);
    return r && typeof r.then === 'function' ? r : r;
  }, code);
  // installe un module d'outils dans la fermeture du jeu (une expression de fonction qui reçoit rien et renvoie un objet)
  const install = async (name, fnSource) => page.evaluate(([n, s]) => { window[n] = window.__SS('(' + s + ')()'); return Object.keys(window[n]); }, [name, fnSource]);
  const close = async () => { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { page, ev, install, close, errors };
}

// le jeu, plus le studio installé dans sa fermeture : st(code) évalue avec STU = le studio
export async function openStudio(opts = {}) {
  const g = await openGame(opts);
  const src = fs.readFileSync(path.join(HERE, 'studio.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '').trim();
  await g.install('STU', src);
  // la fonction est fabriquée par eval DANS la fermeture du jeu : le code voit STU, A et tout le moteur
  g.st = async (code, arg) => g.page.evaluate(([c, a]) => window.__SS('(function(STU,A){return (' + c + ');})')(window.STU, a), [code, arg]);
  return g;
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function writeDataUrl(file, dataUrl) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return file;
}
export function rel(p) { return path.relative(process.cwd(), p) || p; }
