'use strict';
// Real Chromium checks for immutable, actual recorded-trial SVG previews.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-drawing-viewer');
fs.mkdirSync(out, { recursive: true });
// Keep every earlier attempt when a source fix or interrupted run needs a rerun.
if (fs.existsSync(path.join(out, 'drawing-viewer-browser-results.json')) || fs.existsSync(path.join(out, 'drawing-viewer-browser-failure.json'))) {
  const previous = path.join(out, 'previous-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(previous);
  for (const item of fs.readdirSync(out, { withFileTypes: true })) if (item.isFile()) fs.copyFileSync(path.join(out, item.name), path.join(previous, item.name));
}
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright';
const sourceSHA256 = () => require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var init = {}; init[id] = state || {};', 'var init = {otherTool:{preserved:37}}; init[id] = state || {};')
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('isContrast: false', 'isContrast:!!window.__qaContrast')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
const fixtures = [
  { id: 'brightness', a: [81, 147, 203], b: [95, 156, 211], starts: [16, 240, 109], aModel: { target: 117, contrast: 65, swap: true }, bModel: { target: 117, contrast: 25, swap: false } },
  { id: 'ebbinghaus', a: [35, 53, 68], b: [40, 56, 70], starts: [32, 72, 51], aModel: { surround: 36, gap: 12, swap: false }, bModel: { surround: 45, gap: 20, swap: true } },
  { id: 'mullerLyer', a: [271, 409, 537], b: [294, 438, 522], starts: [250, 550, 411], aModel: { angle: 30, fin: 42, context: false }, bModel: { angle: 65, fin: 58, swap: true } },
];
const fullNote = trial => 'Recorded trial ' + trial + ': First line.\n' + 'Full note, retained word by word. '.repeat(12) + 'Last line of trial ' + trial + '.';
function records(fixture, groupId, values, revealed = true, settings = {}) {
  return [1, 2, 3].map((trial, index) => ({
    id: groupId + '-record-' + trial, experiment: fixture.id, date: '2026-10-04T14:0' + trial + ':00.000Z',
    model: { matching: true, reveal: revealed, prediction: fixture.id === 'mullerLyer' ? ['Top', 'Same', 'Bottom'][index] : ['Left', 'Same', 'Right'][index], note: fullNote(trial), matchValue: values[index], ...settings },
    repeat: { id: groupId, trial, startValue: fixture.starts[index] },
  }));
}
function seed(fixture = fixtures[0], options = {}) {
  const a = records(fixture, 'study-a', fixture.a, options.hiddenA !== true, fixture.aModel);
  const b = records(fixture, 'study-b', fixture.b, options.hiddenB !== true, fixture.bModel);
  const c = records(fixture, 'study-c', fixture.a.slice().reverse(), true, fixture.bModel);
  return { experiment: 'moire', models: { moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' }, brightness: { target: 180, note: 'Separate brightness draft' } }, studies: [...a, ...b, ...c], comparison: { experiment: 'necker', model: { depth: 72, cue: 'front', reveal: true, note: 'Pinned cube' } } };
}

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const checks = [], errors = [], loadedSourceSHA256 = sourceSHA256(); let phase = 'mount';
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })); await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) }); await page.addScriptTag({ content: shell });
    const mount = async (state = seed(), dark = false, contrast = false) => page.evaluate(({ state, dark, contrast }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); window.__qaContrast = contrast; document.documentElement.style.fontSize = ''; document.getElementById('slot').className = contrast ? 'theme-contrast' : dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, StemLab.PerceptionEngine.normalize(state)); }, { state, dark, contrast });
    const state = () => page.evaluate(() => __state.perceptionLab), allState = () => page.evaluate(() => __state);
    const button = name => page.getByRole('button', { name, exact: true });
    const preview = slot => page.locator('[data-perception-recorded-preview="' + slot + '"]');
    const scene = slot => page.locator('svg[data-perception-recorded-scene="' + slot + '"]');
    const trialControl = slot => page.locator('[data-perception-preview-trial="' + slot + '"]');
    const guides = slot => page.locator('[data-perception-preview-guides="' + slot + '"]');
    const openReview = async (id = 'study-a') => { await page.locator('[data-perception-study="' + id + '-record-1"]').getByRole('button', { name: 'Review study', exact: true }).click(); };
    const choosePair = async (id = 'study-b') => page.locator('[data-perception-study-selector]').selectOption(id);
    const openPair = async () => { await openReview(); await choosePair(); };
    const nativeInput = async (locator, value) => locator.evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); }, value);
    const edit = async change => page.evaluate(change => __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({ ...previous.perceptionLab, ...change }) })), change);
    const none = async slots => { for (const slot of slots) { assert.equal(await preview(slot).count(), 0); assert.equal(await scene(slot).count(), 0); } };
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Viewport must not overflow horizontally.');
    const paint = async () => page.evaluate(() => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No committed paint within 10 seconds.')), 10000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); })); }));
    const targets = async () => { const sizes = await page.locator('[data-perception-lab] button, [data-perception-preview-trial], [data-perception-study-selector], [data-perception-notebook-view], [data-perception-notebook-experiment], [data-perception-notebook-status], [data-perception-notebook-search]').evaluateAll(nodes => nodes.filter(node => node.offsetWidth && node.offsetHeight).map(node => ({ name: node.textContent.trim().slice(0, 80) || node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))); assert(sizes.every(size => size.width >= 44 && size.height >= 44), 'Controls smaller than 44px: ' + JSON.stringify(sizes.filter(size => size.width < 44 || size.height < 44))); };
    const audit = async name => { await page.evaluate(() => scrollTo(0, 0)); await paint(); const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.length, details: item.nodes.map(node => ({ html: node.html, target: node.target, failure: node.failureSummary })) }))); fs.writeFileSync(path.join(out, name + '-axe.json'), JSON.stringify(violations, null, 2)); assert.equal(violations.length, 0, name + ': accessibility failures saved in ' + name + '-axe.json'); };
    const accessibleSVGs = async () => { const info = await page.locator('[data-perception-lab] svg[role="img"]').evaluateAll(nodes => nodes.map(node => ({ viewBox: node.getAttribute('viewBox'), ids: node.getAttribute('aria-labelledby').split(/\s+/), namesResolve: node.getAttribute('aria-labelledby').split(/\s+/).every(id => document.getElementById(id)?.textContent.trim()), childIDs: [...node.querySelectorAll('title[id],desc[id]')].map(child => child.id) }))); const ids = info.flatMap(item => item.ids); assert.equal(ids.length, new Set(ids).size, 'Every SVG must have unique title and description IDs.'); assert(info.every(item => item.namesResolve && item.childIDs.length >= 1)); for (const slot of ['active', 'review', 'a', 'b']) if (await scene(slot).count()) assert.equal(await scene(slot).getAttribute('viewBox'), '0 0 800 480'); };
    // Compare complete SVG geometry with the selected persisted record; guides only change local reveal.
    const inspect = async (slot, groupId, trial, guideState = true) => {
      assert.equal(await trialControl(slot).inputValue(), String(trial)); assert.equal(await guides(slot).getAttribute('aria-pressed'), String(guideState)); assert.equal(await scene(slot).getAttribute('viewBox'), '0 0 800 480');
      assert.equal(await preview(slot).getByRole('combobox', { name: 'Recorded trial', exact: true }).count(), 1); assert.equal(await preview(slot).getByRole('button', { name: 'Show measurement guides', exact: true }).count(), 1);
      assert.deepEqual(await trialControl(slot).locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: node.textContent }))), [1, 2, 3].map(value => ({ value: String(value), text: 'Trial ' + value })));
      const actual = await scene(slot).evaluate(svg => { const convert = node => ({ tag: node.tagName.toLowerCase(), props: Object.fromEntries([...node.attributes].map(attr => [attr.name, attr.value]).sort(([a], [b]) => a.localeCompare(b))), children: [...node.childNodes].map(child => child.nodeType === Node.TEXT_NODE ? child.textContent : convert(child)) }); return [...svg.children].filter(child => !['title', 'desc'].includes(child.tagName.toLowerCase())).map(convert); });
      const expected = await page.evaluate(({ groupId, trial, guideState }) => { const record = __state.perceptionLab.studies.find(record => record.repeat?.id === groupId && record.repeat.trial === trial); if (!record) throw new Error('Selected recorded trial missing.'); const attr = key => ({ fontSize: 'font-size', fontFamily: 'font-family', textAnchor: 'text-anchor', strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap' }[key] || key); const convert = node => typeof node === 'string' ? node : ({ tag: node.tag.toLowerCase(), props: Object.fromEntries(Object.entries(node.props).map(([key, value]) => [attr(key), String(value)]).sort(([a], [b]) => a.localeCompare(b))), children: node.children.map(convert) }); return { nodes: StemLab.PerceptionEngine.scene(record.experiment, { ...record.model, reveal: guideState }).map(convert), record }; }, { groupId, trial, guideState });
      assert.deepEqual(actual, expected.nodes, slot + ' must render this actual trial, including its original surroundings.');
      const content = await preview(slot).innerText(); assert(content.includes(expected.record.model.prediction), 'Preview includes actual recorded impression.'); assert(content.replace(/\s+/g, ' ').includes(expected.record.model.note.replace(/\s+/g, ' ')), 'Preview includes the entire actual note.'); assert.equal(await preview(slot).locator('time').getAttribute('datetime'), expected.record.date);
      const target = await scene(slot).locator('[data-perception-target="right"]').evaluate(node => ({ tag: node.tagName.toLowerCase(), fill: node.getAttribute('fill'), r: Number(node.getAttribute('r')), x1: Number(node.getAttribute('x1')), x2: Number(node.getAttribute('x2')) })); const value = expected.record.model.matchValue;
      assert((await preview(slot).locator('[data-perception-recorded-values="' + slot + '"]').innerText()).includes(String(value)), 'Revealed actual values remain available when local guides are hidden.');
      if (expected.record.experiment === 'brightness') assert.equal(target.fill, 'rgb(' + value + ',' + value + ',' + value + ')');
      else if (expected.record.experiment === 'ebbinghaus') assert.equal(target.r, value / 2);
      else assert.equal(target.x2 - target.x1, value);
      if (guideState) assert(await scene(slot).locator('[data-perception-guide]').count()); else assert.equal(await scene(slot).locator('[data-perception-guide]').count(), 0);
      return expected.record;
    };

    const dialog = page.locator('[data-perception-drawing-viewer]');
    const open = async slot => { await page.locator('[data-perception-enlarge="' + slot + '"]').click(); await paint(); assert(await dialog.evaluate(node => node.open && node.matches(':modal'))); };
    const closed = async () => { await paint(); assert.equal(await dialog.evaluate(node => node.open), false); assert.equal(await scene('viewer').count(), 0); };
    const close = async () => { await button('Close enlarged drawing').click(); await closed(); };
    const focusInside = () => page.evaluate(() => document.querySelector('[data-perception-drawing-viewer]').contains(document.activeElement));
    for (const fixture of fixtures) {
      phase = fixture.id + '-actual-trials'; await mount({ ...seed(fixture), expanded: true }); await openReview();
      await trialControl('review').selectOption('3'); await guides('review').click(); const before = await allState();
      await open('review'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H2');
      for (const trial of [3, 2, 1]) { await trialControl('viewer').selectOption(String(trial)); await inspect('viewer', 'study-a', trial, false); }
      await guides('viewer').click(); await inspect('viewer', 'study-a', 1, true); await accessibleSVGs();
      for (let index = 0; index < 8; index++) { await page.keyboard.press('Tab'); assert(await focusInside(), 'Native modal must retain forward keyboard focus.'); }
      for (let index = 0; index < 8; index++) { await page.keyboard.press('Shift+Tab'); assert(await focusInside(), 'Native modal must retain reverse keyboard focus.'); }
      await page.keyboard.press('Escape'); await closed();
      assert.equal(await page.evaluate(() => document.activeElement.dataset.perceptionEnlarge), 'review');
      assert.equal(await trialControl('review').inputValue(), '1'); assert.equal(await guides('review').getAttribute('aria-pressed'), 'true'); assert.deepEqual(await allState(), before);
      await open('review'); await inspect('viewer', 'study-a', 1, true); await close();
      checks.push({ experiment: fixture.id, exactActualTrialGeometry: 3, preservedDraftPinNotebookAndExpansion: true, modalKeyboardFocus: true, escapeAndReturnFocus: true, localChoicesRetained: true });
    }
    for (const slot of ['a', 'b']) {
      phase = 'pair-' + slot; await mount(); await openPair(); await trialControl('a').selectOption('2'); await trialControl('b').selectOption('3'); const before = await allState();
      await open(slot); await inspect('viewer', slot === 'a' ? 'study-a' : 'study-b', slot === 'a' ? 2 : 3);
      await trialControl('viewer').selectOption('1'); await guides('viewer').click(); await close();
      assert.equal(await trialControl(slot === 'a' ? 'b' : 'a').inputValue(), slot === 'a' ? '3' : '2'); assert.deepEqual(await allState(), before);
      checks.push({ comparisonSlot: slot, independentSelections: true, preservedState: true });
    }
    for (const reason of ['hidden', 'partial', 'conflict']) {
      phase = 'gate-' + reason; const value = seed();
      if (reason === 'hidden') value.studies[0].model.reveal = false;
      if (reason === 'partial') value.studies = value.studies.filter(record => record.id !== 'study-a-record-3');
      if (reason === 'conflict') value.studies[1].model.contrast = 3;
      await mount(value); await openReview(); assert.equal(await page.locator('[data-perception-enlarge="review"]').count(), 0); await closed();
      checks.push({ blockedStudy: reason, noEnlargedContent: true });
    }
    for (const reason of ['remove', 'hide', 'note', 'settings', 'profile', 'pair', 'close-review']) {
      phase = 'invalidate-' + reason; await mount(); if (reason === 'pair') await openPair(); else await openReview(); await open(reason === 'pair' ? 'a' : 'review');
      await page.evaluate(reason => {
        if (reason === 'profile') { __setProfile('another-learner'); return; }
        if (reason === 'close-review') { [...document.querySelectorAll('button')].find(node => node.textContent === 'Close study review').click(); return; }
        __edit(previous => { const value = JSON.parse(JSON.stringify(previous)); const records = value.perceptionLab.studies;
          if (reason === 'remove') value.perceptionLab.studies = records.filter(record => record.id !== 'study-a-record-3');
          if (reason === 'pair') value.perceptionLab.studies = records.filter(record => record.id !== 'study-b-record-3');
          if (reason === 'hide') records[0].model.reveal = false;
          if (reason === 'note') records[0].model.note = 'Changed observation';
          if (reason === 'settings') records[1].model.contrast = 3;
          return value;
        });
      }, reason); await closed();
      assert(await page.evaluate(() => !document.querySelector('dialog:modal')));
      checks.push({ invalidatedBy: reason, closedWithoutStaleSVG: true });
    }
    phase = 'filter-and-draft'; await mount(); await openReview(); await open('review'); await trialControl('viewer').selectOption('3');
    await page.locator('[data-perception-notebook-search]').evaluate(node => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, 'no matching record'); node.dispatchEvent(new Event('input', { bubbles: true })); });
    await edit({ models: { ...(await state()).models, moire: { ...(await state()).models.moire, note: 'Updated live draft' } } }); await paint();
    assert(await dialog.evaluate(node => node.open)); assert.equal(await trialControl('viewer').inputValue(), '3'); await close(); checks.push({ filterAndUnrelatedDraftPreserveViewer: true });
    phase = 'active'; await mount({ expanded: true, models: { brightness: { matching: true } } }); await button('Start three matches').click();
    for (const value of [110, 140, 170]) { await nativeInput(page.locator('#perception-match-value'), value); await button('Same').click(); await button('Record match').click(); await paint(); }
    await button('Reveal study results').click(); await open('active'); assert.equal(await trialControl('viewer').inputValue(), '1'); await close(); checks.push({ activeStudyViewer: true });
    for (const width of [320, 390, 768, 1280, 1600]) {
      phase = 'width-' + width; await page.setViewportSize({ width, height: 1000 }); await mount(); await openReview(); await open('review');
      await noOverflow(); await targets(); await accessibleSVGs();
      const sizes = await dialog.evaluate(node => { const bounds = node.getBoundingClientRect(); return { viewport: innerWidth, dialog: bounds.width, x: bounds.x, right: bounds.right, content: node.clientWidth, scroll: node.scrollWidth }; });
      assert(sizes.x >= 0 && sizes.right <= width); assert(sizes.scroll <= sizes.content + 1); assert(sizes.dialog >= Math.min(width - 24, 1440) - 2);
      // Measure the projected drawing, not a wider SVG box that may contain letterboxing.
      const fit = await scene('viewer').evaluate(svg => {
        const figure = svg.closest('figure'), bounds = figure.getBoundingClientRect(), matrix = svg.getScreenCTM();
        if (!matrix) throw new Error('Recorded drawing has no screen matrix.');
        const corners = [[0, 0], [800, 0], [800, 480], [0, 480]].map(([x, y]) => { const point = new DOMPoint(x, y).matrixTransform(matrix); return { x: point.x, y: point.y }; });
        return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, expected: Math.min(figure.clientWidth / 800, innerHeight * .65 / 480), left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, center: bounds.left + bounds.width / 2, corners };
      });
      assert(fit.a > 0 && fit.d > 0); assert(Math.abs(fit.b) < 1e-8 && Math.abs(fit.c) < 1e-8);
      assert(Math.abs(fit.a - fit.d) < 1e-8); assert(Math.abs(fit.a - fit.expected) < .002);
      for (const point of fit.corners) assert(point.x >= fit.left - 1.5 && point.x <= fit.right + 1.5 && point.y >= fit.top - 1.5 && point.y <= fit.bottom + 1.5);
      assert(Math.abs((fit.corners[0].x + fit.corners[1].x) / 2 - fit.center) < 1.5);
      await audit('viewer-' + width); await dialog.screenshot({ path: path.join(out, 'viewer-' + width + '.png') });
      await preview('viewer').locator('.perception-recorded-note').scrollIntoViewIfNeeded(); assert(await preview('viewer').locator('.perception-recorded-note').isVisible());
      await close(); checks.push({ width, completeDrawingUsesAvailableFitSpace: true, noOverflow: true, fullNoteReachable: true, controls44px: true, axe: [] });
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    for (const theme of ['dark', 'contrast', 'forced-light', 'forced-dark']) {
      phase = theme; await page.emulateMedia({ forcedColors: theme.startsWith('forced') ? 'active' : 'none', colorScheme: theme === 'forced-dark' ? 'dark' : 'light' });
      await mount(seed(fixtures[1]), theme === 'dark', theme === 'contrast'); await openPair(); await open('b'); await noOverflow(); await targets();
      const colors = await scene('viewer').evaluate(svg => ({ background: getComputedStyle(svg).backgroundColor, forced: getComputedStyle(svg).forcedColorAdjust }));
      assert.equal(colors.background, 'rgb(255, 255, 255)'); assert.equal(colors.forced, 'none'); await inspect('viewer', 'study-b', 1);
      await audit('viewer-' + theme); await dialog.screenshot({ path: path.join(out, 'viewer-' + theme + '.png') }); await close(); checks.push({ theme, originalDrawingColors: true, axe: [] });
    }
    phase = 'large-text'; await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' }); await page.setViewportSize({ width: 390, height: 844 }); await mount();
    await page.evaluate(() => document.documentElement.style.fontSize = '32px'); await openReview(); await open('review'); await noOverflow(); await targets(); await audit('viewer-large-text');
    await dialog.screenshot({ path: path.join(out, 'viewer-large-text.png') });
    await scene('viewer').scrollIntoViewIfNeeded(); assert(await scene('viewer').isVisible()); await inspect('viewer', 'study-a', 1); await noOverflow();
    await dialog.screenshot({ path: path.join(out, 'viewer-large-text-drawing.png') });
    await preview('viewer').locator('.perception-recorded-note').scrollIntoViewIfNeeded(); assert(await preview('viewer').locator('.perception-recorded-note').isVisible());
    await close(); checks.push({ text200Percent: true, drawingAndFullNoteReachable: true, controls44px: true, axe: [] });
    phase = 'unmount'; await mount(); await openReview(); await open('review'); await page.evaluate(() => ReactDOM.unmountComponentAtNode(document.getElementById('slot'))); assert.equal(await page.locator('dialog:modal').count(), 0); checks.push({ unmountReleasesNativeModal: true });
    const finalSourceSHA256 = sourceSHA256(); assert.equal(finalSourceSHA256, loadedSourceSHA256); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'drawing-viewer-browser-results.json'), JSON.stringify({ checks, errors, sourceSHA256: finalSourceSHA256, loadedSourceSHA256, finalSourceSHA256 }, null, 2));
    console.log(JSON.stringify({ passedGroups: checks.length, errors, sourceSHA256: finalSourceSHA256 }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'drawing-viewer-browser-failure.json'), JSON.stringify({ phase, message: error.message, stack: error.stack, checks, errors, loadedSourceSHA256, finalSourceSHA256: sourceSHA256() }, null, 2));
    console.error(error); process.exitCode = 1;
  } finally { await browser.close(); }
})();
