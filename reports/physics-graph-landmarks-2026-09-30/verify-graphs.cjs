#!/usr/bin/env node
// Run from any directory. Browser execution is deliberately left to the report owner.
// Optional: PHYSICS_EXPECT_SOURCE_SHA256=<reviewed hash> node .../verify-graphs.cjs
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
const BASELINE = 'b26843288dd5b17f9997b5be9a2fbbac7f3ed696';
const FIXTURE = 'reports/physics-deep-review-2026-09-27/preview-harness.cjs';
const sha = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const current = fs.readFileSync(path.join(ROOT, TOOL));
const initialMirror = fs.readFileSync(path.join(ROOT, MIRROR));
const baseline = execFileSync('git', ['--no-pager', 'show', BASELINE + ':' + TOOL], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const baselineGitSha = execFileSync('git', ['rev-parse', '--verify', BASELINE + '^{commit}'], { cwd: ROOT }).toString().trim();
const sourceSha256 = Object.freeze({ baseline: sha(baseline), final: sha(current), mirror: sha(initialMirror) });
const auditSha256 = sha(fs.readFileSync(__filename));
const dependencies = new Map();
const configurations = [], failures = [];
const CATALOG = path.join(ROOT, 'ui_strings.js');
const catalogHash = buffer => sha(Object.fromEntries(Object.entries(JSON.parse(buffer.toString('utf8')).stem.physics).sort(([a], [b]) => a.localeCompare(b))));
const baselineCsv = new Map();
let baselineEvidence;

function freezeSnapshot(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeSnapshot);
    Object.freeze(value);
  }
  return value;
}

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
  const translationHook = 'var translated=k.split';
  assert(fixture.includes(translationHook), 'Preview translation hook changed');
  fixture = fixture.replace(translationHook, '(window.__graphAuditTranslationKeys || (window.__graphAuditTranslationKeys = new Set())).add(k); var translated=k.split');
  fixture += '\nglobalThis.makePhysicsPage = html;';
  const virtualFs = { ...fs, readFileSync(file, options) {
    if (path.resolve(ROOT, file) === path.join(ROOT, TOOL)) return typeof options === 'string' || options?.encoding ? source.toString('utf8') : source;
    return readDependency(file, options);
  } };
  const sandbox = { require: name => name === 'node:fs' ? virtualFs : require(name), console,
    __dirname: path.join(ROOT, path.dirname(FIXTURE)), globalThis: {} };
  vm.runInNewContext(fixture, sandbox, { filename: 'physics-graphs-preview.cjs' });
  return theme => sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme);
}

async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(30);
}

async function redraw(page) {
  await page.evaluate(() => {
    document.getElementById('physicsCanvas')._physScheduleFrame();
    window.__graphAuditTick();
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
      window.__graphAuditTick = () => {
        now += 1000 / 60;
        const callbacks = [...pending.values()]; pending.clear();
        callbacks.forEach(callback => callback(now));
      };
      window.__graphAuditCopies = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async text => { window.__graphAuditCopies.push(text); }
      } });
    });
    await page.setContent(html(theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
    await redraw(page);
    return { page, errors };
  } catch (error) { await page.close(); throw error; }
}

async function recordFlights(page) {
  for (const [index, airResist] of [false, true].entries()) {
    await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist,
      simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true });
    await page.locator('[data-physics-launch]').click();
    await page.evaluate(() => {
      const canvas = document.getElementById('physicsCanvas'); let steps = 0;
      while (canvas._launched && steps++ < 10000) window.__graphAuditTick();
      if (canvas._launched) throw Error('Graph audit flight did not land');
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

function apexIndex(trail) {
  const apex = trail.apex;
  return trail.points.findIndex(point => apex && point.t === apex.tSec && point.mX === apex.mX &&
    point.mY === apex.mY && point.mVx === apex.vx && point.mVy === 0);
}

function formatted(value) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

function roundLimit(value) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(value, .01))));
  const step = [1, 2, 2.5, 5, 10].find(number => value / magnitude <= number);
  return (step || 10) * magnitude;
}

async function csv(page, original, runIndex) {
  const before = await page.evaluate(() => window.__graphAuditCopies.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await page.waitForFunction(count => window.__graphAuditCopies.length === count + 1, before, { polling: 20 });
  const text = await page.evaluate(() => window.__graphAuditCopies.at(-1));
  const trail = original.trails[runIndex], p = trail.parameters;
  const lines = text.split(/\r?\n/);
  assert.equal(lines[0], '# run=' + trail.run + ',angle_deg=' + p.angle + ',velocity_mps=' + p.velocity +
    ',gravity_mps2=' + p.gravity + ',launch_height_m=' + p.launchHeight + ',air_drag=' + (p.drag ? 'on' : 'off') +
    ',mass_kg=' + p.mass + ',model=' + trail.modelVersion, 'CSV must use the captured launch');
  assert.equal(lines[1], 't_s,x_m,y_m,vx_mps,vy_mps,speed_mps');
  assert.equal(lines.length - 2, trail.points.length, 'CSV must retain every recorded point');
  lines.slice(2).forEach((line, index) => {
    const point = trail.points[index];
    assert.deepEqual(line.split(',').map(Number),
      [point.t, point.mX, point.mY, point.mVx, point.mVy, Math.hypot(point.mVx, point.mVy)],
      'CSV rounded or changed sample ' + index);
  });
  if (!baselineCsv.has(runIndex)) baselineCsv.set(runIndex, text);
  assert.equal(text, baselineCsv.get(runIndex), 'Full CSV differs from the pinned baseline');
  return { run: trail.run, rows: trail.points.length, sha256: sha(Buffer.from(text)) };
}

async function selectedViews(page, final, original, runIndex, expectedIndex) {
  await redraw(page);
  const result = await page.evaluate(() => {
    const canvas = document.getElementById('physicsCanvas'), sample = canvas._inspection.snapshot;
    const $ = selector => document.querySelector(selector);
    const number = (element, key) => element ? Number(element.getAttribute(key)) : null;
    const graphs = ['vx', 'vy'].map(field => {
      const graph = $('[data-physics-graph="' + field + '"]'), marker = $('[data-physics-graph-marker="' + field + '"]');
      const cursor = $('[data-physics-graph-cursor="' + field + '"]'), guide = $('[data-physics-graph-apex-guide="' + field + '"]');
      const reading = $('[data-physics-graph-reading="' + field + '"]');
      const selection = $('[data-physics-graph-selected="' + field + '"]');
      return { field, index: number(marker, 'data-sample-index'), t: number(marker, 'data-time'), value: number(marker, 'data-value'),
        x: number(marker, 'cx'), y: number(marker, 'cy'), cursorX: number(cursor, 'x1'),
        guide: guide ? { index: number(guide, 'data-sample-index'), t: number(guide, 'data-time'),
          x1: number(guide, 'x1'), x2: number(guide, 'x2'), y1: number(guide, 'y1'), y2: number(guide, 'y2'),
          dash: guide.getAttribute('stroke-dasharray') } : null,
        indices: (graph.getAttribute('data-plotted-indices') || '').split(',').filter(Boolean).map(Number),
        plottedCount: number(graph, 'data-plotted-count'), path: graph.querySelector('path').getAttribute('d'),
        selection: selection ? { index: number(selection, 'data-sample-index'), t: number(selection, 'data-time'), value: number(selection, 'data-value') } : null,
        reading: reading ? { value: number(reading, 'data-value'), text: reading.textContent.replace(/\s+/g, ' ').trim(),
          label: $('[data-physics-graph-reading-label="' + field + '"]').textContent.trim() } : null };
    });
    return { sample, graphs, canvas: canvas._visualInspection,
      phase: $('[data-physics-motion-phase]')?.getAttribute('data-physics-motion-phase'),
      phaseLabel: $('[data-physics-phase-label]')?.textContent.trim(),
      phaseReadings: ['vy', 'ay'].map(field => {
        const node = $('[data-physics-phase-value="' + field + '"]');
        return { value: number(node, 'data-value'), text: node?.textContent.trim() };
      }),
      settings: Object.fromEntries([...document.querySelectorAll('[data-physics-graph-setting]')]
        .map(node => [node.getAttribute('data-physics-graph-setting'), node.textContent.trim()])),
      flight: $('[data-physics-graph-flight]').textContent.trim(),
      table: [...document.querySelectorAll('[data-physics-flight-table] [data-physics-sample-index]')].map(node => ({
        index: number(node, 'data-physics-sample-index'), pressed: node.getAttribute('aria-pressed'),
        moment: node.querySelector('[data-physics-table-moment]')?.textContent.trim() || null
      })),
      energy: { index: number($('[data-physics-energy-cursor]'), 'data-sample-index'),
        t: number($('[data-physics-energy-cursor]'), 'data-time') } };
  });
  const trail = original.trails[runIndex], sample = result.sample, point = trail.points[expectedIndex];
  assert.equal(sample.run, trail.run); assert.equal(sample.index, expectedIndex);
  assert.deepEqual(sample.parameters, { angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity, mass: trail.parameters.mass, launchHeight: trail.parameters.launchHeight, airResist: trail.parameters.drag, modelVersion: trail.modelVersion }, 'Inspection borrowed live settings');
  assert.deepEqual([sample.t, sample.x, sample.y, sample.vx, sample.vy],
    [point.t, point.mX, point.mY, point.mVx, point.mVy], 'Inspection changed a recorded point');
  assert.equal(result.canvas.index, expectedIndex); assert.equal(result.canvas.t, point.t);
  assert.equal(result.energy.index, expectedIndex); assert.equal(result.energy.t, point.t);
  assert.deepEqual(result.table.filter(row => row.pressed === 'true').map(row => row.index), [expectedIndex]);
  assert.equal(result.phase, sample.phase);
  assert.deepEqual(result.phaseReadings.map(reading => reading.value), [sample.vy, sample.ay]);
  assert.deepEqual(result.phaseReadings.map(reading => reading.text),
    [formatted(sample.vy) + ' m/s', formatted(sample.ay) + ' m/s²'], 'Phase reading lost small nonzero values');
  const tMax = trail.points.at(-1).t, apex = apexIndex(trail);
  assert(apex >= 0, 'Actual recorded flight lacks its canonical apex');
  for (const graph of result.graphs) {
    assert.equal(graph.index, expectedIndex); assert.equal(graph.t, point.t);
    assert.equal(graph.value, sample[graph.field]);
    assert.equal(graph.x, graph.cursorX);
    assert(Math.abs(graph.x - (48 + point.t / tMax * 200)) < 1e-8, 'Cursor is not at the recorded time');
    if (!final) continue;
    assert(graph.guide, 'Canonical apex guide missing');
    assert.deepEqual(graph.guide, { index: apex, t: trail.points[apex].t,
      x1: 48 + trail.points[apex].t / tMax * 200, x2: 48 + trail.points[apex].t / tMax * 200,
      y1: 18, y2: 158, dash: '8 4' }, 'Apex guide moved with selection or lost raw metadata');
    assert(graph.indices.includes(apex) && graph.indices.includes(expectedIndex), 'Plot omitted apex or selected point');
    assert(graph.indices.includes(0) && graph.indices.includes(trail.points.length - 1), 'Plot omitted an endpoint');
    assert.equal(new Set(graph.indices).size, graph.indices.length, 'Duplicate plotted indices');
    assert(graph.indices.every((index, order) => Number.isInteger(index) && index >= 0 && index < trail.points.length &&
      (order === 0 || index > graph.indices[order - 1])), 'Plot indices are not ordered original observations');
    assert.equal(graph.plottedCount, graph.indices.length);
    const points = graph.indices.map(index => trail.points[index]);
    const limit = graph.field === 'vx' ? roundLimit(Math.max(1, Math.max(...points.map(pt => Math.abs(pt.mVx))) * 1.12)) :
      roundLimit(Math.max(1, ...points.map(pt => Math.abs(pt.mVy))) * 1.12);
    const zero = graph.field === 'vx' ? 158 : 88, scale = graph.field === 'vx' ? 140 / limit : 70 / limit;
    const vertices = [...graph.path.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(match => [Number(match[1]), Number(match[2])]);
    assert.deepEqual(vertices, points.map(pt => [Number((48 + pt.t / tMax * 200).toFixed(1)),
      Number((zero - (graph.field === 'vx' ? pt.mVx : pt.mVy) * scale).toFixed(1))]),
      'Curve metadata does not match original recorded vertices');
    assert.deepEqual(graph.selection, { index: expectedIndex, t: point.t, value: sample[graph.field] }, 'Selected reading lost raw metadata');
    assert.equal(graph.reading.value, sample[graph.field]);
    assert.equal(graph.reading.text, formatted(sample[graph.field]) + ' m/s', 'Major reading lost selected precision');
    assert(graph.reading.label.includes('Selected sample') && graph.reading.label.includes(point.t.toFixed(3) + ' s') &&
      graph.reading.label.includes(result.phaseLabel), 'Selected graph reading must name its time and phase');
  }
  if (final) {
    const units = { angle: ['θ', '°'], velocity: ['v₀', 'm/s'], gravity: ['g', 'm/s²'], mass: ['m', 'kg'], launchHeight: ['h₀', 'm'] };
    for (const [key, [symbol, unit]] of Object.entries(units)) assert.equal(result.settings[key],
      symbol + ' = ' + trail.parameters[key] + ' ' + unit, 'Graph lost captured setting ' + key);
    assert(result.flight.includes('Run ' + trail.run) && result.flight.includes(trail.parameters.drag ? 'Air drag on' : 'Air drag off'));
    assert.equal(result.table.find(row => row.index === apex)?.moment, 'Apex', 'Table omitted the canonical apex label');
  }
  return { run: trail.run, index: expectedIndex, phase: sample.phase,
    apexGuideStable: final, selectedVertexIncluded: final, viewsLinked: true, capturedSettings: true, precision: true };
}

async function initialLandmarks(page, final, original) {
  const trail = original.trails.at(-1), apex = apexIndex(trail);
  assert(apex >= 0); assert(trail.points.length > 80, 'Expected a full-resolution actual flight');
  if (!final) return { required: false, tableApexBeforeSelection: false };
  const row = page.locator('[data-physics-flight-table] [data-physics-sample-index="' + apex + '"]');
  assert.equal(await row.count(), 1, 'Table must represent the apex before selecting it');
  assert.equal(await row.getAttribute('aria-pressed'), 'false', 'Initial audit must precede apex inspection');
  assert.equal((await row.locator('[data-physics-table-moment]').innerText()).trim(), 'Apex');
  for (const field of ['vx', 'vy']) {
    const graph = page.locator('[data-physics-graph="' + field + '"]');
    const indices = (await graph.getAttribute('data-plotted-indices')).split(',').map(Number);
    assert(indices.includes(apex), 'Unselected apex missing from ' + field + ' curve');
    assert.equal(Number(await page.locator('[data-physics-graph-apex-guide="' + field + '"]').getAttribute('data-time')), trail.apex.tSec);
    const reading = page.locator('[data-physics-graph-reading="' + field + '"]');
    const value = field === 'vx' ? trail.points.at(-1).mVx : trail.points.at(-1).mVy;
    assert.equal(Number(await reading.getAttribute('data-value')), value);
    assert.equal((await reading.innerText()).replace(/\s+/g, ' ').trim(), formatted(value) + ' m/s');
    assert((await page.locator('[data-physics-graph-reading-label="' + field + '"]').innerText()).includes('Ground impact'));
  }
  return { required: true, tableApexBeforeSelection: true, unselectedApexPlotted: true, latestReading: true };
}

async function auditInteractions(page, final, original) {
  const selected = [], csvChecks = [];
  let historySelections = 0;
  const preserve = async runIndex => {
    assert.deepEqual(await evidence(page), original, 'Graph interaction modified captured physics');
    csvChecks.push(await csv(page, original, runIndex));
    assert.deepEqual(await evidence(page), original, 'Copying the CSV modified captured physics');
  };
  // Changed live settings must not alter either recorded flight's readings or CSV.
  await patch(page, { angle: 20, velocity: 42, gravity: 12, mass: 7, launchHeight: 4, airResist: false, simSpeed: 0 });
  for (const runIndex of [0, 1]) {
    await page.locator('[data-physics-history-select]').selectOption(String(runIndex)); historySelections++;
    await preserve(runIndex);
    const trail = original.trails[runIndex];
    for (const [moment, oldHook, index] of [
      ['launch', 'launch', 0], ['apex', 'highest', apexIndex(trail)], ['impact', 'latest', trail.points.length - 1]
    ]) {
      const button = page.locator(final ? '[data-physics-graph-jump="' + moment + '"]' : '[data-physics-sample-jump="' + oldHook + '"]');
      if (final) {
        assert.equal(Number(await button.getAttribute('data-sample-index')), index, 'Moment button lost its recorded index');
        assert.equal(Number(await button.getAttribute('data-time')), trail.points[index].t, 'Moment button lost its recorded time');
      }
      await button.focus(); await button.press('Enter');
      selected.push(await selectedViews(page, final, original, runIndex, index));
      if (final) assert.equal(await button.getAttribute('aria-pressed'), 'true');
      await preserve(runIndex);
    }
    const slider = page.locator('[data-physics-graph-time-slider]');
    await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
    assert(await slider.evaluate(node => node === document.activeElement), 'Graph slider lost keyboard focus');
    selected.push(await selectedViews(page, final, original, runIndex, 1));
    await preserve(runIndex);
  }
  // Explicit older/newer selection after both sets of graph interactions.
  for (const runIndex of [0, 1]) {
    await page.locator('[data-physics-history-select]').selectOption(String(runIndex)); historySelections++;
    selected.push(await selectedViews(page, final, original, runIndex, original.trails[runIndex].points.length - 1));
    await preserve(runIndex);
  }
  const newestApex = page.locator(final ? '[data-physics-graph-jump="apex"]' : '[data-physics-sample-jump="highest"]');
  await newestApex.click();
  selected.push(await selectedViews(page, final, original, 1, apexIndex(original.trails[1])));
  await preserve(1);
  let tableNavigation = false;
  if (final) {
    await patch(page, { showFlightData: false });
    assert.equal(await page.locator('[data-physics-flight-data]').count(), 0);
    await page.locator('[data-physics-graph-open-data]').click();
    await page.waitForFunction(() => document.activeElement === document.querySelector('[data-physics-flight-data]'), null, { polling: 20 });
    const visible = await page.locator('[data-physics-flight-data]').evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= -1 && box.top < innerHeight && node.getAttribute('aria-labelledby') === 'physics-flight-data-heading';
    });
    assert(visible, 'Open data action did not reveal the labelled table');
    const revealed = await page.locator('[data-physics-flight-table-wrap]').evaluate(node => {
      const row = node.querySelector('tr[data-selected="true"]'), header = node.querySelector('thead');
      const box = node.getBoundingClientRect(), selected = row.getBoundingClientRect();
      return selected.top >= box.top + node.clientTop + header.getBoundingClientRect().height - 1 &&
        selected.bottom <= box.top + node.clientTop + node.clientHeight + 1;
    });
    assert(revealed, 'Open data action did not reveal the selected row inside the table');
    await preserve(1); tableNavigation = true;
  }
  return { selected, historySelections, selectionCount: selected.length, csvCheckCount: csvChecks.length,
    csv: [...new Map(csvChecks.map(check => [check.run, check])).values()],
    evidenceUnchanged: true, fullCsvUnchanged: true, keyboardFocus: true, tableNavigation };
}

async function visualMetrics(page, final, theme) {
  const measured = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('[data-physics-graph-time-control],[data-physics-component-graphs],[data-physics-graph-settings],[data-physics-graph-flight],[data-physics-graph-sampling-help],[data-physics-graph-open-data],[data-physics-flight-history],[data-physics-flight-data]')];
    const visible = node => !!node?.getClientRects().length && !node.closest('.sr-only,[aria-hidden="true"]') &&
      getComputedStyle(node).visibility !== 'hidden';
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
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        if (!node.textContent.trim() || !visible(element) || seen.has(node)) continue;
        seen.add(node);
        if (element.closest(':disabled,[aria-disabled="true"]')) { disabledTextCount++; continue; }
        const style = getComputedStyle(element), surface = background(element);
        const svg = element instanceof SVGElement && element.closest('svg');
        const transform = svg ? svg.getScreenCTM() : null;
        const scale = transform ? Math.hypot(transform.a, transform.b) : 1;
        const inkColor = svg ? style.fill : style.color;
        const ink = surface ? lum(over(rgba(inkColor), surface)) : null, ground = surface ? lum(surface) : null;
        text.push({ label: node.textContent.trim().slice(0, 80), svg: !!svg, font: parseFloat(style.fontSize) * scale,
          contrast: surface ? (Math.max(ink, ground) + .05) / (Math.min(ink, ground) + .05) : null });
      }
      const nodes = [...root.querySelectorAll('button,input,select')];
      if (root.matches('button,input,select')) nodes.unshift(root);
      for (const node of nodes) {
        if (!visible(node) || seen.has(node) || node.type === 'hidden') continue;
        seen.add(node); const box = node.getBoundingClientRect();
        targets.push({ label: node.getAttribute('aria-label') || node.id || node.textContent.trim().slice(0, 60),
          width: box.width, height: box.height, disabled: !!node.disabled });
      }
    }
    return { text, targets, disabledTextCount };
  });
  const threshold = theme === 'contrast' ? 7 : 4.5;
  const violations = { smallText: measured.text.filter(item => item.font < 11.99),
    contrast: measured.text.filter(item => item.contrast != null && item.contrast < threshold),
    unresolvedBackground: measured.text.filter(item => item.contrast == null),
    smallTargets: measured.targets.filter(item => item.width < 43.99 || item.height < 43.99) };
  assert(measured.text.length > 35 && measured.targets.length > 10, 'Too few graph/table measurements');
  const svgText = measured.text.filter(item => item.svg);
  assert(svgText.length >= 12, 'Too few rendered SVG font measurements');
  if (final) for (const [name, items] of Object.entries(violations)) assert.equal(items.length, 0, name + ': ' + JSON.stringify(items));
  return { required: final, contrastThreshold: threshold, textCount: measured.text.length, targetCount: measured.targets.length,
    minFontPx: Math.min(...measured.text.map(item => item.font)), minSvgFontPx: Math.min(...svgText.map(item => item.font)),
    minContrast: Math.min(...measured.text.filter(item => item.contrast != null).map(item => item.contrast)),
    minTargetWidthPx: Math.min(...measured.targets.map(item => item.width)), minTargetHeightPx: Math.min(...measured.targets.map(item => item.height)),
    disabledTextCount: measured.disabledTextCount, violations };
}

async function geometry(page, final, width) {
  const result = await page.evaluate(() => {
    const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width,
      height: box.height, right: box.right, bottom: box.bottom }; };
    const control = document.querySelector('[data-physics-graph-time-control]'), graphs = document.querySelector('[data-physics-component-graphs]');
    const svgs = [...graphs.querySelectorAll('svg')].map(svg => {
      const box = svg.getBoundingClientRect();
      return { box: rect(svg), clippedText: [...svg.querySelectorAll('text')].filter(node => {
        const text = node.getBoundingClientRect();
        return text.left < box.left - 1 || text.right > box.right + 1 || text.top < box.top - 1 || text.bottom > box.bottom + 1;
      }).map(node => node.textContent.trim()) };
    });
    return { width: innerWidth, pageOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      control: rect(control), graphs: rect(graphs), cards: [...graphs.children].map(rect), svgs,
      controlOverflowPx: Math.max(0, control.scrollWidth - control.clientWidth),
      graphOverflowPx: Math.max(0, graphs.scrollWidth - graphs.clientWidth),
      moments: [...document.querySelectorAll('[data-physics-graph-jump]')].map(rect) };
  });
  assert.equal(result.pageOverflowPx, 0, 'Page overflow');
  assert.equal(result.controlOverflowPx, 0, 'Time control overflow');
  assert.equal(result.graphOverflowPx, 0, 'Graph cards overflow');
  assert.equal(result.svgs.length, 2); assert(result.svgs.every(svg => !svg.clippedText.length), 'SVG labels clipped: ' + JSON.stringify(result.svgs));
  if (width <= 375) assert(result.cards[1].y >= result.cards[0].bottom - 1, 'Phone velocity graphs must stack');
  if (width === 1100) assert(Math.abs(result.cards[0].y - result.cards[1].y) <= 1, 'Desktop velocity graphs must share a row');
  if (final && width <= 375) {
    assert.equal(result.moments.length, 3);
    assert(Math.abs(result.moments[0].y - result.moments[1].y) <= 1 && result.moments[2].y >= result.moments[0].bottom - 1,
      'Phone landmark cards must use two columns followed by a full row');
    assert(result.moments[2].width > result.moments[0].width * 1.9, 'Phone impact control must span both columns');
  }
  return result;
}

async function capture(browser, html, version, theme, width) {
  const final = version === 'final', { page, errors } = await mount(browser, html, theme, width);
  try {
    await recordFlights(page);
    const original = freezeSnapshot(await evidence(page));
    if (!baselineEvidence) baselineEvidence = original;
    assert.deepEqual(original, baselineEvidence, 'Actual vacuum/drag model differs from pinned baseline');
    assert.deepEqual(original.trails.map(trail => trail.parameters.drag), [false, true]);
    const landmarks = await initialLandmarks(page, final, original);
    const interaction = await auditInteractions(page, final, original);
    const quality = await visualMetrics(page, final, theme), layout = await geometry(page, final, width);
    const translationKeys = await page.evaluate(() => [...window.__graphAuditTranslationKeys].sort());
    assert(translationKeys.length > 50 && translationKeys.every(key => key.startsWith('stem.physics.')), 'Fixture requested translations outside its verified physics catalog namespace');
    const screenshots = [];
    for (const [label, selector] of [['time-control', '[data-physics-graph-time-control]'], ['component-graphs', '[data-physics-component-graphs]']]) {
      const file = 'graphs-' + version + '-' + theme + '-' + width + '-' + label + '.png';
      await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); screenshots.push(file);
    }
    if (final && theme === 'default' && width === 320) {
      const file = 'graphs-final-default-320-table.png';
      await page.locator('[data-physics-flight-data]').screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); screenshots.push(file);
    }
    assert.deepEqual(await evidence(page), original, 'Screenshots changed captured evidence');
    assert.deepEqual(errors, [], 'Page errors during graph audit');
    configurations.push({ version, theme, width, screenshots, quality, geometry: layout, landmarks, interaction, translationKeys,
      model: { actualFlights: 2, modes: ['vacuum', 'drag'], matchesBaseline: true, frozenSnapshot: Object.isFrozen(original), evidenceSha256: sha(original),
        samples: original.trails.map(trail => trail.points.length), apexIndices: original.trails.map(apexIndex) }, pageErrors: errors });
    console.log('Verified ' + version + ' ' + theme + ' at ' + width + 'px: 2 actual flights, ' +
      interaction.selectionCount + ' selections, ' + interaction.csvCheckCount + ' full CSV checks, ' + screenshots.length + ' PNGs');
  } catch (error) {
    failures.push({ version, theme, width, message: error.message, pageErrors: errors }); throw error;
  } finally { await page.close(); }
}

(async () => {
  let browser;
  try {
    assert.equal(baselineGitSha, BASELINE, 'Pinned baseline git SHA changed');
    assert(current.equals(initialMirror), 'Physics source and desktop mirror differ');
    if (process.env.PHYSICS_EXPECT_SOURCE_SHA256) assert.equal(sourceSha256.final, process.env.PHYSICS_EXPECT_SOURCE_SHA256, 'Unexpected source hash');
    const pages = { baseline: preview(baseline), final: preview(current) };
    browser = await chromium.launch({ headless: true });
    for (const width of [1100, 320]) await capture(browser, pages.baseline, 'baseline', 'default', width);
    for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) await capture(browser, pages.final, 'final', theme, width);
    assert.equal(configurations.filter(config => config.version === 'baseline').length, 2);
    assert.equal(configurations.filter(config => config.version === 'final').length, 9);
    assert.equal(configurations.reduce((count, config) => count + config.screenshots.length, 0), 23);
  } catch (error) {
    if (!failures.length) failures.push({ message: error.message });
    throw error;
  } finally {
    if (browser) await browser.close();
    const sourceUnchanged = sha(fs.readFileSync(path.join(ROOT, TOOL))) === sourceSha256.final;
    const mirrorUnchanged = sha(fs.readFileSync(path.join(ROOT, MIRROR))) === sha(initialMirror);
    const mirrorMatches = current.equals(fs.readFileSync(path.join(ROOT, MIRROR)));
    const auditorUnchanged = sha(fs.readFileSync(__filename)) === auditSha256;
    const stableDependencies = [...dependencies].filter(([file]) => file !== CATALOG);
    const dependencySha256 = Object.fromEntries(stableDependencies.map(([file, buffer]) => [path.relative(ROOT, file).replace(/\\/g, '/'), sha(buffer)]));
    const initialCatalog = dependencies.get(CATALOG), finalCatalog = fs.readFileSync(CATALOG);
    const catalogNamespaceUnchanged = !!initialCatalog && catalogHash(initialCatalog) === catalogHash(finalCatalog);
    const catalogDependency = { sourceFile: 'ui_strings.js', namespace: 'stem.physics',
      capturedFileSha256: initialCatalog ? sha(initialCatalog) : null, finalFileSha256: sha(finalCatalog),
      namespaceSha256: initialCatalog ? catalogHash(initialCatalog) : null, namespaceUnchanged: catalogNamespaceUnchanged,
      changedOutsideNamespace: catalogNamespaceUnchanged && sha(initialCatalog) !== sha(finalCatalog) };
    const dependenciesUnchanged = stableDependencies.every(([file, buffer]) => sha(fs.readFileSync(file)) === sha(buffer));
    for (const [key, okay] of Object.entries({ sourceUnchanged, mirrorUnchanged, mirrorMatches, auditorUnchanged, dependenciesUnchanged, catalogNamespaceUnchanged }))
      if (!okay) failures.push({ message: key + ' failed' });
    const screenshotCount = configurations.reduce((count, config) => count + config.screenshots.length, 0);
    const passed = configurations.length === 11 && screenshotCount === 23 && failures.length === 0;
    const counts = { configurations: configurations.length, baseline: configurations.filter(config => config.version === 'baseline').length,
      final: configurations.filter(config => config.version === 'final').length, actualFlights: configurations.length * 2,
      screenshots: screenshotCount, selections: configurations.reduce((count, config) => count + config.interaction.selectionCount, 0),
      csvChecks: configurations.reduce((count, config) => count + config.interaction.csvCheckCount, 0) };
    fs.writeFileSync(path.join(__dirname, 'graphs-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), baselineCommit: BASELINE, baselineGitSha,
      sourceFile: TOOL, sourceSha256, auditSha256, dependencySha256, catalogDependency, catalogNamespaceUnchanged, sourceUnchanged, mirrorUnchanged, mirrorMatches,
      auditorUnchanged, dependenciesUnchanged, passed, counts, configurations, failures }, null, 2));
    console.log('Graph audit ' + (passed ? 'PASS' : 'FAIL') + ': ' + counts.configurations + '/11 configurations, ' +
      counts.actualFlights + ' actual flights, ' + counts.screenshots + '/23 PNGs, ' + counts.selections +
      ' selections, ' + counts.csvChecks + ' full CSV checks; ' + failures.length + ' failures.');
    assert(passed, 'Graph visual/evidence audit failed; see graphs-results.json');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
