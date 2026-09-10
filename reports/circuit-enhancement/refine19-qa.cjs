
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
const active=page.locator('.circuit-active-root'),reference=page.locator('.circuit-active-reference'),diagram=page.locator('.circuit-active-diagram-scroll');
const calc=()=>page.evaluate(()=>StemLab.solveActiveCircuit(state._circuitActive));
await page.getByRole('button',{name:'Input 1 V',exact:true}).click();
const exact=page.getByLabel('Input voltage (V) exact value',{exact:true});await exact.fill('1.2345');await exact.press('Enter');assert.equal((await calc()).design.input,1.2345);
const h0=await page.evaluate(()=>JSON.stringify(state._circuitActive.undo));await exact.fill('6');await exact.press('Enter');assert.equal((await calc()).design.input,1.2345);assert.equal(await exact.getAttribute('aria-invalid'),'true');assert.match(await active.innerText(),/Enter a number from 0 to 5/);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.undo)),h0);await exact.press('Escape');assert.equal(await exact.inputValue(),'1.2345');assert.equal(await exact.getAttribute('aria-invalid'),'false');
await exact.fill('');await exact.blur();assert.equal((await calc()).design.input,1.2345);assert.equal(await exact.getAttribute('aria-invalid'),'true');await exact.press('Escape');
await exact.fill('1.5');await exact.press('Enter');const history=await page.evaluate(()=>JSON.stringify(state._circuitActive.undo));
await page.getByRole('button',{name:'Keep current as reference',exact:true}).click();const frozen=await page.evaluate(()=>JSON.stringify(state._circuitActive.reference));assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.undo)),history);assert.match(await reference.innerText(),/Settings match your reference/);
await page.getByText('Tune the components',{exact:true}).click();const base=page.getByLabel('Base resistance (Ω) exact value',{exact:true});await base.fill('20000');await base.press('Enter');assert.equal((await calc()).design.baseResistance,20000);assert.match(await reference.innerText(),/One circuit setting changed/);assert.match(await reference.innerText(),/8.00 mA.*4.00 mA/s);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.reference)),frozen);
assert.equal(await page.locator('.circuit-active-reference-curve').count(),1);
await reference.locator('..').screenshot({path:path.join(out,'active-reference-response-desktop.jpg'),type:'jpeg',quality:90});
await page.getByLabel('Graph input voltage (V) exact value',{exact:true}).fill('2');await page.getByLabel('Graph input voltage (V) exact value',{exact:true}).press('Enter');assert.equal(await exact.inputValue(),'2');assert.match(await reference.innerText(),/2 circuit settings changed/);await page.getByRole('button',{name:'Restore reference settings',exact:true}).click();assert.equal((await calc()).design.input,1.5);assert.equal((await calc()).design.baseResistance,10000);assert.match(await reference.innerText(),/Settings match/);await page.getByRole('button',{name:'Undo active edit',exact:true}).click();assert.equal((await calc()).design.baseResistance,20000);assert.equal((await calc()).design.input,2);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.reference)),frozen);
const h1=await page.evaluate(()=>JSON.stringify(state._circuitActive.undo));await page.getByRole('button',{name:'Place red probe on B · base',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitActive.probeRed),'base');assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/700.00 mV/);
await page.getByRole('button',{name:'Place black probe',exact:true}).click();const inputNode=page.getByRole('button',{name:'Place black probe on VIN · input',exact:true});await inputNode.focus();await page.keyboard.press('Enter');assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/-1.30V/);
await page.getByRole('button',{name:'NPN schematic',exact:true}).click();await page.getByRole('button',{name:'Place black probe on B · base',exact:true}).click();assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/0.00V/);await page.getByRole('button',{name:'Measure base resistor',exact:true}).click();assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/1.30V/);await page.getByRole('button',{name:'Measure supply',exact:true}).click();assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/5.00V/);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.undo)),h1);
await page.getByRole('button',{name:'3D experiment board',exact:true}).click();await page.getByRole('button',{name:'Measure transistor',exact:true}).click();await diagram.screenshot({path:path.join(out,'active-direct-probes-desktop.jpg'),type:'jpeg',quality:90});
await base.fill('12345.6789');await base.press('Enter');assert.equal((await calc()).design.baseResistance,12345.6789);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export active sweep CSV',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'refine19-sweep.csv'));const csv=fs.readFileSync(path.join(out,'refine19-sweep.csv'),'utf8').trim().split('\n'),keys=csv[0].split(','),sample=Object.fromEntries(csv[81].split(',').map((v,i)=>[keys[i],v]));assert.equal(csv.length,202);assert.equal(Number(sample.base_resistance_ohm),12345.6789);assert.equal(Number(sample.model_vbe_V),.7);assert.equal(sample.project,'manual');
await page.getByRole('button',{name:/Light sensor More light/}).click();assert.match(await reference.innerText(),/different input axis/);assert.equal(await page.locator('.circuit-active-reference-curve').count(),0);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.reference)),frozen);await page.getByRole('button',{name:'Replace reference',exact:true}).click();const sensorRef=await page.evaluate(()=>JSON.stringify(state._circuitActive.reference));await page.getByRole('button',{name:/Dark sensor Less light/}).click();assert.equal(await page.locator('.circuit-active-reference-curve').count(),1);assert.match(await reference.innerText(),/One circuit setting changed/);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.reference)),sensorRef);
await reference.locator('..').screenshot({path:path.join(out,'active-sensor-comparison-desktop.jpg'),type:'jpeg',quality:90});
await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();await page.getByRole('button',{name:'Active electronics',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.reference)),sensorRef);assert.equal((await calc()).design.project,'dark');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const audit=async()=>page.evaluate(async()=>axe.run({include:[['.circuit-active-root'],['.circuit-workspace-switch']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));let a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await reference.screenshot({path:path.join(out,'active-reference-mobile.jpg'),type:'jpeg',quality:90});await page.locator('.circuit-active-panel').first().screenshot({path:path.join(out,'active-exact-controls-mobile.jpg'),type:'jpeg',quality:90});
await page.getByRole('button',{name:'Place red probe',exact:true}).click();const mobileNode=page.getByRole('button',{name:'Place red probe on C · collector',exact:true});await mobileNode.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>state._circuitActive.probeRed),'collector');const nodeBox=await mobileNode.boundingBox();assert.ok(nodeBox.width>=24&&nodeBox.height>=24);assert.ok(await diagram.evaluate(el=>el.scrollLeft)>0);
a=await audit();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
await page.setViewportSize({width:320,height:760});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.getByRole('button',{name:'Clear reference',exact:true}).click();assert.equal(await page.locator('.circuit-active-reference-curve').count(),0);assert.match(await reference.innerText(),/Save this operating point/);assert.equal(await page.evaluate(()=>state._circuitActive.reference),null);
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'refine19-browser-results.json'),JSON.stringify({passed:true,checks:['precise value commit','invalid and empty values preserve solution/history','escape restores value','reference immutable across edits','capture outside history','single and multiple changes','restore with undo','shared-axis overlays','mixed-axis guard','workspace persistence','direct probes in 3D and schematic','keyboard node placement','same-node zero','measurement shortcuts','probe/view edits outside history','CSV full settings','390/320 px overflow','phone node hit targets and scrolling'],axeViolations:a.violations.length},null,2));console.log('Active reference and direct-control browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
