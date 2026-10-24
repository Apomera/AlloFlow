import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let sourceApi, runtimeApi, root, host, latest, toasts;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('applied_challenge_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  sourceApi = new Function('React', compiled + `\nreturn {
    View: AppliedChallengeView, normalize: normalizeAppliedChallengeData,
    parse: parseAppliedChallengeFeedback, finalize: finalizeAppliedChallengeFeedback,
    progress: appliedChallengeValidationCycleProgress
  };`)(React);
  loadAlloModule('applied_challenge_module.js');
  const runtime = window.AlloModules.AppliedChallenge;
  runtimeApi = {
    View: window.AlloModules.AppliedChallengeView, normalize: runtime.normalize,
    parse: runtime._testing.parseAppliedChallengeFeedback,
    finalize: runtime._testing.finalizeAppliedChallengeFeedback,
    progress: runtime._testing.appliedChallengeValidationCycleProgress,
  };
}, 30000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  sessionStorage.clear();
});

function seed(api, patch = {}) {
  return api.normalize({
    title: 'Watering options', family: 'decide', scope: 'standard',
    sourceExcerpt: 'Water can soak into soil.', lessonRef: { gradeLevel: '5th Grade' },
    brief: { drivingQuestion: 'Which watering option?', lockedLessonFacts: ['Water can soak into soil.'], factVerified: true },
    workspace: { workingQuestion: 'Which watering option?', questionAccepted: true, response: 'I will compare two watering options.' },
    ...patch,
  });
}

async function mount(api, data, callGemini = null) {
  toasts = [];
  function Harness() {
    const [value, setValue] = React.useState(data);
    latest = value;
    return React.createElement(api.View, {
      generatedContent: { id: 'input-feedback-integrity', type: 'applied-challenge', data: value },
      isTeacherMode: false, activeProfileId: 'integrity', allowRuntimeAi: !!callGemini,
      callGemini, searchWeb: null, addToast: (...args) => toasts.push(args),
      handleNoteUpdate: (key, change) => setValue(old => ({ ...old, [key]: typeof change === 'function' ? change(old[key]) : change })),
    });
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
  await click('4. Check');
}

async function click(name) {
  const button = [...host.querySelectorAll('button')].find(el => el.textContent === name || el.getAttribute('aria-label') === name);
  expect(button, 'button ' + name).toBeTruthy();
  await act(async () => button.click());
}

async function typeCharacters(el, text) {
  for (const character of text) {
    const expected = el.value + character;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, expected);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(el.value).toBe(expected);
  }
}

describe.each(['edited source', 'generated runtime'])('Applied input and feedback integrity: %s', implementation => {
  const api = () => implementation === 'edited source' ? sourceApi : runtimeApi;

  it('keeps spaces and line breaks while typing every validation prose field and after navigation', async () => {
    await mount(api(), seed(api(), { validationCycles: [{ id: 'c1', source: 'ai', disposition: 'use' }] }));
    const fields = [
      ['reason for AI challenge choice', 'dispositionReason'],
      ['test question', 'plan.testQuestion'], ['criterion or constraint', 'plan.criterion'],
      ['expected finding', 'plan.expectedFinding'], ['change threshold', 'plan.changeThreshold'],
      ['observed evidence', 'observation.evidence'], ['decision reasoning', 'decision.reasoning'],
      ['revision summary', 'decision.revisionSummary'], ['next step', 'decision.nextStep'],
    ];
    const prose = ' Two options\nNext line ';
    for (const [label, field] of fields) {
      const el = host.querySelector('textarea[aria-label="Check 1 ' + label + '"]');
      expect(el, field).toBeTruthy();
      await typeCharacters(el, prose);
      expect(field.split('.').reduce((value, part) => value[part], latest.validationCycles[0])).toBe(prose);
    }
    await click('3. Build');
    await click('4. Check');
    for (const [label] of fields) expect(host.querySelector('textarea[aria-label="Check 1 ' + label + '"]').value).toBe(prose);
  }, 15000);

  it('keeps whitespace-only validation text incomplete', () => {
    const cycle = seed(api(), { validationCycles: [{
      id: 'c1', source: 'ai', disposition: 'use', dispositionReason: ' \n ',
      plan: { testQuestion: ' \n ', changeThreshold: ' ' },
      observation: { evidence: '\n', outcome: 'mixed' }, decision: { action: 'keep', reasoning: ' ' },
    }] }).validationCycles[0];
    expect(cycle.dispositionReason).toBe(' \n ');
    expect(api().progress(cycle, 'decide')).toMatchObject({ complete: false, stage: 'review' });
    expect(api().progress({ ...cycle, source: 'self' }, 'decide')).toMatchObject({ complete: false, stage: 'plan' });
  });

  it.each([undefined, null, '', ' \n ', {}, { status: 'grounded' }, '{}', '{"strength":', '[]', 'null', 'Coach note: {"strength":', 'Coach note: ['])('rejects unusable feedback without inventing a review (%j)', raw => {
    expect(api().parse(raw)).toBeNull();
    expect(api().finalize(raw, seed(api()))).toBeNull();
  });

  it('retains returned prose only as coaching without inventing a strength or lesson assessment', () => {
    const prose = 'Compare the two options using the same criterion.';
    expect(api().parse(prose)).toMatchObject({ nextStep: prose, strength: '', lessonConnectionCheck: '', evidenceOrConstraintCheck: '', question: '', status: 'developing' });
    expect(api().parse('Coach note: {"nextStep":"Check the local soil.","status":"developing"}').nextStep).toBe('Check the local soil.');
  });

  it.each(['', '{}', '{"strength":'])('preserves earlier feedback after an unusable reply and allows a successful retry (%j)', async invalid => {
    const valid = { strength: 'You identify two options.', nextStep: 'Compare both options using infiltration.', status: 'developing' };
    const callGemini = vi.fn().mockResolvedValueOnce(invalid).mockResolvedValueOnce(valid);
    const data = seed(api(), { feedback: { strength: 'Earlier saved review.', nextStep: 'Earlier next step.', status: 'developing', createdAt: 'saved-before-retry' } });
    await mount(api(), data, callGemini);
    const earlier = structuredClone(latest.feedback);
    await click('Get strengths-first AI feedback');
    expect(latest.feedback).toEqual(earlier);
    expect(host.textContent).toContain('Earlier saved review.');
    expect(host.textContent).not.toContain('You developed a response connected to the challenge.');
    expect(toasts).toHaveLength(1);
    expect(toasts[0][0]).toContain('Try again.');
    expect(toasts[0][1]).toBe('error');
    const retry = [...host.querySelectorAll('button')].find(el => el.textContent === 'Get strengths-first AI feedback');
    expect(retry.disabled).toBe(false);
    await click('Get strengths-first AI feedback');
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(latest.feedback).toMatchObject(valid);
    expect(latest.feedback.createdAt).not.toBe('saved-before-retry');
    expect(toasts[1][1]).toBe('success');
  });

  it('does not create a feedback panel when no earlier review exists and the reply is empty', async () => {
    await mount(api(), seed(api()), vi.fn().mockResolvedValue(''));
    await click('Get strengths-first AI feedback');
    expect(latest.feedback).toBeNull();
    expect(host.querySelector('[aria-label="AI feedback"]')).toBeNull();
    expect(toasts.map(toast => toast[1])).toEqual(['error']);
  });
});
