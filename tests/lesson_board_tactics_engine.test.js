import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { healBoard } from '../lesson_board_heal.js';
import { saveSolo, readSolo, soloStorageKey, restoreSolo } from '../lesson_board_storage.js';
const { makeBoard, source } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board = expeditionKit => ({ ...makeBoard(), playStyle: 'tabletop', ...(expeditionKit ? { expeditionKit } : {}) });
const choose = (b, run) => engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(b, run)) : run;
function respond(b, run, value) {
  const targetId = engine.stepOf(run).targetId, node = b.locations.find(item => item.id === targetId);
  const action = { attemptId: 'attempt', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId, value: value ?? engine.solution(node) };
  const answered = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'attempt', active: true, paused: false }));
  return engine.merge(answered, engine.resolve(b, answered, { solo: {} }));
}
function move(b, before, id, value) {
  let run = choose(b, before); run = engine.merge(run, engine.begin(b, run, id));
  return engine.stepOf(run).phase === 'answer' ? respond(b, run, value) : run;
}
const sequence = (b, ids) => ids.reduce((run, id) => move(b, run, id), engine.emptyRun());
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('Authoritative expedition kit rewards', () => {
  it('keeps the exact prior progress shape when no kit is selected', () => {
    for (const b of [makeBoard(), board()]) {
      expect(engine.prepareBoard(b, source)).not.toHaveProperty('expeditionKit');
      const initial = engine.derive(b, engine.emptyRun());
      expect(initial).not.toHaveProperty('kitCount'); expect(initial).not.toHaveProperty('kitGains');
      const p = engine.derive(b, move(b, engine.emptyRun(), 'heater'));
      expect(p).toEqual({ ...initial, visited: ['heater'], concepts: ['temperature'], balance: [2, 1], performance: { solo: { answered: 1, correct: 1 } } });
    }
  });

  it.each(['surveyor', 'builder', 'pathfinder'])('validates and preserves the optional %s setup choice', kit => {
    const b = board(kit);
    expect(engine.validateBoard(b, source)).toEqual([]);
    expect(engine.prepareBoard(b, source).expeditionKit).toBe(kit);
    expect(healBoard(b, source).board.expeditionKit).toBe(kit);
    expect(engine.derive(b, engine.emptyRun())).toMatchObject({ kitCount: 0, kitGains: [0, 0] });
    const legacy = { ...b }; delete legacy.playStyle;
    expect(engine.validateBoard(legacy, source).length).toBeGreaterThan(0);
  });

  it.each(['standard', 'unknown', '', null, {}, 1])('rejects unsupported explicit kit values: %s', expeditionKit => {
    expect(engine.validateBoard({ ...board(), expeditionKit }, source).length).toBeGreaterThan(0);
  });

  it('Surveyor rewards only the first two successfully discovered concepts', () => {
    const b = board('surveyor');
    b.concepts.push({ id: 'water-collection', name: 'Collecting water' });
    b.locations.filter(node => ['river', 'lake'].includes(node.id)).forEach(node => { node.conceptId = 'water-collection'; });
    expect(engine.validateBoard(b, source)).toEqual([]);
    let run = move(b, engine.emptyRun(), 'heater');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 0], balance: [4, 1] });
    run = move(b, run, 'cloud');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 0], balance: [6, 2] });
    run = move(b, run, 'river');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 2, kitGains: [4, 0], balance: [10, 3] });
    run = move(b, move(b, run, 'heater'), 'rain');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 2, kitGains: [4, 0], balance: [12, 4] });
  });

  it('does not farm Surveyor bonuses from failed attempts, retries, same-concept spaces, or cleared travel', () => {
    const b = board('surveyor');
    let run = move(b, engine.emptyRun(), 'heater', '0');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 0, kitGains: [0, 0], balance: [0, 0] });
    run = engine.merge(run, engine.retry(b, run));
    expect(engine.derive(b, run).kitCount).toBe(0);
    run = respond(b, run);
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 0] });
    run = move(b, move(b, run, 'cloud'), 'heater');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 0], balance: [6, 2] });
  });

  it('Builder requires the full cost first and refunds only the first two new constructions', () => {
    const b = { ...board('builder'), goal: 'architect' };
    let run = sequence(b, ['heater', 'cloud']);
    expect(engine.derive(b, run).balance).toEqual([4, 2]);
    expect(engine.buildSite(b, 'network')).toBe('cloud');
    const ready = choose(b, run);
    expect(engine.targets(b, ready).some(item => item.id === 'network')).toBe(true);
    expect(() => engine.begin(b, ready, 'network')).toThrow('no longer available');
    expect(engine.derive(b, ready).kitCount).toBe(0);
    expect(engine.derive(b, engine.merge(ready, engine.begin(b, ready, 'network', 'research')))).toMatchObject({ balance: [1, 2], kitCount: 1, kitGains: [0, 2] });
    run = move(b, move(b, run, 'heater'), 'research');
    expect(engine.derive(b, run)).toMatchObject({ balance: [1, 3], kitCount: 1, kitGains: [0, 2] });
    run = move(b, move(b, run, 'cloud'), 'network');
    expect(engine.derive(b, run)).toMatchObject({ balance: [0, 2], kitCount: 2, kitGains: [0, 4] });
    run = move(b, move(b, move(b, run, 'river'), 'heater'), 'bridge');
    expect(engine.derive(b, run)).toMatchObject({ balance: [1, 2], kitCount: 2, kitGains: [0, 4] });
    expect(() => engine.begin(b, choose(b, run), 'bridge')).toThrow('no longer available');
  });

  it('Pathfinder pays on actual crossing before the landing challenge, never merely building or previewing', () => {
    const b = board('pathfinder'), built = sequence(b, ['heater', 'cloud', 'heater', 'bridge']);
    const before = engine.derive(b, built);
    expect(before).toMatchObject({ kitCount: 0, kitGains: [0, 0], balance: [2, 0] });
    expect(engine.routeTo(b, before, 'sequence')).toEqual(['heater', 'sequence']);
    engine.tabletopState(b, built); engine.targets(b, built);
    expect(engine.derive(b, built)).toEqual(before);
    let run = choose(b, built); run = engine.merge(run, engine.begin(b, run, 'sequence'));
    expect(engine.stepOf(run).phase).toBe('answer');
    expect(engine.derive(b, run)).toMatchObject({ position: 'sequence', kitCount: 1, kitGains: [2, 2], balance: [4, 2] });
    expect(engine.derive(b, run).visited).not.toContain('sequence');
    run = respond(b, run, '0,1,2,3');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 2], balance: [4, 2] });
    run = engine.merge(run, engine.retry(b, run));
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 2], balance: [4, 2] });
    run = respond(b, run);
    const afterLearning = engine.derive(b, run).balance;
    run = move(b, move(b, run, 'heater'), 'sequence');
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 2], balance: afterLearning });
  });

  it.each(['surveyor', 'builder', 'pathfinder'])('restores %s awards from events and separates saves by the chosen kit', kit => {
    const b = board(kit), storage = memory();
    let run = sequence(b, ['heater', 'cloud', 'heater', 'bridge']);
    if (kit === 'pathfinder') { run = choose(b, run); run = engine.merge(run, engine.begin(b, run, 'sequence')); }
    const expected = engine.derive(b, run);
    expect(expected.kitCount).toBeGreaterThan(0);
    expect(saveSolo(storage, b, 'app', 'solo', { run }).status).toBe('saved');
    const saved = readSolo(storage, b, 'app', 'solo');
    expect(saved.status).toBe('saved'); expect(engine.derive(b, saved.run)).toEqual(expected);
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(expected);
    const forged = structuredClone(run); forged.kitCount = 999; forged.kitGains = [999, 999];
    expect(engine.derive(b, engine.restoreRun(b, forged))).toEqual(expected);
    const different = board(kit === 'builder' ? 'surveyor' : 'builder');
    expect(soloStorageKey(b, 'app', 'solo')).not.toBe(soloStorageKey(different, 'app', 'solo'));
    expect(readSolo(storage, different, 'app', 'solo').status).toBe('empty');
    expect(() => restoreSolo(different, JSON.stringify({ version: 1, board: JSON.stringify(b), run }))).toThrow('could not be restored');
  });

  it.each(['surveyor', 'builder', 'pathfinder'])('does not use %s bonuses to satisfy base solvability', kit => {
    const b = board(kit); b.projects.forEach(project => { project.cost = [6, 3]; });
    expect(engine.validateBoard(b, source)).toContain('Tabletop activity rewards must fund all three projects without relying on bonuses.');
    const healed = healBoard(b, source).board;
    expect(healed.expeditionKit).toBe(kit);
    expect(engine.validateBoard(healed, source)).toEqual([]);
  });

  it('keeps the kit when a refinement response omits the field', async () => {
    const b = board('builder'), reply = { ...b }; delete reply.expeditionKit;
    const provider = vi.fn().mockResolvedValue(JSON.stringify(reply));
    expect((await engine.refineBoard(provider, b, source, 'Shorten the instructions.')).board.expeditionKit).toBe('builder');
  });
});
