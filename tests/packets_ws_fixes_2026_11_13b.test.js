// Word Sounds in AlloFlow Packets, second small-fixes pass (2026-11-13; the owner's "make all fixes" on the list in
// C:/tmp/packets_build_1111/polish_ws/FINDINGS.md, O2-O16, and L5 of the math review). Notes:
// C:/tmp/packets_build_1111/polish_ws2/.
// - O2 Choices: the maker's Easy / Medium / All, with the core's choiceLimit + trimChoices, countingChoices and
//   isolationPositions; in the manifest, and read back by "Open a file I made".
// - O3 Listen, then Choose, in every activity with the pair. O4 letters in the case the word is written.
// - O5 the player's new words are in ui_strings.js. O6 Letter Trace's start tip. O7 Check, not Submit. O8 plain
//   Sound Swap words. O9 reading choices as written. O10 apostrophes, hyphens and spaces are fixed. O11 a picture
//   named twice. O12 the read-back after a right answer. O13 sound names with letters on. O14 key numbers on
//   pictures. O16 no "Hear the letter" without its clip. L5 a timed check's "Stop?" pauses the clock.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');
const ENV = { verify, creditLine: builder.creditLine, codeName: builder.codeName, activities: builder.SUPPORTED_ACTIVITIES, wordSounds: core.activityIds(), labels: dictionary.labels, seeds: { A: 1, B: 2, C: 3 } };
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const WORDS = ['cat', 'dog', 'sun', 'pig', 'hat', 'map', 'cup', 'pen', 'top', 'bed', 'fish', 'ship', 'frog', 'lamp', 'stop', 'nest'];
const CHOICE_ACTIVITIES = ['isolation', 'blending', 'rhyming', 'counting'];
const build = (over = {}) => builder.buildPacket({ words: WORDS, activities: CHOICE_ACTIVITIES, seed: 1, title: 'Fixes b', core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
  createdAt: '2026-11-13T00:00:00.000Z', ...over });
const blockOf = (made, id) => made.lesson.blocks.find((b) => b.activity === id);
const texts = (item) => (item.choices || []).map((c) => c.text || c.label);

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 12), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk';
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));

// A practice file in jsdom. Each clip "plays" for 5 ms and then ends, unless another clip or a pause cuts it off.
function open(html, { learner = 'Ana' } = {}) {
  const played = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/b.html', beforeParse(w) {
    w.Audio = class {
      play() { const n = this.n = (this.n || 0) + 1; played.push(this.src); setTimeout(() => { if (this.n === n && this.onended) this.onended(); }, 5); return Promise.resolve(); }
      pause() { this.n = (this.n || 0) + 1; }
    };
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  d.getElementById('learner-name').value = learner;
  [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start').click();
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  return { w, d, played, seen,
    key: (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })),
    button: (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text),
    text: () => d.getElementById('app').textContent,
    next: () => { const n = d.querySelector('[data-next]'); n.hidden = false; n.click(); } };
}
// A lesson straight from pack rows (the app's take-home path), with the real bank and stand-in clips for the rest.
const lessonOf = (rows, activities, extra = {}) => loader.lessonFromPack(rows, { core, banks: BANKS, activities, title: 'Direct', lessonId: 'L-b', ...extra });
const fileOf = (rows, activities, extra) => { const made = lessonOf(rows, activities, extra); return { lesson: made.lesson, made, html: loader.buildHtml(made.lesson, { core }) }; };
const clips = (...words) => Object.fromEntries(words.map((t) => [t, uri(t.slice(0, 10))]));

describe('O2 Choices: Easy, Medium, All', () => {
  it('Easy and Medium trim Find Sounds, Blend Sounds and Rhyme Time with the core\'s own functions; All keeps every choice', async () => {
    const all = await build({ choices: 'all' });
    const plain = await build();
    // No level (any caller but the maker) is All: the same file.
    expect(plain.html).toBe(all.html);
    for (const level of ['easy', 'medium']) {
      const made = await build({ choices: level });
      const limit = level === 'easy' ? 3 : 4;
      for (const id of ['isolation', 'blending', 'rhyming']) {
        const whole = blockOf(all, id), cut = blockOf(made, id);
        expect(cut, id).toBeTruthy();
        expect(cut.items.length, id).toBe(whole.items.length);
        cut.items.forEach((item) => {
          const choices = texts(item);
          expect(choices.length, level + ' ' + id + ' ' + item.word).toBeLessThanOrEqual(limit);
          expect(choices.length, item.word).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size).toBe(choices.length);
          expect(choices, item.word).toContain(item.target);
        });
        // Fewer than as built: the whole board has more choices than the limit for some word.
        expect(whole.items.some((item) => texts(item).length > limit), id).toBe(true);
      }
      // Blend Sounds is exactly the core's trimChoices of the whole board (word closeness, as the app's trimSoundChoices).
      const blendAll = blockOf(all, 'blending').items, blendCut = blockOf(made, 'blending').items;
      blendAll.forEach((item, i) => {
        const options = texts(item);
        const want = core.trimChoices({ options, answer: item.target, count: core.choiceLimit(level, options.length), difficulty: level, closeness: core.wordCloseness });
        expect(texts(blendCut[i]), item.word).toEqual(want);
      });
      // Find Sounds: Easy asks the first sound, Medium the first or the last (isolationPositions).
      blockOf(made, 'isolation').items.forEach((item) => {
        const sounds = dictionary.labels ? core.dictionarySounds(item.word).sounds.map((s) => core.phonemeLabel(s, true)) : [];
        expect(core.isolationPositions(level, sounds.length), item.word).toContain(item.position);
        expect(item.target, item.word).toBe(sounds[item.position]);
      });
      // Sound Counting: the count with two either side (Easy), 1-8 (Medium), as countingChoices.
      blockOf(made, 'counting').items.forEach((item) => {
        const want = core.countingChoices(Number(item.target), level);
        expect(item.values, item.word).toEqual(want.map(String));
        expect(item.values).toContain(item.target);
      });
    }
    // All: the counting row is the whole row (no values carried), Find Sounds may ask a middle sound.
    blockOf(all, 'counting').items.forEach((item) => expect(item.values).toBeUndefined());
    expect(blockOf(all, 'isolation').items.some((item) => item.position > 0 && item.position < core.dictionarySounds(item.word).sounds.length - 1)).toBe(true);
    // The same inputs make the same file.
    expect((await build({ choices: 'easy' })).html).toBe((await build({ choices: 'easy' })).html);
  });

  it('travels in the manifest and "Open a file I made" reads it back; a file from before reads as All', async () => {
    for (const level of ['easy', 'medium', 'all']) {
      const made = await build({ choices: level, activities: ['isolation', 'counting'], words: ['cat', 'sun', 'fish'] });
      expect(made.manifest.choices).toBe(level);
      expect(JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(made.html)[1]).builder.choices).toBe(level);
      expect(reopen.read(Buffer.from(made.html), ENV).choices, level).toBe(level);
    }
    expect((await build({ choices: 'many', words: ['cat'] })).manifest.choices).toBe('all');
    // A file made before 2026-11-13 has no "choices" in its builder block: it showed every choice.
    const made = await build({ choices: 'easy', activities: ['isolation'], words: ['cat'] });
    const older = made.html.replace(/,"choices":"easy"\}/, '}');
    expect(older).not.toBe(made.html);
    expect(reopen.read(Buffer.from(older), ENV).choices).toBe('all');
  });

  it('the maker offers it with the activities it changes, Medium first, keeps it and hands it to the builder', () => {
    const html = readFileSync('packets-make.html', 'utf8');
    expect(html).toMatch(/<select id="f-choices"[^>]*>\s*<option value="easy">Easy: fewer choices<\/option>\s*<option value="medium">Medium<\/option>\s*<option value="all">All<\/option>/);
    expect(html).toContain('id="choice-level-field" hidden');
    // One short line under the field (a phone shows it whole); what each level does is folded away.
    // 2026-11-14 (T1): renamed "Word Sounds" reference to "the AlloFlow app" so first-time teachers know what it refers to.
    expect(html).toContain('<span class="hint" id="choice-level-hint">How many answers to choose from. Medium matches the AlloFlow app.</span>');
    expect(html).toMatch(/<details class="why" id="choice-level-why">\s*<summary>What each level does<\/summary>\s*<ul>\s*<li>Easy: 3 choices[^<]*<\/li>\s*<li>Medium: 4 choices[^<]*<\/li>\s*<li>All: every choice[^<]*<\/li>/);
    const js = readFileSync('packets-make.js', 'utf8');
    expect(js).toContain("var CHOICE_ACTIVITIES = ['isolation', 'blending', 'rhyming', 'counting'];");
    expect(js).toContain("choices: 'medium' };");
    expect(js).toContain("show('choice-level-field', state.activities.some(function (id) { return CHOICE_ACTIVITIES.indexOf(id) >= 0; }));");
    expect(js).toContain("options.choices = CHOICE_LEVELS.indexOf(state.choices) >= 0 ? state.choices : 'medium';");
    expect(js).toContain('choices: state.choices, tracing: state.tracing }));');
    expect(js).toContain('if (CHOICE_LEVELS.indexOf(result.choices) >= 0) fresh.choices = result.choices;');
    expect(builder.CHOICE_LEVELS).toEqual(['easy', 'medium', 'all']);
  });

  it('with fewer numbers, the number keys still press the number they say', async () => {
    const made = await build({ choices: 'easy', activities: ['counting'], words: ['cat'] });
    const item = made.lesson.blocks[0].items[0];
    expect(item.values).toEqual(['1', '2', '3', '4', '5']);
    const t = open(made.html);
    expect([...t.d.querySelectorAll('li.choice button')].map((b) => b.textContent)).toEqual(item.values);
    t.key('9');
    expect(JSON.parse(Object.values(t.w.localStorage)[0]).items[0].attempts).toBe(0);
    t.key('3');
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! The word has 3 sounds.');
  });
});

describe('O3 Listen, then Choose', () => {
  it('every Listen + Choose pair has Listen first; the number keys still choose', async () => {
    const made = await build({ activities: ['isolation', 'blending', 'rhyming', 'sound_sort', 'word_families', 'segmentation', 'mapping'],
      words: ['cat', 'hat', 'mat', 'sat', 'bat', 'sun', 'pig', 'map', 'fish'] });
    const t = open(made.html);
    const seen = [];
    for (const block of made.lesson.blocks) {
      for (let i = 0; i < block.items.length; i++) {
        if (i === 0) {
          const pairs = block.activity === 'segmentation' || block.activity === 'mapping'
            ? [...t.d.querySelectorAll('#app ul.row > li')].filter((li) => li.querySelectorAll('button').length === 2)
            : [...t.d.querySelectorAll('#app li.choice')];
          expect(pairs.length, block.activity).toBeGreaterThan(1);
          for (const li of pairs) {
            const [a, b] = li.querySelectorAll('button');
            expect(a.classList.contains('primary'), block.activity + ': Listen first').toBe(false);
            expect(a.textContent, block.activity).toMatch(/^\u25B6/);
            expect(b.classList.contains('primary'), block.activity).toBe(true);
          }
          seen.push(block.activity);
        }
        t.next();
      }
    }
    expect(seen.sort()).toEqual(['blending', 'isolation', 'mapping', 'rhyming', 'segmentation', 'sound_sort', 'word_families']);
    // Key 1 still presses the first choice's Choose, not its Listen.
    const again = open((await build({ activities: ['blending'], words: ['cat', 'hat', 'sun'] })).html);
    await settle();
    again.key('1');
    expect(JSON.parse(Object.values(again.w.localStorage)[0]).items[0].attempts).toBe(1);
  });
});

describe('O4 letter case, O10 fixed characters', () => {
  it('Missing Letter, Spelling Bee and Word Scramble show a normal word in lowercase', async () => {
    const made = await build({ activities: ['missing_letter', 'spelling_bee', 'word_scramble'], words: ['cat'] });
    const t = open(made.html);
    const ml = made.lesson.blocks[0].items[0];
    const slots = [...t.d.querySelectorAll('#app .slots li')].map((li) => li.textContent);
    expect(slots.join('')).toBe('cat'.split('').map((l, i) => (i === ml.hiddenIndex ? '?' : l)).join(''));
    expect([...t.d.querySelectorAll('#app li.choice button')].map((b) => b.textContent)).toEqual(ml.options);
    expect(ml.options.every((l) => l === l.toLowerCase())).toBe(true);
    t.d.querySelector('#app li.choice button[aria-label="Letter ' + ml.target + '"]').click();
    t.button('Check answer').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! The missing letter is ' + ml.target + '.');
    expect(t.text()).toContain('The word is cat.');
    t.next();
    // Spelling Bee: boxes show what is typed, the keys are lowercase.
    const keys = [...t.d.querySelectorAll('[role="group"] button')].map((b) => b.textContent).filter((x) => /^[a-z]$/i.test(x));
    expect(keys.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const ch of 'cat') [...t.d.querySelectorAll('[role="group"] button')].find((b) => b.textContent === ch).click();
    expect([...t.d.querySelectorAll('#app .slots .slot')].map((s) => s.textContent).join('')).toBe('cat');
    expect(t.d.querySelector('#app .slots .slot').getAttribute('style')).not.toContain('uppercase');
    t.button('Check spelling').click();
    expect(t.text()).toContain('The word is spelled: cat');
    t.next();
    // Word Scramble: the tiles are lowercase.
    const tiles = [...t.d.querySelectorAll('#app ul[aria-label="Letters"] button')].map((b) => b.textContent);
    expect(tiles.slice().sort().join('')).toBe('act');
  });

  it('a name keeps its capital in the letters, the choices and the sentence that names it', () => {
    const row = { word: 'Sam', targetWord: 'Sam', _ttsAssets: clips('Sam'), activityItems: { missing_letter: { hiddenIndex: 0, correctLetter: 's', options: ['m', 's', 't', 'f'] }, word_scramble: { letters: ['a', 'm', 's'] } } };
    const { lesson, html } = fileOf([row], ['missing_letter', 'spelling_bee', 'word_scramble']);
    expect(lesson.blocks.map((b) => b.activity)).toEqual(['missing_letter', 'spelling_bee', 'word_scramble']);
    const t = open(html);
    expect([...t.d.querySelectorAll('#app li.choice button')].map((b) => b.textContent)).toEqual(['M', 'S', 'T', 'F']);
    expect([...t.d.querySelectorAll('#app .slots li')].map((li) => li.textContent).join('')).toBe('?am');
    t.d.querySelector('#app li.choice button[aria-label="Letter S"]').click();
    t.button('Check answer').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! The missing letter is S.');
    expect(t.text()).toContain('The word is Sam.');
    t.next();
    for (const ch of 'sam') [...t.d.querySelectorAll('[role="group"] button')].find((b) => b.textContent === ch).click();
    t.button('Check spelling').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! That is how to spell Sam.');
    t.next();
    expect([...t.d.querySelectorAll('#app ul[aria-label="Letters"] button')].map((b) => b.textContent)).toEqual(['a', 'm', 'S']);
  });

  it('an apostrophe, hyphen or space is a fixed character: no box, no tile, filled in for the student', async () => {
    const rows = ["don't", 'ice-cream'].map((w, i) => ({ word: w, targetWord: w, _ttsAssets: clips(w),
      activityItems: { word_scramble: { letters: w.split('').reverse() }, missing_letter: { hiddenIndex: i ? 1 : 0, correctLetter: w[i ? 1 : 0], options: i ? ['c', 'b', 'd', 'f'] : ['d', 'b', 'g', 'p'] } } }));
    const { lesson, html } = fileOf(rows, ['spelling_bee', 'word_scramble', 'orthography', 'missing_letter']);
    expect(lesson.blocks.map((b) => [b.activity, b.items.length])).toEqual([['spelling_bee', 2], ['word_scramble', 2], ['orthography', 2], ['missing_letter', 2]]);
    // Word Scramble's tiles are the letters only; Sight & Spell has no apostrophe or hyphen tile.
    expect(lesson.blocks[1].items.map((i) => i.letters.join(''))).toEqual(['tnod', 'maerceci']);
    expect(lesson.blocks[2].items.every((i) => i.extraTiles.length === 0)).toBe(true);
    const t = open(html);
    const keys = () => [...t.d.querySelectorAll('[role="group"] button')];
    const typeKeys = (s) => s.split('').forEach((ch) => keys().find((b) => b.textContent === ch).click());
    // Spelling Bee "don't": four boxes and the apostrophe; d, o, n fill it in, t finishes the word.
    expect(t.d.querySelectorAll('#app .slots .slot')).toHaveLength(4);
    expect(t.d.querySelector('#app .slots [data-fixed]').textContent).toBe("'");
    typeKeys('don');
    expect(t.d.querySelector('#app input').value).toBe("don'");
    typeKeys('t');
    expect(t.d.querySelector('#app input').value).toBe("don't");
    // The delete key takes the t, then the n (with the apostrophe).
    keys().find((b) => b.getAttribute('aria-label') === 'Delete the last letter').click();
    expect(t.d.querySelector('#app input').value).toBe("don'");
    keys().find((b) => b.getAttribute('aria-label') === 'Delete the last letter').click();
    expect(t.d.querySelector('#app input').value).toBe('do');
    // Typed without the apostrophe: the letters decide.
    const input = t.d.querySelector('#app input');
    input.value = 'dont';
    input.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    expect(input.value).toBe("don't");
    t.button('Check spelling').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe("Yes! That is how to spell don't.");
    t.next();
    // "ice-cream": the hyphen is filled in; the count line counts letters only.
    typeKeys('icecraem');
    t.button('Check spelling').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Not quite. Listen again and try once more.');
    expect(t.text()).toContain('6/8 letters correct');
    t.next();
    // Word Scramble "don't": four tiles, four boxes, the apostrophe in place.
    expect(t.d.querySelectorAll('#app ul[aria-label="Letters"] button')).toHaveLength(4);
    expect(t.d.querySelectorAll('#app ol.slots button')).toHaveLength(4);
    for (const ch of 'dont') {
      [...t.d.querySelectorAll('#app ul[aria-label="Letters"] button')].find((b) => b.textContent === ch && !b.closest('[hidden]')).click();
      t.d.querySelector('#app ol.slots button[aria-label$="empty"]').click();
    }
    t.button('Check').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe("Yes! The word is don't.");
    expect(JSON.parse(Object.values(t.w.localStorage)[0]).items[2].responses).toEqual(["don't"]);
    t.next(); t.next();
    // Sight & Spell "don't": typed "dont" is right.
    const ortho = t.d.querySelector('#app input');
    ortho.value = 'dont';
    t.button('Check spelling').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe("Yes! That is how to spell don't.");
    t.next(); t.next();
    // Missing Letter "don't": the apostrophe is shown plainly, not in a box.
    expect([...t.d.querySelectorAll('#app .slots li')].map((li) => (li.classList.contains('slot') ? '[' + li.textContent + ']' : li.textContent)).join('')).toBe("[?][o][n]'[t]");
  });
});

describe('O6 Letter Trace start tip, O16 Hear the letter', () => {
  const down = (t, type, x, y) => t.d.querySelector('[data-trace-pen]').dispatchEvent(new t.w.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));
  const stroke = (t, from, to) => { down(t, 'pointerdown', from[0], from[1]); down(t, 'pointermove', (from[0] + to[0]) / 2, (from[1] + to[1]) / 2); down(t, 'pointermove', to[0], to[1]); down(t, 'pointerup', to[0], to[1]); };
  it('a first stroke far from the green dot gets "Start at the green dot." as a tip; the trace still counts', async () => {
    // Lowercase l: one stroke down from (140, 38) in the 280 px box (jsdom reports a 0 px box, so a point is its client position).
    const made = await build({ activities: ['letter_tracing'], tracingCases: 'lowercase', words: ['lamp'] });
    const t = open(made.html);
    const note = () => t.d.querySelector('#app p[aria-live="polite"]').textContent;
    stroke(t, [140, 40], [140, 200]);
    expect(note()).toBe('');
    t.button('Start again').click();
    stroke(t, [60, 230], [140, 230]);
    expect(note()).toBe('Start at the green dot.');
    // Only the first stroke is looked at; a tap is not a stroke.
    t.button('Start again').click();
    stroke(t, [200, 200], [202, 201]);
    expect(note()).toBe('');
    stroke(t, [140, 40], [140, 200]);
    expect(note()).toBe('');
    t.button('Start again').click();
    stroke(t, [60, 230], [140, 230]);
    t.button('I traced it').click();
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Nice tracing!');
    expect(JSON.parse(Object.values(t.w.localStorage)[0]).items[0].responses).toEqual(['traced']);
  });

  it('a letter with several strokes says dot 1', async () => {
    const made = await build({ activities: ['letter_tracing'], tracingCases: 'capital', words: ['top'] });
    const t = open(made.html);
    stroke(t, [20, 250], [100, 250]);
    expect(t.d.querySelector('#app p[aria-live="polite"]').textContent).toBe('Start at the green dot 1.');
  });

  it('"Hear the letter" is there only with the letter\'s clip', () => {
    const row = (w) => ({ word: w, targetWord: w, _ttsAssets: clips(w), activityItems: { letter_tracing: { letter: w[0] } } });
    const t = open(fileOf([row('cat'), row('\u00e9t\u00e9')], ['letter_tracing']).html);
    expect(t.button('Hear the letter')).toBeTruthy();
    t.button('Skip (not traced)').click();
    t.next();
    expect(t.text()).toContain('\u00e9');
    expect(t.button('Hear the letter')).toBeUndefined();
    expect([...t.d.querySelectorAll('#app button')].filter(t.seen).map((b) => b.textContent)).not.toContain('Hear the letter');
  });
});

describe('O7, O8, O5 words', () => {
  it('Syllable Claps says Check; Sound Swap says what to do in plain words', () => {
    const L = loader.ADAPTERS.syllable_counting.labels;
    expect([L.syllable_counting_submit, L.syllable_counting_wait_word, L.syllable_counting_wait_audio, L.syllable_counting_ready])
      .toEqual(['Check', 'Hear the whole word before checking.', 'Wait for the word to finish before checking.', 'Ready to check.']);
    expect(Object.values(L).join(' ')).not.toMatch(/submit/i);
    const M = loader.ADAPTERS.manipulation.labels;
    expect([M.manipulation_type_deletion, M.manipulation_type_substitution]).toEqual(['Take away a sound', 'Change a sound']);
    expect(Object.values(M).join(' ')).not.toMatch(/phoneme/i);
  });

  it('every word the player shows has its key in ui_strings.js, in the same English, in all three copies', () => {
    const copies = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/app-build/ui_strings.js'].map((f) => JSON.parse(readFileSync(f, 'utf8')).word_sounds);
    const keys = ['done_practice', 'sound_name_oo_short', 'sound_name_dh', 'sound_name_zh', 'sound_name_schwa', 'check_paused',
      ...['capital', 'lowercase', 'tools', 'part', 'how_one', 'how_more', 'canvas_capital', 'canvas_lowercase', 'hear_letter', 'now_lowercase', 'skip_lowercase', 'word', 'start_one', 'start_more'].map((k) => 'letter_tracing_' + k),
      'sound_sort_instruction_listen', 'word_families_instruction_listen',
      'syllable_counting_submit', 'syllable_counting_wait_word', 'syllable_counting_wait_audio', 'syllable_counting_ready', 'manipulation_type_deletion', 'manipulation_type_substitution'];
    const english = (k) => loader.DEFAULT_LABELS[k] ?? loader.CHECK_LABELS[k] ?? Object.values(loader.ADAPTERS).map((a) => a.labels[k]).find((v) => v != null);
    for (const UI of copies) for (const k of keys) expect(UI['take_home_player_' + k], k).toBe(english(k));
    // Every Word Sounds adapter label is registered now (the reading tools' and Hear all's words, in DEFAULT_LABELS, are not yet).
    const missing = Object.values(loader.ADAPTERS).flatMap((a) => Object.keys(a.labels)).filter((k) => typeof copies[0]['take_home_player_' + k] !== 'string');
    expect(missing).toEqual([]);
  });
});

describe('O9 reading choices as written, O12 the read-back', () => {
  const PROMPT = 'Read the sentence. Which word finishes it?';
  const sentenceRow = () => ({ word: 'Sam', targetWord: 'Sam', _ttsAssets: clips('Sam', PROMPT, 'I see Sam.'),
    activityItems: { read_sentence: { sentence: 'I see Sam.', before: 'I see ', after: '.', options: ['cat', 'Sam', 'dog'] } } });
  it('a name keeps its capital in the choices and the word card', () => {
    const t = open(fileOf([sentenceRow()], ['read_sentence']).html);
    const spans = [...t.d.querySelectorAll('#app li.choice button span')];
    expect(spans.map((s) => s.textContent)).toEqual(['cat', 'Sam', 'dog']);
    for (const s of spans) expect(s.getAttribute('style') || '').not.toContain('lowercase');
    expect(t.text()).toContain('Your word: Sam');
    expect(readFileSync('word_sounds_take_home/adapters/read_passage.js', 'utf8')).not.toContain('text-transform:lowercase');
  });

  it('after a right answer the sentence is read back by itself, once the praise is over; not after a miss', async () => {
    const { lesson, html } = fileOf([sentenceRow()], ['read_sentence']);
    const sentence = lesson.audio[lesson.blocks[0].items[0].sentenceAudio];
    expect(sentence).toBeTruthy();
    const t = open(html);
    await settle();
    t.played.length = 0;
    t.button('Sam').click();
    await settle(80);
    expect(t.played[0]).toBe(lesson.audio[lesson.feedback.correct[0]]);
    expect(t.played[1]).toBe(sentence);
    expect(t.button('Hear the sentence')).toBeTruthy();
    // Not counted as a help the student asked for.
    expect(JSON.parse(Object.values(t.w.localStorage)[0]).items[0].supports).toEqual({});
    // Two misses: the answer, no read-back.
    const u = open(html, { learner: 'Bo' });
    await settle();
    u.button('cat').click(); await settle(30);
    u.button('dog').click();
    u.played.length = 0;
    await settle(80);
    expect(u.played).not.toContain(sentence);
  });

  it('Read the Story reads back line by line after a right answer', async () => {
    const story = 'I see a cat. The cat is big.';
    const row = { word: 'cat', targetWord: 'cat', _ttsAssets: clips('cat', 'Read the story. Which word finishes it?', 'I see a cat.', 'The cat is big.'),
      activityItems: { read_passage: { story, parts: [{ before: 'I see a', after: '.' }, { before: 'The', after: 'is big.' }], options: ['cat', 'dog', 'sun'] } } };
    const { lesson, html } = fileOf([row], ['read_passage']);
    const item = lesson.blocks[0].items[0];
    expect(item.readBackByLine).toBe(true);
    const t = open(html);
    await settle();
    t.played.length = 0;
    t.button('cat').click();
    await settle(120);
    expect(t.played.slice(1, 3)).toEqual(item.readBack.map((id) => lesson.audio[id]));
    expect(JSON.parse(Object.values(t.w.localStorage)[0]).items[0].supports).toEqual({});
  });
});

describe('O11 a picture named twice, O12, O14 key numbers', () => {
  it('Picture the Sentence takes either tile of a word named twice, in either slot, and reads the sentence back', async () => {
    const PROMPT = 'Read the sentence. Match the pictures to it.';
    const row = { word: 'cat', targetWord: 'cat', _ttsAssets: clips('cat', PROMPT, 'A cat sees a cat.'), _decodingAssets: { cat: PNG, dog: PNG.replace('k', 'K') },
      activityItems: { sentence_match: { sentence: 'A cat sees a cat.', sequence: ['cat', 'cat'], extras: ['dog'] } } };
    const { lesson, html } = fileOf([row], ['sentence_match']);
    const tiles = lesson.blocks[0].items[0].tiles.map((x) => x.text);
    expect(tiles.filter((x) => x === 'cat')).toHaveLength(2);
    const t = open(html);
    await settle();
    // The numbers on the pictures are the keys that choose them.
    expect([...t.d.querySelectorAll('#app li.choice [data-key-number]')].map((s) => s.textContent)).toEqual(['1', '2', '3']);
    const cats = tiles.map((x, i) => (x === 'cat' ? i + 1 : 0)).filter(Boolean);
    t.played.length = 0;
    // The second cat tile first, then the first one: both slots take a cat.
    t.key(String(cats[1]));
    t.key(String(cats[0]));
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! The pictures match the sentence.');
    await settle(80);
    expect(t.played).toContain(lesson.audio[lesson.blocks[0].items[0].sentenceAudio]);
  });

  it('Read & Match shows each picture\'s key number', () => {
    const words = ['cat', 'dog', 'sun', 'pig'];
    const rows = words.map((w, i) => ({ word: w, targetWord: w, _ttsAssets: clips(w), ...(i ? {} : { _decodingAssets: Object.fromEntries(words.map((x, k) => [x, PNG + 'A'.repeat(k)])) }),
      activityItems: { decoding: { choices: words.slice(i).concat(words.slice(0, i)) } } }));
    const { lesson, html } = fileOf(rows, ['decoding']);
    expect(lesson.blocks[0].items).toHaveLength(4);
    const t = open(html);
    const numbers = [...t.d.querySelectorAll('#app li.choice')].map((li) => li.querySelector('[data-key-number]').textContent);
    expect(numbers).toEqual(['1', '2', '3', '4']);
    for (const li of t.d.querySelectorAll('#app li.choice [data-key-number]')) expect(li.getAttribute('aria-hidden')).toBe('true');
    t.key('1');
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Yes! You read the word.');
  });
});

describe('O13 sound names with letters on', () => {
  it('Find Sounds and Break it Down name oo_short, dh, zh and schwa; other sounds print as /a/', () => {
    // The bank has no schwa clip: a stand-in, so Break it Down can offer it as a wrong chip.
    const phonemes = { ...BANKS.phonemes, schwa: uri('schwa') };
    const rows = [{ word: 'book', targetWord: 'book', phonemes: ['b', 'oo_short', 'k'], phonemeCount: 3, _ttsAssets: clips('book'),
      activityItems: { isolation: { position: 1, correctSound: 'oo_short', options: ['oo_short', 'b', 'dh', 'zh'] },
        segmentation: { slotCount: 3, chips: [{ id: 'c0', phoneme: 'b', type: 'correct' }, { id: 'c1', phoneme: 'oo_short', type: 'correct' }, { id: 'c2', phoneme: 'k', type: 'correct' }, { id: 'd0', phoneme: 'schwa', type: 'distractor', isDistractor: true }] } } }];
    const { lesson, html } = fileOf(rows, ['isolation', 'segmentation'], { showLetters: true, banks: { ...BANKS, phonemes } });
    expect(lesson.blocks.map((b) => b.activity)).toEqual(['isolation', 'segmentation']);
    const t = open(html);
    const shown = [...t.d.querySelectorAll('#app li.choice button.primary')].map((b) => b.textContent);
    expect(shown.slice().sort()).toEqual(['/b/', 'short oo (book)', 'th (this)', 'zh (vision)'].sort());
    expect(t.text()).not.toMatch(/oo_short|\/dh\/|\/zh\//);
    t.next();
    const chips = [...t.d.querySelectorAll('#app ul.row > li button.primary')].map((b) => b.textContent);
    expect(chips.slice().sort()).toEqual(['/b/', '/k/', 'short oo (book)', 'uh (schwa)'].sort());
  });
});

// L5 (math review): in a check, "Stop?" pauses the clock and hides the question, as the app's "End this session?"
// does (math_fluency_module.js, 232a83d3b3); Keep going moves the deadline on by the time it was open.
describe('L5 a check\'s "Stop?" pauses the clock', () => {
  const PC = {};
  new Function('window', readFileSync('packet_check_builder.js', 'utf8')).call(PC, PC);
  const C = PC.AlloPacketChecks;
  const PROBLEMS = '7+8,12-5,6x4,20/4';
  const answers = ['15', '7', '24', '5'];
  function check(timeLimitS) {
    const { html } = C.buildCheckPacket({ lesson: C.lessonFromMathProblems({ title: 'Facts', problems: C.parseProblems(PROBLEMS), timeLimitS }), loader });
    const time = { t: 1000, wall: Date.UTC(2026, 10, 13, 14, 0, 0) };
    const saved = [];
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/c.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      w.Blob = class { constructor(parts) { this.body = parts.join(''); } };
      w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:x'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
      w.Date.now = () => time.wall;
    } });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    const q = (s) => d.querySelector(s);
    const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
    const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
    const tick = (ms) => { time.t += ms; time.wall += ms; w.document.dispatchEvent(new w.Event('visibilitychange')); };
    const type = (s) => { s.split('').forEach((k) => q('[data-key="' + k + '"]').click()); q('[data-key="next"]').click(); };
    d.getElementById('learner-name').value = 'Fox1';
    button('Next').click();
    for (let i = 0; i < 4 && !q('[data-pad-input]'); i++) { const go = button('Start') || button('Next'); if (go) go.click(); }
    return { w, d, q, seen, button, tick, type, time, saved, state: () => JSON.parse(Object.values(w.localStorage)[0]), heading: () => q('#app h2').textContent,
      left: () => q('[data-time-left]') && q('[data-time-left]').textContent,
      json: () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); } };
  }

  it('stops the clock and hides the question while open; Keep going gives the time back; the score and item times leave it out', () => {
    const t = check(60);
    expect(t.heading()).toBe('Question 1 of 4');
    t.tick(5000);
    expect(t.left()).toBe('Time left: 0:55');
    t.button('Stop the check').click();
    expect(t.seen(t.q('[data-stop-confirm]'))).toBe(true);
    expect(t.seen(t.q('[data-pad-input]'))).toBe(false);
    expect(t.q('[data-stop-paused]').textContent).toBe('The clock is stopped while you decide.');
    // A minute and more with the question open: no time up, the clock does not move, keys do nothing.
    t.tick(70000);
    expect(t.heading()).toBe('Question 1 of 4');
    expect(t.left()).toBe('Time left: 0:55');
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '7', bubbles: true, cancelable: true }));
    expect(t.q('[data-pad-input]').value).toBe('');
    // Escape is Keep going.
    t.q('[data-stop-confirm]').dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(t.seen(t.q('[data-stop-confirm]'))).toBe(false);
    expect(t.seen(t.q('[data-pad-input]'))).toBe(true);
    expect(t.left()).toBe('Time left: 0:55');
    t.tick(5000);
    expect(t.left()).toBe('Time left: 0:50');
    expect(t.state().check.pausedMs).toBe(70000);
    answers.forEach((a) => { t.tick(1000); t.type(a); });
    const file = t.json();
    // 5 + 5 + 4 x 1 seconds on the check; the 70 s of "Stop?" are not in it.
    expect(file.score.elapsedS).toBe(14);
    expect(file.score.completion).toBe('complete');
    expect(file.score.flags).toEqual([]);
    expect(file.items[0].ms).toBe(11000);
  });

  it('Yes, stop while open: ended early, and the open question is not time on the check', () => {
    const t = check(60);
    t.tick(3000);
    t.button('Stop the check').click();
    t.tick(20000);
    t.button('Yes, stop').click();
    const file = t.json();
    expect(file.score.completion).toBe('ended_early');
    expect(file.score.elapsedS).toBe(3);
  });

  it('an untimed check pauses too, and says nothing about a clock', () => {
    const t = check(null);
    t.tick(2000);
    t.button('Stop the check').click();
    expect(t.q('[data-stop-paused]')).toBeNull();
    expect(t.seen(t.q('[data-pad-input]'))).toBe(false);
    t.tick(10000);
    t.button('Keep going').click();
    answers.forEach((a) => { t.tick(1000); t.type(a); });
    expect(t.json().score.elapsedS).toBe(6);
  });
});
