import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sandbox = { module: { exports: {} } };
vm.runInNewContext(readFileSync('stem_lab/kitchen_studio/kitchen_studio_engine.js', 'utf8'), sandbox);
const K = sandbox.module.exports;
const play = (id, scenario, actions) => actions.reduce((s, a) => K.act(s, a), K.start(id, 'demonstrate', scenario));
const solved = (s) => K.submit({ ...s, answer: K.mission(s.id, s.scenario).correct });
const examples = [
  ['prep', 'shared-board', ['board', 'sanitize', 'wash', 'prepare']],
  ['knife', 'stew', ['secure', 'claw', 'largeDice']],
  ['heat', 'hot-pan', ['medium', 'advance', 'plate']],
  ['probe', 'ready', ['thick', 'read', 'serve']],
  ['measure', 'four', ['add150', 'add150', 'check']],
  ['chill', 'picnic', ['discard']]
];
describe('Kitchen Studio transfer challenges', () => {
  it('offers two distinct challenges per station without mutating the base catalog', () => {
    for (const m of K.missions) {
      expect(K.scenarios(m.id)).toHaveLength(2);
      const variant = K.mission(m.id, K.scenarios(m.id)[1].id);
      expect(variant.brief).not.toBe(m.brief);
      expect(variant.id).toBe(m.id);
      variant.actions[0][1] = 'Changed copy';
      expect(K.mission(m.id, variant.scenario).actions[0][1]).not.toBe('Changed copy');
    }
  });
  for (const [id, scenario, actions] of examples) {
    it(`${scenario}: verifies the specific task and preserves its evidence`, () => {
      const s = play(id, scenario, actions);
      expect(s.done).toBe(true);
      expect(K.criteria(s).every(c => c.met)).toBe(true);
      const e = K.evidence(solved(s));
      expect(e.status).toBe('Completed independently');
      expect(e.scenario).toBe(scenario);
      expect(e.scenarioLabel).not.toBe('Foundation challenge');
      expect(e.actions).toHaveLength(actions.length);
    });
  }
  it('requires washing equipment before sanitizing in the shared-board challenge', () => {
    const s = play('prep', 'shared-board', ['sanitize', 'wash', 'prepare']);
    expect(s.done).toBe(false);
    expect(s.values.clean).not.toBe(true);
    expect(K.evidence(s).corrections).toBeGreaterThan(0);
    expect(play('prep', 'shared-board', ['wash', 'board', 'sanitize', 'prepare']).done).toBe(false);
  });
  it('does not accept the memorized small-dice choice for a large-dice recipe', () => {
    const s = play('knife', 'stew', ['secure', 'claw', 'dice']);
    expect(s.done).toBe(false);
    expect(K.criteria(s).find(c => c.label === 'Requested cut made').met).toBe(false);
    expect(K.act(s, 'largeDice').done).toBe(true);
  });
  it('starts the hot pan partly browned and still makes burning irreversible', () => {
    expect(K.start('heat', 'practice', 'hot-pan').values.brown).toBe(2);
    const burned = play('heat', 'hot-pan', ['advance', 'advance', 'plate']);
    expect(burned.values.brown).toBe(6);
    expect(burned.done).toBe(false);
    expect(K.act(burned, 'dry').values.brown).toBe(6);
  });
  it('permits a correct ready-chicken decision without unnecessary cooking', () => {
    expect(play('probe', 'ready', ['thick', 'read', 'serve']).done).toBe(true);
    expect(play('probe', 'standard', ['thick', 'read', 'serve']).done).toBe(false);
    expect(play('probe', 'ready', ['serve']).done).toBe(false);
    expect(play('probe', 'ready', ['surface', 'read', 'serve']).done).toBe(false);
  });
  it('changes the required quantity and reasoning with the serving request', () => {
    expect(play('measure', 'four', ['add150', 'add150', 'add150', 'check']).done).toBe(false);
    expect(play('measure', 'standard', ['add150', 'add150', 'check']).done).toBe(false);
    const m = K.mission('measure', 'four');
    expect(m.answers[m.correct]).toContain('two');
    expect(m.targetMl).toBe(300);
  });
  it('distinguishes required disposal from unsuccessful storage followed by recovery', () => {
    expect(play('chill', 'picnic', ['shallow', 'label', 'chill']).done).toBe(false);
    expect(play('chill', 'picnic', ['discard']).done).toBe(true);
    expect(play('chill', 'standard', ['wait', 'discard']).done).toBe(false);
    expect(play('chill', 'standard', ['discard']).done).toBe(false);
  });
  it('keeps legacy attempts on the foundation challenge', () => {
    expect(K.start('measure', 'practice').scenario).toBe('standard');
    expect(K.start('measure', 'practice', 'unknown').scenario).toBe('standard');
    expect(K.mission('measure').targetMl).toBe(450);
  });
  it('separates recorded attempts from independent skills and varied demonstrations', () => {
    const four = solved(play('measure', 'four', ['add150', 'add150', 'check']));
    const standard = solved(play('measure', 'standard', ['add150', 'add150', 'add150', 'check']));
    const practice = { ...four, mode: 'practice' };
    const wrong = { ...four, id: 'prep', answer: 0 };
    let summary = K.summarize([practice, wrong]);
    expect(summary.find(s => s.id === 'measure').recorded).toBe(true);
    expect(summary.find(s => s.id === 'measure').independent).toBe(false);
    summary = K.summarize([four, standard, four]);
    expect(summary.find(s => s.id === 'measure').scenarios).toHaveLength(2);
    expect(summary.filter(s => s.independent)).toHaveLength(1);
  });
  it('retains a learner prediction without treating it as a scored explanation', () => {
    const s = solved({ ...play('measure', 'four', ['add150', 'add150', 'check']), plan: 'I predict I need twice as much stock.' });
    expect(K.evidence(s).plan).toContain('twice');
    expect(K.evidence(s).status).toBe('Completed independently');
  });
});
