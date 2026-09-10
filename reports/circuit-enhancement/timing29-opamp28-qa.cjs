
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement/timing29-opamp28-qa');
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

const board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}),camera=page.getByRole('group',{name:'Board camera controls',exact:true}),editor=page.getByRole('region',{name:'Op-amp controls',exact:true}),scope=page.getByRole('region',{name:'Connected circuit time response',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const setRange=async(label,value)=>{await page.getByLabel(label,{exact:true}).evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const exact=async(label,value)=>{const f=page.getByLabel(label+' exact value',{exact:true});await f.fill(String(value));await f.press('Enter');};
const collisions=async()=>board.evaluate(root=>{const parts=[...root.querySelectorAll('.circuit-network-part')],nodes=[...root.querySelectorAll('.circuit-network-node')],bad=[];const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;for(let i=0;i<parts.length;i++){for(let j=i+1;j<parts.length;j++)if(overlaps(parts[i].getBoundingClientRect(),parts[j].getBoundingClientRect()))bad.push([parts[i].textContent,parts[j].textContent]);for(const n of nodes)if(overlaps(parts[i].getBoundingClientRect(),n.getBoundingClientRect()))bad.push([parts[i].textContent,n.textContent]);}const stage=root.querySelector('.circuit-network-stage').getBoundingClientRect();for(const el of parts.concat(nodes)){const r=el.getBoundingClientRect();if(r.left<stage.left-1||r.right>stage.right+1||r.top<stage.top-1||r.bottom>stage.bottom+1)bad.push(['outside stage',el.textContent]);}return bad;});

const results={scenarios:[],errors,axe:[]};
const point=page.getByRole('region',{name:'Op-amp scope operating point',exact:true});
await load('opamp-clipping');assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),2);assert.equal(await scope.locator('[data-opamp-limit]').count(),2);await setRange('Connected scope time cursor',.025);assert.match(await point.innerText(),/Upper limit/);assert.equal(await board.locator('[data-network-body="opamp"]').getAttribute('data-opamp-region'),'upper');assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/5.00V/);assert.deepEqual(await collisions(),[]);await board.screenshot({path:path.join(out,'opamp28-clipping-board.jpg'),type:'jpeg',quality:92});await scope.screenshot({path:path.join(out,'opamp28-clipping-scope.jpg'),type:'jpeg',quality:92});await editor.screenshot({path:path.join(out,'opamp28-editor-desktop.jpg'),type:'jpeg',quality:92});
await setRange('Connected scope time cursor',.075);assert.match(await point.innerText(),/Lower limit/);assert.equal(await board.locator('[data-network-body="opamp"]').getAttribute('data-opamp-region'),'lower');await setRange('Connected scope time cursor',.05);assert.match(await point.innerText(),/Linear range/);await click('±12 V window');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);await setRange('Connected scope time cursor',.025);assert.match(await point.innerText(),/Linear range/);assert.ok(parseFloat(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText())>5.9);await click('Undo network edit');assert.equal(await page.getByLabel('Upper output limit (V) exact value',{exact:true}).inputValue(),'5');await click('Redo network edit');assert.equal(await page.getByLabel('Upper output limit (V) exact value',{exact:true}).inputValue(),'12');results.scenarios.push('Upper/lower clipping, linear recovery, synchronized board and scope, output-window presets, undo/redo and electrical cursor reset');
await load('opamp-buffer');await setRange('Connected scope time cursor',.025);const snapshot=await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,time:state._circuitNetwork.time,undo:state._circuitNetwork.undo}));await click('Measure input error');assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'A');assert.equal(await page.evaluate(()=>state._circuitNetwork.probeBlack),'B');assert.equal(await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,time:state._circuitNetwork.time,undo:state._circuitNetwork.undo})),snapshot);await exact('Open-loop gain (V/V)',10);await setRange('Connected scope time cursor',.025);await click('Measure selected component');assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/2.73V/);await click('Gain × 10');assert.equal(await page.getByLabel('Open-loop gain (V/V) exact value',{exact:true}).inputValue(),'100');await page.getByLabel('Scope source comparison',{exact:true}).selectOption('2');await click('Edit R3');await click('Edit op-amp');await page.waitForFunction(()=>document.activeElement.id==='circuit-active-value-network-opamp-gain-slider');results.scenarios.push('Finite gain, input-error probing without changing state, decade gain controls and focus from the scope');
await exact('Lower output limit (V)',15);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'false');assert.match(await editor.innerText(),/Undetermined/);assert.equal(await scope.locator('.circuit-network-scope-scroll').count(),0);assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);await click('Undo network edit');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await page.waitForFunction(()=>{const svg=document.querySelector('.circuit-network-scope-scroll svg');return svg&&Math.abs(Number(svg.getAttribute('viewBox').split(' ')[2])-svg.parentElement.clientWidth)<=1;});
await page.getByLabel('Non-inverting input (+)',{exact:true}).selectOption('B');await page.getByLabel('Inverting input (−)',{exact:true}).selectOption('0');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'false');assert.match(await page.locator('.circuit-network-status').innerText(),/more than one operating point/);await click('Undo network edit');await click('Undo network edit');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');results.scenarios.push('Reversed output-window and positive-feedback diagnoses, no stale trace or export, and undo/resize recovery');
await load('opamp-inverting');await setRange('Connected scope time cursor',.025);assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/-3.00V/);await board.screenshot({path:path.join(out,'opamp28-inverting-board.jpg'),type:'jpeg',quality:92});
await load('opamp-filter');await setRange('Connected scope time cursor',.025);assert.match(await point.innerText(),/Linear range/);await scope.screenshot({path:path.join(out,'opamp28-filter-scope.jpg'),type:'jpeg',quality:92});const pending=page.waitForEvent('download');await click('Export time response CSV');const download=await pending;await download.saveAs(path.join(out,'opamp28-time-response.csv'));const csv=fs.readFileSync(path.join(out,'opamp28-time-response.csv'),'utf8');assert.match(csv,/,finite-gain-clamp,-12,12,linear,/);results.scenarios.push('Inverting amplifier, active-filter scope, and model-aware waveform export');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await load('opamp-clipping');await setRange('Connected scope time cursor',.025);await scope.screenshot({path:path.join(out,'opamp28-scope-'+width+'.jpg'),type:'jpeg',quality:90});await editor.screenshot({path:path.join(out,'opamp28-editor-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(await collisions(),[]);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
await click('Right perspective');await setRange('Board tilt',35);await click('Zoom in circuit board');const before=await page.evaluate(()=>state._circuitNetwork.time);await click('Mixed circuits');await click('Connected circuits');assert.equal(await page.evaluate(()=>state._circuitNetwork.camera.side),-1);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),before);assert.equal(await board.locator('[data-network-body="opamp"]').getAttribute('data-opamp-region'),'upper');results.scenarios.push('Desktop and phone operating-point/inspector accessibility, camera behavior and workspace persistence');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'opamp28-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
