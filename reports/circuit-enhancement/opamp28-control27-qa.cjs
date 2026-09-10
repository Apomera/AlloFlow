
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement/opamp28-control27-qa');
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

const board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}),camera=page.getByRole('group',{name:'Board camera controls',exact:true}),editor=page.getByRole('region',{name:'Controlled source settings',exact:true}),scope=page.getByRole('region',{name:'Connected circuit time response',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const setRange=async(label,value)=>{await page.getByLabel(label,{exact:true}).evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const exact=async(label,value)=>{const f=page.getByLabel(label+' exact value',{exact:true});await f.fill(String(value));await f.press('Enter');};
const collisions=async()=>board.evaluate(root=>{const parts=[...root.querySelectorAll('.circuit-network-part')],nodes=[...root.querySelectorAll('.circuit-network-node')],bad=[];const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;for(let i=0;i<parts.length;i++){for(let j=i+1;j<parts.length;j++)if(overlaps(parts[i].getBoundingClientRect(),parts[j].getBoundingClientRect()))bad.push([parts[i].textContent,parts[j].textContent]);for(const n of nodes)if(overlaps(parts[i].getBoundingClientRect(),n.getBoundingClientRect()))bad.push([parts[i].textContent,n.textContent]);}const stage=root.querySelector('.circuit-network-stage').getBoundingClientRect();for(const el of parts.concat(nodes)){const r=el.getBoundingClientRect();if(r.left<stage.left-1||r.right>stage.right+1||r.top<stage.top-1||r.bottom>stage.bottom+1)bad.push(['outside stage',el.textContent]);}return bad;});

const results={scenarios:[],errors,axe:[]};
await load('controlled-amplifier');await setRange('Connected scope time cursor',.025);await click('Edit E2');assert.match(await editor.innerText(),/3/);const before=await page.evaluate(()=>JSON.stringify({parts:state._circuitNetwork.components,time:state._circuitNetwork.time,undo:state._circuitNetwork.undo}));
for(const side of ['Left perspective','Right perspective']){await click(side);for(const angle of [35,70]){await setRange('Board tilt',angle);assert.deepEqual(await collisions(),[]);}}
await click('Zoom in circuit board');await click('Zoom in circuit board');assert.equal(await page.getByLabel('Board zoom',{exact:true}).innerText(),'150%');await board.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.ok(await board.evaluate(el=>el.scrollLeft)>0);await page.keyboard.press('ArrowDown');assert.ok(await board.evaluate(el=>el.scrollTop)>0);
await click('Reset view');assert.equal(await page.getByLabel('Board zoom',{exact:true}).innerText(),'100%');assert.equal(await board.evaluate(el=>el.scrollLeft),0);assert.equal(await page.evaluate(()=>JSON.stringify({parts:state._circuitNetwork.components,time:state._circuitNetwork.time,undo:state._circuitNetwork.undo})),before);
await camera.screenshot({path:path.join(out,'control27-camera.jpg'),type:'jpeg',quality:92});await board.screenshot({path:path.join(out,'control27-amplifier-board.jpg'),type:'jpeg',quality:92});await editor.screenshot({path:path.join(out,'control27-voltage-editor.jpg'),type:'jpeg',quality:92});await scope.screenshot({path:path.join(out,'control27-amplifier-scope.jpg'),type:'jpeg',quality:92});results.scenarios.push('Camera perspectives, tilt extremes, zoom, keyboard pan and reset preserve parts, time and undo');
await page.getByLabel('Scope source comparison',{exact:true}).selectOption('2');await click('Edit controlled source');await page.waitForFunction(()=>document.activeElement.id==='circuit-active-value-network-controlled-gain-slider');await exact('Control gain (V/V)',-2);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);await setRange('Connected scope time cursor',.025);assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/-2/);await click('Undo network edit');await page.getByLabel('Control positive node',{exact:true}).selectOption('0');await page.getByLabel('Control negative node',{exact:true}).selectOption('A');await setRange('Connected scope time cursor',.025);assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/-3/);results.scenarios.push('Controlled-source focus, signed gain, input reversal and electrical undo');
await load('controlled-feedback');await setRange('Connected scope time cursor',.025);await click('Edit E2');await board.screenshot({path:path.join(out,'control27-feedback-board.jpg'),type:'jpeg',quality:92});await scope.screenshot({path:path.join(out,'control27-feedback-scope.jpg'),type:'jpeg',quality:92});assert.deepEqual(await collisions(),[]);
await load('controlled-sense');await click('Edit F4');assert.match(await editor.innerText(),/0 V voltage source in series/);await page.getByLabel('Current sense source',{exact:true}).selectOption('1');assert.match(await editor.innerText(),/-/);await page.getByLabel('Current sense source',{exact:true}).selectOption('2');await editor.screenshot({path:path.join(out,'control27-current-editor.jpg'),type:'jpeg',quality:92});
await click('Edit V2');await click('Remove network component');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'false');assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);await click('Edit F4');assert.equal(await page.getByLabel('Current sense source',{exact:true}).inputValue(),'0');await click('Undo network edit');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');results.scenarios.push('Current sensing sign, removed-reference diagnostic, disabled export and undo recovery');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await load('controlled-feedback');await click('Edit E2');await camera.screenshot({path:path.join(out,'control27-camera-'+width+'.jpg'),type:'jpeg',quality:90});await editor.screenshot({path:path.join(out,'control27-editor-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(await collisions(),[]);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
await page.setViewportSize({width:1280,height:1000});await click('Zoom in circuit board');await board.scrollIntoViewIfNeeded();await board.evaluate(el=>el.scrollTo(0,0));const rect=await board.boundingBox();await page.mouse.move(rect.x+18,rect.y+18);await page.mouse.down();await page.mouse.move(rect.x-90,rect.y-90,{steps:8});await page.mouse.up();assert.ok(await board.evaluate(el=>el.scrollLeft)>50);await click('Reset view');results.scenarios.push('Desktop and phone layout, accessibility and mouse drag panning');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'control27-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
