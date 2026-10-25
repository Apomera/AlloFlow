import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let world;
beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};
  loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  world=window.__RR_TEST_EXPORTS__.butterfly.buildWorld(THREE,window.StemMeadow);
});
afterAll(()=>{
  const resources=new Set();world?.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});
  resources.forEach(resource=>resource.dispose());
});
function emitted(material){
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);return shader;
}
// Extract an assignment while respecting commas inside GLSL calls. Executing the
// emitted expressions catches bypasses of the recovered key, not just its presence.
function expression(source,name){
  const match=new RegExp('\\b'+name+'\\s*=').exec(source);if(!match)throw Error('Missing shader assignment: '+name);
  const start=match.index+match[0].length;let depth=0,end=start;
  for(;end<source.length;end++){const c=source[end];if(c==='(')depth++;if(c===')')depth--;if(depth===0&&(c===','||c===';'))break;}
  return source.slice(start,end);
}
const scalarHelpers={floor:Math.floor,fract:x=>x-Math.floor(x),sin:Math.sin,mod:(x,y)=>x-y*Math.floor(x/y),vec2:(x,y=x)=>({x,y}),dot:(a,b)=>a.x*b.x+a.y*b.y};
function evaluate(source,name,inputs){
  const fn=new Function(...inputs,...Object.keys(scalarHelpers),'return ('+expression(source,name)+');');
  return (...values)=>fn(...values,...Object.values(scalarHelpers));
}
const bits=new DataView(new ArrayBuffer(4));
function adjacent(value,steps){
  bits.setFloat32(0,value);let encoded=bits.getUint32(0);
  if(value===0){bits.setUint32(0,Math.abs(steps));return Math.sign(steps)*bits.getFloat32(0);}
  bits.setUint32(0,encoded+(value>0?steps:-steps));return bits.getFloat32(0);
}
function perspective(value,weights,depths){
  const f=Math.fround;
  const numerator=f(f(f(f(value*depths[0])*weights[0])+f(f(value*depths[1])*weights[1]))+f(f(value*depths[2])*weights[2]));
  const denominator=f(f(f(depths[0]*weights[0])+f(depths[1]*weights[1]))+f(depths[2]*weights[2]));
  return f(numerator/denominator);
}
function interpolated(value){
  const v=Math.fround(value);
  return [adjacent(v,-2),adjacent(v,-1),adjacent(v,1),adjacent(v,2),
    perspective(v,[1/3,1/3,1/3],[1,.31,.07]),perspective(v,[.97,.02,.01],[.002,.01,1]),perspective(v,[.125,.5,.375],[.23,.71,.11])];
}

describe('Butterfly vegetation shape stability',()=>{
  it('keeps all grass cards stable through float32 interpolation while retaining their individual blades',()=>{
    const grass=world.scene.getObjectByName('shared-meadow-grass'),shader=emitted(grass.material),v=shader.vertexShader,f=shader.fragmentShader;
    const raw=evaluate(v,'bfGrassSeed',['bfRoot','bfGrassCard']),encode=evaluate(v,'bfGrassShapeSeed',['bfGrassSeed']);
    const recover=evaluate(f,'bfStableGrassSeed',['bfGrassShapeSeed']);
    const hashes=['bfRandom','bfGrowth','bfHabit','bfNaturalLean','bfBase'].map(name=>evaluate(f,name,['bfStableGrassSeed','bfGrassSeed','bfBlade']));
    const cards=[...new Set(grass.geometry.attributes.bfGrassCard.array)],matrix=new THREE.Matrix4();
    let checks=0,driftedInputs=0,unstableControl=0,maxRecoveryError=0,maxShapeDifference=0,distinctBlades=new Set();
    const stride=Math.max(1,Math.floor(grass.count/256));
    for(let instance=0;instance<grass.count;instance++){
      grass.getMatrixAt(instance,matrix);const root={xz:{x:matrix.elements[12],y:matrix.elements[14]}};
      for(const card of cards){
        const phase=Math.fround(raw(root,card)),key=Math.fround(encode(phase)),stable=recover(key),perturbed=interpolated(key),rawPerturbed=interpolated(phase);
        maxRecoveryError=Math.max(maxRecoveryError,Math.abs(stable-phase));
        for(const received of perturbed){if(received!==key)driftedInputs++;expect(recover(received)).toBe(stable);checks++;}
        if(instance%stride!==0)continue;
        for(let blade=0;blade<7;blade++)for(const hash of hashes){
          const expected=hash(stable,phase,blade);distinctBlades.add(expected);
          for(let p=0;p<perturbed.length;p++){
            const actual=hash(recover(perturbed[p]),rawPerturbed[p],blade);
            maxShapeDifference=Math.max(maxShapeDifference,Math.abs(actual-expected));
            if(hash(rawPerturbed[p],rawPerturbed[p],blade)!==hash(phase,phase,blade))unstableControl++;
          }
        }
      }
    }
    expect(cards).toHaveLength(3);expect(checks).toBeGreaterThan(100000);expect(driftedInputs).toBeGreaterThan(10000);
    expect(maxRecoveryError).toBeLessThanOrEqual(1/128);expect(maxShapeDifference).toBe(0);
    expect(distinctBlades.size).toBeGreaterThan(1000);expect(unstableControl).toBeGreaterThan(1000);
  });

  it('keeps canopy habits, tiled shoots and leaf variation stable for the actual authored seed attributes',()=>{
    const materials=new Map();world.scene.traverse(o=>{if(o.geometry?.attributes.bfFoliageSeed&&!materials.has(o.geometry))materials.set(o.geometry,o.material);});
    let checks=0,driftedInputs=0,maxRecoveryError=0,maxShootDifference=0,maxLeafDifference=0,unstableControl=0;
    const habits=new Set(),densities=new Set(),keys=new Set();
    for(const [geometry,material] of materials){
      const shader=emitted(material),v=shader.vertexShader,f=shader.fragmentShader;
      const encode=evaluate(v,'bfLeafSeed',['bfFoliageSeed']),recover=evaluate(f,'bfStableLeafSeed',['bfLeafSeed']);
      const shoot=evaluate(f,'bfShootSeed',['bfStableLeafSeed','bfLeafSeed','bfShootTile']);
      const habit=evaluate(f,'habit',['seed']),local=evaluate(f,'seed',['seed']);
      const variation=evaluate(f,'variation',['seed','k']),uneven=evaluate(f,'uneven',['seed','k']);
      const seeds=geometry.attributes.bfFoliageSeed,density=geometry.attributes.bfFoliageDensity,seen=new Set();
      for(let vertex=0;vertex<seeds.count;vertex++){
        const seed=seeds.getX(vertex),d=density.getX(vertex),signature=seed+':'+d;if(seen.has(signature))continue;seen.add(signature);densities.add(d);
        const encoded=Math.fround(encode(seed)),stable=recover(encoded),perturbed=interpolated(encoded);
        maxRecoveryError=Math.max(maxRecoveryError,Math.abs(stable-seed));habits.add(habit(stable));
        for(let x=0;x<d;x++)for(let y=0;y<d;y++){
          const tile={x,y},expected=shoot(stable,encoded,tile),localSeed=local(expected);keys.add(expected);
          expect(habit(expected)).toBe(habit(seed));
          for(const received of perturbed){
            if(received!==encoded)driftedInputs++;
            const actual=shoot(recover(received),received,tile);maxShootDifference=Math.max(maxShootDifference,Math.abs(actual-expected));checks++;
            for(let leaf=0;leaf<11;leaf++)for(const shape of [variation,uneven]){
              maxLeafDifference=Math.max(maxLeafDifference,Math.abs(shape(local(actual),leaf)-shape(localSeed,leaf)));
            }
            // A raw interpolated key must expose the pre-fix failure mechanism.
            if(shoot(received/64,received,tile)!==expected)unstableControl++;
          }
        }
      }
    }
    expect(materials.size).toBeGreaterThanOrEqual(9);expect([...habits].sort()).toEqual([0,1,2]);expect([...densities].sort()).toEqual([1,2,3]);
    expect(checks).toBeGreaterThan(10000);expect(driftedInputs).toBeGreaterThan(10000);expect(keys.size).toBeGreaterThan(1000);
    expect(maxRecoveryError).toBeLessThanOrEqual(1/128);expect(maxShootDifference).toBe(0);expect(maxLeafDifference).toBe(0);expect(unstableControl).toBeGreaterThan(1000);
  });
});
