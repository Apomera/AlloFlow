'use strict';
// Root-only native controlled encounter. Actual input/AI/strike controller and GL;
// existing fish placements and camera are fixtures, never synthetic rigs or scoring.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const arg=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const source=path.resolve(arg('source',path.join(repo,'stem_lab/stem_tool_cephalopodlab.js'))),out=path.resolve(arg('out',''));
assert.ok(out.includes('pass-thirty-five'));assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceSHA=sha(fs.readFileSync(source));assert.equal(sourceSHA,arg('sha',''));
const req=createRequire(path.join(repo,'package.json')),{chromium}=req('playwright');
req('esbuild').buildSync({entryPoints:[path.join(repo,'tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:path.join(out,'harness.generated.cjs'),external:['@playwright/test']});
process.chdir(repo);const {GlHarness,looksBlank}=require(path.join(out,'harness.generated.cjs'));
async function tick(page,dt,codes=[]){await page.evaluate(async({dt,codes})=>{const w=window,before=w.__ticks;w.__codes=codes;w.__step=dt;for(let i=0;i<180&&w.__ticks===before;i++)await new Promise(r=>requestAnimationFrame(r));if(w.__ticks!==before+1)throw Error('Native clock must consume one requested tick');w.__codes=[];}, {dt,codes});}
async function snapshot(page){return page.evaluate(async()=>{
 const w=window,T=w.THREE,root=w.__player;w.__scene.updateMatrixWorld(true);
 const tentacles=[0,1].map(i=>{const m=root.getObjectByName('cl-tentacle-'+i),a=m.geometry.attributes.position,stride=a.count/21;const centers=[];for(let ring=0;ring<=20;ring++){const c=new T.Vector3();for(let j=0;j<stride-1;j++)c.add(new T.Vector3().fromBufferAttribute(a,ring*stride+j));m.localToWorld(c.multiplyScalar(1/(stride-1)));centers.push(c.toArray());}return{centers,positions:Array.from(a.array),normals:Array.from(m.geometry.attributes.normal.array)};});
 const geometry=[];root.traverse(m=>{if(m.isMesh)geometry.push([m.name,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(m.geometry.attributes.position.array),m.isInstancedMesh?Array.from(m.instanceMatrix.array):null]);});
 const geometrySHA=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(geometry))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 let distance=Infinity;const mesh=w.__fish[0].getObjectByName('cl-fish-body');
 for(const limb of tentacles)for(let ring=16;ring<=20;ring++)distance=Math.min(distance,Math.hypot(...limb.centers[ring].map((n,i)=>n-w.__fish[0].position.toArray()[i])));
 const resources=w.__resources.every(r=>r.m.geometry===r.g&&r.m.material===r.mat&&r.attrs.every(a=>a.attr===r.m.geometry.attributes[a.name]&&a.array===a.attr.array)&&r.matrix===r.m.instanceMatrix&&r.matrixArray===r.m.instanceMatrix?.array);
 const rec=w.__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1);
 return{ticks:w.__ticks,paused:w.__paused,player:root.position.toArray(),rotation:root.quaternion.toArray(),fish:w.__fish.slice(0,2).map(f=>({position:f.position.toArray(),alive:f.userData.alive})),successful:w.__toolData.cephalopodLab.huntsSuccessful||0,geometrySHA,tentacles,distalCenterDistance:distance,resourcesRetained:resources,contextLost:rec.ctx.isContextLost(),draws:rec.draws,camera:{position:w.__camera.position.toArray(),quaternion:w.__camera.quaternion.toArray(),fov:w.__camera.fov,aspect:w.__camera.aspect}};
});}
(async()=>{let browser,harness,page;const oldEnv=process.env.STEM_GL_SUBSTITUTE,errors=[],frames=[];try{
 process.env.STEM_GL_SUBSTITUTE='stem_lab/stem_tool_cephalopodlab.js='+source;
 harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:1100},deviceScaleFactor:1});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.THREE?.Clock&&typeof window.__mount==='function');
 await page.evaluate(()=>{const w=window;w.__step=0;w.__ticks=0;w.__paused=false;w.__codes=[];
  function key(code,type='keydown'){document.querySelector('canvas[role=application]').dispatchEvent(new KeyboardEvent(type,{code,key:code==='Escape'?'Escape':code.slice(3).toLowerCase(),bubbles:true,cancelable:true}));}
  function pause(){key('Escape');w.__paused=!w.__paused;const el=[...document.querySelector('canvas[role=application]').parentElement.children].find(el=>el.children.length===3&&el.children[1].textContent==='Paused');if(el)el.style.visibility='hidden';}
  w.THREE.Clock.prototype.getDelta=function(){const dt=w.__step;w.__step=0;if((dt>0&&w.__paused)||(dt===0&&!w.__paused))pause();if(dt>0){w.__codes.forEach(code=>{key(code);key(code,'keyup');});w.__ticks++;queueMicrotask(()=>{if(!w.__paused)pause();});}return dt;};
  w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'humboldtSquid',huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});
 });
 await page.waitForFunction(()=>window.__glRecorder.records.some(r=>r.scene?.getObjectByName('cl-player')&&r.canvas.isConnected&&r.draws>0));
 await page.evaluate(async()=>{const w=window,T=w.THREE;w.__scene=w.__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene;w.__player=w.__scene.getObjectByName('cl-player');w.__fish=w.__scene.children.filter(o=>o.name==='cl-prey-fish'&&o.userData.alive);
  const each=Array.prototype.forEach;Array.prototype.forEach=function(cb,that){if(this.length&&this[0]?.center?.isVector3&&Array.isArray(this[0]?.fish)&&typeof this[0]?.heading==='number')each.call(this,s=>{if(s?.fish?.includes(w.__fish[0]))w.__school=s;});return each.call(this,cb,that);};
  // One zero-delta native frame still uses acquisition/AI when explicitly resumed.
  const canvas=document.querySelector('canvas[role=application]');canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));w.__paused=false;w.__step=.000001;
  try{await new Promise(r=>requestAnimationFrame(r));}finally{Array.prototype.forEach=each;}if(!w.__school)throw Error('Original fish school not found');
  w.__fish.forEach((f,i)=>{f.userData.alive=i<2;f.position.set(25,4,25);});w.__scene.children.forEach(o=>{if(o.userData.alive&&o.userData.cfg){o.position.set(25,.18,25);o.userData.speed=0;}if(o.userData.substrate==='rock'){o.position.set(-18,o.position.y,-18);o.userData.substrateRadius=0;}if('cooldownUntil'in o.userData)o.userData.cooldownUntil=1e9;});
  w.__resources=[];w.__player.traverse(m=>{if(m.isMesh)w.__resources.push({m,g:m.geometry,mat:m.material,attrs:Object.entries(m.geometry.attributes).map(([name,attr])=>({name,attr,array:attr.array})),matrix:m.instanceMatrix,matrixArray:m.instanceMatrix?.array});});
  w.__scene.onBeforeRender=function(renderer,scene,camera){camera.position.copy(w.__player.localToWorld(new T.Vector3(3.5,.85,1.5)));camera.lookAt(w.__player.localToWorld(new T.Vector3(0,.02,-.55)));camera.updateMatrixWorld(true);w.__camera=camera;};
 });
 for(let i=0;i<20;i++)await tick(page,.05);
 await page.evaluate(()=>{const w=window,T=w.THREE;w.__scene.updateMatrixWorld(true);w.__school.center.copy(w.__player.localToWorld(new T.Vector3(0,0,1.2)));[[.5,.2,1.8],[-17,0,12]].forEach((local,i)=>{const world=w.__player.localToWorld(new T.Vector3(...local));w.__fish[i].position.copy(world);w.__fish[i].userData.offset.copy(world).sub(w.__school.center);});});
 await tick(page,.02);await tick(page,.02);await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();
 const rest=await snapshot(page);assert.ok(rest.paused);const times=[0,...Array.from({length:32},(_,i)=>(i+1)*20),650,670];
 await tick(page,.02,['KeyT','KeyE']);let prev=0;
 for(const age of times){if(age)await tick(page,(age-prev)/1000);prev=age;const state=await snapshot(page);assert.ok(state.resourcesRetained);assert.equal(state.contextLost,false);assert.ok(state.tentacles.every(t=>t.positions.every(Number.isFinite)&&t.normals.every(Number.isFinite)));assert.ok(state.paused);let image=null,pixels=null,imageSHA=null;if([0,40,100,160,200,260,400,650,670].includes(age)){image='strike-'+String(age).padStart(3,'0')+'.png';pixels=await harness.glPixels(page);assert.ok(pixels&&!looksBlank(pixels));fs.writeFileSync(path.join(out,image),pixels.png);imageSHA=sha(pixels.png);}frames.push({age,image,imageSHA,state,pixels:pixels?{width:pixels.width,height:pixels.height}:null});fs.writeFileSync(path.join(out,'frames.partial.json'),JSON.stringify({sourceSHA,rest,frames},null,2));if(age%100===0||age===650)console.log('Captured native strike '+age+'ms');}
 const served=await page.evaluate(async()=>{const b=await(await fetch('/stem_lab/stem_tool_cephalopodlab.js')).arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');});assert.equal(served,sourceSHA);
 assert.equal(frames.find(f=>f.age===180).state.fish[0].alive,true);assert.equal(frames.find(f=>f.age===200).state.fish[0].alive,false);assert.equal(frames.at(-1).state.successful,1);assert.equal(frames.at(-1).state.fish[1].alive,true);assert.ok(frames.find(f=>f.age===200).state.distalCenterDistance<.35);
 await harness.unmount(page);const leaks=await harness.leakedAfterUnmount(page);assert.deepEqual(leaks,[]);assert.deepEqual(errors,[]);assert.equal(sha(fs.readFileSync(source)),sourceSHA);
 fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify({sourceSHA,scope:'Native original actors, longer valid reach [0.5,0.2,1.8], controlled fish-school/cover/predator placements, camera-only side fixture, ordinary T/E inputs and Escape pause. Production AI remains active and produces actual 200ms capture; animation sampled every20ms and exactly650. Full GL pixels, geometry and resource identity retained. No FPS or biological-accuracy claim.',rest,frames,errors,leaks},null,2)+'\n');console.log(JSON.stringify({sourceSHA,frames:frames.length,contact:frames.find(f=>f.age===200).state.distalCenterDistance,errors,leaks}));
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({message:e.message,stack:e.stack,errors,frames:frames.length},null,2));throw e;}finally{if(page&&harness)await harness.destroy(page);if(browser)await browser.close();if(harness)await harness.stop();if(oldEnv===undefined)delete process.env.STEM_GL_SUBSTITUTE;else process.env.STEM_GL_SUBSTITUTE=oldEnv;}
})().catch(e=>{console.error(e);process.exitCode=1;});
