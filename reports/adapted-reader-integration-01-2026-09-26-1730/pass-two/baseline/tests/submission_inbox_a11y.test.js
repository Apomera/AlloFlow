import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let axe;
let SubmissionInbox;
let root;
let host;
let opener;

const timerTick = () => new Promise(resolveTimer => setTimeout(resolveTimer, 10));

function gradebookFixture() {
  const timestamp = '2026-08-25T15:30:00.000Z';
  return {
    saved: {
      source: 'offline-html',
      nickname: 'A learner with a long classroom codename',
      className: 'Accessibility class',
      docTitle: 'A long assignment title',
      submittedAt: timestamp,
      gradedAt: timestamp,
      responses: { reflection: 'A detailed response.' },
      grades: {
        reflection: {
          score: 88,
          status: 'correct',
          feedback: 'Good evidence.',
        },
      },
      rubric: 'Use evidence and explain the reasoning.',
    },
  };
}

async function renderInbox({ gradebook = gradebookFixture(), savedRubric = false } = {}) {
  localStorage.setItem('alloflow_offline_grades', JSON.stringify(gradebook));
  if (savedRubric) {
    localStorage.setItem('alloflow_inbox_session', JSON.stringify({
      globalRubric: {
        rubric: 'Use evidence and explain the reasoning.',
        context: 'Reading response',
      },
      anchors: [],
      savedAt: '2026-08-25T15:30:00.000Z',
    }));
  }
  opener = document.createElement('button');
  opener.textContent = 'Open Submission Inbox';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(SubmissionInbox, {
      isOpen: true,
      onClose: vi.fn(),
      rosterKey: {
        classId: 'class-a11y',
        students: { 'A learner with a long classroom codename': {} },
        learnerIds: { 'A learner with a long classroom codename': 'learner-a11y' },
      },
      t: (key, fallback) => fallback || key,
      addToast: vi.fn(),
      onOpenAlloSheet: vi.fn(),
    }));
    await timerTick();
  });
  return host.querySelector('[role="dialog"][aria-labelledby="submission-inbox-title"]');
}

async function importFiles(dialog) {
  const payload = {
    kind: 'alloflow-student-submission',
    schemaVersion: 3,
    nickname: 'A learner with a long classroom codename',
    classId: 'class-a11y',
    assignmentId: 'assignment-a11y',
    docTitle: 'A long imported assignment title',
    timestamp: '2026-08-25T15:30:00.000Z',
    responses: {
      'question:reflection': 'The learner gives evidence and explains the reasoning.',
    },
    responseManifest: {
      schemaVersion: 1,
      entries: [{
        key: 'question:reflection',
        question: 'Explain your reasoning.',
        responseType: 'reflection',
      }],
    },
  };
  const validText = JSON.stringify(payload);
  const valid = new File([validText], 'learner.json', { type: 'application/json' });
  const invalid = new File(['not a submission'], 'invalid.html', { type: 'text/html' });
  Object.defineProperty(valid, 'text', { value: () => Promise.resolve(validText) });
  Object.defineProperty(invalid, 'text', { value: () => Promise.resolve('not a submission') });
  const input = dialog.querySelector('input[aria-label="Submission files"]');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [valid, invalid],
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await timerTick();
    await timerTick();
  });
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_submission_inbox_module.js');
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  if (opener) opener.remove();
  opener = null;
  localStorage.removeItem('alloflow_offline_grades');
  localStorage.removeItem('alloflow_inbox_session');
  localStorage.removeItem('alloflow_rubric_presets');
  vi.restoreAllMocks();
});

describe('Submission Inbox accessibility', () => {
  it('exposes gradebook state, an accessible scroll region, and a native learner disclosure', async () => {
    const dialog = await renderInbox();
    const gradebook = Array.from(dialog.querySelectorAll('button'))
      .find(button => button.textContent.includes('Gradebook'));
    expect(gradebook.getAttribute('aria-expanded')).toBe('false');
    expect(gradebook.getAttribute('aria-controls')).toBe('submission-inbox-gradebook-panel');

    const submissions = Array.from(dialog.querySelectorAll('button'))
      .find(button => button.textContent.trim() === 'Submissions');
    const byStudent = Array.from(dialog.querySelectorAll('button'))
      .find(button => button.textContent.trim() === 'By student');
    expect(submissions.getAttribute('aria-pressed')).toBe('true');
    expect(byStudent.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      byStudent.click();
      gradebook.click();
    });
    expect(byStudent.getAttribute('aria-pressed')).toBe('true');
    const region = dialog.querySelector('[role="region"][aria-label="Saved gradebook table"]');
    expect(region).toBeTruthy();
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.style.overflowX).toBe('auto');

    const learner = Array.from(region.querySelectorAll('button'))
      .find(button => button.textContent.includes('A learner with a long classroom codename'));
    expect(learner.tagName).toBe('BUTTON');
    expect(learner.getAttribute('aria-expanded')).toBe('false');
    await act(async () => learner.click());
    expect(learner.getAttribute('aria-expanded')).toBe('true');
    expect(region.querySelectorAll('tr').length).toBeGreaterThan(2);
  });

  it('associates visible rubric labels, exposes queue changes, and identifies row disclosures and errors', async () => {
    const dialog = await renderInbox({ savedRubric: true });
    await importFiles(dialog);

    const summary = Array.from(dialog.querySelectorAll('[role="status"]'))
      .find(element => element.textContent.includes('2 files loaded'));
    expect(summary?.getAttribute('aria-live')).toBe('polite');
    expect(dialog.querySelector('[role="alert"]')?.textContent)
      .toContain('Not an AlloFlow submission file');

    const classRubric = dialog.querySelector('#submission-inbox-class-rubric');
    const classContext = dialog.querySelector('#submission-inbox-class-context');
    expect(classRubric.labels[0].textContent).toContain('Rubric for this batch');
    expect(classContext.labels[0].textContent).toContain('Assignment context');

    const queueRegion = dialog.querySelector('[role="region"][aria-label="Imported submission queue table"]');
    expect(queueRegion.getAttribute('tabindex')).toBe('0');
    expect(queueRegion.style.overflowX).toBe('auto');
    const view = Array.from(queueRegion.querySelectorAll('button'))
      .find(button => button.textContent.trim() === 'View');
    expect(view.getAttribute('aria-expanded')).toBe('false');
    expect(view.getAttribute('aria-controls')).toBe('submission-inbox-row-details-0');

    await act(async () => view.click());
    expect(view.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.querySelector('#submission-inbox-row-details-0')).toBeTruthy();
    expect(dialog.querySelector('#submission-inbox-row-rubric-0').labels[0].textContent)
      .toContain('Rubric');
    expect(dialog.querySelector('#submission-inbox-row-context-0').labels[0].textContent)
      .toContain('Assignment context');
    expect(dialog.querySelector('#submission-inbox-row-exemplar-0').labels[0].textContent)
      .toContain('Quick exemplar');

    const serious = (await axe.run(dialog, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      },
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })).violations.filter(violation =>
      violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(serious).toEqual([]);
  });

  it('keeps bulk progress programmatic and the focused action mounted', () => {
    expect(source).toContain("const bulkGradingRef = useRef(false)");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuenow': bulkProgress.current");
    expect(source).toContain("'aria-valuetext': bulkProgress.current + ' of ' + bulkProgress.total + ' submissions'");
    expect(source).toContain("'aria-busy': bulkGrading ? 'true' : undefined");
    expect(source).not.toContain("!bulkGrading && /*#__PURE__*/React.createElement('button', {\n                type: 'button',\n                onClick: gradeAllDecrypted");
  });
});
