
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
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,selectedPart:1,voltage:12,components:[{type:'resistor',value:200,id:1},{type:'resistor',value:100,id:2}]}}));
const practice=page.locator('.circuit-probe-practice');
await practice.locator('summary').focus();await page.keyboard.press('Enter');
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
await practice.getByRole('button',{name:'Start measurement challenge',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>[state._circuit.probeRed,state._circuit.probeBlack]),[0,0]);
const check=practice.getByRole('button',{name:'3 · Check my probes',exact:true});
assert.equal(await check.isDisabled(),true);
await practice.getByRole('button',{name:'Positive (+)',exact:true}).click();
await check.click();assert.match(await practice.innerText(),/Adjust the probe positions/);
const red=page.getByLabel('Red (+) lead',{exact:true}),black=page.getByLabel('Black (−) lead',{exact:true});
await red.selectOption('2');await black.selectOption('1');await check.click();
assert.match(await practice.innerText(),/leads are reversed/);
await red.selectOption('1');await black.selectOption('2');await check.click();
assert.match(await practice.innerText(),/Connections correct/);assert.match(await practice.innerText(),/sign prediction matched/);
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await page.getByRole('button',{name:'Schematic',exact:true}).click();
await page.getByRole('button',{name:'3D bench',exact:true}).click();
assert.equal(await practice.getByRole('button',{name:'Positive (+)',exact:true}).getAttribute('aria-pressed'),'true');
assert.match(await practice.innerText(),/Connections correct/);
await bench.screenshot({path:path.join(out,'probe-practice-desktop.jpg'),type:'jpeg',quality:85});
await practice.screenshot({path:path.join(out,'probe-practice-detail.png')});
await red.selectOption('0');assert.match(await practice.innerText(),/positions changed/);
assert.equal(await practice.getByText('Connections correct',{exact:true}).count(),0);
await red.selectOption('1');
await page.getByRole('button',{name:'Edit selected part',exact:true}).click();
await page.locator('#circuit-inspector-value').fill('200');await page.locator('#circuit-inspector-value').press('Enter');
assert.match(await practice.innerText(),/circuit changed/);assert.equal(await check.count(),0);
await page.getByRole('button',{name:'Undo',exact:true}).click();
assert.equal(await check.count(),1);
await practice.getByRole('button',{name:'Restart measurement challenge',exact:true}).click();assert.equal(await check.isDisabled(),true);
await practice.getByLabel('Measurement challenge',{exact:true}).selectOption('reverse');
await practice.getByRole('button',{name:'Start measurement challenge',exact:true}).click();
await practice.getByRole('button',{name:'Negative (−)',exact:true}).click();await red.selectOption('2');await check.click();
assert.match(await practice.innerText(),/Measured -12.00V/);
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await practice.screenshot({path:path.join(out,'probe-practice-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,components:[{type:'capacitor',id:1},{type:'switch',closed:false,id:2}]}}));
await page.waitForFunction(()=>state._circuit.components[0].type==='capacitor');
await practice.locator('summary').click();
await practice.getByLabel('Measurement challenge',{exact:true}).selectOption('part');
await practice.getByRole('button',{name:'Start measurement challenge',exact:true}).click();
await practice.getByRole('button',{name:'Undetermined',exact:true}).click();await black.selectOption('1');await check.click();
assert.match(await practice.innerText(),/Measured undetermined/);assert.match(await practice.innerText(),/sign prediction matched/);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'practice14-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['keyboard practice open','start resets probes only','prediction required','wrong and reversed placement feedback','successful measurement','feedback updates when probes move','circuit-change invalidation and undo','restart clears prediction','reverse-source task','390px layout','undetermined task']},null,2));
console.log('Probe practice prediction, placement feedback, invalidation, undo, unknown readings, phone layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
