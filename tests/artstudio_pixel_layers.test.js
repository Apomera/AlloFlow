import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const mixer=source.slice(source.indexOf('  function artStudioMixerNumber'),source.indexOf('  function artStudioMixerModel'));
const colors=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL COLOR HELPERS'),source.indexOf('  // END ART STUDIO PIXEL COLOR HELPERS'));
const layers=source.slice(source.indexOf('  // BEGIN ART STUDIO PIXEL LAYER HELPERS'),source.indexOf('  // END ART STUDIO PIXEL LAYER HELPERS'));
const api=new Function('document',mixer+colors+layers+';return {model:artStudioPixelLayerModel,composite:artStudioPixelComposite,snapshot:artStudioPixelLayerSnapshot};')(undefined);
const layer=(id,pixels,options={})=>({id,name:id,pixels,visible:true,locked:false,...options});
describe('Pixel layer data and compositing',()=>{
 it('opens a legacy drawing as one editable layer without rewriting exact colors',()=>{
  const original={'0,0':'#AbC','1,0':'hsl(14.53,67%,41%)','7,7':'red'};
  const model=api.model({pixelGrid:8,pixelData:original},index=>'Calque '+(index+1));
  expect(model.activeId).toBe('layer-1');expect(model.layers).toHaveLength(1);expect(model.layers[0].name).toBe('Calque 1');
  expect(api.composite(model)).toEqual(original);model.layers[0].pixels['0,0']='#fff';expect(original['0,0']).toBe('#AbC');
 });
 it.each([null,{},'bad',[null], [{pixels:[]}], [{pixels:'bad'}]])('recovers the legacy drawing from malformed layers: %j',pixelLayers=>{
  const model=api.model({pixelGrid:8,pixelData:{'0,0':'#f00'},pixelLayers,pixelActiveLayer:{}});
  expect(model.layers).toHaveLength(1);expect(api.composite(model)).toEqual({'0,0':'#f00'});
 });
 it('bounds layer count, names and cells, repairs hostile duplicate identifiers, and preserves hidden/locked flags',()=>{
  const raw={pixelGrid:8,pixelLayers:[layer('same',{'0,0':'#f00','8,0':'#fff','-1,1':'#fff','1,1':{},'1,2':'x'.repeat(161)},{name:'x'.repeat(100),visible:false,locked:true}),layer('same',{}),layer('layer-2-1',{})],pixelActiveLayer:'absent'};
  const model=api.model(raw);expect(new Set(model.layers.map(l=>l.id)).size).toBe(3);expect(model.activeId).toBe(model.layers[2].id);
  expect(model.layers[0]).toMatchObject({visible:false,locked:true,pixels:{'0,0':'#f00'}});expect(model.layers[0].name).toHaveLength(60);
  expect(api.model({pixelLayers:Array.from({length:100},(_,i)=>layer('l'+i,{}))}).layers).toHaveLength(16);
 });
 it('composites in stack order, respects hidden layers, and keeps empty upper cells clear',()=>{
  const model=api.model({pixelGrid:8,pixelLayers:[layer('base',{'0,0':'#f00','1,0':'red'}),layer('front',{'0,0':'#00f','2,0':'#fff'}),layer('hidden',{'1,0':'#000'},{visible:false})],pixelActiveLayer:'front'});
  expect(api.composite(model)).toEqual({'0,0':'#00f','1,0':'red','2,0':'#fff'});
  expect(api.composite(model,{})).toEqual({'0,0':'#f00','1,0':'red'});
 });
 it('uses source-over alpha instead of replacing translucent pixels with opaque paint',()=>{
  const model=api.model({pixelGrid:8,pixelLayers:[layer('base',{'0,0':'#00f'}),layer('front',{'0,0':'#ff000080','1,0':'rgba(255,0,0,0.5)','2,0':'#00000000'})]});
  expect(api.composite(model)).toEqual({'0,0':'#80007f','1,0':'rgba(255,0,0,0.5)'});
 });
 it('captures all layers independently while only replacing the active layer pixels',()=>{
  const model=api.model({pixelGrid:8,pixelLayers:[layer('base',{'0,0':'#f00'},{locked:true}),layer('front',{'1,1':'#00f'})],pixelActiveLayer:'front'});
  const snapshot=api.snapshot(model,{'2,2':'#abc'});expect(snapshot.pixelActiveLayer).toBe('front');expect(snapshot.pixelData).toEqual({'0,0':'#f00','2,2':'#abc'});
  snapshot.pixelLayers[0].pixels['0,0']='#fff';expect(model.layers[0].pixels['0,0']).toBe('#f00');expect(model.layers[1].pixels).toEqual({'1,1':'#00f'});
 });
 it('retains hidden artwork when every layer is invisible and round-trips its full stack',()=>{
  const raw={pixelGrid:32,pixelLayers:[layer('base',{'2,3':'#aabbcc'},{visible:false}),layer('front',{'4,5':'#ff000080'},{visible:false,locked:true})],pixelActiveLayer:'base'};
  const saved=api.snapshot(api.model(raw));expect(saved.pixelData).toEqual({});expect(api.snapshot(api.model(saved))).toEqual(saved);
  saved.pixelLayers[0].visible=true;expect(api.composite(api.model(saved))).toEqual({'2,3':'#aabbcc'});
 });
});
