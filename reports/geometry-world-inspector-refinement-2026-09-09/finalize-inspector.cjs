const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');const dir=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=read('before-browser.json'),after=read('after-browser.json');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{const a=fs.readFileSync('stem_lab/'+name),b=fs.readFileSync('desktop/web-app/public/stem_lab/'+name);new vm.Script(a.toString(),{filename:name});return {name,sha256:sha(a),parse:true,mirrorMatches:a.equals(b),browserMatches:sha(a)===after.sources[name],changed:!a.equals(fs.readFileSync(path.join(dir,'before-source',name)))};});
let tests=0,suites=0;const evidence=[];for(const file of ['scale-controls-tests.json','inspector-regressions.json']){const r=read(file),loaded=r.testResults.reduce((n,s)=>n+s.assertionResults.length,0);if(!r.success||loaded!==r.numTotalTests||r.numPassedTests!==loaded||r.testResults.some(s=>s.assertionResults.some(t=>t.status!=='passed')))throw Error('Incomplete test run '+file);tests+=loaded;suites+=r.testResults.length;evidence.push({file,tests:loaded,suites:r.testResults.length,processExitCode:0});}
const summary={pass:before.pass&&after.pass&&sources.every(s=>s.mirrorMatches&&s.browserMatches),sources,tests:{passed:tests,suites,evidence},browser:{pass:after.pass,errors:after.errors,consoleErrors:after.consoleErrors,failures:after.failures,layouts:after.layouts,coordinateStates:after.coordinates,fullscreen:after.fullscreen,fixture:after.fixture,scales:after.scales.map(s=>({unit:s.unit,dimensions:s.dimensions,over:s.over,fit:s.fit})),custom:after.custom,stl:after.stl,returned:after.returned},baseline:{clippedSummaryStates:before.coordinates.filter(r=>!r.controls[0]?.hit||r.controls[0]?.height<44).map(r=>({size:r.size,collapsed:r.collapsed,open:r.open,summary:r.controls[0]}))},scope:'Local React/THREE production scripts rendered with software WebGL; actual mouse/keyboard form actions, native fullscreen, native STL download and Print Lab Revise round trip. No physical printer or deployment.'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));if(!summary.pass)throw Error('Final browser/source verification failed');
const report=`# Geometry World: print sizing and a clearer small-screen inspector

You can now choose physical print size inside Geometry World, with presets and a custom millimeters-per-block value. The selected build's dimensions and printer-fit guidance update immediately, and Showcase STL export and Print Lab use that same scale.

## Improvements

- **Adjust print size:** open the disclosure under the selected creation's dimensions. Choose 5, 10, or 20 mm per block, or apply a custom value from 0.01 to 1,000. The form keeps unfinished edits separate from the saved scale and explains invalid entries without changing the committed value.
- **Stable editing:** switching between oversized and fitting scales keeps the open editor and keyboard focus in place. Explicitly closing it remains your choice. Incoming scale changes, including a return from Print Lab, synchronize the displayed value.
- **Consistent outputs:** changing scale preserves block geometry, selection, undo history and existing print context. It updates physical dimensions and fit guidance; the existing STL exporter scales a copy and the Print Lab handoff carries the chosen value.
- **Readable controls:** the Apply button retains contrast while hovered, and each scale control has a minimum 44 px target. The Showcase file caption also uses “1 block” for a single selected block.
- **Small-screen Position panel:** pointer and keyboard users can now read the disclosure below the game bar. Its summary and announcement toggle have 44 px targets, and the expanded panel is bounded so it can scroll independently. Collapsed game-bar and fullscreen layouts are covered.

![Print size controls and selected pavilion](after-scale-1440x1000.png)

## Verification

**${tests} tests passed across ${suites} suites**, with every recorded Vitest process exiting 0. The new scale suite covers validation, live preset/custom changes, AI/context preservation, disclosure state and focus, and unchanged source geometry/history. Existing regression checks cover print presentation, the build-to-print workflow, Showcase files, import recovery, and Match block.

The final browser run exercised the editor at 1440×1000, 390×844, 320×700 and 844×390, including every preset and custom Apply at each size. Hovered Apply text meets a 4.5:1 contrast threshold. Position controls were checked with the game bar shown/collapsed and the panel open/closed, plus native fullscreen. No page, console or shader errors were observed.

A pavilion containing **60 selected blocks** was tested alongside **two unselected blocks**. Its whole-block envelope at 12.5 mm per block is **75 × 50 × 62.5 mm**. The downloaded selected STL measures **75 × 50 × 56.25 mm**, correctly reflecting the half-height roof. This preserves the existing distinction between the conservative block envelope and exact mesh dimensions. Print Lab's Revise action returned the entire workspace, including the unselected blocks, at the chosen 12.5 mm scale.

Canonical source and desktop mirrors parse and match byte for byte. Browser snapshots match the final sources; Print Lab source is unchanged. These are local software-WebGL and file-workflow checks, not a physical printing result or hardware performance measurement.

![Position panel below the game bar](after-position-320-bar-open.png)

## Evidence

- [Machine-readable summary](summary.json)
- [Final browser run](after-browser.json)
- [Baseline browser run](before-browser.json)
- [Scale controls test report](SCALE-CONTROLS-TESTS.md)
- [Position HUD review](POSITION-HUD-REVIEW.md)
- [Exported pavilion STL](pavilion-12.5mm.stl)

${sources.map(s=>'- '+s.name+': \x60'+s.sha256+'\x60').join('\n')}
`;
fs.writeFileSync(path.join(dir,'INSPECTOR-REFINEMENT.md'),report);console.log(JSON.stringify({pass:summary.pass,tests,suites,layouts:after.layouts.length,coordinateStates:after.coordinates.length,fullscreen:!!after.fullscreen,stl:after.stl.dimensions,returnedScale:after.returned.unit,sources}));
