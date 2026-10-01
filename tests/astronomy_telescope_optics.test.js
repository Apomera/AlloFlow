
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');});
const model=state=>window.__alloAstroPure.telescopeOpticsModel(state);
const render=state=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'observe',observingList:[],...state}}),'text/html');
const unit=(a,b)=>{const x=b.x-a.x,y=b.y-a.y,length=Math.hypot(x,y);return{x:x/length,y:y/length};};

describe('Calculated telescope optics and schematic rays',()=>{
  it.each([['refractor',90,1000,20,50,1.8],['reflector',130,650,20,32.5,4]])('uses published dimensions for the %s example',(type,aperture,focal,ep,power,pupil)=>{
    const m=model({scopeType:type,scopeAperture:aperture,scopeFocalLen:focal,eyepieceFl:ep});
    expect(m.magnification).toBe(power);expect(m.exitPupilMm).toBe(pupil);
    expect(m.focalRatio).toBeCloseTo(focal/aperture,12);expect(m.dawesArcsec).toBeCloseTo(116/aperture,12);
  });
  it('separates aperture area and diffraction from magnification',()=>{
    const a=model({scopeAperture:100}),b=model({scopeAperture:200});
    expect(a.magnification).toBe(b.magnification);expect(a.focalMm).toBe(b.focalMm);
    expect(b.grossAreaRatio).toBe(a.grossAreaRatio*4);expect(b.dawesArcsec).toBe(a.dawesArcsec/2);
    expect(b.exitPupilMm).toBe(a.exitPupilMm*2);
  });
  it('halves the pupil when a shorter eyepiece doubles the magnification',()=>{
    const a=model({eyepieceFl:20}),b=model({eyepieceFl:10});
    expect(b.magnification).toBe(a.magnification*2);expect(b.exitPupilMm).toBe(a.exitPupilMm/2);
    expect(b.grossAreaRatio).toBe(a.grossAreaRatio);
  });
  it.each([[50,300,4],[100,1000,25],[400,3000,40],[400,300,40]])('uses a common pupil scale at %s/%s/%s mm',(ap,focal,ep)=>{
    const m=model({scopeAperture:ap,scopeFocalLen:focal,eyepieceFl:ep});
    expect(m.beamRadiusPx/m.eyeRadiusPx).toBeCloseTo(m.exitPupilMm/6,12);
    expect(Math.max(m.eyeRadiusPx,m.beamRadiusPx)).toBeCloseTo(68,12);
    expect(Math.min(m.eyeRadiusPx,m.beamRadiusPx)).toBeGreaterThan(0);
  });
  it.each([[50,300,4],[100,1000,25],[400,3000,40]])('focuses the refractor rays then collimates at %s/%s/%s mm',(ap,focal,ep)=>{
    const m=model({scopeAperture:ap,scopeFocalLen:focal,eyepieceFl:ep});
    for(const ray of m.rays){
      expect(ray.incoming[0].y).toBe(ray.incoming[1].y);expect(ray.focusing[1]).toEqual(m.focus);
      expect(ray.eyepiece[0]).toEqual(m.focus);expect(ray.eyepiece[1].y).toBe(ray.eyepiece[2].y);
      const slope=(ray.atEp.y-m.focus.y)/(ray.atEp.x-m.focus.x);
      expect(slope-(ray.atEp.y-m.axis)/m.diagramEyepiecePx).toBeCloseTo(0,12);
    }
  });
  it.each([[50,300,4],[100,1000,25],[400,3000,40]])('reflects at a flat secondary before reaching the side focus at %s/%s/%s mm',(ap,focal,ep)=>{
    const m=model({scopeType:'reflector',scopeAperture:ap,scopeFocalLen:focal,eyepieceFl:ep});
    for(const ray of m.rays){
      const incoming=unit(ray.primary,ray.secondary),outgoing=unit(ray.secondary,m.focus);
      expect(ray.secondary.y-ray.secondary.x).toBeCloseTo(m.axis-120,12);
      expect(outgoing.x).toBeCloseTo(incoming.y,12);expect(outgoing.y).toBeCloseTo(incoming.x,12);
      expect(Math.hypot(ray.secondary.x-m.focus.x,ray.secondary.y-m.focus.y)).toBeGreaterThan(0);
      expect(ray.focusing.at(-1)).toEqual(m.focus);expect(ray.eyepiece[1].x).toBe(ray.eyepiece[2].x);
      expect(m.ep.y).toBeLessThan(m.focus.y);expect(m.focus.y).toBeLessThan(ray.secondary.y);
    }
  });
  it.each(['refractor','reflector'])('keeps %s paths finite and inside the schematic at every control extreme',type=>{
    for(const ap of [50,400])for(const focal of [300,3000])for(const ep of [4,40]){
      const m=model({scopeType:type,scopeAperture:ap,scopeFocalLen:focal,eyepieceFl:ep});
      for(const ray of m.rays)for(const p of [...ray.incoming,...ray.focusing,...ray.eyepiece]){
        expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(360);
        expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(300);
      }
    }
  });
});

describe('Telescope state, clear controls and model scope',()=>{
  it.each([null,[],false,{scopeType:{},scopeAperture:true,scopeFocalLen:'',eyepieceFl:[],scopeRayStage:{}}])('recovers malformed state to finite defaults',state=>{
    const m=model(state);expect([m.type,m.apertureMm,m.focalMm,m.eyepieceMm,m.stage]).toEqual(['refractor',100,1000,25,'all']);
  });
  it('snaps and bounds restored settings without mutating state',()=>{
    const saved={scopeAperture:'106',scopeFocalLen:1024,eyepieceFl:25.6,scopeRayStage:'focus'},m=model(saved);
    expect([m.apertureMm,m.focalMm,m.eyepieceMm,m.stage]).toEqual([110,1000,26,'focus']);expect(saved.scopeFocalLen).toBe(1024);
    const extremes=model({scopeAperture:999,scopeFocalLen:-999,eyepieceFl:0});expect([extremes.apertureMm,extremes.focalMm,extremes.eyepieceMm]).toEqual([400,300,4]);
  });
  it.each(['all','collect','focus','eyepiece'])('highlights %s without changing the ray geometry',stage=>{
    const a=model({scopeRayStage:stage}),b=model({});
    expect(a.stage).toBe(stage);expect(a.rays).toEqual(b.rays);
    const lab=render({scopeRayStage:stage}).querySelector('#astronomy-scope-lab');
    expect(lab.querySelector('svg[data-ray-view]').getAttribute('data-ray-view')).toBe(stage);
    for(const group of lab.querySelectorAll('[data-ray-stage]'))expect(group.getAttribute('opacity')).toBe(stage==='all'||group.getAttribute('data-ray-stage')===stage?'1':'0.18');
  });
  it('separates schematic dimensions, pupil scale, gross area and observational limits',()=>{
    const lab=render({}).querySelector('#astronomy-scope-lab');
    expect(lab.textContent).toContain('dimensions are not drawn to scale');
    expect(lab.textContent).toContain('Both circles use the same scale');
    expect(lab.textContent).toContain('Gross area omits mirror obstruction');
    expect(lab.textContent).toContain('seeing and optical quality can impose a lower limit');
    expect(lab.textContent).not.toContain('Limiting magnitude');expect(lab.textContent).not.toContain('fast (wide field)');
    expect(lab.querySelector('#astronomy-scope-ray-status').getAttribute('aria-live')).toBe('polite');
    expect(lab.querySelector('button[aria-controls="astronomy-eyepiece-lab"]').textContent).toContain('Preview this setup');
  });
  it('shows the numeric pupil ratio in the drawing',()=>{
    const svg=render({scopeAperture:90,scopeFocalLen:1000,eyepieceFl:20}).querySelector('#astronomy-scope-pupil');
    expect(svg.getAttribute('data-exit-pupil')).toBe('1.8');
    expect(Number(svg.querySelector('[data-exit-beam]').getAttribute('r'))/Number(svg.querySelector('[data-eye-reference]').getAttribute('r'))).toBeCloseTo(.3,12);
  });
  it('uses semantic design tabs and links both instrument references',()=>{
    const lab=render({scopeType:'reflector'}).querySelector('#astronomy-scope-lab');
    expect(lab.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('astronomy-scope-tab-reflector');
    expect(lab.querySelector('[data-secondary-mirror]')).toBeTruthy();
    expect(lab.querySelector('a[href="https://www.celestron.com/products/astromaster-90eq-telescope"]')).toBeTruthy();
    expect(lab.querySelector('a[href="https://www.celestron.com/products/astromaster-130eq-telescope"]')).toBeTruthy();
    expect(lab.querySelectorAll('[role="group"][aria-label="Follow the light path"] button').length).toBe(4);
  });
});
