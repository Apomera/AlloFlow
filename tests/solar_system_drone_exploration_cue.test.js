import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');

// Execute the shipped helpers, retaining their real branches and calculations.
// Balance braces while ignoring strings/comments so neighboring UI code stays out.
function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Missing exploration helper: ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', comment = '';
  for (let i = open; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment === 'line') { if (c === '\n') comment = ''; continue; }
    if (comment === 'block') { if (c === '*' && next === '/') { comment = ''; i++; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '/' && next === '/') { comment = 'line'; i++; continue; }
    if (c === '/' && next === '*') { comment = 'block'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed exploration helper: ' + name);
}

const helpers = ['getDroneExplorationGeometry', 'getDroneExplorationTarget'].map(extractFunction).join('\n');
const orb = (name, x = 4, y = 0, z = -3) => ({ _sampleData: { name }, _collected: false, position: { x, y, z } });
function harness(overrides = {}) {
  const context = vm.createContext({
    _descentPhase: 1, sampleOperation: null, sampleReadyOrb: null,
    sampleStatus: { textContent: 'Hold position while collecting.' },
    sampleSurveySweeping: false, sampleSurveyTarget: null,
    navChallengeActive: false, navTargetX: 31, navTargetZ: -42,
    plotterRouteLine: null, plotterRouteComplete: false, plotterWaypoints: [], plotterActiveWP: 0,
    isFluid: false, roverTraverse: { active: false, step: 'ready', startX: -2, startZ: 8, waypointX: 20, waypointZ: -30 },
    roverTraverseDetailEl: { textContent: 'Park and observe the science waypoint.' },
    explorationLandmarkIndex: -1, pois: [{ name: 'Ridge', x: 6, z: -8 }, { name: 'Crater', x: 30, z: 0 }],
    discoveredPOIs: {}, playerPos: { x: 0, y: 0, z: 0 },
    recordDroneJournal: vi.fn(), awardStemXP: vi.fn(), markMissionStat: vi.fn(), upd: vi.fn(),
    ...overrides,
  });
  vm.runInContext(helpers, context);
  return context;
}

describe('unified exploration geometry uses vehicle heading and scene units', () => {
  it.each([
    ['north', 0, -4, 0, 0, 'ahead'],
    ['east', 4, 0, 90, 90, 'right'],
    ['south', 0, 4, 180, 180, 'behind'],
    ['west', -4, 0, 270, -90, 'left'],
    ['northeast', 4, -4, 45, 45, 'right'],
    ['northwest', -4, -4, 315, -45, 'left'],
  ])('points toward %s from a north-facing vehicle', (_name, x, z, bearing, relative, direction) => {
    const g = harness().getDroneExplorationGeometry({ x: 0, y: 0, z: 0 }, { x, z }, 0, 50);
    expect(g.bearing).toBeCloseTo(bearing, 10);
    expect(g.relative).toBeCloseTo(relative, 10);
    expect(g.direction).toBe(direction);
    expect(g.hasBearing).toBe(true);
  });

  it.each([
    ['east-facing to east', 4, 0, -Math.PI / 2, 0, 'ahead'],
    ['east-facing to north', 0, -4, -Math.PI / 2, -90, 'left'],
    ['west-facing to north', 0, -4, Math.PI / 2, 90, 'right'],
    ['south-facing to north', 0, -4, Math.PI, 180, 'behind'],
  ])('uses the correct yaw sign: %s', (_name, x, z, yaw, relative, direction) => {
    const g = harness().getDroneExplorationGeometry({ x: 0, y: 0, z: 0 }, { x, z }, yaw, 50);
    expect(g.relative).toBeCloseTo(relative, 10);
    expect(g.direction).toBe(direction);
  });

  it.each([-6, -1, 1, 7])('normalizes full rotations (%s turns) without changing the bearing', turns => {
    const g = harness().getDroneExplorationGeometry({ x: 10, y: 0, z: 20 }, { x: 13, z: 16 }, turns * 2 * Math.PI, 50);
    expect(g.bearing).toBeCloseTo(36.86989764584402, 10);
    expect(g.relative).toBeCloseTo(36.86989764584402, 10);
    expect(g.direction).toBe('right');
  });

  it.each([50, 100])('uses %s meters per scene unit without changing navigation geometry', scale => {
    const api = harness(), position = { x: 10, y: 8, z: 20 };
    const flat = api.getDroneExplorationGeometry(position, { x: 13, y: 20, z: 16 }, 0, scale);
    const direct = api.getDroneExplorationGeometry(position, { x: 13, y: 20, z: 16, spatial: true }, 0, scale);
    expect(flat.horizontal).toBe(5); expect(flat.distance).toBe(5); expect(flat.meters).toBe(5 * scale);
    expect(flat.verticalMeters).toBe(0);
    expect(direct.horizontal).toBe(5); expect(direct.distance).toBe(13); expect(direct.meters).toBe(13 * scale);
    expect(direct.verticalMeters).toBe(12 * scale);
    expect(direct.bearing).toBe(flat.bearing);
  });

  it.each([-3, 0, 3])('does not invent a horizontal bearing for a target directly above/below (%s)', y => {
    const g = harness().getDroneExplorationGeometry({ x: 2, y: 0, z: -4 }, { x: 2, y, z: -4, spatial: true }, 1.2, 100);
    expect(g.hasBearing).toBe(false); expect(g.horizontal).toBe(0);
    expect(g.distance).toBe(Math.abs(y)); expect(g.verticalMeters).toBe(y * 100);
    expect(Object.values(g).filter(v => typeof v === 'number').every(Number.isFinite)).toBe(true);
  });

  it('reserves ahead and behind for narrow heading sectors', () => {
    const api = harness(), position = { x: 0, y: 0, z: 0 }, target = { x: 0, z: -10 };
    for (const [degrees, expected] of [[14, 'ahead'], [-14, 'ahead'], [16, 'right'], [-16, 'left'], [164, 'right'], [-164, 'left'], [166, 'behind'], [-166, 'behind']]) {
      expect(api.getDroneExplorationGeometry(position, target, degrees * Math.PI / 180, 50).direction).toBe(expected);
    }
  });
});

describe('unified exploration target selection stays consistent with active work', () => {
  it('orders deployment, sampling, survey, selected sample, navigation, route, traverse, then discovery', () => {
    const sampled = orb('Drill target'), selected = orb('Selected contact', 12, 4, 9);
    const api = harness({ _descentPhase: 0, sampleOperation: { orb: sampled }, sampleSurveySweeping: true,
      sampleSurveyTarget: selected, navChallengeActive: true, plotterRouteLine: {},
      plotterWaypoints: [{ x: 41, z: 18 }, { x: -2, z: 8 }],
      roverTraverse: { active: true, step: 'outbound', startX: -2, startZ: 8, waypointX: 20, waypointZ: -30 } });
    expect(api.getDroneExplorationTarget().kind).toBe('deployment');
    api._descentPhase = 1; expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'sampling', title: 'Drill target', spatial: true });
    api.sampleOperation = null; expect(api.getDroneExplorationTarget().kind).toBe('survey');
    api.sampleSurveySweeping = false; expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'sample', title: 'Selected contact', x: 12, y: 4, z: 9, spatial: true });
    api.sampleSurveyTarget = null; expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'navigation', x: 31, z: -42 });
    api.navChallengeActive = false; expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'route', x: 41, z: 18 });
    api.plotterRouteComplete = true; expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'traverse', x: 20, z: -30 });
    api.roverTraverse.active = false; expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it('keeps the selected sample even when an unrelated landmark is nearer', () => {
    const selected = orb('Far selected specimen', 30, -7, 4);
    const api = harness({ sampleSurveyTarget: selected, pois: [{ name: 'Nearby ridge', x: 1, z: 0 }] });
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'sample', title: 'Far selected specimen', x: 30, y: -7 });
    selected.position.x = 42;
    expect(api.getDroneExplorationTarget().x).toBe(42);
    selected._collected = true;
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'discovery', title: 'Nearby ridge' });
  });

  it('uses the ready specimen while the collection procedure is pending', () => {
    const api = harness({ sampleReadyOrb: orb('Pending specimen') });
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'sampling', title: 'Pending specimen', action: 'Hold position while collecting.' });
    api.sampleReadyOrb = null;
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it('holds a discovery target stable when the vehicle moves closer to another landmark', () => {
    const api = harness();
    expect(api.getDroneExplorationTarget().title).toBe('Ridge');
    api.playerPos.x = 29; api.playerPos.z = 0;
    expect(api.getDroneExplorationTarget().title).toBe('Ridge');
    api.discoveredPOIs[0] = true;
    expect(api.getDroneExplorationTarget().title).toBe('Crater');
    api.discoveredPOIs[1] = true;
    expect(api.getDroneExplorationTarget().kind).toBe('free-roam');
  });

  it('preserves the chosen landmark through a temporary navigation challenge', () => {
    const api = harness({ explorationLandmarkIndex: 1, navChallengeActive: true });
    expect(api.getDroneExplorationTarget().kind).toBe('navigation');
    expect(api.explorationLandmarkIndex).toBe(1);
    api.navChallengeActive = false;
    expect(api.getDroneExplorationTarget().title).toBe('Crater');
  });

  it.each([[], [{ x: 1, z: 2 }], [{ x: 1, z: 2 }, { x: 3, z: 4 }]])('does not promote an unstarted plotted draft to an active destination (%j)', waypoints => {
    const api = harness({ plotterWaypoints: waypoints, plotterRouteLine: null });
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it('follows the current route waypoint and releases cancelled, exhausted, or completed routes', () => {
    const api = harness({ plotterRouteLine: {}, plotterWaypoints: [{ x: 7, z: 12 }, { x: -9, z: 31 }] });
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'route', title: 'Route waypoint 1 of 2', x: 7, z: 12 });
    api.plotterActiveWP = 1;
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'route', title: 'Route waypoint 2 of 2', x: -9, z: 31 });
    api.plotterRouteComplete = true;
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
    api.plotterRouteComplete = false; api.plotterActiveWP = 2;
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
    api.plotterActiveWP = 0; api.plotterRouteLine = null;
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it.each(['depart', 'outbound', 'survey', 'return', 'home_park'])('guides the active %s traverse step to its correct destination', step => {
    const api = harness({ roverTraverse: { active: true, step, startX: -2, startZ: 8, waypointX: 20, waypointZ: -30 } });
    const home = step === 'return' || step === 'home_park';
    expect(api.getDroneExplorationTarget()).toMatchObject({ kind: 'traverse', x: home ? -2 : 20, z: home ? 8 : -30 });
  });

  it.each(['ready', 'unavailable', 'complete'])('leaves inactive %s traverses out of target selection', step => {
    const api = harness({ roverTraverse: { active: false, step, startX: 0, startZ: 0, waypointX: 1, waypointZ: 1 } });
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it('does not route fluid vehicles into a rocky-world traverse', () => {
    const api = harness({ isFluid: true, roverTraverse: { active: true, step: 'outbound', waypointX: 1, waypointZ: 2 } });
    expect(api.getDroneExplorationTarget().kind).toBe('discovery');
  });

  it('handles an empty or fully discovered world without stale coordinates', () => {
    for (const api of [harness({ pois: [] }), harness({ discoveredPOIs: { 0: true, 1: true }, explorationLandmarkIndex: 1 })]) {
      const target = api.getDroneExplorationTarget();
      expect(target.kind).toBe('free-roam'); expect(target.x).toBeUndefined(); expect(target.z).toBeUndefined();
      expect(api.explorationLandmarkIndex).toBe(-1);
    }
  });

  it('does not move the vehicle, advance missions, collect specimens, save state, or grant credit', () => {
    const api = harness({ sampleSurveyTarget: orb('Untouched specimen') });
    const state = () => JSON.stringify({ position: api.playerPos, traverse: api.roverTraverse, sample: api.sampleSurveyTarget,
      discovered: api.discoveredPOIs, waypoints: api.plotterWaypoints, activeWP: api.plotterActiveWP, complete: api.plotterRouteComplete });
    const before = state();
    for (let i = 0; i < 20; i++) api.getDroneExplorationGeometry(api.playerPos, api.getDroneExplorationTarget(), 0, 50);
    expect(state()).toBe(before);
    for (const key of ['recordDroneJournal', 'awardStemXP', 'markMissionStat', 'upd']) expect(api[key]).not.toHaveBeenCalled();
  });
});
