'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const source = read(process.env.PT_GUIDED_SOURCE || 'stem_lab/stem_tool_platetectonics.js');
const registrySource = read(process.env.PT_GUIDED_REGISTRY || 'ui_strings.js'), registry = JSON.parse(registrySource);
const registryKeys = [...new Set([...source.matchAll(/__alloT\('stem\.platetectonics\.(bc_[^']+)'/g)].map(match => match[1]))];
const missingRegistryKeys = registryKeys.filter(key => typeof registry.stem?.platetectonics?.[key] !== 'string');
const out = path.resolve(process.env.PT_GUIDED_OUT || 'scratch/tectonics-guided-comparison-review'); fs.mkdirSync(out, { recursive: true });
const plan = { rate: 5, years: 1200000, prediction: 'The descending slab should carry the deepest earthquake foci.' };
const records = {
  convergent: { mode: 'convergent', events: 10, minKm: 10, maxKm: 650, shallow: 4, intermediate: 3, deep: 3, years: 1200000, rate: 5, rateFromReset: 5 },
  divergent: { mode: 'divergent', events: 4, minKm: 5, maxKm: 30, shallow: 4, intermediate: 0, deep: 0, years: 1200000, rate: 5, rateFromReset: 5 },
  transform: { mode: 'transform', events: 2, minKm: 5, maxKm: 25, shallow: 2, intermediate: 0, deep: 0, years: 1200000, rate: 5, rateFromReset: 5 }
};
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const checks = [], captures = [], errors = [], accessibility = [];
  const check = async (name, run) => {
    try { checks.push({ name, passed: true, detail: await run() }); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); }
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'no-preference' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<html lang="en"><head><title>Guided tectonic investigation QA</title></head><body style="margin:0;font-family:system-ui"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let id = 0, now = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; }; window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaFrame = (delta = 16) => { now = Math.max(now + delta, performance.now()); const callbacks = [...frames.values()]; frames.clear(); ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now))); };
      window.qaRng = value => { Math.random = () => value; }; qaRng(0.999999);
      window.qaLog = { announcements: [], xp: [], pings: [], records: [], inquiries: [] };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(strings => { window.qaStrings = strings; }, registry);
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('wrap')); let generation = 0;
      function QAHost({ seed, dark }) {
        const [saved, setSaved] = React.useState(seed); window.qaSaved = saved;
        return React.createElement(AlloTectonicsInteractive, {
          darkMode: dark, savedBoundaryInquiry: saved.inquiry, depthRecords: saved.records,
          t: (key, fallback) => { const value = key.split('.').reduce((value, part) => value && value[part], qaStrings); return typeof value === 'string' ? value : fallback; },
          onRecordBoundaryInquiry: value => { qaLog.inquiries.push(value); setSaved(prev => ({ ...prev, inquiry: value })); },
          onRecordDepths: value => { qaLog.records.push(value); setSaved(prev => ({ ...prev, records: { ...prev.records, [value.mode]: value } })); },
          onClearDepths: () => setSaved(prev => ({ ...prev, records: {} })),
          announceToSR: text => qaLog.announcements.push(text), awardXP: value => qaLog.xp.push(value), beep: value => qaLog.pings.push(value)
        });
      }
      window.qaMount = (dark, seed) => { document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#fff7ed'; qaLog = { announcements: [], xp: [], pings: [], records: [], inquiries: [] }; ReactDOM.flushSync(() => root.render(React.createElement(React.StrictMode, null, React.createElement(QAHost, { key: ++generation, seed, dark })))); };
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    const paint = async () => page.evaluate(() => { qaFrame(0); qaFrame(0); });
    const show = async () => { await page.locator('[data-pt-boundary-guide]').evaluate(node => { node.open = true; }); await paint(); };
    const shot = async (selector, name) => { await page.locator(selector).evaluate(node => node.scrollIntoView({ block: 'center' })); await paint(); await page.locator(selector).screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' }); captures.push(name + '.png'); };
    for (const dark of [false, true]) for (const width of [1100, 390]) {
      const tag = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ dark, records, plan }) => qaMount(dark, { records, inquiry: { version: 1, plan } }), { dark, records, plan }); await show();
      await check(tag + ': retained plan restores paused without automatically saving samples', async () => {
        assert.deepEqual(missingRegistryKeys, []);
        assert.match(await page.locator('[data-pt-model-play]').textContent(), /Play/);
        assert.equal(await page.locator('[data-pt-boundary-prediction]').inputValue(), plan.prediction);
        assert.equal(await page.locator('[data-pt-boundary-comparison-ready]').getAttribute('data-pt-boundary-comparison-ready'), 'true');
        assert.equal(await page.evaluate(() => qaLog.inquiries.length + qaLog.records.length + qaLog.announcements.length), 0);
        await shot('#pt-bc-predict-title >> xpath=..', 'prediction-' + tag);
      });
      await check(tag + ': explicit target advance uses exact shared time and explicit recording', async () => {
        await click('[data-pt-boundary-start="divergent"]'); await page.evaluate(() => qaRng(0));
        await click('[data-pt-model-step]'); await click('[data-pt-boundary-advance]'); await paint();
        assert.equal(await page.locator('[data-pt-boundary-live]').getAttribute('data-pt-boundary-live'), 'ready');
        assert.equal(await page.locator('[data-pt-depth-preview-count]').getAttribute('data-pt-depth-preview-count'), '20');
        assert.deepEqual(await page.locator('[data-pt-boundary-band-counts="live"] [data-pt-boundary-band]').allTextContents(), ['20', '0', '0']);
        assert.equal(await page.evaluate(() => qaSaved.records.divergent.events), 4);
        assert.equal(await page.evaluate(() => qaLog.records.length), 0);
        await page.locator('[data-pt-boundary-record]').focus(); await page.keyboard.press('Enter'); await paint();
        assert.deepEqual(await page.evaluate(() => ({ years: qaSaved.records.divergent.years, rate: qaSaved.records.divergent.rateFromReset, events: qaSaved.records.divergent.events })), { years: 1200000, rate: 5, events: 20 });
        assert.equal(await page.locator('[data-pt-boundary-advance]').isDisabled(), true);
        await shot('#pt-bc-test-title >> xpath=..', 'trial-' + tag);
      });
      await check(tag + ': saved explanation freezes actual records through replacement and duplicate activation', async () => {
        await page.locator('[data-pt-boundary-explanation]').fill('The convergent sample reaches 650 km in 10 events, versus 2 km in 20 divergent events. A descending slab explains deep foci; small samples may miss a depth band.');
        await page.locator('[data-pt-boundary-explanation-save]').evaluate(node => { node.click(); node.click(); }); await paint();
        assert.equal(await page.evaluate(() => qaLog.inquiries.length), 1);
        const frozen = await page.evaluate(() => JSON.stringify(qaSaved.inquiry.submission));
        await click('[data-pt-boundary-start="convergent"]'); await click('[data-pt-boundary-advance]'); await click('[data-pt-depth-record]'); await paint();
        assert.equal(await page.evaluate(() => qaSaved.records.convergent.maxKm), 5);
        assert.equal(await page.evaluate(() => JSON.stringify(qaSaved.inquiry.submission)), frozen);
        assert.match(await page.locator('[data-pt-boundary-frozen="convergent"]').textContent(), /650 km/);
        assert.deepEqual(await page.locator('[data-pt-boundary-band-counts="frozen-convergent"] [data-pt-boundary-band]').allTextContents(), ['4', '3', '3']);
        assert.deepEqual(await page.locator('[data-pt-boundary-band-counts="record-convergent"] [data-pt-boundary-band]').allTextContents(), ['20', '0', '0']);
        await shot('[data-pt-boundary-submission]', 'frozen-' + tag);
      });
      await check(tag + ': written transfer evidence is required before explanatory feedback', async () => {
        await page.locator('[data-pt-boundary-transfer]').evaluate(node => { node.open = true; });
        await page.locator('[data-pt-boundary-transfer-choice]').selectOption('transform');
        assert.equal(await page.locator('[data-pt-boundary-transfer-check]').isDisabled(), true);
        await page.locator('[data-pt-boundary-transfer-reason]').fill('The foci deepen inland from 20 to 380 km.'); await click('[data-pt-boundary-transfer-check]');
        assert.match(await page.locator('[data-pt-boundary-transfer-feedback]').textContent(), /Reconsider the 380 km focus/);
        await page.locator('[data-pt-boundary-transfer-choice]').selectOption('convergent');
        assert.equal(await page.locator('[data-pt-boundary-transfer-feedback]').count(), 0);
        await click('[data-pt-boundary-transfer-check]'); await paint();
        assert.match(await page.locator('[data-pt-boundary-transfer-feedback]').textContent(), /descending slab/);
        assert.equal(await page.evaluate(() => qaLog.xp.length + qaLog.pings.length), 0);
        await shot('[data-pt-boundary-transfer]', 'transfer-' + tag);
      });
      await check(tag + ': explicit application save preserves the original comparison with a revised unmatched plan', async () => {
        await page.locator('[data-pt-boundary-rate]').selectOption('8'); await click('[data-pt-boundary-plan-save]'); await paint();
        assert.equal(await page.locator('[data-pt-boundary-explanation-save]').isDisabled(), true);
        assert.match(await page.locator('[data-pt-boundary-application-context]').textContent(), /5 cm\/year for 1.2 million/);
        assert.equal(await page.locator('[data-pt-boundary-application-status]').getAttribute('data-pt-boundary-application-status'), 'ready-to-save');
        const before = await page.evaluate(() => ({ core: JSON.stringify(qaSaved.inquiry.submission), writes: qaLog.inquiries.length }));
        await page.locator('[data-pt-boundary-application-save]').evaluate(node => { node.click(); node.click(); }); await paint();
        const saved = await page.evaluate(() => qaSaved.inquiry.submission), core = { ...saved }; delete core.transferChoice; delete core.transferReason;
        assert.equal(JSON.stringify(core), before.core); assert.equal(saved.transferChoice, 'convergent'); assert.equal(saved.transferReason, 'The foci deepen inland from 20 to 380 km.');
        assert.equal(await page.evaluate(() => qaLog.inquiries.length), before.writes + 1); assert.equal(await page.evaluate(() => qaSaved.inquiry.plan.rate), 8);
        assert.equal(await page.locator('[data-pt-boundary-application-status]').getAttribute('data-pt-boundary-application-status'), 'saved');
        await shot('[data-pt-boundary-transfer]', 'application-saved-' + tag);
        await page.evaluate(dark => qaMount(dark, structuredClone(qaSaved)), dark); await show(); await page.locator('[data-pt-boundary-transfer]').evaluate(node => { node.open = true; });
        assert.equal(await page.locator('[data-pt-boundary-transfer-reason]').inputValue(), saved.transferReason); assert.equal(await page.locator('[data-pt-boundary-transfer-feedback]').count(), 0);
        assert.equal(await page.locator('[data-pt-boundary-application-status]').getAttribute('data-pt-boundary-application-status'), 'saved');
        assert.equal(await page.evaluate(() => qaLog.inquiries.length + qaLog.records.length + qaLog.announcements.length + qaLog.xp.length + qaLog.pings.length), 0);
      });
      await check(tag + ': readable labels, keyboard controls and scoped accessibility', async () => {
        const violations = await page.evaluate(async () => (await axe.run('[data-pt-boundary-guide]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(value => ({ id: value.id, nodes: value.nodes.length })));
        accessibility.push({ name: tag, violations }); assert.deepEqual(violations, []);
        const metrics = await page.locator('[data-pt-boundary-guide]').evaluate(node => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          clipped: [...node.querySelectorAll('button,input,select,textarea')].filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => el.id || el.tagName),
          minimumFont: Math.min(...[...node.querySelectorAll('p,label,button,select,textarea,summary')].map(el => parseFloat(getComputedStyle(el).fontSize))),
          diagramLabelPx: parseFloat(node.querySelector('svg text').getAttribute('font-size')) * node.querySelector('svg').getBoundingClientRect().width / 380
        }));
        assert.equal(metrics.overflow, 0); assert.deepEqual(metrics.clipped, []); assert(metrics.minimumFont >= 14); assert(metrics.diagramLabelPx >= 14);
        return metrics;
      });
      await check(tag + ': idle comparison work remains unchanged and silent', async () => {
        const before = await page.evaluate(() => ({ saved: JSON.stringify(qaSaved), log: JSON.stringify(qaLog) }));
        await page.evaluate(() => { qaRng(0.999999); for (let i = 0; i < 600; i++) qaFrame(16); });
        const after = await page.evaluate(() => ({ saved: JSON.stringify(qaSaved), log: JSON.stringify(qaLog) }));
        assert.deepEqual(after, before);
      });
      await check(tag + ': empty samples and older provenance remain qualified', async () => {
        const old = structuredClone(records); for (const value of Object.values(old)) delete value.rateFromReset;
        await page.evaluate(({ dark, records, plan }) => qaMount(dark, { records, inquiry: { version: 1, plan } }), { dark, records: old, plan }); await show();
        assert.equal(await page.locator('[data-pt-boundary-matched="true"]').count(), 0);
        assert.match(await page.locator('[data-pt-boundary-guide]').textContent(), /rate history is unknown/);
        await click('[data-pt-boundary-start="divergent"]'); await page.evaluate(() => qaRng(0.999999)); await click('[data-pt-boundary-advance]'); await paint();
        assert.equal(await page.locator('[data-pt-depth-record]').isDisabled(), true);
        assert.equal(await page.locator('[data-pt-boundary-live]').getAttribute('data-pt-boundary-live'), 'ready');
        assert.equal(await page.evaluate(() => qaLog.records.length + qaLog.inquiries.length), 0);
        assert.match(await page.locator('[data-pt-boundary-empty-sample]').textContent(), /0 recorded events after 1.2 million/);
        assert.match(await page.locator('[data-pt-boundary-empty-sample]').textContent(), /does not show that this boundary never has earthquakes/);
        await shot('[data-pt-boundary-empty-sample]', 'empty-' + tag);
        const audit = await page.evaluate(async () => (await axe.run('[data-pt-boundary-empty-sample]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(value => ({ id: value.id, nodes: value.nodes.length })));
        accessibility.push({ name: tag + '-empty', violations: audit }); assert.deepEqual(audit, []);
        const retained = await page.evaluate(() => JSON.stringify(qaSaved));
        await page.locator('[data-pt-boundary-empty-restart]').focus(); await page.keyboard.press('Enter'); await paint();
        assert.equal(await page.locator('[data-pt-boundary-empty-sample]').count(), 0); assert.match(await page.locator('[data-pt-boundary-live]').textContent(), /Divergent, 5 cm\/year, 0 model years/);
        assert.equal(await page.evaluate(() => JSON.stringify(qaSaved)), retained); assert.equal(await page.evaluate(() => qaLog.records.length + qaLog.inquiries.length), 0);
        assert.equal(await page.locator('[data-pt-boundary-advance]').isDisabled(), false);
        return { legacyRecordsPreserved: await page.evaluate(() => Object.keys(qaSaved.records).length) };
      });
    }
  } finally { await browser.close(); }
  const result = { sourceHash: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registrySource).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(registry.stem.platetectonics)).digest('hex'), registryKeys, missingRegistryKeys, checks, captures, errors, accessibility };
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({ checks: checks.length, passed: checks.filter(value => value.passed).length, captures: captures.length, errors, failures: checks.filter(value => !value.passed) }));
  if (errors.length || checks.some(value => !value.passed)) process.exitCode = 1;
})().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
