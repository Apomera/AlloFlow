/* Author-only saved-investigation QA. Run this script serially from the main task. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = path.join(__dirname, 'browser-run');
const storageKey = 'aquacultureLab.state.v1';
const results = [];
fs.mkdirSync(out, { recursive: true });

// Reuse the same local HTTP harness as aquaculture_stock_browser.cjs.
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

const water = { temperature: 14, salinity: 30, oxygen: 10, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2 }, water: { ...water }, disturbanceId: 'none', ...patch });
const savedAt = Date.parse('2026-10-02T12:00:00.000Z');
const reflection = { claim: 'A tentative claim.', evidence: 'Measurements from this original run.', reasoning: 'A proposed mechanism.', nextTest: 'Change only one input next time.' };
const summary = (patch = {}) => ({ endingBiomass: 13, survival: 72, minOxygen: 4.2, peakAmmonia: .37, averageResilience: 48, riskMonths: 6, harvestUnits: 1, operatingEffort: 39, hasCrop: true, species: [], ...patch });
const species = (id, name, patch = {}) => ({ id, name, initialBiomass: 2, endingBiomass: 11, survival: 41, warningMonths: 7, progress: 72, ready: false, fixedSupport: false, ...patch });
function comparison(patch = {}) {
  return {
    id: 'archived-comparison', title: 'My original shellfish comparison', savedAt, kind: 'comparison', modelVersion: '2026.09-archive-test',
    environmentId: 'longline', organisms: { oyster: 2, mussel: 1, phytoplankton: 1 }, status: 'Watch', carryingPressure: 42, oxygen: 7.4, ammonia: .27, resilience: 63,
    baselineScenario: scenario({ organisms: { oyster: 2, kelp: 1, phytoplankton: 1 }, water: { ...water, oxygen: 9 } }),
    currentScenario: scenario({ organisms: { oyster: 2, mussel: 1, phytoplankton: 1 } }),
    baselineSummary: summary({ species: [
      species('oyster', 'Eastern oyster'),
      species('kelp', 'Sugar kelp', { initialBiomass: .25, endingBiomass: 2, survival: 97, progress: 100, ready: true }),
      species('phytoplankton', 'Phytoplankton community', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null, ready: false, fixedSupport: true })
    ] }),
    currentSummary: summary({ endingBiomass: 17, survival: 81, minOxygen: 5.1, peakAmmonia: .21, species: [
      species('oyster', 'Eastern oyster', { endingBiomass: 9, survival: 38, progress: 85 }),
      species('mussel', 'Blue mussel', { initialBiomass: .9, endingBiomass: 8, survival: 61, progress: 44 }),
      species('phytoplankton', 'Phytoplankton community', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null, ready: false, fixedSupport: true })
    ] }),
    prediction: 'My original prediction belongs to the saved inputs.',
    observation: '<script>window.__archiveInjected=1</script> belongs to the original record.',
    evidence: { ...reflection, claim: '<b>My original claim</b>' }, ...patch
  };
}
function fixtures() {
  const full = comparison();
  const snap = comparison({
    id: 'archived-snapshot', title: '<img src="x" onerror="window.__archiveInjected=1"> Site snapshot', kind: 'snapshot',
    baselineScenario: null, baselineSummary: null, currentSummary: null,
    currentScenario: scenario(), organisms: { oyster: 2 },
    snapshotFields: ['carryingPressure', 'oxygen', 'ammonia', 'resilience']
  });
  const partial = {
    id: 'partial-legacy-snapshot', kind: 'snapshot', savedAt, title: 'Older oxygen-only snapshot', environmentId: 'longline', organisms: { oyster: 1 },
    oxygen: 7.4, carryingPressure: null, ammonia: 'unavailable', resilience: null,
    observation: 'Only oxygen was recorded in this older visit.'
  };
  const legacy = comparison({
    id: 'partial-legacy-comparison', title: 'Older incomplete species comparison', modelVersion: 'legacy',
    baselineSummary: { endingBiomass: 13, species: [] },
    currentSummary: { endingBiomass: 0, species: [
      { id: 'oyster', name: 'Eastern oyster', initialBiomass: 2 },
      species('mussel', 'Blue mussel', { initialBiomass: .9, endingBiomass: 0, survival: 0, progress: 0, ready: false })
    ] }
  });
  const supportScenario = scenario({ environmentId: 'raceway', organisms: { nitrifiers: 1 }, water: { ...water, temperature: 12, salinity: 1 } });
  const supportOutcome = species('nitrifiers', 'Nitrifying biofilter', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null, ready: false, fixedSupport: true, warningMonths: 0 });
  const support = comparison({
    id: 'support-comparison', title: 'Fixed support comparison', environmentId: 'raceway', organisms: { nitrifiers: 1 },
    baselineScenario: supportScenario, currentScenario: { ...supportScenario, water: { ...supportScenario.water, oxygen: 11 } },
    baselineSummary: summary({ endingBiomass: 0, survival: 0, hasCrop: false, species: [supportOutcome] }),
    currentSummary: summary({ endingBiomass: 0, survival: 0, hasCrop: false, species: [supportOutcome] })
  });
  return [full, snap, partial, legacy, support];
}
function initialState() {
  return { lastTopic: 'ecosystem', ecosystemWorkspace: scenario({
    environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, temperature: 12, salinity: 1, oxygen: 11, pH: 7.5 }, disturbanceId: 'pump',
    baselineScenario: scenario({ environmentId: 'raceway', organisms: { trout: 1 }, water: { ...water, temperature: 11, salinity: 1 } }),
    prediction: 'My unfinished prediction belongs to the current draft.',
    observation: 'Keep this unfinished explanation while I start a different investigation.',
    evidence: { ...reflection }, investigationId: 'oxygen-buffer', experiments: fixtures()
  }) };
}
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message + '\nExpected: ' + JSON.stringify(expected) + '\nActual: ' + JSON.stringify(actual));
}
const card = (page, id) => page.locator('.aq-experiment-record[data-experiment-id="' + id + '"]');
const draftKeys = ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'investigationId'];
function draftOf(value) { return Object.fromEntries(draftKeys.map(key => [key, value[key]])); }
async function workspace(page) {
  return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey);
}
async function openSeeded(browser, url, width, seed, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, state }) => {
    // Seed only once: a reload must exercise the persisted name, not restore the fixture.
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: storageKey, state: seed });
  await page.goto(url);
  await page.locator('.aq-saved-experiments').waitFor();
  return page;
}
async function activateKeyboard(page, locator) { await locator.focus(); await page.keyboard.press('Enter'); }
async function openDetails(page, locator) {
  if (!(await locator.evaluate(element => element.open))) await activateKeyboard(page, locator.locator(':scope > summary'));
}
async function revealThroughDetails(page, locator) {
  // XPath results are in document order, so open outer native disclosures first.
  for (const ancestor of await locator.locator('xpath=ancestor::details').all()) await openDetails(page, ancestor);
  await locator.waitFor({ state: 'visible' });
}
async function definitionValues(locator, selector = '.aq-archive-readings > div') {
  return locator.locator(selector).evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt').textContent.trim(), node.querySelector('dd').textContent.trim()])));
}
async function reflow(page, label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(sizes.scroll <= sizes.width, label + ' horizontal overflow: ' + JSON.stringify(sizes));
}
async function axeAudit(page, scope, label, localOrigin) {
  if (!(await page.evaluate(() => !!window.axe))) {
    if (localOrigin) await page.addScriptTag({ url: localOrigin + '/axe.js' });
    else await page.addScriptTag({ content: fs.readFileSync(path.join(repo, 'node_modules/axe-core/axe.min.js'), 'utf8') });
  }
  const audit = await page.evaluate(async include => {
    const value = await axe.run(include ? { include } : document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { violations: value.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: value.incomplete.map(item => item.id) };
  }, scope);
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(audit, null, 2));
  assert(audit.violations.length === 0, label + ' WCAG A/AA: ' + JSON.stringify({
    violationCount: audit.violations.length,
    rules: audit.violations.map(item => item.id),
    sampleTargets: audit.violations.flatMap(item => item.nodes.map(node => ({ id: item.id, target: node.target }))).slice(0, 5),
    fullDetails: path.join(out, label + '-axe.json')
  }));
  return audit;
}
async function downloadReport(page, recordId, width, suffix = '') {
  const downloadEvent = page.waitForEvent('download');
  await activateKeyboard(page, card(page, recordId).getByRole('button', { name: /^Download report for experiment/ }));
  const download = await downloadEvent;
  assert(download.suggestedFilename().endsWith('.html'), 'Standalone report HTML filename');
  const filename = path.join(out, recordId + '-' + (suffix ? suffix + '-' : '') + width + '.html');
  await download.saveAs(filename);
  return { filename, html: fs.readFileSync(filename, 'utf8') };
}
async function inspectReport(browser, report, width, id, expectedTitle, errors) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const requests = [];
  page.on('pageerror', error => errors.push('report ' + id + ': ' + error.message));
  page.on('request', request => requests.push(request.url()));
  await page.setContent(report.html, { waitUntil: 'load' });
  const structure = await page.evaluate(() => ({
    title: document.title, heading: document.querySelector('h1')?.textContent,
    h1s: document.querySelectorAll('h1').length,
    headings: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(node => ({ level: Number(node.tagName.slice(1)), text: node.textContent })),
    executable: document.querySelectorAll('script,iframe,object,embed').length,
    resources: Array.from(document.querySelectorAll('[src],link[href],style')).filter(node => node.hasAttribute('src') || node.matches('link[href]') || /@import|url\s*\(/i.test(node.textContent)).map(node => node.outerHTML),
    eventHandlers: Array.from(document.querySelectorAll('*')).flatMap(node => Array.from(node.attributes).filter(attribute => /^on/i.test(attribute.name)).map(attribute => attribute.name)),
    injected: window.__archiveInjected || null, text: document.body.textContent
  }));
  assert(structure.h1s === 1 && structure.headings[0]?.level === 1, id + ' has one initial h1');
  assert(structure.headings.some(heading => heading.level === 2), id + ' has h2 sections');
  if (id.includes('comparison')) assert(structure.headings.some(heading => heading.level === 3), id + ' has h3 species headings');
  for (let index = 1; index < structure.headings.length; index++) {
    assert(structure.headings[index].level <= structure.headings[index - 1].level + 1, id + ' heading hierarchy skips a level: ' + JSON.stringify(structure.headings));
  }
  equal(structure.title, expectedTitle.trim(), id + ' document title preserves escaped saved name');
  equal(structure.heading, expectedTitle.trim(), id + ' h1 preserves escaped saved name');
  assert(structure.executable === 0 && structure.resources.length === 0 && structure.eventHandlers.length === 0 && structure.injected === null, id + ' escaped inert standalone report');
  equal(requests, [], id + ' no remote or local resource requests');
  assert(!/Invalid Date|NaN|undefined/.test(structure.text), id + ' report has meaningful missing-value labels');
  await reflow(page, id + ' report at ' + width);
  return { page, structure };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localOrigin = 'http://127.0.0.1:' + server.address().port;
  const url = localOrigin + '/qa/aquacultureLab';
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390, 320]) {
      console.log('Saved investigations QA: starting width ' + width);
      const errors = [];
      const page = await openSeeded(browser, url, width, initialState(), errors);
      const before = await workspace(page);
      equal(before.experiments.length, 5, 'Five archive fixtures');
      assert(await page.evaluate(() => !window.__archiveInjected), 'Saved text must not inject script into builder');
      const first = card(page, 'archived-comparison');
      const name = first.getByRole('textbox', { name: /^Investigation name/ });
      equal(await name.getAttribute('maxlength'), '80', 'Name length guard');
      const namedTitle = '  My oyster evidence trial  ';
      await name.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type(namedTitle);
      equal(await name.inputValue(), namedTitle, 'Keyboard naming preserves spaces while typing');
      const named = await workspace(page);
      equal(named.experiments[0].title, namedTitle, 'Name persists exact spaces');
      equal({ ...named.experiments[0], title: before.experiments[0].title }, before.experiments[0], 'Rename only changes title');
      equal(named.experiments.slice(1), before.experiments.slice(1), 'Rename does not change other records');
      equal(draftOf(named), draftOf(before), 'Rename does not change live draft');
      await page.reload(); await page.locator('.aq-saved-experiments').waitFor();
      equal(await name.inputValue(), namedTitle, 'Name survives reload');
      equal((await workspace(page)).experiments, named.experiments, 'Reload preserves archived evidence');

      await openDetails(page, first.locator('.aq-saved-inputs'));
      for (const detail of await first.locator('.aq-archived-species-row').all()) await openDetails(page, detail);
      const values = await definitionValues(first);
      assert(values['Lowest oxygen'].includes('A 4.2 mg/L') && values['Lowest oxygen'].includes('B 5.1 mg/L'), 'Frozen annual oxygen, not recalculated oxygen');
      assert(values['Ending crop biomass index'].includes('A 13 index points') && values['Ending crop biomass index'].includes('B 17 index points'), 'Frozen A/B biomass');
      assert(values['Survival index'].includes('A 72%') && values['Survival index'].includes('B 81%') && values['Survival index'].includes('+9 percentage points'), 'Survival difference uses percentage points');
      const oyster = first.locator('.aq-archived-species-row').filter({ has: page.getByText('Eastern oyster', { exact: true }) });
      const oysterText = await oyster.innerText();
      assert(oysterText.includes('11 index points') && oysterText.includes('9 index points') && oysterText.includes('41%') && oysterText.includes('38%'), 'Both saved oyster outcomes');
      assert(oysterText.includes('-2 index points') && oysterText.includes('-3 percentage points') && oysterText.includes('+13 percentage points'), 'Saved species deltas');
      for (const id of ['Sugar kelp', 'Blue mussel']) {
        const row = first.locator('.aq-archived-species-row').filter({ has: page.getByText(id, { exact: true }) });
        assert((await row.innerText()).includes('Not stocked in these saved settings'), 'Known species absence: ' + id);
        equal(await row.locator('.aq-archive-differences').count(), 0, 'Absent species has no fabricated delta: ' + id);
      }
      const supportRow = first.locator('.aq-archived-species-row').filter({ has: page.getByText('Phytoplankton community', { exact: true }) });
      assert((await supportRow.innerText()).includes('Fixed support'), 'Fixed-support explanation');
      equal(await supportRow.locator('.aq-archive-differences').count(), 0, 'Support has no crop delta');
      assert((await first.innerText()).includes('combined scenario responses'), 'Composition-change caveat');
      for (const heading of ['Saved A settings', 'Saved B settings']) equal(await first.getByRole('heading', { name: heading, exact: true }).count(), 1, 'Full saved settings: ' + heading);
      assert((await first.innerText()).includes('Original prediction:') && (await first.innerText()).includes(reflection.reasoning), 'Prediction and CER archived separately');

      const snapshotCard = card(page, 'archived-snapshot');
      await openDetails(page, snapshotCard.locator('.aq-saved-inputs'));
      const snapshotValues = await definitionValues(snapshotCard);
      equal(snapshotValues['Snapshot oxygen'], '7.4 mg/L', 'Frozen snapshot oxygen');
      equal(snapshotValues['Snapshot ammonia'], '0.27 mg/L', 'Frozen snapshot ammonia');
      assert(!(await snapshotCard.innerText()).includes('Lowest oxygen'), 'Snapshot does not imply annual extrema');
      const partialCard = card(page, 'partial-legacy-snapshot');
      await openDetails(page, partialCard.locator('.aq-saved-inputs'));
      const partialValues = await definitionValues(partialCard);
      equal(partialValues['Snapshot oxygen'], '7.4 mg/L', 'Recorded legacy snapshot oxygen');
      for (const label of ['Stocking pressure', 'Snapshot ammonia', 'Snapshot resilience index']) equal(partialValues[label], 'Not recorded', 'Legacy missing snapshot field: ' + label);
      assert((await partialCard.innerText()).includes('Saved status: Not recorded'), 'Legacy missing status');
      equal(await partialCard.getByRole('button', { name: /^Replay experiment/ }).count(), 0, 'Unavailable legacy replay');

      const legacyCard = card(page, 'partial-legacy-comparison');
      await openDetails(page, legacyCard.locator('.aq-saved-inputs'));
      for (const detail of await legacyCard.locator('.aq-archived-species-row').all()) await openDetails(page, detail);
      const legacyOyster = legacyCard.locator('.aq-archived-species-row').filter({ has: page.getByText('Eastern oyster', { exact: true }) });
      const legacyOysterText = await legacyOyster.innerText();
      assert(legacyOysterText.includes('Species outcomes were not recorded') && legacyOysterText.includes('Not recorded'), 'Missing legacy outcomes are unrecorded');
      assert(!legacyOysterText.includes('0%') && !legacyOysterText.includes('Not reached'), 'Missing legacy fields are not fabricated zero or false');
      equal(await legacyOyster.locator('.aq-archive-differences').count(), 0, 'Missing legacy species has no delta');
      const zeroMussel = legacyCard.locator('.aq-archived-species-row').filter({ has: page.getByText('Blue mussel', { exact: true }) });
      assert((await zeroMussel.innerText()).includes('0 index points') && (await zeroMussel.innerText()).includes('0%') && (await zeroMussel.innerText()).includes('Not reached'), 'Recorded zero and false stay meaningful');
      const fixedCard = card(page, 'support-comparison');
      await openDetails(page, fixedCard.locator('.aq-saved-inputs'));
      const fixedValues = await definitionValues(fixedCard);
      assert(fixedValues['Survival index'].includes('A Not applicable') && fixedValues['Survival index'].includes('B Not applicable') && !fixedValues['Survival index'].includes('0%'), 'Support-only aggregate survival is not applicable');
      for (const detail of await fixedCard.locator('.aq-archived-species-row').all()) await openDetails(page, detail);

      // Exercise the maximum permitted unbroken title at every width.
      const longTitle = 'X'.repeat(80);
      await name.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type(longTitle);
      equal(await name.inputValue(), longTitle, '80-character title accepted');
      equal(await first.getByRole('heading', { level: 4 }).innerText(), longTitle, 'Long title shown in card');
      await reflow(page, 'Saved investigation UI at ' + width);
      await axeAudit(page, ['.aq-saved-experiments', '.aq-investigation-loop'], 'saved-' + width, localOrigin);
      await first.screenshot({ path: path.join(out, 'saved-comparison-' + width + '.png') });
      await partialCard.screenshot({ path: path.join(out, 'legacy-snapshot-' + width + '.png') });

      const currentRecords = (await workspace(page)).experiments;
      for (const record of currentRecords) {
        const report = await downloadReport(page, record.id, width);
        const standalone = await inspectReport(browser, report, width, record.id, record.title, errors);
        const reportText = standalone.structure.text;
        if (record.id === 'archived-comparison') {
          for (const value of ['A 4.2 mg/L', 'B 5.1 mg/L', '11 index points', '9 index points', '41%', '38%', 'Saved A settings', 'Saved B settings', 'combined scenario responses']) assert(reportText.includes(value), 'Report preserves ' + value);
          assert(report.html.includes('&lt;script&gt;') && report.html.includes('&lt;b&gt;My original claim&lt;/b&gt;'), 'Report escapes learner markup');
          await axeAudit(standalone.page, null, 'report-' + width, null);
          await standalone.page.screenshot({ path: path.join(out, 'report-' + width + '.png'), fullPage: true });
          await standalone.page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
          await reflow(standalone.page, 'Forced-colors report ' + width);
          await axeAudit(standalone.page, null, 'report-forced-colors-' + width, null);
          await standalone.page.screenshot({ path: path.join(out, 'report-forced-colors-' + width + '.png'), fullPage: true });
          await standalone.page.emulateMedia({ forcedColors: 'none', media: 'print' });
          await standalone.page.screenshot({ path: path.join(out, 'report-print-' + width + '.png'), fullPage: true });
        } else if (record.id === 'archived-snapshot') {
          assert(reportText.includes('Saved snapshot outputs') && reportText.includes('7.4 mg/L') && reportText.includes('0.27 mg/L') && reportText.includes('Watch'), 'Snapshot report values and units');
          assert(!reportText.includes('Saved annual model outputs'), 'Snapshot report is not annual evidence');
          assert(report.html.includes('&lt;img'), 'Snapshot title escaped');
        } else if (record.id === 'partial-legacy-snapshot') {
          assert(reportText.includes('7.4 mg/L') && reportText.includes('Saved status: Not recorded') && reportText.includes('Not recorded'), 'Partial snapshot report labels');
          assert(!reportText.includes('0 mg/L') && !reportText.includes('0 /100'), 'Partial report has no invented zero measurements');
        } else if (record.id === 'partial-legacy-comparison') {
          assert(reportText.includes('Original unversioned model') && reportText.includes('Species outcomes were not recorded') && reportText.includes('0%'), 'Legacy report distinguishes missing and recorded zero');
        } else {
          assert(reportText.includes('A Not applicable') && reportText.includes('B Not applicable') && reportText.includes('Fixed support'), 'Support report distinguishes non-crop measures');
        }
        await standalone.page.close();
      }
      equal((await workspace(page)).experiments, currentRecords, 'Report downloads do not mutate archived evidence');
      if (width === 1280 || width === 320) {
        const portfolioHtml = await page.evaluate(key => {
          const helpers = window.AquacultureLearningHelpers;
          const state = JSON.parse(localStorage.getItem(key));
          return helpers.portfolioToHtml(helpers.buildLearningPortfolio(state, [], [], Date.parse('2026-10-02T12:30:00.000Z')));
        }, storageKey);
        const portfolioFilename = path.join(out, 'portfolio-' + width + '.html');
        fs.writeFileSync(portfolioFilename, portfolioHtml);
        const portfolio = await inspectReport(browser, { html: portfolioHtml, filename: portfolioFilename }, width, 'portfolio', 'Aquaculture Lab Learning Portfolio', errors);
        equal(await portfolio.page.locator('.aq-archive-report').count(), 5, 'Portfolio embeds all five frozen archive records');
        const portfolioFirst = portfolio.page.locator('.aq-archive-report').first();
        equal(await portfolioFirst.getByRole('heading', { level: 3 }).innerText(), longTitle, 'Portfolio archive uses nested h3 title');
        equal(await portfolioFirst.getByRole('heading', { name: 'Saved annual model outputs', level: 4 }).count(), 1, 'Portfolio archive uses nested h4 output heading');
        equal(await portfolioFirst.getByRole('heading', { name: 'Eastern oyster', level: 5 }).count(), 1, 'Portfolio archive uses nested h5 species heading');
        assert(portfolio.structure.text.includes('A 4.2 mg/L') && portfolio.structure.text.includes('B 5.1 mg/L'), 'Portfolio preserves original A/B readings');
        assert(portfolioHtml.includes('&lt;script&gt;') && portfolioHtml.includes('&lt;img'), 'Portfolio escapes original learner markup');
        const portfolioColumns = await portfolioFirst.locator('.aq-archive-sides').first().evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
        equal(portfolioColumns, width <= 650 ? 1 : 2, 'Portfolio archive sides respond to viewport');
        await axeAudit(portfolio.page, ['.aq-archive-report'], 'portfolio-' + width, null);
        await portfolioFirst.screenshot({ path: path.join(out, 'portfolio-archive-' + width + '.png') });
        await portfolio.page.close();
      }
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await reflow(page, 'Forced-colors archive UI ' + width);
      await axeAudit(page, ['.aq-saved-experiments', '.aq-investigation-loop'], 'saved-forced-colors-' + width, localOrigin);
      await first.screenshot({ path: path.join(out, 'saved-forced-colors-' + width + '.png') });
      await page.emulateMedia({ forcedColors: 'none' });

      // Keep the maximum-length screenshots and downloads above, then make a
      // separate readable handoff without changing any original evidence.
      const readableBefore = await workspace(page);
      const readableTitle = 'Shellfish comparison — saved evidence';
      await name.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type(readableTitle);
      const readableAfter = await workspace(page);
      equal({ ...readableAfter.experiments[0], title: readableBefore.experiments[0].title }, readableBefore.experiments[0], 'Readable handoff rename only changes title');
      equal(readableAfter.experiments.slice(1), readableBefore.experiments.slice(1), 'Readable handoff preserves other records');
      equal(draftOf(readableAfter), draftOf(readableBefore), 'Readable handoff preserves live draft');
      await first.screenshot({ path: path.join(out, 'saved-readable-' + width + '.png') });
      const readableDownload = await downloadReport(page, 'archived-comparison', width, 'readable');
      const readableReport = await inspectReport(browser, readableDownload, width, 'archived-comparison-readable', readableTitle, errors);
      assert(readableReport.structure.text.includes('A 4.2 mg/L') && readableReport.structure.text.includes('B 5.1 mg/L'), 'Readable handoff keeps frozen oxygen outputs');
      await readableReport.page.screenshot({ path: path.join(out, 'report-readable-' + width + '.png'), fullPage: true });
      await readableReport.page.emulateMedia({ media: 'print' });
      await readableReport.page.screenshot({ path: path.join(out, 'report-readable-print-' + width + '.png'), fullPage: true });
      await readableReport.page.close();
      equal((await workspace(page)).experiments, readableAfter.experiments, 'Readable report does not mutate archive');

      const branchBefore = await workspace(page);
      await activateKeyboard(page, first.getByRole('button', { name: /^Use saved B as A for experiment/ }));
      const branched = await workspace(page);
      equal(branched.baselineScenario, branchBefore.experiments[0].currentScenario, 'Saved B becomes fresh A');
      equal(draftOf(branched.parkedDraft), draftOf(branchBefore), 'Complete existing draft parked');
      equal(branched.experiments, branchBefore.experiments, 'Branch retains archive');
      equal(branched.prediction, '', 'Branch starts fresh prediction');
      equal(branched.observation, '', 'Branch starts fresh observation');
      equal(branched.evidence, { claim: '', evidence: '', reasoning: '', nextTest: '' }, 'Branch starts fresh CER');
      equal(branched.investigationId, '', 'Branch starts fresh guided question');
      equal(await page.locator('#aq-investigation-heading').innerText(), 'Change one input', 'Fresh branch stage');
      assert((await page.locator('#aq-eco-save-status').innerText()).includes('fresh comparison using model'), 'Current-model branching disclosure');
      await page.locator('#aq-eco-observation').fill('This new branch writing must survive disabled replay and a second branch attempt.');
      const branchClaim = page.locator('#aq-eco-evidence-claim');
      await revealThroughDetails(page, branchClaim);
      await branchClaim.fill('This new branch claim has not been saved.');
      const branchWriting = await workspace(page);
      const guardedActions = page.locator('.aq-record-actions button').filter({ hasText: /^(Use saved B as A|Use saved design as A|Replay experiment)$/ });
      assert(await guardedActions.count() >= 6, 'Multiple replay and branch actions available');
      for (const action of await guardedActions.all()) assert(await action.isDisabled(), 'Second branch and replay disabled while draft parked');
      // Native disabled activation is inert; force dispatch would bypass the real user contract.
      await snapshotCard.getByRole('button', { name: /^Use saved design as A for experiment/ }).evaluate(element => element.click());
      await first.getByRole('button', { name: /^Replay experiment/ }).evaluate(element => element.click());
      equal(await workspace(page), branchWriting, 'Disabled actions protect new branch writing and original parked draft');
      await page.reload(); await page.locator('.aq-saved-experiments').waitFor();
      equal((await workspace(page)).observation, branchWriting.observation, 'Branch writing survives reload');
      equal(draftOf((await workspace(page)).parkedDraft), draftOf(branchBefore), 'Parked complete draft survives reload');
      await activateKeyboard(page, page.getByRole('button', { name: 'Return to my draft', exact: true }));
      const restored = await workspace(page);
      equal(draftOf(restored), draftOf(branchBefore), 'Return restores full earlier draft');
      equal(restored.parkedDraft, null, 'Return clears parked draft');
      equal(restored.experiments, branchBefore.experiments, 'Return leaves archive unchanged');
      assert(!errors.length, 'Page errors at ' + width + ': ' + errors.join('; '));
      results.push({ width, checks: ['keyboard name and spaces', 'name-only persistence', 'frozen A/B outcomes', 'absent/unrecorded/zero/support distinction', 'full settings and CER', 'standalone inert report', 'heading hierarchy', 'report units and missing values', '80-character title reflow', 'WCAG A/AA scoped axe', 'normal and forced colors', 'print report', 'complete draft branching/restoration', 'second branch/replay guards'], errors });
      await page.close();
      console.log('Saved investigations QA: completed width ' + width);
    }

    // Incomplete scenario objects must retain their presence markers; sanitizer
    // defaults are internal fallbacks, not historical settings or known absence.
    const partialSettingsErrors = [];
    const partialSettingsRecord = comparison({
      id: 'partial-settings-comparison', title: 'Incomplete settings investigation', modelVersion: 'legacy',
      status: undefined, baselineScenario: {}, currentScenario: {},
      baselineSummary: { species: [species('oyster', 'Eastern oyster')] }, currentSummary: { species: [] },
      observation: 'This older record has an oyster result but its full scenario settings were never recorded.', evidence: {}
    });
    const partialSettingsSeed = { lastTopic: 'ecosystem', ecosystemWorkspace: scenario({ experiments: [partialSettingsRecord], prediction: '', observation: '', evidence: {} }) };
    const partialSettings = await openSeeded(browser, url, 320, partialSettingsSeed, partialSettingsErrors);
    const partialSettingsCard = card(partialSettings, partialSettingsRecord.id);
    const partialInitial = (await workspace(partialSettings)).experiments[0];
    equal(partialInitial.baselineScenarioRecorded, false, 'Empty A settings are not recorded');
    equal(partialInitial.currentScenarioRecorded, false, 'Empty B settings are not recorded');
    equal(partialInitial.statusRecorded, false, 'Missing archived status stays unknown');
    const partialName = partialSettingsCard.getByRole('textbox', { name: /^Investigation name/ });
    const notebookName = '  My named incomplete archive  ';
    await partialName.focus(); await partialSettings.keyboard.press('Control+A'); await partialSettings.keyboard.type(notebookName);
    const partialNamed = (await workspace(partialSettings)).experiments[0];
    equal({ ...partialNamed, title: partialInitial.title }, partialInitial, 'Naming incomplete archive preserves presence markers and evidence');
    await partialSettings.reload(); await partialSettings.locator('.aq-saved-experiments').waitFor();
    equal((await workspace(partialSettings)).experiments[0], partialNamed, 'Incomplete settings markers and name survive reload');
    await openDetails(partialSettings, partialSettingsCard.locator('.aq-saved-inputs'));
    for (const detail of await partialSettingsCard.locator('.aq-archived-species-row').all()) await openDetails(partialSettings, detail);
    const partialSettingsText = await partialSettingsCard.innerText();
    assert(partialSettingsText.includes('Species outcomes were not recorded'), 'Missing B outcomes remain unrecorded when settings are incomplete');
    assert(!partialSettingsText.includes('Not stocked'), 'Incomplete settings do not establish species absence');
    equal(await partialSettingsCard.locator('.aq-saved-inputs').getByText('Full settings were not recorded.', { exact: true }).count(), 2, 'A and B settings both explicitly unavailable');
    assert(!partialSettingsText.includes('Starting oxygen') && !partialSettingsText.includes('Exchange setting'), 'Default water values are not shown as archived settings');
    equal(await partialSettingsCard.getByRole('button', { name: /^Replay experiment/ }).count(), 0, 'Incomplete B cannot replay');
    equal(await partialSettingsCard.getByRole('button', { name: /^Use saved B as A/ }).count(), 0, 'Incomplete B cannot start a branch');
    await reflow(partialSettings, 'Incomplete archive settings at 320');
    await axeAudit(partialSettings, ['.aq-saved-experiments'], 'partial-settings-320', localOrigin);
    await partialSettingsCard.screenshot({ path: path.join(out, 'partial-settings-320.png') });
    const partialSettingsDownload = await downloadReport(partialSettings, partialSettingsRecord.id, 320);
    const partialSettingsReport = await inspectReport(browser, partialSettingsDownload, 320, partialSettingsRecord.id, notebookName, partialSettingsErrors);
    assert(!partialSettingsReport.structure.text.includes('Not stocked') && !partialSettingsReport.structure.text.includes('Starting oxygen'), 'Incomplete report does not invent absent species or default water');
    for (const heading of ['Saved A settings', 'Saved B settings']) {
      const section = partialSettingsReport.page.locator('section').filter({ has: partialSettingsReport.page.getByRole('heading', { name: heading, exact: true }) }).last();
      equal(await section.locator('dl').count(), 0, heading + ' report does not expose default settings');
      assert((await section.innerText()).includes('Full settings were not recorded'), heading + ' report explains missing settings');
    }
    await partialSettingsReport.page.screenshot({ path: path.join(out, 'partial-settings-report-320.png'), fullPage: true });
    await partialSettingsReport.page.close();
    await partialSettings.getByRole('button', { name: 'Home', exact: true }).click();
    await openDetails(partialSettings, partialSettings.locator('.aq-notebook-disclosure'));
    const notebookEntry = partialSettings.locator('.aq-notebook-card article').filter({ has: partialSettings.getByRole('heading', { name: notebookName.trim(), exact: true }) });
    equal(await notebookEntry.count(), 1, 'Home notebook uses named archived investigation');
    assert((await notebookEntry.innerText()).includes('Status not recorded'), 'Home notebook keeps missing saved status unknown');
    assert(!(await notebookEntry.innerText()).includes('Watch'), 'Home notebook does not present fallback Watch as original status');
    await reflow(partialSettings, 'Home notebook partial archive at 320');
    await axeAudit(partialSettings, ['.aq-notebook-card'], 'partial-settings-notebook-320', localOrigin);
    await partialSettings.locator('.aq-notebook-card').screenshot({ path: path.join(out, 'partial-settings-notebook-320.png') });
    equal((await workspace(partialSettings)).experiments[0], partialNamed, 'Reviewing incomplete archive and Home does not rewrite evidence');
    assert(!partialSettingsErrors.length, 'Incomplete settings runtime errors: ' + partialSettingsErrors.join('; '));
    results.push({ case: 'incomplete archive settings and Home notebook at 320', checks: ['complete scenario presence markers', 'no invented water defaults or species absence', 'incomplete replay and branch unavailable', 'name-only reload', 'standalone incomplete report', 'Home name and unknown status', 'scoped axe and reflow'], errors: partialSettingsErrors });
    await partialSettings.close();

    // Independent current-model evidence checks: a new CER draft cannot inherit
    // the Evidence saved stage from an earlier record with matching model inputs.
    const dirtyErrors = [];
    const dirtySeed = { lastTopic: 'ecosystem', ecosystemWorkspace: scenario({
      baselineScenario: scenario({ water: { ...water, oxygen: 9 } }),
      prediction: 'Higher reference oxygen should change the oxygen signal.',
      observation: 'This explanation belongs to the first saved comparison and its original readings.', evidence: {}, experiments: []
    }) };
    const dirty = await openSeeded(browser, url, 320, dirtySeed, dirtyErrors);
    await dirty.getByRole('button', { name: 'Save A/B comparison', exact: true }).click();
    equal(await dirty.locator('#aq-investigation-heading').innerText(), 'Evidence saved', 'Completed current-model evidence stage');
    // A clean current-model record makes the final handoff easier to assess than
    // the deliberately hostile archive fixtures and maximum-length title shots.
    const sampleBefore = (await workspace(dirty)).experiments[0];
    const sampleCard = card(dirty, sampleBefore.id);
    const sampleTitle = 'Oxygen buffer — shellfish comparison';
    const sampleName = sampleCard.getByRole('textbox', { name: /^Investigation name/ });
    await sampleName.focus(); await dirty.keyboard.press('Control+A'); await dirty.keyboard.type(sampleTitle);
    const sampleAfter = (await workspace(dirty)).experiments[0];
    equal({ ...sampleAfter, title: sampleBefore.title }, sampleBefore, 'Clean current-model sample rename only changes title');
    equal(await dirty.locator('#aq-investigation-heading').innerText(), 'Evidence saved', 'Naming sample does not change evidence stage');
    await openDetails(dirty, sampleCard.locator('.aq-saved-inputs'));
    for (const detail of await sampleCard.locator('.aq-archived-species-row').all()) await openDetails(dirty, detail);
    for (const sampleWidth of [1280, 390, 320]) {
      await dirty.setViewportSize({ width: sampleWidth, height: 900 });
      await reflow(dirty, 'Clean saved current-model sample ' + sampleWidth);
      await sampleCard.screenshot({ path: path.join(out, 'sample-saved-investigation-' + sampleWidth + '.png') });
    }
    const sampleDownload = await downloadReport(dirty, sampleAfter.id, 320, 'sample');
    const sampleFilename = path.join(out, 'sample-investigation.html');
    fs.copyFileSync(sampleDownload.filename, sampleFilename);
    for (const sampleWidth of [1280, 390]) {
      const sampleReport = await inspectReport(browser, { html: sampleDownload.html, filename: sampleFilename }, sampleWidth, 'current-model-comparison', sampleTitle, dirtyErrors);
      assert(sampleReport.structure.text.includes('2026.10-stock-feedback') && !sampleReport.structure.text.includes('__archiveInjected'), 'Clean sample contains actual current-model evidence');
      await sampleReport.page.screenshot({ path: path.join(out, 'sample-investigation-report-' + sampleWidth + '.png'), fullPage: true });
      await sampleReport.page.close();
    }
    await dirty.setViewportSize({ width: 320, height: 900 });
    const frozenRecords = (await workspace(dirty)).experiments;
    const dirtyClaim = dirty.locator('#aq-eco-evidence-claim');
    await revealThroughDetails(dirty, dirtyClaim);
    await dirtyClaim.fill('This new claim is a draft and is not in the original evidence record.');
    equal(await dirty.locator('#aq-investigation-heading').innerText(), 'Compare & explain', 'Dirty CER returns to explanation stage');
    equal((await workspace(dirty)).experiments, frozenRecords, 'Dirty CER does not rewrite existing evidence');
    await dirty.reload(); await dirty.locator('.aq-saved-experiments').waitFor();
    equal(await dirty.locator('#aq-investigation-heading').innerText(), 'Compare & explain', 'Dirty CER stage survives reload');
    await reflow(dirty, 'Dirty CER at 320');
    await dirty.locator('.aq-investigation-loop').screenshot({ path: path.join(out, 'dirty-CER-320.png') });
    assert(!dirtyErrors.length, 'Dirty CER runtime errors: ' + dirtyErrors.join('; '));
    results.push({ case: 'dirty CER at 320', checks: ['clean current-model sample name-only change', 'readable saved-card handoff at1280/390/320', 'clean standalone sample-investigation.html and1280/390 report screenshots', 'saved stage before draft', 'unsaved structured claim returns to explanation', 'archive unchanged', 'reload and reflow'], errors: dirtyErrors });
    await dirty.close();
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
