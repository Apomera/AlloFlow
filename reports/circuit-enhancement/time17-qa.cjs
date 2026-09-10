
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const errors=[]; page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message);});
await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit bench review</title></head><body><main id="root"></main></body></html>');
await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #facc15;outline-offset:3px}'});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react/umd/react.development.js')});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')});
await page.addScriptTag({path:path.join(root,'stem_lab/stem_tool_circuit.js')});
await page.evaluate(()=>{
const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
function Host(){
const [data,setData]=React.useState({_circuit:{pauseMotion:true}});
window.state=data;window.setState=setData;
return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(k,f)=>f||k,gradeLevel:'8',
addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
}
ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
});
await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();






await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();
await page.getByRole('button',{name:'Load RC timing example',exact:true}).click();
const rootView=page.locator('.circuit-mixed-root'),scope=page.locator('.circuit-time-scope'),bench=page.locator('.circuit-3d');
const calc=()=>page.evaluate(()=>{const c=StemLab.circuitTimeConfig(state._circuitMixed);return StemLab.circuitTimeFrame(c,state._circuitMixed.timeCursor||0);});
const cursor=page.getByLabel('Simulation time cursor',{exact:true});
await cursor.fill('100');
let s=await calc();assert.ok(Math.abs(s.time-1)<1e-12);assert.ok(Math.abs(s.rows[1].voltage-12*(1-Math.exp(-1)))<1e-10);
assert.match(await scope.locator('.circuit-scope-readings').innerText(),/7.59V/);
await bench.locator('.circuit-probe-panel>summary').click();await page.getByRole('button',{name:'Across selected part',exact:true}).click();
assert.match(await bench.locator('.circuit-probe-display').innerText(),/7.59V/);
await bench.locator('.circuit-mixed-readings>summary').click();
assert.match(await bench.locator('.circuit-scene-readings').innerText(),/7.59V/);
assert.match(await bench.locator('.circuit-scene-insight').innerText(),/Electric energy storage/);
await scope.screenshot({path:path.join(out,'time-rc-scope-desktop.jpg'),type:'jpeg',quality:90});
const history=await page.evaluate(()=>JSON.stringify(state._circuitMixed.undo));
await page.getByRole('button',{name:'Restart time',exact:true}).click();await page.getByRole('button',{name:'Play time',exact:true}).click();
await page.waitForFunction(()=>state._circuitMixed.timeCursor>0);
await page.getByRole('button',{name:'Pause time',exact:true}).click();const paused=await page.evaluate(()=>state._circuitMixed.timeCursor);
await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state._circuitMixed.timeCursor),paused);
assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitMixed.undo)),history);
await page.getByLabel('Mixed circuit supply voltage',{exact:true}).fill('6');
assert.equal(await page.evaluate(()=>state._circuitMixed.timeCursor),0);assert.equal(await page.evaluate(()=>state._circuitMixed.simRunning),false);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitMixed.voltage),12);
await cursor.fill('100');await page.getByRole('button',{name:'Mixed schematic',exact:true}).click();
assert.equal((await calc()).time,1);await page.getByRole('img',{name:/Mixed circuit: 2 parallel branches/}).waitFor();
await page.getByRole('button',{name:'3D mixed bench',exact:true}).click();assert.equal((await calc()).time,1);
await page.getByRole('button',{name:'Load RLC resonance example',exact:true}).click();
s=await calc();assert.equal(s.signalMode,'ac');assert.ok(Math.abs(s.rows[2].voltage)>12);
assert.ok(await page.getByRole('button',{name:'Edit mixed part 2 inductor',exact:true}).count());
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export waveform CSV',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'time17-waveform.csv'));
const csv=fs.readFileSync(path.join(out,'time17-waveform.csv'),'utf8').trim().split('\n');assert.equal(csv[0],'time_s,source_voltage_V,selected_part_voltage_V,selected_branch_current_A,total_stored_energy_J');assert.ok(csv.length>=402);assert.ok(Number(csv[1].split(',')[2])< -12);assert.ok(!csv.join('').includes('NaN'));
await cursor.fill('150');s=await calc();assert.ok(s.current<0);
await page.getByRole('button',{name:'Current direction',exact:true}).click();assert.equal(await bench.locator('.circuit-flow-symbol').innerText(),'←');
const snapshot=await page.evaluate(()=>StemLab.circuitBenchSnapshot(document.querySelector('.circuit-scene-viewport>svg'),StemLab.circuitTimeFrame(StemLab.circuitTimeConfig(state._circuitMixed),state._circuitMixed.timeCursor),state._circuitMixed.selectedPart,state._circuitMixed));
assert.match(snapshot,/Passive ac response/);assert.match(snapshot,/100 mH/);
await scope.screenshot({path:path.join(out,'time-ac-scope-desktop.jpg'),type:'jpeg',quality:90});
await page.locator('.circuit-scene-viewport').screenshot({path:path.join(out,'time-inductor-3d.jpg'),type:'jpeg',quality:90});
await page.getByLabel('Oscilloscope time window',{exact:true}).selectOption('10');assert.equal(await page.getByRole('button',{name:'Export waveform CSV',exact:true}).isDisabled(),true);assert.match(await scope.innerText(),/too wide to resolve/);
await page.getByLabel('Oscilloscope time window',{exact:true}).selectOption('auto');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const audit=async()=>page.evaluate(async()=>axe.run({include:[['.circuit-mixed-root']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
let a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.setViewportSize({width:390,height:844});await scope.screenshot({path:path.join(out,'time-scope-mobile.jpg'),type:'jpeg',quality:90});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('.circuit-scope-chart').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.circuit-scope-chart').scrollLeft>0);
a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.getByLabel('Signal experiment',{exact:true}).selectOption('release');await cursor.fill('20');s=await calc();assert.equal(s.voltage,0);assert.ok(s.energy>0);assert.match(await bench.locator('.circuit-scene-status').innerText(),/Stored energy release/);
await page.getByRole('button',{name:'Edit mixed part 2 inductor',exact:true}).click();await page.getByLabel('Inductance (mH)',{exact:true}).fill('200');await page.getByLabel('Inductance (mH)',{exact:true}).press('Enter');assert.equal((await calc()).components[1].value,200);assert.equal((await calc()).time,0);
await page.getByLabel('Signal experiment',{exact:true}).selectOption('dc');assert.equal(await scope.getByRole('button',{name:'Play time',exact:true}).count(),0);assert.equal((await calc()).rows[2].current,0);
await page.evaluate(()=>setState(prev=>({...prev,_circuitMixed:{signalMode:'step',voltage:9,components:[{type:'resistor',value:470,branch:1,id:1},{type:'led',branch:1,id:2}]}})));
await page.getByText('Time experiment unavailable',{exact:true}).waitFor();assert.equal(await page.getByLabel('Simulation time cursor',{exact:true}).count(),0);assert.match(await scope.innerText(),/nonlinear time solver/);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'time17-browser-results.json'),JSON.stringify({passed:true,checks:['RC exact cursor values','shared scope/probe/3D frame','play/pause','time outside undo','edit resets time','schematic persistence','RLC AC resonance','CSV numeric samples','negative-current arrows','snapshot time metadata','unresolved-window guard','mobile overflow','keyboard chart scrolling','release energy','inductance editing','DC return','unsupported LED guard'],axeViolations:a.violations.length},null,2));
console.log('Time and AC workbench browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
