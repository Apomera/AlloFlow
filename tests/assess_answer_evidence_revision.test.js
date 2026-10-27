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
  api = new Function('React', 'window', code + ';return {Card:AnswerEvidenceCard,read:_quizReadWorkingDraft,controller:_quizGetVoiceItemController};')(React, window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear();
  window.AlloModules.QuizLiveAggregators = canonical; delete window.quizAnswerMatches;
});
const question = { type:'answer-evidence', question:'Why does the plant grow?', answerOptions:['Water helps','Stones help'], evidenceOptions:['Roots absorb water','Stones are hard'], correctAnswer:'Water helps', correctEvidence:'Roots absorb water', requireReasoning:true, explanationPrompt:'Explain the connection.' };
function props(extra = {}) { return { q:question, questionIdx:0, itemNumber:1, draftNamespace:'alloflow_assess_draft_v1:evidence-revision-'+(++serial), modeStrategy:{render:{allowIDontKnow:true,allowConfidenceRating:true}}, onSubmitLiveAnswer:vi.fn(), ...extra }; }
async function render(p) { host=document.createElement('div'); document.body.append(host); root=createRoot(host); await act(async()=>root.render(React.createElement(api.Card,p))); }
const button = text => [...host.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
const result = () => host.querySelector('[data-assessment-answer-evidence-result]');
const status = () => host.querySelector('[data-assessment-answer-evidence-progress]');
const revise = () => host.querySelector('[data-assessment-revise-evidence]');
const choice = (field,index) => host.querySelector('[data-assessment-choice-field="'+field+'"][data-assessment-choice-index="'+index+'"]').closest('button');
const saved = p => api.read(p.draftNamespace).items['q-0'];
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async()=>el.click()); }
async function fill(value) { const el=host.querySelector('textarea'); await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}); }
async function select(answer,evidence) { await click(choice('answerOptions',answer)); await click(choice('evidenceOptions',evidence)); await fill('My explanation remains available.'); }
async function check() { await click(button('Check both parts')); }
async function voice(p, action, args = {}) { let response; await act(async()=>{response=api.controller(p.draftNamespace,0).execute(action,args);}); return response; }

describe('Answer + Evidence uses canonical grading before publishing feedback', () => {
  it('accepts case and surrounding-space variants in both keys exactly as the teacher grader does', async () => {
    const p=props({q:{...question,correctAnswer:'  WATER HELPS  ',correctEvidence:'  ROOTS ABSORB WATER  '}}); await render(p); await select(0,0); await check();
    const response=p.onSubmitLiveAnswer.mock.calls[0][0], grade=canonical.gradePresentationResponse(response,p.q,p.scoringPolicy);
    expect(response.answer).toMatchObject({answerCorrect:true,evidenceCorrect:true,status:'correct',score:2});
    expect(grade).toMatchObject({answerCorrect:true,evidenceCorrect:true,status:'correct',score:2,evaluable:true});
    expect(result().textContent).toContain('2 / 2'); expect(revise()).toBeNull();
  });
  it('does not apply a more permissive host text comparator than the canonical grader', async () => {
    window.quizAnswerMatches=()=>true;
    const p=props({q:{...question,answerOptions:['Water  helps','Water helps'],evidenceOptions:['Roots  absorb water','Roots absorb water']}});
    await render(p); await select(0,0); await check();
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({answerCorrect:false,evidenceCorrect:false,status:'incorrect',score:0});
  });
  it('reports the actual correct part when the scoring policy requires both parts for credit', async () => {
    const p=props({scoringPolicy:{partialCredit:false}}); await render(p); await select(0,1); await check();
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({answerCorrect:true,evidenceCorrect:false,status:'incorrect',score:0});
    const feedback=result().parentElement.textContent;
    expect(feedback).toContain('Answer: correct'); expect(feedback).toContain('Supporting evidence or reason: needs review');
    expect(feedback).toContain('Water helps'); expect(feedback).toContain('Stones are hard');
    await click(revise()); expect(document.activeElement).toBe(choice('evidenceOptions',1));
  });
  it('narrates the actual part feedback and full-credit rule when only one part is correct', async () => {
    const p=props({scoringPolicy:{partialCredit:false}}); await render(p); await select(0,1);
    const checked=await voice(p,'check'); expect(checked).toMatchObject({ok:true,state:'checked',correct:false,score:0});
    expect(checked.message).toContain('Both parts must be correct for credit.');
    expect(checked.message.toLowerCase()).not.toContain('answer and supporting evidence need review');
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({answerCorrect:true,evidenceCorrect:false});
  });
  it('keeps a persistent help message and saves the draft without publishing a grade when the grader is unavailable', async () => {
    const p=props(); await render(p); await select(0,1); const live=status();
    delete window.AlloModules.QuizLiveAggregators; await check();
    expect(status()).toBe(live); expect(live.textContent.toLowerCase()).toMatch(/unavailable|not available|not ready/);
    expect(result()).toBeNull(); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(saved(p).practiceAttempts).toBeUndefined();
    expect(saved(p)).toMatchObject({answerIdx:0,evidenceIdx:1,explanation:'My explanation remains available.'});
    expect(button('Check both parts').disabled).toBe(false);
    window.AlloModules.QuizLiveAggregators=canonical; await check(); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1); expect(result()).toBeTruthy();
  });
  it('keeps invalid answer keys reviewable without blaming the learner or recording a scored attempt', async () => {
    const p=props({q:{...question,correctEvidence:'PRIVATE INVALID KEY'}}); await render(p); await select(0,0); await check();
    expect(result()).toBeNull(); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled(); expect(saved(p).practiceAttempts).toBeUndefined();
    expect(status().textContent.toLowerCase()).toMatch(/teacher|review|key/); expect(host.textContent).not.toContain('PRIVATE INVALID KEY');
    expect(saved(p)).toMatchObject({answerIdx:0,evidenceIdx:0,explanation:'My explanation remains available.'});
  });
});

describe('Answer + Evidence revisions retain the learner’s work and provenance', () => {
  it.each([[1,1,'answerOptions',1],[1,0,'answerOptions',1],[0,1,'evidenceOptions',1]])('focuses the selected part needing revision for answer %s and evidence %s', async (answer,evidence,field,index) => {
    const p=props(); await render(p); await select(answer,evidence); await click(button('I am unsure')); await check();
    const before=JSON.parse(JSON.stringify(saved(p).practiceAttempts));
    expect(revise().textContent).toBe('Revise these choices'); await click(revise());
    expect(document.activeElement).toBe(choice(field,index)); expect(result()).toBeNull();
    expect(saved(p)).toMatchObject({answerIdx:answer,evidenceIdx:evidence,explanation:'My explanation remains available.',confidence:'guessed'});
    expect(saved(p).practiceAttempts).toEqual(before); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
    expect(choice('answerOptions',answer).getAttribute('aria-pressed')).toBe('true'); expect(choice('evidenceOptions',evidence).getAttribute('aria-pressed')).toBe('true');
  });
  it('adds a revision only on the next check and preserves the first response and its original confidence', async () => {
    const p=props(); await render(p); await select(0,1); await click(button('I am unsure')); await check();
    const first=JSON.parse(JSON.stringify(saved(p).practiceAttempts[0])); await click(revise());
    await click(choice('evidenceOptions',0)); await click(button('I know this'));
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1); expect(saved(p).practiceAttempts).toHaveLength(1); expect(saved(p).practiceAttempts[0]).toEqual(first);
    await check(); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(2); expect(saved(p).practiceAttempts).toHaveLength(2);
    expect(saved(p).practiceAttempts[0]).toEqual(first); expect(first).toMatchObject({confidence:'guessed'});
    expect(saved(p).practiceAttempts[1]).toMatchObject({confidence:'knew'}); expect(saved(p).practiceAttempts[1].response).toContain('Roots absorb water');
    expect(p.onSubmitLiveAnswer.mock.calls[1][0].answer).toMatchObject({answerIdx:0,evidenceIdx:0,status:'correct',score:2,explanation:'My explanation remains available.'});
  });
  it('keeps Try again as a separate reset of both selections and confidence', async () => {
    const p=props(); await render(p); await select(0,1); await click(button('I am unsure')); await check(); await click(button('Try again'));
    expect(saved(p)).toMatchObject({answerIdx:null,evidenceIdx:null,confidence:null,explanation:'My explanation remains available.'});
    expect(document.activeElement).toBe(choice('answerOptions',0)); expect(host.querySelector('[data-assessment-choice-selected]')).toBeNull();
    expect(saved(p).practiceAttempts).toHaveLength(1); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
  });
  it('does not offer a choices revision after an explicit skip', async () => {
    const p=props(); await render(p); await click(button("I don't know"));
    expect(revise()).toBeNull(); expect(button('Try again')).toBeTruthy(); expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toEqual({idk:true});
  });
  it('offers the same nondestructive revision through the voice controller', async () => {
    const p=props(); await render(p); await select(0,1); await click(button('I am unsure')); await check();
    expect(api.controller(p.draftNamespace,0).getState().actions).toContain('revise');
    const before=JSON.parse(JSON.stringify(saved(p))); const revised=await voice(p,'revise');
    expect(revised).toMatchObject({ok:true,state:'revising'}); expect(revised.confirmationRequired).not.toBe(true);
    expect(saved(p)).toEqual(before); expect(document.activeElement).toBe(choice('evidenceOptions',1));
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1); expect(api.controller(p.draftNamespace,0).getState().actions).not.toContain('revise');
  });
});
