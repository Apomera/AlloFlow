
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});

describe('Controlled renewable experiments',()=>{
  for(const id of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage']){
    it(id+' varies only one input and reuses steady and full-scenario calculations',()=>{
      for(const profileId of ['steady',...model.programs[id].map(p=>p.id)]){
        const result=model.sweep(id,{profileId,config:{count:5}});
        expect(result.rows.length).toBeGreaterThanOrEqual(2);
        expect(result.rows.length).toBeLessThanOrEqual(5);
        expect(result.unit).toBe(id==='storage'||profileId!=='steady'?'kWh':'kW');
        for(const row of result.rows){
          const changed=Object.keys(row.settings).filter(k=>row.settings[k]!==result.baseSettings[k]);
          expect(changed.every(k=>k===result.config.key)).toBe(true);
          const expected=profileId==='steady'?(id==='storage'?model.simulate(id,row.settings,120).extra.delivered:model.simulate(id,row.settings).power):model.scenario(id,row.settings,profileId).totals.delivered;
          expect(row.result.value).toBeCloseTo(expected,8);
          expect(Number.isFinite(row.result.value)).toBe(true);
          if(id==='storage'){
            expect(row.result.initial+row.result.input-row.result.value-row.result.remainder).toBeCloseTo(row.result.endStored,7);
            if(profileId!=='steady')expect(row.result.requested-row.result.value).toBeCloseTo(row.result.unserved,7);
          }else expect(row.result.input-row.result.value-row.result.remainder).toBeCloseTo(0,6);
        }
      }
    });
  }
  it('samples legal distinct control values, keeps both endpoints, and bounds work',()=>{
    const r=model.sweep('tidal',{config:{key:'speed',low:-.3,high:.3,count:13}});
    expect(r.rows.map(v=>v.value)).toEqual([-.25,0,.25]);
    expect(r.config.low).toBe(-.25);expect(r.config.high).toBe(.25);
    const extreme=model.sweep('storage',{config:{key:'power',low:-5000,high:1e20,count:9999999}});
    expect(extreme.rows.length).toBeLessThanOrEqual(13);
    expect(extreme.rows[0].value).toBe(0);expect(extreme.rows.at(-1).value).toBe(200);
  });
  it('rejects invalid ranges and targets while recovering missing or corrupt optional settings',()=>{
    expect(model.sweep('solarPv',{config:{key:'area',low:40,high:20}})).toBeNull();
    expect(model.sweep('solarPv',{config:{key:'area',low:20,high:20}})).toBeNull();
    for(const target of [-1,Infinity,NaN,'4'])expect(model.sweep('solarPv',{config:{target}})).toBeNull();
    expect(model.sweep('invalid',{})).toBeNull();
    const valid=model.sweep('wind',{profileId:'removed-profile',config:{key:'missing',count:Infinity},settings:{speed:NaN}});
    expect(valid.profileId).toBe('steady');expect(valid.config.key).toBe('radius');expect(valid.rows.length).toBe(9);
    expect(model.sweep('solarPv',{config:{target:0}}).targetMatches.length).toBe(9);
  });
  it('clears a target when its measurement unit changes',()=>{
    expect(model.sweepConfig('solarPv',{target:20,metric:'power'},'clouds').target).toBeNull();
    expect(model.sweepConfig('solarPv',{target:20,metric:'energy'},'clouds').target).toBe(20);
    expect(model.sweepConfig('solarPv',{target:20,metric:'energy'},'steady').target).toBeNull();
  });
  it('matches analytic PV scaling and computes a sampled target without interpolating',()=>{
    const r=model.sweep('solarPv',{settings:{irradiance:1000,incidence:0,area:20},config:{key:'area',low:10,high:50,count:5,target:5}});
    expect(r.rows.map(v=>v.value)).toEqual([10,20,30,40,50]);
    expect(r.reference.value).toBeCloseTo(3.84,8);
    expect(r.rows[1].delta).toBeCloseTo(0,8);
    expect(r.rows[3].percent).toBeCloseTo(100,8);
    expect(r.targetMatches).toEqual([2,3,4]);
    expect(r.rows[2].result.value).toBeCloseTo(5.76,8);
  });
  it('finds an interior wind maximum and counts ties instead of assuming more input is always better',()=>{
    const r=model.sweep('wind',{settings:{radius:80,rating:500},config:{key:'speed',low:0,high:30,count:13}});
    expect(r.rows[0].result.value).toBe(0);expect(r.rows.at(-1).result.value).toBe(0);
    expect(r.highest.length).toBeGreaterThan(1);
    for(const index of r.highest){expect(r.rows[index].value).toBeLessThan(25);expect(r.rows[index].result.value).toBe(500);}
  });
  it('preserves tidal reversal symmetry and finds an unreachable target',()=>{
    const r=model.sweep('tidal',{config:{key:'speed',low:-2,high:2,count:5,target:1e6}});
    expect(r.rows[0].result.value).toBe(r.rows.at(-1).result.value);
    expect(r.rows[2].result.value).toBe(0);expect(r.targetMatches).toEqual([]);
  });
  it('evaluates the full scenario even when the inspection minute has no output',()=>{
    const atStart=model.sweep('solarPv',{profileId:'daylight',phase:0});
    const atEnd=model.sweep('solarPv',{profileId:'daylight',phase:720});
    expect(atStart.rows).toEqual(atEnd.rows);expect(atStart.reference.value).toBeGreaterThan(0);
    expect(atEnd.phase).toBe(720);expect(atEnd.duration).toBe(720);
  });
  it('keeps battery offers fixed and exposes capacity saturation under limited supply',()=>{
    const r=model.sweep('storage',{profileId:'interrupted',config:{key:'capacity',low:10,high:500,count:13}});
    expect(new Set(r.rows.map(v=>Number(v.result.requested.toFixed(8)))).size).toBe(1);
    expect(r.rows.at(-1).result.value).toBeCloseTo(44,7);
    expect(r.rows.at(-1).result.unserved).toBeCloseTo(31,7);
    expect(r.highest.length).toBeGreaterThan(1);
    expect(r.rows[0].result.value).toBeLessThan(44);
  });
  it('captures shutdown and input clipping counts in operating experiments',()=>{
    const r=model.sweep('wind',{profileId:'gust',config:{key:'speed',low:8,high:30,count:5}});
    expect(r.rows.every(v=>v.result.shutdownMinutes>0)).toBe(true);
    expect(r.rows.some(v=>v.result.clippedMinutes>0)).toBe(true);
  });
  it('keeps the reference independent of the sampled range and avoids percentages from zero',()=>{
    const r=model.sweep('solarPv',{settings:{area:100,irradiance:0},config:{key:'irradiance',low:100,high:500,count:5}});
    expect(r.baseSettings.irradiance).toBe(0);expect(r.rows.every(v=>v.percent===null)).toBe(true);
    expect(r.rows.every(v=>v.delta>0)).toBe(true);
  });
  it('does not mutate captured settings and recomputes identical experiments after serialization',()=>{
    const request={settings:{area:20},profileId:'clouds',phase:50,config:{key:'area',low:10,high:50,count:5},prediction:'Doubling area doubles energy.'};
    const original=JSON.stringify(request),first=model.sweep('solarPv',request);
    expect(JSON.stringify(request)).toBe(original);
    request.settings.area=40;
    expect(first.baseSettings.area).toBe(20);
    expect(model.sweep('solarPv',JSON.parse(original))).toEqual(first);
  });
  it('renders stored results with target, prediction, conclusion, and model context',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:{
      selected:'storage',experiments:{storage:{run:{settings:{},profileId:'interrupted',phase:150,config:{key:'capacity',low:10,high:500,count:9,target:50},prediction:'More capacity may stop helping.'},conclusion:'Charging supply is limited.'}}
    }}});
    for(const text of ['Controlled experiment bench','Highest sampled result','Export experiment CSV','Inspect trial in 3D','Restore experiment reference','Unserved (kWh)','More capacity may stop helping.','Charging supply is limited.','These results retain their recorded inputs.'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });

  it('does not treat zero as a tiny positive target or collapse small outputs into ties',()=>{
    const zero=model.sweep('solarPv',{settings:{incidence:90},config:{target:1e-10}});
    expect(zero.targetMatches).toEqual([]);
    const tiny=model.sweep('solarPv',{settings:{irradiance:1e-9},config:{key:'area',count:5}});
    expect(tiny.highest).toEqual([4]);expect(tiny.rows[0].percent).toBeCloseTo(-75,7);
    const subnormal=model.sweep('solarPv',{settings:{irradiance:1e-320},config:{key:'irradiance'}});
    expect(subnormal.rows.every(r=>r.percent===null||Number.isFinite(r.percent))).toBe(true);
  });
  it('rejects object prototype names as technology identifiers',()=>{
    for(const id of ['__proto__','constructor','toString'])expect(model.sweep(id,{})).toBeNull();
  });

});
