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

describe('Learning Lab Parent Message Builder rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkParent', viewLabel: 'Parent or Guardian Message Builder',
      mytkParent: { drafts: [
        { id: 'p1', date: '2026-07-14', type: 'thanks', templateLabel: 'Share appreciation', body: 'Thanks for helping with my project.' },
        { id: 'p2', date: null, type: null, templateLabel: null, body: null },
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

  it('renders safety honesty, templates, and saved drafts over malformed records', () => {
    expect(host.textContent).toContain('This tool does not address, send, or monitor messages.');
    expect(host.textContent).toContain('contact local emergency or crisis services now');
    expect(host.querySelectorAll('ul[aria-label="Parent or guardian message templates"] > li')).toHaveLength(6);
    expect(host.querySelectorAll('ul[aria-label="Most recent saved message drafts"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Share appreciation draft');
    expect(host.textContent).toContain('Message draft');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
  });

  it('opens a template with focus and live recipient substitution', async () => {
    await act(async () => { host.querySelector('#learning-lab-message-template-mh').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-message-editor-heading');
    expect(host.querySelector('#learning-lab-message-body').value).toContain('[Recipient]');
    await act(async () => { setValue(host.querySelector('#learning-lab-message-recipient'), 'Mom'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-message-body').value).toContain('Hi Mom,');
  });

  it('rejects an empty body and confirms before discarding edits', async () => {
    await act(async () => { host.querySelector('#learning-lab-message-template-boundary').click(); await settleFocus(); });
    const body = host.querySelector('#learning-lab-message-body');
    await act(async () => { setValue(body, ''); await Promise.resolve(); });
    await act(async () => { body.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-message-body-error')?.textContent).toContain('Enter or keep message text before saving the draft.');
    expect(document.activeElement?.id).toBe('learning-lab-message-body');
    await act(async () => { buttonByText(host, 'Back to templates').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard this message draft?');
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-message-template-heading');
  });

  it('saves a draft and lists it, then removes it only after confirmation', async () => {
    await act(async () => { host.querySelector('#learning-lab-message-template-iep').click(); await settleFocus(); });
    await act(async () => { host.querySelector('#learning-lab-message-body').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent saved message drafts"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Talk about an IEP or 504 plan draft');

    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove saved Talk about an IEP or 504 plan draft');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this saved draft?');
    await act(async () => { buttonByText(dialog, 'Remove draft').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent saved message drafts"] > li')).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-message-saved-heading');
  });
});
