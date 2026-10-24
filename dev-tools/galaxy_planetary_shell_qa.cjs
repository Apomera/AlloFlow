// Matched local real-Three WebGL captures; deterministic scene, no network assets.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/galaxy-spatial-exploration-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(file => fs.existsSync(file));
const tag = process.env.GALAXY_SHELL_TAG || 'after';
const source = process.env.GALAXY_SHELL_SOURCE || 'stem_lab/stem_tool_galaxy.js';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { tag, source, starCount: 5000, viewport: [1440, 1050], mode: 'visible', reducedMotion: true, browser: executablePath || 'bundled', captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => results.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
    await page.addStyleTag({ path: path.join(ROOT, css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    if (process.env.GALAXY_SHELL_PP !== 'off') {
      for (const file of ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']) await page.addScriptTag({ content: read('tmp/galaxy-spatial-pp/' + file) });
    }
    await page.evaluate(() => { window._galaxyPPLoaded = true; });
    await page.evaluate(() => {
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function (...args) {
        const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
        renderer.render = function (scene, camera) {
          const hiddenShells = [];
          if (window.__hidePlanetaryShells) scene.traverse(node => { if (node.name === 'inspectedPlanetaryGasShell') { hiddenShells.push([node, node.visible]); node.visible = false; } });
          const result = render(scene, camera), canvas = document.querySelector('[data-galaxy-canvas]');
          const selection = canvas?._galaxyGetInspectionState?.();
          if (selection?.kind === 'nebula' && scene.children.some(node => node.name === 'nebulae')) {
            const visible = node => { for (let current = node; current; current = current.parent) if (!current.visible) return false; return true; };
            const nebulae = scene.children.find(node => node.name === 'nebulae');
            const shapes = nebulae.children.filter(node => node.name === 'inspectedPlanetaryGasShell');
            const bounds = node => {
              const p = node.geometry.attributes.position, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
              for (let index = 0; index < p.count; index++) for (let axis = 0; axis < 3; axis++) { const n = p.array[index * 3 + axis]; min[axis] = Math.min(min[axis], n); max[axis] = Math.max(max[axis], n); }
              return { min, max };
            };
            window.__planetaryRender = {
              allocatedMeshes: shapes.length,
              centralSourceVisible: scene.children.find(node => node.name === 'inspectedStellarPointSpread')?.visible || false,
              shells: shapes.filter(visible).map(node => ({ owner: node.userData.nebulaName, kind: node.userData.component, triangles: node.geometry.attributes.position.count / 3, position: node.position.toArray(), rotation: [node.rotation.x, node.rotation.y, node.rotation.z], scale: node.scale.toArray(), bounds: bounds(node), color: node.material.uniforms.uColor.value.toArray(), opacity: node.material.uniforms.uOpacity.value })),
              billboardVisible: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNamedNebula' && node.userData.name === selection.label).some(visible),
              localWispsVisible: nebulae.children.filter(node => node.material?.map?.name === 'galaxyNebulaWisp' && node.userData.nebulaName === selection.label).filter(visible).length,
              postProcessingActive: !!canvas._bloomPass,
              calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length,
              memory: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures },
              allProgramsLinked: renderer.info.programs.every(program => renderer.getContext().getProgramParameter(program.program, renderer.getContext().LINK_STATUS))
            };
          }
          hiddenShells.forEach(([node, visible]) => { node.visible = visible; });
          return result;
        };
        return renderer;
      };
    });
    if (process.env.GALAXY_SHELL_HIDE === '1') await page.evaluate(() => { window.__hidePlanetaryShells = true; });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read(source) });
    await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection === 'function', null, { timeout: 60000 });
    await page.locator('[data-galaxy-control-tab="discover"]').click();
    const targets = await page.locator('[data-galaxy-nebula-target]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
    for (const [id, index] of [['helix', 4], ['ring', 5]]) {
      await page.locator('[data-galaxy-canvas]').evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, targets[index]);
      for (const angle of [0, 60]) {
        await page.locator('[data-galaxy-canvas]').evaluate((canvas, angle) => { canvas._galaxyOrbit.theta = Math.PI * .1 + angle * Math.PI / 180; canvas._galaxyOrbit.phi = Math.PI * .35; canvas._galaxyUpdateCam(); }, angle);
        await page.waitForTimeout(150);
        const image = tag + '-' + id + '-angle-' + angle + '-1440.png';
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled', timeout: 30000 });
        const state = await page.locator('[data-galaxy-canvas]').evaluate(canvas => ({ inspection: canvas._galaxyGetInspectionState(), visual: canvas._galaxyGetInspectionVisualState?.(), rendered: window.__planetaryRender }));
        if (tag.startsWith('after')) {
          assert.equal(state.rendered.allocatedMeshes, 4); assert.equal(state.rendered.shells.length, 2);
          assert.equal(state.rendered.billboardVisible, false); assert.equal(state.rendered.localWispsVisible, 0);
          assert.equal(state.rendered.centralSourceVisible, true); assert.equal(state.visual.starPsfVisible, false);
          assert(state.rendered.shells.reduce((sum, mesh) => sum + mesh.triangles, 0) <= 4896);
        }
        assert.equal(state.rendered.allProgramsLinked, true);
        results.captures.push({ id, angle, image, ...state });
        console.log(tag + '/' + id + '/' + angle);
      }
      await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyExitInspection());
    }
    for (const id of ['helix', 'ring']) {
      const a = results.captures.find(c => c.id === id && c.angle === 0), b = results.captures.find(c => c.id === id && c.angle === 60);
      assert.deepEqual(a.rendered.shells, b.rendered.shells, 'Shell geometry and orientation stay fixed while the camera orbits');
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, tag + '-shell-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
