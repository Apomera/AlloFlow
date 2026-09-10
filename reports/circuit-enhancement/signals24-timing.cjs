
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








const timings=await page.evaluate(()=>{
const p=(id,type,a,b,value,waveform)=>({id,type,a,b,value,waveform});
const designs=[{name:'Sine filter',duration:.3,components:[p(1,'voltage','A','0',0,{shape:'sine',amplitude:5,frequency:10}),p(2,'resistor','A','B',1000),p(3,'capacitor','B','0',10)]},{name:'Pulse smoothing',duration:.3,components:[p(1,'voltage','A','0',0,{shape:'pulse',amplitude:5,frequency:10,duty:35,edge:2}),p(2,'resistor','A','B',1000),p(3,'capacitor','B','0',22)]}];
return designs.map(d=>{const start=performance.now(),r=StemLab.circuitNetworkTransient(d);return {name:d.name,ok:r.ok,samples:r.frames.length,elapsedMs:performance.now()-start};});
});fs.writeFileSync(path.join(out,'signals24-browser-timing.json'),JSON.stringify(timings,null,2));console.log(JSON.stringify(timings,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});