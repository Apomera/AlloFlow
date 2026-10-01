import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:4,loadId:'flat',grid:'connected',batteryUnits:0,gridLimit:{enabled:false,power:2}};
const config={min:0,max:8,count:5,target:100};
const close=(a,b)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8);
function csvRows(text){return text.split(/\r?\n/).map(line=>{const row=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(line[i]===','&&!quoted){row.push(cell);cell='';}else cell+=line[i];}row.push(cell);return row;});}
describe('Captured grid capacity experiments',()=>{
  it('normalizes finite ratings, reversed bounds, sample counts, and targets',()=>{
    expect(model.gridStudyConfig(base)).toEqual(config);
    expect(model.gridStudyConfig(base,{min:12,max:-1,count:99,target:130})).toEqual({min:0,max:12,count:5,target:100});
    expect(model.gridStudyConfig(base,{min:NaN,max:Infinity,count:9,target:-3})).toEqual({min:0,max:8,count:9,target:0});
    expect(model.gridStudyConfig(base,{min:1e8,max:1e9,count:17})).toEqual({min:1e6,max:1e6,count:17,target:100});
  });
  it('defaults the upper range from the active connection and demand',()=>{
    expect(model.gridStudyConfig({...base,demand:0}).max).toBe(1);
    expect(model.gridStudyConfig({...base,gridLimit:{enabled:true,power:15}}).max).toBe(15);
  });
  it('deduplicates equal endpoints and keeps fractional ratings',()=>{
    const r=model.gridStudy({settings:base,config:{min:1.25,max:1.25,count:17}});expect(r.samples).toHaveLength(1);expect(r.samples[0].power).toBe(1.25);close(r.samples[0].strategies[0].totals.grid,5);
  });
  it('keeps very small ratings distinct without decimal rounding',()=>{
    const r=model.gridStudy({settings:{...base,demand:4e-12},config:{min:0,max:8e-12,count:5}});expect(r.samples).toHaveLength(5);expect(r.strategies[0].lowestPassingPower).toBe(4e-12);close(r.samples[1].strategies[0].totals.unserved,8e-12);
  });
  it('evaluates every rating under all three strategies',()=>{
    const r=model.gridStudy({settings:base,config});expect(r.version).toBe(1);expect(r.microgridVersion).toBe(5);expect(r.samples.map(s=>s.power)).toEqual([0,2,4,6,8]);
    for(const s of r.samples)expect(s.strategies.map(e=>e.policy)).toEqual(['fixed','release','backup']);expect(r.samples.at(-1).power).toBe(config.max);
  });
  it('matches hand-calculated imports, unmet demand, and lowest passing ratings',()=>{
    const r=model.gridStudy({settings:base,config});for(const p of r.strategies){expect(p.lowestPassingPower).toBe(4);expect(p.passing).toBe(3);}
    for(const e of r.samples[1].strategies){close(e.totals.grid,8);close(e.totals.unserved,8);close(e.coverage,50);expect(e.firstUnserved).toBe(0);expect(e.meetsTarget).toBe(false);}
    expect(r.baseline.coverage).toBe(100);close(r.baseline.totals.grid,16);expect(r.settings.gridLimit.enabled).toBe(false);
  });
  it('reports a sampled passing rating rather than inventing an exact minimum',()=>{
    const r=model.gridStudy({settings:base,config:{...config,max:12}});expect(r.strategies[0].lowestPassingPower).toBe(6);expect(r.samples.some(s=>s.power===4)).toBe(false);
  });
  it('applies the whole-sequence energy target and allows brief gaps below 100 percent',()=>{
    const r=model.gridStudy({settings:{...base,grid:'outage',outageStart:60,outageMinutes:60},config:{...config,target:75}}),e=r.samples[2].strategies[0];
    close(e.coverage,75);expect(e.meetsTarget).toBe(true);expect(e.unservedMinutes).toBe(60);expect(e.firstUnserved).toBe(60);close(e.totals.gridUnavailable,4);expect(r.strategies[0].lowestPassingPower).toBe(4);
  });
  it('shows that unlimited outside-outage capacity cannot repair an outage shortfall',()=>{
    const r=model.gridStudy({settings:{...base,grid:'outage',outageStart:60,outageMinutes:60},config});for(const p of r.strategies)expect(p.lowestPassingPower).toBeNull();
    close(r.samples[4].strategies[0].totals.unserved,4);expect(r.samples[4].strategies[0].totals.gridLimited).toBe(0);
  });
  it('leaves targets unevaluated when there is no demand, even for a zero target',()=>{
    const r=model.gridStudy({settings:{...base,demand:0},config:{...config,target:0}});expect(r.baseline.coverage).toBeNull();for(const s of r.samples)for(const e of s.strategies){expect(e.meetsTarget).toBeNull();expect(e.firstUnserved).toBeNull();}
    expect(r.strategies.every(p=>p.passing===0&&p.lowestPassingPower===null)).toBe(true);
  });
  it('supports a zero target for positive demand without hiding the shortfall',()=>{
    const r=model.gridStudy({settings:base,config:{...config,target:0}});expect(r.strategies[0].lowestPassingPower).toBe(0);expect(r.samples[0].strategies[0].meetsTarget).toBe(true);close(r.samples[0].strategies[0].totals.unserved,16);
  });
  it('compares grid-reliant backup with normal dispatch using identical starting energy',()=>{
    const r=model.gridStudy({settings:{...base,demand:2,batteryUnits:1,battery:{capacity:10,power:5,initial:100,roundtrip:100},reserve:20},config:{...config,max:4}});
    expect(r.strategies.map(p=>p.lowestPassingPower)).toEqual([0,0,2]);const e=r.samples[0].strategies;close(e[0].totals.discharge,8);close(e[2].totals.discharge,0);close(e[0].endStored,2);close(e[2].endStored,10);expect(e.every(v=>v.initialStored===10)).toBe(true);
  });
  it('keeps zero capacity distinct from a grid outage',()=>{
    const s={...base,demand:2,batteryUnits:1,battery:{capacity:10,power:5,initial:100,roundtrip:100},grid:'outage',outageStart:120,outageMinutes:60};
    const r=model.gridStudy({settings:s,config}),e=r.samples[0].strategies[2];close(e.totals.gridLimited,6);close(e.totals.gridUnavailable,0);close(e.totals.discharge,2);close(e.endStored,8);
  });
  it('does not let connection rating alter battery history for a given strategy',()=>{
    const r=model.gridStudy({settings:{...base,batteryUnits:1,battery:{capacity:10,power:5,initial:100,roundtrip:64},reserve:20,grid:'outage',outageStart:90,outageMinutes:60},config});
    for(let j=0;j<3;j++)for(const s of r.samples){expect(s.strategies[j].endStored).toBe(r.samples[0].strategies[j].endStored);expect(s.strategies[j].totals.discharge).toBe(r.samples[0].strategies[j].totals.discharge);}
  });
  it('keeps all rating results identical for an islanded system within each strategy',()=>{
    const r=model.gridStudy({settings:{...base,grid:'island',batteryUnits:1,battery:{capacity:10,power:5,initial:100,roundtrip:100},reserve:20},config});
    for(const s of r.samples)expect(s.strategies).toEqual(r.samples[0].strategies);
  });
  it('captures both sources, shifted demand, the outage, and complete battery settings',()=>{
    const settings={...base,companion:{enabled:true,source:'wind',profileId:'lull',offset:25},flex:{enabled:true,percent:50,fromStart:0,fromMinutes:60,toStart:120,toMinutes:30},grid:'outage',outageStart:50,outageMinutes:40,batteryUnits:2,battery:{capacity:20,power:10,initial:30,roundtrip:81},reserve:25};
    const before=JSON.stringify(settings),r=model.gridStudy({settings,config});expect(JSON.stringify(settings)).toBe(before);
    for(const row of r.samples)for(const e of row.strategies){const candidate=model.gridStudyCase(r.settings,row.power,e.policy),run=model.simulate(candidate);expect(run.totals).toEqual(e.totals);expect(run.firstUnserved).toBe(e.firstUnserved);expect(candidate.companion).toEqual(r.settings.companion);expect(candidate.flex).toEqual(r.settings.flex);expect(candidate.grid).toBe('outage');expect(candidate.gridLimit).toEqual({enabled:true,power:row.power});}
  });
  it('retains recorded requests through JSON serialization and ignores untrusted result totals',()=>{
    const request={settings:base,config},r=model.gridStudy(request);expect(model.gridStudy(JSON.parse(JSON.stringify(request)))).toEqual(r);expect(model.gridStudy({...request,samples:[{power:999}],baseline:{totals:{grid:999}}})).toEqual(r);
  });
  it('exports exact replay conditions and reconciled energy in every CSV row',()=>{
    const r=model.gridStudy({settings:base,config}),rows=csvRows(model.gridStudyCsv(r)),h=rows[0];expect(rows).toHaveLength(16);
    for(const row of rows.slice(1)){const v=k=>row[h.indexOf(k)],candidate=JSON.parse(v('case_settings_json')),run=model.simulate(candidate);expect(candidate.gridLimit.enabled).toBe(true);expect(candidate.gridLimit.power).toBe(Number(v('rating_kW')));expect(candidate.policy).toBe(v('strategy'));close(Number(v('grid_import_kWh')),run.totals.grid);close(Number(v('unserved_kWh')),Number(v('connection_limit_unserved_kWh'))+Number(v('grid_unavailable_unserved_kWh')));}
    expect(rows.slice(1).filter(r=>r[h.indexOf('lowest_passing_sample')]==='true')).toHaveLength(3);
  });
  it('exports blank coverage, target and minute fields when they are not evaluated',()=>{
    const rows=csvRows(model.gridStudyCsv(model.gridStudy({settings:{...base,demand:0},config}))),h=rows[0];for(const row of rows.slice(1))for(const key of ['demand_served_percent','meets_target','first_unserved_min'])expect(row[h.indexOf(key)]).toBe('');
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass'])it(source+' conserves energy and never worsens a strategy when capacity increases',()=>{
    const r=model.gridStudy({settings:{source,profileId:energy.programs[source][0].id,demand:100,loadId:'pulse',grid:'outage',outageStart:30,outageMinutes:60,batteryUnits:2,battery:{capacity:10,power:5,initial:70,roundtrip:64},reserve:20,companion:{enabled:true,source:'wind'},flex:{enabled:true}},config:{min:0,max:200,count:5,target:90}});
    for(const row of r.samples)for(const e of row.strategies){const t=e.totals;close(t.generation+t.grid+e.initialStored,t.demand-t.unserved+t.curtailed+t.loss+e.endStored);close(t.unserved,t.gridLimited+t.gridUnavailable);if(row.index>0)expect(e.totals.unserved).toBeLessThanOrEqual(r.samples[row.index-1].strategies.find(p=>p.policy===e.policy).totals.unserved+1e-9);}
  });
  it('renders a recorded comparison and clear pending changes without changing its results',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...base,demand:9,gridStudy:{open:true,request:{settings:base,config},config:{...config,target:90},note:'Try a larger connection.',selected:{index:999,policy:'invalid'}}}}}});
    for(const text of ['Grid capacity experiment','Grid ratings and battery strategies','System inputs changed. This grid experiment','Experiment setup changed.','Try a larger connection.','Review grid experiment conditions','8 kW · Fixed reserve','data-grid-study-series'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
