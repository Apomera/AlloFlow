import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function setValue(control, value) { const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set; setter.call(control, value); control.dispatchEvent(new Event('input', { bubbles: true })); }
function buttonByText(container, text) { return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text); }
describe('Learning Lab Emotion + Grounding rendered accessibility states', () => {
  let host; let root; let latest;
  beforeEach(async () => {
    resetStemLab(); const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkEmotion', viewLabel: 'Emotion + Grounding', mytkEmotion: { checks: [{ id: 'old', date: 'invalid-date', label: 'sad', intensity: 7, what: 'A long day', need: 'Rest' }], preservedSibling: true } } };
    const Component = () => { const [toolData, setToolData] = React.useState(initial); latest = toolData; const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) }); return config.render(ctx); };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });
  afterEach(() => { document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove()); if (root) act(() => root.unmount()); if (host) host.remove(); });
  it('renders safety, privacy, named crisis links, and robust legacy history', () => {
    expect(host.querySelector('#learning-lab-emotion-main-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-emotion-safety-heading')).not.toBeNull();
    expect(host.querySelector('a[aria-label="Call the 988 Suicide and Crisis Lifeline"]')).not.toBeNull();
    expect(host.querySelector('a[aria-label*="opens in a new tab"]')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(host.querySelector('#learning-lab-emotion-privacy')).not.toBeNull();
    expect(host.querySelector('article time')?.dateTime).toBeTruthy();
  });
  it('uses a native required radio group and validates with focus', async () => {
    expect(host.querySelectorAll('fieldset input[type="radio"][name="learning-lab-emotion"]')).toHaveLength(10);
    const form = host.querySelector('form[aria-labelledby="learning-lab-emotion-check-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-emotion-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-emotion-sad');
  });
  it('saves a bounded check-in, preserves sibling data, and focuses history', async () => {
    await act(async () => { host.querySelector('#learning-lab-emotion-hopeful').click(); setValue(host.querySelector('#learning-lab-emotion-context'), 'Finished a task'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-emotion-check-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement?.id).toBe('learning-lab-emotion-history-heading');
    expect(latest.learningLab.mytkEmotion.checks).toHaveLength(2);
    expect(latest.learningLab.mytkEmotion.preservedSibling).toBe(true);
  });
  it('confirms history deletion and restores a stable focus target', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete Sad emotion check-in"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Delete check-in').click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement?.id).toBe('learning-lab-emotion-save');
    expect(latest.learningLab.mytkEmotion.checks).toHaveLength(0);
  });
  it('opens a static, pausable breathing guide and restores launcher focus', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-breathing').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-breathing-heading');
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Breathing guide paused');
    expect(host.innerHTML).not.toContain('transform: scale');
    await act(async () => { buttonByText(host, 'Start breathing guide').click(); await Promise.resolve(); });
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe('Pause breathing guide');
    await act(async () => { buttonByText(host, '← Back to emotion check').click(); await new Promise((resolve) => setTimeout(resolve, 75)); });
    expect(document.activeElement?.id).toBe('learning-lab-open-breathing');
  });
  it('renders bounded adaptable grounding fields and clears temporary entries on exit', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-grounding').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-grounding-heading');
    expect(host.querySelectorAll('textarea[maxlength="1000"]')).toHaveLength(5);
    expect(host.textContent).toContain('Skip any sense or prompt that is unavailable');
    await act(async () => { setValue(host.querySelector('#learning-lab-grounding-five'), 'A blue wall'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, '← Back to emotion check').click(); await new Promise((resolve) => setTimeout(resolve, 75)); });
    expect(document.activeElement?.id).toBe('learning-lab-open-grounding');
    await act(async () => { host.querySelector('#learning-lab-open-grounding').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-grounding-five')?.value).toBe('');
  });
});
