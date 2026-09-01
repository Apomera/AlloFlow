import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let AppliedChallengeView;
let root;
let host;
let latest;
let toasts;
let setGeneratedContentForTest;

const baseData = () => ({
  schemaVersion: 1,
  title: 'Water Access Decision',
  instructions: 'Use evidence and revise your reasoning.',
  selectionMode: 'manual',
  family: 'decide',
  agencyMode: 'co-framed',
  scope: 'standard',
  brief: {
    drivingQuestion: 'Which option best balances access and impact?',
    seedDirection: 'Compare at least two defensible options.',
    lockedLessonFacts: ['Gravity moves water downhill.'],
    openQuestions: ['Which sites are feasible?'],
    criteria: ['Use lesson evidence.'],
    constraints: ['Do not invent local findings.'],
    deliverable: 'A recommendation and revision note.',
    factLocked: true,
  },
  supports: {
    frameStarter: 'Option ___ is stronger because ___.',
    coachPrompts: ['What evidence supports the choice?'],
  },
  workspace: {
    workingQuestion: 'Which option best balances access and impact?',
    response: '',
  },
  coachHint: 'An earlier hint',
  feedback: {
    strength: 'An earlier strength',
    lessonConnectionCheck: 'Earlier lesson check',
    evidenceOrConstraintCheck: 'Earlier evidence check',
    nextStep: 'Earlier next step',
    status: 'developing',
  },
});

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('applied_challenge_module.js');
  AppliedChallengeView = window.AlloModules.AppliedChallengeView;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  latest = null;
  toasts = [];
  setGeneratedContentForTest = null;
});

async function renderChallenge(options = {}) {
  const initial = { type: 'applied-challenge', id: options.id || 'challenge-1', data: options.data || baseData() };
  toasts = [];
  function Harness() {
    const [generatedContent, setGeneratedContent] = React.useState(initial);
    setGeneratedContentForTest = setGeneratedContent;
    latest = generatedContent;
    const handleNoteUpdate = React.useCallback((key, value) => {
      setGeneratedContent((previous) => {
        if (!previous || !['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge'].includes(previous.type)) return previous;
        const nextValue = typeof value === 'function' ? value(previous.data ? previous.data[key] : undefined) : value;
        return { ...previous, data: { ...(previous.data || {}), [key]: nextValue } };
      });
    }, []);
    return React.createElement(AppliedChallengeView, {
      generatedContent,
      handleNoteUpdate,
      isTeacherMode: options.teacher === true,
      isProcessing: false,
      callGemini: options.callGemini || null,
      addToast: (message, kind) => toasts.push({ message, kind }),
      gradeLevel: '8th Grade',
    });
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
}

async function replaceChallenge(id, data) {
  await act(async () => {
    setGeneratedContentForTest({ type: 'applied-challenge', id, data });
    await Promise.resolve();
  });
}

async function typeInto(node, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, value);
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function chooseOption(node, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, value);
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

async function clickButton(label) {
  const button = Array.from(host.querySelectorAll('button')).find((item) => item.textContent.includes(label));
  expect(button, label).toBeTruthy();
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('Applied Challenge Studio interactions', () => {
  it('has no serious or critical structural accessibility violations', async () => {
    await renderChallenge();
    const results = await axe.run(host, { rules: {
      'color-contrast': { enabled: false },
    } });
    const serious = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => violation.id + ': ' + violation.help);
    expect(serious).toEqual([]);
  });

  it('persists workspace edits, clears stale coaching, and updates sections started', async () => {
    await renderChallenge();
    const response = host.querySelector('#applied-workspace-response');
    await typeInto(response, 'Recommend a feasibility study before choosing a site.');
    expect(latest.data.workspace.response).toContain('feasibility study');
    expect(latest.data.coachHint).toBe('');
    expect(latest.data.feedback).toBeNull();
    expect(host.textContent).toContain('2 of 10 sections started');
  });

  it('adds, labels, persists, summarizes, and removes evidence ledger rows', async () => {
    await renderChallenge();
    await clickButton('Add evidence row');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    expect(latest.data.coachHint).toBe('');
    expect(latest.data.feedback).toBeNull();

    await typeInto(host.querySelector('[aria-label="Evidence row 1 claim, option, or position"]'), 'A gravity-fed route is worth testing.');
    await typeInto(host.querySelector('[aria-label="Evidence row 1 evidence or lesson connection"]'), 'The lesson explains that gravity moves water downhill.');
    await chooseOption(host.querySelector('[aria-label="Evidence row 1 status"]'), 'assumption');
    await typeInto(host.querySelector('[aria-label="Evidence row 1 tradeoff, constraint, or uncertainty"]'), 'The local slope has not been measured.');

    expect(latest.data.evidenceLedger[0]).toMatchObject({
      claim: 'A gravity-fed route is worth testing.',
      evidence: 'The lesson explains that gravity moves water downhill.',
      status: 'assumption',
      tradeoff: 'The local slope has not been measured.',
    });
    expect(host.textContent).toContain('1 of 1 rows have both a claim and support');
    expect(host.textContent).toContain('1 assumption');

    const verifiedOption = host.querySelector('[aria-label="Evidence row 1 status"] option[value="verified"]');
    expect(verifiedOption.disabled).toBe(true);
    await clickButton('Remove evidence row 1');
    expect(latest.data.evidenceLedger).toEqual([]);
    expect(host.textContent).toContain('No ledger rows yet');
  });

  it('requires the teacher to unlock lesson facts before editing them', async () => {
    await renderChallenge({ teacher: true });
    await clickButton('Edit challenge');
    let facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(true);
    await clickButton('Unlock facts to edit');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(false);
    await typeInto(facts, 'Updated lesson fact.');
    expect(latest.data.brief.lockedLessonFacts).toEqual(['Updated lesson fact.']);
    expect(latest.data.brief.factVerified).toBe(false);
    await clickButton('Lock lesson facts');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(true);
    await clickButton('Mark facts teacher verified');
    expect(latest.data.brief.factVerified).toBe(true);
    expect(host.textContent).toContain('Teacher-verified lesson facts');
    await clickButton('Unlock facts to edit');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    await typeInto(facts, 'A later fact revision.');
    expect(latest.data.brief.factVerified).toBe(false);
  });

  it('returns verified ledger evidence to needs-check when a teacher changes lesson facts', async () => {
    const data = baseData();
    data.brief.factVerified = true;
    data.evidenceLedger = [{
      id: 'verified-row',
      claim: 'Gravity supports the route.',
      evidence: 'Gravity moves water downhill.',
      status: 'verified',
      tradeoff: 'The site slope is still unknown.',
    }];
    await renderChallenge({ teacher: true, data });
    expect(latest.data.evidenceLedger[0].status).toBe('verified');
    await clickButton('Edit challenge');
    await clickButton('Unlock facts to edit');
    const facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    await typeInto(facts, 'Revised lesson fact requiring a new evidence connection.');
    expect(latest.data.brief.factVerified).toBe(false);
    expect(latest.data.evidenceLedger[0].status).toBe('needs-check');
  });

  it('persists a complete student-owned Test–Observe–Decide cycle without changing the draft', async () => {
    const data = baseData();
    data.workspace.response = 'Recommend a measured pilot before committing to a full route.';
    await renderChallenge({ data });
    const originalResponse = latest.data.workspace.response;
    await clickButton('Start my own check');
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.feedback).toBeNull();

    await typeInto(host.querySelector('[aria-label="Check 1 test question"]'), 'Can the pilot satisfy the access criterion within the staffing limit?');
    await typeInto(host.querySelector('[aria-label="Check 1 change threshold"]'), 'Revise if one required shift remains uncovered.');
    await chooseOption(host.querySelector('[aria-label="Check 1 evidence form"]'), 'data');
    await chooseOption(host.querySelector('[aria-label="Check 1 outcome"]'), 'mixed');
    await typeInto(host.querySelector('[aria-label="Check 1 observed evidence"]'), 'The schedule covers weekdays but leaves one weekend shift open.');
    await chooseOption(host.querySelector('[aria-label="Check 1 decision"]'), 'revise');
    await typeInto(host.querySelector('[aria-label="Check 1 decision reasoning"]'), 'The evidence supports a smaller weekday pilot while weekend staffing is investigated.');
    await typeInto(host.querySelector('[aria-label="Check 1 revision summary"]'), 'Narrowed the first phase to weekdays.');

    expect(latest.data.workspace.response).toBe(originalResponse);
    expect(latest.data.validationCycles[0]).toMatchObject({
      source: 'self',
      plan: {
        methodId: 'strongest-alternative',
        evidenceMode: 'data',
        testQuestion: 'Can the pilot satisfy the access criterion within the staffing limit?',
      },
      observation: {
        outcome: 'mixed',
        evidence: 'The schedule covers weekdays but leaves one weekend shift open.',
      },
      decision: {
        action: 'revise',
        revisionSummary: 'Narrowed the first phase to weekdays.',
      },
    });
    expect(latest.data.validationCycles[0].completedAt).toBeTruthy();
    expect(host.textContent).toContain('1 of 1 checks complete');

    const results = await axe.run(host, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  });

  it('saves one pressure test separately and marks it when the draft changes', async () => {
    const callGemini = vi.fn(async () => JSON.stringify({
      challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      whyItMatters: 'The recommendation depends on a condition that has not been measured.',
      question: 'What evidence or fallback would make the recommendation more resilient?',
    }));
    const data = baseData();
    data.workspace.response = 'Recommend a gravity-fed route after a site feasibility check.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ data, callGemini });
    await clickButton('Stress-test my draft');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('strongest alternative, a neglected tradeoff');
    expect(latest.data.workspace.response).toContain('gravity-fed route');
    expect(latest.data.stressTest).toMatchObject({
      challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      whyItMatters: 'The recommendation depends on a condition that has not been measured.',
      question: 'What evidence or fallback would make the recommendation more resilient?',
    });
    expect(latest.data.stressTest.draftFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(latest.data.stressTest.contextFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(host.textContent).toContain('Current draft');

    await clickButton('Use this pressure point in a check');
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.validationCycles[0]).toMatchObject({
      source: 'ai',
      disposition: 'pending',
      importedChallenge: {
        challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      },
    });
    await chooseOption(host.querySelector('[aria-label="Check 1 AI challenge choice"]'), 'decline');
    await typeInto(host.querySelector('[aria-label="Check 1 reason for AI challenge choice"]'), 'The pressure point assumes a route type that my revised criteria already exclude.');
    expect(latest.data.validationCycles[0].completedAt).toBeTruthy();
    const preservedCycleId = latest.data.validationCycles[0].id;
    await clickButton('Refresh stress test');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.validationCycles[0].id).toBe(preservedCycleId);

    await typeInto(host.querySelector('#applied-workspace-response'), 'Recommend a measured pilot route with a non-gravity fallback.');
    expect(latest.data.stressTest.challenge).toContain('insufficient slope');
    expect(host.textContent).toContain('Created for an earlier draft');
    expect(host.textContent).toContain('Save it in a check');
  });

  it('discards feedback created for a draft that changed while AI was responding', async () => {
    let resolveFeedback;
    const callGemini = vi.fn(() => new Promise((resolvePromise) => { resolveFeedback = resolvePromise; }));
    const data = baseData();
    data.workspace.response = 'My first draft.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ data, callGemini });
    await clickButton('Get strengths-first AI feedback');
    await typeInto(host.querySelector('#applied-workspace-response'), 'My revised draft while feedback is pending.');
    await act(async () => {
      resolveFeedback(JSON.stringify({
        strength: 'Feedback for the old draft',
        lessonConnectionCheck: 'Old check',
        evidenceOrConstraintCheck: 'Old evidence check',
        nextStep: 'Old next step',
        status: 'grounded',
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.data.feedback).toBeNull();
    expect(toasts.some((toast) => toast.message.includes('work changed while feedback'))).toBe(true);
  });

  it('does not let an AI result land on a different same-content challenge', async () => {
    let resolveFeedback;
    const callGemini = vi.fn(() => new Promise((resolvePromise) => { resolveFeedback = resolvePromise; }));
    const data = baseData();
    data.workspace.response = 'The same draft appears in both resources.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ id: 'challenge-original', data, callGemini });
    await clickButton('Get strengths-first AI feedback');
    await replaceChallenge('challenge-replacement', structuredClone(data));
    await act(async () => {
      resolveFeedback(JSON.stringify({
        strength: 'Feedback intended for the original resource',
        nextStep: 'This must not land on the replacement.',
        status: 'developing',
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.id).toBe('challenge-replacement');
    expect(latest.data.feedback).toBeNull();
    expect(toasts.some((toast) => toast.message.includes('work changed while feedback'))).toBe(true);
  });
});
