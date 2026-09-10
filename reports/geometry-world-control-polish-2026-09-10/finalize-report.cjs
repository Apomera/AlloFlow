const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=process.cwd(),dir=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=read('before-browser.json'),after=read('after-browser.json'),tests=read('final-tests.json');
const exits=JSON.parse(process.argv[2]||'null');
if(!exits||exits.baselineBrowser!==0||exits.finalBrowser!==0||exits.finalTests!==0)throw Error('Record observed completed process exits.');
if(!before.pass||!after.pass||after.failures.length||after.errors.length||after.consoleErrors.length||after.inspector.length!==5||after.utilities.length!==10)throw Error('Browser verification incomplete or failed.');
const assertions=tests.testResults.flatMap(r=>r.assertionResults);
if(!tests.success||tests.testResults.length!==6||assertions.length!==98||tests.numTotalTests!==98||tests.numPassedTests!==98||assertions.some(a=>a.status!=='passed')||tests.testResults.some(r=>r.status!=='passed'))throw Error('All 98 assertions in 6 files must pass.');
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
const sources=names.map(name=>{const canonical=fs.readFileSync(path.join(root,'stem_lab',name)),mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab',name)),frozen=fs.readFileSync(path.join(dir,'after-source',name)),hash=sha(canonical);new vm.Script(canonical.toString(),{filename:name});if(!canonical.equals(mirror)||!canonical.equals(frozen)||after.sources[name]!==hash)throw Error('Final source, browser and mirror differ: '+name);return {file:name,sha256:hash,mirrorIdentical:true,browserSnapshotIdentical:true,parses:true,changed:before.sources[name]!==hash};});
if(sources.find(s=>s.file==='stem_tool_printlab.js').changed)throw Error('Unexpected Print Lab source change.');
const outsideCompact=after.utilities.filter(r=>r.size.width>420).map(r=>{const baseline=before.utilities.find(b=>b.size.width===r.size.width&&b.redo===r.redo);return {width:r.size.width,redo:r.redo,buttonGeometryUnchanged:JSON.stringify(r.buttons)===JSON.stringify(baseline.buttons)};});
if(outsideCompact.some(r=>!r.buttonGeometryUnchanged))throw Error('Unexpected utility layout change above 420px.');
const phoneUtilities=after.utilities.filter(r=>r.size.width<=420);if(phoneUtilities.some(r=>r.buttons.some(b=>b.width<44||b.height<44||!b.inViewport||!b.hit)))throw Error('Phone utilities not all reachable.');
const phoneCards=after.inspector.filter(r=>[390,414].includes(r.size.width));if(phoneCards.some(r=>r.hero.top<r.body.top||r.hero.bottom>r.body.bottom+.1||r.scopeRect.bottom>r.body.bottom))throw Error('Phone selection card is clipped.');
const evidence={pass:true,processExits:exits,sources,testFiles:tests.testResults.length,loadedAssertions:assertions.length,passedAssertions:assertions.filter(a=>a.status==='passed').length,browserViewports:after.inspector.map(r=>r.size),utilityStates:after.utilities.length,phoneUtilitiesAllReachable:true,outsideCompact,nativeFullscreenPassed:true,contrast:after.contrast.colors,scaleDraft:after.draft,printLabReturn:{selectedMetrics:after.returned.info.metrics,unitMm:after.returned.unit,fullWorkspacePreserved:JSON.stringify(after.returned.world)===JSON.stringify(after.initial.world)},browserErrors:after.errors,consoleErrors:after.consoleErrors,shaderErrors:after.shaders};
if(!evidence.printLabReturn.fullWorkspacePreserved)throw Error('Print Lab workspace mismatch.');
fs.writeFileSync(path.join(dir,'final-verification.json'),JSON.stringify(evidence,null,2));
const link=n=>path.join(dir,n).replaceAll('\\','/');
const suiteRows=tests.testResults.map(r=>`| ${path.basename(r.name)} | ${r.assertionResults.length} | Passed |`).join('\n');
const viewRows=after.inspector.map(r=>`| ${r.size.width} × ${r.size.height} | 60 blocks; 6 × 4 × 5 | ${r.hero.bottom<=r.body.bottom+.1?'Visible without scrolling':'Scroll within the inspector'} | None |`).join('\n');
const hashRows=sources.map(s=>`| ${s.file} | ${s.sha256} | Identical |`).join('\n');
const md=`# Geometry World: selected creation and phone controls

The selected build now leads Free Build Studio with a pale green summary, a clear block count and bounds, and a direct explanation of what Showcase and Print Lab will use. Inspection and print controls precede the general building tools while a valid selection is retained. Clearing the selection restores the general building layout.

The compact phone toolbar now applies through 420 px. Undo and Redo counts no longer push Home and Clear outside the viewport at 390 or 414 px. All five- and six-button states remain reachable with at least 44 × 44 px targets.

## Visual refinements

- Selected creation gets a cube emblem, consistent typography, two focused metrics, and a subtle pale green surface.
- The visible action reads “Select another build” while a build is retained. Its accessible action name and behavior are preserved.
- Redundant selected-state guidance is visually hidden but remains available to screen readers. Compact padding keeps the complete summary card visible at 390 × 844 and 414 × 896.
- The high contrast theme retains black surfaces, cyan borders, and white summary text.
- Stable React keys preserve a focused print-scale input and its unfinished draft when selection changes or the panel reorders.
- A transient measurement of the floor or another build cannot relabel the retained selection. A fallback measurement without a retained selection does not claim to be the selected export scope.

## Verified results

**98 assertions passed across 6 files. Final test process, baseline browser process, and final browser process all exited 0.** Canonical files match the desktop mirrors and the exact browser source snapshot; all three scripts parse. Print Lab source is unchanged.

| Suite | Assertions | Result |
|---|---:|---|
${suiteRows}

The existing guidance and dock tests were updated for the new selected-summary markup and wording while preserving their selection/export assertions. Ten focused inspector cases cover fallback truth, retained selection, clearing, scale draft/focus/DOM continuity, and exact selected STL handoff.

| Inspector viewport | Selected summary | Card visibility | Page horizontal overflow |
|---|---|---|---|
${viewRows}

Browser coverage also includes ten utility states at 320, 390, 414, 430 and 844 px, with and without Redo. The stress fixture displays 123 Undo and 234 Redo entries. At 320–414 px every control has a native center hit target, fits the viewport, and meets the 44 px minimum. The recorded 430 and 844 px utility layouts are unchanged from the baseline. Native fullscreen was entered and exited through the actual controls at 390 px.

The fixture contains a 60-block pavilion and two separate blocks elsewhere. Selecting another build updates the summary to two blocks; reselecting the pavilion returns it to 60. Unrelated measurements keep the retained summary at 60. Inspector actions preserve exact block data, raw STL hash, undo/redo history, camera, placement count, mesh identity, materials and vertex data. The moved Match action still copies the aimed wood material.

Sending the pavilion to Print Lab and using **Revise in Geometry World** restores the selected 60-block pavilion at **12.5 mm per block**, together with all workspace blocks. The selected-files and print-workflow suites cover the export/mesh behavior. This pass changes presentation and panel ordering; it adds no new file format.

The browser recorded no page, console, or shader errors. Visual inspection covered desktop, phone, short landscape, high contrast, and the before/after crowded toolbar. The browser harness uses real app scripts, software WebGL, and a controlled ray-hit fixture with native UI actions. It verifies digital handoff; no physical print was performed. On very short screens, the inspector remains internally scrollable and can be collapsed to recover building space.

## Before and after

Desktop before:

![Previous desktop inspector](${link('before-selected-1440x1000.png')})

Desktop after:

![Refined desktop inspector](${link('after-selected-1440x1000.png')})

Phone selection after:

![Phone selected creation](${link('after-selected-390x844.png')})

Crowded phone toolbar before:

![Previous phone toolbar](${link('before-utilities-390-six.png')})

Phone toolbar after:

![Refined phone toolbar](${link('after-utilities-390-six.png')})

## Evidence and source identity

[Final verification](${link('final-verification.json')}) · [Test results](${link('final-tests.json')}) · [Browser results](${link('after-browser.json')}) · [Browser baseline](${link('before-browser.json')})

| Script | SHA-256 | Desktop mirror |
|---|---|---|
${hashRows}

An independent source review found no actionable issues with selection validity, keyed component identity, or accessibility. Final browser validation and focused suites cover the subsequent phone padding refinement.
`;
fs.writeFileSync(path.join(dir,'CONTROL-POLISH.md'),md);
console.log(JSON.stringify({report:link('CONTROL-POLISH.md'),pass:true,tests:assertions.length,files:tests.testResults.length,sources,outsideCompact}));
