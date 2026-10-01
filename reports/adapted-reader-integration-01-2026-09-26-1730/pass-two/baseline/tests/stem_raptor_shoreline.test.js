import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name,end,scope={}){const a=source.indexOf('function '+name+'('),b=source.indexOf(end,a);return Function(...Object.keys(scope),'return ('+source.slice(a,b).trim()+')')(...Object.values(scope));}
const build=extract('createShoreReedGeometry','        function planShoreReeds',{THREE});
const plan=extract('planShoreReeds','        var shoreReedMesh');
function seeded(){let seed=73917;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
describe('Raptor shoreline planting',()=>{
  it('builds finite, rooted reed surfaces with valid triangles and quality-scaled detail',()=>{
    for(const count of [4,6]){const geometry=build(count),p=geometry.attributes.position,n=geometry.attributes.normal,ids=geometry.index.array;
      expect(p.count).toBe(count*32+Math.ceil(count/3)*16);
      for(let i=0;i<p.count;i++){expect(p.getY(i)).toBeGreaterThanOrEqual(0);expect(p.getY(i)).toBeLessThan(1.9);expect([p.getX(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)).toBe(true);}
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-7);}
    }
  });
  it('anchors patches to sampled banks rather than a fixed circular radius',()=>{
    const ground=(x,z)=>(Math.hypot(x,z)-105)*0.25+Math.sin(Math.atan2(z,x)*3)*0.4;
    const plants=plan(160,ground,seeded());expect(plants.length).toBe(160);
    for(const p of plants){expect(p.y).toBe(ground(p.x,p.z));expect(p.y).toBeGreaterThanOrEqual(-1.8);expect(p.y).toBeLessThanOrEqual(0.2);expect(Math.hypot(p.x,p.z)).toBeLessThanOrEqual(119);expect(Math.hypot(p.slopeX,p.slopeZ)).toBeLessThanOrEqual(0.7);}
    const radii=plants.map(p=>Math.hypot(p.x,p.z));expect(Math.max(...radii)-Math.min(...radii)).toBeGreaterThan(3);
    expect(plan(160,ground,seeded())).toEqual(plants);
  });
  it('leaves deep water, dry plateaus, and steep banks unplanted',()=>{
    expect(plan(72,()=>-5,seeded())).toEqual([]);expect(plan(72,()=>4,seeded())).toEqual([]);
    expect(plan(72,(x,z)=>(Math.hypot(x,z)-105)*1.2,seeded())).toEqual([]);
  });
});
