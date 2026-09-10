
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
const guide=page.getByRole('region',{name:'Operating region explorer',exact:true}),graph=page.getByRole('region',{name:'Scrollable transistor response graph',exact:true});
const calc=()=>page.evaluate(()=>StemLab.solveActiveCircuit(state._circuitActive));
const saved=()=>page.evaluate(()=>JSON.stringify(StemLab.circuitActiveInvestigation(state._circuitActive)));
const setDesign=async values=>{await page.evaluate(v=>setState(p=>({...p,_circuitActive:{...p._circuitActive,...v}})),values);await page.waitForTimeout(30);};
await page.getByRole('button',{name:'Keep current as reference',exact:true}).click();await page.getByRole('button',{name:'Record operating point',exact:true}).click();
const frozen=await page.evaluate(()=>JSON.stringify({reference:state._circuitActive.reference,observations:state._circuitActive.observations}));
await page.getByRole('button',{name:'Explore cutoff',exact:true}).click();assert.equal((await calc()).region,'cutoff');assert.equal((await calc()).collectorCurrent,0);assert.ok(Math.abs((await calc()).design.input-.35)<1e-12);
await page.getByRole('button',{name:'Explore active region',exact:true}).click();assert.equal((await calc()).region,'active');const activeInput=(await calc()).design.input;assert.match(await guide.innerText(),/Now: Active region/);
await page.getByRole('button',{name:'Explore saturation',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await calc()).region,'saturated');assert.match(await guide.getByRole('status').innerText(),/Now: Saturation/);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Explore saturation');
await page.getByRole('button',{name:'Undo active edit',exact:true}).click();assert.equal((await calc()).design.input,activeInput);await page.getByRole('button',{name:'Redo active edit',exact:true}).click();assert.equal((await calc()).region,'saturated');assert.equal(await page.evaluate(()=>JSON.stringify({reference:state._circuitActive.reference,observations:state._circuitActive.observations})),frozen);
const history=await page.evaluate(()=>JSON.stringify(state._circuitActive.undo));await page.getByText('How are the transitions found?',{exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitActive.undo)),history);assert.match(await guide.innerText(),/0.7 V/);
await page.getByRole('button',{name:'Explore active region',exact:true}).click();await guide.screenshot({path:path.join(out,'regions-manual-desktop.jpg'),type:'jpeg',quality:90});await graph.screenshot({path:path.join(out,'regions-graph-desktop.jpg'),type:'jpeg',quality:90});assert.equal(await page.locator('.circuit-active-region-band').count(),3);assert.equal(await page.locator('.circuit-active-region-boundary').count(),2);
await page.getByRole('button',{name:'Measure transistor',exact:true}).click();assert.match(await page.getByLabel('Active voltmeter reading',{exact:true}).innerText(),/2.60V/);await page.getByRole('button',{name:'Record operating point',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitActive.observations[1].design.input),activeInput);
await page.getByRole('button',{name:'NPN schematic',exact:true}).click();assert.equal((await calc()).region,'active');await page.getByRole('button',{name:'3D experiment board',exact:true}).click();
await page.getByRole('button',{name:'Start transistor prediction',exact:true}).click();assert.ok(await page.evaluate(()=>state._circuitActive.challenge));await page.getByRole('button',{name:'Explore saturation',exact:true}).click();assert.equal(await page.evaluate(()=>state._circuitActive.challenge),null);
await page.getByText('Tune the components',{exact:true}).click();const exactBase=page.getByLabel('Base resistance (Ω) exact value',{exact:true});await exactBase.fill('100000');await exactBase.press('Enter');assert.equal(await page.getByRole('button',{name:'Explore saturation',exact:true}).isDisabled(),true);assert.match(await guide.innerText(),/Even the strongest input/);assert.equal(await page.locator('.circuit-active-region-band[data-region=saturated]').count(),0);await guide.screenshot({path:path.join(out,'regions-unreachable-desktop.jpg'),type:'jpeg',quality:90});await page.getByRole('button',{name:'Undo active edit',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Explore saturation',exact:true}).isDisabled(),false);
for(const project of ['light','dark']){await page.getByRole('button',{name:project==='light'?/Light sensor More light/:/Dark sensor Less light/}).click();if(project==='dark')assert.equal(await page.getByRole('button',{name:'Explore saturation',exact:true}).isDisabled(),true);const lamp=page.getByLabel('Lamp resistance (Ω) exact value',{exact:true});await lamp.fill('432');await lamp.press('Enter');for(const [label,region] of [['cutoff','cutoff'],['active region','active'],['saturation','saturated']]){await page.getByRole('button',{name:'Explore '+label,exact:true}).click();assert.equal((await calc()).region,region);}assert.deepEqual(await page.locator('.circuit-active-region-band').evaluateAll(es=>es.map(e=>e.dataset.region)),project==='light'?['cutoff','active','saturated']:['saturated','active','cutoff']);}
await page.getByRole('button',{name:'Explore active region',exact:true}).click();await guide.screenshot({path:path.join(out,'regions-dark-desktop.jpg'),type:'jpeg',quality:90});await graph.screenshot({path:path.join(out,'regions-dark-graph.jpg'),type:'jpeg',quality:90});const stateBefore=await saved();await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();await page.getByRole('button',{name:'Active electronics',exact:true}).click();assert.equal(await saved(),stateBefore);
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const checkAxe=async()=>{const a=await page.evaluate(async()=>axe.run({include:[['.circuit-active-root']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);};await checkAxe();
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await guide.screenshot({path:path.join(out,'regions-phone.jpg'),type:'jpeg',quality:90});await checkAxe();await page.getByRole('button',{name:'Explore cutoff',exact:true}).focus();await page.keyboard.press('Enter');assert.equal((await calc()).region,'cutoff');assert.ok((await page.getByRole('button',{name:'Explore cutoff',exact:true}).boundingBox()).height>=44);
await page.setViewportSize({width:320,height:760});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByText('How are the transitions found?',{exact:true}).click();assert.match(await guide.innerText(),/Less light increases base drive/);await guide.screenshot({path:path.join(out,'regions-small-phone.jpg'),type:'jpeg',quality:90});
await setDesign({project:'light',supply:3,baseResistance:1000,loadResistance:2000,beta:300,dividerResistance:100000});assert.equal(await page.locator('.circuit-active-region-band').count(),1);assert.equal(await page.getByRole('button',{name:'Explore cutoff',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Explore active region',exact:true}).isDisabled(),true);await checkAxe();
await setDesign({project:'manual',supply:3,baseResistance:1000,loadResistance:2000,beta:300});await page.getByRole('button',{name:'Explore active region',exact:true}).click();assert.equal((await calc()).region,'active');const knee=await page.evaluate(()=>StemLab.circuitActiveRegions(state._circuitActive).saturation);assert.ok(knee<.725);assert.ok((await page.locator('.circuit-active-live-curve').getAttribute('d')).includes('L'+(65+knee/5*670).toFixed(2)+' '));await page.setViewportSize({width:1280,height:1000});await graph.screenshot({path:path.join(out,'regions-narrow-graph.jpg'),type:'jpeg',quality:90});
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'regions21-browser-results.json'),JSON.stringify({passed:true,checks:['all regions selectable','keyboard and focus','electrical undo and redo','frozen reference and observations','shared graph, meter, board and notebook','prediction invalidation','component-dependent reachability','reversed sensor ordering','workspace persistence','whole-range saturation','narrow active interval and precise graph knee','390/320 px layouts','44 px targets'],axeViolations:0},null,2));console.log('Operating-region browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
