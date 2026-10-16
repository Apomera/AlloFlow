import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { healBoard } from '../lesson_board_heal.js';
const { makeBoard, source } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board = () => ({ ...makeBoard(), playStyle: 'tabletop' });
function move(b, before, id, correct = true) {
  let run = engine.stepOf(before).phase === 'review' ? engine.merge(before, engine.advance(b, before)) : before;
  run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase === 'answer') {
    const node = b.locations.find(item => item.id === id), value = correct ? engine.solution(node) : node.kind === 'settings' ? '0,0' : '0';
    const action = { attemptId: 'attempt', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value };
    run = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'attempt', active: true, paused: false }));
    run = engine.merge(run, engine.resolve(b, run, { solo: {} }));
  }
  return run;
}
const sequence = (b, ids) => ids.reduce((run, id) => move(b, run, id), engine.emptyRun());

describe('Optional physical tabletop rules', () => {
  it('preserves legacy board shape and frontier behavior without the optional style', () => {
    const legacy = makeBoard(), run = engine.emptyRun();
    expect(engine.prepareBoard(legacy)).not.toHaveProperty('playStyle');
    expect(engine.derive(legacy, run)).not.toHaveProperty('position');
    expect(engine.targets(legacy, run).map(item => item.id)).toEqual(legacy.starts);
    expect(engine.validateBoard({ ...legacy, playStyle: 'unknown' })).toContain('Choose tabletop play or leave playStyle out for a classic board.');
  });

  it('moves a persistent pawn and cannot cross an unresolved intermediate space', () => {
    const b = board(), empty = engine.emptyRun();
    expect(engine.tabletopState(b, empty).position).toBe('heater');
    expect(engine.routeTo(b, engine.derive(b, empty), 'sequence')).toBeNull();
    expect(() => engine.begin(b, empty, 'sequence')).toThrow('no longer available');
    const run = engine.merge(empty, engine.begin(b, empty, 'cloud'));
    expect(engine.derive(b, run).position).toBe('cloud');
    expect(engine.derive(b, run).visited).toEqual([]);
  });

  it('crosses cleared territory in one turn and never re-awards resources or fortune', () => {
    const b = { ...board(), chance: true }, run = sequence(b, ['heater', 'cloud']);
    expect(engine.routeTo(b, engine.derive(b, run), 'river')).toEqual(['cloud', 'heater', 'river']);
    const before = engine.derive(b, run), traveled = move(b, run, 'heater'), after = engine.derive(b, traveled);
    expect(traveled.turn).toBe(run.turn + 1);
    expect(engine.stepOf(traveled)).toMatchObject({ phase: 'review', result: { success: true, marks: {} } });
    expect(engine.isTravelStep(b, traveled)).toBe(true);
    expect(after.balance).toEqual(before.balance);
    expect(after.performance).toEqual(before.performance);
    expect(after.luck).toEqual(before.luck);
    expect(engine.momentum(b, traveled, traveled.turn + 1)).toBe(2);
    expect(engine.targets(b, engine.merge(traveled, engine.advance(b, traveled))).some(item => item.id === 'heater')).toBe(false);
  });

  it('requires an affordable construction at its explored physical site', () => {
    const b = board(), cloud = sequence(b, ['heater', 'cloud']);
    expect(engine.buildSite(b, 'research')).toBe('heater');
    const choose = engine.merge(cloud, engine.advance(b, cloud));
    expect(() => engine.begin(b, choose, 'research')).toThrow('no longer available');
    const home = move(b, cloud, 'heater');
    expect(engine.targets(b, home).some(item => item.id === 'research')).toBe(true);
    expect(engine.derive(b, move(b, home, 'research')).built).toContain('research');
  });

  it('creates a real bridge edge, records its use, and ends only after a later return', () => {
    const b = board();
    let run = sequence(b, ['heater', 'cloud', 'heater', 'bridge']);
    expect(engine.spatialRoutes(b, engine.derive(b, run))).toContainEqual({ from: 'heater', to: 'sequence', projectId: 'bridge' });
    expect(engine.routeTo(b, engine.derive(b, run), 'sequence')).toEqual(['heater', 'sequence']);
    run = move(b, run, 'sequence');
    expect(engine.derive(b, run).usedProjects).toContain('bridge');
    run = move(b, move(b, run, 'heater'), 'research');
    expect(engine.derive(b, run)).toMatchObject({ requirementsMet: true, objectiveReady: true, complete: false, returned: false });
    run = move(b, move(b, run, 'sequence'), 'heater');
    expect(engine.derive(b, run)).toMatchObject({ complete: true, returned: true, position: 'heater' });
    expect(engine.targets(b, run)).toEqual([]);
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
  });

  it('counts a yield only after it contributes to a new successful exploration', () => {
    const b = board(), built = sequence(b, ['heater', 'cloud', 'heater', 'research']);
    expect(engine.derive(b, built).usedProjects).toEqual([]);
    const before = engine.derive(b, built), earned = move(b, built, 'river'), after = engine.derive(b, earned);
    expect(after.usedProjects).toEqual(['research']);
    expect(after.balance[0] - before.balance[0]).toBe(3);
    expect(engine.derive(b, move(b, earned, 'heater')).balance).toEqual(after.balance);
  });

  it('keeps the arrived pawn and free retry after an incorrect response', () => {
    const b = board(), run = move(b, engine.emptyRun(), 'cloud', false);
    expect(engine.derive(b, run)).toMatchObject({ position: 'cloud', balance: [0, 0], visited: [] });
    const retry = engine.merge(run, engine.retry(b, run));
    expect(retry.turn).toBe(run.turn);
    expect(engine.derive(b, engine.restoreRun(b, retry)).position).toBe('cloud');
    expect(engine.stepOf(retry).phase).toBe('answer');
  });

  it('reconstructs travel from legal prior state and rejects forged travel rewards and remote movement', () => {
    const b = board(), run = sequence(b, ['heater', 'cloud', 'heater']);
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
    for (const patch of [{ dice: [20] }, { marks: { solo: true } }, { success: false }]) {
      const forged = structuredClone(run); Object.assign(forged.steps.t2.result, patch);
      expect(() => engine.restoreRun(b, forged)).toThrow('Invalid saved travel result');
    }
    const remote = { turn: 0, steps: { t0: { phase: 'answer', targetId: 'weather' } } };
    expect(() => engine.restoreRun(b, remote)).toThrow('no longer available');
  });

  it('rejects a redundant tabletop bridge without changing legacy validation', () => {
    const b = board(); b.edges.push(['heater', 'sequence'], ['cloud', 'sequence']);
    expect(engine.validateBoard(b).join(' ')).toContain('tabletop shortcut must add a new connection');
    delete b.playStyle;
    expect(engine.validateBoard(b)).toEqual([]);
  });

  it('keeps a bridge affordable when both yields were built after every activity was cleared', () => {
    const b = { ...board(), goal: 'expedition' };
    b.projects.forEach(project => { project.cost = [4, 2]; });
    expect(engine.validateBoard(b)).toEqual([]);
    let run = sequence(b, ['heater', 'cloud', 'rain', 'sequence', 'weather', 'cooler', 'lake', 'river', 'heater', 'research', 'cloud', 'network']);
    expect(engine.derive(b, run)).toMatchObject({ requirementsMet: true, objectiveReady: false, usedProjects: [], complete: false, balance: [8, 4] });
    run = move(b, move(b, run, 'heater'), 'bridge');
    expect(engine.derive(b, run).balance).toEqual([4, 2]);
    run = move(b, move(b, run, 'sequence'), 'heater');
    expect(engine.derive(b, run)).toMatchObject({ usedProjects: ['bridge'], complete: true, returned: true });
    const tooCostly = structuredClone(b);
    tooCostly.projects.forEach(project => { project.cost = [6, 3]; });
    expect(engine.validateBoard(tooCostly)).toContain('Tabletop activity rewards must fund all three projects without relying on bonuses.');
    const healed = healBoard(tooCostly, source);
    expect(healed.fixes).toContain('balance');
    expect(engine.validateBoard(healed.board, source)).toEqual([]);
    const totals = healed.board.locations.reduce((sum, node) => sum.map((value, i) => value + node.reward[i]), [0, 0]);
    expect(healed.board.projects.reduce((sum, project) => sum.map((value, i) => value + project.cost[i]), [0, 0]).every((cost, i) => cost <= totals[i])).toBe(true);
    delete tooCostly.playStyle;
    expect(engine.validateBoard(tooCostly)).toEqual([]);
  });

  it('enforces explicitly requested tabletop generation even when the provider omits the style', async () => {
    const provider = vi.fn().mockResolvedValue(JSON.stringify(makeBoard()));
    const generated = await engine.createBoard(provider, source, { playStyle: 'tabletop', chance: false });
    expect(generated.board.playStyle).toBe('tabletop');
    expect(generated.board.goal).toBe('expedition');
    expect(generated.board).not.toHaveProperty('chance');
    expect(engine.prepareBoard(generated.board).playStyle).toBe('tabletop');
    expect(provider.mock.calls[0][0]).toContain('travel back to home camp');
  });

  it('does not silently convert a legacy board when a generation or refinement provider adds a style', async () => {
    const provider = vi.fn().mockResolvedValue(JSON.stringify(board()));
    expect((await engine.createBoard(provider, source)).board).not.toHaveProperty('playStyle');
    expect((await engine.refineBoard(provider, makeBoard(), source, 'Use shorter instructions.')).board).not.toHaveProperty('playStyle');
  });
});
