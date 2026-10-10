const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [], errors = [], blockedRequests = [];
const moduleHashes = Object.fromEntries(['text_pipeline_helpers_module.js', 'view_simplified_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));

async function run() {
  const browser = await chromium.launch({ headless: true });
  let page, failure;
  async function reset(width = 1280) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(90000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      blockedRequests.push(route.request().url()); return route.abort();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.locator('[data-student-sources] > summary').waitFor({ state: 'visible' });
  }
  const panel = () => page.locator('[data-student-sources]');
  const publicSource = () => page.locator('[data-student-source]').filter({ hasText: 'Cloud formation reference' });
  const citation = () => page.locator('[data-reading-passage] a[href^="https://science.example.edu/"]').first();
  try {
    await reset();
    assert.equal(await panel().getAttribute('open'), null);
    assert.equal(await page.locator('[data-reading-passage]').innerText().then(text => /PRIVATE_|Research Review/.test(text)), false);
    await page.screenshot({ path: path.join(__dirname, 'student-sources-collapsed-1280.png'), fullPage: true });
    await citation().click();
    assert.equal(await panel().getAttribute('open'), '');
    assert.equal(await publicSource().getAttribute('open'), '');
    assert.equal(await publicSource().locator('summary').evaluate(node => node === document.activeElement), true);
    assert.equal(await publicSource().locator('[data-student-source-passage]').textContent(), await page.evaluate(() => fixture.sourceText));
    await panel().getByRole('button', { name: 'Back to reading', exact: true }).click();
    assert.equal(await citation().evaluate(node => node === document.activeElement), true);
    assert.deepEqual(await page.evaluate(() => fixture.calls), []);
    results.push('Actual adapted-reader citation opens the source, preserves exact text, and returns focus without AI/audio calls');

    await citation().evaluate(node => node.setAttribute('href', node.getAttribute('href').replace('%28', '(').replace('%29', ')')));
    await citation().click();
    assert.equal(await publicSource().locator('summary').evaluate(node => node === document.activeElement), true);
    assert.equal(await publicSource().getAttribute('open'), '');
    assert.equal(await page.evaluate(() => fixture.safeRecord.sources[0].citationHref.includes('%28formation%29')), true);
    results.push('Legacy raw-parentheses citation hrefs match canonical encoded source URLs through the actual helper');
    assert.equal(await panel().locator('[data-student-plain-reference]').count(), 1);
    assert.equal(await panel().locator('[data-student-plain-reference]').innerText(), '4. Printed book, 2020.');
    assert.doesNotMatch(await panel().innerText(), /PRIVATE_|Research Review/);
    results.push('Mixed bibliographies retain plain printed references alongside web sources without showing teacher appendices');

    await panel().locator('summary').first().click();
    await page.locator('[data-reading-passage] a[href="#allo-doc-private"]').click();
    const denied = page.locator('[data-student-source]').filter({ hasText: 'The source text has not been shared with students.' });
    assert.equal(await denied.getAttribute('open'), '');
    assert.match(await denied.innerText(), /has not been shared with students/);
    assert.equal(await denied.locator('[data-student-source-passage]').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_|Research Review|excluded sources/i);
    await page.locator('[data-reading-passage] a[href="#allo-doc-private"]').click({ modifiers: ['Control'] });
    assert.deepEqual(await page.evaluate(() => fixture.calls), []);
    await page.locator('[data-reading-passage] a[href="#allo-doc-approved"]').click();
    const approved = page.locator('[data-student-source]').filter({ hasText: 'Classroom field notes' });
    assert.match(await approved.innerText(), /We observed small clouds above the warm field on Tuesday/);
    assert.match(await approved.innerText(), /Document passage: Page 1/);
    results.push('Document citations show only explicitly shared text; private titles, passages, locators, and review history stay absent');

    const snippet = page.locator('[data-student-source]').filter({ hasText: 'Cloud shapes search result' });
    await snippet.locator('summary').click();
    assert.match(await snippet.innerText(), /search preview, not a passage from a page that was read/);
    const note = page.locator('[data-student-source]').filter({ hasText: 'Cloud movement reference' });
    await note.locator('summary').click();
    assert.match(await note.innerText(), /AI note linked to the source, not the source's exact wording/);
    assert.match(await panel().innerText(), /AI-written reading/);
    assert.equal(await panel().getByRole('link', { name: 'Open source', exact: true }).count(), 3);
    results.push('Page excerpts, snippets, AI notes, and AI-written synthesis have distinct truthful labels');

    await citation().focus(); await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    assert.equal(await panel().getAttribute('open'), null);
    assert.equal(await citation().evaluate(node => node === document.activeElement), true);
    await panel().locator('summary').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await panel().getAttribute('open'), '');
    results.push('Keyboard citation activation, disclosure opening, Escape closing, and focus restoration work');

    await page.locator('#fixture-mode').selectOption('basic');
    await panel().locator('summary').first().click();
    await publicSource().locator('summary').click();
    assert.match(await panel().innerText(), /Only a source link is available/);
    assert.equal(await panel().locator('[data-student-source-passage]').count(), 0);
    assert.equal(await panel().locator('[data-student-sources-writing]').count(), 0);
    assert.equal(await panel().locator('[data-student-source]').count(), 1);
    results.push('Basic research remains links-only with no invented excerpt or writing-mode claim');

    for (const width of [1280, 390, 320]) {
      await reset(width); await citation().click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page fits ' + width + 'px');
      assert.ok(await panel().evaluate(node => node.scrollWidth <= node.clientWidth), 'Source panel fits ' + width + 'px');
      assert.ok(await publicSource().locator('summary').evaluate(node => node.getBoundingClientRect().height >= 44), 'Source disclosure has a 44px target');
      await page.screenshot({ path: path.join(__dirname, `student-sources-${width}.png`), fullPage: true });
      results.push(`Actual reader and source disclosure fit ${width}px without overflow`);
    }
    assert.deepEqual(errors, []); assert.deepEqual(blockedRequests, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) {
      await page.screenshot({ path: path.join(__dirname, 'failure.png'), fullPage: true }).catch(() => {});
      console.error(await page.evaluate(() => ({ modules: Object.keys(window.AlloModules || {}), body: document.body.innerText.slice(-4000) })).catch(() => ({})));
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, moduleHashes, success: !failure, passed: results.length, results, errors, blockedRequests, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
