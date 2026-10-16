import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const reference=JSON.parse(readFileSync('tests/fixtures/cephalopod_plant_depth_reference.json','utf8'));
const baselinePath=process.env.CEPHALOPOD_DEPTH_BASELINE;
if(process.env.CEPHALOPOD_EXPECT_PLANT_DEPTH==='1'&&!baselinePath)throw Error('Plant-depth acceptance requires CEPHALOPOD_DEPTH_BASELINE');
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(reference.version,1);assert.equal(reference.baselineSourceSha256,'de5409680da19fd16afbfe5bf3e1120bd681911b78ea2f9abae3053e6245ff9d');
const noRandom=Object.create(Math);noRandom.random=()=>{throw Error('Plant finish consumed simulation RNG');};
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
function helpers(text){return new Function('Math',region(text,'function shadeCLHuntPlantFlex(','function createCLHuntMarineSnowGeometry(')+';return{create:createCLHuntPlantGeometry,shade:shadeCLHuntPlantFlex,update:updateCLHuntPlantFlex,configure:createCLHuntPlantFlex};')(noRandom);}
const live=helpers(source);
const standardShader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
function fixture(kind='kelp',height=7,variant=4,factory=live){
  const geometry=factory.create(THREE,kind,height,variant),material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:kind==='kelp'?.95:.86,transparent:false,depthWrite:true});
  const mesh=kind==='grass'?new THREE.InstancedMesh(geometry,material,7):new THREE.Mesh(geometry,material);if(kind==='grass')mesh.frustumCulled=false;
  return {geometry,material,mesh,dispose(){geometry.dispose();material.dispose();}};
}
function compile(plant,supported,factory=live){const motion=factory.configure(THREE,plant.mesh,plant.geometry.userData.clPlantHeight,supported),shader=standardShader();plant.material.onBeforeCompile(shader);return {shader,motion};}
function withShader(fn){const plant=fixture();try{return fn(compile(plant,true).shader);}finally{plant.dispose();}}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function scalar(shader,name,extra={}){
  const match=shader.fragmentShader.match(new RegExp('float '+name+'\\(([^)]*)\\)\\{([^{}]*)\\}'));assert.ok(match,name);
  const builtins={min:Math.min,max:Math.max,abs:Math.abs,sin:Math.sin,clamp,mix,smoothstep,...extra};
  return new Function(...Object.keys(builtins),...match[1].replace(/float /g,'').split(','),match[2].replace(/\bfloat /g,'let ')).bind(null,...Object.values(builtins));
}
function expression(text,pattern,args){const match=text.match(pattern);assert.ok(match,String(pattern));return new Function(...args,'return '+match[1]+';');}
function fieldMath(shader){
  const phase=scalar(shader,'clPlantRibPhase'),rawField=scalar(shader,'clPlantRibField'),field=(across,along)=>rawField(across,along,phase(across,along));
  return {phase,field,filter:scalar(shader,'clPlantTissueFilter'),tone:scalar(shader,'clPlantRibTone'),roughness:scalar(shader,'clPlantRibRoughness'),transmission:scalar(shader,'clPlantBladeTransmission'),limit:scalar(shader,'clPlantSlopeLimit')};
}
function reliefMath(shader){
  const emitted=shader.fragmentShader,math=fieldMath(shader);
  assert.ok(emitted.includes('clPlantRx=cross(clPlantDy,normal),clPlantRy=cross(normal,clPlantDx)'));
  const hx=expression(emitted.replace(/dFdx\(clPlantRib\)/g,'ribDx'),/float clPlantHx=([^;]+);/,['ribDx','clPlantRibAA','clPlantRibbonWeight']);
  const hy=expression(emitted.replace(/dFdy\(clPlantRib\)/g,'ribDy'),/float clPlantHy=([^;]+);/,['ribDy','clPlantRibAA','clPlantRibbonWeight']);
  const gradient=expression(emitted,/vec3 clPlantGradient=([^;]+);/,['clPlantRx','clPlantRy','clPlantHx','clPlantHy','clPlantDet']);
  const projection=expression(emitted,/clPlantGradient-=([^;]+);/,['normal','dot','clPlantGradient']);
  const cap=expression(emitted,/clPlantGradient\*=([^;]+);/,['clPlantSlopeLimit','length','clPlantGradient']);
  const orientation=emitted.match(/clPlantDet\*=([^;]+);/);assert.ok(orientation);const orient=new Function('det','faceDirection','return det*('+orientation[1]+');');
  const threshold=Number(emitted.match(/if\(clPlantRibbonWeight>0\.0&&abs\(clPlantDet\)>([\d.]+)\)/)?.[1]);assert.ok(threshold>0);
  return {...math,at({dx=[.01,0,0],dy=[0,.01,0],normal=[0,0,1],rib=[.08,-.03],footprint=0,weight=1,doubleSided=true,face=1}={}){
    const n=new THREE.Vector3(...normal).normalize(),rx=new THREE.Vector3(...dy).cross(n),ry=n.clone().cross(new THREE.Vector3(...dx));
    let det=new THREE.Vector3(...dx).dot(rx);if(doubleSided)det=orient(det,face);
    if(weight<=0||Math.abs(det)<=threshold)return {normal:n,gradient:new THREE.Vector3()};
    const x=hx(rib[0],math.filter(footprint),weight),y=hy(rib[1],math.filter(footprint),weight),g=new THREE.Vector3(...[0,1,2].map(axis=>gradient(rx.getComponent(axis),ry.getComponent(axis),x,y,det))),dot=n.dot(g);
    for(let axis=0;axis<3;axis++)g.setComponent(axis,g.getComponent(axis)-projection(n.getComponent(axis),()=>dot,g.getComponent(axis)));
    const magnitude=g.length();g.multiplyScalar(cap(math.limit,()=>magnitude,g));return {normal:n.clone().sub(g).normalize(),gradient:g};
  }};
}
function geometryDigest(factory){
  const digest=createHash('sha256');
  for(const kind of ['grass','kelp'])for(const height of kind==='grass'?[null]:[5,7,9])for(let variant=0;variant<(kind==='grass'?80:25);variant++){
    const geometry=factory.create(THREE,kind,height??(.6+variant/79*1.3),variant);
    try{
      for(const name of ['position','normal','color','uv']){const array=geometry.attributes[name].array;digest.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));}
      const array=geometry.index.array;digest.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));digest.update(JSON.stringify([geometry.boundingBox,geometry.boundingSphere,geometry.userData]));
    }finally{geometry.dispose();}
  }
  return digest.digest('hex');
}

describe('Cephalopod Hunter bounded plant rib relief',()=>{
  it('preserves accepted curled-tip geometry, placement, flex and clocks exactly across all authored variants',()=>{
    assert.equal(hash(live.create.toString()),reference.factorySha256);assert.equal(hash(live.shade.toString()),reference.flexSha256);assert.equal(hash(live.update.toString()),reference.updateSha256);
    assert.equal(geometryDigest(live),reference.geometrySha256);
    assert.equal(hash(region(source,'        var grass = [];','        // Terrain-conforming caustics:')+region(source,'        var kelpStrands = [];','        // ─── Hydrothermal vent')),reference.placementSha256);
    assert.equal(hash(region(source,'            kelpStrands.forEach(function(k) {','            // Vent plume rises')+region(source,'            grass.forEach(function(g) {','            // ─── Floor + caustics follow')),reference.swaySha256);
  });

  it('keeps derivative-free shaders exact and uses the existing ribbon mask, vertex shader and single uniform when supported',()=>{
    for(const kind of ['grass','kelp'])for(const supported of [undefined,false,true]){
      const plant=fixture(kind,kind==='grass'?1.2:7);
      try{
        const {shader,motion}=compile(plant,supported),fingerprint=supported===true?reference.supportedShader:reference.unsupportedShader;
        assert.equal(hash(shader.vertexShader),fingerprint.vertex);assert.equal(shader.uniforms.clPlantMotion,motion);assert.deepEqual(Object.keys(shader.uniforms),['clPlantMotion']);
        if(supported!==true){assert.equal(hash(shader.fragmentShader),fingerprint.fragment);assert.equal(plant.geometry.attributes.clPlantRibbon,undefined);assert.equal(plant.material.customProgramCacheKey(),'cl-plant-flex-v28-water-pulse');assert.ok(!/clPlantRib|clPlantGradient/.test(shader.fragmentShader));}
        else{
          assert.equal(plant.material.customProgramCacheKey(),'cl-plant-flex-v58-rib-relief');assert.equal(plant.material.extensions.derivatives,true);
          assert.ok(shader.fragmentShader.includes('clPlantDet*=faceDirection;'));assert.ok(shader.fragmentShader.includes('#ifdef DOUBLE_SIDED'));
          assert.ok(shader.fragmentShader.includes('dFdx(clPlantRib)*0.004*clPlantRibAA*clPlantRibbonWeight'));
          assert.ok(shader.fragmentShader.includes('dFdy(clPlantRib)*0.004*clPlantRibAA*clPlantRibbonWeight'));
          assert.ok(!/dFd[xy]\(clPlant(?:RibAA|EdgeAA|RibbonWeight|VeinAA|GrainAA)\)/.test(shader.fragmentShader));
          const mask=plant.geometry.attributes.clPlantRibbon;assert.equal(mask.count,kind==='kelp'?301:33);
          for(let vertex=0;vertex<mask.count;vertex++)assert.equal(mask.getX(vertex),kind==='kelp'&&vertex>=141&&vertex<277?0:1);
        }
      }finally{plant.dispose();}
    }
  });

  it('emits visible longitudinal ribs that fade naturally at blade roots, tips and edges and filter out at distance',()=>withShader(shader=>{
    const math=fieldMath(shader);let signChanges=0,last=0;
    for(let i=1;i<200;i++){const value=math.field(i/200,.5);if(last*value<0)signChanges++;last=value;assert.ok(Math.abs(value)<=1+1e-12);}
    assert.ok(signChanges>=7&&signChanges<=9,'Four broad longitudinal ribs should be visible');
    // Multiplication by an exact zero envelope may produce signed zero.
    for(const across of [0,.1,.5,.9,1]){assert.ok(math.field(across,0)===0);assert.ok(math.field(across,1)===0);}
    for(const along of [0,.1,.5,.9,1]){assert.ok(math.field(0,along)===0);assert.ok(math.field(1,along)===0);}
    assert.ok(Math.abs(math.field(.19,.5))>.5,'Nearby broad blade has meaningful relief variation');
    for(const footprint of [-1,0,.35,.7,1.2,5,1e12]){const aa=math.filter(footprint);assert.ok(Number.isFinite(aa)&&aa>=0&&aa<=1);if(footprint>=1.2){assert.equal(aa,0);assert.equal(math.tone(.8,aa),1);assert.equal(math.roughness(.91,.8,aa,1),.91);assert.equal(math.transmission(.8,.7,aa),.18+.08*.8);}}
    assert.ok(shader.fragmentShader.includes('clPlantTissueFilter(fwidth(clPlantRibPhaseValue))'));assert.ok(shader.fragmentShader.includes('clPlantTissueFilter(fwidth(clPlantEdgePhase))'));
  }));

  it('bounds actual lit normal slopes, handles degenerate surfaces and preserves opposing membrane faces',()=>withShader(shader=>{
    const math=reliefMath(shader);
    for(const strength of [-1e6,-2,-.3,0,.3,2,1e6])for(const footprint of [0,.35,.8,1.2,10])for(const weight of [0,.4,1]){
      const result=math.at({rib:[strength,-strength*.7],footprint,weight});assert.ok(result.normal.toArray().every(Number.isFinite));assert.ok(result.gradient.toArray().every(Number.isFinite));
      assert.ok(Math.abs(result.normal.length()-1)<1e-12);assert.ok(result.gradient.length()<=.18+1e-12);assert.ok(Math.abs(result.gradient.z)<1e-12);assert.ok(result.normal.z>=1/Math.sqrt(1+.18*.18)-1e-12);
      if(footprint>=1.2||weight===0)assert.deepEqual(result.normal.toArray(),[0,0,1]);
    }
    for(const [dx,dy]of [[[0,0,0],[0,.01,0]],[[.01,0,0],[.02,0,0]],[[1e-8,0,0],[0,1e-8,0]]])assert.deepEqual(math.at({dx,dy}).normal.toArray(),[0,0,1]);
    const front=math.at(),back=math.at({normal:[0,0,-1],face:-1});assert.ok(front.normal.clone().add(back.normal).length()<1e-12);
    const reverse=math.at({dx:[-.01,0,0],rib:[-.08,-.03]});assert.ok(front.normal.distanceTo(reverse.normal)<1e-12);
    // Sample the emitted raw UV field on a real broad blade, rather than inventing
    // derivatives: nearby rib slopes should visibly perturb its lit normal.
    for(const width of [.42,.65]){
      const x=.2,y=.5,epsilon=1e-5,dx=.01/width,dy=.01/1.5;
      const derivative=(fn,axis)=>(axis===0?fn(x+epsilon,y)-fn(x-epsilon,y):fn(x,y+epsilon)-fn(x,y-epsilon))/(2*epsilon);
      const rib=[derivative(math.field,0)*dx,derivative(math.field,1)*dy],footprint=Math.abs(derivative(math.phase,0)*dx)+Math.abs(derivative(math.phase,1)*dy),near=math.at({rib,footprint});
      assert.ok(near.gradient.length()>.025&&near.gradient.length()<=.18+1e-12,'Broad nearby ribs must change actual normals');
    }
  }));

  it('keeps tone, roughness and backlight restrained while floats, alpha and emissive output remain untouched',()=>withShader(shader=>{
    const math=fieldMath(shader);
    for(const field of [-1,-.5,0,.5,1])for(const aa of [0,.3,1]){
      const tone=math.tone(field,aa);assert.ok(tone>=.945-1e-12&&tone<=1.055+1e-12);
      for(const base of [.01,.82,.86,.95,.98,1]){assert.equal(math.roughness(base,field,aa,0),base);const value=math.roughness(base,field,aa,1);assert.ok(value>=.82&&value<=.98);}
      for(const edge of [0,.5,1]){const amount=math.transmission(edge,field,aa);assert.ok(amount>=.15&&amount<=.3016+1e-12);}
    }
    assert.ok(shader.fragmentShader.includes('if(clPlantRibbonWeight>0.0&&abs(clPlantDet)>'));
    assert.ok(shader.fragmentShader.includes('clPlantTissueTint*clPlantRibTone(clPlantRib,clPlantRibAA),clPlantRibbonWeight'));
    assert.ok(shader.fragmentShader.includes('diffuseColor.rgb*directionalLights[0].color*clPlantRibbonWeight*clPlantBacklight*clPlantBladeTransmission'));
    assert.ok(shader.fragmentShader.includes('#if NUM_DIR_LIGHTS > 0'));
    // Three's accepted physical shader already adjusts transmission alpha.
    // Require identical statements, rather than forbidding its existing code.
    let acceptedFragment=THREE.ShaderLib.standard.fragmentShader;
    assert.equal(hash(acceptedFragment),reference.unsupportedShader.fragment);
    if(baselinePath){
      const before=readFileSync(baselinePath,'utf8');assert.equal(hash(before),reference.baselineSourceSha256);
      const baseline=helpers(before),plant=fixture('kelp',7,4,baseline);
      try{acceptedFragment=compile(plant,true,baseline).shader.fragmentShader;}finally{plant.dispose();}
    }
    const alphaAssignments=fragment=>fragment.match(/diffuseColor\.a\s*[*+/-]?=[^;]*;/g)||[];
    assert.deepEqual(alphaAssignments(shader.fragmentShader),alphaAssignments(acceptedFragment));
    const emissiveLines=fragment=>fragment.split(/\r?\n/).filter(line=>/\b(?:emissive|totalEmissiveRadiance|emissivemap_fragment)\b/.test(line));
    assert.deepEqual(emissiveLines(shader.fragmentShader),emissiveLines(acceptedFragment));
  }));

  it('retains geometry, attributes, materials, uniforms and masks through recompiles and reduced-motion updates without RNG',()=>{
    for(const kind of ['grass','kelp']){
      const plant=fixture(kind,kind==='grass'?1.2:7),attributes=Object.fromEntries(Object.entries(plant.geometry.attributes).map(([name,attr])=>[name,{attr,array:attr.array,values:Array.from(attr.array)}])),savedIndex=plant.geometry.index,uuid=[plant.geometry.uuid,plant.material.uuid];
      try{
        const random=Math.random;let draws=0,result;
        try{Math.random=()=>{draws++;return .375;};result=compile(plant,true);}finally{Math.random=random;}
        assert.equal(draws,0);const {motion}=result,mask=plant.geometry.attributes.clPlantRibbon;
        for(let iteration=0;iteration<4;iteration++){const shader=standardShader();plant.material.onBeforeCompile(shader);assert.equal(shader.uniforms.clPlantMotion,motion);}
        live.update(motion,1200,.4,.0008,false);const moving=motion.value.toArray();live.update(motion,2400,.4,.0008,true);assert.deepEqual(motion.value.toArray(),[...moving.slice(0,3),0]);live.update(motion,4000,.4,.0008,true);assert.deepEqual(motion.value.toArray(),[...moving.slice(0,3),0]);
        for(const [name,saved]of Object.entries(attributes)){assert.equal(plant.geometry.attributes[name],saved.attr);assert.equal(saved.attr.array,saved.array);assert.deepEqual(Array.from(saved.array),saved.values);}
        assert.equal(plant.geometry.index,savedIndex);assert.equal(plant.geometry.attributes.clPlantRibbon,mask);assert.deepEqual([plant.geometry.uuid,plant.material.uuid],uuid);assert.equal(plant.mesh.children.length,0);
        assert.equal(plant.material.transparent,false);assert.equal(plant.material.depthWrite,true);assert.equal(plant.material.opacity,1);assert.equal(plant.material.map,null);assert.equal(plant.material.bumpMap,null);assert.equal(plant.material.normalMap,null);
      }finally{plant.dispose();}
    }
  });

  it.skipIf(!baselinePath)('compares the explicitly supplied accepted baseline without reversing historical edits',()=>{
    const before=readFileSync(baselinePath,'utf8');assert.equal(hash(before),reference.baselineSourceSha256);const baseline=helpers(before);
    for(const helper of ['create','shade','update'])assert.equal(live[helper].toString(),baseline[helper].toString());
    for(const kind of ['grass','kelp'])for(const supported of [false,true]){
      const current=fixture(kind,kind==='grass'?1.2:7),previous=fixture(kind,kind==='grass'?1.2:7,4,baseline);
      try{
        const now=compile(current,supported),old=compile(previous,supported,baseline);assert.equal(now.shader.vertexShader,old.shader.vertexShader);
        assert.deepEqual(current.geometry.boundingBox,previous.geometry.boundingBox);assert.deepEqual(current.geometry.boundingSphere,previous.geometry.boundingSphere);assert.deepEqual(current.geometry.userData,previous.geometry.userData);
        for(const name of Object.keys(previous.geometry.attributes))assert.deepEqual(current.geometry.attributes[name].array,previous.geometry.attributes[name].array);
        assert.deepEqual(current.geometry.index.array,previous.geometry.index.array);assert.deepEqual(Object.keys(now.shader.uniforms),Object.keys(old.shader.uniforms));
        if(!supported){assert.equal(now.shader.fragmentShader,old.shader.fragmentShader);assert.equal(current.material.customProgramCacheKey(),previous.material.customProgramCacheKey());}
        else{assert.notEqual(now.shader.fragmentShader,old.shader.fragmentShader);assert.notEqual(current.material.customProgramCacheKey(),previous.material.customProgramCacheKey());}
      }finally{current.dispose();previous.dispose();}
    }
  });
});
