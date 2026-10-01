// Regression coverage for the reviewed-action and annual-provenance UX.
// These are real React mounts against the built evaluator module so a dialog
// that renders but mutates too early (or a cancel path that loses work) fails.

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

const STORAGE_KEY = 'allo_educator_evaluation_workspace_v1';
const DRAFT_KEY = 'alloflow_ae_walkthrough_draft_v1';
const mounted = [];
let EducatorEvaluationPanel;

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

function click(element) {
  if (!element) throw new Error('Expected a clickable element');
  act(() => {
    if (typeof element.focus === 'function') element.focus();
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function button(container, label) {
  const match = Array.from(container.querySelectorAll('button')).find((candidate) => {
    const text = (candidate.textContent || '').replace(/\s+/g, ' ').trim();
    return text === label || text.startsWith(label);
  });
  if (!match) throw new Error('No button labeled "' + label + '"');
  return match;
}

function clickButton(container, label) {
  const match = button(container, label);
  click(match);
  return match;
}

function setValue(element, value) {
  let proto = window.HTMLInputElement.prototype;
  if (element instanceof window.HTMLTextAreaElement) proto = window.HTMLTextAreaElement.prototype;
  if (element instanceof window.HTMLSelectElement) proto = window.HTMLSelectElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event(element instanceof window.HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

function mountSample() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(EducatorEvaluationPanel, { onClose: () => {}, addToast: () => {} })));
  mounted.push({ root, container });
  clickButton(container, 'Start a guided sample tour');
  const exit = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent.trim() === 'Exit tour');
  if (exit) click(exit);
  return container;
}

function workspace() {
  const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
  return parsed && parsed.workspace ? parsed.workspace : parsed;
}

function selectEducator(container, label) {
  const field = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent.includes('Selected educator'));
  if (!field) throw new Error('Selected educator field not found');
  const select = field.querySelector('select');
  const option = Array.from(select.options).find((candidate) => candidate.textContent.includes(label));
  if (!option) throw new Error('Educator option not found: ' + label);
  setValue(select, option.value);
}

async function settle() {
  await act(async () => {
    await new Promise((resolveWait) => setTimeout(resolveWait, 450));
  });
}

function actionDialog(container) {
  return Array.from(container.querySelectorAll('[role="dialog"]'))
    .find((candidate) => candidate.querySelector('#ae-action-review-title'));
}

function acknowledgeAndConfirm(container, label) {
  const dialog = actionDialog(container);
  expect(dialog).toBeTruthy();
  const confirm = button(dialog, label);
  expect(confirm.disabled).toBe(true);
  click(dialog.querySelector('input[type="checkbox"]'));
  expect(confirm.disabled).toBe(false);
  click(confirm);
}

describe('review-before-recording decisions', () => {
  it('keeps a shared comment unchanged on cancel and appends it exactly once on confirmation', async () => {
    const container = mountSample();
    selectEducator(container, 'Teacher 03');
    clickButton(container, 'Walkthroughs');
    const record = Array.from(container.querySelectorAll('.ae-record'))
      .find((candidate) => candidate.textContent.includes('Independent reading with a conference rotation'));
    click(record);

    const thread = container.querySelector('.ae-thread');
    expect(thread).toBeTruthy();
    const textarea = thread.querySelector('textarea');
    setValue(textarea, 'Follow-up context for the published snapshot.');
    const before = workspace().comments.length;
    const trigger = clickButton(container, 'Review comment');

    const dialog = actionDialog(container);
    expect(dialog.textContent).toContain('Post this shared comment?');
    expect(dialog.textContent).toContain('Follow-up context for the published snapshot.');
    expect(container.querySelector('[inert]')).toBeTruthy();
    clickButton(dialog, 'Cancel');

    expect(workspace().comments).toHaveLength(before);
    expect(textarea.value).toBe('Follow-up context for the published snapshot.');
    expect(document.activeElement).toBe(trigger);

    click(trigger);
    acknowledgeAndConfirm(container, 'Post shared comment');
    await settle();
    const saved = workspace();
    expect(saved.comments).toHaveLength(before + 1);
    expect(saved.comments.filter((item) => item.text === 'Follow-up context for the published snapshot.')).toHaveLength(1);
    expect(textarea.value).toBe('');
  });

  it('requires annual rationales and eligible evidence, then makes cancel inert before final release', async () => {
    const container = mountSample();
    selectEducator(container, 'Teacher 03');
    const annual = container.querySelector('#ae-annual-rating-composer');
    expect(annual.textContent).toContain('Annual basis incomplete.');

    const releaseCheck = Array.from(annual.querySelectorAll('label')).find((candidate) => candidate.textContent.includes('official summative rating'));
    click(releaseCheck.querySelector('input[type="checkbox"]'));
    const release = button(annual, 'Review final release');
    expect(release.disabled).toBe(true);

    const cards = annual.querySelectorAll('.ae-rating-card');
    expect(cards).toHaveLength(4);
    cards.forEach((card, index) => {
      setValue(card.querySelector('textarea'), 'Cycle evidence supports annual domain judgment ' + (index + 1) + '.');
      const evidence = card.querySelector('fieldset input[type="checkbox"]');
      expect(evidence).toBeTruthy();
      click(evidence);
    });

    expect(annual.textContent).not.toContain('Annual basis incomplete.');
    expect(release.disabled).toBe(false);
    click(release);
    let dialog = actionDialog(container);
    expect(dialog.textContent).toContain('Record final annual release for Teacher 03?');
    expect(dialog.textContent).toContain('4 domain rationales');
    clickButton(dialog, 'Cancel');
    expect(workspace().teachers.find((item) => item.code === 'T-03').finalizedAt).toBeNull();
    expect(document.activeElement).toBe(release);

    click(release);
    dialog = actionDialog(container);
    acknowledgeAndConfirm(container, 'Confirm final release');
    await settle();
    const saved = workspace();
    const teacher = saved.teachers.find((item) => item.code === 'T-03');
    expect(teacher.finalizedAt).toBeTruthy();
    expect(Object.values(teacher.annualRationales).every((value) => value.trim())).toBe(true);
    expect(Object.values(teacher.annualEvidenceRefs).every((refs) => refs.length >= 1)).toBe(true);
    expect(saved.audit.filter((item) => item.teacherId === teacher.id && item.event === 'RELEASED')).toHaveLength(1);
    const snapshot = saved.cycleSnapshots.find((item) => item.teacherId === teacher.id && item.academicYear === saved.config.academicYear);
    expect(snapshot.annualRationales).toEqual(teacher.annualRationales);
    expect(snapshot.annualEvidenceRefs).toEqual(teacher.annualEvidenceRefs);
  });
});

describe('walkthrough draft lifecycle', () => {
  it('offers Resume only after the evaluator enters meaningful draft content', () => {
    const container = mountSample();
    selectEducator(container, 'Teacher 03');
    clickButton(container, 'Walkthroughs');
    clickButton(container, '+ Start walkthrough');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    clickButton(container, 'Close draft');
    expect(button(container, '+ Start walkthrough')).toBeTruthy();

    clickButton(container, '+ Start walkthrough');
    const subject = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent.includes('Course / subject'));
    setValue(subject.querySelector('input'), 'Meaningful in-progress subject');
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)).subject).toBe('Meaningful in-progress subject');
    clickButton(container, 'Close draft');
    expect(button(container, 'Resume walkthrough draft')).toBeTruthy();
  });

  it('edits a saved private draft in place and discards it only after explicit confirmation', async () => {
    const container = mountSample();
    clickButton(container, 'Walkthroughs');
    const record = Array.from(container.querySelectorAll('.ae-record'))
      .find((candidate) => candidate.textContent.includes('Draft notes: station rotation'));
    click(record);
    const original = workspace().walkthroughs.find((item) => item.id === 'sample-w4');
    expect(original).toBeTruthy();

    clickButton(container, 'Edit draft');
    const form = Array.from(container.querySelectorAll('section')).find((candidate) => candidate.textContent.includes('Edit private walkthrough draft'));
    const evidence = Array.from(form.querySelectorAll('label')).find((candidate) => candidate.textContent.includes('Directly witnessed evidence'));
    setValue(evidence.querySelector('textarea'), 'Revised factual station-rotation evidence.');
    clickButton(form, 'Save draft changes');
    expect(container.textContent).toContain('Revised factual station-rotation evidence.');
    expect(workspace().walkthroughs.filter((item) => item.id === original.id)).toHaveLength(1);

    clickButton(container, 'Discard draft');
    let dialog = actionDialog(container);
    expect(dialog.textContent).toContain('Discard this private walkthrough draft?');
    expect(dialog.textContent).toContain('Revised factual station-rotation evidence.');
    clickButton(dialog, 'Cancel');
    expect(workspace().walkthroughs.some((item) => item.id === original.id)).toBe(true);
    expect(container.textContent).toContain('Private draft controls');

    clickButton(container, 'Discard draft');
    dialog = actionDialog(container);
    expect(dialog.querySelector('.ae-danger')).toBeTruthy();
    acknowledgeAndConfirm(container, 'Discard private draft');
    await settle();
    const saved = workspace();
    expect(saved.walkthroughs.some((item) => item.id === original.id)).toBe(false);
    expect(saved.audit.filter((item) => item.entityId === original.id && item.event === 'DRAFT_DISCARDED')).toHaveLength(1);
  });
});

describe('educator next-step routing', () => {
  it('routes an educator-owned action to the correct workflow and focuses the tab panel', async () => {
    const container = mountSample();
    selectEducator(container, 'Teacher 03');
    clickButton(container, 'Fictional educator');

    const card = container.querySelector('[aria-labelledby="ae-educator-next-title"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Your next step');
    expect(card.textContent).toContain('Acknowledge the observation rating record');
    expect(card.textContent).toContain('Your turn');
    clickButton(card, 'Acknowledge the observation rating record');
    await act(async () => new Promise((resolveWait) => setTimeout(resolveWait, 0)));

    const formalTab = container.querySelector('#ae-tab-formal');
    const panel = container.querySelector('#ae-panel');
    expect(formalTab.getAttribute('aria-selected')).toBe('true');
    expect(panel.textContent).toContain('Formal comprehensive observations');
    expect(document.activeElement).toBe(panel);
  });
});
