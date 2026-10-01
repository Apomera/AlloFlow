import {beforeEach,describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const soil={enabled:true,detritus:30,nutrients:4,decomposers:8};
const nutrientTotal=r=>r.soil.detritus+r.soil.nutrients+r.soil.exported+0.1*(r.soil.decomposers+Object.values(r.values).reduce((a,b)=>a+b,0));
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
describe('optional forest-floor nutrient cycle',()=>{
  it('preserves every legacy trajectory and CSV byte with soil cycling off',()=>{
    const fixtures=JSON.parse(readFileSync('tests/fixtures/ecosystem-soil-legacy.json','utf8'));
    const hash=v=>createHash('sha256').update(v).digest('hex');
    for(const f of fixtures){const pair=api.compare(f.config);expect(hash(JSON.stringify(pair.baseline))).toBe(f.baseline);expect(hash(JSON.stringify(pair.experiment))).toBe(f.experiment);expect(hash(api.csv(pair))).toBe(f.csv);expect(pair.soilEnabled).toBe(false);}
  });
  it('normalizes optional pools and prevents soil disturbances when disabled',()=>{
    expect(api.normalize({event:'clearLitter'}).event).toBe('none');
    expect(api.normalize({soil:{enabled:'true'}}).soil.enabled).toBe(false);
    expect(api.normalize({soil:{enabled:true,detritus:-1,nutrients:999,decomposers:Infinity}}).soil).toEqual({enabled:true,detritus:0,nutrients:160,decomposers:8});
  });
  it('conserves tracked nutrients through all food-web and soil disturbances',()=>{
    for(const event of ['none','decomposerDecline','clearLitter','remove','reduce','drought','restoreCover','clearCover']){
      const pair=api.compare({soil,event,target:'plants',enabled:{caterpillars:true,bluetits:true}});
      for(const branch of ['baseline','experiment'])for(const row of pair[branch])expect(nutrientTotal(row)).toBeCloseTo(nutrientTotal(pair[branch][0]),9);
    }
  });
  it('applies decomposer mortality at the event, retaining dead biomass in organic matter',()=>{
    const pair=api.compare({soil,event:'decomposerDecline',eventStep:80}),b=pair.baseline[80],e=pair.experiment[80];
    expect(pair.baseline.slice(0,80)).toEqual(pair.experiment.slice(0,80));
    expect(e.soil.decomposers).toBeCloseTo(b.soil.decomposers*0.2,12);
    expect(e.soil.detritus-b.soil.detritus).toBeCloseTo(b.soil.decomposers*0.08,12);
    expect(e.soil.nutrients).toBe(b.soil.nutrients);expect(e.values).toEqual(b.values);
    expect(pair.experiment[100].soil.nutrients).toBeLessThan(pair.baseline[100].soil.nutrients);
  });
  it('exports removed litter instead of turning it into instant nutrients',()=>{
    const pair=api.compare({soil,event:'clearLitter'}),b=pair.baseline[80],e=pair.experiment[80];
    expect(e.soil.detritus).toBe(0);expect(e.soil.exported).toBe(b.soil.detritus);expect(e.soil.nutrients).toBe(b.soil.nutrients);expect(e.values).toEqual(b.values);
  });
  it('requires nutrients for plant growth and living microbes for decomposition',()=>{
    const enabled={rabbits:false,voles:false,foxes:false,owls:false};
    const base={enabled,event:'none',initial:{plants:25},soil:{...soil,nutrients:0,decomposers:0}};
    const noMicrobes=api.run(base,false),microbes=api.run({...base,soil:{...base.soil,decomposers:8}},false);
    expect(noMicrobes[240].values.plants).toBeLessThan(25);
    expect(noMicrobes.every(r=>r.soil.decomposers===0&&r.soil.nutrients===0)).toBe(true);
    expect(microbes[240].values.plants).toBeGreaterThan(noMicrobes[240].values.plants);
    const empty=api.run({enabled,initial:{plants:0},soil:{enabled:true,detritus:0,nutrients:0,decomposers:0}},false);
    expect(empty.every(r=>nutrientTotal(r)===0)).toBe(true);
  });
  it('keeps extreme pools nonnegative and converges as the timestep is refined',()=>{
    const config={soil,event:'decomposerDecline',enabled:{caterpillars:true,bluetits:true}},a=api.run(config,true),b=api.run(config,true,16);
    expect(Math.max(...a.flatMap((r,i)=>[...Object.keys(r.soil).map(k=>Math.abs(r.soil[k]-b[i].soil[k])),...api.species.map(sp=>Math.abs(r.values[sp.id]-b[i].values[sp.id]))]))).toBeLessThan(0.5);
    const extreme=api.run({...config,capacity:40,soil:{enabled:true,detritus:160,nutrients:160,decomposers:80},initial:Object.fromEntries(api.species.map(sp=>[sp.id,160]))},true);
    expect(extreme.every(r=>[...Object.values(r.values),...Object.values(r.soil)].every(v=>Number.isFinite(v)&&v>=0))).toBe(true);
  });
  it('exports both soil trajectories with and without optional insect groups',()=>{
    for(const insects of [false,true]){const pair=api.compare({soil,enabled:{caterpillars:insects,bluetits:insects}}),rows=api.csv(pair).split('\r\n').map(r=>r.split(','));
      expect(rows.every(r=>r.length===(insects?27:23))).toBe(true);const index=rows[0].indexOf('soil_nutrients_experiment');expect(Number(rows[121][index])).toBeCloseTo(pair.experiment[120].soil.nutrients,8);}
  });
  it('preserves soil evidence and rejects missing, negative or nonfinite soil samples',()=>{
    const config={soil,event:'decomposerDecline'},pair=api.compare(config),note=api.capture(config,pair,120,'plants','Recycling slows','Check plant response',1),before=JSON.stringify(note);
    expect(api.notebook([note])[0]).toEqual(note);expect(api.notebookText([note])).toContain('Soil nutrients |');
    expect(JSON.stringify(note)).toBe(before);
    for(const bad of [undefined,{...note.experiment.soil,nutrients:-1},{...note.experiment.soil,nutrients:Infinity}])expect(api.notebook([{...note,experiment:{...note.experiment,soil:bad}}])).toHaveLength(0);
    const old=api.capture({},api.compare({}),80,'foxes','','',2);delete old.config.soil;
    expect(api.notebook([old])[0].config.soil.enabled).toBe(false);
  });
});
