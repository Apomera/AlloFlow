/* Local AquacultureLab controlled-comparison QA. Run serially from the repository root. */
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
const multiple = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, temperature: 18, oxygen: 9.2, exchange: 90 } };
const bundled = { ...baseline, environmentId: 'raceway', organisms: { oyster: 3 }, water: { ...baseline.water, temperature: 18, salinity: 5, oxygen: 9.2, exchange: 90 }, disturbanceId: 'none' };
const baseTime = Date.UTC(2026, 9, 2, 15);
const writing = {
  claim: 'Starting oxygen may change the annual oxygen pattern in this modeled community.',
  evidence: 'I recorded the annual oxygen minimum and want to check which settings produced it.',
  reasoning: 'A focused comparison can help separate one input from the combined scenario.',
  nextTest: 'I would keep starting oxygen and restore temperature and exchange before explaining the response.'
};
function plainSeed(current = multiple) {
  return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...current, baselineScenario: baseline,
    prediction: 'If starting oxygen increases, the annual oxygen minimum may rise while the other settings stay steady.',
    observation: 'This is my unfinished comparison draft; I want to keep my explanation while adjusting the inputs.',
    evidence: { ...writing }, measurements: [], experiments: [], investigationId: '' } };
}
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual));
}
const isolation = page => page.locator('details.aq-input-isolation');
const input = page => page.locator('#aq-isolation-input');
const apply = page => isolation(page).getByRole('button', { name: 'Apply focused comparison', exact: true });
const undo = page => page.getByRole('button', { name: 'Undo input isolation', exact: true });
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const noteRow = (page, id) => notebook(page).locator('article.aq-measurement-row[data-measurement-id="' + id + '"]');
const card = (page, id) => page.locator('.aq-experiment-record[data-experiment-id="' + id + '"]');
function inputsOf(value) { return { environmentId: value.environmentId, organisms: value.organisms, water: value.water, disturbanceId: value.disturbanceId }; }
const protectedKeys = ['baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'experiments', 'investigationId', 'parkedDraft'];
function protectedOf(value) { return Object.fromEntries(protectedKeys.map(key => [key, value[key]])); }
async function workspace(page) {
  return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey);
}
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state: seed });
  await page.goto(url);
  await page.locator('.aq-investigation-loop').waitFor();
  return page;
}
async function activateKeyboard(page, locator, key = 'Enter') { await locator.focus(); await page.keyboard.press(key); }
async function openDetails(page, locator) {
  if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary'));
}
async function reveal(page, locator) {
  for (const ancestor of await locator.locator('xpath=ancestor::details').all()) await openDetails(page, ancestor);
  await locator.waitFor({ state: 'visible' });
}
async function focusIs(page, locator, label) { assert(await locator.evaluate(element => document.activeElement === element), label); }
async function focusHeading(page) { await page.waitForFunction(() => document.activeElement?.id === 'aq-isolation-heading'); }
async function announce(page, part) {
  await page.waitForFunction(text => document.getElementById('allo-live-aq')?.textContent.includes(text), part);
}
async function setRangeByKeyboard(page, id, target) {
  const slider = page.locator('#' + id);
  await reveal(page, slider); await slider.focus();
  const step = Number(await slider.getAttribute('step') || 1), current = Number(await slider.inputValue());
  const moves = Math.round(Math.abs(target - current) / step);
  assert(Math.abs(current + (target >= current ? 1 : -1) * moves * step - target) < .00001, 'Requested range value is reachable from the current value');
  for (let i = 0; i < moves; i++) await page.keyboard.press(target > current ? 'ArrowRight' : 'ArrowLeft');
  assert(Math.abs(Number(await slider.inputValue()) - target) < .00001, id + ' native keyboard range reached the requested value');
}
async function reflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(size.scroll <= size.width, label + ' horizontal overflow: ' + JSON.stringify(size));
}
async function axeAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const audit = await page.evaluate(async () => {
    const value = await axe.run({ include: ['.aq-input-isolation'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  });
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' WCAG A/AA failures: ' + JSON.stringify(audit.violations));
}
async function screenshotAndAudit(page, label, origin, forced = true) {
  await openDetails(page, isolation(page));
  await reflow(page, label);
  const sizes = await isolation(page).locator('select,button,:scope > summary').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of sizes) assert(item.height >= 43.5, 'Isolation control has a 44px minimum height: ' + JSON.stringify(item));
  await axeAudit(page, label, origin);
  await isolation(page).screenshot({ path: path.join(out, label + '.png') });
  if (forced) {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await reflow(page, label + ' forced colors');
    await axeAudit(page, label + '-forced-colors', origin);
    await isolation(page).screenshot({ path: path.join(out, label + '-forced-colors.png') });
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
  const record = page.getByRole('button', { name: 'Record annual result', exact: true });
  await activateKeyboard(page, record);
  const after = await workspace(page), ids = new Set(before.measurements.map(item => item.id));
  const note = after.measurements.find(item => !ids.has(item.id));
  assert(note && after.measurements.length === before.measurements.length + 1, 'One focused-result reading is recorded');
  equal({ a: note.a, b: note.b, modelVersion: note.modelVersion }, expected, 'New reading freezes actual current-model annual outputs');
  equal(note.currentScenario, inputsOf(after), 'New reading has the focused capture B settings');
  equal(after.experiments, before.experiments, 'Capture does not create completed evidence');
  return note;
}
async function actualSeed(bootstrap, current) {
  return bootstrap.evaluate(({ current, baseline, time, writing }) => {
    const h = window.AquacultureLearningHelpers;
    const priorB = { ...baseline, water: { ...baseline.water, oxygen: 8.6 } };
    const aRun = h.simulateEcosystemYear(baseline), bRun = h.simulateEcosystemYear(priorB);
    const priorNote = h.ecosystemMeasurement({ ...priorB, baselineScenario: baseline }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 3600000, 'original-annual-reading');
    const liveNote = h.ecosystemMeasurement({ ...current, baselineScenario: baseline }, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 60000, 'current-combined-reading');
    const parkedB = { ...baseline, water: { ...baseline.water, oxygen: 7.4 } };
    const parkedNote = h.ecosystemMeasurement(parkedB, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, time - 7200000, 'parked-annual-reading');
    const originalRecord = {
      id: 'previous-oxygen', title: 'Oyster and kelp: an earlier oxygen comparison', kind: 'comparison', savedAt: time - 3600000, modelVersion: bRun.modelVersion,
      environmentId: priorB.environmentId, organisms: priorB.organisms, baselineScenario: baseline, currentScenario: priorB,
      baselineSummary: aRun.summary, currentSummary: bRun.summary,
      prediction: 'A small starting-oxygen increase may change the annual minimum.',
      observation: 'In this earlier investigation I changed only starting oxygen and checked the annual minimum.',
      evidence: { claim: writing.claim, evidence: 'Annual lowest oxygen A ' + aRun.summary.minOxygen + ' mg/L; B ' + bRun.summary.minOxygen + ' mg/L.', reasoning: writing.reasoning, nextTest: writing.nextTest },
      measurements: priorNote ? [priorNote] : []
    };
    return { lastTopic: 'ecosystem', ecosystemWorkspace: { ...current, baselineScenario: baseline,
      prediction: 'If starting oxygen increases, the annual oxygen minimum may rise while the other settings stay steady.',
      observation: 'This is my unfinished comparison draft; I want to keep my explanation while adjusting the inputs.',
      evidence: writing, investigationId: '', measurements: liveNote ? [liveNote] : [], experiments: [originalRecord],
      parkedDraft: { ...parkedB, baselineScenario: null, prediction: 'My earlier draft tested a lower oxygen reference.',
        observation: 'This parked draft and its reading must remain available while I explore another design.',
        evidence: { claim: 'I want to investigate the lower reference oxygen.', evidence: 'I recorded the annual minimum.', reasoning: '', nextTest: '' },
        investigationId: '', measurements: parkedNote ? [parkedNote] : [] }
    } };
  }, { current, baseline, time: baseTime, writing });
}
async function choose(page, key) {
  await openDetails(page, isolation(page)); await input(page).focus(); await input(page).selectOption(key);
  await focusIs(page, input(page), 'Choosing an input preserves native select focus');
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    const bootstrapErrors = [], bootstrap = await openSeeded(browser, url, 1280, plainSeed(), bootstrapErrors);
    const seed = await actualSeed(bootstrap, multiple), bundledSeed = await actualSeed(bootstrap, bundled);
    assert(seed.ecosystemWorkspace.measurements.length === 1 && seed.ecosystemWorkspace.parkedDraft.measurements.length === 1, 'Actual model generated the live and parked reading fixtures');
    assert(bootstrapErrors.length === 0, 'Fixture-bootstrap runtime errors: ' + bootstrapErrors.join('; '));
    await bootstrap.close();

    for (const width of [1280, 390, 320]) {
      console.log('Controlled comparison QA: starting width ' + width);
      const errors = [], page = await openSeeded(browser, url, width, seed, errors);
      const before = await workspace(page);
      await isolation(page).waitFor();
      equal(await isolation(page).evaluate(element => element.open), false, 'Isolation starts as a collapsed native disclosure');
      await activateKeyboard(page, isolation(page).locator(':scope > summary'), 'Space');
      equal(await isolation(page).evaluate(element => element.open), true, 'Native disclosure opens with Space');
      equal(await page.getByLabel('Keep this B input', { exact: true }).getAttribute('id'), 'aq-isolation-input', 'Native isolation select has the expected accessible label');
      equal(await input(page).inputValue(), '', 'No changed input is silently selected');
      assert(await apply(page).isDisabled(), 'Apply is disabled until a valid changed input is chosen');
      equal(await input(page).locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean)), ['water.temperature', 'water.oxygen', 'water.exchange'], 'Native options use stable typed changed-input keys');
      assert(!(await input(page).evaluate(element => !!element.closest('[aria-live]'))), 'Interactive isolation controls are outside the broad live region');
      await input(page).focus(); await page.keyboard.press('Home'); await page.keyboard.press('End');
      equal(await input(page).inputValue(), 'water.exchange', 'Native selection responds to keyboard navigation');
      await choose(page, 'water.oxygen');
      equal(await page.locator('#aq-isolation-retained').innerText(), 'Starting oxygen: A 8 mg/L → B 9.2 mg/L', 'Preview names the exact retained input and values');
      equal(await isolation(page).locator('.aq-isolation-preview section').nth(1).locator('li').allTextContents(), ['Temperature: B 18°C → A 14°C', 'Water exchange setting: B 90 / 100 → A 82 / 100'], 'Preview names every restored input in the correct direction');
      assert((await page.locator('#aq-isolation-status').innerText()).includes('Preview only'), 'Selection is explicitly a preview');
      equal(await workspace(page), before, 'Native selection and preview are read-only');
      await screenshotAndAudit(page, 'sample-controlled-comparison-before-' + width, origin);

      await activateKeyboard(page, apply(page)); await focusHeading(page); await announce(page, 'One B input now differs from A: Starting oxygen');
      const focused = await workspace(page);
      const expected = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
      equal(inputsOf(focused), expected, 'Apply keeps one B water field and restores every other scenario input from fixed A');
      equal(protectedOf(focused), protectedOf(before), 'Apply preserves A, all learner writing, live/archive/parked notebooks, and saved originals');
      assert(await undo(page).isVisible(), 'Input-only Undo becomes available');
      assert(await apply(page).isDisabled(), 'Already-focused comparison has nothing else to restore');
      assert((await page.locator('#aq-isolation-status').innerText()).includes('Only Starting oxygen now differs'), 'Focused state explains the one retained difference');
      assert((await page.locator('#aq-eco-save-status').innerText()).includes('writing and captured readings are kept'), 'Apply explains preservation');
      assert((await page.locator('#aq-investigation-heading').innerText()) !== 'Evidence saved', 'Applying settings does not create completed evidence');
      await openDetails(page, notebook(page));
      assert((await noteRow(page, before.measurements[0].id).innerText()).includes('Frozen from earlier settings'), 'Earlier captured result automatically identifies stale input settings');
      await screenshotAndAudit(page, 'sample-controlled-comparison-focused-' + width, origin);

      // Chart/display and record-title changes are not input edits and retain Undo.
      await page.locator('#aq-season-species').selectOption('oyster');
      await page.locator('#aq-season-metric').selectOption('biomass');
      await activateKeyboard(page, page.getByRole('button', { name: /^Inspect Jul,/ }));
      equal(await workspace(page), focused, 'Chart-only changes preserve the focused scenario, writing, and frozen records');
      assert(await undo(page).isVisible(), 'Chart-only changes do not expire Undo');
      const originalName = card(page, 'previous-oxygen').locator('.aq-record-name-label input');
      await originalName.fill('Oyster and kelp: earlier oxygen evidence');
      const renamed = await workspace(page);
      assert(await undo(page).isVisible(), 'Record renaming does not expire Undo');
      equal({ ...renamed.experiments[0], title: focused.experiments[0].title }, focused.experiments[0], 'Rename retains every original scalar, species result, writing, and reading');

      const revisedObservation = 'After focusing the inputs, I need to compare the current annual minimum with the earlier combined result.';
      const revisedClaim = 'I can now investigate the starting-oxygen change while temperature and exchange match A.';
      await page.locator('#aq-eco-observation').fill(revisedObservation);
      await reveal(page, page.locator('#aq-eco-evidence-claim')); await page.locator('#aq-eco-evidence-claim').fill(revisedClaim);
      const newNote = await captureAnnual(page), afterWriting = await workspace(page);
      assert(await undo(page).isVisible(), 'New writing and captured readings do not expire input-only Undo');
      equal(afterWriting.measurements.length, 2, 'Focused capture is added beside the original reading');
      await activateKeyboard(page, undo(page)); await focusHeading(page); await announce(page, 'Input isolation undone. 3 inputs differ from A.');
      const restored = await workspace(page);
      equal(inputsOf(restored), inputsOf(before), 'Undo restores the complete original B inputs');
      equal(protectedOf(restored), protectedOf(afterWriting), 'Undo keeps later writing, notes, renamed original, fixed A, and parked work');
      equal(restored.observation, revisedObservation, 'Undo does not restore older observation text');
      equal(restored.evidence.claim, revisedClaim, 'Undo does not overwrite the new claim');
      await openDetails(page, notebook(page));
      assert((await noteRow(page, newNote.id).innerText()).includes('Frozen from earlier settings'), 'New focused capture retains its own settings after Undo');
      assert((await noteRow(page, before.measurements[0].id).innerText()).includes('Matches current settings'), 'Original combined reading matches the restored B inputs');
      equal(await undo(page).count(), 0, 'Undo is single-use');

      // Transient Undo never survives reload, while the real focused inputs do.
      await choose(page, 'water.oxygen'); await activateKeyboard(page, apply(page)); await focusHeading(page);
      const reloadBefore = await workspace(page);
      await page.reload(); await page.locator('.aq-investigation-loop').waitFor();
      equal(await workspace(page), reloadBefore, 'Reload retains focused inputs, all current writing/readings, originals, and parked draft');
      equal(await undo(page).count(), 0, 'Undo expires on reload');
      equal(await isolation(page).count(), 0, 'A single changed input without transient Undo does not add a planning panel');
      await reflow(page, 'Reloaded focused comparison ' + width);
      assert(errors.length === 0, 'Runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ width, checks: ['native disclosure/select keyboard and stable keys', 'preview purity and exact keep/restore values', 'one-water-input apply', 'fixed A and complete writing/notebook/archive/parked preservation', 'focus and short announcements', 'automatic capture freshness', 'chart-only and rename retain Undo', 'Undo preserves later writing and actual-model reading', 'single-use and reload expiry', 'normal/forced-colors scoped axe/reflow', 'actual current-model before/focused sample screenshots'], errors });
      await page.close();
      console.log('Controlled comparison QA: completed width ' + width);
    }

    // A selected key becoming equal to A must not silently select a new input.
    {
      const errors = [], page = await openSeeded(browser, url, 320, seed, errors);
      await choose(page, 'water.oxygen');
      await setRangeByKeyboard(page, 'aq-eco-oxygen', 8);
      await openDetails(page, isolation(page));
      equal(await input(page).inputValue(), '', 'Disappearing selected change leaves the placeholder');
      assert(await apply(page).isDisabled(), 'Disappearing selected change cannot apply an implicit replacement');
      assert((await page.locator('#aq-isolation-status').innerText()).includes('no longer differs from A'), 'Guard explains why another selection is needed');
      equal(await input(page).locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean)), ['water.temperature', 'water.exchange'], 'Remaining options contain only current differences');
      await screenshotAndAudit(page, 'selected-change-removed-320', origin);
      await choose(page, 'water.temperature'); await activateKeyboard(page, apply(page)); await focusHeading(page);
      assert(await undo(page).isVisible(), 'Valid replacement selection can apply');
      const oxygen = page.locator('#aq-eco-oxygen'); await reveal(page, oxygen); await oxygen.focus(); await page.keyboard.press('ArrowRight');
      equal(await undo(page).count(), 0, 'A real B input edit expires Undo');
      const changed = await workspace(page);
      assert(changed.water.oxygen !== changed.baselineScenario.water.oxygen, 'Undo-expiry case actually edited a B input');
      await choose(page, 'water.oxygen'); await activateKeyboard(page, apply(page)); await focusHeading(page);
      assert(await undo(page).isVisible(), 'A new isolation action creates a new Undo');
      const replaceA = page.getByRole('button', { name: 'Replace scenario A', exact: true });
      await reveal(page, replaceA); await activateKeyboard(page, replaceA);
      equal(await undo(page).count(), 0, 'Replacing A expires the guarded Undo');
      const newA = await workspace(page);
      equal(newA.baselineScenario, inputsOf(newA), 'A replacement used the actual current B scenario');
      equal(await isolation(page).count(), 0, 'No changed inputs and no Undo hide the isolation panel');
      await reflow(page, 'Input/A guard case at 320');
      assert(errors.length === 0, 'Input/A guard runtime errors: ' + errors.join('; '));
      results.push({ case: 'disappearing selection and input/A expiry at 320', checks: ['explicit placeholder after selected change vanishes', 'disabled apply with no implicit fallback', 'remaining stable keys', 'native range input expires Undo', 'A replacement expires Undo', 'scoped axe/reflow/forced colors'], errors });
      await page.close();
    }

    // Environment/disruption controls have bundled effects; operations copy exact
    // fields, rather than using the environment handler that resets water defaults.
    {
      const errors = [], page = await openSeeded(browser, url, 320, bundledSeed, errors);
      const before = await workspace(page);
      await choose(page, 'environment');
      assert(/several modeled relationships|combined environment response/.test(await isolation(page).locator('.aq-isolation-caution').innerText()), 'Environment preview explains bundled modeled effects');
      await activateKeyboard(page, apply(page)); await focusHeading(page);
      const keptEnvironment = await workspace(page);
      equal(inputsOf(keptEnvironment), { ...baseline, environmentId: 'raceway' }, 'Keeping environment changes only its ID and uses exact A water, stocks, and disturbance');
      equal(protectedOf(keptEnvironment), protectedOf(before), 'Environment isolation preserves all learner/provenance state');
      await screenshotAndAudit(page, 'environment-isolation-320', origin);
      await activateKeyboard(page, undo(page)); await focusHeading(page);
      equal(inputsOf(await workspace(page)), inputsOf(before), 'Environment Undo restores the prior complete B');
      await choose(page, 'disturbance');
      assert(/bundles several physical effects|combined event response/.test(await isolation(page).locator('.aq-isolation-caution').innerText()), 'Disturbance preview explains bundled physical effects');
      await activateKeyboard(page, apply(page)); await focusHeading(page);
      equal(inputsOf(await workspace(page)), { ...baseline, disturbanceId: 'none' }, 'Keeping disturbance restores exact A environment, water, and stocks');
      await activateKeyboard(page, undo(page)); await focusHeading(page);
      await choose(page, 'stock.kelp');
      equal(await page.locator('#aq-isolation-retained').innerText(), 'Sugar kelp: A 1 units → B 0 units', 'Stock removal is an explicit retained zero-count change');
      assert(/composition|species weighting/.test(await isolation(page).locator('.aq-isolation-caution').innerText()), 'Stock preview explains composition and weighting');
      await activateKeyboard(page, apply(page)); await focusHeading(page);
      const removed = await workspace(page);
      equal(inputsOf(removed), { ...baseline, organisms: { oyster: 2 } }, 'Keeping stock removal deletes the key, restores other stocks, and preserves exact A water/environment/event');
      assert(!Object.prototype.hasOwnProperty.call(removed.organisms, 'kelp'), 'Zero stock is represented as absence, without default stocking');
      equal(protectedOf(removed), protectedOf(before), 'Stock isolation keeps fixed A and all notebooks/writing/originals/parked work');
      await screenshotAndAudit(page, 'stock-removal-isolation-320', origin);
      const invalid = await page.evaluate(a => {
        const h = window.AquacultureLearningHelpers;
        const partialB = { environmentId: 'longline', organisms: { oyster: 2 }, water: { oxygen: 9 }, disturbanceId: 'none', baselineScenario: a };
        const partialA = { ...a, baselineScenario: { environmentId: 'longline', water: { oxygen: 8 } } };
        return [h.ecosystemIsolationPreview(partialB, 'water.oxygen'), h.ecosystemIsolationPreview(partialA, 'water.oxygen')];
      }, baseline);
      for (const value of invalid) {
        equal(value.valid, false, 'Incomplete provenance cannot form an isolation preview');
        equal(value.scenario, null, 'Incomplete provenance does not produce a default-filled scenario');
      }
      assert(invalid[0].reason.includes('No defaults were used'), 'Missing B settings explain the no-default guard');
      assert(errors.length === 0, 'Bundled/stock runtime errors: ' + errors.join('; '));
      results.push({ case: 'environment/disturbance/stock removal and incomplete input guard at 320', checks: ['environment field does not trigger defaults/event reset', 'exact fixed-A other inputs', 'environment/event/stock cautions', 'stock zero deletes key', 'full learner/provenance preservation', 'pure partial-A/B helper guard', 'normal/forced-colors scoped axe/reflow'], errors });
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
