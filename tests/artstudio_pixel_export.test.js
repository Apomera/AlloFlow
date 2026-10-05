import fs from 'node:fs';
import {describe,expect,it,vi} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const mixer=source.slice(source.indexOf('  function artStudioMixerNumber'),source.indexOf('  function artStudioMixerModel'));
const helpers=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL COLOR HELPERS'),source.indexOf('  // END ART STUDIO PIXEL COLOR HELPERS'));
const api=new Function('document',mixer+helpers+';return {options:artStudioPixelExportOptions,draw:artStudioPixelExportCanvas};')(undefined);
const grids=[8,16,24,32,48,64],scales=[1,2,4,8,16],repeats=[1,2,3];
function recording(){
 const calls=[],ctx={clearRect:vi.fn(),imageSmoothingEnabled:true,fillRect(x,y,w,h){calls.push({x,y,w,h,color:this.fillStyle});}},canvas={getContext:vi.fn(()=>ctx)};
 // Canvas keeps its previous fillStyle for an invalid assignment. Model that
 // contract so a malformed saved color cannot accidentally repeat prior paint.
 let fillStyle='#000';Object.defineProperty(ctx,'fillStyle',{get(){return fillStyle;},set(value){if(/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)||/^(?:rgb|rgba|hsl|hsla|oklch|lab|color)\(/.test(value))fillStyle=value;}});
 return {canvas,ctx,calls};
}

describe('Crisp Pixel PNG export dimensions and rasterization',()=>{
 it('accepts all supported combinations as bounded integer square dimensions',()=>{
  for(const size of grids)for(const scale of scales)for(const repeat of repeats){const expected={size,scale,repeats:repeat,side:size*scale*repeat};expect(api.options(size,scale,repeat)).toEqual(expected);expect(api.options(String(size),String(scale),String(repeat))).toEqual(expected);expect(expected.side).toBeLessThanOrEqual(3072);}
 });
 it('defaults independently without inheriting unrelated valid settings',()=>{
  expect(api.options()).toEqual({size:16,scale:1,repeats:1,side:16});
  expect(api.options(12,8,2)).toEqual({size:16,scale:8,repeats:2,side:256});
  expect(api.options(24,3,3)).toEqual({size:24,scale:1,repeats:3,side:72});
  expect(api.options(48,4,4)).toEqual({size:48,scale:4,repeats:1,side:192});
 });
 it.each([null,undefined,true,false,NaN,Infinity,-1,0,1.5,'','bad',[],[8],{},new Number(8),Symbol('8')])('rejects a hostile or unsupported dimension input %j without coercing objects',bad=>{
  expect(api.options(bad,bad,bad)).toEqual({size:16,scale:1,repeats:1,side:16});
 });
 it('does not invoke hostile object primitive conversion',()=>{
  const coercion=vi.fn(()=>{throw new Error('must not coerce');}),bad={[Symbol.toPrimitive]:coercion,valueOf:coercion,toString:coercion};
  expect(api.options(bad,bad,bad)).toEqual({size:16,scale:1,repeats:1,side:16});expect(coercion).not.toHaveBeenCalled();
 });
 it.each(grids)('exports %i-cell native artwork at exactly one pixel per cell',size=>{
  const {canvas,ctx,calls}=recording();expect(api.draw(canvas,{'0,0':'#f00',[(size-1)+','+(size-1)]:'#00f'},size)).toBe(true);
  expect([canvas.width,canvas.height]).toEqual([size,size]);expect(ctx.clearRect).toHaveBeenCalledWith(0,0,size,size);expect(ctx.imageSmoothingEnabled).toBe(false);
  expect(calls).toEqual([{x:0,y:0,w:1,h:1,color:'#f00'},{x:size-1,y:size-1,w:1,h:1,color:'#00f'}]);
 });
 it('scales fractional-alpha colors into exact blocks with no interpolated fill',()=>{
  const data={'0,0':'#aBc8','1,2':'rgba(255,0,0,0.5)','7,7':'hsl(120,100%,50%)'},original=JSON.stringify(data),{canvas,ctx,calls}=recording();api.draw(canvas,data,8,4,1);
  expect([canvas.width,canvas.height]).toEqual([32,32]);expect(ctx.clearRect).toHaveBeenCalledWith(0,0,32,32);
  expect(calls).toEqual([{x:0,y:0,w:4,h:4,color:'#aBc8'},{x:4,y:8,w:4,h:4,color:'rgba(255,0,0,0.5)'},{x:28,y:28,w:4,h:4,color:'hsl(120,100%,50%)'}]);expect(JSON.stringify(data)).toBe(original);
 });
 it('repeats boundary cells edge to edge in each row and column',()=>{
  const {canvas,calls}=recording();api.draw(canvas,{'0,0':'#f00','7,7':'#00f'},8,2,3);expect([canvas.width,canvas.height]).toEqual([48,48]);expect(calls).toHaveLength(18);
  expect(calls.filter(c=>c.color==='#f00').map(c=>[c.x,c.y])).toEqual([[0,0],[16,0],[32,0],[0,16],[16,16],[32,16],[0,32],[16,32],[32,32]]);
  expect(calls.filter(c=>c.color==='#00f').map(c=>[c.x,c.y])).toEqual([[14,14],[30,14],[46,14],[14,30],[30,30],[46,30],[14,46],[30,46],[46,46]]);
  expect(calls.every(c=>c.w===2&&c.h===2&&Number.isInteger(c.x)&&Number.isInteger(c.y))).toBe(true);
 });
 it('keeps the largest allowed export within its boundary using the last cell',()=>{
  const {canvas,calls}=recording();api.draw(canvas,{'63,63':'#fff'},64,16,3);expect(canvas.width).toBe(3072);expect(calls).toHaveLength(9);expect(calls.at(-1)).toEqual({x:3056,y:3056,w:16,h:16,color:'#fff'});expect(calls.every(c=>c.x+c.w<=3072&&c.y+c.h<=3072)).toBe(true);
 });
 it('clears a reused canvas and leaves all missing cells transparent',()=>{
  const {canvas,ctx,calls}=recording();canvas.width=200;canvas.height=100;api.draw(canvas,{'2,3':'#f008'},8,8,2);expect([canvas.width,canvas.height]).toEqual([128,128]);expect(ctx.clearRect).toHaveBeenCalledExactlyOnceWith(0,0,128,128);expect(calls).toHaveLength(4);expect(calls.every(c=>c.color==='#f008')).toBe(true);
 });
 it('ignores invalid cell coordinates and leaves rejected CSS cells transparent',()=>{
  const data=Object.assign(Object.create({'3,3':'#f00'}),{'0,0':'#0f0','8,0':'#f00','0,8':'#f00','-1,0':'#f00','0.5,1':'#f00','01,2':'#f00','1,1':{},'2,2':'currentColor','4,4':'url(x)','5,5':'#nope','6,6':'x'.repeat(161)}),{calls,canvas}=recording();api.draw(canvas,data,8,2,2);expect(calls.filter(c=>c.color!=='rgba(0,0,0,0)')).toEqual([{x:0,y:0,w:2,h:2,color:'#0f0'},{x:16,y:0,w:2,h:2,color:'#0f0'},{x:0,y:16,w:2,h:2,color:'#0f0'},{x:16,y:16,w:2,h:2,color:'#0f0'}]);expect(Object.hasOwn(data,'3,3')).toBe(false);
 });
 it('validates fractional CSS colors without rounding their native rendering precision',()=>{
  const data={'0,0':'hsl(27.123,58.456%,43.789%)','1,0':'rgba(41.4,62.7,19.3,0.4137)'},{canvas,calls}=recording();api.draw(canvas,data,8,16,3);expect(calls.filter(c=>c.color===data['0,0'])).toHaveLength(9);expect(calls.filter(c=>c.color===data['1,0'])).toHaveLength(9);expect(calls.every(c=>c.w===16&&c.h===16)).toBe(true);
 });
 it('delegates modern CSS colors to Canvas and clears a rejected assignment after valid paint',()=>{
  const colors=['#f00','not-a-css-color','color(srgb 0.1234 0.4567 0.7891)','oklch(62.3% 0.141 27.9)','lab(53.2% 29.1 -14.4)'],data=Object.fromEntries(colors.map((color,x)=>[x+',0',color])),{canvas,calls}=recording();api.draw(canvas,data,8,2,1);expect(calls.map(c=>c.color)).toEqual([colors[0],'rgba(0,0,0,0)',...colors.slice(2)]);expect(calls.every(c=>c.w===2&&c.h===2)).toBe(true);
 });
 it.each([null,undefined,[],42,'bad',{}])('exports empty maps without an opaque background: %j',data=>{const {canvas,ctx,calls}=recording();expect(api.draw(canvas,data,8,4,2)).toBe(true);expect(ctx.clearRect).toHaveBeenCalledWith(0,0,64,64);expect(calls).toEqual([]);});
 it('returns failure for absent canvas or unavailable context',()=>{
  expect(api.draw(null,{},8)).toBe(false);expect(api.draw(undefined,{},8)).toBe(false);expect(api.draw({getContext:()=>null},{'0,0':'#f00'},8)).toBe(false);
 });
});
