import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const reader = require('../packets_results_reader.js');
const PC = require('../packet_check_builder.js');
const MP = require('../packet_math_practice_builder.js');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();

const lender = { crypto: webcrypto };
lender.window = lender;
new Function('window', read('word_sounds_take_home_loader.js')).call(lender, lender);
const loader = lender.AlloWordSoundsTakeHome;

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const wav = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF');
  b.write('WAVE', 8);
  b.write(String(tag).slice(0, 8), 44);
  return b.toString('base64');
};
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);

const wall = (day, time = '10:00:00', plus = 0) =>
  new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
const utc = (local) => (local ? new Date(Date.parse(local)).toISOString() : '');
const sealed = (result) => {
  const table = loader.resultsCsv(result);
  return { table, integrity: { method: 'sha256', value: loader.sha256(table.basis).hex } };
};
const csvOf = (result) => sealed(result).table.text(sealed(result).integrity);

function makePractice(over = {}) {
  const o = {
    sid: 'p-w4-1',
    learner: 'BlueHeron7',
    day: '2026-11-03',
    packetId: 'ws-short-vowels',
    title: 'Short vowels',
    answers: [
      { activity: 'isolation', word: 'cat', target: 'k', picks: ['t', 'k'], missed: false },
      { activity: 'isolation', word: 'bed', target: 'd', picks: ['b', 'e'], missed: true },
    ],
    ...over,
  };
  const startedLocal = wall(o.day, '15:00:00');
  const finishedLocal = wall(o.day, '15:00:00', 180);
  return {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    player: 'alloflow-word-sounds-take-home/2',
    sessionId: o.sid,
    packet: { id: o.packetId, version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
    lessonId: o.packetId,
    revision: 'r1',
    lessonTitle: o.title,
    activityTitles: { isolation: 'Find Sounds', vocab_meaning: 'Vocabulary meaning' },
    learner: o.learner,
    learnerName: o.learner,
    startedAt: utc(startedLocal),
    finishedAt: utc(finishedLocal),
    startedLocal,
    finishedLocal,
    durationMs: 180000,
    timesAreFromTheLearnerDevice: true,
    items: o.answers.map((a, i) => ({
      n: i + 1,
      itemId: a.activity + '-' + i,
      activity: a.activity,
      word: a.word,
      target: a.target,
      responses: a.picks,
      attempts: a.picks.length,
      firstTry: a.picks.length === 1 && !a.missed,
      correct: !a.missed,
      done: true,
      ms: 2000,
      supports: {},
      practice: null,
      flag: '',
    })),
  };
}

const PROBLEMS = [[7, '+', 8], [12, '-', 5], [9, '+', 6], [15, '-', 7], [8, '+', 8], [14, '-', 6], [23, '+', 14], [36, '-', 12]];
function makeCheck(over = {}) {
  const o = {
    sid: 'c-w4-1',
    learner: 'BlueHeron7',
    day: '2026-11-10',
    form: 'A',
    done: 8,
    wrong: {},
    elapsedS: 120,
    tools: null,
    ...over,
  };
  const adapter = loader.CHECK_ADAPTERS.math_computation;
  const rows = [];
  const items = PROBLEMS.map(([a, op, b], i) => {
    const right = String(op === '+' ? a + b : a - b);
    const attempted = i < o.done;
    const typed = attempted ? String(o.wrong[i] != null ? o.wrong[i] : right) : null;
    const mark = attempted ? adapter.score({}, right, typed) : null;
    rows.push({
      practice: false,
      attempted,
      correct: !!(mark && mark.correct),
      digitsCorrect: mark ? mark.digitsCorrect : null,
      digitsPossible: mark ? mark.digitsPossible : null,
    });
    return {
      n: i + 1,
      itemId: 'math_computation-' + i,
      activity: 'math_computation',
      word: a + ' ' + op + ' ' + b,
      target: right,
      responses: attempted ? [typed] : [],
      attempts: attempted ? 1 : 0,
      firstTry: !!(mark && mark.correct),
      correct: !!(mark && mark.correct),
      done: attempted,
      ms: attempted ? 4000 : 0,
      supports: {},
      practice: null,
      flag: '',
      digitsCorrect: mark ? mark.digitsCorrect : null,
      digitsPossible: mark ? mark.digitsPossible : null,
    };
  });
  const startedLocal = wall(o.day, '09:00:00');
  const finishedLocal = wall(o.day, '09:00:00', o.elapsedS + 10);
  const out = {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    player: 'alloflow-word-sounds-take-home/2',
    sessionId: o.sid,
    packet: { id: 'math-computation-g2', version: 'r1', engine: 'alloflow-packet/1', form: o.form, mode: 'check' },
    lessonId: 'math-computation-g2',
    revision: 'r1',
    lessonTitle: 'Math Fluency check (2A)',
    activityTitles: { math_computation: 'Math Fluency' },
    learner: o.learner,
    learnerName: o.learner,
    startedAt: utc(startedLocal),
    finishedAt: utc(finishedLocal),
    startedLocal,
    finishedLocal,
    durationMs: (o.elapsedS + 10) * 1000,
    timesAreFromTheLearnerDevice: true,
    items,
  };
  out.score = loader.checkScore(
    { measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3, formVersion: 2 },
    rows,
    { elapsedMs: o.elapsedS * 1000, hiddenMs: 0, completion: o.done < PROBLEMS.length ? 'time' : 'complete', attempt: 1, flags: [] },
  );
  if (o.tools) out.score.tools = o.tools;
  return out;
}

function openResultsPage({ clipboard = true } = {}) {
  const dom = new JSDOM(read('packets-results.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/packets-results.html',
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const copied = [];
  if (clipboard) {
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text) => { copied.push(text); return Promise.resolve(); } },
    });
  } else {
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
  }
  for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));
  const $ = (id) => d.getElementById(id);
  const drop = async (results) => {
    $('said').textContent = '';
    const files = results.map((r, i) => new w.File([csvOf(r)], `res-${r.sessionId}-${i}.csv`, { type: 'text/csv', lastModified: Date.now() }));
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    $('main').dispatchEvent(ev);
    for (let i = 0; i < 600 && !/\bread[,.]/.test($('said').textContent); i++) await new Promise((r) => setTimeout(r, 10));
    if (!$('state-check').hidden && !$('show-results').hidden) $('show-results').click();
  };
  const view = (name) => {
    const radio = d.querySelector(`input[name="view"][value="${name}"]`);
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  return { w, d, $, copied, drop, view };
}

function makeAdapterHarness(adapter, extraCtx = {}) {
  const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { pretendToBeVisual: true, url: 'https://packet.test/p.html' });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  const root = d.getElementById('root');
  let keyHandler = null;
  const played = [];
  const supports = [];
  const announced = [];
  const answers = [];
  let done = false;
  let attempts = 0;

  const el = (tag, attrs, kids) => {
    const node = d.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = String(v);
      else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => node.addEventListener(ev, fn));
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach((c) => {
      if (c != null && c !== false) node.append(typeof c === 'string' ? d.createTextNode(c) : c);
    });
    return node;
  };

  const L = Object.assign({}, loader.DEFAULT_LABELS, adapter.labels || {});
  const ctx = {
    root,
    el,
    L,
    fmt: (s, p) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? p[k] : m)),
    play: (id, rate) => { played.push({ id, rate: rate || 1 }); return Promise.resolve(true); },
    playAll: (ids) => { played.push({ all: ids }); return Promise.resolve(true); },
    stop: () => {},
    announce: (t) => announced.push(t),
    support: (name) => supports.push(name),
    isDone: () => done,
    attempts: () => attempts,
    showLetters: true,
    image: () => null,
    keys: (fn) => { keyHandler = fn; },
    answer: (val, right) => {
      attempts++;
      answers.push({ val, right });
      if (right) done = true;
      return right ? 'correct' : 'retry';
    },
    practice: (status, text) => { done = true; answers.push({ practice: status, text }); },
    ...extraCtx,
  };
  return {
    w, d, root, ctx, played, supports, announced, answers,
    pressKey: (k) => (keyHandler ? keyHandler(k) : false),
    setDone: (v) => { done = v; },
  };
}

// ============================================================================
// 1. Results Dashboard (Wave 4)
// ============================================================================
describe('Wave 4 Results Dashboard', () => {
  it('adds exact .top-menu switcher to packets-results.html, opens check-missed-fold on beforeprint, and merges duplicate Present & print buttons', async () => {
    const html = read('packets-results.html');
    const doc = new JSDOM(html).window.document;
    const menuLinks = [...doc.querySelectorAll('header.top .top-menu nav a')].map((a) => [a.getAttribute('href'), a.textContent]);
    expect(menuLinks).toEqual([
      ['packets-make.html', 'Word Sounds'],
      ['packets-vocab.html', 'Vocabulary'],
      ['packets-math-practice.html', 'Math Fact Practice'],
      ['packets-check.html', 'Math Check'],
      ['packets-read-along.html', 'Read-Along'],
      ['packets-symbol-runner.html', 'Symbol Runner'],
      ['packets-present-export.html', 'Present & print'],
      ['packets-results.html', 'Add up results'],
    ]);
    const css = read('packets-results.css');
    expect(css.slice(css.indexOf('@media print'))).toMatch(/\.check-missed-fold > summary/);
    expect(css.slice(0, css.indexOf('@media print'))).not.toMatch(/#[0-9a-f]{3,8}\b/i);

    const page = openResultsPage();
    await page.drop([
      makePractice({
        sid: 'merge-v1', learner: 'BlueHeron7',
        answers: [
          { activity: 'vocab_meaning', word: 'habitat', target: 'home', picks: ['rock'], missed: true },
          { activity: 'vocab_meaning', word: 'cat', target: 'pet', picks: ['dog'], missed: true },
        ],
      }),
      makePractice({
        sid: 'merge-w1', learner: 'BlueHeron7',
        answers: [
          { activity: 'isolation', word: 'cat', target: 'k', picks: ['t'], missed: true },
          { activity: 'isolation', word: 'ship', target: 'sh', picks: ['s'], missed: true },
        ],
      }),
      makePractice({
        sid: 'merge-w2', learner: 'RedFox3',
        answers: [{ activity: 'isolation', word: 'ship', target: 'sh', picks: ['s'], missed: true }],
      }),
      makeCheck({ sid: 'merge-c1', learner: 'BlueHeron7', wrong: { 0: 14, 2: 19 } }),
    ]);

    // Group view: single merged & deduplicated Present & print button
    const groupPresent = [...page.$('group-missed').querySelectorAll('a.nav-new-tab')]
      .filter((a) => a.getAttribute('href').startsWith('packets-present-export.html#words='));
    expect(groupPresent).toHaveLength(1);
    const groupWords = decodeURIComponent(groupPresent[0].getAttribute('href').split('#words=')[1]).split(',');
    expect(groupWords.filter((w) => w.toLowerCase() === 'cat')).toHaveLength(1);
    expect(groupWords).toEqual(expect.arrayContaining(['habitat', 'cat', 'ship']));

    // One-student view: single merged Present & print button + check-missed-fold opens on beforeprint & closes on afterprint
    page.view('learner');
    const learnerPresent = [...page.$('learner-body').querySelectorAll('a.nav-new-tab')]
      .filter((a) => a.getAttribute('href').startsWith('packets-present-export.html#words='));
    expect(learnerPresent).toHaveLength(1);
    const learnerWords = decodeURIComponent(learnerPresent[0].getAttribute('href').split('#words=')[1]).split(',');
    expect(learnerWords.filter((w) => w.toLowerCase() === 'cat')).toHaveLength(1);
    expect(learnerWords).toEqual(expect.arrayContaining(['habitat', 'cat', 'ship']));

    const cmFold = page.$('learner-body').querySelector('details.check-missed-fold');
    expect(cmFold.open).toBe(false);
    page.w.dispatchEvent(new page.w.Event('beforeprint'));
    expect(cmFold.open).toBe(true);
    page.w.dispatchEvent(new page.w.Event('afterprint'));
    expect(cmFold.open).toBe(false);
  });

  it('copies descriptive plain-text MTSS/IEP student summary with clipboard + readonly textarea fallback', async () => {
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    const checks = weeks.map((day, i) => makeCheck({
      sid: 'sum-c-' + i,
      learner: 'BlueHeron7',
      day,
      done: i + 2,
      wrong: i === 5 ? { 0: 14 } : {},
      tools: i === 5 ? ['textLarger', 'readingFocus'] : null,
    }));
    const prac = makePractice({ sid: 'sum-p-1', learner: 'BlueHeron7', day: '2026-11-04' });

    const page = openResultsPage({ clipboard: true });
    await page.drop([...checks, prac]);
    page.view('learner');

    // Add goal, goal date, and paper score
    const mathCard = [...page.d.querySelectorAll('.measure')].find((c) => c.querySelector('h4').textContent.includes('Math Fluency'));
    const goalIn = mathCard.querySelector('input.goal-input:not(.goal-date)');
    const dateIn = mathCard.querySelector('input.goal-date');
    goalIn.value = '12';
    goalIn.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    dateIn.value = '2026-12-21';
    dateIn.dispatchEvent(new page.w.Event('change', { bubbles: true }));
    page.$('paper-date').value = '2026-11-12';
    page.$('paper-score').value = '9';
    page.$('paper-note').value = 'Printed form A';
    page.$('paper-go').click();

    page.$('copy-summary').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(page.copied).toHaveLength(1);
    const txt = page.copied[0];
    expect(txt).toContain('Student: BlueHeron7');
    expect(txt).toContain('Oct 5 to Nov 9, 2026');
    expect(txt).toContain('Goal typed by the teacher: 12 digits correct per minute, by Dec 21, 2026.');
    expect(txt).toContain('Aim line:');
    expect(txt).toContain('Growth per week (6 or more scores):');
    expect(txt).toContain('Paper scores (kept apart from file scores): Nov 12, 2026: 9 digits correct per minute (Printed form A).');
    expect(txt).toContain('Practice strands:');
    expect(txt).toContain('Hearing sounds');
    expect(txt).toContain('Reading tools used: larger text, reading focus line.');
    expect(txt).toContain('Top missed items on checks: 7 + 8');
    expect(txt).toContain('This compares students in these files with each other.');
    expect(txt).not.toContain('!');
    expect(txt).not.toMatch(/\blearners?\b/i);
    expect(txt).not.toMatch(/benchmark|at grade level|at[- ]risk|\bnormal\b|percentile|\bproficien|\bdeficit|\bfailing\b|\bAI\b/i);
    expect(page.$('take-said').textContent).toBe('Copied a plain-text summary for BlueHeron7.');

    // Clipboard denial opens readonly textarea fallback
    const noClip = openResultsPage({ clipboard: false });
    await noClip.drop([checks[0], prac]);
    noClip.view('learner');
    noClip.$('copy-summary').click();
    await new Promise((r) => setTimeout(r, 20));
    const box = noClip.$('copy-summary-box').querySelector('textarea.copy-summary-box');
    expect(box).toBeTruthy();
    expect(box.readOnly).toBe(true);
    expect(box.value).toContain('Student: BlueHeron7');
    expect(noClip.$('copy-summary-box').hidden).toBe(false);
  });

  it('progressively discloses Find a student at >= 8 students and Newest first + All/Checks/Practice at >= 6 sessions', async () => {
    // 7 students: NO #group-search
    const seven = openResultsPage();
    await seven.drop(Array.from({ length: 7 }, (_, i) => makePractice({ sid: 'g7-' + i, learner: 'Student' + (i + 1) })));
    expect(seven.$('group-search')).toBeNull();

    // 8 students: #group-search appears and filters rows without replacing the input element
    const eight = openResultsPage();
    const names = ['BlueHeron1', 'BlueHeron2', 'RedFox3', 'GoldFinch4', 'GrayOwl5', 'GreenTurtle6', 'SilverWren7', 'CopperJay8'];
    await eight.drop(names.map((n, i) => makePractice({ sid: 'g8-' + i, learner: n })));
    const search = eight.$('group-search');
    expect(search).toBeTruthy();
    expect(eight.d.querySelector('label[for="group-search"]').textContent).toBe('Find a student');
    search.value = 'heron';
    search.dispatchEvent(new eight.w.Event('input', { bubbles: true }));
    expect(eight.$('group-search')).toBe(search);
    expect(eight.$('group-table').querySelectorAll('tbody tr')).toHaveLength(2);
    expect(eight.$('group-filter-count').textContent).toBe('Showing 2 of 8 students.');

    // 5 sessions: NO session controls
    const five = openResultsPage();
    await five.drop(Array.from({ length: 5 }, (_, i) => makePractice({ sid: 's5-' + i, learner: 'Ana', day: `2026-11-0${i + 1}` })));
    five.view('learner');
    expect(five.$('sessions-newest')).toBeNull();

    // 6 sessions (3 checks + 3 practice): controls appear, sort newest first, and filter Checks / Practice
    const six = openResultsPage();
    await six.drop([
      makePractice({ sid: 's6-1', learner: 'Ana', day: '2026-11-01' }),
      makeCheck({ sid: 's6-2', learner: 'Ana', day: '2026-11-02' }),
      makePractice({ sid: 's6-3', learner: 'Ana', day: '2026-11-03' }),
      makeCheck({ sid: 's6-4', learner: 'Ana', day: '2026-11-04' }),
      makePractice({ sid: 's6-5', learner: 'Ana', day: '2026-11-05' }),
      makeCheck({ sid: 's6-6', learner: 'Ana', day: '2026-11-06' }),
    ]);
    six.view('learner');
    const getDates = () => {
      const tbl = [...six.$('learner-body').querySelectorAll(':scope > .table-scroll table')].pop();
      return [...tbl.querySelectorAll('tbody tr')].map((tr) => tr.firstElementChild.textContent);
    };
    expect(getDates()[0]).toBe('Nov 1, 2026');
    const newest = six.$('sessions-newest');
    expect(newest).toBeTruthy();
    newest.click();
    expect(newest.getAttribute('aria-pressed')).toBe('true');
    expect(getDates()[0]).toBe('Nov 6, 2026');

    six.d.querySelector('[data-session-kind="check"]').click();
    expect(getDates()).toEqual(['Nov 6, 2026', 'Nov 4, 2026', 'Nov 2, 2026']);
    six.d.querySelector('[data-session-kind="practice"]').click();
    expect(getDates()).toEqual(['Nov 5, 2026', 'Nov 3, 2026', 'Nov 1, 2026']);
  });
});

// ============================================================================
// 2. Practice Adapters (Wave 4)
// ============================================================================
describe('Wave 4 Practice Adapters', () => {
  it('mapping.js supports 1-9 pick/place, Escape drop, Backspace pop, Enter with onBtn guard, and Clear focus return', () => {
    const adapter = loader.ADAPTERS.mapping;
    const h = makeAdapterHarness(adapter);
    const item = {
      word: 'cat',
      target: 'c a t',
      graphemes: ['c', 'a', 't'],
      chips: [
        { text: 't', audio: 't' },
        { text: 'c', audio: 'c' },
        { text: 'a', audio: 'a' },
      ],
      wordAudio: 'cat',
      promptAudio: 'p',
    };
    adapter.render(item, h.ctx);

    // 2 picks up chip index 1 ('c'), Escape drops it
    expect(h.pressKey('2')).toBe(true);
    expect(h.root.querySelector('[data-map-tile="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(h.pressKey('Escape')).toBe(true);
    expect(h.root.querySelector('[data-map-tile="1"]').getAttribute('aria-pressed')).toBe('false');

    // 2 picks 'c', 1 places into slot 0
    expect(h.pressKey('2')).toBe(true);
    expect(h.pressKey('1')).toBe(true);
    expect(h.root.querySelector('[data-map-slot="0"]').textContent).toBe('c');

    // 3 picks 'a'; Enter while focused on a button is ignored (onBtn guard), Enter off button places into first empty slot (slot 1)
    expect(h.pressKey('3')).toBe(true);
    const clearBtn = [...h.root.querySelectorAll('button')].find((b) => b.textContent === 'Empty the slots');
    clearBtn.focus();
    expect(h.pressKey('Enter')).toBe(false);
    clearBtn.blur();
    expect(h.pressKey('Enter')).toBe(true);
    expect(h.root.querySelector('[data-map-slot="1"]').textContent).toBe('a');

    // Backspace pops slot 1 ('a')
    expect(h.pressKey('Backspace')).toBe(true);
    expect(h.root.querySelector('[data-map-slot="1"]').textContent).toBe('2');

    // Clear returns focus to first tile
    clearBtn.click();
    expect(h.d.activeElement).toBe(h.root.querySelector('[data-map-tile="0"]'));
  });

  it('syllable_counting.js binds Enter to submit Check when ready and respects onBtn guard', async () => {
    const adapter = loader.ADAPTERS.syllable_counting;
    const h = makeAdapterHarness(adapter);
    adapter.render({ word: 'tiger', count: 2, target: '2', wordAudio: 'w', promptAudio: 'p' }, h.ctx);
    await new Promise((r) => setTimeout(r, 15));

    // Tap twice via Space
    expect(h.pressKey(' ')).toBe(true);
    expect(h.pressKey(' ')).toBe(true);

    // Focused on Reset button -> Enter must NOT hijack button activation
    const resetBtn = [...h.root.querySelectorAll('button')].find((b) => b.textContent === 'Reset');
    resetBtn.focus();
    expect(h.pressKey('Enter')).toBe(false);
    expect(h.answers).toHaveLength(0);

    // Blur -> Enter submits Check
    resetBtn.blur();
    expect(h.pressKey('Enter')).toBe(true);
    expect(h.answers).toEqual([{ val: '2', right: true }]);
  });

  it('segmentation.js and word_scramble.js drop held tile on Escape and return focus to first tile on Clear', () => {
    const seg = loader.ADAPTERS.segmentation;
    const hs = makeAdapterHarness(seg);
    seg.render({
      word: 'cat',
      sounds: ['k', 'a', 't'],
      chips: [{ label: 'k', audio: 'k' }, { label: 'a', audio: 'a' }, { label: 't', audio: 't' }],
      wordAudio: 'cat',
      promptAudio: 'p',
    }, hs.ctx);
    expect(hs.pressKey('1')).toBe(true);
    expect(hs.root.querySelector('[data-seg-tile="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(hs.pressKey('Escape')).toBe(true);
    expect(hs.root.querySelector('[data-seg-tile="0"]').getAttribute('aria-pressed')).toBe('false');
    const segClear = [...hs.root.querySelectorAll('button')].find((b) => b.textContent === 'Empty the boxes');
    segClear.click();
    expect(hs.d.activeElement).toBe(hs.root.querySelector('[data-seg-tile="0"]'));

    const ws = loader.ADAPTERS.word_scramble;
    const hw = makeAdapterHarness(ws);
    ws.render({ word: 'cat', target: 'cat', letters: ['t', 'c', 'a'], wordAudio: 'cat', promptAudio: 'p' }, hw.ctx);
    hw.root.querySelector('[data-ws-tile="0"]').click();
    expect(hw.root.querySelector('[data-ws-tile="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(hw.pressKey('Escape')).toBe(true);
    expect(hw.root.querySelector('[data-ws-tile="0"]').getAttribute('aria-pressed')).toBe('false');
    const wsClear = [...hw.root.querySelectorAll('button')].find((b) => b.textContent === 'Clear');
    wsClear.click();
    expect(hw.d.activeElement).toBe(hw.root.querySelector('[data-ws-tile="0"]'));
  });

  it('letter_tracing.js supports Undo stroke while preserving exact text pins and tightening header layout', () => {
    const lt = loader.ADAPTERS.letter_tracing;
    const h = makeAdapterHarness(lt);
    let clearCalls = 0;
    let strokeCalls = 0;
    h.w.HTMLCanvasElement.prototype.getContext = function () {
      return new Proxy({}, {
        get: (_, k) => {
          if (k === 'clearRect') return () => { clearCalls++; };
          if (k === 'stroke') return () => { strokeCalls++; };
          if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
          return () => {};
        },
        set: () => true,
      });
    };
    lt.render({
      word: 'cat',
      letter: 'c',
      parts: [
        { letter: 'C', kind: 'capital', strokes: lt.STROKES.C },
        { letter: 'c', kind: 'lowercase', strokes: lt.STROKES.c },
      ],
    }, h.ctx);

    const undo = h.root.querySelector('[data-trace-undo]');
    expect(undo.textContent).toBe('Undo stroke');
    expect(undo.hidden).toBe(true);
    expect(undo.disabled).toBe(true);

    const pen = h.root.querySelector('[data-trace-pen]');
    const drawStroke = (x0, y0, x1, y1) => {
      pen.dispatchEvent(new h.w.MouseEvent('pointerdown', { bubbles: true, clientX: x0, clientY: y0, button: 0 }));
      pen.dispatchEvent(new h.w.MouseEvent('pointermove', { bubbles: true, clientX: x1, clientY: y1, button: 0 }));
      pen.dispatchEvent(new h.w.MouseEvent('pointerup', { bubbles: true, clientX: x1, clientY: y1, button: 0 }));
    };
    drawStroke(80, 80, 120, 120);
    drawStroke(120, 120, 160, 160);
    expect(undo.hidden).toBe(false);
    expect(undo.disabled).toBe(false);

    const clearsBefore = clearCalls;
    undo.click();
    expect(clearCalls).toBeGreaterThan(clearsBefore);
    expect(undo.hidden).toBe(false); // 1 stroke still remains

    undo.click();
    expect(undo.hidden).toBe(true);
    expect(undo.disabled).toBe(true);
    expect(strokeCalls).toBeGreaterThan(0);
  });

  it('orthography.js uses 44px compact tiles, aria-disabled on empty Check spelling, and 0.5x Hear it slowly', () => {
    const ortho = loader.ADAPTERS.orthography;
    const h = makeAdapterHarness(ortho);
    ortho.render({ id: 'o1', word: 'cat', target: 'cat', wordAudio: 'w-cat', promptAudio: 'p-1' }, h.ctx);

    const check = [...h.root.querySelectorAll('button')].find((b) => b.textContent === 'Check spelling');
    expect(check.getAttribute('aria-disabled')).toBe('true');

    const tileGroup = h.root.querySelector('[aria-label="Letters"]');
    expect(tileGroup.style.gap).toBe('4px');
    const firstTile = tileGroup.querySelector('button');
    expect(firstTile.style.minWidth).toBe('44px');
    expect(firstTile.style.minHeight).toBe('44px');

    firstTile.click();
    expect(check.getAttribute('aria-disabled')).toBe('false');

    const slowBtn = [...h.root.querySelectorAll('button')].find((b) => b.textContent === 'Hear it slowly');
    expect(slowBtn).toBeTruthy();
    slowBtn.click();
    expect(h.played).toContainEqual({ id: 'w-cat', rate: 0.5 });
    expect(h.supports).toContain('slowReplays');
  });

  it('spelling_bee.js supports item.extraTiles for accented letters and compact Clear beside backspace', () => {
    const bee = loader.ADAPTERS.spelling_bee;
    const prepared = bee.prepare({}, { word: 'café', wordClip: () => 'w-cafe', bankClip: () => 'p-bee' });
    expect(prepared.item.extraTiles).toEqual(['é']);

    const h = makeAdapterHarness(bee);
    bee.render(prepared.item, h.ctx);
    const keys = [...h.root.querySelectorAll('[aria-label="Letter keys"] button')];
    const accentBtn = keys.find((b) => b.textContent === 'é');
    const clearBtn = keys.find((b) => b.textContent === 'Clear');
    expect(accentBtn).toBeTruthy();
    expect(clearBtn).toBeTruthy();

    const input = h.root.querySelector('input[type="text"]');
    keys.find((b) => b.textContent === 'c').click();
    accentBtn.click();
    expect(input.value).toBe('cé');
    clearBtn.click();
    expect(input.value).toBe('');
  });
});

// ============================================================================
// 3. Specialized Adapters (Wave 4)
// ============================================================================
describe('Wave 4 Specialized Adapters', () => {
  it('symbol_runner.js includes tapping in lock-on copy, uses clamp() lane sizing, and sets inputmode="numeric" for numeric choices', () => {
    const sr = loader.CHECK_ADAPTERS.symbol_runner;
    expect(sr.labels.symbol_runner_lockon_wait).toContain('tapping');

    const hNum = makeAdapterHarness(sr);
    sr.render(sr.prepare({ word: '7', answer: '7', choices: ['6', '7', '8', '9'], control: 'lockon', lane: 2 }).item, hNum.ctx);
    expect(hNum.root.querySelector('[data-sr-say]').textContent).toContain('tapping');
    expect(hNum.root.querySelector('[data-sr-input]').getAttribute('inputmode')).toBe('numeric');
    expect(hNum.root.querySelector('[data-sr-symbol]').getAttribute('style')).toContain('clamp(');

    const hAlpha = makeAdapterHarness(sr);
    sr.render(sr.prepare({ word: 'RED', answer: 'blue', choices: ['red', 'blue', 'green'], stroopInk: '#2563eb' }).item, hAlpha.ctx);
    expect(hAlpha.root.querySelector('[data-sr-input]').getAttribute('inputmode')).toBeNull();
    expect(hAlpha.root.querySelector('[data-sr-symbol]').getAttribute('style')).toContain('clamp(');
  });

  it('read_along.js sets background inert/aria-hidden during Focus & Crawl overlays and supports Space/R in deviceVoice mode', () => {
    const ra = loader.CHECK_ADAPTERS.read_along;
    const spoken = [];
    let stopped = 0;
    const h = makeAdapterHarness(ra, {
      deviceVoice: () => ({
        available: () => true,
        speak: (txt, done) => { spoken.push(txt); if (done) setTimeout(() => done(true), 5); },
        stop: () => { stopped++; },
      }),
    });
    const sibling = h.d.createElement('header');
    h.d.body.insertBefore(sibling, h.root);

    const handle = ra.render({
      page: 1,
      pages: 1,
      lang: 'en',
      lines: [{ text: 'The fox ran fast.' }, { text: 'It jumped over the log.' }],
    }, h.ctx);

    // Space toggles deviceVoice play/pause when !hasAudio
    expect(h.pressKey(' ')).toBe(true);
    expect(spoken[0]).toBe('The fox ran fast.');
    expect(h.pressKey(' ')).toBe(true);
    expect(stopped).toBeGreaterThan(0);

    // handle.replay (R key) speaks active sentence via devVoice
    expect(typeof handle.replay).toBe('function');
    handle.replay();
    expect(spoken[spoken.length - 1]).toBe('The fox ran fast.');

    // Focus Mode (RSVP) overlay marks background siblings inert + aria-hidden and restores on close
    h.root.querySelector('[data-read-along-rsvp]').click();
    expect(h.d.querySelector('[data-rsvp-dialog]')).toBeTruthy();
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(sibling.getAttribute('aria-hidden')).toBe('true');
    expect(h.root.hasAttribute('inert')).toBe(true);
    h.d.querySelector('[data-rsvp-close]').click();
    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('aria-hidden')).toBe(false);
    expect(h.root.hasAttribute('inert')).toBe(false);

    // Crawl overlay marks background siblings inert + aria-hidden and restores on close
    h.root.querySelector('[data-read-along-crawl]').click();
    expect(h.d.querySelector('[data-crawl-dialog]')).toBeTruthy();
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(sibling.getAttribute('aria-hidden')).toBe('true');
    h.d.querySelector('[data-crawl-close]').click();
    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('aria-hidden')).toBe(false);
  });

  it('math_ccc, math_rehearsal, math_computation, and missing_number respect ctx.noFocus and keep check HTML under 225,000 B', () => {
    for (const [id, item] of [
      ['math_ccc', { id: 'm1', word: '7 × 8', answer: '56', target: '56', study: true }],
      ['math_rehearsal', { id: 'm2', word: '7 × 8', answer: '56', target: '56', role: 'known', study: false }],
      ['math_computation', { id: 'm3', a: 7, b: 8, symbol: '+', answer: '15' }],
      ['missing_number', { id: 'm4', display: '__ + 8 = 15', answer: '7' }],
    ]) {
      const adapter = loader.CHECK_ADAPTERS[id];
      let focusCalls = 0;
      const h = makeAdapterHarness(adapter, {
        noFocus: true,
        keypad: () => {
          const input = h.d.createElement('input');
          const node = h.d.createElement('div');
          node.appendChild(input);
          return { node, input, set: () => {}, lock: () => {}, focus: () => { focusCalls++; } };
        },
      });
      const outer = h.d.createElement('button');
      h.d.body.appendChild(outer);
      outer.focus();
      adapter.render(item, h.ctx);
      expect(focusCalls, id + ' noFocus pad').toBe(0);
      expect(h.d.activeElement, id + ' activeElement preserved').toBe(outer);
    }

    const mcHtml = PC.buildCheckPacket({
      lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('7+8,12-5,9+6'), timeLimitS: 120 }),
      loader,
    }).html;
    expect(Buffer.byteLength(mcHtml, 'utf8')).toBeLessThan(225000);
    expect(MP.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }).blocks[0].activity).toBe('math_ccc');
  });
});

// ============================================================================
// 4. Verify Page CSS & Print Breaks (Wave 4)
// ============================================================================
describe('Wave 4 Verify Page CSS', () => {
  it('retargets dead .part-it .actions to .verdict .actions and adds print page breaks between reports', () => {
    const css = read('packets-verify.css');
    expect(css).not.toContain('.part-it .actions');
    expect(css).toContain('.verdict .actions { margin-top: 1rem; padding-top: 0; border-top: 0; }');
    expect(css).toContain('.verdict .actions .btn { flex: 1 1 100%; }');
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toContain('.report + .report { break-before: page; }');
  });
});

// ============================================================================
// 5. Student Phone Opener (Wave 4)
// ============================================================================
describe('Wave 4 Student Phone Opener (packets-open)', () => {
  const WORDS_FILE = loader.buildHtml(
    loader.lessonFromPack(
      [
        { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat') } }, activityItems: { isolation: { position: 0, correctSound: 'k', options: ['k', 'a', 't', 'm'] } } },
        { word: 'map', targetWord: 'map', term: 'map', _ttsAssets: { map: { mime: 'audio/wav', base64: wav('map') } }, activityItems: { isolation: { position: 2, correctSound: 'p', options: ['m', 'a', 'p', 's'] } } },
      ],
      {
        core,
        banks: {
          isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
          phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
          instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
        },
        title: 'Short a',
        lessonId: 'L-open-w4',
      },
    ).lesson,
    { core },
  );
  const KEY = 'alloflow-take-home:L-open-w4:' + JSON.parse(/var lesson=(.*);\nvar labels=/.exec(WORDS_FILE)[1]).revision;

  async function openOpener() {
    const dom = new JSDOM(read('packets-open.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-open.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));
    const $ = (id) => d.getElementById(id);
    const choose = async (html) => {
      const f = new w.File([html], 'short-a.html', { type: 'text/html' });
      const ev = new w.Event('drop', { bubbles: true, cancelable: true });
      ev.dataTransfer = { types: ['Files'], files: [f] };
      $('main').dispatchEvent(ev);
      for (let i = 0; i < 200 && $('found').hidden; i++) await new Promise((r) => setTimeout(r, 10));
    };
    const post = (data) => {
      const frame = $('run-host').querySelector('iframe');
      w.dispatchEvent(new w.MessageEvent('message', { data, origin: 'null', source: frame.contentWindow }));
    };
    return { w, d, $, choose, post };
  }

  it('surfaces contextual progress, guards #forget with 2-tap confirm, eliminates drag flicker, and keeps no .top-menu', async () => {
    const p = await openOpener();
    expect(p.d.querySelector('.top-menu')).toBeNull();
    expect(p.$('forget').disabled).toBe(true);

    // Drag depth counter: entering child + leaving parent keeps #drop-over visible until depth returns to 0
    const dragEv = (type) => {
      const ev = new p.w.Event(type, { bubbles: true, cancelable: true });
      ev.dataTransfer = { types: ['Files'] };
      return ev;
    };
    p.$('main').dispatchEvent(dragEv('dragenter'));
    expect(p.$('drop-over').hidden).toBe(false);
    p.$('main').dispatchEvent(dragEv('dragenter'));
    p.$('main').dispatchEvent(dragEv('dragleave'));
    expect(p.$('drop-over').hidden).toBe(false);
    p.$('main').dispatchEvent(dragEv('dragleave'));
    expect(p.$('drop-over').hidden).toBe(true);

    await p.choose(WORDS_FILE);
    p.$('start').click();
    // Midway progress: index 1 of 2 -> "Saved at question 2 of 2."
    p.post({ kind: 'alloflow-packet-store', key: KEY, value: JSON.stringify({ index: 1, items: [{}, {}] }) });
    p.$('run-close').click();
    p.$('run-close').click();
    expect(p.$('place-line').textContent).toBe('Saved at question 2 of 2. Start goes on from there.');
    expect(p.$('forget').disabled).toBe(false);
    expect(p.$('forget').textContent).toBe('Forget 1 saved place on this device');

    // Finished state
    p.$('start').click();
    p.post({ kind: 'alloflow-packet-store', key: KEY, value: JSON.stringify({ index: 2, items: [{}, {}], finishedAt: '2026-11-21T12:00:00Z' }) });
    p.$('run-close').click(); // finished -> closes in 1 tap
    expect(p.$('place-line').textContent).toBe('Finished \u2014 open to see or save results.');

    // 2-tap #forget guard: 1st tap asks to confirm and keeps storage intact; 2nd tap wipes and disables
    p.$('forget').click();
    expect(p.$('forget').textContent).toBe('Tap again to forget 1 saved place');
    expect(p.w.localStorage.getItem(KEY)).toBeTruthy();
    p.$('forget').click();
    expect(p.w.localStorage.getItem(KEY)).toBeNull();
    expect(p.$('forget').disabled).toBe(true);
    expect(p.$('forget-said').textContent).toBe('Done. No places are kept on this device now.');
  });
});
