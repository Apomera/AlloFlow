
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







const bench=page.locator('.circuit-3d');
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',voltage:12,selectedPart:1,components:[{type:'resistor',value:200,id:1},{type:'resistor',value:100,id:2}]}}));
const panel=page.locator('.circuit-probe-panel');
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
await panel.locator('summary').focus();await page.keyboard.press('Enter');
await page.waitForFunction(()=>state._circuit.sceneProbes===true);
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'12.00V');
assert.equal(await bench.locator('[data-voltage-probe]').count(),2);
await panel.getByRole('button',{name:'Across selected part',exact:true}).click();
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'4.00V');
await panel.getByRole('button',{name:'Swap probe leads',exact:true}).click();
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'-4.00V');
assert.match(await panel.locator('.circuit-probe-display').innerText(),/lower potential/);
await panel.getByLabel('Red (+) lead',{exact:true}).selectOption('1');
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'0.00V');
assert.match(await panel.locator('.circuit-probe-display').innerText(),/same node/);
await panel.getByRole('button',{name:'Across selected part',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await bench.screenshot({path:path.join(out,'voltage-probes-desktop.png')});
// A live electrical edit updates the probe reading; undo leaves probe choices intact.
await page.getByRole('button',{name:'Edit selected part',exact:true}).click();
await page.locator('#circuit-inspector-value').fill('200');await page.locator('#circuit-inspector-value').press('Enter');
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'6.00V');
await page.getByRole('button',{name:'Undo',exact:true}).click();
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'4.00V');
assert.equal(await panel.getByLabel('Red (+) lead',{exact:true}).inputValue(),'1');
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save bench image',exact:true}).click();
await (await downloadPromise).saveAs(path.join(out,'voltage-probes-export.png'));
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await bench.screenshot({path:path.join(out,'voltage-probes-mobile.png')});
assert.equal(await page.evaluate(()=>{
  const probes=[...document.querySelectorAll('.circuit-probe-pin')].map(e=>e.getBoundingClientRect());
  const parts=[...document.querySelectorAll('.circuit-scene-pin')].map(e=>e.getBoundingClientRect());
  return probes.some(a=>parts.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
}),false,'Probe badges must not cover selection controls in the phone layout');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,probeRed:1,probeBlack:2,voltage:9,components:[{type:'resistor',value:100,id:1},{type:'capacitor',id:2},{type:'switch',closed:false,id:3},{type:'resistor',value:100,id:4}]}}));
await page.waitForFunction(()=>document.querySelector('.circuit-probe-display strong').textContent==='undetermined');
await panel.getByLabel('Red (+) lead',{exact:true}).selectOption('2');
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'0.00V');
await panel.getByRole('button',{name:'Across source',exact:true}).click();
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'9.00V');
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,probeRed:1,probeBlack:2,voltage:9,components:[{type:'capacitor',id:1},{type:'resistor',value:100,id:2},{type:'capacitor',id:3}]}}));
await page.waitForFunction(()=>document.querySelector('.circuit-probe-display strong').textContent==='0.00V');
assert.match(await panel.locator('.circuit-probe-display').innerText(),/same potential/);
await panel.getByLabel('Red (+) lead',{exact:true}).selectOption('0');
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'undetermined');
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,mode:'parallel',selectedPart:1,voltage:9,components:[{type:'resistor',value:100,id:1},{type:'switch',closed:false,id:2}]}}));
await page.waitForFunction(()=>document.querySelector('.circuit-probe-controls select').options.length===2);
await panel.getByRole('button',{name:'Across selected part',exact:true}).click();
assert.equal(await panel.locator('.circuit-probe-display strong').innerText(),'9.00V');
await panel.locator('summary').click();
await page.waitForFunction(()=>!state._circuit.sceneProbes);
assert.equal(await bench.locator('[data-voltage-probe]').count(),0);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'probes13-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['keyboard open','source reading','selected-part measurement','swap gives negative reading','same-node zero','probes preserve circuit history/current','live edit and undo','PNG export','390px layout','unknown node','same unknown node zero','known source across unknown region','parallel shared rails','hide probes']},null,2));
console.log('Voltage probes, signed/unknown readings, edits/undo, PNG export, phone layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
