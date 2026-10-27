import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let api, canonical, root, host, serial = 0;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || key);
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  canonical = window.AlloModules.QuizLiveAggregators;
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false }).code;
  api = new Function('React', 'window', code + ';return {Card:MultiSelectCard,History:AssessmentPracticeHistory,read:_quizReadWorkingDraft,controller:_quizGetVoiceItemController};')(React, window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear();
  window.AlloModules.QuizLiveAggregators = canonical; delete window.quizAnswerMatches;
});
const question = { type:'multi-select', question:'What helps a plant grow?', options:['Water','Stone','Sunlight'], correctAnswers:['Water','Sunlight'] };
function props(extra = {}) { return { q:question, questionIdx:0, itemNumber:1, draftNamespace:'alloflow_assess_draft_v1:multi-revision-'+(++serial), modeStrategy:{render:{allowIDontKnow:true,allowConfidenceRating:true}}, onSubmitLiveAnswer:vi.fn(), ...extra }; }
async function render(p, withHistory=false) { host=document.createElement('div'); document.body.append(host); root=createRoot(host); await act(async()=>root.render(React.createElement(React.Fragment,null,React.createElement(api.Card,p),withHistory?React.createElement(api.History,p):null))); }
const button = text => [...host.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
const result = () => host.querySelector('[data-assessment-multi-result]');
const status = () => host.querySelector('[data-assessment-multi-progress]');
const revise = () => host.querySelector('[data-assessment-revise-multi]');
const choice = index => host.querySelector('[data-assessment-choice-field="options"][data-assessment-choice-index="'+index+'"]').closest('button');
const feedback = () => [...host.querySelectorAll('[aria-label="Feedback for each option"] li')].map(el=>el.textContent);
const saved = p => api.read(p.draftNamespace).items['q-0'];
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async()=>el.click()); }
async function select(indices) { for (const index of indices) await click(choice(index)); }
async function check() { await click(button('Check selections')); }
async function voice(p, action, args = {}) { let response; await act(async()=>{response=api.controller(p.draftNamespace,0).execute(action,args);}); return response; }

describe('Multi-select uses one grading result for feedback and submission', () => {
  it.each([['case and outer whitespace', ['  WATER  ',' sunlight ']], ['index keys', [0,2]]])('matches teacher grading with %s', async (_, keys) => {
    const p=props({q:{...question,correctAnswers:keys}}); await render(p); await select([0,2]); await check();
    const response=p.onSubmitLiveAnswer.mock.calls[0][0], grade=canonical.gradePresentationResponse(response,p.q,p.scoringPolicy);
    expect(response.answer).toMatchObject({selectedIndices:[0,2],selectedTexts:['Water','Sunlight'],status:'correct',score:100});
    expect(grade).toMatchObject({status:'correct',score:100,evaluable:true});
    expect(feedback()).toEqual(['Water: Correct selection.','Stone: Correctly left unselected.','Sunlight: Correct selection.']);
    expect(result().textContent).toContain('All correct'); expect(revise()).toBeNull();
  });
  it('does not use the host text comparator to contradict canonical per-option feedback', async () => {
    window.quizAnswerMatches=()=>true;
    const p=props(); await render(p); await select([0,1,2]); await check();
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({status:'partially-correct',score:50});
    expect(feedback()[1]).toBe('Stone: This choice does not belong.');
    expect(result().parentElement.textContent).toContain('1 incorrect choice selected');
  });
  it('explains actual choices when all-or-nothing scoring gives an incomplete response no credit', async () => {
    const p=props({scoringPolicy:{partialCredit:false}}); await render(p); await select([0]); await check();
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({status:'incorrect',score:0});
    expect(feedback()[0]).toBe('Water: Correct selection.'); expect(feedback()[2]).toBe('Sunlight: This correct choice was missing.');
    expect(host.textContent).toMatch(/all-or-nothing|every correct answer.*credit/i); expect(revise()).toBeTruthy();
  });
  it.each([['missing',[]],['unmatched',['PRIVATE INVALID KEY']],['duplicate',['Water',' water ']]])('retains the draft without scoring a %s key', async (_, keys) => {
    const p=props({q:{...question,correctAnswers:keys}}); await render(p); await select([0]); await click(button('I am unsure')); await check();
    expect(result()).toBeNull(); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(saved(p).practiceAttempts).toBeUndefined();
    expect(saved(p)).toMatchObject({selected:[0],confidence:'guessed'});
    expect(status().textContent.toLowerCase()).toMatch(/review|teacher|key/); expect(host.textContent).not.toContain('PRIVATE INVALID KEY');
    expect(choice(0).disabled).toBe(false); expect(button('Check selections').disabled).toBe(false);
  });
  it('announces unavailable grading in a persistent region and allows retry without losing work', async () => {
    const p=props(); await render(p); await select([0,2]); const live=status(); delete window.AlloModules.QuizLiveAggregators; await check();
    expect(status()).toBe(live); expect(live.getAttribute('role')).toBe('status'); expect(live.textContent.toLowerCase()).toMatch(/unavailable|not available|not ready/);
    expect(result()).toBeNull(); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(saved(p).practiceAttempts).toBeUndefined();
    expect(saved(p).selected).toEqual([0,2]);
    window.AlloModules.QuizLiveAggregators=canonical; await check(); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1); expect(result().textContent).toContain('All correct');
  });
  it('gives voice users the same unavailable explanation instead of reporting a checked result', async () => {
    const p=props({q:{...question,correctAnswers:[]}}); await render(p); await select([0]);
    const checked=await voice(p,'check'); expect(checked).toMatchObject({ok:false,state:'unavailable'});
    expect(checked.message).toBe(status().textContent); expect(api.controller(p.draftNamespace,0).getState().prompt).toBe(checked.message);
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(result()).toBeNull();
    await click(choice(1)); expect(status().textContent).not.toBe(checked.message);
  });
});

describe('Multi-select revision keeps choices and first-response provenance', () => {
  it.each([[[0],2],[[0,1],1],[[1],0]])('retains selections %j and focuses the first option needing revision', async (selected,index) => {
    const p=props(); await render(p); await select(selected); await click(button('I am unsure')); await check();
    const before=JSON.parse(JSON.stringify(saved(p))); expect(revise().textContent).toBe('Revise these choices'); await click(revise());
    expect(document.activeElement).toBe(choice(index)); expect(result()).toBeNull(); expect(saved(p)).toEqual(before);
    expect(saved(p)).toMatchObject({selected,confidence:'guessed'}); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
    question.options.forEach((_,i)=>expect(choice(i).getAttribute('aria-pressed')).toBe(String(selected.includes(i))));
    expect(status().textContent.toLowerCase()).toMatch(/kept|keep|retained/);
  });
  it('records a revision only on the next check and preserves the original confidence', async () => {
    const p=props(); await render(p); await select([0]); await click(button('I am unsure')); await check();
    const first=JSON.parse(JSON.stringify(saved(p).practiceAttempts[0])); await click(revise()); await click(choice(2)); await click(button('I know this'));
    expect(saved(p).practiceAttempts).toHaveLength(1); expect(saved(p).practiceAttempts[0]).toEqual(first); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
    await check(); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(2); expect(saved(p).practiceAttempts).toHaveLength(2);
    expect(saved(p).practiceAttempts[0]).toEqual(first); expect(first.confidence).toBe('guessed'); expect(saved(p).practiceAttempts[1].confidence).toBe('knew');
    expect(saved(p).practiceAttempts[1].response).toContain('Sunlight'); expect(p.onSubmitLiveAnswer.mock.calls[1][0].answer).toMatchObject({selectedIndices:[0,2],status:'correct',score:100});
  });
  it('updates the visible sibling history immediately after checks and preserves it while revising', async () => {
    const historyNode=()=>[...host.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent==='First response and revisions');
    const p=props(); await render(p,true); await select([0]); await check(); expect(historyNode()).toBeUndefined();
    await click(revise()); await click(choice(1)); await check();
    const history=historyNode(); expect(history).toBeTruthy();
    const rows=()=>[...history.querySelectorAll('ol li')].map(el=>el.textContent);
    expect(rows()).toEqual(['First response: Water','Revision: Water; Stone']);
    await click(revise()); expect(historyNode()).toBe(history); expect(rows()).toEqual(['First response: Water','Revision: Water; Stone']);
    await click(choice(1)); await click(choice(2)); expect(rows()).toHaveLength(2); await check();
    expect(rows()).toEqual(['First response: Water','Revision: Water; Stone','Revision: Water; Sunlight']); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(3);
  });
  it('keeps Try again as a distinct reset of selections and confidence', async () => {
    const p=props(); await render(p); await select([0]); await click(button('I am unsure')); await check(); await click(button('Try again'));
    expect(saved(p)).toMatchObject({selected:[],confidence:null}); expect(saved(p).practiceAttempts).toHaveLength(1);
    expect(document.activeElement).toBe(choice(0)); expect(button('Check selections').disabled).toBe(true); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
  });
  it.each(['correct','skipped'])('does not offer guided revision for a %s response', async kind => {
    const p=props(); await render(p);
    if(kind==='correct'){await select([0,2]);await check();}else await click(button("I don't know"));
    expect(revise()).toBeNull(); expect(api.controller(p.draftNamespace,0).getState().actions).not.toContain('revise');
    expect(await voice(p,'revise')).toMatchObject({ok:false}); expect(button('Try again')).toBeTruthy(); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
  });
  it('provides the same nondestructive revision and focus through voice', async () => {
    const p=props(); await render(p); await select([0]); await check();
    expect(api.controller(p.draftNamespace,0).getState().actions).toContain('revise'); const before=JSON.parse(JSON.stringify(saved(p)));
    expect(await voice(p,'revise')).toMatchObject({ok:true,state:'revising'}); expect(saved(p)).toEqual(before); expect(document.activeElement).toBe(choice(2));
    expect(api.controller(p.draftNamespace,0).getState().actions).not.toContain('revise'); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
    await voice(p,'choose',{choice:'C'}); expect(await voice(p,'check')).toMatchObject({ok:true,state:'checked',correct:true,score:100});
  });
});

describe('Multi-select restores only valid selection indices', () => {
  function restore(p, selected) {
    localStorage.setItem(p.draftNamespace, JSON.stringify({version:1,createdAt:Date.now(),updatedAt:Date.now(),items:{'q-0':{selected}}}));
  }
  it.each([['option texts',['Water','Sunlight']],['a nonarray value',{selected:0}]])('does not score unseen choices restored as %s', async (_, selected) => {
    const p=props(); restore(p,selected); await render(p);
    expect(host.querySelectorAll('[data-assessment-choice-field="options"]').length).toBe(3);
    question.options.forEach((_,index)=>expect(choice(index).getAttribute('aria-pressed')).toBe('false'));
    expect(button('Check selections').disabled).toBe(true); expect(api.controller(p.draftNamespace,0).getState().selectedIndices).toEqual([]);
    expect(await voice(p,'check')).toMatchObject({ok:false,state:'inapplicable'}); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(result()).toBeNull();
    await click(choice(0)); expect(saved(p).selected).toEqual([0]); expect(button('Check selections').disabled).toBe(false);
  });
  it('uses the same valid unique indices for restored controls, counts, feedback, and submission', async () => {
    const p=props(); restore(p,[0,2,99,0]); await render(p);
    expect(choice(0).getAttribute('aria-pressed')).toBe('true'); expect(choice(1).getAttribute('aria-pressed')).toBe('false'); expect(choice(2).getAttribute('aria-pressed')).toBe('true');
    expect(status().textContent).toContain('2 options selected'); expect(api.controller(p.draftNamespace,0).getState().selectedIndices).toEqual([0,2]);
    await check(); expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({selectedIndices:[0,2],selectedTexts:['Water','Sunlight'],status:'correct',score:100});
    expect(feedback()).toEqual(['Water: Correct selection.','Stone: Correctly left unselected.','Sunlight: Correct selection.']);
  });
});
