
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement/control27-diodes26-switches-review');
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
const scope=page.getByRole('region',{name:'Connected circuit time response',exact:true}),editor=page.getByRole('region',{name:'Switch timing editor',exact:true}),cursor=page.getByLabel('Connected scope time cursor',{exact:true});
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Load network example',exact:true}).click();await page.waitForFunction(()=>{const svg=document.querySelector('.circuit-network-scope-scroll svg');return svg&&Math.abs(Number(svg.getAttribute('viewBox').split(' ')[2])-svg.parentElement.clientWidth)<=1;});};
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const exact=async(label,value)=>{const field=page.getByLabel(label+' exact value',{exact:true});await field.fill(String(value));await field.press('Enter');};
const results={scenarios:[],errors,axe:[]};
await load('switch-discharge');await scope.waitFor();assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');
await click('Before switch event 1');assert.equal(await cursor.getAttribute('aria-valuetext'),'150.0 ms · before switching');assert.match(await page.locator('.circuit-network-scope-readings').innerText(),/1\.1[12] mA/);assert.equal(await page.locator('.circuit-network-event-list li').count(),1);assert.equal(await page.locator('.circuit-network-scope-scroll line[stroke="#e9ac71"]').count(),2);
await click('After switch event 1');assert.equal(await cursor.getAttribute('aria-valuetext'),'150.0 ms · after switching');assert.match(await page.locator('.circuit-network-scope-readings').innerText(),/-3\.8[89] mA/);assert.match(await page.locator('.circuit-network-continuity').innerText(),/Voltage carried through/);assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/3\.8[89]V/);
await scope.screenshot({path:path.join(out,'switches-charge-discharge-desktop.jpg'),type:'jpeg',quality:90});
await cursor.focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),.15);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'before');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');await page.keyboard.press('ArrowRight');assert.ok(await page.evaluate(()=>state._circuitNetwork.time>.15));await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');
await click('Edit S2');assert.match(await editor.innerText(),/Initial \/ DC state\nClosed/);assert.match(await editor.innerText(),/At cursor · 150.0 ms\nOpen/);assert.match(await page.getByLabel('Edit S2',{exact:true}).innerText(),/Open/);assert.match(await page.getByRole('button',{name:'Select S2 · switch · A to B',exact:true}).innerText(),/Open/);
await editor.screenshot({path:path.join(out,'switches-editor-desktop.jpg'),type:'jpeg',quality:90});await click('Start with switch open');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);assert.equal(await page.evaluate(()=>state._circuitNetwork.components.find(p=>p.id===2).closed),false);await click('Undo network edit');assert.equal(await page.evaluate(()=>state._circuitNetwork.components.find(p=>p.id===2).closed),true);
results.scenarios.push('Simultaneous change, physical before/after readouts, keyboard traversal, continuity evidence, actual board state, and initial-state undo');
await load('switch-hold');await click('Edit S2');await exact('Switch action 1 time (s)',.35);assert.equal(await page.getByLabel('Switch action 2 time (s) exact value',{exact:true}).inputValue(),'0.3');assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.components.find(p=>p.id===2).switching.events.map(e=>e.id)),[2,1]);await exact('Switch action 1 time (s)',.3);assert.match(await page.locator('.circuit-network-status').innerText(),/S2 has two actions/);assert.equal(await page.getByRole('button',{name:'Export time response CSV',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);await exact('Switch action 1 time (s)',.15);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');
for(let i=0;i<6;i++)await click('Add switch action');assert.equal(await page.locator('.circuit-network-switch-action').count(),8);assert.equal(await page.getByRole('button',{name:'Add switch action',exact:true}).isDisabled(),true);assert.match(await editor.innerText(),/After window/);await click('Remove switch action 8');assert.equal(await page.locator('.circuit-network-switch-action').count(),7);await page.waitForFunction(()=>document.activeElement?.id==='network-add-switch-action');await click('Undo network edit');assert.equal(await page.locator('.circuit-network-switch-action').count(),8);await click('Redo network edit');assert.equal(await page.locator('.circuit-network-switch-action').count(),7);await click('Fit scheduled changes');assert.ok(await page.evaluate(()=>state._circuitNetwork.duration>=Math.max(...state._circuitNetwork.components.find(p=>p.id===2).switching.events.map(e=>e.time))));assert.equal(await page.locator('.circuit-network-event-list li').count(),7);
await click('Disable scheduled switching');assert.equal(await page.locator('.circuit-network-event-list').count(),0);assert.equal(await page.getByRole('button',{name:'Open network switch',exact:true}).count(),1);await click('Enable scheduled switching');assert.equal(await page.locator('.circuit-network-switch-action').count(),7);await click('DC equilibrium');assert.match(await editor.innerText(),/DC equilibrium uses the initial switch state/);await click('Run switch schedule');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');
results.scenarios.push('Stable event identities during sorting, duplicate-time recovery, eight-action limit, remove focus, undo/redo, fit window, enable/disable, and DC/time semantics');
await load('switch-flyback');await click('Before switch event 1');assert.match(await page.locator('.circuit-network-scope-readings').innerText(),/150.00 mA/);await click('After switch event 1');assert.match(await page.locator('.circuit-network-scope-readings').innerText(),/-15\.00V/);assert.match(await page.locator('.circuit-network-continuity').innerText(),/150.00 mA → 150.00 mA/);await scope.screenshot({path:path.join(out,'switches-flyback-desktop.jpg'),type:'jpeg',quality:90});
const pending=page.waitForEvent('download');await click('Export time response CSV');const download=await pending;await download.saveAs(path.join(out,'switches25-waveform.csv'));const csv=fs.readFileSync(path.join(out,'switches25-waveform.csv'),'utf8');assert.match(csv,/switch_schedule_s,time_side,switch_events/);assert.match(csv,/,before,S2=open/);assert.match(csv,/,after,S2=open/);assert.match(csv,/switch_constraints/);
await click('Edit R3');await click('Remove network component');assert.match(await page.locator('.circuit-network-status').innerText(),/S2 opens/);assert.equal(await page.locator('.circuit-network-scope-scroll').count(),0);assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);await click('Undo network edit');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');results.scenarios.push('Inductor flyback, current/energy continuity, waveform export, impossible opening diagnosis, and undo recovery');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await load('switch-hold');await click('After switch event 1');await scope.screenshot({path:path.join(out,'switches-hold-scope-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.locator('.circuit-network-scope-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await click('Edit S2');await editor.screenshot({path:path.join(out,'switches-editor-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
await click('Mixed circuits');await click('Connected circuits');assert.equal(await page.getByLabel('Switch action 1 time (s) exact value',{exact:true}).inputValue(),'0.15');await click('After switch event 2');assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');await click('Play time response');await page.waitForFunction(()=>state._circuitNetwork.time>.31);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),null);await click('Pause time response');results.scenarios.push('Readable scope coordinates after invalid-state recovery, desktop and 390/320 px layouts, axe accessibility, workspace persistence, and playback clearing event-side selection');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'switches25-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
