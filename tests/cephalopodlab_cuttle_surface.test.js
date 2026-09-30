import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const begin=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',begin);
if(begin<0||end<=begin)throw Error('Cannot find production animal factory');
const rigSource=source.slice(begin,end),build=new Function('T','species','Math',rigSource+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Cuttle surface consumed dive RNG');}}),allocated=[];
const key='cl-cuttle-surface-v14',state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
const renderer={capabilities:{isWebGL2:true},extensions:{has(){throw Error('WebGL2 does not need a derivative extension query');}}};
function rig(id='cuttlefish'){const a=build(THREE,{id,bodyColor:0x8a7a52},noRandom);allocated.push(a);return a;}
function meshes(a){const out=[];a.root.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
function skinMaterials(a){return [...new Set(meshes(a).map(o=>o.material).filter(m=>m.customProgramCacheKey()===key))];}
function compiled(m,context=renderer){const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(s,context);return s;}

// Captured before pass-fifteen: exclude only the intentionally replaced shell subtree.
function insideNautilusShell(o){for(let p=o;p;p=p.parent)if(p.name==='cl-shell')return true;return false;}
function geometry(a){return meshes(a).filter(o=>!insideNautilusShell(o)).map(o=>[o.name,Object.entries(o.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)]),o.geometry.index?Array.from(o.geometry.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null]);}
function materialRecords(a){return meshes(a).filter(o=>!insideNautilusShell(o)).map(o=>{const m=o.material,s=compiled(m);return[o.name,m.type,m.name,m.color?m.color.toArray():null,m.emissive?m.emissive.toArray():null,m.roughness,m.metalness,m.clearcoat,m.clearcoatRoughness,m.side,m.transparent,m.opacity,m.depthWrite,m.defines,m.customProgramCacheKey(),s.vertexShader,s.fragmentShader,Object.fromEntries(Object.entries(s.uniforms).map(([k,u])=>[k,u.value?.toArray?u.value.toArray():u.value]))];});}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function scalarFunctions(shader){
  // Execute the actual scalar GLSL arithmetic, not a hand-copied alternative implementation.
  const definitions=Array.from(shader.fragmentShader.matchAll(/float (clCut\w+)\(([^)]*)\)\{([^{}]*)\}/g));
  if(definitions.length!==7)throw Error('Expected seven production cuttle surface scalar helpers');
  const js=definitions.map(([,name,parameters,body])=>'function '+name+'('+parameters.replace(/float /g,'')+'){'+body.replace(/\bfloat /g,'let ')+'}').join('\n');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a*(1-t)+b*t,mod=(x,n)=>x-n*Math.floor(x/n);
  const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  return new Function('abs','min','max','sqrt','clamp','mix','mod','smoothstep',js+';return {'+definitions.map(([,name])=>name).join(',')+'};')(Math.abs,Math.min,Math.max,Math.sqrt,clamp,mix,mod,smoothstep);
}
afterEach(()=>{for(const a of allocated.splice(0)){const geometries=new Set(),materials=new Set();meshes(a).forEach(o=>{geometries.add(o.geometry);materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}});

describe('Cuttlefish anatomical camouflage surface',()=>{
  it('extends the real bundled shader on every skin clone and preserves the original passing-cloud coordinates',()=>{
    const a=rig(),materials=skinMaterials(a);expect(THREE.REVISION).toBe('128');expect(materials).toHaveLength(4);
    expect(materials.map(m=>m.name).sort()).toEqual(['cl-cuttle-arm-material','cl-cuttle-fin-material','cl-cuttle-fin-material','cl-cuttle-skin-material']);
    for(const m of materials){const s=compiled(m);
      expect(s.vertexShader.match(/uniform mat4 clCuttleSurfaceFrame;/g)).toHaveLength(1);
      expect(s.vertexShader).toContain('clSkinPos = position;\nclCuttlePos = (clCuttleSurfaceFrame * modelMatrix * vec4(position,1.0)).xyz;');
      expect(s.fragmentShader).toContain('float bands=0.5+0.5*sin(clSkinPos.z*15.0-clPhase*4.0);');
      expect(s.fragmentShader).toContain(' - bands*clDisplay*0.32;');
      expect(s.fragmentShader).toContain('#include <roughnessmap_fragment>\nroughnessFactor=clCutRoughness(');
      expect(s.fragmentShader).toContain('return clCutHash(p.x,p.y,p.z);');
      expect(s.fragmentShader).not.toContain('43758.5453');expect(s.fragmentShader).not.toContain('\\n');
      expect(s.fragmentShader.match(/=clNoise\(/g)).toHaveLength(3);
      expect(m.transparent).toBe(false);expect(m.emissive.getHex()).toBe(0);expect(m.map).toBe(null);expect(m.normalMap).toBe(null);
    }
    const pupil=meshes(a).find(o=>o.name==='cl-pupil').material,iris=meshes(a).find(o=>o.name==='cl-iris').material;
    expect(pupil.customProgramCacheKey()).toBe('cl-swimmer-pupil-water-v11');expect(compiled(pupil).fragmentShader).toContain('vec3 clSwimEyeN=');
    expect(compiled(pupil).fragmentShader).not.toContain('clCutPairedMantle');expect(compiled(iris).fragmentShader).not.toContain('clCutPairedMantle');
  });

  it('gates derivative detail on actual renderer support and keeps a grain-free unsupported fallback',()=>{
    const material=rig().mantleMat,requested=[];
    const supported=compiled(material,{capabilities:{isWebGL2:false},extensions:{has(name){requested.push(name);return true;}}});
    expect(requested).toEqual(['OES_standard_derivatives']);expect(supported.fragmentShader).toContain('fwidth(clCutMediumPos)');expect(supported.fragmentShader).toContain('fwidth(clCutFinePos)');
    for(const context of [null,{capabilities:{isWebGL2:false},extensions:{has(){return false;}}}]){
      const fallback=compiled(material,context);expect(fallback.fragmentShader).not.toMatch(/fwidth\(clCut/);
      expect(fallback.fragmentShader).toContain('float clCutMediumAA=0.45; float clCutFineAA=0.0;');
      expect(fallback.fragmentShader).toContain('clCutPairedMantle');expect(fallback.uniforms.clCuttleSurfaceFrame).toBe(supported.uniforms.clCuttleSurfaceFrame);
    }
    const f=scalarFunctions(supported);let previous=1;
    for(let footprint=0;footprint<=3;footprint+=.025){const aa=f.clCutDetailFilter(footprint);expect(aa).toBeGreaterThanOrEqual(0);expect(aa).toBeLessThanOrEqual(previous);previous=aa;}
    expect(f.clCutDetailFilter(.35)).toBe(1);expect(f.clCutDetailFilter(1.1)).toBe(0);
    expect(f.clCutMottleTone(.9,.5,.4,.45,0,0,.5)).toBe(f.clCutMottleTone(.9,.5,.4,.45,1,0,.5));
  });

  it('bounds pigment, roughness and anatomical masks while giving cover a stronger organized pattern',()=>{
    const shader=compiled(rig().mantleMat),f=scalarFunctions(shader),hashes=new Set();
    for(let x=-80;x<=80;x+=13)for(let y=-45;y<=45;y+=11)for(let z=-100;z<=250;z+=29){const value=f.clCutHash(x,y,z);expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);hashes.add(value);}
    // The bounded final mixer maps 127 integer states onto 75 levels; it is not
    // a permutation. Check complete reachable coverage and reject short spatial
    // repeats instead of demanding an impossible arbitrary level count.
    const hashBody=shader.fragmentShader.match(/float clCutHash\([^)]*\)\{([^{}]*)\}/)[1];
    const terminal=new Function('h','mod',hashBody.slice(hashBody.lastIndexOf('return'))),mod=(x,n)=>x-n*Math.floor(x/n);
    const attainable=new Set(Array.from({length:127},(_,h)=>terminal(h,mod)));
    expect([...hashes].sort((a,b)=>a-b)).toEqual([...attainable].sort((a,b)=>a-b));
    expect(Math.min(...hashes)).toBeLessThan(.02);expect(Math.max(...hashes)).toBeGreaterThan(.98);
    for(const shift of [[2,0,-9],[5,-7,0],[0,1,24]]){let changed=0;
      for(let i=-20;i<=20;i++)if(f.clCutHash(i,i*2,-i)!==f.clCutHash(i+shift[0],i*2+shift[1],-i+shift[2]))changed++;
      expect(changed,'short spatial repeat '+shift.join(',')).toBeGreaterThan(35);
    }
    for(let x=-.8;x<=.8;x+=.08)for(let z=-1.3;z<=.8;z+=.09){const paired=f.clCutPairedMantle(x,z),light=f.clCutLightMantle(x,z);expect(paired).toBeGreaterThanOrEqual(0);expect(paired).toBeLessThanOrEqual(1);expect(light).toBeGreaterThanOrEqual(0);expect(light).toBeLessThanOrEqual(1);expect(paired).toBe(f.clCutPairedMantle(-x,z));expect(light).toBe(f.clCutLightMantle(-x,z));}
    expect(f.clCutLightMantle(0,-.32)).toBe(1);expect(f.clCutLightMantle(0,.5)).toBe(0);
    for(const [x,z]of[[.27,-.88],[.39,-.52],[.40,-.13],[.27,.20]])expect(f.clCutPairedMantle(x,z)).toBe(1);
    for(const pattern of [.22,.72,.9])for(const macro of [0,.25,.5,.75,1])for(const medium of [0,.25,.5,.75,1])for(const fine of [0,.5,1])for(const aa of [0,.45,1])for(const paired of [0,.5,1]){
      const tone=f.clCutMottleTone(pattern,macro,medium,aa,fine,aa,paired),roughness=f.clCutRoughness(.48,macro,medium,aa);
      expect(tone).toBeGreaterThanOrEqual(.5);expect(tone).toBeLessThanOrEqual(1.28);expect(tone-.9*.32).toBeGreaterThan(0);
      expect(roughness).toBeGreaterThanOrEqual(.38);expect(roughness).toBeLessThanOrEqual(.68);
    }
    const contrast=p=>f.clCutMottleTone(p,.5,.5,1,.5,1,0)-f.clCutMottleTone(p,.5,.5,1,.5,1,1);
    expect(contrast(.9)).toBeGreaterThan(contrast(.22)*5);
  });

  it('shares and reuses the root inverse frame through transformed parents and independent mantle/fin transforms',()=>{
    const a=rig(),parent=new THREE.Group();parent.position.set(9,-3,11);parent.rotation.set(.2,.5,-.1);parent.scale.set(1.3,.8,1.1);parent.add(a.root);
    const shared=compiled(a.mantleMat).uniforms.clCuttleSurfaceFrame,originalMatrix=shared.value;
    const samples=['cl-mantle','cl-head','cl-arm-0','cl-fin--1','cl-fin-1'];
    for(let step=0;step<5;step++){
      a.root.position.set(step*.4,.6,-step*.2);a.root.rotation.set(.1,step*.5,-.2);a.update(2+step*.05,.05,state({moving:true,jet:step===2}));parent.updateMatrixWorld(true);
      expect(shared.value).toBe(originalMatrix);const identity=shared.value.clone().multiply(a.root.matrixWorld);
      identity.elements.forEach((v,i)=>expect(v).toBeCloseTo(i%5===0?1:0,10));
      for(const m of skinMaterials(a))expect(compiled(m).uniforms.clCuttleSurfaceFrame).toBe(shared);
      for(const name of samples){const mesh=a.root.getObjectByName(name);expect(mesh,name).toBeTruthy();const local=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,7),rootPoint=local.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(shared.value),expected=local.clone().applyMatrix4(mesh.matrix);
        expect(rootPoint.distanceTo(expected),name+' root-relative pigment').toBeLessThan(1e-9);
      }
    }
  });

  it('retains shared pattern/display phase semantics and stable resources on repeated frozen updates',()=>{
    const a=rig(),materials=skinMaterials(a),s=compiled(a.mantleMat),initialMeshes=meshes(a);
    expect(initialMeshes).toHaveLength(27);expect(new Set(initialMeshes.map(o=>o.geometry)).size).toBe(27);expect(new Set(initialMeshes.map(o=>o.material)).size).toBe(10);
    const resources=initialMeshes.map(o=>[o,o.geometry,o.material,Object.values(o.geometry.attributes).map(attr=>attr.array),o.geometry.index?.array,o.instanceMatrix?.array]);
    for(const [substrate,expected]of[['sand',.22],['grass',.72],['rock',.9]]){a.update(9,.05,state({substrate,display:true,reducedMotion:true}));expect(s.uniforms.clPattern.value).toBe(expected);expect(s.uniforms.clDisplay.value).toBe(.9);expect(s.uniforms.clPhase.value).toBe(9);}
    a.update(9,0,state({substrate:'rock',display:false,reducedMotion:true}));expect(s.uniforms.clDisplay.value).toBe(0);
    const frozen=hash(geometry(a)),matrix=s.uniforms.clCuttleSurfaceFrame.value.toArray();
    for(let i=0;i<8;i++)a.update(9,0,state({substrate:'rock',display:false,reducedMotion:true}));
    expect(hash(geometry(a))).toBe(frozen);expect(s.uniforms.clCuttleSurfaceFrame.value.toArray()).toEqual(matrix);
    for(const m of materials){const u=compiled(m).uniforms;for(const name of ['clPattern','clDisplay','clPhase','clCuttleSurfaceFrame'])expect(u[name]).toBe(s.uniforms[name]);}
    for(const [o,g,m,arrays,index,instances]of resources){expect(o.geometry).toBe(g);expect(o.material).toBe(m);Object.values(g.attributes).forEach((attr,i)=>expect(attr.array).toBe(arrays[i]));expect(g.index?.array).toBe(index);expect(o.instanceMatrix?.array).toBe(instances);}
  });

  it('preserves all twelve animated rigs and unaffected shader contracts outside the later nautilus shell upgrade',()=>{
    // Captured from the live pre-patch factory before integration, across all four states below.
    const octoGeometry='c71b3684b3bbab9a2a6fc56ba10664a4dd21407b6af5eb611776740771e214d9',octoShader='aafc6b2600fe7bf7611c641ef934f5425c07b69a7ac993c3caff22f79d7a701f';
    const expectedGeometry={commonOcto:octoGeometry,blueRinged:'515c36985207b0f129363a312a704256894d5114c017696d0512257e57740ea2',mimicOcto:octoGeometry,giantPacific:'00db592341672e0cdc28cfe10e2829833a94d3de3e664bd3c3d15e5c44335b26',caribReef:octoGeometry,coconutOcto:octoGeometry,humboldtSquid:'bab2d3633aa1fe42e2b056b8d9d4eac6d67bc5991573c25f3f12707a22d777d2',nautilus:'3e1d65a16d453681acb3b11927e4749b01e60b19ee3a8c9e21325d8bdaa66b25',cuttlefish:'6b9e49bf8641ed794ba44c2e8db5e0f9679fd7487a00a66f193da839b8ba52cd',bobtailSquid:'60102c0a95b03d64194e7ba6017ced845e2c889360ec968f3e082860ab5dceeb',dumboOcto:'84d4220256746f8fdbc6bf660bc65c3326d347f2caad30d7e8bda4bcccb2d0f0',vampireSquid:'09e547862fdaaa0a991435a75d6a94cbd0c10b07a83e0da44ca115bee52c6b3e'};
    const expectedShader={commonOcto:octoShader,blueRinged:'ee7c5b849fc6305cf610c48cde50dc863fcd8d6bb9d5258e2f1c7d3cf33a8f12',mimicOcto:octoShader,giantPacific:octoShader,caribReef:octoShader,coconutOcto:octoShader,humboldtSquid:'a0b592f1b3af25092f3dc2547f1b1b392caf8bb41052f475325d94842c10f7a2',nautilus:'379e4322a9da08520bac5210b2e88429942c5569943f355d4bf8d91179568dee',bobtailSquid:'2c5ca72217b5c01eca819fac422a4127ea16486d79fdb189a228b0ab6ad040b7',dumboOcto:'d8db93437e4f27c812a2d66aaa1e911b08e002a68a3e8ab9187bbe142cdafa06',vampireSquid:'62f5386f9933ed7353c19c7651ba9f566932e0862cfa290c90624e2466ed64a7'};
    for(const id of Object.keys(expectedGeometry)){const a=rig(id),geometryFrames=[],materialFrames=[];
      for(let step=0;step<4;step++){a.update(1+step*.05,.05,state({moving:step>0,jet:step===2,strike:step===3?.6:0,camo:.6,substrate:['sand','rock','grass','sand'][step],display:step===2,reducedMotion:step===3}));geometryFrames.push(geometry(a));if(id!=='cuttlefish')materialFrames.push(materialRecords(a));}
      expect(hash(geometryFrames),id+' geometry').toBe(expectedGeometry[id]);if(id!=='cuttlefish')expect(hash(materialFrames),id+' complete materials/shaders/uniforms').toBe(expectedShader[id]);
    }
  },20000);
});
