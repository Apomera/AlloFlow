import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_SPECIMEN_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const cases=[
  {id:'flea',fn:'fleaModel',meters:.002,ids:['head','combs','abdomen','hindlegs','tarsi']},
  {id:'dust-mite',fn:'dustMiteModel',meters:.0003,ids:['body','mouthparts','legs','tarsi','setae']},
  {id:'mouse',fn:'mouseModel',meters:.08,ids:['head','ears','paws','tail','fur']}
];
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.specimenChecks={sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,items:ITEMS,limit:inspectionLimit,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.specimenChecks,plain=value=>JSON.parse(JSON.stringify(value));
function extractFunction(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing '+name);
  const open=source.indexOf('{',start);let depth=0,quote='',comment='';
  for(let i=open;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(comment==='line'){if(c==='\n')comment='';continue;}
    if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}
    if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){comment='line';i++;continue;}
    if(c==='/'&&next==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);
  }
  throw Error('Unterminated '+name);
}
function model(c){
  const resources=new Set(),context={T,grainTexture:null,clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),track:value=>(resources.add(value),value)};
  context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
  vm.runInNewContext(['material','mesh','ball','box','tube','rod','random','organic',c.fn].map(extractFunction).join('\n'),context);
  const g=new T.Group();context[c.fn](g);g.updateMatrixWorld(true);return {g,data:g.userData.specimen,resources};
}
function safeGeometry(g,resources){
  const geometries=new Map(),materials=new Set();let meshes=0,triangles=0;
  g.traverse(object=>{
    if(object.geometry)geometries.set(object.geometry,(geometries.get(object.geometry)||false)||object.isMesh);
    if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));
    if(object.isMesh){meshes++;triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;}
  });
  for(const material of materials)expect(resources.has(material)).toBe(true);
  for(const [geometry,surface] of geometries){
    expect(resources.has(geometry)).toBe(true);const position=geometry.attributes.position,normal=geometry.attributes.normal;
    expect(position.count).toBeGreaterThan(0);expect(position.count).toBeLessThan(65536);if(surface)expect(normal).toBeDefined();
    for(let n=0;n<position.count;n++){
      if(![position.getX(n),position.getY(n),position.getZ(n)].every(Number.isFinite))throw Error('Non-finite specimen position');
      if(normal&&(![normal.getX(n),normal.getY(n),normal.getZ(n)].every(Number.isFinite)||Math.abs(Math.hypot(normal.getX(n),normal.getY(n),normal.getZ(n))-1)>.001))throw Error('Invalid specimen lighting normal');
    }
    if(surface)expect(geometry.index).toBeDefined();
    if(geometry.index){expect(geometry.index.array.BYTES_PER_ELEMENT).toBe(2);expect(geometry.index.count%3).toBe(0);for(const index of geometry.index.array)if(index>=position.count)throw Error('Specimen index exceeds vertex buffer');}
  }
  expect(meshes).toBeLessThan(30);expect(triangles).toBeLessThan(150000);
  return {meshes,triangles};
}

describe('Scale Explorer flea, dust mite and mouse exterior studies',()=>{
  it('provides five cited native landmarks per species and preserves each body reference',()=>{
    for(const c of cases){
      const details=checks.details(c.id,(_,fallback)=>fallback);expect(details.map(detail=>detail.id)).toEqual(c.ids);
      expect(checks.items.find(item=>item.id===c.id).size).toBe(c.meters);expect(checks.limit(c.id)).toBe(8);
      for(const detail of details){expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,9);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(8);}
      expect(source).toMatch(new RegExp("id===['\"]"+c.id+"['\"][^{}]{0,60}\\{?\\s*"+c.fn+"\\(g\\)"));
    }
    expect(source).toContain('specimenDetailId');
  });

  it('rejects unknown identifiers and returns detached native landmark coordinates',()=>{
    const original=plain(checks.sites);
    for(const c of cases){
      for(const id of c.ids){const point=checks.point(c.id,id);expect(point).not.toBeNull();expect(point.at.every(Number.isFinite)).toBe(true);point.at[0]=99;point.view[0]=99;}
      for(const bad of [null,undefined,{},[],7,'unknown','head ','HEAD'])expect(checks.point(c.id,bad)).toBeNull();
      const detail=checks.details(c.id,(_,fallback)=>fallback)[0];detail.at[1]=99;detail.view[1]=99;
    }
    for(const bad of [null,undefined,{},7,'unknown','FLEA','flea '])expect(checks.point(bad,'head')).toBeNull();
    expect(plain(checks.sites)).toEqual(original);
    for(const c of cases){const first=checks.point(c.id,c.ids[0]);expect(first.at[0]).not.toBe(99);expect(first.at[1]).not.toBe(99);expect(Math.hypot(...first.view)).toBeCloseTo(1,9);}
  });

  for(const c of cases)it('builds a safe '+c.id+' with real pickable anatomy and a fixed body frame',()=>{
    const {g,data,resources}=model(c);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(data.kind).toBe(c.id);expect(data.stats).toMatchObject({bodyExtent:1,bodyReferenceMeters:c.meters});
    const meshes=[];g.traverse(object=>{if(object.isMesh)meshes.push(object);});expect(data.meshes.length).toBeGreaterThanOrEqual(5);expect(data.meshes.every(mesh=>mesh.isMesh&&meshes.includes(mesh))).toBe(true);
    for(const id of c.ids)expect(data.meshes.some(mesh=>mesh.userData.specimenDetailId===id),id).toBe(true);
    safeGeometry(g,resources);const bounds=new T.Box3().setFromObject(g);expect(bounds.min.x).toBeLessThanOrEqual(-.48);expect(bounds.max.x).toBeGreaterThanOrEqual(.49);
    if(c.id==='flea'){expect(data.stats).toMatchObject({legs:6,legPairs:3});expect(bounds.max.y-bounds.min.y).toBeGreaterThan(.4);expect(bounds.max.z-bounds.min.z).toBeLessThan(bounds.max.x-bounds.min.x);}
    if(c.id==='dust-mite'){expect(data.stats).toMatchObject({legs:8,legPairs:4,eyes:0,antennae:0});expect(data.stats.setae).toBeGreaterThan(15);expect(data.stats.cuticleRings).toBeGreaterThan(20);}
    if(c.id==='mouse'){expect(data.stats).toMatchObject({tailIncluded:false,limbPairs:2,foreClawedDigits:4,hindDigits:5});expect(data.stats.tailLength).toBeGreaterThan(.8);expect(data.stats.tailLength).toBeLessThan(1.3);expect(bounds.max.x).toBeGreaterThan(1.2);}
    g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(new T.Vector3(-.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(.5,0,0)))).toBeCloseTo(3,10);
  });

  it('retains exact notebook camera precision, rejects invalid landmarks and clamps inspection magnification',()=>{
    const camera={zoom:7.125678901234,yaw:.731234567891,pitch:-.221234567891,cutaway:false};
    const raw=cases.map(c=>({itemId:c.id,detailId:c.ids[2],...camera,note:'A real exterior feature.'})).concat([{itemId:'mouse',detailId:'invalid',...camera}]);
    const notes=plain(checks.notes(raw));expect(notes).toHaveLength(3);for(const [n,note] of notes.entries())expect(note).toMatchObject({...raw[n],size:cases[n].meters});
    const parsed=checks.parse(checks.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(checks.notes([{itemId:'mouse',detailId:'tail',zoom:999}]))[0].zoom).toBe(8);
    expect(plain(checks.drafts({'flea:combs':'Backward teeth.','dust-mite:setae':'Long setae.','mouse:tail':'Body excludes tail.','mouse:invalid':'Invalid.'}))).toEqual({'flea:combs':'Backward teeth.','dust-mite:setae':'Long setae.','mouse:tail':'Body excludes tail.'});
  });

  it('tracks every retained surface and releases each GPU resource exactly once',()=>{
    for(const c of cases){const {g,data,resources}=model(c),before=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);safeGeometry(g,resources);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(before);}
  });
});
