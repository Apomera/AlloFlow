import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

// Independent numerical anchors: Dupuy & Courtois (2023), section 3 / Table 1,
// https://arxiv.org/html/2305.02339, gives the ungrouped Laniakea attractor at
// SGX,SGY,SGZ=(-62,-8,39) Mpc/h and basin volume about 1.9e6 (Mpc/h)^3.
// The public release uses a 1000 Mpc/h cube: 128^3 basin and 64^3 velocity cells.
// These checks validate the displayed reconstruction, not future galaxy orbits.
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
if(!source.includes('var LANIAKEA_DATA='))throw new Error('Laniakea reconstruction helpers missing');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.laniakeaChecks={data:LANIAKEA_DATA,reference:LANIAKEA_REFERENCE_MPC,h:LANIAKEA_H,point:laniakeaPoint,pathPoint:laniakeaPathPoint,routePoint:laniakeaRoutePoint,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.laniakeaChecks,data=api.data;
const referenceMpc=4.9e24/3.085677581491367e22,maskCell=1000/128,velocityCell=1000/64;
const closeVector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};
const delta=(a,b)=>a.slice(0,3).map((v,i)=>v-b[i]);
const distance=(a,b)=>Math.hypot(...delta(a,b));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plain=x=>JSON.parse(JSON.stringify(x));

describe('Laniakea 2023 reconstructed flow atlas',()=>{
 it('preserves the physical reference while converting native Mpc/h coordinates',()=>{
  expect(api.reference).toBeCloseTo(referenceMpc,12);expect(api.reference).toBeCloseTo(158.8,1);expect(api.h).toBe(.75);
  const item=api.items.find(item=>item.id==='laniakea');
  expect(item.size).toBe(4.9e24);expect(item.dim).toBe('reference span');
  closeVector(api.point([0,0,0]),[0,0,0]);
  // 75 Mpc/h becomes 100 Mpc at the explicitly chosen h=0.75.
  expect(Math.hypot(...api.point([45,60,0]))).toBeCloseTo(100/referenceMpc,12);
  const a=[-62,-8,39],b=[11,16,-9];
  expect(distance(api.point(a),api.point(b))*referenceMpc).toBeCloseTo(distance(a,b)/.75,11);
 });

 it('rotates supergalactic axes without reflecting them or changing distance ratios',()=>{
  const span=referenceMpc*.75;
  const x=api.point([span,0,0]),y=api.point([0,span,0]),z=api.point([0,0,span]);
  closeVector(x,[1,0,0]);closeVector(y,[0,0,-1]);closeVector(z,[0,1,0]);closeVector(cross(x,y),z);
  const a=[24,-9,31],b=[-17,22,4];
  expect(distance(api.point(a),api.point(b))/Math.hypot(...api.point(a))).toBeCloseTo(distance(a,b)/Math.hypot(...a),12);
 });

 it('samples path length instead of point index and ignores stored speed in geometry',()=>{
  // Two perpendicular segments have lengths 3 and 4; halfway is (3,.5,0),
  // not the middle stored vertex. The fourth component is ancillary speed.
  const path=[[0,0,0,900],[3,0,0,300],[3,4,0,0]],before=JSON.stringify(path);
  closeVector(api.pathPoint(path,0),[0,0,0]);closeVector(api.pathPoint(path,1),[3,4,0]);
  closeVector(api.pathPoint(path,3/7),[3,0,0]);closeVector(api.pathPoint(path,.5),[3,.5,0]);
  closeVector(api.pathPoint(path,6/7),[3,3,0]);
  expect(JSON.stringify(path)).toBe(before);
 });

 it('clamps path traversal and handles repeated or absent points without NaN',()=>{
  const path=[[2,3,4],[2,3,4],[5,3,4],[5,3,4]];
  closeVector(api.pathPoint(path,-10),[2,3,4]);closeVector(api.pathPoint(path,10),[5,3,4]);
  closeVector(api.pathPoint(path,.5),[3.5,3,4]);
  for(const value of [undefined,null,NaN,Infinity,-Infinity])closeVector(api.pathPoint(path,value),[2,3,4]);
  closeVector(api.pathPoint([],1),[0,0,0]);closeVector(api.pathPoint(null,.5),[0,0,0]);
  closeVector(api.pathPoint([[8,9,10,123]],.7),[8,9,10]);
  for(const fraction of [0,.5,1])closeVector(api.pathPoint([[8,9,10],[8,9,10]],fraction),[8,9,10]);
 });

 it('retains the documented basin resolution and approximately published volume',()=>{
  expect(plain(data.grid)).toMatchObject({units:'Mpc/h',size:1000,maskN:128,velocityN:64,velocityScaleKmS:52});
  expect(data.diagnostics.basinVoxels).toBe(4079);
  expect(data.diagnostics.basinVoxels*maskCell**3/1e6).toBeCloseTo(1.9,1);
  expect(data.diagnostics.originMask).toBe(1);
 });

 it('has finite three-dimensional vertices and valid nondegenerate indexed triangles',()=>{
  const vertices=plain(data.vertices),faces=plain(data.faces),count=vertices.length;
  expect(count).toBeGreaterThan(100);expect(faces.length).toBeGreaterThan(100);
  expect(vertices.every(p=>p.length===3&&p.every(Number.isFinite))).toBe(true);
  expect(faces.every(f=>f.length===3&&new Set(f).size===3&&f.every(i=>Number.isInteger(i)&&i>=0&&i<count))).toBe(true);
  const zeroArea=faces.filter(([i,j,k])=>Math.hypot(...cross(delta(vertices[j],vertices[i]),delta(vertices[k],vertices[i])))<1e-10);
  expect(zeroArea).toHaveLength(0);
  const edges=new Map();
  for(const face of faces)for(let i=0;i<3;i++){const key=[face[i],face[(i+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
  expect([...edges.values()].every(uses=>uses===2)).toBe(true);
  // Independently integrate the closed oriented triangle surface. Smoothing
  // may alter its volume, but must retain the basin's physical scale.
  const volume=faces.reduce((sum,[i,j,k])=>sum+vertices[i].reduce((dot,v,axis)=>dot+v*cross(vertices[j],vertices[k])[axis],0)/6,0);
  const voxelVolume=4079*maskCell**3;
  expect(volume/voxelVolume).toBeGreaterThan(.9);expect(volume/voxelVolume).toBeLessThan(1.1);
  for(let axis=0;axis<3;axis++){
   expect(Math.min(...vertices.map(p=>p[axis]))).toBeCloseTo(data.bounds[0][axis],3);
   expect(Math.max(...vertices.map(p=>p[axis]))).toBeCloseTo(data.bounds[1][axis],3);
   expect(data.bounds[1][axis]-data.bounds[0][axis]).toBeGreaterThan(100);
  }
 });

 it('starts the observer route at the Milky Way and ends near the published attractor',()=>{
  const path=plain(data.homePath),start=path[0],end=path.at(-1),published=[-62,-8,39];
  expect(path.length).toBeGreaterThan(5);closeVector(start.slice(0,3),[0,0,0]);
  expect(data.diagnostics.homeStopReason).toBe('converged');
  // The source velocity grid is coarser than the paper's basin grid, so the
  // endpoint tolerance is one velocity cell, not an unjustified exact equality.
  expect(distance(end,published)).toBeLessThan(velocityCell);
  expect(distance(data.attractor,published)).toBeLessThan(velocityCell);
  expect(end[3]).toBeLessThan(start[3]*.1);
  closeVector(api.routePoint(0),[0,0,0]);closeVector(api.routePoint(1),api.point(end));
  const length=path.slice(1).reduce((sum,p,i)=>sum+distance(p,path[i]),0);
  expect(length).toBeGreaterThanOrEqual(distance(start,end));
  expect(length).toBeGreaterThan(50);
 });

 it('keeps displayed streamlines finite and within the basin extent to one voxel',()=>{
  const paths=plain(data.paths).concat([plain(data.homePath)]),bounds=data.diagnostics.voxelBounds;
  expect(data.paths.length).toBeGreaterThan(100);
  expect(paths.every(path=>path.length>=2&&path.every(p=>p.length===4&&p.every(Number.isFinite)&&p[3]>=0))).toBe(true);
  const outside=paths.flat().filter(p=>p.slice(0,3).some((v,i)=>v<bounds[0][i]-maskCell||v>bounds[1][i]+maskCell));
  expect(outside).toHaveLength(0);
  expect(paths.every(path=>path.slice(1).every((p,i)=>distance(p,path[i])<2*velocityCell))).toBe(true);
 });

 it('keeps all six logical views stable and restores their notebook records',()=>{
  const ids=['laniakea-overview','laniakea-boundary','laniakea-plane','laniakea-home','laniakea-journey','laniakea-convergence'];
  const details=plain(api.details('laniakea',(_,fallback)=>fallback));
  expect(details.map(d=>d.id)).toEqual(ids);expect(new Set(details.map(d=>d.id)).size).toBe(6);
  expect(details.every(d=>d.laniakeaSite&&d.at.length===3&&d.at.every(Number.isFinite)&&d.view.length===3&&d.view.every(Number.isFinite)&&d.zoom>=1)).toBe(true);
  closeVector(details[3].at,[0,0,0]);closeVector(details[4].at,api.routePoint(.5));closeVector(details[5].at,api.routePoint(1));
  expect(distance(details[3].at,details[4].at)).toBeGreaterThan(.1);expect(distance(details[4].at,details[5].at)).toBeGreaterThan(.1);
  const notes=plain(api.notes(ids.map(detailId=>({itemId:'laniakea',detailId,zoom:3})).concat([{itemId:'laniakea',detailId:'laniakea-missing'}])));
  expect(notes.map(n=>n.detailId)).toEqual(ids);
  const drafts=Object.fromEntries(ids.map(id=>['laniakea:'+id,'Saved '+id]));
  expect(plain(api.drafts({...drafts,'laniakea:laniakea-missing':'Invalid view'}))).toEqual(drafts);
 });
});
