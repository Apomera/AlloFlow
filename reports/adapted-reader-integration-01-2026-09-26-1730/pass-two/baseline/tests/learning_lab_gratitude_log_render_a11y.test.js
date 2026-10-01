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

describe('Learning Lab optional appreciation notes rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkGrat', viewLabel: 'Optional appreciation notes', mytkGrat: {
      entries: [
        { id: 'e1', date: '2000-01-01', createdAt: null, g1: 'A supportive friend', g2: '', g3: 'A quiet room' },
        { date: 'invalid-date', g1: 'Legacy note', g2: '', g3: '' }
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

  it('renders optional-use, mixed-evidence, non-treatment, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-gratitude-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('You may skip any day');
    expect(host.textContent).toContain('do not need to be minimized');
    expect(host.textContent).toContain('mixed average results');
    expect(host.textContent).toContain('does not promise better mood');
    expect(host.textContent).toContain('does not itself notify a teacher');
  });

  it('uses a semantic summary without streak pressure', () => {
    expect(host.querySelector('section[aria-labelledby="learning-lab-gratitude-summary-heading"] dl')).not.toBeNull();
    expect(host.textContent).not.toContain('Day streak');
    expect(host.textContent).not.toContain('Why this works');
    expect(host.textContent).toContain('Saved entries');
    expect(host.textContent).toContain('Saved notes');
  });

  it('renders three bounded fields while requiring only one note to save', () => {
    const inputs = host.querySelectorAll('form[aria-labelledby="learning-lab-gratitude-form-heading"] input');
    expect(inputs).toHaveLength(3);
    inputs.forEach((input) => expect(input.maxLength).toBe(300));
    expect(host.textContent).toContain('Enter one, two, or three notes');
    expect(host.textContent).toContain('There is no daily requirement or streak');
  });

  it('validates an empty save with a conditional alert and focus', async () => {
    expect(host.querySelector('#learning-lab-gratitude-error')).toBeNull();
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-gratitude-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-gratitude-1');
  });

  it('allows only the second optional field, preserves sibling data, and focuses today status', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-gratitude-2'), 'A useful conversation'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkGrat.entries[0];
    expect(saved.g1).toBe('');
    expect(saved.g2).toBe('A useful conversation');
    expect(latest.learningLab.mytkGrat.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-gratitude-today-status');
  });

  it('renders every entry with semantic articles and robust dates', () => {
    const items = host.querySelectorAll('ul[aria-label="All optional appreciation entries"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article time')?.dateTime).toBeTruthy();
    expect(items[0].textContent).toContain('A supportive friend');
    expect(items[1].textContent).toContain('Date not recorded');
  });

  it('deletes a legacy entry without an ID and restores focus to history', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete appreciation entry from Date not recorded"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkGrat.entries).toHaveLength(1);
    expect(latest.learningLab.mytkGrat.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-gratitude-history-heading');
  });
});
