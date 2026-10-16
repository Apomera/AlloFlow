import {Page} from '@playwright/test';

// Observation-only supplement to the accepted native visual helper.
export async function installCuttleCoralProbe(page:Page){
  await page.evaluate(()=>{
    const w=window as any,p=w.__nativeVisual,T=w.THREE,rows:any[]=[],programs=new Map(),resources:any[]=[];
    const hash=(a:any)=>{let h=2166136261;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength)){h^=b;h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
    p.record.scene.traverse((mesh:any)=>{
      if(!mesh.isMesh||!['cl-mantle','cl-fin--1','cl-fin-1','cl-coral-colony'].includes(mesh.name))return;
      const row={mesh,geometry:mesh.geometry,material:mesh.material,key:mesh.material.customProgramCacheKey(),firstBuffer:null as any,draws:0,epoch:0,sample:null as any,
        arrays:Object.entries(mesh.geometry.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array,hash:hash(a.array)})),index:mesh.geometry.index,indexArray:mesh.geometry.index?.array,indexHash:mesh.geometry.index?hash(mesh.geometry.index.array):null};rows.push(row);
      for(const resource of [mesh.geometry,mesh.material])if(!resources.some(r=>r.resource===resource)){const r={resource,count:0};resources.push(r);resource.addEventListener('dispose',()=>r.count++);}
      const previous=mesh.onAfterRender;
      mesh.onAfterRender=function(renderer:any,scene:any,camera:any,geometry:any,material:any,group:any){
        previous.call(this,renderer,scene,camera,geometry,material,group);row.draws++;if(row.epoch===p.epoch)return;row.epoch=p.epoch;
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),position=gl.getAttribLocation(program,'position'),buffer=position<0?null:gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);if(!row.firstBuffer)row.firstBuffer=buffer;
        if(!programs.has(mesh.uuid))programs.set(mesh.uuid,{name:mesh.name,id:mesh.uuid,material:material.name,key:material.customProgramCacheKey(),linked:gl.getProgramParameter(program,gl.LINK_STATUS),shaders:(gl.getAttachedShaders(program)||[]).map((s:any)=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),source:gl.getShaderSource(s)}))});
        const loc=gl.getUniformLocation(program,'normalMatrix'),normal=loc===null?null:Array.from(gl.getUniform(program,loc));
        row.sample={epoch:p.epoch,sameGeometry:geometry===row.geometry,enabled:position>=0&&!!gl.getVertexAttrib(position,gl.VERTEX_ATTRIB_ARRAY_ENABLED),retainedBuffer:!!buffer&&buffer===row.firstBuffer,normal,determinant:normal?new T.Matrix3().fromArray(normal).determinant():null};
      };
    });w.__cuttleCoralProbe={rows,programs,resources,hash};
  });
}

export async function cuttleCoralState(page:Page){return page.evaluate(()=>{
  const w=window as any,p=w.__nativeVisual,q=w.__cuttleCoralProbe,T=w.THREE,camera=p.camera,canvas=p.record.canvas,rocks:any[]=[];
  p.record.scene.traverse((m:any)=>{if(m.isMesh&&m.visible&&m.userData.substrate==='rock'&&m.userData.reefFootprint){const f=m.userData.reefFootprint;rocks.push({minX:m.position.x+f.minX-.6,maxX:m.position.x+f.maxX+.6,minZ:m.position.z+f.minZ-.6,maxZ:m.position.z+f.maxZ+.6});}});
  const blocked=(target:any)=>{const start=p.player.position,dx=target.x-start.x,dz=target.z-start.z;return rocks.some(b=>{let low=0,high=1;for(const [v,d,min,max] of [[start.x,dx,b.minX,b.maxX],[start.z,dz,b.minZ,b.maxZ]]){if(Math.abs(d)<1e-8){if(v<min||v>max)return false;}else{const a=(min-v)/d,c=(max-v)/d;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));if(low>high)return false;}}return true;});};
  return {player:p.player.position.toArray(),yaw:p.player.rotation.y,camera:camera?.position.toArray(),epoch:p.epoch,programs:[...q.programs.values()],resources:q.resources.map((r:any)=>({type:r.resource.type,uuid:r.resource.uuid,count:r.count})),meshes:q.rows.map((r:any)=>{
    const m=r.mesh,box=new T.Box3().setFromObject(m),center=box.getCenter(new T.Vector3()),corners=[];
    for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)corners.push(new T.Vector3(x?box.max.x:box.min.x,y?box.max.y:box.min.y,z?box.max.z:box.min.z).project(camera));
    const left=Math.min(...corners.map(v=>v.x)),right=Math.max(...corners.map(v=>v.x)),bottom=Math.min(...corners.map(v=>v.y)),top=Math.max(...corners.map(v=>v.y));
    const projected=center.clone().project(camera),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(projected.x,projected.y),camera);
    const hits=(m.name==='cl-coral-colony'&&Math.abs(projected.x)<.8&&Math.abs(projected.y)<.8&&projected.z>-1&&projected.z<1?ray.intersectObjects(p.record.scene.children,true):[]).filter((h:any)=>h.object.visible&&h.object.isMesh&&h.object.material?.opacity!==0&&h.object.material?.transparent!==true);
    let visibleSurfaceRays=0,testedSurfaceRays=0;
    if(m.name==='cl-coral-colony'&&Math.abs(projected.x)<.8&&Math.abs(projected.y)<.8&&projected.z>-1&&projected.z<1&&(right-left)*canvas.clientWidth/2>=40){
      const positions=m.geometry.attributes.position,index=m.geometry.index,triangles=Math.floor((index?.count||positions.count)/3);
      for(let j=0;j<9;j++){const triangle=Math.min(triangles-1,Math.floor(triangles*(j+.5)/9)),point=new T.Vector3();for(let k=0;k<3;k++)point.add(new T.Vector3().fromBufferAttribute(positions,index?index.getX(triangle*3+k):triangle*3+k));point.multiplyScalar(1/3).applyMatrix4(m.matrixWorld).project(camera);if(Math.abs(point.x)>.9||Math.abs(point.y)>.9||point.z<=-1||point.z>=1)continue;testedSurfaceRays++;ray.setFromCamera(new T.Vector2(point.x,point.y),camera);const first=ray.intersectObjects(p.record.scene.children,true).find((h:any)=>h.object.visible&&h.object.isMesh&&h.object.material?.opacity!==0&&h.object.material?.transparent!==true);if(first?.object===m)visibleSurfaceRays++;}
    }
    return {name:m.name,id:m.uuid,form:m.geometry.userData.growthForm,visible:m.visible,placementValid:m.userData.reefPlacementValid!==false,directPathClear:m.name==='cl-coral-colony'?!blocked(m.position):null,position:m.position.toArray(),scale:m.scale.toArray(),quaternion:m.quaternion.toArray(),transformHash:q.hash(new Float64Array(m.matrix.elements)),center:center.toArray(),distance:Math.hypot(m.position.x-p.player.position.x,m.position.z-p.player.position.z),draws:r.draws,sample:r.sample,key:m.material.customProgramCacheKey(),vertices:m.geometry.attributes.position.count,indices:m.geometry.index?.count,
      retained:m.geometry===r.geometry&&m.material===r.material&&m.material.customProgramCacheKey()===r.key&&m.geometry.index===r.index&&m.geometry.index?.array===r.indexArray&&r.arrays.every((a:any)=>m.geometry.attributes[a.name]===a.a&&a.a.array===a.array),
      static:m.name!=='cl-coral-colony'||(r.arrays.every((a:any)=>q.hash(a.array)===a.hash)&&(!r.indexArray||q.hash(r.indexArray)===r.indexHash)),
      finite:m.matrixWorld.elements.every(Number.isFinite)&&r.arrays.every((a:any)=>Array.from(a.array).every(Number.isFinite)),
      attributes:r.arrays.map((a:any)=>({name:a.name,count:a.a.count,hash:q.hash(a.array)})),
      bounds:{left,right,bottom,top,center:projected.toArray(),widthPixels:(right-left)*canvas.clientWidth/2,heightPixels:(top-bottom)*canvas.clientHeight/2,centerRayFirst:hits[0]?.object.name||null,centerRaySelf:hits[0]?.object===m,testedSurfaceRays,visibleSurfaceRays}};
  })};
});}

export async function coralNavigationState(page:Page,id:string){return page.evaluate(id=>{
  const w=window as any,p=w.__nativeVisual,m=w.__cuttleCoralProbe.rows.find((r:any)=>r.mesh.uuid===id).mesh;
  const dx=m.position.x-p.player.position.x,dz=m.position.z-p.player.position.z,angle=Math.atan2(dx,dz)-p.player.rotation.y;
  return {distance:Math.hypot(dx,dz),angle:Math.atan2(Math.sin(angle),Math.cos(angle)),position:p.player.position.toArray()};
},id);}
