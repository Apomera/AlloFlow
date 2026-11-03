import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe,it,expect } from 'vitest';
import { loadTool,resetStemLab,renderTool } from './helpers/stem_widgets_smoke_harness.js';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,part=(m,p)=>m.root.getObjectByName(m.root.userData.speciesId+'-'+p);
function topology(g){const tris=[],faces=Array.from({length:g.attributes.position.count},()=>[]);for(let i=0;i<g.index.count;i+=3){const t=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],at=tris.push(t)-1;for(const v of t)faces[v].push(at);}return {tris,faces};}
const point=(p,i)=>new THREE.Vector3().fromBufferAttribute(p,i);

describe('crown-of-thorns and octocoral anatomical details',()=>{
 it.each(['low','high'])('renders eight complete tentacles on every %s-detail polyp with supporting stalks',quality=>{
  const m=S.create(THREE,'soft_coral',{quality,seed:7,reducedMotion:true});
  try{
   const g=part(m,'polyps').geometry,p=g.attributes.position,{tris,faces}=topology(g),cores=faces.map((f,i)=>f.length===8?i:-1).filter(i=>i>=0);
   expect(cores.length,'many complete eight-rayed polyp fans').toBeGreaterThan(quality==='low'?40:80);
   for(const core of cores){
    const center=point(p,core),neighbors=[...new Set(faces[core].flatMap(f=>tris[f]))].filter(v=>v!==core);
    expect(neighbors,'eight inner tentacle bases around each mouth').toHaveLength(8);
    const a=point(p,neighbors[0]).sub(center),b=point(p,neighbors[1]).sub(center),normal=a.clone().cross(b).normalize(),radius=a.length();
    for(const base of neighbors){const direction=point(p,base).sub(center).normalize();
     const visible=faces[base].flatMap(f=>tris[f]).some(v=>{const d=point(p,v).sub(center);d.addScaledVector(normal,-d.dot(normal));return d.length()>radius*2&&d.normalize().dot(direction)>.97;});
     expect(visible,'every tentacle tip is actually indexed for drawing').toBe(true);
    }
    let supports=0;for(let v=0;v<p.count;v++)if(v!==core&&point(p,v).distanceTo(center)<.0016)supports++;
    expect(supports,'short stalk reaches the polyp head').toBeGreaterThanOrEqual(2);
   }
   if(quality==='high')expect(tris.filter(t=>t.every(v=>faces[v].length===1)).length,'small paired pinnule surfaces').toBeGreaterThan(1000);
  }finally{m.dispose();}
 });

 it.each(['low','high'])('shows a front-facing oral surface and paired ventral feet in the %s-detail starfish',quality=>{
  const m=S.create(THREE,'crown_of_thorns',{quality,seed:13,reducedMotion:true});
  try{
   const mesh=part(m,'body'),g=mesh.geometry,p=g.attributes.position,c=g.attributes.color,sole=new THREE.Color(0x9c846d).convertSRGBToLinear();mesh.updateMatrixWorld(true);
   const hit=new THREE.Raycaster(new THREE.Vector3(0,-.2,0),new THREE.Vector3(0,1,0)).intersectObject(mesh)[0];
   expect(hit,'oral disc visible from below').toBeTruthy();expect(hit.point.y).toBeLessThan(.015);expect(hit.face.normal.y).toBeLessThan(-.9);
   const mouth=new THREE.Color(0x33252a).convertSRGBToLinear();expect([hit.face.a,hit.face.b,hit.face.c].some(i=>Math.max(Math.abs(c.getX(i)-mouth.r),Math.abs(c.getY(i)-mouth.g),Math.abs(c.getZ(i)-mouth.b))<.00001),'oral surface covers the central arm junctions').toBe(true);
   const angles=[];for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getZ(i))>.078&&Math.max(Math.abs(c.getX(i)-sole.r),Math.abs(c.getY(i)-sole.g),Math.abs(c.getZ(i)-sole.b))<.00001)angles.push((Math.atan2(p.getZ(i),p.getX(i))+.3+Math.PI*2)%(Math.PI*2));
   angles.sort((a,b)=>a-b);const groups=[];for(const a of angles){if(!groups.length||a-groups.at(-1).at(-1)>.12)groups.push([]);groups.at(-1).push(a);}
   if(groups.length>1&&groups[0][0]+Math.PI*2-groups.at(-1).at(-1)<.12)groups[0].push(...groups.pop().map(a=>a-Math.PI*2));
   expect(groups,'feet distributed beneath all eighteen arms of this specimen').toHaveLength(18);
   expect(groups.every(a=>Math.max(...a)-Math.min(...a)>.025),'feet occur in paired rows rather than a single central line').toBe(true);
  }finally{m.dispose();}
 });

 it.each(['low','high'])('keeps %s-detail animals inside the existing draw and triangle budgets',quality=>{
  for(const id of ['crown_of_thorns','soft_coral'])for(const seed of [1,13,35]){
   const m=S.create(THREE,id,{quality,seed,reducedMotion:true});try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(id==='soft_coral'?2:1);expect(tris,id+' seed '+seed).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}
  }
 });

 it('keeps the four reviewed accounts tied to their scientific scope and citations',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);
  const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.soft_coral.marks.join(' ')).toMatch(/eight feathery tentacles/);expect(t.soft_coral.marks.join(' ')).toMatch(/sclerites/);expect(t.soft_coral.fact).toMatch(/genus containing many species/);
  expect(p.crown_of_thorns.diet).toMatch(/Early juveniles.*coralline algae/);expect(t.crown_of_thorns.role).toMatch(/native Indo-Pacific/);
  expect(t.nudibranch.fact).toMatch(/2016 study/);expect(t.magnificent_anemone.fact).toMatch(/one animal polyp/);
  for(const [id,citation]of [['crown_of_thorns','dx-cots-life-stages'],['soft_coral','dx-dendronephthya-anatomy'],['nudibranch','dx-chromodoris-chemical-defence'],['magnificent_anemone','dx-worms-magnificent-anemone']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(citation);
 });

 it('makes the tiny polyp anatomy readable in a labelled eight-tentacle schematic',()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','coralReef');
  for(const theme of ['light','dark','contrast']){
   const host=document.createElement('div');host.innerHTML=renderTool('coralReef',{coralReef:{section:'guide',guideSpeciesId:'soft_coral'}},{theme});
   const figure=host.querySelector('[data-octocoral-diagram]');expect(figure).toBeTruthy();expect(figure.querySelectorAll('[data-polyp-tentacle]')).toHaveLength(8);
   expect(figure.querySelectorAll('[data-polyp-pinnule]')).toHaveLength(64);expect(figure.querySelector('svg').getAttribute('aria-label')).toMatch(/eight numbered tentacles/);
   expect(figure.textContent).toMatch(/one polyp, not the entire colony/);expect(figure.textContent).toMatch(/not to scale/);
  }
 });
});
