/* Author-only citation-readiness QA; root executes after unit checks. */
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
  if (url.pathname === '/qa/aquacultureLab') { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(harness({ id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' })); return; }
  const item = files[url.pathname]; if (!item) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', item.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(repo, item)));
});

const baseline = { environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'heatwave' };
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const starterEvidence = '  My evidence notes stay in my own words.\n\n  ';
const writing = { claim: 'I want to explain the selected reading in its original model context.', evidence: starterEvidence,
  reasoning: 'A complete source citation preserves the time, settings and version needed to interpret the number.', nextTest: 'I would change one input and compare a new capture.' };
const baseTime = Date.UTC(2026, 9, 3, 17), monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function seedFor() { return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...changed, baselineScenario: baseline, prediction: 'Compare complete readings before explaining a seasonal change.',
  observation: 'This reflection and the other structured fields must remain exact while I preview and add a citation.', evidence: { ...writing }, measurements: [], experiments: [], investigationId: '' } }; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) { assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual)); }
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const row = (page, id) => notebook(page).locator('.aq-measurement-row[data-measurement-id="' + id + '"]');
const panel = (page, id) => row(page, id).locator('.aq-evidence-citation-readiness');
const preview = (page, id) => panel(page, id).locator('details.aq-evidence-citation-preview');
const add = (page, id) => row(page, id).getByRole('button', { name: /^Add reading to Evidence:/ });
async function workspace(page) { return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey); }
async function activateKeyboard(page, locator, key = 'Enter') { await locator.focus(); await page.keyboard.press(key); }
async function openDetails(page, locator) { if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary')); }
async function focusEvidence(page) { await page.waitForFunction(() => document.activeElement?.id === 'aq-eco-evidence-evidence'); assert(await page.locator('details.aq-structured-evidence').evaluate(element => element.open), 'Evidence target opens its native structured explanation disclosure'); }
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }); page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url); await notebook(page).waitFor(); await openDetails(page, notebook(page)); await notebook(page).locator('.aq-evidence-citation-readiness').first().waitFor(); return page;
}
function reading(note) {
  function side(state, value) { return state === 'recorded' ? value + note.unit : state === 'not-stocked' ? 'not stocked' : state === 'not-applicable' ? 'not applicable' : 'not recorded'; }
  let text = note.aState === 'no-baseline' ? 'B ' + side(note.bState, note.b) + ' (no A captured)' : 'A ' + side(note.aState, note.a) + ' → B ' + side(note.bState, note.b);
  if (note.aState === 'recorded' && note.bState === 'recorded') { const delta = Number((note.b - note.a).toFixed(3)); text += '; ' + (delta > 0 ? '+' : '') + delta + note.deltaUnit + ' (B minus A)'; }
  return text;
}
async function expectedFor(page, id) {
  return page.evaluate(({ key, id }) => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), note = ws.measurements.find(item => item.id === id);
    return { note, evidence: ws.evidence, readiness: h.ecosystemEvidenceCitationReadiness(ws.evidence, note, ws),
      append: h.appendEcosystemMeasurementEvidence(ws.evidence, note, ws), readingText: h.ecosystemMeasurementText(note), status: h.ecosystemMeasurementStatus(note, ws) };
  }, { key: storageKey, id });
}
async function checkPanel(page, id, wantedState, label) {
  const expected = await expectedFor(page, id), r = expected.readiness, citation = (expected.status.current ? '' : expected.status.modelChanged ? 'Earlier model — ' : 'Earlier settings — ') + expected.readingText;
  const current = expected.evidence.evidence, added = citation.length + (current.length ? 1 : 0), proposed = current.length + added;
  const state = current.includes(expected.readingText) ? 'already-added' : proposed > 500 ? 'full' : 'ready';
  equal(state, wantedState, label + ' follows independent body-duplicate and complete-citation capacity checks'); equal(r.state, state, label + ' helper state is exact');
  equal(Object.fromEntries(Object.keys(expected.append).map(key => [key, r[key]])), expected.append, label + ' readiness preserves the original append helper result byte for byte');
  equal(r.citation, citation, label + ' candidate keeps the current/earlier provenance prefix and complete original reading body'); equal(r.readingText, expected.readingText, label + ' reading body remains the existing citation source');
  equal(r.noteId, id, label + ' readiness retains the captured reading identity'); equal(r.canAppend, state === 'ready', label + ' canAppend matches the actual guarded action');
  for (const [key, value] of Object.entries({ currentLength: current.length, limit: 500, remaining: Math.max(0, 500 - current.length), addedLength: added, proposedLength: proposed, overflow: Math.max(0, proposed - 500) })) equal(r[key], value, label + ' exact citation budget: ' + key);
  const target = panel(page, id); equal(await target.getAttribute('data-citation-state'), state, label + ' live row exposes exact citation readiness');
  equal(await row(page, id).locator('#aq-citation-status-' + id).getAttribute('role'), null, label + ' per-row budget is plain descriptive text without repeated live status announcements');
  equal(await row(page, id).locator('#aq-citation-status-' + id).getAttribute('aria-live'), null, label + ' per-row budget does not create a live region');
  const statusText = await row(page, id).locator('#aq-citation-status-' + id).innerText();
  if (state === 'ready') {
    assert(statusText.includes('Evidence ' + current.length + '/500 → ' + proposed + '/500'), label + ' visible status gives exact current/proposed character budgets');
    assert(statusText.includes('Adds ' + added + ' characters'), label + ' visible status includes the complete candidate cost');
    if (current.length) assert(statusText.includes('newline separator'), label + ' visible cost explains the preserved newline rule');
  } else if (state === 'full') {
    assert(statusText.includes(added + ' more characters are needed') && statusText.includes((500 - current.length) + ' are available') && statusText.includes((proposed - 500) + ' over the limit'), label + ' full status reports exact needed, available and excess counts');
  } else {
    assert(statusText.includes('already cited') && statusText.includes('Evidence ' + current.length + '/500'), label + ' duplicate status describes the existing cited body and writing budget');
  }
  equal(await page.locator('#aq-citation-status-' + id).count(), 1, label + ' citation status is a unique live id despite archived rows');
  assert(await add(page, id).isEnabled(), label + ' original Add control remains enabled for guarded duplicate/full handling');
  const refs = (await add(page, id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); assert(refs.includes('aq-citation-status-' + id), label + ' Add control is described by its own citation status');
  for (const ref of refs) equal(await page.locator('#' + ref).count(), 1, label + ' Add description resolves once: ' + ref);
  equal(await preview(page, id).locator(':scope > summary').innerText(), 'Preview complete citation', label + ' citation preview has its exact native summary');
  assert(!(await preview(page, id).locator(':scope > summary').evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' native preview control stays outside live announcements');
  assert(!(await add(page, id).evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' original Add control stays outside live announcements');
  assert(expected.readingText.includes(reading(expected.note)), label + ' reading body preserves original A/B values, units and signed three-decimal delta');
  assert(expected.readingText.includes(expected.note.scope === 'annual' ? 'Annual model' : monthNames[expected.note.month] + ' model'), label + ' citation keeps its exact annual/monthly source');
  assert(expected.readingText.includes(expected.note.metricLabel), label + ' citation keeps the exact captured measurement label');
  assert(expected.readingText.includes('Model ' + expected.note.modelVersion + '.'), label + ' citation keeps original model provenance');
  assert(expected.readingText.includes('Captured ' + new Date(expected.note.capturedAt).toISOString() + '.'), label + ' citation retains the complete ISO capture date');
  if (state === 'full') equal(await target.getByRole('button', { name: 'Edit Evidence writing', exact: true }).count(), 1, label + ' full citation offers the Evidence edit target');
  if (state === 'already-added') equal(await target.getByRole('button', { name: 'Review Evidence writing', exact: true }).count(), 1, label + ' duplicate offers the existing Evidence review target');
  for (const button of await target.getByRole('button').all()) assert(!(await button.evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' interactive citation action is outside status/live announcements');
  fs.writeFileSync(path.join(out, label + '-readiness.json'), JSON.stringify({ note: expected.note, readiness: r }, null, 2)); return expected;
}
async function openAndCheckPreview(page, id, expected, label) {
  const before = await workspace(page); await activateKeyboard(page, preview(page, id).locator(':scope > summary'), 'Space'); assert(await preview(page, id).evaluate(element => element.open), label + ' native citation preview opens with Space');
  equal(await preview(page, id).locator('.aq-citation-text').evaluate(element => element.textContent), expected.readiness.citation, label + ' native preview contains exactly the candidate plain text');
  const text = await preview(page, id).innerText(); assert(text.includes(expected.readiness.citation), label + ' preview exposes the exact full candidate as plain text');
  equal(await workspace(page), before, label + ' opening the citation preview writes or generates nothing');
  await activateKeyboard(page, preview(page, id).locator(':scope > summary'), 'Enter'); equal(await preview(page, id).evaluate(element => element.open), false, label + ' native citation preview closes with Enter');
  await openDetails(page, preview(page, id));
}
function preserveOtherWork(after, before, label) {
  equal({ ...after, evidence: before.evidence }, before, label + ' keeps inputs, all captured/archived/parked records, prediction and reflection unchanged');
  for (const key of ['claim', 'reasoning', 'nextTest']) equal(after.evidence[key], before.evidence[key], label + ' keeps the learner ' + key + ' exact');
}
async function appendReady(page, id, expected, label) {
  const before = await workspace(page), exact = before.evidence.evidence + (before.evidence.evidence.length ? '\n' : '') + expected.readiness.citation;
  await activateKeyboard(page, add(page, id)); await focusEvidence(page); const after = await workspace(page);
  equal(after.evidence.evidence, exact, label + ' appends only the complete citation with the exact existing newline rule'); equal(after.evidence.evidence, expected.append.evidence.evidence, label + ' visible append retains original helper behavior');
  preserveOtherWork(after, before, label); equal(await page.locator('#aq-eco-evidence-evidence').inputValue(), exact, label + ' Evidence textarea displays every original whitespace and citation character'); return after;
}
async function blockedAdd(page, id, label) { const before = await workspace(page); await activateKeyboard(page, add(page, id)); equal(await workspace(page), before, label + ' guarded Add writes no partial citation, generated explanation or duplicate'); }
async function evidenceAction(page, id, name, label) { const before = await workspace(page); await activateKeyboard(page, panel(page, id).getByRole('button', { name, exact: true })); await focusEvidence(page); equal(await workspace(page), before, label + ' opens/focuses Evidence without changing any writing or captured data'); }
async function fillEvidence(page, text) { await openDetails(page, page.locator('details.aq-structured-evidence')); await page.locator('#aq-eco-evidence-evidence').fill(text); }
async function reflow(page, label) { const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size)); }
async function axeAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const audit = await page.evaluate(async () => {
    const value = await axe.run({ include: ['.aq-evidence-citation-readiness', '.aq-measurement-actions button[aria-describedby^="aq-citation-status-"]', '#aq-eco-evidence-evidence'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  }); fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2)); assert(audit.violations.length === 0, label + ' scoped WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function screenshotAndAudit(page, id, label, origin, forced = false) {
  await openDetails(page, preview(page, id)); await reflow(page, label); await axeAudit(page, label, origin);
  const sizes = await panel(page, id).locator('button,summary').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of sizes) assert(item.height >= 43.5, 'Citation controls have a 44px minimum target height: ' + JSON.stringify(item));
  await row(page, id).screenshot({ path: path.join(out, label + '.png') });
  const destination = page.locator('#aq-eco-evidence-evidence'), destinationDetails = page.locator('details.aq-structured-evidence');
  const showDestination = await destinationDetails.evaluate(element => element.open);
  if (showDestination) {
    // Include the surrounding native disclosure so the actual Evidence text,
    // label and focus outline remain available for independent visual review.
    await destinationDetails.screenshot({ path: path.join(out, label + '-evidence.png') });
  }
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await reflow(page, label + ' forced colors');
    if (showDestination) {
      const paint = await destination.evaluate(element => { const style = getComputedStyle(element); return { textColor: style.color, backgroundColor: style.backgroundColor, focused: element === document.activeElement, value: element.value }; });
      assert(paint.textColor !== paint.backgroundColor, label + ' forced-color Evidence destination paints different text/background colors: ' + JSON.stringify(paint));
      fs.writeFileSync(path.join(out, label + '-evidence-forced-colors.json'), JSON.stringify(paint, null, 2));
      await destinationDetails.screenshot({ path: path.join(out, label + '-evidence-forced-colors.png') });
    }
    await axeAudit(page, label + '-forced-colors', origin);
    await row(page, id).screenshot({ path: path.join(out, label + '-forced-colors.png') });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  }
}
async function actualFixtures(bootstrap) {
  return bootstrap.evaluate(({ baseline, changed, writing, time }) => {
    const h = window.AquacultureLearningHelpers, ws = { ...changed, baselineScenario: baseline }, aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(changed), model = h.calculateEcosystem(changed);
    const current = h.ecosystemMeasurement(ws, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 3600000, 'live-and-archived-citation');
    const monthly = h.ecosystemMeasurement(ws, { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, time - 1800000, 'current-july-citation');
    const earlierSettings = h.ecosystemMeasurement({ ...ws, water: { ...ws.water, oxygen: 8.6 } }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 7200000, 'earlier-settings-citation');
    // Relabel provenance only: all frozen numbers were generated by the actual
    // helper; this fixture does not pretend to reproduce an earlier model run.
    const earlierModel = { ...h.ecosystemMeasurement(ws, { scope: 'month', month: 2, metricId: 'temperature', speciesId: 'system' }, time - 10800000, 'earlier-model-citation'), modelVersion: 'qa-earlier-model' };
    const originalRecord = { id: 'original-citation-investigation', title: 'Earlier saved oxygen investigation', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion,
      environmentId: changed.environmentId, organisms: changed.organisms, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience,
      baselineScenario: baseline, currentScenario: changed, baselineSummary: aRun.summary, currentSummary: bRun.summary, prediction: 'The oxygen input may change the seasonal pattern.',
      observation: 'This original record and its captured reading stay frozen while I edit current Evidence writing.', evidence: writing, measurements: [current] };
    const parked = { ...baseline, water: { ...baseline.water, oxygen: 7.4 }, baselineScenario: null }, parkedNote = h.ecosystemMeasurement(parked, { scope: 'month', month: 2, metricId: 'oxygen', speciesId: 'system' }, time - 14400000, 'parked-citation-reading');
    const workspace = { ...changed, baselineScenario: baseline, prediction: 'Compare complete readings before explaining a seasonal change.',
      observation: 'This reflection and the other structured fields must remain exact while I preview and add a citation.', evidence: writing, measurements: [current, monthly, earlierSettings, earlierModel], experiments: [originalRecord], investigationId: '',
      parkedDraft: { ...parked, prediction: 'Return to this lower oxygen draft later.', observation: 'This parked explanation and its captured reading must survive the current citation workflow.', evidence: { claim: 'Investigate a lower oxygen reference.', evidence: '', reasoning: '', nextTest: '' }, measurements: [parkedNote], investigationId: '' } };
    return { lastTopic: 'ecosystem', ecosystemWorkspace: workspace };
  }, { baseline, changed, writing, time: baseTime });
}
function paddedPrefix(length) { assert(length >= 5, 'Actual complete citation leaves room for a boundary prefix'); return '  ' + 'x'.repeat(length - 5) + '\n  '; }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    // Bootstrap the ecosystem view, then build every fixture through the model.
    const bootstrapPage = await browser.newPage();
    await bootstrapPage.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: storageKey, state: seedFor() });
    await bootstrapPage.goto(url); await bootstrapPage.locator('.aq-investigation-loop').waitFor();
    const seed = await actualFixtures(bootstrapPage); await bootstrapPage.close(); const id = seed.ecosystemWorkspace.measurements[0].id;
    assert(seed.ecosystemWorkspace.measurements.every(Boolean) && seed.ecosystemWorkspace.parkedDraft.measurements.length === 1, 'Actual helper generated live, original and parked citation fixtures');
    for (const width of [1280, 390, 320]) {
      console.log('Evidence-citation QA: complete preview and append at ' + width);
      const errors = [], page = await openSeeded(browser, url, width, seed, errors); await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await workspace(page);
      equal(await page.locator('.aq-measurement-archive .aq-measurement-row[data-measurement-id="' + id + '"]').count(), 1, 'Archived fixture contains the same reading id as the live row');
      equal(await page.locator('.aq-measurement-archive .aq-evidence-citation-readiness').count(), 0, 'Saved captured rows have no new live citation controls or ids');
      const current = await checkPanel(page, id, 'ready', 'current-ready-' + width); await openAndCheckPreview(page, id, current, 'Current complete citation at ' + width);
      for (const note of before.measurements.slice(1)) {
        const expected = await checkPanel(page, note.id, 'ready', note.id + '-' + width); await openAndCheckPreview(page, note.id, expected, note.id + ' complete preview');
        if (note.id === 'earlier-settings-citation') assert(expected.readiness.citation.startsWith('Earlier settings — '), 'Earlier-settings prefix remains the existing complete citation prefix');
        if (note.id === 'earlier-model-citation') assert(expected.readiness.citation.startsWith('Earlier model — '), 'Earlier-model prefix remains the existing complete citation prefix');
      }
      equal(await workspace(page), before, 'Previewing complete current/monthly/earlier citations never writes an explanation');
      await screenshotAndAudit(page, id, 'sample-ready-citation-' + width, origin, width === 320);
      const after = await appendReady(page, id, current, 'Ready citation at ' + width); assert(after.evidence.evidence.startsWith(starterEvidence + '\n'), 'Learner whitespace and blank lines remain exact before the appended citation');
      await checkPanel(page, id, 'already-added', 'current-already-added-' + width); await blockedAdd(page, id, 'Duplicate Add handler at ' + width); await evidenceAction(page, id, 'Review Evidence writing', 'Duplicate Evidence review at ' + width);
      await screenshotAndAudit(page, id, 'sample-added-citation-' + width, origin, width === 320);
      await page.reload(); await openDetails(page, notebook(page)); equal(await workspace(page), after, 'Exact appended text and all frozen records survive reload'); await checkPanel(page, id, 'already-added', 'reloaded-citation-' + width);
      assert(errors.length === 0, 'Ready/duplicate runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ case: 'complete citation preview and exact append', width, checks: ['actual annual/monthly source, values, units, full capture date and model metadata', 'current/earlier-settings/earlier-model citation prefixes', 'native preview Space/Enter and read-only behavior', 'same live/archive id has unique live status and no archived controls', 'independent exact newline/character budget', 'Add preserves whitespace and changes only Evidence', 'duplicate Add safely writes nothing', 'Evidence review keyboard focus opens native structured details', 'frozen records/parked writing and reload unchanged', 'scoped axe, reflow, reduced motion and 44px controls', ...(width === 320 ? ['forced colors'] : [])], errors }); await page.close();
    }

    {
      const setupErrors = [], setup = await openSeeded(browser, url, 320, seed, setupErrors), candidate = (await expectedFor(setup, id)).readiness.citation; await setup.close();
      const fitSeed = clone(seed); fitSeed.ecosystemWorkspace.evidence.evidence = paddedPrefix(500 - candidate.length - 1);
      const fitErrors = [], fit = await openSeeded(browser, url, 320, fitSeed, fitErrors), fitting = await checkPanel(fit, id, 'ready', 'exact-fit-500'); equal(fitting.readiness.proposedLength, 500, 'Complete boundary citation proposes exactly 500 characters');
      await screenshotAndAudit(fit, id, 'sample-exact-fit-500-320', origin); const fitted = await appendReady(fit, id, fitting, 'Exact 500-character append'); equal(fitted.evidence.evidence.length, 500, 'Exact-fit citation remains complete at 500 characters');
      assert(fitted.evidence.evidence.endsWith(candidate), 'Exact fit keeps the complete final capture date and punctuation'); await blockedAdd(fit, id, 'Exact-fit duplicate guard'); await fit.close();
      const fullSeed = clone(seed); fullSeed.ecosystemWorkspace.evidence.evidence = paddedPrefix(501 - candidate.length - 1);
      const fullErrors = [], full = await openSeeded(browser, url, 320, fullSeed, fullErrors), before = await workspace(full), over = await checkPanel(full, id, 'full', 'one-over-501'); equal(over.readiness.proposedLength, 501, 'One-over citation proposes 501 characters'); equal(over.readiness.overflow, 1, 'One-over citation names the exact excess');
      await openAndCheckPreview(full, id, over, 'One-over complete preview'); await blockedAdd(full, id, 'Full 501-character guard'); await evidenceAction(full, id, 'Edit Evidence writing', 'Full citation Evidence edit');
      await screenshotAndAudit(full, id, 'sample-full-citation-501-320', origin, true); equal(await workspace(full), before, 'Full citation and direct edit navigation preserve the complete existing Evidence');
      const editedText = before.evidence.evidence.slice(1); await fillEvidence(full, editedText); const afterEdit = await workspace(full); preserveOtherWork(afterEdit, before, 'Evidence edit budget refresh'); equal(afterEdit.evidence.evidence, editedText, 'Editing updates only the explicit learner Evidence field');
      const refreshed = await checkPanel(full, id, 'ready', 'edited-back-to-500'); equal(refreshed.readiness.proposedLength, 500, 'Removing one character refreshes the candidate to exact fit'); const appended = await appendReady(full, id, refreshed, 'Edited exact-fit append'); equal(appended.evidence.evidence.length, 500, 'Edited candidate appends exactly without truncation');
      assert(setupErrors.length === 0 && fitErrors.length === 0 && fullErrors.length === 0, 'Boundary workflow runtime errors'); results.push({ case: '500/501 complete-citation boundary and edit refresh', width: 320, checks: ['exact whole citation fits at 500', '501 is full with one-character overflow', 'no partial append or truncation', 'full Add remains guarded and preserves writing', 'direct edit keyboard focus', 'explicit Evidence edit refreshes budget', 'other writing/captured/archive/parked data unchanged', 'scoped axe/reflow/forced colors'], errors: [...setupErrors, ...fitErrors, ...fullErrors] }); await full.close();
    }

    {
      const setupErrors = [], setup = await openSeeded(browser, url, 320, seed, setupErrors), body = (await expectedFor(setup, id)).readingText; await setup.close();
      const duplicateSeed = clone(seed); duplicateSeed.ecosystemWorkspace.evidence.evidence = '  Keep this existing wording.\n  ' + body;
      const errors = [], page = await openSeeded(browser, url, 320, duplicateSeed, errors), before = await workspace(page); await checkPanel(page, id, 'already-added', 'already-cited-body');
      const oxygen = page.locator('#aq-eco-oxygen'); await oxygen.focus(); const initial = Number(await oxygen.inputValue()), step = Number(await oxygen.getAttribute('step') || 1), moves = Math.round((initial - 8.6) / step);
      for (let at = 0; at < moves; at++) await page.keyboard.press('ArrowLeft'); equal(Number(await oxygen.inputValue()), 8.6, 'Actual B oxygen change creates earlier-settings provenance for the original current reading');
      const afterChange = await workspace(page); equal(afterChange.evidence, before.evidence, 'Input navigation does not rewrite the existing body citation'); equal(afterChange.measurements, before.measurements, 'Input navigation leaves every original capture frozen'); equal(afterChange.experiments, before.experiments, 'Input navigation leaves archived results exact'); equal(afterChange.parkedDraft, before.parkedDraft, 'Input navigation preserves the parked draft');
      const changedPrefix = await checkPanel(page, id, 'already-added', 'body-cited-after-prefix-change'); assert(changedPrefix.readiness.citation.startsWith('Earlier settings — '), 'Current candidate now has its actual earlier-settings prefix'); equal(changedPrefix.readingText, body, 'Original body, values, source, model and date remain unchanged');
      await openAndCheckPreview(page, id, changedPrefix, 'Changed provenance duplicate preview'); await blockedAdd(page, id, 'Body-level duplicate after prefix change'); await evidenceAction(page, id, 'Review Evidence writing', 'Existing citation provenance review');
      equal((await workspace(page)).evidence.evidence, duplicateSeed.ecosystemWorkspace.evidence.evidence, 'Duplicate readiness never updates an older written citation automatically'); await screenshotAndAudit(page, id, 'sample-prefix-change-duplicate-320', origin, true);
      assert(setupErrors.length === 0 && errors.length === 0, 'Prefix-change runtime errors'); results.push({ case: 'body duplicate survives provenance prefix changes', width: 320, checks: ['existing body citation is already-added', 'actual B edit changes current provenance to earlier settings', 'candidate retains complete frozen body', 'body-based duplicate takes precedence', 'no duplicate append or automatic citation rewriting', 'Evidence review focus and unchanged original/archive/parked work', 'scoped axe/reflow/forced colors'], errors: [...setupErrors, ...errors] }); await page.close();
    }

    {
      const escapedSeed = clone(seed), payload = '<img src=x onerror="window.__citationInjected=true"> & <b>label</b>';
      escapedSeed.ecosystemWorkspace.measurements[0].metricLabel = payload;
      const errors = [], page = await openSeeded(browser, url, 320, escapedSeed, errors), expected = await checkPanel(page, id, 'ready', 'escaped-citation-label');
      await openAndCheckPreview(page, id, expected, 'Plain-text citation preview'); const html = await preview(page, id).innerHTML(); assert(html.includes('&lt;img') && html.includes('&amp;'), 'Citation candidate escapes markup and ampersands in HTML'); equal(await preview(page, id).locator('img,script,svg').count(), 0, 'Untrusted reading label remains text rather than rendered HTML'); assert(!(await page.evaluate(() => window.__citationInjected)), 'Plain-text preview never executes the captured label');
      const before = await workspace(page), after = await appendReady(page, id, expected, 'Escaped-label exact append'); preserveOtherWork(after, before, 'Escaped-label append'); assert(after.evidence.evidence.includes(payload), 'Evidence retains the literal full source label without interpreting or stripping it');
      const artifact = await page.evaluate(key => {
        const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
        const reportCopy = { ...ws.experiments[0], evidence: ws.evidence, measurements: [ws.measurements[0]] }, html = h.ecosystemExperimentHtml(reportCopy), doc = new DOMParser().parseFromString(html, 'text/html');
        const invalid = h.ecosystemEvidenceCitationReadiness(ws.evidence, null, ws);
        return { html, interpretedPayloads: doc.querySelectorAll('img,script,svg').length, reportText: doc.body.textContent, invalid };
      }, storageKey);
      fs.writeFileSync(path.join(out, 'escaped-citation-report.html'), artifact.html); assert(artifact.html.includes('&lt;img') && artifact.html.includes('&amp;'), 'Exported report preserves the existing safe HTML escaping'); equal(artifact.interpretedPayloads, 0, 'Report treats complete citation/source labels as text'); assert(artifact.reportText.includes(expected.readiness.citation), 'Report retains the exact decoded complete citation text');
      equal(artifact.invalid.state, 'unavailable', 'Invalid captured source has explicit unavailable readiness'); equal(artifact.invalid.canAppend, false, 'Unavailable source cannot append'); equal(artifact.invalid.citation, '', 'Unavailable source has no invented citation'); equal(artifact.invalid.evidence, after.evidence, 'Unavailable helper preserves learner writing');
      equal(await workspace(page), after, 'Read-only report and invalid-source checks change no writing or frozen record'); await screenshotAndAudit(page, id, 'sample-escaped-citation-320', origin, true); assert(errors.length === 0, 'Escaped-source runtime errors: ' + errors.join('; '));
      results.push({ case: 'plain-text escaping and unavailable source', width: 320, checks: ['actual numeric source with untrusted label metadata', 'complete candidate is escaped text', 'preview executes no HTML', 'exact literal append to Evidence only', 'report copy retains safe escaping without mutating saved originals', 'unavailable pure helper has no citation and preserves writing', 'scoped axe/reflow/forced colors'], report: 'escaped-citation-report.html', errors }); await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2)); console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error; }
  finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
