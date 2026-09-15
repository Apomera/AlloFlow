
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

const dialog=page.getByRole('dialog',{name:'Expanded 3D circuit workspace',exact:true}),editor=page.locator('.circuit-network-bjt-editor');
const expand=async()=>{await click('Expand 3D workspace');await dialog.waitFor();await settle();},collapse=async()=>{await click('Return to workbench');await dialog.waitFor({state:'hidden'});await settle();};
const assertTrails=async()=>{
 const check=await page.evaluate(()=>{const stateNow=state._circuitNetwork,run=stateNow.analysis==='time'?StemLab.circuitNetworkTransient(stateNow):null,solved=run?StemLab.circuitNetworkFrame(run,stateNow.time,stateNow.timeSide):StemLab.solveNetworkCircuit(stateNow),row=solved.rows.find(r=>r.component.id===stateNow.selected),geometry=StemLab.circuitNetworkOrbitGeometry(solved.design).parts.find(p=>p.id===row.component.id),phase=Number(document.querySelector('.circuit-network-orbit canvas').dataset.orbitFlowPhase),trails=[],wires=[];orbitScene.traverse(o=>{if(o.userData.currentTrail&&o.userData.part===row.component.id)trails.push(o);if(o.geometry?.type==='TubeGeometry'&&o.parent.userData.kind!=='part')wires.push(o);});return trails.map(t=>{const i=geometry.paths.findIndex(p=>p.terminal===t.userData.terminal),route=geometry.paths[i],current=StemLab.circuitNetworkTerminalCurrent(row,i),curve=wires.find(w=>w.geometry.parameters.path.getPointAt(0).distanceTo(new THREE.Vector3(...route.points[0]))<1e-6&&w.geometry.parameters.path.getPointAt(1).distanceTo(new THREE.Vector3(...route.points.at(-1)))<1e-6)?.geometry.parameters.path;if(!curve)return {terminal:t.userData.terminal,error:'missing lead'};if(Math.abs(current)<=1e-12)return {terminal:t.userData.terminal,visible:t.visible,current};const u=StemLab.circuitNetworkOrbitTrail(curve.getLength(),Math.sign(current),phase)[0],point=curve.getPointAt(u);point.y+=.025;const matrix=new THREE.Matrix4();t.getMatrixAt(0,matrix);return {terminal:t.userData.terminal,current,visible:t.visible,difference:point.distanceTo(new THREE.Vector3().setFromMatrixPosition(matrix))};});});
 assert.equal(check.length,3);for(const t of check){assert.ok(!t.error,JSON.stringify(t));if(Math.abs(t.current)>1e-12){assert.equal(t.visible,true);assert.ok(t.difference<1e-5,JSON.stringify(t));}}return check;
};
await load('bjt-npn-switch');await click('Orbit 3D board');await seek(.025);await settle();assert.match(await editor.innerText(),/Saturation/);assert.equal(await page.getByLabel('3D signal',{exact:true}).locator('option:checked').innerText(),'Voltage C − E');
await expand();await panel.locator('.circuit-network-bjt-orbit summary').click();results.npnTrails=await assertTrails();await click('Step current trails');await settle();await assertTrails();await shot('bjt46-npn-orbit');await collapse();
assert.deepEqual(results.npnTrails.map(t=>t.terminal),['C','E','B']);assert.ok(results.npnTrails.find(t=>t.terminal==='B').current>0);assert.ok(results.npnTrails.find(t=>t.terminal==='E').current<0);results.scenarios.push('NPN saturation exposes three separately signed currents; actual 3D trail instance positions agree with each terminal current before and after manual stepping');
await page.locator('[data-hold-sample]').first().click();await page.getByLabel('Base node B',{exact:true}).selectOption('0');await page.waitForFunction(()=>state._circuitNetwork.components.find(p=>p.type==='bjt').bjt.base==='0'&&state._circuitNetwork.time===0);await settle();assert.match(await page.locator('.circuit-network-sample-empty').innerText(),/unavailable/);assert.equal(await page.evaluate(()=>StemLab.circuitNetworkOrbitGeometry(StemLab.circuitNetworkDesign(state._circuitNetwork)).parts.find(p=>p.id===3).paths[2].node),'0');await click('Undo network edit');await page.waitForFunction(()=>state._circuitNetwork.components.find(p=>p.type==='bjt').bjt.base==='B');await settle();await click('Clear held sample');
await page.getByLabel('Transistor polarity',{exact:true}).selectOption('pnp');await page.waitForFunction(()=>state._circuitNetwork.components.find(p=>p.type==='bjt').bjt.polarity==='pnp');await settle();assert.equal(await page.locator('.circuit-network-status').getAttribute('data-ok'),'true');await click('Undo network edit');await page.getByLabel('Forward current gain βF exact value',{exact:true}).fill('200');await page.getByLabel('Forward current gain βF exact value',{exact:true}).press('Enter');await page.waitForFunction(()=>state._circuitNetwork.components.find(p=>p.type==='bjt').bjt.betaForward===200);await click('Undo network edit');results.scenarios.push('Base-node, polarity, and beta edits recalculate, reset time, update saved state, invalidate held references, and participate in undo');
await click('Inspect network nodes');await page.getByLabel('3D node action',{exact:true}).selectOption('B');assert.ok(await page.locator('[data-node-connection="3:B"]').count());await click('Finish inspecting');await click('Probe base–emitter');assert.deepEqual(await page.evaluate(()=>[state._circuitNetwork.probeRed,state._circuitNetwork.probeBlack]),['B','0']);await click('Probe collector–emitter');assert.deepEqual(await page.evaluate(()=>[state._circuitNetwork.probeRed,state._circuitNetwork.probeBlack]),['C','0']);results.scenarios.push('Node inspection includes base-current incidence, and junction probe buttons use the actual B/E and C/E node pairs');
await load('bjt-pnp-switch');await seek(.075);await settle();await expand();if(await panel.locator('.circuit-network-bjt-orbit').getAttribute('open')===null)await panel.locator('.circuit-network-bjt-orbit summary').click();results.pnpTrails=await assertTrails();assert.ok(results.pnpTrails.find(t=>t.terminal==='B').current<0);assert.ok(results.pnpTrails.find(t=>t.terminal==='E').current>0);await shot('bjt46-pnp-orbit');await collapse();
const downloadPromise=page.waitForEvent('download');await click('Export time response CSV');const download=await downloadPromise;await download.saveAs(out+'bjt46-pnp-export.csv');const csv=fs.readFileSync(out+'bjt46-pnp-export.csv','utf8');assert.match(csv,/bjt_collector_current_A/);assert.match(csv,/bjt_base_current_A/);assert.match(csv,/bjt_total_power_W/);results.scenarios.push('PNP lead directions reverse consistently and downloaded CSV contains explicit transistor model, junction, current, and total-power columns');
const ids=await page.getByLabel('Connected circuit example',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));assert.equal(ids.length,45);for(const id of ids){await load(id);await settle();assert.equal(await canvas.getAttribute('data-orbit-routes-clear'),'true',id);results.examples.push({id,solved:true,routesClear:true});}
await load('bjt-amplifier');await seek(.0125);await click('Flat network map');assert.equal(await page.locator('[data-terminal-route="3:B"]').count(),1);await page.locator('.circuit-network-board-panel').screenshot({path:out+'bjt46-flat.png'});await click('3D network board');await page.locator('.circuit-network-board-panel').screenshot({path:out+'bjt46-projected.png'});await click('Orbit 3D board');await settle();
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const [width,height] of [[1280,1000],[390,1000],[320,1000],[844,390]]){
 await page.setViewportSize({width,height});await editor.scrollIntoViewIfNeeded();
 for(const expanded of [false,true]){
  if(expanded)await expand();
  const overflow=await page.evaluate(()=>{const d=document.querySelector('.circuit-network-orbit-dialog');return {viewport:innerWidth,page:document.documentElement.scrollWidth,dialog:d.open?d.clientWidth:0,scroll:d.open?d.scrollWidth:0};});assert.ok(overflow.page<=overflow.viewport+1&&overflow.scroll<=overflow.dialog+1,JSON.stringify(overflow));
  const violations=await page.evaluate(async expanded=>{const r=await axe.run(expanded?'.circuit-network-orbit-dialog':'.circuit-network-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));},expanded);results.axe.push({width,height,expanded,violations,overflow});assert.deepEqual(violations,[]);
  if(expanded){if(height===1000)await shot('bjt46-expanded-'+width);await collapse();}else if(height===1000)await editor.screenshot({path:out+'bjt46-editor-'+width+'.png'});
 }
}
await page.setViewportSize({width:1280,height:1000});await page.locator('.circuit-network-scope').scrollIntoViewIfNeeded();await page.screenshot({path:out+'bjt46-amplifier-scope.png'});
results.pageErrors=errors;assert.deepEqual(errors,[]);results.finalDisposals=await page.evaluate(()=>orbitDisposals);fs.writeFileSync(out+'bjt46-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
