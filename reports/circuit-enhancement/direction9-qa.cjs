
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
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',voltage:9,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}}));
const toggle=page.getByRole('button',{name:'Current direction',exact:true});
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
await toggle.focus();await page.keyboard.press('Enter');
assert.equal(await toggle.getAttribute('aria-pressed'),'true');
assert.ok(await bench.locator('.circuit-flow-arrow').count()>0);
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await bench.screenshot({path:path.join(out,'current-series-desktop.png')});
await page.getByRole('button',{name:'Inspect 3D part 3 switch',exact:true}).click();
await page.getByRole('button',{name:'Open switch in 3D',exact:true}).click();
assert.equal(await bench.locator('.circuit-flow-arrow').count(),0);
assert.match(await page.locator('#circuit-flow-note').innerText(),/No current in this path/);
await page.getByRole('button',{name:'Undo',exact:true}).click();
assert.ok(await bench.locator('.circuit-flow-arrow').count()>0);
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneCurrent:true,mode:'parallel',voltage:9,components:[{type:'resistor',value:100,id:1},{type:'switch',closed:false,id:2},{type:'resistor',value:200,id:3}]}}));
await page.waitForFunction(()=>document.querySelector('#circuit-flow-note').textContent.includes('Tracing branch 1'));
assert.equal(await bench.locator('[data-current-route]').count(),2);
assert.match(await page.locator('#circuit-flow-note').innerText(),/Source total: 135.00 mA/);
await bench.screenshot({path:path.join(out,'current-parallel-desktop.png')});
await page.getByRole('button',{name:'Inspect 3D part 2 switch',exact:true}).click();
assert.equal(await bench.locator('.circuit-flow-arrow').count(),0);
assert.match(await page.locator('#circuit-flow-note').innerText(),/Other branches still carry current/);
await page.getByRole('button',{name:'Inspect 3D part 3 resistor',exact:true}).click();
assert.match(await page.locator('#circuit-flow-note').innerText(),/Selected branch: 45.00 mA/);
assert.equal(await bench.locator('[data-current-route]').count(),2);
await page.getByLabel('3D camera orbit').fill('80');
await page.getByLabel('3D camera tilt').fill('20');
assert.equal(await bench.locator('svg').evaluate(el=>/NaN|Infinity/.test(el.innerHTML)),false);
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
await page.getByRole('button',{name:'Close-up',exact:true}).click();
assert.match(await page.locator('#circuit-flow-note').innerText(),/Close-up shows part of the path/);
await page.getByRole('button',{name:'Close-up',exact:true}).click();
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await bench.screenshot({path:path.join(out,'current-parallel-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await toggle.click();
assert.equal(await bench.locator('.circuit-flow-arrow').count(),0);
assert.equal(await page.locator('#circuit-flow-note').count(),0);
await toggle.click();
assert.ok(await bench.locator('.circuit-flow-arrow').count()>0);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'direction9-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['keyboard toggle','view changes preserve solver and undo','open switch removes arrows','undo restores arrows','selected parallel route','blocked branch has no arrows','branch and total currents','camera extremes','close-up explanation','phone overflow','hide/show overlay']},null,2));
console.log('Current direction, branch selection, reversible edits, camera, phone layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
