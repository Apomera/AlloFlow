
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


const panel=page.getByRole('region',{name:'Waveform measurements',exact:true}),scope=page.getByRole('region',{name:'Connected circuit time response',exact:true}),plot=page.getByRole('region',{name:'Voltage and current scope',exact:true}),board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');};
const exact=async(label,value)=>{const f=page.getByLabel(label+' exact value',{exact:true});await f.fill(String(value));await f.press('Enter');};
const setRange=async(label,value)=>{await page.getByLabel(label,{exact:true}).evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const stat=async name=>panel.locator('[data-stat]').filter({hasText:/.*/}).evaluateAll((items,name)=>items.filter(n=>n.getAttribute('data-stat')===name).map(n=>n.textContent),name);
const results={scenarios:[],errors,axe:[]};
await load('opamp-bandwidth');assert.equal(await panel.getByRole('button',{name:'Measure waveform',exact:true}).getAttribute('aria-expanded'),'false');await setRange('Connected scope time cursor',.00225);const electrical=await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,time:state._circuitNetwork.time,selected:state._circuitNetwork.selected}));await click('Measure waveform');assert.equal(await page.getByRole('button',{name:'Last source cycle',exact:true}).getAttribute('aria-pressed'),'true');assert.ok(Math.abs(parseFloat((await stat('Gain magnitude'))[0])-.7071)<.004);assert.ok(Math.abs(parseFloat((await stat('Phase'))[0])+45)<.4);assert.equal(await plot.locator('[data-measure-window]').count(),2);assert.equal(await plot.locator('[data-measure-bound]').count(),4);await click('Show fitted sine');assert.equal(await plot.locator('[data-fitted-sine="voltage"]').count(),1);assert.equal(await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,time:state._circuitNetwork.time,selected:state._circuitNetwork.selected})),electrical);await panel.screenshot({path:path.join(out,'measure30-bandwidth-panel.jpg'),type:'jpeg',quality:92});await plot.screenshot({path:path.join(out,'measure30-bandwidth-plot.jpg'),type:'jpeg',quality:92});results.scenarios.push('Last-cycle bandwidth gain/phase, fitted-sine overlay, visible interval markers, and unchanged circuit/history/cursor');
await click('Custom interval');await exact('Start measurement time (s)',.0025);await exact('End measurement time (s)',.002);assert.match(await panel.innerText(),/Place the end after the start/);assert.equal(await plot.locator('[data-measure-window]').count(),0);assert.equal(await panel.getByRole('button',{name:'Export window measurements CSV'}).count(),0);await exact('End measurement time (s)',.003);assert.match(await panel.innerText(),/at least one full source cycle/);await exact('Start measurement time (s)',.002);await click('Use scope cursor as start');const range=await page.evaluate(()=>state._circuitNetwork.scopeMeasure);assert.ok(Math.abs(range.start-.75)<.001);await click('Whole run');assert.match(await panel.innerText(),/S · 0.00/);await click('Last source cycle');await click('Hide waveform measurements');assert.equal(await plot.locator('[data-fitted-sine]').count(),0);await click('Measure waveform');assert.equal(await plot.locator('[data-fitted-sine]').count(),1);results.scenarios.push('Custom exact times, reversed-bound diagnosis, short-window fit guard, cursor assignment, presets, and retained visibility settings');
await load('opamp-slew');assert.ok(parseFloat((await stat('Sine-fit residual'))[0])>3);await panel.screenshot({path:path.join(out,'measure30-slew-panel.jpg'),type:'jpeg',quality:92});await plot.screenshot({path:path.join(out,'measure30-slew-plot.jpg'),type:'jpeg',quality:92});const residualBefore=parseFloat((await stat('Sine-fit residual'))[0]);await click('Double slew rate');assert.ok(parseFloat((await stat('Sine-fit residual'))[0])<residualBefore/5);assert.match(await panel.innerText(),/not THD/);results.scenarios.push('Slew distortion visible against a fitted sine; increasing slew reduces the measured residual');
const pending=page.waitForEvent('download');await click('Export window measurements CSV');const download=await pending;await download.saveAs(path.join(out,'measure30-window.csv'));const lines=fs.readFileSync(path.join(out,'measure30-window.csv'),'utf8').trim().split('\n'),header=lines[0].split(','),r=Object.fromEntries(lines[1].split(',').map((v,i)=>[header[i],v]));assert.equal(lines.length,3);assert.equal(r.metric,'voltage');assert.equal(r.integration,'piecewise_linear_time_integral');assert.equal(r.reference,'V1');assert.ok(Number(r.phase_deg)<0);results.scenarios.push('Separate interval CSV includes SI statistics and sine-fit metadata');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await click('Custom interval');await exact('Start measurement time (s)',.001);await exact('End measurement time (s)',.0015);await panel.screenshot({path:path.join(out,'measure30-panel-'+width+'.jpg'),type:'jpeg',quality:90});await plot.screenshot({path:path.join(out,'measure30-plot-'+width+'.jpg'),type:'jpeg',quality:90});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({width,violations});assert.deepEqual(violations,[]);}
const saved=await page.evaluate(()=>JSON.stringify(state));await page.evaluate(()=>setState({_circuit:{pauseMotion:true},_circuitNetwork:{analysis:'dc'}}));await page.evaluate(saved=>setState(JSON.parse(saved)),saved);assert.equal(await click('Last source cycle'),undefined);assert.equal(await panel.getByRole('button',{name:'Hide fitted sine',exact:true}).getAttribute('aria-pressed'),'true');results.scenarios.push('Desktop and phone accessibility/containment, custom controls, and saved measurement preferences');
await load('triangle-current');await page.getByLabel('Scope source comparison',{exact:true}).selectOption('1');assert.match(await panel.innerText(),/Compare an independent sine source/);assert.equal(await plot.locator('[data-fitted-sine]').count(),0);await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,components:prev._circuitNetwork.components.map(p=>p.id===1?{...p,waveform:{...p.waveform,shape:'sine'}}:p)}})));assert.match((await stat('Gain magnitude'))[0],/A\/A/);assert.equal(await plot.locator('[data-fitted-sine="current"]').count(),1);results.scenarios.push('Non-sine reference guidance and a current-source sine comparison with A/A units');
await load('opamp-startup');assert.equal(await page.getByRole('button',{name:'Last source cycle',exact:true}).isDisabled(),true);assert.match(await panel.innerText(),/complete source cycle is unavailable/);await click('Whole run');assert.match(await panel.innerText(),/Compare an independent sine source/);await page.getByRole('button',{name:'Edit U2',exact:true}).click();await exact('Starting output A − B (V)',9);assert.equal(await panel.count(),0);assert.equal(await plot.count(),0);await click('Undo network edit');assert.equal(await panel.count(),1);assert.equal(await plot.count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);results.scenarios.push('DC-source interval fallback and failed-run suppression with undo recovery');
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,analysis:'time',duration:.3,selected:2,scopeSource:1,scopeMeasure:{enabled:true,mode:'cycle',fit:true},components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:10}},{id:2,type:'resistor',a:'B',b:'0',value:1000}]}})));assert.equal((await stat('Gain magnitude'))[0],'Undetermined');assert.equal((await stat('Phase'))[0],'Undetermined');assert.match(await panel.innerText(),/No measurable output sine/);assert.match(await panel.innerText(),/No measurable gain/);results.scenarios.push('A flat output suppresses roundoff-derived gain and phase');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'measure30-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
