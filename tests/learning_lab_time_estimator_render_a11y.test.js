import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Learning Lab optional Time Estimate Comparison rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkTime', viewLabel: 'Optional Time Estimate Comparison', mytkTime: {
      predictions: [
        { id: 'p1', task: 'Essay', predictedMin: 30, actualMin: 45, notes: 'Context note', date: '2000-01-01' },
        { task: '', predictedMin: 'invalid', actualMin: null, notes: '', date: 'invalid-date' }
      ], preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      latest = toolData;
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

  it('renders optional, non-scoring, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-time-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('Differences are neutral observations, not scores');
    expect(host.textContent).toContain('Tasks are not assumed to be comparable');
    expect(host.textContent).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
  });

  it('uses a blank bounded native number input for deliberate predictions', () => {
    const predicted = host.querySelector('#learning-lab-time-predicted');
    expect(predicted?.type).toBe('number');
    expect(predicted?.value).toBe('');
    expect(predicted?.min).toBe('1');
    expect(predicted?.max).toBe('1440');
    expect(host.querySelector('input[type="range"]')).toBeNull();
  });

  it('validates task and prediction independently with conditional alerts and focus', async () => {
    expect(host.querySelector('#learning-lab-time-task-error')).toBeNull();
    expect(host.querySelector('#learning-lab-time-predicted-error')).toBeNull();
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-time-task-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-time-predicted-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-time-task');
    await act(async () => { setValue(host.querySelector('#learning-lab-time-task'), 'Task'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-time-predicted');
  });

  it('starts and stops with focused state headings and a bounded review form', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-time-task'), 'Timed task'); setValue(host.querySelector('#learning-lab-time-predicted'), '20'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-time-active-heading');
    await act(async () => { buttonByText(host, 'Stop and review').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-time-review-heading');
    expect(host.querySelector('#learning-lab-time-actual')?.value).toBe('1');
    expect(host.querySelector('#learning-lab-time-actual')?.max).toBe('1440');
    expect(host.querySelector('#learning-lab-time-notes')?.maxLength).toBe(2000);
  });

  it('confirmed cancellation restores task and prediction and focuses the task field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-time-task'), 'Canceled task'); setValue(host.querySelector('#learning-lab-time-predicted'), '25'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel timer').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Cancel timer').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-time-task')?.value).toBe('Canceled task');
    expect(host.querySelector('#learning-lab-time-predicted')?.value).toBe('25');
    expect(document.activeElement?.id).toBe('learning-lab-time-task');
  });

  it('saves deliberate values, preserves siblings, and focuses the saved comparison', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-time-task'), 'Saved task'); setValue(host.querySelector('#learning-lab-time-predicted'), '20'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Stop and review').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-time-actual'), '32'); setValue(host.querySelector('#learning-lab-time-notes'), 'Deliberate note'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkTime.predictions[0];
    expect(saved.predictedMin).toBe(20);
    expect(saved.actualMin).toBe(32);
    expect(saved.notes).toBe('Deliberate note');
    expect(latest.learningLab.mytkTime.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-time-entry-heading-' + saved.id);
  });

  it('renders every record with semantic articles, neutral differences, and robust dates', () => {
    const items = host.querySelectorAll('ul[aria-label="All saved time comparisons"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(items[0].textContent).toContain('Recorded duration is 15 minutes longer than predicted');
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[1].textContent).toContain('Untitled task');
    expect(items[1].textContent).toContain('Difference not available');
    expect(items[1].textContent).toContain('Date not recorded');
    expect(host.textContent).not.toContain('Well calibrated');
  });

  it('deletes a legacy record without an ID and restores focus to history', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete time comparison for Untitled task"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete comparison').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkTime.predictions).toHaveLength(1);
    expect(latest.learningLab.mytkTime.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-time-history-heading');
  });
});
