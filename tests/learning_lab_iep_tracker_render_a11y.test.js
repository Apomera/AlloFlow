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

describe('Learning Lab IEP planning notes rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkIEP', viewLabel: 'My IEP planning notes', mytkIEP: {
      goals: [{ id: 'g1', area: 'academic', annual: 'Use an organizer', subgoals: [{ id: 's1', text: 'Choose an organizer', done: false }], measurable: 'Review a rubric', services: 'Graphic organizer', createdAt: '2026-01-01', progress: [{ id: 'p1', date: '2026-07-18', time: 1784332800000, status: 'mixed', note: '' }] }],
      meetings: [{ id: 'm1', date: '2026-07-18', whatChanged: 'A support was discussed', myInput: 'I asked a question', whatWorked: 'Short breaks', whatToTry: 'A visual schedule' }],
      preservedSibling: true
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

  it('renders scope, choice, privacy, and complete semantic histories', () => {
    expect(host.querySelector('#learning-lab-iep-dashboard-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not the official IEP');
    expect(host.textContent).toContain('There is no required level or pace');
    expect(host.textContent).toContain('does not automatically share or monitor');
    expect(host.querySelectorAll('ul[aria-label="Personal IEP goal notes"] > li')).toHaveLength(1);
    expect(host.querySelectorAll('ul[aria-label="Personal IEP meeting notes"] > li')).toHaveLength(1);
    expect(host.querySelector('article time')?.dateTime).toBeTruthy();
    expect(host.textContent).toContain('Short breaks');
    expect(host.textContent).toContain('A visual schedule');
  });

  it('opens the native goal form, focuses its heading, and bounds every field', async () => {
    await act(async () => { buttonByText(host, '+ New personal goal note').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-iep-goal-editor-heading');
    expect(host.querySelector('#learning-lab-iep-goal-form')?.tagName).toBe('FORM');
    expect(host.querySelector('#learning-lab-iep-area')?.tagName).toBe('SELECT');
    expect(host.querySelector('#learning-lab-iep-annual-goal')?.maxLength).toBe(4000);
    expect(host.querySelector('#learning-lab-iep-measurement')?.maxLength).toBe(4000);
    expect(host.querySelector('#learning-lab-iep-services')?.maxLength).toBe(4000);
  });

  it('reports an empty required goal and focuses the field', async () => {
    await act(async () => { buttonByText(host, '+ New personal goal note').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-iep-goal-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-iep-goal-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-iep-annual-goal');
  });

  it('saves a personal goal note, preserves sibling data, and restores focus', async () => {
    await act(async () => { buttonByText(host, '+ New personal goal note').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-iep-annual-goal'), 'Request a quiet workspace'); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-iep-goal-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkIEP.goals).toHaveLength(2);
    expect(latest.learningLab.mytkIEP.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-iep-goals-heading');
  });

  it('uses a native checkbox for sub-goals', async () => {
    const checkbox = host.querySelector('input[type="checkbox"][aria-label="Mark complete: Choose an organizer"]');
    expect(checkbox).not.toBeNull();
    await act(async () => { checkbox.click(); await Promise.resolve(); });
    expect(host.querySelector('input[aria-label="Mark incomplete: Choose an organizer"]')?.checked).toBe(true);
  });

  it('adds and deletes progress entries with confirmation and focus recovery', async () => {
    await act(async () => { buttonByText(host, 'I want support').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkIEP.goals[0].progress).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-iep-progress-heading-g1');
    const deleteButtons = host.querySelectorAll('button[aria-label^="Delete progress entry from "]');
    await act(async () => { deleteButtons[0].click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkIEP.goals[0].progress).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-iep-progress-heading-g1');
  });

  it('confirms meeting-note deletion and preserves unrelated tracker data', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete personal meeting note from 2026-07-18"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete meeting note').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkIEP.meetings).toHaveLength(0);
    expect(latest.learningLab.mytkIEP.goals).toHaveLength(1);
    expect(latest.learningLab.mytkIEP.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-new-iep-meeting');
  });

  it('validates and bounds the native meeting form', async () => {
    await act(async () => { buttonByText(host, '+ New personal meeting note').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-iep-meeting-editor-heading');
    expect(host.querySelector('#learning-lab-iep-meeting-form')?.tagName).toBe('FORM');
    expect(host.querySelector('#learning-lab-iep-meeting-whatWorked')?.maxLength).toBe(4000);
    await act(async () => { setValue(host.querySelector('#learning-lab-iep-meeting-date'), ''); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-iep-meeting-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-iep-meeting-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-iep-meeting-date');
  });
});
