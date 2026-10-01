// Real Chromium checks for shipped citation UI/cache; no host boot or AI provider.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(root, 'node_modules/@playwright/test'));
const prefix = 'alloflow.research-evidence.v1.';
const modulePath = 'own_sources_module.js';
const helperPaths = [modulePath, 'desktop/web-app/public/own_sources_module.js', 'desktop/app-build/own_sources_module.js', 'desktop/web-app/build/own_sources_module.js'];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');
const beforeHash = hash(source);
const readModuleHashes = () => Object.fromEntries(helperPaths.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const beforeModuleHashes = readModuleHashes();
const cssDirectory = path.join(root, 'desktop/web-app/public/app/static/css');
const cssName = fs.readdirSync(cssDirectory).find(name => /^main\.[^.]+\.css$/.test(name));
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citation durability</title></head><body><main style="padding:24px"><button id="background">Background action</button><p><a id="citation" href="#">Inspect saved document passage</a></p></main></body></html>';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const pageErrors = [];
  const layouts = [];
  const cacheResults = {};
  let currentPage;
  async function freshPage() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    currentPage = page;
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('https://citation-durability.test/');
    await install(page);
    return page;
  }
  async function install(page) {
    if (cssName) await page.addStyleTag({ path: path.join(cssDirectory, cssName) });
    await page.addScriptTag({ content: source });
  }
  async function reload(page) { await page.reload(); await install(page); }
  async function setCitation(page, row) {
    return page.evaluate(row => {
      const item = AlloResearchEvidence.snapshot([row])[0];
      const result = AlloResearchEvidence.finish('A generated claim. [Your document 1]', [item]);
      document.getElementById('citation').href = '#allo-doc-' + item.id;
      return { item, result };
    }, row);
  }
  async function assertMobileLayout(page, label) {
    const layout = await page.getByRole('dialog').evaluate(element => {
      const rect = element.getBoundingClientRect();
      const quote = element.querySelector('blockquote');
      return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, left: rect.left, right: rect.right, panelWidth: element.clientWidth, panelScrollWidth: element.scrollWidth, quoteWidth: quote?.clientWidth, quoteScrollWidth: quote?.scrollWidth };
    });
    assert.ok(layout.left >= 0 && layout.right <= layout.width + 1, label + ': dialog fits mobile width');
    assert.ok(layout.documentWidth <= layout.width + 1, label + ': no page overflow');
    assert.ok(layout.panelScrollWidth <= layout.panelWidth + 1, label + ': no panel overflow');
    if (layout.quoteWidth) assert.ok(layout.quoteScrollWidth <= layout.quoteWidth + 1, label + ': no quote overflow');
    layouts.push({ label, ...layout });
  }
  try {
    // Long filenames and tokens must wrap instead of requiring horizontal scrolling.
    let page = await freshPage();
    const longTitle = 'CloudFieldNotes'.repeat(18) + '.txt';
    const longPassage = 'Long unbroken passage: ' + 'evaporation'.repeat(110);
    const saved = await setCitation(page, { sourceId: 'test-source', evidenceId: 'test-passage', title: longTitle, version: 1, locatorLabel: 'Page 7', snippet: longPassage });
    assert.equal(saved.result.evidence.persisted, true);
    await page.locator('#citation').click();
    let dialog = page.getByRole('dialog', { name: longTitle });
    await dialog.waitFor();
    assert.equal(await dialog.locator('blockquote').textContent(), saved.item.passage);
    assert.match(await dialog.textContent(), /Page 7.*Saved document version 1/s);
    const longTitleBox = await dialog.locator('h2').boundingBox();
    const longQuoteBox = await dialog.locator('blockquote').boundingBox();
    assert.ok(longTitleBox.width >= longQuoteBox.width - 1, 'Long filename uses the full content width');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage');
    await page.evaluate(() => document.getElementById('background').focus());
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage', 'Focus cannot escape into background controls');
    await assertMobileLayout(page, 'long unbroken filename and passage');
    await page.screenshot({ path: path.join(__dirname, 'mobile-long-citation.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'citation');
    await page.locator('#background').focus();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'background', 'Closing removes the focus guard');
    checks.push('Long unbroken filenames and exact supplied passages wrap inside the 390px viewer, with source page/version visible.');

    // The scroll region is in the focus cycle and responds to keyboard scrolling.
    const lines = Array.from({ length: 32 }, (_, index) => `Line ${index + 1}: Water evaporates and forms clouds.`).join('\n');
    const multiline = await setCitation(page, { sourceId: 'multiline', evidenceId: 'multiline-passage', title: 'Keyboard passage.txt', version: 2, locatorLabel: 'Page 12', snippet: lines });
    await page.locator('#citation').click();
    dialog = page.getByRole('dialog', { name: 'Keyboard passage.txt' });
    await dialog.waitFor();
    assert.equal(await dialog.locator('blockquote').textContent(), multiline.item.passage);
    const closeBox = await dialog.getByRole('button', { name: 'Close passage' }).boundingBox();
    assert.ok(closeBox.y >= 0 && closeBox.y + closeBox.height < 844, 'Close is initially visible');
    assert.equal(await dialog.locator('blockquote').evaluate(element => element.scrollTop), 0);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BLOCKQUOTE');
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => document.querySelector('[role="dialog"] blockquote').scrollTop > 0);
    const scrollAfterPageDown = await dialog.locator('blockquote').evaluate(element => element.scrollTop);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BLOCKQUOTE');
    await assertMobileLayout(page, 'keyboard scrollable multiline passage');
    await page.screenshot({ path: path.join(__dirname, 'mobile-keyboard-passage.png') });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'citation');
    checks.push(`Keyboard Tab/Shift+Tab cycle through Close and passage; PageDown scrolls the exact quote (${scrollAfterPageDown}px); Escape restores citation focus.`);

    if (process.argv.includes('--ui-only')) {
      assert.deepEqual(pageErrors, []);
      const result = { passed: true, scope: 'UI-only intermediate verification', checks, layouts, pageErrors, testedHelperHash: beforeHash };
      fs.writeFileSync(path.join(__dirname, 'intermediate-ui-result.json'), JSON.stringify(result, null, 2) + '\n');
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Inject a storage quota at the previous footprint. The new cache must evict
    // only eligible old citation records, then persist the newest snapshot.
    page = await freshPage();
    const quota = await page.evaluate(prefix => {
      const api = AlloResearchEvidence;
      const old = Array.from({ length: 3 }, (_, index) => api.snapshot([{ sourceId: 'old-' + index, title: 'Old ' + index, snippet: 'Previously saved passage number ' + index }])[0]);
      for (const item of old) { if (!api.remember([item])) throw new Error('Unable to seed citation cache'); }
      localStorage.setItem('unrelated-user-setting', 'must remain');
      const set = Storage.prototype.setItem;
      const ownedCount = () => Object.keys(localStorage).filter(key => key.startsWith(prefix)).length;
      window.quotaFailures = 0;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key.startsWith(prefix) && !this.getItem(key) && ownedCount() >= 3) {
          window.quotaFailures++;
          throw new DOMException('Injected browser quota', 'QuotaExceededError');
        }
        return set.call(this, key, value);
      };
      const newest = api.snapshot([{ sourceId: 'latest', title: 'Latest saved passage.txt', locatorLabel: 'Page 19', version: 3, snippet: 'The latest passage must remain available after quota recovery and page reload.' }])[0];
      const result = api.finish('A cited claim. [Your document 1]', [newest]);
      return { oldIds: old.map(item => item.id), latest: newest, persisted: result.evidence.persisted, quotaFailures: window.quotaFailures, ownedCount: ownedCount(), unrelated: localStorage.getItem('unrelated-user-setting') };
    }, prefix);
    assert.ok(quota.quotaFailures >= 1, 'Injected quota path was reached');
    assert.equal(quota.persisted, true, 'Latest snapshot recovers from quota');
    assert.equal(quota.unrelated, 'must remain');
    assert.ok(quota.ownedCount <= 3);
    await reload(page);
    const restored = await page.evaluate(({ id, prefix, oldId }) => ({ latest: AlloResearchEvidence.lookup(id), oldest: AlloResearchEvidence.lookup(oldId), unrelated: localStorage.getItem('unrelated-user-setting'), ownedCount: Object.keys(localStorage).filter(key => key.startsWith(prefix)).length }), { id: quota.latest.id, prefix, oldId: quota.oldIds[0] });
    assert.equal(restored.latest.passage, quota.latest.passage);
    assert.equal(restored.oldest, null);
    assert.equal(restored.unrelated, 'must remain');
    await page.evaluate(id => { document.getElementById('citation').href = '#allo-doc-' + id; }, quota.latest.id);
    await page.locator('#citation').click();
    assert.equal(await page.getByRole('dialog').locator('blockquote').textContent(), quota.latest.passage);
    await assertMobileLayout(page, 'quota recovered citation after reload');
    await page.screenshot({ path: path.join(__dirname, 'mobile-reloaded-citation.png') });
    cacheResults.quotaRecovery = { failures: quota.quotaFailures, retainedCount: restored.ownedCount, latestSurvivedReload: true, oldestEvicted: true, unrelatedPreserved: true };
    checks.push('A real localStorage write with injected QuotaExceededError evicts an older citation, persists the latest, and reload opens its exact passage without touching unrelated storage.');

    // Cache bounds are enforced by the production helper over real storage.
    page = await freshPage();
    const bounded = await page.evaluate(prefix => {
      const items = Array.from({ length: 220 }, (_, index) => AlloResearchEvidence.snapshot([{ sourceId: 'bounded-' + index, title: 'Saved passage ' + index, snippet: 'Water cycles through evaporation, condensation, and precipitation. '.repeat(18) }])[0]);
      for (const item of items) if (!AlloResearchEvidence.remember([item])) throw new Error('Bounded citation failed to persist');
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      return { count: keys.length, bytes: keys.reduce((sum, key) => sum + (key.length + localStorage.getItem(key).length) * 2, 0), firstId: items[0].id, latest: items[items.length - 1] };
    }, prefix);
    assert.ok(bounded.count <= 200, 'Persistent cache stays within record limit');
    assert.ok(bounded.bytes <= 512 * 1024, 'Persistent cache stays within byte limit');
    await reload(page);
    const boundedReload = await page.evaluate(({ firstId, latest }) => ({ first: AlloResearchEvidence.lookup(firstId), latest: AlloResearchEvidence.lookup(latest.id) }), bounded);
    assert.equal(boundedReload.first, null);
    assert.equal(boundedReload.latest.passage, bounded.latest.passage);
    cacheResults.persistentBound = { count: bounded.count, estimatedUTF16Bytes: bounded.bytes, latestSurvivedReload: true };
    checks.push('220 citation saves stay within 200 records and 512 KiB; the newest passage remains readable after reload.');

    // A completely unavailable write path remains explicit; session memory is
    // bounded, and exported reference text still contains the exact passage.
    page = await freshPage();
    const unavailable = await page.evaluate(prefix => {
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key.startsWith(prefix)) throw new DOMException('Storage unavailable for test', 'QuotaExceededError');
        return originalSet.call(this, key, value);
      };
      const items = Array.from({ length: 70 }, (_, index) => AlloResearchEvidence.snapshot([{ sourceId: 'memory-' + index, title: 'Unsaved passage ' + index, snippet: 'A retained in-session passage with an explicit durable storage failure. '.repeat(16) }])[0]);
      for (const item of items) AlloResearchEvidence.remember([item]);
      const latest = items[items.length - 1];
      const output = AlloResearchEvidence.finish('Session citation. [Your document 1]', [latest]);
      return { first: AlloResearchEvidence.lookup(items[0].id), latest: AlloResearchEvidence.lookup(latest.id), output, availableCount: items.filter(item => AlloResearchEvidence.lookup(item.id)).length, durableCount: Object.keys(localStorage).filter(key => key.startsWith(prefix)).length };
    }, prefix);
    assert.equal(unavailable.first, null, 'Old session evidence is evicted');
    assert.ok(unavailable.latest);
    assert.ok(unavailable.availableCount <= 64, 'Session cache stays within its record limit');
    assert.equal(unavailable.output.evidence.persisted, false);
    assert.equal(unavailable.durableCount, 0);
    assert.ok(unavailable.output.text.includes(unavailable.latest.passage));
    assert.match(unavailable.output.text, /could not save|could not be saved|not saved|unavailable/i);
    await page.evaluate(id => { document.getElementById('citation').href = '#allo-doc-' + id; }, unavailable.latest.id);
    await page.locator('#citation').click();
    assert.equal(await page.getByRole('dialog').locator('blockquote').textContent(), unavailable.latest.passage);
    await reload(page);
    assert.equal(await page.evaluate(id => AlloResearchEvidence.lookup(id), unavailable.latest.id), null);
    await page.evaluate(id => { document.getElementById('citation').href = '#allo-doc-' + id; }, unavailable.latest.id);
    await page.locator('#citation').click();
    await page.getByRole('dialog', { name: 'Document passage unavailable' }).waitFor();
    assert.match(await page.getByRole('dialog').textContent(), /Your Document References/);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close passage');
    await assertMobileLayout(page, 'unavailable snapshot fallback');
    await page.screenshot({ path: path.join(__dirname, 'mobile-unavailable-citation.png') });
    cacheResults.unavailable = { oldestSessionEvicted: true, latestInSession: true, persisted: false, exactPassageRetainedInOutput: true, reloadFallback: true };
    checks.push('Total storage refusal keeps bounded session evidence, reports persistence failure, preserves exact reference text, and shows an honest missing-snapshot message after reload.');

    assert.deepEqual(pageErrors, []);
    const afterModuleHashes = readModuleHashes();
    assert.deepEqual(afterModuleHashes, beforeModuleHashes, 'All helper copies stayed stable during tests');
    assert.ok(Object.values(afterModuleHashes).every(value => value === beforeHash), 'Canonical, public, and both packaged helpers are identical');
    const result = { passed: true, browser: 'Chromium (headless)', checks, pageErrors, layouts, cacheResults, moduleHashes: { before: beforeModuleHashes, after: afterModuleHashes }, limitations: ['Tests load the shipped helper and app stylesheet on an isolated browser origin with real localStorage and injected quota errors.', 'No full-host startup, AI generation, or live provider request was tested.'] };
    fs.writeFileSync(path.join(__dirname, 'browser-citation-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (currentPage) await currentPage.screenshot({ path: path.join(__dirname, 'browser-citation-failure.png') }).catch(() => {});
    fs.writeFileSync(path.join(__dirname, 'browser-citation-result.json'), JSON.stringify({ passed: false, checks, pageErrors, error: error.stack || String(error), testedHelperHash: beforeHash }, null, 2) + '\n');
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
