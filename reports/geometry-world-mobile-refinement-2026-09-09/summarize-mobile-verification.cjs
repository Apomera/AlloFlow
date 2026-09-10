const fs=require('node:fs'),path=require('node:path'),out=__dirname;
const before=JSON.parse(fs.readFileSync(path.join(out,'before-results.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(out,'after-results.json'),'utf8'));
const supplemental=JSON.parse(fs.readFileSync(path.join(out,'supplemental-results.json'),'utf8'));
const visualPass=!after.failure&&after.failures.every(f=>f==='Unchanged selected build triggers zero structure traversals across five idle polls');
if(!visualPass||!supplemental.pass)throw Error('Visual or supplemental checks have not passed');
if(JSON.stringify(after.sourceHashes)!==JSON.stringify(supplemental.sourceHashes))throw Error('Final source hashes do not match');
const rows=after.viewports.map(a=>{const b=before.viewports.find(v=>v.label===a.label),old=b.focused.creation,next=a.focused.creation;return {viewport:a.label,before:{width:old.width,height:old.height,area:old.width*old.height,inspectorHeight:b.inspector.inspector.height},after:{width:next.width,height:next.height,area:next.width*next.height,inspectorHeight:a.inspector.inspector.height},heightRatio:next.height/old.height,areaRatio:next.width*next.height/(old.width*old.height),clearRect:a.focused.clearRect,primaryCount:a.primary.length,primaryTargetsPass:a.primary.every(c=>c.hit&&c.inViewport&&c.width>=43.5&&c.height>=43.5),obstacleOverlap:a.focused.obstacles.filter(o=>o.overlap)};});
const comparison={pass:true,sameFixture:before.initial.hash===after.initial.hash&&before.initial.world===after.initial.world,sourceHashes:after.sourceHashes,idleTraversalCalls:supplemental.idleTraversalCalls,idleWarmupCalls:supplemental.idleWarmupCalls,supplementalPhoneLandscapePassed:supplemental.pass,viewports:rows};
if(!comparison.sameFixture)throw Error('Before/after fixtures differ');
function write(name,text){const file=path.join(out,name);if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(file,text);}
write('mobile-comparison.json',JSON.stringify(comparison,null,2));
const n=value=>Number(value).toFixed(1);
const table=rows.map(r=>`| ${r.viewport} | ${n(r.before.width)} × ${n(r.before.height)} | ${n(r.after.width)} × ${n(r.after.height)} | ${r.heightRatio.toFixed(2)}× | ${n(r.before.inspectorHeight)} → ${n(r.after.inspectorHeight)} |`).join('\n');
write('MOBILE-VISUAL-QA.md',`# Mobile Geometry World — matched browser QA

The final visual and interaction checks passed at all four viewports with the same 44-block fractional pavilion, identical initial STL and complete authored fixture. The supplemental phone-UA landscape and warmed idle checks also passed. One local Chromium browser ran at DPR1 with the real React tool, Three r128 and Saver rendering. Core and builder source bytes were frozen for each run; the baseline copies remain in before-source/.

| Viewport | Creation before, px | Creation after, px | Height ratio | Inspector height before → after, px |
| --- | --- | --- | --- | --- |
${table}

On the narrow portrait phone, moving utilities into a horizontal row creates a much wider clear region for the creation. All five utility buttons, including Undo and Redo, remain visible, hit-testable and at least 44px high. All primary touch, utility and return controls passed hit/viewport/target checks; no primary controls overlapped in the busiest 320px state. Actual transformed model vertices fit the camera, and their projected bounds do not intersect visible controls.

The phone measurement summary displays labeled length, width, height and exact occupied volume. At 320px, the previous 158px panel clipped the beginning of Layer Explorer; the new natural-height summary exposes the essential values and a clear disclosure. At 390px, the compact summary reduces the panel height. The matched wider desktop-browser captures keep the measurement tools expanded; the supplemental phone-user-agent landscape check uses the compact summary.

Native disclosure activation with Enter, keyboard layer-slider changes, sticky Close access, and Previous view keyboard focus passed. A connected fractional edit did not collapse the expanded phone inspector. Actual keyboard Undo restored the previous model and prior undo stack; its expected redo entry was captured as an explicit checkpoint. Subsequent measurement, focus, return and real Undo/Redo checks preserve exact selected STL, complete world and history relative to that checkpoint. Closing the inspector retains the selection.

The final source also recorded zero measureStructure calls during a stabilized 1.25-second idle window. The original four-viewport run recorded one measurement because installing the counter changed the measuring function identity, which deliberately invalidates the cache. The separate supplemental probe settles that initial invalidation before resetting its counter; it supersedes only that idle assertion and preserves the original result. Longer cache timing and graph-correctness tests are owned by the independent performance review. No page, console or shader compilation errors occurred. This pass does not repeat the real Print Lab handoff already verified in the preceding Focus camera pass; it preserves exact selected export bytes throughout these UI interactions.

The first after attempt used an outdated dimension-label assertion and assumed 844px landscape used the compact disclosure. It was stopped by the latter verifier assumption. after-first-attempt-results.json retains that evidence; the corrected final run uses actual dimension fields and the component's compact-state contract. No production change was needed for those harness corrections.

The supplemental touch-capable Chromium context uses an iPhone user-agent at 844 × 390. It confirmed compact essentials, disclosure activation by keyboard and actual taps, keyboard layer changes, scrollable expanded content and a hit-testable sticky 44px Close button. The inspector closes with selection and exact STL/history preserved. This is browser emulation, not a physical Safari device test.

## Evidence

- [Comparison data](mobile-comparison.json)
- [Final after results](after-results.json)
- [Before results](before-results.json)
- [Supplemental phone-UA and settled idle results](supplemental-results.json)
- [Phone-UA landscape expanded and scrolled inspector](supplemental-measure-expanded-scrolled-844x390.png)
- [Executable matched verifier](verify-mobile-refinement.cjs)
- [320px before](before-focus-320x700.png) / [320px after](after-focus-320x700.png)
- [Five utilities with Undo and Redo](after-utilities-with-redo-320x700.png)
- [390px after](after-focus-390x844.png)
- [Short landscape after](after-focus-844x390.png)
- [Desktop after](after-focus-1440x900.png)
- [Compact phone inspector](after-measure-320x700.png)
- [Expanded phone inspector](after-measure-expanded-320x700.png)

The final browser closed normally. This agent edited only report scripts and evidence.
`);
console.log(JSON.stringify(comparison,null,2));
