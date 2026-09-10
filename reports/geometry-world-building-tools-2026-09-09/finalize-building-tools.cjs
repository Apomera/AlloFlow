const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const before=read('before-results.json'),browser=read('after-results.json'),imports=read('import-browser-results.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{
  const source=fs.readFileSync(path.join('stem_lab',name)),mirror=fs.readFileSync(path.join('desktop/web-app/public/stem_lab',name));new vm.Script(source.toString(),{filename:name});
  return {name,sha256:sha(source),parse:true,mirrorMatches:source.equals(mirror),browserMatches:sha(source)===browser.sources[name],importBrowserMatches:sha(source)===imports.sources[name],changed:!source.equals(fs.readFileSync(path.join(dir,'before-source',name)))};
});
const tests=new Map(),latestSuites=new Map(),evidence=[];
for(const file of ['building-tools-tests.json','building-regression-tests.json','import-transaction-tests.json','import-presentation-tests.json','recovery-button-ui-tests.json']){
  const data=read(file);let count=0;
  for(const suite of data.testResults){latestSuites.set(suite.name,suite);count+=suite.assertionResults.length;}
  if(!data.success||count!==data.numTotalTests||data.numPassedTests!==count)throw Error('Incomplete or failing test evidence '+file);
  evidence.push({file,loadedFiles:data.testResults.length,tests:count,passed:data.numPassedTests,processExitCode:0});
}
for(const [name,suite]of latestSuites) suite.assertionResults.forEach((test,index)=>tests.set(name+'::'+index,{suite:path.basename(name),name:test.fullName,status:test.status}));
const failed=[...tests.values()].filter(test=>test.status!=='passed');
const summary={pass:browser.pass&&imports.pass&&sources.every(s=>s.mirrorMatches&&s.browserMatches&&s.importBrowserMatches)&&!failed.length,sources,tests:{unique:tests.size,passed:tests.size-failed.length,suites:new Set([...tests.values()].map(t=>t.suite)).size,failed,evidence},browser:{pass:browser.pass,errors:browser.errors,consoleErrors:browser.consoleErrors,failures:browser.failures,viewports:browser.captures.map(c=>({size:c.size,allUtilitiesReachable:c.utilityButtons.every(b=>b.width>=44&&b.height>=44&&b.inViewport&&b.hit),feedbackInBounds:c.cue.inViewport,feedbackOverlaps:c.cue.overlaps,screenshot:c.screenshot})),nativeMiddleClick:browser.middle?.nativePointerLock,immediateMatchPlace:browser.immediate,narrowRedo:browser.redoUtilities,protectedBeforePass:{before:before.protectedBreak.before.placed,after:before.protectedBreak.after.placed},protectedAfterPass:{before:browser.protectedBreak.before.placed,after:browser.protectedBreak.after.placed}},importBrowser:{pass:imports.pass,cases:imports.cases.map(c=>({mode:c.mode,restoredExactly:JSON.stringify(c.before)===JSON.stringify(c.after),error:c.error})),showcase:imports.showcaseFailure,persistent:imports.persistent,recoveryFile:imports.recoveryFile,geometryReopened:JSON.stringify(imports.reopened?.world)===JSON.stringify(imports.original?.world),stlReopened:imports.reopened?.stl===imports.original?.stl,errors:imports.errors,consoleErrors:imports.consoleErrors,failures:imports.failures},scope:'Local production scripts in the React/THREE browser harness with software WebGL; controlled ray hits on real block meshes and native keyboard/touch/mouse controls. No physical printer or deployment.'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));if(!summary.pass)throw Error('Final validation failed; inspect summary.json');
const report=`# Geometry World: building tools and import recovery

This pass improves everyday building: reuse an existing block in one action, see the current material and shape more clearly, and recover the previous workspace when opening a file fails.

## What changed

- **Match block:** aim at a block and use **I**, middle-click while the world has pointer lock, the Match toolbar button, or **Match aimed block** in the builder dock. It copies material, shape, and rotation together. The placement preview and immediate next placement use the copied recipe.
- **Clearer building panel:** current choices appear above creation statistics; long shape names wrap, with rotation on a separate line. The narrow phone toolbar keeps every utility label visible with targets at least 44 px, including when Redo appears. Showcase correctly says “1 block” for a single block.
- **Accurate break feedback:** protected ground and lesson blocks keep their protective response without reducing the placed count or triggering successful-break effects. Stale ray hits cannot remove a replacement block.
- **Checked import recovery:** validation still precedes confirmed replacement. If any placement returns a rejection, throws, or does not create the expected block, Geometry World attempts a checked restoration of the previous live blocks and their roles, history, selection, counters, camera, lesson state, and print context.
- **Recovery after a second failure:** if restoration also fails, the first complete backup remains available. A valid student build can be downloaded as editable AlloFlow JSON; an empty or oversized original instead offers clearly labelled recovery details. Failed imports from Showcase return to the building dock with a focused explanation.

![Updated builder dock](after-building-dock-1440x900.png)

## Verification

**${summary.tests.passed} unique tests passed across ${summary.tests.suites} suites.** Each recorded Vitest process exited 0; loaded case counts match its JSON output. Coverage includes all 192 material/shape/rotation recipes, immediate I → B placement, keyboard and modal guards, feedback timer ownership, protected and stale removal, placement previews, editable files, and the existing Print Lab geometry/continuity workflow.

The final source snapshots passed browser checks at 1440×900, 390×844, 320×700, and 844×390. Every utility action is reachable and at least 44 px, including six actions with Redo at 320 px. Match feedback stays within the screen and clears the other controls. Native touch, Space, I, and middle-click with genuine browser pointer lock all work. Matching leaves geometry, STL, history, selection, counters, and camera unchanged; immediate I → B creates the expected rotated quarter wedge.

The protected-ground regression is demonstrated in the browser: the previous version changed the placed count from **${summary.browser.protectedBeforePass.before} to ${summary.browser.protectedBeforePass.after}**; the updated version keeps it at **${summary.browser.protectedAfterPass.before}**.

Actual-browser import fault injection covers a null placement, a thrown placement, a failed import from Showcase, and a persistent placement failure that prevents restoration. Ordinary failures restore the checked workspace exactly. The persistent-failure recovery JSON was downloaded through the UI and reopened successfully with the original editable geometry and identical STL.

Canonical and desktop scripts parse and match byte for byte. Both browser runs used these final hashes. Print Lab source is unchanged. No page, console, or shader errors were observed.

![Narrow phone toolbar including Redo](after-redo-320x700.png)

![Previous-build recovery download](after-import-recovery-1200x900.png)

## Practical limits

These checks use local production scripts in a minimal React/THREE host and software WebGL. Ray targets are controlled on real meshes for repeatable interaction checks. They do not establish hardware GPU performance or a physical printing result. Normal in-app rollback preserves print context and lesson roles; the downloadable editable recovery file preserves the student build under the existing JSON format. It is a recovery option while Geometry World remains open, not an autosave service.

## Evidence

- [Machine-readable summary](summary.json)
- [Final building browser checks](after-results.json)
- [Import recovery browser checks](import-browser-results.json)
- [Focused Match test report](BUILDING-TOOLS-TESTS.md)
- [Recovered editable build](recovered-previous-build.json)

${sources.map(s=>'- '+s.name+': `'+s.sha256+'`').join('\n')}
`;
fs.writeFileSync(path.join(dir,'BUILDING-TOOLS.md'),report);
console.log(JSON.stringify({pass:summary.pass,tests:summary.tests.passed,suites:summary.tests.suites,browserSizes:summary.browser.viewports.length,nativeMiddleClick:summary.browser.nativeMiddleClick,importRecovery:imports.pass,sources}));
