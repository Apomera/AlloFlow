
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement/timing29-control27-layout-qa');
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

const results={catalog:[],dense:[],scenarios:[],errors};
const ids=await page.getByLabel('Connected circuit example',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>({id:o.value,label:o.label})));
for(const example of ids){const started=Date.now();await load(example.id);assert.deepEqual(await collisions(),[],example.id);const fallback=await board.locator('[data-route-clear="false"]').count();results.catalog.push({...example,fallback,loadMs:Date.now()-started});assert.equal(fallback,0,example.id+' has a fallback route');}
await load('controlled-current');await setRange('Connected scope time cursor',.025);await click('Edit G2');assert.ok(await editor.getByText('Control gain (A/V)',{exact:false}).count());assert.equal(await board.locator('[data-network-sense]').count(),2);await editor.screenshot({path:path.join(out,'control27-transconductance-editor.jpg'),type:'jpeg',quality:92});
await load('controlled-sense');await page.getByLabel('Network component to add',{exact:true}).selectOption('ccvs');await click('Add network component');await page.getByLabel('Terminal A',{exact:true}).selectOption('D');await page.getByLabel('Current sense source',{exact:true}).selectOption('2');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await exact('Control gain (Ω)',1000);await click('Measure selected component');assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/5.00V/);await editor.screenshot({path:path.join(out,'control27-transresistance-editor.jpg'),type:'jpeg',quality:92});
const pending=page.waitForEvent('download');await click('Export connected measurements CSV');const download=await pending;await download.saveAs(path.join(out,'control27-controlled.csv'));const csv=fs.readFileSync(path.join(out,'control27-controlled.csv'),'utf8').split('\n'),header=csv[0].split(','),record=Object.fromEntries(csv.find(l=>l.startsWith('H6,')).split(',').map((v,i)=>[header[i],v]));assert.equal(record.controlled_source_kind,'ccvs');assert.equal(record.sense_source_id,'2');assert.equal(Number(record.control_value),.005);results.scenarios.push('VCCS sensing links and units; adding a CCVS, editing its sensed source, measured transresistance output and reconstructible downloaded CSV');
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,analysis:'dc',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},...Array.from({length:15},(_,i)=>({id:i+2,type:i%3===0?'capacitor':'resistor',a:['A','B','C','D','E','F','G'][i%7],b:'0',value:1000}))],selected:4}})));
for(const width of [1280,320]){await page.setViewportSize({width,height:1000});for(const side of ['Left perspective','Right perspective']){await click(side);for(const tilt of [35,70]){await setRange('Board tilt',tilt);assert.deepEqual(await collisions(),[]);assert.equal(await board.locator('[data-route-clear="false"]').count(),0);results.dense.push({width,side,tilt});}}await click('Flat network map');assert.deepEqual(await collisions(),[]);assert.equal(await page.getByLabel('Board tilt',{exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Left perspective',exact:true}).isDisabled(),true);await click('3D network board');}
await page.setViewportSize({width:1280,height:1000});await click('Reset view');await board.evaluate(el=>{el.style.maxHeight='none';});await board.locator('.circuit-network-stage').screenshot({path:path.join(out,'control27-dense-board.jpg'),type:'jpeg',quality:90});results.scenarios.push('All example label clearances and routed branches; 16-part all-node desktop/phone layouts at both perspective and tilt extremes; disabled tilt in flat mode');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'control27-layout-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
