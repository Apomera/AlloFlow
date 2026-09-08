
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
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',voltage:12,components:[{type:'resistor',value:200,id:1},{type:'resistor',value:100,id:2}]}}));
const select=page.getByLabel('Compare parts by',{exact:true});
await select.waitFor();
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
await select.selectOption('voltage');
assert.deepEqual(await bench.locator('.circuit-part-copy small').allTextContents(),['8.00V','4.00V']);
assert.deepEqual(await bench.locator('.circuit-compare-track>span').evaluateAll(els=>els.map(e=>e.style.width)),['100%','50%']);
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await page.getByRole('button',{name:'Inspect 3D part 2 resistor',exact:true}).focus();
await page.keyboard.press('Enter');
assert.equal(await page.getByRole('button',{name:'Select resistor 2 in 3D scene',exact:true}).getAttribute('aria-pressed'),'true');
assert.match(await page.locator('.circuit-scene-insight').innerText(),/4.00V/);
await bench.screenshot({path:path.join(out,'compare-voltage-desktop.png')});
await select.selectOption('current');
assert.deepEqual(await bench.locator('.circuit-compare-track>span').evaluateAll(els=>els.map(e=>e.style.width)),['100%','100%']);
await select.selectOption('power');
assert.deepEqual(await bench.locator('.circuit-part-copy small').allTextContents(),['320.00 mW','160.00 mW']);
// Change the selected resistance through the existing editor and undo it.
await page.getByRole('button',{name:'Edit selected part',exact:true}).click();
await page.locator('#circuit-inspector-value').fill('200');await page.locator('#circuit-inspector-value').press('Enter');
assert.deepEqual(await bench.locator('.circuit-part-copy small').allTextContents(),['180.00 mW','180.00 mW']);
await page.getByRole('button',{name:'Undo',exact:true}).click();
assert.equal(await select.inputValue(),'power');
assert.deepEqual(await bench.locator('.circuit-part-copy small').allTextContents(),['320.00 mW','160.00 mW']);
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',mode:'parallel',sceneCompare:'current',sceneCurrent:true,selectedPart:4,voltage:9,components:Array.from({length:8},(_,i)=>({type:'resistor',value:100*(i+1),id:i+1}))}}));
await page.waitForFunction(()=>document.querySelectorAll('.circuit-part-picker button').length===8);
await bench.screenshot({path:path.join(out,'compare-eight-desktop.png')});
await page.setViewportSize({width:390,height:844});
await bench.screenshot({path:path.join(out,'compare-eight-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneCompare:'voltage',components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]}}));
await page.waitForFunction(()=>document.querySelectorAll('.circuit-compare-track[data-unknown=true]').length===2);
assert.match(await page.locator('#circuit-part-compare-scale').innerText(),/Striped bars mean undetermined/);
await bench.screenshot({path:path.join(out,'compare-unknown-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await select.selectOption('details');
assert.equal(await bench.locator('.circuit-compare-track').count(),0);
assert.equal(await page.locator('#circuit-part-compare-scale').count(),0);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'compare10-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['voltage/current/power scales','view settings preserve electrical state and history','keyboard card selection','scene selection synchronization','editor updates comparisons','undo preserves comparison mode','eight part layout','390px overflow','unknown hatch','return to details']},null,2));
console.log('Part comparison scales, keyboard selection, live editing, undo, mobile layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
