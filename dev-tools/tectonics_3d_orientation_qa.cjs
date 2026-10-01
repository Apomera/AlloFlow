'use strict';

// Real local Three.js, React and Chromium; exercise the learner's view controls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const out = path.join(root, 'scratch/tectonics-orientation-review/after');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const checks = [], captures = [], errors = [], glErrors = [];
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) glErrors.push(message.text()); });
  const check = async (name, fn) => {
    try { checks.push({ name, passed: true, detail: await fn() }); console.log('PASS', name); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
  };
  try {
    await page.setContent('<!doctype html><html lang="en"><body style="margin:0;font-family:system-ui"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const reactRoot = ReactDOM.createRoot(document.getElementById('wrap'));
      let generation = 0;
      window.qaMount = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        ReactDOM.flushSync(() => reactRoot.render(React.createElement(AlloTectonicsInteractive, { key: ++generation, darkMode: dark, isContrast: false, announceToSR: () => {}, addToast: () => {} })));
      };
      window.qaDebug = () => window.__alloTectGL.debug();
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const canvas = page.locator('[data-tect-gl="true"]');
    for (const [dark, width] of [[false, 1100], [true, 390]]) {
      const tag = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMount(dark), dark);
      await click('[data-tect-view="3d"]');
      await page.waitForFunction(() => qaDebug().state === 'ready' && document.querySelector('[data-tect-gl]').tabIndex === 0);
      for (const mode of ['convergent', 'divergent', 'transform']) {
        await click(`[data-tect-mode="${mode}"]`);
        await page.waitForFunction(mode => qaDebug().mode === mode, mode);
        for (const preset of ['oblique', 'section', 'surface']) {
          await click(`[data-tect-preset="${preset}"]`);
          await page.waitForFunction(preset => {
            const d = qaDebug();
            return document.querySelector(`[data-tect-preset="${preset}"]`).getAttribute('aria-pressed') === 'true' &&
              d.surfaceView === (preset === 'surface') && (preset !== 'section' || d.clipConstant === 0);
          }, preset);
          await canvas.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          const name = `${tag}-${mode}-${preset}`;
          await canvas.screenshot({ path: path.join(out, `${name}.png`) });
          const state = await page.evaluate(() => qaDebug());
          const layout = await canvas.evaluate(node => {
            const box = node.getBoundingClientRect();
            const section = document.querySelector('[data-tect-section]');
            return { width: box.width, height: box.height, overflow: document.documentElement.scrollWidth > innerWidth + 1,
              sectionHidden: section.getAttribute('aria-hidden'), sectionTabIndex: section.tabIndex,
              glHidden: node.getAttribute('aria-hidden'), glTabIndex: node.tabIndex,
              caption: document.querySelector('[data-tect-view-caption]').textContent,
              buttons: [...document.querySelectorAll('[data-tect-preset]')].map(button => ({ height: button.getBoundingClientRect().height, pressed: button.getAttribute('aria-pressed') })),
              scaleDisabled: document.querySelector('[data-tect-scale-toggle]').disabled };
          });
          captures.push({ name, state, layout });
          await check(name, () => {
            assert.equal(state.contextLost, false);
            assert.equal(state.depthLabelCount, preset === 'surface' ? 0 : 4);
            assert.equal(state.featureLabelCount, mode === 'convergent' ? 2 : 1);
            assert.equal(layout.scaleDisabled, preset === 'surface');
            assert.equal(layout.overflow, false);
            assert.equal(layout.sectionHidden, 'true'); assert.equal(layout.sectionTabIndex, -1);
            assert.equal(layout.glHidden, 'false'); assert.equal(layout.glTabIndex, 0);
            assert.equal(layout.buttons.filter(button => button.pressed === 'true').length, 1);
            assert.ok(layout.buttons.every(button => button.height >= 40));
            for (const label of state.labelRects) {
              assert.ok(label.height >= (width === 390 ? 19 : 17), `${label.text} is too small`);
              assert.ok(label.x >= -0.1 && label.y >= -0.1 && label.x + label.width <= layout.width + 0.1 && label.y + label.height <= layout.height + 0.1, `${label.text} is outside the canvas`);
            }
            for (let i = 0; i < state.labelRects.length; i++) for (let j = i + 1; j < state.labelRects.length; j++) {
              const a = state.labelRects[i], b = state.labelRects[j];
              const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
              const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
              assert.ok(dx <= 1 || dy <= 1, `${a.text} overlaps ${b.text}`);
            }
            return { features: state.labelRects.map(label => label.text), caption: layout.caption };
          });
          if (mode === 'transform' && preset === 'surface') await page.locator('#pt-boundary-simulator').screenshot({ path: path.join(out, `${tag}-controls.png`) });
        }
      }
      await check(`${tag}: depth visibility preference survives top view and features stay named`, async () => {
        await click('[data-tect-preset="oblique"]');
        await page.waitForFunction(() => qaDebug().depthLabelCount === 4);
        await click('[data-tect-scale-toggle]');
        await page.waitForFunction(() => qaDebug().depthLabelCount === 0);
        assert.equal((await page.evaluate(() => qaDebug())).featureLabelCount, 1);
        await click('[data-tect-preset="surface"]');
        await page.waitForFunction(() => qaDebug().surfaceView);
        await click('[data-tect-preset="oblique"]');
        await page.waitForFunction(() => !qaDebug().surfaceView);
        assert.equal((await page.evaluate(() => qaDebug())).depthLabelCount, 0);
        await click('[data-tect-view="2d"]');
        await page.waitForFunction(() => document.querySelector('[data-tect-section]').getAttribute('aria-hidden') === 'false');
        assert.equal(await page.locator('[data-tect-section]').getAttribute('tabindex'), '0');
      });
    }
    await check('no script or WebGL errors', () => { assert.deepEqual(errors, []); assert.deepEqual(glErrors, []); });
  } finally {
    const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), passed: checks.length > 0 && checks.every(check => check.passed) && !errors.length && !glErrors.length, checks, captures, errors, glErrors };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, checks: checks.length, captures: captures.length, out }));
    await browser.close();
    if (!report.passed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
