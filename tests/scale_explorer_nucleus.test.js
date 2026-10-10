import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const source=fs.readFileSync(process.env.SCALE_NUCLEUS_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const ids=['protons','neutrons','core','boundary'],referenceMeters=1.4e-14;
const registration="  window.StemLab.registerTool('scaleExplorer', {",sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
if(source.split(registration).length!==2)throw Error('Scale Explorer registration is ambiguous');
vm.runInNewContext(source.replace(registration,"  window.nucleusChecks={layout:NUCLEUS_LAYOUT,rms:NUCLEUS_CHARGE_RMS_FM,view:nucleusViewValue,depth:nucleusDepthValue,counts:nucleusVisibleCounts,items:ITEMS,sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,dimensionText:dimensionText,limit:inspectionLimit,notes:readObservations,backup:notebookBackup,parse:readNotebookBackup};\n"+registration),sandbox);
const checks=sandbox.window.nucleusChecks,plain=value=>JSON.parse(JSON.stringify(value));
function extractFunction(name){
 const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing '+name);const open=source.indexOf('{',start);let depth=0,quote='',comment='';
 for(let i=open;i<source.length;i++){const c=source[i],next=source[i+1];if(comment==='line'){if(c==='\n')comment='';continue;}if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='/'&&next==='/'){comment='line';i++;continue;}if(c==='/'&&next==='*'){comment='block';i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);}
 throw Error('Unterminated '+name);
}
function model(){
 const resources=new Set(),context={T,NUCLEUS_LAYOUT:checks.layout,nucleusDepthValue:checks.depth,track:value=>(resources.add(value),value)};
 vm.runInNewContext(extractFunction('nucleusModel'),context);
 const g=new T.Group();context.nucleusModel(g);g.updateMatrixWorld(true);return{g,data:g.userData.nucleus,resources};
}
function retained(g){
 const nodes=[],geometry=new Set(),materials=new Set(),textures=new Set();g.traverse(node=>{nodes.push(node);if(node.geometry)geometry.add(node.geometry);for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)textures.add(uniform.value);}});return{nodes,geometry,materials,textures};
}
function scanGeometry(g,resources){
 const owned=retained(g);let drawables=0,triangles=0,nonfinite=0,invalidNormals=0,unsafe=0,degenerate=0,winding=0;
 for(const value of [...owned.geometry,...owned.materials,...owned.textures])if(!resources.has(value))throw Error('Untracked retained nucleus GPU resource');
 g.traverse(node=>{if(node.isMesh||node.isPoints||node.isLine)drawables++;if(node.isInstancedMesh&&!resources.has(node))throw Error('Untracked nucleus instance buffers');if(node.isMesh)triangles+=(node.geometry.index?node.geometry.index.count:node.geometry.attributes.position.count)/3*(node.isInstancedMesh?node.count:1);});
 for(const geometry of owned.geometry){const p=geometry.attributes.position,n=geometry.attributes.normal,ix=geometry.index;expect(p.count).toBeGreaterThan(0);expect(p.count).toBeLessThan(65536);for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))nonfinite++;if(n&&(![n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)||Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.002))invalidNormals++;}if(!ix)continue;if(ix.array.BYTES_PER_ELEMENT!==2)unsafe++;for(const index of ix.array)if(index>=p.count)unsafe++;
  if(!n||!owned.nodes.some(node=>node.isMesh&&node.geometry===geometry))continue;expect(ix.count%3).toBe(0);const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),edge=new T.Vector3(),normal=new T.Vector3(),part=new T.Vector3();for(let i=0;i<ix.count;i+=3){const ia=ix.getX(i),ib=ix.getX(i+1),ic=ix.getX(i+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);face.subVectors(b,a).cross(edge.subVectors(c,a));if(face.lengthSq()<1e-24)degenerate++;normal.fromBufferAttribute(n,ia).add(part.fromBufferAttribute(n,ib)).add(part.fromBufferAttribute(n,ic));if(face.dot(normal)<-1e-10)winding++;}
 }
 expect({nonfinite,invalidNormals,unsafe,degenerate,winding}).toEqual({nonfinite:0,invalidNormals:0,unsafe:0,degenerate:0,winding:0});expect(drawables).toBeLessThanOrEqual(30);expect(triangles).toBeLessThan(350000);expect(resources.size).toBeLessThanOrEqual(70);return owned;
}
function independentlyVisible(depth){
 const plane=-.5+depth/100,out={protons:0,neutrons:0,total:0};for(const entry of checks.layout)if(entry.at[2]-entry.radius<plane){out[entry.kind==='proton'?'protons':'neutrons']++;out.total++;}return out;
}
function firstHit(g,data,at,view){
 g.updateMatrixWorld(true);const target=g.localToWorld(new T.Vector3(...at)),direction=new T.Vector3(...view).normalize().transformDirection(g.matrixWorld),ray=new T.Raycaster(target.clone().addScaledVector(direction,5),direction.clone().negate(),0,10);
 return ray.intersectObjects([...Object.values(data.species),...Object.values(data.caps)],false).filter(hit=>{let node=hit.object;while(node){if(!node.visible)return false;node=node.parent;}return data.pickVisible(hit.point,hit.object,hit.instanceId);})[0];
}

describe('Scale Explorer gold-197 nucleus guide',()=>{
 it('represents all197 nucleons with79 protons and118 neutrons in a finite illustrative layout',()=>{
  expect(checks.layout).toHaveLength(197);const counts={protons:0,neutrons:0};let invalid=0;for(const entry of checks.layout){if(!['proton','neutron'].includes(entry.kind)||!Array.isArray(entry.at)||entry.at.length!==3||!entry.at.every(Number.isFinite)||!Number.isFinite(entry.radius)||entry.radius<=0||Math.hypot(...entry.at)+entry.radius>.500001)invalid++;counts[entry.kind==='proton'?'protons':'neutrons']++;}expect(invalid).toBe(0);expect(counts).toEqual({protons:79,neutrons:118});
  const copy=checks.details('nucleus',(_,fallback)=>fallback).map(detail=>detail.body).join(' ');expect(copy).toMatch(/illustrat|schematic|representative/i);expect(copy).not.toMatch(/exact (?:measured |experimental )?(?:nucleon )?positions/i);for(const depth of [0,1,25,50,75,99,100])expect(plain(checks.counts(depth))).toEqual(independentlyVisible(depth));
 });
 it('normalizes only the strict whole/section view and finite numeric section depth',()=>{
  expect(checks.view('section')).toBe('section');for(const value of [undefined,null,false,true,'whole','SECTION','section ',{},[]])expect(checks.view(value)).toBe('whole');for(const value of [undefined,null,false,true,'50',NaN,Infinity,-Infinity,{},[]])expect(checks.depth(value)).toBe(50);for(const [value,expected]of [[-1,0],[0,0],[24.4,24],[24.5,25],[50,50],[99.6,100],[1000,100]])expect(checks.depth(value)).toBe(expected);
  const item=checks.items.find(value=>value.id==='nucleus');expect(item.size).toBe(referenceMeters);expect(checks.rms).toBe(5.4371);expect(checks.dimensionText(item,(_,fallback)=>fallback)).toBe('reference diameter');expect(checks.limit('nucleus')).toBe(6);
 });
 it('provides four cited native stops with correct species targets and isolated camera data',()=>{
  const details=checks.details('nucleus',(_,fallback)=>fallback);expect(details.map(detail=>detail.id)).toEqual(ids);for(const detail of details){expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.cutaway).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.label.trim()).not.toBe('');expect(detail.body.trim()).not.toBe('');expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,10);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(6);}
  const {g,data}=model();data.update('whole',50,'',false);for(const id of ['protons','neutrons']){const detail=details.find(value=>value.id===id),hit=firstHit(g,data,detail.at,detail.view);expect(hit?.object.userData.specimenKind).toBe('nucleus');expect(hit?.object.userData.specimenDetailId).toBe(id);expect(hit.instanceId).toBeGreaterThanOrEqual(0);}
  const original=plain(checks.sites.nucleus);for(const id of ids){const point=checks.point('nucleus',id);point.at[0]=99;point.view[0]=99;}expect(plain(checks.sites.nucleus)).toEqual(original);expect(checks.point('nucleus','unknown')).toBeNull();expect(source).toMatch(/nucleusModel\(g\)/);expect(source).toMatch(/\.pickVisible\(/);
 });
 it('migrates legacy notes and preserves exact native cameras and section settings through backup',()=>{
  for(const view of [undefined,null,false,true,'SECTION',{},[]]){const note=plain(checks.notes([{itemId:'nucleus',detailId:'',cutaway:true,nucleusView:view,nucleusDepth:'75'}]))[0];expect(note).toMatchObject({nucleusView:'whole',nucleusDepth:50,cutaway:false,size:referenceMeters});}
  const raw=ids.map((detailId,n)=>({itemId:'nucleus',detailId,zoom:2.123456789+n*.25,yaw:.731234567891,pitch:-.221234567891,nucleusView:'section',nucleusDepth:75,cutaway:true,note:'The packing is an illustrative nuclear guide.'})),notes=plain(checks.notes(raw));expect(notes).toHaveLength(4);for(const [n,note]of notes.entries())expect(note).toMatchObject({...raw[n],size:referenceMeters,cutaway:false});const backup=checks.parse(checks.backup({observations:notes}));expect(backup.error).toBeUndefined();expect(plain(backup.notebook.observations)).toEqual(notes);
  const other=plain(checks.notes([{itemId:'water',detailId:'',waterView:'guides',nucleusView:'section',nucleusDepth:75}]))[0];expect(other.waterView).toBe('guides');expect(other).not.toHaveProperty('nucleusView');expect(other).not.toHaveProperty('nucleusDepth');expect(plain(checks.notes([{itemId:'nucleus',detailId:'core',zoom:999}]))[0].zoom).toBe(6);
 });
 it('uses actual retained species instances and a fixed14fm reference with finite WebGL1 buffers',()=>{
  const {g,data,resources}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(g.userData.specimen).toBeUndefined();expect(data.layout).toBe(checks.layout);expect(data.species.protons.isInstancedMesh).toBe(true);expect(data.species.neutrons.isInstancedMesh).toBe(true);expect(data.species.protons.count).toBe(79);expect(data.species.neutrons.count).toBe(118);scanGeometry(g,resources);
  const matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();let mismatches=0;for(const [key,mesh]of Object.entries(data.species)){expect(mesh.userData).toMatchObject({specimenKind:'nucleus',specimenDetailId:key});const layout=checks.layout.filter(entry=>entry.kind===(key==='protons'?'proton':'neutron'));for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(position.distanceTo(new T.Vector3(...layout[i].at))>1e-6||Math.max(Math.abs(scale.x-layout[i].radius),Math.abs(scale.y-layout[i].radius),Math.abs(scale.z-layout[i].radius))>1e-6||!matrix.elements.every(Number.isFinite))mismatches++;}}expect(mismatches).toBe(0);
  g.scale.setScalar(3);g.rotation.set(.21,.7,-.18);g.updateMatrixWorld(true);const a=g.localToWorld(new T.Vector3(-.5,0,0)),b=g.localToWorld(new T.Vector3(.5,0,0));expect(a.distanceTo(b)).toBeCloseTo(3,10);
 });
 it('allocates full species colour buffers before hiding inactive section faces',()=>{
  const {data}=model();for(const [key,mesh]of Object.entries(data.caps)){const count=key==='protons'?79:118;expect(mesh.count).toBe(0);expect(mesh.instanceColor.count).toBe(count);expect(mesh.instanceColor.array.length).toBe(count*3);}
  for(const depth of [50,0,25,100,75]){data.update('section',depth,'',false);for(const mesh of Object.values(data.caps))for(let i=0;i<mesh.count*3;i++){expect(Number.isFinite(mesh.instanceColor.array[i])).toBe(true);expect(mesh.instanceColor.array[i]).toBeGreaterThan(.8);}}
 });
 it('cuts real species ray hits at the model-local plane and admits only active cap instances',()=>{
  const {g,data}=model();expect(typeof data.pickVisible).toBe('function');data.update('section',50,'core',false);g.position.set(.4,-.3,.2);g.rotation.set(.4,.7,-.2);g.scale.setScalar(2);g.updateMatrixWorld(true);expect(data.pickVisible(g.localToWorld(new T.Vector3(0,0,.1)))).toBe(false);expect(data.pickVisible(g.localToWorld(new T.Vector3(0,0,-.1)))).toBe(true);
  let capCount=0;for(const [key,caps]of Object.entries(data.caps)){expect(caps.isInstancedMesh).toBe(true);expect(caps.userData).toMatchObject({specimenKind:'nucleus',specimenDetailId:key});capCount+=caps.count;const mapping=data.capSourceIndices[key];expect(mapping).toHaveLength(key==='protons'?79:118);for(let i=0;i<caps.count;i++){const entry=checks.layout[mapping[i]];expect(entry.kind).toBe(key==='protons'?'proton':'neutron');expect(Math.abs(entry.at[2])).toBeLessThan(entry.radius);const hit=firstHit(g,data,[entry.at[0],entry.at[1],0],[0,0,1]);expect(hit).toBeDefined();expect(g.worldToLocal(hit.point.clone()).z).toBeLessThanOrEqual(1e-6);const target=g.localToWorld(new T.Vector3(entry.at[0],entry.at[1],0)),direction=new T.Vector3(0,0,1).transformDirection(g.matrixWorld),ray=new T.Raycaster(target.clone().addScaledVector(direction,5),direction.clone().negate(),0,10),raw=ray.intersectObject(caps,false);expect(raw.length).toBeGreaterThan(0);for(const candidate of raw){expect(candidate.instanceId).toBeLessThan(caps.count);expect(mapping[candidate.instanceId]).toBeGreaterThanOrEqual(0);}}for(let i=caps.count;i<mapping.length;i++)expect(mapping[i]).toBe(-1);expect(data.pickVisible(g.localToWorld(new T.Vector3(0,0,0)),caps,caps.count)).toBe(false);}expect(capCount).toBeGreaterThan(0);
  const removed=checks.layout.find(entry=>entry.at[2]-entry.radius>0);expect(removed).toBeDefined();const hits=firstHit(g,data,[removed.at[0],removed.at[1],0],[0,0,1]);if(hits)expect(g.worldToLocal(hits.point.clone()).z).toBeLessThanOrEqual(1e-6);data.update('whole',50,'',false);expect(data.pickVisible(g.localToWorld(new T.Vector3(0,0,.1)))).toBe(true);expect(Object.values(data.caps).every(caps=>!caps.visible||caps.count===0)).toBe(true);
 });
 it('updates reversible section caps and comparison without reallocating any retained resource',()=>{
  const {g,data,resources}=model(),owned=retained(g),identities=owned.nodes.map(node=>[node.uuid,node.geometry?.uuid,node.material?.uuid,node.instanceMatrix?.array]),count=resources.size,matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();let errors=0;
  for(let n=0;n<200;n++)for(const [view,depth,id]of [['whole',50,''],['section',0,'core'],['section',25,'protons'],['section',50,'neutrons'],['section',100,'boundary']]){data.update(view,depth,id,false);const plane=-.5+depth/100;for(const [key,caps]of Object.entries(data.caps)){const expected=view==='section'?checks.layout.map((entry,index)=>({entry,index})).filter(({entry})=>entry.kind===(key==='protons'?'proton':'neutron')&&Math.abs(plane-entry.at[2])<entry.radius):[];if(caps.count!==expected.length)errors++;for(let i=0;i<caps.count;i++){const entry=checks.layout[data.capSourceIndices[key][i]],radius=Math.sqrt(Math.max(0,entry.radius*entry.radius-(plane-entry.at[2])**2));caps.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(Math.hypot(position.x-entry.at[0],position.y-entry.at[1],position.z-plane)>1e-6||Math.abs(scale.x-radius)>1e-6||Math.abs(scale.y-radius)>1e-6||!matrix.elements.every(Number.isFinite))errors++;}}}
  expect(errors).toBe(0);expect(resources.size).toBe(count);const after=retained(g);expect(after.nodes.map(node=>[node.uuid,node.geometry?.uuid,node.material?.uuid])).toEqual(identities.map(value=>value.slice(0,3)));for(let i=0;i<after.nodes.length;i++)expect(after.nodes[i].instanceMatrix?.array).toBe(identities[i][3]);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});data.update('section',50,'core',true);expect(Object.values(data.caps).every(caps=>!caps.visible||caps.count===0)).toBe(true);expect(data.species.protons.visible).toBe(true);expect(data.species.neutrons.visible).toBe(true);expect(data.pickVisible(g.localToWorld(new T.Vector3(0,0,.4)))).toBe(true);
 });
 it('frames the reference rather than shared unit geometry when instances are transformed',()=>{
  const {g,data}=model(),context={T};vm.runInNewContext(extractFunction('atlasModelBounds'),context);
  const local=context.atlasModelBounds(g);expect(local.min.toArray()).toEqual([-.5,-.5,-.5]);expect(local.max.toArray()).toEqual([.5,.5,.5]);
  g.position.set(1,-2,.7);g.rotation.set(.3,.8,-.2);g.scale.setScalar(3);g.updateMatrixWorld(true);const expected=new T.Box3();for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])expected.expandByPoint(g.localToWorld(new T.Vector3(x,y,z)));
  for(const depth of [0,50,100]){data.update('section',depth,'',false);const actual=context.atlasModelBounds(g);expect(actual.min.distanceTo(expected.min)).toBeLessThan(1e-12);expect(actual.max.distanceTo(expected.max)).toBeLessThan(1e-12);}
  const other=new T.Group(),cube=new T.Mesh(new T.BoxGeometry(2,3,4),new T.MeshBasicMaterial());other.add(cube);other.position.set(-1,.2,2);other.updateMatrixWorld(true);expect(context.atlasModelBounds(other).equals(new T.Box3().setFromObject(other))).toBe(true);cube.geometry.dispose();cube.material.dispose();
 });
 it('releases all tracked GPU resources exactly once after section and comparison changes',()=>{
  const {g,data,resources}=model();for(const id of ['',...ids,''])data.update('section',75,id,false);data.update('whole',50,'',true);scanGeometry(g,resources);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);
 });
});
