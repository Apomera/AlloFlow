import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,p=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
describe('echinoderm disc anatomy',()=>{
 it.each(['low','high'])('resolves the chocolate-chip sieve plate in its own atlas region at %s detail',quality=>{
  const m=S.create(T,'chocolate_chip_sea_star',{quality,seed:7});try{const mesh=m.root.getObjectByName('chocolate_chip_sea_star-fixed-body-knobs'),g=mesh.geometry,r=g.userData.chocolateChipStar.ranges.madreporite,uv=g.attributes.uv;
   for(let i=0;i<uv.count;i++){const tile=uv.getX(i)>=.51999&&uv.getX(i)<=.98001&&uv.getY(i)>=.51999&&uv.getY(i)<=.98001;expect(tile,'plate relief stays isolated at vertex '+i).toBe(i>=r.first&&i<r.first+r.count);}
   for(const [key,range]of [['map',24],['bumpMap',35]]){const {width,height,data}=mesh.material[key].image,values=[];for(let y=Math.ceil(height*.55);y<height*.95;y++)for(let x=Math.ceil(width*.55);x<width*.95;x++)values.push(data[(y*width+x)*4]);expect(Math.max(...values)-Math.min(...values),key+' resolves plate furrows').toBeGreaterThan(range);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('seats the feather-star mouth against actual upper-disc triangles at %s detail',quality=>{
  const m=S.create(T,'bennetts_feather_star',{quality,seed:7});try{const g=m.root.getObjectByName('bennetts_feather_star-disc-cirri-perch').geometry,d=g.userData.featherStar,r=d.ranges.oralOpening,disc=d.ranges.disc,ray=new T.Ray(),hit=new T.Vector3();
   for(let i=r.first;i<r.first+r.count;i++){const point=p(g,i);ray.origin.set(point.x,1,point.z);ray.direction.set(0,-1,0);let surface=-Infinity;
    for(let j=0;j<g.index.count;j+=3){const ids=[0,1,2].map(k=>g.index.getX(j+k));if(ids.some(v=>v<disc.first||v>=disc.first+disc.count))continue;if(ray.intersectTriangle(...ids.map(v=>p(g,v)),false,hit))surface=Math.max(surface,hit.y);}
    const clearance=(point.y-surface)/d.scale;expect(Number.isFinite(clearance)).toBe(true);expect(clearance,'oral marker is embedded at the disc surface').toBeGreaterThan(-.000036);expect(clearance,'oral marker does not float above the disc').toBeLessThan(.000086);
   }
  }finally{m.dispose();}
 });
 it.each(['low','high'])('preserves %s-tier budgets, draws and finite anatomy through motion',quality=>{
  for(const id of ['chocolate_chip_sea_star','bennetts_feather_star']){const m=S.create(T,id,{quality,seed:7});try{const parts=[];m.root.traverse(o=>{if(o.isMesh)parts.push(o);});expect(parts).toHaveLength(2);expect(parts.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='low'?1500:6000);for(const t of [0,1.3,4]){m.update(.016,t);for(const part of parts)for(const a of Object.values(part.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);}}finally{m.dispose();}}
 });
 it('distinguishes the sieve plate, underside mouth and feather-star upper mouth in cited guidance',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,q=x.marineProfiles((k,f)=>f);
  expect(q.chocolate_chip_sea_star.observe).toMatch(/Above.*grooved plate.*madreporite.*separate from the mouth.*Below.*central mouth/);expect(q.chocolate_chip_sea_star.behavior).toMatch(/water vascular system.*foot probes.*does not animate full crawling/);expect(q.bennetts_feather_star.observe).toMatch(/Above.*mouth on the upper disc.*Below.*gripping cirri.*mouth on its underside/);expect(q.bennetts_feather_star.behavior).toMatch(/grooves toward the mouth on the upper disc.*not animated/);
  expect(x.marineEntrySources(q.chocolate_chip_sea_star).map(s=>s.id)).toContain('dx-seastar-water-vascular');expect(x.marineEntrySources(q.bennetts_feather_star).map(s=>s.id)).toContain('dx-morphology-bennetts_feather_star');
 });
});
