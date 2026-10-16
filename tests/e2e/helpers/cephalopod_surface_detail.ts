import {expect,Page} from '@playwright/test';
import {nativeFrames} from './cephalopod_native_visuals';

export async function installSurfaceDetailProbe(page:Page){
  await page.evaluate(()=>{
    const w=window as any,p=w.__nativeVisual,resources=new Set<any>(),targets:any[]=[];
    p.record.scene.traverse((mesh:any)=>{
      if(!mesh.isMesh)return;
      const coral=mesh.name==='cl-coral-colony',body=p.player.getObjectById(mesh.id)===mesh&&['cl-mantle','cl-fin--1','cl-fin-1'].includes(mesh.name);
      if(!coral&&!body)return;const g=mesh.geometry;
      const row={mesh,kind:coral?'coral':mesh.name,geometry:g,material:mesh.material,index:g.index,indexArray:g.index?.array,indices:g.index?Array.from(g.index.array):null,attributes:Object.entries(g.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array,values:Array.from(a.array)})),firstBuffer:null,program:null,draw:null};targets.push(row);
      if(coral){resources.add(g);resources.add(mesh.material);}
    });
    const d=w.__surfaceDetail={targets,epoch:1,targetCoral:null,route:null,resources:[...resources].map(resource=>{const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);return row;})};
    for(const row of targets){
      const previous=row.mesh.onAfterRender;
      row.mesh.onAfterRender=function(renderer:any,scene:any,camera:any,geometry:any,material:any,group:any){
        previous.call(this,renderer,scene,camera,geometry,material,group);d.camera=camera;if(row.draw?.epoch===d.epoch)return;
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),position=gl.getAttribLocation(program,'position'),buffer=position<0?null:gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        if(!row.firstBuffer)row.firstBuffer=buffer;
        if(!row.program){const surface=gl.getAttribLocation(program,'clCoralSurface');row.program={kind:row.kind,name:row.mesh.name,id:row.mesh.uuid,cacheKey:material.customProgramCacheKey(),linked:gl.getProgramParameter(program,gl.LINK_STATUS),surface:surface<0?null:{enabled:!!gl.getVertexAttrib(surface,gl.VERTEX_ATTRIB_ARRAY_ENABLED),size:gl.getVertexAttrib(surface,gl.VERTEX_ATTRIB_ARRAY_SIZE),bound:!!gl.getVertexAttrib(surface,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)},shaders:(gl.getAttachedShaders(program)||[]).map((shader:any)=>({compiled:gl.getShaderParameter(shader,gl.COMPILE_STATUS),source:gl.getShaderSource(shader)}))};}
        const uniform=(name:string)=>{const location=gl.getUniformLocation(program,name);return location===null?null:gl.getUniform(program,location);};
        row.draw={epoch:d.epoch,vertices:geometry.attributes.position.count,indices:geometry.index?.count||0,sameGeometry:geometry===row.geometry,positionEnabled:position>=0&&!!gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_ENABLED),retainedBuffer:!!buffer&&buffer===row.firstBuffer,phase:uniform('clPhase'),pattern:uniform('clPattern'),display:uniform('clDisplay')};
      };
    }
  });
}

export async function surfaceDetailState(page:Page,sampleGpu=false){
  if(sampleGpu){await page.evaluate(()=>(window as any).__surfaceDetail.epoch++);await nativeFrames(page,2);}
  return page.evaluate(()=>{
    const d=(window as any).__surfaceDetail;
    const hash=(a:any)=>{let n=2166136261;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength)){n^=b;n=Math.imul(n,16777619);}return(n>>>0).toString(16).padStart(8,'0');};
    return {epoch:d.epoch,targets:d.targets.map((r:any)=>({id:r.mesh.uuid,name:r.mesh.name,kind:r.kind,visible:r.mesh.visible,valid:r.mesh.userData.reefPlacementValid!==false,form:r.geometry.userData.growthForm,vertices:r.geometry.attributes.position.count,indices:r.geometry.index?.count||0,attributes:Object.fromEntries(Object.entries(r.geometry.attributes).map(([name,a]:[string,any])=>[name,{count:a.count,itemSize:a.itemSize,hash:hash(a.array)}])),position:r.mesh.position.toArray(),quaternion:r.mesh.quaternion.toArray(),scale:r.mesh.scale.toArray(),draw:r.draw,
      retained:r.mesh.geometry===r.geometry&&r.mesh.material===r.material&&r.geometry.index===r.index&&r.geometry.index?.array===r.indexArray&&r.attributes.every((a:any)=>r.geometry.attributes[a.name]===a.a&&a.a.array===a.array),
      staticBuffers:r.kind!=='coral'||r.attributes.every((a:any)=>a.values.every((v:number,i:number)=>v===a.array[i]))&&(!r.indices||r.indices.every((v:number,i:number)=>v===r.indexArray[i])),
      finite:r.mesh.matrixWorld.elements.every(Number.isFinite)&&Object.values(r.geometry.attributes).every((a:any)=>Array.from(a.array).every(Number.isFinite))})),disposed:d.resources.filter((r:any)=>r.disposed).length,resources:d.resources.length};
  });
}
export function expectSurfaceDetailHealthy(s:Awaited<ReturnType<typeof surfaceDetailState>>){
  expect(s.targets.some((r:any)=>r.kind==='cl-mantle')).toBe(true);expect(s.targets.some((r:any)=>r.kind==='coral')).toBe(true);expect(s.disposed).toBe(0);
  for(const r of s.targets){expect(r.retained&&r.staticBuffers&&r.finite,r.name).toBe(true);if(r.draw?.epoch===s.epoch){expect(r.draw.sameGeometry&&r.draw.positionEnabled&&r.draw.retainedBuffer,r.name).toBe(true);expect(r.draw.vertices).toBe(r.vertices);expect(r.draw.indices).toBe(r.indices);}}
}
export function frozenSurfaceDetail(s:Awaited<ReturnType<typeof surfaceDetailState>>){return s.targets.map((r:any)=>({id:r.id,attributes:r.attributes,position:r.position,quaternion:r.quaternion,scale:r.scale}));}
export async function surfaceDetailPrograms(page:Page){return page.evaluate(()=>(window as any).__surfaceDetail.targets.filter((r:any)=>r.program).map((r:any)=>r.program));}
export async function surfaceDetailDisposal(page:Page){return page.evaluate(()=>(window as any).__surfaceDetail.resources.map((r:any)=>({id:r.resource.uuid,disposed:r.disposed})));}

/** Find a nearby real colony and a clear walking segment, without changing the scene. */
export async function selectNativeCoralRoute(page:Page){
  return page.evaluate(()=>{
    const w=window as any,T=w.THREE,p=w.__nativeVisual,d=w.__surfaceDetail,origin={x:p.player.position.x,z:p.player.position.z};
    const rocks:any[]=[];p.record.scene.traverse((o:any)=>{if(o.isMesh&&o.visible&&o.userData.substrate==='rock'){const b=new T.Box3().setFromObject(o);rocks.push({minX:b.min.x-.7,maxX:b.max.x+.7,minZ:b.min.z-.7,maxZ:b.max.z+.7});}});
    const clear=(a:any,b:any)=>{for(let step=0;step<=80;step++){const t=step/80,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(rocks.some(r=>x>r.minX&&x<r.maxX&&z>r.minZ&&z<r.maxZ))return false;}return true;};
    const choices:any[]=[];
    for(const row of d.targets.filter((r:any)=>r.kind==='coral'&&r.mesh.visible&&r.mesh.userData.reefPlacementValid!==false)){
      const box=new T.Box3().setFromObject(row.mesh),center=box.getCenter(new T.Vector3()),radius=Math.hypot(box.max.x-box.min.x,box.max.z-box.min.z)/2;
      const distance=Math.hypot(center.x-origin.x,center.z-origin.z);if(distance>42)continue;
      const angle=Math.atan2(center.x-origin.x,center.z-origin.z),standOff=Math.max(2.3,radius+1.3);
      for(const offset of [0,.5,-.5,1,-1]){const a=angle+offset,target={x:center.x-Math.sin(a)*standOff,z:center.z-Math.cos(a)*standOff};
        if(clear(origin,target))choices.push({id:row.mesh.uuid,center:center.toArray(),standOff,target,distance:Math.hypot(target.x-origin.x,target.z-origin.z),form:row.geometry.userData.growthForm});
      }
    }
    choices.sort((a,b)=>a.distance-b.distance);if(!choices.length)throw Error('No clear direct native coral approach; preserve this baseline evidence before planning a waypoint route');
    d.route=choices[0];d.targetCoral=d.targets.find((r:any)=>r.mesh.uuid===d.route.id);return d.route;
  });
}

export async function approachNativeCoral(page:Page,route:any){
  await page.locator('canvas[role=application]').focus();const held=new Set<string>(),started=Date.now();
  const set=async(wanted:Set<string>)=>{for(const key of [...held])if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}};
  const positions:any[]=[];
  try{
    while(Date.now()-started<90000){
      const pose=await page.evaluate(()=>{const p=(window as any).__nativeVisual.player;return{x:p.position.x,y:p.position.y,z:p.position.z,yaw:p.rotation.y};});
      positions.push(pose);const dx=route.target.x-pose.x,dz=route.target.z-pose.z,distance=Math.hypot(dx,dz);if(distance<.32)return{positions,elapsedMs:Date.now()-started,finalDistance:distance};
      const desired=Math.atan2(dx,dz),error=Math.atan2(Math.sin(desired-pose.yaw),Math.cos(desired-pose.yaw)),keys=new Set<string>();
      if(Math.abs(error)>.12)keys.add(error>0?'KeyA':'KeyD');if(Math.abs(error)<.28)keys.add('KeyW');await set(keys);await nativeFrames(page,2);
    }
    throw Error('Native coral approach exceeded90s; last pose '+JSON.stringify(positions.at(-1)));
  }finally{await set(new Set());}
}

/** Project actual vertices; a first hit on the target confirms visible surface. */
export async function nativeCoralFraming(page:Page){
  return page.evaluate(()=>{
    const w=window as any,T=w.THREE,p=w.__nativeVisual,d=w.__surfaceDetail,row=d.targetCoral;if(!row)return null;
    const camera=d.camera||p.camera,mesh=row.mesh,stage=document.querySelector('.cl-hunt-stage')!.getBoundingClientRect(),g=mesh.geometry,point=new T.Vector3(),box={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    let front=true;const candidates:any[]=[];
    for(let i=0;i<g.attributes.position.count;i++){point.fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrixWorld);const world=point.clone();point.project(camera);front=front&&point.z>-1&&point.z<1;box.left=Math.min(box.left,(point.x+1)*stage.width/2);box.right=Math.max(box.right,(point.x+1)*stage.width/2);box.top=Math.min(box.top,(1-point.y)*stage.height/2);box.bottom=Math.max(box.bottom,(1-point.y)*stage.height/2);if(i%23===0)candidates.push({world,ndc:point.clone()});}
    const meshes:any[]=[];p.record.scene.traverse((o:any)=>{if(!o.isMesh)return;for(let ancestor=o;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return;meshes.push(o);});
    const ray=new T.Raycaster();let tested=0,visible=0;
    for(const target of candidates.slice(0,48)){if(Math.abs(target.ndc.x)>=1||Math.abs(target.ndc.y)>=1)continue;ray.setFromCamera(new T.Vector2(target.ndc.x,target.ndc.y),camera);const hit=ray.intersectObjects(meshes,false)[0];tested++;if(hit?.object===mesh)visible++;}
    return {id:mesh.uuid,form:g.userData.growthForm,...box,width:box.right-box.left,height:box.bottom-box.top,front,inside:front&&box.left>=0&&box.right<=stage.width&&box.top>=100&&box.bottom<=stage.height-65,testedRays:tested,visibleRays:visible,visibleFraction:tested?visible/tested:0,freshDraw:row.draw?.epoch===d.epoch,stage:{width:stage.width,height:stage.height},camera:camera.position.toArray(),player:p.player.position.toArray()};
  });
}

export async function findNativeCoralView(page:Page){
  const frames:any[]=[];
  for(let step=0;step<22;step++){
    await surfaceDetailState(page,true);const frame=await nativeCoralFraming(page);frames.push(frame);
    if(frame&&frame.inside&&frame.width>=100&&frame.height>=100&&frame.visibleRays>=4&&frame.visibleFraction>=.5&&frame.freshDraw)return{frame,attempts:frames};
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await nativeFrames(page,4);
  }
  throw Error('No useful native coral framing: '+JSON.stringify(frames));
}
