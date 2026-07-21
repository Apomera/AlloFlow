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
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Letters to Future Self rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkFut', viewLabel: 'Letters to Future Self',
      mytkFut: { letters: [
        { id: 'l1', writtenOn: '2026-07-01', to: 'Future me', from: 'Past me', body: 'Remember to breathe.', deliverOn: '' },
        { id: 'l2', writtenOn: '2026-07-02', to: '', from: '', body: 'Sealed thoughts.', deliverOn: '2030-01-01' },
        { id: 'l3', writtenOn: null, to: null, from: null, body: null, deliverOn: null },
        null,
        'legacy-invalid-letter'
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

  it('lists every letter with sealed and open states, tolerating malformed records', () => {
    const items = host.querySelectorAll('ul[aria-label="Future-self letters"] > li');
    expect(items).toHaveLength(3);
    expect(host.textContent).toContain('Sealed until 2030-01-01');
    expect(host.textContent).toContain('Available to read');
    expect(host.textContent).toContain('on an unrecorded date');
    expect(host.textContent).not.toContain('null');
  });

  it('opens a readable letter with focus on the reading heading', async () => {
    await act(async () => { host.querySelector('#learning-lab-future-letter-l1').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-future-reading-heading');
    expect(host.textContent).toContain('Dear Future me,');
    expect(host.textContent).toContain('Remember to breathe.');
    expect(host.textContent).toContain('— Past me');
  });

  it('keeps a sealed letter closed with an honest countdown and no body leak', async () => {
    await act(async () => { host.querySelector('#learning-lab-future-letter-l2').click(); await settleFocus(); });
    expect(host.textContent).toContain('This letter is sealed');
    expect(host.textContent).toContain('It opens on 2030-01-01');
    expect(host.textContent).toMatch(/about \d+ days? from now/);
    expect(host.textContent).not.toContain('Sealed thoughts.');
    expect(host.textContent).not.toContain('NaN');
  });

  it('returns from reading to the originating letter control', async () => {
    await act(async () => { host.querySelector('#learning-lab-future-letter-l1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Back to letters').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-future-letter-l1');
  });

  it('requires a letter body, then saves an unsealed letter with non-notification guidance shown', async () => {
    await act(async () => { buttonByText(host, 'Write a letter').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-future-letter-to');
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    const form = host.querySelector('form[aria-labelledby="learning-lab-future-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const body = host.querySelector('#learning-lab-future-letter-body');
    expect(body.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(body);
    await act(async () => { setValue(body, 'You handled the hard week.'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Future-self letters"] > li')).toHaveLength(4);
    expect(document.activeElement?.id).toBe('learning-lab-future-write-button');
  });

  it('removes a letter only after confirmation and returns to the list', async () => {
    await act(async () => { host.querySelector('#learning-lab-future-letter-l1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Remove letter').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this future-self letter?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Remember to breathe.');

    await act(async () => { buttonByText(host, 'Remove letter').click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove letter').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Future-self letters"] > li')).toHaveLength(2);
    expect(host.textContent).not.toContain('Remember to breathe.');
    expect(document.activeElement?.id).toBe('learning-lab-future-write-button');
  });
});
