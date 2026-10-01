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

describe('Learning Lab Body Awareness rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkBody', viewLabel: 'Body Awareness',
      mytkBody: { checks: [
        { id: 'b1', date: '2026-07-15', time: 1782600000000, areas: { head: 7, stomach: 3 }, overall: 6, note: 'Tense before the quiz' },
        { id: 'b2', date: null, time: null, areas: 'legacy-bad-areas', overall: 'high', note: 42 },
        null,
        'legacy-invalid-check'
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

  it('renders non-medical framing, the form, and history over malformed records', () => {
    expect(host.textContent).toContain('Personal reflection, not a medical assessment');
    expect(host.textContent).toContain('This check cannot explain or diagnose symptoms.');
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.querySelectorAll('input[type="range"]')).toHaveLength(9);
    expect(host.querySelectorAll('ul[aria-label="Most recent body comfort checks"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Tense before the quiz');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('NaN');
  });

  it('clamps malformed ratings to the neutral default in history details', () => {
    const details = host.querySelectorAll('details');
    expect(details.length).toBeGreaterThanOrEqual(2);
    expect(host.textContent).toContain('Overall comfort: 5 out of 10');
    expect(host.textContent).toContain('Overall comfort: 6 out of 10');
    expect(host.textContent).toContain('42');
  });

  it('saves a body check and switches to the completed state with focus on history', async () => {
    const stomach = host.querySelector('#learning-lab-body-area-stomach');
    await act(async () => { setValue(stomach, '2'); stomach.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-body-note'), 'Skipped breakfast'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-body-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Today’s body check is recorded');
    expect(host.querySelector('form[aria-labelledby="learning-lab-body-form-heading"]')).toBeNull();
    expect(host.querySelectorAll('ul[aria-label="Most recent body comfort checks"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Skipped breakfast');
    expect(document.activeElement?.id).toBe('learning-lab-body-history-heading');
  });

  it('removes a check only after confirmation', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove body check from 2026-07-15');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this body check?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent body comfort checks"] > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove check').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent body comfort checks"] > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Tense before the quiz');
    expect(document.activeElement?.id).toBe('learning-lab-body-history-heading');
  });
});
