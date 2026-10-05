/* Local AquacultureLab measurement notebook QA. Run serially. */
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

// Reuse the HTTP React fixture used by aquaculture_saved_browser.cjs.
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
const scenario = (patch = {}) => ({
  environmentId: 'longline', organisms: { oyster: 2, kelp: 1 },
  water: { ...water }, disturbanceId: 'heatwave', ...patch
});
const originalWriting = {
  claim: 'Higher starting oxygen should increase the modeled oxygen reading.',
  evidence: 'I am comparing the same community under two oxygen settings.',
  reasoning: 'The stock and exchange settings are held fixed.',
  nextTest: 'Next I would test exchange while keeping starting oxygen fixed.'
};
function initialState() {
  return { lastTopic: 'ecosystem', ecosystemWorkspace: scenario({
    baselineScenario: scenario({ water: { ...water, oxygen: 8 } }),
    prediction: 'If starting oxygen rises by one mg/L, the model oxygen reading should also rise.',
    observation: 'I will compare annual oxygen and the July species response before explaining the pattern.',
    evidence: { ...originalWriting }, measurements: [], experiments: []
  }) };
}
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual));
}
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const liveRows = page => notebook(page).locator('article.aq-measurement-row');
const rowFor = (page, note) => notebook(page).locator('article.aq-measurement-row[data-measurement-id="' + note.id + '"]');
const card = (page, id) => page.locator('.aq-experiment-record[data-experiment-id="' + id + '"]');
const draftKeys = ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId'];
function draftOf(value) { return Object.fromEntries(draftKeys.map(key => [key, value[key]])); }
async function workspace(page) {
  return page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    return window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(state.ecosystemWorkspace);
  }, storageKey);
}
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => {
    // Preserve the actual persisted state on reload.
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: storageKey, state: seed });
  await page.goto(url);
  await page.locator('#aq-measurement-annual-metric').waitFor();
  await notebook(page).waitFor();
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
    return {
      violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
      incomplete: value.incomplete.map(item => item.id)
    };
  }, include);
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' WCAG A/AA failures: ' + JSON.stringify(audit.violations));
  return audit;
}
async function expectedValue(page, selection) {
  return page.evaluate(({ key, selection }) => {
    const h = window.AquacultureLearningHelpers;
    const ws = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
    const a = ws.baselineScenario ? h.simulateEcosystemYear(ws.baselineScenario) : null;
    const b = h.simulateEcosystemYear(ws);
    const shared = ['oxygen', 'ammonia', 'temperature', 'carryingPressure', 'resilience', 'effort'].includes(selection.metricId);
    function point(run) {
      if (!run) return null;
      const value = selection.scope === 'annual' ? run.summary : run.timeline[selection.month];
      return selection.scope === 'month' && !shared && selection.speciesId !== 'system'
        ? value.species.find(item => item.id === selection.speciesId) : value;
    }
    return {
      a: point(a)?.[selection.metricId] ?? null, b: point(b)?.[selection.metricId] ?? null,
      aEvent: selection.scope === 'month' && a ? a.timeline[selection.month].event : '',
      bEvent: selection.scope === 'month' ? b.timeline[selection.month].event : '',
      currentScenario: { environmentId: ws.environmentId, organisms: ws.organisms, water: ws.water, disturbanceId: ws.disturbanceId },
      baselineScenario: ws.baselineScenario,
      modelVersion: b.modelVersion
    };
  }, { key: storageKey, selection });
}
async function capture(page, kind, selection) {
  const before = await workspace(page);
  const expected = await expectedValue(page, selection);
  const button = page.getByRole('button', { name: kind === 'annual' ? 'Record annual result' : 'Record inspected result', exact: true });
  await revealThroughDetails(page, button);
  await activateKeyboard(page, button);
  const after = await workspace(page);
  equal(after.measurements.length, before.measurements.length + 1, kind + ' records one note');
  const ids = new Set(before.measurements.map(item => item.id));
  const note = after.measurements.find(item => !ids.has(item.id));
  assert(note, kind + ' new note has its own identity');
  equal(note.scope, selection.scope, kind + ' scope');
  equal(note.metricId, selection.metricId, kind + ' selected metric');
  equal(note.month, kind === 'annual' ? null : selection.month, kind + ' inspected month');
  const shared = ['oxygen', 'ammonia', 'temperature', 'carryingPressure', 'resilience', 'effort'].includes(selection.metricId);
  equal(note.speciesId, kind === 'annual' || shared ? 'system' : selection.speciesId, kind + ' species/shared scope');
  equal({ a: note.a, b: note.b }, { a: expected.a, b: expected.b }, kind + ' freezes values from the selected result');
  equal(note.currentScenario, expected.currentScenario, kind + ' exact capture B settings');
  equal(note.baselineScenario, expected.baselineScenario, kind + ' exact capture A settings');
  equal(note.modelVersion, expected.modelVersion, kind + ' captured model version');
  equal({ aEvent: note.aEvent, bEvent: note.bEvent }, { aEvent: expected.aEvent || '', bEvent: expected.bEvent || '' }, kind + ' exact month event');
  equal(after.evidence, before.evidence, 'Capture does not write a CER explanation');
  equal(after.observation, before.observation, 'Capture preserves the learner observation');
  equal(after.prediction, before.prediction, 'Capture preserves the prediction');
  equal(after.experiments, before.experiments, 'Capture does not create completed evidence');
  await openDetails(page, notebook(page));
  equal(await rowFor(page, note).count(), 1, 'Live note row has stable measurement ID');
  assert((await rowFor(page, note).innerText()).includes('Matches current settings'), 'New note matches current settings');
  await page.waitForFunction(() => document.activeElement?.id === 'aq-measurement-notebook-heading', undefined, { timeout: 5000 });
  return note;
}
async function downloadReport(page, recordId, width) {
  const pending = page.waitForEvent('download');
  await activateKeyboard(page, card(page, recordId).getByRole('button', { name: /^Download report for experiment/ }));
  const download = await pending;
  assert(download.suggestedFilename().endsWith('.html'), 'Report is HTML');
  const filename = path.join(out, 'measurement-investigation-' + width + '.html');
  await download.saveAs(filename);
  return { filename, html: fs.readFileSync(filename, 'utf8') };
}
async function inspectReport(browser, report, width, record, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', error => errors.push('report: ' + error.message));
  await page.setContent(report.html, { waitUntil: 'load' });
  equal(await page.locator('h1').count(), 1, 'Report has one h1');
  const headings = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(node => Number(node.tagName.slice(1))));
  for (let i = 1; i < headings.length; i++) assert(headings[i] <= headings[i - 1] + 1, 'Report heading hierarchy does not skip a level');
  const text = await page.locator('body').innerText();
  assert(!/Invalid Date|NaN|undefined/.test(text), 'Report has meaningful missing-state labels');
  assert(text.includes('Captured measurements') && text.includes('Capture A settings') && text.includes('Capture B settings'), 'Export retains measurement provenance and full settings');
  assert(text.includes('Earlier settings') || text.includes('Frozen from earlier settings'), 'Export distinguishes readings from earlier settings');
  assert(text.includes('Marine heatwave'), 'Export retains the captured July event');
  assert(text.includes('Starting oxygen'), 'Export labels capture reference oxygen correctly');
  // The standalone HTML deliberately has no application helper or executable code.
  equal(await page.locator('script,iframe,object,embed').count(), 0, 'Export is inert');
  const captureSections = page.locator('.aq-captured-measurements > section');
  equal(await captureSections.count(), record.measurements.length, 'Report includes each frozen capture');
  for (let index = 0; index < record.measurements.length; index++) {
    const note = record.measurements[index], section = captureSections.nth(index);
    const unit = note.unit || (note.metricId === 'biomass' ? ' index points' : ' mg/L');
    const delta = Number((note.b - note.a).toFixed(3));
    const frozenReading = 'A ' + note.a + unit + ' → B ' + note.b + unit + '; ' + (delta > 0 ? '+' : '') + delta + unit + ' (B minus A)';
    equal(await section.locator(':scope > p').first().innerText(), frozenReading, 'Report displays exact frozen A/B values and units for ' + note.id);
    assert((await section.innerText()).includes('Model ' + note.modelVersion), 'Report displays the captured model version');
    const bSettings = section.locator(':scope > section').filter({ has: page.getByRole('heading', { name: 'Capture B settings', exact: true }) });
    const values = await bSettings.locator('dl > div').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt').textContent, node.querySelector('dd').textContent])));
    equal(values['Starting oxygen'], note.currentScenario.water.oxygen + ' mg/L', 'Report keeps capture oxygen instead of substituting saved/current oxygen');
    equal(values['Temperature'], note.currentScenario.water.temperature + ' C', 'Report keeps the capture reference temperature');
  }
  await reflow(page, 'Measurement report ' + width);
  await axeAudit(page, ['.aq-archive-report'], 'report-' + width, null);
  // The complete HTML remains available; screenshots show one capture with its settings.
  const captured = captureSections.first();
  await captured.screenshot({ path: path.join(out, 'report-measurements-' + width + '.png') });
  await page.emulateMedia({ media: 'print' });
  await reflow(page, 'Printed measurement report ' + width);
  await captured.screenshot({ path: path.join(out, 'report-measurements-print-' + width + '.png') });
  await page.close();
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localOrigin = 'http://127.0.0.1:' + server.address().port;
  const url = localOrigin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390, 320]) {
      console.log('Measurement notebook QA: starting width ' + width);
      const errors = [];
      const page = await openSeeded(browser, url, width, initialState(), errors);
      const startState = await workspace(page);
      equal(await page.locator('#aq-measurement-annual-metric').inputValue(), 'minOxygen', 'Default annual metric is lowest oxygen');
      const annual = await capture(page, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' });
      assert((await rowFor(page, annual).innerText()).includes('Annual'), 'Annual reading has annual scope');

      // Exercise the existing native species/metric selectors and month buttons.
      const follow = page.locator('#aq-season-species');
      await follow.selectOption('oyster');
      const metric = page.locator('#aq-season-metric');
      await metric.selectOption('biomass');
      await activateKeyboard(page, page.getByRole('button', { name: /^Inspect Jul,/ }));
      equal(await page.getByRole('button', { name: /^Inspect Jul,/ }).getAttribute('aria-pressed'), 'true', 'Keyboard month inspection state');
      const oyster = await capture(page, 'month', { scope: 'month', month: 6, metricId: 'biomass', speciesId: 'oyster' });
      assert((await rowFor(page, oyster).innerText()).includes('Eastern oyster'), 'Species note names its organism');
      await metric.selectOption('oxygen');
      const shared = await capture(page, 'month', { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' });
      assert((await rowFor(page, shared).innerText()).includes('Shared system'), 'Shared oxygen does not claim to be species-specific');
      const frozenNotes = (await workspace(page)).measurements;

      // Changing what the chart displays must not alter capture provenance.
      await follow.focus(); await page.keyboard.press('Home'); await page.keyboard.press('End');
      equal(await follow.inputValue(), 'kelp', 'Native species select responds to keyboard navigation');
      await metric.selectOption('temperature');
      await activateKeyboard(page, page.getByRole('button', { name: /^Inspect Jan,/ }), 'Space');
      equal((await workspace(page)).measurements, frozenNotes, 'Chart-only changes do not mutate notes');
      for (const note of frozenNotes) assert((await rowFor(page, note).innerText()).includes('Matches current settings'), 'Chart-only changes do not mark a note stale');
      const summary = notebook(page).locator(':scope > summary');
      await activateKeyboard(page, summary, 'Space');
      equal(await notebook(page).evaluate(element => element.open), false, 'Native notebook disclosure closes with Space');
      await activateKeyboard(page, summary);
      equal(await notebook(page).evaluate(element => element.open), true, 'Native notebook disclosure opens with Enter');

      const oxygen = page.locator('#aq-eco-oxygen');
      await revealThroughDetails(page, oxygen);
      await oxygen.focus(); await page.keyboard.press('ArrowRight');
      const edited = await workspace(page);
      assert(edited.water.oxygen > startState.water.oxygen, 'Native oxygen slider changes live design B');
      equal(edited.measurements, frozenNotes, 'Live settings changes never recalculate frozen notes');
      for (const note of frozenNotes) assert((await rowFor(page, note).innerText()).includes('Frozen from earlier settings'), 'Old note identifies earlier settings');

      // A factual citation appends to Evidence only, and never truncates writing.
      const add = rowFor(page, annual).getByRole('button', { name: /^Add reading to Evidence/ });
      await activateKeyboard(page, add);
      const appended = await workspace(page);
      assert(appended.evidence.evidence.startsWith(originalWriting.evidence + '\n'), 'Append retains existing learner evidence');
      assert(appended.evidence.evidence.includes('Earlier settings') && /lowest oxygen/i.test(appended.evidence.evidence), 'Citation names earlier settings and the actual metric');
      for (const key of ['claim', 'reasoning', 'nextTest']) equal(appended.evidence[key], originalWriting[key], 'Citation preserves ' + key);
      equal(appended.prediction, startState.prediction, 'Citation preserves prediction');
      equal(appended.observation, startState.observation, 'Citation preserves observation');
      const evidenceBox = page.locator('#aq-eco-evidence-evidence');
      equal(await evidenceBox.evaluate(element => document.activeElement === element), true, 'Citation opens and focuses CER Evidence');
      await activateKeyboard(page, add);
      equal((await workspace(page)).evidence, appended.evidence, 'Duplicate citation does not append a second copy');
      const fullEvidence = ('I want to preserve this observation and explain its uncertainty. ').repeat(12).slice(0, 500);
      await revealThroughDetails(page, evidenceBox);
      await evidenceBox.fill(fullEvidence);
      const fullBefore = await workspace(page);
      await activateKeyboard(page, rowFor(page, oyster).getByRole('button', { name: /^Add reading to Evidence/ }));
      equal((await workspace(page)).evidence, fullBefore.evidence, 'Full Evidence field is retained without truncation');
      equal((await workspace(page)).measurements, frozenNotes, 'Rejected citation retains captured notes');
      assert(/500|shorten|space|full|room/i.test(await page.locator('#aq-eco-save-status').innerText()), 'Full citation refusal gives an actionable explanation');
      await revealThroughDetails(page, evidenceBox);
      await evidenceBox.fill(appended.evidence.evidence);

      await reflow(page, 'Notebook ' + width);
      await axeAudit(page, ['.aq-measurement-notebook', '#aq-measurement-annual-metric', '#aq-season-inspection'], 'notebook-' + width, localOrigin);
      await notebook(page).screenshot({ path: path.join(out, 'measurement-notebook-' + width + '.png') });
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await reflow(page, 'Forced-color notebook ' + width);
      await axeAudit(page, ['.aq-measurement-notebook', '#aq-measurement-annual-metric', '#aq-season-inspection'], 'notebook-forced-colors-' + width, localOrigin);
      await notebook(page).screenshot({ path: path.join(out, 'measurement-notebook-forced-colors-' + width + '.png') });
      await page.emulateMedia({ forcedColors: 'none' });

      await activateKeyboard(page, page.getByRole('button', { name: 'Save A/B comparison', exact: true }));
      const saved = await workspace(page);
      equal(saved.experiments.length, 1, 'Saving creates one completed investigation');
      const record = saved.experiments[0];
      equal(record.measurements, frozenNotes, 'Archive contains immutable copies of captures');
      equal(saved.measurements, frozenNotes, 'Saving preserves the live measurement notebook');
      equal(await page.locator('#aq-investigation-heading').innerText(), 'Evidence saved', 'Completed comparison has saved stage');
      const savedCard = card(page, record.id);
      await openDetails(page, savedCard.locator('.aq-saved-inputs'));
      const archive = savedCard.locator('.aq-measurement-archive');
      await openDetails(page, archive);
      equal(await archive.locator('[data-measurement-id]').count(), frozenNotes.length, 'Saved UI presents every original capture');
      const archiveText = await archive.innerText();
      await oxygen.focus(); await page.keyboard.press('ArrowRight');
      equal((await workspace(page)).experiments[0], record, 'Editing live B does not rewrite saved measurements or evidence');
      equal(await archive.innerText(), archiveText, 'Archive display uses its saved context, not live settings');
      const download = await downloadReport(page, record.id, width);
      await inspectReport(browser, download, width, record, errors);

      // Removing a live reading cannot remove it from a saved investigation.
      await activateKeyboard(page, rowFor(page, shared).getByRole('button', { name: /^Remove reading/ }));
      const removed = await workspace(page);
      equal(removed.measurements.length, 2, 'Remove affects the live notebook');
      equal(removed.experiments[0], record, 'Live removal leaves original saved captures unchanged');
      await page.reload(); await notebook(page).waitFor();
      equal((await workspace(page)).measurements, removed.measurements, 'Notebook survives reload');
      equal((await workspace(page)).experiments[0], record, 'Archived captures survive reload');

      await page.locator('#aq-eco-observation').fill('This is an unfinished second explanation that I want to return to after branching.');
      const claim = page.locator('#aq-eco-evidence-claim');
      await revealThroughDetails(page, claim);
      await claim.fill('My second claim and original readings should return together.');
      const branchBefore = await workspace(page);
      await activateKeyboard(page, card(page, record.id).getByRole('button', { name: /^Use saved B as A for experiment/ }));
      const branched = await workspace(page);
      equal(branched.measurements, [], 'Branch begins with an empty measurement notebook');
      equal(draftOf(branched.parkedDraft), draftOf(branchBefore), 'Parked draft retains readings and all writing');
      equal(branched.experiments[0], record, 'Branch leaves archived captures immutable');
      equal(await liveRows(page).count(), 0, 'Fresh branch has no old reading rows');
      await page.locator('#aq-eco-observation').fill('This new branch draft should be protected from another guided question.');
      const clearA = page.getByRole('button', { name: 'Clear A', exact: true });
      await revealThroughDetails(page, clearA);
      await activateKeyboard(page, clearA);
      const picker = page.locator('details.aq-investigation-picker');
      await openDetails(page, picker);
      const questions = picker.locator('button.aq-question-card');
      assert(await questions.count() >= 3, 'Guided question choices are visible');
      for (const button of await questions.all()) assert(await button.isDisabled(), 'Guided question is disabled while a draft is parked');
      const guarded = await workspace(page);
      await questions.first().evaluate(element => element.click());
      equal(await workspace(page), guarded, 'Native disabled guided choice keeps branch writing and parked notes');
      await activateKeyboard(page, page.getByRole('button', { name: 'Return to my draft', exact: true }));
      const returned = await workspace(page);
      equal(draftOf(returned), draftOf(branchBefore), 'Return restores the earlier notebook, design, prediction, observation, and CER');
      equal(returned.parkedDraft, null, 'Return clears parked draft');
      equal(returned.experiments[0], record, 'Return preserves archived captures');
      await reflow(page, 'Returned draft ' + width);
      assert(errors.length === 0, 'Runtime errors at ' + width + ': ' + errors.join('; '));
      results.push({ width, checks: ['annual capture', 'monthly species/shared capture and event', 'native selectors/month/disclosure/slider', 'chart-only freshness', 'frozen earlier-settings provenance', 'CER append/duplicate/full protection', 'normal and forced-color scoped axe/reflow', 'saved immutable captures', 'reload', 'live removal leaves archive intact', 'branch empty notebook and full restoration', 'parked guided-question guard', 'HTML and print capture settings'], errors });
      await page.close();
      console.log('Measurement notebook QA: completed width ' + width);
    }

    // Independent bounded-notebook case: ninth capture is not a silent eviction.
    const capErrors = [];
    const cap = await openSeeded(browser, url, 320, initialState(), capErrors);
    await cap.locator('#aq-season-species').selectOption('system');
    await cap.locator('#aq-season-metric').selectOption('oxygen');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    for (let index = 0; index < monthNames.length; index++) {
      await activateKeyboard(cap, cap.getByRole('button', { name: new RegExp('^Inspect ' + monthNames[index] + ',') }));
      await capture(cap, 'month', { scope: 'month', month: index, metricId: 'oxygen', speciesId: 'system' });
    }
    const capped = await workspace(cap);
    equal(capped.measurements.length, 8, 'Notebook cap is eight readings');
    const annualButton = cap.getByRole('button', { name: 'Record annual result', exact: true });
    const monthButton = cap.getByRole('button', { name: 'Record inspected result', exact: true });
    for (const button of [annualButton, monthButton]) {
      if (await button.isDisabled()) await button.evaluate(element => element.click());
      else await activateKeyboard(cap, button);
      equal((await workspace(cap)).measurements, capped.measurements, 'Ninth capture attempt does not evict existing measurements');
    }
    assert((await notebook(cap).innerText()).includes('8/8'), 'Full notebook count is visible');
    const deleted = capped.measurements[0];
    await activateKeyboard(cap, rowFor(cap, deleted).getByRole('button', { name: /^Remove reading/ }));
    assert(!(await annualButton.isDisabled()), 'Removing one reading makes capture available');
    await capture(cap, 'annual', { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' });
    const refilled = await workspace(cap);
    equal(refilled.measurements.length, 8, 'One replacement returns the notebook to its cap');
    for (const note of capped.measurements.slice(1)) equal(refilled.measurements.find(item => item.id === note.id), note, 'Refill retains all remaining frozen captures');
    await reflow(cap, 'Full notebook at 320');
    await axeAudit(cap, ['.aq-measurement-notebook', '#aq-measurement-annual-metric'], 'notebook-cap-320', localOrigin);
    assert(capErrors.length === 0, 'Cap-case runtime errors: ' + capErrors.join('; '));
    results.push({ case: 'bounded notebook at 320', checks: ['eight captured months', 'both capture paths bounded at cap', 'no silent eviction', 'remove then refill', 'remaining readings immutable', 'scoped axe and reflow'], errors: capErrors });
    await cap.close();
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
