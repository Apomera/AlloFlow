import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Learning Lab Reflection Prompts rendered accessibility states', () => {
  let host;
  let root;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkPrompts', viewLabel: 'Reflection Prompts', mytkPrompts: {
      responses: [{ id: 'response-1', promptId: 'mc1', promptText: 'What did I learn?', text: 'I learned to ask a clearer question.', date: today }], preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders privacy guidance and four semantic category lists with 30 prompts', () => {
    expect(host.querySelector('#learning-lab-reflection-library-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-reflection-library-privacy')).not.toBeNull();
    expect(host.querySelectorAll('section[aria-labelledby^="learning-lab-reflection-category-"]')).toHaveLength(4);
    expect(host.querySelectorAll('section[aria-labelledby^="learning-lab-reflection-category-"] li > button')).toHaveLength(30);
    expect(host.textContent).toContain('1 saved response');
  });

  it('opens a prompt with focus and a labelled bounded native form', async () => {
    const prompt = host.querySelector('section[aria-labelledby="learning-lab-reflection-category-metacog"] li button');
    await act(async () => { prompt.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reflection-answer-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-reflection-answer-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-reflection-response"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-reflection-response')?.maxLength).toBe(4000);
    expect(host.querySelector('#learning-lab-reflection-response')?.getAttribute('aria-describedby')).toContain('learning-lab-reflection-privacy');
  });

  it('reports an empty response and focuses its textarea', async () => {
    await act(async () => { host.querySelector('section[aria-labelledby="learning-lab-reflection-category-metacog"] li button').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-reflection-answer-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-reflection-response-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-reflection-response')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-reflection-response');
  });

  it('saves a response and restores library-heading focus', async () => {
    await act(async () => { host.querySelector('section[aria-labelledby="learning-lab-reflection-category-metacog"] li button').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-reflection-response'), 'A new reflection.'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-reflection-answer-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reflection-library-heading');
    expect(host.textContent).toContain('2 saved responses');
  });

  it('renders semantic history with dates, text, and deletion', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'View saved responses').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reflection-history-heading');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-reflection-history-heading"] > li')).toHaveLength(1);
    expect(host.querySelector('article time[datetime="' + today + '"]')).not.toBeNull();
    expect(host.querySelector('article h3')?.textContent).toBe('What did I learn?');
    expect(host.querySelector('article p:last-child')?.textContent).toBe('I learned to ask a clearer question.');
  });

  it('confirms deletion and restores the history back button when empty', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'View saved responses').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete reflection response from ' + today + '"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete response');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('ul[aria-labelledby="learning-lab-reflection-history-heading"]')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-reflection-history-back');
  });
});
