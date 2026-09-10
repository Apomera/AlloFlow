
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






await page.getByRole('button',{name:'Active electronics',exact:true}).click();
const active=page.locator('.circuit-active-root'),diagram=page.locator('.circuit-active-diagram-scroll'),plot=page.locator('.circuit-active-plot-scroll');
await page.getByRole('heading',{name:'A small signal. A brighter idea.'}).waitFor();
const calc=()=>page.evaluate(()=>StemLab.solveActiveCircuit(state._circuitActive));
assert.equal((await calc()).region,'saturated');
await page.getByRole('button',{name:'Input off',exact:true}).click();assert.equal((await calc()).region,'cutoff');assert.match(await active.locator('.circuit-active-state').innerText(),/Cutoff/);
await page.getByRole('button',{name:'Input 1 V',exact:true}).click();assert.equal((await calc()).region,'active');assert.match(await active.locator('.circuit-active-metrics').innerText(),/3.00 mA/);
const history=await page.evaluate(()=>JSON.stringify(state._circuitActive.undo));
await page.getByLabel('Red probe',{exact:true}).selectOption('collector');await page.getByLabel('Black probe',{exact:true}).selectOption('emitter');
assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/4.34V/);
await page.getByRole('button',{name:'Reverse active probes',exact:true}).click();assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/-4.34V/);
await page.getByLabel('Red probe',{exact:true}).selectOption('collector');assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/0.00V/);
await page.getByLabel('Black probe',{exact:true}).selectOption('emitter');
await page.getByRole('button',{name:'NPN schematic',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.undo)),history);
await page.getByRole('img',{name:/NPN schematic.*Manual input/}).waitFor();
await diagram.screenshot({path:path.join(out,'active-npn-schematic.jpg'),type:'jpeg',quality:90});
await page.getByRole('button',{name:'3D experiment board',exact:true}).click();await page.getByRole('button',{name:'Input 3.3 V',exact:true}).click();
await diagram.screenshot({path:path.join(out,'active-npn-board.jpg'),type:'jpeg',quality:90});
await page.getByRole('button',{name:/Dark sensor Less light/}).click();
await page.getByLabel('Relative light level',{exact:true}).fill('80');const bright=await calc();await page.getByLabel('Relative light level',{exact:true}).fill('20');const dark=await calc();assert.ok(dark.collectorCurrent>bright.collectorCurrent);assert.ok(dark.driveVoltage<dark.theveninVoltage);
await page.getByRole('button',{name:'Undo active edit',exact:true}).click();assert.equal((await calc()).design.light,80);await page.getByRole('button',{name:'Redo active edit',exact:true}).click();assert.equal((await calc()).design.light,20);
await page.getByRole('button',{name:'NPN schematic',exact:true}).click();await diagram.screenshot({path:path.join(out,'active-dark-schematic.jpg'),type:'jpeg',quality:90});await page.getByRole('button',{name:'3D experiment board',exact:true}).click();
await diagram.screenshot({path:path.join(out,'active-dark-board.jpg'),type:'jpeg',quality:90});
await plot.screenshot({path:path.join(out,'active-dark-response.jpg'),type:'jpeg',quality:90});
await active.locator('.circuit-active-loading').screenshot({path:path.join(out,'active-divider-loading.jpg'),type:'jpeg',quality:90});
await page.getByText('Tune the components',{exact:true}).click();await page.getByLabel('Base resistance (Ω)',{exact:true}).fill('20000');assert.equal((await calc()).design.baseResistance,20000);await page.getByRole('button',{name:'Undo active edit',exact:true}).click();assert.equal((await calc()).design.baseResistance,10000);
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export active sweep CSV',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'active18-sweep.csv'));const csv=fs.readFileSync(path.join(out,'active18-sweep.csv'),'utf8').trim().split('\n');assert.equal(csv.length,202);assert.ok(csv[0].startsWith('relative_light_level'));assert.ok(!csv.join('').includes('NaN'));
await page.getByLabel('Transistor prediction experiment',{exact:true}).selectOption('gain');await page.getByRole('button',{name:'Start transistor prediction',exact:true}).click();assert.equal((await calc()).design.input,1);assert.equal(await page.getByRole('button',{name:'Test transistor prediction',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'Increases',exact:true}).click();await page.getByRole('button',{name:'Test transistor prediction',exact:true}).click();assert.equal((await calc()).design.input,1.5);assert.match(await active.locator('.circuit-active-feedback').innerText(),/matches the model/);assert.match(await active.locator('.circuit-active-feedback').innerText(),/3.00 mA.*8.00 mA/s);
await page.getByLabel('Transistor experiment explanation',{exact:true}).fill('The extra base drive increases collector current until the load sets a limit.');
await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();await page.getByRole('button',{name:'Active electronics',exact:true}).click();assert.match(await active.locator('.circuit-active-feedback').innerText(),/matches the model/);assert.equal((await calc()).design.input,1.5);assert.match(await page.getByLabel('Transistor experiment explanation',{exact:true}).inputValue(),/extra base drive/);
await page.getByLabel('Input voltage (V)',{exact:true}).fill('1.6');assert.equal(await active.locator('.circuit-active-feedback').count(),0);
await page.getByLabel('Transistor prediction experiment',{exact:true}).selectOption('limit');await page.getByRole('button',{name:'Start transistor prediction',exact:true}).click();await page.getByRole('button',{name:'Increases',exact:true}).click();await page.getByRole('button',{name:'Test transistor prediction',exact:true}).click();assert.match(await active.locator('.circuit-active-feedback').innerText(),/different result/);assert.match(await active.locator('.circuit-active-feedback').innerText(),/21.82 mA.*21.82 mA/s);
await page.getByLabel('Transistor prediction experiment',{exact:true}).selectOption('sensor');await page.getByRole('button',{name:'Start transistor prediction',exact:true}).click();await page.getByRole('button',{name:'Increases',exact:true}).click();await page.getByRole('button',{name:'Test transistor prediction',exact:true}).click();assert.equal((await calc()).design.project,'dark');assert.equal((await calc()).design.light,20);assert.match(await active.locator('.circuit-active-feedback').innerText(),/matches the model/);
await active.locator('.circuit-active-predict').screenshot({path:path.join(out,'active-prediction-desktop.jpg'),type:'jpeg',quality:90});
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const audit=async()=>page.evaluate(async()=>axe.run({include:[['.circuit-active-root'],['.circuit-workspace-switch']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));let a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.getByRole('button',{name:/Light sensor More light/}).click();assert.equal((await calc()).design.project,'light');await page.getByRole('button',{name:'Bright',exact:true}).click();assert.equal((await calc()).region,'saturated');await page.getByRole('button',{name:'Dark',exact:true}).click();assert.equal((await calc()).region,'cutoff');
await page.getByRole('button',{name:/Manual control Turn a small/}).click();await active.screenshot({path:path.join(out,'active-workbench-desktop.jpg'),type:'jpeg',quality:85});
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await diagram.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.circuit-active-diagram-scroll').scrollLeft>0);await plot.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.circuit-active-plot-scroll').scrollLeft>0);
await page.getByLabel('Input voltage (V)',{exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal((await calc()).design.input,.01);
await active.locator('.circuit-active-panel').first().screenshot({path:path.join(out,'active-controls-mobile.jpg'),type:'jpeg',quality:90});
a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.setViewportSize({width:320,height:760});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'active18-browser-results.json'),JSON.stringify({passed:true,checks:['three NPN regions','shared schematic/3D/probe values','reverse and same-node probes','view settings outside undo','sensor polarity','loaded divider','undo/redo','parameter edit','CSV download','three predictions and wrong-answer explanation','prediction invalidation after edit','workspace persistence','keyboard controls','390/320 px overflow','keyboard diagram and plot scroll'],axeViolations:a.violations.length},null,2));console.log('Active electronics browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
