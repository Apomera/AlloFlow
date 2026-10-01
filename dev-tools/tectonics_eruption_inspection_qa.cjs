'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js'), out = path.resolve('scratch/tectonics-continued-clarity-review/eruption-controls');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [] };
  try {
    for (const [width, dark] of [[1100, false], [1100, true], [390, false], [390, true]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(60000); page.on('pageerror', e => report.errors.push(String(e)));
      await page.setContent('<!doctype html><html lang="en"><head><title>Eruption inspection QA</title></head><body style="margin:0;font-family:system-ui"><main id="slot"></main></body></html>');
      await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
      await page.evaluate(() => {
        window.qaNow = 0; window.qaFrames = new Map(); window.qaFrameId = 0;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => qaNow });
        window.requestAnimationFrame = fn => { qaFrames.set(++qaFrameId, fn); return qaFrameId; };
        window.cancelAnimationFrame = id => qaFrames.delete(id);
        window.qaFrame = (ms = 1000 / 60) => { qaNow += ms; for (const [id, fn] of [...qaFrames]) if (qaFrames.delete(id)) fn(qaNow); };
      });
      for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
      await page.evaluate(() => {
        window.qaThreeLoads = 0; window.qaRenderCalls = 0;
        StemLab.ensureThree = () => { qaThreeLoads++; return Promise.resolve(THREE); }; StemLab.loadScriptResilient = () => new Promise(() => {});
        const Renderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = function (options) { const renderer = new Renderer(options), render = renderer.render;
          renderer.render = function (scene, camera) { qaRenderCalls++; window.qaScene = scene; window.qaCamera = camera; return render.call(this, scene, camera); }; return renderer; };
        window.qaParticleHash = () => { const data = []; qaScene.traverse(o => { if (o.isPoints) data.push([o.geometry.drawRange.count, Array.from(o.geometry.attributes.position.array)]); }); return JSON.stringify(data); };
      });
      await page.addScriptTag({ content: source });
      await page.evaluate(dark => {
        const noop = () => {}, Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
        window.qaXP = []; window.qaSaved = null;
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, simTab: 'sim', ptDrift: false, ptVent3D: false, ptVentMagma: 'basalt' } });
          qaSaved = data.plateTectonics;
          return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: (...args) => qaXP.push(args),
            getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f,
            props: {}, srOnly: {}, gradeLevel: '7th', callGemini: null });
        }
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f8fafc';
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      }, dark);
      const main = page.locator('[data-pt-main-canvas]');
      await main.scrollIntoViewIfNeeded();
      // Use the real plate controller and settlement, then the actual view toggle.
      const started = await main.evaluate(canvas => {
        for (let i = 0; i < 7; i++) { canvas._ptKb.pick(i); if (/Nazca/.test(canvas._ptKb.current().name)) break; }
        for (let i = 0; i < 10; i++) canvas._ptKb.move(1, true);
        canvas._ptKb.settle(); qaFrame(); return canvas._ptEruption.getState();
      });
      assert.equal(started.active, true);
      assert.equal(await page.locator('[data-pt-vent-gl]').count(), 0);
      assert.equal(await page.evaluate(() => qaThreeLoads), 0);
      await page.locator('[data-pt-vent-view="3d"]').click({ force: true });
      await page.waitForFunction(() => __alloVentGL.debug().state === 'ready', null, { polling: 25 });
      for (let i = 0; i < 7; i++) await page.evaluate(() => { for (let n = 0; n < 20; n++) qaFrame(); });
      const state = await main.evaluate(canvas => canvas._ptEruption.getState()); assert.equal(state.active, true); assert.ok(state.tick >= 130 && state.tick <= 142);
      await main.evaluate(canvas => { window.qaEruptionCanvas = canvas; });
      await page.locator('[data-pt-eruption-pause]').click({ force: true });
      assert.equal(await page.locator('[data-pt-eruption-pause]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-pt-vent-magma]').evaluateAll(nodes => nodes.every(node => node.disabled)), true);
      const paused = await main.evaluate(canvas => { if (canvas !== qaEruptionCanvas) throw new Error('React replaced the eruption canvas during pause'); qaFrame(); return { state: canvas._ptEruption.getState(), particles: qaParticleHash(), xp: qaXP.length, earned: qaSaved.ptMadeEruptions, counts: __alloVentGL.debug() }; });
      assert.ok(paused.counts.lava + paused.counts.glow > 0);
      const frozen = await page.evaluate(() => { for (let i = 0; i < 8; i++) qaFrame(1000); return { state: document.querySelector('[data-pt-main-canvas]')._ptEruption.getState(), particles: qaParticleHash(), xp: qaXP.length, earned: qaSaved.ptMadeEruptions }; });
      assert.deepEqual(frozen.state, paused.state); assert.equal(frozen.particles, paused.particles); assert.equal(frozen.xp, paused.xp); assert.equal(frozen.earned, paused.earned);
      report.checks.push({ name: `${width} paused eruption and actual WebGL particles stay frozen without extra awards`, passed: true, tick: frozen.state.tick });
      const anatomyCamera = await page.evaluate(() => __alloVentGL.getCam());
      for (const feature of ['chamber', 'conduit', 'vent', 'dike', 'sill', 'all']) {
        const button = page.locator('[data-pt-vent-anatomy="' + feature + '"]');
        await button.click({ force: true }); await page.evaluate(() => qaFrame());
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-pt-vent-anatomy][aria-pressed="true"]').count(), 1);
        const inspection = await page.evaluate(() => __alloVentGL.getInspection());
        assert.equal(inspection.id, feature === 'all' ? null : feature);
        assert.equal(await page.locator('#pt-vent-inspection-status').getAttribute('data-reason'), inspection.reason);
        if (feature === 'vent' && inspection.visible) assert.match(await page.locator('#pt-vent-inspection-status').textContent(), /ring marks the visible vent opening/i);
        assert.ok((await page.locator('#pt-vent-inspection-detail').textContent()).length > 50);
        assert.deepEqual(await page.evaluate(() => __alloVentGL.getCam()), anatomyCamera);
        assert.deepEqual(await main.evaluate(canvas => canvas._ptEruption.getState()), paused.state);
        assert.equal(await page.evaluate(() => qaParticleHash()), paused.particles);
        assert.equal(await page.evaluate(() => qaXP.length), paused.xp);
        assert.equal(await page.evaluate(() => qaSaved.ptMadeEruptions), paused.earned);
      }
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} all six structure controls update selection and explanation while preserving the paused scene and rewards`, passed: true });
      await page.locator('[data-pt-vent-anatomy="dike"]').click({ force: true }); await page.evaluate(() => qaFrame());
      const exposed = await page.evaluate(() => __alloVentGL.getInspection()); assert.equal(exposed.visible, true); assert.ok(exposed.segments > 0);
      const anatomyImage = path.join(out, `${dark ? 'dark' : 'light'}-${width}-dike.png`);
      await page.locator('[data-pt-vent-gl]').screenshot({ path: anatomyImage, animations: 'disabled' }); report.captures.push(anatomyImage);
      await page.evaluate(() => { window.qaRetainedVent = document.querySelector('[data-pt-vent-gl]'); window.qaRetainedScene = qaScene; });
      await page.locator('[data-pt-vent-view="2d"]').click({ force: true });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-pt-vent-gl]')).visibility === 'hidden', null, { polling: 25, timeout: 5000 });
      const hidden = await page.evaluate(() => ({ calls: qaRenderCalls, sameCanvas: document.querySelector('[data-pt-vent-gl]') === qaRetainedVent,
        hidden: qaRetainedVent.getAttribute('aria-hidden'), tabIndex: qaRetainedVent.tabIndex, visibility: getComputedStyle(qaRetainedVent).visibility }));
      assert.equal(hidden.sameCanvas, true); assert.equal(hidden.hidden, 'true'); assert.equal(hidden.tabIndex, -1); assert.equal(hidden.visibility, 'hidden');
      assert.equal(await page.locator('[data-pt-eruption-pause]').isVisible(), true);
      assert.equal(await page.locator('[data-pt-eruption-pause]').textContent(), 'Resume eruption');
      const hiddenAfter = await page.evaluate(() => { for (let n = 0; n < 8; n++) qaFrame(1000); return { calls: qaRenderCalls, particles: qaParticleHash() }; });
      assert.equal(hiddenAfter.calls, hidden.calls); assert.equal(hiddenAfter.particles, paused.particles);
      await page.locator('[data-pt-vent-view="3d"]').click({ force: true });
      const reentered = await page.evaluate(() => { qaFrame(); return { sameCanvas: document.querySelector('[data-pt-vent-gl]') === qaRetainedVent,
        sameScene: qaScene === qaRetainedScene, particles: qaParticleHash(), state: document.querySelector('[data-pt-main-canvas]')._ptEruption.getState(), loads: qaThreeLoads }; });
      assert.equal(reentered.sameCanvas, true); assert.equal(reentered.sameScene, true); assert.equal(reentered.loads, 1);
      assert.equal(reentered.particles, paused.particles); assert.deepEqual(reentered.state, paused.state);
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} lazy 3D initialization and paused 2D/3D reentry preserve the exact scene without hidden GPU painting`, passed: true });
      const cameraBefore = await page.evaluate(() => qaCamera.position.toArray());
      await page.locator('[data-pt-vent-controls] button[aria-label="Rotate right"]').click({ force: true });
      const turned = await page.evaluate(before => { qaFrame(); return { before, after: qaCamera.position.toArray(), particles: qaParticleHash() }; }, cameraBefore);
      assert.notDeepEqual(turned.before, turned.after); assert.equal(turned.particles, paused.particles);
      report.checks.push({ name: `${width} camera remains usable during inspection`, passed: true });
      const model = page.locator('[data-pt-vent-gl]'); await model.scrollIntoViewIfNeeded();
      const imageFile = path.join(out, `${dark ? 'dark' : 'light'}-${width}-paused.png`);
      await model.screenshot({ path: imageFile, animations: 'disabled' }); report.captures.push(imageFile);
      const cut = page.locator('#pt-vent-cut');
      await cut.press('ArrowRight'); await page.evaluate(() => qaFrame());
      assert.equal(await page.evaluate(() => __alloVentGL.getCam().cut), 1);
      assert.equal(await cut.getAttribute('aria-valuetext'), await page.locator('#pt-vent-cut-reading').textContent());
      assert.ok((await cut.getAttribute('aria-valuetext')).length > 6);
      await cut.press('End'); await page.evaluate(() => qaFrame());
      assert.equal(await page.evaluate(() => __alloVentGL.getCam().cut), null);
      assert.equal(await cut.inputValue(), '30');
      assert.equal(await cut.getAttribute('aria-valuetext'), await page.locator('#pt-vent-cut-reading').textContent());
      const hiddenStructure = await page.evaluate(() => __alloVentGL.getInspection());
      assert.equal(hiddenStructure.id, 'dike'); assert.equal(hiddenStructure.visible, false); assert.equal(hiddenStructure.reason, 'closed'); assert.equal(hiddenStructure.segments, 0);
      assert.equal(await page.locator('#pt-vent-inspection-status').getAttribute('data-reason'), 'closed');
      assert.match(await page.locator('#pt-vent-inspection-status').textContent(), /whole volcano covers the inside/i);
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} whole-volcano view hides the selected internal contour and explains how to expose it`, passed: true });
      for (const preset of ['shape', 'inside']) {
        await page.evaluate(() => __alloVentGL.zoom(0.6));
        await page.locator('[data-pt-vent-preset="' + preset + '"]').click({ force: true });
        await page.evaluate(() => qaFrame());
        const cam = await page.evaluate(() => __alloVentGL.getCam());
        assert.equal(cam.scale, 1); assert.equal(cam.cut, preset === 'shape' ? null : 0);
        assert.equal(await cut.inputValue(), preset === 'shape' ? '30' : '0');
        assert.deepEqual(await main.evaluate(canvas => canvas._ptEruption.getState()), paused.state);
      }
      await model.press('+'); await model.press('ArrowRight'); await cut.press('End');
      await model.press('Home'); await page.evaluate(() => qaFrame());
      assert.deepEqual(await page.evaluate(() => __alloVentGL.getCam()), { rotX: -7, rotY: -17, scale: 1, cut: 0 });
      assert.equal(await cut.inputValue(), '0');
      assert.equal(await cut.getAttribute('aria-valuetext'), await page.locator('#pt-vent-cut-reading').textContent());
      assert.deepEqual(await main.evaluate(canvas => canvas._ptEruption.getState()), paused.state);
      assert.equal(await page.evaluate(() => qaXP.length), paused.xp);
      const audit = await page.evaluate(async () => (await axe.run('[data-pt-vent-controls]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) })));
      const metrics = await page.locator('[data-pt-vent-controls]').evaluate(panel => {
        const box = panel.getBoundingClientRect();
        const targets = [...panel.querySelectorAll('button,input')].map(node => {
          const rect = node.getBoundingClientRect();
          return { label: node.getAttribute('aria-label') || node.textContent.trim() || node.id, width: rect.width, height: rect.height, minHeight: getComputedStyle(node).minHeight, className: node.className };
        });
        return { overflow: Math.max(0, panel.scrollWidth - panel.clientWidth),
          clippedControls: [...panel.querySelectorAll('button,input')].filter(node => { const r = node.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1; }).map(node => node.outerHTML.slice(0, 160)),
          targetHeight: Math.min(...targets.map(node => node.height)), targets };
      });
      (report.controlAudits || (report.controlAudits = [])).push({ theme: dark ? 'dark' : 'light', width, audit, metrics });
      assert.deepEqual(audit, []); assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []); assert.ok(metrics.targetHeight >= 40, JSON.stringify(metrics.targets.filter(node => node.height < 40)));
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} composition locks, slice keyboard controls, inspection presets and Home preserve the paused eruption`, passed: true, audit, metrics });
      const controlsImageFile = path.join(out, `${dark ? 'dark' : 'light'}-${width}-controls.png`);
      await page.locator('[data-pt-vent-controls]').screenshot({ path: controlsImageFile, animations: 'disabled' });
      report.captures.push(controlsImageFile);
      await page.locator('[data-pt-eruption-pause]').click({ force: true });
      assert.equal(await page.locator('[data-pt-eruption-pause]').getAttribute('aria-pressed'), 'false');
      const resumed = await main.evaluate(canvas => { qaFrame(); return { state: canvas._ptEruption.getState(), particles: qaParticleHash(), xp: qaXP.length, earned: qaSaved.ptMadeEruptions }; });
      assert.equal(resumed.state.tick, paused.state.tick + 1); assert.equal(resumed.xp, paused.xp); assert.equal(resumed.earned, paused.earned); assert.notEqual(resumed.particles, paused.particles);
      report.checks.push({ name: `${width} resume advances exactly one interval without replaying time or rewards`, passed: true });
      await page.locator('[data-pt-vent-view="2d"]').click({ force: true });
      const runningHidden = await main.evaluate(canvas => ({ tick: canvas._ptEruption.getState().tick, calls: qaRenderCalls, particles: qaParticleHash() }));
      const advancedHidden = await main.evaluate(canvas => { for (let n = 0; n < 60; n++) qaFrame(); return { tick: canvas._ptEruption.getState().tick, calls: qaRenderCalls, particles: qaParticleHash(), earned: qaSaved.ptMadeEruptions, xp: qaXP.length }; });
      assert.equal(advancedHidden.tick, runningHidden.tick + 60); assert.equal(advancedHidden.calls, runningHidden.calls);
      assert.equal(advancedHidden.particles, runningHidden.particles); assert.equal(advancedHidden.earned, paused.earned); assert.equal(advancedHidden.xp, paused.xp);
      await page.locator('[data-pt-vent-view="3d"]').click({ force: true });
      await page.evaluate(() => qaFrame(0));
      assert.equal(await page.evaluate(() => qaParticleHash()) === runningHidden.particles, true, 'Return repaints the retained particles without replaying hidden time');
      await page.evaluate(() => { qaFrame(); qaFrame(); });
      assert.notEqual(await page.evaluate(() => qaParticleHash()), runningHidden.particles);
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} running 2D time advances source while the hidden 3D renderer sleeps and returns without particle catch-up`, passed: true });
      await page.locator('[data-pt-topic-search]').fill('hotspots');
      await page.locator('[data-pt-search-result="hotspots"]').click({ force: true });
      assert.equal(await page.locator('[data-pt-vent-gl]').count(), 0);
      assert.equal(await page.evaluate(() => __alloVentGL.debug().state), 'idle');
      report.checks.push({ name: `${dark ? 'dark' : 'light'}-${width} leaving Simulation disposes the retained 3D renderer`, passed: true });
      await page.close();
    }
    assert.deepEqual(report.errors, []);
    console.log(`PASS ${report.checks.length} Chromium checks and ${report.captures.length} captures.`);
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
