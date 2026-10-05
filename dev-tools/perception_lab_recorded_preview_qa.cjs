'use strict';
// Real Chromium checks for immutable, actual recorded-trial SVG previews.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-recorded-preview');
fs.mkdirSync(out, { recursive: true });
// Keep every earlier attempt when a source fix or interrupted run needs a rerun.
if (fs.existsSync(path.join(out, 'recorded-preview-browser-results.json')) || fs.existsSync(path.join(out, 'recorded-preview-browser-failure.json'))) {
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

    for (const fixture of fixtures) {
      phase = fixture.id + '-recorded-trial-helper'; await mount(seed(fixture));
      const helper = await page.evaluate(() => {
        const engine = StemLab.PerceptionEngine, initial = __state.perceptionLab, before = JSON.stringify(initial);
        const results = [1, 2, 3].map(trial => {
          const record = initial.studies.find(item => item.repeat.id === 'study-a' && item.repeat.trial === trial);
          const result = engine.recordedTrial(initial, 'study-a', trial);
          const snapshot = JSON.parse(JSON.stringify(result));
          if (result.model) result.model.note = 'Mutated detached return';
          return { result: snapshot, record };
        });
        return { results, unchanged: JSON.stringify(initial) === before };
      });
      assert(helper.unchanged, 'Recorded-trial model must be a detached copy.');
      for (const { result, record } of helper.results) assert.deepEqual(result, { status: 'ready', count: 3, experiment: record.experiment, trial: record.repeat.trial, recordId: record.id, date: record.date, model: record.model, startValue: record.repeat.startValue });
      checks.push({ experiment: fixture.id, recordedTrialHelperReturnsExactActualMember: true, customStartingMetadataPreserved: true, modelIsDetachedCopy: true });
    }
    for (const unavailable of ['missing', 'partial', 'conflict', 'hidden', 'trial']) {
      phase = 'helper-gating-' + unavailable; const gated = seed();
      if (unavailable === 'partial') gated.studies = gated.studies.filter(record => record.id !== 'study-a-record-3');
      if (unavailable === 'conflict') gated.studies[1].repeat.trial = 1;
      if (unavailable === 'hidden') gated.studies[1].model.reveal = false;
      await mount(gated);
      const result = await page.evaluate(({ groupId, trial }) => StemLab.PerceptionEngine.recordedTrial(__state.perceptionLab, groupId, trial), { groupId: unavailable === 'missing' ? 'absent-group' : 'study-a', trial: unavailable === 'trial' ? 0 : 2 });
      assert.equal(result.status, unavailable === 'missing' || unavailable === 'partial' ? 'incomplete' : unavailable);
      for (const field of ['experiment', 'trial', 'recordId', 'model', 'startValue']) assert.equal(result[field], null, unavailable + ' must redact ' + field);
      assert.equal(result.date, ''); checks.push({ unavailableHelper: unavailable, modelAndDrawingFieldsRedacted: true });
    }
    for (const fixture of fixtures) {
      phase = fixture.id + '-actual-trials'; await mount(seed(fixture)); const before = await allState(); await openPair();
      for (const slot of ['review', 'a', 'b']) { assert.equal(await trialControl(slot).inputValue(), '1'); assert.equal(await guides(slot).getAttribute('aria-pressed'), 'true'); }
      for (const trial of [1, 2, 3]) { for (const slot of ['review', 'a', 'b']) { await trialControl(slot).selectOption(String(trial)); await inspect(slot, slot === 'b' ? 'study-b' : 'study-a', trial); } }
      await accessibleSVGs(); assert.deepEqual(await allState(), before); checks.push({ experiment: fixture.id, actualTrialModelsAcrossReviewAndBothPairSlots: 9, originalCustomStarts: fixture.starts, fullNotesAndDatesAndImpressions: true, equal800x480Scale: true, uniqueAccessibleSVGNames: true, persistedStateUnchanged: true });
      phase = fixture.id + '-local-guides'; await guides('a').click(); await inspect('a', 'study-a', 3, false); await inspect('b', 'study-b', 3, true); await inspect('review', 'study-a', 3, true); assert.deepEqual(await allState(), before); await guides('review').click(); await inspect('review', 'study-a', 3, false); await guides('a').click(); await inspect('a', 'study-a', 3, true); assert.deepEqual(await allState(), before); checks.push({ experiment: fixture.id, guidesAreIndependentLocalState: true, savedRevealDrawingPinOtherToolUnchanged: true });
    }

    phase = 'independent-selections-and-filter'; await mount(); await openPair(); const independentBefore = await allState(); await trialControl('review').selectOption('2'); await trialControl('a').selectOption('3'); await trialControl('b').selectOption('2'); await guides('a').click();
    await page.locator('[data-perception-notebook-view]').selectOption('studies'); await page.locator('[data-perception-notebook-experiment]').selectOption('ebbinghaus'); await page.locator('[data-perception-notebook-search]').fill('No matching notebook note'); assert.equal(await page.locator('[data-perception-notebook-group]').count(), 0); await inspect('review', 'study-a', 2); await inspect('a', 'study-a', 3, false); await inspect('b', 'study-b', 2); assert.deepEqual(await allState(), independentBefore); checks.push({ independentReviewAndPairTrialSelections: true, filtersHideCardsButPreserveSelectedPreviews: true, previewControlsDoNotPersist: true });
    phase = 'pair-identity-reset'; await choosePair('study-c'); await inspect('review', 'study-a', 2); await inspect('a', 'study-a', 1); await inspect('b', 'study-c', 1); assert.deepEqual(await allState(), independentBefore); checks.push({ changedPairResetsBothPairSlotsToTrialOneAndGuidesOn: true, reviewedStudySelectionRemainsIndependent: true });
    phase = 'review-identity-reset'; await button('Close study review').click(); await button('Clear notebook filters').click(); await page.locator('[data-perception-notebook-view]').selectOption('observations'); await openReview('study-b'); await inspect('review', 'study-b', 1); await none(['a', 'b']); checks.push({ changedReviewedGroupResetsTrialAndGuides: true, closedPairRemoved: true });
    phase = 'profile-reset'; await trialControl('review').selectOption('3'); await guides('review').click(); const profileBefore = await allState(); await page.evaluate(() => __setProfile('other-learner')); await none(['active', 'review', 'a', 'b']); assert.deepEqual(await allState(), profileBefore); await openReview('study-b'); await inspect('review', 'study-b', 1); checks.push({ profileResetsPreviewOptionsAndReview: true, newReviewStartsAtActualTrialOne: true, hostStatePreserved: true });

    phase = 'hidden-and-independent-reveal'; await mount(seed(fixtures[0], { hiddenA: true, hiddenB: true })); const hiddenBefore = await state(); await openPair(); await none(['active', 'review', 'a', 'b']); await button('Reveal comparison study').click(); await none(['review', 'a', 'b']); assert((await state()).studies.filter(record => record.repeat.id === 'study-b').every(record => record.model.reveal)); assert((await state()).studies.filter(record => record.repeat.id === 'study-a').every(record => !record.model.reveal)); await button('Reveal saved study').click(); await inspect('review', 'study-a', 1); await inspect('a', 'study-a', 1); await inspect('b', 'study-b', 1); const revealed = await state(); assert.deepEqual(revealed.models, hiddenBefore.models); assert.deepEqual(revealed.comparison, hiddenBefore.comparison); checks.push({ hiddenStudiesNeverCreateSVGPreview: true, revealingBDoesNotExposeAOrPair: true, independentlyRevealedPairCreatesActualPreviews: true });

    for (const kind of ['mixed-reveal', 'partial', 'conflict']) {
      phase = 'gating-' + kind; const gated = seed();
      if (kind === 'mixed-reveal') gated.studies[1].model.reveal = false;
      else if (kind === 'partial') gated.studies = gated.studies.filter(record => record.id !== 'study-a-record-3');
      else gated.studies[1].repeat.trial = 1;
      await mount(gated); await openReview(); await none(['active', 'review', 'a', 'b']); if (kind === 'mixed-reveal') { await choosePair(); await none(['review', 'a', 'b']); }
      checks.push({ gatedStatus: kind, noRecordedPreviewForUnavailableStudy: true });
    }

    phase = 'deleted-member-and-undo'; await mount(); await openPair(); await trialControl('a').selectOption('3'); await trialControl('b').selectOption('2'); const deletionBefore = await allState(); await page.locator('[data-perception-study="study-a-record-2"]').getByRole('button', { name: 'Delete observation', exact: true }).click(); await none(['review', 'a', 'b']); await button('Undo deletion').click(); await inspect('review', 'study-a', 1); await inspect('a', 'study-a', 1); await inspect('b', 'study-b', 1); assert.deepEqual(await allState(), deletionBefore); checks.push({ deletionImmediatelyRemovesIncompletePreview: true, undoRestoresActualRecordPreviewsWithSafeDefaults: true });
    phase = 'external-missing-group'; await mount(); await openPair(); await edit({ studies: (await state()).studies.filter(record => record.repeat.id !== 'study-b') }); await none(['review', 'a', 'b']); await openReview(); await inspect('review', 'study-a', 1); await none(['a', 'b']); checks.push({ externalNotebookRevisionClearsSavedReview: true, externallyRemovedComparedGroupCannotKeepStaleSVG: true, remainingCompleteGroupCanBeReviewedAgain: true });
    phase = 'external-replaced-record'; await mount(); await openPair(); await trialControl('b').selectOption('2'); const replaced = await state(); replaced.studies.find(record => record.id === 'study-b-record-2').model.matchValue = 167; replaced.studies.find(record => record.id === 'study-b-record-2').model.note = 'Updated imported trial note'; await edit({ studies: replaced.studies }); await none(['review', 'a', 'b']); await openPair(); await inspect('b', 'study-b', 1); await trialControl('b').selectOption('2'); await inspect('b', 'study-b', 2); checks.push({ externallyReplacedRecordRendersFreshSavedModel: true, staleCachedTrialCannotSurviveReplacement: true, reopenedPairUsesSafeDefaults: true });

    for (const fixture of fixtures) {
      phase = fixture.id + '-active-recording'; await mount({ experiment: fixture.id, models: { [fixture.id]: { matching: true, ...fixture.aModel, note: 'Fresh match note' }, moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' } }, comparison: seed().comparison }); await button('Start three matches').click();
      const activeId = await page.locator('[data-perception-repeat-active]').getAttribute('data-perception-repeat-active'); await none(['active', 'review', 'a', 'b']);
      for (let index = 0; index < 3; index++) { await nativeInput(page.locator('#perception-match-value'), fixture.a[index]); const choice = fixture.id === 'mullerLyer' ? ['Top', 'Same', 'Bottom'][index] : ['Left', 'Same', 'Right'][index]; await page.locator('[data-perception-choice="' + choice + '"]').click(); await page.locator('#perception-note').fill(fullNote(index + 1)); await button('Record match').click(); await none(['active', 'review', 'a', 'b']); }
      await button('Reveal study results').click(); const activeBefore = await allState(); await inspect('active', activeId, 1); await trialControl('active').selectOption('3'); await inspect('active', activeId, 3); await guides('active').click(); await inspect('active', activeId, 3, false); assert.deepEqual(await allState(), activeBefore); assert(await page.locator('#perception-stage-current [data-perception-guide]').count(), 'Local preview guides cannot hide the revealed live drawing guides.'); checks.push({ experiment: fixture.id, collectionAndUnrevealedCompletionHaveNoPreviews: true, activeRevealedPreviewUsesActualPersistedMembers: true, activePreviewControlsDoNotEditCurrentDrawing: true });
      await button('End repeated study').click(); await none(['active']); await page.locator('[data-perception-study]').filter({ has: page.getByRole('button', { name: 'Review study', exact: true }) }).first().getByRole('button', { name: 'Review study', exact: true }).click(); await inspect('review', activeId, 1); checks.push({ experiment: fixture.id, endedStudyCanReviewActualFirstTrial: true, activeLocalOptionsDoNotCarryIntoSavedReview: true });
    }

    phase = 'responsive'; console.log(JSON.stringify({ phase, groupsPassed: checks.length }));
    for (const width of [320, 390, 768, 1280, 1600]) { await page.setViewportSize({ width, height: 900 }); await mount(); await openPair(); await trialControl('a').selectOption('3'); await trialControl('b').selectOption('2'); await noOverflow(); await targets(); await accessibleSVGs(); await audit('recorded-preview-' + width); await page.screenshot({ path: path.join(out, 'recorded-preview-' + width + '.png'), fullPage: true }); if (width === 390 || width === 1600) { await preview('review').screenshot({ path: path.join(out, 'recorded-preview-review-panel-' + width + '.png') }); await preview('a').screenshot({ path: path.join(out, 'recorded-preview-a-panel-' + width + '.png') }); await preview('b').screenshot({ path: path.join(out, 'recorded-preview-b-panel-' + width + '.png') }); } checks.push({ viewport: width, readyReviewAndABPreviews: true, noOverflow: true, controls44px: true, axe: [] }); }
    await page.setViewportSize({ width: 1600, height: 1100 });
    for (const theme of [{ name: 'dark', dark: true }, { name: 'contrast', contrast: true }, { name: 'forced-light', forced: true }, { name: 'forced-dark', dark: true, forced: true, scheme: 'dark' }, { name: 'forced-contrast', contrast: true, forced: true }]) { phase = theme.name; await page.emulateMedia({ forcedColors: theme.forced ? 'active' : 'none', colorScheme: theme.scheme || 'light' }); await mount(seed(fixtures[1]), !!theme.dark, !!theme.contrast); await openPair(); await trialControl('a').selectOption('3'); await trialControl('b').selectOption('2'); await noOverflow(); await targets(); await accessibleSVGs(); await audit('recorded-preview-' + theme.name); await page.screenshot({ path: path.join(out, 'recorded-preview-' + theme.name + '.png'), fullPage: true }); await preview('b').screenshot({ path: path.join(out, 'recorded-preview-' + theme.name + '-b-panel.png') }); checks.push({ theme: theme.name, actualEbbinghausTrialPreviews: true, noOverflow: true, controls44px: true, axe: [] }); }
    phase = 'large-text'; await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' }); await mount(seed(fixtures[2]), true); await openPair(); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow(); await targets(); await audit('recorded-preview-large-text'); await page.screenshot({ path: path.join(out, 'recorded-preview-large-text.png'), fullPage: true }); checks.push({ text200Percent: true, actualMullerLyerTrialPreviews: true, noOverflow: true, controls44px: true, axe: [] });
    assert.deepEqual(errors, []); const finalSourceSHA256 = sourceSHA256(); assert.equal(finalSourceSHA256, loadedSourceSHA256, 'Source changed during browser QA; rerun against final code.'); fs.writeFileSync(path.join(out, 'recorded-preview-browser-results.json'), JSON.stringify({ checks, errors, loadedSourceSHA256, finalSourceSHA256, sourceSHA256: finalSourceSHA256 }, null, 2)); console.log(JSON.stringify({ passed: true, groups: checks.length, errors }));
  } catch (error) { fs.writeFileSync(path.join(out, 'recorded-preview-browser-failure.json'), JSON.stringify({ phase, checks, errors, loadedSourceSHA256, error: error.stack || String(error) }, null, 2)); console.error('Recorded-preview QA failed in ' + phase + ': ' + error.message); process.exitCode = 1; }
  finally { await browser.close(); }
})().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
