import {THREE, vec} from './dino_native_tail_harness.js';

// Intersect real closed mesh triangles along Z. The index is only an
// acceleration structure; containment does not use an anatomical proxy.
export function nativeMeshContains(mesh, tolerance) {
  mesh.updateMatrixWorld(true);
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
  const vertices=Array.from({length:p.count},(_,i)=>vec().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
  const box=new THREE.Box3().setFromPoints(vertices),cells=48,grid=new Map();
  const gx=x=>Math.max(0,Math.min(cells-1,Math.floor((x-box.min.x)/Math.max(1e-20,box.max.x-box.min.x)*(cells-1))));
  const gy=y=>Math.max(0,Math.min(cells-1,Math.floor((y-box.min.y)/Math.max(1e-20,box.max.y-box.min.y)*(cells-1))));
  for(let i=0;i<ix.count;i+=3){
    const a=vertices[ix.getX(i)],b=vertices[ix.getX(i+1)],c=vertices[ix.getX(i+2)];
    const d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
    if(Math.abs(d)<tolerance*tolerance*1e-8)continue;
    const tri={a,b,c,d};
    for(let x=gx(Math.min(a.x,b.x,c.x));x<=gx(Math.max(a.x,b.x,c.x));x++)for(let y=gy(Math.min(a.y,b.y,c.y));y<=gy(Math.max(a.y,b.y,c.y));y++){
      const key=x*cells+y,bucket=grid.get(key)||[];bucket.push(tri);grid.set(key,bucket);
    }
  }
  return point=>{
    if(point.x<box.min.x-tolerance||point.x>box.max.x+tolerance||point.y<box.min.y-tolerance||point.y>box.max.y+tolerance)return false;
    const crossings=[];
    for(const {a,b,c,d} of grid.get(gx(point.x)*cells+gy(point.y))||[]){
      const u=((b.y-c.y)*(point.x-c.x)+(c.x-b.x)*(point.y-c.y))/d;
      const v=((c.y-a.y)*(point.x-c.x)+(a.x-c.x)*(point.y-c.y))/d,w=1-u-v;
      if(u< -1e-7||v< -1e-7||w< -1e-7)continue;
      const z=u*a.z+v*b.z+w*c.z;
      if(!crossings.some(hit=>Math.abs(hit-z)<=tolerance))crossings.push(z);
    }
    crossings.sort((a,b)=>a-b);
    if(crossings.some(z=>Math.abs(z-point.z)<=tolerance))return true;
    // A nonconvex closed mesh can occupy several separate Z intervals.
    // Taking only the outermost pair fills real gaps between those solids.
    if(crossings.length%2===0){for(let i=0;i<crossings.length;i+=2)if(point.z>crossings[i]&&point.z<crossings[i+1])return true;return false;}
    // Tangency at a shared edge can leave an ambiguous odd crossing count.
    // Resolve it against the actual triangles along an independent direction.
    const hits=new THREE.Raycaster(point,vec(1,.371,.217).normalize()).intersectObject(mesh,false),distances=[];
    for(const hit of hits){if(hit.distance<=tolerance)return true;if(!distances.some(d=>Math.abs(d-hit.distance)<=tolerance))distances.push(hit.distance);}
    return distances.length%2===1;
  };
}
