import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board = options => ({ ...makeBoard(), playStyle: 'tabletop', ...options });
const choose = (b, run) => engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(b, run)) : run;
function move(b, before, id, funding) {
  let run = choose(b, before); run = engine.merge(run, engine.begin(b, run, id, funding));
  if (engine.stepOf(run).phase === 'answer') {
    const node = b.locations.find(item => item.id === id);
    run = engine.merge(run, engine.processAction(b, run, { attemptId: 'attempt', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'attempt', active: true }));
    run = engine.merge(run, engine.resolve(b, run, { solo: {} }));
  }
  return run;
}
const sequence = (b, ids) => ids.reduce((run, id) => move(b, run, id), engine.emptyRun());

describe('Authoritative construction payment choices', () => {
  it('can build earlier through exchange without making default payment free', () => {
    const b = board(), run = choose(b, sequence(b, ['heater', 'cloud']));
    expect(engine.derive(b, run).balance).toEqual([4, 2]);
    expect(engine.targets(b, run).map(item => item.id)).toContain('network');
    expect(engine.constructionFunding(b, run, 'network')).toMatchObject([
      { id: 'standard', affordable: false, safe: true, legal: false, reason: 'insufficient' },
      { id: 'research', cost: [3, 2], affordable: true, safe: true, legal: true, reason: null },
      { id: 'build', affordable: false, legal: false }
    ]);
    expect(() => engine.begin(b, run, 'network')).toThrow('funding');
    const built = engine.merge(run, engine.begin(b, run, 'network', 'research'));
    expect(engine.stepOf(built)).toMatchObject({ funding: 'research', phase: 'review' });
    expect(engine.derive(b, built)).toMatchObject({ balance: [1, 0], built: ['network'], bonus: [0, 1] });
    const advanced = engine.merge(built, engine.advance(b, built));
    expect(advanced.steps['t' + built.turn].funding).toBe('research');
    expect(engine.derive(b, advanced)).toEqual(engine.derive(b, built));
    expect(engine.restoreRun(b, built)).toEqual(built);
    expect(engine.restoreRun(b, advanced)).toEqual(advanced);
  });
  it('keeps standard and legacy run shapes unchanged', () => {
    for (const b of [makeBoard(), board()]) {
      const run = choose(b, sequence(b, ['heater', 'cloud', ...(b.playStyle ? ['heater'] : [])]));
      const built = engine.merge(run, engine.begin(b, run, 'research'));
      expect(engine.stepOf(built)).not.toHaveProperty('funding');
      expect(engine.derive(b, built).balance).toEqual([1, 1]);
      expect(engine.restoreRun(b, built)).toEqual(built);
    }
  });
  it('requires the complete exchanged cost before a Builder refund', () => {
    const b = board({ expeditionKit: 'builder' });
    b.locations.find(node => node.id === 'cloud').reward = [0, 1];
    const run = choose(b, sequence(b, ['heater', 'cloud']));
    expect(engine.derive(b, run).balance).toEqual([2, 2]);
    expect(engine.constructionFunding(b, run, 'network').every(option => !option.legal)).toBe(true);
    expect(() => engine.begin(b, run, 'network', 'research')).toThrow('no longer available');
    const forged = engine.merge(run, { ['steps.t' + run.turn]: { phase: 'review', targetId: 'network', funding: 'research', result: { success: true, marks: {} } } });
    expect(engine.derive(b, forged)).toMatchObject({ balance: [2, 2], built: [], kitCount: 0 });
    expect(() => engine.restoreRun(b, forged)).toThrow();
  });
  it('pays a refund once after the exchanged cost and never farms repeated construction', () => {
    const b = board({ expeditionKit: 'builder' }), run = choose(b, sequence(b, ['heater', 'cloud']));
    const built = engine.merge(run, engine.begin(b, run, 'network', 'research'));
    expect(engine.derive(b, built)).toMatchObject({ balance: [1, 2], built: ['network'], kitCount: 1, kitGains: [0, 2] });
    const advanced = choose(b, built);
    expect(() => engine.begin(b, advanced, 'network', 'research')).toThrow();
    const forged = engine.merge(advanced, { ['steps.t' + advanced.turn]: engine.stepOf(built) });
    expect(engine.derive(b, forged)).toEqual(engine.derive(b, built));
  });
  it('rejects payment data on locations, pending turns, and unsupported construction modes', () => {
    const b = board(), run = choose(b, sequence(b, ['heater', 'cloud']));
    expect(() => engine.begin(b, run, 'rain', 'research')).toThrow('funding');
    expect(() => engine.begin(b, run, 'network', 'free')).toThrow('funding');
    const location = sequence(b, ['heater']);
    location.steps.t0.funding = 'standard';
    expect(() => engine.restoreRun(b, location)).toThrow('funding');
    for (const funding of ['free', null, 1, {}]) {
      const forged = engine.merge(run, { ['steps.t' + run.turn]: { phase: 'review', targetId: 'network', funding, result: { success: true, marks: {} } } });
      expect(() => engine.restoreRun(b, forged)).toThrow('funding');
      expect(engine.derive(b, forged).built).toEqual([]);
    }
    const pending = engine.emptyRun(); pending.steps.t0.funding = 'research';
    expect(() => engine.restoreRun(b, pending)).toThrow('funding');
  });
  it('keeps student project votes unchanged and refuses encoded payment votes', () => {
    const b = board(), run = choose(b, sequence(b, ['heater', 'cloud']));
    const action = { attemptId: 'attempt', turn: run.turn, requestId: 'vote-a', kind: 'vote', targetId: 'network', value: '' };
    const accepted = engine.merge(run, engine.processAction(b, run, action, 'learner', { attemptId: 'attempt', active: true }));
    expect(engine.stepOf(accepted).votes.learner).toBe('network');
    expect(engine.stepOf(accepted)).not.toHaveProperty('voteFunding');
    const rejected = engine.merge(run, engine.processAction(b, run, { ...action, value: '1' }, 'learner', { attemptId: 'attempt', active: true }));
    expect(engine.stepOf(rejected).votes.learner).toBeUndefined();
  });
  it('protects a base-funded finish instead of allowing an affordable exchange to exhaust the reserve', () => {
    const b = board({ goal: 'architect' });
    b.projects.find(item => item.id === 'bridge').cost = [4, 1];
    b.projects.find(item => item.id === 'research').cost = [6, 3];
    b.projects.find(item => item.id === 'network').cost = [6, 4];
    const run = choose(b, sequence(b, ['heater', 'cloud', 'river', 'heater']));
    expect(engine.derive(b, run).balance).toEqual([6, 3]);
    expect(engine.constructionFunding(b, run, 'bridge')).toMatchObject([
      { id: 'standard', affordable: true, safe: true, legal: true },
      { id: 'research', cost: [6, 0], affordable: true, safe: false, legal: false, reason: 'completion-reserve' },
      { id: 'build', cost: [3, 3], affordable: true, safe: false, legal: false, reason: 'completion-reserve' }
    ]);
    expect(() => engine.begin(b, run, 'bridge', 'research')).toThrow('funding');
    const forged = engine.merge(run, { ['steps.t' + run.turn]: { phase: 'review', targetId: 'bridge', funding: 'research', result: { success: true, marks: {} } } });
    expect(engine.derive(b, forged).built).toEqual([]);
    expect(() => engine.restoreRun(b, forged)).toThrow('funding');
  });
  it('does not require funding all three projects when only two are needed', () => {
    const b = board({ goal: 'core' });
    b.projects.find(item => item.id === 'bridge').cost = [4, 1];
    b.projects.find(item => item.id === 'research').cost = [6, 3];
    b.projects.find(item => item.id === 'network').cost = [6, 4];
    const run = choose(b, sequence(b, ['heater', 'cloud', 'river', 'heater']));
    expect(engine.constructionFunding(b, run, 'bridge').find(option => option.id === 'research')).toMatchObject({ affordable: true, safe: true, legal: true });
  });
  it('counts the chosen workshop future yield but does not count fortune or unearned contracts', () => {
    const b = board({ goal: 'architect', chance: true });
    b.projects.find(item => item.id === 'research').cost = [4, 1];
    b.projects.find(item => item.id === 'bridge').cost = [6, 3];
    b.projects.find(item => item.id === 'network').cost = [6, 4];
    const run = choose(b, sequence(b, ['heater', 'cloud', 'river', 'heater']));
    expect(engine.constructionFunding(b, run, 'research').find(option => option.id === 'research')).toMatchObject({ affordable: true, safe: true, legal: true });
    b.projects.find(item => item.id === 'research').effect = { kind: 'path', targetId: 'weather' };
    b.contracts = [{ id: 'later', title: 'Later', description: 'A future bonus', locations: ['weather', 'cooler'], reward: [3, 3] }];
    expect(engine.constructionFunding(b, run, 'research').find(option => option.id === 'research')).toMatchObject({ affordable: true, safe: false, legal: false });
  });
  it('keeps the bridge fund available when two late workshops cannot satisfy construction use', () => {
    const b = board();
    b.projects.find(item => item.id === 'research').cost = [6, 1];
    b.projects.find(item => item.id === 'network').cost = [3, 1];
    b.projects.find(item => item.id === 'bridge').cost = [6, 6];
    const run = choose(b, sequence(b, ['heater', 'cloud', 'rain', 'sequence', 'weather', 'cooler', 'lake', 'river', 'heater', 'research', 'cloud']));
    expect(engine.derive(b, run)).toMatchObject({ balance: [10, 7], usedProjects: [], built: ['research'] });
    expect(engine.constructionFunding(b, run, 'network').find(option => option.id === 'research')).toMatchObject({ cost: [5, 0], affordable: true, safe: false, legal: false });
    expect(() => engine.begin(b, run, 'network', 'research')).toThrow('funding');
    expect(engine.constructionFunding(b, run, 'network').find(option => option.id === 'standard').legal).toBe(true);
  });
});
