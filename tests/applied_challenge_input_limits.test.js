import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let source, runtime, host, root, latest;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('applied_challenge_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  source = new Function('React', compiled + '\nreturn { View: AppliedChallengeView, normalize: normalizeAppliedChallengeData };')(React);
  loadAlloModule('applied_challenge_module.js');
  runtime = { View: window.AlloModules.AppliedChallengeView, normalize: window.AlloModules.AppliedChallenge.normalize };
}, 60000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; sessionStorage.clear();
});

async function mount(api, ai = false) {
  const initial = api.normalize({
    title: 'Compare a school garden plan', family: 'decide', scope: 'standard',
    brief: { context: 'Compare two watering options.', drivingQuestion: 'Which plan should we choose?', lockedLessonFacts: ['Water soaks into soil.'] },
    workspace: { workingQuestion: 'Which plan should we choose?', response: 'Compare two options using how soil absorbs water.' },
    evidenceLedger: [{ id: 'row', claim: '', evidence: '', tradeoff: '' }],
    validationCycles: [{ id: 'check', source: ai ? 'ai' : 'self', disposition: ai ? 'adapt' : 'use' }],
  });
  function App() {
    const [value, setValue] = React.useState(initial);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'input-limits', type: 'applied-challenge', data: value },
      isTeacherMode: false, activeProfileId: 'input-limits', allowRuntimeAi: false,
      handleNoteUpdate: (key, change) => setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(App)));
}

async function stage(number) {
  const button = host.querySelector('button[aria-label^="' + number + '. "]');
  expect(button).toBeTruthy();
  await act(async () => button.click());
  for (const details of host.querySelectorAll('details')) details.open = true;
}

async function enter(textarea, text) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const fields = [
  { name: 'Evidence row 1 claim, option, or position', stage: 2, max: 1800, read: data => data.evidenceLedger[0].claim },
  { name: 'Evidence row 1 evidence or lesson connection', stage: 2, max: 2200, read: data => data.evidenceLedger[0].evidence },
  { name: 'Evidence row 1 tradeoff, constraint, or uncertainty', stage: 2, max: 1800, read: data => data.evidenceLedger[0].tradeoff },
  { name: 'Check 1 reason for AI challenge choice', stage: 4, max: 1600, ai: true, read: data => data.validationCycles[0].dispositionReason },
  { name: 'Check 1 test question', stage: 4, max: 2000, read: data => data.validationCycles[0].plan.testQuestion },
  { name: 'Check 1 criterion or constraint', stage: 4, max: 1400, read: data => data.validationCycles[0].plan.criterion },
  { name: 'Check 1 expected finding', stage: 4, max: 1600, read: data => data.validationCycles[0].plan.expectedFinding },
  { name: 'Check 1 change threshold', stage: 4, max: 1800, read: data => data.validationCycles[0].plan.changeThreshold },
  { name: 'Check 1 observed evidence', stage: 4, max: 4000, read: data => data.validationCycles[0].observation.evidence },
  { name: 'Check 1 decision reasoning', stage: 4, max: 3000, read: data => data.validationCycles[0].decision.reasoning },
  { name: 'Check 1 revision summary', stage: 4, max: 2200, read: data => data.validationCycles[0].decision.revisionSummary },
  { name: 'Check 1 next step', stage: 4, max: 1800, read: data => data.validationCycles[0].decision.nextStep },
];

describe.each(['edited source', 'generated runtime'])('Applied learner writing capacity: %s', implementation => {
  it.each(fields)('protects existing writing at the supported capacity for $name', async field => {
    const api = implementation === 'edited source' ? source : runtime;
    await mount(api, field.ai); await stage(field.stage);
    const textarea = [...host.querySelectorAll('textarea')].find(node => node.getAttribute('aria-label') === field.name);
    expect(textarea, field.name).toBeTruthy();
    // A native bound prevents an insertion into a full field from silently
    // displacing saved suffix text when the controlled normalizer runs.
    expect(textarea.maxLength).toBe(field.max);
    const full = 'Beginning ' + 'x'.repeat(field.max - 'Beginning '.length - ' retained ending'.length) + ' retained ending';
    await enter(textarea, full);
    expect(field.read(latest)).toBe(full);
    expect(textarea.value).toBe(full);
    // Deleting a selection still leaves capacity for a normal replacement.
    const revised = full.slice(0, 20) + 'my edit' + full.slice(40);
    await enter(textarea, revised);
    expect(field.read(latest)).toBe(revised);
    expect(textarea.value).toBe(revised);
    expect(textarea.value.endsWith(' retained ending')).toBe(true);
  });
});
