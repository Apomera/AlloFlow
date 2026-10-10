'use strict';
// Real Chromium checks for a controlled repeat of a saved Perception Lab study.
// Run with PLAYWRIGHT_BROWSERS_PATH pointing to the installed browser cache.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-guided');
fs.mkdirSync(out, { recursive: true });
const sourceSHA256 = () => require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('setToolData: pair[1]', 'setToolData: function(updater){if(window.__deferToolWrites)window.__deferredToolWrites.push(updater);else pair[1](updater);}')
  .replace('isContrast: false', 'isContrast:!!window.__qaContrast')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
const fixtures = [
  { id: 'brightness', key: 'contrast', value: 25, reference: 128, a: [121, 134, 146], b: [130, 142, 152], starts: [73, 185, 99] },
  { id: 'ebbinghaus', key: 'surround', value: 45, reference: 48, a: [44, 50, 54], b: [48, 53, 60], starts: [41, 59, 43] },
  { id: 'mullerLyer', key: 'angle', value: 65, reference: 400, a: [380, 410, 425], b: [400, 430, 445], starts: [326, 474, 364] },
];
function seed(fixture, { hidden = true, model = {}, extras = [] } = {}) {
  return {
    experiment: 'moire', expanded: false,
    studies: [1, 2, 3].map((trial, index) => ({ id: 'baseline-' + trial, experiment: fixture.id, date: '2026-10-03T14:00:0' + trial + '.000Z',
      model: { matching: true, reveal: !hidden, prediction: fixture.id === 'mullerLyer' ? 'Top' : 'Left', note: 'Baseline note ' + trial, matchValue: fixture.a[index], ...model },
      repeat: { id: 'baseline', trial, startValue: fixture.starts[index] },
    })).concat(extras),
    models: { moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' }, brightness: { target: 180, note: 'Separate brightness draft' } },
    comparison: { experiment: 'necker', model: { depth: 72, cue: 'front', reveal: true, note: 'Pinned cube' } },
  };
}

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const checks = [], errors = [], loadedSourceSHA256 = sourceSHA256();
  let phase = 'mount';
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    const mount = async (state = {}, dark = false, contrast = false) => {
      await page.evaluate(({ state, dark, contrast }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); window.__deferToolWrites = false; window.__deferredToolWrites = []; window.__qaContrast = contrast; document.getElementById('slot').className = contrast ? 'theme-contrast' : dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, StemLab.PerceptionEngine.normalize(state)); }, { state, dark, contrast });
    };
    const state = () => page.evaluate(() => __state.perceptionLab);
    const button = name => page.getByRole('button', { name, exact: true });
    const row = id => page.locator('[data-perception-study="' + id + '"]');
    const planner = () => page.locator('[data-perception-guided-plan]');
    const setting = () => page.locator('[data-perception-guided-setting]');
    const plannedValue = () => page.locator('[data-perception-guided-value]');
    const active = () => page.locator('[data-perception-repeat-active]');
    const pairResults = () => page.locator('[data-perception-study-pair-results]');
    const open = async () => { await row('baseline-1').getByRole('button', { name: 'Review study', exact: true }).click(); await button('Plan one-setting repeat').click(); assert.equal(await planner().count(), 1); };
    const input = async (locator, value) => {
      if (await locator.evaluate(node => node.tagName === 'SELECT')) await locator.selectOption(String(value));
      else await locator.evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
    };
    const plan = async (key, value) => { await setting().selectOption(key); await input(plannedValue(), value); };
    const record = async (value, note = '') => { await input(page.locator('#perception-match-value'), value); await page.locator('[data-perception-choice="Same"]').click(); if (note) await page.locator('#perception-note').fill(note); await button('Record match').click(); };
    const focusIs = async selector => { await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), selector, { timeout: 3000 }); };
    const noResults = async () => { assert.equal(await pairResults().count(), 0); assert.equal(await page.locator('[data-perception-study-plot]').count(), 0); };
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Viewport must not overflow horizontally.');
    const paint = async () => page.evaluate(() => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No committed paint within 10 seconds.')), 10000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); })); }));
    const audit = async name => {
      await page.evaluate(() => scrollTo(0, 0)); await paint();
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.length, details: item.nodes.map(node => ({ html: node.html, target: node.target, failure: node.failureSummary })) })));
      fs.writeFileSync(path.join(out, name + '-axe.json'), JSON.stringify(violations, null, 2));
      assert.equal(violations.length, 0, name + ': accessibility failures saved in ' + name + '-axe.json');
      return [];
    };
    const targets = async () => {
      const sizes = await page.locator('[data-perception-lab] button, [data-perception-guided-setting], [data-perception-guided-value], [data-perception-study-selector]').evaluateAll(nodes => nodes.filter(node => node.offsetWidth && node.offsetHeight).map(node => ({ name: node.textContent.trim().slice(0, 80), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
      assert(sizes.every(size => size.width >= 44 && size.height >= 44), 'Controls smaller than 44px: ' + JSON.stringify(sizes.filter(size => size.width < 44 || size.height < 44)));
    };
    let completed;
    for (const fixture of fixtures) {
      phase = fixture.id + '-workflow'; await mount(seed(fixture)); const before = await state(); await open();
      const options = await setting().locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, disabled: node.disabled })));
      assert(options.some(option => option.value === fixture.key && !option.disabled));
      assert(!options.some(option => ['target', 'matching', 'matchValue', 'reveal', 'prediction', 'note'].includes(option.value)), 'Planner must expose surrounding settings only.');
      await plan(fixture.key, fixture.value); assert.deepEqual(await state(), before, 'Editing a local plan must preserve the drawing, pin and source records.');
      await noResults(); assert.equal(await page.locator('[data-perception-study-summary]').count(), 0);
      assert(!(await planner().innerText()).includes('Baseline note'), 'Baseline notes are not new-trial notes.');
      await button('Start planned study').click(); await focusIs('#perception-match-value');
      const started = await state(), groupId = await active().getAttribute('data-perception-repeat-active');
      assert(groupId && groupId !== 'baseline'); assert.equal(started.experiment, fixture.id); assert.deepEqual(started.studies, before.studies); assert.deepEqual(started.comparison, before.comparison);
      assert.deepEqual(started.models.moire, before.models.moire); assert.equal(started.models[fixture.id][fixture.key], fixture.value);
      assert.equal(started.models[fixture.id].matchValue, fixture.starts[0]); assert.equal(started.models[fixture.id].prediction, ''); assert.equal(started.models[fixture.id].note, ''); assert.equal(started.models[fixture.id].reveal, false);
      assert.equal(await planner().count(), 0); assert.equal(await page.locator('#perception-stage-reference').count(), 0); assert.equal(await page.locator('[data-perception-study]').count(), 0);
      for (const label of ['Observe', 'Remove surroundings', 'Swap surroundings', 'Reveal measurements', 'Equalize drawing values', 'Save observation', 'Export SVG']) assert(await button(label).isDisabled(), label + ' must remain locked.');
      assert(await page.locator('#perception-' + fixture.key).isDisabled());
      for (let index = 0; index < 3; index++) {
        await record(fixture.b[index], 'Fresh repeat note ' + (index + 1)); const next = await state(), retained = next.studies.filter(item => item.repeat && item.repeat.id === groupId);
        assert.equal(retained.length, index + 1); assert.equal(retained[index].repeat.startValue, fixture.starts[index]); assert.equal(retained[index].model.note, 'Fresh repeat note ' + (index + 1)); assert.equal(retained[index].model.reveal, false);
        assert.deepEqual(next.studies.filter(item => item.repeat && item.repeat.id === 'baseline'), before.studies);
        assert.deepEqual(next.comparison, before.comparison); assert.deepEqual(next.models.moire, before.models.moire);
        if (index < 2) { assert.equal(next.models[fixture.id].matchValue, fixture.starts[index + 1]); assert.equal(next.models[fixture.id].note, ''); assert.equal(next.models[fixture.id].prediction, ''); await focusIs('#perception-match-value'); }
        await noResults();
      }
      assert.equal(await active().count(), 0, 'Completed guided study must leave active recording.');
      assert.equal(await page.locator('[data-perception-study-review]').count(), 1);
      assert.equal(await page.locator('[data-perception-study-selector]').inputValue(), groupId);
      assert.equal(await button('Reveal saved study').count(), 1); assert.equal(await button('Reveal comparison study').count(), 1);
      await button('Reveal comparison study').click(); await noResults();
      assert((await state()).studies.filter(item => item.repeat.id === groupId).every(item => item.model.reveal));
      assert((await state()).studies.filter(item => item.repeat.id === 'baseline').every(item => !item.model.reveal));
      await button('Reveal saved study').click(); assert.equal(await pairResults().count(), 1);
      const result = await page.evaluate(groupId => StemLab.PerceptionEngine.compareStudies(__state.perceptionLab, 'baseline', groupId), groupId);
      assert.equal(result.status, 'ready'); assert.equal(result.reference, fixture.reference); assert.equal(result.startsDiffer, false);
      assert.deepEqual(result.changes.map(change => change.key), [fixture.key]); assert.equal(result.changes[0].active, true);
      assert.deepEqual(result.summaryA.starts, fixture.starts); assert.deepEqual(result.summaryB.starts, fixture.starts); assert.deepEqual(result.summaryB.values, fixture.b);
      await noOverflow(); await targets(); await audit('guided-' + fixture.id);
      await page.screenshot({ path: path.join(out, 'guided-' + fixture.id + '.png'), fullPage: true });
      completed = await state(); checks.push({ experiment: fixture.id, surroundingSetting: fixture.key, plannedValue: fixture.value, fixedReference: fixture.reference, reusedActualStarts: fixture.starts, plannerPreservesState: true, freshTrialNotesAndPredictions: true, frozenSettings: true, independentReveals: true, automaticSavedPairReview: true, axe: [] });
    }

    phase = 'inactive-settings'; await mount(seed(fixtures[0], { model: { context: false } })); await open();
    const hiddenOptions = await setting().locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, disabled: node.disabled })));
    assert.deepEqual(hiddenOptions.filter(option => !option.disabled && option.value).map(option => option.value), ['context']);
    await mount(seed(fixtures[0], { model: { contrast: 0 } })); await open();
    const zeroOptions = await setting().locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, disabled: node.disabled })));
    assert(!zeroOptions.some(option => option.value === 'swap' && !option.disabled), 'Trading identical brightness backgrounds cannot be a controlled setting.');
    checks.push({ removedSurroundingsPermitContextOnly: true, zeroBrightnessContrastDisablesSwap: true });

    phase = 'cancel-plan'; await mount(seed(fixtures[2])); const cancelBefore = await state(); await open(); await plan('angle', 65);
    await button('Cancel study plan').click(); assert.equal(await planner().count(), 0); assert.equal(await active().count(), 0); assert.deepEqual(await state(), cancelBefore);
    checks.push({ cancelPreservesDrawingAndSavedRecords: true });
    for (const change of [{ key: 'context', value: true, model: { context: false } }, { key: 'context', value: false, model: {} }, { key: 'swap', value: true, model: {} }]) {
      phase = 'toggle-' + change.key + '-' + change.value; await mount(seed(fixtures[1], { model: change.model })); const before = await state(); await open(); await plan(change.key, change.value);
      assert.deepEqual(await state(), before); assert.equal(await planner().getAttribute('data-perception-guided-status'), 'ready');
      await button('Start planned study').click(); await focusIs('#perception-match-value');
      assert.equal((await state()).models.ebbinghaus[change.key], change.value); assert.equal((await state()).models.ebbinghaus.matchValue, fixtures[1].starts[0]);
      assert.deepEqual((await state()).studies, before.studies); assert.deepEqual((await state()).comparison, before.comparison);
      await button('End repeated study').click(); assert.equal(await active().count(), 0); assert.deepEqual((await state()).studies, before.studies);
      checks.push({ toggleSetting: change.key, plannedBoolean: change.value, freshStart: true, endedWithoutSavingOrRevealing: true });
    }

    phase = 'cap-preflight'; const full = seed(fixtures[0], { extras: Array.from({ length: 21 }, (_, index) => ({ id: 'later-' + index, experiment: 'necker', model: { prediction: 'Unsure' } })) });
    await mount(full); const fullBefore = await state(); await open(); await plan('contrast', 25);
    assert(await button('Start planned study').isDisabled(), 'A plan must not start when its three matches would evict its baseline.');
    assert(/notebook|room|space|24|retain|capacity|delete/i.test(await planner().innerText()), 'Blocked capacity needs an explanation.');
    assert.deepEqual(await state(), fullBefore); assert.equal(await active().count(), 0);
    checks.push({ fullNotebookProtectsBaseline: true, preflightNoPartialMutation: true });

    phase = 'stale-plan'; await mount(seed(fixtures[0])); await open(); await plan('contrast', 25);
    await page.evaluate(() => { const start = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'Start planned study'); ReactDOM.unstable_batchedUpdates(() => { __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({}) })); start.click(); }); });
    assert.equal((await state()).studies.length, 0); assert.equal(await active().count(), 0); assert.equal(await planner().count(), 0);
    checks.push({ batchedExternalReplacementCancelsStart: true, baselineNotResurrected: true });
    await mount(seed(fixtures[0])); await open(); const profileBefore = await state(); await page.evaluate(() => __setProfile('other-learner'));
    assert.equal(await planner().count(), 0); assert.equal(await active().count(), 0); assert.deepEqual(await state(), profileBefore);
    checks.push({ profileClearsLocalPlanner: true, hostOwnsPersistedNotebook: true });
    for (const replacement of ['profile', 'notebook']) {
      phase = 'deferred-start-' + replacement; await mount(seed(fixtures[0])); await open(); await plan('contrast', 25); const before = await state();
      await page.evaluate(() => { window.__deferToolWrites = true; window.__deferredToolWrites = []; }); await button('Start planned study').click();
      assert.equal(await page.evaluate(() => window.__deferredToolWrites.length), 1, 'Host must have one intentionally deferred update.');
      if (replacement === 'profile') await page.evaluate(() => __setProfile('other-learner'));
      else await page.evaluate(() => __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({}) })));
      await page.evaluate(() => { window.__deferToolWrites = false; __edit(window.__deferredToolWrites.shift()); });
      assert.equal(await active().count(), 0); assert.equal(await planner().count(), 0);
      assert.deepEqual(await state(), replacement === 'profile' ? before : await page.evaluate(() => StemLab.PerceptionEngine.normalize({})));
      checks.push({ deferredStartCanceledBy: replacement, queuedUpdaterDoesNotChangeReplacement: true });
    }
    phase = 'cancel-deferred-start'; await mount(seed(fixtures[2])); await open(); await plan('angle', 65); const deferredCancelBefore = await state();
    await page.evaluate(() => { window.__deferToolWrites = true; window.__deferredToolWrites = []; }); await button('Start planned study').click();
    assert.equal(await page.evaluate(() => window.__deferredToolWrites.length), 1); assert.equal(await page.locator('[data-perception-study]').count(), 0);
    assert(await button('Cancel study plan').isVisible(), 'Cancel must stay reachable while a host Start update is pending.'); await button('Cancel study plan').click();
    await page.evaluate(() => { window.__deferToolWrites = false; __edit(window.__deferredToolWrites.shift()); });
    assert.equal(await active().count(), 0); assert.equal(await planner().count(), 0); assert.deepEqual(await state(), deferredCancelBefore);
    await button('Plan one-setting repeat').click(); assert.equal(await planner().count(), 1); assert.deepEqual(await state(), deferredCancelBefore);
    checks.push({ canceledDeferredStartPreservesState: true, cancelReachableWhileNotebookMasked: true, canceledUpdaterDoesNotResurrectStudy: true, plannerReopens: true });

    phase = 'responsive'; console.log(JSON.stringify({ phase, groupsPassed: checks.length }));
    for (const width of [320, 390, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 }); await mount(seed(fixtures[2])); await open(); await plan('angle', 65);
      await noOverflow(); await targets(); await audit('guided-planner-' + width); await page.screenshot({ path: path.join(out, 'guided-planner-' + width + '.png'), fullPage: true });
      if (width === 390 || width === 1600) await planner().screenshot({ path: path.join(out, 'guided-planner-panel-' + width + '.png') });
      await button('Start planned study').click(); await noOverflow(); await targets(); await audit('guided-recording-' + width);
      await page.screenshot({ path: path.join(out, 'guided-recording-' + width + '.png'), fullPage: true });
      checks.push({ viewport: width, plannerAndRecording: true, noOverflow: true, controls44px: true, axe: [] });
    }
    phase = 'themes'; await page.setViewportSize({ width: 1600, height: 1100 });
    for (const theme of [{ name: 'dark', dark: true }, { name: 'contrast', contrast: true }, { name: 'forced-light', forced: true }, { name: 'forced-dark', dark: true, forced: true, scheme: 'dark' }, { name: 'forced-contrast', contrast: true, forced: true }]) {
      phase = theme.name; await page.emulateMedia({ forcedColors: theme.forced ? 'active' : 'none', colorScheme: theme.scheme || 'light' }); await mount(seed(fixtures[2]), !!theme.dark, !!theme.contrast); await open(); await plan('angle', 65);
      await noOverflow(); await targets(); await audit('guided-' + theme.name); await page.screenshot({ path: path.join(out, 'guided-' + theme.name + '.png'), fullPage: true });
      await planner().screenshot({ path: path.join(out, 'guided-' + theme.name + '-panel.png') });
      const styles = await planner().evaluate(node => ({ forcedColors: matchMedia('(forced-colors: active)').matches, theme: document.querySelector('[data-perception-lab]').dataset.perceptionTheme, color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor, fields: Array.from(node.querySelectorAll('input,select,button')).map(element => ({ tag: element.tagName, text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, disabled: element.disabled })) }));
      fs.writeFileSync(path.join(out, 'guided-' + theme.name + '-computed.json'), JSON.stringify(styles, null, 2));
      checks.push({ theme: theme.name, plannerAndControlsPresent: true, noOverflow: true, controls44px: true, axe: [] });
    }
    phase = 'large-text'; await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' }); await mount(seed(fixtures[2]), true); await open(); await plan('angle', 65);
    await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow(); await targets(); await audit('guided-large-text');
    await page.screenshot({ path: path.join(out, 'guided-large-text.png'), fullPage: true }); checks.push({ text200Percent: true, noOverflow: true, controls44px: true, axe: [] });
    assert.deepEqual(errors, []); const finalSourceSHA256 = sourceSHA256(); assert.equal(finalSourceSHA256, loadedSourceSHA256, 'Source changed during browser QA; rerun against final code.');
    fs.writeFileSync(path.join(out, 'guided-browser-results.json'), JSON.stringify({ checks, errors, loadedSourceSHA256, finalSourceSHA256, sourceSHA256: finalSourceSHA256 }, null, 2));
    console.log(JSON.stringify({ passed: true, groups: checks.length, errors }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'guided-browser-failure.json'), JSON.stringify({ phase, checks, errors, loadedSourceSHA256, error: error.stack || String(error) }, null, 2));
    console.error('Guided QA failed in ' + phase + ': ' + error.message); process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
