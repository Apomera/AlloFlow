import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const wav = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const initialAudio = wav('one'), preparedAudio = wav('two');
const preparedWord = () => ({
  word: 'ship', definition: 'A large boat', example: 'The ship sails.',
  translations: [{ language: 'French', text: 'bateau' }], wordAudio: initialAudio,
  phonemes: [{ label: 'sh', audio: initialAudio }],
  sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' }
});
const sentenceWords = () => ['cat', 'dog', 'fox'].map((word, i) => ({
  word, sentenceActivity: {
    prompt: 'I see a ____.', choices: i === 0 ? [word, 'rain', 'sun'] : [word, 'rain'], answer: word
  }
}));
const button = (doc, text) => [...doc.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
const field = (doc, text) => [...doc.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === text)?.querySelector('input,textarea,select');
function load(lane) {
  const dom = new JSDOM('<!doctype html><html><body><button>Launch</button></body></html>', {
    runScripts: 'outside-only', url: 'https://alloflow.example/'
  });
  const win = dom.window; windows.push(win); win.eval(sources[lane]);
  const downloads = [];
  win.URL.createObjectURL = blob => { downloads.push(blob); return 'blob:practice-' + downloads.length; };
  win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  return { win, doc: win.document, ui: win.AlloModules.WordPractice, downloads };
}
function editWords(win, value) {
  const input = field(win.document, 'Words (one per line)');
  input.focus(); input.value = value;
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  input.dispatchEvent(new win.Event('change', { bubbles: true })); input.blur();
}
async function saveSet(context) {
  const { win, doc, downloads } = context;
  button(doc, 'Save word set').click(); await tick();
  const blob = downloads[downloads.length - 1];
  expect(blob, 'a saved set was downloaded').toBeTruthy();
  const text = await new Promise((resolve, reject) => {
    const reader = new win.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
  });
  return JSON.parse(text);
}
async function importSet(context, value) {
  const { win, doc } = context, file = doc.querySelector('input[type=file]');
  Object.defineProperty(file, 'files', { configurable: true, value: [{ size: 2000, text: async () => JSON.stringify(value) }] });
  file.dispatchEvent(new win.Event('change', { bubbles: true })); await tick();
  expect(doc.querySelector('.awp-status').textContent).toBe('Word set opened.');
}
function press(win, key) {
  const event = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  win.document.activeElement.dispatchEvent(event); return event;
}

describe.each(Object.keys(sources))('Word Practice edit integrity (%s)', lane => {
  it('exports only selected words but restores all prepared content after temporary removal and blur', async () => {
    const context = load(lane), { win, ui } = context;
    ui.open({ words: [preparedWord(), 'rain'], options: { shuffle: false, repetitions: 1 } });
    editWords(win, 'rain');
    expect((await saveSet(context)).items.map(item => item.word)).toEqual(['rain']);
    editWords(win, 'SHIP\nrain');
    const restored = (await saveSet(context)).items[0];
    expect(restored).toMatchObject({ ...preparedWord(), word: 'SHIP' });
  });

  it('restores the latest prepared recordings rather than the original catalogue snapshot', async () => {
    const context = load(lane), { win, doc, ui } = context;
    win.AlloWordPracticeMedia = { async prepareAudio(pack) {
      return { ...pack, items: pack.items.map(item => item.word === 'ship'
        ? { ...item, wordAudio: preparedAudio, phonemes: item.phonemes.map(sound => ({ ...sound, audio: preparedAudio })) } : item) };
    } };
    ui.open({ words: [preparedWord(), 'rain'] });
    button(doc, 'Prepare audio').click(); await tick();
    editWords(win, 'rain'); editWords(win, 'ship\nrain');
    const restored = (await saveSet(context)).items[0];
    expect(restored.wordAudio).toBe(preparedAudio);
    expect(restored.phonemes[0].audio).toBe(preparedAudio);
    expect(restored.definition).toBe('A large boat');
    expect(restored.sentenceActivity).toEqual({ ...preparedWord().sentenceActivity, language: 'en' });
  });

  it('keeps prepared content through an invalid intermediate list', async () => {
    const context = load(lane), { win, doc, ui } = context;
    ui.open({ words: [preparedWord(), 'rain'] });
    editWords(win, 'rain');
    editWords(win, Array.from({ length: 201 }, (_, i) => 'new' + i).join('\n'));
    expect(doc.querySelector('.awp-note.awp-gap').textContent).toContain('200 different words');
    editWords(win, 'ship\nrain');
    expect((await saveSet(context)).items[0]).toMatchObject(preparedWord());
  });

  it.each(['en', 'fr'])('starts a fresh metadata catalogue when importing a %s set', async language => {
    const context = load(lane), { win, ui } = context;
    ui.open({ words: [preparedWord(), 'rain'], language: 'en', phonemeBank: { sh: initialAudio } });
    editWords(win, 'rain');
    await importSet(context, { language, words: ['rain'] });
    editWords(win, 'ship\nrain');
    const restored = (await saveSet(context)).items[0];
    expect(restored).toMatchObject({ word: 'ship', definition: '', example: '', translations: [], wordAudio: '', phonemes: [], sentenceActivity: null });
  });

  it('preserves imported metadata after edits without inheriting launcher-language recordings', async () => {
    const context = load(lane), { win, ui } = context;
    ui.open({ words: [preparedWord(), 'rain'], language: 'en', phonemeBank: { sh: initialAudio } });
    const imported = { ...preparedWord(), definition: 'Un bateau', wordAudio: preparedAudio, phonemes: [{ label: 'sh' }, { label: 'i', audio: preparedAudio }] };
    await importSet(context, { language: 'fr', words: [imported, 'rain'] });
    editWords(win, 'rain'); editWords(win, 'ship\nrain');
    const restored = (await saveSet(context)).items[0];
    expect(restored.definition).toBe('Un bateau'); expect(restored.wordAudio).toBe(preparedAudio);
    expect(restored.phonemes.map(sound => sound.audio)).toEqual(['', preparedAudio]);
    expect(restored.sentenceActivity).toEqual({ ...imported.sentenceActivity, language: 'fr' });
  });

  it('does not carry a closed dialog catalogue into a later practice set', async () => {
    const context = load(lane), { win, ui } = context;
    const first = ui.open({ words: [preparedWord(), 'rain'] });
    editWords(win, 'rain'); first.close(); ui.open({ words: ['rain'] }); editWords(win, 'ship\nrain');
    expect((await saveSet(context)).items[0].definition).toBe('');
  });
});

describe.each(Object.keys(sources).flatMap(lane => ['presenter', 'offline'].map(surface => ({ lane, surface }))))('Word Practice focus integrity ($lane, $surface)', ({ lane, surface }) => {
  async function player() {
    const context = load(lane), options = { mode: 'sentence', shuffle: false, repetitions: 1, includeAudio: false };
    if (surface === 'presenter') {
      context.ui.open({ words: sentenceWords(), options }); button(context.doc, 'Present').click(); await tick();
      return context;
    }
    const html = context.ui.buildHtml({ words: sentenceWords() }, options);
    const dom = new JSDOM(html, { runScripts: 'dangerously' }); windows.push(dom.window);
    return { win: dom.window, doc: dom.window.document };
  }

  it('supports repeated arrows after replacing the focused choice and clamps its position on shorter cards', async () => {
    const { win, doc } = await player();
    doc.querySelectorAll('.awp-choices button')[2].focus();
    expect(press(win, 'ArrowRight').defaultPrevented).toBe(true);
    expect(doc.querySelector('.awp-progress').textContent).toBe('Card 2 of 3');
    expect(doc.activeElement).toBe(doc.querySelectorAll('.awp-choices button')[1]);
    press(win, 'ArrowRight'); expect(doc.querySelector('.awp-progress').textContent).toBe('Card 3 of 3');
    expect(doc.activeElement).toBe(doc.querySelectorAll('.awp-choices button')[1]);
    press(win, 'ArrowLeft'); expect(doc.querySelector('.awp-progress').textContent).toBe('Card 2 of 3');
    expect(doc.querySelector('.awp-player').contains(doc.activeElement)).toBe(true);
  });

  it('preserves focus through R reveal and continues navigating from that replacement choice', async () => {
    const { win, doc } = await player();
    doc.querySelector('.awp-choices button').focus();
    press(win, 'R');
    expect(doc.querySelector('.awp-feedback').textContent).toBe('Answer: cat');
    expect(doc.activeElement).toBe(doc.querySelector('.awp-choices button'));
    press(win, 'ArrowRight'); expect(doc.querySelector('.awp-progress').textContent).toBe('Card 2 of 3');
    expect(doc.querySelector('.awp-feedback').textContent).toBe('');
    expect(doc.activeElement).toBe(doc.querySelector('.awp-choices button'));
  });

  it('does not move focus when a stable toolbar control replaces the card', async () => {
    const { doc } = await player();
    const next = button(doc, 'Next'); next.focus(); next.click();
    expect(doc.querySelector('.awp-progress').textContent).toBe('Card 2 of 3');
    expect(doc.activeElement).toBe(next);
  });
});
