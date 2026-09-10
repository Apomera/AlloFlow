
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






await page.evaluate(()=>setState({_circuit:{mixedWorkbench:true},_circuitMixed:{benchView:'3d',sceneCurrent:true,selectedPart:2,voltage:12,components:[{id:1,type:'resistor',value:200,branch:1},{id:2,type:'resistor',value:100,branch:1},{id:3,type:'bulb',value:300,branch:2},{id:4,type:'switch',closed:true,branch:2}]}}));
await page.getByRole('heading',{name:'More paths. New possibilities.'}).waitFor();
await page.locator('.circuit-scene-viewport').screenshot({path:path.join(out,'mixed-scene-detail.jpg'),type:'jpeg',quality:90});
await page.setViewportSize({width:390,height:844});
await page.locator('.circuit-part-inspector').screenshot({path:path.join(out,'mixed-inspector-mobile.jpg'),type:'jpeg',quality:90});
console.log('Mixed scene and mobile inspector previews saved');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});