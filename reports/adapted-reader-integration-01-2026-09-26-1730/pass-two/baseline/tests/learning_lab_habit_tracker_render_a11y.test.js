import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

describe('Learning Lab Habit Tracker rendered accessibility states', () => {
  let host;
  let root;
  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkHabits', viewLabel: 'Habit Tracker', mytkHabits: {
      habits: [{ id: 'habit-1', name: 'Review my planner', icon: '📓', target: 'On weekdays' }],
      logs: { 'habit-1': [localISO(-1), localISO(0)] }, preservedSibling: true
    } } };
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

  it('renders semantic habits, textual summaries, history, and evidence', () => {
    expect(host.querySelector('#learning-lab-habit-heading')?.tagName).toBe('H2');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-habit-list-heading"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Current streak: 2 days');
    expect(host.textContent).toContain('Last 7 days: 2 completed');
    expect(host.querySelector('details summary')?.textContent).toBe('View 30-day check-in history (2 completed)');
    expect(host.querySelectorAll('details ol > li')).toHaveLength(30);
    expect(host.querySelector('aside[aria-labelledby="learning-lab-habit-evidence-heading"]')).not.toBeNull();
  });

  it('opens the native form with labeled bounded fields', async () => {
    await act(async () => { host.querySelector('#learning-lab-habit-add-button').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-habit-form-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-habit-custom-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-habit-icon"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-habit-name"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-habit-target"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-habit-name')?.maxLength).toBe(240);
  });

  it('loads a template for editing instead of saving immediately', async () => {
    await act(async () => { host.querySelector('#learning-lab-habit-add-button').click(); await Promise.resolve(); });
    const template = host.querySelector('button[aria-label^="Use editable example:"]');
    await act(async () => { template.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-habit-name');
    expect(host.querySelector('#learning-lab-habit-name')?.value).not.toBe('');
    expect(host.querySelector('#learning-lab-habit-target')?.value).not.toBe('');
    expect([...host.querySelectorAll('button')].find((button) => button.textContent === 'Save habit')).not.toBeNull();
  });

  it('reports a missing custom name and focuses its field', async () => {
    await act(async () => { host.querySelector('#learning-lab-habit-add-button').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-habit-custom-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-habit-name-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-habit-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-habit-name');
  });

  it('toggles today through an item-specific pressed control', async () => {
    const toggle = host.querySelector('button[aria-label="Remove today’s check-in for Review my planner"]');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    await act(async () => { toggle.click(); await Promise.resolve(); });
    const next = host.querySelector('button[aria-label="Record today’s check-in for Review my planner"]');
    expect(next?.getAttribute('aria-pressed')).toBe('false');
    expect(host.textContent).toContain('Last 7 days: 1 completed');
  });

  it('confirms deletion and restores the add button when empty', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete habit: Review my planner"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete habit');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Review my planner');
    expect(document.activeElement?.id).toBe('learning-lab-habit-add-button');
  });
});
