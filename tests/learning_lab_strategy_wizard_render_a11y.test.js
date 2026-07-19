import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Learning Lab Strategy Wizard rendered accessibility states', () => {
  let host;
  let root;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkWizard', viewLabel: 'Strategy Wizard', mytkWizard: {
      savedPlans: [{ id: 'plan-1', savedAt: today, subject: 'Biology', form: { subject: 'Biology', assessment: 'test', days: 7, prior: 'some' }, top3: [{ id: 'practiceTest', label: 'Practice testing' }] }], preservedSibling: true
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
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders a named form, bounded fields, visible choices, saved plans, and limits', () => {
    expect(host.querySelector('#learning-lab-strategy-heading')?.tagName).toBe('H2');
    expect(host.querySelector('form[aria-labelledby="learning-lab-strategy-form-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-strategy-subject')?.maxLength).toBe(240);
    expect(host.querySelector('#learning-lab-strategy-days')?.min).toBe('1');
    expect(host.querySelectorAll('fieldset')).toHaveLength(2);
    expect(host.textContent).toContain('Working knowledge');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-strategy-saved-heading"] > ul > li')).toHaveLength(1);
    expect(host.querySelector('time[datetime="' + today + '"]')).not.toBeNull();
    expect(host.querySelector('aside[aria-labelledby="learning-lab-strategy-evidence-heading"]')).not.toBeNull();
  });

  it('reports invalid days and focuses the number field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-strategy-days'), '0'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-strategy-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-strategy-days-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-strategy-days')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-strategy-days');
  });

  it('generates a focused semantic comparison with disclosed heuristic scores', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-strategy-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-strategy-results-title');
    const results = host.querySelector('section[aria-labelledby="learning-lab-strategy-results-title"]');
    expect(results.querySelectorAll('ol[aria-describedby="learning-lab-strategy-results-help"] > li')).toHaveLength(12);
    expect(results.textContent).toContain('simple, non-validated match heuristic');
    expect(results.textContent).toContain('Heuristic match: 10 out of 10');
    expect(results.querySelector('dl[aria-label="Inputs used for this comparison"]')).not.toBeNull();
  });

  it('invalidates generated results after an input choice changes', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-strategy-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-strategy-results-title')).not.toBeNull();
    const choice = Array.from(host.querySelectorAll('fieldset button')).find((button) => button.textContent.includes('Application or problem-solving'));
    await act(async () => { choice.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-strategy-results-title')).toBeNull();
    expect(choice.getAttribute('aria-pressed')).toBe('true');
  });

  it('saves a generated plan once and focuses the saved-plan heading', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-strategy-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const save = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Save this plan');
    await act(async () => { save.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-strategy-saved-heading');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-strategy-saved-heading"] > ul > li')).toHaveLength(2);
    expect(Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Plan saved')?.disabled).toBe(true);
  });

  it('confirms deletion and restores form-heading focus when no saved plans remain', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete saved plan: Biology"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete plan');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-strategy-saved-heading')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-strategy-form-heading');
  });
});
