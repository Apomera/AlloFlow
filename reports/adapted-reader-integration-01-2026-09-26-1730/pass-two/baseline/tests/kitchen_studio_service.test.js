import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const sandbox = {};
for (const name of ['engine', 'service']) vm.runInNewContext(readFileSync(`stem_lab/kitchen_studio/kitchen_studio_${name}.js`, 'utf8'), sandbox);
const K = sandbox.KitchenStudio, S = K.service;
const paths = { prep: ['wash', 'board', 'prepare'], knife: ['secure', 'claw', 'dice'], measure: ['add150', 'add150', 'check'], heat: ['dry', 'spread', 'medium', 'advance', 'advance', 'advance', 'plate'], probe: ['thick', 'cook', 'cook', 'cook', 'read', 'serve'], chill: ['shallow', 'label', 'chill'] };
function solve(s) { s = paths[s.id].reduce((s, a) => K.act(s, a), s); return K.submit({ ...s, answer: K.mission(s.id, s.scenario).correct }); }
function finish(run) { while (run.stage < 6) run = S.advance({ ...run, work: solve(run.work) }); return run; }
function replay(raw) { if (!raw || !K.missions.some(m => m.id === raw.id)) return null; let s = K.start(raw.id, raw.mode, raw.scenario); for (const e of raw.log || []) s = K.act(s, e.action); s.answer = raw.answer; s.hints = raw.hints || 0; return raw.submitted ? K.submit(s) : s; }

describe('Dinner for four rehearsal', () => {
  it('requires fresh submitted reasoning at each checkpoint', () => {
    let run = S.start('demonstrate');
    expect(S.advance(run)).toBe(run);
    run.work = paths.prep.reduce((s, a) => K.act(s, a), run.work);
    expect(S.advance(run)).toBe(run);
    run.work = K.submit({ ...run.work, answer: 0 });
    expect(S.ready(run)).toBe(false);
    expect(S.advance(run)).toBe(run);
    run = S.retry(run); run.work = solve(run.work); run = S.advance(run);
    expect(run.stage).toBe(1); expect(run.work.log).toHaveLength(0);
    expect(run.history).toHaveLength(1);
  });
  it('completes six distinct checkpoints and scales the sauce for four', () => {
    const run = finish(S.start('demonstrate')), report = S.report(run);
    expect(run.work).toBeNull(); expect(run.completed.map(s => s.id)).toEqual(['prep', 'knife', 'measure', 'heat', 'probe', 'chill']);
    expect(run.completed[2].values.ml).toBe(300);
    expect(report.status).toBe('Rehearsal completed independently'); expect(report.entries).toHaveLength(6);
    expect(S.advance(run)).toBe(run); expect(S.retry(run)).toBe(run);
  });
  it.each(['hint', 'correction', 'wrong reasoning'])('retains %s evidence through a clean retry', kind => {
    let run = S.start('demonstrate');
    if (kind === 'hint') run.work.hints = 1;
    if (kind === 'correction') run.work = K.act(run.work, 'prepare');
    if (kind === 'wrong reasoning') run.work = { ...solve(run.work), answer: 0 };
    run = finish(S.retry(run));
    const r = S.report(run); expect(r.status).toBe('Rehearsal completed with support');
    expect(r.entries).toHaveLength(7); expect(r.entries[0].kind).toBe('earlier attempt');
  });
  it('distinguishes coached completion from an independent demonstration', () => {
    expect(S.report(finish(S.start('practice'))).status).toBe('Rehearsal completed with coaching');
  });
  it('restores work by replay and rejects skipped or mismatched checkpoints', () => {
    let run = S.start(); run.work = solve(run.work); run = S.advance(run); run.work = K.act(run.work, 'secure');
    let saved = JSON.parse(JSON.stringify(run)); saved.stage = 5;
    const resumed = S.restore(saved, replay); expect(resumed.stage).toBe(1); expect(resumed.work.values.secure).toBe(true);
    saved.completed[0] = solve(K.start('knife', 'demonstrate'));
    expect(S.restore(saved, replay).stage).toBe(0);
    saved = JSON.parse(JSON.stringify(finish(S.start())));
    saved.completed[2].values.ml = 999;
    expect(S.restore(saved, replay).completed[2].values.ml).toBe(300);
    saved.completed[1].mode = 'practice'; expect(S.restore(saved, replay).stage).toBe(1);
    expect(S.restore(null, replay)).toBeNull();
  });
  it('bounds retries without discarding earlier support', () => {
    let run = S.start();
    for (let i = 0; i < 30; i++) { run.work = K.act(run.work, 'prepare'); run = S.retry(run); }
    run.work = K.act(run.work, 'prepare'); expect(S.retry(run)).toBe(run);
    expect(run.history).toHaveLength(30); expect(S.report(run).corrections).toBe(31);
  });
});

describe('Evidence-based next practice', () => {
  it('begins with guided foundational practice', () => {
    expect(K.nextPractice([], [])).toMatchObject({ id: 'prep', mode: 'practice', scenario: 'standard' });
  });
  it('offers a coached learner a fresh independent attempt', () => {
    expect(K.nextPractice([solve(K.start('knife', 'practice'))], [])).toMatchObject({ id: 'knife', mode: 'demonstrate' });
  });
  it('prioritizes the most recent unresolved reasoning, including repeated station visits', () => {
    const prep = { ...solve(K.start('prep', 'demonstrate')), answer: 0 };
    const knife = { ...solve(K.start('knife', 'demonstrate')), answer: 0 };
    expect(K.nextPractice([prep, knife, prep], []).id).toBe('prep');
    expect(K.nextPractice([prep, knife, solve(K.start('prep', 'demonstrate'))], []).id).toBe('knife');
  });
  it('uses retained independent evidence to suggest the first unproven foundation', () => {
    expect(K.nextPractice([], [solve(K.start('prep', 'demonstrate'))])).toMatchObject({ id: 'knife', mode: 'practice' });
  });
  it('offers variations after all foundations and a rehearsal after all variations', () => {
    const solved = finish(S.start()).completed;
    const foundations = solved.map(s => s.id === 'measure' ? K.submit({ ...K.act(K.act(K.act(K.act(K.start('measure', 'demonstrate'), 'add150'), 'add150'), 'add150'), 'check'), answer: 2 }) : s);
    expect(K.nextPractice([], foundations)).toMatchObject({ id: 'prep', scenario: 'shared-board', mode: 'demonstrate' });
    const variants = [['prep','shared-board',['board','sanitize','wash','prepare']],['knife','stew',['secure','claw','largeDice']],['heat','hot-pan',['medium','advance','plate']],['probe','ready',['thick','read','serve']],['measure','four',paths.measure],['chill','picnic',['discard']]].map(([id, scenario, actions]) => K.submit({ ...actions.reduce((s,a) => K.act(s,a), K.start(id,'demonstrate',scenario)), answer: K.mission(id,scenario).correct }));
    expect(K.nextPractice([], foundations.concat(variants)).service).toBe(true);
  });
});
