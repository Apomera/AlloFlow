'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = process.env.PT_REPO || path.resolve(__dirname, '..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = process.env.PT_EXPLAIN_QA_OUT || path.join(repo, 'scratch/tectonics-explain-integrity-review');
fs.mkdirSync(out, { recursive: true });
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], layouts: [], captures: [], errors: [] };
const check = (name, details = {}) => { report.checks.push({ name, pass: true, ...details }); console.log('PASS', name); };
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Explain It saved observations review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window.StemLab = { registerTool() {} }; });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot')); let generation = 0;
      const writing = { claim: 'Deep earthquakes follow the cold slab as it sinks.', evidence: 'In my model, the convergent sample reached 510 km and the divergent sample reached 25 km.', reasoning: 'This contrasting depth pattern supports a link between the sinking plate and the deep earthquakes.' };
      const sample = (mode, depths) => __alloPtDepthTrials.capture({ mode, qlog: depths.map(z => ({ z })), rate: 5, years: 60000 });
      window.qaMountExplain = dark => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaCalls = { saves: [], drafts: [], snapshots: [], announcements: [] }; window.qaReenter = false;
        function Host() {
          const [data, setData] = React.useState({ ptCERDraft: writing,
            ptDepthTrials: { convergent: sample('convergent', [10, 120, 510]), divergent: sample('divergent', [5, 25]) },
            ptForce: { observations: [{ a: 'cut', vBefore: 8.2, vAfter: 1.6 }, { a: 'continent', vBefore: 7.4, vAfter: 2.2, mountainKm: 3.1 }] },
            ptHotspot: { est: null, dir: 'se', completed: { est: 180, dir: 'se' }, evidence: { est: 95, dir: 'nw' } }, ptMadeMaxMag: 8.2,
            boundaryHunt: { trialsByType: { convergent: { bt: 'convergent', f: 50, fr: 50, st: 'stable' }, divergent: { bt: 'divergent', f: 50, fr: 50, st: 'normal' }, transform: { bt: 'transform', f: 50, fr: 50, st: 'strikeSlip' } }, log: [] } });
          window.qaData = data;
          window.qaUpdate = patch => ReactDOM.flushSync(() => setData(prev => ({ ...prev, ...patch })));
          return React.createElement(AlloTectonicsExplain, { data, darkMode: dark, t: (_key, fallback) => fallback, onGo() {},
            onSave(record) { qaCalls.saves.push(record); setData(prev => ({ ...prev, ptCER: record })); if (qaReenter) { qaReenter = false; document.querySelector('[data-pt-cer-save]').click(); } },
            onDraft(patch) { qaCalls.drafts.push(patch); setData(prev => ({ ...prev, ptCERDraft: { ...(prev.ptCERDraft || prev.ptCER), ...patch } })); },
            onSnapshot(label, record) { qaCalls.snapshots.push({ label, record }); }, announceToSR(text) { qaCalls.announcements.push(text); } });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(dark => qaMountExplain(dark), dark);
      const panel = page.locator('[data-pt-explain]'), card = panel.locator('[data-pt-evidence="stress"]');
      await panel.waitFor();
      await panel.locator('[data-pt-evidence-supplemental] summary').click();
      assert.equal(await card.getAttribute('data-pt-stress-comparison'), 'matched');
      assert.match(await card.innerText(), /same model stress \(50%\) and friction \(50%\)/);
      assert.match(await card.innerText(), /held with no slip/); assert.match(await card.innerText(), /normal faulting/); assert.match(await card.innerText(), /strike-slip faulting/);
      assert.match(await card.innerText(), /does not measure earthquake depths/);
      assert.equal(await page.evaluate(() => qaCalls.drafts.length + qaCalls.saves.length), 0);
      await card.screenshot({ path: path.join(out, `matched-${name}.png`), animations: 'disabled' });
      check(`${name}: matched retained trials remain optional and qualified`);

      await page.evaluate(() => qaUpdate({ boundaryHunt: { trialsByType: { ...qaData.boundaryHunt.trialsByType, convergent: { bt: 'convergent', f: 90, fr: 20, st: 'thrust' } }, log: [] } }));
      const select = panel.locator('[data-pt-ex-stress-select]'); await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
      assert.equal(await select.inputValue(), 'convergent'); assert.match(await card.innerText(), /stress was 90% and friction was 20%/);
      assert.doesNotMatch(await card.innerText(), /At the same model stress/);
      assert.equal(await page.evaluate(() => qaCalls.drafts.length), 0);
      await card.screenshot({ path: path.join(out, `choice-${name}.png`), animations: 'disabled' });
      await card.locator('[data-pt-evidence-add]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => qaCalls.drafts.length), 1); assert.equal(await page.evaluate(() => qaCalls.saves.length), 0);
      assert.match(await panel.locator('[data-pt-cer="evidence"]').inputValue(), /one recorded convergent model trial/);
      check(`${name}: keyboard selection previews a specific trial; Add inserts once`);

      await page.evaluate(() => { qaReenter = true; const button = document.querySelector('[data-pt-cer-save]'); button.click(); button.click(); });
      assert.deepEqual(await page.evaluate(() => [qaCalls.saves.length, qaCalls.snapshots.length, qaCalls.announcements.length]), [1, 1, 1]);
      assert.equal(await panel.locator('[data-pt-cer-save]').isDisabled(), true);
      await page.evaluate(() => qaUpdate({ boundaryHunt: { trialsByType: { ...qaData.boundaryHunt.trialsByType, convergent: { bt: 'convergent', f: 99, fr: 5, st: 'thrust' } }, log: [] }, ptDepthTrials: { ...qaData.ptDepthTrials, convergent: __alloPtDepthTrials.capture({ mode: 'convergent', qlog: [{ z: 5 }, { z: 690 }], rate: 9, years: 120000 }) } }));
      await panel.locator('[data-pt-cer-saved-version] > summary').click();
      const frozen = panel.locator('[data-pt-cer-saved-context]'); assert.equal(await frozen.evaluate(node => node.open), false);
      await frozen.locator('summary').click();
      assert.match(await frozen.innerText(), /510 km/); assert.match(await frozen.innerText(), /stress 90%/); assert.doesNotMatch(await frozen.innerText(), /stress 99%|690 km/);
      assert.match(await frozen.innerText(), /9.5 cm/); assert.match(await frozen.innerText(), /not a check that every observation supports/);
      assert.equal(await page.evaluate(() => qaData.ptCER.evidenceContext.stressTrialsByType.convergent.f), 90);
      await frozen.screenshot({ path: path.join(out, `saved-${name}.png`), animations: 'disabled' });
      const beforeIdle = await page.evaluate(() => JSON.stringify(qaCalls)); await page.waitForTimeout(400); assert.equal(await page.evaluate(() => JSON.stringify(qaCalls)), beforeIdle);
      check(`${name}: batched/reentrant Save once; changed trials leave frozen observations intact; idle silent`);

      const metrics = await panel.evaluate(node => ({ overflow: document.documentElement.scrollWidth - innerWidth,
        clippedControls: [...node.querySelectorAll('button,input,textarea,select,summary')].filter(el => { if (!el.getClientRects().length) return false; const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(el => el.id || el.textContent),
        selectedRecordFont: getComputedStyle(node.querySelector('[data-pt-ex-stress-select]')).fontSize,
        savedObservationFonts: [...node.querySelectorAll('[data-pt-cer-saved-context] li')].map(el => getComputedStyle(el).fontSize) }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []); assert.ok(parseFloat(metrics.selectedRecordFont) >= 14); assert.ok(metrics.savedObservationFonts.every(font => parseFloat(font) >= 14));
      const audit = await panel.evaluate(async node => { const result = await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })); });
      assert.deepEqual(audit, []); check(`${name}: scoped WCAG, fonts and control bounds`, { metrics });
      report.layouts.push({ name, metrics, audit }); report.captures.push(`matched-${name}.png`, `choice-${name}.png`, `saved-${name}.png`);
    }
    assert.deepEqual(report.errors, []);
  } catch (error) { report.failure = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
