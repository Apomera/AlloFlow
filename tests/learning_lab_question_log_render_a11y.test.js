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

describe('Learning Lab Question Log rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkQuest', viewLabel: 'Question Log',
      mytkQuest: { questions: [
        { id: 'q1', createdAt: '2026-07-10', answered: false, answer: '', text: 'Why does the moon look bigger near the horizon?', subject: 'Science', context: 'Third period' },
        { id: 'q2', createdAt: '2026-07-05', answered: true, answer: 'It is an optical illusion.', answeredAt: '2026-07-06', text: 'Moon illusion follow-up', subject: '', context: '' },
        { id: 'q3', createdAt: null, answered: false, answer: null, text: null, subject: 42, context: null },
        null,
        'legacy-invalid-question'
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

  it('renders privacy guidance and the open filter with counts, tolerating malformed records', () => {
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.textContent).toContain('Open (2)');
    expect(host.textContent).toContain('Answered (1)');
    expect(host.textContent).toContain('All (3)');
    expect(host.textContent).toContain('Showing 2 open questions.');
    expect(host.textContent).toContain('Untitled question');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('NaN');
  });

  it('switches filters with an announced live status', async () => {
    await act(async () => { host.querySelector('#learning-lab-question-filter-answered').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Showing 1 answered question.');
    expect(host.textContent).toContain('It is an optical illusion.');
    await act(async () => { host.querySelector('#learning-lab-question-filter-all').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Showing 3 all questions.');
  });

  it('rejects a blank question with an inline alert and focuses the field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-question-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const text = host.querySelector('#learning-lab-question-text');
    expect(text.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-question-text-error')?.textContent).toContain('Enter the question you want to remember.');
    expect(document.activeElement).toBe(text);
  });

  it('saves a question and returns focus to the question field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-question-text'), 'What is a p-value really?'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-question-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Showing 3 open questions.');
    expect(host.textContent).toContain('What is a p-value really?');
    expect(host.querySelector('#learning-lab-question-text').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-question-text');
  });

  it('requires an answer before marking answered, then records it with focus recovery', async () => {
    const answerField = host.querySelector('#learning-lab-question-answer-q1');
    await act(async () => { answerField.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-question-answer-q1-error')?.textContent).toContain('Enter the answer before marking this question answered.');
    expect(document.activeElement?.id).toBe('learning-lab-question-answer-q1');
    await act(async () => { setValue(host.querySelector('#learning-lab-question-answer-q1'), 'Atmospheric refraction is not the cause; it is perceptual.'); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-question-answer-q1').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Showing 1 open question.');
    expect(document.activeElement?.id).toBe('learning-lab-question-results-heading');
    await act(async () => { host.querySelector('#learning-lab-question-filter-answered').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Atmospheric refraction is not the cause; it is perceptual.');
  });

  it('removes a question only after confirmation and moves focus to the results heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove question: Why does the moon look bigger near the horizon?');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this question?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Showing 2 open questions.');

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove question').click(); await settleFocus(); });
    expect(host.textContent).toContain('Showing 1 open question.');
    expect(host.textContent).not.toContain('moon look bigger');
    expect(document.activeElement?.id).toBe('learning-lab-question-results-heading');
  });
});
