import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const mediaPath = process.env.WORD_PRACTICE_MEDIA || 'word_practice_media.js';
const lanes = { source: ['word_practice_core.js', mediaPath].map(file => fs.readFileSync(file, 'utf8')).join('\n') };
if (!process.env.WORD_PRACTICE_MEDIA) lanes.runtime = fs.readFileSync('word_practice_module.js', 'utf8');
const vendor = fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const answer = 'ANSWER_ONLY';
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
const input = () => ({ title: 'Caption fallbacks', language: 'English', words: [{ word: answer, wordAudio: wav, phonemes: [{ label: 'a', audio: wav }, { label: 'b', audio: wav }] }] });
const options = mode => ({ mode, repetitions: 1, shuffle: false, includeAudio: true, cardFont: 'verdana', cardTextStyle: 'bold-italic' });
const AudioContext = class {
  async decodeAudioData() { return { sampleRate: 8000, length: 80, duration: .01, numberOfChannels: 1, getChannelData: () => new Float32Array(80) }; }
  async close() {}
};
function load(code, native = false) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window); window.eval(code);
  const slides = [];
  if (native) window.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
  const Constructor = native ? function () {
    const deck = new window.NativeDeck(), addSlide = deck.addSlide.bind(deck);
    deck.addSlide = () => {
      const slide = addSlide(), texts = [], media = [], notes = [], addText = slide.addText.bind(slide), addMedia = slide.addMedia.bind(slide), addNotes = slide.addNotes.bind(slide);
      slides.push({ texts, media, notes });
      slide.addText = (text, options) => { texts.push({ text, options }); return addText(text, options); };
      slide.addMedia = options => { media.push(options); return addMedia(options); };
      slide.addNotes = text => { notes.push(text); return addNotes(text); };
      return slide;
    };
    return deck;
  } : class {
    addSlide() { const slide = { texts: [], media: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.media.push(options); }, addNotes(text) { this.notes.push(text); }, addShape() {}, addImage() {} }; slides.push(slide); return slide; }
  };
  return { window, slides, Constructor, media: window.AlloWordPracticeMedia };
}
const blanks = [['spaces', '   '], ['NBSP', '\u00a0\u00a0'], ['ideographic spaces', '\u3000\u3000'], ['mixed Unicode whitespace', ' \t\r\n\u00a0\u3000']];
const invalid = [...blanks.map(([name, value]) => [name, () => value]), ['raw key', key => key], ['padded raw key', key => ' \u00a0' + key + '\u3000 '], ['throw', () => { throw new Error('Language pack unavailable'); }]];
const labelNames = ['blend_help', 'spell_teacher', 'spell_listen', 'pptx_spell_advance', 'hear_word', 'hear_sounds', 'card_progress', 'mode_blend', 'mode_spelling', 'pptx_answer', 'pptx_say_word_note'];
const labels = value => Object.fromEntries(labelNames.map(name => [name, value]));
const byY = (slide, y) => slide.texts.filter(entry => entry.options.y === y);
function checkPhases(slides, mode) {
  expect(slides).toHaveLength(2);
  expect(slides[0].texts.map(entry => flatten(entry.text)).join('')).not.toContain(answer);
  expect(slides[1].texts.some(entry => flatten(entry.text) === answer)).toBe(true);
  expect(slides[0].media).toHaveLength(mode === 'blend' ? 1 : 2); expect(slides[1].media).toHaveLength(mode === 'blend' ? 1 : 0);
  expect(slides[mode === 'blend' ? 1 : 0].media[0].data).toBe(wav.replace(/^data:/, ''));
}
function expectCaption(entry, text, lang, rtl = false) {
  expect(flatten(entry.text)).toBe(text);
  expect(entry.options).toMatchObject({ lang, rtlMode: rtl, fontFace: 'Verdana', italic: true, bold: true });
}
async function build(context, mode, extra = {}) {
  return context.media.buildPptx(input(), options(mode), undefined, { PptxGenJS: context.Constructor, AudioContext, currentUiLanguage: 'Arabic', ...extra });
}

describe.each(Object.entries(lanes))('caption language fallback (%s)', (_, code) => {
  it.each(invalid)('uses English captions when an invalid override and %s translation have no readable text', async (_, t) => {
    for (const mode of ['blend', 'spelling']) {
      const context = load(code);
      await build(context, mode, { labels: labels('\u00a0\u3000'), t });
      checkPhases(context.slides, mode);
      const prompt = context.slides[0];
      expectCaption(byY(prompt, mode === 'blend' ? 4.8 : 2)[0], mode === 'blend' ? 'Say the sounds, then blend the word.' : 'Listen, then spell the word.', 'en');
      if (mode === 'spelling') expectCaption(byY(prompt, 3.8)[0], 'Advance to check your spelling.', 'en');
      const audio = byY(prompt, 6.06);
      if (mode === 'blend') { expectCaption(audio[0], 'Hear sounds', 'en'); expectCaption(byY(context.slides[1], 6.06)[0], 'Hear word', 'en'); }
      else { expectCaption(audio[0], 'Hear word', 'en'); expectCaption(audio[1], 'Hear sounds', 'en'); }
      for (const slide of context.slides) {
        const footer = byY(slide, 6.96)[0];
        expect(footer.text[0]).toMatchObject({ text: 'Card 1 of 1', options: { lang: 'en', rtlMode: false } });
        expect(footer.text[1]).toMatchObject({ text: ' · ' + (mode === 'blend' ? 'Sound & Blend' : 'Listen & Spell'), options: { lang: 'en', rtlMode: false } });
      }
      expect(byY(context.slides[1], 6.96)[0].text.at(-1)).toMatchObject({ text: ' · Answer', options: { lang: 'en', rtlMode: false } });
      if (mode === 'spelling') expect(prompt.notes).toEqual(['Say this word aloud if needed: ' + answer]);
    }
  });

  it.each(blanks)('tries the actual Arabic translator after a %s override without trimming genuine text', async (_, blank) => {
    const genuine = { blend_help: ' \u00a0امزج <b>&</b>\u3000 ', hear_word: '\u00a0 استمع إلى الكلمة \u3000', hear_sounds: '  استمع إلى الصوت  ', card_progress: '\u3000بطاقة {n} من {total}\u00a0', mode_blend: ' امزج ', pptx_answer: ' الجواب ' };
    const requested = [], context = load(code), data = input(), original = JSON.stringify(data);
    await context.media.buildPptx(data, options('blend'), undefined, { PptxGenJS: context.Constructor, AudioContext, currentUiLanguage: 'Arabic', labels: labels(blank), t: key => { requested.push(key); return genuine[key.replace('word_practice.', '')] || key; } });
    checkPhases(context.slides, 'blend');
    expectCaption(byY(context.slides[0], 4.8)[0], genuine.blend_help, 'ar', true);
    expectCaption(byY(context.slides[1], 6.06)[0], genuine.hear_word, 'ar', true);
    expectCaption(byY(context.slides[0], 6.06)[0], genuine.hear_sounds, 'ar', true);
    const footer = byY(context.slides[0], 6.96)[0];
    expect(footer.text[0]).toMatchObject({ text: '\u3000بطاقة 1 من 1\u00a0', options: { lang: 'ar', rtlMode: true } });
    expect(footer.text[1]).toMatchObject({ text: ' · ' + genuine.mode_blend, options: { lang: 'ar', rtlMode: true } });
    expect(byY(context.slides[1], 6.96)[0].text.at(-1)).toMatchObject({ text: ' · ' + genuine.pptx_answer, options: { lang: 'ar', rtlMode: true } });
    for (const name of Object.keys(genuine)) expect(requested).toContain('word_practice.' + name);
    expect(JSON.stringify(data)).toBe(original);
  });

  it('preserves real overrides and existing English-literal metadata policy', async () => {
    const context = load(code), genuine = ' \u00a0سياق <&>\u3000 ', requested = [];
    await build(context, 'blend', { labels: { blend_help: genuine, hear_word: 'Hear word' }, t: key => { requested.push(key); return key; } });
    expectCaption(byY(context.slides[0], 4.8)[0], genuine, 'ar', true);
    expectCaption(byY(context.slides[1], 6.06)[0], 'Hear word', 'en');
    expect(requested).not.toContain('word_practice.blend_help'); expect(requested).not.toContain('word_practice.hear_word');
  });

  it('tries the translator after padded raw-key overrides', async () => {
    const context = load(code), genuine = ' امزج الأصوات ', requested = [];
    const overrides = Object.fromEntries(labelNames.map(name => [name, '\u00a0 word_practice.' + name + ' \u3000']));
    await build(context, 'blend', { labels: overrides, t: key => { requested.push(key); return key === 'word_practice.blend_help' ? genuine : key; } });
    expectCaption(byY(context.slides[0], 4.8)[0], genuine, 'ar', true);
    expectCaption(byY(context.slides[1], 6.06)[0], 'Hear word', 'en');
    expect(requested).toContain('word_practice.blend_help');
  });

  it.each([['pa-Arab', ' بولو ', true], ['ar-Latn', '\u3000waraqa\u00a0', false]])('preserves the full %s UI script tag after a blank override', async (currentUiLanguage, genuine, rtl) => {
    const context = load(code);
    await build(context, 'blend', { currentUiLanguage, labels: labels('\u3000'), t: key => ['word_practice.blend_help', 'word_practice.hear_word'].includes(key) ? genuine : key === 'word_practice.card_progress' ? ' {n}/{total} ' : key });
    expectCaption(byY(context.slides[0], 4.8)[0], genuine, currentUiLanguage, rtl);
    expectCaption(byY(context.slides[1], 6.06)[0], genuine, currentUiLanguage, rtl);
    expect(byY(context.slides[0], 6.96)[0].text[0]).toMatchObject({ text: ' 1/1 ', options: { lang: currentUiLanguage, rtlMode: rtl } });
  });

  it('keeps teacher spelling guidance readable when playback is disabled', async () => {
    const context = load(code);
    await context.media.buildPptx(input(), { ...options('spelling'), includeAudio: false }, undefined, { PptxGenJS: context.Constructor, currentUiLanguage: 'Arabic', labels: labels('\u00a0\u3000'), t: () => '\u3000' });
    expect(context.slides).toHaveLength(2);
    const teacher = byY(context.slides[0], 2)[0];
    // Existing italic layout inserts soft breaks; authored caption characters stay.
    expectCaption({ ...teacher, text: flatten(teacher.text).replace(/\r?\n/g, '') }, 'Ask your teacher to say the word, then spell it.', 'en');
    expectCaption(byY(context.slides[0], 3.8)[0], 'Advance to check your spelling.', 'en');
    expect(context.slides.flatMap(slide => slide.media)).toHaveLength(0);
  });

  it('serializes readable fallbacks and genuine Arabic whitespace/tags with own language/style in actual vendor XML', async () => {
    const context = load(code, true), genuine = '\u00a0 استمع <b>&</b> \u3000';
    const deck = await build(context, 'blend', { labels: labels('\u3000\u00a0'), t: key => key === 'word_practice.hear_word' ? genuine : ' \u00a0' + key + '\u3000 ' });
    checkPhases(context.slides, 'blend');
    const zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
    const xml = await Promise.all([1, 2].map(index => zip.file('ppt/slides/slide' + index + '.xml').async('string')));
    const docs = xml.map(value => new context.window.DOMParser().parseFromString(value, 'application/xml'));
    for (const doc of docs) expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    const a = 'http://schemas.openxmlformats.org/drawingml/2006/main', p = 'http://schemas.openxmlformats.org/presentationml/2006/main';
    const shapes = docs.flatMap(doc => [...doc.getElementsByTagNameNS(p, 'sp')]);
    for (const [value, lang] of [[genuine, 'ar'], ['Say the sounds, then blend the word.', 'en'], ['Hear sounds', 'en']]) {
      const shape = shapes.find(shape => [...shape.getElementsByTagNameNS(a, 't')].map(node => node.textContent).join('') === value);
      expect(shape).toBeTruthy();
      const runs = [...shape.getElementsByTagNameNS(a, 'rPr')]; expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) { expect(run.getAttribute('lang')).toBe(lang); expect(run.getAttribute('b')).toBe('1'); expect(run.getAttribute('i')).toBe('1'); }
    }
    expect(xml.join('')).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(xml.join('')).not.toContain('word_practice.');
  }, 60_000);
});
