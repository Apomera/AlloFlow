import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const bounds = { left: 0, top: 0, right: 360, bottom: 220 };
const cue = (id, patch = {}) => ({ id, x: 110, y: 68, width: 148, height: 24, priority: 0, optional: false, anchorX: 184, anchorY: 100, ...patch });
const separate = (a, b) => a.x + a.width + 5 <= b.x || b.x + b.width + 5 <= a.x || a.y + a.height + 5 <= b.y || b.y + b.height + 5 <= a.y;

describe('Drone scene cue label layout', () => {
  it('separates the optional guide from the DCA cue while preserving their horizontal anchors', () => {
    const guide = cue('guide', { x: 100, y: 60, width: 144, height: 32, priority: 10, optional: true });
    const dca = cue('dca', { priority: 100 });
    const result = BH.bhDroneCueLabelLayout([dca, guide], bounds, []);
    expect(result.map(r => r.id)).toEqual(['dca', 'guide']);
    expect(result[0]).toMatchObject({ x: 110, y: 68, hidden: false, moved: false });
    expect(result[1]).toMatchObject({ x: 100, hidden: false, moved: true });
    expect(separate(result[0], result[1])).toBe(true);
  });

  it('places higher priority labels first regardless of their queue order', () => {
    const low = cue('low', { optional: true }), high = cue('high', { priority: 20 });
    const first = BH.bhDroneCueLabelLayout([low, high], bounds, []);
    const second = BH.bhDroneCueLabelLayout([high, low], bounds, []);
    for (const id of ['low', 'high']) expect(first.find(r => r.id === id)).toEqual(second.find(r => r.id === id));
    expect(first[1]).toMatchObject({ x: high.x, y: high.y, moved: false });
  });

  it('uses stable input order for equal priority and leaves an unobstructed preferred position unchanged', () => {
    const a = cue('a'), b = cue('b');
    const result = BH.bhDroneCueLabelLayout([a, b], bounds, []);
    expect(result[0]).toMatchObject({ x: a.x, y: a.y, hidden: false, moved: false });
    expect(result[1].moved).toBe(true);
    expect(separate(result[0], result[1])).toBe(true);
  });

  it('clamps measured labels at every edge and hides a label that cannot fit', () => {
    for (const [x, y] of [[-20, -10], [350, -10], [-20, 210], [350, 210]]) {
      const [r] = BH.bhDroneCueLabelLayout([cue('edge', { x, y })], bounds, []);
      expect(r.hidden).toBe(false);
      expect(r.x).toBeGreaterThanOrEqual(bounds.left); expect(r.y).toBeGreaterThanOrEqual(bounds.top);
      expect(r.x + r.width).toBeLessThanOrEqual(bounds.right); expect(r.y + r.height).toBeLessThanOrEqual(bounds.bottom);
      expect(r.moved).toBe(true);
    }
    expect(BH.bhDroneCueLabelLayout([cue('wide', { width: 361 })], bounds, [])[0].hidden).toBe(true);
  });

  it('respects reserved areas and moves horizontally only when its vertical column is blocked', () => {
    const reserved = [{ x: 100, y: 0, width: 160, height: 220 }];
    const [r] = BH.bhDroneCueLabelLayout([cue('label', { width: 60, alternates: [{ x: 20, y: 68 }] })], bounds, reserved);
    expect(r).toMatchObject({ x: 20, y: 68, hidden: false, moved: true });
    expect(separate(r, reserved[0])).toBe(true);
  });

  it('hides a crowded optional cue while allowing a required cue to search farther', () => {
    const roomy = { left: 0, top: 0, right: 360, bottom: 400 };
    const reserved = [{ x: 0, y: 0, width: 360, height: 235 }];
    const optional = cue('optional', { x: 100, y: 40, optional: true });
    expect(BH.bhDroneCueLabelLayout([optional], roomy, reserved)[0].hidden).toBe(true);
    const [required] = BH.bhDroneCueLabelLayout([{ ...optional, optional: false }], roomy, reserved);
    expect(required).toMatchObject({ x: 100, y: 240, hidden: false, moved: true });
    expect(separate(required, reserved[0])).toBe(true);
  });

  it('hides additional labels when the only available slot is occupied', () => {
    const small = { left: 0, top: 0, right: 148, bottom: 24 };
    const result = BH.bhDroneCueLabelLayout([cue('first', { x: 0, y: 0, priority: 1 }), cue('second', { x: 0, y: 0, optional: true })], small, []);
    expect(result[0]).toMatchObject({ hidden: false, moved: false });
    expect(result[1]).toMatchObject({ hidden: true, moved: false });
  });

  it('is deterministic and leaves frozen labels, alternate positions, bounds, and reserved areas unchanged', () => {
    const alternatives = Object.freeze([Object.freeze({ x: 8, y: 68 })]);
    const labels = Object.freeze([Object.freeze(cue('a', { alternates: alternatives })), Object.freeze(cue('b', { priority: 1 }))]);
    const fixedBounds = Object.freeze({ ...bounds });
    const reserved = Object.freeze([Object.freeze({ x: 100, y: 0, width: 160, height: 30 })]);
    const before = JSON.stringify({ labels, fixedBounds, reserved });
    const result = BH.bhDroneCueLabelLayout(labels, fixedBounds, reserved);
    expect(BH.bhDroneCueLabelLayout(labels, fixedBounds, reserved)).toEqual(result);
    expect(JSON.stringify({ labels, fixedBounds, reserved })).toBe(before);
    expect(result[0]).not.toBe(labels[0]);
    expect(result[0]).toMatchObject({ anchorX: 184, anchorY: 100 });
  });

  it.each([null, {}, { ...bounds, right: 0 }, { ...bounds, bottom: NaN }, { ...bounds, left: Infinity }, { ...bounds, left: -Number.MAX_VALUE, right: Number.MAX_VALUE }])('hides safely with unusable bounds %s', badBounds => {
    const result = BH.bhDroneCueLabelLayout([cue('a'), cue('bad', { x: NaN, y: Infinity })], badBounds, []);
    expect(result.every(r => r.hidden && Number.isFinite(r.x) && Number.isFinite(r.y))).toBe(true);
  });

  it('handles malformed input without NaN placement or phantom obstacles', () => {
    const labels = [null, cue('nan', { x: NaN }), cue('infinite', { height: Infinity }), cue('empty', { width: 0 }), cue('negative', { height: -1 }), cue('string', { x: '12' }), cue('valid', { alternates: [null, { x: NaN, y: 30 }] })];
    const result = BH.bhDroneCueLabelLayout(labels, bounds, [{ x: NaN, y: 0, width: 360, height: 220 }, null]);
    expect(result.slice(0, -1).every(r => r.hidden)).toBe(true);
    expect(result.every(r => Number.isFinite(r.x) && Number.isFinite(r.y))).toBe(true);
    expect(result.at(-1)).toMatchObject({ x: 110, y: 68, hidden: false, moved: false });
    expect(BH.bhDroneCueLabelLayout(null, bounds, [])).toEqual([]);
    expect(BH.bhDroneCueLabelLayout(Array(2), bounds, [])).toHaveLength(2);
    expect(BH.bhDroneCueLabelLayout(Array(2), bounds, []).every(r => r.hidden && Number.isFinite(r.x) && Number.isFinite(r.y))).toBe(true);
  });
});

describe('Drone scene cue leader paths', () => {
  const viewport = { left: 0, top: 0, right: 260, bottom: 160 };
  const plaque = (patch = {}) => cue('dca', { x: 160, y: 30, width: 80, height: 40, anchorX: 20, anchorY: 50, ...patch });
  const pathLength = path => path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - path[index].x, point.y - path[index].y), 0);
  const expectElbowsClear = (path, rectangle) => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      expect(a.x === b.x || a.y === b.y).toBe(true);
      expect(Math.max(a.x, b.x) <= rectangle.x - 3 || Math.min(a.x, b.x) >= rectangle.x + rectangle.width + 3 || Math.max(a.y, b.y) <= rectangle.y - 3 || Math.min(a.y, b.y) >= rectangle.y + rectangle.height + 3).toBe(true);
    }
  };

  it('draws a direct leader to the nearest point on its own plaque, including a corner', () => {
    expect(BH.bhDroneCueLeaderPath(plaque(), [], [], viewport)).toEqual([{ x: 20, y: 50 }, { x: 160, y: 50 }]);
    expect(BH.bhDroneCueLeaderPath(plaque({ x: 100, y: 80, anchorY: 20 }), [], [], viewport)).toEqual([{ x: 20, y: 20 }, { x: 100, y: 80 }]);
  });

  it('chooses the shorter safe elbow route around a blocking caption with 3 px clearance', () => {
    const label = plaque(), blocker = cue('guide-2', { x: 80, y: 20, width: 30, height: 50 });
    const path = BH.bhDroneCueLeaderPath(label, [label, blocker], [], viewport);
    expect(path).toHaveLength(4);
    expect(path[0]).toEqual({ x: 20, y: 50 }); expect(path.at(-1)).toEqual({ x: 160, y: 50 });
    expectElbowsClear(path, blocker);
    expect(pathLength(path)).toBe(186);
  });

  it('routes around marker reservations as well as other labels', () => {
    const marker = { x: 68, y: 34, width: 24, height: 32, marker: true };
    const path = BH.bhDroneCueLeaderPath(plaque(), [], [marker], viewport);
    expect(path.length).toBeGreaterThan(2);
    expectElbowsClear(path, marker);
  });

  it('keeps elbow routes within the viewport and returns no leader when a wall leaves no safe route', () => {
    const label = plaque({ x: 160, y: 0, height: 12, anchorY: 6 });
    const blocker = { x: 80, y: 0, width: 30, height: 12 };
    const path = BH.bhDroneCueLeaderPath(label, [], [blocker], viewport);
    expect(path.length).toBeGreaterThan(2);
    expectElbowsClear(path, blocker);
    expect(path.every(p => p.x >= viewport.left && p.x <= viewport.right && p.y >= viewport.top && p.y <= viewport.bottom)).toBe(true);
    expect(BH.bhDroneCueLeaderPath(plaque(), [], [{ x: 80, y: 0, width: 30, height: 160 }], viewport)).toEqual([]);
  });

  it('ignores overlapping 12 px and 16 px origin markers while still avoiding another marker', () => {
    const origins = [{ x: 8, y: 38, width: 24, height: 24, marker: true }, { x: 4, y: 34, width: 32, height: 32, marker: true }];
    const blocker = { x: 80, y: 40, width: 24, height: 24, marker: true };
    const path = BH.bhDroneCueLeaderPath(plaque(), [], [...origins, blocker], viewport);
    expect(path.length).toBeGreaterThan(2);
    expect(path[0]).toEqual({ x: 20, y: 50 });
    expectElbowsClear(path, blocker);
    expect(BH.bhDroneCueLeaderPath(plaque(), [], origins, viewport)).toHaveLength(2);
  });

  it('rejects an anchor covered by another caption or an untagged HUD reservation', () => {
    const covering = { x: 4, y: 34, width: 32, height: 32 };
    expect(BH.bhDroneCueLeaderPath(plaque(), [{ id: 'guide-2', ...covering }], [], viewport)).toEqual([]);
    expect(BH.bhDroneCueLeaderPath(plaque(), [], [covering], viewport)).toEqual([]);
    expect(BH.bhDroneCueLeaderPath(plaque(), [], [{ ...covering, marker: false }], viewport)).toEqual([]);
  });

  it('ignores hidden captions and recognizes its own plaque by stable id after the anchor changes', () => {
    const original = plaque();
    const changed = { ...original, anchorY: 80 };
    const hidden = cue('guide-2', { x: 50, y: 0, width: 30, height: 160, hidden: true });
    expect(BH.bhDroneCueLeaderPath(changed, [original, hidden], [], viewport)).toEqual([{ x: 20, y: 80 }, { x: 160, y: 70 }]);
  });

  it('is deterministic and preserves frozen labels, bounds, and reservations', () => {
    const label = Object.freeze(plaque());
    const labels = Object.freeze([label, Object.freeze(cue('guide-2', { x: 80, y: 20, width: 30, height: 50 }))]);
    const reserved = Object.freeze([Object.freeze({ x: 4, y: 34, width: 32, height: 32, marker: true })]);
    const fixedBounds = Object.freeze({ ...viewport });
    const before = JSON.stringify({ label, labels, reserved, fixedBounds });
    const path = BH.bhDroneCueLeaderPath(label, labels, reserved, fixedBounds);
    expect(path.length).toBeGreaterThan(0);
    expect(BH.bhDroneCueLeaderPath(label, labels, reserved, fixedBounds)).toEqual(path);
    expect(JSON.stringify({ label, labels, reserved, fixedBounds })).toBe(before);
  });

  it('returns no unsafe or nonfinite path for missing, hidden, out-of-bounds, or malformed input', () => {
    for (const label of [null, {}, plaque({ hidden: true }), plaque({ width: 0 }), plaque({ anchorX: NaN }), plaque({ anchorY: Infinity }), plaque({ anchorX: -1 }), plaque({ x: Infinity }), plaque({ anchorX: 180, anchorY: 50 })]) {
      expect(BH.bhDroneCueLeaderPath(label, [], [], viewport)).toEqual([]);
    }
    for (const badBounds of [null, {}, { ...viewport, right: 0 }, { ...viewport, bottom: Infinity }]) expect(BH.bhDroneCueLeaderPath(plaque(), [], [], badBounds)).toEqual([]);
    expect(BH.bhDroneCueLeaderPath(plaque(), [null, { x: NaN }], [null, { x: Infinity }], viewport)).toEqual([{ x: 20, y: 50 }, { x: 160, y: 50 }]);
  });
});
