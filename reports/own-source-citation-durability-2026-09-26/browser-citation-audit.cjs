// Read-only browser reproduction against the current shipped citation helper.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(root, 'node_modules/@playwright/test'));

(async () => {
  const source = fs.readFileSync(path.join(root, 'own_sources_module.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="background">Background</button><a id="citation">Open document passage</a></body></html>' }));
    await page.goto('https://citation-durability.test/');
    const cssDirectory = path.join(root, 'desktop/web-app/public/app/static/css');
    const cssName = fs.readdirSync(cssDirectory).find(name => /^main\.[^.]+\.css$/.test(name));
    if (cssName) await page.addStyleTag({ path: path.join(cssDirectory, cssName) });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const item = AlloResearchEvidence.snapshot([{ sourceId: 'test', evidenceId: 'test-passage', title: 'CloudFieldNotes'.repeat(18) + '.txt', version: 1, locatorLabel: 'Page 7', snippet: 'Long unbroken passage: ' + 'evaporation'.repeat(110) }])[0];
      AlloResearchEvidence.remember([item]);
      document.getElementById('citation').href = '#allo-doc-' + item.id;
    });
    await page.locator('#citation').click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const initial = await dialog.evaluate(element => ({ bounds: element.getBoundingClientRect().toJSON(), width: innerWidth, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop, activeTag: document.activeElement.tagName, activeText: document.activeElement.textContent }));
    await page.screenshot({ path: path.join(__dirname, 'historical-mobile-overflow.png') });
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(250);
    const afterPageUp = await dialog.evaluate(element => element.scrollTop);
    await page.keyboard.press('Tab');
    const afterTab = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent }));
    await page.evaluate(() => document.getElementById('background').focus());
    const escapedFocus = await page.evaluate(() => document.activeElement.id === 'background');
    fs.writeFileSync(path.join(__dirname, 'historical-dialog-audit.json'), JSON.stringify({ helperHash: crypto.createHash('sha256').update(source).digest('hex'), initial, afterPageUp, afterTab, programmaticFocusEscapesModal: escapedFocus, pageErrors: errors, note: 'Historical pre-fix audit, not a final validation.' }, null, 2) + '\n');
    console.log(JSON.stringify({ initial, afterPageUp, afterTab, programmaticFocusEscapesModal: escapedFocus, pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
