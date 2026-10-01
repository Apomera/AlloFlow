import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
const source=readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const code=source.slice(source.indexOf('          const ART_STUDIO_GRADIENT_STOPS ='),source.indexOf('          const gradientModel='));
const api=new Function('const d={};'+code+'return {config:artStudioGradientConfig,renderStops:artStudioGradientRenderStops,rgb:artStudioGradientRGB,sample:artStudioGradientSample,insert:artStudioGradientInsert,paint:artStudioGradientPaint,css:artStudioGradientCSS};')();

describe('Gradient render model',()=>{
  it('recovers one-stop saved gradients as a valid uniform CSS ramp',()=>{
    const model=api.config({gradStops:[{hue:270,sat:45,lit:20,pos:60,alpha:30}]});
    expect(model.gradStops).toEqual([{hue:270,sat:45,lit:20,pos:0,alpha:30},{hue:270,sat:45,lit:20,pos:100,alpha:30}]);
    expect(api.css(model)).toBe('linear-gradient(90deg in srgb, hsla(270, 45%, 20%, 0.3) 0%, hsla(270, 45%, 20%, 0.3) 100%)');
  });
  it('rejects non-finite geometry and opacity while accepting explicit zero',()=>{
    const m=api.config({gradType:'invalid',gradCenterX:NaN,gradCenterY:200,gradRotation:Infinity,gradAngle:-10,gradStops:[{hue:Infinity,pos:NaN,alpha:'0'},{hue:240,pos:100,alpha:0}]});
    expect(m).toMatchObject({gradType:'linear',gradCenterX:50,gradCenterY:100,gradRotation:0,gradAngle:0});expect(m.gradStops[0].alpha).toBe(100);expect(m.gradStops[1].alpha).toBe(0);expect(api.css(m)).not.toMatch(/NaN|Infinity/);
  });
  it('interpolates premultiplied alpha and extends end colors',()=>{
    const stops=api.config({gradStops:[{hue:0,sat:100,lit:50,pos:20,alpha:20},{hue:240,sat:100,lit:50,pos:80,alpha:80}]}).gradStops,colors=stops.map(api.rgb);
    expect(api.sample(stops,colors,50)).toEqual([51,0,204,.5]);expect(api.sample(stops,colors,-5)).toEqual(colors[0]);expect(api.sample(stops,colors,150)).toEqual(colors[1]);
  });
  it('uses the last stop at a shared boundary and retains transparent hard bands',()=>{
    const model=api.config({gradBlend:'hard',gradStops:[{hue:0,sat:100,lit:50,pos:0,alpha:0},{hue:240,sat:100,lit:50,pos:100,alpha:100}]}),stops=api.renderStops(model),colors=stops.map(api.rgb);
    expect(api.sample(stops,colors,49.9)).toEqual([0,0,0,0]);expect(api.sample(stops,colors,50)).toEqual([0,0,255,1]);
  });
  it('preserves a smooth translucent ramp when inserting a sampled stop',()=>{
    const original=api.config({gradStops:[{hue:30,sat:90,lit:40,pos:0,alpha:25},{hue:240,sat:70,lit:80,pos:100,alpha:90}]}),next={...original,gradStops:api.insert(original)};
    for(const position of [0,10,24,37,50,65,90,100]){const a=api.sample(original.gradStops,original.gradStops.map(api.rgb),position),b=api.sample(next.gradStops,next.gradStops.map(api.rgb),position);a.forEach((value,index)=>expect(b[index]).toBeCloseTo(value,2));}
  });
  it('renders the conic fallback with rotation, offset center and correct alpha',()=>{
    let image;const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:value=>image=value};
    api.paint({width:8,height:8,getContext:()=>ctx},{gradType:'conic',gradRotation:90,gradCenterX:0,gradCenterY:50,gradStops:[{hue:0,sat:100,lit:50,pos:0,alpha:0},{hue:120,sat:100,lit:50,pos:100,alpha:100}]});
    expect(image.data.length).toBe(256);for(let i=0;i<image.data.length;i+=4){expect(image.data[i]).toBe(0);expect(image.data[i+1]).toBe(255);expect(image.data[i+2]).toBe(0);}
    expect(image.data[(4*8+7)*4+3]).toBeLessThan(10);expect(image.data[(3*8+7)*4+3]).toBeGreaterThan(245);
  });
});
