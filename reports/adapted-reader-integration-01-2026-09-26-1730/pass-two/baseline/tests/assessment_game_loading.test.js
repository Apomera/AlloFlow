import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let root, el;
const t = (key, options) => options?.defaultValue || key;
const props = { t, isTeacherMode:true, isParentMode:false, isIndependentMode:false, studentProjectSettings:{}, sessionData:{}, isPresentationMode:false, isReviewGame:false, isEditingQuiz:false, escapeRoomState:{isActive:false}, presentationState:{}, reviewGameState:{}, soundEnabled:false, globalPoints:0, inputText:'A complete lesson with sufficient context for classroom games.', isFactChecking:{}, showQuizAnswers:false, leveledTextLanguage:'English', generatedContent:{id:'games',type:'quiz',data:{questions:[{type:'mcq',question:'What changes when water is heated?',options:['Evaporation','Condensation'],correctAnswer:'Evaporation'}]}}, addToast:()=>{}, getRows:()=>1, formatInlineText:v=>v, renderFormattedText:v=>v, getReviewCategories:()=>[], playSound:()=>{}, ErrorBoundary:p=>p.children };
const cases = [
 ['board','LessonBoardModule','LessonBoardSetup','__alloLazyLessonBoard','data-open-lesson-board','data-retry-lesson-board'],
 ['escape room','ConnectedEscapeRoomModule','ConnectedEscapeRoomSetup','__alloLazyConnectedEscape','data-open-connected-room','data-retry-connected-room']
];
const open = async selector => { el=document.createElement('div');document.body.appendChild(el);root=createRoot(el);await act(async()=>root.render(React.createElement(window.AlloModules.QuizView,props)));await act(async()=>el.querySelector('[data-quiz-games-toggle]').click());await act(async()=>el.querySelector('['+selector+']').click()); };
beforeAll(()=>{window.React=global.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('view_quiz_module.js');});
afterEach(async()=>{if(root)await act(async()=>root.unmount());el?.remove();root=el=null;vi.useRealTimers();for(const [,moduleKey,componentKey,loaderKey] of cases){delete window.AlloModules[moduleKey];delete window.AlloModules[componentKey];delete window[loaderKey];}delete window.__alloModuleRegistry;delete window.__alloRetryModule;});
describe.each(cases)('%s setup loading',(_name,moduleKey,componentKey,loaderKey,openSelector,retrySelector)=>{
 it('requests a loader installed after opening and waits for a callable setup component',async()=>{
  vi.useFakeTimers();window.AlloModules[moduleKey]=true;await open(openSelector);
  const loader=window[loaderKey]=vi.fn(()=>{window.AlloModules[componentKey]=()=>React.createElement('section',{'data-loaded-game':true},'Game setup');});
  await act(async()=>vi.advanceTimersByTime(250));
  expect(loader).toHaveBeenCalledTimes(1);expect(el.querySelector('[data-loaded-game]')).toBeTruthy();
 });
 it('offers retry after a failed script and opens setup when retry succeeds',async()=>{
  window.__alloModuleRegistry={};window[loaderKey]=vi.fn(()=>{window.__alloModuleRegistry[moduleKey]={status:'failed'};});
  await open(openSelector);expect(el.querySelector('[role="alert"]')).toBeTruthy();
  window.__alloRetryModule=vi.fn(key=>{expect(key).toBe(moduleKey);window.__alloModuleRegistry[moduleKey].status='loaded';window.AlloModules[componentKey]=()=>React.createElement('section',{'data-loaded-game':true},'Game setup');return true;});
  await act(async()=>el.querySelector('['+retrySelector+']').click());
  expect(window.__alloRetryModule).toHaveBeenCalledTimes(1);expect(el.querySelector('[data-loaded-game]')).toBeTruthy();
 });
 it('handles a rejected asynchronous loader without leaving setup pending',async()=>{
  window[loaderKey]=vi.fn(()=>Promise.reject(Error('offline')));
  await open(openSelector);
  expect(el.querySelector('[role="alert"]').textContent).toContain('could not load');expect(el.querySelector('['+retrySelector+']')).toBeTruthy();
 });
 it('ends an unavailable loader wait with a recoverable message',async()=>{
  vi.useFakeTimers();await open(openSelector);await act(async()=>vi.advanceTimersByTime(30000));
  expect(el.querySelector('[role="alert"]').textContent).toContain('could not load');expect(el.querySelector('['+retrySelector+']')).toBeTruthy();
 });
});
