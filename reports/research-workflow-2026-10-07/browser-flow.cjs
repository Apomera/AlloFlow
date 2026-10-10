const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [];
const errors = [];
async function run() {
  const browser = await chromium.launch({ headless: true });
  let page = null;
  async function reset() {
    const viewport = page?.viewportSize() || { width: 1280, height: 1000 };
    if (page) await page.close();
    page = await browser.newPage({ viewport });
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Research settings', exact: true }).waitFor();
  }
  async function settings({ mode, review = false, urls = '', quotes = false }) {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await dialog.getByRole('radio', { name: mode, exact: true }).check();
    await dialog.getByRole('textbox', { name: 'Webpages to include' }).fill(urls);
    await dialog.getByRole('checkbox', { name: 'Review sources before writing' }).setChecked(review);
    await dialog.getByRole('checkbox', { name: 'Exact quotations only' }).setChecked(quotes);
    await dialog.getByRole('button', { name: 'Apply settings' }).click();
  }
  async function submit() { await page.locator('[data-help-key="source_generate_button"]').click(); }
  async function written() {
    await page.waitForFunction(() => window.auditState.inputText !== 'Existing original reading.' || !!window.auditState.error);
    assert.equal(await page.evaluate(() => auditState.error), null);
    return page.locator('#audit-output').innerText();
  }
  try {
    await reset();
    await page.screenshot({ path: path.join(__dirname, 'desktop-default.png'), fullPage: true });
    await submit();
    assert.match(await written(), /clouds/i);
    assert.deepEqual(await page.evaluate(() => [...new Set(auditQueries)]), ['How clouds form']);
    results.push('Default one-click web research accepts arbitrary topics');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/clouds' });
    await submit();
    assert.match(await written(), /clouds/i);
    assert.deepEqual(await page.evaluate(() => auditQueries), []);
    assert.equal(await page.evaluate(() => auditReads.length), 1);
    assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('Humidity and temperature'))));
    assert.equal(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('Navigation and school announcements'))), false);
    results.push('URL-only research reads relevant text beyond the old 1,200-character cutoff without web discovery');

    await reset();
    await settings({ mode: 'Web search', review: true });
    await submit();
    let review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    await review.getByRole('button', { name: 'Find sources to review', exact: true }).click();
    const excluded = review.locator('li[data-research-id]').filter({ hasText: 'Source to exclude' });
    await excluded.getByRole('button', { name: 'Exclude source' }).click();
    await excluded.getByRole('button', { name: 'Read page', exact: true }).click();
    await page.waitForFunction(() => auditReads.length === 1);
    assert.equal(await excluded.getByRole('checkbox').isChecked(), false);
    await review.getByText('Search for more sources', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Public search topic' }).fill('R');
    await review.getByRole('button', { name: 'Search and add results' }).click();
    await page.waitForFunction(() => auditQueries.length === 2);
    assert.equal(await page.evaluate(() => auditQueries[1]), 'R');
    assert.equal(await excluded.getByRole('checkbox').isChecked(), false);
    await review.getByRole('button', { name: 'Close', exact: true }).click();
    await submit();
    review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    assert.equal(await review.locator('li[data-research-id]').filter({ hasText: 'Source to exclude' }).getByRole('checkbox').isChecked(), false);
    await page.screenshot({ path: path.join(__dirname, 'desktop-review.png'), fullPage: true });
    await review.getByRole('button', { name: 'Generate from included passages' }).click();
    await written();
    assert.equal(await page.evaluate(() => auditCalls.filter(call => call.prompt.startsWith('Write an educational reading')).some(call => call.prompt.includes('EXCLUDED_SENTINEL'))), false);
    assert.equal(await page.evaluate(() => auditCalls.filter(call => call.prompt.startsWith('Write an educational reading')).some(call => call.prompt.includes('excluded.example.edu'))), false);
    results.push('Review, search more, source exclusion, close/reopen, and selected-evidence writing');

    await reset();
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const combined = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await combined.getByRole('radio', { name: 'Web and my sources', exact: true }).check();
    await combined.locator('#ownSourcesImport').setInputFiles({ name: 'Cloud field notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Cloud field notes: cooling air causes water vapor to condense into clouds. DOC_SENTINEL: Our classroom observed cumulus clouds forming above the warm field.') });
    await combined.getByText(/1 document\(s\) stored/).waitFor();
    await combined.getByRole('textbox', { name: 'Webpages to include' }).fill('https://science.example.edu/observations');
    await combined.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await combined.getByRole('button', { name: 'Apply settings' }).click();
    await submit();
    review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    await review.getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await review.locator('li[data-research-id]').filter({ hasText: 'Cloud field notes' }).waitFor();
    assert.ok(await review.locator('li[data-research-id]').count() >= 3);
    assert.doesNotMatch(await review.locator('li[data-research-id]').filter({ hasText: 'Cloud observations' }).innerText(), /Navigation and school announcements/);
    await page.screenshot({ path: path.join(__dirname, 'combined-review.png'), fullPage: true });
    await review.getByRole('button', { name: 'Generate from included passages' }).click();
    assert.match(await written(), /\[Document 1\]\(#allo-doc-/);
    assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('DOC_SENTINEL'))));
    assert.ok(await page.evaluate(() => auditQueries.length > 0 && auditReads.length > 0));
    results.push('Combined workflow imports a real text document and writes with document, supplied URL, and discovered web citations');

    await reset();
    await settings({ mode: 'My sources', review: true });
    await submit();
    review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    await review.getByText('Add a webpage or your own text', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Passage title' }).fill('Pasted observations');
    await review.getByRole('textbox', { name: 'Paste source text' }).fill('PASTE_SENTINEL: Clouds formed over the mountain when humid air rose, expanded, and cooled enough for water vapor to condense.');
    await review.getByRole('button', { name: 'Add passage', exact: true }).click();
    const pasted = review.locator('li[data-research-id]').filter({ hasText: 'Pasted observations' });
    await pasted.getByRole('button', { name: 'Remove source from research' }).click();
    assert.equal(await pasted.count(), 0);
    await review.getByRole('button', { name: 'Undo removal' }).click();
    await pasted.waitFor();
    await review.getByRole('button', { name: 'Close', exact: true }).click();
    await settings({ mode: 'My sources', review: false });
    await submit();
    await written();
    assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.includes('PASTE_SENTINEL'))));
    assert.deepEqual(await page.evaluate(() => auditQueries), []);
    assert.deepEqual(await page.evaluate(() => auditReads), []);
    results.push('Paste-only evidence survives removal/undo, review closure, and switching to quick generation');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/clouds', quotes: true });
    await submit();
    await written();
    assert.ok(await page.evaluate(() => auditCalls.some(call => call.prompt.startsWith('Select exact excerpts'))));
    assert.deepEqual(await page.evaluate(() => auditQueries), []);
    results.push('Exact-quotation mode works with supplied URLs');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/unavailable' });
    await submit();
    await page.waitForFunction(() => !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.inputText), 'Existing original reading.');
    assert.deepEqual(await page.evaluate(() => auditState.generatedContent), { text: 'Existing adapted reading' });
    results.push('Failed URL fetch preserves original and adapted readings');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/clouds' });
    await page.evaluate(() => { window.auditBadId = true; });
    await submit();
    await page.waitForFunction(() => !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.inputText), 'Existing original reading.');
    results.push('Invented citation IDs are rejected without replacing existing content');

    await reset();
    await settings({ mode: 'My sources', urls: 'https://science.example.edu/clouds' });
    await page.getByRole('checkbox', { name: 'Research', exact: true }).uncheck();
    await submit();
    await written();
    assert.deepEqual(await page.evaluate(() => auditQueries), []);
    assert.deepEqual(await page.evaluate(() => auditReads), []);
    results.push('Research off skips retrieval despite retained source settings');

    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await reset();
      await page.getByRole('button', { name: 'Research settings', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Research settings', exact: true });
      await dialog.getByRole('radio', { name: 'Web and my sources', exact: true }).check();
      await page.screenshot({ path: path.join(__dirname, `settings-${width}.png`), fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
      await dialog.getByRole('button', { name: 'Apply settings' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close');
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Research settings');
    }
    results.push('Desktop, 390px, and 320px settings fit; keyboard focus is contained and restored');
    assert.deepEqual(errors, []);
  } catch (error) {
    console.error(await page.evaluate(() => ({ error: window.auditState?.error, calls: window.auditCalls, queries: window.auditQueries, reads: window.auditReads, body: document.body.innerText.slice(-3000) })));
    throw error;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, results, errors }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
