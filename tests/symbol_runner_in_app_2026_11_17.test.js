import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

// The app's Symbol Runner (the second tab of Fluency Maze, in math_fluency_module.js), 2026-11-17 (owner: "game in the app").
// It was in the app already; this pass made it usable there:
//   1. Its letter and sound recordings are asked for at the app's file address. Beside the app's own page (under /app/)
//      the address answered with the app's web page, so in the app the recordings never arrived.
//   2. The copy of the game inside the module is the current symbol_runner_core.js.
//   3. The microphone is off, as on the Packets page (the browser's speech recognition sends a child's voice away).
//   4. A finished round reaches the app: points (only what beats this set's earlier rounds), and a best kept on the device.
//   5. Plainer names, a top row that does not overlap, and the teacher's tools in a fold.
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function load(url = 'https://alloflow-cdn.pages.dev/app/') {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = require(path.resolve(md, 'react'));
  w.eval(read('math_fluency_module.js'));
  return w;
}
const json = (data) => ({ ok: true, json: () => Promise.resolve(data) });
// What the live site answers under /app/ for an address that is not a file: its own page, with a 200.
const webPage = () => ({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });

describe('1. where the recordings are asked for', () => {
  const w = load();
  const I = w.AlloModules.MathFluencyInternals;

  it('the app\'s file address first on a live page; beside the page first only where the page runs from the device', () => {
    const FILES = 'https://alloflow-cdn.pages.dev/';
    expect(Array.from(I._srAssetBases({ protocol: 'https:', hostname: 'alloflow-cdn.pages.dev' }))).toEqual([FILES, '']);
    expect(Array.from(I._srAssetBases({ protocol: 'https:', hostname: 'gemini.google.com' }))).toEqual([FILES, '']);
    expect(Array.from(I._srAssetBases(null))).toEqual([FILES, '']);
    expect(Array.from(I._srAssetBases({ protocol: 'http:', hostname: 'localhost' }))).toEqual(['', FILES]);
    expect(Array.from(I._srAssetBases({ protocol: 'http:', hostname: '127.0.0.1' }))).toEqual(['', FILES]);
    expect(Array.from(I._srAssetBases({ protocol: 'file:', hostname: '' }))).toEqual(['', FILES]);
    // The app's own setting for its file address wins, with or without its last slash.
    expect(Array.from(I._srAssetBases({ protocol: 'https:', hostname: 'x.org' }, 'https://files.example/allo'))).toEqual(['https://files.example/allo/', '']);
  });

  it('takes the first place that gives data: a web page, a refusal or a failure moves on to the next', async () => {
    const asked = [];
    const from = (answers) => (address) => { asked.push(address); const a = answers[address]; return typeof a === 'function' ? a() : Promise.resolve(a); };
    const bases = ['', 'https://alloflow-cdn.pages.dev/'];
    const clips = { clips: { a: 'data:audio/webm;base64,AAAA' } };
    // The case that was broken: the first place answers 200 with a web page.
    expect(await I._srFetchJson('audio_bank/letters.json', from({ 'audio_bank/letters.json': webPage(), 'https://alloflow-cdn.pages.dev/audio_bank/letters.json': json(clips) }), bases)).toEqual(clips);
    expect(asked).toEqual(['audio_bank/letters.json', 'https://alloflow-cdn.pages.dev/audio_bank/letters.json']);
    // Not found, a network failure, a fetch that throws, and data that is not an object: each moves on.
    for (const first of [{ ok: false, json: () => Promise.resolve({}) }, () => Promise.reject(new Error('offline')), () => { throw new Error('blocked'); }, json('not an object'), json(null)]) {
      expect(await I._srFetchJson('x.json', from({ 'x.json': first, 'https://alloflow-cdn.pages.dev/x.json': json({ ok: 1 }) }), bases)).toEqual({ ok: 1 });
    }
    // The first place has it: the second is never asked.
    asked.length = 0;
    expect(await I._srFetchJson('y.json', from({ 'y.json': json({ here: true }) }), bases)).toEqual({ here: true });
    expect(asked).toEqual(['y.json']);
    // Nowhere: null, never a rejection.
    expect(await I._srFetchJson('z.json', from({ 'z.json': webPage(), 'https://alloflow-cdn.pages.dev/z.json': { ok: false } }), bases)).toBe(null);
    expect(await I._srFetchJson('z.json', null, bases)).toBe(null);
  });

  it('every recording the panel asks for goes through it; nothing is asked for beside the page alone', () => {
    const src = read('math_fluency_module.js');
    const panel = src.slice(src.indexOf('  function SymbolRunnerPanel(props) {'), src.indexOf('  function FluencyMazePanel(props) {'));
    expect(panel.length).toBeGreaterThan(10000);
    for (const file of ["'audio_bank/phonemes.json'", "'audio_bank/letters.json'", "'audio_bank/words.json'", "'word_audio_shards/index.json'", "'word_audio_shards/' + file"]) expect(panel, file).toContain('_srFetchJson(' + file + ')');
    expect(panel).not.toMatch(/[^_A-Za-z]fetch\(\s*'(?:audio_bank|word_audio_shards)/);
  });
});

describe('2. the copy of the game inside the module', () => {
  it('is the current symbol_runner_core.js, in the module and in its copies', () => {
    const check = spawnSync(process.execPath, ['dev-tools/sync_symbol_runner_in_math_fluency.cjs', '--check'], { encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
    // The flanker item that was a typo ("nnuun") in the app's copy until this pass.
    const src = read('math_fluency_module.js');
    expect(src).toContain("display: 'nnunn'");
    expect(src).not.toContain("display: 'nnuun'");
  });
});

describe('3 to 5. the panel', () => {
  const React = require(path.resolve(md, 'react'));
  const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
  const { act } = require(path.resolve(md, 'react-dom/test-utils'));

  async function mount(storage) {
    const w = load();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    if (storage) w.localStorage.setItem('symbol_runner_bests', JSON.stringify(storage));
    // The game itself is stood in for: what the panel hands it, and its way of saying a round is over.
    const given = [];
    w.AlloSymbolRunnerCore.mountRunner = (container, config) => { given.push(config); return { destroy() {} }; };
    w.fetch = () => Promise.resolve({ ok: false });
    const scores = [];
    const host = w.document.getElementById('root');
    const root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(w.AlloModules.SymbolRunner, { React, t: (k) => k, addToast: () => {}, handleScoreUpdate: (...a) => { scores.push(a); return a[0]; }, onBackToMaze: () => {} }));
    });
    const finish = async (st) => { await act(async () => { given[given.length - 1].onComplete(st); }); };
    return { w, host, given, scores, finish, act, unmount: () => act(async () => { root.unmount(); }) };
  }

  it('hands the game no microphone, and shows no microphone choice', async () => {
    const p = await mount();
    expect(p.given.length).toBeGreaterThan(0);
    expect(p.given[p.given.length - 1]).toMatchObject({ enableVoice: false, voiceEnabled: false, modeId: 'confusable_letters' });
    expect(p.host.textContent).not.toMatch(/Voice mic|\bMic\b/);
    // The game makes a Mic button only when it is allowed the voice (symbol_runner_core.js).
    expect(read('symbol_runner_core.js')).toContain('var SpeechRec = cfg.enableVoice !== false ? (root.SpeechRecognition || root.webkitSpeechRecognition) : null;');
    await p.unmount();
  });

  it('a finished round gives the app its points under the symbol set, keeps the best, and says so', async () => {
    const p = await mount();
    expect(p.host.querySelector('[data-testid="symbol-runner-best"]')).toBe(null);
    await p.finish({ total: 20, firstTryCorrect: 17, meanMs: 1240 });
    expect(p.scores).toEqual([[17, 'Symbol Runner round', 'symbol-runner:confusable_letters']]);
    // 2026-11-17 (round 3): the round before is kept too ('|last'), for the "Last time" line.
    // 2026-11-17 (round 4): and the last 8 rounds ('|hist'), for the student's own row of bars.
    // 2026-11-17 (round 5): and the set's tricky symbols from that round ('<set>|tricky'; none here).
    expect(JSON.parse(p.w.localStorage.getItem('symbol_runner_bests'))).toEqual({ 'confusable_letters|direct': { firstTry: 17, total: 20, meanMs: 1240 }, 'confusable_letters|direct|last': { firstTry: 17, total: 20 },
      'confusable_letters|direct|hist': [{ f: 17, t: 20 }], 'confusable_letters|tricky': [] });
    expect(p.host.querySelector('[data-testid="symbol-runner-best"]').textContent)
      .toBe('Round done: 17 of 20 right on the first try. That is your best on this set. Best on this set: 17 of 20 on the first try, about 1.2 s each.');
    // A weaker round: the points still go to the app (it gives only what beats the earlier rounds), the best stays.
    await p.finish({ total: 20, firstTryCorrect: 12, meanMs: 900 });
    expect(p.scores[1]).toEqual([12, 'Symbol Runner round', 'symbol-runner:confusable_letters']);
    expect(JSON.parse(p.w.localStorage.getItem('symbol_runner_bests'))['confusable_letters|direct']).toEqual({ firstTry: 17, total: 20, meanMs: 1240 });
    expect(p.host.querySelector('[data-testid="symbol-runner-best"]').textContent)
      .toBe('Round done: 12 of 20 right on the first try. Last time: 17 of 20. Best on this set: 17 of 20 on the first try, about 1.2 s each.');
    // As many right, but faster: a new best. Nothing right: no points asked for. An empty round: nothing at all.
    await p.finish({ total: 20, firstTryCorrect: 17, meanMs: 1000 });
    expect(JSON.parse(p.w.localStorage.getItem('symbol_runner_bests'))['confusable_letters|direct'].meanMs).toBe(1000);
    const before = p.scores.length;
    await p.finish({ total: 20, firstTryCorrect: 0, meanMs: 3000 });
    await p.finish({ total: 0, firstTryCorrect: 0, meanMs: 0 });
    expect(p.scores.length).toBe(before);
    await p.unmount();
  });

  it('shows the best kept from an earlier visit for the set on screen', async () => {
    const p = await mount({ 'confusable_letters|direct': { firstTry: 19, total: 20, meanMs: 0 }, 'digits_single|direct': { firstTry: 10, total: 20, meanMs: 2000 } });
    expect(p.host.querySelector('[data-testid="symbol-runner-best"]').textContent).toBe('Best on this set: 19 of 20 on the first try.');
    const I = p.w.AlloModules.MathFluencyInternals;
    expect(I._srBetterRun({ firstTry: 18, total: 20, meanMs: 900 }, { firstTry: 17, total: 20, meanMs: 500 })).toBe(true);
    expect(I._srBetterRun({ firstTry: 17, total: 20, meanMs: 900 }, { firstTry: 17, total: 20, meanMs: 500 })).toBe(false);
    expect(I._srBetterRun({ firstTry: 17, total: 20, meanMs: 400 }, { firstTry: 17, total: 20, meanMs: 500 })).toBe(true);
    expect(I._srBetterRun({ firstTry: 1, total: 20, meanMs: 400 }, null)).toBe(true);
    expect(I._srBetterRun({ firstTry: 0, total: 0, meanMs: 0 }, null)).toBe(false);
    await p.unmount();
  });

  it('has plain names, a top row whose boxes cannot push past their cells, and the teacher\'s tools in a fold', async () => {
    const p = await mount();
    const text = p.host.textContent;
    expect(p.host.querySelector('h2').textContent).toBe('Symbol Runner');
    for (const said of ['Quick naming practice: letters, sounds, sight words, numbers and dots. Say each one aloud as you tap or type it.', 'How to answer', 'Naming grid (5 by 8)',
      'Rehearsal: new symbols mixed in among known ones', 'Printable naming grid (.html)', 'Printable cover, copy, compare sheet (.html)']) expect(text, said).toContain(said);
    expect(text).not.toMatch(/Star-Rail Symbol Runner|RAN Grid|Incremental Rehearsal|CCC Sheet|Aiming mode|Corridor view/);
    const top = [...p.host.querySelectorAll('[data-testid="symbol-runner-settings"] > div:first-of-type > label')];
    // 2026-11-18 (owner): grouped set cards. The Symbol set dropdown left the top row for its own fieldset of cards
    // (tests/symbol_runner_set_cards_2026_11_18.test.js); the other three boxes still must not push past their cells.
    expect(top).toHaveLength(3);
    expect(p.host.querySelector('[data-testid="symbol-runner-settings"] > fieldset[data-testid="symbol-runner-sets"]')).not.toBe(null);
    for (const label of top) {
      expect(label.style.minWidth).toBe('0px');
      const box = label.querySelector('select, input');
      expect([box.style.width, box.style.minWidth, box.style.boxSizing]).toEqual(['100%', '0px', 'border-box']);
    }
    const fold = p.host.querySelector('[data-testid="symbol-runner-tools"]');
    expect([fold.tagName, fold.open, fold.querySelector('summary').textContent]).toEqual(['DETAILS', false, 'For teachers: pictures and printables']);
    expect([...fold.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Add pictures from the library', 'Add a picture…', 'Export individual slides (.pptx)', 'Printable naming grid (.html)',
      'Printable flashcards (.html)', 'Printable cover, copy, compare sheet (.html)']); // plainer words 2026-11-17 (round 3)
    // New round stays outside it, beside the choices a student may change (all of them in the Settings fold since round 3, 2026-11-17).
    expect(p.host.querySelector('[data-testid="symbol-runner-settings"]').open).toBe(true);
    const outside = [...p.host.querySelectorAll('[data-testid="symbol-runner-panel"] button')].filter((b) => !b.closest('[data-testid="symbol-runner-tools"]')).map((b) => b.textContent);
    expect(outside).toEqual(['Back to Math Maze', 'New round']);
    // The door from Fluency Maze.
    expect(read('math_fluency_module.js')).toContain("tt('math_fluency.symbol_runner_tab', 'Symbol Runner: quick naming')");
    await p.unmount();
  });

  it('a round has 10, 20 or 30 cards, kept on this device; the game gets the number', async () => {
    const p = await mount();
    expect(p.given[p.given.length - 1].count).toBe(20);
    const sel = p.host.querySelector('[data-testid="symbol-runner-count"]');
    expect([...sel.options].map((o) => o.value)).toEqual(['10', '20', '30']);
    await p.act(async () => { sel.value = '10'; sel.dispatchEvent(new p.w.Event('change', { bubbles: true })); });
    expect(p.given[p.given.length - 1].count).toBe(10);
    expect(p.w.localStorage.getItem('symbol_runner_count')).toBe('10');
    await p.unmount();
  });
});
