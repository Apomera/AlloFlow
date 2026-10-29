import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = [
  ['source', ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n')],
  ['runtime', readFileSync('word_practice_module.js', 'utf8')],
];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const button = (scope, text) => [...scope.querySelectorAll('button')].find(node => node.textContent === text && !node.closest('[hidden]'));
const select = (scope, label) => [...scope.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('select');
function change(win, node, value) { node.value = value; node.dispatchEvent(new win.Event('change', { bubbles: true })); }
function open(source, input) {
  const win = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' }).window;
  windows.push(win); win.eval(source); win.Audio = vi.fn(); win.fetch = vi.fn(); win.AlloModules.WordPractice.open(input);
  const doc = win.document;
  return { win, doc, preview: doc.querySelector('.awp-card-preview'), controls: doc.querySelector('.awp-appearance'), activity: select(doc, 'Practice activity') };
}
const words = [
  { id: 'leaf', word: 'hoja', termLanguage: 'Spanish', definition: 'A plant part.', definitionLanguage: 'English', translations: { Arabic: 'ورقة', Japanese: '葉' }, phonemes: [{ label: 'ho' }, { label: 'ja' }] },
  { id: 'root', word: 'raíz', termLanguage: 'Spanish', definition: '吸收水分。', definitionLanguage: 'Chinese', sentenceActivity: { prompt: 'La ____ absorbe agua.', language: 'Spanish', choices: ['raíz', 'hoja'], answer: 'raíz' } },
];

describe.each(sources)('activity-aware preview (%s)', (_, source) => {
  it('matches each activity’s first stage and reveals answers only on request', () => {
    const { win, doc, preview, controls, activity } = open(source, { words, options: { mode: 'vocabulary', shuffle: false } });
    expect(preview.textContent).toBe('hoja');
    button(controls, 'Show meaning').click();
    expect(preview.querySelector('.awp-preview-definition').lang).toBe('en');
    expect(preview.querySelector('.awp-preview-translation[lang=ar]').dir).toBe('rtl');
    change(win, activity, 'blend');
    expect([...preview.querySelectorAll('.awp-preview-sound')].map(node => node.textContent)).toEqual(['ho', 'ja']);
    expect(preview.querySelector('.awp-preview-word')).toBeNull();
    button(controls, 'Show word').click(); expect(preview.textContent).toBe('hoja');
    change(win, activity, 'spelling');
    expect(preview.textContent).toBe('Ask your teacher to say the word, then spell it.');
    expect(preview.textContent).not.toContain('hoja');
    button(controls, 'Reveal answer').click(); expect(preview.textContent).toBe('hoja');
    change(win, activity, 'sentence');
    expect(doc.querySelector('.awp-preview-progress').textContent).toBe('Card 1 of 1');
    expect(preview.querySelector('.awp-preview-prompt').textContent).toBe('La ____ absorbe agua.');
    expect(preview.querySelector('.awp-preview-prompt').lang).toBe('es');
    expect([...preview.querySelectorAll('.awp-preview-choice')].map(node => node.textContent)).toEqual(['raíz', 'hoja']);
    expect(preview.querySelector('.awp-preview-feedback')).toBeNull();
    button(controls, 'Reveal answer').click();
    expect(preview.querySelector('.awp-preview-feedback').textContent).toBe('Answer: raíz');
    expect(preview.querySelector('.awp-preview-feedback span').lang).toBe('es');
    change(win, activity, 'popup'); expect(preview.textContent).toBe('raíz');
    expect(button(controls, 'Reveal answer')).toBeUndefined();
    expect(win.Audio).not.toHaveBeenCalled(); expect(win.fetch).not.toHaveBeenCalled();
  });

  it('keeps the selected entry and revealed content through reordering, styling and duplicate meanings', () => {
    const duplicates = [{ id: 'river-bank', word: 'bank', definition: 'The side of a river.' }, { id: 'money-bank', word: 'bank', definition: 'A place that holds money.' }, { id: 'leaf', word: 'leaf', definition: 'A plant part.' }];
    const { win, doc, controls, preview } = open(source, { words: duplicates, options: { mode: 'vocabulary' } });
    expect(button(controls, 'Previous').disabled).toBe(true);
    button(controls, 'Next').click(); button(controls, 'Show meaning').click();
    expect(preview.querySelector('.awp-preview-definition').textContent).toBe('A place that holds money.');
    const passage = preview.querySelector('.awp-preview-definition'); preview.scrollTop = 80;
    const font = select(controls, 'Card font'); font.focus(); change(win, font, 'georgia');
    expect(doc.activeElement).toBe(font); expect(preview.querySelector('.awp-preview-definition')).toBe(passage); expect(preview.scrollTop).toBe(80);
    change(win, doc.querySelector('textarea'), 'leaf\nbank\nbank');
    expect(doc.querySelector('.awp-preview-progress').textContent).toBe('Card 3 of 3');
    expect(preview.querySelector('.awp-preview-definition').textContent).toBe('A place that holds money.');
    expect(preview.dataset.awpCardFont).toBe('georgia'); expect(button(controls, 'Next').disabled).toBe(true);
    button(controls, 'Previous').click();
    expect(preview.querySelector('.awp-preview-definition')).toBeNull();
    button(controls, 'Show meaning').click(); expect(preview.querySelector('.awp-preview-definition').textContent).toBe('The side of a river.');
  });

  it('shows a useful empty state and never previews an excluded sentence item', () => {
    const { win, doc, preview, controls, activity } = open(source, { words, options: { mode: 'sentence' } });
    expect(preview.textContent).not.toContain('A plant part.');
    change(win, doc.querySelector('textarea'), 'hoja');
    expect(preview.textContent).toContain('No prepared sentence activities are available.');
    expect(doc.querySelector('.awp-preview-toolbar').hidden).toBe(true);
    change(win, activity, 'blend'); expect(preview.querySelector('.awp-preview-sounds')).not.toBeNull();
    change(win, doc.querySelector('textarea'), 'new word');
    expect(preview.textContent).toBe('new word'); expect(button(controls, 'Show word')).toBeUndefined();
    change(win, doc.querySelector('textarea'), ''); expect(preview.textContent).toBe('Add at least one word to begin.');
  });

  it('moves keyboard focus to the preview when navigation or reveal disables its focused button', () => {
    const { doc, preview, controls } = open(source, { words, options: { mode: 'vocabulary' } });
    const next = button(controls, 'Next'); next.focus(); next.click();
    expect(next.disabled).toBe(true); expect(doc.activeElement).toBe(preview);
    const reveal = button(controls, 'Show meaning'); reveal.focus(); reveal.click();
    expect(reveal.disabled).toBe(true); expect(doc.activeElement).toBe(preview);
    const previous = button(controls, 'Previous'); previous.focus(); previous.click();
    expect(previous.disabled).toBe(true); expect(doc.activeElement).toBe(preview);
  });

  it('merges partial offline overrides with the saved appearance and practice settings', () => {
    const { win } = open(source, { words: ['seed'] });
    const saved = { words: [words[0]], options: { mode: 'vocabulary', repetitions: 3, shuffle: false, cardFont: 'georgia', cardTextScale: 1.4, cardTheme: 'cream' } };
    for (const overrides of [undefined, {}, { includeAudio: false }]) {
      const offline = new JSDOM(win.AlloModules.WordPractice.buildHtml(saved, overrides), { runScripts: 'dangerously' }).window; windows.push(offline);
      const doc = offline.document;
      expect(doc.querySelector('.awp-stage').dataset.awpCardFont).toBe('georgia');
      expect(doc.querySelector('.awp-stage').style.getPropertyValue('--awp-card-background')).toBe('#FFF8E8');
      expect(select(doc, 'Card text size').value).toBe('1.4');
      expect(doc.querySelector('.awp-progress').textContent).toBe('Card 1 of 3');
      expect(button(doc, 'Show meaning')).toBeTruthy();
      if (overrides?.includeAudio === false) expect(button(doc, 'Hear word')).toBeUndefined();
    }
  });

  it('jumps directly to any of200 cards while preserving its ID, appearance, focus and revealed content through edits', () => {
    const entries = Array.from({ length: 200 }, (_, index) => ({ id: 'item-' + index, word: 'Word ' + index, definition: 'Meaning ' + index }));
    const { win, doc, controls, preview } = open(source, { words: entries, options: { mode: 'vocabulary', shuffle: false } });
    const picker = doc.querySelector('.awp-preview-picker'); expect(picker.options).toHaveLength(200); expect(picker.hidden).toBe(false);
    picker.focus(); change(win, picker, 'item-199');
    expect(doc.activeElement).toBe(picker); expect(preview.textContent).toBe('Word 199'); expect(doc.querySelector('.awp-preview-progress').textContent).toBe('Card 200 of 200');
    button(controls, 'Show meaning').click(); const passage = preview.querySelector('.awp-preview-definition'), lastOption = picker.options[199];
    change(win, select(controls, 'Card font'), 'georgia');
    expect(picker.options[199]).toBe(lastOption); expect(preview.querySelector('.awp-preview-definition')).toBe(passage);
    change(win, doc.querySelector('textarea'), 'Word 199\nWord 0');
    expect(picker.value).toBe('item-199'); expect(doc.querySelector('.awp-preview-progress').textContent).toBe('Card 1 of 2'); expect(preview.querySelector('.awp-preview-definition').textContent).toBe('Meaning 199');
    expect(preview.dataset.awpCardFont).toBe('georgia'); button(controls, 'Next').click(); expect(picker.value).toBe('item-0');
    expect(win.Audio).not.toHaveBeenCalled(); expect(win.fetch).not.toHaveBeenCalled();
  });

  it('distinguishes duplicate entries by language and meaning while keeping answer-first activities concealed', () => {
    const entries = [
      { id: 'bank-river', word: 'bank', termLanguage: 'English', definition: 'Land beside a river.', sentenceActivity: { prompt: 'A river has a ____.', choices: ['bank', 'bed'], answer: 'bank' } },
      { id: 'bank-money', word: 'bank', termLanguage: 'English', definition: 'A financial institution.' },
      { id: 'bank-german', word: 'Bank', termLanguage: 'German', definition: 'A bench.', sentenceActivity: { prompt: 'Wir sitzen auf der ____.', choices: ['Bank', 'Tür'], answer: 'Bank' } },
    ];
    const { win, doc, preview, activity } = open(source, { currentUiLanguage: 'French', words: entries, options: { mode: 'vocabulary' } });
    const picker = doc.querySelector('.awp-preview-picker'), labels = () => [...picker.options].map(option => option.textContent);
    expect(labels()[0]).toContain('anglais'); expect(labels()[2]).toContain('allemand'); expect(labels()[0]).toContain('Meaning 1'); expect(labels()[1]).toContain('Meaning 2');
    change(win, picker, 'bank-german'); expect(preview.querySelector('.awp-preview-word').lang).toBe('de');
    for (const mode of ['spelling', 'blend', 'sentence']) {
      change(win, activity, mode); expect(labels().join(' ').toLowerCase()).not.toContain('bank'); expect(labels().join(' ')).not.toContain('A bench.');
    }
    expect([...picker.options].map(option => option.value)).toEqual(['bank-river', 'bank-german']);
    expect(picker.value).toBe('bank-german'); expect(preview.querySelector('.awp-preview-prompt').textContent).toBe('Wir sitzen auf der ____.');
    change(win, doc.querySelector('textarea'), 'bank'); expect(picker.hidden).toBe(true);
  });

  it.each([
    ['The plant has a ____.', 'English', false],
    ['First line.\nComplete the ____.', 'English', true],
    ['اقرأ الجملة ثم أكمل الفراغ. '.repeat(7) + '____', 'Arabic', true],
    ['木は水と日光を必要とします。'.repeat(5) + '____', 'Japanese', true],
  ])('uses a steady reading edge for long or multiline prompt %s', async (prompt, language, prose) => {
    const pack = { words: [{ word: 'leaf', sentenceActivity: { prompt, language, answer: 'leaf', choices: ['leaf', 'root'] } }], options: { mode: 'sentence', repetitions: 1 } };
    const { win, doc, preview } = open(source, pack);
    expect(preview.querySelector('.awp-preview-prompt').dataset.prose).toBe(String(prose));
    button(doc, 'Present').click(); await vi.waitFor(() => expect(doc.querySelector('.awp-sentence-prompt')).toBeTruthy());
    expect(doc.querySelector('.awp-sentence-prompt').textContent).toBe(prompt); expect(doc.querySelector('.awp-sentence-prompt').dataset.prose).toBe(String(prose));
    const offline = new JSDOM(win.AlloModules.WordPractice.buildHtml(pack), { runScripts: 'dangerously' }).window; windows.push(offline);
    expect(offline.document.querySelector('.awp-sentence-prompt').textContent).toBe(prompt); expect(offline.document.querySelector('.awp-sentence-prompt').dataset.prose).toBe(String(prose));
  });
});
