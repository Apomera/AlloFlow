import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const mixer=source.slice(source.indexOf('  function artStudioMixerNumber'),source.indexOf('  function artStudioMixerModel'));
const colors=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL COLOR HELPERS'),source.indexOf('  // END ART STUDIO PIXEL COLOR HELPERS'));
const layers=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL LAYER HELPERS'),source.indexOf('  // END ART STUDIO PIXEL LAYER HELPERS'));
const api=new Function('document',mixer+colors+layers+';return {model:artStudioPixelLayerModel,composite:artStudioPixelComposite,snapshot:artStudioPixelLayerSnapshot,canMerge:artStudioPixelCanMerge};')(undefined);
const layer=(id,pixels,extra={})=>({id,name:id,pixels,visible:true,locked:false,...extra});
const compose=(base,front)=>api.composite(api.model({pixelGrid:8,pixelLayers:[layer('base',base),layer('front',front.pixels,front)]}));
describe('Pixel layer opacity and blend composition',()=>{
 it('retains exact historical colors and omits redundant default appearance metadata',()=>{
  const original={'0,0':'#AbC','1,0':'hsl(27.5,58%,43%)'};
  const model=api.model({pixelGrid:8,pixelLayers:[layer('a',original,{opacity:100,blend:'normal'})]});
  expect(api.snapshot(model).pixelLayers).toEqual([layer('a',original)]);expect(api.composite(model)).toEqual(original);
 });
 it.each([null,'50',NaN,Infinity,{},true])('defaults malformed opacity %j to full coverage',opacity=>{
  const model=api.model({pixelLayers:[layer('a',{'0,0':'#123456'},{opacity,blend:'unsupported'})]});expect(model.layers[0].opacity).toBeUndefined();expect(model.layers[0].blend).toBeUndefined();expect(api.composite(model)).toEqual({'0,0':'#123456'});
 });
 it('bounds and rounds opacity, preserves zero, and round-trips appearance without touching paint',()=>{
  const raw={pixelGrid:8,pixelLayers:[layer('low',{'1,2':'#abc'},{opacity:-1,blend:'multiply'}),layer('high',{'2,3':'#12345680'},{opacity:190}),layer('fraction',{}, {opacity:29.4,blend:'screen'})]};
  const model=api.model(raw);expect(model.layers.map(l=>l.opacity)).toEqual([0,undefined,29]);expect(api.snapshot(api.model(api.snapshot(model)))).toEqual(api.snapshot(model));expect(raw.pixelLayers[0].opacity).toBe(-1);
 });
 it.each([['normal','#800080'],['multiply','#000080'],['screen','#8000ff']])('composites a half-opacity red layer over blue using %s', (blend,expected)=>{
  expect(compose({'0,0':'#0000ff'},{pixels:{'0,0':'#ff0000'},opacity:50,blend})).toEqual({'0,0':expected});
 });
 it('multiplies cell alpha by layer opacity, rather than replacing cell alpha',()=>{
  expect(compose({'0,0':'#0000ff'},{pixels:{'0,0':'#ff000080'},opacity:50})).toEqual({'0,0':'#4000bf'});
 });
 it.each(['normal','multiply','screen'])('keeps the source color over transparent space with %s and excludes checkerboard color',blend=>{
  expect(compose({}, {pixels:{'0,0':'#ff000080'},opacity:50,blend})).toEqual({'0,0':'#ff000040'});
 });
 it('blends only the overlap of a translucent source and backdrop',()=>{
  expect(compose({'0,0':'#0000ff80'},{pixels:{'0,0':'#ff0000'},opacity:50,blend:'multiply'})).toEqual({'0,0':'#550055c0'});
  expect(compose({'0,0':'#0000ff80'},{pixels:{'0,0':'#ff0000'},opacity:50,blend:'screen'})).toEqual({'0,0':'#aa00aac0'});
 });
 it('preserves hidden and zero-opacity paint while leaving lower layers visible',()=>{
  const raw={pixelGrid:8,pixelLayers:[layer('base',{'0,0':'#abc'}),layer('zero',{'0,0':'#f00'},{opacity:0,blend:'screen'}),layer('hidden',{'0,0':'#00f'},{visible:false,opacity:50})]};
  const result=api.snapshot(api.model(raw));expect(result.pixelData).toEqual({'0,0':'#abc'});expect(result.pixelLayers).toEqual(raw.pixelLayers);
 });
 it('does not mutate source colors while repeatedly compositing adjusted appearance',()=>{
  const raw={pixelGrid:8,pixelLayers:[layer('base',{'0,0':'#267fa0'}),layer('front',{'0,0':'#d26d3280'},{opacity:72,blend:'multiply'})]},before=JSON.stringify(raw),model=api.model(raw);
  for(let i=0;i<50;i++)api.composite(model,{'0,0':'#d26d3280'});expect(JSON.stringify(raw)).toBe(before);expect(model.layers[1].pixels).toEqual(raw.pixelLayers[1].pixels);
 });
 it('allows Normal-opacity merging but protects backdrop-dependent blend effects',()=>{
  const a=layer('a',{}, {opacity:30}),b=layer('b',{}, {opacity:60});expect(api.canMerge(a,b)).toBe(true);expect(api.canMerge({...a,blend:'multiply'},b)).toBe(false);expect(api.canMerge(a,{...b,blend:'screen'})).toBe(false);expect(api.canMerge(a,{...b,locked:true})).toBe(false);
 });
});
