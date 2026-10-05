'use strict';
// Real Chromium checks for previewed, additive notebook JSON import.
// Files are uploaded from buffers; this suite never depends on browser downloads.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-import');
fs.mkdirSync(out, { recursive: true });
const sourceSHA256 = () => require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var init = {}; init[id] = state || {};', 'var init = {otherTool:{preserved:37}}; init[id] = state || {};')
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('setToolData: pair[1]', 'setToolData: function(updater){if(window.__deferToolWrites)window.__deferredToolWrites.push(updater);else pair[1](updater);}')
  .replace('isContrast: false', 'isContrast:!!window.__qaContrast')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
const incoming = [
  ...[1, 2, 3].map((trial, index) => ({ id: 'import-bright-' + trial, experiment: 'brightness', date: '2026-10-04T14:00:0' + trial + '.000Z',
    model: { matching: true, reveal: false, prediction: 'Same', note: 'Imported hidden brightness ' + trial, contrast: 30, target: 128, matchValue: [124, 135, 141][index] },
    repeat: { id: 'baseline', trial, startValue: [73, 185, 99][index] } })),
  ...[1, 2].map((trial, index) => ({ id: 'import-size-' + trial, experiment: 'ebbinghaus', date: '2026-10-04T15:00:0' + trial + '.000Z',
    model: { matching: true, reveal: index === 0, prediction: 'Left', note: 'Imported partial size ' + trial, surround: 42, gap: 19, matchValue: [48, 53][index] },
    repeat: { id: 'partial-import', trial, startValue: [41, 59][index] } })),
  { id: 'import-cube', experiment: 'necker', date: '2026-10-04T16:00:00.000Z', model: { prediction: 'It changes', note: 'Imported legacy cube', depth: 78, cue: 'none' } },
];
const initial = {
  experiment: 'moire',
  models: { moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' }, brightness: { target: 180, note: 'Separate brightness draft' } },
  studies: [1, 2, 3].map((trial, index) => ({ id: 'baseline-' + trial, experiment: 'brightness', date: '2026-10-03T14:00:0' + trial + '.000Z', model: { matching: true, reveal: false, prediction: 'Left', note: 'Existing baseline ' + trial, contrast: 80, matchValue: [121, 134, 146][index] }, repeat: { id: 'baseline', trial, startValue: [72, 184, 100][index] } })),
  comparison: { experiment: 'necker', model: { depth: 72, cue: 'front', reveal: true, note: 'Pinned cube' } },
};

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
    await page.evaluate(() => {
      window.__nativeReadAsText = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function(file) { const reader = this; if (window.__deferFileReads) window.__fileReads.push(() => new Promise(resolve => { reader.addEventListener('loadend', resolve, { once: true }); window.__nativeReadAsText.call(reader, file); })); else window.__nativeReadAsText.call(reader, file); };
    });
    const mount = async (state = initial, dark = false, contrast = false) => page.evaluate(({ state, dark, contrast }) => {
      ReactDOM.unmountComponentAtNode(document.getElementById('slot')); window.__deferToolWrites = false; window.__deferredToolWrites = []; window.__deferFileReads = false; window.__fileReads = []; window.__qaContrast = contrast; document.documentElement.style.fontSize = ''; document.getElementById('slot').className = contrast ? 'theme-contrast' : dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, StemLab.PerceptionEngine.normalize(state));
    }, { state, dark, contrast });
    const state = () => page.evaluate(() => __state.perceptionLab);
    const allState = () => page.evaluate(() => __state);
    const button = name => page.getByRole('button', { name, exact: true });
    const file = () => page.locator('[data-perception-import-file]');
    const preview = () => page.locator('[data-perception-import-preview]');
    const row = id => page.locator('[data-perception-study="' + id + '"]');
    const canonicalRecords = async records => page.evaluate(records => StemLab.PerceptionEngine.normalize({ studies: records }).studies, records);
    const documentFor = records => ({ schema: 'alloflow.perception.notebook', version: 1, studies: records });
    const buffer = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
    const open = async () => { await button('Import notebook').click(); assert.equal(await file().count(), 1); assert((await file().getAttribute('accept') || '').includes('.json'), 'Import input must advertise JSON files.'); const label = await file().evaluate(node => node.getAttribute('aria-label') || Array.from(node.labels || []).map(label => label.textContent.trim()).join(' ')); assert(label, 'The native file input needs a visible or accessible label.'); };
    const upload = async (value, name = 'perception-notebook.json') => file().setInputFiles({ name, mimeType: 'application/json', buffer: buffer(value) });
    const waitPreview = async () => page.waitForFunction(() => document.querySelector('[data-perception-import-preview]')?.dataset.perceptionImportPreview === 'preview', null, { timeout: 5000 });
    const counts = async () => ({ added: Number(await page.locator('[data-perception-import-added]').innerText()), skipped: Number(await page.locator('[data-perception-import-skipped]').innerText()), free: Number(await page.locator('[data-perception-import-free]').innerText()) });
    const noAdd = async () => assert(!await button('Add observations').count() || await button('Add observations').isDisabled(), 'A rejected import cannot be committed.');
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Viewport must not overflow horizontally.');
    const paint = async () => page.evaluate(() => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No committed paint within 10 seconds.')), 10000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); })); }));
    const audit = async name => {
      await page.evaluate(() => scrollTo(0, 0)); await paint();
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.length, details: item.nodes.map(node => ({ html: node.html, target: node.target, failure: node.failureSummary })) })));
      fs.writeFileSync(path.join(out, name + '-axe.json'), JSON.stringify(violations, null, 2)); assert.equal(violations.length, 0, name + ': accessibility failures saved in ' + name + '-axe.json'); return [];
    };
    const targets = async () => {
      const sizes = await page.locator('[data-perception-lab] button, [data-perception-import-file], [data-perception-study-selector]').evaluateAll(nodes => nodes.filter(node => node.offsetWidth && node.offsetHeight).map(node => ({ name: node.textContent.trim().slice(0, 80) || node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
      assert(sizes.every(size => size.width >= 44 && size.height >= 44), 'Controls smaller than 44px: ' + JSON.stringify(sizes.filter(size => size.width < 44 || size.height < 44)));
    };
    const payload = documentFor(await canonicalRecords(incoming));
    const retainedModels = payload.studies.map(record => record.model);

    phase = 'preview-add-undo'; await mount(); const before = await allState(); await open(); await upload(payload); await waitPreview();
    assert.deepEqual(await counts(), { added: 6, skipped: 0, free: 21 });
    assert.deepEqual(await allState(), before, 'Choosing and previewing a file must not edit any tool state.');
    assert.equal(await page.locator('[data-perception-study-summary]').count(), 0); assert.equal(await page.locator('[data-perception-study-plot]').count(), 0);
    assert(!/\b(124|135|141|73|185|99)\b/.test(await preview().innerText()), 'A hidden imported study must not disclose its matches or starting positions in the preview.');
    await noOverflow(); await targets(); await audit('import-initial-preview'); await preview().screenshot({ path: path.join(out, 'import-preview-initial-panel.png') });
    await button('Add observations').click(); const added = await allState(); assert.equal(added.perceptionLab.studies.length, 9);
    assert.deepEqual(added.otherTool, before.otherTool); assert.deepEqual(added.perceptionLab.models, before.perceptionLab.models); assert.deepEqual(added.perceptionLab.comparison, before.perceptionLab.comparison); assert.equal(added.perceptionLab.experiment, before.perceptionLab.experiment);
    assert.deepEqual(added.perceptionLab.studies.slice(0, 3), before.perceptionLab.studies);
    const imported = added.perceptionLab.studies.slice(3); assert.deepEqual(imported.map(record => record.model), retainedModels); assert.deepEqual(imported.map(record => record.date), payload.studies.map(record => record.date));
    assert.equal(new Set(added.perceptionLab.studies.map(record => record.id)).size, 9, 'Imported observation IDs must remain unique.');
    const importedGroup = imported[0].repeat.id; assert(importedGroup && importedGroup !== 'baseline', 'Colliding saved group identity must be remapped as a group.');
    assert(imported.slice(0, 3).every(record => record.repeat.id === importedGroup)); assert.deepEqual(imported.slice(0, 3).map(record => record.repeat.trial), [1, 2, 3]); assert.deepEqual(imported.slice(0, 3).map(record => record.repeat.startValue), [73, 185, 99]);
    assert(imported[3].repeat.id === imported[4].repeat.id && imported[3].repeat.id !== importedGroup); assert.equal(imported[5].repeat, undefined);
    const group = await page.evaluate(id => StemLab.PerceptionEngine.savedStudy(__state.perceptionLab, id), importedGroup); assert(group.complete && group.study && !group.study.revealed);
    const partial = await page.evaluate(id => StemLab.PerceptionEngine.savedStudy(__state.perceptionLab, id), imported[3].repeat.id); assert.equal(partial.count, 2); assert.equal(partial.complete, false);
    await row(imported[0].id).getByRole('button', { name: 'Review study', exact: true }).click(); assert.equal(await page.locator('[data-perception-study-summary]').count(), 0); assert.equal(await button('Reveal saved study').count(), 1);
    await button('Close study review').click(); await button('Undo import').click(); assert.deepEqual(await allState(), before);
    checks.push({ previewIsLocal: true, imported: 6, existingRetained: 3, noEviction: true, uniqueIDsAndWholeGroupRemap: true, datesAndModelsRetained: true, hiddenRevealUnchanged: true, completeAndPartialMembershipRetained: true, draftsPinAndOtherToolPreserved: true, undoImportRestoresOnlyNotebook: true, axe: [] });

    phase = 'cancel-preview'; await mount(); const cancelBefore = await allState(); await open(); await upload(payload); await waitPreview(); await button('Cancel import').click(); assert.equal(await preview().count(), 0); assert.deepEqual(await allState(), cancelBefore); checks.push({ cancelPreviewDoesNotChangeState: true });
    phase = 'semantic-duplicates'; await mount(); await open(); await upload(payload); await waitPreview(); await button('Add observations').click(); const afterFirst = await allState(); await open(); await upload(payload); await waitPreview();
    await noAdd(); assert.deepEqual(await counts(), { added: 0, skipped: 6, free: 15 }); assert.deepEqual(await allState(), afterFirst); assert(/duplicate|already|skipped|existing/i.test(await preview().innerText()));
    await button('Cancel import').click(); checks.push({ repeatedFileSkippedBySemanticsDespiteRemappedGroupIDs: true, duplicatesDoNotAddOrReveal: true });

    phase = 'singleton-multiplicity'; const singletonBeforeSeed = { ...initial, studies: [{ ...payload.studies[5], id: 'retained-singleton' }] };
    await mount(singletonBeforeSeed); const singletonBefore = await allState(); await open(); await upload(documentFor([{ ...payload.studies[5], id: 'incoming-singleton-one' }, { ...payload.studies[5], id: 'incoming-singleton-two' }])); await waitPreview();
    assert.deepEqual(await counts(), { added: 1, skipped: 1, free: 23 }); await button('Add observations').click(); const singletonAfter = await allState(); assert.equal(singletonAfter.perceptionLab.studies.length, 2);
    assert.deepEqual(singletonAfter.perceptionLab.studies.map(record => record.model), [payload.studies[5].model, payload.studies[5].model]); assert.equal(new Set(singletonAfter.perceptionLab.studies.map(record => record.id)).size, 2);
    await button('Undo import').click(); assert.deepEqual(await allState(), singletonBefore); checks.push({ singletonMultiplicityPreserved: true, twoIdenticalIncomingAgainstOneExisting: { added: 1, skipped: 1 }, undoPreservesOriginalCopy: true });
    phase = 'study-multiplicity'; const retainedStudyRecords = payload.studies.slice(0, 3).map((record, index) => ({ ...record, id: 'retained-study-' + index, repeat: { ...record.repeat, id: 'retained-study' } }));
    const twoStudyCopies = ['one', 'two'].flatMap(copy => payload.studies.slice(0, 3).map((record, index) => ({ ...record, id: 'incoming-study-' + copy + '-' + index, repeat: { ...record.repeat, id: 'incoming-study-' + copy } })));
    await mount({ ...initial, studies: retainedStudyRecords }); const studyMultiplicityBefore = await allState(); await open(); await upload(documentFor(twoStudyCopies)); await waitPreview();
    assert.deepEqual(await counts(), { added: 3, skipped: 3, free: 21 }); await button('Add observations').click(); const studyMultiplicityAfter = await allState(); assert.equal(studyMultiplicityAfter.perceptionLab.studies.length, 6);
    const distinctGroups = await page.evaluate(() => StemLab.PerceptionEngine.savedStudies(__state.perceptionLab)); assert.equal(distinctGroups.length, 2); assert(distinctGroups.every(group => group.complete && group.study && !group.revealed));
    assert.deepEqual(studyMultiplicityAfter.perceptionLab.studies.map(record => record.model), payload.studies.slice(0, 3).concat(payload.studies.slice(0, 3)).map(record => record.model));
    await button('Undo import').click(); assert.deepEqual(await allState(), studyMultiplicityBefore); checks.push({ wholeStudyMultiplicityPreserved: true, twoIdenticalIncomingStudiesAgainstOneExisting: { added: 3, skipped: 3 }, twoCompleteHiddenGroupsRetained: true });

    phase = 'capacity'; const fullSeed = { ...initial, studies: initial.studies.concat(Array.from({ length: 19 }, (_, index) => ({ id: 'older-' + index, experiment: 'necker', model: { prediction: 'Unsure', note: 'Existing item ' + index } }))) };
    await mount(fullSeed); const capacityBefore = await allState(); await open(); await upload(payload); await waitPreview(); await noAdd(); assert.deepEqual(await counts(), { added: 6, skipped: 0, free: 2 }); assert.deepEqual(await allState(), capacityBefore);
    assert(/room|space|capacity|free|24|fit|delete/i.test(await preview().innerText())); checks.push({ insufficientCapacityDisablesAdd: true, existingRecordsNeverEvicted: true });

    const invalids = [
      { name: 'malformed-json', value: '{ broken JSON' },
      { name: 'wrong-schema', value: { ...payload, schema: 'other.notebook' } },
      { name: 'wrong-version', value: { ...payload, version: 2 } },
      { name: 'over24-records', value: documentFor(Array.from({ length: 25 }, (_, index) => ({ ...payload.studies[5], id: 'excess-' + index, model: { ...payload.studies[5].model, note: 'Excess ' + index } }))) },
      { name: 'bad-experiment', value: documentFor([...payload.studies.slice(0, 5), { ...payload.studies[5], experiment: 'unknown-experiment' }]) },
      { name: 'bad-repeat-start', value: documentFor(payload.studies.map((record, index) => index ? record : { ...record, repeat: { ...record.repeat, startValue: '73' } })) },
      { name: 'oversized-file', value: JSON.stringify(payload) + ' '.repeat(512 * 1024) },
    ];
    for (const invalid of invalids) {
      phase = invalid.name; await mount(); const before = await allState(); await open(); await upload(invalid.value);
      await page.waitForFunction(() => document.querySelector('[data-perception-import-preview]')?.dataset.perceptionImportPreview === 'error', null, { timeout: 5000 }); await noAdd(); assert.deepEqual(await allState(), before); checks.push({ rejectedFile: invalid.name, wholeFileRejectedWithoutPartialImport: true });
    }
    phase = 'exact-size-boundary'; await mount(); await open(); const json = JSON.stringify(payload), boundary = json + ' '.repeat(512 * 1024 - Buffer.byteLength(json)); assert.equal(Buffer.byteLength(boundary), 512 * 1024); await upload(boundary); await waitPreview(); assert(!await button('Add observations').isDisabled()); await button('Cancel import').click(); checks.push({ exact512KiBBoundaryAccepted: true });

    for (const replacement of ['cancel', 'profile', 'notebook']) {
      phase = 'deferred-file-' + replacement; await mount(); const before = await allState(); await open(); await page.evaluate(() => { window.__deferFileReads = true; window.__fileReads = []; }); await upload(payload);
      assert.equal(await page.evaluate(() => window.__fileReads.length), 1, 'Expected one intentionally deferred native FileReader.readAsText read.');
      let expected = before;
      if (replacement === 'cancel') await button('Cancel import').click();
      else if (replacement === 'profile') await page.evaluate(() => __setProfile('other-learner'));
      else { await page.evaluate(() => __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({ experiment: 'necker' }) }))); expected = await allState(); }
      await page.evaluate(async () => { window.__deferFileReads = false; await window.__fileReads.shift()(); }); await paint();
      assert.equal(await preview().count(), 0); await noAdd(); assert.deepEqual(await allState(), expected); checks.push({ deferredFileReadCanceledBy: replacement, staleReadCannotOpenPreviewOrChangeState: true });
    }
    phase = 'newer-file-wins'; await mount(); const latestFileBefore = await allState(); await open(); await page.evaluate(() => { window.__deferFileReads = true; window.__fileReads = []; }); await upload(payload, 'older-notebook.json');
    const newerPayload = documentFor([{ ...payload.studies[5], id: 'newer-singleton', model: { ...payload.studies[5].model, note: 'Only the newer file selected' } }]); await upload(newerPayload, 'newer-notebook.json'); assert.equal(await page.evaluate(() => window.__fileReads.length), 2);
    await page.evaluate(async () => { window.__deferFileReads = false; await window.__fileReads.splice(1, 1)[0](); }); await waitPreview(); assert.deepEqual(await counts(), { added: 1, skipped: 0, free: 21 });
    await page.evaluate(async () => { await window.__fileReads.shift()(); }); await paint(); assert.deepEqual(await counts(), { added: 1, skipped: 0, free: 21 }); assert((await preview().innerText()).includes('newer-notebook.json')); assert(!(await preview().innerText()).includes('older-notebook.json'));
    await button('Add observations').click(); const newestFileAfter = await allState(); assert.equal(newestFileAfter.perceptionLab.studies.length, 4); assert.equal(newestFileAfter.perceptionLab.studies[3].model.note, 'Only the newer file selected'); assert.deepEqual(newestFileAfter.perceptionLab.studies.slice(0, 3), latestFileBefore.perceptionLab.studies); assert.deepEqual(newestFileAfter.perceptionLab.models, latestFileBefore.perceptionLab.models); checks.push({ newerSelectedFileWinsWhenOlderReadFinishesLast: true, olderRecordsNeverImported: true });
    phase = 'stale-commit'; await mount(); await open(); await upload(payload); await waitPreview();
    const replacement = await page.evaluate(() => { const value = StemLab.PerceptionEngine.normalize({ experiment: 'necker', studies: [{ id: 'external', experiment: 'necker', model: { prediction: 'Unsure', note: 'New notebook' } }] }); const add = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'Add observations'); ReactDOM.unstable_batchedUpdates(() => { __edit(previous => ({ ...previous, perceptionLab: value })); add.click(); }); return value; });
    assert.deepEqual(await state(), replacement); assert.equal(await button('Undo import').count(), 0); checks.push({ retainedCommitClickExpiresOnExternalNotebook: true, noResurrectedOrImportedRecords: true });
    for (const replacement of ['profile', 'notebook', 'cancel']) {
      phase = 'deferred-commit-' + replacement; await mount(); await open(); await upload(payload); await waitPreview(); const before = await allState(); await page.evaluate(() => { window.__deferToolWrites = true; window.__deferredToolWrites = []; }); await button('Add observations').click();
      assert.equal(await page.evaluate(() => window.__deferredToolWrites.length), 1);
      let expected = before;
      if (replacement === 'profile') await page.evaluate(() => __setProfile('other-learner'));
      else if (replacement === 'cancel') await button('Cancel import').click();
      else { await page.evaluate(() => __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({ experiment: 'necker' }) }))); expected = await allState(); }
      await page.evaluate(() => { window.__deferToolWrites = false; __edit(window.__deferredToolWrites.shift()); }); assert.deepEqual(await allState(), expected); assert.equal(await button('Undo import').count(), 0); checks.push({ deferredCommitCanceledBy: replacement, laterUpdaterPreservesReplacement: true });
    }

    phase = 'undo-preserves-draft-edit'; await mount(); await open(); await upload(payload); await waitPreview(); await button('Add observations').click();
    await page.locator('#perception-note').fill('Draft edited after import'); await button('Undo import').click(); assert.equal((await state()).studies.length, 3); assert.equal((await state()).models.moire.note, 'Draft edited after import'); assert.deepEqual((await state()).comparison, (await page.evaluate(state => StemLab.PerceptionEngine.normalize(state), initial)).comparison); checks.push({ undoRemovesImportedRecordsWhilePreservingLaterDrawingEdits: true });
    phase = 'undo-expiry'; await mount(); await open(); await upload(payload); await waitPreview(); await button('Add observations').click();
    await button('Undo import').waitFor({ state: 'visible', timeout: 5000 });
    const external = await page.evaluate(() => { const value = StemLab.PerceptionEngine.normalize({ experiment: 'necker', studies: [{ id: 'external', experiment: 'necker', model: { prediction: 'Unsure' } }] }); const undo = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'Undo import'); ReactDOM.unstable_batchedUpdates(() => { __edit(previous => ({ ...previous, perceptionLab: value })); undo.click(); }); return value; });
    assert.deepEqual(await state(), external); checks.push({ undoExpiresOnExternalNotebook: true, staleUndoNeverDeletesReplacement: true });
    phase = 'own-save-expires-undo'; await mount(); await open(); await upload(payload); await waitPreview(); await button('Add observations').click(); const beforeOwnSave = await state(); await button('Save observation').click(); const afterOwnSave = await state(); assert.equal(afterOwnSave.studies.length, 10); assert.deepEqual(afterOwnSave.studies.slice(0, 9), beforeOwnSave.studies); assert.equal(afterOwnSave.studies[9].experiment, 'moire'); assert.equal(await button('Undo import').count(), 0); assert.deepEqual(afterOwnSave.models, beforeOwnSave.models); checks.push({ ownNotebookActionExpiresImportUndo: true, laterSavedObservationPreserved: true });
    phase = 'active-study'; await mount(); await page.locator('[data-perception-experiment="brightness"]').click(); await button('Match by eye').click(); await button('Start three matches').click();
    assert(!await button('Import notebook').count() || await button('Import notebook').isDisabled() || !await button('Import notebook').isVisible()); assert.equal(await file().count(), 0); checks.push({ activeMatchingStudyBlocksImport: true });

    phase = 'responsive'; console.log(JSON.stringify({ phase, groupsPassed: checks.length }));
    for (const width of [320, 390, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 }); await mount(); await open(); await upload(payload); await waitPreview(); await noOverflow(); await targets(); await audit('import-preview-' + width);
      await page.screenshot({ path: path.join(out, 'import-preview-' + width + '.png'), fullPage: true }); if (width === 390 || width === 1600) await preview().screenshot({ path: path.join(out, 'import-preview-panel-' + width + '.png') });
      await button('Add observations').click(); await noOverflow(); await targets(); await audit('import-added-' + width); await button('Undo import').click(); checks.push({ viewport: width, previewAddedUndo: true, noOverflow: true, controls44px: true, axe: [] });
    }
    await page.setViewportSize({ width: 1600, height: 1100 });
    for (const theme of [{ name: 'dark', dark: true }, { name: 'contrast', contrast: true }, { name: 'forced-light', forced: true }, { name: 'forced-dark', dark: true, forced: true, scheme: 'dark' }, { name: 'forced-contrast', contrast: true, forced: true }]) {
      phase = theme.name; await page.emulateMedia({ forcedColors: theme.forced ? 'active' : 'none', colorScheme: theme.scheme || 'light' }); await mount(initial, !!theme.dark, !!theme.contrast); await open(); await upload(payload); await waitPreview(); await noOverflow(); await targets(); await audit('import-' + theme.name);
      await page.screenshot({ path: path.join(out, 'import-' + theme.name + '.png'), fullPage: true }); await preview().screenshot({ path: path.join(out, 'import-' + theme.name + '-panel.png') });
      const styles = await preview().evaluate(node => ({ forcedColors: matchMedia('(forced-colors: active)').matches, theme: document.querySelector('[data-perception-lab]').dataset.perceptionTheme, color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor, controls: Array.from(node.querySelectorAll('input,select,button')).map(element => ({ tag: element.tagName, text: element.textContent, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, disabled: element.disabled })) })); fs.writeFileSync(path.join(out, 'import-' + theme.name + '-computed.json'), JSON.stringify(styles, null, 2));
      checks.push({ theme: theme.name, previewControlsPresent: true, noOverflow: true, controls44px: true, axe: [] });
    }
    phase = 'large-text'; await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' }); await mount(initial, true); await open(); await upload(payload); await waitPreview(); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await noOverflow(); await targets(); await audit('import-large-text'); await page.screenshot({ path: path.join(out, 'import-large-text.png'), fullPage: true }); checks.push({ text200Percent: true, noOverflow: true, controls44px: true, axe: [] });
    assert.deepEqual(errors, []); const finalSourceSHA256 = sourceSHA256(); assert.equal(finalSourceSHA256, loadedSourceSHA256, 'Source changed during browser QA; rerun against final code.'); fs.writeFileSync(path.join(out, 'import-browser-results.json'), JSON.stringify({ checks, errors, loadedSourceSHA256, finalSourceSHA256, sourceSHA256: finalSourceSHA256 }, null, 2)); console.log(JSON.stringify({ passed: true, groups: checks.length, errors }));
  } catch (error) { fs.writeFileSync(path.join(out, 'import-browser-failure.json'), JSON.stringify({ phase, checks, errors, loadedSourceSHA256, error: error.stack || String(error) }, null, 2)); console.error('Import QA failed in ' + phase + ': ' + error.message); process.exitCode = 1; }
  finally { await browser.close(); }
})().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
