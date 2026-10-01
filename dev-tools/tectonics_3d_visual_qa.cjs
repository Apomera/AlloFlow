'use strict';

// Real local Three r128 + React + Chromium. No WebGL mocks and no CDN.
// PT_TEST_SOURCE can point to a saved earlier source for before/after review.
// Run `node dev-tools/tectonics_3d_visual_qa.cjs --before` for baseline captures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = process.cwd();
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const before = process.argv.includes('--before');
const final = process.argv.includes('--final');
const controlsOnly = process.argv.includes('--controls-only');
const sourcePath = process.env.PT_TEST_SOURCE || (before ? 'scratch/tectonics-3d-review/before.js' : 'stem_lab/stem_tool_platetectonics.js');
const source = read(sourcePath);
const out = path.join(root, 'scratch', 'tectonics-3d-review', before ? 'before' : final ? 'final' : 'after');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], glErrors = [], checks = [], captures = [], diagnostics = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', message => {
      if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) glErrors.push(message.text());
    });
    await page.setContent('<!doctype html><html lang="en"><head><title>Plate boundary 3D visual review</title></head><body style="margin:0;font-family:system-ui"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(p) });
    await page.evaluate(() => { StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const submit = window.__alloTectGL.submit;
      window.__alloTectGL.submit = model => {
        window.qaLatestModel = model;
        return submit.call(window.__alloTectGL, model);
      };
      window.qaShallowFixture = () => window.__alloTectGL.submit({
        ...window.qaLatestModel,
        // Known internal hypocentre on the 45-degree slab and in the half
        // retained by the cutaway. Only the input data is controlled: the real
        // materials, clipping, renderer, and annotation ordering are exercised.
        quakes: [{ depthKm: 30, distKm: 30, strikeKm: -100, m: 5, age: 0 }],
        sig: window.qaLatestModel.sig + '|qa-shallow-fixture'
      });
      const root = ReactDOM.createRoot(document.getElementById('wrap'));
      let generation = 0;
      window.qaMount = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        ReactDOM.flushSync(() => root.render(React.createElement(window.AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, isContrast: false, announceToSR: () => {}, addToast: () => {}
        })));
      };
      window.qaDestroy = () => ReactDOM.flushSync(() => root.unmount());
      window.qaDebug = () => window.__alloTectGL && window.__alloTectGL.debug();
      window.qaCut = pct => {
        const input = document.getElementById('tect-cut');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(pct));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
    });
    const canvas = page.locator('canvas[data-tect-gl="true"]');
    const debug = () => page.evaluate(() => qaDebug());
    async function click(selector) { await page.locator(selector).evaluate(n => n.click()); }
    async function test(name, fn) {
      try { const detail = await fn(); checks.push({ name, passed: true, detail }); console.log('PASS:', name); }
      catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL:', name, error.message); }
    }
    async function mount(dark, width) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMount(dark), dark);
      await page.waitForSelector('[data-tect-view="3d"]');
      await click('[data-tect-view="3d"]');
      await canvas.waitFor();
      await page.waitForFunction(() => qaDebug()?.state === 'ready');
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    async function mode(value) {
      await click(`[data-tect-mode="${value}"]`);
      await page.waitForFunction(value => qaDebug()?.mode === value, value);
      await page.waitForTimeout(350);
    }
    async function capture(name) {
      await canvas.scrollIntoViewIfNeeded();
      await canvas.screenshot({ path: path.join(out, `${name}.png`) });
      const state = await debug();
      const layout = await canvas.evaluate(n => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, viewport: innerWidth,
          sectionVisibility: getComputedStyle(document.querySelector('[data-tect-section]')).visibility,
          canvasCount: document.querySelectorAll('[data-tect-gl]').length,
          horizontalPageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      captures.push({ name, state, layout });
      console.log('CAPTURE:', name);
      if (!before) await test(`${name}: labels stay readable, inside the canvas, and separate`, async () => {
        assert.ok(state.labelRects.length >= 4, 'Every model needs its four depth labels');
        for (const label of state.labelRects) {
          assert.ok(label.height >= (layout.viewport <= 390 ? 19 : 17), `${label.text} label is too small`);
          assert.ok(label.x >= -0.1 && label.y >= -0.1 && label.x + label.width <= layout.width + 0.1 && label.y + label.height <= layout.height + 0.1, `${label.text} is outside the canvas`);
        }
        for (let i = 0; i < state.labelRects.length; i++) for (let j = i + 1; j < state.labelRects.length; j++) {
          const a = state.labelRects[i], b = state.labelRects[j];
          const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          assert.ok(dx <= 1 || dy <= 1, `Labels overlap: ${a.text} / ${b.text} (${dx.toFixed(1)} × ${dy.toFixed(1)} px)`);
        }
        return state.labelRects;
      });
      return { state, layout };
    }

    if (!controlsOnly) for (const dark of [false, true]) {
      for (const width of [1100, 390]) {
        const tag = `${dark ? 'dark' : 'light'}-${width}`;
        await mount(dark, width);
        for (const name of ['convergent', 'divergent', 'transform']) {
          await mode(name);
          const { state, layout } = await capture(`${tag}-${name}`);
          await test(`${tag} ${name}: real geometry, one visible canvas, responsive size`, async () => {
            assert.equal(state.state, 'ready'); assert.equal(state.contextLost, false);
            assert.equal(state.hasSlab, name === 'convergent');
            assert.equal(state.plateCount, name === 'divergent' ? 3 : 2);
            assert.ok(state.scaleCount >= 8, 'Depth scale must exist');
            if (!before) {
              assert.equal(state.motionArrows.length, 2, 'Both plates must have motion arrows');
              const [a, b] = state.motionArrows;
              if (name === 'transform') {
                assert.ok(a.z * b.z < 0 && a.x === 0 && b.x === 0, 'Transform arrows must oppose along strike');
                assert.equal(state.markerCount, 4, 'Matching surface markers make transform offset visible');
              } else {
                assert.equal(state.markerCount, 0);
                assert.ok(a.x * b.x < 0 && a.z === 0 && b.z === 0, 'Arrows must oppose across the boundary');
                assert.ok(name === 'convergent' ? a.x > 0 : a.x < 0, 'Plate A must move toward/away from Plate B for the selected boundary');
              }
              assert.equal(state.visibleCutFaces, 0, 'Uncut view must not show interior cut caps');
            }
            assert.equal(layout.canvasCount, 1); assert.equal(layout.sectionVisibility, 'hidden');
            assert.ok(layout.width >= 200 && layout.width <= width, '3D canvas must fit its viewport');
            assert.equal(layout.horizontalPageOverflow, false, 'The page must not overflow horizontally');
            return { plateCount: state.plateCount, hasSlab: state.hasSlab, canvas: layout };
          });
          if (final && !dark && width === 1100 && name === 'convergent') {
            await test('known shallow earthquake renders inside rock and in the retained cutaway', async () => {
              await page.evaluate(() => qaShallowFixture());
              await page.waitForFunction(() => qaDebug().quakeCount === 1);
              const shallow = await capture(`${tag}-convergent-shallow-fixture`);
              assert.deepEqual(shallow.state.slabSample, [{ depthKm: 30, distKm: 30 }]);
              await page.evaluate(() => qaCut(0));
              await page.waitForFunction(() => qaDebug().clipConstant === 0);
              await page.evaluate(() => qaShallowFixture());
              await page.waitForFunction(() => qaDebug().quakeCount === 1);
              await capture(`${tag}-convergent-shallow-fixture-cutaway`);
              await page.evaluate(() => qaCut(100));
              await page.waitForFunction(() => qaDebug().clipConstant > 1000);
              return { fixture: true, depthKm: 30, distKm: 30, strikeKm: -100, magnitude: 5 };
            });
          }
        }
        await mode('convergent');
        await page.evaluate(() => qaCut(0));
        await page.waitForFunction(() => Math.abs(qaDebug()?.clipConstant || 0) < 0.001);
        await page.waitForTimeout(300);
        const cut = await capture(`${tag}-convergent-cutaway`);
        await test(`${tag}: cutaway retains slab and drives clipping plane`, async () => {
          assert.equal(cut.state.hasSlab, true); assert.equal(cut.state.clipConstant, 0);
          if (!before) {
            assert.ok(cut.state.visibleCutFaces >= 2, 'Cutaway must have solid plate faces');
            assert.ok(cut.state.cutFaceDepths.every(z => Math.abs(z) < 0.05), 'Cut caps must meet the clipping plane');
            assert.equal(cut.state.scaleFaceZ, 0, 'Depth scale must follow the exposed section');
          }
          return cut.state;
        });
        await page.locator('#pt-boundary-simulator').screenshot({ path: path.join(out, `${tag}-ui.png`) });
        if (!before && !dark) {
          const start = await debug();
          await click('[aria-label="Turn left"]');
          await page.waitForFunction(camera => JSON.stringify(qaDebug().camera) !== JSON.stringify(camera), start.camera);
          await click('[aria-label="Tilt up"]');
          await page.waitForTimeout(400);
          await capture(`${tag}-convergent-rotated`);
        }
      }
    }
    if (controlsOnly) {
      await mount(true, 390); await mode('convergent');
      await page.evaluate(() => qaCut(0));
      await page.waitForFunction(() => qaDebug().clipConstant === 0);
    }
    if (!before) await test('a paused 3D model reuses its geology on animation frames', async () => {
      const start = await debug(); await page.waitForTimeout(700); const end = await debug();
      assert.equal(end.geometryBuilds, start.geometryBuilds); return { before: start.geometryBuilds, after: end.geometryBuilds };
    });
    await test('keyboard rotation and Home change and restore camera without changing geology', async () => {
      await page.evaluate(() => {
        window.qaKeys = [];
        document.addEventListener('keydown', e => qaKeys.push({ key: e.key, target: e.target.tagName, view: e.target.getAttribute('data-tect-view') }), true);
      });
      const trace = async stage => {
        const info = await page.evaluate(() => ({
          camera: qaDebug().camera, canvas: qaDebug().canvas,
          focus: { tag: document.activeElement.tagName, view: document.activeElement.getAttribute('data-tect-view') },
          domView: document.querySelector('[data-tect-gl]').getAttribute('data-tect-view'),
          submitted: { rotX: qaLatestModel.rotX, rotY: qaLatestModel.rotY, scale: qaLatestModel.scale, cut: qaLatestModel.cut },
          keys: qaKeys.slice()
        }));
        diagnostics[stage] = info;
      };
      try {
        await canvas.focus(); const start = await debug(); await trace('beforeKeys');
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(camera => JSON.stringify(qaDebug().camera) !== JSON.stringify(camera), start.camera, { timeout: 60000 }); const turn = await debug(); await trace('afterArrow');
        assert.notDeepEqual(turn.camera, start.camera); assert.equal(turn.hasSlab, true);
        await page.keyboard.press('Home'); await trace('afterHomeDispatch');
        await page.waitForFunction(camera => JSON.stringify(qaDebug().camera) === JSON.stringify(camera), start.camera, { timeout: 60000 }); const reset = await debug(); await trace('afterHomeRender');
        assert.deepEqual(reset.camera, start.camera); return { start: start.camera, turn: turn.camera, reset: reset.camera };
      } finally { await trace('finalKeyboardState'); }
    });
    await test('depth scale toggles without removing the slab', async () => {
      await click('[data-tect-scale-toggle]');
      await page.waitForFunction(() => qaDebug().scaleCount === 0, null, { timeout: 10000 }); const off = await debug();
      assert.equal(off.scaleCount, 0); assert.equal(off.hasSlab, true);
      await click('[data-tect-scale-toggle]');
      await page.waitForFunction(() => qaDebug().scaleCount >= 8, null, { timeout: 10000 }); assert.ok((await debug()).scaleCount >= 8); return off;
    });
    await test('2D fallback remains mounted and 3D cleans up', async () => {
      await click('[data-tect-view="2d"]');
      await page.waitForFunction(() => {
        const section = document.querySelector('[data-tect-section]');
        return !document.querySelector('[data-tect-gl]') && section && getComputedStyle(section).visibility === 'visible';
      }, null, { timeout: 10000 });
      assert.equal(await canvas.count(), 0);
      assert.equal(await page.locator('[data-tect-section]').evaluate(n => getComputedStyle(n).visibility), 'visible');
      await page.evaluate(() => qaDestroy()); assert.equal((await debug()).state, 'idle'); return true;
    });
    await test('no browser runtime errors', async () => { assert.deepEqual(errors, []); return errors; });
    await test('no WebGL shader or context errors', async () => { assert.deepEqual(glErrors, []); return glErrors; });
    const report = { passed: checks.every(c => c.passed), sourcePath, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), mode: 'Real Three r128/WebGL in Chromium with React 18', checks, captures, diagnostics, errors, glErrors };
    fs.writeFileSync(path.join(out, controlsOnly ? 'controls-results.json' : 'results.json'), JSON.stringify(report, null, 2));
    console.log(`${checks.filter(c => c.passed).length}/${checks.length} passed. Artifacts: ${out}`);
    if (!report.passed && !before) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
