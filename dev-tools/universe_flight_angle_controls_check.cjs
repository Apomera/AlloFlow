'use strict';

const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_ANGLE_CONTROLS_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29/angle-detail/controls');
const preview = process.env.UNIVERSE_ANGLE_CONTROLS_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=54#universe-flight';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file));
const pins = {
  'stem_lab/universe_flight_scene.js': 'a8de9ef0c0dc7362dc1284917b106ff82072f3a6b4943d947a3c8de6354dadcf',
  'stem_lab/stem_tool_universe.js': '4fe5202b51d37e3b0bbed28cb7d12885ca53a17182fcd0ce5f4060eec0e3f7bb',
};
for (const [file, pin] of Object.entries(pins)) {
  assert.equal(hash(read(file)), pin); assert.deepEqual(read(file), read('desktop/web-app/public/' + file));
}
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, diagnosticOnly: !!process.env.UNIVERSE_ANGLE_CONTROLS_DIAGNOSTIC_ONLY, pins, harnessHash: hash(fs.readFileSync(__filename)), checks: [], sampling: [], accessibility: [], captures: [], systemTabs: [], served: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'browser-check.json'), JSON.stringify(result, null, 2) + '\n');
const check = name => { result.checks.push(name); save(); console.log('Passed ' + name); };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
function sameCamera(actual, expected) {
  assert.equal(actual.targetId, expected.targetId); assert.deepEqual(actual.state, expected.state);
  for (const key of ['mode', 'region', 'beta', 'compareRest', 'fov', 'exposure']) assert.equal(actual.settings[key], expected.settings[key]);
}

async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, hasTouch: true, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(60000); const pending = [];
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pins[pathname.slice(1)] && response.status() === 200) pending.push(response.body().then(body => result.served.push({ path: pathname, hash: hash(body) })));
    });
    await page.addInitScript(() => {
      const records = new WeakMap();
      function record(gl) {
        if (!records.has(gl)) records.set(gl, { queries: [], maximumQueries: 0, maximum: null, textures: [], allocations: { Buffer: 0, Texture: 0, Program: 0 }, deleted: { Buffer: 0, Texture: 0, Program: 0 }, writes: [] });
        return records.get(gl);
      }
      for (const prototype of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) {
        for (const kind of ['Buffer', 'Texture', 'Program']) for (const action of ['create', 'delete']) {
          const original = prototype[action + kind];
          prototype[action + kind] = function (...args) {
            const value = original.apply(this, args), state = record(this);
            if (action === 'create') { state.allocations[kind]++; if (kind === 'Texture') state.textures.push(value); }
            else state.deleted[kind]++;
            return value;
          };
        }
        const extension = prototype.getExtension, parameter = prototype.getParameter, textureParameter = prototype.texParameterf;
        prototype.getExtension = function (name) {
          const value = extension.call(this, name);
          if (/texture_filter_anisotropic/.test(name)) record(this).queries.push({ name, available: !!value });
          return value;
        };
        prototype.getParameter = function (name) { const value = parameter.call(this, name); if (name === 0x84ff) { record(this).maximumQueries++; record(this).maximum = value; } return value; };
        prototype.texParameterf = function (target, name, value) {
          if (name === 0x84fe) record(this).writes.push({ texture: record(this).textures.indexOf(parameter.call(this, this.TEXTURE_BINDING_2D)), value });
          return textureParameter.call(this, target, name, value);
        };
      }
      // Hold native flight frames while leaving React, layout and focus scheduling live.
      const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window), frames = new Map();
      let nextId = -1, time = 10000;
      window.requestAnimationFrame = function (callback) {
        if (callback.name === 'frame' && callback.toString().includes('glideFrame')) { const id = nextId--; frames.set(id, callback); return id; }
        return raf(callback);
      };
      window.cancelAnimationFrame = function (id) { if (id < 0) frames.delete(id); else cancel(id); };
      window.__tickScene = function (seconds = 0) { time += seconds * 1000; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); };
      window.__samplingState = function () {
        const gl = window.__canvas.getContext('webgl'), state = record(gl), binding = gl.getParameter(gl.TEXTURE_BINDING_2D);
        const values = state.textures.map(texture => { gl.bindTexture(gl.TEXTURE_2D, texture); return gl.getTexParameter(gl.TEXTURE_2D, 0x84fe); });
        gl.bindTexture(gl.TEXTURE_2D, binding);
        return { queries: state.queries.slice(), maximumQueries: state.maximumQueries, maximum: state.maximum, allocations: { ...state.allocations }, deleted: { ...state.deleted }, writes: state.writes.slice(), galaxy: values[0], cloud: values[1], error: gl.getError() };
      };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const scene = create.call(this, canvas, { ...options, onTelemetry(info) { window.__info = info; options.onTelemetry?.(info); }, onStatus(status) { window.__status = status; options.onStatus?.(status); } });
          window.__scene = scene; window.__canvas = canvas; return scene;
        }; api = value;
      } });
    });
    await page.goto(preview); await page.waitForFunction(() => window.__status?.state === 'ready' && window.__info?.viewpointGlide);
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    const stage = page.locator('.uf-stage'), mainQuality = page.locator('#uf-quality'), composeQuality = page.locator('#uf-inview-quality');
    const inspector = stage.locator('.uf-inspector'), perspective = inspector.locator('.uf-inspector-perspective');
    const snapshot = () => page.evaluate(() => __scene.snapshot()), info = () => page.evaluate(() => __info);
    async function tick(seconds = 0, count = 1) { await page.evaluate(({ seconds, count }) => { for (let i = 0; i < count; i++) __tickScene(seconds); __scene.set({}); }, { seconds, count }); }
    async function sampling(name, quality) {
      const state = await page.evaluate(() => __samplingState());
      assert.deepEqual(state.queries, [{ name: 'EXT_texture_filter_anisotropic', available: true }]); assert.equal(state.maximumQueries, 1);
      assert.deepEqual(state.allocations, { Buffer: 2, Texture: 2, Program: 2 }); assert.equal(state.cloud, 1); assert.equal(state.error, 0);
      assert.ok(Number.isFinite(state.maximum) && state.maximum > 1);
      assert.equal(state.galaxy, quality === 'low' ? 1 : Math.min(4, state.maximum)); assert.ok(state.writes.every(write => write.texture === 0 && write.value >= 1 && write.value <= Math.min(4, state.maximum)));
      result.sampling.push({ name, quality, ...state }); save(); return state;
    }
    async function setQuality(control, quality, name) {
      const before = await snapshot(), glide = (await info()).viewpointGlide;
      await control.selectOption(quality); await page.waitForFunction(value => __scene.snapshot().settings.quality === value, quality);
      await tick(); sameCamera(await snapshot(), before); assert.deepEqual((await info()).viewpointGlide, glide);
      await sampling(name, quality);
    }
    async function paused() {
      assert.equal((await info()).running, false); const before = await snapshot(), pixels = await page.evaluate(() => __scene.capture().dataUrl);
      await tick(.5, 3); assert.deepEqual(await snapshot(), before); assert.equal(await page.evaluate(() => __scene.capture().dataUrl), pixels);
    }
    async function axeCheck(name, scope, collectOnly = false) {
      const violations = await scope.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target), details: item.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary, checks: node.any.map(check => ({ id: check.id, data: check.data, message: check.message })) })) })));
      result.accessibility.push({ name, violations }); save(); if (!collectOnly) assert.deepEqual(violations, []);
    }
    async function capture(name, scope = stage) { await scope.screenshot({ path: path.join(report, name + '.png') }); result.captures.push({ name, hash: hash(fs.readFileSync(path.join(report, name + '.png'))) }); save(); }
    async function reachable(control) {
      await control.scrollIntoViewIfNeeded();
      assert.equal(await control.evaluate(node => { const rect = node.getBoundingClientRect(); return rect.width < 44 || rect.height < 44 || rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1 || rect.bottom > innerHeight + 1 || !node.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)); }), false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    async function fullscreen() { await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await tick(); }
    async function mainSettings() {
      const disclosure = page.locator('.uf-view-settings');
      if (!await disclosure.evaluate(node => node.open)) await disclosure.locator('summary').click();
    }
    async function compose() {
      if (!await page.locator('#uf-inview-controls').isVisible()) await page.locator('#uf-flight-controls-toggle').click();
      await page.locator('#uf-inview-tab-compose').click(); await composeQuality.waitFor({ state: 'visible' });
    }
    async function closeCompose() { await stage.getByRole('button', { name: 'Close flight controls', exact: true }).click(); }
    async function launch() {
      if (await inspector.getByRole('button', { name: 'Details', exact: true }).getAttribute('aria-expanded') !== 'true') await inspector.getByRole('button', { name: 'Details', exact: true }).click();
      if (!await perspective.evaluate(node => node.open)) await perspective.locator('summary').click();
      await perspective.locator('[data-distance-style="glide"]').click();
      await perspective.getByRole('button', { name: '15 degree viewpoint steps', exact: true }).click();
      const before = await snapshot(), plan = await page.evaluate(() => __scene.planViewpointGlide('galactic-center', 'left', 15));
      await perspective.locator('[data-perspective-step="left"]').click(); await tick(); await tick(.5);
      assert.equal((await info()).viewpointGlide.active, true); near((await info()).viewpointGlide.progress, 1 / 6);
      return { before, plan };
    }

    await tick(); await sampling('initial-auto', 'auto');
    await page.locator('#uf-region').selectOption('galaxy');
    await page.locator('.uf-vistas').getByRole('button', { name: /^Spiral galaxy side view/ }).click(); await tick();
    await page.locator('#uf-target-info').getByRole('button', { name: 'Open landmark inspector', exact: true }).click();
    await mainSettings();
    if (!result.diagnosticOnly) {
    for (const quality of ['low', 'high', 'auto']) { await setQuality(mainQuality, quality, 'main-' + quality); await paused(); }
    const cached = await sampling('before-noop-settings', 'auto');
    await page.evaluate(() => { __scene.set({ quality: 'auto' }); __scene.set({ quality: 'auto' }); window.dispatchEvent(new Event('resize')); }); await tick();
    assert.deepEqual(await sampling('after-noop-settings', 'auto'), cached);
    await axeCheck('main-rendering-settings', page.locator('.uf-controls'));
    check('Main Low, High and Balanced settings change only the galaxy sampler, preserve camera and clocks, and reuse one extension/capability query');

    await fullscreen(); await compose();
    for (const quality of ['low', 'high', 'auto']) { await setQuality(composeQuality, quality, 'compose-' + quality); assert.equal(await mainQuality.inputValue(), quality); }
    await reachable(composeQuality); await axeCheck('compose-desktop', page.locator('#uf-inview-controls')); await capture('angle-compose-desktop');
    await closeCompose(); await paused();
    check('Fullscreen Compose shares the main quality setting and keeps the cloud sampler and paused pixels unchanged');

    const arc = await launch(), partial = await info(); await compose();
    for (const quality of ['low', 'high', 'auto']) { await setQuality(composeQuality, quality, 'active-glide-' + quality); assert.equal((await info()).running, true); }
    assert.deepEqual((await info()).viewpointGlide, partial.viewpointGlide);
    await closeCompose(); await inspector.locator('.uf-inspector-actions').getByRole('button', { name: 'Pause glide', exact: true }).click(); await tick(); await paused();
    await inspector.locator('.uf-inspector-actions').getByRole('button', { name: 'Resume glide', exact: true }).click(); await tick(); await tick(.5, 6);
    const arrived = await snapshot(), arrivedInfo = await info(); assert.deepEqual(arrived.state.position, arc.plan.position);
    near(arrived.state.distanceLy - arc.before.state.distanceLy, arc.plan.distanceLy); assert.equal(arrivedInfo.viewpointGlide.completed, true);
    for (const key of ['universeYears', 'travelerYears']) assert.equal(arrived.state[key], arc.before.state[key]);
    for (const key of ['fov', 'exposure']) assert.equal(arrived.settings[key], arc.before.settings[key]);
    near(arrivedInfo.target.screen[0], .5); near(arrivedInfo.target.screen[1], .5); await paused(); await sampling('completed-glide', 'auto');
    await fullscreen();
    check('Changing sampling during an active viewpoint glide preserves its pose, progress, clocks, target framing and exact arrival; Pause freezes pixels');

    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport); await tick(); await mainSettings(); await reachable(mainQuality);
      await setQuality(mainQuality, 'low', 'main-' + viewport.width); await axeCheck('main-' + viewport.width, page.locator('.uf-controls'));
      await fullscreen(); await compose(); await reachable(composeQuality);
      await setQuality(composeQuality, 'auto', 'compose-' + viewport.width); await paused();
      await axeCheck('compose-' + viewport.width, page.locator('#uf-inview-controls')); await capture('angle-compose-' + viewport.width);
      await closeCompose(); await fullscreen();
    }
    check('Phone and short landscape keep normal and fullscreen quality controls reachable without horizontal overflow');
    }

    await page.setViewportSize({ width: 1280, height: 850 }); await tick(); await fullscreen(); await launch();
    const motionOrigin = await snapshot(); await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await page.waitForFunction(() => !__info.viewpointGlide.active && !__info.running); await tick(); sameCamera(await snapshot(), motionOrigin);
    assert.equal(await perspective.locator('[data-distance-style="step"]').getAttribute('aria-pressed'), 'true');
    await compose(); await setQuality(composeQuality, 'low', 'reduced-colors-low'); await setQuality(composeQuality, 'auto', 'reduced-colors-auto');
    await reachable(composeQuality); await paused();
    result.forcedColors = await page.evaluate(() => {
      const selectors = ['#uf-inview-title', '.uf-inview-display > h4', 'label[for="uf-inview-fov"]', 'label[for="uf-inview-exposure"]', 'label[for="uf-inview-quality"]', '#uf-inview-quality', '.uf-inview-display > .uf-note', '.uf-composition-controls > h4'];
      function style(node) { const s = getComputedStyle(node); return { tag: node.tagName, id: node.id, className: node.className, color: s.color, backgroundColor: s.backgroundColor, backgroundImage: s.backgroundImage, forcedColorAdjust: s.forcedColorAdjust, opacity: s.opacity }; }
      return { active: matchMedia('(forced-colors:active)').matches, nodes: selectors.map(selector => { const node = document.querySelector(selector), ancestors = []; for (let parent = node?.parentElement; parent; parent = parent.parentElement) { ancestors.push(style(parent)); if (parent.classList.contains('uf-stage')) break; } return { selector, computed: node ? style(node) : null, ancestors }; }) };
    });
    save(); await capture('angle-compose-reduced-motion-colors'); await axeCheck('compose-reduced-motion-colors', page.locator('#uf-inview-controls'));
    const systemPose = await snapshot();
    for (const section of ['compose', 'explore', 'travel']) {
      const tab = page.locator('#uf-inview-tab-' + section); await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      const outline = await tab.evaluate(node => { const style = getComputedStyle(node); return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor, offset: style.outlineOffset }; });
      assert.ok(outline.width >= 2 && outline.style !== 'none'); result.systemTabs.push({ section, ...outline });
      if (section !== 'compose') await axeCheck(section + '-reduced-motion-colors', page.locator('#uf-inview-controls'), true);
      sameCamera(await snapshot(), systemPose);
    }
    assert.deepEqual(result.accessibility.filter(scope => scope.violations.length), []);
    check('Reduced motion ends the glide at its current view while quality remains operable in system colors');
    check('Compose, Explore and Travel remain readable in system colors with a visible selected tab outline and unchanged paused camera');

    await Promise.all(pending);
    for (const [file, pin] of Object.entries(pins)) { assert.equal(hash(read(file)), pin); const served = result.served.filter(item => item.path === '/' + file); assert.ok(served.length && served.every(item => item.hash === pin)); }
    assert.deepEqual(result.errors, []); result.completed = true; save();
    console.log(JSON.stringify({ completed: true, checks: result.checks.length, accessibility: result.accessibility.length, captures: result.captures.length, sampling: result.sampling.length }));
  } finally { await browser.close(); }
}
main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
