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

describe('Learning Lab personal Sleep Log rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkSleep', viewLabel: 'Personal sleep log', mytkSleep: {
      entries: [
        { id: 'e1', date: '2000-01-01', bedtime: '22:00', waketime: '06:00', hours: 8, quality: 4, factors: ['phone', 'darkroom'] },
        { id: 'e2', date: 'invalid-date', bedtime: '', waketime: '', hours: 0, quality: null, factors: [] }
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

  it('renders medical, measurement, safety, sharing, and privacy limits', () => {
    expect(host.querySelector('#learning-lab-sleep-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('does not measure time asleep');
    expect(host.textContent).toContain('does not diagnose a sleep condition');
    expect(host.textContent).toContain('Sleep needs vary with age');
    expect(host.textContent).toContain('not automatically shared with a clinician');
    expect(host.textContent).toContain('Do not drive or operate equipment');
  });

  it('starts times and the optional quality rating unselected', () => {
    expect(host.querySelector('#learning-lab-sleep-bedtime')?.value).toBe('');
    expect(host.querySelector('#learning-lab-sleep-waketime')?.value).toBe('');
    const quality = host.querySelector('#learning-lab-sleep-quality');
    expect(quality?.tagName).toBe('SELECT');
    expect(quality?.value).toBe('');
    expect(quality?.selectedOptions[0].textContent).toBe('Not rated');
  });

  it('validates missing times with a conditional alert and focus', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-sleep-form-heading"]');
    expect(host.querySelector('#learning-lab-sleep-time-error')).toBeNull();
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-sleep-time-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-sleep-bedtime');
    await act(async () => { setValue(host.querySelector('#learning-lab-sleep-bedtime'), '22:30'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-sleep-waketime');
  });

  it('describes the entered-time calculation without calling it measured sleep', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-sleep-bedtime'), '22:30'); setValue(host.querySelector('#learning-lab-sleep-waketime'), '06:30'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-sleep-interval-note')?.textContent).toContain('8.0 hours between the entered times');
    expect(host.querySelector('#learning-lab-sleep-interval-note')?.textContent).not.toContain('total sleep');
  });

  it('uses native factor checkboxes and saves only deliberate values', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-sleep-bedtime'), '22:30'); setValue(host.querySelector('#learning-lab-sleep-waketime'), '06:30'); choose(host.querySelector('#learning-lab-sleep-quality'), '3'); await Promise.resolve(); });
    const checkbox = Array.from(host.querySelectorAll('fieldset input[type="checkbox"]')).find((input) => input.parentElement.textContent.includes('Phone used in bed'));
    await act(async () => { checkbox.click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-sleep-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkSleep.entries[0].quality).toBe(3);
    expect(latest.learningLab.mytkSleep.entries[0].factors).toEqual(['phone']);
    expect(latest.learningLab.mytkSleep.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-sleep-today-status');
  });

  it('uses a semantic seven-date table without normative duration colors or labels', () => {
    const table = host.querySelector('table');
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(table?.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(host.textContent).toContain('No duration is categorized as good or bad');
    expect(host.textContent).not.toContain('Average quality');
  });

  it('renders every stored entry with robust dates and complete details', () => {
    const items = host.querySelectorAll('ul[aria-label="All personal sleep logs"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Good');
    expect(items[0].textContent).toContain('Phone used in bed');
    expect(items[1].textContent).toContain('Date not recorded');
    expect(items[1].textContent).toContain('Not available');
  });

  it('confirms deletion and restores focus to the remaining history', async () => {
    const deleteButton = host.querySelector('button[aria-label^="Delete sleep log from Jan 1, 2000"]');
    expect(deleteButton).not.toBeNull();
    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete log').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkSleep.entries).toHaveLength(1);
    expect(latest.learningLab.mytkSleep.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-sleep-history-heading');
  });
});
