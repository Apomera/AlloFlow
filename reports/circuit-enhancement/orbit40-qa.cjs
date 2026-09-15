
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
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
const results={scenarios:[],examples:[],axe:[],resources:[]},panel=page.getByRole('region',{name:'Orbitable 3D circuit board',exact:true}),canvas=panel.locator('canvas');
const click=async name=>page.getByRole('button',{name,exact:true}).click();const load=async id=>{await page.getByLabel('Connected circuit example',{exact:true}).selectOption(id);await click('Load network example');assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true',id);};
const settle=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.circuit-network-orbit canvas')?.dataset.orbitReady==='true');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const stable=()=>page.evaluate(()=>JSON.stringify({components:state._circuitNetwork.components,undo:state._circuitNetwork.undo,redo:state._circuitNetwork.redo,time:state._circuitNetwork.time,timeSide:state._circuitNetwork.timeSide,boardReference:state._circuitNetwork.boardReference}));
const seek=async value=>page.getByLabel('Board time cursor',{exact:true}).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
const shot=async name=>{await settle();await panel.screenshot({path:out+name+'.jpg',type:'jpeg',quality:93});};
const point=async(kind,id)=>page.evaluate(({kind,id})=>{const s=state._circuitNetwork,g=StemLab.circuitNetworkOrbitGeometry(StemLab.circuitNetworkDesign(s)),position=kind==='part'?g.parts.find(p=>p.id===id).center:g.nodes.find(n=>n.id===id).position,v=new THREE.Vector3(position[0],kind==='part'?.23:.15,position[2]).project(orbitCamera),rect=document.querySelector('.circuit-network-orbit canvas').getBoundingClientRect();return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};},{kind,id});
const selectMesh=async(kind,id)=>{const p=await point(kind,id);await page.mouse.click(p.x,p.y);await settle();};
const lever=()=>page.evaluate(()=>{let group;orbitScene.traverse(o=>{if(o.userData.kind==='part'&&o.userData.id===2)group=o;});return group.children.find(c=>c.userData.lever).rotation.z;});
await load('rlc-ring');await seek(.005);await page.locator('[data-hold-sample]').first().click();const electrical=await stable();await click('Orbit 3D board');await settle();assert.equal(await canvas.getAttribute('data-orbit-parts'),'4');assert.equal(await canvas.getAttribute('data-orbit-routes-clear'),'true');assert.ok(Number(await canvas.getAttribute('data-orbit-current-arrows'))>0);await shot('orbit40-rlc-isometric');
for(const view of ['Rear view','Overhead view','Front view','Isometric view']){await click(view);await settle();await selectMesh('part',2);assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),2,view);await page.getByLabel('3D selected component',{exact:true}).selectOption('4');}
await click('Overhead view');await settle();await selectMesh('node','A');assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'A');await click('Inspect network nodes');await page.getByLabel('3D node action',{exact:true}).selectOption('C');assert.equal(await page.evaluate(()=>state._circuitNetwork.inspectNode),'C');await click('Inspect network nodes');
await canvas.focus();const before=await page.evaluate(()=>state._circuitNetwork.orbit.camera.azimuth);await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>state._circuitNetwork.orbit.camera.azimuth),before+15);await page.keyboard.press('Shift+ArrowRight');assert.ok(await page.evaluate(()=>state._circuitNetwork.orbit.camera.targetX)>0);await page.keyboard.press('+');await page.keyboard.press('Home');await page.keyboard.press('f');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.orbit.camera.zoom),2.4);await shot('orbit40-capacitor-detail');assert.equal(await stable(),electrical);results.scenarios.push('Mesh picking after four camera orientations; node picking/probes/inspection; keyboard orbit, pan, zoom, fit and focus preserve the electrical state and held reference');
await click('Fit whole board');await click('Drag to orbit');await settle();const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.7);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:10});await page.mouse.up();await settle();const saved=await page.evaluate(()=>state._circuitNetwork.orbit.camera);assert.notEqual(saved.azimuth,35);await click('Drag to orbit');assert.equal(await canvas.evaluate(c=>getComputedStyle(c).touchAction),'pan-y');await click('3D network board');assert.equal(await page.evaluate(()=>orbitDisposals),1);assert.equal(await page.evaluate(()=>orbitRenderers[0].info.memory.geometries),0);await click('Orbit 3D board');await settle();assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.orbit.camera),saved);results.scenarios.push('Pointer orbit persists its camera; leaving the scene disposes GPU geometry; re-entry restores the view');
await click('Fit whole board');await click('Stored energy');await settle();await shot('orbit40-energy');await click('Node voltages');await shot('orbit40-voltage');await click('Current paths');await click('Lightweight rendering');await settle();assert.equal(await page.evaluate(()=>orbitRenderers.at(-1).shadowMap.enabled),false);assert.equal(await page.evaluate(()=>orbitRenderers.at(-1).getPixelRatio()),1);await click('Lightweight rendering');await click('3D labels');await settle();await click('3D labels');await settle();
const draws=Number(await canvas.getAttribute('data-orbit-draws'));await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===15)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));assert.equal(Number(await canvas.getAttribute('data-orbit-draws')),draws);results.scenarios.push('Shared energy/voltage/current overlays, reduced graphics load and labels; idle scenes do not render continuously');
await load('switch-flyback');await click('Before switch event 1');await settle();assert.equal(await lever(),0);await shot('orbit40-switch-before');await click('After switch event 1');await settle();assert.ok(await lever()>.7);assert.equal(await canvas.getAttribute('data-orbit-time'),'0.003');assert.match(await panel.locator('.circuit-network-orbit-badge').innerText(),/after/);await shot('orbit40-switch-after');results.scenarios.push('Switch lever and 3D timestamp follow exact before/after solver snapshots');
const ids=await page.getByLabel('Connected circuit example',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));for(const id of ids){await load(id);await settle();const expected=await page.evaluate(()=>StemLab.circuitNetworkDesign(state._circuitNetwork).components.length);assert.equal(Number(await canvas.getAttribute('data-orbit-parts')),expected,id);assert.equal(await canvas.getAttribute('data-orbit-routes-clear'),'true',id);const finite=await page.evaluate(()=>{let ok=true;orbitScene.traverse(o=>{if(o.geometry?.attributes.position)for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))ok=false;});return ok;});assert.ok(finite,id);results.examples.push({id,parts:expected,routesClear:true,finite:true});}console.log('All '+ids.length+' example scenes rendered');
await load('rlc-ring');await seek(.01);await settle();const renderer=await page.evaluate(()=>({geometries:orbitRenderers.at(-1).info.memory.geometries,textures:orbitRenderers.at(-1).info.memory.textures}));results.resources.push(renderer);await canvas.evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.getByText('3D view unavailable',{exact:true}).waitFor();await click('Retry 3D graphics');await settle();assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await shot('orbit40-restored');results.scenarios.push('Graphics-context loss reports a recoverable error; retry creates a fresh canvas and preserves the circuit');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await settle();const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));const audit=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,violations:audit,overflow});await shot('orbit40-board-'+width);}
await click('3D network board');await page.evaluate(()=>{window.orbitSavedEngine=THREE;window.THREE=undefined;StemLab.ensureThree=()=>Promise.reject(new Error('intentional offline load test'));});await click('Orbit 3D board');await page.getByText('3D view unavailable',{exact:true}).waitFor();await click('Use projected board');assert.equal(await page.getByRole('region',{name:'Scrollable connected circuit board',exact:true}).count(),1);assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');results.scenarios.push('Asset-loading failure offers the working projected board without losing the model');
results.pageErrors=errors;results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'orbit40-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));assert.deepEqual(errors,[]);assert.ok(results.axe.every(r=>r.violations.length===0),JSON.stringify(results.axe));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
