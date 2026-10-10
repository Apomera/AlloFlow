import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_EGG_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const ids=['shell','air-cell','yolk','chalazae','membranes'];
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.eggChecks={sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,items:ITEMS,dimensionText:dimensionText,limit:inspectionLimit,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.eggChecks,plain=value=>JSON.parse(JSON.stringify(value));
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
function model(){
  const resources=new Set(),context={T,grainTexture:null,wrinkleTexture:null,clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),track:value=>(resources.add(value),value)};
  context.document={createElement:()=>({width:0,height:0,getContext(){return {createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData(){},fillRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},save(){},restore(){},translate(){},rotate(){},scale(){},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};}})};
  context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
  vm.runInNewContext(['material','mesh','ball','box','tube','rod','random','organic','eggModel','specimenPaint'].map(extractFunction).join('\n'),context);
  const g=new T.Group();context.eggModel(g);g.updateMatrixWorld(true);return {g,data:g.userData.specimen,resources,paint:context.specimenPaint};
}
function safeGeometry(g,resources){
  const geometries=new Map(),materials=new Set();let meshes=0,triangles=0;
  g.traverse(object=>{
    if(object.geometry)geometries.set(object.geometry,(geometries.get(object.geometry)||false)||object.isMesh);
    if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));
    if(object.isMesh){meshes++;triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;}
  });
  for(const material of materials){expect(resources.has(material)).toBe(true);for(const value of Object.values(material))if(value&&value.isTexture)expect(resources.has(value)).toBe(true);}
  for(const [geometry,surface] of geometries){
    expect(resources.has(geometry)).toBe(true);const position=geometry.attributes.position,normal=geometry.attributes.normal;
    expect(position.count).toBeGreaterThan(0);expect(position.count).toBeLessThan(65536);if(surface)expect(normal).toBeDefined();
    for(let n=0;n<position.count;n++){
      if(![position.getX(n),position.getY(n),position.getZ(n)].every(Number.isFinite))throw Error('Non-finite egg position');
      if(normal&&(![normal.getX(n),normal.getY(n),normal.getZ(n)].every(Number.isFinite)||Math.abs(Math.hypot(normal.getX(n),normal.getY(n),normal.getZ(n))-1)>.001))throw Error('Invalid egg lighting normal');
    }
    if(surface)expect(geometry.index).toBeDefined();
    if(geometry.index){expect(geometry.index.array.BYTES_PER_ELEMENT).toBe(2);expect(geometry.index.count%3).toBe(0);for(const index of geometry.index.array)if(index>=position.count)throw Error('Egg index exceeds vertex buffer');
      if(surface){const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),edge=new T.Vector3(),lighting=new T.Vector3();for(let i=0;i<geometry.index.count;i+=3){const ia=geometry.index.getX(i),ib=geometry.index.getX(i+1),ic=geometry.index.getX(i+2);a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);face.subVectors(b,a).cross(edge.subVectors(c,a));if(face.lengthSq()<1e-24)throw Error('Zero-area egg triangle');lighting.fromBufferAttribute(normal,ia).add(new T.Vector3().fromBufferAttribute(normal,ib)).add(new T.Vector3().fromBufferAttribute(normal,ic));if(face.dot(lighting)<-1e-10)throw Error('Egg winding opposes its lighting normals');}}
    }
  }
  expect(meshes).toBeLessThan(30);expect(triangles).toBeLessThan(150000);
  return {meshes,triangles};
}
const visible=object=>{for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;};

describe('Scale Explorer egg anatomy',()=>{
  it('provides five cited native landmarks with complete copy and overall length as its measured reference',()=>{
    const details=checks.details('egg',(_,fallback)=>fallback);expect(details.map(detail=>detail.id)).toEqual(ids);
    const item=checks.items.find(item=>item.id==='egg');expect(item.size).toBe(.057);expect(checks.limit('egg')).toBe(8);expect(checks.dimensionText(item,(_,fallback)=>fallback)).toBe('overall length');
    for(const detail of details){for(const field of ['label','body']){expect(typeof detail[field],detail.id+' '+field).toBe('string');expect(detail[field].trim().length,detail.id+' '+field+' copy').toBeGreaterThan(0);}expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,9);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(8);}
    expect(source).toMatch(/id===['"]egg['"][^{}]{0,60}\{?\s*eggModel\(g\)/);
  });

  it('rejects unknown identifiers and returns detached landmark coordinates',()=>{
    const original=plain(checks.sites);
    for(const id of ids){const point=checks.point('egg',id);expect(point).not.toBeNull();point.at[0]=99;point.view[0]=99;}
    for(const bad of [null,undefined,{},[],7,'unknown','shell ','SHELL','__proto__'])expect(checks.point('egg',bad)).toBeNull();
    for(const bad of [null,undefined,{},7,'unknown','EGG','egg ','__proto__'])expect(checks.point(bad,'shell')).toBeNull();
    const detail=checks.details('egg',(_,fallback)=>fallback)[0];detail.at[1]=99;detail.view[1]=99;
    expect(plain(checks.sites)).toEqual(original);for(const id of ids){const point=checks.point('egg',id);expect(point.at[0]).not.toBe(99);expect(point.at[1]).not.toBe(99);expect(Math.hypot(...point.view)).toBeCloseTo(1,9);}
  });

  it('builds finite lit surfaces within WebGL 1 budgets and keeps the 57 mm ruler independent of its pose',()=>{
    const {g,data,resources,paint}=model();expect(g.userData).toMatchObject({dimension:'y',extent:1,measureCenter:0});expect(data.kind).toBe('egg');expect(data.stats).toMatchObject({bodyExtent:1,bodyReferenceMeters:.057,reference:'overall-length',shellThickness:.006,shellMembranes:2,chalazae:2,airCell:true,unincubated:true,illustrative:true});
    const meshes=[];g.traverse(object=>{if(object.isMesh)meshes.push(object);});expect(data.meshes.length).toBeGreaterThanOrEqual(5);expect(data.meshes.every(mesh=>mesh.isMesh&&meshes.includes(mesh))).toBe(true);
    for(const id of ids)expect(data.meshes.some(mesh=>mesh.userData.specimenDetailId===id&&mesh.userData.specimenKind==='egg'),id).toBe(true);
    safeGeometry(g,resources);const widths={broad:0,narrow:0};g.traverse(object=>{if(!object.isMesh||object.userData.specimenDetailId!=='shell'||!visible(object))return;const position=object.geometry.attributes.position;for(let i=0;i<position.count;i++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,i));if(Math.abs(point.y-.2)<.025)widths.broad=Math.max(widths.broad,Math.abs(point.x));if(Math.abs(point.y+.2)<.025)widths.narrow=Math.max(widths.narrow,Math.abs(point.x));}});expect(widths.narrow).toBeGreaterThan(.1);expect(widths.broad).toBeGreaterThan(widths.narrow*1.02);
    for(const part of ['',...ids,'']){paint(data,part);g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);expect(bounds.min.y).toBeLessThanOrEqual(-.49);expect(bounds.max.y).toBeGreaterThanOrEqual(.49);expect(g.userData).toMatchObject({dimension:'y',extent:1,measureCenter:0});}
    const start=new T.Vector3(0,-.5,0),end=new T.Vector3(0,.5,0);g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(start).distanceTo(g.localToWorld(end))).toBeCloseTo(3,10);
  });

  it('aims each inspection at the first visible native anatomical surface',()=>{
    const {g,data,paint}=model();
    for(const detail of checks.details('egg',(_,fallback)=>fallback)){
      paint(data,detail.id);g.updateMatrixWorld(true);const target=new T.Vector3().fromArray(detail.at),direction=new T.Vector3().fromArray(detail.view).normalize(),ray=new T.Raycaster(target.clone().addScaledVector(direction,4),direction.clone().negate());
      const hit=ray.intersectObjects(g.children,true).find(value=>value.object.isMesh&&visible(value.object));expect(hit,detail.id+' has a visible native surface').toBeDefined();expect(hit.object.userData.specimenDetailId,detail.id+' first surface is its anatomy').toBe(detail.id);
    }
  });

  it('opens the interior for internal features and closes it for shell, whole view and comparison without rebuilding',()=>{
    const {g,data,paint}=model(),pose=data.pose;expect(pose.full.isGroup).toBe(true);expect(pose.section.isGroup).toBe(true);
    const identity=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);
    for(const [part,open] of [['',false],['shell',false],['air-cell',true],['yolk',true],['chalazae',true],['membranes',true],['shell',false],['',false],['',false]]){paint(data,part);expect(pose.cutaway).toBe(open);expect(pose.full.visible).toBe(!open);expect(pose.section.visible).toBe(open);expect(g.userData).toMatchObject({dimension:'y',extent:1,measureCenter:0});expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);}
    paint(data,'',true);expect(pose.cutaway).toBe(true);expect(pose.full.visible).toBe(false);expect(pose.section.visible).toBe(true);paint(data,'',false);expect(pose.cutaway).toBe(false);expect(pose.full.visible).toBe(true);expect(pose.section.visible).toBe(false);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);
  });

  it('retains exact notebook cameras, filters invalid landmarks and registers hyphenated air-cell drafts',()=>{
    const camera={zoom:7.125678901234,yaw:.731234567891,pitch:-.221234567891,cutaway:false};
    const raw=ids.map(detailId=>({itemId:'egg',detailId,...camera,note:'An illustrated egg structure.'})).concat([{itemId:'egg',detailId:'invalid',...camera}]);
    const notes=plain(checks.notes(raw));expect(notes).toHaveLength(5);for(const [n,note] of notes.entries())expect(note).toMatchObject({...raw[n],size:.057});
    const parsed=checks.parse(checks.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(checks.notes([{itemId:'egg',detailId:'yolk',zoom:999}]))[0].zoom).toBe(8);
    expect(plain(checks.drafts({'egg:air-cell':'Separated membranes.','egg:chalazae':'Two twisted cords.','egg:invalid':'Invalid.'}))).toEqual({'egg:air-cell':'Separated membranes.','egg:chalazae':'Two twisted cords.'});
  });

  it('owns every retained GPU resource and releases each once after repeated feature selection',()=>{
    const {g,data,resources,paint}=model(),before=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);for(const id of ['',...ids,'',...ids,''])paint(data,id);safeGeometry(g,resources);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(before);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);
  });
});
