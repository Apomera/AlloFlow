'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const source = fs.readFileSync(process.env.PT_TEST_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const registrySource = read('ui_strings.js'), registry = JSON.parse(registrySource);
const tectonicsDictionary = Object.fromEntries(Object.keys(registry.stem.platetectonics).sort().map(key => [key, registry.stem.platetectonics[key]]));
const out = path.resolve(process.env.PT_QA_OUT || path.join(repo, 'scratch/tectonics-boundary-inspector-review'));
fs.mkdirSync(out, { recursive: true });
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registrySource).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(registry.stem.platetectonics)).digest('hex'), tectonicsRegistrySha256: crypto.createHash('sha256').update(JSON.stringify(tectonicsDictionary)).digest('hex'), checks: [], captures: [], layouts: [], errors: [], passed: false };
const check = (name, details) => { report.checks.push({ name, passed: true, details }); console.log('PASS', name); };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><title>Boundary feature inspection</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) {
        const renderer = new Renderer(options), render = renderer.render;
        renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); };
        return renderer;
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
      window.mountInspector = (dark, contrast = false) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaEffects = { writes: [], rewards: [], audio: [], notices: [] };
        window.qaMissingTranslations = new Set();
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, isContrast: contrast, t: qaTranslate,
          onRecordSlab: value => qaEffects.writes.push(value), onRecordDepths: value => qaEffects.writes.push(value),
          awardXP: value => qaEffects.rewards.push(value), beep: value => qaEffects.audio.push(value), announceToSR: value => qaEffects.notices.push(value)
        })));
      };
    }, registry);
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = () => page.evaluate(() => ({ time: document.querySelector('[data-pt-model-reading="time"]').textContent, rate: document.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value, paused: !document.querySelector('[data-pt-model-step]').disabled, effects: JSON.stringify(qaEffects), camera: __alloTectGL.debug().camera, view: document.querySelector('[data-tect-gl]')?.dataset.tectView }));
    const inspector = page.locator('[data-pt-boundary-inspector]');
    const features = { convergent: ['slab', 'trench', 'arc'], divergent: ['ridge', 'crust'], transform: ['fault', 'markers'] };
    async function capture(name, locator) { const file = path.join(out, name + '.png'); await locator.screenshot({ path: file, animations: 'disabled' }); report.captures.push(file); }
    for (const { width, dark, contrast } of [
      { width: 1100, dark: false, contrast: false }, { width: 1100, dark: true, contrast: false },
      { width: 390, dark: false, contrast: false }, { width: 390, dark: true, contrast: false }, { width: 390, dark: true, contrast: true }
    ]) {
      const layoutName = `${contrast ? 'contrast' : dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(({ dark, contrast }) => mountInspector(dark, contrast), { dark, contrast }); await inspector.waitFor();
      assert.equal(await inspector.locator('[data-pt-boundary-feature-select="all"]').getAttribute('aria-pressed'), 'true');
      const baseline2d = await snapshot(); await inspector.locator('[data-pt-boundary-feature-select="slab"]').focus(); await page.keyboard.press('Space'); await settle();
      const after2d = await snapshot(); assert.equal(after2d.time, baseline2d.time); assert.equal(after2d.rate, baseline2d.rate); assert.equal(after2d.paused, true); assert.equal(after2d.effects, baseline2d.effects);
      assert.equal(await page.locator('[data-tect-section]').getAttribute('data-pt-boundary-feature'), 'slab');
      check(layoutName + ': keyboard selection reads 2D without changing evidence or rewards');
      await page.locator('[data-tect-mode="divergent"]').click();
      for (let step = 0; step < 40; step++) await page.locator('[data-pt-model-step]').click();
      await inspector.locator('[data-pt-boundary-feature-select="crust"]').click(); await settle();
      await page.locator('[data-tect-section]').scrollIntoViewIfNeeded(); await settle();
      const colours = await page.locator('[data-tect-section]').evaluate(canvas => {
        const ratio = canvas.width / 540, context = canvas.getContext('2d');
        return { solid: Array.from(context.getImageData(Math.round(222 * ratio), Math.round(140 * ratio), 1, 1).data), melt: Array.from(context.getImageData(Math.round(270 * ratio), Math.round(140 * ratio), 1, 1).data) };
      });
      assert.ok(colours.solid[2] > colours.solid[0] + 5, 'Widening rock band is solid blue-gray.');
      assert.ok(colours.melt[0] > colours.melt[1] * 1.15 && colours.melt[0] > colours.melt[2] * 2, 'Orange melt remains at the narrow axis.');
      assert.match(await inspector.locator('#pt-boundary-inspector-status').innerText(), /most of the widening band is solid/);
      await capture(`${layoutName}-divergent-2d-cooling`, page.locator('.pt-tect-frame'));
      check(layoutName + ': actual 2D pixels distinguish solid cooling crust from axial melt', colours);
      await page.locator('[data-tect-mode="convergent"]').click();
      await page.locator('[data-tect-view="3d"]').click(); await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
      for (const [mode, modeFeatures] of Object.entries(features)) {
        await page.locator(`[data-tect-mode="${mode}"]`).click(); await settle();
        for (const feature of modeFeatures) {
          const before = await snapshot(); await inspector.locator(`[data-pt-boundary-feature-select="${feature}"]`).click(); await settle();
          const after = await snapshot(); assert.equal(after.time, before.time); assert.equal(after.rate, before.rate); assert.equal(after.paused, true); assert.deepEqual(after.camera, before.camera); assert.equal(after.effects, before.effects);
          for (const preset of ['section', 'surface', 'oblique']) {
            await page.locator(`[data-tect-preset="${preset}"]`).click(); await settle();
            const debug = await page.evaluate(() => __alloTectGL.debug()); assert.equal(debug.contextLost, false); assert.equal(debug.inspection.id, feature);
            if (feature === 'slab' && preset === 'surface') {
              assert.equal(debug.inspection.visible, false); assert.equal(debug.inspection.reason, 'depth-view'); assert.match(await inspector.locator('#pt-boundary-inspector-status').innerText(), /beneath the surface/);
            } else {
              assert.equal(debug.inspection.visible, true); assert.ok(debug.inspection.segments > 0); assert.equal(debug.inspection.anchor.length, 3);
              if (preset === 'section') assert.ok(debug.inspection.anchor[2] <= 0.00001);
              const clipping = await page.evaluate(() => {
                const outline = qaScene.getObjectByName('boundary-feature-outline'), a = outline.geometry.attributes.position.array, count = outline.geometry.drawRange.count * 3;
                const z = []; for (let i = 2; i < count; i += 3) z.push(a[i]); return { maximum: Math.max(...z), count };
              });
              if (preset === 'section') assert.ok(clipping.maximum <= 0.00001);
            }
            if (feature === 'markers' && preset === 'section') assert.match(await inspector.locator('#pt-boundary-inspector-status').innerText(), /marker pairs are on the top faces.*Choose From above/);
            if (preset === 'section') check(`${layoutName}-${mode}-${feature}: actual clipped shape and fixed experiment`, debug.inspection);
          }
          if (feature === modeFeatures[0] || (width === 390 && dark)) {
            await page.locator(`[data-tect-preset="${feature === 'markers' ? 'surface' : 'section'}"]`).click(); await settle();
            await capture(`${layoutName}-${mode}-${feature}-model`, page.locator('.pt-tect-frame'));
            await capture(`${layoutName}-${mode}-${feature}-inspector`, inspector);
          }
        }
        const metrics = await inspector.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          buttons: [...node.querySelectorAll('button')].map(el => ({ text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize), rect: { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right } })),
          fonts: [...node.querySelectorAll('p,h4')].map(el => parseFloat(getComputedStyle(el).fontSize)),
          modelFrame: (() => { const frame = document.querySelector('.pt-tect-frame'), section = frame.querySelector('[data-tect-section]'), frameRect = frame.getBoundingClientRect(), sectionRect = section.getBoundingClientRect(); return { frameHeight: frameRect.height, sectionHeight: sectionRect.height, frameWidth: frameRect.width, sideHeight: frame.parentElement.children[1].getBoundingClientRect().height }; })()
        }));
        assert.equal(metrics.overflow, 0); assert.ok(metrics.fonts.every(value => value >= 14));
        assert.ok(Math.abs(metrics.modelFrame.frameHeight - metrics.modelFrame.sectionHeight) <= 4, 'Model frame keeps its own aspect instead of stretching to the controls.');
        for (const button of metrics.buttons) { assert.ok(button.font >= 14); assert.ok(button.rect.height >= 44); assert.ok(button.rect.left >= 0 && button.rect.right <= width + 1); }
        const violations = await inspector.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(value => ({ id: value.id, nodes: value.nodes.map(node => node.failureSummary) })));
        assert.deepEqual(violations, []); report.layouts.push({ name: layoutName + '-' + mode, metrics, violations });
        check(layoutName + '-' + mode + ': accessible 14px inspector and 44px buttons without overflow');
      }
      await inspector.locator('[data-pt-boundary-feature-select="all"]').click(); await settle(); const idleBefore = await snapshot(), renderCount = await page.evaluate(() => qaRenders);
      await page.waitForTimeout(250); assert.deepEqual(await snapshot(), idleBefore); assert.equal(await page.evaluate(() => qaRenders), renderCount);
      assert.deepEqual(await page.evaluate(() => ({ writes: qaEffects.writes, rewards: qaEffects.rewards, audio: qaEffects.audio })), { writes: [], rewards: [], audio: [] });
      check(layoutName + ': clear highlight and idle stay silent without repeated repaint');
      const missingTranslations = await page.evaluate(() => [...qaMissingTranslations]); assert.deepEqual(missingTranslations, []);
      check(layoutName + ': actual English registry contains every rendered label');
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
