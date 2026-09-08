
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
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
await page.getByRole('button',{name:'3D bench',exact:true}).click();
await page.setViewportSize({width:390,height:844});
const scene=page.locator('.circuit-scene-viewport');
await scene.evaluate(el=>el.scrollIntoView({block:'center'}));
const bounds=await scene.boundingBox();
const client=await page.context().newCDPSession(page);
await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const origin={x:bounds.x+bounds.width*.3,y:bounds.y+bounds.height*.25};
const beforeCurrent=await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current);
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
for(const dx of [20,40,60,80]){
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x+dx,y:origin.y}]});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
}
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForFunction(()=>state._circuit.cameraYaw>-22);
assert.equal(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current),beforeCurrent);
const yaw=await page.evaluate(()=>state._circuit.cameraYaw),scroll=await page.evaluate(()=>scrollY);
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:origin.x,y:origin.y+70}]});
for(const dy of [20,40,60,80]){
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x,y:origin.y+70-dy}]});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
}
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForFunction(start=>scrollY>start,scroll);
assert.equal(await page.evaluate(()=>state._circuit.cameraYaw),yaw);
assert.equal(await page.locator('.circuit-scene-viewport').getAttribute('data-dragging'),'false');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'interaction7-touch-results.json'),JSON.stringify({checks:['horizontal touch orbits','vertical touch scrolls page','touch preserves circuit readings','pointer cancellation ends drag'],errors},null,2));
console.log('Touch camera and page-scroll checks passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
