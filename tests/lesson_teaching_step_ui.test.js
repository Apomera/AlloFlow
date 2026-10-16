import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
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
beforeEach(() => window.sessionStorage.clear());
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


function clickStep(index) { act(() => host.querySelector('[aria-label="Regenerate step ' + index + '"]').click()); }
async function replacement() { await act(async () => button('Generate replacement').click()); }
const newStep = (index = 1) => ({ ...script().steps[index - 1], title: 'A clearer explanation', teacherSays: 'Look at our matching fraction strips. Tell your partner why the equal-sized whole matters before comparing these pieces.' });
function editingProps(overrides = {}) { return props({ generatedContent: plan('plan-a', [script()]), draftScope: 'teacher-workspace', onRegenerateTeachingStep: vi.fn().mockResolvedValue({ ok: true, step: newStep() }), ...overrides }); }

describe('resuming teaching scripts and replacing one step', () => {
  it('discovers compatible progress after mount with complete settings and resumes directly', async () => {
    const p = props({ onGetTeachingScriptRecovery: vi.fn(() => ({ completedChunks: 2, totalChunks: 4 })), onDiscardTeachingScriptRecovery: vi.fn() });
    mount(React.createElement(View, p)); expand();
    expect(host.textContent).toContain('2 of 4 sections are ready');
    expect(button('Resume script').disabled).toBe(false);
    expect(p.onGetTeachingScriptRecovery.mock.calls.at(-1)[0]).toMatchObject({ materialIds: ['fractions-cards', 42], inferContext: { subject: true, topic: true }, language: 'English' });
    await submit();
    expect(p.onGenerateTeachingScript).toHaveBeenCalledWith(p.onGetTeachingScriptRecovery.mock.calls.at(-1)[0]);
    expect(p.onDiscardTeachingScriptRecovery).not.toHaveBeenCalled();
  });
  it('refreshes progress for changed settings and ignores unavailable or malformed checkpoints', () => {
    const p = props({ onGetTeachingScriptRecovery: vi.fn(settings => settings.durationMinutes === 15 ? { completedChunks: 1, totalChunks: 4 } : null) });
    mount(React.createElement(View, p)); expand(); expect(button('Resume script')).toBeTruthy();
    change('Teaching time', 20); expect(button('Generate script')).toBeTruthy(); expect(host.textContent).not.toContain('sections are ready');
    act(() => root.render(React.createElement(View, { ...p, onGetTeachingScriptRecovery: () => { throw new Error('no storage'); } })));
    expect(button('Generate script')).toBeTruthy();
    act(() => root.render(React.createElement(View, { ...p, onGetTeachingScriptRecovery: () => ({ completedChunks: 7, totalChunks: 3 }) })));
    expect(button('Generate script')).toBeTruthy();
  });
  it('starts over only after clearing the checkpoint successfully', async () => {
    let checkpoint = { completedChunks: 2, totalChunks: 3 }; const order = [];
    const p = props({ onGetTeachingScriptRecovery: () => checkpoint, onDiscardTeachingScriptRecovery: vi.fn(() => { order.push('clear'); checkpoint = null; return { ok: true }; }), onGenerateTeachingScript: vi.fn(async () => { order.push('generate'); return { ok: true }; }) });
    mount(React.createElement(View, p)); expand();
    await act(async () => button('Start over').click()); expect(order).toEqual(['clear', 'generate']);
    expect(button('Generate script')).toBeTruthy();
  });
  it('keeps progress and does not generate if clearing it fails', async () => {
    const p = props({ onGetTeachingScriptRecovery: () => ({ completedChunks: 1, totalChunks: 3 }), onDiscardTeachingScriptRecovery: () => ({ ok: false, error: 'Another request is still running.' }) });
    mount(React.createElement(View, p)); expand(); await act(async () => button('Start over').click());
    expect(p.onGenerateTeachingScript).not.toHaveBeenCalled(); expect(host.textContent).toContain('Another request is still running.'); expect(button('Resume script').disabled).toBe(false);
  });
  it('preserves existing teacher edits and saves a generated replacement only on explicit Save edits', async () => {
    const p = editingProps(); const original=JSON.stringify(p.generatedContent);
    mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 2', 'My teacher wording'); change('Minutes 2', '5');
    clickStep(1); change('What should change? (optional)', 'Use a concrete fraction strip example.'); await replacement();
    const sent=p.onRegenerateTeachingStep.mock.calls[0];
    expect(sent.slice(0,3)).toEqual(['plan-a','script-a','step-1']);
    expect(sent[3].instruction).toBe('Use a concrete fraction strip example.');
    expect(sent[3].steps[1]).toMatchObject({ title: 'My teacher wording', minutes: 5 });
    expect(sent[3].expectedSteps).toEqual(script().steps);
    expect(field('Step title 1').value).toBe('A clearer explanation'); expect(field('Step title 2').value).toBe('My teacher wording');
    expect(field('Teacher says · 3').value).toBe(script().steps[2].teacherSays);
    expect(document.activeElement).toBe(field('Step title 1'));
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled(); expect(JSON.stringify(p.generatedContent)).toBe(original);
    await act(async () => button('Save edits').click());
    expect(p.onUpdateTeachingScript).toHaveBeenCalledWith('plan-a','script-a',expect.arrayContaining([expect.objectContaining({ id:'step-1', title:'A clearer explanation' }), expect.objectContaining({ id:'step-2', title:'My teacher wording' })]),script().steps);
  });
  it('accepts a legacy saved step whose phase was not recorded', async () => {
    const legacy=script('legacy', {schemaVersion:1}); legacy.steps.forEach(step => { delete step.phase; });
    const p=editingProps({ generatedContent:plan('plan-a',[legacy]), onRegenerateTeachingStep:vi.fn().mockResolvedValue({ok:true,step:{...newStep(),phase:''}}) });
    mount(React.createElement(View,p)); expand(); clickStep(1); await replacement();
    expect(field('Step title 1').value).toBe('A clearer explanation'); expect(button('Save edits').disabled).toBe(false);
  });
  it('creates a recoverable draft from a saved step and uses the existing discard confirmation', async () => {
    const p = editingProps(); mount(React.createElement(View,p)); expand(); clickStep(1); await replacement();
    expect(host.textContent).toContain('Replacement step added to your unsaved draft');
    act(() => root.unmount()); root=null; host.remove(); host=null;
    mount(React.createElement(View,p));
    expect(field('Step title 1').value).toBe('A clearer explanation'); expect(host.textContent).toContain('Recovered unsaved script edits');
    click('Discard edits'); expect(host.textContent).toContain('Discard your unsaved script changes?'); click('Discard changes');
    expect(host.textContent).toContain('Compare fractions 1'); expect(host.textContent).not.toContain('A clearer explanation');
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });
  it('locks editing, saving, version switching, and a second request while a replacement is pending', async () => {
    const pending=deferred(), p=editingProps({ generatedContent: plan('plan-a',[script(),script('script-b')]), onRegenerateTeachingStep:vi.fn(() => pending.promise) });
    mount(React.createElement(View,p)); expand(); click('Edit script'); clickStep(1);
    act(() => button('Generate replacement').click());
    expect(field('Step title 1').disabled).toBe(true); expect(field('Teacher says · 2').disabled).toBe(true);
    expect(field('Script version').disabled).toBe(true); expect(button('Save edits').disabled).toBe(true); expect(button('Discard edits').disabled).toBe(true);
    expect(host.querySelector('[aria-label="Regenerate step 2"]').disabled).toBe(true); expect(host.textContent).toContain('Writing the replacement step');
    await act(async () => { pending.resolve({ok:true,step:newStep()}); }); expect(field('Step title 1').disabled).toBe(false);
  });
  it('cancels a replacement and ignores its late response without losing edits', async () => {
    const pending=deferred(), p=editingProps({ onRegenerateTeachingStep:vi.fn(() => pending.promise) });
    mount(React.createElement(View,p)); expand(); click('Edit script'); change('Step title 2','A teacher edit'); clickStep(1);
    act(() => button('Generate replacement').click()); click('Cancel generation');
    expect(p.onCancelTeachingScript).toHaveBeenCalledWith('plan-a'); expect(host.textContent).toContain('Step regeneration cancelled.');
    await act(async () => { pending.resolve({ok:true,step:newStep()}); });
    expect(field('Step title 1').value).toBe('Compare fractions 1'); expect(field('Step title 2').value).toBe('A teacher edit'); expect(button('Save edits').disabled).toBe(false);
  });
  it.each(['plan','actor'])('ignores late replacements after changing the %s', async kind => {
    const pending=deferred(), p=editingProps({onRegenerateTeachingStep:vi.fn(() => pending.promise)});
    mount(React.createElement(View,p)); expand(); clickStep(1); act(() => button('Generate replacement').click());
    act(() => root.render(React.createElement(View,{...p,...(kind==='plan'?{generatedContent:plan('plan-b',[script('script-other')])}:{draftScope:'another-teacher'})})));
    await act(async () => { pending.resolve({ok:true,step:newStep()}); }); expand();
    expect(host.textContent).not.toContain('A clearer explanation'); expect(button('Edit script')).toBeTruthy();
  });
  it('keeps the original wording when generation fails or the saved version changes', async () => {
    const pending=deferred(), p=editingProps({onRegenerateTeachingStep:vi.fn(() => pending.promise)});
    mount(React.createElement(View,p)); expand(); click('Edit script'); change('Step title 2','A teacher edit'); clickStep(1); act(() => button('Generate replacement').click());
    const changed=script(); changed.steps[0].title='A saved change elsewhere';
    act(() => root.render(React.createElement(View,{...p,generatedContent:plan('plan-a',[changed])})));
    await act(async () => { pending.resolve({ok:true,step:newStep()}); });
    expect(host.textContent).toContain('This saved version changed while the step was being generated.');
    expect(field('Step title 1').value).toBe('Compare fractions 1'); expect(field('Step title 2').value).toBe('A teacher edit');
  });
  it.each([{ok:false,error:'Try again later.'},{ok:true,step:newStep(2)},{ok:true,step:{...newStep(),minutes:7}},{ok:true,step:{...newStep(),phase:'closure'}},{ok:true,step:{...newStep(),teacherSays:'Incomplete'}}])('rejects a failed or corrupt replacement without creating a draft: %j', async result => {
    const p=editingProps({onRegenerateTeachingStep:vi.fn().mockResolvedValue(result)});
    mount(React.createElement(View,p)); expand(); clickStep(1); await replacement();
    expect(button('Edit script')).toBeTruthy(); expect(host.textContent).toContain('Compare fractions 1'); expect(host.querySelector('[role="alert"]')).toBeTruthy();
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });
  it.each([
    ['Teacher says · 1', ''], ['Step title 1', ''],
    ['Teacher says · 1', 'x'.repeat(16001)], ['Step title 1', 'x'.repeat(241)]
  ])('repairs selected incomplete or oversized text in %s while preserving other edits', async (label, text) => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change(label, text); change('Step title 2', 'Keep this teacher edit');
    expect(button('Save edits').disabled).toBe(true);
    expect(host.querySelector('[aria-label="Regenerate step 1"]').disabled).toBe(false);
    expect(host.querySelector('[aria-label="Regenerate step 2"]').disabled).toBe(true);
    clickStep(1); await replacement();
    const sent = p.onRegenerateTeachingStep.mock.calls[0][3];
    expect(sent.steps[0][label.startsWith('Step title') ? 'title' : 'teacherSays']).toBe(text);
    expect(sent.steps[0].resourceIds).toEqual(script().steps[0].resourceIds);
    expect(sent.steps[0].recommendationIds).toEqual(script().steps[0].recommendationIds);
    expect(sent.steps[0].minutes).toBe(5); expect(sent.expectedSteps).toEqual(script().steps);
    expect(field('Step title 1').value).toBe('A clearer explanation');
    expect(field('Step title 2').value).toBe('Keep this teacher edit');
    expect(button('Save edits').disabled).toBe(false); expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });
  it('keeps incomplete selected wording after failure and restores it with Undo after a successful retry and reload', async () => {
    const p = editingProps({ onRegenerateTeachingStep: vi.fn().mockResolvedValueOnce({ ok: false, error: 'Please retry.' }).mockResolvedValueOnce({ ok: true, step: newStep() }) });
    mount(React.createElement(View, p)); expand(); click('Edit script'); change('Teacher says · 1', ''); change('Step title 2', 'My teacher edit');
    clickStep(1); await replacement();
    expect(field('Teacher says · 1').value).toBe(''); expect(field('Step title 2').value).toBe('My teacher edit');
    expect(host.textContent).toContain('Please retry.'); await replacement();
    act(() => root.unmount()); root = null; host.remove(); host = null; mount(React.createElement(View, p));
    act(() => host.querySelector('[aria-label="Undo step replacement 1"]').click());
    expect(field('Teacher says · 1').value).toBe(''); expect(field('Step title 2').value).toBe('My teacher edit');
    expect(button('Save edits').disabled).toBe(true); expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });
  it('keeps incomplete selected wording when a cancelled replacement arrives late', async () => {
    const pending = deferred(), p = editingProps({ onRegenerateTeachingStep: vi.fn(() => pending.promise) });
    mount(React.createElement(View, p)); expand(); click('Edit script'); change('Teacher says · 1', ''); clickStep(1);
    act(() => button('Generate replacement').click()); click('Cancel generation');
    await act(async () => pending.resolve({ ok: true, step: newStep() }));
    expect(field('Teacher says · 1').value).toBe(''); expect(button('Save edits').disabled).toBe(true);
    expect(host.querySelector('[aria-label="Undo step replacement 1"]')).toBeNull();
  });
  it('requires valid untouched text and timing and explains which other step blocks regeneration', () => {
    const p=editingProps(); mount(React.createElement(View,p)); expand(); click('Edit script'); change('Teacher says · 1','Incomplete');
    expect(host.querySelector('[aria-label="Regenerate step 2"]').disabled).toBe(true);
    const regenerate = host.querySelector('[aria-label="Regenerate step 2"]');
    expect(document.getElementById(regenerate.getAttribute('aria-describedby')).textContent).toContain('Complete the highlighted fields in step 1');
    click('Go to first issue'); expect(document.activeElement).toBe(field('Teacher says · 1'));
    change('Teacher says · 1', 'x'.repeat(16001));
    expect(host.querySelector('[aria-label="Regenerate step 2"]').disabled).toBe(true);
    change('Teacher says · 1',script().steps[0].teacherSays); change('Minutes 1',6);
    expect(host.querySelector('[aria-label="Regenerate step 2"]').disabled).toBe(true);
    expect(p.onRegenerateTeachingStep).not.toHaveBeenCalled();
  });
  it('keeps regeneration blocked for stale incomplete drafts', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Teacher says · 1', '');
    const changed = script(); changed.steps[0].title = 'Saved elsewhere';
    act(() => root.render(React.createElement(View, { ...p, generatedContent: plan('plan-a', [changed]) })));
    expect(host.querySelector('[aria-label="Regenerate step 1"]').disabled).toBe(true); clickStep(1);
    expect(p.onRegenerateTeachingStep).not.toHaveBeenCalled(); expect(field('Teacher says · 1').value).toBe('');
  });
  it('announces exact pacing adjustments and keeps step minutes unchanged until the teacher balances them', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Minutes 1', 3);
    const timingStatus = Array.from(host.querySelectorAll('[aria-live="polite"]')).find(node => node.textContent.startsWith('Add 2 minutes'));
    expect(timingStatus).toBeTruthy(); expect(field('Minutes 2').value).toBe('5'); expect(button('Save edits').disabled).toBe(true);
    expect(host.querySelector('[aria-label="Regenerate step 1"]').disabled).toBe(true);
    change('Minutes 1', 8); expect(timingStatus.textContent).toBe('Remove 3 minutes across steps to meet the saved teaching time.');
    change('Minutes 1', 6); expect(timingStatus.textContent).toContain('Remove 1 minute across steps');
    change('Minutes 1', 4); expect(timingStatus.textContent).toContain('Add 1 minute across steps');
    change('Minutes 1', ''); expect(timingStatus.textContent).not.toMatch(/^(Add|Remove)/);
    expect(host.textContent).toContain('Use positive whole minutes within the allowed range for every step before regenerating.');
    change('Minutes 1', 4); change('Minutes 2', 6);
    expect(timingStatus.textContent).toContain('Redistribute minutes between steps');
    expect(button('Save edits').disabled).toBe(false); expect(host.querySelector('[aria-label="Regenerate step 1"]').disabled).toBe(false);
    expect(p.onRegenerateTeachingStep).not.toHaveBeenCalled();
  });
  it.each([['chunking', 1], ['chunking', 0], ['generating', 0]])('resumes %s with %i completed sections using saved research without live research', async (stage, completedChunks) => {
    const p = props({ capabilities: { canGenerate: true, canResearch: false }, onGetTeachingScriptRecovery: () => ({ stage, completedChunks, totalChunks: 3 }), onDiscardTeachingScriptRecovery: vi.fn() });
    mount(React.createElement(View, p)); expand();
    expect(button('Resume script').disabled).toBe(false); expect(button('Start over').disabled).toBe(true);
    expect(host.textContent).toContain('Resume will reuse this run’s saved research.');
    expect(host.textContent).not.toContain('Turn off research to generate');
    if (!completedChunks) {
      expect(host.textContent).toContain('Your lesson setup is ready. Resume to write the script.');
      expect(host.textContent).not.toContain('0 of 3 sections are ready');
    }
    await act(async () => button('Start over').click()); expect(p.onDiscardTeachingScriptRecovery).not.toHaveBeenCalled();
    await submit(); expect(p.onGenerateTeachingScript).toHaveBeenCalledTimes(1);
    expect(p.onGenerateTeachingScript).toHaveBeenCalledWith(expect.objectContaining({ researchEnabled: true }));
  });
  it.each([null, { stage: 'research', completedChunks: 0, totalChunks: 3 }])('requires live research for a new run or unfinished research', async checkpoint => {
    const p = props({ capabilities: { canGenerate: true, canResearch: false }, onGetTeachingScriptRecovery: () => checkpoint });
    mount(React.createElement(View, p)); expand(); expect(button('Generate script').disabled).toBe(true);
    expect(host.textContent).toContain('Live research is unavailable here.'); await submit(); expect(p.onGenerateTeachingScript).not.toHaveBeenCalled();
  });
  it.each([0, 1])('requires AI to resume a partial checkpoint with %i complete sections', async completedChunks => {
    const p = props({ capabilities: { canGenerate: false, canResearch: false }, onGetTeachingScriptRecovery: () => ({ stage: 'chunking', completedChunks, totalChunks: 3 }) });
    mount(React.createElement(View, p)); expand(); expect(button('Resume script').disabled).toBe(true);
    await submit(); expect(p.onGenerateTeachingScript).not.toHaveBeenCalled();
  });
  it('explains the final save stage while the host is adding a completed script', () => {
    mount(React.createElement(View, props({ scriptRun: { planId: 'plan-a', busy: true, stage: 'ready' } })));
    expect(host.textContent).toContain('Adding the completed script to this lesson…');
  });
});
