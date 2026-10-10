import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const RUNTIMES = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_PATH = 'tests/watercycle_coalescence_visual.test.js';
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
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'wcCoalescenceFrame') {
      if (declaration) throw Error('Duplicate coalescence helper: ' + path);
      declaration = source.slice(node.start, node.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
        node.left.object.name === 'window' && node.left.property.name === 'WaterCycleCoalescenceFrame' &&
        node.right.name === 'wcCoalescenceFrame') {
      if (exported) throw Error('Duplicate coalescence export: ' + path);
      exported = source.slice(node.start, node.end);
    }
  });
  if (!declaration || !exported) throw Error('Missing actual coalescence helper/export: ' + path);
  const context = createContext({ window:{} });
  const script = new Script(declaration + '\n' + exported + ';\n({helper:wcCoalescenceFrame,exported:window.WaterCycleCoalescenceFrame});', { filename:path + ':coalescence' });
  return { path, bytes, context, script };
});
function each(check) {
  for (const source of sources) {
    const runtime = source.script.runInContext(source.context, { timeout:30000 });
    check(runtime.helper, runtime.exported, source.context);
  }
}
afterAll(() => {
  if (process.env.WATER_CYCLE_COALESCENCE_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_COALESCENCE_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt:new Date().toISOString(),
    loadedRuntimes:sources.map(source => ({ path:source.path, sha256:sha(source.bytes), bytes:source.bytes.length })),
    loadedTest:{ path:TEST_PATH, sha256:sha(loadedTest), bytes:loadedTest.length },
  }, null, 2) + '\n');
});

describe('Water Cycle coalescence: actual visual geometry from both runtimes', () => {
  it('exports the actual pure helper from identical shipped source bytes', () => {
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
    each((helper, exported) => {
      expect(exported).toBe(helper);
      expect(typeof helper).toBe('function');
    });
  });
  it('shows two equal incoming drops, contact, then one merged drop at the stage boundaries', () => {
    each(frame => {
      expect(frame(0)).toMatchObject({ cycle:0,stage:'approach',incomingCount:2,mergedCount:0,incomingRadius:1,separation:4.8,fall:0 });
      expect(frame(0.5)).toMatchObject({ cycle:0.5,stage:'touch',incomingCount:2,mergedCount:0,incomingRadius:1,separation:1,fall:0 });
      expect(frame(0.62)).toMatchObject({ cycle:0.62,stage:'merged',incomingCount:0,mergedCount:1,separation:0,fall:0 });
      expect(frame(1)).toMatchObject({ cycle:1,stage:'merged',incomingCount:0,mergedCount:1,separation:0,fall:3.2 });
      expect(frame(0.5 - 1e-8).stage).toBe('approach');
      expect(frame(0.62 - 1e-8).stage).toBe('touch');
    });
  });
  it('conserves spherical water volume when two equal drops combine', () => {
    each(frame => {
      for (const cycle of [0,0.25,0.5,0.619999,0.62,0.8,1]) {
        const state = frame(cycle);
        expect(state.incomingRadius).toBe(1);
        expect(state.mergedRadius).toBeCloseTo(Math.cbrt(2),12);
        expect(state.incomingCount * state.incomingRadius ** 3 + state.mergedCount * state.mergedRadius ** 3).toBeCloseTo(2,12);
        expect(state.incomingCount + state.mergedCount).toBe(cycle < 0.62 ? 2 : 1);
      }
    });
  });
  it('approaches monotonically without overlapping the incoming spheres before they touch', () => {
    each(frame => {
      let previous = Infinity;
      for (let step=0; step<=100; step++) {
        const state = frame(step / 200);
        expect(state.separation).toBeLessThanOrEqual(previous);
        expect(state.separation).toBeGreaterThanOrEqual(state.incomingRadius);
        expect(state.fall).toBe(0);
        previous=state.separation;
      }
      for (const cycle of [0.5,0.53,0.59,0.619999]) {
        const state=frame(cycle);
        expect(2 * state.separation).toBe(2 * state.incomingRadius);
      }
    });
  });
  it('moves the combined drop monotonically downward after the merge within the schematic bounds', () => {
    each(frame => {
      let previous = 0;
      for (let step=0; step<=100; step++) {
        const state = frame(0.62 + 0.38 * step / 100);
        expect(state.fall).toBeGreaterThanOrEqual(previous);
        expect(state.fall).toBeLessThanOrEqual(3.2);
        expect(state.separation).toBe(0);
        expect(state.incomingCount).toBe(0);
        expect(state.mergedCount).toBe(1);
        previous=state.fall;
      }
    });
  });
  it('clamps finite numeric cycle inputs to the demonstrated interval', () => {
    each(frame => {
      for (const cycle of [-Number.MAX_VALUE,-100,-1,-Number.MIN_VALUE]) expect(plain(frame(cycle))).toEqual(plain(frame(0)));
      for (const cycle of [1.00001,2,100,Number.MAX_VALUE]) expect(plain(frame(cycle))).toEqual(plain(frame(1)));
      for (const cycle of [0,Number.MIN_VALUE,0.1,0.5,0.62,0.95,1]) expect(frame(cycle).cycle).toBe(cycle);
    });
  });
  it('defaults nonnumeric and nonfinite input without coercion or accessor execution', () => {
    each(frame => {
      let coercions=0;
      const hostile = Object.freeze({ valueOf(){coercions++;throw Error('Unexpected coercion');},toString(){coercions++;throw Error('Unexpected coercion');} });
      const revoked=Proxy.revocable({},{}); revoked.revoke();
      for (const cycle of [undefined,null,false,true,'','0.75',[],[0.75],{},hostile,revoked.proxy,NaN,Infinity,-Infinity,1n,Symbol('cycle')]) {
        expect(plain(frame(cycle))).toEqual(plain(frame(0)));
      }
      expect(coercions).toBe(0);
    });
  });
  it('returns finite geometry and valid exclusive stages throughout the cycle', () => {
    each(frame => {
      for (let step=0; step<=200; step++) {
        const state=frame(step / 200);
        for (const key of ['cycle','incomingCount','mergedCount','incomingRadius','mergedRadius','separation','fall']) {
          expect(Number.isFinite(state[key])).toBe(true);
          expect(state[key]).toBeGreaterThanOrEqual(0);
        }
        expect(['approach','touch','merged']).toContain(state.stage);
        expect(state.incomingCount > 0).not.toBe(state.mergedCount > 0);
      }
    });
  });
  it('is deterministic across call order and returned-object edits without changing ambient state', () => {
    each((frame, _exported, context) => {
      const globalKeys=Object.keys(context).sort(), windowKeys=Object.keys(context.window).sort();
      const expected=plain(frame(0.75)), changed=frame(0.75);
      changed.fall=999; changed.stage='other'; changed.incomingCount=99;
      for (const cycle of [1,0,0.62,0.5,0.25,0.75,0.75]) frame(cycle);
      expect(plain(frame(0.75))).toEqual(expected);
      expect(frame(0.75)).not.toBe(frame(0.75));
      expect(Object.keys(context).sort()).toEqual(globalKeys);
      expect(Object.keys(context.window).sort()).toEqual(windowKeys);
    });
  });
});
