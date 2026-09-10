
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






await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();await page.getByRole('button',{name:'Load RC timing example',exact:true}).click();
await page.getByRole('button',{name:'Current direction',exact:true}).click();
await page.getByRole('button',{name:'Play time',exact:true}).click();await page.waitForFunction(()=>state._circuitMixed.timeCursor>0);
assert.equal(await page.locator('.circuit-probe-display').getAttribute('aria-live'),'off');
assert.equal(await page.locator('.circuit-flow-legend').getAttribute('aria-live'),'off');
await page.getByLabel('Mixed circuit supply voltage',{exact:true}).fill('6');
await page.waitForTimeout(350);assert.equal(await page.locator('.circuit-probe-display').getAttribute('aria-live'),'polite');assert.equal(await page.evaluate(()=>state._circuitMixed.timeCursor),0);assert.equal(await page.evaluate(()=>state._circuitMixed.simRunning),false);
await page.getByRole('button',{name:'Play time',exact:true}).click();await page.waitForFunction(()=>state._circuitMixed.timeCursor>0);
await page.getByRole('button',{name:'Simple circuits',exact:true}).click();await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
const stopped=await page.evaluate(()=>state._circuitMixed.timeCursor);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>state._circuitMixed.timeCursor),stopped);
await page.getByRole('button',{name:'Mixed circuits',exact:true}).click();await page.waitForFunction(before=>state._circuitMixed.timeCursor>before,stopped);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
await page.getByRole('button',{name:'Play time',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state._circuitMixed.simRunning),false);
await page.evaluate(()=>{delete document.hidden;});
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'time17-lifecycle-results.json'),JSON.stringify({passed:true,checks:['editing during playback cancels clock and resets time','leaving mixed workspace cleans up timer','return resumes previously running sweep','hidden page pauses playback','live meter announcements off during playback and restored when paused']},null,2));
console.log('Playback lifecycle checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});