/* Local AquacultureLab evidence-save QA. Run serially from the repository root. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = path.join(__dirname, 'browser');
const storageKey = 'aquacultureLab.state.v1';
const results = [];
fs.mkdirSync(out, { recursive: true });

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
    res.end(harness({ id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' }));
    return;
  }
  const item = files[url.pathname];
  if (!item) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', item.endsWith('.css') ? 'text/css' : 'application/javascript; charset=utf-8');
  res.end(fs.readFileSync(path.join(repo, item)));
});

const baseline = {
  environmentId: 'longline', organisms: { oyster: 2, kelp: 1 },
  water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 },
  disturbanceId: 'heatwave'
};
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const baseTime = Date.UTC(2026, 9, 2, 15);
const emptyEvidence = { claim: '', evidence: '', reasoning: '', nextTest: '' };
const writing = {
  claim: '  Starting oxygen may change the annual oxygen minimum in this modeled community.  ',
  evidence: '  I captured the annual lowest oxygen from A and B and will compare their original settings.  ',
  reasoning: '  The oxygen setting can affect the water signals while this comparison keeps the other inputs steady.  ',
  nextTest: ''
};
const prediction = 'If starting oxygen rises, the annual minimum may rise while the other settings stay steady.';
function seedFor(current = changed, overrides = {}) {
  return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...current, baselineScenario: baseline,
    prediction, observation: '', evidence: { ...writing }, measurements: [], experiments: [], investigationId: '', ...overrides } };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual));
}
const saveSection = page => page.locator('#aq-eco-evidence-heading').locator('xpath=ancestor::section[1]');
const readiness = page => saveSection(page).locator('.aq-save-readiness');
const snapshot = page => saveSection(page).getByRole('button', { name: 'Save snapshot evidence', exact: true });
const comparison = page => saveSection(page).getByRole('button', { name: 'Save A/B comparison', exact: true });
const structured = page => page.locator('details.aq-structured-evidence');
const notebook = page => saveSection(page).locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const card = (page, id) => page.locator('.aq-experiment-record[data-experiment-id="' + id + '"]');
function inputsOf(value) { return { environmentId: value.environmentId, organisms: value.organisms, water: value.water, disturbanceId: value.disturbanceId }; }
async function workspace(page) {
  return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey);
}
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url);
  await page.locator('.aq-investigation-loop').waitFor();
  await readiness(page).waitFor();
  return page;
}
async function activateKeyboard(page, locator, key = 'Enter') { await locator.focus(); await page.keyboard.press(key); }
async function focusId(page, id, message) {
  await page.waitForFunction(expected => document.activeElement?.id === expected, id);
  assert(await page.locator('#' + id).evaluate(element => element === document.activeElement), message || 'Focus reaches ' + id);
}
async function openDetails(page, locator) {
  if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary'));
}
async function reveal(page, locator) {
  for (const ancestor of await locator.locator('xpath=ancestor::details').all()) await openDetails(page, ancestor);
  await locator.waitFor({ state: 'visible' });
}
async function fillEvidence(page, value) {
  await openDetails(page, structured(page));
  for (const key of ['claim', 'evidence', 'reasoning', 'nextTest']) await page.locator('#aq-eco-evidence-' + key).fill(value[key] || '');
}
async function reflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size));
}
async function semantics(page) {
  equal(await readiness(page).count(), 1, 'One visible readiness panel explains both save controls');
  equal(await readiness(page).locator('#aq-save-readiness-heading').count(), 1, 'Readiness has its stable visible heading');
  for (const [button, id] of [[snapshot(page), 'aq-eco-snapshot-readiness'], [comparison(page), 'aq-eco-comparison-readiness']]) {
    const refs = (await button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    assert(refs.includes(id) && refs.includes('aq-eco-save-status'), 'Save button has its readiness and save-status descriptions');
    for (const ref of refs) equal(await page.locator('#' + ref).count(), 1, 'Save description resolves exactly once: ' + ref);
  }
  for (const name of ['Write a reflection', 'Edit structured explanation']) {
    const button = readiness(page).getByRole('button', { name, exact: true });
    equal(await button.count(), 1, 'Readiness action has the expected accessible name: ' + name);
    assert(!(await button.evaluate(element => !!element.closest('[aria-live]'))), 'Readiness actions are outside the live announcement region');
  }
  const review = readiness(page).getByRole('button', { name: 'Review captured readings', exact: true });
  const hasCaptures = (await workspace(page)).measurements.length > 0;
  equal(await review.count(), hasCaptures ? 1 : 0, 'Captured-reading review action appears when the live notebook has readings');
  if (hasCaptures) assert(!(await review.evaluate(element => !!element.closest('[aria-live]'))), 'Captured-reading review is outside the live announcement region');
  const text = await readiness(page).innerText();
  assert(/reflection/i.test(text) && /claim/i.test(text) && /evidence/i.test(text) && /reasoning/i.test(text) && /20/.test(text), 'Readiness explains both minimum writing paths');
}
async function axeAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const audit = await page.evaluate(async () => {
    const value = await axe.run({ include: [
      '.aq-save-readiness',
      'button[aria-describedby~="aq-eco-snapshot-readiness"]',
      'button[aria-describedby~="aq-eco-comparison-readiness"]'
    ] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  });
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function screenshotAndAudit(page, label, origin, forced = false) {
  await semantics(page); await reflow(page, label);
  const sizes = await readiness(page).locator('button').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const button of [snapshot(page), comparison(page)]) sizes.push(await button.evaluate(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })));
  for (const item of sizes) assert(item.height >= 43.5, 'Readiness/save control has a 44px minimum height: ' + JSON.stringify(item));
  await axeAudit(page, label, origin);
  await saveSection(page).screenshot({ path: path.join(out, label + '.png') });
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await reflow(page, label + ' forced colors'); await axeAudit(page, label + '-forced-colors', origin);
    await saveSection(page).screenshot({ path: path.join(out, label + '-forced-colors.png') });
    await page.emulateMedia({ forcedColors: 'none' });
  }
}
async function captureAnnual(page) {
  const before = await workspace(page);
  const expected = await page.evaluate(key => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
    return { a: h.simulateEcosystemYear(ws.baselineScenario).summary.minOxygen, b: h.simulateEcosystemYear(ws).summary.minOxygen, modelVersion: h.ecosystemModelVersion };
  }, storageKey);
  await reveal(page, page.locator('#aq-measurement-annual-metric'));
  await page.locator('#aq-measurement-annual-metric').selectOption('minOxygen');
  await activateKeyboard(page, page.getByRole('button', { name: 'Record annual result', exact: true }));
  const after = await workspace(page), ids = new Set(before.measurements.map(item => item.id));
  const note = after.measurements.find(item => !ids.has(item.id));
  assert(note && after.measurements.length === before.measurements.length + 1, 'One current-model annual reading is captured through the UI');
  equal({ a: note.a, b: note.b, modelVersion: note.modelVersion }, expected, 'Captured numeric outputs come from the actual current helper model');
  equal(note.currentScenario, inputsOf(before), 'Capture preserves exact original B inputs');
  equal(note.baselineScenario, before.baselineScenario, 'Capture preserves exact original A inputs');
  equal(after.experiments, before.experiments, 'Capturing a reading does not save an experiment');
  return note;
}
async function actualFixtures(bootstrap) {
  return bootstrap.evaluate(({ baseline, changed, time, writing, prediction }) => {
    const h = window.AquacultureLearningHelpers;
    const priorB = { ...baseline, water: { ...baseline.water, oxygen: 8.6 } };
    const aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(priorB), model = h.calculateEcosystem(priorB);
    const priorNote = h.ecosystemMeasurement({ ...priorB, baselineScenario: baseline }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 3600000, 'original-annual-reading');
    const originalRecord = {
      id: 'previous-oxygen', title: 'Earlier oyster and kelp oxygen comparison', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion,
      status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience,
      environmentId: priorB.environmentId, organisms: priorB.organisms, baselineScenario: baseline, currentScenario: priorB,
      baselineSummary: aRun.summary, currentSummary: bRun.summary, prediction,
      observation: 'This earlier reflection compared a smaller starting-oxygen change with the fixed A settings.',
      evidence: writing, measurements: priorNote ? [priorNote] : []
    };
    const parkedB = { ...baseline, water: { ...baseline.water, oxygen: 7.4 } };
    const parkedNote = h.ecosystemMeasurement(parkedB, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 7200000, 'parked-annual-reading');
    const workspace = { ...changed, baselineScenario: baseline, prediction, observation: '', evidence: writing,
      measurements: [], experiments: [originalRecord], investigationId: '',
      parkedDraft: { ...parkedB, baselineScenario: null, prediction: 'I will compare a lower oxygen setting later.',
        observation: 'This separate unfinished explanation and its captured reading must remain in the parked draft.',
        evidence: { claim: 'I want to investigate the lower reference oxygen.', evidence: '', reasoning: '', nextTest: '' },
        investigationId: '', measurements: parkedNote ? [parkedNote] : [] }
    };
    const selection = { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' };
    const currentNote = h.ecosystemMeasurement(workspace, selection, time - 60000, 'matches-current');
    const oldB = h.ecosystemMeasurement({ ...workspace, water: { ...workspace.water, oxygen: 8.8 } }, selection, time - 120000, 'earlier-b-settings');
    const oldA = h.ecosystemMeasurement({ ...workspace, baselineScenario: { ...baseline, water: { ...baseline.water, temperature: 13 } } }, selection, time - 180000, 'earlier-a-settings');
    // Only the provenance label is changed. Frozen values were generated above by
    // the real helper; this fixture does not claim to reproduce an earlier model.
    const oldModel = { ...h.ecosystemMeasurement({ ...workspace, water: { ...workspace.water, oxygen: 8.7 } }, selection, time - 240000, 'earlier-model-and-settings'), modelVersion: 'qa-earlier-model' };
    return { seed: { lastTopic: 'ecosystem', ecosystemWorkspace: workspace }, mixed: { lastTopic: 'ecosystem', ecosystemWorkspace: { ...workspace, measurements: [currentNote, oldB, oldA, oldModel] } } };
  }, { baseline, changed, time: baseTime, writing, prediction });
}
async function expectedOutputs(page) {
  return page.evaluate(key => {
    const h = window.AquacultureLearningHelpers, ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), model = h.calculateEcosystem(ws);
    return { modelVersion: h.ecosystemModelVersion, baselineSummary: ws.baselineScenario ? h.simulateEcosystemYear(ws.baselineScenario).summary : null,
      currentSummary: h.simulateEcosystemYear(ws).summary, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience };
  }, storageKey);
}
async function saveAndCheck(page, kind, before, label) {
  const expected = await expectedOutputs(page), began = Date.now();
  await activateKeyboard(page, kind === 'comparison' ? comparison(page) : snapshot(page));
  await focusId(page, 'aq-saved-experiments-heading', 'Successful evidence save moves focus to the saved evidence heading');
  const after = await workspace(page), ids = new Set(before.experiments.map(item => item.id));
  const record = after.experiments.find(item => !ids.has(item.id));
  assert(record && after.experiments.length === before.experiments.length + 1, label + ' creates exactly one durable record');
  equal(record.kind, kind, label + ' saves the requested record kind');
  equal(record.observation, before.observation.trim(), label + ' preserves only the learner reflection, including an empty reflection');
  equal(record.evidence, before.evidence, label + ' preserves each own structured field verbatim without generating an explanation');
  equal(record.prediction, before.prediction, label + ' keeps the original prediction');
  equal(record.investigationId, before.investigationId, label + ' keeps the investigation provenance');
  equal(record.currentScenario, inputsOf(before), label + ' freezes the original B settings');
  equal(record.measurements, before.measurements, label + ' freezes the complete captured notebook');
  equal(record.modelVersion, expected.modelVersion, label + ' records the current model version');
  assert(record.savedAt >= began && record.savedAt <= Date.now(), label + ' records the actual save time');
  for (const key of ['status', 'carryingPressure', 'oxygen', 'ammonia', 'resilience']) equal(record[key], expected[key], label + ' freezes actual direct output: ' + key);
  if (kind === 'comparison') {
    equal(record.baselineScenario, before.baselineScenario, label + ' freezes complete original A settings');
    equal(record.baselineSummary, expected.baselineSummary, label + ' keeps actual original A annual scalar and species outputs');
    equal(record.currentSummary, expected.currentSummary, label + ' keeps actual original B annual scalar and species outputs');
  }
  equal(after.experiments.filter(item => ids.has(item.id)), before.experiments, label + ' leaves every existing frozen record unchanged');
  equal(inputsOf(after), inputsOf(before), label + ' does not change live inputs');
  for (const key of ['baselineScenario', 'prediction', 'measurements', 'investigationId', 'parkedDraft']) equal(after[key], before[key], label + ' preserves live/parked provenance: ' + key);
  equal(after.observation, '', label + ' clears the saved reflection draft after commit');
  equal(after.evidence, emptyEvidence, label + ' clears the saved structured draft after commit');
  assert(await snapshot(page).isDisabled() && await comparison(page).isDisabled(), label + ' now requires new writing before another save');
  return { record, after };
}
async function exportAndReload(page, record, after, label) {
  const savedDetails = card(page, record.id).locator('details.aq-saved-inputs');
  await activateKeyboard(page, savedDetails.locator(':scope > summary'), 'Space');
  assert(await savedDetails.evaluate(element => element.open), 'Saved evidence disclosure opens with native Space');
  for (const value of Object.values(record.evidence).filter(value => value.trim())) assert((await savedDetails.innerText()).includes(value.trim()), 'Saved review includes the original structured writing');
  const report = card(page, record.id).getByRole('button', { name: /^Download report for experiment / });
  const pending = page.waitForEvent('download'); await activateKeyboard(page, report);
  const download = await pending, file = path.join(out, label + '-report.html'); await download.saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  const expectedHtml = await page.evaluate(item => window.AquacultureLearningHelpers.ecosystemExperimentHtml(item), record);
  equal(html, expectedHtml, 'UI report exports exactly the frozen saved record');
  if (!record.observation) assert(html.includes('<strong>Observation:</strong> Not recorded.'), 'Structured-only export keeps its empty reflection instead of synthesizing reflection prose');
  const exportedExplanation = await page.evaluate(markup => {
    const doc = new DOMParser().parseFromString(markup, 'text/html');
    const heading = [...doc.querySelectorAll('h1,h2,h3')].find(node => node.textContent === 'Prediction and explanation');
    return [...heading.parentElement.querySelectorAll('p')].map(node => node.textContent);
  }, html);
  for (const value of Object.values(record.evidence).filter(value => value.trim())) assert(exportedExplanation.some(text => text.includes(value)), 'Export keeps each exact learner structured field');
  equal((await workspace(page)).experiments, after.experiments, 'Export does not mutate saved records');
  await page.reload(); await readiness(page).waitFor();
  equal(await workspace(page), after, 'Reload keeps exact settings, notebooks, original records, new record and parked work');
  equal((await workspace(page)).experiments.find(item => item.id === record.id), record, 'Reload retains every frozen saved field');
}
async function checkCounts(page, expected) {
  const summary = await page.locator('#aq-eco-capture-summary').innerText();
  const parsed = {};
  for (const [key, label] of [['current', 'Matches current settings'], ['earlierSettings', 'Earlier settings'], ['earlierModel', 'Earlier model'], ['unavailable', 'Settings unavailable']]) {
    const match = summary.match(new RegExp(label + ':\\s*(\\d+)'));
    assert(match, 'Captured-reading summary explicitly reports ' + label); parsed[key] = Number(match[1]);
  }
  equal(parsed, expected, 'Captured-reading counts are mutually exclusive and exact');
  const ws = await workspace(page);
  equal(Object.values(parsed).reduce((sum, count) => sum + count, 0), ws.measurements.length, 'Every live captured reading belongs to exactly one readiness bucket');
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    const bootstrapErrors = [], bootstrap = await openSeeded(browser, url, 1280, seedFor(), bootstrapErrors);
    const fixtures = await actualFixtures(bootstrap), seed = fixtures.seed;
    assert(seed.ecosystemWorkspace.experiments[0].measurements.length === 1 && seed.ecosystemWorkspace.parkedDraft.measurements.length === 1, 'Actual helper generated original and parked notebook fixtures');
    assert(fixtures.mixed.ecosystemWorkspace.measurements.every(Boolean), 'Actual helper generated every mixed-capture fixture');
    assert(bootstrapErrors.length === 0, 'Fixture bootstrap runtime errors: ' + bootstrapErrors.join('; '));
    await bootstrap.close();

    for (const width of [1280, 390, 320]) {
      console.log('Evidence-save QA: structured-only comparison at ' + width);
      const errors = [], page = await openSeeded(browser, url, width, seed, errors);
      const beforeActions = await workspace(page);
      equal(beforeActions.observation, '', 'Structured-only comparison starts with zero reflection characters');
      assert(await snapshot(page).isEnabled() && await comparison(page).isEnabled(), 'Complete CER writing enables both eligible save controls without a reflection');
      equal(await structured(page).evaluate(element => element.open), false, 'Structured explanation starts as a collapsed native disclosure');
      await activateKeyboard(page, structured(page).locator(':scope > summary'), 'Space');
      assert(await structured(page).evaluate(element => element.open), 'Structured disclosure opens through native Space');
      await activateKeyboard(page, structured(page).locator(':scope > summary'), 'Enter');
      equal(await structured(page).evaluate(element => element.open), false, 'Structured disclosure closes through native Enter');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Edit structured explanation', exact: true }));
      await focusId(page, 'aq-eco-evidence-claim');
      assert(await structured(page).evaluate(element => element.open), 'Edit structured explanation opens its disclosure and focuses Claim when CER is complete');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Write a reflection', exact: true }));
      await focusId(page, 'aq-eco-observation');
      await activateKeyboard(page, notebook(page).locator(':scope > summary'), 'Space');
      assert(await notebook(page).evaluate(element => element.open), 'Empty notebook opens through its native summary with Space');
      equal(await workspace(page), beforeActions, 'Readiness navigation opens disclosures without modifying learner work');
      await captureAnnual(page);
      await activateKeyboard(page, notebook(page).locator(':scope > summary'), 'Enter');
      equal(await notebook(page).evaluate(element => element.open), false, 'Captured notebook closes through its native summary with Enter');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Review captured readings', exact: true }));
      await focusId(page, 'aq-measurement-notebook-heading');
      assert(await notebook(page).evaluate(element => element.open), 'Review captured readings opens the native notebook and focuses its heading');
      await checkCounts(page, { current: 1, earlierSettings: 0, earlierModel: 0, unavailable: 0 });
      await screenshotAndAudit(page, 'sample-structured-comparison-' + width, origin, width === 320);
      const before = await workspace(page);
      const { record, after } = await saveAndCheck(page, 'comparison', before, 'Structured-only comparison at ' + width);
      await exportAndReload(page, record, after, 'structured-comparison-' + width);
      await reflow(page, 'Saved and reloaded comparison at ' + width);
      assert(errors.length === 0, 'Comparison runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ case: 'structured-only comparison', width, checks: ['zero-reflection complete CER enables snapshot/comparison', 'native keyboard disclosure and action focus', 'actual current-model UI capture', 'disjoint captured-reading counts', 'exact writing, numeric outputs, species, A/B settings and frozen provenance', 'original and parked work unchanged', 'keyboard report export and reload', 'save-section screenshot, focused axe and reflow', ...(width === 320 ? ['forced colors'] : [])], errors });
      await page.close();
    }

    // One narrow-screen workflow exercises both writing routes and their actual
    // minimum boundaries, then saves each through the corresponding UI control.
    {
      const errors = [], page = await openSeeded(browser, url, 320, seed, errors);
      await captureAnnual(page);
      await screenshotAndAudit(page, 'sample-structured-snapshot-320', origin);
      const { record, after } = await saveAndCheck(page, 'snapshot', await workspace(page), 'Structured-only snapshot');
      await exportAndReload(page, record, after, 'structured-snapshot-320');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Edit structured explanation', exact: true }));
      await focusId(page, 'aq-eco-evidence-claim', 'Empty CER directs editing to the first missing field');
      await fillEvidence(page, { claim: '  abcde  ', evidence: '  fghijk  ', reasoning: '  lmnopqrs  ', nextTest: 'An optional next test does not replace the required CER minimum.' });
      assert(await snapshot(page).isDisabled() && await comparison(page).isDisabled(), '19 total trimmed CER characters stay below the shared minimum even with a long next test');
      await page.locator('#aq-eco-evidence-reasoning').fill('  lmnopqrst  ');
      assert(await snapshot(page).isEnabled() && await comparison(page).isEnabled(), '20 total trimmed CER characters reach the shared minimum');
      await page.locator('#aq-eco-evidence-evidence').fill('  ');
      assert(await snapshot(page).isDisabled() && await comparison(page).isDisabled(), 'A blank Evidence field blocks structured-only saving even when other fields have enough text');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Edit structured explanation', exact: true }));
      await focusId(page, 'aq-eco-evidence-evidence', 'Edit structured explanation focuses the first missing required CER field');
      await fillEvidence(page, emptyEvidence);
      await page.locator('#aq-eco-observation').fill('  1234567890123456789  ');
      assert(await snapshot(page).isDisabled() && await comparison(page).isDisabled(), 'A 19-character trimmed reflection keeps both controls disabled');
      await page.locator('#aq-eco-observation').fill('  12345678901234567890  ');
      assert(await snapshot(page).isEnabled() && await comparison(page).isEnabled(), 'A 20-character trimmed reflection enables both otherwise eligible controls with empty structured fields');
      const beforeFreeform = await workspace(page);
      await screenshotAndAudit(page, 'sample-freeform-minimum-320', origin, true);
      const saved = await saveAndCheck(page, 'comparison', beforeFreeform, 'Freeform minimum comparison');
      equal(saved.record.evidence, emptyEvidence, 'Freeform save does not generate CER fields');
      equal(saved.record.observation, '12345678901234567890', 'Freeform save retains the existing trimmed reflection behavior');
      await exportAndReload(page, saved.record, saved.after, 'freeform-minimum-320');
      assert(errors.length === 0, 'Snapshot/minimum runtime errors: ' + errors.join('; '));
      results.push({ case: 'structured snapshot and shared writing minimums', width: 320, checks: ['structured-only zero-reflection snapshot/export/reload', 'exact own fields and empty optional next test', 'trimmed CER 19/20 boundary', 'all three CER fields required', 'optional next test does not count', 'first missing field focus', 'trimmed freeform 19/20 boundary', 'freeform exact metadata and empty CER export/reload', 'save-section screenshot, focused axe, reflow and forced colors'], errors });
      await page.close();
    }

    {
      const blockerResults = [];
      const cases = [
        { name: 'no-A', seed: seedFor(changed, { baselineScenario: null }), snapshotEnabled: true, comparisonEnabled: false, action: 'Set up scenario A', target: 'aq-eco-time-heading', text: /scenario A|baseline/i },
        { name: 'unchanged-inputs', seed: seedFor(baseline), snapshotEnabled: true, comparisonEnabled: false, action: 'Change starting oxygen', target: 'aq-eco-oxygen', text: /same|change.*input/i },
        { name: 'no-stock', seed: seedFor({ ...changed, organisms: {} }), snapshotEnabled: false, comparisonEnabled: true, action: 'Choose organisms', target: 'aq-eco-organisms-heading', text: /organism/i },
        { name: 'full-log', seed: (() => { const full = clone(seed); const originalRecord = full.ecosystemWorkspace.experiments[0]; full.ecosystemWorkspace.experiments = Array.from({ length: 12 }, (_, index) => ({ ...clone(originalRecord), id: 'capacity-' + index })); return full; })(), snapshotEnabled: false, comparisonEnabled: false, action: 'Review saved investigations', target: 'aq-saved-experiments-heading', text: /12|full/i }
      ];
      for (const item of cases) {
        const errors = [], page = await openSeeded(browser, url, 320, item.seed, errors), before = await workspace(page);
        equal(await snapshot(page).isEnabled(), item.snapshotEnabled, item.name + ' snapshot readiness matches its own model/design requirements');
        equal(await comparison(page).isEnabled(), item.comparisonEnabled, item.name + ' comparison readiness retains the existing empty-B stock-removal policy');
        assert(item.text.test(await readiness(page).innerText()), item.name + ' readiness visibly explains the blocker');
        await activateKeyboard(page, readiness(page).getByRole('button', { name: item.action, exact: true }));
        await focusId(page, item.target, item.name + ' keyboard action focuses its correct existing control or heading');
        equal(await workspace(page), before, item.name + ' readiness action does not save or mutate draft/settings/history');
        if (item.name === 'unchanged-inputs') {
          await page.keyboard.press('ArrowRight');
          const revised = await workspace(page);
          assert(revised.water.oxygen !== before.water.oxygen, 'Change starting oxygen target is a working native range');
          assert(await comparison(page).isEnabled(), 'One actual keyboard input change resolves the unchanged-input blocker');
        }
        if (item.name === 'full-log') {
          equal(before.experiments.length, 12, 'Full-log fixture actually contains 12 frozen records');
          equal((await workspace(page)).experiments, before.experiments, 'Full-log navigation leaves every existing record intact');
        }
        await screenshotAndAudit(page, 'blocker-' + item.name + '-320', origin, item.name === 'no-stock');
        assert(errors.length === 0, item.name + ' runtime errors: ' + errors.join('; '));
        blockerResults.push({ blocker: item.name, keyboardAction: item.action, focus: item.target, errors });
        await page.close();
      }
      results.push({ case: 'save blockers and specific keyboard repair targets', width: 320, checks: ['no A', 'unchanged inputs', 'no stocked snapshot organisms', '12-record capacity', 'correct focus and read-only readiness navigation', 'keyboard oxygen repair', 'all saved records and draft retained', 'focused axe and save-section reflow'], blockers: blockerResults });
    }

    {
      const errors = [], page = await openSeeded(browser, url, 320, fixtures.mixed, errors), before = await workspace(page);
      equal(before.measurements.length, 4, 'Mixed notebook includes one current, stale B, stale A and earlier-model capture');
      await checkCounts(page, { current: 1, earlierSettings: 2, earlierModel: 1, unavailable: 0 });
      assert(await snapshot(page).isEnabled() && await comparison(page).isEnabled(), 'Captured-reading freshness counts are advisory and do not block complete learner writing');
      await activateKeyboard(page, readiness(page).getByRole('button', { name: 'Review captured readings', exact: true }));
      await focusId(page, 'aq-measurement-notebook-heading');
      assert(await notebook(page).evaluate(element => element.open), 'Review opens the live notebook and focuses its heading');
      const note = id => notebook(page).locator('.aq-measurement-row[data-measurement-id="' + id + '"]');
      assert((await note('matches-current').innerText()).includes('Matches current settings'), 'Current captured reading has its existing notebook status');
      for (const id of ['earlier-b-settings', 'earlier-a-settings']) assert((await note(id).innerText()).includes('Frozen from earlier settings'), 'A and B input mismatches both remain earlier-settings readings');
      assert((await note('earlier-model-and-settings').innerText()).includes('Captured with an earlier model'), 'Earlier-model provenance takes one bucket even when settings also differ');
      const oldASettings = note('earlier-a-settings').locator('details');
      await activateKeyboard(page, oldASettings.locator(':scope > summary'), 'Space');
      assert((await oldASettings.innerText()).includes('A Temperature:'), 'Capture review identifies the changed A input');
      const oldBSettings = note('earlier-b-settings').locator('details');
      await activateKeyboard(page, oldBSettings.locator(':scope > summary'));
      assert((await oldBSettings.innerText()).includes('B Starting oxygen:'), 'Capture review identifies the changed B input');
      equal(await workspace(page), before, 'Count review and native capture disclosures never recalculate or mutate frozen readings');
      await screenshotAndAudit(page, 'sample-mixed-capture-counts-320', origin, true);
      const saved = await saveAndCheck(page, 'comparison', before, 'Comparison with mixed capture provenance');
      equal(saved.record.measurements, before.measurements, 'Earlier-settings and earlier-model captures all remain frozen in the saved record');
      await exportAndReload(page, saved.record, saved.after, 'mixed-capture-counts-320');
      await checkCounts(page, { current: 1, earlierSettings: 2, earlierModel: 1, unavailable: 0 });
      assert(errors.length === 0, 'Mixed-capture runtime errors: ' + errors.join('; '));
      results.push({ case: 'disjoint nonblocking capture provenance counts', width: 320, counts: { current: 1, earlierSettings: 2, earlierModel: 1, unavailable: 0 }, checks: ['actual model-generated frozen captures', 'current/stale B/stale A/model buckets sum to notebook total', 'earlier-model precedence prevents double counting', 'review action and native capture-settings disclosures', 'advisory counts allow save', 'all capture numbers/settings/model labels survive save/export/reload', 'save-section screenshot, focused axe, reflow and forced colors'], errors });
      await page.close();
    }

    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2));
    console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2));
    throw error;
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
