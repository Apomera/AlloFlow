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

describe('Learning Lab Achievement Wall rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkAchieve', viewLabel: 'Achievement Wall',
      mytkAchieve: { achievements: [
        { id: 'a1', title: 'Finished my first 5K', category: 'athletic', date: '2026-06-20', reflection: 'Trained for two months.' },
        { id: 'a2', title: null, category: 'bogus-category', date: null, reflection: 42 },
        null,
        'legacy-invalid-achievement'
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

  it('renders guidance and the wall over malformed records with safe fallbacks', () => {
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.textContent).toContain('Use your own definition of achievement');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-achievement-history-heading"] ul > li')).toHaveLength(2);
    expect(host.textContent).toContain('Finished my first 5K');
    expect(host.textContent).toContain('Untitled achievement');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).toContain('42');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('bogus');
  });

  it('validates title and future dates independently with focus on the first invalid field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-achievement-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const title = host.querySelector('#learning-lab-achievement-title');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-achievement-title-error')?.textContent).toContain('Describe the achievement you want to record.');
    expect(document.activeElement).toBe(title);

    await act(async () => { setValue(title, 'Learned to solder'); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-achievement-date'), '2199-01-01'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-achievement-date-error')?.textContent).toContain('Choose today or an earlier date.');
    expect(document.activeElement?.id).toBe('learning-lab-achievement-date');
  });

  it('saves an achievement with a chosen category and returns focus to the title field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-achievement-title'), 'Presented at the science fair'); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-achievement-category-creative').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-achievement-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-achievement-history-heading"] ul > li')).toHaveLength(3);
    expect(host.textContent).toContain('Presented at the science fair');
    expect(host.textContent).toContain('Creative');
    expect(host.querySelector('#learning-lab-achievement-title').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-achievement-title');
  });

  it('removes an achievement only after confirmation and moves focus to the history heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove achievement: Finished my first 5K');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this achievement?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-achievement-history-heading"] ul > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove achievement').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-achievement-history-heading"] ul > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Finished my first 5K');
    expect(document.activeElement?.id).toBe('learning-lab-achievement-history-heading');
  });
});
