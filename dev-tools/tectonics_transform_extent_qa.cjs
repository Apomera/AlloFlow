'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = process.env.PT_REPO_PATH || process.cwd(), { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const candidate = path.join(__dirname, 'transform-candidate.js');
const source = fs.readFileSync(process.env.PT_TEST_SOURCE || (fs.existsSync(candidate) ? candidate : path.join(repo, 'stem_lab/stem_tool_platetectonics.js')), 'utf8');
const registry = JSON.parse(read('ui_strings.js')), stagedKeysPath = path.join(__dirname, 'transform-new-keys.json'), dictionaryFixtureNewKeys = [];
if (fs.existsSync(stagedKeysPath)) for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(stagedKeysPath, 'utf8')))) {
  if (!Object.hasOwn(registry.stem.platetectonics, key)) { registry.stem.platetectonics[key] = value; dictionaryFixtureNewKeys.push(key); }
}
const out = path.resolve(process.env.PT_QA_OUT || path.join(__dirname, 'transform-browser'));
fs.mkdirSync(out, { recursive: true });
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), dictionaryFixtureNewKeys, checks: [], captures: [], layouts: [], errors: [], passed: false };
const check = (name, details) => { report.checks.push({ name, passed: true, details }); console.log('PASS', name); };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><title>Transform motion and extent</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      const useState = React.useState;
      // Fixture only the initial physical state; all updates, drawing and controls
      // run through the shipped component. Offset and time obey rate x time.
      React.useState = function (initial) {
        if (initial && typeof initial === 'object' && Object.hasOwn(initial, 'offset') && Object.hasOwn(initial, 'quakes') && Object.hasOwn(initial, 'years')) initial = { ...initial, mode: 'transform', offset: qaOffset, years: qaOffset * 100000 / initial.rate, running: false };
        return useState(initial);
      };
      const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) {
        const renderer = new Renderer(options), render = renderer.render;
        renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); };
        return renderer;
      };
      const frames = new Map(); let frameId = 0, now = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      window.qaFrame = (count = 1) => {
        for (let i = 0; i < count; i++) {
          now = Math.max(now + 16, performance.now()); const callbacks = [...frames.values()]; frames.clear();
          ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now)));
        }
      };
      const context = CanvasRenderingContext2D.prototype, begin = context.beginPath, move = context.moveTo, line = context.lineTo, stroke = context.stroke;
      context.beginPath = function () { this.qaPath = []; return begin.call(this); };
      context.moveTo = function (x, y) { this.qaPath?.push(['M', x, y]); return move.call(this, x, y); };
      context.lineTo = function (x, y) { this.qaPath?.push(['L', x, y]); return line.call(this, x, y); };
      context.stroke = function (...args) {
        if (this.canvas.hasAttribute('data-tect-section')) {
          if (this.strokeStyle === '#a16207' && this.lineWidth === 3.5) window.qaStream = this.qaPath.map(point => point.slice());
          if (this.strokeStyle === '#f59e0b' && Math.abs(this.lineWidth - 2.4) < 0.0001 && this.qaPath?.length === 2) (window.qaArrows || (window.qaArrows = [])).push(this.qaPath.map(point => point.slice()));
          if (this.strokeStyle === '#fff7ae' && this.lineWidth === 2.5 && this.qaPath?.length === 4 && this.qaPath[0][1] === 240) window.qaStreamOutline = this.qaPath.map(point => point.slice());
        }
        return stroke.apply(this, args);
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(registry => {
      const root = ReactDOM.createRoot(document.querySelector('#app')); let generation = 0;
      window.qaRegistry = registry;
      window.qaTranslate = (key, fallback) => {
        const value = key.split('.').reduce((object, part) => object && typeof object === 'object' ? object[part] : undefined, qaRegistry);
        if (typeof value !== 'string') { qaMissingTranslations.add(key); return fallback; }
        return value;
      };
      window.qaMount = (offset, dark, contrast = false) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaOffset = offset; window.qaStream = window.qaStreamOutline = null; window.qaArrows = [];
        window.qaEffects = { writes: [], rewards: [], audio: [], notices: [] }; window.qaMissingTranslations = new Set();
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsInteractive, { key: ++generation, darkMode: dark, isContrast: contrast, t: qaTranslate,
          onRecordSlab: value => qaEffects.writes.push(value), onRecordDepths: value => qaEffects.writes.push(value), onSaveBoundaryInquiry: value => qaEffects.writes.push(value),
          awardXP: value => qaEffects.rewards.push(value), beep: value => qaEffects.audio.push(value), announceToSR: value => qaEffects.notices.push(value) })));
      };
    }, registry);
    const settle = () => page.evaluate(() => qaFrame(3));
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const snapshot = () => page.evaluate(() => ({ time: document.querySelector('[data-pt-model-reading="time"]').textContent,
      movement: document.querySelector('[data-pt-model-reading="movement"]').textContent,
      rate: document.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
      paused: !document.querySelector('[data-pt-model-step]').disabled, effects: JSON.stringify(qaEffects) }));
    const inspector = page.locator('[data-pt-boundary-inspector]');
    async function capture(name, locator) { const file = path.join(out, name + '.png'); await locator.screenshot({ path: file, animations: 'allow' }); report.captures.push(file); }
    const layouts = [{ width: 1100, dark: false }, { width: 1100, dark: true }, { width: 390, dark: false }, { width: 390, dark: true }, { width: 320, dark: false }, { width: 390, dark: true, contrast: true }]
      .filter(layout => (!process.env.PT_QA_LAYOUT_WIDTH || layout.width === Number(process.env.PT_QA_LAYOUT_WIDTH)) &&
        (!process.env.PT_QA_LAYOUTS || process.env.PT_QA_LAYOUTS.split(',').includes(`${layout.contrast ? 'contrast' : layout.dark ? 'dark' : 'light'}-${layout.width}`)));
    for (const { width, dark, contrast } of layouts) {
      const tag = `${contrast ? 'contrast' : dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 });
      const streams = [];
      for (const offset of [0, 25.9, 26, 26.1, 279, 280, 281, 1200]) {
        await page.evaluate(({ offset, dark, contrast }) => qaMount(offset, dark, contrast), { offset, dark, contrast }); await inspector.waitFor(); await settle();
        await page.locator('[data-tect-section]').scrollIntoViewIfNeeded(); await settle();
        const state = await snapshot(), detail = await page.evaluate(() => ({ stream: qaStream, arrows: qaArrows.slice(-2), extent: document.querySelector('[data-pt-transform-extent]').dataset.ptTransformExtent,
          live: document.querySelector('[data-pt-transform-extent]').getAttribute('aria-live'), text: document.querySelector('[data-pt-transform-extent]').textContent,
          label: document.querySelector('[data-pt-model-reading="movement"]').previousElementSibling.textContent }));
        assert.equal(state.movement, offset.toLocaleString(undefined, offset >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 3 }) + ' km'); assert.equal(state.rate, '5'); assert.equal(state.paused, true);
        assert.equal(detail.label, 'Cumulative fault slip'); assert.equal(detail.extent, offset >= 280 ? 'limited' : 'growing'); assert.equal(detail.live, 'off');
        assert.match(detail.text, offset >= 280 ? /Picture limit reached at 280 km.*reading continues to increase/ : /both pictures reach their display limit at 280 km/);
        assert.equal(detail.stream.length, 4); assert.equal(detail.stream[0][2], detail.stream[1][2]); assert.equal(detail.stream[2][2], detail.stream[3][2]);
        assert.equal(detail.arrows.length, 2); assert.ok(detail.arrows[0][1][2] < detail.arrows[0][0][2]); assert.ok(detail.arrows[1][1][2] > detail.arrows[1][0][2]);
        streams.push({ offset, aY: detail.stream[0][2], bY: detail.stream[2][2] });
        await click('[data-pt-boundary-feature-select="markers"]'); await settle();
        assert.deepEqual(await page.evaluate(() => qaStreamOutline), detail.stream, 'Inspector outline follows the moving stream endpoints.');
        assert.deepEqual(await snapshot(), state, 'Reading aid preserves physics, rate and effects.');
        if (offset === 0 || offset === 280) { await capture(`${tag}-offset-${offset}-2d`, page.locator('.pt-tect-frame')); await capture(`${tag}-offset-${offset}-extent`, page.locator('[data-pt-transform-extent]')); }
        if (offset === 1200) await capture(`${tag}-offset-${offset}-extent`, page.locator('[data-pt-transform-extent]'));
        check(`${tag}: 2D arrow direction, matching outline and truthful extent at ${offset} km`, detail);
      }
      for (let i = 1; i < streams.length; i++) { assert.ok(streams[i].aY <= streams[i - 1].aY); assert.ok(streams[i].bY >= streams[i - 1].bY); }
      assert.ok(streams[3].aY < streams[1].aY && streams[3].bY > streams[1].bY, 'Passing 26 km cannot restore alignment.');
      assert.deepEqual(streams[6].aY, streams[5].aY); assert.deepEqual(streams[7].bY, streams[5].bY);
      check(`${tag}: separation stays monotonic across the former reset and finite extent`, streams);
      for (const offset of [279, 280, 281, 1200]) {
        await page.evaluate(({ offset, dark, contrast }) => qaMount(offset, dark, contrast), { offset, dark, contrast }); await settle();
        await click('[data-tect-view="3d"]'); await page.locator('[data-tect-gl]').scrollIntoViewIfNeeded(); await page.waitForTimeout(100); await settle();
        await page.waitForFunction(() => __alloTectGL.debug().state === 'ready');
        await click('[data-pt-boundary-feature-select="markers"]'); await settle();
        const before = await snapshot();
        for (const preset of ['surface', 'section', 'oblique']) {
          await click(`[data-tect-preset="${preset}"]`); await settle();
          const detail = await page.evaluate(() => {
            qaScene.updateMatrixWorld(true); qaCamera.updateMatrixWorld(true); const bands = [], arrows = [];
            qaScene.traverse(object => {
              if (object.userData.feature === 'matching-marker') { const position = object.getWorldPosition(new THREE.Vector3()); bands.push({ ...object.userData, x: position.x, z: position.z }); }
              if (object.userData.feature === 'plate-motion') {
                const origin = object.getWorldPosition(new THREE.Vector3()), direction = object.userData.direction;
                const start = origin.clone().project(qaCamera), end = origin.clone().add(new THREE.Vector3(direction.x * 17, 0, direction.z * 17)).project(qaCamera);
                arrows.push({ plateId: origin.x < 0 ? 'A' : 'B', direction, screenDy: (start.y - end.y) * 0.5 });
              }
            });
            return { bands, arrows, debug: __alloTectGL.debug() };
          });
          assert.equal(detail.debug.contextLost, false); assert.equal(detail.bands.length, 4); assert.equal(detail.debug.transformDisplay.cumulativeKm, offset); assert.equal(detail.debug.transformDisplay.atLimit, offset >= 280);
          for (const id of ['reference-1', 'reference-2']) {
            const pair = detail.bands.filter(band => band.markerId === id), a = pair.find(band => band.plateId === 'A'), b = pair.find(band => band.plateId === 'B');
            assert.ok(Math.abs((a.z - b.z) - Math.min(35, offset / 8)) < 1e-8, 'Existing 3D finite geometry is preserved.');
            const localZ = id === 'reference-1' ? -12 : 12;
            const aDirection = detail.arrows.find(arrow => arrow.plateId === 'A').direction, bDirection = detail.arrows.find(arrow => arrow.plateId === 'B').direction;
            assert.equal(aDirection.x, 0); assert.equal(aDirection.z, 1); assert.equal(bDirection.x, 0); assert.equal(bDirection.z, -1);
            assert.ok((a.z - localZ) * aDirection.z > 0 && (b.z - localZ) * bDirection.z > 0, 'Each matching marker moves with its own world-coordinate arrow.');
          }
          if (preset === 'surface') {
            assert.ok(detail.arrows.find(arrow => arrow.plateId === 'A').screenDy > 0 && detail.arrows.find(arrow => arrow.plateId === 'B').screenDy < 0, 'The top camera projects Plate A +Z downward and Plate B -Z upward.');
          }
          if (preset === 'section') assert.ok(detail.debug.cutFaceDepths.every(z => Math.abs(z) < 1e-8));
          assert.deepEqual(await snapshot(), before, 'Presets preserve physical time, slip, rate and effects.');
          if (offset === 280) await capture(`${tag}-offset-${offset}-${preset}`, page.locator('.pt-tect-frame'));
          check(`${tag}: actual WebGL ${preset} view retains matching pairs and extent at ${offset} km`, { display: detail.debug.transformDisplay, arrows: detail.arrows, camera: detail.debug.camera });
        }
        const idleBefore = { state: await snapshot(), renders: await page.evaluate(() => qaRenders) };
        await page.evaluate(() => qaFrame(120)); await settle();
        assert.deepEqual(await snapshot(), idleBefore.state); assert.equal(await page.evaluate(() => qaRenders), idleBefore.renders, 'Idle WebGL stays still.');
      }
      const numericBefore = await snapshot();
      await click('[data-pt-model-step]'); await settle();
      const advanced = await snapshot(); assert.equal(advanced.movement, '1,203 km');
      assert.equal(advanced.time, '24.1 million years');
      assert.equal(advanced.rate, numericBefore.rate); assert.equal(advanced.paused, true);
      assert.match(await page.locator('[data-pt-sim-check]').innerText(), /5.0 cm per year/);
      assert.equal(await page.locator('[data-pt-transform-extent]').getAttribute('data-pt-transform-extent'), 'limited');
      assert.equal((await page.evaluate(() => __alloTectGL.debug())).transformDisplay.cumulativeKm, 1203);
      await click('[data-pt-model-reset]'); await settle();
      assert.equal((await snapshot()).movement, '0 km'); assert.equal((await snapshot()).time, '0 years');
      assert.equal(await page.locator('[data-pt-transform-extent]').getAttribute('data-pt-transform-extent'), 'growing');
      const layout = await page.locator('[data-pt-transform-extent]').evaluate(node => ({ overflow: document.documentElement.scrollWidth - innerWidth, font: parseFloat(getComputedStyle(node).fontSize), width: node.getBoundingClientRect().width,
        violations: null }));
      assert.ok(layout.overflow <= 1); assert.ok(layout.font >= 14);
      const accessibility = await page.evaluate(async () => (await axe.run(document.querySelector('[data-pt-transform-extent]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
      assert.deepEqual(accessibility, []); layout.violations = accessibility;
      assert.deepEqual(await page.evaluate(() => Array.from(qaMissingTranslations)), []);
      report.layouts.push({ tag, ...layout });
      check(`${tag}: advancing beyond the picture limit preserves rate, physical slip and reset`, { before: numericBefore, after: advanced, layout });
      for (const offset of [0.00096, 123456789.125]) {
        await page.evaluate(({ offset, dark, contrast }) => qaMount(offset, dark, contrast), { offset, dark, contrast }); await settle();
        const formatted = await page.locator('[data-pt-model-reading="movement"]').innerText();
        assert.equal(formatted, offset < 1 ? '0.00096 km' : '123,456,789.13 km');
        const bounds = await page.locator('[data-pt-model-reading="movement"]').evaluate(node => ({ font: parseFloat(getComputedStyle(node).fontSize), overflow: node.scrollWidth - node.clientWidth, pageOverflow: document.documentElement.scrollWidth - innerWidth }));
        assert.ok(bounds.font >= 14); assert.ok(bounds.overflow <= 1); assert.ok(bounds.pageOverflow <= 1);
        if (width <= 390 && offset >= 1) await capture(`${tag}-long-cumulative-reading`, page.locator('[data-pt-model-readings]'));
        check(`${tag}: bounded readable cumulative-slip precision at ${offset} km`, { formatted, bounds });
      }
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
