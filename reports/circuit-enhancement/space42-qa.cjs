
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

const dialog=page.getByRole('dialog',{name:'Expanded 3D circuit workspace',exact:true}),cameraView=page.getByLabel('3D camera view',{exact:true});
const expand=async()=>{await click('Expand 3D workspace');await dialog.waitFor();await settle();};
const collapse=async()=>{await click('Return to workbench');await dialog.waitFor({state:'hidden'});await settle();};
const sample=page.getByLabel('3D calculated sample',{exact:true});
const setSample=async value=>sample.evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
await load('rlc-ring');await seek(.005);await page.locator('[data-hold-sample]').first().click();await click('Orbit 3D board');await settle();
const details=panel.locator('.circuit-network-orbit-camera-details');assert.equal(await details.getAttribute('open'),null);await details.locator('summary').click();assert.equal(await details.getAttribute('open'),'');await click('Tilt up');assert.equal(await cameraView.inputValue(),'custom');await cameraView.selectOption('rear');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.orbit.camera.azimuth),-180);await details.locator('summary').click();await page.waitForFunction(()=>state._circuitNetwork.orbit.cameraControls===false);await cameraView.selectOption('isometric');await shot('space42-inline-desktop');
const original=await stable(),pose=await page.evaluate(()=>state._circuitNetwork.orbit.camera),inlineWidth=(await canvas.boundingBox()).width;
await expand();assert.equal(await dialog.evaluate(d=>d.matches(':modal')),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');assert.equal(await page.evaluate(()=>orbitDisposals),1);assert.equal(await page.evaluate(()=>orbitRenderers[0].info.memory.geometries),0);assert.equal(await stable(),original);assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.orbit.camera),pose);assert.ok((await canvas.boundingBox()).width>inlineWidth);await shot('space42-expanded-desktop');
await page.emulateMedia({reducedMotion:'no-preference'});await click('Resume circuit motion');await click('Play current trails');await settle();const trailPhase=Number(await canvas.getAttribute('data-orbit-flow-phase'));await page.waitForFunction(phase=>Number(document.querySelector('.circuit-network-orbit canvas').dataset.orbitFlowPhase)>phase,trailPhase);await click('Pause current trails');await settle();const idleDraws=await canvas.getAttribute('data-orbit-draws');await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===10)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));assert.equal(await canvas.getAttribute('data-orbit-draws'),idleDraws);await page.emulateMedia({reducedMotion:'reduce'});

await page.getByLabel('3D selected component',{exact:true}).selectOption('3');await page.getByLabel('3D node action',{exact:true}).selectOption('B');await click('Focus selected in 3D');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),3);assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'B');await click('Step current trails');await settle();await shot('space42-inductor-detail');
await page.evaluate(()=>{window.outerEscape=0;window.orbitEscapeWatch=e=>{if(e.key==='Escape')outerEscape++;};document.addEventListener('keydown',orbitEscapeWatch);});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='Expand 3D workspace');assert.equal(await page.evaluate(()=>outerEscape),0);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.evaluate(()=>orbitDisposals),2);assert.equal(await page.evaluate(()=>state._circuitNetwork.selected),3);assert.equal(await page.evaluate(()=>state._circuitNetwork.probeRed),'B');await page.evaluate(()=>document.removeEventListener('keydown',orbitEscapeWatch));await settle();results.scenarios.push('Compact preset selection, custom camera state, persistent disclosure, expanded native modality, larger scene, GPU cleanup, selected/probe/camera/held preservation, Escape isolation and focus restoration');
await expand();await dialog.getByRole('button',{name:'Return to workbench',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await dialog.evaluate(d=>d.contains(document.activeElement)),true);await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(d=>d.contains(document.activeElement)),true);await click('Fit whole board');
const frozen=await page.evaluate(()=>state._circuitNetwork.boardReference),startTime=await page.evaluate(()=>state._circuitNetwork.time);await click('Play 3D response');await page.waitForFunction(t=>state._circuitNetwork.time>t,startTime);await click('Pause 3D response');await click('Next 3D sample');assert.deepEqual(await page.evaluate(()=>state._circuitNetwork.boardReference),frozen);await setSample(0);assert.equal(await page.getByRole('button',{name:'Previous 3D sample',exact:true}).isDisabled(),true);await setSample(Number(await sample.getAttribute('max')));assert.equal(await page.getByRole('button',{name:'Next 3D sample',exact:true}).isDisabled(),true);await collapse();
await load('switch-flyback');await click('Before switch event 1');await expand();assert.match(await panel.locator('.circuit-network-orbit-timeline').innerText(),/before/);await click('Next 3D sample');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.time),.003);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'after');assert.ok(await lever()>.7);await click('Previous 3D sample');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.time),.003);assert.equal(await page.evaluate(()=>state._circuitNetwork.timeSide),'before');assert.equal(await lever(),0);await click('Next 3D sample');await shot('space42-switch-event');await collapse();results.scenarios.push('Shared response playback and exact-sample stepping, bounded first/last navigation, held-reference preservation, and adjacent before/after switch states at one timestamp');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1280,390,320]){
 await page.setViewportSize({width,height:1000});await load('rlc-ring');await seek(.005);await settle();await shot('space42-inline-'+width);
 let audit=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,mode:'inline',violations:audit});assert.deepEqual(audit,[]);
 await expand();await click('Fit whole board');await settle();const overflow=await page.evaluate(()=>{const d=document.querySelector('.circuit-network-orbit-dialog');return {width:innerWidth,page:document.documentElement.scrollWidth,dialog:d.clientWidth,scroll:d.scrollWidth};});assert.ok(overflow.page<=overflow.width+1&&overflow.scroll<=overflow.dialog+1,JSON.stringify(overflow));await shot('space42-expanded-'+width);
 audit=await page.evaluate(async()=>{const r=await axe.run('.circuit-network-orbit-dialog',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});results.axe.push({width,mode:'expanded',violations:audit,overflow});assert.deepEqual(audit,[]);await collapse();
}
await page.setViewportSize({width:1280,height:1000});await expand();await canvas.evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.getByText('3D view unavailable',{exact:true}).waitFor();await click('Retry 3D graphics');await settle();assert.equal(await dialog.evaluate(d=>d.open),true);await collapse();
await page.evaluate(()=>{window.savedShowModal=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){throw new Error('intentional unsupported dialog test');};});await click('Expand 3D workspace');await page.getByText('The expanded view could not open. The inline board is still available.',{exact:true}).waitFor();await page.waitForFunction(()=>document.activeElement?.textContent==='Expand 3D workspace');await settle();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');await page.evaluate(()=>{HTMLDialogElement.prototype.showModal=savedShowModal;});await page.evaluate(()=>document.body.style.setProperty('overflow','auto','important'));await expand();await collapse();assert.equal(await page.evaluate(()=>document.body.style.getPropertyValue('overflow')),'auto');assert.equal(await page.evaluate(()=>document.body.style.getPropertyPriority('overflow')),'important');await page.evaluate(()=>document.body.style.removeProperty('overflow'));results.scenarios.push('Graphics-context retry inside expanded mode and a recoverable failed dialog opening; modal reopening stays available');
results.pageErrors=errors;results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'space42-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
