import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { healBoard } from '../lesson_board_heal.js';
import { simulatePlan } from '../lesson_board_sandbox.js';
const { makeBoard, source } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');

const tabletop = options => ({ ...makeBoard(), playStyle: 'tabletop', ...options });
const chain = options => {
  const board = tabletop({ goal: 'expedition', travelLimit: 3, ...options });
  board.edges = board.locations.slice(1).map((node, index) => [board.locations[index].id, node.id]);
  return board;
};
function choose(board, run) {
  return engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(board, run)) : run;
}
function move(board, before, id) {
  let run = choose(board, before);
  run = engine.merge(run, engine.begin(board, run, id));
  if (engine.stepOf(run).phase === 'answer') {
    const node = board.locations.find(item => item.id === id);
    run.steps['t' + run.turn].answers = { solo: { value: engine.solution(node), correct: true } };
    run = engine.merge(run, engine.resolve(board, run, { solo: {} }));
  }
  return run;
}
const sequence = (board, ids, run = engine.emptyRun()) => ids.reduce((before, id) => move(board, before, id), run);

describe('Optional tactical travel and home delivery', () => {
  it('round-trips only the explicit supported tabletop rule and leaves default boards unchanged', () => {
    const board = tabletop({ travelLimit: 3 });
    expect(engine.validateBoard(board, source)).toEqual([]);
    expect(engine.prepareBoard(board, source).travelLimit).toBe(3);
    expect(healBoard(engine.prepareBoard(board, source), source)).toMatchObject({ board: { travelLimit: 3 }, fixes: [] });
    expect(engine.prepareBoard(tabletop(), source)).not.toHaveProperty('travelLimit');
    expect(engine.travelLimitOf(tabletop())).toBeNull();
    expect(engine.travelLimitOf(makeBoard())).toBeNull();
    for (const travelLimit of [0, 1, 2, 4, -1, 3.5, '3', null, true]) {
      const invalid = tabletop({ travelLimit });
      expect(engine.validateBoard(invalid)).toContain('Tactical travel uses a three-edge limit on a tabletop board only.');
      expect(() => engine.prepareBoard(invalid)).toThrow('three-edge limit');
      expect(engine.validateBoard(healBoard(invalid, source).board)).toContain('Tactical travel uses a three-edge limit on a tabletop board only.');
    }
    expect(engine.validateBoard({ ...makeBoard(), travelLimit: 3 })).toContain('Tactical travel uses a three-edge limit on a tabletop board only.');
  });

  it('keeps full connected previews while separating three-edge moves from longer destinations', () => {
    const board = chain(), run = sequence(board, ['heater', 'cloud', 'river', 'rain', 'lake', 'sequence']);
    const progress = engine.derive(board, run), scene = engine.tabletopState(board, run);
    expect(engine.routeTo(board, progress, 'heater')).toEqual(['sequence', 'lake', 'rain', 'river', 'cloud', 'heater']);
    expect(scene.travelLimit).toBe(3);
    expect(scene.moves).toContainEqual({ id: 'river', path: ['sequence', 'lake', 'rain', 'river'], travel: true });
    expect(scene.outOfRange).toContainEqual({ id: 'heater', path: ['sequence', 'lake', 'rain', 'river', 'cloud', 'heater'], travel: true });
    expect(scene.outOfRange.map(item => item.id)).toEqual(['heater', 'cloud']);
    expect(scene.moves.some(item => item.id === 'weather')).toBe(false); // Unresolved cooler blocks the path.
    expect(scene.outOfRange.some(item => item.id === 'weather')).toBe(false);
    expect(engine.targets(board, choose(board, run)).map(item => item.id)).not.toContain('heater');
    expect(() => engine.begin(board, choose(board, run), 'heater')).toThrow('no longer available');
    const relaxed = { ...board }; delete relaxed.travelLimit;
    expect(engine.tabletopState(relaxed, run)).toMatchObject({ travelLimit: null, outOfRange: [] });
    expect(engine.targets(relaxed, choose(relaxed, run)).map(item => item.id)).toContain('heater');
  });

  it('admits a fresh destination at three edges but not at four, and never passes unresolved spaces', () => {
    const board = chain(), cleared = sequence(board, ['heater', 'cloud', 'river', 'rain']);
    const run = sequence(board, ['heater'], cleared), scene = engine.tabletopState(board, run);
    expect(scene.moves).toContainEqual({ id: 'rain', path: ['heater', 'cloud', 'river', 'rain'], travel: true });
    expect(scene.outOfRange).toContainEqual({ id: 'lake', path: ['heater', 'cloud', 'river', 'rain', 'lake'], travel: false });
    expect(scene.outOfRange.some(item => item.id === 'sequence')).toBe(false);
    const nearer = move(board, run, 'cloud');
    expect(engine.tabletopState(board, nearer).moves).toContainEqual({ id: 'lake', path: ['cloud', 'river', 'rain', 'lake'], travel: false });
    expect(engine.derive(board, move(board, nearer, 'lake')).visited).toContain('lake');
  });

  it('does not execute or reward a forged over-range step, and saved replay rejects it', () => {
    const board = chain(), cleared = sequence(board, ['heater', 'cloud', 'river', 'rain']);
    const base = choose(board, move(board, cleared, 'heater')), before = engine.derive(board, base);
    const forged = structuredClone(base);
    forged.steps['t' + forged.turn] = { phase: 'review', targetId: 'lake', result: { success: true, marks: { solo: true } } };
    expect(engine.derive(board, forged)).toEqual(before);
    expect(() => engine.restoreRun(board, forged)).toThrow('no longer available');
    expect(engine.derive(board, engine.restoreRun(board, base))).toEqual(before);
  });

  it('makes a built shortcut count as one edge and lets the planner use legal waypoints', () => {
    const board = chain(), before = choose(board, sequence(board, ['heater', 'cloud', 'river', 'rain', 'lake', 'sequence']));
    const original = JSON.stringify(before);
    expect(simulatePlan(board, before, ['heater'])).toMatchObject({ status: 'invalid', steps: [] });
    const projected = simulatePlan(board, before, ['river', 'heater', 'bridge', 'sequence']);
    expect(projected.steps).toHaveLength(4);
    expect(projected.steps.map(step => step.kind)).toEqual(['travel', 'travel', 'build', 'travel']);
    expect(projected.steps[3].path).toEqual(['heater', 'sequence']);
    expect(projected.progress.usedProjects).toEqual(['bridge']);
    const real = sequence(board, ['river', 'heater', 'bridge', 'sequence'], before);
    const { performance: ignoredActual, ...actual } = engine.derive(board, real);
    const { performance: ignoredProjected, ...expected } = projected.progress;
    expect(actual).toEqual(expected);
    expect(JSON.stringify(before)).toBe(original);
    expect(engine.derive(board, engine.restoreRun(board, real))).toEqual(engine.derive(board, real));
  });

  it.each([undefined, 3])('allows explicit delivery at the current home only after readiness (limit %s)', travelLimit => {
    const board = tabletop({ ...(travelLimit ? { travelLimit } : {}) });
    const early = choose(board, sequence(board, ['heater', 'cloud', 'heater']));
    expect(engine.targets(board, early).map(item => item.id)).not.toContain('heater');
    expect(() => engine.begin(board, early, 'heater')).toThrow('no longer available');
    const run = choose(board, sequence(board, ['bridge', 'sequence', 'heater', 'research'], early));
    const before = engine.derive(board, run);
    expect(before).toMatchObject({ objectiveReady: true, complete: false, position: 'heater', returned: false });
    expect(engine.tabletopState(board, run).moves).toContainEqual({ id: 'heater', path: ['heater'], travel: true });
    const projected = simulatePlan(board, run, ['heater']);
    expect(projected).toMatchObject({ status: 'complete', steps: [{ id: 'heater', kind: 'travel', path: ['heater'], change: [0, 0] }] });
    const delivered = move(board, run, 'heater'), after = engine.derive(board, delivered);
    expect(after).toMatchObject({ complete: true, returned: true, position: 'heater' });
    expect(after.balance).toEqual(before.balance);
    expect(after.performance).toEqual(before.performance);
    expect(engine.isTravelStep(board, delivered)).toBe(true);
    expect(engine.tabletopState(board, delivered)).toMatchObject({ moves: [], outOfRange: [] });
    expect(engine.derive(board, engine.restoreRun(board, delivered))).toEqual(after);
    expect(() => engine.begin(board, delivered, 'heater')).toThrow();
  });

  it('does not permit home delivery when projects are built but no construction has been used', () => {
    const board = chain(), nodes = board.locations.map(node => node.id);
    let run = sequence(board, [...nodes, 'lake', 'cloud', 'network', 'heater', 'research']);
    run = choose(board, run);
    expect(engine.derive(board, run)).toMatchObject({ position: 'heater', requirementsMet: true, objectiveReady: false });
    expect(engine.targets(board, run).map(item => item.id)).not.toContain('heater');
    expect(() => engine.begin(board, run, 'heater')).toThrow('no longer available');
    const forged = structuredClone(run);
    forged.steps['t' + forged.turn] = { phase: 'review', targetId: 'heater', result: { success: true, marks: {} } };
    expect(engine.derive(board, forged)).toMatchObject({ complete: false, returned: false });
  });

  it.each(['core', 'expedition', 'architect'])('finishes a full long-chain %s mission within the turn limit without bonus income', goal => {
    const board = chain({ goal }), nodes = board.locations.map(node => node.id);
    const ids = [...nodes, 'lake', 'cloud', 'heater', 'bridge', 'research', ...(goal === 'architect' ? ['cloud', 'network'] : []), 'sequence', 'heater'];
    const run = sequence(board, ids);
    expect(engine.derive(board, run)).toMatchObject({ complete: true, returned: true });
    expect(run.turn).toBeLessThan(engine.MAX_TURNS - 1);
    expect(engine.derive(board, engine.restoreRun(board, run))).toEqual(engine.derive(board, run));
  });

  it('keeps the explicit travel rule through generation and refinement while rejecting invalid requests', async () => {
    const provider = vi.fn().mockResolvedValue(JSON.stringify(makeBoard()));
    const made = await engine.createBoard(provider, source, { playStyle: 'tabletop', travelLimit: 3, chance: false });
    expect(made.board.travelLimit).toBe(3);
    expect(provider.mock.calls[0][0]).toContain('one move crosses at most three edges');
    const revised = await engine.refineBoard(provider, made.board, source, 'Make instructions shorter.');
    expect(revised.board.travelLimit).toBe(3);
    expect(provider.mock.calls[1][0]).toContain('Preserve travelLimit:3');
    const unwanted = vi.fn().mockResolvedValue(JSON.stringify(tabletop({ travelLimit: 3 })));
    expect((await engine.createBoard(unwanted, source, { playStyle: 'tabletop' })).board).not.toHaveProperty('travelLimit');
    expect((await engine.refineBoard(unwanted, tabletop(), source, 'Shorter instructions.')).board).not.toHaveProperty('travelLimit');
    expect((await engine.createBoard(unwanted, source)).board).not.toHaveProperty('travelLimit');
    await expect(engine.createBoard(provider, source, { playStyle: 'tabletop', travelLimit: 4 })).rejects.toThrow('three-edge limit');
    await expect(engine.createBoard(provider, source, { travelLimit: 3 })).rejects.toThrow('three-edge limit');
  });
});
