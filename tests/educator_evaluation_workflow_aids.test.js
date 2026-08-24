// Educator Evaluation — workflow aids added 2026-08-23:
// bulk roster paste (Staff), quick-add educator from the walkthrough form,
// building-level walkthrough/domain coverage (Trends), and the due-date
// calendar (.ics) export (Reports & audit). Real React mounts against the
// built module, mirroring educator_evaluation_mount_smoke.test.js.

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let EducatorEvaluationPanel;
const mounted = [];
const STORAGE_KEY = 'allo_educator_evaluation_workspace_v1';

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  EducatorEvaluationPanel = window.AlloModules.EducatorEvaluation
    && window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel;
  if (!EducatorEvaluationPanel) throw new Error('EducatorEvaluation did not register');
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    act(() => { root.unmount(); });
    container.remove();
  }
  localStorage.clear();
  sessionStorage.clear();
});

function mountPanel(startMode = 'sample') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(EducatorEvaluationPanel, { onClose: () => {}, addToast: () => {} }));
  });
  mounted.push({ root, container });
  if (startMode) clickButton(container, startMode === 'blank' ? 'Start real work locally' : 'Start a guided sample tour');
  return container;
}

function click(element) {
  if (!element) throw new Error('Expected a clickable element');
  act(() => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function clickButton(container, label) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => { const text = (candidate.textContent || '').replace(/\s+/g, ' ').trim(); return text === label || text.startsWith(label); });
  if (!button) throw new Error('No button labeled "' + label + '"');
  click(button);
  return button;
}

function enterValue(element, value) {
  const proto = element instanceof window.HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

async function waitForLocalSave() {
  await act(async () => {
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  });
}

function storedWorkspace() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : null;
  return parsed && parsed.teachers ? parsed : (parsed && parsed.workspace) || null;
}

describe('bulk roster paste', () => {
  it('previews per-line results and adds only the valid rows in one commit', async () => {
    const container = mountPanel('blank');
    clickButton(container, 'Staff');
    clickButton(container, 'Paste roster');

    const card = container.querySelector('[aria-labelledby="ae-paste-roster-title"]');
    expect(card).toBeTruthy();
    enterValue(card.querySelector('textarea'), [
      'Jordan Rivera, JR104, Grade 3, 2027-05-15',
      'Sam Lee\tSL221\tBiology\ttomorrow',
      'NoCode Person',
      'Dupe Rivera, jr104, Art',
    ].join('\n'));

    const preview = card.textContent;
    expect(preview).toContain('Skipped: name and staff code are required');
    expect(preview).toContain('Skipped: duplicate staff code in this paste');
    expect(preview).toContain('due date not recognized');

    clickButton(container, 'Add 2 educators');
    await waitForLocalSave();

    const workspace = storedWorkspace();
    expect(workspace.teachers).toHaveLength(2);
    const codes = workspace.teachers.map((teacher) => teacher.code);
    expect(codes).toContain('JR104');
    expect(codes).toContain('SL221');
    const rivera = workspace.teachers.find((teacher) => teacher.code === 'JR104');
    const lee = workspace.teachers.find((teacher) => teacher.code === 'SL221');
    expect(rivera.dueDate).toBe('2027-05-15');
    expect(lee.dueDate).toBe('');
    expect(lee.assignment).toBe('Biology');
    // ONE audit entry for the whole paste, not one per educator.
    const pasteEvents = workspace.audit.filter((entry) => String(entry.summary || '').includes('pasted roster'));
    expect(pasteEvents).toHaveLength(1);
    expect(container.textContent).toContain('Jordan Rivera');
    expect(container.textContent).toContain('Sam Lee');
  });

  it('keeps a comma-containing name intact when the line is tab-separated', async () => {
    const container = mountPanel('blank');
    clickButton(container, 'Staff');
    clickButton(container, 'Paste roster');
    const card = container.querySelector('[aria-labelledby="ae-paste-roster-title"]');
    enterValue(card.querySelector('textarea'), 'Rivera, Jordan\tJR104\tGrade 3');
    clickButton(container, 'Add 1 educator');
    await waitForLocalSave();
    const workspace = storedWorkspace();
    expect(workspace.teachers).toHaveLength(1);
    expect(workspace.teachers[0].name).toBe('Rivera, Jordan');
    expect(workspace.teachers[0].code).toBe('JR104');
  });
});

describe('walkthrough quick-add', () => {
  it('adds an educator from inside the visit form and selects them in the draft', async () => {
    const container = mountPanel('blank');
    clickButton(container, 'Walkthroughs');
    clickButton(container, '+ Start walkthrough');
    clickButton(container, '+ New educator');

    const block = Array.from(container.querySelectorAll('.ae-field-wide'))
      .find((element) => element.textContent.includes('Quick-add educator'));
    expect(block).toBeTruthy();
    const inputs = block.querySelectorAll('input');
    enterValue(inputs[0], 'Casey Brook');
    enterValue(inputs[1], 'CB330');
    clickButton(container, 'Add and select');
    await waitForLocalSave();

    const workspace = storedWorkspace();
    expect(workspace.teachers).toHaveLength(1);
    expect(workspace.teachers[0].name).toBe('Casey Brook');
    const educatorSelect = container.querySelector('select.ae-select');
    expect(educatorSelect.value).toBe(workspace.teachers[0].id);
  });
});

describe('building coverage view', () => {
  it('renders roster-wide walkthrough coverage and domain documentation counts', () => {
    const container = mountPanel('sample');
    clickButton(container, 'Trends');

    const coverage = container.querySelector('[aria-labelledby="ae-coverage-title"]');
    expect(coverage).toBeTruthy();
    expect(coverage.textContent).toContain('not a judgment about anyone');
    const workspace = storedWorkspace();
    const activeCount = workspace.teachers.filter((teacher) => teacher.active !== false).length;
    expect(coverage.querySelectorAll('tbody tr')).toHaveLength(activeCount);
    expect(coverage.textContent).toContain('No published visits yet');

    const domains = container.querySelector('[aria-labelledby="ae-domain-coverage-title"]');
    expect(domains).toBeTruthy();
    expect(domains.querySelectorAll('.ae-stat')).toHaveLength(4);
    expect(domains.textContent).toContain('never a rating');
  });
});

describe('due-date calendar export', () => {
  it('downloads an RFC 5545 calendar with one all-day event per open cycle', async () => {
    const container = mountPanel('sample');
    const blobs = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    try {
      clickButton(container, 'Reports & audit');
      clickButton(container, 'Due-date calendar (.ics)');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
    expect(blobs).toHaveLength(1);
    const ics = await blobs[0].text();
    await waitForLocalSave();

    const workspace = storedWorkspace();
    const open = workspace.teachers.filter((teacher) => teacher.active !== false && !teacher.finalizedAt && /^\d{4}-\d{2}-\d{2}$/.test(teacher.dueDate || ''));
    expect(open.length).toBeGreaterThan(0);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('\r\nBEGIN:VEVENT');
    expect((ics.match(/BEGIN:VEVENT/g) || [])).toHaveLength(open.length);
    expect((ics.match(/DTSTART;VALUE=DATE:\d{8}/g) || [])).toHaveLength(open.length);
    open.forEach((teacher) => {
      expect(ics).toContain('UID:alloflow-ae-due-' + teacher.id + '@alloflow');
    });
    expect(ics).toContain('SUMMARY:Evaluation cycle due: ');
    const exported = workspace.audit.filter((entry) => String(entry.summary || '').includes('Due-date calendar exported'));
    expect(exported).toHaveLength(1);
  });
});
