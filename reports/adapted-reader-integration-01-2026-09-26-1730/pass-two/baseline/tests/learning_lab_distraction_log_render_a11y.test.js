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

describe('Learning Lab optional Attention Shift Log rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkDist', viewLabel: 'Optional Attention Shift Log', mytkDist: {
      events: [
        { id: 'e1', source: 'phone', context: 'During a task', durationMin: 5, date: '2000-01-01' },
        { source: 'unknown', context: '', durationMin: null, time: 'invalid-date' }
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

  it('renders optional, non-diagnostic, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-distraction-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not diagnoses, behavior ratings, evidence of effort');
    expect(host.textContent).toContain('Categories and durations are optional');
    expect(host.textContent).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
  });

  it('uses blank native optional controls with explicit bounds', () => {
    const category = host.querySelector('#learning-lab-distraction-source');
    const duration = host.querySelector('#learning-lab-distraction-duration');
    expect(category?.tagName).toBe('SELECT');
    expect(category?.value).toBe('');
    expect(duration?.type).toBe('number');
    expect(duration?.value).toBe('');
    expect(duration?.max).toBe('1440');
    expect(host.querySelector('#learning-lab-distraction-context')?.maxLength).toBe(1000);
  });

  it('validates an empty save with a conditional alert and category focus', async () => {
    expect(host.querySelector('#learning-lab-distraction-detail-error')).toBeNull();
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-distraction-detail-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-distraction-source');
  });

  it('saves context alone, preserves sibling data, and focuses the entry', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-distraction-context'), 'Context only'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkDist.events[0];
    expect(saved.source).toBe('');
    expect(saved.durationMin).toBeNull();
    expect(saved.context).toBe('Context only');
    expect(latest.learningLab.mytkDist.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-distraction-entry-heading-' + saved.id);
  });

  it('edits while preserving identity and original date', async () => {
    await act(async () => { host.querySelector('button[aria-label="Edit attention entry: Device or notification"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-distraction-form-heading');
    await act(async () => { choose(host.querySelector('#learning-lab-distraction-source'), 'noise'); setValue(host.querySelector('#learning-lab-distraction-context'), 'Updated context'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkDist.events.find((entry) => entry.id === 'e1');
    expect(saved.source).toBe('noise');
    expect(saved.date).toBe('2000-01-01');
    expect(document.activeElement?.id).toBe('learning-lab-distraction-entry-heading-e1');
  });

  it('confirms dirty edit cancellation and restores entry focus', async () => {
    await act(async () => { host.querySelector('button[aria-label="Edit attention entry: Device or notification"]').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-distraction-context'), 'Unsaved'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel edit').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-distraction-entry-heading-e1');
  });

  it('uses a fixed-order semantic summary without ranking or time totals', () => {
    const summary = host.querySelector('section[aria-labelledby="learning-lab-distraction-summary-heading"] dl');
    expect(summary).not.toBeNull();
    expect(Array.from(summary.querySelectorAll('dt')).map((term) => term.textContent)).toEqual(['📱 Device or notification', '• Category not recorded']);
    expect(host.textContent).toContain('not ranked');
    expect(host.textContent).not.toContain('Rank 1');
    expect(host.textContent).not.toContain('minutes total');
  });

  it('renders every entry with semantic articles and robust dates', () => {
    const items = host.querySelectorAll('ul[aria-label="All saved attention entries"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[0].textContent).toContain('Approximate duration: 5 minutes');
    expect(items[1].textContent).toContain('Category not recorded');
    expect(items[1].textContent).toContain('Duration not recorded');
    expect(items[1].textContent).toContain('Date not recorded');
  });

  it('deletes a legacy entry without an ID and restores focus to history', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete attention entry: Category not recorded"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkDist.events).toHaveLength(1);
    expect(latest.learningLab.mytkDist.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-distraction-history-heading');
  });
});
