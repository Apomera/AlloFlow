import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Learning Lab Task Breaker rendered accessibility states', () => {
  let host;
  let root;
  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkTasks', viewLabel: 'Task Breaker', mytkTasks: { tasks: [{
      id: 'task-1', title: 'Lab report', dueDate: '2099-05-10', createdAt: '2026-07-01',
      steps: [{ id: 'step-1', text: 'Open the data file', estMin: 5, done: false }, { id: 'step-2', text: 'Write the methods section', estMin: 20, done: true }]
    }], preservedSibling: true } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });
  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount()); if (host) host.remove();
  });

  it('renders semantic tasks, steps, progress, date, and explicit units', () => {
    expect(host.querySelector('#learning-lab-task-heading')?.tagName).toBe('H2');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-task-list-heading"] > li')).toHaveLength(1);
    expect(host.querySelectorAll('ol[aria-label="Steps for Lab report"] > li')).toHaveLength(2);
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50');
    expect(host.querySelector('time[datetime="2099-05-10"]')).not.toBeNull();
    expect(host.textContent).toContain('5 minutes');
    expect(host.textContent).toContain('20 minutes');
  });

  it('opens the native authoring form and focuses its heading', async () => {
    await act(async () => { host.querySelector('#learning-lab-task-new-button').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-task-form-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-task-form-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-task-title"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-task-due-date"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-task-title')?.maxLength).toBe(240);
  });

  it('reports both title and step errors and focuses the title first', async () => {
    await act(async () => { host.querySelector('#learning-lab-task-new-button').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-task-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-task-title-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-task-steps-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-task-title');
  });

  it('adds and removes a dynamic step with focus recovery', async () => {
    await act(async () => { host.querySelector('#learning-lab-task-new-button').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-task-add-step').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ol[aria-labelledby="learning-lab-task-steps-heading"] > li')).toHaveLength(2);
    expect(document.activeElement?.id).toMatch(/^learning-lab-task-step-/);
    const removeButtons = host.querySelectorAll('button[aria-label^="Remove step"]');
    await act(async () => { removeButtons[1].click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ol[aria-labelledby="learning-lab-task-steps-heading"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toMatch(/^learning-lab-task-step-/);
  });

  it('opens an existing task for editing with populated values', async () => {
    const edit = host.querySelector('button[aria-label="Edit task: Lab report"]');
    await act(async () => { edit.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-task-title')?.value).toBe('Lab report');
    expect(host.querySelectorAll('ol[aria-labelledby="learning-lab-task-steps-heading"] > li')).toHaveLength(2);
    expect([...host.querySelectorAll('button')].find((button) => button.textContent === 'Save changes')).not.toBeNull();
  });

  it('toggles completion with an item-specific pressed control', async () => {
    const toggle = host.querySelector('button[aria-label="Mark complete: Open the data file"]');
    await act(async () => { toggle.click(); await Promise.resolve(); });
    expect(host.querySelector('button[aria-label="Mark incomplete: Open the data file"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('confirms deletion and restores the new-task button when empty', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete task: Lab report"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete task');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Lab report');
    expect(document.activeElement?.id).toBe('learning-lab-task-new-button');
  });
});
