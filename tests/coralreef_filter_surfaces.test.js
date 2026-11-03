import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8');
const marker='Kit.prototype.baked = function (key, w, h, fn, wrapS, wrapT, linear, repeat) {';
if(source.split(marker).length!==2)throw Error('Surface callback probe marker changed');
const probes=[],w={__surfaceProbe:(key,fn,wrapS,wrapT)=>probes.push({key,fn,wrapS,wrapT})};
new Function('window',source.replace(marker,marker+'window.__surfaceProbe(key,fn,wrapS,wrapT);'))(w);
const S=w.Reef3DSpecies,part=(m,name)=>m.root.getObjectByName(m.id+'-'+name);
function make(id,quality){const m=S.create(T,id,{quality,seed:7});m.id=id;return m;}
function seamPairs(g){const p=g.attributes.position,uv=g.attributes.uv,pairs=[];
 for(let a=0;a<p.count;a++)if(uv.getX(a)===0){let b=-1;for(let j=0;j<p.count;j++)if(uv.getX(j)===1&&Math.abs(uv.getY(j)-uv.getY(a))<1e-7&&Math.hypot(p.getX(a)-p.getX(j),p.getY(a)-p.getY(j),p.getZ(a)-p.getZ(j))<1e-8){b=j;break;}if(b>=0)pairs.push([a,b]);}
 return pairs;
}
function checkNormals(g){const pairs=seamPairs(g),n=g.attributes.normal;expect(pairs.length).toBeGreaterThan(5);for(const [a,b]of pairs)expect(Math.hypot(n.getX(a)-n.getX(b),n.getY(a)-n.getY(b),n.getZ(a)-n.getZ(b)),'closed ring has continuous lighting').toBeLessThan(1e-6);return pairs;}
describe('filter-feeder cylindrical surfaces',()=>{
 it.each(['low','high'])('joins static tunic and tube normals and tube pigment at %s detail',quality=>{
  for(const [id,name]of [['goldmouth_sea_squirt','tunic'],['feather_duster_worm','tube']]){const m=make(id,quality);try{const g=part(m,name).geometry,pairs=checkNormals(g),c=g.attributes.color;for(const [a,b]of pairs)expect(Math.hypot(c.getX(a)-c.getX(b),c.getY(a)-c.getY(b),c.getZ(a)-c.getZ(b)),'pigment joins at the same physical point').toBeLessThan(1e-6);}finally{m.dispose();}}
 });
 it.each(['low','high'])('keeps both siphon lighting joins smooth through motion at %s detail',quality=>{
  const m=make('goldmouth_sea_squirt',quality);try{const g=part(m,'siphons').geometry;for(const time of [0,1.3,4]){m.update(.016,time);expect(checkNormals(g).length).toBe(quality==='high'?22:14);}}finally{m.dispose();}
 });
 it.each(['low','high'])('keeps actual circular texture callbacks periodic without losing grain at %s detail',quality=>{
  probes.length=0;const models=['goldmouth_sea_squirt','feather_duster_worm'].map(id=>make(id,quality));try{
   const maps=probes.filter(p=>/tunicate-mottled-skin|tunicate-leathery-tunic|worm-tube-sand-v2|worm-tube-fibres/.test(p.key));expect(maps).toHaveLength(4);
   for(const {key,fn,wrapS,wrapT}of maps){expect(wrapS,key).toBe(true);expect(wrapT,key).toBe(false);const samples=[];
    for(const v of [.13,.37,.61,.89]){const a=[0,0,0,1],b=[0,0,0,1],left=[0,0,0,1],right=[0,0,0,1];fn(0,v,a);fn(1,v,b);fn(1e-7,v,right);fn(1-1e-7,v,left);for(let c=0;c<3;c++){expect(Math.abs(a[c]-b[c]),key+' endpoint').toBeLessThan(1e-6);expect(Math.abs(left[c]-right[c]),key+' across wrap').toBeLessThan(.0002);}for(const u of [.1,.25,.5,.75]){const p=[0,0,0,1];fn(u,v,p);samples.push(p[0]);}}
    expect(Math.max(...samples)-Math.min(...samples),key+' retains surface variation').toBeGreaterThan(.015);
   }
   for(const m of models){const mat=part(m,m.id==='goldmouth_sea_squirt'?'tunic':'tube').material;for(const map of [mat.map,mat.bumpMap]){expect(map.wrapS).toBe(T.RepeatWrapping);expect(map.wrapT).toBe(T.ClampToEdgeWrapping);expect(map.generateMipmaps).toBe(true);}}
  }finally{models.forEach(m=>m.dispose());}
 });
 it('explains tunicate water routes and fan-worm crown structures with institutional citations',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,p=x.marineProfiles((k,f)=>f);
  expect(p.goldmouth_sea_squirt.behavior).toMatch(/enters the oral siphon.*filtering pharynx.*leaves through the atrial siphon.*not a pair of mouths/);expect(p.goldmouth_sea_squirt.observe).toMatch(/Above.*Side.*darker throats/);
  expect(p.feather_duster_worm.behavior).toMatch(/exchange gases.*extended crown.*not the microscopic beating/);expect(p.feather_duster_worm.observe).toMatch(/pinnules.*spiralling crowns.*no such plug.*not a complete identification key/);
  expect(x.marineEntrySources(p.goldmouth_sea_squirt).map(s=>s.id)).toContain('dx-hawaii-tunicates');expect(x.marineEntrySources(p.feather_duster_worm).map(s=>s.id)).toContain('dx-museum-fanworms');
 });
});
