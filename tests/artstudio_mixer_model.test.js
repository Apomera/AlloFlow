import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_artstudio.js','utf8');
const begin=source.indexOf('  // BEGIN ART STUDIO SPECTRAL VENDOR'),end=source.indexOf('  // END ART STUDIO MIXER HELPERS');
const api=new Function(source.slice(begin,end)+'\nreturn {model:artStudioMixerModel,color:artStudioMixerColor,hex:artStudioMixerHex,hsl:artStudioMixerHSL,hslHex:artStudioMixerHSLHex,setColor:artStudioMixerSetColor,palette:artStudioMixerPalette,input:artStudioMixerInput};')();
const pair=(a,b,mode='pigment',ratio=.5)=>api.model({...api.setColor(1,a),...api.setColor(2,b),mixMode:mode,mixRatio:ratio});

describe('Art Studio mixer color models',()=>{
  it('defaults new work to pigment while retaining the old hue rule for existing settings',()=>{
    const fresh=api.model({});expect(fresh.mixMode).toBe('pigment');expect(api.input(fresh,1)).toBe('#fcd200');expect(api.input(fresh,2)).toBe('#002185');
    expect(api.model({mixRatio:.4}).mixMode).toBe('hsl');expect(api.model({mixMode:'subtractive'}).mixMode).toBe('hsl');
  });
  it('preserves every valid zero, including black, gray, red B, and the all-A endpoint',()=>{
    const model=api.model({mix1H:0,mix1S:0,mix1L:0,mix2H:0,mix2S:0,mix2L:0,mixRatio:0});
    expect(Object.entries(model).filter(([key])=>key!=='mixMode').every(([,value])=>value===0)).toBe(true);expect(api.color(model)).toBe('#000000');
  });
  it.each(['pigment','light','rgb','hsl'])('keeps exact endpoints and identical input colors in %s',mode=>{
    const model=pair('#abc123','#08cdef',mode);expect(api.color(model,0)).toBe('#abc123');expect(api.color(model,1)).toBe('#08cdef');
    for(const hex of ['#000000','#ffffff','#234567'])expect(api.color(pair(hex,hex,mode),.35)).toBe(hex);
  });
  it('matches the published spectral blue/yellow reference',()=>{
    expect(api.color(pair('#002185','#fcd200'))).toBe('#3d933e');
  });
  it('distinguishes encoded RGB averages from linear-light crossfades',()=>{
    expect(api.color(pair('#000000','#ffffff','rgb'))).toBe('#808080');expect(api.color(pair('#000000','#ffffff','light'))).toBe('#bcbcbc');
    expect(api.color(pair('#ff0000','#00ff00','light'))).toBe('#bcbc00');expect(api.color(pair('#ff0000','#00ff00','rgb'))).toBe('#808000');
  });
  it('takes the short hue arc across zero degrees',()=>{
    const model=api.model({mixMode:'hsl',mix1H:350,mix1S:100,mix1L:50,mix2H:10,mix2S:100,mix2L:50,mixRatio:.5});expect(api.color(model)).toBe('#ff0000');
  });
  it.each(['pigment','light','rgb','hsl'])('preserves the mixture when swapping sources and proportions in %s',mode=>{
    expect(api.color(pair('#a23ed6','#1fbee0',mode,.2))).toBe(api.color(pair('#1fbee0','#a23ed6',mode,.8)));
  });
  it('round-trips arbitrary hex inputs through HSL without dropping channel precision',()=>{
    let value=123456789;for(let i=0;i<1000;i++){value=(Math.imul(value,1664525)+1013904223)>>>0;const hex='#'+(value&0xffffff).toString(16).padStart(6,'0'),hsl=api.hsl(hex);expect(api.hslHex(hsl.h,hsl.s,hsl.l)).toBe(hex);}
    expect(api.hex(' #AbC ')).toBe('#aabbcc');for(const bad of ['red','#ab','#12345g','#abcd',{},null])expect(api.hex(bad)).toBeNull();
  });
  it('bounds hostile numeric state and renders seven usable palette colors',()=>{
    const model=api.model({mixMode:'unknown',mixRatio:Infinity,mix1H:NaN,mix1S:-40,mix1L:200,mix2H:{},mix2S:'no',mix2L:null});
    expect(model.mixRatio).toBe(.5);expect(model.mix1S).toBe(0);expect(model.mix1L).toBe(100);
    for(const mode of ['pigment','light','rgb','hsl']){const colors=api.palette({...model,mixMode:mode});expect(colors).toHaveLength(7);expect(colors.every(color=>/^#[0-9a-f]{6}$/.test(color.hex))).toBe(true);expect(colors[0].ratio).toBe(0);expect(colors[6].ratio).toBe(1);}
  });
  it('keeps the pinned upstream license and source inside the served standalone module',()=>{
    const vendor=fs.readFileSync('dev-tools/vendor/spectral-3.0.0.js','utf8').replace(/\r\n/g,'\n').trimEnd();
    expect(source.replace(/\r\n/g,'\n')).toContain(vendor);expect(source).toContain('Copyright (c) 2025 Ronald van Wijnen');
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_artstudio.js','utf8')).toBe(source);
  });
});
