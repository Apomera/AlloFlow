import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baselinePath=process.env.CEPHALOPOD_CUTTLE_BASELINE;
if(process.env.CEPHALOPOD_EXPECT_CUTTLE_RELIEF==='1'&&!baselinePath)throw Error('CEPHALOPOD_EXPECT_CUTTLE_RELIEF requires CEPHALOPOD_CUTTLE_BASELINE');
const baseline=baselinePath?readFileSync(baselinePath,'utf8'):null;
const species=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto','blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const allocated=[],noRandom=Object.assign(Object.create(Math),{random(){throw Error('Cuttle relief consumed gameplay RNG');}});
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
const factory=text=>new Function('T','species','Math',region(text,'function createCLHuntAnimal(','// Compact, individually owned prey rig.')+';return createCLHuntAnimal(T,species);');
const build=factory(source),oldBuild=baseline?factory(baseline):null;
function rig(id='cuttlefish',prior=false){const r=(prior?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);allocated.push(r);return r;}
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:.7,substrate:'rock',display:false,reducedMotion:false,...extra});
const poses=[pose(),pose({moving:true}),pose({moving:true,jet:true,display:true}),pose({strike:.5,strikeAim:new T.Vector3(.55,-.25,1.3),strikeRadius:.3,strikeBrace:.8}),pose({strike:1,strikeAim:new T.Vector3(-.65,-.2,1.4),strikeRadius:.3,strikeBrace:.8}),pose({reducedMotion:true})];
function parts(r,name){const out=[];r.root.traverse(o=>{if(o.isMesh&&o.name===name)out.push(o);});return out;}
function materials(r){const set=new Set();r.root.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])set.add(m);});return [...set];}
const renderers={webgl2:{capabilities:{isWebGL2:true},extensions:{has(){throw Error('WebGL2 does not need an extension query');}}},webgl1:{capabilities:{isWebGL2:false},extensions:{has:name=>name==='OES_standard_derivatives'}},fallback:{capabilities:{isWebGL2:false},extensions:{has:()=>false}}};
function compile(material,renderer=renderers.webgl2){const shader={vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,renderer);return shader;}
function geometryFingerprint(r){const h=createHash('sha256');r.root.traverse(o=>{h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));if(o.geometry){for(const [name,a]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index){const a=o.geometry.index.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}}if(o.instanceMatrix){const a=o.instanceMatrix.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}});return h.digest('hex');}
function materialData(m){const data=m.toJSON();delete data.uuid;delete data.metadata;return data;}
function uniformData(shader){return Object.fromEntries(Object.entries(shader.uniforms).map(([name,u])=>[name,u.value?.toArray?u.value.toArray():u.value]));}
function scalarFields(fragment){const names=['ReliefMask','ReliefSlopeLimit','DetailFilter'],out={};for(const name of names){const match=fragment.match(new RegExp('float clCut'+name+'\\(([^)]*)\\)\\{([^{}]*)\\}'));assert.ok(match,name+' actual emitted helper');const args=match[1].replace(/float\s+/g,''),body=match[2].replace(/\bfloat\s+/g,'let ');out[name]=new Function('min','max','clamp','smoothstep','return function('+args+'){'+body+'};')(Math.min,Math.max,(v,a,b)=>Math.min(b,Math.max(a,v)),(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);});}return out;}
function retained(r){const rows=[];r.root.traverse(o=>{if(o.geometry)rows.push({o,g:o.geometry,m:o.material,index:o.geometry.index,attrs:Object.entries(o.geometry.attributes).map(([name,a])=>({name,a,array:a.array})),instance:o.instanceMatrix});});return ()=>{for(const row of rows){assert.equal(row.o.geometry,row.g);assert.equal(row.o.material,row.m);assert.equal(row.g.index,row.index);assert.equal(row.o.instanceMatrix,row.instance);for(const a of row.attrs){assert.equal(row.g.attributes[a.name],a.a);assert.equal(a.a.array,a.array);assert.ok(a.array.every(Number.isFinite));}}};}
const reliefNames=['cl-cuttle-skin-material','cl-cuttle-arm-material'];
afterEach(()=>{for(const r of allocated.splice(0)){const owned=new Set();r.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])owned.add(m);});owned.forEach(o=>o.dispose());}});

describe('Cuttlefish bounded lit surface relief',()=>{
  it('adds normal relief only on supported skin programs and uses a distinct cache identity',()=>{
    const r=rig(),skin=materials(r).filter(m=>reliefNames.includes(m.name));assert.equal(skin.length,2);
    for(const m of skin){assert.equal(m.customProgramCacheKey(),'cl-cuttle-surface-v14-relief-v1');const webgl2=compile(m),webgl1=compile(m,renderers.webgl1);assert.equal(webgl2.fragmentShader,webgl1.fragmentShader);assert.equal(webgl2.vertexShader,webgl1.vertexShader);
      const fragment=webgl2.fragmentShader;assert.equal((fragment.match(/float clCutReliefMask\(/g)||[]).length,1);assert.ok(fragment.includes('#include <normal_fragment_maps>\nvec3 clCutDx=dFdx(-vViewPosition)'));assert.ok(fragment.indexOf('float clCutMacro=')<fragment.indexOf('float clCutHx='));assert.ok(fragment.includes('clCutGradient-=normal*dot(normal,clCutGradient);'));assert.ok(fragment.includes('normal=normalize(normal-clCutGradient);'));assert.ok(fragment.includes('if(abs(clCutDet)>0.0000000001)'));assert.ok(fragment.includes('#ifdef DOUBLE_SIDED\nclCutDet*=faceDirection;'));
      for(const renderer of [renderers.fallback,null,{capabilities:{isWebGL2:false}}]){const fallback=compile(m,renderer);assert.ok(!fallback.fragmentShader.includes('clCutRelief'));assert.ok(!/dFd[xy]\(clCut|fwidth\(clCut/.test(fallback.fragmentShader));assert.ok(fallback.fragmentShader.includes('float clCutMediumAA=0.45; float clCutFineAA=0.0;'));assert.equal(fallback.uniforms.clCuttleSurfaceFrame,webgl2.uniforms.clCuttleSurfaceFrame);}
      assert.deepEqual(Object.keys(webgl2.uniforms).sort(),['clCuttleSurfaceFrame','clDisplay','clPattern','clPhase']);assert.equal(m.normalMap,null);assert.equal(m.bumpMap,null);
    }
    const requested=[];compile(skin[0],{capabilities:{isWebGL2:false},extensions:{has(name){requested.push(name);return true;}}});assert.deepEqual(requested,['OES_standard_derivatives']);
    const fins=materials(r).filter(m=>m.name==='cl-cuttle-fin-material');assert.equal(fins.length,2);for(const fin of fins){assert.equal(fin.side,T.DoubleSide);assert.equal(fin.customProgramCacheKey(),'cl-cuttle-surface-v14');for(const renderer of Object.values(renderers))assert.ok(!compile(fin,renderer).fragmentShader.includes('clCutRelief'));}
    const fin=fins[0];try{fin.side=T.FrontSide;assert.ok(compile(fin).fragmentShader.includes('clCutRelief'));assert.equal(fin.customProgramCacheKey(),'cl-cuttle-surface-v14-relief-v1');fin.side=T.DoubleSide;fin.name='cl-cuttle-skin-material';assert.ok(compile(fin).fragmentShader.includes('clCutRelief'));assert.equal(fin.customProgramCacheKey(),'cl-cuttle-surface-v14-relief-v1');}finally{fin.side=T.DoubleSide;fin.name='cl-cuttle-fin-material';}
  });

  it('evaluates bounded dorsal masks, smooth antialiasing and the emitted slope limit numerically',()=>{
    const fragment=compile(rig().mantleMat).fragmentShader,f=scalarFields(fragment);let previous=1;
    for(let i=0;i<=200;i++){const aa=f.DetailFilter(i/100);assert.ok(Number.isFinite(aa)&&aa>=0&&aa<=previous+1e-12);previous=aa;}assert.equal(f.DetailFilter(.35),1);assert.equal(f.DetailFilter(1.1),0);
    for(const dorsal of [-1,0,.1,.5,1,2])for(const ventral of [-1,0,.25,.5,1,2]){const mask=f.ReliefMask(dorsal,ventral);assert.ok(Number.isFinite(mask)&&mask>=0&&mask<=1);if(dorsal===0||ventral===1)assert.equal(mask,0);}assert.equal(f.ReliefMask(1,0),1);
    const slope=fragment.match(/float clCutHx=([^;]+);/);assert.ok(slope,'actual emitted derivative expression');
    const expression=slope[1].replace('dFdx(clCutMacro)','macroDerivative').replace('dFdx(clCutMedium)','mediumDerivative');
    const ySlope=fragment.match(/float clCutHy=([^;]+);/);assert.ok(ySlope);assert.equal(ySlope[1].replace(/dFdy/g,'dFdx'),slope[1],'both screen axes use the same bounded height field');assert.ok(!slope[1].includes('clCutFine'),'fine pigment does not add normal noise');
    const heightDerivative=new Function('macroDerivative','mediumDerivative','clCutMacroAA','clCutMediumAA','clCutReliefWeight','return ('+expression+');');
    assert.ok(fragment.includes('clCutMacroAA=clCutDetailFilter(length(fwidth(clCuttlePos*vec3(4.0,6.0,3.0))))'));assert.ok(!fragment.includes('dFdx(clCutReliefWeight)'));assert.ok(!fragment.includes('dFdy(clCutReliefWeight)'));
    for(const magnitude of [0,1e-12,.001,.05,.14,.2,1,10,1e6]){const scale=f.ReliefSlopeLimit(magnitude);assert.ok(Number.isFinite(scale)&&scale>=0&&scale<=1);assert.ok(magnitude*scale<=.14+1e-12);if(magnitude<=.14)assert.equal(scale,1);}assert.equal(f.ReliefSlopeLimit(1),.14);
    for(const macro of [-10,-1,0,1,10])for(const medium of [-10,-1,0,1,10]){assert.ok(heightDerivative(macro,medium,0,0,1)===0);assert.ok(heightDerivative(macro,medium,1,1,0)===0);const h=heightDerivative(macro,medium,1,1,1),limited=Math.abs(h)*f.ReliefSlopeLimit(Math.abs(h));assert.ok(Number.isFinite(h)&&limited<=.14+1e-12);}assert.ok(heightDerivative(1,1,1,1,1)>0);assert.ok(Math.atan(.14)<8*Math.PI/180,'maximum normal tilt stays below eight degrees');
  });

  it('retains geometry, uniform and material resources through animation and reduced motion',()=>{
    const r=rig(),before=baseline?rig('cuttlefish',true):null,check=retained(r),skin=materials(r).filter(m=>reliefNames.includes(m.name)),snapshots=skin.map(m=>({m,data:materialData(m),shader:compile(m)}));
    for(let frame=0;frame<30;frame++){const state=poses[frame%poses.length];r.update(frame/30,1/30,state);if(before)before.update(frame/30,1/30,state);}check();
    // Reduced motion still accepts intentional pose inputs; only time changes at a fixed pose must be inert.
    const rmIdle=pose({reducedMotion:true}),rmMoving=pose({moving:true,jet:true,strike:1,reducedMotion:true});let heldPose;
    for(const [time,state]of [[10,rmIdle],[20,rmMoving],[80,rmMoving],[100,rmMoving]]){r.update(time,.05,state);const fingerprint=geometryFingerprint(r);if(before){before.update(time,.05,state);assert.equal(fingerprint,geometryFingerprint(before),'accepted reduced-motion pose at '+time);}if(time===20)heldPose=fingerprint;else if(time>20)assert.equal(fingerprint,heldPose,'fixed reduced-motion inputs remain still as time advances');check();}
    assert.deepEqual(Object.keys(compile(r.mantleMat).uniforms).sort(),['clCuttleSurfaceFrame','clDisplay','clPattern','clPhase'],'relief adds no time uniforms');
    for(const {m,data,shader}of snapshots){assert.deepEqual(materialData(m),data);const current=compile(m);assert.equal(current.fragmentShader,shader.fragmentShader);assert.equal(current.vertexShader,shader.vertexShader);for(const name of Object.keys(shader.uniforms))assert.equal(current.uniforms[name],shader.uniforms[name]);}
  });

  if(baseline){
  it('preserves exact pigment, roughness, fins, unsupported fallback and W-shaped eye materials',()=>{
    const r=rig(),before=rig('cuttlefish',true),current=materials(r),prior=materials(before);assert.equal(current.length,prior.length);
    assert.equal(parts(r,'cl-pupil').length,2);assert.equal(parts(r,'cl-iris').length,2);
    for(let index=0;index<current.length;index++){const a=current[index],b=prior[index];assert.equal(a.name,b.name);assert.deepEqual(materialData(a),materialData(b),a.name+' material properties');
      for(const renderer of Object.values(renderers)){const actual=compile(a,renderer),accepted=compile(b,renderer);assert.equal(actual.vertexShader,accepted.vertexShader,a.name+' exact vertex shader');assert.deepEqual(uniformData(actual),uniformData(accepted),a.name+' exact uniforms');
        if(reliefNames.includes(a.name)&&renderer!==renderers.fallback){assert.equal(region(actual.fragmentShader,'#include <color_fragment>','#include <alphamap_fragment>'),region(accepted.fragmentShader,'#include <color_fragment>','#include <alphamap_fragment>'),a.name+' exact pigment chunk');assert.equal(region(actual.fragmentShader,'#include <roughnessmap_fragment>','#include <metalnessmap_fragment>'),region(accepted.fragmentShader,'#include <roughnessmap_fragment>','#include <metalnessmap_fragment>'),a.name+' exact roughness chunk');}
        else assert.equal(actual.fragmentShader,accepted.fragmentShader,a.name+' exact fragment shader');
      }
      if(reliefNames.includes(a.name)){assert.equal(a.customProgramCacheKey(),'cl-cuttle-surface-v14-relief-v1');assert.equal(b.customProgramCacheKey(),'cl-cuttle-surface-v14');}
      else assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey(),a.name+' exact program identity');
    }
    assert.equal(parts(r,'cl-pupil')[0].material.customProgramCacheKey(),'cl-swimmer-pupil-water-v11');
  });

  it('preserves complete geometry and animated poses for all twelve species',()=>{
    for(const id of species){const r=rig(id),before=rig(id,true);assert.equal(geometryFingerprint(r),geometryFingerprint(before),id+' constructed geometry');for(let step=0;step<poses.length;step++){r.update(step*.05,.05,poses[step]);before.update(step*.05,.05,poses[step]);assert.equal(geometryFingerprint(r),geometryFingerprint(before),id+' pose '+step);}}
  },60000);

  it('preserves complete materials and renderer-specific shaders for the other eleven species',()=>{
    for(const id of species.filter(id=>id!=='cuttlefish')){const r=rig(id),before=rig(id,true),current=materials(r),prior=materials(before);assert.equal(current.length,prior.length,id+' material count');
      for(let index=0;index<current.length;index++){const a=current[index],b=prior[index];assert.equal(a.name,b.name,id+' material order');assert.deepEqual(materialData(a),materialData(b),id+' material '+a.name);assert.equal(a.onBeforeCompile.toString(),b.onBeforeCompile.toString(),id+' compiler');assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey(),id+' program identity');
        for(const renderer of Object.values(renderers)){const actual=compile(a,renderer),accepted=compile(b,renderer);assert.equal(actual.vertexShader,accepted.vertexShader,id+' exact vertex shader');assert.equal(actual.fragmentShader,accepted.fragmentShader,id+' exact fragment shader');assert.deepEqual(uniformData(actual),uniformData(accepted),id+' exact shader uniforms');}
      }
    }
  },60000);
  }
});
