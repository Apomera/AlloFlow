#!/usr/bin/env node
// Run from any directory: node reports/physics-apex-inspection-2026-09-30/verify-apex.cjs
// The pinned baseline and the captured current source run sequentially in one browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const TOOL = 'stem_lab/stem_tool_physics.js';
const BASELINE = 'a0ec3e9e4b666a2f3ca98800e9a5155a8019354b';
const currentSource = fs.readFileSync(path.join(ROOT, TOOL));
const baselineSource = execFileSync('git', ['--no-pager', 'show', BASELINE + ':' + TOOL], {
  cwd: ROOT, maxBuffer: 16 * 1024 * 1024,
});
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const sourceHashes = { baseline: hash(baselineSource), final: hash(currentSource) };
const configurations = [], shortFlights = [], comparisons = [], failures = [];
const referenceEvidence = new Map();

function makePreview(source) {
  let fixture = fs.readFileSync(path.join(ROOT, 'reports/physics-deep-review-2026-09-27/preview-harness.cjs'), 'utf8');
  assert(fixture.includes('window.__reviewState = pair[0]; var ctx = {'), 'Preview fixture state hook changed');
  fixture = fixture.replace('window.__reviewState = pair[0]; var ctx = {',
    'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
  fixture += '\nglobalThis.makePhysicsPage = html;';
  const previewFs = { ...fs, readFileSync(file, options) {
    const absolute = path.resolve(ROOT, file);
    if (absolute === path.join(ROOT, TOOL)) return typeof options === 'string' || options?.encoding ? source.toString('utf8') : source;
    return fs.readFileSync(absolute, options);
  } };
  const sandbox = {
    require: name => name === 'node:fs' ? previewFs : require(name), console,
    __dirname: path.join(ROOT, 'reports/physics-deep-review-2026-09-27'), globalThis: {},
  };
  vm.runInNewContext(fixture, sandbox, { filename: 'physics-preview-harness.cjs' });
  return theme => sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme);
}

async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(50);
}

async function redraw(page) {
  await page.evaluate(() => {
    document.getElementById('physicsCanvas')._physScheduleFrame();
    window.__apexAuditTick();
  });
}

async function mount(browser, preview, theme, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.evaluate(() => {
      let id = 0, now = 1000;
      const frames = new Map();
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
      window.cancelAnimationFrame = key => frames.delete(key);
      window.__apexAuditTick = () => {
        now += 1000 / 60;
        const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
      };
    });
    await page.setContent(preview(theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
    return { page, errors };
  } catch (error) { await page.close(); throw error; }
}

async function launch(page, parameters, run) {
  await patch(page, { ...parameters, simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'); let count = 0;
    while (cv._launched && count++ < 10000) window.__apexAuditTick();
    if (cv._launched) throw Error('Apex audit flight did not land');
  });
  await page.waitForFunction(n => window.__reviewState.physics.runLog?.length === n, run, { polling: 20 });
  await patch(page, { simSpeed: 0 });
}

async function evidence(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'), data = window.__reviewState.physics;
    return { body: cv._ball, runLog: data.runLog, lastFlight: data.lastFlight,
      trails: cv._trails.map(trail => ({ points: [...trail], parameters: trail.parameters,
        run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion })) };
  });
}

function isApex(point, metadata) {
  return !!metadata && point.t === metadata.tSec && point.mX === metadata.mX && point.mY === metadata.mY &&
    point.mVx === metadata.vx && point.mVy === 0;
}

function compareEvidence(baseline, final, scenario, width) {
  assert.deepEqual(final.body, baseline.body, scenario + ': projectile body changed');
  assert.deepEqual(final.runLog, baseline.runLog, scenario + ': run log changed');
  assert.deepEqual(final.lastFlight, baseline.lastFlight, scenario + ': last-flight outcome changed');
  assert.equal(final.trails.length, baseline.trails.length);
  const normalized = { ...final, trails: final.trails.map((trail, index) => {
    const original = baseline.trails[index];
    const newApex = trail.points.filter(point => isApex(point, trail.apex) &&
      !original.points.some(prior => prior.t === point.t));
    assert.equal(newApex.length, 1, scenario + ': expected one extra resolved apex');
    const points = trail.points.filter(point => !newApex.includes(point));
    assert.deepEqual(points, original.points, scenario + ': regular samples changed');
    return { ...trail, points };
  }) };
  assert.deepEqual(normalized, baseline, scenario + ': recorded metadata changed');
  return {
    scenario, width, bodyUnchanged: true, runLogUnchanged: true, lastFlightUnchanged: true,
    regularSamplesUnchanged: true, normalizedEvidenceSha256: hash(normalized),
    baselineSamples: baseline.trails.map(trail => trail.points.length), finalSamples: final.trails.map(trail => trail.points.length),
  };
}

async function selectedViews(page, final) {
  await redraw(page);
  const result = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'), sample = cv._inspection.snapshot, trail = cv._inspection.trail;
    const numeric = (node, field) => Number(node.getAttribute(field));
    const graphs = ['vx', 'vy'].map(field => {
      const marker = document.querySelector('[data-physics-graph-marker="' + field + '"]');
      const cursor = document.querySelector('[data-physics-graph-cursor="' + field + '"]');
      return { field, index: numeric(marker, 'data-sample-index'), t: numeric(marker, 'data-time'),
        value: numeric(marker, 'data-value'), x: numeric(marker, 'cx'), cursorX: numeric(cursor, 'x1') };
    });
    const energy = document.querySelector('[data-physics-energy-cursor]');
    const status = document.querySelector('[data-physics-sample-status]');
    return { sample, point: trail[sample.index], apex: trail.apex, count: trail.length,
      canonicalIndices: trail.map((point, index) => ({ point, index })).filter(({ point }) =>
        trail.apex && point.t === trail.apex.tSec && point.mX === trail.apex.mX && point.mY === trail.apex.mY &&
        point.mVx === trail.apex.vx && point.mVy === 0).map(entry => entry.index),
      times: trail.map(point => point.t), graphs,
      energy: { index: numeric(energy, 'data-sample-index'), t: numeric(energy, 'data-time') },
      energyValues: ['ke', 'mechanical'].map(field => numeric(document.querySelector('[data-physics-energy-boundary="' + field + '"]'), 'data-value')),
      canvas: cv._visualInspection,
      selectedTableIndices: [...document.querySelectorAll('[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index]')]
        .map(node => numeric(node, 'data-physics-sample-index')),
      phase: document.querySelector('[data-physics-motion-phase]')?.getAttribute('data-physics-motion-phase') || null,
      phaseValues: ['vy', 'ay'].map(field => {
        const node = document.querySelector('[data-physics-phase-value="' + field + '"]');
        return node ? { value: numeric(node, 'data-value'), text: node.textContent.trim() } : null;
      }),
      phaseLabel: document.querySelector('[data-physics-phase-label]')?.textContent.trim() || null,
      status: status ? { text: status.textContent.trim(), role: status.getAttribute('role'), live: status.getAttribute('aria-live'), atomic: status.getAttribute('aria-atomic') } : null,
    };
  });
  const sample = result.sample;
  assert.deepEqual([sample.t, sample.x, sample.y, sample.vx, sample.vy],
    [result.point.t, result.point.mX, result.point.mY, result.point.mVx, result.point.mVy]);
  assert.deepEqual(result.selectedTableIndices, [sample.index]);
  assert.equal(result.canvas.index, sample.index); assert.equal(result.canvas.t, sample.t);
  for (const graph of result.graphs) {
    assert.equal(graph.index, sample.index); assert.equal(graph.t, sample.t);
    assert.equal(graph.value, sample[graph.field]); assert.equal(graph.x, graph.cursorX);
  }
  assert.equal(result.energy.index, sample.index); assert.equal(result.energy.t, sample.t);
  assert.deepEqual(result.energyValues, [sample.ke, sample.totalEnergy]);
  assert.equal(new Set(result.times).size, result.times.length, 'Duplicate sample time');
  assert(result.times.every((time, index) => index === 0 || time > result.times[index - 1]), 'Sample order changed');
  if (final) {
    assert.equal(result.phase, sample.phase);
    assert.deepEqual(result.phaseValues.map(reading => reading.value), [sample.vy, sample.ay]);
    assert(result.status, 'Missing compact status');
    assert.deepEqual([result.status.role, result.status.live, result.status.atomic], ['status', 'polite', 'true']);
    assert(result.status.text.includes('Sample ' + (sample.index + 1)));
    assert(result.status.text.includes(sample.t.toFixed(3) + ' s'));
    assert(result.status.text.includes(result.phaseLabel));
    assert(result.status.text.length < 200 && !/kinetic|potential|force|energy/i.test(result.status.text));
  }
  return result;
}

async function selectHighest(page, final) {
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const result = await selectedViews(page, final);
  if (final) {
    assert.deepEqual(result.canonicalIndices, [result.sample.index]);
    assert.equal(result.sample.phase, 'apex'); assert.equal(result.sample.apex, true);
    assert.equal(result.sample.vy, 0); assert.equal(result.sample.ay, -result.sample.parameters.gravity);
    assert.deepEqual([result.sample.t, result.sample.x, result.sample.y, result.sample.vx],
      [result.apex.tSec, result.apex.mX, result.apex.mY, result.apex.vx]);
    assert.equal(await page.locator('[data-physics-sample-landmark="apex"]').count(), 1);
  }
  return result;
}

async function navigationAudit(page, final, original, runCount) {
  const apexReadings = [];
  for (let run = 1; run <= runCount; run++) {
    if (runCount > 1) await page.locator('[data-physics-history-select]').selectOption(String(run - 1));
    else await page.locator('[data-physics-inspect]').click();
    const selected = await selectHighest(page, final);
    if (final) await page.evaluate(() => { window.__apexAuditStatus = document.querySelector('[data-physics-sample-status]'); });
    for (const jump of ['launch', 'latest', 'highest']) {
      const button = page.locator('[data-physics-sample-jump="' + jump + '"]');
      await button.focus(); await button.press('Enter');
      await selectedViews(page, final);
      assert(await button.evaluate(node => node === document.activeElement), 'Landmark keyboard focus lost');
      if (final) assert(await page.evaluate(() => window.__apexAuditStatus === document.querySelector('[data-physics-sample-status]')), 'Status node was replaced');
    }
    const retained = await selectHighest(page, final);
    assert.deepEqual(retained.sample, selected.sample, 'Navigation changed the captured sample');
    const source = original.trails[run - 1].parameters;
    assert.deepEqual(retained.sample.parameters, { angle: source.angle, velocity: source.velocity, gravity: source.gravity,
      mass: source.mass, launchHeight: source.launchHeight, airResist: source.drag, modelVersion: original.trails[run - 1].modelVersion });
    apexReadings.push({ run, index: retained.sample.index, count: retained.count, time: retained.sample.t,
      height: retained.sample.y, vy: retained.sample.vy, ay: retained.sample.ay, phase: retained.phase,
      canonicalApex: retained.canonicalIndices.includes(retained.sample.index), statusNodeStable: final ? true : null,
      viewsSynchronized: true });
  }
  assert.deepEqual(await evidence(page), original, 'Navigation changed recorded evidence');
  return apexReadings;
}

async function inspectorMetrics(root, final, theme) {
  const metrics = await root.evaluate(panel => {
    const visible = node => {
      if (!node.getClientRects().length || node.closest('.sr-only,[aria-hidden="true"]')) return false;
      const details = node.closest('details');
      return !details || details.open || !!node.closest('summary');
    };
    const rgb = color => {
      const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved color: ' + color);
      return match[1].split(',').map(Number);
    };
    const lum = color => rgb(color).slice(0, 3).map(value => {
      const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const text = [], walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !visible(element)) continue;
      let background;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const color = getComputedStyle(ancestor).backgroundColor, channels = rgb(color);
        if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
      }
      if (!background) throw Error('No resolved inspector surface');
      const style = getComputedStyle(element), ink = lum(style.color), surface = lum(background);
      text.push({ font: parseFloat(style.fontSize), contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) });
    }
    const targets = [...panel.querySelectorAll('button,input[type="range"],summary')].filter(visible).map(node => {
      const box = node.getBoundingClientRect();
      return { type: node.tagName.toLowerCase(), width: box.width, height: box.height };
    });
    const rect = panel.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth - innerWidth, panelLeft: rect.left, panelRight: rect.right,
      viewport: innerWidth, text, targets };
  });
  assert.equal(metrics.overflow, 0, 'Page overflows');
  assert(metrics.panelLeft >= 0 && metrics.panelRight <= metrics.viewport + 1, 'Inspector leaves viewport');
  assert(metrics.text.length > 20 && metrics.text.every(text => text.font >= 12), 'Inspector text below 12px');
  const threshold = theme === 'contrast' ? 7 : 4.5;
  assert(metrics.text.every(text => text.contrast >= threshold), 'Inspector text contrast below ' + threshold);
  assert(metrics.targets.length > 6);
  for (const target of metrics.targets) {
    const minimum = final ? 44 : target.type === 'input' ? 30 : target.type === 'summary' ? 32 : 44;
    assert(target.height >= minimum && target.width >= 44, 'Inspector target below ' + minimum + 'px');
  }
  return { overflow: metrics.overflow, minFontPx: Math.min(...metrics.text.map(text => text.font)),
    minContrast: Math.min(...metrics.text.map(text => text.contrast)), contrastThreshold: threshold,
    minTargetWidthPx: Math.min(...metrics.targets.map(target => target.width)),
    minTargetHeightPx: Math.min(...metrics.targets.map(target => target.height)),
    textCount: metrics.text.length, targetCount: metrics.targets.length };
}

async function capture(browser, preview, version, theme, width, short) {
  const final = version === 'final', scenario = short ? 'short-flight' : 'normal-flight';
  const { page, errors } = await mount(browser, preview, theme, width);
  try {
    const parameters = short ? { angle: 5, velocity: 5, gravity: 25, launchHeight: 0, mass: 2, airResist: false }
      : { angle: 35, velocity: 35, gravity: 9.8, launchHeight: 10, mass: 2, airResist: false };
    await launch(page, parameters, 1);
    if (!short) await launch(page, { ...parameters, airResist: true }, 2);
    const original = await evidence(page);
    if (!short) await patch(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 30, mass: 9, airResist: false });
    const readings = await navigationAudit(page, final, original, short ? 1 : 2);
    const root = page.locator('[data-physics-sample-inspector]');
    await root.locator('[data-physics-sample-forces] summary').click();
    const screenshot = (short ? 'short-flight-' : 'inspector-') + version + '-' + theme + '-' + width + '.png';
    await root.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled' });
    const metrics = await inspectorMetrics(root, final, theme);
    if (short && final) {
      assert.equal(original.trails[0].points.length, 3);
      assert(readings[0].height > 0 && readings[0].height < .01, 'Short-flight apex height missing');
      const actualHeight = await root.locator('[data-physics-measurement="y"] dd').innerText();
      assert.equal(actualHeight, readings[0].height.toPrecision(3) + ' m', 'Tiny apex height rounded away');
      const tableHeight = await page.locator('[data-physics-flight-table] tr[data-selected="true"] td').nth(1).textContent();
      assert.equal(tableHeight.trim(), readings[0].height.toPrecision(3), 'Tiny table height rounded away');
      const summaryHeight = await page.locator('[data-physics-flight-summary-value="height"]').textContent();
      assert.equal(summaryHeight.trim(), readings[0].height.toPrecision(3) + ' m', 'Tiny summary height rounded away');
    }
    assert.deepEqual(await evidence(page), original, 'Screenshot or disclosure changed evidence');
    assert.deepEqual(errors, [], 'Page error during visual audit');
    const key = scenario + '-' + width;
    if (!final) referenceEvidence.set(key, original);
    else if (theme === 'default' && width !== 375) {
      const baseline = referenceEvidence.get(key); assert(baseline, 'Missing baseline comparison');
      comparisons.push(compareEvidence(baseline, original, scenario, width));
    }
    const result = { version, scenario, theme, width, screenshot, ...metrics, pageErrors: errors,
      evidenceUnchanged: true, evidenceSha256: hash(original), apexReadings: readings };
    (short ? shortFlights : configurations).push(result);
    console.log('Verified ' + version + ' ' + scenario + ' ' + theme + ' at ' + width + 'px');
  } catch (error) {
    failures.push({ version, scenario, theme, width, message: error.message, pageErrors: errors });
    throw error;
  } finally { await page.close(); }
}

(async () => {
  fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'baseline-source.js'), baselineSource);
  fs.writeFileSync(path.join(__dirname, 'final-source.js'), currentSource);
  const preview = { baseline: makePreview(baselineSource), final: makePreview(currentSource) };
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [1100, 320]) {
      await capture(browser, preview.baseline, 'baseline', 'default', width, false);
      await capture(browser, preview.baseline, 'baseline', 'default', width, true);
    }
    for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) {
      await capture(browser, preview.final, 'final', theme, width, false);
    }
    for (const width of [1100, 320]) await capture(browser, preview.final, 'final', 'default', width, true);
    assert.equal(configurations.filter(result => result.version === 'baseline').length, 2);
    assert.equal(configurations.filter(result => result.version === 'final').length, 9);
    assert.equal(shortFlights.length, 4); assert.equal(comparisons.length, 4);
  } finally {
    if (browser) await browser.close();
    const finalHash = hash(fs.readFileSync(path.join(ROOT, TOOL))), sourceUnchanged = finalHash === sourceHashes.final;
    if (!sourceUnchanged) failures.push({ message: 'Current source changed during audit', expected: sourceHashes.final, actual: finalHash });
    fs.writeFileSync(path.join(__dirname, 'apex-results.json'), JSON.stringify({
      createdAt: new Date().toISOString(), baselineCommit: BASELINE, sourceFile: TOOL, sourceSha256: sourceHashes,
      auditSha256: hash(fs.readFileSync(__filename)), sourceUnchanged,
      passed: sourceUnchanged && configurations.length === 11 && shortFlights.length === 4 && comparisons.length === 4 && failures.length === 0,
      configurations, shortFlights, outcomeComparisons: comparisons, failures,
    }, null, 2));
    assert(sourceUnchanged, 'Source changed during audit');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
