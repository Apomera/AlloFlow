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
  async function reset(width = 1280, height = 900, manySources = false) {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      blockedRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.getByRole('button', { name: 'Research settings', exact: true }).waitFor();
    await page.evaluate(many => {
      auditState.recordSourceProvenance = value => { window.auditProvenance = value; };
      if (many) WebSearchProvider._fetchSerper = async query => {
        auditQueries.push(query);
        return Array.from({ length: 10 }, (_, index) => ({
          title: index === 0 ? 'Cloud formation reference' : 'Cloud observations and atmospheric conditions ' + (index + 1),
          url: index === 0 ? 'https://science.example.edu/clouds' : 'https://science.example.edu/clouds-' + index,
          snippet: 'Clouds form as water vapor condenses in cooling air. Observations of humidity and temperature help explain changing conditions.'
        }));
      };
    }, manySources);
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
  const sourceCheckbox = group => group.getByRole('checkbox', { name: /^Use source for writing:/ });
  async function openPassages(group) {
    const details = group.locator('details[data-research-passages]');
    if (!(await details.evaluate(node => node.open))) await details.locator('summary').click();
    return details;
  }
  async function footerGeometry(review) {
    return review.evaluate(node => {
      const box = element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
      const scroll = node.querySelector('[data-research-scroll]');
      const footer = node.querySelector('[data-research-footer]');
      return { dialog: box(node), scroll: box(scroll), footer: box(footer), viewport: innerHeight,
        scrolled: scroll.scrollTop, overflowing: scroll.scrollHeight > scroll.clientHeight,
        footerInScroller: scroll.contains(footer), widthFits: node.scrollWidth <= node.clientWidth };
    });
  }
  function assertFooter(geometry) {
    assert.equal(geometry.footerInScroller, false);
    assert.ok(geometry.footer.top >= geometry.scroll.bottom - 1, JSON.stringify(geometry));
    assert.ok(geometry.footer.bottom <= geometry.viewport + 1, JSON.stringify(geometry));
    assert.ok(geometry.footer.top >= 0 && geometry.scroll.height > 30, JSON.stringify(geometry));
    assert.equal(geometry.widthFits, true);
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
    assert.ok((await review.locator('[data-research-footer]').innerText()).includes('Included for writing'));
    assert.ok((await review.locator('[data-research-footer]').innerText()).includes('2 sources, 2 passages'));
    assert.equal(await review.getByRole('button', { name: /^(Keep|Exclude) source$/ }).count(), 0);
    await cloud.getByRole('button', { name: 'Read page', exact: true }).click();
    await page.waitForFunction(() => auditReads.length === 1);
    let passages = await openPassages(cloud);
    const first = passages.getByRole('checkbox', { name: 'Include passage 1', exact: true });
    const excludedPassage = await passages.locator('blockquote').first().innerText();
    const total = await passages.getByRole('checkbox').count();
    await first.uncheck();
    assert.equal(await sourceCheckbox(cloud).getAttribute('aria-checked'), 'mixed');
    assert.equal(await sourceCheckbox(cloud).evaluate(node => node.indeterminate), true);
    assert.ok((await cloud.innerText()).includes(`${total - 1} of ${total} passages included`));
    assert.ok((await review.locator('[data-research-footer]').innerText()).includes(`2 sources, ${total} passages`));
    await sourceCheckbox(cloud).focus();
    await page.keyboard.press('Space');
    assert.equal(await first.isChecked(), true);
    await first.uncheck();
    results.push('Scan-first rows have one writing checkbox, accurate passage counts, and keyboard-operable mixed selection');

    const removed = review.locator('li[data-research-id="web:https://excluded.example.edu/clouds"]');
    await removed.getByRole('button', { name: 'Remove source from research: Source to exclude', exact: true }).click();
    const undo = review.locator('[data-research-footer]').getByRole('button', { name: 'Undo removal', exact: true });
    assert.equal(await undo.evaluate(node => node === document.activeElement), true);
    assert.ok((await review.locator('[data-research-footer]').innerText()).includes('Source to exclude'));
    await page.keyboard.press('Enter');
    assert.equal(await sourceCheckbox(removed).evaluate(node => node === document.activeElement), true);
    assert.equal(await first.isChecked(), false);
    results.push('Removal focuses the persistent Undo action; keyboard undo restores focus to the restored writing checkbox');

    await removed.getByRole('button', { name: 'Remove source from research: Source to exclude', exact: true }).click();
    await review.getByText('Add a webpage or your own text', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Source URL (optional for pasted text)', exact: true }).fill('https://provided.example.edu/notes');
    await review.getByRole('textbox', { name: 'Passage title', exact: true }).fill('PRIVATE_SOURCE_TITLE');
    await review.getByRole('textbox', { name: 'Paste source text', exact: true }).fill('PRIVATE_EXCERPT: Our synthetic classroom observations describe clouds above a field.');
    await review.getByRole('button', { name: 'Add passage', exact: true }).click();
    const pasted = review.locator('li[data-research-id="web:https://provided.example.edu/notes"]');
    await pasted.waitFor();
    const sharing = pasted.getByRole('checkbox', { name: 'Show source name and excerpts to students', exact: true });
    await sharing.check();
    await sourceCheckbox(pasted).uncheck();
    assert.equal(await sharing.isChecked(), true);
    await sourceCheckbox(pasted).check();
    await undo.click();
    assert.equal(await review.locator('li[data-research-id]').count(), 3);
    assert.equal(await sharing.isChecked(), true);
    assert.equal(await first.isChecked(), false);
    results.push('Writing and student-detail controls are independent; Undo retains later additions, passage exclusions, and sharing approval');

    await sharing.uncheck();
    await sourceCheckbox(removed).uncheck();
    assert.equal(await sourceCheckbox(removed).isChecked(), false);
    assert.ok((await removed.innerText()).includes('0 of 1 passage included'));
    const excludedStyle = await removed.evaluate(node => ({ opacity: getComputedStyle(node).opacity, background: getComputedStyle(node).backgroundColor }));
    const includedStyle = await cloud.evaluate(node => ({ opacity: getComputedStyle(node).opacity, background: getComputedStyle(node).backgroundColor }));
    assert.notDeepEqual(excludedStyle, includedStyle);
    await review.getByText('Search for more sources', { exact: true }).click();
    await review.getByRole('textbox', { name: 'Public search topic', exact: true }).fill('Cloud formation');
    await review.getByRole('button', { name: 'Search and add results', exact: true }).click();
    await page.waitForFunction(() => auditQueries.length === 2);
    assert.equal(await first.isChecked(), false);
    assert.equal(await sourceCheckbox(removed).isChecked(), false);
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
    results.push('Quiet excluded sources retain passage/source exclusions through later searches and generation');
    results.push('Unshared pasted details remain private in student sources and stale fallbacks while teacher evidence is retained');

    for (const [width, height] of [[1280, 900], [390, 844], [320, 640], [844, 400]]) {
      await reset(width, height, true);
      review = await reviewSources();
      cloud = cloudSource(review);
      await cloud.getByRole('button', { name: 'Read page', exact: true }).click();
      await page.waitForFunction(() => auditReads.length === 1);
      passages = await openPassages(cloud);
      await passages.getByRole('checkbox', { name: 'Include passage 1', exact: true }).uncheck();
      const before = await footerGeometry(review);
      assertFooter(before);
      assert.equal(before.overflowing, true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(__dirname, `review-${width}x${height}.png`), fullPage: true });
      await review.locator('[data-research-scroll]').evaluate(node => { node.scrollTop = node.scrollHeight; });
      const after = await footerGeometry(review);
      assertFooter(after);
      assert.ok(after.scrolled > 0);
      assert.ok(Math.abs(after.footer.top - before.footer.top) <= 1);
      await review.getByText('Add a webpage or your own text', { exact: true }).click();
      const add = review.getByRole('button', { name: 'Add passage', exact: true });
      await add.scrollIntoViewIfNeeded();
      const addBox = await add.boundingBox();
      const openForm = await footerGeometry(review);
      assertFooter(openForm);
      assert.ok(addBox.y + addBox.height <= openForm.scroll.bottom + 1);
      assert.ok(addBox.y + addBox.height <= openForm.footer.top + 1);
      await page.screenshot({ path: path.join(__dirname, `review-${width}x${height}-scrolled.png`), fullPage: true });
      await review.getByRole('button', { name: 'Generate from included passages', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Generate from included passages');
      await page.keyboard.press('Escape');
      assert.equal(await review.count(), 0);
      assert.equal(await page.locator('[data-help-key="source_generate_button"]').evaluate(node => node === document.activeElement), true);
      results.push(`Review ${width}x${height}: footer stays visible without overlap after long scrolling, complete form remains reachable, and keyboard focus is trapped/restored`);
    }
    for (const [width, height] of [[320, 320], [375, 375]]) {
      await reset(width, height);
      review = await reviewSources();
      await page.evaluate(() => {
        LumenStudy.firstPartyFetchWebSource = async () => {
          throw new Error('The selected page could not be read. '.repeat(25));
        };
      });
      await cloudSource(review).getByRole('button', { name: 'Read page', exact: true }).click();
      await review.getByRole('alert').filter({ hasText: 'The selected page could not be read.' }).waitFor();
      const toRemove = review.locator('li[data-research-id="web:https://excluded.example.edu/clouds"]');
      await toRemove.getByRole('button', { name: 'Remove source from research: Source to exclude', exact: true }).click();
      const tinyUndo = review.locator('[data-research-footer]').getByRole('button', { name: 'Undo removal', exact: true });
      assert.equal(await tinyUndo.evaluate(node => node === document.activeElement), true);
      const tinyGenerate = review.getByRole('button', { name: 'Generate from included passages', exact: true });
      const tinyFooter = await footerGeometry(review);
      assertFooter(tinyFooter);
      const actionBox = await tinyGenerate.boundingBox();
      assert.ok(actionBox.y >= 0 && actionBox.y + actionBox.height <= height + 1);
      const undoBox = await tinyUndo.boundingBox();
      assert.ok(undoBox.y >= tinyFooter.footer.top && undoBox.y + undoBox.height <= height + 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(__dirname, `review-${width}x${height}-status.png`), fullPage: true });
      await tinyUndo.click();
      assert.equal(await sourceCheckbox(toRemove).evaluate(node => node === document.activeElement), true);
      const restoredBox = await sourceCheckbox(toRemove).boundingBox();
      const restoredFooter = await footerGeometry(review);
      assert.ok(restoredBox.y >= restoredFooter.scroll.top - 1 && restoredBox.y + restoredBox.height <= restoredFooter.scroll.bottom + 1);
      results.push(`Review ${width}x${height}: long error plus Undo keeps Generate and focused controls visible`);
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
