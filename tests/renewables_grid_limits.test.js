import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const limit={enabled:true,power:2};
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:4,loadId:'flat',grid:'connected',batteryUnits:0,gridLimit:limit};
const close=(a,b)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8);
describe('Grid connection capacity',()=>{
  it('preserves unlimited imports for legacy or disabled settings',()=>{
    const legacy=model.simulate({...base,gridLimit:undefined}),off=model.simulate({...base,gridLimit:{enabled:false,power:0}});
    expect(legacy.version).toBe(5);expect(legacy.settings.gridLimit).toEqual({enabled:false,power:5});expect(off.totals).toEqual(legacy.totals);
    close(legacy.totals.grid,16);expect(legacy.totals.unserved).toBe(0);expect(legacy.rows[0].gridCapacity).toBeNull();expect(legacy.rows[0].gridHeadroom).toBeNull();
  });
  it('caps every connected interval and accounts for the exact missing energy',()=>{
    const r=model.simulate(base);close(r.totals.grid,8);close(r.totals.unserved,8);close(r.totals.gridLimited,8);expect(r.totals.gridUnavailable).toBe(0);close(r.totals.gridRequested,16);
    expect(r.gridSummary).toEqual({peakImport:2,peakRequested:4,peakImportMinute:0,peakRequestedMinute:0,firstLimited:0,limitedMinutes:240});
    expect(r.rows[0].gridCapacity).toBe(2);expect(r.rows[0].gridHeadroom).toBe(0);expect(r.rows[0].gridLimited).toBe(2);
  });
  it('reports spare capacity and no limiting interval when the cap exceeds demand',()=>{
    const r=model.simulate({...base,gridLimit:{enabled:true,power:5}});
    close(r.totals.grid,16);expect(r.totals.unserved).toBe(0);expect(r.rows[0].gridHeadroom).toBe(1);expect(r.gridSummary.limitedMinutes).toBe(0);expect(r.gridSummary.firstLimited).toBeNull();
  });
  it('does not call a fully supplied interval a shortfall just because imports equal the cap',()=>{
    const r=model.simulate({...base,gridLimit:{enabled:true,power:4}});
    expect(r.rows[0].gridHeadroom).toBe(0);expect(r.rows[0].grid).toBe(4);expect(r.gridSummary.limitedMinutes).toBe(0);expect(r.totals.gridLimited).toBe(0);
  });
  it('accepts fractional connection ratings without rounding them to equipment steps',()=>{
    const r=model.simulate({...base,demand:3.5,gridLimit:{enabled:true,power:1.25}});
    close(r.totals.grid,5);close(r.totals.gridLimited,9);expect(r.settings.gridLimit.power).toBe(1.25);
  });
  it('separates outage shortfalls from cap shortfalls and requests no power while unavailable',()=>{
    const r=model.simulate({...base,grid:'outage',outageStart:60,outageMinutes:60});
    close(r.totals.grid,6);close(r.totals.gridLimited,6);close(r.totals.gridUnavailable,4);close(r.totals.unserved,10);close(r.totals.gridRequested,12);
    expect(r.gridSummary.limitedMinutes).toBe(180);
    for(const i of [60,119]){expect(r.rows[i].gridCapacity).toBe(0);expect(r.rows[i].gridRequested).toBe(0);expect(r.rows[i].gridLimited).toBe(0);expect(r.rows[i].gridUnavailable).toBe(4);}
    expect(r.rows[120].gridCapacity).toBe(2);
  });
  it('ignores the configured cap during islanded operation',()=>{
    const capped=model.simulate({...base,grid:'island'}),unlimited=model.simulate({...base,grid:'island',gridLimit:{enabled:false}});
    expect(capped.totals).toEqual(unlimited.totals);expect(capped.totals.grid).toBe(0);close(capped.totals.gridUnavailable,16);expect(capped.totals.gridLimited).toBe(0);expect(capped.gridSummary.peakRequestedMinute).toBeNull();
  });
  it('keeps a zero-capacity connection available for strategy decisions',()=>{
    const settings={...base,gridLimit:{enabled:true,power:0},batteryUnits:1,battery:{capacity:100,power:50,initial:100,roundtrip:100},policy:'backup'};
    const r=model.simulate(settings),outage=model.simulate({...settings,grid:'island'});
    expect(r.rows[0].gridAvailable).toBe(true);expect(r.totals.discharge).toBe(0);close(r.endStored,100);close(r.totals.gridLimited,16);expect(r.totals.gridUnavailable).toBe(0);
    expect(outage.totals.unserved).toBe(0);close(outage.totals.discharge,16);
  });
  it('still permits normal battery dispatch with a zero grid import cap',()=>{
    const r=model.simulate({...base,gridLimit:{enabled:true,power:0},batteryUnits:1,battery:{capacity:100,power:50,initial:100,roundtrip:100},policy:'fixed'});
    expect(r.totals.grid).toBe(0);expect(r.totals.unserved).toBe(0);close(r.totals.discharge,16);
  });
  it('bounds malformed connection inputs without enabling a cap accidentally',()=>{
    expect(model.gridLimitSettings()).toEqual({enabled:false,power:5});
    expect(model.gridLimitSettings({enabled:'true',power:-4})).toEqual({enabled:false,power:0});
    expect(model.gridLimitSettings({enabled:true,power:Infinity})).toEqual({enabled:true,power:5});
    expect(model.gridLimitSettings({enabled:true,power:NaN}).power).toBe(5);
    expect(model.gridLimitSettings({enabled:true,power:1e9}).power).toBe(1e6);
  });
  it('handles zero demand and gives the terminal endpoint zero power fields',()=>{
    const r=model.simulate({...base,demand:0});expect(r.servedPercent).toBeNull();expect(r.gridSummary.firstLimited).toBeNull();expect(r.rows[0].gridHeadroom).toBe(2);
    for(const k of ['grid','unserved','gridRequested','gridLimited','gridUnavailable','gridCapacity','gridHeadroom'])expect(r.rows.at(-1)[k]).toBe(0);
  });
  it('does not use unused grid capacity to charge an empty battery',()=>{
    const r=model.simulate({...base,gridLimit:{enabled:true,power:100},batteryUnits:1,battery:{initial:0}});
    close(r.totals.grid,16);expect(r.totals.charge).toBe(0);expect(r.endStored).toBe(0);
  });
  it('applies the same cap to the no-battery comparison',()=>{
    const r=model.simulate({...base,demand:8,batteryUnits:1,battery:{capacity:100,power:5,initial:100,roundtrip:100}});
    close(r.totals.grid,8);close(r.totals.unserved,4);close(r.totals.discharge,20);
    close(r.withoutBattery.grid,8);close(r.withoutBattery.unserved,24);close(r.avoidedUnserved,20);close(r.avoidedGrid,0);
  });
  it('treats the connection limit as a whole-system rating rather than a per-unit rating',()=>{
    const r=model.simulate({...base,demand:100,sourceUnits:50,batteryUnits:10,battery:{initial:0}});
    expect(r.rows[0].grid).toBe(2);close(r.totals.grid,8);
  });
  it('leaves generation and battery history identical in the unlimited replay',()=>{
    for(const policy of ['fixed','release','backup']){
      const settings={...base,sourceSettings:{irradiance:1000},profileId:'clouds',demand:3,grid:'outage',outageStart:40,outageMinutes:25,batteryUnits:1,battery:{capacity:10,power:5,initial:50,roundtrip:64},reserve:20,policy};
      const capped=model.simulate(settings),unlimited=model.simulate({...settings,gridLimit:{enabled:false}});
      for(const k of ['generation','demand','charge','discharge','loss'])expect(capped.totals[k]).toBe(unlimited.totals[k]);
      expect(capped.rows.map(r=>r.stored)).toEqual(unlimited.rows.map(r=>r.stored));close(capped.totals.unserved-unlimited.totals.unserved,unlimited.totals.grid-capped.totals.grid);
    }
  });
  it('shows a connection shortfall from compressed demand without changing total energy',()=>{
    const settings={...base,gridLimit:{enabled:true,power:4}},r=model.simulate({...settings,flex:{enabled:true,percent:50,fromStart:0,fromMinutes:60,toStart:120,toMinutes:30}});
    expect(model.simulate(settings).totals.unserved).toBe(0);close(r.totals.demand,16);close(r.totals.grid,14);close(r.totals.gridLimited,2);expect(r.gridSummary.firstLimited).toBe(120);
  });
  it('combines two generators before determining required imports',()=>{
    const pv={irradiance:1000,area:20,efficiency:20,incidence:0},r=model.simulate({...base,sourceSettings:pv,demand:10,gridLimit:{enabled:true,power:1},companion:{enabled:true,source:'solarPv',sourceSettings:pv}});
    close(r.rows[0].generation,7.68);close(r.rows[0].gridRequested,2.32);close(r.totals.grid,4);close(r.totals.gridLimited,5.28);
  });
  it('counts a genuine tiny shortfall consistently in both shortfall counters',()=>{
    const r=model.simulate({...base,demand:1e-12,gridLimit:{enabled:true,power:0}});
    expect(r.gridSummary.limitedMinutes).toBe(240);expect(r.unservedMinutes).toBe(240);expect(r.firstUnserved).toBe(0);close(r.totals.gridLimited,4e-12);
  });
  it('preserves the cap in outage and battery-design replays without changing local-coverage targets',()=>{
    const settings={...base,batteryUnits:1,battery:{capacity:10,power:5,initial:50,roundtrip:100}},outages=model.outageStudy({settings,config:{minutes:60,count:5}}),design=model.designStudy({settings,config:{count:5}});
    expect(outages.microgridVersion).toBe(5);expect(design.settings.gridLimit).toEqual(limit);
    for(const sample of outages.samples)for(const entry of sample.strategies){const r=model.simulate({...outages.settings,grid:'outage',outageStart:sample.start,outageMinutes:60,policy:entry.policy});expect(entry.systemTotals).toEqual(r.totals);}
    for(const entry of design.samples){const r=model.simulate(model.designCase(design.settings,design.config,entry.unitCapacity,entry.unitPower));expect(r.settings.gridLimit).toEqual(limit);expect(r.totals).toEqual(entry.totals);}
    const unlimited=model.designStudy({settings:{...settings,gridLimit:{enabled:false}},config:design.config});expect(design.samples.map(e=>e.coverage)).toEqual(unlimited.samples.map(e=>e.coverage));
    expect(model.outageSignature(settings)).not.toBe(model.outageSignature({...settings,gridLimit:{enabled:true,power:3}}));
  });
  it('reconciles grid-covered and unserved energy inside the same gap episode',()=>{
    const a=model.supplyGaps({...base,grid:'outage',outageStart:60,outageMinutes:60});
    expect(a.unservedEpisodes).toHaveLength(1);const e=a.unservedEpisodes[0];close(e.grid,6);close(e.unserved,10);close(e.gridLimited,6);close(e.gridUnavailable,4);close(e.localGap,e.grid+e.unserved);
    for(const r of a.rows)close(r.unserved,r.gridLimited+r.gridUnavailable);
    const minutes=model.supplyGapCsv(a,'local',true).split(/\r?\n/);expect(minutes[0]).toContain('grid_limit_unserved_kW');expect(minutes[0]).toContain('grid_unavailable_unserved_kW');
    const episode=model.supplyGapCsv(a,'unserved',false);expect(episode).toContain('grid_limit_unserved_kWh');
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' conserves energy with a limited connection across every grid state and strategy',()=>{
      for(const policy of ['fixed','release','backup'])for(const grid of ['island','connected','outage']){
        const r=model.simulate({source,profileId:energy.programs[source][0].id,demand:100,loadId:'pulse',grid,policy,gridLimit:{enabled:true,power:2},outageStart:20,outageMinutes:40,batteryUnits:2,battery:{capacity:10,power:5,initial:70,roundtrip:64},reserve:20,companion:{enabled:true,source:'wind',profileId:'lull',offset:15},flex:{enabled:true,percent:50,fromStart:10,fromMinutes:30,toStart:60,toMinutes:10}});
        const t=r.totals;close(t.generation+t.grid+r.initialStored,t.demand-t.unserved+t.curtailed+t.loss+r.endStored);close(t.unserved,t.gridLimited+t.gridUnavailable);close(t.gridRequested,t.grid+t.gridLimited);
        for(const row of r.rows){expect(row.grid).toBeLessThanOrEqual(2);close(row.demand,row.direct+row.discharge+row.grid+row.unserved);close(row.unserved,row.gridLimited+row.gridUnavailable);if(!row.gridAvailable)expect(row.grid).toBe(0);}
      }
    });
  }
  it('normalizes and serializes without mutating input or trusting old result totals',()=>{
    const before=JSON.stringify(base),r=model.simulate(base);expect(JSON.stringify(base)).toBe(before);expect(model.simulate(JSON.parse(JSON.stringify(r.settings)))).toEqual(r);
    expect(model.simulate({...r.settings,totals:{grid:99999}})).toEqual(r);
  });
  it('renders controls, the unlimited comparison, provenance, and the connection observation',()=>{
    const settings={...base,batteryUnits:1},html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...settings,gridReviewOpen:true,gridNote:'A small connection can leave demand unmet.',designStudy:{request:{settings,config:{count:5}}}}}}});
    for(const text of ['Limit grid imports','Maximum grid import kW','Grid connection review','Limited and unlimited grid comparison','Recorded grid import limit: 2','A small connection can leave demand unmet.','Grid import chart','Connection-limit unserved kW'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
