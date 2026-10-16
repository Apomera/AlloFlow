import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
assert.ok(start>=0&&end>start,'Live animal factory required');
const factory=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.create(Math);noRandom.random=()=>{throw Error('Creature relief consumed simulation RNG');};
const target=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const protectedIds=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const key='cl-octopus-surface-v70-relief-v1',owned=[];
const gl2={capabilities:{isWebGL2:true},extensions:{has(){throw Error('WebGL2 needs no extension query');}}};
function state(extra={}){return {moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra};}
function rig(id='commonOcto'){const animal=factory(THREE,{id,bodyColor:0x99775d},noRandom);owned.push(animal);animal.update(0,0,state());return animal;}
function meshes(animal){const result=[];animal.root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function materials(animal){return [...new Set(meshes(animal).map(mesh=>mesh.material).flat())];}
function compile(material,renderer=gl2){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,renderer);return shader;}
function stage(shader,name){const marker='#include <'+name+'>\n',at=shader.fragmentShader.indexOf(marker);assert.ok(at>=0,name);const next=shader.fragmentShader.indexOf('#include <',at+marker.length);assert.ok(next>at,name);return shader.fragmentShader.slice(at+marker.length,next);}
function functionText(shader,name){const match=shader.fragmentShader.match(new RegExp('float '+name+'\\(([^)]*)\\)\\{([^{}]*)\\}'));assert.ok(match,name);return match;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function scalar(shader,name){const [,args,body]=functionText(shader,name);return new Function('min','max','smoothstep',...args.replace(/float /g,'').split(','),body.replace(/\bfloat /g,'let ')).bind(null,Math.min,Math.max,smoothstep);}
function expression(text,pattern,args){const match=text.match(pattern);assert.ok(match,String(pattern));return new Function(...args,'return '+match[1]+';');}
function close(a,b,epsilon=1e-10){assert.ok(Math.abs(a-b)<=epsilon,a+' differs from '+b);}
function vectorClose(a,b,epsilon=1e-10){for(let index=0;index<3;index++)close(a.getComponent(index),b.getComponent(index),epsilon);}

// Scalar components execute the emitted gradient expressions. THREE vectors supply
// only cross/dot/normalization math, so tests can compare independent surface normals.
function reliefMath(shader){
  const code=stage(shader,'normal_fragment_maps'),limit=scalar(shader,'clOctoSlopeLimit'),filter=scalar(shader,'clOctoDetailFilter');
  assert.ok(code.includes('clOctoRx=cross(clOctoDy,normal),clOctoRy=cross(normal,clOctoDx)'));
  const height=expression(code,/float clOctoRelief=([^;]+);/,['clOctoBodyScale','clOctoBelly']);
  const heightX=expression(code.replace(/dFdx\(clOctoMacro\)/g,'macroDx').replace(/dFdx\(clOctoMedium\)/g,'mediumDx'),/float clOctoHx=([^;]+);/,['macroDx','mediumDx','clOctoMacroAA','clOctoMediumAA','clOctoRelief']);
  const heightY=expression(code.replace(/dFdy\(clOctoMacro\)/g,'macroDy').replace(/dFdy\(clOctoMedium\)/g,'mediumDy'),/float clOctoHy=([^;]+);/,['macroDy','mediumDy','clOctoMacroAA','clOctoMediumAA','clOctoRelief']);
  const gradient=expression(code,/vec3 clOctoGradient=([^;]+);/,['clOctoRx','clOctoRy','clOctoHx','clOctoHy','clOctoDet']);
  const project=expression(code,/clOctoGradient-=([^;]+);/,['normal','dot','clOctoGradient']);
  const cap=expression(code,/clOctoGradient\*=([^;]+);/,['clOctoSlopeLimit','length','clOctoGradient']);
  const oriented=code.match(/clOctoDet\*=([^;]+);/);assert.ok(oriented);
  const orient=new Function('clOctoDet','faceDirection','return clOctoDet*('+oriented[1]+');');
  const threshold=Number(code.match(/if\(abs\(clOctoDet\)>([0-9.]+)\)/)?.[1]);assert.ok(threshold>0&&Number.isFinite(threshold));
  return {limit,filter,height,at({dx=[.01,0,0],dy=[0,.01,0],normal=[0,0,1],macro=[.04,.03],medium=[.15,.20],macroFootprint=0,mediumFootprint=0,scale=1,belly=0,doubleSided=false,face=1}={}){
    const n=new THREE.Vector3(...normal).normalize(),rx=new THREE.Vector3(...dy).cross(n),ry=n.clone().cross(new THREE.Vector3(...dx));
    let determinant=new THREE.Vector3(...dx).dot(rx);if(doubleSided)determinant=orient(determinant,face);
    const h=height(scale,belly),hx=heightX(macro[0],medium[0],filter(macroFootprint),filter(mediumFootprint),h),hy=heightY(macro[1],medium[1],filter(macroFootprint),filter(mediumFootprint),h);
    if(Math.abs(determinant)<=threshold)return {normal:n,gradient:new THREE.Vector3(),height:h};
    const g=new THREE.Vector3(...[0,1,2].map(index=>gradient(rx.getComponent(index),ry.getComponent(index),hx,hy,determinant))),projection=n.dot(g);
    for(let index=0;index<3;index++)g.setComponent(index,g.getComponent(index)-project(n.getComponent(index),()=>projection,g.getComponent(index)));
    const magnitude=g.length(),factor=cap(limit,()=>magnitude,g);g.multiplyScalar(factor);
    return {normal:n.clone().sub(g).normalize(),gradient:g,height:h};
  }};
}

afterEach(()=>{for(const animal of owned.splice(0)){const geometry=new Set(),material=new Set();meshes(animal).forEach(mesh=>{geometry.add(mesh.geometry);for(const value of [mesh.material].flat())material.add(value);});geometry.forEach(value=>value.dispose());material.forEach(value=>value.dispose());}});

describe('Reef octopus bounded surface relief',()=>{
  it('shares the existing frame and scale across mantle, head, arms and double-sided web without new sampling',()=>{
    for(const id of target){
      const animal=rig(id),skin=materials(animal).filter(material=>material.customProgramCacheKey()===key),base=compile(animal.mantleMat);
      assert.equal(skin.length,3,id);assert.equal(meshes(animal).find(mesh=>mesh.name==='cl-head').material,animal.mantleMat);
      assert.equal(meshes(animal).find(mesh=>mesh.name==='cl-webbing').material.side,THREE.DoubleSide);
      for(const material of skin){const shader=compile(material);assert.equal(shader.uniforms.clOctoBodyScale.value,id==='giantPacific'?1.4:1);
        for(const name of ['clPattern','clDisplay','clPhase','clOctoSurfaceFrame','clOctoBodyScale'])assert.equal(shader.uniforms[name],base.uniforms[name]);
        assert.ok(shader.fragmentShader.includes('uniform float clOctoBodyScale;'));assert.equal((shader.fragmentShader.match(/=clNoise\(/g)||[]).length,3);
        assert.ok(shader.fragmentShader.includes('clOctoDet*=faceDirection;'));assert.ok(shader.fragmentShader.includes('#ifdef DOUBLE_SIDED'));
        assert.ok(!/dFd[xy]\(clOcto(?:MacroAA|MediumAA|FineAA|Belly|Strength)\)/.test(shader.fragmentShader));assert.ok(!/dFd[xy]\(clOctoFine\)/.test(shader.fragmentShader));
        assert.equal(material.map,null);assert.equal(material.normalMap,null);assert.equal(material.bumpMap,null);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);
        assert.equal(functionText(shader,'clOctoTone')[0],functionText(base,'clOctoTone')[0]);assert.equal(functionText(shader,'clOctoRoughness')[0],functionText(base,'clOctoRoughness')[0]);
      }
    }
  });

  it('emits relief only for real derivative support and keeps the fallback tone and roughness paths intact',()=>{
    const material=rig().mantleMat,requests=[];
    const supported=compile(material,{capabilities:{isWebGL2:false},extensions:{has(name){requests.push(name);return true;}}});
    assert.deepEqual(requests,['OES_standard_derivatives']);assert.ok(stage(supported,'normal_fragment_maps').includes('dFdx(clOctoMacro)'));
    for(const renderer of [null,{}, {capabilities:{isWebGL2:false},extensions:{has(){return false;}}}]){
      const fallback=compile(material,renderer);assert.ok(!/dFdx\(|dFdy\(|fwidth\(/.test(fallback.fragmentShader));
      assert.ok(!fallback.fragmentShader.includes('vec3 clOctoGradient='));assert.ok(fallback.fragmentShader.includes('float clOctoMediumAA=0.35; float clOctoFineAA=0.0;'));
      assert.equal(stage(fallback,'roughnessmap_fragment'),stage(supported,'roughnessmap_fragment'));
      assert.equal(functionText(fallback,'clOctoTone')[0],functionText(supported,'clOctoTone')[0]);
      assert.equal(fallback.uniforms.clOctoBodyScale,supported.uniforms.clOctoBodyScale);assert.equal(fallback.uniforms.clOctoSurfaceFrame,supported.uniforms.clOctoSurfaceFrame);
    }
  });

  it('bounds finite tangent slopes and normals across steep, degenerate and subpixel samples',()=>{
    const math=reliefMath(compile(rig().mantleMat));
    for(const magnitude of [0,1e-10,.01,.22,1,100,1e8]){const factor=math.limit(magnitude);assert.ok(Number.isFinite(factor)&&factor>=0&&factor<=1);assert.ok(magnitude*factor<=.22+1e-12);}
    for(const value of [-1e6,-100,-1,0,.1,1,100,1e6])for(const belly of [0,.5,1])for(const footprint of [0,.30,.7,1.05,4]){
      const result=math.at({macro:[value,-value*.3],medium:[-value*.8,value],belly,macroFootprint:footprint,mediumFootprint:footprint});
      assert.ok(result.gradient.toArray().every(Number.isFinite)&&result.normal.toArray().every(Number.isFinite));assert.ok(result.gradient.length()<=.22+1e-12);close(result.normal.length(),1);close(result.gradient.z,0);
      assert.ok(result.normal.z>=1/Math.sqrt(1+.22*.22)-1e-12);
      if(footprint>=1.05)vectorClose(result.normal,new THREE.Vector3(0,0,1));
    }
    for(const [dx,dy] of [[[0,0,0],[0,.01,0]],[[.01,0,0],[.02,0,0]],[[1e-8,0,0],[0,1e-8,0]]])vectorClose(math.at({dx,dy}).normal,new THREE.Vector3(0,0,1));
    close(math.height(1,1),math.height(1,0)*.25);assert.ok(math.at({belly:1}).gradient.length()<math.at({belly:0}).gradient.length());
  });

  it('keeps the same relief at species scale and on both faces of a membrane',()=>{
    const math=reliefMath(compile(rig().mantleMat)),front=math.at();
    for(const scale of [.72,1,1.4,3])vectorClose(math.at({dx:[.01*scale,0,0],dy:[0,.01*scale,0],scale}).normal,front.normal);
    const back=math.at({normal:[0,0,-1],doubleSided:true,face:-1});vectorClose(back.normal,front.normal.clone().negate());
    for(const reversed of [false,true]){const row=math.at({dx:reversed?[-.01,0,0]:[.01,0,0],macro:reversed?[-.04,.03]:[.04,.03],medium:reversed?[-.15,.20]:[.15,.20]});vectorClose(row.normal,front.normal);}
  });

  it('keeps animal coordinates and pooled resource identities through world transforms, jets and camouflage',()=>{
    for(const id of target){
      const animal=rig(id),all=meshes(animal),records=all.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,index:mesh.geometry.index,array:mesh.geometry.index?.array,attributes:Object.entries(mesh.geometry.attributes).map(([name,attribute])=>({name,attribute,array:attribute.array})),instances:mesh.instanceMatrix,instanceArray:mesh.instanceMatrix?.array}));
      const shader=compile(animal.mantleMat),frame=shader.uniforms.clOctoSurfaceFrame.value,scale=shader.uniforms.clOctoBodyScale.value;
      const head=all.find(mesh=>mesh.name==='cl-head');
      function coordinate(){head.updateWorldMatrix(true,false);return new THREE.Vector3().fromBufferAttribute(head.geometry.attributes.position,37).applyMatrix4(head.matrixWorld).applyMatrix4(frame).divideScalar(scale);}
      const prior=coordinate();animal.root.position.set(27,-13,9);animal.root.rotation.set(.2,.7,-.1);animal.root.scale.set(1.3,1.3,1.3);animal.update(0,0,state());vectorClose(coordinate(),prior);
      for(let step=0;step<8;step++){animal.update(step*.05,.05,state({moving:step%2===0,jet:step%3===0,substrate:step%2?'grass':'sand',camo:.8,reducedMotion:step===7}));
        assert.equal(compile(animal.mantleMat).uniforms.clOctoSurfaceFrame.value,frame);assert.equal(meshes(animal).length,all.length);
        for(const row of records){assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);assert.equal(row.geometry.index,row.index);assert.equal(row.geometry.index?.array,row.array);assert.equal(row.mesh.instanceMatrix,row.instances);assert.equal(row.mesh.instanceMatrix?.array,row.instanceArray);for(const attr of row.attributes){assert.equal(row.geometry.attributes[attr.name],attr.attribute);assert.equal(attr.attribute.array,attr.array);}}
      }
    }
  });

  it('leaves protected species outside the octopus relief compiler',()=>{
    for(const id of protectedIds){const animal=rig(id);
      for(const material of materials(animal)){const shader=compile(material);assert.notEqual(material.customProgramCacheKey(),key);assert.ok(!shader.fragmentShader.includes('clOctoGradient'));assert.ok(!shader.fragmentShader.includes('clOctoSlopeLimit'));assert.ok(!('clOctoBodyScale' in shader.uniforms));}
    }
  });
});
