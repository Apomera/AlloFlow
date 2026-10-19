import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const source = readFileSync('view_quiz_source.jsx', 'utf8');
const t = (key, options) => options?.defaultValue || key;
let host, root;
function helpers() {
  return new Function(source.slice(source.indexOf('var _QUIZ_DRAFT_STORAGE_PREFIX'), source.indexOf('function _quizUseDraftField')) +
    source.slice(source.indexOf('function _quizAttemptAnswer'), source.indexOf('function AssessmentAttemptFeedback')) +
    ';return {snapshot:_quizResponseSnapshot,response:_quizReflectionResponse,progress:_quizBuildAttemptProgress};')();
}
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
describe('Assess reflection consistency', () => {
  it.each([
    [{ draft:'Revised reasoning', submitted:false, submittedText:'Old reasoning' }, 'Revised reasoning'],
    [{ draft:'', submitted:false, submittedText:'Old reasoning' }, ''],
    [{ draft:'Draft text', submitted:true, submittedText:'Submitted reasoning' }, 'Submitted reasoning'],
    [{ submittedText:'Legacy submitted reasoning' }, 'Legacy submitted reasoning'],
  ])('uses the current reflection state in progress and teacher snapshots', (entry, expected) => {
    const h=helpers(), data={questions:[],reflections:['What changed your thinking?']}, items={root:{reflectionAnswers:{0:entry}}};
    expect(h.response(entry)).toBe(expected);
    expect(h.snapshot(data,items).reflections[0].response).toBe(expected);
    expect(h.progress(data,{items}).reflectionAnswered).toBe(expected.trim() ? 1 : 0);
  });

  it('records revised and cleared reflections after reopening a submitted response', async () => {
    vi.useFakeTimers();
    const record=vi.fn();
    const p={t,isTeacherMode:false,isParentMode:false,isIndependentMode:false,studentProjectSettings:{},activeSessionCode:null,sessionData:{},
      isPresentationMode:false,isReviewGame:false,isEditingQuiz:false,escapeRoomState:{isActive:false},presentationState:{},reviewGameState:{},isFactChecking:{},showQuizAnswers:false,leveledTextLanguage:'English',
      generatedContent:{id:'reflection-consistency',type:'quiz',data:{title:'Reflection revision',questions:[{type:'short-answer',question:'Explain roots.',expectedAnswer:'Roots absorb water.'}],reflections:['What changed your thinking?'],deliverySettings:{feedbackTiming:'after-submit'}}},
      formatInlineText:v=>v,renderFormattedText:v=>v,getReviewCategories:()=>[],getRows:()=>1,playSound:vi.fn(),addToast:vi.fn(),onResourceComplete:vi.fn(),handleQuizQuestionAction:vi.fn(),onRecordQuizResponses:record,
      ErrorBoundary:({children})=>children,TeacherLiveQuizControls:()=>null,ConfettiExplosion:()=>null,Stamp:()=>null};
    host=document.createElement('div');document.body.append(host);root=createRoot(host);
    await act(async()=>root.render(React.createElement(window.AlloModules.QuizView,p)));
    const button=text=>[...host.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
    async function click(text){const el=button(text);expect(el).toBeTruthy();await act(async()=>el.click());}
    async function fill(value){await act(async()=>{const el=host.querySelector('textarea[aria-label="Your reflection"]');expect(el).toBeTruthy();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>vi.advanceTimersByTime(1000));}
    const latest=()=>record.mock.calls.filter(call=>call[1]==='assessmentDraft').at(-1)?.[2];
    await fill('Original reasoning');await click('ui_common.submit_reflection');await act(async()=>vi.advanceTimersByTime(1000));
    expect(latest().reflections[0].response).toBe('Original reasoning');
    await click('ui_common.edit_response');await fill('Revised reasoning');
    expect(latest().reflections[0].response).toBe('Revised reasoning');
    await fill('');expect(latest().reflections[0].response).toBe('');
    await fill('Final revised reasoning');await click('Review & submit');await click('Submit assessment');
    if(button('Submit with unanswered items'))await click('Submit with unanswered items');
    const submitted=record.mock.calls.filter(call=>call[1]==='assessmentSubmitted').at(-1)?.[2];
    expect(submitted.reflections[0].response).toBe('Final revised reasoning');
  });
});
