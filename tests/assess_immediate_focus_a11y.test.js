import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let api, host, root, serial = 0;
beforeAll(() => {
  window.React = global.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : ({'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again'}[key] || key);
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  new Function('window', readFileSync('quiz_ai_helpers.js', 'utf8'))(window);
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {plugins:['@babel/plugin-transform-react-jsx'], babelrc:false, configFile:false}).code;
  api = new Function('React', 'window', code + ';return {MultiSelectCard,NumericResponseCard,FreeformItemCard};')(React, window);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });
const props = (q, extra = {}) => ({q, itemNumber:1, questionIdx:0, draftNamespace:'alloflow_assess_draft_v1:immediate-focus-' + (++serial), allowDictation:false, modeStrategy:{render:{allowIDontKnow:true}}, onSubmitLiveAnswer:vi.fn(), ...extra});
async function mount(Component, p) { host=document.createElement('div'); document.body.append(host); root=createRoot(host); await act(async()=>root.render(React.createElement(Component,p))); }
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text || el.textContent.trim().endsWith(text));
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async()=>el.click()); }
async function fill(el,value) { await act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}); }
const multi = {type:'multi-select',question:'Select living things.',options:['Tree','Stone','Flower'],correctAnswers:['Tree','Flower']};
const numeric = {type:'numeric-response',question:'Find the length.',correctValue:10,unit:'cm'};

describe('Immediate selection and numeric feedback preserve keyboard position', () => {
  it('focuses multi-select feedback after checking and returns to the first choice on retry', async () => {
    const p=props(multi); await mount(api.MultiSelectCard,p);
    expect(document.activeElement).not.toBe(button('Tree'));
    await click(button('Tree')); await click(button('Check selections'));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-multi-result]'));
    expect(document.activeElement.textContent).toContain('partial credit');
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
    await click(button('Try again')); expect(document.activeElement).toBe(button('Tree'));
    expect(button('Tree').getAttribute('aria-pressed')).toBe('false');
  });
  it('focuses the skipped multi-select result and restores an enabled response choice', async () => {
    await mount(api.MultiSelectCard,props(multi)); await click(button("I don't know"));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-multi-result]'));
    expect(document.activeElement.textContent).toContain('don’t know');
    await click(button('Try again')); expect(document.activeElement).toBe(button('Tree')); expect(document.activeElement.disabled).toBe(false);
  });
  it('keeps numeric validation focus in place, then focuses a valid result and the reset field', async () => {
    await mount(api.NumericResponseCard,props(numeric)); const field=host.querySelector('input');
    await fill(field,'bad'); await click(button('Check value')); expect(document.activeElement).toBe(button('Check value'));
    await fill(field,'10 cm'); field.focus(); await act(async()=>field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-numeric-result]'));
    expect(document.activeElement.textContent).toContain('Correct');
    await click(button('Try again')); expect(document.activeElement).toBe(field); expect(field.disabled).toBe(false);
  });
  it('moves from a numeric skip through feedback back to the input', async () => {
    await mount(api.NumericResponseCard,props(numeric)); await click(button("I don't know"));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-numeric-result]'));
    await click(button('Try again')); expect(document.activeElement).toBe(host.querySelector('input'));
  });
});

describe('Written response loading and feedback are available without unexpected focus jumps', () => {
  it('exposes exact answer-matching instructions and response criteria on the fill input', async () => {
    await mount(api.FreeformItemCard,props({type:'fill-blank',question:'Name the plant.',expectedFill:'Oak',fillBlankPolicy:'exact',studentCriteria:['Use the plant name.']}));
    const field=host.querySelector('input'), descriptions=field.getAttribute('aria-describedby').split(' ').map(id=>document.getElementById(id));
    expect(descriptions).toHaveLength(2); expect(descriptions.every(Boolean)).toBe(true);
    expect(descriptions[0].textContent).toContain('capitalization'); expect(descriptions[1].textContent).toContain('Use the plant name.');
  });
  it('connects written responses to their success criteria', async () => {
    await mount(api.FreeformItemCard,props({type:'short-answer',question:'Explain roots.',studentCriteria:['Explain how roots absorb water.']}));
    const field=host.querySelector('textarea'); expect(document.getElementById(field.getAttribute('aria-describedby')).textContent).toContain('Explain how roots absorb water.');
  });
  it('honors legacy exact spelling in directions and deterministic grading without an AI call', async () => {
    const q={type:'fill-blank',question:'Name the plant.',expectedFill:'Oak',spellingPolicy:'exact'}, callGemini=vi.fn();
    await mount(api.FreeformItemCard,props(q,{callGemini,QuizAIHelpers:window.AlloModules.QuizAIHelpers}));
    const field=host.querySelector('input'); expect(document.getElementById(field.getAttribute('aria-describedby')).textContent).toBe('Use exact spelling and capitalization.');
    await fill(field,'oak'); await click(button('Grade my answer'));
    expect(host.querySelector('[data-assessment-written-result]').textContent).toBe('Not yet'); expect(callGemini).not.toHaveBeenCalled();
    expect(window.AlloModules.QuizLiveAggregators.gradeFillBlankAnswer('oak',q).status).toBe('incorrect');
    await click(button('Try again')); await fill(field,'Oak'); await click(button('Grade my answer'));
    expect(host.querySelector('[data-assessment-written-result]').textContent).toBe('Correct'); expect(callGemini).not.toHaveBeenCalled();
    expect(window.AlloModules.QuizLiveAggregators.gradeFillBlankAnswer('Oak',q).status).toBe('correct');
  });
  it('keeps one live region through loading, completion and retry, without stealing focus after the learner moves away', async () => {
    let settle; const gradeFreeformAnswer=vi.fn(()=>new Promise(resolve=>{settle=resolve;}));
    await mount(api.FreeformItemCard,props({type:'short-answer',question:'Explain roots.'},{callGemini:vi.fn(),QuizAIHelpers:{gradeFreeformAnswer}}));
    const status=host.querySelector('[data-assessment-written-feedback]'), result=host.querySelector('[data-assessment-written-result]'), field=host.querySelector('textarea');
    expect(status.textContent).toBe(''); expect(status.getAttribute('role')).toBe('status');
    await fill(field,'Roots hold plants.'); await click(button('Grade my answer'));
    expect(status.textContent).toContain('Grading'); expect(document.activeElement).toBe(result);
    const elsewhere=document.createElement('button'); elsewhere.textContent='Next activity'; host.append(elsewhere); elsewhere.focus();
    await act(async()=>settle({status:'partially-correct',feedback:'Also explain how roots absorb water.'}));
    expect(document.activeElement).toBe(elsewhere); expect(host.querySelector('[data-assessment-written-feedback]')).toBe(status);
    expect(status.textContent).toContain('Also explain how roots absorb water.');
    await click(button('Try again')); expect(document.activeElement).toBe(field); expect(status.textContent).toBe('');
    expect(host.querySelector('[data-assessment-written-result]')).toBe(result);
  });
  it('focuses synchronous fill-blank feedback after Enter disables the input', async () => {
    await mount(api.FreeformItemCard,props({type:'fill-blank',question:'Plants need ___.',expectedFill:'water'}));
    const field=host.querySelector('input'); await fill(field,'water'); field.focus();
    await act(async()=>field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-written-result]'));
    expect(document.activeElement.textContent).toBe('Correct'); expect(field.disabled).toBe(true);
  });
  it('returns to feedback when a second check reports the same unavailable-grader state', async () => {
    await mount(api.FreeformItemCard,props({type:'short-answer',question:'Explain roots.'},{callGemini:vi.fn()}));
    await fill(host.querySelector('textarea'),'My response.'); await click(button('Grade my answer'));
    const result=host.querySelector('[data-assessment-written-result]'); expect(document.activeElement).toBe(result);
    await click(button('Re-check')); expect(document.activeElement).toBe(result);
  });
  it('restores the saved written draft when revising a teacher-review submission', async () => {
    await mount(api.FreeformItemCard,props({type:'short-answer',question:'Explain roots.'},{scoringPolicy:{writtenResponseMode:'teacher-review'}}));
    const field=host.querySelector('textarea'); await fill(field,'My draft about roots.'); await click(button('Submit response'));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-written-result]'));
    await click(button('Revise response')); expect(document.activeElement).toBe(field); expect(field.value).toBe('My draft about roots.');
  });
  it('focuses skipped written feedback and restores the response field on retry', async () => {
    await mount(api.FreeformItemCard,props({type:'self-explanation',question:'Explain roots.'}));
    await click(button("I don't know")); expect(document.activeElement).toBe(host.querySelector('[data-assessment-written-result]'));
    await click(button('Try again')); expect(document.activeElement).toBe(host.querySelector('textarea'));
  });
});
