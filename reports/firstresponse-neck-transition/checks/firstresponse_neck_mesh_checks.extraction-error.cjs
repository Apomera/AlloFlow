const assert=require('node:assert/strict');
function createNeckMeshChecks(THREE,check=(condition,message)=>assert.ok(condition,message),equal=(a,b,message)=>assert.deepEqual(a,b,message)){
const point=(mesh,index)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index);
function vertexKey(position) { return position.toArray().map(value => Math.round(value * 1e8)).join(','); }
function weldedShell(mesh) {
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  const keys = [], welded = new Map(), edges = new Map(), adjacency = new Map(), centre = new THREE.Vector3();
  let minimumCoincidentDot = 1, minimumNormalLength = Infinity, maximumNormalLength = 0, finite = true;
  for (let i = 0; i < positions.count; i++) {
    const p = point(mesh, i), n = new THREE.Vector3().fromBufferAttribute(normals, i);
    finite &&= [...p.toArray(), ...n.toArray()].every(Number.isFinite);
    minimumNormalLength = Math.min(minimumNormalLength, n.length()); maximumNormalLength = Math.max(maximumNormalLength, n.length());
    const key = vertexKey(p); keys.push(key);
    if (welded.has(key)) minimumCoincidentDot = Math.min(minimumCoincidentDot, n.dot(welded.get(key).normal));
    else { welded.set(key, { position: p, normal: n }); centre.add(p); }
  }
  centre.divideScalar(welded.size);
  let faces = 0, volume = 0, minimumFaceNormalDot = 1;
  const indices = mesh.geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i);
  for (let i = 0; i < indices.length; i += 3) {
    const ids = [indices[i], indices[i + 1], indices[i + 2]], triangle = ids.map(id => point(mesh, id));
    const cross = triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0]));
    if (new Set(ids.map(id => keys[id])).size < 3 || cross.lengthSq() < 1e-24) continue;
    faces++;
    volume += triangle[0].clone().sub(centre).dot(triangle[1].clone().sub(centre).cross(triangle[2].clone().sub(centre))) / 6;
    const vertexNormal = ids.reduce((sum, id) => sum.add(new THREE.Vector3().fromBufferAttribute(normals, id)), new THREE.Vector3()).normalize();
    minimumFaceNormalDot = Math.min(minimumFaceNormalDot, cross.normalize().dot(vertexNormal));
    for (let edge = 0; edge < 3; edge++) {
      const a = keys[ids[edge]], b = keys[ids[(edge + 1) % 3]], ordered = [a, b].sort(), key = ordered.join('|');
      const entry = edges.get(key) || { count: 0, balance: 0 }; entry.count++; entry.balance += a === ordered[0] ? 1 : -1; edges.set(key, entry);
      if (!adjacency.has(a)) adjacency.set(a, new Set()); if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b); adjacency.get(b).add(a);
    }
  }
  const reached = new Set(), queue = [adjacency.keys().next().value];
  while (queue.length) { const key = queue.pop(); if (reached.has(key)) continue; reached.add(key); queue.push(...adjacency.get(key)); }
  return { welded, edges, faces, volume, minimumCoincidentDot, minimumNormalLength, maximumNormalLength, finite, minimumFaceNormalDot,
    connected: reached.size === adjacency.size, euler: adjacency.size - edges.size + faces };
}
function model(config,settings){
 const allocatedGeometries=[],allocatedMaterials=[],tracked={...THREE};
 for(const key of Object.keys(THREE)){if(typeof THREE[key]!=='function')continue;const values=/Geometry$/.test(key)?allocatedGeometries:/Material$/.test(key)?allocatedMaterials:null;if(values)tracked[key]=new Proxy(THREE[key],{construct(target,args){const result=Reflect.construct(target,args);values.push(result);return result;}});}
 const {age,phase,contrast}=settings,scene=new THREE.Scene();
 const content=config.buildScene(tracked,{scene,phase,dark:true,contrast,wantShadow:false,trim:(color,shininess)=>new tracked.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688}),sceneProps:{age,tab:'recovery',recoveryGuides:true}});
 const sample=()=>{content.frame(0,{},true);scene.updateMatrixWorld(true);};sample();
 const neck=scene.getObjectByName('fr-manikin-neck');assert.ok(neck);
 return {scene,content,neck,sample,allocatedGeometries,allocatedMaterials};
}
function resources(model){const geometries=new Set(model.allocatedGeometries),materials=new Set(model.allocatedMaterials);model.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});return{geometries,materials};}
function disposeOnce(model){const {geometries,materials}=resources(model),events=new Map();for(const resource of [...geometries,...materials]){events.set(resource,0);resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));}for(const resource of events.keys())resource.dispose();equal([...events.values()],[...events.keys()].map(()=>1),'each unique geometry and material disposes exactly once');return{geometries:geometries.size,materials:materials.size,allocatedGeometries:model.allocatedGeometries.length,allocatedMaterials:model.allocatedMaterials.length};}
function shell(model){const neck=model.neck,p=neck.geometry.attributes.position,n=neck.geometry.attributes.normal,s=weldedShell(neck);check(s.finite,'finite neck positions and normals');check(s.connected,'connected closed neck shell');equal(s.euler,2,'neck shell retains genus zero');check([...s.edges.values()].every(e=>e.count===2&&e.balance===0),'closed neck triangle winding');check(s.volume>0,'outward signed neck volume');check(s.minimumFaceNormalDot>0,'all neck vertex normals agree with outward faces');check(s.minimumNormalLength>.9999&&s.maximumNormalLength<1.0001,'unit finite neck normals');
 const {radialSegments,heightSegments}=neck.geometry.parameters;equal(radialSegments,24,'radial segment count');equal(heightSegments,16,'height segment count');let seamMinimumNormalDot=1,seamMaximumPositionGap=0;
 for(let row=0;row<=heightSegments;row++){const a=row*(radialSegments+1),b=a+radialSegments;const gap=point(neck,a).distanceTo(point(neck,b)),dot=new THREE.Vector3().fromBufferAttribute(n,a).dot(new THREE.Vector3().fromBufferAttribute(n,b));seamMaximumPositionGap=Math.max(seamMaximumPositionGap,gap);seamMinimumNormalDot=Math.min(seamMinimumNormalDot,dot);check(gap<1e-8,'neck side seam vertices coincide');check(dot>.9999,'neck side seam normals meet smoothly');}
 return {vertices:p.count,triangles:neck.geometry.index.count/3,euler:s.euler,volume:s.volume,minimumFaceNormalDot:s.minimumFaceNormalDot,minimumNormalLength:s.minimumNormalLength,maximumNormalLength:s.maximumNormalLength,seamMinimumNormalDot,seamMaximumPositionGap};}
function actualInside(world,target,scale){
 const box=new THREE.Box3().setFromObject(target),distance=box.getSize(new THREE.Vector3()).length()+scale;
 const directions=[new THREE.Vector3(.271,.713,.647).normalize(),new THREE.Vector3(.841,.193,.505).normalize(),new THREE.Vector3(.397,.884,.247).normalize()];
 const material=target.material,savedSide=material.side;material.side=THREE.DoubleSide;
 try{for(let attempt=0;attempt<directions.length;attempt++){
  const direction=directions[attempt],origin=world.clone().addScaledVector(direction,-distance);check(!box.containsPoint(origin),'containment ray origin lies outside actual target bounds');
  const hits=new THREE.Raycaster(origin,direction).intersectObject(target,false),unique=[];
  for(const hit of hits)if(!unique.length||Math.abs(hit.distance-unique.at(-1).distance)>1e-8*scale)unique.push(hit);
  if(unique.length%2)continue;
  for(let i=0;i<unique.length;i+=2){const entry=unique[i],exit=unique[i+1];if(entry.distance<distance&&exit.distance>distance){return{inside:true,entryMargin:(distance-entry.distance)/scale,exitMargin:(exit.distance-distance)/scale,entryFace:entry.faceIndex,exitFace:exit.faceIndex,attempt};}}
  if(attempt===directions.length-1)return{inside:false,intersections:unique.map(hit=>({distance:hit.distance/scale,face:hit.faceIndex})),pointDistance:distance/scale};
 }return{inside:false,oddIntersections:true};}finally{material.side=savedSide;}
}
function capSamples(neck,end){const geometry=neck.geometry,radial=geometry.parameters.radialSegments,height=geometry.parameters.heightSegments,group=geometry.groups[end==='head'?1:2];equal(group.materialIndex,end==='head'?1:2,'native cylinder cap group');const indices=geometry.index.array,ids=new Set(Array.from(indices.slice(group.start,group.start+group.count)));const ring=(end==='head'?0:height)*(radial+1),samples=[];
 for(const id of ids)samples.push({kind:'capVertex',index:id,local:point(neck,id)});
 for(let i=0;i<=radial;i++)samples.push({kind:'perimeterVertex',index:ring+i,local:point(neck,ring+i)});
 for(let i=group.start;i<group.start+group.count;i+=3)samples.push({kind:'capTriangleCentroid',triangle:i/3,local:point(neck,indices[i]).add(point(neck,indices[i+1])).add(point(neck,indices[i+2])).divideScalar(3)});
 return samples;
}
function caps(model,settings){return {model,resources,disposeOnce,shell,caps};
}
module.exports={createNeckMeshChecks};
