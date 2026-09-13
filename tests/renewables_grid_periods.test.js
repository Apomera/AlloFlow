import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:3.75,loadId:'flat',grid:'outage',outageStart:90,outageMinutes:60,batteryUnits:1,battery:{capacity:10,power:5,initial:75,roundtrip:100},reserve:0,policy:'fixed',gridLimit:{enabled:false}};
const request={settings:base,config:{min:2.5,max:3.75,count:5,target:100}},selection={a:'4:fixed',b:'0:backup'};
const close=(a,b)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8);
function fixture(differences,demand=10,availability=()=>true){const rows=differences.map((difference,minute)=>{const a={grid:0,unserved:Math.max(0,-difference),discharge:0,charge:0,curtailed:0,gridLimited:Math.max(0,-difference),gridUnavailable:0,stored:10-minute/10},b={...a,unserved:Math.max(0,difference),gridLimited:Math.max(0,difference),stored:20-minute/5};a.grid=demand-a.unserved;b.grid=demand-b.unserved;const delta=Object.fromEntries(Object.keys(a).map(k=>[k,b[k]-a[k]]));return{minute,demand,generation:0,gridAvailable:availability(minute),a,b,delta};});const end=differences.length;rows.push({minute:end,demand:0,generation:0,gridAvailable:true,a:{grid:0,unserved:0,discharge:0,charge:0,curtailed:0,gridLimited:0,gridUnavailable:0,stored:10-end/10},b:{grid:0,unserved:0,discharge:0,charge:0,curtailed:0,gridLimited:0,gridUnavailable:0,stored:20-end/5},delta:{unserved:0}});return{version:1,microgridVersion:5,duration:end,rows};}
function csvRows(text){return text.split(/\r?\n/).map(line=>{const row=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(line[i]===','&&!quoted){row.push(cell);cell='';}else cell+=line[i];}row.push(cell);return row;});}
describe('Improvement and worsening periods',()=>{
  it('groups the hand-calculated trade-off into three chronological periods',()=>{
    const p=model.gridStudyPair(request,selection),a=p.periods;expect(a.version).toBe(1);expect(a.comparisonVersion).toBe(1);expect(a.microgridVersion).toBe(5);
    expect(a.episodes.map(e=>[e.kind,e.start,e.end,e.minutes])).toEqual([['worsened',0,90,90],['improved',120,150,30],['worsened',150,240,90]]);
    close(a.totals.avoidedUnserved,1.875);close(a.totals.addedUnserved,3.75);close(a.totals.netEnergyChange,1.875);expect(a.totals.remainingEnergyChange).toBe(0);expect(a.totals.improvedMinutes).toBe(p.summary.improvedMinutes);expect(a.totals.worsenedMinutes).toBe(p.summary.worsenedMinutes);
  });
  it('preserves improvement and worsening even when net energy change is zero',()=>{
    const p=model.gridStudyPair(request,{a:'4:fixed',b:'2:backup'});expect(p.periods.episodes).toHaveLength(3);close(p.periods.totals.addedUnserved,p.periods.totals.avoidedUnserved);expect(Math.abs(p.periods.totals.netEnergyChange)).toBeLessThan(1e-10);
  });
  it('ends periods at an unchanged minute or immediate direction reversal',()=>{
    const a=model.gridPairPeriods(fixture([-1,-2,0,3,4,-1]));expect(a.episodes.map(e=>[e.kind,e.start,e.end])).toEqual([['improved',0,2],['worsened',3,5],['improved',5,6]]);expect(a.totals.unchangedMinutes).toBe(1);
  });
  it('uses end-exclusive boundaries and selects the first largest difference',()=>{
    const a=model.gridPairPeriods(fixture([0,-1,-3,-3,0]));const e=a.episodes[0];expect(e.start).toBe(1);expect(e.end).toBe(4);expect(e.minutes).toBe(3);expect(e.peakMinute).toBe(2);expect(e.peakDifference).toBe(3);
  });
  it('reads storage at the actual start and end instead of summing boundaries',()=>{
    const p=model.gridStudyPair(request,selection),e=p.periods.episodes[1];expect(e.startStored).toEqual({a:0,b:5.625});expect(e.endStored).toEqual({a:0,b:3.75});close(e.a.unserved,1.875);close(e.b.unserved,0);close(e.b.discharge,1.875);
  });
  it('counts availability without splitting a continuous directional period',()=>{
    const a=model.gridPairPeriods(fixture([1,1,1,1],10,i=>i<2)),e=a.episodes[0];expect(a.episodes).toHaveLength(1);expect(e.availableMinutes).toBe(2);expect(e.unavailableMinutes).toBe(2);expect(e.end).toBe(4);
  });
  it('keeps raw changes below the threshold in the reconciliation',()=>{
    const a=model.gridPairPeriods(fixture([1,1e-10,-1e-10,-1,2e-10],1));expect(a.episodes).toHaveLength(2);expect(a.totals.unchangedMinutes).toBe(3);close(a.totals.remainingEnergyChange,2e-10/60);close(a.totals.netEnergyChange,a.totals.addedUnserved-a.totals.avoidedUnserved+a.totals.remainingEnergyChange);
  });
  it('recognizes meaningful changes at very small demand scales',()=>{
    const a=model.gridPairPeriods(fixture([1e-12,-1e-12],4e-12));expect(a.episodes).toHaveLength(2);expect(a.totals.unchangedMinutes).toBe(0);close(a.totals.avoidedUnserved,1e-12/60);
  });
  it('ignores the final endpoint and supports a one-minute period',()=>{
    const f=fixture([0,0,2]);f.rows.at(-1).delta.unserved=999;const a=model.gridPairPeriods(f),e=a.episodes[0];expect(e.minutes).toBe(1);expect(e.end).toBe(3);close(e.magnitude,2/60);for(const moment of ['start','peak','last'])expect(model.gridPeriodView(a,{moment}).minute).toBe(2);
  });
  it('reverses directions and signed energy when cases are swapped',()=>{
    const a=model.gridStudyPair(request,selection).periods,b=model.gridStudyPair(request,{a:selection.b,b:selection.a}).periods;
    for(let i=0;i<a.episodes.length;i++){expect(a.episodes[i].kind).not.toBe(b.episodes[i].kind);expect(a.episodes[i].start).toBe(b.episodes[i].start);close(a.episodes[i].delta.unserved,-b.episodes[i].delta.unserved);expect(a.episodes[i].startStored.a).toBe(b.episodes[i].startStored.b);}
    close(a.totals.avoidedUnserved,b.totals.addedUnserved);
  });
  it('has no periods for identical unmet demand even if imports and storage differ',()=>{
    const p=model.gridStudyPair({...request,settings:{...base,grid:'connected'}},{a:'4:fixed',b:'4:backup'});expect(p.periods.episodes).toHaveLength(0);expect(p.deltaTotals.grid).not.toBe(0);expect(p.deltaEndStored).not.toBe(0);
  });
  it('handles no demand and reports an empty header-only export',()=>{
    const p=model.gridStudyPair({...request,settings:{...base,demand:0,batteryUnits:0}},selection),v=model.gridPeriodView(p.periods);expect(p.periods.episodes).toHaveLength(0);expect(v.selected).toBeNull();expect(v.minute).toBeNull();expect(v.pages).toBe(1);expect(v.page).toBe(0);expect(csvRows(model.gridPeriodCsv(p))).toHaveLength(1);
  });
  it('filters and ranks periods without changing chronological analysis',()=>{
    const a=model.gridStudyPair(request,selection).periods,before=JSON.stringify(a);const improved=model.gridPeriodView(a,{kind:'improved'});expect(improved.episodes).toHaveLength(1);expect(improved.selected.start).toBe(120);
    expect(model.gridPeriodView(a,{sort:'duration'}).episodes.map(e=>e.start)).toEqual([0,150,120]);expect(model.gridPeriodView(a,{sort:'energy'}).episodes.map(e=>e.start)).toEqual([0,120,150]);expect(JSON.stringify(a)).toBe(before);
  });
  it('normalizes invalid preferences and falls back to a current matching period',()=>{
    const a=model.gridStudyPair(request,selection).periods,v=model.gridPeriodView(a,{kind:'bad',sort:'bad',moment:'bad',page:NaN,selected:'missing',open:'yes'});expect(v.prefs).toEqual({open:false,kind:'all',sort:'time',page:0,selected:'missing',moment:'peak'});expect(v.selected.start).toBe(0);
    const filtered=model.gridPeriodView(a,{kind:'improved',selected:a.episodes[0].key});expect(filtered.selected.start).toBe(120);
  });
  it('supports sorting by impact and exact chosen start, peak, or last minute',()=>{
    const a=model.gridPairPeriods(fixture([1,0,-2,-5,-2,0,3])),v=model.gridPeriodView(a,{sort:'energy'});expect(v.selected.start).toBe(2);expect(v.minute).toBe(3);expect(model.gridPeriodView(a,{selected:v.selected.key,moment:'start'}).minute).toBe(2);expect(model.gridPeriodView(a,{selected:v.selected.key,moment:'last'}).minute).toBe(4);
  });
  it('paginates many periods and follows a selected period to its page',()=>{
    const a=model.gridPairPeriods(fixture(Array.from({length:64},(_,i)=>i%2?0:i%4?1:-1))),v=model.gridPeriodView(a);expect(a.episodes).toHaveLength(32);expect(v.pages).toBe(6);expect(v.visible).toHaveLength(6);expect(model.gridPeriodView(a,{page:999}).visible).toHaveLength(2);
    const selected=model.gridPeriodView(a,{selected:a.episodes[25].key,page:0});expect(selected.page).toBe(4);expect(selected.selected.start).toBe(50);expect(model.gridPeriodView(a,{kind:'improved'}).episodes).toHaveLength(16);
  });
  it('preserves period preferences while recomputing results from saved case inputs',()=>{
    const p=model.gridStudyPair(request,{...selection,periods:{open:true,kind:'improved',sort:'energy',moment:'last',selected:'improved:120:150'}});expect(p.periodSelection).toEqual({key:'improved:120:150',page:0,minute:149});expect(model.gridStudyPair(JSON.parse(JSON.stringify(request)),JSON.parse(JSON.stringify(p.view)))).toEqual(p);
    expect(model.gridStudyPair(request,{...selection,periods:{kind:'worsened'}}).rows).toEqual(p.rows);
  });
  it('exports all periods with signed energy, boundaries, and both exact case settings',()=>{
    const p=model.gridStudyPair(request,{...selection,periods:{kind:'improved'}}),rows=csvRows(model.gridPeriodCsv(p)),h=rows[0];expect(rows).toHaveLength(4);
    for(const row of rows.slice(1)){const v=k=>row[h.indexOf(k)],e=p.periods.episodes.find(e=>e.start===Number(v('start_min')));expect(JSON.parse(v('case_a_settings_json'))).toEqual(p.a.settings);expect(JSON.parse(v('case_b_settings_json'))).toEqual(p.b.settings);close(Number(v('unserved_change_kWh')),Number(v('b_unserved_kWh'))-Number(v('a_unserved_kWh')));expect(Number(v('end_min_exclusive'))).toBe(e.end);expect(Number(v('a_end_storage_kWh'))).toBe(e.endStored.a);expect(v('period_version')).toBe('1');}
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass'])it(source+' reconciles period energy, demand supply, boundaries, and interval counts',()=>{
    const p=model.gridStudyPair({settings:{source,profileId:energy.programs[source][0].id,demand:100,grid:'outage',outageStart:30,outageMinutes:60,batteryUnits:2,battery:{capacity:10,power:5,initial:70,roundtrip:64},reserve:20,companion:{enabled:true,source:'wind'},flex:{enabled:true}},config:{min:0,max:200,count:5}},{a:'1:fixed',b:'2:backup'}),a=p.periods;
    close(a.totals.netEnergyChange,p.deltaTotals.unserved);close(a.totals.addedUnserved-a.totals.avoidedUnserved+a.totals.remainingEnergyChange,p.deltaTotals.unserved);expect(a.totals.improvedMinutes).toBe(p.summary.improvedMinutes);expect(a.totals.worsenedMinutes).toBe(p.summary.worsenedMinutes);
    for(const e of a.episodes){for(const side of ['a','b']){close(e.demand,e.direct+e[side].discharge+e[side].grid+e[side].unserved);expect(e.startStored[side]).toBe(p.rows[e.start][side].stored);expect(e.endStored[side]).toBe(p.rows[e.end][side].stored);}close(e.delta.unserved,e.delta.gridLimited+e.delta.gridUnavailable);expect(e.availableMinutes+e.unavailableMinutes).toBe(e.minutes);}
  });
  it('renders the saved period, impact, ledger, and synchronized inspection choices',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...base,gridStudy:{open:true,request,comparison:{...selection,open:true,periods:{open:true,kind:'improved',moment:'last',selected:'improved:120:150'}}}}}}});
    for(const text of ['Explore periods of change','B improves coverage · 120–150 min','Selected moment: minute 149','Inspect period in case A','Inspect period in case B','Storage at minute 150','data-grid-period-band','Export all change periods CSV'])expect(html).toContain(text);expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
