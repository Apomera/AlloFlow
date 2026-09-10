const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/printingpress-run-notebook');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  await context.route('http://printingpress.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Printing Press review</title></head><body><main id="root"></main></body></html>' }));
  async function mount(page, initial = {}) {
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://printingpress.test/');
    await page.addStyleTag({ content: 'body{margin:0;background:#19140e;font-family:system-ui}button,input,select,textarea{font:inherit}button{cursor:pointer}#root{max-width:1120px;margin:auto}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_printingpress.js') });
    await page.evaluate(initial => {
      const R = React, h = R.createElement;
      function App() {
        const [data, setData] = R.useState({ printingPress: { view: 'pressMechanism', ...initial } });
        const updateMulti = (id, patch) => setData(p => ({ ...p, [id]: { ...p[id], ...patch } }));
        window.ppData = data; window.ppPatch = patch => updateMulti('printingPress', patch);
        return StemLab._registry.printingPress.render({ React: R, toolData: data, update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti, t: (k, f) => f || k, addToast: () => {}, awardXP: () => {}, setStemLabTool: () => {} });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(h(App));
    }, initial);
    await page.locator('#pp-phrase').waitFor();
  }
  try {
    const page = await context.newPage(); await page.clock.install(); await mount(page);
    async function makeProof(target, phrase) {
      const another = target.getByRole('button', { name: '⑤ Print another', exact: true });
      if (await another.count()) await another.click();
      await target.locator('#pp-phrase').fill(phrase);
      await target.getByRole('button', { name: '① Ink the type', exact: true }).click();
      await target.getByRole('button', { name: '② Lay paper', exact: true }).click();
      assert.equal(await target.locator('#pp-phrase').isDisabled(), true);
      await target.getByRole('button', { name: '③ Pull the bar', exact: true }).click();
      await target.getByRole('button', { name: '④ Lift and reveal', exact: true }).click();
    }
    await makeProof(page, 'ALPHA');
    assert.equal(await page.locator('#pp-impression-count').innerText(), 'Impressions: 1');
    await page.locator('#pp-run-notes').fill('The type is reversed; the paper shows readable letters.');
    await page.locator('#pp-phrase').fill('BETA');
    assert.equal(await page.locator('svg text[y="270"]').textContent(), 'ALPHA');
    assert.equal(await page.locator('[data-proof-number="1"] p').innerText(), 'ALPHA');
    // Pause time while editing, then advance the actual tour delays deterministically.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const tour = page.getByRole('button', { name: 'Start a hands-free guided tour through the full press cycle', exact: true });
    async function finishTour() {
      await page.clock.runFor(2500);
      await page.clock.runFor(100);
      await page.getByRole('button', { name: /② Lay paper/ }).waitFor();
      await page.clock.runFor(2500);
      await page.getByRole('button', { name: /③ Pull the bar/ }).waitFor();
      await page.clock.runFor(2500);
      await page.getByRole('button', { name: /④ Lift and reveal/ }).waitFor();
      await page.clock.runFor(2500);
      await page.getByRole('button', { name: /⑤ Print another/ }).waitFor();
      await page.clock.runFor(3500);
      await page.getByRole('button', { name: /① Ink the type/ }).waitFor();
      await page.clock.runFor(2500);
      await tour.waitFor();
    }
    await tour.click();
    await page.locator('#pp-phrase').fill('GAMMA');
    await page.locator('#pp-run-notes').fill('An observation edited while the tour is running.');
    await finishTour();
    assert.equal(await page.evaluate(() => ppData.printingPress.pressRun.count), 2);
    assert.equal(await page.locator('[data-proof-number="2"] p').innerText(), 'GAMMA');
    assert.equal(await page.locator('#pp-run-notes').inputValue(), 'An observation edited while the tour is running.');
    await tour.click(); await finishTour();
    await page.clock.resume();
    assert.equal(await page.evaluate(() => ppData.printingPress.pressRun.count), 3);
    assert.equal(await page.locator('[data-proof-number]').count(), 3);
    assert.equal(await page.evaluate(() => ppData.printingPress.pressRun.proofs[2].mode), 'guided');
    await page.getByRole('button', { name: '🔖 Show parts', exact: true }).click();
    await page.getByRole('button', { name: '① Ink the type', exact: true }).click();
    await page.getByRole('button', { name: 'Back to PrintingPress menu', exact: true }).click();
    await page.evaluate(() => ppPatch({ view: 'pressMechanism' }));
    await page.getByRole('button', { name: '① Ink the type', exact: true }).waitFor();
    assert.equal(await page.locator('#pp-impression-count').innerText(), 'Impressions: 3');
    const restored = await context.newPage(); await mount(restored);
    assert.equal(await restored.locator('#pp-impression-count').innerText(), 'Impressions: 3');
    assert.equal(await restored.locator('#pp-phrase').inputValue(), 'GAMMA');
    assert.equal(await restored.getByRole('button', { name: '🔖 Labels: On', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await restored.locator('#pp-run-notes').inputValue(), 'An observation edited while the tour is running.');
    const event = restored.waitForEvent('download');
    await restored.getByRole('button', { name: 'Download notebook', exact: true }).click();
    await (await event).saveAs(path.join(out, 'notebook.txt'));
    const text = fs.readFileSync(path.join(out, 'notebook.txt'), 'utf8');
    assert.ok(text.includes('Completed impressions: 3')); assert.ok(text.includes('ALPHA')); assert.ok(text.includes('An observation edited while the tour is running.'));
    await restored.evaluate(() => ppPatch({ broadsideDraft: { content: 'EXISTING TITLE\nKeep this body', font: 'Verdana', borderStyle: 'simple' } }));
    await restored.getByRole('button', { name: 'Use proof 1 as broadside title', exact: true }).click();
    await restored.getByRole('button', { name: 'Keep current title', exact: true }).click();
    assert.equal(await restored.locator('#pp-phrase').count(), 1);
    await restored.getByRole('button', { name: 'Use proof 1 as broadside title', exact: true }).click();
    await restored.getByRole('button', { name: 'Use printed title', exact: true }).click();
    assert.equal(await restored.locator('#pp-content').inputValue(), 'ALPHA\nKeep this body');
    assert.equal(await restored.locator('#pp-font').inputValue(), 'Verdana');
    assert.equal(await restored.locator('#pp-border').inputValue(), 'simple');
    await restored.evaluate(() => ppPatch({ view: 'pressMechanism' }));
    await restored.locator('#pp-run-notebook').scrollIntoViewIfNeeded();
    await restored.screenshot({ path: path.join(out, 'notebook-desktop.png') });
    await restored.addScriptTag({ path: path.join(root, 'axe-core/4.12.1/axe.min.js') });
    const accessibility = await restored.evaluate(async () => (await axe.run(document.getElementById('pp-run-notebook'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact })));
    assert.deepEqual(accessibility, []);
    const sizes = [];
    for (const width of [390, 320]) {
      await restored.setViewportSize({ width, height: 844 });
      const geometry = await restored.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })); sizes.push(geometry);
      assert.ok(geometry.document <= width + 1, JSON.stringify(geometry));
      await restored.locator('#pp-run-notebook').scrollIntoViewIfNeeded();
      await restored.screenshot({ path: path.join(out, `notebook-mobile-${width}.png`) });
    }
    await restored.setViewportSize({ width: 1280, height: 1000 });
    await restored.evaluate(() => ppPatch({ pressRun: { ...ppData.printingPress.pressRun, count: 14, proofs: Array.from({ length: 14 }, (_, i) => ({ number: i + 1, phrase: 'PROOF ' + (i + 1), timestamp: '2026-09-09T12:00:00.000Z', mode: 'manual' })) } }));
    assert.equal(await restored.locator('[data-proof-number]').count(), 12);
    await makeProof(restored, 'FIFTEEN');
    assert.equal(await restored.locator('#pp-impression-count').innerText(), 'Impressions: 15');
    assert.equal(await restored.locator('[data-proof-number]').count(), 12);
    assert.equal(await restored.locator('[data-proof-number="3"]').count(), 0);
    await restored.getByRole('button', { name: '↺ Reset run', exact: true }).click();
    await restored.getByRole('button', { name: 'Keep this run', exact: true }).click();
    assert.equal(await restored.locator('[data-proof-number]').count(), 12);
    await restored.getByRole('button', { name: '↺ Reset run', exact: true }).click();
    await restored.getByRole('button', { name: 'Start new run', exact: true }).click();
    assert.equal(await restored.locator('#pp-impression-count').innerText(), 'Impressions: 0');
    assert.equal(await restored.locator('[data-proof-number]').count(), 0);
    assert.equal(await restored.locator('#pp-run-notes').inputValue(), '');
    assert.equal(await restored.evaluate(() => ppData.printingPress.broadsideDraft.content), 'ALPHA\nKeep this body');
    assert.equal(await restored.getByRole('button', { name: 'Download notebook', exact: true }).isDisabled(), true);
    await restored.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('storage unavailable'); }; });
    await restored.locator('#pp-run-notes').fill('Session note');
    await restored.getByText('Run available in this session.', { exact: false }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks: ['manual cycle', 'immutable printed phrase', 'repeated guided tours after manual printing', 'notes and phrase edits during tour', 'unfinished-cycle restart', 'cross-page storage recovery', 'labels restored', 'notebook download', 'broadside handoff cancel/confirm', '12-proof retention with continuing total', 'reset cancellation and confirmation', 'existing broadside preserved', 'storage failure feedback', 'mobile geometry', 'notebook accessibility'], sizes, accessibility, errors }, null, 2));
    console.log('Printing Press run notebook browser checks passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
