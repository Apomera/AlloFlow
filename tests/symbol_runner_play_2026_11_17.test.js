import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// Symbol Runner, 2026-11-17 (Aaron: "keep enhancing the symbol runner activity"): symbol_runner_core.js, the live game shared by
// the Packets page and the app (math_fluency_module.js carries a copy, kept by dev-tools/sync_symbol_runner_in_math_fluency.cjs).
//   - Hidden parts stay hidden (the game's display rules used to override "hidden").
//   - A Start button (cfg.startButton) starts the clock; time with the page hidden is left out.
//   - Plain words; times in seconds; the answer named after a right one; the new card said for a screen reader.
//   - Keys keep the look-alike (b with d); the bigger-number game has only its two numbers; dots never say the count.
//   - A fixed mix-up still reaches the practice list; alternating sets keep their pattern; progress counts the round's cards.
//   - The ending is for the child (stars, tricky symbols), with the numbers in a fold; Play again replaces the game in place.
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function load() {
  const dom = new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true }); // reduced motion: no animation loop
  const played = [];
  w.Audio = class { constructor(src) { this.src = src; } play() { played.push(this.src); return Promise.resolve(); } pause() {} };
  w.eval(read('symbol_runner_core.js'));
  return { w, d: w.document, core: w.AlloSymbolRunnerCore, stage: w.document.getElementById('stage'), played };
}
const shown = (el) => !!el && !el.hidden && !el.closest('[hidden]');
const cue = (stage) => stage.querySelector('.asr-cue-bar > span:not(.asr-badge)').textContent;
const keys = (stage) => [...stage.querySelectorAll('.asr-key')].map((k) => k.textContent.trim());
function answerRight(h, stage) { const c = h.getState().current; const b = [...stage.querySelectorAll('.asr-key')].find((k) => k.getAttribute('data-sr-choice') === c.answer); b.click(); }

describe('the scheduler', () => {
  it('keeps the look-alike on the keys, and gives the bigger-number game only its two numbers', () => {
    const { core } = load();
    const s = core.createScheduler({ modeId: 'confusable_letters', count: 40, seed: 9 });
    const ALIKE = { b: 'd', d: 'b', p: 'q', q: 'p' };
    const q = s.peekQueue();
    let seen = 0;
    q.forEach((c) => { if (ALIKE[c.answer]) { seen++; expect(c.choices, c.answer).toContain(ALIKE[c.answer]); } });
    expect(seen).toBeGreaterThan(10);
    const size = core.createScheduler({ modeId: 'number_size_stroop', count: 12, seed: 4 }).peekQueue();
    size.forEach((c) => { expect(c.choices.slice().sort()).toEqual([String(c.sizePair.left), String(c.sizePair.right)].sort()); expect(c.choices).toContain(c.answer); });
    const teens = core.createScheduler({ modeId: 'digits_teen_decade', count: 20, seed: 2 }).peekQueue();
    teens.filter((c) => c.answer === '12').forEach((c) => expect(c.choices).toContain('21'));
  });

  it('a mix-up fixed at once still reaches the practice list; a long word may take longer before it counts as slow', () => {
    const { core } = load();
    const s = core.createScheduler({ modeId: 'confusable_letters', count: 8, seed: 1 });
    const first = s.current();
    s.recordResult(first, { correct: true, firstTry: false, rtMs: 900 });
    expect(s.stats().perSymbol.find((p) => p.answer === first.answer).missed).toBe(1);
    expect(s.stats().focusSuggestions).toContain(first.answer);
    const words = core.createScheduler({ modeId: 'sight_words_g2_3', count: 6, seed: 3 });
    const w0 = words.current();
    words.recordResult(w0, { correct: true, firstTry: true, rtMs: 1800 + 200 * (w0.display.length - 2) - 50 });
    expect(words.stats().perSymbol[0].slow).toBe(0);
    expect(words.stats().baseCount).toBe(6);
  });

  it('alternating sets keep their pattern: no extra cards are woven in after a miss', () => {
    const { core } = load();
    const s = core.createScheduler({ modeId: 'ras_switch', count: 10, seed: 5 });
    const before = s.peekQueue().length;
    s.recordResult(s.current(), { correct: true, firstTry: false, rtMs: 5000 });
    expect(s.peekQueue().length).toBe(before);
    const pattern = s.peekQueue().map((c) => (/^[0-9]+$/.test(c.answer) ? 'n' : 'l')).join('');
    expect(pattern).toBe('lnlnlnlnln');
  });
});

describe('the game', () => {
  it('hides what it hides: the rule that makes "hidden" win, and no lane row, color key or summary in Direct mode', () => {
    const { core, stage, d } = load();
    core.mountRunner(stage, { modeId: 'letters_lower', seed: 2 });
    expect(d.getElementById('allo-symbol-runner-styles').textContent).toContain('.asr-wrap [hidden]{display:none!important}');
    expect([shown(stage.querySelector('.asr-lock-row')), shown(stage.querySelector('.asr-legend')), shown(stage.querySelector('.asr-summary')), shown(stage.querySelector('.asr-lock-pill'))]).toEqual([false, false, false, false]);
    // Without a Start button (the Packets page), the round is live at once, as before.
    expect(shown(stage.querySelector('[data-sr-start]'))).toBe(false);
    expect(keys(stage).length).toBeGreaterThan(3);
  });

  it('with a Start button: nothing to answer and no card until Start; then the clock starts and the first key has the focus', () => {
    const { core, stage, w } = load();
    const starts = [];
    const h = core.mountRunner(stage, { modeId: 'digits_single', seed: 6, startButton: true, onStart: () => starts.push(1) });
    expect(shown(stage.querySelector('[data-sr-start]'))).toBe(true);
    expect(shown(stage.querySelector('.asr-stage'))).toBe(false);
    expect(shown(stage.querySelector('.asr-keypad'))).toBe(false);
    h.submit(h.getState().current.answer);
    expect(h.getState().stats.total).toBe(0);
    stage.querySelector('[data-sr-start]').click();
    expect(starts).toEqual([1]);
    expect(shown(stage.querySelector('.asr-stage'))).toBe(true);
    expect(w.document.activeElement.className).toBe('asr-key');
    // The first instruction is said for a screen reader, not shown twice.
    expect(stage.querySelector('.asr-status span').textContent).toBe('');
    expect(stage.querySelector('.asr-status .asr-sr').textContent).toBe(' ' + cue(stage));
    h.destroy();
  });

  it('after an answer: the answer named in plain words with seconds, the next card said, and the focus kept on a key', () => {
    const { core, stage, w } = load();
    const h = core.mountRunner(stage, { modeId: 'color_word_stroop', seed: 7 });
    const c = h.getState().current;
    stage.querySelector('.asr-key').focus();
    answerRight(h, stage);
    const said = stage.querySelector('.asr-status').textContent;
    // The ink color the child named, not the word printed on the card.
    expect(said).toMatch(new RegExp('^Yes, ' + c.answer + '\\. [\\d.]+ s\\. Next card\\. Say the color of the ink, not the word\\.$'));
    expect(said).not.toMatch(/ms\b|Got /);
    expect(w.document.activeElement.className).toBe('asr-key');
    expect(cue(stage)).toBe('Say the color of the ink, not the word.');
    expect(stage.querySelector('.asr-badge').textContent).toBe('Ink color');
    h.destroy();
  });

  it('dots: no Hear button and no count in the words; a miss says the answer plainly', () => {
    const { core, stage } = load();
    const h = core.mountRunner(stage, { modeId: 'subitize_dots', seed: 8 });
    expect(cue(stage)).toBe('How many dots?');
    expect(shown(stage.querySelector('[data-sr-hear]'))).toBe(false);
    const c = h.getState().current;
    h.submit(c.answer === '1' ? '2' : '1');
    expect(stage.querySelector('.asr-status').textContent).toBe('Not quite. It is ' + c.answer + '. Say it and tap it.');
    expect(read('symbol_runner_core.js')).toContain("ctx.fillText('NEXT: ' + (current.nextPreview.dots ? 'dots' : current.nextPreview.display)");
    h.destroy();
  });

  it('time with the page hidden is left out of the card\'s time', () => {
    const { core, stage, d, w } = load();
    let now = 1000000;
    w.Date.now = () => now;
    const h = core.mountRunner(stage, { modeId: 'digits_single', seed: 6 });
    now += 500;
    Object.defineProperty(d, 'hidden', { configurable: true, get: () => true });
    d.dispatchEvent(new w.Event('visibilitychange'));
    now += 60000;
    Object.defineProperty(d, 'hidden', { configurable: true, get: () => false });
    d.dispatchEvent(new w.Event('visibilitychange'));
    now += 700;
    answerRight(h, stage);
    expect(stage.querySelector('.asr-status').textContent).toMatch(/^Yes, \d\. 1\.2 s\./);
    h.destroy();
  });

  it('grid view: no lanes even in Aim mode (the answer is taken at once), and the cells are a list with the current one marked', () => {
    const { core, stage } = load();
    const h = core.mountRunner(stage, { modeId: 'letters_lower', seed: 3, viewMode: 'grid', controlMode: 'lockon' });
    expect(shown(stage.querySelector('.asr-lock-row'))).toBe(false);
    expect(shown(stage.querySelector('canvas'))).toBe(false);
    const grid = stage.querySelector('.asr-ran-grid');
    expect([grid.getAttribute('role'), grid.querySelectorAll('button').length, grid.querySelectorAll('[aria-current="true"]').length]).toEqual(['list', 0, 1]);
    answerRight(h, stage);
    expect(h.getState().stats.total).toBe(1);
    h.destroy();
  });

  it('progress counts the round\'s own cards, extra practice is named, and stars replace a streak that resets', () => {
    const { core, stage } = load();
    const h = core.mountRunner(stage, { modeId: 'confusable_letters', seed: 4, count: 8 });
    const pill = () => stage.querySelector('.asr-hud .asr-pill').textContent;
    expect(pill()).toBe('Card 1 of 8');
    const c = h.getState().current;
    h.submit(c.answer === 'b' ? 'd' : 'b');
    answerRight(h, stage);
    expect(pill()).toBe('Card 2 of 8');
    expect(stage.querySelectorAll('.asr-hud .asr-pill')[1].textContent).toBe('★ 0');
    // Play on until an extra-practice card comes round.
    let sawExtra = false;
    for (let i = 0; i < 20 && h.getState().current; i++) { if (/^Extra practice · \d+ of 8 done$/.test(pill())) sawExtra = true; answerRight(h, stage); }
    expect(sawExtra).toBe(true);
    h.destroy();
  });

  it('the ending: for the child, with the numbers in a fold; Play again replaces the game in place, for whoever holds the handle', () => {
    const { core, stage, w } = load();
    const done = [];
    const h = core.mountRunner(stage, { modeId: 'digits_single', seed: 1, count: 4, startButton: true, onComplete: (st) => done.push(st) });
    stage.querySelector('[data-sr-start]').click();
    while (h.getState().current) answerRight(h, stage);
    const sum = stage.querySelector('.asr-summary');
    expect(shown(sum)).toBe(true);
    expect(sum.querySelector('h3').textContent).toBe('You did it!');
    expect(w.document.activeElement).toBe(sum.querySelector('h3'));
    expect(sum.querySelector('.asr-stars').textContent).toBe('★ 4 stars');
    expect(sum.querySelector('details').open).toBe(false);
    expect(sum.querySelector('details summary').textContent).toBe('For grown-ups: the numbers');
    expect(sum.querySelector('details').textContent).toMatch(/Right on the first try: 4 of 4\. About [\d.]+ s each\./);
    expect([shown(stage.querySelector('.asr-cue-bar')), shown(stage.querySelector('.asr-stage'))]).toEqual([false, false]);
    expect(done[0].baseCount).toBe(4);
    const firstDestroy = h.destroy;
    sum.querySelector('button').click();
    // One game, live at once (no Start again), and the handle now drives it.
    expect(stage.querySelectorAll('.asr-wrap').length).toBe(1);
    expect(shown(stage.querySelector('[data-sr-start]'))).toBe(false);
    expect(h.destroy).not.toBe(firstDestroy);
    expect(h.getState().stats.total).toBe(0);
    answerRight(h, stage);
    expect(h.getState().stats.total).toBe(1);
    h.destroy();
  });

  it('with a host panel: the game leaves View, Mode and High contrast to it, and keeps Sound', () => {
    const { core, stage } = load();
    const h = core.mountRunner(stage, { modeId: 'letters_lower', seed: 2, hostControls: true });
    expect([...stage.querySelectorAll('.asr-controls button')].map((b) => b.textContent)).toEqual(['Sound: On']);
    h.destroy();
    const p = core.mountRunner(stage, { modeId: 'letters_lower', seed: 2 });
    expect([...stage.querySelectorAll('.asr-controls button')].map((b) => b.textContent)).toEqual(['View: three flat lanes', 'Answer: right away', 'High contrast', 'Sound: On']); // reduced motion here: 2D
    p.destroy();
  });

  it('the app copy of the game is this file', () => {
    const src = read('symbol_runner_core.js').trimEnd().split(/\r?\n/).map((l) => (l ? '    ' + l : '')).join('\n');
    expect(read('math_fluency_module.js').replace(/\r\n/g, '\n')).toContain(src);
  });
});

// Round 4 (2026-11-17, Aaron: "do your recommendations").
describe('rehearsal, help and the grid', () => {
  it('Incremental Rehearsal: a miss brings the symbol back after 1 card; each quick right answer widens the gap (2, then 4, then 8)', () => {
    const { core } = load();
    const s = core.createScheduler({ modeId: 'letters_lower', count: 20, seed: 11 });
    const where = (answer, from) => s.peekQueue().findIndex((c, i) => i > from && c.answer === answer && /^sr-ir-/.test(c.id));
    const first = s.current();
    s.recordResult(first, { correct: true, firstTry: false, rtMs: 900 });
    // Missed at card 0: back at 0 + 1 + 1.
    let at = where(first.answer, 0);
    expect(at).toBe(2);
    const gaps = [];
    for (let guard = 0; guard < 40 && s.current(); guard++) {
      const c = s.current();
      const idx = c.index;
      s.recordResult(c, { correct: true, firstTry: true, rtMs: 500 });
      if (c.answer === first.answer && /^sr-ir-/.test(c.id)) { const next = where(first.answer, idx); if (next > 0) gaps.push(next - idx - 1); }
    }
    expect(gaps).toEqual([2, 4, 8]);
  });

  it('a card where Hear it was pressed before the answer is noted, and the adult numbers say how many', () => {
    const { core, stage } = load();
    const clips = Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((l) => [l, 'data:audio/wav;base64,AA==']));
    const h = core.mountRunner(stage, { modeId: 'letters_lower', seed: 2, count: 4, localSpeechFallback: false, letterAudio: clips, phonemeAudio: clips, audioMode: 'name' });
    const hear = stage.querySelector('[data-sr-hear]');
    expect(hear.textContent).toBe('Hear it');
    let pressed = 0;
    while (h.getState().current) {
      if (shown(hear) && pressed < 2) { hear.click(); pressed++; }
      answerRight(h, stage);
    }
    const st = h.getState().stats;
    expect(pressed).toBe(2);
    expect(st.helped).toBe(2);
    // Still counted right at the first try: practice stays kind.
    expect(st.firstTryCorrect).toBe(4);
    expect(stage.querySelector('.asr-summary details').textContent).toContain('Hear it was pressed on 2 cards before the answer.');
    h.destroy();
  });

  it('grid cells show what the card shows: the middle letter marked, the two sizes, the dots as a dice pattern', () => {
    const { core, stage } = load();
    let h = core.mountRunner(stage, { modeId: 'flanker_letters', seed: 3, viewMode: 'grid' });
    const cell = stage.querySelector('.asr-ran-cell');
    const q = h.getState().stats.rehearsalQueue[0];
    expect(cell.querySelector('.asr-mid').textContent).toBe(q.display.charAt(q.flankerCenter));
    h.destroy();
    h = core.mountRunner(stage, { modeId: 'number_size_stroop', seed: 3, viewMode: 'grid' });
    const sizes = [...stage.querySelector('.asr-ran-cell').querySelectorAll('span')].map((n) => parseInt(n.style.fontSize, 10));
    expect(sizes).toHaveLength(2);
    expect(sizes[0]).not.toBe(sizes[1]);
    h.destroy();
    h = core.mountRunner(stage, { modeId: 'subitize_dots', seed: 3, viewMode: 'grid' });
    const d0 = h.getState().stats.rehearsalQueue[0];
    const dc = stage.querySelector('.asr-ran-cell');
    expect(dc.querySelectorAll('.asr-dots span')).toHaveLength(9);
    expect(dc.querySelectorAll('.asr-dots span.on')).toHaveLength(d0.dots);
    expect(dc.getAttribute('aria-label')).toBe(d0.dots + ' dots');
    expect(dc.textContent).toBe('');
    h.destroy();
  });
});

// Round 5 (2026-11-17): the game's words can be translated.
describe('translation', () => {
  it('a host passes t(key, english, vars): the game shows its words, fills in the blanks, and keeps English where it has none', () => {
    const { core, stage } = load();
    const asked = [];
    const ES = { 'math_fluency.sr_start': 'Empezar', 'math_fluency.sr_cue_say': 'Dilo y tócalo: {s}', 'math_fluency.sr_yes': 'Sí, {answer}. {time}.', 'math_fluency.sr_seconds': '{n} s', 'math_fluency.sr_card': 'Tarjeta {n} de {total}' };
    const t = (key, english, vars) => { asked.push(key); return ES[key]; };
    const h = core.mountRunner(stage, { modeId: 'digits_single', seed: 4, startButton: true, t });
    expect(stage.querySelector('[data-sr-start]').textContent).toBe('Empezar');
    stage.querySelector('[data-sr-start]').click();
    const c = h.getState().current;
    expect(cue(stage)).toBe('Dilo y tócalo: ' + c.display);
    expect(stage.querySelector('.asr-hud .asr-pill').textContent).toBe('Tarjeta 1 de 20');
    answerRight(h, stage);
    const said = stage.querySelector('.asr-status span').textContent;
    expect(said.startsWith('Sí, ' + c.answer + '. ') && / s\.$/.test(said)).toBe(true);
    // A word with no translation stays English.
    expect(stage.querySelector('.asr-badge').textContent).toBe('Number');
    expect(asked.every((k) => /^math_fluency\.sr_[a-z0-9_]+$/.test(k))).toBe(true);
    h.destroy();
  });

  it('every word the game asks for is registered in ui_strings.js with the same English', () => {
    const src = read('symbol_runner_core.js');
    const en = JSON.parse(src.slice(src.indexOf('var SR_EN = ') + 'var SR_EN = '.length, src.indexOf('};', src.indexOf('var SR_EN = ')) + 1).replace(/,\s*\}$/, '}'));
    const ui = JSON.parse(read('ui_strings.js')).math_fluency;
    for (const [id, english] of Object.entries(en)) expect(ui['sr_' + id], id).toBe(english);
    // Every T('id') in the game names a word that exists.
    const used = [...src.matchAll(/\bT\('([a-z0-9_]+)'/g)].map((m) => m[1]);
    for (const id of used) expect(en[id], id).toBeDefined();
    // The app's panel hands the game its translator.
    expect(read('math_fluency_module.js')).toContain("t: function (key, english, vars) { return tt(key, english, vars || undefined); },");
  });
});

// Round 6 (2026-11-17): a teacher's own list.
describe('own symbol list', () => {
  it('takes letters and words of any language, an apostrophe or hyphen inside a word, up to 16 characters, and says what it left out', () => {
    const { core } = load();
    const r = core.customSymbolReport("b d niño beautiful don't self-made 12 averyveryverylongword x@y Ñ b");
    expect(r.items.map((i) => i.answer + ':' + i.category)).toEqual(['b:letter', 'd:letter', 'niño:word', 'beautiful:word', "don't:word", 'self-made:word', '12:number', 'Ñ:letter']);
    expect(r.skipped).toEqual([{ text: 'averyveryverylongword', why: 'long' }, { text: 'x@y', why: 'characters' }]);
    // The round uses them; a word gets the Word badge, not Letter.
    const { stage } = load();
    const { core: c2 } = load();
    expect(core.parseCustomSymbols('cat, dog').map((i) => i.category)).toEqual(['word', 'word']);
    expect(c2).toBeTruthy();
    expect(stage).toBeTruthy();
  });
});
