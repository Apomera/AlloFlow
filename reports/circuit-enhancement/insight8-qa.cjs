
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


const bench=page.locator('.circuit-3d'),insight=page.getByRole('region',{name:'Selected 3D component readings'});
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',voltage:9,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}}));
await bench.waitFor();
await page.getByRole('button',{name:'Inspect 3D part 2 led',exact:true}).click();
assert.equal(await insight.locator('h4').textContent(),'led');
assert.match(await insight.innerText(),/14.58 mA/);
await insight.getByText('Understand this reading',{exact:true}).click();
assert.match(await insight.innerText(),/transfers electrical energy into light and heat/);
await insight.getByRole('button',{name:'Reverse LED in 3D',exact:true}).click();
assert.match(await insight.innerText(),/Reverse polarity/);
assert.equal(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current),0);
await page.getByRole('button',{name:'Undo',exact:true}).click();
assert.match(await insight.innerText(),/Forward conducting/);
await page.getByRole('button',{name:'Redo',exact:true}).click();
assert.match(await insight.innerText(),/Reverse polarity/);
await insight.getByRole('button',{name:'Restore LED polarity in 3D',exact:true}).click();
await page.getByRole('button',{name:'Inspect 3D part 3 switch',exact:true}).click();
await insight.getByRole('button',{name:'Open switch in 3D',exact:true}).click();
assert.equal(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current),0);
await insight.getByRole('button',{name:'Close switch in 3D',exact:true}).click();
assert.ok(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current)>0);
await page.getByRole('button',{name:'Inspect 3D part 1 resistor',exact:true}).click();
await insight.getByRole('button',{name:'Edit selected part',exact:true}).click();
assert.equal(await page.evaluate(()=>document.activeElement.id),'circuit-inspector-value');
await page.locator('#circuit-inspector-value').fill('940');
await page.locator('#circuit-inspector-value').press('Enter');
assert.match(await insight.innerText(),/7.37 mA/);
// A type change with the same ID/value must discard an invalid draft and error.
await page.locator('#circuit-inspector-value').fill('0');
await page.locator('#circuit-inspector-value').press('Enter');
await page.evaluate(()=>setState(prev=>({_circuit:{...prev._circuit,components:prev._circuit.components.map((c,i)=>i===0?{...c,type:'capacitor'}:c)}})));
await page.waitForFunction(()=>document.querySelector('#circuit-inspector-value').value==='940');
assert.equal(await page.locator('#circuit-inspector-value').inputValue(),'940');
assert.equal(await page.locator('#circuit-inspector-value').getAttribute('aria-invalid'),'false');
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',voltage:9,selectedPart:1,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}}));
await insight.getByText('Understand this reading',{exact:true}).click();
await bench.screenshot({path:path.join(out,'insight-3d-desktop.png')});
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await bench.screenshot({path:path.join(out,'insight-3d-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',mode:'parallel',voltage:9,selectedPart:1,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2}]}}));
assert.equal(await insight.getAttribute('data-tone'),'warning');
const warningAxe=await page.evaluate(async()=>axe.run({include:[['.circuit-scene-insight']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(warningAxe.violations.map(v=>v.id),[]);
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]}}));
await insight.getByText('Understand this reading',{exact:true}).click();
assert.match(await insight.innerText(),/Voltage is undetermined/);
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await bench.screenshot({path:path.join(out,'insight-ambiguous-mobile.png')});
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'insight8-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,warningAxeViolations:warningAxe.violations,checks:['selected LED readings','contextual explanation','LED reverse and restore','undo and redo','switch open and close','edit focus handoff','live resistance update','type change resets invalid draft','390px layout','ambiguous voltage explanation']},null,2));
console.log('Selected 3D readings, actions, undo, editing, mobile layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
