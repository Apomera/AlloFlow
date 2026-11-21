import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// "Make vocabulary practice" (packets-vocab.html and .js, packets-vocab.css), 2026-11-12. Part 1 reads the page as
// text, by the rules tests/packets_site_pages.test.js applies to the other pages. Part 2 runs it in jsdom with the
// real loader and builder, and the stand-in word list tests/fixtures/packets_vocab_bank_fixture.js in place of
// packets_vocab_bank_en.js (built by another job, with the runtime shape in C:\tmp\packets_build_1111\vocab\BANK_LAYOUT.md).
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const PAGE = 'packets-vocab.html';
const SCRIPT = 'packets-vocab.js';
const NAME = 'AlloFlow Packets';
const STORE_KEY = 'alloflow-packets-vocab/1';
const EDITS_KEY = 'alloflow-packets-vocab-edits/1';
const BANK_FILE = 'packets_vocab_bank_en.js';
const FIXTURE = 'tests/fixtures/packets_vocab_bank_fixture.js';
// 2026-11-12, deliberately: img-src also allows data:, for the pictures of the picture questions shown in step 3
// (drawn from data: addresses; tests/packets_vocab_pictures.test.js).
const RULE = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'";
// packets_handoff.js (2026-11-12): a file handed over by Change this file on Open a practice file (tests/packets_open_page.test.js).
// 2026-11-12, deliberately: the picture list, the Word Sounds builder (for its picture credits and its drawing check) and
// the loader of recordings and pictures (packets_vocab_media.js). Without fetch (jsdom) the page makes files without them.
const SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', BANK_FILE,
  'word_sounds_symbols_en.js', 'word_picture_matcher.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-print-cards.js', SCRIPT];
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const ALLOWED_AI_SENTENCES = ['Runs without AI.', 'This page runs without AI.', 'This page runs without AI. No account. Nothing you choose leaves your device.', 'Run AI.',
  // 2026-11-13 (teacher-journey pass): where AI was used ahead of time, said plainly, as the Word Sounds pages name their AI voices.
  // The word list's own note (packets_vocab_bank_en.js, checking) says its checking pass was done with AI assistance, not by a person.
  'Some meanings were checked and corrected ahead of time with AI help, not by a person.',
  'The recordings of words were made ahead of time with an AI voice (Kokoro).',
  'This meaning was checked with AI help when the word list was prepared, not by a person.',
  'Some meanings were checked and corrected with AI help when the word list was prepared, not by a person.',
  // 2026-11-17 (review D13): the badge itself says the checking was AI help, not a person.
  'AI-checked',
  // 2026-11-19 (Wave 2A): unified About-this-page copy matching the AI-checked badge.
  'They show AI-checked.'];
const parse = (file) => new JSDOM(read(file)).window.document;
const V = require('../packet_vocab_builder.js');
const verify = require('../packets_verify_core.js');

// ---------------------------------------------------------------------------
// 1. The page as a file
// ---------------------------------------------------------------------------
describe('the page as a file', () => {
  const doc = parse(PAGE);
  it('carries its rule before anything is loaded, loads only its own scripts and styles, and has no inline code', () => {
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta.getAttribute('content')).toBe(RULE);
    const head = [...doc.head.children];
    expect(head.indexOf(meta)).toBeLessThan(Math.min(...head.filter((n) => n.matches('script, link')).map((n) => head.indexOf(n))));
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(SCRIPTS);
    expect([...doc.querySelectorAll('script')].every((s) => s.defer && !s.textContent.trim())).toBe(true);
    expect([...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'))).toEqual(['packets.css', 'packets-make.css', 'packets-print-cards.css', 'packets-vocab.css']);
    expect(doc.querySelectorAll('style, [style]')).toHaveLength(0);
    for (const node of doc.querySelectorAll('*')) for (const a of node.attributes) expect(/^on/i.test(a.name), node.tagName + ' ' + a.name).toBe(false);
    // Every file it names exists, but the word list, which another job is building (the tests stand it in).
    for (const src of SCRIPTS.concat(['packets.css', 'packets-make.css', 'packets-print-cards.css', 'packets-vocab.css', 'packets-mark.svg'])) if (src !== BANK_FILE) expect(existsSync(src), src).toBe(true);
    expect(read(PAGE) + read(SCRIPT) + read('packets-vocab.css')).not.toMatch(/https?:\/\/|\/\/[a-z0-9-]+\.[a-z]{2,}\//i);
    expect(read(SCRIPT)).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|document\.write|\beval\s*\(|new Function/);
  });

  it('has one h1, headings in order, a name for every control, and the product name once', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1').textContent).toBe('Make vocabulary practice');
    expect(read(PAGE).split(NAME).length - 1).toBe(1);
    const levels = [...doc.querySelectorAll('h1, h2, h3')].map((n) => Number(n.tagName[1]));
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    for (const node of doc.querySelectorAll('input, textarea, select, button')) {
      const named = node.getAttribute('aria-label') || node.textContent.trim() || (node.id && doc.querySelector('label[for="' + node.id + '"]')) || node.closest('label');
      expect(!!named, node.outerHTML.slice(0, 80)).toBe(true);
      for (const id of (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)) expect(doc.getElementById(id), id).toBeTruthy();
    }
    expect(doc.querySelector('main')).toBeTruthy();
    expect(doc.querySelectorAll('header, footer, nav')).toHaveLength(3);
  });

  it('speaks plainly: American spelling, "student" and "check" in its own words, and AI only to say there is none', () => {
    for (const file of [PAGE, SCRIPT, 'packets-vocab.css', 'packet_vocab_builder.js']) expect(BRITISH.exec(read(file)), file).toBeNull();
    const visible = doc.body.textContent + ' ' + doc.title + ' ' + doc.querySelector('meta[name="description"]').getAttribute('content');
    // 2026-11-14 (T1/makers2): #learner-tip quotes the URL hash literal "#learner=CodeName" / "#learner=BlueHeron7"
    // (as packets_verify_page.test.js strips /#learner=\w*/g); visible prose itself still uses "student".
    expect(visible.replace(/#learner=\w*/g, '')).not.toMatch(/\blearners?\b|\btests?\b|\bquiz|\bassessment|\bexam\b|reviewed by|\bsecure\b/i);
    // 2026-11-14 (T1/makers2): strip // comment lines before matching single-quoted string literals so apostrophes in comments do not invert quote parity.
    const scriptWords = [...read(SCRIPT).replace(/^\s*\/\/.*$/gm, '').matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((m) => m[1]).join(' ');
    expect(scriptWords).not.toMatch(/\blearners?\b|\btests?\b|\bquiz|\bassessment|reviewed by/i);
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((s) => /\bAI\b/.test(s));
    const BLOCK = 'title, h1, h2, h3, p, li, summary, legend, label, button, dt, dd, option, span';
    const found = [...doc.querySelectorAll(BLOCK)].filter((n) => !n.querySelector(BLOCK)).flatMap((n) => sentences(n.textContent));
    for (const s of found.concat(sentences(doc.querySelector('meta[name="description"]').getAttribute('content')))) expect(ALLOWED_AI_SENTENCES, s).toContain(s);
    // 2026-11-17 (review D13): the one badge that says AI-checked is allowed in code too.
    for (const line of read(SCRIPT).split('\n')) if (/\bAI\b/.test(line.replace(/'AI-checked'/g, ''))) expect(line.trim().startsWith('//'), line).toBe(true);
    // Honest about the meanings: prepared ahead of time, from open dictionaries, cleaned up by a program; never "reviewed".
    expect(doc.getElementById('sources').textContent).toContain('They were shortened and cleaned up by a program when the word list was prepared, ahead of time.');
  });

  it('is linked from the front door, and the front door names its builder', () => {
    const front = parse('packets.html');
    // 2026-11-18 (owner): the front door opens the maker set to practice or to a check.
    expect([...front.querySelectorAll('a[href^="packets-vocab.html"]')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Make vocabulary practice', 'packets-vocab.html#practice-mode'], ['Make a vocabulary check', 'packets-vocab.html#check-mode']]);
    expect(front.querySelector('.verify').textContent).toContain('packet_vocab_builder.js');
  });
});

// ---------------------------------------------------------------------------
// 2. The page, run
// ---------------------------------------------------------------------------
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
async function open({ storage = null, noBank = false, before = null } = {}) {
  const saved = [];
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:file-' + saved.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
  if (before) before(w);
  if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  for (const src of SCRIPTS) {
    if (src === BANK_FILE) { if (!noBank) w.eval(read(FIXTURE)); continue; }
    w.eval(read(src));
  }
  await wait(5);
  const $ = (id) => d.getElementById(id);
  const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
  const page = {
    w, d, $, saved, fire,
    type: async (text) => { $('f-words').value = text; fire($('f-words'), 'input'); await wait(300); },
    row: (key) => d.querySelector('[data-row="' + key + '"]'),
    buttonIn: (node, text) => [...node.querySelectorAll('button')].find((b) => b.textContent === text),
    built: async () => { await wait(60); return saved.filter((b) => b.type === 'text/html').pop(); },
    edits: () => JSON.parse(w.localStorage.getItem(EDITS_KEY) || 'null'),
  };
  return page;
}
const WORDS = 'habitat\npredator, prey, cell, bat, adapt, camouflage';
const textOf = async (blob) => (typeof blob.text === 'function' ? blob.text() : String(blob));

describe('the maker, run with the stand-in word list', () => {
  it('step 1 looks each word up and says plainly what is not in the word list; it needs 4 words to go on', async () => {
    const p = await open();
    expect(p.$('step-1').hidden).toBe(false);
    expect(p.$('bank-line').textContent).toBe('The word list is ready.');
    await p.type('habitat, cell, photosynthesis');
    const lines = [...p.$('words-list').querySelectorAll('li')].map((li) => [li.querySelector('.w').textContent, li.querySelector('.s').textContent]);
    expect(lines).toEqual([['habitat', 'Found: 1 meaning.'], ['cell', 'Found: 3 meanings. The usual school meaning is used first.'],
      ['photosynthesis', 'Not in the word list. You can type what it means in step 2.']]);
    expect(p.$('words-line').textContent).toBe('2 of 3 words found in the word list.');
    p.$('next-1').click();
    expect(p.$('step-1').hidden).toBe(false);
    expect(p.$('step-1-problem').textContent).toBe('A question has 4 answers to choose from, so the list needs at least 4 words. Add 1 more.');
    expect(JSON.parse(p.w.localStorage.getItem(STORE_KEY)).words).toBe('habitat, cell, photosynthesis');
  });

  it('step 2 shows one short row per word: the meaning used, 3 wrong answers with Swap and Edit, and whether the meaning was checked', async () => {
    const p = await open();
    await p.type(WORDS);
    p.$('next-1').click();
    expect(p.$('step-2').hidden).toBe(false);
    // 2026-11-19 (Wave 2A): Step 2 floats unchecked ("Read these first") and needs-a-look rows to the top while preserving list order within each group.
    expect([...p.$('rows').querySelectorAll('.v-row')].map((r) => r.getAttribute('data-row'))).toEqual(['prey', 'adapt', 'camouflage', 'habitat', 'predator', 'cell', 'bat']);
    expect(p.$('rows-line').textContent).toBe('7 words. 3 not checked yet.');
    expect(p.$('sources').textContent).toContain('They show AI-checked.');
    const cell = p.row('cell');
    expect(cell.querySelector('.v-mark').textContent).toBe('AI-checked'); // 2026-11-17 (review D13)
    expect(p.row('prey').querySelector('.v-mark').textContent).toBe('not checked');
    expect(cell.querySelector('.v-right .v-text').textContent).toBe('Right answer The smallest living part of a plant or an animal');
    expect(cell.querySelectorAll('.v-wrong li')).toHaveLength(3);
    expect(cell.querySelector('.v-meanings').open).toBe(false);
    expect(cell.querySelector('.v-meanings summary').textContent).toBe('Change meaning (3 meanings)');
    // Only one meaning: no menu.
    expect(p.row('habitat').querySelector('.v-meanings')).toBeNull();

    // Change meaning: the row follows, and the choice is kept for next time.
    const jail = cell.querySelector('input[value="cell|n|2"]');
    jail.checked = true; p.fire(jail, 'change');
    expect(p.row('cell').querySelector('.v-right .v-text').textContent).toBe('Right answer A small room in a jail');
    expect(p.edits().words.cell.sense).toBe('cell|n|2');
    expect(p.d.activeElement.value).toBe('cell|n|2');

    // Swap: the next candidate not on screen; the focus stays on the button.
    const before = [...p.row('habitat').querySelectorAll('.v-word')].map((n) => n.textContent);
    p.d.querySelector('[data-swap="habitat|0"]').click();
    const after = [...p.row('habitat').querySelectorAll('.v-word')].map((n) => n.textContent);
    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(before).not.toContain(after[0]);
    expect(p.d.activeElement.getAttribute('data-swap')).toBe('habitat|0');
    expect(p.edits().words.habitat.wrong.map((c) => c.word)).toEqual(after);

    // Edit a wrong answer into another meaning of the word: a plain warning, and the teacher's text is kept.
    p.d.querySelector('[data-edit="bat|wrong|0"]').click();
    const box = p.row('bat').querySelector('.v-edit');
    const [word, def] = box.querySelectorAll('input, textarea');
    expect(p.d.activeElement).toBe(word);
    word.value = 'club'; def.value = 'A stick used to hit a ball';
    p.buttonIn(box, 'Save').click();
    expect(p.row('bat').querySelector('.v-warn').textContent).toBe('This could also be right: it is close to a meaning of "bat".');
    // The jail meaning of cell is not checked yet, so there are 4 now.
    expect(p.$('rows-line').textContent).toBe('7 words. 4 not checked yet. 1 word needs a look.');

    // Edit the right answer, then undo every change to that word.
    p.d.querySelector('[data-edit="prey|def|0"]').click();
    const ta = p.row('prey').querySelector('textarea');
    ta.value = 'An animal that other animals hunt for food';
    p.buttonIn(p.row('prey'), 'Save').click();
    expect(p.row('prey').querySelector('.v-right .v-text').textContent).toBe('Right answer An animal that other animals hunt for food');
    expect(p.edits().senses['prey|n|1'].def).toBe('An animal that other animals hunt for food');
    p.buttonIn(p.row('prey'), 'Undo my changes to prey').click();
    expect(p.row('prey').querySelector('.v-right .v-text').textContent).toBe('Right answer An animal that is hunted and eaten by another animal');

    // Kept for next time: a new visit starts from the changes.
    const again = await open({ storage: { [STORE_KEY]: p.w.localStorage.getItem(STORE_KEY), [EDITS_KEY]: p.w.localStorage.getItem(EDITS_KEY) } });
    again.$('next-1').click();
    expect(again.row('cell').querySelector('.v-right .v-text').textContent).toBe('Right answer A small room in a jail');
    expect([...again.row('habitat').querySelectorAll('.v-word')].map((n) => n.textContent)).toEqual(after);
  });

  it('a word that is not in the word list asks for its meaning; once typed, the file asks about it', async () => {
    const p = await open();
    await p.type(WORDS + ', photosynthesis');
    p.$('next-1').click();
    const own = p.row('photosynthesis');
    expect(own.querySelector('.v-mark').textContent).toBe('not in the word list');
    expect(own.querySelector('.v-out').textContent).toBe('This word is not in the word list. Type what it means, in words a student knows.');
    own.querySelector('textarea').value = 'How a plant makes its food from sunlight';
    p.buttonIn(own, 'Save').click();
    expect(p.row('photosynthesis').querySelectorAll('.v-wrong li')).toHaveLength(3);
    expect(p.edits().words.photosynthesis.def).toBe('How a plant makes its food from sunlight');
    p.$('next-2').click();
    const file = await p.built();
    const html = await textOf(file);
    expect(html).toContain('How a plant makes its food from sunlight');
    expect(JSON.parse(/id="packet-manifest">(.*?)<\/script>/.exec(html)[1]).attributions).toContain('Meanings written by the teacher: photosynthesis.');
  });

  it('step 3 makes the file at once: two kinds of question on, Fill the blank off until chosen, practice or a check, Read aloud folded away', async () => {
    const p = await open();
    await p.type(WORDS);
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    const boxes = [...p.$('types').querySelectorAll('input')];
    expect(boxes.map((b) => [b.value, b.checked])).toEqual([['meaning', true], ['word', true], ['blank', false]]);
    expect(p.$('blank-panel').hidden).toBe(true);
    expect(p.$('more').open).toBe(false);
    expect(p.$('f-read').checked).toBe(true);
    expect(p.$('summary').hidden).toBe(false);
    expect(p.$('summary-facts').textContent).toMatch(/^14 questions\. Practice\. \d+ KB\.$/);
    const practice = await textOf(await p.built());
    expect(verify.verifyPacket(practice).result).toBe('closed');

    // Fill the blank: its own check, with Swap among the list's words.
    boxes[2].checked = true; p.fire(boxes[2], 'change');
    expect(p.$('blank-panel').hidden).toBe(false);
    const bat = p.d.querySelector('[data-blank-row="bat"]');
    expect(bat.querySelector('.v-text').textContent).toBe('A ___ sleeps in the cave all day.');
    const words = () => [...p.d.querySelector('[data-blank-row="bat"]').querySelectorAll('.v-word')].map((n) => n.textContent);
    const first = words();
    p.d.querySelector('[data-blank-swap="bat|0"]').click();
    expect(words()[0]).not.toBe(first[0]);
    expect(words().every((w) => p.$('f-words').value.includes(w))).toBe(true);
    await wait(300);
    // 2026-11-13: 20, not 21: the wrong words of Fill the blank are of the same kind, and adapt (a verb) has no 3 other verbs.
    expect(p.$('summary-facts').textContent).toMatch(/^20 questions\./);
    // 2026-11-16: the list of what is in the file sits under the choices, so questions left out are also said beside Save.
    const leftRow = [...p.$('summary-rows').querySelectorAll('dt')].find((dt) => dt.textContent === 'Left out').nextElementSibling.textContent;
    expect(leftRow).not.toBe('Nothing.');
    expect(p.$('left-note').hidden).toBe(false);
    expect(p.$('left-note').textContent).toMatch(/^\d+ questions? (was|were) left out\. See which, and why$/);
    expect(p.$('left-note').querySelector('a').getAttribute('href')).toBe('#summary-list');
    expect(p.$('left-note').closest('#summary')).toBeTruthy();
    // 2026-11-16: a word that cannot be asked this way sits in a fold under the others, closed, with its reason and its Edit.
    const fold = p.$('blank-left');
    const leftOut = [...fold.querySelectorAll('[data-blank-row]')], asked = [...p.d.querySelectorAll('#blank-rows > [data-blank-row]')];
    expect(fold.tagName).toBe('DETAILS');
    expect(fold.open).toBe(false);
    expect(fold.parentNode.lastElementChild).toBe(fold);
    expect(leftOut.map((row) => row.getAttribute('data-blank-row'))).toContain('adapt');
    expect(asked.map((row) => row.getAttribute('data-blank-row'))).toContain('bat');
    expect(leftOut.length + asked.length).toBe(7);
    expect(fold.querySelector('summary').textContent).toBe(leftOut.length === 1 ? '1 word is left out of Fill the blank. See why.' : leftOut.length + ' words are left out of Fill the blank. See why.');
    for (const row of leftOut) { expect(row.querySelector('.v-out').textContent).toMatch(/^Left out: /); expect(row.querySelector('.v-tools button')).toBeTruthy(); }
    for (const row of asked) { expect(row.textContent).not.toContain('Left out: '); expect(row.querySelectorAll('.v-word').length).toBe(3); }

    // A check, with a teacher code that is never kept.
    const check = p.d.querySelector('input[name="mode"][value="check"]');
    check.checked = true; p.fire(check, 'change');
    expect(p.$('code-panel').hidden).toBe(false);
    p.$('f-code').value = 'ab'; p.fire(p.$('f-code'), 'input');
    await wait(450);
    expect(p.$('code-line').textContent).toBe('The teacher code needs 4 or more characters. Leave it empty for no code.');
    p.$('f-code').value = 'owl42'; p.fire(p.$('f-code'), 'input');
    await wait(450);
    const made = await textOf(await p.built());
    const m = JSON.parse(/id="packet-manifest">(.*?)<\/script>/.exec(made)[1]);
    expect([m.packet.mode, m.check.measure, /^set/.test(m.check.teacherCode)]).toEqual(['check', 'vocab_items', true]);
    expect(Object.values(Object.fromEntries(Object.entries(p.w.localStorage)))).not.toContain('owl42');
    expect(JSON.stringify({ ...p.w.localStorage })).not.toContain('owl42');
    // 2026-11-13: a check says it opens with a sample question.
    expect([...p.$('summary-rows').querySelectorAll('dt')].map((n) => n.textContent)).toEqual(['Questions', 'Left out', 'How', 'Practice first', 'Read aloud', 'Title', 'File']);
  });

  it('makes one file for each student in one .zip, and opens a file it made', async () => {
    const p = await open();
    await p.type(WORDS);
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    const single = await textOf(await p.built());
    // 1 line puts that code name directly into the single file above; 2-40 lines saves a .zip in 1 click.
    p.$('f-batch-names').value = 'BlueHeron7';
    p.fire(p.$('f-batch-names'), 'input');
    expect(p.$('batch-make').hidden).toBe(true);
    expect(p.$('batch-said').textContent).toContain('Using BlueHeron7 in the file above');
    expect(p.$('summary-rows').textContent).toContain('BlueHeron7');
    p.$('f-batch-names').value = 'BlueHeron7\nRedFox2\nbluheron7\nBlueHeron7';
    p.fire(p.$('f-batch-names'), 'input');
    expect(p.$('batch-make').hidden).toBe(false);
    expect(p.$('batch-make').textContent).toBe('Save .zip for 3 students');
    p.$('batch-make').click();
    expect(p.$('batch-said').textContent).toMatch(/^Saved .*__3-students\.zip \(\d+ KB\)\./);
    expect(p.saved[p.saved.length - 1].name).toMatch(/__3-students\.zip$/);
    // Open a file I made: the words, the kinds, the title and the teacher's choices come back.
    const fresh = await open();
    expect(fresh.$('reopen').hidden).toBe(false);
    const input = fresh.$('reopen-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [new fresh.w.File([single], 'mine.html', { type: 'text/html' })] });
    fresh.fire(input, 'change');
    await wait(50);
    expect(fresh.$('reopen-line').textContent).toBe('Opened Vocabulary practice: habitat, predator, prey and 4 more.');
    expect(fresh.$('f-words').value).toBe('habitat\npredator\nprey\ncell\nbat\nadapt\ncamouflage');
    // A file that is not one of these: said plainly.
    Object.defineProperty(input, 'files', { configurable: true, value: [new fresh.w.File(['<!doctype html><p>hi</p>'], 'other.html')] });
    fresh.fire(input, 'change');
    await wait(50);
    expect(fresh.$('reopen-line').textContent).toBe('This is not a file made with this page. Choose the .html file you saved in step 3.');
  });

  it('keeps its last choices and its changes until told to forget them, and says what it keeps', async () => {
    const p = await open();
    await p.type(WORDS);
    p.$('next-1').click();
    p.d.querySelector('[data-swap="habitat|1"]').click();
    expect(p.edits().words.habitat).toBeTruthy();
    p.$('forget-edits').click();
    expect(p.w.localStorage.getItem(EDITS_KEY)).toBeNull();
    expect(p.$('forget-said').textContent).toBe('Done. Your changes to the questions are gone. The questions are the ones the word list gives.');
    p.$('forget').click();
    expect(p.w.localStorage.getItem(STORE_KEY)).toBeNull();
    expect(p.$('f-words').value).toBe('');
    expect(Object.keys({ ...p.w.localStorage }).every((k) => k === STORE_KEY || k === EDITS_KEY)).toBe(true);
    // 2026-11-14 (T1/makers2): about-page states that both the teacher code and a student's code name are never kept.
    expect(p.$('about-page').textContent).toContain("The teacher code and a student's code name are never kept.");
  });

  // 2026-11-14 (T1 + @i18n P3): check mode description, screen-reader note on picture question types, and >= 10 MB size warning.
  it('states check mode plainly, warns that picture questions cannot be answered with a screen reader, and warns on >= 10 MB files', async () => {
    const doc = parse(PAGE);
    const checkChoice = doc.querySelector('#modes input[value="check"]').closest('label').querySelector('.choice-line').textContent.replace(/\s+/g, ' ').trim();
    expect(checkChoice).toBe('One try for each question. The student is not shown right or wrong. At the end the student sees the score.');
    expect(doc.querySelector('#picture-panel .hint').textContent).toContain('Picture questions cannot be answered with a screen reader.');

    const p = await open({ before: (w) => { w.fetch = async () => ({ ok: false, status: 404, text: async () => '' }); } });
    await p.type(WORDS);
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    for (const val of ['picture', 'picword']) {
      const line = p.d.querySelector('#types input[value="' + val + '"]').closest('label').querySelector('.choice-line').textContent;
      expect(line, val).toContain('Cannot be answered with a screen reader.');
    }
    expect(p.$('size-warn').hidden).toBe(true);
    expect(p.$('size-warn').textContent).toBe('');

    const realBuild = p.w.AlloPacketVocab.buildVocabPacket;
    p.w.AlloPacketVocab.buildVocabPacket = (opts) => {
      const out = realBuild(opts);
      return { ...out, html: out.html + '<!--' + 'x'.repeat(10_100_000) + '-->' };
    };
    try {
      const check = p.d.querySelector('input[name="mode"][value="check"]');
      check.checked = true; p.fire(check, 'change');
      await wait(80);
      expect(p.$('size-warn').hidden).toBe(false);
      expect(p.$('size-warn').textContent).toContain('This file is over 10 MB');
    } finally {
      p.w.AlloPacketVocab.buildVocabPacket = realBuild;
    }
  });

  it('without the word list, says so and still works with meanings the teacher types', async () => {
    const p = await open({ noBank: true });
    expect(p.$('bank-line').textContent).toBe('The word list could not be loaded. You can still type the meaning of each word yourself in step 2.');
    await p.type('sun, moon, star, comet');
    p.$('next-1').click();
    expect(p.$('step-2').hidden).toBe(false);
    for (const [key, def] of [['sun', 'The star at the center of our solar system'], ['moon', 'A big rock that goes around a planet'], ['star', 'A ball of hot gas that shines in the night sky'], ['comet', 'A ball of ice and dust with a long tail']]) {
      const row = p.row(key);
      row.querySelector('textarea').value = def;
      p.buttonIn(row, 'Save').click();
    }
    p.$('next-2').click();
    const html = await textOf(await p.built());
    const m = JSON.parse(/id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
    expect(m.attributions).toEqual(['Meanings written by the teacher: sun, moon, star, comet.']);
    expect(V.readBack(verify.readParts(html)).words).toEqual(['sun', 'moon', 'star', 'comet']);
  });

  it('Wave 3A: unified Step 3 fold, Show toggle on teacher code, #rehearse= Step 2 banner, zero-storage .txt roster, and 60 MB reopen cap', async () => {
    const doc = parse(PAGE);
    expect(doc.getElementById('learner-tip')).toBeNull();
    expect(doc.getElementById('code-name-box')).toBeNull();
    expect(doc.getElementById('batch-save')).toBeNull();
    expect(doc.getElementById('batch').querySelector('summary').textContent).toBe('Put student code names in the file');
    expect(doc.getElementById('open-present-export').textContent).toContain('Present & print word cards');
    expect(read(SCRIPT)).toContain('60 * 1024 * 1024');

    // #rehearse= with 4+ words clears hash, jumps to Step 2 and shows 1-line confirmation banner.
    const r = await open({ before: (w) => { w.location.hash = '#rehearse=habitat,predator,prey,cell'; } });
    await wait(25);
    expect(r.w.location.hash).toBe('');
    expect(r.$('step-2').hidden).toBe(false);
    expect(r.$('rehearse-note').hidden).toBe(false);
    expect(r.$('rehearse-note').textContent).toContain('Loaded 4 missed words');

    // Teacher code Show toggle switches password <-> text.
    r.$('next-2').click();
    await wait(50);
    const checkRadio = r.d.querySelector('input[name="mode"][value="check"]');
    checkRadio.checked = true; r.fire(checkRadio, 'change');
    expect(r.$('f-code').type).toBe('password');
    r.$('code-show').click();
    expect(r.$('f-code').type).toBe('text');
    expect(r.$('code-show').textContent).toBe('Hide');
    r.$('code-show').click();
    expect(r.$('f-code').type).toBe('password');

    // Zero-storage .txt roster loader fills #f-batch-names without writing to localStorage.
    const rosterFile = new r.w.File(['BlueHeron7\nRedFox3\n'], 'roster.txt', { type: 'text/plain' });
    Object.defineProperty(r.$('batch-file'), 'files', { configurable: true, value: [rosterFile] });
    r.fire(r.$('batch-file'), 'change');
    await wait(30);
    expect(r.$('f-batch-names').value).toContain('BlueHeron7');
    expect(r.$('batch-make').textContent).toBe('Save .zip for 2 students');
    expect(JSON.stringify({ ...r.w.localStorage })).not.toContain('BlueHeron7');
  });

  it('Wave 3B: registers readVocab in packets_reopen.js and hands off wrong-maker/results files in 1 click', async () => {
    const reopenKit = require('../packets_reopen.js');
    const vocabBank = require('./fixtures/packets_vocab_bank_fixture.js');
    await vocabBank.load();
    const g = { crypto: globalThis.crypto }; g.window = g;
    new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
    const th = g.AlloWordSoundsTakeHome;
    const rows = V.draftRows({ words: ['habitat', 'predator', 'prey', 'cell'], bank: vocabBank });
    const html = V.buildVocabPacket({ lesson: V.lessonFromVocab({ loader: th, rows, types: ['meaning'], mode: 'practice' }), loader: th, rows, bank: vocabBank }).html;
    const ok = reopenKit.readVocab(html, { verify, builder: V, codeName: V.codeName });
    expect(ok.ok).toBe(true);
    expect(ok.kind).toBe('vocab');
    expect(ok.vocab.words).toEqual(['habitat', 'predator', 'prey', 'cell']);
    const standalone = reopenKit.readVocab(html, { verify });
    expect(standalone.ok).toBe(true);
    expect(standalone.vocab.words.slice().sort()).toEqual(['cell', 'habitat', 'predator', 'prey']);

    const p = await open();
    const handed = [];
    p.w.AlloPacketHandoff = { HASH: '#open-file', RESULTS_HASH: '#import-results', redirect: async (file, href, hash) => { handed.push({ name: file.name, href, hash }); } };
    const csv = '\uFEFF"format","session_id"\r\n"alloflow-packet-result/1","S-1"\r\n';
    Object.defineProperty(p.$('reopen-file'), 'files', { configurable: true, value: [new p.w.File([csv], 'vocab-res.csv', { type: 'text/csv' })] });
    p.fire(p.$('reopen-file'), 'change');
    await wait(30);
    expect(p.$('reopen-page').hidden).toBe(false);
    expect(p.$('reopen-page').getAttribute('href')).toBe('packets-results.html');
    p.$('reopen-page').dispatchEvent(new p.w.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(handed).toEqual([{ name: 'vocab-res.csv', href: 'packets-results.html', hash: '#import-results' }]);
  });

  it('Wave 4A: preserves Preview removals across Back-to-Step-2 with Restore, and hides stale Lookup panel on Use', async () => {
    let previewOpts = null;
    const p = await open();
    p.w.AlloPacketHandoff = {
      hostPreview: (opts) => { previewOpts = opts; return { update: () => {}, stop: () => {} }; },
    };
    await p.type('habitat, predator, prey, cell, adapt');
    p.$('next-1').click();
    await wait(30);
    p.$('next-2').click();
    await wait(60);
    expect(previewOpts && typeof previewOpts.onAction === 'function').toBe(true);
    const items = previewOpts.describe(JSON.parse(/var lesson=(.*);\nvar labels=/.exec(previewOpts.html)[1]));
    const beforeCount = items.length;
    await previewOpts.onAction({ action: 'remove', item: items[0] });
    expect(p.$('preview-note').hidden).toBe(false);
    expect(p.$('preview-note').textContent).toContain('1 question removed in Preview');
    expect(p.$('preview-restore')).toBeTruthy();

    // Stepping Back to Step 2 and returning to Step 3 preserves the removal!
    p.$('back-3').click();
    await wait(20);
    p.$('next-2').click();
    await wait(60);
    expect(p.$('preview-note').hidden).toBe(false);
    expect(p.$('summary-facts').textContent).toContain(String(beforeCount - 1) + ' questions');

    // Clicking Restore brings back the full count and hides #preview-note.
    p.$('preview-restore').click();
    await wait(60);
    expect(p.$('preview-note').hidden).toBe(true);
    expect(p.$('summary-facts').textContent).toContain(String(beforeCount) + ' questions');

    // Vocab Lookup: clicking Use this meaning hides #found immediately and confirms on visible #look-line.
    const lookupDom = new JSDOM(read('packets-vocab-lookup.html'), {
      url: 'https://packets.test/packets-vocab-lookup.html#word=biome&more=tundra',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const lw = lookupDom.window;
    lw.fetch = async () => ({ ok: true, status: 200, json: async () => ([{ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A large natural area' }] }] }]) });
    lw.eval(read('packets-vocab-lookup.js'));
    lw.document.getElementById('online-on').checked = true;
    lw.document.getElementById('look').click();
    await wait(30);
    expect(lw.document.getElementById('found').hidden).toBe(false);
    lw.document.getElementById('use').click();
    expect(lw.document.getElementById('found').hidden).toBe(true);
    expect(lw.document.getElementById('word').value).toBe('tundra');
    expect(lw.document.getElementById('look-line').textContent).toContain('Saved for biome');
    lookupDom.window.close();
  });
});
