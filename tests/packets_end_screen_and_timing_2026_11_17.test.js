import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Packets, 2026-11-17 (review 2.1 and 2.2, the parts left over that day):
//   1. A practice file's end screen is for a young student: one big button, "Save my work", and the words for adults in a
//      fold ("For grown-ups"). A check keeps its own end screen (tests/packets_learner_tools.test.js covers both).
//   2. Math fact practice times the recall: from the fact being covered to the first answer from memory (item.recallMs in
//      the JSON; recall_items= and recall_median_ms= in the CSV "#summary" row; the item rows are unchanged).
//   3. A Symbol Runner item with something to ignore says in its id whether the two agree ("-match" / "-conflict"), and
//      the results reader counts the two kinds apart.
//   4. The Add up results page shows both.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const MP = require('../packet_math_practice_builder.js');
const SR = require('../packet_symbol_runner_builder.js');
const reader = require('../packets_results_reader.js');
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const LAST_CHANGED = Date.parse('2026-11-17T15:00:00Z');
const fnv = (text) => { let h = 2166136261 >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

// A built file, played in jsdom with a clock the test moves (the engine times items with performance.now()).
function play(html) {
  const saved = [];
  let clock = 5000;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/facts.html', beforeParse(w) {
    Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const q = (selector) => d.querySelector(selector);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  const t = {
    w, d, q, saved, seen, button,
    tick: (ms) => { clock += ms; },
    start: (name = 'BlueHeron7') => { d.getElementById('learner-name').value = name; button('Start').click(); },
    cover: () => q('[data-cover]').click(),
    type: (digits) => { String(digits).split('').forEach(press); press('next'); },
    next: () => (button('Next') || button('See my results')).click(),
    csv: () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; },
    json: () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); },
  };
  return t;
}

// Ten cards of cover, copy, compare. Card 2 is missed once from memory; the others are right at the first try.
// Recall times: card 1 2.0 s, card 2 1.5 s (wrong), card 3 4.0 s, the other seven 3.0 s each.
function playedFacts() {
  const html = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH }).html;
  const answers = lessonOf(html).blocks[0].items.map((it) => it.answer);
  expect(answers.length).toBe(10);
  const t = play(html);
  t.start();
  answers.forEach((answer, i) => {
    t.tick(2500); // looking at the fact: not part of the recall
    t.cover();
    if (i === 1) {
      t.tick(1500); t.type(Number(answer) + 1); // wrong from memory
      t.tick(700); t.type(answer); // typed while looking
      t.tick(900); t.type(answer); // right from memory, the second try
    } else { t.tick(i === 0 ? 2000 : i === 2 ? 4000 : 3000); t.type(answer); }
    t.next();
  });
  return t;
}

describe('1. the end screen of a practice file', () => {
  it('has one big button with a picture, "Save my work"; the words for adults wait in a fold', () => {
    const t = playedFacts();
    expect(t.q('#app h2').textContent).toBe('You finished!');
    const save = t.q('[data-save-csv]');
    expect([save.textContent, save.className, t.seen(save)]).toEqual(['Save my work', 'primary big', true]);
    expect(save.querySelector('.save-icon').getAttribute('aria-hidden')).toBe('true');
    expect(t.q('[data-last-step]').textContent).toBe('Last step: save your work for your teacher.');
    // Outside the fold: the big button, Practice again, and the lines that answer a press.
    const outside = [...t.d.querySelectorAll('#app .card button')].filter((b) => !b.closest('details') && t.seen(b)).map((b) => b.textContent);
    expect(outside).toEqual(['Save my work', 'Practice again']);
    const fold = t.q('[data-grown-ups]');
    expect([fold.tagName, fold.open, fold.querySelector('summary').textContent]).toEqual(['DETAILS', false, 'For grown-ups']);
    expect([...fold.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['Save my work makes a spreadsheet file (CSV). Give that file to the teacher.',
      'Saving does not send anything. Your teacher gets your work when you give them the file.']);
    expect([...fold.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Save my work as a file', 'Copy for a spreadsheet', 'About this file']);
    // The style travels in the file, and the picture is drawn with borders (it stays in forced colors).
    const css = t.d.querySelector('style').textContent;
    for (const rule of ['button.big{min-height:64px', '.save-icon::before{', '.grown-ups summary{']) expect(css, rule).toContain(rule);
    expect(/\.save-icon[^}]*background/.test(css)).toBe(false);
  });

  it('after the press, says where the file is going and what to do with it, in a student\'s words', () => {
    const t = playedFacts();
    const blob = t.csv();
    expect(blob.name).toMatch(/__BlueHeron7__\d{4}-\d{2}-\d{2}\.csv$/);
    const said = [...t.d.querySelectorAll('#app [role=status]')].map((node) => node.textContent).find((text) => /saving/.test(text));
    expect(said).toBe('Your browser is saving ' + blob.name + '. Give that file to your teacher. If nothing appears, press Save my work again, or ask a grown-up.');
    // Saved: the "last step" line is for a file that has not been saved, and Practice again no longer asks first.
    t.button('Practice again').click();
    expect(t.q('#learner-name')).toBeTruthy();
  });

  it('keeps the words a translation has when it was made before the new ones', () => {
    const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' });
    const labelsOf = (html) => JSON.parse(/\nvar labels=(.*);\nvar matches=/.exec(html)[1]);
    const made = (labels) => labelsOf(MP.buildMathPracticePacket({ lesson, loader: TH, labels }).html);
    const old = made({ save_csv: 'Guardar (CSV)', saving_file: 'Guardando {file}.', more_saves: 'Otras formas' });
    expect([old.save_work, old.saving_work, old.grown_ups, old.grown_ups_file]).toEqual(['Guardar (CSV)', 'Guardando {file}.', 'Otras formas', '']);
    const now = made({ save_csv: 'Guardar (CSV)', save_work: 'Guardar mi trabajo', grown_ups: 'Para adultos', grown_ups_file: 'Es un archivo CSV.' });
    expect([now.save_work, now.grown_ups, now.grown_ups_file]).toEqual(['Guardar mi trabajo', 'Para adultos', 'Es un archivo CSV.']);
    const plain = made();
    expect([plain.save_work, plain.grown_ups]).toEqual(['Save my work', 'For grown-ups']);
  });
});

describe('2. the recall time of math fact practice', () => {
  it('is timed from Cover it to the first answer from memory, and kept on the item in the JSON', () => {
    const t = playedFacts();
    const file = t.json();
    expect(file.items.map((it) => it.recallMs)).toEqual([2000, 1500, 4000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]);
    expect(file.items.map((it) => it.firstTry)).toEqual([true, false, true, true, true, true, true, true, true, true]);
    // The time on the item still counts the looking too.
    expect(file.items[0].ms).toBe(4500);
    // The summary: the facts right at the first try from memory, and the median of their recall times.
    expect([file.summary.recallItems, file.summary.recallMedianMs]).toEqual([9, 3000]);
  });

  it('adds two cells to the end of the CSV summary row, and leaves the item rows as they were', () => {
    const t = playedFacts();
    const text = t.csv().body;
    const lines = text.slice(1).split('\r\n').filter(Boolean);
    expect(lines[0].split(',').length).toBe(24);
    expect(lines.slice(1, 11).map((line) => line.split('","').length)).toEqual(Array(10).fill(24));
    const summary = lines.find((line) => line.startsWith('"#summary"'));
    expect(summary.split('","').slice(-3).join(' ')).toBe('accuracy_of_attempted_pct=100 recall_items=9 recall_median_ms=3000"');
    // A file that timed no recall (Word Sounds, vocabulary, a check) has neither cell.
    const none = TH.resultsCsv({ packet: { id: 'p', version: '1', mode: 'practice' }, sessionId: 's', items: [{ n: 1, activity: 'isolation', word: 'cat', attempts: 1, firstTry: true, correct: true, ms: 900 }] });
    expect(none.text({ method: 'fnv1a', value: '0' })).not.toContain('recall_');
  });

  it('a card that starts covered (a known fact in rehearsal) is timed from being shown', () => {
    const html = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'rehearsal', factSet: 'mul-7' }), loader: TH }).html;
    const items = lessonOf(html).blocks[0].items;
    const at = items.findIndex((it) => !it.study);
    expect(at).toBeGreaterThanOrEqual(0);
    const t = play(html);
    t.start();
    items.forEach((it, i) => {
      if (it.study) { t.tick(1000); t.cover(); }
      t.tick(i === at ? 1800 : 2200);
      t.type(it.answer);
      t.next();
    });
    const file = t.json();
    expect(file.items[at].recallMs).toBe(1800);
    expect(file.items.every((it) => typeof it.recallMs === 'number')).toBe(true);
  });

  it('both readers of a results file give the same typical time', async () => {
    const t = playedFacts();
    const csv = t.csv();
    const json = t.json();
    const fromCsv = await reader.read(csv.body, { name: csv.name, lastModified: LAST_CHANGED });
    const fromJson = await reader.read(JSON.stringify(json), { name: csv.name.replace(/\.csv$/, '.json'), lastModified: LAST_CHANGED });
    for (const got of [fromCsv, fromJson]) {
      expect(got.ok).toBe(true);
      expect(got.sessions[0].recall).toEqual({ items: 9, medianMs: 3000 });
      expect(got.sessions[0].integrity).toBe('ok');
    }
    // An older file states none.
    const older = await reader.read(csv.body.replace(',"recall_items=9","recall_median_ms=3000"', ''), { name: csv.name, lastModified: LAST_CHANGED });
    expect([older.sessions[0].recall, older.sessions[0].integrity]).toEqual([null, 'ok']);
  });
});

describe('3. matching and conflicting items of Symbol Runner', () => {
  it('each item with something to ignore says in its id whether the two agree, in practice files and in checks', () => {
    for (const mode of ['flanker_letters', 'color_word_stroop', 'quantity_stroop', 'number_size_stroop']) {
      for (const packetMode of ['practice', 'check']) {
        const items = SR.lessonFromSymbolRunner({ loader: TH, mode, packetMode }).lesson.blocks[0].items;
        const scored = items.filter((it) => !/-sample$/.test(it.id));
        expect(scored.length, mode).toBeGreaterThan(3);
        for (const it of scored) {
          expect(typeof it.congruent, mode + ' ' + it.id).toBe('boolean');
          expect(it.id, mode).toMatch(it.congruent ? /^symbol_runner-\d\d-match(?:-new|-known)?$/ : /^symbol_runner-\d\d-conflict(?:-new|-known)?$/);
        }
        for (const it of items.filter((x) => /-sample$/.test(x.id))) expect(it.id).not.toMatch(/match|conflict/);
      }
    }
    // A set with nothing to ignore has neither word in its ids.
    const letters = SR.lessonFromSymbolRunner({ loader: TH, mode: 'letters_lower' }).lesson.blocks[0].items;
    expect(letters.some((it) => /match|conflict/.test(it.id))).toBe(false);
  });

  const item = (n, id, firstTry, ms, tries = 1) => ({ n, itemId: 'symbol_runner-' + String(n).padStart(2, '0') + id, activity: 'symbol_runner', word: 'RED', target: 'red',
    responses: firstTry ? ['red'] : ['blue', 'red'], attempts: tries, firstTry, correct: true, done: true, ms, supports: {}, practice: null, flag: '' });
  const colors = (mode = 'practice') => ({ kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'sr-session-1', packet: { id: 'symbol-runner-colors', version: '1', form: '', mode },
    lessonId: 'symbol-runner-colors', revision: '1', lessonTitle: 'Symbol Runner: ink colors', activityTitles: { symbol_runner: 'Symbol runner' }, learner: 'RedFox3', learnerName: 'RedFox3',
    startedAt: '2026-11-17T14:00:00.000Z', finishedAt: '2026-11-17T14:03:00.000Z', startedLocal: '2026-11-17T09:00:00-05:00', finishedLocal: '2026-11-17T09:03:00-05:00', durationMs: 180000,
    items: [item(1, '-match', true, 1000), item(2, '-conflict', true, 2000), item(3, '-match', true, 1400), item(4, '-conflict', false, 5000, 2),
      item(5, '-match', false, 4000, 2), item(6, '-conflict', true, 2600), item(7, '-match', true, 1200), item(8, '-conflict', false, 6000, 2)] });

  it('the reader counts the two kinds apart: how many at the first try, and the typical time of those', async () => {
    const got = await reader.read(JSON.stringify(colors()), { name: 'colors__RedFox3__2026-11-17.json', lastModified: LAST_CHANGED });
    expect(got.ok).toBe(true);
    expect(got.sessions[0].conflict).toEqual({ matchItems: 4, matchFirstTry: 3, matchMedianMs: 1200, conflictItems: 4, conflictFirstTry: 2, conflictMedianMs: 2300 });
    // The ids are in the CSV rows too, so the spreadsheet file reads the same.
    const table = TH.resultsCsv(colors());
    const csv = await reader.read(table.text({ method: 'fnv1a', value: fnv(table.basis) }), { name: 'colors__RedFox3__2026-11-17.csv', lastModified: LAST_CHANGED });
    expect(csv.sessions[0].conflict).toEqual(got.sessions[0].conflict);
    // A rehearsal file's new and known facts still read from the end of the id.
    const mixed = colors();
    mixed.items[0].itemId += '-new'; mixed.items[1].itemId += '-known';
    const both = await reader.read(JSON.stringify(mixed), { name: 'colors__RedFox3__2026-11-17.json', lastModified: LAST_CHANGED });
    expect(both.sessions[0].conflict.matchItems + both.sessions[0].conflict.conflictItems).toBe(8);
    expect(both.sessions[0].newFacts).toMatchObject({ items: 1, knownItems: 1 });
    // A file with no such ids (every file made before today) has none.
    const plain = colors();
    plain.items.forEach((it) => { it.itemId = it.itemId.replace(/-(match|conflict)$/, ''); });
    expect((await reader.read(JSON.stringify(plain), { name: 'colors__RedFox3__2026-11-17.json', lastModified: LAST_CHANGED })).sessions[0].conflict).toBe(null);
  });

  // 4. The page.
  function openPage() {
    const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-results.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
    const page = { w, d, $: (id) => d.getElementById(id) };
    page.drop = async (files) => {
      const event = new w.Event('drop', { bubbles: true, cancelable: true });
      event.dataTransfer = { types: ['Files'], files: files.map(([text, name]) => new w.File([text], name, { type: name.endsWith('.json') ? 'application/json' : 'text/csv', lastModified: LAST_CHANGED })) };
      page.$('main').dispatchEvent(event);
      for (let i = 0; i < 1500 && !/\bread[,.]/.test(page.$('said').textContent); i++) await new Promise((resolve) => setTimeout(resolve, 10));
      return page.$('said').textContent;
    };
    page.learnerLines = () => {
      const radio = d.querySelector('input[name="view"][value="learner"]');
      radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true }));
      const every = [...page.$('learner-body').querySelectorAll(':scope > .table-scroll table')].pop();
      return [...every.querySelectorAll('tbody tr')].map((row) => { const td = row.children[2]; return [td.firstChild.textContent, ...[...td.querySelectorAll('.cell-sub')].map((node) => node.textContent)]; });
    };
    return page;
  }

  it('4. the Add up results page says both, under the result they belong to', async () => {
    const page = openPage();
    await page.drop([[JSON.stringify(colors()), 'colors__RedFox3__2026-11-17.json']]);
    expect(page.learnerLines()).toEqual([['63% on the first try', 'Matching items: 3 of 4 on the first try, typical time 1.2 s.', 'Conflicting items: 2 of 4 on the first try, typical time 2.3 s.']]);

    const facts = openPage();
    const t = playedFacts();
    const csv = t.csv();
    await facts.drop([[csv.body, csv.name]]);
    expect(facts.learnerLines()).toEqual([['90% on the first try', 'Typical time to answer from memory: 3 s (9 facts right on the first try).']]);
  });
});
