// Deterministic local Three.js image comparison. Optional baseline source path:
// GALAXY_BASELINE_PATH=tmp/galaxy-scene-audit/before.js node dev-tools/galaxy_scene_refinement_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-scene-refinement-2026-10-18');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(file => fs.existsSync(file));
const sources = [];
if (process.env.GALAXY_BASELINE_PATH && !process.argv.includes('--inspection-only')) sources.push({ id: 'before', file: process.env.GALAXY_BASELINE_PATH });
sources.push({ id: 'after', file: 'stem_lab/stem_tool_galaxy.js' });
const shapes = process.argv.includes('--quick') ? ['barredSpiral', 'elliptical'] : ['barredSpiral', 'grandDesign', 'elliptical', 'irregular'];
const modes = process.argv.includes('--quick') ? ['visible'] : ['visible', 'infrared', 'xray'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { browser: executablePath || 'bundled Chromium', viewport: [1440, 1050], reducedMotion: true, errors: [], runs: [] };
  function save() { fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2) + '\n'); }
  try {
    for (const source of sources) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      page.on('pageerror', error => results.errors.push({ source: source.id, error: String(error) }));
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}[data-galaxy-stage]>:not(canvas){visibility:hidden!important}</style></head><body><main id="slot"></main></body></html>');
      await page.addStyleTag({ path: path.join(ROOT, css) });
      for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
      await page.evaluate(() => {
        const originalRaf = requestAnimationFrame.bind(window);
        window.__auditFrames = [];
        window.requestAnimationFrame = function (callback) {
          return originalRaf(function (timestamp) {
            const start = performance.now(); callback(timestamp);
            if (callback.name === 'animate') {
              window.__auditFrames.push(performance.now() - start);
              if (window.__auditFrames.length > 40) window.__auditFrames.shift();
            }
          });
        };
        const OriginalRenderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = function (...args) {
          const renderer = new OriginalRenderer(...args), originalRender = renderer.render.bind(renderer);
          renderer.render = function (scene, camera) {
            const result = originalRender(scene, camera);
            if (scene.children.length > 20) window.__auditDraw = { calls: renderer.info.render.calls, points: renderer.info.render.points, lines: renderer.info.render.lines, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
            return result;
          };
          return renderer;
        };
      });
      await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
      await page.addScriptTag({ content: shell });
      await page.addScriptTag({ content: read(source.file) });
      async function mount(shape, count = 5000) {
        await page.evaluate(({ shape, count }) => {
          let seed = 123456789;
          Math.random = () => { seed = (1103515245 * seed + 12345) % 2147483648; return seed / 2147483648; };
          window.__auditFrames = [];
          window.__mount({ simMode: 'galaxy', starCount: count, galaxyQuality: 'high', galaxyAutoRotate: false, galaxyType: shape, layers: { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, dust: true, gas: true, grid: false, labels: false } });
        }, { shape, count });
        await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyGetAdaptiveVisualState === 'function', null, { timeout: 60000 });
        await page.waitForTimeout(450);
      }
      async function capture(shape, mode, count, suffix = '') {
        const filename = source.id + '-' + shape + '-' + mode + '-' + count + suffix + '.png';
        const png = await page.locator('[data-galaxy-canvas]').screenshot({ path: path.join(OUT, filename), animations: 'disabled', timeout: 30000 });
        const stats = await page.evaluate(async b64 => {
          const img = new Image();
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = 'data:image/png;base64,' + b64; });
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const g = canvas.getContext('2d'); g.drawImage(img, 0, 0);
          const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
          let clipped = 0, near = 0, lit = 0, colorful = 0, bright = 0, brightColorful = 0, saturation = 0, bodyLuma = 0, bodyN = 0;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2], lo = Math.min(r, g, b), hi = Math.max(r, g, b), sat = hi ? (hi - lo) / hi : 0;
            if (lo >= 250) clipped++; if (lo >= 235) near++;
            if (hi >= 40) { lit++; saturation += sat; if (sat >= 0.18) colorful++; }
            if (hi >= 120) { bright++; if (sat >= 0.18) brightColorful++; }
            if (x > canvas.width * .15 && x < canvas.width * .85 && y > canvas.height * .25 && y < canvas.height * .8) { bodyLuma += .2126 * r + .7152 * g + .0722 * b; bodyN++; }
          }
          const n = canvas.width * canvas.height, cv = document.querySelector('[data-galaxy-canvas]');
          const frames = window.__auditFrames.slice().sort((a, b) => a - b);
          return { resolution: [canvas.width, canvas.height], clipPct: clipped / n * 100, nearWhitePct: near / n * 100, litPct: lit / n * 100, coloredLitPct: lit ? colorful / lit * 100 : 0, coloredBrightPct: bright ? brightColorful / bright * 100 : 0, meanLitSaturation: lit ? saturation / lit : 0, bodyMeanLuma: bodyLuma / bodyN, frameCpuMedianMs: frames[Math.floor(frames.length / 2)] ?? null, draw: window.__auditDraw || null, adaptive: cv._galaxyGetAdaptiveVisualState() };
        }, png.toString('base64'));
        assert(stats.litPct > .01, 'Rendered signal must be visible');
        results.runs.push({ source: source.id, shape, mode, count, suffix, image: filename, ...stats }); save();
        console.log(source.id + '/' + shape + '/' + mode + '/' + count + suffix + ': clip ' + stats.clipPct.toFixed(3) + '%; bright color ' + stats.coloredBrightPct.toFixed(1) + '%; body luma ' + stats.bodyMeanLuma.toFixed(2));
      }
      if (process.argv.includes('--inspection-only')) {
        await mount('barredSpiral');
        await page.locator('[data-galaxy-control-tab="discover"]').click();
        await page.locator('[data-galaxy-nebula-target]').last().click();
        await page.evaluate(() => document.querySelector('[data-galaxy-canvas]')._galaxyInspectSelection());
        await page.waitForFunction(() => document.querySelector('[data-galaxy-canvas]')._galaxyGetInspectionState().active);
        await page.waitForTimeout(300);
        await capture('barredSpiral', 'visible', 5000, '-lagoon-inspection');
        if (!process.argv.includes('--inspection-final')) for (const layer of ['dust', 'gas', 'bgStars']) {
          await page.evaluate(layer => document.querySelector('[data-galaxy-canvas]')._setLayerVisibility(layer, false), layer);
          await page.waitForTimeout(100); await capture('barredSpiral', 'visible', 5000, '-lagoon-without-' + layer);
          await page.evaluate(layer => document.querySelector('[data-galaxy-canvas]')._setLayerVisibility(layer, true), layer);
        }
        await page.addStyleTag({ content: '[data-galaxy-stage]>:not(canvas){visibility:visible!important}' });
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'final-lagoon-inspection-1440.png'), animations: 'disabled' });
        await page.close(); continue;
      }
      for (const shape of shapes) {
        await mount(shape);
        for (const mode of modes) {
          await page.evaluate(mode => document.querySelector('[data-galaxy-canvas]')._setObserveMode(mode), mode);
          await page.waitForTimeout(200);
          await capture(shape, mode, 5000);
        }
      }
      await mount('barredSpiral', 25000); await capture('barredSpiral', 'visible', 25000);
      await page.evaluate(() => document.querySelector('[data-galaxy-canvas]')._galaxySetZoomPosition(90));
      await page.waitForTimeout(200); await capture('barredSpiral', 'visible', 25000, '-close');
      await page.close();
    }
    assert.deepEqual(results.errors, []); save();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
