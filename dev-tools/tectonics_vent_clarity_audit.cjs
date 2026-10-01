'use strict';
// Read-only real-WebGL audit of clipping and label layout; no source patches.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-vent-clarity-audit');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shots = [], errors = [], checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 650 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<html><body style="margin:0;background:#dbeafe"><canvas id="model" style="display:block;width:calc(100vw - 38px);margin:auto;height:470px;background:linear-gradient(#7baeed,#e9f2ff)"></canvas></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {});
      const Renderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function(options) {
        const renderer = new Renderer(options), render = renderer.render;
        renderer.render = function(scene, camera) { window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); };
        return renderer;
      };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      __alloVentGL.submit({ active: false, tick: 0, dark: false, labels: true, magma: 'andesite' });
      __alloVentGL.mount(document.getElementById('model'));
    });
    await page.waitForFunction(() => __alloVentGL.debug().state === 'ready');
    for (const [name, width, cut, rx, ry, magma = 'andesite', active = false, tick = 0] of [
      ['phone-front-open', 390, 0, -7, -17],
      ['phone-front-partial-cut', 390, 20, -7, -17],
      ['phone-front-deep-cut', 390, -20, -7, -17],
      ['phone-side-open', 390, 0, -7, 80],
      ['phone-oblique-open', 390, 0, -40, -70],
      ['desktop-partial-cut', 1100, 20, -7, -17],
      ['phone-basalt-fountain', 390, 0, -7, -17, 'basalt', true, 100],
      ['phone-rhyolite-ash', 390, 0, -7, -17, 'rhyolite', true, 100],
      ['phone-rhyolite-caldera', 390, 0, -7, -17, 'rhyolite', true, 520]
    ]) {
      await page.setViewportSize({ width, height: 650 });
      await page.evaluate(({ cut, rx, ry, magma, active, tick }) => {
        __alloVentGL.submit({ active, tick, dark: false, labels: true, magma });
        __alloVentGL.setCut(cut); __alloVentGL.setCam(rx, ry);
      }, { cut, rx, ry, magma, active, tick });
      await page.waitForTimeout(active ? 900 : 350);
      await page.locator('#model').screenshot({ path: path.join(out, `${name}.png`) });
      const detail = await page.evaluate(() => {
        const labels = [], canvas = document.getElementById('model');
        qaScene.traverse(sprite => {
          if (!sprite.isSprite || !sprite.userData.ventLabelText) return;
          let parent = sprite, visible = true;
          while (parent) { if (!parent.visible) visible = false; parent = parent.parent; }
          if (!visible) return;
          const position = sprite.getWorldPosition(new THREE.Vector3());
          const screen = position.clone().project(qaCamera);
          const depth = -position.applyMatrix4(qaCamera.matrixWorldInverse).z;
          const scale = sprite.getWorldScale(new THREE.Vector3());
          const pixels = canvas.clientHeight / (2 * depth * Math.tan(qaCamera.fov * Math.PI / 360));
          const width = scale.x * pixels, height = scale.y * pixels;
          labels.push({ text: sprite.userData.ventLabelText, x: (screen.x + 1) * canvas.clientWidth / 2 - width / 2, y: (1 - screen.y) * canvas.clientHeight / 2 - height / 2, width, height });
        });
        const overlaps = [];
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (dx > 1 && dy > 1) overlaps.push({ a: a.text, b: b.text, dx, dy });
        }
        return { debug: __alloVentGL.debug(), labels, overlaps, canvasWidth: canvas.clientWidth, canvasHeight: canvas.clientHeight };
      });
      shots.push({ name, width, cut, camera: [rx, ry], ...detail });
      try {
        assert.equal(detail.debug.contextLost, false);
        assert.deepEqual(detail.overlaps, []);
        for (const label of detail.labels) {
          assert.ok(label.height >= 17.9);
          assert.ok(label.x >= -0.1 && label.y >= -0.1 && label.x + label.width <= detail.canvasWidth + 0.1 && label.y + label.height <= detail.canvasHeight + 0.1, label.text + ' clipped');
        }
        if (cut === 20) assert.deepEqual(detail.debug.anatomy.filter(label => label.visible).map(label => label.label), ['vent']);
        if (cut === -20) assert.deepEqual(detail.debug.anatomy.filter(label => label.visible), []);
        for (const label of detail.debug.anatomy.filter(label => label.visible && label.label !== 'vent')) assert.ok(Math.abs(label.anchor[2] - cut) < 0.01);
        checks.push({ name, passed: true }); console.log('PASS', name);
      } catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
    }
    // Render the actual tool's stage card. Hold its animation clock so a seeded
    // stage stays in place while inspecting the text; eruption geometry above
    // was captured from the real animated renderer.
    await page.evaluate(() => {
      __alloVentGL.unmount();
      window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {};
      document.body.innerHTML = '<main id="stage-root" style="padding:12px;font-family:system-ui"></main>';
      const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
      const root = ReactDOM.createRoot(document.getElementById('stage-root')); let generation = 0;
      window.qaStage = (magma, dark) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, simTab: 'sim', ptDrift: false, ptVent3D: true, ptVentMagma: magma, ptEruptPhase: 'blast' } });
          window.qaStageSet = setData;
          const noop = () => {};
          return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: noop,
            getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (key, fallback) => fallback == null ? key : fallback,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    await page.setViewportSize({ width: 390, height: 900 });
    for (const [magma, dark] of [['basalt', true], ['rhyolite', false]]) {
      const name = `phone-${magma}-${dark ? 'dark' : 'light'}-stage`;
      await page.evaluate(({ magma, dark }) => qaStage(magma, dark), { magma, dark });
      await page.locator('[data-pt-vent-phase]').waitFor();
      // The main canvas's first synchronous paint publishes its idle phase.
      // Seed the target stage after that normal initialization has committed.
      await page.evaluate(() => ReactDOM.flushSync(() => qaStageSet(previous => ({ ...previous, plateTectonics: { ...previous.plateTectonics, ptEruptPhase: 'blast' } }))));
      const stage = page.locator('[data-pt-vent-phase="blast"]');
      await stage.evaluate(node => node.scrollIntoView({ block: 'center' }));
      await stage.screenshot({ path: path.join(out, `${name}.png`), animations: 'allow' });
      const text = await stage.textContent();
      const violations = await page.evaluate(async () => (await axe.run('[data-pt-vent-phase]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(violation => violation.id));
      try {
        assert.match(text, magma === 'basalt' ? /lava fountain.*how little ash/ : /dense ash column.*Flowing lava is not shown/);
        assert.deepEqual(violations, []);
        checks.push({ name, passed: true, text, violations }); console.log('PASS', name);
      } catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
    }
    const passed = !errors.length && checks.every(check => check.passed);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), passed, errors, checks, shots }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
