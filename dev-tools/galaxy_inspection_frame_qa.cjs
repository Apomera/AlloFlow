// Real local Three r128: selected mesh bounds, clear viewport, and backdrop restoration.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-closeup-framing-2026-10-22');
const read = file => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = [process.env.GALAXY_BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(file => fs.existsSync(file));
const tag = process.env.GALAXY_FRAME_TAG || 'after', source = process.env.GALAXY_FRAME_SOURCE || 'stem_lab/stem_tool_galaxy.js';
const fallback = process.env.GALAXY_FRAME_PP === 'off';
const widths = (process.env.GALAXY_FRAME_WIDTHS || '1440,390,320').split(',').map(Number);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { tag, source, starCount: 5000, quality: 'high', reducedMotion: true, postProcessing: !fallback, captures: [], errors: [] };
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: width > 600 ? 1050 : 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      page.on('pageerror', error => results.errors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()); });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#f4f6fb;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
      await page.evaluate(() => { let seed = 87931; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
      await page.addStyleTag({ path: path.join(ROOT, css) });
      for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
      if (!fallback) for (const file of ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js']) await page.addScriptTag({ content: read('tmp/galaxy-spatial-pp/' + file) });
      await page.evaluate(() => {
        window._galaxyPPLoaded = true;
        const Renderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = function (...args) {
          const renderer = new Renderer(...args), render = renderer.render.bind(renderer);
          renderer.render = function (scene, camera) {
            const result = render(scene, camera);
            if (!window.__captureInspectionFrame) return result;
            const nebulae = scene.children.find(node => node.name === 'nebulae');
            const canvas = document.querySelector('[data-galaxy-canvas]'), selection = canvas?._galaxyGetInspectionState?.();
            if (!nebulae || !selection?.active || selection.kind !== 'nebula') return result;
            const visible = node => { for (let current = node; current; current = current.parent) if (!current.visible) return false; return true; };
            const rect = canvas.getBoundingClientRect(), p = new THREE.Vector3();
            let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, vertexCount = 0;
            const meshes = nebulae.children.filter(node => ['inspectedPlanetaryGasShell', 'inspectedCrabStructure'].includes(node.name) && node.userData.nebulaName === selection.label && visible(node));
            meshes.forEach(node => {
              const positions = node.geometry.attributes.position;
              for (let index = 0; index < positions.count; index++) {
                p.set(positions.array[index * 3], positions.array[index * 3 + 1], positions.array[index * 3 + 2]).applyMatrix4(node.matrixWorld).project(camera);
                const x = (p.x + 1) * rect.width / 2, y = (1 - p.y) * rect.height / 2;
                left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); vertexCount++;
              }
            });
            window.__lastInspectionScene = scene;
            window.__inspectionFrameCapture = {
              canvas: { width: rect.width, height: rect.height },
              meshBounds: vertexCount ? { x: left, y: top, width: right - left, height: bottom - top } : null,
              vertices: vertexCount, meshes: meshes.map(node => ({ name: node.name, component: node.userData.component, triangles: node.geometry.attributes.position.count / 3 })),
              visibleRoots: scene.children.filter(visible).map(node => node.name || node.type),
              visibleNebulaOwners: nebulae.children.filter(node => node.name !== 'stellarFeedbackMicrostructure' && visible(node)).map(node => node.userData.nebulaName || node.userData.name || ''),
              visibleFeedbackOwners: nebulae.children.find(node => node.name === 'stellarFeedbackMicrostructure').children.filter(visible).map(node => node.userData.nebulaName || ''),
              calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length,
              allProgramsLinked: renderer.info.programs.every(program => renderer.getContext().getProgramParameter(program.program, renderer.getContext().LINK_STATUS)),
            };
            window.__captureInspectionFrame = false;
            return result;
          };
          return renderer;
        };
      });
      await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
      await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: read(source) });
      await page.evaluate(() => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyQuality: 'high', galaxyAutoRotate: false }));
      await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._galaxyInspectSelection === 'function', null, { timeout: 60000 });
      await page.locator('[data-galaxy-control-tab="discover"]').click();
      const targets = await page.locator('[data-galaxy-nebula-target]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-galaxy-nebula-target')));
      async function capture(id, variant, fitExpected) {
        await page.locator('[data-galaxy-stage]').scrollIntoViewIfNeeded();
        await page.evaluate(() => { window.__captureInspectionFrame = true; });
        await page.waitForFunction(() => window.__captureInspectionFrame === false, null, { timeout: 30000 });
        const state = await page.locator('[data-galaxy-canvas]').evaluate(canvas => {
          const rect = canvas.getBoundingClientRect(), stage = canvas.closest('[data-galaxy-stage]');
          const selectors = '[data-galaxy-selection-dock],[data-galaxy-camera-controls],[data-galaxy-orientation-display],[data-galaxy-live-scale],[data-galaxy-spectral-legend],[data-galaxy-observe-readout]';
          const overlays = [...stage.querySelectorAll(selectors)].filter(node => { const style = getComputedStyle(node), r = node.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && r.width > 1 && r.height > 1; }).map(node => { const r = node.getBoundingClientRect(); return { selector: [...node.attributes].find(a => a.name.startsWith('data-galaxy-'))?.name, x: r.left - rect.left, y: r.top - rect.top, width: r.width, height: r.height }; });
          return { inspection: canvas._galaxyGetInspectionState(), framing: canvas._galaxyGetObjectFramingState?.(), backdrop: canvas._galaxyGetInspectionBackdrop?.(), rendered: window.__inspectionFrameCapture, overlays };
        });
        assert.equal(state.rendered.allProgramsLinked, true);
        if (fitExpected) {
          const b = state.rendered.meshBounds, roi = state.framing.roi;
          assert(b && roi, 'Actual mesh bounds and cached ROI must exist');
          assert(b.x >= roi.x - 2 && b.y >= roi.y - 2 && b.x + b.width <= roi.x + roi.width + 2 && b.y + b.height <= roi.y + roi.height + 2, 'Complete selected geometry must fit the clear viewport');
          for (const overlay of state.overlays) {
            const overlap = Math.min(b.x + b.width, overlay.x + overlay.width) - Math.max(b.x, overlay.x) > 1 && Math.min(b.y + b.height, overlay.y + overlay.height) - Math.max(b.y, overlay.y) > 1;
            assert.equal(overlap, false, 'Selected geometry must clear ' + overlay.selector);
          }
        }
        if (variant === 'isolated') {
          assert(state.rendered.visibleRoots.every(name => ['nebulae', 'selectionFocusReticle', 'selectionDepthReticle', 'inspectedStellarPointSpread', 'PerspectiveCamera'].includes(name)));
          assert(state.rendered.visibleNebulaOwners.every(name => name === state.inspection.label));
          assert(state.rendered.visibleFeedbackOwners.every(name => name === state.inspection.label));
        }
        const image = tag + '-' + id + '-' + variant + '-' + width + (fallback ? '-fallback' : '') + '.png';
        await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, image), animations: 'disabled', timeout: 30000 });
        results.captures.push({ id, viewport: width, variant, image, ...state });
        console.log(tag + '/' + width + '/' + id + '/' + variant);
        return state;
      }
      for (const [id, index] of [['ring', 5], ['crab', 2], ['helix', 4]]) {
        await page.locator('[data-galaxy-canvas]').evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._galaxyOrbit.theta = Math.PI * .1; canvas._galaxyOrbit.phi = Math.PI * .35; canvas._galaxyUpdateCam(); }, targets[index]);
        await page.waitForTimeout(250);
        if (tag !== 'before') {
          await page.locator('[data-galaxy-canvas]').evaluate(canvas => { assertFrame = canvas._galaxyFrameObject(); if (!assertFrame) throw new Error('Frame action unavailable'); });
          await page.waitForTimeout(250);
        }
        const context = await capture(id, 'context', tag !== 'before');
        if (tag !== 'before') {
          await page.evaluate(() => { window.__inspectionVisibilityBaseline = []; window.__lastInspectionScene.traverse(node => window.__inspectionVisibilityBaseline.push([node, node.visible])); });
          await page.locator('[data-galaxy-canvas]').evaluate(canvas => { if (!canvas._galaxySetInspectionBackdrop(false)) throw new Error('Backdrop unavailable'); });
          await page.waitForTimeout(100);
          const isolated = await capture(id, 'isolated', true);
          assert.deepEqual(isolated.inspection.camera, context.inspection.camera, 'Backdrop keeps camera fixed');
          assert.deepEqual(isolated.rendered.meshBounds, context.rendered.meshBounds, 'Backdrop keeps shape framing fixed');
          assert(await page.evaluate(() => window.__inspectionVisibilityBaseline.every(([node, visible]) => node.visible === visible)), 'Temporary visibility must restore after every render');
          await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxySetInspectionBackdrop(true));
        }
        await page.locator('[data-galaxy-canvas]').evaluate(canvas => canvas._galaxyExitInspection());
      }
      if (width === 1440 && tag !== 'before') for (const [id, index] of [['orion', 0], ['horsehead', 6]]) {
        await page.locator('[data-galaxy-canvas]').evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); canvas._galaxySetInspectionBackdrop(false); }, targets[index]);
        await page.waitForTimeout(150); await capture(id, 'isolated', false);
        await page.locator('[data-galaxy-canvas]').evaluate(canvas => { canvas._galaxySetInspectionBackdrop(true); canvas._galaxyExitInspection(); });
      }
      await page.close();
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(OUT, tag + (fallback ? '-fallback' : '') + '-frame-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
