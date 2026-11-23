import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

// Packets, 2026-11-17 (owner-approved that day): "Hear the directions" on the Get ready screen of the two checks for
// the youngest students (Quantity Discrimination, Missing Number).
//   - packets_check_directions.js holds one recording for each line a Get ready screen of the two can show: the
//     screen's own words, a machine voice (Kokoro-82M), made ahead of time by dev-tools/build_packets_check_directions.cjs.
//   - packet_check_builder.js puts the three recordings of a check's own lines into the file, only when every line has
//     one (never half a screen), and only for those two checks. The items, the answers and the version do not change.
//   - The file plays them only when the button is pressed; the clock starts at Start, which also stops the voice.
//   - The score says how often the button was pressed (directionsHeard; "directions_heard=" in the CSV, only then).
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const bank = {};
bank.window = bank;
new Function('window', read('psychometric_math_probes.js')).call(bank, bank);
const PC = require('../packet_check_builder.js');
const D = require('../packets_check_directions.js');
const reader = require('../packets_results_reader.js');
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const form = (measure, grade, extra = {}) => PC.lessonFromMathForm({ bank, measure, grade, form: 'A', ...extra });
const LINES = { qd: 'Tap the bigger number.', mn: 'Type the missing number.', one: 'You have 1 minute. Do as many as you can.', two: 'You have 2 minutes. Do as many as you can.',
  none: 'There is no clock. Take your time.', tries: 'You get one try for each one. You cannot go back.' };
const LAST_CHANGED = Date.parse('2026-11-17T15:00:00Z');

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

describe('the recordings (packets_check_directions.js)', () => {
  it('holds one MP3 for each line a Get ready screen of the two checks can show, and says how it was made', () => {
    expect(Object.keys(D.clips).sort()).toEqual(Object.values(LINES).sort());
    for (const [line, uri] of Object.entries(D.clips)) {
      expect(uri, line).toMatch(/^data:audio\/mpeg;base64,[A-Za-z0-9+/]+=*$/);
      const bytes = Buffer.from(uri.split(',')[1], 'base64');
      // An MP3 frame (or an ID3 tag) at the start, and a length that fits its words: about 8 KB for each second.
      expect(bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0 || bytes.slice(0, 3).toString() === 'ID3', line).toBe(true);
      expect(D.ms[line], line).toBeGreaterThan(Math.max(1000, line.length * 30));
      expect(D.ms[line], line).toBeLessThan(6000);
      expect(bytes.length / (D.ms[line] / 1000) / 1024, line).toBeGreaterThan(6);
      expect(bytes.length / (D.ms[line] / 1000) / 1024, line).toBeLessThan(10);
    }
    expect(D.voice).toBe('Kokoro-82M text-to-speech (voice af_heart), a machine voice');
    expect(D.humanReviewed).toBe(false);
    expect(D.made).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is what the tool says the screens need, and its copies match', () => {
    const check = spawnSync(process.execPath, ['dev-tools/build_packets_check_directions.cjs', '--check'], { encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
    const lines = spawnSync(process.execPath, ['dev-tools/build_packets_check_directions.cjs', '--lines'], { encoding: 'utf8' });
    expect(lines.stdout.trim().split(/\r?\n/).sort()).toEqual(Object.values(LINES).sort());
    for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const file = mirror + '/packets_check_directions.js';
      if (existsSync(file)) expect(read(file) === read('packets_check_directions.js'), file).toBe(true);
    }
    // The tool writes no words of its own: they come from the file's labels.
    const tool = read('dev-tools/build_packets_check_directions.cjs');
    for (const line of Object.values(LINES)) expect(tool, line).not.toContain(line);
  });
});

describe('the builder', () => {
  it('gives a check for the youngest students the recordings of its own three lines, in the order of the screen', () => {
    for (const [measure, grade, extra, lines] of [
      ['quantity_discrimination', 'K', {}, [LINES.qd, LINES.one, LINES.tries]],
      ['missing_number', '1', {}, [LINES.mn, LINES.two, LINES.tries]],
      ['quantity_discrimination', 'K', { untimed: true }, [LINES.qd, LINES.none, LINES.tries]]]) {
      const made = PC.buildCheckPacket({ lesson: form(measure, grade, extra), loader: TH, directions: D });
      expect(made.spoken, measure).toEqual(lines);
      const lesson = lessonOf(made.html);
      expect(lesson.directions).toEqual(['directions-1', 'directions-2', 'directions-3']);
      expect(lesson.directions.map((id) => lesson.audio[id])).toEqual(lines.map((line) => D.clips[line]));
      expect(Object.keys(lesson.audio)).toHaveLength(3);
      // What the file says about itself.
      expect(made.manifest.speech).toEqual({ engine: 'none', note: 'The file plays recordings of its directions, only when Hear the directions is pressed. It does not use the voice of the device and makes no speech.',
        recordings: { directions: 3, made: 'ahead of time, with Kokoro-82M text-to-speech (voice af_heart), a machine voice', humanReviewed: false } });
      expect(made.manifest.attributions).toContain('Recordings of the directions: made ahead of time with Kokoro-82M text-to-speech (voice af_heart), a machine voice. No person has listened to each one.');
      expect(made.html).toContain('The voice that reads the directions is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.');
      // Still a file that can reach nothing: no address, no request, no speech engine.
      const script = [...new JSDOM(made.html).window.document.querySelectorAll('script')].find((node) => !node.type).textContent;
      expect(script).not.toMatch(/https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|speechSynthesis|getUserMedia/);
      // Re-pinned 2026-11-22 (Show my teacher) from 305000: Waves 1-6 + deskside conferencing fold & coded check focus box (~316.5 KB).
      expect(Buffer.byteLength(made.html, 'utf8')).toBeLessThan(322000);
    }
  });

  it('changes nothing else: the items, the scrambled answers, the lock and the version are the same with and without', () => {
    const lesson = form('quantity_discrimination', 'K');
    const plain = PC.buildCheckPacket({ lesson, loader: TH, teacherCode: 'tulip-47' });
    const spoken = PC.buildCheckPacket({ lesson, loader: TH, teacherCode: 'tulip-47', directions: D });
    const a = lessonOf(plain.html), b = lessonOf(spoken.html);
    expect([b.lessonId, b.revision, b.title, b.form, b.timeLimitS]).toEqual([a.lessonId, a.revision, a.title, a.form, a.timeLimitS]);
    expect(b.blocks).toEqual(a.blocks);
    expect(b.check).toEqual(a.check);
    expect([a.audio, a.directions]).toEqual([{}, undefined]);
    // Left out, or given as nothing, the file is the file of before, byte for byte.
    expect(PC.buildCheckPacket({ lesson, loader: TH, teacherCode: 'tulip-47', directions: null }).html).toBe(plain.html);
    expect(plain.spoken).toBe(null);
    expect(plain.manifest.speech).toBeUndefined();
  });

  it('gives none to the other checks, and none when a line has no recording of exactly its words', () => {
    const none = (input) => { const made = PC.buildCheckPacket({ loader: TH, directions: D, ...input }); expect(made.spoken).toBe(null); expect(lessonOf(made.html).directions).toBeUndefined(); expect(lessonOf(made.html).audio).toEqual({}); };
    none({ lesson: form('math_computation', '2') });
    none({ lesson: PC.lessonFromMathProblems({ problems: PC.parseProblems('7+8, 6x4'), timeLimitS: 60 }) });
    // Other words on the screen (a translation): the English recording would not say what the screen says.
    none({ lesson: form('quantity_discrimination', 'K'), labels: { check_ready_one_try: 'Tienes un intento para cada una. No puedes volver.' } });
    // A bank with a line missing, with a line that is not a sound held in the file, or with none: never half a screen.
    const lesson = form('missing_number', '1');
    const without = (line, value) => { const clips = { ...D.clips }; if (value === undefined) delete clips[line]; else clips[line] = value; return { ...D, clips }; };
    for (const bad of [without(LINES.two), without(LINES.tries, 'https://example.org/voice.mp3'), without(LINES.mn, 'data:text/html;base64,PGI+'), { voice: 'x' }, {}, 'yes']) {
      const made = PC.buildCheckPacket({ lesson, loader: TH, directions: bad });
      expect(made.spoken).toBe(null);
      expect(lessonOf(made.html).audio).toEqual({});
    }
    expect(PC.readyTimeLine(TH.CHECK_LABELS, 60)).toBe(LINES.one);
    expect(PC.readyTimeLine(TH.CHECK_LABELS, 120)).toBe(LINES.two);
    expect(PC.readyTimeLine(TH.CHECK_LABELS, 90)).toBe('You have 90 seconds. Do as many as you can.');
    expect(PC.readyTimeLine(TH.CHECK_LABELS, null)).toBe(LINES.none);
  });

  it('falls back to duration-agnostic spoken directions for non-preset custom timers while keeping translation and bank guards', async () => {
    for (const [measure, grade, seconds, taskLine] of [
      ['quantity_discrimination', 'K', 90, LINES.qd],
      ['missing_number', '1', 180, LINES.mn],
    ]) {
      const lesson = { ...form(measure, grade), timeLimitS: seconds };
      const made = PC.buildCheckPacket({ lesson, loader: TH, directions: D });
      expect(made.spoken, measure + ':' + seconds).toEqual([taskLine, LINES.tries]);
      const built = lessonOf(made.html);
      expect(built.directions).toEqual(['directions-1', 'directions-2']);
      expect(built.directions.map((id) => built.audio[id])).toEqual([D.clips[taskLine], D.clips[LINES.tries]]);
      expect(made.manifest.speech.recordings.directions).toBe(2);
    }
    // Plays cleanly on the Get ready screen without speaking a wrong time limit.
    const custom = PC.buildCheckPacket({ lesson: { ...form('quantity_discrimination', 'K'), timeLimitS: 90 }, loader: TH, directions: D });
    const t = open(custom.html);
    expect(t.toReady()).toBe('Get ready');
    expect(t.q('[data-check-hear]')).not.toBe(null);
    t.q('[data-check-hear]').click();
    await t.settle();
    expect(t.sound.filter((s) => s.ev === 'play').map((s) => s.src)).toEqual([D.clips[LINES.qd], D.clips[LINES.tries]]);
    // Translated labels on a custom timer still auto-omit spoken directions.
    for (const labels of [
      { check_ready_timed: 'Tienes {time}. Haz todos los que puedas.' },
      { check_seconds: '{n} segundos' },
      { check_ready_one_try: 'Tienes un intento para cada una.' },
      { quantity_discrimination_directions: 'Toca el número mayor.' },
    ]) {
      const translated = PC.buildCheckPacket({ lesson: { ...form('quantity_discrimination', 'K'), timeLimitS: 90 }, loader: TH, directions: D, labels });
      expect(translated.spoken).toBe(null);
      expect(lessonOf(translated.html).directions).toBeUndefined();
    }
    // A malformed URI supplied for the custom time line is refused rather than silently skipped.
    const customLine = PC.readyTimeLine(TH.CHECK_LABELS, 90);
    const badBank = { ...D, clips: { ...D.clips, [customLine]: 'https://example.org/90s.mp3' } };
    expect(PC.buildCheckPacket({ lesson: { ...form('quantity_discrimination', 'K'), timeLimitS: 90 }, loader: TH, directions: badBank }).spoken).toBe(null);
    // If a bank carries a valid verbatim clip for that custom time, all 3 lines are included.
    const fullBank = { ...D, clips: { ...D.clips, [customLine]: D.clips[LINES.one] } };
    const withThree = PC.buildCheckPacket({ lesson: { ...form('quantity_discrimination', 'K'), timeLimitS: 90 }, loader: TH, directions: fullBank });
    expect(withThree.spoken).toEqual([LINES.qd, customLine, LINES.tries]);
    expect(lessonOf(withThree.html).directions).toEqual(['directions-1', 'directions-2', 'directions-3']);
  });
});

// A built check, opened in jsdom with a clock the test moves and a player that records what it is asked to play.
function open(html) {
  const saved = [], sound = [];
  let clock = 0;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/check.html', beforeParse(w) {
    const wall = Date.parse('2026-11-17T15:00:00Z');
    Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
    w.Date.now = () => wall + clock;
    w.Audio = class {
      play() { sound.push({ ev: 'play', src: this.src }); Promise.resolve().then(() => { if (this.onended) this.onended(); }); return Promise.resolve(); }
      pause() { sound.push({ ev: 'pause' }); }
    };
    w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const q = (selector) => d.querySelector(selector);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const t = {
    w, d, q, saved, sound, seen,
    tick: (ms) => { clock += ms; },
    settle: () => new Promise((resolve) => setTimeout(resolve, 20)),
    heading: () => q('#app h2').textContent,
    // From the first screen through the practice questions to Get ready.
    toReady: () => {
      d.getElementById('learner-name').value = 'BlueHeron7';
      for (let i = 0; i < 10 && !seen(q('[data-check-begin]')); i++) {
        t.tick(400);
        const next = q('[data-practice-next]'), choice = q('#app [data-choice]'), pad = q('#app [data-key]');
        if (seen(next)) next.click();
        else if (seen(choice)) choice.click();
        else if (seen(pad)) { q('#app [data-key="1"]').click(); q('#app [data-key="next"]').click(); }
        else [...d.querySelectorAll('#app button.primary')].filter(seen)[0].click();
      }
      return t.heading();
    },
    card: () => q('[data-check-begin]').closest('.card'),
    endEarly: () => { t.tick(400); q('[data-stop]').click(); q('[data-stop-yes]').click(); },
    csv: () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; },
    json: () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); },
  };
  return t;
}

describe('the Get ready screen of a check that carries its directions', () => {
  const spoken = () => PC.buildCheckPacket({ lesson: form('quantity_discrimination', 'K'), loader: TH, directions: D }).html;

  it('has a Hear the directions button before Start, and tells the adult about it', () => {
    const t = open(spoken());
    expect(t.toReady()).toBe('Get ready');
    const hear = t.q('[data-check-hear]'), begin = t.q('[data-check-begin]');
    expect([hear.textContent, hear.tagName, hear.className, begin.textContent, begin.className]).toEqual(['Hear the directions', 'BUTTON', '', 'Start', 'primary']);
    expect(hear.compareDocumentPosition(begin) & t.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...t.card().querySelectorAll('p')].map((p) => p.textContent)).toEqual([LINES.qd, LINES.one, LINES.tries,
      'For a young student: press Hear the directions, or a grown-up reads this page aloud, before the student presses Start.']);
    // Nothing plays by itself.
    expect(t.sound).toEqual([]);
  });

  it('plays the three lines in order when pressed, and the clock does not start', async () => {
    const t = open(spoken());
    t.toReady();
    t.q('[data-check-hear]').click();
    await t.settle();
    expect(t.sound.filter((s) => s.ev === 'play').map((s) => s.src)).toEqual([D.clips[LINES.qd], D.clips[LINES.one], D.clips[LINES.tries]]);
    expect(t.heading()).toBe('Get ready');
    expect(t.d.querySelector('[data-sound-failed]')).toBe(null);
  });

  it('Start stops the voice; the score, the teacher screen and both results files say how often it was pressed', async () => {
    const t = open(spoken());
    t.toReady();
    t.q('[data-check-hear]').click();
    await t.settle();
    t.q('[data-check-hear]').click();
    t.sound.length = 0;
    t.q('[data-check-begin]').click();
    expect(t.sound[0]).toEqual({ ev: 'pause' });
    expect(t.heading()).toMatch(/^Question 1 of \d+$/);
    await t.settle();
    // No line of the directions goes on playing into the check.
    expect(t.sound.filter((s) => s.ev === 'play')).toEqual([]);
    t.tick(400); t.q('#app [data-choice]').click();
    t.endEarly();
    const file = t.json();
    expect(file.score.directionsHeard).toBe(2);
    const csv = t.csv();
    const score = csv.body.split('\r\n').find((line) => line.startsWith('"#score"'));
    expect(score.endsWith(',"directions_heard=2"')).toBe(true);
    for (const got of [await reader.read(csv.body, { name: csv.name, lastModified: LAST_CHANGED }), await reader.read(JSON.stringify(file), { name: csv.name.replace(/\.csv$/, '.json'), lastModified: LAST_CHANGED })]) {
      expect(got.ok).toBe(true);
      expect(got.sessions[0].score.directionsHeard).toBe(2);
      expect(got.sessions[0].integrity).toBe('ok');
    }
    // The app's own reader of a returned file keeps it too.
    expect(TH.parseResult(JSON.stringify(file)).result.score.directionsHeard).toBe(2);
    t.q('[data-teacher-open]').click();
    expect(t.d.querySelector('[data-review]').textContent).toContain('Times Hear the directions was pressed: 2.');
  });

  it('a check without the recordings is as it was: no button, the old note, and nothing about directions in its results', () => {
    const t = open(PC.buildCheckPacket({ lesson: form('quantity_discrimination', 'K'), loader: TH }).html);
    expect(t.toReady()).toBe('Get ready');
    expect(t.q('[data-check-hear]')).toBe(null);
    expect(t.q('[data-check-adult]').textContent).toBe('For a young student: a grown-up reads this page aloud before the student presses Begin.');
    t.q('[data-check-begin]').click();
    t.tick(400); t.q('#app [data-choice]').click();
    t.endEarly();
    expect(t.json().score.directionsHeard).toBeUndefined();
    expect(t.csv().body).not.toContain('directions_heard');
    // A file that names a recording it does not hold has no button either.
    const lesson = form('quantity_discrimination', 'K');
    const html = PC.buildCheckPacket({ lesson, loader: TH, directions: D }).html.replace('"directions":["directions-1","directions-2","directions-3"]', '"directions":["directions-1","directions-2","directions-9"]');
    expect(html).toContain('directions-9');
    const broken = open(html);
    broken.toReady();
    expect(broken.q('[data-check-hear]')).toBe(null);
  });
});

describe('the pages', () => {
  it('the check maker loads the recordings and hands them to the builder; the pages say what a check now carries', () => {
    const page = read('packets-check.html');
    expect(page).toContain('<script src="packets_check_directions.js" defer></script>');
    expect(read('packets-check.js')).toContain('directions: window.AlloPacketCheckDirections || null');
    expect(page).toContain('About 200 KB. Quantity Discrimination and Missing Number, the two for the youngest students, are about 295 KB: each carries a recording of its directions in a computer voice, which plays only when the student presses Hear the directions.');
    expect(page).not.toContain('A check file has no sound');
    expect(read('packets-it.html')).toContain('holds a recording of its directions, made ahead of time with the same computer voice and stored on this site with the page; it plays only when the student presses Hear the directions, and the results say how often that was.');
    const doc = read('docs/packets-file-formats.md');
    for (const key of ['`directions`', '`directionsHeard`', '`directions_heard=`']) expect(doc, key).toContain(key);
  });

  it('Add up results notes a check whose directions were heard', () => {
    const source = read('packets-results.js');
    expect(source).toContain("'pressed Hear the directions before starting' + (s.score.directionsHeard > 1 ? ' (' + count(s.score.directionsHeard, 'time') + ')' : '')");
  });
});
