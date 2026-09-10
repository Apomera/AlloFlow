
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






const bench=page.locator('.circuit-3d'),viewport=page.locator('.circuit-scene-viewport');
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneProbes:true,sceneCurrent:true,mode:'series',voltage:12,components:Array.from({length:8},(_,i)=>({type:'resistor',value:(i+1)*100,id:i+1}))}}));
await page.getByRole('button',{name:'Zoom in',exact:true}).waitFor();
const undoBefore=await page.evaluate(()=>JSON.stringify({undo:state._circuit.undo,redo:state._circuit.redo}));
const baseline=await page.evaluate(()=>JSON.stringify(StemLab.solveCircuit(state._circuit)));
const first=page.getByRole('button',{name:'Select resistor 1 in 3D scene',exact:true});
const initial=await first.getAttribute('style');
await page.getByRole('button',{name:'Zoom in',exact:true}).click();
assert.equal(await page.getByLabel('3D camera zoom',{exact:true}).inputValue(),'110');
assert.notEqual(await first.getAttribute('style'),initial);
await page.getByRole('button',{name:'Pan',exact:true}).click();
await viewport.scrollIntoViewIfNeeded();
const box=await viewport.boundingBox();
await page.mouse.move(box.x+box.width*.5,box.y+box.height*.7);
await page.mouse.down();await page.mouse.move(box.x+box.width*.5+50,box.y+box.height*.7+20,{steps:5});await page.mouse.up();
const pan=await page.evaluate(()=>({x:state._circuit.cameraPanX,y:state._circuit.cameraPanY,yaw:state._circuit.cameraYaw,tilt:state._circuit.cameraTilt}));
assert.ok(Math.abs(pan.x-50*640/box.width)<1);assert.ok(Math.abs(pan.y-20*640/box.width)<1);assert.equal(pan.yaw,undefined);assert.equal(pan.tilt,undefined);
await page.getByRole('button',{name:'Center view',exact:true}).click();
assert.equal(await page.evaluate(()=>state._circuit.cameraPanX),0);
await page.locator('.circuit-position-controls summary').click();
const horizontal=page.getByLabel('3D camera horizontal position',{exact:true});
await horizontal.focus();await page.keyboard.press('ArrowRight');
assert.equal(await horizontal.inputValue(),'5');
const vertical=page.getByLabel('3D camera vertical position',{exact:true});
await vertical.fill('-30');
assert.equal(await page.evaluate(()=>state._circuit.cameraPanY),-30);
const zoom=page.getByLabel('3D camera zoom',{exact:true});
await zoom.fill('180');assert.equal(await page.getByRole('button',{name:'Zoom in',exact:true}).isDisabled(),true);
await zoom.fill('60');assert.equal(await page.getByRole('button',{name:'Zoom out',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'Close-up',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>StemLab.circuitCameraState(state._circuit)),{zoom:1,x:0,y:0});
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Orbit',exact:true}).getAttribute('aria-pressed'),'true');
assert.equal(await page.evaluate(()=>state._circuit.sceneCloseup),false);
assert.equal(await page.evaluate(()=>JSON.stringify(StemLab.solveCircuit(state._circuit))),baseline);
assert.equal(await page.evaluate(()=>JSON.stringify({undo:state._circuit.undo,redo:state._circuit.redo})),undoBefore);
await zoom.fill('120');await horizontal.fill('35');
await page.getByRole('button',{name:'Schematic',exact:true}).click();
await page.getByRole('button',{name:'3D bench',exact:true}).click();
assert.equal(await zoom.inputValue(),'120');
assert.equal(await page.evaluate(()=>state._circuit.cameraPanX),35);
const snapshot=await page.evaluate(()=>StemLab.circuitBenchSnapshot(document.querySelector('.circuit-scene-viewport>svg'),StemLab.solveCircuit(state._circuit),0,state._circuit));
assert.match(snapshot,/Zoom 120%/);assert.match(snapshot,/Framing may hide parts/);
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
await page.locator('.circuit-position-controls summary').click();
await page.locator('.circuit-probe-panel summary').first().click();
await bench.screenshot({path:path.join(out,'framing-desktop.jpg'),type:'jpeg',quality:85});
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axeResult=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axeResult.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await page.getByRole('button',{name:'Pan',exact:true}).click();await page.locator('.circuit-position-controls summary').click();
await bench.screenshot({path:path.join(out,'framing-mobile.jpg'),type:'jpeg',quality:85});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'framing15-browser-results.json'),JSON.stringify({passed:true,checks:['zoom bounds and pin projection','screen-scaled pan','keyboard positioning','close-up recenter','full reset','unchanged DC solution','export framing notes','eight-part layout','390px overflow','axe'],axeViolations:axeResult.violations.length},null,2));
console.log('Camera framing browser checks passed');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
