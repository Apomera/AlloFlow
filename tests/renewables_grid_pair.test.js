import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:3.75,loadId:'flat',grid:'outage',outageStart:90,outageMinutes:60,batteryUnits:1,battery:{capacity:10,power:5,initial:75,roundtrip:100},reserve:0,policy:'fixed',gridLimit:{enabled:false}};
const request={settings:base,config:{min:2.5,max:3.75,count:5,target:100}};
const close=(a,b)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8);
function csvRows(text){return text.split(/\r?\n/).map(line=>{const row=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(line[i]===','&&!quoted){row.push(cell);cell='';}else cell+=line[i];}row.push(cell);return row;});}
describe('Two recorded grid cases',()=>{
  it('defaults to the recorded baseline versus the first fixed-reserve case',()=>{
    const p=model.gridStudyPair(request);expect(p.version).toBe(1);expect(p.microgridVersion).toBe(5);expect(p.a.key).toBe('baseline');expect(p.a.settings.gridLimit.enabled).toBe(false);expect(p.b.key).toBe('0:fixed');expect(p.b.settings.gridLimit).toEqual({enabled:true,power:2.5});
  });
  it('normalizes invalid saved choices, minutes, chart modes, and notes',()=>{
    const p=model.gridStudyPair(request,{a:'999:backup',b:'-1:unknown',minute:Infinity,chart:'bogus',open:'yes',note:'x'.repeat(3100)});
    expect(p.view).toEqual({a:'baseline',b:'0:fixed',minute:0,chart:'unserved',open:false,note:'x'.repeat(3000),periods:{open:false,kind:'all',sort:'time',page:0,selected:null,moment:'peak'}});
    expect(model.gridStudyPair(request,{minute:999}).view.minute).toBe(240);expect(model.gridStudyPair(request,{minute:-4}).view.minute).toBe(0);expect(model.gridStudyPair(request,{minute:12.9}).view.minute).toBe(12);
  });
  it('preserves exact pair settings and matches independent simulation totals',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'});
    for(const side of ['a','b']){const r=model.simulate(p[side].settings);expect(p[side].totals).toEqual(r.totals);expect(p[side].coverage).toBe(r.servedPercent);expect(p[side].endStored).toBe(r.endStored);expect(p[side].initialStored).toBe(r.initialStored);}
    expect(p.a.settings.gridLimit.power).toBe(3.75);expect(p.b.settings.gridLimit.power).toBe(2.5);
  });
  it('separates intervals where B helps and hurts with a hand-calculated trade-off',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'});
    close(p.a.totals.unserved,1.875);close(p.b.totals.unserved,3.75);close(p.deltaTotals.unserved,1.875);close(p.deltaTotals.grid,1.875);close(p.deltaEndStored,3.75);
    expect(p.summary).toEqual({improvedMinutes:30,worsenedMinutes:180,unchangedMinutes:30,firstDifference:0,largestReduction:3.75,largestReductionMinute:120,largestIncrease:1.25,largestIncreaseMinute:0});
    close(p.rows[0].delta.unserved,1.25);close(p.rows[120].delta.unserved,-3.75);
  });
  it('does not treat equal total unmet energy as equal timing',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'2:backup'});
    expect(Math.abs(p.deltaTotals.unserved)).toBeLessThan(1e-10);expect(p.summary.improvedMinutes).toBe(30);expect(p.summary.worsenedMinutes).toBe(180);expect(p.summary.firstDifference).toBe(0);close(p.summary.largestIncrease,.625);close(p.summary.largestReduction,3.75);
  });
  it('reverses deltas and improvement directions when A and B are swapped',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'}),q=model.gridStudyPair(request,{a:'0:backup',b:'4:fixed'});
    for(const k of Object.keys(p.deltaTotals))close(q.deltaTotals[k],-p.deltaTotals[k]);expect(q.summary.improvedMinutes).toBe(p.summary.worsenedMinutes);expect(q.summary.worsenedMinutes).toBe(p.summary.improvedMinutes);expect(q.summary.largestReductionMinute).toBe(p.summary.largestIncreaseMinute);close(q.deltaEndStored,-p.deltaEndStored);
  });
  it('gives identical cases zero deltas and no critical unmet-demand moments',()=>{
    const p=model.gridStudyPair(request,{a:'1:release',b:'1:release'});expect(Object.values(p.deltaTotals).every(v=>v===0)).toBe(true);expect(p.summary.improvedMinutes).toBe(0);expect(p.summary.worsenedMinutes).toBe(0);expect(p.summary.unchangedMinutes).toBe(240);expect(p.summary.firstDifference).toBeNull();expect(p.summary.largestIncreaseMinute).toBeNull();expect(p.summary.largestReductionMinute).toBeNull();
  });
  it('allows the same unmet demand with different grid use and final storage',()=>{
    const p=model.gridStudyPair({...request,settings:{...base,grid:'connected'}},{a:'4:fixed',b:'4:backup'});
    expect(p.summary.firstDifference).toBeNull();expect(p.deltaTotals.unserved).toBe(0);close(p.deltaTotals.grid,7.5);close(p.deltaEndStored,7.5);
  });
  it('measures stored energy at boundaries and gives the terminal endpoint zero power',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup',minute:240});expect(p.rows).toHaveLength(241);expect(p.rows[0].a.stored).toBe(7.5);expect(p.rows[120].a.stored).toBe(0);expect(p.rows.at(-1).a.stored).toBe(p.a.endStored);expect(p.rows.at(-1).b.stored).toBe(p.b.endStored);
    for(const side of ['a','b','delta'])for(const k of ['grid','unserved','discharge','charge','curtailed','gridLimited','gridUnavailable'])expect(p.rows.at(-1)[side][k]).toBe(0);
    expect(p.summary.improvedMinutes+p.summary.worsenedMinutes+p.summary.unchangedMinutes).toBe(p.duration);
  });
  it('reconciles minute deltas with total energy and shortfall categories',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'});
    for(const k of ['grid','unserved','discharge','charge','curtailed','gridLimited','gridUnavailable'])close(p.rows.reduce((n,r)=>n+r.delta[k]/60,0),p.deltaTotals[k]);
    for(const r of p.rows){close(r.delta.unserved,r.delta.gridLimited+r.delta.gridUnavailable);for(const k of Object.keys(r.delta))close(r.delta[k],r.b[k]-r.a[k]);}
  });
  it('uses a relative threshold for real tiny differences',()=>{
    const p=model.gridStudyPair({settings:{...base,demand:4e-12,batteryUnits:0,grid:'connected'},config:{min:0,max:4e-12,count:5}},{a:'4:fixed',b:'0:fixed'});expect(p.summary.worsenedMinutes).toBe(240);close(p.summary.largestIncrease,4e-12);expect(p.summary.largestIncreaseMinute).toBe(0);
  });
  it('handles no demand and no bank without inventing coverage or differences',()=>{
    const p=model.gridStudyPair({settings:{...base,demand:0,batteryUnits:0},config:request.config},{a:'0:backup',b:'4:release'});expect(p.a.coverage).toBeNull();expect(p.b.coverage).toBeNull();expect(p.summary.firstDifference).toBeNull();expect(p.a.initialStored).toBe(0);expect(p.b.endStored).toBe(0);
  });
  it('preserves zero-rated grid availability and islanded behavior',()=>{
    const req={settings:base,config:{min:0,max:0,count:17}},p=model.gridStudyPair(req,{a:'0:fixed',b:'0:backup'});expect(p.rows[0].gridAvailable).toBe(true);expect(p.rows[90].gridAvailable).toBe(false);expect(p.summary.firstDifference).toBe(0);
    const island=model.gridStudyPair({...request,settings:{...base,grid:'island'}},{a:'0:fixed',b:'4:fixed'});expect(island.summary.firstDifference).toBeNull();expect(island.a.totals.grid).toBe(0);
  });
  it('supports all 17 rating choices and single-rating experiments',()=>{
    const many=model.gridStudyPair({...request,config:{min:0,max:8,count:17}},{a:'16:backup',b:'15:release'});expect(many.a.settings.gridLimit.power).toBe(8);expect(many.b.settings.gridLimit.power).toBe(7.5);
    const one=model.gridStudyPair({...request,config:{min:2,max:2,count:17}},{a:'0:backup',b:'0:release'});expect(one.a.settings.gridLimit.power).toBe(2);expect(one.b.key).toBe('0:release');
  });
  it('preserves captured companion generation and demand shifting in both cases',()=>{
    const settings={...base,companion:{enabled:true,source:'wind',profileId:'lull',offset:20},flex:{enabled:true,percent:50,fromStart:0,fromMinutes:60,toStart:160,toMinutes:30}},p=model.gridStudyPair({...request,settings},{a:'baseline',b:'2:release'});
    expect(p.a.settings.companion).toEqual(p.b.settings.companion);expect(p.a.settings.flex).toEqual(p.b.settings.flex);expect(p.a.totals.generation).toBe(p.b.totals.generation);expect(p.a.totals.demand).toBe(p.b.totals.demand);expect(p.a.initialStored).toBe(p.b.initialStored);
  });
  it('recomputes from captured inputs without mutating them or trusting persisted totals',()=>{
    const before=JSON.stringify(request),p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'});expect(JSON.stringify(request)).toBe(before);expect(model.gridStudyPair({...JSON.parse(before),samples:[],totals:{grid:999}},p.view)).toEqual(p);
  });
  it('keeps model results independent of comparison notes, chart mode, and cursor',()=>{
    const a=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'}),b=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup',minute:120,chart:'stored',note:'Observe storage.',open:true});expect(a.rows).toEqual(b.rows);expect(a.summary).toEqual(b.summary);expect(a.deltaTotals).toEqual(b.deltaTotals);
  });
  it('exports per-minute values, signed changes, and exact case provenance',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'0:backup'}),rows=csvRows(model.gridPairCsv(p)),h=rows[0];expect(rows).toHaveLength(242);
    for(const row of rows.slice(1)){const v=k=>row[h.indexOf(k)];close(Number(v('change_unserved_kW')),Number(v('b_unserved_kW'))-Number(v('a_unserved_kW')));expect(JSON.parse(v('case_a_settings_json'))).toEqual(p.a.settings);expect(JSON.parse(v('case_b_settings_json'))).toEqual(p.b.settings);expect(v('microgrid_version')).toBe('5');expect(v('comparison_version')).toBe('1');}
    const last=rows.at(-1);expect(last[h.indexOf('a_unserved_kW')]).toBe('0');close(Number(last[h.indexOf('b_stored_kWh')]),p.b.endStored);
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass'])it(source+' maintains both ledgers and common resource timing',()=>{
    const p=model.gridStudyPair({settings:{source,profileId:energy.programs[source][0].id,demand:100,grid:'outage',outageStart:30,outageMinutes:60,batteryUnits:2,battery:{capacity:10,power:5,initial:70,roundtrip:64},reserve:20,companion:{enabled:true,source:'wind'},flex:{enabled:true}},config:{min:0,max:200,count:5}},{a:'2:fixed',b:'3:backup'});
    for(const c of [p.a,p.b]){const t=c.totals;close(t.generation+t.grid+c.initialStored,t.demand-t.unserved+t.curtailed+t.loss+c.endStored);}
    close(p.deltaTotals.grid,-p.deltaTotals.unserved+p.deltaTotals.curtailed+p.deltaTotals.loss+p.deltaEndStored);expect(p.a.totals.generation).toBe(p.b.totals.generation);expect(p.a.totals.demand).toBe(p.b.totals.demand);
  });
  it('renders comparison controls, saved preferences, directions, and two exact-minute inspections',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...base,gridStudy:{open:true,request,comparison:{open:true,a:'4:fixed',b:'0:backup',minute:120,chart:'stored',note:'Timing matters.'}}}}}});
    for(const text of ['Compare two grid cases','What changes from A to B?','Case A','Case B','Largest unmet-demand reduction','Inspect case A in 3D','Inspect case B in 3D','Timing matters.','Minute 120','B minus A'])expect(html).toContain(text);expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
