import { afterAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// The small fixes of the teacher-journey review of AlloFlow Packets, 2026-11-13: a first-time teacher walked the front
// door, the four makers, giving files out and getting results back, and the guide for school IT, in Chromium at 375 px
// and 1280 px (findings and screenshots: C:\tmp\packets_build_1111\journey\). Each block below is one of the fixes.
const read = (file) => readFileSync(file, 'utf8');
const parse = (file) => new JSDOM(read(file)).window.document;
const squash = (text) => String(text).replace(/\s+/g, ' ').trim();
const MAKERS = ['packets-make.html', 'packets-check.html', 'packets-math-practice.html', 'packets-vocab.html'];
const csp = (doc) => doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

describe('the front door says what each maker makes, at the sizes the makers state', () => {
  it('"a short check", not only "a math check": vocabulary files can be checks too', () => {
    const door = parse('packets.html');
    expect(squash(door.querySelector('.lead').textContent)).toBe('Make a practice file or a short check for your students in three steps. '
      + 'A student opens it, completes it and saves a results file that you can open in a spreadsheet.');
    expect(squash(parse('packets-vocab.html').querySelector('#modes').textContent)).toContain('A check');
  });

  it('the sizes on the front door cover the sizes each maker says', () => {
    const facts = squash(parse('packets.html').querySelector('.facts').textContent);
    // 2026-11-14 (T1 + R1): reconciled math sizes (95 to 140 KB) and Word Sounds built WAV sizes (usually 1 to 5 MB at 64 kbps).
    expect(facts).toBe('One file. Word Sounds practice is usually 1 to 5 MB; math files are about 95 to 140 KB; vocabulary files are about 100 KB, more with recordings. Works with no internet.');
    const [low, high] = /math files are about (\d+) to (\d+) KB/.exec(facts).slice(1).map(Number);
    const kb = (file, id) => Number(/About (\d+) KB/.exec(parse(file).getElementById(id).textContent)[1]);
    for (const n of [kb('packets-check.html', 'size-note'), kb('packets-math-practice.html', 'size-note')]) expect(n >= low && n <= high, String(n)).toBe(true);
    expect(squash(parse('packets-vocab.html').querySelector('#step-2 .actions-note').textContent)).toContain('A file of vocabulary questions is about 100 KB.');
  });
});

describe('after saving, every maker says what Google Drive and Google Classroom need', () => {
  it('the same sentence in the first step of "What to do next", on all four makers', () => {
    const LINE = 'From Google Drive or Google Classroom, a student downloads the file first: the preview there does not run it.';
    for (const file of MAKERS) {
      const first = parse(file).querySelector('#after-save ol li');
      expect(squash(first.textContent), file).toBe('Send the file to your students the way you send any file: your learning platform, a shared drive or a USB drive. ' + LINE);
    }
    // The front door and the guide for school IT say the same of the previews.
    expect(squash(parse('packets.html').getElementById('check').textContent)).toContain('The previews in Google Drive, Google Classroom and the iPad Files app do not run the file.');
  });
});

describe('the vocabulary maker is exact about what it fetches and where AI was used ahead of time', () => {
  const doc = parse('packets-vocab.html');
  it('its line says the words are not uploaded, as the Word Sounds maker says, because it fetches the recordings of the words by need', () => {
    expect(squash(doc.querySelector('details.proof .proof-line').textContent)).toBe('This page runs without AI. No account. The words you type are not uploaded.');
    expect(squash(parse('packets-make.html').querySelector('details.proof .proof-line').textContent)).toBe('This page runs without AI. No account. The words you choose are not uploaded.');
    const proof = squash(doc.querySelector('details.proof .proof-body').textContent);
    expect(proof).toContain('For a file with recordings it gets, from this site, the small files that hold the recordings of your words, about 40 words in each.');
    expect(proof).toContain('That includes which of the small recording files were asked for, but not which words.');
    // True of the code: the media loader fetches only the store files that hold the wanted words.
    expect(squash(read('packets_vocab_media.js').replace(/\n\s*\/\/\s*/g, ' '))).toContain('Only the files that hold the wanted words are fetched.');
    expect(read('packets_vocab_media.js')).toContain("var INDEX = 'word_audio_shards/index.json';");
  });

  it('it says the meanings marked checked were checked with AI help, not by a person, as the word list itself records', () => {
    const bank = read('packets_vocab_bank_en.js');
    // 2026-11-13: the science and social-studies pass updates the dates and puts the editing note last.
    expect(bank).toMatch(/checking: "Checked and corrected with AI assistance on November 12 and 13, 2026[^"]*Not reviewed by a person\./);
    expect(squash(doc.getElementById('legend').textContent)).toBe('checked This meaning was checked with AI help when the word list was prepared, not by a person. not checked yet Read these first.');
    const sources = squash(doc.getElementById('sources').textContent);
    expect(sources).toContain('Some meanings were checked and corrected with AI help when the word list was prepared, not by a person.');
    expect(sources).toContain('The recordings of words were made ahead of time with an AI voice (Kokoro).');
    expect(squash(doc.querySelector('details.proof .proof-body li').textContent)).toContain('Some meanings were checked and corrected ahead of time with AI help, not by a person.');
    // The recordings are Kokoro's, as the media loader says.
    expect(read('packets_vocab_media.js')).toContain('(Kokoro-82M, voice af_heart)');
    expect(doc.body.textContent).not.toMatch(/looked at when the word list was prepared/);
  });
});

describe('the guide for school IT and Find a picture say what is true of every page today', () => {
  it('the guide names the vocabulary builder, the vocabulary maker\'s requests and its device voice', () => {
    const guidePage = parse('packets-it.html');
    const fact = Object.fromEntries([...guidePage.querySelectorAll('.facts-table tr')].map((row) => [row.querySelector('th').textContent, squash(row.querySelector('td').textContent)]));
    expect(fact['License and code']).toContain('packet_vocab_builder.js (vocabulary practice and checks)');
    expect(fact["What this site's server can see"]).toContain('the Word Sounds and vocabulary makers ask only for the ones they need');
    expect(fact['What leaves the device, and when']).toContain('A vocabulary file reads aloud only with a voice that runs on the device');
    expect(fact['The class mailbox kind']).toContain("Files made on this site's maker pages have no mailbox.");
    expect(read('word_sounds_take_home_loader.js')).toContain('localService === true');
  });

  it('Find a picture no longer says that no other page can connect to another site: two can, and the guide names them', () => {
    const line = squash(parse('packets-pictures.html').getElementById('proof-reach').textContent);
    expect(line).not.toContain('The other pages cannot connect to any other website');
    expect(line).toContain('the guide for school IT names the two that can, and what they send');
    const others = readdirSync('.').filter((f) => /^packets[\w-]*\.html$/.test(f) && f !== 'packets-pictures.html')
      .filter((f) => /connect-src[^;]*https:\/\//.test(csp(parse(f))));
    expect(others.sort()).toEqual(['packets-open.html', 'packets-vocab-lookup.html']);
    const guide = squash(parse('packets-it.html').body.textContent);
    for (const f of others) expect(guide, f).toContain(f);
  });
});

// ---------------------------------------------------------------------------
// The vocabulary maker, run (the stand-in word list and the real picture files, as tests/packets_vocab_pictures.test.js)
// ---------------------------------------------------------------------------
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGE_SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_zip.js', 'packets_handoff.js', 'packets_vocab_bank_en.js',
  'word_sounds_symbols_en.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-vocab.js'];
async function maker() {
  const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  // The picture files, read from disk in place of the site; the recordings are refused, so the device voice reads every word.
  w.fetch = (url) => (/word_audio_shards/.test(String(url)) ? Promise.reject(new TypeError('Failed to fetch'))
    : Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) }));
  for (const src of PAGE_SCRIPTS) w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
  await wait(5);
  const $ = (id) => d.getElementById(id);
  const fire = (n, t) => n.dispatchEvent(new w.Event(t, { bubbles: true }));
  const until = async (test, what) => { for (let i = 0; i < 400; i++) { if (test()) return; await wait(20); } throw new Error('Timed out: ' + what); };
  return { w, d, $, fire, until, type: async (text) => { $('f-words').value = text; fire($('f-words'), 'input'); await wait(300); } };
}

describe('the vocabulary maker, run', () => {
  it('step 3 says "None of the 4 words has a picture", not "Only 0 of 4"', async () => {
    const p = await maker();
    await p.type('habitat, predator, prey, cell');
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    const note = (id) => p.d.querySelector('[data-type="' + id + '"]').closest('label').querySelector('.choice-note').textContent;
    expect(note('picture')).toBe('None of the 4 words has a picture. Picture questions need at least 4, so that the other pictures are mostly words from your list.');
    expect(note('picword')).toBe(note('picture'));
  });

  it('a meaning the teacher typed is not "looked up again"; a check calls its sample a practice question; the after-save note names the teacher code', async () => {
    const p = await maker();
    await p.type('habitat, predator, prey, cell, zorbling');
    p.$('next-1').click();
    const row = () => p.d.querySelector('[data-row="zorbling"]');
    expect(row().querySelector('a[data-lookup]').textContent).toBe('Look it up online');
    const field = row().querySelector('.v-edit textarea, .v-edit input');
    field.value = 'A made-up word for this test';
    p.fire(field, 'input');
    [...row().querySelectorAll('.v-edit button')].find((b) => b.textContent === 'Save').click();
    await wait(30);
    expect(row().querySelector('.v-right .v-text').textContent).toContain('A made-up word for this test');
    expect(row().querySelector('a[data-lookup]').textContent).toBe('Look it up online');
    p.$('next-2').click();
    const check = p.d.querySelector('input[name="mode"][value="check"]');
    check.checked = true;
    p.fire(check, 'change');
    p.$('f-code').value = 'oak5';
    p.fire(p.$('f-code'), 'input');
    await p.until(() => !p.$('summary').hidden && p.$('making').hidden, 'the file');
    await wait(80);
    const rows = Object.fromEntries([...p.$('summary-rows').querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]));
    expect(rows['Practice first']).toMatch(/^(?:1 practice question, with right or wrong shown, not scored\. Its words are not in your list\.|None: every practice question shares a word with your list\.)$/);
    expect(p.$('after-code').hidden).toBe(true);
    p.$('save').click();
    expect(p.$('after-save').hidden).toBe(false);
    expect(p.$('after-code').hidden).toBe(false);
    expect(p.$('after-code').textContent).toBe('The answers screen inside the file opens with your teacher code. This page has not kept the code.');
  });
});
