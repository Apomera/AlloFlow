import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_quiz_source.jsx', 'utf8');
const gradingWindow = {};
new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(gradingWindow);
function tab() {
  return new Function('_quizIsAnswerKeyDisputed', source.slice(source.indexOf('var _QUIZ_DRAFT_STORAGE_PREFIX'), source.indexOf('function _quizUseDraftField')) + `;return {
    read:_quizReadDraftField, write:_quizWriteDraftField, stage:_quizStageDraftField,
    working:_quizReadWorkingDraft, save:_quizSaveWorkingDraft, useSaved:_quizUseSavedDraft,
    finalize:_quizFinalizeAttempt, receipt:_quizReadAttemptReceipt, clear:_quizClearAttemptReceipt,
    namespace:_quizDraftNamespace, previousNamespace:_quizPreviousDraftNamespace,
    prepare:_quizPrepareDraft, earlier:_quizFindEarlierVersion,
    receiptKey:_quizAttemptStorageKey, states:_quizDraftWriteState
  };`)(gradingWindow.AlloModules.QuizLiveAggregators.isAnswerKeyDisputed);
}
const ns = 'alloflow_assess_draft_v1:shared';
const context = (signature = 'first', extra = {}) => ({ resourceId:'r1', sessionCode:'class', activityId:'a1', userId:'u1', signature, previousSignature:'old', ...extra });
const data = () => ({ questions:[{ type:'mcq', question:'Pick a shape', options:['Circle','Square'], correctAnswer:'Circle', imageUrl:'shape.png', imageAltText:'A shape', question_en:'A gloss', options_en:['Round','Angular'] }] });
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function installSharedBrowserLocks() {
  const queues = new Map();
  const request = vi.fn((name, options, operation) => {
    const result = (queues.get(name) || Promise.resolve()).then(operation);
    queues.set(name, result.then(() => undefined, () => undefined));
    return result;
  });
  vi.stubGlobal('navigator', { locks: { request } });
  return request;
}

describe('Assess concurrent drafts', () => {
  it('serializes simultaneous scalar writes so the second tab preserves a visible conflict', async () => {
    const a = tab(), b = tab();
    a.write(ns, 'q-0', 'response', 'Shared original');
    a.read(ns, 'q-0', 'response'); b.read(ns, 'q-0', 'response');
    const request = installSharedBrowserLocks();
    const results = await Promise.all([
      a.write(ns, 'q-0', 'response', 'Answer from A'),
      b.write(ns, 'q-0', 'response', 'Answer from B'),
    ]);
    expect(results).toEqual([true, false]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe(request.mock.calls[1][0]);
    expect(request.mock.calls.every(([, options]) => options.mode === 'exclusive')).toBe(true);
    expect(JSON.parse(localStorage.getItem(ns)).items['q-0'].response).toBe('Answer from A');
    expect(b.states[ns]).toMatchObject({ state: 'error', reason: 'conflict' });
    expect(b.working(ns).items['q-0'].response).toBe('Answer from B');
  });

  it('merges simultaneous independent fields after each tab acquires the browser lock', async () => {
    const a = tab(), b = tab();
    a.write(ns, 'root', 'attemptMeta', { attemptId: 'shared' });
    a.read(ns, 'q-0', 'response'); b.read(ns, 'q-1', 'response');
    installSharedBrowserLocks();
    expect(await Promise.all([
      a.write(ns, 'q-0', 'response', 'Roots absorb water'),
      b.write(ns, 'q-1', 'response', 'Leaves absorb light'),
    ])).toEqual([true, true]);
    expect(JSON.parse(localStorage.getItem(ns)).items).toMatchObject({
      'q-0': { response: 'Roots absorb water' },
      'q-1': { response: 'Leaves absorb light' },
    });
  });

  it.each(['', null, [], false])('saves the first scalar edit when its display default is %j', initial => {
    const a=tab();a.write(ns,'root','attemptMeta',{attemptId:'a'});a.read(ns,'q-0','response');
    a.stage(ns,'q-0','response','first answer',initial);
    expect(a.save(ns)).toBe(true);expect(a.working(ns).items['q-0'].response).toBe('first answer');
  });
  it.each(['mcqAnswers','mcqConfidence','reflectionAnswers','flaggedQuestions'])('merges independent entries in %s without losing the other tab', field => {
    const a=tab(), b=tab(); a.read(ns,'root',field); b.read(ns,'root',field);
    expect(a.write(ns,'root',field,{0:'A'})).toBe(true);
    expect(b.write(ns,'root',field,{1:'B'})).toBe(true);
    expect(b.working(ns).items.root[field]).toEqual({0:'A',1:'B'});
  });
  it('merges separate item fields and intentional map deletions', () => {
    const a=tab(), b=tab(); a.write(ns,'root','flaggedQuestions',{0:true,1:true});
    a.read(ns,'root','flaggedQuestions'); b.read(ns,'root','flaggedQuestions');
    a.write(ns,'root','flaggedQuestions',{1:true}); b.write(ns,'root','flaggedQuestions',{0:true,1:true,2:true});
    a.write(ns,'q-0','response','A'); b.write(ns,'q-1','response','B');
    expect(b.working(ns).items.root.flaggedQuestions).toEqual({1:true,2:true});
    expect(b.working(ns).items['q-0'].response).toBe('A'); expect(b.working(ns).items['q-1'].response).toBe('B');
  });
  it('requires an explicit choice for competing answers, preserving unrelated saved work', () => {
    const a=tab(), b=tab(); a.write(ns,'root','mcqAnswers',{0:0});
    a.read(ns,'root','mcqAnswers'); b.read(ns,'root','mcqAnswers');
    a.write(ns,'root','mcqAnswers',{0:1,2:1});
    expect(b.write(ns,'root','mcqAnswers',{0:2,1:1})).toBe(false);
    expect(b.states[ns].reason).toBe('conflict');
    expect(JSON.parse(localStorage.getItem(ns)).items.root.mcqAnswers).toEqual({0:1,2:1});
    expect(b.save(ns,true)).toBe(true);
    expect(b.working(ns).items.root.mcqAnswers).toEqual({0:2,1:1,2:1});
  });
  it('uses the saved conflicting answer while preserving independent local answers', () => {
    const a=tab(),b=tab(); a.write(ns,'q-0','response','base'); b.read(ns,'q-0','response');
    b.stage(ns,'q-0','response','mine'); b.stage(ns,'q-1','response','unsaved');
    a.write(ns,'q-0','response','theirs'); expect(b.save(ns)).toBe(false);
    expect(b.useSaved(ns)).toBe(true); expect(b.working(ns).items['q-0'].response).toBe('theirs');
    expect(b.working(ns).items['q-1'].response).toBe('unsaved');
    expect(JSON.parse(localStorage.getItem(ns)).items['q-1'].response).toBe('unsaved');
  });
  it.each(['mcqAnswers','mcqConfidence','reflectionAnswers','flaggedQuestions'])('resolves only conflicting entries in %s', field => {
    const a=tab(),b=tab();a.write(ns,'root',field,{0:'base'});b.read(ns,'root',field);
    b.stage(ns,'root',field,{0:'mine',1:'keep local'});
    a.write(ns,'root',field,{0:'theirs',2:'keep remote'});
    expect(b.save(ns)).toBe(false);expect(b.useSaved(ns)).toBe(true);
    expect(JSON.parse(localStorage.getItem(ns)).items.root[field]).toEqual({0:'theirs',1:'keep local',2:'keep remote'});
  });
  it('retains independent fields within a compound response when resolving another field', () => {
    const a=tab(),b=tab();a.write(ns,'q-0','answerIdx',0);b.read(ns,'q-0','answerIdx');
    b.stage(ns,'q-0','answerIdx',1);b.stage(ns,'q-0','evidenceIdx',2);
    a.write(ns,'q-0','answerIdx',2);expect(b.save(ns)).toBe(false);expect(b.useSaved(ns)).toBe(true);
    expect(JSON.parse(localStorage.getItem(ns)).items['q-0']).toEqual({answerIdx:2,evidenceIdx:2});
  });
  it('keeps independent edits available if the resolved draft cannot be persisted', () => {
    const a=tab(),b=tab();a.write(ns,'q-0','response','base');b.read(ns,'q-0','response');
    b.stage(ns,'q-0','response','mine');b.stage(ns,'q-1','response','keep me');
    a.write(ns,'q-0','response','theirs');expect(b.save(ns)).toBe(false);
    const blocked=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota exceeded');});
    expect(b.useSaved(ns)).toBe(false);
    expect(b.working(ns).items).toMatchObject({'q-0':{response:'theirs'},'q-1':{response:'keep me'}});
    blocked.mockRestore();expect(b.save(ns)).toBe(true);expect(JSON.parse(localStorage.getItem(ns)).items['q-1'].response).toBe('keep me');
  });
  it('cannot adopt saved answers from a different attempt during conflict resolution', () => {
    const a=tab(),b=tab();a.write(ns,'root','attemptMeta',{attemptId:'old'});a.stage(ns,'q-0','response','old work');
    b.read(ns,'root','attemptMeta');b.write(ns,'root','attemptMeta',{attemptId:'new'});
    expect(a.useSaved(ns)).toBe(false);expect(a.working(ns).items['q-0'].response).toBe('old work');
    expect(JSON.parse(localStorage.getItem(ns)).items.root.attemptMeta.attemptId).toBe('new');
  });
  it('blocks a stale draft from writing or finalizing over a newer attempt', () => {
    const a=tab(),b=tab(); a.write(ns,'root','attemptMeta',{attemptId:'old'});
    b.read(ns,'root','attemptMeta'); b.write(ns,'root','attemptMeta',{attemptId:'new'});
    expect(a.write(ns,'q-0','response','stale')).toBe(false);
    expect(a.states[ns].reason).toBe('newer-attempt');
    expect(a.finalize(ns,{attemptId:'old'})).toBeNull();
    expect(JSON.parse(localStorage.getItem(ns)).items.root.attemptMeta.attemptId).toBe('new');
  });
  it('cannot clear or replace a newer completed attempt using an old receipt', () => {
    const a=tab(),b=tab(); a.finalize(ns,{attemptId:'old',signature:'s'});
    expect(b.clear(ns,'old')).toBe(true);
    const newId=b.working(ns).items.root.attemptMeta.attemptId;
    expect(a.finalize(ns,{attemptId:'old',signature:'s'})).toBeNull();
    b.finalize(ns,{attemptId:newId,signature:'s'});
    expect(a.clear(ns,'old')).toBe(false); expect(a.finalize(ns,{attemptId:'old',signature:'s'})).toBeNull();
    expect(a.receipt(ns).attemptId).toBe(newId);
  });
});

describe('Assess version continuity', () => {
  it('keeps answers for alt text and translation edits but changes identity for substantive edits', () => {
    const h=tab(), original=data(), key=h.namespace(original,'class','r1');
    const accessible=structuredClone(original); Object.assign(accessible.questions[0],{imageAltText:'A circle',question_en:'Updated gloss',options_en:['Circle gloss','Square gloss'],optionImageAltTexts:['one','two']});
    expect(h.namespace(accessible,'class','r1')).toBe(key);
    for (const patch of [{question:'New question'},{options:['Square','Circle']},{correctAnswer:'Square'},{imageUrl:'other.png'}]) {
      const changed=structuredClone(original); Object.assign(changed.questions[0],patch); expect(h.namespace(changed,'class','r1')).not.toBe(key);
    }
    expect(h.namespace(original,'class','r2')).not.toBe(key);
  });
  it('migrates the exact prior fingerprint without adopting a different assignment', () => {
    const h=tab(), original=data(), key=h.namespace(original,'class','r1'), old=h.previousNamespace(original,'class','r1');
    h.write(old,'q-0','response','preserved'); h.prepare(key,old,context());
    expect(h.working(key).items['q-0'].response).toBe('preserved');
    expect(h.working(key).assessmentIdentity.resourceId).toBe('r1');
    const unrelated=h.namespace(original,'class','r2');h.prepare(unrelated,h.previousNamespace(original,'class','r2'),context('s',{resourceId:'r2'}));
    expect(h.working(unrelated).items['q-0']).toBeUndefined();
  });
  it('migrates a submitted receipt only when its old signature matches', () => {
    const h=tab(), original=data(), key=h.namespace(original,'class','r1'), old=h.previousNamespace(original,'class','r1');
    h.finalize(old,{attemptId:'saved',signature:'old',responses:{'q-0':{response:'done'}}});h.prepare(key,old,context('new'));
    expect(h.receipt(key,'new').attemptId).toBe('saved');expect(h.receipt(key,'new').responses['q-0'].response).toBe('done');
  });
  it('finds earlier work only for the same assignment, activity and learner, including pending edits', () => {
    const h=tab();h.prepare(ns,ns,context());h.write(ns,'q-0','response','saved');h.stage(ns,'q-0','response','newest unsaved');
    expect(h.earlier(context('second'),'alloflow_assess_draft_v1:changed').items['q-0'].response).toBe('newest unsaved');
    for (const field of ['resourceId','sessionCode','activityId','userId']) expect(h.earlier(context('second',{[field]:'other'}),'alloflow_assess_draft_v1:changed')).toBeNull();
  });
});
