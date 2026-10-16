import {expect,Page,TestInfo} from '@playwright/test';
import {GlHarness} from './stem_gl_harness';
import {clickCephalopodControl} from './cephalopod_controls';

export const nativeProfiles=[
  {id:'common-octopus',species:'commonOcto',width:1280,height:900,touch:false,quality:'balanced',motion:true},
  {id:'giant-pacific',species:'giantPacific',width:1280,height:900,touch:false,quality:'balanced',motion:false},
  {id:'mobile-320',species:'commonOcto',width:320,height:568,touch:true,quality:'low',motion:false},
  {id:'cuttlefish-reference',species:'cuttlefish',width:1280,height:900,touch:false,quality:'balanced',motion:false},
] as const;
export type NativeProfile=typeof nativeProfiles[number];

export async function nativeFrames(page:Page,count=3){
  await page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));},count);
}

/** Observation only: real clock, seeded actors, renderer and camera remain in control. */
export async function mountNativeVisuals(page:Page,harness:GlHarness,profile:NativeProfile){
  await page.goto(harness.url+'/__harness');
  await page.waitForFunction(()=>typeof(window as any).__mount==='function'&&!!(window as any).StemLab?._registry?.cephalopodLab);
  await page.evaluate(({species,quality})=>{
    let meta=document.querySelector('meta[name="viewport"]') as HTMLMetaElement|null;
    if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta);}meta.content='width=device-width, initial-scale=1';
    document.getElementById('wrap')!.style.width='100%';
    const w=window as any;w.__nativeVisualPointers=[];
    document.addEventListener('pointerdown',(event:PointerEvent)=>{const button=(event.target as HTMLElement).closest('button');w.__nativeVisualPointers.push({trusted:event.isTrusted,type:event.pointerType,name:button?.getAttribute('aria-label')||button?.textContent?.trim()||''});},true);
    w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:'observe',huntSeed:2741,huntQuality:quality,_threeLoaded:true}});
  },profile);
  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.createdBy==='page'&&r.canvas.isConnected&&r.scene?.getObjectByName('cl-player')&&r.draws>0),undefined,{timeout:90000});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();await nativeFrames(page);
  await page.evaluate(()=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.filter((r:any)=>r.canvas.isConnected&&r.scene).at(-1),player=record.scene.getObjectByName('cl-player');
    const resources=new Set<any>(),owned:any[]=[],eyes:any[]=[],plants:any[]=[],arms:any[]=[];
    const remember=(object:any,plant=false)=>{
      const g=object.geometry,materials=Array.isArray(object.material)?object.material:[object.material];resources.add(g);
      materials.forEach((m:any)=>{resources.add(m);Object.values(m).forEach((v:any)=>{if(v?.isTexture)resources.add(v);});});
      let motion:any=null;
      if(plant){const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};object.material.onBeforeCompile(shader);motion=(shader.uniforms as any).clPlantMotion;}
      const row={object,plant,geometry:g,material:object.material,key:object.material.customProgramCacheKey(),index:g.index,indexArray:g.index?.array,indices:g.index?Array.from(g.index.array):null,
        attributes:Object.entries(g.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array,values:Array.from(a.array)})),
        instance:object.instanceMatrix,instanceArray:object.instanceMatrix?.array,instances:object.instanceMatrix?Array.from(object.instanceMatrix.array):null,
        motion,motionValue:motion?.value,firstBuffer:null};owned.push(row);return row;
    };
    player.traverse((object:any)=>{if(!object.isMesh)return;const row=remember(object);if(/^cl-arm-[0-7]$/.test(object.name))arms.push(row);if(['cl-iris','cl-pupil'].includes(object.name))eyes.push(row);});
    record.scene.traverse((object:any)=>{if(object.isMesh&&['cl-kelp','cl-seagrass'].includes(object.name))plants.push(remember(object,true));});
    arms.sort((a,b)=>a.object.name.localeCompare(b.object.name));
    const p=w.__nativeVisual={record,player,owned,eyes,plants,arms,epoch:1,programs:new Map(),samples:new Map(),resources:[...resources].map(resource=>{const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);return row;})};
    for(const row of eyes.concat(plants)){
      const mesh=row.object,kind=row.plant?(mesh.name==='cl-kelp'?'kelp':'grass'):mesh.name,key=row.plant?kind:mesh.uuid,previous=mesh.onAfterRender;
      mesh.onAfterRender=function(renderer:any,scene:any,camera:any,geometry:any,material:any,group:any){
        previous.call(this,renderer,scene,camera,geometry,material,group);p.renderer=renderer;p.camera=camera;
        if(p.samples.get(key)?.epoch===p.epoch)return;
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),position=gl.getAttribLocation(program,'position');
        const buffer=position<0?null:gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);if(!row.firstBuffer)row.firstBuffer=buffer;
        if(!p.programs.has(key)){
          const ribbon=gl.getAttribLocation(program,'clPlantRibbon');
          p.programs.set(key,{kind,meshId:mesh.uuid,meshName:mesh.name,materialName:material.name,materialType:material.type,cacheKey:material.customProgramCacheKey(),linked:gl.getProgramParameter(program,gl.LINK_STATUS),
            ribbon:ribbon<0?null:{enabled:!!gl.getVertexAttrib(ribbon,gl.VERTEX_ATTRIB_ARRAY_ENABLED),size:gl.getVertexAttrib(ribbon,gl.VERTEX_ATTRIB_ARRAY_SIZE),bound:!!gl.getVertexAttrib(ribbon,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)},
            shaders:(gl.getAttachedShaders(program)||[]).map((shader:any)=>({compiled:gl.getShaderParameter(shader,gl.COMPILE_STATUS),source:gl.getShaderSource(shader)}))});
        }
        const uniform=(name:string)=>{const location=gl.getUniformLocation(program,name);if(location===null)return null;const v=gl.getUniform(program,location);return typeof v==='number'?v:Array.from(v);};
        const normalMatrix=uniform('normalMatrix');
        p.samples.set(key,{kind,epoch:p.epoch,meshId:mesh.uuid,materialId:material.uuid,vertices:geometry.attributes.position.count,indices:geometry.index?.count||0,sameGeometry:geometry===row.geometry,
          enabled:position>=0&&!!gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_ENABLED),positionSize:position<0?0:gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_SIZE),retainedBuffer:!!buffer&&buffer===row.firstBuffer,
          normalMatrix,normalDeterminant:normalMatrix?new T.Matrix3().fromArray(normalMatrix).determinant():null,eyeScale:uniform('clReefEyeScale'),
          motion:row.plant?uniform('clPlantMotion'):null,liveMotion:row.motion?.value.toArray(),height:geometry.userData.clPlantHeight});
      };
    }
  });
}

export async function nativeVisualState(page:Page,sampleGpu=false){
  if(sampleGpu){await page.evaluate(()=>(window as any).__nativeVisual.epoch++);await nativeFrames(page,2);}
  return page.evaluate(()=>{
    const w=window as any,p=w.__nativeVisual,stage=document.querySelector('.cl-hunt-stage')!,bounds=stage.getBoundingClientRect();
    const hash=(array:any)=>{let value=2166136261;for(const byte of new Uint8Array(array.buffer,array.byteOffset,array.byteLength)){value^=byte;value=Math.imul(value,16777619);}return(value>>>0).toString(16).padStart(8,'0');};
    const staticMesh=(row:any)=>row.plant||['cl-iris','cl-pupil','cl-eye-rim'].includes(row.object.name);
    const geometry=(row:any)=>({name:row.object.name,vertices:row.geometry.attributes.position.count,indices:row.geometry.index?.count||0,position:hash(row.geometry.attributes.position.array),normal:hash(row.geometry.attributes.normal.array),cacheKey:row.object.material.customProgramCacheKey()});
    const arms=p.arms.map(geometry),plants=p.plants.map((row:any)=>{
      const g=row.geometry,mask=g.attributes.clPlantRibbon;
      return {...geometry(row),id:row.object.uuid,instances:row.object.isInstancedMesh?row.object.count:1,
        ribbonMaskValid:!!mask&&mask.count===g.attributes.position.count&&Array.from(mask.array).every((value,index)=>value===(row.object.name==='cl-kelp'&&index>=141&&index<=276?0:1))};
    });
    return {arms,plants,eyes:p.eyes.map(geometry),samples:[...p.samples.values()],epoch:p.epoch,
      signature:arms.map((arm:any)=>arm.position).join(':'),player:p.player.position.toArray(),quaternion:p.player.quaternion.toArray(),species:p.player.userData.species,camera:p.camera?.position.toArray(),
      motion:p.plants.map((row:any)=>({id:row.object.material.uuid,value:row.motion?.value.toArray()})),stableMotion:p.plants.every((row:any)=>row.motion?.value===row.motionValue),
      pageCreated:p.record.createdBy==='page',contextLost:p.record.ctx.isContextLost(),forcedEffects:!!w.__alloForceFX,draws:p.record.draws,
      retained:p.owned.every((r:any)=>r.object.geometry===r.geometry&&r.object.material===r.material&&r.object.material.customProgramCacheKey()===r.key&&r.geometry.index===r.index&&r.geometry.index?.array===r.indexArray&&r.object.instanceMatrix===r.instance&&r.object.instanceMatrix?.array===r.instanceArray&&r.attributes.every((a:any)=>r.geometry.attributes[a.name]===a.a&&a.a.array===a.array)),
      staticBuffers:p.owned.filter(staticMesh).every((r:any)=>r.attributes.every((a:any)=>a.values.every((v:number,i:number)=>v===a.array[i]))&&(!r.indices||r.indices.every((v:number,i:number)=>v===r.indexArray[i]))&&(!r.instances||r.instances.every((v:number,i:number)=>v===r.instanceArray[i]))),
      finite:p.owned.every((r:any)=>r.object.matrixWorld.elements.every(Number.isFinite)&&Object.values(r.geometry.attributes).every((a:any)=>Array.from(a.array).every(Number.isFinite))),
      resources:p.resources.length,disposed:p.resources.filter((r:any)=>r.disposed).length,
      time:stage.querySelector('[data-hud=time]')?.textContent,stamina:Number(stage.querySelector('[data-hud=stamina]')?.textContent),burn:stage.querySelector('[data-hud=burn]')?.textContent,
      viewport:{width:innerWidth,height:innerHeight},stage:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,nativePointers:w.__nativeVisualPointers};
  });
}
export type NativeVisualState=Awaited<ReturnType<typeof nativeVisualState>>;
export function horizontalDistance(a:number[],b:number[]){return Math.hypot(a[0]-b[0],a[2]-b[2]);}
export function nativeFrozen(s:NativeVisualState){return{signature:s.signature,normals:s.arms.map((arm:any)=>arm.normal),player:s.player,quaternion:s.quaternion,motion:s.motion,time:s.time,stamina:s.stamina};}

export function expectNativeHealthy(s:NativeVisualState,profile:NativeProfile){
  expect(s.pageCreated&&s.retained&&s.staticBuffers&&s.stableMotion&&s.finite).toBe(true);expect(s.contextLost||s.forcedEffects||s.horizontalOverflow).toBe(false);expect(s.disposed).toBe(0);expect(s.species).toBe(profile.species);expect(s.viewport.width).toBe(profile.width);expect(s.draws).toBeGreaterThan(0);
  expect(s.arms).toHaveLength(8);for(const arm of s.arms)expect(arm.vertices).toBe(profile.species==='cuttlefish'?189:199);
  expect(s.eyes.map((eye:any)=>eye.name).sort()).toEqual(['cl-iris','cl-iris','cl-pupil','cl-pupil']);
  expect(s.plants.filter((plant:any)=>plant.name==='cl-kelp')).toHaveLength(25);expect(s.plants.filter((plant:any)=>plant.name==='cl-seagrass')).toHaveLength(80);
  for(const plant of s.plants){expect(plant.ribbonMaskValid).toBe(true);expect(plant.vertices).toBe(plant.name==='cl-kelp'?301:33);expect(plant.indices).toBe((plant.name==='cl-kelp'?456:40)*3);expect(plant.instances).toBe(plant.name==='cl-kelp'?1:7);}
  for(const sample of s.samples.filter((row:any)=>row.epoch===s.epoch)){
    expect(sample.sameGeometry&&sample.enabled&&sample.retainedBuffer,sample.kind).toBe(true);expect(sample.positionSize).toBe(3);expect(sample.normalMatrix).toHaveLength(9);expect(sample.normalMatrix.every(Number.isFinite)).toBe(true);expect(Math.abs(sample.normalDeterminant)).toBeGreaterThan(1e-8);
    if(sample.kind==='kelp'||sample.kind==='grass'){expect(sample.motion).toHaveLength(4);expect(sample.motion.every(Number.isFinite)).toBe(true);sample.motion.forEach((value:number,index:number)=>expect(value).toBeCloseTo(sample.liveMotion[index],5));expect(sample.motion[2]).toBeCloseTo(sample.height,5);expect(sample.motion[3]).toBe(1);}
    if(sample.kind==='cl-iris'&&profile.species!=='cuttlefish')expect(sample.eyeScale,'actual uploaded iris scale').toBeGreaterThan(0);
  }
  if(profile.touch){expect(s.stage.left).toBeGreaterThanOrEqual(-1);expect(s.stage.right).toBeLessThanOrEqual(profile.width+1);expect(s.stage.top).toBeGreaterThanOrEqual(-1);expect(s.stage.bottom).toBeLessThanOrEqual(profile.height+1);}
}

export async function nativePhoto(page:Page,info:TestInfo,label:string){const path=info.outputPath(label+'.png');await page.locator('.cl-hunt-stage').screenshot({path});await info.attach(label,{path,contentType:'image/png'});}
export async function nativePause(page:Page,profile:NativeProfile){const button=page.getByRole('button',{name:'Pause',exact:true});if(profile.touch)await button.tap();else await button.click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await nativeFrames(page);}
export async function nativeResume(page:Page,profile:NativeProfile){const button=page.getByRole('button',{name:'Resume',exact:true});if(profile.touch)await button.tap();else await button.click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).not.toHaveText('Paused');await nativeFrames(page);}

/** Exact accepted soft-forms framing, reached exclusively through native controls. */
export async function nativeInspection(page:Page,profile:NativeProfile){
  await clickCephalopodControl(page,'Inspect');await expect(page.getByRole('region',{name:'Specimen inspection',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
  for(let i=0;i<(profile.touch?2:1);i++)await page.getByRole('button',{name:'Closer',exact:true}).click();
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();await nativeFrames(page,4);
}
export async function nativeReturnToDive(page:Page){await page.getByRole('button',{name:'Return to dive',exact:true}).click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await nativeFrames(page);}
export async function nativeBeginMove(page:Page,jet:boolean){await page.locator('canvas[role=application]').focus();await page.keyboard.down('KeyW');if(jet)await page.keyboard.down('Space');}
export async function nativeEndMove(page:Page){await page.keyboard.up('Space');await page.keyboard.up('KeyW');}

export async function nativePrograms(page:Page){return page.evaluate(()=>[...(window as any).__nativeVisual.programs.values()]);}
export async function nativeTeardown(page:Page,harness:GlHarness,info:TestInfo){
  try{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    const disposal=await page.evaluate(()=>((window as any).__nativeVisual?.resources||[]).map((row:any)=>({uuid:row.resource.uuid,type:row.resource.type,count:row.disposed})));
    await info.attach('resource-disposal',{body:JSON.stringify(disposal,null,2),contentType:'application/json'});expect(disposal.length).toBeGreaterThan(0);expect(disposal.filter((row:any)=>row.count<1)).toEqual([]);
  }finally{await harness.destroy(page);}
}
