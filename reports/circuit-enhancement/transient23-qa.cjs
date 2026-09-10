
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







await page.getByRole('button',{name:'Connected circuits',exact:true}).click();
const bench=page.locator('.circuit-network-root'),scope=page.getByRole('region',{name:'Connected circuit time response',exact:true}),inspector=page.locator('.circuit-network-inspector');
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Load network example',exact:true}).click();};
const results={scenarios:[],errors};
await load('rc-charge');await scope.waitFor();
assert.equal(await page.getByRole('button',{name:'Time response',exact:true}).getAttribute('aria-pressed'),'true');
assert.match(await inspector.innerText(),/C3 · Capacitor/);
assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/0.00V/);
const cursor=page.getByLabel('Connected scope time cursor',{exact:true});
await cursor.focus();await page.keyboard.press('End');
assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/4.97V/);
await cursor.focus();await page.keyboard.press('ArrowLeft');const previous=await page.evaluate(()=>state._circuitNetwork.time);await page.keyboard.press('ArrowLeft');assert.ok(await page.evaluate(()=>state._circuitNetwork.time)<previous);await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),previous);
await page.getByRole('button',{name:'Restart time response',exact:true}).click();
await page.getByRole('button',{name:'Play time response',exact:true}).click();
await page.waitForFunction(()=>state._circuitNetwork.time>.005);
assert.equal(await page.getByLabel('Connected voltmeter reading',{exact:true}).getAttribute('aria-live'),'off');
assert.equal(await page.locator('.circuit-network-status').getAttribute('aria-live'),'off');
await page.getByRole('button',{name:'Pause time response',exact:true}).click();
let time=await page.evaluate(()=>state._circuitNetwork.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),time);
await page.getByRole('button',{name:'Play time response',exact:true}).click();
const capacitance=page.getByLabel('Capacitance (µF) exact value',{exact:true});await capacitance.fill('220');await capacitance.press('Enter');
assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);assert.equal(await page.getByRole('button',{name:'Play time response',exact:true}).count(),1);
await page.getByRole('button',{name:'Undo network edit',exact:true}).click();assert.equal(await capacitance.inputValue(),'100');
await page.getByLabel('Starting voltage A − B (V) exact value',{exact:true}).fill('2');await page.getByLabel('Starting voltage A − B (V) exact value',{exact:true}).press('Enter');
assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/2.00V/);
await page.getByRole('button',{name:'DC equilibrium',exact:true}).click();assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/5.00V/);
await page.getByRole('button',{name:'Time response',exact:true}).click();assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/2.00V/);
results.scenarios.push('RC cursor, playback, edit restart, undo, starting voltage, and DC/time switching');
await load('rlc-ring');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');
await cursor.focus();await page.keyboard.press('ArrowRight');
await scope.screenshot({path:path.join(out,'transient-rlc-scope-desktop.jpg'),type:'jpeg',quality:92});
await page.getByRole('button',{name:'Play time response',exact:true}).click();
await page.waitForFunction(()=>state._circuitNetwork.time>0);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
await page.getByRole('button',{name:'Play time response',exact:true}).waitFor();time=await page.evaluate(()=>state._circuitNetwork.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),time);
await page.evaluate(()=>delete document.hidden);
await page.getByRole('button',{name:'Play time response',exact:true}).click();await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();time=await page.evaluate(()=>state._circuitNetwork.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),time);
await page.getByRole('button',{name:'Connected circuits',exact:true}).click();await page.getByRole('button',{name:'Play time response',exact:true}).waitFor();
results.scenarios.push('RLC response, hidden-page pause, and unmount cleanup');
await load('bridge-settle');await cursor.focus();await page.keyboard.press('End');
assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/-99[34]/);
await scope.screenshot({path:path.join(out,'transient-bridge-scope-desktop.jpg'),type:'jpeg',quality:92});
await page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}).screenshot({path:path.join(out,'transient-bridge-board.jpg'),type:'jpeg',quality:92});
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export time response CSV',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'connected-circuit-time-response.csv');await download.saveAs(path.join(out,'transient23-waveform.csv'));const csv=fs.readFileSync(path.join(out,'transient23-waveform.csv'),'utf8');assert.match(csv,/backward_euler_step_doubling/);assert.ok(csv.split('\n').length>1000);
const snapshotPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).click();const snapshot=await snapshotPromise;assert.equal(snapshot.suggestedFilename(),'connected-circuit-snapshot.csv');
await page.getByRole('button',{name:'Measure selected component',exact:true}).click();
await page.getByRole('button',{name:'Reverse network probes',exact:true}).click();assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/^99[34]/);
await page.getByRole('button',{name:'Edit R5',exact:true}).click();assert.match(await page.locator('.circuit-network-scope-legend').innerText(),/R5 · Resistor/);
results.scenarios.push('Capacitive bridge, synchronized readings, selected trace, reversed probes, real waveform and snapshot downloads');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.html)}));});results.axe=axe;assert.deepEqual(axe,[]);
for(const width of [390,320]){await page.setViewportSize({width,height:900});await load('rlc-ring');await cursor.focus();await page.keyboard.press('End');assert.equal(await page.locator('.circuit-network-scope-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await scope.screenshot({path:path.join(out,'transient-scope-phone-'+width+'.jpg'),type:'jpeg',quality:90});await inspector.screenshot({path:path.join(out,'transient-inspector-phone-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
results.scenarios.push('WCAG automated checks and 390/320-pixel scope/inspector layouts');
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{analysis:'time',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'capacitor',a:'A',b:'0',value:100}]}})));
await page.getByText('Check the connections',{exact:true}).waitFor();assert.match(await page.locator('.circuit-network-status').innerText(),/cannot jump instantly/);assert.equal(await page.getByRole('button',{name:'Play time response',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Export time response CSV',exact:true}).count(),0);assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/Undetermined/);
await page.getByRole('button',{name:'Edit C2',exact:true}).click();const initial=page.getByLabel('Starting voltage A − B (V) exact value',{exact:true});await initial.fill('5');await initial.press('Enter');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');
results.scenarios.push('Incompatible initial constraints hide calculated data and recover after an edit');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'transient23-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
