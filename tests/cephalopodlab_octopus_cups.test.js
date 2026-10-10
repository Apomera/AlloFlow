import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),{restorePass50Source}=require('./helpers/cephalopod_pass50_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=restorePass50Source(source),owned=[],ids=['commonOcto','blueRinged','giantPacific','mimicOcto','caribReef','coconutOcto'];
const hash=b=>createHash('sha256').update(b).digest('hex'),noRandom=Object.assign(Object.create(Math),{random(){throw Error('Cup geometry consumed the dive RNG');}});
function factory(s){const a=s.indexOf('function createCLHuntAnimal('),b=s.indexOf('// Compact, individually owned prey rig.',a);assert.ok(a>=0&&b>a);return new Function('T','species','Math',s.slice(a,b)+';return createCLHuntAnimal(T,species);');}
const build=factory(source),oldBuild=factory(prior),state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
function rig(id='commonOcto',old=false){const r=(old?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);owned.push(r);return r;}
const cups=r=>r.root.getObjectByName('cl-suckers'),point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
function snapshot(r,omitCups=false){const rows=[];r.root.traverse(o=>{if(omitCups&&o.name==='cl-suckers')return;const row=[o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible];if(o.geometry){const g=o.geometry,m=o.material;row.push(Object.entries(g.attributes).map(([n,a])=>[n,Array.from(a.array)]),g.index?Array.from(g.index.array):null,o.instanceMatrix?Array.from(o.instanceMatrix.array):null,m.type,m.name,m.color.toArray(),m.roughness,m.metalness,m.vertexColors,m.transparent,m.side,m.customProgramCacheKey());}rows.push(row);});return hash(JSON.stringify(rows));}
afterEach(()=>{for(const r of owned.splice(0)){const resources=new Set();r.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}});
describe('Reef octopus recessed sucker cups',()=>{
 it('recovers the accepted source and preserves all other anatomy, movement and complete swimming species',()=>{assert.equal(hash(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(prior))))),'1185f3586c2022d012120265d49633c4519af6b18011eab3670bcc8199e24913');for(const id of [...ids,'humboldtSquid','cuttlefish','bobtailSquid','dumboOcto','vampireSquid','nautilus']){const live=rig(id),old=rig(id,true);for(const s of [state(),state({moving:true}),state({jet:true}),state({strike:.8}),state({reducedMotion:true})]){live.update(2,.05,s);old.update(2,.05,s);assert.equal(snapshot(live,ids.includes(id)),snapshot(old,ids.includes(id)),id);}}});
 it('uses one closed, consistently wound cup with a recessed floor and no degenerate triangles or seam',()=>{const m=cups(rig()),g=m.geometry;assert.equal(m.count,192);assert.equal(g.attributes.position.count,62);assert.equal(g.index.count/3,120);assert.equal(m.material.vertexColors,true);assert.equal(m.material.transparent,false);assert.equal(m.material.map,null);const edges=new Map();let volume=0;for(let i=0;i<g.attributes.position.count;i++){const p=point(g,i),n=new T.Vector3().fromBufferAttribute(g.attributes.normal,i);assert.ok(Math.abs(n.length()-1)<1e-6);assert.ok(g.boundingBox.distanceToPoint(p)<1e-7);assert.ok(p.distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius+1e-7);}for(let i=0;i<g.index.count;i+=3){const ix=[0,1,2].map(j=>g.index.getX(i+j)),v=ix.map(i=>point(g,i)),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));assert.ok(n.length()>1e-8);volume+=v[0].dot(v[1].clone().cross(v[2]))/6;for(let e=0;e<3;e++){const a=ix[e],b=ix[(e+1)%3],key=Math.min(a,b)+':'+Math.max(a,b),r=edges.get(key)||{count:0,direction:0};r.count++;r.direction+=a<b?1:-1;edges.set(key,r);}}assert.ok(volume>0);for(const e of edges.values())assert.deepEqual(e,{count:2,direction:0});const proxy=new T.Mesh(g,m.material);proxy.updateMatrixWorld();const ray=x=>new T.Raycaster(new T.Vector3(x,.6,0),new T.Vector3(0,-1,0)).intersectObject(proxy)[0];assert.ok(ray(0).point.y<-.029);assert.ok(ray(.85).point.y>.20);assert.ok(g.attributes.color.getX(61)<g.attributes.color.getX(25));});
 it('keeps cup bases embedded in rendered skin with clear cavities and separated rows during a squeeze or jet',()=>{
  const matrix=new T.Matrix4(),scale=new T.Vector3(),origin=new T.Vector3(),rotation=new T.Quaternion();
  for(const id of ids){const r=rig(id),m=cups(r);for(const [phase,squeeze,pose]of [[0,1,state()],[1.2,1,state({moving:true})],[2.1,1,state({jet:true})],[3,.42,state({moving:true})],[3.5,.75,state({strike:.8})]]){
   r.arms.forEach(a=>a.compressCurrent=squeeze);r.update(phase,.05,pose);r.root.updateMatrixWorld(true);
   for(const arm of r.arms){arm.mesh.geometry.computeBoundingSphere();arm.mesh.geometry.computeBoundingBox();}
   for(let arm=0;arm<8;arm++)for(let ring=3;ring<15;ring++){const pair=[];for(let row=0;row<2;row++){
    const index=arm*24+(ring-3)*2+row;m.getMatrixAt(index,matrix);matrix.decompose(origin,rotation,scale);
    const direction=new T.Vector3(0,1,0).applyQuaternion(rotation),g=r.arms[arm].mesh.geometry,faceIndex=((ring-1)*8+(row?3:4))*2+1;
    const triangle=new T.Triangle(...[0,1,2].map(i=>point(g,g.index.getX(faceIndex*3+i)))),faceNormal=triangle.getNormal(new T.Vector3());
    assert.ok(direction.dot(faceNormal)>.99999,id+' opening follows the rendered face '+index);
    assert.ok(scale.x>0&&matrix.elements.every(Number.isFinite));
    // Test contact from the cavity floor to below the base, not from outside a
    // folded arm where another strip can naturally occlude the mounting face.
    const cavity=origin.clone().addScaledVector(direction,-.03*scale.x),ray=new T.Ray(cavity,direction.clone().negate()),contact=ray.intersectTriangle(triangle.a,triangle.b,triangle.c,true,new T.Vector3());
    assert.ok(contact,id+' cavity ray meets its skin '+index);
    assert.ok(Math.abs(contact.distanceTo(cavity)/scale.x-.05)<.0002,id+' embedded base and clear cavity '+index);
    // The complete basal disc fits within the face, including its least roomy
    // edge; this catches cups that bridge a crease or float over an arm seam.
    for(let angle=0;angle<12;angle++){const v=new T.Vector3(Math.cos(angle*Math.PI/6)*.46,-.08,Math.sin(angle*Math.PI/6)*.46).applyMatrix4(matrix);const bary=triangle.getBarycoord(v,new T.Vector3());assert.ok(Math.min(bary.x,bary.y,bary.z)>-.0001,id+' basal seal '+index);}
    pair.push({origin:origin.clone(),radius:scale.x});
   }assert.ok(pair[0].origin.distanceTo(pair[1].origin)>pair[0].radius+pair[1].radius);}
  }}
 });

 it('retains geometry, materials and static prototype buffers while instance poses move and freeze deterministically',()=>{for(const id of ids){const r=rig(id),other=rig(id),m=cups(r),g=m.geometry,material=m.material,instances=m.instanceMatrix,array=instances.array,attrs=Object.entries(g.attributes).map(([n,a])=>({n,a,array:a.array,values:Array.from(a.array),version:a.version}));const before=Array.from(array);for(let i=0;i<30;i++){const s=state({moving:true,jet:i>15});r.update(i*.05,.05,s);other.update(i*.05,.05,s);}assert.notDeepEqual(Array.from(array),before);assert.deepEqual(Array.from(array),Array.from(cups(other).instanceMatrix.array));const frozen=Array.from(array);r.update(29*.05,0,state({moving:true,jet:true}));assert.deepEqual(Array.from(array),frozen);r.update(2,.05,state({reducedMotion:true}));const reduced=Array.from(array);r.update(20,.05,state({reducedMotion:true}));assert.deepEqual(Array.from(array),reduced);assert.equal(m.geometry,g);assert.equal(m.material,material);assert.equal(m.instanceMatrix,instances);assert.equal(instances.array,array);for(const a of attrs){assert.equal(g.attributes[a.n],a.a);assert.equal(a.a.array,a.array);assert.equal(a.a.version,a.version);assert.deepEqual(Array.from(a.array),a.values);}}});
});
