import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// 2026-11-17 (owner: "close the gap"): a finished Symbol Runner round in the app goes into the student's record, so a
// teacher sees the rounds in Class Analytics once the student's file is loaded there.
//   1. The panel hands each finished round to the host's recordGameCompletion as game type 'symbolRunner'.
//   2. The record holds numbers and the set's own symbols; an own list (anything a teacher typed) keeps no symbols.
//   3. The host passes recordGameCompletion to Fluency Maze, whose Symbol Runner tab gets all its props.
//   4. Class Analytics counts the rounds with the games, gives them a row, and a card per set (first and latest round),
//      marked as practice, not a measure.
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function load() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url: 'https://alloflow-cdn.pages.dev/app/' });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = require(path.resolve(md, 'react'));
  w.eval(read('math_fluency_module.js'));
  return w;
}

describe('1 and 2. the panel records each finished round', () => {
  const React = require(path.resolve(md, 'react'));
  const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
  const { act } = require(path.resolve(md, 'react-dom/test-utils'));

  async function mount(extra, storage) {
    const w = load();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    if (storage) w.localStorage.setItem('symbol_runner_bests', JSON.stringify(storage));
    const given = [];
    w.AlloSymbolRunnerCore.mountRunner = (container, config) => { given.push(config); return { destroy() {} }; };
    w.fetch = () => Promise.resolve({ ok: false });
    const host = w.document.getElementById('root');
    const root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(w.AlloModules.FluencyMaze, Object.assign({ React, t: (k) => k, addToast: () => {}, handleScoreUpdate: () => {}, initialTab: 'runner' }, extra)));
    });
    const finish = async (st) => { await act(async () => { given[given.length - 1].onComplete(st); }); };
    return { w, host, given, finish, act, unmount: () => act(async () => { root.unmount(); }) };
  }

  it('hands a finished round to recordGameCompletion as symbolRunner, under the symbol set', async () => {
    const recorded = [];
    const p = await mount({ recordGameCompletion: (...a) => { recorded.push(a); } });
    await p.finish({ total: 22, baseCount: 20, firstTryCorrect: 17, medianMs: 1240, meanMs: 1400, helped: 2,
      focusSuggestions: ['b', 'd', 'p', 'q', 'g'], confusionPairs: [{ picked: 'd', target: 'b', count: 3 }] });
    expect(recorded).toHaveLength(1);
    const [resourceId, gameType, data] = recorded[0];
    expect(resourceId).toBe('symbol-runner:confusable_letters');
    expect(gameType).toBe('symbolRunner');
    expect(data).toMatchObject({ mode: 'confusable_letters', score: 77, firstTry: 17, total: 22, baseCount: 20, medianMs: 1240, helped: 2,
      controlMode: 'direct', rehearsal: false, count: 20, practice: true, isPerfect: false, tricky: ['b', 'd', 'p', 'q'], mixedUp: [{ picked: 'd', target: 'b', count: 3 }] });
    expect(typeof data.setTitle).toBe('string');
    expect(data.setTitle.length).toBeGreaterThan(0);
    // An empty round is not recorded; a host without the recorder (the Packets page, an older host) is fine.
    await p.finish({ total: 0, firstTryCorrect: 0 });
    expect(recorded).toHaveLength(1);
    await p.unmount();
    const q = await mount({});
    await q.finish({ total: 10, firstTryCorrect: 10, medianMs: 900 });
    await q.unmount();
  });

  // 2026-11-17 (round 4): the student sees their own last rounds on the set, as a row of bars, from the second round.
  it('shows the student their last rounds on this set, from the second round, kept on the device', async () => {
    const p = await mount({});
    await p.finish({ total: 20, firstTryCorrect: 10, medianMs: 2000 });
    expect(p.host.querySelector('[data-testid="symbol-runner-history"]')).toBe(null);
    await p.finish({ total: 20, firstTryCorrect: 14, medianMs: 1800 });
    await p.finish({ total: 10, firstTryCorrect: 10, medianMs: 1500 });
    const row = p.host.querySelector('[data-testid="symbol-runner-history"]');
    const img = row.querySelector('[role="img"]');
    expect(img.getAttribute('aria-label')).toBe('Your last 3 rounds on this set, right on the first try: 10 of 20, 14 of 20, 10 of 10.');
    const bars = [...img.children];
    expect(bars.map((b) => b.style.height)).toEqual(['14px', '20px', '28px']);
    expect(bars[2].style.background).not.toBe(bars[0].style.background);
    expect(bars[1].getAttribute('title')).toBe('14 of 20');
    // At most 8, the newest last; a badly formed row on the device is dropped.
    for (let i = 0; i < 8; i++) await p.finish({ total: 20, firstTryCorrect: i, medianMs: 1500 });
    const kept = JSON.parse(p.w.localStorage.getItem('symbol_runner_bests'))['confusable_letters|direct|hist'];
    expect(kept).toHaveLength(8);
    expect(kept[7]).toEqual({ f: 7, t: 20 });
    await p.unmount();
    const I = load().AlloModules.MathFluencyInternals;
    expect(I._srHistory([{ f: 3, t: 5 }, { f: 9, t: 5 }, null, { f: 1, t: 0 }, 'x', { f: '2', t: '4' }])).toEqual([{ f: 3, t: 5 }, { f: 2, t: 4 }]);
    expect(I._srHistory({ f: 1, t: 2 })).toEqual([]);
  });

  // 2026-11-17 (round 5): the set's tricky symbols carry over between visits, in the open.
  it('keeps the tricky symbols, offers "Practice them", and a rehearsal round then practices them', async () => {
    const p = await mount({});
    expect(p.host.querySelector('[data-testid="symbol-runner-tricky"]')).toBe(null);
    const mounts = p.given.length;
    await p.finish({ total: 20, firstTryCorrect: 14, medianMs: 1800, focusSuggestions: ['b', 'd', 'zz-not-in-set'] });
    // A finished round does not restart the game (its end screen stays).
    expect(p.given.length).toBe(mounts);
    const line = p.host.querySelector('[data-testid="symbol-runner-tricky"]');
    expect(line.textContent).toBe('Tricky last time: b, d, zz-not-in-set' + 'Practice them');
    expect(JSON.parse(p.w.localStorage.getItem('symbol_runner_bests'))['confusable_letters|tricky']).toEqual(['b', 'd', 'zz-not-in-set']);
    // The offer turns Rehearsal on; the round practices the ones in this set.
    await p.act(async () => { p.host.querySelector('[data-testid="symbol-runner-practice-tricky"]').click(); });
    const cfg = p.given[p.given.length - 1];
    expect(cfg.focusAnswers).toEqual(['b', 'd']);
    expect(p.host.querySelector('[data-testid="symbol-runner-tricky"]').textContent).toBe('This rehearsal practices: b, d, zz-not-in-set');
    expect(p.host.querySelector('[data-testid="symbol-runner-practice-tricky"]')).toBe(null);
    // A round with nothing tricky clears them.
    await p.finish({ total: 20, firstTryCorrect: 20, medianMs: 1000, focusSuggestions: [] });
    expect(p.host.querySelector('[data-testid="symbol-runner-tricky"]')).toBe(null);
    await p.unmount();
  });

  it('reads the tricky symbols kept from an earlier visit, and only short text', async () => {
    const w0 = load();
    const I = w0.AlloModules.MathFluencyInternals;
    expect(I._srTricky(['b', 7, '', null, { x: 1 }, 'x'.repeat(40), 'q', 'p'])).toEqual(['b', '7', 'x'.repeat(24), 'q']);
    expect(I._srTricky('b,d')).toEqual([]);
    const p = await mount({}, { 'confusable_letters|tricky': ['p', 'q'] });
    expect(p.host.querySelector('[data-testid="symbol-runner-tricky"]').textContent).toContain('Tricky last time: p, q');
    // Rehearsal off: the game gets no focus symbols, so a normal round stays a normal round.
    expect(p.given[p.given.length - 1].focusAnswers).toEqual([]);
    await p.unmount();
  });

  it('keeps no symbols from an own list, and nothing but numbers, short text and true or false', () => {
    const I = load().AlloModules.MathFluencyInternals;
    const st = { total: 10, firstTryCorrect: 12, medianMs: 'x', helped: -3, focusSuggestions: ['Maya', 'Jon'], confusionPairs: [{ picked: 'Maya', target: 'Jon', count: 1 }] };
    const own = I._srRoundRecord(st, { modeId: 'custom', modes: [{ id: 'custom', title: 'Own symbol list' }], controlMode: 'typed', rehearsal: true, count: 10 });
    expect(own).toEqual({ mode: 'custom', setTitle: 'Own symbol list', score: 100, firstTry: 10, total: 10, baseCount: 10, medianMs: 0, helped: 0,
      controlMode: 'typed', rehearsal: true, count: 10, practice: true, isPerfect: true, tricky: [], mixedUp: [] });
    const long = I._srRoundRecord({ total: 5, firstTryCorrect: 4, focusSuggestions: ['x'.repeat(60)] }, { modeId: 'sight_words_k_1', modes: [] });
    expect(long.tricky[0]).toHaveLength(24);
    expect(long.setTitle).toBe('sight_words_k_1');
    for (const v of Object.values(own)) expect(['number', 'string', 'boolean', 'object']).toContain(typeof v);
  });
});

describe('3. the host hands the recorder to the game', () => {
  it('passes recordGameCompletion to Fluency Maze, and the Symbol Runner tab gets all of Fluency Maze\'s props', () => {
    const anti = read('AlloFlowANTI.txt');
    const at = anti.indexOf('<FluencyMazeComponent');
    expect(at).toBeGreaterThan(0);
    expect(anti.slice(at, anti.indexOf('/>', at))).toContain('recordGameCompletion={recordGameCompletion}');
    expect(read('math_fluency_module.js')).toContain('return h(SymbolRunnerPanel, Object.assign({}, props, {');
  });
});

describe('4. Class Analytics shows the rounds', () => {
  const src = read('student_analytics_module.js');
  const slice = (start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a); expect(a, start).toBeGreaterThan(0); return src.slice(a, b); };

  // 2026-11-17 (owner: "please fix the bug"): Class Analytics read 'timelineGame' and 'conceptSortGame', names no game
  // ever saved (Timeline and Concept Sort save as 'timeline' and 'conceptSort'), so those plays never showed.
  it('reads every game under the name the game saves it as', () => {
    const map = src.slice(src.indexOf('        const typeMap = {'), src.indexOf('};', src.indexOf('        const typeMap = {')));
    const read = [...map.matchAll(/^\s+([A-Za-z]+): '([A-Za-z]+)'/gm)].map((m) => m[1]);
    expect(read).toEqual(expect.arrayContaining(['timeline', 'conceptSort', 'symbolRunner', 'memory', 'definitionDetective']));
    expect(read).not.toContain('timelineGame');
    expect(read).not.toContain('conceptSortGame');
    const emitters = ['games_source.jsx', 'view_renderers_source.jsx', 'AlloFlowANTI.txt', 'math_fluency_module.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const saved = new Set([...emitters.matchAll(/(?:onGameComplete\??\.?\(|handleGameCompletion\(|recordGameCompletion\([^,()]*(?:\([^()]*\))?[^,()]*,\s*)'([A-Za-z]+)'/g)].map((m) => m[1]));
    for (const name of read) expect(saved.has(name), name + ' is never saved by any game').toBe(true);
  });

  it('counts them with the games and gives them a row', () => {
    expect(src).toContain("definitionDetective: 'definitionDetective',\n          symbolRunner: 'symbolRunner'\n        };");
    expect(src).toContain('        definitionDetective: null,\n        symbolRunner: null,\n');
    expect(src).toContain("key: 'symbolRunner',\n      label: 'Symbol Runner',");
    expect(src).toContain('_acSrRounds(React.createElement, t, selectedStudent), selectedStudent.data?.labelChallengeResults');
    for (const copy of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      expect(read(path.join(copy, 'student_analytics_module.js')) === src, copy).toBe(true);
    }
  });

  const React = require(path.resolve(md, 'react'));
  const { renderToStaticMarkup } = require(path.resolve(md, 'react-dom/server'));
  const code = slice('  function _acWsText(t, key, fallback, params) {', '  // RFC 4180') + slice('  function _acSrRounds(h, t, student) {', '  // BEGIN TAKE-HOME RESULTS IMPORT');
  const card = new Function('return (function () {' + code + '; return _acSrRounds; })();')();
  const draw = (gc, t = () => '') => { const el = card(React.createElement, t, { data: { gameCompletions: gc } }); return el ? renderToStaticMarkup(el) : ''; };
  const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/&#x27;/g, "'").replace(/\|+/g, '|');

  it('shows nothing without rounds, and skips what is not a round', () => {
    expect(draw(undefined)).toBe('');
    expect(draw({ memory: [{ score: 90 }] })).toBe('');
    expect(draw({ symbolRunner: [null, 'x', { total: 0 }] })).toBe('');
    expect(draw({ symbolRunner: 'not a list' })).toBe('');
  });

  it('gives each set its first and latest round, with what was tricky last time, and says it is practice', () => {
    const html = draw({ symbolRunner: [
      { mode: 'confusable_letters', setTitle: 'Look-alike letters (b, d, p, q)', firstTry: 12, total: 20, medianMs: 2140, completedAt: '2026-11-10T15:00:00Z' },
      { mode: 'digits_single', setTitle: 'Single digits (0-9)', firstTry: 10, total: 10, medianMs: 800, completedAt: '2026-11-11T15:00:00Z' },
      { mode: 'confusable_letters', setTitle: 'Look-alike letters (b, d, p, q)', firstTry: 18, total: 20, medianMs: 1260, helped: 1, completedAt: '2026-11-17T15:00:00Z',
        tricky: ['b', 'd'], mixedUp: [{ picked: 'd', target: 'b', count: 2 }] },
    ] });
    const said = text(html);
    expect(said).toContain('Symbol Runner: naming practice (3 rounds)');
    expect(said).toContain('Not a timed measure');
    expect(html.match(/data-sr-set=/g)).toHaveLength(2);
    expect(said).toContain('Look-alike letters (b, d, p, q)|2 rounds|');
    expect(said).toMatch(/Latest \([^)]*\): 18 of 20 right on the first try, 1\.3 s a card\./);
    expect(said).toMatch(/First \([^)]*\): 12 of 20 right on the first try, 2\.1 s a card\./);
    expect(said).toContain('Heard the sound on 1 card.');
    expect(said).toContain('Tricky in the latest round: b, d');
    expect(said).toContain('Mixed up: d for b');
    // One round on a set: no "First" line.
    expect(said).toContain('Single digits (0-9)|1 round|');
    expect(said.match(/First \(/g)).toHaveLength(1);
  });

  // 2026-11-17 (owner: "I am into the trend view"): from the third round answered the same way, a set shows two small
  // charts (seconds per card; right on the first try) and the same rounds as a table.
  const r = (day, firstTry, total, medianMs, extra) => Object.assign({ mode: 'digits_single', setTitle: 'Single digits (0-9)', firstTry, total, medianMs, controlMode: 'direct', completedAt: '2026-11-' + day + 'T15:00:00Z' }, extra);

  it('shows no trend before a set has three rounds answered the same way', () => {
    expect(draw({ symbolRunner: [r(10, 5, 10, 2000), r(11, 7, 10, 1800)] })).not.toContain('data-sr-trend');
    // Three rounds, but one aimed first: still two of the same way, and the other is named as left out.
    const said = text(draw({ symbolRunner: [r(10, 5, 10, 2000), r(11, 6, 10, 3500, { controlMode: 'lockon' }), r(12, 7, 10, 1800)] }));
    expect(said).not.toContain('Rounds as a table');
    expect(said).toContain('1 round answered another way is left out of this comparison.');
    // "First" is the first round answered the latest way, not the aimed one.
    expect(said).toMatch(/First \([^)]*\): 5 of 10 right on the first try, 2\.0 s a card\./);
  });

  it('draws both charts, each with its own summary, a hover title on every dot, and the rounds as a table', () => {
    const rounds = [r(10, 5, 10, 2400), r(11, 6, 10, 2100), r(12, 8, 10, 1700, { helped: 2 }), r(13, 9, 10, 1500)];
    const html = draw({ symbolRunner: rounds });
    expect(html.match(/data-sr-chart="/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Seconds per card over 4 rounds: 2.4 at first, 1.5 in the latest."');
    expect(html).toContain('aria-label="Right on the first try over 4 rounds: 50% at first, 90% in the latest."');
    expect(html.match(/data-sr-hit="true"/g)).toHaveLength(8);
    expect(html).toMatch(/<title>[^<]*: 1\.7 s a card<\/title>/);
    expect(html).toMatch(/<title>[^<]*: 80% right on the first try<\/title>/);
    // Only the first and the latest values are written on each chart.
    expect(html.match(/<text /g)).toHaveLength(4);
    const said = text(html);
    expect(said).toContain('Seconds per card (lower is quicker)');
    expect(said).toContain('Each dot is a round, oldest on the left.');
    expect(said).toContain('Rounds as a table');
    expect(html.match(/<tr class="border-t/g)).toHaveLength(4);
    expect(said).toContain('8 / 10|1.7|2|');
    // The lines take their color from a text class, so the app's themes recolor them.
    expect(html).toContain('class="block text-amber-800"');
    expect(html).not.toMatch(/stroke="#|fill="#/);
  });

  it('leaves out the seconds chart when rounds have no time, and keeps the line broken where one is missing', () => {
    const none = draw({ symbolRunner: [r(10, 5, 10, 0), r(11, 6, 10, 0), r(12, 7, 10, 0)] });
    expect(none.match(/data-sr-chart="/g)).toHaveLength(1);
    expect(none).toContain('data-sr-chart="first"');
    const gap = draw({ symbolRunner: [r(10, 5, 10, 2000), r(11, 6, 10, 0), r(12, 7, 10, 1800)] });
    const path = /data-sr-chart="secs"[\s\S]*?<path d="([^"]+)"/.exec(gap)[1];
    expect(path.match(/M/g)).toHaveLength(2);
  });

  // 2026-11-17 (round 4): one careful next step per set.
  it('suggests a new set only after three same-way rounds at 90% or more, and rehearsal, then a shorter round, under 70%', () => {
    const next = (rounds) => { const m = /data-sr-next="(\w+)"/.exec(draw({ symbolRunner: rounds })); return m ? m[1] : ''; };
    expect(next([r(10, 9, 10, 900), r(11, 10, 10, 800), r(12, 9, 10, 800)])).toBe('ready');
    // Two at 90% are not enough, nor three where one was answered another way.
    expect(next([r(11, 10, 10, 800), r(12, 9, 10, 800)])).toBe('');
    expect(next([r(10, 9, 10, 900), r(11, 10, 10, 800, { controlMode: 'lockon' }), r(12, 9, 10, 800)])).toBe('');
    expect(next([r(10, 6, 10, 900), r(11, 10, 10, 800), r(12, 9, 10, 800)])).toBe('');
    expect(next([r(12, 6, 10, 2000)])).toBe('rehearse');
    expect(next([r(12, 6, 10, 2000, { rehearsal: true, count: 20 })])).toBe('shorter');
    expect(next([r(12, 6, 10, 2000, { rehearsal: true, count: 10 })])).toBe('');
    expect(next([r(12, 7, 10, 2000)])).toBe('');
    expect(text(draw({ symbolRunner: [r(12, 6, 10, 2000)] }))).toContain('Suggestion: under 70% right on the first try. A rehearsal round');
  });

  // 2026-11-17 (round 5): Symbol Runner across the class, above the student table.
  const klass = new Function('return (function () {' + code + '; return _acSrClass; })();')();
  const NOW = Date.parse('2026-11-17T20:00:00Z');
  const student = (name, rounds) => ({ name, data: { gameCompletions: { symbolRunner: rounds, memory: [{ score: 90 }] } } });

  it('lists students with rounds, those who may need help first, and a name opens the student', () => {
    expect(klass(React.createElement, () => '', [student('Ana', []), { name: 'Bo', data: {} }], () => {}, NOW)).toBe(null);
    const opened = [];
    const students = [
      student('Zed', [r(15, 9, 10, 900), r(16, 10, 10, 800), r(17, 10, 10, 700)]),
      student('Ana', [r(17, 12, 20, 2100)]),
      student('Cy', [r(1, 6, 10, 2000), r(16, 8, 10, 1800)]),
      student('Bea', [r(17, 6, 10, 2000, { rehearsal: true, count: 20 })]),
      student('Dee', []),
    ];
    const el = klass(React.createElement, () => '', students, (s) => opened.push(s.name), NOW);
    const html = renderToStaticMarkup(el);
    const said = text(html);
    expect(said).toContain('Symbol Runner across the class');
    expect(said).toContain('the Assessment Center has the RAN probe');
    // Ana (rehearse), Bea (shorter), Cy (none), Zed (ready); Dee has no rounds.
    expect([...html.matchAll(/data-sr-class-row="(\w+)"/g)].map((m) => m[1])).toEqual(['rehearse', 'shorter', 'none', 'ready']);
    expect(said).toMatch(/\|Ana\|1\|Single digits \(0-9\)\|12 of 20, 2\.1 s a card\|Try a rehearsal round\|/);
    expect(said).toContain('|Bea|1|');
    // Cy: one round in the last 7 days (the other was on the 1st).
    expect(said).toMatch(/\|Cy\|1\|Single digits \(0-9\)\|8 of 10, 1\.8 s a card\|—\|/);
    expect(said).toContain('|Zed|3|');
    expect(said).not.toContain('Dee');
    // The first button belongs to Ana's row; pressing it opens Ana.
    const rows = el.props.children[2].props.children.props.children[1].props.children;
    rows[0].props.children[0].props.children.props.onClick();
    expect(opened).toEqual(['Ana']);
  });

  it('the class card and the student card give the same suggestion for the same rounds', () => {
    const cases = [[r(15, 9, 10, 900), r(16, 10, 10, 800), r(17, 10, 10, 700)], [r(17, 6, 10, 2000)], [r(17, 6, 10, 2000, { rehearsal: true, count: 20 })], [r(17, 8, 10, 2000)]];
    for (const rounds of cases) {
      const one = (/data-sr-next="(\w+)"/.exec(draw({ symbolRunner: rounds })) || [, 'none'])[1];
      const all = /data-sr-class-row="(\w+)"/.exec(renderToStaticMarkup(klass(React.createElement, () => '', [student('A', rounds)], null, NOW)))[1];
      expect(all).toBe(one);
    }
  });

  it('sits above the student table on the dashboard', () => {
    expect(src).toContain('_acSrClass(React.createElement, t, importedStudents, setSelectedStudent), importedStudents.length === 0 ?');
  });

  it('keeps 40 Symbol Runner rounds between visits (10 for the other games)', () => {
    expect(src).toContain("out.gameCompletions[k] = Array.isArray(arr) ? arr.slice(k === 'symbolRunner' ? -40 : -10) : arr;");
  });

  it('reads the translations, and draws what a file holds as text only', () => {
    const t = (k) => ({ 'class_analytics.sr_heading_one': 'Symbol Runner: práctica (1 ronda)', 'class_analytics.sr_rounds_one': '1 ronda' })[k];
    const html = draw({ symbolRunner: [{ mode: 'x', setTitle: '<img src=x onerror=alert(1)>', firstTry: 99, total: 5, medianMs: 0, completedAt: 'nope' }] }, t);
    expect(html).toContain('Symbol Runner: práctica (1 ronda)');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    // More right than cards is shown as all of them; no time is a dash.
    expect(text(html)).toContain('5 of 5 right on the first try, — s a card.');
  });
});
