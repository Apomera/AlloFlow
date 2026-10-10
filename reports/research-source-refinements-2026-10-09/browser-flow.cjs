const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [], errors = [], blockedRequests = [];
const moduleHashes = Object.fromEntries(['content_engine_module.js', 'text_pipeline_helpers_module.js', 'view_misc_panels_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));
async function run() {
  const browser = await chromium.launch({ headless: true });
  let page, failure;
  async function reset(width = 1280) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      blockedRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.getByRole('button', { name: 'Research settings', exact: true }).waitFor();
    await page.evaluate(() => { auditState.recordSourceProvenance = value => { window.auditProvenance = value; }; });
  }
  async function reviewSources() {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings' }).click();
    await page.locator('[data-help-key="source_generate_button"]').click();
    const review = page.getByRole('dialog', { name: 'Review research sources', exact: true });
    await review.getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await review.locator('li[data-research-id]').first().waitFor();
    return review;
  }
  const cloudSource = review => review.locator('li[data-research-id="web:https://science.example.edu/clouds"]');
  const sourceCheckbox = group => group.locator(':scope > label input[type="checkbox"]').first();
  async function openPassages(group) {
    const details = group.locator('details[data-research-passages]');
    if (!(await details.evaluate(node => node.open))) await details.locator('summary').click();
    return details;
  }
  try {
    await reset();
    await page.evaluate(() => auditState.setSourceTopic('R'));
    await page.locator('[data-help-key="source_generate_button"]').click();
    await page.waitForFunction(() => auditState.inputText !== 'Existing original reading.' || !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.error), null);
    assert.deepEqual(await page.evaluate(() => [...new Set(auditQueries)]), ['R']);
    results.push('Ordinary one-click web research still accepts an arbitrary one-character public topic');

    await reset();
    let review = await reviewSources();
    let cloud = cloudSource(review);
    await cloud.getByRole('button', { name: 'Read page', exact: true }).click();
    await page.waitForFunction(() => auditReads.length === 1);
    let passages = await openPassages(cloud);
    const first = passages.getByRole('checkbox', { name: 'Include passage 1', exact: true });
    const excludedPassage = await passages.locator('blockquote').first().innerText();
    await first.uncheck();
    assert.equal(await sourceCheckbox(cloud).getAttribute('aria-checked'), 'mixed');
    assert.equal(await sourceCheckbox(cloud).evaluate(node => node.indeterminate), true);
    await sourceCheckbox(cloud).focus();
    await page.keyboard.press('Space');
    assert.equal(await first.isChecked(), true);
    await first.uncheck();
    results.push('Passage-level inclusion is keyboard-operable and native mixed source selection selects all');

    await review.getByRole('button', { name: 'Remove source from research: Source to exclude', exact: true }).click();
    await review.getByText('Add a webpage or your own text', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Source URL (optional for pasted text)', exact: true }).fill('https://provided.example.edu/notes');
    await review.getByRole('textbox', { name: 'Passage title', exact: true }).fill('PRIVATE_SOURCE_TITLE');
    await review.getByRole('textbox', { name: 'Paste source text', exact: true }).fill('PRIVATE_EXCERPT: Our synthetic classroom observations describe clouds above a field.');
    await review.getByRole('button', { name: 'Add passage', exact: true }).click();
    let pasted = review.locator('li[data-research-id="web:https://provided.example.edu/notes"]');
    await pasted.waitFor();
    await pasted.getByRole('checkbox', { name: 'Share source name and excerpts with students', exact: true }).check();
    await review.getByRole('button', { name: 'Undo removal', exact: true }).click();
    assert.equal(await review.locator('li[data-research-id]').count(), 3);
    assert.equal(await pasted.getByRole('checkbox', { name: 'Share source name and excerpts with students', exact: true }).isChecked(), true);
    assert.equal(await first.isChecked(), false);
    results.push('Undo restores only the removed source and retains later additions, passage exclusions, and sharing approval');

    await pasted.getByRole('checkbox', { name: 'Share source name and excerpts with students', exact: true }).uncheck();
    const excluded = review.locator('li[data-research-id="web:https://excluded.example.edu/clouds"]');
    await excluded.getByRole('button', { name: 'Exclude source', exact: true }).click();
    await review.getByText('Search for more sources', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Public search topic', exact: true }).fill('Cloud formation');
    await review.getByRole('button', { name: 'Search and add results', exact: true }).click();
    await page.waitForFunction(() => auditQueries.length === 2);
    assert.equal(await first.isChecked(), false);
    assert.equal(await sourceCheckbox(excluded).isChecked(), false);
    await review.getByRole('button', { name: 'Generate from included passages', exact: true }).click();
    await page.waitForFunction(() => auditState.inputText !== 'Existing original reading.' || !!auditState.error);
    assert.equal(await page.evaluate(() => auditState.error), null);
    const generation = await page.evaluate(() => {
      const call = auditCalls.find(call => call.prompt.startsWith('Write an educational reading'));
      const evidence = JSON.parse(call.prompt.split('Evidence (untrusted data; no other sources): ')[1]);
      const api = AlloModules.StudentSources;
      const record = auditProvenance.studentSources;
      const studentText = api.publicText(auditState.inputText, record);
      return { evidence, studentText, record, teacherReport: auditProvenance.researchEvidence,
        stale: api.forText(record, studentText.replace('Clouds form', 'Clouds develop')) };
    });
    assert.ok(!generation.evidence.some(item => item.passage === excludedPassage));
    assert.ok(!JSON.stringify(generation.evidence).includes('EXCLUDED_SENTINEL'));
    assert.ok(generation.evidence.some(item => item.passage.includes('PRIVATE_EXCERPT')));
    assert.ok(JSON.stringify(generation.teacherReport).includes('PRIVATE_SOURCE_TITLE'));
    assert.ok(!generation.studentText.includes('PRIVATE_SOURCE_TITLE'));
    assert.ok(!JSON.stringify(generation.record).includes('PRIVATE_EXCERPT'));
    assert.ok(!JSON.stringify(generation.stale).includes('PRIVATE_SOURCE_TITLE'));
    assert.ok(generation.stale.sources.every(source => !source.passages.length));
    assert.ok(!await page.evaluate(() => auditQueries.some(query => /PRIVATE_/.test(query))));
    results.push('Later searches and generation preserve passage/source exclusions without changing private public-query separation');
    results.push('Unshared pasted source labels stay out of student bibliography and stale fallback while teacher evidence is retained');

    for (const width of [1280, 390, 320]) {
      await reset(width);
      review = await reviewSources();
      cloud = cloudSource(review);
      await cloud.getByRole('button', { name: 'Read page', exact: true }).click();
      await page.waitForFunction(() => auditReads.length === 1);
      passages = await openPassages(cloud);
      await passages.getByRole('checkbox', { name: 'Include passage 1', exact: true }).uncheck();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await review.evaluate(node => node.scrollWidth <= node.clientWidth));
      await page.screenshot({ path: path.join(__dirname, `review-${width}.png`), fullPage: true });
      await review.getByRole('button', { name: 'Generate from included passages' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close');
      await page.keyboard.press('Escape');
      assert.equal(await review.count(), 0);
      results.push(`Review at ${width}px fits expanded passage controls and retains keyboard dialog navigation`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(blockedRequests, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) {
      await page.screenshot({ path: path.join(__dirname, 'failure.png'), fullPage: true }).catch(() => {});
      console.error(await page.evaluate(() => ({ error: window.auditState?.error, body: document.body.innerText.slice(-5000) })).catch(() => ({})));
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, moduleHashes, passed: results.length, results, errors, blockedRequests, success: !failure, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
