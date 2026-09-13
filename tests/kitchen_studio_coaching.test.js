import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sandbox={};
for(const name of ['engine','service'])vm.runInNewContext(readFileSync(`stem_lab/kitchen_studio/kitchen_studio_${name}.js`,'utf8'),sandbox);
const K=sandbox.KitchenStudio;
const play=(id,scenario,actions)=>actions.reduce((s,a)=>K.act(s,a),K.start(id,'demonstrate',scenario));
describe('Coaching for the current workspace',()=>{
  for(const m of K.missions)for(const scenario of K.scenarios(m.id))it(`guides ${m.id}/${scenario.id} to completion without a correction`,()=>{
    let s=K.start(m.id,'practice',scenario.id);
    for(let i=0;i<35&&!s.done;i++){
      const before=JSON.stringify(s),c=K.coaching(s);expect(JSON.stringify(s)).toBe(before);
      expect(c.restart).toBe(false);expect(K.mission(s.id,s.scenario).actions.some(a=>a[0]===c.action)).toBe(true);
      s=K.act(s,c.action);
    }
    expect(s.done).toBe(true);expect(K.evidence(s).corrections).toBe(0);expect(s.hints).toBe(0);
  });
  it('adjusts an excess measurement instead of repeating additions',()=>{
    let s=play('measure','four',['add150','add150','add150']);
    expect(K.coaching(s)).toMatchObject({action:'remove50'});expect(K.coaching(s).why).toContain('remove 150');
    for(let i=0;i<3;i++)s=K.act(s,K.coaching(s).action);
    expect(K.coaching(s).action).toBe('check');
  });
  it('requires fresh readings after heating and does not heat the ready chicken unnecessarily',()=>{
    let s=play('probe','standard',['thick','read']);expect(K.coaching(s).action).toBe('cook');
    s=K.act(s,'cook');expect(K.coaching(s).action).toBe('read');
    expect(K.coaching(play('probe','ready',['thick','read'])).action).toBe('serve');
  });
  it('retains a burned cook as a correction and recommends a fresh attempt',()=>{
    const s=play('heat','hot-pan',['advance','advance']);
    expect(s.values.brown).toBe(6);expect(K.evidence(s).corrections).toBe(1);
    expect(K.coaching(s).restart).toBe(true);
    let run=K.service.start();while(run.stage<3){while(!run.work.done)run.work=K.act(run.work,K.coaching(run.work).action);run.work=K.submit({...run.work,answer:K.mission(run.work.id,run.work.scenario).correct});run=K.service.advance(run);}for(const a of ['dry','spread','high','advance','advance','advance'])run.work=K.act(run.work,a);
    expect(K.service.report(K.service.retry(run)).corrections).toBe(1);
  });
  it('distinguishes disposal from a successful storage checkpoint',()=>{
    let s=play('chill','standard',['wait']);expect(K.coaching(s).action).toBe('discard');
    s=K.act(s,'discard');expect(s.done).toBe(false);expect(K.coaching(s).restart).toBe(true);
    expect(K.coaching(play('chill','picnic',[])).action).toBe('discard');
  });
  it('uses recipe-specific recovery language',()=>{
    expect(play('knife','stew',['rough']).feedback).toContain('uniform large dice');
    expect(play('prep','shared-board',['reuse']).feedback).toContain('Wash, rinse, and sanitize');
  });
});
describe('Requested support evidence',()=>{
  it('records each distinct level at each action position once',()=>{
    let s=K.start('measure','demonstrate','four');const initial=JSON.stringify(s);
    const first=K.requestHint(s,1);expect(JSON.stringify(s)).toBe(initial);s=first;
    expect(s.hints).toBe(1);expect(s.hintLog[0].text).not.toContain('300');
    expect(K.requestHint(s,1)).toBe(s);s=K.requestHint(s,2);
    expect(s.hints).toBe(2);expect(s.hintLog[1].text).toContain('300 mL');
    expect(K.requestHint(s,2)).toBe(s);s=K.act(s,'add150');s=K.requestHint(s,1);
    expect(s.hints).toBe(3);expect(s.hintLog[2].afterAction).toBe(1);
  });
  it('restores guidance from known state rather than trusting saved text',()=>{
    const state=play('measure','four',['add150']);
    const raw={hints:0,hintLog:[{afterAction:0,level:1,text:'Injected text'},{afterAction:1,level:2,text:'Incorrect target'},{afterAction:1,level:2},{afterAction:10,level:1},{afterAction:-1,level:1},{afterAction:0,level:5}]};
    const s=K.restoreHints(state,raw);expect(s.hints).toBe(2);expect(s.hintLog).toHaveLength(2);
    expect(s.hintLog[1].text).toContain('You have 150 mL');expect(JSON.stringify(s.hintLog)).not.toContain('Injected');
    expect(K.restoreHints(state,{hints:8}).hints).toBe(8);
  });
  it('preserves support classification and exports hint details',()=>{
    let s=K.requestHint(K.start('prep','demonstrate'),1);
    for(const a of ['wash','board','prepare'])s=K.act(s,a);
    s=K.submit({...s,answer:1});expect(K.requestHint(s,2)).toBe(s);
    const evidence=K.evidence(s);expect(evidence.status).toBe('Completed with support');expect(evidence.hintLog).toHaveLength(1);
    evidence.hintLog[0].text='Changed export';expect(s.hintLog[0].text).not.toBe('Changed export');
    expect(K.replay(s,1).state.hints).toBe(0);expect(s.hints).toBe(1);
  });
});
