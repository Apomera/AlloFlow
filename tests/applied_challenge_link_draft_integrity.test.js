import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let AC, SR, root, host, latest, replaceResponses, updates;
const resource = () => ({ id: 'link-draft', type: 'applied-challenge', data: AC.normalize({
  title: 'Garden plan', brief: { context: 'A school garden.', drivingQuestion: 'Which watering plan?', lockedLessonFacts: ['Water enters soil.'] },
  workspace: { workingQuestion: 'Which plan?', response: 'Compare two watering methods.' },
}) });
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('applied_challenge_module.js'); loadAlloModule('studio_response_module.js');
  loadAlloModule('utils_pure_module.js');
  loadAlloModule('doc_pipeline_module.js');
  AC = window.AlloModules.AppliedChallenge; SR = window.AlloModules.StudioResponse;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host?.remove(); sessionStorage.clear(); });
async function click(label) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent === label || node.getAttribute('aria-label') === label);
  expect(button, label).toBeTruthy(); await act(async () => button.click());
}
async function mount(initial) {
  const original = resource(); updates = vi.fn();
  function App() {
    const [responses, setResponses] = React.useState(initial || { [original.id]: { studio: SR.responseFromData(original.type, original.data) } });
    latest = responses; replaceResponses = setResponses;
    return React.createElement(SR.Boundary, {
      View: window.AlloModules.AppliedChallengeView, generatedContent: original, studentResponses: responses,
      studentWorkStatus: 'saved', isTeacherMode: false, activeProfileId: 'learner', allowRuntimeAi: false,
      onResponseChange: (id, studio) => { updates(id, studio); setResponses(previous => ({ ...previous, [id]: { ...previous[id], studio } })); },
    });
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(App))); await click('3. Build');
  const input = host.querySelector('#applied-artifact-url');
  for (let parent = input.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
}
async function type(value) {
  const input = host.querySelector('#applied-artifact-url');
  await act(async () => { input.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const workspace = () => AC._testing.normalizeAppliedChallengeWorkspace(latest['link-draft'].studio.workspace);
describe('Applied work-link drafts survive normal editing and recovery', () => {
  it.each(['https://example.org/my-diagram', 'https://', '  https://example.org/a?x=1  ', 'javascript:alert(1)'])('persists %s before blur and restores it after remount', async draft => {
    await mount(); await type(draft);
    // URL inputs themselves strip surrounding whitespace before firing input.
    const entered = host.querySelector('#applied-artifact-url').value;
    expect(document.activeElement.id).toBe('applied-artifact-url');
    expect(updates).toHaveBeenCalled(); expect(workspace().artifactUrlDraft).toBe(entered);
    expect(latest['link-draft'].studio.workspace).not.toHaveProperty('artifactUrl');
    const persisted = JSON.parse(JSON.stringify(latest));
    await act(async () => root.unmount()); root = null; host.remove();
    await mount(persisted);
    expect(host.querySelector('#applied-artifact-url').value).toBe(entered);
    expect(workspace().artifactUrl).toBe(AC._testing.normalizeAppliedChallengeWorkspace({ artifactUrlDraft: draft }).artifactUrl);
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
  });
  it('keeps each partial keystroke and a deliberate clear, rather than restoring an older link', async () => {
    await mount(); let entered = '';
    for (const character of 'https://example.org/model') { entered += character; await type(entered); expect(workspace().artifactUrlDraft).toBe(entered); }
    expect(workspace().artifactUrl).toBe('https://example.org/model');
    await type(''); expect(workspace().artifactUrlDraft).toBe(''); expect(workspace().artifactUrl).toBe('');
    await act(async () => host.querySelector('#applied-artifact-url').blur());
    expect(workspace().artifactUrl).toBe('');
  });
  it('round-trips partial link drafts in text backup and submission without creating an unsafe URL', async () => {
    await mount(); await type('https://');
    const original = resource();
    const restored = SR.readBackup(original, JSON.parse(SR.serializeBackup(original, latest[original.id].studio)));
    expect(restored.workspace).toMatchObject({ artifactUrlDraft: 'https://' });
    expect(restored.workspace).not.toHaveProperty('artifactUrl');
    const submitted = AC.fromSubmission(original.data, { [original.id]: { studio: restored } }, original.id).data;
    expect(submitted.workspace).toMatchObject({ artifactUrlDraft: 'https://', artifactUrl: '' });
  });
  it('validates separately from saving and removes the warning when corrected', async () => {
    await mount(); await type('https://');
    await act(async () => host.querySelector('#applied-artifact-url').blur());
    expect(workspace().artifactUrlDraft).toBe('https://');
    expect(host.querySelector('#applied-artifact-url').getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#applied-artifact-error').textContent).toContain('complete https:// or http://');
    await type('https://example.org/work');
    expect(workspace().artifactUrl).toBe('https://example.org/work');
    expect(host.querySelector('#applied-artifact-error')).toBeNull();
  });
  it('shows a synchronized response immediately and does not write a stale local value on blur', async () => {
    await mount(); await type('https://example.org/mine');
    const remote = JSON.parse(JSON.stringify(latest)); remote['link-draft'].studio.workspace = { ...workspace(), artifactUrlDraft: 'https://example.org/updated', artifactUrl: 'https://example.org/updated' };
    await act(async () => replaceResponses(remote));
    expect(host.querySelector('#applied-artifact-url').value).toBe('https://example.org/updated');
    const count = updates.mock.calls.length;
    await act(async () => host.querySelector('#applied-artifact-url').blur());
    expect(updates).toHaveBeenCalledTimes(count); expect(workspace().artifactUrl).toBe('https://example.org/updated');
  });
  it('keeps older saved links and bounds raw draft text while rejecting unsafe schemes', () => {
    const normalize = AC._testing.normalizeAppliedChallengeWorkspace;
    const legacy = normalize({ artifactUrl: 'https://example.org/old' });
    expect(legacy).toMatchObject({ artifactUrl: 'https://example.org/old' });
    expect(legacy).not.toHaveProperty('artifactUrlDraft');
    legacy.artifactUrl = 'https://example.org/new';
    expect(normalize(legacy).artifactUrl).toBe('https://example.org/new');
    legacy.artifactUrl = '';
    expect(normalize(legacy).artifactUrl).toBe('');
    const unsafe = normalize({ artifactUrlDraft: 'javascript:alert(1)', artifactUrl: 'https://example.org/old' });
    expect(unsafe.artifactUrl).toBe(''); expect(unsafe.artifactUrlDraft).toBe('javascript:alert(1)');
    expect(normalize({ artifactUrlDraft: 'x'.repeat(2500) }).artifactUrlDraft).toHaveLength(2000);
  });
  it('treats competing complete and partial link edits as one conflict, including the first edit of a legacy link', () => {
    const original = resource(), normalize = AC._testing.normalizeAppliedChallengeWorkspace;
    const response = workspace => SR.responseFromData(original.type, { ...original.data, workspace: normalize(workspace) });
    for (const baseline of [{ artifactUrl: '' }, { artifactUrl: 'https://example.org/old' }, { artifactUrlDraft: 'https://example.org/old' }]) {
      const before = { task: response(baseline) };
      const mine = { task: response({ ...baseline, artifactUrlDraft: 'https://' }) };
      const saved = { task: response({ ...baseline, artifactUrlDraft: 'https://example.org/new' }) };
      const merged = window.AlloModules.UtilsPure.mergeLearnerWorkSnapshots(before, mine, saved);
      expect(merged.conflicts.map(row => row.path)).toEqual([['task', 'workspace', 'artifactUrlDraft']]);
      expect(normalize(merged.snapshot.task.workspace)).toMatchObject({ artifactUrlDraft: 'https://', artifactUrl: '' });
      expect(merged.snapshot.task.workspace).not.toHaveProperty('artifactUrl');
    }
  });
  it.each(['https://example.org/diagram', 'https://', 'javascript:alert(1)'])('exports a %s draft safely when the Applied module is unavailable', draft => {
    const original = resource();
    const data = AC.normalize({ ...original.data, workspace: { ...original.data.workspace, artifactUrlDraft: draft, artifactDescription: 'My linked diagram explanation.' } });
    const submitted = SR.toSubmission(original, SR.responseFromData(original.type, data));
    expect(submitted.data.workspace).not.toHaveProperty('artifactUrl');
    const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast() {}, t: key => key, isRtlLang: () => false, updateExportPreview() {}, getDefaultTitle: () => 'Document', state: {} });
    delete window.AlloModules.AppliedChallenge;
    try {
      const html = pipeline.generateFullPackHTML([{ ...original, data: { ...original.data, ...submitted.data } }], 'My work', true, {}, { includeTeacherKey: false, annotations: [] });
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(doc.body.textContent).toContain('My linked diagram explanation.');
      expect(doc.querySelector('a[href="https://example.org/diagram"]') !== null).toBe(draft === 'https://example.org/diagram');
      expect(doc.querySelector('a[href^="javascript:"]')).toBeNull();
    } finally { window.AlloModules.AppliedChallenge = AC; }
  });
});
