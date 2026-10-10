const fs=require('fs'),path=require('path'),vm=require('vm');let text=fs.readFileSync(path.join(__dirname,'run-roadmap-threads.cjs'),'utf8');
text=text.replace("['baseline','roadmap','scenario','unit-main','unit-axe','study','view']","['baseline','roadmap','scenario','unit-main','unit-axe','unit-targeted','study','view']");
text=text.replace("mode==='unit-main'?['tests/dissection_canvas_loop.test.js','tests/dissection_workspace_bands.test.js']","mode==='unit-main'||mode==='unit-targeted'?['tests/dissection_canvas_loop.test.js','tests/dissection_workspace_bands.test.js']");
const prior="mode==='unit-axe'?'has no axe-detectable WCAG A or AA violations':'^(?!.*has no axe-detectable WCAG A or AA violations).*'";
if(text.split(prior).length!==2)throw Error('Pattern anchor');
const pattern='keeps living-function pause, speed, replay, and control state synchronized|keeps one paused canvas lifecycle across rerenders and clears owned globals on detach|cancels only the owning pointer context on lost capture or pointer cancellation|keeps the technique roadmap out of timed practical';
text=text.replace(prior,"mode==='unit-targeted'?"+JSON.stringify(pattern)+":"+prior);
text=text.replace('run.watchdogMs=1200000','run.watchdogMs=2400000');new vm.Script(text);fs.writeFileSync(path.join(__dirname,'run-final.cjs'),text);console.log('Prepared isolated four-case retry and final browser queue');
