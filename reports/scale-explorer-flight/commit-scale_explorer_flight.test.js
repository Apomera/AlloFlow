import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const data=JSON.parse(fs.readFileSync('stem_lab/assets/terrain/everest-elevation.json','utf8'));
const sandbox={window:{StemLab:{registerTool(){}}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.air={everestFlightPose,everestFlightAdvance,everestHeight,readObservations};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const {everestFlightPose:pose,everestFlightAdvance:advance,everestHeight:height,readObservations:notes}=sandbox.window.air;
const flat={...data,elevations:data.elevations.map(()=>5000)};
const start={east:0,north:0,altitude:8000,heading:0,pitch:-.14};
describe('Measured Everest flight',()=>{
 it('moves in the heading direction using metres and elapsed time',()=>{
   const north=advance(flat,start,{forward:1},.05,200);expect(north.north).toBeCloseTo(10,9);expect(north.east).toBe(0);
   const east=advance(flat,{...start,heading:90},{forward:1},.05,200);expect(east.east).toBeCloseTo(10,9);expect(east.north).toBeCloseTo(0,9);
   const right=advance(flat,start,{side:1},.05,200);expect(right.east).toBeCloseTo(10,9);expect(right.north).toBe(0);
   const climb=advance(flat,start,{lift:1},.05,200);expect(climb.altitude).toBe(8010);
   const back=advance(flat,start,{forward:-1},.05,200);expect(back.north).toBe(-10);
 });
 it('keeps diagonal speed consistent and bounds gaps in the render clock',()=>{
   const diagonal=advance(flat,start,{forward:1,side:1,lift:1},.05,200);
   expect(Math.hypot(diagonal.east,diagonal.north,diagonal.altitude-8000)).toBeCloseTo(10,8);
   expect(advance(flat,start,{forward:1},20,200).north).toBe(10);
   expect(advance(flat,start,{forward:1},NaN,200).north).toBe(0);
   expect(advance(flat,start,{forward:1},-.2,200).north).toBe(0);
 });
 it('maintains clearance over measured terrain and stops at the displayed map bounds',()=>{
   let flight=advance(data,{...start,altitude:3500},{},0,180);
   expect(flight.altitude-height(data,0,0)*8849).toBeCloseTo(150,8);
   for(let i=0;i<900;i++){
     flight=advance(data,flight,{forward:1,lift:-1},.05,900);
     const ground=height(data,flight.east/8849,-flight.north/8849)*8849;
     expect(flight.altitude-ground).toBeGreaterThanOrEqual(149.999999);
     expect(flight.altitude).toBeLessThanOrEqual(12500);
   }
   expect(flight.north).toBe(8750);
   expect(advance(data,{...flight,altitude:12500},{lift:1},.05,900).altitude).toBe(12500);
 });
 it('normalizes corrupt saved poses without changing valid positions or viewing angles',()=>{
   expect(pose({east:Infinity,north:NaN,altitude:'9000',heading:'20',pitch:Infinity})).toEqual(pose());
   const bounded=pose({east:99999,north:-99999,altitude:-200,heading:-370,pitch:99});
   expect(bounded).toEqual({east:8750,north:-8750,altitude:3500,heading:350,pitch:.6});
   const valid={east:1200.25,north:-3140.5,altitude:9200.75,heading:123.4,pitch:-.32};
   expect(pose(valid)).toMatchObject({...valid,heading:expect.closeTo(123.4,10)});
 });
 it('restores flight positions and speed while keeping older observations usable',()=>{
   const saved={east:500,north:-1800,altitude:9400,heading:64,pitch:-.21};
   const entries=notes([{itemId:'everest',detailId:'everest-flight',terrainFlight:saved,terrainFlightSpeed:250},{itemId:'everest',detailId:'everest-summit'}]);
   expect(entries[0]).toMatchObject({terrainFlight:saved,terrainFlightSpeed:250});expect(entries[1].terrainFlight).toBeNull();
   for(const [speed,expected]of [[-20,60],[1000,360],[Infinity,180]]){
     expect(notes([{itemId:'everest',detailId:'everest-flight',terrainFlightSpeed:speed}])[0].terrainFlightSpeed).toBe(expected);
   }
   expect(notes([{itemId:'everest',detailId:'everest-flight'}])[0].terrainFlight).toEqual(pose());
 });
});
