import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const copy={'quiz.reveal_answer':'Reveal answer','quiz.hide_answer':'Hide answer','quiz.show_explanation':'Show explanation','quiz.hide_explanation':'Hide explanation','common.start_game':'Games'};
const t=(key,options)=>options?.defaultValue||copy[key]||key;
const questions=[
 {type:'mcq',question:'Choose a phase.',options:['Liquid','Solid'],correctAnswer:'Solid',factCheck:'PRIVATE_EXPLANATION'},
 {type:'short-answer',question:'Explain the change.',expectedAnswer:'PRIVATE_EXPECTED_RESPONSE'},
 {type:'fill-blank',question:'Water becomes ___.',expectedFill:'PRIVATE_EXPECTED_FILL'},
 {type:'numeric-response',question:'How many?',correctValue:17,unit:'units'},
 {type:'multi-select',question:'Choose two.',options:['A','B','C'],correctAnswers:['A','C']},
 {type:'self-explanation',question:'Explain your reasoning.',rubric:'PRIVATE_RUBRIC'},
 {type:'sequence-sense',question:'Inspect the order.',items:['First','Second','Third'],presentedOrder:[1,0,2],orderingPrinciple:'PRIVATE_PRINCIPLE'},
 {type:'relation-mismatch',question:'Find a mismatch.',pairs:[{left:'Cold',right:'Hot'},{left:'Wet',right:'Water'}],wrongPairIndex:0,correctPartnerForWrong:'PRIVATE_PARTNER',candidatePartners:['Ice','Air']},
 {type:'answer-evidence',question:'Choose an answer and evidence.',answerOptions:['One','Two'],correctAnswer:'Two',evidenceOptions:['Evidence A','Evidence B'],correctEvidence:'Evidence B'}
];
const base=extra=>({t,isTeacherMode:false,isParentMode:false,isIndependentMode:false,studentProjectSettings:{},activeSessionCode:null,sessionData:{},isPresentationMode:false,isReviewGame:false,isEditingQuiz:false,escapeRoomState:{isActive:false},presentationState:{},reviewGameState:{},isFactChecking:{},showQuizAnswers:false,leveledTextLanguage:'English',generatedContent:{id:'student-visibility',type:'quiz',data:{questions}},formatInlineText:v=>v,renderFormattedText:v=>v,getReviewCategories:()=>[],getRows:()=>1,playSound:vi.fn(),addToast:vi.fn(),handleToggleIsPresentationMode:vi.fn(),handleToggleIsReviewGame:vi.fn(),handleToggleIsEditingQuiz:vi.fn(),handleToggleShowQuizAnswers:vi.fn(),handlePresentationOptionClick:vi.fn(),togglePresentationAnswer:vi.fn(),togglePresentationExplanation:vi.fn(),resetPresentation:vi.fn(),ErrorBoundary:({children})=>children,TeacherLiveQuizControls:()=>null,ConfettiExplosion:()=>null,Stamp:()=>null,...extra});
let root,host;
const node=selector=>host.querySelector(selector),button=text=>[...host.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
async function render(props){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(window.AlloModules.QuizView,props)));}
async function click(el){expect(el).toBeTruthy();await act(async()=>el.click());}
beforeAll(()=>{global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t});window.__alloT=t;window.AlloIcons={};loadAlloModule('view_quiz_module.js');});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();for(const name of ['LessonBoardSetup','ConnectedEscapeRoomSetup','ConceptQuestSolo'])delete window.AlloModules[name];});

describe('Assess Student View boundaries',()=>{
  it.each([null,'CLASS'])('ignores stale facilitator flags and answer keys in Student View (%s)',async activeSessionCode=>{
    const props=base({activeSessionCode,isPresentationMode:true,isReviewGame:true,isEditingQuiz:true,showQuizAnswers:true,escapeRoomState:{isActive:true},presentationState:{0:{showAnswer:true,showExplanation:true,isCorrect:true,selectedOption:'Solid'}},reviewGameState:{activeQuestion:questions[1],showAnswer:true}});
    await render(props);expect(node('[data-assessment-student-view]')).toBeTruthy();expect(node('[data-assessment-facilitator-tools]')).toBeNull();expect(node('[data-assessment-presentation]')).toBeNull();expect(node('[data-quiz-games-toggle]')).toBeNull();expect(node('[data-review-answer-guide]')).toBeNull();expect(host.textContent).not.toMatch(/PRIVATE_/);expect(host.querySelector('[aria-label="Edit question"]')).toBeNull();
    const option=[...host.querySelectorAll('[role="button"]')].find(el=>el.textContent.includes('Solid'));expect(option.className).not.toContain('green');await click(option);expect(option.getAttribute('aria-pressed')).toBe('true');expect(props.handlePresentationOptionClick).not.toHaveBeenCalled();expect(button('Review & submit')).toBeTruthy();
  });
  it.each([['LessonBoardSetup','data-open-lesson-board'],['ConnectedEscapeRoomSetup','data-open-connected-room'],['ConceptQuestSolo','data-open-concept-quest-solo']])('closes an already-open %s when changing to Student View',async(name,selector)=>{
    window.AlloModules[name]=()=>React.createElement('div',{'data-sensitive-setup':true},'Facilitator setup');const props=base({isTeacherMode:true});await render(props);await click(node('[data-quiz-games-toggle]'));await click(node('['+selector+']'));expect(node('[data-sensitive-setup]')).toBeTruthy();await render({...props,isTeacherMode:false});expect(node('[data-sensitive-setup]')).toBeNull();expect(node('[data-assessment-student-view]')).toBeTruthy();
  });
  it('retains explicitly labeled practice games in independent study',async()=>{
    await render(base({isIndependentMode:true}));expect(node('[data-quiz-games-toggle]').textContent).toContain('Practice games');await click(node('[data-quiz-games-toggle]'));expect(host.textContent).toContain('Practice games can reveal answers');expect(node('[data-quiz-game="review"]')).toBeTruthy();
  });
});

describe('Facilitator presentation visibility',()=>{
  const presenter=extra=>base({isTeacherMode:true,isPresentationMode:true,...extra});
  it.each([{isTeacherMode:false,isParentMode:true},{isTeacherMode:true,isIndependentMode:true}])('retains deliberate presentation reveals for facilitator settings %j',async role=>{
    await render(presenter(role));expect(node('[data-assessment-presentation]')).toBeTruthy();expect(host.textContent).not.toContain('PRIVATE_EXPLANATION');await click(button('Show explanation'));expect(host.textContent).toContain('PRIVATE_EXPLANATION');
  });
  it('starts with all nine item types concealed, even with legacy reveals supplied',async()=>{
    await render(presenter({presentationState:Object.fromEntries(questions.map((_,i)=>[i,{showAnswer:true,showExplanation:true}]))}));await click(button('Show all questions'));expect(host.querySelectorAll('[data-presentation-question-type]')).toHaveLength(9);expect(host.textContent).not.toMatch(/PRIVATE_/);expect(node('[data-presentation-visibility]').textContent).toContain('are hidden');
  });
  it('marks correct and incorrect choices neutrally until a deliberate reveal',async()=>{
    const props=presenter(),before=JSON.stringify(questions);await render(props);
    for(const choice of ['Liquid','Solid']){const option=[...host.querySelectorAll('[data-presentation-question-type="mcq"] button')].find(el=>el.textContent.includes(choice));await click(option);expect(option.getAttribute('aria-pressed')).toBe('true');expect(option.className).not.toMatch(/green|red-/);expect(button('Reveal answer')).toBeTruthy();}
    await click(button('Reveal answer'));expect([...host.querySelectorAll('button[aria-pressed="true"]')].find(el=>el.textContent.includes('Solid')).className).toContain('green');await click(button('Hide answer'));expect(host.querySelector('[data-presentation-selection-feedback]')).toBeNull();expect(props.handlePresentationOptionClick).not.toHaveBeenCalled();expect(props.playSound).not.toHaveBeenCalled();expect(JSON.stringify(questions)).toBe(before);expect(localStorage.length+sessionStorage.length).toBe(0);
  });
  it('treats explanations as visible guides and hides every question in one action',async()=>{
    await render(presenter());await click(button('Show explanation'));expect(host.textContent).toContain('PRIVATE_EXPLANATION');expect(node('[data-presentation-visibility]').textContent).toContain('1');await click(button('Next question'));await click(button('Reveal answer guide'));expect(host.textContent).toContain('PRIVATE_EXPECTED_RESPONSE');expect(node('[data-presentation-visibility]').textContent).toContain('2');await click(node('[data-presentation-hide-guides]'));expect(host.textContent).not.toMatch(/PRIVATE_/);await click(button('Previous question'));expect(host.textContent).not.toContain('PRIVATE_EXPLANATION');
  });
  it.each(['reenter','resource','content','role','session','actor'])('clears reveals across the %s boundary',async boundary=>{
    const props=presenter();await render(props);await click(button('Show explanation'));expect(host.textContent).toContain('PRIVATE_EXPLANATION');
    if(boundary==='reenter'){await render({...props,isPresentationMode:false});await render(props);}
    if(boundary==='resource')await render({...props,generatedContent:{...props.generatedContent,id:'another-resource'}});
    if(boundary==='content')await render({...props,generatedContent:{...props.generatedContent,data:{questions:questions.map((q,i)=>i? q:{...q,question:'Changed prompt'})}}});
    if(boundary==='role'){await render({...props,isTeacherMode:false});expect(node('[data-assessment-presentation]')).toBeNull();await render(props);}
    if(boundary==='session')await render({...props,activeSessionCode:'NEXT'});
    if(boundary==='actor')await render({...props,user:{uid:'another-facilitator'}});
    expect(host.textContent).not.toContain('PRIVATE_EXPLANATION');expect(node('[data-presentation-visibility]').textContent).toContain('are hidden');
  });
});
