import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const api=new Function(source.slice(source.indexOf('  // BEGIN ART STUDIO MIXER HELPERS'),source.indexOf('  // END ART STUDIO CONTRAST HELPERS'))+'\nreturn {model:artStudioContrastModel,color:artStudioContrastColor,ratio:artStudioContrastRatio,luminance:artStudioContrastLuminance,suggest:artStudioContrastSuggestion,hsl:artStudioMixerHSL,hex:artStudioMixerHSLHex};')();
const rgbL=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).reduce((sum,v,i)=>sum+[.2126,.7152,.0722][i]*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4),0);
const reference=(a,b)=>(Math.max(rgbL(a),rgbL(b))+.05)/(Math.min(rgbL(a),rgbL(b))+.05);
const hex=color=>api.hex(color.h,color.s,color.l);

describe('Art Studio WCAG contrast calculations',()=>{
  it('matches independent sRGB results and known black/white endpoints',()=>{
    for(const[a,b]of[['#000000','#ffffff'],['#777777','#ffffff'],['#767676','#ffffff'],['#123456','#abcdef'],['#ff0000','#000000'],['#0a0b0c','#fafafa']])expect(api.ratio(api.hsl(a),api.hsl(b))).toBeCloseTo(reference(a,b),12);
    expect(api.ratio(api.hsl('#000000'),api.hsl('#ffffff'))).toBe(21);expect(api.ratio(api.hsl('#777777'),api.hsl('#ffffff'))).toBeLessThan(4.5);expect(api.ratio(api.hsl('#767676'),api.hsl('#ffffff'))).toBeGreaterThan(4.5);
  });
  it('uses the current sRGB breakpoint for continuous HSL recipes',()=>{
    expect(api.luminance({h:0,s:0,l:4})).toBeCloseTo(.04/12.92,15);
  });
  it('normalizes malformed saved channels while retaining zero and fractional values',()=>{
    expect(api.model({fgH:-720.25,fgS:-1,fgL:0,bgH:Infinity,bgS:NaN,bgL:200,contrastAccessibilityTarget:7})).toEqual({fgH:359.75,fgS:0,fgL:0,bgH:0,bgS:0,bgL:100,contrastAccessibilityTarget:7});
    const model=api.model({fgHex:'#123456',bgHex:'#abc'});expect(hex(api.color(model,'fg'))).toBe('#123456');expect(hex(api.color(model,'bg'))).toBe('#aabbcc');expect(api.model({...model,fgL:31.125}).fgL).toBe(31.125);
  });
  it('finds the neighboring passing gray instead of trusting a rounded ratio',()=>{
    const model=api.model({fgHex:'#777777',bgHex:'#ffffff'}),next=api.suggest(model,'fg');expect(hex(next)).toBe('#767676');expect(reference(hex(next),'#ffffff')).toBeGreaterThanOrEqual(4.5);expect(api.color(model,'bg')).toEqual({h:0,s:0,l:100});
  });
  it('reports unreachable AAA foreground goals without returning a failing color',()=>{
    const model=api.model({fgHex:'#808080',bgHex:'#808080',contrastAccessibilityTarget:7});expect(api.suggest(model,'fg')).toBeNull();expect(api.suggest(model,'bg')).toBeNull();expect(api.suggest(api.model({}), 'fg')).toBeNull();
  });
  it('chooses a passing light or dark candidate and preserves the fixed role',()=>{
    for(const[fg,bg,role,target]of[['#555555','#111111','fg',7],['#eeeeee','#ffffff','bg',7],['#edaa75','#ffffff','fg',4.5],['#175ad2','#1a3476','bg',4.5]]){
      const model=api.model({fgHex:fg,bgHex:bg,contrastAccessibilityTarget:target}),before=structuredClone(model),suggestion=api.suggest(model,role);expect(suggestion).not.toBeNull();expect(api.ratio(suggestion,api.color(model,role==='fg'?'bg':'fg'))).toBeGreaterThanOrEqual(target);expect(model).toEqual(before);
    }
  });
  it('never offers a failing swatch across varied hues and both goals',()=>{
    let seed=42;for(let i=0;i<150;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const fg='#'+(seed&0xffffff).toString(16).padStart(6,'0');seed=(Math.imul(seed,1664525)+1013904223)>>>0;const bg='#'+(seed&0xffffff).toString(16).padStart(6,'0'),target=i%2?4.5:7,model=api.model({fgHex:fg,bgHex:bg,contrastAccessibilityTarget:target});for(const role of ['fg','bg']){const suggestion=api.suggest(model,role);if(suggestion)expect(reference(hex(suggestion),role==='fg'?bg:fg)).toBeGreaterThanOrEqual(target);}}
  });
});
