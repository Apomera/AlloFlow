
import fs from 'node:fs';
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});

describe('Individual energy mechanism calculations',()=>{
  it('includes every core renewable mechanism with separate wave and tidal physics',()=>{
    expect(model.specs.map(s=>s.id)).toEqual(['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage']);
  });
  for(const id of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(id+' remains finite and accounts for resource power at every control boundary',()=>{
      const spec=model.specs.find(s=>s.id===id);
      for(const point of ['defaults','minimum','maximum']){
        const input=Object.fromEntries(spec.controls.map(c=>[c[0],point==='minimum'?c[2]:point==='maximum'?c[3]:c[5]]));
        const r=model.simulate(id,input);
        expect(Number.isFinite(r.power)).toBe(true);expect(r.power).toBeGreaterThanOrEqual(0);
        expect(r.available-r.power-r.loss).toBeCloseTo(0,7);
        expect(r.extra.efficiency).toBeGreaterThanOrEqual(0);expect(r.extra.efficiency).toBeLessThanOrEqual(1);
        for(const stage of r.stages)expect(stage.value).toBeGreaterThanOrEqual(0);
      }
    });
  }
  it('uses the cosine of beam incidence, area, and inverter efficiency for PV',()=>{
    const a=model.simulate('solarPv',{irradiance:1000,area:20,efficiency:20,incidence:0});
    expect(a.power).toBeCloseTo(3.84,8);
    expect(model.simulate('solarPv',{...a.settings,incidence:60}).power/a.power).toBeCloseTo(.5,8);
    expect(model.simulate('solarPv',{...a.settings,area:40}).power/a.power).toBeCloseTo(2,8);
    expect(model.simulate('solarPv',{incidence:90}).power).toBe(0);
    expect(model.simulate('solarPv',{irradiance:0}).power).toBe(0);
  });
  it('applies cubic wind speed, generator clipping, and protective operating limits',()=>{
    const a=model.simulate('wind',{speed:5,radius:20,rating:8000});
    expect(model.simulate('wind',{...a.settings,speed:10}).power/a.power).toBeCloseTo(8,8);
    expect(model.simulate('wind',{speed:24,rating:500}).power).toBe(500);
    expect(model.simulate('wind',{speed:2.99}).status).toBe('Below cut-in');
    expect(model.simulate('wind',{speed:25}).status).toBe('Protective shutdown');
    expect(model.simulate('wind',{speed:30}).power).toBe(0);
    expect(model.settings('wind',{cp:100}).cp/100).toBeLessThan(16/27);
  });
  it('keeps hydro head and flow independent with correctly scaled kW',()=>{
    const a=model.simulate('hydro',{head:30,flow:5,efficiency:90});
    expect(a.power).toBeCloseTo(1324.35,8);
    expect(model.simulate('hydro',{...a.settings,flow:10}).power).toBeCloseTo(a.power*2,8);
    expect(model.simulate('hydro',{...a.settings,head:60}).power).toBeCloseTo(a.power*2,8);
    expect(model.simulate('hydro',{flow:0}).power).toBe(0);
  });
  it('bounds geothermal electricity below extracted heat and the Carnot limit',()=>{
    const r=model.simulate('geothermal',{hot:180,returnTemp:70,flow:40,utilization:40});
    expect(r.available).toBeCloseTo(18392,8);
    expect(r.power/r.available).toBeCloseTo((1-298.15/453.15)*.4,8);
    expect(model.simulate('geothermal',{...r.settings,returnTemp:90}).available).toBeLessThan(r.available);
    expect(model.simulate('geothermal',{hot:75,returnTemp:100}).power).toBe(0);
    expect(model.simulate('geothermal',{flow:0}).power).toBe(0);
  });
  it('keeps CSP light, receiver heat, and electrical stages separate',()=>{
    const r=model.simulate('solarThermal',{dni:1000,area:10000,optical:60,cycle:30});
    expect(r.stages.map(s=>s.value)).toEqual([10000,6000,1800]);
    expect(model.simulate('solarThermal',{dni:0}).power).toBe(0);
  });
  it('uses height squared and period for mean wave power',()=>{
    const r=model.simulate('wave',{height:2,period:8,width:8,efficiency:30});
    expect(r.extra.flux).toBeCloseTo(15.699362294,6);
    expect(model.simulate('wave',{...r.settings,height:4}).power/r.power).toBeCloseTo(4,8);
    expect(model.simulate('wave',{...r.settings,period:16}).power/r.power).toBeCloseTo(2,8);
    expect(model.simulate('wave',{height:0}).power).toBe(0);
  });
  it('uses current magnitude for tidal power and zero at slack water',()=>{
    const r=model.simulate('tidal',{speed:2,rating:3000});
    expect(model.simulate('tidal',{...r.settings,speed:-2}).power).toBe(r.power);
    expect(model.simulate('tidal',{speed:0}).power).toBe(0);
    expect(model.simulate('tidal',{speed:4,rating:100}).power).toBe(100);
  });
  it('converts kg/h times MJ/kg to kW without subtracting moisture twice',()=>{
    const r=model.simulate('biomass',{feed:500,heating:12,boiler:80,cycle:25});
    expect(r.available).toBeCloseTo(1666.6666667,5);expect(r.power).toBeCloseTo(333.3333333,5);
    expect(model.simulate('biomass',{feed:0}).power).toBe(0);
  });
  it('sanitizes saved settings, unknown IDs, and nonfinite inputs without mutating them',()=>{
    const input={speed:Infinity,radius:-100,cp:'100',rating:NaN},copy={...input};
    expect(model.settings('wind',input)).toEqual({speed:8,radius:10,cp:40,rating:3000});
    expect(input).toEqual(copy);expect(model.simulate('unknown',{}).id).toBe('solarPv');
  });
});

describe('Battery cycle energy conservation',()=>{
  it('conserves initial + accepted − delivered − losses = stored across all phases and capacity limits',()=>{
    for(const settings of [{},{capacity:10,power:200},{capacity:500,power:10,initial:100,roundtrip:50},{power:0,initial:30},{roundtrip:100}]){
      for(const minute of [0,1,30,59.5,60,61,90,119,120]){
        const r=model.simulate('storage',settings,minute),e=r.extra;
        expect(e.initial+e.charge-e.delivered-e.loss).toBeCloseTo(e.stored,8);
        expect(e.stored).toBeGreaterThanOrEqual(0);expect(e.stored).toBeLessThanOrEqual(r.settings.capacity+1e-8);
        expect(r.power).toBeLessThanOrEqual(r.settings.power);
        expect(r.power*r.available).toBe(0);
        expect(e.loss).toBeGreaterThanOrEqual(-1e-8);
      }
    }
  });
  it('recovers the round-trip fraction when an initially empty battery completes the cycle',()=>{
    const r=model.simulate('storage',{capacity:100,power:50,roundtrip:88,initial:0},120);
    expect(r.extra.charge).toBe(50);expect(r.extra.delivered).toBeCloseTo(44,8);
    expect(r.extra.loss).toBeCloseTo(6,8);expect(r.extra.stored).toBe(0);
    expect(r.power).toBe(0);expect(r.status).toBe('Cycle complete');
  });
  it('counts initial stored energy and avoids creating energy on timeline rewind',()=>{
    const a=model.simulate('storage',{initial:100},120);
    expect(a.extra.charge).toBe(0);expect(a.extra.delivered).toBe(50);
    expect(model.simulate('storage',{power:0,initial:0},90).power).toBe(0);
    expect(model.simulate('storage',{initial:0},0).extra.stored).toBe(0);
    expect(model.simulate('storage',{},999).extra.minute).toBe(120);
    expect(model.simulate('storage',{},-3).extra.minute).toBe(0);
  });
});

describe('Energy workbench integration',()=>{
  for(const id of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage']){
    it('renders '+id+' with accessible controls and model boundaries',()=>{
      const html=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:{selected:id}}});
      for(const text of ['Individual 3D energy simulations','Set the conditions','data-energy-render-status="loading"','Inspect mechanism components','Follow the energy accounting','Save mechanism reading','Assumptions and reference'])expect(html).toContain(text);
      expect(html).not.toContain('failed to render');expect(html).not.toContain('NaN');
    });
  }
  it('links the core library and individual lessons to the mechanism studio',()=>{
    expect(renderTool('renewablesLab',{renewablesLab:{}})).toContain('Individual 3D energy simulations');
    expect(renderTool('renewablesLab',{renewablesLab:{view:'wind'}})).toContain('in 3D');
  });
  it('keeps source and desktop deployment copies identical',()=>{
    expect(fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8')).toBe(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_renewables.js','utf8'));
  });
});


describe('Changing operating conditions',()=>{
  for(const id of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it('integrates '+id+' scenario energy without counting an extra endpoint interval',()=>{
      for(const profile of model.programs[id]){
        const study=model.scenario(id,{},profile.id);
        expect(study.rows.length).toBe(profile.duration+1);
        expect(study.rows[0].energy).toEqual({input:0,delivered:0,remainder:0,requested:0,unserved:0});
        const sum=study.rows.slice(0,-1).reduce((n,r)=>n+r.run.power/60,0);
        expect(study.totals.delivered).toBeCloseTo(sum,8);
        expect(study.totals.input-study.totals.delivered-study.totals.remainder).toBeCloseTo(0,6);
        expect(study.rows.at(-1).energy).toEqual(study.totals);
        const primary=profile.key,base=model.settings(id,{});
        for(const row of study.rows.filter((_,i)=>i%15===0)){
          expect({...row.run.settings,[primary]:base[primary]}).toEqual(base);
          expect(row.run.power).toBeGreaterThanOrEqual(0);
          expect(row.run.available).toBeGreaterThanOrEqual(row.run.power-1e-8);
        }
      }
    });
  }
  it('makes a high wind resource shut down rather than continue generating',()=>{
    const study=model.scenario('wind',{},'gust');
    expect(study.rows[50].run.settings.speed).toBe(28);
    expect(study.rows[50].run.power).toBe(0);
    expect(study.rows[50].run.status).toBe('Protective shutdown');
    expect(study.shutdownMinutes).toBeGreaterThan(20);
    expect(study.rows[95].run.power).toBeGreaterThan(0);
    expect(study.rows[study.peakMinute].run.power).toBe(Math.max(...study.rows.slice(0,-1).map(r=>r.run.power)));
  });
  it('keeps cloud profiles, control clamping, and no-resource behavior explicit',()=>{
    const study=model.scenario('solarPv',{},'clouds');
    expect(study.rows[40].run.settings.irradiance).toBeCloseTo(120,8);
    expect(study.rows[0].run.power/study.rows[40].run.power).toBeCloseTo(1/.15,8);
    expect(model.scenario('solarPv',{irradiance:0},'clouds').totals.delivered).toBe(0);
    expect(model.scenario('wind',{speed:30},'gust').rows[50].clipped).toBe(true);
    expect(model.scenario('wind',{},'not-a-program')).toBeNull();
  });
  it('preserves tidal current reversal and cubic resource scaling',()=>{
    const strong=model.scenario('tidal',{rating:3000},'reversal'),weak=model.scenario('tidal',{rating:3000},'weak');
    expect(strong.rows[180].run.settings.speed).toBe(2);
    expect(strong.rows[540].run.settings.speed).toBe(-2);
    expect(strong.rows[360].run.power).toBe(0);
    expect(strong.rows[180].run.power).toBe(strong.rows[540].run.power);
    expect(strong.totals.delivered/weak.totals.delivered).toBeCloseTo(8,8);
  });
});

describe('Scheduled battery dispatch',()=>{
  it('conserves energy and respects power, capacity, and request limits at every minute',()=>{
    for(const name of ['evening','interrupted'])for(const settings of [{},{capacity:10,power:200},{capacity:500,power:10,initial:100,roundtrip:50},{power:0,initial:50},{roundtrip:100}]){
      const study=model.scenario('storage',settings,name),s=study.baseSettings;
      for(const row of study.rows){
        const e=row.run.extra;
        expect(e.initial+e.charge-e.delivered-e.loss).toBeCloseTo(e.stored,7);
        expect(e.stored).toBeGreaterThanOrEqual(0);expect(e.stored).toBeLessThanOrEqual(s.capacity+1e-8);
        expect(row.run.power).toBeLessThanOrEqual(s.power+1e-8);
        expect(row.run.available).toBeLessThanOrEqual(s.power+1e-8);
        expect(row.run.power*row.run.available).toBe(0);
        if(e.mode==='discharge')expect(row.requested-row.run.power).toBeCloseTo(row.unserved,7);
      }
      expect(study.initial+study.totals.input-study.totals.delivered-study.totals.remainder).toBeCloseTo(study.endStored,7);
      expect(study.totals.requested-study.totals.delivered).toBeCloseTo(study.totals.unserved,7);
    }
  },30000);
  it('recovers 44 kWh from 50 kWh of interrupted charging and tracks unmet requests',()=>{
    const study=model.scenario('storage',{},'interrupted');
    expect(study.totals.input).toBeCloseTo(50,8);
    expect(study.totals.delivered).toBeCloseTo(44,8);
    expect(study.totals.remainder).toBeCloseTo(6,8);
    expect(study.totals.requested).toBeCloseTo(75,8);
    expect(study.totals.unserved).toBeCloseTo(31,8);
    expect(study.rows[45].run.status).toBe('Waiting');
    expect(study.rows.at(-1).run.power).toBe(0);
    expect(study.rows.at(-1).run.status).toBe('Scenario complete');
  });
  it('holds external requests fixed when the battery power or capacity is changed',()=>{
    const a=model.scenario('storage',{power:50,initial:100},'evening');
    const b=model.scenario('storage',{power:100,capacity:300,initial:100},'evening');
    expect(b.rows.map(r=>r.requested)).toEqual(a.rows.map(r=>r.requested));
    expect(a.rows[180].requested).toBe(75);
    expect(a.rows[180].run.power).toBeLessThanOrEqual(50);
    expect(b.rows[180].run.power).toBe(75);
    expect(b.totals.unserved).toBeLessThan(a.totals.unserved);
  });
});

describe('Meaningful reading comparisons',()=>{
  it('isolates one changed input in the same scenario at the same time',()=>{
    const a={settings:{area:20},profileId:'clouds',phase:50},b={settings:{area:40},profileId:'clouds',phase:50};
    const comparison=model.compareReadings('solarPv',a,b);
    expect(comparison.controlled).toBe(true);expect(comparison.comparable).toBe(true);
    expect(comparison.changes.map(c=>c.key)).toEqual(['area']);
    expect(comparison.powerPercent).toBeCloseTo(100,8);
    expect(comparison.energyDelta).toBeCloseTo(comparison.first.energy.delivered,8);
  });
  it('does not attribute differences to one variable when the profile or meaningful time changed',()=>{
    const a={settings:{area:20},profileId:'clouds',phase:50};
    const changed=model.compareReadings('solarPv',a,{settings:{area:40},profileId:'daylight',phase:80});
    expect(changed.controlled).toBe(false);expect(changed.comparable).toBe(false);expect(changed.context).toHaveLength(2);
    const multiple=model.compareReadings('solarPv',a,{...a,settings:{area:40,efficiency:25}});
    expect(multiple.controlled).toBe(false);expect(multiple.comparable).toBe(true);expect(multiple.changes).toHaveLength(2);
  });
  it('ignores illustrative animation time for steady generation but keeps storage time meaningful',()=>{
    expect(model.compareReadings('wind',{phase:5},{phase:50,settings:{radius:50}}).controlled).toBe(true);
    expect(model.compareReadings('storage',{phase:60},{phase:120,settings:{capacity:200}}).comparable).toBe(false);
  });
  it('handles legacy readings, unknown programs, and zero-output baselines without fabricated percentage gains',()=>{
    const legacy=model.resolveReading('solarPv',{settings:{area:40},phase:3});
    expect(legacy.profileId).toBe('steady');expect(legacy.run.settings.area).toBe(40);
    expect(model.resolveReading('wind',{profileId:'invalid',settings:{speed:5}}).profileId).toBe('steady');
    expect(model.resolveReading('wind',{profileId:'gust',phase:999}).phase).toBe(120);
    expect(model.compareReadings('solarPv',{settings:{irradiance:0}},{settings:{irradiance:1000}}).powerPercent).toBeNull();
  });
  it('renders a restored operating experiment with named readings and explicit context',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:{
      selected:'solarPv',settings:{solarPv:{area:40}},scenarios:{solarPv:{profileId:'clouds',minute:50}},
      readings:{solarPv:[{name:'Original array',settings:{area:20},profileId:'clouds',phase:50,note:'Cloud crosses the array.'}]}
    }}});
    for(const text of ['Operating scenario','Passing clouds','Scenario minute','Current vs Original array','One input changed','Read minute-by-minute results','Review saved inputs and observations','Original array'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
