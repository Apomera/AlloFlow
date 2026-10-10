const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,json=n=>JSON.parse(fs.readFileSync(path.join(work,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=json('delta.json'),expected=delta.afterSHA256,gate=json('geometry-final/mouth-verification.json'),browser=json('native-final/summary.json'),metrics=json('native-final/face-preview-metrics.json'),review=json('visual-review.json'),history=json('history-preservation.json');
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);assert.equal(gate.candidateSHA256,expected);assert.equal(gate.beforeSHA256,delta.beforeSHA256);assert.equal(gate.passed,true);assert.equal(gate.results.length,6);assert.ok(gate.results.every(r=>r.status==='passed'));assert.equal(gate.negative.length,2);assert.ok(gate.negative.every(r=>r.rejected&&r.restored));assert.equal(browser.finalSHA,expected);assert.equal(browser.workflows,2);assert.equal(browser.evidenceCount,4);assert.equal(browser.images.length,8);assert.equal(browser.stats.expected,2);for(const key of ['unexpected','skipped','flaky'])assert.equal(browser.stats[key],0);assert.equal(review.sourceSHA256,expected);assert.equal(review.accepted,true);assert.deepEqual(review.imageHashes,browser.imageHashes);
let independent=null;if(fs.existsSync(path.join(work,'independent-visual-review.json'))){independent=json('independent-visual-review.json');assert.equal(independent.sourceSHA256,expected);assert.equal(independent.accepted,true);assert.deepEqual(independent.imageHashes,browser.imageHashes);}
assert.equal(history.sourceSHA256,expected);assert.equal(history.historicalChain.length,11);assert.equal(Object.keys(history.fixtureHashes).length,39);assert.equal(Object.keys(history.sharedHistoryInputs.checkerHashes).length,8);
const views=[['Adult, recovery pose 5','adult-pose5'],['Infant, recovery pose 8 with app contrast','infant-pose8-contrast']];
const pairs=views.map(([label,id])=>{const b=metrics.evidence.find(e=>e.id===id&&e.variant==='baseline'),a=metrics.evidence.find(e=>e.id===id&&e.variant==='candidate');assert.ok(b&&a);return `### ${label}\n\n| Before | After |\n| --- | --- |\n| ![Original face](native-final/${b.detail.file}) | ![Refined face](native-final/${a.detail.file}) |\n\n[Before full view](native-final/${b.capture}) · [After full view](native-final/${a.capture})`;}).join('\n\n');
const reviewLinks=independent?'[Root review](checks/visual-review.json) · [Independent review](checks/independent-visual-review.json)':'[Visual review](checks/visual-review.json)';
const readme=`# First Response Lab: mouth material refinement

Completed October 9, 2026. Changes remain uncommitted.

Reduced the reflected highlight on the lips in the standard shaded view. The shared lip material's specular color changes from \`0x25313b\` to \`0x060606\`. Lip shape, placement, base color and the mouth seam remain identical; the app's high-contrast view is unchanged.

## Before and after

${pairs}

## Verification

The original infant attempt stopped during Chromium launch (exit code 3221225495), before any scene capture. One manual run after the environment refreshed passed with the same candidate and fixture bytes. The failed attempt is retained separately from the two accepted comparisons. [Original launch log](native-failure/native-infant-contrast/browser-run.log) · [Recovery record](checks/native-recovery.json)

- **Material and scene scope:** six age/contrast cases passed with ${gate.assertions.toLocaleString('en-US')} assertions. Every geometry buffer, draw range, other material property, transform and scene value remains exact through the checked frames. Incorrect lip specular and an unrelated vertex mutation are rejected, then restored and reread. [Results](checks/mouth-verification.json)
- **Native Chromium:** two matched workflows passed, producing four source/view captures and eight stage/detail images. Camera, pose, contact, rendering counts and resource lifecycle checks pass. [Native results](native-final/summary.json)
- **Source and history:** four matching runtime copies, 39 unchanged raw fixtures, eight unchanged older checkers and eleven exact historical reversals. Older gates and raw test suites were not rerun for this material-only change. [History checks](checks/history-preservation.json)
- **Visual acceptance:** ${reviewLinks}.

The [initial mouth diagnostic](checks/mouth-diagnostic.json) found the lip rims already inside the head surface. This pass adjusts reflectivity. The native harness loads the raw First Response module; it does not verify the full application loader or a deployment. Exact source, checker and evidence pins are in [verification.json](verification.json).

Source SHA-256: \`${expected}\`.
`;
fs.writeFileSync(path.join(work,'README-draft.md'),readme);console.log(JSON.stringify({reportPrepared:true,sourceSHA256:expected,materialCases:6,browserWorkflows:2,images:8,independentVisualReview:!!independent}));
