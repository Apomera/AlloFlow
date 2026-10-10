const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,json=n=>JSON.parse(fs.readFileSync(path.join(work,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const shading=json('shading-verification.json'),geometry=json('geometry-contract/wrist-verification.json'),browser=json('native-final/summary.json'),review=json('visual-review.json'),independent=json('independent-visual-review.json'),history=json('history-preservation.json');
const expected='179ddeefd0c930ca4a084d98fc683c321fb4f36f720e62cddf8b30d56b576466';assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);
assert.equal(shading.candidateSHA256,expected);assert.equal(shading.passed,true);assert.equal(shading.results.length,3);assert.ok(shading.results.every(r=>r.status==='passed'));assert.equal(shading.negative.length,1);assert.ok(shading.negative.every(r=>r.rejected&&r.restored));
assert.equal(geometry.passed,true);assert.equal(geometry.results.length,6);assert.ok(geometry.results.every(r=>r.status==='passed'));assert.equal(geometry.negative.length,2);
assert.equal(browser.finalSHA,expected);assert.equal(browser.workflows,2);assert.equal(browser.evidenceCount,8);assert.equal(browser.stats.expected,2);for(const key of ['unexpected','skipped','flaky'])assert.equal(browser.stats[key],0);
for(const value of [review,independent]){assert.equal(value.sourceSHA256,expected);assert.equal(value.accepted,true);}
assert.equal(history.sourceSHA256,expected);assert.equal(history.historicalChain.length,9);assert.equal(Object.keys(history.fixtureHashes).length,39);
const wrists=shading.results.flatMap(r=>r.wrists),beforeMax=Math.max(...wrists.map(w=>w.baseline.maximumAngleDegrees)),afterMax=Math.max(...wrists.map(w=>w.candidate.maximumAngleDegrees));
const views=[['Adult heel side view','adult-heel-side'],['Child heel side view, app contrast, 320px viewport','child-heel-side-contrast']];
const pairs=views.flatMap(([label,id])=>['release','compression'].map(phase=>`### ${label}: ${phase}\n\n| Before | After |\n| --- | --- |\n| ![Original wrist shading](native-final/${id}-baseline-${phase}-wrists.png) | ![Refined wrist shading](native-final/${id}-candidate-${phase}-wrists.png) |\n\n[Before full view](native-final/${id}-baseline-${phase}-stage.png) · [After full view](native-final/${id}-candidate-${phase}-stage.png)`)).join('\n\n');
const readme=`# First Response Lab: wrist shading refinement

Completed October 8, 2026. Changes remain uncommitted.

The forearm-to-wrist lighting transition is smoother. The wrist collar now follows the existing forearm's shading direction, then gradually blends into the wrist's curved surface. This reduces the brightness band at the join.

Only the wrist collar normal buffers change. All surface positions, triangles, materials, transforms, hand placement, cameras and compression behavior remain identical. The adjustment happens when the scene is built. Each wrist keeps its existing 1,202 vertices and 2,400 triangles; mesh, geometry and material counts are unchanged.

## Before and after

${pairs}

[All matched captures and measurements](native-final/wrist-preview-metrics.json) identify the source, camera and contact state for every image.

## Verification

- **Shading:** three age cases passed with ${shading.assertions.toLocaleString('en-US')} assertions. Across ${wrists.length} wrists and ${wrists.reduce((n,w)=>n+w.candidate.samples,0)} sampled seam crossings, the maximum normal mismatch fell from ${beforeMax.toFixed(2)}° to ${afterMax.toFixed(2)}°. Every collar vertex is fitted, normals remain unit length and outward, and the scene matches exactly outside the intended wrist normals. Restoring the original normals fails the seam check; candidate normals are then restored and reread. [Shading results](checks/shading-verification.json)
- **Geometry:** the unchanged geometry gate passed all six age/contrast cases, including its two deliberate failure checks. Surface shape, topology, buried ends, cap coverage and separation from the opposite hand remain valid. [Geometry results](checks/wrist-verification.json)
- **Native Chromium:** two matched workflows passed, with one worker and zero automatic retries. Eight source/view/phase captures produced 16 stage/detail images. Cameras, contact state, materials, transforms, positions and other geometry buffers match the baseline. Resource counts remain stable; teardown disposes the renderer once. [Browser results](native-final/summary.json)
- **History and source:** four runtime copies are identical; 39 existing raw test fixtures and all six existing checkers remain unchanged. Nine exact history reversals retain previous comparison inputs. The raw hand-alignment tests were not rerun in this shading pass. [History checks](checks/history-preservation.json)
- **Visual review:** root and independent review covered the before-and-after captures. [Root review](checks/visual-review.json) · [Independent review](checks/independent-visual-review.json)

The browser harness mounts the raw First Response module. It does not verify the full application loader or a deployment. An initial browser comparison failed because generated Shape identifiers made its geometry fingerprint differ; the fixture repair preserves the actual shape content, and fresh runs provide the accepted captures. The candidate remained unchanged. Slow host startup required a 450-second workflow limit and a 900-second total limit per attempt. The original [failed run](checks/initial-browser-failure/browser-run.json), [fixture repair](checks/native-fingerprint-repair.json), [fingerprint verification](checks/native-fingerprint-verification.json) and [timeout adjustment](checks/native-workflow-timeout-adjustment.json) are retained with the report. Final source and executed-checker pins are recorded in [verification.json](verification.json).

Source SHA-256: \`${expected}\`.
`;
fs.writeFileSync(path.join(work,'README-draft.md'),readme);
console.log(JSON.stringify({reportPrepared:true,sourceSHA256:expected,shadingCases:3,geometryCases:6,browserWorkflows:2,seamBeforeMaxDegrees:beforeMax,seamAfterMaxDegrees:afterMax}));
