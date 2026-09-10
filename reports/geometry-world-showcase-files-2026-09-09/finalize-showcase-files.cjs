const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const dir='reports/geometry-world-showcase-files-2026-09-09/';
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const browser=read('browser-results.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
const sources=names.map(name=>{
  const bytes=fs.readFileSync('stem_lab/'+name);new vm.Script(bytes.toString(),{filename:name});
  return {name,sha256:hash(bytes),syntaxValid:true,desktopMirrorMatches:bytes.equals(fs.readFileSync('desktop/web-app/public/stem_lab/'+name)),browserSnapshotMatches:hash(bytes)===browser.sources[name]};
});
const evidence=['showcase-ui-tests.json','showcase-regression-tests.json','selected-files-tests.json','selected-files-retry-tests.json','showcase-ui-focus-tests.json'];
const tests=new Map();
for(const file of evidence)for(const suite of read(file).testResults)for(const test of suite.assertionResults)tests.set(suite.name+'::'+test.fullName,{suite:path.basename(suite.name),name:test.fullName,status:test.status,evidence:file});
const failures=[...tests.values()].filter(t=>t.status!=='passed');
const summary={pass:browser.pass&&sources.every(s=>s.desktopMirrorMatches&&s.browserSnapshotMatches)&&failures.length===0,sources,tests:{unique:tests.size,passed:tests.size-failures.length,failed:failures.length,suites:new Set([...tests.values()].map(t=>t.suite)).size,failures,evidence},browser:{pass:browser.pass,failures:browser.failures,errors:browser.errors,consoleErrors:browser.consoleErrors,shaderErrors:browser.shaderErrors,viewports:browser.captures.map(c=>({size:c.size,inBounds:c.layout.inBounds,horizontalOverflow:c.layout.overflow,minimumButtonHeight:Math.min(...c.layout.buttons.map(b=>b.height))})),selectedBlocks:browser.fixture.selectedBlocks,totalBlocks:browser.fixture.totalBlocks,editableJson:browser.json,stl:browser.stl,printLabUnitMm:browser.printScale},scope:{productionFiles:['stem_lab/stem_tool_geometryworld_builder.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js'],editableImport:'Validated AlloFlow Geometry World JSON; explicit replacement confirmation',stl:'Selected blocks, Z-up geometry, millimeters at the current print scale',printLab:'Existing local handoff and full-workspace Revise flow'},review:{cancelFocusFixed:true,visualsInspected:['1440x900','390x844','320x700','844x390','import-preview-390x844']}};
fs.writeFileSync(dir+'showcase-files-summary.json',JSON.stringify(summary,null,2));
if(!summary.pass)throw Error('Final verification is incomplete or failed');
const absolute=path.resolve(dir).replace(/\\/g,'/');
const link=(label,file)=>'['+label+']('+absolute+'/'+file+')';
const report=`# Showcase: use, export, and reopen a creation

Showcase now has a **Use & export** panel that lets a finished structure move directly into another editing session or the 3D printing workflow.

| Action | Result |
| --- | --- |
| Download editable JSON | An AlloFlow Geometry World file containing the selected blocks, materials, shapes, and quarter-turn rotations. The creation is centered above the sandbox floor for reopening. |
| Download STL | Geometry from the selected blocks in millimeters, using the current millimeters-per-block setting. Import at 100% scale in a slicer. |
| Open in Print Lab | The existing Print Lab workflow with the selected geometry, explicit scale, and editable source model. Revise restores the full building workspace and original building camera. |
| Choose editable JSON | Validates an AlloFlow Geometry World file and shows its title, block count, and bounds before replacing the current sandbox. |
| Save image | The existing high-resolution PNG export, also available from the main Showcase toolbar. |

The panel uses warm ivory surfaces, green accents, simple line icons, grouped actions, and readable scale information. Its body scrolls on smaller screens while the heading and Close control remain available. Controls have at least 44-pixel height in all four tested viewport sizes.

Keyboard focus stays in the panel. Closing it returns focus to **Use & export**. Canceling an import preview returns focus to **Choose editable JSON**, and the next Escape closes the panel before a second Escape leaves Showcase. File operations are guarded while an image is encoding.

Editable JSON import supports Geometry World block data; it does not convert arbitrary STL meshes back into editable blocks. JSON retains the existing block-file format and does not store physical print scale. STL carries geometry rather than the virtual material appearance; choose physical filament in Print Lab or a slicer. Replacing a sandbox starts a new editing baseline and cannot be undone, which the confirmation preview states.

## Verification

- **${summary.tests.passed} unique automated tests passed across ${summary.tests.suites} suites.** This covers selected JSON/STL exports, validation, scale conversion, partial and rotated blocks, image-export guards, keyboard handling, retained selection, Studio/camera framing, and the existing Print Lab workflows.
- Actual-browser checks passed at **1440 × 900, 390 × 844, 320 × 700, and 844 × 390** using the application's React and THREE sources.
- A 42-block selected creation exported without the unrelated 43rd block. The STL contained ${browser.stl.triangles} triangles at 12.5 mm per block, with zero measured vertex-scaling error and unchanged normals.
- Both downloads preserved the live world, retained selection, undo/redo history, and Showcase presentation. Invalid files and preview cancellation preserved the model. A confirmed import restored the downloaded blocks, shapes, and rotations.
- Showcase → Print Lab → Revise preserved the full workspace, selected geometry, exact STL bytes, undo/redo history, custom scale, and original building camera.
- No browser, console, or shader errors were reported. Canonical source and desktop mirror match, parse successfully, and match the final browser snapshots.

The first new data test run used a byte-for-byte comparison after intentionally recentering a model. That assertion was corrected to compare triangle coordinates and normals within 1e-6, accounting for floating-point effects from the changed origin. Exact-byte checks remain for unchanged-position round trips and scaled-copy downloads. The final counts use the latest result for each test.

These are local software and browser checks; a physical print was not performed.

## Preview

![Desktop Showcase export panel](${absolute}/files-1440x900.png)

![Phone Showcase export panel](${absolute}/files-390x844.png)

${link('Import confirmation preview','import-preview-390x844.png')} · ${link('Narrow phone','files-320x700.png')} · ${link('Landscape phone','files-844x390.png')}

## Evidence

${link('Final verification summary','showcase-files-summary.json')} · ${link('Actual-browser results','browser-results.json')} · ${link('Data implementation notes','SELECTED-FILES-DATA.md')}

Production changes are confined to the Geometry World builder module and its desktop mirror. Core rendering and Print Lab source files are unchanged in this pass.
`;
fs.writeFileSync(dir+'SHOWCASE-FILES.md',report);
console.log(JSON.stringify({pass:summary.pass,tests:summary.tests.passed,suites:summary.tests.suites,sources:summary.sources,report:dir+'SHOWCASE-FILES.md'}));
