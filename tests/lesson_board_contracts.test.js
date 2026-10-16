import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { healBoard, editableDraft } from '../lesson_board_heal.js';
import { readSolo, saveSolo } from '../lesson_board_storage.js';
const { makeBoard, source } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const task = () => ({ id: 'temperature-circuit', title: 'Temperature survey', description: 'Investigate both temperature stations for extra expedition supplies.', locations: ['heater', 'cloud'], reward: [0, 2] });
const board = () => ({ ...makeBoard(), playStyle: 'tabletop', contracts: [task()] });
function move(b, before, id, options = {}) {
  let run = engine.stepOf(before).phase === 'review' ? engine.merge(before, engine.advance(b, before)) : before;
  run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase === 'answer') run = answer(b, run, options);
  return run;
}
function answer(b, run, { value, dice, uid = 'solo' } = {}) {
  const id = engine.stepOf(run).targetId, node = b.locations.find(item => item.id === id);
  const action = { attemptId: 'attempt', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: value ?? engine.solution(node) };
  const answered = engine.merge(run, engine.processAction(b, run, action, uid, { attemptId: 'attempt', active: true, paused: false }));
  return engine.merge(answered, engine.resolve(b, answered, { [uid]: {} }, { dice }));
}
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };

describe('Optional expedition contracts', () => {
  it('preserves boards without contracts and exposes no synthetic progress fields', () => {
    for (const b of [makeBoard(), { ...makeBoard(), playStyle: 'tabletop' }]) {
      expect(engine.prepareBoard(b)).not.toHaveProperty('contracts');
      expect(engine.derive(b, engine.emptyRun())).not.toHaveProperty('completedContracts');
      expect(engine.derive(b, engine.emptyRun())).not.toHaveProperty('contractGains');
      expect(engine.contractProgress(b, engine.emptyRun())).toEqual([]);
    }
  });

  it('validates and copies bounded contracts while stripping arbitrary fields', () => {
    const b = board(); b.contracts[0].script = 'untrusted';
    expect(engine.validateBoard(b, source)).toEqual([]);
    const prepared = engine.prepareBoard(b, source);
    expect(prepared.contracts).toEqual([task()]);
    prepared.contracts[0].locations.push('river');
    prepared.contracts[0].reward[0] = 3;
    expect(b.contracts[0].locations).toEqual(['heater', 'cloud']);
    expect(b.contracts[0].reward).toEqual([0, 2]);
  });

  it.each(['legacy', 'not-array', 'too-many', 'duplicate-id', 'location-id', 'project-id', 'unsafe-id', 'duplicate-set', 'unknown-location', 'repeated-location', 'too-few', 'too-long', 'zero-reward', 'large-reward', 'bad-title', 'bad-description'])('rejects invalid contract data: %s', failure => {
    const b = board();
    if (failure === 'legacy') delete b.playStyle;
    if (failure === 'not-array') b.contracts = {};
    if (failure === 'too-many') b.contracts = Array.from({ length: 4 }, () => task());
    if (failure === 'duplicate-id') b.contracts.push({ ...task(), locations: ['cloud', 'rain'] });
    if (failure === 'location-id') b.contracts[0].id = 'heater';
    if (failure === 'project-id') b.contracts[0].id = 'bridge';
    if (failure === 'unsafe-id') b.contracts[0].id = 'constructor';
    if (failure === 'duplicate-set') b.contracts.push({ ...task(), id: 'another', locations: ['cloud', 'heater'] });
    if (failure === 'unknown-location') b.contracts[0].locations = ['heater', 'missing'];
    if (failure === 'repeated-location') b.contracts[0].locations = ['heater', 'heater'];
    if (failure === 'too-few') b.contracts[0].locations = ['heater'];
    if (failure === 'too-long') b.contracts[0].locations = ['heater', 'cloud', 'river', 'rain'];
    if (failure === 'zero-reward') b.contracts[0].reward = [0, 0];
    if (failure === 'large-reward') b.contracts[0].reward = [0, 4];
    if (failure === 'bad-title') b.contracts[0].title = '';
    if (failure === 'bad-description') b.contracts[0].description = 'x'.repeat(301);
    expect(engine.validateBoard(b, source).length).toBeGreaterThan(0);
  });

  it('pays immediately when the final task is explored, making the printed construction cost affordable earlier', () => {
    const b = board(), first = move(b, engine.emptyRun(), 'heater');
    expect(engine.contractProgress(b, first)[0]).toMatchObject({ completed: 1, total: 2, remainingIds: ['cloud'], remaining: [{ id: 'cloud', name: 'Cloud laboratory' }], complete: false });
    expect(engine.derive(b, first).contractGains).toEqual([0, 0]);
    const finished = move(b, first, 'cloud'), p = engine.derive(b, finished);
    expect(p).toMatchObject({ completedContracts: ['temperature-circuit'], contractGains: [0, 2], balance: [4, 4], usedProjects: [], complete: false });
    expect(engine.contractProgress(b, finished)[0]).toMatchObject({ completed: 2, total: 2, remainingIds: [], complete: true });
    expect(engine.targets(b, finished).some(item => item.id === 'network')).toBe(true);
    expect(engine.constructionFunding(b, finished, 'network').find(option => option.id === 'standard').legal).toBe(true);
    const without = { ...b }; delete without.contracts;
    expect(engine.constructionFunding(without, finished, 'network').find(option => option.id === 'standard').legal).toBe(false);
    expect(engine.constructionFunding(without, finished, 'network').find(option => option.id === 'research').legal).toBe(true);
  });

  it('never pays for a failed response, retry start, cleared-space travel, or rereading saved events', () => {
    const b = board(), first = move(b, engine.emptyRun(), 'heater');
    let run = move(b, first, 'cloud', { value: '0,0' });
    expect(engine.derive(b, run).completedContracts).toEqual([]);
    run = engine.merge(run, engine.retry(b, run));
    expect(engine.derive(b, run).contractGains).toEqual([0, 0]);
    run = answer(b, run);
    const paid = engine.derive(b, run);
    run = move(b, move(b, run, 'heater'), 'cloud');
    expect(engine.derive(b, run).contractGains).toEqual([0, 2]);
    expect(engine.derive(b, run).balance).toEqual(paid.balance);
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
  });

  it('keeps contract awards separate from fortune and yield, including simultaneous completions', () => {
    const b = { ...board(), chance: true };
    b.contracts.push({ ...task(), id: 'three-stop-survey', locations: ['heater', 'cloud', 'river'], reward: [3, 0] });
    b.contracts.push({ ...task(), id: 'river-survey', locations: ['heater', 'river'], reward: [1, 1] });
    let run = move(b, engine.emptyRun(), 'heater', { dice: [1] });
    run = move(b, run, 'cloud', { dice: [13] });
    expect(engine.derive(b, run)).toMatchObject({ balance: [5, 5], fortune: [1, 1], contractGains: [0, 2] });
    run = engine.merge(run, engine.chooseFieldOpportunity(b, run, 'collect'));
    expect(engine.derive(b, run).fieldGains).toEqual([1, 0]);
    run = move(b, move(b, run, 'heater'), 'research');
    const before = engine.derive(b, run);
    run = move(b, run, 'river', { dice: [1, 1] });
    const after = engine.derive(b, run);
    expect(after.balance.map((value, i) => value - before.balance[i])).toEqual([7, 2]); // Base [2,1], yield [1,0], contracts [4,1].
    expect(after.contractGains).toEqual([4, 3]);
    expect(after.completedContracts).toEqual(['temperature-circuit', 'three-stop-survey', 'river-survey']);
    expect(after.fortune).toEqual([1, 1]);
  });

  it('restores contract-funded construction from the same authoritative events, ignoring forged derived fields', () => {
    const b = board(), storage = memory();
    const run = move(b, move(b, move(b, engine.emptyRun(), 'heater'), 'cloud'), 'network');
    run.completedContracts = ['fake']; run.contractGains = [99, 99];
    const saved = saveSolo(storage, b, 'app', 'solo', { run });
    expect(saved.status).toBe('saved');
    const restored = readSolo(storage, b, 'app', 'solo');
    expect(restored.status).toBe('saved');
    expect(restored.run).not.toHaveProperty('contractGains');
    expect(engine.derive(b, restored.run)).toMatchObject({ built: ['network'], contractGains: [0, 2], balance: [3, 1] });
  });

  it('uses existing bounded classroom answer actions with no client claim or bonus fields', () => {
    const b = board(), state = engine.createSession(b, 'teacher', { learner: {} });
    expect(state.board.contracts).toEqual([task()]);
    let run = move(b, engine.emptyRun(), 'heater', { uid: 'learner' });
    run = engine.merge(run, engine.advance(b, run));
    run = engine.merge(run, engine.begin(b, run, 'cloud'));
    const action = { attemptId: state.attemptId, turn: run.turn, requestId: 'response', kind: 'answer', targetId: 'cloud', value: engine.solution(b.locations.find(node => node.id === 'cloud')) };
    const context = { attemptId: state.attemptId, active: true, paused: false };
    expect(engine.validAction(action, state.attemptId, run.turn)).toBe(true);
    expect(engine.processAction(b, run, { ...action, contractGains: [3, 3] }, 'learner', context)).toEqual({});
    expect(engine.processAction(b, run, { ...action, kind: 'claim', targetId: 'temperature-circuit', value: '' }, 'learner', context)).toEqual({});
    run = engine.merge(run, engine.processAction(b, run, action, 'learner', context));
    expect(engine.processAction(b, run, action, 'learner', context)).toEqual({});
    run = engine.merge(run, engine.resolve(b, run, { learner: {} }));
    expect(engine.derive(b, run).contractGains).toEqual([0, 2]);
    expect(engine.stepOf(run).result).toEqual({ success: true, marks: { learner: true } });
  });

  it('never relies on optional rewards to guarantee the base project economy', () => {
    const b = board(); b.projects.forEach(project => { project.cost = [6, 3]; });
    b.contracts[0].reward = [3, 3];
    expect(engine.validateBoard(b, source)).toContain('Tabletop activity rewards must fund all three projects without relying on bonuses.');
    const healed = healBoard(b, source).board;
    expect(healed.contracts).toEqual(b.contracts);
    expect(engine.validateBoard(healed, source)).toEqual([]);
    expect(healed.projects.reduce((sum, project) => sum + project.cost[0], 0)).toBeLessThanOrEqual(16);
  });

  it('heals location aliases and optional malformed contracts without inventing locations', () => {
    const b = board();
    b.contracts[0].id = 'heater';
    b.contracts[0].locations = ['Heating station', 'Cloud laboratory'];
    b.contracts.push({ ...task(), id: 'duplicate' }, { ...task(), id: 'missing', locations: ['unknown', 'heater'] });
    const healed = healBoard(b, source);
    expect(healed.fixes).toContain('contracts');
    expect(healed.board.contracts).toHaveLength(1);
    expect(healed.board.contracts[0]).toMatchObject({ id: 'heater-2', locations: ['heater', 'cloud'] });
    expect(engine.validateBoard(healed.board, source)).toEqual([]);
    const legacy = { ...b }; delete legacy.playStyle;
    expect(healBoard(legacy, source).board).not.toHaveProperty('contracts');
  });

  it('opens only renderable contract shapes in draft recovery', () => {
    expect(editableDraft(makeBoard())).toBe(true);
    expect(editableDraft(board())).toBe(true);
    for (const contracts of [null, {}, [null], [{ ...task(), title: null }], [{ ...task(), locations: null }], [{ ...task(), locations: [3] }], [{ ...task(), reward: [1, NaN] }]]) expect(editableDraft({ ...board(), contracts })).toBe(false);
    // Semantic errors remain editable when the fields can safely render.
    expect(editableDraft({ ...board(), contracts: [{ ...task(), locations: ['missing'], reward: [9, 0] }] })).toBe(true);
  });

  it('includes optional side-objective guidance and retains omitted contracts during refinement', async () => {
    const b = board(), reply = { ...b }; delete reply.contracts;
    const provider = vi.fn().mockResolvedValue(JSON.stringify(reply));
    const refined = await engine.refineBoard(provider, b, source, 'Shorten the mission.');
    expect(refined.board.contracts).toEqual(b.contracts);
    expect(engine.promptFor(source, { playStyle: 'tabletop' })).toContain('contracts are optional and never a victory requirement');
    expect(engine.promptFor(source)).not.toContain('contracts are optional and never a victory requirement');
    const removal = vi.fn().mockResolvedValue(JSON.stringify({ ...reply, contracts: [] }));
    expect((await engine.refineBoard(removal, b, source, 'Remove the side objectives.')).board).not.toHaveProperty('contracts');
  });
});
