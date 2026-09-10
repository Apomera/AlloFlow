import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
let layout;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();layout=window.__alloCellPure.layoutCellAnatomyLabels;});
describe('anatomy annotation geometry',()=>{
 for(const width of [320,390,1200])for(const scale of [1,2])it('keeps labels distinct and inside '+width+' at '+scale+'x',()=>{
  const bounds={left:8*scale,right:(width-8)*scale,top:250*scale,bottom:440*scale};
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){
   const items=Array.from({length:8},(_,i)=>({sx:(width/2+Math.cos(angle+i)*100)*scale,sy:(350+Math.sin(angle+i)*100)*scale,w:(80+i*12)*scale,h:26*scale,name:'structure '+i}));
   const original=JSON.stringify(items);const boxes=layout(items,bounds,{x:width/2*scale,y:350*scale},140*scale,6*scale);
   expect(JSON.stringify(items)).toBe(original);expect(boxes).toHaveLength(8);
   boxes.forEach((b,i)=>{expect(b.name).toBe(items[i].name);expect(b.x).toBeGreaterThanOrEqual(bounds.left);expect(b.x+b.w).toBeLessThanOrEqual(bounds.right+.001);expect(b.y).toBeGreaterThanOrEqual(bounds.top);expect(b.y+b.h).toBeLessThanOrEqual(bounds.bottom+.001);expect(b.h).toBeGreaterThanOrEqual(26*scale);
    boxes.slice(i+1).forEach(c=>expect(b.x+b.w<=c.x||c.x+c.w<=b.x||b.y+b.h<=c.y||c.y+c.h<=b.y).toBe(true));
   });
  }
 });
 it('handles an empty selection',()=>expect(layout([],{left:0,right:320,top:0,bottom:400},{x:160,y:200},80,6)).toEqual([]));
});
