
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




const results={scenarios:[],axe:[]}; const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Load network example',exact:true}).click();assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const dock=page.getByRole('region',{name:'Board instrument dock',exact:true}),board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}),preview=page.getByRole('group',{name:'Board scope preview',exact:true});
const savedDesign=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,scopeView:state._circuitNetwork.scopeView,scopeMeasure:state._circuitNetwork.scopeMeasure}));
await load('switch-flyback');await page.locator('[data-network-body=voltage]').click();assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.componentId),'1');await page.getByLabel('Board component',{exact:true}).selectOption('2');await page.getByLabel('Board switch event',{exact:true}).selectOption('0');
assert.match(await dock.innerText(),/before switching/);assert.equal(await page.locator('[data-network-body=switch]').getAttribute('data-switch-closed'),'true');const before=await savedDesign();
await dock.getByRole('button',{name:'Next board sample',exact:true}).click();assert.match(await dock.innerText(),/after switching/);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');assert.equal(await page.locator('[data-network-body=switch]').getAttribute('data-switch-closed'),'false');assert.equal(await savedDesign(),before);
await dock.getByRole('button',{name:'Before switch on board',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'before');await page.getByLabel('Board time cursor',{exact:true}).press('ArrowRight');assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');
await dock.screenshot({path:path.join(out,'board32-switch-dock.jpg'),type:'jpeg',quality:92});await board.screenshot({path:path.join(out,'board32-switch-board.jpg'),type:'jpeg',quality:92});results.scenarios.push('Shared before/after switch timestamp, sample buttons and keyboard stepping update the 3D lever and full scope without editing the circuit');
await page.getByRole('button',{name:'Zoom in circuit board',exact:true}).click();await page.getByRole('button',{name:'Focus selected',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.className),'circuit-network-part');assert.equal(await page.evaluate(()=>document.activeElement.dataset.componentId),'2');await page.getByRole('button',{name:'Emphasize selected',exact:true}).click();await page.getByRole('button',{name:'Surface grid',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitNetwork.boardGrid),false);assert.equal(await page.locator('[data-network-route="2"]').getAttribute('opacity'),'1');assert.equal(await page.locator('[data-network-route="1"]').getAttribute('opacity'),'0.23');assert.equal(await savedDesign(),before);
await dock.getByRole('button',{name:'Probe across part',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'A');assert.equal(await page.evaluate(()=>state._circuitNetwork.probeBlack),'B');assert.equal(await page.locator('[data-probe-collar]').count(),2);
await dock.getByRole('button',{name:'Edit selected part',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Terminal A');await dock.getByRole('button',{name:'Open full scope',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Voltage and current scope');await page.getByRole('button',{name:'Find selected on board',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.componentId),'2');results.scenarios.push('Camera focus and scope/editor shortcuts move keyboard focus; emphasis, grid, camera and probes preserve electrical history and scope preferences');
await page.getByRole('button',{name:'Reset view',exact:true}).click();assert.equal(await board.evaluate(e=>e.scrollLeft),0);assert.equal(await board.evaluate(e=>e.scrollTop),0);await page.getByRole('button',{name:'Emphasize selected',exact:true}).click();await page.getByRole('button',{name:'Surface grid',exact:true}).click();
await load('opamp-bandwidth');const current=await savedDesign();await preview.click({position:{x:250,y:25}});assert.ok(await page.evaluate(()=>state._circuitNetwork.time>0));await preview.press('End');assert.match(await dock.innerText(),/t = /);assert.equal(await dock.getByRole('button',{name:'Next board sample',exact:true}).isDisabled(),true);await preview.press('Home');assert.equal(await dock.getByRole('button',{name:'Previous board sample',exact:true}).isDisabled(),true);await dock.getByRole('button',{name:'Play on board',exact:true}).click();await page.waitForFunction(()=>state._circuitNetwork.time>0);await dock.getByRole('button',{name:'Pause on board',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Play time response',exact:true}).count(),1);assert.equal(await savedDesign(),current);
await dock.screenshot({path:path.join(out,'board32-amplifier-dock.jpg'),type:'jpeg',quality:92});await board.screenshot({path:path.join(out,'board32-amplifier-board.jpg'),type:'jpeg',quality:92});results.scenarios.push('Whole-run preview seeking, shared playback and boundary keyboard controls');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:'Focus selected',exact:true}).click();const visible=await page.evaluate(()=>{const el=document.activeElement,box=el.getBoundingClientRect(),view=el.closest('.circuit-network-scroll').getBoundingClientRect();return box.left>=view.left&&box.right<=view.right&&box.top>=view.top&&box.bottom<=view.bottom;});assert.equal(visible,true);await dock.screenshot({path:path.join(out,'board32-dock-'+width+'.jpg'),type:'jpeg',quality:91});await board.screenshot({path:path.join(out,'board32-board-'+width+'.jpg'),type:'jpeg',quality:91});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
const saved=await page.evaluate(()=>JSON.stringify(state));await page.evaluate(()=>setState({_circuit:{pauseMotion:true},_circuitNetwork:{analysis:'dc'}}));assert.equal(await preview.count(),0);await page.evaluate(saved=>setState(JSON.parse(saved)),saved);assert.equal(await preview.count(),1);results.scenarios.push('Desktop/phone focus containment, dock reflow, saved workspace restoration and accessibility');
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{analysis:'time',duration:.1,selected:1,components:[{id:1,type:'voltage',a:'A',b:'0',value:2},{id:2,type:'voltage',a:'A',b:'0',value:2},{id:3,type:'resistor',a:'A',b:'0',value:1000}]}})));assert.match(await dock.innerText(),/Undetermined/);assert.equal(await dock.locator('[data-board-scope-trace=current]').getAttribute('d'),'');await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,components:prev._circuitNetwork.components.map(p=>p.id===2?{...p,value:3}:p)}})));assert.equal(await preview.count(),0);assert.match(await dock.innerText(),/Resolve the circuit issue/);assert.equal(await dock.getByRole('button',{name:'Play on board',exact:true}).count(),0);await load('switch-flyback');assert.equal(await preview.count(),1);results.scenarios.push('Unknown branch current, failed-run suppression, DC fallback and example recovery');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'board32-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
