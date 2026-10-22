import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let source, runtime, root, host, latest, replaceData, writes;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('applied_challenge_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  source = new Function('React', compiled + '\nreturn { View: AppliedChallengeView, normalize: normalizeAppliedChallengeData, exportModel: appliedChallengeExportModel, renderPreset: renderAppliedChallengePreset, appliedChallengeReviewTarget, appliedChallengeHashText, appliedReasoningSource, appliedReasoningReferenceState };')(React);
  loadAlloModule('applied_challenge_module.js');
  runtime = { ...window.AlloModules.AppliedChallenge._testing, View: window.AlloModules.AppliedChallengeView, normalize: window.AlloModules.AppliedChallenge.normalize, exportModel: window.AlloModules.AppliedChallenge.exportModel, renderPreset: window.AlloModules.AppliedChallenge.renderPreset };
}, 60000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; sessionStorage.clear();
});

const explanation = 'The lesson says water takes time to enter the soil, so slower watering should reduce runoff.';
function seed(api, patch = {}) {
  return api.normalize({
    title: 'Watering choices', family: 'decide', scope: 'standard',
    plan: { visualMode: 'none' },
    brief: { context: 'Choose a watering plan for the school garden.', drivingQuestion: 'Which plan should we try?',
      lockedLessonFacts: ['Water enters soil over time.'], criteria: ['Connect the lesson idea.'] },
    workspace: { workingQuestion: 'Which plan should we try?', questionAccepted: true, response: 'Try slower watering.' },
    evidenceLedger: [{ id: 'saved-row', claim: 'Slower watering', evidence: explanation, tradeoff: 'It may take longer.' }],
    sourceRecords: [{ id: 'saved-source', url: 'https://example.org/soil', rowId: 'saved-row', title: 'Soil notes', reviewNote: 'The guide discusses infiltration but our local soil remains unchecked.' }],
    ...patch,
  });
}

async function mount(api, data) {
  writes = [];
  function Harness() {
    const [value, setValue] = React.useState(data);
    latest = value; replaceData = setValue;
    return React.createElement(api.View, {
      generatedContent: { id: 'saved-organizer-access', type: 'applied-challenge', data: value },
      activeProfileId: 'saved-organizer-learner', isTeacherMode: false, allowRuntimeAi: false,
      callGemini: null, searchWeb: null,
      handleNoteUpdate: (key, change) => { writes.push(key); setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })); },
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}

async function click(text) {
  const button = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(button, 'button ' + text).toBeTruthy();
  await act(async () => button.click());
}
async function review() { await click('5. Reflect'); await click('Review my response'); }
function expectFocusedRow(id, value) {
  expect(document.activeElement.id).toBe('aps-ledger-evidence-' + id);
  expect(document.activeElement.value).toBe(value);
  let ancestor = document.activeElement.parentElement;
  while (ancestor && ancestor !== host) {
    if (ancestor.tagName === 'DETAILS') expect(ancestor.open).toBe(true);
    expect(ancestor.hidden).toBe(false);
    ancestor = ancestor.parentElement;
  }
}
async function type(id, value) {
  const textarea = host.querySelector('#' + id);
  expect(textarea, id).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe.each(['edited source', 'generated runtime'])('Applied saved organizer access: %s', implementation => {
  const api = () => implementation === 'edited source' ? source : runtime;

  it('keeps a saved row as the recorded lesson-connection destination when no organizer is offered', () => {
    const data = seed(api());
    expect(api().appliedChallengeReviewTarget(data, 'evidence')).toEqual({ phase: 'possibilities', rowId: 'saved-row', elementId: 'aps-ledger-evidence-saved-row' });
    expect(api().appliedChallengeReviewTarget(data, 'evidence', 'saved-row')).toEqual({ phase: 'possibilities', rowId: 'saved-row', elementId: 'aps-ledger-evidence-saved-row' });
  });

  it('opens the saved row from the actual recorded review item and explicit edit action', async () => {
    await mount(api(), seed(api())); await review();
    const item = [...host.querySelectorAll('button.aps-review-item')].find(button => button.firstElementChild?.textContent === 'Lesson connection');
    expect(item?.lastElementChild.textContent).toBe('Recorded');
    await act(async () => item.click());
    expectFocusedRow('saved-row', explanation);
    await click('Return to my review'); await click('Edit evidence row 1');
    expectFocusedRow('saved-row', explanation);
  });

  it('honors an exact saved reasoning reference to a later row even when the organizer setting is off', async () => {
    const data = seed(api(), { evidenceLedger: [
      { id: 'first-row', claim: 'Compare a second plan', evidence: 'This first explanation is also recorded.' },
      { id: 'saved-row', claim: 'Slower watering', evidence: explanation, tradeoff: 'It may take longer.' },
    ] });
    const reference = { part: 'evidence', source: 'ledger', rowId: 'saved-row', location: 'The comparison of soil infiltration and runoff.' };
    data.reasoningReferences = [{ ...reference, referenceFingerprint: api().appliedChallengeHashText(api().appliedReasoningSource(data, reference)) }];
    expect(api().appliedReasoningReferenceState(data, 'evidence').current).toBe(true);
    expect(api().appliedChallengeReviewTarget(data, 'evidence').elementId).toBe('aps-ledger-evidence-saved-row');
    await mount(api(), data); await review();
    const item = [...host.querySelectorAll('button.aps-review-item')].find(button => button.firstElementChild?.textContent === 'Lesson connection');
    expect(item?.textContent).toContain('Pointed to in my evidence notes');
    await act(async () => item.click()); expectFocusedRow('saved-row', explanation);
  });

  it('retains editable saved work when the teacher switches the organizer off and preserves its related data', async () => {
    const data = seed(api(), { plan: { visualMode: 'organizer' } });
    const reference = { part: 'decision', source: 'ledger', rowId: 'saved-row', location: 'The comparison notes.' };
    data.reasoningReferences = [{ ...reference, referenceFingerprint: api().appliedChallengeHashText(api().appliedReasoningSource(data, reference)) }];
    await mount(api(), data); await click('2. Explore');
    await act(async () => replaceData(old => ({ ...old, plan: { ...old.plan, visualMode: 'none' } })));
    const input = host.querySelector('#aps-ledger-evidence-saved-row'); expect(input).toBeTruthy();
    const changed = explanation + ' I still need to check the local soil.';
    await type('aps-ledger-evidence-saved-row', changed);
    const saved = api().normalize(latest);
    expect(saved.evidenceLedger).toHaveLength(1);
    expect(saved.evidenceLedger[0]).toEqual({ ...data.evidenceLedger[0], evidence: changed });
    expect(saved.sourceRecords).toEqual(data.sourceRecords);
    expect(saved.reasoningReferences).toEqual(data.reasoningReferences);
    expect(saved.workspace).toEqual(data.workspace);
    expect(saved.plan.visualMode).toBe('none');
  });

  it('lets a removed saved row be restored and edited while the organizer setting remains off', async () => {
    const data = seed(api()); await mount(api(), data); await review(); await click('Edit evidence row 1');
    await click('Remove evidence row 1');
    expect(api().normalize(latest).evidenceLedger).toHaveLength(0);
    await click('Undo last change');
    expect(document.activeElement.id).toBe('aps-ledger-claim-saved-row');
    expect(document.activeElement.value).toBe(data.evidenceLedger[0].claim);
    let ancestor = document.activeElement.parentElement;
    while (ancestor && ancestor !== host) {
      if (ancestor.tagName === 'DETAILS') expect(ancestor.open).toBe(true);
      expect(ancestor.hidden).toBe(false);
      ancestor = ancestor.parentElement;
    }
    const evidence = host.querySelector('#aps-ledger-evidence-saved-row');
    expect(evidence?.value).toBe(explanation);
    await act(async () => evidence.focus());
    expectFocusedRow('saved-row', explanation);
    expect(api().normalize(latest).evidenceLedger).toEqual(data.evidenceLedger);
    expect(api().normalize(latest).sourceRecords).toEqual(data.sourceRecords);
    expect(api().normalize(latest).plan.visualMode).toBe('none');
  });

  it('keeps a fresh no-organizer task free of an empty evidence organizer', async () => {
    await mount(api(), seed(api(), { evidenceLedger: [], sourceRecords: [] })); await click('2. Explore');
    expect(host.querySelector('#evidence-ledger-heading')).toBeNull();
    expect(host.querySelector('#applied-ledger-body')).toBeNull();
    expect([...host.querySelectorAll('button')].some(button => button.textContent.trim() === 'Add evidence row')).toBe(false);
    expect(host.querySelector('#applied-workspace-evidence')).toBeTruthy();
  });

  it('keeps populated optional writing editable and in the review after the teacher chooses compact depth', async () => {
    const data = seed(api());
    data.workspace.stakeholders = 'The garden club needs a plan it can carry out during the school day.';
    data.workspace.assumptions = 'I assume the garden soil absorbs water at the same rate as the lesson sample.';
    await mount(api(), data);
    await act(async () => replaceData(old => ({ ...old, scope: 'compact' })));
    expect(writes).toEqual([]);
    expect(host.querySelector('#applied-workspace-stakeholders')?.value).toBe(data.workspace.stakeholders);
    const revisedPeople = data.workspace.stakeholders + ' The caretaker also needs access.';
    await type('applied-workspace-stakeholders', revisedPeople);
    await click('2. Explore');
    expect(host.querySelector('#applied-workspace-assumptions')?.value).toBe(data.workspace.assumptions);
    const revisedAssumption = data.workspace.assumptions + ' This needs a local check.';
    await type('applied-workspace-assumptions', revisedAssumption);
    const saved = api().normalize(latest);
    expect(saved.scope).toBe('compact');
    expect(saved.workspace.stakeholders).toBe(revisedPeople);
    expect(saved.workspace.assumptions).toBe(revisedAssumption);
    expect(saved.evidenceLedger).toEqual(data.evidenceLedger);
    expect(saved.sourceRecords).toEqual(data.sourceRecords);
    await review();
    expect(host.textContent).toContain(revisedPeople);
    expect(host.textContent).toContain(revisedAssumption);
  });

  it('includes saved compact optional writing in response exports and keeps new task copies compact', () => {
    const data = seed(api(), { scope: 'compact' });
    data.workspace.stakeholders = 'The garden club and caretaker need compatible access.';
    data.workspace.assumptions = 'The local soil may differ from the lesson sample.';
    for (const preset of ['response', 'teacher', 'full']) {
      const model = api().exportModel(data, { preset });
      expect(model.phases.find(phase => phase.id === 'stakeholders')?.text).toBe(data.workspace.stakeholders);
      expect(model.phases.find(phase => phase.id === 'assumptions')?.text).toBe(data.workspace.assumptions);
    }
    for (const preset of ['response', 'teacher']) {
      const html = api().renderPreset(data, preset);
      const text = new DOMParser().parseFromString(html, 'text/html').body.textContent;
      expect(text).toContain(data.workspace.stakeholders);
      expect(text).toContain(data.workspace.assumptions);
    }
    for (const preset of ['task', 'paper']) {
      const model = api().exportModel(data, { preset });
      expect(model.phases.some(phase => ['stakeholders', 'assumptions'].includes(phase.id))).toBe(false);
      const text = new DOMParser().parseFromString(api().renderPreset(data, preset), 'text/html').body.textContent;
      expect(text).not.toContain(data.workspace.stakeholders);
      expect(text).not.toContain(data.workspace.assumptions);
    }
  });

  it('offers no empty optional sections for a fresh compact task', async () => {
    const data = seed(api(), { scope: 'compact' });
    await mount(api(), data);
    expect(host.querySelector('#applied-workspace-stakeholders')).toBeNull();
    await click('2. Explore');
    expect(host.querySelector('#applied-workspace-assumptions')).toBeNull();
    expect(api().exportModel(data, { preset: 'response' }).phases.some(phase => ['stakeholders', 'assumptions'].includes(phase.id))).toBe(false);
    expect(writes).toEqual([]);
  });

  it('keeps a previously populated compact field focused while the learner clears it to rewrite', async () => {
    const data = seed(api(), { scope: 'compact' });
    data.workspace.assumptions = 'I assume the lesson soil sample represents our garden soil.';
    await mount(api(), data); await click('2. Explore');
    const textarea = host.querySelector('#applied-workspace-assumptions');
    expect(textarea).toBeTruthy();
    await act(async () => {
      for (let parent = textarea.parentElement; parent && parent !== host; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS') parent.open = true;
      }
      textarea.focus();
    });
    expect(document.activeElement).toBe(textarea);
    await type('applied-workspace-assumptions', '');
    expect(host.querySelector('#applied-workspace-assumptions')).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(api().normalize(latest).workspace.assumptions).toBe('');
    const replacement = 'The soil may absorb water differently, so I need a local check.';
    await type('applied-workspace-assumptions', replacement);
    expect(textarea.value).toBe(replacement);
    expect(api().normalize(latest).workspace.assumptions).toBe(replacement);

    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    const reloaded = api().normalize({ ...data, workspace: { ...data.workspace, assumptions: '' } });
    await mount(api(), reloaded); await click('2. Explore');
    expect(host.querySelector('#applied-workspace-assumptions')).toBeNull();
  });
});
