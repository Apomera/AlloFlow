
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const reserveCase={source:'solarPv',sourceSettings:{irradiance:0},demand:10,grid:'outage',outageStart:60,outageMinutes:60,battery:{capacity:100,power:50,initial:100,roundtrip:100},reserve:90};

describe('Battery strategies',()=>{
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' conserves energy across all strategies and grid states',()=>{
      for(const policy of ['fixed','release','backup'])for(const grid of ['island','connected','outage']){
        const r=model.simulate({source,profileId:energy.programs[source][0].id,policy,grid,battery:{initial:50},batteryUnits:2,reserve:35,loadId:'pulse'});
        let error=0;
        for(const row of r.rows){
          error=Math.max(error,Math.abs(row.generation-row.direct-row.charge-row.curtailed),Math.abs(row.demand-row.direct-row.discharge-row.grid-row.unserved),Math.abs(r.initialStored+row.energy.charge-row.energy.discharge-row.energy.loss-row.stored));
          expect(row.charge*row.discharge).toBe(0);
          expect(row.reserve).toBeGreaterThanOrEqual(0);expect(row.reserve).toBeLessThanOrEqual(r.capacity);
          if(policy==='backup'&&row.gridAvailable)expect(row.discharge).toBe(0);
          if(policy!=='fixed'&&!row.gridAvailable)expect(row.reserve).toBe(0);
        }
        expect(error).toBeLessThan(1e-6);
        const t=r.totals;expect(r.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-r.endStored).toBeCloseTo(0,5);
      }
    });
  }
  it('preserves fixed-reserve behavior for legacy and unknown policies',()=>{
    const legacy=model.simulate(reserveCase);
    expect(legacy.settings.policy).toBe('fixed');expect(legacy.totals.unserved).toBeCloseTo(10,8);
    expect(model.simulate({...reserveCase,policy:'removed'})).toEqual(legacy);
  });
  it('releases and restores the reserve exactly at the outage boundaries without creating energy',()=>{
    const r=model.simulate({...reserveCase,policy:'release'});
    expect(r.rows[59].reserve).toBe(90);expect(r.rows[60].reserve).toBe(0);
    expect(r.rows[119].reserve).toBe(0);expect(r.rows[120].reserve).toBe(90);
    expect(r.rows[60].stored).toBeCloseTo(90,7);expect(r.rows[120].stored).toBeCloseTo(80,7);
    expect(r.totals.unserved).toBe(0);expect(r.endStored).toBeCloseTo(80,7);
    expect(r.rows[120].discharge).toBe(0);expect(r.rows[120].grid).toBe(10);
  });
  it('holds battery energy for outages while using grid imports beforehand',()=>{
    const r=model.simulate({...reserveCase,policy:'backup'});
    expect(r.rows[60].stored).toBe(100);expect(r.rows[60].energy.grid).toBeCloseTo(10,8);
    expect(r.totals.unserved).toBe(0);expect(r.endStored).toBeCloseTo(90,7);
    expect(r.totals.grid).toBeCloseTo(30,8);expect(r.rows[0].batteryRun.status).toBe('Saving for outage');
  });
  it('does not refill an empty backup battery from the grid',()=>{
    const r=model.simulate({...reserveCase,policy:'backup',battery:{initial:0}});
    expect(r.totals.charge).toBe(0);expect(r.totals.discharge).toBe(0);expect(r.totals.unserved).toBeCloseTo(10,8);
  });
  it('uses reserve-release strategies while islanded, and keeps both strategies identical without an outage',()=>{
    for(const policy of ['release','backup'])expect(model.simulate({...reserveCase,grid:'island',policy}).totals.discharge).toBeCloseTo(40,7);
    const a=model.simulate({...reserveCase,grid:'connected',policy:'fixed'}),b=model.simulate({...reserveCase,grid:'connected',policy:'release'});
    expect(a.totals).toEqual(b.totals);
    const bankless=model.policies.map(p=>model.simulate({...reserveCase,batteryUnits:0,policy:p.id}).totals);
    expect(bankless[0]).toEqual(bankless[1]);expect(bankless[1]).toEqual(bankless[2]);
  });
});

describe('Outage timing studies',()=>{
  it('evaluates all strategies at unique bounded start times, including both feasible endpoints',()=>{
    const r=model.outageStudy({settings:reserveCase,config:{minutes:60,count:5}});
    expect(r.samples.map(s=>s.start)).toEqual([0,45,90,135,180]);
    expect(r.samples.at(-1).end).toBe(240);expect(r.samples.every(s=>s.strategies.length===3)).toBe(true);
    const short=model.outageStudy({settings:reserveCase,config:{minutes:238,count:25}});
    expect(short.samples.map(s=>s.start)).toEqual([0,1,2]);
    const full=model.outageStudy({settings:reserveCase,config:{minutes:240,count:25}});
    expect(full.samples).toHaveLength(1);expect(full.samples[0].end).toBe(240);
  });
  it('replays battery history from minute zero instead of resetting charge at the outage start',()=>{
    const r=model.outageStudy({settings:reserveCase,config:{minutes:60,count:5}});
    const late=r.samples[2].strategies;
    expect(late.find(p=>p.policy==='fixed').storedAtStart).toBeCloseTo(90,7);
    expect(late.find(p=>p.policy==='release').storedAtStart).toBeCloseTo(90,7);
    expect(late.find(p=>p.policy==='backup').storedAtStart).toBe(100);
    expect(r.strategies.find(p=>p.policy==='fixed').covered).toBe(1);
    expect(r.strategies.find(p=>p.policy==='release').covered).toBe(5);
    expect(r.strategies.find(p=>p.policy==='backup').covered).toBe(5);
  });
  it('matches direct simulation and counts only the outage window',()=>{
    const r=model.outageStudy({settings:{...reserveCase,batteryUnits:0},config:{minutes:60,count:5}});
    for(const sample of r.samples)for(const entry of sample.strategies){
      const full=model.simulate({...reserveCase,batteryUnits:0,grid:'outage',outageStart:sample.start,outageMinutes:60,policy:entry.policy});
      expect(entry.demand).toBeCloseTo(10,8);expect(entry.unserved).toBeCloseTo(10,8);expect(entry.coverage).toBe(0);
      expect(entry.firstGap).toBe(sample.start);expect(entry.gapMinutes).toBe(60);
      expect(entry.systemTotals).toEqual(full.totals);
      expect(full.servedPercent).toBeCloseTo(75,8);
    }
  });
  it('summarizes the largest unmet energy and preserves its inspectable sample',()=>{
    const r=model.outageStudy({settings:reserveCase,config:{minutes:60,count:13}});
    for(const policy of r.strategies){
      const all=r.samples.map(s=>s.strategies.find(p=>p.policy===policy.policy));
      expect(policy.worstUnserved).toBe(Math.max(...all.map(p=>p.unserved)));
      expect(all[policy.worstIndex].unserved).toBe(policy.worstUnserved);
    }
  });
  it('does not report no-demand cases as successful coverage or fabricate percentages',()=>{
    const r=model.outageStudy({settings:{...reserveCase,demand:0},config:{count:5}});
    for(const s of r.strategies){expect(s.covered).toBe(0);expect(s.evaluated).toBe(0);expect(s.noDemand).toBe(5);}
    for(const sample of r.samples)for(const p of sample.strategies){expect(p.coverage).toBeNull();expect(p.noDemand).toBe(true);expect(p.fullyServed).toBe(false);}
  });
  it('detects tiny positive unmet demand without treating it as zero',()=>{
    const r=model.outageStudy({settings:{...reserveCase,demand:1e-10,batteryUnits:0},config:{count:5}});
    for(const sample of r.samples)for(const p of sample.strategies){expect(p.firstGap).toBe(sample.start);expect(p.coverage).toBe(0);expect(p.fullyServed).toBe(false);}
  });
  it('bounds malformed configuration and adapts to each source horizon',()=>{
    expect(model.outageConfig({},{})).toEqual({minutes:60,count:13});
    expect(model.outageConfig({profileId:'clouds'},{minutes:99999,count:Infinity})).toEqual({minutes:120,count:13});
    expect(model.outageConfig({profileId:'daylight'},{minutes:-5,count:25})).toEqual({minutes:1,count:25});
    expect(model.outageStudy({settings:{profileId:'daylight'},config:{minutes:720,count:25}}).samples).toHaveLength(1);
  });
  it('ignores the live grid policy and outage when detecting changed study conditions',()=>{
    const a=model.outageSignature(reserveCase);
    expect(model.outageSignature({...reserveCase,grid:'island',policy:'backup',outageStart:5,outageMinutes:10})).toBe(a);
    expect(model.outageSignature({...reserveCase,demand:20})).not.toBe(a);
    expect(model.outageSignature({...reserveCase,reserve:50})).not.toBe(a);
  });
  it('preserves captured conditions without mutating inputs and serializes reproducibly',()=>{
    const request={settings:reserveCase,config:{minutes:60,count:5}},before=JSON.stringify(request),a=model.outageStudy(request);
    expect(JSON.stringify(request)).toBe(before);expect(model.outageStudy(JSON.parse(before))).toEqual(a);
    expect(a.microgridVersion).toBe(5);
  });
  it('renders a recorded study with results, strategy controls, context warning, and observation',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...reserveCase,demand:20,outageStudy:{request:{settings:reserveCase,config:{minutes:60,count:5}},note:'Backup preserves charge for later outages.'}}}}});
    for(const text of ['Battery strategy','Outage timing study','Release during outages','Save for outages','Outage strategy comparison','Restore recorded system','System inputs changed','Backup preserves charge for later outages.','Export outage study CSV'])expect(html).toContain(text);
    expect(html).not.toContain('failed to render');expect(html).not.toContain('NaN');
  });
});
