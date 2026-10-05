/* Author-only seasonal-landmark QA; root runs after the unit checks. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = process.env.AQUACULTURE_REPO || path.resolve(__dirname, '../..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = process.env.AQUACULTURE_QA_OUT || path.join(__dirname, 'browser-replay');
const storageKey = 'aquacultureLab.state.v1';
const results = [];
fs.mkdirSync(out, { recursive: true });

// Read only the reusable local React/HTTP fixture, never its test runner.
const original = fs.readFileSync(path.join(repo, 'dev-tools/aquatic_browser_qa.cjs'), 'utf8');
const start = original.indexOf('function harness(tool) {');
const end = original.indexOf('const server=http', start);
if (start < 0 || end <= start) throw Error('The reusable HTTP React fixture was not found.');
const harness = new Function(original.slice(start, end) + ';return harness;')();
const files = {
  '/stem_lab/stem_tool_aquaculture.js': 'stem_lab/stem_tool_aquaculture.js',
  '/desktop/web-app/node_modules/react/umd/react.production.min.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
  '/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  '/dev-tools/.cache/sweep-tailwind.css': 'dev-tools/.cache/sweep-tailwind.css',
  '/axe.js': 'node_modules/axe-core/axe.min.js'
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/qa/aquacultureLab') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(harness({ id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' })); return;
  }
  const item = files[url.pathname];
  if (!item) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', item.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8');
  res.end(fs.readFileSync(path.join(repo, item)));
});

const baseline = {
  environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 },
  water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'heatwave'
};
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const writing = {
  claim: 'I want to compare the months with the lowest and highest modeled readings.',
  evidence: 'I will capture one inspected month and check its original A and B values.',
  reasoning: 'A seasonal difference may help identify a month to investigate while the input settings remain fixed.',
  nextTest: 'I would repeat the comparison with one input changed.'
};
const baseTime = Date.UTC(2026, 9, 3, 15);
function plainSeed(current = changed, overrides = {}) {
  return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...current, baselineScenario: baseline,
    prediction: 'The oxygen input may change the annual pattern; inspect the individual months before explaining it.',
    observation: 'This unfinished seasonal explanation should stay intact while I inspect the timeline.',
    evidence: { ...writing }, measurements: [], experiments: [], investigationId: '', ...overrides } };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) { assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual)); }
function near(actual, expected, message) { assert(typeof actual === 'number' && Math.abs(actual - expected) <= 1e-6, message + ': expected ' + expected + ', actual ' + actual); }
const explorer = page => page.locator('section.aq-seasonal-explorer');
const disclosure = page => explorer(page).locator('details.aq-season-landmarks');
const landmark = (page, kind) => disclosure(page).locator('[data-landmark="' + kind + '"]');
const inspectButton = (page, kind) => landmark(page, kind).getByRole('button', { name: { low: 'Inspect lowest B value', high: 'Inspect highest B value', gap: 'Inspect largest A/B gap' }[kind], exact: true });
const inspection = page => page.locator('#aq-season-inspection');
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
function inputsOf(value) { return { environmentId: value.environmentId, organisms: value.organisms, water: value.water, disturbanceId: value.disturbanceId }; }
async function workspace(page) { return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey); }
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url); await explorer(page).waitFor(); await disclosure(page).waitFor(); return page;
}
async function activateKeyboard(page, locator, key = 'Enter') { await locator.focus(); await page.keyboard.press(key); }
async function openDetails(page, locator) { if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary')); }
async function selectKeyboard(page, id, value) {
  const select = page.locator('#' + id), options = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
  const index = options.indexOf(value); assert(index >= 0, id + ' offers the requested native option ' + value);
  await select.focus(); await page.keyboard.press('Home');
  for (let at = 0; at < index; at++) await page.keyboard.press('ArrowDown');
  equal(await select.inputValue(), value, id + ' reaches ' + value + ' through native keyboard navigation');
  assert(await select.evaluate(element => element === document.activeElement), 'Native select retains focus after keyboard selection');
}
async function selectedMonth(page) {
  const buttons = explorer(page).locator('.aq-season-months > button');
  const selected = await buttons.evaluateAll(nodes => nodes.map((node, index) => node.getAttribute('aria-pressed') === 'true' ? index : -1).filter(index => index >= 0));
  equal(selected.length, 1, 'Exactly one modeled month remains selected'); return selected[0];
}
async function expectedFor(page, metricId, speciesId = 'system') {
  return page.evaluate(({ key, metricId, speciesId }) => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
    const b = h.simulateEcosystemYear(ws), a = ws.baselineScenario ? h.simulateEcosystemYear(ws.baselineScenario) : null;
    const selection = { metricId, speciesId }, landmarks = h.ecosystemSeasonalLandmarks(a, b, selection);
    return { a, b, selection, landmarks };
  }, { key: storageKey, metricId, speciesId });
}
const shared = new Set(['oxygen', 'ammonia', 'temperature', 'carryingPressure', 'resilience', 'effort']);
const units = { oxygen: ' mg/L', ammonia: ' mg/L', temperature: ' C', carryingPressure: ' /100', biomass: ' index points', survival: '%', resilience: ' /100', effort: ' /100', stress: ' /100', progress: '%' };
function seriesValue(month, metricId, speciesId) {
  if (!month) return null;
  const source = shared.has(metricId) || speciesId === 'system' ? month : (month.species || []).find(item => item.id === speciesId);
  if (!source || speciesId === 'system' && metricId === 'survival' && source.hasCrop === false) return null;
  const value = source[metricId]; return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function independentMath(expected) {
  const { metricId, speciesId } = expected.selection;
  const b = expected.b.timeline.map((point, month) => ({ month, value: seriesValue(point, metricId, speciesId) })).filter(item => item.value != null);
  const low = b.length ? Math.min(...b.map(item => item.value)) : null, high = b.length ? Math.max(...b.map(item => item.value)) : null;
  const pairs = expected.a ? expected.b.timeline.map((point, month) => {
    const a = seriesValue(expected.a.timeline[month], metricId, speciesId), b = seriesValue(point, metricId, speciesId);
    // The explorer's existing displayed B-minus-A precision is two decimal
    // places. Extrema retain raw trace values; paired gap ranking uses display.
    return a == null || b == null ? null : { month, a, b, delta: Number((b - a).toFixed(2)) };
  }).filter(Boolean) : [];
  const magnitude = pairs.length ? Math.max(...pairs.map(item => Math.abs(item.delta))) : null;
  return { validMonths: b.length, low: low == null ? null : { value: low, months: b.filter(item => item.value === low).map(item => item.month) },
    high: high == null ? null : { value: high, months: b.filter(item => item.value === high).map(item => item.month) },
    comparison: { validMonths: pairs.length, magnitude, months: magnitude == null ? [] : pairs.filter(item => Math.abs(item.delta) === magnitude) } };
}
async function checkLandmarks(page, expected, label) {
  const math = independentMath(expected), actual = expected.landmarks;
  const context = await page.locator('#aq-season-landmarks-context').innerText();
  assert(context.includes(actual.metric.label), label + ' context names the currently selected measurement');
  assert(context.includes('Uses ' + math.validMonths + ' of 12 B months'), label + ' context gives actual B availability without filling absent values');
  if (shared.has(expected.selection.metricId) && expected.selection.speciesId !== 'system') assert(context.includes('Shared system measurement'), label + ' following an organism keeps shared-system context explicit');
  equal(actual.validMonths, math.validMonths, label + ' helper counts only actual numeric B months');
  for (const kind of ['low', 'high']) {
    if (math[kind]) {
      assert(actual[kind], label + ' has a ' + kind + ' landmark'); near(actual[kind].value, math[kind].value, label + ' ' + kind + ' value equals independent actual-timeline arithmetic');
      equal(actual[kind].months, math[kind].months, label + ' ' + kind + ' keeps every tied month in chronological order');
      const text = await landmark(page, kind).innerText();
      assert(text.includes(String(Number(math[kind].value.toFixed(3)))), label + ' ' + kind + ' card shows its actual numeric value');
      assert(text.includes(expected.b.timeline[math[kind].months[0]].month), label + ' ' + kind + ' card names its earliest actual month');
      for (const month of math[kind].months) assert(text.includes(expected.b.timeline[month].month), label + ' ' + kind + ' detail names every actual tied month');
      assert(text.includes(units[expected.selection.metricId].trim()), label + ' ' + kind + ' card includes measurement units');
      equal(await inspectButton(page, kind).count(), 1, label + ' numeric ' + kind + ' has its exact inspection action');
      equal(await inspectButton(page, kind).getAttribute('aria-controls'), 'aq-season-inspection', label + ' ' + kind + ' action declares the existing inspection target');
      const refs = (await inspectButton(page, kind).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      assert(refs.includes('aq-season-landmarks-context') && refs.includes('aq-season-landmark-' + kind + '-detail'), label + ' ' + kind + ' action is described by context and exact landmark detail');
      for (const ref of refs) equal(await page.locator('#' + ref).count(), 1, label + ' action description resolves exactly once: ' + ref);
    } else {
      equal(actual[kind], null, label + ' does not invent a missing B ' + kind + ' value');
      equal(await inspectButton(page, kind).count(), 0, label + ' unavailable ' + kind + ' has no inspection action');
    }
  }
  if (expected.a && math.comparison.validMonths) {
    equal(actual.comparison.validMonths, math.comparison.validMonths, label + ' helper counts only valid A/B pairs');
    near(actual.comparison.magnitude, math.comparison.magnitude, label + ' largest absolute gap equals independent timeline arithmetic');
    equal(actual.comparison.months.map(item => item.month), math.comparison.months.map(item => item.month), label + ' largest gap keeps every chronological tie');
    for (let at = 0; at < math.comparison.months.length; at++) {
      const actualPair = actual.comparison.months[at], pair = math.comparison.months[at];
      for (const key of ['a', 'b', 'delta']) near(actualPair[key], pair[key], label + ' gap keeps the signed original ' + key);
    }
    equal(actual.comparison.state, math.comparison.magnitude === 0 ? 'match' : 'ready', label + ' comparison state follows the actual numeric gap');
    equal(await inspectButton(page, 'gap').count(), math.comparison.magnitude === 0 ? 0 : 1, label + ' matching A/B never suggests a largest-gap navigation');
    if (math.comparison.magnitude > 0) {
      const detail = await page.locator('#aq-season-landmark-gap-detail').innerText();
      for (const pair of math.comparison.months) {
        const signed = (pair.delta > 0 ? '+' : '') + pair.delta;
        assert(detail.includes(expected.b.timeline[pair.month].month + ' (' + signed + actual.metric.deltaUnit + ')'), label + ' gap detail keeps the signed value and units for every tied month');
      }
      assert((await landmark(page, 'gap').locator(':scope > strong').innerText()).includes(String(math.comparison.magnitude) + actual.metric.deltaUnit + ' absolute gap'), label + ' gap card reports absolute magnitude with difference units');
    }
  } else {
    equal(actual.comparison.state, expected.a ? 'unavailable' : 'no-baseline', label + ' missing pairs/baseline have an explicit state');
    equal(await inspectButton(page, 'gap').count(), 0, label + ' unavailable comparison has no gap action');
  }
  fs.writeFileSync(path.join(out, label + '-landmarks.json'), JSON.stringify({ selection: expected.selection, helper: actual, independent: math }, null, 2));
  return math;
}
async function inspectLandmark(page, expected, kind, label) {
  const before = await workspace(page), item = kind === 'gap' ? expected.landmarks.comparison : expected.landmarks[kind];
  const target = kind === 'gap' ? item.months[0].month : item.months[0];
  await activateKeyboard(page, inspectButton(page, kind));
  await page.waitForFunction(() => document.activeElement?.id === 'aq-season-month-heading');
  equal(await page.locator('#aq-season-month-heading').getAttribute('tabindex'), '-1', label + ' inspection heading is programmatically focusable');
  equal(await selectedMonth(page), target, label + ' selects the earliest tied ' + kind + ' month');
  assert((await page.locator('#aq-season-month-heading').innerText()).startsWith(expected.b.timeline[target].month + ' '), label + ' inspection heading names the selected month');
  const readings = await inspection(page).locator(':scope > .aq-season-readings > div').evaluateAll(nodes => nodes.map(node => ({ label: node.querySelector('dt')?.textContent, reading: node.querySelector('dd')?.textContent })));
  const reading = readings.find(item => item.label.startsWith(expected.landmarks.metric.label));
  assert(reading, label + ' selected measurement appears in the existing inspection readings');
  const { metricId, speciesId } = expected.selection, b = seriesValue(expected.b.timeline[target], metricId, speciesId), a = expected.a ? seriesValue(expected.a.timeline[target], metricId, speciesId) : null;
  assert(reading.reading.includes('B ' + b + units[metricId]), label + ' inspection displays the exact selected original B value and units');
  if (a != null) assert(reading.reading.includes('A ' + a + units[metricId]), label + ' inspection displays the exact same-month original A value and units');
  equal(await workspace(page), before, label + ' navigation changes only the view, preserving inputs, writing, notebooks, original archives and parked work');
  return target;
}
async function captureSelected(page, expected, month, label) {
  const before = await workspace(page), { metricId, speciesId } = expected.selection;
  const expectedCapture = await page.evaluate(({ key, metricId, speciesId, month }) => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
    return h.ecosystemMeasurement(ws, { scope: 'month', month, metricId, speciesId }, 1, 'expected-capture');
  }, { key: storageKey, metricId, speciesId, month });
  assert(expectedCapture, label + ' selected result is an available actual-model capture');
  await activateKeyboard(page, inspection(page).getByRole('button', { name: 'Record inspected result', exact: true }));
  const after = await workspace(page), ids = new Set(before.measurements.map(item => item.id)), note = after.measurements.find(item => !ids.has(item.id));
  assert(note && after.measurements.length === before.measurements.length + 1, label + ' adds exactly one selected-month capture');
  for (const key of ['scope', 'month', 'metricId', 'speciesId', 'metricLabel', 'unit', 'deltaUnit', 'aState', 'bState', 'a', 'b', 'modelVersion', 'baselineScenario', 'currentScenario', 'aEvent', 'bEvent']) equal(note[key], expectedCapture[key], label + ' preserves exact selected capture field ' + key);
  const actualB = seriesValue(expected.b.timeline[month], metricId, speciesId), actualA = expected.a ? seriesValue(expected.a.timeline[month], metricId, speciesId) : null;
  equal(note.b, actualB, label + ' captured B matches the independently read selected timeline value');
  equal(note.a, actualA, label + ' captured A matches the independently read selected timeline value');
  equal(note.unit, units[metricId], label + ' captured measurement uses its existing exact unit');
  equal(note.speciesId, shared.has(metricId) ? 'system' : speciesId, label + ' shared water remains a system capture while following an organism');
  equal(inputsOf(after), inputsOf(before), label + ' capture does not change scenario inputs');
  for (const key of ['baselineScenario', 'prediction', 'observation', 'evidence', 'experiments', 'investigationId', 'parkedDraft']) equal(after[key], before[key], label + ' capture preserves learner and archived work: ' + key);
  equal(after.measurements.filter(item => ids.has(item.id)), before.measurements, label + ' capture leaves existing notebook rows frozen');
  await openDetails(page, notebook(page));
  const row = notebook(page).locator('.aq-measurement-row[data-measurement-id="' + note.id + '"]');
  assert((await row.innerText()).includes(expected.b.timeline[month].month + ' model'), label + ' notebook labels the actual selected month');
  assert((await row.locator('.aq-measurement-reading').innerText()).includes(String(note.b) + note.unit), label + ' notebook exposes the exact captured B value and units');
  fs.writeFileSync(path.join(out, label + '-captured-reading.json'), JSON.stringify(note, null, 2));
  await page.reload(); await disclosure(page).waitFor();
  equal(await workspace(page), after, label + ' selected capture and complete learner/archived state survive reload');
  return note;
}
async function reflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size));
}
async function axeAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const audit = await page.evaluate(async () => {
    const value = await axe.run({ include: ['.aq-season-landmarks', '#aq-season-inspection'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  });
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' focused WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function screenshotAndAudit(page, label, origin, forced = false) {
  await openDetails(page, disclosure(page)); await reflow(page, label);
  const sizes = await disclosure(page).locator('button,:scope > summary').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of sizes) assert(item.height >= 43.5, 'Landmark controls have a 44px minimum target height: ' + JSON.stringify(item));
  await axeAudit(page, label, origin);
  await explorer(page).screenshot({ path: path.join(out, label + '.png') });
  await disclosure(page).screenshot({ path: path.join(out, label + '-cards.png') });
  await inspection(page).screenshot({ path: path.join(out, label + '-inspection.png') });
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await reflow(page, label + ' forced colors'); await axeAudit(page, label + '-forced-colors', origin);
    await explorer(page).screenshot({ path: path.join(out, label + '-forced-colors.png') });
    await disclosure(page).screenshot({ path: path.join(out, label + '-cards-forced-colors.png') });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  }
}
async function actualSeed(bootstrap) {
  return bootstrap.evaluate(({ baseline, changed, writing, time }) => {
    const h = window.AquacultureLearningHelpers, priorB = { ...baseline, water: { ...baseline.water, oxygen: 8.6 } };
    const aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(priorB), model = h.calculateEcosystem(priorB);
    const priorNote = h.ecosystemMeasurement({ ...priorB, baselineScenario: baseline }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 3600000, 'original-annual-reading');
    const originalRecord = { id: 'original-seasonal-investigation', title: 'Earlier oyster seasonal investigation', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion,
      environmentId: priorB.environmentId, organisms: priorB.organisms, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience,
      baselineScenario: baseline, currentScenario: priorB, baselineSummary: aRun.summary, currentSummary: bRun.summary,
      prediction: 'A smaller oxygen input change may alter the seasonal oxygen pattern.', observation: 'This earlier saved explanation must remain fixed while I navigate a new seasonal investigation.', evidence: writing, measurements: priorNote ? [priorNote] : [] };
    const parkedB = { ...baseline, water: { ...baseline.water, oxygen: 7.4 } };
    const parkedNote = h.ecosystemMeasurement(parkedB, { scope: 'month', month: 2, metricId: 'oxygen', speciesId: 'system' }, time - 7200000, 'parked-march-reading');
    const liveNote = h.ecosystemMeasurement({ ...changed, baselineScenario: baseline }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 60000, 'live-annual-reading');
    return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...changed, baselineScenario: baseline,
      prediction: 'The oxygen input may change the annual pattern; inspect the individual months before explaining it.',
      observation: 'This unfinished seasonal explanation should stay intact while I inspect the timeline.', evidence: writing,
      measurements: liveNote ? [liveNote] : [], experiments: [originalRecord], investigationId: '',
      parkedDraft: { ...parkedB, baselineScenario: null, prediction: 'I will return to this lower-oxygen draft later.', observation: 'The parked draft and its March reading must survive all seasonal navigation.', evidence: { claim: 'Investigate a lower oxygen reference.', evidence: '', reasoning: '', nextTest: '' }, measurements: parkedNote ? [parkedNote] : [], investigationId: '' }
    } };
  }, { baseline, changed, writing, time: baseTime });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    const bootstrapErrors = [], bootstrap = await openSeeded(browser, url, 1280, plainSeed(), bootstrapErrors), seed = await actualSeed(bootstrap);
    assert(seed.ecosystemWorkspace.measurements.length === 1 && seed.ecosystemWorkspace.experiments[0].measurements.length === 1 && seed.ecosystemWorkspace.parkedDraft.measurements.length === 1, 'Actual model generated live, archived and parked captured-reading fixtures');
    assert(bootstrapErrors.length === 0, 'Fixture bootstrap runtime errors: ' + bootstrapErrors.join('; ')); await bootstrap.close();

    for (const width of [1280, 390, 320]) {
      console.log('Seasonal-landmark QA: shared oxygen at ' + width);
      const errors = [], page = await openSeeded(browser, url, width, seed, errors); await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await workspace(page);
      equal(await disclosure(page).evaluate(element => element.open), false, 'Seasonal landmarks start in a collapsed native disclosure');
      equal(await disclosure(page).locator(':scope > summary').innerText(), 'Find low, high and largest A/B gap', 'Native summary uses the intended accessible name');
      await activateKeyboard(page, disclosure(page).locator(':scope > summary'), 'Space');
      assert(await disclosure(page).evaluate(element => element.open), 'Native landmark disclosure opens with Space');
      await activateKeyboard(page, disclosure(page).locator(':scope > summary'), 'Enter');
      equal(await disclosure(page).evaluate(element => element.open), false, 'Native landmark disclosure closes with Enter');
      await selectKeyboard(page, 'aq-season-species', 'system'); await selectKeyboard(page, 'aq-season-metric', 'oxygen'); await openDetails(page, disclosure(page));
      const expected = await expectedFor(page, 'oxygen'), math = await checkLandmarks(page, expected, 'oxygen-' + width);
      equal(await workspace(page), before, 'Native metric/species selection and landmark calculation leave all persistent work unchanged');
      await inspectLandmark(page, expected, 'low', 'Oxygen low at ' + width);
      await inspectLandmark(page, expected, 'high', 'Oxygen high at ' + width);
      const capturedMonth = math.comparison.magnitude > 0 ? await inspectLandmark(page, expected, 'gap', 'Oxygen gap at ' + width) : await inspectLandmark(page, expected, 'low', 'Matching oxygen low at ' + width);
      await screenshotAndAudit(page, 'sample-oxygen-landmarks-' + width, origin, width === 320);
      await captureSelected(page, expected, capturedMonth, 'oxygen-' + width);
      assert(errors.length === 0, 'Oxygen workflow runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ case: 'shared oxygen landmarks', width, checks: ['native disclosure and metric/species keyboard selection', 'helper and independent actual-model min/max/absolute gap', 'all tied months and earliest tie navigation', 'inspection focus and selected month', 'view-only inputs/writing/notebook/archive/parked preservation', 'exact selected-month capture value and units', 'complete captured/protected state survives reload', 'scoped axe, 44px controls, reduced motion and reflow', ...(width === 320 ? ['forced colors'] : [])], errors }); await page.close();
    }

    {
      const errors = [], page = await openSeeded(browser, url, 320, seed, errors); await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await workspace(page); await selectKeyboard(page, 'aq-season-species', 'oyster'); await selectKeyboard(page, 'aq-season-metric', 'progress'); await openDetails(page, disclosure(page));
      const expected = await expectedFor(page, 'progress', 'oyster'), math = await checkLandmarks(page, expected, 'oyster-progress-320');
      equal(await workspace(page), before, 'Selecting oyster progress preserves all persistent work');
      await inspectLandmark(page, expected, 'low', 'Oyster progress low');
      const highMonth = await inspectLandmark(page, expected, 'high', 'Oyster progress high');
      if (math.comparison.magnitude > 0) await inspectLandmark(page, expected, 'gap', 'Oyster progress gap');
      await screenshotAndAudit(page, 'sample-oyster-progress-320', origin, true);
      await inspectLandmark(page, expected, 'high', 'Oyster progress captured high');
      await captureSelected(page, expected, highMonth, 'oyster-progress-320');
      // Reload returns the ordinary default view, then a metric change must
      // recalculate cards without changing the stored scenario or learner work.
      const afterCapture = await workspace(page); await selectKeyboard(page, 'aq-season-species', 'oyster'); await selectKeyboard(page, 'aq-season-metric', 'progress'); await openDetails(page, disclosure(page));
      const progressCards = await disclosure(page).innerText(); await selectKeyboard(page, 'aq-season-metric', 'temperature');
      const temperature = await expectedFor(page, 'temperature', 'oyster'); await checkLandmarks(page, temperature, 'oyster-temperature-320');
      assert((await disclosure(page).innerText()) !== progressCards, 'Changing the plotted metric updates the landmark descriptions and values');
      equal(await workspace(page), afterCapture, 'Metric change remains a view-only operation after capture');
      assert(errors.length === 0, 'Species-progress runtime errors: ' + errors.join('; '));
      results.push({ case: 'species progress and metric refresh', width: 320, checks: ['actual oyster progress min/max/gap independent arithmetic', 'earliest tied month actions and focus', 'exact species progress percent capture', 'protected work and reload', 'metric changes update landmarks', 'shared temperature semantics following oyster', 'scoped axe, reduced motion, reflow and forced colors'], errors }); await page.close();
    }

    {
      const cases = [
        { name: 'no-baseline', patch: { baselineScenario: null }, metricId: 'oxygen', speciesId: 'system', state: 'no-baseline' },
        { name: 'all-zero-gap', patch: { baselineScenario: inputsOf(seed.ecosystemWorkspace) }, metricId: 'oxygen', speciesId: 'system', state: 'match' },
        { name: 'species-only-in-A', patch: { organisms: { kelp: 1, nitrifiers: 1 } }, metricId: 'progress', speciesId: 'oyster', state: 'unavailable' },
        { name: 'species-only-in-B', patch: { baselineScenario: { ...baseline, organisms: { kelp: 1, nitrifiers: 1 } } }, metricId: 'progress', speciesId: 'oyster', state: 'unavailable' }
      ];
      const edgeResults = [];
      for (const item of cases) {
        const caseSeed = clone(seed); Object.assign(caseSeed.ecosystemWorkspace, item.patch);
        const errors = [], page = await openSeeded(browser, url, 320, caseSeed, errors), before = await workspace(page);
        await selectKeyboard(page, 'aq-season-species', item.speciesId); await selectKeyboard(page, 'aq-season-metric', item.metricId); await openDetails(page, disclosure(page));
        const expected = await expectedFor(page, item.metricId, item.speciesId), math = await checkLandmarks(page, expected, item.name + '-320');
        equal(expected.landmarks.comparison.state, item.state, item.name + ' has the intended explicit comparison state');
        equal(await inspectButton(page, 'gap').count(), 0, item.name + ' has no misleading largest-gap button');
        if (math.low) await inspectLandmark(page, expected, 'low', item.name + ' available B low');
        if (math.high) await inspectLandmark(page, expected, 'high', item.name + ' available B high');
        if (item.name === 'no-baseline') assert(math.low && math.high, 'Missing A retains both actual B extrema');
        if (item.name === 'species-only-in-A') {
          equal(math.validMonths, 0, 'Missing B species never becomes a zero-valued landmark');
          assert((await disclosure(page).innerText()).match(/not stocked|unavailable|not available/i), 'One-sided B absence is visibly explained');
        }
        if (item.name === 'species-only-in-B') assert(math.low && math.high, 'B-only species retains actual B extrema while A/B comparison is unavailable');
        equal(await workspace(page), before, item.name + ' landmark availability and navigation preserve all settings/writing/archives');
        await screenshotAndAudit(page, 'edge-' + item.name + '-320', origin, item.name === 'no-baseline');
        assert(errors.length === 0, item.name + ' runtime errors: ' + errors.join('; ')); edgeResults.push({ case: item.name, state: item.state, validBMonths: math.validMonths, errors }); await page.close();
      }
      results.push({ case: 'one-sided species, missing A and equal trajectories', width: 320, checks: ['no baseline retains B low/high', 'all-zero gap removes gap action', 'A-only species is unavailable rather than zero', 'B-only species retains B extrema but has no paired gap', 'availability navigation preserves complete workspace', 'scoped axe and responsive screenshots'], edges: edgeResults });
    }

    {
      const errors = [], page = await openSeeded(browser, url, 320, seed, errors), before = await workspace(page); await page.emulateMedia({ reducedMotion: 'reduce' });
      await selectKeyboard(page, 'aq-season-species', 'nitrifiers'); await openDetails(page, disclosure(page));
      const offered = await page.locator('#aq-season-metric option').evaluateAll(nodes => nodes.map(node => node.value));
      for (const id of ['biomass', 'survival', 'progress']) assert(!offered.includes(id), 'Fixed support does not offer the inapplicable crop metric ' + id);
      await selectKeyboard(page, 'aq-season-metric', 'oxygen');
      const expected = await expectedFor(page, 'oxygen', 'nitrifiers'), system = await expectedFor(page, 'oxygen');
      equal(expected.landmarks, system.landmarks, 'Shared water landmarks have system semantics while following fixed support');
      await checkLandmarks(page, expected, 'support-shared-oxygen-320');
      const month = await inspectLandmark(page, expected, 'low', 'Shared oxygen following biofilter');
      await screenshotAndAudit(page, 'sample-support-shared-oxygen-320', origin, true);
      equal(await workspace(page), before, 'Support species selection and shared-water navigation preserve the full workspace');
      await captureSelected(page, expected, month, 'support-shared-oxygen-320');
      const guard = await page.evaluate(({ a, b }) => {
        const h = window.AquacultureLearningHelpers;
        // The actual traces remain unchanged; only A's version provenance is
        // relabeled to test the guard, not to invent an earlier model output.
        const earlierA = { ...a, modelVersion: 'qa-earlier-model' }, mismatched = h.ecosystemSeasonalLandmarks(earlierA, b, { metricId: 'oxygen', speciesId: 'system' });
        return { mismatch: mismatched, bOnly: h.ecosystemSeasonalLandmarks(null, b, { metricId: 'oxygen', speciesId: 'system' }), unsupported: ['biomass', 'survival', 'progress'].map(metricId => h.ecosystemSeasonalLandmarks(a, b, { metricId, speciesId: 'nitrifiers' })) };
      }, { a: expected.a, b: expected.b });
      equal(guard.mismatch.comparison.state, 'model-mismatch', 'Earlier-model provenance suppresses paired gap calculation');
      equal(guard.mismatch.low, guard.bOnly.low, 'Model mismatch leaves B low unchanged'); equal(guard.mismatch.high, guard.bOnly.high, 'Model mismatch leaves B high unchanged');
      for (const value of guard.unsupported) assert(value.low == null && value.high == null, 'Pure helper does not assign crop extrema to fixed support');
      fs.writeFileSync(path.join(out, 'support-and-model-guard.json'), JSON.stringify(guard, null, 2));
      assert(errors.length === 0, 'Shared support runtime errors: ' + errors.join('; '));
      results.push({ case: 'shared water and fixed-support applicability', width: 320, checks: ['support excludes biomass/survival/progress', 'following support retains whole-system oxygen landmarks', 'exact system capture value/units despite species following', 'model mismatch keeps B extrema and suppresses gap', 'pure helper support applicability guard', 'full protected workspace preservation', 'scoped axe, reduced motion, reflow and forced colors'], errors }); await page.close();
    }

    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2));
    console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error;
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
