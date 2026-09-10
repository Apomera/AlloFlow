
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






await page.getByRole('button',{name:'Load Starter Circuit',exact:true}).click();
const simpleBefore=await page.evaluate(()=>JSON.stringify(StemLab.solveCircuit(state._circuit)));
await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();
await page.getByRole('heading',{name:'More paths. New possibilities.',exact:true}).waitFor();
const mixed=page.locator('.circuit-mixed-root'),bench=mixed.locator('.circuit-3d');
const get=()=>page.evaluate(()=>StemLab.solveMixedCircuit(state._circuitMixed||{voltage:12,components:[{id:1,type:'resistor',value:200,branch:1},{id:2,type:'resistor',value:100,branch:1},{id:3,type:'bulb',value:300,branch:2},{id:4,type:'switch',closed:true,branch:2}]}));
assert.equal((await get()).branches.length,2);
await page.getByRole('button',{name:'Load two-branch example',exact:true}).click();
await page.getByRole('button',{name:'Edit mixed part 4 switch',exact:true}).click();
await page.getByRole('button',{name:'Open selected switch',exact:true}).click();
let s=await get();assert.equal(s.rows[0].current,.04);assert.equal(s.rows[2].current,0);assert.equal(s.rows[3].current,0);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();assert.ok((await get()).rows[2].current>0);
await page.getByRole('button',{name:'Redo wiring',exact:true}).click();assert.equal((await get()).rows[2].current,0);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();
await page.getByRole('button',{name:'Edit mixed part 2 resistor',exact:true}).click();
await page.getByLabel('Selected component branch',{exact:true}).selectOption('2');
s=await get();assert.equal(s.rows[0].current,.06);assert.ok(Math.abs(s.branches[1].solved.current-12/400.001)<1e-12);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();
await page.getByRole('button',{name:'Edit mixed part 2 resistor',exact:true}).click();
await page.getByLabel('Resistance (Ω)',{exact:true}).fill('200');await page.getByLabel('Resistance (Ω)',{exact:true}).press('Enter');
assert.equal((await get()).rows[0].current,.03);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();
await page.getByRole('button',{name:'Move earlier in branch',exact:true}).click();
assert.equal((await get()).components[0].value,100);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();
await bench.locator('.circuit-probe-panel>summary').click();
await page.getByLabel('Red (+) lead',{exact:true}).selectOption('2');await page.getByLabel('Black (−) lead',{exact:true}).selectOption('1');
assert.match(await bench.locator('.circuit-probe-display').innerText(),/4.00V/);
await page.getByRole('button',{name:'Across selected part',exact:true}).click();
s=await get();let selected=await page.evaluate(()=>state._circuitMixed.selectedPart||0);
assert.deepEqual(await page.evaluate(()=>[state._circuitMixed.probeRed,state._circuitMixed.probeBlack]),[s.rows[selected].nodeA,s.rows[selected].nodeB]);
const undoBefore=await page.evaluate(()=>JSON.stringify(state._circuitMixed.undo));
await page.getByRole('button',{name:'Zoom in',exact:true}).click();
assert.equal(await page.evaluate(()=>JSON.stringify(state._circuitMixed.undo)),undoBefore);
await page.getByRole('button',{name:'Mixed schematic',exact:true}).click();
await page.getByRole('img',{name:/Mixed circuit: 2 parallel branches/}).waitFor();
assert.equal(await bench.count(),0);
await mixed.screenshot({path:path.join(out,'mixed-schematic-desktop.jpg'),type:'jpeg',quality:85});
await page.getByRole('button',{name:'3D mixed bench',exact:true}).click();assert.equal(await page.getByLabel('3D camera zoom',{exact:true}).inputValue(),'110');
await page.getByRole('button',{name:'Copy simple circuit',exact:true}).click();
assert.equal((await get()).branches.length,1);assert.equal(await page.evaluate(()=>JSON.stringify(StemLab.solveCircuit(state._circuit))),simpleBefore);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();
await page.getByRole('button',{name:'Add parallel branch',exact:true}).click();assert.equal((await get()).branches.length,3);
await page.getByRole('button',{name:'Add in series to branch A',exact:true}).click();
await page.getByRole('button',{name:'Add in series to branch A',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Add in series to branch A',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'Add in series to branch B',exact:true}).click();assert.equal((await get()).rows.length,8);
assert.equal(await page.getByRole('button',{name:'Add parallel branch',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'Remove selected part',exact:true}).click();assert.equal((await get()).rows.length,7);
await page.getByRole('button',{name:'Undo wiring',exact:true}).click();assert.equal((await get()).rows.length,8);
await page.getByRole('button',{name:'Load two-branch example',exact:true}).click();
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
await page.getByRole('button',{name:'Edit mixed part 3 bulb',exact:true}).click();
await page.getByRole('button',{name:'Current direction',exact:true}).click();
assert.ok(await bench.locator('[data-current-route]').count()>0);
await page.getByRole('button',{name:'Across selected part',exact:true}).click();
const svg=await page.evaluate(()=>StemLab.circuitBenchSnapshot(document.querySelector('.circuit-scene-viewport>svg'),StemLab.solveMixedCircuit(state._circuitMixed),state._circuitMixed.selectedPart,state._circuitMixed));
assert.match(svg,/branch B/);assert.match(svg,/Circuit bench · mixed/);assert.ok(!svg.includes('NaN'));
await mixed.screenshot({path:path.join(out,'mixed-workbench-desktop.jpg'),type:'jpeg',quality:85});
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axeResult=await page.evaluate(async()=>axe.run({include:[['.circuit-mixed-root'],['.circuit-workspace-switch']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axeResult.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await page.locator('.circuit-mixed-connections').screenshot({path:path.join(out,'mixed-editor-mobile.jpg'),type:'jpeg',quality:85});
await mixed.screenshot({path:path.join(out,'mixed-workbench-mobile.jpg'),type:'jpeg',quality:85});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.getByRole('button',{name:'Mixed schematic',exact:true}).click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('.circuit-mixed-scroll').focus();await page.keyboard.press('ArrowRight');
await page.waitForFunction(()=>document.querySelector('.circuit-mixed-scroll').scrollLeft>0);
const schematicAxe=await page.evaluate(async()=>axe.run({include:[['.circuit-mixed-root']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(schematicAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,data:n.any}))})),[]);
await page.getByRole('button',{name:'Simple circuits',exact:true}).click();await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
assert.equal(await page.evaluate(()=>JSON.stringify(StemLab.solveCircuit(state._circuit))),simpleBefore);
await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();assert.equal((await get()).rows.length,4);
await page.evaluate(()=>setState(prev=>({...prev,_circuitMixed:{voltage:12,components:[],benchView:'3d'}})));
await page.waitForFunction(()=>!document.querySelector('.circuit-mixed-path'));
assert.equal(await page.getByRole('button',{name:'Close-up',exact:true}).isDisabled(),true);
assert.equal(await page.getByRole('button',{name:'Save bench image',exact:true}).isDisabled(),true);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'mixed16-browser-results.json'),JSON.stringify({passed:true,checks:['branch switch isolation','actual rewiring','value edits','reordering','undo redo availability','internal probes','camera outside electrical history','schematic and 3D persistence','copy simple build','capacity limits','removal and empty network','current traces','snapshot branch labels','390px overflow','simple state preserved'],axeViolations:axeResult.violations.length+schematicAxe.violations.length},null,2));
console.log('Mixed circuit browser checks passed');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
