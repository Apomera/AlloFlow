import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const pv={irradiance:1000,area:20,efficiency:20,incidence:0};
const wind={radius:10,speed:8,cp:40,rating:500};
const system={source:'solarPv',sourceSettings:pv,profileId:'steady',demand:6,batteryUnits:0,grid:'island',companion:{enabled:true,source:'solarPv',sourceSettings:{...pv,area:10},sourceUnits:2,profileId:'steady'}};
const sourceIds=['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass'];

describe('Two-source microgrid',()=>{
  it('adds known PV outputs before balancing demand and surplus',()=>{
    const r=model.simulate(system),t=r.totals;expect(r.version).toBe(5);expect(model.version).toBe(5);
    expect(r.rows[0].primaryGeneration).toBeCloseTo(3.84,9);expect(r.rows[0].companionGeneration).toBeCloseTo(3.84,9);expect(r.rows[0].generation).toBeCloseTo(7.68,9);
    expect(t.primaryGeneration).toBeCloseTo(15.36,8);expect(t.companionGeneration).toBeCloseTo(15.36,8);expect(t.generation).toBeCloseTo(30.72,8);
    expect(t.direct).toBeCloseTo(24,8);expect(t.unserved).toBe(0);expect(t.curtailed).toBeCloseTo(6.72,8);
    const alone=model.simulate({...system,companion:{...system.companion,enabled:false}});expect(alone.totals.unserved).toBeCloseTo(8.64,8);
  });
  it('charges one shared battery only from the combined surplus',()=>{
    const r=model.simulate({...system,batteryUnits:1,battery:{capacity:100,power:50,initial:0,roundtrip:100}});
    expect(r.totals.charge).toBeCloseTo(6.72,8);expect(r.endStored).toBeCloseTo(6.72,8);expect(r.totals.curtailed).toBe(0);expect(r.totals.discharge).toBe(0);
  });
  it('preserves legacy single-source balances when the second source is missing or disabled',()=>{
    const a=model.simulate({source:'solarPv',sourceSettings:pv,demand:6,batteryUnits:0}),b=model.simulate({...system,companion:{enabled:false,source:'wind',sourceUnits:50,sourceSettings:wind}});
    expect(a.totals).toEqual(b.totals);expect(a.totals.generation).toBeCloseTo(15.36,8);expect(a.settings.companion.enabled).toBe(false);
    expect(a.rows.every(row=>row.companionRun===null&&row.companionGeneration===0)).toBe(true);
  });
  it('keeps the second resource on its native minute scale with a delayed start and endpoint holds',()=>{
    const r=model.simulate({...system,profileId:'daylight',companion:{enabled:true,source:'wind',sourceSettings:wind,profileId:'lull',offset:30}});
    expect(r.duration).toBe(720);expect(r.rows[29].companionTiming).toBe('before');expect(r.rows[29].companionProfileMinute).toBe(0);
    expect(r.rows[30].companionTiming).toBe('active');expect(r.rows[70].companionProfileMinute).toBe(40);expect(r.rows[70].companionGeneration).toBe(0);
    expect(r.rows[150].companionProfileMinute).toBe(120);expect(r.rows[151].companionTiming).toBe('after');expect(r.rows[600].companionRun.settings.speed).toBe(8);
    expect(r.rows[600].companionProfileMinute).toBe(120);expect(r.rows[600].companionGeneration).toBeCloseTo(r.rows[0].companionGeneration,9);
  });
  it('supports an earlier start without looping or stretching the second profile',()=>{
    const r=model.simulate({...system,companion:{enabled:true,source:'wind',sourceSettings:wind,profileId:'lull',offset:-40}});
    expect(r.rows[0].companionProfileMinute).toBe(40);expect(r.rows[0].companionGeneration).toBe(0);expect(r.rows[80].companionProfileMinute).toBe(120);expect(r.rows[81].companionTiming).toBe('after');
    expect(r.rows[200].companionGeneration).toBeCloseTo(r.rows[81].companionGeneration,9);
  });
  it('shifts a complete resource lull without changing its energy while changing unmet demand',()=>{
    const setup={...system,profileId:'daylight',demand:2,companion:{enabled:true,source:'wind',sourceSettings:wind,profileId:'lull',offset:0}};
    const a=model.simulate(setup),b=model.simulate({...setup,companion:{...setup.companion,offset:300}});
    expect(a.totals.companionGeneration).toBeCloseTo(b.totals.companionGeneration,8);expect(b.totals.unserved).toBeLessThan(a.totals.unserved);
  });
  it('truncates a longer second profile at the primary horizon and adds no endpoint energy',()=>{
    const r=model.simulate({...system,profileId:'clouds',companion:{enabled:true,source:'tidal',profileId:'reversal',sourceSettings:{speed:2},sourceUnits:1}});
    expect(r.duration).toBe(120);expect(r.rows[60].companionProfileMinute).toBe(60);expect(r.rows[60].companionRun.settings.speed).toBeCloseTo(2/3,9);
    const end=r.rows.at(-1);expect(end.companionProfileMinute).toBe(120);
    for(const k of ['primaryGeneration','companionGeneration','generation','charge','discharge','grid','unserved'])expect(end[k]).toBe(0);
    for(const run of [end.sourceRun,end.companionRun]){expect(run.power).toBe(0);expect(run.available).toBe(0);expect(run.loss).toBe(0);expect(run.stages.every(s=>s.value===0)).toBe(true);}
    expect(end.energy.companionGeneration).toBe(r.totals.companionGeneration);
  });
  it('leaves steady resources unchanged by an offset and scales installed units exactly',()=>{
    const a=model.simulate(system),b=model.simulate({...system,companion:{...system.companion,offset:150,sourceUnits:6}});
    expect(b.totals.companionGeneration/a.totals.companionGeneration).toBeCloseTo(3,9);expect(b.rows[60].companionProfileMinute).toBeNull();expect(b.rows[60].companionTiming).toBe('steady');
  });
  it('keeps a zero-unit mechanism preview out of the energy balance',()=>{
    const r=model.simulate({...system,companion:{...system.companion,sourceUnits:0}});
    expect(r.rows[0].companionRun.power).toBeGreaterThan(0);expect(r.rows[0].companionGeneration).toBe(0);expect(r.totals.companionGeneration).toBe(0);expect(r.totals.generation).toBeCloseTo(15.36,8);
  });
  it('clamps each source resource independently and exposes protective shutdowns',()=>{
    const r=model.simulate({...system,profileId:'clouds',companion:{enabled:true,source:'wind',sourceSettings:{...wind,speed:20},profileId:'gust'}});
    expect(r.rows[50].companionClipped).toBe(true);expect(r.rows[50].primaryClipped).toBe(false);expect(r.rows[50].companionRun.status).toBe('Protective shutdown');expect(r.rows[50].companionGeneration).toBe(0);
  });
  it('normalizes malformed companion controls and clamps offsets when the horizon changes',()=>{
    const s=model.settings({...system,profileId:'clouds',companion:{enabled:'true',source:'storage',sourceUnits:999,offset:999,profileId:'missing',sourceSettings:{speed:Infinity}}});
    expect(s.companion.enabled).toBe(false);expect(s.companion.source).toBe('wind');expect(s.companion.sourceUnits).toBe(50);expect(s.companion.offset).toBe(120);expect(s.companion.profileId).toBe('steady');expect(Number.isFinite(s.companion.sourceSettings.speed)).toBe(true);
    expect(model.settings({...system,companion:{offset:-999,sourceUnits:-1}}).companion.offset).toBe(-240);
    expect(model.settings({...system,companion:null}).companion.enabled).toBe(false);
  });
  it('retains the no-battery comparison and no-demand semantics with mixed generation',()=>{
    const r=model.simulate({...system,demand:0});expect(r.servedPercent).toBeNull();expect(r.totals.curtailed).toBeCloseTo(r.totals.generation,8);
    for(const k of ['grid','unserved','curtailed'])expect(r.withoutBattery[k]).toBeCloseTo(r.totals[k],8);
  });
  for(const companion of sourceIds){
    it(companion+' combines with every primary technology while conserving power and energy',()=>{
      for(const [index,source] of sourceIds.entries()){
        const r=model.simulate({source,profileId:energy.programs[source][0].id,companion:{enabled:true,source:companion,profileId:energy.programs[companion][0].id,offset:17,sourceUnits:2},policy:['fixed','release','backup'][index%3],grid:'outage',batteryUnits:2,battery:{initial:35},reserve:20,loadId:'pulse'});
        let error=0;for(const row of r.rows){error=Math.max(error,Math.abs(row.primaryGeneration+row.companionGeneration-row.generation),Math.abs(row.generation-row.direct-row.charge-row.curtailed),Math.abs(row.demand-row.direct-row.discharge-row.grid-row.unserved),Math.abs(r.initialStored+row.energy.charge-row.energy.discharge-row.energy.loss-row.stored));}
        expect(error).toBeLessThan(1e-6);const t=r.totals;expect(t.generation).toBeCloseTo(t.primaryGeneration+t.companionGeneration,5);expect(r.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-r.endStored).toBeCloseTo(0,5);
      }
    });
  }
  it('captures both generators and their timing in outage studies and restores exact cases',()=>{
    const setup={...system,companion:{enabled:true,source:'wind',sourceSettings:wind,profileId:'lull',offset:30},batteryUnits:1};
    const study=model.outageStudy({settings:setup,config:{minutes:60,count:5}});expect(study.microgridVersion).toBe(5);expect(study.settings.companion.offset).toBe(30);
    for(const sample of study.samples)for(const entry of sample.strategies){const r=model.simulate({...study.settings,grid:'outage',outageStart:sample.start,outageMinutes:60,policy:entry.policy});expect(entry.systemTotals).toEqual(r.totals);}
    expect(model.outageSignature({...setup,companion:{...setup.companion,offset:31}})).not.toBe(model.outageSignature(setup));
  });
  it('preserves second-source energy and inputs in every battery design replay',()=>{
    const study=model.designStudy({settings:{...system,batteryUnits:1,companion:{enabled:true,source:'wind',sourceSettings:wind,profileId:'lull',offset:30}},config:{capacityMin:10,capacityMax:50,powerMin:0,powerMax:10,count:5}});
    expect(study.microgridVersion).toBe(5);for(const e of study.samples){const s=model.designCase(study.settings,study.config,e.unitCapacity,e.unitPower);expect(s.companion).toEqual(study.settings.companion);const r=model.simulate(s);expect(r.totals).toEqual(e.totals);expect(e.totals.companionGeneration).toBe(study.baseline.totals.companionGeneration);}
  });
  it('preserves normalized hybrid state across serialization without mutating the input',()=>{
    const before=JSON.stringify(system),a=model.simulate(system);expect(JSON.stringify(system)).toBe(before);expect(model.simulate(JSON.parse(before))).toEqual(a);
  });
  it('renders independent controls, source totals, a matched baseline, and captured companion conditions',()=>{
    const saved={...system,batteryUnits:1,designStudy:{request:{settings:{...system,batteryUnits:1},config:{count:5}}},outageStudy:{request:{settings:system,config:{count:5}}},scene:'companion',chart:'sources'};
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:saved}}});
    for(const text of ['Second generation technology','Second source in 3D','Generation mix chart','Primary alone','Combined source comparison','Recorded second source','Second generation kW','Solar + wind'])expect(html).toContain(text);
    expect(html).not.toContain('failed to render');expect(html).not.toContain('NaN');
  });
});
