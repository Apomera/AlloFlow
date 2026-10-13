import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});

describe('Live renewable operating envelopes',()=>{
  it('locates exact wind operating boundaries and does not join a curve across shutdown',()=>{
    const settings={speed:8,radius:40,cp:40,rating:3000};
    const envelope=model.operatingEnvelope('wind',{settings,key:'speed'});
    const rating=Math.cbrt(3000/(.5*1.225*Math.PI*40**2*.4*.94/1000));
    expect(envelope.thresholds.find(t=>t.kind==='rating').x).toBeCloseTo(rating,10);
    expect(envelope.thresholds.find(t=>t.kind==='cut-in').x).toBe(3);
    expect(envelope.thresholds.find(t=>t.kind==='cut-out').x).toBe(25);
    expect(envelope.points.find(p=>p.x===25)).toMatchObject({power:0,status:'Protective shutdown',breakBefore:true});
    expect(envelope.points.find(p=>p.x===3)).toMatchObject({status:'Generating',breakBefore:true});
    expect(envelope.bands.map(b=>b.regime)).toEqual(['below-cut-in','converting','rated','shutdown']);
    const cutout=envelope.points.findIndex(p=>p.x===25);
    expect(envelope.points[cutout-1].power).toBe(3000);
    expect(envelope.current.power).toBe(model.simulate('wind',settings).power);
    expect(envelope.sensitivity.elasticity).toBeCloseTo(3.01,8);
  });

  it('expresses scenario thresholds in base input units and probes exactly the reapplied scenario',()=>{
    const request={settings:{speed:8,radius:40,cp:40,rating:3000},profileId:'gust',minute:50,key:'speed'};
    const envelope=model.operatingEnvelope('wind',request);
    expect(envelope.axis.current).toBe(8);
    expect(envelope.current.effectiveX).toBe(28);
    expect(envelope.current.regime).toBe('shutdown');
    expect(envelope.thresholds.find(t=>t.kind==='cut-out').x).toBeCloseTo(25/3.5,10);
    expect(envelope.thresholds.find(t=>t.kind==='input-bound').x).toBeCloseTo(30/3.5,10);
    const probe=model.operatingProbe('wind',request,4);
    const applied=model.scenario('wind',probe.settings,'gust').rows[50].run;
    expect(probe.x).toBe(4);expect(probe.effectiveX).toBe(14);
    expect(probe.run).toEqual(applied);
    expect(model.operatingProbe('wind',request,30).clipped).toBe(true);
  });

  it('keeps tidal rating thresholds and output symmetric through reverse-flow scenarios',()=>{
    const request={settings:{speed:2,radius:5,rating:500,cp:40},profileId:'reversal',minute:540,key:'speed'};
    const envelope=model.operatingEnvelope('tidal',request),limits=envelope.thresholds.filter(t=>t.kind==='rating');
    expect(limits).toHaveLength(2);expect(limits[0].x).toBeCloseTo(-limits[1].x,10);
    expect(envelope.current.effectiveX).toBe(-2);
    const forward=model.operatingProbe('tidal',request,2),reverse=model.operatingProbe('tidal',request,-2);
    expect(forward.power).toBe(reverse.power);expect(forward.effectiveX).toBe(-reverse.effectiveX);
    expect(model.operatingProbe('tidal',request,0).regime).toBe('slack');
  });

  it('makes zero resource and temperature boundaries explicit without inventing nonzero output',()=>{
    const geo=model.operatingEnvelope('geothermal',{settings:{returnTemp:100},key:'hot'});
    expect(geo.thresholds.find(t=>t.kind==='heat').x).toBe(100);
    expect(geo.points.filter(p=>p.x<=100).every(p=>p.power===0)).toBe(true);
    const solar=model.operatingEnvelope('solarPv',{settings:{incidence:90},key:'incidence'});
    expect(solar.current.power).toBe(0);expect(solar.sensitivity.elasticity).toBeNull();
    const noWind=model.operatingEnvelope('wind',{settings:{speed:0},key:'radius'});
    expect(noWind.points.every(p=>p.power===0)).toBe(true);
    expect(noWind.thresholds).toHaveLength(0);
    const slack=model.operatingEnvelope('tidal',{profileId:'reversal',minute:0,key:'speed'});
    expect(slack.points.every(p=>p.power===0)).toBe(true);expect(slack.thresholds).toHaveLength(0);
  });

  it('suppresses local elasticities when neighboring inputs straddle an operating boundary',()=>{
    const envelope=model.operatingEnvelope('wind',{settings:{speed:24},key:'speed'});
    expect(envelope.sensitivity.crossesBoundary).toBe(true);
    expect(envelope.sensitivity.elasticity).toBeNull();
    expect(envelope.sensitivity.upper.power).toBe(0);
  });

  it('replays battery history so larger power can cause earlier depletion',()=>{
    const request={settings:{capacity:100,power:50,roundtrip:88,initial:0},minute:95,key:'power'};
    const envelope=model.operatingEnvelope('storage',request);
    const moderate=model.operatingProbe('storage',request,100),high=model.operatingProbe('storage',request,200);
    expect(moderate.power).toBe(100);expect(high.power).toBe(0);
    expect(high.stored).toBe(0);expect(moderate.stored).toBeGreaterThan(0);
    expect(envelope.thresholds.some(t=>t.kind==='storage-state'&&t.approximate)).toBe(true);
    for(const p of envelope.points){
      const e=p.run.extra;
      expect(e.initial+e.charge-e.delivered-e.loss).toBeCloseTo(e.stored,8);
      expect(p.remainder).toBeNull();
      expect(p.power*p.available).toBe(0);
    }
  });

  it('preserves interrupted battery charging and demand limits at the exact inspection minute',()=>{
    const request={settings:{capacity:100,power:50,roundtrip:88,initial:0},profileId:'interrupted',minute:190,key:'capacity'};
    for(const capacity of [10,80,100,500]){
      const p=model.operatingProbe('storage',request,capacity),row=model.scenario('storage',p.settings,'interrupted').rows[190];
      expect(p.run).toEqual(row.run);
      expect(p.run.extra.initial+p.run.extra.charge-p.delivered-p.run.extra.loss).toBeCloseTo(p.stored,8);
      expect(p.power).toBeLessThanOrEqual(50);
    }
  });

  it('keeps every technology finite, energy conserving, and bounded across each response axis',()=>{
    for(const spec of model.specs)for(const control of spec.controls){
      const envelope=model.operatingEnvelope(spec.id,{key:control[0],minute:90});
      expect(envelope.points[0].x).toBe(control[2]);expect(envelope.points.at(-1).x).toBe(control[3]);
      for(const p of envelope.points){
        expect(Number.isFinite(p.power)).toBe(true);expect(p.power).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(p.available)).toBe(true);expect(p.available).toBeGreaterThanOrEqual(0);
        if(spec.id!=='storage')expect(p.available-p.power-p.remainder).toBeCloseTo(0,6);
        else{expect(p.stored).toBeGreaterThanOrEqual(0);expect(p.stored).toBeLessThanOrEqual(p.settings.capacity+1e-8);}
      }
    }
  });

  it('sanitizes requests without mutating the caller and rejects unknown technologies',()=>{
    const settings={speed:8,radius:40,cp:40,rating:3000},request={settings,profileId:'missing',minute:Infinity,key:'missing'};
    const envelope=model.operatingEnvelope('wind',request);
    expect(envelope.profileId).toBe('steady');expect(envelope.minute).toBe(0);expect(envelope.axis.key).toBe('speed');
    expect(model.operatingProbe('wind',request,Infinity).x).toBe(8);
    expect(settings).toEqual({speed:8,radius:40,cp:40,rating:3000});
    expect(model.operatingEnvelope('unknown',{})).toBeNull();expect(model.operatingProbe('unknown',{},1)).toBeNull();
  });
});
