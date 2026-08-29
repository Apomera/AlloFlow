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
});

async function renderChallenge(options = {}) {
  const initial = { type: 'applied-challenge', id: 'challenge-1', data: options.data || baseData() };
  toasts = [];
  function Harness() {
    const [generatedContent, setGeneratedContent] = React.useState(initial);
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

async function typeInto(node, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, value);
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
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
      region: { enabled: false },
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
});
