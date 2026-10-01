import {beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});
function payload(id='solarPv',patch={}){return {format:'renewables-mechanism-investigation',modelVersion:1,selected:id,settings:model.settings(id,{}),phase:25.375,readingName:'Saved reading',note:'Observation',...patch};}
const ids=['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage'];
describe('Opening mechanism investigation readings',()=>{
 for(const id of ids){
  it(id+' retains precise inputs and opens without changing unrelated saved work',()=>{
   const settings=Object.fromEntries(model.specs.find(s=>s.id===id).controls.map(c=>[c[0],Number((c[2]+(c[3]-c[2])*.3713).toFixed(7))]));
   const input=payload(id,{settings}),before=JSON.stringify(input),entry=model.importReadings(input).entries[0];
   const state={selected:'wind',settings:{other:{keep:1}},scenarios:{other:{profileId:'keep'}},phases:{other:45},readingNames:{other:'Keep'},notes:{other:'Keep note'},readings:{[id]:[{name:'Existing baseline'}]},experiments:{[id]:{keep:1}},maps:{keep:2},intervals:{keep:3},microgrid:{keep:4}};
   const original=JSON.stringify(state),next=model.openImportedReading(state,entry);
   expect(JSON.stringify(input)).toBe(before);expect(JSON.stringify(state)).toBe(original);expect(next.selected).toBe(id);expect(next.settings[id]).toEqual(settings);expect(next.phases[id]).toBe(25.375);expect(next.scenarios[id]).toEqual({profileId:'steady',minute:0});expect(next.readingNames[id]).toBe('Saved reading');expect(next.notes[id]).toBe('Observation');
   for(const key of ['readings','experiments','maps','intervals','microgrid'])expect(next[key]).toBe(state[key]);
   for(const key of ['settings','scenarios','phases','readingNames','notes']){expect(next[key]).not.toBe(state[key]);expect(next[key].other).toBe(state[key].other);}
   expect(model.simulate(id,next.settings[id],next.phases[id])).toEqual(model.simulate(id,settings,25.375));
  });
  it(id+' rejects missing, non-numeric and out-of-range inputs instead of filling defaults',()=>{
   const spec=model.specs.find(s=>s.id===id),c=spec.controls[0];
   for(const value of [undefined,null,'12',Infinity,NaN,c[2]-1,c[3]+1]){const p=payload(id);p.settings[c[0]]=value;expect(()=>model.importReadings(p)).toThrow(/No supported readings/);}
   const p=payload(id);delete p.settings[c[0]];expect(()=>model.importReadings(p)).toThrow(/No supported readings/);
  });
 }
 it('reopens real legacy mechanism exports',()=>{for(const name of ['mechanisms-investigation.json','operating-investigation.json','intervals-export-battery.json']){const p=JSON.parse(fs.readFileSync('reports/renewables-enhancement/'+name,'utf8')),r=model.importReadings(p);expect(r.entries.length).toBeGreaterThan(0);expect(r.entries[0].settings).toEqual(p.settings);expect(r.entries[0].phase).toBe(p.phase);}});
 it('keeps current and notebook candidates distinct and ignores serialized results',()=>{
  const p=payload('wind',{phase:50,operatingScenario:{profileId:'gust',selectedMinute:9999},result:{power:-999},notebooks:[{id:'solarPv',readings:[{baseSettings:model.settings('solarPv',{area:33.333}),profileId:'steady',phase:12.5,name:'PV notebook',note:'Notebook note',result:{power:-999}}]}]});
  const r=model.importReadings(p);expect(r.skipped).toEqual([]);expect(r.entries.map(e=>e.source)).toEqual(['current','notebook']);expect(r.entries[0].profileId).toBe('gust');expect(r.entries[0].phase).toBe(50);expect(r.entries[1].settings.area).toBe(33.333);expect(r.entries[1].name).toBe('PV notebook');expect(r.entries[0]).not.toHaveProperty('result');
 });
 it('opens a scenario minute while preserving its dormant steady position',()=>{const e=model.importReadings(payload('wind',{phase:50,operatingScenario:{profileId:'gust'}})).entries[0],s={phases:{wind:17}};const next=model.openImportedReading(s,e);expect(next.scenarios.wind).toEqual({profileId:'gust',minute:50});expect(next.phases.wind).toBe(17);});
 it('preserves small solar inputs and signed tidal speed',()=>{const p=payload();p.settings.irradiance=1e-10;expect(model.importReadings(p).entries[0].settings.irradiance).toBe(1e-10);const t=payload('tidal');const c=model.specs.find(s=>s.id==='tidal').controls.find(c=>c[2]<0);expect(c).toBeDefined();t.settings[c[0]]=-1.2345;expect(model.importReadings(t).entries[0].settings[c[0]]).toBe(-1.2345);});
 it('requires the mechanism format and supported model version',()=>{for(const p of [null,[],{},payload('solarPv',{format:'other'}),payload('solarPv',{modelVersion:2}),payload('solarPv',{modelVersion:'1'})])expect(()=>model.importReadings(p)).toThrow();const legacy=payload();delete legacy.format;legacy.title='Renewables Lab: individual energy mechanisms';expect(model.importReadings(legacy).entries).toHaveLength(1);});
 it('skips unsupported candidates while keeping valid notebook readings',()=>{const p=payload('unknown',{notebooks:[{id:'wind',readings:[{baseSettings:model.settings('wind',{}),phase:2,profileId:'steady'}]},null,{id:'wind',readings:[null]}]});const r=model.importReadings(p);expect(r.entries).toHaveLength(1);expect(r.entries[0].id).toBe('wind');expect(r.skipped).toHaveLength(3);});
 it('rejects unsupported profiles and timeline values',()=>{for(const patch of [{phase:-1},{phase:61},{phase:'20'},{phase:NaN},{operatingScenario:{}},{operatingScenario:{profileId:'unknown'}},{phase:1.5,operatingScenario:{profileId:'clouds'}}])expect(()=>model.importReadings(payload('solarPv',patch))).toThrow(/No supported readings/);expect(model.importReadings(payload('storage',{phase:120})).entries[0].phase).toBe(120);expect(()=>model.importReadings(payload('storage',{phase:121}))).toThrow();});
 it('bounds collection sizes',()=>{for(const notebooks of [{},Array(10).fill(null)])expect(()=>model.importReadings(payload('solarPv',{notebooks}))).toThrow(/notebook collection/);const r=model.importReadings(payload('solarPv',{notebooks:[{id:'wind',readings:Array(4).fill(null)}]}));expect(r.entries).toHaveLength(1);expect(r.skipped).toHaveLength(1);});
 it('announces shortened text and rejects non-text names or notes',()=>{const r=model.importReadings(payload('solarPv',{readingName:'x'.repeat(70),note:'n'.repeat(3100)})).entries[0];expect(r.name).toHaveLength(60);expect(r.note).toHaveLength(3000);expect(r.warnings).toHaveLength(2);for(const patch of [{readingName:{}},{note:55}])expect(()=>model.importReadings(payload('solarPv',patch))).toThrow();});
 it('revalidates when opening and copies only supported settings',()=>{const p=payload();p.settings.unexpected=99;const e=model.importReadings(p).entries[0];expect(e.settings).not.toHaveProperty('unexpected');e.settings.area=9999;expect(()=>model.openImportedReading({},e)).toThrow(/Panel area/);});
 it('renders a discoverable opener without opening an unsolicited preview',()=>{const host=document.createElement('div');host.innerHTML=renderTool('renewablesLab',{renewablesLab:{view:'energy3d'}});expect([...host.querySelectorAll('button')].filter(b=>b.textContent==='Open reading from file')).toHaveLength(1);expect(host.querySelector('input[type=file]').accept).toBe('.json,application/json');expect(host.querySelector('[aria-label="Open exported reading"]')).toBeNull();});
});
