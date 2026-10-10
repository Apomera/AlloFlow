import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),data=JSON.parse(fs.readFileSync('stem_lab/assets/terrain/everest-elevation.json','utf8'));
const sandbox={window:{StemLab:{registerTool(){}}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.terrain={validEverestTerrain,everestHeight,everestPosition,atlasDetails,readObservations};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const {validEverestTerrain:valid,everestHeight:height,everestPosition:position,atlasDetails:details,readObservations:notes}=sandbox.window.terrain;
describe('Everest geographic elevation grid',()=>{
 it('keeps source heights in metres without stretching the summit to the catalogue height',()=>{
   expect(valid(data)).toBe(true);expect(data.elevations.length).toBe(241*241);
   expect(Math.max(...data.elevations)).toBe(8744);expect(Math.min(...data.elevations)).toBe(4477);
   expect(data.spanMeters/(data.width-1)).toBe(75);
   for(const [row,col] of [[0,0],[120,120],[240,240],[63,189]]){
     const x=(col/240-.5)*18000/8849,z=(row/240-.5)*18000/8849;
     expect(height(data,x,z)*8849).toBeCloseTo(data.elevations[row*241+col],8);
   }
 });
 it('interpolates and clamps using east / south coordinates without changing the vertical datum',()=>{
   const plane={...data,elevations:Array.from({length:58081},(_,i)=>4000+i%241*4+Math.floor(i/241)*3)};
   const x=(40.25/240-.5)*18000/8849,z=(80.75/240-.5)*18000/8849;
   expect(height(plane,x,z)*8849).toBeCloseTo(4000+40.25*4+80.75*3,8);
   expect(height(plane,-100,100)*8849).toBeCloseTo(4720,8);
 });
 it('rejects corrupt, displaced or out-of-range grids',()=>{
   for(const invalid of [null,{}, {...data,width:240},{...data,spanMeters:20000},{...data,spacingMeters:-75},{...data,center:{latitude:0,longitude:0}},{...data,elevations:data.elevations.slice(1)}]){
     expect(valid(invalid)).toBe(false);
   }
   for(const bad of [NaN,Infinity,'6000',-32768,10000])expect(valid({...data,elevations:[bad,...data.elevations.slice(1)]})).toBe(false);
 });
 it('keeps terrain viewpoints and their light direction in saved observations',()=>{
   const all=details('everest',(_k,f)=>f);
   expect(all).toHaveLength(6);
   all.forEach(d=>{expect(d.terrain).toBe(true);expect(notes([{itemId:'everest',detailId:d.id,zoom:d.zoom,sunAngle:155}])[0]).toMatchObject({itemId:'everest',detailId:d.id,zoom:d.zoom,sunAngle:155});});
   expect(details('earth',(_k,f)=>f).find(d=>d.id==='himalaya').visit).toBe('everest');
 });
 it('ships identical data to the desktop build with source attribution',()=>{
   expect(fs.readFileSync('desktop/web-app/public/stem_lab/assets/terrain/everest-elevation.json','utf8')).toBe(fs.readFileSync('stem_lab/assets/terrain/everest-elevation.json','utf8'));
   const credit=JSON.parse(fs.readFileSync('stem_lab/assets/terrain/everest-attribution.json','utf8'));
   expect(credit.attribution).toContain('U.S. Geological Survey');expect(credit.sources.length).toBeGreaterThan(0);
   credit.sources.forEach(s=>{expect(s.sha256).toMatch(/^[a-f0-9]{64}$/);expect(s.url).toMatch(/^https:\/\/s3.amazonaws.com\/elevation-tiles-prod\/terrarium\//);});
 });
});

describe('Free terrain positions',()=>{
 it('bounds local metres, preserves north-up coordinates and recovers old notebook entries',()=>{
   expect(position()).toEqual({east:0,north:900});
   expect(position({east:18000,north:-12000})).toEqual({east:9000,north:-9000});
   expect(position({east:NaN,north:Infinity})).toEqual({east:0,north:900});
   expect(position({east:'20',north:null})).toEqual({east:0,north:900});
   const point={east:1725,north:-3450};
   const detail=details('everest',(_k,f)=>f,8,0,point).find(d=>d.id==='everest-explore');
   expect(detail.at).toEqual([point.east/8849,0,-point.north/8849]);
   const sample=notes([{itemId:'everest',detailId:detail.id,terrainPoint:point,yaw:.3,pitch:.7}])[0];
   expect(sample).toMatchObject({terrainPoint:point,pitch:.7});expect(sample.yaw).toBeCloseTo(.3,12);
   expect(notes([{itemId:'everest',detailId:'everest-summit'}])[0].terrainPoint).toEqual({east:0,north:900});
 });
 it('maps the north-west and south-east corners to the matching elevation samples',()=>{
   for(const [point,index] of [[{east:-9000,north:9000},0],[{east:9000,north:-9000},58080]]){
     const d=details('everest',(_k,f)=>f,8,0,point).find(d=>d.id==='everest-explore');
     expect(height(data,d.at[0],d.at[2])*8849).toBeCloseTo(data.elevations[index],7);
   }
 });
});
