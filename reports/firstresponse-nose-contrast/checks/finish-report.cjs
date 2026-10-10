const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,json=n=>JSON.parse(fs.readFileSync(path.join(work,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=json('delta.json'),expected=delta.afterSHA256,unit=json('raw-nose-surfaces/summary.json'),browser=json('native-final/summary.json'),metrics=json('native-final/face-preview-metrics.json'),review=json('visual-review.json'),history=json('history-preservation.json');
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);assert.equal(unit.sourceSHA256,expected);assert.equal(unit.passed,true);assert.equal(unit.numPassedTests,21);assert.equal(unit.numFailedTests,0);assert.equal(unit.numTotalTests,21);assert.equal(unit.rawTestExact,true);assert.equal(unit.sourceIsExactCandidate,true);
assert.equal(browser.finalSHA,expected);assert.equal(browser.workflows,3);assert.equal(browser.evidenceCount,6);assert.equal(browser.images.length,12);assert.equal(browser.stats.expected,3);for(const k of ['unexpected','skipped','flaky'])assert.equal(browser.stats[k],0);assert.equal(metrics.evidence.length,6);assert.equal(review.sourceSHA256,expected);assert.equal(review.accepted,true);assert.deepEqual(review.imageHashes,browser.imageHashes);
assert.deepEqual(browser.pixelComparisons.map(p=>p.id).sort(),['adult-pose5','adult-pose5-contrast','infant-pose8-contrast']);for(const p of browser.pixelComparisons){assert.equal(p.contrast,p.id!=='adult-pose5');assert.ok(Number.isInteger(p.changedPixels)&&p.changedPixels>=0&&p.changedPixels<=p.totalPixels);assert.ok(Number.isInteger(p.totalPixels)&&p.totalPixels>0);if(p.contrast)assert.ok(p.changedPixels>0);else assert.equal(p.changedPixels,0);}
let independent=null;if(fs.existsSync(path.join(work,'independent-visual-review.json'))){independent=json('independent-visual-review.json');assert.equal(independent.sourceSHA256,expected);assert.equal(independent.accepted,true);assert.deepEqual(independent.imageHashes,browser.imageHashes);}
assert.equal(history.sourceSHA256,expected);assert.equal(history.historicalChain.length,12);assert.equal(Object.keys(history.fixtureHashes).length,39);assert.equal(Object.keys(history.sharedHistoryInputs.checkerHashes).length,8);
const repairProvenance=require('./check-repair-provenance.cjs').checkRepairProvenance(work,'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated');assert.equal(repairProvenance.failedAttemptCount,2);for(const attempt of repairProvenance.failedAttempts){assert.ok(browser.runs.includes(attempt.recoveryRun));assert.ok(!browser.runs.includes(attempt.failedRun));}
const views=[['Adult, standard view control','adult-pose5'],['Adult, contrast view','adult-pose5-contrast'],['Infant, contrast view','infant-pose8-contrast']];
const pairs=views.map(([label,id])=>{const b=metrics.evidence.find(e=>e.id===id&&e.variant==='baseline'),a=metrics.evidence.find(e=>e.id===id&&e.variant==='candidate');assert.ok(b&&a);return `### ${label}\n\n| Before | After |\n| --- | --- |\n| ![Original face](native-final/${b.detail.file}) | ![Refined face](native-final/${a.detail.file}) |\n\n[Before full view](native-final/${b.capture}) · [After full view](native-final/${a.capture})`;}).join('\n\n');
const reviewLinks=independent?'[Visual review](checks/visual-review.json) · [Independent review](checks/independent-visual-review.json)':'[Visual review](checks/visual-review.json)';
const readme=`# First Response Lab: nose clarity in contrast mode

Completed October 9, 2026. Changes remain uncommitted.

Added a curved dark contour at the nose edge in contrast mode, helping distinguish the white nose from the white cheek. The contour follows the surface as the view changes. Nose geometry and placement remain identical, and the standard shaded view keeps its existing material.

## Before and after

${pairs}

## Verification

- **Existing nose tests:** all 21 tests passed against the exact candidate and unchanged test file. [Unit result](raw-nose-surfaces/summary.json)
- **Native Chromium:** three matched workflows passed, producing six source/view captures and twelve stage/detail images. The adult standard view serves as a control; adult and infant contrast views show the change. [Native results](native-final/summary.json)
- **Source and history:** four matching runtime copies, 39 unchanged raw fixtures, eight unchanged existing checkers and twelve exact historical reversals. No new dev-tools checker or unit test was added. [History checks](checks/history-preservation.json)
- **Visual acceptance:** ${reviewLinks}.
- **Retained infant failure:** the initial infant run rejected viewer-added opacity metadata in the fixture. The fixture was repaired to preserve that metadata, with twelve negative checks and saved original inputs; candidate source bytes did not change. The separate recovery run passed. [Failed attempt](native-infant-contrast/failure.json) · [Repair record](checks/fixture-opacity-repair.json).
- **Retained adult failure:** the first adult contrast Playwright test passed, but the wrapper exceeded its 900,000 ms total limit, so that attempt was excluded. A separate run passed with the exact same source, fixture, runner, dependencies and time limits. [Wrapper failure](native-adult-contrast/failure.json) · [Playwright result](native-adult-contrast/browser-run.json).

The native harness loads the raw First Response module. This pass does not verify the full application loader or a deployment. Exact source and evidence pins are in [verification.json](verification.json).

Source SHA-256: \`${expected}\`.
`;
fs.writeFileSync(path.join(work,'README-draft.md'),readme);console.log(JSON.stringify({reportPrepared:true,sourceSHA256:expected,rawNoseTests:21,browserWorkflows:3,images:12,independentVisualReview:!!independent}));
