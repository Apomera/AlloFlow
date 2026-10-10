import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_RBC_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const ids=['center','rim','membrane','spectrin','hemoglobin'];
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.rbcChecks={sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,items:ITEMS,dimensionText:dimensionText,limit:inspectionLimit,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,hemoglobin:RBC_HB_STRUCTURE,section:RBC_SECTION_MESH};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.rbcChecks,plain=value=>JSON.parse(JSON.stringify(value));
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
  const resources=new Set(),context={T,RBC_HB_STRUCTURE:checks.hemoglobin,RBC_SECTION_MESH:checks.section,grainTexture:null,wrinkleTexture:null,clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),track:value=>(resources.add(value),value)};
  context.document={createElement:()=>({width:0,height:0,getContext(){return {createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData(){},fillRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){},ellipse(){},save(){},restore(){},translate(){},rotate(){},scale(){},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};}})};
  context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
  vm.runInNewContext(['material','mesh','ball','box','tube','rod','random','organic','rbcModel','specimenPaint'].map(extractFunction).join('\n'),context);
  const g=new T.Group();context.rbcModel(g);g.updateMatrixWorld(true);return {g,data:g.userData.specimen,resources,paint:context.specimenPaint};
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
      if(![position.getX(n),position.getY(n),position.getZ(n)].every(Number.isFinite))throw Error('Non-finite rbc position');
      if(normal&&(![normal.getX(n),normal.getY(n),normal.getZ(n)].every(Number.isFinite)||Math.abs(Math.hypot(normal.getX(n),normal.getY(n),normal.getZ(n))-1)>.001))throw Error('Invalid rbc lighting normal');
    }
    if(surface)expect(geometry.index).toBeDefined();
    if(geometry.index){expect(geometry.index.array.BYTES_PER_ELEMENT).toBe(2);expect(geometry.index.count%3).toBe(0);for(const index of geometry.index.array)if(index>=position.count)throw Error('Egg index exceeds vertex buffer');
      if(surface){const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),edge=new T.Vector3(),lighting=new T.Vector3();for(let i=0;i<geometry.index.count;i+=3){const ia=geometry.index.getX(i),ib=geometry.index.getX(i+1),ic=geometry.index.getX(i+2);a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);face.subVectors(b,a).cross(edge.subVectors(c,a));if(face.lengthSq()<1e-24)throw Error('Zero-area rbc triangle');lighting.fromBufferAttribute(normal,ia).add(new T.Vector3().fromBufferAttribute(normal,ib)).add(new T.Vector3().fromBufferAttribute(normal,ic));if(face.dot(lighting)<-1e-10)throw Error('Egg winding opposes its lighting normals');}}
    }
  }
  expect(meshes).toBeLessThan(30);expect(triangles).toBeLessThan(180000);
  return {meshes,triangles};
}
const visible=object=>{for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;};

describe('Scale Explorer rbc anatomy',()=>{
  it('provides five cited native landmarks with complete copy and cell diameter as its measured reference',()=>{
    const details=checks.details('rbc',(_,fallback)=>fallback);expect(details.map(detail=>detail.id)).toEqual(ids);
    const item=checks.items.find(item=>item.id==='rbc');expect(item.size).toBe(7.5e-6);expect(checks.limit('rbc')).toBe(12);expect(checks.dimensionText(item,(_,fallback)=>fallback)).toBe('cell diameter');
    for(const detail of details){for(const field of ['label','body']){expect(typeof detail[field],detail.id+' '+field).toBe('string');expect(detail[field].trim().length,detail.id+' '+field+' copy').toBeGreaterThan(0);}expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,9);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(12);}
    expect(source).toMatch(/id===['"]rbc['"][^{}]{0,60}\{?\s*rbcModel\(g\)/);
  });

  it('rejects unknown identifiers and returns detached landmark coordinates',()=>{
    const original=plain(checks.sites);
    for(const id of ids){const point=checks.point('rbc',id);expect(point).not.toBeNull();point.at[0]=99;point.view[0]=99;}
    for(const bad of [null,undefined,{},[],7,'unknown','center ','CENTER','__proto__'])expect(checks.point('rbc',bad)).toBeNull();
    for(const bad of [null,undefined,{},7,'unknown','EGG','rbc ','__proto__'])expect(checks.point(bad,'center')).toBeNull();
    const detail=checks.details('rbc',(_,fallback)=>fallback)[0];detail.at[1]=99;detail.view[1]=99;
    expect(plain(checks.sites)).toEqual(original);for(const id of ids){const point=checks.point('rbc',id);expect(point.at[0]).not.toBe(99);expect(point.at[1]).not.toBe(99);expect(Math.hypot(...point.view)).toBeCloseTo(1,9);}
  });

  it('builds finite lit surfaces within WebGL 1 budgets and keeps the 7.5 µm ruler independent of its pose',()=>{
    const {g,data,resources,paint}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(data.kind).toBe('rbc');expect(data.stats).toMatchObject({bodyExtent:1,bodyReferenceMeters:7.5e-6});
    const structure=checks.hemoglobin;expect(structure.pdb).toBe('2HHB');expect(structure.chains).toHaveLength(4);expect(structure.chains.map(chain=>chain.type).sort()).toEqual(['alpha','alpha','beta','beta']);expect(structure.chains.reduce((sum,chain)=>sum+chain.points.length,0)).toBe(574);expect(structure.hemes).toHaveLength(4);expect(structure.hemes.map(group=>group.atoms.filter(atom=>atom.element==='FE').length)).toEqual([1,1,1,1]);
    const meshes=[];g.traverse(object=>{if(object.isMesh)meshes.push(object);});expect(data.meshes.length).toBeGreaterThanOrEqual(5);expect(data.meshes.every(mesh=>mesh.isMesh&&meshes.includes(mesh))).toBe(true);
    for(const id of ids)expect(data.meshes.some(mesh=>mesh.userData.specimenDetailId===id&&mesh.userData.specimenKind==='rbc'),id).toBe(true);
    safeGeometry(g,resources);
    const center=[],rim=[];let visibleCount=0;
    g.traverse(object=>{if(!object.isMesh||!visible(object))return;const position=object.geometry.attributes.position;for(let i=0;i<position.count;i++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,i)),radius=Math.hypot(point.x,point.y);visibleCount++;if(radius<.0001)center.push(Math.abs(point.z));if(radius>.28&&radius<.44)rim.push(Math.abs(point.z));}});
    expect(visibleCount).toBeGreaterThan(1000);expect(center.length).toBeGreaterThan(0);expect(rim.length).toBeGreaterThan(0);
    // Evans–Fung reference: a 7.5 µm cell has a roughly .777 µm central thickness.
    expect(Math.max(...center)).toBeCloseTo(.05179025,5);expect(Math.max(...rim)).toBeGreaterThan(.135);expect(Math.max(...rim)).toBeLessThan(.165);expect(Math.max(...rim)).toBeGreaterThan(Math.max(...center)*2);
    expect(g.rotation.x).toBe(0);expect(g.rotation.y).toBe(0);expect(g.rotation.z).toBe(0);
    for(const part of ['',...ids,'']){paint(data,part);g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);expect(bounds.min.x).toBeCloseTo(-.5,5);expect(bounds.max.x).toBeCloseTo(.5,5);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});}

    const start=new T.Vector3(-.5,0,0),end=new T.Vector3(.5,0,0);g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(start).distanceTo(g.localToWorld(end))).toBeCloseTo(3,10);
  });

  it('aims each inspection at the first visible native anatomical surface',()=>{
    const {g,data,paint}=model();
    for(const detail of checks.details('rbc',(_,fallback)=>fallback)){
      paint(data,detail.id);g.updateMatrixWorld(true);const target=new T.Vector3().fromArray(detail.at),direction=new T.Vector3().fromArray(detail.view).normalize(),ray=new T.Raycaster(target.clone().addScaledVector(direction,4),direction.clone().negate());
      const hit=ray.intersectObjects(g.children,true).find(value=>value.object.isMesh&&visible(value.object));expect(hit,detail.id+' has a visible native surface').toBeDefined();expect(hit.object.userData.specimenDetailId,detail.id+' first surface is its anatomy').toBe(detail.id);
    }
  });

  it('opens the interior for internal features and closes it for the exterior, whole view and comparison without rebuilding',()=>{
    const {g,data,paint}=model(),pose=data.pose;expect(pose.full.isGroup).toBe(true);expect(pose.section.isGroup).toBe(true);
    const identity=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);
    const skin=[];pose.full.traverse(mesh=>{if(mesh.isMesh)skin.push(mesh.material);});expect(skin.length).toBeGreaterThan(0);const originalSkin=skin.map(material=>({opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,emissive:material.emissive.getHex()}));
    for(const id of ['', 'center','rim','membrane']){paint(data,id);for(const material of skin){expect(material.opacity).toBe(1);expect(material.transparent).toBe(false);expect(material.depthWrite).toBe(true);}expect(skin.map(material=>({opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,emissive:material.emissive.getHex()}))).toEqual(originalSkin);}
    for(const [part,open] of [['',false],['center',false],['rim',false],['membrane',false],['spectrin',true],['hemoglobin',true],['center',false],['',false],['',false]]){paint(data,part);expect(pose.cutaway).toBe(open);expect(pose.full.visible).toBe(!open);expect(pose.section.visible).toBe(open);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);}
    paint(data,'',true);expect(pose.cutaway).toBe(true);expect(pose.full.visible).toBe(false);expect(pose.section.visible).toBe(true);paint(data,'',false);expect(pose.cutaway).toBe(false);expect(pose.full.visible).toBe(true);expect(pose.section.visible).toBe(false);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);
  });

  it('retains exact notebook cameras, filters invalid landmarks and retains old center/rim observations and native drafts',()=>{
    const camera={zoom:7.125678901234,yaw:.731234567891,pitch:-.221234567891,cutaway:false};
    const raw=ids.map(detailId=>({itemId:'rbc',detailId,...camera,note:'An illustrated rbc structure.'})).concat([{itemId:'rbc',detailId:'invalid',...camera}]);
    const notes=plain(checks.notes(raw));expect(notes).toHaveLength(5);for(const [n,note] of notes.entries())expect(note).toMatchObject({...raw[n],size:7.5e-6});
    const parsed=checks.parse(checks.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(checks.notes([{itemId:'rbc',detailId:'membrane',zoom:999}]))[0].zoom).toBe(12);
    expect(plain(checks.drafts({'rbc:rim':'Rounded rim.','rbc:spectrin':'Submembrane network.','rbc:invalid':'Invalid.'}))).toEqual({'rbc:rim':'Rounded rim.','rbc:spectrin':'Submembrane network.'});
  });

  it('owns every retained GPU resource and releases each once after repeated feature selection',()=>{
    const {g,data,resources,paint}=model(),before=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);for(const id of ['',...ids,'',...ids,''])paint(data,id);safeGeometry(g,resources);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(before);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);
  });
  it('keeps legacy center and rim notebook targets closed even when their old global cutaway flag was true',()=>{
    const legacy=[{itemId:'rbc',detailId:'center',zoom:2.5,yaw:.713,pitch:-.18,cutaway:true,note:'The indented center.'},{itemId:'rbc',detailId:'rim',zoom:2.4,yaw:-.23,pitch:.27,cutaway:true,note:'The thicker edge.'}];
    const notes=plain(checks.notes(legacy));expect(notes).toHaveLength(2);for(const [i,note]of notes.entries()){const {yaw,...expected}=legacy[i];expect(note).toMatchObject({...expected,size:7.5e-6,cutaway:false,rbcWindow:false});expect(note.yaw).toBeCloseTo(yaw,12);}
    expect(plain(checks.drafts({'rbc:center':'Old center draft.','rbc:rim':'Old rim draft.','rbc:unknown':'Invalid.'}))).toEqual({'rbc:center':'Old center draft.','rbc:rim':'Old rim draft.'});
    const {g,data,paint}=model(),identity=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);for(const id of ['center','rim']){paint(data,id,true);expect(data.pose.cutaway).toBe(false);expect(data.pose.full.visible).toBe(true);expect(data.pose.section.visible).toBe(false);}expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);
  });
  it('migrates legacy whole notes to a closed disc and round-trips only an explicit whole-window flag',()=>{
    const camera={zoom:2.2,yaw:.62123456789,pitch:-.13123456789,note:'A cell window.'};
    const legacy=plain(checks.notes([{itemId:'rbc',detailId:'',cutaway:true,...camera}]));expect(legacy[0]).toMatchObject({itemId:'rbc',detailId:'',cutaway:false,rbcWindow:false,...camera});
    const opened=plain(checks.notes([{itemId:'rbc',detailId:'',cutaway:true,rbcWindow:true,...camera}]));expect(opened[0]).toMatchObject({cutaway:true,rbcWindow:true});
    const parsed=checks.parse(checks.backup({observations:opened}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(opened);
    for(const invalid of [undefined,false,1,'true',{},[]])expect(plain(checks.notes([{itemId:'rbc',detailId:'',cutaway:true,rbcWindow:invalid}]))[0]).toMatchObject({cutaway:false,rbcWindow:false});
    for(const id of ['center','rim'])expect(plain(checks.notes([{itemId:'rbc',detailId:id,cutaway:true,rbcWindow:true}]))[0]).toMatchObject({cutaway:false,rbcWindow:false});
    const {data,paint}=model();paint(data,'',legacy[0].cutaway);expect(data.pose.cutaway).toBe(false);paint(data,'',opened[0].cutaway);expect(data.pose.cutaway).toBe(true);paint(data,'',false);expect(data.pose.cutaway).toBe(false);
  });

});
