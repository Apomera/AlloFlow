import {beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
let C;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();C=window.__alloCellPure;});
describe('cell illustration geometry',()=>{
  it('places lipid heads on the actual rectangular plant membrane and pill-shaped bacterial membrane',()=>{
    for(const type of ['plant','bacterium']){
      const g=C.interiorGeometry(760,440,type,1), inset=4;
      const points=Array.from({length:64},(_,i)=>C.interiorBoundaryPoint(g,type,i/64,inset));
      expect(points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-g.cx)<=g.RX-inset+0.001&&Math.abs(y-g.cy)<=g.RY-inset+0.001)).toBe(true);
      // Top and bottom runs are flat; an ellipse touches each at just one point.
      expect(points.filter(([,y])=>Math.abs(y-(g.cy-g.RY+inset))<0.001).length).toBeGreaterThan(3);
      expect(points.filter(([,y])=>Math.abs(y-(g.cy+g.RY-inset))<0.001).length).toBeGreaterThan(3);
      for(let i=0;i<32;i++){expect(points[i][0]+points[i+32][0]).toBeCloseTo(g.cx*2,5);expect(points[i][1]+points[i+32][1]).toBeCloseTo(g.cy*2,5);}
    }
  });
  it('preserves the animal elliptical boundary and wraps the perimeter',()=>{
    const g=C.interiorGeometry(760,440,'animal',1);
    for(let i=0;i<64;i++){
      const [x,y]=C.interiorBoundaryPoint(g,'animal',i/64,3);
      expect(((x-g.cx)/(g.RX-3))**2+((y-g.cy)/(g.RY-3))**2).toBeCloseTo(1,8);
    }
    expect(C.interiorBoundaryPoint(g,'plant',1,3)).toEqual(C.interiorBoundaryPoint(g,'plant',0,3));
  });
  it('gives every selectable structure a finite detail crop in its own cell',()=>{
    for(const type of ['animal','plant','bacterium'])for(const key of C.interiorOrganelles(type)){
      const focus=C.interiorStructureFocus(type,key);expect(focus).toBeTruthy();expect(focus.x).toBeGreaterThan(0);expect(focus.x).toBeLessThan(760);expect(focus.y).toBeGreaterThan(0);expect(focus.y).toBeLessThan(440);expect(focus.radius).toBeGreaterThan(0);
    }
    expect(C.interiorStructureFocus('bacterium','nucleus')).toBe(null);
    const plant=C.interiorLayout('plant');expect(plant.some(o=>o.key==='smoothER')).toBe(true);expect(plant.some(o=>o.key==='vesicle')).toBe(true);
  });
});
