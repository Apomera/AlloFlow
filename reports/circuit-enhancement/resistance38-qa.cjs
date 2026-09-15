
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement')+path.sep;
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










const results={scenarios:[],examples:[],axe:[]},editor=page.getByRole('region',{name:'Diode model and polarity',exact:true}),inside=page.getByRole('region',{name:'Diode voltage and power breakdown',exact:true}),curve=page.getByRole('region',{name:'Diode current-voltage characteristic',exact:true}),board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true',id);};
const edit=async(label,value)=>{const input=page.getByLabel(label+' exact value',{exact:true});await input.fill(String(value));await input.press('Enter');};
const stable=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,time:state._circuitNetwork.time,timeSide:state._circuitNetwork.timeSide,boardReference:state._circuitNetwork.boardReference}));
const seek=async value=>page.getByLabel('Board time cursor',{exact:true}).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
await load('diode-resistance');await inside.waitFor();assert.equal(await page.getByLabel('Internal series resistance (Ω) exact value',{exact:true}).inputValue(),'22');assert.equal(await inside.locator('[data-diode-inside-flow=forward]').count(),1);assert.equal(await curve.locator('[data-junction-bare]').count(),1);assert.ok(Number(await inside.locator('[data-series-power-share]').getAttribute('data-series-power-share'))>0);await page.getByLabel('Diode curve region',{exact:true}).selectOption('forward');await page.getByLabel('Diode curve current scale',{exact:true}).selectOption('0.2');const first=await stable();await click('Compare junction alone');assert.equal(await curve.locator('[data-junction-bare]').count(),0);await click('Compare junction alone');assert.equal(await stable(),first);await inside.screenshot({path:out+'resistance38-forward-inside.jpg',type:'jpeg',quality:93});await curve.screenshot({path:out+'resistance38-forward-curve.jpg',type:'jpeg',quality:93});await board.screenshot({path:out+'resistance38-board.jpg',type:'jpeg',quality:93});results.scenarios.push('Current-driven diode, shared current, voltage/power split and read-only bare-junction comparison');
await edit('Internal series resistance (Ω)',0);assert.equal(await curve.locator('[data-junction-bare]').count(),0);assert.equal(await page.getByRole('button',{name:'Compare junction alone',exact:true}).count(),0);assert.equal(await page.evaluate(()=>state._circuitNetwork.components.find(p=>p.id===2).diode.seriesResistance||0),0);await click('Undo network edit');assert.equal(await page.getByLabel('Internal series resistance (Ω) exact value',{exact:true}).inputValue(),'22');for(const model of ['schottky','zener','silicon']){await page.getByLabel('Network diode model',{exact:true}).selectOption(model);assert.equal(await page.getByLabel('Internal series resistance (Ω) exact value',{exact:true}).inputValue(),'22');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');}results.scenarios.push('Zero-resistance compatibility, undo and resistance preservation across junction presets');
await edit('Internal series resistance (Ω)',1000);await page.getByLabel('Board component',{exact:true}).selectOption('1');await edit('Source current (mA)',100);await page.getByLabel('Board component',{exact:true}).selectOption('2');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');assert.match(await inside.innerText(),/100.00V/);results.scenarios.push('100 mA and 1 kΩ solve above 100 V terminal voltage while keeping internal junction conduction bounded');
await load('diode-resistance-sweep');await page.getByLabel('Board time cursor',{exact:true}).press('Home');await click('Hold this sample');await seek(.025);assert.equal(await curve.locator('[data-junction-point=held]').count(),1);assert.equal(await curve.locator('[data-junction-point=live]').count(),1);const saved=await page.evaluate(()=>JSON.stringify(state)),heldStable=await stable();await click('Compare junction alone');await click('Compare junction alone');assert.equal(await stable(),heldStable);await curve.screenshot({path:out+'resistance38-held-curve.jpg',type:'jpeg',quality:94});await inside.screenshot({path:out+'resistance38-peak-inside.jpg',type:'jpeg',quality:93});await page.getByRole('region',{name:'Voltage and current scope',exact:true}).screenshot({path:out+'resistance38-sweep-scope.jpg',type:'jpeg',quality:93});await edit('Internal series resistance (Ω)',47);assert.equal(await curve.locator('[data-junction-point=held]').count(),0);results.scenarios.push('Current sweep, live/held operating points and reference invalidation after electrical edits');
await load('zener-resistance');await page.getByLabel('Diode curve region',{exact:true}).selectOption('breakdown');await page.getByLabel('Diode curve current scale',{exact:true}).selectOption('0.02');assert.equal(await inside.locator('[data-diode-inside-flow=reverse]').count(),1);assert.match(await editor.innerText(),/Reverse breakdown/);assert.equal(await curve.locator('[data-junction-zero-voltage]').count(),0);await inside.screenshot({path:out+'resistance38-zener-inside.jpg',type:'jpeg',quality:93});await curve.screenshot({path:out+'resistance38-zener-curve.jpg',type:'jpeg',quality:93});await editor.getByText('Inside the diode model',{exact:true}).click();await page.waitForFunction(()=>state._circuitNetwork.diodeInside===false);assert.equal(await inside.count(),0);await editor.getByText('Inside the diode model',{exact:true}).click();await inside.waitFor();results.scenarios.push('Reverse breakdown, separate Rs and Rz, signed drops, positive power and persisted inspector disclosure');
for(const id of ['diode-resistance','diode-resistance-sweep','zener-resistance']){await load(id);assert.equal(await board.locator('[data-route-clear=false]').count(),0);results.examples.push({id,solved:true,clearRoutes:true});}
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{selected:2,diodeInside:true,components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'diode',a:'A',b:'0',diode:{model:'silicon'}}]}})));assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'false');assert.equal(await inside.locator('[data-series-power-share],[data-diode-inside-flow]').count(),0);assert.equal(await curve.locator('[data-junction-point]').count(),0);results.scenarios.push('Failed circuits hide internal readings, power shares and current arrows');
await page.evaluate(saved=>setState(JSON.parse(saved)),saved);await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await inside.screenshot({path:out+'resistance38-inside-'+width+'.jpg',type:'jpeg',quality:93});await curve.screenshot({path:out+'resistance38-curve-'+width+'.jpg',type:'jpeg',quality:94});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const ids=await page.locator('linearGradient[id],clipPath[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);assert.equal(await editor.locator('path[d*=NaN],path[d*=Infinity]').count(),0);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}assert.deepEqual(errors,[]);results.scenarios.push('Desktop and narrow-phone diagrams, distinct material IDs, readable controls and zero scoped accessibility violations');fs.writeFileSync(out+'resistance38-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
