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

describe('Learning Lab Role Models rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkRole', viewLabel: 'Role Models',
      mytkRole: { models: [
        { id: 'r1', addedAt: '2026-07-01', name: 'My grandmother', who: 'Retired nurse', admire: 'Steady under pressure.', icon: '🌼' },
        { id: 'r2', addedAt: null, name: null, who: null, admire: null, icon: null },
        null,
        'legacy-invalid-model'
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

  it('renders guidance and the gallery over malformed records with safe fallbacks', () => {
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-role-model-history-heading"] ul > li')).toHaveLength(2);
    expect(host.textContent).toContain('My grandmother');
    expect(host.textContent).toContain('Unnamed role model');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).toContain('Steady under pressure.');
    expect(host.textContent).not.toContain('null');
  });

  it('requires a name and returns focus to the name field on failure and success', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-role-model-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const name = host.querySelector('#learning-lab-role-model-name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-role-model-name-error')?.textContent).toContain('name');
    expect(document.activeElement).toBe(name);
    await act(async () => { setValue(name, 'Ms. Frizzle'); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-role-model-admire'), 'Curiosity first, always.'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-role-model-history-heading"] ul > li')).toHaveLength(3);
    expect(host.textContent).toContain('Ms. Frizzle');
    expect(host.textContent).toContain('Curiosity first, always.');
    expect(document.activeElement?.id).toBe('learning-lab-role-model-name');
  });

  it('removes a role model only after confirmation and moves focus to the gallery heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove role model: My grandmother');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this role model?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-role-model-history-heading"] ul > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove role model').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-role-model-history-heading"] ul > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('My grandmother');
    expect(document.activeElement?.id).toBe('learning-lab-role-model-history-heading');
  });
});
