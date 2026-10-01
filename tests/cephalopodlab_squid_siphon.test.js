import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
assert.ok(start>=0&&end>start,'Actual animal factory must be present');
const build=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Animal construction/animation consumed dive RNG');}}),allocated=[];
const state=(extra={})=>({moving:false,jet:false,strike:0,strikeAim:null,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
function rig(id='humboldtSquid',T=THREE){const a=build(T,{id,bodyColor:0xbc6048},noRandom);allocated.push(a);return a;}
const point=(g,i)=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i);
const centroid=(g,ring)=>ring.reduce((sum,i)=>sum.add(point(g,i)),new THREE.Vector3()).multiplyScalar(1/ring.length);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function resources(root){const set=new Set();root.traverse(o=>{if(o.geometry)set.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>set.add(m));});return set;}
function funnel(a){const group=a.root.getObjectByName('cl-siphon');assert.ok(group);assert.equal(group.children.length,1);const mesh=group.children[0];assert.equal(mesh.name,'cl-siphon-tube');return{group,mesh,g:mesh.geometry,meta:mesh.geometry.userData.clSquidSiphonGeometry};}
function boundary(g,part){const edges=new Map();for(let i=part.indexStart;i<part.indexStart+part.indexCount;i+=3)for(let j=0;j<3;j++){const a=g.index.getX(i+j),b=g.index.getX(i+(j+1)%3),key=Math.min(a,b)+':'+Math.max(a,b);edges.set(key,(edges.get(key)||0)+1);}return edges;}
function ray(group,mesh,origin,direction){group.updateWorldMatrix(true,true);return new THREE.Raycaster(group.localToWorld(origin.clone()),direction.clone().transformDirection(group.matrixWorld)).intersectObject(mesh)[0];}
function insideActualClosedMesh(mesh,world){mesh.updateWorldMatrix(true,false);const p=mesh.geometry.attributes.position,index=mesh.geometry.index,ray=new THREE.Ray(world.clone(),new THREE.Vector3(.173,1,.291).normalize()),distances=[];
  for(let i=0;i<index.count;i+=3){const v=[0,1,2].map(j=>point(mesh.geometry,index.getX(i+j)).applyMatrix4(mesh.matrixWorld)),hit=ray.intersectTriangle(v[0],v[1],v[2],false,new THREE.Vector3());if(hit){const distance=hit.distanceTo(world);if(!distances.some(value=>Math.abs(value-distance)<1e-7))distances.push(distance);}}
  return distances.length%2===1;
}

// Protected record helper begins. Root measures this exact helper against saved b34.
function captureProtectedFingerprints(build){
  const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto','humboldtSquid','cuttlefish','bobtailSquid','dumboOcto','vampireSquid','nautilus'];
  const result={},noRandom=Object.assign(Object.create(Math),{random(){throw Error('Protected rig consumed dive RNG');}});
  function excluded(o){let siphon=false;for(let p=o;p;p=p.parent){if(p.name==='cl-siphon')siphon=true;if(p.userData.species==='humboldtSquid')return siphon;}return false;}
  function record(a){const rows=[],geometryIds=new Map(),materialIds=new Map();a.root.traverse(o=>{if(excluded(o))return;const row=[o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible,o.userData];
      if(o.isMesh){const g=o.geometry,m=o.material;if(!geometryIds.has(g))geometryIds.set(g,geometryIds.size);if(!materialIds.has(m))materialIds.set(m,materialIds.size);
        const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(shader,{capabilities:{isWebGL2:true},extensions:{has(){return true;}}});
        row.push(geometryIds.get(g),Object.entries(g.attributes).map(([name,v])=>[name,v.usage,Array.from(v.array)]),g.index?Array.from(g.index.array):null,o.isInstancedMesh?[o.count,Array.from(o.instanceMatrix.array)]:null,materialIds.get(m),m.type,m.name,m.color?.toArray(),m.emissive?.toArray(),m.roughness,m.metalness,m.clearcoat,m.clearcoatRoughness,m.side,m.opacity,m.transparent,m.depthWrite,m.vertexColors,m.defines,m.customProgramCacheKey(),shader.vertexShader,shader.fragmentShader,Object.fromEntries(Object.entries(shader.uniforms).map(([name,u])=>[name,u.value?.toArray?u.value.toArray():u.value])));
      }rows.push(row);});return[a.scale,rows,a.arms.map(l=>[l.kind,l.index,l.angle,l.length,l.radius,l.phase,l.points.map(p=>p.toArray())])];}
  for(const id of ids){const a=build(THREE,{id,bodyColor:0xbc6048},noRandom),frames=[];a.root.position.set(12,-3,8);a.root.rotation.set(.27,1.1,-.31,'YXZ');a.root.scale.set(1.3,.8,1.1);
    for(let i=0;i<5;i++){a.update(1+i*.05,.05,{moving:i>0,jet:i===2,strike:i===3?.6:i===4?1:0,strikeAim:i===4?new THREE.Vector3(1.2,.6,.8):null,camo:.6,substrate:['sand','rock','grass','sand','rock'][i],display:i===2,reducedMotion:i===3});a.tint();frames.push(record(a));}
    result[id]=createHash('sha256').update(JSON.stringify(frames)).digest('hex');const owned=new Set();a.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material);});owned.forEach(resource=>resource.dispose());
  }return result;
}
// Protected record helper ends.

afterEach(()=>{for(const a of allocated.splice(0))resources(a.root).forEach(resource=>resource.dispose());});

describe('Humboldt squid continuous muscular funnel',()=>{
  it('retains the existing attachment Group and forward outlet with one owned opaque draw and no unused material',()=>{
    const made=[],T={...THREE,MeshStandardMaterial:class extends THREE.MeshStandardMaterial{constructor(options){super(options);made.push(this);}}},a=rig('humboldtSquid',T),{group,mesh,g,meta}=funnel(a);
    assert.deepEqual(group.position.toArray(),[0,-.215,.31]);assert.deepEqual(group.scale.toArray(),[1,1,1]);assert.deepEqual(group.rotation.toArray(),[0,0,0,'XYZ']);assert.deepEqual(mesh.position.toArray(),[0,0,0]);assert.deepEqual(mesh.scale.toArray(),[1,1,1]);assert.deepEqual(mesh.rotation.toArray(),[0,0,0,'XYZ']);assert.equal(mesh.material.name,'cl-squid-siphon-material');assert.equal(mesh.material.type,'MeshStandardMaterial');assert.equal(mesh.material.vertexColors,true);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.depthWrite,true);assert.equal(mesh.material.side,THREE.FrontSide);assert.equal(mesh.material.roughness,.60);
    const used=resources(a.root);assert.ok(made.every(material=>used.has(material)),'Old inner/lumen materials must not be allocated and abandoned');assert.ok(!Object.values(mesh.material).some(v=>v?.isTexture));const shader={vertexShader:'v',fragmentShader:'f',uniforms:{}};mesh.material.onBeforeCompile(shader);assert.deepEqual(shader,{vertexShader:'v',fragmentShader:'f',uniforms:{}});
    const meshes=[];a.root.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,25);assert.equal(g.groups.length,0);assert.ok(g.attributes.position.count<=700&&g.index.count/3<=1400);assert.deepEqual(meta.openingDirection,[0,0,1]);assert.ok(Math.abs(centroid(g,meta.innerOutletRingIndices).z-.125)<1e-7);
  });

  it('has closed consistently wound indexed topology, finite unit visible normals and conservative bounds',()=>{
    const{g}=funnel(rig()),p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,edges=new Map();assert.deepEqual(Object.keys(g.attributes).sort(),['color','normal','position']);assert.equal(p.count,578);assert.equal(g.index.count/3,1152);assert.equal(p.array.byteLength+n.array.byteLength+c.array.byteLength+g.index.array.byteLength,27720);assert.equal(n.count,p.count);assert.equal(c.count,p.count);assert.ok([...p.array,...n.array,...c.array].every(Number.isFinite));assert.ok(Array.from(c.array).every(v=>v>=0&&v<=1));
    for(let i=0;i<p.count;i++){const v=point(g,i);assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n,i).length()-1)<1e-5);assert.ok(g.boundingBox.distanceToPoint(v)<1e-7);assert.ok(v.distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius+1e-7);assert.ok(Math.abs(v.x)<.10&&v.y>-.073&&v.y<.081&&v.z>=-.127&&v.z<=.129);}
    let end=0;for(const part of g.userData.clSquidSiphonParts){assert.equal(part.indexStart,end);assert.ok(part.indexCount>0&&part.indexCount%3===0);end+=part.indexCount;}assert.equal(end,g.index.count);
    for(let i=0;i<g.index.count;i+=3){const ix=[0,1,2].map(j=>g.index.getX(i+j));assert.ok(ix.every(v=>Number.isInteger(v)&&v>=0&&v<p.count));const[a,b,d]=ix.map(v=>point(g,v)),cross=b.sub(a).cross(d.sub(a)),normal=ix.reduce((sum,v)=>sum.add(new THREE.Vector3().fromBufferAttribute(n,v)),new THREE.Vector3());assert.ok(cross.length()>1e-10);assert.ok(cross.dot(normal)>0,'Actual visible normal opposes triangle '+i/3);
      for(let j=0;j<3;j++){const v=ix[j],w=ix[(j+1)%3],key=Math.min(v,w)+':'+Math.max(v,w),edge=edges.get(key)||{count:0,winding:0};edge.count++;edge.winding+=v<w?1:-1;edges.set(key,edge);}}
    assert.ok([...edges.values()].every(edge=>edge.count===2&&edge.winding===0),'The rolled opening must have a true inner wall and floor');
  });

  it('joins its real outer, rolled and inner surfaces at shared physical triangle boundaries',()=>{
    const{g,meta}=funnel(rig()),parts=g.userData.clSquidSiphonParts;assert.deepEqual(parts.map(p=>p.name),['outer-muscle','rolled-outlet','inner-recess']);
    for(const[ring,left,right]of[[meta.outerOutletRingIndices,parts[0],parts[1]],[meta.innerOutletRingIndices,parts[1],parts[2]]]){assert.equal(ring.length,24);const a=boundary(g,left),b=boundary(g,right);for(let i=0;i<ring.length;i++){const v=ring[i],w=ring[(i+1)%ring.length],key=Math.min(v,w)+':'+Math.max(v,w);assert.equal(a.get(key),1);assert.equal(b.get(key),1);}}
    for(let i=0;i<24;i++){const thickness=point(g,meta.outerOutletRingIndices[i]).distanceTo(point(g,meta.innerOutletRingIndices[i]));assert.ok(thickness>.018&&thickness<.024,'Rolled outlet has physical thickness');}
    assert.ok(centroid(g,meta.outletCrestRingIndices).z>centroid(g,meta.innerOutletRingIndices).z);assert.ok(point(g,meta.recessFloorVertexIndex).z-point(g,meta.basalPoleVertexIndex).z>.035,'The deep cavity still has a solid basal wall');
  });

  it('exposes a genuinely open forward cavity and substantial wall instead of a colored front cap',()=>{
    const a=rig(),{group,mesh,g,meta}=funnel(a),opening=centroid(g,meta.innerOutletRingIndices),inner=g.userData.clSquidSiphonParts[2];a.root.position.set(12,-3,8);a.root.rotation.set(.27,1.1,-.31,'YXZ');
    for(const[x,y]of[[0,0],[.016,0],[-.016,0],[0,.011],[0,-.011]]){const hit=ray(group,mesh,opening.clone().add(new THREE.Vector3(x,y,.20)),new THREE.Vector3(0,0,-1));assert.ok(hit);const local=group.worldToLocal(hit.point.clone());assert.ok(hit.faceIndex>=inner.triangleStart);assert.ok(opening.z-local.z>.17&&local.z<-.045,'Actual aperture ray reaches the concave recess');}
    for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const direction=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0),center=new THREE.Vector3(0,-.002,.065),outside=ray(group,mesh,center.clone().addScaledVector(direction,.3),direction.clone().negate()),inside=ray(group,mesh,center,direction);assert.ok(outside&&inside);assert.ok(outside.point.distanceTo(inside.point)>.010,'Real inner and outer wall hits must be separated');}
  });

  it('embeds its actual basal attachment vertices in the unchanged rendered head/collar through live poses',()=>{
    const a=rig(),{mesh,g,meta}=funnel(a),head=a.root.getObjectByName('cl-head'),collar=a.root.getObjectByName('cl-mantle-collar');assert.ok(head&&collar);assert.equal(meta.basalAttachmentVertexIndices.length,10);
    for(let i=0;i<4;i++){a.root.position.set(12,-3,8);a.root.rotation.set(.27+i*.2,1.1,-.31,'YXZ');a.root.scale.set(1.3,.8,1.1);a.update(2+i*.05,.05,state({jet:i===1,strike:i===2?1:0,strikeAim:i===2?new THREE.Vector3(1.2,.6,.8):null,reducedMotion:i===3}));a.root.updateMatrixWorld(true);
      for(const v of meta.basalAttachmentVertexIndices){assert.ok(Number.isInteger(v)&&v>=0&&v<g.attributes.position.count);const world=mesh.localToWorld(point(g,v));assert.ok(insideActualClosedMesh(head,world)||insideActualClosedMesh(collar,world),'Actual funnel base vertex '+v+' detaches from rendered anatomy');}}
  });

  it('keeps independent static buffers, tint response and actor-owned disposal through motion and frozen updates',()=>{
    const a=rig(),b=rig(),{mesh,g}=funnel(a),other=funnel(b).mesh,arrays=Object.values(g.attributes).map(v=>v.array),versions=Object.values(g.attributes).map(v=>v.version),index=g.index,before=hash([arrays.map(v=>Array.from(v)),Array.from(index.array)]);assert.notEqual(g,other.geometry);assert.notEqual(mesh.material,other.material);
    for(let i=0;i<30;i++){a.update(2+i*.05,i>20?0:.05,state({moving:true,jet:i%3===0,strike:i%5===0?1:0,strikeAim:new THREE.Vector3(1.2,.6,.8),display:i%4===0,camo:.6,reducedMotion:i>15}));a.tint();const expected=a.mantleMat.color.clone().lerp(new THREE.Color(0xa68d78).convertSRGBToLinear(),.28);assert.ok(mesh.material.color.distanceTo?mesh.material.color.distanceTo(expected)<1e-10:mesh.material.color.toArray().every((v,j)=>Math.abs(v-expected.toArray()[j])<1e-10));}
    Object.values(g.attributes).forEach((attribute,i)=>assert.equal(attribute.array,arrays[i],'Animation must retain each original static buffer'));assert.deepEqual(Object.values(g.attributes).map(v=>v.version),versions);assert.equal(g.index,index);assert.equal(hash([arrays.map(v=>Array.from(v)),Array.from(index.array)]),before);assert.equal(mesh.material.vertexColors,true);assert.ok(Object.values(g.attributes).every(v=>v.usage===THREE.StaticDrawUsage));let disposed=0,neighbor=0;[g,mesh.material].forEach(r=>r.addEventListener('dispose',()=>disposed++));[other.geometry,other.material].forEach(r=>r.addEventListener('dispose',()=>neighbor++));g.dispose();mesh.material.dispose();assert.equal(disposed,2);assert.equal(neighbor,0);
  });

  it('preserves every non-siphon Humboldt surface and all eleven complete rigs from measured original b34',()=>{
    const fixture=JSON.parse(readFileSync('tests/fixtures/cephalopod_siphon_protected.json','utf8'));assert.equal(fixture.version,1);assert.equal(fixture.baselineSourceSha256,'b34c982127743a9d1f47ed392d0d48d09fa6adba588560bb178ab5e180e5d369');assert.equal(fixture.exclusion,'Humboldt-only cl-siphon ancestor');assert.equal(Object.keys(fixture.fingerprints).length,12);assert.deepEqual(captureProtectedFingerprints(build),fixture.fingerprints);
  },30000);
});
