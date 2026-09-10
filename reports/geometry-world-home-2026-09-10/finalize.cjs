const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const home=read('home-browser.json'),roundtrip=read('after-browser.json'),tests=read('regressions.json'),exits=JSON.parse(process.argv[2]||'null');
if(!exits||Object.values(exits).some(c=>c!==0)||!home.pass||!roundtrip.pass||!tests.success)throw Error('All completed processes must pass.');
const assertions=tests.testResults.flatMap(t=>t.assertionResults);if(assertions.length!==193||tests.numPassedTests!==193||assertions.some(a=>a.status!=='passed')||tests.testResults.length!==8)throw Error('Regression run incomplete.');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{const c=fs.readFileSync('stem_lab/'+name),m=fs.readFileSync('desktop/web-app/public/stem_lab/'+name),h=hash(c);new vm.Script(c.toString(),{filename:name});if(!c.equals(m))throw Error('Mirror mismatch: '+name);if(name!=='stem_tool_printlab.js'&&home.sources[name]!==h)throw Error('Home browser tested an earlier source: '+name);if(roundtrip.sources[name]!==h)throw Error('Print round trip tested an earlier source: '+name);if(name==='stem_tool_printlab.js'&&!c.equals(fs.readFileSync(path.join(dir,'before-source',name))))throw Error('Unexpected Print Lab changes');return {file:name,sha256:h,mirrorIdentical:true,parses:true};});
const verification={pass:true,processExits:exits,sources,regressionFiles:8,regressionAssertions:193,homeChecks:home.checks.length,homeFailures:home.checks.filter(c=>!c.pass),inspectorViewports:roundtrip.inspector.map(i=>i.size),utilityStates:roundtrip.utilities.length,homeErrors:home.errors,homeConsoleErrors:home.consoleErrors,roundTripErrors:roundtrip.errors,roundTripConsoleErrors:roundtrip.consoleErrors,printLabReturn:{scaleMm:roundtrip.returned.unit,selection:roundtrip.returned.info.metrics,fullWorkspacePreserved:JSON.stringify(roundtrip.initial.world)===JSON.stringify(roundtrip.returned.world)}};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(verification,null,2));
const link=n=>path.join(dir,n).replaceAll('\\','/');
const report=`# Geometry World welcome screen

Geometry World now opens with **“What would you like to do?”**, introducing four paths before asking the learner to start a lesson.

| Path | Destination |
|---|---|
| Learn | Browse built-in and saved lessons, preview their descriptions and objectives, and start the chosen lesson. |
| Build | Introduce Free Build, Showcase, editable saves, STL, and Print Lab; open a blank sandbox or a saved creation. |
| Explore | Enter the Geometry Garden, with no questions or score. |
| Create a lesson | Add characters and questions to the current workspace or begin a blank lesson; open the AI lesson builder when available. |

**Open a saved build** validates an editable Geometry World JSON file and presents a preview before replacement. Invalid files and cancellation preserve the current workspace. Starting a different world explains the replacement and provides a student-build download action. Editable build files preserve block shapes, materials and rotations; they are not full lesson backups.

**Continue your workspace** is offered after the learner has entered a world. Browsing Home and lesson previews preserves the actual geometry, retained selection, undo/redo history, camera and print scale. The Geometry World title is a Home button; Home also remains available with the game bar collapsed and in fullscreen. Returning to Home does not create a new workspace.

The full-screen chooser uses four soft color families, consistent line illustrations, generous card targets, and a responsive single-column layout on phones. Touch devices start through the same welcome screen with touch controls ready. High contrast and reduced-motion preferences are respected. The hidden 3D scene pauses beneath the opaque chooser and resumes when a path is opened. Existing WebGL recovery remains accessible if initialization fails.

## Validation

- **193 assertions passed across 8 existing regression suites**, covering keyboard access, lifecycle, input transitions, selection, import rollback, creation cameras, and the Print Lab bridge.
- **${home.checks.length} real-browser Home checks passed**, including fresh entry, every primary path, preview and cancellation, creator focus, keyboard trapping, exact workspace preservation, rendering pause/resume, collapsed-toolbar access, native fullscreen, and a fresh touch-phone session.
- The selected-build browser regression passed at five inspector sizes, ten toolbar states, high contrast, and native fullscreen. Its Print Lab round trip restored the selected 60-block fixture at 12.5 mm per block and the complete surrounding workspace.
- No page or console errors were recorded by either successful browser run. Production scripts parse and match the desktop mirrors and browser source hashes. Print Lab source is unchanged.

The browser harness uses real local application scripts and software WebGL. The Print Lab geometry fixture uses controlled picking. These checks validate digital workflows; no physical print or AI generation was performed. The existing lifecycle unit tests use a partial WebGL stub and can log its initialization failure while their assertions pass; that is separate from the clean real-browser runs.

## Preview

![Geometry World welcome screen](${link('home-1440x1000.png')})

![Fresh touch-phone welcome screen](${link('home-fresh-touch.png')})

![Free Build introduction](${link('build.png')})

## Evidence

[Verification and source hashes](${link('verification.json')}) · [Home browser checks](${link('home-browser.json')}) · [Regression tests](${link('regressions.json')}) · [Print Lab browser checks](${link('after-browser.json')})
`;
fs.writeFileSync(path.join(dir,'WELCOME-SCREEN.md'),report);console.log(JSON.stringify({pass:true,report:link('WELCOME-SCREEN.md'),regressions:193,homeChecks:home.checks.length,sources}));
