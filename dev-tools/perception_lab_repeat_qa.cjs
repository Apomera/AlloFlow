'use strict';
// Real Chromium checks for repeated visual matches and saved-study review.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-repeat');
fs.mkdirSync(out, { recursive: true });
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, acceptDownloads: true });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js', 'stem_lab/stem_tool_optics.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    const mount = async (state = {}, dark = false) => page.evaluate(({ state, dark }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); document.getElementById('slot').className = dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, state); }, { state, dark });
    const state = () => page.evaluate(() => __state.perceptionLab);
    const button = name => page.getByRole('button', { name, exact: true });
    const choose = async id => { const tab = page.locator('[data-perception-experiment="' + id + '"]'); if (await tab.isVisible()) await tab.click(); else await page.locator('#perception-experiment-picker').selectOption(id); };
    const slider = value => page.locator('#perception-match-value').evaluate((el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
    const row = id => page.locator('[data-perception-study="' + id + '"]');
    const focusIs = async selector => { try { await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), selector, { timeout: 3000 }); return true; } catch (_) { return false; } };
    const axe = async () => page.evaluate(async () => (await window.axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length, details: v.nodes.map(n => ({ html: n.html, failure: n.failureSummary })) })));
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const record = async (value, note = '') => { await slider(value); await page.locator('[data-perception-choice="Same"]').click(); if (note) await page.locator('#perception-note').fill(note); await button('Record match').click(); };
    const begin = async id => { await mount(); await choose(id); await button('Match by eye').click(); await button('Start three matches').click(); };
    let completed, hidden;
    for (const [id, reference, values, starts] of [['brightness', 128, [130, 142, 136], [72, 184, 100]], ['ebbinghaus', 48, [50, 58, 54], [40, 60, 44]], ['mullerLyer', 400, [412, 434, 420], [325, 475, 363]]]) {
      await begin(id);
      assert(await focusIs('#perception-match-value'));
      assert.equal((await state()).models[id].matchValue, starts[0]);
      assert(await button('Record match').isDisabled());
      for (const label of ['Observe', 'Remove surroundings', 'Swap surroundings', 'Reveal measurements', 'Reset comparison', 'Save observation', 'Export SVG']) assert(await button(label).isDisabled());
      assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
      await page.locator('#perception-match-value').focus(); await page.keyboard.press('ArrowRight');
      assert.equal((await state()).models[id].matchValue, starts[0] + 1);
      for (let trial = 0; trial < 3; trial++) {
        await record(values[trial], 'Note for trial ' + (trial + 1));
        const saved = await state(), records = saved.studies;
        assert.equal(records.length, trial + 1);
        assert.equal(records[trial].repeat.trial, trial + 1); assert.equal(records[trial].repeat.startValue, starts[trial]);
        assert.equal(records[trial].model.note, 'Note for trial ' + (trial + 1));
        assert.equal(records[trial].model.reveal, false);
        assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
        assert.equal(await page.locator('[data-perception-result]').count(), 0);
        if (trial < 2) { assert.equal(saved.models[id].matchValue, starts[trial + 1]); assert.equal(saved.models[id].note, ''); assert.equal(saved.models[id].prediction, ''); assert(await focusIs('#perception-match-value')); }
      }
      assert(await focusIs('button[id$="-reveal-study"]'));
      assert(await page.locator('#perception-match-value').isDisabled());
      hidden = await state();
      await button('Reveal study results').click();
      assert(await focusIs('.perception-study-result h3'), JSON.stringify(await page.evaluate(() => ({ active: document.activeElement.outerHTML.slice(0, 600), status: document.querySelector('.perception-status').textContent, summary: document.querySelectorAll('[data-perception-study-summary]').length }))));
      const summary = page.locator('[data-perception-study-summary]').first(), text = await summary.innerText();
      const expected = [values[0], values[1], values[2]].sort((a, b) => a - b);
      assert(text.includes(String(reference)) && text.includes(String(expected[1])) && text.includes(expected[0] + '–' + expected[2]));
      assert(text.includes('+' + (expected[1] - reference)));
      if (id === 'brightness') assert(text.includes('RGB-code steps') && !text.includes('%'));
      else assert(text.includes('%'));
      assert((await state()).studies.every(r => r.model.reveal));
      assert.deepEqual(await axe(), []);
      if (id === 'mullerLyer') {
        const svgEvent = page.waitForEvent('download'); await button('Export SVG').click(); const svgDownload = await svgEvent;
        await svgDownload.saveAs(path.join(out, 'repeat-revealed.svg')); const svg = read(path.join(out, 'repeat-revealed.svg'));
        assert(svg.includes('420') && svg.includes('400') && svg.includes('adjustable shaft'));
      }
      await page.screenshot({ path: path.join(out, 'repeat-' + id + '.png'), fullPage: true });
      completed = await state();
      await button('End repeated study').click(); assert(await focusIs('#perception-match-value')); assert(!(await page.locator('#perception-match-value').isDisabled()));
      checks.push({ experiment: id, hiddenUntilThreeAndExplicitReveal: true, values, starts, fixedReference: reference, independentNotes: true, keyboardAndTransitionFocus: true, frozenSettings: true, revealedSVG: id === 'mullerLyer', axe: [] });
    }
    // A revealed pinned drawing and notebook must not disclose the next study's target.
    await mount(completed); await button('Pin comparison').click();
    const pinned = (await state()).comparison;
    await button('Start three matches').click();
    assert.equal(await page.locator('#perception-stage-reference').count(), 0); assert.equal(await page.locator('[data-perception-study]').count(), 0);
    assert(await button('Export notebook').isDisabled());
    await button('End repeated study').click(); assert.deepEqual((await state()).comparison, pinned);
    assert.equal(await page.locator('#perception-stage-reference').count(), 1); assert.equal(await page.locator('[data-perception-study]').count(), 3);
    checks.push({ previouslyRevealedNotebookAndPinMaskedWhileCollecting: true, restoredAfterEnd: true });
    // Review/reveal a persisted hidden group without changing the current draft or pin.
    await mount(hidden); const savedRows = (await state()).studies, groupId = savedRows[0].repeat.id;
    const draft = (await state()).models, comparison = (await state()).comparison;
    await row(savedRows[0].id).getByRole('button', { name: 'Review study', exact: true }).click();
    assert(await focusIs('.perception-review h4')); assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
    await button('Reveal saved study').click(); assert.equal(await page.locator('[data-perception-study-summary]').count(), 1);
    assert.deepEqual((await state()).models, draft); assert.deepEqual((await state()).comparison, comparison);
    await button('Close study review').click(); assert(await row(savedRows[0].id).getByRole('button', { name: 'Review study', exact: true }).evaluate(n => document.activeElement === n));
    const jsonEvent = page.waitForEvent('download'); await button('Export notebook').click(); const jsonDownload = await jsonEvent;
    await jsonDownload.saveAs(path.join(out, 'repeat-notebook.json')); assert.deepEqual(JSON.parse(read(path.join(out, 'repeat-notebook.json'))).studies, (await state()).studies);
    // Repeat from the notebook opens collapsed controls and makes a fresh group.
    await page.locator('.perception-controls summary').click();
    await row(savedRows[0].id).getByRole('button', { name: 'Repeat these settings', exact: true }).click();
    assert(await page.locator('.perception-controls details').evaluate(n => n.open)); assert(await focusIs('#perception-match-value'));
    assert.notEqual(await page.locator('[data-perception-repeat-active]').getAttribute('data-perception-repeat-active'), groupId);
    assert.equal((await state()).models.mullerLyer.note, ''); assert.equal((await state()).models.mullerLyer.reveal, false);
    await button('End repeated study').click();
    checks.push({ savedReviewSeparateReveal: true, draftAndPinPreserved: true, JSONMetadataRoundtrip: true, repeatSavedSettingsFreshGroupAndFocus: true });
    // Partial groups show no summary, and undo restores their association.
    await row(savedRows[0].id).getByRole('button', { name: 'Delete observation', exact: true }).click();
    await row(savedRows[1].id).getByRole('button', { name: 'Review study', exact: true }).click();
    assert((await page.locator('.perception-review').innerText()).includes('2 of 3'));
    assert.equal(await page.locator('[data-perception-study-summary]').count(), 0); assert.equal(await button('Reveal saved study').count(), 0);
    await button('Undo deletion').click(); assert.deepEqual((await state()).studies.map(r => r.repeat.trial), [1, 2, 3]);
    assert.equal(await page.locator('[data-perception-study-summary]').count(), 1);
    checks.push({ partialGroupNeverAggregated: true, deleteUndoRetainsGroupAndTrialOrder: true });
    // Deleting from a just-completed live group expires the cached block.
    await begin('brightness'); await record(126); await record(134); await record(130);
    const live = await state(); await row(live.studies[0].id).getByRole('button', { name: 'Delete observation', exact: true }).click();
    await button('Reveal study results').waitFor({ state: 'detached' });
    assert.equal(await button('Reveal study results').count(), 0); assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
    assert.equal((await state()).studies.length, 2);
    await button('Undo deletion').click(); assert.equal((await state()).studies.length, 3);
    checks.push({ deletingLiveMatchExpiresCachedSummary: true, noResurrection: true });
    // One stale saved Reveal click cannot retain success after a queued replacement.
    await mount(hidden); await row(savedRows[0].id).getByRole('button', { name: 'Review study', exact: true }).click();
    await page.evaluate(() => { const reveal = Array.from(document.querySelectorAll('button')).find(n => n.textContent === 'Reveal saved study'); ReactDOM.unstable_batchedUpdates(() => { __edit(prev => ({ ...prev, perceptionLab: StemLab.PerceptionEngine.normalize({}) })); reveal.click(); }); });
    assert.equal((await state()).studies.length, 0);
    await page.waitForFunction(() => document.querySelector('.perception-status').textContent.includes('no longer available'), null, { timeout: 3000 });
    assert((await page.evaluate(() => __announced)).includes('no longer available'));
    assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
    await begin('ebbinghaus'); await record(55);
    await page.evaluate(() => __edit(prev => ({ ...prev, perceptionLab: { ...prev.perceptionLab, models: { ...prev.perceptionLab.models, ebbinghaus: { ...prev.perceptionLab.models.ebbinghaus, gap: 20 } } } })));
    await button('Record match').waitFor({ state: 'detached' });
    assert.equal(await button('Record match').count(), 0); assert.equal((await state()).studies.length, 1);
    await button('Start three matches').click(); await page.evaluate(() => __setProfile('other-profile'));
    await button('Record match').waitFor({ state: 'detached' });
    assert.equal(await button('Record match').count(), 0); assert.equal(await page.locator('[data-perception-repeat-active]').count(), 0);
    checks.push({ batchedStaleSavedRevealExpiresFeedback: true, changedContextExpiresStudy: true, profileClearsLocalStudy: true });
    // Double click records one match; the next match needs a new impression.
    await begin('brightness'); await page.locator('[data-perception-choice="Unsure"]').click();
    await button('Record match').dblclick(); assert.equal((await state()).studies.length, 1); assert(await button('Record match').isDisabled());
    checks.push({ doubleClickOneRecord: true, nextMatchRequiresFreshImpression: true });
    for (const width of [320, 390, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 }); await mount(completed);
      await row(completed.studies[0].id).getByRole('button', { name: 'Review study', exact: true }).click();
      await noOverflow(); assert.deepEqual(await axe(), []);
      const sizes = await page.locator('[data-perception-lab] button').evaluateAll(nodes => nodes.filter(n => n.offsetWidth && n.offsetHeight).map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
      assert(sizes.every(s => s.width >= 44 && s.height >= 44));
      await page.screenshot({ path: path.join(out, 'repeat-review-' + width + '.png'), fullPage: true });
      await button('Close study review').click(); await button('Start three matches').click(); await noOverflow(); assert.deepEqual(await axe(), []);
      checks.push({ viewport: width, collectingAndSavedSummary: true, noOverflow: true, buttons44: true, axe: [] });
    }
    await page.setViewportSize({ width: 1600, height: 1100 }); await mount(completed, true);
    await row(completed.studies[0].id).getByRole('button', { name: 'Review study', exact: true }).click(); assert.deepEqual(await axe(), []);
    await page.screenshot({ path: path.join(out, 'repeat-dark.png'), fullPage: true }); checks.push({ darkAxe: [] });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow();
    await page.screenshot({ path: path.join(out, 'repeat-large-text.png'), fullPage: true }); checks.push({ largeText200PercentNoOverflow: true });
    await page.evaluate(() => document.documentElement.style.fontSize = ''); await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await page.locator('#perception-stage-current').evaluate(n => getComputedStyle(n).forcedColorAdjust), 'none');
    await page.screenshot({ path: path.join(out, 'repeat-forced-colors.png'), fullPage: true }); checks.push({ forcedColorsStimulusPreserved: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'repeat-browser-results.json'), JSON.stringify({ checks, errors, sourceSHA256: require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex') }, null, 2));
    console.log(JSON.stringify({ groups: checks.length, errors, passed: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
