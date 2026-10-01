import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function setValue(control, value) { const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set; setter.call(control, value); control.dispatchEvent(new Event('input', { bubbles: true })); }
function buttonByText(container, text) { return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text); }
describe('Learning Lab Daily Agenda rendered accessibility states', () => {
  let host; let root; let latest;
  beforeEach(async () => {
    resetStemLab(); const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkAgenda', viewLabel: 'Today', mytkAgenda: { customToday: {}, preservedSibling: true }, mytkHabits: { habits: [{ id: 'h1', name: 'Read', icon: '📖' }], logs: {} }, mytkGoals: { goals: [{ id: 'g1', title: 'Learn', status: 'active', progress: 25 }] } } };
    const Component = () => { const [toolData, setToolData] = React.useState(initial); latest = toolData; const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) }); return config.render(ctx); };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });
  afterEach(() => { document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove()); if (root) act(() => root.unmount()); if (host) host.remove(); });
  it('renders an accurately scoped snapshot, date, privacy, and source guidance', () => {
    expect(host.querySelector('#learning-lab-daily-agenda-heading')?.tagName).toBe('H2');
    expect(host.querySelector('time')?.dateTime).toBeTruthy();
    expect(host.querySelector('#learning-lab-agenda-privacy')).not.toBeNull();
    expect(host.querySelector('[role="status"]')?.getAttribute('aria-label')).toContain('habit check-ins and extra items complete');
    expect(host.textContent).toContain('counts only habit check-ins and extra agenda items');
  });
  it('shows habit completion with visible text and goal progress semantics', () => {
    expect(host.textContent).toContain('Not completed');
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('25');
  });
  it('validates the native extra-item form and focuses the field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-agenda-extra-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-agenda-item-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-agenda-item');
  });
  it('adds an item, preserves sibling data, and renders a native checkbox', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-agenda-item'), 'Call advisor'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Add item').click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement?.id).toBe('learning-lab-agenda-item');
    expect(host.querySelector('input[type="checkbox"][aria-label="Mark complete: Call advisor"]')).not.toBeNull();
    expect(latest.learningLab.mytkAgenda.preservedSibling).toBe(true);
  });
  it('toggles the native checkbox and updates its accessible name', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-agenda-item'), 'Call advisor'); buttonByText(host, 'Add item').click(); await Promise.resolve(); });
    const checkbox = host.querySelector('input[type="checkbox"]');
    await act(async () => { checkbox.click(); await Promise.resolve(); });
    expect(host.querySelector('input[aria-label="Mark incomplete: Call advisor"]')?.checked).toBe(true);
  });
  it('confirms deletion and restores focus to the input when empty', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-agenda-item'), 'Call advisor'); buttonByText(host, 'Add item').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete agenda item: Call advisor"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete item').click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement?.id).toBe('learning-lab-agenda-item');
    expect(host.textContent).toContain('No extra items added yet.');
  });
});
