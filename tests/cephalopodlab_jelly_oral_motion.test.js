import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),{restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),owned=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
function region(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start);return s.slice(start,end);}
function fixture(s=source){let seed=2741;const draws=[],math=Object.assign(Object.create(Math),{random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296;draws.push(n);return n;}}),f=new Function('THREE','Math','var scene=new THREE.Scene();'+region(s,'var jellyfish = [];','// ─── Surface light rays')+';return{scene,jellyfish,update:updateCLHuntMoonJellyVisual,deform:typeof deformCLHuntJellyOralArm==="function"?deformCLHuntJellyOralArm:null,advance:function(dt,reducedMotion=false){var now=0,gameState={a11y:{reducedMotion:reducedMotion}},octopus={position:{x:0,z:0}};'+region(s,'            jellyfish.forEach(function(jf) {','            // Random bubble SFX')+'}};')(T,math);owned.push(f.scene);return{...f,draws};}
function arms(f){return f.jellyfish.flatMap(j=>j.children.slice(2,6));}
function surface(o){return{position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([n,a])=>[n,Array.from(a.array)])),indices:Array.from(o.geometry.index.array)};}
function materials(j){return j.children.flatMap(o=>(Array.isArray(o.material)?o.material:[o.material]).map(m=>[m.type,m.color.toArray(),m.opacity,m.side,m.roughness,m.metalness,m.transparent,m.depthWrite,m.customProgramCacheKey()]));}
function geometryBudget(j){return{meshes:j.children.length,vertices:j.children.reduce((n,o)=>n+o.geometry.attributes.position.count,0),triangles:j.children.reduce((n,o)=>n+o.geometry.index.count/3,0),draws:j.children.reduce((n,o)=>n+(Array.isArray(o.material)?o.geometry.groups.length:1),0)};}
function coordinates(f){return arms(f).map(o=>Array.from(o.geometry.attributes.position.array));}
function maxDelta(a,b){return Math.max(...a.map((x,i)=>Math.abs(x-b[i])));}
afterEach(()=>{for(const s of owned.splice(0))s.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});});

describe('Moon-jelly flowing oral tissue',()=>{
 it('recovers the accepted gel source and retains all seeded actors, non-oral surfaces, materials and draw counts',()=>{
  const baseline=restorePass48Source(source);assert.equal(hash(baseline),'ead96ebfcbe994c840e56d6251d559cceed1228d1e7f16d8200b16096399453c');const f=fixture(),old=fixture(baseline);assert.deepEqual(f.draws,old.draws);assert.equal(f.draws.length,65);
  for(let i=0;i<5;i++){const a=f.jellyfish[i],b=old.jellyfish[i];assert.deepEqual(a.position.toArray(),b.position.toArray());for(const key of ['pulsePhase','verticalPhase','verticalOffset','driftAngle','driftSpeed'])assert.equal(a.userData[key],b.userData[key]);assert.deepEqual(a.userData.tents.map(t=>t.basePhase),b.userData.tents.map(t=>t.basePhase));assert.equal(a.userData.oralPhaseOrigin,a.userData.pulsePhase);for(const n of [0,1,6,7])assert.deepEqual(surface(a.children[n]),surface(b.children[n]));assert.deepEqual(materials(a),materials(b));assert.deepEqual(geometryBudget(a),{meshes:8,vertices:1961,triangles:3354,draws:9});}
 });
 it('provides independently owned smooth ribbons with finite normals, real indexed faces, conservative bounds and an exact root',()=>{
  const f=fixture(),bases=new Set(),resources=new Set();for(const o of arms(f)){const g=o.geometry,meta=g.userData.clJellyOral;assert.equal(g.attributes.position.count,152);assert.equal(g.index.count/3,240);assert.equal(g.attributes.position.usage,T.DynamicDrawUsage);assert.equal(g.attributes.normal.usage,T.DynamicDrawUsage);assert.notEqual(meta.base,g.attributes.position.array);assert.deepEqual(Array.from(meta.base),Array.from(g.attributes.position.array));assert.deepEqual(Array.from(meta.base.slice(0,3)),[0,0,0]);bases.add(meta.base);resources.add(g);resources.add(o.material);assert.ok(g.boundingBox.min.y<-.8);}
  assert.equal(bases.size,20);assert.equal(resources.size,40);
 });
 it('keeps every live face and normal valid inside retained bounds across large forward and reverse flow phases',()=>{
  const f=fixture();for(const o of arms(f)){const g=o.geometry,position=g.attributes.position,normal=g.attributes.normal,index=g.index,base=g.userData.clJellyOral.base,baseBytes=hash(Buffer.from(base.buffer)),color=Array.from(g.attributes.color.array),box=g.boundingBox.clone(),sphere=g.boundingSphere.clone(),p=position.array,n=normal.array,ix=index.array;
   for(const phase of [-25,-12,-6,-3,0,.1,1,2,4,8,16,25]){f.deform(g,phase);assert.equal(g.attributes.position,position);assert.equal(g.attributes.normal,normal);assert.equal(g.index,index);assert.ok(g.boundingBox.equals(box)&&g.boundingSphere.equals(sphere));assert.equal(hash(Buffer.from(base.buffer)),baseBytes);assert.deepEqual(Array.from(g.attributes.color.array),color);assert.deepEqual(Array.from(p.slice(0,3)),[0,0,0]);const accumulated=new Float64Array(p.length);
    for(let i=0;i<ix.length;i+=3){const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3,ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;assert.ok(Math.hypot(nx,ny,nz)>1e-10,'Noncollapsed oral tissue face');assert.ok(nx*(n[a]+n[b]+n[c])+ny*(n[a+1]+n[b+1]+n[c+1])+nz*(n[a+2]+n[b+2]+n[c+2])>0,'Normals follow the actual oral face');for(const k of [a,b,c]){accumulated[k]+=nx;accumulated[k+1]+=ny;accumulated[k+2]+=nz;}}
    for(let i=0;i<p.length;i+=3){const point=new T.Vector3(p[i],p[i+1],p[i+2]),actual=new T.Vector3(n[i],n[i+1],n[i+2]),expected=new T.Vector3(...accumulated.slice(i,i+3)).normalize();assert.ok(point.toArray().every(Number.isFinite));assert.ok(box.distanceToPoint(point)<1e-7&&point.distanceTo(sphere.center)<=sphere.radius+1e-7);assert.ok(Math.abs(actual.length()-1)<1e-5&&actual.dot(expected)>1-1e-5);assert.equal(p[i+1],base[i+1]);assert.ok(Math.hypot(p[i]-base[i],p[i+2]-base[i+2])<.16);}
   }
  }assert.equal(f.draws.length,65);
 });
 it('moves the tissue internally while retaining mouth attachments and keeping the first active step continuous',()=>{
  const f=fixture(),initial=coordinates(f);f.advance(1/60);const first=coordinates(f);first.forEach((a,i)=>assert.ok(maxDelta(a,initial[i])<.002,'First active step is a small change from the spawn surface'));
  for(let step=0;step<120;step++){const previous=coordinates(f);f.advance(1/60);coordinates(f).forEach((a,i)=>assert.ok(maxDelta(a,previous[i])<.002,'Continuous oral vertex motion'));for(const j of f.jellyfish){const anatomy=j.children[1];anatomy.updateMatrix();for(const o of j.children.slice(2,6)){o.updateMatrix();const attachment=o.geometry.userData.clJellyAttachment,root=new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,0).applyMatrix4(o.matrix),mouth=new T.Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,attachment.mouthCorner).applyMatrix4(anatomy.matrix);assert.ok(root.distanceTo(mouth)<3e-7);}}}
  coordinates(f).forEach((a,i)=>assert.ok(maxDelta(a,initial[i])>.008,'Arm vertices bend instead of only moving as one rigid mesh'));assert.equal(f.draws.length,65);
 });
 it('freezes retained oral positions, normals and uploads for render-only frames and reduced motion, then resumes continuously',()=>{
  const f=fixture();for(let i=0;i<30;i++)f.advance(1/60);const snapshot=()=>arms(f).map(o=>({surface:surface(o),versions:Object.values(o.geometry.attributes).map(a=>a.version)})),before=snapshot();for(let i=0;i<30;i++)f.advance(0);assert.deepEqual(snapshot(),before);for(let i=0;i<60;i++)f.advance(1/60,true);assert.deepEqual(snapshot(),before);const frozen=coordinates(f);f.advance(1/60);coordinates(f).forEach((a,i)=>assert.ok(maxDelta(a,frozen[i])<.002));assert.notDeepEqual(snapshot(),before);assert.equal(f.draws.length,65);
 });
 it('produces the same internal tissue pose at equal elapsed times across 30, 60 and 120 updates per second',()=>{
  const results=[];for(const hz of [30,60,120]){const f=fixture();for(let i=0;i<4*hz;i++)f.advance(1/hz);results.push(coordinates(f));assert.equal(f.draws.length,65);}for(const result of results.slice(1))result.forEach((a,i)=>assert.ok(maxDelta(a,results[0][i])<1e-6));
 });
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
