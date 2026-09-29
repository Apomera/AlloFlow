import {describe, it, expect} from 'vitest';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../life_skills_outing/engine.js');
const copy = value => JSON.parse(JSON.stringify(value));
const play = (run, ids) => ids.reduce((next, id) => E.dispatch(next, id), run);
function storage() {
  const map = new Map([['allo_adventure_save', 'untouched']]);
  return {map, get length() { return map.size; }, key: i => [...map.keys()][i],
    getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value)};
}
function ready(options = {}) {
  return play(E.createRun(options), ['wear_ready', 'fill_water', 'pack_water', 'pack_document', options.variation === 'warm' ? 'pack_hat' : 'pack_raincoat']);
}
describe('Life Skills outing authored engine', () => {
  it('retries before a decision with the same rules, earlier actions and only relevant prose', () => {
    let source = copy(E.createRun({runId:'original-retry',support:'try'})); source.manifestVersion=1;
    source = E.addContent(source,{id:'intro',kind:'intro',status:'authored',revision:0,text:'An outing awaits.'});
    source = play(source,['hint','prepare_clothes','fill_water']);
    source = E.addContent(source,{id:'plan',kind:'dialogue',intent:'plan',status:'generated',revision:3,text:'Your clothes are ready.'});
    const original = JSON.stringify(source), retry=E.branchRun(source,1,{runId:'retry'});
    expect(retry.manifestVersion).toBe(1);
    expect(retry.config).toEqual(source.config);
    expect(retry.commands).toEqual(source.commands.slice(0,1));
    expect(retry.content.map(e=>e.id)).toEqual(['intro']);
    expect(E.materialize(retry)).toMatchObject({minutes:0,hints:1,clothingReady:false});
    const revised=E.dispatch(retry,'wear_ready');
    expect(E.history(revised)[1]).toMatchObject({clock:'09:02',station:'wardrobe',actionId:'wear_ready'});
    expect(E.materialize(revised).observations[0].support).toContain('requested clue');
    expect(JSON.stringify(source)).toBe(original);
    for (const revision of [-1,1.5,source.commands.length]) expect(()=>E.branchRun(source,revision)).toThrow(/decision/);
    expect(()=>E.branchRun(source,0,{runId:source.runId})).toThrow(/new outing ID/);
  });
  it('checks the shared starting point before accepting a comparison', () => {
    const original=play(E.createRun(),['fill_water','pack_water','wear_ready']);
    const retry=E.branchRun(original,2);
    expect(E.validateComparison(retry,{original,revision:2}).original).toEqual(original);
    const changed=copy(retry); changed.config.variation='warm';
    expect(()=>E.validateComparison(changed,{original,revision:2})).toThrow(/starting point/);
    const unrelated=play(E.createRun(),['wear_ready','fill_water']);
    expect(()=>E.validateComparison(unrelated,{original,revision:2})).toThrow(/starting point/);
    expect(()=>E.validateComparison(retry,{original,revision:3})).toThrow(/starting point/);
  });
  it('round-trips reflections and comparisons and still reads original prototype downloads', () => {
    const original=play(ready(),['choose_bus','depart']);
    const retry=play(E.branchRun(original,5),['choose_walk','depart']);
    const backup=E.createBackup(retry,'Check travel access.',{original,revision:5});
    const restored=E.readBackup(JSON.stringify(backup));
    expect(restored).toEqual(backup);
    expect(E.readBackup(JSON.stringify(original))).toMatchObject({run:original,reflection:''});
    const separate=E.copyRun(restored.run);
    expect(separate.runId).not.toBe(retry.runId);
    expect(E.materialize(separate)).toEqual(E.materialize(retry));
    expect(E.validateComparison(separate,restored.comparison)).toEqual(restored.comparison);
    const store=storage(); E.saveRun(store,original); E.saveRun(store,retry); E.saveRun(store,separate);
    expect(E.readRun(store,E.saveKey(original))).toEqual(original);
    expect(E.listRuns(store).filter(entry=>entry.run)).toHaveLength(3);
  });
  it('rejects malformed and oversized backups before they can become practices', () => {
    const backup=copy(E.createBackup(E.createRun(),''));
    expect(()=>E.readBackup('{broken')).toThrow(/readable/);
    expect(()=>E.readBackup(' '.repeat(300001))).toThrow(/300 KB/);
    expect(()=>E.readBackup(JSON.stringify({...backup,version:99}))).toThrow(/version/);
    for(const reflection of [null,{},'a'.repeat(601)]) expect(()=>E.readBackup(JSON.stringify({...backup,reflection}))).toThrow(/reflection/);
    backup.run.commands.push({id:'invalid',revision:0,actionId:'depart'});
    expect(()=>E.readBackup(JSON.stringify(backup))).toThrow(/unavailable/);
  });
  it('updates a planned bus arrival when the delay arrives and supports two recoveries', () => {
    for (const route of ['choose_walk', 'choose_ride']) {
      let run = play(E.createRun({variation:'bus-delay'}), ['choose_bus','prepare_clothes','fill_water']);
      expect(E.view(run).travel.arrival).toBe('09:30');
      run = E.dispatch(run, 'pack_water');
      expect(E.view(run).travel).toMatchObject({arrival:'09:45',onTime:false});
      expect(E.view(run).event.body).toContain('09:45');
      expect(E.view(run).facts.join(' ')).toContain('09:45 (delayed)');
      run = play(run, ['pack_document','pack_raincoat']);
      expect(() => E.dispatch(run, 'depart')).toThrow(/route that arrives/);
      run = play(run, [route,'depart']);
      expect(E.view(run).completed).toBe(true);
      expect(E.materialize(run).arrival).toBeLessThanOrEqual(35);
    }
  });
  it('preserves version-one saves and rejects silently changing their rules', () => {
    const legacy = copy(E.createRun({runId:'legacy'})); legacy.manifestVersion = 1;
    const run = play(E.validateRun(legacy), ['fill_water','pack_water','wear_ready','pack_document','pack_raincoat','choose_bus','depart']);
    expect(E.view(run).summary).toContain('09:30');
    expect(E.validateRun(copy(run)).manifestVersion).toBe(1);
    expect(E.view(legacy).routes.map(route => route.id)).not.toContain('ride');
    expect(() => E.dispatch(legacy, 'choose_ride')).toThrow(/unavailable/);
    const store = storage(); E.saveRun(store, run);
    const changed = copy(run); changed.manifestVersion = 2;
    expect(E.saveRun(store, changed).ok).toBe(false);
    expect(E.readRun(store, E.saveKey(run)).manifestVersion).toBe(1);
    expect(E.forkRun(run, {variation:'bus-delay'}).manifestVersion).toBe(2);
  });
  it('exposes truthful object states and a readable journal without making inspection an action', () => {
    const base = E.createRun();
    expect(E.view(base).objects.find(item => item.id === 'bottle').status).toContain('Empty');
    const run = play(base, ['fill_water','pack_water']);
    const before = JSON.stringify(run);
    expect(E.view(run).objects.find(item => item.id === 'bottle').status).toBe('Filled and packed');
    expect(E.view(run).objects.find(item => item.id === 'bag').status).toBe('1 of 3 items packed');
    expect(E.view(run).recent[0]).toMatchObject({revision:2,clock:'09:02',consequence:'The filled bottle is in your bag.'});
    expect(JSON.stringify(run)).toBe(before);
  });
  it('completes both contexts and forecast variations with alternative travel and clothing choices', () => {
    for (const context of ['community', 'work']) for (const variation of ['rain', 'warm']) for (const outfit of ['wear_ready', 'prepare_clothes']) for (const route of ['choose_walk', 'choose_bus']) {
      let run = E.createRun({context, variation});
      run = play(run, ['inspect_forecast', 'fill_water', outfit, 'pack_document', 'pack_water', variation === 'rain' ? 'pack_raincoat' : 'pack_hat', route, 'depart']);
      expect(E.materialize(run).departed).toBe(true);
      expect(E.materialize(run).arrival).toBeLessThanOrEqual(35);
      expect(E.view(run).objectives.every(item => item.complete)).toBe(true);
      expect(E.view(run).stations.every(station => !station.actions.length)).toBe(true);
      expect(() => E.dispatch(run, 'hint')).toThrow(/unavailable/);
    }
  });
  it('requires fill-before-pack and complete departure while preserving previous state', () => {
    const run = E.createRun();
    expect(() => E.dispatch(run, 'pack_water')).toThrow(/Fill/);
    expect(() => E.dispatch(run, 'depart')).toThrow(/Before leaving/);
    const next = E.dispatch(run, 'fill_water');
    expect(E.materialize(run).bottleFilled).toBe(false);
    expect(E.materialize(next).bottleFilled).toBe(true);
    expect(Object.isFrozen(next.config)).toBe(true);
    expect(Object.isFrozen(next.commands)).toBe(true);
  });
  it('announces one forecast change and lets a previously packed item be corrected', () => {
    let run = play(E.createRun({variation: 'rain'}), ['pack_hat', 'fill_water']);
    expect(E.view(run).event).toBeNull();
    run = E.dispatch(run, 'wear_ready');
    const event = E.view(run).event;
    expect(event.body).toContain('rain');
    expect(E.view(run).objectives.find(item => item.id === 'weather').complete).toBe(false);
    run = play(run, ['pack_raincoat', 'pack_water', 'pack_document', 'choose_walk', 'depart']);
    expect(E.view(run).event).toEqual(event);
    expect(E.view(run).completed).toBe(true);
    expect(E.view(run).observations.some(item => item.skill === 'Adapting a plan')).toBe(true);
  });
  it('lets a late-route decision be corrected without a progress trap', () => {
    let run = E.dispatch(ready(), 'choose_late_bus');
    expect(E.view(run).feedback).toContain('after');
    expect(() => E.dispatch(run, 'depart')).toThrow(/route that arrives/);
    run = play(run, ['choose_bus', 'depart']);
    expect(E.materialize(run).arrival).toBe(30);
    expect(E.view(run).clock).toBe('09:30');
  });
  it('makes the updated forecast note readable again without unbounded time costs', () => {
    let run = play(E.createRun(), ['inspect_forecast', 'fill_water', 'prepare_clothes', 'pack_water']);
    const note = E.view(run).stations.find(station => station.id === 'entry').actions.find(action => action.id === 'inspect_forecast');
    expect(note.disabled).toBe(false);
    run = E.dispatch(run, 'inspect_forecast');
    expect(() => E.dispatch(run, 'inspect_forecast')).toThrow(/latest forecast/);
    run = play(run, ['pack_document', 'pack_raincoat', 'choose_walk', 'depart']);
    expect(E.materialize(run).minutes).toBe(14);
    expect(E.materialize(run).arrival).toBe(32);
    expect(E.view(run).observations.some(item => item.skill === 'Checking information')).toBe(true);
  });
  it('does not spend clock time on support or repeated route and item changes', () => {
    let run = play(E.createRun(), ['prepare_clothes', 'inspect_forecast', 'fill_water', 'pack_water', 'pack_document', 'pack_raincoat']);
    const minutes = E.materialize(run).minutes;
    expect(minutes).toBe(13);
    for (let i = 0; i < 20; i++) run = play(run, ['hint', 'pack_hat', 'choose_late_bus', 'pack_raincoat', 'choose_walk']);
    expect(E.materialize(run).minutes).toBe(minutes);
    expect(E.view(E.dispatch(run, 'depart')).completed).toBe(true);
  });
  it('replays exact serialized state and rejects invalid, duplicate or stale commands', () => {
    const run = E.dispatch(E.createRun(), 'fill_water', 0, 'first-event');
    expect(E.materialize(E.validateRun(copy(run)))).toEqual(E.materialize(run));
    expect(() => E.dispatch(run, 'pack_water', 0)).toThrow(/already/);
    expect(() => E.dispatch(run, 'pack_water', 1, 'first-event')).toThrow(/duplicate/);
    const duplicate = copy(run); duplicate.commands.push({...duplicate.commands[0], revision: 1});
    expect(() => E.validateRun(duplicate)).toThrow(/duplicate/);
    const invalidAction = copy(run); invalidAction.commands[0].actionId = 'invented_action';
    expect(() => E.validateRun(invalidAction)).toThrow(/unavailable/);
    for (const field of ['version', 'manifestVersion']) {
      const invalidVersion = copy(run); invalidVersion[field] = 99;
      expect(() => E.validateRun(invalidVersion)).toThrow(/version/);
    }
    expect(() => E.createRun({runId: 123})).toThrow(/ID/);
  });
  it('records support without equating language access or completion with mastery', () => {
    const plain = play(E.createRun({support: 'independent', language: 'plain'}), ['hint', 'fill_water', 'pack_water']);
    const standard = play(E.createRun({support: 'independent', language: 'standard'}), ['hint', 'fill_water', 'pack_water']);
    expect(E.view(plain).observations).toEqual(E.view(standard).observations);
    expect(E.view(plain).observations[0].support).toContain('requested clue');
    expect(JSON.stringify(E.view(plain).observations)).not.toMatch(/mastery|score|XP/);
    const guided = play(E.createRun({support: 'guided'}), ['fill_water', 'pack_water']);
    expect(E.view(guided).observations[0].support).toBe('guided');
  });
  it('keeps narration inert, validates ownership, and preserves accepted prose', () => {
    const base = E.createRun({runId: 'content-test'});
    const content = {id: 'intro-1', revision: 0, kind: 'intro', status: 'generated', text: 'A friendly invitation is waiting.'};
    const withText = E.addContent(base, content);
    expect(E.materialize(withText)).toEqual(E.materialize(base));
    expect(E.validateRun(copy(withText)).content[0]).toEqual(content);
    expect(() => E.addContent(E.dispatch(base, 'fill_water'), content)).toThrow(/earlier/);
    expect(() => E.addContent(withText, {...content, id: 'intro-2'})).toThrow(/already/);
    expect(() => E.addContent(base, {...content, text: 'a'.repeat(1201)})).toThrow(/narration/);
    expect(() => E.addContent(base, {...content, kind: 'dialogue', intent: 'invent_new_rule'})).toThrow(/narration/);
    const injected = copy(withText); injected.content[0].effects = {departed: true};
    expect(E.validateRun(injected).content[0]).not.toHaveProperty('effects');
    expect(E.materialize(injected).departed).toBe(false);
    let all = withText;
    for (const intent of ['plan', 'change', 'help']) all = E.addContent(all, {id: intent, revision: 0, kind: 'dialogue', intent, text: 'Hello.', status: 'authored'});
    expect(all.content).toHaveLength(4);
  });
  it('preserves conflicting and corrupt saves without touching Adventure saves', () => {
    const store = storage(), first = E.createRun({runId: 'save-first'});
    expect(E.saveRun(store, first).ok).toBe(true);
    const filled = E.dispatch(first, 'fill_water');
    expect(E.saveRun(store, filled).ok).toBe(true);
    expect(E.readRun(store, E.saveKey(first))).toEqual(filled);
    expect(E.saveRun(store, E.dispatch(first, 'wear_ready')).ok).toBe(false);
    expect(E.saveRun(store, first).ok).toBe(false);
    const second = E.forkRun(filled, {runId: 'save-second', variation: 'warm'});
    expect(second.commands).toHaveLength(0);
    expect(second.config.variation).toBe('warm');
    expect(E.saveRun(store, second).ok).toBe(true);
    expect(E.listRuns(store).filter(item => item.run)).toHaveLength(2);
    const broken = E.createRun({runId: 'broken'}), key = E.saveKey(broken);
    store.setItem(key, '{broken');
    expect(E.saveRun(store, broken).ok).toBe(false);
    expect(store.getItem(key)).toBe('{broken');
    expect(E.listRuns(store).find(item => item.key === key).error).toBeTruthy();
    expect(store.getItem('allo_adventure_save')).toBe('untouched');
    expect(() => E.readRun(store, 'allo_adventure_save')).toThrow(/Only/);
  });
  it('retains conflicting prose and reports unavailable storage', () => {
    const store = storage(), base = E.createRun({runId: 'text-conflict'});
    const first = E.addContent(base, {id: 'intro-a', revision: 0, kind: 'intro', text: 'First version.', status: 'generated'});
    const second = E.addContent(base, {id: 'intro-b', revision: 0, kind: 'intro', text: 'Other version.', status: 'generated'});
    expect(E.saveRun(store, first).ok).toBe(true);
    expect(E.saveRun(store, second).ok).toBe(false);
    expect(E.readRun(store, E.saveKey(base)).content[0].text).toBe('First version.');
    expect(E.saveRun({getItem() { throw Error('blocked'); }}, first)).toMatchObject({ok: false});
  });
});
