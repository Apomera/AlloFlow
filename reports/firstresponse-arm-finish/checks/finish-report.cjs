const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,json=n=>JSON.parse(fs.readFileSync(path.join(work,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=json('delta.json'),expected=delta.afterSHA256,geometry=json('geometry-final/arm-verification.json'),browser=json('native-final/summary.json'),metrics=json('native-final/arm-preview-metrics.json'),review=json('visual-review.json'),history=json('history-preservation.json');
assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),expected);assert.equal(geometry.candidateSHA256,expected);assert.equal(geometry.beforeSHA256,delta.beforeSHA256);assert.equal(geometry.passed,true);assert.equal(geometry.results.length,6);assert.ok(geometry.results.every(r=>r.status==='passed'));assert.equal(geometry.negative.length,2);assert.ok(geometry.negative.every(r=>r.rejected&&r.restored));
assert.equal(browser.finalSHA,expected);assert.equal(browser.workflows,2);assert.equal(browser.evidenceCount,8);assert.equal(browser.stats.expected,2);for(const key of ['unexpected','skipped','flaky'])assert.equal(browser.stats[key],0);
assert.equal(review.sourceSHA256,expected);assert.equal(review.accepted,true);assert.deepEqual(review.imageHashes,browser.imageHashes);
let independent=null;if(fs.existsSync(path.join(work,'independent-visual-review.json'))){independent=json('independent-visual-review.json');assert.equal(independent.sourceSHA256,expected);assert.equal(independent.accepted,true);assert.deepEqual(independent.imageHashes,browser.imageHashes);}
assert.equal(history.sourceSHA256,expected);assert.equal(history.historicalChain.length,10);assert.equal(Object.keys(history.fixtureHashes).length,39);assert.equal(Object.keys(history.sharedHistoryInputs.checkerHashes).length,7);
let raw=null;if(fs.existsSync(path.join(work,'raw-arm-contours/summary.json'))){raw=json('raw-arm-contours/summary.json');assert.equal(raw.sourceSHA256,expected);assert.equal(raw.passed,true);assert.equal(raw.numPassedTests,13);assert.equal(raw.numTotalTests,13);assert.equal(raw.numFailedTests,0);assert.equal(raw.numPendingTests,0);assert.equal(raw.rawTestExact,true);assert.equal(raw.sourceIsExactCandidate,true);}
const views=[['Adult heel side view','adult-heel-side'],['Child heel side view, app contrast, 320px viewport','child-heel-side-contrast']];
const pairs=views.map(([label,id])=>{
 const find=(variant,phase)=>metrics.evidence.find(e=>e.id===id&&e.variant===variant&&e.phase===phase),b=find('baseline','compression'),a=find('candidate','compression'),releasedB=find('baseline','release'),releasedA=find('candidate','release');assert.ok(b&&a&&releasedB&&releasedA);
 const elbow=b.elbowDetail&&a.elbowDetail,beforeImage=elbow?b.elbowDetail.file:b.capture,afterImage=elbow?a.elbowDetail.file:a.capture;
 return `### ${label}: compression${elbow?' at the elbow':''}\n\n| Before | After |\n| --- | --- |\n| ![Original ${elbow?'elbow':'full view'}](native-final/${beforeImage}) | ![Refined ${elbow?'elbow':'full view'}](native-final/${afterImage}) |\n\n[Before full view](native-final/${b.capture}) · [After full view](native-final/${a.capture})\n\nRelease: [before](native-final/${releasedB.capture}) · [after](native-final/${releasedA.capture}). Wrist contact: [before](native-final/${b.detail.file}) · [after](native-final/${a.detail.file}).`;
}).join('\n\n');
const rawLine=raw?'- **Arm regressions:** 13 unchanged raw arm-contour tests passed against the candidate, covering arm shape, elbow normals and hand contact. [Raw test results](checks/raw-arm-contours/summary.json)':'- The existing raw arm-contour and hand-alignment tests were not rerun in this pass.';
const visualLine=independent?'Root and independent review covered the accepted captures. [Root review](checks/visual-review.json) · [Independent review](checks/independent-visual-review.json)':'Root review covered the accepted captures. [Visual review](checks/visual-review.json)';
const failed=json('native-adult-side/adult-heel-side-evidence.json');assert.equal(failed.finalSHA,expected);assert.equal(failed.attempts.length,1);assert.equal(failed.attempts[0].variant,'baseline');assert.equal(failed.attempts[0].phase,'mount');assert.equal(failed.evidence.length,0);assert.ok(!browser.runs.includes('native-adult-side'));
const mountRepair=json('native-mount-repair.json'),mountProof=json('mount-window-check.json');assert.equal(mountRepair.passed,true);assert.equal(mountRepair.candidateSHA256,expected);assert.equal(mountRepair.mountWaitBeforeMs,30000);assert.equal(mountRepair.mountWaitAfterMs,120000);assert.equal(mountRepair.conditionPreserved,true);assert.equal(mountProof.passed,true);assert.equal(mountProof.waitPredicateUnchanged,true);assert.equal(mountProof.restoredOnSuccess,true);assert.equal(mountProof.restoredOnMountRejection,true);assert.equal(mountProof.restoredOnWaitRejection,true);
const countFailure=json('native-adult-recovered/adult-heel-side-evidence.json'),countBefore=countFailure.attempts.find(a=>a.variant==='baseline').release,countAfter=countFailure.attempts.find(a=>a.variant==='candidate').release;assert.equal(countFailure.finalSHA,expected);assert.equal(countBefore.draw.triangles-countAfter.draw.triangles,96);assert.ok(!browser.runs.includes('native-adult-recovered'));
const triangleRows=views.map(([label,id])=>{const changes=['release','compression'].map(phase=>{const b=metrics.evidence.find(e=>e.id===id&&e.variant==='baseline'&&e.phase===phase),a=metrics.evidence.find(e=>e.id===id&&e.variant==='candidate'&&e.phase===phase),difference=b.draw.triangles-a.draw.triangles;assert.ok(Number.isInteger(difference)&&difference>=0&&difference<=144);return difference;});return `| ${label} | ${changes[0]} | ${changes[1]} |`;}).join('\n');
const drawRepair=json('native-draw-repair.json'),drawProof=json('render-submissions-check.json');assert.equal(drawRepair.passed,true);assert.equal(drawRepair.candidateSHA256,expected);assert.equal(drawRepair.fixtureReverseExact,true);assert.equal(drawRepair.constructedTriangleReduction,144);assert.equal(drawProof.passed,true);assert.equal(drawProof.onlySubmittedMeshesRecorded,true);
const readme=`# First Response Lab: rescuer arm finish

Completed October 8, 2026. Changes remain uncommitted.

The rescuer arms now omit hidden end disks that overlapped at the elbows. This removes competing internal faces from rendering while retaining the existing outer arm shape and wrist shading.

Only the forearm and upper-arm draw ranges change. Every vertex, normal, index, material and transform remains identical. Hand placement, camera framing and compression behavior stay intact. Across the two arm assemblies, draw ranges omit 144 hidden cap triangles; the number submitted for rendering depends on which arm meshes are in view. Mesh, geometry and material counts remain unchanged.

## Before and after

${pairs}

[Matched captures and measurements](native-final/arm-preview-metrics.json) identify the source, camera and contact state for each image. Elbow details are included where the elbows fall inside the captured view.

## Verification

- **Arm geometry:** six age/contrast cases passed with ${geometry.assertions.toLocaleString('en-US')} assertions. The gate checks the intended draw ranges, elbow joins, hidden forearm boundaries and unchanged scene data through multiple compression states. Restoring an omitted elbow cap and changing an unrelated vertex both fail; each mutation is restored and reread. [Geometry results](checks/arm-verification.json)
- **Native Chromium:** two matched workflows passed with one worker and zero automatic retries. Eight source/view/phase captures produced ${browser.images.length} images, including ${browser.elbowCaptureCount} elbow details. Wrist geometry and shading remain exact; only the accepted arm draw ranges differ. Resources stay stable and the renderer is disposed once. [Browser results](native-final/summary.json)
${rawLine}
- **History and source:** four runtime copies are identical. All 39 raw fixtures and seven existing checkers remain unchanged; ten exact history reversals preserve previous comparison inputs. [History checks](checks/history-preservation.json)
- **Visual review:** ${visualLine}

The matched captures submitted the following numbers of fewer triangles:

| View | Release | Compression |
| --- | ---: | ---: |
${triangleRows}

The first desktop attempt timed out during baseline mounting before it reached the candidate. A private harness wrapper gives the same mounting checks 120 seconds instead of 30, preserving their conditions and restoring the page method afterward. Its [failure result](checks/initial-browser-failure/browser-run.json), [log](checks/initial-browser-failure/browser-run.log), [input pins](checks/initial-browser-failure/inputs.json), [repair record](checks/native-mount-repair.json) and [wrapper checks](checks/mount-window-check.json) are retained separately. The accepted desktop captures come from a fresh run.

A second attempt reached the candidate but exposed an incorrect test expectation: the release view submitted 96 fewer triangles because the upper arms were outside its viewing frustum. The test had expected all 144 omitted cap triangles. The corrected check derives the expected count from the affected meshes actually submitted by the renderer. The application candidate did not change. [Second failure result](checks/triangle-expectation-failure/browser-run.json) · [Second failure log](checks/triangle-expectation-failure/browser-run.log) · [Count-check repair](checks/native-draw-repair.json) · [Submission-recorder checks](checks/render-submissions-check.json)

The browser harness mounts the raw First Response module. These checks do not verify the full application loader or a deployment. Older geometry gates and the raw hand-alignment suite were not rerun in this pass. Source and checker pins are recorded in [verification.json](verification.json).

Source SHA-256: \`${expected}\`.
`;
fs.writeFileSync(path.join(work,'README-draft.md'),readme);console.log(JSON.stringify({reportPrepared:true,sourceSHA256:expected,geometryCases:6,browserWorkflows:2,images:browser.images.length,independentVisualReview:!!independent,rawArmContours:!!raw}));
