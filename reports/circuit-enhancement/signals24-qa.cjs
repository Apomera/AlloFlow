
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
const scope=page.getByRole('region',{name:'Connected circuit time response',exact:true}),generator=page.getByRole('region',{name:'Source signal generator',exact:true}),cursor=page.getByLabel('Connected scope time cursor',{exact:true});
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Load network example',exact:true}).click();};
const exact=async(label,value)=>{const field=page.getByLabel(label+' exact value',{exact:true});await field.fill(String(value));await field.press('Enter');};
const click=async name=>page.getByRole('button',{name,exact:true}).click(),results={scenarios:[],errors};
await load('sine-filter');await scope.waitFor();assert.match(await page.locator('.circuit-network-compare-key').innerText(),/V1 source voltage/);assert.equal(await page.locator('.circuit-network-scope-scroll path[stroke-dasharray]').count(),1);
await cursor.focus();await page.keyboard.press('End');assert.match(await page.getByLabel('Connected voltmeter reading',{exact:true}).innerText(),/-2.2[45]V/);await scope.screenshot({path:path.join(out,'signals-sine-filter-desktop.jpg'),type:'jpeg',quality:92});
const time=await page.evaluate(()=>state._circuitNetwork.time);await page.getByLabel('Scope source comparison',{exact:true}).selectOption('0');assert.equal(await page.locator('.circuit-network-scope-scroll path[stroke-dasharray]').count(),0);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),time);await page.getByLabel('Scope source comparison',{exact:true}).selectOption('1');
await click('Edit source signal');await generator.waitFor();assert.equal(await page.getByLabel('Network source waveform',{exact:true}).inputValue(),'sine');await page.waitForFunction(()=>document.activeElement?.id==='network-source-waveform');await generator.screenshot({path:path.join(out,'signals-generator-desktop.jpg'),type:'jpeg',quality:92});
await click('Double frequency');assert.equal(await page.getByLabel('Frequency (Hz) exact value',{exact:true}).inputValue(),'20');assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);await click('Undo network edit');assert.equal(await page.getByLabel('Frequency (Hz) exact value',{exact:true}).inputValue(),'10');
const frequency=page.getByLabel('Frequency (Hz)',{exact:true});await frequency.focus();await page.keyboard.press('ArrowRight');assert.ok(Number(await page.getByLabel('Frequency (Hz) exact value',{exact:true}).inputValue())>10);await page.keyboard.press('Home');assert.equal(await page.getByLabel('Frequency (Hz) exact value',{exact:true}).inputValue(),'0.01');await exact('Frequency (Hz)',20);await click('Show up to 3 cycles');assert.equal(await page.evaluate(()=>state._circuitNetwork.duration),.15);
await click('DC equilibrium');assert.match(await generator.innerText(),/DC equilibrium uses only the DC level/);await exact('DC level (V)',2);assert.match(await generator.innerText(),/2.00V/);await click('Run this signal');await scope.waitFor();
results.scenarios.push('Sine-filter overlay, shared cursor, source focus jump, logarithmic keyboard control, undo, fit cycles, and DC/time semantics');
await load('pulse-smooth');await cursor.focus();await page.keyboard.press('End');await scope.screenshot({path:path.join(out,'signals-pulse-smoothing-desktop.jpg'),type:'jpeg',quality:92});await click('Edit source signal');await exact('Pulse width (% of period)',1);await exact('Rise / fall (% of period)',.1);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await exact('Rise / fall (% of period)',2);const edge=page.getByLabel('Rise / fall (% of period) exact value',{exact:true});assert.equal(await edge.getAttribute('aria-invalid'),'true');await edge.press('Escape');assert.equal(await edge.inputValue(),'0.1');await page.getByLabel('Network source waveform',{exact:true}).selectOption('triangle');await exact('Phase lead (°)',90);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await click('Undo network edit');assert.equal(await page.getByLabel('Phase lead (°) exact value',{exact:true}).inputValue(),'0');
results.scenarios.push('Pulse shaping, dependent edge limits, invalid input recovery, triangle and phase edits');
await load('triangle-current');assert.match(await page.locator('.circuit-network-compare-key').innerText(),/I1 source current/);await cursor.focus();await page.keyboard.press('End');await scope.screenshot({path:path.join(out,'signals-triangle-current-desktop.jpg'),type:'jpeg',quality:92});await click('Edit source signal');assert.equal(await page.getByLabel('Peak amplitude (mA) exact value',{exact:true}).inputValue(),'5');await exact('Peak amplitude (mA)',3);assert.equal(await page.evaluate(()=>state._circuitNetwork.components[0].waveform.amplitude),.003);
const pending=page.waitForEvent('download');await click('Export time response CSV');const download=await pending;await download.saveAs(path.join(out,'signals24-waveform.csv'));const csv=fs.readFileSync(path.join(out,'signals24-waveform.csv'),'utf8');assert.match(csv,/source_frequency_Hz/);assert.match(csv,/,triangle,0.003,10,0,50,2/);results.scenarios.push('Current-source overlay, mA conversion, and real waveform export');
await load('sine-filter');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});results.axe=[];
for(const view of ['scope','generator']){if(view==='generator')await click('Edit source signal');const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});results.axe.push({view,violations});assert.deepEqual(violations,[]);}
for(const width of [390,320]){await page.setViewportSize({width,height:900});await load('pulse-smooth');await cursor.focus();await page.keyboard.press('End');await scope.screenshot({path:path.join(out,'signals-scope-phone-'+width+'.jpg'),type:'jpeg',quality:92});assert.equal(await page.locator('.circuit-network-scope-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await click('Edit source signal');await generator.screenshot({path:path.join(out,'signals-generator-phone-'+width+'.jpg'),type:'jpeg',quality:92});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}results.scenarios.push('Scope/generator accessibility and full-width layouts at 390/320 pixels');
await exact('Frequency (Hz)',100000);assert.match(await page.locator('.circuit-network-status').innerText(),/too many signal cycles/);assert.equal(await page.getByRole('button',{name:'Export time response CSV',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Export connected measurements CSV',exact:true}).isDisabled(),true);await click('Show up to 3 cycles');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await click('Mixed circuits');await click('Connected circuits');assert.equal(await page.getByLabel('Frequency (Hz) exact value',{exact:true}).inputValue(),'100000');results.scenarios.push('Cycle-budget diagnosis, time-window recovery, and workspace persistence');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'signals24-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
