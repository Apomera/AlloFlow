import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function futureISO(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('Learning Lab Exam Prep rendered accessibility states', () => {
  let host;
  let root;
  const examDate = futureISO(20);

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkExam',
        viewLabel: 'Exam Prep',
        mytkExam: {
          exams: [{ id: 'exam-1', name: 'Biology final', date: examDate, units: 6, dailyMin: 30, completedDays: [] }],
          preservedSibling: true,
        },
      },
    };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders qualified guidance, semantic plans, dates, and the first 14 study days', () => {
    expect(host.querySelector('#learning-lab-exam-heading')?.tagName).toBe('H2');
    expect(host.querySelector('aside[aria-labelledby="learning-lab-exam-note-heading"]')).not.toBeNull();
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-exam-plans-heading"] > li')).toHaveLength(1);
    expect(host.querySelector(`time[datetime="${examDate}"]`)).not.toBeNull();
    expect(host.querySelectorAll('ol > li')).toHaveLength(14);
    expect(host.querySelectorAll('ol button[aria-pressed="false"]')).toHaveLength(14);
  });

  it('expands and collapses the full generated plan accessibly', async () => {
    let toggle = host.querySelector('button[aria-expanded="false"]');
    expect(toggle?.textContent).toBe('Show all 20 days');
    await act(async () => { toggle.click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ol > li')).toHaveLength(20);
    toggle = host.querySelector('button[aria-expanded="true"]');
    expect(toggle?.textContent).toBe('Show first 14 days');
  });

  it('toggles completion through an item-specific pressed control', async () => {
    const button = host.querySelector('ol button[aria-pressed="false"]');
    expect(button?.getAttribute('aria-label')).toMatch(/^Mark complete:/);
    await act(async () => { button.click(); await Promise.resolve(); });
    const completed = host.querySelector('ol button[aria-pressed="true"]');
    expect(completed?.getAttribute('aria-label')).toMatch(/^Mark incomplete:/);
    expect(completed?.textContent).toContain('Completed');
  });

  it('opens the native form and reports separate missing-field errors', async () => {
    await act(async () => { host.querySelector('#learning-lab-exam-new-button').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-exam-form-heading');
    const form = host.querySelector('form[aria-labelledby="learning-lab-exam-form-heading"]');
    expect(form).not.toBeNull();
    expect(host.querySelector('#learning-lab-exam-date')?.min).toBe(futureISO(1));
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-exam-name-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-exam-date-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-exam-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-exam-name');
  });

  it('confirms deletion and restores the new-plan button when the list becomes empty', async () => {
    const remove = host.querySelector('button[aria-label="Delete exam prep plan: Biology final"]');
    await act(async () => { remove.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete plan');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Biology final');
    expect(document.activeElement?.id).toBe('learning-lab-exam-new-button');
  });
});
