import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const enabled={caterpillars:true,bluetits:true};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
describe('optional plant–insect–bird pathway',()=>{
  it('keeps old setups on the original community until optional groups are enabled',()=>{
    expect(api.normalize({}).enabled.caterpillars).toBe(false);
    expect(api.normalize({}).enabled.bluetits).toBe(false);
    const pair=api.compare({});
    expect(pair.species).toHaveLength(5);
    expect(pair.baseline.every(r=>r.values.caterpillars===0&&r.values.bluetits===0)).toBe(true);
    expect(api.csv(pair).split('\r\n')[0].split(',')).toHaveLength(15);
  });
  it('applies insect loss exactly at the event and produces a delayed bird response',()=>{
    const pair=api.compare({enabled,event:'reduce',target:'caterpillars',eventStep:80});
    expect(pair.experiment.slice(0,80)).toEqual(pair.baseline.slice(0,80));
    expect(pair.experiment[80].values.caterpillars).toBe(pair.baseline[80].values.caterpillars*0.2);
    expect(pair.experiment[80].values.bluetits).toBe(pair.baseline[80].values.bluetits);
    expect(pair.experiment[120].values.bluetits).toBeLessThan(pair.baseline[120].values.bluetits);
  });
  it('links caterpillars to plants and bird growth to insect food',()=>{
    const base=api.run({event:'none'},false),more=api.run({enabled,event:'none'},false);
    expect(more[20].values.plants).toBeLessThan(base[20].values.plants);
    const noFood=api.run({enabled:{bluetits:true},event:'none'},false);
    expect(more[120].values.bluetits).toBeGreaterThan(noFood[120].values.bluetits);
    const removed=api.run({enabled,event:'remove',target:'caterpillars'},true);
    expect(removed.slice(80).every(r=>r.values.caterpillars===0)).toBe(true);
  });
  it('exports enabled optional groups even when starting at zero',()=>{
    const pair=api.compare({enabled,initial:{caterpillars:0,bluetits:0}});
    const rows=api.csv(pair).split('\r\n').map(r=>r.split(','));
    expect(rows.every(r=>r.length===19)).toBe(true);
    expect(rows[0]).toContain('bluetits_experiment');
    expect(rows[0]).toContain('caterpillars_baseline');
  });
  it('migrates old notebook evidence without rewriting it or inventing optional populations',()=>{
    const note=api.capture({},api.compare({}),80,'foxes','prediction','evidence',1);
    for(const id of ['caterpillars','bluetits']){
      delete note.config.enabled[id];delete note.config.initial[id];
      delete note.baseline.values[id];delete note.experiment.values[id];
    }
    const original=JSON.stringify(note),restored=api.notebook([note])[0];
    expect(restored.experiment.values.foxes).toBe(note.experiment.values.foxes);
    expect(restored.experiment.values.caterpillars).toBe(0);
    expect(restored.config.enabled.bluetits).toBe(false);
    expect(JSON.stringify(note)).toBe(original);
    note.config.enabled.caterpillars=true;
    expect(api.notebook([note])).toHaveLength(0);
  });
  it('remains finite and converges when the integration step is refined',()=>{
    const config={enabled,event:'reduce',target:'caterpillars'};
    const coarse=api.run(config,true,4),fine=api.run(config,true,8);
    expect(Math.max(...coarse.flatMap((r,i)=>api.species.map(sp=>Math.abs(r.values[sp.id]-fine[i].values[sp.id]))))).toBeLessThan(0.5);
    const extreme=api.run({enabled,capacity:40,initial:Object.fromEntries(api.species.map(sp=>[sp.id,160]))},true);
    expect(extreme.every(r=>Object.values(r.values).every(v=>Number.isFinite(v)&&v>=0))).toBe(true);
  });
  it('keeps optional representative paths bounded, reproducible and still in reduced motion',()=>{
    for(const id of ['caterpillars','bluetits'])for(let i=0;i<16;i++){
      expect(api.meadowPose(id,i,24,true)).toEqual(api.meadowPose(id,i,0,true));
      for(const t of [0,8,16,24]){const p=api.meadowPose(id,i,t,false);expect(Object.values(p).every(Number.isFinite)).toBe(true);expect(Math.abs(p.x)).toBeLessThan(10);expect(Math.abs(p.z)).toBeLessThan(8);}
    }
  });
});
