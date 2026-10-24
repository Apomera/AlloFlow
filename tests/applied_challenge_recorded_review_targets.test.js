import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let source, runtime, root, host, latest;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('applied_challenge_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  source = new Function('React', compiled + '\nreturn { View: AppliedChallengeView, normalize: normalizeAppliedChallengeData, appliedChallengeReviewTarget, appliedChallengeReviewItems };')(React);
  loadAlloModule('applied_challenge_module.js');
  runtime = { ...window.AlloModules.AppliedChallenge._testing, View: window.AlloModules.AppliedChallengeView, normalize: window.AlloModules.AppliedChallenge.normalize };
}, 60000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; sessionStorage.clear();
});

const observation = 'The supplied diagram shows less runoff when water is applied slowly.';
const reasoning = 'Keep slow watering because it gives water time to enter the soil.';
const evidence = 'The lesson says water enters soil over time, so slow watering should reduce runoff.';
const cycle = (id, patch = {}) => ({ id, family: 'decide', source: 'self', ...patch });
const laterCycles = () => [cycle('first'), cycle('second', {
  observation: { evidence: observation }, decision: { action: 'keep', reasoning },
})];
const laterRows = () => [
  { id: 'first', claim: 'Try slow watering.', evidence: '' },
  { id: 'second', claim: 'Slow watering uses the lesson idea.', evidence },
];

function seed(api, patch = {}) {
  return api.normalize({
    title: 'Choose a watering plan', family: 'decide', scope: 'standard',
    plan: { learningTarget: 'Apply infiltration.', visualMode: 'organizer' },
    brief: { context: 'Compare two watering plans for the school garden.', drivingQuestion: 'Which plan should we try?',
      lockedLessonFacts: ['Water enters soil over time.'], criteria: ['Use a lesson idea.'], constraints: ['Use the supplied diagrams.'] },
    workspace: { workingQuestion: 'Which watering plan should we try?', questionAccepted: true, response: 'Try slow watering first.' },
    ...patch,
  });
}

async function mount(api, data) {
  function Harness() {
    const [value, setValue] = React.useState(data);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'recorded-review-targets', type: 'applied-challenge', data: value },
      activeProfileId: 'review-targets', isTeacherMode: false, allowRuntimeAi: false,
      callGemini: null, searchWeb: null,
      handleNoteUpdate: (key, change) => setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
  await click('5. Reflect');
  await click('Review my response');
}

async function click(text) {
  const button = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(button, 'button ' + text).toBeTruthy();
  await act(async () => button.click());
}

function reviewButton(label) {
  const button = [...host.querySelectorAll('button.aps-review-item')].find(item => item.firstElementChild?.textContent === label);
  expect(button, 'review item ' + label).toBeTruthy();
  return button;
}

async function openRecorded(label, expectedId, expectedValue) {
  const button = reviewButton(label);
  expect(button.lastElementChild.textContent).toBe('Recorded');
  await act(async () => button.click());
  expect(document.activeElement.id).toBe(expectedId);
  expect(document.activeElement.value).toBe(expectedValue);
  let ancestor = document.activeElement.parentElement;
  while (ancestor && ancestor !== host) {
    if (ancestor.tagName === 'DETAILS') expect(ancestor.open).toBe(true);
    ancestor = ancestor.parentElement;
  }
}

describe.each(['edited source', 'generated runtime'])('Applied recorded review targets: %s', implementation => {
  const api = () => implementation === 'edited source' ? source : runtime;

  it('targets the later check that supplies the recorded observation', () => {
    const data = seed(api(), { validationCycles: laterCycles() });
    expect(api().appliedChallengeReviewItems(data).find(item => item.id === 'check').recorded).toBe(true);
    expect(api().appliedChallengeReviewTarget(data, 'check')).toEqual({ phase: 'testReflection', cycleId: 'second', elementId: 'aps-cycle-observed-second' });
  });

  it('targets the later check that supplies the recorded decision', () => {
    const data = seed(api(), { validationCycles: laterCycles() });
    expect(api().appliedChallengeReviewItems(data).find(item => item.id === 'decision').recorded).toBe(true);
    expect(api().appliedChallengeReviewTarget(data, 'decision')).toEqual({ phase: 'testReflection', cycleId: 'second', elementId: 'aps-cycle-reasoning-second' });
  });

  it('targets the explanatory evidence row instead of an earlier incomplete row', () => {
    const data = seed(api(), { evidenceLedger: laterRows() });
    expect(api().appliedChallengeReviewItems(data).find(item => item.id === 'evidence').recorded).toBe(true);
    expect(api().appliedChallengeReviewTarget(data, 'evidence')).toEqual({ phase: 'possibilities', rowId: 'second', elementId: 'aps-ledger-evidence-second' });
  });

  it('uses the active language to skip a row containing only localized citation metadata', () => {
    const translations = {
      'applied_challenge.search.reference': 'Fuente externa — sin comprobar',
      'applied_challenge.search.found': 'Encontrado el',
    };
    const t = key => translations[key] || '';
    const data = seed(api(), { evidenceLedger: [
      { id: 'citation', claim: 'Compare watering plans.', evidence: 'Fuente externa — sin comprobar: Garden guide\nhttps://example.org/garden\nEncontrado el: 2026-10-21' },
      { id: 'explanation', claim: 'Slow watering uses the lesson idea.', evidence },
    ] });
    expect(api().appliedChallengeReviewTarget(data, 'evidence', undefined, t)).toEqual({ phase: 'possibilities', rowId: 'explanation', elementId: 'aps-ledger-evidence-explanation' });
  });

  it('keeps explicit row and cycle targets even when another item is recorded', () => {
    const data = seed(api(), { validationCycles: laterCycles(), evidenceLedger: laterRows() });
    expect(api().appliedChallengeReviewTarget(data, 'evidence', 'first')).toEqual({ phase: 'possibilities', rowId: 'first', elementId: 'aps-ledger-evidence-first' });
    expect(api().appliedChallengeReviewTarget(data, 'check', 'first')).toEqual({ phase: 'testReflection', cycleId: 'first', elementId: 'aps-cycle-observed-first' });
    expect(api().appliedChallengeReviewTarget(data, 'decision', 'first')).toEqual({ phase: 'testReflection', cycleId: 'first', elementId: 'aps-cycle-decision-first' });
  });

  it('retains the first available field as a destination when no work is recorded', () => {
    const data = seed(api(), { validationCycles: [cycle('first')], evidenceLedger: [{ id: 'first', claim: '', evidence: '' }] });
    expect(api().appliedChallengeReviewTarget(data, 'check').elementId).toBe('aps-cycle-observed-first');
    expect(api().appliedChallengeReviewTarget(data, 'decision').elementId).toBe('aps-cycle-decision-first');
    expect(api().appliedChallengeReviewTarget(data, 'evidence').elementId).toBe('applied-workspace-evidence');
  });

  it.each(['pending', 'decline'])('preserves %s AI check writing without counting hidden fields as current reasoning', async disposition => {
    const data = seed(api(), { validationCycles: [cycle('saved-ai', {
      source: 'ai', disposition, importedChallenge: { challenge: 'Compare runoff in the supplied diagrams.' },
      observation: { evidence: observation }, decision: { action: 'keep', reasoning },
    })] });
    const items = api().appliedChallengeReviewItems(data);
    expect(items.find(item => item.id === 'check').recorded).toBe(false);
    expect(items.find(item => item.id === 'decision').recorded).toBe(false);
    expect(data.validationCycles[0].observation.evidence).toBe(observation);
    expect(data.validationCycles[0].decision.reasoning).toBe(reasoning);
    await mount(api(), data);
    expect(reviewButton('What I checked').lastElementChild.textContent).toBe('Not recorded');
    expect(reviewButton('Keep or revise, and why').lastElementChild.textContent).toBe('Not recorded');
    expect(host.textContent).toContain(observation);
    expect(host.textContent).toContain(reasoning);
    expect(latest.validationCycles[0].observation.evidence).toBe(observation);
    expect(latest.validationCycles[0].decision.reasoning).toBe(reasoning);
  });

  it('accepts an honest note that a check has not happened and opens that note', async () => {
    const untested = 'This check has not been performed. The soil condition remains unknown.';
    const data = seed(api(), { validationCycles: [cycle('first'), cycle('untested', { observation: { evidence: untested } })] });
    await mount(api(), data);
    await openRecorded('What I checked', 'aps-cycle-observed-untested', untested);
  });

  it('opens the recorded later observation through the actual review item', async () => {
    await mount(api(), seed(api(), { validationCycles: laterCycles() }));
    await openRecorded('What I checked', 'aps-cycle-observed-second', observation);
  });

  it('opens the recorded later decision through the actual review item', async () => {
    await mount(api(), seed(api(), { validationCycles: laterCycles() }));
    await openRecorded('Keep or revise, and why', 'aps-cycle-reasoning-second', reasoning);
  });

  it('opens the recorded later lesson connection through the actual review item', async () => {
    await mount(api(), seed(api(), { evidenceLedger: laterRows() }));
    await openRecorded('Lesson connection', 'aps-ledger-evidence-second', evidence);
  });

  it('lets the explicit edit-row action open the earlier incomplete row', async () => {
    await mount(api(), seed(api(), { evidenceLedger: laterRows() }));
    await click('Edit evidence row 1');
    expect(document.activeElement.id).toBe('aps-ledger-evidence-first');
    expect(document.activeElement.value).toBe('');
  });

  it('lets the explicit edit-check action open the earlier blank check', async () => {
    await mount(api(), seed(api(), { validationCycles: laterCycles() }));
    await click('Edit check 1');
    expect(document.activeElement.id).toBe('aps-cycle-observed-first');
    expect(document.activeElement.value).toBe('');
  });
});
