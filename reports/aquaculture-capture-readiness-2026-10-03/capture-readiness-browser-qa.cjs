/* Author-only capture-readiness QA; root executes after unit checks. */
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
const original = fs.readFileSync(path.join(repo, 'dev-tools/aquatic_browser_qa.cjs'), 'utf8');
const start = original.indexOf('function harness(tool) {'), end = original.indexOf('const server=http', start);
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
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(harness({ id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' })); return;
  }
  const item = files[url.pathname]; if (!item) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', item.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(repo, item)));
});

const baseline = { environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 },
  water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'heatwave' };
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const writing = { claim: 'I want to capture the selected model reading without losing its original context.',
  evidence: 'I will review annual and monthly readings beside their frozen A and B settings.',
  reasoning: 'The time source and settings help determine whether two readings describe the same comparison.',
  nextTest: 'I would change one input and record a new reading.' };
const baseTime = Date.UTC(2026, 9, 3, 16), months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function seedFor(current = changed, patch = {}) { return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...current, baselineScenario: baseline,
  prediction: 'An input change may affect the selected reading; I will keep its original settings.',
  observation: 'This unfinished reflection and structured writing must remain while I capture and review readings.',
  evidence: { ...writing }, measurements: [], experiments: [], investigationId: '', ...patch } }; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) { assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual)); }
const annualContainer = page => page.locator('.aq-measurement-capture');
const inspection = page => page.locator('#aq-season-inspection');
const panel = (page, scope) => page.locator('#aq-' + (scope === 'annual' ? 'annual' : 'month') + '-capture-readiness');
const recordButton = (page, scope) => (scope === 'annual' ? annualContainer(page) : inspection(page)).getByRole('button', { name: scope === 'annual' ? 'Record annual result' : 'Record inspected result', exact: true });
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const row = (page, id) => notebook(page).locator('.aq-measurement-row[data-measurement-id="' + id + '"]');
const explorer = page => page.locator('.aq-seasonal-explorer');
function inputsOf(value) { return { environmentId: value.environmentId, organisms: value.organisms, water: value.water, disturbanceId: value.disturbanceId }; }
async function workspace(page) { return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey); }
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }); page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url); await panel(page, 'annual').waitFor(); await panel(page, 'month').waitFor(); return page;
}
async function activateKeyboard(page, locator, key = 'Enter') { await locator.focus(); await page.keyboard.press(key); }
async function openDetails(page, locator) { if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary')); }
async function closeDetails(page, locator) { if (await locator.evaluate(element => element.open)) await activateKeyboard(page, locator.locator(':scope > summary')); }
async function focusId(page, id) { await page.waitForFunction(expected => document.activeElement?.id === expected, id); equal(await page.locator('#' + id).count(), 1, 'Focus target has exactly one document id: ' + id); }
async function selectKeyboard(page, id, value) {
  const select = page.locator('#' + id), options = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value)), index = options.indexOf(value);
  assert(index >= 0, id + ' offers native option ' + value); await select.focus(); await page.keyboard.press('Home');
  for (let at = 0; at < index; at++) await page.keyboard.press('ArrowDown'); equal(await select.inputValue(), value, id + ' native keyboard selects ' + value);
  assert(await select.evaluate(element => element === document.activeElement), 'Native selection retains keyboard focus');
}
async function selectedMonth(page) {
  const selected = await explorer(page).locator('.aq-season-months > button').evaluateAll(nodes => nodes.map((node, index) => node.getAttribute('aria-pressed') === 'true' ? index : -1).filter(index => index >= 0));
  equal(selected.length, 1, 'Exactly one modeled month is selected'); return selected[0];
}
async function selectMonth(page, month) { await activateKeyboard(page, explorer(page).locator('.aq-season-months > button').nth(month)); equal(await selectedMonth(page), month, 'Native month action selects ' + months[month]); }
function captureSignature(note) { const copy = { ...note }; delete copy.id; delete copy.capturedAt; return JSON.stringify(copy); }
function reading(note) {
  function side(state, value) { return state === 'recorded' ? value + note.unit : state === 'not-stocked' ? 'not stocked' : state === 'not-applicable' ? 'not applicable' : 'not recorded'; }
  let text = note.aState === 'no-baseline' ? 'B ' + side(note.bState, note.b) + ' (no A captured)' : 'A ' + side(note.aState, note.a) + ' → B ' + side(note.bState, note.b);
  if (note.aState === 'recorded' && note.bState === 'recorded') { const delta = Number((note.b - note.a).toFixed(3)); text += '; ' + (delta > 0 ? '+' : '') + delta + note.deltaUnit + ' (B minus A)'; }
  return text;
}
async function expectedFor(page, selection) {
  return page.evaluate(({ key, selection }) => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
    const preview = h.ecosystemMeasurement(ws, selection, 1, 'expected-preview');
    return { preview, readiness: h.ecosystemCaptureReadiness(preview, ws.measurements), notes: ws.measurements,
      aRun: ws.baselineScenario ? h.simulateEcosystemYear(ws.baselineScenario) : null, bRun: h.simulateEcosystemYear(ws), modelVersion: h.ecosystemModelVersion };
  }, { key: storageKey, selection });
}
async function checkPanel(page, scope, selection, state, label) {
  const expected = await expectedFor(page, selection), target = panel(page, scope), text = await target.innerText();
  const match = expected.preview ? expected.notes.find(note => captureSignature(note) === captureSignature(expected.preview)) : null;
  const independentState = !expected.preview ? 'unavailable' : match ? 'captured' : expected.notes.length >= 8 ? 'full' : 'ready';
  equal(independentState, state, label + ' readiness follows independent exact-preview signature and valid notebook capacity');
  equal(await target.getAttribute('data-capture-state'), state, label + ' panel exposes exact readiness state');
  equal(expected.readiness.state, state, label + ' visible state agrees with the pure helper');
  equal(expected.readiness.count, expected.notes.length, label + ' helper count uses the valid live notebook');
  equal(expected.readiness.limit, 8, label + ' helper keeps the existing eight-reading limit');
  equal(expected.readiness.remaining, Math.max(0, 8 - expected.notes.length), label + ' helper reports exact remaining space');
  equal(expected.readiness.duplicateId, match ? match.id : '', label + ' helper identifies the exact live match');
  assert(await target.evaluate(element => element.classList.contains('aq-capture-readiness')), label + ' uses the shared capture-readiness panel');
  equal(await recordButton(page, scope).isEnabled(), state !== 'unavailable', label + ' keeps duplicate/full record handlers available and disables only unavailable capture');
  const refs = (await recordButton(page, scope).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const prefix = 'aq-' + (scope === 'annual' ? 'annual' : 'month');
  assert(refs.includes(prefix + '-capture-readiness-status') && refs.includes(scope === 'annual' ? 'aq-measurement-annual-preview' : 'aq-month-capture-preview'), label + ' record control is described by its exact numeric preview and readiness status');
  for (const ref of refs) equal(await page.locator('#' + ref).count(), 1, label + ' button description resolves exactly once: ' + ref);
  if (expected.preview) {
    equal(await target.locator('.aq-capture-selection').innerText(), expected.readiness.heading, label + ' selected-source heading matches the existing measurement heading');
    equal(await target.locator('.aq-capture-preview').innerText(), reading(expected.preview), label + ' numeric preview uses the exact existing reading format');
    assert(text.includes(reading(expected.preview)), label + ' preview displays the exact frozen-reading format, signed delta and original units');
    assert(text.includes(expected.preview.metricLabel), label + ' preview names the selected measurement');
    assert(text.includes(scope === 'annual' ? 'Annual model' : months[selection.month] + ' model'), label + ' preview names the exact annual/monthly source');
    if (scope === 'month') {
      const pointB = expected.preview.speciesId === 'system' ? expected.bRun.timeline[selection.month] : expected.bRun.timeline[selection.month].species.find(item => item.id === expected.preview.speciesId);
      equal(expected.preview.b, pointB ? pointB[selection.metricId] : null, label + ' B preview matches the actual selected helper timeline value');
    } else {
      if (expected.preview.bState === 'recorded') equal(expected.preview.b, expected.bRun.summary[selection.metricId], label + ' annual B preview matches its actual helper summary');
      if (expected.preview.aState === 'recorded') equal(expected.preview.a, expected.aRun.summary[selection.metricId], label + ' annual A preview matches its actual helper summary');
    }
  } else {
    equal(state, 'unavailable', label + ' missing numeric capture is explicitly unavailable');
    equal(await target.getByRole('button').count(), 0, label + ' unavailable preview offers no irrelevant review action');
    assert(!/A -?\d+(?:\.\d+)?|B -?\d+(?:\.\d+)?/.test(text), label + ' unavailable preview does not manufacture numeric A/B values');
  }
  if (state === 'ready') { assert(text.includes(expected.notes.length + '/8'), label + ' ready preview exposes its live notebook count'); assert(/space|available|remaining/i.test(text), label + ' ready preview explains remaining notebook space'); }
  if (state === 'captured') { equal(await target.getByRole('button', { name: 'Review matching capture', exact: true }).count(), 1, label + ' captured preview has its specific live-row review action'); assert(/already|not.*add|captured/i.test(text), label + ' duplicate preview explains that it will not add another row'); }
  if (state === 'full') { equal(await target.getByRole('button', { name: 'Review notebook space', exact: true }).count(), 1, label + ' full preview offers notebook-space review'); assert(/8\/8|full/i.test(text), label + ' full preview explains the eight-reading capacity'); }
  for (const button of await target.getByRole('button').all()) assert(!(await button.evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' interactive review action sits outside the status announcement');
  assert(!text.includes('1970-01-01') && !text.includes('capture-preview') && !text.includes('expected-preview'), label + ' panel does not present its internal fixed preview metadata as a recorded capture');
  return expected;
}
async function reviewMatch(page, scope, note, label) {
  const before = await workspace(page); await closeDetails(page, notebook(page));
  await activateKeyboard(page, panel(page, scope).getByRole('button', { name: 'Review matching capture', exact: true }));
  await focusId(page, 'aq-live-measurement-' + note.id);
  equal(await row(page, note.id).locator('h4').getAttribute('tabindex'), '-1', label + ' live matching row heading is programmatically focusable');
  assert(await notebook(page).evaluate(element => element.open), label + ' keyboard review opens the live native notebook');
  assert(await page.locator('#aq-live-measurement-' + note.id).evaluate(element => !!element.closest('details.aq-measurement-notebook:not(.aq-measurement-archive)')), label + ' keyboard review targets the live row even when an archived reading has the same id');
  equal(await workspace(page), before, label + ' direct-row review changes no captured values, settings, writing or saved evidence');
}
async function captureFresh(page, scope, expected, label) {
  const before = await workspace(page), ids = new Set(before.measurements.map(item => item.id)); await activateKeyboard(page, recordButton(page, scope)); await focusId(page, 'aq-measurement-notebook-heading');
  const after = await workspace(page), note = after.measurements.find(item => !ids.has(item.id));
  assert(note && after.measurements.length === before.measurements.length + 1, label + ' records one fresh preview');
  for (const key of ['scope', 'month', 'metricId', 'speciesId', 'metricLabel', 'unit', 'deltaUnit', 'aState', 'bState', 'a', 'b', 'modelVersion', 'baselineScenario', 'currentScenario', 'aEvent', 'bEvent']) equal(note[key], expected.preview[key], label + ' captures exact current preview field ' + key);
  equal(after.measurements.filter(item => ids.has(item.id)), before.measurements, label + ' keeps every earlier captured reading frozen');
  equal(inputsOf(after), inputsOf(before), label + ' leaves live scenario inputs unchanged');
  for (const key of ['baselineScenario', 'prediction', 'observation', 'evidence', 'experiments', 'investigationId', 'parkedDraft']) equal(after[key], before[key], label + ' preserves learner and archived work: ' + key);
  fs.writeFileSync(path.join(out, label + '-reading.json'), JSON.stringify(note, null, 2)); return note;
}
async function blockedRecord(page, scope, label) {
  const before = await workspace(page); assert(await recordButton(page, scope).isEnabled(), label + ' handler can still be invoked'); await activateKeyboard(page, recordButton(page, scope));
  equal(await workspace(page), before, label + ' record handler creates no duplicate/full ghost row and preserves the whole workspace');
}
async function reflow(page, label) { const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size)); }
async function axeAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const audit = await page.evaluate(async () => {
    const value = await axe.run({ include: ['.aq-capture-readiness', 'h4[id^="aq-live-measurement-"]'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  }); fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2)); assert(audit.violations.length === 0, label + ' WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function screenshotAndAudit(page, label, origin, forced = false) {
  await reflow(page, label); await axeAudit(page, label, origin);
  const sizes = await page.locator('.aq-capture-readiness button').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of sizes) assert(item.height >= 43.5, 'Capture-readiness review controls have a 44px minimum height: ' + JSON.stringify(item));
  await annualContainer(page).screenshot({ path: path.join(out, label + '-annual.png') }); await inspection(page).screenshot({ path: path.join(out, label + '-month.png') });
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await reflow(page, label + ' forced colors'); await axeAudit(page, label + '-forced-colors', origin);
    await annualContainer(page).screenshot({ path: path.join(out, label + '-annual-forced-colors.png') }); await inspection(page).screenshot({ path: path.join(out, label + '-month-forced-colors.png') });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  }
}
async function actualFixtures(bootstrap) {
  return bootstrap.evaluate(({ baseline, changed, writing, time }) => {
    const h = window.AquacultureLearningHelpers, ws = { ...changed, baselineScenario: baseline }, aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(changed), model = h.calculateEcosystem(changed);
    const sharedNote = h.ecosystemMeasurement(ws, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 3600000, 'live-and-archived-oxygen');
    const originalRecord = { id: 'original-capture-investigation', title: 'Earlier oyster and kelp investigation', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion,
      environmentId: changed.environmentId, organisms: changed.organisms, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience,
      baselineScenario: baseline, currentScenario: changed, baselineSummary: aRun.summary, currentSummary: bRun.summary,
      prediction: 'The oxygen input may change the seasonal pattern.', observation: 'This earlier frozen record includes a reading whose id is also in the current notebook.', evidence: writing, measurements: [sharedNote] };
    const parked = { ...baseline, water: { ...baseline.water, oxygen: 7.4 }, baselineScenario: null };
    const parkedNote = h.ecosystemMeasurement(parked, { scope: 'month', month: 2, metricId: 'oxygen', speciesId: 'system' }, time - 7200000, 'parked-march-reading');
    const workspace = { ...changed, baselineScenario: baseline,
      prediction: 'An input change may affect the selected reading; I will keep its original settings.',
      observation: 'This unfinished reflection and structured writing must remain while I capture and review readings.', evidence: writing,
      measurements: [sharedNote], experiments: [originalRecord], investigationId: '',
      parkedDraft: { ...parked, prediction: 'Return to this lower-oxygen draft later.', observation: 'The parked draft and its captured reading must survive readiness navigation.', evidence: { claim: 'Investigate a lower oxygen reference.', evidence: '', reasoning: '', nextTest: '' }, measurements: [parkedNote], investigationId: '' } };
    const full = { ...workspace, measurements: [0,1,2,3,4,5,7,8].map(month => h.ecosystemMeasurement(ws, { scope: 'month', month, metricId: 'oxygen', speciesId: 'system' }, time - (month + 1) * 60000, 'capacity-month-' + month)) };
    const monthSelection = { scope: 'month', month: 6, metricId: 'temperature', speciesId: 'system' };
    const earlierSettings = h.ecosystemMeasurement({ ...ws, water: { ...ws.water, oxygen: 8.6 } }, monthSelection, time - 120000, 'same-temperature-earlier-settings');
    // Values come from the actual current helper. Relabel only provenance to
    // exercise the version distinction without inventing an earlier model run.
    const earlierModel = { ...h.ecosystemMeasurement(ws, monthSelection, time - 180000, 'same-temperature-earlier-model'), modelVersion: 'qa-earlier-model' };
    return { seed: { lastTopic: 'ecosystem', ecosystemWorkspace: workspace }, full: { lastTopic: 'ecosystem', ecosystemWorkspace: full }, differing: { lastTopic: 'ecosystem', ecosystemWorkspace: { ...workspace, measurements: [earlierSettings, earlierModel] } } };
  }, { baseline, changed, writing, time: baseTime });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    const bootstrapErrors = [], bootstrap = await openSeeded(browser, url, 1280, seedFor(), bootstrapErrors), fixtures = await actualFixtures(bootstrap); await bootstrap.close();
    assert(fixtures.seed.ecosystemWorkspace.measurements.every(Boolean) && fixtures.full.ecosystemWorkspace.measurements.length === 8 && fixtures.full.ecosystemWorkspace.measurements.every(Boolean), 'Actual helper generated valid seeded and eight-capacity readings');
    assert(bootstrapErrors.length === 0, 'Fixture bootstrap runtime errors: ' + bootstrapErrors.join('; '));
    for (const width of [1280, 390, 320]) {
      console.log('Capture-readiness QA: annual and monthly at ' + width);
      const errors = [], page = await openSeeded(browser, url, width, fixtures.seed, errors); await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await workspace(page), existing = before.measurements[0];
      await checkPanel(page, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'captured', 'Annual duplicate at ' + width);
      equal(await page.locator('.aq-measurement-archive .aq-measurement-row[data-measurement-id="' + existing.id + '"]').count(), 1, 'Fixture includes a genuine saved captured reading with the same id as the live match');
      await reviewMatch(page, 'annual', existing, 'Annual same-id live review at ' + width);
      await blockedRecord(page, 'annual', 'Annual duplicate handler at ' + width);
      await selectKeyboard(page, 'aq-measurement-annual-metric', 'peakAmmonia');
      const annual = await checkPanel(page, 'annual', { scope: 'annual', metricId: 'peakAmmonia', speciesId: 'system' }, 'ready', 'Annual metric refresh at ' + width);
      await screenshotAndAudit(page, 'sample-annual-ready-' + width, origin, width === 320);
      const annualNote = await captureFresh(page, 'annual', annual, 'annual-peak-ammonia-' + width);
      await checkPanel(page, 'annual', { scope: 'annual', metricId: 'peakAmmonia', speciesId: 'system' }, 'captured', 'Annual after capture at ' + width);
      await reviewMatch(page, 'annual', annualNote, 'Annual fresh-row review at ' + width);
      await selectKeyboard(page, 'aq-season-species', 'oyster'); await selectKeyboard(page, 'aq-season-metric', 'oxygen');
      await selectMonth(page, 2);
      const march = await checkPanel(page, 'month', { scope: 'month', month: 2, metricId: 'oxygen', speciesId: 'oyster' }, 'ready', 'Monthly selection refresh at ' + width);
      equal(march.preview.speciesId, 'system', 'Following oyster preserves shared system water capture semantics');
      await openDetails(page, explorer(page).locator('details.aq-season-landmarks'));
      await activateKeyboard(page, explorer(page).getByRole('button', { name: 'Inspect lowest B value', exact: true })); await focusId(page, 'aq-season-month-heading');
      const month = await selectedMonth(page), monthly = await checkPanel(page, 'month', { scope: 'month', month, metricId: 'oxygen', speciesId: 'oyster' }, 'ready', 'Landmark-driven preview at ' + width);
      equal(inputsOf(await workspace(page)), inputsOf(before), 'Month/species/landmark changes preserve scenario inputs');
      await screenshotAndAudit(page, 'sample-month-ready-' + width, origin, width === 320);
      const monthNote = await captureFresh(page, 'month', monthly, 'monthly-oxygen-' + width);
      await checkPanel(page, 'month', { scope: 'month', month, metricId: 'oxygen', speciesId: 'oyster' }, 'captured', 'Monthly after capture at ' + width);
      await reviewMatch(page, 'month', monthNote, 'Monthly direct live-row review at ' + width); await blockedRecord(page, 'month', 'Monthly duplicate handler at ' + width);
      await screenshotAndAudit(page, 'sample-captured-preview-' + width, origin, width === 320);
      const after = await workspace(page); await page.reload(); await panel(page, 'annual').waitFor(); equal(await workspace(page), after, 'Readiness previews and review never change frozen work across reload');
      assert(errors.length === 0, 'Annual/monthly runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ case: 'annual/month readiness and direct-row review', width, checks: ['actual current-model preview source/reading/units/delta precision', 'annual metric refresh', 'native month/species and landmark preview refresh', 'ready count and capacity guidance', 'new capture focuses notebook heading', 'duplicate record handlers preserve all work', 'keyboard review focuses exact live h4 despite same archived id', 'preserved inputs/writing/archives/parked draft and reload', 'scoped axe, reflow, reduced motion and 44px targets', ...(width === 320 ? ['forced colors'] : [])], errors }); await page.close();
    }

    {
      const availability = [];
      const onlyASeed = clone(fixtures.seed); onlyASeed.ecosystemWorkspace.organisms = { kelp: 1, nitrifiers: 1 }; onlyASeed.ecosystemWorkspace.measurements = [];
      const errors = [], page = await openSeeded(browser, url, 320, onlyASeed, errors);
      await selectKeyboard(page, 'aq-season-species', 'oyster'); await selectKeyboard(page, 'aq-season-metric', 'progress'); await selectMonth(page, 6);
      const onlyA = await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'progress', speciesId: 'oyster' }, 'ready', 'A-only species capture');
      equal(onlyA.preview.aState, 'recorded', 'A-only species retains its actual A numeric value'); equal(onlyA.preview.bState, 'not-stocked', 'Absent B species is not turned into zero');
      const onlyANote = await captureFresh(page, 'month', onlyA, 'a-only-oyster-progress-320');
      await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'progress', speciesId: 'oyster' }, 'captured', 'A-only species after capture'); await reviewMatch(page, 'month', onlyANote, 'A-only direct review');
      await selectKeyboard(page, 'aq-season-metric', 'oxygen');
      const water = await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'oyster' }, 'ready', 'Shared water following absent B species');
      equal(water.preview.speciesId, 'system', 'Absent followed B species does not make shared oxygen unavailable'); equal(water.preview.bState, 'recorded', 'Shared oxygen uses the actual B system value');
      await screenshotAndAudit(page, 'sample-one-sided-species-320', origin, true); availability.push({ case: 'A-only progress and shared water', errors }); await page.close();

      const noCropSeed = clone(fixtures.seed); Object.assign(noCropSeed.ecosystemWorkspace, { organisms: { nitrifiers: 1 }, baselineScenario: null, measurements: [] });
      const noCropErrors = [], noCrop = await openSeeded(browser, url, 320, noCropSeed, noCropErrors);
      await selectKeyboard(noCrop, 'aq-season-species', 'system'); await selectKeyboard(noCrop, 'aq-season-metric', 'survival'); await selectMonth(noCrop, 6);
      const unavailable = await checkPanel(noCrop, 'month', { scope: 'month', month: 6, metricId: 'survival', speciesId: 'system' }, 'unavailable', 'No applicable B crop survival'); equal(unavailable.preview, null, 'No numeric side means no capturable reading');
      await selectKeyboard(noCrop, 'aq-measurement-annual-metric', 'survival'); await checkPanel(noCrop, 'annual', { scope: 'annual', metricId: 'survival', speciesId: 'system' }, 'unavailable', 'No applicable annual crop survival');
      const absent = await noCrop.evaluate(key => { const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace); const preview = h.ecosystemMeasurement(ws, { scope: 'month', month: 6, metricId: 'progress', speciesId: 'oyster' }); return { preview, readiness: h.ecosystemCaptureReadiness(preview, ws.measurements) }; }, storageKey);
      equal(absent.preview, null, 'No A plus B-not-stocked species has no fabricated numeric preview'); equal(absent.readiness.state, 'unavailable', 'Pure readiness exposes the no-A/B-not-stocked unavailable state');
      await screenshotAndAudit(noCrop, 'sample-unavailable-capture-320', origin, true); assert(noCropErrors.length === 0 && errors.length === 0, 'Availability runtime errors'); availability.push({ case: 'monthly/annual unavailable and no-A absent species helper', errors: noCropErrors }); await noCrop.close();
      results.push({ case: 'capture applicability and one-sided readings', width: 320, checks: ['A-only species with numeric A is capturable', 'B absence stays not-stocked', 'shared water remains system while following absent B species', 'no-A and no numeric side is unavailable', 'monthly and annual unavailable controls disabled', 'no invented numeric reading or irrelevant review action', 'exact live-row focus', 'scoped axe/reflow/forced colors'], availability });
    }

    {
      const errors = [], page = await openSeeded(browser, url, 320, fixtures.differing, errors);
      await selectKeyboard(page, 'aq-season-species', 'system'); await selectKeyboard(page, 'aq-season-metric', 'temperature'); await selectMonth(page, 6);
      const expected = await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'temperature', speciesId: 'system' }, 'ready', 'Equal values with different settings/model provenance');
      for (const note of expected.notes) { equal([note.a, note.b], [expected.preview.a, expected.preview.b], 'Earlier settings/model fixture has the same actual numeric values'); assert(captureSignature(note) !== captureSignature(expected.preview), 'Matching values alone do not duplicate differing settings/model provenance'); }
      const note = await captureFresh(page, 'month', expected, 'equal-values-distinct-provenance-320');
      await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'temperature', speciesId: 'system' }, 'captured', 'Current provenance after capture'); await reviewMatch(page, 'month', note, 'Current provenance exact review');
      await screenshotAndAudit(page, 'sample-distinct-provenance-320', origin, true); assert(errors.length === 0, 'Distinct provenance runtime errors: ' + errors.join('; ')); await page.close();
      const noASeed = clone(fixtures.seed); Object.assign(noASeed.ecosystemWorkspace, { baselineScenario: null, measurements: [] });
      const noAErrors = [], noA = await openSeeded(browser, url, 320, noASeed, noAErrors);
      const noAExpected = await checkPanel(noA, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'ready', 'No-A annual preview');
      equal(noAExpected.preview.aState, 'no-baseline', 'No-A capture source explicitly preserves the absence of A'); const noANote = await captureFresh(noA, 'annual', noAExpected, 'no-a-annual-reading-320');
      const beforeA = await workspace(noA); await activateKeyboard(noA, noA.getByRole('button', { name: 'Save current as scenario A', exact: true }));
      const afterA = await workspace(noA); equal(afterA.baselineScenario, inputsOf(beforeA), 'New A uses the actual complete current scenario'); equal(afterA.measurements, beforeA.measurements, 'Adding A does not relabel the existing no-A capture');
      const withA = await checkPanel(noA, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'ready', 'New-A annual preview is distinct');
      equal(withA.preview.b, noANote.b, 'Adding A keeps the same B annual value'); equal(withA.preview.aState, 'recorded', 'New preview has its own recorded A'); assert(captureSignature(withA.preview) !== captureSignature(noANote), 'New-A context is not a duplicate of a no-A reading');
      await captureFresh(noA, 'annual', withA, 'new-a-distinct-annual-reading-320'); await screenshotAndAudit(noA, 'sample-new-a-capture-320', origin);
      assert(noAErrors.length === 0, 'No-A/new-A runtime errors: ' + noAErrors.join('; ')); await noA.close();
      results.push({ case: 'same values with distinct provenance and new A', width: 320, checks: ['actual equal temperature values with earlier settings/model are distinct captures', 'current provenance review targets current row', 'no-A annual capture is allowed', 'adding A keeps previous no-A context frozen', 'new A/B context is a fresh capture despite same B value', 'exact numeric context and protected-work preservation', 'scoped axe/reflow/forced colors'], errors, noAErrors });
    }

    {
      const errors = [], page = await openSeeded(browser, url, 320, fixtures.full, errors), before = await workspace(page);
      equal(before.measurements.length, 8, 'Full fixture contains eight distinct actual helper-model readings');
      await checkPanel(page, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'full', 'Full annual preview');
      await selectKeyboard(page, 'aq-season-species', 'system'); await selectKeyboard(page, 'aq-season-metric', 'oxygen'); await selectMonth(page, 6);
      await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, 'full', 'Full monthly preview');
      for (const scope of ['annual', 'month']) { await activateKeyboard(page, panel(page, scope).getByRole('button', { name: 'Review notebook space', exact: true })); await focusId(page, 'aq-measurement-notebook-heading'); assert(await notebook(page).evaluate(element => element.open), 'Full review opens the native notebook'); await blockedRecord(page, scope, 'Full ' + scope + ' handler'); }
      equal(await workspace(page), before, 'Full guidance and handlers preserve every frozen row and complete learner work');
      await screenshotAndAudit(page, 'sample-full-notebook-320', origin, true);
      await selectMonth(page, 0); await checkPanel(page, 'month', { scope: 'month', month: 0, metricId: 'oxygen', speciesId: 'system' }, 'captured', 'Existing match takes precedence at full capacity');
      await reviewMatch(page, 'month', before.measurements[0], 'Full-capacity matching row');
      await selectMonth(page, 6); await openDetails(page, notebook(page));
      await activateKeyboard(page, row(page, before.measurements[0].id).getByRole('button', { name: /^Remove reading:/ })); await focusId(page, 'aq-measurement-notebook-heading');
      const afterRemove = await workspace(page); equal(afterRemove.measurements, before.measurements.slice(1), 'Removing one live row leaves all seven other captured readings exact');
      for (const key of ['prediction', 'observation', 'evidence', 'experiments', 'parkedDraft']) equal(afterRemove[key], before[key], 'Making notebook space preserves writing and saved/parked work: ' + key);
      const nowReady = await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, 'ready', 'Removal creates one preview space'); await checkPanel(page, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'ready', 'Removal refreshes annual space');
      await captureFresh(page, 'month', nowReady, 'refilled-july-reading-320'); equal((await workspace(page)).measurements.length, 8, 'Ready preview can refill exactly the released space');
      await checkPanel(page, 'month', { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, 'captured', 'New match at refilled capacity'); await checkPanel(page, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, 'full', 'Other uncaptured source is full after refill');
      await screenshotAndAudit(page, 'sample-refilled-notebook-320', origin); assert(errors.length === 0, 'Full capacity runtime errors: ' + errors.join('; '));
      results.push({ case: 'capacity, matching precedence and released space', width: 320, checks: ['eight actual distinct notes', 'annual/month full guidance and enabled safe handlers', 'keyboard notebook-space focus', 'matching capture takes precedence over full', 'remove leaves remaining frozen rows and archived writing intact', 'both panels refresh ready at 7/8', 'fresh capture refills one space', 'new match versus other full source', 'scoped axe/reflow/forced colors'], errors }); await page.close();
    }

    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2)); console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error; }
  finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
