import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const flex={enabled:true,percent:50,fromStart:0,fromMinutes:60,toStart:120,toMinutes:30};
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:4,loadId:'flat',grid:'island',batteryUnits:0,flex};
const relative=(a,b)=>Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),Number.MIN_VALUE);

describe('Demand shifting',()=>{
  it('moves an exactly known energy quantity without deleting demand',()=>{
    const r=model.simulate(base),d=r.demandSchedule;expect(r.version).toBe(5);
    expect(d.baselineEnergy).toBeCloseTo(16,9);expect(d.scheduledEnergy).toBeCloseTo(16,9);expect(d.allocatedEnergy).toBe(2);expect(d.netShiftedEnergy).toBeCloseTo(2,9);expect(d.addedPower).toBe(4);
    expect(r.rows[0].demand).toBe(2);expect(r.rows[59].demand).toBe(2);expect(r.rows[60].demand).toBe(4);expect(r.rows[120].demand).toBe(8);expect(r.rows[149].demand).toBe(8);expect(r.rows[150].demand).toBe(4);
    expect(d.baselinePeak).toBe(4);expect(d.scheduledPeak).toBe(8);expect(d.largestIncrease).toBe(120);expect(r.totals.unserved).toBeCloseTo(16,9);
  });
  it('moves earlier as well as later and preserves the same energy',()=>{
    const r=model.simulate({...base,flex:{...flex,fromStart:120,toStart:0,toMinutes:60}});
    expect(r.rows[0].demand).toBe(6);expect(r.rows[120].demand).toBe(2);expect(r.totals.demand).toBeCloseTo(16,9);expect(r.demandSchedule.netShiftedEnergy).toBeCloseTo(2,9);
  });
  it('accounts for cancellation in overlapping source and receiving windows',()=>{
    const r=model.simulate({...base,flex:{...flex,toStart:30,toMinutes:60}}),d=r.demandSchedule;
    expect(d.allocatedEnergy).toBe(2);expect(d.netShiftedEnergy).toBeCloseTo(1,9);expect(d.overlapMinutes).toBe(30);
    expect(r.rows[0].demand).toBe(2);expect(r.rows[30].demand).toBe(4);expect(r.rows[60].demand).toBe(6);expect(r.totals.demand).toBeCloseTo(16,9);
  });
  it('leaves constant demand unchanged when the two windows are identical',()=>{
    const r=model.simulate({...base,flex:{...flex,toStart:0,toMinutes:60}});
    expect(r.demandSchedule.netShiftedEnergy).toBe(0);expect(r.demandSchedule.largestIncrease).toBeNull();expect(r.rows.slice(0,-1).every(row=>row.demand===4)).toBe(true);
  });
  it('can redistribute variable demand within one window while preserving energy',()=>{
    const r=model.simulate({...base,loadId:'pulse',flex:{enabled:true,percent:100,fromStart:0,fromMinutes:240,toStart:0,toMinutes:240}});
    expect(r.demandSchedule.netShiftedEnergy).toBeGreaterThan(0);expect(r.demandSchedule.scheduledPeak).toBeLessThan(r.demandSchedule.baselinePeak);
    expect(relative(r.demandSchedule.baselineEnergy,r.totals.demand)).toBeLessThan(1e-12);
    expect(Math.max(...r.rows.slice(0,-1).map(row=>row.demand))-Math.min(...r.rows.slice(0,-1).map(row=>row.demand))).toBeLessThan(1e-10);
  });
  it('takes a percentage of each original interval rather than substituting average demand',()=>{
    const r=model.simulate({...base,loadId:'pulse',flex:{...flex,fromStart:70,fromMinutes:50,toStart:160,toMinutes:40,percent:30}});
    for(const row of r.rows){expect(row.shiftedOut).toBeCloseTo(row.minute>=70&&row.minute<120?row.baselineDemand*.3:0,10);expect(row.demand).toBeCloseTo(row.baselineDemand-row.shiftedOut+row.shiftedIn,10);}
  });
  it('never allocates energy to the terminal boundary or outside the horizon',()=>{
    const r=model.simulate({...base,flex:{...flex,toStart:239,toMinutes:999}}),last=r.rows.at(-1);
    expect(r.settings.flex.toMinutes).toBe(1);expect(r.rows[239].demand).toBe(124);expect(r.rows).toHaveLength(241);
    for(const key of ['demand','baselineDemand','shiftedOut','shiftedIn'])expect(last[key]).toBe(0);
    expect(r.totals.demand).toBeCloseTo(16,9);expect(last.energy.demand).toBe(r.totals.demand);
  });
  it('keeps disabled and zero-percent schedules identical to legacy demand',()=>{
    const legacy=model.simulate({...base,flex:undefined}),off=model.simulate({...base,flex:{...flex,enabled:false}}),zero=model.simulate({...base,flex:{...flex,percent:0}});
    expect(legacy.settings.flex.enabled).toBe(false);expect(off.totals).toEqual(legacy.totals);expect(zero.totals).toEqual(legacy.totals);
    expect(off.demandSchedule.netShiftedEnergy).toBe(0);expect(zero.demandSchedule.allocatedEnergy).toBe(0);
  });
  it('handles no demand without inventing moved energy or coverage',()=>{
    const r=model.simulate({...base,demand:0});expect(r.totals.demand).toBe(0);expect(r.servedPercent).toBeNull();expect(r.demandSchedule.netShiftedEnergy).toBe(0);expect(r.demandSchedule.addedPower).toBe(0);expect(r.demandSchedule.largestIncrease).toBeNull();
  });
  it('preserves tiny and large positive loads through a one-minute receiving window',()=>{
    for(const demand of [1e-10,1000000]){const r=model.simulate({...base,demand,loadId:'pulse',flex:{...flex,percent:100,fromMinutes:120,toMinutes:1}});expect(relative(r.demandSchedule.baselineEnergy,r.totals.demand)).toBeLessThan(1e-12);expect(r.demandSchedule.netShiftedEnergy).toBeGreaterThan(0);expect(r.rows.every(row=>Number.isFinite(row.demand)&&row.demand>=0)).toBe(true);}
  });
  it('bounds malformed input and keeps both windows inside a changing horizon',()=>{
    const r=model.settings({...base,profileId:'clouds',flex:{enabled:'true',percent:999,fromStart:999,fromMinutes:Infinity,toStart:-1,toMinutes:0}});
    expect(r.flex).toEqual({enabled:false,percent:100,fromStart:119,fromMinutes:1,toStart:0,toMinutes:1});
    expect(model.demandShiftSettings(null,1)).toEqual({enabled:false,percent:50,fromStart:0,fromMinutes:1,toStart:0,toMinutes:1});
    expect(model.settings({...base,flex:{...flex,percent:NaN}}).flex.percent).toBe(50);
  });
  it('can avoid outage demand by scheduling it while the grid is available',()=>{
    const settings={...base,grid:'outage',outageStart:0,outageMinutes:60,flex:{...flex,percent:100,toMinutes:60}};
    const original=model.simulate({...settings,flex:{enabled:false}}),shifted=model.simulate(settings);
    expect(original.totals.unserved).toBeCloseTo(4,9);expect(shifted.totals.unserved).toBe(0);expect(shifted.totals.grid).toBeCloseTo(16,9);expect(shifted.totals.generation).toBe(0);
    const study=model.outageStudy({settings,config:{minutes:60,count:5}});for(const entry of study.samples[0].strategies){expect(entry.demand).toBe(0);expect(entry.noDemand).toBe(true);expect(entry.fullyServed).toBe(false);expect(entry.coverage).toBeNull();}
  });
  it('can worsen supply gaps by concentrating load into a high-power pulse',()=>{
    const settings={...base,sourceSettings:{irradiance:1000,area:20,efficiency:20,incidence:0},demand:3,flex:{...flex,percent:100,toMinutes:1}};
    const original=model.simulate({...settings,flex:{enabled:false}}),shifted=model.simulate(settings);
    expect(original.totals.unserved).toBe(0);expect(shifted.totals.unserved).toBeCloseTo((183-3.84)/60,8);expect(shifted.demandSchedule.scheduledPeak).toBe(183);expect(shifted.totals.demand).toBeCloseTo(original.totals.demand,8);
  });
  it('reduces supply gaps in the daylight starter without adding generation or a battery',()=>{
    const settings={source:'solarPv',profileId:'daylight',demand:2,loadId:'evening',batteryUnits:0,grid:'island',flex:{enabled:true,percent:75,fromStart:540,fromMinutes:180,toStart:240,toMinutes:180}};
    const original=model.simulate({...settings,flex:{enabled:false}}),shifted=model.simulate(settings);expect(shifted.totals.generation).toBe(original.totals.generation);expect(shifted.totals.demand).toBeCloseTo(original.totals.demand,8);expect(shifted.totals.unserved).toBeLessThan(original.totals.unserved);expect(shifted.totals.curtailed).toBeLessThan(original.totals.curtailed);
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' conserves demand and system energy across all strategies with two generators',()=>{
      for(const policy of ['fixed','release','backup']){
        const r=model.simulate({source,profileId:energy.programs[source][0].id,demand:5,loadId:'pulse',grid:'outage',policy,battery:{initial:50},reserve:30,companion:{enabled:true,source:'wind',profileId:'lull',offset:10},flex:{enabled:true,percent:63,fromStart:20,fromMinutes:40,toStart:40,toMinutes:20}});
        let error=0;for(const row of r.rows){error=Math.max(error,Math.abs(row.generation-row.direct-row.charge-row.curtailed),Math.abs(row.demand-row.direct-row.discharge-row.grid-row.unserved),Math.abs(row.baselineDemand-row.shiftedOut+row.shiftedIn-row.demand),Math.abs(r.initialStored+row.energy.charge-row.energy.discharge-row.energy.loss-row.stored));}
        expect(error).toBeLessThan(1e-6);expect(relative(r.totals.demand,r.demandSchedule.baselineEnergy)).toBeLessThan(1e-12);const t=r.totals;expect(r.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-r.endStored).toBeCloseTo(0,5);
      }
    });
  }
  it('keeps demand independent of battery designs, dispatch policies, and companion presence',()=>{
    const schedule=model.demandSchedule(base).rows.map(r=>r.demand);
    for(const policy of ['fixed','release','backup']){const r=model.simulate({...base,policy,companion:{enabled:true,source:'wind'},batteryUnits:5});expect(r.rows.map(row=>row.demand)).toEqual(schedule);}
  });
  it('captures and reconstructs the shifted demand in outage and battery-design studies',()=>{
    const settings={...base,batteryUnits:1},outages=model.outageStudy({settings,config:{minutes:60,count:5}}),design=model.designStudy({settings,config:{count:5}});
    expect(outages.microgridVersion).toBe(5);expect(design.settings.flex).toEqual(model.settings(settings).flex);
    for(const sample of outages.samples)for(const entry of sample.strategies){const r=model.simulate({...outages.settings,grid:'outage',outageStart:sample.start,outageMinutes:60,policy:entry.policy});expect(entry.systemTotals).toEqual(r.totals);}
    for(const entry of design.samples){const r=model.simulate(model.designCase(design.settings,design.config,entry.unitCapacity,entry.unitPower));expect(r.totals).toEqual(entry.totals);expect(r.settings.flex).toEqual(design.settings.flex);}
    expect(model.outageSignature({...settings,flex:{...flex,toStart:130}})).not.toBe(model.outageSignature(settings));
  });
  it('serializes the schedule and simulation without mutating captured settings',()=>{
    const before=JSON.stringify(base),a=model.simulate(base);expect(JSON.stringify(base)).toBe(before);expect(model.simulate(JSON.parse(before))).toEqual(a);expect(model.demandSchedule(JSON.parse(before))).toEqual(model.demandSchedule(base));
  });
  it('renders the bench, original-versus-shifted data, and recorded study conditions',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...base,batteryUnits:1,chart:'demand',flexNote:'A short receiving window raises demand.',designStudy:{request:{settings:{...base,batteryUnits:1},config:{count:5}}}}}}});
    for(const text of ['Demand shifting bench','Share of source-window demand','Original and shifted demand results','Original demand kW','Shifted in kW','Recorded demand shift','A short receiving window raises demand.','Demand timing chart'])expect(html).toContain(text);expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
