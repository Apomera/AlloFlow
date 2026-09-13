import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sandbox = {};
vm.runInNewContext(readFileSync('stem_lab/kitchen_studio/kitchen_studio_engine.js', 'utf8'), sandbox);
const K = sandbox.KitchenStudio;
const play = (id, scenario, actions) => actions.reduce((s,a) => K.act(s,a), K.start(id,'demonstrate',scenario));
const record = s => K.submit({...s,answer:K.mission(s.id,s.scenario).correct,plan:'My prediction',reflection:'My explanation',hints:1});

describe('Kitchen action replay', () => {
  it('reconstructs each action without changing the submitted evidence', () => {
    const s = record(play('prep','standard',['prepare','wash','board','prepare']));
    const before = JSON.stringify(s);
    for (let i=0; i<=s.log.length; i++) {
      const r = K.replay(s,i);
      expect(r.step).toBe(i); expect(r.total).toBe(4);
      expect(r.state.values).toEqual(i?s.log[i-1].values:K.start('prep','demonstrate').values);
      expect(r.state.submitted).toBe(false);
    }
    expect(JSON.stringify(s)).toBe(before);
    expect(K.evidence(s).status).toBe('Completed with support');
  });
  it('keeps an unsuccessful decision in the replay', () => {
    const s=record(play('prep','standard',['prepare','wash','board','prepare']));
    const r=K.replay(s,1);
    expect(r.entry.accepted).toBe(false); expect(r.entry.action).toBe('prepare');
    expect(r.state.done).toBe(false); expect(r.entry.observation).toContain('only after');
    r.entry.observation='Edited review';r.state.values.washed=true;
    expect(s.log[0].observation).not.toBe('Edited review');expect(s.log[0].values.washed).not.toBe(true);
  });
  it.each([
    ['heat','hot-pan',['medium','advance','plate']],
    ['probe','ready',['thick','read','serve']],
    ['measure','four',['add150','add150','check']],
    ['chill','picnic',['discard']],
    ['knife','stew',['secure','claw','largeDice']],
    ['prep','shared-board',['board','sanitize','wash','prepare']]
  ])('replays the actual starting conditions for %s / %s', (id, scenario, actions) => {
    const s=record(play(id,scenario,actions));
    expect(K.replay(s,0).state.values).toEqual(K.start(id,'demonstrate',scenario).values);
    expect(K.replay(s,actions.length).state.values).toEqual(s.values);
    expect(K.replay(s,actions.length).state.done).toBe(true);
    expect(K.replay(s,actions.length).state.scenario).toBe(scenario);
  });
  it('bounds the review index and supports empty attempts', () => {
    const s=record(play('measure','four',['add150','add150','check']));
    expect(K.replay(s,-1).step).toBe(0);expect(K.replay(s,999).step).toBe(3);
    for(const index of [NaN,Infinity,1.5,'2',null])expect(K.replay(s,index).step).toBe(0);
    expect(K.replay(K.start('prep'),0).entry).toBeNull();
  });
});
