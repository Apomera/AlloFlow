#!/usr/bin/env node
// Run from any directory. Browser execution is deliberately left to the report owner.
// Optional: PHYSICS_EXPECT_SOURCE_SHA256=<reviewed hash> node .../verify-forces.cjs
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
const BASELINE = 'ea35209b29700c899e55d2db1b6fabc88bca6a95';
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
const capturedCatalog = freezeSnapshot(JSON.parse(readDependency('ui_strings.js', 'utf8')).stem.physics);
const capturedCatalogSha256 = catalogHash(Buffer.from(JSON.stringify({ stem: { physics: capturedCatalog } })));
const close = (actual, expected, label) => assert(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), label + ': ' + actual + ' != ' + expected);
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
  fixture = fixture.replace(translationHook, '(window.__forceAuditTranslationKeys || (window.__forceAuditTranslationKeys = new Set())).add(k); var translated=k.split');
  fixture += '\nglobalThis.makePhysicsPage = html;';
  const virtualFs = { ...fs, readFileSync(file, options) {
    if (path.resolve(ROOT, file) === path.join(ROOT, TOOL)) return typeof options === 'string' || options?.encoding ? source.toString('utf8') : source;
    return readDependency(file, options);
  } };
  const sandbox = { require: name => name === 'node:fs' ? virtualFs : require(name), console,
    __dirname: path.join(ROOT, path.dirname(FIXTURE)), globalThis: {} };
  vm.runInNewContext(fixture, sandbox, { filename: 'physics-forces-preview.cjs' });
  return theme => sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme);
}

async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(30);
}

async function redraw(page) {
  await page.evaluate(() => {
    document.getElementById('physicsCanvas')._physScheduleFrame();
    window.__forceAuditTick();
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
      window.__forceAuditTick = () => {
        now += 1000 / 60;
        const callbacks = [...pending.values()]; pending.clear();
        callbacks.forEach(callback => callback(now));
      };
      window.__forceAuditCopies = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async text => { window.__forceAuditCopies.push(text); }
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
      while (canvas._launched && steps++ < 10000) window.__forceAuditTick();
      if (canvas._launched) throw Error('Force audit flight did not land');
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
        run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion,
        metadata: Object.fromEntries(Object.entries(trail).filter(([key]) => !/^\d+$/.test(key))) })) };
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
  const before = await page.evaluate(() => window.__forceAuditCopies.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await page.waitForFunction(count => window.__forceAuditCopies.length === count + 1, before, { polling: 20 });
  const text = await page.evaluate(() => window.__forceAuditCopies.at(-1));
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


function forces(point, parameters) {
  const speed = Math.hypot(point.mVx, point.mVy), k = parameters.airResist ? .004 : 0;
  const gravity = { x: 0, y: -parameters.mass * parameters.gravity, magnitude: parameters.mass * parameters.gravity };
  const drag = { x: -k * speed * point.mVx, y: -k * speed * point.mVy, magnitude: k * speed * speed };
  const net = { x: gravity.x + drag.x, y: gravity.y + drag.y };
  net.magnitude = Math.hypot(net.x, net.y);
  return { gravity, drag, net, scale: Math.max(gravity.magnitude, drag.magnitude, net.magnitude) };
}

async function openForces(page) {
  const details = page.locator('[data-physics-sample-forces]'), summary = details.locator('summary');
  assert.equal(await summary.evaluate(node => node.tagName), 'SUMMARY', 'Force disclosure must remain native');
  await summary.focus();
  if (!await details.evaluate(node => node.open)) await summary.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-physics-sample-forces]')?.open, null, { polling: 20 });
  assert(await summary.evaluate(node => document.activeElement === node), 'Native summary lost keyboard focus');
}

async function inspectForces(page, final, original, runIndex, index, expectedPhase) {
  await redraw(page); await openForces(page);
  const view = await page.evaluate(() => {
    const $ = selector => document.querySelector(selector), numeric = (node, key) => node ? Number(node.getAttribute(key)) : null;
    const cv = $('#physicsCanvas'), sample = cv._inspection.snapshot, balance = $('[data-physics-force-balance]');
    const cards = ['gravity', 'drag', 'net'].map(key => {
      const card = $('[data-physics-force-card="' + key + '"]');
      if (!card) return null;
      const svg = card.querySelector('svg'), arrow = card.querySelector('[data-physics-force-arrow="' + key + '"]');
      return { key, label: card.getAttribute('aria-label'), components: Object.fromEntries(['x', 'y', 'magnitude'].map(field => {
        const dd = card.querySelector('[data-physics-force-component="' + key + '-' + field + '"]');
        return [field, { tag: dd?.tagName, value: numeric(dd, 'data-value'), text: dd?.textContent.trim() }];
      })), svg: { viewBox: svg.getAttribute('viewBox'), hidden: svg.getAttribute('aria-hidden'), focusable: svg.getAttribute('focusable'),
        zeroDot: !!svg.querySelector('circle[cx="64"][cy="64"][r="3"]') },
        arrow: arrow ? Object.fromEntries(['x1', 'y1', 'x2', 'y2', 'data-fx', 'data-fy', 'data-magnitude', 'data-scale'].map(name => [name, numeric(arrow, name)])) : null,
        dash: arrow?.getAttribute('stroke-dasharray'), zero: card.querySelector('[data-physics-force-zero]')?.textContent.trim() || null,
        note: card.querySelector('.phys-force-note')?.textContent.trim() || null };
    });
    return { sample, phase: $('[data-physics-motion-phase]')?.getAttribute('data-physics-motion-phase'),
      phaseValues: ['vy', 'ay'].map(key => { const dd = $('[data-physics-phase-value="' + key + '"]');
        return { value: numeric(dd, 'data-value'), text: dd?.textContent.trim() }; }),
      phaseHelp: $('[data-physics-phase-help]')?.textContent.trim() || null,
      verticalBalance: $('[data-physics-vertical-balance]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      forceMass: $('.phys-force-mass')?.textContent.replace(/\s+/g, ' ').trim() || null,
      forceScale: numeric(balance, 'data-force-scale'), cards,
      impactNote: $('[data-physics-impact-note]')?.textContent.trim() || null,
      marker: cv._visualInspection, selectedTable: [...document.querySelectorAll('[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index]')]
        .map(node => numeric(node, 'data-physics-sample-index')) };
  });
  const trail = original.trails[runIndex], point = trail.points[index], p = view.sample.parameters, expected = forces(point, p);
  assert.equal(view.sample.run, trail.run); assert.equal(view.sample.index, index);
  assert.deepEqual(p, { angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity,
    mass: trail.parameters.mass, launchHeight: trail.parameters.launchHeight, airResist: trail.parameters.drag, modelVersion: trail.modelVersion });
  assert.deepEqual([view.sample.t, view.sample.x, view.sample.y, view.sample.vx, view.sample.vy],
    [point.t, point.mX, point.mY, point.mVx, point.mVy], 'Inspection altered a recorded point');
  assert.equal(view.phase, expectedPhase); assert.equal(view.sample.phase, expectedPhase);
  close(view.sample.fx, expected.net.x, 'Snapshot net Fx'); close(view.sample.fy, expected.net.y, 'Snapshot net Fy');
  close(view.sample.ax, expected.net.x / p.mass, 'Snapshot ax'); close(view.sample.ay, expected.net.y / p.mass, 'Snapshot ay');
  assert.deepEqual(view.phaseValues.map(item => item.text), [formatted(view.sample.vy) + ' m/s', formatted(view.sample.ay) + ' m/s²']);
  assert.deepEqual(view.phaseValues.map(item => item.value), [view.sample.vy, view.sample.ay]);
  assert.equal(view.marker.index, index); assert.equal(view.marker.t, point.t); assert.deepEqual(view.selectedTable, [index]);
  if (expectedPhase === 'impact') assert(view.impactNote && /before ground contact|before contact/.test(view.impactNote) &&
    /collision force/.test(view.impactNote), 'Arrival must retain its collision limitation');
  if (final) {
    assert(view.cards.every(Boolean) && view.cards.length === 3, 'Expected gravity, drag and net cards');
    close(view.forceScale, expected.scale, 'Shared force scale');
    for (const card of view.cards) {
      const vector = expected[card.key];
      assert(card.label, 'Force card needs a readable label');
      assert.deepEqual(card.svg, { viewBox: '0 0 128 128', hidden: 'true', focusable: 'false', zeroDot: true });
      for (const field of ['x', 'y', 'magnitude']) {
        const dd = card.components[field];
        assert.equal(dd.tag, 'DD', 'Force components must retain semantic description lists');
        close(dd.value, vector[field], card.key + ' ' + field);
        assert.equal(dd.text, formatted(dd.value) + ' N', 'Force reading lost precision or units');
      }
      if (vector.magnitude === 0) {
        assert.equal(card.arrow, null, 'Zero force must not draw an arrow');
        assert(card.zero && /Zero force/.test(card.zero), 'Zero force needs a readable explanation');
      } else {
        assert(card.arrow, 'Nonzero force arrow missing');
        close(card.arrow['data-fx'], vector.x, 'Arrow raw Fx'); close(card.arrow['data-fy'], vector.y, 'Arrow raw Fy');
        close(card.arrow['data-magnitude'], vector.magnitude, 'Arrow raw magnitude');
        close(card.arrow['data-scale'], expected.scale, 'Arrow shared scale');
        close(card.arrow.x1, 64, 'Arrow origin x'); close(card.arrow.y1, 64, 'Arrow origin y');
        close(card.arrow.x2, 64 + 42 * vector.x / expected.scale, 'Arrow endpoint x');
        close(card.arrow.y2, 64 - 42 * vector.y / expected.scale, 'Arrow endpoint y');
        assert([card.arrow.x1, card.arrow.y1, card.arrow.x2, card.arrow.y2].every(value => value >= 12 && value <= 116), 'Force arrow left the diagram');
      }
      if (vector.magnitude > 0) assert.equal(card.dash || null, card.key === 'gravity' ? '4 3' : card.key === 'drag' ? '2 3' : null, 'Force arrows lost their non-color distinction');
    }
    const helpKey = expectedPhase === 'impact' ? 'force_phase_impact' : point.mVy > 0 ? p.airResist ? 'force_phase_rising_drag' : 'force_phase_rising_vacuum' :
      point.mVy < 0 ? p.airResist ? 'force_phase_falling_drag' : 'force_phase_falling_vacuum' : 'force_phase_zero_vertical';
    assert(view.phaseHelp?.includes(capturedCatalog[helpKey]), 'Phase explanation uses the wrong recorded model');
    if (point.mVy === 0 && expected.drag.x !== 0) assert(view.phaseHelp.includes(capturedCatalog.force_phase_horizontal_drag), 'Apex must explain remaining horizontal drag');
    assert(view.verticalBalance && [expected.gravity.y, expected.drag.y, expected.net.y].every(value => view.verticalBalance.includes(formatted(value))),
      'Vertical balance must show the signed gravity, drag and net values');
    assert(view.forceMass && view.forceMass.includes(p.mass + ' kg') && view.forceMass.includes(formatted(view.sample.ay) + ' m/s²'),
      'Acceleration explanation must use the recorded mass');
  }
  return { run: trail.run, index, t: point.t, phase: expectedPhase, independentForces: true, capturedSettings: true, viewsLinked: true,
    signedComponents: final, sharedArrowScale: final, zeroForceMarked: final && expected.drag.magnitude === 0, phaseExplanation: final };
}

async function auditInteractions(page, final, original) {
  const selections = [], csvChecks = [];
  let historySelections = 0;
  const preserve = async runIndex => {
    assert.deepEqual(await evidence(page), original, 'Force inspection changed original body, points, metadata or log');
    csvChecks.push(await csv(page, original, runIndex));
    assert.deepEqual(await evidence(page), original, 'CSV copy changed original physics');
  };
  await patch(page, { angle: 20, velocity: 42, gravity: 12, mass: 7, launchHeight: 4, airResist: false, simSpeed: 0 });
  for (const runIndex of [0, 1]) {
    await page.locator('[data-physics-history-select]').selectOption(String(runIndex)); historySelections++;
    await preserve(runIndex);
    const trail = original.trails[runIndex], apex = apexIndex(trail);
    assert(apex >= 0 && apex + 1 < trail.points.length - 1 && trail.points[apex + 1].mVy < 0, 'Need a genuine recorded falling sample after the apex');
    for (const [hook, index, phase] of [['launch', 0, 'rising'], ['highest', apex, 'apex'], ['latest', trail.points.length - 1, 'impact']]) {
      const button = page.locator('[data-physics-sample-jump="' + hook + '"]');
      await button.focus(); await button.press('Enter');
      selections.push(await inspectForces(page, final, original, runIndex, index, phase));
      await preserve(runIndex);
      if (hook === 'highest') {
        const slider = page.locator('[data-physics-sample-slider]');
        await slider.focus(); await slider.press('ArrowRight');
        assert(await slider.evaluate(node => document.activeElement === node), 'Sample slider lost keyboard focus');
        selections.push(await inspectForces(page, final, original, runIndex, apex + 1, 'falling'));
        await preserve(runIndex);
      }
    }
  }
  // Return to the drag launch for comparable, visibly nonzero force diagrams.
  await page.locator('[data-physics-sample-jump="launch"]').click();
  selections.push(await inspectForces(page, final, original, 1, 0, 'rising')); await preserve(1);
  return { selections, selectionCount: selections.length, historySelections, csvCheckCount: csvChecks.length,
    csv: [...new Map(csvChecks.map(item => [item.run, item])).values()], evidenceUnchanged: true, fullCsvUnchanged: true,
    capturedSettings: true, nativeDetailsKeyboard: true, sampleSliderKeyboard: true };
}

async function visualMetrics(page, final, theme) {
  const measured = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('[data-physics-sample-inspector]')];
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
      const nodes = [...root.querySelectorAll('button,input,select,summary')];
      if (root.matches('button,input,select,summary')) nodes.unshift(root);
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
  assert(measured.text.length > 35 && measured.targets.length > 0, 'Too few graph/table measurements');
  const svgText = measured.text.filter(item => item.svg);
  if (final) for (const [name, items] of Object.entries(violations)) assert.equal(items.length, 0, name + ': ' + JSON.stringify(items));
  return { required: final, contrastThreshold: threshold, textCount: measured.text.length, targetCount: measured.targets.length,
    minFontPx: Math.min(...measured.text.map(item => item.font)), minSvgFontPx: svgText.length ? Math.min(...svgText.map(item => item.font)) : null,
    minContrast: Math.min(...measured.text.filter(item => item.contrast != null).map(item => item.contrast)),
    minTargetWidthPx: Math.min(...measured.targets.map(item => item.width)), minTargetHeightPx: Math.min(...measured.targets.map(item => item.height)),
    disabledTextCount: measured.disabledTextCount, violations };
}


async function geometry(page, final, width) {
  const result = await page.evaluate(() => {
    const $ = selector => document.querySelector(selector);
    const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
    const inspector = $('[data-physics-sample-inspector]'), phase = $('[data-physics-motion-phase]'), panel = $('[data-physics-sample-forces]');
    const summary = panel.querySelector('summary'), cards = [...document.querySelectorAll('[data-physics-force-card]')];
    const clipping = cards.flatMap(card => [...card.querySelectorAll('h5,p,dt,dd,svg')].filter(node => {
      if (!node.getClientRects().length) return false;
      const box = node.getBoundingClientRect(), parent = card.getBoundingClientRect();
      return box.left < parent.left - 1 || box.right > parent.right + 1 || box.top < parent.top - 1 || box.bottom > parent.bottom + 1;
    }).map(node => node.getAttribute('data-physics-force-component') || node.tagName));
    return { width: innerWidth, pageOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      inspector: rect(inspector), phase: rect(phase), panel: rect(panel), summary: rect(summary),
      inspectorOverflowPx: Math.max(0, inspector.scrollWidth - inspector.clientWidth),
      phaseOverflowPx: Math.max(0, phase.scrollWidth - phase.clientWidth), panelOverflowPx: Math.max(0, panel.scrollWidth - panel.clientWidth),
      cards: cards.map(card => ({ key: card.getAttribute('data-physics-force-card'), box: rect(card), overflowPx: Math.max(0, card.scrollWidth - card.clientWidth) })),
      clipping, nativeSummary: summary.tagName === 'SUMMARY' && panel.tagName === 'DETAILS', detailsOpen: panel.open };
  });
  if (final) {
    for (const key of ['pageOverflowPx', 'inspectorOverflowPx', 'phaseOverflowPx', 'panelOverflowPx']) assert.equal(result[key], 0, key);
    assert(result.nativeSummary && result.detailsOpen, 'Native forces disclosure must remain open');
    assert(result.summary.width >= 43.99 && result.summary.height >= 43.99, 'Native summary target must be at least 44×44');
    assert.equal(result.cards.length, 3); assert(result.cards.every(card => card.overflowPx === 0), 'Force card overflow');
    assert.deepEqual(result.clipping, [], 'Force card content clipped');
    const cards = result.cards.map(card => card.box);
    if (width === 1100) assert(cards.every(card => Math.abs(card.y - cards[0].y) <= 1), 'Desktop force cards must share a row');
    else assert(cards[1].y >= cards[0].bottom - 1 && cards[2].y >= cards[1].bottom - 1, 'Phone force cards must stack');
  }
  return { required: final, ...result };
}

async function catalogEvidence(page) {
  const namespace = await page.evaluate(() => window.__strings.stem.physics);
  assert.deepEqual(namespace, capturedCatalog, 'Captured full physics catalog namespace differs from frozen dependency');
  const keys = await page.evaluate(() => [...(window.__forceAuditTranslationKeys || [])].sort());
  assert(keys.length > 50 && keys.every(key => key.startsWith('stem.physics.')), 'Fixture requested translations outside physics namespace');
  assert(keys.every(key => typeof capturedCatalog[key.slice('stem.physics.'.length)] === 'string'), 'Requested physics key absent from captured catalog');
  return { namespace: 'stem.physics', namespaceSha256: capturedCatalogSha256, namespaceKeyCount: Object.keys(namespace).length,
    matchesFrozenNamespace: true, requestedKeysVerified: true, requestedKeyCount: keys.length, translationKeys: keys };
}

async function capture(browser, html, version, theme, width) {
  const final = version === 'final', { page, errors } = await mount(browser, html, theme, width);
  try {
    await recordFlights(page);
    const original = freezeSnapshot(await evidence(page));
    if (!baselineEvidence) baselineEvidence = original;
    assert.deepEqual(original, baselineEvidence, 'Actual vacuum/drag body, all points, full metadata or log differ from pinned baseline');
    assert.deepEqual(original.trails.map(trail => trail.parameters.drag), [false, true]);
    assert.equal(await page.evaluate(() => window.StemLab._physics.DRAG_K), .004, 'Independent drag coefficient changed');
    const interaction = await auditInteractions(page, final, original);
    const quality = await visualMetrics(page, final, theme), layout = await geometry(page, final, width);
    const catalog = await catalogEvidence(page), screenshots = [];
    for (const [label, selector] of [['phase', '[data-physics-motion-phase]'], ['balance', '[data-physics-sample-forces]']]) {
      const file = 'forces-' + version + '-' + theme + '-' + width + '-' + label + '.png';
      await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); screenshots.push(file);
    }
    assert.deepEqual(await evidence(page), original, 'Capture changed recorded evidence');
    assert.deepEqual(errors, [], 'Page errors during force audit');
    configurations.push({ version, theme, width, screenshots, quality, geometry: layout, interaction, catalog,
      translationKeys: catalog.translationKeys, model: { actualFlights: 2, modes: ['vacuum', 'drag'], matchesBaseline: true,
        frozenSnapshot: Object.isFrozen(original), fullMetadataCompared: true, evidenceSha256: sha(original),
        samples: original.trails.map(trail => trail.points.length), apexIndices: original.trails.map(apexIndex) }, pageErrors: errors });
    console.log('Verified ' + version + ' ' + theme + ' forces at ' + width + 'px: 2 actual flights, ' + interaction.selectionCount +
      ' selections, ' + interaction.csvCheckCount + ' full CSV checks, ' + screenshots.length + ' PNGs');
  } catch (error) { failures.push({ version, theme, width, message: error.message, pageErrors: errors }); throw error; }
  finally { await page.close(); }
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
    assert.equal(configurations.reduce((count, config) => count + config.screenshots.length, 0), 22);
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
    const passed = configurations.length === 11 && screenshotCount === 22 && failures.length === 0;
    const counts = { configurations: configurations.length, baseline: configurations.filter(config => config.version === 'baseline').length,
      final: configurations.filter(config => config.version === 'final').length, actualFlights: configurations.length * 2,
      screenshots: screenshotCount, selections: configurations.reduce((count, config) => count + config.interaction.selectionCount, 0),
      csvChecks: configurations.reduce((count, config) => count + config.interaction.csvCheckCount, 0) };
    fs.writeFileSync(path.join(__dirname, 'forces-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), baselineCommit: BASELINE, baselineGitSha,
      sourceFile: TOOL, sourceSha256, auditSha256, dependencySha256, catalogDependency, capturedCatalogNamespace: capturedCatalog, catalogNamespaceUnchanged, sourceUnchanged, mirrorUnchanged, mirrorMatches,
      auditorUnchanged, dependenciesUnchanged, passed, counts, configurations, failures }, null, 2));
    console.log('Force audit ' + (passed ? 'PASS' : 'FAIL') + ': ' + counts.configurations + '/11 configurations, ' +
      counts.actualFlights + ' actual flights, ' + counts.screenshots + '/22 PNGs, ' + counts.selections +
      ' selections, ' + counts.csvChecks + ' full CSV checks; ' + failures.length + ' failures.');
    assert(passed, 'Force visual/evidence audit failed; see forces-results.json');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
