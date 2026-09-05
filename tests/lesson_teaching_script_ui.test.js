import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, View, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  loadAlloModule('view_lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_plan_module.js');
  View = window.AlloModules.LessonTeachingScriptView;
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  window.AlloModules.LessonTeachingScriptView = View;
  vi.restoreAllMocks(); vi.useRealTimers();
});
const materials = [{ id: 'fractions-cards', type: 'flashcards', title: 'Fraction models' }, { id: 42, type: 'quiz', title: 'Fraction comparison check' }];
function script(id = 'script-a', overrides = {}) {
  return {
    id, schemaVersion: 2, scope: 'segment', title: 'Compare fractions on a number line', createdAt: '2026-09-04T12:00:00.000Z', durationMinutes: 15,
    researchStatus: 'retrieved', warnings: ['Teaching guidance is not a verification of every generated step.'],
    inputSnapshot: { settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', goal: 'Compare fractions' }, materialIds: ['fractions-cards'], materialTitles: [] },
    sources: [{ id: 'wwc', title: 'Developing Effective Fractions Instruction', url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15', author: 'Institute of Education Sciences', publishedAt: '2010-09', retrievedAt: '2026-09-04', scope: 'K–8 fractions guidance, applied to this grade 4 lesson.', evidenceLevel: 'Moderate evidence', evidenceKind: 'content-specific', recommendations: [{ id: 'number-line', text: 'Use number lines as a central representation of fractions.', locator: 'Recommendation 2', evidenceLevel: 'Moderate evidence' }] }],
    steps: [1,2,3].map(index => ({ id: 'step-' + index, title: 'Compare fractions ' + index, minutes: 5, phase: 'directInstruction', teacherSays: 'Place one half on our shared number line. Explain how the equal spaces help you choose its position.', studentDoes: 'Learners explain their placements to a partner.', checkQuestion: 'How do you know where one half belongs?', possibleResponse: 'It is halfway between zero and one.', ifStruggling: 'Fold a paper strip into equal halves together.', ifReady: 'Compare one half with three fourths and explain.', resourceIds: ['fractions-cards'], recommendationIds: ['number-line'] })),
    ...overrides
  };
}
function plan(id = 'plan-a', versions = []) {
  return { id, type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions using models'], directInstruction: 'Original teacher plan', teachingScripts: versions } };
}
const defaults = (overrides = {}) => ({ grade: '4th Grade', gradeSource: 'plan', subject: 'mathematics', subjectDetected: true, topic: 'Comparing fractions', language: 'English', standard: '', phases: ['directInstruction'], suggestedDuration: { segment: 15, lesson: 45 }, ...overrides });
function props(overrides = {}) {
  return { generatedContent: plan(), history: materials, isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => '', capabilities: { canGenerate: true, canResearch: true }, defaultSettings: defaults(), onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onCancelTeachingScript: vi.fn(), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onOpenTeachingMaterial: vi.fn(), ...overrides };
}
function mount(value) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(value));
}
function button(label) {
  const found = Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === label);
  if (!found) throw new Error('Button not found: ' + label);
  return found;
}
function click(label) { act(() => button(label).click()); }
function expand() { click('Teaching script+'); }
function field(label) {
  const found = Array.from(host.querySelectorAll('label')).find(node => node.textContent.trim() === label || node.textContent.trim().startsWith(label));
  if (!found) throw new Error('Field not found: ' + label);
  return found.htmlFor ? host.querySelector('[id="' + found.htmlFor + '"]') : found.querySelector('input,select,textarea');
}
function change(label, value) {
  const node = field(label), prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() { await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function deferred() { let resolve, reject; const promise = new Promise((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; }

describe('lesson-aware teaching-script UI', () => {
  it.each([{isTeacherMode:false},{isParentMode:true},{isIndependentMode:true}])('does not expose the feature outside teacher authoring: %j', flags => {
    mount(React.createElement(View, props(flags)));
    expect(host.textContent).toBe('');
  });
  it('submits reviewable context, goal, grade, scope, time, prior learning, standard, language and actual resource IDs', async () => {
    const p = props({defaultSettings:defaults({grade:'4th Grade',language:'Spanish',standard:'4.NF'})}), before = JSON.stringify(p.generatedContent);
    mount(React.createElement(View,p)); expand();
    expect(host.textContent).toContain('Detected lesson context');
    expect(host.textContent).toContain('Subject detected from the saved plan');
    expect(host.textContent).not.toMatch(/pilot|Grades 3–6/);
    expect(field('Learning goal').value).toBe('How can we compare fractions?');
    expect(field('Subject area').value).toBe('mathematics');
    expect(field('Lesson topic').value).toBe('Comparing fractions');
    expect(field('Use research').checked).toBe(true);
    change('Learning goal','Compare fractions with equal numerators.');
    change('Grade','5th Grade'); change('Teaching time',20);
    change('Relevant prior learning','Learners can partition equal parts.');
    change('Target standard','5.NF teacher-selected target');
    act(() => field('Fraction comparison check').click());
    await submit();
    expect(p.onGenerateTeachingScript).toHaveBeenCalledWith({goal:'Compare fractions with equal numerators.',grade:'5th Grade',subject:'mathematics',topic:'Comparing fractions',scope:'segment',durationMinutes:20,priorKnowledge:'Learners can partition equal parts.',researchEnabled:true,materialIds:['fractions-cards'],language:'Spanish',standard:'5.NF teacher-selected target'});
    expect(host.textContent).toContain('Script language: Spanish');
    expect(JSON.stringify(p.generatedContent)).toBe(before);
  });
  it('offers every app grade, keeps a custom age label, and requires a grade plus a resource', () => {
    mount(React.createElement(View, props({defaultSettings:defaults({grade:'',gradeSource:'none',subject:'other',subjectDetected:false,topic:''})}))); expand();
    expect(host.textContent).toContain('The saved plan has no grade');
    expect(host.textContent).toContain('Subject could not be detected');
    expect(field('Grade').value).toBe('');
    expect(Array.from(field('Grade').options).map(option => option.value)).toEqual(expect.arrayContaining(['Pre-K','Kindergarten','3rd Grade','12th Grade','College','Graduate Level']));
    expect(button('Generate script').disabled).toBe(true);
    change('Grade','Kindergarten');
    expect(button('Generate script').disabled).toBe(true);
    change('Lesson topic','Blending CVC words');
    expect(button('Generate script').disabled).toBe(false);
    act(() => { field('Fraction models').click(); field('Fraction comparison check').click(); });
    expect(button('Generate script').disabled).toBe(true);
    expect(host.textContent).toContain('Choose at least one lesson resource');
    act(()=>root.unmount()); root = null; host.remove();
    mount(React.createElement(View, props({defaultSettings:defaults({grade:'Adult learners',gradeRecognized:false})}))); expand();
    expect(field('Grade').value).toBe('Adult learners');
    expect(Array.from(field('Grade').options).map(option => option.value)).toContain('Adult learners');
  });
  it('switches to a whole-lesson script with its own duration range and sends the scope', async () => {
    const p = props({defaultSettings:defaults({phases:['hook','directInstruction','guidedPractice','closure'],suggestedDuration:{segment:15,lesson:50}})});
    mount(React.createElement(View,p)); expand();
    expect(host.textContent).toContain('Plan phases: Hook, Direct instruction, Guided practice, Closure');
    expect(field('Teaching time').value).toBe('15');
    act(() => field('Whole lesson').click());
    expect(field('Teaching time').value).toBe('50');
    expect(host.textContent).toContain('Whole minutes between 15 and 240');
    change('Teaching time', 10);
    expect(button('Generate script').disabled).toBe(true);
    change('Teaching time', 60);
    await submit();
    expect(p.onGenerateTeachingScript.mock.calls[0][0]).toMatchObject({scope:'lesson',durationMinutes:60});
    act(() => field('Direct-instruction segment').click());
    expect(field('Teaching time').value).toBe('15');
  });
  it('requires explicit research opt-out when research is unavailable', async () => {
    const p = props({capabilities:{canGenerate:true,canResearch:false}});
    mount(React.createElement(View,p)); expand();
    expect(field('Use research').checked).toBe(true);
    expect(button('Generate script').disabled).toBe(true);
    expect(host.textContent).toContain('Turn off research');
    act(() => field('Use research').click());
    expect(button('Generate script').disabled).toBe(false);
    await submit();
    expect(p.onGenerateTeachingScript.mock.calls[0][0].researchEnabled).toBe(false);
  });
  it('keeps saved versions available when generation is offline', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),capabilities:{canGenerate:false,canResearch:false}}))); expand();
    expect(button('Generate script').disabled).toBe(true);
    expect(host.textContent).not.toContain('Original teacher plan');
    expect(host.textContent).toContain('Saved versions remain available');
    click('Edit script');
    expect(field('Teacher says').value).toContain('Place one half');
  });
  it('labels scope, grade, subject and phases on saved versions, including pilot versions without them', () => {
    const lesson = script('script-b', { scope: 'lesson', title: 'Whole lesson', durationMinutes: 45, steps: script().steps.map((step, index) => ({ ...step, minutes: 15, phase: ['hook','guidedPractice','closure'][index] })) });
    const legacy = script('script-c', { schemaVersion: 1, title: 'Pilot segment', inputSnapshot: { settings: { grade: 4 }, materialIds: ['fractions-cards'] }, steps: script().steps.map(step => { const copy = { ...step }; delete copy.phase; return copy; }) });
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script(), lesson, legacy])}))); expand();
    expect(field('Script version').value).toBe('script-c');
    expect(host.textContent).toContain('Direct-instruction segment · 15 minutes · 4th Grade · Research sources retrieved');
    change('Script version','script-b');
    expect(host.textContent).toContain('Whole lesson · 45 minutes · 4th Grade · Mathematics');
    expect(host.textContent).toContain('· Hook');
    expect(host.textContent).toContain('· Closure');
    change('Script version','script-a');
    expect(host.textContent).toContain('Direct-instruction segment · 15 minutes · 4th Grade · Mathematics');
    expect(host.textContent).toContain('· Direct instruction');
  });
  it('shows only this plan’s progress and routes cancellation to its original ID', async () => {
    const pending = deferred(), p = props({onGenerateTeachingScript:vi.fn(() => pending.promise)});
    mount(React.createElement(View,p)); expand();
    act(() => host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(button('Generate script').disabled).toBe(true);
    act(() => root.render(React.createElement(View,{...p,scriptRun:{planId:'plan-a',busy:true,stage:'Reading teaching sources…'}})));
    expect(host.textContent).toContain('Reading teaching sources…');
    click('Cancel generation');
    expect(p.onCancelTeachingScript).toHaveBeenCalledWith('plan-a');
    await act(async () => pending.reject(new Error('Old aborted request')));
    expect(host.textContent).not.toContain('Old aborted request');
  });
  it('preserves inputs and allows retry after generation fails', async () => {
    const p = props({onGenerateTeachingScript:vi.fn().mockResolvedValueOnce({ok:false,error:'Applicable research could not be verified for this lesson.'}).mockResolvedValueOnce({ok:true})});
    mount(React.createElement(View,p)); expand();
    change('Relevant prior learning','We already used fraction strips.');
    await submit();
    expect(host.querySelector('[role="alert"]').textContent).toContain('Applicable research could not be verified');
    expect(field('Relevant prior learning').value).toBe('We already used fraction strips.');
    expect(button('Try generating again').disabled).toBe(false);
    await submit();
    expect(p.onGenerateTeachingScript.mock.calls[1][0]).toEqual(p.onGenerateTeachingScript.mock.calls[0][0]);
  });
  it('edits a draft without mutating the saved script and keeps it after a rejected save', async () => {
    const saved = script(), p = props({generatedContent:plan('plan-a',[saved]),onUpdateTeachingScript:vi.fn().mockResolvedValue({ok:false,error:'This plan changed; keep your draft.'})});
    const before = JSON.stringify(p.generatedContent);
    mount(React.createElement(View,p)); expand(); click('Edit script');
    change('Teacher says','Use the number line to explain your fraction comparison and justify it to your partner.');
    expect(JSON.stringify(p.generatedContent)).toBe(before);
    expect(field('Script version').disabled).toBe(true);
    await act(async () => button('Save edits').click());
    expect(p.onUpdateTeachingScript).toHaveBeenCalledWith('plan-a','script-a',expect.arrayContaining([expect.objectContaining({id:'step-1',teacherSays:'Use the number line to explain your fraction comparison and justify it to your partner.',resourceIds:['fractions-cards'],recommendationIds:['number-line']})]));
    expect(host.textContent).toContain('This plan changed; keep your draft.');
    expect(field('Teacher says').value).toContain('Use the number line');
    expect(JSON.stringify(p.generatedContent)).toBe(before);
    click('Discard edits');
    expect(host.textContent).toContain('Place one half on our shared number line. Explain how the equal spaces help you choose its position.');
  });
  it('commits accepted edits through the host and selects newly attached versions', async () => {
    let current;
    const original = plan('plan-a',[script()]);
    function Harness() {
      const [resource,setResource] = React.useState(original); current = resource;
      return React.createElement(View,props({generatedContent:resource,
        onUpdateTeachingScript:async (planId,versionId,steps) => {setResource(previous=>({...previous,data:{...previous.data,teachingScripts:previous.data.teachingScripts.map(version=>version.id===versionId?{...version,steps}:version)}}));return{ok:true};},
        onGenerateTeachingScript:async () => {setResource(previous=>({...previous,data:{...previous.data,teachingScripts:previous.data.teachingScripts.concat({...script('script-b'),title:'A second approach'})}}));return{ok:true};}
      }));
    }
    mount(React.createElement(Harness)); expand(); click('Edit script');
    change('Teacher says','Draw equal-sized wholes before comparing any fractions, then explain how the models support your reasoning.');
    await act(async()=>button('Save edits').click());
    expect(current.data.directInstruction).toBe('Original teacher plan');
    expect(original.data.teachingScripts[0].steps[0].teacherSays).toBe('Place one half on our shared number line. Explain how the equal spaces help you choose its position.');
    expect(current.data.teachingScripts[0].steps[0].teacherSays).toBe('Draw equal-sized wholes before comparing any fractions, then explain how the models support your reasoning.');
    expect(host.textContent).toContain('Script edits added to this plan.');
    await submit();
    expect(field('Script version').value).toBe('script-b');
    expect(host.textContent).toContain('Script added to this plan.');
  });
  it('blocks incomplete text, fractional timing, over-long steps, and concurrent edits instead of replacing saved work', () => {
    const p=props({generatedContent:plan('plan-a',[script()])});
    mount(React.createElement(View,p)); expand(); click('Edit script');
    change('Teacher says','Short');
    expect(button('Save edits').disabled).toBe(true);
    change('Teacher says','Explain your fraction comparison using the number line and describe how the equal spaces support your answer.');
    change('Minutes',4.5);
    expect(button('Save edits').disabled).toBe(true);
    change('Minutes',5);
    expect(button('Save edits').disabled).toBe(false);
    const changed=script();changed.steps[0].teacherSays='A newer saved instruction from the host.';
    act(()=>root.render(React.createElement(View,{...p,generatedContent:plan('plan-a',[changed])})));
    expect(button('Save edits').disabled).toBe(true);
    expect(host.textContent).toContain('This saved version changed');
  });
  it('limits step minutes by the version’s own rules: 20 for pilot versions, 60 for whole lessons', () => {
    const legacy = script('legacy', { schemaVersion: 1, durationMinutes: 20, steps: script().steps.map((step, index) => ({ ...step, minutes: index === 0 ? 10 : 5 })) });
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[legacy])}))); expand(); click('Edit script');
    expect(field('Minutes').max).toBe('20');
    change('Minutes', 21); Array.from(host.querySelectorAll('input[type="number"]')).slice(1).forEach(() => {});
    expect(button('Save edits').disabled).toBe(true);
    act(()=>root.unmount()); root = null; host.remove();
    const lesson = script('lesson', { scope: 'lesson', durationMinutes: 90, steps: script().steps.map(() => ({ ...script().steps[0], minutes: 30 })).map((step, index) => ({ ...step, id: 'l' + index })) });
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[lesson])}))); expand(); click('Edit script');
    expect(field('Minutes').max).toBe('60');
    change('Minutes', 40);
    expect(host.textContent).toContain('(100 / 90 minutes)');
  });
  it('shows source scope, evidence kind and levels, opens actual resources, and rejects unsafe source links', () => {
    const saved=script();saved.sources.push({id:'bad',title:'Unsafe supplied link',url:'javascript:alert(1)',evidenceKind:'general-practice',recommendations:[]});
    const p=props({generatedContent:plan('plan-a',[saved])});
    mount(React.createElement(View,p));expand();
    expect(host.textContent).toContain('K–8 fractions guidance');
    expect(host.textContent).toContain('Moderate evidence');
    expect(host.textContent).toContain('Recommendation 2');
    expect(host.textContent).toContain('Research sources retrieved');
    expect(host.textContent).toContain('Content-specific guidance');
    expect(host.textContent).toContain('General instructional practice');
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
    const links=Array.from(host.querySelectorAll('a'));
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link=>{expect(link.target).toBe('_blank');expect(link.rel).toContain('noopener');});
    click('Fraction models');
    expect(p.onOpenTeachingMaterial).toHaveBeenCalledWith('fractions-cards');
  });
  it('exports through the core and releases download URLs on unmount', async () => {
    const saved=script(), toPlainText=vi.fn(version=>'Teacher script: '+version.title), writeText=vi.fn().mockResolvedValue();
    const originalCore=window.AlloModules.LessonTeachingScript, originalClipboard=Object.getOwnPropertyDescriptor(navigator,'clipboard');
    const originalCreate=URL.createObjectURL, originalRevoke=URL.revokeObjectURL;
    window.AlloModules.LessonTeachingScript={toPlainText};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
    URL.createObjectURL=vi.fn(()=> 'blob:teaching-script');URL.revokeObjectURL=vi.fn();
    const clickSpy=vi.spyOn(window.HTMLAnchorElement.prototype,'click').mockImplementation(function(){ this.__download=this.download; });
    let downloadName='';
    clickSpy.mockImplementation(function(){ downloadName=this.download; });
    try {
      mount(React.createElement(View,props({generatedContent:plan('plan-a',[saved])})));expand();
      await act(async()=>button('Copy text').click());
      expect(toPlainText).toHaveBeenCalledWith(saved);
      expect(writeText).toHaveBeenCalledWith('Teacher script: '+saved.title);
      await act(async()=>button('Download text').click());
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(downloadName).toBe('Compare fractions on a number line.txt');
      expect(host.querySelector('a[download]')).toBeNull();
      act(()=>root.unmount());root=null;
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:teaching-script');
    } finally {
      window.AlloModules.LessonTeachingScript=originalCore;
      if(originalClipboard)Object.defineProperty(navigator,'clipboard',originalClipboard);else delete navigator.clipboard;
      URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
    }
  });
  it('resets drafts and ignores late completion when the selected plan changes', async () => {
    const pending=deferred(), p=props({generatedContent:plan('plan-a',[script()]),onUpdateTeachingScript:()=>pending.promise});
    mount(React.createElement(View,p));expand();click('Edit script');
    change('Teacher says','An edited instruction belonging only to plan A, with a full spoken prompt for fraction comparison.');
    act(()=>button('Save edits').click());
    const other=plan('plan-b',[{...script('other-script'),title:'Plan B sequence'}]);
    act(()=>root.render(React.createElement(View,{...p,generatedContent:other,defaultSettings:defaults({grade:'6th Grade',subject:'science',topic:'Cells'})})));
    expand();
    await act(async()=>pending.reject(new Error('Old plan edit failed')));
    expect(host.textContent).not.toContain('Old plan edit failed');
    expect(host.textContent).not.toContain('An edited instruction belonging only');
    expect(field('Grade').value).toBe('6th Grade');
    expect(field('Subject area').value).toBe('science');
    expect(host.textContent).toContain('Plan B sequence');
  });
});

describe('lesson-plan mounting', () => {
  function base(overrides={}) {return props({history:[{id:'analysis-a',type:'analysis'}],teachingScriptMaterials:materials,sourceTopic:'Fractions',gradeLevel:4,getRows:()=>2,normalizeMaterialItem:value=>value,renderFormattedText:value=>value,BilingualFieldRenderer:({text})=>React.createElement('p',null,text),...overrides});}
  it('passes only permitted teaching materials without replacing the plan’s history', () => {
    mount(React.createElement(PlanView,base()));expand();
    expect(field('Fraction models')).toBeTruthy();
    expect(host.textContent).not.toContain('Lesson resource 3');
    expect(host.textContent).toContain('Original teacher plan');
  });
  it('keeps the original lesson visible and offers retry if the module fails to load', () => {
    window.AlloModules.LessonTeachingScriptView=null;
    const retry=vi.fn();
    mount(React.createElement(PlanView,base({teachingScriptLoadState:'error',onRetryTeachingScriptLoad:retry})));
    expect(host.textContent).toContain('Original teacher plan');
    expect(host.textContent).toContain('Teaching script tools could not load');
    click('Try loading again');
    expect(retry).toHaveBeenCalledOnce();
  });
  it('waits for scoped materials and defaults before mounting a module that registered early', () => {
    mount(React.createElement(PlanView,base({teachingScriptLoadState:'loading',teachingScriptMaterials:[],defaultSettings:{}})));
    expect(host.textContent).toContain('Loading teaching script tools');
    expect(host.querySelector('[data-teaching-script-plan]')).toBeNull();
    act(()=>root.render(React.createElement(PlanView,base({teachingScriptLoadState:'ready',defaultSettings:defaults({grade:'5th Grade'})}))));
    expand();
    expect(field('Grade').value).toBe('5th Grade');
    expect(field('Fraction models').checked).toBe(true);
  });
  it('does not show loading controls when the feature is not teacher-authorized', () => {
    window.AlloModules.LessonTeachingScriptView=null;
    mount(React.createElement(PlanView,base({isTeacherMode:false,teachingScriptLoadState:'error'})));
    expect(host.textContent).not.toContain('Teaching script tools');
  });
});
