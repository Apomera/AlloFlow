import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { travelRouteOptions, resolveTravelRoute } from '../lesson_board_spatial.js';
import { planningBase, simulatePlan } from '../lesson_board_sandbox.js';
import { saveSolo, readSolo } from '../lesson_board_storage.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(extra = {}) {
  const b = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', expeditionKit: 'pathfinder', ...extra };
  b.edges = b.locations.slice(1).map((node, index) => [b.locations[index].id, node.id]);
  return b;
}
const next = (b, run) => engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(b, run)) : run;
function answer(b, run, correct = true) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId);
  const value = correct ? engine.solution(node) : node.kind === 'settings' ? node.controls.map(control => (control.answer + 1) % control.options.length).join(',') : node.kind === 'order' ? node.order.slice().reverse().join(',') : String((node.answer + 1) % node.options.length);
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'route-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value }, 'solo', { attemptId: 'route-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }));
}
function move(b, run, id, route = 'shortest', correct = true) {
  run = engine.merge(next(b, run), engine.begin(b, next(b, run), id, 'standard', route));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, correct) : run;
}
function ready(b = board()) {
  let run = engine.emptyRun();
  for (const node of b.locations) run = move(b, run, node.id);
  run = move(b, move(b, run, 'heater'), 'bridge');
  return next(b, run);
}
const progress = (b, extra = {}) => ({ position: 'heater', visited: b.locations.map(node => node.id), built: ['bridge'], ...extra });
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('Intentional tabletop bridge routes', () => {
  it('offers canonical shortest and distinct simple bridge routes in stable order', () => {
    const b = board(), state = progress(b), expected = [
      { id: 'shortest', path: ['heater', 'cloud', 'river', 'rain'], segments: 3, legal: true },
      { id: 'bridge:bridge', path: ['heater', 'sequence', 'lake', 'rain'], segments: 3, projectId: 'bridge', legal: true }
    ];
    expect(travelRouteOptions(b, state, 'rain')).toEqual(expected);
    expect(travelRouteOptions({ ...b, locations: b.locations.slice().reverse(), edges: b.edges.slice().reverse() }, state, 'rain')).toEqual(expected);
    expect(resolveTravelRoute(b, state, 'rain', 'shortest')).toEqual(expected[0].path);
    expect(resolveTravelRoute(b, state, 'rain', 'bridge:bridge')).toEqual(expected[1].path);
    const changed = travelRouteOptions(b, state, 'rain'); changed[1].path[0] = 'missing';
    expect(travelRouteOptions(b, state, 'rain')).toEqual(expected);
  });

  it('does not offer an unbuilt, duplicate printed, or already-shortest bridge route', () => {
    const b = board();
    expect(travelRouteOptions(b, progress(b, { built: [] }), 'rain').map(item => item.id)).toEqual(['shortest']);
    // Keep the bridge's computed site at heater; adding an edge to sequence
    // would change the farthest starting site and create a different bridge.
    const duplicate = copy(b); duplicate.projects.find(project => project.id === 'bridge').effect.targetId = 'cloud';
    expect(travelRouteOptions(duplicate, progress(duplicate), 'rain').map(item => item.id)).toEqual(['shortest']);
    expect(travelRouteOptions(b, progress(b), 'sequence').map(item => item.id)).toEqual(['shortest']);
    expect(resolveTravelRoute(b, progress(b), 'sequence', 'bridge:bridge')).toBeNull();
  });

  it('never passes an unresolved investigation or loops back through the destination', () => {
    const b = board(), state = progress(b, { visited: ['heater', 'cloud', 'river', 'rain', 'lake'] });
    expect(travelRouteOptions(b, state, 'rain').map(item => item.id)).toEqual(['shortest']);
    expect(resolveTravelRoute(b, state, 'rain', 'bridge:bridge')).toBeNull();
    expect(travelRouteOptions(b, progress(b), 'heater')).toEqual([{ id: 'shortest', path: ['heater'], segments: 0, legal: true }]);
    const leaf = { ...b, edges: [['heater', 'cloud'], ['cloud', 'river'], ['river', 'rain'], ['rain', 'lake'], ['lake', 'cooler'], ['cooler', 'weather']] };
    expect(travelRouteOptions(leaf, progress(leaf), 'cloud').map(item => item.id)).toEqual(['shortest']);
  });

  it('allows a fresh final destination while requiring every intermediate station cleared', () => {
    const b = board(), state = progress(b, { visited: b.locations.filter(node => node.id !== 'rain').map(node => node.id) });
    expect(resolveTravelRoute(b, state, 'rain', 'bridge:bridge')).toEqual(['heater', 'sequence', 'lake', 'rain']);
    expect(resolveTravelRoute(b, { ...state, visited: state.visited.filter(id => id !== 'lake') }, 'rain', 'bridge:bridge')).toBeNull();
  });

  it('compares out-of-range bridge routes but refuses to execute them', () => {
    const b = board({ travelLimit: 3 }), state = progress(b), options = travelRouteOptions(b, state, 'cloud');
    expect(options).toEqual([
      { id: 'shortest', path: ['heater', 'cloud'], segments: 1, legal: true },
      { id: 'bridge:bridge', path: ['heater', 'sequence', 'lake', 'rain', 'river', 'cloud'], segments: 5, projectId: 'bridge', legal: false }
    ]);
    expect(resolveTravelRoute(b, state, 'cloud', 'bridge:bridge')).toBeNull();
    expect(resolveTravelRoute(b, state, 'rain', 'bridge:bridge')).toHaveLength(4);
  });

  it('stores only an explicitly selected alternate and follows it for project use and kit rewards', () => {
    const b = board(), base = ready(b), before = engine.derive(b, base);
    const direct = move(b, base, 'rain'), chosen = move(b, base, 'rain', 'bridge:bridge');
    expect(engine.stepOf(direct)).not.toHaveProperty('route');
    expect(engine.derive(b, direct)).toMatchObject({ position: 'rain', usedProjects: [], kitCount: 0, balance: before.balance });
    expect(engine.stepOf(chosen).route).toBe('bridge:bridge');
    expect(engine.routeForStep(b, chosen)).toEqual(['heater', 'sequence', 'lake', 'rain']);
    expect(engine.derive(b, chosen)).toMatchObject({ position: 'rain', usedProjects: ['bridge'], kitCount: 1, kitGains: [2, 2], balance: before.balance.map(value => value + 2) });
    expect(engine.derive(b, base)).toEqual(before);
    // In reverse, the alphabetical shortest route already uses the bridge,
    // so it is intentionally the sole canonical choice for that crossing.
    const again = move(b, chosen, 'heater');
    expect(engine.derive(b, again).balance).toEqual(engine.derive(b, chosen).balance);
    expect(engine.derive(b, again).kitCount).toBe(1);
    expect(engine.routeForStep(b, again)).toEqual(['rain', 'lake', 'sequence', 'heater']);
  });

  it('retains the chosen path through advance, solo persistence, and restored history', () => {
    const b = board(), chosen = move(b, ready(b), 'rain', 'bridge:bridge'), store = memory();
    const advanced = next(b, chosen);
    expect(advanced.steps['t' + chosen.turn].route).toBe('bridge:bridge');
    expect(engine.routeForStep(b, advanced, chosen.turn)).toEqual(['heater', 'sequence', 'lake', 'rain']);
    expect(engine.derive(b, engine.restoreRun(b, advanced))).toEqual(engine.derive(b, advanced));
    expect(saveSolo(store, b, 'routes', 'solo', { run: advanced }).status).toBe('saved');
    const restored = readSolo(store, b, 'routes', 'solo');
    expect(restored.status).toBe('saved'); expect(restored.run.steps['t' + chosen.turn].route).toBe('bridge:bridge');
    expect(engine.derive(b, restored.run)).toEqual(engine.derive(b, advanced));
  });

  it('rejects unsupported route identifiers and fails closed on tampered authoritative history', () => {
    const b = board(), base = ready(b), chosen = move(b, base, 'rain', 'bridge:bridge');
    for (const route of ['bridge:missing', 'bridge:research', 'bridge:', 'bridge:bridge:again', 'bridge:Bridge', ['heater', 'rain'], null, {}]) {
      expect(() => engine.begin(b, base, 'rain', 'standard', route)).toThrow();
      const forged = copy(chosen); engine.stepOf(forged).route = route;
      expect(engine.derive(b, forged)).toMatchObject({ position: 'heater', usedProjects: [], kitCount: 0 });
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
    const forged = copy(chosen); forged.steps.t0.route = 'bridge:bridge';
    expect(() => engine.restoreRun(b, forged)).toThrow();
  });

  it('rejects alternate routes on construction, classic play, and in-place movement', () => {
    const b = board(), base = ready(b);
    expect(() => engine.begin(b, base, 'research', 'standard', 'bridge:bridge')).toThrow();
    expect(() => engine.begin(b, base, 'heater', 'standard', 'bridge:bridge')).toThrow();
    const built = move(b, base, 'research'); engine.stepOf(built).route = 'bridge:bridge';
    expect(engine.derive(b, built).built).toEqual(['bridge']); expect(() => engine.restoreRun(b, built)).toThrow();
    const classic = makeBoard();
    expect(() => engine.begin(classic, engine.emptyRun(), 'heater', 'standard', 'bridge:bridge')).toThrow();
    expect(travelRouteOptions(classic, progress(b), 'rain')).toEqual([]);
    const old = move(classic, engine.emptyRun(), 'heater'); engine.stepOf(old).route = 'bridge:bridge';
    expect(engine.derive(classic, old).visited).toEqual([]); expect(() => engine.restoreRun(classic, old)).toThrow();
  });

  it('carries a chosen route through failed investigation retries without a second crossing reward', () => {
    const b = board();
    // Two branches reach rain. Clear the far branch first, keeping rain fresh.
    b.edges = [['heater', 'cloud'], ['cloud', 'rain'], ['cloud', 'river'], ['river', 'lake'], ['lake', 'sequence'], ['sequence', 'rain'], ['sequence', 'cooler'], ['cooler', 'weather']];
    let run = engine.emptyRun();
    for (const id of ['heater', 'cloud', 'river', 'lake', 'sequence', 'heater', 'bridge']) run = move(b, run, id);
    run = move(b, run, 'rain', 'bridge:bridge', false);
    const failed = engine.derive(b, run);
    expect(failed).toMatchObject({ kitCount: 1, usedProjects: ['bridge'] });
    expect(failed.visited).not.toContain('rain');
    const retrying = engine.merge(run, engine.retry(b, run));
    expect(engine.stepOf(retrying).route).toBe('bridge:bridge');
    expect(engine.routeForStep(b, retrying)).toEqual(['heater', 'sequence', 'rain']);
    expect(engine.derive(b, engine.restoreRun(b, retrying))).toEqual(engine.derive(b, retrying));
    run = answer(b, retrying);
    expect(engine.derive(b, run).kitCount).toBe(1);
    expect(engine.derive(b, run).balance).toEqual(failed.balance.map((value, index) => value + b.locations.find(node => node.id === 'rain').reward[index]));
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
    expect(next(b, run).steps['t' + run.turn].route).toBe('bridge:bridge');
  });

  it('projects the exact chosen path and kit reward while retaining default string-plan behavior', () => {
    const b = board(), base = ready(b), before = engine.derive(b, base);
    const direct = simulatePlan(b, base, ['rain']), chosen = simulatePlan(b, base, [{ id: 'rain', route: 'bridge:bridge' }]);
    expect(direct.steps[0]).toMatchObject({ path: ['heater', 'cloud', 'river', 'rain'], kitGain: [0, 0] });
    expect(direct.steps[0]).not.toHaveProperty('route');
    expect(chosen.steps[0]).toMatchObject({ route: 'bridge:bridge', path: ['heater', 'sequence', 'lake', 'rain'], kitGain: [2, 2], change: [2, 2] });
    expect(chosen.progress.balance).toEqual(before.balance.map(value => value + 2));
    expect(planningBase(chosen.run).steps['t' + base.turn].route).toBe('bridge:bridge');
    expect(engine.derive(b, base)).toEqual(before);
    for (const entry of [{ id: 'rain', route: 'bridge:missing' }, { id: 'rain', route: ['heater', 'rain'] }, { id: 'research', route: 'bridge:bridge' }]) expect(simulatePlan(b, base, [entry]).status).toBe('invalid');
  });

  it('fails closed on saved alternate paths that exceed the board travel range', () => {
    const b = board(), base = ready(b), chosen = move(b, base, 'cloud', 'bridge:bridge'), tactical = { ...b, travelLimit: 3 };
    expect(engine.routeForStep(b, chosen)).toHaveLength(6);
    expect(resolveTravelRoute(tactical, engine.derive(b, base), 'cloud', 'bridge:bridge')).toBeNull();
    expect(() => engine.restoreRun(tactical, chosen)).toThrow();
    expect(simulatePlan(tactical, { ...base, steps: copy(base.steps) }, [{ id: 'cloud', route: 'bridge:bridge' }]).status).toBe('invalid');
  });

  it('finishes at home when the selected route first uses a bridge, while a direct return does not', () => {
    const b = board(), base = next(b, move(b, move(b, ready(b), 'research'), 'cloud'));
    const before = engine.derive(b, base);
    expect(before).toMatchObject({ requirementsMet: true, objectiveReady: false, usedProjects: [], position: 'cloud' });
    const direct = move(b, base, 'heater'), chosen = move(b, base, 'heater', 'bridge:bridge');
    expect(engine.derive(b, direct)).toMatchObject({ complete: false, returned: false, kitCount: 0 });
    expect(engine.routeForStep(b, chosen)).toEqual(['cloud', 'river', 'rain', 'lake', 'sequence', 'heater']);
    expect(engine.derive(b, chosen)).toMatchObject({ complete: true, returned: true, usedProjects: ['bridge'], kitCount: 1 });
    expect(engine.derive(b, engine.restoreRun(b, chosen))).toEqual(engine.derive(b, chosen));
  });

  it('leaves old default-route saves unchanged and does not persist redundant shortest metadata', () => {
    const b = board(), base = ready(b), direct = move(b, base, 'rain');
    expect(Object.values(direct.steps).every(step => step.route === undefined)).toBe(true);
    expect(engine.restoreRun(b, direct)).toEqual(direct);
    expect(engine.routeForStep(b, direct)).toEqual(engine.routeTo(b, engine.derive(b, { ...direct, turn: direct.turn - 1 }), 'rain'));
    expect(engine.routeForStep(b, base)).toBeNull();
  });
});
