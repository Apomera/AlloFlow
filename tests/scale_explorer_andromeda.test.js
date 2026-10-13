import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

// Independent reference frame: Sun-centered Galactic Cartesian XYZ.
// These are geometry checks, not an assertion that procedural stars are data.
const REFERENCE_METRES=2.4e22;
const LY_METRES=299792458*31557600;
const MW_DIAMETER_METRES=9.5e20;
const M31_DIAMETER_LY=220000;
const SUN_LOCAL=[.216,0,.145];
const DEG=Math.PI/180;
const longitude=121.174*DEG,latitude=-21.573*DEG;
const direction=[Math.cos(latitude)*Math.cos(longitude),Math.cos(latitude)*Math.sin(longitude),Math.sin(latitude)];
const northCelestialPole=[-.4838350155487132,.7469822444972189,.4559837761750669];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const normalized=a=>a.map(v=>v/norm(a));
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const east=normalized(cross(northCelestialPole,direction));
const north=cross(direction,east);
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
if(!source.includes('ANDROMEDA_DISTANCE_M'))throw new Error('Andromeda helpers missing');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.andromedaChecks={distance:ANDROMEDA_DISTANCE_M,ly:ANDROMEDA_LY_M,diameterLy:ANDROMEDA_DIAMETER_LY,mwDiameter:ANDROMEDA_MW_DIAMETER_M,direction:ANDROMEDA_DIRECTION,diskBasis:ANDROMEDA_DISK_BASIS,project:andromedaProject,milkyPoint:andromedaMilkyPoint,routeIndex:andromedaRouteIndex,routePoint:andromedaRoutePoint,point:andromedaPoint,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.andromedaChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const closeVector=(actual,expected,digits=8)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};
const basis=Array.isArray(api.diskBasis)?api.diskBasis:[api.diskBasis.U||api.diskBasis.u,api.diskBasis.V||api.diskBasis.v,api.diskBasis.W||api.diskBasis.w];
const coreIds=['andromeda-overview','andromeda-home','andromeda-departure','andromeda-midway','andromeda-arrival','andromeda-disc'];
const sampleIds=Array.from({length:101},(_,i)=>'andromeda-passage-'+i);
const details=plain(api.details('andromeda-dist',(_,fallback)=>fallback));

describe('Andromeda distance, geometry and exploration',()=>{
 it('preserves the catalog distance and the declared galaxy scales',()=>{
  expect(api.distance).toBe(REFERENCE_METRES);
  expect(api.ly).toBe(LY_METRES);
  expect(api.diameterLy).toBe(M31_DIAMETER_LY);
  expect(api.mwDiameter).toBe(MW_DIAMETER_METRES);
  expect(api.items.find(item=>item.id==='andromeda-dist').size).toBe(REFERENCE_METRES);
  expect(api.items.find(item=>item.id==='milkyway').size).toBe(MW_DIAMETER_METRES);
  expect(api.distance/api.ly).toBeCloseTo(2536802.001659077,6);
  expect(api.distance/api.mwDiameter).toBeCloseTo(25.263157894736842,10);
  expect(api.distance/(api.diameterLy*api.ly)).toBeCloseTo(11.530918189359442,10);
 });

 it('round-trips all route IDs and rejects noncanonical or out-of-range IDs',()=>{
  for(let i=0;i<=100;i++)expect(api.routeIndex(sampleIds[i])).toBe(i);
  for(const invalid of ['',undefined,null,NaN,100,'andromeda-overview','andromeda-passage-','andromeda-passage--1','andromeda-passage-101','andromeda-passage-1.5','andromeda-passage-1e2','andromeda-passage-1junk','andromeda-passage-01','andromeda-passage-00','andromeda-passage-100 ',' andromeda-passage-1','other-passage-1'])expect(api.routeIndex(invalid)).toBe(null);
 });

 it('uses the full linear Solar System-to-center segment and clamps fractions',()=>{
  for(let i=0;i<=100;i++)closeVector(api.routePoint(i/100),[-.5+i/100,0,0],12);
  for(const invalid of [undefined,null,NaN,-Infinity,Infinity,'invalid',{},[]])closeVector(api.routePoint(invalid),[-.5,0,0],12);
  for(const f of [-1,-Number.MAX_VALUE])closeVector(api.routePoint(f),[-.5,0,0],12);
  for(const f of [2,Number.MAX_VALUE])closeVector(api.routePoint(f),[.5,0,0],12);
  expect(norm(minus(api.routePoint(1),api.routePoint(0)))).toBe(1);
 });

 it('rotates Galactic coordinates into a right-handed orthonormal journey frame',()=>{
  closeVector(api.direction,direction,7);
  expect(norm(api.direction)).toBeCloseTo(1,7);
  closeVector(api.project(direction),[1,0,0],7);
  const projectedNorth=api.project([0,0,1]);
  expect(projectedNorth[1]).toBeGreaterThan(0);
  expect(projectedNorth[2]).toBeCloseTo(0,7);
  const axes=[[1,0,0],[0,1,0],[0,0,1]].map(api.project);
  axes.forEach((axis,i)=>{
   expect(norm(axis)).toBeCloseTo(1,7);
   axes.forEach((other,j)=>expect(dot(axis,other)).toBeCloseTo(i===j?1:0,7));
  });
  closeVector(cross(axes[0],axes[1]),axes[2],7);
  for(const v of [[0,0,0],[.3,-.7,2],[-12,5,.01]])expect(norm(api.project(v))).toBeCloseTo(norm(v),6);
 });

 it('reproduces the observed disk inclination, sky position angle and near side',()=>{
  expect(basis).toHaveLength(3);
  basis.forEach((axis,i)=>{
   expect(axis).toHaveLength(3);
   expect(norm(axis)).toBeCloseTo(1,6);
   basis.forEach((other,j)=>expect(dot(axis,other)).toBeCloseTo(i===j?1:0,6));
  });
  closeVector(cross(basis[0],basis[1]),basis[2],6);
  const inclination=Math.acos(Math.abs(dot(normalized(basis[2]),direction)))/DEG;
  const positionAngle=Math.atan2(dot(basis[0],east),dot(basis[0],north))/DEG;
  expect(inclination).toBeCloseTo(77,4);
  expect(positionAngle).toBeCloseTo(38,4);
  expect(dot(basis[1],east)).toBeLessThan(0);
  expect(dot(basis[1],north)).toBeGreaterThan(0);
  expect(dot(basis[1],direction)).toBeLessThan(0);
 });

 it('keeps the nearest tilted disk edge consistent with the physical radius',()=>{
  const radius=M31_DIAMETER_LY*LY_METRES/(2*REFERENCE_METRES);
  const [major,minor]=basis.map(api.project);
  const observer=[-.5,0,0],center=[.5,0,0];
  const rimAt=theta=>center.map((v,i)=>v+radius*(major[i]*Math.cos(theta)+minor[i]*Math.sin(theta)));
  const near=norm(minus(rimAt(Math.PI/2),observer));
  const expected=Math.sqrt(1+radius*radius-2*radius*Math.sin(77*DEG));
  expect(near).toBeCloseTo(expected,6);
  expect(near).toBeGreaterThan(1-radius);
  for(let i=0;i<360;i++){
   const rim=rimAt(i*DEG);
   expect(norm(minus(rim,center))).toBeCloseTo(radius,7);
   expect(norm(minus(rim,observer))).toBeGreaterThanOrEqual(near-1e-7);
  }
 });

 it('anchors the existing Milky Way Solar System point to the journey origin',()=>{
  closeVector(api.milkyPoint(SUN_LOCAL),[-.5,0,0],11);
  const center=api.milkyPoint([0,0,0]);
  const offset=minus(center,[-.5,0,0]);
  const scale=MW_DIAMETER_METRES/REFERENCE_METRES;
  expect(norm(offset)).toBeCloseTo(norm(SUN_LOCAL)*scale,10);
  closeVector(normalized(offset),api.project([1,0,0]),7);
  expect(norm(minus(center,[.5,0,0]))).toBeGreaterThan(1);
  // Galaxy coordinates use a unit disk diameter; preserve its physical size.
  const pairs=[[[0,0,0],[.5,0,0]],[[.2,.01,-.3],[-.2,-.01,.3]],[[0,-.1,0],[0,.1,0]]];
  for(const [a,b] of pairs)expect(norm(minus(api.milkyPoint(a),api.milkyPoint(b)))).toBeCloseTo(norm(minus(a,b))*scale,10);
 });

 it('resolves 101 ordered samples to their physical linear route positions',()=>{
  let last=null;
  for(let i=0;i<=100;i++){
   const point=api.point(sampleIds[i]);
   expect(point.fraction).toBeCloseTo(i/100,12);
   closeVector(point.at,[-.5+i/100,0,0],12);
   expect(point.view).toHaveLength(3);
   expect(point.view.every(Number.isFinite)).toBe(true);
   expect(Number.isFinite(point.zoom)&&point.zoom>0).toBe(true);
   if(last)expect(point.at[0]).toBeGreaterThan(last.at[0]);
   last=point;
  }
 });

 it('provides finite named camera views and safely falls back for unknown targets',()=>{
  for(const id of coreIds){
   const point=api.point(id);
   expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect(point.at.every(Number.isFinite)&&point.view.every(Number.isFinite)).toBe(true);
   expect(Number.isFinite(point.zoom)&&point.zoom>0).toBe(true);
   expect(point.fraction).toBeGreaterThanOrEqual(0);expect(point.fraction).toBeLessThanOrEqual(1);
  }
  expect(api.point('andromeda-home').fraction).toBe(0);
  expect(api.point('andromeda-midway').fraction).toBe(.5);
  expect(api.point('andromeda-disc').fraction).toBe(1);
  for(const invalid of ['',undefined,null,'andromeda-missing','andromeda-passage-101','constructor','toString','__proto__'])expect(plain(api.point(invalid))).toEqual(plain(api.point('andromeda-overview')));
 });

 it('provides six guide details plus all 101 unique journey targets',()=>{
  expect(details).toHaveLength(107);
  expect(details.slice(0,6).map(d=>d.id)).toEqual(coreIds);
  expect(details.slice(6).map(d=>d.id)).toEqual(sampleIds);
  expect(new Set(details.map(d=>d.id)).size).toBe(107);
  expect(details.every(d=>d.andromedaSite&&d.at.length===3&&d.at.every(Number.isFinite)&&d.view.length===3&&d.view.every(Number.isFinite)&&Number.isFinite(d.zoom)&&d.zoom>0)).toBe(true);
  expect(details.slice(6).every(d=>d.andromedaSample===true)).toBe(true);
  expect(details.every(d=>typeof d.label==='string'&&d.label.trim()&&typeof d.body==='string'&&d.body.trim())).toBe(true);
  expect(details.slice(0,6).every(d=>/^https:\/\//.test(d.source))).toBe(true);
 });

 it('shares route and camera coordinates between guide details and the helpers',()=>{
  for(const detail of details){
   const point=api.point(detail.id);
   closeVector(detail.at,point.at,12);closeVector(detail.view,point.view,12);
   expect(detail.zoom).toBeCloseTo(point.zoom,12);
  }
 });

 it('restores every named view and route sample through notebook records',()=>{
  // Exercise each ID separately to preserve the notebook's 24-record limit.
  for(const detail of details){
   const raw={itemId:'andromeda-dist',detailId:detail.id,note:'Remember '+detail.id,zoom:2,yaw:.34,pitch:.22,view:'atlas'};
   const notes=plain(api.notes([raw]));
   expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);
   expect(notes[0].size).toBe(REFERENCE_METRES);
   closeVector(api.point(notes[0].detailId).at,detail.at,12);
  }
  const valid=[...coreIds,...['andromeda-passage-0','andromeda-passage-50','andromeda-passage-100']].map(detailId=>({itemId:'andromeda-dist',detailId}));
  const invalid=['andromeda-missing','andromeda-passage--1','andromeda-passage-101','andromeda-passage-01'].map(detailId=>({itemId:'andromeda-dist',detailId}));
  expect(plain(api.notes(valid.concat(invalid))).map(n=>n.detailId)).toEqual(valid.map(n=>n.detailId));
 });

 it('retains every observation draft and rejects unknown journey targets',()=>{
  const drafts=Object.fromEntries(details.map(d=>['andromeda-dist:'+d.id,'Saved '+d.id]));
  expect(plain(api.drafts({...drafts,'andromeda-dist:andromeda-missing':'Unknown','andromeda-dist:andromeda-passage-101':'Beyond range','andromeda-dist:andromeda-passage-01':'Noncanonical'}))).toEqual(drafts);
 });
});
