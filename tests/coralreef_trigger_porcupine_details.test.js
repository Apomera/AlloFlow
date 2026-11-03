import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function components(g,range,selected=()=>true){const parent=new Map(),find=i=>{if(!parent.has(i))parent.set(i,i);while(parent.get(i)!==i)i=parent.get(i);return i;},union=(a,b)=>parent.set(find(a),find(b));for(let n=range.start;n<range.start+range.length;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j));if(ids.every(selected)){union(ids[0],ids[1]);union(ids[1],ids[2]);}}const groups=new Map();for(const i of parent.keys()){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}return [...groups.values()];}
const box=(g,ids)=>new T.Box3().setFromPoints(ids.map(i=>new T.Vector3().fromBufferAttribute(g.attributes.position,i)));
function parts(m,name){const r=[];m.root.traverse(o=>{if(o.isMesh)o.geometry.userData.batch?.forEach(p=>{if(p.part===name)r.push({mesh:o,range:p});});});return r;}
describe('trigger dorsal apparatus and porcupine dental/fin detail',()=>{
 it.each(['low','high'])('draws three dorsal spines with the locking pair distinguishable in %s detail',quality=>{
  const m=S.create(T,'clown_triggerfish',{quality,seed:7});try{const body=m.root.getObjectByName('clown_triggerfish-body').geometry;body.computeBoundingBox();const unit=body.boundingBox.max.x/.503,{mesh,range}=parts(m,'detail')[0],g=mesh.geometry;
   const spines=components(g,range).map(ids=>box(g,ids)).filter(b=>b.max.y>body.boundingBox.max.y+.005*unit&&b.min.x>.04*unit&&b.max.x<.21*unit).sort((a,b)=>b.getSize(new T.Vector3()).y-a.getSize(new T.Vector3()).y);
   expect(spines,'three separately drawn spines ahead of the soft dorsal').toHaveLength(3);const h=spines.map(b=>b.getSize(new T.Vector3()).y);expect(h[1],'second spine longer than half of the stout first').toBeGreaterThan(h[0]*.5);expect(h[1]).toBeLessThan(h[0]);expect(h[2]).toBeLessThan(h[1]*.6);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('keeps two dental plates and spots on every soft fin in %s detail',quality=>{
  const m=S.create(T,'porcupinefish',{quality,seed:7});try{const {mesh,range}=parts(m,'detail')[0],g=mesh.geometry,c=g.attributes.color,white=new T.Color(0xf2eee2).convertSRGBToLinear(),isWhite=i=>Math.max(Math.abs(c.getX(i)-white.r),Math.abs(c.getY(i)-white.g),Math.abs(c.getZ(i)-white.b))<.00001;
   const jaws=components(g,range,isWhite).map(ids=>box(g,ids)).sort((a,b)=>a.min.y-b.min.y);expect(jaws,'one uninterrupted dental unit in each jaw').toHaveLength(2);expect(jaws[1].min.y-jaws[0].max.y,'visible horizontal mouth gap').toBeGreaterThan(.0008);
   const dark=new T.Color(0x2a2117).convertSRGBToLinear();
   for(const name of ['tail','pectoral','fins'])for(const {mesh,range}of parts(m,name)){const geo=mesh.geometry,col=geo.attributes.color,isDark=i=>Math.max(Math.abs(col.getX(i)-dark.r),Math.abs(col.getY(i)-dark.g),Math.abs(col.getZ(i)-dark.b))<.00001,spots=components(geo,range,isDark);expect(spots.length,name+' has individual bilateral pigment discs').toBeGreaterThanOrEqual(quality==='low'?6:16);for(const ids of spots)for(const i of ids)expect(geo.attributes.reefPart.getW(i),'spots follow the same fin rig slot').toBe(range.slot);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the %s animal triangle budget',quality=>{
  for(const id of ['clown_triggerfish','porcupinefish']){const m=S.create(T,id,{quality,seed:7,reducedMotion:true});try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('keeps the reviewed entries clear about model posture, stages and hosts',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.clown_triggerfish.fact).toMatch(/three spines.*without simulating the internal locking/);expect(p.porcupinefish.behavior).toMatch(/uninflated animal.*Inflation is not simulated/);expect(t.porcupinefish.fact).toMatch(/one continuous.*plate in each jaw/);expect(t.emperor_angelfish.fact).toMatch(/striped model represents an adult/);expect(p.clownfish.behavior).toMatch(/Acclimation.*mucous/);
  for(const [id,source]of [['clown_triggerfish','dx-trigger-dorsal-family'],['porcupinefish','dx-diodontid-jaws'],['emperor_angelfish','dx-am-emperor-growth'],['clownfish','dx-flm-ocellaris-hosts']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(source);
 });
});
