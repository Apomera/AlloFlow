const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [];
const errors = [];
const blockedRequests = [];
const moduleHashes = Object.fromEntries(['content_engine_module.js', 'view_misc_panels_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));

async function run() {
  const browser = await chromium.launch({ headless: true });
  let page;
  let failure;
  async function reset(width = 1280) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      blockedRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.getByRole('button', { name: 'Research settings', exact: true }).waitFor();
  }
  async function settings({ mode = 'Web search', review = false, urls = '' } = {}) {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await dialog.getByRole('radio', { name: mode, exact: true }).check();
    await dialog.getByRole('textbox', { name: 'Webpages to include' }).fill(urls);
    await dialog.getByRole('checkbox', { name: 'Review sources before writing' }).setChecked(review);
    await dialog.getByRole('button', { name: 'Apply settings' }).click();
  }
  async function submit() { await page.locator('[data-help-key="source_generate_button"]').click(); }
  async function reviewSources() {
    await submit();
    const dialog = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    await dialog.getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await dialog.locator('li[data-research-id]').first().waitFor();
    return dialog;
  }
  async function written() {
    await page.waitForFunction(() => auditState.inputText !== 'Existing original reading.' || !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.error), null);
    return page.locator('#audit-output').innerText();
  }
  async function assertPreserved() {
    assert.equal(await page.evaluate(() => auditState.inputText), 'Existing original reading.');
    assert.deepEqual(await page.evaluate(() => auditState.generatedContent), { text: 'Existing adapted reading' });
  }
  async function assertNoOverflow(dialog) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page must fit viewport');
    assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), 'Dialog must fit its container');
  }
  try {
    await reset();
    await page.screenshot({ path: path.join(__dirname, 'desktop-default.png'), fullPage: true });
    await submit();
    assert.match(await written(), /clouds/i);
    assert.deepEqual(await page.evaluate(() => [...new Set(auditQueries)]), ['How clouds form']);
    results.push('Ordinary one-click web research still works with arbitrary explicit topics');

    await reset();
    await settings({ review: true });
    let review = await reviewSources();
    let source = review.locator('li[data-research-id]').filter({ hasText: 'Cloud formation reference' });
    await source.getByText('Search snippet only; the full page has not been read.', { exact: true }).first().waitFor({ state: 'visible' });
    assert.ok(await page.evaluate(() => auditGroupTopics.includes('How clouds form')), 'The visible topic reaches groupSources');
    await source.getByRole('button', { name: 'Read page', exact: true }).click();
    await page.waitForFunction(() => auditReads.length === 1);
    await source.locator('[data-research-highlights]').waitFor();
    assert.match(await source.locator('[data-research-highlights]').innerText(), /rising air|Humidity and temperature/);
    const supporting = source.locator('[data-research-highlights]').getByRole('button').first();
    await supporting.click();
    const support = source.locator('blockquote[data-research-passage]:focus');
    await support.waitFor({ state: 'visible' });
    assert.equal(await source.locator('details[data-research-passages]').getAttribute('open'), '');
    const quote = await support.innerText();
    assert.ok(quote.includes('Clouds form when rising air') || quote.includes('Humidity and temperature'));
    assert.ok((await source.innerText()).includes('Page excerpt'));
    assert.ok((await source.innerText()).includes('Search snippet'));
    assert.equal(await source.getByText('Search snippet only; the full page has not been read.', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(__dirname, 'desktop-ranked-review.png'), fullPage: true });
    results.push('Topic-aware page excerpts replace snippet previews, with exact supporting-passage links and visible evidence types');

    const excluded = review.locator('li[data-research-id]').filter({ hasText: 'Source to exclude' });
    await excluded.getByRole('button', { name: 'Exclude source', exact: true }).click();
    await excluded.getByRole('button', { name: 'Read page', exact: true }).click();
    await page.waitForFunction(() => auditReads.length === 2);
    await review.getByText('Search for more sources', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Public search topic' }).fill('Cloud formation');
    await review.getByRole('button', { name: 'Search and add results' }).click();
    await page.waitForFunction(() => auditQueries.length === 2);
    assert.equal(await excluded.getByRole('checkbox').isChecked(), false);
    await review.getByRole('button', { name: 'Close', exact: true }).click();
    await submit();
    review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    assert.equal(await review.locator('li[data-research-id]').filter({ hasText: 'Source to exclude' }).getByRole('checkbox').isChecked(), false);
    await review.getByRole('button', { name: 'Generate from included passages' }).click();
    const output = await written();
    assert.equal(await page.evaluate(() => auditCalls.filter(call => call.prompt.startsWith('Write an educational reading')).some(call => call.prompt.includes('EXCLUDED_SENTINEL'))), false);
    const references = output.split('### Source Text References')[1].split('### Research Review')[0];
    assert.equal((references.match(/\d+\. \[[^\]]+\]\(https:\/\/science\.example\.edu\/clouds\)/g) || []).length, 1);
    results.push('Ranking and repeated searches preserve exclusions; multiple passages from one webpage produce one reference');

    await reset();
    await settings({ review: true });
    await page.evaluate(() => auditState.setWebSearchProvider({}));
    review = await reviewSources();
    const note = review.locator('li[data-research-id]').filter({ hasText: 'Cloud formation AI-linked note' });
    await note.getByText('AI-linked notes, not page excerpts. Read the page to check the original wording.', { exact: true }).waitFor({ state: 'visible' });
    assert.match(await note.innerText(), /Source-linked AI note/);
    await page.screenshot({ path: path.join(__dirname, 'ai-note-review.png'), fullPage: true });
    results.push('Source-linked AI notes are visibly distinguished from verbatim page excerpts');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/clouds' });
    await page.evaluate(() => { window.auditPartialUncited = true; });
    await submit();
    await page.waitForFunction(() => !!auditState.error);
    await assertPreserved();
    assert.match(await page.evaluate(() => auditState.error), /cit|evidence|paragraph/i);
    assert.equal(await page.evaluate(() => auditCalls.filter(call => call.prompt.startsWith('Write an educational reading')).length), 1);
    results.push('A partly uncited draft is rejected without replacing original or adapted text or retrying automatically');

    await reset();
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const combined = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await combined.getByRole('radio', { name: 'Web and my sources', exact: true }).check();
    await combined.locator('#ownSourcesImport').setInputFiles({ name: 'Cloud field notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Cloud field notes: cooling air causes water vapor to condense into clouds. DOC_SENTINEL: Our classroom observed cumulus clouds above the warm field.') });
    await combined.getByText(/1 document\(s\) stored/).waitFor();
    await combined.getByRole('textbox', { name: 'Webpages to include' }).fill('https://science.example.edu/observations');
    await combined.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await combined.getByRole('button', { name: 'Apply settings' }).click();
    review = await reviewSources();
    await review.locator('li[data-research-id]').filter({ hasText: 'Cloud field notes' }).waitFor();
    await page.screenshot({ path: path.join(__dirname, 'combined-review.png'), fullPage: true });
    await review.getByRole('button', { name: 'Generate from included passages' }).click();
    assert.match(await written(), /\[Document 1\]\(#allo-doc-/);
    assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('DOC_SENTINEL'))));
    assert.equal(await page.evaluate(() => auditQueries.some(query => query.includes('DOC_SENTINEL'))), false);
    results.push('Combined document, supplied-page, and discovered-web writing retains document citations and private-query separation');

    for (const width of [1280, 390, 320]) {
      await reset(width);
      await settings({ mode: 'My sources', review: true, urls: 'https://science.example.edu/clouds' });
      review = await reviewSources();
      source = review.locator('li[data-research-id]').first();
      await source.getByRole('button', { name: 'View supporting passage 1', exact: true }).first().click();
      assert.ok(await source.locator('blockquote[data-research-passage]:focus').count());
      await assertNoOverflow(review);
      await page.screenshot({ path: path.join(__dirname, `review-${width}.png`), fullPage: true });
      await review.getByRole('button', { name: 'Generate from included passages' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close');
      await page.keyboard.press('Escape');
      assert.equal(await review.count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-help-key')), 'source_generate_button');
      results.push(`Review at ${width}px fits, links focus exact passages, and keyboard focus is contained/restored`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(blockedRequests, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) {
      await page.screenshot({ path: path.join(__dirname, 'failure.png'), fullPage: true }).catch(() => {});
      console.error(await page.evaluate(() => ({ error: window.auditState?.error, queries: window.auditQueries, reads: window.auditReads, body: document.body.innerText.slice(-4000) })).catch(() => ({})));
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, moduleHashes, passed: results.length, results, errors, blockedRequests, success: !failure, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
