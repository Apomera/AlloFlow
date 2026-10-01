import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const helpers=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL IMPORT HELPERS'),source.indexOf('  // END ART STUDIO PIXEL IMPORT HELPERS'));
const convert=new Function(helpers+';return artStudioPixelImportPixels;')();
const image=(width,height,paint)=>({width,height,data:Uint8ClampedArray.from(Array.from({length:width*height},(_,i)=>paint(i%width,Math.floor(i/width))).flat())});
const rgbSet=pixels=>new Set(Object.values(pixels).map(color=>color.slice(0,7)));
describe('Pixel image conversion',()=>{
 it('preserves exact native RGB, partial alpha, and transparent holes without mutating input',()=>{
  const input=image(8,8,(x,y)=>x===y?[34,68,102,128]:x===7?[255,0,0,255]:[120,180,240,0]),before=input.data.slice();
  const result=convert(input,8,'contain',0);
  expect(result.pixels['0,0']).toBe('#22446680');expect(result.pixels['7,0']).toBe('#ff0000');expect(result.pixels['0,1']).toBeUndefined();expect(result.cells).toBe(15);expect(result.colors).toBe(2);expect(input.data).toEqual(before);
 });
 it('fits a landscape image without cropping or distorting and leaves transparent letterboxing',()=>{
  const result=convert(image(8,4,(x,y)=>[x*30,y*60,0,255]),8,'contain',0);
  expect(result.cells).toBe(32);expect(result.pixels['0,2']).toBe('#000000');expect(result.pixels['7,5']).toBe('#d2b400');expect(result.pixels['0,0']).toBeUndefined();expect(result.pixels['0,6']).toBeUndefined();
 });
 it('crops symmetrically to fill and stretches only when chosen explicitly',()=>{
  const input=image(8,4,(x,y)=>[x*30,y*60,0,255]);
  const cover=convert(input,8,'cover',0),stretch=convert(input,8,'stretch',0);
  expect(cover.cells).toBe(64);expect(cover.pixels['0,0']).toBe('#3c0000');expect(cover.pixels['7,7']).toBe('#96b400');
  expect(stretch.pixels['0,0']).toBe('#000000');expect(stretch.pixels['7,7']).toBe('#d2b400');
 });
 it('centers portrait letterboxing and uses nearest source-cell centers when reducing resolution',()=>{
  const portrait=convert(image(4,8,(x,y)=>[x*60,y*30,0,255]),8,'contain',0);
  expect(portrait.pixels['2,0']).toBe('#000000');expect(portrait.pixels['5,7']).toBe('#b4d200');expect(portrait.pixels['0,0']).toBeUndefined();
  const reduced=convert(image(16,16,(x,y)=>[x,y,0,255]),8,'contain',0);expect(reduced.pixels['0,0']).toBe('#010100');expect(reduced.pixels['7,7']).toBe('#0f0f00');
 });
 it.each([8,16,32,64])('limits the RGB palette to %i colors while preserving each sampled alpha byte',limit=>{
  const input=image(16,16,(x,y)=>[x*16,y*16,(x+y)*8,(x+y)%2?128:255]);
  const result=convert(input,16,'contain',limit);
  expect(rgbSet(result.pixels).size).toBeLessThanOrEqual(limit);expect(result.cells).toBe(256);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)expect(result.pixels[x+','+y].slice(7)).toBe((x+y)%2?'80':'');
  expect(convert(input,16,'contain',limit)).toEqual(result);
 });
 it('keeps exact source colors when the image already fits the chosen palette',()=>{
  const input=image(8,8,(x,y)=>x%2?[255,0,17,255]:[1,2,3,128]);
  expect(convert(input,8,'contain',8)).toEqual(convert(input,8,'contain',0));
 });
 it('returns an empty preview for wholly transparent images without inventing colors',()=>{
  expect(convert(image(8,8,()=>[255,128,0,0]),8,'contain',8)).toEqual({size:8,cells:0,colors:0,pixels:{}});
 });
 it.each([null,{}, {width:0,height:1,data:[]}, {width:1025,height:1,data:[]}, {width:2,height:2,data:new Uint8Array(4)}])('bounds malformed decoded data: %j',input=>{
  expect(convert(input,8,'contain',0)).toEqual({size:8,cells:0,colors:0,pixels:{}});
 });
});
