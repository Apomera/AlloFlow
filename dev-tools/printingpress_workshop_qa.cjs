const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/printingpress-workshop-ux');
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
    const page = await context.newPage(); await mount(page);
    await page.addScriptTag({ path: path.join(root, 'axe-core/4.12.1/axe.min.js') });
    const checks = [], accessibility = [];
    async function scan(label) {
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.pp-workbench'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary, html: n.html })) })));
      accessibility.push({ label, violations }); assert.deepEqual(violations, []);
    }
    await scan('ready');
    const primary = page.getByRole('button', { name: '① Ink the type', exact: true });
    assert.ok((await primary.boundingBox()).y < 700, 'Primary action visible on desktop');
    assert.equal(await page.locator('.pp-cycle-steps [aria-current="step"]').innerText(), '1\nInk');
    assert.equal(await page.locator('#pp-proof-feedback').count(), 0);
    assert.equal(await page.locator('#pp-paper-preview').innerText(), 'Reveal to find out');
    await page.screenshot({ path: path.join(out, 'ready-desktop.png') });
    await page.getByRole('button', { name: 'It will stay mirror-reversed', exact: true }).click();
    await page.locator('#pp-phrase').fill('PRINT');
    await primary.click();
    await page.getByRole('button', { name: '② Lay paper', exact: true }).waitFor();
    assert.equal(await page.locator('.pp-cycle-steps [aria-current="step"]').innerText(), '2\nPaper');
    assert.equal(await page.locator('#pp-proof-feedback').count(), 0);
    await page.getByRole('button', { name: '② Lay paper', exact: true }).click();
    assert.equal(await page.locator('.pp-cycle-steps [aria-current="step"]').innerText(), '3\nPull');
    await page.locator('.pp-guide summary').click();
    await page.getByText('A screw converts turning motion', { exact: false }).waitFor();
    await page.getByRole('button', { name: '③ Pull the bar', exact: true }).click();
    assert.equal(await page.locator('.pp-cycle-steps [aria-current="step"]').innerText(), '4\nReveal');
    await page.getByRole('button', { name: '④ Lift and reveal', exact: true }).click();
    assert.equal(await page.locator('.pp-cycle-steps [data-done="true"]').count(), 4);
    assert.equal(await page.locator('#pp-paper-preview').innerText(), 'PRINT');
    await page.getByText('Use this evidence to revise your prediction.', { exact: true }).waitFor();
    await scan('revealed');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, 'revealed-desktop.png') });
    await page.getByRole('button', { name: 'Explain in my notebook', exact: true }).click();
    assert.equal(await page.locator('#pp-run-notes').evaluate(el => document.activeElement === el), true);
    await page.getByText('Need a starting point?', { exact: true }).click();
    await page.getByText('When I turned the bar, the screw', { exact: false }).waitFor();
    await page.locator('#pp-run-notes').fill('I predicted a mirrored print. My proof reads PRINT normally. The screw turned and lowered the platen.');
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
    await (await event).saveAs(path.join(out, 'learning-notebook.txt'));
    const text = fs.readFileSync(path.join(out, 'learning-notebook.txt'), 'utf8');
    assert.ok(text.includes('Prediction: It will stay mirror-reversed'));
    await page.getByRole('button', { name: '⑤ Print another', exact: true }).click();
    await page.getByRole('button', { name: 'It will read normally', exact: true }).click();
    assert.equal(await page.evaluate(() => ppData.printingPress.pressRun.proofs[0].prediction), 'mirrored');
    await primary.click();
    await page.getByRole('button', { name: '② Lay paper', exact: true }).click();
    await page.getByRole('button', { name: '③ Pull the bar', exact: true }).click();
    await page.getByRole('button', { name: '④ Lift and reveal', exact: true }).click();
    await page.getByText('Your proof supports your prediction.', { exact: true }).waitFor();
    const notesBeforeReview = await page.locator('#pp-run-notes').inputValue();
    const proofsBeforeReview = await page.evaluate(() => JSON.stringify(ppData.printingPress.pressRun.proofs));
    const reviewButton = page.getByRole('button', { name: 'Review proof 1', exact: true });
    await reviewButton.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#pp-proof-review').evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('#pp-reviewed-phrase').innerText(), 'PRINT');
    await page.getByRole('button', { name: 'Inspect R, position 2', exact: true }).click();
    assert.equal(await page.locator('.pp-letter-pair span').allTextContents().then(x => x.join('')), 'RR');
    assert.equal(await page.getByRole('button', { name: 'Inspect R, position 2', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.locator('#pp-phrase').fill('NEXT');
    assert.equal(await page.locator('#pp-reviewed-phrase').innerText(), 'PRINT', 'Review uses immutable proof, not next phrase');
    await page.getByRole('button', { name: 'Explain proof #1 below', exact: true }).click();
    assert.equal(await page.locator('#pp-run-notes').evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('#pp-run-notes').inputValue(), notesBeforeReview, 'Review never overwrites student writing');
    assert.ok((await page.locator('#pp-run-notes-help').innerText()).includes('Reviewing proof #1: PRINT'));
    assert.equal(await page.evaluate(() => JSON.stringify(ppData.printingPress.pressRun.proofs)), proofsBeforeReview);
    const reviewViolations = await page.evaluate(async () => (await axe.run(document.querySelector('#pp-run-notebook'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    accessibility.push({ label: 'proof notebook', violations: reviewViolations }); assert.deepEqual(reviewViolations, []);
    await page.locator('#pp-proof-review').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'proof-review-desktop.png') });
    await page.getByRole('button', { name: 'Close review', exact: true }).click();
    assert.equal(await reviewButton.evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('#pp-proof-review').count(), 0);
    await reviewButton.click();
    const sizes = [];
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0));
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })); sizes.push(geometry);
      assert.ok(geometry.document <= width + 1, JSON.stringify(geometry));
      await page.screenshot({ path: path.join(out, `workshop-${width}.png`) });
      await page.locator('#pp-proof-review').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `proof-review-${width}.png`) });
      await page.locator('.pp-guide').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `guide-${width}.png`) });
    }
    await scan('phone');
    const reopened = await context.newPage(); await mount(reopened);
    assert.equal(await reopened.getByRole('button', { name: 'It will read normally', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await reopened.evaluate(() => ppData.printingPress.pressRun.proofs[0].prediction), 'mirrored');
    assert.equal(await reopened.locator('[data-proof-number="1"] .pp-proof-prediction').innerText(), 'Prediction: It will stay mirror-reversed');
    await reopened.getByRole('button', { name: 'Review proof 1', exact: true }).click();
    assert.equal(await reopened.locator('#pp-reviewed-phrase').innerText(), 'PRINT');
    await reopened.getByRole('button', { name: 'Close review', exact: true }).click();
    // A legacy proof or skipped prediction receives observation feedback, never a failure grade.
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.getByRole('button', { name: '⑤ Print another', exact: true }).click();
    await page.getByRole('button', { name: 'I am not sure yet', exact: true }).click();
    await primary.click(); await page.getByRole('button', { name: '② Lay paper', exact: true }).click();
    await page.getByRole('button', { name: '③ Pull the bar', exact: true }).click(); await page.getByRole('button', { name: '④ Lift and reveal', exact: true }).click();
    await page.getByText('You have evidence to explain.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks: ['desktop action visibility', 'four-step progression', 'no early result feedback', 'per-step hints', 'prediction revision feedback', 'supported prediction feedback', 'unsure feedback', 'immutable prediction snapshots', 'prediction recovery', 'notebook focus handoff', 'sentence starters', 'prediction export', 'responsive workshop and guide', 'workbench WCAG A/AA', 'keyboard proof selection and return focus', 'letter inspection', 'immutable saved proof review', 'observation preservation', 'proof context for writing', 'reopened proof review', 'responsive review', 'notebook WCAG A/AA'], sizes, accessibility, errors }, null, 2));
    console.log('Printing Press workshop UX checks passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
