// Make a read-along, packets-read-along.html (2026-11-16, owner: "please do read along page. if possible we may
// want to reuse what is already on the app instead of reinventing the wheel").
//
// A passage becomes one student file that reads it aloud a sentence at a time with the sentence marked. What is
// reused, and pinned here:
//   - the voice: the app's loader, started by packets_voice_engine.js (shared with the computer-voice page);
//   - the smaller recording: the app's MP3 encoder (lame.min.js), one channel at 64 kbps;
//   - the student file: the engine every Packets file uses (word_sounds_take_home_loader.js), with a read_along
//     activity that plays line by line the way Read the Story reads its story back.
// The page uses an AI voice and says so. The FILE it saves has no AI: it plays recordings and reaches no site.
// The real voice and a real saved file are checked in a browser (C:\tmp\overnight_1116\readalong\page_probe.cjs).

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const HTML = read('packets-read-along.html');
const JS = read('packets-read-along.js');
const ENGINE = read('packets_voice_engine.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');
const policyOf = (html) => new JSDOM(html).window.document.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
const loader = loadLoader();
const mp3 = (text) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + text).toString('base64');
const clipsFor = (sentences) => Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3(row.text)]));
const PASSAGE = 'The fox ran to the den. Mr. Lee saw it go! "Where is it?" he said.\nIt hid in the tall grass.\n\nThen the sun went down. The fox came out. It was a cool, dark night and the fox was glad.';

describe('the passage as sentences and pages', () => {
  const texts = (value) => RA.splitPassage(value).map((row) => (row.para ? '[P] ' : '') + row.text);

  it('ends a sentence at . ! or ?, but not at a title, an initial, a decimal, or a quote that goes on', () => {
    expect(texts(PASSAGE)).toEqual(['The fox ran to the den.', 'Mr. Lee saw it go!', '"Where is it?" he said.', 'It hid in the tall grass.', '[P] Then the sun went down.', 'The fox came out.', 'It was a cool, dark night and the fox was glad.']);
    expect(texts('It was 3.5 miles away, e.g. far. J. K. Rowling wrote it. Dr. Sato and Mrs. Ito came.')).toEqual(['It was 3.5 miles away, e.g. far.', 'J. K. Rowling wrote it.', 'Dr. Sato and Mrs. Ito came.']);
    expect(texts('Wait... what was that? (It was the cat.) Good!')).toEqual(['Wait... what was that?', '(It was the cat.)', 'Good!']);
  });

  it('keeps the teacher\'s own breaks: a new line ends a sentence, an empty line starts a paragraph, and nothing is rewritten', () => {
    expect(texts('Roses are red\nViolets are blue\n\nSugar is sweet')).toEqual(['Roses are red', 'Violets are blue', '[P] Sugar is sweet']);
    expect(texts('  Two   spaces.\tA tab.  ')).toEqual(['Two spaces.', 'A tab.']);
    expect(texts('')).toEqual([]);
    expect(texts('\n\n  \n')).toEqual([]);
    // The words are the teacher's: letters, capitals and marks come through as typed.
    expect(texts('¿Dónde está el zorro? Añadió: "aquí".')).toEqual(['¿Dónde está el zorro?', 'Añadió: "aquí".']);
  });

  it('cuts a very long run of words at a comma, and holds to its limits', () => {
    const long = Array.from({ length: 60 }, (_, i) => 'word' + i + ' and more, then').join(' ') + '.';
    const pieces = RA.splitPassage(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const row of pieces) expect(row.text.length).toBeLessThanOrEqual(RA.MAX_SENTENCE_CHARS);
    expect(pieces.map((row) => row.text).join(' ')).toBe(long);
    const many = Array.from({ length: 150 }, (_, i) => 'Line ' + i + '.').join(' ');
    expect(RA.splitPassage(many)).toHaveLength(RA.MAX_SENTENCES);
    expect(RA.sentenceCount(many)).toBe(150);
    expect(RA.splitPassage('x'.repeat(7000)).map((row) => row.text).join('').length).toBeLessThanOrEqual(RA.MAX_CHARS);
  });

  it('pages: at most six sentences, a long page breaks sooner, and a paragraph starts a page once the page has three', () => {
    const rows = RA.splitPassage(PASSAGE);
    expect(RA.pagesOf(rows).map((page) => page.length)).toEqual([4, 3]);
    expect(RA.pagesOf(RA.splitPassage(Array.from({ length: 14 }, (_, i) => 'Go ' + i + '.').join(' '))).map((page) => page.length)).toEqual([6, 6, 2]);
    const wordy = Array.from({ length: 5 }, () => 'This sentence is here to take up a good deal of room on the page so that the page fills quickly, well before six sentences fit.').join(' ');
    for (const page of RA.pagesOf(RA.splitPassage(wordy))) expect(page.length).toBeLessThanOrEqual(3);
    // A short first paragraph does not get a page to itself.
    expect(RA.pagesOf(RA.splitPassage('A title line\n\nOne. Two. Three.')).map((page) => page.length)).toEqual([4]);
    expect(RA.pagesOf([])).toEqual([]);
  });
});

describe('the lesson and the file', () => {
  it('makes one item for each page, with a recording for each sentence, and counts what has none', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const made = RA.lessonFromReadAlong({ loader, title: 'The fox', text: PASSAGE, clips: clipsFor(sentences), voice: 'af_heart' });
    expect([made.sentences, made.pages, made.recorded, made.missing]).toEqual([7, 2, 7, 0]);
    expect(made.lesson.mode).toBe('practice');
    expect(made.lesson.blocks).toHaveLength(1);
    expect(made.lesson.blocks[0].activity).toBe('read_along');
    expect(made.lesson.blocks[0].items.map((item) => [item.id, item.page, item.pages, item.lines.length])).toEqual([['read_along-01', 1, 2, 4], ['read_along-02', 2, 2, 3]]);
    expect(Object.keys(made.lesson.audio)).toHaveLength(7);
    expect(made.lesson.blocks[0].items[1].lines[0]).toEqual({ text: 'Then the sun went down.', audio: 's5', para: true });
    // The same sentence twice is one recording.
    const twice = RA.lessonFromReadAlong({ loader, text: 'Go on. Go on. Stop.', clips: { 'Go on.': mp3('a'), 'Stop.': mp3('b') } });
    expect(Object.keys(twice.lesson.audio)).toHaveLength(2);
    expect(twice.recorded).toBe(3);
    expect(twice.lesson.title).toBe('Read along');
  });

  it('allows silent/syllable-only and partial-clip passages while refusing non-audio clip URIs', () => {
    const sentences = RA.splitPassage(PASSAGE);
    expect(() => RA.lessonFromReadAlong({ loader, text: '', clips: {} })).toThrow('There is no passage yet.');
    // 2026-11-19 (Wave 3A): 0 clips (silent / syllable-only) builds cleanly with accurate manifest counts.
    const silent = RA.lessonFromReadAlong({ loader, text: PASSAGE, clips: {} });
    expect([silent.recorded, silent.missing, silent.pages]).toEqual([0, 7, 2]);
    const silentBuilt = RA.buildReadAlongPacket({ made: silent, loader });
    expect(silentBuilt.manifest.speech.recordings.sentences).toBe(0);
    expect(silentBuilt.manifest.readAlong.recordings).toBe(0);
    // Partial clips across only page 1 are also allowed cleanly.
    const half = clipsFor(sentences.slice(0, 4));
    const partial = RA.lessonFromReadAlong({ loader, text: PASSAGE, clips: half });
    expect([partial.recorded, partial.missing]).toEqual([4, 3]);
    // Malformed non-audio URIs are always refused.
    const bad = clipsFor(sentences);
    for (const key of Object.keys(bad)) bad[key] = 'data:text/html;base64,PHNjcmlwdD4=';
    expect(() => RA.lessonFromReadAlong({ loader, text: PASSAGE, clips: bad })).toThrow('A recording must be an audio file.');
    bad[RA.clipKey(sentences[0].text)] = 'javascript:alert(1)';
    expect(() => RA.lessonFromReadAlong({ loader, text: PASSAGE, clips: bad })).toThrow('A recording must be an audio file.');
    // One sentence without a recording is allowed: it is shown and not read.
    const most = clipsFor(sentences.slice(0, 6));
    const made = RA.lessonFromReadAlong({ loader, text: PASSAGE, clips: most });
    expect([made.recorded, made.missing]).toEqual([6, 1]);
    expect(made.lesson.blocks[0].items[1].lines[2]).toEqual({ text: 'It was a cool, dark night and the fox was glad.', audio: '' });
    expect(() => RA.lessonFromReadAlong({ loader: {}, text: PASSAGE, clips: most })).toThrow(/needs loader/);
  });

  it('builds a file that has no AI and no connection: it says so, and the same input gives the same bytes', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const made = RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences), voice: 'af_bella' });
    const built = RA.buildReadAlongPacket({ made, loader });
    const again = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences), voice: 'af_bella' }), loader });
    expect(again.html).toBe(built.html);
    expect(built.sha256).toMatch(/^[0-9a-f]{64}$/);
    const policy = policyOf(built.html);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("worker-src 'none'");
    expect(policy).not.toMatch(/https?:|huggingface|wasm/);
    expect(built.html).not.toMatch(/kokoro_tts_loader|speechSynthesis\.speak\([^)]*read_along/);
    expect(built.manifest.readAlong).toEqual({ builder: RA.VERSION, sentences: 7, pages: 2, recordings: 7, withoutRecording: 0, sentencesWithSyllables: 0 });
    expect(built.manifest.speech.engine).toBe('none');
    expect(built.manifest.speech.recordings).toEqual({ sentences: 7, made: 'ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice af_bella), a machine voice', humanReviewed: false });
    expect(built.html).toContain('runs no AI. The reading voice is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.');
    expect(JSON.stringify(built.manifest.attributions)).toContain('Kokoro-82M text-to-speech (voice af_bella), a machine voice. No person has listened to each one.');
    // A student's code name goes into the data block only.
    expect(RA.buildReadAlongPacket({ made, loader, learner: 'Blue Heron 7!' }).manifest.learner).toBe('Blue Heron 7');
    expect(() => RA.buildReadAlongPacket({ made: { lesson: { mode: 'check' } }, loader })).toThrow(/needs what lessonFromReadAlong made/);
  });
});

describe('the read-along activity in a student file', () => {
  const adapter = loader.CHECK_ADAPTERS.read_along;

  it('takes only what it lists: text, a clip name and a paragraph mark for each line', () => {
    const made = adapter.prepare({ lines: [{ text: '  One   line. ', audio: 's1', para: true, html: '<b>x</b>', onclick: 'x' }, { text: 'Two.', audio: 'javascript:1' }], page: 2, pages: 3, lang: 'en', extra: 1 });
    expect(made.item).toEqual({ lines: [{ text: 'One line.', audio: 's1', para: true }, { text: 'Two.', audio: '' }], lang: 'en', page: 2, pages: 3, word: 'One line.', target: 'read' });
    expect(adapter.prepare({ lines: [] }).missing).toEqual(['lines']);
    // 2026-11-19 (Wave 3A): silent / syllable-only lines with no audio prepare cleanly.
    expect(adapter.prepare({ lines: [{ text: 'A.', audio: '' }] }).item).toEqual({ lines: [{ text: 'A.', audio: '' }], lang: 'en', page: 1, pages: 1, word: 'A.', target: 'read' });
    expect(adapter.prepare({ lines: [{ text: '', audio: 's1' }] }).missing).toEqual(['text for every line']);
    expect(adapter.prepare({ lines: Array.from({ length: 61 }, () => ({ text: 'A.', audio: 's1' })) }).missing).toEqual(['lines']);
    expect(adapter.prepare({ lines: [{ text: 'A.', audio: 's1' }], lang: '"><script>' }).item.lang).toBe('en');
  });

  it('reads a page with each sentence marked in turn, reads a pressed sentence, slows down, and is never scored', async () => {
    const sentences = RA.splitPassage(PASSAGE);
    const built = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences) }), loader });
    const played = [];
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
      w.Audio = class { constructor() { this.playbackRate = 1; } set src(v) { this._src = v; } get src() { return this._src; } play() { played.push([Buffer.from(String(this._src).split(',')[1], 'base64').toString().slice(3), this.playbackRate]); setTimeout(() => { if (this.onended) this.onended(); }, 5); return Promise.resolve(); } pause() {} };
    } });
    const d = dom.window.document;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await wait(10); } throw new Error('Timed out waiting for ' + what); };
    const lines = () => [...d.querySelectorAll('[data-read-along-line]')];
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'page 1');
      expect(d.querySelector('#app h2').textContent).toBe('Read along: 1 of 2');
      expect(d.querySelector('[data-read-along-page]').textContent).toBe('Page 1 of 2');
      expect(lines().map((n) => n.textContent)).toEqual(sentences.slice(0, 4).map((row) => row.text));
      const play = d.querySelector('[data-read-along-play]');
      expect(play.textContent).toBe('Read to me');
      play.click();
      await until(() => lines().some((n) => n.getAttribute('aria-current') === 'true'), 'a marked sentence');
      expect(play.textContent).toBe('Stop');
      // Only one sentence is marked at a time.
      expect(lines().filter((n) => n.getAttribute('aria-current') === 'true')).toHaveLength(1);
      // Wave 9 multi-page continuity: with Auto-advance on, Read to me plays page 1 (4 sentences),
      // pauses calmly (~700ms), turns to page 2, and reads the remaining 3 sentences (7 total).
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 2 of 2' && d.querySelector('[data-read-along-play]').textContent === 'Read to me' && played.length === 7, 'the end of both pages');
      expect(played.map((p) => p[0])).toEqual(sentences.map((row) => row.text));
      expect(played.every((p) => p[1] === 1)).toBe(true);
      expect(lines().some((n) => n.hasAttribute('aria-current'))).toBe(false);
      // Go back to page 1 to verify stop/resume mid-page and Slower (0.8x) via Reading tools.
      const prevFromEnd = d.querySelector('[data-read-along-prev]');
      expect(prevFromEnd && prevFromEnd.textContent).toBe('Previous page');
      prevFromEnd.click();
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 1 of 2', 'back to page 1 for pause/resume');
      const play1 = d.querySelector('[data-read-along-play]');
      // Stop in the middle of the page, then resume from that sentence (not sentence 1).
      const beforeMid = played.length;
      play1.click();
      await until(() => played.length === beforeMid + 2, 'second sentence started');
      play1.click();
      expect(play1.textContent).toBe('Read to me');
      const pausedAt = played.length;
      const resumedSentence = played[pausedAt - 1][0];
      await wait(40);
      expect(played.length).toBe(pausedAt);
      play1.click();
      await until(() => played.length > pausedAt, 'resume from active sentence');
      expect(played[pausedAt][0]).toBe(resumedSentence);
      play1.click();
      await wait(30);
      // Slower via unified Reading tools (Voice speed: Slower) — bespoke Read-Along Slower button removed.
      expect(d.querySelector('[data-read-along-slower]')).toBeNull();
      d.querySelector('[data-tools-open]').click();
      const slower = d.querySelector('[data-tool="speed-1"]');
      expect(slower.closest('[data-tool-group="speed"]').hidden).toBe(false);
      slower.click();
      expect(slower.getAttribute('aria-pressed')).toBe('true');
      const beforeLine = played.length;
      lines()[2].click();
      await until(() => played.length === beforeLine + 1, 'the pressed sentence');
      expect(played[beforeLine]).toEqual(['"Where is it?" he said.', 0.8]);
      // Single-tap Next page advances cleanly without a second Next tap; page 2 offers Previous page to re-read page 1.
      expect(d.querySelector('[data-read-along-prev]')).toBeNull();
      expect(d.querySelector('[data-read-along-done]').textContent).toBe('Next page');
      d.querySelector('[data-read-along-done]').click();
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 2 of 2', 'page 2');
      expect(lines()).toHaveLength(3);
      const prevBtn = d.querySelector('[data-read-along-prev]');
      expect(prevBtn && prevBtn.textContent).toBe('Previous page');
      prevBtn.click();
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 1 of 2', 'back to page 1');
      // Revisit keeps page 1 interactive and lets the student advance back to page 2.
      d.querySelector('[data-read-along-done]').click();
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 2 of 2', 'return to page 2');
      expect(d.querySelector('[data-read-along-done]').textContent).toBe('Finish');
      d.querySelector('[data-read-along-done]').click();
      await until(() => /You finished/.test(d.querySelector('#app').textContent), 'the end');
      const end = d.querySelector('#app').textContent;
      expect(end).toContain('Practice, not scored: 2 of 2 done.');
      expect(end).not.toMatch(/percent|%|wrong|first try/i);
    } finally { dom.window.close(); }
  }, 60000);
});

describe('the page says what it is, and shares the voice instead of copying it', () => {
  it('has the computer-voice page\'s rule, word for word, and names no other site in its code', () => {
    expect(policyOf(HTML)).toBe(policyOf(read('packets-voice.html')));
    expect(JS).not.toMatch(/https?:\/\//);
    // It has no copy of how the voice is started or how a recording is made smaller: it asks the shared file.
    for (const name of ['kokoro_tts_loader', 'runtime_graph_host', 'engine_runtime_integrity', 'lame.min', 'Mp3Encoder', '_kokoroTTS']) expect(JS, name).not.toContain(name);
    // 2026-11-17: the encoder is named once, in the sound helpers the voice engine loads (packets_audio_kit.js).
    expect(ENGINE).toContain("'packets_audio_kit.js'");
    expect(read('packets_audio_kit.js')).toContain("'lame.min.js'");
    const doc = new JSDOM(HTML).window.document;
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_read_along_builder.js', 'syllable_table_en.js', 'packets_voice_engine.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_handoff.js', 'packets_zip.js', 'packets-read-along.js']);
    expect(doc.querySelector('details.proof').textContent).toContain('This page loads sixteen files from this site');
    expect(doc.querySelector('header .top-link').textContent).toBe('All Packets pages');
  });

  it('says it uses an AI voice on this device, that the passage is not uploaded, and that the saved file has no AI', () => {
    const doc = new JSDOM(HTML).window.document;
    expect(doc.querySelector('.proof-line').textContent).toBe('This page uses an AI voice, on this device. No account. Your passage is not uploaded.');
    expect(doc.querySelector('details.proof').hasAttribute('open')).toBe(false);
    const body = doc.querySelector('.proof-body').textContent.replace(/\s+/g, ' ');
    expect(body).toContain('This is one of the two Packets pages that use AI. The other is Make recordings with a computer voice.');
    expect(body).toContain('This page does not write, shorten or change the passage.');
    expect(body).toContain('Nothing is downloaded until you press Get the voice.');
    expect(body).toContain('It does not receive your passage.');
    expect(body).toContain('Run AI. It makes no speech: it only plays the recordings that were made here.');
    expect(body).toContain('They are not stored and not uploaded.');
    expect(body).toContain('Show longer words in syllables when the student presses Syllables. The breaks come from a word list on this site, looked up here when you make the file. No AI is used for them.');
    expect(body).toContain('Offer the Reading tools every Packets file has: text size, colors, spacing, letters, a reading focus line and a magnifier.');
    // "Runs without AI" is said of the FILE only, never of this page.
    expect(HTML.includes('This page runs without AI')).toBe(false);
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toContain('The reading voice is an AI voice that runs on this device. The file itself runs without AI.');
    expect(doc.querySelector('h1').textContent).toBe('Make a read-along');
    expect(doc.querySelector('.scope').textContent).toContain('Listening practice: nothing is scored.');
    // The front door points to it, in the note that sets the two voice pages apart, and still says its own page runs without AI.
    const door = new JSDOM(read('packets.html')).window.document;
    const note = [...door.querySelectorAll('.door-notes p')].find((p) => p.querySelector('a[href="packets-read-along.html"]'));
    expect(note.textContent).toContain('Two optional pages use a computer voice that runs on your device');
    expect(note.textContent).toContain('They are the only pages that work differently, and each says how at its top.');
    expect(note.textContent).toContain('reads it aloud with each sentence highlighted');
    expect(read('packets.html')).toContain('This page runs without AI.');
    // American wording on a teacher's page: "highlighted", as the other pages' spelling rule asks.
    expect(/\bmarked\b|\bmarking\b|practis|colour|licence/i.test(HTML)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The app's reading tools in the file (owner, 2026-11-16: "we will also want the reading tools in the app to be
// included in this"). The app's reader has text size, colors, wide text, line focus, a font choice, syllables and
// parts of speech. Every file already had the first four and a magnifier; these add Letters (every file) and
// Syllables (a read-along). Parts of speech need a text AI in the app, so no file has them.
// ---------------------------------------------------------------------------------------------------------------
describe('syllables: the words in parts, never changed', () => {
  const PARTS = { over: ['o', 'ver'], afternoon: ['af', 'ter', 'noon'], carefully: ['care', 'ful', 'ly'], kite: ['kite'], known: ['known'], well: ['well'], apple: ['ap', 'ple'], wrong: ['wr', 'ongg'], didn: ['did', 'n'], caf: ['c', 'af'] };
  const lookup = (word) => PARTS[word] || null;

  it('puts a dot at each break of a word the lookup knows, keeps capitals, and leaves every other word whole', () => {
    expect(RA.syllableText('The kite sailed over the trees.', lookup)).toBe('The kite sailed o·ver the trees.');
    expect(RA.syllableText('Carefully, all AFTERNOON!', lookup)).toBe('Care·ful·ly, all AF·TER·NOON!');
    // No word is split: nothing to show.
    expect(RA.syllableText('The kite is red.', lookup)).toBe('');
    expect(RA.syllableText('The kite sailed over.', null)).toBe('');
    // Parts that do not spell the word are refused, so a bad list cannot change what a student reads.
    expect(RA.syllableText('That is wrong.', lookup)).toBe('');
    // A word beside an apostrophe, an accent or a digit is left whole (didn't, cafe with an accent, over2).
    expect(RA.syllableText("She didn't go to the café over2 there.", lookup)).toBe('');
    expect(RA.syllableText('A well-known apple.', lookup)).toBe('A well-known ap·ple.');
    // A sentence that already has the dot in it is left alone.
    expect(RA.syllableText('o·ver and over', lookup)).toBe('');
    // Taking the dots out always gives the sentence back.
    const made = RA.syllableText('Over the apple tree, carefully.', lookup);
    expect(made.split('·').join('')).toBe('Over the apple tree, carefully.');
    expect(RA.syllableText('The kite sailed over.', () => { throw new Error('x'); })).toBe('');
  });

  it('uses the app\'s own table, and only the breaks it is sure of', () => {
    const table = require('../syllable_table_en.js');
    const sure = (word) => { const found = table.lookup(word); return found && !found.check ? found.parts : null; };
    expect(RA.syllableText('Mia looked for it all afternoon.', sure)).toBe('Mia looked for it all af·ter·noon.');
    expect(RA.syllableText('He got his ladder and climbed up, slowly and carefully.', sure)).toBe('He got his lad·der and climbed up, slow·ly and care·ful·ly.');
    // One-syllable words stay whole, however long.
    expect(RA.syllableText('The string slipped through.', sure)).toBe('');
    expect(read('packets-read-along.js')).toContain('return found && !found.check ? found.parts : null;');
  });

  it('goes into the lesson, the file\'s facts and its credits, and the activity keeps it only when it is the text plus dots', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const made = RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences), syllables: (word) => (word === 'glad' ? null : word === 'grass' ? ['gr', 'ass'] : null), syllableSource: 'a test list' });
    expect(made.syllables).toEqual({ sentences: 1, example: 'gr·ass', source: 'a test list' });
    expect(made.lesson.blocks[0].items[0].lines[3]).toEqual({ text: 'It hid in the tall grass.', audio: 's4', syl: 'It hid in the tall gr·ass.' });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.readAlong.sentencesWithSyllables).toBe(1);
    expect(JSON.stringify(built.manifest.attributions)).toContain('Syllable breaks: worked out when this file was made, from a word list (a test list). No AI.');
    // Without a lookup the file has none, and says nothing about them.
    const plain = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, sentences, clips: clipsFor(sentences) }), loader });
    expect(plain.manifest.readAlong.sentencesWithSyllables).toBe(0);
    expect(JSON.stringify(plain.manifest.attributions)).not.toContain('Syllable breaks');
    const adapter = loader.CHECK_ADAPTERS.read_along;
    const keep = (syl) => adapter.prepare({ lines: [{ text: 'Over the hill.', audio: 's1', syl }] }).item.lines[0].syl;
    expect(keep('O·ver the hill.')).toBe('O·ver the hill.');
    expect(keep('Under the hill.')).toBeUndefined();
    expect(keep('O·ver the hill. <b>x</b>')).toBeUndefined();
    expect(keep('Over the hill.')).toBeUndefined();
    expect(keep(42)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The page, run with a stand-in voice
// ---------------------------------------------------------------------------------------------------------------
function wavBytes(ms = 250) {
  const samples = Math.round(24000 * ms / 1000), data = samples * 2, buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(24000, 24); buf.writeUInt32LE(48000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  // A tone, so the encoder has something to encode.
  for (let i = 0; i < samples; i++) buf.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), 44 + i * 2);
  return new Uint8Array(buf);
}

async function openPage({ encoder = true, table = false, url = 'https://packets.test/site/packets-read-along.html', stubHandoff = null } = {}) {
  const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window, d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  const page = { w, d, dom, asked: [], added: [], spoken: [], saved: [], blobs: [] };
  w.fetch = async (url) => {
    page.asked.push(String(url));
    if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    if (String(url).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => wavBytes().buffer };
    return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  w.URL.createObjectURL = (blob) => { page.blobs.push(blob); return 'blob:https://packets.test/' + page.blobs.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) page.saved.push({ name: this.download, href: this.href }); };
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      page.added.push(src);
      // 2026-11-17: the shared sound helpers (packets_audio_kit.js) come first.
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = {
        init: async (onProgress) => { onProgress({ stage: 'Downloading voice model (~88MB)', pct: 0.5 }); return true; },
        speak: async (text, voice, speed, options) => {
          page.spoken.push({ text, voice, speed, word: options.word, force: options.force });
          if (options.signal && options.signal.aborted) { const stop = new Error('stopped'); stop.name = 'AbortError'; throw stop; }
          return /mute/.test(text) ? null : 'blob:voice/' + page.spoken.length;
        },
      };
      // The app's real MP3 encoder, or its absence.
      if (src === 'lame.min.js') { if (!encoder) { setTimeout(() => node.onerror && node.onerror(), 0); return node; } w.eval(read('lame.min.js')); }
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(LOADER_SRC);
  w.eval(read('packet_read_along_builder.js'));
  if (table) w.eval(read('syllable_table_en.js'));
  w.eval(ENGINE);
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  if (stubHandoff) w.AlloPacketHandoff = stubHandoff;
  else w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(JS);
  page.$ = (id) => d.getElementById(id);
  page.rows = () => [...d.querySelectorAll('#line-rows .voice-row')].map((row) => ({ text: row.querySelector('.ra-text').textContent, state: row.querySelector('.voice-state').textContent.replace(/\d+\.\d seconds/, 'N seconds'), buttons: [...row.querySelectorAll('button')].map((b) => b.textContent + (b.disabled ? ' (off)' : '')) }));
  page.until = async (test, what) => { for (let i = 0; i < 600; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 15)); } throw new Error('Timed out waiting for ' + what); };
  page.type = (id, text) => { page.$(id).value = text; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  return page;
}

describe('the read-along page, run with a stand-in voice', () => {
  it('asks for nothing until Get the voice is pressed; then records each sentence, builds the file and saves it', async () => {
    const page = await openPage();
    try {
      expect(page.$('no-parts').hidden).toBe(true);
      expect(page.asked).toEqual([]);
      expect(page.added).toEqual([]);
      expect(page.$('make-said').textContent).toBe('Type a passage in step 1 first.');
      page.type('f-title', 'The fox');
      page.type('f-text', PASSAGE);
      await page.until(() => page.rows().length === 7, 'the sentences');
      expect(page.$('text-said').textContent).toBe('7 sentences, on 2 pages of the file.');
      expect(page.rows()[2]).toEqual({ text: '"Where is it?" he said.', state: 'No recording yet.', buttons: ['Record', 'Make recording (off)'] });
      expect(page.$('make-all').disabled).toBe(true);
      // 2026-11-19 (Wave 3A): silent / syllable-only file builds immediately without needing Kokoro.
      await page.until(() => !page.$('save').hidden, 'silent file ready');
      expect(page.$('file-sub').textContent).toContain('No recordings yet');
      // Typing sends nothing and loads nothing.
      expect(page.asked).toEqual([]);
      expect(page.added).toEqual([]);

      page.$('get-voice').click();
      await page.until(() => /The voice is ready/.test(page.$('voice-said').textContent), 'the voice');
      expect(page.added).toEqual(['packets_audio_kit.js', 'runtime_graph_delivery_policy.js', 'runtime_graph_host.js', 'kokoro_tts_loader.js', 'lame.min.js']);
      expect(page.asked).toEqual(['engine_runtime_integrity.json']);
      expect(page.$('get-voice').textContent).toBe('The voice is ready');
      expect(page.$('make-all').textContent).toBe('Make the recordings for all 7 sentences');
      expect(page.$('make-said').textContent).toBe('The voice is ready. Press the button to make the 7 recordings.');

      page.$('f-voice').value = 'am_adam';
      page.$('make-all').click();
      await page.until(() => /7 recordings made/.test(page.$('make-said').textContent), 'the recordings');
      // Each sentence is said whole, as a sentence (not by the one-word recipe), in the voice chosen, a new recording each time.
      expect(page.spoken.map((s) => s.text)).toEqual(RA.splitPassage(PASSAGE).map((row) => row.text));
      expect(page.spoken.every((s) => s.voice === 'am_adam' && s.speed === 1 && s.word === false && s.force === true)).toBe(true);
      expect(page.rows()[0]).toEqual({ text: 'The fox ran to the den.', state: 'Recorded, N seconds.', buttons: ['Play', 'Record', 'Make again', 'Remove'] });
      // The recordings are MP3, made by the app's encoder: an MP3 frame starts each one.
      const clips = Object.values(page.w.AlloPacketReadAlongPage.state.clips);
      expect(clips).toHaveLength(7);
      for (const clip of clips) {
        expect(clip.uri.startsWith('data:audio/mpeg;base64,')).toBe(true);
        const bytes = Buffer.from(clip.uri.split(',')[1], 'base64');
        expect(bytes[0]).toBe(0xff);
        expect(bytes[1] & 0xe0).toBe(0xe0);
        expect(clip.ms).toBe(250);
      }

      await page.until(() => !page.$('save').hidden, 'the file');
      expect(page.$('file-said').textContent).toMatch(/^The file is ready: 7 sentences on 2 pages, \d+ KB\.$/);
      expect(page.$('file-sub').textContent).toBe('It will be saved as The-fox.html.');
      expect(page.$('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:https:\/\/packets\.test\//);
      page.$('save').click();
      expect(page.saved).toHaveLength(1);
      expect(page.saved[0].name).toBe('The-fox.html');
      expect(page.$('after-save').hidden).toBe(false);
      // What was saved is a file with no connection and no AI, holding the seven recordings.
      const html = page.w.AlloPacketReadAlongPage.state.built.html;
      expect(policyOf(html)).toContain("connect-src 'none'");
      expect(html).not.toMatch(/huggingface|kokoro_tts_loader/);
      const manifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html)[1]);
      expect(manifest.readAlong.recordings).toBe(7);
      expect(manifest.speech.recordings.made).toContain('(voice am_adam)');
      // Nothing but the voice's own list was asked for on the way, and nothing the teacher typed was in any address.
      expect(page.asked.filter((u) => !u.startsWith('blob:voice/'))).toEqual(['engine_runtime_integrity.json']);
      expect(page.asked.join(' ')).not.toMatch(/fox|den/);
    } finally { page.dom.window.close(); }
  }, 120000);

  it('a changed sentence needs a new recording, the others keep theirs, and a sentence the voice cannot say is named', async () => {
    const page = await openPage();
    try {
      page.type('f-text', 'One fish. Two fish.');
      await page.until(() => page.rows().length === 2, 'the sentences');
      page.$('get-voice').click();
      await page.until(() => !page.$('make-all').disabled, 'the voice');
      page.$('make-all').click();
      await page.until(() => /2 recordings made/.test(page.$('make-said').textContent), 'the recordings');
      await page.until(() => !page.$('save').hidden, 'the file');
      page.type('f-text', 'One fish. Two fish. A mute fish. Blue fish.');
      await page.until(() => page.rows().length === 4, 'four sentences');
      expect(page.rows().map((r) => r.state)).toEqual(['Recorded, N seconds.', 'Recorded, N seconds.', 'No recording yet.', 'No recording yet.']);
      expect(page.$('make-all').textContent).toBe('Make the recordings for the 2 sentences that have none');
      page.spoken.length = 0;
      page.$('make-all').click();
      await page.until(() => /1 recording made/.test(page.$('make-said').textContent), 'the second run');
      expect(page.spoken.map((s) => s.text)).toEqual(['A mute fish.', 'Blue fish.']);
      expect(page.$('make-problem').textContent).toBe('Not made: sentence 3. The voice gave no sound it could keep. Press Make recording on a sentence to try again, or change the sentence.');
      // The file is still made: the sentence is shown and not read, and the page says so.
      await page.until(() => !page.$('save').hidden, 'the file again');
      expect(page.$('file-sub').textContent).toBe('1 sentence has no recording. The student sees it, and the file does not read it aloud. It will be saved as read-along.html.');
      // One sentence's own button makes that one again.
      page.spoken.length = 0;
      page.d.querySelector('[data-make="1"]').click();
      await page.until(() => /1 recording made/.test(page.$('make-said').textContent) && page.spoken.length === 1, 'one sentence again');
      expect(page.spoken[0].text).toBe('One fish.');
    } finally { page.dom.window.close(); }
  }, 120000);

  it('without the encoder it keeps the larger recording and says so; when the voice does not arrive it says so and can be tried again', async () => {
    const page = await openPage({ encoder: false });
    try {
      page.type('f-text', 'One fish.');
      await page.until(() => page.rows().length === 1, 'the sentence');
      page.$('get-voice').click();
      await page.until(() => /The voice is ready/.test(page.$('voice-said').textContent), 'the voice');
      expect(page.$('voice-said').textContent).toContain('The part that makes recordings smaller did not arrive, so the file will be larger than usual.');
      page.$('make-all').click();
      await page.until(() => /1 recording made/.test(page.$('make-said').textContent), 'the recording');
      expect(Object.values(page.w.AlloPacketReadAlongPage.state.clips)[0].uri.startsWith('data:audio/wav;base64,UklGR')).toBe(true);
      await page.until(() => !page.$('save').hidden, 'the file');
    } finally { page.dom.window.close(); }
    const down = await openPage();
    try {
      down.w.fetch = async () => ({ ok: false, json: async () => ({}) });
      down.$('get-voice').click();
      await down.until(() => down.$('voice-problem').textContent !== '', 'the problem line');
      expect(down.$('voice-problem').textContent).toBe('The list of voice files did not arrive. Nothing was changed. You can try again.');
      expect(down.$('get-voice').disabled).toBe(false);
      expect(down.$('make-all').disabled).toBe(true);
    } finally { down.dom.window.close(); }
  }, 120000);
});

describe('the reading tools in a read-along file', () => {
  const table = require('../syllable_table_en.js');
  const sure = (word) => { const found = table.lookup(word); return found && !found.check ? found.parts : null; };
  const TEXT = 'The kite sailed over the trees. Mia looked for it all afternoon. It was red.\n\nShe was happy again. Then she went home.\n\nThe next morning was sunny. Everybody remembered.';

  it('Syllables shows the words in parts, a screen reader still gets the plain words, and the choice stays on the next page', async () => {
    const sentences = RA.splitPassage(TEXT);
    const built = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Kite', sentences, clips: clipsFor(sentences), syllables: sure }), loader });
    const played = [];
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/kite.html', beforeParse(w) {
      w.Audio = class { constructor() { this.playbackRate = 1; } set src(v) { this._src = v; } get src() { return this._src; } play() { played.push(this.playbackRate); setTimeout(() => { if (this.onended) this.onended(); }, 5); return Promise.resolve(); } pause() {} };
    } });
    const d = dom.window.document;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await wait(10); } throw new Error('Timed out waiting for ' + what); };
    const lines = () => [...d.querySelectorAll('[data-read-along-line]')];
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'page 1');
      const syl = d.querySelector('[data-read-along-syllables]');
      expect(syl.textContent).toBe('Syllables');
      expect(syl.getAttribute('aria-pressed')).toBe('false');
      expect(lines().map((n) => n.textContent)).toEqual(['The kite sailed over the trees.', 'Mia looked for it all afternoon.', 'It was red.']);
      syl.click();
      expect(syl.getAttribute('aria-pressed')).toBe('true');
      expect(lines().map((n) => n.textContent)).toEqual(['The kite sailed o·ver the trees.', 'Mia looked for it all af·ter·noon.', 'It was red.']);
      // A screen reader reads the sentence, not the parts. A line with no split word needs no label.
      expect(lines().map((n) => n.getAttribute('aria-label'))).toEqual(['The kite sailed over the trees.', 'Mia looked for it all afternoon.', null]);
      // Voice speed (Slower) in Reading tools too, then single-tap Next page: both stay as chosen AND persist in state.tools across reloads.
      expect(d.querySelector('[data-read-along-slower]')).toBeNull();
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="speed-1"]').click();
      d.querySelector('[data-read-along-done]').click();
      await until(() => d.querySelector('#app h2').textContent === 'Read along: 2 of 2', 'page 2');
      expect(d.querySelector('[data-read-along-syllables]').getAttribute('aria-pressed')).toBe('true');
      expect(d.querySelector('[data-tool="speed-1"]').getAttribute('aria-pressed')).toBe('true');
      const storedRaw = Object.values(Object.fromEntries(Object.keys(dom.window.localStorage).map((k) => [k, dom.window.localStorage.getItem(k)])))[0];
      expect(JSON.parse(storedRaw).tools).toMatchObject({ speed: 1, syllables: 1 });
      expect(lines().map((n) => n.textContent)).toEqual(['She was hap·py a·gain.', 'Then she went home.', 'The next morn·ing was sun·ny.', 'Ev·ery·bod·y re·mem·bered.']);
      lines()[0].click();
      await until(() => played.length === 1, 'a sentence');
      expect(played[0]).toBe(0.8);
      // Off again: the plain words, and no label left behind.
      d.querySelector('[data-read-along-syllables]').click();
      expect(lines().slice(0, 2).map((n) => [n.textContent, n.getAttribute('aria-label')])).toEqual([['She was happy again.', null], ['Then she went home.', null]]);
    } finally { dom.window.close(); }
  }, 60000);

  it('a file with no syllable breaks has no Syllables button, and every file\'s Reading tools offer Letters', async () => {
    const sentences = RA.splitPassage(TEXT);
    const built = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, sentences, clips: clipsFor(sentences) }), loader });
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/plain.html' });
    const d = dom.window.document;
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out waiting for ' + what); };
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'page 1');
      expect(d.querySelector('[data-read-along-syllables]')).toBeNull();
      // The tools that mean something on a page of running text with recordings are offered; question-only tools are not.
      const shown = [...d.querySelectorAll('[data-tool-group]')].filter((g) => !g.hidden).map((g) => g.getAttribute('data-tool-group'));
      expect(shown).toEqual(['size', 'colors', 'spacing', 'font', 'focus', 'lens', 'speed', 'bold', 'motion']);
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="font-1"]').click();
      expect(d.documentElement.getAttribute('data-lt-font')).toBe('1');
      expect(d.querySelector('[data-tool="font-1"]').getAttribute('aria-pressed')).toBe('true');
      // Rounded letters are offered only where the device has such a font. This test's browser has none.
      expect(d.querySelector('[data-tool="font-4"]').hidden).toBe(true);
      expect([1, 2, 3].map((n) => d.querySelector('[data-tool="font-' + n + '"]').textContent)).toEqual(['Lexend', 'Atkinson', 'Book']);
      d.querySelector('[data-tool="font-0"]').click();
      expect(d.documentElement.hasAttribute('data-lt-font')).toBe(false);
      const css = d.querySelector('style').textContent;
      expect(css).toContain('[data-lt-font="1"] body,[data-tool=font-1]{font-family:Lexend,system-ui,sans-serif}');
      expect(css).toContain('[data-lt-font="3"] body,[data-tool=font-3]{font-family:Georgia,"Times New Roman",Times,serif}');
      // The two reading fonts travel inside the file: the only addresses in its style are data: addresses, and its rule allows fonts from inside the file only.
      expect(css.match(/@font-face/g)).toHaveLength(2);
      expect((css.match(/url\(([^)]*)\)/g) || []).every((u) => u.startsWith('url(data:font/woff2;base64,'))).toBe(true);
      const rule = d.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      expect(rule).toContain("; font-src data:;");
      expect(JSON.parse(d.getElementById('packet-manifest').textContent).fonts).toBe('Fonts: Lexend (2019 The Lexend Project Authors) and Atkinson Hyperlegible (2020 Braille Institute of America, Inc.), SIL Open Font License 1.1.');
    } finally { dom.window.close(); }
  }, 60000);

  it('the page looks the breaks up in the app\'s table and tells the teacher the file has a Syllables button', async () => {
    const page = await openPage({ table: true });
    try {
      page.type('f-text', 'The kite sailed over the trees.');
      await page.until(() => page.rows().length === 1, 'the sentence');
      page.$('get-voice').click();
      await page.until(() => !page.$('make-all').disabled, 'the voice');
      page.$('make-all').click();
      await page.until(() => !page.$('save').hidden, 'the file');
      expect(page.$('file-sub').textContent).toBe('It has a Syllables button, which shows longer words in parts (o·ver). It will be saved as read-along.html.');
      const html = page.w.AlloPacketReadAlongPage.state.built.html;
      const manifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html)[1]);
      expect(manifest.readAlong.sentencesWithSyllables).toBe(1);
      expect(JSON.stringify(manifest.attributions)).toContain('Syllable breaks: worked out when this file was made, from a word list (Moby Hyphenator II, Grady Ward, public domain by grant of the author (2001); checked against CMUdict, Carnegie Mellon University). No AI.');
      // The table itself (~1.2 MB) does not go into the file: only the breaks of this passage do.
      // Re-pinned 2026-11-19 (Immersive Reader parity Waves 4-8) from 200000: offline Focus Mode, Crawl, Chunk pace/moods, POS, Word meanings, Tap Sounds/Speak (~207 KB).
      // Re-pinned 2026-11-22 (Show my teacher) from 225000: collapsed deskside conferencing fold on practice end screen (~229.3 KB).
      // Re-pinned 2026-11-22 (Wave 9 multi-page continuity) from 235000: multi-page Crawl/Focus/Chunk/Play continuity, Intl.Segmenter, Jump/Bookmark, full-passage print, Reduced Motion (~252 KB).
      expect(html.length).toBeLessThan(260000);
    } finally { page.dom.window.close(); }
  }, 120000);
});

// The pages a read-along file is taken to next. Run in a real browser too (C:\tmp\overnight_1116\readalong\after_probe.cjs).
describe('a read-along file on the other Packets pages', () => {
  const verify = require('../packets_verify_core.js');
  const reopen = require('../packets_reopen.js');
  const sentences = RA.splitPassage(PASSAGE);
  const html = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences) }), loader }).html;

  it('another maker\'s "Open a file I made" says what it is and where it is made, not "Word Sounds practice"', () => {
    const SAID = 'This is a read-along. Make a read-along makes it, and can open it again.';
    const inWords = reopen.read(html, { verify, wordSounds: ['isolation'], activities: ['isolation'] });
    expect([inWords.ok, inWords.kind, inWords.why, inWords.page]).toEqual([false, 'read', SAID, { href: 'packets-read-along.html', name: 'Make a read-along' }]);
    const inMath = reopen.readMath(html, { verify });
    expect([inMath.ok, inMath.kind, inMath.why]).toEqual([false, 'read', SAID]);
    const inCheck = reopen.readCheck(html, { verify });
    expect([inCheck.ok, inCheck.kind, inCheck.why]).toEqual([false, 'read', SAID]);
  });

  it('Open a practice file calls it a read-along with pages to listen to, and Add up results never shows an empty group', () => {
    const open = read('packets-open.js');
    expect(open).toContain("read: { href: 'packets-read-along.html', name: 'Make a read-along', reopens: true },");
    expect(open).toContain("every(/^read_along$/) ? 'read'");
    expect(open).toContain("kind === 'read' ? 'A read-along'");
    expect(open).toContain("if (about.pages) line.push(count(about.pages, 'page', 'pages') + ' to listen to.');");
    const results = read('packets-results.js');
    expect(results).toContain("if (!tables.length) add(host, el('p', 'group-none', 'Nothing in these results is scored: they are practice that is never scored, such as a read-along. Choose One student to see what each student did.'));");
    expect(results).toContain("lettersBook: 'book letters', lettersRounded: 'rounded letters'");
    // The file "Check a file" reads says it cannot connect, and nothing in it says otherwise.
    const parts = verify.readParts(html);
    expect(parts.ok).toBe(true);
    expect(parts.lesson.blocks[0].activity).toBe('read_along');
  });
});

describe('Wave 3A: Read-Along full parity (silent mode, teacher mic, reopen, batch .zip, print sheet)', () => {
  const verify = require('../packets_verify_core.js');
  const table = require('../syllable_table_en.js');
  const sure = (word) => { const found = table.lookup(word); return found && !found.check ? found.parts : null; };

  it('silent / syllable-only file hides Read to me and Voice speed while keeping Syllables and Reading tools', async () => {
    const made = RA.lessonFromReadAlong({ loader, title: 'Silent passage', text: 'The kite sailed over the trees.\n\nEverybody remembered.', clips: {}, syllables: sure });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.speech.recordings.sentences).toBe(0);
    expect(built.manifest.readAlong.recordings).toBe(0);
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/silent.html' });
    const d = dom.window.document;
    const until = async (test, what) => { for (let i = 0; i < 200; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
    try {
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-syllables]'), 'syllables button');
      expect(d.querySelector('[data-read-along-play]')).toBeNull();
      expect(d.querySelector('[data-read-along-line]').tagName).toBe('SPAN');
      d.querySelector('[data-tools-open]').click();
      expect(d.querySelector('[data-tool-group="speed"]').hidden).toBe(true);
      d.querySelector('[data-read-along-syllables]').click();
      expect(d.querySelector('[data-read-along-line="1"]').textContent).toBe('The kite sailed o·ver the trees.');
    } finally { dom.window.close(); }
  }, 60000);

  it('teacher mic recording is strictly click-gated, encodes 64 kbps MP3 without downloading Kokoro, and handles denial gracefully', async () => {
    const page = await openPage({ table: true });
    let micRequests = 0;
    let denyNext = false;
    let activeRecorder = null;
    try {
      page.w.navigator.mediaDevices = {
        getUserMedia: async () => {
          micRequests++;
          if (denyNext) { const err = new Error('denied'); err.name = 'NotAllowedError'; throw err; }
          return { getTracks: () => [{ stop() {} }] };
        },
      };
      page.w.MediaRecorder = class {
        constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; activeRecorder = this; }
        start() { this.state = 'recording'; }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) this.ondataavailable({ data: new page.w.Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }) });
          if (this.onstop) this.onstop();
        }
      };
      page.w.OfflineAudioContext = class {
        decodeAudioData(_buf, ok) {
          const samples = new Float32Array(22050 * 0.4);
          for (let i = 0; i < samples.length; i++) samples[i] = 0.4 * Math.sin(i / 8);
          const decoded = { length: samples.length, numberOfChannels: 1, sampleRate: 22050, getChannelData: () => samples };
          if (ok) ok(decoded);
          return Promise.resolve(decoded);
        }
      };

      page.type('f-title', 'My voice story');
      page.type('f-text', 'The fox ran fast. It hid in the grass.');
      await page.until(() => page.rows().length === 2, 'two rows');
      // Never asks for mic or Kokoro before click!
      expect(micRequests).toBe(0);
      expect(page.added).toEqual([]);

      // Click Record on sentence 1 -> starts recording -> click Stop -> encodes MP3 without Kokoro.
      page.d.querySelector('[data-record="1"]').click();
      await page.until(() => activeRecorder && activeRecorder.state === 'recording', 'recording started');
      expect(micRequests).toBe(1);
      page.d.querySelector('[data-record="1"]').click();
      await page.until(() => /your voice/.test(page.rows()[0].state), 'teacher clip saved');
      expect(page.added).toEqual(['packets_audio_kit.js', 'lame.min.js']);
      expect(page.asked).toEqual([]);
      const clip = page.w.AlloPacketReadAlongPage.state.clips['The fox ran fast.'];
      expect(clip.source).toBe('teacher');
      expect(clip.uri.startsWith('data:audio/mpeg;base64,')).toBe(true);
      const manifest = JSON.parse(/id="packet-manifest">([\s\S]*?)<\/script>/.exec(page.w.AlloPacketReadAlongPage.state.built.html)[1]);
      expect(manifest.speech.recordings.made).toContain('recorded by the teacher');
      expect(manifest.speech.recordings.sentences).toBe(1);

      // Permission denial shows a calm message and never crashes.
      denyNext = true;
      page.d.querySelector('[data-record="2"]').click();
      await page.until(() => /Microphone permission was refused/.test(page.$('make-problem').textContent), 'denial message');
    } finally { page.dom.window.close(); }
  }, 60000);

  it('reopens a read-along file reusing unchanged sentence MP3s, supports unified code-name/batch .zip, and prints honoring Syllables', async () => {
    const css = read('packets-read-along-print.css');
    expect(css).toContain('@media print');
    expect(css).toContain('var(--');
    expect(css).not.toMatch(/:root|@keyframes|@import|url\(|#[0-9a-f]{3}/i);

    const sentences = RA.splitPassage(PASSAGE);
    const orig = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences), voice: 'am_adam', syllables: sure }),
      loader,
      learner: 'BlueHeron7',
    });
    const back = RA.readBack(verify.readParts(orig.html));
    expect(back.ok).toBe(true);
    expect(back.title).toBe('The fox');
    expect(back.voice).toBe('am_adam');
    expect(back.learner).toBe('BlueHeron7');
    expect(back.recordings).toBe(7);
    expect(RA.splitPassage(back.text)).toEqual(sentences);

    const page = await openPage({ table: true });
    let printed = 0;
    page.w.print = () => { printed++; };
    try {
      expect(page.w.AlloPacketReadAlongPage.reopen(orig.html, 'The-fox.html')).toBe(true);
      expect(page.$('f-title').value).toBe('The fox');
      expect(page.$('f-voice').value).toBe('am_adam');
      expect(page.$('f-batch-names').value).toBe('BlueHeron7');
      expect(page.$('batch').open).toBe(true);
      expect(page.w.AlloPacketReadAlongPage.state.built.name).toBe('The-fox__BlueHeron7.html');
      expect(page.rows().every((r) => /Recorded/.test(r.state))).toBe(true);

      // Edit 1 sentence with a multisyllable word: the other 6 keep their reopened MP3 clips!
      page.type('f-text', back.text.replace('The fox came out.', 'The brown fox came out this afternoon.'));
      await page.until(() => page.rows().some((r) => r.state === 'No recording yet.') && !page.$('save').hidden, 'changed sentence rebuilt');
      expect(page.rows().filter((r) => /Recorded/.test(r.state))).toHaveLength(6);

      // 2+ code names -> 1-click Save .zip!
      page.type('f-batch-names', 'BlueHeron7\nRedFox3');
      expect(page.$('batch-make').hidden).toBe(false);
      expect(page.$('batch-make').textContent).toBe('Save .zip for 2 students');
      page.$('batch-make').click();
      expect(page.$('batch-problem').textContent).toBe('');
      expect(page.saved.some((s) => s.name === 'The-fox__2-students.zip')).toBe(true);

      // Print on paper honors Syllables!
      await page.until(() => !page.$('print').hidden && !page.$('print-syl-wrap').hidden, 'print controls');
      expect(page.$('print').className).not.toContain('btn-primary');
      page.$('print-syl').checked = true;
      page.$('print-syl').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.$('print').click();
      expect(printed).toBe(1);
      expect(page.$('paper').textContent).toContain('af·ter·noon');
      expect(page.d.body.classList.contains('paper-on')).toBe(true);
      expect(page.$('paper').querySelectorAll('.paper-para').length).toBe(2);
    } finally { page.dom.window.close(); }
  }, 60000);

  it('Wave 3B: registers readReadAlong in packets_reopen.js, accepts #open-file handoff on boot, and redirects wrong files in 1 click', async () => {
    const reopenKit = require('../packets_reopen.js');
    const sentences = RA.splitPassage(PASSAGE);
    const orig = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'The fox', sentences, clips: clipsFor(sentences), voice: 'am_adam' }),
      loader,
      learner: 'BlueHeron7',
    });
    const withBuilder = reopenKit.readReadAlong(orig.html, { verify, builder: RA, codeName: RA.codeName });
    expect(withBuilder.ok).toBe(true);
    expect(withBuilder.kind).toBe('read');
    expect(withBuilder.readAlong.recordings).toBe(7);
    const standalone = reopenKit.readReadAlong(orig.html, { verify });
    expect(standalone.ok).toBe(true);
    expect(standalone.readAlong.sentences).toHaveLength(7);

    // Booting packets-read-along.html#open-file takes the handed-off file, clears hash, and loads it.
    const handed = [];
    const page = await openPage({
      url: 'https://packets.test/site/packets-read-along.html#open-file',
      stubHandoff: {
        HASH: '#open-file',
        RESULTS_HASH: '#import-results',
        take: async () => ({ name: 'The-fox.html', bytes: new TextEncoder().encode(orig.html).buffer }),
        redirect: async (file, href, hash) => { handed.push({ name: file.name, href, hash }); },
      },
    });
    try {
      await page.until(() => page.$('f-title').value === 'The fox', 'handed read-along loaded');
      expect(page.w.location.hash).toBe('');
      expect(page.$('f-batch-names').value).toBe('BlueHeron7');

      // Dropping a results CSV shows the 1-click redirect link to packets-results.html#import-results.
      const csv = '\uFEFF"format","session_id"\r\n"alloflow-packet-result/1","S-1"\r\n';
      expect(page.w.AlloPacketReadAlongPage.reopen(csv, 'ra-res.csv')).toBe(false);
      expect(page.$('reopen-page').hidden).toBe(false);
      expect(page.$('reopen-page').getAttribute('href')).toBe('packets-results.html');
      page.$('reopen-page').dispatchEvent(new page.w.MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(handed).toEqual([{ name: 'ra-res.csv', href: 'packets-results.html', hash: '#import-results' }]);
    } finally { page.dom.window.close(); }
  });

  it('Wave 4A: preserves month/textbook abbreviations in splitPassage and supports Space, Arrow, and R shortcuts in the student player', async () => {
    expect(RA.splitPassage('Prof. Rivera met Sam on Jan. 5. Look at Fig. 2 on p. 12.')).toEqual([
      { text: 'Prof. Rivera met Sam on Jan. 5.' },
      { text: 'Look at Fig. 2 on p. 12.' },
    ]);
    // Genuine sentence ends after a time or month still split cleanly.
    expect(RA.splitPassage('We arrived at 3 p.m. Then we ate.')).toEqual([
      { text: 'We arrived at 3 p.m.' },
      { text: 'Then we ate.' },
    ]);

    const sentences = RA.splitPassage('First line here. Second line here. Third line here.');
    const clips = Object.fromEntries(sentences.map((s, i) => [RA.clipKey(s.text), 'data:audio/mpeg;base64,' + Buffer.from('CLIP' + i).toString('base64')]));
    const built = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Keys test', sentences, clips }), loader });
    const played = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/keys.html',
      beforeParse(w) {
        w.Audio = class {
          set src(v) { this._src = v; }
          get src() { return this._src; }
          play() { played.push(this._src); return Promise.resolve(); }
          pause() {}
        };
      },
    });
    const w = dom.window, d = w.document;
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await new Promise((r) => setTimeout(r, 30));
      const h2 = d.querySelector('#app h2');
      h2.focus();
      // ArrowRight steps to sentence 1, then sentence 2.
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(played[played.length - 1]).toBe(clips[RA.clipKey(sentences[0].text)]);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(played[played.length - 1]).toBe(clips[RA.clipKey(sentences[1].text)]);
      // R replays the current active sentence (sentence 2).
      const beforeR = played.length;
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'r', code: 'KeyR', bubbles: true, cancelable: true }));
      expect(played.length).toBe(beforeR + 1);
      expect(played[played.length - 1]).toBe(clips[RA.clipKey(sentences[1].text)]);
      // ArrowLeft steps back to sentence 1.
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      expect(played[played.length - 1]).toBe(clips[RA.clipKey(sentences[0].text)]);
      // Space (when focus is on heading, not a button) starts Read to me and toggles Stop.
      const playBtn = d.querySelector('[data-read-along-play]');
      expect(playBtn.textContent).toBe('Read to me');
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      expect(playBtn.textContent).toBe('Stop');
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      expect(playBtn.textContent).toBe('Read to me');
    } finally { w.close(); }
  });
});
