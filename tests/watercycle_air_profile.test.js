import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const RUNTIMES = process.env.WATER_CYCLE_AIR_PROFILE_TEST_SOURCES
  ? JSON.parse(process.env.WATER_CYCLE_AIR_PROFILE_TEST_SOURCES)
  : ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const plain = value => JSON.parse(JSON.stringify(value));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
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
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'wcPrecipAirProfile') {
      if (declaration) throw Error('Duplicate air profile helper: ' + path);
      declaration = source.slice(node.start, node.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
        node.left.object.name === 'window' && node.left.property.name === 'WaterCycleAirProfile' &&
        node.right.name === 'wcPrecipAirProfile') {
      if (exported) throw Error('Duplicate air profile export: ' + path);
      exported = source.slice(node.start, node.end);
    }
  });
  if (!declaration || !exported) throw Error('Missing actual air profile helper/export: ' + path);
  const context = createContext({ window:{} });
  const script = new Script(declaration + '\n' + exported + ';\n({helper:wcPrecipAirProfile,exported:window.WaterCycleAirProfile});', { filename:path + ':air_profile' });
  return { path, bytes, context, script };
});
function each(check) {
  for (const source of sources) {
    const runtime = source.script.runInContext(source.context, { timeout:30000 });
    check(runtime.helper, runtime.exported, source.context);
  }
}
const profile = temperatures => temperatures.map((temperatureC, index) => ({
  progress:[0, .55, 1][index], temperatureC, label:['Cloud', 'Mid-air', 'Ground'][index],
}));

describe('Water Cycle precipitation: exact display air profile', () => {
  it('exports the actual helper from identical shipped runtimes', () => {
    for (const source of sources) expect(sha(source.bytes)).toBe(sha(sources[0].bytes));
    each((helper, exported) => expect(exported).toBe(helper));
  });
  it('places near-cloud and near-ground crossings at exact interpolated positions', () => each(helper => {
    const warming = helper(profile([-1, 25, 35]));
    expect(warming.crossings).toHaveLength(1);
    expect(warming.crossings[0].progress).toBeCloseTo(.55 / 26, 14);
    expect(warming.crossings[0].progress).toBeLessThan(.03);
    expect(warming.crossings[0].direction).toBe('warming');
    const cooling = helper(profile([35, 25, -1]));
    expect(cooling.crossings).toHaveLength(1);
    expect(cooling.crossings[0].progress).toBeCloseTo(.55 + .45 * 25 / 26, 14);
    expect(cooling.crossings[0].progress).toBeGreaterThan(.98);
    expect(cooling.crossings[0].direction).toBe('cooling');
  }));
  it('reports both full crossings in profile order', () => each(helper => {
    const result = plain(helper(profile([-5, 5, -5])));
    expect(result.crossings).toEqual([{ progress:.275, direction:'warming' }, { progress:.775, direction:'cooling' }]);
    expect(result.touches).toEqual([]);
    expect(result.zeroBands).toEqual([]);
    expect(result.summary).toBe('Air crosses 0°C twice (warming, then cooling).');
    expect(helper(profile([5, -5, 5])).summary).toBe('Air crosses 0°C twice (cooling, then warming).');
  }));
  it('counts an exact-zero middle point with a sign change as one full crossing', () => each(helper => {
    for (const [temperatures, direction] of [[[-5, 0, 5], 'warming'], [[5, 0, -5], 'cooling']]) {
      const result = plain(helper(profile(temperatures)));
      expect(result.crossings).toEqual([{ progress:.55, direction }]);
      expect(result.touches).toEqual([]);
      expect(result.zeroBands).toEqual([]);
      expect(result.summary).toBe('Air crosses 0°C once (' + direction + ').');
    }
  }));
  it('reports an interior zero without a sign change as a single touch', () => each(helper => {
    for (const temperatures of [[5, 0, 5], [-5, 0, -5]]) {
      const result = plain(helper(profile(temperatures)));
      expect(result.crossings).toEqual([]);
      expect(result.touches).toEqual([{ progress:.55, label:'Mid-air' }]);
      expect(result.zeroBands).toEqual([]);
    }
  }));
  it('reports zero endpoints as touches, including alongside a genuine crossing', () => each(helper => {
    expect(plain(helper(profile([0, 5, 5])).touches)).toEqual([{ progress:0, label:'Cloud' }]);
    expect(plain(helper(profile([5, 5, 0])).touches)).toEqual([{ progress:1, label:'Ground' }]);
    expect(plain(helper(profile([0, 5, 0])).touches)).toEqual([{ progress:0, label:'Cloud' }, { progress:1, label:'Ground' }]);
    const mixed = plain(helper(profile([0, -5, 5])));
    expect(mixed.touches).toEqual([{ progress:0, label:'Cloud' }]);
    expect(mixed.crossings).toEqual([{ progress:.775, direction:'warming' }]);
    expect(helper(profile([0, 5, 5])).crossings).toHaveLength(0);
    expect(helper(profile([5, 5, 0])).crossings).toHaveLength(0);
  }));
  it('creates zero-temperature bands without duplicating their endpoints as touches', () => each(helper => {
    const upper = plain(helper(profile([0, 0, 5])));
    expect(upper.zeroBands).toEqual([{ start:0, end:.55 }]);
    expect(upper.touches).toEqual([]);
    expect(upper.crossings).toEqual([]);
    const lower = plain(helper(profile([-5, 0, 0])));
    expect(lower.zeroBands).toEqual([{ start:.55, end:1 }]);
    expect(lower.touches).toEqual([]);
    expect(lower.crossings).toEqual([]);
    const allZero = plain(helper(profile([0, -0, 0])));
    expect(allZero.zeroBands).toEqual([{ start:0, end:1 }]);
    expect(allZero.touches).toEqual([]);
    expect(allZero.crossings).toEqual([]);
    expect(allZero.summary).toBe('Air stays at 0°C throughout the profile.');
  }));
  it('distinguishes strict warm/cold profiles from nonnegative/nonpositive profiles', () => each(helper => {
    expect(helper(profile([1, 2, 3])).summary).toBe('Air stays above 0°C throughout the profile.');
    expect(helper(profile([-1, -2, -3])).summary).toBe('Air stays below 0°C throughout the profile.');
    for (const temperatures of [[0, 1, 2], [1, 0, 2], [0, 0, 2]]) {
      expect(helper(profile(temperatures)).summary).toBe('Air stays at or above 0°C throughout the profile.');
    }
    for (const temperatures of [[0, -1, -2], [-1, 0, -2], [0, 0, -2]]) {
      expect(helper(profile(temperatures)).summary).toBe('Air stays at or below 0°C throughout the profile.');
    }
  }));
  it('uses supplied progress values and handles finite extremes without numeric overflow', () => each(helper => {
    const custom = profile([-5, 5, -5]);
    custom[0].progress = .1; custom[1].progress = .4; custom[2].progress = .9;
    const result = helper(custom);
    expect(result.crossings[0].progress).toBeCloseTo(.25, 14);
    expect(result.crossings[1].progress).toBeCloseTo(.65, 14);
    for (const value of [Number.MAX_VALUE, Number.MIN_VALUE]) {
      const extremes = helper(profile([-value, value, -value]));
      expect(extremes.crossings[0].progress).toBeCloseTo(.275, 14);
      expect(extremes.crossings[1].progress).toBeCloseTo(.775, 14);
    }
  }));
  it('rejects malformed inputs and nonfinite numbers without coercion', () => each(helper => {
    for (const input of [undefined, null, {}, 'points', [], [1, 2, 3], profile([1, 2]), profile([1, 2, 3, 4]), Array(3)]) expect(helper(input)).toBeNull();
    let calls = 0;
    const hostile = { valueOf() { calls++; throw Error('Coercion'); } };
    for (const invalid of [undefined, null, true, false, '0', NaN, Infinity, -Infinity, {}, [], hostile, 1n, Symbol('number')]) {
      for (const field of ['progress', 'temperatureC']) {
        const points = profile([-5, 5, -5]); points[1][field] = invalid;
        expect(helper(points)).toBeNull();
      }
    }
    for (const invalid of [undefined, null, 0, {}, []]) {
      const points = profile([-5, 5, -5]); points[1].label = invalid;
      expect(helper(points)).toBeNull();
    }
    for (const progresses of [[-.1, .55, 1], [0, .55, 1.1], [0, 0, 1], [0, 1, .55]]) {
      const points = profile([-5, 5, -5]); points.forEach((point, index) => { point.progress = progresses[index]; });
      expect(helper(points)).toBeNull();
    }
    expect(calls).toBe(0);
  }));
  it('does not mutate input, retains state, or share returned objects between calls', () => each((helper, _exported, context) => {
    const points = Object.freeze(profile([0, 0, 5]).map(Object.freeze));
    const before = plain(points), keys = Object.keys(context);
    const expected = plain(helper(points));
    const changed = helper(points); changed.zeroBands[0].start = 9; changed.crossings.push({ progress:9, direction:'cooling' });
    changed.touches.push({ progress:9, label:'Changed' }); changed.summary = 'Changed';
    helper(profile([-5, 5, -5]));
    expect(plain(points)).toEqual(before);
    expect(plain(helper(points))).toEqual(expected);
    expect(Object.keys(context)).toEqual(keys);
  }));
});
