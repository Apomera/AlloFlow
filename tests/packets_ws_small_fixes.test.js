// Small fixes to the Word Sounds activities of practice files (2026-11-13, polish pass; the list is
// C:/tmp/packets_build_1111/polish_ws/FINDINGS.md):
// - Missing Letter: the wrong letters were always the start of the alphabet (pig: i, a, b, c). A file now draws
//   three letters of the answer's kind (vowels for a vowel), seeded, and the answer moves about.
// - Letter Trace: the maker's choice (tracingCases) reaches the file.
// - Sound Sort and Word Families without letters: the instruction said "Tap each word to hear it", but a tap on a
//   choice chooses it. A wrong choice is out after its first tap (a second tap cost another try before).
// - The R key plays the question again in the activities that play their own opening (Blend Sounds, Sound Swap,
//   Rhyme Time, Sound Sort, Word Families, Syllable Blending); before, it did nothing there.
// - The rows of an English word keep left-to-right order in a right-to-left page (an Arabic or Hebrew app).
// - Button words in sentence case, as on every other button: Check spelling, Show vowels, Show more.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const WORDS = ['cat', 'dog', 'sun', 'pig', 'hat', 'map', 'cup', 'pen', 'top', 'bed', 'fish', 'ship', 'frog', 'lamp'];
const build = (over = {}) => builder.buildPacket({ words: WORDS, activities: ['missing_letter'], seed: 1, title: 'Fixes', core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
  createdAt: '2026-11-13T00:00:00.000Z', ...over });
const opened = [];
afterAll(() => opened.forEach((w) => w.close()));

describe('Missing Letter choices', () => {
  it('three wrong letters of the answer\'s kind, all different, the answer in different places', async () => {
    const made = await build();
    const items = made.lesson.blocks[0].items;
    expect(items.length).toBeGreaterThan(8);
    const places = new Set();
    for (const item of items) {
      expect(item.options, item.word).toHaveLength(4);
      expect(new Set(item.options).size, item.word).toBe(4);
      expect(item.options, item.word).toContain(item.target);
      const vowel = /^[aeiou]$/.test(item.target);
      for (const letter of item.options) expect(/^[aeiou]$/.test(letter), item.word + ': ' + letter).toBe(vowel);
      places.add(item.options.indexOf(item.target));
    }
    expect(places.size).toBeGreaterThanOrEqual(3);
    // Not the start of the alphabet any more.
    expect(items.filter((item) => item.options.filter((l) => 'abc'.includes(l) && l !== item.target).length === 3)).toEqual([]);
    // The same inputs give the same file; another version gives other choices.
    expect((await build()).html).toBe(made.html);
    const other = (await build({ seed: 2 })).lesson.blocks[0].items;
    expect(other.map((i) => i.options.join('')).join()).not.toBe(items.map((i) => i.options.join('')).join());
  });
});

describe('Letter Trace: the maker\'s choice reaches the file', () => {
  it('both by default; capital or lowercase when asked; anything else is both', async () => {
    const kinds = async (tracingCases) => (await build({ activities: ['letter_tracing'], tracingCases, words: ['cat', 'sun'] })).lesson.blocks[0].items.map((i) => i.parts.map((p) => p.kind + p.letter).join(' '));
    expect(await kinds(undefined)).toEqual(['capitalC lowercasec', 'capitalS lowercases']);
    expect(await kinds('capital')).toEqual(['capitalC', 'capitalS']);
    expect(await kinds('lowercase')).toEqual(['lowercasec', 'lowercases']);
    expect(await kinds('upper')).toEqual(['capitalC lowercasec', 'capitalS lowercases']);
  });

  it('"Open a file I made" reads the choice back', async () => {
    const verify = require('../packets_verify_core.js');
    const reopen = require('../packets_reopen.js');
    const ENV = { verify, creditLine: builder.creditLine, codeName: builder.codeName, activities: builder.SUPPORTED_ACTIVITIES, wordSounds: core.activityIds(), labels: dictionary.labels, seeds: { A: 1, B: 2, C: 3 } };
    for (const cases of [undefined, 'capital', 'lowercase']) {
      const made = await build({ activities: ['isolation', 'letter_tracing'], tracingCases: cases, words: ['cat', 'sun'] });
      expect(reopen.read(Buffer.from(made.html), ENV).tracing, String(cases)).toBe(cases || 'both');
    }
  });

  it('the maker page offers the choice when Letter Trace is chosen, keeps it, and hands it to the builder', () => {
    const html = readFileSync('packets-make.html', 'utf8');
    expect(html).toMatch(/<select id="f-trace-cases"[^>]*>\s*<option value="both">Capital, then lowercase<\/option>\s*<option value="capital">Capital only<\/option>\s*<option value="lowercase">Lowercase only<\/option>/);
    const js = readFileSync('packets-make.js', 'utf8');
    expect(js).toContain("show('trace-cases-field', state.activities.indexOf('letter_tracing') >= 0);");
    expect(js).toContain("if (state.tracing !== 'both' && plan.activities.indexOf('letter_tracing') >= 0) options.tracingCases = state.tracing;");
    expect(js).toContain('tracing: state.tracing }));');
    expect(js).toContain('if (TRACE_CASES.indexOf(result.tracing) >= 0) fresh.tracing = result.tracing;');
  });
});

// A file in jsdom, with every clip a stand-in.
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 12), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
function open(html, dir) {
  const played = [];
  const dom = new JSDOM(dir ? html.replace('<html', '<html dir="' + dir + '"') : html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/f.html', beforeParse(w) {
    w.Audio = class { constructor(src) { this.src = src; } play() { played.push(this.src); return Promise.resolve(); } pause() {} };
  } });
  opened.push(dom.window);
  const d = dom.window.document;
  d.getElementById('learner-name').value = 'Ana';
  [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start').click();
  return { d, dom, played, key: (k) => d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })) };
}

describe('in the file', () => {
  it('Sound Sort and Word Families without letters say to press Listen; a wrong choice is out after one tap', async () => {
    const made = await build({ activities: ['sound_sort', 'word_families'], words: ['cat', 'hat', 'mat', 'sun', 'sat', 'bat', 'pig'] });
    const ids = made.lesson.blocks.map((b) => b.activity);
    expect(ids).toContain('sound_sort');
    const t = open(made.html);
    const first = made.lesson.blocks[0];
    expect(t.d.getElementById('app').textContent).toContain(first.activity === 'sound_sort' ? 'Press Listen to hear each word. Then choose every one that matches.'
      : 'Press Listen to hear each word. Then choose every one that is in the family.');
    expect(t.d.getElementById('app').textContent).not.toContain('Tap each word to hear it');
    const item = first.items[0];
    const wrong = item.chips.findIndex((c) => !c.member);
    expect(wrong).toBeGreaterThanOrEqual(0);
    const choose = () => t.d.querySelectorAll('li.choice')[wrong].querySelector('button.primary');
    choose().click();
    expect(choose().getAttribute('aria-disabled')).toBe('true');
    const tries = () => JSON.parse(t.dom.window.localStorage.getItem(Object.keys(t.dom.window.localStorage)[0])).items[0].attempts;
    expect(tries()).toBe(1);
    choose().click();
    expect(tries()).toBe(1);
  });

  it('the R key plays the opening again in Blend Sounds and Rhyme Time', async () => {
    const made = await build({ activities: ['blending', 'rhyming'], words: ['cat', 'hat', 'sun', 'pig', 'dog'] });
    const t = open(made.html);
    const lesson = made.lesson;
    const blend = lesson.blocks[0].items[0];
    await new Promise((r) => setTimeout(r, 30));
    const before = t.played.length;
    t.key('r');
    await new Promise((r) => setTimeout(r, 30));
    expect(t.played.length).toBeGreaterThan(before);
    expect(t.played[before]).toBe(lesson.audio[blend.sounds[0]]);
  });

  it('an English word\'s boxes run left to right in a right-to-left page', async () => {
    const made = await build({ activities: ['missing_letter', 'spelling_bee', 'word_scramble', 'segmentation', 'mapping'], words: ['cat'] });
    const t = open(made.html, 'rtl');
    const seen = [];
    for (let i = 0; i < made.lesson.blocks.length; i++) {
      const rows = [...t.d.querySelectorAll('#app .slots')];
      expect(rows.length, made.lesson.blocks[i].activity).toBeGreaterThan(0);
      for (const row of rows) expect(row.getAttribute('dir'), made.lesson.blocks[i].activity).toBe('ltr');
      seen.push(made.lesson.blocks[i].activity);
      // Move on: skip by finishing the item through the shell's record (the item stays unanswered).
      const next = t.d.querySelector('[data-next]');
      next.hidden = false; next.click();
    }
    expect(seen.length).toBe(5);
  });

  it('button words in sentence case', () => {
    const L = loader.ADAPTERS.spelling_bee.labels;
    expect([L.spelling_bee_check, L.spelling_bee_hint_vowels, L.spelling_bee_hint_more]).toEqual(['Check spelling', 'Show vowels', 'Show more']);
    expect(loader.ADAPTERS.syllable_blending.labels.syllable_blending_prompt).toMatch(/\.$/);
    expect(loader.ADAPTERS.sentence_match.labels.sentence_match_order_hint).toMatch(/\.$/);
    // The app's English words for the file say the same (ui_strings.js, word_sounds.take_home_player_<key>).
    const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
    expect(UI.take_home_player_spelling_bee_check).toBe('Check spelling');
    for (const [id, a] of Object.entries(loader.ADAPTERS)) for (const [key, value] of Object.entries(a.labels)) {
      if (typeof UI['take_home_player_' + key] === 'string') expect(UI['take_home_player_' + key], id + ': ' + key).toBe(value);
    }
    // The new words of this pass were not in ui_strings.js at first (as the reading tools' are not). Registered
    // 2026-11-13 (second pass, C:/tmp/packets_build_1111/polish_ws2/), in English: tests/packets_ws_fixes_2026_11_13b.test.js.
    expect(UI.take_home_player_done_practice).toBe(loader.DEFAULT_LABELS.done_practice);
  });
});

// Asked for by the math and vocabulary pass (C:/tmp/packets_build_1111/polish_mv/LOADER_REQUESTS.md #2), as its
// fact practice pads have it: a key of a CHECK's keypad pressed with the mouse leaves the focus in the answer box,
// so Enter sends the answer instead of pressing that key again. A key reached with Tab is still pressed with Enter.
describe('the check keypad', () => {
  it('a key pressed with the mouse keeps the focus in the answer box; Enter then goes to the next question', () => {
    const PC = {};
    new Function('window', readFileSync('packet_check_builder.js', 'utf8')).call(PC, PC);
    const C = PC.AlloPacketChecks;
    const time = { t: 1000 };
    const { html } = C.buildCheckPacket({ lesson: C.lessonFromMathProblems({ title: 'Facts', problems: C.parseProblems('7+8,12-5,6x4'), timeLimitS: null }), loader });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/c.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      // The check ignores an answer less than 250 ms after the question opens (a double tap): its clock is moved by hand.
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    } });
    opened.push(dom.window);
    const d = dom.window.document;
    const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
    const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
    d.getElementById('learner-name').value = 'Fox1';
    button('Next').click();
    for (let i = 0; i < 4 && !d.querySelector('[data-pad-input]'); i++) { const go = button('Start') || button('Next'); if (go) go.click(); }
    const box = d.querySelector('[data-pad-input]');
    expect(box).toBeTruthy();
    box.focus();
    time.t += 400;
    const first = d.getElementById('app').textContent;
    for (const key of ['1', '5']) {
      const down = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      d.querySelector('[data-key="' + key + '"]').dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      d.querySelector('[data-key="' + key + '"]').click();
      expect(d.activeElement).toBe(box);
    }
    expect(box.value).toBe('15');
    box.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(d.getElementById('app').textContent).not.toBe(first);
    expect(d.querySelector('[data-pad-input]').value).toBe('');
  });
});
