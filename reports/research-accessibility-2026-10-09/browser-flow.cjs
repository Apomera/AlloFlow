const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const results = [], errors = [], unexpected = [], observations = [], selftests = [];
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
  }
  const review = () => page.getByRole('dialog', { name: 'Review research sources', exact: true });
  const input = name => review().getByRole('textbox', { name, exact: true, includeHidden: true });
  const chooser = () => review().locator('[data-transcript-chooser]').first();
  async function enableReview() {
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
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
    const before = await page.evaluate(() => auditCalls.length);
    await setClip(start, end); await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    await page.waitForFunction(count => auditCalls.length === count + 1, before);
    await review().getByRole('button', { name: 'Cancel research', exact: true }).waitFor({ state: 'hidden' });
    await chooser().waitFor({ state: 'attached' });
  }
  async function focusedInDialog() {
    const value = await review().evaluate(dialog => {
      const node = document.activeElement;
      let visible = !!node && getComputedStyle(node).visibility !== 'hidden' && !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
      for (let parent = node; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(node)) visible = false;
      }
      return { inside: dialog.contains(node), visible, tag: node?.tagName, label: node?.getAttribute('aria-label') || node?.textContent?.slice(0, 100) };
    });
    assert.ok(value.inside && value.visible, 'Focus escaped visible dialog controls: ' + JSON.stringify(value));
    return value;
  }
  async function descriptions(locator) {
    return locator.evaluate(node => (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent || '[missing]').join(' '));
  }
  async function assertClipError() {
    assert.equal(await input('End time').getAttribute('aria-invalid'), 'true');
    assert.match(await descriptions(input('End time')), /end after the start/i);
    assert.match(await descriptions(input('Start time')), /seconds|MM:SS|minutes/i);
  }
  async function axe(name) {
    if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const scan = await page.evaluate(async () => {
      const result = await window.axe.run('[role="dialog"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      const checkDetails = check => ({ id: check.id, impact: check.impact, message: check.message, data: check.data, relatedNodes: check.relatedNodes?.map(node => ({ target: node.target, html: node.html })) });
      const findingDetails = item => ({ id: item.id, impact: item.impact, description: item.description, help: item.help, helpUrl: item.helpUrl, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary, any: node.any.map(checkDetails), all: node.all.map(checkDetails), none: node.none.map(checkDetails) })) });
      return { violations: result.violations.map(findingDetails), passes: result.passes.length, incomplete: result.incomplete.map(findingDetails) };
    });
    observations.push({ name, axe: scan }); assert.deepEqual(scan.violations, [], name);
    assert.deepEqual(scan.incomplete.filter(item => item.id === 'aria-prohibited-attr'), [], name + ': unsupported ARIA');
    scan.manualContrast = [];
    for (const finding of scan.incomplete.filter(item => item.id === 'color-contrast')) {
      for (const node of finding.nodes) {
        assert.equal(node.target.length, 1, 'Contrast review requires an unambiguous document selector');
        const diagnostic = await page.locator(node.target[0]).evaluate(element => {
          const ancestors = [];
          for (let current = element; current; current = current.parentElement) ancestors.push(current);
          const savedScroll = ancestors.map(current => ({ current, top: current.scrollTop, left: current.scrollLeft }));
          const rgba = value => {
            const match = value.match(/^rgba?\(([^)]+)\)$/);
            if (!match) throw new Error('Unsupported computed color: ' + value);
            const channels = match[1].split(',').map(Number);
            return [...channels.slice(0, 3), channels.length === 4 ? channels[3] : 1];
          };
          const composite = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
          const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
          const unsupported = ancestors.filter(current => {
            const style = getComputedStyle(current);
            return style.backgroundImage !== 'none' || Number(style.opacity) !== 1 || style.mixBlendMode !== 'normal';
          }).map(current => current.tagName + '.' + current.className);
          let background = [255, 255, 255];
          for (const current of [...ancestors].reverse()) background = composite(rgba(getComputedStyle(current).backgroundColor), background);
          const style = getComputedStyle(element);
          const foreground = composite(rgba(style.color), background);
          const light = Math.max(luminance(foreground), luminance(background));
          const dark = Math.min(luminance(foreground), luminance(background));
          const minimum = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5;
          try {
            element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            const textRects = [...element.childNodes].filter(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()).flatMap(child => {
              const range = document.createRange(); range.selectNodeContents(child);
              return [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
            });
            const visibleText = textRects.length > 0 && textRects.every(rect => [0.1, 0.5, 0.9].every(fraction => {
              const hit = document.elementFromPoint(rect.left + (rect.right - rect.left) * fraction, (rect.top + rect.bottom) / 2);
              return hit === element || element.contains(hit);
            }));
            return { foreground, background, ratio: (light + .05) / (dark + .05), minimum, unsupported, visibleText, centeredTextRects: textRects };
          } finally {
            for (const saved of savedScroll) { saved.current.scrollTop = saved.top; saved.current.scrollLeft = saved.left; }
          }
        });
        scan.manualContrast.push({ target: node.target, ...diagnostic });
        assert.deepEqual(diagnostic.unsupported, [], name + ': solid-color contrast calculation');
        assert.ok(diagnostic.ratio >= diagnostic.minimum, name + ': insufficient computed contrast ' + diagnostic.ratio);
        assert.ok(diagnostic.visibleText, name + ': text remains obscured after scrolling it into view');
      }
    }
  }
  async function layout(name) {
    const geometry = await review().evaluate(node => {
      const footer = node.querySelector('[data-research-footer]').getBoundingClientRect();
      const scroll = node.querySelector('[data-research-scroll]').getBoundingClientRect();
      const overflows = [...node.querySelectorAll('button, label, summary')].filter(item => item.getBoundingClientRect().width > 0 && item.scrollWidth > item.clientWidth + 2).map(item => item.textContent.slice(0, 80));
      return { width: document.documentElement.scrollWidth <= innerWidth, nonoverlap: scroll.bottom <= footer.top + 1, scrollHeight: scroll.height, overflows };
    });
    assert.ok(geometry.width && geometry.nonoverlap && geometry.scrollHeight > 30 && geometry.overflows.length === 0, JSON.stringify(geometry));
    observations.push({ name, geometry }); await page.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  try {
    await reset(320, 640); await enableReview(); await setUrl('https://science.example.edu/clouds');
    assert.equal(await input('Passage title').isVisible(), false);
    assert.equal(await input('Paste source text').isVisible(), false);
    assert.equal(await review().getByRole('button', { name: 'Read relevant webpage passages', exact: true }).isVisible(), true);
    await review().getByRole('button', { name: 'Close', exact: true }).focus();
    for (let index = 0; index < 20; index++) { await page.keyboard.press('Tab'); await focusedInDialog(); }
    for (let index = 0; index < 20; index++) { await page.keyboard.press('Shift+Tab'); await focusedInDialog(); }
    await axe('simple-link-320'); await layout('simple-link-320');
    results.push('Link reading is uncluttered at 320px, and keyboard traversal skips nested closed paste controls in both directions');

    await review().getByText('Paste text', { exact: true }).click();
    await input('Passage title').fill('Teacher passage');
    await input('Paste source text').fill('Plants absorb water through roots and use sunlight to support their growth.');
    await review().getByText('Paste text', { exact: true }).click();
    assert.equal(await input('Paste source text').isVisible(), false);
    await review().getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    assert.equal(await input('Paste source text').isVisible(), true);
    assert.match(await input('Paste source text').inputValue(), /Plants absorb water/);
    assert.equal(await page.evaluate(() => auditCalls.length + auditReads.length + auditQueries.length), 0);
    results.push('Pasted drafts reopen visibly and retain their text without any network or provider call');

    await reset(390, 844); await enableReview(); await setUrl('https://youtu.be/AbCdEfGhI_1?t=40');
    await review().getByRole('button', { name: 'Use linked start time', exact: true }).click();
    assert.equal(await input('Start time').evaluate(node => node === document.activeElement), true);
    await input('End time').fill('0:30'); await assertClipError();
    assert.equal(await review().getByRole('button', { name: 'Read clip', exact: true }).isDisabled(), true);
    if (process.argv.includes('--selftest')) {
      const original = await input('End time').getAttribute('aria-invalid');
      await input('End time').evaluate(node => node.removeAttribute('aria-invalid'));
      await assert.rejects(assertClipError); selftests.push('Clip validation check fails when aria-invalid is removed');
      await input('End time').evaluate((node, value) => node.setAttribute('aria-invalid', value), original);
      await assertClipError();
      await page.evaluate(() => document.activeElement.blur());
      await assert.rejects(focusedInDialog); selftests.push('Keyboard check fails when focus escapes to body');
      await input('End time').focus(); await focusedInDialog();
    }
    await axe('invalid-clip-390'); await layout('invalid-clip-390');
    await input('End time').fill('1:20');
    assert.notEqual(await input('End time').getAttribute('aria-invalid'), 'true');
    assert.doesNotMatch(await descriptions(input('End time')), /Enter a start and end time/);
    assert.equal(await page.evaluate(() => auditCalls.length), 0);
    results.push('Clip controls expose linked time-format and validation descriptions and clear invalid state after correction');

    await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    await chooser().locator('summary').click();
    assert.equal(await review().getByRole('heading', { name: 'Cloud formation video', level: 3 }).count(), 1);
    const status = chooser().locator('[data-transcript-results]');
    assert.match(await status.textContent(), /18 matching excerpts. Page 1 of 3./);
    await chooser().getByRole('button', { name: 'Next excerpts', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await status.evaluate(node => node === document.activeElement), true);
    assert.match(await status.textContent(), /Page 2 of 3/);
    await chooser().getByRole('button', { name: 'Next excerpts', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await status.evaluate(node => node === document.activeElement), true);
    assert.match(await status.textContent(), /Page 3 of 3/);
    assert.equal(await chooser().getByRole('button', { name: 'Next excerpts', exact: true }).isDisabled(), true);
    await focusedInDialog();
    await page.keyboard.press('Tab');
    assert.equal(await chooser().getByRole('checkbox').first().evaluate(node => node === document.activeElement), true);
    results.push('Keyboard pagination focuses the announced result range even on the final page, then tabs naturally into the new excerpts');

    const search = chooser().getByRole('searchbox', { name: 'Find in transcript', exact: true });
    const statusId = await status.getAttribute('id');
    assert.equal(await search.getAttribute('aria-describedby'), statusId);
    await search.fill('not present anywhere');
    assert.equal(await status.textContent(), 'No matching excerpts.');
    assert.equal(await search.evaluate(node => node === document.activeElement), true);
    await search.fill('Section 18:');
    assert.match(await status.textContent(), /1 matching excerpts. Page 1 of 1./);
    assert.equal(await status.getAttribute('id'), statusId);
    assert.equal(await search.evaluate(node => node === document.activeElement), true);
    assert.equal(await page.evaluate(() => auditCalls.length), 1);
    await axe('filtered-transcript-390');
    results.push('Transcript filtering updates one persistent live result region without stealing typing focus or making another provider call');

    await reset(1280, 900); await enableReview(); await readClip(); await readClip('2:00', '3:00');
    const groups = review().locator('[data-transcript-chooser]');
    const names = await groups.evaluateAll(nodes => nodes.map(node => ({ role: node.getAttribute('role'), name: node.getAttribute('aria-label') })));
    assert.equal(names.length, 2); assert.ok(names.every(item => item.role === 'group' && item.name.includes('Cloud formation video')));
    assert.ok(names[0].name.includes('0:40') && names[1].name.includes('2:00'));
    await groups.first().locator('summary').click(); await groups.last().locator('summary').click();
    await axe('named-clips-desktop'); await groups.first().locator('summary').scrollIntoViewIfNeeded(); await layout('named-clips-desktop');
    results.push('Multiple clip choosers have distinct source-and-range group names and accessible source headings at desktop width');

    await reset(); await enableReview(); await setUrl(canonical); await page.evaluate(() => { auditMode = 'pending'; });
    await review().getByRole('button', { name: 'Read video', exact: true }).click();
    await review().getByRole('button', { name: 'Cancel research', exact: true }).click();
    assert.equal(await review().locator('[data-research-outcome]').textContent(), 'Research cancelled.');
    assert.equal(await review().locator('[data-research-outcome]').getAttribute('role'), 'status');
    await page.evaluate(() => { auditMode = 'ok'; auditRelease(); });
    await page.waitForFunction(() => auditAborts > 0 || auditCalls.length === 1);
    assert.equal(await review().locator('[data-transcript-chooser]').count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Review sources', exact: true }).evaluate(node => node === document.activeElement), true);
    results.push('Cancellation announces completion, rejects late transcript results, and Escape restores the Review sources trigger');

    await reset(); await enableReview(); await page.evaluate(() => auditState.setAi({ backend: 'ollama' })); await setUrl(canonical);
    assert.match(await descriptions(input('Source URL (optional for pasted text)')), /requires Gemini/);
    assert.equal(await review().getByRole('button', { name: 'Read video', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => auditCalls.length), 0);
    await axe('provider-unavailable-390');
    results.push('Unavailable video support is connected to the URL field and leaves the selected provider unchanged');
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  } catch (error) {
    failure = error.stack || String(error);
    throw error;
  } finally {
    const hashes = Object.fromEntries(['content_engine_module.js', 'gemini_api_module.js', 'view_misc_panels_module.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex')]));
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ base, hashes, success: !failure, passed: results.length, results, selftests, observations, errors, unexpected, failure: failure || null }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ passed: results.length, results, selftests }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
