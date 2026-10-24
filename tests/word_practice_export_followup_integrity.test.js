import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const recording = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const customAudio = recording('custom'), defaultAudio = recording('default');
const flattenText = value => Array.isArray(value) ? value.map(run => { expect(typeof run.text).toBe('string'); return run.text; }).join('') : value;
const button = (doc, label) => [...doc.querySelectorAll('button')].find(node => node.textContent === label);
const wordsField = doc => doc.querySelector('.awp-fields textarea');
function load(lane) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><button>Launch</button></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  const win = dom.window; windows.push(win); win.eval(lanes[lane]);
  const downloads = [];
  win.URL.createObjectURL = blob => { downloads.push(blob); return 'blob:practice-' + downloads.length; };
  win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  return { win, doc: win.document, ui: win.AlloModules.WordPractice, core: win.AlloWordPracticeCore, media: win.AlloWordPracticeMedia, downloads };
}
async function save({ win, doc, downloads }) {
  const before = downloads.length; button(doc, 'Save word set').click(); await tick();
  expect(downloads.length).toBe(before + 1);
  const json = await new Promise((resolve, reject) => {
    const reader = new win.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(downloads.at(-1));
  });
  return JSON.parse(json);
}
async function importPack({ win, doc }, pack) {
  const input = doc.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ size: 10000, text: async () => JSON.stringify(pack) }] });
  input.dispatchEvent(new win.Event('change', { bubbles: true })); await tick();
}
function editWords({ win, doc }, value) {
  const input = wordsField(doc); input.value = value; input.dispatchEvent(new win.Event('change', { bubbles: true }));
}
function offline(context, input, options = {}) {
  const dom = new JSDOM(context.ui.buildHtml(input, { mode: 'vocabulary', repetitions: 1, includeAudio: false, ...options }), { runScripts: 'dangerously' });
  windows.push(dom.window); return dom.window.document;
}
const longWord = () => ({
  word: 'Hello, world',
  definition: 'Definition. '.repeat(200) + 'Café — پایان 🦋',
  example: 'Example. '.repeat(250) + 'Bonjour, monde! 🧠',
  translations: { French: 'Traduction. '.repeat(100) + 'Résumé 🪴' },
  wordAudio: customAudio, phonemes: [{ label: 'h', audio: customAudio }]
});

describe.each(Object.keys(lanes))('portable Word Practice follow-up integrity (%s)', lane => {
  it('keeps comma-containing prepared phrases and complete Unicode meanings through actual Save/Open set actions', async () => {
    const context = load(lane), original = longWord();
    context.ui.open({ words: [original, 'rain'], options: { repetitions: 1, shuffle: false } });
    expect(wordsField(context.doc).value).toBe('Hello, world\nrain');
    const first = await save(context);
    expect(first.items).toHaveLength(2);
    expect(first.items[0]).toMatchObject({ ...original, translations: [{ language: 'French', text: original.translations.French }] });
    editWords(context, 'rain'); editWords(context, 'Hello, world\nrain');
    expect((await save(context)).items[0]).toEqual(first.items[0]);
    await importPack(context, first);
    expect(context.doc.querySelector('.awp-status').textContent).toBe('Word set opened.');
    expect((await save(context)).items).toEqual(first.items);
  });

  it('preserves the explicit comma-list import API while the line editor treats punctuation as phrase content', () => {
    const { core } = load(lane);
    expect(core.parseWords('cat, dog\nrain')).toEqual(['cat', 'dog', 'rain']);
    expect(core.parseWords('Hello, world\r\nrain', { lineSeparated: true })).toEqual(['Hello, world', 'rain']);
    expect(core.normalizeInput({ words: 'cat, dog' }).items.map(item => item.word)).toEqual(['cat', 'dog']);
  });

  it.each([
    { language: 'French', word: 'ami' },
    { language: 'fr-CA', word: 'bonjour, monde' },
    { language: 'en', word: 'New York' },
    { language: 'Arabic', word: 'سفينة' }
  ])('prefers explicit caller recordings for $language / $word over the default bank or TTS', async ({ language, word }) => {
    const { win, media, core } = load(lane); let ttsCalls = 0;
    win._CACHE_WORD_AUDIO_BANK = { [core.key(word)]: defaultAudio };
    const result = await media.prepareAudio({ language, words: [word] }, {
      wordBank: { [word]: customAudio }, callTTS: async () => { ttsCalls++; return defaultAudio; }
    });
    expect(result.items[0].wordAudio).toBe(customAudio);
    expect(ttsCalls).toBe(0); expect(result.audioStatus.errors).toHaveLength(0);
  });

  it('prefers an exact normalized caller key and falls back to the English library after an unusable custom clip', async () => {
    const { win, media } = load(lane); let ttsCalls = 0;
    win._CACHE_WORD_AUDIO_BANK = { ship: defaultAudio };
    const direct = await media.prepareAudio({ words: ['Ship'] }, { wordBank: { ship: customAudio, Ship: defaultAudio } });
    expect(direct.items[0].wordAudio).toBe(customAudio);
    const fallback = await media.prepareAudio({ words: ['ship'] }, { wordBank: { ship: 'not audio' }, callTTS: async () => { ttsCalls++; return ''; } });
    expect(fallback.items[0].wordAudio).toBe(defaultAudio); expect(ttsCalls).toBe(0);
  });

  it('does not use the global English library for a foreign word or phrase without an explicit recording', async () => {
    const { win, media } = load(lane); let ttsCalls = 0;
    win._CACHE_WORD_AUDIO_BANK = { ami: defaultAudio, 'new york': defaultAudio };
    for (const [language, word] of [['French', 'ami'], ['English', 'New York']]) {
      const pack = await media.prepareAudio({ language, words: [word] }, { callTTS: async () => { ttsCalls++; return customAudio; } });
      expect(pack.items[0].wordAudio).toBe(customAudio);
    }
    expect(ttsCalls).toBe(2);
  });

  it('retains the ending of each long instructional field in the actual offline meaning card', () => {
    const context = load(lane), original = longWord(), doc = offline(context, { words: [original] });
    button(doc, 'Show meaning').click();
    expect(doc.querySelector('.awp-card').textContent).toContain(original.definition);
    expect(doc.querySelector('.awp-card').textContent).toContain(original.example);
    expect(doc.querySelector('.awp-card').textContent).toContain(original.translations.French);
  });

  it('retains full long meanings across actual PowerPoint continuation slides', async () => {
    const context = load(lane), original = longWord();
    class Presentation {
      constructor() { this.slides = []; }
      addSlide() { const slide = { texts: [], addText(text) { this.texts.push(text); } }; this.slides.push(slide); return slide; }
    }
    const presentation = await context.media.buildPptx({ words: [original] }, { mode: 'vocabulary', repetitions: 1, includeAudio: false }, undefined, { PptxGenJS: Presentation });
    const text = presentation.slides.flatMap(slide => slide.texts).map(flattenText).join('\n');
    expect(presentation.slides.length).toBeGreaterThan(3);
    expect(text).toContain('Café — پایان 🦋'); expect(text).toContain('Bonjour, monde! 🧠'); expect(text).toContain('Résumé 🪴');
  });

  it.each(['definition', 'example', 'translation'])('rejects an oversized $s import visibly and preserves the current set', async field => {
    const context = load(lane); context.ui.open({ words: [{ word: 'kept', definition: 'Keep this meaning.' }] });
    const tooLong = 'x'.repeat(context.core.LIMITS.instructionChars + 1);
    const item = field === 'translation' ? { word: 'new', translations: { French: tooLong } } : { word: 'new', [field]: tooLong };
    await importPack(context, { words: [item] });
    const message = context.doc.querySelector('.awp-status').textContent;
    expect(message).toContain(field); expect(message).toContain('12,000'); expect(message).toContain('new');
    expect(wordsField(context.doc).value).toBe('kept');
    const saved = await save(context); expect(saved.items).toHaveLength(1); expect(saved.items[0]).toMatchObject({ word: 'kept', definition: 'Keep this meaning.' });
  });

  it('accepts the instructional field boundary exactly and rejects an oversized complete set without cutting it', () => {
    const { core } = load(lane), content = 'é'.repeat(core.LIMITS.instructionChars);
    expect(core.normalizeInput({ words: [{ word: 'boundary', definition: content }] }).items[0].definition).toBe(content);
    const many = Array.from({ length: 45 }, (_, i) => ({ word: 'word' + i, definition: content }));
    expect(() => core.normalizeInput({ words: many })).toThrow(/too much instructional text.*524,288/);
  });

  it.each([
    ['Arabic', 'ar', 'rtl'], ['Hebrew', 'he', 'rtl'], ['fa_IR', 'fa-IR', 'rtl'],
    ['ar-Latn', 'ar-Latn', 'ltr'], ['pa-Arab', 'pa-Arab', 'rtl'], ['zh-Hant', 'zh-Hant', 'ltr'],
    ['Spanish (Latin America)', 'es-419', 'ltr'], ['French', 'fr', 'ltr'], ['Unlisted teaching language', '', 'auto']
  ])('resolves language metadata for %s without guessing unknown names', (language, tag, dir) => {
    expect(load(lane).core.languageInfo(language)).toEqual({ tag, dir });
  });

  it.each(['presenter', 'offline'])('marks translated visible text and live announcements with independent language and direction in the %s', async surface => {
    const context = load(lane), input = { language: 'English', words: [{ word: 'ship', translations: { Arabic: 'سفينة', French: 'bateau', 'Unknown language': 'Visible unknown passage' } }] };
    let doc;
    if (surface === 'presenter') { context.ui.open({ ...input, options: { mode: 'vocabulary', repetitions: 1 } }); button(context.doc, 'Present').click(); await tick(); doc = context.doc; }
    else doc = offline(context, input);
    button(doc, 'Show meaning').click();
    for (const scope of ['.awp-card', '.awp-sr']) {
      const passages = [...doc.querySelectorAll(scope + ' .awp-translation')];
      expect(passages.map(node => [node.textContent, node.getAttribute('lang'), node.dir])).toEqual([
        ['سفينة', 'ar', 'rtl'], ['bateau', 'fr', 'ltr'], ['Visible unknown passage', 'und', 'auto']
      ]);
      expect(passages[0].previousElementSibling.textContent).toBe('Arabic: ');
      expect(passages[0].previousElementSibling.lang).toBe('und');
    }
  });

  it('preserves Arabic source language and RTL independently from the default English interface', () => {
    const context = load(lane), doc = offline(context, { language: 'Arabic', words: ['سفينة'] });
    expect(doc.documentElement.lang).toBe('en'); expect(doc.documentElement.dir).toBe('ltr');
    expect(doc.querySelector('.awp-word').lang).toBe('ar'); expect(doc.querySelector('.awp-word').dir).toBe('rtl');
  });
});
