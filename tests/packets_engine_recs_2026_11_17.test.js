// The review fixes of 2026-11-17 in the student file engine and the shared helpers (owner: "please do all reccs";
// reports/packets_review_2026-11-16.md). One describe for each finding; each test says what it guards.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './helpers/packets_fake_indexeddb.js';

const read = (f) => readFileSync(f, 'utf8');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
  activityItems: { isolation: { position, correctSound: correct, options } } });
let seq = 0;
const lessonOf = (pack, extra = {}) => Object.assign(TH.lessonFromPack(pack, { core, banks: BANKS, title: 'Short a', lessonId: 'L-recs-' + (++seq) }).lesson, extra);
const PACK = () => [word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])];
const build = (extra) => TH.buildHtml(lessonOf(PACK(), extra), { core });

function open({ html = build(), storage = null } = {}) {
  const saved = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const items = lesson.blocks.flatMap((b) => b.items);
  const key = (n) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: String(n), bubbles: true, cancelable: true }));
  const pick = (i, right = true) => { const at = items[i].choices.findIndex((c) => c.label === items[i].target); key((right ? at : (at === 0 ? 1 : 0)) + 1); };
  // Two different wrong choices: the question is then missed (a choice already tried cannot be chosen again).
  const missTwice = (i) => { const at = items[i].choices.findIndex((c) => c.label === items[i].target); const wrong = [0, 1, 2, 3].filter((n) => n !== at && n < items[i].choices.length); key(wrong[0] + 1); key(wrong[1] + 1); };
  const start = (name) => { if (name != null) d.getElementById('learner-name').value = name; button('Start').click(); };
  const heading = () => d.querySelector('#app h2').textContent;
  const dump = () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const saveJson = () => { d.querySelector('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  return { dom, w, d, saved, button, items, pick, missTwice, start, heading, dump, saveJson };
}

describe('D1: a finished practice can be reached again, and is not erased without asking', () => {
  it('reopened after the last question, it offers "See my results"; Start over asks while the results are unsaved', () => {
    const html = build();
    const a = open({ html });
    a.start('Ana');
    a.pick(0); a.button('Next').click();
    a.pick(1); a.button('See my results').click();
    expect(a.d.body.textContent).toContain('You finished!');
    const b = open({ html, storage: a.dump() });
    expect(b.button('See my results')).toBeTruthy();
    expect(b.button('Start')).toBeUndefined();
    b.button('Start over').click();
    const box = b.d.querySelector('[data-start-over-confirm]');
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('Your results have not been sent or saved as a file yet.');
    b.button('Keep my results').click();
    expect(box.hidden).toBe(true);
    b.button('See my results').click();
    expect(b.d.body.textContent).toContain('You finished!');
    expect(b.saveJson().items).toHaveLength(2);
    // Saved now: Start over on the next opening starts at once.
    const c = open({ html, storage: b.dump() });
    c.button('Start over').click();
    expect(c.d.getElementById('learner-name')).toBeTruthy();
  });
});

describe('D10: a shared device', () => {
  it('leaves the name empty, says whose answers Continue keeps, and asks before Start over erases them', () => {
    const html = build();
    const a = open({ html });
    a.start('Ana');
    a.pick(0); a.button('Next').click();
    const b = open({ html, storage: a.dump() });
    expect(b.d.getElementById('learner-name').value).toBe('');
    expect(b.d.querySelector('[data-continue-name]').textContent).toBe('Answers so far by: Ana.');
    b.button('Start over').click();
    expect(b.d.querySelector('[data-start-over-confirm]').textContent).toContain('Starting over erases the answers so far.');
    b.button('Keep my answers').click();
    b.button('Continue where I left off').click();
    expect(b.heading()).toMatch(/2 of 2/);
  });
});

describe('practice: the missed questions once more at the end (lesson.repeatMissed)', () => {
  it('brings back each question missed on the first try, once, as practice; the first-try result is the first time', () => {
    const html = build({ repeatMissed: true });
    const a = open({ html });
    a.start('Ana');
    a.missTwice(0); a.button('Next').click();   // missed twice: shown
    a.pick(1); a.button('See my results').click();
    expect(a.heading()).toBe('Once more: 1 of 1');
    // A reload in the middle of the round comes back to it.
    const b = open({ html, storage: a.dump() });
    b.button('Continue where I left off').click();
    expect(b.heading()).toBe('Once more: 1 of 1');
    a.pick(0); a.button('See my results').click();
    const text = a.d.body.textContent;
    expect(text).toContain('Right on the first try: 1 of 2.');
    expect(text).toContain('Went over once more: 1.');
    const file = a.saveJson();
    expect(file.items.map((it) => [it.itemId.endsWith('-again'), it.practice, it.correct])).toEqual([[false, null, false], [false, null, true], [true, 'practice', true]]);
  });
  it('a file without the choice, and a check, never add a round', () => {
    const a = open();
    a.start('Ana');
    a.missTwice(0); a.button('Next').click();
    a.pick(1); a.button('See my results').click();
    expect(a.d.body.textContent).toContain('You finished!');
    expect(read('word_sounds_take_home_loader.js')).toContain("repeatMissed = lesson.repeatMissed === true && lesson.mode !== 'probe'");
    expect(read('packet_vocab_builder.js')).toContain('if (!check && o.repeatMissed === true) sent.repeatMissed = true;');
  });
});

describe('practice: two choices, one try', () => {
  it('a question with two choices and no set number of tries ends after one wrong try', () => {
    const html = TH.buildHtml(lessonOf([word('cat', 0, 'k', ['k', 'a']), word('map', 2, 'p', ['p', 's'])]), { core });
    const a = open({ html });
    a.start('Ana');
    a.pick(0, false);
    expect(a.d.querySelector('[data-feedback]').hasAttribute('data-missed')).toBe(true);
    expect(a.button('Next')).toBeTruthy();
  });
});

describe('the results reader and the CSV', () => {
  it('reads up to 600 items and says when a file was cut', () => {
    const many = (n) => ({ kind: 'alloflow-take-home-result', schemaVersion: 3, lessonId: 'L', items: Array.from({ length: n }, () => ({ activity: 'isolation', done: true, correct: true, firstTry: true, attempts: 1 })) });
    expect(TH.parseResult(many(520)).result).toMatchObject({ itemsCut: false });
    expect(TH.parseResult(many(520)).result.items).toHaveLength(520);
    expect(TH.parseResult(many(700)).result).toMatchObject({ itemsCut: true });
  });
  it('appends accuracy_of_attempted_pct to the summary row, empty when nothing was attempted, and leaves accuracy_pct empty when nothing is scored', () => {
    const table = (items) => TH.resultsCsv({ sessionId: 's', packet: { id: 'P', version: 'r', form: '', mode: 'practice' }, items });
    expect(table([{ activity: 'isolation', correct: true, attempts: 1, done: true }, { activity: 'isolation' }]).summary).toMatchObject({ accuracyPct: 50, accuracyOfAttemptedPct: 100 });
    expect(table([{ activity: 'read_along', practice: 'read', done: true }]).summary).toMatchObject({ accuracyPct: '', accuracyOfAttemptedPct: '' });
  });
  it('keeps the apostrophe on a negative number, as the readers that check the integrity value expect', () => {
    expect(read('word_sounds_take_home_loader.js')).toContain("if (typeof v === 'string' && /^[=+\\-@\\t\\r]/.test(t)) t = \"'\" + t;");
  });
  it('records nothing about the device or the browser', () => {
    expect(read('word_sounds_take_home_loader.js')).not.toMatch(/userAgent|navigator\.platform/);
  });
});

describe('checks', () => {
  it('a sealed check keeps no copy of an answer (Symbol Runner set "target" to it)', () => {
    expect(read('word_sounds_take_home_loader.js')).toContain('delete item.answer; delete item.target;');
  });
  it('a pause sets its problem aside, uncounted (not done, no answer), and the score carries the paused time', () => {
    const src = read('word_sounds_take_home_loader.js');
    expect(src).toContain("cur.rec.attempts = 0; cur.rec.flag = 'paused';");
    expect(src).toContain("if (sc.pauses) ? [kv('paused_s', sc.pausedS), kv('pauses', sc.pauses)]".replace('if (sc.pauses) ? ', 'sc.pauses ? '));
    // What was typed at time-up is its own field, never an answer.
    expect(src).toContain('if (/[0-9]/.test(typed)) rec.typed = typed.slice(0, 20);');
  });
  it('young students\' checks say a grown-up reads the first page', () => {
    // 2026-11-23: "presses Start", the word on the button (check_begin); it said "presses Begin".
    expect(TH.CHECK_LABELS.check_ready_adult).toBe('For a young student: a grown-up reads this page aloud before the student presses Start.');
  });
});

describe('activities', () => {
  it('Cover, copy, compare and Rehearsal clear the shown answer when it is covered again', () => {
    for (const f of ['word_sounds_take_home/check_adapters/math_ccc.js', 'word_sounds_take_home/check_adapters/math_rehearsal.js']) expect(read(f), f).toContain("if (typeof ctx.feedback === 'function') ctx.feedback('');");
    expect(read('word_sounds_take_home_loader.js')).toContain("feedback: function (text) { if (rec.done) return; feedback.className = 'status';");
  });
  it('Spelling Bee hints always leave a letter for the student', () => {
    expect(read('word_sounds_take_home/adapters/spelling_bee.js')).toContain('if (nextBlank >= 0 && blanks() > 1) filled[nextBlank] = letters[nextBlank];');
  });
  it('a color word is drawn on a fixed white card, and a color item\'s lane is not tinted', () => {
    const src = read('word_sounds_take_home/check_adapters/symbol_runner.js');
    expect(src).toContain('background:#ffffff;forced-color-adjust:none;color:');
    expect(src).toContain("isTarget && lockedOn && !item.stroopInk ? 'var(--ok-bg)'");
  });
});

describe('the Open page address in a file', () => {
  const loaderIn = (url) => {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url });
    dom.window.eval(read('word_sounds_take_home_loader.js'));
    const html = dom.window.AlloWordSoundsTakeHome.buildHtml(lessonOf(PACK()), { core });
    dom.window.close();
    return /Phone or tablet\? Open this file at ([^<]*)</.exec(html)[1];
  };
  it('names the site the file was made on, unless that is a test or local address', () => {
    expect(loaderIn('https://school.example/packets/packets-make.html')).toBe('school.example/packets/packets-open.html');
    expect(loaderIn('https://packets.test/site/packets-make.html')).toBe('apomera.github.io/AlloFlow/packets-open.html');
    expect(loaderIn('http://localhost:8080/packets-make.html')).toBe('apomera.github.io/AlloFlow/packets-open.html');
    expect(loaderIn('https://school.example/app/index.html')).toBe('apomera.github.io/AlloFlow/packets-open.html');
  });
  it('the facts of every file say where its licence and its source are, with no address the file could reach', () => {
    const html = build();
    const m = JSON.parse(/id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
    expect([m.licenceUrl, m.source]).toEqual(['gnu.org/licenses/agpl-3.0.html', 'github.com/Apomera/AlloFlow']);
  });
});

describe('the shared sound helpers (packets_audio_kit.js)', () => {
  const kitWith = (encoder) => {
    const w = { document: { head: { appendChild() {} }, createElement() { return {}; } }, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary') };
    w.window = w;
    vm.createContext(w);
    if (encoder) vm.runInContext(read('lame.min.js'), w);
    vm.runInContext(read('packets_audio_kit.js'), w);
    return w.AlloPacketAudioKit;
  };
  const tone = (ms = 500, rate = 22050) => {
    const n = Math.round(rate * ms / 1000), b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(i / 6)), 44 + i * 2);
    return 'data:audio/wav;base64,' + b.toString('base64');
  };
  it('makes a WAV recording an MP3 several times smaller, and gives nothing (keep the WAV) without the encoder', () => {
    const kit = kitWith(true), wavUri = tone();
    const mp3 = kit.wavUriToMp3Uri(wavUri, 48);
    expect(mp3.startsWith('data:audio/mpeg;base64,')).toBe(true);
    const bytes = Buffer.from(mp3.split(',')[1], 'base64');
    expect(bytes[0]).toBe(0xff);
    expect(mp3.length * 5).toBeLessThan(wavUri.length);
    expect(kitWith(false).wavUriToMp3Uri(wavUri, 48)).toBeNull();
    expect(kit.wavUriToMp3Uri('data:audio/webm;base64,AAAA', 48)).toBeNull();
  });
  it('the Word Sounds and vocabulary makers use it without ever waiting for it', () => {
    expect(read('packets-make.js')).toContain('if (!mp3Kit) { audioKit(); return Promise.resolve(null); }');
    expect(read('word_sounds_packet_builder.js')).toContain("out.format = 'audio/mpeg (from ' + out.format + ')';");
    expect(read('packets_vocab_media.js')).toContain('return Promise.resolve(readyKit);');
  });
});

describe('My words: kept, and saved as a file', () => {
  const store = () => {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://packets.test/packets-make.html' });
    const w = dom.window;
    w.indexedDB = fakeIndexedDB();
    const asked = [];
    Object.defineProperty(w.navigator, 'storage', { configurable: true, value: { persist: () => { asked.push(1); return Promise.resolve(true); } } });
    w.eval(read('packets_my_words.js'));
    return { w, my: w.AlloPacketMyWords, asked };
  };
  it('asks the browser once to keep it, and a saved file puts every word back through the same checks', async () => {
    const a = store();
    await a.my.put('zib', { sounds: ['z', 'i', 'b'] });
    await a.my.put('flarp', { sounds: ['f', 'l', 'ar', 'p'] });
    expect(a.asked).toHaveLength(1);
    const file = JSON.parse(JSON.stringify(await a.my.exportAll()));
    expect(file.kind).toBe('alloflow-packets-my-words');
    expect(file.words.map((x) => x.word)).toEqual(['flarp', 'zib']);
    const b = store();
    file.words.push({ word: '12 bad', sounds: ['x'] }, { word: 'pic', picture: { dataUri: 'data:text/html;base64,PHNjcmlwdD4=' } });
    const done = await b.my.importAll(file);
    expect(done.kept.sort()).toEqual(['flarp', 'zib']);
    expect(done.refused.length).toBe(2);
    expect((await b.my.get('zib')).sounds.sounds).toEqual(['z', 'i', 'b']);
    await expect(b.my.importAll({ kind: 'something else', words: [] })).rejects.toThrow('This is not a My words file.');
  });
});
