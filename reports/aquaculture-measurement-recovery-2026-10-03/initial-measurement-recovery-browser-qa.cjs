/* Author-only browser QA. Root executes this frozen taskscript after unit checks. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = path.join(__dirname, 'aquaculture/measurement-recovery-browser');
const storageKey = 'aquacultureLab.state.v1', results = [];
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
  if (url.pathname === '/qa/aquacultureLab') { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(harness({ id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' })); return; }
  const item = files[url.pathname]; if (!item) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', item.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(repo, item)));
});
const baseline = { environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'heatwave' };
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const writing = { claim: 'A small oxygen change may alter the seasonal minimum.', evidence: '  My original cited evidence stays exact.\n\n  ', reasoning: 'Compare the frozen A and B readings and preserve their original settings.', nextTest: 'Change one input and inspect the monthly result.' };
const baseTime = Date.UTC(2026, 9, 3, 17), fixedRandom = .12345;
const fixedId = 'm-' + baseTime.toString(36) + '-' + fixedRandom.toString(36).slice(2, 7);
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) { assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual)); }
function seedFor() { return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...changed, baselineScenario: baseline, prediction: 'Inspect a frozen reading before changing my explanation.', observation: 'This original reflection stays exact while I remove and restore captured readings.', evidence: writing, measurements: [], experiments: [], investigationId: '' } }; }
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const tray = page => page.locator('details.aq-measurement-recovery');
const liveRow = (page, id) => notebook(page).locator('.aq-measurement-row[data-measurement-id="' + id + '"]');
const removedRow = (page, key) => tray(page).locator('.aq-removed-measurement[data-removed-key="' + key + '"]');
const restoreButton = (page, key) => removedRow(page, key).getByRole('button', { name: /^Restore reading:/ });
async function workspace(page) { return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey); }
async function rawState(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
async function keys(page) { return tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))); }
async function keyboard(page, control, key = 'Enter') { await control.focus(); await page.keyboard.press(key); }
async function openDetails(page, target) { if (!(await target.evaluate(element => element.open))) await keyboard(page, target.locator(':scope > summary')); }
async function focused(page, id) { await page.waitForFunction(id => document.activeElement && document.activeElement.id === id, id); equal(await page.locator('#' + id).count(), 1, 'Focus target is a unique document id: ' + id); }
async function openSeeded(browser, url, seed, errors, width = 390) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }); page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url); await notebook(page).waitFor(); await openDetails(page, notebook(page)); return page;
}
function preserveExceptMeasurements(after, before, label) { equal({ ...after, measurements: before.measurements }, before, label + ' preserves settings, A, prediction, reflection, structured writing, archive and parked draft'); }
async function remove(page, id, options = {}) {
  const before = options.memory ? null : await workspace(page), oldKeys = await keys(page), heading = await liveRow(page, id).locator('h4').innerText(), reading = await liveRow(page, id).locator('.aq-measurement-reading').innerText();
  const note = before && before.measurements.find(item => item.id === id), index = before && before.measurements.findIndex(item => item.id === id);
  await keyboard(page, liveRow(page, id).getByRole('button', { name: /^Remove reading:/ })); await focused(page, 'aq-measurement-notebook-heading');
  equal(await liveRow(page, id).count(), 0, 'Removal removes only the selected live reading'); await tray(page).waitFor();
  const afterKeys = await keys(page), fresh = afterKeys.filter(key => !oldKeys.includes(key)); equal(fresh.length, 1, 'Every removal gets one fresh transient key');
  const key = fresh[0]; assert(/^removed-\d+$/.test(key), 'Recovery key uses a separate transient namespace'); await openDetails(page, tray(page));
  if (before) { const after = await workspace(page); equal(after.measurements, before.measurements.filter(item => item.id !== id), 'Removal preserves the exact canonical remaining rows and order'); preserveExceptMeasurements(after, before, 'Removal'); }
  return { key, heading, reading, note, index };
}
async function checkRemoved(page, removed, state, label) {
  const target = removedRow(page, removed.key), statusId = 'aq-recovery-status-' + removed.key;
  equal(await target.locator('h5').innerText(), removed.heading, label + ' keeps its original heading'); equal(await target.locator('.aq-measurement-reading').innerText(), removed.reading, label + ' keeps its original plain A/B reading and units');
  if (removed.note) equal(await target.locator('.aq-measurement-meta').innerText(), 'Model ' + removed.note.modelVersion + ' · Captured ' + new Date(removed.note.capturedAt).toISOString(), label + ' keeps full original model and ISO capture date');
  equal(await page.locator('#' + statusId).count(), 1, label + ' status id is unique despite archive collisions');
  equal(await target.locator('#' + statusId).getAttribute('role'), null, label + ' status remains plain descriptive text'); equal(await target.locator('#' + statusId).getAttribute('aria-live'), null, label + ' status creates no repeated live announcements');
  equal(await restoreButton(page, removed.key).getAttribute('aria-label'), 'Restore reading: ' + removed.heading, label + ' restore accessible name includes the exact original heading');
  const refs = (await restoreButton(page, removed.key).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); assert(refs.includes(statusId), label + ' restore is described by its own status');
  for (const ref of refs) equal(await page.locator('#' + ref).count(), 1, label + ' description resolves once: ' + ref);
  equal(await restoreButton(page, removed.key).isEnabled(), state === 'ready', label + ' restore is enabled only when ready');
  const text = await target.locator('#' + statusId).innerText();
  const snippets = { ready: 'Ready to restore.', full: 'Notebook full at 8 readings.', conflict: 'A different reading uses this identifier.', 'already-present': 'A matching reading is already in the notebook.', unavailable: 'cannot be restored' };
  assert(text.includes(snippets[state]), label + ' visible status describes the exact guarded state');
  if (removed.note) {
    const result = await page.evaluate(({ key, removed }) => { const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace); return h.restoreEcosystemMeasurement(ws.measurements, removed); }, { key: storageKey, removed: { note: removed.note, index: removed.index } });
    equal(result.state, state, label + ' public restore helper matches live state'); equal(result.ok, state === 'ready', label + ' guarded helper readiness is exact');
    const ws = await workspace(page); equal(result.count, ws.measurements.length, label + ' count describes the current notebook'); equal(result.remaining, 8 - ws.measurements.length, label + ' remaining describes current capacity'); equal(result.limit, 8, label + ' notebook limit is unchanged');
    if (state === 'ready') assert(text.includes('Notebook ' + result.count + '/8; ' + result.remaining + ' space'), label + ' visible status gives exact current budget');
    fs.writeFileSync(path.join(out, label + '-state.json'), JSON.stringify({ removed, result }, null, 2));
  }
  for (const control of await target.getByRole('button').all()) assert(!(await control.evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' recovery controls stay outside status/live announcements');
  equal(await target.locator('textarea,input,select').count(), 0, label + ' frozen recovery rows provide no editing controls');
}
async function restore(page, removed, label) {
  const before = await workspace(page), beforeKeys = await keys(page), position = Math.min(removed.index, before.measurements.length), expected = before.measurements.slice(); expected.splice(position, 0, removed.note);
  await keyboard(page, restoreButton(page, removed.key)); await focused(page, 'aq-live-measurement-' + removed.note.id);
  assert(await notebook(page).evaluate(element => element.open), label + ' restored live notebook is open');
  const after = await workspace(page); equal(after.measurements, expected, label + ' restores exact canonical note at clamped original index and preserves every current row in order'); preserveExceptMeasurements(after, before, label);
  equal(await keys(page), beforeKeys.filter(key => key !== removed.key), label + ' removes only the selected tray entry');
  equal(await liveRow(page, removed.note.id).locator('h4').innerText(), removed.heading, label + ' new live heading keeps its captured label');
  equal(await liveRow(page, removed.note.id).locator('.aq-measurement-reading').innerText(), removed.reading, label + ' new live row keeps exact frozen A/B values'); return after;
}
async function review(page, removed, name, targetId, label) { const before = await workspace(page), beforeKeys = await keys(page); await keyboard(page, removedRow(page, removed.key).getByRole('button', { name, exact: true })); await focused(page, targetId); equal(await workspace(page), before, label + ' review changes no work'); equal(await keys(page), beforeKeys, label + ' review preserves the original removed reading'); }
async function reflow(page, label) { const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width, label + ' has no horizontal page overflow: ' + JSON.stringify(size)); }
async function audit(page, label, origin, id) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const data = await page.evaluate(async id => { const include = ['.aq-measurement-recovery']; if (id) include.push('#aq-live-measurement-' + id); const result = await axe.run({ include }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: result.incomplete.map(item => item.id) }; }, id || null);
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(data, null, 2)); assert(data.violations.length === 0, label + ' scoped WCAG A/AA: ' + JSON.stringify(data.violations));
}
async function visual(page, label, origin, id, forced = false) {
  if (await tray(page).count()) await openDetails(page, tray(page)); await reflow(page, label); await audit(page, label, origin, id);
  if (await tray(page).count()) {
    const sizes = await tray(page).locator('button,summary').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label') || node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
    for (const item of sizes) assert(item.height >= 43.5 && item.width >= 43.5, label + ' recovery controls have 44px minimum targets: ' + JSON.stringify(item));
    await tray(page).screenshot({ path: path.join(out, label + '-tray.png') });
  }
  if (id) { await focused(page, 'aq-live-measurement-' + id); await liveRow(page, id).screenshot({ path: path.join(out, label + '-restored-focus.png') }); }
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await reflow(page, label + ' forced colors'); await audit(page, label + '-forced-colors', origin, id);
    if (await tray(page).count()) await tray(page).screenshot({ path: path.join(out, label + '-tray-forced-colors.png') });
    if (id) {
      const paint = await liveRow(page, id).locator('h4').evaluate(element => { const s = getComputedStyle(element); return { focused: element === document.activeElement, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, text: s.color, background: s.backgroundColor }; });
      assert(paint.focused && paint.outlineStyle !== 'none' && parseFloat(paint.outlineWidth) > 0, label + ' restored heading keeps a visible forced-color focus outline'); fs.writeFileSync(path.join(out, label + '-focus-paint.json'), JSON.stringify(paint, null, 2));
      await liveRow(page, id).screenshot({ path: path.join(out, label + '-restored-focus-forced-colors.png') });
    }
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  }
}
async function setMetric(page, value) { await page.locator('#aq-measurement-annual-metric').selectOption(value); }
async function captureAnnual(page, metric) { const before = await workspace(page); if (metric) await setMetric(page, metric); await keyboard(page, page.getByRole('button', { name: 'Record annual result', exact: true })); const after = await workspace(page), added = after.measurements.filter(note => !before.measurements.some(old => old.id === note.id)); equal(added.length, 1, 'Actual annual model capture adds exactly one new live note'); preserveExceptMeasurements(after, before, 'Later annual capture'); return added[0]; }
async function fixedCapture(page, metric) {
  await page.evaluate(({ time, random }) => { window.__qaRealDateNow = Date.now; window.__qaRealRandom = Math.random; Date.now = () => time; Math.random = () => random; }, { time: baseTime, random: fixedRandom });
  try { return await captureAnnual(page, metric); } finally { await page.evaluate(() => { Date.now = window.__qaRealDateNow; Math.random = window.__qaRealRandom; }); }
}
async function home(page) { await keyboard(page, page.locator('.aq-primary-nav').getByRole('button', { name: 'Home', exact: true })); await page.locator('details.aq-portfolio-tools').waitFor(); await openDetails(page, page.locator('details.aq-portfolio-tools')); }
async function ecosystem(page) { await keyboard(page, page.locator('.aq-primary-nav').getByRole('button', { name: 'Ecosystem builder', exact: true })); await notebook(page).waitFor(); await openDetails(page, notebook(page)); if (await tray(page).count()) await openDetails(page, tray(page)); }
async function download(page, name, file) { const waiting = page.waitForEvent('download'); await keyboard(page, page.getByRole('button', { name, exact: true })); const item = await waiting; await item.saveAs(path.join(out, file)); return JSON.parse(fs.readFileSync(path.join(out, file), 'utf8')); }
async function importBackup(page, payload) { await page.locator('#aq-portfolio-import').setInputFiles({ name: 'recovery-import.json', mimeType: 'application/json', buffer: Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)) }); }
async function noTray(page, label) { equal(await tray(page).count(), 0, label + ' expires the session tray'); }
function recordResult(name, checks, errors, extra = {}) { assert(errors.length === 0, name + ' runtime errors: ' + errors.join('; ')); results.push({ case: name, checks, errors, ...extra }); }

async function actualFixtures(page) {
  return page.evaluate(({ baseline, changed, writing, time, deterministicId }) => {
    const h = window.AquacultureLearningHelpers, ws = { ...changed, baselineScenario: baseline }, aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(changed), model = h.calculateEcosystem(changed);
    const annual = h.ecosystemMeasurement(ws, { scope: 'annual', metricId: 'minOxygen' }, time - 3600000, 'live-archive-reading');
    const monthly = h.ecosystemMeasurement(ws, { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, time - 1800000, 'july-reading');
    const earlier = h.ecosystemMeasurement({ ...ws, water: { ...ws.water, oxygen: 8.6 } }, { scope: 'annual', metricId: 'minOxygen' }, time - 7200000, 'earlier-settings-reading');
    // Only provenance is relabeled; values are generated by today's real helper.
    // This is an earlier-model metadata probe, not an earlier-model simulation.
    const relabeled = { ...h.ecosystemMeasurement(ws, { scope: 'month', month: 2, metricId: 'temperature', speciesId: 'system' }, time - 10800000, 'relabeled-model-reading'), modelVersion: 'qa-earlier-model' };
    const saved = { id: 'saved-reading-investigation', title: 'Saved original oxygen investigation', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion, environmentId: changed.environmentId, organisms: changed.organisms, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience, baselineScenario: baseline, currentScenario: changed, baselineSummary: aRun.summary, currentSummary: bRun.summary, prediction: 'A small oxygen change may alter the seasonal minimum.', observation: 'Original explanation with complete captured reading and settings.', evidence: writing, measurements: [annual, monthly] };
    const parked = { ...baseline, water: { ...baseline.water, oxygen: 7.4 }, baselineScenario: null }, parkedNote = h.ecosystemMeasurement(parked, { scope: 'month', month: 1, metricId: 'oxygen', speciesId: 'system' }, time - 14400000, 'parked-reading');
    const workspace = { ...changed, baselineScenario: baseline, prediction: 'Inspect a frozen reading before changing my explanation.', observation: 'This original reflection stays exact while I remove and restore captured readings.', evidence: writing, measurements: [annual, monthly, earlier, relabeled], experiments: [saved, { ...saved, id: 'second-saved-reading-investigation', title: 'Second saved record with colliding source ids' }], investigationId: '', parkedDraft: { ...parked, prediction: 'My parked prediction stays intact.', observation: 'This parked original reflection stays exact during removal and restoration.', evidence: { ...writing, claim: 'Keep my parked claim.' }, measurements: [parkedNote], investigationId: '' } };
    const bulk = Array.from({ length: 8 }, (_, month) => h.ecosystemMeasurement(ws, { scope: 'month', month, metricId: 'oxygen', speciesId: 'system' }, time - 3600000 + month * 60000, 'bulk-month-' + month));
    const deterministic = h.ecosystemMeasurement(ws, { scope: 'annual', metricId: 'minOxygen' }, time, deterministicId);
    const conflict = h.ecosystemMeasurement({ ...ws, water: { ...ws.water, oxygen: 8.6 } }, { scope: 'annual', metricId: 'minOxygen' }, time - 60000, deterministicId);
    return { seed: { lastTopic: 'ecosystem', ecosystemWorkspace: workspace }, bulk, deterministic, conflict };
  }, { baseline, changed, writing, time: baseTime, deterministicId: fixedId });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    // Every numeric fixture is generated only after the actual React page mounts.
    const bootstrap = await openSeeded(browser, url, seedFor(), [], 1280), fixtures = await actualFixtures(bootstrap); await bootstrap.close();
    const seed = fixtures.seed, annualId = seed.ecosystemWorkspace.measurements[0].id, monthlyId = seed.ecosystemWorkspace.measurements[1].id;
    assert(seed.ecosystemWorkspace.measurements.every(Boolean) && fixtures.bulk.every(Boolean) && fixtures.deterministic && fixtures.conflict, 'All fixture notes came from actual mounted model helpers');
    fs.writeFileSync(path.join(out, 'model-fixtures.json'), JSON.stringify(fixtures, null, 2));

    // 1. Actual annual/monthly sources, keyboard restoration, frozen settings and responsive accessibility.
    for (const width of [1280, 390, 320]) {
      console.log('Measurement recovery QA: keyboard/frozen round trip at ' + width);
      const errors = [], page = await openSeeded(browser, url, seed, errors, width); await page.emulateMedia({ reducedMotion: width === 1280 ? 'no-preference' : 'reduce' }); const before = await workspace(page);
      equal(await page.locator('.aq-measurement-archive .aq-measurement-row[data-measurement-id="' + annualId + '"]').count(), 2, 'Actual saved fixtures contain matching live/archive source ids');
      equal(await page.locator('.aq-measurement-archive .aq-measurement-recovery').count(), 0, 'Saved original archives have no recovery controls');
      const annual = await remove(page, annualId); await checkRemoved(page, annual, 'ready', 'annual-ready-' + width);
      const monthly = await remove(page, monthlyId); await checkRemoved(page, monthly, 'ready', 'monthly-ready-' + width);
      equal(await tray(page).locator(':scope > summary').innerText(), 'Recently removed readings · 2/8 this session', 'Native summary gives exact bounded session count');
      await keyboard(page, tray(page).locator(':scope > summary'), 'Space'); equal(await tray(page).evaluate(element => element.open), false, 'Native tray closes with Space'); await keyboard(page, tray(page).locator(':scope > summary')); assert(await tray(page).evaluate(element => element.open), 'Native tray opens with Enter');
      equal(await tray(page).locator('h4#aq-measurement-recovery-heading').count(), 1, 'Recovery section has one named h4'); await visual(page, 'sample-removed-' + width, origin, null, width === 320);
      await restore(page, annual, 'Annual restore at ' + width); await checkRemoved(page, monthly, 'ready', 'monthly-after-annual-' + width); await visual(page, 'sample-restored-' + width, origin, annualId, width === 320);
      const afterOne = await workspace(page); equal(afterOne.measurements[0], before.measurements[0], 'Annual restore returns the original identity/date/model/values/scenarios exactly'); equal(afterOne.experiments, before.experiments, 'Both archived originals remain exact');
      await restore(page, monthly, 'Monthly restore at ' + width); await noTray(page, 'Final selected restore');
      // Two removals change indices. Assert clamped insertion, not historical global order.
      const afterBoth = await workspace(page); equal(afterBoth.measurements.map(note => note.id), [monthlyId, annualId, ...before.measurements.slice(2).map(note => note.id)], 'Independent restoration follows each captured removal index and preserves current row order');
      preserveExceptMeasurements(afterBoth, before, 'Full round trip'); const persisted = await rawState(page); assert(!/removedMeasurements|measurementRecovery|data-removed-key/.test(JSON.stringify(persisted)), 'Recovery state is absent from existing stored schema');
      await page.reload(); await openDetails(page, notebook(page)); await noTray(page, 'Reload after restoration'); equal(await workspace(page), afterBoth, 'Restored live source and all other work survive reload');
      recordResult('Keyboard round trip and responsive frozen readings', ['actual annual/monthly and earlier-settings sources', 'honestly relabeled earlier-model metadata probe', 'two archived originals with matching live ids', 'native tray Space/Enter', 'exact frozen identity/date/model/values/A/B settings', 'restore focus after React renders', 'only target tray entry consumed', 'clamped insertion preserves current row order', 'writing/archive/parked work unchanged', 'normal/reduced motion, scoped axe, 44px targets and reflow', ...(width === 320 ? ['forced colors and visible focus screenshots'] : [])], errors, { width }); await page.close();
    }

    // 2. Notebook capacity: restore an older removal after a later capture, then duplicate and conflict review guards.
    {
      const fullSeed = clone(seed); fullSeed.ecosystemWorkspace.measurements = fixtures.bulk; const errors = [], page = await openSeeded(browser, url, fullSeed, errors, 320);
      const older = await remove(page, fixtures.bulk[0].id), later = await captureAnnual(page, 'minOxygen'); await checkRemoved(page, older, 'full', 'older-full-after-later-capture');
      await review(page, older, 'Review notebook space', 'aq-measurement-notebook-heading', 'Full restore review'); await visual(page, 'sample-full-320', origin, null, true);
      const newer = await remove(page, fixtures.bulk[1].id); await checkRemoved(page, older, 'ready', 'older-ready-after-making-space'); const currentBefore = await workspace(page); await restore(page, older, 'Older removal after later capture');
      const currentAfter = await workspace(page); equal(currentAfter.measurements.find(note => note.id === later.id), later, 'Restoring an older reading never overwrites or loses the later actual capture'); equal(currentAfter.measurements.filter(note => note.id !== older.note.id), currentBefore.measurements, 'All current notes preserve their exact order'); equal(await keys(page), [newer.key], 'The other newer removal remains available'); await page.close();
      const duplicateErrors = [], duplicatePage = await openSeeded(browser, url, seed, duplicateErrors, 320), duplicate = await remove(duplicatePage, annualId), recaptured = await captureAnnual(duplicatePage, 'minOxygen');
      assert(recaptured.id !== duplicate.note.id && recaptured.capturedAt !== duplicate.note.capturedAt, 'Duplicate fixture is an actual new id/date capture'); await checkRemoved(duplicatePage, duplicate, 'already-present', 'duplicate-recapture');
      await review(duplicatePage, duplicate, 'Review matching reading', 'aq-live-measurement-' + recaptured.id, 'Duplicate review'); await visual(duplicatePage, 'sample-duplicate-320', origin, recaptured.id, true);
      const recapturedRemoval = await remove(duplicatePage, recaptured.id); await restore(duplicatePage, duplicate, 'Original removal after matching capture removed'); equal(await keys(duplicatePage), [recapturedRemoval.key], 'Duplicate recapture does not replace or consume the original removed reading'); await page.close();
      const conflictSeed = clone(seed); conflictSeed.ecosystemWorkspace.measurements = [fixtures.conflict, ...seed.ecosystemWorkspace.measurements.slice(1)]; const conflictErrors = [], conflictPage = await openSeeded(browser, url, conflictSeed, conflictErrors, 320), conflicting = await remove(conflictPage, fixedId), newSameId = await fixedCapture(conflictPage, 'minOxygen');
      equal(newSameId.id, conflicting.note.id, 'Controlled clock/random creates an actual same-id capture collision'); assert(!isDeepStrictEqual(newSameId, conflicting.note), 'Collision contains different canonical capture data'); await checkRemoved(conflictPage, conflicting, 'conflict', 'same-id-conflict');
      await review(conflictPage, conflicting, 'Review current reading', 'aq-live-measurement-' + fixedId, 'Conflict review'); await visual(conflictPage, 'sample-conflict-320', origin, fixedId, true); equal((await workspace(conflictPage)).measurements.find(note => note.id === fixedId), newSameId, 'Conflict never replaces the current same-id capture'); await conflictPage.close();
      recordResult('Full, duplicate and conflict restore guards', ['full notebook disables restore and reviews notebook focus', 'older restore preserves later capture and current row order', 'only selected recovery entry consumed', 'new id/date signature duplicate blocks restore', 'original removed source survives duplicate review', 'same-id canonical differences block overwrite', 'matching/current review focuses unique live h4 without writes', '320px scoped axe/44px/reflow/forced-color screenshots'], [...errors, ...duplicateErrors, ...conflictErrors]);
    }

    // 3. Bounded last eight, fresh keys, exact canonical dedupe, and distinct notes sharing an id.
    {
      const bulkSeed = clone(seed); bulkSeed.ecosystemWorkspace.measurements = fixtures.bulk; const errors = [], page = await openSeeded(browser, url, bulkSeed, errors, 390), removed = [];
      for (const note of fixtures.bulk) removed.push(await remove(page, note.id)); equal((await keys(page)).length, 8, 'Eight distinct removals fill the bounded tray');
      const ninthNote = await captureAnnual(page, 'minOxygen'), ninth = await remove(page, ninthNote.id); equal(await keys(page), [ninth.key, ...removed.slice(1).reverse().map(item => item.key)], 'Ninth distinct removal keeps the most recent eight and evicts the oldest'); equal(await removedRow(page, removed[0].key).count(), 0, 'Evicted oldest entry is unavailable in the current page');
      const idStats = await page.evaluate(() => { const ids = Array.from(document.querySelectorAll('[id]'), e => e.id); return ids.filter((id, index) => ids.indexOf(id) !== index); }); equal(idStats, [], 'Recovery entries and archive collisions introduce no duplicate document ids'); await visual(page, 'sample-last-eight-390', origin, null); await page.close();
      const exactSeed = clone(seed); exactSeed.ecosystemWorkspace.measurements = [fixtures.deterministic, ...seed.ecosystemWorkspace.measurements.slice(1)]; const exactErrors = [], exactPage = await openSeeded(browser, url, exactSeed, exactErrors, 320), first = await remove(exactPage, fixedId), same = await fixedCapture(exactPage, 'minOxygen'); equal(same, first.note, 'Deterministic actual recapture exactly matches canonical original note'); await checkRemoved(exactPage, first, 'already-present', 'exact-id-already-present');
      const second = await remove(exactPage, fixedId); assert(second.key !== first.key, 'A repeated exact removal gets a fresh key'); equal(await keys(exactPage), [second.key], 'Exact canonical duplicate removal keeps only its newest recovery entry');
      await exactPage.locator('#aq-eco-oxygen').focus(); await exactPage.keyboard.press('ArrowLeft'); const different = await fixedCapture(exactPage, 'minOxygen'), third = await remove(exactPage, fixedId); assert(!isDeepStrictEqual(different, first.note), 'Changed B input produces a different actual canonical note with same id'); equal(await keys(exactPage), [third.key, second.key], 'Canonical differences sharing an id remain separate recoverable entries');
      await restore(exactPage, third, 'Restore one of two same-id removals'); await checkRemoved(exactPage, second, 'conflict', 'remaining-same-id-conflict'); await review(exactPage, second, 'Review current reading', 'aq-live-measurement-' + fixedId, 'Distinct same-id recovery review'); await visual(exactPage, 'sample-same-id-keys-320', origin, fixedId, true); await exactPage.close();
      recordResult('Bounded tray, canonical dedupe and separate keys', ['eight most recent distinct canonical removals', 'ninth evicts only oldest', 'fresh unique transient keys', 'exact canonical same-id duplicate blocks restoration', 'repeat exact canonical removal dedupes to newest key', 'different canonical notes sharing id remain separate', 'selected same-id restore leaves conflict row for review', 'archive collisions have no duplicate DOM ids', '390/320px scoped axe/reflow/forced colors'], [...errors, ...exactErrors]);
    }

    // 4. Ordinary edits, A changes, presets, reset, record rename and successful saves retain the tray.
    {
      const errors = [], page = await openSeeded(browser, url, seed, errors, 390), removed = await remove(page, annualId), keptKeys = await keys(page);
      async function keeps(action, label) { await action(); equal(await keys(page), keptKeys, label + ' keeps the session tray'); await checkRemoved(page, removed, 'ready', label.replace(/\W+/g, '-')); }
      await keeps(async () => { await page.locator('#aq-eco-oxygen').focus(); await page.keyboard.press('ArrowLeft'); }, 'B input edit');
      await keeps(() => keyboard(page, page.getByRole('button', { name: 'Replace scenario A', exact: true })), 'Replace A');
      await keeps(() => keyboard(page, page.getByRole('button', { name: 'Clear A', exact: true })), 'Clear A');
      await keeps(() => keyboard(page, page.locator('.aq-eco-preset').first()), 'Preset');
      await keeps(() => keyboard(page, page.getByRole('button', { name: 'Reset builder', exact: true })), 'Reset builder');
      await keeps(() => page.locator('#aq-record-name-0').fill('Renamed archive stays separate from reading recovery'), 'Rename saved record');
      await page.locator('#aq-eco-observation').fill('The original removed reading stays available while this current snapshot explanation is explicitly saved.'); const beforeSave = await workspace(page);
      await keeps(() => keyboard(page, page.getByRole('button', { name: 'Save snapshot evidence', exact: true })), 'Successful snapshot save'); const afterSave = await workspace(page); equal(afterSave.experiments.length, beforeSave.experiments.length + 1, 'Successful save creates one new archive'); equal(afterSave.experiments.slice(1), beforeSave.experiments, 'Successful save keeps all prior originals exact');
      equal(afterSave.measurements, beforeSave.measurements, 'Saving retains current captured rows'); await visual(page, 'sample-retained-after-save-390', origin, null, true); await restore(page, removed, 'Restore after save and reset'); equal((await workspace(page)).experiments, afterSave.experiments, 'Later reading restore never modifies saved experiments');
      const noopsSeed = clone(seed); noopsSeed.ecosystemWorkspace.baselineScenario = null; const noopErrors = [], noops = await openSeeded(browser, url, noopsSeed, noopErrors, 390), retained = await remove(noops, annualId), noopBefore = await workspace(noops), noopKeys = await keys(noops); await openDetails(noops, noops.locator('details.aq-investigation-picker'));
      assert(await noops.locator('.aq-question-card').first().isDisabled(), 'Parked draft disables guided-question transition'); assert(await noops.getByRole('button', { name: /^Replay experiment/ }).first().isDisabled(), 'Parked draft disables replay transition'); assert(await noops.getByRole('button', { name: /^Use saved B as A for/ }).first().isDisabled(), 'Parked draft disables branch transition');
      for (const control of [noops.locator('.aq-question-card').first(), noops.getByRole('button', { name: /^Replay experiment/ }).first(), noops.getByRole('button', { name: /^Use saved B as A for/ }).first()]) await control.evaluate(element => element.click());
      equal(await workspace(noops), noopBefore, 'Blocked transitions write nothing'); equal(await keys(noops), noopKeys, 'Blocked transition attempts keep recovery available'); await checkRemoved(noops, retained, 'ready', 'blocked-transitions-keep-tray'); await visual(noops, 'sample-blocked-transitions-390', origin, null, true); await noops.close(); await page.close();
      recordResult('Ordinary actions and blocked transitions retain recovery', ['B input edits, Replace/Clear A, preset and reset retain exact removed source', 'archive rename retains tray', 'successful evidence save retains recovery', 'restore after save leaves archived results exact', 'parked draft disables question/branch/replay', 'disabled no-op attempts preserve all work and recovery'], [...errors, ...noopErrors]);
    }

    // 5. Only successful notebook/draft transitions, successful import and reload expire recovery.
    {
      const errors = [], transitionSeed = clone(seed); transitionSeed.ecosystemWorkspace.parkedDraft = null;
      for (const kind of ['guided-question', 'branch', 'replay']) {
        const page = await openSeeded(browser, url, transitionSeed, errors, 390), removed = await remove(page, annualId);
        if (kind === 'guided-question') { await keyboard(page, page.getByRole('button', { name: 'Clear A', exact: true })); await openDetails(page, page.locator('details.aq-investigation-picker')); await keyboard(page, page.locator('.aq-question-card').first()); }
        if (kind === 'branch') await keyboard(page, page.getByRole('button', { name: /^Use saved B as A for/ }).first());
        if (kind === 'replay') await keyboard(page, page.getByRole('button', { name: /^Replay experiment/ }).first());
        await noTray(page, 'Successful ' + kind); const transitioned = await workspace(page); assert(transitioned.parkedDraft && !transitioned.parkedDraft.measurements.some(note => note.id === removed.note.id), 'Successful ' + kind + ' parks the current notebook without resurrecting its removed source');
        const returnTarget = transitioned.measurements[0] || await captureAnnual(page, 'minOxygen'); await remove(page, returnTarget.id); await keyboard(page, page.getByRole('button', { name: 'Return to my draft', exact: true })); await noTray(page, 'Return after ' + kind);
        assert(!(await workspace(page)).measurements.some(note => note.id === removed.note.id), 'Returning to parked draft never resurrects removed source'); await page.close();
      }
      const page = await openSeeded(browser, url, seed, errors, 390), removed = await remove(page, annualId), before = await workspace(page), oldKeys = await keys(page);
      await home(page); const backup = await download(page, 'Download backup', 'current-with-removed-reading.json'); assert(!JSON.stringify(backup).includes(removed.key), 'Export contains current work without transient recovery keys');
      await importBackup(page, '{ invalid JSON'); await page.getByText('That file is not a valid Aquaculture Lab portfolio backup.', { exact: true }).waitFor(); await ecosystem(page); equal(await workspace(page), before, 'Failed JSON import preserves current notebook'); equal(await keys(page), oldKeys, 'Failed JSON import preserves session recovery'); await visual(page, 'sample-failed-import-retains-390', origin, null, true);
      await home(page); await importBackup(page, backup); await page.getByText('Backup merged successfully. Existing learning data was preserved.', { exact: true }).waitFor(); await ecosystem(page); await noTray(page, 'Successful existing-schema backup import'); assert(!(await workspace(page)).measurements.some(note => note.id === removed.note.id), 'Successful current backup import does not resurrect removed source');
      const reloadRemoval = await remove(page, (await workspace(page)).measurements[0].id), durableAfterRemoval = await workspace(page); await page.reload(); await openDetails(page, notebook(page)); await noTray(page, 'Reload with recovery entries'); equal(await workspace(page), durableAfterRemoval, 'Reload preserves durable removed notebook and all other work'); assert(!(await workspace(page)).measurements.some(note => note.id === reloadRemoval.note.id), 'Reload expires recovery without resurrecting source'); await page.close();
      recordResult('Successful transitions, imports and reload expire session recovery', ['guided question/branch/replay clear only after successful transition', 'current removals are absent from parked notebook', 'Return clears recovery for notebook being left', 'Return preserves earlier removed state without resurrection', 'navigation and failed JSON import retain tray', 'actual existing-schema backup omits recovery keys', 'successful import clears tray without resurrecting source', 'reload expires session tray and retains durable removal'], errors);
    }

    // 6. Device write failure keeps a current-session draft; failed import/save do not consume recovery.
    {
      const errors = [], page = await openSeeded(browser, url, seed, errors, 390), originalDurable = await workspace(page);
      await page.evaluate(key => { window.__qaOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(item, value) { if (item === key) throw new DOMException('QA simulated device quota exceeded', 'QuotaExceededError'); return window.__qaOriginalSetItem.call(this, item, value); }; }, storageKey);
      const removed = await remove(page, annualId, { memory: true }); await checkRemoved(page, removed, 'ready', 'device-failure-ready'); await page.locator('.aq-storage-recovery').waitFor(); equal(await workspace(page), originalDurable, 'Failed device write leaves durable original untouched'); const originalSource = originalDurable.measurements.find(note => note.id === annualId); equal(await removedRow(page, removed.key).locator('.aq-measurement-meta').innerText(), 'Model ' + originalSource.modelVersion + ' · Captured ' + new Date(originalSource.capturedAt).toISOString(), 'Device failure recovery preserves original full model/date metadata'); await visual(page, 'sample-device-failure-ready-390', origin, null, true);
      const sessionAfterRemoval = (await download(page, 'Download current backup', 'device-failure-current-removal.json')).learning.ecosystemWorkspace; equal(sessionAfterRemoval.measurements, originalDurable.measurements.filter(note => note.id !== annualId), 'Fallback backup exposes current-session removal rather than stale durable reading'); equal(sessionAfterRemoval.evidence, originalDurable.evidence, 'Fallback removal preserves structured writing');
      const priorKeys = await keys(page), priorArchives = sessionAfterRemoval.experiments; await keyboard(page, page.getByRole('button', { name: 'Save snapshot evidence', exact: true })); equal(await keys(page), priorKeys, 'Failed evidence save keeps recovery entry'); equal((await download(page, 'Download current backup', 'device-failure-save-guard.json')).learning.ecosystemWorkspace.experiments, priorArchives, 'Failed evidence save creates no ghost original record');
      await home(page); const payload = { kind: 'aquaculture-learning-portfolio', version: 1, learning: { ecosystemWorkspace: sessionAfterRemoval } }; await importBackup(page, payload); await page.getByText('The backup was valid, but this browser could not save it.', { exact: true }).waitFor(); await ecosystem(page); equal(await keys(page), priorKeys, 'Valid backup with device-save failure keeps recovery');
      await keyboard(page, restoreButton(page, removed.key)); await focused(page, 'aq-live-measurement-' + annualId); await noTray(page, 'Session restore during device failure'); equal(await workspace(page), originalDurable, 'Session restore makes no false durable-write claim'); const restoredSession = (await download(page, 'Download current backup', 'device-failure-current-restored.json')).learning.ecosystemWorkspace; equal(restoredSession.measurements, originalDurable.measurements, 'Session restore preserves exact original source identity/date/values/settings'); equal(restoredSession.evidence, originalDurable.evidence, 'Session restore preserves original writing');
      await page.evaluate(() => { Storage.prototype.setItem = window.__qaOriginalSetItem; }); await keyboard(page, page.getByRole('button', { name: 'Retry device save', exact: true })); equal(await workspace(page), restoredSession, 'Retry writes the exact current fallback session'); await page.reload(); await openDetails(page, notebook(page)); await noTray(page, 'Device failure retry/reload'); equal(await workspace(page), restoredSession, 'Successful retry and reload retain the restored exact source');
      recordResult('Device save failure keeps current-session recovery', ['storage failure after actual React mount', 'durable original remains unchanged', 'current-session backup reflects actual removal', 'failed evidence save has no ghost archive and keeps recovery', 'failed valid import preserves recovery', 'restore operates on session notebook and focuses new live row', 'fallback preserves original values/settings/writing', 'explicit retry then reload writes exact current state'], errors); await page.close();
    }

    // 7. Captured labels remain literal plain text, including recovery controls and restored h4.
    {
      const escapedSeed = clone(seed), payload = '<img src=x onerror="window.__recoveryInjected=true"> & <b>label</b>'; escapedSeed.ecosystemWorkspace.measurements[0].metricLabel = payload;
      const errors = [], page = await openSeeded(browser, url, escapedSeed, errors, 320), before = await workspace(page), removed = await remove(page, annualId); await checkRemoved(page, removed, 'ready', 'literal-html-label');
      const html = await removedRow(page, removed.key).innerHTML(); assert(html.includes('&lt;img') && html.includes('&amp;'), 'Recovery escapes captured markup and ampersands'); equal(await removedRow(page, removed.key).locator('img,script,svg').count(), 0, 'Literal captured label creates no interpreted HTML'); assert(!(await page.evaluate(() => window.__recoveryInjected)), 'Captured label never executes in recovery');
      await visual(page, 'sample-literal-label-removed-320', origin, null, true); await restore(page, removed, 'Literal-label restore'); equal((await workspace(page)).measurements[0], before.measurements[0], 'Restoring retains original literal label in canonical source'); assert((await liveRow(page, annualId).locator('h4').innerText()).includes(payload), 'Restored h4 exposes full literal original label'); equal(await liveRow(page, annualId).locator('img,script,svg').count(), 0, 'Restored source renders captured label safely'); assert(!(await page.evaluate(() => window.__recoveryInjected)), 'Restored label executes no HTML');
      // Keep a second tray entry so one scoped audit covers recovery and restored h4.
      await remove(page, monthlyId); await keyboard(page, liveRow(page, annualId).locator('h4')); await visual(page, 'sample-literal-label-restored-320', origin, annualId, true);
      recordResult('Literal HTML labels and restored focus remain accessible', ['untrusted label metadata retains actual model numeric source', 'recovery h5/reading/restore name render literal text', 'no interpreted markup or script execution', 'exact literal label restored with original canonical source', '320px reflow, scoped axe, 44px controls and forced colors', 'full tray and restored focused row screenshots'], errors); await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2)); console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error; }
  finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
