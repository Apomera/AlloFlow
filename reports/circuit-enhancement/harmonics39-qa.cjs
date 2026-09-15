
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement')+path.sep;
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











const results={scenarios:[],examples:[],axe:[]},panel=page.getByRole('region',{name:'Harmonic explorer',exact:true}),board=page.getByRole('region',{name:'Scrollable connected circuit board',exact:true});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true',id);};
const stable=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,time:state._circuitNetwork.time,timeSide:state._circuitNetwork.timeSide,boardReference:state._circuitNetwork.boardReference}));
const measurement=()=>page.evaluate(()=>{const s=state._circuitNetwork;const run=StemLab.circuitNetworkTransient(s);return StemLab.circuitNetworkHarmonics(run,s.selected,s.scopeSpectrum.metric||'voltage',s.scopeSpectrum.referenceId||s.scopeSource,s.scopeSpectrum);});
await load('harmonic-triangle');await panel.waitFor();assert.equal(await panel.locator('[data-harmonic-order]').count(),12);const original=await stable();
await panel.locator('[data-harmonic-order="3"]').focus();await page.keyboard.press('Enter');assert.equal(await panel.locator('[data-harmonic-order="3"]').getAttribute('aria-pressed'),'true');
await click('Isolate selected harmonic');assert.match(await panel.locator('figcaption').innerText(),/DC \+ H3/);await panel.screenshot({path:out+'harmonics39-triangle-isolated.jpg',type:'jpeg',quality:93});
await click('Sum measured harmonics');await click('Log amplitude');assert.equal(await page.evaluate(()=>state._circuitNetwork.scopeSpectrum.scale),'db');assert.match(await panel.innerText(),/one tenth/);await panel.screenshot({path:out+'harmonics39-triangle-log.jpg',type:'jpeg',quality:93});await click('Linear amplitude');assert.equal(await stable(),original);await panel.screenshot({path:out+'harmonics39-triangle-sum.jpg',type:'jpeg',quality:93});
await page.getByLabel('Harmonic trace',{exact:true}).selectOption('current');let m=await measurement();assert.ok(m.rows[0].peak>.0024&&m.rows[0].peak<.0025);await page.getByLabel('Harmonic trace',{exact:true}).selectOption('voltage');
await page.getByLabel('Harmonic cycle count',{exact:true}).selectOption('2');m=await measurement();assert.ok(Math.abs(m.start-.1)<1e-12);await click('Show interval in scope');assert.ok(Math.abs(await page.evaluate(()=>state._circuitNetwork.scopeView.start)-1/3)<1e-12);
await page.getByLabel('Harmonic cycle count',{exact:true}).selectOption('8');assert.match(await panel.innerText(),/shorter than 8/);assert.equal(await panel.locator('[data-harmonic-order]').count(),0);assert.equal(await panel.getByRole('button',{name:'Export harmonics CSV',exact:true}).count(),0);
await page.getByLabel('Harmonic cycle count',{exact:true}).selectOption('1');await page.getByLabel('Highest harmonic order',{exact:true}).selectOption('4');assert.equal(await panel.locator('[data-harmonic-order]').count(),4);await page.getByLabel('Highest harmonic order',{exact:true}).selectOption('12');
await click('Hide harmonic explorer');assert.equal(await panel.locator('[data-harmonic-order]').count(),0);await click('Open harmonic explorer');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Harmonic explorer');assert.equal(await page.getByLabel('Highest harmonic order',{exact:true}).inputValue(),'12');
const downloadPromise=page.waitForEvent('download');await click('Export harmonics CSV');const download=await downloadPromise;await download.saveAs(out+'harmonics39-export.csv');const csv=fs.readFileSync(out+'harmonics39-export.csv','utf8');assert.match(csv,/piecewise_linear_fourier_integral/);assert.equal(csv.trim().split('\n').length,13);results.scenarios.push('Keyboard harmonic selection; isolated and summed reconstructions; voltage/current; cycle bounds; independent scope focus; saved controls; SI download');
for(const id of ['harmonic-triangle','harmonic-clipping','harmonic-smoothing']){await load(id);assert.equal(await page.locator('[data-route-clear="false"]').count(),0);m=await measurement();assert.equal(m.supported,12);results.examples.push({id,rows:m.rows.length,thdPercent:m.thdPercent,routeClear:true});await panel.screenshot({path:out+'harmonics39-'+id+'.jpg',type:'jpeg',quality:93});}
await load('harmonic-clipping');const clipped=await measurement();assert.ok(clipped.thdPercent>20);await page.getByLabel('Board component',{exact:true}).selectOption('1');const clean=await measurement();assert.ok(clean.thdPercent<.01);results.scenarios.push('Clipped amplifier adds harmonic content while its sine input stays clean');
await load('harmonic-smoothing');const filtered=await measurement();await page.getByLabel('Board component',{exact:true}).selectOption('1');const input=await measurement();assert.ok(filtered.rows[4].peak/input.rows[4].peak < filtered.rows[0].peak/input.rows[0].peak);await page.getByLabel('Board component',{exact:true}).selectOption('3');results.scenarios.push('Pulse filter reduces the fifth harmonic more strongly than the base frequency');
await page.getByRole('button',{name:'DC equilibrium',exact:true}).click();assert.equal(await panel.count(),0);await click('Time response');assert.equal(await panel.locator('[data-harmonic-order]').count(),12);results.scenarios.push('DC/time switching restores the saved harmonic workflow');
await load('harmonic-triangle');await page.getByText('Read the values and method',{exact:true}).click();await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));const audit=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,violations:audit,overflow});await page.getByText('Read the values and method',{exact:true}).click();await panel.screenshot({path:out+'harmonics39-explorer-'+width+'.jpg',type:'jpeg',quality:93});await page.getByText('Read the values and method',{exact:true}).click();}
const geometry=await page.evaluate(()=>{const ids=[...document.querySelectorAll('linearGradient[id],radialGradient[id],clipPath[id]')].map(x=>x.id);return {invalidPaths:[...document.querySelectorAll('path[d]')].filter(p=>/NaN|Infinity/.test(p.getAttribute('d'))).length,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i)};});assert.equal(geometry.invalidPaths,0);assert.deepEqual(geometry.duplicateIds,[]);results.geometry=geometry;results.pageErrors=errors;assert.deepEqual(errors,[]);fs.writeFileSync(out+'harmonics39-browser-results.json',JSON.stringify(results,null,2));assert.ok(results.axe.every(r=>r.violations.length===0),JSON.stringify(results.axe));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
