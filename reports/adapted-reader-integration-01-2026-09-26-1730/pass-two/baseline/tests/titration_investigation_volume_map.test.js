import fs from 'node:fs';
import {describe,it,expect} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationInvestigationEscape('),source.indexOf('function titrationInvestigationReportHTML('));
const api=new Function(helpers+';return {frame:titrationInvestigationVolumeFrame,svg:titrationInvestigationVolumeSVG,labels:titrationInvestigationVolumeLabels,outside:titrationInvestigationVolumeOutside,html:titrationInvestigationVolumeHTML};')();
const t=(key,fallback)=>fallback;
const labels=api.labels(t);

describe('investigation volume evidence diagram',()=>{
  it('zooms around the actual saved interval and explicitly marks an off-scale prediction',()=>{
    const frame=api.frame(21,25,25.1,25,'close');
    expect(frame.volume).toEqual({low:24.7,high:25.4});
    expect(frame.prediction).toEqual({value:21,x:52,side:'below'});
    expect(frame.equivalence.x).toBe(frame.interval.x1);
    expect(frame.equivalence.side).toBeNull();
    expect(frame.interval.width).toBeCloseTo(396*0.1/0.7,2);
    expect(api.outside(frame,labels)).toBe('Your prediction: 21.0 mL is below the shown range.');
    expect(api.svg(frame,labels)).toContain('data-volume-offscale="prediction"');
  });
  it('keeps the full-range interval at its true width instead of enlarging it',()=>{
    const frame=api.frame(21,25,25.1,25,'full');
    expect(frame.volume).toEqual({low:0,high:50});
    expect(frame.prediction.side).toBeNull();
    expect(frame.prediction.x).toBeCloseTo(52+396*21/50,3);
    expect(frame.interval.width).toBeCloseTo(0.792,3);
    expect(frame.ticks.map(t=>t.value)).toEqual([0,10,20,30,40,50]);
    expect(api.outside(frame,labels)).toBe('');
  });
  it('distinguishes coincident predictions and equivalence from the measured interval',()=>{
    const frame=api.frame(25,25,25.1,25,'close');
    expect(frame.prediction.x).toBe(frame.equivalence.x);
    expect(frame.prediction.x).toBe(frame.interval.x1);
    expect(frame.interval.x2).toBeGreaterThan(frame.prediction.x);
    const svg=api.svg(frame,labels);
    expect(svg).toContain('P: Your prediction 25.0 mL. E: Equivalence for this setup 25.0 mL. A–B: Saved color-change interval 25.0–25.1 mL.');
    expect(svg).not.toContain('data-volume-offscale');
  });
  it('handles both off-scale directions and boundary predictions without losing their values',()=>{
    const high=api.frame(50,25,25.1,25,'close');
    expect(high.prediction).toEqual({value:50,x:448,side:'above'});
    expect(api.outside(high,labels)).toContain('50.0 mL is above the shown range.');
    for(const value of [0,50]){
      const full=api.frame(value,25,25.1,25,'full');
      expect(full.prediction.side).toBeNull();
      expect(full.prediction.x).toBe(value===0?52:448);
    }
  });
  it('keeps axis ticks finite and on-scale at notebook volume limits',()=>{
    for(const args of [[0,0,0.1,0,'close'],[150,149.9,150,150,'close'],[50,149.9,150,25,'full']]){
      const frame=api.frame(...args);
      expect(frame.volume.low).toBeGreaterThanOrEqual(0);expect(frame.volume.high).toBeLessThanOrEqual(150);
      expect(frame.interval.x1).toBeGreaterThanOrEqual(52);expect(frame.interval.x2).toBeLessThanOrEqual(448);
      expect(frame.ticks.every(t=>Number.isFinite(t.x)&&t.x>=52&&t.x<=448)).toBe(true);
    }
  });
  it('rejects malformed values and reversed or zero-width intervals',()=>{
    for(const bad of [NaN,Infinity,-1,151,'25',null]){
      for(let i=0;i<4;i++){const args=[21,25,25.1,25,'close'];args[i]=bad;expect(api.frame(...args)).toBeNull();}
    }
    expect(api.frame(21,25.1,25,25,'close')).toBeNull();expect(api.frame(21,25,25,25,'close')).toBeNull();
    expect(api.svg(null,labels)).toBe('');
  });
  it('escapes translated labels in SVG and keeps downloaded Unicode safe',()=>{
    const unsafe='"><script>bad()</script><img onerror="bad()">\ud800',custom=api.labels((key,fallback)=>key.endsWith('invest_map_title')?unsafe:fallback);
    const svg=api.svg(api.frame(21,25,25.1,25,'close'),custom);
    expect(svg).not.toContain('<script>');expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(svg).toContain('�');expect(()=>encodeURIComponent(svg)).not.toThrow();
  });
  it('includes a static, self-contained equivalent in the printable report',()=>{
    const html=api.html({prediction:21,equivalence:25,interval:{low:25,high:25.1}},t);
    expect(html).toContain(api.svg(api.frame(21,25,25.1,25,'close'),labels));
    expect(html).toContain('Shown volume range: 24.7–25.4 mL.');
    expect(html).toContain('Your prediction: 21.0 mL is below the shown range.');
    expect(html).toContain('not an exact endpoint');
    expect(html).not.toMatch(/<script|<button|https?:\/\//);
  });
});
