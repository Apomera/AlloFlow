import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const api=new Function(source.slice(source.indexOf('  // BEGIN ART STUDIO MIXER HELPERS'),source.indexOf('  // END ART STUDIO STEREOGRAM HELPERS'))+'\nreturn {model:artStudioStereoModel,raster:artStudioStereoRaster,rows:artStudioStereoRows};')();
const raster=(w,h,value=0)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:value)});
function render(model={},depth=raster(20,20),pattern=null,chunks=1){const image=raster(256,40);for(let i=0;i<chunks;i++)api.rows(image,depth,model,pattern,Math.floor(i*40/chunks),Math.floor((i+1)*40/chunks));return image.data;}
describe('Static stereogram rendering',()=>{
  it('normalizes hostile settings and retains zero depth and seed',()=>{
    expect(api.model({stereoStrength:0,stereoSeed:0})).toMatchObject({stereoStrength:0,stereoSeed:0});
    expect(api.model({stereoPattern:{},stereoDensity:Infinity,stereoStrength:999,stereoSeed:-5})).toEqual({stereoPattern:'bw',stereoDensity:100,stereoStrength:30,stereoSeed:0});
  });
  it.each(['bw','color','noise'])('produces the same complete %s image in chunks or one pass',pattern=>{
    const model={stereoPattern:pattern};expect(render(model,undefined,null,7)).toEqual(render(model));expect(render(model).every((v,i)=>i%4!==3||v===255)).toBe(true);
  });
  it('changes texture with the seed and exactly reproduces a prior seed',()=>{
    expect(render({stereoSeed:9})).not.toEqual(render({stereoSeed:10}));expect(render({stereoSeed:9})).toEqual(render({stereoSeed:9}));
  });
  it('repeats a flat far plane at the selected pattern width',()=>{
    const pixels=render({stereoDensity:80});for(let x=80;x<256;x++)expect(pixels.slice(x*4,x*4+4)).toEqual(pixels.slice((x-80)*4,(x-80)*4+4));
  });
  it('shortens the repeat period by the near-plane disparity',()=>{
    const pixels=render({stereoDensity:80,stereoStrength:20},raster(20,20,255));for(let x=80;x<256;x++)expect(pixels.slice(x*4,x*4+4)).toEqual(pixels.slice((x-60)*4,(x-60)*4+4));
  });
  it('makes zero strength independent of the depth map',()=>{
    expect(render({stereoStrength:0},raster(20,20,255))).toEqual(render({stereoStrength:0},raster(20,20,0)));
  });
  it('uses valid image tiles, including serialized typed-array data',()=>{
    const tile={width:1,height:1,data:{0:20,1:100,2:220,3:255}},pixels=render({stereoPattern:'ai'},undefined,tile);
    for(let i=0;i<pixels.length;i+=4)expect([...pixels.slice(i,i+4)]).toEqual([20,100,220,255]);
  });
  it('rejects oversized, truncated and malformed rasters and uses a complete noise fallback',()=>{
    for(const value of [null,{width:99999,height:10,data:[]},{width:2,height:2,data:[1]},{width:2.5,height:1,data:[]}])expect(api.raster(value)).toBeNull();
    const pixels=render({stereoPattern:'ai'},null,{width:0,height:0,data:[]});expect(pixels).toEqual(render({stereoPattern:'noise'},null));
  });
});
