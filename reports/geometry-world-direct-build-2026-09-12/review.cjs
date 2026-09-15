const fs=require('fs'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process'),dir=__dirname;
const unit=JSON.parse(fs.readFileSync(dir+'/full-tests.json','utf8')),browser=['browser.json','browser-final.json','browser-roof.json'].map(f=>({file:f,...JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'))}));
const checks=browser.flatMap(r=>r.assertions),files=['stem_lab/stem_tool_geometryworld.js','stem_lab/stem_tool_geometryworld_builder.js'];
const parity=files.every(f=>{new vm.Script(fs.readFileSync(f,'utf8'));return fs.readFileSync(f).equals(fs.readFileSync('desktop/web-app/public/'+f));});
const diff=spawnSync('git',['diff','--check','--',...files,...files.map(f=>'desktop/web-app/public/'+f),'tests/geometry_world_direct_build.test.js'],{encoding:'utf8'});
const summary={unit:{passed:unit.numPassedTests,failed:unit.numFailedTests,pending:unit.numPendingTests,files:unit.testResults.length},browser:{passed:checks.filter(a=>a.pass).length,failed:checks.filter(a=>!a.pass),errors:browser.flatMap(r=>r.errors||[]),failures:browser.filter(r=>r.failure).map(r=>r.failure)},syntaxAndDesktopParity:parity,diffCheckPassed:diff.status===0};
fs.writeFileSync(dir+'/verification.json',JSON.stringify(summary,null,2));
const p=f=>path.join(dir,f).replace(/\\/g,'/');
const md=`# Geometry World — direct building and scenery refinement

The starter kit now adapts to a student's design, selected creations can be moved directly in the world, and the courtyard has a more grounded landscape.

## What changed

- **Eight customizable starters:** recipe-specific dimensions, four material palettes, quarter-turn rotation, live shape thumbnails, input validation, and reset. Each recipe rebuilds editable blocks on the integer grid. Shallow roofs use flat landings between slopes with a supporting base layer.
- **Direct move and rotation controls:** draggable X/Y/Z handles snap to grid cells. Arrow keys preview one cell at a time; Shift moves five. A quarter-turn button previews rotation. Apply commits one Undo operation; Cancel and Escape clear the preview. The controls follow the actual workspace fullscreen flow and support emulated touch dragging.
- **Clearer selection:** choose visible block centers or include hidden blocks. Existing replace/add/remove selection remains available. Handle state remains stable when measurements reorder the same selected cells.
- **A more grounded courtyard:** broader, lower mountain silhouettes; planted slopes between the raised plot and meadow; rounded orchard crowns; and courtyard shadow casting. Scenery stays outside the editable floor and uses the existing three merged courtyard meshes. Battery saver retains its lower-detail rendering path.

## Verification

- ${summary.unit.passed} unit tests passed across ${summary.unit.files} files; ${summary.unit.failed} failed.
- ${summary.browser.passed} browser assertions passed; ${summary.browser.failed.length} failed; ${summary.browser.errors.length} page errors.
- Checked actual fullscreen buttons, snapped drag previews, one-step Undo, cumulative keyboard moves, cancel/reset, visibility filtering, emulated touch, and 320/390 px layouts.
- The final shallow-roof mesh was checked for one connected component, zero open edges, and zero non-manifold edges.
- Source syntax and desktop mirrors match: ${parity}. Scoped git diff whitespace check passes: ${summary.diffCheckPassed}.

Validation used the local React/Three.js host in Chromium. Physical touch devices, printers, and the deployed Gemini Canvas share were not exercised. Changes remain local; no commit or deployment was performed.

## Screenshots

### Courtyard and lighting
![Refined Geometry World courtyard](${p('10-garden-final.png')})

### Direct controls in fullscreen
![Grid movement and rotation handles](${p('08-fullscreen-handles.png')})

### Starter customization
![Customizable architectural starter](${p('01-custom-starter.png')})

### Phone layout
![Starter controls at 320 pixels](${p('04-phone-320.png')})

### Shallow roof
![Final stepped roof with flat landings](${p('12-shallow-roof-final.png')})
`;
fs.writeFileSync(dir+'/REVIEW.md',md);console.log(JSON.stringify(summary,null,2));if(unit.numFailedTests||!parity||diff.status!==0||summary.browser.failed.length||summary.browser.errors.length||summary.browser.failures.length)process.exitCode=1;
