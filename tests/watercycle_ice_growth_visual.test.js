import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const RUNTIMES = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_PATH = 'tests/watercycle_ice_growth_visual.test.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString();
const loadedTest = readFileSync(TEST_PATH);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
const sources = RUNTIMES.map(path => {
  const bytes = readFileSync(path), source = bytes.toString('utf8');
  let declaration = null, exported = null;
  walk(parse(source, { ecmaVersion:'latest' }), node => {
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'wcIceGrowthFrame') {
      if (declaration) throw Error('Duplicate ice_growth helper: ' + path);
      declaration = source.slice(node.start, node.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
        node.left.object.name === 'window' && node.left.property.name === 'WaterCycleIceGrowthFrame' &&
        node.right.name === 'wcIceGrowthFrame') {
      if (exported) throw Error('Duplicate ice_growth export: ' + path);
      exported = source.slice(node.start, node.end);
    }
  });
  if (!declaration || !exported) throw Error('Missing actual ice_growth helper/export: ' + path);
  const context = createContext({ window:{} });
  const script = new Script(declaration + '\n' + exported + ';\n({helper:wcIceGrowthFrame,exported:window.WaterCycleIceGrowthFrame});', { filename:path + ':ice_growth' });
  return { path, bytes, context, script };
});
function each(check) {
  for (const source of sources) {
    const runtime = source.script.runInContext(source.context, { timeout:30000 });
    check(runtime.helper, runtime.exported, source.context);
  }
}
afterAll(() => {
  if (process.env.WATER_CYCLE_ICE_GROWTH_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_ICE_GROWTH_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt:new Date().toISOString(),
    loadedRuntimes:sources.map(source => ({ path:source.path, sha256:sha(source.bytes), bytes:source.bytes.length })),
    loadedTest:{ path:TEST_PATH, sha256:sha(loadedTest), bytes:loadedTest.length },
  }, null, 2) + '\n');
});

describe('Water Cycle ice deposition: actual geometry from both runtimes', () => {
  it('exports the helper from identical shipped runtimes',()=>{
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));each((helper,exported)=>expect(exported).toBe(helper));
  });
  it('holds a seed, grows, then holds a mature crystal at the exact stage boundaries',()=>each(frame=>{
    expect(frame(0)).toMatchObject({cycle:0,stage:'seed',radius:.45,tracerCount:3});
    expect(frame(.25)).toMatchObject({stage:'growing',radius:.45});
    expect(frame(.82)).toMatchObject({stage:'grown',radius:1,tracerCount:0});
    expect(frame(1)).toMatchObject({stage:'grown',radius:1,tracerCount:0});
    expect(frame(.25-1e-8).stage).toBe('seed');expect(frame(.82-1e-8).stage).toBe('growing');
  }));
  it('keeps six equal radial arms spaced at sixty degrees at every growth stage',()=>each(frame=>{
    for(const cycle of [0,.25,.4,.6,.81,.82,1]){
      const f=frame(cycle);expect(f.segments).toHaveLength(30);const arms=[];
      for(let a=0;a<6;a++){const s=f.segments[a*5];expect(s.x1).toBe(0);expect(s.y1).toBe(0);expect(Math.hypot(s.x2,s.y2)).toBeCloseTo(f.radius,12);arms.push([s.x2/f.radius,s.y2/f.radius]);}
      arms.forEach((a,i)=>expect(a[0]*arms[(i+1)%6][0]+a[1]*arms[(i+1)%6][1]).toBeCloseTo(.5,12));
      for(const s of f.segments)for(const n of Object.values(s))expect(Number.isFinite(n)).toBe(true);
    }
  }));
  it('grows connected branches within the crystal outline instead of detached glints',()=>each(frame=>{
    for(const cycle of [.3,.55,.81,1]){
      const f=frame(cycle);
      for(let a=0;a<6;a++)for(let b=1;b<=4;b++){
        const s=f.segments[a*5+b],arm=f.segments[a*5];
        expect(Math.abs(s.x1*arm.y2-s.y1*arm.x2)).toBeLessThan(1e-12);
        expect(Math.hypot(s.x1,s.y1)).toBeLessThan(f.radius);
        expect(Math.hypot(s.x2,s.y2)).toBeLessThanOrEqual(f.radius);
        expect(Math.hypot(s.x2-s.x1,s.y2-s.y1)).toBeGreaterThan(0);
      }
    }
  }));
  it('grows monotonically while vapor tracers approach from outside and vanish at maturity',()=>each(frame=>{
    let radius=0,tracer=Infinity;
    for(let step=0;step<=200;step++){
      const f=frame(step/200);expect(f.radius).toBeGreaterThanOrEqual(radius);expect(f.radius).toBeLessThanOrEqual(1);
      expect(f.tracerRadius).toBeLessThanOrEqual(tracer);expect(f.tracerRadius+1e-12).toBeGreaterThanOrEqual(f.radius);
      expect(f.tracerAlpha).toBeGreaterThanOrEqual(0);expect(f.tracerAlpha).toBeLessThanOrEqual(1);
      expect(f.tracerCount).toBe(f.stage==='grown'?0:3);radius=f.radius;tracer=f.tracerRadius;
    }
  }));
  it('clamps finite inputs and rejects coercion of nonnumeric or nonfinite inputs',()=>each(frame=>{
    for(const cycle of [-1,-Number.MAX_VALUE])expect(plain(frame(cycle))).toEqual(plain(frame(0)));
    for(const cycle of [2,Number.MAX_VALUE])expect(plain(frame(cycle))).toEqual(plain(frame(1)));
    let calls=0;const hostile={valueOf(){calls++;throw Error('Coercion');}};
    for(const cycle of [null,undefined,true,false,'0.5',[],{},hostile,NaN,Infinity,-Infinity,1n,Symbol('cycle')])expect(plain(frame(cycle))).toEqual(plain(frame(0)));
    expect(calls).toBe(0);
  }));
  it('returns independent deterministic geometry without mutating ambient state',()=>each((frame,_exported,context)=>{
    const expected=plain(frame(.5)),keys=Object.keys(context),changed=frame(.5);changed.segments[0].x2=999;changed.segments.push({});changed.radius=99;
    [0,1,.2,.8].forEach(frame);expect(plain(frame(.5))).toEqual(expected);expect(Object.keys(context)).toEqual(keys);
  }));
});
