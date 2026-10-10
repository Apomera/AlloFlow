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
  const choose = () => review().locator('[data-transcript-chooser]');
  const input = name => review().getByRole('textbox', { name, exact: true, includeHidden: true });
  const keep = number => choose().getByRole('checkbox', { name: new RegExp('^Keep excerpt ' + number + ' ') });
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
    if (!await details.evaluate(node => node.open)) await review().getByText('Add a link or your own text', { exact: true }).click();
    await input('Source URL (optional for pasted text)').fill(url);
  }
  async function readVideo() {
    await setUrl('https://youtu.be/AbCdEfGhI_1?t=50');
    await review().getByRole('button', { name: 'Read video', exact: true }).click();
    await choose().waitFor({ state: 'attached' });
    await choose().locator('summary').click();
  }
  async function filter(value) { await choose().getByRole('searchbox', { name: 'Find in transcript', exact: true }).fill(value); }
  async function clearChoice() {
    await filter('');
    const previous = choose().getByRole('button', { name: 'Previous excerpts', exact: true });
    while (await previous.isEnabled()) await previous.click();
    for (let index = 0; index < 3; index++) {
      for (const checkbox of await choose().getByRole('checkbox').all()) if (await checkbox.isChecked()) await checkbox.uncheck();
      const next = choose().getByRole('button', { name: 'Next excerpts', exact: true });
      if (await next.isEnabled()) await next.click();
    }
    await filter('');
  }
  async function layout(name) {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const action = node.querySelector('[aria-label="Generate from included passages"]')?.getBoundingClientRect();
      const overflowing = [...node.querySelectorAll('[data-transcript-candidate] p, [data-transcript-chooser] button, [data-transcript-chooser] input')].filter(item => item.getBoundingClientRect().width > 0 && item.scrollWidth > item.clientWidth + 2).length;
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1,
        visible: !action || action.top >= 0 && action.bottom <= innerHeight, scrollHeight: scroll.height, overflowing };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.visible && geometry.scrollHeight > 30 && geometry.overflowing === 0, JSON.stringify(geometry));
    observations.push({ name, geometry });
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  try {
    for (const mode of ['provider', 'managed', 'disabled', 'old-module']) {
      await reset(); await enableReview();
      await page.evaluate(mode => {
        if (mode === 'provider') auditState.setAi({ backend: 'ollama' });
        if (mode === 'managed') window.ALLOFLOW_MANAGED_AI_POLICY = {};
        if (mode === 'disabled') window.__alloStudentAiDisabled = true;
        if (mode === 'old-module') window.callGemini._alloflowVideoInput = false;
      }, mode);
      await setUrl(canonical);
      assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).isDisabled(), true);
      assert.match(await review().textContent(), { provider: /requires Gemini/, managed: /does not allow video/, disabled: /disabled in this session/, 'old-module': /reader is not ready/ }[mode]);
      assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditQueries.length, auditReads.length]), [0, 0, 0]);
      if (mode === 'provider') { assert.equal(await page.evaluate(() => auditState.ai.backend), 'ollama'); await layout('video-preflight-390'); }
      results.push(mode + ' preflight disables video reading and explains recovery before any request');
    }

    await reset(320, 640); await enableReview(); await setUrl(canonical);
    await page.evaluate(() => { auditMode = 'pending'; });
    await review().getByRole('button', { name: 'Read video', exact: true }).click();
    await review().getByText('Transcribing video with Gemini...', { exact: true }).waitFor();
    await page.waitForFunction(() => auditCalls.length === 1);
    await review().getByRole('button', { name: 'Cancel research', exact: true }).click();
    await page.waitForFunction(() => auditAborts === 1);
    assert.equal(await choose().count(), 0); assert.equal(await review().locator('li[data-research-id]').count(), 0);
    assert.doesNotMatch(await review().textContent(), /Transcribing video/);
    results.push('Video progress is explicit and cancellation aborts transport without retaining late evidence');

    await reset(); await enableReview([canonical, 'https://science.example.edu/clouds']);
    await page.evaluate(() => {
      const read = LumenStudy.firstPartyFetchWebSource;
      LumenStudy.firstPartyFetchWebSource = async (...args) => {
        window.auditPageStarted = true;
        await new Promise(resolve => { window.auditPageRelease = resolve; });
        return read(...args);
      };
    });
    await review().getByRole('button', { name: 'Find sources to review', exact: true }).click();
    await page.waitForFunction(() => window.auditPageStarted === true);
    assert.match(await review().textContent(), /Collecting passages for review/);
    assert.doesNotMatch(await review().textContent(), /Selecting transcript excerpts|Transcribing video/);
    await page.evaluate(() => auditPageRelease());
    await review().locator('[data-research-outcome]').filter({ hasText: 'Added' }).waitFor();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length]), [1, 1]);
    assert.equal(await choose().count(), 1);
    results.push('Mixed configured video and webpage research switches back to ordinary collection progress while the webpage loads');

    await reset(320, 640); await enableReview(); await readVideo();
    assert.equal(await choose().locator('[data-transcript-candidate]').count(), 8);
    assert.match(await choose().textContent(), /Page 1 of 3/);
    await choose().getByRole('button', { name: 'Next excerpts', exact: true }).click();
    assert.match(await choose().textContent(), /Page 2 of 3/);
    await clearChoice();
    assert.equal(await choose().getByRole('button', { name: 'Apply excerpts', exact: true }).isDisabled(), true);
    for (const number of [2, 10, 18]) { await filter('Section ' + String(number).padStart(2, '0') + ':'); await keep(number).check(); }
    assert.match(await choose().textContent(), /3 of 4 excerpt slots selected/);
    await layout('transcript-chooser-320');
    assert.equal(await page.evaluate(() => auditCalls.length), 1);
    await choose().getByRole('button', { name: 'Apply excerpts', exact: true }).click();
    await review().locator('[data-research-outcome]').filter({ hasText: 'Transcript excerpt selection updated.' }).waitFor();
    assert.equal(await review().locator('[aria-label^="Use source for writing"]').evaluate(node => node === document.activeElement), true);
    await review().getByRole('button', { name: 'Generate from included passages', exact: true }).click();
    const writer = await page.evaluate(() => auditOptions.findLast(options => options.reviewedResearch));
    assert.equal(writer.reviewedResearch.items.length, 3);
    assert.deepEqual(writer.reviewedResearch.items.map(item => /Section (\d+)/.exec(item.passage)[1]), ['02', '10', '18']);
    assert.equal(writer.transcripts, undefined); assert.equal(writer.reviewedResearch.transcript, undefined);
    assert.doesNotMatch(JSON.stringify(writer), /Section 01:/);
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditQueries.length, auditReads.length, storageWrites.length]), [1, 0, 0, 0]);
    results.push('Paged and filtered choices apply atomically, retain hidden selections, restore focus and send only chosen excerpts to writing at 320px');

    await review().getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    await choose().locator('summary').click();
    assert.match(await choose().textContent(), /3 of 4 excerpt slots selected/); assert.equal(await page.evaluate(() => auditCalls.length), 1);
    await review().getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => auditState.setSourceTopic('Different topic'));
    await page.evaluate(() => auditState.setSourceTopic('How clouds form'));
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    assert.equal(await choose().count(), 0);
    assert.equal(await review().getByRole('button', { name: 'Load transcript for review', exact: true }).count(), 1);
    results.push('Applied excerpts survive close and reopen; changing topics clears the full transcript without another provider request');

    await reset(1280, 900); await enableReview(); await readVideo();
    await review().locator('[aria-label^="Use source for writing"]').uncheck();
    await clearChoice(); await filter('Section 18:'); await keep(18).check();
    await choose().getByRole('button', { name: 'Apply excerpts', exact: true }).click();
    assert.match(await choose().textContent(), /remains excluded from writing/);
    assert.equal(await review().getByRole('button', { name: 'Generate from included passages', exact: true }).isDisabled(), true);
    await filter(''); await choose().locator('summary').scrollIntoViewIfNeeded(); await layout('transcript-excluded-desktop');
    assert.equal(await page.evaluate(() => auditCalls.length), 1);
    results.push('Changing transcript membership preserves an excluded source and never silently enables writing');

    await reset(); await enableReview(); await setUrl('https://science.example.edu/clouds');
    await review().getByRole('button', { name: 'Read relevant webpage passages', exact: true }).click();
    await review().locator('[data-research-outcome]').filter({ hasText: 'Added' }).waitFor();
    assert.deepEqual(await page.evaluate(() => [auditCalls.length, auditReads.length, auditQueries.length]), [0, 1, 0]);
    assert.equal(await choose().count(), 0); assert.match(await review().textContent(), /Page excerpt/);
    results.push('Ordinary webpage research retains its existing reader and does not acquire video controls');
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
