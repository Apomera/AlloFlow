// @vitest-environment jsdom
// HTML packets, phase 1 (2026-11-11): the Word Sounds take-home file as a packet a district can audit, whose
// results go straight into a spreadsheet. Format: C:\tmp\packets_build_1111\SPEC.md. Run on REAL built files in jsdom.
// Real Chromium (the hashed script runs from file:// under the file's own CSP, a one-character edit to the script
// stops it, no request leaves): C:\tmp\packets_build_1111\packet\browser_check.cjs.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;

const HEADER = '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag"';
const LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
  activityItems: { isolation: { position, correctSound: correct, options } } });
const PACK = () => [word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])];
let seq = 0;
const MAILBOX = { url: 'https://script.google.com/macros/s/AKfycbTEST/exec', packId: 'PK-12345678-1234-4234-9234-123456789abc', secret: 'k', expiresAt: '2099-01-01T00:00:00.000Z' };
const build = ({ labels, submit, title = 'Short a' } = {}) => TH.buildHtml(TH.lessonFromPack(PACK(), { core, banks: BANKS, title, lessonId: 'L-packet-' + (++seq), submit: submit ? MAILBOX : null }).lesson, { core, labels });

// RFC 4180 reader: every cell quoted, "" for a quote, CRLF between rows.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; } else cell += c;
  }
  return rows;
}

// Opens a built file with its script running. The clock (performance.now) and tab visibility are the test's.
function open({ html = build(), hash = '', storage = null, subtle = false, beforeParse, noDownload = false } = {}) {
  const saved = [];
  const sent = [];
  const clock = { t: 1000, hidden: false };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html' + hash, beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    if (noDownload) delete w.HTMLAnchorElement.prototype.download;
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => clock.t });
    Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => clock.hidden });
    if (subtle) { Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle }); w.TextEncoder = TextEncoder; }
    w.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { json: async () => ({ ok: true, filename: 'ana.json' }) }; };
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
    if (beforeParse) beforeParse(w);
  } });
  const w = dom.window, d = w.document;
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const items = lesson.blocks.flatMap((b) => b.items);
  const pick = (i, right = true) => {
    const at = items[i].choices.findIndex((c) => c.label === items[i].target);
    const n = right ? at : (at === 0 ? 1 : 0);
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: String(n + 1), bubbles: true, cancelable: true }));
  };
  const next = (i) => button(i === items.length - 1 ? 'See my results' : 'Next').click();
  const start = (name) => { if (name != null) d.getElementById('learner-name').value = name; button('Start').click(); };
  const finish = (name = 'Ana') => { start(name); items.forEach((_, i) => { pick(i); next(i); }); };
  const show = (hidden) => { clock.hidden = hidden; d.dispatchEvent(new w.Event('visibilitychange')); };
  const storageDump = () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
  const saveJson = () => { d.querySelector('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  const saveCsv = () => { d.querySelector('[data-save-csv]').click(); return saved[saved.length - 1]; };
  return { html, dom, w, d, saved, sent, clock, button, lesson, items, pick, next, start, finish, show, storageDump, saveJson, saveCsv };
}
const settle = () => new Promise((r) => setTimeout(r, 20));

describe('the spreadsheet table (pure function, shared by the file and the app)', () => {
  const sample = () => ({
    sessionId: 's-1', packet: { id: 'P1', version: 'r1', form: '', mode: 'practice' }, lessonTitle: 'Short a, "set 1"', learner: '=Ana, "Li"',
    startedLocal: '2026-11-12T09:14:05-05:00', finishedLocal: '2026-11-12T09:18:41-05:00', durationMs: 276400, activityTitles: { isolation: 'Find Sounds', letter_tracing: 'Letter Trace' },
    items: [
      { n: 1, itemId: 'isolation-0', activity: 'isolation', word: 'cat', target: 'k', responses: ['a, b', 'say "k"', 'k'], attempts: 3, firstTry: false, correct: true, done: true, ms: 3410.4, supports: { wordReplays: 2, hints: 1 }, flag: '' },
      { n: 2, itemId: 'isolation-1', activity: 'isolation', word: '-ing', target: '+1', responses: ['@x', 'line\nbreak'], attempts: 2, firstTry: false, correct: false, done: true, ms: -5, supports: {}, flag: 'resumed' },
      { n: 3, itemId: 'letter_tracing-0', activity: 'letter_tracing', word: 'a', target: null, responses: ['traced'], attempts: 1, firstTry: false, correct: false, done: true, ms: 900, supports: {}, practice: 'traced' },
    ],
  });

  it('has the exact header, a BOM, CRLF and every cell quoted', () => {
    const table = TH.resultsCsv(sample());
    const text = table.text({ method: 'sha256', value: 'abc' });
    expect(text.charCodeAt(0)).toBe(0xFEFF);
    const lines = text.slice(1).split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines.pop()).toBe('');
    expect(text.slice(1).replace(/\r\n/g, '')).not.toMatch(/\r/);
    for (const line of lines) expect(line).toMatch(/^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/);
    expect(lines).toHaveLength(1 + 3 + 2);
  });

  it('round-trips commas, quotes and line breaks, and guards cells a spreadsheet would run as a formula', () => {
    const table = TH.resultsCsv(sample());
    const rows = parseCsv(table.text({ method: 'fnv1a', value: '0badf00d' }).slice(1));
    const head = rows[0];
    const at = (row, name) => row[head.indexOf(name)];
    expect(rows.every((r, i) => i > 3 || r.length === 24)).toBe(true);
    expect(rows.slice(1, 4).every((r) => r[0] === 'alloflow-packet-result/1' && r[1] === 's-1' && r[2] === 'P1' && r[3] === 'r1')).toBe(true);
    expect(at(rows[1], 'learner')).toBe('\'=Ana, "Li"');
    expect(at(rows[1], 'responses')).toBe('a, b | say "k" | k');
    expect(at(rows[1], 'supports')).toBe('wordReplays:2;hints:1');
    expect([at(rows[1], 'correct'), at(rows[1], 'first_try'), at(rows[1], 'tries'), at(rows[1], 'time_ms'), at(rows[1], 'scored'), at(rows[1], 'duration_s')]).toEqual(['1', '0', '3', '3410', '1', '276']);
    expect([at(rows[2], 'word'), at(rows[2], 'target'), at(rows[2], 'responses'), at(rows[2], 'time_ms'), at(rows[2], 'flag')]).toEqual(["'-ing", "'+1", "'@x | line\nbreak", '0', 'resumed']);
    // Practice (Letter Trace) is in the table, never scored.
    expect([at(rows[3], 'scored'), at(rows[3], 'correct'), at(rows[3], 'activity_title')]).toEqual(['0', '0', 'Letter Trace']);
    // The summary row ends with the title the learner saw, commas and quotes and all.
    expect(rows[4]).toEqual(['#summary', 's-1', 'items_given=2', 'attempted=2', 'correct=1', 'first_try=0', 'accuracy_pct=50', 'title=Short a, "set 1"']);
    expect(rows[5]).toEqual(['#integrity', 'fnv1a', '0badf00d', 'detects accidental edits, not deliberate ones']);
    expect(table.summary).toEqual({ itemsGiven: 2, attempted: 2, correct: 1, firstTry: 0, accuracyPct: 50,
      byActivity: [{ activity: 'isolation', items: 2, correct: 1, firstTry: 0 }, { activity: 'letter_tracing', items: 0, correct: 0, firstTry: 0 }] });
    expect(table.stem).toBe('Short-a-set-1__Ana-Li__2026-11-12');
    expect(TH.resultsCsv({ lessonTitle: '', items: [] }).stem).toBe('packet__results');
  });

  it('carries the title in the summary row, and the integrity value does not cover it', () => {
    const table = TH.resultsCsv(sample());
    const summaryRow = (lessonTitle) => parseCsv(TH.resultsCsv({ ...sample(), lessonTitle }).text({ method: 'fnv1a', value: 'x' }).slice(1))[4];
    // At most 120 characters, on one line. With no title there is no cell: the row is the one saved before 2026-11-11.
    expect(summaryRow('T'.repeat(300))[7]).toBe('title=' + 'T'.repeat(120));
    expect(summaryRow('  Short a,\n set = 2  ')[7]).toBe('title=Short a, set = 2');
    expect(summaryRow('=SUM(A1)')[7]).toBe('title==SUM(A1)');
    expect(summaryRow('')).toEqual(['#summary', 's-1', 'items_given=2', 'attempted=2', 'correct=1', 'first_try=0', 'accuracy_pct=50']);
    expect(summaryRow(undefined)).toHaveLength(7);
    // The same answers under another title, or under none, give the same text to hash: a file saved before the title was added keeps its value.
    expect(table.basis).not.toContain('Short a');
    expect(TH.resultsCsv({ ...sample(), lessonTitle: 'Another title' }).basis).toBe(table.basis);
    expect(TH.resultsCsv({ ...sample(), lessonTitle: '' }).basis).toBe(table.basis);
  });

  it('the text to paste has the same columns, tabs between them, and no trailer rows', () => {
    const lines = TH.resultsCsv(sample()).tsv().split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(HEADER.replace(/"/g, '').replace(/,/g, '\t'));
    expect(lines.every((l) => l.split('\t').length === 24)).toBe(true);
    expect(lines[1].split('\t')[6]).toBe('\'=Ana, "Li"');
    expect(lines[2].split('\t')[17]).toBe("'@x | line break");
    expect(lines.join('\n')).not.toContain('#');
  });

  it('survives a hostile object without touching Object.prototype', () => {
    const table = TH.resultsCsv({ items: [null, 5, { activity: '__proto__', correct: true, supports: 'x' }], packet: 'no', activityTitles: [] });
    expect(table.rows).toHaveLength(3);
    expect({}.items).toBeUndefined();
    expect(TH.resultsCsv(null).rows).toEqual([]);
  });
});

describe('a played session', () => {
  it('records time per item without hidden-tab time, the order, a session id and local times', () => {
    const t = open();
    t.start('Ana');
    t.clock.t += 400;
    t.show(true);
    t.clock.t += 5000;
    t.show(false);
    t.clock.t += 300;
    t.pick(0);
    t.clock.t += 9000; // reading the feedback is not time on the item
    t.next(0);
    t.clock.t += 250;
    t.pick(1, false);
    t.clock.t += 250;
    t.pick(1);
    t.next(1);
    const file = t.saveJson();
    expect(file).toMatchObject({ kind: 'alloflow-take-home-result', schemaVersion: 3, learner: 'Ana', learnerName: 'Ana', timesAreFromTheLearnerDevice: true,
      packet: { id: t.lesson.lessonId, version: t.lesson.revision, engine: 'alloflow-packet/1', form: '', mode: 'practice' } });
    expect(file.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    expect(file.startedLocal).toMatch(LOCAL_ISO);
    expect(file.finishedLocal).toMatch(LOCAL_ISO);
    expect(new Date(file.startedLocal).toISOString().slice(0, 19)).toBe(file.startedAt.slice(0, 19));
    expect(file.durationMs).toBe(Date.parse(file.finishedAt) - Date.parse(file.startedAt));
    expect(file.durationMs).toBeGreaterThanOrEqual(0);
    expect(file.items.map((i) => [i.n, i.ms, i.flag])).toEqual([[1, 700, ''], [2, 500, '']]);
    expect(file.summary).toMatchObject({ itemsGiven: 2, attempted: 2, correct: 2, firstTry: 1, accuracyPct: 100,
      byActivity: [{ activity: 'isolation', items: 2, correct: 2, firstTry: 1 }],
      // The fields older readers use stay.
      items: 2, done: 2, afterRetry: 1, missed: 0, practised: 0 });
    // Nothing internal to the timer travels in the file.
    expect(JSON.stringify(file)).not.toContain('"shown"');
  });

  it('the spreadsheet file of a real session reads back cell for cell, with a hostile learner label', () => {
    const t = open();
    t.finish('=Ana, "B"');
    const blob = t.saveCsv();
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(blob.name).toMatch(/^Short-a__Ana-B__\d{4}-\d{2}-\d{2}\.csv$/);
    expect(t.d.getElementById('app').textContent).toContain('Saved as ' + blob.name + '.');
    expect(blob.body.charCodeAt(0)).toBe(0xFEFF);
    expect(blob.body.slice(1).split('\r\n')[0]).toBe(HEADER);
    const rows = parseCsv(blob.body.slice(1));
    const file = t.saveJson();
    expect(t.saved[t.saved.length - 1].name).toBe(blob.name.replace(/\.csv$/, '.json'));
    expect(blob.name.slice(-14, -4)).toBe(file.finishedLocal.slice(0, 10));
    expect(rows).toHaveLength(1 + 2 + 2);
    rows.slice(1, 3).forEach((row, i) => {
      const item = file.items[i];
      expect(row).toEqual(['alloflow-packet-result/1', file.sessionId, file.packet.id, file.packet.version, '', 'practice', '\'=Ana, "B"', file.startedLocal, file.finishedLocal,
        String(Math.round(file.durationMs / 1000)), String(i + 1), item.itemId, 'isolation', 'Find Sounds', '1', item.word, item.target, item.responses.join(' | '), '1', '1', '1', String(item.ms), '', '']);
      expect(Number(row[21])).toBeGreaterThanOrEqual(0);
    });
    // The title in the summary row is the heading at the top of the file, and the JSON's lessonTitle.
    expect([t.d.querySelector('h1').textContent, file.lessonTitle]).toEqual(['Short a', 'Short a']);
    expect(rows[3]).toEqual(['#summary', file.sessionId, 'items_given=2', 'attempted=2', 'correct=2', 'first_try=2', 'accuracy_pct=100', 'title=Short a']);
    expect(rows[4]).toEqual(['#integrity', file.integrity.method, file.integrity.value, 'detects accidental edits, not deliberate ones']);
    // The value covers exactly the item rows as they sit in the file, after the id line.
    const itemLines = blob.body.slice(1).split('\r\n').slice(1, 3);
    expect(TH.resultsCsv(file).basis).toBe([file.packet.id, file.packet.version, '', file.sessionId].join('|') + '\n' + itemLines.join('\n'));
  });

  it('after a reload, a half-done item counts its time from the resume and is flagged', () => {
    const html = build();
    const a = open({ html });
    a.start('Ana');
    a.clock.t += 600;
    a.pick(0);
    a.next(0);
    a.clock.t += 90000;
    a.pick(1, false);
    const before = JSON.parse(Object.values(a.storageDump())[0]);
    expect(before.items[1]).toMatchObject({ attempts: 1, done: false });
    const b = open({ html, storage: a.storageDump() });
    b.clock.t = 50;
    expect(b.d.getElementById('learner-name').value).toBe('Ana');
    b.button('Continue where I left off').click();
    b.clock.t += 200;
    b.pick(1);
    b.next(1);
    const file = b.saveJson();
    expect(file.sessionId).toBe(before.sessionId);
    expect(file.startedAt).toBe(before.startedAt);
    expect(file.items.map((i) => [i.ms, i.flag, i.attempts])).toEqual([[600, '', 1], [200, 'resumed', 2]]);
    expect(parseCsv(b.saveCsv().body.slice(1))[2][23]).toBe('resumed');
  });

  it('"Copy for a spreadsheet" puts tab-separated rows on the clipboard, or shows them to copy by hand', async () => {
    let copied = null;
    const t = open({ beforeParse(w) { Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { copied = text; } } }); } });
    t.finish();
    t.button('Copy for a spreadsheet').click();
    await settle();
    expect(copied.split('\n')).toHaveLength(3);
    expect(copied.split('\n')[0].split('\t')).toHaveLength(24);
    expect(copied).not.toContain('#integrity');
    expect(t.d.getElementById('app').textContent).toContain('Copied. Now paste it into a spreadsheet.');
    const plain = open();
    plain.finish();
    plain.button('Copy for a spreadsheet').click();
    const box = plain.d.querySelector('[data-results-text]');
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('Copy all of this text and paste it into a spreadsheet.');
    expect(plain.d.getElementById('results-text').value.split('\n')[1].split('\t')[0]).toBe('alloflow-packet-result/1');
  });

  it('a browser that cannot download shows the spreadsheet file as text to copy', () => {
    const t = open({ noDownload: true });
    t.finish();
    t.button('Save results as a spreadsheet file (CSV)').click();
    expect(t.saved).toEqual([]);
    expect(t.d.querySelector('[data-results-text]').hidden).toBe(false);
    // No BOM in text meant to be copied; a text box turns the line ends into \n, which a spreadsheet reads the same.
    const lines = t.d.getElementById('results-text').value.split('\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[4]).toMatch(/^"#integrity","fnv1a","[0-9a-f]{8}",/);
  });
});

describe('the integrity value', () => {
  it('is SHA-256 where the browser can make it, and FNV-1a (labelled) where it cannot', async () => {
    const plain = open();
    plain.finish();
    await settle();
    const weak = plain.saveJson();
    expect(weak.integrity).toMatchObject({ method: 'fnv1a', note: 'detects accidental edits, not deliberate ones' });
    expect(weak.integrity.value).toMatch(/^[0-9a-f]{8}$/);
    expect(TH.parseResult(weak).integrity).toBe('ok');
    const t = open({ subtle: true });
    t.finish();
    await settle();
    const file = t.saveJson();
    expect(file.integrity.method).toBe('sha256');
    expect(file.integrity.value).toBe(createHash('sha256').update(TH.resultsCsv(file).basis, 'utf8').digest('hex'));
    expect(parseCsv(t.saveCsv().body.slice(1))[4].slice(0, 3)).toEqual(['#integrity', 'sha256', file.integrity.value]);
    expect(JSON.stringify(file)).not.toMatch(/signature/i);
  });

  it('reads ok, then "changed" after a response, a mark or the learner is edited; it never rejects the file', async () => {
    for (const subtle of [true, false]) {
      const t = open({ subtle });
      t.start('Ana'); t.pick(0, false); t.pick(0); t.next(0); t.pick(1); t.next(1);
      await settle();
      const file = t.saveJson();
      const first = TH.parseResult(JSON.stringify(file));
      expect([first.ok, first.integrity, first.result.integrity]).toEqual([true, 'ok', 'ok']);
      expect(first.result).toMatchObject({ sessionId: file.sessionId, finishedLocal: file.finishedLocal, learnerName: 'Ana' });
      // The mailbox copy carries the same value.
      expect(TH.parseResult({ kind: 'alloflow-take-home-submission', takeHomeResult: file }).integrity).toBe('ok');
      const edits = [
        (f) => { f.items[0].responses[0] = f.items[0].responses[1]; },
        (f) => { f.items[0].firstTry = true; },
        (f) => { f.learner = 'Ben'; f.learnerName = 'Ben'; },
        (f) => { f.items[1].ms += 1; },
        (f) => { f.sessionId = 'other'; },
        (f) => { f.integrity.value = 'f'.repeat(f.integrity.value.length); },
      ];
      for (const edit of edits) {
        const copy = JSON.parse(JSON.stringify(file));
        edit(copy);
        const parsed = TH.parseResult(JSON.stringify(copy));
        expect([parsed.ok, parsed.integrity]).toEqual([true, 'changed']);
        expect(parsed.result.summary.items).toBe(2);
      }
      // Pretty-printing or reordering keys is not an edit.
      expect(TH.parseResult(JSON.stringify(file, null, 4)).integrity).toBe('ok');
    }
  });

  it('is "absent" for files with none, or with a method this reader does not know', () => {
    const t = open();
    t.finish();
    const file = t.saveJson();
    expect(TH.parseResult({ ...file, integrity: undefined }).integrity).toBe('absent');
    expect(TH.parseResult({ ...file, integrity: { method: 'md5', value: 'x' } }).integrity).toBe('absent');
    expect(TH.parseResult({ ...file, integrity: 'yes' }).integrity).toBe('absent');
  });

  it('the app-side SHA-256 is the real one', () => {
    for (const text of ['', 'abc', 'é'.repeat(999), 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), '\u{1F600}'.repeat(40)]) {
      const want = createHash('sha256').update(text, 'utf8').digest();
      expect(TH.sha256(text)).toEqual({ hex: want.toString('hex'), base64: want.toString('base64') });
    }
  });
});

describe('older results files', () => {
  it('a schemaVersion 2 file from the first release still reads, with integrity "absent"', () => {
    const text = readFileSync('tests/fixtures/take_home_result_v2_sample.json', 'utf8');
    expect(JSON.parse(text).schemaVersion).toBe(2);
    const parsed = TH.parseResult(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.integrity).toBe('absent');
    expect(parsed.result.learnerName).toBe('Sample Student');
    expect(parsed.result.summary).toEqual({ items: 15, done: 15, firstTry: 13, afterRetry: 1, missed: 1, practised: 0 });
    expect(parsed.result.items[0]).toMatchObject({ ms: 0, flag: '' });
    // It can still be laid out as a table (no session id, no times).
    const table = TH.resultsCsv(JSON.parse(text));
    expect(table.rows).toHaveLength(15);
    expect(table.rows[0][6]).toBe('Sample Student');
    expect(TH.parseResult({ kind: 'alloflow-take-home-result', schemaVersion: 4, lessonId: 'L', items: [] }).error).toBe('unsupported_version');
  });
});

describe('the learner label', () => {
  it('is asked for as a code name or first name', () => {
    const t = open();
    expect(t.d.querySelector('label[for="learner-name"]').textContent).toBe('Your code name or first name');
  });
  it('is pre-filled from #learner=, decoded, trimmed and capped at 60 like typed input', () => {
    const t = open({ hash: '#learner=Blue%20Heron7' });
    expect(t.d.getElementById('learner-name').value).toBe('Blue Heron7');
    t.start();
    expect(t.w.document.querySelector('#app h2').textContent).toMatch(/Find Sounds: 1 of 2/);
    t.pick(0); t.next(0); t.pick(1); t.next(1);
    expect(t.saveJson().learner).toBe('Blue Heron7');
    expect(t.saved[0].name).toMatch(/^Short-a__Blue-Heron7__/);
    const long = open({ hash: '#x=1&learner=%20' + 'n'.repeat(90) + '&y=2' });
    expect(long.d.getElementById('learner-name').value).toBe('n'.repeat(60));
    for (const hash of ['', '#learner=', '#learner=%E0%A4%A', '#notlearner=Zed']) expect(open({ hash }).d.getElementById('learner-name').value).toBe('');
  });
  it('wins over a label kept on the device from an earlier opening', () => {
    const html = build();
    const a = open({ html });
    a.start('Ana');
    expect(open({ html, storage: a.storageDump() }).d.getElementById('learner-name').value).toBe('Ana');
    expect(open({ html, storage: a.storageDump(), hash: '#learner=Ben' }).d.getElementById('learner-name').value).toBe('Ben');
  });
});

const cspOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const manifestOf = (html) => JSON.parse(new JSDOM(html).window.document.getElementById('packet-manifest').textContent);
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((s) => !s.type).textContent;

describe('the manifest and "About this file"', () => {
  it('the manifest block parses, names what the file stores and saves, and carries the same CSP as the meta tag', () => {
    const html = build({ title: 'Short a </script><b>' });
    const m = manifestOf(html);
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    expect(m).toMatchObject({ kind: 'alloflow-packet-manifest', engine: 'alloflow-packet/1', licence: 'AGPL-3.0', attributions: [], network: 'none',
      never: ['internet connection', 'microphone', 'camera', 'cookies', 'AI'], packet: { id: lesson.lessonId, version: lesson.revision, form: '', mode: 'practice' } });
    expect(m.title).toBe('Short a </script><b>');
    expect(m.csp).toBe(cspOf(html));
    expect(m.stores).toHaveLength(1);
    expect(m.stores[0]).toMatchObject({ where: 'localStorage', key: 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision });
    expect(m.saves.map((s) => s.file)).toEqual(['Short-a-script-b__LEARNER__DATE.csv', 'Short-a-script-b__LEARNER__DATE.json']);
    expect(m.integrity).toContain('detects accidental edits, not deliberate ones');
    expect(JSON.stringify(m)).not.toMatch(/signature/i);
    // The one key it names is the one key the player writes.
    const t = open({ html });
    t.finish();
    expect(Object.keys(t.storageDump())).toEqual([m.stores[0].key]);
  });

  it('with no mailbox the policy shuts every way out, and lets the one script run by its hash', () => {
    const html = build();
    const csp = cspOf(html);
    for (const part of ["default-src 'none'", "style-src 'unsafe-inline'", 'media-src data: blob:', 'img-src data:', "connect-src 'none'", "form-action 'none'", "base-uri 'none'",
      "object-src 'none'", "frame-src 'none'", "worker-src 'none'", "manifest-src 'none'"]) expect(csp.split('; ')).toContain(part);
    const script = scriptOf(html);
    const digest = createHash('sha256').update(script, 'utf8').digest();
    expect(csp.split('; ')).toContain("script-src 'sha256-" + digest.toString('base64') + "'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(manifestOf(html).scriptSha256).toBe(digest.toString('hex'));
    expect(script).not.toContain('\r');
    // A loader checked out with Windows line ends must still hash what the browser will read.
    delete window.AlloWordSoundsTakeHome;
    new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8').replace(/\n/g, '\r\n'))();
    const crlf = window.AlloWordSoundsTakeHome;
    window.AlloWordSoundsTakeHome = TH;
    const other = crlf.buildHtml(crlf.lessonFromPack(PACK(), { core, banks: BANKS, lessonId: 'L-crlf' }).lesson, { core });
    expect(cspOf(other)).toContain("'sha256-" + createHash('sha256').update(scriptOf(other), 'utf8').digest('base64') + "'");
  });

  it('the panel opens from the first screen and the finish screen and says it all in plain words', () => {
    const t = open();
    const panel = () => t.d.querySelector('[data-about]');
    const opener = () => t.d.querySelector('[data-about-open]');
    expect(panel().hidden).toBe(true);
    expect(opener().textContent).toBe('About this file');
    opener().click();
    expect(panel().hidden).toBe(false);
    expect(opener().getAttribute('aria-expanded')).toBe('true');
    const m = manifestOf(t.html);
    const text = panel().textContent;
    for (const part of ['It works with no internet.', 'File type: alloflow-packet/1.', 'under the name ' + m.stores[0].key + '.', 'Short-a__LEARNER__DATE.csv opens in a spreadsheet',
      'Short-a__LEARNER__DATE.json is for your teacher', 'It never connects to the internet.', 'It never uses the microphone or the camera. It has no cookies and runs no AI.',
      'It cannot stop someone who changes a file on purpose.', m.csp, 'License: AGPL-3.0.']) expect(text).toContain(part);
    expect(text).not.toContain('class mailbox');
    opener().click();
    expect(panel().hidden).toBe(true);
    t.finish();
    expect(panel().hidden).toBe(true);
    t.button('About this file').click();
    expect(panel().hidden).toBe(false);
    expect(panel().textContent).toContain('It never connects to the internet.');
  });

  it('every label the player shows has an English fallback, and a translated one is used', () => {
    for (const key of ['learner_label', 'save_csv', 'copy_tsv', 'copied', 'copy_manual', 'about_button', 'about_what', 'about_engine', 'about_stores', 'about_saves', 'about_no_network',
      'about_mailbox', 'about_never', 'about_check', 'about_rules', 'about_licence', 'about_credits']) expect(typeof TH.DEFAULT_LABELS[key]).toBe('string');
    const t = open({ html: build({ labels: { about_button: 'Acerca de este archivo', save_csv: 'Guardar para hoja de cálculo (CSV)' } }) });
    expect(t.d.querySelector('[data-about-open]').textContent).toBe('Acerca de este archivo');
    t.finish();
    expect(t.d.querySelector('[data-save-csv]').textContent).toBe('Guardar para hoja de cálculo (CSV)');
  });
});

// The claim "this file cannot send anything" rests on the CSP PLUS the script holding none of these.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (source) => FORBIDDEN.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);

describe('source check: what a file with no mailbox may not contain', () => {
  it('the check itself fires on each thing it forbids', () => {
    const samples = ['see http://x.test', 'see https://x.test', 'location = u', 'win.location.href = u', 'location.replace(u)', 'window.open(u)', '<form action=x>', '<a class="b" href="x">',
      '<meta http-equiv="refresh">', 'win.fetch(u)', 'new XMLHttpRequest()', 'new WebSocket(u)', 'new EventSource(u)', 'navigator.sendBeacon(u)', 'eval(x)', 'new Function(x)', 'import(u)',
      'navigator.mediaDevices.getUserMedia({})', 'document.cookie', 'speechSynthesis.speak(u)', 'navigator.serviceWorker', 'new RTCPeerConnection()'];
    for (const sample of samples) expect(audit(sample), sample).not.toEqual([]);
    for (const fine of ['String(win.location.hash || "")', 'a.location === b', "el('a', { download: name })", 'the open door', 'reopen (x)']) expect(audit(fine), fine).toEqual([]);
  });

  it('a built no-mailbox file contains none of them, anywhere in the file', () => {
    const html = build();
    expect(audit(html)).toEqual([]);
    const doc = new JSDOM(html).window.document;
    expect([...doc.querySelectorAll('*')].flatMap((node) => [...node.attributes]).filter((a) => /^on/i.test(a.name))).toEqual([]);
    expect(html.match(/<script/gi)).toHaveLength(2);
    expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
  });

  it('no activity adapter contains any of them, so no choice of activities can add one', () => {
    const ids = Object.keys(TH.ADAPTERS);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(ids.slice().sort()).toEqual(['isolation'].concat(readdirSync('word_sounds_take_home/adapters').filter((f) => /^[a-z_]+\.js$/.test(f)).map((f) => f.replace(/\.js$/, ''))).sort());
    for (const id of ids) expect(audit(TH.ADAPTERS[id].render.toString() + JSON.stringify(TH.ADAPTERS[id].labels)), id).toEqual([]);
    expect(audit(JSON.stringify(TH.DEFAULT_LABELS))).toEqual([]);
  });

  it('the mailbox code is in a file only when it has a mailbox', () => {
    expect(build()).not.toContain('putsubmission');
    expect(build()).toContain('mailbox:null};');
    const sending = build({ submit: true });
    expect(audit(sending)).toEqual(['a web address', 'fetch(']);
    expect(sending).toContain('putsubmission');
    expect(sending.match(/fetch\s*\(/g)).toHaveLength(1);
  });
});

describe('a file with a class mailbox', () => {
  it('keeps its connect-src, runs by hash, and says where results can go', () => {
    const html = build({ submit: true });
    const csp = cspOf(html);
    expect(csp).toMatch(/; connect-src https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com$/);
    expect(csp).toContain("'sha256-" + createHash('sha256').update(scriptOf(html), 'utf8').digest('base64') + "'");
    for (const part of ["form-action 'none'", "base-uri 'none'", "object-src 'none'", "frame-src 'none'", "worker-src 'none'", "manifest-src 'none'"]) expect(csp).toContain(part);
    const m = manifestOf(html);
    expect(m.csp).toBe(csp);
    expect(m.network).toMatchObject({ sendsTo: 'script.google.com', when: 'only when the learner presses Send' });
    expect(m.never).toEqual(['microphone', 'camera', 'cookies', 'AI']);
    const t = open({ html });
    t.d.querySelector('[data-about-open]').click();
    const text = t.d.querySelector('[data-about]').textContent;
    expect(text).toContain("when you press Send, your results go to your teacher's class mailbox at script.google.com. Nothing is sent before that.");
    expect(text).not.toContain('It never connects to the internet.');
  });

  it('still sends: one putsubmission to the mailbox, carrying the schema 3 result with its integrity value', async () => {
    const t = open({ submit: true, html: build({ submit: true }) });
    t.finish('Ana');
    expect(t.sent).toEqual([]);
    t.button('Send my work to my teacher').click();
    await settle();
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0].url).toBe(MAILBOX.url);
    expect(t.sent[0].body).toMatchObject({ a: 'putsubmission', id: MAILBOX.packId, k: 'k', part: 1, of: 1 });
    expect(t.sent[0].body.sid).toMatch(/^SUB-[0-9a-f-]{36}$/);
    const payload = JSON.parse(t.sent[0].body.data);
    expect(payload).toMatchObject({ kind: 'alloflow-take-home-submission', schemaVersion: 1, studentName: 'Ana' });
    expect(payload.takeHomeResult).toMatchObject({ schemaVersion: 3, learner: 'Ana' });
    const parsed = TH.parseResult(payload);
    expect([parsed.ok, parsed.integrity, parsed.result.summary.firstTry]).toEqual([true, 'ok', 2]);
    expect(t.d.getElementById('app').textContent).toContain('ana.json');
    // The saved file and the sent copy are the same session.
    expect(t.saveJson().sessionId).toBe(payload.takeHomeResult.sessionId);
  });

  it('a file with no mailbox offers no Send, even where the browser could', () => {
    const t = open();
    t.finish();
    expect(t.button('Send my work to my teacher')).toBeUndefined();
    expect(t.sent).toEqual([]);
  });
});
