
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









await page.getByRole('button',{name:'Connected circuits',exact:true}).click();

const board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}),camera=page.getByRole('group',{name:'Board camera controls',exact:true}),editor=page.getByRole('region',{name:'Controlled source settings',exact:true}),scope=page.getByRole('region',{name:'Connected circuit time response',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const setRange=async(label,value)=>{await page.getByLabel(label,{exact:true}).evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const exact=async(label,value)=>{const f=page.getByLabel(label+' exact value',{exact:true});await f.fill(String(value));await f.press('Enter');};
const collisions=async()=>board.evaluate(root=>{const parts=[...root.querySelectorAll('.circuit-network-part')],nodes=[...root.querySelectorAll('.circuit-network-node')],bad=[];const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;for(let i=0;i<parts.length;i++){for(let j=i+1;j<parts.length;j++)if(overlaps(parts[i].getBoundingClientRect(),parts[j].getBoundingClientRect()))bad.push([parts[i].textContent,parts[j].textContent]);for(const n of nodes)if(overlaps(parts[i].getBoundingClientRect(),n.getBoundingClientRect()))bad.push([parts[i].textContent,n.textContent]);}const stage=root.querySelector('.circuit-network-stage').getBoundingClientRect();for(const el of parts.concat(nodes)){const r=el.getBoundingClientRect();if(r.left<stage.left-1||r.right>stage.right+1||r.top<stage.top-1||r.bottom>stage.bottom+1)bad.push(['outside stage',el.textContent]);}return bad;});

await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,analysis:'dc',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},...Array.from({length:15},(_,i)=>({id:i+2,type:i%3===0?'capacitor':'resistor',a:['A','B','C','D','E','F','G'][i%7],b:'0',value:1000}))],selected:4}})));
await click('Reset view');await board.evaluate(el=>{el.style.maxHeight='none';});assert.deepEqual(await collisions(),[]);await board.locator('.circuit-network-stage').screenshot({path:path.join(out,'control27-dense-board.jpg'),type:'jpeg',quality:90});assert.deepEqual(errors,[]);console.log('Dense board captured with scroll viewport expanded for visual inspection.');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
