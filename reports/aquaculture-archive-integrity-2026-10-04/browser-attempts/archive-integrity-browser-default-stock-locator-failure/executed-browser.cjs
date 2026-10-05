/* Author-only browser QA; root alone executes this frozen taskscript. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { isDeepStrictEqual } = require('util');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const out = path.join(__dirname, 'aquaculture/archive-integrity-browser');
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
async function importBackup(page, value) { await page.locator('#aq-portfolio-import').setInputFiles({ name: 'archive-integrity-import.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) }); }
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
  const data = await page.evaluate(async () => { const result = await axe.run({ include: ['.aq-saved-experiments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: result.incomplete.map(item => item.id) }; });
  fs.writeFileSync(path.join(out, label + '-axe.json'), JSON.stringify(data, null, 2)); equal(data.violations.length, 0, label + ' scoped WCAG A/AA: ' + JSON.stringify(data.violations));
}
async function visual(page, label, origin, forced = false) {
  await archive(page).scrollIntoViewIfNeeded(); const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width, label + ' has no horizontal page overflow: ' + JSON.stringify(size));
  const controls = await archive(page).locator('button,input,summary').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label') || node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })).filter(item => item.height > 0));
  for (const item of controls) assert(item.height >= 43.5 && item.width >= 43.5, label + ' archive controls meet 44px target: ' + JSON.stringify(item));
  const ids = await page.evaluate(() => { const ids = Array.from(document.querySelectorAll('[id]'), node => node.id); return ids.filter((id, index) => ids.indexOf(id) !== index); }); equal(ids, [], label + ' archive and captured source ids stay unique');
  await audit(page, label, origin); await archive(page).screenshot({ path: path.join(out, label + '-archive.png') });
  if (await recovery(page).count()) { const button = recovery(page).getByRole('button', { name: 'Undo remove', exact: true }); equal(await button.getAttribute('aria-describedby'), 'aq-archive-undo-status', 'Undo has its own plain recovery description'); assert(!(await button.evaluate(element => !!element.closest('[role="status"],[aria-live]'))), 'Undo control sits outside live/status containers'); await recovery(page).screenshot({ path: path.join(out, label + '-undo.png') }); }
  if (forced) { await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await page.locator('#aq-saved-experiments-heading').focus(); await focused(page, 'aq-saved-experiments-heading'); const paint = await page.locator('#aq-saved-experiments-heading').evaluate(element => { const s = getComputedStyle(element); return { focused: element === document.activeElement, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, text: s.color, background: s.backgroundColor }; }); assert(paint.focused && paint.outlineStyle !== 'none' && parseFloat(paint.outlineWidth) > 0, 'Forced-color archive heading has visible focus outline'); fs.writeFileSync(path.join(out, label + '-focus-paint.json'), JSON.stringify(paint, null, 2)); await audit(page, label + '-forced-colors', origin); await archive(page).screenshot({ path: path.join(out, label + '-archive-forced-colors.png') }); if (await recovery(page).count()) await recovery(page).screenshot({ path: path.join(out, label + '-undo-forced-colors.png') }); await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' }); }
}
function result(name, checks, errors, extra = {}) { equal(errors, [], name + ' has no runtime errors or duplicate React key warnings'); results.push({ case: name, checks, errors, ...extra }); }
async function fixtures(page) { return page.evaluate(({ baseline, changed, writing, time, literal, key }) => {
  const h = window.AquacultureLearningHelpers, defaults = h.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem(key)).ecosystemWorkspace);
  function saved(scenario, title, savedAt, id) { const ws = { ...scenario, baselineScenario: baseline }, a = h.simulateEcosystemYear(baseline), b = h.simulateEcosystemYear(scenario), model = h.calculateEcosystem(scenario), note = h.ecosystemMeasurement(ws, { scope: 'annual', metricId: 'minOxygen' }, savedAt - 60000, title.includes('Second') ? 'second-original-reading' : 'first-original-reading'); return { id, title, kind: 'comparison', savedAt, modelVersion: b.modelVersion, environmentId: scenario.environmentId, organisms: scenario.organisms, status: model.status, carryingPressure: model.carryingPressure, oxygen: model.oxygen, ammonia: model.ammonia, resilience: model.resilience, baselineScenario: baseline, currentScenario: scenario, baselineSummary: a.summary, currentSummary: b.summary, prediction: title + ' original prediction', observation: title + ' original reflection with complete evidence.', evidence: writing, measurements: [note] }; }
  const first = saved(baseline, 'First saved original', time, 'shared-original-id'), second = saved(changed, 'Second ' + literal, time - 60000, 'shared-original-id');
  const live = { ...changed, water: { ...changed.water, oxygen: 7.1 }, baselineScenario: baseline }, liveNote = h.ecosystemMeasurement(live, { scope: 'month', month: 6, metricId: 'oxygen', speciesId: 'system' }, time - 120000, 'current-draft-reading');
  const seed = { lastTopic: 'ecosystem', ecosystemWorkspace: { ...live, prediction: 'Current prediction stays with my parked draft.', observation: 'Current reflection with enough writing for a snapshot.', evidence: { ...writing, claim: 'Current claim differs from archive.' }, measurements: [liveNote], experiments: [first, second], investigationId: '', parkedDraft: null } };
  const incoming = h.sanitizeEcosystemWorkspace({ ...baseline, water: { ...baseline.water, oxygen: 6.2 }, prediction: 'Imported draft-only prediction', observation: 'Imported draft-only reflection', evidence: { ...writing, nextTest: 'Imported next test' }, experiments: [], measurements: [], parkedDraft: null });
  return { defaults, seed: { ...seed, ecosystemWorkspace: h.sanitizeEcosystemWorkspace(seed.ecosystemWorkspace) }, incoming };
}, { baseline, changed, writing, time, literal, key: storageKey }); }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/qa/aquacultureLab'; let browser;
  try {
    browser = await chromium.launch({ headless: true });
    // A raw absent workspace sanitizes to zero stock. Seed the real stocked default explicitly,
    // then verify both the pure work guard and rendered stock controls before testing adoption.
    const fixtureErrors = [], fixturePage = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: clone(pristineProbe) }, fixtureErrors, 1280), f = await fixtures(fixturePage); equal(fixtureErrors, [], 'Real React fixture mounted before helpers generated any numeric sources');
    equal(f.defaults, pristineProbe, 'Pristine probe retains the exact complete stocked default'); equal(await fixturePage.evaluate(raw => window.AquacultureLearningHelpers.ecosystemWorkspaceHasWork(raw), f.defaults), false, 'Actual stocked default is untouched and may adopt a draft-only backup');
    for (const [name, units] of [['Eastern oyster', 2], ['Blue mussel', 2], ['Sugar kelp', 2], ['Phytoplankton community', 1]]) { const stock = fixturePage.locator('.aq-eco-organism').filter({ has: fixturePage.getByRole('button', { name: 'Remove one stocking unit of ' + name, exact: true }) }); equal(await stock.locator('[aria-live="polite"]').innerText(), units + ' units', 'Rendered pristine stock count matches actual default: ' + name); }
    await fixturePage.close();
    fs.writeFileSync(path.join(out, 'actual-model-fixtures.json'), JSON.stringify(f, null, 2));

    // Actual native card actions, including a literal untrusted title and caret stability.
    {
      const errors = [], page = await openSeeded(browser, url, f.seed, errors, 1280), before = await workspace(page);
      equal(await archive(page).locator('.aq-record-identity-note').count(), 2, 'Both duplicate cards describe independent original actions');
      for (const index of [0, 1]) { const refs = (await card(page, index).locator('input').getAttribute('aria-describedby')).split(/\s+/); assert(refs.includes('aq-record-identity-note-' + index), 'Duplicate input description belongs to its own card'); }
      const report = await downloadCard(page, 1, 'second-original-report.html'); equal(report, await expectedReport(page, before.experiments[1]), 'Second-card export is the exact second original report'); assert(report.includes('&lt;img') && report.includes('&amp;'), 'Original report escapes literal title markup'); equal(await card(page, 1).locator('img,script').count(), 0, 'Literal title creates no interpreted HTML on card'); assert(!(await page.evaluate(() => window.__archiveInjected)), 'Literal title executes no handler');
      const name = card(page, 1).locator('input'); await name.focus(); await page.evaluate(() => { window.__qaNameNode = document.activeElement; }); await name.fill('Second renamed Ω'); await page.keyboard.press('End'); await page.keyboard.type('  '); const after = await workspace(page); equal(after.experiments[0], before.experiments[0], 'Second rename keeps first canonical original unchanged'); equal(after.experiments[1], { ...before.experiments[1], title: 'Second renamed Ω  ' }, 'Second rename changes only title and keeps trailing whitespace'); const caret = await name.evaluate(element => ({ same: element === window.__qaNameNode, active: element === document.activeElement, start: element.selectionStart, end: element.selectionEnd, length: element.value.length })); assert(caret.same && caret.active && caret.start === caret.length && caret.end === caret.length, 'Rename preserves mounted input, focus and end caret during rerenders');
      equal(await downloadCard(page, 1, 'second-renamed-report.html'), await expectedReport(page, after.experiments[1]), 'Renamed second card still exports its own original numeric sources'); const removed = await remove(page, 1); await visual(page, 'desktop-exact-remove-1280', origin, true); await undo(page, removed); await page.setViewportSize({ width: 390, height: 900 }); await focused(page, 'aq-saved-experiments-heading'); await visual(page, 'phone-duplicates-390', origin); await page.close();
      result('Duplicate cards act on their own original', ['real second-card download equals canonical report', 'literal title remains inert and escaped', 'only selected title renamed', 'input identity/focus/caret stable with Unicode and trailing whitespace', 'one selected original removed and exact Undo', '1280/390 reflow/44px/scoped axe and forced colors'], errors);
    }

    // Exact identical siblings are two occurrences, and archive edits retain a removed live reading.
    {
      const seed = clone(f.seed); seed.ecosystemWorkspace.experiments = [clone(seed.ecosystemWorkspace.experiments[0]), clone(seed.ecosystemWorkspace.experiments[0])]; const errors = [], page = await openSeeded(browser, url, seed, errors, 320);
      await openDetails(page, notebook(page)); await keyboard(page, notebook(page).getByRole('button', { name: /^Remove reading:/ }).first()); await tray(page).waitFor(); const recoveryKeys = await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key')));
      const removed = await remove(page, 1); equal((await workspace(page)).experiments.length, 1, 'Identical sibling remains after one-row removal'); await visual(page, 'identical-sibling-undo-320', origin, true); await undo(page, removed); equal((await workspace(page)).experiments.length, 2, 'Undo restores two original identical occurrences'); equal(await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), recoveryKeys, 'Archive remove and Undo keep pass11 live-reading recovery'); await page.close();
      result('Identical sibling multiplicity and reading recovery', ['two canonical identical occurrences retained', 'selected one-row removal', 'one occurrence restored beside exact sibling', 'archive actions preserve live-reading recovery', '320px/scoped axe/forced-color Undo'], errors);
    }

    // Native replay/branch of duplicate second card preserves current work under Return.
    {
      const errors = [];
      for (const action of ['replay', 'branch']) { const page = await openSeeded(browser, url, f.seed, errors, 390), before = await workspace(page), selected = before.experiments[1]; await openDetails(page, notebook(page)); await keyboard(page, notebook(page).getByRole('button', { name: /^Remove reading:/ }).first()); const current = await workspace(page); await tray(page).waitFor();
        await keyboard(page, card(page, 1).getByRole('button', { name: action === 'replay' ? /^Replay experiment/ : /^Use saved B as A/ })); await focused(page, 'aq-investigation-heading'); const after = await workspace(page); equal(after.experiments, before.experiments, action + ' preserves both duplicate originals'); equal(after.water, selected.currentScenario.water, action + ' loads exact second settings'); equal(after.organisms, selected.currentScenario.organisms, action + ' loads exact second community'); equal(after.parkedDraft, draft(current), action + ' parks exact current design/writing/notebook'); equal(await tray(page).count(), 0, 'Successful ' + action + ' expires reading recovery for notebook left');
        if (action === 'replay') { equal(after.prediction, selected.prediction, 'Replay loads second original prediction'); equal(after.measurements, selected.measurements, 'Replay loads exact second captured sources'); }
        else { equal(after.baselineScenario, selected.currentScenario, 'Branch makes exact second B the new A'); equal(after.measurements, [], 'Branch starts a fresh notebook'); equal(after.prediction, '', 'Branch starts a fresh prediction'); }
        assert(await card(page, 0).getByRole('button', { name: /^Replay experiment/ }).isDisabled(), 'Parked draft disables nested replay'); await keyboard(page, page.getByRole('button', { name: 'Return to my draft', exact: true })); equal(draft(await workspace(page)), draft(current), 'Return restores exact live draft after ' + action); equal((await workspace(page)).parkedDraft, null, 'Return consumes parked draft'); await page.close(); }
      result('Duplicate second-card replay and branch', ['exact second scenario and originals used', 'replay preserves second prediction/captured sources', 'branch uses second B as A with fresh notebook', 'current draft parked exact', 'nested replay disabled', 'Return exact and successful transitions expire live recovery'], errors);
    }

    // Controlled external canonical-state probe: stale rendered card rejects and syncs fresh UI.
    {
      const errors = [], page = await openSeeded(browser, url, f.seed, errors, 390), before = await workspace(page); const fresh = clone(before); fresh.experiments.reverse(); fresh.experiments[0].title = 'Fresh changed canonical second original'; await page.evaluate(({ key, fresh }) => { const state = JSON.parse(localStorage.getItem(key)); state.ecosystemWorkspace = fresh; localStorage.setItem(key, JSON.stringify(state)); }, { key: storageKey, fresh });
      await keyboard(page, card(page, 0).getByRole('button', { name: /^Remove experiment/ })); await page.getByText('That saved investigation changed or moved. Review its current card and try again. Your records and draft were kept.', { exact: true }).waitFor(); equal(await workspace(page), fresh, 'Stale canonical target writes nothing and keeps every fresh original'); equal(await card(page, 0).locator('input').inputValue(), fresh.experiments[0].title, 'Stale rejection refreshes current card instead of repeating stale target'); equal(await recovery(page).count(), 0, 'Stale rejection creates no removal memento'); await page.close();
      result('Controlled stale canonical target rejection', ['external canonical reorder/rename probe is explicitly controlled', 'stale native remove writes nothing', 'fresh current cards become visible', 'no fallback by shared identifier and no ghost Undo'], errors);
    }

    // Real backup file selection protects current draft-only evidence/settings and adopts incoming draft into default.
    {
      const errors = [], protectedCases = [
        ['structured-writing', { evidence: { ...writing, claim: 'Only current CER protects this draft.' } }],
        ['next-test-only', { evidence: { claim: '', evidence: '', reasoning: '', nextTest: '  Only my next test survives.  ' } }],
        ['whitespace-writing', { observation: '  \n ', prediction: '  ', evidence: { claim: ' ', evidence: '', reasoning: '', nextTest: '' } }],
        ['captured-reading', { measurements: clone(f.seed.ecosystemWorkspace.measurements) }],
        ['edited-design', { water: { ...f.defaults.water, oxygen: f.defaults.water.oxygen + .1 } }],
        ['explicit-zero-stock', { organisms: {} }]
      ];
      for (const [name, patch] of protectedCases) { const seed = { lastTopic: 'ecosystem', ecosystemWorkspace: { ...clone(f.defaults), ...patch } }, page = await openSeeded(browser, url, seed, errors, 390), before = await workspace(page); await importSuccess(page, payload(f.incoming)); equal(await workspace(page), before, name + ' survives actual draft-only backup import'); fs.writeFileSync(path.join(out, 'import-protected-' + name + '.json'), JSON.stringify({ before, after: await workspace(page) }, null, 2)); await page.close(); }
      const page = await openSeeded(browser, url, { lastTopic: 'ecosystem', ecosystemWorkspace: clone(f.defaults) }, errors, 390); await importSuccess(page, payload(f.incoming)); equal(await workspace(page), f.incoming, 'Untouched default adopts actual draft-only backup without archived experiments'); const beforeMissing = await workspace(page); await importSuccess(page, { kind: 'aquaculture-learning-portfolio', version: 1, learning: {} }); equal(await workspace(page), beforeMissing, 'Backup with missing workspace cannot manufacture and adopt a replacement'); await page.close();
      result('Actual draft-only backup preservation and adoption', ['CER-only, Next-test-only and whitespace writing protected', 'captured reading, edited design and explicit zero-stock protected', 'untouched actual default adopts draft without archives', 'missing incoming workspace never manufactures a replacement'], errors, { protectedCases: protectedCases.map(item => item[0]) });
    }

    // Duplicate import preservation, prototype identifiers and failed/successful import recovery lifetime.
    {
      const errors = [], page = await openSeeded(browser, url, f.seed, errors, 390), before = await workspace(page); const incoming = clone(f.incoming), template = before.experiments[1]; incoming.experiments = [{ ...template, id: 'incoming-duplicate', title: 'Incoming first duplicate', savedAt: time - 120000 }, { ...template, id: 'incoming-duplicate', title: 'Incoming second duplicate', savedAt: time - 180000 }, { ...template, id: '__proto__', title: 'Prototype-looking original', savedAt: time - 240000 }, { ...template, id: 'constructor', title: 'Constructor-looking original', savedAt: time - 300000 }];
      await importSuccess(page, payload(incoming)); const after = await workspace(page); equal(after.experiments.slice(0, 2), before.experiments, 'Unrelated import keeps every current duplicate occurrence'); equal(after.experiments.slice(2).map(record => [record.id, record.title]), incoming.experiments.map(record => [record.id, record.title]), 'All incoming duplicate and prototype-looking original occurrences retained'); equal(draft(after), draft(before), 'Archive import keeps meaningful current draft');
      const removed = await remove(page, 1); await openDetails(page, notebook(page)); await keyboard(page, notebook(page).getByRole('button', { name: /^Remove reading:/ }).first()); await tray(page).waitFor(); const oldKeys = await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), kept = await workspace(page);
      await home(page); await importBackup(page, '{ invalid JSON'); await page.getByText('That file is not a valid Aquaculture Lab portfolio backup.', { exact: true }).waitFor(); await ecosystem(page); equal(await workspace(page), kept, 'Invalid JSON import keeps exact current data'); equal(await recovery(page).count(), 1, 'Invalid JSON preserves archive Undo'); equal(await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), oldKeys, 'Invalid JSON preserves removed live-reading tray');
      const excess = clone(f.incoming); excess.experiments = Array.from({ length: 12 }, (_, index) => ({ ...template, id: 'excess-' + index, savedAt: time - 400000 - index })); await home(page); await importBackup(page, payload(excess)); await page.getByText('This backup would exceed the 12-record experiment log. Export your current portfolio and remove records before importing. No saved evidence was replaced.', { exact: true }).waitFor(); await ecosystem(page); equal(await workspace(page), kept, 'Capacity rejection evicts or changes no originals'); equal(await recovery(page).count(), 1, 'Capacity rejection preserves archive Undo'); equal(await tray(page).locator('.aq-removed-measurement').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-removed-key'))), oldKeys, 'Capacity rejection preserves live tray'); await page.locator('#aq-saved-experiments-heading').focus(); await focused(page, 'aq-saved-experiments-heading'); await visual(page, 'failed-import-recovery-390', origin, true);
      await importSuccess(page, payload(kept)); equal(await recovery(page).count(), 0, 'Actual successful import consumes old archive Undo'); equal(await tray(page).count(), 0, 'Actual successful import expires live-reading recovery'); equal(await workspace(page), kept, 'Import current backup changes no durable source data'); assert(!(await workspace(page)).experiments.some(record => isDeepStrictEqual(record, removed.selected)), 'Successful backup of current state does not resurrect removed original'); await page.close();
      result('Duplicate backup merge and guarded import recovery lifetime', ['all current duplicate occurrences kept', 'all unrelated incoming duplicate occurrences kept', 'prototype-looking identifiers retained', 'invalid JSON and capacity rejection preserve exact source and both session recovery controls', 'successful import clears old archive Undo and live tray without source resurrection', '390px/scoped axe/forced-color recovery'], errors);
    }

    // Real device-write fault occurs after mount; pending canonical archives remain actionable.
    {
      const errors = [], page = await openSeeded(browser, url, f.seed, errors, 390), durable = await workspace(page); await page.evaluate(key => { window.__qaOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(item, value) { if (item === key) throw new DOMException('QA simulated device quota exceeded', 'QuotaExceededError'); return window.__qaOriginalSetItem.call(this, item, value); }; }, storageKey);
      await keyboard(page, card(page, 1).getByRole('button', { name: /^Remove experiment/ })); await focused(page, 'aq-saved-experiments-heading'); await recovery(page).waitFor(); await page.locator('.aq-storage-recovery').waitFor(); equal(await workspace(page), durable, 'Failed archive write leaves durable original unchanged'); const currentBackup = await download(page, page.getByRole('button', { name: 'Download current backup', exact: true }), 'device-failure-current-archive.json', true), session = currentBackup.learning.ecosystemWorkspace; equal(session.experiments, [durable.experiments[0]], 'Fallback backup uses current exact selected removal'); equal(await downloadCard(page, 0, 'device-failure-first-original.html'), await expectedReport(page, durable.experiments[0]), 'Fallback current card downloads its own exact remaining original');
      await home(page); await importBackup(page, payload(session)); await page.getByText('The backup was valid, but this browser could not save it.', { exact: true }).waitFor(); await ecosystem(page); equal(await recovery(page).count(), 1, 'Failed device-save import keeps archive Undo'); assert(await recovery(page).getByRole('button', { name: 'Undo remove', exact: true }).isEnabled(), 'Undo remains available against pending canonical state'); await visual(page, 'device-failure-undo-390', origin, true);
      await keyboard(page, recovery(page).getByRole('button', { name: 'Undo remove', exact: true })); await focused(page, 'aq-saved-experiments-heading'); equal(await recovery(page).count(), 0, 'Session Undo consumes memento during device failure'); const restored = await download(page, page.getByRole('button', { name: 'Download current backup', exact: true }), 'device-failure-restored-archive.json', true); equal(restored.learning.ecosystemWorkspace.experiments, durable.experiments, 'Session Undo restores exact duplicate original sources'); await page.evaluate(() => { Storage.prototype.setItem = window.__qaOriginalSetItem; }); await keyboard(page, page.getByRole('button', { name: 'Retry device save', exact: true })); equal(await workspace(page), restored.learning.ecosystemWorkspace, 'Retry saves exact current session'); await page.reload(); await archive(page).waitFor(); equal(await workspace(page), restored.learning.ecosystemWorkspace, 'Retry and reload retain exact restored current workspace'); await page.close();
      result('Device save failure retains current archive Undo', ['real post-mount quota fault preserves durable state', 'current backup reflects pending exact card removal', 'remaining card export uses pending canonical record', 'failed valid import retains archive Undo', 'session Undo restores exact originals', 'explicit Retry and reload save exact current session', '390px/scoped axe/forced colors'], errors);
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', results }, null, 2)); console.log(JSON.stringify({ status: 'passed', output: out, results }));
  } catch (error) { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'failed', error: error.stack, results }, null, 2)); throw error; }
  finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
