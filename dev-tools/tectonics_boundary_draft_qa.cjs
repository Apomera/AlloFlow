'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = process.env.PT_REPO || path.resolve(__dirname, '..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const source = fs.readFileSync(process.env.PT_BOUNDARY_DRAFT_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const registrySource = fs.readFileSync(process.env.PT_BOUNDARY_DRAFT_REGISTRY || path.join(repo, 'ui_strings.js'), 'utf8'), registry = JSON.parse(registrySource);
const out = process.env.PT_BOUNDARY_DRAFT_QA_OUT || path.join(repo, 'scratch/tectonics-boundary-draft-review');
fs.mkdirSync(out, { recursive: true });
const draftKeys = [...new Set([...source.matchAll(/__alloT\('stem\.platetectonics\.(bc_writing_[^']+)'/g)].map(match => match[1]))];
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registrySource).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(registry.stem.platetectonics)).digest('hex'), checks: [], layouts: [], captures: [], errors: [], draftKeys };
const check = name => { report.checks.push({ name, pass: true }); process.stdout.write('PASS ' + name + '\n'); };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    assert.equal(draftKeys.length, 2); assert.deepEqual(draftKeys.filter(key => typeof registry.stem?.platetectonics?.[key] !== 'string'), []);
    for (const { width, dark } of [{ width: 1100, dark: false }, { width: 1100, dark: true }, { width: 320, dark: false }, { width: 390, dark: true }]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      page.setDefaultTimeout(45000); page.on('pageerror', error => report.errors.push(String(error)));
      await page.setContent('<!doctype html><html lang="en"><head><title>Retained boundary writing review</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
      await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
      await page.evaluate(() => {
        const frames = new Map(); let id = 0, now = 0;
        window.qaLog = { drafts: [], writes: [], snapshots: [], xp: [], notices: [], sounds: [], announcements: [] };
        window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
        window.cancelAnimationFrame = handle => frames.delete(handle);
        window.qaFrames = count => { for (let i = 0; i < count; i++) { now += 1000 / 60; for (const [handle, callback] of [...frames]) if (frames.delete(handle)) callback(now); } };
        for (const [name, proto] of [['oscillator', OscillatorNode.prototype], ['buffer', AudioBufferSourceNode.prototype]]) {
          const start = proto.start; proto.start = function (...args) { qaLog.sounds.push(name); return start.apply(this, args); };
        }
      });
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
      await page.evaluate(strings => {
        window.qaStrings = strings; window.qaT = (key, fallback) => { const value = key.split('.').reduce((value, part) => value && value[part], qaStrings); return typeof value === 'string' ? value : fallback; };
        StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {});
      }, registry);
      await page.addScriptTag({ content: source });
      await page.evaluate(dark => {
        const noop = () => {}, Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
        window.qaDraft = { version: 1, prediction: '  Unfinished prediction about the sinking slab. ', rate: 8, years: 1200000, explanation: 'A working comparison with\nunfinished evidence. ', transferChoice: 'transform', transferReason: 'I used the 380 km focus, but my response needs revision. ' };
        const records = Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, __alloPtDepthTrials.capture({ mode, qlog: (mode === 'convergent' ? [20, 160, 510] : [5, 25]).map(z => ({ z })), rate: 5, years: 600000, depthRunRate: 5, depthRunRateConstant: true })]));
        const submission = { rate: 5, years: 600000, prediction: 'The convergent model should have deeper earthquakes.', explanation: 'The cold sinking slab explains the deeper convergent earthquake pattern.', records, transferChoice: 'convergent', transferReason: 'The original 380 km observation fits a sinking slab.' };
        const inquiry = __alloPtBoundaryInquiry.read({ version: 1, plan: { rate: 5, years: 600000, prediction: submission.prediction }, submission });
        const cer = { claim: 'The slab accounts for deep earthquakes.', evidence: 'The original sample reaches 510 km compared with 25 km.', reasoning: 'A cold slab carries brittle material deeper into the mantle.', evidenceContext: { version: 1, boundaryComparison: inquiry.submission } };
        window.qaOriginalInquiry = JSON.stringify(inquiry); window.qaOriginalCER = JSON.stringify(cer); window.qaOriginalPrint = __alloPtInvestigationReport.html(cer, qaT);
        const Interactive = AlloTectonicsInteractive;
        window.AlloTectonicsInteractive = function WithDraftLog(props) {
          window.qaDraftParentCallback = props.onRecordBoundaryDraft;
          return React.createElement(Interactive, { ...props, onRecordBoundaryDraft(value) { qaLog.drafts.push(value); props.onRecordBoundaryDraft(value); } });
        };
        const root = ReactDOM.createRoot(document.querySelector('#app'));
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { _ptPicked: true, _ptCategory: 'sim_quiz', simTab: 'sim', ptDrift: false, ptShelfTopics: { sim: true }, tabsViewed: { sim: true, explain: true }, ptDepthTrials: records, ptBoundaryInquiry: inquiry, ptBoundaryDraft: qaDraft, ptCER: cer } });
          window.qaData = data; window.qaPatch = patch => setData(prev => ({ ...prev, plateTectonics: { ...prev.plateTectonics, ...patch } }));
          return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: action => { qaLog.writes.push('setToolData'); setData(action); }, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: action => qaLog.snapshots.push(action), toolSnapshots: [],
            addToast: (...args) => qaLog.notices.push(args), announceToSR: text => qaLog.announcements.push(text), awardXP: (...args) => qaLog.xp.push(args), getXP: () => 0,
            beep: (...args) => qaLog.sounds.push(args), celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: qaT, props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null });
        }
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        ReactDOM.flushSync(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host))));
        window.qaSignature = () => JSON.stringify({ data: qaData, logCounts: Object.fromEntries(Object.entries(qaLog).map(([key, value]) => [key, value.length])) });
      }, dark);
      const click = selector => page.locator(selector).evaluate(node => node.click());
      const frames = async count => { for (let left = count; left > 0; left -= 120) await page.evaluate(n => ReactDOM.flushSync(() => qaFrames(n)), Math.min(120, left)); };
      const settle = async () => { await frames(2); await page.waitForTimeout(80); };
      const show = async () => { await page.locator('[data-pt-boundary-guide]').evaluate(node => { node.open = true; }); await page.locator('[data-pt-boundary-transfer]').evaluate(node => { node.open = true; }); await settle(); };
      const fields = { prediction: '[data-pt-boundary-prediction]', rate: '[data-pt-boundary-rate]', years: '[data-pt-boundary-time]', explanation: '[data-pt-boundary-explanation]', transferChoice: '[data-pt-boundary-transfer-choice]', transferReason: '[data-pt-boundary-transfer-reason]' };
      const expectFields = async () => { const value = await page.evaluate(() => qaData.plateTectonics.ptBoundaryDraft); for (const [key, selector] of Object.entries(fields)) assert.equal(await page.locator(selector).inputValue(), String(value[key])); };
      const frozen = async () => {
        assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptBoundaryInquiry)), await page.evaluate(() => qaOriginalInquiry));
        assert.equal(await page.evaluate(() => JSON.stringify(qaData.plateTectonics.ptCER)), await page.evaluate(() => qaOriginalCER));
        assert.equal(await page.evaluate(() => __alloPtInvestigationReport.html(qaData.plateTectonics.ptCER, qaT)), await page.evaluate(() => qaOriginalPrint));
      };
      await show(); await expectFields();
      assert.match(await page.locator('[data-pt-model-play]').textContent(), /Play/); assert.equal(await page.locator('[data-pt-boundary-transfer-feedback]').count(), 0);
      assert.equal(await page.locator('[data-pt-boundary-application-save]').isDisabled(), true); assert.equal(await page.evaluate(() => qaLog.drafts.length), 0); await frozen();
      check(name + ': StrictMode restores every unfinished field paused and unchecked without saving');
      const beforeSameInput = await page.evaluate(() => qaSignature());
      await page.locator(fields.prediction).fill(await page.locator(fields.prediction).inputValue());
      await page.locator(fields.rate).selectOption(await page.locator(fields.rate).inputValue());
      assert.equal(await page.evaluate(() => qaSignature()), beforeSameInput);
      const duplicateParent = await page.evaluate(() => {
        const data = qaData, studentData = qaData.plateTectonics, stored = studentData.ptBoundaryDraft;
        ReactDOM.flushSync(() => { qaDraftParentCallback({ ...stored }); qaDraftParentCallback({ ...stored }); });
        return { sameData: qaData === data, sameStudentData: qaData.plateTectonics === studentData, sameDraft: qaData.plateTectonics.ptBoundaryDraft === stored };
      });
      assert.deepEqual(duplicateParent, { sameData: true, sameStudentData: true, sameDraft: true }); await frozen();
      check(name + ': unchanged controls and direct duplicate drafts preserve the original stored state');
      await page.locator(fields.prediction).fill('A revised but unfinished prediction. '); await page.locator(fields.explanation).fill('Revised working explanation with exact trailing spaces. ');
      assert.equal(await page.evaluate(() => qaLog.drafts.length), 2); await expectFields(); await frozen();
      assert.equal(await page.locator('[data-pt-boundary-writing-status]').getAttribute('data-pt-boundary-writing-status'), 'draft');
      check(name + ': explicit typing checkpoints only the separate draft and leaves saved evidence and print unchanged');
      const beforeCheck = await page.evaluate(() => ({ drafts: qaLog.drafts.length, writes: qaLog.writes.length, snapshots: qaLog.snapshots.length }));
      await click('[data-pt-boundary-transfer-check]'); assert.equal(await page.locator('[data-pt-boundary-transfer-feedback]').count(), 1);
      assert.deepEqual(await page.evaluate(() => ({ drafts: qaLog.drafts.length, writes: qaLog.writes.length, snapshots: qaLog.snapshots.length })), beforeCheck); await frozen();
      const writes = await page.evaluate(() => qaLog.drafts.length); await click('[data-pt-shelf-close]'); await click('[data-pt-shelf-open]'); await show(); await expectFields(); await frozen();
      assert.equal(await page.evaluate(() => qaLog.drafts.length), writes); assert.equal(await page.locator('[data-pt-boundary-transfer-feedback]').count(), 0);
      check(name + ': actual shelf close restores retained entries and requires a fresh explicit check');
      await click('[data-pt-journey-go="explain"]'); assert.equal(await page.locator(fields.prediction).count(), 0);
      await click('[data-pt-journey-go="sim"]'); await show(); await expectFields(); await frozen(); assert.equal(await page.evaluate(() => qaLog.drafts.length), writes);
      check(name + ': actual Explain journey and return preserve unfinished writing without submitting it');
      await page.evaluate(() => ReactDOM.flushSync(() => qaPatch({ anotherLab: { latest: 'preserved' } })));
      await page.locator(fields.transferReason).fill('I am revising the 380 km interpretation. ');
      assert.deepEqual(await page.evaluate(() => qaData.plateTectonics.anotherLab), { latest: 'preserved' });
      const beforeInvalid = await page.evaluate(() => JSON.stringify(qaData)); await page.evaluate(() => qaDraftParentCallback({ ...qaData.plateTectonics.ptBoundaryDraft, rate: '8' })); await settle();
      assert.equal(await page.evaluate(() => JSON.stringify(qaData)), beforeInvalid); await frozen();
      check(name + ': functional parent merge retains newer unrelated data and rejects invalid draft imports');
      const guide = page.locator('[data-pt-boundary-guide]');
      const violations = await guide.evaluate(async node => (await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => v.id));
      assert.deepEqual(violations, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const file = path.join(out, name + '-retained-writing.png'); await guide.screenshot({ path: file, animations: 'disabled' }); report.captures.push(file);
      check(name + ': draft guidance and restored controls remain readable without overflow or accessibility violations');
      await settle(); const idleSignature = await page.evaluate(() => qaSignature()); await frames(1200); await settle(); assert.equal(await page.evaluate(() => qaSignature()), idleSignature);
      assert.equal(await page.evaluate(() => qaLog.xp.length + qaLog.sounds.length + qaLog.notices.length + qaLog.snapshots.length), 0);
      check(name + ': 1200 idle frames add no drafts, submissions, snapshots, announcements, awards or pings');
      report.layouts.push({ name, width, dark, violations, registeredParent: true, idleFrames: 1200 }); await page.close();
    }
    assert.deepEqual(report.errors, []);
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
