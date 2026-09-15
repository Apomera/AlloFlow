
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

const dialog=page.getByRole('dialog',{name:'Expanded 3D circuit workspace',exact:true}),meter=panel.locator('.circuit-network-orbit-meter'),red=page.getByLabel('3D red probe node',{exact:true}),black=page.getByLabel('3D black probe node',{exact:true}),layer=page.getByLabel('3D scene layer',{exact:true});
const expand=async()=>{await click('Expand 3D workspace');await dialog.waitFor();await settle();};
const collapse=async()=>{await click('Return to workbench');await dialog.waitFor({state:'hidden'});await settle();};
const openMeter=async()=>{if(await meter.getAttribute('open')===null)await meter.locator('summary').click();await page.waitForFunction(()=>state._circuitNetwork.orbit?.probesOpen===true);};
const use=async d=>{await page.evaluate(d=>setState(prev=>({...prev,_circuitNetwork:{...d,view:'orbit',orbit:{probesOpen:true},boardOverlay:'current'}})),d);await settle();};
const divider={components:[{id:1,type:'voltage',a:'A',b:'0',value:12},{id:2,type:'resistor',a:'A',b:'B',value:200},{id:3,type:'resistor',a:'B',b:'0',value:100}],selected:2,probeRed:'A',probeBlack:'B'};
const expected=()=>page.evaluate(()=>{const stateNow=state._circuitNetwork,run=stateNow.analysis==='time'?StemLab.circuitNetworkTransient(stateNow):null,s=run?StemLab.circuitNetworkFrame(run,stateNow.time,stateNow.timeSide):StemLab.solveNetworkCircuit(stateNow),held=run?StemLab.circuitNetworkHeld(run,stateNow.boardReference):null;return StemLab.circuitNetworkOrbitMeterReading(s,stateNow.probeRed,stateNow.probeBlack,held);});
const assertMeter=async()=>{const value=await expected(),output=meter.locator('[data-orbit-probe-reading]');assert.equal(await meter.getAttribute('data-orbit-meter-status'),value.status);if(value.voltage==null){assert.equal(await output.innerText(),'Undetermined');assert.equal(await output.getAttribute('data-value'),null);}else assert.ok(Math.abs(Number(await output.getAttribute('data-value'))-value.voltage)<1e-10);if(value.hasHeld)for(const key of ['held','delta']){const actual=await meter.locator('[data-orbit-probe-compare='+key+']').getAttribute('data-value'),number=key==='held'?value.heldVoltage:value.delta;assert.equal(actual==null?null:Number(actual),number);}return value;};
await use(divider);await assertMeter();assert.equal((await expected()).voltage,8);await meter.locator('summary').click();await page.waitForFunction(()=>state._circuitNetwork.orbit.probesOpen===false);assert.equal(await meter.locator('[data-orbit-probe-reading]').isVisible(),true);await openMeter();
const original=await stable();await expand();assert.equal(await stable(),original);assert.equal(await meter.getAttribute('open'),'');await click('Swap 3D probes');assert.equal((await assertMeter()).voltage,-8);assert.equal(await page.getByLabel('Network red probe',{exact:true}).inputValue(),'B');assert.equal(await page.getByLabel('Network black probe',{exact:true}).inputValue(),'A');
await click('Probe selected part');assert.equal((await assertMeter()).voltage,8);assert.equal(await page.getByRole('button',{name:'Place 3D red probe',exact:true}).getAttribute('aria-pressed'),'true');
await page.getByLabel('3D camera view',{exact:true}).selectOption('overhead');await click('Place 3D red probe');await settle();await selectMesh('node','0');assert.equal(await red.inputValue(),'0');assert.equal((await assertMeter()).voltage,-4);
await click('Place 3D black probe');await settle();await selectMesh('node','A');assert.equal(await black.inputValue(),'A');assert.equal((await assertMeter()).voltage,-12);
await black.selectOption('0');assert.equal((await assertMeter()).status,'same-node');await red.selectOption('G');assert.equal((await assertMeter()).status,'unknown');assert.match(await meter.innerText(),/unused node/);await click('Probe selected part');
const beforeLayers=await stable(),camera=await page.evaluate(()=>state._circuitNetwork.orbit.camera);await layer.selectOption('voltage');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.boardOverlay),'voltage');assert.equal(await page.getByRole('button',{name:'Node voltages',exact:true}).getAttribute('aria-pressed'),'true');assert.match(await panel.locator('.circuit-network-orbit-layer-legend').innerText(),/relative to 0/);await page.getByLabel('3D camera view',{exact:true}).selectOption('isometric');await click('Fit whole board');await settle();await shot('meter44-voltage-board');await meter.screenshot({path:out+'meter44-divider-instrument.png'});
await layer.selectOption('energy');await settle();assert.match(await panel.locator('.circuit-network-orbit-layer-note').innerText(),/no determined stored-energy/);await layer.selectOption('current');await assertMeter();assert.equal(await stable(),beforeLayers);
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,boardNodeMode:'inspect',inspectNode:'A'}})));await page.waitForFunction(()=>state._circuitNetwork.boardNodeMode==='inspect');assert.equal(await page.getByRole('button',{name:'Place 3D red probe',exact:true}).getAttribute('aria-pressed'),'false');await click('Place 3D black probe');assert.equal(await page.evaluate(()=>state._circuitNetwork.boardNodeMode),'probe');assert.equal(await page.evaluate(()=>state._circuitNetwork.placeLead),'black');
await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Expand 3D workspace');await settle();assert.equal(await meter.getAttribute('open'),'');
results.scenarios.push('Divider polarity, lead reversal, selected-part probing, actual 3D node picking with either lead, same-node zero, unused-node uncertainty, shared overlay changes, inspection exit, disclosure persistence, and modal focus return');
await use({components:[{id:1,type:'voltage',a:'A',b:'B',value:7},{id:2,type:'resistor',a:'A',b:'B',value:1000}],selected:2,probeRed:'A',probeBlack:'B'});await expand();const floating=await assertMeter();assert.equal(floating.voltage,7);assert.equal(floating.status,'floating');for(const potential of await meter.locator('[data-probe-potential]').all())assert.equal(await potential.innerText(),'Undetermined');await layer.selectOption('voltage');await settle();await shot('meter44-floating-board');await meter.screenshot({path:out+'meter44-floating-instrument.png'});await black.selectOption('0');assert.equal((await assertMeter()).voltage,null);await collapse();
results.scenarios.push('A known voltage difference within a floating circuit retains undetermined absolute node voltages; measuring from that section to reference remains unknown');
await load('switch-flyback');await click('Before switch event 1');await page.locator('[data-hold-sample]').first().click();await page.getByLabel('3D selected component',{exact:true}).selectOption('2');await openMeter();await click('Probe selected part');const heldReference=await page.evaluate(()=>state._circuitNetwork.boardReference);await expand();const before=await assertMeter();assert.equal(before.delta,0);await click('Next 3D sample');await settle();const after=await assertMeter();assert.equal(await page.evaluate(()=>state._circuitNetwork.time),.003);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');assert.ok(after.delta!==0);assert.ok(await lever()>.7);await click('Swap 3D probes');const reversed=await assertMeter();assert.equal(reversed.voltage,-after.voltage);assert.equal(reversed.delta,-after.delta);assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.boardReference),heldReference);await layer.selectOption('energy');await settle();assert.match(await panel.locator('.circuit-network-orbit-layer-note').innerText(),/0 J to/);await meter.screenshot({path:out+'meter44-switch-comparison.png'});
await click('Play 3D response');await page.waitForFunction(()=>document.querySelector('[data-orbit-probe-reading]')?.getAttribute('aria-live')==='off');await click('Pause 3D response');await assertMeter();await collapse();results.scenarios.push('Held/current differential readings and signed changes use the same lead pair, preserve switch sides and held references, share response playback, and avoid live-announcement flooding during playback');
await use(divider);await layer.selectOption('voltage');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const [width,height] of [[1280,1000],[390,1000],[320,1000],[844,390]]){
 await page.setViewportSize({width,height});await settle();
 for(const expanded of [false,true]){
  if(expanded)await expand();await openMeter();await click('Fit whole board');await settle();await assertMeter();
  const overflow=await page.evaluate(()=>{const d=document.querySelector('.circuit-network-orbit-dialog');return {width:innerWidth,page:document.documentElement.scrollWidth,dialog:d.open?d.clientWidth:0,scroll:d.open?d.scrollWidth:0};});assert.ok(overflow.page<=overflow.width+1&&overflow.scroll<=overflow.dialog+1,JSON.stringify(overflow));
  const audit=await page.evaluate(async expanded=>{const r=await axe.run(expanded?'.circuit-network-orbit-dialog':'.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));},expanded);results.axe.push({width,height,mode:expanded?'expanded':'inline',violations:audit,overflow});assert.deepEqual(audit,[]);
  if(height===1000)await shot('meter44-'+(expanded?'expanded':'inline')+'-'+width);
  if(expanded&&height===1000)await meter.screenshot({path:out+'meter44-instrument-'+width+'.png'});
  if(height===390)await page.screenshot({path:out+'meter44-'+(expanded?'expanded':'inline')+'-landscape.png'});
  if(expanded)await collapse();
 }
}
results.pageErrors=errors;assert.deepEqual(errors,[]);results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'meter44-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
