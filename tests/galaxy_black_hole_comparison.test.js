import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync('stem_lab/stem_tool_galaxy.js','utf8');
const kernel=source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const model=new Function(kernel+';return {trajectory:blackHoleTrajectory,sample:blackHoleSample,at:blackHoleComparisonSample,profile:blackHoleComparisonProfile,differences:blackHoleReleaseDifferences};')();
const release={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:0};

describe('Black hole reference clock',()=>{
  it('samples elapsed time rather than stretching a reference to the current percentage',()=>{
    const current=model.trajectory({sideways:0}),reference=model.trajectory({sideways:1.5}),time=current.duration*.4;
    const actual=model.at(reference,time);
    expect(actual.radius).toBeCloseTo(model.sample(reference,time).radius,10);
    expect(actual.radius).not.toBeCloseTo(model.sample(reference,reference.duration*.4).radius,2);
    expect(actual.state).toBe('outside');
  });
  it('includes the exact reference horizon crossing and stops there',()=>{
    const reference=model.trajectory({sideways:0}),duration=reference.duration+12,profile=model.profile(reference,duration);
    expect(profile.points.at(-1).time).toBe(reference.duration);
    expect(profile.points.at(-1).radius).toBeCloseTo(1,8);
    expect(profile.points.every(p=>p.time<=reference.duration)).toBe(true);
    expect(model.at(reference,reference.duration)).toEqual({radius:1,state:'captured'});
    expect(model.at(reference,reference.duration+.001)).toEqual({radius:null,state:'captured'});
    expect(profile.duration).toBe(duration);
  });
  it('does not turn an escaped endpoint into an indefinitely flat curve',()=>{
    const reference=model.trajectory({sideways:1.5}),profile=model.profile(reference,reference.duration+80);
    expect(profile.end).toBe(reference.duration);
    expect(profile.points.at(-1).time).toBe(reference.duration);
    expect(model.at(reference,reference.duration+1)).toEqual({radius:null,state:'ended'});
  });
  it('clips a longer reference to the current playback window without borrowing its later maximum',()=>{
    const reference=model.trajectory({sideways:1.5}),duration=reference.duration/4,profile=model.profile(reference,duration);
    expect(profile.end).toBe(duration);
    expect(profile.points.at(-1).radius).toBeCloseTo(model.sample(reference,duration).radius,10);
    expect(profile.maximum).toBeLessThan(model.profile(reference,reference.duration).maximum);
    expect(profile.points.every(p=>p.time>=0&&p.time<=duration&&Number.isFinite(p.radius))).toBe(true);
    expect(new Set(profile.points.map(p=>p.time)).size).toBe(profile.points.length);
  });
  it('keeps a circular reference constant without rescaling time or radius',()=>{
    const reference=model.trajectory({radius:6,sideways:1}),profile=model.profile(reference,8);
    expect(profile.points.every(p=>Math.abs(p.radius-6)<1e-8)).toBe(true);
    expect(profile.maximum).toBe(7);
  });
  it('leaves model samples unchanged when deriving or scrubbing a reference',()=>{
    const reference=model.trajectory({sideways:.85}),original=JSON.stringify(reference);
    model.profile(reference,20);model.at(reference,5);model.at(reference,200);
    expect(JSON.stringify(reference)).toBe(original);
  });
  it.each([null,{},NaN,-1,Infinity])('ignores an invalid comparison time %j',time=>{
    expect(model.at(model.trajectory({sideways:1}),time)).toBeNull();
  });
  it.each([null,{},0,-1,Infinity])('ignores an invalid playback window %j',duration=>{
    expect(model.profile(model.trajectory({sideways:1}),duration)).toBeNull();
  });
  it('handles absent or empty reference paths',()=>{
    expect(model.at(null,0)).toBeNull();expect(model.at({samples:[],duration:1},0)).toBeNull();
    expect(model.profile(null,10)).toBeNull();
  });
});

describe('Changed release inputs',()=>{
  it('counts actual changed inputs and leaves outcomes out of the input count',()=>{
    const current={...release,blackHoleDropObject:'star',blackHoleMassMode:'supermassive',blackHoleSideways:1,blackHoleLaunchAngle:75};
    expect(model.differences(current,release)).toEqual(['blackHoleDropObject','blackHoleMassMode','blackHoleSideways','blackHoleLaunchAngle']);
    expect(model.differences(release,release)).toEqual([]);
  });
  it('treats the two representations of the same boundary angle as unchanged',()=>{
    expect(model.differences({...release,blackHoleLaunchAngle:180},{...release,blackHoleLaunchAngle:-180})).toEqual([]);
    expect(model.differences({...release,blackHoleLaunchAngle:-179},{...release,blackHoleLaunchAngle:179})).toEqual(['blackHoleLaunchAngle']);
  });
  it('ignores numerical noise and invalid persisted settings',()=>{
    expect(model.differences({...release,blackHoleSideways:1e-8},release)).toEqual([]);
    expect(model.differences({...release,blackHoleReleaseRadius:100},release)).toEqual([]);
    expect(model.differences(release,null)).toEqual([]);
  });
});

describe('Reference comparison controls',()=>{
  beforeEach(()=>{resetStemLab();window._galaxyHasLoadedOnce=true;loadTool('stem_lab/stem_tool_galaxy.js','galaxy');});
  it('uses a labelled table with column and row headers',()=>{
    const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'blackHole'}});
    const table=root.querySelector('[data-bh-comparison-table]');
    expect(table.querySelector('caption')).not.toBeNull();expect(table.querySelectorAll('thead th[scope=col]')).toHaveLength(3);
    expect(table.querySelectorAll('tbody th[scope=row]')).toHaveLength(8);expect(table.hidden).toBe(true);
    expect(root.querySelector('#black-hole-distance-reference').getAttribute('stroke-dasharray')).toBe('7 5');
    expect(root.querySelector('#black-hole-distance-chart').getAttribute('aria-describedby')).toContain('black-hole-distance-reference-readout');
  });
  it('keeps new labels synchronized in both English registries and the Galaxy catalog',()=>{
    const keys=[...new Set([...source.matchAll(/stem\.galaxy\.(bh_cmp_\w+)/g)].map(m=>m[1]))];
    const catalog=JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json','utf8'));
    for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
      const labels=JSON.parse(readFileSync(file,'utf8')).stem.galaxy;
      for(const key of keys){expect(labels[key],key).toBe(catalog[key]);expect(typeof labels[key],key).toBe('string');}
    }
  });
});
