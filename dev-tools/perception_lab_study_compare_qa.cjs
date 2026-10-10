'use strict';
// Real Chromium checks for comparisons between independent saved match studies.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { PNG } = require(path.resolve('node_modules/playwright-core/lib/utilsBundle'));
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-compare');
fs.mkdirSync(out, { recursive: true });
// Preserve the diagnosed pre-fix forced-color cascade before the final rerun.
if (fs.existsSync(path.join(out, 'comparison-browser-failure.json'))) {
  const failure = JSON.parse(read(path.join(out, 'comparison-browser-failure.json')));
  if (failure.phase === 'forced-colors') {
    const before = path.join(out, 'before-fix'); fs.mkdirSync(before, { recursive: true });
    for (const name of ['comparison-browser-failure.json', 'comparison-forced-colors-axe.json', 'comparison-forced-colors-computed.json', 'comparison-forced-colors-axe-full-viewport.json', 'comparison-forced-colors.png']) {
      if (fs.existsSync(path.join(out, name)) && !fs.existsSync(path.join(before, name))) fs.copyFileSync(path.join(out, name), path.join(before, name));
    }
  }
}
const sourceSHA256 = () => require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
if (fs.existsSync(path.join(out, 'comparison-browser-results.json'))) {
  const previous = JSON.parse(read(path.join(out, 'comparison-browser-results.json')));
  if (previous.sourceSHA256 !== sourceSHA256()) {
    const before = path.join(out, 'before-label-fix'); fs.mkdirSync(before, { recursive: true });
    for (const name of ['comparison-browser-results.json', 'comparison-forced-colors.png', 'comparison-forced-contrast.png', 'comparison-forced-colors-computed.json', 'comparison-forced-contrast-computed.json', 'comparison-forced-dark-probe-pressed.json', 'comparison-forced-dark-probe-pressed-0.png', 'comparison-forced-dark-probe-pressed-1.png', 'comparison-forced-contrast-probe-pressed.json', 'comparison-forced-contrast-probe-pressed-0.png', 'comparison-forced-contrast-probe-pressed-1.png']) {
      if (fs.existsSync(path.join(out, name)) && !fs.existsSync(path.join(before, name))) fs.copyFileSync(path.join(out, name), path.join(before, name));
    }
  }
}
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('isContrast: false', 'isContrast:!!window.__qaContrast')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
const experiments = [
  { id: 'brightness', reference: 128, a: [120, 132, 142], b: [130, 142, 152], starts: [72, 184, 100], shift: 10, percent: null },
  { id: 'ebbinghaus', reference: 48, a: [44, 50, 54], b: [48, 53, 60], starts: [40, 60, 44], shift: 3, percent: 6.25 },
  { id: 'mullerLyer', reference: 400, a: [380, 410, 425], b: [400, 430, 445], starts: [325, 475, 363], shift: 20, percent: 5 },
];
function records(fixture, groupId, values, revealed = true, model = {}, starts = fixture.starts) {
  return [1, 2, 3].map((trial, index) => ({
    id: groupId + '-' + trial, experiment: fixture.id, date: '2026-10-03T14:00:0' + trial + '.000Z',
    model: { matching: true, reveal: revealed, prediction: fixture.id === 'mullerLyer' ? 'Top' : 'Left', note: 'Independent note ' + groupId + '-' + trial, matchValue: values[index], ...model },
    repeat: { id: groupId, trial, startValue: starts[index] },
  }));
}
function seedPair(fixture, { hiddenA = false, hiddenB = false, settingsA = {}, settingsB = {}, startsB = fixture.starts, extras = [] } = {}) {
  return { experiment: 'moire', studies: [...records(fixture, 'study-a', fixture.a, !hiddenA, settingsA), ...records(fixture, 'study-b', fixture.b, !hiddenB, settingsB, startsB), ...extras],
    models: { moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' }, brightness: { target: 180, note: 'Separate brightness draft' } },
    comparison: { experiment: 'necker', model: { depth: 72, cue: 'front', note: 'Pinned cube' } } };
}

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [], checks = [];
  const loadedSourceSHA256 = sourceSHA256();
  let phase = 'mount-and-workflows';
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    const mount = async (state = {}, dark = false, contrast = false) => page.evaluate(({ state, dark, contrast }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); window.__qaContrast = contrast; document.getElementById('slot').className = contrast ? 'theme-contrast' : dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, StemLab.PerceptionEngine.normalize(state)); }, { state, dark, contrast });
    const state = () => page.evaluate(() => __state.perceptionLab);
    const button = label => page.getByRole('button', { name: label, exact: true });
    const row = id => page.locator('[data-perception-study="' + id + '"]');
    const selector = () => page.locator('[data-perception-study-selector]');
    const comparison = () => page.locator('[data-perception-study-comparison]');
    const results = () => page.locator('[data-perception-study-pair-results]');
    const plot = () => page.locator('[data-perception-study-plot]');
    const enginePair = () => page.evaluate(() => StemLab.PerceptionEngine.compareStudies(__state.perceptionLab, 'study-a', 'study-b'));
    const open = async () => { await row('study-a-1').getByRole('button', { name: 'Review study', exact: true }).click(); await selector().selectOption('study-b'); };
    const revealReading = async () => { if (!await page.locator('.perception-reading a').count()) await button('Reveal measurements').click(); assert.equal(await page.locator('.perception-reading a').count(), 1, 'A revealed drawing must expose its reading link for theme checks.'); };
    const noResults = async () => { assert.equal(await results().count(), 0); assert.equal(await plot().count(), 0); };
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The viewport must not overflow horizontally.');
    const paint = async () => page.evaluate(() => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Committed-paint barrier did not receive two animation frames within 10 seconds.')), 10000);
      requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
    }));
    const axe = async () => { await paint(); return page.evaluate(async () => (await window.axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length, details: v.nodes.map(n => ({ html: n.html, target: n.target, failure: n.failureSummary, checks: n.any })) }))); };
    const stageAudit = async name => {
      const audit = await axe(); fs.writeFileSync(path.join(out, 'comparison-' + name + '-axe.json'), JSON.stringify(audit, null, 2));
      const target = audit[0]?.details[0]?.target.join(' ') || '.perception-eyebrow';
      const computed = await page.evaluate(target => {
        const node = document.querySelector(target), root = document.querySelector('[data-perception-lab]'), rect = node.getBoundingClientRect(), ancestors = [];
        for (let parent = node; parent; parent = parent.parentElement) { const style = getComputedStyle(parent), box = parent.getBoundingClientRect(); ancestors.push({ tag: parent.tagName, class: parent.className, background: style.backgroundColor, color: style.color, forcedColorAdjust: style.forcedColorAdjust, opacity: style.opacity, rect: { left: box.left, top: box.top, width: box.width, height: box.height } }); }
        const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2)), y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
        const samples = ['button[aria-pressed=true]', '.perception-reading a'].map(selector => { const element = root.querySelector(selector); if (!element) return { selector, missing: true }; const style = getComputedStyle(element); return { selector, text: element.textContent, color: style.color, background: style.backgroundColor, forcedColorAdjust: style.forcedColorAdjust }; });
        return { target, axeVersion: axe.version, forcedColors: matchMedia('(forced-colors: active)').matches, theme: root.dataset.perceptionTheme, scrollY, viewport: { width: innerWidth, height: innerHeight }, rootVariables: { ink: getComputedStyle(root).getPropertyValue('--pl-ink'), soft: getComputedStyle(root).getPropertyValue('--pl-soft'), panel: getComputedStyle(root).getPropertyValue('--pl-panel'), ground: getComputedStyle(root).getPropertyValue('--pl-ground') }, samples, ancestors, hit: document.elementsFromPoint(x, y).map(element => ({ tag: element.tagName, class: element.className, background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color })) };
      }, target);
      fs.writeFileSync(path.join(out, 'comparison-' + name + '-computed.json'), JSON.stringify(computed, null, 2));
      if (audit.length) {
        console.error(JSON.stringify({ phase: name, violations: audit.map(v => ({ id: v.id, nodes: v.nodes })), detailFile: 'comparison-' + name + '-axe.json' }));
        const viewport = page.viewportSize(), height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: viewport.width, height });
        fs.writeFileSync(path.join(out, 'comparison-' + name + '-axe-full-viewport.json'), JSON.stringify(await axe(), null, 2));
        await page.setViewportSize(viewport);
      }
      return audit;
    };
    const targets = async () => {
      const sizes = await page.locator('[data-perception-lab] button, [data-perception-study-selector]').evaluateAll(nodes => nodes.filter(n => n.offsetWidth && n.offsetHeight).map(n => ({ name: n.textContent.trim().slice(0, 70), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
      assert(sizes.every(size => size.width >= 44 && size.height >= 44), JSON.stringify(sizes.filter(size => size.width < 44 || size.height < 44)));
    };
    const pressedStyles = async (name, assertReadable = false) => {
      const data = await page.locator('[data-perception-lab] button[aria-pressed=true]').evaluateAll(nodes => nodes.map(node => {
        const styles = element => { const style = getComputedStyle(element); return { tag: element.tagName, text: element.textContent, color: style.color, background: style.backgroundColor, forcedColorAdjust: style.forcedColorAdjust, opacity: style.opacity }; };
        const box = node.getBoundingClientRect(), text = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) { if (!walker.currentNode.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(walker.currentNode); const rect = range.getBoundingClientRect(); text.push({ ...styles(walker.currentNode.parentElement), rect: { left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height } }); }
        return { html: node.outerHTML, button: styles(node), descendants: Array.from(node.querySelectorAll('*')).map(styles), box: { width: box.width, height: box.height }, text };
      }));
      const selected = page.locator('[data-perception-lab] button[aria-pressed=true]');
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = color => color.map(value => { value /= 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      for (let index = 0; index < await selected.count(); index++) {
        const png = PNG.sync.read(await selected.nth(index).screenshot({ path: path.join(out, 'comparison-' + name + '-pressed-' + index + '.png') }));
        const record = data[index], background = rgb(record.button.background); record.readability = [];
        for (const text of record.text) {
          const foreground = rgb(text.color).map((value, channel) => value * Number(text.opacity) + background[channel] * (1 - Number(text.opacity)));
          const lights = [luminance(foreground), luminance(background)].sort((a, b) => a - b), ratio = (lights[1] + 0.05) / (lights[0] + 0.05);
          const scaleX = png.width / record.box.width, scaleY = png.height / record.box.height;
          let pixels = 0, foregroundPixels = 0;
          for (let y = Math.max(0, Math.floor(text.rect.top * scaleY)); y < Math.min(png.height, Math.ceil((text.rect.top + text.rect.height) * scaleY)); y++) for (let x = Math.max(0, Math.floor(text.rect.left * scaleX)); x < Math.min(png.width, Math.ceil((text.rect.left + text.rect.width) * scaleX)); x++) {
            const offset = (y * png.width + x) * 4; pixels++;
            if (foreground.reduce((sum, value, channel) => sum + Math.abs(png.data[offset + channel] - value), 0) < 100) foregroundPixels++;
          }
          const coverage = foregroundPixels / pixels; record.readability.push({ text: text.text, contrastRatio: ratio, foregroundCoverage: coverage });
          if (assertReadable) { assert(ratio >= 4.5, 'Selected label contrast, including child opacity: ' + JSON.stringify(record.readability)); assert(coverage > 0.02 && coverage < 0.75, 'Selected label must render letter shapes rather than a solid foreground backplate: ' + JSON.stringify(record.readability)); }
        }
      }
      fs.writeFileSync(path.join(out, 'comparison-' + name + '-pressed.json'), JSON.stringify(data, null, 2));
      return data;
    };
    if (process.argv.includes('--theme-probe')) {
      for (const name of ['forced-dark-probe', 'forced-contrast-probe']) {
        phase = name; await mount(seedPair(experiments[2]), name === 'forced-dark-probe', name === 'forced-contrast-probe'); await revealReading(); await open();
        await page.emulateMedia({ forcedColors: 'active' }); await paint();
        const audit = await stageAudit(name), selected = await pressedStyles(name);
        await page.screenshot({ path: path.join(out, 'comparison-' + name + '.png'), fullPage: true });
        console.log(JSON.stringify({ phase, axe: audit.map(v => ({ id: v.id, nodes: v.nodes })), selected }));
      }
      return;
    }
    let readySeed;
    for (const fixture of experiments) {
      await mount(seedPair(fixture, { hiddenB: true }));
      const before = await state();
      await open();
      assert.deepEqual(await state(), before, 'Selecting a saved group must not reveal or edit it.');
      assert.equal((await enginePair()).status, 'hidden'); await noResults();
      assert.equal(await selector().inputValue(), 'study-b');
      await button('Reveal comparison study').click();
      const paired = await enginePair(), after = await state(), text = await results().innerText();
      assert.equal(paired.status, 'ready'); assert.equal(paired.reference, fixture.reference);
      assert.equal(paired.medianShift, fixture.shift); assert.equal(paired.percentShift, fixture.percent);
      assert(text.includes('+' + fixture.shift), text);
      if (fixture.percent === null) assert(!text.includes('%'), 'RGB shift must not be represented as a percentage.');
      else assert(text.includes(fixture.percent + '%'), text);
      assert.deepEqual(after.models, before.models); assert.deepEqual(after.comparison, before.comparison); assert.equal(after.experiment, before.experiment);
      assert(after.studies.every(record => record.model.reveal));
      const graphic = await plot().evaluate(node => {
        const textFor = attribute => (node.getAttribute(attribute) || '').trim().split(/\s+/).filter(Boolean).map(id => {
          const target = document.getElementById(id); return target ? target.textContent.trim() : null;
        });
        const geometry = (mark, key) => {
          const track = mark.closest('[data-perception-pair-track]');
          const box = mark.getBoundingClientRect(), bounds = track?.getBoundingClientRect();
          return { value: Number(mark.dataset[key]), x: box.left + box.width / 2, track: track?.dataset.perceptionPairTrack,
            trackLeft: bounds?.left, trackWidth: bounds?.width };
        };
        return { role: node.getAttribute('role'), label: textFor('aria-labelledby'), description: textFor('aria-describedby'),
          hasBounds: node.hasAttribute('data-perception-pair-min') && node.hasAttribute('data-perception-pair-max'), min: Number(node.dataset.perceptionPairMin), max: Number(node.dataset.perceptionPairMax),
          tracks: Array.from(node.querySelectorAll('[data-perception-pair-track]')).map(track => {
            const bounds = track.getBoundingClientRect(); return { left: bounds.left, width: bounds.width };
          }),
          values: Array.from(node.querySelectorAll('[data-perception-pair-value]')).map(mark => geometry(mark, 'perceptionPairValue')),
          medians: Array.from(node.querySelectorAll('[data-perception-pair-median]')).map(mark => geometry(mark, 'perceptionPairMedian')),
          references: Array.from(node.querySelectorAll('[data-perception-pair-reference]')).map(mark => geometry(mark, 'perceptionPairReference')) };
      });
      assert.equal(graphic.role, 'img');
      assert(graphic.label.length && graphic.label.every(Boolean), 'Plot needs a resolved accessible title.');
      assert(graphic.description.length && graphic.description.every(Boolean), 'Plot needs a resolved accessible description.');
      assert(graphic.hasBounds && Number.isFinite(graphic.min) && Number.isFinite(graphic.max) && graphic.max > graphic.min, 'Plot needs an explicit positive shared domain.');
      assert.equal(graphic.values.length, 6); assert.equal(graphic.medians.length, 2); assert.equal(graphic.references.length, 2);
      assert.deepEqual(graphic.values.map(dot => dot.value), fixture.a.concat(fixture.b));
      assert.deepEqual(graphic.medians.map(mark => mark.value), [paired.summaryA.median, paired.summaryB.median]);
      assert.deepEqual(graphic.references.map(mark => mark.value), [fixture.reference, fixture.reference]);
      assert.equal(graphic.tracks.length, 2);
      assert(graphic.tracks.every(track => Number.isFinite(track.width) && track.width > 0), 'Both tracks must occupy real space.');
      assert(Math.abs(graphic.tracks[0].left - graphic.tracks[1].left) <= 0.75 && Math.abs(graphic.tracks[0].width - graphic.tracks[1].width) <= 0.75, 'Both rows must share the same rendered horizontal scale.');
      for (const mark of graphic.values.concat(graphic.medians, graphic.references)) {
        const expected = (mark.value - graphic.min) / (graphic.max - graphic.min);
        assert(mark.track && Number.isFinite(mark.x) && Number.isFinite(mark.trackLeft) && mark.trackWidth > 0, 'Every plotted mark must belong to a measurable track.');
        assert(expected >= 0 && expected <= 1, 'The shared domain must contain every plotted value.');
        assert(Math.abs(mark.x - mark.trackLeft - expected * mark.trackWidth) <= 0.75, 'Every rendered mark must use the shared linear scale.');
      }
      assert((await results().locator('table').count()) >= 1, 'A readable data table must accompany the plot.');
      await noOverflow(); await targets(); assert.deepEqual(await axe(), []);
      await page.screenshot({ path: path.join(out, 'comparison-' + fixture.id + '.png'), fullPage: true });
      readySeed = after;
      checks.push({ experiment: fixture.id, selectDoesNotReveal: true, sharedReference: fixture.reference, medianBMinusA: fixture.shift, percentOfFixedGeometryReference: fixture.percent, RGBNoPercent: fixture.id === 'brightness', independentSavedGroupReveal: true, draftsAndPinPreserved: true, accessiblePlotAndTable: true, axe: [] });
    }

    await mount(seedPair(experiments[0], { hiddenA: true, hiddenB: true })); await open();
    await button('Reveal comparison study').click(); await noResults();
    assert((await state()).studies.filter(record => record.repeat.id === 'study-b').every(record => record.model.reveal));
    assert((await state()).studies.filter(record => record.repeat.id === 'study-a').every(record => !record.model.reveal));
    await button('Reveal saved study').click(); assert.equal((await enginePair()).status, 'ready'); assert.equal(await results().count(), 1);
    const revealed = await state(); await button('Clear study comparison').click(); await noResults(); assert.deepEqual(await state(), revealed);
    checks.push({ eachSavedGroupRequiresItsOwnReveal: true, clearingSelectionPreservesAllData: true });

    // Multiple changed drawing settings and descriptive starts are not one controlled variable.
    const multi = seedPair(experiments[2], { settingsA: { context: false, angle: 25, fin: 35 }, settingsB: { context: false, angle: 60, fin: 70, swap: true }, startsB: [330, 470, 365] });
    await mount(multi); await open();
    const conditions = await enginePair(), conditionText = await comparison().innerText();
    assert.equal(conditions.startsDiffer, true); assert.equal(conditions.changes.length, 3); assert(conditions.changes.every(change => change.active === false));
    assert(/inactive|removed|hidden/i.test(conditionText), conditionText);
    assert(/starting|start positions|starts/i.test(conditionText), conditionText);
    await page.screenshot({ path: path.join(out, 'comparison-context-hints.png'), fullPage: true });
    checks.push({ removedSurroundingsMakeControlsInactive: true, descriptiveStartingPositionsDiffer: true });
    await mount(seedPair(experiments[2], { settingsA: { angle: 25, fin: 35 }, settingsB: { angle: 60, fin: 70, swap: true } })); await open();
    assert((await enginePair()).changes.filter(change => change.active).length > 1);
    const activeText = await comparison().innerText(); assert(/multiple|more than one|several/i.test(activeText), activeText);
    checks.push({ multipleActiveSettingsExplainedWithoutClaimingOneVariable: true });

    const incompatible = seedPair(experiments[0], { extras: [...records(experiments[1], 'other-experiment', experiments[1].b), ...records(experiments[0], 'other-reference', experiments[0].b, true, { target: 190 }), ...records(experiments[0], 'partial', experiments[0].b).slice(0, 2)] });
    await mount(incompatible); await row('study-a-1').getByRole('button', { name: 'Review study', exact: true }).click();
    const options = await selector().locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: node.textContent, disabled: node.disabled })));
    assert(!options.some(option => option.value === 'study-a'));
    for (const id of ['other-experiment', 'other-reference', 'partial']) assert(options.some(option => option.value === id && option.disabled && option.text), id + ' must have a disabled explained option.');
    await selector().selectOption('study-b'); assert.equal((await enginePair()).status, 'ready');
    checks.push({ sameGroupExcluded: true, experimentReferenceAndIncompleteChoicesExplainedAndDisabled: true });

    await mount(readySeed); await open();
    const originals = (await state()).studies;
    await row('study-b-2').getByRole('button', { name: 'Delete observation', exact: true }).click(); await noResults();
    assert.equal((await enginePair()).status, 'incomplete');
    assert.equal(await selector().inputValue(), 'study-b');
    await button('Undo deletion').click(); assert.deepEqual((await state()).studies, originals); assert.equal(await results().count(), 1);
    checks.push({ deletedMatchRemovesPairImmediately: true, retainedPairIDsRestoreOnUndo: true });

    const older = Array.from({ length: 18 }, (_, index) => ({ id: 'older-' + index, experiment: 'necker', model: { prediction: 'Unsure' } }));
    await mount(seedPair(experiments[2], { extras: older })); await open();
    assert.equal((await state()).studies.length, 24);
    await button('Save observation').click();
    assert.equal((await state()).studies.length, 24); assert(!(await state()).studies.some(record => record.id === 'study-a-1'));
    await noResults(); assert.equal((await enginePair()).status, 'incomplete');
    checks.push({ capEvictionInvalidatesPair: true, noCachedAggregateAfterEviction: true });

    for (const fixture of [experiments[0], experiments[2]]) {
      await mount(seedPair(fixture, { hiddenB: true })); await open();
      await page.evaluate(() => { const reveal = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'Reveal comparison study'); ReactDOM.unstable_batchedUpdates(() => { __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({}) })); reveal.click(); }); });
      assert.equal((await state()).studies.length, 0); await noResults();
      await page.waitForFunction(() => document.querySelector('.perception-status').textContent.includes('no longer available'), null, { timeout: 3000 });
      assert((await page.evaluate(() => __announced)).includes('no longer available'));
      checks.push({ staleRevealExperiment: fixture.id, externalReplacementExpiresRetainedComparisonReveal: true, noResurrectedRecordsOrFalseSuccess: true });
    }
    await mount(readySeed); await open(); const priorProfileState = await state();
    await page.evaluate(() => __setProfile('second-learner'));
    assert.equal(await comparison().count(), 0); await noResults(); assert.deepEqual(await state(), priorProfileState);
    checks.push({ profileClearsLocalReviewAndPair: true, persistedDataRemainsWithHost: true });

    phase = 'responsive'; console.log(JSON.stringify({ phase, workflowGroupsPassed: checks.length }));
    for (const width of [320, 390, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 }); await mount(readySeed); await open();
      await noOverflow(); await targets(); assert.deepEqual(await axe(), []);
      await page.screenshot({ path: path.join(out, 'comparison-ready-' + width + '.png'), fullPage: true });
      if (width === 390 || width === 1600) await comparison().screenshot({ path: path.join(out, 'comparison-panel-' + width + '.png') });
      await mount(seedPair(experiments[2], { hiddenB: true })); await open(); await noResults(); await noOverflow(); await targets(); assert.deepEqual(await axe(), []);
      checks.push({ viewport: width, hiddenAndReadyPairs: true, noOverflow: true, targets44: true, axe: [] });
    }
    phase = 'contrast'; console.log(JSON.stringify({ phase }));
    await page.setViewportSize({ width: 1600, height: 1100 }); await mount(readySeed, false, true); await revealReading(); await open();
    assert.equal(await page.locator('[data-perception-lab]').getAttribute('data-perception-theme'), 'contrast');
    await noOverflow(); await targets(); assert.equal((await stageAudit('contrast')).length, 0, 'Contrast-theme axe failures are saved in comparison-contrast-axe.json.');
    await page.screenshot({ path: path.join(out, 'comparison-contrast.png'), fullPage: true }); checks.push({ contrastThemeNoOverflowAndAxe: [] });
    phase = 'dark'; console.log(JSON.stringify({ phase }));
    await page.setViewportSize({ width: 1600, height: 1100 }); await mount(readySeed, true); await revealReading(); await open();
    await page.screenshot({ path: path.join(out, 'comparison-dark.png'), fullPage: true });
    fs.writeFileSync(path.join(out, 'comparison-dark-computed.json'), JSON.stringify(await page.evaluate(() => ['[data-perception-lab]', '.perception-card', '[data-perception-study-comparison]', '[data-perception-study-selector]'].map(selector => { const node = document.querySelector(selector), style = getComputedStyle(node); return { selector, theme: node.dataset.perceptionTheme, background: style.backgroundColor, color: style.color, panel: style.getPropertyValue('--pl-panel'), ground: style.getPropertyValue('--pl-ground'), inline: node.getAttribute('style') }; })), null, 2));
    await noOverflow(); await targets();
    const darkAudit = await axe();
    fs.writeFileSync(path.join(out, 'comparison-dark-axe.json'), JSON.stringify(darkAudit, null, 2));
    if (darkAudit.length) {
      const target = darkAudit[0].details[0].target.join(' ');
      const diagnostic = await page.evaluate(target => {
        const node = document.querySelector(target), rect = node.getBoundingClientRect();
        const ancestors = []; for (let parent = node; parent; parent = parent.parentElement) { const style = getComputedStyle(parent), box = parent.getBoundingClientRect(); ancestors.push({ tag: parent.tagName, class: parent.className, background: style.backgroundColor, backgroundImage: style.backgroundImage, color: style.color, opacity: style.opacity, position: style.position, zIndex: style.zIndex, transform: style.transform, rect: { left: box.left, top: box.top, width: box.width, height: box.height } }); }
        const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2)), y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
        return { target, scrollY, viewport: { width: innerWidth, height: innerHeight }, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, ancestors, hit: document.elementsFromPoint(x, y).map(element => ({ tag: element.tagName, class: element.className, background: getComputedStyle(element).backgroundColor })) };
      }, target);
      fs.writeFileSync(path.join(out, 'comparison-dark-geometry.json'), JSON.stringify(diagnostic, null, 2));
      await page.evaluate(() => scrollTo(0, 0));
      fs.writeFileSync(path.join(out, 'comparison-dark-axe-top.json'), JSON.stringify(await axe(), null, 2));
      const viewport = page.viewportSize(), height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: viewport.width, height });
      const fullAudit = await axe(); fs.writeFileSync(path.join(out, 'comparison-dark-axe-full-viewport.json'), JSON.stringify(fullAudit, null, 2));
      await page.setViewportSize(viewport);
      assert.deepEqual(fullAudit, [], 'The entire committed dark tool must pass contrast auditing.');
      checks.push({ darkAxeOffscreenGeometryDiagnostic: true, initialViolations: darkAudit.map(v => ({ id: v.id, nodes: v.nodes })), fullDocumentViewportAxe: [] });
    }
    await page.screenshot({ path: path.join(out, 'comparison-dark.png'), fullPage: true }); checks.push({ darkNoOverflowAndAxe: [] });
    phase = 'large-text'; console.log(JSON.stringify({ phase, darkAxePassed: true }));
    await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow(); await targets();
    assert.equal((await stageAudit('large-text')).length, 0, 'Large-text axe failures are saved in comparison-large-text-axe.json.');
    await page.screenshot({ path: path.join(out, 'comparison-large-text.png'), fullPage: true }); checks.push({ text200PercentNoOverflowAndAxe: [] });
    phase = 'forced-colors'; console.log(JSON.stringify({ phase, largeTextPassed: true }));
    await page.evaluate(() => document.documentElement.style.fontSize = ''); await page.emulateMedia({ forcedColors: 'active' });
    await noOverflow(); assert.equal(await plot().count(), 1);
    await page.screenshot({ path: path.join(out, 'comparison-forced-colors.png'), fullPage: true });
    await pressedStyles('forced-colors', true);
    assert.equal((await stageAudit('forced-colors')).length, 0, 'Forced-colors axe failures are saved in comparison-forced-colors-axe.json.');
    await page.screenshot({ path: path.join(out, 'comparison-forced-colors.png'), fullPage: true }); checks.push({ forcedColorsPlotPresentAndAxe: [] });
    phase = 'forced-contrast'; console.log(JSON.stringify({ phase }));
    await mount(readySeed, false, true); await revealReading(); await open(); await noOverflow(); await targets(); await pressedStyles('forced-contrast', true);
    assert.equal((await stageAudit('forced-contrast')).length, 0, 'Forced contrast-theme axe failures are saved in comparison-forced-contrast-axe.json.');
    await page.screenshot({ path: path.join(out, 'comparison-forced-contrast.png'), fullPage: true }); checks.push({ forcedColorsContrastThemeButtonsLinksAndAxe: [] });
    phase = 'forced-os-dark'; console.log(JSON.stringify({ phase }));
    await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' }); await mount(readySeed, true); await revealReading(); await open(); await noOverflow(); await targets();
    await pressedStyles('forced-os-dark', true); assert.equal((await stageAudit('forced-os-dark')).length, 0, 'OS dark forced-palette failures are saved in comparison-forced-os-dark-axe.json.');
    await page.screenshot({ path: path.join(out, 'comparison-forced-os-dark.png'), fullPage: true }); checks.push({ forcedColorsOSDarkPaletteButtonsLinksPlotTableAndAxe: [] });
    assert.deepEqual(errors, []);
    phase = 'final-hash';
    const finalSourceSHA256 = sourceSHA256(); assert.equal(finalSourceSHA256, loadedSourceSHA256, 'Source changed during QA; rerun the final artifact.');
    fs.writeFileSync(path.join(out, 'comparison-browser-results.json'), JSON.stringify({ checks, errors, loadedSourceSHA256, finalSourceSHA256, sourceSHA256: finalSourceSHA256 }, null, 2));
    console.log(JSON.stringify({ groups: checks.length, errors, passed: true }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'comparison-browser-failure.json'), JSON.stringify({ phase, checks, errors, loadedSourceSHA256, error: error.stack || String(error) }, null, 2));
    console.error('Comparison QA failed in ' + phase + ': ' + error.message);
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
