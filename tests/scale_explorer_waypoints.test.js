import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const data=JSON.parse(fs.readFileSync('stem_lab/assets/terrain/everest-elevation.json','utf8'));
const box={window:{StemLab:{registerTool(){}}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.waypoints={everestWaypoint,everestWaypointInfo,readObservations,everestHeight,notebookBackup,readNotebookBackup,notebookImportPlan};\n  window.StemLab.registerTool('scaleExplorer', {"),box);
const {everestWaypoint:point,everestWaypointInfo:info,readObservations:notes,everestHeight:height}=box.window.waypoints;
const flat={...data,elevations:data.elevations.map(()=>5000)};
const pose={east:0,north:0,altitude:8000,heading:0,pitch:0};
describe('Measured terrain waypoints',()=>{
 it('requires finite coordinates and keeps selected points inside the flight area',()=>{
  for(const p of[null,{}, {east:NaN,north:0},{east:1,north:Infinity},{east:'2',north:3}])expect(point(p)).toBeNull();
  expect(point({east:99999,north:-99999})).toEqual({east:8750,north:-8750});
  expect(point({east:125.2,north:-90.8})).toEqual({east:125,north:-91});
 });
 it('measures horizontal range and north-up bearings across cardinal and diagonal courses',()=>{
  for(const [target,range,bearing]of[[{east:0,north:1000},1000,0],[{east:1000,north:0},1000,90],[{east:0,north:-1000},1000,180],[{east:-1000,north:0},1000,270],[{east:3000,north:4000},5000,36.86989764584402]]){
   expect(info(flat,pose,target)).toMatchObject({range:expect.closeTo(range,8),bearing:expect.closeTo(bearing,8),altitude:5000,visible:true});
  }
  expect(info(flat,pose,{east:0,north:0})).toMatchObject({range:0,bearing:null,visible:true});
 });
 it('samples target altitude without changing the saved flight height',()=>{
  const p={east:1725,north:-3450},view={...pose,altitude:9123.45},result=info(data,view,p);
  expect(result.altitude).toBeCloseTo(height(data,p.east/8849,-p.north/8849)*8849,8);
  expect(view.altitude).toBe(9123.45);expect(info(null,pose,p)).toBeNull();expect(info(data,pose,null)).toBeNull();
 });
 it('hides the guide behind sampled ridges and reveals it when the sight line clears them',()=>{
  const ridge={...flat,elevations:flat.elevations.map((v,i)=>Math.abs(Math.floor(i/241)-120)<2?7000:v)};
  const origin={...pose,east:0,north:-6000,altitude:5600},goal={east:0,north:6000};
  expect(info(flat,origin,goal).visible).toBe(true);
  expect(info(ridge,origin,goal).visible).toBe(false);
  expect(info(ridge,{...origin,altitude:11000},goal).visible).toBe(true);
 });
 it('preserves waypoints in saved flights and keeps older or invalid entries usable',()=>{
  const saved=notes([{itemId:'everest',detailId:'everest-flight',terrainFlightWaypoint:{east:1200,north:-3400}},{itemId:'everest',detailId:'everest-flight'},{itemId:'moon',terrainFlightWaypoint:{east:0,north:0}},{itemId:'everest',detailId:'everest-flight',terrainFlightWaypoint:{east:Infinity,north:0}}]);
  expect(saved[0].terrainFlightWaypoint).toEqual({east:1200,north:-3400});
  saved.slice(1).forEach(n=>expect(n.terrainFlightWaypoint).toBeNull());
 });
 it('carries a saved terrain course through portable backup and import',()=>{
  const api=box.window.waypoints,course={east:1725,north:3400},saved={observations:[{itemId:'everest',detailId:'everest-flight',terrainFlight:pose,terrainFlightWaypoint:course}],investigations:[]};
  const restored=api.readNotebookBackup(api.notebookBackup(saved));expect(restored.error).toBeUndefined();
  expect(restored.notebook.observations[0].terrainFlightWaypoint).toEqual(course);
  const imported=api.notebookImportPlan({},restored.notebook);expect(imported.notebook.observations[0].terrainFlightWaypoint).toEqual(course);
 });
});
