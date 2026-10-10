const fs=require('fs'),path=require('path'),vm=require('vm');let text=fs.readFileSync(path.join(__dirname,'run-roadmap-threads.cjs'),'utf8');
text=text.replace("['baseline','roadmap','scenario','unit-main','unit-axe','study','view']","['baseline','roadmap','scenario','unit-main','unit-axe','unit-pointer','unit-lifecycle','unit-living','unit-practical','study','view']");
const file="'tests/dissection_lab_improvements.test.js',...(mode==='unit-main'?";if(text.split(file).length!==2)throw Error('File anchor');text=text.replace(file,"(mode==='unit-pointer'||mode==='unit-lifecycle'?'tests/dissection_canvas_loop.test.js':'tests/dissection_lab_improvements.test.js'),...(mode==='unit-main'?");
const old="mode==='unit-axe'?'has no axe-detectable WCAG A or AA violations':'^(?!.*has no axe-detectable WCAG A or AA violations).*'";if(text.split(old).length!==2)throw Error('Pattern');
const patterns={
  'unit-pointer':'cancels only the owning pointer context on lost capture or pointer cancellation',
  'unit-lifecycle':'keeps one paused canvas lifecycle across rerenders and clears owned globals on detach',
  'unit-living':'keeps living-function pause, speed, replay, and control state synchronized',
  'unit-practical':'keeps the technique roadmap out of timed practical'
};
text=text.replace(old,'('+JSON.stringify(patterns)+')[mode] || ('+old+')');text=text.replace('run.watchdogMs=1200000','run.watchdogMs=2400000');new vm.Script(text);fs.writeFileSync(path.join(__dirname,'run-isolated.cjs'),text);console.log('Prepared fresh per-case processes with unchanged test deadlines');
