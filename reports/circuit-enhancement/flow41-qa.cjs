
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
 await settle();let lit=0,canvasPixels=0,attempts=0,buffer;
 for(;attempts<8;attempts++){
  buffer=await panel.screenshot({type:'png'});const png=PNG.sync.read(buffer),rect=await canvas.boundingBox(),region=await panel.boundingBox();lit=0;canvasPixels=rect.width*rect.height;
  for(let y=Math.ceil(rect.y-region.y+4);y<Math.min(png.height,rect.y-region.y+rect.height-4);y++)for(let x=Math.ceil(rect.x-region.x+4);x<Math.min(png.width,rect.x-region.x+rect.width-4);x++){const i=(y*png.width+x)*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];if(r>15&&g>40&&b>40&&g>r*1.1)lit++;}
  if(lit>canvasPixels*.01)break;
  await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===4)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
 }
 assert.ok(lit>canvasPixels*.01,'Expected rendered board pixels in '+name+', got '+lit);fs.writeFileSync(out+name+'.png',buffer);results.pixels.push({name,lit,canvasPixels,captures:attempts+1});
};
const point=async(kind,id)=>page.evaluate(({kind,id})=>{const s=state._circuitNetwork,g=StemLab.circuitNetworkOrbitGeometry(StemLab.circuitNetworkDesign(s)),position=kind==='part'?g.parts.find(p=>p.id===id).center:g.nodes.find(n=>n.id===id).position,v=new THREE.Vector3(position[0],kind==='part'?.23:.15,position[2]).project(orbitCamera),rect=document.querySelector('.circuit-network-orbit canvas').getBoundingClientRect();return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};},{kind,id});
const selectMesh=async(kind,id)=>{const p=await point(kind,id);await page.mouse.click(p.x,p.y);await settle();};
const lever=()=>page.evaluate(()=>{let group;orbitScene.traverse(o=>{if(o.userData.kind==='part'&&o.userData.id===2)group=o;});return group.children.find(c=>c.userData.lever).rotation.z;});
await load('rlc-ring');await seek(.005);await page.locator('[data-hold-sample]').first().click();const electrical=await stable();await click('Orbit 3D board');await settle();assert.equal(await canvas.getAttribute('data-orbit-parts'),'4');assert.equal(await canvas.getAttribute('data-orbit-routes-clear'),'true');assert.ok(Number(await canvas.getAttribute('data-orbit-current-arrows'))>0);await shot('flow41-rlc-isometric');
for(const view of ['Rear view','Overhead view','Front view','Isometric view']){await click(view);await settle();await selectMesh('part',2);assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),2,view);await page.getByLabel('3D selected component',{exact:true}).selectOption('4');}
await click('Overhead view');await settle();await selectMesh('node','A');assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'A');await click('Inspect network nodes');await page.getByLabel('3D node action',{exact:true}).selectOption('C');assert.equal(await page.evaluate(()=>state._circuitNetwork.inspectNode),'C');await click('Inspect network nodes');
await canvas.focus();const before=await page.evaluate(()=>state._circuitNetwork.orbit.camera.azimuth);await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>state._circuitNetwork.orbit.camera.azimuth),before+15);await page.keyboard.press('Shift+ArrowRight');assert.ok(await page.evaluate(()=>state._circuitNetwork.orbit.camera.targetX)>0);await page.keyboard.press('+');await page.keyboard.press('Home');await page.keyboard.press('f');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.orbit.camera.zoom),2.4);await shot('flow41-capacitor-detail');assert.equal(await stable(),electrical);results.scenarios.push('Mesh picking after four camera orientations; node picking/probes/inspection; keyboard orbit, pan, zoom, fit and focus preserve the electrical state and held reference');
await click('Fit whole board');await click('Drag to orbit');await settle();const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.7);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:10});await page.mouse.up();await settle();const saved=await page.evaluate(()=>state._circuitNetwork.orbit.camera);assert.notEqual(saved.azimuth,35);await click('Drag to orbit');assert.equal(await canvas.evaluate(c=>getComputedStyle(c).touchAction),'pan-y');await click('3D network board');assert.equal(await page.evaluate(()=>orbitDisposals),1);assert.equal(await page.evaluate(()=>orbitRenderers[0].info.memory.geometries),0);await click('Orbit 3D board');await settle();assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.orbit.camera),saved);results.scenarios.push('Pointer orbit persists its camera; leaving the scene disposes GPU geometry; re-entry restores the view');
await click('Fit whole board');await click('Stored energy');await settle();await shot('flow41-energy');await click('Node voltages');await shot('flow41-voltage');await click('Current paths');await click('Lightweight rendering');await settle();assert.equal(await page.evaluate(()=>orbitRenderers.at(-1).shadowMap.enabled),false);assert.equal(await page.evaluate(()=>orbitRenderers.at(-1).getPixelRatio()),1);await click('Lightweight rendering');await click('3D labels');await settle();await click('3D labels');await settle();
const draws=Number(await canvas.getAttribute('data-orbit-draws'));await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===15)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));assert.equal(Number(await canvas.getAttribute('data-orbit-draws')),draws);results.scenarios.push('Shared energy/voltage/current overlays, reduced graphics load and labels; idle scenes do not render continuously');

const frames=async n=>page.evaluate(n=>new Promise(resolve=>{const tick=()=>{if(--n<=0)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),n);
const trails=()=>page.evaluate(()=>{const list=[];orbitScene.traverse(o=>{if(o.userData.currentTrail)list.push({part:o.userData.part,terminal:o.userData.terminal,visible:o.visible,count:o.count,matrices:Array.from(o.instanceMatrix.array)});});return list;});
const phase=async()=>Number(await canvas.getAttribute('data-orbit-flow-phase'));
const setFlow=async value=>{await page.getByLabel('3D current trails',{exact:true}).selectOption(value);await settle();};
const flowElectrical=await stable();assert.equal(await page.getByRole('button',{name:'Play current trails',exact:true}).isDisabled(),true);assert.match(await panel.locator('.circuit-network-orbit-flow-note').innerText(),/Reduced motion/);
await click('Step current trails');await settle();const stepped=await phase();assert.ok(stepped>0);const frozen=await trails();await frames(8);assert.deepEqual(await trails(),frozen);assert.equal(await stable(),flowElectrical);assert.ok(frozen.filter(t=>t.visible).every(t=>t.part===4));
await page.getByRole('button',{name:'Step current trails',exact:true}).focus();await page.keyboard.press('Enter');await settle();assert.ok(await phase()>stepped);await shot('flow41-selected-trails');
await setFlow('all');let visibleTrails=(await trails()).filter(t=>t.visible);assert.ok(visibleTrails.length>2);await shot('flow41-all-trails');
await click('Inspect network nodes');await page.getByLabel('3D node action',{exact:true}).selectOption('C');await settle();visibleTrails=(await trails()).filter(t=>t.visible);assert.ok(visibleTrails.length>0);const incident=await page.evaluate(()=>StemLab.circuitNetworkDesign(state._circuitNetwork).components.flatMap(p=>['a','b'].filter(t=>p[t]==='C').map(t=>p.id+':'+t.toUpperCase())));assert.ok(visibleTrails.every(t=>incident.includes(t.part+':'+t.terminal)));await click('Inspect network nodes');
await setFlow('off');assert.equal(Number(await canvas.getAttribute('data-orbit-trails')),0);assert.equal(await page.getByRole('button',{name:'Step current trails',exact:true}).isDisabled(),true);await setFlow('selected');
await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Resume circuit motion',exact:true}).waitFor();await click('Resume circuit motion');await click('Play current trails');await settle();let playingPhase=await phase();await frames(10);assert.ok(await phase()>playingPhase);assert.equal(await stable(),flowElectrical);assert.equal(await canvas.getAttribute('data-orbit-flow-playing'),'true');
await page.evaluate(()=>scrollTo(0,0));await frames(6);const hiddenPhase=await phase(),hiddenDraws=await canvas.getAttribute('data-orbit-draws');await frames(10);assert.equal(await phase(),hiddenPhase);assert.equal(await canvas.getAttribute('data-orbit-draws'),hiddenDraws);await settle();await frames(6);assert.ok(await phase()>hiddenPhase);
await click('Pause current trails');await settle();let pausedPhase=await phase();await frames(8);assert.equal(await phase(),pausedPhase);
await click('Play current trails');await settle();await page.emulateMedia({reducedMotion:'reduce'});await settle();assert.equal(await page.getByRole('button',{name:'Play current trails',exact:true}).isDisabled(),true);pausedPhase=await phase();await frames(8);assert.equal(await phase(),pausedPhase);await page.emulateMedia({reducedMotion:'no-preference'});await settle();assert.equal(await canvas.getAttribute('data-orbit-flow-playing'),'false');await frames(6);assert.equal(await phase(),pausedPhase);
await click('Play current trails');await settle();await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,pauseMotion:true}})));await settle();assert.equal(await canvas.getAttribute('data-orbit-flow-playing'),'false');assert.equal(await page.getByRole('button',{name:'Play current trails',exact:true}).isDisabled(),true);await click('Step current trails');await settle();assert.ok(await phase()>pausedPhase);assert.equal(await stable(),flowElectrical);
results.scenarios.push('Trail stepping via pointer and keyboard, selected/all/off filtering, node incidence, playback at a fixed held snapshot, offscreen suspension, explicit pause, live reduced-motion changes, and global motion pause');
await page.emulateMedia({reducedMotion:'reduce'});
const signSamples=await page.evaluate(()=>{const run=StemLab.circuitNetworkTransient(state._circuitNetwork);return [-1,1].map(sign=>{const frame=run.frames.find(f=>f.rows.find(r=>r.component.id===4).current*sign>.01);return {sign,time:frame.time};});});
for(const sample of signSamples){await seek(sample.time);await settle();const reading=await panel.locator('.circuit-network-orbit-flow-reading').innerText();assert.ok(reading.includes(sample.sign>0?'A → component → B':'B → component → A'));assert.ok(Number(await canvas.getAttribute('data-orbit-trails'))>0);await click('Step current trails');await settle();}
await shot('flow41-current-reversal');results.scenarios.push('RLC current reversal follows actual positive and negative calculated snapshots');
await load('switch-flyback');await click('Before switch event 1');await settle();assert.equal(await lever(),0);await shot('flow41-switch-before');await click('After switch event 1');await settle();assert.ok(await lever()>.7);assert.equal(await canvas.getAttribute('data-orbit-time'),'0.003');assert.match(await panel.locator('.circuit-network-orbit-badge').innerText(),/after/);await shot('flow41-switch-after');results.scenarios.push('Switch lever and 3D timestamp follow exact before/after solver snapshots');

await page.getByLabel('3D selected component',{exact:true}).selectOption('2');await settle();assert.equal(Number(await canvas.getAttribute('data-orbit-trails')),0);assert.match(await panel.locator('.circuit-network-orbit-flow-reading').innerText(),/Zero current/);
await page.getByLabel('3D selected component',{exact:true}).selectOption('4');await settle();assert.ok(Number(await canvas.getAttribute('data-orbit-trails'))>0);assert.match(await panel.locator('.circuit-network-orbit-flow-reading').innerText(),/Delivering electrical energy/);await shot('flow41-flyback-reading');
const savedFlowState=await page.evaluate(()=>state._circuitNetwork);
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,analysis:'dc',selected:1,components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'voltage',a:'A',b:'0',value:5},{id:3,type:'resistor',a:'A',b:'0',value:1000}]}})));await settle();assert.equal(await panel.locator('.circuit-network-orbit-flow-reading').getAttribute('data-flow-status'),'unknown');assert.equal(Number(await canvas.getAttribute('data-orbit-trails')),0);await page.getByLabel('3D selected component',{exact:true}).selectOption('3');await settle();assert.ok(Number(await canvas.getAttribute('data-orbit-trails'))>0);
await page.evaluate(()=>setState(prev=>({...prev,_circuitNetwork:{...prev._circuitNetwork,selected:1,components:[{id:1,type:'voltage',a:'A',b:'0',value:2},{id:2,type:'voltage',a:'A',b:'0',value:5}]}})));await settle();assert.equal(await panel.locator('.circuit-network-orbit-flow-reading').getAttribute('data-flow-status'),'unknown');assert.equal(Number(await canvas.getAttribute('data-orbit-trails')),0);assert.equal(await canvas.getAttribute('data-orbit-current-arrows'),'0');
await page.evaluate(saved=>setState(prev=>({...prev,_circuitNetwork:saved})),savedFlowState);await settle();results.scenarios.push('Open switch hides trails; inductor flyback shows returning energy; ambiguous ideal-source current and failed solves do not invent a trail');

const ids=await page.getByLabel('Connected circuit example',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));for(const id of ids){await load(id);await settle();const expected=await page.evaluate(()=>StemLab.circuitNetworkDesign(state._circuitNetwork).components.length);assert.equal(Number(await canvas.getAttribute('data-orbit-parts')),expected,id);assert.equal(await canvas.getAttribute('data-orbit-routes-clear'),'true',id);const finite=await page.evaluate(()=>{let ok=true;orbitScene.traverse(o=>{if(o.isInstancedMesh)for(const n of o.instanceMatrix.array)if(!Number.isFinite(n))ok=false;if(o.geometry?.attributes.position)for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))ok=false;});return ok;});assert.ok(finite,id);results.examples.push({id,parts:expected,routesClear:true,finite:true});}console.log('All '+ids.length+' example scenes rendered');
await load('rlc-ring');await seek(.01);await settle();const renderer=await page.evaluate(()=>({geometries:orbitRenderers.at(-1).info.memory.geometries,textures:orbitRenderers.at(-1).info.memory.textures}));results.resources.push(renderer);await canvas.evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.getByText('3D view unavailable',{exact:true}).waitFor();await click('Retry 3D graphics');await settle();assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await shot('flow41-restored');results.scenarios.push('Graphics-context loss reports a recoverable error; retry creates a fresh canvas and preserves the circuit');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await settle();const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));const audit=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,violations:audit,overflow});await shot('flow41-board-'+width);}
await click('3D network board');await page.evaluate(()=>{window.orbitSavedEngine=THREE;window.THREE=undefined;StemLab.ensureThree=()=>Promise.reject(new Error('intentional offline load test'));});await click('Orbit 3D board');await page.getByText('3D view unavailable',{exact:true}).waitFor();await click('Use projected board');assert.equal(await page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}).count(),1);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');results.scenarios.push('Asset-loading failure offers the working projected board without losing the model');
results.pageErrors=errors;results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'flow41-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));assert.deepEqual(errors,[]);assert.ok(results.axe.every(r=>r.violations.length===0),JSON.stringify(results.axe));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
