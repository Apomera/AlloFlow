// @vitest-environment jsdom
// Take-home Word Sounds files: one self-contained HTML activity built from a
// prepared lesson, graded with the same function the app uses, carrying only
// an allowlist of the pack, optionally sending results to the teacher's own
// Class Mailbox. Real-browser runs (offline play, and send against the real
// Code.gs): C:\tmp\mini_app_find_sounds\e2e_find_sounds.cjs and
// C:\tmp\mini_app_all\tests\e2e_mailbox_send.cjs.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const moduleSource = readFileSync('word_sounds_module.js', 'utf8');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
const loadLoader = () => { delete window.AlloWordSoundsTakeHome; new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))(); return window.AlloWordSoundsTakeHome; };
const TH = loadLoader();

// Smallest audio the core's header checks accept.
const wav = (tag) => {
  const bytes = Buffer.alloc(64);
  bytes.write('RIFF'); bytes.write('WAVE', 8); bytes.write(String(tag).slice(0, 8), 44);
  return bytes.toString('base64');
};
const asset = (tag) => ({ mime: 'audio/wav', base64: wav(tag) });
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), s: uri('s'), p: uri('p'), d: uri('d'), o: uri('o'), g: uri('g') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options, extra = {}) => ({
  word: w, targetWord: w, term: w, _ttsAssets: { [w]: asset(w) },
  activityItems: { isolation: { position, correctSound: correct, options } }, ...extra,
});
const PACK = () => [
  word('cat', 0, 'k', ['k', 'a', 't', 'm']),
  word('map', 2, 'p', ['m', 'a', 'p', 's']),
  word('dog', 1, 'o', ['d', 'o', 'g', 'zz']),
];
const itemsOf = (lesson) => lesson.blocks.flatMap((b) => b.items);
const MAILBOX = { url: 'https://script.google.com/macros/s/AKfycbTEST/exec', packId: 'PK-12345678-1234-4234-9234-123456789abc', secret: 'k_secret_take_home_1', expiresAt: '2027-01-01T00:00:00.000Z' };

describe('one grading rule for the app and the take-home file', () => {
  it('treats alternate spellings of one sound as the same answer, both ways', () => {
    for (const [a, b] of [['ck', 'k'], ['k', 'ck'], ['oy', 'oi'], ['au', 'aw'], ['ph', 'f'], ['ir', 'ur'], ['K ', 'k']]) expect(core.soundAnswerMatches(a, b)).toBe(true);
    for (const [a, b] of [['k', 't'], ['a', 'e'], ['', 'k'], ['k', '']]) expect(core.soundAnswerMatches(a, b)).toBe(false);
  });

  it('is what the app grades with, with no copy of the old table left behind', () => {
    expect(moduleSource).toContain('WS_CORE.soundAnswerMatches(safeAnswer, safeExpected)');
    expect(moduleSource).not.toMatch(/const ANSWER_EQUIV/);
  });

  it('can be embedded verbatim: it uses nothing outside itself', () => {
    const copy = new Function('return (' + core.soundAnswerMatches.toString() + ');')();
    expect(copy('ck', 'k')).toBe(true);
    expect(copy('k', 't')).toBe(false);
  });

  it('finds sound recordings with the same tables the player uses', () => {
    const literal = (name) => {
      const at = moduleSource.indexOf('const ' + name + ' = {');
      const end = moduleSource.indexOf('};', at);
      if (at < 0 || end < 0) throw new Error('missing ' + name);
      return new Function('return ' + moduleSource.slice(at + ('const ' + name + ' = ').length, end + 1).replace(/\/\/[^\n]*/g, ''))();
    };
    expect(core.PHONEME_BANK_SPECIAL).toEqual(literal('specialMap'));
    expect(core.PHONEME_BANK_MATCHES).toEqual(literal('phonemeMatches'));
    expect(core.phonemeBankCandidates('oo_short')[0]).toBe('oo_short');
    expect(core.phonemeBankCandidates('c')).toContain('k');
  });
});

describe('building the lesson', () => {
  it('copies only what each activity needs', () => {
    const pack = PACK();
    Object.assign(pack[0], { definition: 'TEACHER-NOTE', _instructionalProfile: { note: 'TEACHER-NOTE' }, sessionConfig: { learnerId: 'LEARNER-77' } });
    pack[0].activityItems.blending = { options: ['ZEBRA-ANSWER'], answer: 'ZEBRA-ANSWER' };
    pack[0]._ttsAssets.cat.provenance = { voice: 'PROVENANCE-X' };
    const { lesson } = TH.lessonFromPack(pack, { core, banks: BANKS, title: 'Short a' });
    const json = JSON.stringify(lesson);
    for (const secret of ['TEACHER-NOTE', 'LEARNER-77', 'ZEBRA-ANSWER', 'PROVENANCE-X', 'sessionConfig']) expect(json).not.toContain(secret);
    expect(itemsOf(lesson).map((i) => i.word)).toEqual(['cat', 'map']);
  });

  it('leaves out, and names, any word that would play wrong or silent', () => {
    const pack = [...PACK(), word('sun', 0, 's', ['s', 'u']), { word: 'pig', targetWord: 'pig', _ttsAssets: { pig: asset('pig') } }];
    delete pack[1]._ttsAssets.map;
    const built = TH.lessonFromPack(pack, { core, banks: BANKS });
    expect(itemsOf(built.lesson).map((i) => i.word)).toEqual(['cat']);
    expect(built.exceptions).toEqual([
      { activity: 'isolation', word: 'map', missing: ['word'] },
      { activity: 'isolation', word: 'dog', missing: ['/zz/'] },
      { activity: 'isolation', word: 'sun', missing: ['/u/'] },
      { activity: 'isolation', word: 'pig', missing: ['board'] },
    ]);
    expect(built.perActivity).toEqual([{ activity: 'isolation', title: 'Find Sounds', ready: 1, exceptions: built.exceptions }]);
  });

  it('uses the prepared question when the shared recording is missing', () => {
    const pack = PACK();
    pack[0]._ttsAssets['what is the 1st sound?'] = asset('prompt');
    const built = TH.lessonFromPack(pack, { core, banks: { ...BANKS, isolation: {} } });
    const item = itemsOf(built.lesson)[0];
    expect(item.word).toBe('cat');
    expect(built.lesson.audio[item.promptAudio]).toContain(wav('prompt'));
  });

  it('stores each recording once and keeps the same revision for the same content', () => {
    const a = TH.lessonFromPack(PACK(), { core, banks: BANKS, lessonId: 'L1' });
    const b = TH.lessonFromPack(PACK(), { core, banks: BANKS, lessonId: 'L1' });
    expect(new Set(Object.values(a.lesson.audio)).size).toBe(Object.keys(a.lesson.audio).length);
    expect(a.lesson.revision).toBe(b.lesson.revision);
    expect(TH.lessonFromPack(PACK(), { core, banks: BANKS, lessonId: 'L1', showLetters: true }).lesson.revision).not.toBe(a.lesson.revision);
  });

  it('ignores unknown activities and runs each chosen one as its own block', () => {
    const adapters = { echo: { id: 'echo', title: 'Echo', labels: {}, prepare: (w, env) => ({ item: { wordAudio: env.wordClip(env.word) } }), render: () => ({}) } };
    const built = TH.lessonFromPack(PACK(), { core, banks: BANKS, activities: ['echo', 'nope', 'isolation'], adapters });
    expect(built.lesson.blocks.map((b) => b.activity)).toEqual(['echo', 'isolation']);
    expect(built.lesson.blocks[0].items.map((i) => i.id)).toEqual(['echo-0', 'echo-1', 'echo-2']);
  });
});

describe('sending back', () => {
  it('keeps a Class Mailbox target, and refuses anything that is not one', () => {
    expect(TH.lessonFromPack(PACK(), { core, banks: BANKS, submit: MAILBOX }).lesson.submit).toMatchObject({ packId: MAILBOX.packId });
    const domain = { ...MAILBOX, url: 'https://script.google.com/a/macros/school.org/s/AKfycbTEST/exec' };
    expect(TH.lessonFromPack(PACK(), { core, banks: BANKS, submit: domain }).lesson.submit).toBeTruthy();
    for (const bad of [{ ...MAILBOX, url: 'https://evil.example/macros/s/x/exec' }, { ...MAILBOX, url: 'http://script.google.com/macros/s/x/exec' }, { ...MAILBOX, packId: 'nope' }]) {
      expect(TH.lessonFromPack(PACK(), { core, banks: BANKS, submit: bad }).lesson.submit).toBeNull();
    }
  });

  it('opens the network only to Apps Script, and only when sending is on', () => {
    const plain = TH.buildHtml(TH.lessonFromPack(PACK(), { core, banks: BANKS }).lesson, { core });
    // Packet phase 1 (2026-11-11): a file with no mailbox now says so outright.
    expect(plain).toContain("connect-src 'none'");
    expect(plain).not.toContain('connect-src h');
    const sending = TH.buildHtml(TH.lessonFromPack(PACK(), { core, banks: BANKS, submit: MAILBOX }).lesson, { core });
    expect(sending).toMatch(/connect-src https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com"/);
  });

  it('the host makes the mailbox pack with the protocol the mailbox accepts', () => {
    expect(hostSource).toContain('window.__alloMailboxTakeHome = {');
    expect(hostSource).toMatch(/a: 'putpack', admin: connection\.admin, id, k: secret, part: 1, of: 1/);
  });
});

describe('the file', () => {
  it('is locked down, embeds the shared grading rule and cannot be broken out of by a title', () => {
    const { lesson } = TH.lessonFromPack(PACK(), { core, banks: BANKS, title: '</script><script>alert(1)</script>' });
    const html = TH.buildHtml(lesson, { core });
    expect(html).toContain("default-src 'none'");
    expect(html).toContain(core.soundAnswerMatches.toString());
    // Two blocks since 2026-11-11: the packet manifest (JSON, never run) and the one script.
    expect(html.match(/<\/script>/gi)).toHaveLength(2);
    expect(html.match(/<script/gi)).toHaveLength(2);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('refuses to build with no ready item', () => {
    expect(() => TH.buildHtml(TH.lessonFromPack([], { core, banks: BANKS }).lesson, { core })).toThrow(/No ready items/);
  });
});

// Real decoding and playback (sound bank WebM -> WAV in Chromium, played
// through the real player): C:\tmp\mini_app_all\tests\e2e_portable_audio.cjs.
describe('sounds that play on every device', () => {
  // A stand-in Web Audio: "decodes" any clip to a 0.2 s ramp at 48 kHz and
  // renders it at the requested rate, so the conversion path runs in jsdom.
  function fakeAudio({ failOn = '' } = {}) {
    const decoded = [];
    class Ctx {
      decodeAudioData(buffer, ok, fail) {
        const text = new TextDecoder().decode(new Uint8Array(buffer));
        decoded.push(text);
        if (failOn && text.includes(failOn)) { const e = new Error('cannot decode'); if (fail) fail(e); return Promise.reject(e); }
        const b = { duration: 0.2, sampleRate: 48000 };
        if (ok) ok(b);
        return Promise.resolve(b);
      }
      close() {}
    }
    class Offline {
      constructor(channels, length, rate) { this.channels = channels; this.length = length; this.rate = rate; this.destination = {}; }
      createBufferSource() { return { connect() {}, start() {} }; }
      startRendering() {
        const data = new Float32Array(this.length).map((_, i) => (i / this.length) * 2 - 1);
        return Promise.resolve({ getChannelData: () => data, sampleRate: this.rate, numberOfChannels: this.channels });
      }
    }
    return { AudioContext: Ctx, OfflineAudioContext: Offline, decoded };
  }
  const lessonWith = (audio) => ({ audio: { ...audio } });
  const header = (uri) => {
    const b = Buffer.from(uri.split(',')[1], 'base64');
    return { riff: b.toString('latin1', 0, 4), wave: b.toString('latin1', 8, 12), channels: b.readUInt16LE(22), rate: b.readUInt32LE(24), bits: b.readUInt16LE(34), samples: b.readUInt32LE(40) / 2 };
  };

  it('turns WebM and other clips into 16-bit mono 22,050 Hz WAV, and leaves WAV and MP3 alone', async () => {
    const wavClip = uri('keep');
    const mp3Clip = 'data:audio/mpeg;base64,' + Buffer.from('ID3mp3').toString('base64');
    const lesson = lessonWith({
      a0: 'data:audio/webm;codecs=opus;base64,' + Buffer.from('webm-one').toString('base64'),
      a1: wavClip,
      a2: mp3Clip,
      a3: 'data:audio/ogg;base64,' + Buffer.from('ogg-two').toString('base64'),
    });
    const fake = fakeAudio();
    const progress = [];
    const report = await TH.portableAudio(lesson, { ...fake, onProgress: (d, n) => progress.push([d, n]) });
    expect(report).toEqual({ converted: 2, kept: 2, failed: [] });
    expect(progress).toEqual([[1, 2], [2, 2]]);
    expect(fake.decoded).toEqual(['webm-one', 'ogg-two']);
    expect(lesson.audio.a1).toBe(wavClip);
    expect(lesson.audio.a2).toBe(mp3Clip);
    for (const id of ['a0', 'a3']) {
      expect(lesson.audio[id]).toMatch(/^data:audio\/wav;base64,/);
      expect(header(lesson.audio[id])).toEqual({ riff: 'RIFF', wave: 'WAVE', channels: 1, rate: 22050, bits: 16, samples: Math.ceil(0.2 * 22050) });
    }
  });

  it('keeps a clip it cannot decode, and says which, instead of dropping the sound', async () => {
    const bad = 'data:audio/webm;base64,' + Buffer.from('broken').toString('base64');
    const lesson = lessonWith({ a0: bad, a1: 'data:audio/webm;base64,' + Buffer.from('fine').toString('base64') });
    const report = await TH.portableAudio(lesson, fakeAudio({ failOn: 'broken' }));
    expect(report).toEqual({ converted: 1, kept: 0, failed: ['a0'] });
    expect(lesson.audio.a0).toBe(bad);
    expect(lesson.audio.a1).toMatch(/^data:audio\/wav;/);
    const none = lessonWith({ a0: bad });
    expect(await TH.portableAudio(none, { AudioContext: null, OfflineAudioContext: null })).toEqual({ converted: 0, kept: 0, failed: ['a0'] });
    expect(none.audio.a0).toBe(bad);
  });

  it('the teacher dialog converts before building, and names clips it could not convert', () => {
    const at = moduleSource.indexOf('lib.portableAudio(built.lesson)');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(moduleSource.indexOf('lib.buildHtml(built.lesson'));
    expect(moduleSource).toContain('word_sounds.take_home_audio_not_converted');
  });
});

describe('returned results', () => {
  const result = (extra = {}) => JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 2, lessonId: 'L1', learnerName: 'Ana', finishedAt: 'x',
    activityTitles: { isolation: 'Find Sounds' },
    items: [{ activity: 'isolation', word: 'cat', attempts: 1, firstTry: true, correct: true, done: true }, { activity: 'isolation', word: 'map', attempts: 2, correct: true, done: true },
      { activity: 'blending', word: 'dog', attempts: 2, done: true }, { activity: 'blending', word: 'sun' }], ...extra });

  it('summarizes first tries, retries, misses and unfinished items, overall and per activity', () => {
    const parsed = TH.parseResult(result());
    expect(parsed.ok).toBe(true);
    // practised: Letter Trace practice, counted apart and never scored (2026-11-07).
    expect(parsed.result.summary).toEqual({ items: 4, done: 3, firstTry: 1, afterRetry: 1, missed: 1, practised: 0 });
    expect(parsed.result.byActivity.isolation).toEqual({ items: 2, done: 2, firstTry: 1, afterRetry: 1, missed: 0, practised: 0 });
    // A title missing from the file falls back to the built-in activity's name.
    expect(parsed.result.activityTitles).toEqual({ isolation: 'Find Sounds', blending: 'Blend Sounds' });
    expect(TH.parseResult(result({ items: [{ activity: 'no_such', word: 'x' }] })).result.activityTitles).toEqual({ no_such: 'no_such' });
  });

  it('reads the mailbox copy and first-release Find Sounds files', () => {
    expect(TH.parseResult({ kind: 'alloflow-take-home-submission', takeHomeResult: JSON.parse(result()) }).ok).toBe(true);
    const v1 = TH.parseResult(JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 1, lessonId: 'L0', items: [{ word: 'cat', done: true, correct: true, firstTry: true }] }));
    expect(v1.result.items[0].activity).toBe('isolation');
  });

  it('rejects anything that is not a results file', () => {
    expect(TH.parseResult('nope').error).toBe('not_json');
    expect(TH.parseResult('{"kind":"other"}').error).toBe('not_a_result');
    expect(TH.parseResult(result({ schemaVersion: 9 })).error).toBe('unsupported_version');
    expect(TH.parseResult(result({ items: null })).error).toBe('incomplete');
  });

  it('caps what a hand-edited file can put on the teacher screen', () => {
    const parsed = TH.parseResult(result({ learnerName: 'x'.repeat(500), items: Array.from({ length: 999 }, () => ({ word: 'w'.repeat(500), attempts: 1e9 })) }));
    expect(parsed.result.learnerName).toHaveLength(60);
    expect(parsed.result.items).toHaveLength(200);
    expect(parsed.result.items[0].word).toHaveLength(60);
    expect(parsed.result.items[0].attempts).toBe(9);
  });
});

describe('the teacher dialog in Word Sounds', () => {
  let WordSoundsModal, root = null, host = null;
  beforeAll(() => { ({ WordSoundsModal } = setupWordSounds()); });
  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    root = null; host = null;
    delete window.__ALLO_ISOLATION_AUDIO; delete window.__ALLO_PHONEME_AUDIO_BANK; delete window.__ALLO_INSTRUCTION_AUDIO; delete window.__alloMailboxTakeHome;
    vi.restoreAllMocks();
  });
  const flush = async (ms = 0) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
  const mount = (props) => {
    window.__ALLO_ISOLATION_AUDIO = BANKS.isolation;
    window.__ALLO_PHONEME_AUDIO_BANK = BANKS.phonemes;
    window.__ALLO_INSTRUCTION_AUDIO = BANKS.instructions;
    loadLoader();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('isolation'), {
      isTeacherMode: true, isProbeMode: false, wsPreloadedWords: PACK(), wordSoundsLanguage: 'en',
    }, props))));
  };
  const openButton = () => host.querySelector('[data-ws-take-home-open]');
  const captureDownloads = () => {
    const blobs = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:x'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return blobs;
  };
  const openDialog = async () => {
    await act(async () => { openButton().click(); });
    await flush(50);
    return host.querySelector('[data-ws-take-home-dialog]');
  };
  const download = async (dialog) => {
    const button = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Download the file');
    await act(async () => { button.click(); });
    await flush(50);
  };

  it('appears for a teacher with an English lesson only', () => {
    mount({});
    expect(openButton()).toBeTruthy();
    for (const props of [{ isTeacherMode: false }, { isProbeMode: true }, { wordSoundsLanguage: 'es' }]) {
      act(() => root.unmount()); host.remove();
      mount(props);
      expect(openButton()).toBeNull();
    }
  });

  it('says what is ready per activity, downloads the file and reads returned work', async () => {
    mount({});
    const dialog = await openDialog();
    expect(dialog.querySelector('[data-ws-take-home-activity="isolation"]').checked).toBe(true);
    expect(dialog.textContent).toContain('(2 of 3 ready)');
    expect(dialog.textContent).toMatch(/dog: no recording of \/zz\//);
    expect(dialog.textContent).toContain('connect a Class Mailbox first');
    const blobs = captureDownloads();
    await download(dialog);
    expect(blobs).toHaveLength(1);
    const html = await blobs[0].text();
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('"word":"cat"');
    expect(html).not.toContain('"word":"dog"');
    expect(html).toContain("connect-src 'none'");
    expect(dialog.textContent).toMatch(/Downloaded word-sounds-.*\.html/);
    // The teacher sees the size, and no "too big" warning for a small file.
    const shown = Number((/The file is ([\d.]+) MB\./.exec(dialog.textContent) || [])[1]);
    expect(shown).toBeCloseTo(Math.max(0.1, blobs[0].size / 1048576), 1);
    expect(dialog.textContent).not.toContain('too big to email');

    const input = dialog.querySelector('#ws-take-home-files');
    const good = new File([JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 2, lessonId: 'other', lessonTitle: 'Other', learnerName: 'Ana', finishedAt: 't',
      activityTitles: { isolation: 'Find Sounds' },
      items: [{ activity: 'isolation', word: 'cat', attempts: 1, firstTry: true, correct: true, done: true }, { activity: 'isolation', word: 'map', attempts: 2, done: true }] })], 'ana.json', { type: 'application/json' });
    const bad = new File(['not json'], 'notes.txt');
    // Packet files (schemaVersion 3) carry an integrity value: one that matches says nothing, one that does not is noted, and both are read.
    const v3 = (name, edit) => {
      const file = { kind: 'alloflow-take-home-result', schemaVersion: 3, lessonId: 'other', lessonTitle: 'Other', learnerName: name, learner: name, finishedAt: 't-' + name, sessionId: 's-' + name,
        packet: { id: 'other', version: 'r1', form: '', mode: 'practice' }, items: [{ n: 1, activity: 'isolation', word: 'cat', attempts: 2, firstTry: false, correct: true, done: true, responses: ['a', 'k'], ms: 900 }] };
      file.integrity = { method: 'sha256', value: TH.sha256(TH.resultsCsv(file).basis).hex };
      if (edit) file.items[0].firstTry = true;
      return new File([JSON.stringify(file)], name + '.json', { type: 'application/json' });
    };
    Object.defineProperty(input, 'files', { configurable: true, value: [good, bad, v3('Ben', false), v3('Cy', true)] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush(50);
    const table = dialog.querySelector('[data-ws-take-home-results]');
    const notes = [...table.querySelectorAll('[data-ws-take-home-edited]')];
    expect(notes.map((n) => n.textContent)).toEqual(['Edited after saving']);
    expect(notes[0].closest('tr').textContent).toContain('Cy');
    expect(table.textContent).toContain('Ben');
    expect(table.textContent).toContain('Ana');
    expect(table.textContent).toContain('1 / 2');
    expect(table.textContent).toContain('Find Sounds: cat');
    expect(dialog.textContent).toContain('notes.txt is not a Word Sounds results file.');
  });

  it('with a Class Mailbox connected, makes a send target at download and puts it in the file', async () => {
    const target = vi.fn(async () => MAILBOX);
    window.__alloMailboxTakeHome = { connected: true, target, openSetup: vi.fn() };
    mount({});
    const dialog = await openDialog();
    expect(dialog.querySelector('[data-ws-take-home-send]').checked).toBe(true);
    expect(target).not.toHaveBeenCalled();
    const blobs = captureDownloads();
    await download(dialog);
    expect(target).toHaveBeenCalledOnce();
    const html = await blobs[0].text();
    expect(html).toContain(MAILBOX.packId);
    expect(html).toContain('connect-src https://script.google.com');
    expect(dialog.textContent).toContain('Get submissions from Class Mailbox');
  });

  it('makes no file when the mailbox does not answer, and none is needed when sending is off', async () => {
    window.__alloMailboxTakeHome = { connected: true, target: vi.fn(async () => { throw new Error('offline'); }), openSetup: vi.fn() };
    mount({});
    const dialog = await openDialog();
    const blobs = captureDownloads();
    await download(dialog);
    expect(blobs).toHaveLength(0);
    expect(dialog.textContent).toContain('did not answer');
    await act(async () => { dialog.querySelector('[data-ws-take-home-send]').click(); });
    await download(dialog);
    expect(blobs).toHaveLength(1);
    expect(await blobs[0].text()).toContain("connect-src 'none'");
  });
});
