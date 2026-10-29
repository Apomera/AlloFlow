import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const sources = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const recording = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const wordAudio = recording('word'), soundAudio = recording('sound'), importedAudio = recording('imported');
const button = (doc, text) => [...doc.querySelectorAll('button')].find(node => node.textContent === text && !node.closest('[hidden]'));
function load(lane) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  const win = dom.window; windows.push(win); win.eval(sources[lane]);
  const blobs = [];
  win.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:practice-' + blobs.length; };
  win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  return { win, doc: win.document, core: win.AlloWordPracticeCore, media: win.AlloWordPracticeMedia, ui: win.AlloModules.WordPractice, blobs };
}
async function save(context) {
  const before = context.blobs.length; button(context.doc, 'Save word set').click(); await tick();
  expect(context.blobs.length).toBe(before + 1);
  return JSON.parse(await new Promise((resolve, reject) => {
    const reader = new context.win.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(context.blobs.at(-1));
  }));
}
async function importSet(context, pack) {
  const file = context.doc.querySelector('input[type=file]');
  Object.defineProperty(file, 'files', { configurable: true, value: [{ size: 10000, text: async () => JSON.stringify(pack) }] });
  file.dispatchEvent(new context.win.Event('change', { bubbles: true })); await tick();
}
async function blobText(context, blob) {
  return new Promise((resolve, reject) => {
    const reader = new context.win.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
  });
}
const manyTranslations = () => ['French', 'Arabic', 'Spanish', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Vietnamese', 'Thai', 'Russian', 'Ukrainian', 'Polish', 'Turkish', 'Hebrew', 'Greek', 'Romanian', 'Dutch', 'Swedish']
  .map((language, index) => ({ language, text: 'Meaning ' + index + ': café — سفينة 🦋' }));
const translationShape = (values, shape) => shape === 'array' ? values : Object.fromEntries(values.map(item => [item.language, item.text]));

describe.each(Object.keys(sources))('Word Practice translated content portability (%s)', lane => {
  it.each([
    [{ term: 'Feuille', def: 'Une partie de la plante.' }, 'Feuille: Une partie de la plante.'],
    [{ word: 'Feuille', definition: 'Une partie de la plante.' }, 'Feuille: Une partie de la plante.'],
    [{ text: '', term: 'Feuille', meaning: 'Une partie de la plante.' }, 'Feuille: Une partie de la plante.'],
    [{ text: { invalid: true }, term: 'Feuille', def: 'Une partie de la plante.' }, 'Feuille: Une partie de la plante.'],
    [{ term: '', definition: 'Une partie de la plante.' }, 'Une partie de la plante.'],
    [{ definition: 'Une partie de la plante.' }, 'Une partie de la plante.'],
    [{ text: 'Feuille: Un passage complet.', term: 'Ignored', def: 'Ignored' }, 'Feuille: Un passage complet.'],
    [{ text: ' ', translation: 'Feuille: Un passage complet.', term: 'Ignored', def: 'Ignored' }, 'Feuille: Un passage complet.']
  ])('preserves usable structured term/meaning content from %j', (record, expected) => {
    const { core } = load(lane);
    for (const translations of [{ French: record }, [{ language: 'French', ...record }]]) {
      const normalized = core.normalizeInput({ words: [{ word: 'Leaf', translations }] });
      expect(normalized.items[0].translations).toEqual([{ language: 'French', text: expected }]);
      expect(core.normalizeInput(JSON.parse(core.serializePack(normalized))).items[0].translations).toEqual(normalized.items[0].translations);
    }
  });

  it('does not stringify malformed wrapper objects or invent empty translated passages', () => {
    const { core } = load(lane);
    const pack = core.normalizeInput({ words: [{ word: 'Leaf', translations: { French: { text: {}, term: [], def: { invalid: true } }, Arabic: null } }] });
    expect(pack.items[0].translations).toEqual([]);
    expect(core.serializePack(pack)).not.toContain('[object Object]');
  });

  it('preserves complete structured meanings through real Save/Open set actions', async () => {
    const context = load(lane), translations = {
      French: { term: 'Feuille', def: 'Une partie de la plante.' },
      Arabic: { definition: 'جزء من النبات.' }
    };
    context.ui.open({ words: [{ word: 'Leaf', translations }], options: { mode: 'vocabulary', repetitions: 1 } });
    const saved = await save(context);
    expect(saved.items[0].translations).toEqual([
      { language: 'French', text: 'Feuille: Une partie de la plante.' }, { language: 'Arabic', text: 'جزء من النبات.' }
    ]);
    await importSet(context, saved);
    expect(context.doc.querySelector('.awp-status').textContent).toBe('Word set opened.');
    expect((await save(context)).items[0].translations).toEqual(saved.items[0].translations);
  });

  it.each(['array', 'object'])('preserves every translation beyond twenty from a %s through Save/Open, HTML and PowerPoint actions', async shape => {
    const context = load(lane), expected = manyTranslations();
    context.ui.open({ words: [{ word: 'Leaf', translations: translationShape(expected, shape) }], options: { mode: 'vocabulary', repetitions: 1, includeAudio: false } });
    const saved = await save(context);
    expect(saved.items[0].translations).toEqual(expected);
    await importSet(context, saved);
    expect(context.doc.querySelector('.awp-status').textContent).toBe('Word set opened.');
    expect((await save(context)).items[0].translations).toEqual(expected);

    const beforeHtml = context.blobs.length;
    button(context.doc, 'Download HTML').click(); await tick();
    expect(context.blobs.length).toBe(beforeHtml + 1);
    const offline = new JSDOM(await blobText(context, context.blobs.at(-1)), { runScripts: 'dangerously' });
    windows.push(offline.window);
    button(offline.window.document, 'Show meaning').click();
    expect([...offline.window.document.querySelectorAll('.awp-card .awp-translation')].map(node => node.textContent)).toEqual(expected.map(item => item.text));

    let presentation;
    context.win.PptxGenJS = class {
      constructor() { presentation = this; this.slides = []; }
      addSlide() { const slide = { texts: [], addText(text) { this.texts.push(text); } }; this.slides.push(slide); return slide; }
      async write() { return new context.win.Blob(['presentation']); }
    };
    const beforePptx = context.blobs.length;
    button(context.doc, 'Download PowerPoint').click();
    // Multi-page exports yield between pages so cancellation stays responsive.
    // Wait for the actual download, rather than assuming one event-loop turn.
    await vi.waitFor(() => expect(context.doc.querySelector('.awp-status').textContent).toBe('PowerPoint downloaded.'));
    expect(context.blobs.length).toBe(beforePptx + 1);
    const passages = presentation.slides.flatMap(slide => slide.texts).filter(Array.isArray).flatMap(runs => runs.map(run => run.text));
    expect(passages.filter(text => text.startsWith('Meaning '))).toEqual(expected.map(item => item.text));
  });

  it.each(['presenter', 'offline'])('renders complete translated terms and definition-only passages in the %s', async surface => {
    const context = load(lane), input = { words: [{ word: 'Leaf', translations: { French: { term: 'Feuille', def: 'Une partie de la plante.' }, Arabic: { definition: 'جزء من النبات.' } } }] };
    const options = { mode: 'vocabulary', repetitions: 1, includeAudio: false };
    let doc;
    if (surface === 'presenter') { context.ui.open({ ...input, options }); button(context.doc, 'Present').click(); await tick(); doc = context.doc; }
    else {
      const dom = new JSDOM(context.ui.buildHtml(input, options), { runScripts: 'dangerously' }); windows.push(dom.window); doc = dom.window.document;
    }
    button(doc, 'Show meaning').click();
    const passages = [...doc.querySelectorAll('.awp-card .awp-translation')];
    expect(passages.map(node => [node.textContent, node.lang, node.dir])).toEqual([
      ['Feuille: Une partie de la plante.', 'fr', 'ltr'], ['جزء من النبات.', 'ar', 'rtl']
    ]);
    expect(doc.querySelector('.awp-sr').textContent).toContain('Une partie de la plante.');
    expect(doc.querySelector('.awp-card').textContent).not.toContain('[object Object]');
  });

  it('checks the full structured translation against the 12,000-character limit before any clipping', () => {
    const { core } = load(lane), term = 'mot '.repeat(1498) + 'mot', definition = 'sens '.repeat(1199) + 'fin 🦋';
    const full = term + ': ' + definition;
    const valid = core.normalizeInput({ words: [{ word: 'Leaf', translations: { French: { term, definition } } }] });
    expect(valid.items[0].translations[0].text).toBe(full);
    const boundary = 'é'.repeat(core.LIMITS.instructionChars);
    expect(core.normalizeInput({ words: [{ word: 'Leaf', translations: { French: { definition: boundary } } }] }).items[0].translations[0].text).toBe(boundary);
    expect(() => core.normalizeInput({ words: [{ word: 'Leaf', translations: { French: { term: 'x'.repeat(6000), def: 'y'.repeat(6000) } } }] })).toThrow(/translation.*12,000/);
  });

  it('counts full structured translated meanings toward the 512 KiB instruction budget', () => {
    const { core } = load(lane), words = Array.from({ length: 45 }, (_, i) => ({ word: 'word' + i, translations: { French: { definition: 'x'.repeat(12000) } } }));
    expect(() => core.normalizeInput({ words })).toThrow(/too much instructional text.*524,288/);
  });

  it.each(['array', 'object'])('rejects an oversized %s of translations on one word without replacing the open set', async shape => {
    const context = load(lane), expected = { word: 'kept', definition: 'Keep this meaning.' };
    context.ui.open({ title: 'Current set', words: [expected] });
    const translations = translationShape(Array.from({ length: 45 }, (_, index) => ({ language: 'Language ' + index, text: 'x'.repeat(12000) })), shape);
    const imported = { title: 'Oversized import', words: [{ word: 'Leaf', translations }] };
    expect(() => context.core.normalizeInput(imported)).toThrow(/too much instructional text.*524,288/);
    await importSet(context, imported);
    expect(context.doc.querySelector('.awp-status').textContent).toMatch(/too much instructional text.*524,288/);
    const retained = await save(context);
    expect(retained.title).toBe('Current set');
    expect(retained.items).toHaveLength(1);
    expect(retained.items[0]).toMatchObject(expected);
  });

  it('shows an oversized structured import error while retaining the currently selected set', async () => {
    const context = load(lane); context.ui.open({ words: ['kept'] });
    await importSet(context, { words: [{ word: 'Leaf', translations: { French: { term: 'x'.repeat(6000), def: 'y'.repeat(6000) } } }] });
    expect(context.doc.querySelector('.awp-status').textContent).toMatch(/translation.*12,000/);
    expect((await save(context)).items.map(item => item.word)).toEqual(['kept']);
  });

  it.each([
    ['French', 'fr', true], ['fr', 'French', true], ['French (Canadian)', 'fr_CA', true],
    ['pa_Arab', 'pa-Arab', true], ['he', 'Hebrew', true], ['English', 'en', true],
    ['French', 'fr-CA', false], ['French (Canadian)', 'fr-FR', false],
    ['Chinese (Simplified)', 'zh-Hant', false], ['Arabic', 'ar-Latn', false], ['English', 'en-GB', false],
    ['French', 'Spanish', false]
  ])('scopes exact inherited recordings across %s → %s import (match=%s)', async (launcherLanguage, importedLanguage, matching) => {
    const context = load(lane); let ttsCalls = 0;
    context.ui.open({ language: launcherLanguage, words: ['ami'], wordBank: { ami: wordAudio }, phonemeBank: { m: soundAudio }, callTTS: async () => { ttsCalls++; return ''; } });
    await importSet(context, { language: importedLanguage, words: [{ word: 'ami', phonemes: [{ label: 'm' }, { label: 's', audio: importedAudio }] }] });
    expect(context.doc.querySelector('.awp-status').textContent).toBe('Word set opened.');
    button(context.doc, 'Prepare audio').click(); await tick();
    const saved = await save(context), item = saved.items[0];
    expect(saved.language).toBe(importedLanguage);
    expect(item.wordAudio).toBe(matching ? wordAudio : '');
    expect(item.phonemes[0].audio).toBe(matching ? soundAudio : '');
    expect(item.phonemes[1].audio).toBe(importedAudio);
    expect(ttsCalls).toBe(matching ? 0 : 1);
  });

  it('hands the translated player labels and translator to the actual PowerPoint download callback', async () => {
    const context = load(lane); let received;
    context.win.AlloWordPracticeMedia = { async buildPptx(pack, options, sequence, mediaContext) {
      received = { pack, options, sequence, mediaContext }; return { async write() { return new context.win.Blob(['pptx']); } };
    } };
    const t = key => ({ 'word_practice.hear_word': 'Escuchar palabra', 'word_practice.spell_teacher': 'Pide a tu docente que diga la palabra.' })[key] || key;
    context.ui.open({ words: ['Hoja'], language: 'Spanish', t });
    button(context.doc, 'Download PowerPoint').click(); await tick();
    expect(received.mediaContext.labels.hear_word).toBe('Escuchar palabra');
    expect(received.mediaContext.labels.spell_teacher).toBe('Pide a tu docente que diga la palabra.');
    expect(received.mediaContext.t).toBe(t); expect(received.mediaContext.signal.aborted).toBe(false);
  });
});
