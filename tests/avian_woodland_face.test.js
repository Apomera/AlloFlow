import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local={};
Function('window',readFileSync('stem_lab/avian_woodland_birds.js','utf8'))(local);
const cases=[['mourningDove','low'],['mourningDove','high'],['grouse','low'],['grouse','high']];

function components(mesh) {
  const geometry=mesh.geometry,position=geometry.attributes.position,color=geometry.attributes.color,index=geometry.index.array;
  const parent=Array.from({length:position.count},(_,i)=>i);
  function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
  function join(a,b){parent[find(a)]=find(b);}
  for(let triangle=0;triangle<index.length;triangle+=3){join(index[triangle],index[triangle+1]);join(index[triangle],index[triangle+2]);}
  const groups=new Map(),point=new THREE.Vector3();
  for(let vertex=0;vertex<position.count;vertex++) {
    const key=find(vertex);
    if(!groups.has(key))groups.set(key,{key,vertices:[],center:new THREE.Vector3(),bounds:new THREE.Box3(),color:new THREE.Vector3()});
    const group=groups.get(key);group.vertices.push(vertex);point.fromBufferAttribute(position,vertex);
    group.center.add(point);group.bounds.expandByPoint(point);group.color.add(new THREE.Vector3().fromBufferAttribute(color,vertex));
  }
  for(const group of groups.values()){group.center.divideScalar(group.vertices.length);group.color.divideScalar(group.vertices.length);}
  return {groups:[...groups.values()],atFace(faceIndex){return groups.get(find(index[faceIndex*3]));}};
}

describe('Shared woodland bird face anatomy',()=>{
  it.each(cases)('keeps exactly two eyes, two surrounding rings and one attached bill for %s (%s)',(id,quality)=>{
    const bird=local.AvianWoodlandBirds.create(THREE,id,{quality});
    try{
      const face=bird.root.getObjectByName('woodland-eyes-and-bill'),skull=bird.root.getObjectByName('woodland-head-plumage');
      const parts=components(face).groups;
      // Count topology rather than object names: the face intentionally shares
      // one draw call, and a second cheek sphere would create another component.
      expect(parts).toHaveLength(5);
      const bill=parts.filter(part=>Math.abs(part.center.x)<.001);expect(bill).toHaveLength(1);
      const eyes=[];
      for(const side of [-1,1]){
        const pair=parts.filter(part=>side*part.center.x>.005).sort((a,b)=>a.color.length()-b.color.length());
        expect(pair).toHaveLength(2);const [eye,ring]=pair;eyes.push(eye);
        expect(eye.color.length()).toBeLessThan(.02);expect(ring.color.length()).toBeGreaterThan(eye.color.length()*8);
        expect(eye.center.y).toBeCloseTo(ring.center.y,8);
        expect(eye.center.z-ring.center.z).toBeCloseTo(.0002,8);
        expect(side*(eye.center.x-ring.center.x)).toBeCloseTo(.0006,8);
        expect(eye.center.y).toBeGreaterThan(0);expect(eye.center.z).toBeGreaterThan(0);
        expect(eye.bounds.max.y).toBeLessThan(ring.bounds.max.y);
        expect(eye.bounds.min.y).toBeGreaterThan(ring.bounds.min.y);
        expect(eye.bounds.max.z).toBeLessThan(ring.bounds.max.z);
        expect(eye.bounds.min.z).toBeGreaterThan(ring.bounds.min.z);
      }
      expect(eyes[0].center.x).toBeCloseTo(-eyes[1].center.x,8);
      expect(eyes[0].center.y).toBeCloseTo(eyes[1].center.y,8);
      expect(eyes[0].center.z).toBeCloseTo(eyes[1].center.z,8);
      skull.geometry.computeBoundingBox();
      expect(bill[0].bounds.min.z).toBeLessThan(skull.geometry.boundingBox.max.z);
      expect(bill[0].bounds.max.z).toBeGreaterThan(skull.geometry.boundingBox.max.z+.01);
      expect(Math.abs(bill[0].bounds.max.x+bill[0].bounds.min.x)).toBeLessThan(1e-8);
      expect(skull.material.roughness).toBeGreaterThan(face.material.roughness);
    }finally{bird.dispose();}
  });

  it.each(cases)('shows only the near eye in side views and occludes the far eye through %s head poses (%s)',(id,quality)=>{
    const bird=local.AvianWoodlandBirds.create(THREE,id,{quality}),ray=new THREE.Raycaster();
    try{
      const face=bird.root.getObjectByName('woodland-eyes-and-bill'),skull=bird.root.getObjectByName('woodland-head-plumage');
      const topology=components(face),eyes=topology.groups.filter(part=>Math.abs(part.center.x)>.005&&part.color.length()<.02);
      expect(eyes).toHaveLength(2);
      for(const pose of [{lookYaw:0,lookPitch:0},{lookYaw:.4,lookPitch:.2},{peck:1}]){
        bird.update(pose);bird.root.updateMatrixWorld(true);
        for(const side of [-1,1]){
          const near=eyes.find(part=>part.center.x*side>0),far=eyes.find(part=>part.center.x*side<0);
          const origin=new THREE.Vector3(side*.12,near.center.y,near.center.z).applyMatrix4(bird.head.matrixWorld);
          const nearTarget=near.center.clone().applyMatrix4(bird.head.matrixWorld);
          ray.set(origin,nearTarget.clone().sub(origin).normalize());
          const nearest=ray.intersectObjects([face,skull],false)[0];
          expect(nearest.object).toBe(face);expect(topology.atFace(nearest.faceIndex)).toBe(near);
          const farTarget=far.center.clone().applyMatrix4(bird.head.matrixWorld);
          ray.set(origin,farTarget.clone().sub(origin).normalize());
          const obstruction=ray.intersectObject(skull,false)[0];
          expect(obstruction).toBeTruthy();expect(obstruction.distance).toBeLessThan(origin.distanceTo(farTarget));
        }
      }
    }finally{bird.dispose();}
  });
});
