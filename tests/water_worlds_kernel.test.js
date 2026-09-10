import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function kernel(path='stem_lab/water_worlds_kernel.js') { const context={};vm.runInNewContext(readFileSync(path,'utf8'),context);return context.WaterWorldsKernel; }
const K=kernel();
function finish(s){return K.advance(K.begin(s,false),240);}
function cover(s,type){return K.edit(s,s.world.cells.map((_,i)=>i),type);}
describe('Water Worlds conserved watershed',()=>{
  it('accounts for prescribed rainfall, stored water, and all domain losses',()=>{
    const s=finish(K.initial()),m=K.measure(s.world);
    expect(s.run.complete).toBe(true);
    expect(m.rainM3).toBeCloseTo(45*40/60*96*400/1000,7);
    expect(Math.abs(m.errorM3)).toBeLessThan(1e-7);
    expect(m.outM3).toBeGreaterThan(0);
    expect(m.soilM3).toBeGreaterThan(K.measure(s.run.start).soilM3);
    expect(s.world.cells.every(c=>c.surface>=0&&c.soil>=0&&c.soil<=120&&c.ground>=0)).toBe(true);
  });
  it('keeps an initially dry closed domain dry without adding water',()=>{
    let w=K.create(0);for(let i=0;i<240;i++)w=K.step(w,0,.25,{closed:true});
    expect(K.total(w)).toBe(0);expect(w.outM3).toBe(0);expect(w.evapM3).toBe(0);
  });
  it('conserves water in a closed basin including evaporation',()=>{
    let w=K.create(100);for(let i=0;i<480;i++)w=K.step(w,80,.25,{closed:true});
    expect(w.outM3).toBe(0);expect(K.total(w)+w.evapM3).toBeCloseTo(w.initialM3+w.rainM3,7);
  });
  it('changes runoff with antecedent wetness under the same storm',()=>{
    const dry=K.initial(),wet=K.initial();dry.world=K.create(0);wet.world=K.create(95);
    const a=finish(dry),b=finish(wet);
    expect(b.world.outM3).toBeGreaterThan(a.world.outM3);
    expect(b.world.peak).toBeGreaterThan(a.world.peak);
  });
  it('retains soil and surface water across subsequent storms',()=>{
    const first=finish(K.initial()),second=K.begin(first,false);
    expect(second.run.start.cells).toEqual(first.world.cells);
    expect(second.world.minutes).toBe(first.world.minutes);
    expect(second.run.paired).toBe(false);
  });
  it('replays exactly when cover is unchanged, independent of UI stepping',()=>{
    const baseline=K.record(finish(K.initial()));let replay=K.begin(baseline,true);
    for(let i=0;i<7;i++)replay=K.advance(replay,15);
    expect(replay.run.complete).toBe(true);
    expect(replay.world).toEqual(baseline.world);
    expect(replay.run.samples).toEqual(baseline.run.samples);
  });
  it('isolates land-cover changes while restoring all initial water stores and weather',()=>{
    const a=K.record(finish(cover(K.initial(),'paved'))),saved=JSON.stringify(a.baseline);
    let b=cover(a,'forest');b.settings={rain:10,duration:10,wetness:0};b=K.begin(b,true);
    expect(b.run.forcing).toEqual(a.baseline.run.forcing);
    expect(b.world.cells.map(c=>c.soil)).toEqual(a.baseline.run.start.cells.map(c=>c.soil));
    b=K.advance(b,240);
    expect(K.result(b.world,b.run).outflowM3).toBeLessThan(K.result(a.world,a.run).outflowM3);
    expect(JSON.stringify(b.baseline)).toBe(saved);
    expect(b.run.paired).toBe(true);
  });
  it('gives retention areas finite surface storage and eventual overflow',()=>{
    const s=cover(K.initial(),'basin');s.settings={rain:100,duration:120,wetness:95};
    const end=finish(s);expect(end.world.outM3).toBeGreaterThan(0);
    expect(end.world.cells.some(c=>c.cover==='basin'&&c.surface>1)).toBe(true);
    expect(Math.abs(K.measure(end.world).errorM3)).toBeLessThan(1e-7);
  });
  it('blocks editing during an active experiment and keeps stream channels connected',()=>{
    const s=K.begin(K.initial(),false);expect(K.edit(s,[1],'paved')).toBe(s);
    expect(cover(K.initial(),'paved').world.cells.filter(c=>c.cover==='stream')).toHaveLength(16);
  });
  it('moves internal drainage without manufacturing or losing water',()=>{
    let w=K.create(100);for(let i=0;i<60;i++)w=K.step(w,0,.25);
    expect(K.measure(w).groundM3).toBeGreaterThan(0);expect(Math.abs(K.measure(w).errorM3)).toBeLessThan(1e-7);
  });
  it('bounds outgoing flows and converges under a smaller numerical step',()=>{
    function run(dt){let w=K.create(70);for(let t=0;t<60-1e-8;t+=dt)w=K.step(w,55,dt);return w;}
    const coarse=run(.25),fine=run(.125);
    expect(Math.abs(coarse.outM3-fine.outM3)/fine.outM3).toBeLessThan(.02);
    expect(Math.abs(K.measure(fine).errorM3)).toBeLessThan(1e-7);
  });
  it('restores in a paused state and safely rejects malformed saved worlds',()=>{
    const s=K.advance(K.begin(K.initial(),false),15),restored=K.restore(JSON.parse(JSON.stringify(s)));
    expect(restored.running).toBe(false);expect(restored.world).toEqual(s.world);
    const bad=JSON.parse(JSON.stringify(s));bad.world.cells[0].soil=-1;expect(K.restore(bad).world.minutes).toBe(0);
    expect(K.restore({version:999}).world.minutes).toBe(0);
  });
  it('exports detached evidence with physical units and comparison provenance',()=>{
    const s=K.record(finish(K.initial())),e=K.evidence(s);e.baseline.world.cells[0].soil=0;
    expect(s.baseline.world.cells[0].soil).toBeGreaterThan(0);
    expect(e.modelVersion).toBe(1);expect(e.result.rainfallM3).toBeGreaterThan(0);
    expect(e.comparison).toMatch(/Exploratory/);
  });
  it('ships identical source and desktop kernels and views',()=>{
    for(const name of ['water_worlds_kernel.js','water_worlds_view.js'])expect(readFileSync('stem_lab/'+name,'utf8')).toBe(readFileSync('desktop/web-app/public/stem_lab/'+name,'utf8'));
  });
});

describe('Water Cycle science refinements',()=>{
  it('does not turn refrozen rain into a snow crystal',()=>{
    const src=readFileSync('stem_lab/stem_tool_watercycle.js','utf8'),start=src.indexOf('  var WC_PILOT_UNIT_M ='),exportAt=src.indexOf('  window.WaterCyclePilotKernel = {'),end=src.indexOf('\n  };',exportAt),host={};
    new Function('window',src.slice(start,end+5))(host);
    const P=host.WaterCyclePilotKernel,env=P.environment('mountainWinter');
    expect(P.nextForm({...P.initialState('mountainWinter'),form:'rain',altitudeM:env.freezingM+100},env)).toBe('');
  });
});
