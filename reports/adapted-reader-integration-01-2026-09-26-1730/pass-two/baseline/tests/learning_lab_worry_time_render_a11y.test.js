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

const olderResolved = Array.from({ length: 11 }, (_, index) => ({
  id: 'res-' + index, text: 'Old worry ' + (index + 1), createdAt: 1778000000000 + index, resolved: true, status: 'notControl', action: ''
}));

describe('Learning Lab Worry Time rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkWorry', viewLabel: 'Worry Time',
      mytkWorry: { worries: [
        { id: 'w1', text: 'Big test on Friday', createdAt: 1782500000000, resolved: false, action: '' },
        { id: 'w2', text: null, createdAt: null, resolved: false, action: null },
        { id: 'w3', text: 'Argument with a friend', createdAt: 1782400000000, resolved: true, status: 'inMyControl', action: 'Text them tonight' },
        null,
        'legacy-invalid-worry',
        ...olderResolved
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

  it('renders self-help guidance and every worry, tolerating malformed records', () => {
    expect(host.textContent).toContain('A self-help practice, not crisis support');
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(2);
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-processed-heading"] ul > li')).toHaveLength(12);
    expect(host.textContent).toContain('Saved worry');
    expect(host.textContent).toContain('Old worry 11');
    expect(host.textContent).toContain('Next action');
    expect(host.textContent).toContain('Text them tonight');
    expect(host.textContent).not.toContain('null');
  });

  it('rejects a blank worry with an inline alert and keeps focus on the input', async () => {
    const input = host.querySelector('#learning-lab-worry-input');
    await act(async () => { input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-worry-input-error')?.textContent).toContain('Write the worry you want to save for later.');
    expect(document.activeElement).toBe(host.querySelector('#learning-lab-worry-input'));
  });

  it('saves a worry and lists it among open worries', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-worry-input'), 'Forgot my homework'); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-worry-input').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(3);
    expect(host.textContent).toContain('Forgot my homework');
    expect(host.querySelector('#learning-lab-worry-input').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-worry-input');
  });

  it('processes a worry through the control triage and records the next action', async () => {
    await act(async () => { host.querySelector('#learning-lab-worry-process-w1').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-worry-processor-heading');
    expect(host.textContent).toContain('Big test on Friday');
    const submit = buttonByText(host, 'Mark worry processed');
    expect(submit.disabled).toBe(true);
    await act(async () => { host.querySelector('#learning-lab-worry-control-inMyControl').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-worry-next-action'), 'Make a 20-minute study plan'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Mark worry processed').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(1);
    expect(host.textContent).toContain('Make a 20-minute study plan');
    expect(host.textContent).toContain('In my control');
  });

  it('returns from the processor without processing and restores focus', async () => {
    await act(async () => { host.querySelector('#learning-lab-worry-process-w1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Back to worries').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-worry-process-w1');
  });

  it('removes a worry only after confirmation', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove worry: Big test on Friday');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this worry?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove worry').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-worry-open-heading"] ul > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Big test on Friday');
    expect(document.activeElement?.id).toBe('learning-lab-worry-input');
  });
});
