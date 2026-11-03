import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function part(m,name){let found;m.root.traverse(o=>{if(o.isMesh)for(const range of o.geometry.userData.batch||[])if(range.part===name&&!found)found={mesh:o,range};});return found;}
function shaderOf(material){const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>'};material.onBeforeCompile(shader,{});return shader;}
function components(g,range,select){const parent=new Map(),find=i=>{if(!parent.has(i))parent.set(i,i);while(parent.get(i)!==i)i=parent.get(i);return i;},union=(a,b)=>parent.set(find(a),find(b));for(let n=range.start;n<range.start+range.length;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j));if(ids.every(select)){union(ids[0],ids[1]);union(ids[1],ids[2]);}}const groups=new Map();for(const i of parent.keys()){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}return [...groups.values()];}
describe('cardinalfish iris and seated fin pigment',()=>{
 it.each([true,false])('limits the iris band to the pajama with derivatives=%s',derivatives=>{
  for(const id of ['pajama_cardinalfish','banggai_cardinalfish','clownfish','humphead_wrasse']){const m=S.create(T,id,{quality:'high',seed:7,derivatives});try{const {mesh}=part(m,'detail'),s=shaderOf(mesh.material),band=s.uniforms.reefIrisBar.value;expect(mesh.material.customProgramCacheKey()).toBe('reef3d-species-v8|'+(derivatives?'d':'n'));
   if(id==='pajama_cardinalfish'){expect(band.w).toBeGreaterThan(.3);expect(band.w).toBeLessThan(.85);expect(band.x).toBeGreaterThan(band.y*2);expect(s.uniforms.reefIrisColor.value.g).toBeGreaterThan(s.uniforms.reefIrisColor.value.r*.7);}else expect(band.w,'unaffected irises keep the option off').toBe(0);
  }finally{m.dispose();}}
 });
 it.each(['low','high'])('seats bilateral dots on moving Banggai fin surfaces in %s detail',quality=>{
  const m=S.create(T,'banggai_cardinalfish',{quality,seed:7});try{const body=m.root.getObjectByName('banggai_cardinalfish-body').geometry,unit=body.boundingBox.max.x/.503,white=new T.Color(0xf8f7ef).convertSRGBToLinear();
   // Select the authored white pigment, excluding silvery membrane rims.
   for(const [name,count]of [['fins',36],['tail',12]]){const {mesh,range}=part(m,name),g=mesh.geometry,p=g.attributes.position,c=g.attributes.color,select=i=>Math.max(Math.abs(c.getX(i)-white.r),Math.abs(c.getY(i)-white.g),Math.abs(c.getZ(i)-white.b))<.00001;
    const spots=components(g,range,select);expect(spots,name+' has individual pigment on both sides').toHaveLength(count);
    const surfaces=[];for(let n=range.start;n<range.start+range.length;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j));if(!ids.every(select))surfaces.push(new T.Triangle(...ids.map(i=>new T.Vector3().fromBufferAttribute(p,i))));}
    for(const ids of spots){const centre=ids.reduce((v,i)=>v.add(new T.Vector3().fromBufferAttribute(p,i)),new T.Vector3()).multiplyScalar(1/ids.length),closest=new T.Vector3();let distance=Infinity;for(const tri of surfaces)distance=Math.min(distance,tri.closestPointToPoint(centre,closest).distanceTo(centre));expect(distance/unit,'pigment follows the actual billowed membrane').toBeLessThan(.0005);for(const i of ids)expect(g.attributes.reefPart.getW(i),'same pivot as the supporting fin').toBe(range.slot);}
   }
   m.update(.1,1.3);m.update(.1,2.7);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the %s animal triangle budget',quality=>{
  for(const id of ['pajama_cardinalfish','banggai_cardinalfish']){const m=S.create(T,id,{quality,seed:7,reducedMotion:true});try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('keeps reproduction, iris and butterflyfish identification guidance specific',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(p.pajama_cardinalfish.observe).toMatch(/red bar through the iris/);expect(p.pajama_cardinalfish.observe).not.toMatch(/simplified red eye/);expect(t.banggai_cardinalfish.fact).toMatch(/fully formed juveniles.*no pelagic larval phase/);expect(p.banggai_cardinalfish.observe).toMatch(/patterns vary between individual fish/);expect(p.banggai_cardinalfish.behavior).toMatch(/brooding is not animated/);expect(p.yellow_longnose_butterflyfish.observe).toMatch(/rear anal fin.*Forcipiger longirostris/);expect(t.copperband_butterflyfish.fact).toMatch(/after the larval fish settles/);expect(x.marineEntrySources(p.banggai_cardinalfish).map(s=>s.id)).toContain('dx-fao-banggai-development');
 });
});
