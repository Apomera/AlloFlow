#!/usr/bin/env node
// Geometry World on real WebGL, from the command line.
//
// dev-tools/stem_tool_shot.cjs never gets past this tool's loading screen: the
// voxel engine needs three.js and a GL context, and the shot harness has neither
// for it. This runner lifts the harness out of tests/e2e/18-geometry-world-gl.spec.ts
// (so the two cannot drift), serves the WORKING TREE on an ephemeral port with
// React and three from the tree (no network), launches Chromium on SwiftShader,
// mounts the tool, and then either screenshots it or runs a probe script inside
// the page and prints its JSON result.
//
//   node dev-tools/geometry_world_gl_probe.mjs --mode sandbox --out scratch/gw.png
//   node dev-tools/geometry_world_gl_probe.mjs --mode sandbox --blocks '[[3,1,3,"stone","cube",0]]' \
//        --camera 8.5,4.2,8.5,4.5,1.6,4 --out scratch/build.png
//   node dev-tools/geometry_world_gl_probe.mjs --mode lesson --preset night --out scratch/night.png
//   node dev-tools/geometry_world_gl_probe.mjs --mode sandbox --blocks ... --pre printable_model_module.js \
//        --eval scratch/inspect.js          # the file's last expression is returned as JSON
//
// --mode      lesson (default world) | sandbox (Free Build, waits for the builder to load it)
// --blocks    JSON array of [x,y,z,type,shape,rotation], placed through engine.placeBlock
// --camera    x,y,z,tx,ty,tz  position and look-at target
// --preset    day | sunrise | sunset | night | golden  (waits for the fade to land)
// --pre       comma-separated extra scripts served from the tree, loaded before the tool
// --eval      a JS file evaluated in the page after setup; window.__geoWorldEngine is live
// --viewport  WxH (default 1280x800)
// --out       PNG path
//
// Traps: mount with the sandbox and place blocks BEFORE the builder has loaded
// its lesson and they are wiped (this waits for engine._currentLesson.sandbox).
// The software renderer clamps the frame step, so a preset fade takes several
// seconds here; wait on engine._envDone, not the clock. Do not run this while a
// Playwright suite is running on the same machine.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1]; if (v && !v.startsWith('--')) { args[k] = v; i += 1; } else args[k] = true; }
}
const mode = args.mode || 'lesson';
const [vw, vh] = String(args.viewport || '1280x800').split('x').map(Number);

const MIME = { '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const spec = readFileSync(join(ROOT, 'tests/e2e/18-geometry-world-gl.spec.ts'), 'utf8');
const match = spec.match(/const HARNESS = `([\s\S]*?)`;\n/);
if (!match) { console.error('HARNESS not found in the e2e spec'); process.exit(2); }
let HARNESS = match[1];
if (args.pre) {
  const tags = String(args.pre).split(',').map((p) => `<script src="/${p.trim().replace(/^\/+/, '')}"></script>`).join('\n');
  HARNESS = HARNESS.replace('<script src="/stem_lab/stem_tool_geometryworld.js"></script>', tags + '\n<script src="/stem_lab/stem_tool_geometryworld.js"></script>');
}

const server = createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/__harness') { res.writeHead(200, { 'content-type': MIME['.html'] }); res.end(HARNESS); return; }
  try {
    const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
page.on('pageerror', (err) => console.error('[pageerror]', String(err).slice(0, 300)));
page.on('console', (msg) => { if (msg.type() === 'error') console.error('[console.error]', msg.text().slice(0, 300)); });

try {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!window.StemLab?._registry?.geometryWorld);
  const bucket = mode === 'sandbox'
    ? { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', _introShownOnce: true, _mobileDismissed: true }
    : { _introShownOnce: true, _mobileDismissed: true, worldActive: true, tutorialDismissed: true };
  await page.evaluate((b) => window.__mount(b), bucket);
  await page.waitForFunction(() => !!window.__geoWorldEngine, null, { timeout: 30000 });
  if (mode === 'sandbox') {
    await page.waitForFunction(() => { const en = window.__geoWorldEngine; return !!(en && en._currentLesson && en._currentLesson.sandbox === true); }, null, { timeout: 30000 });
  }
  await page.waitForTimeout(900);

  if (args.blocks) {
    const placed = await page.evaluate((list) => {
      const en = window.__geoWorldEngine;
      list.forEach(([x, y, z, type, shape, rot]) => en.placeBlock(x, y, z, type || 'stone', shape || 'cube', rot || 0));
      return Object.keys(en.blocks).filter((k) => { const u = en.blocks[k].userData || {}; return !u._lessonBlock && u.blockType !== 'grass'; }).length;
    }, JSON.parse(String(args.blocks)));
    console.error('student blocks:', placed);
  }
  if (args.camera) {
    const c = String(args.camera).split(',').map(Number);
    await page.evaluate((c) => {
      const en = window.__geoWorldEngine;
      en.camera.position.set(c[0], c[1], c[2]); en.camera.lookAt(c[3], c[4], c[5]);
      en.euler.setFromQuaternion(en.camera.quaternion); en.velocity.set(0, 0, 0); en.camera.updateMatrixWorld(true);
    }, c);
  }
  if (args.preset) {
    await page.evaluate(() => { const btn = Array.from(document.querySelectorAll('button')).find((b) => /Menu/.test(b.textContent || '')); if (btn) btn.click(); });
    await page.waitForTimeout(350);
    const ok = await page.evaluate((key) => {
      const sel = Array.from(document.querySelectorAll('select')).find((s) => Array.from(s.options).some((o) => o.value === 'night'));
      if (!sel) return false;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, key);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, String(args.preset));
    if (!ok) console.error('preset select not found');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const close = document.querySelector('.gw-settings-header button, [aria-label*="Close"]'); if (close) close.click(); });
    await page.waitForFunction(() => !!(window.__geoWorldEngine && window.__geoWorldEngine._envDone), null, { timeout: 20000 }).catch(() => console.error('preset fade did not finish'));
  }
  await page.waitForTimeout(700);
  if (args.out) { await page.screenshot({ path: String(args.out) }); console.error('wrote', args.out); }
  if (args.eval) {
    const code = readFileSync(String(args.eval), 'utf8');
    const result = await page.evaluate((src) => (0, eval)(src), code);
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await browser.close();
  server.close();
}
