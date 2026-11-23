import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

const reader = require('../packets_results_reader.js');
const handoff = require('../packets_handoff.js');
const myWords = require('../packets_my_words.js');
const checkBuilder = require('../packet_check_builder.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { loader } = tool.loadParts();

const opened = [];
const sessions = [];
afterEach(() => {
  while (sessions.length) { try { sessions.pop().stop(); } catch (_) {} }
  while (opened.length) { try { opened.pop().close(); } catch (_) {} }
});

// Build an uncompressed (STORE) .zip buffer that preserves arbitrary entry names including explicit directory entries.
function makeRawZip(entries) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const body = typeof entry.data === 'string' ? enc.encode(entry.data) : new Uint8Array(entry.data || 0);
    const local = new Uint8Array(30 + nameBytes.length + body.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, body.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(body, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(20, body.length, true);
    cv.setUint32(24, body.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of centrals) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  const out = new Uint8Array(offset + cdSize + 22);
  let pos = 0;
  for (const l of locals) { out.set(l, pos); pos += l.length; }
  for (const c of centrals) { out.set(c, pos); pos += c.length; }
  out.set(eocd, pos);
  return out;
}

function makePracticeJson(overrides = {}) {
  return {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: 'w8-p1',
    learner: 'BlueHeron7',
    lessonTitle: 'Short vowels',
    startedLocal: '2026-11-20T09:00:00-05:00',
    finishedLocal: '2026-11-20T09:05:00-05:00',
    durationMs: 300000,
    packet: { id: 'ws-short-a', version: '1', form: 'A', mode: 'practice', title: 'Short vowels' },
    activityTitles: { isolation: 'Find Sounds' },
    items: [
      { n: 1, itemId: 'i-1', activity: 'isolation', word: 'cat', target: 'k', responses: ['k'], correct: true, firstTry: true, attempts: 1, done: true, ms: 1800 },
    ],
    ...overrides,
  };
}

function makePracticeCsv(sid = 'w8-csv-1', learner = 'BlueHeron7') {
  const header = reader.COLUMNS.map(reader.csvCell).join(',');
  const row = [
    reader.FORMAT, sid, 'ws-short-a', '1', 'A', 'practice', learner,
    '2026-11-20T09:00:00-05:00', '2026-11-20T09:04:00-05:00', 240,
    1, 'i-1', 'isolation', 'Find Sounds', 1, 'cat', 'k', 'k', 1, 1, 1, 1500, '', '',
  ].map(reader.csvCell).join(',');
  return '\uFEFF' + header + '\r\n' + row + '\r\n';
}

function makeChannelBus(log) {
  const peers = [];
  return class BusChannel {
    constructor(name) { this.name = name; this.onmessage = null; this.closed = false; peers.push(this); }
    postMessage(data) {
      if (this.closed) throw new Error('InvalidStateError');
      const copy = JSON.parse(JSON.stringify(data));
      if (log) log.push(copy);
      for (const peer of peers.slice()) {
        if (peer !== this && !peer.closed && peer.name === this.name && typeof peer.onmessage === 'function') {
          peer.onmessage({ data: copy });
        }
      }
    }
    close() { this.closed = true; }
  };
}

function makeFakeIdb({ failWith = null, rawInject = null } = {}) {
  const dbs = new Map();
  const events = { prevented: 0 };
  const idb = {
    failWith,
    events,
    dbs,
    open(name, version) {
      const req = {};
      queueMicrotask(() => {
        let db = dbs.get(name);
        const fresh = !db;
        if (fresh) { db = { stores: new Map(), version }; dbs.set(name, db); }
        const handle = {
          objectStoreNames: { contains: (s) => db.stores.has(s) },
          createObjectStore(s, opts) { db.stores.set(s, { keyPath: opts.keyPath, rows: new Map() }); },
          close() {},
          transaction(names, mode) {
            const list = Array.isArray(names) ? names : [names];
            const working = new Map(list.map((s) => [s, new Map(db.stores.get(s).rows)]));
            const tx = { mode: mode || 'readonly', error: null, pending: 0, over: false };
            const finish = () => queueMicrotask(() => {
              if (tx.over || tx.pending) return;
              tx.over = true;
              for (const [s, rows] of working) db.stores.get(s).rows = rows;
              if (tx.oncomplete) tx.oncomplete({ target: tx });
            });
            const ask = (fn, isWrite) => {
              const r = {};
              tx.pending++;
              queueMicrotask(() => {
                if (tx.over) return;
                try {
                  if (isWrite && idb.failWith) throw idb.failWith;
                  r.result = fn();
                } catch (err) {
                  tx.error = err;
                  tx.over = true;
                  const ev = { target: r, preventDefault() { events.prevented++; } };
                  if (r.onerror) r.onerror(ev);
                  const txEv = { target: tx, preventDefault() { events.prevented++; } };
                  if (tx.onabort) tx.onabort(txEv);
                  else if (tx.onerror) tx.onerror(txEv);
                  return;
                }
                if (r.onsuccess) r.onsuccess({ target: r });
                tx.pending--;
                finish();
              });
              return r;
            };
            tx.abort = () => {
              tx.over = true;
              queueMicrotask(() => {
                if (tx.onabort) tx.onabort({ target: tx, preventDefault() { events.prevented++; } });
              });
            };
            tx.objectStore = (s) => {
              const rows = working.get(s);
              const keyPath = db.stores.get(s).keyPath;
              return {
                get: (k) => ask(() => (rows.has(k) ? JSON.parse(rows.get(k)) : undefined), false),
                getAll: () => ask(() => {
                  const arr = [...rows.keys()].sort().map((k) => JSON.parse(rows.get(k)));
                  return rawInject && rawInject[s] ? arr.concat(rawInject[s]) : arr;
                }, false),
                count: () => ask(() => rows.size, false),
                put: (v) => ask(() => { rows.set(v[keyPath], JSON.stringify(v)); return v[keyPath]; }, true),
                delete: (k) => ask(() => { rows.delete(k); }, true),
                clear: () => ask(() => { rows.clear(); }, true),
              };
            };
            finish();
            return tx;
          },
        };
        req.result = handle;
        if (fresh && req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
  };
  return idb;
}

const b64 = (n, fill = 9) => Buffer.alloc(n, fill).toString('base64');
const png = (n) => 'data:image/png;base64,' + b64(n);

describe('Wave 8 Track B: Hub, Results Reader, Handoff, Preview & My Words (F1–F7)', () => {
  // -------------------------------------------------------------------------
  // F1: unpackZip skips explicit .zip directory records
  // -------------------------------------------------------------------------
  it('F1: unpackZip skips trailing-slash and backslash directory records (including results.csv/) with zero false warnings', async () => {
    const csv1 = makePracticeCsv('w8-dir-1', 'BlueHeron7');
    const json1 = JSON.stringify(makePracticeJson({ sessionId: 'w8-dir-2', learner: 'RedFox3' }));
    const archive = makeRawZip([
      { name: 'Period-1/', data: '' },
      { name: 'Period-1/BlueHeron7/', data: '' },
      { name: 'Period-1\\RedFox3\\', data: '' },
      { name: 'Period-1/results.csv/', data: '' },
      { name: 'Period-1/nested.json\\', data: '' },
      { name: 'Period-1/BlueHeron7/results.csv', data: csv1 },
      { name: 'Period-1\\RedFox3\\results.json', data: json1 },
      { name: 'Period-1/notes.txt', data: 'Teacher memo' },
    ]);

    const out = await reader.unpackZip(archive);
    expect(out.ok).toBe(true);
    expect(out.entries.map((e) => e.name)).toEqual([
      'Period-1/BlueHeron7/results.csv',
      'Period-1/RedFox3/results.json',
    ]);
    // Only the real non-results file is reported skipped; none of the 5 folder entries emit warnings or empty-file errors.
    expect(out.skipped).toEqual([
      { name: 'Period-1/notes.txt', why: 'Not a CSV or JSON results file.' },
    ]);

    // A folder-only .zip produces the clean empty-folder message rather than bogus non-CSV warnings.
    const dirsOnly = makeRawZip([
      { name: 'Period-1/', data: '' },
      { name: 'Period-1/Empty/', data: '' },
    ]);
    const emptyOut = await reader.unpackZip(dirsOnly);
    expect(emptyOut).toEqual({
      ok: false,
      why: 'This .zip folder has no CSV or JSON results files in it.',
      entries: [],
      skipped: [],
      leftOut: 0,
    });
  });

  // -------------------------------------------------------------------------
  // F2: packets_handoff.js NaN/Infinity guard, liveIds broadcast bounding, MAX_BYTES & quota errors
  // -------------------------------------------------------------------------
  it('F2: hostPreview guards non-finite parsed.index and bounds preview-reload broadcasts to liveIds + currentUrl', async () => {
    const log = [];
    const Bus = makeChannelBus(log);
    const makeHtml = (probs) => checkBuilder.buildCheckPacket({
      lesson: checkBuilder.lessonFromMathProblems({ title: 'Facts', problems: checkBuilder.parseProblems(probs), timeLimitS: 60 }),
      loader,
    }).html;

    const html0 = makeHtml('2+3, 4+1, 5+2');
    let rev = 0;
    const session = handoff.hostPreview({
      url: 'blob:https://site.test/u0',
      html: html0,
      Channel: Bus,
      onAction: () => {
        rev++;
        return { html: html0, url: 'blob:https://site.test/u' + rev, said: 'Updated ' + rev };
      },
    });
    sessions.push(session);

    const peer0 = new Bus(handoff.PREVIEW_CHANNEL);
    const bars0 = [];
    const reloads0 = [];
    peer0.onmessage = (ev) => {
      const m = ev.data;
      if (m && m.id === 'blob:https://site.test/u0') {
        if (m.type === 'preview-bar') bars0.push(m.bar);
        if (m.type === 'preview-reload') reloads0.push(m);
      }
    };

    peer0.postMessage({ type: 'preview-hello', id: 'blob:https://site.test/u0' });
    expect(bars0).toHaveLength(1);

    const extractLesson = (html) => {
      const tag = html.match(/<script type="application\/json" id="packet-lesson">([\s\S]*?)<\/script>/);
      if (tag) return JSON.parse(tag[1]);
      const m = html.match(/(?:^|\n)var lesson=([\s\S]*?);\r?\nvar labels=/);
      return m ? JSON.parse(m[1]) : null;
    };
    const lessonObj = extractLesson(html0);
    expect(lessonObj && lessonObj.lessonId && lessonObj.revision).toBeTruthy();
    const storeKey = 'alloflow-take-home:' + lessonObj.lessonId + ':' + lessonObj.revision;

    // Move to index 1 via float 1.9 -> floored cleanly to 1.
    peer0.postMessage({
      type: 'preview-store',
      id: 'blob:https://site.test/u0',
      key: storeKey,
      value: '{"index":1.9,"startedAt":1700000000000}',
    });
    expect(bars0[bars0.length - 1].nav.index).toBe(1);

    // Send non-finite IEEE-754 JSON numbers (1e999 -> Infinity, -1e999 -> -Infinity) and non-numbers: must NOT crash makeBar() or corrupt index.
    for (const badVal of ['{"index":1e999,"startedAt":1700000000000}', '{"index":-1e999,"startedAt":1700000000000}', '{"index":"NaN","startedAt":1700000000000}']) {
      expect(() => {
        peer0.postMessage({ type: 'preview-store', id: 'blob:https://site.test/u0', key: storeKey, value: badVal });
      }).not.toThrow();
      expect(bars0[bars0.length - 1].nav.index).toBe(1);
    }

    // Perform 8 consecutive preview-act rebuilds generating u1..u8 without opening tabs on u1..u7.
    for (let k = 1; k <= 8; k++) {
      log.length = 0;
      peer0.postMessage({ type: 'preview-act', id: 'blob:https://site.test/u0', action: 'swap' });
      await new Promise((r) => setTimeout(r, 10));
      const reloadMsgs = log.filter((m) => m.type === 'preview-reload');
      // Only live peer u0 and currentUrl u<k> receive preview-reload (2 messages, never k+1).
      expect(reloadMsgs.map((m) => m.id).sort()).toEqual(['blob:https://site.test/u0', 'blob:https://site.test/u' + k].sort());
    }
    expect(reloads0).toHaveLength(8);
    // Opening a second live peer on currentUrl u8 adds u8 to liveIds; on rebuild #9 only u0, u8, and u9 receive reload (dead u1..u7 stay silent).
    const peer8 = new Bus(handoff.PREVIEW_CHANNEL);
    const reloads8 = [];
    peer8.onmessage = (ev) => { if (ev.data && ev.data.id === 'blob:https://site.test/u8' && ev.data.type === 'preview-reload') reloads8.push(ev.data); };
    peer8.postMessage({ type: 'preview-hello', id: 'blob:https://site.test/u8' });
    log.length = 0;
    peer0.postMessage({ type: 'preview-act', id: 'blob:https://site.test/u0', action: 'swap' });
    await new Promise((r) => setTimeout(r, 10));
    expect(log.filter((m) => m.type === 'preview-reload').map((m) => m.id).sort()).toEqual([
      'blob:https://site.test/u0',
      'blob:https://site.test/u8',
      'blob:https://site.test/u9',
    ]);
    expect(reloads8).toHaveLength(1);
    peer8.close();
    peer0.close();
  });

  it('F2: handoff.put enforces 60 MB MAX_BYTES cap, calls preventDefault on IDB errors, and maps quota errors cleanly', async () => {
    expect(handoff.MAX_BYTES).toBe(60 * 1024 * 1024);

    // Oversized buffer rejects immediately without touching IndexedDB.
    await expect(handoff.put({ name: 'giant.html', bytes: { byteLength: handoff.MAX_BYTES + 1 } }))
      .rejects.toThrow('This file is too large to hand over here.');

    // Test QuotaExceededError, Firefox NS_ERROR_DOM_QUOTA_REACHED, and legacy Safari code 22.
    const quotaErrors = [
      Object.assign(new Error('quota'), { name: 'QuotaExceededError' }),
      Object.assign(new Error('quota'), { name: 'NS_ERROR_DOM_QUOTA_REACHED' }),
      Object.assign(new Error('quota'), { name: 'DOMException', code: 22 }),
    ];
    for (const qErr of quotaErrors) {
      const fakeIdb = makeFakeIdb({ failWith: qErr });
      const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://site.test/' });
      opened.push(dom.window);
      Object.defineProperty(dom.window, 'indexedDB', { configurable: true, value: fakeIdb });
      dom.window.eval(read('packets_handoff.js'));
      await expect(dom.window.AlloPacketHandoff.put({ name: 'a.html', bytes: new Uint8Array(16).buffer }))
        .rejects.toThrow('This browser does not have enough storage space to hand the file over.');
      expect(fakeIdb.events.prevented).toBeGreaterThanOrEqual(1);
    }
  });

  // -------------------------------------------------------------------------
  // F3: packets_results_reader.js flag dedup, recallMs, summaryCsv learner trim, READ_ALONG_* exports
  // -------------------------------------------------------------------------
  it('F3: deduplicates tally() flags, excludes negative/unscored/paused recallMs, sanitizes summaryCsv learner, and exports READ_ALONG_*', async () => {
    // 1. Duplicate flag prevention (untimed + finished_early + file_changed already in score.flags)
    const untimedJson = {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'w8-dup-1',
      learner: 'BlueHeron7',
      startedLocal: '2026-11-20T09:00:00-05:00',
      finishedLocal: '2026-11-20T09:05:00-05:00',
      durationMs: 300000,
      packet: { id: 'math-fluency-g2', version: '1', form: 'A', mode: 'check', title: 'Math Fluency' },
      items: [
        { n: 1, itemId: 'm-1', activity: 'math_computation', word: '2+2', target: '4', responses: ['4'], correct: true, firstTry: true, attempts: 1, done: true, ms: 1200, digitsCorrect: 1, digitsPossible: 1 },
      ],
      score: {
        measure: 'math_dcpm', score: null, scoreUnit: 'digits_correct_per_minute',
        timeLimitS: null, elapsedS: 300, completion: 'complete', untimed: true,
        flags: ['untimed', 'untimed', 'no_check_value'],
      },
    };
    const resUntimed = await reader.read(JSON.stringify(untimedJson), { name: 'u.json' });
    expect(resUntimed.ok).toBe(true);
    const s = resUntimed.sessions[0];
    expect(s.flags.filter((f) => f === 'untimed')).toHaveLength(1);
    expect(s.flags.filter((f) => f === 'no_check_value')).toHaveLength(1);
    expect(new Set(s.flags).size).toBe(s.flags.length);
    expect(reader.summaryCsv([{ learner: 'BlueHeron7', session: s }])).not.toContain('untimed;untimed');

    // 2. readJson() recallMs skips negative, unscored, paused, time_up, and practice items
    const recallJson = makePracticeJson({
      sessionId: 'w8-rec-1',
      items: [
        { n: 1, itemId: 'r-1', activity: 'math_rehearsal', word: '2+3', target: '5', responses: ['5'], correct: true, firstTry: true, attempts: 1, done: true, ms: 2000, recallMs: -500 },
        { n: 2, itemId: 'r-2', activity: 'math_rehearsal', word: '3+4', target: '7', responses: ['7'], correct: true, firstTry: true, attempts: 1, done: true, ms: 900, scored: false, recallMs: 900 },
        { n: 3, itemId: 'r-3', activity: 'math_rehearsal', word: '4+5', target: '9', responses: ['9'], correct: true, firstTry: true, attempts: 1, done: true, ms: 800, flag: 'paused', recallMs: 800 },
        { n: 4, itemId: 'r-4', activity: 'math_rehearsal', word: '5+6', target: '11', responses: ['11'], correct: true, firstTry: true, attempts: 1, done: true, ms: 700, flag: 'time_up', recallMs: 700 },
        { n: 5, itemId: 'r-5', activity: 'math_rehearsal', word: '1+1', target: '2', responses: ['2'], correct: true, firstTry: true, attempts: 1, done: true, ms: 600, practice: true, recallMs: 600 },
        { n: 6, itemId: 'r-6', activity: 'math_rehearsal', word: '6+7', target: '13', responses: ['13'], correct: true, firstTry: true, attempts: 1, done: true, ms: 2000, recallMs: 2000 },
        { n: 7, itemId: 'r-7', activity: 'math_rehearsal', word: '7+8', target: '15', responses: ['15'], correct: true, firstTry: true, attempts: 1, done: true, ms: 3000, recallMs: 3000 },
      ],
    });
    const resRecall = await reader.read(JSON.stringify(recallJson), { name: 'rec.json' });
    expect(resRecall.ok).toBe(true);
    expect(resRecall.sessions[0].recall).toEqual({ items: 2, medianMs: 2500 });

    // Negative-only recallMs produces null recall (never clamped to 0 ms)
    const negOnly = makePracticeJson({
      sessionId: 'w8-rec-neg',
      items: [
        { n: 1, itemId: 'r-1', activity: 'math_rehearsal', word: '2+3', target: '5', responses: ['5'], correct: true, firstTry: true, attempts: 1, done: true, ms: 1500, recallMs: -120 },
      ],
    });
    expect((await reader.read(JSON.stringify(negOnly), { name: 'neg.json' })).sessions[0].recall).toBeNull();

    // 3. summaryCsv() trims leading spaces/newlines on learner before csvCell formula guard (without altering csvCell itself)
    const pSession = resRecall.sessions[0];
    const csv = reader.summaryCsv([
      { learner: ' =1+1', session: pSession },
      { learner: '\n+SUM(A1:A2)', session: pSession },
    ]);
    const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines[1].startsWith('"\'=1+1",')).toBe(true);
    expect(lines[2].startsWith('"\'+SUM(A1:A2)",')).toBe(true);
    // csvCell parity pin preserved: csvCell itself does not trim spaces
    expect(reader.csvCell(' =1+1')).toBe('" =1+1"');

    // 4. READ_ALONG_STRANDS & READ_ALONG_ACTIVITIES exported while symbol_naming stays out of MEASURES/MEASURE_UNITS
    expect(reader.READ_ALONG_STRANDS).toEqual([['read_along', 'Read along']]);
    expect(reader.READ_ALONG_ACTIVITIES).toEqual({ read_along: ['Read along', 'read_along'] });
    expect(reader.MEASURES.symbol_naming).toBeUndefined();
    expect(reader.MEASURE_UNITS.symbol_naming).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // F4: packets-try.js speechSynthesis cancel, guarded postMessage, focus preservation
  // -------------------------------------------------------------------------
  it('F4: packets-try.js cancels speechSynthesis on reload & pagehide, guards late messages after pagehide, and preserves focus on More & Hide answers', async () => {
    const Bus = makeChannelBus();
    const sampleHtml = checkBuilder.buildCheckPacket({
      lesson: checkBuilder.lessonFromMathProblems({ title: 'Facts', problems: checkBuilder.parseProblems('2+3, 4+1'), timeLimitS: 60 }),
      loader,
    }).html;
    const addr = 'blob:https://site.test/try-w8';

    const dom = new JSDOM(read('packets-try.html'), { runScripts: 'outside-only', url: 'https://site.test/packets-try.html#' + addr });
    opened.push(dom.window);
    const w = dom.window;
    let cancelCalls = 0;
    let revoked = 0;
    let blobSeq = 0;
    w.speechSynthesis = { cancel() { cancelCalls++; } };
    w.BroadcastChannel = Bus;
    w.URL.createObjectURL = () => 'blob:https://site.test/dyn-' + (++blobSeq);
    w.URL.revokeObjectURL = () => { revoked++; };
    w.fetch = async (u) => {
      if (u !== addr) return { ok: false };
      return { ok: true, text: async () => sampleHtml };
    };

    const peer = new Bus('alloflow-packets-preview');
    const barPayload = {
      hidden: false,
      where: 'Question 1 of 2: 2 + 3',
      whereQuiet: 'Question 1 of 2: 2 + 3',
      buttons: [{ action: 'remove', label: 'Remove question', disabled: false }],
      said: '',
      busy: false,
      nav: { index: 0, total: 2, canPrev: false, canNext: true, finished: false, started: true, items: [{ index: 0, label: '1. 2 + 3' }, { index: 1, label: '2. 4 + 1' }] },
    };
    peer.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'preview-hello' && ev.data.id === addr) {
        peer.postMessage({ type: 'preview-bar', id: addr, bar: barPayload });
      }
    };

    w.eval(read('packets-try.js'));
    await new Promise((r) => setTimeout(r, 25));

    // Initial showHtml cancelled any lingering speech once.
    expect(cancelCalls).toBe(1);

    // Focus preservation on [data-preview-more] across preview-bar re-renders.
    const moreBtn = w.document.querySelector('[data-preview-more]');
    expect(moreBtn).toBeTruthy();
    moreBtn.focus();
    expect(w.document.activeElement).toBe(moreBtn);
    peer.postMessage({ type: 'preview-bar', id: addr, bar: { ...barPayload, where: 'Question 2 of 2: 4 + 1' } });
    expect(w.document.activeElement).toBe(w.document.querySelector('[data-preview-more]'));

    // Focus preservation on [data-preview-hide] across preview-bar re-renders.
    const hideBtn = w.document.querySelector('[data-preview-hide]');
    hideBtn.focus();
    expect(w.document.activeElement).toBe(hideBtn);
    peer.postMessage({ type: 'preview-bar', id: addr, bar: { ...barPayload, where: 'Question 1 of 2: 2 + 3' } });
    expect(w.document.activeElement).toBe(w.document.querySelector('[data-preview-hide]'));

    // preview-reload invokes stopSpeech() again.
    peer.postMessage({ type: 'preview-reload', id: addr, html: sampleHtml, snapshot: {}, bar: barPayload });
    expect(cancelCalls).toBe(2);

    // pagehide invokes stopSpeech(), revokes blobUrl, closes/nulls channel; late iframe message MUST NOT throw.
    const frame = w.document.querySelector('iframe.try-frame');
    w.dispatchEvent(new w.Event('pagehide'));
    expect(cancelCalls).toBe(3);
    expect(revoked).toBeGreaterThanOrEqual(2);
    expect(() => {
      w.dispatchEvent(new w.MessageEvent('message', {
        source: frame.contentWindow,
        origin: 'null',
        data: { kind: 'alloflow-packet-store', key: 'alloflow-take-home:test', value: '{}' },
      }));
    }).not.toThrow();

    peer.close();
  });

  // -------------------------------------------------------------------------
  // F5: packets_my_words.js quota errors, SVG xmlns + lone surrogate guard, corrupt IDB resilience
  // -------------------------------------------------------------------------
  it('F5: maps Firefox/Safari quota errors to storage_full, injects SVG xmlns & guards unpaired surrogates, and survives corrupt IDB rows', async () => {
    // 1. Firefox NS_ERROR_DOM_QUOTA_REACHED and legacy Safari code 22 map to storage_full.
    for (const qErr of [
      Object.assign(new Error('quota'), { name: 'NS_ERROR_DOM_QUOTA_REACHED' }),
      Object.assign(new Error('quota'), { name: 'DOMException', code: 22 }),
    ]) {
      const idb = makeFakeIdb({ failWith: qErr });
      const store = myWords.create({ indexedDB: idb });
      let caught = null;
      try { await store.put('cat', { sounds: ['k', 'a', 't'] }); } catch (e) { caught = e; }
      expect(caught && caught.code).toBe('storage_full');
      expect(caught && caught.message).toBe('This device has no room left for this site. Remove some words, or free some space.');
    }

    // 2. resizeToDataUri injects xmlns on namespace-less SVG (safe & rasterize fallback) and rejects lone surrogates as not_a_picture.
    const dom = new JSDOM('<!doctype html><title>t</title>', { runScripts: 'outside-only', url: 'https://packets.test/' });
    opened.push(dom.window);
    const w = dom.window;
    const loadedImgs = [];
    w.HTMLCanvasElement.prototype.getContext = function () {
      return { fillRect() {}, drawImage() {} };
    };
    w.HTMLCanvasElement.prototype.toDataURL = function (type = 'image/png') {
      return 'data:' + type + ';base64,' + b64(400);
    };
    w.Image = function () {
      const img = { naturalWidth: 100, naturalHeight: 100 };
      Object.defineProperty(img, 'src', {
        set(addr) {
          loadedImgs.push(addr);
          queueMicrotask(() => img.onload && img.onload());
        },
      });
      return img;
    };
    w.eval(read('packets_my_words.js'));

    // Safe SVG missing xmlns gets xmlns injected before base64 encoding.
    const bareSvg = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    const keptUri = await w.AlloPacketMyWords.resizeToDataUri(new w.File([bareSvg], 'dot.svg', { type: 'image/svg+xml' }), 256);
    expect(keptUri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const decodedKept = Buffer.from(keptUri.split(',')[1], 'base64').toString('utf8');
    expect(decodedKept).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');

    // Unsafe SVG missing xmlns gets xmlns injected before passing to Image rasterizer fallback.
    const unsafeBare = '<svg onload="alert(1)" viewBox="0 0 10 10"><circle r="4"/></svg>';
    const pngUri = await w.AlloPacketMyWords.resizeToDataUri(new w.File([unsafeBare], 'bad.svg', { type: 'image/svg+xml' }), 256);
    expect(pngUri.startsWith('data:image/png;base64,')).toBe(true);
    expect(loadedImgs).toHaveLength(1);
    const decodedRasterSrc = Buffer.from(loadedImgs[0].split(',')[1], 'base64').toString('utf8');
    expect(decodedRasterSrc).toContain('xmlns="http://www.w3.org/2000/svg"');

    // Unpaired UTF-16 surrogate in SVG text rejects cleanly with structured code 'not_a_picture' (not raw URIError).
    const badSurrogateSvg = '<svg><text>\uD800</text></svg>';
    const surrogateBlob = { size: badSurrogateSvg.length, type: 'image/svg+xml', slice() { return this; }, text: async () => badSurrogateSvg };
    let surrogateErr = null;
    try { await w.AlloPacketMyWords.resizeToDataUri(surrogateBlob, 256); } catch (e) { surrogateErr = e; }
    expect(surrogateErr && surrogateErr.code).toBe('not_a_picture');
    expect(surrogateErr instanceof URIError).toBe(false);

    // 3. Corrupted IDB records in rows & media do not wipe valid words in list(), usage(), or exportAll().
    const corruptIdb = makeFakeIdb({
      rawInject: {
        rows: [null, 'corrupt', {}, { word: 42 }, { word: '' }],
        media: [null, 123, {}, { key: '' }],
      },
    });
    const store = myWords.create({ indexedDB: corruptIdb });
    await store.put('cat', { sounds: ['k', 'a', 't'] });
    await store.putMedia('b', { picture: { dataUri: png(300), credit: { own: true } } });

    const rows = await store.list();
    expect(rows.map((r) => r.word)).toEqual(['cat']);
    const use = await store.usage();
    expect(use.count).toBe(2);
    expect(Number.isFinite(use.bytes) && use.bytes > 300).toBe(true);
    const exported = await store.exportAll();
    expect(exported.words.map((e) => e.word)).toEqual(['cat']);
    expect(exported.media.map((e) => e.key)).toEqual(['b']);
  });

  // -------------------------------------------------------------------------
  // F6: packets_my_words.js Unicode/symbol media keys & importAll single announce
  // -------------------------------------------------------------------------
  it('F6: broadens normalizeMediaKey for accented words & math symbols while keeping normalizeWord strict, and batches importAll announcements to 1', async () => {
    // normalizeWord stays strictly pinned
    expect(myWords.normalizeWord('caf\u00e9')).toBe('');

    // Accented words (NFC + NFD), curly apostrophe, and classroom/math symbols accepted
    expect(myWords.normalizeMediaKey('caf\u00e9')).toBe('caf\u00e9');
    expect(myWords.normalizeMediaKey('CAFE\u0301')).toBe('caf\u00e9');
    expect(myWords.normalizeMediaKey('Pi\u00f1ata')).toBe('pi\u00f1ata');
    expect(myWords.normalizeMediaKey('ni\u00f1o')).toBe('ni\u00f1o');
    expect(myWords.normalizeMediaKey('r\u00e9sum\u00e9')).toBe('r\u00e9sum\u00e9');
    expect(myWords.normalizeMediaKey('o\u2019clock')).toBe("o'clock");
    for (const sym of ['+', '-', '\u2212', '\u00d7', '\u00f7', '=', '1/2', '%', '$', '0.5']) {
      expect(myWords.normalizeMediaKey(sym), sym).toBe(sym);
    }
    expect(myWords.normalizeMediaKey('\u00bd')).toBe('1\u20442');

    // Dangerous/invalid keys rejected
    for (const bad of [
      '', '   ', 'a\x00b', 'a\nb', 'a\tb', '../etc/passwd', 'a/b', '/root', 'a\\b',
      '<svg>', 'a>b', '__proto__', 'constructor', 'prototype', 'CONSTRUCTOR',
      '\uff43\uff4f\uff4e\uff53\uff54\uff52\uff55\uff43\uff54\uff4f\uff52',
      'a'.repeat(49),
    ]) {
      expect(myWords.normalizeMediaKey(bad), JSON.stringify(bad)).toBe('');
    }

    // Round-trip persistence of accented vocab & symbol keys via putMedia/getMedia/getManyMedia
    const Bus = makeChannelBus();
    const idb = makeFakeIdb();
    const tabA = myWords.create({ indexedDB: idb, BroadcastChannel: Bus });
    const tabB = myWords.create({ indexedDB: idb, BroadcastChannel: Bus });

    await tabA.putMedia('caf\u00e9', { picture: { dataUri: png(200), credit: { own: true } } });
    await tabA.putMedia('+', { picture: { dataUri: png(220), credit: { own: true } } });
    await tabA.putMedia('1/2', { picture: { dataUri: png(240), credit: { own: true } } });
    expect((await tabA.getMedia('CAFE\u0301')).picture.bytes).toBe(200);
    expect((await tabA.getMedia('+')).picture.bytes).toBe(220);
    expect((await tabA.getMedia('1/2')).picture.bytes).toBe(240);
    expect(await tabA.list()).toEqual([]); // media items stay out of Word Sounds rows
    const many = await tabA.getManyMedia(['caf\u00e9', '+', '1/2', '__proto__', 'constructor']);
    expect(Object.keys(many).sort()).toEqual(['+', '1/2', 'caf\u00e9']);
    await expect(tabA.putMedia('__proto__', { picture: { dataUri: png(100), credit: { own: true } } })).rejects.toMatchObject({ code: 'bad_word' });

    // importAll fires exactly ONE change notification across tabs regardless of batch size
    const eventsA = [];
    const eventsB = [];
    tabA.onChange((c) => eventsA.push(c));
    tabB.onChange((c) => eventsB.push(c));

    const batch = {
      kind: 'alloflow-packets-my-words',
      version: 1,
      words: [
        { word: 'cat', sounds: ['k', 'a', 't'] },
        { word: 'dog', sounds: ['d', 'o', 'g'] },
        { word: 'sun', sounds: ['s', 'u', 'n'] },
        { word: 'map', sounds: ['m', 'a', 'p'] },
        { word: 'ship', sounds: ['sh', 'i', 'p'] },
      ],
      media: [
        { key: 'pi\u00f1ata', picture: { dataUri: png(180), credit: { own: true } } },
        { key: '\u00d7', picture: { dataUri: png(190), credit: { own: true } } },
      ],
    };
    const imported = await tabA.importAll(batch);
    expect(imported.kept).toHaveLength(7);
    expect(imported.refused).toEqual([]);
    expect(eventsA).toEqual([{ word: '', action: 'put', here: true }]);
    expect(eventsB).toEqual([{ word: '', action: 'put', here: false }]);

    // Importing an empty batch emits ZERO notifications.
    eventsA.length = 0;
    eventsB.length = 0;
    const emptyImp = await tabA.importAll({ kind: 'alloflow-packets-my-words', version: 1, words: [] });
    expect(emptyImp).toEqual({ kept: [], refused: [] });
    expect(eventsA).toEqual([]);
    expect(eventsB).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // F7: packets.css 44px targets, 390px .top-menu & .foot a, forced-colors, print & zero class collisions
  // -------------------------------------------------------------------------
  it('F7: packets.css enforces 44px touch targets, narrow-screen menu alignment, forced-colors outlines, and ink-saving print rules with zero class collisions', () => {
    const css = read('packets.css');
    const verifyCss = read('packets-verify.css');

    // 44px (2.75rem) minimum touch targets
    expect(css).toMatch(/\.why summary \{[^}]*min-height:\s*2\.75rem;/);
    expect(css).toMatch(/\.try-present-btn \{[^}]*min-height:\s*2\.75rem;/);
    expect(css).toMatch(/\.try-present \.try-tab \{ display: flex; position: absolute; top: calc\(100% \+ 2px\);[^}]*min-height:\s*2\.75rem;/);

    // Narrow-screen (<30rem / 390px) .top-menu > nav left alignment & .foot a 44px touch height
    const narrowBlock = css.slice(css.indexOf('@media (max-width: 29.99rem)'));
    const narrowEnd = narrowBlock.indexOf('\n}\n');
    const narrow = narrowBlock.slice(0, narrowEnd);
    expect(narrow).toContain('.top-menu > nav { left: 0; right: auto; }');
    expect(narrow).toContain('.foot a { display: inline-flex; align-items: center; min-height: 2.75rem; }');

    // Forced-colors active pressed/primary visibility
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'), css.indexOf('@media print'));
    expect(forced).toContain('.try-hide[aria-pressed="true"], .try-present-btn[aria-pressed="true"]');
    expect(forced).toContain('.btn-primary, .card-main');

    // Print hides skip/proof/try-top and turns .card-main into white ground with black border & ink
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/\.top-menu, \.skip, \.proof, \.try-top \{ display: none !important; \}/);
    expect(print).toMatch(/\.card-main \{[^}]*background:\s*#ffffff;[^}]*border:[^;]*#000000;[^}]*color:\s*#000000;/);

    // Exact class intersection with packets-verify.css stays untouched
    const classesOf = (text) => new Set(text.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.[a-z][\w-]*/g).map((n) => n.slice(1)));
    const shared = [...classesOf(verifyCss)].filter((name) => classesOf(css).has(name)).sort();
    expect(shared).toEqual(['actions', 'brand', 'btn', 'foot', 'hint', 'kicker', 'plain-list', 'proof', 'rule-text', 'skip', 'steps-list', 'top', 'top-link', 'top-row', 'wrap']);
  });
});
