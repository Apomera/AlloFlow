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
  loadAlloModule('resource_content_fingerprint_module.js');
  loadAlloModule('lesson_teaching_script_module.js');
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
const materials = [{ id: 'fractions-cards', type: 'source', title: 'Fraction models', data: { text: 'Use models of equal wholes to compare halves and fourths.' } }, { id: 42, type: 'quiz', title: 'Fraction comparison check', data: { questions: [{ question: 'Which fraction is larger?', options: ['One half', 'One fourth'], answer: 'One half' }] } }];
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


describe('spoken directions', () => {
  it('isolates speech, keeps teacher notes private, deduplicates questions and preserves edits', async () => {
    const v=script();v.steps[0].teacherSays += ' [Wait for responses] How do you know where one half belongs?';
    const p=props({generatedContent:plan('plan-a',[v]),draftScope:'teacher'});
    mount(React.createElement(View,p));expand();click('Spoken directions');
    const surface=host.querySelector('[data-spoken-directions]');
    expect(surface.textContent).not.toContain(v.steps[0].possibleResponse);
    expect(surface.textContent).not.toContain(v.steps[0].studentDoes);
    expect(surface.textContent).not.toContain('Wait for responses');
    expect(surface.querySelectorAll('[data-spoken-block]')).toHaveLength(1);
    click('Next step');expect(surface.querySelectorAll('[data-spoken-block]')).toHaveLength(2);
    click('Full script');click('Edit script');change('Teacher says', 'New spoken wording for students that is long enough to remain a valid complete script field.');
    click('Spoken directions');expect(host.textContent).toContain('New spoken wording');expect(button('Save TTS').disabled).toBe(true);
    click('Full script');expect(field('Teacher says').value).toContain('New spoken wording');
  });
  it('stops pending playback when leaving, and never starts a late audio response', async () => {
    const pending=deferred(),audio=vi.fn();vi.stubGlobal('Audio',audio);
    const controller={summary:()=>({ready:0,total:6}),resolve:vi.fn(()=>pending.promise),dispose:vi.fn()};
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),createTeachingScriptAudio:()=>controller})));
    expand();click('Spoken directions');await act(async()=>button('Play spoken block').click());
    const signal=controller.resolve.mock.calls[0][1].signal;click('Full script');expect(signal.aborted).toBe(true);
    await act(async()=>pending.resolve('blob:late'));expect(audio).not.toHaveBeenCalled();expect(controller.dispose).toHaveBeenCalled();vi.unstubAllGlobals();
  });
  it('reports partial saved audio and cancels preparation', async () => {
    const controller={summary:()=>({ready:2,total:6}),prepareAll:vi.fn().mockResolvedValue({failed:1}),dispose:vi.fn()};
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),createTeachingScriptAudio:()=>controller})));
    expand();click('Spoken directions');await act(async()=>button('Save TTS').click());expect(host.textContent).toContain('Some audio could not be saved');
    const pending=deferred();controller.prepareAll.mockImplementation(()=>pending.promise);
    await act(async()=>button('Save TTS').click());const signal=controller.prepareAll.mock.calls[1][0].signal;click('Stop audio');expect(signal.aborted).toBe(true);
    await act(async()=>pending.resolve({failed:0}));expect(host.textContent).toContain('Stopped. Saved clips are kept');
  });
  it('copies and prints only spoken content, escaping saved markup', async () => {
    const v=script();v.title='<img src=x onerror=alert(1)>';
    const clipboard={writeText:vi.fn().mockResolvedValue()};Object.defineProperty(navigator,'clipboard',{configurable:true,value:clipboard});
    const popup={document:{write:vi.fn(),close:vi.fn()},focus:vi.fn(),print:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[v])})));expand();click('Spoken directions');
    await act(async()=>button('Copy spoken directions').click());expect(clipboard.writeText.mock.calls[0][0]).not.toContain(v.steps[0].possibleResponse);
    click('Print spoken directions');const html=popup.document.write.mock.calls[0][0];expect(html).toContain('&lt;img');expect(html).not.toContain('<img');expect(html).not.toContain(v.steps[0].ifStruggling);expect(popup.print).toHaveBeenCalled();
  });
});

describe('spoken playback pacing',()=>{
 it('stops after a spoken block without advancing, and marks failed clips for rebuilding',async()=>{
  const players=[];vi.stubGlobal('Audio',class{constructor(){this.pause=vi.fn();this.play=vi.fn().mockResolvedValue();players.push(this);}});
  const controller={summary:()=>({ready:6,total:6}),resolve:vi.fn().mockResolvedValue('blob:clip'),quarantine:vi.fn().mockResolvedValue(true),dispose:vi.fn()};
  mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),createTeachingScriptAudio:()=>controller})));expand();click('Spoken directions');
  await act(async()=>button('Play spoken block').click());expect(host.textContent).toContain('Playing the highlighted');act(()=>players[0].onended());expect(host.textContent).toContain('Paused for student participation');expect(host.textContent).toContain('1 / 3');expect(controller.resolve).toHaveBeenCalledTimes(1);
  await act(async()=>button('Play spoken block').click());await act(async()=>players[1].onerror());expect(controller.quarantine).toHaveBeenCalledWith('0:teacherSays',expect.any(Object));expect(host.textContent).toContain('Audio could not play');vi.unstubAllGlobals();
 });
});
