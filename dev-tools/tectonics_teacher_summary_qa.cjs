'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8'), source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-teacher-review'); fs.mkdirSync(out, { recursive: true });
const helper = source.slice(source.indexOf('window.AlloTectonicsTeacherGuide ='), source.indexOf("window.StemLab.registerTool('plateTectonics'"));
const registry = read('ui_strings.js'), newStrings = {};
for (const match of helper.matchAll(/__alloT\('([^']+)',\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\)/g)) {
  if (!registry.includes(match[1])) newStrings[match[1]] = Function('return (' + match[2] + ')')();
}
if (Object.keys(newStrings).length) fs.writeFileSync(path.join(out, 'new-strings.json'), JSON.stringify(newStrings, null, 2));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], accessibility: [], errors: [] };
  page.on('pageerror', error => report.errors.push(String(error)));
  async function check(name, run) {
    try { const detail = await run(); report.checks.push({ name, passed: true, detail }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, error: String(error) }); console.error('FAIL', name, String(error)); }
  }
  try {
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonics teacher guide review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window.StemLab = { registerTool() {}, makeBayViewer: () => ({}) }; });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      const sample = (mode, zs) => __alloPtDepthTrials.capture({ mode, qlog: zs.map(z => ({ z })), rate: 5, years: 60000 });
      const row = bt => ({ bt, f: 60, fr: 40, st: 'normal' });
      const writing = {
        claim: 'Deep earthquakes can occur within a cold sinking plate.',
        evidence: 'My recorded convergent sample reached592km while the divergent sample reached24km.',
        reasoning: 'The cold slab carries rock to greater depths, so earthquake locations follow the sinking plate into the mantle.'
      };
      window.qaMount = (dark, complete) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaWrites = 0;
        const data = complete ? {
          ptDepthTrials: { convergent: sample('convergent', [30, 592]), divergent: sample('divergent', [5, 24]) },
          ptForce: { preds: [{ a: 'cut', c: 0, ok: false }, { a: 'continent', c: 1, ok: true }], observations: [{ a: 'cut', vBefore: 8.5, vAfter: 1.25 }, { a: 'continent', vBefore: 7.5, vAfter: 1.1, mountainKm: 3.3 }] },
          ptHotspot: { est: 95, dir: 'nw' }, boundaryHunt: { log: Array.from({ length: 8 }, () => row('convergent')), trialsByType: { convergent: row('convergent'), divergent: row('divergent'), transform: row('transform') }, explanation: 'With friction held constant, greater stress caused the fault to slip.' },
          ptFit: { fitted: true, answer: 'joined' }, ptQuizResult: { score: 5, total: 8, band: '6-8', missed: ['Convection', 'Subduction zone'] }, ptQuizBest: { score: 6, total: 6, band: '3-5', missed: [] }, quizBand: '9-12', quizIdx: 2,
          ptCER: writing, ptCERDraft: { ...writing, claim: 'A revised draft about the cold slab and earthquake depths.' }
        } : {
          ptDepthTrials: { convergent: sample('convergent', [10, 30]) }, ptForce: { preds: [{ a: 'cut', c: 1, ok: true }] },
          ptHotspot: { draftRate: 95, dir: 'nw' }, boundaryHunt: { log: Array.from({ length: 8 }, () => row('convergent')), explanation: 'I am still comparing these trials.' },
          ptFit: { draftT: __alloPtFit.best().t }, quizBand: '3-5', quizIdx: 2, quizScore: 2, ptCER: { claim: 'Only a claim' }, ptCERDraft: writing
        };
        window.qaData = data; window.qaInitial = JSON.stringify(data);
        ReactDOM.flushSync(() => root.render(React.createElement(AlloTectonicsTeacherGuide, { key: ++generation, data, darkMode: dark, t: (_, fallback) => fallback, onRecord: () => qaWrites++, awardXP: () => qaWrites++ })));
      };
    });
    async function capture(name, selector) {
      await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const file = path.join(out, name + '.png'); await page.screenshot({ path: file });
      const detail = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth }));
      report.captures.push({ name, file, ...detail }); assert.ok(detail.overflow <= 1, 'page horizontal overflow');
    }
    async function audit(name) {
      const violations = await page.evaluate(async () => {
        const result = await axe.run('[data-pt-teacher-guide]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) }));
      });
      report.accessibility.push({ name, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
    }
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const prefix = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMount(dark, false), dark);
      await check(prefix + ' incomplete work remains incomplete in the teacher summary', async () => {
        const summary = page.locator('[data-pt-teacher-guide] > summary'); await summary.focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-pt-teacher-guide]').getAttribute('open'), '');
        assert.match(await page.locator('[data-pt-teacher-card="forces"]').innerText(), /Saved predictions: 1. Completed observations retained: 0/);
        assert.equal(await page.locator('[data-pt-teacher-hotspot-status]').getAttribute('data-pt-teacher-hotspot-status'), 'review');
        assert.equal(await page.locator('[data-pt-teacher-stress-status]').getAttribute('data-pt-teacher-stress-status'), 'incomplete');
        assert.equal(await page.locator('[data-pt-teacher-cer-status]').getAttribute('data-pt-teacher-cer-status'), 'draft');
        assert.match(await page.locator('[data-pt-teacher-quiz]').innerText(), /no completed attempt/);
        await capture(prefix + '-incomplete', '[data-pt-teacher-guide]'); await audit(prefix + '-incomplete');
      });
      await page.evaluate(dark => qaMount(dark, true), dark); await page.locator('[data-pt-teacher-guide] > summary').click();
      await check(prefix + ' completed evidence, denominators and revised writing remain distinct', async () => {
        assert.match(await page.locator('[data-pt-teacher-card="depths"]').innerText(), /30–592 km/);
        assert.match(await page.locator('[data-pt-teacher-card="stress"]').innerText(), /3 of 3/);
        assert.equal(await page.locator('[data-pt-teacher-hotspot-status]').getAttribute('data-pt-teacher-hotspot-status'), 'ready');
        assert.match(await page.locator('[data-pt-teacher-quiz]').innerText(), /5 of 8 \(grades 6-8\)/);
        assert.match(await page.locator('[data-pt-teacher-card="quiz"]').innerText(), /6 of 6 \(grades 3-5\)/);
        assert.equal(await page.locator('[data-pt-teacher-cer-status]').getAttribute('data-pt-teacher-cer-status'), 'submitted-with-draft');
        await capture(prefix + '-completed', '[data-pt-teacher-guide]');
        await page.locator('[data-pt-teacher-submission] > summary').click();
        assert.match(await page.locator('[data-pt-teacher-submission]').innerText(), /Deep earthquakes can occur/);
        assert.doesNotMatch(await page.locator('[data-pt-teacher-submission]').innerText(), /A revised draft/);
        await capture(prefix + '-submitted-writing', '[data-pt-teacher-card="explanation"]'); await audit(prefix + '-completed');
      });
      await check(prefix + ' optional guidance opens from keyboard and does not write progress', async () => {
        for (const part of ['lesson', 'limits', 'standards']) {
          const summary = page.locator('[data-pt-teacher-' + part + '] > summary'); await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await page.locator('[data-pt-teacher-' + part + ']').getAttribute('open'), '');
        }
        await capture(prefix + '-teaching-guidance', '[data-pt-teacher-limits]'); await audit(prefix + '-guidance');
        assert.deepEqual(await page.evaluate(() => ({ unchanged: JSON.stringify(qaData) === qaInitial, writes: qaWrites })), { unchanged: true, writes: 0 });
        return page.locator('[data-pt-teacher-standards] a').evaluateAll(nodes => nodes.map(n => n.href));
      });
    }
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(c => !c.passed).length, errors: report.errors.length, captures: report.captures.length }));
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
