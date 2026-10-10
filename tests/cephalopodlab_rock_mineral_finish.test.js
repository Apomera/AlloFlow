import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),{restorePass44Source}=require('./helpers/cephalopod_pass44_reference.cjs');
const {restorePass45Source}=require('./helpers/cephalopod_pass45_reference.cjs');
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),baseline=restorePass44Source(restorePass45Source(restorePass46Source(restorePass47Source(source)))),owned=new Set();
function region(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a);assert.ok(a>=0&&b>a,start);return s.slice(a,b);}
function braced(s,marker){const a=s.indexOf(marker),open=s.indexOf('{',a);assert.ok(a>=0&&open>a,marker);let depth=0;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;if(s[i]==='}'&&--depth===0)return s.slice(a,i+1);}throw Error(marker);}
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Static rock coloring consumed gameplay randomness');}});
const color=new Function('THREE','Math',braced(source,'function colorCLHuntReefRock(')+';return colorCLHuntReefRock;')(T,noRandom),shape=new Function('Math',braced(source,'function shapeCLHuntReefRock(')+';return shapeCLHuntReefRock;')(noRandom);
const footprint=new Function(braced(source,'function createCLHuntRockCollisionFootprint(')+';return createCLHuntRockCollisionFootprint;')(),rubble=new Function('Math',braced(source,'function createCLHuntReefRubble(')+';return createCLHuntReefRubble;')(noRandom),terrain=new Function(braced(source,'function terrainHeight(')+';return terrainHeight;')();
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=a=>Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength);
function track(o){owned.add(o);return o;}
function spawn(value,seed=2741,mode=0){let n=seed;const draws=[],math=Object.assign(Object.create(Math),{random(){n=(Math.imul(n,1664525)+1013904223)>>>0;const value=n/4294967296;draws.push(value);return value;}});
 const renderer={capabilities:{isWebGL2:mode===0},extensions:{has(){return mode===1;}}};
 const text=region(value,'        var rocks = [];','        // ─── Curved branching coral colonies');
 const rocks=new Function('THREE','Math','renderer','var scene=new THREE.Scene();function reefSurface(){}function shadeCLHuntRockSurface(){}'+text+';return rocks;')(T,math,renderer);
 rocks.forEach(r=>{track(r.geometry);track(r.material);});return{rocks,draws};
}
function sameAttributes(a,b){for(const name of Object.keys(b.attributes)){assert.equal(a.attributes[name].itemSize,b.attributes[name].itemSize);assert.ok(bytes(a.attributes[name]).equals(bytes(b.attributes[name])),name+' bytes changed');}assert.ok(bytes(a.index).equals(bytes(b.index)));assert.deepEqual(a.groups,b.groups);assert.deepEqual(a.userData,b.userData);}
afterEach(()=>{owned.forEach(o=>o.dispose());owned.clear();});
describe('Static mineral finish on existing reef rocks',()=>{
 it('reverses exactly to the accepted pass43 source without touching actor, shader, navigation or RNG code',()=>{
  assert.equal(hash(baseline),'d9449284702fcfd30a7046083c2d3f4ca8fac77bc0ddf9eba60779744e07b409');
  for(const marker of ['function shapeCLHuntReefRock(','function shadeCLHuntRockSurface(','function createCLHuntReefRubble(','function createCLHuntRockCollisionFootprint(','function resolveCLHuntRockCollision(','function createCLHuntAnimal('])assert.equal(braced(marker==='function createCLHuntAnimal('?require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source))))):source,marker),braced(baseline,marker));
  assert.deepEqual(restorePass46Source(restorePass47Source(source)).split('\n').filter(s=>s.includes('Math.random')),baseline.split('\n').filter(s=>s.includes('Math.random')));
 });
 it('preserves all spawned geometry, ownership, material tints, camouflage and random draws across shader capability profiles',()=>{
  for(const seed of [2741,73,12345])for(const mode of [0,1,2]){
   const a=spawn(source,seed,mode),b=spawn(baseline,seed,mode);assert.deepEqual(a.draws,b.draws);assert.equal(a.rocks.length,b.rocks.length);
   assert.equal(new Set(a.rocks.map(r=>r.geometry)).size,a.rocks.length);assert.equal(new Set(a.rocks.map(r=>r.geometry.attributes.color.array)).size,a.rocks.length);
   a.rocks.forEach((r,i)=>{const old=b.rocks[i];sameAttributes(r.geometry,old.geometry);assert.deepEqual(Object.keys(r.geometry.attributes),[...Object.keys(old.geometry.attributes),'color']);assert.deepEqual(r.position.toArray(),old.position.toArray());assert.deepEqual(r.quaternion.toArray(),old.quaternion.toArray());assert.deepEqual(r.scale.toArray(),old.scale.toArray());assert.deepEqual(r.userData,old.userData);assert.equal(r.children.length,old.children.length);assert.equal(r.castShadow,old.castShadow);assert.equal(r.receiveShadow,old.receiveShadow);
    for(const key of ['type','roughness','metalness','side','shadowSide','transparent','opacity','flatShading'])assert.equal(r.material[key],old.material[key]);
    assert.deepEqual(r.material.color.toArray(),old.material.color.toArray());assert.equal(r.material.customProgramCacheKey(),old.material.customProgramCacheKey());assert.equal(r.material.onBeforeCompile.name,old.material.onBeforeCompile.name);assert.deepEqual(r.material.extensions,old.material.extensions);assert.equal(r.material.vertexColors,true);assert.equal(old.material.vertexColors,false);assert.ok(!Object.values(r.material).some(v=>v?.isTexture));
    const colors=r.geometry.attributes.color;for(let j=0;j<colors.count;j++)for(let channel=0;channel<3;channel++){const reflectance=colors.array[j*3+channel]*r.material.color.toArray()[channel];assert.ok(reflectance>0&&reflectance<1,'Effective linear stone albedo out of range');}
   });
  }
 });
 it('gives every size and form a deterministic, seamless, bounded color field while retaining all original buffers',()=>{
  for(const radius of [.6,.95,1.4,2])for(let index=0;index<45;index++){
   const g=track(new T.SphereGeometry(radius,24,16)),repeat=track(new T.SphereGeometry(radius,24,16));shape(g,radius,index);shape(repeat,radius,index);
   const original={...g.attributes},arrays=Object.fromEntries(Object.entries(g.attributes).map(([n,a])=>[n,hash(bytes(a))])),indices=g.index,indexSHA=hash(bytes(indices));color(g,radius,index);color(repeat,radius,index);
   for(const [name,a]of Object.entries(original)){assert.equal(g.attributes[name],a);assert.equal(hash(bytes(a)),arrays[name]);}assert.equal(g.index,indices);assert.equal(hash(bytes(indices)),indexSHA);
   const c=g.attributes.color;assert.equal(c.count,425);assert.equal(c.itemSize,3);assert.equal(c.array.byteLength,5100);assert.equal(c.usage,T.StaticDrawUsage);assert.equal(c.version,0);assert.ok(bytes(c).equals(bytes(repeat.attributes.color)));
   assert.ok(Array.from(c.array).every(n=>Number.isFinite(n)&&n>.6&&n<2.3));const reds=Array.from({length:c.count},(_,i)=>c.getX(i));assert.ok(Math.max(...reds)-Math.min(...reds)>.3,'No visible broad mineral variation');
   for(let row=0;row<=16;row++){const first=row*25;assert.deepEqual(Array.from(c.array.slice(first*3,first*3+3)),Array.from(c.array.slice((first+24)*3,(first+25)*3)));if(row===0||row===16)for(let side=1;side<25;side++)assert.deepEqual(Array.from(c.array.slice(first*3,first*3+3)),Array.from(c.array.slice((first+side)*3,(first+side+1)*3)));}
   // Limit transitions on actual rendered edges, so the coarse field does not introduce isolated hot pixels.
   for(let i=0;i<g.index.count;i+=3)for(let edge=0;edge<3;edge++){const a=g.index.getX(i+edge),b=g.index.getX(i+(edge+1)%3);for(let channel=0;channel<3;channel++)assert.ok(Math.abs(c.array[a*3+channel]-c.array[b*3+channel])<1.05);}
  }
 });
 it('leaves real collision hulls, vertical extents and the adjacent rubble pool byte identical',()=>{
  for(const seed of [2741,73,12345]){const a=spawn(source,seed).rocks,b=spawn(baseline,seed).rocks,ac=a.map(r=>footprint(T,r)),bc=b.map(r=>footprint(T,r));assert.deepEqual(ac,bc);
   for(const quality of ['low','balanced','high']){const current=rubble(T,a,ac,terrain,quality).mesh,prior=rubble(T,b,bc,terrain,quality).mesh;for(const m of [current,prior]){track(m.geometry);track(m.material);}assert.equal(current.count,prior.count);assert.ok(bytes(current.instanceMatrix).equals(bytes(prior.instanceMatrix)));assert.ok(bytes(current.instanceColor).equals(bytes(prior.instanceColor)));assert.deepEqual(current.userData.rockIndices,prior.userData.rockIndices);}
  }
 });
 it('owns one static color attribute per existing rock and disposes independently without adding meshes or materials',()=>{
  const a=spawn(source),b=spawn(source),disposed={a:0,b:0};assert.equal(a.rocks.length,44);assert.equal(a.rocks.reduce((n,r)=>n+r.geometry.attributes.color.array.byteLength,0),44*5100);
  for(const [label,fixture]of [['a',a],['b',b]])for(const rock of fixture.rocks)for(const object of [rock.geometry,rock.material])object.addEventListener('dispose',()=>disposed[label]++);
  for(const rock of a.rocks)for(const object of [rock.geometry,rock.material]){object.dispose();owned.delete(object);}assert.deepEqual(disposed,{a:88,b:0});for(const rock of b.rocks){assert.equal(rock.geometry.attributes.color.version,0);assert.equal(rock.geometry.attributes.position.count,425);assert.equal(rock.geometry.index.count,2160);}
 });
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
