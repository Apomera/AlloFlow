import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

// Vocabulary questions in AlloFlow Packets, 2026-11-12: the three activities of the take-home engine
// (word_sounds_take_home/check_adapters/vocab_meaning.js, vocab_word.js, vocab_blank.js, built into
// word_sounds_take_home_loader.js), the builder (packet_vocab_builder.js), "Look inside a file" on such a file, and the
// two readers of its results (packets_results_reader.js, the Class Analytics importer in student_analytics_module.js).
// The definition bank is stood in for by tests/fixtures/packets_vocab_bank_fixture.js (the runtime shape agreed in
// C:\tmp\packets_build_1111\vocab\BANK_LAYOUT.md); the real bank is built by another job.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const V = require('../packet_vocab_builder.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
const verify = require('../packets_verify_core.js');
const reader = require('../packets_results_reader.js');
const IDS = ['vocab_meaning', 'vocab_word', 'vocab_blank'];
const WORDS = 'habitat, predator, prey, cell, bat, adapt, camouflage, ancient';

const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const labelsOf = (html) => JSON.parse(/\nvar labels=(.*);\nvar matches=/.exec(html)[1]);
const ruleOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((node) => !node.type).textContent;
// The list the other packet tests apply to a file with no mailbox. A vocabulary file may hold the speech engine (Read aloud).
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
const NOT_SAID = /\b(?:tests?|tested|testing|probes?|quiz(?:zes)?|assessments?|exams?|learners?|reviewed by|verified by)\b/i;
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

await bank.load();
const rowsOf = (words = WORDS, edits) => V.draftRows({ words: V.parseWords(words).words, bank, edits });
const make = ({ words = WORDS, types = ['meaning', 'word'], mode = 'practice', edits, ...more } = {}) => {
  const rows = rowsOf(words, edits);
  const lesson = V.lessonFromVocab({ loader: TH, rows, types, mode, ...more });
  return { rows, lesson, ...V.buildVocabPacket({ lesson, loader: TH, rows, bank, ...more }) };
};

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
// A built file, played in jsdom with a test clock. voices: what the device's speech engine offers (null: no engine).
function play(html, { voices = [{ lang: 'en-US', localService: true, name: 'On device' }, { lang: 'en-US', localService: false, name: 'Online' }] } = {}) {
  const saved = [], spoken = [];
  const time = { t: 1000 };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/vocab.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    if (voices) {
      w.speechSynthesis = { getVoices: () => voices, cancel() {}, speak(u) { spoken.push([u.text, u.voice && u.voice.name]); }, addEventListener() {} };
      w.SpeechSynthesisUtterance = function (text) { this.text = text; };
    }
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (selector) => d.querySelector(selector);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  // What is seen: 2026-11-13, a blank's "blank" for screen readers (.sr) is left out.
  const shown = (node) => { const copy = node.cloneNode(true); copy.querySelectorAll('.sr').forEach((n) => n.remove()); return copy.textContent; };
  const choices = () => [...d.querySelectorAll('[data-choice]')].map((b) => shown(b).replace(/^\d/, ''));
  const pick = (text) => { time.t += 400; const i = choices().indexOf(text); if (i < 0) throw Error('no choice ' + text); q('[data-choice="' + (i + 1) + '"]').click(); };
  return { w, d, q, seen, button, choices, pick, saved, spoken,
    start: (name = 'Fox1') => { d.getElementById('learner-name').value = name; (button('Start') || button('Next')).click(); if (q('[data-check-begin]')) q('[data-check-begin]').click(); },
    heading: () => q('#app h2').textContent,
    ask: () => shown(q('[data-read]')),
    status: () => q('#app .status').textContent,
    next: () => (button('Next') || button('See my results')).click(),
    csv: () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; },
    json: () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); },
  };
}

// ---------------------------------------------------------------------------
// 1. The three activities in the engine
// ---------------------------------------------------------------------------
describe('the three vocabulary activities in the engine', () => {
  it('are built into the loader and its three mirrors, beside the check activities the app never lists', () => {
    for (const id of IDS) {
      expect(TH.CHECK_ADAPTERS[id], id).toBeTruthy();
      expect(TH.ADAPTERS[id], id).toBeUndefined();
      expect(TH.activities().map((a) => a.id), id).not.toContain(id);
    }
    expect(IDS.map((id) => TH.CHECK_ADAPTERS[id].title)).toEqual(['Word to meaning', 'Meaning to word', 'Fill the blank']);
    const check = spawnSync(process.execPath, ['dev-tools/build_word_sounds_take_home.cjs', '--check'], { encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
    for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const file = mirror + '/word_sounds_take_home_loader.js';
      if (existsSync(file)) expect(read(file) === read('word_sounds_take_home_loader.js'), file).toBe(true);
    }
  });

  it('are the same code apart from the prefix of their labels, with labels of the same names, in plain words', () => {
    const plain = (a, part) => a[part].toString().split(a.id + '_').join('X_');
    for (const part of ['prepare', 'render', 'score']) for (const id of IDS.slice(1)) expect(plain(TH.CHECK_ADAPTERS[id], part), id + ' ' + part).toBe(plain(TH.CHECK_ADAPTERS.vocab_meaning, part));
    const names = (a) => Object.keys(a.labels).map((k) => k.slice(a.id.length + 1));
    // 2026-11-13: 'blank', the word a screen reader hears for ___ (tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    for (const id of IDS) expect(names(TH.CHECK_ADAPTERS[id]), id).toEqual(['intro', 'directions', 'question', 'read', 'read_choice', 'hear', 'correct', 'retry', 'missed', 'practice_wrong', 'blank']);
    for (const id of IDS) {
      const a = TH.CHECK_ADAPTERS[id];
      // What is copied into a file stands alone: the speech engine is reached through ctx.root, never a global.
      expect(a.render.toString() + a.score.toString()).not.toMatch(/\b(?:document|window|localStorage|sessionStorage|globalThis)\b/);
      expect(audit(a.render.toString() + a.score.toString() + JSON.stringify(a.labels)), id).toEqual(['speech engine']);
      // Only a voice that runs on the device.
      expect(a.render.toString()).toContain('v.localService === true');
      new Function('return (' + a.render.toString() + ');')();
      const words = Object.values(a.labels).join('\n');
      expect(NOT_SAID.exec(words), id).toBeNull();
      expect(BRITISH.exec(words), id).toBeNull();
    }
  });

  it('take a question with 2 to 6 different choices and one answer among them, and refuse anything else', () => {
    const A = TH.CHECK_ADAPTERS.vocab_meaning;
    const good = { word: 'habitat', ask: 'habitat', choices: ['a home', 'a hole', 'a nest', 'a den'], answer: 'a home', read: true };
    expect(A.prepare(good).item).toEqual({ word: 'habitat', ask: 'habitat', choices: [{ text: 'a home' }, { text: 'a hole' }, { text: 'a nest' }, { text: 'a den' }], answer: 'a home', read: true, lang: 'en' });
    expect(A.prepare({ ...good, answer: 'a cave' }).missing).toEqual(['an answer that is one of the choices']);
    expect(A.prepare({ ...good, choices: ['a home', 'a home', 'a nest'] }).missing).toEqual(['different choices']);
    expect(A.prepare({ ...good, choices: ['a home'] }).missing).toEqual(['choices']);
    expect(A.prepare({ ...good, word: '' }).missing).toEqual(['word']);
    // Two long choices that start with the same 80 characters could not be told apart in a results file.
    const long = 'x'.repeat(80);
    expect(A.prepare({ ...good, choices: [long + ' one', long + ' two'], answer: long + ' one' }).missing).toEqual(['different choices']);
    expect(A.prepare({ ...good, read: 'yes' }).item.read).toBe(false);
    expect(A.score({}, 'a home', 'a home').correct).toBe(true);
    expect(A.score({}, 'a home', 'a hole').correct).toBe(false);
    expect(A.score({}, 'a home', '').correct).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. The builder: the questions the check screen shows
// ---------------------------------------------------------------------------
describe('the builder drafts one question per word', () => {
  it('reads the list: commas or lines, each word once, up to 40', () => {
    const got = V.parseWords('habitat, Prey\n\nprey; predator\n42\n' + Array.from({ length: 41 }, (_, i) => 'w' + String.fromCharCode(97 + (i % 26)) + 'x'.repeat(Math.floor(i / 26) + 1)).join('\n'));
    expect(got.words.slice(0, 3).map((w) => w.word)).toEqual(['habitat', 'Prey', 'predator']);
    expect(got.twice).toEqual(['prey']);
    expect(got.unusable).toEqual(['42']);
    expect(got.words).toHaveLength(40);
    expect(got.over).toBe(4);
    expect(V.normalizeWord(' "food chain". ')).toBe('food chain');
  });

  it('uses the school meaning first; the other meanings are offered, never required', () => {
    const rows = rowsOf();
    const cell = rows.find((r) => r.key === 'cell');
    expect([cell.senseId, cell.def, cell.senses.map((s) => s.id)]).toEqual(['cell|n|1', 'The smallest living part of a plant or an animal', ['cell|n|1', 'cell|n|2', 'cell|n|3']]);
    expect(cell.checked).toBe('good');
    expect(rows.find((r) => r.key === 'prey').checked).toBe('');
    const changed = rowsOf(WORDS, { words: { cell: { sense: 'cell|n|2' } } }).find((r) => r.key === 'cell');
    expect([changed.senseId, changed.def]).toEqual(['cell|n|2', 'A small room in a jail']);
  });

  it('never gives a wrong answer that is another meaning of the word, nor a wrong word that has the meaning shown', () => {
    for (const row of rowsOf()) {
      expect(row.wrong, row.word).toHaveLength(3);
      expect(row.problems.filter(Boolean), row.word).toEqual([]);
      for (const c of row.wrong) {
        for (const s of bank.senses(row.word)) expect(V.closeMeaning(c.def, s.def), row.word + ' / ' + c.def).toBe(false);
        for (const s of bank.senses(c.word)) expect(V.closeMeaning(row.def, s.def), row.word + ' / ' + c.word).toBe(false);
      }
    }
    // A wrong answer the teacher types that is another meaning of the word, or close to it, is flagged in plain words.
    const bat = rowsOf().find((r) => r.key === 'bat');
    expect(V.wrongProblem(bat, { word: 'club', def: 'A stick used to hit a ball' }, bank, [])).toBe('This could also be right: it is close to a meaning of "bat".');
    expect(V.wrongProblem(bat, { word: 'club', def: 'a stick that is used to hit the ball' }, bank, [])).toMatch(/^This could also be right/);
    expect(V.wrongProblem(bat, { word: 'owl', def: 'A bird with big eyes that hunts at night' }, bank, [])).toBe('');
    // Meaning to word: a wrong word one of whose meanings is the one shown.
    const habitat = rowsOf().find((r) => r.key === 'habitat');
    expect(V.wrongProblem(habitat, { word: 'cell', def: 'A small phone you carry with you' }, bank, [])).toBe('');
    expect(V.wrongProblem({ ...habitat, def: 'A small room in a jail' }, { word: 'cell', def: 'A small phone you carry with you' }, bank, []))
      .toBe('In Meaning to word, "cell" could also be right: one of its meanings is close to this one.');
    const kept = rowsOf(WORDS, { words: { bat: { wrongFor: 'bat|n|1', wrong: [{ word: 'club', def: 'A stick used to hit a ball', from: 'teacher' }, bat.wrong[1], bat.wrong[2]] } } }).find((r) => r.key === 'bat');
    expect(kept.wrong[0].def).toBe('A stick used to hit a ball');
    expect(kept.problems[0]).toMatch(/^This could also be right/);
  });

  it('chooses the wrong answers so that the right one is not usually the longest or the shortest', () => {
    const counts = [0, 0, 0, 0];
    const pool = Array.from({ length: 8 }, (_, i) => ({ word: 'w' + i, def: 'x'.repeat(20 + i * 7) }));
    for (let n = 0; n < 400; n++) {
      const trio = V.balancedTrio('y'.repeat(45), pool, 'seed' + n);
      counts[trio.filter((c) => c.def.length < 45).length]++;
    }
    for (const c of counts) expect(c).toBeGreaterThan(60);
  });

  it('Swap cycles through the candidates that are not on screen', () => {
    const row = rowsOf().find((r) => r.key === 'habitat');
    const seen = new Set();
    let r = row;
    for (let k = 0; k < 6; k++) {
      const next = V.swap(r, 0);
      expect(r.wrong.map((c) => c.word)).not.toContain(next.word);
      seen.add(next.word);
      r = { ...r, wrong: [next, r.wrong[1], r.wrong[2]] };
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('Fill the blank uses only words from the list, the article is no clue, and a sentence without the word is left out', () => {
    const rows = rowsOf();
    const listKeys = rows.map((r) => r.key);
    for (const row of rows) for (const w of row.blank.wrong) expect(listKeys, row.word).toContain(V.keyOf(w));
    const bat = rows.find((r) => r.key === 'bat');
    expect(bat.blank.ask).toBe('A ___ sleeps in the cave all day.');
    for (const w of bat.blank.wrong) expect(/^[aeiou]/i.test(w), w).toBe(false);
    const ancient = rows.find((r) => r.key === 'ancient');
    expect(ancient.blank.ask).toBe('We saw an ___ castle.');
    // 2026-11-13: the wrong words are of the same kind as the word (adjectives here), and a plain form of the word counts
    // (tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    expect(ancient.blank.why).toMatch(/^Fill the blank needs 3 other adjectives from your list that can go after "an"/);
    expect(V.blankSentence('The cat sat.', 'dog').why).toBe('The sentence does not have the word as it is written in your list, or with a plain ending like -s, -ed or -ing. Edit the sentence.');
    expect(V.blankSentence('A cat and a cat.', 'cat').why).toBe('The word is in the sentence more than once. Edit the sentence.');
    // The bank's "does not fit" words come first.
    expect(rows.find((r) => r.key === 'habitat').blank.wrong.slice(0, 2)).toEqual(['predator', 'camouflage']);
  });

  it('a word the bank does not have: the teacher types its meaning, and its wrong answers are other words of the list', () => {
    const rows = rowsOf(WORDS + ', photosynthesis');
    const own = rows.find((r) => r.key === 'photosynthesis');
    expect([own.inBank, own.own, own.def, own.wrong, V.rowStop(own, 'meaning')]).toEqual([false, true, '', [], 'Type a meaning for it.']);
    const typed = rowsOf(WORDS + ', photosynthesis', { words: { photosynthesis: { def: 'How a plant makes its food from sunlight' } } }).find((r) => r.key === 'photosynthesis');
    expect(typed.wrong.map((c) => c.from)).toEqual(['list', 'list', 'list']);
    expect(V.rowStop(typed, 'meaning')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 3. The file
// ---------------------------------------------------------------------------
describe('a practice file', () => {
  const made = make({ types: ['meaning', 'word', 'blank'] });
  const lesson = lessonOf(made.html);

  it('is the same file for the same choices, holds nothing that could reach the network, and "Look inside a file" finds nothing to look at', () => {
    expect(make({ types: ['meaning', 'word', 'blank'] }).html).toBe(made.html);
    expect(audit(made.html)).toEqual(['speech engine']);
    expect(ruleOf(made.html)).toMatch(/^default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'; style-src 'unsafe-inline'; .*connect-src 'none'$/);
    const r = verify.verifyPacket(made.html);
    expect([r.ok, r.kind, r.result, r.script.verdict]).toEqual([true, 'packet', 'closed', 'agree']);
    expect(r.counts).toMatchObject({ notExpected: 0, look: 0 });
    expect(r.findings.filter((f) => f.id === 'speech').every((f) => f.cls === 'expected in this kind of file')).toBe(true);
    expect(r.claims.find((c) => c.id === 'never-ai').verdict).toBe('cannot tell');
    // Raised 2026-11-13 (engine fixes, C:/tmp/packets_build_1111/engine2/STATUS.txt) from 120000: two tabs of one file, honest
    // saving and the sound-failed note in the shell (+7 KB in every file; this file about 123.7 KB).
    expect(Buffer.byteLength(made.html)).toBeLessThan(130000);
    // Every file carries the reading tools.
    expect(made.html).toContain('\ntools:function takeHomeTools(o) {\n');
  });

  it('says where its meanings come from, with each license and its deed, and that the teacher may have changed them', () => {
    const m = made.manifest;
    expect(m.attributions[0]).toBe('Word meanings and related words from Simple English Wiktionary, by Wiktionary contributors, license CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/). Source: simple.wiktionary.org/.');
    expect(m.attributions[1]).toContain('license CC BY 4.0 (creativecommons.org/licenses/by/4.0/)');
    expect(m.attributions).toContain('The meanings were shortened and cleaned up by a program when the word list was prepared. The teacher who made this file may have changed some of them.');
    expect(m.attributions.join(' ')).not.toMatch(/review|checked by|verified|approved|expert/i);
    expect(m.speech).toMatchObject({ engine: 'speechSynthesis', sends: 'nothing' });
    expect(m.vocab).toMatchObject({ builder: V.VERSION, types: ['meaning', 'word', 'blank'], mode: 'practice', readAloud: true });
    expect(labelsOf(made.html).about_never).toContain('Read aloud uses the voice that is built into this device');
    // The About panel shows the credits.
    const t = play(made.html);
    t.q('[data-about-open]').click();
    expect(t.q('[data-about]').textContent).toContain('Made with: Word meanings and related words from Simple English Wiktionary');
  });

  it('mixes the order of the questions and of each question\'s choices, differently for each question', () => {
    const blocks = lesson.blocks.map((b) => b.activity);
    // 2026-11-13: Meaning to word comes first, so no meaning is shown as a choice before it is asked (the order is in
    // tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    expect(blocks).toEqual(['vocab_word', 'vocab_meaning', 'vocab_blank']);
    const meaning = lesson.blocks[1].items;
    expect(meaning.map((it) => it.word)).not.toEqual(made.rows.map((r) => r.word));
    const places = meaning.map((it) => it.choices.findIndex((c) => c.text.slice(0, 80) === it.answer));
    expect(new Set(places).size).toBeGreaterThan(1);
    expect(meaning.every((it) => /^vocab_meaning-\d\d@[a-z]+\|[a-z]+\|\d$/.test(it.id))).toBe(true);
  });

  it('plays: large text, right or wrong with a second try, Read aloud with a voice on the device only, and a results file with each answer', () => {
    const t = play(made.html);
    t.start();
    // 2026-11-13: Meaning to word is asked first (see "mixes the order" above); Fill the blank has 6, adapt (a verb) has no 3 other verbs.
    expect(t.heading()).toBe('Meaning to word: 1 of 8');
    const first = lesson.blocks[0].items[0];
    expect(t.ask()).toBe(first.ask);
    expect(t.choices()).toEqual(first.choices.map((c) => c.text));
    // Read aloud: the question, then one choice, with the voice that runs on the device.
    t.q('[data-read-aloud="question"]').click();
    t.q('[data-read-aloud="choice-2"]').click();
    expect(t.spoken).toEqual([[first.ask.replace(/_{2,}/g, ', blank, ') + '. Which word has this meaning?', 'On device'], [first.choices[1].text, 'On device']]);
    const wrong = first.choices.find((c) => c.text.slice(0, 80) !== first.answer).text;
    t.pick(wrong);
    expect(t.status()).toBe('Not quite. Try once more.');
    t.pick(first.choices.find((c) => c.text.slice(0, 80) === first.answer).text);
    expect(t.status()).toBe('Yes. That is the word.');
    t.next();
    // The rest right at once.
    lesson.blocks.forEach((b, bi) => b.items.forEach((it, i) => {
      if (bi === 0 && i === 0) return;
      t.pick(it.choices.find((c) => c.text.slice(0, 80) === it.answer).text);
      t.next();
    }));
    const json = t.json();
    expect(json.items[0]).toMatchObject({ itemId: first.id, activity: 'vocab_word', word: first.word, target: first.answer, responses: [wrong.slice(0, 80), first.answer], attempts: 2, correct: true, firstTry: false });
    expect(json.items[0].supports).toMatchObject({ readAloud: 2 });
    expect(json.summary.byActivity.map((a) => [a.activity, a.items, a.firstTry])).toEqual([['vocab_word', 8, 7], ['vocab_meaning', 8, 8], ['vocab_blank', 6, 6]]);
    const csv = t.csv();
    expect(csv.body).toContain('"alloflow-packet-result/1"');
    expect(csv.body.split('\r\n')[1]).toContain('"' + first.id + '","vocab_word","Meaning to word","1","' + first.word + '"');
  });

  it('shows no Read aloud button where the device has no speech engine, or only voices that need the internet', () => {
    for (const voices of [null, [{ lang: 'en-US', localService: false, name: 'Online' }], [{ lang: 'fr-FR', localService: true, name: 'French' }]]) {
      const t = play(made.html, { voices });
      t.start();
      expect([...t.d.querySelectorAll('[data-read-aloud]')].every((b) => b.hidden), JSON.stringify(voices)).toBe(true);
      expect(t.spoken).toEqual([]);
    }
    const off = make({ readAloud: false });
    const t = play(off.html);
    t.start();
    expect([...t.d.querySelectorAll('[data-read-aloud]')].every((b) => b.hidden)).toBe(true);
    expect(off.manifest.speech).toEqual({ engine: 'none', note: 'Read aloud is off in this file.' });
  });

  it('a file for one student carries the code name in its manifest only, and opens with it filled in', () => {
    const one = make({ learner: 'Blue Heron 7' });
    expect(one.manifest.learner).toBe('Blue Heron 7');
    expect(scriptOf(one.html)).toBe(scriptOf(make().html));
    expect(V.withCodeName(make().html, 'Blue Heron 7')).toBe(one.html);
    const t = play(one.html);
    expect(t.d.getElementById('learner-name').value).toBe('Blue Heron 7');
  });

  it('can be read back for "Open a file I made", with the teacher\'s choices', () => {
    const edits = { words: { cell: { sense: 'cell|n|2' } }, senses: { 'habitat|n|1': { def: 'Where a plant or animal lives in nature' } } };
    const f = make({ edits, title: 'Unit 3 words' });
    const back = V.readBack(verify.readParts(f.html));
    expect([back.ok, back.title, back.mode, back.types, back.readAloud]).toEqual([true, 'Unit 3 words', 'practice', ['meaning', 'word'], true]);
    expect(back.words).toEqual(f.rows.map((r) => r.word));
    expect(back.senses.cell).toBe('cell|n|2');
    expect(back.rows.find((r) => r.word === 'habitat').def).toBe('Where a plant or animal lives in nature');
    expect(back.rows.find((r) => r.word === 'habitat').wrong).toHaveLength(3);
  });
});

describe('a check file', () => {
  const made = make({ mode: 'check', teacherCode: 'owl42', title: 'Unit 3 check' });
  const sealed = lessonOf(made.html);

  it('is a check: one try, a score of items right, no clock, a teacher code kept as a hash, and its answers scrambled', () => {
    expect(made.manifest.packet).toMatchObject({ mode: 'check', form: 'custom' });
    // 2026-11-13: one sample question first, not scored, as a math check has (tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    expect(made.manifest.check).toMatchObject({ measure: 'vocab_items', scoreUnit: 'items_correct', timeLimitS: null, items: 16, practiceItems: 1 });
    expect(made.manifest.check.teacherCode).toMatch(/^set; kept only as a salted SHA-256 hash/);
    expect(made.html).not.toContain('owl42');
    const items = sealed.blocks.flatMap((b) => b.items);
    expect(items.every((it) => typeof it.key === 'string' && !('answer' in it) && !('target' in it))).toBe(true);
    // Where the answer is the word, the word is not in the question's record, and its sense is not in its id.
    for (const it of sealed.blocks.find((b) => b.activity === 'vocab_word').items.filter((x) => !x.practice)) {
      expect(it.id).toMatch(/^vocab_word-\d\d$/);
      expect(made.rows.map((r) => r.word)).not.toContain(it.word);
      expect(it.word).toBe(it.ask.slice(0, 120));
    }
    expect(made.manifest.vocab.rows).toBeUndefined();
    expect(made.html).not.toMatch(/"answer":/);
    const r = verify.verifyPacket(made.html);
    expect([r.result, r.counts.notExpected, r.counts.look]).toEqual(['closed', 0, 0]);
  });

  it('plays with one try for each question and no right or wrong, and the results file carries the score', () => {
    const raw = make({ mode: 'check', teacherCode: 'owl42', title: 'Unit 3 check' }).lesson;
    const t = play(made.html);
    // 2026-11-13: the sample question comes first, with right or wrong, then "Get ready".
    t.d.getElementById('learner-name').value = 'Fox1';
    (t.button('Start') || t.button('Next')).click();
    expect(t.heading()).toBe('Practice 1 of 1');
    const [sample, ...all] = raw.blocks.flatMap((b) => b.items);
    expect(sample.practice).toBe(true);
    t.pick(sample.choices.find((c) => c === sample.answer));
    expect(t.status()).toBe('Yes! That is right.');
    t.q('[data-practice-next]').click();
    t.q('[data-check-begin]').click();
    expect(t.heading()).toBe('Question 1 of 16');
    all.forEach((it, i) => {
      const right = it.choices.find((c) => c.slice(0, 80) === it.answer.slice(0, 80));
      t.pick(i === 3 ? it.choices.find((c) => c !== right) : right);
    });
    const json = t.json();
    expect(json.packet.mode).toBe('check');
    expect(json.score).toMatchObject({ measure: 'vocab_items', score: 15, scoreUnit: 'items_correct', itemsAttempted: 16 });
    expect(json.items[4]).toMatchObject({ correct: false, attempts: 1 });
    expect(json.items[0]).toMatchObject({ itemId: 'vocab_word-p0', practice: 'practice', target: 'chair' });
    expect(json.items.filter((it) => it.activity === 'vocab_word' && !it.practice).every((it) => made.rows.some((r) => r.word === it.target))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. The two readers
// ---------------------------------------------------------------------------
function played({ mode = 'practice', missFirst = false } = {}) {
  const f = make({ mode, title: mode === 'check' ? 'Unit 3 check' : 'Unit 3 words' });
  const t = play(f.html);
  // 2026-11-13: a check opens with a sample question (not scored): answered right, then Next and Start.
  t.d.getElementById('learner-name').value = 'Fox1';
  (t.button('Start') || t.button('Next')).click();
  let all = f.lesson.blocks.flatMap((b) => b.items);
  if (all[0].practice) {
    t.pick(all[0].choices.find((c) => c === all[0].answer));
    t.q('[data-practice-next]').click();
    all = all.slice(1);
  }
  if (t.q('[data-check-begin]')) t.q('[data-check-begin]').click();
  all.forEach((it, i) => {
    const choices = it.choices.map((c) => (typeof c === 'string' ? c : c.text));
    const right = choices.find((c) => c.slice(0, 80) === it.answer.slice(0, 80));
    if (missFirst && i === 0) t.pick(choices.find((c) => c !== right));
    if (mode !== 'check' || !(missFirst && i === 0)) t.pick(right);
    if (mode !== 'check') t.next();
  });
  return { csv: t.csv(), json: JSON.stringify(t.json()) };
}

describe('Add up results reads a vocabulary file', () => {
  it('practice: under "Vocabulary", by activity, as practice', async () => {
    const r = played({ missFirst: true });
    for (const [text, name] of [[r.csv.body, r.csv.name], [r.json, 'x.json']]) {
      const s = (await reader.read(text, { name, lastModified: Date.UTC(2026, 10, 20) })).sessions[0];
      expect([s.mode, s.measure, s.title, s.integrity], name).toEqual(['practice', 'practice', 'Unit 3 words', 'ok']);
      // 2026-11-13: Meaning to word is asked first.
      expect(s.byActivity.map((a) => [a.activity, a.name, a.strand, a.graded, a.firstTry])).toEqual([['vocab_word', 'Meaning to word', 'vocabulary', 8, 7], ['vocab_meaning', 'Word to meaning', 'vocabulary', 8, 8]]);
      expect(s.byStrand.map((row) => [row.strand, row.name, row.firstTry, row.graded])).toEqual([['vocabulary', 'Vocabulary', 15, 16]]);
      const model = reader.addUp([s]);
      expect(model.strands).toEqual(reader.VOCAB_STRANDS);
      expect(model.checks).toEqual([]);
    }
  });

  it('a check: a check series named "Vocabulary check", scored in items right', async () => {
    const r = played({ mode: 'check', missFirst: true });
    for (const [text, name] of [[r.csv.body, r.csv.name], [r.json, 'x.json']]) {
      const s = (await reader.read(text, { name, lastModified: Date.UTC(2026, 10, 20) })).sessions[0];
      expect([s.mode, s.measure, s.measureName, s.unitName, s.value, s.integrity], name).toEqual(['probe', 'vocab_items', 'Vocabulary check', 'items correct', 15, 'ok']);
      const model = reader.addUp([s]);
      expect(model.checks.map((c) => c.label)).toEqual(['Vocabulary check (Unit 3 check)']);
    }
  });
});

describe('Class Analytics files a vocabulary file under "Vocabulary"', () => {
  const analytics = read('student_analytics_module.js');
  const cut = (source, start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    if (a < 0 || b < 0) throw Error('not found: ' + start);
    return source.slice(a, b);
  };
  const AC = new Function(
    cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
    cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
    '\nreturn {summary: _acWsSessionSummary, bySkill: _acWsBySkill, readFile: _acThReadFile, apply: _acThApply, newStudent: _acThNewStudent, activityName: _acWsActivityName,'
    + ' strandName: _acWsStrandName, vocabStrands: _AC_VOCAB_STRANDS, vocabActivities: _AC_VOCAB_ACTIVITIES};')();
  const stats = { quizAvg: 0, wsAccuracy: null, wsWordsCompleted: 0, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0 };
  const newOne = (name, session) => AC.newStudent(name, session, stats, false);

  it('has the same names as the results page, in all four copies of the module', () => {
    expect(AC.vocabStrands).toEqual(reader.VOCAB_STRANDS);
    expect(AC.vocabActivities).toEqual(reader.VOCAB_ACTIVITIES);
    for (const id of IDS) expect(reader.VOCAB_ACTIVITIES[id][0]).toBe(TH.CHECK_ADAPTERS[id].title);
    for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const file = mirror + '/student_analytics_module.js';
      if (existsSync(file)) expect(read(file) === analytics, file).toBe(true);
    }
    expect([AC.strandName(null, 'vocabulary'), AC.activityName(null, 'vocab_meaning'), AC.activityName(null, 'vocab_word'), AC.activityName(null, 'vocab_blank')])
      .toEqual(['Vocabulary', 'Word to meaning', 'Meaning to word', 'Fill the blank']);
  });

  it('practice and a check, from the CSV and the JSON: a take-home session under Vocabulary, never a math record, never flagged', async () => {
    for (const mode of ['practice', 'check']) {
      const r = played({ mode, missFirst: true });
      const sessions = [];
      for (const [text, name] of [[r.csv.body, r.csv.name], [r.json, 'results.json']]) {
        const got = await AC.readFile(new File([text], name, { type: 'text/plain', lastModified: Date.UTC(2026, 10, 20) }));
        expect(got.reason, mode + ' ' + name).toBe('');
        const s = got.sessions[0];
        expect(s.check, mode).toBeUndefined();
        // 2026-11-13 (later): a check's sample question is practice before the scored items, never graded and no longer one
        // of the items given (it read "17 given" for 16 scored): 16 in both kinds.
        expect([s.given, s.firstTryItems, s.firstTryCorrect, s.integrity], mode + ' ' + name).toEqual([16, 16, 15, 'ok']);
        expect(Object.keys(s.acts)).toEqual(['vocab_word', 'vocab_meaning']);
        sessions.push(s);
      }
      expect(sessions[0].id).toBe(sessions[1].id);
      const applied = AC.apply([], sessions.map((session) => ({ session, name: 'BlueHeron7' })), newOne);
      expect([applied.added, applied.probeAdds, applied.students[0].screeningHistory], mode).toEqual([1, [], []]);
      const skills = AC.bySkill(AC.summary(applied.students[0].data.wordSoundsState));
      expect(skills.map((k) => [k.key, k.needsSupport, k.activities.map((a) => a.id)]), mode).toEqual([['vocabulary', false, ['vocab_meaning', 'vocab_word']]]);
    }
  });
});
