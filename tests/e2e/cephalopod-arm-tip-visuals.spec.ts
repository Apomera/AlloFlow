import {test,expect,Page,TestInfo,CDPSession} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {clickCephalopodControl} from './helpers/cephalopod_controls';

const source=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const expectRefinedTips=process.env.CEPHALOPOD_EXPECT_REFINED_TIPS==='1';
const harness=new GlHarness({toolFile:source,toolId:'cephalopodLab',width:1280,height:1000,layout:'document'});
const errors=new WeakMap<Page,string[]>(),touches=new WeakMap<Page,CDPSession>();
const profiles=[
  {id:'common-octopus',species:'commonOcto',width:1280,height:900,touch:false,quality:'balanced',motion:true},
  {id:'giant-pacific',species:'giantPacific',width:1280,height:900,touch:false,quality:'balanced',motion:false},
  {id:'mobile-320',species:'commonOcto',width:320,height:568,touch:true,quality:'low',motion:false},
  {id:'cuttlefish-reference',species:'cuttlefish',width:1280,height:900,touch:false,quality:'balanced',motion:false},
] as const;
type Profile=typeof profiles[number];

test.describe.configure({timeout:240000,retries:0});
// PLAYWRIGHT_BROWSERS_PATH selects the installed headless Chromium bundle.
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{
  const list:string[]=[];errors.set(page,list);page.on('pageerror',error=>list.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGL|THREE|shader|program/i.test(message.text()))list.push(message.text());});
  await useCephalopodAudioFallback(page);touches.set(page,await page.context().newCDPSession(page));
});
test.afterEach(async({page},info)=>{
  await touches.get(page)?.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});
  try{
    await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    const disposal=await page.evaluate(()=>((window as any).__tipVisual?.resources||[]).map((row:any)=>({uuid:row.resource.uuid,type:row.resource.type,count:row.disposed})));
    await info.attach('resource-disposal',{body:JSON.stringify(disposal,null,2),contentType:'application/json'});
    expect(disposal.length).toBeGreaterThan(0);expect(disposal.filter((row:any)=>row.count<1)).toEqual([]);
  }finally{await harness.destroy(page);await touches.get(page)?.detach();}
  expect(errors.get(page)).toEqual([]);
});

async function frames(page:Page,count=3){await page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));},count);}

async function mount(page:Page,profile:Profile){
  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>typeof (window as any).__mount==='function'&&!!(window as any).StemLab?._registry?.cephalopodLab);
  await page.evaluate(({species,quality})=>{
    let meta=document.querySelector('meta[name="viewport"]') as HTMLMetaElement|null;
    if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta);}meta.content='width=device-width, initial-scale=1';
    document.getElementById('wrap')!.style.width='100%';
    const w=window as any,Original=w.THREE.WebGLRenderer;
    w.THREE.WebGLRenderer=new Proxy(Original,{construct(target,args,newTarget){
      const renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene:any,camera:any){if(scene?.getObjectByName('cl-player')){w.__armRenderer=renderer;w.__armCamera=camera;}return render.apply(this,arguments);};return renderer;
    }});
    w.__armNativePointers=[];document.addEventListener('pointerdown',(event:PointerEvent)=>{const button=(event.target as HTMLElement).closest('button');w.__armNativePointers.push({trusted:event.isTrusted,type:event.pointerType,name:button?.getAttribute('aria-label')||button?.textContent?.trim()||''});},true);
    // Native clock, camera, seeded actors and renderer remain in control.
    w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:'observe',huntSeed:2741,huntQuality:quality,_threeLoaded:true}});
  },profile);
  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.createdBy==='page'&&r.canvas.isConnected&&r.scene?.getObjectByName('cl-player')&&r.draws>0),undefined,{timeout:90000});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();await frames(page);
  await page.evaluate(()=>{
    const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.canvas.isConnected&&r.scene).at(-1),player=record.scene.getObjectByName('cl-player'),owned:any[]=[],resources=new Set<any>(),arms:any[]=[],kelp:any[]=[];
    player.traverse((object:any)=>{
      if(!object.isMesh)return;const materials=Array.isArray(object.material)?object.material:[object.material];
      resources.add(object.geometry);materials.forEach((material:any)=>{resources.add(material);Object.values(material).forEach((value:any)=>{if(value?.isTexture)resources.add(value);});});
      owned.push({object,geometry:object.geometry,material:object.material,index:object.geometry.index,attributes:Object.entries(object.geometry.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array}))});
      if(/^cl-arm-[0-7]$/.test(object.name))arms.push({object,firstBuffer:null,draw:null,epoch:0});
    });
    record.scene.traverse((object:any)=>{
      if(!object.isMesh||object.name!=='cl-kelp')return;
      const geometry=object.geometry;resources.add(geometry);resources.add(object.material);
      owned.push({object,geometry,material:object.material,index:geometry.index,attributes:Object.entries(geometry.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array}))});
      kelp.push({object,firstBuffer:null,draw:null,epoch:0});
    });
    arms.sort((a,b)=>a.object.name.localeCompare(b.object.name));
    const p=w.__tipVisual={record,player,owned,arms,kelp,epoch:1,frozen:null,resources:[...resources].map(resource=>{const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);return row;})};
    for(const arm of arms.concat(kelp)){
      const previous=arm.object.onAfterRender;
      arm.object.onAfterRender=function(renderer:any,scene:any,camera:any,geometry:any,material:any,group:any){
        previous.call(this,renderer,scene,camera,geometry,material,group);if(arm.epoch===p.epoch)return;
        // Sample each actual arm/kelp draw once per requested phase, not each frame.
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),location=gl.getAttribLocation(program,'position'),buffer=location>=0?gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING):null;
        if(!arm.firstBuffer)arm.firstBuffer=buffer;
        arm.draw={epoch:p.epoch,sameGeometry:geometry===arm.object.geometry,vertices:geometry.attributes.position.count,indexCount:geometry.index?.count||0,linked:gl.getProgramParameter(program,gl.LINK_STATUS),compiled:(gl.getAttachedShaders(program)||[]).map((shader:any)=>gl.getShaderParameter(shader,gl.COMPILE_STATUS)),enabled:location>=0&&!!gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_ENABLED),retainedBuffer:!!buffer&&buffer===arm.firstBuffer};arm.epoch=p.epoch;
      };
    }
  });
}

async function state(page:Page,sampleGpu=false){
  if(sampleGpu){await page.evaluate(()=>(window as any).__tipVisual.epoch++);await frames(page,2);}
  return page.evaluate(()=>{
    const w=window as any,p=w.__tipVisual,stage=document.querySelector('.cl-hunt-stage')!,bounds=stage.getBoundingClientRect();
    function hash(array:any){let value=2166136261;for(const byte of new Uint8Array(array.buffer,array.byteOffset,array.byteLength)){value^=byte;value=Math.imul(value,16777619);}return(value>>>0).toString(16).padStart(8,'0');}
    const arms=p.arms.map((row:any)=>{
      const geometry=row.object.geometry,a=geometry.attributes.position,centers:number[][]=[];
      // The retained tube has 20 longitudinal sections and eight radial sides;
      // average the eight distinct vertices, excluding its repeated seam.
      for(let ring=0;ring<=20;ring++){const center=[0,0,0];for(let side=0;side<8;side++)for(let axis=0;axis<3;axis++)center[axis]+=a.array[(ring*9+side)*3+axis]/8;centers.push(center);}
      let distalTurn=0,distalTurnXZ=0;for(let ring=7;ring<20;ring++){const a=centers[ring].map((n:number,i:number)=>n-centers[ring-1][i]),b=centers[ring+1].map((n:number,i:number)=>n-centers[ring][i]),den=Math.hypot(...a)*Math.hypot(...b),planarDen=Math.hypot(a[0],a[2])*Math.hypot(b[0],b[2]);if(den>1e-12)distalTurn+=Math.acos(Math.max(-1,Math.min(1,a.reduce((sum:number,n:number,i:number)=>sum+n*b[i],0)/den)));if(planarDen>1e-12)distalTurnXZ+=Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[2]*b[2])/planarDen)));}
      const radii=centers.map((center:number[],ring:number)=>{let radius=0;for(let side=0;side<8;side++){const at=(ring*9+side)*3;radius+=Math.hypot(a.array[at]-center[0],a.array[at+1]-center[1],a.array[at+2]-center[2])/8;}return radius;});
      const n=geometry.attributes.normal.array;let seamNormalError=0,unitNormalError=0;
      for(let ring=14;ring<=20;ring++)for(let side=0;side<=8;side++){const at=(ring*9+side)*3;unitNormalError=Math.max(unitNormalError,Math.abs(Math.hypot(n[at],n[at+1],n[at+2])-1));if(side===0){const other=at+24;seamNormalError=Math.max(seamNormalError,Math.hypot(n[at]-n[other],n[at+1]-n[other+1],n[at+2]-n[other+2]));}}
      return {name:row.object.name,vertices:a.count,indices:geometry.index.count,position:hash(a.array),normal:hash(n),positionVersion:a.version,centers,radii,tipRatio:radii[20]/radii[14],seamNormalError,unitNormalError,distalTurn,distalTurnXZ,draw:row.draw};
    });
    const kelp=p.kelp.map((row:any)=>{
      const g=row.object.geometry,a=g.attributes.position,mask=g.attributes.clPlantRibbon;
      const bladeTips=Array.from({length:4},(_,leaf)=>{const start=57+leaf*21,rows=[start+12,277+leaf*6,start+15,280+leaf*6,start+18];const centers=rows.map(index=>[a.getX(index+1),a.getY(index+1),a.getZ(index+1)]);return {rows,centers,downturn:centers[3][1]-centers[4][1]};});
      const indexValues=Array.from(g.index.array) as number[],appendedVertices=new Set(indexValues.filter(index=>index>=277));
      return {name:row.object.name,vertices:a.count,indices:g.index.count,position:hash(a.array),normal:hash(g.attributes.normal.array),metadata:g.userData,bladeTips,appendedUsed:appendedVertices.size,indexValid:indexValues.every(index=>Number.isInteger(index)&&index>=0&&index<a.count),ribbonMaskValid:!!mask&&mask.count===a.count&&Array.from(mask.array).every((value,index)=>value===(index>=141&&index<=276?0:1)),bounds:g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null,sphere:g.boundingSphere?{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}:null,draw:row.draw};
    });
    return {arms,kelp,signature:arms.map((arm:any)=>arm.position).join(':'),player:p.player.position.toArray(),quaternion:p.player.quaternion.toArray(),species:p.player.userData.species,draws:p.record.draws,epoch:p.epoch,
      pageCreated:p.record.createdBy==='page',contextLost:p.record.ctx.isContextLost(),forcedEffects:!!w.__alloForceFX,
      retained:p.owned.every((row:any)=>row.object.geometry===row.geometry&&row.object.material===row.material&&row.geometry.index===row.index&&row.attributes.every((a:any)=>row.geometry.attributes[a.name]===a.a&&a.a.array===a.array)),
      finite:p.owned.every((row:any)=>row.object.matrixWorld.elements.every(Number.isFinite)&&Object.values(row.geometry.attributes).every((a:any)=>Array.from(a.array).every(Number.isFinite))),disposed:p.resources.filter((row:any)=>row.disposed).length,resources:p.resources.length,
      time:stage.querySelector('[data-hud=time]')?.textContent,stamina:Number(stage.querySelector('[data-hud=stamina]')?.textContent),burn:stage.querySelector('[data-hud=burn]')?.textContent,
      viewport:{width:innerWidth,height:innerHeight},stage:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,nativePointers:w.__armNativePointers,
    };
  });
}
type State=Awaited<ReturnType<typeof state>>;
function horizontal(a:number[],b:number[]){return Math.hypot(a[0]-b[0],a[2]-b[2]);}
function healthy(s:State,profile:Profile){
  expect(s.pageCreated&&s.retained&&s.finite).toBe(true);expect(s.contextLost||s.forcedEffects||s.horizontalOverflow).toBe(false);expect(s.disposed).toBe(0);expect(s.species).toBe(profile.species);expect(s.viewport.width).toBe(profile.width);
  expect(s.arms).toHaveLength(8);expect(s.draws).toBeGreaterThan(0);for(const arm of s.arms){expect(arm.draw,'submitted '+arm.name).not.toBeNull();expect(arm.draw.epoch).toBe(s.epoch);expect(arm.draw.sameGeometry&&arm.draw.enabled&&arm.draw.retainedBuffer&&arm.draw.linked).toBe(true);expect(arm.draw.compiled).toEqual([true,true]);expect(arm.draw.vertices).toBe(arm.vertices);expect(arm.draw.indexCount).toBe(arm.indices);expect(Number.isFinite(arm.distalTurn)).toBe(true);}
  for(const arm of s.arms){
    expect(arm.vertices).toBe(profile.species==='cuttlefish'?189:199);expect(arm.unitNormalError).toBeLessThan(.0001);expect(arm.seamNormalError).toBeLessThan(.00001);
    if(expectRefinedTips&&profile.species!=='cuttlefish'){expect(arm.tipRatio,'slender actual ring20/ring14 radius on '+arm.name).toBeGreaterThan(.04);expect(arm.tipRatio).toBeLessThan(.065);for(let ring=15;ring<=20;ring++){expect(arm.radii[ring]).toBeGreaterThan(0);expect(arm.radii[ring]).toBeLessThan(arm.radii[ring-1]);}}
  }
  expect(s.kelp.length).toBeGreaterThan(0);
  for(const plant of s.kelp){
    expect(plant.vertices).toBeGreaterThan(100);expect(plant.indices).toBeGreaterThan(0);expect(plant.indexValid).toBe(true);expect(plant.bounds).not.toBeNull();expect(plant.sphere!.radius).toBeGreaterThan(0);
    if(expectRefinedTips){expect(plant.vertices).toBe(301);expect(plant.indices).toBe(456*3);expect(plant.appendedUsed).toBe(24);expect(plant.ribbonMaskValid).toBe(true);expect(plant.metadata.clKelpBladders.parts).toHaveLength(4);for(const blade of plant.bladeTips)expect(blade.downturn,'actual softly descending kelp tip').toBeGreaterThan(.0001);}
    if(plant.draw?.epoch===s.epoch){expect(plant.draw.sameGeometry&&plant.draw.enabled&&plant.draw.retainedBuffer&&plant.draw.linked).toBe(true);expect(plant.draw.compiled).toEqual([true,true]);expect(plant.draw.vertices).toBe(plant.vertices);expect(plant.draw.indexCount).toBe(plant.indices);}
  }
  if(profile.touch){expect(s.stage.left).toBeGreaterThanOrEqual(-1);expect(s.stage.right).toBeLessThanOrEqual(profile.width+1);expect(s.stage.top).toBeGreaterThanOrEqual(-1);expect(s.stage.bottom).toBeLessThanOrEqual(profile.height+1);}
}
function frozen(s:State){return {signature:s.signature,normals:s.arms.map((arm:any)=>arm.normal),player:s.player,quaternion:s.quaternion,time:s.time,stamina:s.stamina};}

async function photo(page:Page,info:TestInfo,label:string){const path=info.outputPath(label+'.png');await page.locator('.cl-hunt-stage').screenshot({path});await info.attach(label,{path,contentType:'image/png'});}
async function pause(page:Page,profile:Profile){const button=page.getByRole('button',{name:'Pause',exact:true});if(profile.touch)await button.tap();else await button.click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await frames(page);}
async function resume(page:Page,profile:Profile){const button=page.getByRole('button',{name:'Resume',exact:true});if(profile.touch)await button.tap();else await button.click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).not.toHaveText('Paused');await frames(page);}
async function touchPoint(page:Page,name:string,id:number){const button=page.getByRole('button',{name,exact:true});await expect(button).toBeVisible();const box=await button.boundingBox();if(!box)throw new Error('Missing touch button '+name);return{x:box.x+box.width/2,y:box.y+box.height/2,id,radiusX:3,radiusY:3,force:1};}
async function beginMove(page:Page,profile:Profile,jet:boolean){
  if(profile.touch){const points=[await touchPoint(page,'Forward',1)];if(jet)points.push(await touchPoint(page,'Jet',2));await touches.get(page)!.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});}
  else{await page.locator('canvas[role=application]').focus();await page.keyboard.down('KeyW');if(jet)await page.keyboard.down('Space');}
}
async function endMove(page:Page,profile:Profile){if(profile.touch)await touches.get(page)!.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else{await page.keyboard.up('Space');await page.keyboard.up('KeyW');}}

// Inspection inputs deliberately match the accepted fa90 arm-gesture captures.
// Reuse those baseline images; the real clock and camera stay native here.
for(const profile of profiles)test.describe(profile.id,()=>{
  test.use({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1});
  test('refined tips render with retained geometry in native inspection and motion',async({page},info)=>{
    const evidence:Record<string,any>={source,profile,expectRefinedTips};
    try{
      await mount(page,profile);const idle=await state(page,true);healthy(idle,profile);evidence.idle=idle;
      expect(idle.kelp.some((plant:any)=>plant.draw?.epoch===idle.epoch),'native visible kelp submitted to GPU').toBe(true);
      await expect.poll(async()=>(await state(page)).signature,{timeout:15000}).not.toBe(idle.signature);
      const idleLater=await state(page,true);healthy(idleLater,profile);evidence.idleLater=idleLater;expect(horizontal(idle.player,idleLater.player)).toBeLessThan(1e-6);
      if(profile.motion)await photo(page,info,'idle-'+profile.id);await pause(page,profile);
      const paused=await state(page,true);healthy(paused,profile);evidence.paused=paused;await frames(page,5);expect(frozen(await state(page))).toEqual(frozen(paused));
      await clickCephalopodControl(page,'Inspect');await expect(page.getByRole('region',{name:'Specimen inspection',exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
      for(let i=0;i<(profile.touch?2:1);i++)await page.getByRole('button',{name:'Closer',exact:true}).click();
      await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();await frames(page,4);
      const inspected=await state(page,true);healthy(inspected,profile);evidence.inspected=inspected;expect(frozen(inspected)).toEqual(frozen(paused));await photo(page,info,'inspection-'+profile.id);
      await page.getByRole('button',{name:'Return to dive',exact:true}).click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await frames(page);expect(frozen(await state(page))).toEqual(frozen(paused));
      await resume(page,profile);await expect.poll(async()=>(await state(page)).signature).not.toBe(paused.signature);
      if(profile.motion){
        const origin=await state(page);await beginMove(page,profile,false);
        try{await expect.poll(async()=>horizontal((await state(page)).player,origin.player),{timeout:15000}).toBeGreaterThan(.3);evidence.crawl=await state(page,true);healthy(evidence.crawl,profile);expect(evidence.crawl.signature).not.toBe(origin.signature);await photo(page,info,'crawl-'+profile.id);}finally{await endMove(page,profile);}
        const beforeJet=await state(page);await beginMove(page,profile,true);
        try{await expect.poll(async()=>Number(await page.locator('.cl-hunt-stage [data-hud=stamina]').textContent()),{timeout:20000}).toBeLessThan(beforeJet.stamina-12);evidence.jet=await state(page,true);healthy(evidence.jet,profile);expect(horizontal(evidence.jet.player,beforeJet.player)).toBeGreaterThan(.1);expect(evidence.jet.signature).not.toBe(evidence.crawl.signature);await photo(page,info,'jet-'+profile.id);}finally{await endMove(page,profile);}
        await pause(page,profile);const jetPaused=await state(page,true);healthy(jetPaused,profile);evidence.jetPaused=jetPaused;await frames(page,5);expect(frozen(await state(page))).toEqual(frozen(jetPaused));
      }
      if(profile.touch)expect((await state(page)).nativePointers.some((event:any)=>event.trusted&&event.type==='touch'&&event.name==='Pause')).toBe(true);
    }finally{const path=info.outputPath('poses-'+profile.id+'.json');writeFileSync(path,JSON.stringify(evidence,null,2));await info.attach('native-tip-poses',{path,contentType:'application/json'});}
  });
});
