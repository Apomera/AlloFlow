import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Wave 1A: Closed-loop follow-up packet generation, 1-page printable student progress & UDL supports
// summary, and local MTSS triage export bridge on packets-results.html (zero network, zero innerHTML).
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const reader = require('../packets_results_reader.js');
const followup = require('../packets_followup.js');
const handoff = require('../packets_handoff.js');
const siteBuild = require('../dev-tools/build_packets_site.cjs');

const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;

const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const JUDGING = /at grade level|at[- ]risk|\bnormal\b|below benchmark|\bnorms?\b|\bnormed\b|\bnational(?:ly)?\b|percentile|\bproficien|\bdeficit|\bfailing\b/i;
const MATH_NOT_SAID = /\b(?:checks?|tests?|tested|testing|probes?|quiz(?:zes)?|assessments?|assess(?:es|ed|ing)?|screen(?:er|ing)s?|benchmarks?|norms?|normed|exams?|scores?|scored|secure|certified|guaranteed?|FERPA|evidence-based)\b|at grade level|grade-level/i;

const opened = [];
afterAll(() => {
  opened.forEach((w) => {
    try { w.close(); } catch (_) {}
  });
});

// ---------------------------------------------------------------------------
// Fixture builders (real take-home result schema -> real packetCsv)
// ---------------------------------------------------------------------------
const wall = (day, time, plus = 0) => new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
const utc = (local) => (local ? new Date(Date.parse(local)).toISOString() : '');
const seal = (result) => {
  const table = loader.resultsCsv(result);
  return table.text({ method: 'sha256', value: loader.sha256(table.basis).hex });
};

function makePracticeResult({
  sid,
  learner,
  day = '2026-11-10',
  time = '09:00:00',
  seconds = 180,
  packetId = 'ws-short-vowels',
  title = 'Short vowels',
  activityTitles = { isolation: 'Find Sounds', blending: 'Blend Sounds', missing_letter: 'Missing Letter' },
  items = [],
}) {
  const startedLocal = wall(day, time);
  const finishedLocal = wall(day, time, seconds);
  return {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    player: 'alloflow-word-sounds-take-home/2',
    sessionId: sid,
    packet: { id: packetId, version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
    lessonId: packetId,
    revision: 'r1',
    lessonTitle: title,
    activityTitles,
    learner,
    learnerName: learner,
    startedAt: utc(startedLocal),
    finishedAt: utc(finishedLocal),
    startedLocal,
    finishedLocal,
    durationMs: seconds * 1000,
    timesAreFromTheLearnerDevice: true,
    items: items.map((it, i) => ({
      n: i + 1,
      itemId: it.itemId || (it.activity + '-' + i),
      activity: it.activity,
      word: it.word,
      target: it.target != null ? it.target : it.word,
      responses: it.responses || [it.target || it.word],
      attempts: it.attempts != null ? it.attempts : (it.responses ? it.responses.length : 1),
      firstTry: it.firstTry !== undefined ? it.firstTry : true,
      correct: it.correct !== undefined ? it.correct : true,
      done: true,
      ms: it.ms != null ? it.ms : 2200,
      supports: it.supports || {},
      practice: it.practice || null,
      flag: it.flag || '',
    })),
  };
}

function makeMathCheckResult({
  sid,
  learner,
  day = '2026-11-17',
  time = '10:00:00',
  form = 'A',
  problems = [[7, '+', 8], [12, '-', 5], [9, '+', 6], [15, '-', 7], [8, '+', 8], [14, '-', 6], [6, '+', 7], [13, '-', 4]],
  wrong = {},
  elapsedS = 120,
  tools = [],
  untimed = false,
  directionsHeard = 0,
}) {
  const adapter = loader.CHECK_ADAPTERS.math_computation;
  const rows = [];
  const items = problems.map(([a, op, b], i) => {
    const right = String(op === '+' ? a + b : op === '-' ? a - b : a * b);
    const typed = String(wrong[i] != null ? wrong[i] : right);
    const mark = adapter.score({}, right, typed);
    rows.push({ practice: false, attempted: true, correct: mark.correct, digitsCorrect: mark.digitsCorrect, digitsPossible: mark.digitsPossible });
    return {
      n: i + 1,
      itemId: 'math_computation-' + i,
      activity: 'math_computation',
      word: a + ' ' + op + ' ' + b,
      target: right,
      responses: [typed],
      attempts: 1,
      firstTry: mark.correct,
      correct: mark.correct,
      done: true,
      ms: Math.floor((elapsedS * 1000) / problems.length),
      supports: {},
      practice: null,
      flag: '',
      digitsCorrect: mark.digitsCorrect,
      digitsPossible: mark.digitsPossible,
    };
  });
  const startedLocal = wall(day, time);
  const finishedLocal = wall(day, time, elapsedS + 10);
  const out = {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    player: 'alloflow-word-sounds-take-home/2',
    sessionId: sid,
    packet: { id: 'math-computation-g2', version: 'r5', engine: 'alloflow-packet/1', form, mode: 'check' },
    lessonId: 'math-computation-g2',
    revision: 'r5',
    lessonTitle: 'Math Fluency check (2' + form + ')',
    activityTitles: { math_computation: 'Math Fluency' },
    learner,
    learnerName: learner,
    startedAt: utc(startedLocal),
    finishedAt: utc(finishedLocal),
    startedLocal,
    finishedLocal,
    durationMs: (elapsedS + 10) * 1000,
    timesAreFromTheLearnerDevice: true,
    items,
  };
  out.score = loader.checkScore(
    { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: untimed ? null : 120, scoringVersion: 3, formVersion: 2 },
    rows,
    { elapsedMs: elapsedS * 1000, hiddenMs: 0, completion: 'complete', attempt: 1, flags: [] },
  );
  if (tools.length) out.score.tools = tools;
  if (untimed) out.score.untimed = true;
  if (directionsHeard) out.score.directionsHeard = directionsHeard;
  return out;
}

function makeReadAlongResult({ sid, learner, day = '2026-11-18' }) {
  const startedLocal = wall(day, '11:00:00');
  const finishedLocal = wall(day, '11:02:00');
  return {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    player: 'alloflow-word-sounds-take-home/2',
    sessionId: sid,
    packet: { id: 'read-along-kite', version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
    lessonId: 'read-along-kite',
    revision: 'r1',
    lessonTitle: 'Kite Story',
    activityTitles: { read_along: 'Read along' },
    learner,
    learnerName: learner,
    startedAt: utc(startedLocal),
    finishedAt: utc(finishedLocal),
    startedLocal,
    finishedLocal,
    durationMs: 120000,
    timesAreFromTheLearnerDevice: true,
    items: [
      { n: 1, itemId: 'ra-0', activity: 'read_along', word: 'The kite sailed.', target: '', responses: ['read'], attempts: 1, firstTry: false, correct: false, done: true, ms: 40000, supports: {}, practice: 'read', flag: '' },
      { n: 2, itemId: 'ra-1', activity: 'read_along', word: 'Mia smiled.', target: '', responses: ['played', '1: Mia (right)', '2: <b>fun</b> kite'], attempts: 1, firstTry: false, correct: false, done: true, ms: 50000, supports: {}, practice: 'played', flag: '' },
    ],
  };
}

function openResultsPage(options = {}) {
  const dom = new JSDOM(read('packets-results.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/packets-results.html',
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  const page = { w, d, files: [], downloads: [], printed: [], redirects: [], reached: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    w[name] = function () { page.reached.push(name); throw new Error(name + ' called'); };
  }
  w.navigator.sendBeacon = () => { page.reached.push('sendBeacon'); return false; };
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    page.downloads.push({
      name: this.getAttribute('download'),
      body: page.files[page.files.length - 1].body,
      type: page.files[page.files.length - 1].type,
    });
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.print = () => {
    page.printed.push({
      view: d.getElementById('view-group').hidden ? 'learner' : 'group',
      onePage: d.body.classList.contains('print-one-page-summary'),
      foldOpen: !!(d.getElementById('progress-sheet-fold') && d.getElementById('progress-sheet-fold').open),
    });
  };
  if (options.before) options.before(w);
  for (const script of d.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src');
    if (options.stubHandoff && src === 'packets_handoff.js') {
      w.AlloPacketHandoff = options.stubHandoff;
      continue;
    }
    w.eval(read(src));
  }
  if (!options.stubHandoff && w.AlloPacketHandoff) {
    w.AlloPacketHandoff.redirectDraft = (draft, href, openNewTab) => {
      if (options.rejectDraft) return Promise.reject(new Error('Storage unavailable.'));
      const clean = handoff.sanitizeDraft(draft);
      if (!clean) return Promise.reject(new Error('Invalid draft payload.'));
      page.redirects.push({ draft: clean, href, openNewTab });
      return Promise.resolve(true);
    };
  }
  page.$ = (id) => d.getElementById(id);
  page.file = (text, name) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: Date.now() });
  page.add = async (results) => {
    page.$('said').textContent = '';
    const files = results.map((r, i) => page.file(seal(r), 'res-' + r.sessionId + '-' + i + '.csv'));
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    page.$('main').dispatchEvent(ev);
    for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    if (!page.$('state-check').hidden && !page.$('show-results').hidden) page.$('show-results').click();
  };
  page.view = (name) => {
    const radio = d.querySelector('input[name="view"][value="' + name + '"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.learner = (label) => {
    page.view('learner');
    const sel = page.$('pick-learner');
    sel.value = [...sel.options].find((o) => o.textContent.startsWith(label + ' (')).value;
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  return page;
}

function loadMtssTesting() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://alloflow.test/',
  });
  const w = dom.window;
  opened.push(w);
  w.React = {
    createElement: () => null,
    useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  w.eval(read('mtss_triage_module.js'));
  return w.AlloModules.MtssTriage._testing;
}

// ---------------------------------------------------------------------------
// 1. Static CSP, Security, Privacy, Copy, Spelling, CSS & Site-Build checks
// ---------------------------------------------------------------------------
describe('Wave 1A static CSP, security, a11y, US spelling, and site-build invariants', () => {
  it('keeps packets_followup.js and modified files free of innerHTML, network APIs, third-party URLs, British spelling, judging copy, and AI references', () => {
    const files = ['packets_followup.js', 'packets-results.html', 'packets-results.css', 'packets-results.js'];
    for (const file of files) {
      const text = read(file);
      expect(text.match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [], file).toEqual([]);
      expect(BRITISH.exec(text), file).toBeNull();
      expect(JUDGING.exec(text), file).toBeNull();
      expect(text, file).not.toMatch(/benchmark/i);
      expect(text, file).not.toContain('Check a file');
      expect(text, file).not.toMatch(/no AI\b|Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
    }
    for (const jsFile of ['packets_followup.js', 'packets-results.js']) {
      const js = read(jsFile);
      expect(js, jsFile).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\.cssText|setAttribute\(\s*'style'/);
      expect(js, jsFile).not.toMatch(/\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|RTCPeerConnection|indexedDB|\.src\s*=|window\.open|location\s*\.\s*(?:href|assign|replace)|postMessage|importScripts/);
      expect(js, jsFile).not.toMatch(/\bAI\b/);
      expect(js, jsFile).not.toContain('AlloFlow Packets');
      for (const quoted of js.match(/'[\w./-]+\.(?:json|html|js|css|svg)'/g) || []) {
        expect(existsSync(quoted.slice(1, -1)), jsFile + ' -> ' + quoted).toBe(true);
      }
    }

    const html = read('packets-results.html');
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'))
      .toBe("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'");
    expect(doc.querySelectorAll('style')).toHaveLength(0);
    for (const node of doc.querySelectorAll('*')) {
      for (const attr of node.attributes) {
        expect(/^on|^style$/i.test(attr.name), node.tagName + ' ' + attr.name).toBe(false);
      }
    }
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src')))
      .toEqual(['packets-page.js', 'packets_handoff.js', 'packets_results_reader.js', 'packets_followup.js', 'packets-results.js']);
    const proofLoaded = [...doc.querySelectorAll('details.proof li')].find((li) => li.textContent.startsWith('This page loads'));
    expect(proofLoaded.textContent).toContain('This page loads nine files, all from this site');
    expect([...proofLoaded.querySelectorAll('code')].map((c) => c.textContent))
      .toEqual(['packets.css', 'packets-results.css', 'packets-page.js', 'packets_handoff.js', 'packets_results_reader.js', 'packets_followup.js', 'packets-results.js']);

    // CSS invariants: no :root/custom props, no hex before @media print, valid vars from packets.css, forced-colors + @media print.
    const css = read('packets-results.css');
    const sharedCss = read('packets.css');
    expect(css).not.toMatch(/:root|--[\w-]+\s*:|@import|url\(|@font-face|animation|@keyframes/i);
    const screenCss = css.slice(0, css.indexOf('@media print'));
    expect(screenCss.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    for (const v of new Set(css.match(/var\(--[\w-]+\)/g) || [])) {
      expect(sharedCss, v).toContain(v.slice(4, -1) + ':');
    }
    expect(css).toContain('body.print-one-page-summary');

    // Site build drift check passes and includes packets_followup.js cleanly.
    const plan = siteBuild.plan();
    expect(plan.files.has('packets_followup.js')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Closed-Loop Intervention ("Make follow-up packet from missed items")
// ---------------------------------------------------------------------------
describe('Feature 1: Closed-loop follow-up packet generation and maker #import-draft bridge', () => {
  it('deterministically extracts missed/retried items with interleaved mastered review items for Word Sounds, Vocabulary, and Math Facts', async () => {
    const wsRes = makePracticeResult({
      sid: 'ws-1',
      learner: 'BlueHeron7',
      items: [
        { activity: 'isolation', word: 'bed', target: 'd', responses: ['b', 'e'], attempts: 2, firstTry: false, correct: false },
        { activity: 'isolation', word: 'dog', target: 'o', responses: ['d', 'o'], attempts: 2, firstTry: false, correct: true },
        { activity: 'blending', word: 'cat', target: 'cat', responses: ['cat'], attempts: 1, firstTry: true, correct: true },
        { activity: 'blending', word: 'pig', target: 'pig', responses: ['pig'], attempts: 1, firstTry: true, correct: true },
        { activity: 'missing_letter', word: 'sun', target: 'u', responses: ['a', 'u'], attempts: 2, firstTry: false, correct: true },
      ],
    });
    const vocabRes = makePracticeResult({
      sid: 'vc-1',
      learner: 'BlueHeron7',
      packetId: 'vocab-science',
      title: 'Science words',
      activityTitles: { vocab_meaning: 'Word to meaning', vocab_blank: 'Fill the blank' },
      items: [
        { activity: 'vocab_meaning', word: 'habitat', target: 'habitat', responses: ['desert', 'habitat'], attempts: 2, firstTry: false, correct: true },
        { activity: 'vocab_blank', word: 'migrate', target: 'migrate', responses: ['freeze'], attempts: 1, firstTry: false, correct: false },
        { activity: 'vocab_meaning', word: 'canopy', target: 'canopy', responses: ['canopy'], attempts: 1, firstTry: true, correct: true },
        { activity: 'vocab_meaning', word: 'pollen', target: 'pollen', responses: ['pollen'], attempts: 1, firstTry: true, correct: true },
        { activity: 'vocab_meaning', word: 'erosion', target: 'erosion', responses: ['erosion'], attempts: 1, firstTry: true, correct: true },
      ],
    });
    const mathRes = makePracticeResult({
      sid: 'mp-1',
      learner: 'BlueHeron7',
      packetId: 'math-mul-7',
      title: 'Multiply by 7',
      activityTitles: { math_rehearsal: 'Fact rehearsal' },
      items: [
        { activity: 'math_rehearsal', word: '7 × 8', target: '56', responses: ['54', '56'], attempts: 2, firstTry: false, correct: true },
        { activity: 'math_rehearsal', word: '8 × 7', target: '56', responses: ['56'], attempts: 1, firstTry: true, correct: true }, // turnaround of missed 7x8 -> MUST be excluded from review!
        { activity: 'math_rehearsal', word: '6 × 7', target: '42', responses: ['48'], attempts: 1, firstTry: false, correct: false },
        { activity: 'math_rehearsal', word: '2 × 7', target: '14', responses: ['14'], attempts: 1, firstTry: true, correct: true },
        { activity: 'math_rehearsal', word: '3 × 7', target: '21', responses: ['21'], attempts: 1, firstTry: true, correct: true },
        { activity: 'math_rehearsal', word: '5 × 7', target: '35', responses: ['35'], attempts: 1, firstTry: true, correct: true },
        { activity: 'math_rehearsal', word: '4 × 7', target: '28', responses: ['28'], attempts: 1, firstTry: true, correct: true },
      ],
    });

    const sessions = [];
    for (const r of [wsRes, vocabRes, mathRes]) {
      sessions.push((await reader.read(seal(r), { name: r.sessionId + '.csv' })).sessions[0]);
    }
    const model = reader.addUp(sessions, {});
    const analysis = followup.analyzeFollowup({ scope: 'student', learner: model.learners[0] }, { reader });

    expect(analysis.hasAny).toBe(true);
    expect(analysis.list.map((t) => t.target)).toEqual(['word_sounds', 'vocab', 'math_practice']);

    // Word Sounds: missed [bed, dog, sun], review [cat, pig], pattern 'short vowels', interleaved cleanly, sanitizes via packets_handoff.
    const ws = analysis.targets.word_sounds;
    expect(ws.missedItems).toEqual(['bed', 'dog', 'sun']);
    expect(ws.reviewItems).toEqual(['cat', 'pig']);
    expect(ws.items).toEqual(['bed', 'dog', 'cat', 'sun', 'pig']);
    expect(ws.pattern).toBe('short vowels');
    expect(ws.activities).toEqual(['isolation', 'missing_letter']);
    const cleanWs = handoff.sanitizeDraft(ws.draft);
    expect(cleanWs).toMatchObject({ kind: 'word_sounds', words: ['bed', 'dog', 'cat', 'sun', 'pig'], pattern: 'short vowels', activities: ['isolation', 'missing_letter'] });

    // Vocabulary: 2 missed (migrate unresolved first, then habitat retried) + 2 mastered review -> 4 total so packets-vocab.html has 4 choices!
    const vc = analysis.targets.vocab;
    expect(vc.missedItems).toEqual(['migrate', 'habitat']);
    expect(vc.reviewItems).toEqual(['canopy', 'erosion']);
    expect(vc.items).toHaveLength(4);
    const cleanVc = handoff.sanitizeDraft(vc.draft);
    expect(cleanVc.kind).toBe('vocab');
    expect(cleanVc.entries.map((e) => e.word)).toEqual(vc.items);

    // Math Facts: missed [6 × 7, 7 × 8], review MUST NOT include turnaround 8 × 7!
    const mp = analysis.targets.math_practice;
    expect(mp.missedItems).toEqual(['6 × 7', '7 × 8']);
    expect(mp.reviewItems).not.toContain('8 × 7');
    expect(mp.reviewItems.length).toBeGreaterThanOrEqual(3);
    expect(mp.method).toBe('rehearsal');
    const cleanMp = handoff.sanitizeDraft(mp.draft);
    expect(cleanMp).toMatchObject({ kind: 'math_practice', method: 'rehearsal', missedFacts: ['6 × 7', '7 × 8'] });
  });

  it('wires Group view (including search-filtered class) and Individual Student view buttons to AlloPacketHandoff.redirectDraft', async () => {
    const page = openResultsPage();
    // Create 8 students so #group-search filter appears cleanly.
    const results = [
      makePracticeResult({
        sid: 'g-alpha-ws',
        learner: 'Alpha1',
        items: [
          { activity: 'isolation', word: 'ship', target: 'sh', responses: ['s'], attempts: 1, firstTry: false, correct: false },
          { activity: 'isolation', word: 'chat', target: 'ch', responses: ['chat'], attempts: 1, firstTry: true, correct: true },
        ],
      }),
      makePracticeResult({
        sid: 'g-beta-vc',
        learner: 'Beta2',
        packetId: 'vocab-1',
        title: 'Vocab',
        activityTitles: { vocab_meaning: 'Word to meaning' },
        items: [
          { activity: 'vocab_meaning', word: 'glacier', target: 'glacier', responses: ['river'], attempts: 1, firstTry: false, correct: false },
          { activity: 'vocab_meaning', word: 'delta', target: 'delta', responses: ['delta'], attempts: 1, firstTry: true, correct: true },
        ],
      }),
      makeMathCheckResult({ sid: 'g-gamma-m', learner: 'Gamma3', wrong: { 0: '14', 3: '9' } }),
      ...['Delta4', 'Echo5', 'Fox6', 'Grove7', 'Heron8'].map((name, i) =>
        makeMathCheckResult({ sid: 'g-ok-' + i, learner: name }),
      ),
    ];

    await page.add(results);

    // Unfiltered group view has all 3 follow-up target buttons.
    const groupBtns = [...page.$('group-followup').querySelectorAll('button.followup-launch')];
    expect(groupBtns.map((b) => b.getAttribute('data-followup-target'))).toEqual(['word_sounds', 'vocab', 'math_practice']);

    // Clicking group Math Facts button invokes AlloPacketHandoff.redirectDraft(..., true).
    groupBtns[2].click();
    await new Promise((r) => setTimeout(r, 15));
    expect(page.redirects).toHaveLength(1);
    expect(page.redirects[0].href).toBe('packets-math-practice.html');
    expect(page.redirects[0].openNewTab).toBe(true);
    expect(page.redirects[0].draft.kind).toBe('math_practice');
    expect(page.redirects[0].draft.missedFacts).toContain('7 + 8');
    expect(page.redirects[0].draft.reviewFacts.length).toBeGreaterThanOrEqual(3);

    // Filtering the group via #group-search narrows the group follow-up buttons strictly to matching students.
    const search = page.$('group-search');
    search.value = 'Alpha';
    search.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    const filteredBtns = [...page.$('group-followup').querySelectorAll('button.followup-launch')];
    expect(filteredBtns.map((b) => b.getAttribute('data-followup-target'))).toEqual(['word_sounds']);
    expect(page.$('group-followup').textContent).toContain('1 filtered student of 8');

    // Individual Student view renders follow-up card for Beta2 (vocab only) and launches draft cleanly.
    page.learner('Beta2');
    const learnerBtns = [...page.$('learner-followup-card').querySelectorAll('button.followup-launch')];
    expect(learnerBtns.map((b) => b.getAttribute('data-followup-target'))).toEqual(['vocab']);
    learnerBtns[0].click();
    await new Promise((r) => setTimeout(r, 15));
    expect(page.redirects).toHaveLength(2);
    expect(page.redirects[1].href).toBe('packets-vocab.html');
    expect(page.redirects[1].draft.kind).toBe('vocab');
    expect(page.redirects[1].draft.entries.map((e) => e.word)).toEqual(['glacier', 'delta']);
    expect(page.reached).toEqual([]);
  });

  it('packets-math-practice.html consumes #import-draft cleanly (rehearsal with >=3 review facts, ccc with <3) and passes copy rules', async () => {
    const mpJs = read('packets-math-practice.js');
    const draftSection = mpJs.slice(mpJs.indexOf('function applyMathPracticeDraft'), mpJs.indexOf('function goTo('));
    expect(BRITISH.exec(draftSection)).toBeNull();
    expect(MATH_NOT_SAID.exec(draftSection)).toBeNull();

    // Case A: >= 3 review facts -> opens in Step 2 with rehearsal mode and known facts populated.
    const draftA = {
      kind: 'math_practice',
      title: 'Follow-up Math Facts - BlueHeron7',
      missedFacts: ['7 × 8', '6 × 7'],
      reviewFacts: ['2 × 7', '3 × 7', '5 × 7', '8 × 7'], // 8 x 7 is turnaround of 7 x 8 -> must be filtered!
      method: 'rehearsal',
    };
    const domA = new JSDOM(read('packets-math-practice.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-math-practice.html#import-draft',
    });
    const wA = domA.window, dA = wA.document;
    opened.push(wA);
    wA.TextEncoder = TextEncoder;
    wA.TextDecoder = TextDecoder;
    wA.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    wA.URL.createObjectURL = () => 'blob:mp-draft-a';
    wA.URL.revokeObjectURL = () => {};
    for (const s of dA.querySelectorAll('script[src]')) {
      if (s.getAttribute('src') === 'packets_handoff.js') {
        wA.AlloPacketHandoff = { HASH: '#open-file', DRAFT_HASH: '#import-draft', takeDraft: () => Promise.resolve(handoff.sanitizeDraft(draftA)) };
        continue;
      }
      wA.eval(read(s.getAttribute('src')));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(wA.location.hash).toBe('');
    expect(dA.getElementById('step-2').hidden).toBe(false);
    expect(dA.getElementById('rehearse-note').hidden).toBe(false);
    expect(dA.getElementById('rehearse-note').textContent).toContain('Loaded 2 missed facts and 3 review facts');
    expect(MATH_NOT_SAID.exec(dA.getElementById('rehearse-note').textContent)).toBeNull();
    expect(BRITISH.exec(dA.getElementById('rehearse-note').textContent)).toBeNull();
    expect(dA.querySelector('input[name="method"][value="rehearsal"]').checked).toBe(true);
    expect(dA.getElementById('f-facts').value).toContain('7 × 8');
    expect(dA.getElementById('f-facts').value).not.toContain('8 × 7');

    // Case B: < 3 review facts -> selects Cover, Copy, Compare (ccc).
    const draftB = {
      kind: 'math_practice',
      title: 'Short Math Follow-up',
      missedFacts: ['9 + 6', '15 - 7'],
      reviewFacts: ['2 + 3'],
      method: 'ccc',
    };
    const domB = new JSDOM(read('packets-math-practice.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-math-practice.html#import-draft',
    });
    const wB = domB.window, dB = wB.document;
    opened.push(wB);
    wB.TextEncoder = TextEncoder;
    wB.TextDecoder = TextDecoder;
    wB.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    wB.URL.createObjectURL = () => 'blob:mp-draft-b';
    wB.URL.revokeObjectURL = () => {};
    for (const s of dB.querySelectorAll('script[src]')) {
      if (s.getAttribute('src') === 'packets_handoff.js') {
        wB.AlloPacketHandoff = { HASH: '#open-file', DRAFT_HASH: '#import-draft', takeDraft: () => Promise.resolve(handoff.sanitizeDraft(draftB)) };
        continue;
      }
      wB.eval(read(s.getAttribute('src')));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(dB.getElementById('step-2').hidden).toBe(false);
    expect(dB.querySelector('input[name="method"][value="ccc"]').checked).toBe(true);
    expect(dB.getElementById('rehearse-note').textContent).toContain('Loaded 2 missed facts and 1 review fact');
  });

  it('keeps existing results-page DOM/a11y/practice-only invariants intact and handles draft handoff errors cleanly', async () => {
    const page = openResultsPage({ rejectDraft: true });
    const pracOnly = makePracticeResult({
      sid: 'po-1',
      learner: 'BlueHeron7',
      items: [
        { activity: 'isolation', word: 'bed', target: 'd', responses: ['b'], firstTry: false, correct: false },
        { activity: 'isolation', word: 'cat', target: 'k', responses: ['k'], firstTry: true, correct: true },
        { activity: 'blending', word: 'dog', target: 'dog', responses: ['dig', 'dog'], firstTry: false, correct: true },
      ],
    });
    await page.add([pracOnly]);
    page.learner('BlueHeron7');

    // Direct h4 children of #learner-body remain strictly the two expected headings.
    expect([...page.$('learner-body').querySelectorAll(':scope > h4')].map((h) => h.textContent))
      .toEqual(['Most frequent wrong answers in practice', 'Every result, in date order']);

    // Practice-only results page never mentions check terminology.
    const resultsText = page.$('state-results').textContent;
    expect(resultsText).not.toMatch(/Checks: latest score|digits correct|items correct|No score/);
    expect(JUDGING.exec(resultsText)).toBeNull();
    expect(BRITISH.exec(resultsText)).toBeNull();

    // Every visible heading level never skips a level; all ids are unique; every button has type="button".
    const levels = [...page.d.querySelectorAll('h1, h2, h3, h4')].filter((n) => !n.closest('[hidden]')).map((n) => Number(n.tagName[1]));
    levels.forEach((lvl, i) => { if (i) expect(lvl - levels[i - 1]).toBeLessThanOrEqual(1); });
    const ids = [...page.d.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const btn of page.d.querySelectorAll('button')) expect(btn.getAttribute('type')).toBe('button');

    // Graceful status feedback when redirectDraft rejects (e.g. IndexedDB blocked).
    const launchBtn = page.$('learner-followup-card').querySelector('button.followup-launch');
    launchBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    expect(page.$('learner-followup-card').querySelector('.followup-status').textContent).toBe('Storage unavailable.');
    expect(page.$('said').textContent).toBe('Storage unavailable.');
  });
});

// ---------------------------------------------------------------------------
// 3. 1-Page Printable Student Progress & UDL Supports Summary
// ---------------------------------------------------------------------------
describe('Feature 2: 1-page printable student progress and UDL supports summary', () => {
  it('summarizes date range, trends, UDL supports with vs without accuracy, Read-Along, goals, and prints cleanly with zero XSS', async () => {
    const page = openResultsPage();
    const hostileName = 'BlueHeron7';
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    const checks = weeks.map((day, idx) => makeMathCheckResult({
      sid: 'chk-' + idx,
      learner: hostileName,
      day,
      elapsedS: Math.max(60, 120 - idx * 8),
      wrong: idx < 2 ? { 0: '14', 1: '9' } : idx < 4 ? { 3: '9' } : {},
      tools: idx >= 3 ? ['textLarger', 'readingFocus'] : [],
      directionsHeard: idx === 3 ? 2 : 0,
    }));
    const pracWithAndWithout = makePracticeResult({
      sid: 'prac-udl',
      learner: hostileName,
      day: '2026-11-12',
      items: [
        { activity: 'isolation', word: 'cat', target: 'k', responses: ['k'], firstTry: true, correct: true, supports: { wordReplays: 2 } },
        { activity: 'isolation', word: 'dog', target: 'o', responses: ['o'], firstTry: true, correct: true, supports: { hint: 1 } },
        { activity: 'isolation', word: 'bed', target: 'd', responses: ['b'], firstTry: false, correct: false, supports: {} },
        { activity: 'blending', word: 'cup', target: 'cup', responses: ['cap', 'cup'], firstTry: false, correct: true, supports: {} },
      ],
    });
    const ra = makeReadAlongResult({ sid: 'ra-1', learner: hostileName, day: '2026-11-18' });

    await page.add([...checks, pracWithAndWithout, ra]);
    page.learner(hostileName);

    // Enter a teacher goal and verify the 1-page summary refreshes live.
    const mathCard = [...page.d.querySelectorAll('.measure')].find((c) => c.querySelector('h4').textContent.includes('Math Fluency'));
    const goalInput = mathCard.querySelector('input.goal-input:not(.goal-date)');
    goalInput.value = '20';
    goalInput.dispatchEvent(new page.w.Event('input', { bubbles: true }));

    const sheet = page.$('student-progress-summary');
    expect(sheet).toBeTruthy();
    const text = sheet.textContent;
    expect(text).toContain('Oct 5 to Nov 18, 2026');
    expect(text).toContain('teacher goal 20');
    expect(text).toContain('larger text (3 sessions)');
    expect(text).toContain('reading focus line (3 sessions)');
    expect(text).toContain('Word audio replay (1 item)');
    expect(text).toContain('Worked hint (1 item)');
    expect(text).toContain('Graded items with supports:');
    expect(text).toContain('Without supports:');
    expect(text).toContain('Read-Along summary');
    expect(text).toContain('read 1 of 2 pages');
    expect(text).toContain('2 understanding answers recorded');
    expect(text).toContain('Top next-focus skills');
    // Hostile typed read-along answer never creates markup elements.
    expect(sheet.querySelectorAll('b, img, script, iframe')).toHaveLength(0);
    expect(JUDGING.exec(text)).toBeNull();
    expect(BRITISH.exec(text)).toBeNull();
    expect(text).not.toMatch(/benchmark/i);

    // Click Print 1-page progress summary -> opens fold, sets body.print-one-page-summary during print, restores on afterprint.
    const fold = page.$('progress-sheet-fold');
    expect(fold.open).toBe(false);
    page.$('print-progress-summary').click();
    expect(page.printed).toEqual([{ view: 'learner', onePage: true, foldOpen: true }]);
    page.w.dispatchEvent(new page.w.Event('afterprint'));
    expect(page.d.body.classList.contains('print-one-page-summary')).toBe(false);
    expect(fold.open).toBe(false);

    // Normal Print this student never activates print-one-page-summary.
    page.$('print-learner').click();
    expect(page.printed[1]).toMatchObject({ view: 'learner', onePage: false });
  });
});

// ---------------------------------------------------------------------------
// 4. Local MTSS Triage Export Bridge
// ---------------------------------------------------------------------------
describe('Feature 3: Local MTSS triage JSON export bridge and mtss_triage_module compatibility', () => {
  it('deterministically computes Tier 1/2/3 risk bands, downloads locally, and validates cleanly against mtss_triage_module.js', async () => {
    const mtss = loadMtssTesting();
    const page = openResultsPage();

    // 3 students with clearly separated performance across checks + practice:
    // HighHawk1 -> Tier 1 (high check + 100% practice)
    // MidWren2 -> Tier 2 (mid check + 70% practice)
    // LowFinch3 -> Tier 3 (low check + 40% practice declining)
    const files = [
      makeMathCheckResult({ sid: 'm-h1', learner: 'HighHawk1', day: '2026-11-10', elapsedS: 60, wrong: {} }),
      makePracticeResult({
        sid: 'p-h1',
        learner: 'HighHawk1',
        day: '2026-11-12',
        items: ['cat', 'dog', 'sun', 'pig', 'hat'].map((w) => ({ activity: 'isolation', word: w, target: w[0], responses: [w[0]], firstTry: true, correct: true })),
      }),
      makeMathCheckResult({ sid: 'm-m1', learner: 'MidWren2', day: '2026-11-10', elapsedS: 100, wrong: { 0: '99', 1: '99' }, tools: ['textLarger'] }),
      makePracticeResult({
        sid: 'p-m1',
        learner: 'MidWren2',
        day: '2026-11-12',
        items: [
          { activity: 'isolation', word: 'cat', target: 'c', responses: ['c'], firstTry: true, correct: true },
          { activity: 'isolation', word: 'dog', target: 'd', responses: ['d'], firstTry: true, correct: true },
          { activity: 'isolation', word: 'sun', target: 's', responses: ['s'], firstTry: true, correct: true },
          { activity: 'isolation', word: 'pig', target: 'p', responses: ['b', 'p'], firstTry: false, correct: true },
        ],
      }),
      makeMathCheckResult({ sid: 'm-l1', learner: 'LowFinch3', day: '2026-11-03', elapsedS: 120, wrong: { 0: '99', 1: '99', 2: '99', 3: '99' } }),
      makeMathCheckResult({ sid: 'm-l2', learner: 'LowFinch3', day: '2026-11-10', elapsedS: 120, wrong: { 0: '99', 1: '99', 2: '99', 3: '99', 4: '99' } }),
      makePracticeResult({
        sid: 'p-l1',
        learner: 'LowFinch3',
        day: '2026-11-12',
        items: [
          { activity: 'isolation', word: 'bed', target: 'b', responses: ['d'], firstTry: false, correct: false },
          { activity: 'isolation', word: 'dog', target: 'd', responses: ['b'], firstTry: false, correct: false },
          { activity: 'isolation', word: 'pig', target: 'p', responses: ['q'], firstTry: false, correct: false },
          { activity: 'isolation', word: 'cat', target: 'c', responses: ['c'], firstTry: true, correct: true },
          { activity: 'isolation', word: 'hat', target: 'h', responses: ['h'], firstTry: true, correct: true },
        ],
      }),
    ];

    await page.add(files);
    expect(page.$('export-mtss').disabled).toBe(false);
    page.$('export-mtss').click();

    expect(page.downloads).toHaveLength(1);
    const dl = page.downloads[0];
    expect(dl.name).toMatch(/^mtss-triage__\d{4}-\d{2}-\d{2}\.json$/);
    expect(dl.type).toBe('application/json');
    expect(page.reached).toEqual([]);
    expect(page.w.localStorage.length).toBe(0);

    const payload = JSON.parse(dl.body);
    expect(payload.kind).toBe('alloflow-packets-mtss-triage');
    expect(payload.schemaVersion).toBe(1);
    expect(payload.summary).toEqual({ totalStudents: 3, tier1: 1, tier2: 1, tier3: 1, unscored: 0 });

    const byCode = Object.fromEntries(payload.students.map((s) => [s.studentCode, s]));
    expect(byCode.HighHawk1.suggestedTier).toBe(1);
    expect(byCode.MidWren2.suggestedTier).toBe(2);
    expect(byCode.MidWren2.udlSupportsUsed).toContain('larger text');
    expect(byCode.LowFinch3.suggestedTier).toBe(3);
    expect(byCode.LowFinch3.trendDirection).toBe('declining');

    // Cross-verify EVERY exported dataset directly with mtss_triage_module.js functions!
    expect(payload.datasets.length).toBeGreaterThanOrEqual(2);
    for (const ds of payload.datasets) {
      expect(mtss.mtssValidateCuts(ds.cutpoints), ds.label).toBeNull();
      const board = mtss.mtssBoard(ds);
      expect(board.invalid, ds.label).toEqual([]);
      expect(board.total, ds.label).toBe(ds.rows.length);
      const parsed = mtss.mtssParsePaste(ds.pasteCsv);
      expect(parsed.rows, ds.label).toHaveLength(ds.rows.length);
      const csv = mtss.mtssCsv(ds);
      expect(csv).toContain('student_code,score,suggested_tier');
    }

    // Suggested groups match allo_mtss_groups_v1 schema.
    expect(payload.suggestedGroups.map((g) => [g.name, g.members])).toEqual([
      ['Tier 3 review group', ['LowFinch3']],
      ['Tier 2 review group', ['MidWren2']],
    ]);
    for (const g of payload.suggestedGroups) {
      expect(typeof g.id).toBe('string');
      expect(typeof g.measure).toBe('string');
      expect(typeof g.window).toBe('string');
      expect(g.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(page.$('take-said').textContent).toContain('Tier 1: 1, Tier 2: 1, Tier 3: 1');
  });

  it('uses teacher goals for MTSS cutpoints when entered, keeps unscored Read-Along students out of tiers, and stays safe on hostile code names', async () => {
    const mtss = loadMtssTesting();
    const page = openResultsPage();
    await page.add([
      makeMathCheckResult({ sid: 'tg-1', learner: '<img src=x onerror=alert(1)>', day: '2026-11-10', elapsedS: 60 }),
      makeReadAlongResult({ sid: 'tg-ra', learner: '__proto__', day: '2026-11-11' }),
    ]);
    page.learner('<img src=x onerror=alert(1)>');
    const goalInput = page.d.querySelector('.measure input.goal-input:not(.goal-date)');
    goalInput.value = '25';
    goalInput.dispatchEvent(new page.w.Event('input', { bubbles: true }));

    page.$('export-mtss').click();
    const payload = JSON.parse(page.downloads[0].body);
    expect(payload.datasets[0].cutSource).toBe('teacher_goals');
    expect(payload.datasets[0].cutpoints).toEqual({ higherBetter: true, tier2Cut: 20, tier3Cut: 15 });
    expect(mtss.mtssValidateCuts(payload.datasets[0].cutpoints)).toBeNull();
    expect(payload.summary.unscored).toBe(1);
    const protoRow = payload.students.find((s) => s.studentCode === '__proto__');
    expect(protoRow.suggestedTier).toBeNull();
    expect(page.d.querySelectorAll('main img, main script, main iframe')).toHaveLength(0);
    expect(({}).polluted).toBeUndefined();
  });
});
