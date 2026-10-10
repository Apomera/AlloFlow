import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const source=fs.readFileSync(process.env.SCALE_HYDROGEN_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
const ids=['density','bohr-radius','probability-shell','nucleus'],referenceMeters=1.06e-10,bohrPM=52.9177210544,bohrUnits=bohrPM/106;
const registration="  window.StemLab.registerTool('scaleExplorer', {",sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
if(source.split(registration).length!==2)throw Error('Scale Explorer registration is ambiguous');
vm.runInNewContext(source.replace(registration,"  window.hydrogenChecks={bohr:HYDROGEN_BOHR_PM,cdf:hydrogenCDF,radius:hydrogenRadius,probability:hydrogenProbabilityValue,view:hydrogenViewValue,items:ITEMS,sites:SPECIMEN_DETAILS,point:specimenPoint,details:atlasDetails,dimensionText:dimensionText,limit:inspectionLimit,notes:readObservations,backup:notebookBackup,parse:readNotebookBackup};\n"+registration),sandbox);
const checks=sandbox.window.hydrogenChecks,plain=value=>JSON.parse(JSON.stringify(value));
function extractFunction(name){
 const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing '+name);const open=source.indexOf('{',start);let depth=0,quote='',comment='';
 for(let i=open;i<source.length;i++){const c=source[i],next=source[i+1];if(comment==='line'){if(c==='\n')comment='';continue;}if(comment==='block'){if(c==='*'&&next==='/'){comment='';i++;}continue;}if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='/'&&next==='/'){comment='line';i++;continue;}if(c==='/'&&next==='*'){comment='block';i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);}
 throw Error('Unterminated '+name);
}
function model(){
 const resources=new Set(),context={T,grainTexture:null,HYDROGEN_BOHR_PM:checks.bohr,hydrogenCDF:checks.cdf,hydrogenRadius:checks.radius,hydrogenProbabilityValue:checks.probability,hydrogenViewValue:checks.view,clamp:(value,lo,hi)=>Math.max(lo,Math.min(hi,value)),track:value=>(resources.add(value),value)};
 vm.runInNewContext(extractFunction('hydrogenModel'),context);
 const g=new T.Group();context.hydrogenModel(g);g.updateMatrixWorld(true);return{g,data:g.userData.hydrogen,resources};
}
function integrateDensity(end){const steps=4096,h=end/steps,density=x=>4*x*x*Math.exp(-2*x);let total=density(0)+density(end);for(let n=1;n<steps;n++)total+=density(n*h)*(n%2?4:2);return total*h/3;}
function retained(g){const nodes=[],geometry=new Set(),materials=new Set(),textures=new Set();g.traverse(node=>{nodes.push(node);if(node.geometry)geometry.add(node.geometry);for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)textures.add(uniform.value);}});return{nodes,geometry,materials,textures};}
function scanGeometry(g,resources){
 const owned=retained(g);let drawables=0,triangles=0,nonfinite=0,invalidNormals=0,unsafe=0,degenerate=0,winding=0;
 for(const value of [...owned.geometry,...owned.materials,...owned.textures])if(!resources.has(value))throw Error('Untracked retained hydrogen GPU resource');
 g.traverse(node=>{if(node.isMesh||node.isPoints||node.isLine)drawables++;if(node.isMesh)triangles+=(node.geometry.index?node.geometry.index.count:node.geometry.attributes.position.count)/3;});
 for(const geometry of owned.geometry){const p=geometry.attributes.position,n=geometry.attributes.normal,ix=geometry.index;expect(p.count).toBeGreaterThan(0);expect(p.count).toBeLessThan(65536);for(let i=0;i<p.count;i++){if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))nonfinite++;if(n&&(![n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)||Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.002))invalidNormals++;}if(!ix)continue;if(ix.array.BYTES_PER_ELEMENT!==2)unsafe++;for(const index of ix.array)if(index>=p.count)unsafe++;
  if(!n||!owned.nodes.some(node=>node.isMesh&&node.geometry===geometry))continue;expect(ix.count%3).toBe(0);const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),edge=new T.Vector3(),normal=new T.Vector3(),part=new T.Vector3();for(let i=0;i<ix.count;i+=3){const ia=ix.getX(i),ib=ix.getX(i+1),ic=ix.getX(i+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);face.subVectors(b,a).cross(edge.subVectors(c,a));if(face.lengthSq()<1e-24)degenerate++;normal.fromBufferAttribute(n,ia).add(part.fromBufferAttribute(n,ib)).add(part.fromBufferAttribute(n,ic));if(face.dot(normal)<-1e-10)winding++;}
 }
 expect({nonfinite,invalidNormals,unsafe,degenerate,winding}).toEqual({nonfinite:0,invalidNormals:0,unsafe:0,degenerate:0,winding:0});expect(drawables).toBeLessThanOrEqual(40);expect(triangles).toBeLessThan(100000);expect(resources.size).toBeLessThanOrEqual(80);return owned;
}

describe('Scale Explorer hydrogen ground-state probability',()=>{
 it('matches integrated radial probability and inverts independently specified containment fractions',()=>{
  expect(checks.bohr).toBe(bohrPM);expect(checks.cdf(0)).toBe(0);let previous=0;for(const x of [.05,.25,.5,1,2,3,5,8]){const probability=checks.cdf(x);expect(probability).toBeGreaterThan(previous);expect(probability).toBeCloseTo(integrateDensity(x),9);previous=probability;}
  expect(checks.cdf(1)).toBeCloseTo(.3233235838169365,12);expect(checks.cdf(5)).toBeCloseTo(.9972306042844884,12);
  let last=0;for(const percent of [10,25,50,75,90,95,99]){const radius=checks.radius(percent);expect(radius).toBeGreaterThan(last);expect(radius).toBeLessThan(5);expect(integrateDensity(radius)).toBeCloseTo(percent/100,8);last=radius;}expect(checks.radius(90)).toBeCloseTo(2.661160168917105,7);expect(checks.radius(99)).toBeCloseTo(4.202973457942732,7);
 });
 it('accepts only finite numeric probabilities and the strict cloud/section view enum',()=>{
  for(const value of [undefined,null,false,true,'90','99',NaN,Infinity,-Infinity,{},[]])expect(checks.probability(value)).toBe(90);for(const [value,expected]of [[-1,10],[0,10],[10,10],[49.4,49],[49.5,50],[90.4,90],[99,99],[1000,99]])expect(checks.probability(value)).toBe(expected);expect(checks.view('section')).toBe('section');for(const value of [undefined,null,false,true,'cloud','SECTION','section ',{},[]])expect(checks.view(value)).toBe('cloud');
 });
 it('provides four cited inspection stops while retaining the106pm reference diameter',()=>{
  const item=checks.items.find(value=>value.id==='hydrogen');expect(item.size).toBe(referenceMeters);expect(checks.dimensionText(item,(_,fallback)=>fallback)).toBe('reference diameter');expect(checks.limit('hydrogen')).toBe(8);const details=checks.details('hydrogen',(_,fallback)=>fallback);expect(details.map(value=>value.id)).toEqual(ids);
  for(const detail of details){expect(detail.specimenSite).toBe(true);expect(detail.marker).toBe(false);expect(detail.cutaway).toBe(false);expect(detail.source).toMatch(/^https:\/\//);expect(detail.label.trim()).not.toBe('');expect(detail.body.trim()).not.toBe('');expect(detail.at).toHaveLength(3);expect(detail.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...detail.view)).toBeCloseTo(1,10);expect(detail.zoom).toBeGreaterThanOrEqual(1);expect(detail.zoom).toBeLessThanOrEqual(8);}
  const original=plain(checks.sites.hydrogen);for(const id of ids){const point=checks.point('hydrogen',id);point.at[0]=99;point.view[0]=99;}expect(plain(checks.sites.hydrogen)).toEqual(original);expect(checks.point('hydrogen','unknown')).toBeNull();expect(source).toMatch(/id===['"]hydrogen['"][^{}]{0,60}\{?\s*hydrogenModel\(g\)/);
 });
 it('migrates legacy notes and preserves exact native cameras and strict guide settings through backup',()=>{
  for(const view of [undefined,null,false,true,'SECTION',{},[]]){const note=plain(checks.notes([{itemId:'hydrogen',detailId:'',cutaway:true,hydrogenView:view,hydrogenProbability:'95'}]))[0];expect(note).toMatchObject({hydrogenView:'cloud',hydrogenProbability:90,cutaway:false,size:referenceMeters});}
  const raw=ids.map((detailId,n)=>({itemId:'hydrogen',detailId,zoom:3.123456789+n,yaw:.731234567891,pitch:-.221234567891,hydrogenView:'section',hydrogenProbability:95,cutaway:true,note:'Probability is distinct from a solid boundary.'}));const notes=plain(checks.notes(raw));expect(notes).toHaveLength(4);for(const [n,note]of notes.entries())expect(note).toMatchObject({...raw[n],size:referenceMeters,cutaway:false});const backup=checks.parse(checks.backup({observations:notes}));expect(backup.error).toBeUndefined();expect(plain(backup.notebook.observations)).toEqual(notes);
  const other=plain(checks.notes([{itemId:'water',detailId:'',waterView:'guides',hydrogenView:'section',hydrogenProbability:99}]))[0];expect(other.waterView).toBe('guides');expect(other).not.toHaveProperty('hydrogenView');expect(other).not.toHaveProperty('hydrogenProbability');expect(plain(checks.notes([{itemId:'hydrogen',detailId:'density',zoom:999}]))[0].zoom).toBe(8);
 });
 it('samples a deterministic isotropic1s cloud with the correct truncated radial distribution',()=>{
  const first=model(),second=model(),cloud=first.data.cloud;expect(cloud.isPoints).toBe(true);const p=cloud.geometry.attributes.position,q=second.data.cloud.geometry.attributes.position;expect(p.count).toBeGreaterThanOrEqual(10000);expect(p.count).toBeLessThanOrEqual(30000);expect(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength).equals(Buffer.from(q.array.buffer,q.array.byteOffset,q.array.byteLength))).toBe(true);
  const radii=[],means=[0,0,0],squares=[0,0,0],cross=[0,0,0];for(let n=0;n<p.count;n++){const v=[p.getX(n),p.getY(n),p.getZ(n)],r=Math.hypot(...v);if(!Number.isFinite(r)||r<=0)throw Error('Invalid sampled hydrogen radius');radii.push(r/bohrUnits);for(let k=0;k<3;k++){const u=v[k]/r;means[k]+=u;squares[k]+=u*u;}cross[0]+=v[0]*v[1]/(r*r);cross[1]+=v[0]*v[2]/(r*r);cross[2]+=v[1]*v[2]/(r*r);}radii.sort((a,b)=>a-b);expect(radii.at(-1)).toBeLessThanOrEqual(5+1e-6);let deviation=0;const cutoff=checks.cdf(5);for(let n=0;n<radii.length;n++)deviation=Math.max(deviation,Math.abs(checks.cdf(radii[n])/cutoff-(n+.5)/radii.length));expect(deviation).toBeLessThan(.022);for(let k=0;k<3;k++){expect(Math.abs(means[k]/p.count)).toBeLessThan(.02);expect(Math.abs(squares[k]/p.count-1/3)).toBeLessThan(.015);expect(Math.abs(cross[k]/p.count)).toBeLessThan(.015);}
 });
 it('owns finite bounded WebGL1 buffers and preserves a reference separate from the cloud tail',()=>{
  const {g,data,resources}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(data.stats.referenceMeters).toBe(referenceMeters);expect(data.stats.cutoffRadiusA0).toBe(5);scanGeometry(g,resources);const p=data.cloud.geometry.attributes.position;let radius=0;for(let n=0;n<p.count;n++)radius=Math.max(radius,Math.hypot(p.getX(n),p.getY(n),p.getZ(n)));expect(radius).toBeGreaterThan(2);expect(radius).toBeLessThanOrEqual(5*bohrUnits+1e-6);g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);const a=g.localToWorld(new T.Vector3(-.5,0,0)),b=g.localToWorld(new T.Vector3(.5,0,0));expect(a.distanceTo(b)).toBeCloseTo(3,10);
 });
 it('retains prebuilt cloud, section and radial shell resources across reversible inspection',()=>{
  const {g,data,resources}=model(),owned=retained(g),identities=owned.nodes.map(node=>[node.uuid,node.geometry?.uuid,node.material?.uuid]),points=data.cloud.geometry.attributes.position.array.slice(),count=resources.size;expect(typeof data.update).toBe('function');expect(data.section.isMesh).toBe(true);expect(data.shell.isGroup).toBe(true);expect(data.bohrRing.isGroup).toBe(true);
  let invalidTransitions=0;for(let n=0;n<200;n++)for(const [view,percent,id]of [['cloud',90,''],['section',50,'density'],['cloud',95,'bohr-radius'],['section',99,'probability-shell'],['cloud',10,'nucleus']]){data.update(view,percent,id,false);if(Math.abs(data.shell.scale.x-checks.radius(percent)*bohrUnits)>1e-9||Math.abs(data.shell.scale.y-data.shell.scale.x)>1e-12||Math.abs(data.shell.scale.z-data.shell.scale.x)>1e-12||Math.abs(data.bohrRing.scale.x-bohrUnits)>1e-10||data.cloud.visible!==(view==='cloud')||data.volume.visible!==(view==='cloud')||data.section.visible!==(view==='section')||data.sectionContours.visible!==(view==='section'))invalidTransitions++;}expect(invalidTransitions).toBe(0);
  expect(resources.size).toBe(count);expect(retained(g).nodes.map(node=>[node.uuid,node.geometry?.uuid,node.material?.uuid])).toEqual(identities);expect(Buffer.from(points.buffer).equals(Buffer.from(data.cloud.geometry.attributes.position.array.buffer))).toBe(true);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});data.update('section',99,'probability-shell',true);expect(data.cloud.visible).toBe(true);expect(data.section.visible).toBe(false);expect(data.shell.visible).toBe(false);expect(data.bohrRing.visible).toBe(false);expect(data.marker.visible).toBe(false);expect(data.radialMeasure.visible).toBe(false);
 });
 it('releases every retained GPU resource exactly once after guide changes',()=>{
  const {g,data,resources}=model();for(const id of ['',...ids,''])data.update('section',95,id,false);scanGeometry(g,resources);let disposed=0;for(const resource of resources){resource.addEventListener('dispose',()=>disposed++);resource.dispose();}expect(disposed).toBe(resources.size);
 });
});
