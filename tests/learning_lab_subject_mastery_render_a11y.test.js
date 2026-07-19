import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set;
  setter.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Learning Lab Subject learning-status rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkMastery', viewLabel: 'Subject learning status', mytkMastery: {
      subjects: [{ id: 's1', name: 'Biology', createdAt: '2026-01-01', topics: [
        { id: 't1', name: 'Photosynthesis', mastery: 'shaky', updatedAt: '2026-07-18' },
        { id: 't2', name: 'Cell structure', mastery: 'mastered', updatedAt: 'invalid-date' }
      ] }], preservedSibling: true
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

  it('renders contextual privacy guidance without an average score', () => {
    expect(host.querySelector('#learning-lab-mastery-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not grades, test scores, diagnoses');
    expect(host.textContent).toContain('not automatically shared with a teacher or school');
    expect(host.textContent).not.toContain('Average mastery');
    expect(host.textContent).not.toContain('/4');
  });

  it('validates a required subject and focuses the bounded input', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-add-subject-heading"]');
    expect(host.querySelector('#learning-lab-subject-name')?.maxLength).toBe(120);
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-subject-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-subject-name');
  });

  it('adds a subject, preserves sibling data, and returns focus to the input', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-subject-name'), 'Chemistry'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-add-subject-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkMastery.subjects).toHaveLength(2);
    expect(latest.learningLab.mytkMastery.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-subject-name');
  });

  it('opens a subject with heading focus and renders semantic status counts', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-mastery-subject-heading');
    expect(host.querySelectorAll('ul[aria-label="Learning-status counts for Biology"] > li')).toHaveLength(5);
    expect(host.textContent).toContain('the app does not combine these categories into an average score');
    expect(host.querySelectorAll('ul[aria-label="Biology topics"] article')).toHaveLength(2);
  });

  it('uses native, named status selects and maps legacy labels to neutral wording', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    const select = host.querySelector('#learning-lab-topic-status-t1');
    expect(select.value).toBe('shaky');
    expect(select.selectedOptions[0].textContent).toBe('Practicing');
    expect(host.querySelector('#learning-lab-topic-status-t2')?.selectedOptions[0].textContent).toBe('Ready to use');
    await act(async () => { choose(select, 'solid'); await Promise.resolve(); });
    expect(latest.learningLab.mytkMastery.subjects[0].topics[0].mastery).toBe('solid');
    expect(host.querySelector('#learning-lab-topic-status-t1')?.selectedOptions[0].textContent).toBe('Comfortable');
  });

  it('renders robust topic dates and a visible fallback for malformed legacy dates', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    const times = host.querySelectorAll('article time');
    expect(times[0].dateTime).toBeTruthy();
    expect(times[1].textContent).toBe('Date not recorded');
  });

  it('validates, bounds, and adds a topic with focus recovery', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-add-topic-heading"]');
    expect(host.querySelector('#learning-lab-topic-name')?.maxLength).toBe(160);
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-topic-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-topic-name');
    await act(async () => { setValue(host.querySelector('#learning-lab-topic-name'), 'Genetics'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkMastery.subjects[0].topics).toHaveLength(3);
    expect(document.activeElement?.id).toBe('learning-lab-topic-name');
  });

  it('confirms topic deletion and restores focus to the topic heading', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete topic: Photosynthesis"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete topic').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkMastery.subjects[0].topics).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-topics-heading');
  });

  it('restores subject-card focus on back navigation and confirms subject deletion', async () => {
    await act(async () => { host.querySelector('#learning-lab-open-subject-s1').click(); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Back to subjects').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-open-subject-s1');
    await act(async () => { host.querySelector('button[aria-label="Delete subject: Biology"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete subject').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkMastery.subjects).toHaveLength(0);
    expect(latest.learningLab.mytkMastery.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-subject-name');
  });
});
