import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const system={source:'solarPv',sourceSettings:{irradiance:0},profileId:'steady',demand:10,grid:'island',battery:{capacity:100,power:20,initial:50,roundtrip:100},batteryUnits:1,reserve:0};
const config={capacityMin:10,capacityMax:100,powerMin:0,powerMax:20,count:5,target:100,initialMode:'energy'};
const study=(settings=system,cfg=config)=>model.designStudy({settings,config:cfg});
const find=(r,c,p)=>r.samples.find(e=>e.unitCapacity===c&&e.unitPower===p);

describe('Battery design comparisons',()=>{
  it('separates a power bottleneck from an energy bottleneck with a hand-calculated demand balance',()=>{
    const r=study(),power=find(r,100,5),capacity=find(r,10,20),both=find(r,100,20);
    expect(power.localEnergy).toBeCloseTo(20);expect(power.coverage).toBeCloseTo(50);expect(power.powerLimitedMinutes).toBe(240);expect(power.energyLimitedMinutes).toBe(0);expect(power.firstGap).toBe(0);
    expect(capacity.localEnergy).toBeCloseTo(10);expect(capacity.coverage).toBeCloseTo(25);expect(capacity.powerLimitedMinutes).toBe(0);expect(capacity.energyLimitedMinutes).toBe(180);expect(capacity.firstGap).toBe(60);
    expect(both.coverage).toBeCloseTo(100);expect(both.firstGap).toBeNull();expect(both.totals.unserved).toBeCloseTo(0);expect(both.endStored).toBeCloseTo(10);
  });
  it('holds the initial kWh fixed except when smaller banks cannot contain them',()=>{
    const r=study();expect(r.baseline.initialStored).toBe(50);expect(r.clipped).toBe(10);
    for(const e of r.samples){expect(e.initialStored).toBeCloseTo(Math.min(e.capacity,50));expect(e.initialClipped).toBe(e.capacity<50);}
    expect(find(r,55,10).meetsTarget).toBe(true);
  });
  it('makes the additional starting energy in a percentage comparison explicit',()=>{
    const r=study(system,{...config,initialMode:'percent'});expect(r.clipped).toBe(0);
    for(const e of r.samples){expect(e.initialStored).toBe(e.capacity*.5);expect(e.initialPercent).toBe(50);}
    expect(find(r,55,10).meetsTarget).toBe(false);expect(find(r,100,10).meetsTarget).toBe(true);
  });
  it('does not fill a larger empty battery or charge it from the grid',()=>{
    const r=study({...system,grid:'connected',battery:{...system.battery,initial:0}});
    for(const e of r.samples){expect(e.initialStored).toBe(0);expect(e.endStored).toBe(0);expect(e.localEnergy).toBe(0);expect(e.totals.grid).toBeCloseTo(40);expect(e.meetsTarget).toBe(false);}
  });
  it('excludes grid imports from coverage even when all demand is served',()=>{
    const r=study({...system,grid:'connected'}),e=find(r,10,20);
    expect(e.coverage).toBeCloseTo(25);expect(e.totals.grid).toBeCloseTo(30);expect(e.totals.unserved).toBe(0);expect(e.meetsTarget).toBe(false);
  });
  it('explains a strategy-held full battery as an energy/strategy limit',()=>{
    const r=study({...system,grid:'connected',policy:'backup'}),e=find(r,100,20);
    expect(e.localEnergy).toBe(0);expect(e.powerLimitedMinutes).toBe(0);expect(e.energyLimitedMinutes).toBe(240);expect(e.endStored).toBe(50);
  });
  it('identifies only nondominated sampled equipment pairs that meet the target',()=>{
    const r=study();expect(r.frontier).toEqual([find(r,55,10).index]);
    for(const e of r.samples){const dominated=r.samples.some(o=>o.meetsTarget&&o.capacity<=e.capacity&&o.power<=e.power&&(o.capacity<e.capacity||o.power<e.power));expect(r.frontier.includes(e.index)).toBe(e.meetsTarget&&!dominated);}
  });
  it('evaluates coverage targets against local demand with no fabricated zero-demand successes',()=>{
    const r=study({...system,demand:0});expect(r.baseline.coverage).toBeNull();expect(r.passing).toBe(0);expect(r.frontier).toEqual([]);
    for(const e of r.samples){expect(e.coverage).toBeNull();expect(e.meetsTarget).toBe(false);expect(e.firstGap).toBeNull();}
  });
  it('detects small positive demand and distinguishes a zero target',()=>{
    const r=study({...system,demand:1e-10,battery:{...system.battery,initial:0}});expect(r.passing).toBe(0);
    for(const e of r.samples){expect(e.coverage).toBe(0);expect(e.firstGap).toBe(0);}
    const zero=study({...system,battery:{...system.battery,initial:0}},{...config,target:0});expect(zero.passing).toBe(25);expect(zero.frontier).toEqual([0]);
  });
  it('does not mistake a tiny positive target for a zero target',()=>{
    const r=study({...system,battery:{...system.battery,initial:0}},{...config,target:1e-8});expect(r.passing).toBe(0);
  });
  it('retains reserve behavior when more capacity protects more of the same initial energy',()=>{
    const r=study({...system,reserve:20}),smaller=find(r,55,20),larger=find(r,100,20);
    expect(smaller.initialStored).toBe(larger.initialStored);expect(smaller.localEnergy).toBeCloseTo(39);expect(larger.localEnergy).toBeCloseTo(30);
    expect(smaller.coverage).toBeGreaterThan(larger.coverage);
  });
  it('normalizes replay equipment before preserving the starting energy',()=>{
    const s=model.designCase(system,undefined,0,Infinity),r=model.simulate(s);
    expect(s.battery.capacity).toBe(10);expect(r.initialStored).toBe(10);expect(Number.isFinite(r.power)).toBe(true);
  });
  it('scales bank capacity, power, and initial energy with the fixed unit count',()=>{
    const r=study({...system,batteryUnits:3});expect(r.baseline.initialStored).toBe(150);
    for(const e of r.samples){expect(e.capacity).toBe(e.unitCapacity*3);expect(e.power).toBe(e.unitPower*3);expect(e.initialStored).toBeCloseTo(Math.min(e.capacity,150));}
  });
  it('returns an empty comparison for an absent battery while retaining the baseline',()=>{
    const r=study({...system,batteryUnits:0});expect(r.samples).toEqual([]);expect(r.frontier).toEqual([]);expect(r.baseline.capacity).toBe(0);expect(r.baseline.totals.unserved).toBeCloseTo(40);
  });
  it('bounds malformed input, orders axes, and deduplicates collapsed ranges',()=>{
    expect(model.designConfig({}, {capacityMin:10000,capacityMax:-10,powerMin:Infinity,powerMax:-1,count:99,target:Infinity})).toMatchObject({capacityMin:10,capacityMax:500,powerMin:0,powerMax:0,count:5,target:90,initialMode:'energy'});
    const r=study(system,{...config,capacityMin:100,capacityMax:100,powerMin:20,powerMax:20,count:9});expect(r.samples).toHaveLength(1);expect(r.frontier).toEqual([0]);
    expect(study(system,{...config,count:9}).samples).toHaveLength(81);
  });
  it('reconstructs candidates exactly for 3D replay without retaining all minute rows',()=>{
    const r=study({...system,grid:'outage',outageStart:75,outageMinutes:60,policy:'release',reserve:30});
    for(const e of r.samples){const settings=model.designCase(r.settings,r.config,e.unitCapacity,e.unitPower),run=model.simulate(settings);expect(run.totals).toEqual(e.totals);expect(run.initialStored).toBe(e.initialStored);expect(run.endStored).toBe(e.endStored);expect(e.rows).toBeUndefined();expect(settings.outageStart).toBe(75);expect(settings.policy).toBe('release');}
  });
  it('captures and serializes normalized inputs without mutating the request',()=>{
    const request={settings:system,config},before=JSON.stringify(request),a=model.designStudy(request);expect(JSON.stringify(request)).toBe(before);expect(model.designStudy(JSON.parse(before))).toEqual(a);expect(a.microgridVersion).toBe(5);expect(a.version).toBe(1);
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' preserves energy conservation and reconstructs every sampled case',()=>{
      const r=study({source,profileId:energy.programs[source][0].id,batteryUnits:2,battery:{initial:20},reserve:30,policy:'release',grid:'outage',loadId:'pulse'}, {...config,capacityMax:50,powerMax:30});
      expect(r.samples).toHaveLength(25);
      for(const e of r.samples){const t=e.totals;expect(e.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-e.endStored).toBeCloseTo(0,5);expect(e.localEnergy+t.grid+t.unserved).toBeCloseTo(e.demand,5);expect(e.coverage).toBeGreaterThanOrEqual(0);expect(e.coverage).toBeLessThanOrEqual(100);expect(e.endStored).toBeGreaterThanOrEqual(0);expect(e.endStored).toBeLessThanOrEqual(e.capacity);}
    });
  }
  it('renders captured conditions, comparisons, and notes alongside the existing studies',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...system,demand:20,designStudy:{request:{settings:system,config},note:'More power helps only when energy is available.'}}}}});
    for(const text of ['Battery design bench','Battery capacity and power comparison','Compact options','Local demand coverage target','Restore design baseline','These battery designs retain','More power helps only','Outage timing study'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
