/* Author-only browser QA; root alone executes this frozen taskscript. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = path.join(__dirname, 'aquaculture/backup-union-browser');
const storageKey = 'aquacultureLab.state.v1', results = [];
fs.mkdirSync(out, { recursive: true });
const original = fs.readFileSync(path.join(repo, 'dev-tools/aquatic_browser_qa.cjs'), 'utf8');
const start = original.indexOf('function harness(tool) {'), end = original.indexOf('const server=http', start);
if (start < 0 || end <= start) throw Error('Reusable HTTP React fixture not found');
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
const time = Date.UTC(2026, 9, 4, 16), literal = '<img src=x onerror="window.__archiveInjected=true"> & Ω';
const baseline = { environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, water: { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'heatwave' };
const changed = { ...baseline, organisms: { ...baseline.organisms }, water: { ...baseline.water, oxygen: 9.2 } };
const writing = { claim: 'The captured original is relevant to my oxygen claim.', evidence: '  My exact source evidence stays here.\n\n  ', reasoning: 'Inspect the frozen A and B values and retain their original settings.', nextTest: 'Change one input and inspect the seasonal result.' };
const pristineProbe = { environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 }, water: { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'none', observation: '', evidence: { claim: '', evidence: '', reasoning: '', nextTest: '' }, measurements: [], experiments: [], baselineScenario: null, prediction: '', investigationId: '', parkedDraft: null };
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function assert(ok, message) { if (!ok) throw Error(message); }
function equal(a, b, message) { assert(isDeepStrictEqual(a, b), message + '\nExpected: ' + JSON.stringify(b) + '\nActual: ' + JSON.stringify(a)); }
const archive = page => page.locator('.aq-saved-experiments');
const card = (page, index) => archive(page).locator('.aq-experiment-record[data-experiment-index="' + index + '"]');
const recovery = page => page.locator('.aq-archive-recovery');
const notebook = page => page.locator('details.aq-measurement-notebook:not(.aq-measurement-archive)');
const tray = page => page.locator('details.aq-measurement-recovery');
async function keyboard(page, control, key = 'Enter') { await control.focus(); await page.keyboard.press(key); }
async function openDetails(page, target) { if (!(await target.evaluate(element => element.open))) await keyboard(page, target.locator(':scope > summary')); }
async function focused(page, id) { await page.waitForFunction(id => document.activeElement && document.activeElement.id === id, id); equal(await page.locator('#' + id).count(), 1, 'Focus id resolves once: ' + id); }
async function workspace(page) { return page.evaluate(key => window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace), storageKey); }
async function rawState(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }
function draft(ws) { const { experiments, parkedDraft, ...rest } = ws; return rest; }
async function openSeeded(browser, url, state, errors, width = 390) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/same key|unique.*key|encountered two children/i.test(message.text())) errors.push(message.text()); });
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, state });
  await page.goto(url); await archive(page).waitFor(); await page.waitForFunction(() => !!window.AquacultureLearningHelpers); return page;
}
async function home(page) { await keyboard(page, page.locator('.aq-primary-nav').getByRole('button', { name: 'Home', exact: true })); const learning = page.locator('details.aq-learning-card'); await learning.waitFor(); await openDetails(page, learning); const tools = page.locator('details.aq-portfolio-tools'); await tools.waitFor(); await openDetails(page, tools); }
async function ecosystem(page) { await keyboard(page, page.locator('.aq-primary-nav').getByRole('button', { name: 'Ecosystem builder', exact: true })); await archive(page).waitFor(); }
async function importBackup(page, value) { await page.locator('#aq-portfolio-import').setInputFiles({ name: 'backup-union-import.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) }); }
function payload(ws) { return { kind: 'aquaculture-learning-portfolio', version: 1, learning: { ecosystemWorkspace: ws } }; }
async function importSuccess(page, value) { await home(page); await importBackup(page, value); await page.getByText('Backup merged successfully. Existing learning data was preserved.', { exact: true }).waitFor(); await ecosystem(page); }
async function download(page, control, file, json = false) { const waiting = page.waitForEvent('download'); await keyboard(page, control); const item = await waiting; await item.saveAs(path.join(out, file)); const bytes = fs.readFileSync(path.join(out, file), 'utf8'); return json ? JSON.parse(bytes) : bytes; }
async function downloadCard(page, index, file) { return download(page, card(page, index).getByRole('button', { name: /^Download report for experiment/ }), file); }
async function expectedReport(page, record) { return page.evaluate(record => window.AquacultureLearningHelpers.ecosystemExperimentHtml(record), record); }
async function remove(page, index) {
  const before = await workspace(page), selected = before.experiments[index], expected = before.experiments.slice(); expected.splice(index, 1);
  await keyboard(page, card(page, index).getByRole('button', { name: /^Remove experiment/ })); await focused(page, 'aq-saved-experiments-heading');
  const after = await workspace(page); equal(after.experiments, expected, 'Remove splices one exact selected occurrence'); equal(draft(after), draft(before), 'Removal preserves current draft and readings');
  await recovery(page).waitFor(); assert(await recovery(page).getByRole('button', { name: 'Undo remove', exact: true }).isEnabled(), 'Last removal is ready to restore');
  return { before, selected, index };
}
async function undo(page, removed) { await keyboard(page, recovery(page).getByRole('button', { name: 'Undo remove', exact: true })); await focused(page, 'aq-saved-experiments-heading'); equal((await workspace(page)).experiments, removed.before.experiments, 'Undo restores one exact canonical selected occurrence in original order'); equal(await recovery(page).count(), 0, 'Successful Undo consumes only last-removal memento'); }
async function audit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const data = await page.evaluate
const successSentence = 'Backup merged successfully. Existing learning data was preserved.';
const capacitySentence = 'This backup would exceed the 12-record experiment log. Export your current portfolio and remove records before importing. No saved evidence was replaced.';
const portfolio = page => page.locator('details.aq-portfolio-tools');
const summary = page => page.getByTestId('aq-learning-import-summary');
async function stateText(page) { return page.evaluate(key => localStorage.getItem(key), storageKey); }
function expectedSummary(archiveStats, draftRestored) {
  const a = archiveStats;
  return 'Saved investigations: ' + a.added + ' added; ' + a.alreadyPresent + ' exact ' + (a.alreadyPresent === 1 ? 'copy' : 'copies') + ' already present. ' + a.total + ' of 12 records.' +
    (a.variantAdded ? ' ' + a.variantAdded + ' added ' + (a.variantAdded === 1 ? 'original shares' : 'originals share') + ' an ID with a different saved investigation.' : '') +
    (draftRestored ? ' Backup investigation draft restored.' : ' Current investigation draft kept.');
}
async function checkSummary(page, archiveStats, draftRestored, label) {
  const expected = expectedSummary(archiveStats, draftRestored), target = summary(page);
  await target.filter({ hasText: expected }).waitFor(); equal(await target.innerText(), expected, label + ' shows exact successful import accounting');
  equal(await target.evaluate(element => element.tagName), 'P', label + ' summary is an ordinary paragraph');
  equal(await target.getAttribute('role'), null, label + ' summary adds no role'); equal(await target.getAttribute('aria-live'), null, label + ' summary adds no live announcement');
  assert(!(await target.evaluate(element => !!element.closest('[role="status"],[aria-live]'))), label + ' summary stays outside status/live containers');
  return expected;
}
async function plannedImport(page, value, expectedStats, expectedRestored, label) {
  await home(page);
  const plan = await page.evaluate(({ key, value }) => window.AquacultureLearningHelpers.planLearningPortfolioImport(JSON.parse(localStorage.getItem(key)), value, ['ecosystem']), { key: storageKey, value });
  equal(plan.archive, expectedStats, label + ' public plan has exact occurrence counts'); equal(plan.draftRestored, expectedRestored, label + ' plan reports draft adoption honestly');
  fs.writeFileSync(path.join(out, label + '-plan.json'), JSON.stringify(plan, null, 2));
  await importBackup(page, value); await portfolio(page).getByText(successSentence, { exact: true }).waitFor(); await checkSummary(page, expectedStats, expectedRestored, label);
  equal(await workspace(page), plan.state.ecosystemWorkspace, label + ' saved workspace equals pure planned state'); return plan;
}
async function rejectedImport(page, value, message, label) {
  await home(page); const beforeText = await stateText(page), before = await workspace(page);
  await importBackup(page, value); await portfolio(page).getByText(message, { exact: true }).waitFor();
  equal(await stateText(page), beforeText, label + ' changes no durable storage bytes'); equal(await workspace(page), before, label + ' keeps current canonical draft/originals');
  equal(await summary(page).count(), 0, label + ' displays no successful import summary');
  fs.writeFileSync(path.join(out, label + '-rejection.json'), JSON.stringify({ beforeText, afterText: await stateText(page), before, after: await workspace(page), message }, null, 2));
}
async function portfolioAudit(page, label, origin) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: origin + '/axe.js' });
  const data = await page.evaluate(async () => { const include = ['.aq-portfolio-tools']; if (document.querySelector('[data-testid="aq-learning-import-summary"]')) include.push('[data-testid="aq-learning-import-summary"]'); const result = await axe.run({ include }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: result.incomplete.map(item => item.id) }; });
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(data, null, 2)); equal(data.violations.length, 0, label + ' scoped WCAG A/AA: ' + JSON.stringify(data.violations));
}
async function portfolioVisual(page, label, origin, forced = false) {
  await portfolio(page).scrollIntoViewIfNeeded(); const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width, label + ' has no horizontal page overflow: ' + JSON.stringify(size));
  // The native file input is intentionally clipped to 1px inside its visible Import & merge
  // label. Measure that painted 44px label, buttons and summary; do not treat the hidden input
  // as a separate painted pointer target. All included controls must meet both bounds.
  const controls = await portfolio(page).locator('button,summary,label:has(#aq-portfolio-import)').evaluateAll(nodes => nodes.filter(node => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const item of controls) assert(item.height >= 43.5 && item.width >= 43.5, label + ' painted portfolio controls meet 44px target: ' + JSON.stringify(item));
  await portfolioAudit(page, label, origin); await portfolio(page).screenshot({ path: path.join(out, label + '-portfolio.png') });
  if (await summary(page).count()) await summary(page).screenshot({ path: path.join(out, label + '-summary.png') });
  if (forced) { await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await portfolioAudit(page, label + '-forced-colors', origin); await portfolio(page).screenshot({ path: path.join(out, label + '-portfolio-forced-colors.png') }); if (await summary(page).count()) await summary(page).screenshot({ path: path.join(out, label + '-summary-forced-colors.png') }); await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' }); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab'; let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const fixtureErrors = [], fixturePage = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: clone(pristineProbe) }, fixtureErrors, 1280), f = await fixtures(fixturePage);
    equal(fixtureErrors, [], 'Real React fixture mounted before numeric helper fixtures'); equal(f.defaults, pristineProbe, 'Explicit fixture retains actual stocked default'); equal(await fixturePage.evaluate(raw => window.AquacultureLearningHelpers.ecosystemWorkspaceHasWork(raw), f.defaults), false, 'Pristine default is honestly untouched');
    await openDetails(fixturePage, fixturePage.locator('.aq-eco-workbench > details').filter({ has: fixturePage.locator('#aq-eco-organisms-heading') }));
    for (const [name, units] of [['Eastern oyster', 2], ['Blue mussel', 2], ['Sugar kelp', 2], ['Phytoplankton community', 1]]) { const stock = fixturePage.locator('.aq-eco-organism').filter({ has: fixturePage.getByRole('button', { name: 'Remove one stocking unit of ' + name, exact: true }) }); equal(await stock.locator('[aria-live="polite"]').innerText(), units + ' units', 'Rendered stock count proves fixture default: ' + name); }
    await fixturePage.close(); fs.writeFileSync(path.join(out, 'actual-model-fixtures.json'), JSON.stringify(f, null, 2));
    const first = f.seed.ecosystemWorkspace.experiments[0], second = f.seed.ecosystemWorkspace.experiments[1];

    // 1. Same-ID different originals are retained; repeated exact backups add no further copies.
    {
      const errors = [], current = clone(f.seed); current.ecosystemWorkspace.experiments = [clone(first)]; const page = await openSeeded(browser, url, current, errors, 1280), before = await workspace(page), incoming = clone(f.incoming); incoming.experiments = [clone(first), clone(second)];
      await home(page); equal(await summary(page).count(), 0, 'No success summary before any selected-file import');
      await plannedImport(page, payload(incoming), { added: 1, alreadyPresent: 1, variantAdded: 1, before: 1, total: 2, limit: 12 }, false, 'same-id-different-original'); await portfolioVisual(page, 'desktop-same-id-added-1280', origin, true); await ecosystem(page);
      const after = await workspace(page); equal(after.experiments, [first, second], 'Current and incoming originals sharing ID both retained exactly'); equal(draft(after), draft(before), 'Meaningful current draft/capture remains exact'); equal(await archive(page).locator('.aq-record-identity-note').count(), 2, 'Retained same-ID originals both describe their independent card actions');
      equal(await downloadCard(page, 1, 'imported-second-original.html'), await expectedReport(page, second), 'Imported variant card exports exact incoming report/writing/readings'); equal(await card(page, 1).locator('img,script').count(), 0, 'Imported literal title remains inert'); assert(!(await page.evaluate(() => window.__archiveInjected)), 'Imported title executes no handler');
      const repeat = await plannedImport(page, payload(incoming), { added: 0, alreadyPresent: 2, variantAdded: 0, before: 2, total: 2, limit: 12 }, false, 'same-id-repeat-no-op'); equal(repeat.state.ecosystemWorkspace, after, 'Repeated identical backup changes no ecosystem data'); await page.setViewportSize({ width: 390, height: 900 }); await portfolioVisual(page, 'phone-repeat-no-op-390', origin, true);
      await rejectedImport(page, '{ malformed JSON', 'That file is not a valid Aquaculture Lab portfolio backup.', 'new-attempt-clears-old-summary'); await page.close();
      // A backup intentionally containing two exact occurrences retains max multiplicity, not a sum.
      const identicalSeed = clone(current), copiesPage = await openSeeded(browser, url, identicalSeed, errors, 390), copies = clone(f.incoming); copies.experiments = [clone(first), clone(first)];
      await plannedImport(copiesPage, payload(copies), { added: 1, alreadyPresent: 1, variantAdded: 0, before: 1, total: 2, limit: 12 }, false, 'identical-copy-max-count'); await plannedImport(copiesPage, payload(copies), { added: 0, alreadyPresent: 2, variantAdded: 0, before: 2, total: 2, limit: 12 }, false, 'identical-copy-repeat-no-op'); equal((await workspace(copiesPage)).experiments, [first, first], 'Two intended identical occurrences remain exactly two across repeated imports'); await copiesPage.close();
      result('Same-ID originals and idempotent occurrence accounting', ['different same-ID original retains full settings/results/writing/capture', 'second card exports exact incoming report with safe literal title', 'repeat exact import adds zero and reports two already present', 'max identical-copy multiplicity retained without repeated growth', 'new malformed-file attempt clears prior success summary without storage changes', '1280/390 summary/portfolio scoped axe/44px/reflow/forced colors'], errors);
    }

    // 2. An overlong incoming raw archive must reject before existing sanitizer clipping.
    {
      const errors = [], page = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: clone(f.defaults) }, errors, 390), raw13 = clone(f.incoming); raw13.experiments = Array.from({ length: 13 }, (_, index) => ({ ...clone(second), id: 'raw-thirteen-' + index, title: 'Raw original ' + (index + 1), savedAt: time - index }));
      equal(raw13.experiments.length, 13, 'Raw overlong backup contains thirteen genuine complete originals'); fs.writeFileSync(path.join(out, 'raw-thirteen-input.json'), JSON.stringify(payload(raw13), null, 2));
      await rejectedImport(page, payload(raw13), capacitySentence, 'raw-thirteen-rejected-before-clipping'); await portfolioVisual(page, 'raw-thirteen-rejection-390', origin, true); await ecosystem(page); equal((await workspace(page)).experiments, [], 'No first-twelve partial import is saved'); await page.close();
      result('Raw thirteen-record backup rejection is atomic', ['actual JSON file has thirteen complete originals', 'rejected before first-twelve sanitizer clipping', 'durable storage bytes and untouched draft unchanged', 'no success summary or partial archive', '390px portfolio/scoped axe/44px/forced colors'], errors);
    }

    // 3. A full log plus a different incoming original with an existing ID must not silently omit it.
    {
      const errors = [], seed = clone(f.seed); seed.ecosystemWorkspace.experiments = Array.from({ length: 12 }, (_, index) => ({ ...clone(first), id: 'full-original-' + index, title: 'Current full-log original ' + (index + 1), savedAt: time + 1000 - index }));
      const page = await openSeeded(browser, url, seed, errors, 320), incoming = clone(f.incoming); incoming.experiments = [{ ...clone(second), id: 'full-original-0', title: 'Incoming different original sharing full-log ID' }];
      await rejectedImport(page, payload(incoming), capacitySentence, 'full-log-variant-rejected'); await portfolioVisual(page, 'full-log-variant-rejection-320', origin, true); await ecosystem(page); equal((await workspace(page)).experiments, seed.ecosystemWorkspace.experiments, 'All twelve original records remain exact, with no hidden replacement'); await page.close();
      result('Full log rejects a same-ID different original', ['same-ID variant counts as a real thirteenth original', 'atomic capacity rejection preserves all twelve current originals', 'current draft/readings unchanged', 'no success summary or overwrite', '320px/scoped axe/44px/reflow/forced colors'], errors);
    }

    // 4. The successful summary distinguishes draft restoration from protecting unfinished work.
    {
      const errors = [], emptyStats = { added: 0, alreadyPresent: 0, variantAdded: 0, before: 0, total: 0, limit: 12 }, untouched = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: clone(f.defaults) }, errors, 390);
      await plannedImport(untouched, payload(f.incoming), emptyStats, true, 'untouched-draft-restored'); equal(await workspace(untouched), f.incoming, 'Actual draft-only backup restored into untouched default'); await portfolioVisual(untouched, 'draft-restored-summary-390', origin, true); await untouched.close();
      const pending = clone(f.defaults); pending.evidence.nextTest = '  My unfinished current next test stays exact.  '; pending.prediction = ' '; pending.measurements = clone(f.seed.ecosystemWorkspace.measurements);
      const protectedPage = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: pending }, errors, 390), before = await workspace(protectedPage); await plannedImport(protectedPage, payload(f.incoming), emptyStats, false, 'unfinished-draft-kept'); equal(await workspace(protectedPage), before, 'Captured source, whitespace and unfinished Next test all remain exact'); await portfolioVisual(protectedPage, 'draft-kept-summary-390', origin, true); await protectedPage.close();
      result('Successful summaries distinguish restored and protected drafts', ['untouched stocked default adopts actual draft-only backup', 'summary truthfully reports draft restored with zero archives', 'unfinished Next test, whitespace and captured reading block overwrite', 'summary truthfully reports current draft kept', '390px plain paragraphs/scoped axe/44px/reflow/forced colors'], errors);
    }

    // 5. Failed imports retain both session recoveries; only actual successful save clears them.
    {
      const errors = [], page = await openSeeded(browser, url, f.seed, errors, 390); await remove(page, 1); await openDetails(page, notebook(page)); await keyboard(page, notebook(page).getByRole('button', { name: /^Remove reading:/ }).first()); await tray(page).waitFor();
      const keysBefore = await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), kept = await workspace(page), raw13 = clone(f.incoming); raw13.experiments = Array.from({ length: 13 }, (_, index) => ({ ...clone(second), id: 'recoveries-excess-' + index }));
      await rejectedImport(page, payload(raw13), capacitySentence, 'rejected-import-keeps-recoveries'); await ecosystem(page); equal(await recovery(page).count(), 1, 'Capacity rejection retains archive Undo'); equal(await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), keysBefore, 'Capacity rejection retains live-reading recovery');
      await home(page); const durableBeforeFault = await stateText(page); await page.evaluate(key => { window.__qaOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(item, value) { if (item === key) throw new DOMException('QA simulated device quota exceeded', 'QuotaExceededError'); return window.__qaOriginalSetItem.call(this, item, value); }; }, storageKey);
      await importBackup(page, payload(kept)); await portfolio(page).getByText('The backup was valid, but this browser could not save it.', { exact: true }).waitFor(); equal(await stateText(page), durableBeforeFault, 'Device-save failure changes no durable storage bytes'); equal(await summary(page).count(), 0, 'Device-save failure creates no success summary'); await portfolioVisual(page, 'device-save-rejected-summary-390', origin, true); await ecosystem(page);
      equal(await recovery(page).count(), 1, 'Device-save failure retains archive Undo'); equal(await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), keysBefore, 'Device-save failure retains live-reading recovery'); await visual(page, 'device-failure-both-recoveries-390', origin, true);
      await page.evaluate(() => { Storage.prototype.setItem = window.__qaOriginalSetItem; }); await keyboard(page, page.getByRole('button', { name: 'Retry device save', exact: true })); equal(await workspace(page), kept, 'Retry persists exact pending current workspace without resurrecting removed data');
      await plannedImport(page, payload(kept), { added: 0, alreadyPresent: 1, variantAdded: 0, before: 1, total: 1, limit: 12 }, false, 'successful-import-clears-recoveries'); await ecosystem(page); equal(await recovery(page).count(), 0, 'Actual successful import clears old archive Undo'); equal(await tray(page).count(), 0, 'Actual successful import clears removed-reading tray'); equal(await workspace(page), kept, 'Successful current backup import keeps removed state exact'); await page.close();
      result('Rejected and device-failed imports preserve session recovery', ['capacity rejection preserves archive Undo and live tray', 'real post-mount quota fault preserves durable bytes and creates no success stats', 'failed save retains both recoveries and pending current draft', 'Retry persists exact current workspace', 'only actual successful save reports summary and clears both recoveries', '390px portfolio and archive/scoped axe/44px/reflow/forced colors'], errors);
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2)); console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error; }
  finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
