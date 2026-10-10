const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const results = [], errors = [], unexpected = [], observations = [];
const videoUrl = 'https://youtu.be/AbCdEfGhI_1?si=tracking&t=90';
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
async function run() {
  const browser = await chromium.launch({ headless: true });
  let page, failure;
  async function reset(width = 390, height = 844) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(15000);
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
  const outcome = () => review().locator('[data-research-outcome]').filter({ hasText: 'Added' }).waitFor();
  async function enableReview(urls) {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    if (urls) await settings.getByRole('textbox', { name: 'Webpages to include', exact: true }).fill(urls.join('\n'));
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    await review().waitFor();
  }
  async function setUrl(url) {
    const details = input('Source URL (optional for pasted text)').locator('xpath=ancestor::details[1]');
    if (!await details.getAttribute('open')) {
      if (!await details.evaluate(node => node.open)) await review().getByText('Add a link or your own text', { exact: true }).click();
    }
    await input('Source URL (optional for pasted text)').fill(url);
  }
  async function readVideo() { await review().getByRole('button', { name: 'Read video', exact: true }).click(); }
  async function addPage() {
    await setUrl('https://science.example.edu/clouds');
    await review().getByRole('button', { name: 'Read relevant webpage passages', exact: true }).click();
    await outcome();
  }
  async function layout(name) {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const action = node.querySelector('[aria-label="Generate from included passages"]').getBoundingClientRect();
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1, visible: action.top >= 0 && action.bottom <= innerHeight, scrollHeight: scroll.height };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.visible && geometry.scrollHeight > 30, JSON.stringify(geometry));
    observations.push({ name, geometry });
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  async function transportContract(expected = 1) {
    const calls = await page.evaluate(() => auditCalls);
    assert.equal(calls.length, expected);
    for (const call of calls) {
      assert.match(call.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\//);
      assert.equal(call.payload.contents[0].parts[1].fileData.fileUri, canonical);
      assert.match(call.payload.contents[0].parts[0].text, /SECURITY BOUNDARY:/);
      assert.doesNotMatch(JSON.stringify(call.payload), /PRIVATE_|How clouds form|tracking/);
      assert.equal(call.payload.tools, undefined);
      assert.equal(call.payload.generationConfig.responseMimeType, 'application/json');
    }
  }
  try {
    await reset(320, 640); await enableReview(); await setUrl(videoUrl);
    await input('Passage title').fill('PRIVATE_DRAFT_TITLE');
    await input('Paste source text').fill('PRIVATE_DRAFT_CONTENT that must not become a search query or part of a video transcription request.');
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length, storageWrites.length]), [0, 0, 0, 0]);
    await readVideo(); await outcome(); await transportContract();
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.match(await review().textContent(), /AI-generated transcript, not verified captions/);
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isEnabled(), true);
    assert.equal(await input('Paste source text').inputValue(), 'PRIVATE_DRAFT_CONTENT that must not become a search query or part of a video transcription request.');
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, storageWrites.length]), [0, 0, 0]);
    await review().locator('[data-research-scroll]').evaluate(node => { node.scrollTop = 0; });
    await layout('video-transcript-320');
    results.push('An explicit YouTube link uses canonical Gemini fileData with no search, private-context payload, HTML fallback or draft loss at 320px');

    await reset(); await enableReview();
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await review().locator('[data-research-outcome]').filter({ hasText: 'source link needs readable text' }).waitFor();
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isDisabled(), true);
    await readVideo(); await outcome(); await transportContract();
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).count(), 0);
    assert.doesNotMatch(await review().textContent(), /video has not been transcribed/);
    assert.deepEqual(await page.evaluate(() => [auditQueries, auditReads]), [['How clouds form'], []]);
    await layout('discovered-video-390');
    results.push('A discovered link-only YouTube source becomes one grouped AI-transcript source and enables writing at 390px');

    await reset(1280, 900); await enableReview(); await addPage();
    await page.evaluate(() => { auditMode = 'unavailable'; });
    await setUrl(videoUrl); await readVideo();
    await review().getByRole('alert').filter({ hasText: 'could not access this video' }).waitFor();
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.match(await review().textContent(), /Cloud webpage/);
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length, auditCalls.length]), [0, 1, 1]);
    assert.equal(await input('Source URL (optional for pasted text)').inputValue(), videoUrl);
    await layout('video-unavailable-desktop');
    results.push('Unavailable-video responses preserve previous evidence and the URL without falling back to HTML');

    await reset(); await enableReview(); await addPage();
    await page.evaluate(() => auditState.setAi({ backend: 'ollama' }));
    await setUrl(videoUrl); await readVideo();
    await review().getByRole('alert').filter({ hasText: 'requires a Gemini connection' }).waitFor();
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, auditState.ai.backend]), [0, 1, 'ollama']);
    results.push('A non-Gemini provider receives an actionable error, retains earlier evidence and is never silently switched');

    await reset(); await enableReview(); await addPage();
    await page.evaluate(() => { auditMode = 'pending'; });
    await setUrl(videoUrl); await readVideo();
    await page.waitForFunction(() => auditCalls.length === 1);
    await review().getByRole('button', { name: 'Cancel research', exact: true }).click();
    await page.waitForFunction(() => auditAborts === 1);
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.doesNotMatch(await review().textContent(), /Cloud formation video|AI video transcript/);
    assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => [auditReads.length, auditQueries.length]), [1, 0]);
    results.push('Cancellation aborts the actual Gemini transport signal and ignores late transcript evidence');

    await reset(); await enableReview(); await addPage();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, auditQueries.length]), [0, 1, 0]);
    assert.match(await review().textContent(), /Page excerpt/);
    assert.doesNotMatch(await review().textContent(), /AI-generated transcript/);
    results.push('Ordinary webpages retain the text-reader path and page-excerpt evidence type');

    await reset(1280, 900); await enableReview([videoUrl]);
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click(); await outcome();
    await review().getByText('AI-generated transcript, not verified captions. It may contain transcription errors.', { exact: true }).first().waitFor();
    await transportContract();
    assert.deepEqual(await page.evaluate(() => [auditQueries.length, auditReads.length]), [1, 0]);
    assert.equal(await review().locator('li[data-research-id]').count(), 1);
    assert.doesNotMatch(await review().locator('[data-research-outcome]').textContent(), /needs readable text/);
    await layout('configured-video-desktop');
    results.push('Configured YouTube URLs participate in preparation and merge with a discovered alias without duplicate sources');

    await reset(); await enableReview(); await setUrl('https://www.youtube.com/playlist?list=AbCdEfGhI_1');
    await review().getByRole('button', { name: 'Read relevant webpage passages', exact: true }).click();
    await review().getByRole('alert').filter({ hasText: 'not a channel or playlist' }).waitFor();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, auditQueries.length]), [0, 0, 0]);
    results.push('YouTube playlists are rejected with a specific message and never treated as page or video evidence');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) await page.screenshot({ path: path.join(__dirname, 'failure.png') });
    throw error;
  } finally {
    const hashes = Object.fromEntries(['content_engine_module.js', 'gemini_api_module.js', 'view_misc_panels_module.js', 'text_pipeline_helpers_module.js', 'view_simplified_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, hashes, success: !failure, passed: results.length, results, observations, errors, unexpected, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
