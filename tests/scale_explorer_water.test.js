import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source=fs.readFileSync(process.env.SCALE_WATER_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const ids=['oxygen','hydrogens','bond','angle','polarity'],referenceMeters=2.75e-10,referenceAngstroms=2.75;
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const registration="  window.StemLab.registerTool('scaleExplorer', {";
if(source.split(registration).length!==2)throw Error('Scale Explorer registration is ambiguous');
vm.runInNewContext(source.replace(registration,"  window.waterChecks={sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,items:ITEMS,dimensionText:dimensionText,limit:inspectionLimit,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup};\n"+registration),sandbox);
const checks=sandbox.window.waterChecks,plain=value=>JSON.parse(JSON.stringify(value));
function extractFunction(name){
 const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing '+name);const open=source.indexOf('{',start);let depth=0,quote='',comment='';
 for(let i=open;i<source.length;i++){const c=source[i],next=source[i+1];if(comment==='line'){if(c==='\n')comment='';continue;}if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='/'&&next==='/'){comment='line';i++;continue;}if(c==='/'&&next==='*'){comment='block';i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);}
 throw Error('Unterminated '+name);
}
function model(){
 const resources=new Set(),context={T,grainTexture:null,clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),track:value=>(resources.add(value),value)};
 context.sphere=context.track(new T.SphereGeometry(.5,24,16));context.unitBox=context.track(new T.BoxGeometry(1,1,1));
 vm.runInNewContext(['material','mesh','ball','box','tube','rod','random','waterModel','specimenPaint'].map(extractFunction).join('\n'),context);
 const g=new T.Group();context.waterModel(g);g.updateMatrixWorld(true);return {g,data:g.userData.specimen,resources,paint:(data,id,view='structure')=>context.specimenPaint(data,id,false,view)};
}
const visible=object=>{for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;};
function geometryScan(g,resources){
 const geometries=new Map(),materials=new Set();let meshes=0,triangles=0;
 g.traverse(object=>{if(object.geometry)geometries.set(object.geometry,(geometries.get(object.geometry)||false)||object.isMesh);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(value=>materials.add(value));if(object.isMesh){meshes++;triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3;}});
 for(const material of materials){expect(resources.has(material)).toBe(true);for(const value of Object.values(material))if(value&&value.isTexture)expect(resources.has(value)).toBe(true);}
 for(const [geometry,surface]of geometries){
  expect(resources.has(geometry)).toBe(true);const p=geometry.attributes.position,n=geometry.attributes.normal;expect(p.count).toBeGreaterThan(0);expect(p.count).toBeLessThan(65536);if(surface)expect(n).toBeDefined();
  for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw Error('Non-finite water position');if(n&&(![n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)||Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001))throw Error('Invalid water normal');}
  if(surface)expect(geometry.index).toBeDefined();if(!geometry.index)continue;expect(geometry.index.array.BYTES_PER_ELEMENT).toBe(2);expect(geometry.index.count%3).toBe(0);for(const index of geometry.index.array)if(index>=p.count)throw Error('Water index exceeds its vertex buffer');
  if(!surface)continue;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),edge=new T.Vector3(),normal=new T.Vector3(),part=new T.Vector3();
  for(let i=0;i<geometry.index.count;i+=3){const ia=geometry.index.getX(i),ib=geometry.index.getX(i+1),ic=geometry.index.getX(i+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);face.subVectors(b,a).cross(edge.subVectors(c,a));if(face.lengthSq()<1e-24)throw Error('Zero-area water triangle');normal.fromBufferAttribute(n,ia).add(part.fromBufferAttribute(n,ib)).add(part.fromBufferAttribute(n,ic));if(face.dot(normal)<-1e-10)throw Error('Water winding opposes its lighting normals');}
 }
 expect(meshes).toBeLessThanOrEqual(30);expect(triangles).toBeLessThan(100000);return {meshes,triangles};
}

describe('Scale Explorer water molecular geometry',()=>{
 it('provides five cited native molecular landmarks and a distinct catalogue reference',()=>{
  const details=checks.details('water',(_,fallback)=>fallback);expect(details.map(value=>value.id)).toEqual(ids);const item=checks.items.find(value=>value.id==='water');expect(item.size).toBe(referenceMeters);expect(checks.limit('water')).toBe(6);expect(checks.dimensionText(item,(_,fallback)=>fallback)).toBe('reference size');
  for(const detail of details){expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.label.trim().length).toBeGreaterThan(0);expect(detail.body.trim().length).toBeGreaterThan(0);expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,9);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(6);expect(detail.cutaway).toBe(false);}
  expect(source).toMatch(/id===['"]water['"][^{}]{0,60}\{?\s*waterModel\(g\)/);
 });
 it('rejects unknown native identifiers and protects shared landmark coordinates',()=>{
  const original=plain(checks.sites.water);for(const id of ids){const value=checks.point('water',id);expect(value).not.toBeNull();value.at[0]=99;value.view[0]=99;}
  for(const invalid of [null,undefined,{},[],7,'unknown','oxygen ','OXYGEN','__proto__'])expect(checks.point('water',invalid)).toBeNull();for(const invalid of [null,undefined,{},7,'WATER','water ','__proto__'])expect(checks.point(invalid,'oxygen')).toBeNull();expect(plain(checks.sites.water)).toEqual(original);
 });
 it('uses measured atom centers and a 104.4776 degree bend without normalizing to illustrative spheres',()=>{
  const {g,data,resources}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(data.kind).toBe('water');expect(data.stats).toMatchObject({bodyReferenceMeters:referenceMeters,atomRadiiIllustrative:true,bondWidthsIllustrative:true,electronCloud:false});
  const o=g.getObjectByName('water-oxygen'),h1=g.getObjectByName('water-hydrogen-positive-x'),h2=g.getObjectByName('water-hydrogen-negative-x');expect(o?.isMesh).toBe(true);expect(h1?.isMesh).toBe(true);expect(h2?.isMesh).toBe(true);
  const centers=[o,h1,h2].map(mesh=>mesh.getWorldPosition(new T.Vector3())),v1=centers[1].clone().sub(centers[0]),v2=centers[2].clone().sub(centers[0]);expect(v1.length()*referenceAngstroms).toBeCloseTo(.9578,10);expect(v2.length()*referenceAngstroms).toBeCloseTo(.9578,10);expect(v1.angleTo(v2)*180/Math.PI).toBeCloseTo(104.4776,8);expect(centers.every(value=>value.z===0)).toBe(true);expect(centers[1].x).toBeCloseTo(-centers[2].x,12);expect(centers[1].y).toBeCloseTo(centers[2].y,12);
  const tagged=[];g.traverse(object=>{if(object.isMesh)tagged.push(object);});for(const id of ids)expect(tagged.some(mesh=>mesh.userData.specimenKind==='water'&&mesh.userData.specimenDetailId===id),id).toBe(true);expect(data.meshes.every(mesh=>tagged.includes(mesh))).toBe(true);geometryScan(g,resources);
  const start=new T.Vector3(-.5,0,0),end=new T.Vector3(.5,0,0);g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(start).distanceTo(g.localToWorld(end))).toBeCloseTo(3,10);
 });
 it('aims each stop at its first visible native atom, bond or explanatory guide',()=>{
  const {g,data,paint}=model();for(const detail of checks.details('water',(_,fallback)=>fallback)){paint(data,detail.id,'structure');g.updateMatrixWorld(true);const at=new T.Vector3().fromArray(detail.at),view=new T.Vector3().fromArray(detail.view),ray=new T.Raycaster(at.clone().addScaledVector(view,4),view.clone().negate()),hit=ray.intersectObjects(g.children,true).find(value=>value.object.isMesh&&visible(value.object));expect(hit,detail.id+' first visible surface').toBeDefined();expect(hit.object.userData.specimenDetailId).toBe(detail.id);expect(hit.object.userData.specimenKind).toBe('water');}
 });
 it('prebuilds reversible whole and selected guides without allocating or changing atom geometry',()=>{
  const {g,data,resources,paint}=model(),pose=data.pose,identity=data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]),count=resources.size,positions=['water-oxygen','water-hydrogen-positive-x','water-hydrogen-negative-x'].map(name=>g.getObjectByName(name).position.toArray());
  for(let n=0;n<200;n++)for(const [id,view]of [['','structure'],['','guides'],['oxygen','guides'],['hydrogens','structure'],['bond','structure'],['angle','structure'],['polarity','structure']]){paint(data,id,view);expect(pose.angleGuide.visible).toBe((!id&&view==='guides')||id==='angle');expect(pose.polarityGuide.visible).toBe((!id&&view==='guides')||id==='polarity');expect(pose.atoms.visible).toBe(true);expect(pose.bonds.visible).toBe(true);}
  expect(resources.size).toBe(count);expect(data.meshes.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid])).toEqual(identity);expect(['water-oxygen','water-hydrogen-positive-x','water-hydrogen-negative-x'].map(name=>g.getObjectByName(name).position.toArray())).toEqual(positions);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});
 });
 it('owns and releases every retained GPU resource once after repeated guide selection',()=>{
  const {g,data,resources,paint}=model();for(const id of ['',...ids,''])paint(data,id,'guides');geometryScan(g,resources);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);
 });
 it('retains exact molecular notebook cameras, guides and native drafts through backup',()=>{
  const camera={zoom:4.125678901234,yaw:.731234567891,pitch:-.221234567891,cutaway:false};const raw=ids.map(detailId=>({itemId:'water',detailId,...camera,waterView:'guides',note:'Measured molecular geometry.'})).concat([{itemId:'water',detailId:'invalid',...camera}]);const notes=plain(checks.notes(raw));expect(notes).toHaveLength(5);for(const [n,note]of notes.entries())expect(note).toMatchObject({...raw[n],size:referenceMeters});const parsed=checks.parse(checks.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);expect(plain(checks.notes([{itemId:'water',detailId:'bond',zoom:999}]))[0].zoom).toBe(6);expect(plain(checks.drafts({'water:bond':'Atom-center distance.','water:polarity':'Crossed chemical arrow.','water:invalid':'Invalid.'}))).toEqual({'water:bond':'Atom-center distance.','water:polarity':'Crossed chemical arrow.'});
 });
 it('migrates legacy whole observations to structure and accepts only the strict guide-mode enum',()=>{
  for(const mode of [undefined,null,false,true,1,'true','GUIDES','guides ',{},[]])expect(plain(checks.notes([{itemId:'water',detailId:'',waterView:mode,cutaway:true}]))[0].waterView).toBe('structure');for(const mode of ['structure','guides']){const notes=plain(checks.notes([{itemId:'water',detailId:'',waterView:mode,zoom:2.2,yaw:-.23,pitch:.27,note:'Whole molecule.'}]));expect(notes[0].waterView).toBe(mode);expect(notes[0].yaw).toBeCloseTo(-.23,12);expect(plain(checks.parse(checks.backup({observations:notes})).notebook.observations)).toEqual(notes);const {data,paint}=model();paint(data,'',notes[0].waterView);expect(data.pose.angleGuide.visible).toBe(mode==='guides');expect(data.pose.polarityGuide.visible).toBe(mode==='guides');}
  expect(plain(checks.notes([{itemId:'rbc',detailId:'',rbcWindow:true,cutaway:true,waterView:'guides'}]))[0]).toMatchObject({itemId:'rbc',rbcWindow:true,cutaway:true});
 });
});
