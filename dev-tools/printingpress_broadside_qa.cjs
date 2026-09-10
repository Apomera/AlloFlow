const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/printingpress-enhancement');
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
        const [data, setData] = R.useState({ printingPress: { view: 'broadside', ...initial } });
        const updateMulti = (id, patch) => setData(p => ({ ...p, [id]: { ...p[id], ...patch } }));
        window.ppData = data; window.ppPatch = patch => updateMulti('printingPress', patch);
        return StemLab._registry.printingPress.render({ React: R, toolData: data, update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti, t: (k, f) => f || k, addToast: () => {}, awardXP: () => {}, setStemLabTool: () => {} });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(h(App));
    }, initial);
    await page.locator('#pp-content').waitFor();
  }
  try {
    const page = await context.newPage(); await mount(page);
    assert.ok(await page.locator('#pp-content').evaluate(el => el.getBoundingClientRect().top < 650), 'Composer must be immediately reachable');
    const message = 'OUR PRINT SHOP\nBring your ideas.\n<script>window.injected=true</script>\n' + 'longword'.repeat(24);
    await page.locator('#pp-content').fill(message);
    await page.locator('#pp-font').selectOption('Verdana');
    await page.locator('#pp-size').fill('60');
    await page.locator('#pp-body-size').fill('20');
    await page.locator('#pp-leading').fill('1.8');
    await page.locator('#pp-alignment').selectOption('left');
    await page.locator('#pp-border').selectOption('simple');
    await page.getByRole('button', { name: 'Lighthouse', exact: true }).click();
    await page.getByRole('button', { name: 'Vincit qui se vincit', exact: true }).click();
    await page.getByRole('button', { name: 'Silver', exact: true }).click();
    await page.getByRole('button', { name: 'Poem', exact: true }).click();
    await page.getByRole('button', { name: 'Keep my text', exact: true }).click();
    assert.equal(await page.locator('#pp-content').inputValue(), message);
    await page.getByRole('button', { name: 'Poem', exact: true }).click();
    await page.getByRole('button', { name: 'Use template', exact: true }).click();
    assert.match(await page.locator('#pp-content').inputValue(), /WE GREW/);
    await page.getByRole('button', { name: 'Undo template change', exact: true }).click();
    assert.equal(await page.locator('#pp-content').inputValue(), message);
    await page.getByRole('button', { name: 'Back to PrintingPress menu', exact: true }).click();
    await page.evaluate(() => ppPatch({ view: 'broadside' }));
    await page.locator('#pp-content').waitFor();
    assert.equal(await page.locator('#pp-content').inputValue(), message);
    const restored = await context.newPage(); await mount(restored);
    assert.equal(await restored.locator('#pp-content').inputValue(), message);
    assert.equal(await restored.locator('#pp-body-size').inputValue(), '20');
    assert.equal(await restored.locator('#pp-alignment').inputValue(), 'left');
    assert.equal(await restored.getByRole('button', { name: 'Lighthouse', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await restored.getByRole('button', { name: 'Vincit qui se vincit', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await restored.getByRole('button', { name: 'Silver', exact: true }).getAttribute('aria-pressed'), 'true');
    const downloadEvent = restored.waitForEvent('download');
    await restored.getByRole('button', { name: 'Download broadside', exact: true }).click();
    const download = await downloadEvent; const artifact = path.join(out, 'broadside.html'); await download.saveAs(artifact);
    const html = fs.readFileSync(artifact, 'utf8');
    assert.ok(!html.includes('<script>')); assert.ok(!html.includes('Mini-quiz'));
    const exported = await context.newPage(); await exported.setContent(html);
    assert.equal(await exported.locator('script').count(), 0);
    assert.ok((await exported.locator('body').innerText()).includes(message.split('\n')[2]));
    assert.equal(await exported.evaluate(() => window.injected), undefined);
    await exported.screenshot({ path: path.join(out, 'export.png'), fullPage: true });
    await restored.evaluate(() => { window.open = () => null; });
    await restored.getByRole('button', { name: 'Print broadside / Save PDF', exact: true }).click();
    await restored.getByText('The print window could not open.', { exact: false }).waitFor();
    await restored.evaluate(() => { window.open = () => { const doc = document.implementation.createHTMLDocument(''); window.printDocument = doc; return { document: doc, focus() {}, print() { window.printCalled = true; } }; }; });
    await restored.getByRole('button', { name: 'Print broadside / Save PDF', exact: true }).click();
    assert.equal(await restored.evaluate(() => window.printCalled), true);
    assert.ok(!(await restored.evaluate(() => printDocument.body.textContent)).includes('Mini-quiz'));
    await restored.locator('#pp-content').fill('PRINT A BETTER TOMORROW\nA workshop for curious minds\nFriday at 3 pm\nBring a question. Leave with an idea.');
    await restored.evaluate(() => window.scrollTo(0, 0));
    await restored.screenshot({ path: path.join(out, 'desktop.png') });
    const sizes = [];
    for (const width of [390, 320]) {
      await restored.setViewportSize({ width, height: 844 });
      const geometry = await restored.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      sizes.push(geometry); assert.ok(geometry.document <= width + 1, JSON.stringify(geometry));
      await restored.screenshot({ path: path.join(out, `mobile-${width}.png`) });
    }
    await restored.addScriptTag({ path: path.join(root, 'axe-core/4.12.1/axe.min.js') });
    const accessibility = await restored.evaluate(async () => (await axe.run(document.querySelector('#pp-content').closest('.printingpress-no-print'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact })));
    assert.deepEqual(accessibility, []);
    await restored.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('storage unavailable'); }; });
    await restored.locator('#pp-content').fill('SESSION COPY\nKeep this work');
    await restored.getByText('Draft available in this session.', { exact: false }).waitFor();
    await restored.locator('#pp-content').fill('   ');
    assert.equal(await restored.getByRole('button', { name: 'Download broadside', exact: true }).isDisabled(), true);
    await restored.evaluate(() => ppPatch({ broadsideDraft: { content: '', titleSize: 9000, bodySize: -8, font: 'bad-font', markSymbol: 999, markMotto: -1, markFinish: 'bad' } }));
    assert.equal(await restored.locator('#pp-content').inputValue(), '');
    assert.equal(await restored.locator('#pp-size').inputValue(), '80');
    assert.equal(await restored.locator('#pp-body-size').inputValue(), '12');
    assert.equal(await restored.locator('#pp-font').inputValue(), 'Georgia');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks: ['composer placement', 'template cancel and undo', 'navigation recovery', 'browser storage recovery', 'all layout and mark settings restored', 'safe standalone HTML export', 'isolated print content', 'blocked popup feedback', 'empty output disabled', 'unavailable storage feedback', 'invalid saved settings normalized', 'responsive layout', 'composer accessibility'], sizes, accessibility, errors }, null, 2));
    console.log('Printing Press browser regression checks passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
