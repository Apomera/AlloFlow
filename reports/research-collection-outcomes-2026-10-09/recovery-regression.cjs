const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [], errors = [], unexpected = [];
async function run() {
  const browser = await chromium.launch({ headless: true });
  let page, failure;
  async function reset(width = 390, height = 844) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      unexpected.push(route.request().url()); return route.abort();
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'Research settings', exact: true }).waitFor();
    await page.evaluate(() => {
      window.storageWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { storageWrites.push([key, value]); return original.call(this, key, value); };
    });
  }
  const review = () => page.getByRole('dialog', { name: 'Review research sources', exact: true });
  const input = name => review().getByRole('textbox', { name, exact: true, includeHidden: true });
  async function openReview() {
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    await review().waitFor();
  }
  async function enableReview() {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await openReview();
  }
  const draft = ['Cloud observations', 'https://private.example.edu/notes', 'Private unfinished notes', 'Unsent private observations about clouds above a synthetic school playground.'];
  const names = ['Public search topic', 'Source URL (optional for pasted text)', 'Passage title', 'Paste source text'];
  async function fillDraft() {
    await review().getByText('Search for more sources', { exact: true }).click();
    await review().getByText('Add a webpage or your own text', { exact: true }).click();
    for (let i = 0; i < names.length; i++) await input(names[i]).fill(draft[i]);
  }
  async function assertDraft() {
    for (let i = 0; i < names.length; i++) {
      assert.equal(await input(names[i]).inputValue(), draft[i]);
      assert.equal(await input(names[i]).evaluate(node => node.closest('details').open), true);
    }
  }
  const outcome = text => review().locator('[data-research-outcome]').filter({ hasText: text }).waitFor();
  async function assertLayout() {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const action = node.querySelector('[aria-label="Generate from included passages"]').getBoundingClientRect();
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1, visible: action.top >= 0 && action.bottom <= innerHeight, height: scroll.height };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.visible && geometry.height > 30, JSON.stringify(geometry));
  }
  try {
    await reset(); await enableReview(); await fillDraft();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await openReview(); await assertDraft();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditQueries.length, auditReads.length, storageWrites.length]), [0, 0, 0, 0]);
    results.push('Unsent drafts survive Escape/reopen without storage or provider calls');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const beforeScroll = await page.evaluate(() => scrollY);
    await page.mouse.move(2, 100); await page.mouse.wheel(0, 600); await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => scrollY), beforeScroll);
    await assertLayout();
    await page.screenshot({ path: path.join(__dirname, 'draft-restored-390.png') });
    results.push('Modal locks background scrolling and restored drafts fit the phone viewport');
    await review().getByRole('button', { name: 'Add passage', exact: true }).click(); await outcome('Added 1 passage.');
    assert.equal(await input(names[3]).inputValue(), '');
    assert.equal(await input(names[0]).inputValue(), draft[0]);
    for (let i = 1; i < names.length; i++) await input(names[i]).fill(draft[i]);
    await review().getByRole('button', { name: 'Add passage', exact: true }).click(); await outcome('Your pasted text has been kept.');
    await assertDraft(); await assertLayout();
    await page.screenshot({ path: path.join(__dirname, 'duplicate-kept-390.png') });
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    results.push('Successful paste clears submitted fields; duplicate paste preserves the entire draft with visible feedback');
    await page.keyboard.press('Escape');
    await page.locator('#allo-source-topic').fill('A different topic');
    await page.waitForFunction(() => document.querySelector('#allo-source-topic').getAttribute('value') === 'A different topic');
    await page.locator('#allo-source-topic').fill('How clouds form');
    await page.waitForFunction(() => document.querySelector('#allo-source-topic').getAttribute('value') === 'How clouds form');
    await openReview();
    assert.equal(await input(names[3]).inputValue(), '');
    assert.equal(await input(names[0]).inputValue(), '');
    results.push('Topic changes while review is closed clear the previous private draft');
    await reset(320, 640);
    await page.evaluate(() => {
      WebSearchProvider._fetchSerper = async query => { auditQueries.push(query); return Array.from({ length: 24 }, (_, index) => ({ title: 'Cloud reference ' + index, url: 'https://science.example.edu/cloud-' + index, snippet: 'Cloud formation occurs as humid air cools and water vapor condenses. Reference ' + index })); };
    });
    await enableReview();
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click(); await outcome('Added 24 passages.');
    await fillDraft();
    await review().getByRole('button', { name: 'Add passage', exact: true }).click(); await outcome('Your pasted text has been kept.');
    await assertDraft(); await assertLayout();
    assert.equal(await review().locator('li[data-research-id]').count(), 24);
    await page.screenshot({ path: path.join(__dirname, 'full-collection-320.png') });
    results.push('Actual 24-passage capacity preserves rejected pasted text with visible feedback at 320px');
    await review().getByRole('button', { name: 'Remove source from research: Cloud reference 0', exact: true }).click();
    await review().getByRole('button', { name: 'Add passage', exact: true }).click(); await outcome('Added 1 passage.');
    assert.equal(await input(names[3]).inputValue(), '');
    assert.equal(await review().locator('li[data-research-id]').count(), 24);
    assert.equal(await page.evaluate(() => auditQueries.length), 1);
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, storageWrites.length]), [0, 0, 0]);
    results.push('Removing an unwanted source allows the retained draft to be added without another search');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await reset(1280, 900);
    await page.evaluate(() => auditState.setSourceTopic('R'));
    await page.locator('[data-help-key="source_generate_button"]').click();
    await page.waitForFunction(() => auditState.inputText !== 'Existing original reading.' || !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.error), null);
    assert.deepEqual(await page.evaluate(() => [...new Set(auditQueries)]), ['R']);
    results.push('Ordinary one-click research still works for an arbitrary public topic');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) await page.screenshot({ path: path.join(__dirname, 'recovery-failure.png') });
    throw error;
  } finally {
    const moduleHash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../../view_misc_panels_module.js'))).digest('hex');
    fs.writeFileSync(path.join(__dirname, 'recovery-results.json'), JSON.stringify({ base, moduleHash, success: !failure, passed: results.length, results, errors, unexpected, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
