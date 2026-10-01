import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const soloBundle = readFileSync('concept_quest_solo_module.js', 'utf8');
let root, el;
const props = { t:key=>key, isTeacherMode:true, isParentMode:false, isIndependentMode:false, studentProjectSettings:{}, sessionData:{}, isPresentationMode:false, isReviewGame:false, isEditingQuiz:false, escapeRoomState:{isActive:false}, presentationState:{}, reviewGameState:{}, soundEnabled:false, globalPoints:0, inputText:'A complete lesson with sufficient context for classroom games.', isFactChecking:{}, showQuizAnswers:false, leveledTextLanguage:'English', generatedContent:{id:'solo-games',type:'quiz',data:{questions:[{type:'mcq',question:'What changes when water is heated?',options:['Evaporation','Condensation'],correctAnswer:'Evaporation'}]}}, addToast:()=>{}, getRows:()=>1, formatInlineText:v=>v, renderFormattedText:v=>v, getReviewCategories:()=>[], playSound:()=>{}, ErrorBoundary:p=>p.children };
const button = text => [...el.querySelectorAll('button')].find(item => item.textContent === text);
const click = async target => { expect(target).toBeTruthy(); await act(async()=>target.click()); };
const mount = async overrides => { el=document.createElement('div'); document.body.appendChild(el); root=createRoot(el); await act(async()=>root.render(React.createElement(window.AlloModules.QuizView,{...props,...overrides}))); };
beforeAll(()=>{window.React=global.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('view_quiz_module.js');});
afterEach(async()=>{if(root)await act(async()=>root.unmount());el?.remove();root=el=null;vi.useRealTimers();window.localStorage.clear();for(const key of ['ConceptQuestSolo','ConceptQuestSoloModule','ConceptQuestEngine','ConceptQuestEngineModule','createConceptQuestSoloSession'])delete window.AlloModules[key];delete window.__alloLazyConceptQuestSolo;delete window.__alloModuleRegistry;delete window.__alloRetryModule;});

describe('Assess Games to standalone Concept Quest',()=>{
  it('loads the ordinary component and bundled engine from the collapsed Games menu, then restores focus on close',async()=>{
    vi.useFakeTimers();
    const loader=window.__alloLazyConceptQuestSolo=vi.fn(()=>{new Function(soloBundle)();});
    await mount();
    expect(el.querySelector('[data-open-concept-quest-solo]')).toBeNull();
    const toggle=el.querySelector('[data-quiz-games-toggle]'); expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle); await click(el.querySelector('[data-open-concept-quest-solo]'));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(typeof window.AlloModules.ConceptQuestSolo).toBe('function'); expect(window.AlloModules.ConceptQuestEngine.createSession).toBeTypeOf('function');
    expect(el.querySelector('[data-concept-quest-solo]')).toBeTruthy();
    await click(button('Start solo adventure')); expect(el.textContent).toContain('Scholar Base');
    await click(button('Back to Assess')); await act(async()=>vi.advanceTimersByTime(0));
    expect(el.querySelector('[data-concept-quest-solo]')).toBeNull();
    expect(document.activeElement).toBe(el.querySelector('[data-quiz-games-toggle]'));
    expect(document.activeElement.getAttribute('aria-expanded')).toBe('false');
  });
  it('offers a recoverable loader error and closes back to Games',async()=>{
    vi.useFakeTimers(); window.__alloLazyConceptQuestSolo=vi.fn(()=>Promise.reject(Error('offline')));
    await mount(); await click(el.querySelector('[data-quiz-games-toggle]')); await click(el.querySelector('[data-open-concept-quest-solo]'));
    expect(el.querySelector('[role="alert"]').textContent).toContain('could not load'); expect(button('Retry')).toBeTruthy();
    await click(button('Close')); await act(async()=>vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(el.querySelector('[data-quiz-games-toggle]'));
  });
  it('keeps solo launch available for independent practice without a live session',async()=>{
    window.__alloLazyConceptQuestSolo=vi.fn(()=>{new Function(soloBundle)();});
    await mount({isTeacherMode:false,isIndependentMode:true,activeSessionCode:null});
    await click(el.querySelector('[data-quiz-games-toggle]')); const launch=el.querySelector('[data-open-concept-quest-solo]'); expect(launch.disabled).toBe(false);
    await click(launch); expect(el.querySelector('[data-concept-quest-solo]')).toBeTruthy();
  });
  it('passes the configured AI provider, lesson, and account into the solo experience',async()=>{
    const received=vi.fn();const provider=vi.fn();const user={uid:'solo-account'};
    window.AlloModules.ConceptQuestSolo=p=>{received(p);return React.createElement('div',{'data-solo-props':true});};
    await mount({callGemini:provider,user,appId:'solo-app'});
    await click(el.querySelector('[data-quiz-games-toggle]'));await click(el.querySelector('[data-open-concept-quest-solo]'));
    expect(received).toHaveBeenCalled();expect(received.mock.calls.at(-1)[0]).toMatchObject({generatedContent:props.generatedContent,inputText:props.inputText,callGemini:provider,user,appId:'solo-app'});
  });

});
