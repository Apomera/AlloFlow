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

describe('Learning Lab optional Challenge or Practice Tracker rendered accessibility states', () => {
  let host;
  let root;
  let latest;
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkChall', viewLabel: 'Optional Challenge or Practice Tracker', mytkChall: {
      challenges: [
        { id: 'c1', title: 'Practice', dailyAction: 'Optional reminder', why: 'Personal note', startDate: '2000-01-01', days: 30, createdAt: '2000-01-01', logs: [{ date: today }, { date: 'invalid-date' }] },
        { title: 'Legacy entry', dailyAction: '', why: '', startDate: 'invalid-date', days: 'invalid', logs: [{ date: 'invalid-date' }] }
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

  it('renders optional, non-evaluative, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-challenge-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('Check-ins are optional records, not proof of completion');
    expect(host.textContent).toContain('Missing days do not indicate failure');
    expect(host.textContent).toContain('does not itself notify a teacher, school, coach, clinician, or family member');
  });

  it('opens a bounded editor with heading focus and blank optional defaults', async () => {
    await act(async () => { buttonByText(host, '+ Add challenge or practice').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-challenge-editor-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-challenge-editor-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-challenge-action')?.required).toBe(false);
    expect(host.querySelector('#learning-lab-challenge-start')?.value).toBe('');
    expect(host.querySelector('#learning-lab-challenge-days')?.value).toBe('');
    expect(host.querySelector('#learning-lab-challenge-days')?.max).toBe('365');
    expect(host.querySelector('#learning-lab-challenge-why')?.maxLength).toBe(2000);
  });

  it('validates only the missing name with a conditional alert and focus', async () => {
    await act(async () => { buttonByText(host, '+ Add challenge or practice').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-challenge-title-error')).toBeNull();
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-challenge-title-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-challenge-title');
  });

  it('saves a name alone, preserves sibling data, and focuses the entry', async () => {
    await act(async () => { buttonByText(host, '+ Add challenge or practice').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-challenge-title'), 'Name only'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkChall.challenges[0];
    expect(saved.dailyAction).toBe('');
    expect(saved.startDate).toBe('');
    expect(saved.days).toBeNull();
    expect(latest.learningLab.mytkChall.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-challenge-entry-heading-' + saved.id);
  });

  it('edits while preserving identity, creation date, and check-ins', async () => {
    await act(async () => { host.querySelector('button[aria-label="Edit challenge or practice: Practice"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-challenge-editor-heading');
    await act(async () => { setValue(host.querySelector('#learning-lab-challenge-title'), 'Updated practice'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkChall.challenges.find((item) => item.id === 'c1');
    expect(saved.createdAt).toBe('2000-01-01');
    expect(saved.logs).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-challenge-entry-heading-c1');
  });

  it('confirms dirty cancellation and restores launcher focus', async () => {
    await act(async () => { buttonByText(host, '+ Add challenge or practice').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-challenge-title'), 'Unsaved'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-challenge-add');
  });

  it('uses neutral toggle text and can remove today’s check-in', async () => {
    const toggle = buttonByText(host, 'Today’s check-in is recorded — select to remove');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    await act(async () => { toggle.click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkChall.challenges[0].logs.some((log) => log.date === today)).toBe(false);
    expect(buttonByText(host, 'Record today’s optional check-in')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders semantic entries and robust visible check-in dates without progress scoring', () => {
    const items = host.querySelectorAll('ul[aria-label="Saved challenges and practices"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[0].querySelector('details summary')?.textContent).toBe('View saved check-ins (2)');
    items[0].querySelector('details').open = true;
    expect(items[0].textContent).toContain('Date not recorded');
    expect(items[1].textContent).toContain('Reference start not recorded');
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('deletes a legacy entry without an ID and restores focus to the list heading', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete challenge or practice: Legacy entry"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkChall.challenges).toHaveLength(1);
    expect(latest.learningLab.mytkChall.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-challenge-list-heading');
  });
});
