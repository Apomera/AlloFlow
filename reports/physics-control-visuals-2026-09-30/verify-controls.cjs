#!/usr/bin/env node
// Run from any directory. Captures the pinned baseline and current source in one browser.
// Optional: PHYSICS_EXPECT_SOURCE_SHA256=<reviewed hash> node .../verify-controls.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const TOOL = 'stem_lab/stem_tool_physics.js';
const MIRROR = 'desktop/web-app/public/' + TOOL;
const BASELINE = '5a98bb0fa28b9ba2f87f443d2340115c92180a38';
const FIXTURE = 'reports/physics-deep-review-2026-09-27/preview-harness.cjs';
const sha = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const current = fs.readFileSync(path.join(ROOT, TOOL));
const baseline = execFileSync('git', ['--no-pager', 'show', BASELINE + ':' + TOOL], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const sourceSha256 = { baseline: sha(baseline), final: sha(current) };
const auditSha256 = sha(fs.readFileSync(__filename));
const dependencies = new Map();
const configurations = [], failures = [];
let baselineEvidence;

function readDependency(file, options) {
  const absolute = path.resolve(ROOT, file);
  if (!dependencies.has(absolute)) dependencies.set(absolute, fs.readFileSync(absolute));
  const buffer = dependencies.get(absolute);
  return typeof options === 'string' || options?.encoding ? buffer.toString(typeof options === 'string' ? options : options.encoding) : buffer;
}

function preview(source) {
  let fixture = readDependency(FIXTURE, 'utf8');
  const hook = 'window.__reviewState = pair[0]; var ctx = {';
  assert(fixture.includes(hook), 'Preview fixture state hook changed');
  fixture = fixture.replace(hook, 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
  fixture += '\nglobalThis.makePhysicsPage = html;';
  const virtualFs = { ...fs, readFileSync(file, options) {
    if (path.resolve(ROOT, file) === path.join(ROOT, TOOL)) return typeof options === 'string' || options?.encoding ? source.toString('utf8') : source;
    return readDependency(file, options);
  } };
  const sandbox = { require: name => name === 'node:fs' ? virtualFs : require(name), console,
    __dirname: path.join(ROOT, path.dirname(FIXTURE)), globalThis: {} };
  vm.runInNewContext(fixture, sandbox, { filename: 'physics-controls-preview.cjs' });
  return theme => sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme);
}

async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(30);
}

async function redraw(page) {
  await page.evaluate(() => {
    document.getElementById('physicsCanvas')._physScheduleFrame();
    window.__controlAuditTick();
  });
}

async function mount(browser, html, theme, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.evaluate(() => {
      let id = 0, now = 1000;
      const pending = new Map();
      window.requestAnimationFrame = callback => { pending.set(++id, callback); return id; };
      window.cancelAnimationFrame = key => pending.delete(key);
      window.__controlAuditTick = () => {
        now += 1000 / 60;
        const callbacks = [...pending.values()]; pending.clear();
        callbacks.forEach(callback => callback(now));
      };
    });
    await page.setContent(html(theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
    await redraw(page);
    return { page, errors };
  } catch (error) { await page.close(); throw error; }
}

async function recordFlights(page) {
  for (const [index, airResist] of [false, true].entries()) {
    await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10,
      airResist, simSpeed: 1, showVectors: true, showEnergy: true, showFlightData: true, showGraphs: true });
    await page.locator('[data-physics-launch]').click();
    await page.evaluate(() => {
      const canvas = document.getElementById('physicsCanvas'); let steps = 0;
      while (canvas._launched && steps++ < 10000) window.__controlAuditTick();
      if (canvas._launched) throw Error('Control audit flight did not land');
    });
    await page.waitForFunction(n => window.__reviewState.physics.runLog?.length === n, index + 1, { polling: 20 });
  }
  await patch(page, { simSpeed: 0 });
}

async function evidence(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('physicsCanvas'), data = window.__reviewState.physics;
    return { body: canvas._ball, runLog: data.runLog, lastFlight: data.lastFlight,
      trails: canvas._trails.map(trail => ({ points: [...trail], parameters: trail.parameters,
        run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion })) };
  });
}

async function auditInteractions(page, final, original) {
  const buttons = page.locator(final ? '[data-physics-view]' : '[data-physics-display-controls] button[aria-pressed]');
  assert.equal(await buttons.count(), 7, 'Expected seven view controls');
  const viewStates = [];
  for (let index = 0; index < 7; index++) {
    const button = buttons.nth(index), before = await button.getAttribute('aria-pressed');
    assert(['true', 'false'].includes(before), 'View control lacks a pressed state');
    for (let turn = 0; turn < 2; turn++) {
      await button.click();
      const expected = turn === 0 ? String(before !== 'true') : before;
      await page.waitForFunction(({ index, expected, final }) => {
        const selector = final ? '[data-physics-view]' : '[data-physics-display-controls] button[aria-pressed]';
        return document.querySelectorAll(selector)[index]?.getAttribute('aria-pressed') === expected;
      }, { index, expected, final }, { polling: 20 });
      await redraw(page);
      if (final) {
        const state = button.locator('.phys-view-state');
        assert(await state.isVisible(), 'Visible ON/OFF state missing');
        const badge = (await state.innerText()).trim().replace(/\s+/g, ' ');
        const reading = badge.match(/^(?:(✓|−)\s*)?(ON|OFF)$/);
        assert(reading, 'View badge must contain explicit ON/OFF text: ' + badge);
        assert.equal(reading[2], expected === 'true' ? 'ON' : 'OFF');
        if (reading[1]) assert.equal(reading[1], expected === 'true' ? '✓' : '−', 'View badge glyph disagrees with its pressed state');
      }
      assert.deepEqual(await evidence(page), original, 'View toggle modified recorded physics');
    }
    if (final) viewStates.push(await button.evaluate(node => {
      const state = node.querySelector('.phys-view-state');
      const icon = node.querySelector('[aria-hidden="true"]');
      return { key: node.getAttribute('data-physics-view'), pressed: node.getAttribute('aria-pressed'),
        state: state.textContent.trim(), icon: !!icon && !!icon.getClientRects().length,
        title: (node.querySelector('.phys-view-title')?.textContent || node.textContent.replace(state.textContent, '')).trim() };
    }));
  }
  if (final) {
    assert.equal(new Set(viewStates.map(view => view.key)).size, 7, 'View keys are not unique');
    assert(viewStates.every(view => view.key && view.title && view.icon), 'View icon or title missing');
  }
  await page.locator('[data-physics-history-select]').selectOption('0');
  for (const jump of ['launch', 'highest', 'latest']) {
    await page.locator('[data-physics-sample-jump="' + jump + '"]').click();
    await redraw(page);
    assert.deepEqual(await evidence(page), original, 'Inspection navigation modified recorded physics');
  }
  await page.locator('[data-physics-history-select]').selectOption('1');
  await page.locator('[data-physics-sample-jump="highest"]').click();
  await redraw(page);
  assert.deepEqual(await evidence(page), original, 'History selection modified recorded physics');
  return { viewStates, viewToggleCount: 14, inspectionNavigationCount: 6, evidenceUnchanged: true };
}

async function layout(page, final) {
  const geometry = await page.evaluate(() => {
    const $ = selector => document.querySelector(selector);
    const rect = element => { if (!element) return null; const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const follows = (first, second) => !!first && !!second && !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    const workbench = $('[data-physics-workbench]'), scene = workbench?.querySelector('.phys-scene');
    const sliders = $('[data-physics-sliders]'), primary = $('[data-physics-primary-controls]'), controls = $('[data-physics-controls]');
    const canvas = $('#physicsCanvas'), key = $('[data-physics-plot-key]');
    const viewButtons = [...document.querySelectorAll('[data-physics-view]')];
    const playback = [...document.querySelectorAll('[data-physics-playback-rate]')];
    const gravity = [...document.querySelectorAll('[data-gravity-preset]')];
    return { viewport: innerWidth, containerWidth: $('#physics-fs-outer').clientWidth,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      workbench: rect(workbench), scene: rect(scene), sliders: rect(sliders),
      slidersContentWidth: sliders.clientWidth - parseFloat(getComputedStyle(sliders).paddingLeft) - parseFloat(getComputedStyle(sliders).paddingRight),
      primary: rect(primary), controls: rect(controls), canvas: rect(canvas),
      primaryBeforeCanvas: follows(primary, canvas), sceneBeforeSettings: follows(scene, sliders), controlsAfterWorkbench: follows(workbench, controls),
      sceneContainsCanvasAndKey: !!scene && scene.contains(canvas) && scene.contains(key),
      workbenchContainsSettings: !!workbench && workbench.contains(sliders),
      parameters: [...document.querySelectorAll('[data-physics-parameter-card]')].map(card => ({
        key: card.getAttribute('data-physics-parameter-card'), rect: rect(card),
        unit: card.querySelector('[data-physics-parameter-unit]')?.textContent.trim() || '',
        range: card.querySelector('input[type="range"]')?.getAttribute('data-physics-parameter') || null })),
      views: viewButtons.map(rect), playback: playback.map(rect), gravity: gravity.map(rect),
      playbackDisplay: playback[0] ? getComputedStyle(playback[0].parentElement).display : null };
  });
  assert.equal(geometry.overflow, 0, 'Page overflows horizontally');
  assert(geometry.primaryBeforeCanvas && geometry.primary.bottom <= geometry.canvas.y + 1, 'Launch controls must precede the canvas');
  if (!final) return geometry;
  assert(geometry.workbench && geometry.sceneContainsCanvasAndKey && geometry.workbenchContainsSettings, 'Workbench structure missing');
  assert(geometry.sceneBeforeSettings && geometry.controlsAfterWorkbench, 'Workbench source order changed');
  assert(geometry.controls.y >= geometry.workbench.bottom - 1, 'Secondary controls precede the workbench visually');
  if (geometry.containerWidth > 900) {
    assert(geometry.scene.right <= geometry.sliders.x + 1 && Math.abs(geometry.scene.y - geometry.sliders.y) <= 2,
      'Desktop scene and settings must align side by side');
  } else assert(geometry.sliders.y >= geometry.scene.bottom - 1, 'Narrow layout must place settings after the scene');
  const expectedUnits = { angle: '°', velocity: 'm/s', gravity: 'm/s²', mass: 'kg', launchHeight: 'm' };
  assert.deepEqual(geometry.parameters.map(parameter => parameter.key).sort(), Object.keys(expectedUnits).sort());
  for (const parameter of geometry.parameters) {
    assert.equal(parameter.unit, expectedUnits[parameter.key], 'Missing explicit unit for ' + parameter.key);
    assert.equal(parameter.range, parameter.key, 'Parameter range is in the wrong card');
  }
  assert.equal(geometry.playback.length, 4); assert.equal(geometry.playbackDisplay, 'grid', 'Playback buttons must use a stable grid');
  assert(Math.max(...geometry.playback.map(r => r.width)) - Math.min(...geometry.playback.map(r => r.width)) <= 1, 'Playback button widths differ');
  if (geometry.containerWidth <= 460) {
    const twoColumns = (rows, label) => {
      assert(rows.length >= 3 && Math.abs(rows[0].y - rows[1].y) <= 1 && rows[0].right <= rows[1].x + 1 && rows[2].y >= rows[0].bottom - 1,
        label + ' must use two columns on a phone');
    };
    twoColumns(geometry.views, 'View controls'); twoColumns(geometry.gravity, 'Gravity presets');
    twoColumns(geometry.parameters.map(parameter => parameter.rect), 'Parameter cards');
    const fifth = geometry.parameters.find(parameter => parameter.key === 'launchHeight').rect;
    assert(fifth.width >= geometry.slidersContentWidth - 1, 'Fifth parameter must fill the phone settings width');
  }
  return geometry;
}

async function visualMetrics(page, final, theme) {
  const measured = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('[data-physics-primary-controls],[data-physics-controls],[data-physics-workbench]')];
    if (!document.querySelector('[data-physics-workbench]')) roots.push(document.querySelector('[data-physics-sliders]'), document.querySelector('#physics-fs-wrap'));
    const visible = node => !!node?.getClientRects().length && !node.closest('.sr-only,[aria-hidden="true"]') &&
      getComputedStyle(node).visibility !== 'hidden' && (!node.closest('details') || node.closest('details').open || !!node.closest('summary'));
    const rgba = color => { const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved CSS color: ' + color);
      const values = match[1].split(',').map(Number); return [...values.slice(0, 3), values.length > 3 ? values[3] : 1]; };
    const over = (ink, background) => ink.slice(0, 3).map((value, index) => value * ink[3] + background[index] * (1 - ink[3]));
    const lum = channels => channels.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; })
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const background = node => {
      const layers = [];
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.backgroundImage !== 'none') return null;
        const color = rgba(style.backgroundColor); layers.push(color);
        if (color[3] >= .999) break;
      }
      return layers.reverse().reduce((base, layer) => over(layer, base), [255, 255, 255]);
    };
    const text = [], targets = [], seen = new Set(); let disabledTextCount = 0;
    for (const root of roots.filter(Boolean)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        if (!node.textContent.trim() || !visible(element) || seen.has(node)) continue;
        seen.add(node);
        if (element.closest(':disabled,[aria-disabled="true"]')) { disabledTextCount++; continue; }
        const style = getComputedStyle(element), surface = background(element);
        const ink = surface ? lum(over(rgba(style.color), surface)) : null, ground = surface ? lum(surface) : null;
        text.push({ label: node.textContent.trim().slice(0, 80), font: parseFloat(style.fontSize),
          contrast: surface ? (Math.max(ink, ground) + .05) / (Math.min(ink, ground) + .05) : null });
      }
      for (const node of root.querySelectorAll('button,input,select,summary')) {
        if (!visible(node) || seen.has(node) || node.type === 'hidden') continue;
        seen.add(node); const box = node.getBoundingClientRect();
        targets.push({ label: node.getAttribute('aria-label') || node.id || node.textContent.trim().slice(0, 60),
          type: node.type || node.tagName.toLowerCase(), width: box.width, height: box.height, disabled: !!node.disabled });
      }
    }
    return { text, targets, disabledTextCount };
  });
  const threshold = theme === 'contrast' ? 7 : 4.5;
  const violations = { smallText: measured.text.filter(item => item.font < 12),
    contrast: measured.text.filter(item => item.contrast != null && item.contrast < threshold),
    unresolvedBackground: measured.text.filter(item => item.contrast == null),
    smallTargets: measured.targets.filter(item => item.width < 43.99 || item.height < 43.99) };
  assert(measured.text.length >= 20 && measured.targets.length >= 20, 'Too few control measurements');
  if (final) for (const [name, items] of Object.entries(violations)) assert.equal(items.length, 0, name + ': ' + JSON.stringify(items));
  return { qualityRequired: final, contrastThreshold: threshold,
    minFontPx: Math.min(...measured.text.map(item => item.font)),
    minContrast: Math.min(...measured.text.filter(item => item.contrast != null).map(item => item.contrast)),
    minTargetWidthPx: Math.min(...measured.targets.map(item => item.width)),
    minTargetHeightPx: Math.min(...measured.targets.map(item => item.height)),
    textCount: measured.text.length, targetCount: measured.targets.length,
    disabledTextCount: measured.disabledTextCount, violations };
}

async function capture(browser, html, version, theme, width) {
  const final = version === 'final', { page, errors } = await mount(browser, html, theme, width);
  try {
    await recordFlights(page);
    const original = await evidence(page);
    if (!baselineEvidence) baselineEvidence = original;
    assert.deepEqual(original, baselineEvidence, 'Captured launch model differs from pinned baseline');
    const interactions = await auditInteractions(page, final, original);
    const geometry = await layout(page, final), metrics = await visualMetrics(page, final, theme);
    const screenshots = [];
    const targets = final ? [['workbench', '[data-physics-workbench]'], ['controls', '[data-physics-controls]']]
      : [['canvas', '#physics-fs-wrap'], ['settings', '[data-physics-sliders]'], ['controls', '[data-physics-controls]']];
    for (const [label, selector] of targets) {
      const file = label + '-' + version + '-' + theme + '-' + width + '.png';
      await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
      screenshots.push(file);
    }
    assert.deepEqual(await evidence(page), original, 'Capture changed recorded evidence');
    assert.deepEqual(errors, [], 'Page errors during control audit');
    configurations.push({ version, theme, width, screenshots, ...metrics, geometry, ...interactions,
      modelMatchesBaseline: true, evidenceSha256: sha(original), pageErrors: errors });
    console.log('Verified ' + version + ' ' + theme + ' controls at ' + width + 'px');
  } catch (error) {
    failures.push({ version, theme, width, message: error.message, pageErrors: errors }); throw error;
  } finally { await page.close(); }
}

(async () => {
  let browser;
  try {
    assert(current.equals(fs.readFileSync(path.join(ROOT, MIRROR))), 'Physics source and desktop mirror differ');
    if (process.env.PHYSICS_EXPECT_SOURCE_SHA256) assert.equal(sourceSha256.final, process.env.PHYSICS_EXPECT_SOURCE_SHA256, 'Unexpected source hash');
    const pages = { baseline: preview(baseline), final: preview(current) };
    browser = await chromium.launch({ headless: true });
    for (const width of [1100, 320]) await capture(browser, pages.baseline, 'baseline', 'default', width);
    for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) await capture(browser, pages.final, 'final', theme, width);
    assert.equal(configurations.filter(config => config.version === 'baseline').length, 2);
    assert.equal(configurations.filter(config => config.version === 'final').length, 9);
  } catch (error) {
    if (!failures.length) failures.push({ message: error.message });
    throw error;
  } finally {
    if (browser) await browser.close();
    const sourceUnchanged = sha(fs.readFileSync(path.join(ROOT, TOOL))) === sourceSha256.final;
    const mirrorMatches = current.equals(fs.readFileSync(path.join(ROOT, MIRROR)));
    const auditorUnchanged = sha(fs.readFileSync(__filename)) === auditSha256;
    const dependencySha256 = Object.fromEntries([...dependencies].map(([file, buffer]) => [path.relative(ROOT, file).replace(/\\/g, '/'), sha(buffer)]));
    const dependenciesUnchanged = [...dependencies].every(([file, buffer]) => sha(fs.readFileSync(file)) === sha(buffer));
    for (const [key, okay] of Object.entries({ sourceUnchanged, mirrorMatches, auditorUnchanged, dependenciesUnchanged })) if (!okay) failures.push({ message: key + ' failed' });
    const passed = configurations.length === 11 && failures.length === 0;
    fs.writeFileSync(path.join(__dirname, 'controls-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), baselineCommit: BASELINE,
      sourceFile: TOOL, sourceSha256, auditSha256, dependencySha256, sourceUnchanged, mirrorMatches, auditorUnchanged, dependenciesUnchanged,
      passed, configurations, failures }, null, 2));
    assert(passed, 'Control visual audit failed; see controls-results.json');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
