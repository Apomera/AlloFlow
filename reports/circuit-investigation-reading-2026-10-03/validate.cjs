const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const sourceHash = 'e81cf1cb831d3754b208ed31d6467b14cb6fa140c5b6c299855ce671c5c12257';
const priorHash = '3424b78369802606dd709faf9c308c1d444b0d18633c69062a7e7486e5614453';
const runnerHash = 'bb8196df43337ef45344a0d7f913ec39e9770250b0dc5ec0cf1c253f0aad112d';
const scriptHash = '1df74417507406b4945c437ffdf3e848da0c0a2d41690980f9ae8eda54998ed5';
const test = 'tests/circuit_investigation_handoff.test.js';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const here = name => path.join(__dirname, name);
const read = name => JSON.parse(fs.readFileSync(here(name), 'utf8'));
const relative = file => path.relative(root, file).replace(/\\/g, '/');
const text = fs.readFileSync(path.join(root, source), 'utf8');
assert.equal(hash(path.join(root, source)), sourceHash);
assert.equal(hash(path.join(root, mirror)), sourceHash);
new vm.Script(text);

const preservation = read('source-preservation.json');
assert.equal(preservation.passed, true);
assert.equal(preservation.sourceSha256, sourceHash);
assert.equal(preservation.mirrorSha256, sourceHash);
assert.equal(preservation.beforeSha256, priorHash);
assert.equal(preservation.cssOnly, true);
assert.equal(preservation.byteExactReversal, true);
assert.equal(text.split(preservation.after).length, 2);
assert.equal(digest(text.replace(preservation.after, preservation.before)), priorHash);
const insertion = text.indexOf(preservation.after);
const media = text.lastIndexOf('@media (max-width: 480px)', insertion);
assert.ok(media >= 0 && insertion > media);
assert.ok(!text.slice(media, insertion).includes('@media', 1));
let depth = 0, end = -1;
for (let i = text.indexOf('{', media); i < text.length; i++) {
  if (text[i] === '{') depth++;
  if (text[i] === '}' && --depth === 0) { end = i; break; }
}
assert.ok(insertion + preservation.after.length < end);

const baselineDir = here('../circuit-investigation-handoff-2026-10-02');
const baseline = JSON.parse(fs.readFileSync(path.join(baselineDir, 'validation.json'), 'utf8'));
assert.equal(hash(path.join(baselineDir, 'validation.json')), 'badd78b156c74fb7d7e582532404bc5761fed8f65a86bcbb0b8ce59970cad9c0');
assert.equal(preservation.baselineValidationSha256, hash(path.join(baselineDir, 'validation.json')));
assert.equal(baseline.passed, true); assert.equal(baseline.sourceSha256, priorHash);
assert.equal(baseline.regression.tests, 172); assert.equal(baseline.browser.views, 12);
for (const [file, key] of Object.entries({'regression.json':'regressionSha256','regression-receipt.json':'regressionReceiptSha256','browser-results.json':'browserResultsSha256','visual-review.json':'visualReviewSha256','validate.cjs':'validatorSha256'})) assert.equal(hash(path.join(baselineDir, file)), baseline.artifacts[key]);
const baselineReceipt = JSON.parse(fs.readFileSync(path.join(baselineDir, 'regression-receipt.json'), 'utf8'));
for (const [file, expected] of Object.entries(baselineReceipt.files)) if (file.startsWith('tests/')) assert.equal(hash(path.join(root, file)), expected);

const regression = read('regression.json'), receipt = read('regression-receipt.json');
assert.equal(regression.success, true); assert.equal(regression.numTotalTests, 12); assert.equal(regression.numPassedTests, 12);
for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests']) assert.equal(regression[key] || 0, 0);
assert.equal(regression.testResults.length, 1); assert.equal(receipt.exitCode, 0); assert.equal(receipt.attempts.length, 1);
assert.deepEqual(receipt.changedDuringRun, []); assert.deepEqual(receipt.files, receipt.filesAtEnd);
assert.equal(hash(here('run-regression.cjs')), runnerHash); assert.equal(receipt.runnerSha256, runnerHash); assert.equal(receipt.runnerSha256AtEnd, runnerHash);
assert.equal(hash(path.join(root, test)), 'adce18c843924d0a249a291dd1bb9457a25ac3babdc55179a8ff2c89cc208f8d');
assert.equal(receipt.reportSha256, hash(here('regression.json')));
for (const [file, expected] of Object.entries(receipt.files)) assert.equal(hash(path.join(root, file)), expected);
const attempt = receipt.attempts[0];
assert.equal(attempt.exitCode, 0); assert.equal(attempt.signal, null); assert.equal(attempt.processError, null);
assert.deepEqual(attempt.files, receipt.files); assert.deepEqual(attempt.filesAtEnd, receipt.files); assert.deepEqual(attempt.changedDuringRun, []);
for (const flag of ['--pool=threads','--maxWorkers=1','--isolate','--testTimeout=30000','--hookTimeout=60000']) assert.ok(attempt.command.includes(flag));
assert.deepEqual(attempt.command.filter(value => value.startsWith('tests/')), [test]);
for (const kind of ['report','stdout','stderr']) { assert.equal(path.basename(attempt[kind]), attempt[kind]); assert.equal(hash(here(attempt[kind])), attempt[kind + 'Sha256']); }
const raw = read(attempt.report), file = raw.testResults[0];
assert.equal(raw.success, true); assert.equal(raw.numTotalTests, 12); assert.equal(raw.numPassedTests, 12);
assert.equal(raw.testResults.length, 1); assert.equal(relative(file.name), test); assert.equal(file.status, 'passed');
assert.equal(file.assertionResults.length, 12); assert.ok(file.assertionResults.every(value => value.status === 'passed'));
assert.equal(new Set(file.assertionResults.map(value => value.fullName)).size, 12);
assert.deepEqual(receipt.assertionCoverage, [{file:test,count:12,fullNames:file.assertionResults.map(value => value.fullName)}]);

const browser = read('browser-results.json');
assert.equal(hash(here('browser-check.cjs')), scriptHash);
for (const key of ['sourceSha256','mirrorSha256','sourceSha256AtEnd','mirrorSha256AtEnd']) assert.equal(browser[key], sourceHash);
for (const key of ['scriptSha256','scriptSha256AtEnd']) assert.equal(browser[key], scriptHash);
assert.equal(browser.passed, true); assert.equal(browser.sourceChangedDuringRun, false); assert.equal(browser.scriptChangedDuringRun, false); assert.equal(browser.mirrorMatches, true);
assert.deepEqual(browser.errors, []); assert.deepEqual(browser.visualIssues, []);
for (const key of ['axe','layouts','contentBounds','actions','nodeIds','screenshots','handoffStates','readingLayouts']) assert.equal(browser[key].length, 6, key);
assert.equal(browser.focus.length, 12); assert.equal(browser.openActions.length, 1); assert.equal(browser.checks.length, 3);
assert.deepEqual(browser.readingLayouts.map(row => [row.width,row.scale]), [[1280,1],[320,1],[390,1],[320,2],[320,1],[320,1]]);
for (const row of browser.readingLayouts) {
  assert.equal(row.actualViewportWidth, row.width); assert.equal(row.listTag, 'OL'); assert.equal(row.listRole, 'list');
  assert.deepEqual(row.steps.map(step => step.id), ['choose','compare']);
  for (const step of row.steps) {
    assert.equal(step.tag, 'LI'); assert.equal(step.headingTag, 'STRONG'); assert.equal(step.numberHidden, 'true');
    for (const word of step.words) assert.equal(word.lineCount, 1);
    if (row.width <= 480) {
      assert.equal(step.display, 'grid'); assert.equal(step.copyDisplay, 'contents');
      assert.ok(Math.abs(step.prompt.left - step.contentLeft) <= 1); assert.ok(Math.abs(step.prompt.right - step.contentRight) <= 1);
      assert.ok(step.prompt.top >= Math.max(step.number.bottom,step.heading.bottom) - 1);
      assert.ok(Math.abs(step.number.width - step.number.height) <= 1);
    } else { assert.equal(step.display, 'flex'); assert.notEqual(step.copyDisplay, 'contents'); }
  }
}
assert.equal(browser.desktopComparison.length, 1);
const desktop = browser.desktopComparison[0];
assert.equal(desktop.pixelFileIdentical, true); assert.equal(desktop.baselineSha256, desktop.currentSha256);
assert.equal(hash(here(desktop.baselineFile)), desktop.baselineSha256); assert.equal(hash(here('investigation-reading-1280.png')), desktop.currentSha256);
for (const row of browser.axe) { assert.deepEqual(row.violations, []); assert.deepEqual(row.excludedRules, row.forcedColors ? ['color-contrast'] : []); if (row.forcedColors) assert.match(row.exclusionReason, /axe 4\.12\.1/); }
for (const row of browser.layouts) assert.ok(row.scrollWidth <= row.width + 1);
for (const row of browser.nodeIds) assert.deepEqual(row.duplicates, []);
for (const row of browser.contentBounds) for (const card of row.cards) { assert.deepEqual(card.violations, []); assert.ok(card.scrollWidth <= card.clientWidth + 1); }
for (const row of browser.actions) for (const action of row.actions) { assert.ok(action.width >= 43.9); assert.ok(action.height >= 43.9); }
for (const row of browser.focus) assert.equal(row.visible, true);
assert.equal(browser.textResize.length, 1);
for (const row of browser.textResize) { assert.equal(row.scale, 2); assert.equal(row.baselineViewportWidth, 320); assert.equal(row.fonts.length, row.elements); for (const font of row.fonts) { assert.equal(font.beforeFontSize, font.normalFontSize); assert.equal(font.afterFontSize, font.normalFontSize * 2); assert.equal(font.ratio, 2); } }
assert.equal(browser.forcedColors.length, 1);
for (const row of browser.forcedColors) { assert.equal(row.active, true); assert.deepEqual(row.violations, []); assert.ok(row.colors.length > 0); for (const color of row.colors) assert.ok(color.ratio >= color.required); }
assert.equal(browser.readingOrder.length, 1); assert.equal(browser.readingOrder[0].actualViewportWidth, 320); assert.equal(browser.readingOrder[0].direction, 'rtl'); assert.deepEqual(browser.readingOrder[0].stepOrder, ['choose','compare']);
const opening = browser.openActions[0]; assert.equal(opening.onlyNotebookOpenChanged, true); assert.equal(opening.summaryFocused, true);
assert.ok(opening.navigation.length > 0); for (const navigation of opening.navigation) { assert.equal(navigation.owner, opening.owner); assert.equal(navigation.notebook, true); assert.deepEqual(navigation.options, {block:'start',behavior:'instant'}); }
assert.equal(opening.focus.owner, opening.owner); assert.deepEqual(opening.focus.options, {preventScroll:true});
assert.equal(browser.checks[0].wholeDataUnchanged, true); assert.equal(browser.checks[0].noAutomaticNavigation, true);
assert.match(browser.checks[1].ariaSnapshot, /list:/); assert.equal((browser.checks[1].ariaSnapshot.match(/listitem:/g) || []).length, 2);
assert.equal(browser.checks[2].wholeDataUnchanged, true); assert.equal(browser.motion.length, 1); assert.equal(browser.motion[0].reduced, true); assert.equal(browser.motion[0].animations, 0);

const screenshots = ['investigation-reading-1280.png','investigation-reading-320.png','investigation-reading-390.png','investigation-reading-200pct-text-320.png','forced-colors-investigation-reading-320.png','rtl-investigation-reading-320.png'];
const visual = read('visual-review.json'), rootReview = read('root-visual-review.json');
assert.equal(visual.passed, true); assert.equal(visual.sourceSha256, sourceHash); assert.equal(visual.scriptSha256, scriptHash);
assert.equal(rootReview.passed, true); assert.equal(rootReview.sourceSha256, sourceHash); assert.equal(rootReview.scriptSha256, scriptHash);
assert.deepEqual(rootReview.reviewed.slice().sort(), screenshots.slice().sort());
assert.deepEqual(browser.screenshots.map(row => row.file).sort(), screenshots.slice().sort());
for (const name of screenshots) { const bytes = fs.readFileSync(here(name)); assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a'); assert.equal(digest(bytes), rootReview.screenshotSha256[name]); }
const independent = read('independent-review.json');
assert.equal(independent.passed, true); assert.equal(independent.sourceSha256, sourceHash);
const paths = [source,mirror,test,'tests/circuit_lesson_continuation.test.js'];
const git = args => spawnSync('git', args, {cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
const diff = git(['diff','--check','--',...paths]); assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const staged = git(['diff','--cached','--name-only','--',...paths]); assert.equal(staged.status, 0); assert.equal(staged.stdout.trim(), '');
const result = {passed:true,sourceSha256:sourceHash,mirrorSha256:sourceHash,cssOnly:true,byteExactPriorSourcePreserved:true,baseline:{validationSha256:hash(path.join(baselineDir,'validation.json')),tests:172,files:10,views:12},freshRegression:{tests:12,files:1},browser:{views:6,focus:12,phoneViews:5,notebookOpens:1,listitems:2,desktopPNGUnchanged:true},screenshotsReviewedByRoot:6,gitDiffCheck:true,scopedChangesUnstaged:true,artifacts:Object.fromEntries(['source-preservation.json','independent-review.json','regression.json','regression-receipt.json','browser-results.json','visual-review.json','root-visual-review.json','validate.cjs'].map(name=>[name,hash(here(name))]))};
fs.writeFileSync(here('validation.json'), JSON.stringify(result,null,2) + '\n');
console.log(JSON.stringify(result,null,2));
