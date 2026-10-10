'use strict';
// Real Chromium verification of matching, comparison and notebook workflows.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-deep');
fs.mkdirSync(out, { recursive: true });
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__profile=pp[0];window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('setStemLabTool: function(){}', 'setStemLabTool: function(id){window.__navigation=id;}');
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
    const stage = page.locator('#perception-stage-current'), state = () => page.evaluate(() => __state.perceptionLab);
    const button = name => page.getByRole('button', { name, exact: true });
    const choose = async id => { const tab = page.locator('[data-perception-experiment="' + id + '"]'); if (await tab.isVisible()) await tab.click(); else await page.locator('#perception-experiment-picker').selectOption(id); };
    const slider = async (key, value) => page.locator('#perception-' + key).evaluate((el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
    const target = async () => stage.locator('[data-perception-target]').evaluateAll(nodes => nodes.map(n => ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'fill'].map(k => n.getAttribute(k))));
    const axe = async () => page.evaluate(async () => (await window.axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length })));
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mount(); await stage.waitFor();
    for (const [id, reference, adjusted] of [['brightness', 128, 146], ['ebbinghaus', 48, 60], ['mullerLyer', 400, 455]]) {
      await choose(id); await button('Match by eye').click();
      assert.notEqual((await state()).models[id].matchValue, reference);
      assert.equal(await page.locator('[data-perception-result]').count(), 0);
      assert((await page.locator('#perception-match-value').getAttribute('aria-valuetext')).includes('hidden until reveal'));
      if (id === 'brightness') assert.equal(await page.locator('#perception-target').count(), 0);
      await slider('match-value', adjusted);
      const geometry = await target();
      await button('Swap surroundings').click(); assert.deepEqual(await target(), geometry);
      await button('Remove surroundings').click(); assert.deepEqual(await target(), geometry);
      assert.equal(await stage.locator('[data-perception-context]').count(), 0);
      await button('Remove surroundings').click();
      await page.locator('#perception-match-value').focus(); await page.keyboard.press('ArrowRight');
      assert.equal((await state()).models[id].matchValue, adjusted + 1);
      assert.equal(await page.locator('[data-perception-result]').count(), 0);
      await button('Reveal measurements').click();
      const result = await page.locator('[data-perception-result]').innerText();
      assert(result.includes(String(adjusted + 1))); assert(result.includes('+' + (adjusted + 1 - reference)));
      assert(!result.includes('Both squares:') && !result.includes('Both shafts:'));
      assert.deepEqual(await axe(), []);
      await page.screenshot({ path: path.join(out, 'match-' + id + '.png'), fullPage: true });
      await button('Equalize drawing values').click();
      assert.equal((await state()).models[id].matchValue, reference); assert.equal((await state()).models[id].reveal, false);
      await button('Increase comparison').click(); await button('Decrease comparison').click();
      assert.equal((await state()).models[id].matchValue, reference);
      checks.push({ matching: id, fixedReference: true, swapAndRemovePreserveTargets: true, keyboardStep: true, preciseButtons: true, explicitReveal: result, resetHidesValues: true, axe: [] });
    }
    // Pin before reveal, then reveal only the current view. Each column keeps its own visibility.
    await choose('ebbinghaus'); await slider('match-value', 57); await button('Pin comparison').click(); await slider('match-value', 64);
    assert.equal(await page.locator('[data-perception-change="matchValue"]').innerText(), 'Comparison target\tHidden until reveal\tHidden until reveal');
    await button('Reveal measurements').click();
    const cells = await page.locator('[data-perception-change="matchValue"] td').allTextContents();
    assert.deepEqual(cells, ['Hidden until reveal', '64 units']);
    assert.equal(await page.locator('#perception-stage-reference [data-perception-guide]').count(), 0);
    const boxes = [await stage.boundingBox(), await page.locator('#perception-stage-reference').boundingBox()];
    assert(Math.abs(boxes[0].width - boxes[1].width) < 1); assert(Math.abs(boxes[0].height - boxes[1].height) < 1); assert(boxes[1].x > boxes[0].x + boxes[0].width);
    await button('Expand viewing area').click(); await noOverflow();
    const expanded = await stage.boundingBox(), pinned = await page.locator('#perception-stage-reference').boundingBox();
    assert(Math.abs(expanded.width - pinned.width) < 1);
    await page.screenshot({ path: path.join(out, 'comparison-desktop.png'), fullPage: true });
    await page.keyboard.press('Escape');
    checks.push({ identicalComparisonScale: boxes, expandedComparisonScale: expanded, independentMeasurementVisibility: true, changedSettings: true });
    // Hidden brightness reference is protected in the changes table too.
    await mount(); await button('Pin comparison').click(); await slider('target', 160); await button('Match by eye').click();
    assert.deepEqual(await page.locator('[data-perception-change="target"] td').allTextContents(), ['128 RGB', 'Hidden until reveal']);
    await button('Reveal measurements').click(); assert.deepEqual(await page.locator('[data-perception-change="target"] td').allTextContents(), ['128 RGB', '160 RGB']);
    await slider('match-value', 190); await button('Swap surroundings').click();
    await button('Open Art Studio').click();
    const handoff = await page.evaluate(() => ({ model: __state.perceptionLab.models.brightness, art: __state.artStudio, nav: __navigation }));
    assert.equal(handoff.nav, 'artStudio'); assert(handoff.art.opLitA > handoff.art.opLitB); assert.equal(handoff.art.opCenterLit, 160 / 255 * 100); assert.equal(handoff.model.matchValue, 190);
    assert((await page.locator('.perception-controls').innerText()).includes('Art Studio uses the reference gray'));
    checks.push({ hiddenBrightnessReference: true, swappedArtHandoff: true, referenceColorHandoffExplained: true });
    // Multiple saved records: exact identity, one undo, preserved draft, JSON and visible SVG.
    await page.locator('[data-perception-choice]').first().click(); await page.locator('#perception-note').fill('My first brightness match.'); await button('Save observation').click();
    await choose('mullerLyer'); await button('Match by eye').click(); await slider('match-value', 432); await button('Reveal measurements').click();
    await page.locator('[data-perception-choice]').last().click(); await page.locator('#perception-note').fill('The fins changed my impression.'); await button('Save observation').click();
    let saved = await state(); assert.equal(saved.studies.length, 2);
    const firstId = saved.studies[0].id, lastId = saved.studies[1].id;
    await page.locator('[data-perception-study="' + firstId + '"]').getByRole('button', { name: 'Pin observation', exact: true }).click();
    assert.equal((await state()).experiment, 'mullerLyer'); assert.equal((await state()).comparison.experiment, 'brightness'); assert.equal(await page.locator('.perception-deltas').count(), 0);
    await page.locator('[data-perception-study="' + lastId + '"]').getByRole('button', { name: 'Delete observation', exact: true }).click();
    assert.equal((await state()).studies.length, 1); assert(await button('Undo deletion').evaluate(n => document.activeElement === n));
    await button('Undo deletion').click(); assert.deepEqual((await state()).studies.map(s => s.id), [firstId, lastId]);
    assert(await page.locator('.perception-journal h3').evaluate(n => document.activeElement === n));
    const jsonEvent = page.waitForEvent('download'); await button('Export notebook').click(); const jsonDownload = await jsonEvent;
    await jsonDownload.saveAs(path.join(out, 'perception-notebook.json')); const notebook = JSON.parse(read(path.join(out, 'perception-notebook.json')));
    assert.equal(notebook.schema, 'alloflow.perception.notebook'); assert.equal(notebook.version, 1); assert.deepEqual(notebook.studies, (await state()).studies);
    const svgEvent = page.waitForEvent('download'); await button('Export SVG').click(); const svgDownload = await svgEvent;
    await svgDownload.saveAs(path.join(out, 'matching-lines.svg')); const svg = read(path.join(out, 'matching-lines.svg'));
    assert(svg.includes('432') && svg.includes('400')); assert(svg.includes('width="800"') && svg.includes('height="480"')); assert(svg.includes('adjustable shaft'));
    saved = await state(); await mount(saved); assert.deepEqual((await state()).studies, saved.studies); assert.equal((await state()).models.mullerLyer.matchValue, 432);
    checks.push({ notebookIdentityAndOrder: true, deleteUndoFocus: true, savedPinPreservesDraft: true, differentExperimentHasNoDeltas: true, jsonMatchesSavedState: true, svgMatchesVisibleDrawing: true, remountPersistence: true });
    await page.locator('[data-perception-study="' + lastId + '"]').getByRole('button', { name: 'Delete observation', exact: true }).click();
    await page.evaluate(() => __edit(prev => Object.assign({}, prev, { perceptionLab: Object.assign({}, prev.perceptionLab, { studies: [] }) })));
    await button('Undo deletion').waitFor({ state: 'detached' });
    assert.equal(await button('Undo deletion').count(), 0); assert(await button('Export notebook').isDisabled());
    checks.push({ externalNotebookReplacementClearsUndo: true, emptyExportDisabled: true });
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await mount(saved);
      await noOverflow(); assert.deepEqual(await axe(), []);
      if (width < 1100) { const left = await stage.boundingBox(), right = await page.locator('#perception-stage-reference').boundingBox(); assert(right.y > left.y + left.height); }
      const sizes = await page.locator('[data-perception-lab] button').evaluateAll(nodes => nodes.filter(n => n.offsetWidth && n.offsetHeight).map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
      assert(sizes.every(s => s.width >= 44 && s.height >= 44));
      await page.screenshot({ path: path.join(out, 'matching-' + width + '.png'), fullPage: true });
      checks.push({ viewport: width, noOverflow: true, comparisonStacking: width < 1100, buttons44: true, axe: [] });
    }
    await page.setViewportSize({ width: 1600, height: 1100 }); await mount(saved, true); assert.deepEqual(await axe(), []);
    await page.screenshot({ path: path.join(out, 'matching-dark.png'), fullPage: true }); checks.push({ darkAxe: [] });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow();
    await page.screenshot({ path: path.join(out, 'matching-large-text.png'), fullPage: true }); checks.push({ largeText200PercentNoOverflow: true });
    await page.evaluate(() => document.documentElement.style.fontSize = ''); await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await stage.evaluate(n => getComputedStyle(n).forcedColorAdjust), 'none');
    await page.screenshot({ path: path.join(out, 'matching-forced-colors.png'), fullPage: true }); checks.push({ forcedColorsStimulusPreserved: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'matching-browser-results.json'), JSON.stringify({ checks, errors, sourceSHA256: require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex') }, null, 2));
    console.log(JSON.stringify({ groups: checks.length, errors, passed: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
