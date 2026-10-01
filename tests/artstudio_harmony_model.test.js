import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const api=new Function(source.slice(source.indexOf('  // BEGIN ART STUDIO MIXER HELPERS'),source.indexOf('  // END ART STUDIO HARMONY HELPERS'))+'\nreturn {recipe:artStudioHarmonyRecipe,state:artStudioHarmonyState,palette:artStudioHarmonyPalette,type:artStudioHarmonyType};')();
const hues=raw=>api.palette(raw).map(color=>color.h);
describe('Art Studio Harmony geometry and legacy recipes',()=>{
  it('preserves saved hue positions, saturation and lightness from the old controls',()=>{
    const old={baseHue:0,satBlend:70,litVar:50,rotation:-90,paletteSize:6};
    expect(api.recipe(old)).toEqual({baseHue:0,saturation:78,lightness:55,rotation:-90,paletteSize:6,spread:30,scheme:'even'});expect(hues(old)).toEqual([270,330,30,90,150,210]);
  });
  it('classifies evenly spaced colors independently of saturation',()=>{
    for(const saturation of [0,10,100]){expect(api.type({paletteSize:6,saturation})).toBe('even');expect(api.type({paletteSize:4,saturation})).toBe('square');expect(api.type({paletteSize:3,saturation})).toBe('triadic');expect(api.type({paletteSize:2,saturation})).toBe('complementary');}
  });
  it.each([
    ['analogous',[350,320,20]],['complementary',[350,170]],['split',[350,140,200]],['triadic',[350,110,230]],['tetradic',[350,20,170,200]]
  ])('places %s hues at the defined angles, including wraparound',(scheme,expected)=>{expect(hues({scheme,baseHue:350,spread:30})).toEqual(expected);});
  it('rotates every hue equally and lets spread change only the appropriate relationships',()=>{
    expect(hues({scheme:'split',baseHue:10,rotation:40,spread:20})).toEqual([50,210,250]);expect(hues({scheme:'tetradic',baseHue:0,spread:60})).toEqual([0,60,180,240]);expect(hues({scheme:'triadic',baseHue:0,spread:60})).toEqual([0,120,240]);
  });
  it('keeps valid zero channels and normalizes malformed or oversized saved data',()=>{
    const model=api.recipe({baseHue:Infinity,saturation:NaN,lightness:-12,paletteSize:100000,rotation:200,spread:0,scheme:'unknown'});expect(model).toMatchObject({baseHue:200,saturation:78,lightness:0,paletteSize:12,rotation:180,spread:10,scheme:'even'});expect(api.palette(model)).toHaveLength(12);expect(api.palette({saturation:0,lightness:0}).every(color=>color.hex==='#000000')).toBe(true);
  });
  it('uses luminance for readable swatch and wheel marker labels',()=>{
    const colors=api.palette({baseHue:60,satBlend:100,litVar:0,paletteSize:2});expect(colors[0].foreground).toBe('#000000');expect(colors[1].foreground).toBe('#ffffff');
  });
  it('migrates old experiment logs by actual saved settings instead of their incorrect labels',()=>{
    const state=api.state({hypothesis:'My note',explanation:'My explanation',log:[{h:0,s:10,l:0,r:20,n:6,t:'analogous'},null,{recipe:{scheme:'split',baseHue:10,spread:50}}]});expect(state.log).toHaveLength(2);expect(api.type(state.log[0].recipe)).toBe('even');expect(hues(state.log[0].recipe)).toEqual([20,80,140,200,260,320]);expect(state.log[0].recipe).toMatchObject({saturation:54,lightness:40});expect(state.log[1].recipe.scheme).toBe('split');expect(state.hypothesis).toBe('My note');expect(state.explanation).toBe('My explanation');
  });
  it('bounds observations and keeps the eight newest experiments',()=>{
    const state=api.state({hypothesis:'x'.repeat(2500),explanation:'y'.repeat(5000),log:Array.from({length:12},(_,i)=>({h:i}))});expect(state.log).toHaveLength(8);expect(state.log[0].recipe.baseHue).toBe(4);expect(state.hypothesis).toHaveLength(2000);expect(state.explanation).toHaveLength(4000);expect(api.state({log:{},hypothesis:{},explanation:[]})).toMatchObject({log:[],hypothesis:'',explanation:''});
  });
});
