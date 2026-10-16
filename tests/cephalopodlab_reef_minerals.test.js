import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function region(from,to){const a=source.indexOf(from),b=source.indexOf(to,a);assert.ok(a>=0&&b>a,from);return source.slice(a,b);}
const helper=region('      function shadeCLHuntRockSurface(shader) {','      // Static branch coordinates keep shallow coral pores');
const shade=new Function(helper+';return shadeCLHuntRockSurface;')();
function program(){const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{sentinel:{value:3}}};shade(shader);return shader;}
const shader=program();
const definitions=[...shader.fragmentShader.matchAll(/float (clRock\w+)\(([^)]*)\)\{([^{}]*)\}/g)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const scalarSource=definitions.map(([,name,args,body])=>'function '+name+'('+args.replace(/float /g,'')+'){'+body.replace(/\bfloat /g,'let ')+'}').join('\n');
const f=new Function('floor','fract','abs','mod','mix','min','max','clamp','smoothstep',scalarSource+';return {'+definitions.map(([,name])=>name).join(',')+'};')(
  Math.floor,x=>x-Math.floor(x),Math.abs,(x,y)=>x-y*Math.floor(x/y),(a,b,t)=>a+(b-a)*t,Math.min,Math.max,clamp,smoothstep,
);
function sample(point){const coarse=f.clRockCoarseField(...point),grain=f.clRockGrainField(...point);return {coarse,grain,bed:f.clRockBedField(f.clRockBedPhase(...point,coarse))};}

function construct(derivatives){
  const fallback=region('        function reefSurface(shader){','        // ─── Reef rocks');
  const rocks=region('        var rocks = [];','        // ─── Curved branching coral colonies');
  let seed=2741;const draws=[],math=Object.create(Math);
  math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/4294967296;draws.push(value);return value;};
  const renderer={capabilities:{isWebGL2:derivatives},extensions:{has(){return false;}}};
  const scene=new Function('THREE','Math','renderer',helper+fallback+';var scene=new THREE.Scene();'+rocks+';return scene;')(THREE,math,renderer);
  return {scene,draws,dispose(){scene.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});}};
}

describe('Cephalopod Hunter reef mineral finish',()=>{
  it('uses the current PBR normal stage and existing two noise samples without adding resources or animation',()=>{
    assert.match(helper,/clRockBedField/);assert.match(helper,/inverseTransformDirection\(normal,viewMatrix\)/);
    assert.doesNotMatch(helper,/Math\.random|\btexture2D\b|\buniform\b|\btime\b|\bfor\s*\(|\bwhile\s*\(/);
    assert.equal((helper.match(/return clRockValueNoise\(/g)||[]).length,2);
    assert.deepEqual(shader.uniforms,{sentinel:{value:3}});
    const normalAt=shader.fragmentShader.indexOf('#include <normal_fragment_maps>');
    const crustAt=shader.fragmentShader.indexOf('vec3 clRockWorldNormal=');
    const tintAt=shader.fragmentShader.indexOf('diffuseColor.rgb*=vec3(clRockMineralChannel');
    const reliefAt=shader.fragmentShader.indexOf('normal=normalize(normal-clRockGradient)');
    const lightingAt=shader.fragmentShader.indexOf('#include <lights_physical_fragment>');
    assert.ok(normalAt<crustAt&&crustAt<tintAt&&tintAt<reliefAt&&reliefAt<lightingAt);
    assert.doesNotMatch(shader.fragmentShader,/dFd[xy]\(clRock(?:BedAA|CoarseAA|GrainAA)/);
    assert.ok(!shader.fragmentShader.includes('\\n'));
  });

  it('keeps broad layer color, upper crust, and roughness bounded across real local-rock samples and distant filtering',()=>{
    let minTone=Infinity,maxTone=-Infinity,crusted=0,uncrusted=0;
    for(let x=-2;x<=2;x+=.29)for(let y=-2;y<=2;y+=.31)for(let z=-2;z<=2;z+=.37){
      const value=sample([x,y,z]);
      for(const aa of [0,.2,.65,1]){
        const tone=f.clRockLayerTone(value.bed,aa,value.coarse,aa);
        assert.ok(Number.isFinite(tone)&&tone>=.905-1e-12&&tone<=1.175+1e-12);
        minTone=Math.min(minTone,tone);maxTone=Math.max(maxTone,tone);
        for(const up of [-1,0,.45,1]){
          const crust=f.clRockCrustWeight(value.coarse*aa,up);
          assert.ok(crust>=0&&crust<=.65);if(up<=0)assert.equal(crust,0);
          if(crust>.25)crusted++;if(crust===0)uncrusted++;
          for(const deposit of [1.28,1.30,1.24]){
            const channel=f.clRockMineralChannel(tone,crust,deposit);
            assert.ok(Number.isFinite(channel)&&channel>=.905-1e-12&&channel<=1.30);
          }
          const base=f.clRockRoughness(.92,value.coarse*aa,value.grain,aa);
          const roughness=f.clRockWeatheredRoughness(base,value.bed,aa,crust);
          assert.ok(Number.isFinite(roughness)&&roughness>=.86&&roughness<=.98);
        }
      }
    }
    assert.ok(maxTone-minTone>.15,'Broad mineral contrast must survive the ordinary rock scale');
    assert.ok(crusted>0&&uncrusted>0,'Crust must form broken patches with exposed stone');
    assert.equal(f.clRockLayerTone(1,0,-1,0),f.clRockLayerTone(0,0,1,0));
    assert.equal(f.clRockWeatheredRoughness(.92,1,0,0),f.clRockWeatheredRoughness(.92,0,0,0));
  });

  it('keeps negative and positive bedding seams continuous and filters detail without differentiating AA weights',()=>{
    for(let turn=-12;turn<=12;turn++){
      assert.equal(f.clRockBedField(turn),0);
      assert.equal(f.clRockBedField(turn-1e-6),f.clRockBedField(turn+1e-6));
      assert.equal(f.clRockBedField(turn+.5),1);
    }
    const line=shader.fragmentShader.match(/float clRockHx=([^;]+);/);assert.ok(line);
    // Execute the production derivative composition with finite differences of
    // the production scalar fields. No relief coefficients are copied here.
    const gradient=new Function('dFdx','clRockCoarseAA','clRockGrainAA','clRockBedAA','const clRockCoarse="coarse",clRockGrain="grain",clRockBed="bed";return '+line[1]+';');
    let nonzero=0;
    for(let x=-1.8;x<=1.8;x+=.13){
      const epsilon=1e-5,before=sample([x-epsilon,.31,-.47]),after=sample([x+epsilon,.31,-.47]);
      const derivatives=Object.fromEntries(Object.keys(before).map(key=>[key,(after[key]-before[key])/(2*epsilon)]));
      const raw=gradient(key=>derivatives[key],1,1,1),bounded=raw*f.clRockSlopeLimit(Math.abs(raw));
      assert.ok(Number.isFinite(bounded)&&Math.abs(bounded)<=.120000000000001);
      if(Math.abs(raw)>.01)nonzero++;
      const hidden=gradient(key=>derivatives[key],0,0,0);assert.ok(hidden===0);
      const noBed=gradient(key=>key==='bed'?1e10:derivatives[key],1,1,0);
      assert.equal(noBed,gradient(key=>key==='bed'?-1e10:derivatives[key],1,1,0));
    }
    assert.ok(nonzero>0,'Live bedding produces bounded surface relief');
  });

  it('anchors bedding to the object and upper crust to the world through rotated and nonuniformly scaled rocks and camera orbits',()=>{
    const point=[.42,-.28,.65],localSample=sample(point),normal=new THREE.Vector3(.28,.91,-.30).normalize();
    for(const rotation of [[0,0,0],[Math.PI,0,0],[.7,-1.2,.4]]){
      const model=new THREE.Matrix4().compose(new THREE.Vector3(6,.5,-4),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,.72,1.18));
      const expected=normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(model)).normalize();
      const expectedCrust=f.clRockCrustWeight(localSample.coarse,expected.y);
      for(const cameraPoint of [[0,3,7],[-7,1,3],[2,9,-4]]){
        const camera=new THREE.PerspectiveCamera(70,1,.1,200);camera.position.set(...cameraPoint);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
        const modelView=new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,model);
        // Three's normalMatrix performs inverse transpose; inverseTransformDirection
        // then removes the camera rotation. This includes the real nonuniform scale.
        const viewNormal=normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(modelView)).normalize();
        const worldNormal=viewNormal.transformDirection(camera.matrixWorld);
        assert.ok(worldNormal.distanceTo(expected)<1e-12);
        assert.ok(Math.abs(f.clRockCrustWeight(localSample.coarse,worldNormal.y)-expectedCrust)<1e-12);
        assert.deepEqual(sample(point),localSample);
      }
    }
  });

  it('retains fallback shading, seeded geometry, substrate identity, shadows, and the original resource budget',()=>{
    const active=construct(true),fallback=construct(false);
    try{
      assert.equal(active.scene.children.length,44);assert.equal(active.draws.length,354);assert.deepEqual(active.draws,fallback.draws);
      for(let i=0;i<active.scene.children.length;i++){
        const a=active.scene.children[i],b=fallback.scene.children[i];
        for(const key of ['position','normal','color','uv'])assert.deepEqual(a.geometry.attributes[key].array,b.geometry.attributes[key].array);
        assert.deepEqual(a.geometry.index.array,b.geometry.index.array);
        assert.deepEqual(a.position.toArray(),b.position.toArray());assert.deepEqual(a.rotation.toArray(),b.rotation.toArray());assert.deepEqual(a.scale.toArray(),b.scale.toArray());
        assert.deepEqual(a.userData,b.userData);assert.deepEqual(a.material.color.toArray(),b.material.color.toArray());
        assert.equal(a.material.customProgramCacheKey(),'cl-rock-minerals-v2');assert.equal(a.material.onBeforeCompile.name,'shadeCLHuntRockSurface');
        assert.equal(b.material.onBeforeCompile.name,'reefSurface');assert.equal(!!b.material.extensions?.derivatives,false);
        assert.ok(a.castShadow&&a.receiveShadow&&b.castShadow&&b.receiveShadow);
        assert.ok(!Object.values(a.material).some(value=>value?.isTexture));assert.ok(!Object.values(b.material).some(value=>value?.isTexture));
      }
      const fallbackShader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
      fallback.scene.children[0].material.onBeforeCompile(fallbackShader);
      assert.match(fallbackShader.fragmentShader,/float clVeins=/);assert.doesNotMatch(fallbackShader.fragmentShader,/clRockBed|clRockCrust/);
    }finally{active.dispose();fallback.dispose();}
  });
});
