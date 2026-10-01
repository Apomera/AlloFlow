'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const repo = process.env.PT_REPO || path.resolve(__dirname, '..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const source = fs.readFileSync(process.env.PT_REPORT_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const out = process.env.PT_REPORT_QA_OUT || path.join(repo, 'scratch/tectonics-investigation-report-review');
fs.mkdirSync(out, { recursive: true });
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const registrySource = read('ui_strings.js'), registry = JSON.parse(registrySource);
const reportKeys = [...new Set([...source.matchAll(/t\('stem\.platetectonics\.(rpt_[^']+)'/g)].map(match => match[1]))];
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registrySource).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(registry.stem.platetectonics)).digest('hex'), reportKeys, checks: [], layouts: [], captures: [], errors: [] };
const check = name => { report.checks.push({ name, pass: true }); process.stdout.write('PASS ' + name + '\n'); };
const applicationOnly = process.argv.includes('--application-only');
async function runSavedApplicationProvenance(browser) {
  assert.ok(reportKeys.length >= 47);
  assert.deepEqual(reportKeys.filter(key => typeof registry.stem?.platetectonics?.[key] !== 'string'), []);
  for (const { width, dark } of [{ width: 1100, dark: false }, { width: 390, dark: true }]) {
    const name = `application-${dark ? 'dark' : 'light'}-${width}`;
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Saved application evidence provenance</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    await page.evaluate(() => {
      const frames = new Map(); let id = 0, now = 0;
      window.qaLog = { writes: [], snapshotWrites: [], xp: [], notices: [], sounds: [], announcements: [], prints: [] };
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaFrames = count => { for (let i = 0; i < count; i++) { now += 1000 / 60; for (const [handle, callback] of [...frames]) if (frames.delete(handle)) callback(now); } };
      for (const [name, proto] of [['oscillator', OscillatorNode.prototype], ['buffer', AudioBufferSourceNode.prototype]]) {
        const start = proto.start; proto.start = function (...args) { qaLog.sounds.push(name); return start.apply(this, args); };
      }
    });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(strings => {
      window.reviewStrings = strings;
      window.qaT = (key, fallback) => { const value = key.split('.').reduce((value, part) => value && value[part], reviewStrings); return typeof value === 'string' ? value : fallback; };
      StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {});
    }, registry);
    await page.addScriptTag({ content: source });
    await page.evaluate(dark => {
      const noop = () => {}, Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.qaWriting = { claim: 'A cold sinking plate carries earthquake sources deeper.', evidence: 'My model recorded deeper convergent earthquake sources and shallower divergent and transform earthquake sources.', reasoning: 'The contrasting depth patterns connect a sinking slab to the deeper earthquake sources in the convergent model.' };
      window.qaOldReason = 'My earlier response used only the shallow focus and selected spreading.';
      window.qaNewReason = 'The trench and foci deepening from 20 to 160 to 380 km support a descending slab at convergent subduction.';
      const records = Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, __alloPtDepthTrials.capture({ mode, qlog: (mode === 'convergent' ? [20, 160, 510] : [5, 25]).map(z => ({ z })), rate: 5, years: 600000, depthRunRate: 5, depthRunRateConstant: true })]));
      const submission = { rate: 5, years: 600000, prediction: 'The convergent sample will include deeper earthquakes.', explanation: 'The cold sinking slab gives the convergent model a deep earthquake pattern while the other boundaries remain shallow.', records, transferChoice: 'divergent', transferReason: qaOldReason };
      const inquiry = __alloPtBoundaryInquiry.read({ version: 1, plan: { rate: 5, years: 600000, prediction: submission.prediction }, submission });
      if (!inquiry?.submission) throw new Error('Registered-parent fixture must contain three validated constant-rate records.');
      window.qaComparisonCore = row => JSON.stringify({ rate: row.rate, years: row.years, prediction: row.prediction, explanation: row.explanation, records: row.records });
      window.qaOriginalCore = qaComparisonCore(inquiry.submission);
      const root = ReactDOM.createRoot(document.querySelector('#app'));
      function Host() {
        const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, simTab: 'explain', ptDrift: false, tabsViewed: { explain: true, sim: true }, ptDepthTrials: records, ptBoundaryInquiry: inquiry, ptCERDraft: qaWriting } });
        const [snapshots, setSnapshots] = React.useState([]);
        window.qaData = data; window.qaSnapshots = snapshots;
        window.qaNavigate = tab => { qaLog.writes.push('navigation'); setData(prev => ({ ...prev, plateTectonics: { ...prev.plateTectonics, simTab: tab } })); };
        return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: action => { qaLog.writes.push('setToolData'); setData(action); }, isDark: dark, isContrast: false, icons: Icons,
          setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: action => { qaLog.snapshotWrites.push('setToolSnapshots'); setSnapshots(action); }, toolSnapshots: snapshots,
          addToast: (...args) => qaLog.notices.push(args), announceToSR: text => qaLog.announcements.push(text), awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
          beep: (...args) => qaLog.sounds.push(['beep', ...args]), celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: qaT, props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null });
      }
      document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
      ReactDOM.flushSync(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host))));
      window.qaIdleSignature = () => JSON.stringify({ data: qaData, snapshots: qaSnapshots, logs: Object.fromEntries(Object.entries(qaLog).map(([key, value]) => [key, value.length])) });
      const nativeOpen = window.open;
      window.open = function () { const popup = nativeOpen.apply(window, arguments); if (popup) { const write = popup.document.write.bind(popup.document); popup.document.write = html => { window.qaLastPrintHTML = html; return write(html); }; popup.print = () => qaLog.prints.push('print'); } return popup; };
    }, dark);
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const frames = async count => { for (let left = count; left > 0; left -= 120) await page.evaluate(n => qaFrames(n), Math.min(120, left)); };
    const settle = async () => { await frames(2); await page.waitForTimeout(750); };
    const idle = async () => { await settle(); const before = await page.evaluate(() => qaIdleSignature()); await frames(1200); await page.waitForTimeout(250); assert.equal(await page.evaluate(() => qaIdleSignature()), before, 'Idle frames must not write evidence, create snapshots, announce, award or sound.'); };
    const capture = async (locator, suffix) => { const file = path.join(out, name + '-' + suffix + '.png'); await locator.screenshot({ path: file, animations: 'disabled' }); report.captures.push(file); };
    await page.locator('[data-pt-cer-save]').waitFor(); await click('[data-pt-cer-save]');
    await page.waitForFunction(() => qaData.plateTectonics.ptCER?.evidenceContext?.boundaryComparison?.transferChoice === 'divergent'); await settle();
    await page.evaluate(() => { window.qaEarlierCER = qaData.plateTectonics.ptCER; window.qaEarlierJSON = JSON.stringify(qaEarlierCER); window.qaEarlierPrint = __alloPtInvestigationReport.html(qaEarlierCER, qaT); window.qaEarlierSnapshots = JSON.stringify(qaSnapshots); });
    assert.match(await page.evaluate(() => qaEarlierPrint), /My earlier response/); await idle();
    check(name + ': explicit first CER save freezes the earlier application answer and remains silent through idle frames');
    await page.evaluate(() => qaNavigate('sim')); await page.locator('[data-pt-boundary-guide]').waitFor();
    await page.locator('[data-pt-boundary-guide]').evaluate(node => { node.open = true; }); await settle();
    await page.locator('[data-pt-boundary-prediction]').fill('A newer plan uses a different rate and model duration.');
    await page.locator('[data-pt-boundary-rate]').selectOption('10'); await page.locator('[data-pt-boundary-time]').selectOption('1200000'); await click('[data-pt-boundary-plan-save]');
    await page.waitForFunction(() => qaData.plateTectonics.ptBoundaryInquiry.plan.rate === 10);
    assert.equal(await page.evaluate(() => qaComparisonCore(qaData.plateTectonics.ptBoundaryInquiry.submission)), await page.evaluate(() => qaOriginalCore));
    assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptCER)), await page.evaluate(() => qaEarlierJSON));
    check(name + ': revised plan keeps the last submitted comparison settings, writing and records');
    await page.locator('[data-pt-boundary-transfer]').evaluate(node => { node.open = true; }); await settle();
    const beforeDraft = await page.evaluate(() => ({ inquiry: JSON.stringify(qaData.plateTectonics.ptBoundaryInquiry), writes: qaLog.writes.length, snapshots: qaLog.snapshotWrites.length }));
    await page.locator('[data-pt-boundary-transfer-choice]').selectOption('convergent'); await page.locator('[data-pt-boundary-transfer-reason]').fill(await page.evaluate(() => qaNewReason)); await click('[data-pt-boundary-transfer-check]');
    await page.locator('[data-pt-boundary-transfer-feedback="convergent"]').waitFor();
    assert.deepEqual(await page.evaluate(() => ({ inquiry: JSON.stringify(qaData.plateTectonics.ptBoundaryInquiry), writes: qaLog.writes.length, snapshots: qaLog.snapshotWrites.length })), beforeDraft);
    assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptCER)), await page.evaluate(() => qaEarlierJSON)); await idle();
    check(name + ': editing and checking the application response stay local and idle stays silent');
    assert.equal(await page.locator('[data-pt-boundary-transfer-save]').isDisabled(), false); await click('[data-pt-boundary-transfer-save]');
    await page.waitForFunction(() => qaData.plateTectonics.ptBoundaryInquiry.submission.transferReason === qaNewReason); await settle();
    assert.equal(await page.evaluate(() => qaComparisonCore(qaData.plateTectonics.ptBoundaryInquiry.submission)), await page.evaluate(() => qaOriginalCore));
    assert.equal(await page.evaluate(() => qaData.plateTectonics.ptBoundaryInquiry.plan.rate), 10);
    assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptCER)), await page.evaluate(() => qaEarlierJSON));
    assert.equal(await page.evaluate(() => JSON.stringify(qaSnapshots)), await page.evaluate(() => qaEarlierSnapshots));
    const savedWrites = await page.evaluate(() => qaLog.writes.length); await click('[data-pt-boundary-transfer-save]'); await settle(); assert.equal(await page.evaluate(() => qaLog.writes.length), savedWrites);
    const application = page.locator('[data-pt-boundary-transfer]');
    const violations = await application.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => v.id));
    assert.deepEqual(violations, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await capture(application, 'application-saved'); await idle();
    check(name + ': explicit application save changes only its paired response; duplicate activation and idle add no writes');
    await page.evaluate(() => qaNavigate('explain')); await page.locator('[data-pt-cer-saved-version]').waitFor();
    await page.locator('[data-pt-cer-saved-version]').evaluate(node => { node.open = true; }); await page.locator('[data-pt-cer-saved-context]').evaluate(node => { node.open = true; }); await settle();
    const savedVersion = page.locator('[data-pt-cer-saved-version]'); assert.match(await savedVersion.innerText(), /My earlier response/); assert.ok(!(await savedVersion.innerText()).includes(await page.evaluate(() => qaNewReason)));
    assert.match(await savedVersion.innerText(), /1 shallow, 1 intermediate and 1 deep events/);
    const oldPopupPromise = page.waitForEvent('popup'); await click('[data-pt-print-report]'); const oldPopup = await oldPopupPromise; await oldPopup.locator('h1').waitFor();
    assert.equal(await page.evaluate(() => qaLastPrintHTML), await page.evaluate(() => qaEarlierPrint)); assert.ok(!(await oldPopup.locator('body').innerText()).includes(await page.evaluate(() => qaNewReason))); await oldPopup.close();
    await capture(savedVersion, 'earlier-CER-snapshot');
    check(name + ': the earlier saved evidence view and actual print document retain the exact earlier answer');
    await page.locator('[data-pt-cer="reasoning"]').fill(await page.evaluate(() => qaWriting.reasoning + ' I revised my application evidence.'));
    assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptCER)), await page.evaluate(() => qaEarlierJSON)); await click('[data-pt-cer-save]');
    await page.waitForFunction(() => qaData.plateTectonics.ptCER.evidenceContext.boundaryComparison.transferReason === qaNewReason);
    assert.equal(await page.evaluate(() => qaComparisonCore(qaData.plateTectonics.ptCER.evidenceContext.boundaryComparison)), await page.evaluate(() => qaOriginalCore));
    assert.equal(await page.evaluate(() => JSON.stringify(qaEarlierCER)), await page.evaluate(() => qaEarlierJSON));
    const newPopupPromise = page.waitForEvent('popup'); await click('[data-pt-print-report]'); const newPopup = await newPopupPromise; await newPopup.locator('h1').waitFor();
    assert.match(await newPopup.locator('body').innerText(), /The trench and foci deepening/); assert.ok(!(await newPopup.locator('body').innerText()).includes(await page.evaluate(() => qaOldReason)));
    const tables = newPopup.locator('figure table'); assert.equal(await tables.count(), 2);
    for (let i = 0; i < 2; i++) assert.deepEqual(await tables.nth(i).locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))), [['Convergent', '3', '20–510', '1', '1', '1'], ['Divergent', '2', '5–25', '2', '0', '0'], ['Transform', '2', '5–25', '2', '0', '0']]);
    await newPopup.setViewportSize({ width: 390, height: 1000 }); assert.equal(await newPopup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await newPopup.setViewportSize({ width: 793, height: 1100 }); await newPopup.emulateMedia({ media: 'print' }); assert.equal(await newPopup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await capture(newPopup.locator('body'), 'newer-CER-print'); await newPopup.close(); await idle();
    check(name + ': a deliberate newer CER save captures the revised response and preserves original settings, counts and earlier snapshot');
    report.layouts.push({ name, width, dark, applicationViolations: violations, idleFramesPerCheck: 1200, registeredParent: true });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: applicationOnly ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  try {
    if (applicationOnly) { await runSavedApplicationProvenance(browser); return; }
    assert.ok(reportKeys.length >= 47);
    assert.deepEqual(reportKeys.filter(key => typeof registry.stem?.platetectonics?.[key] !== 'string'), []);
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Saved tectonic evidence review</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(f) });
    await page.evaluate(() => { window.StemLab = { registerTool() {} }; });
    await page.evaluate(strings => { window.reviewStrings = strings; }, registry);
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.querySelector('#app')); let generation = 0;
      const t = (key, fallback) => { const value = key.split('.').reduce((value, part) => value && value[part], reviewStrings); return typeof value === 'string' ? value : fallback; };
      const sample = (mode, z, rate = 5) => __alloPtDepthTrials.capture({ mode, qlog: z.map(z => ({ z })), years: 60000, rate });
      window.mountReportReview = (dark, student = false, legacy = false) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.reviewWrites = []; window.reviewPrints = 0;
        const cer = { claim: 'The cold sinking plate carries earthquake sources deeper.', evidence: 'My model recorded convergent earthquakes at five hundred kilometers and divergent earthquakes at twenty kilometers.', reasoning: 'These contrasting depth patterns connect the sinking slab to deeper earthquake sources in the model.', savedAt: 100, band: '6-8' };
        if (!legacy) cer.evidenceContext = { version: 1, availableEvidence: ['depths', 'cut', 'stress'], earthquakeDepthTrials: { convergent: sample('convergent', [20, 510]), divergent: sample('divergent', [5, 25]) }, stressTrialsByType: { convergent: { bt: 'convergent', f: 80, fr: 40, st: 'thrust' } }, forceObservations: [{ a: 'cut', vBefore: 8, vAfter: 1.5, t: 3, choice: 0 }], forcePredictions: [{ a: 'cut', c: 0, t: 0 }], forceProbes: [{ side: 'A', dist: 400, age: 8.9, t: 0 }, { side: 'B', dist: 200, age: 4.4, t: 3 }], stressWriting: { prediction: 'Compression will make the fault slip.', explanation: 'The model slipped at stress 80 and friction 40.' } };
        function Host() {
          const [data, setData] = React.useState({ ptCER: cer, ptCERDraft: { claim: 'UNSUBMITTED REVISION' }, ptDepthTrials: { convergent: sample('convergent', [20, 650], 12) }, ptForce: { observations: [{ a: 'cut', vBefore: 99, vAfter: 2 }] } });
          window.reviewData = data; window.reviewPatch = patch => setData(prev => ({ ...prev, ...patch }));
          return React.createElement(student ? AlloTectonicsExplain : AlloTectonicsTeacherGuide, { data, darkMode: dark, t, onSave: row => { reviewWrites.push(row); setData(prev => ({ ...prev, ptCER: row })); }, onDraft: row => { reviewWrites.push(row); setData(prev => ({ ...prev, ptCERDraft: { ...(prev.ptCERDraft || {}), ...row } })); }, onSnapshot: () => {} });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(React.StrictMode, {}, React.createElement(Host, { key: ++generation }))));
        window.reviewSavedBefore = JSON.stringify(reviewData.ptCER);
      };
      const nativeOpen = window.open;
      window.open = function () { const popup = nativeOpen.apply(window, arguments); if (popup) popup.print = () => { reviewPrints++; }; return popup; };
    });
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => mountReportReview(dark), dark);
      await page.locator('[data-pt-teacher-guide] > summary').focus(); await page.keyboard.press('Enter');
      await page.locator('[data-pt-teacher-submission] > summary').focus(); await page.keyboard.press('Space');
      const saved = page.locator('[data-pt-teacher-saved-evidence]');
      await saved.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.match(await saved.innerText(), /510 km/); assert.ok(!(await saved.innerText()).includes('650 km')); assert.ok(!(await saved.innerText()).includes('99.0'));
      assert.match(await saved.innerText(), /Recorded at 3.0 million model years/);
      assert.match(await saved.innerText(), /1 shallow, 0 intermediate and 1 deep events/);
      assert.match(await saved.locator('[data-pt-saved-depth-bands]').innerText(), /shallow < 70 km, intermediate 70–<300 km, deep ≥ 300 km/);
      await page.evaluate(() => reviewPatch({ ptDepthTrials: { convergent: __alloPtDepthTrials.capture({ mode: 'convergent', qlog: [{ z: 40 }, { z: 680 }], years: 60000, rate: 14 }) } }));
      assert.match(await saved.innerText(), /510 km/); assert.ok(!(await saved.innerText()).includes('680 km'));
      assert.equal(await page.evaluate(() => JSON.stringify(reviewData.ptCER)), await page.evaluate(() => reviewSavedBefore));
      await page.waitForTimeout(250); assert.equal(await page.evaluate(() => reviewWrites.length + reviewPrints), 0);
      check(name + ': keyboard inspection preserves submitted evidence; rerender and idle stay silent');
      const card = page.locator('[data-pt-teacher-card="explanation"]');
      const metrics = await card.evaluate(node => ({ overflow: document.documentElement.scrollWidth - innerWidth, clipped: [...node.querySelectorAll('summary,button')].filter(el => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1; }).map(el => el.outerHTML), evidenceFonts: [...node.querySelectorAll('[data-pt-teacher-saved-evidence] p,[data-pt-teacher-saved-evidence] li,[data-pt-teacher-saved-evidence] summary,[data-pt-print-report]')].filter(el => el.getClientRects().length).map(el => getComputedStyle(el).fontSize) }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clipped, []); assert.ok(metrics.evidenceFonts.every(f => parseFloat(f) >= 14));
      const violations = await card.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      assert.deepEqual(violations, []); report.layouts.push({ name, metrics, violations });
      const teacherCapture = path.join(out, name + '-teacher-snapshot.png'); await card.screenshot({ path: teacherCapture, animations: 'disabled' }); report.captures.push(teacherCapture);
      check(name + ': readable snapshot and print controls; no overflow or scoped WCAG violations');
      const popupPromise = page.waitForEvent('popup'); await card.locator('[data-pt-print-report]').click(); const popup = await popupPromise;
      popup.on('pageerror', e => report.errors.push(String(e))); await popup.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => reviewPrints), 1); assert.equal(await popup.evaluate(() => opener), null);
      assert.match(await popup.locator('body').innerText(), /510/); assert.ok(!(await popup.locator('body').innerText()).includes('650'));
      assert.ok(!(await popup.locator('body').innerText()).includes('UNSUBMITTED REVISION'));
      assert.equal(await popup.locator('svg').count(), 2); assert.equal(await popup.locator('script,link,img,iframe').count(), 0);
      const depthTable = popup.locator('figure table');
      assert.deepEqual(await depthTable.locator('thead th').allTextContents(), ['Boundary', 'Events', 'Depth range (km)', 'Shallow count', 'Intermediate count', 'Deep count']);
      assert.deepEqual(await depthTable.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))), [['Convergent', '2', '20–510', '1', '0', '1'], ['Divergent', '2', '5–25', '2', '0', '0']]);
      await popup.setViewportSize({ width: 390, height: 1000 }); assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await popup.setViewportSize({ width: 793, height: 1100 }); await popup.emulateMedia({ media: 'print' });
      assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await popup.addScriptTag({ content: read('node_modules/axe-core/axe.min.js') });
      const printViolations = await popup.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      assert.deepEqual(printViolations, []);
      const printCapture = path.join(out, name + '-print-document.png'); await popup.screenshot({ path: printCapture, fullPage: true, animations: 'disabled' }); report.captures.push(printCapture); await popup.close();
      assert.equal(await page.evaluate(() => reviewWrites.length), 0); assert.equal(await page.evaluate(() => JSON.stringify(reviewData.ptCER)), await page.evaluate(() => reviewSavedBefore));
      check(name + ': explicit standalone print preserves exact saved writing, settings and diagrams');
      await page.evaluate(dark => mountReportReview(dark, true), dark);
      await page.locator('[data-pt-cer-saved-version] > summary').click();
      await page.locator('[data-pt-cer-saved-context] > summary').click();
      assert.equal(await page.locator('[data-pt-cer-saved-version] [data-pt-print-report]').count(), 1);
      assert.equal(await page.evaluate(() => reviewWrites.length + reviewPrints), 0);
      const student = page.locator('[data-pt-cer-saved-version]');
      assert.match(await student.innerText(), /1 shallow, 0 intermediate and 1 deep events/);
      assert.match(await student.locator('[data-pt-saved-depth-bands]').innerText(), /shallow < 70 km, intermediate 70–<300 km, deep ≥ 300 km/);
      const studentViolations = await student.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => v.id));
      assert.deepEqual(studentViolations, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const studentCapture = path.join(out, name + '-student-snapshot.png'); await student.screenshot({ path: studentCapture, animations: 'disabled' }); report.captures.push(studentCapture);
      check(name + ': student can print the saved version while a changed draft remains separate');
    }
    if (await page.evaluate(() => !!window.__alloPtBoundaryInquiry)) {
      await page.setViewportSize({ width: 390, height: 1000 }); await page.evaluate(() => {
        mountReportReview(false, true);
        const records = Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, { ...__alloPtDepthTrials.capture({ mode, qlog: (mode === 'convergent' ? [20, 510] : [5, 25]).map(z => ({ z })), years: 600000, rate: 5 }), rateFromReset: 5 }]));
        const submission = { rate: 5, years: 600000, prediction: 'The convergent sample will include deeper earthquakes.', explanation: 'A sinking slab gives the convergent model its deep earthquake pattern; the other boundary samples remain shallow.', records, transferChoice: 'convergent', transferReason: 'The foci deepen inland from a trench, matching my convergent depth sample.' };
        window.reviewComparison = { version: 1, plan: { rate: 5, years: 600000, prediction: submission.prediction }, submission };
        reviewPatch({ ptBoundaryInquiry: reviewComparison });
      });
      for (const [part, value] of Object.entries({ claim: 'The cold sinking plate carries earthquake sources deeper.', evidence: 'My comparison recorded convergent earthquakes at five hundred kilometers and divergent earthquakes at twenty kilometers.', reasoning: 'These contrasting depth patterns connect the sinking slab to deeper earthquake sources in the model.' })) await page.locator('[data-pt-cer="' + part + '"]').fill(value);
      await page.locator('[data-pt-cer-save]').click();
      assert.equal(await page.evaluate(() => reviewData.ptCER.evidenceContext.boundaryComparison.records.convergent.maxKm), 510);
      await page.locator('[data-pt-cer-saved-version] > summary').click(); await page.locator('[data-pt-cer-saved-context] > summary').click();
      const transfer = page.locator('[data-pt-saved-comparison-transfer]'); assert.match(await transfer.innerText(), /foci deepen inland/); assert.match(await transfer.innerText(), /Selected boundary: Convergent/);
      assert.match(await page.locator('[data-pt-saved-boundary-comparison]').innerText(), /1 shallow, 0 intermediate and 1 deep events/);
      assert.match(await page.locator('[data-pt-saved-boundary-comparison]').innerText(), /2 shallow, 0 intermediate and 0 deep events/);
      const comparisonBefore = await page.evaluate(() => JSON.stringify(reviewData.ptCER.evidenceContext.boundaryComparison));
      await page.evaluate(() => reviewPatch({ ptBoundaryInquiry: { ...reviewComparison, submission: { ...reviewComparison.submission, explanation: 'LATER COMPARISON DRAFT' } } }));
      assert.equal(await page.evaluate(() => JSON.stringify(reviewData.ptCER.evidenceContext.boundaryComparison)), comparisonBefore);
      assert.ok(!(await page.locator('[data-pt-saved-boundary-comparison]').innerText()).includes('LATER COMPARISON DRAFT'));
      const transferCapture = path.join(out, 'light-390-saved-comparison.png'); await page.locator('[data-pt-saved-boundary-comparison]').screenshot({ path: transferCapture, animations: 'disabled' }); report.captures.push(transferCapture);
      check('comparison submission and transfer answer captured only by deliberate CER save; later comparison work stays separate');
      const popupPromise = page.waitForEvent('popup'); await page.locator('[data-pt-print-report]').click(); const popup = await popupPromise; await popup.locator('h1').waitFor();
      assert.match(await popup.locator('body').innerText(), /All three samples: 600000 model years at a constant rate of 5/);
      assert.match(await popup.locator('body').innerText(), /foci deepen inland/); assert.ok(!(await popup.locator('body').innerText()).includes('LATER COMPARISON DRAFT'));
      assert.equal(await popup.locator('figure svg').count(), 3);
      const comparisonTables = popup.locator('figure table'); assert.equal(await comparisonTables.count(), 2);
      for (let i = 0; i < 2; i++) assert.equal(await comparisonTables.nth(i).locator('thead th').count(), 6);
      assert.deepEqual(await comparisonTables.nth(1).locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))), [['Convergent', '2', '20–510', '1', '0', '1'], ['Divergent', '2', '5–25', '2', '0', '0'], ['Transform', '2', '5–25', '2', '0', '0']]);
      await popup.setViewportSize({ width: 390, height: 1000 }); assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await popup.setViewportSize({ width: 793, height: 1100 }); await popup.emulateMedia({ media: 'print' }); await popup.addScriptTag({ content: read('node_modules/axe-core/axe.min.js') });
      const violations = await popup.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => v.id));
      assert.deepEqual(violations, []); assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const comparisonCapture = path.join(out, 'saved-comparison-print-document.png'); await popup.screenshot({ path: comparisonCapture, fullPage: true, animations: 'disabled' }); report.captures.push(comparisonCapture); await popup.close();
      check('comparison print includes the frozen settings, three ranges and application reasoning without overflow or WCAG violations');
    }
    await page.evaluate(() => { mountReportReview(false, false, true); window.open = () => null; });
    await page.locator('[data-pt-teacher-guide] > summary').click(); await page.locator('[data-pt-teacher-submission] > summary').click();
    await page.locator('[data-pt-print-report]').click();
    assert.match(await page.locator('[data-pt-print-status]').innerText(), /could not open/); assert.match(await page.locator('[data-pt-cer-context-legacy]').innerText(), /no observation snapshot/);
    assert.equal(await page.evaluate(() => reviewWrites.length + reviewPrints), 0); check('blocked print and legacy feedback preserve work');
    assert.deepEqual(report.errors, []);
  } catch (e) { report.failure = e.stack; throw e; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
