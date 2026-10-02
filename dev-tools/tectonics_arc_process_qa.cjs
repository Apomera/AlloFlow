'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const source = fs.readFileSync(process.env.PT_TEST_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const registrySource = read('ui_strings.js'), registry = JSON.parse(registrySource);
if (process.env.PT_QA_KEYS) Object.assign(registry.stem.platetectonics, JSON.parse(fs.readFileSync(process.env.PT_QA_KEYS, 'utf8')));
const out = path.resolve(process.env.PT_QA_OUT || path.join(repo, 'scratch/tectonics-arc-process-review'));
fs.mkdirSync(out, { recursive: true });
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registrySource).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(registry.stem.platetectonics)).digest('hex'), candidateKeyOverlay: !!process.env.PT_QA_KEYS, checks: [], captures: [], layouts: [], errors: [], passed: false };
const check = (name, details) => { report.checks.push({ name, passed: true, details }); console.log('PASS', name); };
(async () => {
  let browser = null;
  const captureRequests = [];
  let currentLayout;
  async function createArcPage(width) {
    const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && /WebGL|GL_INVALID|shader/i.test(message.text())) report.errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><title>Arc formation process</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); const Renderer = THREE.WebGLRenderer; window.qaRenders = 0;
      THREE.WebGLRenderer = function (options) {
        const renderer = new Renderer({ ...options, preserveDrawingBuffer: true }), render = renderer.render;
        renderer.render = function (scene, camera) { qaRenders++; window.qaScene = scene; window.qaCamera = camera; window.qaRenderer = renderer; return render.call(this, scene, camera); };
        return renderer;
      };
      const prototype = CanvasRenderingContext2D.prototype;
      for (const method of ['beginPath', 'moveTo', 'lineTo', 'ellipse', 'quadraticCurveTo', 'stroke', 'fill', 'fillText']) {
        const native = prototype[method]; prototype[method] = function (...args) {
          if (this.canvas.dataset.tectSection) {
            if (method === 'fillText') {
              (this.qaCommands || (this.qaCommands = [])).push({ kind: 'text', text: args[0], x: args[1], y: args[2], font: this.font });
              if (this.qaCommands.length > 500) this.qaCommands.shift();
            } else if (method === 'beginPath') this.qaPath = [];
            else if (method === 'stroke' || method === 'fill') {
              (this.qaCommands || (this.qaCommands = [])).push({ kind: method, style: method === 'stroke' ? this.strokeStyle : this.fillStyle, dash: this.getLineDash(), path: [...(this.qaPath || [])] });
              if (this.qaCommands.length > 500) this.qaCommands.shift();
            } else (this.qaPath || (this.qaPath = [])).push({ kind: method, args });
          }
          return native.apply(this, args);
        };
      }
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(registry => {
      const root = ReactDOM.createRoot(document.querySelector('#app')); let generation = 0; window.qaRegistry = registry;
      window.mountArc = (dark, contrast = false) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaEffects = { writes: [], rewards: [], audio: [], notices: [] }; window.qaMissingTranslations = new Set();
        const translate = (key, fallback) => { const value = key.split('.').reduce((object, part) => object && typeof object === 'object' ? object[part] : undefined, qaRegistry); if (typeof value !== 'string') { qaMissingTranslations.add(key); return fallback; } return value; };
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, isContrast: contrast, t: translate,
          onRecordSlab: value => qaEffects.writes.push(value), onRecordDepths: value => qaEffects.writes.push(value), onRecordBoundaryInquiry: value => qaEffects.writes.push(value),
          awardXP: value => qaEffects.rewards.push(value), beep: value => qaEffects.audio.push(value), announceToSR: value => qaEffects.notices.push(value)
        })));
      };
    }, registry);
    if (width) await page.setViewportSize({ width, height: 1000 });
    return { browser, page };
  }
  try {
    const initial = await createArcPage(); browser = initial.browser;
    let page = initial.page;
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = () => page.evaluate(() => ({ time: document.querySelector('[data-pt-model-reading="time"]').textContent, rate: document.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value, paused: !document.querySelector('[data-pt-model-step]').disabled, effects: JSON.stringify(qaEffects), feature: document.querySelector('[data-tect-section]').dataset.ptBoundaryFeature, camera: __alloTectGL.debug().camera }));
    const panel = page.locator('[data-pt-arc-process-panel]');
    async function capture(name) {
      // Canvas captures can stop the headless compositor's frame clock. Complete
      // model and lifecycle assertions before capturing in a fresh browser.
      captureRequests.push({ name, layout: currentLayout, state: await snapshot(),
        step: await panel.locator('[data-pt-arc-step][aria-pressed="true"]').getAttribute('data-pt-arc-step'),
        scrollLeft: await page.locator('.pt-tect-frame').evaluate(frame => frame.scrollLeft),
        cut: await page.evaluate(() => __alloTectGL.debug().clipConstant) });
    }
    for (const { width, dark, contrast } of [
      { width: 1100, dark: false, contrast: false }, { width: 1100, dark: true, contrast: false },
      { width: 320, dark: false, contrast: false }, { width: 390, dark: true, contrast: false }, { width: 390, dark: true, contrast: true }
    ]) {
      const name = `${contrast ? 'contrast' : dark ? 'dark' : 'light'}-${width}`;
      currentLayout = { width, dark, contrast };
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(({ dark, contrast }) => mountArc(dark, contrast), { dark, contrast }); await panel.waitFor(); await settle();
      assert.equal(await panel.evaluate(node => node.open), false); assert.equal(await panel.locator('[data-pt-arc-step="none"]').getAttribute('aria-pressed'), 'true');
      await panel.locator('summary').focus(); await page.keyboard.press('Space'); await settle();
      await page.locator('[data-pt-boundary-feature-select="slab"]').click(); await settle(); const before2d = await snapshot();
      for (const id of ['water', 'melt', 'magma']) {
        await panel.locator(`[data-pt-arc-step="${id}"]`).focus(); await page.keyboard.press('Space'); await settle();
        assert.deepEqual(await snapshot(), before2d); assert.equal(await panel.locator(`[data-pt-arc-step="${id}"]`).getAttribute('aria-pressed'), 'true');
        const drawing = await page.locator('[data-tect-section]').evaluate((canvas, id) => {
          const context = canvas.getContext('2d'), commands = context.qaCommands || [];
          const water = [...commands].reverse().find(command => command.kind === 'stroke' && command.style === '#7dd3fc' && command.dash.length);
          const melt = [...commands].reverse().find(command => command.kind === 'fill' && command.path.some(point => point.kind === 'ellipse'));
          const magma = [...commands].reverse().find(command => command.kind === 'stroke' && command.style === '#ffd0a8' && command.path.some(point => point.kind === 'quadraticCurveTo'));
          const command = id === 'water' ? water : id === 'melt' ? melt : magma;
          const number = [...commands].reverse().find(command => command.kind === 'text' && command.text === String(['water', 'melt', 'magma'].indexOf(id) + 1));
          const cssScale = canvas.getBoundingClientRect().width / 540;
          return { found: !!command, command, width: canvas.width, height: canvas.height,
            number: number && { ...number, cssFont: parseFloat(number.font.match(/([\d.]+)px/)[1]) * cssScale, cssX: number.x * cssScale } };
        }, id);
        assert.equal(drawing.found, true);
        assert.ok(drawing.number && drawing.number.cssFont >= 14);
        check(name + '-2d-' + id + ': keyboard numbered trace preserves the experiment with a readable badge and distinct process', drawing);
        await page.locator('.pt-tect-frame').scrollIntoViewIfNeeded(); await settle();
        if (width < 560) await page.locator('.pt-tect-frame').evaluate((frame, cssX) => { frame.scrollLeft = Math.max(0, cssX - frame.clientWidth / 2); }, drawing.number.cssX);
        await capture(name + '-2d-' + id, page.locator('.pt-tect-frame'));
      }
      const patchPixels = await page.locator('[data-tect-section]').evaluate(canvas => {
        const context = canvas.getContext('2d'); let orange = 0;
        // Whole route starts inland of the blue slab edge. Pixel evidence must
        // appear there, not only in the text or the renderer's scene graph.
        const ratio = canvas.width / 540, region = context.getImageData(Math.floor(368 * ratio), Math.floor(188 * ratio), Math.ceil(22 * ratio), Math.ceil(20 * ratio));
        for (let i = 0; i < region.data.length; i += 4) if (region.data[i] > 180 && region.data[i + 1] > 95 && region.data[i + 1] < 215 && region.data[i + 2] < 160) orange++;
        return orange;
      });
      assert.ok(patchPixels > 0); check(name + ': actual 2D orange pixels start outside the slab', { orangePixels: patchPixels });
      await page.locator('[data-tect-view="3d"]').click(); await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
      const containment = await page.locator('.pt-tect-frame').evaluate(frame => {
        const box = frame.getBoundingClientRect(), canvas = frame.querySelector('[data-tect-gl]'), gl = canvas.getBoundingClientRect();
        return { scrollLeft: frame.scrollLeft, frame: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
          canvas: { left: gl.left, right: gl.right, top: gl.top, bottom: gl.bottom, width: gl.width, height: gl.height } };
      });
      assert.equal(containment.scrollLeft, 0);
      assert.ok(containment.canvas.width > 200 && containment.canvas.height >= 200);
      assert.ok(containment.canvas.left >= containment.frame.left - 0.1 && containment.canvas.right <= containment.frame.right + 0.1);
      assert.ok(containment.canvas.top >= containment.frame.top - 0.1 && containment.canvas.bottom <= containment.frame.bottom + 0.1);
      check(name + ': switching from a panned section reveals the entire WebGL canvas in its frame', containment);
      assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.visible), false); assert.match(await panel.locator('#pt-arc-process-status').innerText(), /Choose Cut face/);
      await page.locator('[data-tect-preset="section"]').click(); await settle();
      for (const id of ['water', 'melt', 'magma']) {
        const before = await snapshot(); await panel.locator(`[data-pt-arc-step="${id}"]`).click(); await settle(); assert.deepEqual(await snapshot(), before);
        const data = await page.evaluate(id => {
          const debug = __alloTectGL.debug(), group = qaScene.getObjectByName('arc-process-' + id), meshes = [];
          group.traverse(part => { if (part.isMesh) meshes.push({ feature: part.userData.feature, xyz: part.getWorldPosition(new THREE.Vector3()).toArray(), clipped: !!part.material.clippingPlanes?.length, depthTest: part.material.depthTest }); });
          return { debug: debug.arcProcess, meshes, builds: debug.geometryBuilds, number: debug.labelRects.find(label => label.text === String(['water', 'melt', 'magma'].indexOf(id) + 1)), labels: debug.labelRects };
        }, id);
        assert.equal(data.debug.visible, true); assert.equal(data.debug.step, id); assert.equal(data.debug.cut, 0);
        assert.ok(data.meshes.every(mesh => mesh.xyz[2] < 0 && mesh.clipped && mesh.depthTest === false)); assert.ok(data.number && data.number.height >= 18);
        for (const other of data.labels.filter(label => label !== data.number && label.text !== data.number.text)) {
          const x = Math.min(data.number.x + data.number.width, other.x + other.width) - Math.max(data.number.x, other.x), y = Math.min(data.number.y + data.number.height, other.y + other.height) - Math.max(data.number.y, other.y);
          assert.ok(x <= 0.01 || y <= 0.01, 'Number overlaps ' + other.text);
        }
        check(name + '-3d-' + id + ': real WebGL exposes clipped annotation with legible number and fixed experiment', data);
        await capture(name + '-3d-' + id, page.locator('.pt-tect-frame'));
      }
      await page.locator('[data-tect-preset="surface"]').click(); await settle(); assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.visible), false);
      assert.match(await panel.locator('#pt-arc-process-status').innerText(), /Choose Cut face/); await page.locator('[data-tect-preset="section"]').click(); await settle();
      const cut = page.locator('[data-tect-cut]');
      if (await cut.count()) { await cut.fill('22'); await cut.dispatchEvent('input'); await cut.dispatchEvent('change'); await settle(); }
      const builds = await page.evaluate(() => __alloTectGL.debug().geometryBuilds); await page.locator('[data-tect-gl]').focus(); await page.keyboard.press('ArrowLeft'); await settle();
      assert.equal(await page.evaluate(() => __alloTectGL.debug().geometryBuilds), builds); assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.visible), true);
      check(name + ': overhead hides underground trace and camera turn preserves rock');
      const metrics = await panel.evaluate(node => ({ overflow: document.documentElement.scrollWidth - innerWidth, buttons: [...node.querySelectorAll('button')].map(button => ({ text: button.textContent, font: parseFloat(getComputedStyle(button).fontSize), height: button.getBoundingClientRect().height, left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })), fonts: [...node.querySelectorAll('p,summary')].map(el => parseFloat(getComputedStyle(el).fontSize)) }));
      assert.equal(metrics.overflow, 0); assert.ok(metrics.fonts.every(font => font >= 14)); assert.ok(metrics.buttons.every(button => button.height >= 44 && button.font >= 14 && button.left >= 0 && button.right <= width));
      const violations = await panel.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(value => ({ id: value.id, nodes: value.nodes.map(node => node.failureSummary) })));
      assert.deepEqual(violations, []); report.layouts.push({ name, metrics, violations }); check(name + ': accessible disclosure, connected explanations and readable phone controls');
      await capture(name + '-controls', panel);
      await settle(); const idleBefore = await snapshot(), beforeRenders = await page.evaluate(() => qaRenders);
      await page.evaluate(() => new Promise(resolve => { let count = 0; function next() { if (++count >= 120) resolve(); else requestAnimationFrame(next); } requestAnimationFrame(next); }));
      assert.deepEqual(await snapshot(), idleBefore); assert.equal(await page.evaluate(() => qaRenders), beforeRenders);
      assert.deepEqual(await page.evaluate(() => ({ writes: qaEffects.writes, rewards: qaEffects.rewards, audio: qaEffects.audio })), { writes: [], rewards: [], audio: [] });
      check(name + ':120 idle frames leave the selected trace settled with no writes, rewards, sound or repeated notice');
      await panel.locator('summary').click(); await settle(); assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.step), null);
      assert.deepEqual(await page.evaluate(() => [...qaMissingTranslations]), []); check(name + ': closing clears the trace and every rendered key exists');
    }
    await browser.close(); browser = null;
    report.captureRequests = captureRequests;
    // Replay each requested view with the real renderer and the same physical
    // state. Each browser performs one final capture, then closes.
    const capturePattern = process.env.PT_QA_CAPTURE_PATTERN ? new RegExp(process.env.PT_QA_CAPTURE_PATTERN) : null;
    const selectedCaptures = captureRequests.filter(request => !capturePattern || capturePattern.test(request.name));
    report.captureSelection = { pattern: process.env.PT_QA_CAPTURE_PATTERN || null, requested: captureRequests.length, selected: selectedCaptures.length };
    for (const request of selectedCaptures) {
      const fresh = await createArcPage(request.layout.width); browser = fresh.browser; page = fresh.page;
      await page.evaluate(({ dark, contrast }) => mountArc(dark, contrast), request.layout);
      const freshPanel = page.locator('[data-pt-arc-process-panel]');
      await freshPanel.waitFor(); await settle();
      await freshPanel.locator('summary').focus(); await page.keyboard.press('Space'); await settle();
      await page.locator('[data-pt-boundary-feature-select="slab"]').click(); await settle();
      await freshPanel.locator('[data-pt-arc-step="' + request.step + '"]').click(); await settle();
      const controls = request.name.endsWith('-controls'), gl = controls || request.name.includes('-3d-');
      if (gl) {
        await page.locator('[data-tect-view="3d"]').click();
        await page.waitForFunction(() => __alloTectGL.debug().state === 'ready'); await settle();
        await page.locator('[data-tect-preset="section"]').click(); await settle();
        if (controls) {
          await page.locator('[data-tect-preset="surface"]').click(); await settle();
          await page.locator('[data-tect-preset="section"]').click(); await settle();
          const cut = page.locator('[data-tect-cut]');
          if (await cut.count()) { await cut.fill('22'); await cut.dispatchEvent('input'); await cut.dispatchEvent('change'); await settle(); }
          await page.locator('[data-tect-gl]').focus(); await page.keyboard.press('ArrowLeft'); await settle();
        }
        assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.step), request.step);
        assert.equal(await page.evaluate(() => __alloTectGL.debug().arcProcess.visible), true);
        assert.equal(await page.evaluate(() => __alloTectGL.debug().clipConstant), request.cut);
      }
      const actual = await snapshot();
      for (const field of ['time','rate','paused','feature','camera']) assert.deepEqual(actual[field], request.state[field], 'Capture fixture state differs: ' + request.name + ' ' + field);
      assert.deepEqual(await page.evaluate(() => ({ writes: qaEffects.writes, rewards: qaEffects.rewards, audio: qaEffects.audio })), { writes: [], rewards: [], audio: [] });
      const locator = controls ? freshPanel : page.locator('.pt-tect-frame');
      await locator.scrollIntoViewIfNeeded(); await settle();
      if (!gl) await locator.evaluate((frame, offset) => { frame.scrollLeft = offset; }, request.scrollLeft);
      const file = path.join(out, request.name + '.png');
      await locator.screenshot({ path: file, animations: 'disabled', timeout: 60000 }); report.captures.push(file);
      await browser.close(); browser = null;
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); if (browser) await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
