
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
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneCloseup:true,sceneCurrent:true,sceneCompare:'voltage',voltage:9,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}}));
const next=page.getByRole('button',{name:'Next 3D part',exact:true}),previous=page.getByRole('button',{name:'Previous 3D part',exact:true});
await next.waitFor();
assert.equal(await previous.isDisabled(),true);
assert.equal(await next.isDisabled(),false);
assert.ok(await page.evaluate(()=>!!(document.querySelector('.circuit-camera').compareDocumentPosition(document.querySelector('.circuit-scene-insight'))&Node.DOCUMENT_POSITION_FOLLOWING)));
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
await next.focus();await page.keyboard.press('Enter');
assert.equal(await page.evaluate(()=>state._circuit.selectedPart),1);
assert.equal(await page.getByRole('button',{name:'Select led 2 in 3D scene',exact:true}).getAttribute('aria-pressed'),'true');
assert.match(await page.locator('.circuit-selection-position').innerText(),/Part 2 of 3 · LED/);
assert.equal(await page.getByRole('button',{name:'Inspect 3D part 2 led',exact:true}).getAttribute('aria-pressed'),'true');
assert.match(await page.locator('.circuit-scene-caption').innerText(),/Close-up · led/i);
await next.click();
assert.equal(await next.isDisabled(),true);
assert.match(await page.locator('.circuit-selection-position').innerText(),/Part 3 of 3/);
assert.match(await page.locator('.circuit-scene-readings').innerText(),/µV/);
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await previous.click();
assert.equal(await page.evaluate(()=>state._circuit.selectedPart),1);
assert.equal(await page.getByLabel('Compare parts by',{exact:true}).inputValue(),'voltage');
assert.equal(await page.getByRole('button',{name:'Current direction',exact:true}).getAttribute('aria-pressed'),'true');
await page.getByRole('button',{name:'Close-up',exact:true}).click();
await bench.screenshot({path:path.join(out,'navigation-desktop.png')});
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await next.click();
await bench.screenshot({path:path.join(out,'navigation-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState(prev=>({_circuit:{...prev._circuit,components:[{type:'resistor',value:100,id:1}]}})));
await page.waitForFunction(()=>document.querySelector('.circuit-selection-position').textContent.includes('Part 1 of 1'));
assert.equal(await next.isDisabled(),true);assert.equal(await previous.isDisabled(),true);
await page.evaluate(()=>setState(prev=>({_circuit:{...prev._circuit,components:[]}})));
await page.waitForFunction(()=>!document.querySelector('.circuit-selection-nav'));
assert.equal(await page.getByRole('button',{name:'Close-up',exact:true}).isDisabled(),true);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'navigation11-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['camera precedes readout','keyboard next navigation','close-up follows selection','pins and comparison cards synchronized','disabled boundaries','previous navigation','view preferences and electrical history preserved','small voltage displayed','390px layout','selection clamped after removal','empty navigation hidden']},null,2));
console.log('Part navigation, close-up, control placement, precision, phone layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
