const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [], errors = [], unexpected = [], observations = [];
const paste = [
  'Clouds form when moist air rises over mountain slopes and expands at lower pressure, producing cooling and condensation.',
  'Cloud droplets gather on airborne particles such as sea salt and dust, with each microscopic nucleus supporting condensation.',
  'Cloud shapes reveal atmospheric stability; layered formations spread in calm air while rising convection builds tall towers.'
].join('\n\n');
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
  const outcome = text => review().locator('[data-research-outcome]').filter({ hasText: text }).waitFor();
  async function enableReview(urls) {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    if (urls) await settings.getByRole('textbox', { name: 'Webpages to include', exact: true }).fill(urls.join('\n'));
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    await review().waitFor();
  }
  async function draft(url = 'https://private.example.edu/cloud-notes') {
    await review().getByText('Add a webpage or your own text', { exact: true }).click();
    await input('Source URL (optional for pasted text)').fill(url);
    await input('Passage title').fill('Private cloud observations');
    await input('Paste source text').fill(paste);
  }
  async function add() { await review().getByRole('button', { name: 'Add passage', exact: true }).click(); }
  async function layout(name) {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const action = node.querySelector('[aria-label="Generate from included passages"]').getBoundingClientRect();
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1, visible: action.top >= 0 && action.bottom <= innerHeight, scrollHeight: scroll.height };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.visible && geometry.scrollHeight > 30, JSON.stringify(geometry));
    observations.push({ name, geometry, outcome: await review().locator('[data-research-outcome]').textContent() });
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  try {
    await reset(320, 640);
    await page.evaluate(() => {
      WebSearchProvider._fetchSerper = async query => { auditQueries.push(query); return Array.from({ length: 23 }, (_, index) => ({ title: 'Cloud reference ' + index, url: 'https://science.example.edu/cloud-' + index, snippet: 'Cloud formation occurs as humid air cools and water vapor condenses. Reference ' + index })); };
    });
    await enableReview();
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await outcome('Added 23 passages.');
    await draft();
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length, storageWrites.length]), [1, 0, 0, 0]);
    await add(); await outcome('Collection limit reached (24 passages).');
    assert.equal(await input('Paste source text').inputValue(), paste);
    assert.equal(await review().locator('li[data-research-id]').count(), 24);
    assert.match(await review().locator('[data-research-outcome]').textContent(), /Added 1 passage\..*Your pasted text has been kept\./);
    await layout('partial-collection-320');
    results.push('23 existing passages plus three pasted paragraphs adds only one, names the collection limit and retains the whole draft at 320px');
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length, storageWrites.length]), [1, 0, 0, 0]);
    results.push('Typing and adding private text does not create web queries, page reads, model calls or storage writes');

    await reset();
    await page.evaluate(() => {
      WebSearchProvider._fetchSerper = async query => { auditQueries.push(query); return [
        { title: 'Shared cloud source', url: 'https://science.example.edu/shared', snippet: 'Cloud formation starts in rising air as cooling allows vapor to collect.' },
        { title: 'Shared cloud source', url: 'https://science.example.edu/shared', snippet: 'Cloud cover can reflect incoming sunlight and influence temperature measurements.' },
        { title: 'Shared cloud source', url: 'https://science.example.edu/shared', snippet: 'Cloud classifications describe altitude ranges alongside characteristic shapes.' }
      ]; };
    });
    await enableReview();
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click(); await outcome('Added 3 passages.');
    await draft('https://science.example.edu/shared'); await add(); await outcome('Source limit reached (4 passages per source).');
    assert.equal(await input('Paste source text').inputValue(), paste);
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.match(await review().locator('[data-research-footer] [data-research-summary]').textContent(), /1 source, 4 passages/);
    await layout('partial-source-390');
    results.push('A source with three snippets accepts one of three pasted paragraphs and names the per-source limit without erasing the draft');
    await review().getByRole('button', { name: 'Remove source from research: Shared cloud source', exact: true }).click();
    await add(); await outcome('Passages from removed sources: 3.');
    assert.equal(await review().locator('li[data-research-id]').count(), 0);
    assert.equal(await input('Paste source text').inputValue(), paste);
    assert.match(await review().locator('[data-research-outcome]').textContent(), /No new passages added\..*Your pasted text has been kept\./);
    await layout('removed-source-390');
    results.push('Pasting a removed source reports the removed-source reason, keeps its draft and does not silently restore it');

    await reset(390, 844);
    await page.evaluate(() => {
      WebSearchProvider._fetchSerper = async query => { auditQueries.push(query); return [{ title: 'Cloud link only', url: 'https://science.example.edu/link-only', snippet: '' }]; };
    });
    await enableReview();
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click(); await outcome('1 source link needs readable text.');
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.doesNotMatch(await review().locator('[data-research-outcome]').textContent(), /Added 1 passage/);
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isDisabled(), true);
    await layout('link-only-390');
    await review().getByRole('button', { name: 'Read page', exact: true }).click(); await outcome('Added 2 passages.');
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length]), [1, 1, 0]);
    results.push('Link-only results are not reported as readable passages and keep Generate disabled until page text is read');

    await reset(320, 640);
    await page.evaluate(() => {
      WebSearchProvider._fetchSerper = async query => { auditQueries.push(query); return [{ title: 'Initial cloud snippet', url: 'https://science.example.edu/initial', snippet: 'Cloud research investigates condensation in the atmosphere with instruments and observations.' }]; };
      LumenStudy.firstPartyFetchWebSource = async (ctx, url) => {
        auditReads.push(url);
        if (url.includes('unavailable')) throw new Error('The selected page could not be read.');
        return { url, title: 'Fetched cloud passage', text: 'Cloud studies record the changing shapes of condensed atmospheric water, using repeated observations and measurements.' };
      };
    });
    await enableReview(['https://science.example.edu/readable', 'https://science.example.edu/unavailable']);
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await review().getByRole('alert').filter({ hasText: 'The selected page could not be read.' }).waitFor();
    await outcome('Added 2 passages.');
    assert.equal(await review().locator('li[data-research-id]').count(), 2);
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isEnabled(), true);
    await layout('partial-url-error-320');
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length]), [1, 2, 0]);
    results.push('A later unreadable configured URL preserves and reports earlier successful additions alongside the error at 320px');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) await page.screenshot({ path: path.join(__dirname, 'failure.png') });
    throw error;
  } finally {
    const hashes = Object.fromEntries(['content_engine_module.js', 'view_misc_panels_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, hashes, success: !failure, passed: results.length, results, observations, errors, unexpected, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
