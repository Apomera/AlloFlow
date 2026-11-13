import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { openMaker } from './helpers/packets_maker_page.js';

// "Open a file I made" on the maker (packets-make.html): the page fills itself in from a practice file made earlier.
// (a) packets_reopen.js reads back what a file says about how it was made, through packets_verify_core.js (readParts),
//     and a file made again from that is the same file, byte for byte.
// (b) It says plainly what it cannot use: a results file, a check, math practice, a page that is not a packet, an older file.
// (c) A student's code name in a file: the file opens with it filled in (a #learner= link still wins).
// (d) The page in jsdom: choose the file, the steps fill in, the next file is the same file; the teacher's own sounds,
//     recordings and pictures come back and can be kept in My words.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');

const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
function wav(ms, tone = 8) {
  const rate = 22050, n = Math.round(rate * ms / 1000), pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin(i / tone) * 8000), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return 'data:audio/wav;base64,' + Buffer.concat([h, pcm]).toString('base64');
}
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (bytes = 300, fill = 3) => 'data:image/png;base64,' + Buffer.concat([PNG_HEAD, Buffer.alloc(bytes, fill)]).toString('base64');
const ZAYDEN = ['z', 'ay', 'd', 'schwa', 'n'];
const ZAYDEN_SPELLING = [{ text: 'z', size: 1 }, { text: 'ay', size: 1 }, { text: 'd', size: 1 }, { text: 'e', size: 1 }, { text: 'n', size: 1 }];
const BY_SA = { title: 'Six weeks (old) cat, sleeping', author: 'Ada Poe', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5/',
  source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Six_weeks_old_cat.jpg', resized: true };
const OWN = {
  zayden: { sounds: { sounds: ZAYDEN, spelling: ZAYDEN_SPELLING }, clip: { dataUri: wav(500) }, picture: { dataUri: png(), credit: { own: true } } },
  cat: { picture: { dataUri: png(320, 5), credit: BY_SA } },
  box: { sounds: { sounds: ['b', 'o', 'k', 's'], spelling: [{ text: 'b', size: 1 }, { text: 'o', size: 1 }, { text: 'x', size: 2 }] } },
};
const ORDER = builder.SUPPORTED_ACTIVITIES;
const ENV = { verify, creditLine: builder.creditLine, codeName: builder.codeName, activities: ORDER, wordSounds: core.activityIds(), labels: dictionary.labels, seeds: { A: 1, B: 2, C: 3 } };
const SEEDS = { A: 1, B: 2, C: 3 };
const build = (over = {}) => builder.buildPacket({ words: ['zayden', 'cat', 'dog', 'box', 'sun', 'lamp', 'ship'], activities: ['isolation', 'segmentation', 'mapping', 'letter_tracing', 'blending'],
  seed: 2, title: 'Unit 4 sounds', core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav, ...over });
// What the page hands the builder after reading a file: the activities in the page's order.
const again = (r, over = {}) => build({ words: r.words, activities: r.activities, seed: SEEDS[r.version], title: r.title, pictures: r.pictures,
  own: Object.keys(r.own).length ? r.own : undefined, learnerLabel: r.learner, ...over });

describe('(a) a file is read back, and made again byte for byte', () => {
  it('words, activities, version, title, pictures, code name and the teacher\'s own sounds, recordings and pictures', async () => {
    const first = await build({ pictures: true, own: OWN, learnerLabel: 'Blue Heron 7' });
    const r = reopen.read(Buffer.from(first.html), ENV);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('words');
    expect(r.words).toEqual(['zayden', 'cat', 'dog', 'box', 'sun', 'lamp', 'ship']);
    expect(r.activities).toEqual(ORDER.filter((id) => ['isolation', 'segmentation', 'mapping', 'letter_tracing', 'blending'].includes(id)));
    expect([r.version, r.title, r.pictures, r.learner]).toEqual(['B', 'Unit 4 sounds', true, 'Blue Heron 7']);
    expect(r.notes).toEqual([]);
    expect(r.own.zayden.sounds).toEqual({ sounds: ZAYDEN, spelling: ZAYDEN_SPELLING });
    expect(r.own.zayden.clip.dataUri).toBe(OWN.zayden.clip.dataUri);
    expect(r.own.zayden.picture).toEqual({ dataUri: OWN.zayden.picture.dataUri, credit: { own: true } });
    // A credit comes back only when it gives the same credit sentence (brackets for parentheses, as the file shows it).
    expect(builder.creditLine(r.own.cat.picture.credit)).toBe(builder.creditLine(BY_SA));
    expect(r.own.box.sounds.spelling).toEqual(OWN.box.sounds.spelling);
    // Made again with what was read, in the page's order of activities: the same file.
    const order = await build({ pictures: true, own: OWN, learnerLabel: 'Blue Heron 7', activities: r.activities });
    expect((await again(r)).html).toBe(order.html);
  });

  it('a plain file, each version, and a word that got no question in one activity keeps its place', async () => {
    for (const version of ['A', 'B', 'C']) {
      const first = await build({ seed: SEEDS[version], activities: ['isolation', 'letter_tracing'], own: undefined });
      const r = reopen.read(first.html, ENV);
      expect(r.version).toBe(version);
      expect(r.own).toEqual({});
      // lamp has no Find Sounds question here (its sounds), but Letter Trace has it: it goes back between ship and sun's neighbours.
      expect(r.words).toEqual(first.manifest.words.used);
      expect((await again(r)).html).toBe(first.html);
    }
  });

  it('the word order is put back from activities that each lost a different word', () => {
    expect(reopen.wordOrder([{ items: [{ word: 'sun' }, { word: 'dog' }, { word: 'map' }] }, { items: ['cat', 'sun', 'map', 'hat'].map((word) => ({ word })) }])).toEqual(['cat', 'sun', 'dog', 'map', 'hat']);
    // A word twice in one activity, and what is not a word, count once and not at all.
    expect(reopen.wordOrder([{ items: [{ word: 'Cat' }, { word: 'cat' }, { word: 'x' }, { word: '<b>' }, null] }])).toEqual(['cat']);
  });

  it('a picture credit is taken back only when its sentence is the builder\'s, word for word', () => {
    const credits = [BY_SA, { license: 'CC0' }, { author: 'Ann', license: 'Public domain', source: 'Global Symbols' }, { title: 'A "quoted" title', license: 'CC BY 3.0', sourceUrl: 'https://example.org/a' },
      { title: 'Dog', author: 'Bo Lee', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'Openverse', sourceUrl: 'https://openverse.org/image/1' }];
    for (const credit of credits) {
      const line = builder.creditLine(credit);
      const back = reopen.creditOf(line, builder.creditLine);
      expect(back, line).toBeTruthy();
      expect(builder.creditLine(back)).toBe(line);
    }
    expect(reopen.creditOf('Picture added by the teacher.', builder.creditLine)).toEqual({ own: true });
    expect(reopen.creditOf('"Cat" by Ann, All rights reserved.', builder.creditLine)).toBeNull();
    expect(reopen.creditOf('', builder.creditLine)).toBeNull();
  });

  it('readParts reads the two blocks the way Look inside a file does, without running anything', async () => {
    const first = await build();
    const parts = verify.readParts(new TextEncoder().encode(first.html));
    expect(parts.ok).toBe(true);
    expect(parts.kind).toBe('packet');
    expect(parts.manifest).toEqual(manifestOf(first.html));
    expect(parts.lesson.lessonId).toBe(first.lesson.lessonId);
    expect(verify.verifyPacket(first.html).data.id).toBe(first.lesson.lessonId);
    // A code name keeps to letters, numbers, spaces and . _ -, and "Look inside a file" still finds nothing to look at.
    expect(builder.codeName('  Zoë <script>(1) ')).toBe('Zoë script1');
    const named = await build({ learnerLabel: 'javascript:alert(1)' });
    expect(manifestOf(named.html).learner).toBe('javascriptalert1');
    expect(verify.verifyPacket(named.html).result).toBe(verify.verifyPacket(first.html).result);
    expect(verify.verifyPacket(named.html).look).toEqual(verify.verifyPacket(first.html).look);
  });
});

describe('(b) what cannot be used here, said plainly', () => {
  const parts = {};
  parts.window = parts;
  new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
  const TH = parts.AlloWordSoundsTakeHome;
  const checks = {};
  new Function('window', read('packet_check_builder.js'))(checks);
  const PC = checks.AlloPacketChecks;
  const MP = require('../packet_math_practice_builder.js');

  it('a check names its page, and that its teacher code must be set again', () => {
    const own = PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5'), timeLimitS: 90 });
    const coded = reopen.read(PC.buildCheckPacket({ lesson: own, loader: TH, teacherCode: 'tulip-47' }).html, ENV);
    expect([coded.ok, coded.kind, coded.teacherCode, coded.page.href]).toEqual([false, 'check', true, 'packets-check.html']);
    expect(coded.why).toBe('This is a math check. Make a math check makes it. A teacher code cannot be read back from a file: set the teacher code again there.');
    const open = reopen.read(PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('2+2'), timeLimitS: null }), loader: TH }).html, ENV);
    expect(open.why).toBe('This is a math check. Make a math check makes it.');
  });

  it('math fact practice names its page', () => {
    const r = reopen.read(MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH }).html, ENV);
    expect([r.ok, r.kind, r.page.href, r.why]).toEqual([false, 'math', 'packets-math-practice.html', 'This is math fact practice. Make math fact practice makes it.']);
  });

  it('a results file, a web page, a picture and an empty file', () => {
    const csv = '﻿"format","session_id"\r\n"alloflow-packet-result/1","x"\r\n';
    expect(reopen.read(csv, ENV)).toMatchObject({ ok: false, kind: 'results', why: 'This is a results file, not a practice file. Add up results reads it.' });
    expect(reopen.read(JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 3, items: [] }), ENV).kind).toBe('results');
    const page = reopen.read('<!doctype html><html><head><title>x</title></head><body><script>var lesson=1;</script></body></html>', ENV);
    expect([page.ok, page.why]).toEqual([false, 'This is not a practice file made with this page. Choose the .html file you saved in step 3.']);
    expect(reopen.read(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]), ENV).ok).toBe(false);
    expect(reopen.read(new Uint8Array(0), ENV).why).toBe('This file is empty.');
    expect(reopen.read('x', {}).why).toBe('This page could not read the file. Load the page again.');
  });

  it('an older file: what it holds is used, and what it does not say is said', async () => {
    const first = await build({ own: OWN });
    const older = first.html.replace(/<script type="application\/json" id="packet-manifest">.*?<\/script>/, '');
    const r = reopen.read(older, ENV);
    expect(r.ok).toBe(true);
    expect(r.words).toEqual(first.manifest.words.used);
    expect(r.version).toBe('');
    expect(r.own).toEqual({});
    expect(r.notes).toEqual(['The file does not say which version it is (A, B or C), so version A is chosen.',
      'This file is from an older version, so it does not say which recordings or pictures were your own. Add them again with Edit this word.']);
    // An activity this page does not offer is named and left out.
    const fewer = reopen.read(first.html, { ...ENV, activities: ORDER.filter((id) => id !== 'mapping') });
    expect(fewer.activities).not.toContain('mapping');
    expect(fewer.notes).toContain('Sound Mapping is not offered on this page now, so it was left out.');
    // A seed this page does not have (the command-line tool can use any).
    const seven = reopen.read((await build({ seed: 7 })).html, ENV);
    expect(seven.notes).toContain('The file was made with a version this page does not have, so version A is chosen. The new file will have a different mix.');
  });
});

describe('(c) a file made for one student opens with the code name filled in', () => {
  const opened = (html, url) => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, beforeParse(w) {
    w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    w.HTMLMediaElement.prototype.pause = function () {};
  } }).window.document;
  it('from its manifest; a #learner= link wins; no code name, an empty box', async () => {
    const named = await build({ learnerLabel: 'BlueHeron7' });
    const plain = await build();
    expect(manifestOf(named.html).learner).toBe('BlueHeron7');
    expect(manifestOf(plain.html)).not.toHaveProperty('learner');
    // Only the manifest differs: the script, its hash and the policy are the same.
    expect(named.html.replace(/<script type="application\/json" id="packet-manifest">.*?<\/script>/, '')).toBe(plain.html.replace(/<script type="application\/json" id="packet-manifest">.*?<\/script>/, ''));
    expect(builder.withCodeName(plain.html, 'BlueHeron7')).toBe(named.html);
    expect(opened(named.html, 'https://packet.test/file.html').getElementById('learner-name').value).toBe('BlueHeron7');
    expect(opened(named.html, 'https://packet.test/file.html#learner=RedFox2').getElementById('learner-name').value).toBe('RedFox2');
    expect(opened(plain.html, 'https://packet.test/file.html').getElementById('learner-name').value).toBe('');
  });
});

describe('(d) the maker page opens a file it made', () => {
  const stepWords = (page) => page.$('f-own').value.split(/\s+/).filter(Boolean);
  const checked = (page) => [...page.d.querySelectorAll('#strands input:checked')].map((box) => box.value);

  it('is one quiet link at the top; the file is read on this device only', async () => {
    const page = await openMaker();
    expect(page.seen('reopen')).toBe(true);
    expect(page.$('reopen-choose').textContent).toBe('Open a file I made');
    expect(page.$('reopen-hint').textContent).toContain('It is read on this device only.');
    expect(page.$('reopen-file').getAttribute('accept')).toBe('.html,.htm,text/html');
    expect(page.seen('reopen-note')).toBe(false);
    // Nothing is asked of the site to read a file.
    const asked = page.asked.length;
    await page.open('notes.txt', 'hello');
    expect(page.$('reopen-line').textContent).toBe('This is not a practice file made with this page. Choose the .html file you saved in step 3.');
    expect(page.asked.length).toBe(asked);
    expect(page.d.activeElement).toBe(page.$('reopen-note'));
    page.$('reopen-close').click();
    expect(page.seen('reopen-note')).toBe(false);
    expect(page.d.activeElement).toBe(page.$('reopen-choose'));
  });

  it('fills in the steps, and the next file is the same file', async () => {
    const one = await openMaker();
    one.$('next-1').click();
    one.choose('version', 'B');
    one.$('next-2').click();
    one.set('f-title', 'Short vowels, version B');
    one.set('f-code-name', 'BlueHeron7');
    await new Promise((resolve) => setTimeout(resolve, 800));
    await one.ready();
    const first = one.built();
    expect(one.downloads).toEqual([]);
    one.$('save').click();
    expect(one.downloads[0].name).toBe('Short-vowels-version-B__BlueHeron7.html');

    const two = await openMaker();
    await two.open('Short-vowels-version-B__BlueHeron7.html', first);
    expect(two.$('reopen-line').textContent).toBe('Filled in from Short-vowels-version-B__BlueHeron7.html. Change what you want, then make the new file in step 3.');
    const lines = [...two.$('reopen-list').children].map((li) => li.textContent);
    const r = reopen.read(first, ENV);
    // The page's own order of activities (its steps), which is the order of the file it made.
    expect(lines[0]).toBe('3 activities: ' + checked(two).map(core.activityLabel).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.');
    expect(checked(two).slice().sort()).toEqual(r.activities.slice().sort());
    expect(lines[1]).toBe(r.words.length + ' words: ' + r.words.join(', ') + '. They are in step 2, under Type my own words, in the order of the file.');
    expect(lines[2]).toBe('Version B. Length: Regular. Pictures: off.');
    expect(lines).toContain('Title: Short vowels, version B.');
    expect(lines).toContain("Student's code name: BlueHeron7. It is in step 3. Clear it there to make a file anyone can use.");
    expect(two.seen('step-1')).toBe(true);
    two.$('next-1').click();
    expect(two.d.querySelector('input[name="mode"]:checked').value).toBe('own');
    expect(stepWords(two)).toEqual(r.words);
    expect(two.d.querySelector('input[name="version"]:checked').value).toBe('B');
    two.$('next-2').click();
    expect(two.$('f-title').value).toBe('Short vowels, version B');
    expect(two.$('f-code-name').value).toBe('BlueHeron7');
    expect(two.$('code-box').open).toBe(true);
    await two.ready();
    expect(two.built()).toBe(first);
    // A title that ends with the version follows it.
    two.$('back-3').click();
    two.choose('version', 'C');
    two.$('next-2').click();
    expect(two.$('f-title').value).toBe('Short vowels, version C');
  });

  it('brings back the teacher\'s own sounds, recording and picture, and keeps them in My words when asked', async () => {
    const one = await openMaker({ pictures: true });
    await one.store.put('zayden', { sounds: { sounds: ZAYDEN, spelling: ZAYDEN_SPELLING }, clip: { dataUri: wav(400), source: 'teacher', ms: 400 }, picture: { dataUri: png(), credit: { own: true } } });
    one.$('next-1').click();
    one.choose('mode', 'own');
    one.set('f-own', 'zayden cat dog');
    await one.until(() => /Uses your sounds and your recording/.test(one.$('own-list').textContent), 'zayden to be ready');
    one.$('next-2').click();
    await one.ready();
    const first = one.built();
    expect(manifestOf(first).own.recordings).toEqual(['zayden']);
    expect(manifestOf(first).own.pictures.map((p) => p.word)).toEqual(['zayden']);

    // Another browser: an empty store. The file brings what is needed.
    const two = await openMaker({ pictures: true });
    expect(await two.store.list()).toEqual([]);
    await two.open('zayden.html', first);
    const said = two.$('reopen-list').textContent;
    expect(said).toContain('Your own sounds, recordings or pictures for zayden came with the file and go into the new file. To use them in other files too, press Keep them in My words on this device.');
    expect(two.seen('reopen-keep')).toBe(true);
    two.$('next-1').click();
    await two.until(() => /Uses your sounds and your recording/.test(two.$('own-list').textContent), 'zayden to be ready from the file');
    two.$('next-2').click();
    await two.ready();
    expect(two.built()).toBe(first);
    // Kept only when asked, and only what the store does not have.
    expect(await two.store.list()).toEqual([]);
    two.$('reopen-keep').click();
    await two.until(() => /Kept in My words/.test(two.$('reopen-said').textContent), 'the words to be kept');
    expect(two.$('reopen-said').textContent).toBe('Kept in My words on this device: zayden.');
    const kept = await two.store.get('zayden');
    expect(kept.sounds.sounds).toEqual(ZAYDEN);
    expect(kept.clip.dataUri).toBe((await one.store.get('zayden')).clip.dataUri);
    expect(kept.picture.credit).toEqual({ own: true });
    expect(two.seen('reopen-keep')).toBe(false);
  });

  it('a check dropped on the word page says which page makes it, and changes nothing', async () => {
    const parts = {};
    parts.window = parts;
    new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
    const checks = {};
    new Function('window', read('packet_check_builder.js'))(checks);
    const PC = checks.AlloPacketChecks;
    const html = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('2+2,3+3'), timeLimitS: 60 }), loader: parts.AlloWordSoundsTakeHome, teacherCode: 'tulip-47' }).html;
    const page = await openMaker();
    const before = checked(page);
    // Dropped on the page: the same as choosing it.
    const bytes = Buffer.from(html);
    const file = { name: 'check.html', arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
    const drop = new page.w.Event('drop', { bubbles: true, cancelable: true });
    drop.dataTransfer = { types: ['Files'], files: [file] };
    page.$('step-1').dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    await page.until(() => page.seen('reopen-note'), 'the note');
    expect(page.$('reopen-line').textContent).toBe('This is a math check. Make a math check makes it. A teacher code cannot be read back from a file: set the teacher code again there.');
    expect(page.$('reopen-page').getAttribute('href')).toBe('packets-check.html');
    expect(page.$('reopen-page').textContent).toBe('Open Make a math check');
    expect(page.seen('reopen-page')).toBe(true);
    expect(checked(page)).toEqual(before);
  });

  it('new words on the page say "student", never "learner", and are American English', () => {
    const doc = new JSDOM(read('packets-make.html')).window.document;
    const mine = ['reopen', 'code-box', 'batch'].map((id) => doc.getElementById(id).textContent).join(' ');
    expect(mine).not.toMatch(/\blearners?\b/i);
    expect(read('packets_reopen.js') + read('packets_zip.js') + read('packets-make.css')).not.toMatch(/practis|licence|colour|\bmarked\b|\btick(?:ed|s)?\b|favour|behaviour|\bcentre\b|\bAI\b/);
    // Folded by default: the code name, each-student files, and their more choices.
    for (const id of ['code-box', 'batch', 'batch-more']) expect(doc.getElementById(id).hasAttribute('open'), id).toBe(false);
  });
});
