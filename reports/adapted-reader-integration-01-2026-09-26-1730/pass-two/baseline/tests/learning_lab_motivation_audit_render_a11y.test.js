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

describe('Learning Lab Motivation Reflection rendered accessibility states', () => {
  let host;
  let root;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkMotiv', viewLabel: 'Motivation Reflection', mytkMotiv: {
      audits: [{ id: 'audit-1', date: today, activity: 'Biology class', autonomy: 4, competence: 6, relatedness: 5, notes: 'A private note.' }], preservedSibling: true
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

  it('renders a named form, bounded controls, semantic history, privacy, and limits', () => {
    expect(host.querySelector('#learning-lab-motivation-heading')?.tagName).toBe('H2');
    expect(host.querySelector('form[aria-labelledby="learning-lab-motivation-form-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-motivation-activity')?.maxLength).toBe(240);
    expect(host.querySelector('#learning-lab-motivation-notes')?.maxLength).toBe(2000);
    expect(host.querySelectorAll('input[type="range"]')).toHaveLength(3);
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-motivation-history-heading"] > ul > li')).toHaveLength(1);
    expect(host.querySelector('time[datetime="' + today + '"]')).not.toBeNull();
    expect(host.querySelector('aside[aria-labelledby="learning-lab-motivation-evidence-heading"]')).not.toBeNull();
    expect(host.textContent).not.toContain('/30');
  });

  it('reports a missing activity and focuses its field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-motivation-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-motivation-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-motivation-activity')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-motivation-activity');
  });

  it('shows all tied lowest dimensions as optional generic ideas', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-motivation-activity'), 'Project'); await Promise.resolve(); });
    const suggestions = host.querySelector('section[aria-labelledby="learning-lab-motivation-suggestion-title"]');
    expect(suggestions).not.toBeNull();
    expect(suggestions.querySelectorAll(':scope > section')).toHaveLength(3);
    expect(suggestions.textContent).toContain('not personalized recommendations');
  });

  it('updates the lowest-rating suggestions without calling them weaknesses', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-motivation-activity'), 'Project'); setValue(host.querySelector('#learning-lab-motivation-autonomy'), '2'); await Promise.resolve(); });
    const suggestions = host.querySelector('section[aria-labelledby="learning-lab-motivation-suggestion-title"]');
    expect(suggestions.querySelectorAll(':scope > section')).toHaveLength(1);
    expect(suggestions.textContent).toContain('Autonomy: 2 out of 10');
    expect(suggestions.textContent).not.toContain('weakest');
  });

  it('saves a reflection and restores history-heading focus', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-motivation-activity'), 'Team practice'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-motivation-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-motivation-history-heading');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-motivation-history-heading"] > ul > li')).toHaveLength(2);
  });

  it('confirms deletion and restores activity-field focus when history becomes empty', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete motivation reflection: Biology class"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete reflection');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-motivation-history-heading')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-motivation-activity');
  });
});
