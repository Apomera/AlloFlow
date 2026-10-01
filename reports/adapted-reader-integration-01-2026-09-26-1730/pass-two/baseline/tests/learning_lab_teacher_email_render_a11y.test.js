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

describe('Learning Lab Teacher Email Builder rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkEmail', viewLabel: 'Teacher Email Builder',
      mytkEmail: { saved: [
        { id: 'd1', date: '2026-07-15', type: 'missed', templateLabel: 'Missed class', body: 'Hi Ms. Rivera, I was out Monday.' },
        { id: 'd2', date: null, type: null, templateLabel: null, body: null },
        null,
        'legacy-invalid-draft'
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

  it('renders templates, non-sending honesty, and saved drafts over malformed records', () => {
    expect(host.textContent).toContain('This tool prepares text only. It does not address, send, or submit an email.');
    expect(host.querySelectorAll('ul[aria-label="Teacher email templates"] > li')).toHaveLength(6);
    expect(host.querySelectorAll('ul[aria-label="Most recent saved email drafts"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Missed class draft');
    expect(host.textContent).toContain('Email draft');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
  });

  it('opens a template with focus on the editor and live placeholder substitution', async () => {
    await act(async () => { host.querySelector('#learning-lab-email-template-extension').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-email-editor-heading');
    const body = host.querySelector('#learning-lab-email-body');
    expect(body.value).toContain('[ASSIGNMENT]');
    await act(async () => { setValue(host.querySelector('#learning-lab-email-teacher'), 'Mr. Chen'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-email-body').value).toContain('Hi Mr. Chen,');
    await act(async () => { setValue(host.querySelector('#learning-lab-email-name'), 'Sam'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-email-body').value).toContain('Sam');
  });

  it('rejects an empty body for save and copy, and offers manual copy when the clipboard is unavailable', async () => {
    await act(async () => { host.querySelector('#learning-lab-email-template-thanks').click(); await settleFocus(); });
    const body = host.querySelector('#learning-lab-email-body');
    await act(async () => { setValue(body, ''); await Promise.resolve(); });
    await act(async () => { body.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-email-body-error')?.textContent).toContain('Enter or keep email text before saving the draft.');
    expect(document.activeElement?.id).toBe('learning-lab-email-body');
    await act(async () => { setValue(host.querySelector('#learning-lab-email-body'), 'Thank you for the extra help this week.'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Copy email').click(); await settleFocus(); });
    expect(host.textContent).toMatch(/copied|selected/i);
  });

  it('confirms before discarding an edited draft when going back', async () => {
    await act(async () => { host.querySelector('#learning-lab-email-template-help').click(); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-email-teacher'), 'Ms. Okafor'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Back to templates').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard this email draft?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-email-body')).not.toBeNull();
    await act(async () => { buttonByText(host, 'Back to templates').click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Discard changes').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-email-template-heading');
  });

  it('saves a draft and returns to the template list with it listed', async () => {
    await act(async () => { host.querySelector('#learning-lab-email-template-grade').click(); await settleFocus(); });
    await act(async () => { host.querySelector('#learning-lab-email-body').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent saved email drafts"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Asking about a grade draft');
  });

  it('removes a saved draft only after confirmation', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove saved Missed class draft');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this saved draft?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent saved email drafts"] > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove draft').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent saved email drafts"] > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Missed class draft');
    expect(document.activeElement?.id).toBe('learning-lab-email-saved-heading');
  });
});
