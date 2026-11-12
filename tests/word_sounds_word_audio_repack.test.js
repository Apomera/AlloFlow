import { afterAll, describe, expect, it } from 'vitest';
import * as nodeFs from 'node:fs';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

// dev-tools/repack_word_sounds_word_audio.cjs regroups the word-audio store into small files. These tests
// make small pretend stores in a temporary folder with the generator's own store code (so the format is
// the real one) and never touch word_audio_shards/.
const require = createRequire(import.meta.url);
const repackTool = require('../dev-tools/repack_word_sounds_word_audio.cjs');
const generator = require('../dev-tools/build_word_sounds_word_audio.cjs');
const wordlistTool = require('../dev-tools/build_word_sounds_wordlist.cjs');
const packetTool = require('../dev-tools/make_word_sounds_packet.cjs');

const scratch = mkdtempSync(join(tmpdir(), 'ws-word-audio-repack-'));
afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });
let folders = 0;
const GIB = 1024 ** 3;
const quiet = { retries: 0, sleep: () => {} };
// A clip of its own for every word: 900 bytes that depend on the word.
const clip = (word) => generator.URI_PREFIX + Buffer.concat([Buffer.from(word.padEnd(20, '.')), createHash('sha256').update(word).digest(), Buffer.alloc(848, word.length)]).toString('base64');
const letters = 'abcdefghijklmnopqrstuvwxyz';
// n made-up words that start with one letter, in an order that is not alphabetical.
const wordsOf = (letter, n) => Array.from({ length: n }, (_, i) => letter + letters[(i * 7) % 26] + letters[(i * 3 + Math.floor(i / 26)) % 26] + letters[Math.floor(i / 26) % 26]);
const WORDS = [...wordsOf('s', 90), ...wordsOf('b', 41), ...wordsOf('a', 40), ...wordsOf('z', 1), 'cat', 'cab'];
function newStore(words = WORDS, extra = {}) {
  const dir = join(scratch, 'store-' + (++folders));
  const store = generator.openStore(dir, { freeBytes: () => 50 * GIB });
  for (const word of words) store.add(word, clip(word), extra.otherForm && extra.otherForm.includes(word) ? 'period' : undefined);
  for (const word of extra.failed || []) store.fail(word, 'too long');
  store.flush('words for a person to review\n');
  return dir;
}
const filesOf = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);
const snapshot = (dir) => Object.fromEntries(filesOf(dir).map((name) => [name, readFileSync(join(dir, name)).toString('base64') + '@' + statSync(join(dir, name)).mtimeMs]));
const indexOf = (dir) => JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
const shardOf = (dir, file) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
const leftovers = (dir) => filesOf(scratch).filter((name) => name.startsWith(dir.split(/[\\/]/).pop() + '.'));
// Every clip of a store, read by following its index.
function clipsOf(dir) {
  const index = indexOf(dir), out = {};
  for (const [word, key] of Object.entries(index.words)) out[word] = shardOf(dir, index.shards[key].file)[word];
  return out;
}

describe('the regrouped layout', () => {
  it('uses the generator\'s format names, and regroups word_audio_shards/ unless told another folder', () => {
    expect(repackTool.SHARD_FORMAT).toBe(generator.SHARD_FORMAT);
    expect(repackTool.INDEX_FORMAT).toBe(generator.INDEX_FORMAT);
    expect(repackTool.URI_PREFIX).toBe(generator.URI_PREFIX);
    expect(repackTool.DEFAULT_STORE).toBe(generator.DEFAULT_OUT);
    expect(repackTool.DEFAULT_MAX).toBe(40);
    expect(repackTool.parseArgs([])).toEqual({ store: generator.DEFAULT_OUT, max: 40, check: false, perLetter: false, keepOld: false, help: false });
    expect(repackTool.parseArgs(['--store', scratch, '--max', '25', '--check', '--keep-old'])).toMatchObject({ store: scratch, max: 25, check: true, keepOld: true });
    for (const bad of [['--max'], ['--max', '0'], ['--max', 'many'], ['--max', '1001'], ['--fast'], ['--per-letter', '--max', '10'], ['shards']]) expect(() => repackTool.parseArgs(bad), bad.join(' ')).toThrow();
  });

  it('files of at most 40 words, alphabetical within a first letter, named like s-03.json, with the index rewritten in the same format', () => {
    const dir = newStore(WORDS, { failed: ['zzz'], otherForm: ['cat'] });
    const before = indexOf(dir), clipsBefore = clipsOf(dir);
    expect(Object.keys(before.shards)).toEqual(['a', 'b', 'c', 's', 'z']);
    const result = repackTool.repack(dir, { now: () => new Date('2026-11-12T08:00:00Z'), ...quiet });
    expect(result.changed).toBe(true);
    expect(result.facts).toMatchObject({ words: WORDS.length, files: 8, layout: 'small files (40 words at most)' });
    expect(filesOf(dir)).toEqual(['a-01.json', 'b-01.json', 'b-02.json', 'c-01.json', 'index.json', 'review.txt', 's-01.json', 's-02.json', 's-03.json', 'z-01.json']);
    expect(leftovers(dir)).toEqual([]);
    const index = indexOf(dir);
    // The same fields in the same order as the generator's index, and the things a later run reads are kept.
    expect(Object.keys(index)).toEqual(Object.keys(before));
    for (const key of ['format', 'started', 'engine', 'voice', 'speed', 'language', 'source', 'post', 'textForm', 'humanReviewed', 'failed', 'otherTextForm']) expect(index[key], key).toEqual(before[key]);
    expect(index.failed).toEqual({ zzz: 'too long' });
    expect(index.otherTextForm).toEqual({ cat: 'period' });
    expect(index.updated).toBe('2026-11-12T08:00:00.000Z');
    expect(index.note).toMatch(/^Machine-made word clips for Word Sounds, in files of at most 40 words: .*To use a word: read shards\[words\[word\]\]\.file/);
    expect(Object.keys(index.words)).toEqual([...WORDS].sort());
    expect(index.counts).toEqual({ words: WORDS.length, shards: 8, bytes: Object.values(index.shards).reduce((sum, shard) => sum + shard.bytes, 0), failed: 1 });
    // Each file: its own key, at most 40 words, in alphabetical order, and the size the index states.
    let seen = [];
    for (const [key, shard] of Object.entries(index.shards)) {
      expect(shard.file).toBe(key + '.json');
      expect(key).toMatch(/^[a-z]-\d\d$/);
      const data = shardOf(dir, shard.file);
      const words = Object.keys(data).filter((word) => word !== '_meta');
      expect(data._meta).toMatchObject({ format: generator.SHARD_FORMAT, shard: key, words: words.length, voice: before.voice, engine: before.engine, textForm: before.textForm, humanReviewed: false });
      expect(words.length).toBeLessThanOrEqual(40);
      expect(words.length).toBe(shard.words);
      expect(words).toEqual([...words].sort());
      expect(words.every((word) => word[0] === key[0] && index.words[word] === key)).toBe(true);
      expect(statSync(join(dir, shard.file)).size).toBe(shard.bytes);
      seen = seen.concat(words);
    }
    // Every word once, across files in alphabetical order too, and every clip the bytes it had.
    expect(seen).toEqual([...WORDS].sort());
    expect(clipsOf(dir)).toEqual(clipsBefore);
    // 90 words become three even files, 41 become two: no file with one stray word.
    expect(['s-01', 's-02', 's-03', 'b-01', 'b-02'].map((key) => index.shards[key].words)).toEqual([30, 30, 30, 20, 21]);
    expect(readFileSync(join(dir, 'review.txt'), 'utf8')).toBe('words for a person to review\n');
    expect(repackTool.checkStore(dir)).toMatchObject({ ok: true, problems: [], lock: '' });
  });

  it('--max sets the size, and a letter with over 99 files gets three digits', () => {
    const dir = newStore();
    repackTool.repack(dir, { max: 7, ...quiet });
    const index = indexOf(dir);
    expect(Math.max(...Object.values(index.shards).map((shard) => shard.words))).toBe(7);
    expect(Object.keys(index.shards).filter((key) => key[0] === 's')).toHaveLength(13);
    const plan = repackTool.planLayout(wordsOf('q', 26 * 26).filter((word, i, all) => all.indexOf(word) === i), { max: 2 });
    expect(plan.length).toBeGreaterThan(99);
    expect(plan[0].file).toBe('q-001.json');
    expect(plan.every((part) => part.words.length <= 2 && part.words.length >= 1)).toBe(true);
    expect(repackTool.planLayout(['bad', '9lives', 'be'], { max: 40 }).map((part) => [part.key, part.words])).toEqual([['_-01', ['9lives']], ['b-01', ['bad', 'be']]]);
  });

  it('a second run changes nothing: not a byte, not a file date', () => {
    const dir = newStore();
    expect(repackTool.repack(dir, quiet).changed).toBe(true);
    const first = snapshot(dir);
    const again = repackTool.repack(dir, { now: () => new Date('2030-01-01T00:00:00Z'), ...quiet });
    expect(again).toMatchObject({ changed: false, note: 'Nothing to do: the store already has this layout.' });
    expect(snapshot(dir)).toEqual(first);
    expect(leftovers(dir)).toEqual([]);
    // Asked for another size, it regroups again; back at 40 it gives the same files as the first time.
    repackTool.repack(dir, { max: 10, ...quiet });
    repackTool.repack(dir, quiet);
    expect(filesOf(dir)).toEqual(Object.keys(first));
    expect(clipsOf(dir)).toEqual(Object.fromEntries(WORDS.map((word) => [word, clip(word)])));
    const lines = [];
    expect(repackTool.main(['--store', dir], (line) => lines.push(line))).toBe(0);
    expect(lines.join('\n')).toMatch(/Nothing to do: the store already has this layout\. \d+ words in 8 files/);
  });
});

describe('what it refuses', () => {
  it('to run while .run.lock is in the folder; --check still reads, and says a run may be going', () => {
    const dir = newStore();
    writeFileSync(join(dir, '.run.lock'), '999999');
    const before = snapshot(dir);
    expect(() => repackTool.repack(dir, quiet)).toThrow(repackTool.RefusedError);
    expect(() => repackTool.repack(dir, { perLetter: true, ...quiet })).toThrow(/\.run\.lock names process 999999, which is not running\).*Nothing was changed\./);
    const lines = [];
    expect(repackTool.main(['--store', dir], (line) => lines.push(line))).toBe(2);
    expect(snapshot(dir)).toEqual(before);
    expect(leftovers(dir)).toEqual([]);
    lines.length = 0;
    expect(repackTool.main(['--store', dir, '--check'], (line) => lines.push(line))).toBe(0);
    expect(lines.join('\n')).toMatch(/a run may be writing this store \(\.run\.lock names process 999999/);
    expect(lines.join('\n')).toMatch(/OK: \d+ words in 5 files, .* one file per first letter/);
    expect(snapshot(dir)).toEqual(before);
    // A lock held by a process that is alive says so (this test's own process).
    writeFileSync(join(dir, '.run.lock'), String(process.pid));
    expect(repackTool.checkStore(dir).lock).toBe('.run.lock names process ' + process.pid + ', which is running');
  });

  it('a store that does not agree with its index: --check names each problem and writes nothing', () => {
    const cases = [
      ['a word missing from its file', (dir) => { const data = shardOf(dir, 'c.json'); delete data.cat; writeFileSync(join(dir, 'c.json'), JSON.stringify(data)); }, /"cat" is listed in c\.json, and is not there\./],
      ['a word in two files', (dir) => { const data = shardOf(dir, 'z.json'); data.cat = clip('cat'); writeFileSync(join(dir, 'z.json'), JSON.stringify(data)); }, /"cat" is in two files: c\.json and z\.json\./],
      ['a word the index does not list', (dir) => { const data = shardOf(dir, 'c.json'); data.cot = clip('cot'); writeFileSync(join(dir, 'c.json'), JSON.stringify(data)); }, /"cot" is in c\.json, and the index does not list it\./],
      ['a clip cut short', (dir) => { const data = shardOf(dir, 'c.json'); data.cat = data.cat.slice(0, 200); writeFileSync(join(dir, 'c.json'), JSON.stringify(data)); }, /"cat" in c\.json is too short to be a clip\./],
      ['a clip that is not whole base64', (dir) => { const data = shardOf(dir, 'c.json'); data.cat = data.cat.slice(0, -3); writeFileSync(join(dir, 'c.json'), JSON.stringify(data)); }, /"cat" in c\.json is not whole base64\./],
      ['a missing file', (dir) => { rmSync(join(dir, 'z.json')); }, /The index names z\.json, and that file is missing\./],
      ['a file cut short', (dir) => { writeFileSync(join(dir, 'b.json'), readFileSync(join(dir, 'b.json'), 'utf8').slice(0, 5000)); }, /b\.json is not readable JSON/],
      ['a file the index does not name', (dir) => { writeFileSync(join(dir, 'q.json'), JSON.stringify({ _meta: { format: generator.SHARD_FORMAT } })); }, /q\.json is in the folder, and the index does not name it\./],
      ['a wrong count', (dir) => { const index = indexOf(dir); index.counts.words += 1; writeFileSync(join(dir, 'index.json'), JSON.stringify(index)); }, /counts\.words is \d+; the index lists \d+ words\./],
      ['a file name that leaves the folder', (dir) => { const index = indexOf(dir); index.shards.z.file = '../z.json'; writeFileSync(join(dir, 'index.json'), JSON.stringify(index)); }, /Shard "z" has no usable file name in the index/],
      ['no index', (dir) => { rmSync(join(dir, 'index.json')); }, /The store has no index\.json\./],
      ['an index of another kind', (dir) => { writeFileSync(join(dir, 'index.json'), JSON.stringify({ words: { cat: 'c' } })); }, /index\.json is not a alloflow-word-audio-index\/1 file\./],
    ];
    for (const [name, damage, expected] of cases) {
      const dir = newStore();
      damage(dir);
      const before = snapshot(dir);
      const check = repackTool.checkStore(dir);
      expect(check.ok, name).toBe(false);
      expect(check.problems.join('\n'), name).toMatch(expected);
      const lines = [];
      expect(repackTool.main(['--store', dir, '--check'], (line) => lines.push(line)), name).toBe(1);
      expect(lines.join('\n'), name).toMatch(/NOT OK: \d+ problems?\./);
      // And it will not regroup such a store.
      expect(() => repackTool.repack(dir, quiet), name).toThrow(/does not agree with its index, so it was not touched/);
      expect(snapshot(dir), name).toEqual(before);
      expect(leftovers(dir), name).toEqual([]);
    }
    expect(repackTool.checkStore(join(scratch, 'no-such-folder')).problems).toEqual([expect.stringMatching(/^There is no store folder at /)]);
  });

  it('to swap when the new layout does not read back whole: a write that came out short leaves the store as it was', () => {
    const dir = newStore();
    const before = snapshot(dir);
    // A full disk cuts a file short without an error: the copy read back from the disk is what is compared.
    const shortWrite = { ...nodeFs, writeFileSync: (file, data) => nodeFs.writeFileSync(file, /s-02\.json$/.test(String(file)) ? String(data).slice(0, 4000) : data) };
    expect(() => repackTool.repack(dir, { fs: shortWrite, ...quiet })).toThrow(/did not pass its checks, so the store was not touched/);
    expect(snapshot(dir)).toEqual(before);
    expect(leftovers(dir)).toEqual([]);
    // One clip with a changed byte, in a file that is still good JSON: the sha256 comparison sees it.
    const flipped = { ...nodeFs, writeFileSync: (file, data) => nodeFs.writeFileSync(file, /b-01\.json$/.test(String(file)) ? String(data).replace(/([A-Za-z0-9+/]{8})(",")/, (m, a, b) => (a[0] === 'A' ? 'B' : 'A') + a.slice(1) + b) : data) };
    expect(() => repackTool.repack(dir, { fs: flipped, ...quiet })).toThrow(/The clip of "\w+" changed\./);
    expect(snapshot(dir)).toEqual(before);
    expect(leftovers(dir)).toEqual([]);
    expect(() => repackTool.repack(dir, { freeBytes: () => 1e6, ...quiet })).toThrow(/Not enough free disk space/);
    expect(snapshot(dir)).toEqual(before);
  });

  it('a folder that Windows will not let go: the store is put back as it was, and a run killed between the two moves is mended by the next', () => {
    const dir = newStore();
    const before = snapshot(dir);
    const held = (which) => ({ ...nodeFs, renameSync: (from, to) => {
      if (which(String(from), String(to))) { const error = new Error('EPERM: operation not permitted, rename'); error.code = 'EPERM'; throw error; }
      return nodeFs.renameSync(from, to);
    } });
    expect(() => repackTool.repack(dir, { fs: held((from) => from === dir), ...quiet })).toThrow(/Could not move the store aside \(EPERM\).*Nothing was changed\./);
    expect(snapshot(dir)).toEqual(before);
    expect(leftovers(dir)).toEqual([]);
    expect(() => repackTool.repack(dir, { fs: held((from) => /\.repack-new$/.test(from)), ...quiet })).toThrow(/Could not move the new layout into place \(EPERM\)\. The store was put back as it was\./);
    expect(snapshot(dir)).toEqual(before);
    expect(leftovers(dir)).toEqual([]);
    // It waits and tries again before giving up: two refusals, then the folder is free.
    let refusals = 0;
    const waits = [];
    const result = repackTool.repack(dir, { fs: held((from) => from === dir && refusals++ < 2), retries: 8, sleep: (ms) => waits.push(ms) });
    expect(result.changed).toBe(true);
    expect(waits).toEqual([100, 200]);
    // Killed after the first move: the store is under its other name. The next run puts it back and carries on.
    const killed = newStore();
    const clips = clipsOf(killed);
    nodeFs.renameSync(killed, killed + '.repack-old');
    expect(existsSync(killed)).toBe(false);
    expect(repackTool.repack(killed, quiet).changed).toBe(true);
    expect(clipsOf(killed)).toEqual(clips);
    expect(leftovers(killed)).toEqual([]);
    // --keep-old keeps the folder as it was; a later run that has nothing to do says it can go, and one that has work will not write over it.
    const kept = newStore();
    const keptBefore = snapshot(kept);
    expect(repackTool.repack(kept, { keepOld: true, ...quiet }).note).toMatch(/The old layout is kept in .*\.repack-old\./);
    expect(Object.keys(snapshot(kept + '.repack-old'))).toEqual(Object.keys(keptBefore));
    expect(repackTool.repack(kept, quiet)).toMatchObject({ changed: false, note: expect.stringMatching(/is left from an earlier run and can be deleted\.$/) });
    expect(() => repackTool.repack(kept, { max: 5, ...quiet })).toThrow(/\.repack-old is in the way/);
  });
});

describe('the generator and a regrouped store', () => {
  it('the generator refuses a regrouped store (it would see no words and voice them all again) and says to run --per-letter first', () => {
    const dir = newStore();
    repackTool.repack(dir, quiet);
    const before = snapshot(dir);
    expect(() => generator.openStore(dir, { freeBytes: () => 50 * GIB })).toThrow(/regrouped into small files \(a-01\.json, b-01\.json, b-02\.json, \.\.\.\).*repack_word_sounds_word_audio\.cjs --per-letter --store /);
    expect(snapshot(dir)).toEqual(before);
    // Back in one file per first letter, it opens again.
    repackTool.repack(dir, { perLetter: true, ...quiet });
    expect(generator.openStore(dir, { freeBytes: () => 50 * GIB }).count()).toBe(WORDS.length);
  });

  it('--per-letter gives back the layout the generator reads: it resumes, adds words, and the store regroups again', () => {
    const dir = newStore(WORDS, { failed: ['zzz'], otherForm: ['cat'] });
    const clips = clipsOf(dir);
    repackTool.repack(dir, quiet);
    const back = repackTool.repack(dir, { perLetter: true, ...quiet });
    expect(back.facts).toMatchObject({ words: WORDS.length, files: 5, layout: 'one file per first letter' });
    expect(filesOf(dir)).toEqual(['a.json', 'b.json', 'c.json', 'index.json', 'review.txt', 's.json', 'z.json']);
    expect(indexOf(dir).note).toMatch(/^Machine-made word clips for Word Sounds, one file per first letter\. Only the words of THIS store/);
    expect(clipsOf(dir)).toEqual(clips);
    // The generator opens it and knows every word, and what failed or was voiced from the other text form.
    const resumed = generator.openStore(dir, { freeBytes: () => 50 * GIB });
    expect(resumed.count()).toBe(WORDS.length);
    expect(WORDS.every((word) => resumed.has(word) && resumed.get(word) === clip(word))).toBe(true);
    expect(resumed.failedReason('zzz')).toBe('too long');
    expect(resumed.otherForms()).toEqual({ cat: 'period' });
    const work = { entries: [...WORDS, 'sun', 'cup'].map((word) => ({ word, stage: 'K early' })), groups: ['K early'] };
    expect(generator.selectWork(work, { resume: true }, resumed).todo.map((entry) => entry.word)).toEqual(['sun', 'cup']);
    resumed.add('sun', clip('sun')); resumed.add('cup', clip('cup'));
    expect(resumed.flush()).toEqual(['c.json', 's.json', 'index.json']);
    expect(repackTool.checkStore(dir).ok).toBe(true);
    // Regrouped again: the new words are in, in their alphabetical place.
    expect(repackTool.repack(dir, quiet).facts.words).toBe(WORDS.length + 2);
    const index = indexOf(dir);
    expect(index.words.sun).toMatch(/^s-0[123]$/);
    expect(shardOf(dir, index.shards[index.words.sun].file).sun).toBe(clip('sun'));
    expect(index.failed).toEqual({ zzz: 'too long' });
    expect(clipsOf(dir)).toEqual({ ...clips, sun: clip('sun'), cup: clip('cup') });
  });

  it('an index that names both kinds of file is read by following it, and regroups into one layout', () => {
    // What a patched generator would leave after adding words to a regrouped store: s-01.json ... beside a new s.json.
    const dir = newStore();
    repackTool.repack(dir, quiet);
    const index = indexOf(dir);
    const extra = { _meta: { ...shardOf(dir, 's-01.json')._meta, shard: 's', words: 2 }, sun: clip('sun'), sat: clip('sat') };
    writeFileSync(join(dir, 's.json'), JSON.stringify(extra));
    index.shards.s = { file: 's.json', words: 2, bytes: statSync(join(dir, 's.json')).size };
    index.words.sun = 's'; index.words.sat = 's';
    index.counts = { ...index.counts, words: index.counts.words + 2, shards: index.counts.shards + 1, bytes: index.counts.bytes + index.shards.s.bytes };
    writeFileSync(join(dir, 'index.json'), JSON.stringify(index));
    expect(repackTool.checkStore(dir)).toMatchObject({ ok: true, facts: { layout: 'mixed', words: WORDS.length + 2 } });
    const result = repackTool.repack(dir, quiet);
    expect(result.facts).toMatchObject({ words: WORDS.length + 2, layout: 'small files (40 words at most)' });
    expect(filesOf(dir)).not.toContain('s.json');
    expect(clipsOf(dir)).toMatchObject({ sun: clip('sun'), sat: clip('sat'), cat: clip('cat') });
  });
});

describe('the readers follow the index, whichever layout it has', () => {
  it('the word list flags the same words, and carries the size of the largest file', () => {
    const dir = newStore();
    const perLetter = wordlistTool.readShardStore(join(dir, 'index.json'));
    expect([...perLetter.words].sort()).toEqual([...WORDS].sort());
    expect(perLetter.summary).toEqual({ files: 5, bytes: indexOf(dir).counts.bytes, largestFileBytes: indexOf(dir).shards.s.bytes, mostWordsInAFile: 90 });
    repackTool.repack(dir, quiet);
    const small = wordlistTool.readShardStore(join(dir, 'index.json'));
    expect([...small.words].sort()).toEqual([...WORDS].sort());
    expect(small.summary).toEqual({ files: 8, bytes: indexOf(dir).counts.bytes, largestFileBytes: Math.max(...Object.values(indexOf(dir).shards).map((shard) => shard.bytes)), mostWordsInAFile: 40 });
    expect([...wordlistTool.readShardWords(join(dir, 'index.json'))].sort()).toEqual([...WORDS].sort());
    expect(wordlistTool.readShardStore(join(dir, 'no-such-index.json'))).toEqual({ words: new Set(), summary: null });
  });

  it('the command line maker reads every clip of the store from disk, in both layouts, and says so when a file is missing', () => {
    const dir = newStore();
    const expected = Object.fromEntries(WORDS.map((word) => [word, clip(word)]));
    expect(packetTool.loadShardClips(dir)).toEqual(expected);
    repackTool.repack(dir, quiet);
    expect(packetTool.loadShardClips(dir)).toEqual(expected);
    expect(packetTool.loadShardClips(join(scratch, 'no-such-store'))).toEqual({});
    rmSync(join(dir, 's-02.json'));
    expect(() => packetTool.loadShardClips(dir)).toThrow(/s-02\.json/);
  });
});
