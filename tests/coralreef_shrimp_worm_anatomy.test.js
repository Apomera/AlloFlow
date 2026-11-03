import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe,it,expect } from 'vitest';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,part=(m,p)=>m.root.getObjectByName(m.root.userData.speciesId+'-'+p);
const color=hex=>new THREE.Color(hex).convertSRGBToLinear();
function matches(c,i,t){return Math.max(Math.abs(c.getX(i)-t.r),Math.abs(c.getY(i)-t.g),Math.abs(c.getZ(i)-t.b))<.00001;}
function groups(g,t){const c=g.attributes.color,list=[];let last=-2;for(let i=0;i<c.count;i++)if(matches(c,i,t)){if(i!==last+1)list.push([]);list.at(-1).push(i);last=i;}return list;}
const centroid=(p,ids)=>ids.reduce((v,i)=>v.add(new THREE.Vector3().fromBufferAttribute(p,i)),new THREE.Vector3()).divideScalar(ids.length);
const pose=(mesh,i)=>{const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);return {position,scale,normal:new THREE.Vector3(0,1,0).applyQuaternion(rotation)};};

describe('cleaner shrimp and Christmas tree worm anatomy',()=>{
 it.each(['low','high'])('shares one tube between each pair of %s-detail crowns and closes its operculum',quality=>{
  const model=S.create(THREE,'christmas_tree_worm',{seed:7,quality,reducedMotion:true});
  try{
   const headMesh=part(model,'coral-head'),head=headMesh.geometry,crowns=part(model,'worms'),p=head.attributes.position;
   const caps=groups(head,color(0xc9bfa5)),rims=groups(head,color(0xcfc2a2));
   expect(caps).toHaveLength(model.count);expect(rims).toHaveLength(model.count);expect(crowns.count).toBe(model.count*2);
   const before=p.array.slice(),opened=caps.map(ids=>centroid(p,ids));
   model.retract(true);
   for(let i=0;i<model.count;i++){
    const a=pose(crowns,i*2),b=pose(crowns,i*2+1),entrance=a.position.clone().add(b.position).multiplyScalar(.5),closed=centroid(p,caps[i]);
    expect(a.scale.x).toBeLessThan(.1);expect(a.scale.x).toBeCloseTo(b.scale.x,7);
    expect(closed.distanceTo(entrance),'closed lid sits at its own entrance').toBeLessThan(.006);
    headMesh.updateMatrixWorld(true);const ray=new THREE.Raycaster(entrance.clone().addScaledVector(a.normal,.1),a.normal.clone().negate()),hit=ray.intersectObject(headMesh)[0];
    expect(hit,'closed lid is visible from outside the tube').toBeTruthy();
    expect([hit.face.a,hit.face.b,hit.face.c].every(v=>matches(head.attributes.color,v,color(0xc9bfa5))),'a front-facing calcified plug covers the opening').toBe(true);
    expect(hit.face.normal.dot(a.normal),'the solid lid surface, rather than a thin spine, faces out of the tube').toBeGreaterThan(.9);
    expect(opened[i].distanceTo(closed),'lid moves from beside the crowns onto the opening').toBeGreaterThan(.008);
    for(const v of rims[i])expect([p.getX(v),p.getY(v),p.getZ(v)]).toEqual(Array.from(before.slice(v*3,v*3+3)));
   }
   model.retract(false);for(let i=0;i<p.array.length;i++)expect(Math.abs(p.array[i]-before[i])).toBeLessThan(.000001);
  }finally{model.dispose();}
 });

 it.each(['low','high'])('seats %s-detail tube entrances on the actual irregular host and synchronizes both crowns',quality=>{
  for(const seed of [3,19]){
   const model=S.create(THREE,'christmas_tree_worm',{seed,quality});
   try{
    const head=part(model,'coral-head').geometry,rims=groups(head,color(0xcfc2a2)),crowns=part(model,'worms');
    const host=head.clone(),limit=rims[0][0],index=Array.from(head.index.array).filter((v,i,a)=>a[Math.floor(i/3)*3]<limit&&a[Math.floor(i/3)*3+1]<limit&&a[Math.floor(i/3)*3+2]<limit);
    host.setIndex(index);const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(host,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld(true);
    try{for(let i=0;i<model.count;i++){
     const a=pose(crowns,i*2),b=pose(crowns,i*2+1),center=a.position.add(b.position).multiplyScalar(.5);
     ray.set(new THREE.Vector3(center.x,1,center.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];expect(hit,'tube above coral surface').toBeTruthy();expect(center.y-hit.point.y).toBeGreaterThanOrEqual(0);expect(center.y-hit.point.y).toBeLessThan(.003);
    }}finally{host.dispose();material.dispose();}
    for(const t of [.1,1.7,8.2,22.4]){model.update(.016,t);for(let i=0;i<model.count;i++)expect(pose(crowns,i*2).scale.x).toBeCloseTo(pose(crowns,i*2+1).scale.x,6);}
   }finally{model.dispose();}
  }
 });

 it.each(['low','high'])('retains %s-detail draw and triangle budgets while adding a small rostrum and shell relief',quality=>{
  for(const id of ['cleaner_shrimp','christmas_tree_worm']){
   const m=S.create(THREE,id,{quality,seed:7,reducedMotion:true});
   try{
    let draws=0,triangles=0;m.root.traverse(o=>{if(o.isMesh){draws++;triangles+=o.geometry.index.count/3*(o.isInstancedMesh?o.count:1);}});
    expect(draws).toBe(2);expect(triangles).toBeLessThanOrEqual(quality==='low'?1500:6000);
    if(id==='cleaner_shrimp'){
     const body=part(m,'body'),shell=body.material.bumpMap.image.data;expect(new Set(Array.from(shell).filter((_,i)=>i%4===0)).size).toBeGreaterThan(8);
     const bodyBox=new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position),p=part(m,'legs').geometry.attributes.position;let projection=0;
     for(let i=0;i<p.count;i++)if(p.getX(i)>bodyBox.max.x&&p.getY(i)>bodyBox.getCenter(new THREE.Vector3()).y)projection++;
     expect(projection,'small head projection between the eyes').toBeGreaterThan(3);
    }
   }finally{m.dispose();}
  }
 });

 it('links the revised four entries to evidence and explains the study and identification limits',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};
  new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);
  const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  for(const [id,citation]of [['cleaner_shrimp','dx-oca-cleaner-shrimp-anatomy'],['christmas_tree_worm','dx-worm-age-1996'],['sea_fan','dx-seahorse-fan-hosts'],['barrel_sponge','dx-barrel-lineages']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(citation);
  expect(t.christmas_tree_worm.fact).toMatch(/1996.*Okinawa/);expect(t.christmas_tree_worm.fact).toMatch(/not the lifespan of every/);
  expect(p.christmas_tree_worm.habitat).toMatch(/host coral surrounds it/);expect(p.sea_fan.observe).toMatch(/sclerites/);
  expect(t.barrel_sponge.fact).toMatch(/2013.*Lembeh/);expect(t.cleaner_shrimp.fact).toMatch(/reproductive phase is male/);
 });
});
