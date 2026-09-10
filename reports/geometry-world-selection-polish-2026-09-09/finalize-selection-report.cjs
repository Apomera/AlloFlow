const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=__dirname,read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const before=read('before-results.json'),after=read('after-results.json'),supplemental=read('supplemental-results.json');
const check=(ok,message)=>{if(!ok)throw Error(message);};
check(before.pass&&after.pass&&supplemental.pass,'Every final browser stage must pass');
check(JSON.stringify(before.initial)===JSON.stringify(after.initial),'Full before/after fixture mismatch');
check(JSON.stringify(after.initial)===JSON.stringify(supplemental.initial),'Supplemental fixture mismatch');
const hashes={};for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join('stem_lab',name))).digest('hex');check(hashes[name]===supplemental.sources[name],'Supplemental must match current '+name);}
const summary={pass:true,scope:'Actual browser selection/dock/Showcase/PNG/Print Lab checks, followed by a narrow phone disclosure-overlap check. Parent owns separate source regression aggregation.',baseline:'before-results.json',finalWorkflow:'after-results.json',retainedHarnessAttempt:'after-first-attempt-results.json',phoneOverlapFollowup:'supplemental-results.json',exactFixturePreserved:true,print:after.print.transfer,return:after.print.returned,export:after.cases.find(c=>c.size.width===390).showcase.export,sources:hashes,visualFinding:{issue:'Collapsed Build launcher intersected expanded phone measurement text.',fixed:!supplemental.intersection&&supplemental.collapsedDetails.dock.visible&&!supplemental.reexpanded.dock.visible&&supplemental.build.visible&&supplemental.build.hit}};
check(summary.visualFinding.fixed,'The observed phone overlap must be resolved');
fs.writeFileSync(path.join(dir,'selection-visual-summary.json'),JSON.stringify(summary,null,2));
const reportPath=path.join(dir,'SELECTION-VISUAL-QA.md');let report=fs.readFileSync(reportPath,'utf8');
report=report.slice(0,report.indexOf('## Final verification'))+`## Final verification

The final two-viewport workflow passed with no page, console, or shader errors. The matched baseline and final fixture signatures are exact. Close and Clear selection are now 44px high and hit-testable; pinned Send receives a visible 3px outline through actual Tab navigation.

- A single static corner frame has 48 vertices (24 short corner segments), replacing the full box cage. The creation's material surfaces are visibly clearer in the focused view. All selected fractional mesh vertices fit at both sizes.
- Meadow and Studio hide the corner frame synchronously. Renderer instrumentation observed zero frames with the selection frame visible during Showcase entry, scene-look changes, and the actual phone image export. Exit restores the exact focused camera pose and visible selection marker.
- The phone PNG is ${summary.export.width}×${summary.export.height}, ${summary.export.bytes.toLocaleString('en-US')} bytes, and visually inspected. It contains no selection markers or UI overlays. Renderer export preserves the camera and exact selected STL/history.
- The default envelope explicitly labels Width 30mm, Depth 20mm, and Height 25mm. A retained 20mm-per-block scale produces 120×80×100mm. An asymmetric profile correctly marks only the dimensions exceeding its own bed; a width-only limit uses the singular accessible message.
- Actual Send transfers all ${summary.print.bytes.toLocaleString('en-US')} selected STL bytes unchanged at 20mm per block. Print Lab displays/persists that scale. Actual Revise returns all45 authored blocks, the44-block selection, complete undo/redo stacks, and20mm print context.

Manual inspection found one phone overlap in the first complete run: the collapsed Build launcher occupied x161,y588,width68,height59 inside the expanded inspector. A narrow final correction hides that launcher while the phone disclosure is expanded. The supplemental run confirms expand→collapse→expand→scroll→Close restores the launcher at the right times, retains a reachable44px Close, and preserves exact geometry/STL/history. The final expanded and scrolled screenshots have no launcher over the inspector text.

The raw initial final-harness attempt is preserved in \`after-first-attempt-results.json\`. It stopped because the harness expected Previous view after Showcase; Showcase deliberately releases Focus ownership. The corrected run verifies exact Showcase-entry camera restoration instead. This was a verifier assumption, not a production failure.

Final evidence:

- \`after-results.json\` — full desktop/phone workflow and PNG/Print Lab checks.
- \`supplemental-results.json\` — final phone overlap correction and current source hashes.
- \`selection-visual-summary.json\` — combined assertions and exact fixture/source verification.
- \`after-focus-1440x900.png\` and \`after-focus-390x844.png\` — clear creation silhouettes and selection corners.
- \`after-envelope-1440x900.png\`, \`after-envelope-390x844.png\`, and \`after-envelope-over-limit-390x844.png\` — labeled physical dimensions.
- \`after-showcase-studio-390x844.png\` and \`after-studio-export-phone.png\` — clean Studio UI and high-resolution export.
- \`supplemental-measurement-expanded-390x844.png\` and \`supplemental-measurement-expanded-scrolled-390x844.png\` — final expanded drawer clearance.

These checks use actual local WebGL through SwiftShader and touch-enabled Chromium; they are not physical iPhone/Safari tests. Printer readiness remains advisory and no printer was connected. Source edits and separate unit regression aggregation belong to the parent agents; this subtask changed report scripts/evidence only.
`;
const fd=fs.openSync(reportPath,'r+');fs.writeFileSync(fd,report);fs.ftruncateSync(fd,Buffer.byteLength(report));fs.closeSync(fd);
console.log(JSON.stringify(summary,null,2));
