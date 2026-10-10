const assert=require('node:assert/strict');
function createCollarMeshChecks(THREE,check=(value,message)=>assert.ok(value,message),equal=(a,b,message)=>assert.deepEqual(a,b,message)){
  const point=(mesh,i)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);
  const key=p=>p.toArray().map(v=>Math.round(v*1e8)).join(',');
  function rings(mesh){
    const p=mesh.geometry.attributes.position,values=[];
    check((p.count-2)%41===0,'torso retains 40 radial intervals and two cap centres');
    for(let start=0;start<p.count-2;start+=41)values.push({start,z:p.getZ(start),radius:p.getX(start)});
    return values;
  }
  function scale(mesh){const r=rings(mesh);return{width:Math.max(...r.map(v=>v.radius))/.56,torso:r.at(-1).z/.94};}
  function density(mesh){
    const r=rings(mesh),s=scale(mesh),sections=[[-.91,.16],[-.75,.38],[-.55,.56]];
    let maximumChordError=0,maximumLongitudinalSpan=0,intervals=0;
    for(let i=0;i<r.length-1;i++){
      const a=r[i],b=r[i+1],z=(a.z+b.z)/2/s.torso;if(z>=-.55)continue;
      const section=z<-.75?0:1,[za,ra]=sections[section],[zb,rb]=sections[section+1];
      const u=(z-za)/(zb-za),reference=ra+(rb-ra)*u*u*(3-2*u);
      const chord=(a.radius+b.radius)/2/s.width;
      maximumChordError=Math.max(maximumChordError,Math.abs(chord-reference));
      maximumLongitudinalSpan=Math.max(maximumLongitudinalSpan,(b.z-a.z)/s.torso);intervals++;
    }
    // Bound geometric approximation of the accepted collar silhouette. The
    // previous sparse mesh misses the profile by more than 0.005 local units.
    check(maximumChordError<.00045,'collar longitudinal chord error stays below 0.00045 local width units');
    check(maximumLongitudinalSpan<.01001,'collar silhouette has no longitudinal span above 0.01001 torso units');
    return{intervals,maximumChordError,maximumLongitudinalSpan};
  }
  function topology(mesh){
    const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,idx=mesh.geometry.index.array;
    const keys=[],positions=new Map(),edges=new Map(),adjacent=new Map();let volume=0,minNormal=Infinity,maxNormal=0,minFaceDot=1;
    for(let i=0;i<p.count;i++){
      const pt=point(mesh,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);
      check([...pt.toArray(),...normal.toArray()].every(Number.isFinite),'finite torso positions and normals');
      minNormal=Math.min(minNormal,normal.length());maxNormal=Math.max(maxNormal,normal.length());keys.push(key(pt));positions.set(keys[i],pt);
    }
    let faces=0;
    for(let i=0;i<idx.length;i+=3){
      const ids=[idx[i],idx[i+1],idx[i+2]],pts=ids.map(id=>point(mesh,id)),cross=pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0]));
      check(new Set(ids.map(id=>keys[id])).size===3&&cross.lengthSq()>1e-24,'torso triangles are nondegenerate');faces++;
      volume+=pts[0].dot(pts[1].clone().cross(pts[2]))/6;
      const normal=ids.reduce((v,id)=>v.add(new THREE.Vector3().fromBufferAttribute(n,id)),new THREE.Vector3()).normalize();
      minFaceDot=Math.min(minFaceDot,cross.normalize().dot(normal));
      for(let j=0;j<3;j++){
        const a=keys[ids[j]],b=keys[ids[(j+1)%3]],ordered=[a,b].sort(),id=ordered.join('|'),edge=edges.get(id)||{count:0,balance:0};
        edge.count++;edge.balance+=a===ordered[0]?1:-1;edges.set(id,edge);
        if(!adjacent.has(a))adjacent.set(a,new Set());if(!adjacent.has(b))adjacent.set(b,new Set());adjacent.get(a).add(b);adjacent.get(b).add(a);
      }
    }
    check([...edges.values()].every(e=>e.count===2&&e.balance===0),'torso forms one closed shell with opposing edge winding');
    const reached=new Set(),queue=[adjacent.keys().next().value];while(queue.length){const id=queue.pop();if(reached.has(id))continue;reached.add(id);queue.push(...adjacent.get(id));}
    equal(reached.size,adjacent.size,'torso is connected');equal(positions.size-edges.size+faces,2,'torso retains genus zero');
    check(volume>0,'torso triangle winding faces outward');check(minFaceDot>0,'torso shading normals agree with outward faces');
    check(minNormal>.9999&&maxNormal<1.0001,'torso normals remain unit length');
    let minimumSeamDot=1,maximumSeamGap=0;
    for(const {start}of rings(mesh)){
      const end=start+40,gap=point(mesh,start).distanceTo(point(mesh,end));
      const dot=new THREE.Vector3().fromBufferAttribute(n,start).dot(new THREE.Vector3().fromBufferAttribute(n,end));
      maximumSeamGap=Math.max(maximumSeamGap,gap);minimumSeamDot=Math.min(minimumSeamDot,dot);
      check(gap<1e-8,'torso side seam positions coincide');check(dot>.9999,'torso side seam normals meet smoothly');
    }
    return{vertices:p.count,triangles:idx.length/3,volume,minimumNormalLength:minNormal,maximumNormalLength:maxNormal,minimumFaceNormalDot:minFaceDot,minimumSeamDot,maximumSeamGap};
  }
  function inside(target,world){
    const box=new THREE.Box3().setFromObject(target),distance=box.getSize(new THREE.Vector3()).length()+1,saved=target.material.side;
    target.material.side=THREE.DoubleSide;
    try{for(const values of [[.217,.871,.321],[.271,.713,.647],[.841,.193,.505]]){
      const direction=new THREE.Vector3(...values).normalize(),origin=world.clone().addScaledVector(direction,-distance),hits=new THREE.Raycaster(origin,direction).intersectObject(target,false),unique=[];
      for(const hit of hits)if(!unique.length||Math.abs(hit.distance-unique.at(-1))>1e-8)unique.push(hit.distance);
      if(unique.length%2)continue;for(let i=0;i<unique.length;i+=2)if(unique[i]<distance-1e-7&&unique[i+1]>distance+1e-7)return true;
    }return false;}finally{target.material.side=saved;}
  }
  function sleeves(model){
    const torso=model.scene.getObjectByName('fr-manikin-torso');let samples=0;
    for(const side of ['left','right']){
      const sleeve=model.scene.getObjectByName('fr-patient-'+side+'-sleeve');check(!!sleeve,'patient sleeve exists');
      equal(sleeve.material,torso.material,'sleeves retain the torso finish');
      const count=sleeve.geometry.parameters.radialSegments;
      for(let i=0;i<count;i++){
        const a=point(sleeve,i).applyMatrix4(sleeve.matrixWorld),b=point(sleeve,(i+1)%count).applyMatrix4(sleeve.matrixWorld);
        for(const p of [a,a.clone().lerp(b,.5)]){check(inside(torso,p),'actual sleeve root vertex/midpoint stays buried in current torso');samples++;}
      }
    }return{samples};
  }
  function coveredSide(model,settings,assertBuried=true){
    const neck=model.neck,torso=model.scene.getObjectByName('fr-manikin-torso'),profileTorso=settings.age==='infant'?.86:settings.age==='child'?.94:1,cut=-.91*profileTorso;
    const positions=neck.geometry.attributes.position,indices=neck.geometry.index.array,group=neck.geometry.groups[0],samples=new Map();
    const p=i=>new THREE.Vector3().fromBufferAttribute(positions,i);
    function add(local,kind){const world=local.clone().applyMatrix4(neck.matrixWorld),body=neck.parent.worldToLocal(world.clone());if(body.z<=cut+1e-7)return;const id=key(local);if(!samples.has(id))samples.set(id,{kind,world,body});}
    const parameters=neck.geometry.parameters;
    for(let i=0;i<(parameters.radialSegments+1)*(parameters.heightSegments+1);i++)add(p(i),'vertex');
    for(let i=group.start;i<group.start+group.count;i+=3){const tri=[p(indices[i]),p(indices[i+1]),p(indices[i+2])];add(tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3),'centroid');for(let j=0;j<3;j++)add(tri[j].clone().add(tri[(j+1)%3]).multiplyScalar(.5),'edge midpoint');}
    const failures=[];for(const sample of samples.values())if(!inside(torso,sample.world))failures.push({kind:sample.kind,body:sample.body.toArray(),world:sample.world.toArray()});
    check(samples.size>1000,'covered-neck gate samples the actual side vertices, triangle centroids and edge midpoints');
    if(assertBuried)check(failures.length===0,'covered neck sides stay beneath actual collar triangles behind the shirt opening');
    return{cut,samples:samples.size,outside:failures.length,failures};
  }
  function preserveTorso(before,after,settings){
    const a=before.geometry,b=after.geometry,oldRings=rings(before),newRings=rings(after),s=scale(before),boundary=oldRings[10].z,collarEnd=oldRings[5].z;
    const openingDepth=settings.age==='infant'?.19:.15;
    a.computeBoundingBox();b.computeBoundingBox();equal(b.boundingBox.min.toArray(),a.boundingBox.min.toArray(),'torso lower bounds unchanged');equal(b.boundingBox.max.toArray(),a.boundingBox.max.toArray(),'torso upper bounds unchanged');
    const byZ=new Map(newRings.map(r=>[r.z,r]));let retainedRings=0,boundaryMaximumNormalDifference=0,maximumOpeningDepthChange=0;
    for(const old of oldRings){const row=byZ.get(old.z);check(!!row,'each accepted torso ring remains present');
      for(let j=0;j<=40;j++){const oldPoint=point(before,old.start+j),newPoint=point(after,row.start+j);
        equal([newPoint.x,newPoint.z],[oldPoint.x,oldPoint.z],'all accepted torso section widths and lengths remain exact');
        if(old.z>=collarEnd)equal(newPoint.toArray(),oldPoint.toArray(),'all accepted torso sections from the end of the opening interval remain exact');
        else{const u=(old.z-oldRings[0].z)/(collarEnd-oldRings[0].z),depth=openingDepth+(.20-openingDepth)*u*u*(3-2*u),expectedY=Math.sin(j/40*Math.PI*2)*depth;
          check(Math.abs(newPoint.y-expectedY)<1e-7,'only the first collar interval gains the specified age-scaled opening depth');maximumOpeningDepthChange=Math.max(maximumOpeningDepthChange,Math.abs(newPoint.y-oldPoint.y));}
        if(old.z>boundary)equal(new THREE.Vector3().fromBufferAttribute(b.attributes.normal,row.start+j).toArray(),new THREE.Vector3().fromBufferAttribute(a.attributes.normal,old.start+j).toArray(),'chest normals strictly past collar boundary remain exact');
        if(old.z===boundary)boundaryMaximumNormalDifference=Math.max(boundaryMaximumNormalDifference,new THREE.Vector3().fromBufferAttribute(b.attributes.normal,row.start+j).distanceTo(new THREE.Vector3().fromBufferAttribute(a.attributes.normal,old.start+j)));
      }retainedRings++;
    }
    function chestTriangles(mesh){const out=[],p=mesh.geometry.attributes.position,idx=mesh.geometry.index.array;
      for(let i=0;i<idx.length;i+=3){const ids=[idx[i],idx[i+1],idx[i+2]];if(ids.every(id=>p.getZ(id)>=boundary))out.push(ids.map(id=>point(mesh,id).toArray()));}return out;}
    equal(chestTriangles(after),chestTriangles(before),'all chest positions and triangle connectivity at and beyond collar boundary remain exact');
    equal(b.groups,a.groups,'torso draw groups unchanged');equal(b.drawRange,a.drawRange,'torso draw range unchanged');equal(Object.keys(b.attributes),Object.keys(a.attributes),'torso attributes unchanged');
    return{retainedRings,openingDepth,maximumOpeningDepthChange,boundaryNormalizedZ:boundary/s.torso,boundaryMaximumNormalDifference,chestTriangles:chestTriangles(after).length};
  }
  function stable(model){
    const mesh=model.scene.getObjectByName('fr-manikin-torso'),g=mesh.geometry,m=mesh.material,p=g.attributes.position,n=g.attributes.normal,index=g.index;
    const arrays=[p.array,n.array,index.array],counts=[model.allocatedGeometries.length,model.allocatedMaterials.length];
    model.sample();model.sample();
    check(mesh.geometry===g&&mesh.material===m,'torso geometry and material stay stable across frames');
    check(g.attributes.position===p&&g.attributes.normal===n&&g.index===index,'torso attributes stay stable across frames');
    check(p.array===arrays[0]&&n.array===arrays[1]&&index.array===arrays[2],'torso buffer arrays stay stable across frames');
    equal([model.allocatedGeometries.length,model.allocatedMaterials.length],counts,'no geometry or material allocations during frames');
  }
  return{density,topology,sleeves,coveredSide,preserveTorso,stable};
}
module.exports={createCollarMeshChecks};
