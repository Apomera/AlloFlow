import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const mixer=source.slice(source.indexOf('  function artStudioMixerNumber'),source.indexOf('  function artStudioMixerModel'));
const helpers=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL COLOR HELPERS'),source.indexOf('  // END ART STUDIO PIXEL COLOR HELPERS'));
const api=new Function('document',mixer+helpers+';return {color:artStudioPixelColorKey,inventory:artStudioPixelInventory,recolor:artStudioPixelRecolor,preview:artStudioPixelPreview};')(undefined);
describe('Pixel artwork colors and clean previews',()=>{
 it.each([
  ['#F00','#ff0000'],['#ff0000ff','#ff0000'],['hsl(360,100%,50%)','#ff0000'],
  ['rgb(255, 0, 0)','#ff0000'],['rgb(50%, 50%, 50%)','#808080'],
  ['#abcd','#aabbccdd'],['rgba(255,0,0,0.5)','#ff000080'],['hsla(-120,100%,50%,50%)','#0000ff80'],
 ])('groups equivalent saved color syntax: %s', (input,expected)=>expect(api.color(input)).toBe(expected));
 it('ignores hostile colors and cells outside the artwork',()=>{
  for(const bad of [null,{},Infinity,'url(x)','currentColor','hsl(NaN,0%,0%)','#nope','x'.repeat(1000)])expect(api.color(bad)).toBeNull();
  expect(api.inventory({'-1,0':'#f00','8,0':'#f00','0.5,1':'#f00','01,2':'#f00','0,0':'#ff000000','1,0':{},'2,0':'#f00'},8)).toEqual([{hex:'#ff0000',count:1}]);
 });
 it('counts visible colors by frequency without merging different opacity',()=>{
  expect(api.inventory({'0,0':'#f00','1,0':'hsl(0,100%,50%)','2,0':'rgb(255,0,0)','3,0':'#f008','4,0':'#00f'},8)).toEqual([{hex:'#ff0000',count:3},{hex:'#0000ff',count:1},{hex:'#ff000088',count:1}]);
 });
 it('recolors disconnected matching cells while preserving gaps, opacity, and other exact strings',()=>{
  const data={'0,0':'#f00','7,7':'hsl(0,100%,50%)','1,1':'#f008','2,2':'#00F','-1,1':'#f00'};
  expect(api.recolor(data,8,'#ff0000','#3a8')).toEqual({changed:2,data:{...data,'0,0':'#33aa88','7,7':'#33aa88'}});
  expect(api.recolor(data,8,'#ff000088','#3a8').data['1,1']).toBe('#33aa8888');
  expect(data['7,7']).toBe('hsl(0,100%,50%)');
 });
 it('does not create an edit for equivalent colors or invalid replacements',()=>{
  for(const value of ['#f00','bad',{},null])expect(api.recolor({'0,0':'hsl(0,100%,50%)'},8,'#ff0000',value).changed).toBe(0);
 });
 it('draws a transparent 3 by 3 tile from committed cells with no grid or guides',()=>{
  const calls=[],ctx={clearRect:vi.fn(),fillRect(x,y,w,h){calls.push({x,y,w,h,color:this.fillStyle});}},canvas={getContext:()=>ctx};
  api.preview(canvas,{'0,0':'#f00','7,7':'#00f','8,0':'#fff'},8,'tile');
  expect([canvas.width,canvas.height]).toEqual([24,24]);expect(calls).toHaveLength(18);
  expect(calls.filter(c=>c.color==='#ff0000').map(c=>[c.x,c.y])).toEqual([[0,0],[8,0],[16,0],[0,8],[8,8],[16,8],[0,16],[8,16],[16,16]]);
  expect(calls.every(c=>c.w===1&&c.h===1)).toBe(true);expect(ctx.clearRect).toHaveBeenCalledWith(0,0,24,24);
 });
 it('uses native sprite resolution at every supported grid size and handles missing contexts',()=>{
  for(const size of [8,16,24,32,48,64]){const ctx={clearRect:vi.fn(),fillRect:vi.fn()},canvas={getContext:()=>ctx};api.preview(canvas,{'0,0':'#f00'},size,'native');expect(canvas.width).toBe(size);expect(ctx.fillRect).toHaveBeenCalledTimes(1);}
  expect(()=>api.preview({getContext:()=>null},{},16,'tile')).not.toThrow();
 });
});
