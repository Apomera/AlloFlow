import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const coreCode = fs.readFileSync('word_practice_core.js', 'utf8');
const lanes = [['source', coreCode + '\n' + fs.readFileSync(process.env.CARD_MEDIA_PATH || 'word_practice_media.js', 'utf8')]];
if (!process.env.CARD_MEDIA_PATH || process.env.CARD_RUNTIME_PATH) lanes.push(['runtime', fs.readFileSync(process.env.CARD_RUNTIME_PATH || 'word_practice_module.js', 'utf8')]);
const baselineMedia = process.env.CARD_BASE_MEDIA_PATH ? fs.readFileSync(process.env.CARD_BASE_MEDIA_PATH, 'utf8') : null;
const baselineCode = baselineMedia ? coreCode + '\n' + baselineMedia : null;
const vendor = fs.readFileSync('desktop/web-app/public/vendor/pptxgenjs-3.12.0.bundle.js', 'utf8');
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const ANSWER = 'ANSWER_ONLY';
const NOTE = 'Teacher note stays after the answer.';
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

// Distinct, valid mono PCM sources make swapped/duplicated playback detectable.
function pcm(seed) {
  const bytes = Buffer.alloc(204);
  bytes.write('RIFF'); bytes.writeUInt32LE(196, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(160, 40);
  for (let n = 44; n < bytes.length; n += 2) bytes.writeInt16LE((n / 2) % 2 ? seed : -seed, n);
  return bytes;
}
const PCM = [pcm(1100), pcm(2200), pcm(3300)];
const WAV = PCM.map(bytes => 'data:audio/wav;base64,' + bytes.toString('base64'));
const sourcePayload = source => Buffer.from(source.slice(source.indexOf(',') + 1), 'base64');
function fixture({ annotations = false, sounds = true, sentence = false } = {}) {
  return { title: 'Playback capacity', language: 'English', words: [{ id: 'answer', word: ANSWER, termLanguage: 'English', definitionLanguage: 'English', definition: 'A clue that does not reveal the word.',
    wordAudio: WAV[0], phonemes: sounds ? [{ label: 'a', audio: WAV[1] }, { label: 'b', audio: WAV[2] }] : [],
    annotations: annotations ? [{ id: 'note', kind: 'note', content: NOTE, x: 50, y: 50 }] : [],
    ...(sentence ? { sentenceActivity: { prompt: 'Choose the word for ____.', choices: [ANSWER, 'OTHER'], answer: ANSWER, language: 'English' } } : {}),
  }] };
}
const baseOptions = mode => ({ mode, repetitions: 1, shuffle: false, includeAudio: true, includePictures: false, cardFont: 'verdana', cardTextStyle: 'bold-italic', cardTheme: 'paper', cardTextScale: 1.4 });
function load(code, { segmentation = 'native', native = false, abortController = null } = {}) {
  const { window } = new JSDOM('', { runScripts: 'outside-only' }); windows.push(window);
  if (segmentation === 'missing') window.Intl.Segmenter = undefined;
  if (segmentation === 'throws') window.Intl.Segmenter = class { segment() { throw new Error('Synthetic unavailable segmentation'); } };
  window.eval(code);
  const slides = [], lifecycle = { constructed: 0, decodes: 0, closes: 0, yields: 0 };
  const nativeTimeout = window.setTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => nativeTimeout(() => {
    if (delay === 0) { lifecycle.yields++; if (abortController) abortController.abort(); }
    callback(...args);
  }, delay);
  class AudioContext {
    constructor() { lifecycle.constructed++; }
    async decodeAudioData(buffer) {
      lifecycle.decodes++; const view = new DataView(buffer), length = (buffer.byteLength - 44) / 2;
      const samples = new Float32Array(length); for (let n = 0; n < length; n++) samples[n] = view.getInt16(44 + n * 2, true) / 32768;
      return { sampleRate: 8000, length, duration: length / 8000, numberOfChannels: 1, getChannelData: () => samples };
    }
    async close() { lifecycle.closes++; }
  }
  if (native) window.eval(vendor + '\nwindow.NativeDeck = PptxGenJS;');
  const Constructor = native ? function () {
    const deck = new window.NativeDeck(), addSlide = deck.addSlide.bind(deck);
    deck.addSlide = (...args) => {
      const slide = addSlide(...args), captured = { texts: [], media: [], notes: [] };
      slides.push(captured);
      for (const [method, field] of [['addText', 'texts'], ['addMedia', 'media'], ['addNotes', 'notes']]) {
        const original = slide[method].bind(slide);
        slide[method] = (value, options) => { captured[field].push(method === 'addText' ? { text: value, options } : value); return original(value, options); };
      }
      return slide;
    };
    return deck;
  } : class { addSlide() { const slide = { texts: [], media: [], notes: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(value) { this.media.push(value); }, addNotes(value) { this.notes.push(value); }, addShape() {}, addImage() {} }; slides.push(slide); return slide; } };
  return { window, slides, lifecycle, async build(input = fixture(), mode = 'popup', extra = {}) {
    return window.AlloWordPracticeMedia.buildPptx(input, { ...baseOptions(mode), ...extra.options }, undefined, { PptxGenJS: Constructor, AudioContext, currentUiLanguage: 'English', ...extra.context });
  } };
}
const allText = slide => slide.texts.map(entry => flatten(entry.text)).join('');
const footer = slide => flatten(slide.texts.find(entry => entry.options.y === 6.96)?.text || '');
const bodyBox = box => box.y === 1 && box.x === .85 && box.w === 11.65 && box.h === 5.5;
function captionParts(context, raw) {
  return context.slides.flatMap((slide, slideIndex) => slide.texts.filter(entry => {
    const value = flatten(entry.text);
    return value.length && raw.includes(value) && entry.options.color === '1E3A8A' && (entry.options.y === 6.06 || bodyBox(entry.options));
  }).map(entry => ({ ...entry, slide: slideIndex })));
}
function assertCaption(context, raw, language, rtl) {
  const parts = captionParts(context, raw);
  expect(parts.length).toBeGreaterThan(1); // A baseline floor-only fit cannot pass this overflow oracle.
  expect(parts.map(part => flatten(part.text)).join('')).toBe(raw);
  const boundaries = new Set([0, ...[...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(raw)].map(part => part.index + part.segment.length)]);
  let offset = 0;
  for (const part of parts) {
    expect(part.options).toMatchObject({ fontFace: 'Verdana', bold: true, italic: true, lang: language, rtlMode: rtl, align: rtl ? 'right' : 'left' });
    expect(part.options.fontSize).toBeGreaterThanOrEqual(10); expect(part.options.fit).toBeUndefined();
    expect(part.options.x).toBeGreaterThanOrEqual(0); expect(part.options.x + part.options.w).toBeLessThanOrEqual(13.333334);
    expect(part.options.y + part.options.h).toBeLessThanOrEqual(part.options.y === 6.06 ? 6.900001 : 6.500001);
    expect(boundaries.has(offset)).toBe(true);
    const runs = Array.isArray(part.text) ? part.text : [{ text: part.text }];
    for (const run of runs) { offset += run.text.length; expect(boundaries.has(offset)).toBe(true); }
    if (part.options.y === 1) {
      expect(context.slides[part.slide].media).toHaveLength(0);
      expect(context.slides[part.slide].notes).toHaveLength(0);
      expect(footer(context.slides[part.slide])).toMatch(/Part \d+\/\d+/);
    }
  }
  expect(offset).toBe(raw.length);
  return parts;
}
const mediaSequence = context => context.slides.flatMap(slide => slide.media.map(media => ({ ...media, phase: /(?:^| · )Answer(?: · |$)/.test(footer(slide)) ? 'answer' : 'prompt-or-word' })));
const samples = [['Korean', 'ko', '각', false], ['Hindi', 'hi', 'क्षि', false], ['Arabic', 'ar', 'بَّ', true]];
const ordinaryFooters = {
  popup: ['Card 1 of 1 · Word Fluency Pop-Up'],
  blend: ['Card 1 of 1 · Sound & Blend', 'Card 1 of 1 · Sound & Blend · Answer'],
  spelling: ['Card 1 of 1 · Listen & Spell', 'Card 1 of 1 · Listen & Spell · Answer'],
};
const mediaDigest = context => mediaSequence(context).map(media => ({ ...media, data: sha(sourcePayload(media.data)) }));
const expectedMedia = mode => {
  const word = { type: 'audio', data: '29d332a5016064c01cc0fe6551cb567f46045a186c73ad97e5b3533b0793dabc', x: .75, y: 6.03, w: .48, h: .48, phase: mode === 'blend' ? 'answer' : 'prompt-or-word' };
  const sounds = { type: 'audio', data: '4bd01b00ff8441177bcb367b70d13663d8500fd7daf109aad5e1a99bc356de15', x: 6.75, y: 6.03, w: .48, h: .48, phase: 'prompt-or-word' };
  return mode === 'blend' ? [sounds, word] : [word, sounds];
};

describe.each(lanes)('PPTX playback caption capacity (%s)', (_, code) => {
  it('keeps ordinary14pt geometry, all media bytes, styles and slide counts exactly at baseline', async () => {
    for (const mode of ['popup', 'blend', 'spelling']) for (const cardTextStyle of ['regular', 'italic', 'bold-italic']) {
      const input = fixture(), saved = JSON.stringify(input), current = load(code);
      const extra = { options: { cardTextScale: 1, cardTextStyle } };
      await current.build(input, mode, extra);
      if (baselineCode) { const old = load(baselineCode); await old.build(input, mode, extra); expect(JSON.parse(JSON.stringify(current.slides))).toEqual(JSON.parse(JSON.stringify(old.slides))); }
      expect(current.slides.map(footer)).toEqual(ordinaryFooters[mode]);
      expect(mediaDigest(current)).toEqual(expectedMedia(mode));
      const captions = current.slides.flatMap(slide => slide.texts).filter(entry => entry.options.y === 6.06);
      expect(captions).toHaveLength(2);
      expect(captions.map(entry => flatten(entry.text))).toEqual(mode === 'blend' ? ['Hear sounds', 'Hear word'] : ['Hear word', 'Hear sounds']);
      for (const entry of captions) expect(entry.options).toEqual({ x: flatten(entry.text) === 'Hear word' ? 1.33 : 7.33, y: 6.06, w: 4.9, h: .45, margin: 0, fontFace: 'Verdana', italic: cardTextStyle !== 'regular', bold: cardTextStyle === 'bold-italic', fontSize: 14, color: '1E3A8A', align: 'left', valign: 'top', paraSpaceAfterPt: 0, lang: 'en', rtlMode: false });
      expect(JSON.stringify(input)).toBe(saved);
    }
  });

  it.each(samples.flatMap(sample => ['native', 'missing', 'throws'].map(segmentation => [...sample, segmentation])))('preserves long %s labels through visible continuations with %s metadata and %s segmentation', async (locale, language, cluster, rtl, segmentation) => {
    const raw = cluster.repeat(240) + '\r\n  ' + cluster.repeat(12) + '\r\n';
    const input = fixture(), saved = JSON.stringify(input), current = load(code, { segmentation });
    await current.build(input, 'popup', { context: { currentUiLanguage: locale, labels: { hear_word: raw }, readerSettings: { baseFontSize: 48 } } });
    const parts = assertCaption(current, raw, language, rtl);
    expect(parts[0].options.y).toBe(6.06); expect(parts.slice(1).every(part => bodyBox(part.options))).toBe(true);
    expect(current.slides[0].media).toHaveLength(2);
    expect(current.slides.slice(1).every(slide => slide.media.length === 0)).toBe(true);
    expect(current.lifecycle.closes).toBe(1); expect(JSON.stringify(input)).toBe(saved);
  });

  it.each(['popup', 'blend', 'spelling'])('preserves %s audio phase/source/order and keeps annotation pages after the answer', async mode => {
    const input = fixture({ annotations: true }), current = load(code);
    const labels = { hear_word: '각'.repeat(250), hear_sounds: '난'.repeat(250) };
    const extra = { context: { currentUiLanguage: 'Korean', labels } };
    await current.build(input, mode, extra);
    expect(mediaDigest(current)).toEqual(expectedMedia(mode));
    const word = assertCaption(current, labels.hear_word, 'ko', false), sounds = assertCaption(current, labels.hear_sounds, 'ko', false);
    const answer = current.slides.findIndex(slide => slide.texts.some(entry => flatten(entry.text) === ANSWER));
    expect(answer).toBeGreaterThanOrEqual(0);
    const lastCaption = Math.max(...word.map(part => part.slide), ...sounds.map(part => part.slide));
    if (mode !== 'popup') for (let n = 0; n < answer; n++) expect(allText(current.slides[n])).not.toContain(ANSWER);
    if (mode === 'blend') { expect(sounds.at(-1).slide).toBeLessThan(answer); expect(word[0].slide).toBe(answer); expect(word.slice(1).every(part => footer(current.slides[part.slide]).includes('Answer'))).toBe(true); }
    if (mode === 'spelling') { expect(lastCaption).toBeLessThan(answer); expect(word.at(-1).slide).toBeLessThan(sounds[1].slide); }
    if (mode === 'popup') expect(word.at(-1).slide).toBeLessThan(sounds[1].slide);
    const notes = current.slides.map((slide, n) => allText(slide).includes(NOTE) ? n : -1).filter(n => n >= 0);
    expect(notes.length).toBeGreaterThan(0); expect(notes.every(n => n > answer && n > lastCaption)).toBe(true);
  });

  it('places audio-caption continuations after existing instruction parts and before the reveal', async () => {
    const input = fixture({ annotations: true }), current = load(code);
    const label = '난'.repeat(260), instruction = 'Safe prompt instruction '.repeat(180);
    await current.build(input, 'blend', { context: { currentUiLanguage: 'Korean', labels: { hear_sounds: label, blend_help: instruction } } });
    const parts = assertCaption(current, label, 'ko', false);
    const instructionPages = current.slides.flatMap((slide, n) => slide.texts.some(entry => bodyBox(entry.options) && instruction.includes(flatten(entry.text)) && entry.options.color === '475569') ? [n] : []);
    expect(instructionPages.length).toBeGreaterThan(0); expect(Math.max(...instructionPages)).toBeLessThan(parts[1].slide);
    const answer = current.slides.findIndex(slide => slide.texts.some(entry => flatten(entry.text) === ANSWER));
    expect(parts.at(-1).slide).toBeLessThan(answer); expect(mediaSequence(current)).toHaveLength(2);
    for (const part of parts.slice(1)) expect(allText(current.slides[part.slide])).not.toContain(ANSWER);
  });

  it('retains audio-off translation lookup counts and all existing non-audio slides', async () => {
    for (const mode of ['sentence', 'blend', 'spelling', 'vocabulary', 'popup']) {
      const counts = () => { const result = {}; return { result, t: key => { result[key] = (result[key] || 0) + 1; return key; } }; };
      const current = load(code), right = counts();
      const input = fixture({ sentence: true });
      await current.build(input, mode, { options: { includeAudio: false, vocabularyFirst: 'meaning' }, context: { t: right.t } });
      const extraKeys = { sentence: ['pptx_answer_note', 'pptx_answer'], blend: ['blend_help', 'pptx_answer'], spelling: ['pptx_spell_advance', 'spell_teacher', 'pptx_say_word_note', 'pptx_answer'], vocabulary: ['meaning_first_prompt', 'picture_clue', 'pptx_answer'], popup: [] };
      const expected = Object.fromEntries(['card_progress', 'mode_' + mode, ...extraKeys[mode]].map(key => ['word_practice.' + key, mode === 'vocabulary' && key === 'pptx_answer' ? 2 : 1]));
      expect(right.result).toEqual(expected);
      expect(current.slides).toHaveLength(mode === 'popup' ? 1 : mode === 'vocabulary' ? 3 : 2);
      expect(current.slides.flatMap(slide => slide.media)).toHaveLength(0);
      if (baselineCode) { const old = load(baselineCode); await old.build(input, mode, { options: { includeAudio: false, vocabularyFirst: 'meaning' }, context: { t: counts().t } }); expect(JSON.parse(JSON.stringify(current.slides))).toEqual(JSON.parse(JSON.stringify(old.slides))); }
      expect(current.lifecycle.constructed).toBe(0);
    }
  });

  it.each(['first-original-slot', 'later-full-width-body'])('rejects an indivisible grapheme that exceeds the %s instead of losing caption text', async position => {
    const huge = '👩\u200d'.repeat(160) + '👩';
    expect([...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(huge)]).toHaveLength(1);
    const raw = position === 'first-original-slot' ? huge : 'Earlier readable caption words. '.repeat(25) + '\n' + huge;
    const current = load(code), input = fixture(), saved = JSON.stringify(input);
    await expect(current.build(input, 'popup', { context: { labels: { hear_word: raw } } })).rejects.toThrow(/playback caption.*character group.*cannot fit/i);
    expect(current.lifecycle.closes).toBe(1); expect(JSON.stringify(input)).toBe(saved);
  });

  it('yields during long caption preparation, honors cancellation, and closes the decoded AudioContext', async () => {
    const controller = new AbortController(), current = load(code, { abortController: controller });
    await expect(current.build(fixture(), 'popup', { context: { signal: controller.signal, labels: { hear_word: '각'.repeat(1400) } } })).rejects.toMatchObject({ name: 'AbortError' });
    expect(controller.signal.aborted).toBe(true); expect(current.lifecycle.yields).toBeGreaterThan(0);
    expect(current.lifecycle.constructed).toBe(1); expect(current.lifecycle.decodes).toBe(2); expect(current.lifecycle.closes).toBe(1);
  });

  it('serializes exact label characters/style/language and distinct PCM playback relationships with the real vendor', async () => {
    const raw = '각'.repeat(180) + '\r\n  <literal> & ' + 'क्षि'.repeat(12), current = load(code, { native: true });
    const deck = await current.build(fixture(), 'popup', { context: { currentUiLanguage: 'Korean', labels: { hear_word: raw } } });
    const parts = assertCaption(current, raw, 'ko', false), zip = await JSZip.loadAsync(Buffer.from(await deck.write({ outputType: 'uint8array' })));
    const A = 'http://schemas.openxmlformats.org/drawingml/2006/main', P = 'http://schemas.openxmlformats.org/presentationml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const serialized = [];
    for (const part of parts) {
      const xml = await zip.file(`ppt/slides/slide${part.slide + 1}.xml`).async('string'), doc = new current.window.DOMParser().parseFromString(xml, 'application/xml');
      expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
      const shapes = [...doc.getElementsByTagNameNS(P, 'sp')].filter(shape => [...shape.getElementsByTagNameNS(A, 'off')].some(off => Math.abs(Number(off.getAttribute('x')) / 914400 - part.options.x) < .00001 && Math.abs(Number(off.getAttribute('y')) / 914400 - part.options.y) < .00001));
      expect(shapes).toHaveLength(1); const shape = shapes[0];
      serialized.push([...shape.getElementsByTagNameNS(A, 't')].map(node => node.textContent).join(''));
      const properties = [...shape.getElementsByTagNameNS(A, 'rPr')]; expect(properties.length).toBeGreaterThan(0);
      for (const property of properties) { expect(property.getAttribute('lang')).toBe('ko'); expect(property.getAttribute('b')).toBe('1'); expect(property.getAttribute('i')).toBe('1'); }
      expect([...shape.getElementsByTagNameNS(A, 'latin')].some(node => node.getAttribute('typeface') === 'Verdana')).toBe(true);
      expect(shape.getElementsByTagNameNS(A, 'normAutofit')).toHaveLength(0);
    }
    // XML parsers normalize literal CRLF to LF; every other character stays exact.
    expect(serialized.join('')).toBe(raw.replace(/\r\n?/g, '\n'));
    const xml = await zip.file('ppt/slides/slide1.xml').async('string'), doc = new current.window.DOMParser().parseFromString(xml, 'application/xml');
    const rels = new current.window.DOMParser().parseFromString(await zip.file('ppt/slides/_rels/slide1.xml.rels').async('string'), 'application/xml');
    const relationships = new Map([...rels.getElementsByTagName('Relationship')].map(node => [node.getAttribute('Id'), node.getAttribute('Target')]));
    // PptxGenJS 3.12 uses a:videoFile for audio; its linked relationship must be audio.
    const audio = [...doc.getElementsByTagNameNS(A, 'videoFile')]; expect(audio).toHaveLength(2);
    const payloads = [];
    for (const node of audio) { const id = node.getAttributeNS(R, 'link'), target = relationships.get(id); expect(target).toBeTruthy(); expect([...rels.getElementsByTagName('Relationship')].find(rel => rel.getAttribute('Id') === id).getAttribute('Type')).toBe(R + '/audio'); payloads.push(await zip.file(path.posix.normalize('ppt/slides/' + target)).async('nodebuffer')); }
    expect(payloads[0].equals(PCM[0])).toBe(true); expect(payloads[1].equals(payloads[0])).toBe(false);
    expect(payloads.map(sha)).toEqual(current.slides[0].media.map(media => sha(sourcePayload(media.data))));
    expect(current.slides.slice(1).every(slide => slide.media.length === 0)).toBe(true);
  }, 60000);
});
