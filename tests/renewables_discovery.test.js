import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
const ids=['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass','storage'];
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;});

describe('Guided mechanism discoveries',()=>{
  for(const id of ids)it(id+' compares one normalized control at one shared context using the actual model',()=>{
    const d=model.discovery(id),a=d.a,b=d.b;
    expect(a.profileId).toBe('steady');expect(b.profileId).toBe(a.profileId);expect(a.minute).toBe(b.minute);
    expect(Object.keys(a.settings).filter(k=>a.settings[k]!==b.settings[k])).toHaveLength(1);
    for(const c of[a,b]){
      expect(c.settings).toEqual(model.settings(id,c.settings));
      expect(c.run).toEqual(model.simulate(id,c.settings,c.minute));
      expect(Number.isFinite(c.run.power)).toBe(true);
      if(id!=='storage')expect(c.run.available-c.run.power-c.run.loss).toBeCloseTo(0,7);
    }
    const copy=model.discovery(id);d.a.settings[Object.keys(a.settings)[0]]=999999;
    expect(model.discovery(id)).toEqual(copy);
  });
  it('captures shutdown, reversal, squared wave response and PV incidence without assuming that more input means more power',()=>{
    const wind=model.discovery('wind'),tide=model.discovery('tidal'),wave=model.discovery('wave'),pv=model.discovery('solarPv');
    expect(wind.a.run.power).toBeGreaterThan(0);expect(wind.b.run.power).toBe(0);expect(wind.b.run.status).toBe('Protective shutdown');
    expect(tide.a.settings.speed).toBe(-tide.b.settings.speed);expect(tide.a.run.power).toBe(tide.b.run.power);
    expect(wave.b.run.power/wave.a.run.power).toBeCloseTo(4,10);expect(pv.b.run.power/pv.a.run.power).toBeCloseTo(.5,10);
  });
  it('distinguishes extra battery capacity from available charging energy',()=>{
    const d=model.discovery('storage');expect(d.a.minute).toBe(90);expect(d.a.settings.initial).toBe(0);
    expect(d.b.settings.capacity).toBe(d.a.settings.capacity*2);
    expect(d.a.run.power).toBe(50);expect(d.b.run.power).toBe(50);
    expect(d.a.run.extra.stored).toBeCloseTo(d.b.run.extra.stored,10);
    expect(d.a.run.extra.charge).toBe(d.b.run.extra.charge);
    expect(d.a.run.extra.soc).toBeCloseTo(d.b.run.extra.soc*2,10);
  });
  it('keeps downstream biomass improvements separate from fuel and boiler heat',()=>{
    const d=model.discovery('biomass');expect(d.b.run.power).toBeGreaterThan(d.a.run.power);
    expect(d.a.run.available).toBe(d.b.run.available);expect(d.a.run.stages[1].value).toBe(d.b.run.stages[1].value);
  });
  for(const id of ids)it(id+' applies and restores a scenario without mutating notebook, other technologies or captured settings',()=>{
    const profile=model.programs[id][0],original={settings:model.settings(id,{}),profileId:profile.id,minute:Math.floor(profile.duration/2)};
    const session={version:1,original,prediction:'more',revealed:false};
    const state={selected:id,settings:{[id]:original.settings,untouched:{power:17}},scenarios:{[id]:{profileId:profile.id,minute:original.minute},untouched:{profileId:'other',minute:8}},phases:{[id]:17,untouched:11},readings:{[id]:[{settings:original.settings,name:'My saved work'}]},notes:{[id]:'My observation'},discoveries:{untouched:{version:1}}};
    const before=JSON.stringify(state),captured=JSON.stringify(session),d=model.discovery(id);
    const a=model.applyDiscovery(state,id,session,d.a),b=model.applyDiscovery(a,id,{...session,revealed:true},d.b),restored=model.applyDiscovery(b,id,null,original);
    expect(JSON.stringify(state)).toBe(before);expect(JSON.stringify(session)).toBe(captured);
    expect(a.settings[id]).toEqual(d.a.settings);expect(b.settings[id]).toEqual(d.b.settings);
    expect(restored.settings[id]).toEqual(original.settings);expect(restored.scenarios[id]).toEqual({profileId:profile.id,minute:original.minute});
    expect(restored.readings).toBe(state.readings);expect(restored.notes).toBe(state.notes);
    expect(restored.settings.untouched).toBe(state.settings.untouched);expect(restored.scenarios.untouched).toBe(state.scenarios.untouched);expect(restored.phases.untouched).toBe(11);
    expect(restored.discoveries[id]).toBeUndefined();expect(restored.discoveries.untouched).toBe(state.discoveries.untouched);
  });
  it('retains the original snapshot through prediction-only changes and restores a fractional steady battery minute',()=>{
    const original={settings:model.settings('storage',{capacity:130,initial:35}),profileId:'steady',minute:87.5};
    const session={version:1,original,prediction:null,revealed:false},state={selected:'storage',settings:{storage:original.settings},phases:{storage:original.minute}};
    const a=model.applyDiscovery(state,'storage',session,model.discovery('storage').a),prediction=model.applyDiscovery(a,'storage',{...session,prediction:'same'});
    expect(prediction.settings).toBe(a.settings);expect(prediction.phases).toBe(a.phases);
    const restored=model.applyDiscovery(prediction,'storage',null,original);expect(restored.phases.storage).toBe(87.5);expect(restored.settings.storage).toEqual(original.settings);
  });
});

function panel(id,session,setup){
  const state={selected:id,settings:{[id]:setup?.settings||{}},scenarios:{[id]:{profileId:setup?.profileId||'steady',minute:setup?.minute||0}},phases:{[id]:setup?.minute||0},discoveries:session?{[id]:session}:{}};
  const before=JSON.stringify(state),host=document.createElement('div');
  host.innerHTML=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:state}});
  expect(JSON.stringify(state)).toBe(before);return host.querySelector('.rn-energy-discovery');
}
describe('Discovery evidence and disclosure',()=>{
  for(const id of ids)it(id+' offers a discovery without automatically changing setup or revealing the answer',()=>{
    const p=panel(id);expect(p).not.toBeNull();expect(p.textContent).toContain('Quick discovery');
    expect(p.querySelector('[data-discovery-result]')).toBeNull();expect(p.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });
});
