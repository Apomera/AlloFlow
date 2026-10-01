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


describe('stable anatomy annotation slots', () => {
 const anatomy = [[-.6, -.4], [-.2, .5], [.2, -.5], [.6, .4], [0, 0], [0, .6]].map(([layoutX, layoutY], i) => ({name: 'organelle ' + i, layoutX, layoutY, w: 100, h: 26}));
 for (const width of [320, 390, 1200]) it('preserves rows and sides through a full rotation at ' + width, () => {
  const bounds = {left: 8, right: width - 8, top: 250, bottom: 440};
  const center = {x: width / 2, y: 350};
  const frame = angle => anatomy.map(a => ({...a,
   sx: center.x + 100 * (a.layoutX * Math.cos(angle) - a.layoutY * Math.sin(angle)),
   sy: center.y + 100 * (a.layoutX * Math.sin(angle) + a.layoutY * Math.cos(angle))}));
  const initial = layout(frame(0), bounds, center, 140, 6);
  for (let step = 1; step <= 120; step++) {
   const items = frame(step * Math.PI * 2 / 120);
   const snapshot = JSON.stringify(items);
   const boxes = layout(items, bounds, center, 140, 6);
   expect(JSON.stringify(items)).toBe(snapshot);
   boxes.forEach((box, i) => {
    expect([box.side, box.x, box.y]).toEqual([initial[i].side, initial[i].x, initial[i].y]);
    expect([box.sx, box.sy]).toEqual([items[i].sx, items[i].sy]);
   });
  }
  const resized = layout(frame(Math.PI), {...bounds, right: width * 2 - 8, bottom: 700}, {x: width, y: 400}, 280, 6);
  expect(resized.map(b => b.side)).toEqual(initial.map(b => b.side));
  for (const side of ['left', 'right']) {
   const order = boxes => boxes.filter(b => b.side === side).sort((a,b) => a.y - b.y).map(b => b.name);
   expect(order(resized)).toEqual(order(initial));
  }
 });
});


describe('readable anatomy label text', () => {
 const wrap = (text, width) => window.__alloCellPure.wrapCellAnatomyLabel(text, width, s => Array.from(s).length * 6);
 it('wraps long names at word boundaries without dropping text', () => {
  expect(wrap('Endoplasmic Reticulum', 80)).toEqual(['Endoplasmic', 'Reticulum']);
  expect(wrap('Cell Wall', 80)).toEqual(['Cell Wall']);
 });
 it('splits an oversized word without splitting Unicode characters', () => {
  const lines = wrap('Mitochondria', 30);
  expect(lines.join('')).toBe('Mitochondria');
  expect(lines.every(line => line.length <= 5)).toBe(true);
  expect(wrap('🧬🧬🧬', 12)).toEqual(['🧬🧬', '🧬']);
 });
 it('ignores empty text and repeated whitespace', () => {
  expect(wrap('  ',80)).toEqual([]);
  expect(wrap('  Cell   Wall  ',80)).toEqual(['Cell Wall']);
 });
});
