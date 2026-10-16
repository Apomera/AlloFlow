import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baselinePath=process.env.CEPHALOPOD_DEPTH_BASELINE;
if(process.env.CEPHALOPOD_EXPECT_EYE_DEPTH==='1'&&!baselinePath)throw Error('CEPHALOPOD_EXPECT_EYE_DEPTH requires CEPHALOPOD_DEPTH_BASELINE');
const baseline=baselinePath?readFileSync(baselinePath,'utf8'):null;
const changed=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const protectedSpecies=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const allocated=[],noRandom=Object.assign(Object.create(Math),{random(){throw Error('Eye finish consumed gameplay RNG');}});
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
const factory=text=>new Function('T','species','Math',region(text,'function createCLHuntAnimal(','// Compact, individually owned prey rig.')+';return createCLHuntAnimal(T,species);');
const build=factory(source),oldBuild=baseline?factory(baseline):null;
function rig(id='commonOcto',prior=false){const r=(prior?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);allocated.push(r);return r;}
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:.7,substrate:'rock',reducedMotion:false,...extra});
const poses=[pose(),pose({moving:true}),pose({moving:true,jet:true}),pose({strike:.5,strikeAim:new T.Vector3(.55,-.25,1.3),strikeRadius:.3,strikeBrace:.8}),pose({strike:1,strikeAim:new T.Vector3(-.65,-.2,1.4),strikeRadius:.3,strikeBrace:.8}),pose({reducedMotion:true})];
function parts(r,name){const out=[];r.root.traverse(o=>{if(o.isMesh&&o.name===name)out.push(o);});return out;}
function materials(r){const set=new Set();r.root.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])set.add(m);});return [...set];}
const renderers={webgl2:{capabilities:{isWebGL2:true},extensions:{has:()=>false}},webgl1:{capabilities:{isWebGL2:false},extensions:{has:name=>name==='OES_standard_derivatives'}},fallback:{capabilities:{isWebGL2:false},extensions:{has:()=>false}}};
function compile(material,renderer=renderers.webgl2){const shader={vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,renderer);return shader;}
function geometryFingerprint(r){const h=createHash('sha256');r.root.traverse(o=>{h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));if(o.geometry){for(const [name,a]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index){const a=o.geometry.index.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}}if(o.instanceMatrix){const a=o.instanceMatrix.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}});return h.digest('hex');}
function materialData(m){const data=m.toJSON();delete data.uuid;delete data.metadata;return data;}
function fields(fragment){const names=['Filter','Broad','Fine','Grain','Tone','Edge','Roughness'],out={};for(const name of names){const match=fragment.match(new RegExp('float clReefIris'+name+'\\(([^)]*)\\)\\{([^{}]*)\\}'));assert.ok(match,name+' actual emitted field');const args=match[1].replace(/float\s+/g,''),body=match[2].replace(/\bfloat\s+/g,'let ');out[name]=new Function('sin','abs','clamp','smoothstep','return function('+args+'){'+body+'};')(Math.sin,Math.abs,(v,a,b)=>Math.min(b,Math.max(a,v)),(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);});}return out;}
function retained(r){const rows=[];r.root.traverse(o=>{if(o.geometry)rows.push({o,g:o.geometry,m:o.material,index:o.geometry.index,attrs:Object.entries(o.geometry.attributes).map(([name,a])=>({name,a,array:a.array})),instance:o.instanceMatrix});});return ()=>{for(const row of rows){assert.equal(row.o.geometry,row.g);assert.equal(row.o.material,row.m);assert.equal(row.g.index,row.index);assert.equal(row.o.instanceMatrix,row.instance);for(const a of row.attrs){assert.equal(row.g.attributes[a.name],a.a);assert.equal(a.a.array,a.array);assert.ok(a.array.every(Number.isFinite));}}};}
const collision=new Function(region(source,'function createCLHuntRockCollisionFootprint(','// Small rock-rooted fragments')+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
function corridor(width){const rocks=[-1,1].map(sign=>{const r=new T.Mesh(new T.BoxGeometry(2,2,3),new T.MeshBasicMaterial());r.position.set(sign*(1+width/2),1,0);r.updateMatrixWorld(true);return r;});const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(r=>collision.footprint(T,r)),1,'commonOcto',0,.55);for(const r of rocks){r.geometry.dispose();r.material.dispose();}assert.equal(gap?.walls?.length,2);return gap;}
afterEach(()=>{for(const r of allocated.splice(0)){const owned=new Set();r.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])owned.add(m);});owned.forEach(o=>o.dispose());}});

describe('Reef octopus eye depth from current runtime',()=>{
  it('keeps bilateral curved eyes and horizontal pupils while selecting the bounded wet finish',()=>{
    for(const id of changed){const r=rig(id),irises=parts(r,'cl-iris'),pupils=parts(r,'cl-pupil');assert.equal(irises.length,2);assert.equal(pupils.length,2);
      assert.equal(irises[0].material,irises[1].material);assert.equal(pupils[0].material,pupils[1].material);
      assert.equal(irises[0].material.customProgramCacheKey(),'cl-reef-octopus-iris-depth-v1');assert.equal(pupils[0].material.customProgramCacheKey(),'cl-reef-octopus-pupil-depth-v1');
      assert.ok(irises[0].material.roughness>=.24&&irises[0].material.roughness<=.38);assert.ok(irises[0].material.metalness<=.08);
      assert.ok(pupils[0].material.roughness>=.12&&pupils[0].material.roughness<=.18);assert.ok(pupils[0].material.clearcoat>=.7&&pupils[0].material.clearcoat<=.85);assert.ok(Math.max(...pupils[0].material.color.toArray())<.004);
      for(const eyes of [irises,pupils]){const a=eyes[0].geometry,b=eyes[1].geometry;assert.equal(a.attributes.position.count,b.attributes.position.count);assert.deepEqual(Object.keys(a.attributes),['position','normal',...(eyes===irises?['color']:[])]);
        for(let v=0;v<a.attributes.position.count;v++)for(const name of ['position','normal']){assert.equal(a.attributes[name].getX(v),-b.attributes[name].getX(v));assert.equal(a.attributes[name].getY(v),b.attributes[name].getY(v));assert.equal(a.attributes[name].getZ(v),b.attributes[name].getZ(v));}
      }
      for(const pupil of pupils){pupil.geometry.computeBoundingBox();const size=pupil.geometry.boundingBox.getSize(new T.Vector3());assert.ok(size.z/size.y>3.4&&size.z/size.y<3.6,id+' horizontal aperture');assert.ok(size.x>0,id+' curved pupil dome');}
    }
  });

  it('injects stable filtered shader fields into actual physical chunks with a derivative-free fallback',()=>{
    for(const id of changed){const r=rig(id),iris=parts(r,'cl-iris')[0].material,pupil=parts(r,'cl-pupil')[0].material,compiled={};
      for(const [name,renderer]of Object.entries(renderers)){const shader=compiled[name]=compile(iris,renderer);assert.equal(shader.uniforms.clReefEyeScale.value,r.scale);assert.ok(shader.vertexShader.includes('position.y/clReefEyeScale'));assert.ok(shader.fragmentShader.includes('clReefIrisEdge(clReefIrisRadius,clReefIrisPupilDistance)'));assert.ok(shader.fragmentShader.includes('roughnessFactor=clReefIrisRoughness'));
        if(name==='fallback'){assert.ok(!shader.fragmentShader.includes('fwidth(clReefIrisCoord)'));assert.ok(shader.fragmentShader.includes('clReefIrisBroadAA=0.0,clReefIrisFineAA=0.0,clReefIrisGrainAA=0.0'));}
        else for(const frequency of [18,45,84])assert.ok(shader.fragmentShader.includes('clReefIrisFootprint*'+frequency+'.0'));
        assert.ok(!/clReef.*(?:Time|Phase|Clock)/.test(shader.fragmentShader));
      }
      assert.equal(compiled.webgl2.uniforms.clReefEyeScale,compiled.webgl1.uniforms.clReefEyeScale);assert.equal(compiled.webgl2.fragmentShader,compiled.webgl1.fragmentShader);
      const reflection=compile(pupil).fragmentShader;assert.ok(reflection.includes('reflect(-clOctoEyeV,clOctoEyeN)'));assert.ok(reflection.includes('clOctoEyeBroad*0.24'));assert.ok(reflection.includes(')))),14.0);'));assert.ok(!reflection.includes('clOctoEyeBroad*0.16;'));assert.equal(Object.keys(compile(pupil).uniforms).length,0);
    }
  });

  it('emits finite bounded periodic iris fields, smooth detail attenuation and restrained roughness',()=>{
    const f=fields(compile(parts(rig(),'cl-iris')[0].material).fragmentShader);let prior=1;
    for(let i=0;i<=100;i++){const filter=f.Filter(i*.05);assert.ok(Number.isFinite(filter)&&filter>=0&&filter<=prior+1e-12);prior=filter;}assert.equal(f.Filter(0),1);assert.equal(f.Filter(4),0);
    for(const radius of [0,.2,.5,.8,1,1.2])for(let a=0;a<=96;a++){const angle=-Math.PI+a/96*Math.PI*2,b=f.Broad(angle,radius),fine=f.Fine(angle,radius),grain=f.Grain(angle,radius);for(const value of [b,fine,grain])assert.ok(Number.isFinite(value)&&Math.abs(value)<=1);
      for(const aa of [0,.2,.7,1]){const tone=f.Tone(b,fine,grain,aa,aa,aa),roughness=f.Roughness(.30,fine,aa);assert.ok(tone>=.72&&tone<=1.28);assert.ok(roughness>=.24&&roughness<=.38);if(aa===0){assert.equal(tone,1);assert.equal(roughness,.30);}}
      for(const pupilDistance of [0,.9,1,1.05,1.2,2]){const edge=f.Edge(radius,pupilDistance);assert.ok(Number.isFinite(edge)&&edge>=.58&&edge<=1);}
    }
    for(const name of ['Broad','Fine','Grain'])for(const radius of [0,.3,.8,1])assert.ok(Math.abs(f[name](-Math.PI,radius)-f[name](Math.PI,radius))<1e-12,name+' angular seam');
  });

  it('retains visible resolved iris variation while eliminating subpixel fiber modulation',()=>{
    const f=fields(compile(parts(rig(),'cl-iris')[0].material).fragmentShader),samples=footprint=>Array.from({length:512},(_,i)=>{const a=i/512*Math.PI*2,r=.65;return f.Tone(f.Broad(a,r),f.Fine(a,r),f.Grain(a,r),f.Filter(footprint*18),f.Filter(footprint*45),f.Filter(footprint*84));});
    const near=samples(.06),distant=samples(.30),mean=near.reduce((a,b)=>a+b)/near.length,deviation=Math.sqrt(near.reduce((sum,value)=>sum+(value-mean)**2,0)/near.length);
    assert.ok(deviation>.06&&deviation<.15,'resolved fibers have restrained visible contrast');assert.ok(Math.max(...near)-Math.min(...near)>.2);assert.ok(distant.every(value=>value===1),'unresolved fibers contribute zero modulation');
  });

  it('retains eye resources, uniform identity and still reduced-motion appearance through gameplay poses',()=>{
    for(const id of changed){const r=rig(id),check=retained(r),iris=parts(r,'cl-iris')[0].material,pupil=parts(r,'cl-pupil')[0].material,uniform=compile(iris).uniforms.clReefEyeScale,irisData=materialData(iris),pupilData=materialData(pupil),irisShader=compile(iris).fragmentShader,pupilShader=compile(pupil).fragmentShader;
      for(let frame=0;frame<30;frame++)r.update(frame/30,1/30,poses[frame%poses.length]);check();
      r.update(10,.05,pose({reducedMotion:true}));const still=geometryFingerprint(r);for(const time of [20,80]){r.update(time,.05,pose({moving:true,jet:true,strike:1,reducedMotion:true}));assert.equal(geometryFingerprint(r),still);}
      assert.deepEqual(materialData(iris),irisData);assert.deepEqual(materialData(pupil),pupilData);assert.equal(compile(iris).uniforms.clReefEyeScale,uniform);assert.equal(compile(iris).fragmentShader,irisShader);assert.equal(compile(pupil).fragmentShader,pupilShader);
    }
  });

  it.skipIf(!baseline)('preserves every species complete geometry and poses including pupils, limbs, contacts and valid refuge transforms',()=>{
    for(const id of [...changed,...protectedSpecies]){const r=rig(id),before=rig(id,true);assert.equal(geometryFingerprint(r),geometryFingerprint(before),id+' constructed geometry');for(let step=0;step<poses.length;step++){r.update(step*.05,.05,poses[step]);before.update(step*.05,.05,poses[step]);assert.equal(geometryFingerprint(r),geometryFingerprint(before),id+' pose '+step);}
      if([...changed,'blueRinged'].includes(id)){const crevice=corridor(id==='giantPacific'?.42:.30);for(const animal of [r,before]){animal.root.position.y=.55*animal.scale;animal.root.rotation.y=.73;animal.arms.forEach(a=>a.compressCurrent=.75);animal.update(7,.05,pose({moving:true,squeezeBlend:1,crevice}));}assert.equal(geometryFingerprint(r),geometryFingerprint(before),id+' actual refuge geometry');}
    }
  },30000);

  it.skipIf(!baseline)('preserves excluded materials and compiled shaders including blue-ringed eye anatomy and cache identity',()=>{
    for(const id of [...changed,...protectedSpecies]){const r=rig(id),before=rig(id,true),current=materials(r),prior=materials(before);assert.equal(current.length,prior.length,id+' material count');
      for(let index=0;index<current.length;index++){const a=current[index],b=prior[index];assert.equal(a.name,b.name,id+' material order');if(changed.includes(id)&&['cl-octopus-iris-material','cl-octopus-pupil-material'].includes(a.name))continue;
        assert.deepEqual(materialData(a),materialData(b),id+' unchanged material '+a.name);assert.equal(a.onBeforeCompile.toString(),b.onBeforeCompile.toString(),id+' unchanged compiler');assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey(),id+' unchanged program identity');
        for(const renderer of [renderers.webgl2,renderers.fallback]){const actual=compile(a,renderer),accepted=compile(b,renderer);assert.equal(actual.vertexShader,accepted.vertexShader,id+' exact vertex shader');assert.equal(actual.fragmentShader,accepted.fragmentShader,id+' exact fragment shader');}
      }
      if(id==='blueRinged')assert.equal(parts(r,'cl-pupil')[0].material.customProgramCacheKey(),'cl-octopus-pupil-water-v13');
    }
  },30000);
});
