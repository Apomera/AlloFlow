import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';
const baselineMode=process.env.ECOLOGY_CAPTURE_BASELINE==='1',reportDir=process.env.ECOLOGY_REPORT_DIR||'reports/ecosystem-naturalism-next';
function exact(actual:any,expected:any){
  if(typeof expected==='number'){expect(typeof actual).toBe('number');expect(actual===expected).toBe(true);}
  else if(Array.isArray(expected)){expect(Array.isArray(actual)).toBe(true);expect(actual.length).toBe(expected.length);expected.forEach((value:any,k:number)=>exact(actual[k],value));}
  else if(expected&&typeof expected==='object'){expect(actual).not.toBeNull();expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());for(const key of Object.keys(expected))exact(actual[key],expected[key]);}
  else expect(actual).toBe(expected);
}
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
  probes:'THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;window.__crossFixRenderer=renderer;renderer.render=function(scene,camera){var result=render.apply(this,arguments);window.__crossFixCamera=camera;if(window.__captureCrossFix)window.__captureCrossFix(scene,camera);return result;};return renderer;}});'});
test.describe.configure({timeout:420_000,retries:0});test.use({trace:'off',video:'off'});
test.beforeAll(async()=>{await mkdir(reportDir,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{const errors=await page.evaluate(()=>{const w=window as any;w.__captureCrossFix=null;if(w.__crossFixOriginalRaf){window.requestAnimationFrame=w.__crossFixOriginalRaf;w.__crossFixOriginalRaf=null;}return w.__events?.errors||[];});await harness.destroy(page);expect(errors).toEqual([]);});
async function seek(page:Page,step:number){const meadow=page.locator('[data-efw-meadow]');await meadow.getByLabel('Meadow timeline',{exact:true}).fill(String(step));await expect(meadow.locator('canvas')).toHaveAttribute('data-step',String(step));}
async function rig(page:Page,step:number,reduced=false){
  return page.evaluate(({step,reduced})=>{
    const w=window as any,api=w.StemLab.ecosystemFoodWeb,hit=w.__glCanvas('[data-efw-meadow]'),scene=hit.rec.scene,camera=w.__crossFixCamera,pose=w.__crossFixFrames[step].foxes[6],animals=scene.children.filter((node:any)=>node.userData.headSurface?.name==='eco-foxes-head-surface'),root=animals[6],d=root.userData;
    function shown(part:any){for(let node=part;node;node=node.parent)if(!node.visible)return false;return true;}
    function drawError(part:any){const batch=scene.children.find((node:any)=>node.isInstancedMesh&&node.userData.parts?.includes(part));if(!batch)return null;const slot=batch.userData.parts.filter(shown).indexOf(part),matrix=new w.THREE.Matrix4();batch.getMatrixAt(slot,matrix);return slot<0||slot>=batch.count?null:Math.max(...matrix.elements.map((value:number,k:number)=>Math.abs(value-part.matrixWorld.elements[k])));}
    function geometry(part:any){const g=part.geometry,attributes:any={};for(const key of ['position','normal','uv','color']){const a=g.getAttribute(key);if(a)attributes[key]=Array.from(a.array);}const text=JSON.stringify({attributes,index:g.index?Array.from(g.index.array):null});let hash=2166136261;for(let k=0;k<text.length;k++)hash=Math.imul(hash^text.charCodeAt(k),16777619);return {hash:(hash>>>0).toString(16),vertices:g.getAttribute('position').count,triangles:g.index?g.index.count/3:0};}
    const eyes=d.eyeGroups.map((eye:any)=>({side:eye.userData.side,expected:api.foxEyeFixation(pose,eye.userData.side,reduced),applied:eye.userData.eyeFixation,layers:Object.fromEntries(Object.entries(eye.userData.fixationLayers).map(([name,part]:any)=>[name,{position:part.position.toArray(),drawError:drawError(part)}]))}));
    const fixedEyes=d.eyeGroups.map((eye:any)=>({group:eye.matrix.toArray(),globe:eye.children[1].matrix.toArray(),globeGeometry:geometry(eye.children[1]),layers:Object.fromEntries(Object.entries(eye.userData.fixationLayers).map(([name,part]:any)=>[name,{geometry:geometry(part),material:{roughness:part.material.roughness,map:!!part.material.map,color:part.material.color.toArray(),ocular:!!part.material.userData.ecoOcularSurface}}]))}));
    const fixed={root:{position:root.position.toArray(),rotation:root.rotation.toArray(),scale:root.scale.toArray()},body:d.body.matrix.toArray(),head:d.head.matrix.toArray(),ears:d.ears.map((ear:any)=>ear.matrix.toArray()),feet:d.legs.map((leg:any)=>{const paw=leg.userData.rig.paw.children.find((part:any)=>part.isMesh);return {world:paw.matrixWorld.toArray(),plant:pose.footPlants[d.legs.indexOf(leg)]};}),source:{position:animals[1].position.toArray(),rotation:animals[1].rotation.toArray()},camera:{world:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()},eyes:fixedEyes,resources:{geometries:w.__crossFixRenderer.info.memory.geometries,textures:w.__crossFixRenderer.info.memory.textures,programs:w.__crossFixRenderer.info.programs.length,eyeGroups:d.eyeGroups.length,layers:d.eyeGroups.reduce((n:number,eye:any)=>n+Object.keys(eye.userData.fixationLayers).length,0),sharedLayerGeometries:new Set(d.eyeGroups.flatMap((eye:any)=>Object.values(eye.userData.fixationLayers).map((part:any)=>part.geometry.uuid))).size}};
    return {step,eyeAim:pose.eyeAim,eyeOpen:api.mammalArticulation('foxes',pose,reduced).eyeOpen,look:pose.crossingLook,stage:pose.crossingCue?.stage||null,target:api.foxEyeTarget(pose),fixed,eyes};
  },{step,reduced});
}
function checkApplied(sample:any,neutral:boolean){
  expect(sample.fixed.resources.eyeGroups).toBe(2);expect(sample.fixed.resources.layers).toBe(6);
  for(const eye of sample.eyes){expect(eye.applied).toEqual(eye.expected);if(neutral)expect(eye.applied).toMatchObject({source:'neutral',amount:0,cue:null});else expect(eye.applied.cue).toMatchObject({id:'foxes',index:1});for(const [name,layer] of Object.entries(eye.layers) as any){expect(layer.position).toEqual(eye.expected.positions[name]);expect(layer.drawError).not.toBeNull();expect(layer.drawError).toBeLessThan(2e-6);}}
}

test('the existing fox eye layers follow an actual current crossing peer, release gradually and remain seated during real fractional rendering',async({page})=>{
  const substitution=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_ecosystem.js=')),sourceFile=substitution?substitution.slice(substitution.indexOf('=')+1):'stem_lab/stem_tool_ecosystem.js',sourceSha256=createHash('sha256').update(await readFile(sourceFile)).digest('hex');
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Fox crossings',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  const initialized=await page.waitForFunction(()=>{const r=(window as any).__glCanvas?.('[data-efw-meadow]');return r?.rec?.scene&&r.rec.draws>0&&document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index')?'ready':document.querySelector('[data-efw-meadow]')?.textContent?.includes('3D is unavailable on this device.')?'unavailable':false;},undefined,{timeout:60_000});expect(await initialized.jsonValue()).toBe('ready');
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  const fixture=await page.evaluate(()=>{const w=window as any,api=w.StemLab.ecosystemFoodWeb,config=w.__toolData.ecosystem.foodWeb.run.config,pair=api.compare(config);w.__crossFixFrames=api.behaviorTimeline(config,pair.baseline);return {episode:api.foxCrossingEpisode(w.__crossFixFrames),run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run),population:JSON.stringify(pair)};});expect(fixture.episode).toEqual({step:63,index:6,sourceIndex:1,start:61});
  await meadow.getByRole('button',{name:'Inspect a fox crossing',exact:true}).click();await expect(canvas).toHaveAttribute('data-representative-index','6');
  const samples:any[]=[];samples.push(await rig(page,63));
  const reason=meadow.locator('[data-efw-action-reason]');if(await reason.getAttribute('open')===null)await reason.locator(':scope > summary').click();
  await reason.getByRole('button',{name:'Show behavior interaction',exact:true}).click();await meadow.getByRole('button',{name:'Face detail',exact:true}).click();
  for(const step of [65,69,72,77]){await seek(page,step);samples.push(await rig(page,step));}
  // The lateral eye is hidden by the skull from a straight muzzle view even
  // when the recorded lids are open. Keep the fixed proofs above unchanged,
  // then show the near eye from an oblique angle for the visual comparison.
  await seek(page,65);await meadow.getByRole('button',{name:'Face view',exact:true}).click();await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();
  const visualProof:any=await rig(page,65);expect(visualProof.eyeOpen).toBeGreaterThan(.8);checkApplied(visualProof,baselineMode);
  visualProof.visibility=await page.evaluate(()=>{
    const w=window as any,T=w.THREE,scene=w.__glCanvas('[data-efw-meadow]').rec.scene,camera=w.__crossFixCamera,root=scene.children.filter((node:any)=>node.userData.headSurface?.name==='eco-foxes-head-surface')[6];
    function shown(part:any){for(let node=part;node;node=node.parent)if(!node.visible)return false;return true;}
    const batches=scene.children.filter((node:any)=>node.isInstancedMesh&&node.visible&&node.userData.parts),layers=new Set(root.userData.eyeGroups.flatMap((eye:any)=>Object.values(eye.userData.fixationLayers)));
    return root.userData.eyeGroups.map((eye:any)=>{const iris=eye.userData.fixationLayers.iris;let visible=0;const hits:any[]=[];for(const x of [-.35,0,.35])for(const y of [-.3,.3]){const target=new T.Vector3(x,y,eye.userData.side*Math.sqrt(1-x*x-y*y)).applyMatrix4(iris.matrixWorld),ray=new T.Raycaster(camera.position.clone(),target.clone().sub(camera.position).normalize()),hit=ray.intersectObjects(batches,false)[0],source=hit&&hit.object.userData.parts.filter(shown)[hit.instanceId];if(layers.has(source))visible++;hits.push(source?.name||source?.type||'none');}return {side:eye.userData.side,visible,hits};});
  });
  expect(visualProof.visibility.some((eye:any)=>eye.visible>0),'the oblique camera must actually see an iris, pupil or glint through the open lid').toBe(true);
  await stage.screenshot({path:reportDir+(baselineMode?'/crossing-fixation-before.jpg':'/crossing-fixation-current.jpg'),type:'jpeg',quality:94});
  for(const sample of samples)checkApplied(sample,baselineMode||sample.look===0);
  const baselinePath=reportDir+'/crossing-fixation-baseline.json';
  if(baselineMode){for(const sample of samples){expect(sample.target).toBeNull();expect(sample.eyeAim).toBe(0);}await writeFile(baselinePath,JSON.stringify({sourceSha256,fixture,samples,visualProof},null,2)+'\n');return;}
  const baseline=JSON.parse(await readFile(baselinePath,'utf8'));expect(fixture).toEqual(baseline.fixture);
  for(let k=0;k<samples.length;k++)exact(samples[k].fixed,baseline.samples[k].fixed);
  expect(samples.some(sample=>sample.target?.id==='foxes'&&Math.abs(sample.eyeAim)>.02)).toBe(true);expect(samples.find(sample=>sample.step===69).stage).toBe('release');expect(samples.at(-1).eyes.every((eye:any)=>eye.applied.amount===0)).toBe(true);
  // Orienting in place and releasing to a centered eye are genuine parts of
  // the recorded sequence. Keep both validated same-peer endpoints; require
  // a changed eye, skull or root channel rather than body travel alone.
  const playbackStart=await page.evaluate(()=>{const w=window as any,api=w.StemLab.ecosystemFoodWeb,frames=w.__crossFixFrames;w.__crossFixSegments=[];for(let step=1;step<frames.length-2;step++){const a=frames[step].foxes[6],b=frames[step+1].foxes[6],from=api.foxEyeTarget(a),to=api.foxEyeTarget(b);if(from?.id==='foxes'&&to?.id==='foxes'&&from.index===to.index&&a.crossingCue.startStep===b.crossingCue.startStep&&(Math.abs(b.eyeAim-a.eyeAim)>1e-5||Math.abs(b.headTurn-a.headTurn)>1e-5||Math.hypot(b.x-a.x,b.z-a.z)>1e-5))w.__crossFixSegments.push({step,from,to});}return w.__crossFixSegments[0]?.step;});expect(playbackStart).toBeTruthy();await seek(page,playbackStart);await meadow.getByLabel('Meadow playback speed',{exact:true}).selectOption('0.5');
  await page.evaluate(()=>{
    const w=window as any,api=w.StemLab.ecosystemFoodWeb;w.__crossFixPlayback=[];w.__crossFixRaw=[];w.__crossFixDraws=0;w.__crossFixLast=null;w.__crossFixStart=w.__crossFixSegments[0].step;
    const selectedCue=w.__crossFixFrames[w.__crossFixStart].foxes[6].crossingCue;w.__crossFixEpoch={index:selectedCue.index,receiverIndex:selectedCue.receiverIndex,startStep:selectedCue.startStep};
    // Advance the real application's RAF callbacks by one deterministic 37ms
    // clock tick per browser frame. At 0.5 replay speed each tick advances
    // 0.185 samples, avoiding a quarter-grid alias when renders coalesce.
    // Every callback in the same browser frame receives the same timestamp;
    // no pose, model value, render object or performance clock is replaced.
    const original=window.requestAnimationFrame;w.__crossFixOriginalRaf=original;let lastBrowserFrame:number|null=null,clock=0;
    window.requestAnimationFrame=callback=>original.call(window,now=>{if(now!==lastBrowserFrame){clock=lastBrowserFrame===null?now:clock+37;lastBrowserFrame=now;}callback(clock);});
    function same(a:any,b:any){return a&&b&&a.id===b.id&&a.index===b.index&&['x','z','residual','amount'].every(key=>Math.abs(a[key]-b[key])<1e-10);}
    w.__captureCrossFix=function(scene:any){
      const root=scene.children.filter((node:any)=>node.userData.headSurface?.name==='eco-foxes-head-surface')[6],eye=root?.userData.eyeGroups[0],applied=eye?.userData.eyeFixation,canvas=document.querySelector('[data-efw-meadow] canvas'),mirrorStep=Number(canvas?.getAttribute('data-step')),fraction=Number(canvas?.getAttribute('data-playback-fraction')),frames=w.__crossFixFrames;
      const a=frames[mirrorStep]?.foxes[6],b=frames[mirrorStep+1]?.foxes[6],computed=a&&b?api.blendPose(a,b,fraction,'foxes',frames[mirrorStep-1]?.foxes[6],frames[mirrorStep+2]?.foxes[6]):null,expected=computed?api.foxEyeFixation(computed,eye?.userData.side,false):null;
      const raw={draw:++w.__crossFixDraws,mirrorStep,fraction,source:applied?.source,alpha:applied?.alpha,amount:applied?.amount,cue:applied?.cue,endpoints:applied?.endpoints,target:a&&api.foxEyeTarget(a),nextTarget:b&&api.foxEyeTarget(b),actor:root?{x:root.position.x,z:root.position.z,yaw:root.rotation.y}:null,computed:computed?{x:computed.x,z:computed.z,yaw:computed.yaw,source:expected?.source,alpha:expected?.alpha,amount:expected?.amount}:null};w.__crossFixLast=raw;if(w.__crossFixRaw.length<40)w.__crossFixRaw.push(raw);
      if(w.__crossFixPlayback.length>=20||applied?.source!=='interpolated'||applied.alpha<=.02||applied.alpha>=.98)return;
      const segment=w.__crossFixSegments.find((item:any)=>same(item.from,applied.endpoints?.[0])&&same(item.to,applied.endpoints?.[1]));if(!segment)return;
      const cue=frames[segment.step].foxes[6].crossingCue,epoch=w.__crossFixEpoch;if(cue.index!==epoch.index||cue.receiverIndex!==epoch.receiverIndex||cue.startStep!==epoch.startStep)return;
      if(w.__crossFixPlayback.some((sample:any)=>sample.step===segment.step&&Math.abs(sample.alpha-applied.alpha)<1e-9))return;
      const step=segment.step,pose=api.blendPose(frames[step].foxes[6],frames[step+1].foxes[6],applied.alpha,'foxes',frames[step-1].foxes[6],frames[step+2].foxes[6]),fixation=api.foxEyeFixation(pose,eye.userData.side,false);
      function shown(part:any){for(let node=part;node;node=node.parent)if(!node.visible)return false;return true;}
      const layers=Object.fromEntries(Object.entries(eye.userData.fixationLayers).map(([name,part]:any)=>{const batch=scene.children.find((node:any)=>node.isInstancedMesh&&node.userData.parts?.includes(part)),slot=batch?batch.userData.parts.filter(shown).indexOf(part):-1,matrix=new w.THREE.Matrix4();if(slot>=0)batch.getMatrixAt(slot,matrix);return [name,{position:part.position.toArray(),drawError:slot<0?null:Math.max(...matrix.elements.map((value:number,k:number)=>Math.abs(value-part.matrixWorld.elements[k])))}];}));
      w.__crossFixPlayback.push({step,alpha:applied.alpha,epoch,applied,expected:fixation,layers,actor:{x:root.position.x,z:root.position.z,yaw:root.rotation.y},expectedActor:{x:pose.x,z:pose.z,yaw:pose.yaw}});
    };
  });
  await meadow.getByRole('button',{name:'Play meadow timeline',exact:true}).click();await page.waitForFunction(()=>{const samples=(window as any).__crossFixPlayback;return samples.length>=3&&new Set(samples.map((sample:any)=>Math.round(sample.alpha*1e6))).size>=2;},undefined,{timeout:20_000}).catch(async error=>{
    const diagnostics=await page.evaluate(()=>{const w=window as any;w.__captureCrossFix=null;return {raw:w.__crossFixRaw,last:w.__crossFixLast,draws:w.__crossFixDraws,segments:w.__crossFixSegments,accepted:w.__crossFixPlayback,errors:w.__events?.errors};});
    const body=JSON.stringify({sourceSha256,...diagnostics},null,2);await writeFile(reportDir+'/crossing-fixation-playback-diagnostics.json',body+'\n');await test.info().attach('actual-crossing-fixation-playback-diagnostics',{body,contentType:'application/json'});throw error;
  });await meadow.getByRole('button',{name:'Pause meadow timeline',exact:true}).click();
  const playback=await page.evaluate(()=>{const w=window as any;w.__captureCrossFix=null;window.requestAnimationFrame=w.__crossFixOriginalRaf;w.__crossFixOriginalRaf=null;return w.__crossFixPlayback;});
  expect(playback.length).toBeGreaterThanOrEqual(3);
  expect(new Set(playback.map((sample:any)=>Math.round(sample.alpha*1e6))).size).toBeGreaterThanOrEqual(2);
  for(const sample of playback)expect(sample.epoch).toEqual({index:fixture.episode.sourceIndex,receiverIndex:fixture.episode.index,startStep:fixture.episode.start});
  for(const sample of playback){expect(sample.applied).toEqual(sample.expected);expect(sample.applied.cue).toMatchObject({id:'foxes',index:1});for(const key of ['x','z','yaw'])expect(sample.actor[key]).toBeCloseTo(sample.expectedActor[key],11);for(const [name,layer] of Object.entries(sample.layers) as any){expect(layer.position).toEqual(sample.expected.positions[name]);expect(layer.drawError).not.toBeNull();expect(layer.drawError).toBeLessThan(2e-6);}}
  await seek(page,65);await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');const reduced=await rig(page,65,true);checkApplied(reduced,true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(fixture.run);
  await writeFile(reportDir+'/crossing-fixation-current.json',JSON.stringify({sourceSha256,baselineSourceSha256:baseline.sourceSha256,fixture,samples,visualProof,playback,reduced},null,2)+'\n');
});
