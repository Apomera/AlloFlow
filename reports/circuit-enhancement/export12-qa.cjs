
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
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',sceneCurrent:true,selectedPart:1,voltage:9,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}}));
const save=page.getByRole('button',{name:'Save bench image',exact:true});await save.waitFor();
const before=await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0}));
const downloadPromise=page.waitForEvent('download');
await save.focus();await page.keyboard.press('Enter');
const download=await downloadPromise;
assert.equal(download.suggestedFilename(),'circuit-bench-series.png');
await download.saveAs(path.join(out,'export-bench.png'));
const png=fs.readFileSync(path.join(out,'export-bench.png'));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1280);assert.ok(png.readUInt32BE(20)>1200);
await page.waitForFunction(()=>document.querySelector('.circuit-image-help').textContent.includes('Image ready'));
assert.deepEqual(await page.evaluate(()=>({current:StemLab.solveCircuit(state._circuit).current,undo:state._circuit.undo?.length||0})),before);
await page.getByRole('button',{name:'Close-up',exact:true}).click();
const closeDownloadPromise=page.waitForEvent('download');await save.click();
await (await closeDownloadPromise).saveAs(path.join(out,'export-closeup.png'));
await page.waitForFunction(()=>document.querySelector('.circuit-image-help').textContent.includes('Image ready'));
// Simulate an unavailable canvas and confirm a retry recovers without changing the bench.
await page.evaluate(()=>{window.originalCanvasContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){return null;};});
await save.click();
await page.waitForFunction(()=>document.querySelector('.circuit-image-help').textContent.includes('could not be saved'));
assert.equal(await save.isEnabled(),true);
await page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=window.originalCanvasContext;});
const retryPromise=page.waitForEvent('download');await save.click();await retryPromise;
await page.waitForFunction(()=>document.querySelector('.circuit-image-help').textContent.includes('Image ready'));
assert.equal(await save.isEnabled(),true);
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.setViewportSize({width:390,height:844});
await bench.screenshot({path:path.join(out,'export-controls-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',components:[]}}));
await page.waitForFunction(()=>document.querySelector('.circuit-part-picker-heading').textContent.includes('0 connected'));
assert.equal(await save.isDisabled(),true);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'export12-browser-results.json'),JSON.stringify({errors,axeViolations:axe.violations,pngWidth:png.readUInt32BE(16),pngHeight:png.readUInt32BE(20),checks:['keyboard PNG download','valid PNG dimensions','view and solver history unchanged','close-up export','canvas failure message','successful retry','390px layout','empty export disabled']},null,2));
console.log('PNG download, close-up, failure/retry, state preservation, phone layout and scoped accessibility passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
