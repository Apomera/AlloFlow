import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, View;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = globalThis.React = React;
  loadAlloModule('resource_content_fingerprint_module.js'); loadAlloModule('lesson_teaching_script_module.js'); loadAlloModule('view_lesson_teaching_script_module.js');
  View = window.AlloModules.LessonTeachingScriptView;
});
function unmount() { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; }
afterEach(() => { unmount(); vi.restoreAllMocks(); sessionStorage.clear(); });
const actor = 'teacher-a|profile-one|workspace-one';
const storageKey = (scope = actor, id = 'plan-a') => 'alloflow:lesson-script-session:v1:' + encodeURIComponent(scope) + ':' + encodeURIComponent(id);
const prompt = 'Use equal-sized wholes to compare these fractions, then explain how the equal intervals support your answer.';
const edited = 'A recovered teacher prompt: compare the fractions using equal-sized wholes and explain your reasoning with a model.';
function script(id = 'script-a') { return { id, planId: 'plan-a', schemaVersion: 2, scope: 'segment', title: 'Fraction script', durationMinutes: 15, researchStatus: 'disabled', sources: [], inputSnapshot: { settings: { goal: 'Compare fractions', grade: '4th Grade', subject: 'mathematics', scope: 'segment' }, materialIds: ['source-a'] }, steps: [1,2,3].map(n => ({ id: 'step-' + n, title: 'Compare fractions ' + n, phase: 'directInstruction', minutes: 5, teacherSays: prompt, studentDoes: 'Learners compare fraction models together.', checkQuestion: 'How do the equal parts support your answer?', possibleResponse: 'Both fractions refer to the same-sized whole.', ifStruggling: 'Fold a paper strip into equal parts together.', ifReady: 'Explain the comparison using equivalent fractions.', resourceIds: ['source-a'], recommendationIds: [] })) }; }
function plan(id = 'plan-a') { return { id, type: 'lesson-plan', data: { objectives: ['Compare fractions using models'], essentialQuestion: 'How can we compare fractions?', directInstruction: 'Use models of equal wholes.', teachingScripts: [script()] } }; }
const defaultSettings = { grade: '4th Grade', gradeSource: 'plan', subject: 'mathematics', subjectDetected: true, topic: 'Fractions', standard: '', language: 'English', suggestedDuration: { segment: 15, lesson: 45 } };
function props(extra = {}) { return { generatedContent: plan(), history: [{ id: 'source-a', type: 'source', title: 'Fraction models', data: { text: 'Compare equal wholes using halves and fourths.' } }], isTeacherMode: true, isParentMode: false, isIndependentMode: false, draftScope: actor, t: () => '', capabilities: { canGenerate: true, canResearch: true }, defaultSettings, onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), ...extra }; }
function mount(p) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(React.createElement(View, p))); }
function render(p) { act(() => root.render(React.createElement(View, p))); }
function button(label) { return [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label); }
function click(label) { act(() => button(label).click()); }
function expand() { const toggle = button('Teaching script+'); if (toggle) act(() => toggle.click()); }
function openSettings() { expand(); const toggle = button('Create another script+'); if (toggle) act(() => toggle.click()); }
function field(label) { const node = [...host.querySelectorAll('label')].find(node => node.textContent.trim().startsWith(label)); if (!node) return null; return node.htmlFor ? host.querySelector('[id="' + node.htmlFor + '"]') : node.querySelector('input,select,textarea'); }
function change(label, value) { const node = field(label); const proto = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype; act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }
function startDraft(p = props()) { mount(p); expand(); click('Edit script'); change('Teacher says', edited); return p; }
function record() { return JSON.parse(sessionStorage.getItem(storageKey())); }

describe('scoped teaching-script recovery', () => {
  it('recovers generation settings after unmount/remount without opting research back in', () => {
    const p = props(); mount(p); openSettings();
    change('Learning goal', 'Compare fractions with equal numerators'); change('Relevant prior learning', 'We used paper strips yesterday.');
    act(() => field('Whole lesson').click()); change('Teaching time', 60); act(() => field('Use research').click());
    unmount(); mount(p); openSettings();
    expect(field('Learning goal').value).toBe('Compare fractions with equal numerators'); expect(field('Whole lesson').checked).toBe(true);
    expect(field('Teaching time').value).toBe('60'); expect(field('Use research').checked).toBe(false);
    expect(field('Relevant prior learning').value).toBe('We used paper strips yesterday.'); expect(host.textContent).toContain('Recovered your script settings from this tab.');
    click('Edit script'); expect(host.textContent).not.toContain('Recovered unsaved script edits');
  });
  it('recovers edits after navigating to another plan and clears only the draft after saving', async () => {
    const p = startDraft(); render(props({ generatedContent: plan('plan-b') })); render(p);
    expect(field('Teacher says').value).toBe(edited); expect(host.textContent).toContain('Recovered unsaved script edits');
    await act(async () => button('Save edits').click());
    expect(p.onUpdateTeachingScript.mock.calls[0][3]).toEqual(script().steps); expect(record().draft).toBeNull();
    unmount(); mount(p); expect(button('Save edits')).toBeUndefined(); expect(record().settings.goal).toBe('Compare fractions using models');
  });
  it('clears a fresh draft when discard returns every setting to the initial values', () => {
    const p = startDraft(); expect(record().draft.steps[0].teacherSays).toBe(edited);
    click('Discard edits'); expect(record().draft).toBeNull();
    unmount(); mount(p); expand(); expect(button('Save edits')).toBeUndefined(); expect(host.textContent).not.toContain(edited);
  });
  it('discarding recovered edits retains the generation settings without recovering the draft again', () => {
    const p = props(); mount(p); openSettings(); change('Teaching time', 25); click('Edit script'); change('Teacher says', edited);
    unmount(); mount(p); click('Discard edits'); expect(record().draft).toBeNull();
    unmount(); mount(p); openSettings(); expect(field('Teaching time').value).toBe('25'); expect(button('Save edits')).toBeUndefined();
  });
  it('preserves a recovered stale draft while blocking overwrite of the changed saved version', () => {
    const p = startDraft(); unmount(); const revised = plan(); revised.data.teachingScripts[0].steps[0].teacherSays = 'A newer saved instruction from another teacher workspace, which must remain untouched.';
    mount({ ...p, generatedContent: revised });
    expect(field('Teacher says').value).toBe(edited); expect(button('Save edits').disabled).toBe(true); expect(host.textContent).toContain('This saved version changed');
    expect(revised.data.teachingScripts[0].steps[0].teacherSays).toContain('newer saved instruction');
  });
  it('keeps a recovered draft visible and discardable if its saved version was removed', () => {
    const p = startDraft(); unmount(); const revised = plan(); revised.data.teachingScripts = []; mount({ ...p, generatedContent: revised });
    expect(field('Teacher says').value).toBe(edited); expect(button('Save edits').disabled).toBe(true); expect(host.textContent).toContain('Recovered draft version');
    click('Discard edits'); expect(record().draft).toBeNull(); expect(button('Save edits')).toBeUndefined();
  });
  it.each(['teacher-b|profile-one|workspace-one', 'teacher-a|profile-two|workspace-one', 'teacher-a|profile-one|workspace-two'])('does not expose edits when the scope changes: %s', scope => {
    const p = startDraft(); render({ ...p, draftScope: scope }); expand();
    expect(field('Teacher says')).toBeNull(); expect(host.textContent).not.toContain(edited);
    render(p); expect(field('Teacher says').value).toBe(edited);
  });
  it('does not render or rewrite recovery in parent/student mode and restores only when teacher scope returns', () => {
    const p = startDraft(); const raw = sessionStorage.getItem(storageKey());
    render({ ...p, isParentMode: true, draftScope: '' }); expect(host.textContent).toBe(''); expect(sessionStorage.getItem(storageKey())).toBe(raw);
    render({ ...p, isIndependentMode: true, draftScope: '' }); expect(host.textContent).toBe('');
    render(p); expect(field('Teacher says').value).toBe(edited);
  });
  it.each([['malformed', 'not valid JSON'], ['oversized', 'x'.repeat(800001)]])('handles %s recovery without replacing it before the teacher makes changes', (_kind, raw) => {
    sessionStorage.setItem(storageKey(), raw); const p = props(); mount(p); expect(host.textContent).toContain('A recovery copy could not be restored');
    expect(sessionStorage.getItem(storageKey())).toBe(raw); openSettings(); change('Lesson topic', 'An updated topic');
    expect(record().settings.topic).toBe('An updated topic'); expect(record().draft).toBeNull();
  });
  it('rejects a copied envelope that belongs to another actor even under the current storage key', () => {
    startDraft(); const saved = record(); unmount(); saved.scope = 'someone-else'; sessionStorage.setItem(storageKey(), JSON.stringify(saved)); mount(props()); expand();
    expect(host.textContent).toContain('A recovery copy could not be restored'); expect(host.textContent).not.toContain(edited);
  });
  it('never claims recovery succeeded when the recorded defaults exceed read limits', () => {
    const p = props({ defaultSettings: { ...defaultSettings, standard: 'x'.repeat(4001) } }); mount(p); openSettings();
    const standardInput = host.querySelector('[id$="-standard"]'); act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(standardInput, 'A short current standard'); standardInput.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).toContain('could not keep a recovery copy'); expect(sessionStorage.getItem(storageKey())).toBeNull();
  });
  it.each(['grade', 'researchStatus', 'phase', 'sourceId', 'recommendationId'])('rejects malformed recovered metadata before rendering: %s', fieldName => {
    startDraft(); const saved = record(); unmount(); const hostile = { toString: 1 };
    if (fieldName === 'grade') saved.draft.version.inputSnapshot.settings.grade = hostile;
    if (fieldName === 'researchStatus') saved.draft.version.researchStatus = hostile;
    if (fieldName === 'phase') saved.draft.steps[0].phase = hostile;
    if (fieldName === 'sourceId') saved.draft.version.sources = [{ id: hostile, title: 'Research' }];
    if (fieldName === 'recommendationId') saved.draft.version.sources = [{ id: 'source', recommendations: [{ id: hostile, text: 'Advice' }] }];
    sessionStorage.setItem(storageKey(), JSON.stringify(saved)); const revised = plan(); revised.data.teachingScripts = [];
    expect(() => mount(props({ generatedContent: revised }))).not.toThrow(); expect(host.textContent).toContain('A recovery copy could not be restored'); expect(button('Save edits')).toBeUndefined();
  });
  it('warns when recovery storage fails while keeping current edits and saved plan intact', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const p = startDraft(); expect(field('Teacher says').value).toBe(edited); expect(host.textContent).toContain('could not keep a recovery copy');
    expect(p.generatedContent.data.teachingScripts[0].steps[0].teacherSays).toBe(prompt);
  });
  it('warns on refresh only for an unrecoverable draft and removes the guard after unmount', () => {
    const failedWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    startDraft(); const blocked = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(blocked); expect(blocked.defaultPrevented).toBe(true);
    unmount(); const afterUnmount = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(afterUnmount); expect(afterUnmount.defaultPrevented).toBe(false);
    failedWrite.mockRestore(); startDraft(); const recoverable = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(recoverable); expect(recoverable.defaultPrevented).toBe(false);
  });
  it('rejects an oversized write visibly while keeping the large draft available', () => {
    const p = props(); const text = 'A'.repeat(16000); p.generatedContent.data.teachingScripts[0].steps = [1,2,3,4,5].map(n => ({ ...script().steps[0], id: 'large-' + n, minutes: 3, teacherSays: text, studentDoes: text, checkQuestion: text, possibleResponse: text, ifStruggling: text, ifReady: text }));
    mount(p); expand(); click('Edit script'); expect(host.textContent).toContain('could not keep a recovery copy'); expect(field('Teacher says').value).toBe(text); expect(sessionStorage.getItem(storageKey())).toBeNull();
  });
  it('refreshes unchanged restored defaults against a revised plan and preserves custom settings', () => {
    const p = props(); mount(p); openSettings(); change('Lesson topic', 'My custom focus'); unmount();
    const revised = plan(); revised.data.objectives = ['Explain equivalent fractions']; mount({ ...p, generatedContent: revised, defaultSettings: { ...defaultSettings, grade: '5th Grade' } }); openSettings();
    expect(field('Learning goal').value).toBe('Explain equivalent fractions'); expect(field('Grade').value).toBe('5th Grade'); expect(field('Lesson topic').value).toBe('My custom focus');
    expect(record().defaults.goal).toBe('Explain equivalent fractions');
  });
  it('retains recovery after a failed save', async () => {
    const p = startDraft(props({ onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: false, error: 'Save failed' }) }));
    await act(async () => button('Save edits').click()); expect(record().draft.steps[0].teacherSays).toBe(edited);
    unmount(); mount(p); expect(field('Teacher says').value).toBe(edited);
  });
  it('clears a successfully submitted draft even when saving finishes after navigation', async () => {
    let finish; const p = startDraft(props({ onUpdateTeachingScript: vi.fn(() => new Promise(resolve => { finish = resolve; })) }));
    act(() => button('Save edits').click()); unmount(); await act(async () => finish({ ok: true }));
    expect(record().draft).toBeNull(); mount(p); expect(button('Save edits')).toBeUndefined();
  });
  it('does not clear newer recovered edits when an old save finishes after remount', async () => {
    let finish; const p = startDraft(props({ onUpdateTeachingScript: vi.fn(() => new Promise(resolve => { finish = resolve; })) }));
    act(() => button('Save edits').click()); unmount(); mount(p); change('Teacher says', edited + ' New changes after navigation.');
    await act(async () => finish({ ok: true })); expect(record().draft.steps[0].teacherSays).toContain('New changes after navigation.');
  });
});
