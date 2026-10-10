import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),{restorePass43Source}=require('./helpers/cephalopod_pass43_reference.cjs');
const {restorePass44Source}=require('./helpers/cephalopod_pass44_reference.cjs');
const {restorePass45Source}=require('./helpers/cephalopod_pass45_reference.cjs');
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=restorePass43Source(restorePass44Source(restorePass45Source(restorePass46Source(restorePass47Source(source))))),owned=new Set();
function region(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start,a);return s.slice(start,end);}
function braced(s,tag){const start=s.indexOf(tag),open=s.indexOf('{',start);assert.ok(start>=0&&open>start,tag);let n=0;for(let i=open;i<s.length;i++){if(s[i]==='{')n++;if(s[i]==='}'&&--n===0)return s.slice(start,i+1);}throw Error(tag);}
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Decorative rubble consumed gameplay RNG');}});
const build=new Function('T','Math',region(source,'function createCLHuntReefRubble(','function createCLHuntAnimal(')+';return createCLHuntReefRubble;')(T,noRandom);
const footprint=new Function('THREE',braced(source,'function createCLHuntRockCollisionFootprint(')+';return createCLHuntRockCollisionFootprint;')(T);
const terrain=new Function(braced(source,'function terrainHeight(')+';return terrainHeight;')();
const hash=s=>createHash('sha256').update(s).digest('hex');
function track(mesh){owned.add(mesh.geometry);owned.add(mesh.material);return mesh;}
function rocks(seed=2741){
 let n=seed;const math=Object.assign(Object.create(Math),{random(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}});
 const text=region(source,'        var rocks = [];','        // ─── Curved branching coral colonies')+region(source,'        rocks.slice(0,10)','        corals.slice(0,10)');
 const result=new Function('THREE','Math','renderer','var scene=new THREE.Scene();function reefSurface(){}function shadeCLHuntRockSurface(){}'+text+';return rocks;')(T,math,{capabilities:{isWebGL2:true}});
 result.forEach(r=>{r.position.y+=terrain(r.position.x,r.position.z);track(r);});return result;
}
function setup(quality='balanced',seed=2741){const r=rocks(seed),f=r.map(rock=>footprint(T,rock)),result=build(T,r,f,terrain,quality);track(result.mesh);return{...result,rocks:r,footprints:f};}
function bytes(a){return Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength).toString('hex');}
function placements(mesh){const rows=new Map(),m=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);const id=mesh.userData.rockIndices[i];if(!rows.has(id))rows.set(id,[]);rows.get(id).push(JSON.stringify(m.elements));}for(const rowsForRock of rows.values())rowsForRock.sort();return rows;}
afterEach(()=>{owned.forEach(o=>o.dispose());owned.clear();});
describe('Rock-rooted decorative seabed rubble',()=>{
 it('uses one bounded instanced pool with independent static geometry and no texture or gameplay tags',()=>{
  for(const [quality,pieces]of [['low',4],['balanced',8],['high',12]]){
   const a=setup(quality),b=build(T,a.rocks,a.footprints,terrain,quality);track(b.mesh);
   assert.equal(a.mesh.type,'Mesh');assert.ok(a.mesh.isInstancedMesh);assert.equal(a.mesh.instanceMatrix.count,44*pieces);assert.ok(a.mesh.count>30&&a.mesh.count<=44*pieces);
   assert.equal(a.mesh.children.length,0);assert.equal(a.mesh.geometry.attributes.position.count,240);assert.equal(a.mesh.geometry.index,null);assert.equal(a.mesh.geometry.groups.length,0);
   assert.notEqual(a.mesh.geometry,b.mesh.geometry);assert.notEqual(a.mesh.material,b.mesh.material);assert.equal(a.mesh.material.type,'MeshStandardMaterial');assert.equal(a.mesh.material.roughness,.96);assert.equal(a.mesh.material.transparent,false);assert.equal(a.mesh.material.vertexColors,true);
   assert.ok(!Object.values(a.mesh.material).some(x=>x?.isTexture));assert.equal(a.mesh.frustumCulled,false);assert.equal(a.mesh.castShadow,quality!=='low');assert.equal(a.mesh.receiveShadow,true);assert.equal(a.mesh.userData.decorative,true);assert.equal(a.mesh.userData.substrate,undefined);
   assert.equal(a.mesh.instanceColor.count,44*pieces);assert.ok(Array.from(a.mesh.instanceColor.array.slice(0,a.mesh.count*3)).every(n=>Number.isFinite(n)&&n>0&&n<=1));
   assert.equal(a.mesh.count,b.mesh.count);assert.equal(bytes(a.mesh.instanceMatrix),bytes(b.mesh.instanceMatrix));assert.equal(bytes(a.mesh.instanceColor),bytes(b.mesh.instanceColor));
   for(const [name,attr]of Object.entries(a.mesh.geometry.attributes)){assert.equal(bytes(attr),bytes(b.mesh.geometry.attributes[name]));assert.ok(Array.from(attr.array).every(Number.isFinite));assert.equal(attr.usage,T.StaticDrawUsage);}
   for(let i=0;i<240;i++){const p=new T.Vector3().fromBufferAttribute(a.mesh.geometry.attributes.position,i),normal=new T.Vector3().fromBufferAttribute(a.mesh.geometry.attributes.normal,i);assert.ok(Math.abs(normal.length()-1)<1e-6);assert.ok(normal.dot(p)>0);assert.ok(a.mesh.geometry.boundingBox.distanceToPoint(p)<1e-6);assert.ok(p.distanceTo(a.mesh.geometry.boundingSphere.center)<=a.mesh.geometry.boundingSphere.radius+1e-6);}
  }
 });
 it('retains every low-quality fragment when higher quality fills the same stable rock patches',()=>{
  const r=rocks(),f=r.map(rock=>footprint(T,rock)),views=['low','balanced','high'].map(q=>{const result=build(T,r,f,terrain,q);track(result.mesh);return placements(result.mesh);});
  for(let level=0;level<2;level++)for(const [id,rows]of views[level])for(const row of rows)assert.ok(views[level+1].get(id).includes(row));
 });
 it('beds actual rendered vertices into the terrain, outside their owner rocks and clear of the opening and mission route',()=>{
  const p=new T.Vector3(),m=new T.Matrix4();let checked=0;
  for(const seed of [2741,73,12345]){const {mesh,rocks,footprints}=setup('high',seed),positions=mesh.geometry.attributes.position;
   for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);const id=mesh.userData.rockIndices[i],rock=rocks[id],edges=footprints[id].edges;let lowest=Infinity,highest=-Infinity;
    for(let v=0;v<positions.count;v++){p.fromBufferAttribute(positions,v).applyMatrix4(m);const clearance=p.y-terrain(p.x,p.z);lowest=Math.min(lowest,clearance);highest=Math.max(highest,clearance);
     assert.ok(edges.some(e=>e.nx*(p.x-rock.position.x)+e.nz*(p.z-rock.position.z)-e.constant>0),'Fragment intersects its rendered rock silhouette');
     assert.ok(!(p.x>-4.5&&p.x<4.5&&p.z>-5&&p.z<4.5));assert.ok(!(p.x>0&&p.x<7&&p.z>-5&&p.z<10));
    }assert.ok(Math.abs(lowest+.009)<.00002,'Fragment floats or is excessively buried');assert.ok(highest>.025);checked++;
   }
  }assert.ok(checked>700);
 });
 it('keeps buffers and uploads untouched during stationary updates, then follows recycled roots with grounded placements',()=>{
  const a=setup(),mesh=a.mesh,g=mesh.geometry,material=mesh.material,arrays=Object.values(g.attributes).map(a=>a.array),matrixArray=mesh.instanceMatrix.array,colorArray=mesh.instanceColor.array,old=placements(mesh),version=mesh.instanceMatrix.version;
  for(let i=0;i<30;i++)assert.equal(a.update(),false);assert.equal(mesh.instanceMatrix.version,version);
  a.rocks[0].position.set(-250,0,170);assert.equal(a.update(),true);assert.equal(mesh.geometry,g);assert.equal(mesh.material,material);assert.equal(mesh.instanceMatrix.array,matrixArray);assert.equal(mesh.instanceColor.array,colorArray);assert.equal(mesh.instanceMatrix.version,version+1);
  const next=placements(mesh);assert.notDeepEqual(next.get(0),old.get(0));for(const [id,rows]of old)if(id!==0)assert.deepEqual(next.get(id),rows);
  Object.values(g.attributes).forEach((attr,i)=>assert.equal(attr.array,arrays[i]));assert.equal(a.update(),false);
  const m=new T.Matrix4();for(let i=0;i<mesh.count;i++)if(mesh.userData.rockIndices[i]===0){mesh.getMatrixAt(i,m);assert.ok(Math.abs(m.elements[12]+250)<3&&Math.abs(m.elements[14]-170)<3);}
 });
 it('deactivates fragments on the steep shelf without reallocating their pool and restores them on flat deep seabed',()=>{
  const a=setup(),array=a.mesh.instanceMatrix.array,geo=a.mesh.geometry;
  a.rocks.forEach((rock,i)=>rock.position.set(35,0,i*4));assert.equal(a.update(),true);assert.equal(a.mesh.count,0);
  a.rocks.forEach((rock,i)=>rock.position.set(65,0,i*4));assert.equal(a.update(),true);assert.ok(a.mesh.count>100);assert.equal(a.mesh.instanceMatrix.array,array);assert.equal(a.mesh.geometry,geo);
  const p=new T.Vector3(),m=new T.Matrix4(),attr=geo.attributes.position;for(let i=0;i<a.mesh.count;i++){a.mesh.getMatrixAt(i,m);let low=Infinity;for(let v=0;v<attr.count;v++)low=Math.min(low,p.fromBufferAttribute(attr,v).applyMatrix4(m).y+55);assert.ok(Math.abs(low+.009)<.00002);}
 });
 it('preserves the entire prior simulation outside three reviewed visual insertions and owns disposal independently',()=>{
  assert.equal(hash(prior),'4f9b97974777ae1fbcab0d25cacca3b057646f8c077c7c9f8b84574ccf47c4c9');
  assert.equal(braced(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source))))),'function createCLHuntAnimal('),braced(prior,'function createCLHuntAnimal('));
  assert.deepEqual(restorePass46Source(restorePass47Source(source)).split('\n').filter(s=>s.includes('Math.random')),prior.split('\n').filter(s=>s.includes('Math.random')));
  const a=setup(),b=setup(),disposed={own:0,neighbor:0};for(const r of [a.mesh.geometry,a.mesh.material])r.addEventListener('dispose',()=>disposed.own++);for(const r of [b.mesh.geometry,b.mesh.material])r.addEventListener('dispose',()=>disposed.neighbor++);
  for(const r of [a.mesh.geometry,a.mesh.material]){r.dispose();owned.delete(r);}assert.deepEqual(disposed,{own:2,neighbor:0});
 });
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
