const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const results = [], errors = [], unexpected = [], observations = [];
async function run() {
  const browser = await chromium.launch({ headless: true });
  let page, failure;
  async function reset(width = 390, height = 844) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(20000);
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
  const choosers = () => review().locator('[data-transcript-chooser]');
  async function enableReview() {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    await review().waitFor();
  }
  async function setUrl(url) {
    const details = input('Source URL (optional for pasted text)').locator('xpath=ancestor::details[1]');
    if (!await details.evaluate(node => node.open)) await review().getByText('Add a link or your own text', { exact: true }).click();
    await input('Source URL (optional for pasted text)').fill(url);
  }
  async function setClip(start = '0:40', end = '1:20') {
    await setUrl(canonical);
    await review().getByRole('radio', { name: 'Clip', exact: true }).check();
    await input('Start time').fill(start); await input('End time').fill(end);
  }
  async function readClip(start = '0:40', end = '1:20') {
    const previous = await page.evaluate(() => auditCalls.length);
    await setClip(start, end); await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    await page.waitForFunction(count => auditCalls.length === count + 1, previous);
    await review().getByRole('button', { name: 'Cancel research', exact: true }).waitFor({ state: 'hidden' });
    await choosers().first().waitFor({ state: 'attached' });
  }
  async function layout(name) {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const action = node.querySelector('[aria-label="Generate from included passages"]')?.getBoundingClientRect();
      const overflowing = [...node.querySelectorAll('fieldset label, fieldset button, [data-transcript-chooser] button')].filter(item => item.getBoundingClientRect().width > 0 && item.scrollWidth > item.clientWidth + 2).length;
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1,
        visible: !action || action.top >= 0 && action.bottom <= innerHeight, scrollHeight: scroll.height, overflowing };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.visible && geometry.scrollHeight > 30 && geometry.overflowing === 0, JSON.stringify(geometry));
    observations.push({ name, geometry });
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  try {
    await reset(320, 640); await enableReview(); await setUrl('https://youtu.be/AbCdEfGhI_1?t=40');
    assert.equal(await review().getByRole('radio', { name: 'Whole video', exact: true }).isChecked(), true);
    assert.match(await review().textContent(), /Link starts at 0:40. Whole video selected./);
    await review().getByRole('button', { name: 'Read video', exact: true }).click();
    await choosers().first().waitFor({ state: 'attached' });
    const whole = await page.evaluate(() => auditCalls[0].payload.contents[0].parts[1]);
    assert.deepEqual(whole, { fileData: { fileUri: canonical } });
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length]), [0, 0]);
    results.push('Timestamped links default to the unchanged whole-video payload with no search or HTML request');

    await reset(320, 640); await enableReview(); await setUrl('https://youtu.be/AbCdEfGhI_1?t=40');
    await review().getByRole('button', { name: 'Use linked start time', exact: true }).click();
    assert.equal(await input('Start time').inputValue(), '0:40');
    assert.equal(await input('Start time').evaluate(node => node === document.activeElement), true);
    assert.equal(await review().getByRole('button', { name: 'Read clip', exact: true }).isDisabled(), true);
    await input('End time').fill('0:30');
    assert.equal(await review().getByRole('button', { name: 'Read clip', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => auditCalls.length), 0);
    await input('End time').fill('1:20'); await layout('clip-controls-320');
    await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    await choosers().first().waitFor({ state: 'attached' });
    assert.deepEqual(await page.evaluate(() => auditCalls[0].payload.contents[0].parts[1]), {
      fileData: { fileUri: canonical, mimeType: 'video/*' }, videoMetadata: { startOffset: '40s', endOffset: '80s' }
    });
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.match(await review().textContent(), /Requested clip 0:40 to 1:20/);
    assert.doesNotMatch(await page.evaluate(() => JSON.stringify(auditCalls)), /PRIVATE_|How clouds form/);
    results.push('Explicit linked-start opt-in requires a valid end time and sends only bounded media plus the private-context-free task at 320px');

    await reset(390, 844); await enableReview();
    await page.evaluate(() => { window.callGemini._alloflowVideoClipInput = false; });
    await setUrl(canonical);
    assert.equal(await review().getByRole('radio', { name: 'Clip', exact: true }).isDisabled(), true);
    assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).isEnabled(), true);
    assert.match(await review().textContent(), /video clip reader is not ready/); await layout('clip-preflight-390');
    assert.equal(await page.evaluate(() => auditCalls.length), 0);
    results.push('Older video transport explains unavailable clip support while keeping explicit whole-video reading available');

    await reset(); await enableReview(); await page.evaluate(() => auditState.setAi({ backend: 'ollama' })); await setUrl(canonical);
    assert.equal(await review().getByRole('radio', { name: 'Clip', exact: true }).isDisabled(), true);
    assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => auditState.ai.backend), 'ollama'); assert.equal(await page.evaluate(() => auditCalls.length), 0);
    results.push('Non-Gemini preflight disables both video scopes without switching providers');

    await reset(); await enableReview(); await setClip(); await page.evaluate(() => { auditMode = 'unavailable'; });
    await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    await page.waitForFunction(() => auditCalls.length === 1);
    await review().getByRole('button', { name: 'Cancel research', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await review().getByRole('radio', { name: 'Clip', exact: true }).isChecked(), true);
    assert.equal(await page.evaluate(() => auditCalls.length), 1); assert.equal(await choosers().count(), 0);
    await page.evaluate(() => { auditMode = 'ok'; });
    await review().getByRole('radio', { name: 'Whole video', exact: true }).check();
    await review().getByRole('button', { name: 'Read video', exact: true }).click();
    await choosers().first().waitFor({ state: 'attached' });
    assert.equal(await page.evaluate(() => auditCalls.length), 2);
    assert.deepEqual(await page.evaluate(() => auditCalls[1].payload.contents[0].parts[1]), { fileData: { fileUri: canonical } });
    results.push('A failed clip never automatically expands to whole video; a separate whole-video action is required');

    await reset(1280, 900); await enableReview(); await readClip(); await readClip('2:00', '3:00');
    assert.equal(await choosers().count(), 2); assert.equal(await review().locator('li[data-research-id]').count(), 1);
    const first = choosers().filter({ hasText: 'Requested clip 0:40 to 1:20' });
    const second = choosers().filter({ hasText: 'Requested clip 2:00 to 3:00' });
    await first.locator('summary').click();
    assert.match(await first.textContent(), /3 of 3 excerpt slots selected/);
    assert.match(await second.textContent(), /1 of 1 excerpt slots selected/);
    const selectedBoxes = await first.locator('input[type="checkbox"]:checked').all();
    assert.equal(selectedBoxes.length, 3); await selectedBoxes[0].uncheck();
    await first.getByRole('searchbox', { name: 'Find in transcript', exact: true }).fill('Section 18:');
    await first.getByRole('checkbox').check();
    await first.getByRole('button', { name: 'Apply excerpts', exact: true }).click();
    await review().getByRole('button', { name: 'Generate from included passages', exact: true }).click();
    const writer = await page.evaluate(() => auditOptions.findLast(options => options.reviewedResearch));
    assert.equal(writer.reviewedResearch.items.length, 4);
    assert.equal(writer.reviewedResearch.items.filter(item => item.videoClip?.startSeconds === 120).length, 1);
    assert.equal(writer.reviewedResearch.items.filter(item => item.videoClip?.startSeconds === 40).length, 3);
    assert.equal(writer.transcripts, undefined); assert.equal(await page.evaluate(() => auditCalls.length), 2);
    await first.locator('summary').scrollIntoViewIfNeeded(); await layout('two-clip-review-desktop');
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, storageWrites.length]), [0, 0, 0]);
    results.push('Two clips remain one source with separate choosers; replacing excerpts preserves the other clip and the four-passage source limit');

    await review().getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    assert.equal(await input('Start time').inputValue(), '2:00'); assert.equal(await input('End time').inputValue(), '3:00');
    assert.equal(await choosers().count(), 2); assert.equal(await page.evaluate(() => auditCalls.length), 2);
    await review().getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => auditState.setSourceTopic('Different topic'));
    await page.evaluate(() => auditState.setSourceTopic('How clouds form'));
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    assert.equal(await choosers().count(), 0);
    assert.equal(await input('Source URL (optional for pasted text)').inputValue(), '');
    await review().getByRole('button', { name: 'Load clip 0:40 to 1:20', exact: true }).click();
    await choosers().first().waitFor({ state: 'attached' });
    assert.equal(await page.evaluate(() => auditCalls.length), 3);
    assert.deepEqual(await page.evaluate(() => auditCalls[2].payload.contents[0].parts[1].videoMetadata), { startOffset: '40s', endOffset: '80s' });
    results.push('Same-topic reopen retains clip drafts and cached transcripts; topic changes clear them, and missing clips reload their saved bounds');

    await reset(); await enableReview(); await setUrl('https://science.example.edu/clouds');
    assert.equal(await review().getByRole('radio', { name: 'Clip', exact: true }).count(), 0);
    await review().getByRole('button', { name: 'Read relevant webpage passages', exact: true }).click();
    await review().locator('[data-research-outcome]').filter({ hasText: 'Added' }).waitFor();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, auditQueries.length]), [0, 1, 0]);
    results.push('Ordinary webpage research remains unchanged and has no clip controls');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) await page.screenshot({ path: path.join(__dirname, 'failure.png') });
    throw error;
  } finally {
    const hashes = Object.fromEntries(['content_engine_module.js', 'gemini_api_module.js', 'view_misc_panels_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, hashes, success: !failure, passed: results.length, results, observations, errors, unexpected, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
