
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





const results={scenarios:[],axe:[]},board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}),panel=page.getByRole('region',{name:'Stored energy explorer',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const stable=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,scopeView:state._circuitNetwork.scopeView,scopeMeasure:state._circuitNetwork.scopeMeasure,probeRed:state._circuitNetwork.probeRed,probeBlack:state._circuitNetwork.probeBlack}));
await load('rlc-ring');const untouched=await stable();await click('Stored energy');assert.equal(await clickPressed('Current paths'),false);assert.equal(await clickPressed('Stored energy'),true);
async function clickPressed(name){return await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed')==='true';}
const scale=Number(await panel.locator('[data-energy-scale]').getAttribute('data-energy-scale'));assert.ok(scale>0);assert.equal(await board.locator('[data-network-energy]').count(),2);assert.equal(await board.locator('[data-energy-label=true]').count(),2);
const expected=await page.evaluate(()=>{const run=StemLab.circuitNetworkTransient(state._circuitNetwork);window.energy33Run=run;return StemLab.circuitNetworkEnergyReference(run.design,run.frames);});assert.equal(scale,expected.maximum);await click('Go to energy peak');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),expected.byId[4].time);assert.equal(Number(await board.locator('[data-network-energy="4"]').getAttribute('data-energy-joules')),expected.byId[4].peak);assert.equal(await stable(),untouched);
await board.screenshot({path:path.join(out,'energy33-rlc-board.jpg'),type:'jpeg',quality:93});await panel.screenshot({path:path.join(out,'energy33-rlc-panel.jpg'),type:'jpeg',quality:92});
await click('Inspect L3 energy');assert.equal(await page.getByLabel('Board component',{exact:true}).inputValue(),'3');assert.match(await page.getByRole('group',{name:'Selected energy explanation',exact:true}).innerText(),/E = ½LI²/);await click('Go to energy peak');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),expected.byId[3].time);assert.equal(Number(await panel.locator('[data-energy-scale]').getAttribute('data-energy-scale')),scale);assert.equal(await stable(),untouched);results.scenarios.push('One common run-wide joule scale, exact capacitor/inductor peak navigation, shared board/dock selection, and preserved electrical history');
await load('switch-flyback');await click('Inspect L4 energy');await page.getByLabel('Board switch event',{exact:true}).selectOption('0');const beforeEnergy=Number(await board.locator('[data-network-energy="4"]').getAttribute('data-energy-joules')),beforeFraction=await board.locator('[data-network-energy="4"]').getAttribute('data-energy-fraction');assert.equal(await panel.locator('[data-energy-part="4"]').getAttribute('data-energy-status'),'storing');await click('After switch on board');assert.equal(await panel.locator('[data-energy-part="4"]').getAttribute('data-energy-status'),'returning');assert.equal(Number(await board.locator('[data-network-energy="4"]').getAttribute('data-energy-joules')),beforeEnergy);assert.equal(await board.locator('[data-network-energy="4"]').getAttribute('data-energy-fraction'),beforeFraction);assert.match(await page.getByRole('group',{name:'Selected energy explanation',exact:true}).innerText(),/returning stored energy/);await panel.screenshot({path:path.join(out,'energy33-flyback-panel.jpg'),type:'jpeg',quality:92});await board.screenshot({path:path.join(out,'energy33-flyback-board.jpg'),type:'jpeg',quality:93});await click('Go to energy peak');assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'before');results.scenarios.push('Inductor energy stays continuous as switch power changes sign, and peak navigation preserves the before snapshot');
await page.getByLabel('Board component',{exact:true}).selectOption('1');assert.equal(await page.getByRole('group',{name:'Selected energy explanation',exact:true}).count(),0);assert.match(await panel.innerText(),/Select a capacitor or inductor/);await click('Inspect L4 energy');await page.getByText('Try doubling current',{exact:true}).click();assert.match(await panel.innerText(),/multiplies stored energy by four/);await click('Right perspective');await click('Emphasize selected');await click('Flat network map');assert.equal(await board.locator('[data-network-energy]').count(),1);await click('3D network board');await click('Reset view');await click('Emphasize selected');results.scenarios.push('Energy selection guidance, squared-energy relationship, both board views and camera/emphasis compatibility');
await load('rc-charge');assert.equal(Number(await board.locator('[data-network-energy="3"]').getAttribute('data-energy-fraction')),0);await click('DC equilibrium');assert.equal(await page.getByRole('button',{name:'Go to energy peak',exact:true}).count(),0);assert.match(await panel.innerText(),/DC uses the equilibrium state/);assert.equal(await panel.locator('[data-energy-part="3"]').getAttribute('data-energy-status'),'zero');assert.ok(Number(await board.locator('[data-network-energy="3"]').getAttribute('data-energy-joules'))>0);await click('Time response');await click('Go to energy peak');results.scenarios.push('Zero initial energy, nonzero stored DC energy at zero power, and distinct DC/time references');
await load('rlc-ring');await click('Go to energy peak');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await click('Focus selected');await panel.screenshot({path:path.join(out,'energy33-panel-'+width+'.jpg'),type:'jpeg',quality:91});await board.screenshot({path:path.join(out,'energy33-board-'+width+'.jpg'),type:'jpeg',quality:91});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
const saved=await page.evaluate(()=>JSON.stringify(state));await click('Current paths');assert.equal(await panel.count(),0);await page.evaluate(saved=>setState(JSON.parse(saved)),saved);assert.equal(await panel.count(),1);assert.equal(await clickPressed('Stored energy'),true);results.scenarios.push('Desktop/phone layout and accessibility, energy-layer persistence and clean mode switching');
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{analysis:'time',duration:.1,boardOverlay:'energy',selected:3,components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'voltage',a:'A',b:'0',value:3},{id:3,type:'capacitor',a:'A',b:'0',value:100}]}})));assert.match(await panel.innerText(),/Stored energy is undetermined/);assert.equal(await board.locator('[data-energy-fraction]').count(),0);assert.equal(await page.getByRole('button',{name:'Go to energy peak',exact:true}).isDisabled(),true);await load('bridge');assert.match(await panel.innerText(),/no capacitors or inductors/);await load('rlc-ring');assert.equal(await board.locator('[data-network-energy]').count(),2);results.scenarios.push('Failed-run suppression, no-storage explanation and example recovery');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'energy33-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
