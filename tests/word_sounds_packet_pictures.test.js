// @vitest-environment jsdom
// Pictures in Word Sounds packets (2026-11-11): Mulberry Symbols vendored in data/vendor/mulberry, the word
// to symbol map (dev-tools/build_word_sounds_symbols.cjs), the builder's `pictures` option, the player rule
// for WHEN a picture shows (the app's own), and the "Include pictures" box in the app's take-home dialog.
// The maker page's box is tested in tests/packets_site_pages.test.js.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
const parts = tool.loadParts();
const { dictionary, core, loader, wordlist, builder } = parts;
const read = (file) => readFileSync(file, 'utf8');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const SOURCE = JSON.parse(read('data/vendor/mulberry/source.json'));
const MAP = JSON.parse(read('data/word_sounds_symbols_map_en.json'));
const VENDORED = readdirSync('data/vendor/mulberry/symbols').sort();
const allSymbols = symbolsTool.loadSymbols();
// The builder tests in this file pin what a file with Mulberry pictures is (2026-11-11), so they are handed the
// Mulberry part of the index. OpenMoji, the second set (2026-11-12), and files with both sets are tested in
// tests/word_sounds_packet_pictures_openmoji.test.js.
const mulberryWord = (word) => allSymbols.has(word) && allSymbols.set(word) === 'mulberry';
const symbols = Object.freeze({ ...allSymbols, has: mulberryWord, get: (word) => (mulberryWord(word) ? allSymbols.get(word) : null),
  file: (word) => (mulberryWord(word) ? allSymbols.file(word) : null), words: () => allSymbols.words().filter(mulberryWord) });
const omPath = (file) => 'data/vendor/openmoji/symbols/' + file.slice(symbolsTool.OM_PREFIX.length);
const vendoredPath = (file) => (file.indexOf(symbolsTool.OM_PREFIX) === 0 ? omPath(file) : 'data/vendor/mulberry/symbols/' + file);
const made = symbolsTool.compute({ parts });
const entry = (word) => MAP.words.find((e) => e.word === word);

// Stand-in sounds: every key has a clip, a few bytes that depend only on its name. The file a builder
// makes from them depends on the code and the sound dictionary, not on the sound banks.
const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const bank = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: bank('words'), phonemes: bank('phonemes'), isolation: bank('isolation'), instructions: bank('instructions') };
const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log', 'hen', 'net', 'lip', 'bug', 'rug'];
const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const build = (over = {}) => builder.buildPacket({ words: CVC, activities: builder.SUPPORTED_ACTIVITIES, title: 'Ten words', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: KNOWN,
  createdAt: '2026-11-11T00:00:00.000Z', ...over });
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const labelsOf = (html) => JSON.parse(/\nvar labels=(.*);\nvar matches=/.exec(html)[1]);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const svgOfUri = (uri) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64').toString('utf8');
// The same list tests/word_sounds_packet_builder.test.js and tests/word_sounds_take_home_packet.test.js apply to a file with no mailbox.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);

// Opens a built file with its script running.
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
function open(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const start = () => { d.getElementById('learner-name').value = 'Ana'; button('Start').click(); };
  const next = () => (button('Next') || button('See my results')).click();
  const picture = () => d.querySelector('#app [data-word-picture]');
  return { w, d, button, start, next, picture };
}

describe('the vendored symbols', () => {
  it('say where they came from, under which license, and are the bytes that were recorded', () => {
    expect(SOURCE).toMatchObject({ id: 'mulberry', name: 'Mulberry Symbols', author: 'Steve Lee', version: '3.6.1', homepage: 'https://mulberrysymbols.org',
      repository: 'https://github.com/mulberrysymbols/mulberry-symbols', licenseShort: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', retrieved: '2026-11-11' });
    expect(SOURCE.url).toBe('https://github.com/mulberrysymbols/mulberry-symbols/releases/download/v3.6.1/mulberry-symbols.zip');
    expect(SOURCE.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(SOURCE.license).toBe('Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)');
    for (const field of ['licenseEvidence', 'changes', 'remake', 'scope', 'shareAlike', 'limitations']) expect(SOURCE[field].length, field).toBeGreaterThan(80);
    expect(SOURCE.licenseEvidence).toContain('This work is licensed under the Creative Commons Attribution-Share Alike License.');
    // The license texts and the symbol table, by hash.
    const notice = readFileSync('data/vendor/mulberry/LICENSE.txt');
    expect(sha256(notice)).toBe(SOURCE.licenseFiles['LICENSE.txt'].sha256);
    expect(sha256(Buffer.from(notice.toString('utf8').replace(/\n/g, '\r\n')))).toBe(SOURCE.licenseFiles['LICENSE.txt'].originalSha256);
    expect(notice.toString('utf8')).toContain('Copyright 2018-2026 Steve Lee');
    expect(notice.toString('utf8')).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
    const full = readFileSync('data/vendor/mulberry/CC-BY-SA-4.0.txt');
    expect(sha256(full)).toBe(SOURCE.licenseFiles['CC-BY-SA-4.0.txt'].sha256);
    expect(full.toString('utf8')).toMatch(/^Attribution-ShareAlike 4\.0 International/);
    expect(sha256(readFileSync('data/vendor/mulberry/symbol-info.csv'))).toBe(SOURCE.symbolInfo.sha256);
    expect(MAP.source.symbolInfoSha256).toBe(SOURCE.symbolInfo.sha256);
    // The symbol files: one digest over every file, re-made here from the files.
    const digest = symbolsTool.symbolsDigest('data/vendor/mulberry/symbols');
    expect(digest).toEqual({ count: SOURCE.symbols.count, bytes: SOURCE.symbols.bytes, sha256: SOURCE.symbols.sha256 });
    expect(VENDORED.length).toBe(SOURCE.symbols.count);
    const lines = VENDORED.map((name) => sha256(readFileSync('data/vendor/mulberry/symbols/' + name)) + '  ' + name);
    expect(sha256(lines.join('\n') + '\n')).toBe(SOURCE.symbols.sha256);
    // Only what a word could use is kept: every vendored file is named by the map, and the map names no other.
    const named = new Set(MAP.words.flatMap((e) => [e.file, ...(e.candidates || [])]).filter((file) => file && file.indexOf(symbolsTool.OM_PREFIX) !== 0));
    expect(VENDORED.filter((name) => !named.has(name))).toEqual([]);
    expect([...named].filter((name) => !VENDORED.includes(name))).toEqual([]);
  });

  it('the map and the page data are what the script makes now, and the check can fail', () => {
    expect(symbolsTool.staleList(made)).toEqual([]);
    expect(read('data/word_sounds_symbols_map_en.json')).toBe(made.mapText);
    expect(symbolsTool.staleList({ ...made, mapText: made.mapText + ' ' })).toEqual([resolve('data/word_sounds_symbols_map_en.json').slice(resolve('.').length + 1)]);
    expect(symbolsTool.staleList({ ...made, indexText: made.indexText + ' ' })).toEqual(['word_sounds_symbols_en.js']);
    expect(symbolsTool.staleList({ ...made, shards: made.shards.map((s, i) => (i ? s : { ...s, text: s.text + ' ' })) })).toEqual([made.shards[0].url]);
    expect(symbolsTool.staleList({ ...made, inPlay: made.inPlay.slice(1) })[0]).toMatch(/^1 vendored symbol files match no word/);
    expect(symbolsTool.staleList({ ...made, source: { ...made.source, symbols: { ...made.source.symbols, sha256: 'x' } } })).toEqual(['data/vendor/mulberry/source.json (the symbols digest)']);
  });

  it('match narrowly: one kind of symbol named exactly the word, or its plain plural; everything else waits for a person', () => {
    expect(MAP.words.length).toBe(MAP.counts.matched);
    expect(MAP.words.map((e) => e.word)).toEqual(MAP.words.map((e) => e.word).slice().sort());
    const rows = new Map(symbolsTool.symbolRows(read('data/vendor/mulberry/symbol-info.csv')).map((row) => [row.file, row]));
    const usable = new Set(symbolsTool.usableWords(wordlist, builder).map((row) => row.word));
    expect(usable.size).toBe(MAP.counts.usableWords);
    const tally = { auto: 0, ambiguous: 0, rejected: 0, reviewed: 0 };
    for (const e of MAP.words) {
      expect(symbolsTool.STATUSES, e.word).toContain(e.status);
      tally[e.status]++;
      expect(usable.has(e.word), e.word).toBe(true);
      expect(wordlist.get(e.word), e.word).toMatchObject({ blocked: false, nearBlocked: false });
      // Only a used word has a file; a word that waits has its candidates.
      expect(!!e.file, e.word).toBe(e.status === 'auto' || e.status === 'reviewed');
      if (!e.file) expect((e.candidates || []).length, e.word).toBeGreaterThan(0);
      for (const file of [e.file, ...(e.candidates || [])].filter(Boolean)) {
        // An OpenMoji picture (the second set) is tested in tests/word_sounds_packet_pictures_openmoji.test.js.
        if (file.indexOf(symbolsTool.OM_PREFIX) === 0) { expect(existsSync(omPath(file)), file).toBe(true); continue; }
        const symbol = rows.get(file);
        expect(symbol, file).toBeTruthy();
        expect(existsSync('data/vendor/mulberry/symbols/' + file), file).toBe(true);
        // Never a rated symbol, a flag, a map or a letter, and never a name of several words but by a rule that says so
        // (joined: arm_chair is armchair; feeling faces, actions with an object and other names only ever wait for a person).
        expect(symbol.rated, file).toBe(false);
        expect(symbolsTool.SKIP_CATEGORIES, file).not.toContain(symbol.category);
        if (!symbol.single) expect(['joined', 'feeling faces', 'action with an object', 'other name'], e.word + ' ' + file).toContain(e.kind);
        if (!symbol.single && e.kind !== 'joined') expect(e.status, e.word + ' ' + file).not.toMatch(/^(?:auto|reviewed)$/);
        // A "kind of" symbol (hat_-_ladies) is only ever a candidate for a person.
        if (symbol.qualifier) expect(e.status, e.word + ' ' + file).toBe('ambiguous');
      }
      // The new kinds (verb forms, joined names, spellings, OpenMoji) are tested in tests/word_sounds_packet_pictures_openmoji.test.js.
      if (e.status !== 'auto' || e.kind) continue;
      const symbol = rows.get(e.file);
      const single = (/^plural of (\w+)/.exec(e.note) || [])[1];
      // The symbol is named the word itself, or the word's singular.
      expect(symbol.label, e.word).toBe(single || e.word);
      if (single) {
        expect(symbolsTool.singularsOf(e.word), e.word).toContain(single);
        expect(symbol.verb, e.word).toBe(false);
        expect(wordlist.get(single), single).toBeTruthy();
      }
    }
    expect(tally).toEqual({ auto: MAP.counts.auto, ambiguous: MAP.counts.ambiguous, rejected: MAP.counts.rejected, reviewed: MAP.counts.reviewed });
    expect(MAP.counts.auto).toBeGreaterThan(800);
    // What the owner asked about, word by word.
    expect(entry('cat')).toMatchObject({ file: 'cat.svg', status: 'auto' });
    expect(entry('cats')).toMatchObject({ file: 'cat.svg', status: 'auto' });
    expect(entry('cats').note).toMatch(/^plural of cat: the picture shows one/);
    expect(entry('bat')).toMatchObject({ file: 'bat.svg', status: 'auto' });
    expect(entry('run')).toMatchObject({ file: 'run_,_to.svg', status: 'auto' });
    // Symbols of different kinds share the name: nothing is chosen.
    for (const word of ['watch', 'watches', 'cricket', 'tie', 'cut']) expect(entry(word), word).toMatchObject({ file: '', status: 'ambiguous' });
    // Since 2026-11-12 OpenMoji's emoji of the same name is one more choice for a person, never used on its own.
    expect(entry('watch').candidates).toEqual(['watch.svg', 'watch_,_to.svg', 'openmoji/231A.svg']);
    // No symbol is named just "hat": the kinds of hat wait for a person. "can" has only a can opener, never offered;
    // the set's "tin" is offered to a person as another name for it.
    expect(entry('hat')).toMatchObject({ file: '', status: 'ambiguous', candidates: ['hat_-_ladies.svg', 'hat_-_mans.svg'] });
    expect(entry('can')).toMatchObject({ file: '', status: 'ambiguous', kind: 'other name', candidates: ['tin.svg'] });
    // Mulberry has no pig: the picture is OpenMoji's.
    expect(entry('pig')).toMatchObject({ set: 'openmoji', file: 'openmoji/1F416.svg', status: 'auto', kind: 'openmoji' });
    // The script author's doubts are held, with the reason; a plural follows its singular.
    // (Since 2026-11-12 the note may go on: "; more choices: ..." names what OpenMoji or another Mulberry name offers.)
    for (const word of Object.keys(symbolsTool.HELD)) if (entry(word)) {
      expect(entry(word), word).toMatchObject({ file: '', status: 'ambiguous' });
      expect(entry(word).note.startsWith('held by the script author: ' + symbolsTool.HELD[word]), word).toBe(true);
    }
    expect(entry('box').note).toContain('boxing');
    expect(entry('letters')).toMatchObject({ file: '', status: 'ambiguous' });
    for (const word of Object.keys(symbolsTool.REJECTED)) if (entry(word)) expect(entry(word), word).toMatchObject({ file: '', status: 'rejected' });
    expect(entry('smoke')).toMatchObject({ status: 'rejected' });
    // A chosen everyday meaning says who chose it.
    for (const word of Object.keys(symbolsTool.CHILD_SENSE)) if (entry(word)) {
      expect(entry(word), word).toMatchObject({ file: symbolsTool.CHILD_SENSE[word], status: 'auto' });
      expect(entry(word).note, word).toContain('chosen by the script author, not yet by a reviewer');
    }
    // No plural of a name that is not "more than one of the picture".
    for (const word of ['woods', 'waters', 'papers', 'arts', 'blues', 'earths', 'moons']) expect(entry(word), word).toBeUndefined();
  });

  it('a person\'s review wins, and a wrong review file is refused', () => {
    const rows = symbolsTool.symbolRows('symbol-id,category-id,grammar,rated,tags,symbol-en,category-en,symbol-fr,category-fr\n'
      + '1,1,Noun,0,,watch,Clothes Jewellery,,\n2,1,Verb,0,,"watch_,_to",Verb,,\n3,1,Noun,0,,cat,Animal Mammal,,\n4,1,Noun,1,,body,Healthcare Body parts,,\n5,1,Noun,0,,flag_Chad,Country Flags,,\n'
      + '6,1,Noun,0,,Chad,Country Flags,,\n7,1,Noun,0,,hat_-_ladies,Clothes General,,\n8,1,Noun,0,,can_opener,Food Kitchen items,,\n9,1,Noun,0,,cat_2,Animal Mammal,,\n');
    expect(rows.map((row) => [row.file, row.label, row.verb, row.variant, row.qualifier, row.single])).toEqual([
      ['watch.svg', 'watch', false, '', '', true], ['watch_,_to.svg', 'watch', true, '', '', true], ['cat.svg', 'cat', false, '', '', true], ['body.svg', 'body', false, '', '', true],
      ['flag_Chad.svg', 'flag_chad', false, '', '', false], ['Chad.svg', 'chad', false, '', '', true], ['hat_-_ladies.svg', 'hat', false, '', 'ladies', true],
      ['can_opener.svg', 'can_opener', false, '', '', false], ['cat_2.svg', 'cat', false, '2', '', true]]);
    const words = ['watch', 'watches', 'cat', 'cats', 'body', 'chad', 'hat', 'can', 'dog'].map((word) => ({ word }));
    const match = (review, refused) => Object.fromEntries(symbolsTool.matchWords({ rows, words, isWord: () => true, review, refused }).map((e) => [e.word, e]));
    const plain = match(null);
    expect(Object.keys(plain)).toEqual(['cat', 'cats', 'hat', 'watch', 'watches']);
    expect(plain.cat).toEqual({ word: 'cat', file: 'cat.svg', status: 'auto', note: 'Animal Mammal; 2 drawings of it, the first is used' });
    expect(plain.cats).toMatchObject({ file: 'cat.svg', status: 'auto' });
    expect(plain.watch).toMatchObject({ file: '', status: 'ambiguous', candidates: ['watch.svg', 'watch_,_to.svg'] });
    expect(plain.watches).toMatchObject({ file: '', status: 'ambiguous' });
    expect(plain.hat).toMatchObject({ file: '', status: 'ambiguous', candidates: ['hat_-_ladies.svg'] });
    const reviewed = match({ watch: { status: 'reviewed', file: 'watch.svg', note: 'the wristwatch' }, cat: { status: 'rejected' } });
    expect(reviewed.watch).toMatchObject({ file: 'watch.svg', status: 'reviewed', note: 'the wristwatch' });
    // The decision on a word holds for its plural.
    expect(reviewed.watches).toMatchObject({ file: 'watch.svg', status: 'reviewed' });
    expect(reviewed.cat).toMatchObject({ file: '', status: 'rejected', candidates: ['cat.svg'] });
    expect(reviewed.cats).toMatchObject({ file: '', status: 'rejected' });
    expect(() => match({ watch: { status: 'reviewed', file: 'cat.svg' } })).toThrow('which is not one of its symbols');
    expect(() => match({ watch: { status: 'maybe' } })).toThrow('use reviewed or rejected');
    expect(() => match({ dog: { status: 'rejected' } })).toThrow('is not a matched word');
    // A file the safety test refuses is never used, and cannot be reviewed in.
    expect(match(null, { 'cat.svg': 'a script' }).cat).toMatchObject({ file: '', status: 'rejected', note: 'the symbol file is not used: a script' });
    expect(() => match({ watch: { status: 'reviewed', file: 'watch.svg' } }, { 'watch.svg': 'a script' })).toThrow('which the safety test refuses');
    // The file a person edits: every decision in it is in the map, and the map has no review that is not in it.
    const decisions = JSON.parse(read('data/word_sounds_symbols_review_en.json')).words;
    for (const [word, decision] of Object.entries(decisions)) expect(entry(word).status, word).toBe(decision.status);
    for (const e of MAP.words.filter((row) => row.status === 'reviewed' && !/^plural of /.test(row.note))) expect(decisions[e.word], e.word).toMatchObject({ status: 'reviewed' });
  });

  it('the page data holds exactly the used words that have a recording, each with its unchanged drawing', () => {
    const used = MAP.words.filter((e) => (e.status === 'auto' || e.status === 'reviewed') && wordlist.get(e.word).hasClip);
    expect(allSymbols.words().sort()).toEqual(used.map((e) => e.word).sort());
    expect(allSymbols.count).toBe(used.length);
    expect(allSymbols.count).toBe(MAP.counts.packetWords);
    expect(allSymbols.ready()).toBe(true);
    for (const e of used) {
      const got = allSymbols.get(e.word);
      expect(got.file, e.word).toBe(e.file);
      // The drawing is the vendored file, with nothing changed but space at its ends (and, in an OpenMoji file, between tags).
      expect(got.set, e.word).toBe(e.set);
      expect(got.svg, e.word).toBe(e.set === 'mulberry' ? read(vendoredPath(e.file)).trim() : symbolsTool.minifySvg(read(vendoredPath(e.file))));
      expect(builder.svgRefusal(got.svg), e.file).toBe('');
      expect(typeof got.label === 'string' && got.label.length > 0, e.word).toBe(true);
    }
    for (const word of ['watch', 'box', 'smoke', 'hat', '']) expect(allSymbols.get(word), word).toBeNull();
    expect(allSymbols.has('CAT ')).toBe(true);
    // The data files: listed with their real size and hash, about 1 MB each, and each says whose the drawings are.
    expect(allSymbols.shards.length).toBe(made.shards.length);
    let total = 0;
    for (const shard of allSymbols.shards) {
      const text = read(shard.url);
      expect(shard.url).toMatch(/^word_sounds_symbols\/en-\d+\.json$/);
      expect(Buffer.byteLength(text), shard.url).toBe(shard.bytes);
      expect(sha256(text), shard.url).toBe(shard.sha256);
      expect(shard.bytes, shard.url).toBeLessThan(1200000);
      const data = JSON.parse(text);
      // One set to a data file (2026-11-12): each names its own.
      expect(data.set, shard.url).toBe(shard.set);
      expect(data.about, shard.url).toContain(shard.set === 'openmoji' ? 'OpenMoji 17.0.0' : 'Mulberry Symbols 3.6.1');
      expect(data.about, shard.url).toContain('Creative Commons Attribution-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-sa/4.0/)');
      expect(Object.keys(data.symbols).length, shard.url).toBe(shard.symbols);
      total += shard.bytes;
    }
    expect(allSymbols.bytes).toBe(total);
    expect(readdirSync('word_sounds_symbols').sort()).toEqual(allSymbols.shards.map((s) => s.url.split('/')[1]).sort());
    expect(allSymbols.credit).toEqual({ set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', url: 'https://mulberrysymbols.org', version: '3.6.1' });
    expect(allSymbols.notice).toBe(read('data/vendor/mulberry/LICENSE.txt').trim());
    // A drawing the index does not know is not taken in.
    const index = require('../word_sounds_symbols_en.js');
    expect(index.add({ symbols: { 'not-in-the-index.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>' } })).toBe(0);
    expect(index.add(null)).toBe(0);
  });
});

describe('an SVG is refused before it can reach a file', () => {
  const svg = (inside, attrs = '') => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"' + attrs + '>' + inside + '</svg>';
  const GOOD = [
    ['a plain drawing', svg('<path d="M1 1h8v8H1z" fill="#f00"/>')],
    ['a link inside the drawing', svg('<defs><linearGradient id="g"><stop offset="0"/></linearGradient><path id="p" d="M0 0h1"/></defs><use href="#p"/><use xlink:href="#p"/><rect fill="url(#g)" width="1" height="1"/>', ' xmlns:xlink="http://www.w3.org/1999/xlink"')],
    ['a style block with plain rules', svg('<style>.st0{fill:#ffeec8}.st1{fill:none;stroke:#231f20}</style><path class="st0" d="M0 0h1"/>')],
    ['text', svg('<text x="1" y="5" font-family="Arial">cat</text>')],
  ];
  const BAD = [
    ['<script', svg('<script>alert(1)</script>'), 'a script'],
    ['<script with a prefix', svg('<svg:script>alert(1)</svg:script>'), 'a script'],
    ['<foreignObject', svg('<foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject>'), 'a foreignObject'],
    ['an on*= attribute', svg('<path d="M0 0h1" onclick="x()"/>'), 'an event handler'],
    ['an on*= attribute on the root', svg('', ' onload="x()"'), 'an event handler'],
    ['an on*= attribute with no space before it', svg('<path d="M0 0h1"onmouseover=x />'), 'an event handler'],
    ['javascript: in a link', svg('<a href="javascript:alert(1)"><path d="M0 0h1"/></a>'), 'a script address'],
    ['javascript: hidden by character references', svg('<a href="java&#115;cript&#58;alert(1)"><path d="M0 0h1"/></a>'), 'a script address'],
    ['javascript: hidden by a tab', svg('<a href="java&#9;script:alert(1)"><path d="M0 0h1"/></a>'), 'a script address'],
    ['an external href', svg('<image href="https://example.org/x.png" width="1" height="1"/>'), 'a link to something outside the drawing'],
    ['an external xlink:href', svg('<image xlink:href="//example.org/x.png" width="1" height="1"/>'), 'a link to something outside the drawing'],
    ['a data: href', svg('<image href="data:image/png;base64,AAAA" width="1" height="1"/>'), 'a link to something outside the drawing'],
    ['<use href to another file', svg('<use href="other.svg#p"/>'), 'a link to something outside the drawing'],
    ['<use xlink:href to another file', svg('<use xlink:href="symbols.svg#p"/>'), 'a link to something outside the drawing'],
    ['<style with @import', svg('<style>@import "theme.css";</style>'), 'a style block that loads something'],
    ['<style with url(', svg('<style>.a{fill:url(paint.svg#p)}</style>'), 'a style block that loads something'],
    ['<style with a font', svg('<style>@font-face{font-family:x;src:url(data:;base64,AAAA)}</style>'), 'a style block that loads something'],
    ['<style left open', svg('<style>.a{fill:red}'), 'a style block that loads something'],
    ['url( to another file in an attribute', svg('<rect fill="url(paint.svg#p)" width="1" height="1"/>'), 'a link to something outside the drawing'],
    ['url( to a site in a style attribute', svg('<rect style="fill:url(\'//example.org/p.svg#p\')" width="1" height="1"/>'), 'a link to something outside the drawing'],
    ['xml:base', svg('<use href="#p"/>', ' xml:base="//example.org/"'), 'a base address'],
    ['an escape character', svg('<rect style="fill:\\75rl(x)" width="1" height="1"/>'), 'an escape character'],
    ['an animation that could set a link', svg('<a href="#a"><animate attributeName="href" values="#b"/></a>'), 'an element that is not a drawing'],
    ['an entity declaration', '<!DOCTYPE svg [<!ENTITY x "y">]>' + svg(''), 'not an SVG drawing'],
    ['a document type inside', svg('<!DOCTYPE svg>'), 'a document type or entity declaration'],
    ['a stylesheet instruction', svg('<?xml-stylesheet href="a.css"?>'), 'a processing instruction'],
    ['not a drawing at all', '<html><body>hello</body></html>', 'not an SVG drawing'],
    ['nothing', '', 'not an SVG drawing'],
    ['too large', svg('<path d="' + 'M0 0h1'.repeat(60000) + '"/>'), 'the drawing is too large'],
  ];

  it('each kind of thing that could run or load is refused by name, and a plain drawing passes', () => {
    for (const [name, text] of GOOD) expect(builder.svgRefusal(text), name).toBe('');
    for (const [name, text, why] of BAD) expect(builder.svgRefusal(text), name).toBe(why);
    for (const value of [null, undefined, 7, {}]) expect(builder.svgRefusal(value)).toBe('not an SVG drawing');
    // The ten symbols of the release that embed a font are refused; two of them are names of usable words.
    expect(made.refused).toEqual({ 'half.svg': 'a style block that loads something', 'quarter.svg': 'a style block that loads something' });
    expect(entry('half')).toMatchObject({ file: '', status: 'rejected' });
    // Every vendored drawing that a word uses passes.
    for (const e of MAP.words) if (e.file) expect(builder.svgRefusal(symbolsTool.minifySvg(read(vendoredPath(e.file)))), e.file).toBe('');
  });

  it('at build time too: a bad drawing handed to the builder is left out and listed', async () => {
    const hostile = { credit: { version: '3.6.1' }, get: (word) => {
      if (word === 'cat') return { file: 'cat.svg', label: 'cat', svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>steal()</script></svg>' };
      if (word === 'dog') return { file: 'dog.svg', label: 'dog', svg: '<svg xmlns="http://www.w3.org/2000/svg"><image href="//elsewhere.example/dog.png"/></svg>' };
      if (word === 'sun') return { file: 'sun.svg', label: 'sun', svg: 42 };
      if (word === 'pen') throw new Error('broken index');
      return symbols.get(word);
    } };
    const built = await build({ activities: ['isolation'], pictures: true, symbols: hostile });
    expect(built.manifest.pictures.refused).toEqual([{ word: 'cat', file: 'cat.svg', reason: 'a script' }, { word: 'dog', file: 'dog.svg', reason: 'a link to something outside the drawing' }]);
    expect(built.manifest.pictures.withPicture).toEqual(['top']);
    expect(built.manifest.pictures.withoutPicture).toEqual(CVC.filter((word) => word !== 'top'));
    expect(built.html).not.toContain('steal()');
    expect(built.html).not.toContain('elsewhere.example');
    const images = Object.values(lessonOf(built.html).images);
    expect(images).toHaveLength(1);
    expect(svgOfUri(images[0])).toBe(symbols.get('top').svg);
  });
});

describe('the builder: pictures off', () => {
  // The files this builder and loader made for these inputs BEFORE pictures existed (2026-11-11, from the saved
  // copies of both files at commit ecb54adc5a). A change to the practice player, the builder or the sound
  // dictionary changes them: after a deliberate one, put the new values here.
  // Renewed 2026-11-11 for one such change: packetCsv, which every file carries, now writes the title as the last
  // "#summary" cell (three lines, 239 bytes). With the loader as it was before that change these inputs still give
  // the first values (11854e18..., 168847 bytes and ed033f0d..., 53296 bytes): nothing else moved.
  const BEFORE = {
    // Re-pinned 2026-11-13: the right-answer tick pops in without reduced motion (one style line, +182 bytes). The loader
    // before that change still gives d1527ce8.../203072 and 4af49109.../84488.
    // Re-pinned 2026-11-12 (late): the reading tools button sits on its own line instead of floating over the question
    // (one style rule, -7 bytes each). The loader before that change still gives 3cd880c8.../198043 and 1a613cb8.../79459.
    // Re-pinned 2026-11-11: the file carries the core's Sound Sort list, which left out 18 blocked or borderline words (125 bytes).
    // Re-pinned 2026-11-12: every file carries the reading tools, the CSV as the main save button and "About this file"'s
    // list of what is recorded (+15761 bytes each); the loader before that change still gives 1cc1dba8.../168961 and
    // 7b8d85cd.../53535, and the new files differ from those in these additions only (14 lines changed, the lesson unchanged).
    // Re-pinned 2026-11-12: a check's results say mode "check" ("probe" before), and packetCsv, which every file carries,
    // reads both (2 lines, +76 bytes each). The loader before that change still gives 3ce0be14.../184722 and f41f66d9.../69296.
    // Re-pinned 2026-11-12: a file made for one student fills in the code name from its manifest (2 lines in the player,
    // +187 bytes each; tests/packet_check_mode.test.js lists them). The loader before that change still gives 207d8e26.../184798 and 0df6cc41.../69372.
    // Re-pinned 2026-11-12: each code name keeps its own progress on a shared device (the storage key ends with it; +130
    // bytes each). The loader before that change still gives 56615dfc.../184985 and cf1b0327.../69559.
    // Re-pinned 2026-11-12: on Open a practice file (packets-open.html) the player keeps its place and saves its results
    // through that page, only when the storage refuses in a frame with #packet-store-snapshot there (13 lines in, 1 out:
    // tests/packet_check_mode.test.js lists them), and the note for previews has a line for phones and tablets (+1664 bytes
    // each). The loader before that change still gives df4227e3.../185115 and edd34771.../69689.
    // Re-pinned 2026-11-12 (evening): every file carries Hear all and the reading tool "Read the choices when a question opens"
    // (hearAllIn; Find Sounds, Break it Down, Sound Mapping, Blend Sounds, Rhyme Time, Word Families and Sound Sort ask for it),
    // the "in all" progress line, the phone layout of a choice and the retry line brought into view (tests/packets_hear_all.test.js),
    // with another job's accessibility fixes and Untimed cells of that day. The lessons are unchanged. The loader before still gives 2744399.../186779.
    // Re-pinned 2026-11-12 (night): the look pass (style rules, feedback marks, progress bar, end-screen star and rows, four more
    // colors; +5036 bytes each; C:/tmp/packets_build_1111/look/NOTES.md). The lessons are unchanged. The loader before still gives 8c64fd27.../198036.
    all: { sha256: '203193b256ad1f050f16e047997ee53164cbcf4fb285294064c85066c7fdfa96', bytes: 203254, items: 124 },
    // Re-pinned 2026-11-12 (evening), as "all" above; the loader before still gives b3221d74.../71353.
    // Re-pinned 2026-11-12 (night), as "all" above; the loader before still gives 202974c1.../79452.
    isolation: { sha256: 'dc61bb4c1420a147067096705ac866f246335b30eedd61fd3ced48cced53cbe9', bytes: 84670, items: 5 },
  };
  const CASES = { all: {}, isolation: { words: CVC.slice(0, 5), activities: ['isolation'], title: undefined } };

  it('the file is byte for byte what it was before pictures existed', async () => {
    for (const name of Object.keys(CASES)) {
      const plain = await build(CASES[name]);
      expect({ sha256: sha256(Buffer.from(plain.html, 'utf8')), bytes: Buffer.byteLength(plain.html), items: plain.manifest.items.total }, name).toEqual(BEFORE[name]);
      // Off said out loud, off with the symbols handed over, and on with nothing to show: the same file each time.
      const none = { credit: { version: '3.6.1' }, get: () => null };
      for (const [how, over] of [['pictures: false', { pictures: false }], ['false with symbols', { pictures: false, symbols }], ['true with no symbols', { pictures: true }],
        ['true, no word has one', { pictures: true, symbols: none }], ['a truthy value that is not true', { pictures: 'yes', symbols }]]) {
        const other = await build({ ...CASES[name], ...over });
        expect(other.html === plain.html, name + ': ' + how).toBe(true);
        expect(other.sha256, name + ': ' + how).toBe(plain.sha256);
      }
      // Nothing about pictures is in it: not the code, not the words, not a field.
      for (const part of ['takeHomePictures', 'wordPicture', 'data-word-picture', 'picture_clue', 'picture_of', 'Mulberry', 'data:image', '"pictures"']) expect(plain.html, name + ' ' + part).not.toContain(part);
      expect(plain.manifest).not.toHaveProperty('pictures');
      expect(plain.manifest.notices.map((n) => n.id)).toEqual(['cmudict']);
      expect(lessonOf(plain.html).images).toEqual({});
      expect(plain.html).toContain('mailbox:null};\n(function takeHomeShell(');
    }
  });

  it('asked for and not possible, the manifest says so and the file is still the plain one', async () => {
    const plain = await build({ activities: ['isolation'] });
    const asked = await build({ activities: ['isolation'], pictures: true });
    expect(asked.html).toBe(plain.html);
    expect(asked.manifest.pictures).toMatchObject({ asked: true, symbols: false, withPicture: [], withoutPicture: CVC, counts: { withPicture: 0, withoutPicture: 10 } });
    // Sound Sort never shows the word's picture in the app, so a Sound Sort file carries none even with symbols.
    const never = await build({ activities: ['sound_sort'], pictures: true, symbols });
    const neverPlain = await build({ activities: ['sound_sort'] });
    expect(never.manifest.items.total).toBeGreaterThan(0);
    expect(never.html).toBe(neverPlain.html);
    expect(never.manifest.pictures.counts.withPicture).toBe(0);
  });
});

describe('the builder: pictures on', () => {
  it('embeds only data: drawings of its own words, adds the credit and the notice, and still holds nothing that could reach the network', async () => {
    const off = await build();
    const on = await build({ pictures: true, symbols });
    const have = CVC.filter((word) => symbols.has(word));
    expect(have).toEqual(['cat', 'dog', 'sun', 'pen', 'top']);
    expect(on.manifest.pictures).toEqual({ asked: true, symbols: true, set: 'Mulberry Symbols', version: '3.6.1', license: 'CC BY-SA 4.0', withPicture: have,
      withoutPicture: CVC.filter((word) => !symbols.has(word)), counts: { withPicture: 5, withoutPicture: 5 },
      files: { cat: 'cat.svg', dog: 'dog.svg', sun: 'sun.svg', pen: 'pen.svg', top: 'top.svg' }, refused: [] });
    const lesson = lessonOf(on.html);
    // One drawing for each word that has one, each the word's own symbol, each a data: address.
    const uris = Object.values(lesson.images);
    expect(uris).toHaveLength(have.length);
    for (const uri of uris) expect(uri).toMatch(/^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/);
    expect(uris.map(svgOfUri).sort()).toEqual(have.map((word) => symbols.get(word).svg).sort());
    for (const block of lesson.blocks) {
      for (const item of block.items) {
        const shows = !!loader.PICTURE_RULE[block.activity] && symbols.has(item.word);
        expect(item.wordPicture != null, block.activity + ' ' + item.word).toBe(shows);
        if (shows) expect(svgOfUri(lesson.images[item.wordPicture]), item.word).toBe(symbols.get(item.word).svg);
      }
    }
    expect(lesson.pictures.rule).toEqual(Object.fromEntries(lesson.blocks.filter((b) => loader.PICTURE_RULE[b.activity]).map((b) => [b.activity, loader.PICTURE_RULE[b.activity]])));
    // The same rule for the file as before: nothing that could reach the network, no element that loads.
    expect(audit(on.html)).toEqual([]);
    expect(on.html.match(/<script/gi)).toHaveLength(2);
    expect(on.html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video|svg)\b/i);
    const policy = /Content-Security-Policy" content="([^"]+)"/.exec(on.html)[1];
    expect(policy).toMatch(/^default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; /);
    expect(policy).toMatch(/connect-src 'none'$/);
    expect(policy).toBe(/Content-Security-Policy" content="([^"]+)"/.exec(off.html)[1].replace(/'sha256-[^']+'/, /'sha256-[^']+'/.exec(policy)[0]));
    // The credit and the license notice travel in the file.
    const m = manifestOf(on.html);
    expect(m.attributions).toEqual(manifestOf(off.html).attributions.concat(['Pictures: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org']));
    expect(m.attributions[m.attributions.length - 1]).toBe(builder.pictureCredit());
    expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'mulberry']);
    expect(m.notices[1]).toEqual({ id: 'mulberry', name: 'Mulberry Symbols', text: builder.MULBERRY_NOTICE });
    expect(m.pictures).toEqual({ set: 'Mulberry Symbols', version: '3.6.1', license: 'CC BY-SA 4.0', wordsWithPicture: 5, wordsWithoutPicture: 5 });
    expect(m.never).toEqual(['internet connection', 'microphone', 'camera', 'cookies', 'AI']);
    expect(m.network).toBe('none');
    expect(on.manifest.creditsInFile).toBe(true);
    expect(on.manifest.attributions).toEqual(m.attributions);
    // The words for the picture travel only in this file.
    expect(labelsOf(on.html)).toMatchObject(loader.PICTURE_LABELS);
    expect(Object.keys(labelsOf(off.html)).filter((key) => /^picture_/.test(key))).toEqual([]);
    expect(on.html).toContain('mailbox:null};\nrenders=(function takeHomePictures(');
    // A different version of the same packet, and a little larger: the drawings and one small function.
    expect(on.lesson.lessonId).toBe(off.lesson.lessonId);
    expect(on.lesson.revision).not.toBe(off.lesson.revision);
    const extra = Buffer.byteLength(on.html) - Buffer.byteLength(off.html);
    const drawings = uris.reduce((sum, uri) => sum + uri.length, 0);
    expect(extra).toBeGreaterThan(drawings);
    expect(extra).toBeLessThan(drawings + 12000);
    // The same inputs make the same bytes.
    expect((await build({ pictures: true, symbols })).sha256).toBe(on.sha256);
  });

  it('"About this file" shows the credit, word for word', async () => {
    const on = await build({ activities: ['isolation'], pictures: true, symbols });
    const page = open(on.html);
    page.d.querySelector('[data-about-open]').click();
    expect(page.d.getElementById('about-panel').textContent).toContain('Pictures: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org');
  });

  it('the credit holds what the app\'s own Mulberry credit holds, and the notice is the set\'s own', () => {
    const literal = /const MULBERRY_CREDIT = Object\.freeze\((\{[^}]*\})\);/.exec(read('alt_text_source.jsx'))[1];
    const app = new Function('return ' + literal)();
    expect(app).toMatchObject({ set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' });
    const bare = (url) => url.replace(/^https:\/\//, '');
    expect(builder.MULBERRY_CREDIT).toEqual({ set: app.set, author: app.author, license: app.license, licenseUrl: bare(app.licenseUrl), url: bare(app.url) });
    for (const value of Object.values(builder.MULBERRY_CREDIT)) expect(builder.pictureCredit()).toContain(value);
    // And what the vendored set says about itself.
    expect(builder.MULBERRY_CREDIT).toEqual({ set: SOURCE.name, author: SOURCE.author, license: SOURCE.licenseShort, licenseUrl: bare(SOURCE.licenseUrl), url: bare(SOURCE.homepage) });
    const notice = read('data/vendor/mulberry/LICENSE.txt').split('\n').map((line) => line.trimEnd()).join('\n').trim().replace('https://', '');
    expect(builder.MULBERRY_NOTICE.startsWith(notice + '\n\n')).toBe(true);
    expect(builder.MULBERRY_NOTICE).toContain('stay under that license (CC BY-SA 4.0)');
    expect(builder.MULBERRY_NOTICE).not.toMatch(/https?:/);
    // The builder and the packet hold no web address; the app never searches Global Symbols for a packet.
    expect(read('word_sounds_packet_builder.js')).not.toMatch(/https?:\/\/|globalsymbols/i);
    expect(read('packets-make.js')).not.toMatch(/globalsymbols/i);
    expect(read('word_sounds_take_home_loader.js')).not.toMatch(/globalsymbols|mulberry/i);
  });
});

describe('when the picture shows: the app\'s rule', () => {
  const moduleSource = read('word_sounds_module.js');
  const IDS = ['isolation', 'segmentation', 'blending', 'orthography', 'mapping', 'spelling_bee', 'word_scramble', 'missing_letter', 'manipulation', 'syllable_blending', 'syllable_counting',
    'rhyming', 'sound_sort', 'letter_tracing', 'counting', 'word_families', 'decoding', 'read_sentence', 'read_passage', 'sentence_match'];

  it('PICTURE_RULE is what word_sounds_module.js does, read from its code', () => {
    // 1. The app's table, and the default for an activity it does not list.
    const table = /const SMART_IMAGE_VISIBILITY = \{([\s\S]*?)\};/.exec(moduleSource)[1];
    const SMART = Object.fromEntries([...table.matchAll(/(\w+):\s*"(\w+)"/g)].map((m) => [m[1], m[2]]));
    expect(SMART).toEqual({ counting: 'afterCompletion', isolation: 'progressive', blending: 'afterCompletion', segmentation: 'alwaysOn', rhyming: 'alwaysOn', letter_tracing: 'alwaysOn',
      mapping: 'alwaysOn', orthography: 'afterCompletion', sound_sort: 'progressive', spelling_bee: 'afterCompletion', word_scramble: 'afterCompletion', missing_letter: 'afterCompletion' });
    expect(moduleSource).toMatch(/if \(imageVisibilityMode === "smart"\) \{\s*return SMART_IMAGE_VISIBILITY\[wordSoundsActivity\] \|\| "progressive";/);
    // 2. What each word means. Drawn with the prompt when alwaysOn; the other two wait for showImageForCurrentWord.
    expect(moduleSource).toMatch(/\(effectiveMode === "alwaysOn" \|\|\s*\(\(effectiveMode === "progressive" \|\|\s*effectiveMode === "afterCompletion"\) &&\s*showImageForCurrentWord\)\)/);
    //    progressive: after the first wrong try.
    expect(moduleSource).toMatch(/if \(newAttempts === 1\) \{\s*if \(effectiveCheckMode === "progressive"\)\s*setShowImageForCurrentWord\(true\);/);
    //    every mode: on a right answer.
    expect(moduleSource).toMatch(/setShowWordText\(true\);\s*if \(setShowImageForCurrentWord\) setShowImageForCurrentWord\(true\);/);
    //    afterCompletion: also when the item ends wrong.
    expect(moduleSource).toMatch(/if \(!isCorrect && effectiveCheckMode === "afterCompletion"\) \{\s*setShowImageForCurrentWord\(true\);/);
    //    and hidden again for the next word.
    expect(moduleSource).toMatch(/setCurrentWordImage\(word\.image\);\s*setShowWordText\(false\);\s*setShowImageForCurrentWord\(false\);/);
    //    Its alt text never names the word.
    expect(moduleSource).toMatch(/src: currentWordImage,\s*alt: ts\("word_sounds\.mystery_word"\) \|\| "Mystery Word",/);
    // 3. Which activity screens draw that prompt picture at all: the cases of the activity switch.
    const from = moduleSource.indexOf('const renderPrompt = () =>');
    const to = moduleSource.indexOf('const takeHomeLib = async');
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const region = moduleSource.slice(from, to);
    const heads = [...region.matchAll(/\n {10}case "([a-z_]+)":( \{)?(?=\n)/g)].map((m) => ({ id: m[1], at: m.index, end: m.index + m[0].length }));
    expect(heads.map((h) => h.id)).toEqual(IDS);
    const block = (id) => {
      let i = heads.findIndex((h) => h.id === id);
      // Two cases that share one screen (segmentation, blending): the text is under the second.
      while (i + 1 < heads.length && !region.slice(heads[i].end, heads[i + 1].at).trim()) i++;
      const text = region.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].at : region.length);
      // The microphone way of answering is not what a file does: leave its branch out.
      return text.replace(/\n( +)if \(useMicInput\) \{[\s\S]*?\n\1\}/g, '');
    };
    const drawsPrompt = (id) => block(id).includes('renderPrompt()');
    expect(IDS.filter(drawsPrompt)).toEqual(['segmentation', 'blending', 'orthography', 'mapping', 'spelling_bee', 'word_scramble', 'missing_letter', 'manipulation', 'syllable_counting',
      'rhyming', 'letter_tracing', 'counting', 'word_families']);
    // Find Sounds: its answer screen puts the picture on the "hear the word" button from the start.
    expect(block('isolation')).toMatch(/React\.createElement\(PhonologyView, \{[\s\S]*?image:\s*isolationState\?\.image \|\|\s*currentWordImage \|\|/);
    expect(moduleSource).toMatch(/if \(activity === "isolation"\) \{[\s\S]{0,4000}?data\.image\s*\? \/\*#__PURE__\*\/ React\.createElement\("img", \{\s*loading: "lazy",\s*src: data\.image,/);
    // 4. The rule a file follows.
    const MODE = { alwaysOn: 'prompt', progressive: 'retry', afterCompletion: 'after' };
    const expected = {};
    for (const id of IDS) {
      if (drawsPrompt(id)) expected[id] = MODE[SMART[id] || 'progressive'];
      else if (id === 'isolation') expected[id] = 'prompt';
    }
    expect(loader.PICTURE_RULE).toEqual(expected);
    expect(loader.PICTURE_RULE).toEqual({ isolation: 'prompt', segmentation: 'prompt', rhyming: 'prompt', letter_tracing: 'prompt', mapping: 'prompt',
      word_families: 'retry', manipulation: 'retry', syllable_counting: 'retry',
      counting: 'after', blending: 'after', orthography: 'after', spelling_bee: 'after', word_scramble: 'after', missing_letter: 'after' });
    // Every activity a file can hold is one of the app's.
    expect(Object.keys(loader.ADAPTERS).sort()).toEqual(IDS.slice().sort());
    expect(builder.SUPPORTED_ACTIVITIES.filter((id) => !loader.PICTURE_RULE[id])).toEqual(['sound_sort']);
  });

  // A stand-in for each activity: a Right button and a Wrong button, so the test decides every answer.
  const stand = (id) => ({ id, title: id, labels: {}, prepare: () => ({ item: { target: 'x' } }),
    render: function (item, ctx) {
      ctx.root.appendChild(ctx.el('button', { type: 'button', 'data-right': '', on: { click: function () { ctx.answer('x', true); } } }, ['Right']));
      ctx.root.appendChild(ctx.el('button', { type: 'button', 'data-wrong': '', on: { click: function () { ctx.answer('y', false); } } }, ['Wrong']));
      return { reveal: function (correct) { ctx.root.setAttribute('data-revealed', String(correct)); } };
    } });
  const ADAPTERS = Object.fromEntries(IDS.map((id) => [id, stand(id)]));
  const png = (word) => 'data:image/png;base64,' + Buffer.from('a picture of ' + word).toString('base64');
  const rows = () => [{ word: 'cat', targetWord: 'cat', term: 'cat', image: png('cat') }, { word: 'map', targetWord: 'map', term: 'map', image: png('map') }];
  const file = (extra = {}) => {
    const lesson = loader.lessonFromPack(rows(), { core, adapters: ADAPTERS, activities: IDS, title: 'Every activity', lessonId: 'L-pictures', ...extra }).lesson;
    lesson.createdAt = '2026-11-11T00:00:00.000Z';
    return { lesson, html: loader.buildHtml(lesson, { core, adapters: ADAPTERS }) };
  };

  it('in the file, activity by activity: shown with the question, after a first wrong try, only when done, or never', () => {
    const { lesson, html } = file();
    expect(lesson.blocks.map((b) => b.activity)).toEqual(IDS);
    expect(Object.keys(lesson.images)).toHaveLength(2);
    expect(lesson.pictures).toEqual({ rule: loader.PICTURE_RULE });
    for (const block of lesson.blocks) for (const item of block.items) expect(item.wordPicture != null, block.activity).toBe(!!loader.PICTURE_RULE[block.activity]);
    const page = open(html);
    page.start();
    const seen = {};
    for (const id of IDS) {
      const when = loader.PICTURE_RULE[id] || 'never';
      for (const [word, way] of [['cat', 'right'], ['map', 'missed']]) {
        const what = id + ' ' + word;
        const box = page.picture();
        const img = box && box.querySelector('img');
        const state = () => (!box ? 'none' : box.hidden ? 'hidden' : 'shown') + (img && img.getAttribute('alt') ? ' named' : '');
        // Before any answer.
        expect(state(), what + ' before').toBe({ prompt: 'shown', retry: 'hidden', after: 'hidden', never: 'none' }[when]);
        if (box) {
          expect(img.getAttribute('src'), what).toBe(png(word));
          expect(img.getAttribute('alt'), what).toBe('');
          expect(box.querySelector('.sr').textContent, what).toBe('Picture clue');
          expect(box.textContent, what).not.toContain(word);
          // The box is the first thing in the activity, above the question.
          expect(box.parentNode.firstElementChild, what).toBe(box);
          // "hidden" must hide: nothing on the box sets its display.
          expect(box.getAttribute('style'), what).not.toMatch(/display/);
        }
        if (way === 'right') page.d.querySelector('#app [data-right]').click();
        else {
          // A first wrong try: only "retry" shows the picture now, and no file names it yet.
          page.d.querySelector('#app [data-wrong]').click();
          expect(state(), what + ' after one wrong try').toBe({ prompt: 'shown', retry: 'shown', after: 'hidden', never: 'none' }[when]);
          if (box) expect(box.querySelector('.sr').textContent, what).toBe('Picture clue');
          page.d.querySelector('#app [data-wrong]').click();
        }
        // The item is over, right or missed: the picture shows and may be named.
        expect(state(), what + ' when done').toBe(when === 'never' ? 'none' : 'shown named');
        if (box) {
          expect(img.getAttribute('alt'), what).toBe('Picture of ' + word);
          expect(box.querySelector('.sr'), what).toBeNull();
        }
        // The activity's own "the item is over" still runs, with the same value.
        expect(page.d.querySelector('#app [data-revealed]').getAttribute('data-revealed'), what).toBe(String(way === 'right'));
        seen[id] = when;
        page.next();
      }
    }
    expect(Object.keys(seen)).toEqual(IDS);
    // Letter Trace is practice and is not counted: 19 scored activities, one word right and one missed in each.
    expect(page.d.getElementById('app').textContent).toContain('Right on the first try: 19 of 38.');
  });

  it('an item reopened when it is already done shows its picture; a word with no picture has no box', () => {
    const three = [{ word: 'cat', targetWord: 'cat', term: 'cat', image: png('cat') }, { word: 'map', targetWord: 'map', term: 'map', image: png('map') }, { word: 'dog', targetWord: 'dog', term: 'dog' }];
    const lesson = loader.lessonFromPack(three, { core, adapters: ADAPTERS, activities: ['counting'], title: 'Three words', lessonId: 'L-reopen' }).lesson;
    expect(lesson.blocks[0].items.map((item) => item.wordPicture != null)).toEqual([true, true, false]);
    const html = loader.buildHtml(lesson, { core, adapters: ADAPTERS });
    const first = open(html);
    first.start();
    first.d.querySelector('#app [data-right]').click();
    first.next();
    // The second item: its picture waits, then the item is answered and the file is closed before Next.
    expect(first.picture().hidden).toBe(true);
    first.d.querySelector('#app [data-right]').click();
    expect(first.picture().hidden).toBe(false);
    const kept = Object.fromEntries(Object.keys(first.w.localStorage).map((key) => [key, first.w.localStorage.getItem(key)]));
    expect(Object.keys(kept)).toHaveLength(1);
    // Opened again: the answered item is shown as answered, with its picture, named.
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      Object.keys(kept).forEach((key) => w.localStorage.setItem(key, kept[key]));
    } });
    opened.push(dom.window);
    const d = dom.window.document;
    const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
    button('Continue where I left off').click();
    const box = d.querySelector('#app [data-word-picture]');
    expect(box.hidden).toBe(false);
    expect(box.querySelector('img').getAttribute('src')).toBe(png('map'));
    expect(box.querySelector('img').getAttribute('alt')).toBe('Picture of map');
    expect(box.querySelector('.sr')).toBeNull();
    button('Next').click();
    // The third word has no picture: no box at all, before or after its answer.
    expect(d.querySelector('#app [data-word-picture]')).toBeNull();
    d.querySelector('#app [data-right]').click();
    expect(d.querySelector('#app [data-word-picture]')).toBeNull();
  });

  it('with the real activities: the picture sits above Find Sounds from the start and above Sound Counting only when the item is done', async () => {
    const on = await build({ words: ['cat', 'pig'], activities: ['isolation', 'counting'], pictures: true, symbols });
    const lesson = lessonOf(on.html);
    const page = open(on.html);
    page.start();
    // Find Sounds, cat: shown from the start.
    let item = lesson.blocks[0].items[0];
    let box = page.picture();
    expect(box.hidden).toBe(false);
    expect(svgOfUri(box.querySelector('img').getAttribute('src'))).toBe(symbols.get('cat').svg);
    expect(box.querySelector('img').getAttribute('alt')).toBe('');
    const right = item.choices.findIndex((c) => c.label === item.target);
    page.d.dispatchEvent(new page.w.KeyboardEvent('keydown', { key: String(right + 1), bubbles: true, cancelable: true }));
    expect(box.querySelector('img').getAttribute('alt')).toBe('Picture of cat');
    // The activity's own marking of the right choice still happens.
    expect(page.d.querySelectorAll('#app li.choice.right')).toHaveLength(1);
    page.next();
    // Find Sounds, pig: no symbol, no box.
    expect(page.picture()).toBeNull();
    item = lesson.blocks[0].items[1];
    page.d.dispatchEvent(new page.w.KeyboardEvent('keydown', { key: String(item.choices.findIndex((c) => c.label === item.target) + 1), bubbles: true, cancelable: true }));
    page.next();
    // Sound Counting, cat: hidden through a wrong try, shown when the item is done.
    item = lesson.blocks[1].items[0];
    expect(item.target).toBe('3');
    box = page.picture();
    expect(box.hidden).toBe(true);
    const numbers = [...page.d.querySelectorAll('#app .counting-numbers button')];
    numbers.find((b) => b.textContent === '5').click();
    expect(box.hidden).toBe(true);
    numbers.find((b) => b.textContent === '3').click();
    expect(box.hidden).toBe(false);
    expect(box.querySelector('img').getAttribute('alt')).toBe('Picture of cat');
    expect(page.d.querySelectorAll('#app li.choice.right')).toHaveLength(1);
  });

  it('the picture code stands alone, and a file without word pictures has none of it', () => {
    const text = loader._pictures.toString();
    expect(audit(text)).toEqual([]);
    expect(text).not.toMatch(/\b(?:document|window|localStorage|globalThis|lesson)\b/);
    // Compiled with nothing in scope, it still wraps a render.
    const wrap = new Function('return (' + text + ');')();
    const base = { a: () => 'base' };
    expect(wrap(base, {}, {}).a).toBe(base.a);
    expect(wrap(base, { a: 'sometimes' }, {}).a).toBe(base.a);
    expect(wrap(base, { a: 'after' }, {}).a).not.toBe(base.a);
    // Rows with no picture: the lesson says nothing about pictures and the file is the plain one.
    const plain = loader.lessonFromPack(rows().map(({ image, ...row }) => row), { core, adapters: ADAPTERS, activities: IDS, title: 'Every activity', lessonId: 'L-pictures' }).lesson;
    expect(plain).not.toHaveProperty('pictures');
    expect(JSON.stringify(plain.blocks)).not.toContain('wordPicture');
    const html = loader.buildHtml(plain, { core, adapters: ADAPTERS });
    for (const part of ['takeHomePictures', 'wordPicture', 'picture_clue', 'picture_of', 'data-word-picture']) expect(html, part).not.toContain(part);
    // A picture that is a web address cannot travel, and a row whose picture is only a reference has none.
    const web = loader.lessonFromPack([{ word: 'cat', targetWord: 'cat', term: 'cat', image: 'https://example.org/cat.png' }, { word: 'map', targetWord: 'map', term: 'map', image: 'ref::42' }],
      { core, adapters: ADAPTERS, activities: ['isolation'], title: 'x' }).lesson;
    expect(web).not.toHaveProperty('pictures');
    expect(web.images).toEqual({});
  });

  it('a check never shows a word picture, and carries none', () => {
    delete window.AlloPacketChecks;
    new Function(read('packet_check_builder.js'))();
    const PC = window.AlloPacketChecks;
    const check = PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('7+8,12-5'), timeLimitS: null });
    const plain = PC.buildCheckPacket({ lesson: check, loader });
    // The same check with a word picture forced onto every item, and a rule that says "with the question".
    const forced = JSON.parse(JSON.stringify(check));
    forced.images = { m0: png('seven') };
    forced.blocks.forEach((block) => block.items.forEach((item) => { item.wordPicture = 'm0'; }));
    forced.pictures = { rule: Object.fromEntries(forced.blocks.map((block) => [block.activity, 'prompt'])) };
    const built = PC.buildCheckPacket({ lesson: forced, loader });
    for (const part of ['takeHomePictures', 'wordPicture', 'picture_clue', 'picture_of', 'data-word-picture', 'data:image', png('seven')]) expect(built.html, part).not.toContain(part);
    expect(lessonOf(built.html).images).toEqual({});
    expect(lessonOf(built.html)).not.toHaveProperty('pictures');
    // The lesson handed in is not changed.
    expect(forced.blocks[0].items[0].wordPicture).toBe('m0');
    // A check with no picture is the file it always was.
    expect(lessonOf(plain.html).blocks.length).toBe(lessonOf(built.html).blocks.length);
    expect(plain.html).not.toContain('takeHomePictures');
    const page = open(built.html);
    expect(page.d.querySelector('[data-word-picture]')).toBeNull();
    expect(page.d.querySelectorAll('#app img')).toHaveLength(0);
  });
});

describe('"Include pictures" in the app\'s take-home dialog', () => {
  const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const loadLoader = () => { delete window.AlloWordSoundsTakeHome; new Function(read('word_sounds_take_home_loader.js'))(); return window.AlloWordSoundsTakeHome; };
  const wav = (tag) => { const bytes = Buffer.alloc(64); bytes.write('RIFF'); bytes.write('WAVE', 8); bytes.write(String(tag).slice(0, 8), 44); return bytes.toString('base64'); };
  const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
  const SOUNDS = {
    isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
    phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), s: uri('s'), p: uri('p') },
    instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
  };
  const png = (word) => 'data:image/png;base64,' + Buffer.from('made in the app: ' + word).toString('base64');
  const word = (w, position, correct, options, extra = {}) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
    activityItems: { isolation: { position, correctSound: correct, options } }, ...extra });
  // cat has its own picture; map has one only in the lesson's shared picture list.
  const PACK = () => [word('cat', 0, 'k', ['k', 'a', 't', 'm'], { image: png('cat'), _decodingAssets: { map: png('map') } }), word('map', 2, 'p', ['m', 'a', 'p', 's'])];
  const BARE = () => [word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])];

  let WordSoundsModal, root = null, host = null;
  beforeAll(() => { ({ WordSoundsModal } = setupWordSounds()); });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    root = null; host = null;
    delete window.__ALLO_ISOLATION_AUDIO; delete window.__ALLO_PHONEME_AUDIO_BANK; delete window.__ALLO_INSTRUCTION_AUDIO; delete window.__alloMailboxTakeHome;
    vi.restoreAllMocks();
  });
  const flush = async (ms = 0) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
  const mount = (pack) => {
    window.__ALLO_ISOLATION_AUDIO = SOUNDS.isolation;
    window.__ALLO_PHONEME_AUDIO_BANK = SOUNDS.phonemes;
    window.__ALLO_INSTRUCTION_AUDIO = SOUNDS.instructions;
    loadLoader();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('isolation'), { isTeacherMode: true, isProbeMode: false, wsPreloadedWords: pack, wordSoundsLanguage: 'en' }))));
  };
  const openDialog = async () => {
    await act(async () => { host.querySelector('[data-ws-take-home-open]').click(); });
    await flush(50);
    return host.querySelector('[data-ws-take-home-dialog]');
  };
  const download = async (dialog, blobs) => {
    const button = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Download the file');
    await act(async () => { button.click(); });
    await flush(50);
    return blobs[blobs.length - 1].text();
  };
  const capture = () => {
    const blobs = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:x'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return blobs;
  };

  it('is on when a word has a picture; off, the file is made from rows without their pictures', async () => {
    mount(PACK());
    const dialog = await openDialog();
    const box = dialog.querySelector('[data-ws-take-home-pictures]');
    expect(box.checked).toBe(true);
    expect(box.closest('label').textContent).toBe('Include pictures' + 'A picture shows only where it cannot give the answer away, or after the answer.');
    expect(dialog.querySelectorAll('[data-ws-take-home-pictures]')).toHaveLength(1);
    const blobs = capture();
    // On: both words carry their picture, and the file follows the same rule as every packet.
    const withPictures = await download(dialog, blobs);
    const on = lessonOf(withPictures);
    expect(on.blocks[0].items.map((item) => item.word)).toEqual(['cat', 'map']);
    expect(on.blocks[0].items.map((item) => on.images[item.wordPicture])).toEqual([png('cat'), png('map')]);
    expect(on.pictures).toEqual({ rule: { isolation: 'prompt' } });
    expect(withPictures).toContain('renders=(function takeHomePictures(');
    expect(labelsOf(withPictures)).toMatchObject({ picture_clue: 'Picture clue', picture_of: 'Picture of {word}' });
    // Off: no picture, no picture code, and the same questions as a lesson that never had pictures.
    await act(async () => { box.click(); });
    await flush(50);
    expect(dialog.querySelector('[data-ws-take-home-pictures]').checked).toBe(false);
    const withoutPictures = await download(dialog, blobs);
    const off = lessonOf(withoutPictures);
    expect(off.images).toEqual({});
    expect(off).not.toHaveProperty('pictures');
    for (const part of ['takeHomePictures', 'wordPicture', 'picture_clue', 'data:image', 'made in the app']) expect(withoutPictures, part).not.toContain(part);
    const TH = window.AlloWordSoundsTakeHome;
    const bare = TH.lessonFromPack(BARE(), { core, banks: SOUNDS, title: off.title, lessonId: off.lessonId }).lesson;
    expect(off.blocks).toEqual(JSON.parse(JSON.stringify(bare.blocks)));
    expect(off.revision).toBe(bare.revision);
    // The lesson in the app keeps its pictures: only the file went without.
    expect(blobs).toHaveLength(2);
    await act(async () => { dialog.querySelector('[data-ws-take-home-pictures]').click(); });
    await flush(50);
    expect(lessonOf(await download(dialog, blobs)).blocks[0].items.map((item) => item.wordPicture != null)).toEqual([true, true]);
  });

  it('is not shown when no word has a picture', async () => {
    mount(BARE());
    const dialog = await openDialog();
    expect(dialog.querySelector('[data-ws-take-home-activity="isolation"]')).toBeTruthy();
    expect(dialog.querySelector('[data-ws-take-home-pictures]')).toBeNull();
    const html = await download(dialog, capture());
    expect(html).not.toContain('takeHomePictures');
  });

  it('its strings follow the dialog\'s own pattern, with English in the code', () => {
    const source = read('word_sounds_module.js');
    // The new keys, each with its English in the code (they are registered and translated later, with the other take-home keys).
    const keys = {
      'word_sounds.take_home_include_pictures': 'Include pictures',
      'word_sounds.take_home_include_pictures_help': 'A picture shows only where it cannot give the answer away, or after the answer.',
      'word_sounds.take_home_missing_picture': 'no picture of {word}',
    };
    for (const key of Object.keys(keys)) expect(source, key).toContain('printTr("' + key + '", "' + keys[key] + '"');
    // The two words the file itself uses for a picture go through the same word_sounds.take_home_player_<label> keys as the rest.
    expect(loader.PICTURE_LABELS).toEqual({ picture_clue: 'Picture clue', picture_of: 'Picture of {word}' });
    expect(Object.keys(loader.DEFAULT_LABELS).filter((label) => /^picture_/.test(label))).toEqual([]);
    expect(source).toContain('Object.keys(lib.DEFAULT_LABELS).concat(Object.keys(lib.PICTURE_LABELS || {}))');
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(source);
  });
});
