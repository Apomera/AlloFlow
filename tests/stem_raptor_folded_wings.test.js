import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
function fixture(primaryFingers){const profile={primaryFingers,sweep:-0.18,tipWidth:0.68};return Function('THREE','silhouetteProfile',`var wingSpan=2.8,wingDepth=0.72,graphicsQuality='low',isOspreyWing=false,wingMorphMeshes=[],wingColor=0x75533b;
${['sampleRaptorWingSurface','createTaperedWing','createTaperedPrimaryGeometry','createWingMarkGeometry','createLayeredWingFeathers','foldedRaptorWingPoint','addRaptorWingRestPose'].map(body).join('\n')}
return {point:foldedRaptorWingPoint,wing:createTaperedWing,primary:createTaperedPrimaryGeometry,mark:createWingMarkGeometry,vanes:createLayeredWingFeathers,add:addRaptorWingRestPose};`)(THREE,profile);}
describe('Coordinated resting wing surfaces',()=>{
  for(const fingers of [0,4])it('keeps folded surfaces mirrored, finite, and outside the body for '+fingers+' primaries',()=>{
    const f=fixture(fingers);
    for(let u=0;u<=10;u++)for(let v=0;v<=8;v++){
      const x=u/10*2.8,z=(v/8-0.5)*0.5,left=f.point(-x,0.10,z,-1),right=f.point(x,0.10,z,1);
      expect(left.x).toBe(-right.x);expect(left.y).toBe(right.y);expect(left.z).toBe(right.z);expect(Object.values(right).every(Number.isFinite)).toBe(true);
      expect(Math.abs(right.x)).toBeLessThan(0.42);
      if(Math.abs(right.z)<0.55)expect((right.x**2+right.y**2)/0.245**2+right.z**2/0.63**2).toBeGreaterThan(1);
    }
  });
  it('preserves open vertices and makes aligned morphs for wing surfaces, marks, and offset quill pivots',()=>{
    const f=fixture(4);
    for(const side of [-1,1])for(const kind of ['wing','mark','primary','vanes']){
      const geometry=kind==='vanes'?f.vanes(side,10):kind==='wing'?f.wing(side):kind==='mark'?f.mark(side,0.18,0.58,0.65,0.045):f.primary(side,2,4);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
      if(kind==='primary'){const p=geometry.attributes.position,root=new THREE.Vector3((p.getX(0)+p.getX(1))/2,(p.getY(0)+p.getY(1))/2,(p.getZ(0)+p.getZ(1))/2);geometry.translate(-root.x,-root.y,-root.z);mesh.position.copy(root);}
      const before=Array.from(geometry.attributes.position.array);f.add(mesh,side);expect(Array.from(geometry.attributes.position.array)).toEqual(before);
      const open=geometry.attributes.position,closed=geometry.morphAttributes.position[0],normal=geometry.morphAttributes.normal[0];
      expect(closed.count).toBe(open.count);expect(normal.count).toBe(open.count);expect(mesh.morphTargetInfluences).toEqual([0]);
      for(let i=0;i<open.count;i++){
        const expected=f.point(open.getX(i)+mesh.position.x,open.getY(i)+mesh.position.y,open.getZ(i)+mesh.position.z,side);
        expect(closed.getX(i)+mesh.position.x).toBeCloseTo(expected.x,6);expect(closed.getY(i)+mesh.position.y).toBeCloseTo(expected.y,6);expect(closed.getZ(i)+mesh.position.z).toBeCloseTo(expected.z,6);
        expect(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))).toBeCloseTo(1,5);
      }
      const ids=geometry.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      for(const blend of [0,0.25,0.5,0.75,1])for(let i=0;i<ids.length;i+=3){
        for(const [j,p] of [a,b,c].entries()){const k=ids[i+j];p.set(open.getX(k)*(1-blend)+closed.getX(k)*blend,open.getY(k)*(1-blend)+closed.getY(k)*blend,open.getZ(k)*(1-blend)+closed.getZ(k)*blend);}
        expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-8);
      }
      geometry.dispose();mesh.material.dispose();
    }
  });
});

describe('Curved layered wing feathers',()=>{
  for(const fingers of [0,4])it('keeps curved vanes mirrored with finite upward normals and tapered tips: '+fingers,()=>{
    const f=fixture(fingers);for(const count of [10,16,20]){const left=f.vanes(-1,count),right=f.vanes(1,count),a=left.attributes.position,b=right.attributes.position,n=right.attributes.normal;
      expect(a.count).toBe(count*21);expect(right.index.count).toBe(count*72);
      for(let i=0;i<a.count;i++){expect(a.getX(i)).toBeCloseTo(-b.getX(i),6);expect(a.getY(i)).toBe(b.getY(i));expect(a.getZ(i)).toBe(b.getZ(i));expect(n.getY(i)).toBeGreaterThan(0.7);expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);}
      for(let feather=0;feather<count;feather++){const base=feather*21,width=row=>Math.abs(b.getX(base+row*3+2)-b.getX(base+row*3));expect(width(6)).toBeLessThan(width(3)*0.1);expect(width(2)).toBeGreaterThan(width(0));}
      for(const attribute of Object.values(right.attributes))expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);left.dispose();right.dispose();
    }
  });
});
