import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const {restorePass41ShellSource}=require('./helpers/cephalopod_pass41_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const previous=restorePass41ShellSource(source),allocated=[];
function factory(text){
  const first=text.indexOf('var CRAB_TYPES = {'),last=text.indexOf('// Seed with mix:',first);
  assert.ok(first>=0&&last>first);
  return new Function('THREE','Math','var scene=new THREE.Scene(),octopus={position:new THREE.Vector3(10,.55,-8)};'+text.slice(first,last)+';return{scene,spawn:spawnCrab,types:CRAB_TYPES};');
}
const currentFactory=factory(source),previousFactory=factory(previous);
function fixture(construct=currentFactory){
  const draws=[],sequence=[.125,.25,.375,.5],math=Object.assign(Object.create(Math),{random(){const value=sequence[draws.length%sequence.length];draws.push(value);return value;}});
  const result=construct(THREE,math);allocated.push(result);return{...result,draws};
}
function records(crab){
  return crab.children.map(mesh=>({name:mesh.name,position:mesh.position.toArray(),rotation:mesh.rotation.toArray(),scale:mesh.scale.toArray(),
    attributes:Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,a.array.constructor.name,a.itemSize,a.normalized,Array.from(a.array)]),index:Array.from(mesh.geometry.index.array),
    box:[mesh.geometry.boundingBox.min.toArray(),mesh.geometry.boundingBox.max.toArray()],sphere:[mesh.geometry.boundingSphere.center.toArray(),mesh.geometry.boundingSphere.radius],
    parts:mesh.geometry.userData.clCrabParts,metadata:mesh.geometry.userData.clCrabGeometry,
    material:[mesh.material.type,mesh.material.color.toArray(),mesh.material.roughness,mesh.material.metalness,mesh.material.vertexColors,mesh.material.side,mesh.material.transparent,mesh.material.opacity,mesh.material.depthWrite]}));
}
function standardShader(){return{vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms)};}
const renderers=[{capabilities:{isWebGL2:true}},{capabilities:{isWebGL2:false},extensions:{has:name=>name==='OES_standard_derivatives'}},{capabilities:{isWebGL2:false},extensions:{has:()=>false}},undefined];
afterEach(()=>{for(const item of allocated.splice(0))item.scene.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});});

describe('Cephalopod Hunter carried hermit shell finish',()=>{
  it('retains byte-exact geometry, shell contacts and bounds, child poses, materials and four world-random draws against the literal inverse',()=>{
    const live=fixture(),before=fixture(previousFactory);
    for(const type of ['rock','red','hermit','unknown']){
      const crab=live.spawn(type),old=before.spawn(type);
      assert.deepEqual(records(crab),records(old));assert.deepEqual(crab.position.toArray(),old.position.toArray());assert.deepEqual(crab.userData,old.userData);
      assert.deepEqual(live.draws,before.draws);assert.equal(crab.children.length,type==='hermit'?15:11);
      const geometries=new Set(crab.children.map(mesh=>mesh.geometry)),materials=new Set(crab.children.map(mesh=>mesh.material));
      assert.equal(geometries.size,crab.children.length);assert.equal(materials.size,crab.children.length);
      for(const mesh of crab.children){assert.equal(mesh.geometry.groups.length,0);assert.ok(!Object.values(mesh.material).some(value=>value?.isTexture));}
    }
    assert.equal(live.draws.length,16);
  });

  it('applies the actual StandardMaterial hook only to the three exterior shell slots, with a static owned piece uniform and an explicit fine-detail fallback',()=>{
    const crab=fixture().spawn('hermit'),shells=crab.children.slice(11),other=fixture().spawn('hermit').children.slice(11);
    for(let piece=0;piece<4;piece++){
      const mesh=shells[piece],material=mesh.material,bufferRecords=records(crab);
      const sentinel={vertexShader:'vertex sentinel',fragmentShader:'fragment sentinel',uniforms:{existing:{value:7}}};material.onBeforeCompile(sentinel,renderers[0]);
      assert.deepEqual(sentinel,{vertexShader:'vertex sentinel',fragmentShader:'fragment sentinel',uniforms:{existing:{value:7}}});
      if(piece===1){const shader=standardShader(),copy=standardShader();material.onBeforeCompile(shader,renderers[0]);assert.deepEqual(shader,copy);continue;}
      assert.equal(material.customProgramCacheKey(),'cl-hermit-shell-finish-v1');assert.deepEqual(material.extensions,{derivatives:true});
      for(let profile=0;profile<renderers.length;profile++){
        const shader=standardShader(),names=Object.keys(shader.uniforms);material.onBeforeCompile(shader,renderers[profile]);
        assert.deepEqual(Object.keys(shader.uniforms).filter(name=>!names.includes(name)),['clHermitShellPiece']);assert.equal(shader.uniforms.clHermitShellPiece.value,piece);
        assert.ok(shader.vertexShader.includes('varying vec3 clHermitShellPosition;'));assert.ok(shader.vertexShader.includes('#include <begin_vertex>'));
        assert.ok(shader.fragmentShader.includes('diffuseColor.rgb*=clHermitShellSurface.rgb'));assert.ok(shader.fragmentShader.includes('roughnessFactor=clamp'));
        assert.equal(shader.fragmentShader.includes('#define CL_HERMIT_SHELL_FILTERED 1'),profile<2);
        const match=shader.fragmentShader.match(/vec4 clHermitShellFinish\(vec3 p\)\{[\s\S]*?\n\}/);assert.ok(match);const custom=match[0];
        assert.ok(custom.includes('length(q.xz)>0.00001?atan(q.z,q.x):0.0'),'A real spire pole must not evaluate atan(0,0)');assert.ok(!/\bpow\s*\(/.test(custom));
        if(profile>=2){const active=custom.replace(/#ifdef CL_HERMIT_SHELL_FILTERED\n[\s\S]*?#endif\n/g,'');assert.ok(active.includes('float growth=0.0;'));assert.ok(!/\b(fwidth|dFdx|dFdy)\s*\(/.test(active));}
        const neighboring=standardShader();other[piece].material.onBeforeCompile(neighboring,renderers[profile]);assert.notEqual(shader.uniforms.clHermitShellPiece,neighboring.uniforms.clHermitShellPiece);
      }
      assert.deepEqual(records(crab),bufferRecords,'Compiling the finish does not mutate geometry or material settings');
    }
  });

  it('uses seam-safe angular derivatives that retain distance filtering on actual shell coordinates',()=>{
    const crab=fixture().spawn('hermit'),shader=standardShader();crab.children[11].material.onBeforeCompile(shader,renderers[0]);
    const emitted=shader.fragmentShader;assert.ok(!emitted.includes('fwidth(growthPhase)'));assert.ok(!emitted.includes('fwidth(growthDirection)'));
    const dx=emitted.match(/float angleDx=([^;]+);/),dy=emitted.match(/float angleDy=([^;]+);/);assert.ok(dx&&dy);
    const evaluate=(expression,q,d,axis)=>new Function('q','angularRadiusSq','d','return '+expression.replace(/dFd[xy]\(q\.([xz])\)/g,(_,name)=>'d.'+name))(q,Math.max(q.x*q.x+q.z*q.z,.000001),d);
    const body=crab.children[11],positions=body.geometry.attributes.position;body.updateMatrix();let samples=0;
    for(let i=0;i<positions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(body.matrix),q={x:p.x/.192,y:(p.y-.172)/.162,z:(p.z+.049)/.183};if(Math.hypot(q.x,q.z)<.15)continue;
      // Tangential change of2pi/29 is already a full fine-detail cycle per pixel.
      const rotation=2*Math.PI/29,d={x:-q.z*rotation,z:q.x*rotation},angular=Math.abs(evaluate(dx[1],q,d));assert.ok(Math.abs(29*angular-2*Math.PI)<1e-12);assert.ok(29*angular>.90,'Fine detail must stay faded even when sampled periodic sin/cos directions coincide');
      assert.ok(Number.isFinite(evaluate(dy[1],q,{x:.04,z:.06})));samples++;
    }
    assert.ok(samples>100);for(const sign of [-1,1]){const q={x:-.8,z:sign*.000001};const footprint=Math.abs(evaluate(dx[1],q,{x:0,z:.01}));assert.ok(Math.abs(footprint-.0125)<1e-12,'The two sides of the angle wrap must have the same bounded footprint');}
  });
  it('maps every real outer, lip and spire vertex back to the retained crab-root shell frame independently of crab size',()=>{
    const crab=fixture().spawn('hermit');
    for(const piece of [0,2,3]){
      const mesh=crab.children[11+piece],shader=standardShader();mesh.material.onBeforeCompile(shader,renderers[0]);assert.equal(shader.uniforms.clHermitShellPiece.value,piece);
      mesh.updateMatrix();const position=mesh.geometry.attributes.position;
      for(let vertex=0;vertex<position.count;vertex++){
        const local=new THREE.Vector3().fromBufferAttribute(position,vertex),root=local.clone().applyMatrix4(mesh.matrix);
        const mapped=piece===0?new THREE.Vector3(local.x,local.y*.85+.18,local.z*1.2-.05):new THREE.Vector3(local.x,-local.z+.12+(piece-1)*.06,local.y-.05);
        assert.ok(root.distanceTo(mapped)<2e-16,mesh.name+' vertex '+vertex+' uses the actual retained child transform');assert.ok(mapped.toArray().every(Number.isFinite));
      }
      assert.ok(shader.vertexShader.includes('position*vec3(1.0,0.85,1.2)+vec3(0.0,0.18,-0.05)'));
      assert.ok(shader.vertexShader.includes('vec3(position.x,-position.z,position.y)+vec3(0.0,0.12+(clHermitShellPiece-1.0)*0.06,-0.05)'));
      assert.ok(!shader.vertexShader.includes('clCrabScale'),'The shell geometry never used the crab body size multiplier');
    }
  });
});
