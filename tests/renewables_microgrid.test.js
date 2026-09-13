
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const pv={source:'solarPv',sourceSettings:{irradiance:1000,area:20,efficiency:20,incidence:0}};

describe('Storage and demand energy balance',()=>{
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' conserves power and energy in every mode and source scenario',()=>{
      for(const profileId of ['steady',...energy.programs[source].map(p=>p.id)])for(const grid of ['island','connected','outage']){
        const r=model.simulate({source,profileId,grid,battery:{initial:50},reserve:20});
        let powerError=0,storedError=0;
        for(const row of r.rows){
          powerError=Math.max(powerError,Math.abs(row.generation-row.direct-row.charge-row.curtailed),Math.abs(row.demand-row.direct-row.discharge-row.grid-row.unserved));
          storedError=Math.max(storedError,Math.abs(r.initialStored+row.energy.charge-row.energy.discharge-row.energy.loss-row.stored));
          expect(row.charge*row.discharge).toBe(0);
        }
        expect(powerError).toBeLessThan(1e-7);expect(storedError).toBeLessThan(1e-6);
        const t=r.totals;
        expect(r.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-r.endStored).toBeCloseTo(0,5);
        expect(t.generation-t.direct-t.charge-t.curtailed).toBeCloseTo(0,5);
        expect(r.avoidedUnserved).toBeGreaterThanOrEqual(-1e-7);expect(r.avoidedGrid).toBeGreaterThanOrEqual(-1e-7);
        expect(r.servedPercent).toBeGreaterThanOrEqual(0);expect(r.servedPercent).toBeLessThanOrEqual(100);
      }
    });
  }
  it('integrates a known steady PV surplus without grid charging or extra endpoint energy',()=>{
    const r=model.simulate({...pv,demand:2,battery:{roundtrip:100}});
    expect(r.duration).toBe(240);expect(r.rows).toHaveLength(241);
    expect(r.totals.generation).toBeCloseTo(15.36,8);
    expect(r.totals.demand).toBeCloseTo(8,8);expect(r.totals.charge).toBeCloseTo(7.36,8);
    expect(r.endStored).toBeCloseTo(7.36,8);expect(r.avoidedCurtailment).toBeCloseTo(7.36,8);
    for(const k of ['generation','demand','direct','charge','discharge','grid','unserved','curtailed'])expect(r.rows.at(-1)[k]).toBe(0);
  });
  it('scales identical generation units without changing the resource physics',()=>{
    const a=model.simulate({...pv,sourceUnits:1}),b=model.simulate({...pv,sourceUnits:7,demand:a.settings.demand});
    expect(b.totals.generation/a.totals.generation).toBeCloseTo(7,8);
    expect(b.rows[0].sourceRun).toEqual(a.rows[0].sourceRun);
  });
  it('removing the battery exactly matches the no-battery comparison',()=>{
    const r=model.simulate({...pv,profileId:'clouds',batteryUnits:0,demand:3,grid:'outage'});
    for(const k of ['grid','unserved','curtailed'])expect(r.totals[k]).toBeCloseTo(r.withoutBattery[k],8);
    expect(r.initialStored).toBe(0);expect(r.endStored).toBe(0);expect(r.power).toBe(0);
    expect(r.rows.every(row=>row.batteryRun.extra.soc===0&&row.stored===0)).toBe(true);
  });
  it('keeps outage intervals half-open and restores the grid at the correct minute',()=>{
    const r=model.simulate({sourceSettings:{irradiance:0},demand:10,batteryUnits:0,grid:'outage',outageStart:60,outageMinutes:60});
    expect(r.rows[59].grid).toBe(10);expect(r.rows[60].grid).toBe(0);expect(r.rows[119].gridAvailable).toBe(false);expect(r.rows[120].grid).toBe(10);
    expect(r.firstUnserved).toBe(60);expect(r.unservedMinutes).toBe(60);
    expect(r.totals.unserved).toBeCloseTo(10,8);expect(r.totals.grid).toBeCloseTo(30,8);
  });
  it('does not charge an empty battery from grid imports',()=>{
    const r=model.simulate({sourceSettings:{irradiance:0},demand:10,grid:'connected',battery:{initial:0}});
    expect(r.totals.grid).toBeCloseTo(40,8);expect(r.totals.charge).toBe(0);expect(r.totals.discharge).toBe(0);expect(r.endStored).toBe(0);
  });
  it('limits discharge power and uses the grid only for the remaining deficit',()=>{
    const r=model.simulate({sourceSettings:{irradiance:0},demand:10,grid:'connected',battery:{power:5,initial:100,roundtrip:100}});
    expect(r.rows[0].discharge).toBe(5);expect(r.rows[0].grid).toBe(5);
    expect(r.totals.discharge).toBeCloseTo(20,8);expect(r.totals.grid).toBeCloseTo(20,8);
    expect(r.avoidedGrid).toBeCloseTo(20,8);
  });
  it('holds the reserve floor during outages and does not create reserve energy',()=>{
    const r=model.simulate({sourceSettings:{irradiance:0},demand:10,grid:'island',battery:{initial:100,roundtrip:100},reserve:90});
    expect(r.endStored).toBeCloseTo(90,8);expect(r.totals.discharge).toBeCloseTo(10,8);expect(r.totals.unserved).toBeCloseTo(30,8);
    const below=model.simulate({sourceSettings:{irradiance:0},demand:10,battery:{initial:10},reserve:90});
    expect(below.totals.discharge).toBe(0);expect(below.endStored).toBe(10);
  });
  it('handles partial-minute filling and accounts for charging conversion loss',()=>{
    const r=model.simulate({...pv,demand:0,battery:{capacity:10,initial:99,power:200,roundtrip:100}});
    expect(r.rows[0].charge).toBeCloseTo(3.84,8);
    expect(r.rows[1].charge).toBeCloseTo(2.16,8);expect(r.rows[2].charge).toBe(0);
    expect(r.totals.charge).toBeCloseTo(.1,8);expect(r.endStored).toBeCloseTo(10,8);
    const lossy=model.simulate({...pv,demand:2,battery:{roundtrip:64}});
    expect(lossy.endStored).toBeCloseTo(7.36*.8,8);expect(lossy.totals.loss).toBeCloseTo(7.36*.2,8);
  });
  it('handles partial-minute depletion without exceeding power or usable energy',()=>{
    const r=model.simulate({sourceSettings:{irradiance:0},demand:200,battery:{capacity:10,initial:100,power:200,roundtrip:81}});
    expect(r.rows[0].discharge).toBe(200);expect(r.rows[1].discharge).toBe(200);
    expect(r.rows[2].discharge).toBeCloseTo(140,7);expect(r.rows[3].discharge).toBe(0);
    expect(r.totals.discharge).toBeCloseTo(9,8);expect(r.endStored).toBeCloseTo(0,8);expect(r.totals.loss).toBeCloseTo(1,8);
  });
  it('scales bank energy and power separately from generation and demand',()=>{
    const r=model.simulate({...pv,batteryUnits:4,battery:{capacity:100,power:50,initial:25},demand:5});
    expect(r.capacity).toBe(400);expect(r.power).toBe(200);expect(r.initialStored).toBe(100);
    expect(r.rows[0].generation).toBeCloseTo(3.84,8);expect(r.rows[0].demand).toBe(5);
  });
  it('reports no demand without inventing a coverage percentage',()=>{
    const r=model.simulate({...pv,demand:0});
    expect(r.servedPercent).toBeNull();expect(r.firstUnserved).toBeNull();expect(r.totals.unserved).toBe(0);
  });
  it('prescribes demand patterns over the selected sequence duration',()=>{
    const r=model.simulate({...pv,demand:10,loadId:'pulse'});
    expect(r.rows[0].demand).toBe(7);expect(r.rows[96].demand).toBe(20);expect(r.rows[156].demand).toBe(7);
    expect(model.simulate({...pv,profileId:'daylight',loadId:'evening'}).duration).toBe(720);
  });
  it('bounds invalid input, rejects nonnumeric controls, and clamps outage duration after the start changes',()=>{
    const s=model.settings({source:'__proto__',sourceUnits:Infinity,batteryUnits:-1,profileId:'missing',outageStart:239,outageMinutes:NaN,reserve:500,demand:'10'});
    expect(s.source).toBe('solarPv');expect(s.sourceUnits).toBe(1);expect(s.batteryUnits).toBe(0);expect(s.reserve).toBe(90);
    expect(s.outageMinutes).toBe(1);expect(typeof s.demand).toBe('number');
    expect(model.settings({profileId:'clouds',outageStart:999,outageMinutes:999}).outageMinutes).toBe(1);
  });
  it('preserves all captured inputs across serialization without mutating workbench data',()=>{
    const input={...pv,battery:{initial:25},profileId:'clouds',grid:'outage',outageStart:20,outageMinutes:40};
    const saved=JSON.stringify(input),first=model.simulate(input);
    expect(JSON.stringify(input)).toBe(saved);expect(model.simulate(JSON.parse(saved))).toEqual(first);
  });
  it('renders the dedicated workspace with results, grid controls, and no-battery comparison',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...pv,grid:'outage',loadId:'pulse'}}}});
    for(const text of ['Storage &amp; demand lab','Generation technology','Demand pattern','Battery reserve','Where electricity goes','Without battery','With battery','Grid imports','Export energy system JSON','Read all minute-by-minute results'])expect(html).toContain(text);
    expect(html).not.toContain('failed to render');expect(html).not.toContain('NaN');
  });
});
