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

describe('Learning Lab Vocabulary Builder rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkVocab', viewLabel: 'Vocabulary Builder',
      mytkVocab: { lists: [
        { id: 'l1', name: 'Biology terms', createdAt: '2026-07-01', words: [
          { id: 'w1', word: 'Osmosis', definition: 'Movement of water across a membrane.', sentence: 'Osmosis moves water into the cell.', mastery: 3 },
          { id: 'w2', word: null, definition: null, sentence: null, mastery: 'high' },
          'legacy-invalid-word'
        ] },
        { id: 'l2', name: null, createdAt: 'not-a-date', words: 'legacy-bad-words' },
        'legacy-invalid-list'
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

  it('renders local-only guidance and survives malformed lists and words', () => {
    expect(host.textContent).toContain('Vocabulary Builder');
    expect(host.textContent).toContain('Quiz scores and mastery stars are self-ratings to guide your own practice, not grades.');
    expect(host.querySelectorAll('ul[aria-label="Vocabulary lists"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Untitled list');
    expect(host.textContent).toContain('2 words');
    expect(host.textContent).toContain('0 words');
    expect(host.textContent).not.toContain('null');
  });

  it('validates the required list name inline and moves focus to it', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-vocab-new-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const name = host.querySelector('#learning-lab-vocab-new-list');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-vocab-list-error')?.textContent).toContain('Enter a name for the vocabulary list.');
    expect(document.activeElement).toBe(name);
  });

  it('opens a list, clamps malformed mastery, and shows word records safely', async () => {
    await act(async () => { host.querySelector('#learning-lab-vocab-open-l1').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-vocab-list-heading');
    expect(host.textContent).toContain('2 words');
    expect(host.textContent).toContain('Osmosis');
    expect(host.textContent).toContain('Untitled word');
    expect(host.textContent).toContain('Mastery: 3 of 5');
    expect(host.textContent).toContain('Mastery: 0 of 5');
    expect(host.textContent).not.toContain('null');
  });

  it('reports word and definition errors independently and focuses the first invalid field', async () => {
    await act(async () => { host.querySelector('#learning-lab-vocab-open-l1').click(); await settleFocus(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-vocab-add-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-vocab-word-error')?.textContent).toContain('Enter a vocabulary word.');
    expect(host.querySelector('#learning-lab-vocab-definition-error')?.textContent).toContain('Enter a definition.');
    expect(document.activeElement?.id).toBe('learning-lab-vocab-word');
  });

  it('adds a word and returns focus to the word field', async () => {
    await act(async () => { host.querySelector('#learning-lab-vocab-open-l1').click(); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-vocab-word'), 'Diffusion'); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-vocab-definition'), 'Movement from high to low concentration.'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-vocab-add-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('3 words');
    expect(host.textContent).toContain('Diffusion');
    expect(host.querySelector('#learning-lab-vocab-word').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-vocab-word');
  });

  it('quizzes only fully formed words and updates mastery from self-rating', async () => {
    await act(async () => { host.querySelector('#learning-lab-vocab-open-l1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Start quiz').click(); await settleFocus(); });
    expect(host.textContent).toContain('Word 1 of 1');
    expect(document.activeElement?.id).toBe('learning-lab-vocab-quiz-question');
    expect(host.querySelector('#learning-lab-vocab-quiz-question')?.textContent).toBe('Osmosis');
    await act(async () => { buttonByText(host, 'Show definition').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-vocab-quiz-answer-heading');
    expect(host.textContent).toContain('Movement of water across a membrane.');
    await act(async () => { buttonByText(host, 'I knew it').click(); await settleFocus(); });
    expect(host.textContent).toContain('Mastery: 4 of 5');
    expect(document.activeElement?.id).toBe('learning-lab-vocab-start-quiz');
  });

  it('deletes a word only after confirmation', async () => {
    await act(async () => { host.querySelector('#learning-lab-vocab-open-l1').click(); await settleFocus(); });
    const deleteWord = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete vocabulary word: Osmosis');
    await act(async () => { deleteWord.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this vocabulary word?');
    await act(async () => { buttonByText(dialog, 'Delete word').click(); await settleFocus(); });
    expect(host.textContent).toContain('1 word');
    expect(host.textContent).not.toContain('Osmosis');
    expect(document.activeElement?.id).toBe('learning-lab-vocab-word');
  });

  it('deletes a list only after confirmation and returns focus to the creation field', async () => {
    const deleteList = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete vocabulary list: Biology terms');
    await act(async () => { deleteList.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this vocabulary list?');
    expect(dialog?.textContent).toContain('Biology terms');
    await act(async () => { buttonByText(dialog, 'Delete list').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Vocabulary lists"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-vocab-new-list');
  });
});
