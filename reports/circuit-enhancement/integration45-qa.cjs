
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {PNG}=require('../../node_modules/playwright-core/lib/utilsBundle.js');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement')+path.sep;
(async()=>{
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
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

await page.addScriptTag({path:path.join(root,'vendor/three-r128/three.min.js')});await page.addScriptTag({path:path.join(root,'vendor/three-r128/OrbitControls.js')});
await page.evaluate(()=>{const Constructor=THREE.WebGLRenderer;window.orbitRenderers=[];window.orbitDisposals=0;THREE.WebGLRenderer=function(...args){const r=new Constructor(...args);orbitRenderers.push(r);const render=r.render,dispose=r.dispose;r.render=function(scene,camera){window.orbitScene=scene;window.orbitCamera=camera;return render.call(r,scene,camera);};r.dispose=function(){window.orbitDisposals++;return dispose.call(r);};return r;};});
const results={scenarios:[],examples:[],axe:[],resources:[],pixels:[]},panel=page.getByRole('region',{name:'Orbitable 3D circuit board',exact:true}),canvas=panel.locator('canvas');
const click=async name=>page.getByRole('button',{name,exact:true}).click();const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true',id);};
const settle=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.circuit-network-orbit canvas')?.dataset.orbitReady==='true');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const stable=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,time:state._circuitNetwork.time,timeSide:state._circuitNetwork.timeSide,boardReference:state._circuitNetwork.boardReference}));
const seek=async value=>page.getByLabel('Board time cursor',{exact:true}).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
const shot=async name=>{
 const expanded=await page.locator('.circuit-network-orbit-dialog').evaluate(d=>d.open),target=expanded?page.locator('.circuit-network-orbit-dialog'):panel;
 await panel.locator('.circuit-network-orbit-tools').evaluate(e=>{e.scrollTop=0;});
 if(expanded)await target.evaluate(d=>{d.scrollTop=0;});else await panel.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('.circuit-network-orbit canvas')?.dataset.orbitReady==='true');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 let lit=0,canvasPixels=0,attempts=0,buffer;
 for(;attempts<8;attempts++){
  const box=await target.boundingBox(),size=page.viewportSize(),region={x:Math.max(0,box.x),y:Math.max(0,box.y)};region.width=Math.min(size.width,box.x+box.width)-region.x;region.height=Math.min(size.height,box.y+box.height)-region.y;
  buffer=await page.screenshot({type:'png',clip:region});const png=PNG.sync.read(buffer),rect=await canvas.boundingBox();lit=0;canvasPixels=rect.width*rect.height;
  for(let y=Math.max(0,Math.ceil(rect.y-region.y+4));y<Math.min(png.height,rect.y-region.y+rect.height-4);y++)for(let x=Math.max(0,Math.ceil(rect.x-region.x+4));x<Math.min(png.width,rect.x-region.x+rect.width-4);x++){const i=(y*png.width+x)*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];if(r>15&&g>40&&b>40&&g>r*1.1)lit++;}
  if(lit>canvasPixels*.01)break;
  await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===4)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
 }
 assert.ok(lit>canvasPixels*.01,'Expected rendered board pixels in '+name+', got '+lit);fs.writeFileSync(out+name+'.png',buffer);results.pixels.push({name,lit,canvasPixels,captures:attempts+1,viewportCapture:true});
};
const point=async(kind,id)=>page.evaluate(({kind,id})=>{const s=state._circuitNetwork,g=StemLab.circuitNetworkOrbitGeometry(StemLab.circuitNetworkDesign(s)),position=kind==='part'?g.parts.find(p=>p.id===id).center:g.nodes.find(n=>n.id===id).position,v=new THREE.Vector3(position[0],kind==='part'?.23:.15,position[2]).project(orbitCamera),rect=document.querySelector('.circuit-network-orbit canvas').getBoundingClientRect();return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};},{kind,id});
const selectMesh=async(kind,id)=>{const p=await point(kind,id);await page.mouse.click(p.x,p.y);await settle();};
const lever=()=>page.evaluate(()=>{let group;orbitScene.traverse(o=>{if(o.userData.kind==='part'&&o.userData.id===2)group=o;});return group.children.find(c=>c.userData.lever).rotation.z;});

const method=page.getByLabel('Time-response integration method',{exact:true}),methodPanel=page.getByRole('region',{name:'Time-response numerical method',exact:true});
await load('lc-energy');assert.equal(await method.inputValue(),'trapezoidal');await click('Orbit 3D board');await settle();
const energyText=await page.locator('[data-integration-energy]').innerText();assert.match(energyText,/99\.999%/);await seek(.08);await page.locator('[data-hold-sample]').first().click();assert.ok(await page.evaluate(()=>state._circuitNetwork.boardReference));await click('Play time response');const before=await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,selected:state._circuitNetwork.selected,view:state._circuitNetwork.view}));await method.selectOption('backward-euler');await page.waitForFunction(()=>state._circuitNetwork.time===0);await page.getByRole('button',{name:'Play time response',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,selected:state._circuitNetwork.selected,view:state._circuitNetwork.view})),before);assert.match(await page.locator('.circuit-network-sample-empty').innerText(),/integration method/);assert.match(await page.locator('[data-integration-energy]').innerText(),/87\.924%/);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>state._circuitNetwork.time),0);await click('Clear held sample');
results.scenarios.push('Method changes stop playback, restart at zero, invalidate the held sample, preserve circuit edits/selection/3D view, and show measured LC energy retention for each method');
await method.selectOption('trapezoidal');await method.focus();await page.keyboard.press('ArrowUp');await page.waitForFunction(()=>state._circuitNetwork.integration==='backward-euler');await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>state._circuitNetwork.integration==='trapezoidal');await click('DC equilibrium');assert.equal(await method.count(),0);await click('Time response');assert.equal(await method.inputValue(),'trapezoidal');results.scenarios.push('Native keyboard method selection and DC/time mode persistence');
await load('switch-flyback');await click('Before switch event 1');const eventBefore=await page.evaluate(()=>{const r=StemLab.circuitNetworkTransient(state._circuitNetwork),f=StemLab.circuitNetworkFrame(r,state._circuitNetwork.time,state._circuitNetwork.timeSide);return {current:f.rows.find(r=>r.component.type==='inductor').current,time:f.time,side:f.side};});await click('After switch event 1');const eventAfter=await page.evaluate(()=>{const r=StemLab.circuitNetworkTransient(state._circuitNetwork),f=StemLab.circuitNetworkFrame(r,state._circuitNetwork.time,state._circuitNetwork.timeSide);return {current:f.rows.find(r=>r.component.type==='inductor').current,time:f.time,side:f.side};});assert.equal(eventBefore.time,eventAfter.time);assert.ok(Math.abs(eventBefore.current-eventAfter.current)<1e-12);assert.equal(eventAfter.side,'after');results.scenarios.push('Exact before/after switch sampling remains available with trapezoidal integration');
const downloadPromise=page.waitForEvent('download');await click('Export time response CSV');const download=await downloadPromise;await download.saveAs(out+'integration45-switch-export.csv');const csv=fs.readFileSync(out+'integration45-switch-export.csv','utf8');assert.match(csv,/requested_integration,integration_restart/);assert.match(csv,/trapezoidal_step_doubling/);assert.match(csv,/switch_event/);results.scenarios.push('Downloaded response CSV records requested/actual methods and switch restart provenance');
await load('opamp-bandwidth');assert.match(await methodPanel.innerText(),/Timed op-amps retain backward Euler/);assert.match(await methodPanel.innerText(),/No capacitor or inductor/);
const ids=await page.getByLabel('Connected circuit example',{exact:true}).locator('option').evaluateAll(elements=>elements.map(e=>e.value));for(const id of ids){await load(id);if(await method.count())assert.equal(await method.inputValue(),'trapezoidal');results.examples.push({id,solved:await page.locator('.circuit-network-status').getAttribute('data-ok')==='true'});}assert.equal(ids.length,40);
await load('lc-energy');await methodPanel.locator('summary').click();await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const [width,height] of [[1280,1000],[390,1000],[320,1000],[844,390]]){
 await page.setViewportSize({width,height});await methodPanel.scrollIntoViewIfNeeded();
 const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(overflow.document<=overflow.viewport+1,JSON.stringify(overflow));
 const violations=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,height,violations,overflow});assert.deepEqual(violations,[]);
 await methodPanel.screenshot({path:out+'integration45-method-'+width+'.png'});
 if(height===1000){await settle();await click('Expand 3D workspace');await settle();await shot('integration45-orbit-'+width);await click('Return to workbench');await settle();}
}
await page.setViewportSize({width:1280,height:1000});await methodPanel.locator('summary').click();await methodPanel.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:out+'integration45-workbench.png'});
results.pageErrors=errors;assert.deepEqual(errors,[]);results.energy={trapezoidal:energyText,backwardEuler:'87.924%'};results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'integration45-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
