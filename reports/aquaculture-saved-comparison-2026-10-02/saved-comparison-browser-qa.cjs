/* Local saved-investigation comparison QA. Run serially from the repository root. */
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

// Same HTTP React fixture as the saved-investigation and measurement QA scripts.
const original = fs.readFileSync(path.join(repo, 'dev-tools/aquatic_browser_qa.cjs'), 'utf8');
const start = original.indexOf('function harness(tool) {');
const end = original.indexOf('const server=http', start);
if (start < 0 || end <= start) throw Error('The reusable browser harness was not found.');
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

const water = { temperature: 14, salinity: 30, oxygen: 9, pH: 8, ammonia: .04, exchange: 82 };
const futureVersion = '2027.01-classroom';
const liveVersion = '2026.10-stock-feedback';
const baseTime = Date.UTC(2026, 9, 2, 15);
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, kelp: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const writing = {
  claim: 'Starting oxygen may help explain the modeled oxygen pattern.',
  evidence: 'I recorded annual oxygen and checked the July community response.',
  reasoning: 'The same stock and exchange setting let me examine one water input.',
  nextTest: 'Next I would change exchange while holding starting oxygen steady.'
};
function summary(patch = {}) {
  return {
    endingBiomass: 55.25, hasCrop: true, survival: 79, minOxygen: 7.1, peakAmmonia: .22,
    averageResilience: 67, riskMonths: 3, harvestUnits: 2, operatingEffort: 46,
    species: [
      { id: 'oyster', initialBiomass: 18, endingBiomass: 30, survival: 80, warningMonths: 3, progress: 82, ready: false },
      { id: 'kelp', initialBiomass: 9, endingBiomass: 25.25, survival: 77, warningMonths: 2, progress: 93, ready: false }
    ], ...patch
  };
}
function measurement(id, currentScenario, baselineScenario, patch = {}) {
  return {
    id, capturedAt: baseTime - 60000, modelVersion: futureVersion, scope: 'annual', month: null,
    speciesId: 'system', metricId: 'minOxygen', metricLabel: 'Annual lowest oxygen', unit: ' mg/L', deltaUnit: ' mg/L',
    aState: 'recorded', bState: 'recorded', a: 6.25, b: 7.1,
    baselineScenario, currentScenario, aEvent: '', bEvent: '', ...patch
  };
}
function annual(id, title, savedAt, oxygen, currentSummary, patch = {}) {
  const a = scenario({ water: { ...water, oxygen: 7 } });
  const b = scenario({ water: { ...water, oxygen } });
  return {
    id, title, savedAt, kind: 'comparison', modelVersion: futureVersion,
    environmentId: b.environmentId, organisms: b.organisms, status: 'Stable',
    baselineScenario: a, currentScenario: b,
    // Distinct original A values make accidentally comparing internal baselines detectable.
    baselineSummary: summary({ endingBiomass: 43.5, survival: 72, minOxygen: 6.25, peakAmmonia: .31 }),
    currentSummary, prediction: 'If starting oxygen increases, the annual oxygen minimum should rise.',
    observation: 'I kept stocking steady and checked the original annual oxygen minimum before explaining this result.',
    evidence: { ...writing }, measurements: [measurement('note-' + id, b, a, { b: currentSummary.minOxygen })], ...patch
  };
}
function records() {
  return [
    annual('recent', 'Higher starting oxygen with oyster and kelp', baseTime, 9.3,
      summary({ endingBiomass: 62.5, survival: 86, minOxygen: 8.35, peakAmmonia: .12, averageResilience: 78, riskMonths: 1, harvestUnits: 3, operatingEffort: 38,
        species: [
          { id: 'oyster', initialBiomass: 18, endingBiomass: 32, survival: 87, warningMonths: 1, progress: 92, ready: false },
          { id: 'kelp', initialBiomass: 9, endingBiomass: 30.5, survival: 85, warningMonths: 0, progress: 100, ready: true }
        ] })),
    annual('earlier', 'Reference oxygen with the same community', baseTime - 3600000, 7.8, summary()),
    annual('exchange', 'Exchange setting for a follow-up question', baseTime - 7200000, 8.4,
      summary({ minOxygen: 7.75, peakAmmonia: .16, endingBiomass: 59.1 }),
      { currentScenario: scenario({ water: { ...water, oxygen: 8.4, exchange: 90 } }) })
  ];
}
function initialState(experiments = records()) {
  const current = scenario({ water: { ...water, oxygen: 9.1 } });
  const baseline = scenario({ water: { ...water, oxygen: 8 } });
  return { lastTopic: 'ecosystem', ecosystemWorkspace: {
    ...current, baselineScenario: baseline,
    prediction: 'Increasing starting oxygen should increase the modeled annual minimum.',
    observation: 'This is my unfinished comparison draft; I want to preserve the readings and my explanation.',
    evidence: { ...writing }, investigationId: '',
    measurements: [measurement('live-reading', current, baseline, { modelVersion: liveVersion, a: 7.2, b: 8.15 })],
    experiments
  } };
}
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual));
}
const review = page => page.locator('details.aq-saved-comparison');
const body = page => review(page).locator('.aq-saved-review-body');
const firstSelect = page => page.locator('#aq-saved-review-first');
const secondSelect = page => page.locator('#aq-saved-review-second');
const card = (page, id) => page.locator('.aq-experiment-record[data-experiment-id="' + id + '"]');
const metricRow = (page, id) => body(page).locator(':scope > div > .aq-saved-review-results > [data-review-metric="' + id + '"]');
const draftKeys = ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId'];
function draftOf(value) { return Object.fromEntries(draftKeys.map(key => [key, value[key]])); }
async function workspace(page) {
  return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey);
}
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url);
  await review(page).waitFor();
  return page;
}
async function activateKeyboard(page, locator, key = 'Enter') {
  await locator.focus();
  await page.keyboard.press(key);
}
async function openDetails(page, locator) {
  if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary'));
}
async function revealThroughDetails(page, locator) {
  for (const ancestor of await locator.locator('xpath=ancestor::details').all()) await openDetails(page, ancestor);
  await locator.waitFor({ state: 'visible' });
}
async function selection(page) { return [await firstSelect(page).inputValue(), await secondSelect(page).inputValue()]; }
async function focusIs(page, locator, label) { assert(await locator.evaluate(element => document.activeElement === element), label); }
async function rowValues(locator) {
  return locator.locator(':scope > dl > div').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt').textContent, node.querySelector('dd').textContent])));
}
async function assertMetric(page, id, expected, label) { equal(await rowValues(metricRow(page, id)), expected, label); }
async function reflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size));
}
async function axeAudit(page, include, label, localOrigin) {
  if (!(await page.evaluate(() => !!window.axe))) {
    if (localOrigin) await page.addScriptTag({ url: localOrigin + '/axe.js' });
    else await page.addScriptTag({ content: fs.readFileSync(path.join(repo, 'node_modules/axe-core/axe.min.js'), 'utf8') });
  }
  const audit = await page.evaluate(async selectors => {
    const value = await axe.run({ include: selectors }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  }, include);
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function controlsSize(page) {
  const sizes = await body(page).locator('button,select').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of sizes) assert(item.height >= 43.5, 'Visible review control has a 44px minimum height: ' + JSON.stringify(item));
}
async function downloadReview(page, label) {
  const pending = page.waitForEvent('download');
  await activateKeyboard(page, body(page).getByRole('button', { name: 'Download comparison review', exact: true }));
  const download = await pending;
  assert(download.suggestedFilename().endsWith('.html'), 'Comparison review exports HTML');
  const filename = path.join(out, label + '.html');
  await download.saveAs(filename);
  return { filename, html: fs.readFileSync(filename, 'utf8') };
}
async function inspectReport(browser, report, width, originals, errors, label) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', error => errors.push('report: ' + error.message));
  await page.setContent(report.html, { waitUntil: 'load' });
  equal(await page.locator('h1').count(), 1, 'Comparison report has one h1');
  const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(node => Number(node.tagName.slice(1))));
  for (let i = 1; i < levels.length; i++) assert(levels[i] <= levels[i - 1] + 1, 'Comparison report heading order does not skip a level');
  equal(await page.locator('script,iframe,object,embed').count(), 0, 'Comparison report is inert');
  equal(await page.locator('.aq-saved-review-originals > .aq-archive-report').count(), 2, 'Report includes both complete original investigations');
  const text = await page.locator('body').innerText();
  assert(!/Invalid Date|NaN|undefined/.test(text), 'Report handles missing values with meaningful labels');
  assert(text.includes('First and Second are your selection order') && text.includes('Second minus First'), 'Report defines outer selection order independently of original A/B');
  for (let index = 0; index < originals.length; index++) {
    const record = originals[index], originalCard = page.locator('.aq-saved-review-originals > .aq-archive-report').nth(index);
    const originalText = await originalCard.innerText();
    assert(originalText.includes(record.title) && originalText.includes(record.prediction) && originalText.includes(record.observation), 'Report preserves original identity and learner writing');
    for (const value of Object.values(record.evidence)) if (value) assert(originalText.includes(value), 'Report preserves every nonempty original CER field');
    equal(await originalCard.locator('.aq-captured-measurements > section').count(), record.measurements.length, 'Report includes all original captured readings');
    for (const note of record.measurements) {
      assert(originalText.includes('A ' + note.a + note.unit + ' → B ' + note.b + note.unit), 'Report retains original measurement values');
      assert(originalText.includes('Capture A settings') && originalText.includes('Capture B settings'), 'Report retains independent capture settings');
    }
    if (record.kind === 'comparison') {
      assert(originalText.includes('Saved A settings') && originalText.includes('Saved B settings'), 'Each annual original retains its own A/B contexts');
      assert(originalText.includes('A ' + record.baselineSummary.minOxygen + ' mg/L → B ' + record.currentSummary.minOxygen + ' mg/L'), 'Each annual original retains its original A and B oxygen outputs');
    }
  }
  await reflow(page, label + ' report');
  await axeAudit(page, ['.aq-saved-review-report'], label + '-report', null);
  const outcomes = page.getByRole('heading', { name: 'Original saved outcomes', exact: true }).locator('xpath=..');
  await outcomes.screenshot({ path: path.join(out, label + '-report-outcomes-' + width + '.png') });
  await page.emulateMedia({ media: 'print' });
  await reflow(page, label + ' print');
  await outcomes.screenshot({ path: path.join(out, label + '-report-print-' + width + '.png') });
  if (width === 390) {
    const firstOriginal = page.locator('.aq-saved-review-originals').first();
    await firstOriginal.screenshot({ path: path.join(out, label + '-report-original-print-390.png') });
  }
  await page.close();
}
async function screenshotAndAudit(page, label, localOrigin, forced = true) {
  await reflow(page, label);
  await controlsSize(page);
  await axeAudit(page, ['.aq-saved-comparison'], label, localOrigin);
  await review(page).screenshot({ path: path.join(out, label + '.png') });
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await reflow(page, label + ' forced colors');
    await axeAudit(page, ['.aq-saved-comparison'], label + '-forced-colors', localOrigin);
    await review(page).screenshot({ path: path.join(out, label + '-forced-colors.png') });
    await page.emulateMedia({ forcedColors: 'none' });
  }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localOrigin = 'http://127.0.0.1:' + server.address().port;
  const url = localOrigin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390, 320]) {
      console.log('Saved comparison QA: starting width ' + width);
      const errors = [], page = await openSeeded(browser, url, width, initialState(), errors);
      const before = await workspace(page);
      equal(await review(page).evaluate(element => element.open), false, 'Saved review starts collapsed');
      await activateKeyboard(page, review(page).locator(':scope > summary'), 'Space');
      equal(await review(page).evaluate(element => element.open), true, 'Native disclosure opens with Space');
      equal(await selection(page), ['recent', 'earlier'], 'Startup defaults use newest two distinct saved IDs');
      equal(await page.getByLabel('First saved investigation', { exact: true }).getAttribute('id'), 'aq-saved-review-first', 'First native select has its accessible name');
      equal(await page.getByLabel('Second saved investigation', { exact: true }).getAttribute('id'), 'aq-saved-review-second', 'Second native select has its accessible name');
      assert(await firstSelect(page).locator('option[value="earlier"]').isDisabled(), 'Other selected investigation cannot be chosen twice');
      await assertMetric(page, 'minOxygen', { First: '8.35 mg/L', Second: '7.1 mg/L', 'Second minus First': '-1.25 mg/L (Second minus First)' }, 'Original B oxygen values, not baselines or rerun values');
      await assertMetric(page, 'peakAmmonia', { First: '0.12 mg/L', Second: '0.22 mg/L', 'Second minus First': '+0.1 mg/L (Second minus First)' }, 'Original ammonia values');
      await assertMetric(page, 'endingBiomass', { First: '62.5 index points', Second: '55.25 index points', 'Second minus First': '-7.25 index points (Second minus First)' }, 'Original ending biomass values');
      await assertMetric(page, 'survival', { First: '86%', Second: '79%', 'Second minus First': '-7 percentage points (Second minus First)' }, 'Survival differences use percentage points');
      assert((await body(page).innerText()).includes(futureVersion), 'Both original recorded model versions are visible');
      equal(await body(page).locator('.aq-measurement-notebook,.aq-measurement-row').count(), 0, 'Compact review shows note counts without embedding notebooks');
      assert((await body(page).innerText()).includes('1 captured reading kept with this original record'), 'Compact review indicates preserved reading counts');
      equal(await body(page).locator('details.aq-saved-review-more').evaluate(element => element.open), false, 'Additional readings start collapsed');
      await openDetails(page, body(page).locator('details.aq-saved-review-more'));
      assert((await body(page).locator('details.aq-saved-review-more').innerText()).includes('Operating effort'), 'Native additional-readings disclosure shows original outputs');
      await openDetails(page, body(page).locator('details.aq-saved-review-species'));
      const oyster = body(page).locator('.aq-saved-review-species-row').filter({ has: page.locator('summary', { hasText: 'Eastern oyster' }) });
      await openDetails(page, oyster);
      equal(await rowValues(oyster.locator('[data-review-metric="survival"]')), { First: '87%', Second: '80%', 'Second minus First': '-7 percentage points (Second minus First)' }, 'Species review uses original B outcomes');
      await activateKeyboard(page, oyster.locator(':scope > summary'));
      await activateKeyboard(page, body(page).locator('details.aq-saved-review-species > summary'));
      await activateKeyboard(page, body(page).locator('details.aq-saved-review-more > summary'));

      await firstSelect(page).focus();
      await firstSelect(page).selectOption('exchange');
      await focusIs(page, firstSelect(page), 'Changing selection retains native select focus');
      await firstSelect(page).selectOption('recent');
      equal(await workspace(page), before, 'Selection and disclosures do not mutate the live draft or saved records');
      const swap = body(page).getByRole('button', { name: 'Swap selected investigations', exact: true });
      await activateKeyboard(page, swap);
      equal(await selection(page), ['earlier', 'recent'], 'Swap reverses selected record IDs');
      await assertMetric(page, 'minOxygen', { First: '7.1 mg/L', Second: '8.35 mg/L', 'Second minus First': '+1.25 mg/L (Second minus First)' }, 'Swap reverses numeric direction');
      await focusIs(page, swap, 'Swap retains button focus');
      equal(await workspace(page), before, 'Swap is read-only for the workspace');
      await activateKeyboard(page, body(page).getByRole('button', { name: 'Review first saved investigation', exact: true }));
      equal(await card(page, 'earlier').locator('.aq-saved-inputs').evaluate(element => element.open), true, 'Review first opens its original saved details');
      await focusIs(page, card(page, 'earlier').locator('h4[id]'), 'Review first focuses its original record heading');
      await activateKeyboard(page, body(page).getByRole('button', { name: 'Review second saved investigation', exact: true }));
      await focusIs(page, card(page, 'recent').locator('h4[id]'), 'Review second focuses the correct original record heading');
      equal(await workspace(page), before, 'Review-original links do not replay or rewrite the draft');
      await activateKeyboard(page, swap);

      const longTitle = 'Oyster and kelp community investigation comparing oxygen settings during the summer heatwave response'.slice(0, 80);
      const nameBox = card(page, 'recent').locator('.aq-record-name-label input');
      await nameBox.fill(longTitle);
      await focusIs(page, nameBox, 'Renaming retains text-field focus');
      equal(await selection(page), ['recent', 'earlier'], 'Rename preserves stable selected IDs');
      equal(await firstSelect(page).locator('option[value="recent"]').innerText(), longTitle, 'Selected option follows the renamed title');
      const renamed = await workspace(page);
      equal(draftOf(renamed), draftOf(before), 'Rename preserves all live learner writing and readings');
      equal({ ...renamed.experiments[0], title: before.experiments[0].title }, before.experiments[0], 'Rename changes only the original record title');
      await activateKeyboard(page, card(page, 'earlier').getByRole('button', { name: /^Remove experiment/ }));
      equal(await selection(page), ['recent', ''], 'Removing a selected record leaves its placeholder and retains the other side');
      assert(/unavailable.*replacement.*other selection was kept/i.test(await page.locator('#aq-saved-review-status').innerText()), 'Removal gives a replacement explanation');
      await page.waitForFunction(() => document.activeElement?.id === 'aq-saved-experiments-heading');
      assert(await body(page).getByRole('button', { name: 'Download comparison review', exact: true }).isDisabled(), 'Incomplete pair cannot export a misleading review');
      await activateKeyboard(page, page.getByRole('button', { name: 'Undo remove', exact: true }));
      equal(await selection(page), ['recent', 'earlier'], 'Undo restores the selected ID without choosing a different record');
      await page.waitForFunction(() => document.activeElement?.id === 'aq-saved-experiments-heading');
      equal(await workspace(page), renamed, 'Undo restores the complete original record and preserves the draft');
      await screenshotAndAudit(page, 'frozen-saved-comparison-' + width, localOrigin);

      const report = await downloadReview(page, 'comparison-review-' + width);
      await inspectReport(browser, report, width, renamed.experiments.slice(0, 2), errors, 'comparison-' + width);
      equal(await workspace(page), renamed, 'Report download is read-only');

      await activateKeyboard(page, card(page, 'recent').getByRole('button', { name: /^Use saved B as A for experiment/ }));
      const branched = await workspace(page);
      equal(branched.measurements, [], 'Branch begins with an empty measurement notebook');
      equal(draftOf(branched.parkedDraft), draftOf(renamed), 'Branch parks the complete earlier design, notebook, and writing');
      equal(branched.experiments, renamed.experiments, 'Branch keeps both archived originals unchanged');
      const prediction = page.locator('#aq-eco-prediction');
      await prediction.waitFor({ state: 'visible' });
      const nextPrediction = 'If I increase exchange, the annual oxygen minimum may rise because more water is renewed.';
      await prediction.focus();
      await page.keyboard.type(nextPrediction);
      await focusIs(page, prediction, 'Prediction typing retains focus through controlled updates');
      equal((await workspace(page)).prediction, nextPrediction, 'A-based fresh branch accepts a full next-test prediction');
      const oxygen = page.locator('#aq-eco-oxygen');
      await revealThroughDetails(page, oxygen);
      await oxygen.focus(); await page.keyboard.press('ArrowRight');
      equal(await page.locator('#aq-eco-prediction').count(), 0, 'Prediction becomes the original expectation after a scenario change');
      equal((await workspace(page)).prediction, nextPrediction, 'Changing B preserves the typed prediction');
      assert((await page.locator('.aq-loop-prediction-record').innerText()).includes(nextPrediction), 'Recorded prediction remains visible');
      const parked = await workspace(page);
      await firstSelect(page).selectOption('exchange');
      await activateKeyboard(page, swap);
      equal(await workspace(page), parked, 'Saved review remains read-only while a learner draft is parked');
      assert(!(await body(page).getByRole('button', { name: 'Download comparison review', exact: true }).isDisabled()), 'Read-only review export remains available while parked');
      await activateKeyboard(page, page.getByRole('button', { name: 'Return to my draft', exact: true }));
      const returned = await workspace(page);
      equal(draftOf(returned), draftOf(renamed), 'Return restores the complete earlier notebook and all learner writing');
      equal(returned.parkedDraft, null, 'Return clears the parked draft');
      equal(returned.experiments, renamed.experiments, 'Return preserves all frozen originals');
      await reflow(page, 'Returned draft ' + width);
      assert(errors.length === 0, 'Runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ width, checks: ['native disclosure/selects and focus', 'frozen original B values from future recorded version', 'internal A/B distinction', 'additional/species disclosures', 'selection and swap read-only', 'review-original focus', 'rename stable ID', 'remove replacement and undo focus', 'normal and forced-color axe/reflow', 'inert full-original HTML and print report', 'fresh branch prediction typing and freeze', 'parked read-only review', 'full draft/notebook restoration'], errors });
      await page.close();
      console.log('Saved comparison QA: completed width ' + width);
    }

    // Distinct scope definitions remain separate; annual minima are not snapshots.
    {
      const errors = [], yearly = records()[1];
      const snap = { id: 'snapshot', title: 'Direct preview before the seasonal run', savedAt: baseTime, kind: 'snapshot', modelVersion: futureVersion,
        environmentId: 'longline', organisms: { oyster: 2, kelp: 1 }, currentScenario: scenario(), status: 'Watch',
        oxygen: 9.8, ammonia: .08, carryingPressure: 48, resilience: 76, prediction: 'I will inspect the starting water conditions.',
        observation: 'This direct preview is a starting snapshot, not the annual oxygen minimum.', evidence: { ...writing }, measurements: [] };
      const page = await openSeeded(browser, url, 320, initialState([snap, yearly]), errors);
      const before = await workspace(page);
      await openDetails(page, review(page));
      const text = await body(page).innerText();
      assert(text.includes('Different result scopes') && text.includes('Saved direct preview') && text.includes('Original B annual results'), 'Mixed-scope review explains both original definitions');
      const annualValues = await rowValues(metricRow(page, 'minOxygen'));
      equal({ First: annualValues.First, Second: annualValues.Second }, { First: 'Not recorded', Second: '7.1 mg/L' }, 'Snapshot does not invent an annual minimum');
      const snapshotValues = await rowValues(metricRow(page, 'oxygen'));
      equal({ First: snapshotValues.First, Second: snapshotValues.Second }, { First: '9.8 mg/L', Second: 'Not recorded' }, 'Annual record does not substitute a snapshot oxygen value');
      for (const values of [annualValues, snapshotValues]) assert(values['Second minus First'].startsWith('No numeric difference'), 'Mixed-scope numeric delta is withheld');
      equal(await workspace(page), before, 'Mixed-scope reading is read-only');
      await screenshotAndAudit(page, 'mixed-scope-320', localOrigin);
      const report = await downloadReview(page, 'mixed-scope-review-320');
      await inspectReport(browser, report, 320, before.experiments, errors, 'mixed-scope');
      assert(errors.length === 0, 'Mixed-scope runtime errors: ' + errors.join('; '));
      results.push({ case: 'mixed scopes at 320', checks: ['union of original metric definitions', 'no cross-scope delta', 'scope provenance', 'read-only', 'axe/forced colors/reflow', 'full-original report'], errors });
      await page.close();
    }

    // Matching metric names do not prove matching rules across recorded versions.
    {
      const errors = [], pair = records().slice(0, 2);
      pair[1].modelVersion = '2026.09-classroom';
      const page = await openSeeded(browser, url, 320, initialState(pair), errors);
      await openDetails(page, review(page));
      const values = await rowValues(metricRow(page, 'minOxygen'));
      equal({ First: values.First, Second: values.Second }, { First: '8.35 mg/L', Second: '7.1 mg/L' }, 'Different model versions preserve both original values');
      assert(values['Second minus First'].startsWith('No numeric difference') && /Different recorded model versions/.test(await body(page).innerText()), 'Model mismatch withholds a numerical delta with context');
      await screenshotAndAudit(page, 'different-models-320', localOrigin);
      assert(errors.length === 0, 'Model-version runtime errors: ' + errors.join('; '));
      results.push({ case: 'different recorded model versions at 320', checks: ['original scalars retained', 'model mismatch context and delta guard', 'axe/forced colors/reflow'], errors });
      await page.close();
    }

    // Partial provenance, absent values, valid zero, and fixed support stay distinct.
    {
      const errors = [];
      const legacy = { id: 'legacy', title: 'Older oyster study with incomplete settings', kind: 'comparison', savedAt: 0,
        currentScenario: { water: { oxygen: 8 } }, baselineScenario: { environmentId: 'longline' },
        currentSummary: { endingBiomass: 77, survival: 73 }, baselineSummary: { endingBiomass: 65, survival: 68 },
        prediction: 'My earlier question concerned the oyster community.', observation: 'The original biomass and survival values were saved, but the full inputs were not.', evidence: {}, measurements: [] };
      const supportScenario = scenario({ environmentId: 'raceway', organisms: { nitrifiers: 1 }, water: { ...water, salinity: 0, oxygen: 7 } });
      const support = annual('support', 'Nitrifier-only support system', baseTime - 3600000, 7,
        summary({ endingBiomass: 0, hasCrop: false, survival: 0, minOxygen: 6.4, peakAmmonia: .07, harvestUnits: 0,
          species: [{ id: 'nitrifiers', initialBiomass: 0, endingBiomass: 0, survival: 0, warningMonths: 3, progress: 0, ready: false }] }),
        { environmentId: 'raceway', organisms: { nitrifiers: 1 }, currentScenario: supportScenario, baselineScenario: supportScenario, measurements: [] });
      const page = await openSeeded(browser, url, 320, initialState([legacy, support]), errors);
      const before = await workspace(page);
      await openDetails(page, review(page));
      const text = await body(page).innerText();
      assert(text.includes('Date not recorded') && text.includes('Model version not recorded'), 'Legacy identity does not invent a date or model');
      assert(text.includes('Full saved B settings were not recorded') && text.includes('Full original B settings were not recorded'), 'Partial settings remain explicitly unavailable');
      const oxygenValues = await rowValues(metricRow(page, 'minOxygen'));
      equal({ First: oxygenValues.First, Second: oxygenValues.Second }, { First: 'Not recorded', Second: '6.4 mg/L' }, 'Missing historical oxygen remains missing');
      const biomass = await rowValues(metricRow(page, 'endingBiomass'));
      equal({ First: biomass.First, Second: biomass.Second }, { First: '77 index points', Second: '0 index points' }, 'Recorded historical biomass and valid zero are retained');
      const survival = await rowValues(metricRow(page, 'survival'));
      assert(survival.First.startsWith('73%') && survival.Second === 'Not applicable', 'Fixed support is not represented as zero-percent survival');
      assert(survival['Second minus First'].startsWith('No numeric difference'), 'Support and legacy provenance suppress an inapplicable survival delta');
      await openDetails(page, body(page).locator('details.aq-saved-review-species'));
      const nitrifier = body(page).locator('.aq-saved-review-species-row').filter({ has: page.locator('summary', { hasText: /nitrif/i }) });
      await openDetails(page, nitrifier);
      const speciesSurvival = await rowValues(nitrifier.locator('[data-review-metric="survival"]'));
      equal({ First: speciesSurvival.First, Second: speciesSurvival.Second }, { First: 'Not recorded', Second: 'Not applicable' }, 'Partial historical stocking cannot be labeled not stocked');
      const warning = await rowValues(nitrifier.locator('[data-review-metric="warningMonths"]'));
      equal(warning.Second, '3 months', 'Fixed support retains applicable warning-month output');
      equal(await workspace(page), before, 'Legacy and support review is read-only');
      await screenshotAndAudit(page, 'legacy-support-320', localOrigin);
      const report = await downloadReview(page, 'legacy-support-review-320');
      const reportPage = await browser.newPage({ viewport: { width: 320, height: 900 } });
      reportPage.on('pageerror', error => errors.push('legacy report: ' + error.message));
      await reportPage.setContent(report.html);
      equal(await reportPage.locator('script,iframe,object,embed').count(), 0, 'Legacy review export is inert');
      equal(await reportPage.locator('.aq-saved-review-originals > .aq-archive-report').count(), 2, 'Legacy export includes both originals');
      const originalLegacy = reportPage.locator('.aq-saved-review-originals > .aq-archive-report').first();
      equal(await originalLegacy.locator('.aq-archive-settings').count(), 0, 'Partial original settings do not export default water or community');
      assert((await originalLegacy.innerText()).includes('Not recorded') && (await originalLegacy.innerText()).includes('77 index points'), 'Legacy report preserves missing-state context and original numeric outcomes');
      assert(!/Invalid Date|NaN|undefined/.test(await reportPage.locator('body').innerText()), 'Legacy export does not leak invalid scalar labels');
      await reflow(reportPage, 'Legacy/support report at 320');
      await axeAudit(reportPage, ['.aq-saved-review-report'], 'legacy-support-report-320', null);
      await reportPage.emulateMedia({ media: 'print' });
      await reflow(reportPage, 'Legacy/support print at 320');
      await reportPage.close();
      assert(errors.length === 0, 'Legacy/support runtime errors: ' + errors.join('; '));
      results.push({ case: 'legacy partial provenance and fixed support at 320', checks: ['missing date/version/settings', 'unrecorded differs from valid zero', 'support survival N/A', 'partial species not recorded', 'support warning months retained', 'axe/forced colors/reflow', 'export does not invent default settings'], errors });
      await page.close();
    }

    // Representative previews use actual current-model outputs, separate from the
    // historical/future frozen-value fixtures above. Root can copy only sample-*.
    {
      const sampleErrors = [];
      const bootstrap = await openSeeded(browser, url, 1280, initialState([]), sampleErrors);
      const actualSeed = await bootstrap.evaluate(({ water, savedAt }) => {
        const h = window.AquacultureLearningHelpers;
        const design = oxygen => ({ environmentId: 'longline', organisms: { oyster: 2, kelp: 1 }, water: { ...water, oxygen }, disturbanceId: 'heatwave' });
        const baseline = design(8), baselineRun = h.simulateEcosystemYear(baseline);
        function savedRecord(id, title, oxygen, time) {
          const current = design(oxygen), run = h.simulateEcosystemYear(current);
          const context = { ...current, baselineScenario: baseline };
          const note = h.ecosystemMeasurement(context, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 60000, 'sample-' + id);
          return {
            id, title, savedAt: time, kind: 'comparison', modelVersion: run.modelVersion,
            environmentId: current.environmentId, organisms: current.organisms,
            baselineScenario: baseline, currentScenario: current,
            baselineSummary: baselineRun.summary, currentSummary: run.summary,
            prediction: 'Increasing starting oxygen should increase the modeled annual oxygen minimum while stock and exchange stay steady.',
            observation: 'I compared the annual oxygen minimum, then checked the July heatwave response before explaining the pattern.',
            evidence: {
              claim: 'The model provides a way to investigate how starting oxygen affects this community.',
              evidence: 'Annual lowest oxygen: A ' + baselineRun.summary.minOxygen + ' mg/L; B ' + run.summary.minOxygen + ' mg/L. These are modeled readings.',
              reasoning: 'I held oyster and kelp stock, exchange, and the heatwave setting steady for this comparison.',
              nextTest: 'Next I would change exchange while keeping starting oxygen and stocking steady.'
            }, measurements: note ? [note] : []
          };
        }
        const experiments = [
          savedRecord('sample-high', 'Oyster and kelp: higher starting oxygen', 9.2, savedAt),
          savedRecord('sample-small', 'Oyster and kelp: smaller oxygen increase', 8.6, savedAt - 3600000)
        ];
        return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...design(9.2), baselineScenario: baseline,
          prediction: experiments[0].prediction, observation: experiments[0].observation,
          evidence: experiments[0].evidence, measurements: experiments[0].measurements, experiments } };
      }, { water, savedAt: baseTime });
      await bootstrap.close();
      for (const width of [1280, 390, 320]) {
        const page = await openSeeded(browser, url, width, actualSeed, sampleErrors);
        await openDetails(page, review(page));
        const actual = await workspace(page), one = actual.experiments[0], two = actual.experiments[1];
        equal(await selection(page), ['sample-high', 'sample-small'], 'Representative preview selects the two actual current-model records');
        const values = await rowValues(metricRow(page, 'minOxygen'));
        equal({ First: values.First, Second: values.Second }, { First: one.currentSummary.minOxygen + ' mg/L', Second: two.currentSummary.minOxygen + ' mg/L' }, 'Representative preview displays actual saved model outputs');
        assert(!one.modelVersion.startsWith('2027.') && one.modelVersion === two.modelVersion, 'Representative preview uses the current model version');
        await screenshotAndAudit(page, 'sample-saved-comparison-' + width, localOrigin, width === 390);
        if (width === 390) {
          const report = await downloadReview(page, 'sample-comparison-review-390');
          await inspectReport(browser, report, width, actual.experiments, sampleErrors, 'sample-comparison');
        }
        equal(await workspace(page), actual, 'Representative preview and download do not mutate the draft');
        await page.close();
      }
      assert(sampleErrors.length === 0, 'Actual-model preview runtime errors: ' + sampleErrors.join('; '));
      results.push({ case: 'representative current-model previews at 1280/390/320', checks: ['simulateEcosystemYear original A/B outputs', 'ecosystemMeasurement capture provenance', 'actual current model and learner wording', 'phone/desktop screenshots', 'forced colors at 390', 'inert complete report and print', 'scoped axe/reflow'], errors: sampleErrors });
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
