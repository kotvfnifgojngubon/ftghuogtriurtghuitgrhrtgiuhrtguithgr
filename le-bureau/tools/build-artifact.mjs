// Construit une page autonome (dist/rue-de-la-loi.html) : code du jeu regroupé et inline,
// three.js chargé depuis jsDelivr (version figée), styles inline, polices Google Fonts.
// Option --local : three.js depuis ./vendor (pour tester hors ligne).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const local = process.argv.includes('--local');
const THREE = '0.187.0';
const map = local
  ? { three: '../vendor/three/three.module.js', 'three/addons/': '../vendor/three/addons/' }
  : { three: `https://cdn.jsdelivr.net/npm/three@${THREE}/build/three.module.js`, 'three/addons/': `https://cdn.jsdelivr.net/npm/three@${THREE}/examples/jsm/` };

const out = await build({
  entryPoints: [root + 'src/main.js'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  write: false,
  external: ['three', 'three/addons/*'],
  legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile(root + 'src/ui/style.css', 'utf8');
const html = await readFile(root + 'index.html', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="importmap">'));
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];

const page = `<title>Rue de la Loi</title>
<meta name="description" content="Jeu de stratégie politique narratif : gouverner la Belgique en crise sans quitter son bureau.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css}
</style>
${body.trim()}
<script type="importmap">
${JSON.stringify({ imports: map })}
</script>
<script type="module">
${js}
</script>
`;
await mkdir(root + 'dist', { recursive: true });
const file = root + (local ? 'dist/test.html' : 'dist/rue-de-la-loi.html');
await writeFile(file, local ? `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${page}</body></html>\n` : page);
console.log(`${file} : ${(page.length / 1024).toFixed(0)} Ko`);
