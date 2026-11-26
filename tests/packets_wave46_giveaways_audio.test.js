// @vitest-environment jsdom
// Wave 46 regression suite:
// 1. Interactive Word Sounds & Symbol Runner giveaway fixes (mapping, word_scramble, missing_letter,
//    spelling_bee, read_sentence, read_passage, manipulation, decoding, sentence_match, symbol_runner)
//    + preservation of Wave 39 letter_tracing coaching inside word_sounds_take_home_loader.js.
// 2. Fill-in-the-blank (vocab_blank) Kokoro audio wiring in packet_vocab_builder.js & packets-vocab.js
//    and playback via takeHomeVocab when askAudio is present.
// 3. Extended offline images (reading_symbols_ext_en.js + word_picture_semantic_en.js) unlocked in
//    packets-vocab.html, packets-vocab.js, and packet_vocab_builder.js.
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const V = require('../packet_vocab_builder.js');
const art = require('../word_sounds_packet_builder.js');
const symbols = require('../word_sounds_symbols_en.js');
const extSymbols = require('../reading_symbols_ext_en.js');
const semantic = require('../word_picture_semantic_en.js');
const matcher = require('../word_picture_matcher.js');
const verify = require('../packets_verify_core.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
for (const s of extSymbols.shards) extSymbols.add(JSON.parse(read(s.url)));
await bank.load();

const opened = [];
afterAll(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const PNG_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const MP3_URI = 'data:audio/mpeg;base64,' + Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00').toString('base64');
const WAV_URI = 'data:audio/wav;base64,' + Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ').toString('base64');

function mountAdapter(adapter, item, opts = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://packet.test/' });
  opened.push(dom.window);
  const doc = dom.window.document;
  const root = doc.getElementById('root');
  let done = false;
  let attempts = 0;
  const played = [];
  const supports = [];
  const announced = [];
  const images = opts.images || {};
  const L = Object.assign({
    hear_question: 'Hear the question',
    hear_word: 'Hear the word',
  }, adapter.labels || {});
  const el = (tag, attrs, children) => {
    const node = doc.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'hidden') node.hidden = !!v;
        else if (k === 'on') {
          for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
        } else node.setAttribute(k, String(v));
      }
    }
    if (Array.isArray(children)) {
      for (const ch of children) {
        if (ch == null) continue;
        node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
      }
    }
    return node;
  };
  const fmt = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
  const ctx = {
    root,
    el,
    fmt,
    L,
    showLetters: !!opts.showLetters,
    check: !!opts.check,
    noFocus: true,
    isDone: () => done,
    attempts: () => attempts,
    support: (name) => supports.push(name),
    announce: (text) => announced.push(text),
    play: (id) => { played.push(id); return Promise.resolve(true); },
    playAll: (ids) => { played.push(...(ids || [])); return Promise.resolve(true); },
    stop: () => {},
    image: (id) => images[id] || null,
    answer: (_resp, right) => {
      attempts += 1;
      if (right) {
        done = true;
        if (handle && typeof handle.reveal === 'function') handle.reveal(true);
        return 'correct';
      }
      if (attempts >= 2 || opts.check) {
        done = true;
        if (handle && typeof handle.reveal === 'function') handle.reveal(false);
        return 'missed';
      }
      return 'retry';
    },
  };
  const handle = adapter.render(item, ctx) || {};
  return { dom, doc, root, ctx, handle, played, supports, announced, setDone: (v) => { done = v; } };
}

describe('1. Interactive Word Sounds & Symbol Runner giveaway fixes', () => {
  it('preserves Wave 39 letter_tracing coaching inside word_sounds_take_home_loader.js and adapter file', () => {
    expect(TH.ADAPTERS.letter_tracing.labels.letter_tracing_demo).toBe('Show how');
    expect(TH.ADAPTERS.letter_tracing.labels.letter_tracing_missed_spots).toBe('Keep going. Trace over the highlighted spots.');
    expect(read('word_sounds_take_home/adapters/letter_tracing.js')).toContain("letter_tracing_demo: 'Show how'");
  });

  it('mapping: hides "The word: {word}" until reveal(), and sets introAudio to [prompt, wordAudio]', () => {
    const adapter = TH.ADAPTERS.mapping;
    const prep = adapter.prepare(
      { phonemes: ['c', 'a', 't'], activityItems: { mapping: { graphemes: ['c', 'a', 't'] } } },
      {
        word: 'cat',
        label: (p) => String(p),
        wordClip: () => 'w_cat',
        bankClip: () => 'p_map',
        phonemeClip: (g) => 'ph_' + g,
      },
    );
    expect(prep.item.introAudio).toEqual(['p_map', 'w_cat']);
    expect(read('word_sounds_take_home_loader.js')).toMatch(/counting\|mapping\|missing_letter\|orthography\|segmentation\|spelling_bee\|word_scramble/);

    const m = mountAdapter(adapter, Object.assign({ word: 'cat' }, prep.item));
    const wordP = [...m.root.querySelectorAll('p')].find((p) => p.textContent === 'The word: cat');
    expect(wordP).toBeTruthy();
    expect(wordP.hidden).toBe(true);
    m.handle.reveal(true);
    expect(wordP.hidden).toBe(false);
  });

  it('word_scramble: plays [prompt, wordAudio] on open and gates Show word until 1 wrong attempt (never in check)', () => {
    const adapter = TH.ADAPTERS.word_scramble;
    const prep = adapter.prepare(
      { activityItems: { word_scramble: { letters: ['t', 'c', 'a'] } } },
      { word: 'cat', wordClip: () => 'w_cat', bankClip: () => 'p_ws' },
    );
    expect(prep.item.introAudio).toEqual(['p_ws', 'w_cat']);

    const m = mountAdapter(adapter, Object.assign({ word: 'cat' }, prep.item));
    const showBtn = [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Show word');
    const wordLine = [...m.root.querySelectorAll('p')].find((p) => p.textContent === 'The word: cat');
    expect(showBtn.hidden).toBe(true);
    expect(showBtn.getAttribute('aria-disabled')).toBe('true');
    showBtn.click();
    expect(wordLine.hidden).toBe(true);

    // Submit a wrong order ('tca') -> retry unlocks Show word
    m.root.querySelector('[data-ws-tile="0"]').click();
    m.root.querySelector('[data-ws-box="0"]').click();
    m.root.querySelector('[data-ws-tile="1"]').click();
    m.root.querySelector('[data-ws-box="1"]').click();
    m.root.querySelector('[data-ws-tile="2"]').click();
    m.root.querySelector('[data-ws-box="2"]').click();
    [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Check').click();
    expect(showBtn.hidden).toBe(false);
    expect(showBtn.getAttribute('aria-disabled')).toBeNull();
    showBtn.click();
    expect(wordLine.hidden).toBe(false);

    // Check mode: never unlocks Show word
    const chk = mountAdapter(adapter, Object.assign({ word: 'cat' }, prep.item), { check: true });
    const chkBtn = [...chk.root.querySelectorAll('button')].find((b) => b.textContent === 'Show word');
    expect(chkBtn.hidden).toBe(true);
    chkBtn.click();
    expect([...chk.root.querySelectorAll('p')].find((p) => p.textContent === 'The word: cat').hidden).toBe(true);
  });

  it('missing_letter: gates Show word until 1 wrong attempt (never in check mode)', () => {
    const adapter = TH.ADAPTERS.missing_letter;
    const item = { letters: ['c', '', 't'], hiddenIndex: 1, options: ['a', 'e', 'i', 'o'], target: 'a', wordAudio: 'w_cat', promptAudio: 'p_ml' };
    const m = mountAdapter(adapter, item);
    const showBtn = [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Show word');
    const shownWord = [...m.root.querySelectorAll('p')].find((p) => p.textContent === 'The word is cat.');
    expect(showBtn.hidden).toBe(true);
    expect(showBtn.getAttribute('aria-disabled')).toBe('true');
    showBtn.click();
    expect(shownWord.hidden).toBe(true);

    // Pick wrong letter 'e' and check -> retry unlocks Show word
    m.root.querySelector('button[aria-label="Letter e"]').click();
    [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Check answer').click();
    expect(showBtn.hidden).toBe(false);
    expect(showBtn.getAttribute('aria-disabled')).toBeNull();
    showBtn.click();
    expect(shownWord.hidden).toBe(false);

    // Check mode: stays hidden
    const chk = mountAdapter(adapter, item, { check: true });
    const chkBtn = [...chk.root.querySelectorAll('button')].find((b) => b.textContent === 'Show word');
    expect(chkBtn.hidden).toBe(true);
  });

  it('spelling_bee: gates First letter hint and Show vowels / Show more until after attempt 1 (never in check)', () => {
    const adapter = TH.ADAPTERS.spelling_bee;
    const item = { id: 'sb1', target: 'cat', wordAudio: 'w_cat', promptAudio: 'p_sb' };
    const m = mountAdapter(adapter, item);
    const firstBtn = [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'First letter hint');
    const moreBtn = [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Show vowels');
    expect(firstBtn.hidden).toBe(true);
    expect(moreBtn.hidden).toBe(true);
    firstBtn.click();
    moreBtn.click();
    expect(m.root.querySelector('input').value).toBe('');

    // Type wrong spelling and submit -> unlocks hints
    const inp = m.root.querySelector('input');
    inp.value = 'cot';
    inp.dispatchEvent(new m.dom.window.Event('input', { bubbles: true }));
    [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Check spelling').click();
    expect(firstBtn.hidden).toBe(false);
    expect(moreBtn.hidden).toBe(false);
    expect(firstBtn.getAttribute('aria-disabled')).toBeNull();
    expect(moreBtn.getAttribute('aria-disabled')).toBeNull();

    // Check mode: stays hidden
    const chk = mountAdapter(adapter, item, { check: true });
    expect([...chk.root.querySelectorAll('button')].find((b) => b.textContent === 'First letter hint').hidden).toBe(true);
    expect([...chk.root.querySelectorAll('button')].find((b) => b.textContent === 'Show vowels').hidden).toBe(true);
  });

  it('read_sentence & read_passage: omit "Your word:" without a picture, and hide target word in picture alt until reveal()', () => {
    const rsItemNoPic = { target: 'cat', before: 'The ', after: ' sat.', answer: 'cat', options: ['cat', 'dog', 'sun'], picture: null, prompt: 'p1' };
    const rsNoPic = mountAdapter(TH.ADAPTERS.read_sentence, rsItemNoPic);
    expect(rsNoPic.root.textContent).not.toContain('Your word:');
    expect(rsNoPic.root.textContent).toContain('Choose the word that fits.');

    const rsPic = mountAdapter(TH.ADAPTERS.read_sentence, Object.assign({}, rsItemNoPic, { picture: 'img_cat' }), { images: { img_cat: PNG_URI } });
    const rsImg = rsPic.root.querySelector('img');
    expect(rsImg.getAttribute('alt')).toBe('Picture clue');
    rsPic.handle.reveal(true);
    expect(rsImg.getAttribute('alt')).toBe('Picture clue: cat');

    const rpItemNoPic = { target: 'cat', lines: [{ before: 'I see a ', answer: 'cat', after: '.' }], options: ['cat', 'dog', 'sun'], picture: null, prompt: 'p1', readBack: [] };
    const rpNoPic = mountAdapter(TH.ADAPTERS.read_passage, rpItemNoPic);
    expect(rpNoPic.root.textContent).not.toContain('Your word:');
    expect(rpNoPic.root.textContent).toContain('Choose the word that fits.');

    const rpPic = mountAdapter(TH.ADAPTERS.read_passage, Object.assign({}, rpItemNoPic, { picture: 'img_cat' }), { images: { img_cat: PNG_URI } });
    const rpImg = rpPic.root.querySelector('img');
    expect(rpImg.getAttribute('alt')).toBe('Picture clue');
    rpPic.handle.reveal(true);
    expect(rpImg.getAttribute('alt')).toBe('Picture clue: cat');
  });

  it('manipulation: hides item.instructionText when showLetters is false until reveal(), showing neutral audio cue', () => {
    const item = {
      target: 'hat', type: 'substitution', instructionText: 'Change /k/ in cat to /h/.',
      instruction: ['p1'], wordAudio: 'w_cat',
      choices: [{ text: 'hat', audio: 'w_hat' }, { text: 'bat', audio: 'w_bat' }],
    };
    const hiddenMode = mountAdapter(TH.ADAPTERS.manipulation, item, { showLetters: false });
    const instP = [...hiddenMode.root.querySelectorAll('p')].find((p) => p.textContent === item.instructionText);
    const cueP = hiddenMode.root.querySelector('[data-manipulation-audio-cue]');
    expect(instP.hidden).toBe(true);
    expect(cueP && !cueP.hidden).toBe(true);
    hiddenMode.handle.reveal(true);
    expect(instP.hidden).toBe(false);
    expect(cueP.hidden).toBe(true);

    const shownMode = mountAdapter(TH.ADAPTERS.manipulation, item, { showLetters: true });
    const instShown = [...shownMode.root.querySelectorAll('p')].find((p) => p.textContent === item.instructionText);
    expect(instShown.hidden).toBe(false);
    expect(shownMode.root.querySelector('[data-manipulation-audio-cue]')).toBeNull();
  });

  it('decoding & sentence_match: use neutral "Picture 1..N" aria-labels while unanswered and reveal "Picture of {word}"', () => {
    const decItem = {
      target: 'cat', printed: 'cat', prompt: 'p1',
      choices: [{ text: 'cat', image: 'i1' }, { text: 'dog', image: 'i2' }],
    };
    const dec = mountAdapter(TH.ADAPTERS.decoding, decItem, { images: { i1: PNG_URI, i2: PNG_URI } });
    const decBtns = [...dec.root.querySelectorAll('ul.choices button')];
    expect(decBtns.map((b) => b.getAttribute('aria-label'))).toEqual(['Picture 1', 'Picture 2']);
    dec.handle.reveal(true);
    expect(decBtns.map((b) => b.getAttribute('aria-label'))).toEqual(['Picture of cat (the answer)', 'Picture of dog']);

    const smItem = {
      target: 'cat dog', sentence: 'A cat sees a dog.', sequence: ['cat', 'dog'], prompt: 'p1',
      tiles: [{ text: 'dog', image: 'i2' }, { text: 'cat', image: 'i1' }],
    };
    const sm = mountAdapter(TH.ADAPTERS.sentence_match, smItem, { images: { i1: PNG_URI, i2: PNG_URI } });
    const smBtns = [...sm.root.querySelectorAll('ul.choices button')];
    expect(smBtns.map((b) => b.getAttribute('aria-label'))).toEqual(['Picture 1', 'Picture 2']);
    smBtns[1].click();
    const firstSlot = sm.root.querySelector('ul.slots button');
    expect(firstSlot.getAttribute('aria-label')).toBe('Slot 1: Picture 2. Tap to take it out.');
    sm.handle.reveal(true);
    expect(smBtns.map((b) => b.getAttribute('aria-label'))).toEqual(['Picture of dog', 'Picture of cat']);
    expect(firstSlot.getAttribute('aria-label')).toBe('Slot 1: cat. Tap to take it out.');
  });

  it('symbol_runner: sets cue image alt to "Picture cue" until reveal()', () => {
    const sr = TH.CHECK_ADAPTERS.symbol_runner;
    const prep = sr.prepare({ word: 'cat', answer: 'cat', choices: ['cat', 'dog'], image: 'i1' });
    const m = mountAdapter(sr, prep.item, { images: { i1: PNG_URI } });
    const img = m.root.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Picture cue');
    m.handle.reveal(true);
    expect(img.getAttribute('alt')).toBe('Picture cue for cat');
  });
});

describe('2. Fill-in-the-blank (vocab_blank) Kokoro audio wiring & playback', () => {
  it('attaches askAudio from meaningClips on vocab_blank items and plays Kokoro clip via Audio even without device TTS', () => {
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat').words, bank });
    const batBlank = rows.find((r) => r.key === 'bat').blank.ask;
    expect(batBlank).toBe('A ___ sleeps in the cave all day.');

    const lesson = V.lessonFromVocab({
      loader: TH,
      rows,
      types: ['blank'],
      mode: 'practice',
      clips: { habitat: WAV_URI, predator: WAV_URI, prey: WAV_URI, cell: WAV_URI, bat: WAV_URI },
      meaningClips: { [batBlank]: MP3_URI },
    });
    const blankItems = lesson.blocks.find((b) => b.activity === 'vocab_blank').items;
    const batItem = blankItems.find((it) => it.ask === batBlank);
    expect(batItem).toBeTruthy();
    expect(batItem.askAudio).toMatch(/^m[0-9a-f]{8}$/);
    expect(lesson.audio[batItem.askAudio]).toBe(MP3_URI);

    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });
    const rep = verify.verifyPacket(built.html);
    expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);

    // Build a 1-item HTML where bat is first, open with NO device speechSynthesis voices, and click Read aloud
    const singleLesson = Object.assign({}, lesson, { blocks: [{ activity: 'vocab_blank', items: [batItem] }] });
    const singleHtml = V.buildVocabPacket({ lesson: singleLesson, loader: TH, rows, bank }).html;
    const played = [];
    const dom = new JSDOM(singleHtml, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/blank.html',
      beforeParse(w) {
        w.Audio = class {
          constructor(src) { this.src = src; }
          play() { played.push(this.src || ''); setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }
          pause() {}
        };
      },
    });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Fox1';
    d.querySelector('#app button.primary').click();
    const readBtn = d.querySelector('[data-read-aloud="question"]');
    expect(readBtn).toBeTruthy();
    expect(readBtn.hidden).toBe(false);
    readBtn.click();
    expect(played).toEqual([MP3_URI]);
  });

  it('packets-vocab.js fetches meaning/My words clips for Fill the blank sentences and lists missing ones for computer-voice recording', async () => {
    const PAGE_SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', 'packets_vocab_bank_en.js',
      'word_sounds_symbols_en.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js', 'word_picture_matcher.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-print-cards.js', 'packets_word_starters.js', 'packets-vocab.js'];
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    const blobs = [];
    w.URL.createObjectURL = (b) => { blobs.push(b); return 'blob:b' + blobs.length; };
    w.URL.revokeObjectURL = () => {};
    w.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
    for (const src of PAGE_SCRIPTS) {
      w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
    }
    const requestedMeanings = [];
    const batBlank = 'A ___ sleeps in the cave all day.';
    w.AlloVocabMedia.meaningClips = async (texts) => {
      requestedMeanings.push(...texts);
      return texts.includes(batBlank) ? { [batBlank]: MP3_URI } : {};
    };
    w.AlloVocabMedia.clips = async () => ({});
    w.AlloPacketMyWords.getMeaningClips = async () => ({});
    await new Promise((r) => setTimeout(r, 15));

    const $ = (id) => d.getElementById(id);
    $('f-words').value = 'habitat, predator, prey, cell, bat';
    $('f-words').dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    $('next-1').click();
    $('next-2').click();
    await new Promise((r) => setTimeout(r, 80));

    // Turn off meaning & word, turn ON Fill the blank only
    for (const id of ['meaning', 'word']) {
      const box = d.querySelector('[data-type="' + id + '"]');
      box.checked = false;
      box.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    const blankBox = d.querySelector('[data-type="blank"]');
    blankBox.checked = true;
    blankBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    for (let i = 0; i < 40 && $('summary').hidden; i++) await new Promise((r) => setTimeout(r, 25));

    expect(requestedMeanings).toContain(batBlank);
    const missingLink = $('meanings-add-link');
    expect(missingLink).toBeTruthy();
    expect(missingLink.getAttribute('href')).toContain('#meanings=');
    const html = await blobs[blobs.length - 1].text();
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    const batItem = lesson.blocks[0].items.find((it) => it.ask === batBlank);
    expect(batItem && batItem.askAudio).toMatch(/^m[0-9a-f]{8}$/);
  });
});

describe('3. Extended offline images unlocked in Vocabulary', () => {
  it('loads reading_symbols_ext_en.js and word_picture_semantic_en.js on packets-vocab.html and resolves extended + semantic images', () => {
    const html = read('packets-vocab.html');
    expect(html).toContain('<script src="reading_symbols_ext_en.js" defer></script>');
    expect(html).toContain('<script src="word_picture_semantic_en.js" defer></script>');

    // Words strictly in reading_symbols_ext_en.js (not in base word_sounds_symbols_en.js) resolve directly in draftRows & lessonFromVocab
    const extWords = ['airplane', 'afraid', 'angry', 'biscuit', 'bow'];
    for (const w of extWords) {
      expect(symbols.has(w), 'base should not have ' + w).toBe(false);
      expect(extSymbols.has(w), 'ext should have ' + w).toBe(true);
    }
    const rows = V.draftRows({
      words: V.parseWords(extWords.join(', ')).words,
      bank,
      pictures: symbols,
      readingSymbolsExt: extSymbols,
      semantic,
      diagrams: true,
      matcher,
      art,
    });
    expect(V.pictureCount(rows)).toEqual({ withPicture: 5, offered: true, need: 4 });
    const lesson = V.lessonFromVocab({
      loader: TH,
      rows,
      types: ['picture', 'picword'],
      mode: 'practice',
      pictures: symbols,
      readingSymbolsExt: extSymbols,
      semantic,
      diagrams: true,
      matcher,
      art,
    });
    expect(Object.keys(lesson.images).length).toBeGreaterThanOrEqual(5);
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank, diagrams: true });
    const rep = verify.verifyPacket(built.html);
    expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);
  });
});

describe('4. Break it Down (segmentation.js): tap-to-hear & lift in place, Put back drop box, move/swap, Escape/Backspace', () => {
  it('lifts placed chip in place and plays its sound on tap, shows Put back, supports move/swap, Escape deselect, and Backspace return', () => {
    const seg = TH.ADAPTERS.segmentation;
    const item = {
      target: 'c a t',
      sounds: ['c', 'a', 't'],
      chips: [
        { label: 'c', audio: 'ph_c' },
        { label: 'a', audio: 'ph_a' },
        { label: 't', audio: 'ph_t' },
      ],
      wordAudio: 'w_cat',
      promptAudio: 'p_seg',
    };
    let keyHandler = null;
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://packet.test/' });
    opened.push(dom.window);
    const doc = dom.window.document;
    const root = doc.getElementById('root');
    const played = [];
    const el = (tag, attrs, children) => {
      const node = doc.createElement(tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v == null) continue;
          if (k === 'text') node.textContent = v;
          else if (k === 'hidden') node.hidden = !!v;
          else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
          else node.setAttribute(k, String(v));
        }
      }
      if (Array.isArray(children)) for (const ch of children) if (ch != null) node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
      return node;
    };
    const fmt = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
    const ctx = {
      root, el, fmt,
      L: Object.assign({ hear_question: 'Hear the question', hear_word: 'Hear the word', sound_n: 'Sound {n}' }, seg.labels),
      showLetters: false, check: false, noFocus: true,
      isDone: () => false, attempts: () => 0, support: () => {}, announce: () => {},
      play: (id) => { played.push(id); return Promise.resolve(true); },
      playAll: () => Promise.resolve(true), stop: () => {},
      keys: (fn) => { keyHandler = fn; },
      answer: () => 'correct',
    };
    seg.render(item, ctx);

    const tile = (i) => root.querySelector('[data-seg-tile="' + i + '"]');
    const box = (i) => root.querySelector('[data-seg-box="' + i + '"]');
    const putBackLi = root.querySelector('[data-seg-put-back-item]');
    const putBackBtn = root.querySelector('[data-seg-put-back]');
    expect(putBackLi.hidden).toBe(true);
    expect(root.textContent).toContain('Put back');

    // Place chip 0 into box 0 and chip 1 into box 1
    tile(0).click();
    box(0).click();
    tile(1).click();
    box(1).click();
    expect(tile(0).closest('li').hidden).toBe(true);
    expect(tile(1).closest('li').hidden).toBe(true);

    // Tap filled box 0 -> plays its sound and lifts/selects it in place (does NOT eject!)
    played.length = 0;
    box(0).click();
    expect(played).toEqual(['ph_c']);
    expect(box(0).getAttribute('aria-pressed')).toBe('true');
    expect(tile(0).closest('li').hidden).toBe(true);
    expect(putBackLi.hidden).toBe(false);

    // Tap same box 0 again -> deselects in place without removing it
    box(0).click();
    expect(box(0).getAttribute('aria-pressed')).toBe('false');
    expect(tile(0).closest('li').hidden).toBe(true);
    expect(putBackLi.hidden).toBe(true);

    // Select box 0 again, then press Escape -> deselects in place without removing it
    box(0).click();
    expect(box(0).getAttribute('aria-pressed')).toBe('true');
    expect(keyHandler('Escape')).toBe(true);
    expect(box(0).getAttribute('aria-pressed')).toBe('false');
    expect(tile(0).closest('li').hidden).toBe(true);
    expect(putBackLi.hidden).toBe(true);

    // Select box 0, then tap filled box 1 -> swaps chip 0 and chip 1 cleanly
    box(0).click();
    box(1).click();
    expect(box(0).getAttribute('aria-label')).toContain('Sound 2');
    expect(box(1).getAttribute('aria-label')).toContain('Sound 1');
    expect(putBackLi.hidden).toBe(true);

    // Select box 1, then tap Put back -> returns chip 0 to the pool
    box(1).click();
    expect(putBackLi.hidden).toBe(false);
    putBackBtn.click();
    expect(tile(0).closest('li').hidden).toBe(false);
    expect(box(1).getAttribute('aria-label')).toBe('Box 2, empty');
    expect(putBackLi.hidden).toBe(true);

    // Select box 0 (holding chip 1), then press Backspace -> returns selected chip 1 to the pool
    box(0).click();
    expect(keyHandler('Backspace')).toBe(true);
    expect(tile(1).closest('li').hidden).toBe(false);
    expect(box(0).getAttribute('aria-label')).toBe('Box 1, empty');
    expect(putBackLi.hidden).toBe(true);
  });
});

describe('5. Symbol Runner key-input latency, focus-in-input, Lock-On pointermove & Check rapid transition', () => {
  const sr = TH.CHECK_ADAPTERS.symbol_runner;
  function mountSr(spec, opts = {}) {
    const prep = sr.prepare(spec);
    expect(prep.missing).toBeUndefined();
    let keyHandler = null;
    const answers = [];
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://packet.test/' });
    opened.push(dom.window);
    const doc = dom.window.document;
    const root = doc.getElementById('root');
    const el = (tag, attrs, children) => {
      const node = doc.createElement(tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v == null) continue;
          if (k === 'text') node.textContent = v;
          else if (k === 'hidden') node.hidden = !!v;
          else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
          else node.setAttribute(k, String(v));
        }
      }
      if (Array.isArray(children)) for (const ch of children) if (ch != null) node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
      return node;
    };
    const fmt = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
    const ctx = {
      root, el, fmt, L: sr.labels,
      check: !!opts.check, noFocus: !!opts.noFocus,
      isDone: () => false, attempts: () => answers.length, support: () => {}, announce: () => {},
      play: () => Promise.resolve(true), image: () => null,
      keys: (fn) => { keyHandler = fn; },
      answer: (resp, right) => { answers.push({ resp, right }); return opts.check ? 'recorded' : (right ? 'correct' : 'retry'); },
    };
    sr.render(prep.item, ctx);
    return { dom, doc, root, answers, keyHandler: () => keyHandler };
  }

  it('(a) auto-focuses textInput and inserts first printable key on prefix-colliding or multi-char choices instead of dropping it', () => {
    const m = mountSr({ word: 'sh', answer: 'sh', choices: ['s', 'sh', 'ch'], lane: 1, control: 'direct' });
    const inp = m.root.querySelector('[data-sr-input]');
    // Auto-focused on play start for multi-char items
    expect(m.doc.activeElement).toBe(inp);
    inp.blur();
    expect(m.doc.activeElement).not.toBe(inp);
    // Unfocused key 's' (prefix collision with 'sh') focuses textInput and inserts 's' instead of dropping it!
    expect(m.keyHandler()('s')).toBe(true);
    expect(m.doc.activeElement).toBe(inp);
    expect(inp.value).toBe('s');

    // Numeric prefix collision ('1' vs '10')
    const num = mountSr({ word: '10', answer: '10', choices: ['1', '2', '10'], lane: 1, control: 'direct' });
    const numInp = num.root.querySelector('[data-sr-input]');
    numInp.blur();
    expect(num.keyHandler()('1')).toBe(true);
    expect(num.doc.activeElement).toBe(numInp);
    expect(numInp.value).toBe('1');
  });

  it('(b) submits single-char and Stroop keys immediately even while textInput has focus (wrong keys in practice, any key in check)', () => {
    const prac = mountSr({ word: 'b', answer: 'b', choices: ['b', 'd', 'p', 'q'], lane: 1, control: 'direct' });
    const pInp = prac.root.querySelector('[data-sr-input]');
    pInp.focus();
    const wrongEv = new prac.dom.window.KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true });
    pInp.dispatchEvent(wrongEv);
    expect(wrongEv.defaultPrevented).toBe(true);
    expect(prac.answers).toEqual([{ resp: 'd', right: false }]);

    const chk = mountSr({ word: 'BLUE', answer: 'gold', choices: ['red', 'blue', 'green', 'gold'], stroopInk: '#a16207', lane: 1, control: 'direct' }, { check: true });
    const cInp = chk.root.querySelector('[data-sr-input]');
    cInp.focus();
    const stroopEv = new chk.dom.window.KeyboardEvent('keydown', { key: 'y', bubbles: true, cancelable: true });
    cInp.dispatchEvent(stroopEv);
    expect(stroopEv.defaultPrevented).toBe(true);
    expect(chk.answers).toEqual([{ resp: 'gold', right: undefined }]);
  });

  it('(c) unlocks Lock-On mode on pointermove/mousemove when pointer is already stationary over target lane and moves focus', () => {
    const m = mountSr({ word: 'sh', answer: 'sh', choices: ['s', 'sh', 'ch'], lane: 2, control: 'lockon' });
    const track = m.root.querySelector('[data-sr-lanes]');
    const targetLane = m.root.querySelector('[data-lane="2"]');
    const inp = m.root.querySelector('[data-sr-input]');
    expect(track.getAttribute('data-locked')).toBe('true');
    expect(inp.disabled).toBe(true);
    targetLane.dispatchEvent(new m.dom.window.MouseEvent('mousemove', { bubbles: true }));
    expect(track.getAttribute('data-locked')).toBe('false');
    expect(inp.disabled).toBe(false);
    expect(m.doc.activeElement).toBe(inp);
  });

  it('(d) accepts rapid Symbol Runner keystrokes (>= 60ms) between cards in timed Check mode without 250ms drop', () => {
    const SR = require('../packet_symbol_runner_builder.js');
    const built = SR.lessonFromSymbolRunner({ loader: TH, mode: 'letters_lower', packetMode: 'check', timeLimitS: 60, length: 3 });
    const html = SR.buildSymbolRunnerPacket({ lesson: built.lesson, loader: TH }).html;
    let fakeNow = 1000;
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/sr-check.html',
      beforeParse(w) {
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => fakeNow });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      },
    });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    d.getElementById('learner-name').value = 'Ana';
    [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Next' || b.textContent === 'Start').click();
    for (let g = 0; g < 6 && !d.querySelector('[data-check-begin]'); g++) {
      const cover = d.querySelector('[data-sr-cover]');
      if (cover && !cover.hidden) cover.click();
      const ch = d.querySelector('[data-sr-choice]');
      if (ch) { fakeNow += 100; ch.click(); }
      const pn = d.querySelector('[data-practice-next]');
      if (pn) pn.click();
    }
    d.querySelector('[data-check-begin]').click();
    expect(d.querySelector('#app h2').textContent).toMatch(/^Question 1 of \d+$/);
    // Answer card 1 after only 100ms (< 250ms old debounce) via direct key -> advances immediately to Question 2!
    fakeNow += 100;
    const k1 = d.querySelector('[data-sr-choice]').getAttribute('data-sr-choice');
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k1, bubbles: true, cancelable: true }));
    expect(d.querySelector('#app h2').textContent).toMatch(/^Question 2 of \d+$/);
    // Answer card 2 after only 100ms -> advances immediately to Question 3!
    fakeNow += 100;
    const k2 = d.querySelector('[data-sr-choice]').getAttribute('data-sr-choice');
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k2, bubbles: true, cancelable: true }));
    expect(d.querySelector('#app h2').textContent).toMatch(/^Question 3 of \d+$/);
  });
});

