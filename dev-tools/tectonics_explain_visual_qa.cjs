'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-explain-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Explanation revision review</title></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window.StemLab = { registerTool() {} }; });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('slot'));
      let generation = 0;
      window.qaMountExplain = dark => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaSaves = []; window.qaSnapshots = [];
        const saved = {
          claim: 'Deep earthquakes follow the cold slab as it sinks.',
          evidence: 'In my model, the convergent sample reached 510 km and the divergent sample reached 25 km.',
          reasoning: 'This contrasting depth pattern supports a link between the sinking plate and the deep earthquakes.',
          savedAt: 100, band: '6-8'
        };
        const sample = (mode, depths) => __alloPtDepthTrials.capture({ mode, qlog: depths.map(z => ({ z })), rate: 5, years: 60000 });
        function Host() {
          const [data, setData] = React.useState({ ptCER: saved,
            ptDepthTrials: { convergent: sample('convergent', [10, 120, 510]), divergent: sample('divergent', [5, 25]) },
            ptForce: { observations: [{ a: 'cut', vBefore: 8.2, vAfter: 1.6 }, { a: 'continent', vBefore: 7.4, vAfter: 2.2, mountainKm: 3.1 }] },
            ptHotspot: { est: 95, dir: 'nw' }, ptMadeMaxMag: 8.2,
            boundaryHunt: { log: [{ bt: 'convergent', f: 80, fr: 50, st: 'thrust' }] } });
          window.qaData = data;
          return React.createElement(AlloTectonicsExplain, { data, darkMode: dark,
            t: (_key, fallback) => fallback, onGo() {},
            onSave(record) { qaSaves.push(record); setData(prev => ({ ...prev, ptCER: record })); },
            onDraft(patch) { setData(prev => ({ ...prev, ptCERDraft: { ...(prev.ptCERDraft || prev.ptCER), ...patch } })); },
            onSnapshot(label, record) { qaSnapshots.push({ label, record }); } });
        }
        ReactDOM.flushSync(() => root.render(React.createElement(Host, { key: ++generation })));
      };
    });
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(dark => qaMountExplain(dark), dark);
      const panel = page.locator('[data-pt-explain]');
      await panel.waitFor();
      const save = panel.locator('[data-pt-cer-save]');
      assert.equal(await save.isDisabled(), true);
      await panel.locator('[data-pt-cer="claim"]').fill('A sinking slab explains why one model boundary has deeper earthquakes.');
      assert.equal(await save.isDisabled(), false);
      assert.equal(await page.evaluate(() => qaData.ptCER.claim), 'Deep earthquakes follow the cold slab as it sinks.');
      assert.equal(await page.evaluate(() => qaSaves.length), 0);
      const name = `${dark ? 'dark' : 'light'}-${width}`;
      await panel.screenshot({ path: path.join(out, `explain-${name}.png`), animations: 'disabled' });
      await panel.locator('[data-pt-evidence-supplemental] summary').click();
      const add = panel.locator('[data-pt-evidence-add="stress"]');
      await add.focus(); await page.keyboard.press('Enter');
      assert.equal(await add.isDisabled(), true);
      assert.match(await panel.locator('[data-pt-cer="evidence"]').inputValue(), /stress was 80% and friction was 50%/);
      await panel.locator('[data-pt-evidence-supplemental]').screenshot({ path: path.join(out, `evidence-${name}.png`), animations: 'disabled' });
      await panel.locator('[data-pt-cer-review]').screenshot({ path: path.join(out, `revision-${name}.png`), animations: 'disabled' });
      const metrics = await panel.evaluate(node => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        clippedControls: [...node.querySelectorAll('button,input,textarea,summary')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map(el => el.id || el.textContent),
        textareaFonts: [...node.querySelectorAll('textarea')].map(el => getComputedStyle(el).fontSize)
      }));
      assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clippedControls, []);
      const audit = await panel.evaluate(async node => {
        const result = await axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'label', 'button-name', 'aria-valid-attr-value'] } });
        return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      });
      await save.click(); assert.equal(await save.isDisabled(), true);
      assert.equal(await page.evaluate(() => qaSaves.length), 1);
      assert.equal(await page.evaluate(() => qaSnapshots.length), 1);
      await panel.locator('[data-pt-cer="reasoning"]').fill('A new draft');
      assert.equal(await page.evaluate(() => qaSnapshots.length), 1);
      assert.notEqual(await page.evaluate(() => qaData.ptCER.reasoning), 'A new draft');
      report.checks.push({ name, metrics, audit, explicitSaves: 1, snapshots: 1, savedRevisionProtected: true });
      report.captures.push(`explain-${name}.png`, `evidence-${name}.png`, `revision-${name}.png`);
      console.log(name, JSON.stringify({ metrics, audit }));
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    assert.deepEqual(report.errors, []);
    assert.ok(report.checks.every(check => check.audit.length === 0), 'Accessibility checks should pass.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
