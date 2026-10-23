// Matched local WebGL close-ups at two orbit angles; no network assets.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-depth-context-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(file => fs.existsSync(file));
const tag = process.env.GALAXY_DEPTH_TAG || 'after';
const source = process.env.GALAXY_DEPTH_SOURCE || 'stem_lab/stem_tool_galaxy.js';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { tag, source, starCount: 5000, viewport: [1440, 1050], browser: executablePath || 'bundled', captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => results.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addStyleTag({ path: path.join(ROOT, css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      const OriginalRenderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new OriginalRenderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const result = render(scene, camera);
          const nebulae = scene.children.find(node => node.name === 'nebulae');
          const canvas = document.querySelector('[data-galaxy-canvas]');
          const selection = canvas?._galaxyGetInspectionState?.();
          if (nebulae && selection?.kind === 'nebula') {
            const actuallyVisible = node => { for (let current = node; current; current = current.parent) if (!current.visible) return false; return true; };
            const hiddenGroups = [], wisps = [];
            scene.traverse(node => { if (['resolvedOpenClusterCoronas', 'resolvedBipolarPlanetaryNebulae', 'resolvedSupernovaEjecta', 'resolvedCircumstellarNurseries', 'emissionLineStratification', 'stellarWindBowShocks'].includes(node.name)) hiddenGroups.push({ name: node.name, visible: actuallyVisible(node) }); });
            nebulae.children.filter(node => node.userData.nebulaName === selection.label && node.material?.map?.name === 'galaxyNebulaWisp').forEach(node => {
              const projected = node.position.clone().project(camera);
              wisps.push({ index: node.userData.localIndex ?? wisps.length, position: { x: node.position.x, y: node.position.y, z: node.position.z }, projected: { x: projected.x, y: projected.y }, opacity: node.material.opacity, scale: { x: node.scale.x, y: node.scale.y }, visible: actuallyVisible(node) });
            });
            window.__nebulaRender = { hiddenGroups, wisps, calls: renderer.info.render.calls };
          }
          return result;
        };
        return renderer;
      };
    });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read(source) });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection === 'function', null, { timeout: 60000 });
    await page.locator('[data-galaxy-control-tab="discover"]').click();
    const targets = await page.locator('[data-galaxy-nebula-target]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
    for (const [id, index] of [['orion', 0], ['helix', 4]]) {
      await page.locator('[data-galaxy-canvas]').evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, targets[index]);
      for (const angle of [0, 60]) {
        await page.locator('[data-galaxy-canvas]').evaluate((canvas, angle) => { canvas._galaxyOrbit.theta = Math.PI * .1 + angle * Math.PI / 180; canvas._galaxyOrbit.phi = Math.PI * .35; canvas._galaxyUpdateCam(); }, angle);
        await page.waitForTimeout(150);
        const image = tag + '-' + id + '-angle-' + angle + '-1440.png';
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled', timeout: 30000 });
        const state = await page.locator('[data-galaxy-canvas]').evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), visual: canvas._galaxyGetInspectionVisualState?.(), rendered: window.__nebulaRender }));
        if (tag === 'after') {
          assert.equal(state.visual.nebulaDepth.wisps.length, 3);
          assert(state.rendered.hiddenGroups.every(group => !group.visible));
          assert(state.rendered.wisps.every(wisp => wisp.visible));
        }
        results.captures.push({ id, angle, image, ...state });
        console.log(tag + '/' + id + '/' + angle);
      }
      await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyExitInspection());
    }
    for (const id of ['orion', 'helix']) {
      const first = results.captures.find(item => item.id === id && item.angle === 0), second = results.captures.find(item => item.id === id && item.angle === 60);
      assert.deepEqual(first.rendered.wisps.map(item => item.position), second.rendered.wisps.map(item => item.position), 'Cloud clumps remain in galaxy coordinates');
      assert(first.rendered.wisps.some((item, index) => Math.hypot(item.projected.x - second.rendered.wisps[index].projected.x, item.projected.y - second.rendered.wisps[index].projected.y) > .005), 'Orbit changes projected clump offsets');
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, tag + '-depth-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
