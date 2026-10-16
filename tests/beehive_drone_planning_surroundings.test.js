import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const state = (patch = {}) => ({ x: 0, y: 115, z: 0, yaw: 0, reachedDca: false, reachedQueen: false, nearQueens: [], wind: { x: 0, z: 0 }, obstacles: [], drones: [], ...patch });
const surroundings = patch => BH.bhDronePlanningSurroundings(state(patch));
const queen = (patch = {}) => ({ x: 100, y: 150, z: 0, caught: false, ...patch });

describe('Drone planning surroundings', () => {
  it('reports heading-relative DCA direction and explains fixed marker length', () => {
    const result = surroundings();
    expect(result.target).toMatchObject({ label: 'DCA direction', value: 'Ahead (0°)', degrees: 0, known: true, status: 'available' });
    expect(result.target.detail).toContain('check the height band separately');
    expect(result.note).toContain('relative to your heading');
    expect(result.note).toContain('does not show distance or wind strength');
    expect(result.note).toContain('do not predict a safe route');
  });

  it('rotates bearing with yaw while preserving world target position', () => {
    expect(surroundings({ yaw: Math.PI / 2 }).target).toMatchObject({ value: '90° left of heading', degrees: -90 });
    expect(surroundings({ yaw: -Math.PI / 2 }).target).toMatchObject({ value: '90° right of heading', degrees: 90 });
    expect(surroundings({ yaw: Math.PI }).target).toMatchObject({ value: 'Behind (180°)' });
    expect(Math.abs(surroundings({ yaw: Math.PI }).target.degrees)).toBeCloseTo(180);
    expect(surroundings({ yaw: 2 * Math.PI }).target.value).toBe('Ahead (0°)');
  });

  it('retains raw subdegree bearings without inventing exact heading alignment', () => {
    const target = surroundings({ yaw: -0.001 }).target;
    expect(target.value).toBe('Ahead (0°)');
    expect(target.degrees).toBeCloseTo(0.001 * 180 / Math.PI);
    expect(target.degrees).not.toBe(0);
  });

  it('shows coincident horizontal positions without an arbitrary direction arrow', () => {
    expect(surroundings({ z: -600, y: 999, yaw: undefined }).target).toMatchObject({ value: 'Same horizontal position', degrees: null, known: true });
    expect(surroundings({ reachedDca: true, nearQueens: [queen({ x: 0 })] }).target).toMatchObject({ label: 'Queen cue direction', value: 'Same horizontal position', degrees: null });
  });

  it('selects the canonical first eligible queen rather than the nearest queen', () => {
    const result = surroundings({ reachedDca: true, nearQueens: [queen({ caught: true, x: -1 }), queen(), queen({ x: -2 })] });
    expect(result.target).toMatchObject({ label: 'Queen cue direction', value: '90° right of heading', degrees: 90 });
    expect(result.target.detail).not.toMatch(/DCA|height band/);
    expect(result.target.detail).toContain('cue can move');
  });

  it('keeps a recorded DCA reference when no eligible queen remains', () => {
    const result = surroundings({ reachedDca: true, nearQueens: [queen({ caught: true })] });
    expect(result.target).toMatchObject({ label: 'DCA direction', status: 'recorded' });
    expect(result.target.detail).toContain('DCA already recorded');
    expect(result.target.detail).toContain('returning is not required');
  });

  it('retains the canonical caught queen once interception is recorded', () => {
    const result = surroundings({ reachedDca: true, reachedQueen: true, nearQueens: [queen({ caught: true, x: -100 }), queen()] });
    expect(result.target).toMatchObject({ label: 'Queen cue direction', value: '90° left of heading' });
    expect(result.target.detail).toContain('Queen interception recorded');
  });

  it('filters malformed queen records but does not skip an eligible queen with unknown coordinates', () => {
    expect(surroundings({ reachedDca: true, nearQueens: [null, false, [], 'queen', queen()] }).target.value).toBe('90° right of heading');
    expect(surroundings({ reachedDca: true, nearQueens: [{ caught: false }, queen()] }).target).toMatchObject({ label: 'Queen cue direction', value: 'Unavailable', degrees: null, known: false });
    for (const nearQueens of [undefined, null, {}, 'queens']) expect(surroundings({ reachedDca: true, nearQueens }).target.status).toBe('recorded');
  });

  it('does not coerce missing position or heading into a zero direction', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '0', false, {}, []]) {
      expect(surroundings({ x: value }).target).toMatchObject({ value: 'Unavailable', known: false, degrees: null });
      expect(surroundings({ z: value }).target.known).toBe(false);
      expect(surroundings({ yaw: value }).target).toMatchObject({ value: 'Unavailable', known: false, degrees: null });
    }
    expect(surroundings({ y: undefined }).target.value).toBe('Ahead (0°)');
  });

  it('prefers current wind components and states the direction it moves toward', () => {
    const wind = surroundings({ wind: { x: -30, z: -40 }, windNow: { x: 3, z: 4, speed: 999 } }).wind;
    expect(wind).toMatchObject({ label: 'Current wind', value: 'Toward 143° right of heading', known: true, status: 'available' });
    expect(wind.degrees).toBeCloseTo(Math.atan2(3, -4) * 180 / Math.PI);
    expect(wind.detail).toContain('5.00 model wind units');
    expect(wind.detail).toContain('not a measured wind speed');
    expect(wind.detail).toContain('where the wind is moving');
    expect(wind.detail).not.toContain('m/s');
  });

  it('uses base wind only when current wind is absent or null', () => {
    for (const windNow of [undefined, null]) expect(surroundings({ windNow, wind: { x: 1, z: 0 } }).wind.value).toBe('Toward 90° right of heading');
    for (const windNow of [false, 0, '', {}, [], { x: null, z: 0 }, { x: '1', z: 0 }, { x: Infinity, z: 0 }]) {
      expect(surroundings({ windNow, wind: { x: 1, z: 0 } }).wind).toMatchObject({ value: 'Unavailable', known: false, degrees: null });
    }
  });

  it('handles exact calm and tiny nonzero wind without arbitrary arrows', () => {
    const zero = surroundings({ yaw: undefined }).wind;
    expect(zero).toMatchObject({ value: 'Very little modeled wind', status: 'calm', known: true, degrees: null });
    expect(zero.detail).toContain('0 model wind units');
    const slight = surroundings({ yaw: undefined, windNow: { x: 0.03999, z: 0 } }).wind;
    expect(slight).toMatchObject({ value: 'Very little modeled wind', status: 'calm', degrees: null });
    expect(slight.detail).toContain('<0.04 model wind units');
    expect(surroundings({ windNow: { x: 0.04, z: 0 } }).wind).toMatchObject({ value: 'Toward 90° right of heading', status: 'available', degrees: 90 });
  });

  it('preserves wind strength when heading is unknown and updates direction when yaw turns', () => {
    const unknown = surroundings({ yaw: undefined, windNow: { x: 1, z: 0 } }).wind;
    expect(unknown).toMatchObject({ value: 'Direction unavailable', known: true, degrees: null });
    expect(unknown.detail).toContain('1.00 model wind units');
    expect(surroundings({ yaw: Math.PI / 2, windNow: { x: 1, z: 0 } }).wind.value).toBe('Toward your front (0°)');
    expect(surroundings({ windNow: { x: 0, z: 1 } }).wind.value).toBe('Toward your rear (180°)');
  });

  it('rejects overflowed finite vectors without outputting Infinity or NaN', () => {
    const result = surroundings({ x: -Number.MAX_VALUE, z: -Number.MAX_VALUE, reachedDca: true, nearQueens: [queen({ x: Number.MAX_VALUE, z: Number.MAX_VALUE })], windNow: { x: Number.MAX_VALUE, z: Number.MAX_VALUE }, obstacles: [{ x: Number.MAX_VALUE, z: Number.MAX_VALUE }], drones: [{ x: Number.MAX_VALUE, z: Number.MAX_VALUE }] });
    for (const key of ['target', 'wind', 'obstacle', 'traffic']) expect(result[key]).toMatchObject({ value: 'Unavailable', known: false, degrees: null });
    expect(JSON.stringify(result)).not.toMatch(/Infinity|NaN/);
  });

  it('selects obstacle base by horizontal range independently of height or stale caches', () => {
    const result = surroundings({ obstacles: [{ x: 30, y: 115, z: 40, type: 'building' }, { x: 3, y: -10000, z: 4, h: 999, type: 'tree' }], nearestObstacle: { horizontalDistance: 0, clearance: -999, obstacle: { x: 0, z: 0 } } });
    expect(result.obstacle).toMatchObject({ label: 'Nearest obstacle base', value: '5 model m', known: true, status: 'available' });
    expect(result.obstacle.detail).toContain('Tree base; horizontal gap, not surface clearance');
    expect(result.obstacle.detail).toContain('143° right of heading');
    expect(result.obstacle.detail).not.toMatch(/collision|safe|clear route/i);
  });

  it('selects traffic horizontally and keeps feet separate from the meter gap', () => {
    const result = surroundings({ drones: [{ x: 7, z: 8, y: 115 }, { x: 6, z: 8, y: 135 }], nearestTraffic: { distance: 0, drone: { x: 0, y: 115, z: 0 } } });
    expect(result.traffic).toMatchObject({ label: 'Nearest drone horizontally', value: '10 model m', known: true, status: 'available' });
    expect(result.traffic.detail).toContain('20 model ft above you');
    expect(result.traffic.detail).toContain('143° right of heading');
  });

  it('distinguishes no recorded items from unknown collections or positions', () => {
    const empty = surroundings();
    for (const key of ['obstacle', 'traffic']) expect(empty[key]).toMatchObject({ value: 'None recorded', status: 'none', degrees: null, known: false });
    for (const invalid of [undefined, null, {}, false, 'none', [null], [{ x: null, z: 0 }], [{ x: '0', z: 0 }]]) {
      const result = surroundings({ obstacles: invalid, drones: invalid });
      for (const key of ['obstacle', 'traffic']) expect(result[key]).toMatchObject({ value: 'Unavailable', status: 'unavailable', known: false, degrees: null });
    }
  });

  it('discloses missing positions when some recorded objects remain usable', () => {
    const result = surroundings({ obstacles: [null, { x: 3, z: 4 }, { x: 0 }], drones: [{ x: 0, z: -2, y: 115 }, { x: NaN, z: 0 }] });
    expect(result.obstacle).toMatchObject({ value: '5 model m', status: 'partial', known: true });
    expect(result.traffic).toMatchObject({ value: '2 model m', status: 'partial', known: true });
    for (const key of ['obstacle', 'traffic']) expect(result[key].detail).toContain('Nearest with a recorded position; some other positions are unavailable');
  });

  it('retains valid nearest ranges without heading and rejects missing own position', () => {
    const records = [{ x: 3, z: 4, y: 115 }];
    const noHeading = surroundings({ yaw: null, obstacles: records, drones: records });
    for (const key of ['obstacle', 'traffic']) {
      expect(noHeading[key]).toMatchObject({ value: '5 model m', known: true, degrees: null });
      expect(noHeading[key].detail).toContain('Direction unavailable');
    }
    const noPosition = surroundings({ x: undefined, obstacles: records, drones: records });
    for (const key of ['obstacle', 'traffic']) expect(noPosition[key]).toMatchObject({ value: 'Unavailable', known: false, detail: 'Your horizontal position is unavailable.' });
  });

  it('preserves zero and submeter horizontal distances without false co-location', () => {
    for (const x of [0, 0.1, 1.4]) {
      const result = surroundings({ obstacles: [{ x, z: 0 }], drones: [{ x, z: 0, y: 215 }] });
      for (const key of ['obstacle', 'traffic']) expect(result[key].value).toBe(x === 0 ? '0 model m' : x < 1 ? '<1 model m' : '1 model m');
      if (x === 0) {
        expect(result.traffic.degrees).toBe(null);
        expect(result.traffic.detail).toContain('Same horizontal position');
      } else expect(result.traffic.degrees).toBe(90);
    }
  });

  it('reports signed vertical separation without requiring a known horizontal heading', () => {
    for (const [y, text] of [[115, 'At your height (0 model ft difference)'], [114.9, '<1 model ft below you'], [95, '20 model ft below you'], [135, '20 model ft above you']]) {
      expect(surroundings({ yaw: undefined, drones: [{ x: 0, z: 0, y }] }).traffic.detail).toContain(text);
    }
    for (const y of [undefined, null, '115', NaN, Infinity]) expect(surroundings({ drones: [{ x: 0, z: 0, y }] }).traffic.detail).toContain('Vertical separation unavailable');
    expect(surroundings({ y: -Number.MAX_VALUE, drones: [{ x: 0, z: 0, y: Number.MAX_VALUE }] }).traffic.detail).toContain('Vertical separation unavailable');
  });

  it('uses controlled obstacle names and keeps equal-distance selection stable', () => {
    for (const [type, text] of [['tree', 'Tree'], ['building', 'Building'], ['rock', 'Rock'], ['<script>', 'Obstacle'], [null, 'Obstacle']]) {
      const result = surroundings({ obstacles: [{ x: 1, z: 0, type }, { x: -1, z: 0, type: 'tree' }] });
      expect(result.obstacle.detail).toContain(text + ' base;');
      expect(result.obstacle.degrees).toBe(90);
    }
  });

  it('does not mutate frozen source state or share output reading objects', () => {
    const input = state({ reachedDca: true, nearQueens: [queen()], windNow: { x: 3, z: 4 }, obstacles: [{ x: 3, z: 4, type: 'rock' }], drones: [{ x: 6, z: 8, y: 135 }], nearestObstacle: { clearance: -1 }, nearestTraffic: { distance: 999 } });
    function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
    const before = JSON.stringify(input);
    freeze(input);
    const first = BH.bhDronePlanningSurroundings(input), second = BH.bhDronePlanningSurroundings(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(first).toEqual(second);
    for (const key of ['target', 'wind', 'obstacle', 'traffic']) expect(first[key]).not.toBe(second[key]);
  });

  it('handles wholly missing or malformed state without inventing measurements', () => {
    for (const input of [undefined, null, false, 7, 'state', []]) {
      const result = BH.bhDronePlanningSurroundings(input);
      for (const key of ['target', 'wind', 'obstacle', 'traffic']) expect(result[key]).toMatchObject({ value: 'Unavailable', known: false, degrees: null });
    }
  });
});
