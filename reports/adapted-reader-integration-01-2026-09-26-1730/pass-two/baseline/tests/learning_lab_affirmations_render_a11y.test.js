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

describe('Learning Lab Affirmation Library rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkAffirm', viewLabel: 'Affirmation Library',
      mytkAffirm: {
        custom: ['Legacy plain-string affirmation', { id: 'c9', text: 'I can restart a hard task.' }],
        favorites: 'legacy-bad-favorites',
        preservedSibling: true
      }
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

  it('renders honest framing, the daily prompt, and the library over malformed favorites', () => {
    expect(host.textContent).toContain('These are optional reflection prompts, not promises or treatment.');
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.textContent).toContain('Today’s optional prompt');
    expect(host.querySelectorAll('ul[aria-label="17 affirmations"] > li')).toHaveLength(17);
    expect(host.textContent).toContain('Legacy plain-string affirmation');
    expect(host.textContent).toContain('I can restart a hard task.');
    expect(host.textContent).toContain('0 favorites.');
  });

  it('adds a custom affirmation after validation and returns focus to the field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-affirmation-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const field = host.querySelector('#learning-lab-affirmation-new');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-affirmation-new-error')?.textContent).toContain('Enter words you want to add to your library.');
    expect(document.activeElement).toBe(field);
    await act(async () => { setValue(field, 'One question at a time.'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="18 affirmations"] > li')).toHaveLength(18);
    expect(host.textContent).toContain('One question at a time.');
    expect(document.activeElement?.id).toBe('learning-lab-affirmation-new');
  });

  it('toggles favorites with a live count and label-based state', async () => {
    const addFavorite = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Add to favorites: My pace is my pace.');
    await act(async () => { addFavorite.click(); await Promise.resolve(); });
    expect(host.textContent).toContain('1 favorite.');
    const nowFavorited = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove from favorites: My pace is my pace.');
    expect(nowFavorited?.textContent).toBe('Favorited');
    await act(async () => { nowFavorited.click(); await Promise.resolve(); });
    expect(host.textContent).toContain('0 favorites.');
  });

  it('removes a custom affirmation only after confirmation, keeping built-ins undeletable', async () => {
    const builtinRemove = Array.from(host.querySelectorAll('button')).find((button) => (button.getAttribute('aria-label') || '') === 'Remove custom affirmation: My pace is my pace.');
    expect(builtinRemove).toBeUndefined();
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove custom affirmation: Legacy plain-string affirmation');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this affirmation?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="17 affirmations"] > li')).toHaveLength(17);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove affirmation').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="16 affirmations"] > li')).toHaveLength(16);
    expect(host.textContent).not.toContain('Legacy plain-string affirmation');
    expect(host.textContent).toContain('I can restart a hard task.');
    expect(document.activeElement?.id).toBe('learning-lab-affirmation-library-heading');
  });
});
