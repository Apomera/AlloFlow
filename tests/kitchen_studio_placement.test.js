import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../stem_lab/kitchen_studio/kitchen_studio_placement.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const source = Object.freeze({ x: 0.7, y: 1.65, z: 0.1 });
const board = Object.freeze({ x: -1.5, y: 1.65, z: -0.85 });
const pan = Object.freeze({ x: 0.1, y: 1.65, z: -0.85 });
const drop = (kind, point, start = source) => P.destination(kind, point, start);

describe('A nonslip mat must be carried underneath the board', () => {
  it('selects the existing secure action at the board center', () => {
    expect(drop('mat', board)).toMatchObject({ action: 'secure', target: 'boardMat' });
  });
  it('includes all four rectangle corners and excludes nearby points beyond each edge', () => {
    for (const x of [-1.92, -1.08]) for (const z of [-1.13, -0.57]) {
      expect(drop('mat', { x, y: 1.65, z }).action).toBe('secure');
    }
    for (const point of [
      { x: -1.92001, y: 1.65, z: -0.85 }, { x: -1.07999, y: 1.65, z: -0.85 },
      { x: -1.5, y: 1.65, z: -1.13001 }, { x: -1.5, y: 1.65, z: -0.56999 }
    ]) expect(drop('mat', point)).toMatchObject({ action: null, target: null });
  });
});

describe('The spatula distinguishes gathering, spreading and unresolved placement', () => {
  it('gathers only in the central circle, including its edge from different directions', () => {
    expect(drop('spatula', pan)).toMatchObject({ action: 'crowd', target: 'panCenter' });
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4]) {
      expect(drop('spatula', { x: pan.x + .16 * Math.cos(angle), y: 1.65, z: pan.z + .16 * Math.sin(angle) }).action).toBe('crowd');
    }
  });
  it('spreads only in the outer annulus, including both edges', () => {
    for (const radius of [.25, .3, .41]) for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      expect(drop('spatula', { x: pan.x + radius * Math.cos(angle), y: 1.65, z: pan.z + radius * Math.sin(angle) })).toMatchObject({ action: 'spread', target: 'panEdge' });
    }
  });
  it('does not guess an action in the gap or beyond the pan', () => {
    for (const radius of [.16001, .2, .24999, .41001, 1, 10]) {
      const result = drop('spatula', { x: pan.x + radius, y: 1.65, z: pan.z });
      expect(result).toMatchObject({ action: null, target: null }); expect(result.message).toContain('spatula');
    }
  });
});

describe('Placement requires deliberate finite travel and leaves evidence unchanged', () => {
  it.each([['mat', board], ['spatula', pan]])('requires at least 0.12 XZ travel for %s', (kind, point) => {
    for (const start of [point, { ...point, x: point.x + .11999 }, { ...point, y: point.y + 2 }]) {
      expect(drop(kind, point, start)).toMatchObject({ action: null, target: null });
    }
    expect(drop(kind, point, { ...point, x: point.x + .12 }).action).not.toBeNull();
    expect(drop(kind, point, { ...point, x: point.x + .072, z: point.z + .096 }).action).not.toBeNull();
    expect(drop(kind, point, { ...point, x: point.x + .06, z: point.z + .06 }).action).toBeNull();
  });
  it.each([null, undefined, {}, [], 12, 'point', { x: 0, z: 0 }, { x: 0, y: NaN, z: 0 }, { x: Infinity, y: 0, z: 0 }, { x: 0, y: 0, z: -Infinity }, { x: '0', y: 0, z: 0 }])('rejects invalid point or start %j without throwing', invalid => {
    expect(() => drop('mat', invalid)).not.toThrow();
    expect(drop('mat', invalid)).toMatchObject({ action: null, target: null });
    expect(P.destination('spatula', pan, invalid)).toMatchObject({ action: null, target: null });
  });
  it('rejects unknown tools and never mutates inputs or a previous result', () => {
    const before = JSON.stringify([source, board, pan]);
    const selected = Object.freeze(drop('mat', board));
    for (const kind of ['', 'MAT', 'secure', 'spread', null, undefined, {}, 1]) {
      const result = drop(kind, board); expect(result).toMatchObject({ action: null, target: null }); expect(result.message.length).toBeGreaterThan(0);
    }
    expect(drop('mat', board)).toEqual(selected); expect(drop('mat', board)).not.toBe(selected);
    drop('spatula', pan); expect(selected.action).toBe('secure'); expect(JSON.stringify([source, board, pan])).toBe(before);
  });
  it('previews no engine action, and committing uses the original decision semantics', () => {
    const knife = K.start('knife'), heat = K.start('heat');
    const before = JSON.stringify([knife, heat]);
    const secure = drop('mat', board), gather = drop('spatula', pan), spread = drop('spatula', { ...pan, x: .4 });
    expect(JSON.stringify([knife, heat])).toBe(before);
    expect(K.act(knife, secure.action).values.secure).toBe(true);
    const spaced = K.act(heat, spread.action); expect(spaced.values.spread).toBe(true); expect(spaced.log).toHaveLength(1);
    const crowded = K.act(spaced, gather.action); expect(crowded.values.spread).toBe(false); expect(crowded.values.seconds).toBeUndefined();
    expect(crowded.log.map(entry => entry.action)).toEqual(['spread', 'crowd']); expect(JSON.stringify([knife, heat])).toBe(before);
  });
});
