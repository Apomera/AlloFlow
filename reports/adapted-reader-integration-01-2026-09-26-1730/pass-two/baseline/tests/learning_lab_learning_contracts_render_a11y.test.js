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

describe('Learning Lab Learning Contracts rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkContract', viewLabel: 'Learning Contracts',
      mytkContract: { contracts: [
        { id: 'k1', signed: false, title: 'Read 20 minutes daily', commitments: ['Read before bed'], rewards: 'Weekend movie', accountability: 'Check in with Dad', startDate: '2026-07-01', endDate: '2026-08-01' },
        { id: 'k2', signed: true, signedAt: '2026-07-05', title: null, commitments: 'legacy-bad-commitments', rewards: null, accountability: null, startDate: null, endDate: null },
        null,
        'legacy-invalid-contract'
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

  it('lists contracts with signed state and fallbacks over malformed records', () => {
    const items = host.querySelectorAll('section[aria-labelledby="learning-lab-contract-list-heading"] > ul > li');
    expect(items).toHaveLength(2);
    expect(host.textContent).toContain('Read 20 minutes daily');
    expect(host.textContent).toContain('Untitled contract');
    expect(host.textContent).toContain('Signed contract');
    expect(host.textContent).toContain('Unsigned contract');
    expect(host.textContent).toContain('No commitments were recorded in this legacy contract.');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
  });

  it('validates the editor and saves a contract with commitments and non-notification guidance', async () => {
    await act(async () => { buttonByText(host, 'New contract').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-contract-editor-heading');
    expect(host.textContent).toContain('saving does not send them to or notify anyone, including a check-in person you name');
    const form = host.querySelector('form[aria-labelledby="learning-lab-contract-editor-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-contract-title-error')?.textContent).toContain('Enter a title for this learning contract.');
    expect(document.activeElement?.id).toBe('learning-lab-contract-title');
    await act(async () => { setValue(host.querySelector('#learning-lab-contract-title'), 'Math practice plan'); await Promise.resolve(); });
    const commitmentInput = host.querySelector('input[id^="learning-lab-contract-commitment-"]');
    await act(async () => { setValue(commitmentInput, 'Ten minutes of practice problems'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-contract-list-heading"] > ul > li')).toHaveLength(3);
    expect(host.textContent).toContain('Math practice plan');
    expect(host.textContent).toContain('Ten minutes of practice problems');
  });

  it('confirms before discarding a dirty draft', async () => {
    await act(async () => { buttonByText(host, 'New contract').click(); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-contract-title'), 'Half-finished idea'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard this contract draft?');
    await act(async () => { buttonByText(dialog, 'Discard draft').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-contract-new');
  });

  it('signs a contract only after confirmation, recording the signed date', async () => {
    await act(async () => { buttonByText(host, 'Sign contract').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Sign this learning contract?');
    expect(dialog?.textContent).toContain('Read 20 minutes daily');
    await act(async () => { buttonByText(dialog, 'Sign contract').click(); await settleFocus(); });
    expect(host.textContent).not.toContain('Unsigned contract');
    expect(buttonByText(host, 'Sign contract')).toBeUndefined();
  });

  it('deletes a contract only after confirmation', async () => {
    const deleteButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete learning contract: Read 20 minutes daily');
    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this learning contract?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-contract-list-heading"] > ul > li')).toHaveLength(2);

    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Delete contract').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-contract-list-heading"] > ul > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Read 20 minutes daily');
    expect(document.activeElement?.id).toBe('learning-lab-contract-list-heading');
  });
});
