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
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const olderLogs = Array.from({ length: 22 }, (_, index) => ({
  id: 'older-' + index, date: '2026-06-' + String(index + 1).padStart(2, '0'), time: 1778000000000 + index, hour: 9, level: 7, what: ''
}));

describe('Learning Lab Energy Tracker rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkEnergy', viewLabel: 'Energy Tracker',
      mytkEnergy: { logs: [
        { id: 'e1', date: '2026-07-19', time: 1782500000000, hour: 15, level: 4, what: 'After lunch' },
        { id: 'e2', date: null, time: null, hour: 'sometime', level: 999, what: 42 },
        null,
        'legacy-invalid-log',
        ...olderLogs
      ] }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
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

  it('renders non-notification guidance and every log without a cap, tolerating malformed records', () => {
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    const items = host.querySelectorAll('section[aria-labelledby="learning-lab-energy-history-heading"] ul > li');
    expect(items).toHaveLength(24);
    expect(host.textContent).toContain('Date not recorded at an unrecorded time');
    expect(host.textContent).toContain('10 out of 10');
    expect(host.textContent).not.toContain('999');
    expect(host.textContent).not.toContain('NaN');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).toContain('42');
  });

  it('shows the hourly chart with honest averages and the observational peak note', () => {
    expect(host.querySelectorAll('ul[aria-label="Average energy across all 24 hours"] > li')).toHaveLength(24);
    expect(host.textContent).toContain('Highest logged hourly average');
    expect(host.textContent).toContain('9:00 AM: 7.0 out of 10 across 22 logs.');
    expect(host.textContent).toContain('not a fixed prescription');
  });

  it('rejects an invalid hour with an inline alert and focuses the hour field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-energy-hour'), '35'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-energy-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const hourField = host.querySelector('#learning-lab-energy-hour');
    expect(hourField.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-energy-hour-error')?.textContent).toContain('Enter an hour from 0 through 23.');
    expect(document.activeElement).toBe(hourField);
  });

  it('saves a log and returns focus to the hour field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-energy-hour'), '10'); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-energy-activity'), 'Second period math'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-energy-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-energy-history-heading"] ul > li')).toHaveLength(25);
    expect(host.textContent).toContain('Second period math');
    expect(document.activeElement?.id).toBe('learning-lab-energy-hour');
  });

  it('removes a log only after confirmation and moves focus to the history heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove energy log from 2026-07-19 at 3:00 PM');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this energy log?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-energy-history-heading"] ul > li')).toHaveLength(24);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove log').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-energy-history-heading"] ul > li')).toHaveLength(23);
    expect(host.textContent).not.toContain('After lunch');
    expect(document.activeElement?.id).toBe('learning-lab-energy-history-heading');
  });
});
