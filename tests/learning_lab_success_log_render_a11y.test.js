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

describe('Learning Lab Success Log rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkSuccess', viewLabel: 'Success Log',
      mytkSuccess: { successes: [
        { id: 's1', date: '2026-07-15', text: 'Asked a question in class', size: 'tiny', category: 'social' },
        { id: 's2', date: null, text: null, size: 'bogus-size', category: 'bogus-category' },
        null,
        'legacy-invalid-entry'
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

  it('renders guidance, counts, and history over malformed records with safe fallbacks', () => {
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.textContent).toContain('2 successes recorded.');
    expect(host.querySelectorAll('ul[aria-label="Most recent success entries"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Asked a question in class');
    expect(host.textContent).toContain('Untitled success');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('bogus');
  });

  it('rejects a blank entry with an inline alert and focuses the field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-success-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const text = host.querySelector('#learning-lab-success-text');
    expect(text.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-success-text-error')?.textContent).toContain('Describe the progress or success you want to record.');
    expect(document.activeElement).toBe(text);
  });

  it('saves an entry with chosen size and category, updating the live count', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-success-text'), 'Finished my lab report early'); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-success-size-big').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-success-category-academic').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-success-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('3 successes recorded.');
    expect(host.textContent).toContain('Finished my lab report early');
    expect(host.textContent).toContain('Academic · Big success');
    expect(host.querySelector('#learning-lab-success-text').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-success-text');
  });

  it('removes an entry only after confirmation and moves focus to the history heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove success entry: Asked a question in class');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this success entry?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('2 successes recorded.');

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove entry').click(); await settleFocus(); });
    expect(host.textContent).toContain('1 success recorded.');
    expect(host.textContent).not.toContain('Asked a question in class');
    expect(document.activeElement?.id).toBe('learning-lab-success-history-heading');
  });
});
