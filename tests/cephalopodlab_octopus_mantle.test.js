import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const {restorePass68Source}=require('./helpers/cephalopod_pass68_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=restorePass68Source(source);
const ids=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'],unchanged=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'],owned=[];
const hash=s=>createHash('sha256').update(s).digest('hex');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Mantle refinement consumed dive RNG');}});
function factory(s){const a=s.indexOf('function createCLHuntAnimal('),b=s.indexOf('// Compact, individually owned prey rig.',a);assert.ok(a>=0&&b>a);return new Function('T','species','Math',s.slice(a,b)+';return createCLHuntAnimal(T,species);');}
const build=factory(source),oldBuild=factory(prior);
function rig(id='commonOcto',old=false){const r=(old?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);owned.push(r);return r;}
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
const point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i),normal=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.normal,i);
function snapshot(r,omitMantleGeometry=false){
  const h=createHash('sha256');
  function array(a){h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
  r.root.traverse(o=>{
    h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));
    if(o.material)h.update(JSON.stringify([o.material.type,o.material.name,o.material.color?.toArray(),o.material.roughness,o.material.opacity,o.material.transparent,o.material.side,o.material.depthWrite]));
    if(o.geometry&&!(omitMantleGeometry&&o.name==='cl-mantle')){for(const [n,a]of Object.entries(o.geometry.attributes)){h.update(n);array(a.array);}if(o.geometry.index)array(o.geometry.index.array);}
    if(o.instanceMatrix)array(o.instanceMatrix.array);
  });
  return h.digest('hex');
}
function dispose(r){const resources=new Set();r.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(x=>x.dispose());}
afterEach(()=>{owned.splice(0).forEach(dispose);});

describe('Larger reef octopus mantle silhouette',()=>{
  it('recovers the accepted Pass67 source and preserves complete compact and swimming rigs',()=>{
    assert.equal(hash(prior),'83772f68e059ef24f75ab9e5e329db9e344c23f347d03e9b9b5aec3f0c150189');
    for(const id of unchanged){const live=rig(id),old=rig(id,true);assert.deepEqual(live.basePositions,old.basePositions);
      for(let frame=0;frame<8;frame++){const s=pose({moving:frame%2===0,jet:frame>1&&frame<5,camo:.8,substrate:frame>3?'rock':'sand',strike:frame===4?.8:0,squeezeBlend:frame===6?.8:0,reducedMotion:frame===7});live.update(frame*.05,.05,s);old.update(frame*.05,.05,s);assert.equal(snapshot(live),snapshot(old),id+' complete rig remains exact');}
    }
  });

  it('retains topology and UVs while forming a lower mantle wholly inside the old collision envelope',()=>{
    for(const id of ids){const live=rig(id),old=rig(id,true),g=live.mantleGeo,b=old.mantleGeo,p=g.attributes.position;
      assert.equal(p.count,b.attributes.position.count);assert.equal(p.count,1189);assert.deepEqual(g.index.array,b.index.array);assert.deepEqual(g.attributes.uv.array,b.attributes.uv.array);
      assert.deepEqual(live.mantle.position.toArray(),old.mantle.position.toArray());assert.equal(live.scale,old.scale);assert.equal(live.mantleMat.roughness,old.mantleMat.roughness);
      let changed=0;
      for(let i=0;i<p.count;i++){const v=point(g,i),q=point(b,i);assert.ok(v.toArray().every(Number.isFinite));assert.equal(v.z,q.z);assert.ok(Math.abs(v.x)<=Math.abs(q.x)+1e-8);assert.ok(Math.abs(v.y)<=Math.abs(q.y)+1e-8);assert.ok(v.x*q.x>=0&&v.y*q.y>=0);assert.ok((v.x/(.48*live.scale))**2+(v.y/(.48*live.scale))**2+(v.z/(.61*live.scale))**2<=1.000002);if(v.distanceTo(q)>.02*live.scale)changed++;}
      assert.ok(changed>p.count*.7,'The new silhouette is a material shape change');
      const shapeBox=new T.Box3().setFromBufferAttribute(p),oldBox=new T.Box3().setFromBufferAttribute(b.attributes.position);assert.equal(shapeBox.min.z,oldBox.min.z);assert.equal(shapeBox.max.z,oldBox.max.z);assert.ok(shapeBox.max.y<oldBox.max.y*.88);assert.ok(shapeBox.min.y>oldBox.min.y*.80);
      assert.ok(shapeBox.max.x>oldBox.max.x*.85,'Retains a broad posterior sac');assert.ok(shapeBox.max.x<oldBox.max.x*.98);
    }
  });

  it('uses finite outward normals with continuous lighting at the duplicate seam and poles',()=>{
    for(const id of ids){const r=rig(id),g=r.mantleGeo,p=g.attributes.position,n=g.attributes.normal,index=g.index.array;
      for(let i=0;i<n.count;i++){assert.ok(normal(g,i).toArray().every(Number.isFinite));assert.ok(Math.abs(normal(g,i).length()-1)<1e-6);}
      for(let row=0;row<=28;row++){assert.ok(point(g,row*41).distanceTo(point(g,row*41+40))<1e-7*r.scale);assert.deepEqual(normal(g,row*41).toArray(),normal(g,row*41+40).toArray());}
      for(const row of [0,28])for(let col=1;col<=40;col++)assert.deepEqual(normal(g,row*41).toArray(),normal(g,row*41+col).toArray());
      let triangles=0;
      for(let i=0;i<index.length;i+=3){const a=point(g,index[i]),b=point(g,index[i+1]),c=point(g,index[i+2]),cross=b.clone().sub(a).cross(c.clone().sub(a));assert.ok(cross.lengthSq()>1e-16*r.scale**4,'No collapsed surface triangles');const center=a.clone().add(b).add(c).multiplyScalar(1/3);assert.ok(cross.dot(center)>0,'Outward winding');for(let corner=0;corner<3;corner++)assert.ok(cross.dot(normal(g,index[i+corner]))>0,'Normal follows the actual surface');triangles++;}
      assert.equal(triangles,2160);
    }
  });

  it('leaves head, eyes, arms, cups, web and all attachment transforms exact through movement and grabs',()=>{
    for(const id of ids){const live=rig(id),old=rig(id,true);assert.equal(snapshot(live,true),snapshot(old,true));
      for(let frame=0;frame<12;frame++){const s=pose({moving:frame<4,jet:frame>=4&&frame<8,strike:frame===9?.7:0,strikeBrace:frame===9?.6:0,strikeRadius:.22,strikeAim:frame===9?new T.Vector3(.2,-.1,1.5):null,squeezeBlend:frame===10?.8:0,camo:.7,substrate:frame>8?'rock':'sand',reducedMotion:frame===11});live.update(2+frame*.05,.05,s);old.update(2+frame*.05,.05,s);assert.equal(snapshot(live,true),snapshot(old,true),id+' original anatomy and motions');}
    }
  });

  it('keeps the head intersection and eye sightlines clear during breath and maximum squeeze',()=>{
    for(const id of ids){const r=rig(id);for(const squeeze of [0,1]){r.update(.75,.05,pose({jet:true,squeezeBlend:squeeze}));r.root.updateMatrixWorld(true);const ray=new T.Raycaster(),s=r.scale,head=r.root.getObjectByName('cl-head');
      ray.set(new T.Vector3(0,.08*s,-2*s),new T.Vector3(0,0,1));const headBack=ray.intersectObject(head,false)[0];ray.set(new T.Vector3(0,.08*s,2*s),new T.Vector3(0,0,-1));const mantleFront=ray.intersectObject(r.mantle,false)[0];assert.ok(headBack&&mantleFront);assert.ok(mantleFront.point.z-headBack.point.z>.12*s,'Mantle and head retain a real axial overlap');
      const occluders=[];r.root.traverse(o=>{if(o.isMesh&&['cl-head','cl-mantle','cl-eye-rim','cl-eye-lid'].includes(o.name))occluders.push(o);});
      r.root.traverse(o=>{if(o.name!=='cl-pupil')return;for(let i=0;i<o.geometry.attributes.position.count;i+=7){const target=point(o.geometry,i).applyMatrix4(o.matrixWorld),side=Math.sign(target.x),origin=new T.Vector3(side*3.6*s,.25*s,.43*s),direction=target.clone().sub(origin);ray.far=direction.length()-.0001*s;ray.set(origin,direction.normalize());assert.equal(ray.intersectObjects(occluders,false).length,0,'Mantle does not cover an eye');}ray.far=Infinity;});
    }}
  });

  it('retains authored base buffers while breath, squeeze and camouflage deform that shape without allocations',()=>{
    for(const id of ids){const r=rig(id),old=rig(id,true),g=r.mantleGeo,position=g.attributes.position,normalAttr=g.attributes.normal,index=g.index,base=r.basePositions,baseCopy=base.slice(),normalCopy=normalAttr.array.slice(),material=r.mantleMat;const count=x=>{let c=0;x.root.traverse(o=>{if(o.geometry)c++;});return c;};assert.equal(count(r),count(old));
      for(let frame=0;frame<12;frame++){const s=pose({jet:frame>2&&frame<8,squeezeBlend:frame===8?1:0,camo:frame>6?1:0,substrate:frame>6?'rock':'sand',reducedMotion:frame===11});r.update(frame*.05,.05,s);old.update(frame*.05,.05,s);assert.deepEqual(r.mantle.scale.toArray(),old.mantle.scale.toArray());assert.equal(r.mantleGeo,g);assert.equal(g.attributes.position,position);assert.equal(g.attributes.normal,normalAttr);assert.equal(g.index,index);assert.equal(r.basePositions,base);assert.equal(r.mantleMat,material);assert.deepEqual(base,baseCopy);assert.deepEqual(normalAttr.array,normalCopy);
        for(let i=0;i<base.length;i+=3){const rough=s.substrate==='sand'?0:s.camo*.035,n=1+rough*Math.sin(base[i]*18)*Math.sin(base[i+1]*20+base[i+2]*13);for(let d=0;d<3;d++)assert.equal(position.array[i+d],Math.fround(base[i+d]*n));const current=new T.Vector3(position.array[i],position.array[i+1],position.array[i+2]);assert.ok(g.boundingSphere.containsPoint(current),'Papillae stay inside the retained culling sphere');assert.ok(g.boundingBox.containsPoint(current),'Papillae stay inside the retained object bounds');}
      }
    }
  });
});
