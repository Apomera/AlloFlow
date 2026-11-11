import { afterAll, describe, expect, it } from 'vitest';
import * as nodeFs from 'node:fs';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// dev-tools/build_word_sounds_word_audio.cjs voices the practice words that have no recording into
// word_audio_shards/. These tests cover everything but the voice itself: the work list, the store on
// disk, the automatic checks (on made-up sound), the run loop (with a pretend engine) and the word
// list's clip flag. No test starts a browser or the speech model.
const require = createRequire(import.meta.url);
const tool = require('../dev-tools/build_word_sounds_word_audio.cjs');
const wordlistTool = require('../dev-tools/build_word_sounds_wordlist.cjs');

const parts = tool.loadParts();
const { wordlist, core, dictionary, builder } = parts;
const work = tool.buildWorkList(parts);
const context = { wordlist, core, dictionary, seed: 1 };
const everything = { count: 1e9, requireClip: false };
const pool = builder.pickWords(everything, context).words;
const stageSets = builder.STAGES.map((id) => new Set(builder.pickWords({ ...everything, stage: id }, context).words));
const bankWords = new Set([...Object.keys(JSON.parse(readFileSync('audio_bank/words.json', 'utf8'))),
  ...Object.keys(JSON.parse(readFileSync('word_audio_kokoro_bank.json', 'utf8')).words)].map((word) => word.trim().toLowerCase()));

const scratch = mkdtempSync(join(tmpdir(), 'ws-word-audio-test-'));
afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });
let folders = 0;
const newDir = () => join(scratch, 'store-' + (++folders));
const GIB = 1024 ** 3;

// ---------------------------------------------------------------------------
// Made-up sound: what the loader hands back is a 24 kHz 16-bit mono WAV with a 44-byte header.
// ---------------------------------------------------------------------------
const RATE = 24000;
function wavOf(samples) {
  const n = samples.length, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0, 'ascii'); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8, 'ascii');
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(RATE, 24); wav.writeUInt32LE(RATE * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36, 'ascii'); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); wav.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7FFF), 44 + i * 2); }
  return wav;
}
// Something word-like: quiet, a voiced stretch with soft edges and one louder beat, quiet.
function spoken({ lead = 0.35, body = 0.5, tail = 0.4, level = 0.13, beat = 0.5, edges = true, square = false } = {}) {
  const out = new Float32Array(Math.round((lead + body + tail) * RATE));
  const from = Math.round(lead * RATE), count = Math.round(body * RATE), ramp = Math.round(0.02 * RATE);
  for (let i = 0; i < count; i++) {
    let gain = Math.abs(i - count / 2) < 0.01 * RATE ? beat : level;
    if (edges) gain *= Math.min(1, i / ramp, (count - 1 - i) / ramp);
    const wave = Math.sin(2 * Math.PI * 220 * i / RATE);
    out[from + i] = gain * (square ? Math.sign(wave) || 1 : wave);
  }
  return wavOf(out);
}
const clip = (seed = 1) => tool.URI_PREFIX + Buffer.alloc(900, seed).toString('base64');
const filesOf = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);
const snapshot = (dir) => Object.fromEntries(filesOf(dir).map((name) => [name, readFileSync(join(dir, name)).toString('base64')]));
const noEmptyFiles = (dir) => filesOf(dir).every((name) => statSync(join(dir, name)).size > 0);

describe('(a) the work list', () => {
  it('holds the pool words without a clip, earliest stage first, then most common in children\'s books first', () => {
    expect(work.groups).toEqual([...builder.STAGES, 'no stage', 'choices']);
    expect(work.entries.length).toBeGreaterThan(4000);
    for (let i = 1; i < work.entries.length; i++) {
      const before = work.entries[i - 1], here = work.entries[i];
      expect(here.stageIndex, here.word).toBeGreaterThanOrEqual(before.stageIndex);
      if (here.stageIndex === before.stageIndex) expect(here.zipf, here.word).toBeLessThanOrEqual(before.zipf);
    }
    // The stage of a word is the first stage whose picker pool holds it: the builder's own rule.
    for (const entry of work.entries.filter((e) => e.list === 'pool')) {
      const first = stageSets.findIndex((set) => set.has(entry.word));
      expect(entry.stage, entry.word).toBe(first < 0 ? 'no stage' : builder.STAGES[first]);
    }
    expect(work.entries[0].stage).toBe('K early');
    expect(new Set(work.entries.map((e) => e.word)).size).toBe(work.entries.length);
  });

  it('has no word with a clip, no blocked word, no word held for review, and only plain words', () => {
    const culled = tool.readCull();
    for (const entry of work.entries) {
      const row = wordlist.get(entry.word);
      expect(row, entry.word).toMatchObject({ recorded: false, kokoro: false, blocked: false, nearBlocked: false });
      expect(bankWords.has(entry.word), entry.word).toBe(false);
      expect(entry.word).toMatch(/^[a-z]{2,10}$/);
      expect(core.dictionarySounds(entry.word).alternates, entry.word).toEqual([]);
      expect(culled[entry.word], entry.word).toBeUndefined();
      expect(entry.sounds).toBe(row.sounds);
    }
    expect(work.entries.filter((e) => e.list === 'pool' && wordlist.get(e.word).british)).toEqual([]);
  });

  it('counts add up, per stage and in all', () => {
    const c = work.counts;
    expect(c.pool).toBe(pool.length);
    expect(c.poolWithClip + c.poolNoClip).toBe(c.pool);
    expect(c.poolWithClip).toBe(pool.filter((word) => bankWords.has(word)).length);
    expect(c.toVoice).toBe(work.entries.length);
    expect(c.held).toBe(work.held.length);
    let noClip = 0;
    for (const id of work.groups) {
      const g = c.perGroup[id];
      expect(g.toVoice + g.held, id).toBe(g.noClip);
      expect(g.toVoice, id).toBe(work.entries.filter((e) => e.stage === id).length);
      noClip += g.noClip;
    }
    expect(noClip - c.perGroup.choices.noClip).toBe(c.poolNoClip);
    expect(Object.values(c.heldByReason).reduce((a, b) => a + b, 0)).toBe(c.held);
    const text = tool.planText(work, tool.selectWork(work, {}, null));
    expect(text).toContain('Default pool: ' + c.pool + ' words; ' + c.poolWithClip + ' have a recording, ' + c.poolNoClip + ' do not.');
    for (const id of builder.STAGES) expect(text).toMatch(new RegExp('\\n  ' + id.replace('+', '\\+') + ' +' + c.perGroup[id].noClip + ' +' + c.perGroup[id].toVoice + ' +' + c.perGroup[id].held + '\\n'));
    expect(text).toContain('This run: ' + c.toVoice + ' words in scope; 0 already in the store');
  });

  it('holds back, with a reason, words the voice may say another way, culled words, blocked words and non-words', () => {
    const held = new Map(work.held.map((item) => [item.word, item]));
    const voiced = new Set(work.entries.map((e) => e.word));
    for (const item of work.held) { expect(tool.REASONS[item.reason], item.word).toBeTruthy(); expect(voiced.has(item.word), item.word).toBe(false); }
    for (const word of ['tear', 'dove', 'record', 'separate']) {
      expect(held.get(word), word).toMatchObject({ reason: 'pronunciations', list: 'pool' });
      expect(held.get(word).detail.split(' | ').length).toBeGreaterThan(1);
    }
    expect(held.get('tear').detail).toBe(dictionary.lookup('tear').map((sounds) => Array.from(sounds).join(' ')).join(' | '));
    // Every pool word without a clip whose dictionary entry has a second, different pronunciation is held.
    const twoWays = pool.filter((word) => !bankWords.has(word) && new Set(dictionary.lookup(word).map((s) => Array.from(s).join(' '))).size > 1);
    expect(twoWays.length).toBeGreaterThan(300);
    expect(twoWays.filter((word) => !held.has(word))).toEqual([]);
    expect(held.get('vat')).toMatchObject({ reason: 'culled', detail: 'rare', stage: 'K early' });
    expect(held.get('i')).toMatchObject({ reason: 'not-a-word', list: 'choices' });
    expect(held.get('gun')).toMatchObject({ reason: 'blocked', list: 'choices' });
    expect(work.entries.filter((e) => wordlist.isBlocked(e.word))).toEqual([]);
  });

  it('the second list is the answer-choice pool without a clip that the first list does not cover', () => {
    const known = wordlist.rows().filter((row) => row.known).map((row) => row.word);
    const choices = Array.from(builder._internals.createPackLogic({ core, knownWords: known, seed: 1 }).k2KnownWords());
    const inPool = new Set(pool);
    const expected = choices.filter((word) => !inPool.has(word) && !bankWords.has(word)).sort();
    const got = [...work.entries, ...work.held].filter((item) => item.list === 'choices').map((item) => item.word).sort();
    expect(got).toEqual(expected);
    expect(work.counts.choicePool).toBe(choices.length);
    // Every answer-choice word without a clip is somewhere: to voice, or held with a reason.
    const all = new Set([...work.entries, ...work.held].map((item) => item.word));
    expect(choices.filter((word) => !bankWords.has(word) && !all.has(word))).toEqual([]);
  });

  it('a word that gains a clip leaves the list, and a culled word moves to the review list', () => {
    const [first, second] = work.entries;
    const again = tool.buildWorkList({ ...parts, hasClip: (word) => word === first.word || parts.hasClip(word), culled: { ...parts.culled, [second.word]: 'test' } });
    expect(again.entries.map((e) => e.word)).not.toContain(first.word);
    expect(again.held.map((e) => e.word)).not.toContain(first.word);
    expect(again.held.find((item) => item.word === second.word)).toMatchObject({ reason: 'culled', detail: 'test' });
    expect(again.counts.toVoice).toBe(work.counts.toVoice - 2);
    expect(again.counts.poolWithClip).toBe(work.counts.poolWithClip + 1);
  }, 60000);

  it('--stage, --limit and the store narrow a run; an unknown stage is refused', () => {
    const g1 = tool.selectWork(work, { stage: 'g1  EARLY' }, null);
    expect(g1.total).toBe(work.counts.perGroup['G1 early'].toVoice);
    expect(g1.todo.every((e) => e.stage === 'G1 early')).toBe(true);
    expect(tool.selectWork(work, { limit: 20 }, null).todo.map((e) => e.word)).toEqual(work.entries.slice(0, 20).map((e) => e.word));
    const done = new Set(work.entries.slice(0, 5).map((e) => e.word)), failed = work.entries[5].word;
    const store = { has: (word) => done.has(word), failedReason: (word) => (word === failed ? 'too long' : '') };
    const resumed = tool.selectWork(work, { limit: 3 }, store);
    expect(resumed).toMatchObject({ total: work.entries.length, stored: 5, failedBefore: 1, left: work.entries.length - 6 });
    expect(resumed.todo.map((e) => e.word)).toEqual(work.entries.slice(6, 9).map((e) => e.word));
    expect(tool.selectWork(work, { limit: 1, retryFailed: true }, store).todo[0].word).toBe(failed);
    expect(() => tool.selectWork(work, { stage: 'G9' }, null)).toThrow(/Unknown --stage "G9"/);
  });

  it('--only-list voices the named words only, and lifts a review hold only when asked', () => {
    const [a, b] = work.entries;
    const inPool = new Set(pool), culled = tool.readCull();
    const outsider = wordlist.rows().find((row) => !inPool.has(row.word) && !bankWords.has(row.word) && !row.blocked && !row.nearBlocked && /^[a-z]{4,8}$/.test(row.word) && /[aeiou]/.test(row.word) &&
      core.dictionarySounds(row.word).alternates.length === 0 && !culled[row.word]).word;
    const listed = [b.word, 'tear', 'cat', 'gun', 'zzzza', 'brrr', outsider, a.word, 'vat'];
    const plain = tool.applyOnlyList(work, parts, listed, false);
    expect(plain.entries.map((e) => e.word)).toEqual([a.word, b.word, outsider]);
    expect(plain.entries[2]).toMatchObject({ list: 'listed', stage: 'listed' });
    expect(Object.fromEntries(plain.held.map((item) => [item.word, item.reason]))).toEqual({ tear: 'pronunciations', vat: 'culled', gun: 'blocked', zzzza: 'not-in-dictionary', brrr: 'not-a-word' });
    expect(plain.skipped.hasClip).toEqual(['cat']);
    const lifted = tool.applyOnlyList(work, parts, listed, true);
    expect(lifted.entries.map((e) => e.word).sort()).toEqual([a.word, b.word, outsider, 'tear', 'vat'].sort());
    expect(lifted.entries.find((e) => e.word === 'tear').lifted).toBe('pronunciations');
    expect(lifted.held.map((item) => item.word).sort()).toEqual(['brrr', 'gun', 'zzzza']);
    const file = join(scratch, 'list.txt');
    writeFileSync(file, String.fromCharCode(65279) + 'Bad, mom\n\n  SAD\tbad\r\n');
    expect(tool.readWordFile(file)).toEqual(['bad', 'mom', 'sad']);
  });

  it('reads its options and refuses the ones that do not fit together', () => {
    expect(tool.parseArgs([])).toMatchObject({ plan: false, dry: false, resume: false, limit: 0, lanes: 1, recycle: 500, form: 'bare', out: tool.DEFAULT_OUT, work: tool.DEFAULT_WORK });
    expect(tool.parseArgs(['--resume', '--limit', '25', '--stage', 'G2', '--out', scratch, '--lanes', '2'])).toMatchObject({ resume: true, limit: 25, stage: 'G2', out: scratch, lanes: 2 });
    expect(() => tool.parseArgs(['--limit'])).toThrow(/Missing value/);
    expect(() => tool.parseArgs(['--limit', 'ten'])).toThrow(/whole number/);
    expect(() => tool.parseArgs(['--include-review'])).toThrow(/needs --only-list/);
    expect(() => tool.parseArgs(['--retry-failed'])).toThrow(/needs --resume/);
    expect(() => tool.parseArgs(['--form', 'shout'])).toThrow(/--form/);
    expect(() => tool.parseArgs(['--lanes', '9'])).toThrow(/1 to 4/);
    expect(() => tool.parseArgs(['--frobnicate'])).toThrow(/Unknown option/);
  });
});

describe('(b) the store on disk', () => {
  it('writes one file per first letter, an index of its own words, and leaves no temporary file', () => {
    const dir = newDir();
    const store = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    expect(existsSync(dir)).toBe(false);
    store.add('bad', clip(1)); store.add('bed', clip(2)); store.add('mom', clip(3));
    expect(store.flush('review text\n')).toEqual(['b.json', 'm.json', 'index.json', 'review.txt']);
    expect(filesOf(dir)).toEqual(['b.json', 'index.json', 'm.json', 'review.txt']);
    const b = JSON.parse(readFileSync(join(dir, 'b.json'), 'utf8'));
    expect(Object.keys(b)).toEqual(['_meta', 'bad', 'bed']);
    expect(b._meta).toMatchObject({ format: 'alloflow-word-audio-shard/1', shard: 'b', words: 2, voice: 'af_heart', speed: 1, textForm: 'bare', humanReviewed: false,
      engine: 'kokoro-js@1.2.1 / onnx-community/Kokoro-82M-v1.0-ONNX (q8, wasm)' });
    expect(b.bad).toBe(clip(1));
    expect(b.bad.startsWith('data:audio/webm;base64,')).toBe(true);
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    expect(index).toMatchObject({ format: 'alloflow-word-audio-index/1', voice: 'af_heart', speed: 1, language: 'en-US', humanReviewed: false, textForm: 'bare',
      words: { bad: 'b', bed: 'b', mom: 'm' }, counts: { words: 3, shards: 2, failed: 0 }, failed: {}, otherTextForm: {} });
    expect(index.engine).toBe(tool.ENGINE.engine);
    expect(index.post).toBe(tool.ENGINE.post);
    expect(index.shards).toEqual({ b: { file: 'b.json', words: 2, bytes: statSync(join(dir, 'b.json')).size }, m: { file: 'm.json', words: 1, bytes: statSync(join(dir, 'm.json')).size } });
    expect(index.counts.bytes).toBe(index.shards.b.bytes + index.shards.m.bytes);
    expect(Date.parse(index.updated)).toBeGreaterThan(0);
    expect(Date.parse(index.started)).toBeGreaterThan(0);
    // Every word the index lists is in the shard it names, and nowhere else.
    for (const [word, shard] of Object.entries(index.words)) expect(JSON.parse(readFileSync(join(dir, index.shards[shard].file), 'utf8'))[word]).toBe(store.get(word));
    expect(tool.readIndexWords(join(dir, 'index.json'))).toEqual(['bad', 'bed', 'mom']);
    expect(readFileSync(join(dir, 'review.txt'), 'utf8')).toBe('review text\n');
    expect(store.flush('again')).toEqual([]);
  });

  it('a second run picks up where the first stopped: stored words are kept, and only changed shards are rewritten', () => {
    const dir = newDir();
    const first = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    first.add('bad', clip(1)); first.add('mom', clip(3)); first.fail('zap', 'too long');
    first.flush();
    const mBefore = readFileSync(join(dir, 'm.json'));
    const second = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    expect(second.count()).toBe(2);
    expect(second.has('bad') && second.has('mom') && !second.has('bug')).toBe(true);
    expect(second.get('bad')).toBe(clip(1));
    expect(second.failedReason('zap')).toBe('too long');
    expect(second.dirty()).toBe(false);
    second.add('bug', clip(4)); second.add('zap', clip(5), 'period');
    expect(second.failedReason('zap')).toBe('');
    expect(second.flush()).toEqual(['b.json', 'z.json', 'index.json']);
    expect(readFileSync(join(dir, 'm.json')).equals(mBefore)).toBe(true);
    const third = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    expect(third.words()).toEqual(['bad', 'bug', 'mom', 'zap']);
    expect(third.index()).toMatchObject({ failed: {}, otherTextForm: { zap: 'period' }, counts: { words: 4, shards: 3 } });
    expect(third.index().started).toBe(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).started);
  });

  it('stops before writing when the disk is under 3 GB free, and loses nothing it had', () => {
    const dir = newDir();
    let free = 50 * GIB;
    const store = tool.openStore(dir, { freeBytes: () => free });
    store.add('bad', clip(1));
    store.flush();
    const before = snapshot(dir);
    free = 2.9 * GIB;
    store.add('bed', clip(2)); store.add('cat', clip(6));
    let thrown = null;
    try { store.flush(); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(tool.LowDiskError);
    expect(thrown.code).toBe('LOW_DISK');
    expect(thrown.message).toMatch(/Only 2\.90 GB free.*stops under 3 GB.*--resume/);
    expect(snapshot(dir)).toEqual(before);
    expect(noEmptyFiles(dir)).toBe(true);
    // A brand-new store under the limit makes no folder at all.
    const other = newDir(), empty = tool.openStore(other, { freeBytes: () => 1 * GIB });
    empty.add('bad', clip(1));
    expect(() => empty.flush()).toThrow(tool.LowDiskError);
    expect(existsSync(other)).toBe(false);
    // With room again, the same store object writes what it was holding.
    free = 50 * GIB;
    expect(store.dirty()).toBe(true);
    expect(store.flush()).toEqual(['b.json', 'c.json', 'index.json']);
    expect(tool.openStore(dir, { freeBytes: () => free }).words()).toEqual(['bad', 'bed', 'cat']);
    expect(tool.MIN_FREE_BYTES).toBe(3 * GIB);
  });

  it('never leaves a short or empty shard: a write that fails, or lies, keeps the old file', () => {
    const dir = newDir();
    const good = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    good.add('bad', clip(1));
    good.flush();
    const before = snapshot(dir);
    const full = { ...nodeFs, writeSync: () => { throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' }); } };
    const one = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: full });
    one.add('bed', clip(2));
    expect(() => one.flush()).toThrow(/ENOSPC/);
    expect(snapshot(dir)).toEqual(before);
    // A disk that takes half the bytes and reports all of them: the read-back catches it.
    const lying = { ...nodeFs, writeSync: (fd, bytes, offset, length) => { nodeFs.writeSync(fd, bytes, offset, Math.floor(length / 2)); return length; } };
    const two = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: lying });
    two.add('bed', clip(2));
    expect(() => two.flush()).toThrow(/Short write/);
    expect(snapshot(dir)).toEqual(before);
    // A disk that writes nothing at all.
    const nothing = { ...nodeFs, writeSync: () => 0 };
    const three = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: nothing });
    three.add('bed', clip(2));
    expect(() => three.flush()).toThrow(/Short write/);
    expect(snapshot(dir)).toEqual(before);
    expect(noEmptyFiles(dir)).toBe(true);
    expect(() => tool.atomicWrite(join(dir, 'x.json'), '')).toThrow(/empty file/);
    expect(existsSync(join(dir, 'x.json'))).toBe(false);
  });

  it('waits and tries again when Windows holds the old file (EPERM), and gives up cleanly when it stays held', () => {
    const dir = newDir();
    const base = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    base.add('bad', clip(1));
    base.flush();
    const before = snapshot(dir);
    let refusals = 2;
    const waits = [];
    const held = { ...nodeFs, renameSync: (from, to) => { if (/b\.json$/.test(to) && refusals-- > 0) throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' }); nodeFs.renameSync(from, to); } };
    const store = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: held, sleep: (ms) => waits.push(ms) });
    store.add('bed', clip(2));
    expect(store.flush()).toEqual(['b.json', 'index.json']);
    expect(waits).toEqual([100, 200]);
    expect(Object.keys(JSON.parse(readFileSync(join(dir, 'b.json'), 'utf8')))).toEqual(['_meta', 'bad', 'bed']);
    const after = snapshot(dir);
    const stuck = { ...nodeFs, renameSync: () => { throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' }); } };
    const never = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: stuck, sleep: () => {}, retries: 3 });
    never.add('bug', clip(4));
    expect(() => never.flush()).toThrow(/EPERM/);
    expect(snapshot(dir)).toEqual(after);
    expect(Object.keys(before)).toEqual(Object.keys(after));
  });

  it('refuses to open over a damaged shard, and sweeps only its own leftover temporary files', () => {
    const dir = newDir();
    const store = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    store.add('bad', clip(1));
    store.flush();
    writeFileSync(join(dir, 'b.json.4242.0a1b2c3d.tmp'), 'half a shard');
    writeFileSync(join(dir, 'notes.tmp'), 'someone else');
    expect(tool.openStore(dir).count()).toBe(1);
    expect(store.sweep()).toBe(1);
    expect(filesOf(dir)).toEqual(['b.json', 'index.json', 'notes.tmp']);
    writeFileSync(join(dir, 'c.json'), '');
    expect(() => tool.openStore(dir)).toThrow(/c\.json is not readable JSON.*will not write over it/);
    writeFileSync(join(dir, 'c.json'), JSON.stringify({ cat: clip(1) }));
    expect(() => tool.openStore(dir)).toThrow(/not a alloflow-word-audio-shard\/1 file/);
    writeFileSync(join(dir, 'c.json'), JSON.stringify({ _meta: { format: 'alloflow-word-audio-shard/1' }, dog: clip(1) }));
    expect(() => tool.openStore(dir)).toThrow(/does not belong: dog/);
    expect(() => store.add('cat', 'data:audio/wav;base64,AAAA')).toThrow(/Not a webm clip/);
  });
});

describe('(c) the automatic checks, on made-up sound', () => {
  it('trims exactly as the syllable top-up did (its own trimWav, run beside this one)', () => {
    const source = readFileSync('dev-tools/build_word_sounds_syllable_audio.cjs', 'utf8');
    const from = source.indexOf('function trimWav(raw) {'), to = source.indexOf('\nasync function run()', from);
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const old = new Function('assert', 'Buffer', source.slice(from, to) + '\nreturn trimWav;')(assert, Buffer);
    for (const raw of [spoken(), spoken({ lead: 0.01, tail: 0.02 }), spoken({ body: 1.3, level: 0.4 }), spoken({ lead: 0, tail: 0, edges: false }), spoken({ body: 0.004 })]) {
      const mine = tool.trimWav(raw), theirs = old(raw);
      expect(mine.wav.equals(theirs.wav)).toBe(true);
      expect(mine.sourceDurationSeconds).toBe(theirs.sourceDurationSeconds);
      expect(mine.trimmedLeadingSeconds).toBe(theirs.trimmedLeadingSeconds);
      expect(mine.trimmedTrailingSeconds).toBe(theirs.trimmedTrailingSeconds);
    }
    expect(() => tool.trimWav(wavOf(new Float32Array(RATE)))).toThrow(/Silent source PCM/);
    expect(() => tool.trimWav(Buffer.from('not a wav at all, not a wav at all, not a wav at all'))).toThrow(/Expected loader PCM WAV/);
  });

  it('passes a clean word and keeps the bank\'s 30 ms / 60 ms margins', () => {
    const trimmed = tool.trimWav(spoken());
    const checked = tool.checkClip(trimmed, 3);
    expect(checked.failures).toEqual([]);
    expect(checked.ok).toBe(true);
    const m = checked.measures;
    expect(m.durationSeconds).toBeGreaterThan(0.58);
    expect(m.durationSeconds).toBeLessThan(0.6);
    expect(Math.abs(m.leadSilenceSeconds - 0.03)).toBeLessThan(0.003);
    expect(Math.abs(m.tailSilenceSeconds - 0.06)).toBeLessThan(0.003);
    expect(m.peak).toBeGreaterThan(0.49);
    expect(m.clippedFraction).toBe(0);
    expect(trimmed.sourceLeadSilenceSeconds).toBeGreaterThan(0.34);
    expect(trimmed.sourceTailSilenceSeconds).toBeGreaterThan(0.39);
    expect(trimmed.samples.length * 2 + 44).toBe(trimmed.wav.length);
  });

  it('refuses a clip that is too short, too long, or not plausible for the word\'s sound count', () => {
    const fails = (wav, sounds) => tool.checkClip(tool.trimWav(wav), sounds).failures.join('; ');
    expect(fails(spoken({ body: 0.05 }), 3)).toMatch(/duration 0\.14 s is outside 0\.25 to 2\.5 s/);
    expect(fails(spoken({ body: 2.8 }), 9)).toMatch(/duration 2\.89 s is outside 0\.25 to 2\.5 s/);
    // 1.19 s: far too long for a three-sound word, fine for a nine-sound word.
    expect(fails(spoken({ body: 1.1 }), 3)).toMatch(/duration 1\.19 s is not plausible for 3 sounds/);
    expect(fails(spoken({ body: 1.1 }), 9)).toBe('');
    // 0.39 s: fine for two sounds, too short for ten.
    expect(fails(spoken({ body: 0.3 }), 2)).toBe('');
    expect(fails(spoken({ body: 0.3 }), 10)).toMatch(/not plausible for 10 sounds/);
    expect(tool.expectedSeconds(3)).toBeCloseTo(0.553, 3);
  });

  it('refuses silence, clipping, and a start or an end that is cut off', () => {
    const fails = (wav) => tool.checkClip(tool.trimWav(wav), 3).failures.join('; ');
    expect(fails(spoken({ level: 0.008, beat: 0.02 }))).toMatch(/silent or much quieter than the bank \(peak 0\.020/);
    expect(fails(spoken({ level: 0.03, beat: 0.3 }))).toMatch(/silent or much quieter than the bank/);
    expect(fails(spoken({ level: 0.4 }))).toMatch(/^much louder than the bank \(rms 0\.2\d\d; its clips are near 0\.09\)$/);
    expect(fails(spoken({ level: 1, beat: 1, square: true }))).toMatch(/clipping/);
    // The voice ran to the very end of its buffer: the last 30 ms still carry sound.
    expect(fails(spoken({ tail: 0, edges: false }))).toMatch(/the end is cut off \(the last 30 ms are not quiet\)/);
    // It stopped 30 ms after the last sound: no room for the bank's 60 ms.
    expect(fails(spoken({ tail: 0.03 }))).toMatch(/the end is cut off \(the voice stopped (29|30|31) ms after the last sound\)/);
    expect(fails(spoken({ lead: 0, edges: false }))).toMatch(/the start is cut off/);
    expect(fails(spoken())).toBe('');
  });
});

describe('(d) the run loop, with a pretend engine', () => {
  const entriesOf = (n) => Array.from({ length: n }, (_, i) => ({ word: String.fromCharCode(97 + (i % 26)) + 'a' + String.fromCharCode(97 + Math.floor(i / 26)) + 'x', stage: 'K early', sounds: 3 }));
  const encode = (wav) => Buffer.concat([Buffer.from('webm'), wav.subarray(44, 44 + 1500)]);
  function pretend(script = {}) {
    const engine = { calls: [], restarts: 0, busy: 0, mostBusy: 0,
      synth: async (text) => {
        engine.calls.push(text);
        engine.busy++; engine.mostBusy = Math.max(engine.mostBusy, engine.busy);
        await new Promise((resolve) => setTimeout(resolve, 1));
        engine.busy--;
        const act = script[text] || script['*'];
        return typeof act === 'function' ? act(text) : spoken();
      },
      restart: async () => { engine.restarts++; } };
    return engine;
  }
  const depsOf = (engine, store, extra = {}) => ({ engine, encode, store, log: () => {}, ...extra });

  it('saves every 50 words and at the end, each word in its letter\'s shard', async () => {
    const dir = newDir(), store = tool.openStore(dir, { freeBytes: () => 50 * GIB }), engine = pretend();
    const todo = entriesOf(120);
    let flushes = 0;
    const flush = store.flush;
    store.flush = (review) => { const written = flush(review); if (written.length) flushes++; return written; };
    const result = await tool.run(todo, { form: 'bare' }, depsOf(engine, store, { review: () => 'review\n' }));
    expect(result).toMatchObject({ planned: 120, processed: 120, voiced: 120, failed: 0, retried: 0, stoppedBecause: '', exitCode: 0, flushes: 3 });
    expect(flushes).toBe(3);
    expect(engine.calls).toEqual(todo.map((e) => e.word));
    const reopened = tool.openStore(dir);
    expect(reopened.words()).toEqual(todo.map((e) => e.word).sort());
    expect(filesOf(dir).filter((name) => /^[a-z]\.json$/.test(name))).toHaveLength(26);
    expect(filesOf(dir).some((name) => /\.tmp$/.test(name))).toBe(false);
    expect(result.words[0]).toMatchObject({ word: todo[0].word, form: 'bare', sounds: 3 });
    expect(result.words[0].bytes).toBe(1504);
    expect(tool.SHARD_EVERY).toBe(50);
    expect(tool.LOG_EVERY).toBe(25);
  });

  it('writes a progress line every 25 words: done of total, rate, finish time, failures', async () => {
    const lines = [], store = tool.openStore(newDir(), { freeBytes: () => 50 * GIB });
    await tool.run(entriesOf(60), { form: 'bare' }, depsOf(pretend(), store, { log: (line) => lines.push(line), freeBytes: () => 50 * GIB }));
    const progress = lines.filter((line) => / done \(/.test(line));
    expect(progress).toHaveLength(3);
    expect(progress[0]).toMatch(/^25 \/ 60 done \(41\.7%\), [\d.]+ words a minute, finish about \d\d:\d\d:\d\d \(\d+ min left\), failures 0, in the store 25, at "[a-z]+" \(K early\), disk free 50\.0 GB$/);
    expect(progress[2]).toMatch(/^60 \/ 60 done \(100\.0%\).*finished, failures 0, in the store 60/);
    // A run that ends on a multiple of 25 says so once, not twice.
    const even = [];
    await tool.run(entriesOf(50), { form: 'bare' }, depsOf(pretend(), tool.openStore(newDir(), { freeBytes: () => 50 * GIB }), { log: (line) => even.push(line) }));
    expect(even.filter((line) => / done \(/.test(line))).toHaveLength(2);
  });

  it('--resume: the words already in the store are not voiced again', async () => {
    const dir = newDir(), todo = entriesOf(30);
    const work30 = { entries: todo, groups: ['K early'] };
    const first = tool.openStore(dir, { freeBytes: () => 50 * GIB }), engineOne = pretend();
    await tool.run(tool.selectWork(work30, { limit: 12 }, first).todo, { form: 'bare' }, depsOf(engineOne, first));
    expect(engineOne.calls).toHaveLength(12);
    const second = tool.openStore(dir, { freeBytes: () => 50 * GIB }), engineTwo = pretend();
    const selection = tool.selectWork(work30, {}, second);
    expect(selection).toMatchObject({ total: 30, stored: 12, left: 18 });
    const result = await tool.run(selection.todo, { form: 'bare' }, depsOf(engineTwo, second));
    expect(engineTwo.calls).toEqual(todo.slice(12).map((e) => e.word));
    expect(result.voiced).toBe(18);
    expect(tool.openStore(dir).count()).toBe(30);
  });

  it('a clip that fails a check is voiced once more from the other text form; one that fails twice is listed and not written', async () => {
    const dir = newDir(), store = tool.openStore(dir, { freeBytes: () => 50 * GIB });
    const cut = () => spoken({ tail: 0, edges: false });
    const engine = pretend({ bad: cut, mom: cut, 'mom.': () => spoken({ body: 2.8 }) });
    const todo = [{ word: 'bad', stage: 'K early', sounds: 3 }, { word: 'mom', stage: 'K early', sounds: 3 }, { word: 'sad', stage: 'K early', sounds: 3 }];
    const result = await tool.run(todo, { form: 'bare' }, depsOf(engine, store));
    expect(engine.calls).toEqual(['bad', 'bad.', 'mom', 'mom.', 'sad']);
    expect(result).toMatchObject({ voiced: 2, failed: 1, retried: 1, processed: 3 });
    expect(result.words[0]).toMatchObject({ word: 'bad', form: 'period' });
    expect(result.words[0].retriedBecause[0]).toMatch(/^try 1 \(bare\): the end is cut off/);
    expect(result.failures).toEqual([{ word: 'mom', stage: 'K early', reason: expect.stringMatching(/^try 1 \(bare\): the end is cut off.* \/ try 2 \(period\): duration 2\.89 s is outside/) }]);
    const reopened = tool.openStore(dir);
    expect(reopened.words()).toEqual(['bad', 'sad']);
    expect(reopened.failedReason('mom')).toMatch(/try 2 \(period\)/);
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    expect(index.otherTextForm).toEqual({ bad: 'period' });
    expect(Object.keys(index.failed)).toEqual(['mom']);
    expect(existsSync(join(dir, 'm.json'))).toBe(false);
    const review = tool.reviewText({ held: [{ word: 'tear', reason: 'pronunciations', stage: 'G2', detail: 't air | t ear' }] }, reopened, '2026-11-11');
    expect(review).toMatch(/== Voiced but failed the automatic checks, twice: 1 ==\n\tmom\ttry 1/);
    expect(review).toMatch(/listen to these first\): 1 ==\n\tbad\tperiod/);
    expect(review).toMatch(/more than one pronunciation: the voice may say the other one: 1 ==\nG2\ttear\tt air \| t ear\n/);
    // A failed word is skipped by a later run unless it is asked for.
    expect(tool.selectWork({ entries: todo, groups: ['K early'] }, {}, reopened).todo).toEqual([]);
    expect(tool.selectWork({ entries: todo, groups: ['K early'] }, { retryFailed: true }, reopened).todo.map((e) => e.word)).toEqual(['mom']);
  });

  it('a finished clip the browser decodes to another length is refused', async () => {
    const store = tool.openStore(newDir(), { freeBytes: () => 50 * GIB }), engine = pretend();
    engine.decodeCheck = async () => ({ durationSeconds: 1.4, sampleRate: 48000, channels: 1, peak: 0.5, rms: 0.1 });
    const result = await tool.run(entriesOf(1), { form: 'bare' }, depsOf(engine, store));
    expect(result).toMatchObject({ voiced: 0, failed: 1 });
    expect(result.failures[0].reason).toMatch(/the encoded clip decodes to 1\.40 s/);
    engine.decodeCheck = async () => ({ durationSeconds: 0.6, sampleRate: 48000, channels: 1, peak: 0.5, rms: 0.1 });
    expect(await tool.run(entriesOf(1), { form: 'bare' }, depsOf(engine, tool.openStore(newDir(), { freeBytes: () => 50 * GIB })))).toMatchObject({ voiced: 1, failed: 0 });
  });

  it('stops cleanly when the disk runs low mid-run: what was saved stays, nothing short is written, and --resume finishes', async () => {
    const dir = newDir(), todo = entriesOf(30);
    let free = 50 * GIB;
    const store = tool.openStore(dir, { freeBytes: () => free });
    const engine = pretend({ '*': () => { if (engine.calls.length >= 12) free = 2 * GIB; return spoken(); } });
    const result = await tool.run(todo, { form: 'bare', shardEvery: 5 }, depsOf(engine, store, { freeBytes: () => free }));
    expect(result.exitCode).toBe(3);
    expect(result.stoppedBecause).toMatch(/Only 2\.00 GB free.*--resume/);
    expect(result.unsaved).toBe(true);
    expect(engine.calls).toHaveLength(12);
    expect(tool.openStore(dir).count()).toBe(10);
    expect(noEmptyFiles(dir)).toBe(true);
    expect(filesOf(dir).some((name) => /\.tmp$/.test(name))).toBe(false);
    free = 50 * GIB;
    const again = tool.openStore(dir, { freeBytes: () => free }), engineTwo = pretend();
    const rest = await tool.run(tool.selectWork({ entries: todo, groups: ['K early'] }, {}, again).todo, { form: 'bare' }, depsOf(engineTwo, again, { freeBytes: () => free }));
    expect(rest).toMatchObject({ voiced: 20, exitCode: 0 });
    expect(tool.openStore(dir).count()).toBe(30);
  });

  it('a save that Windows refuses for a while does not end the run: the clips wait in memory for the next save', async () => {
    const dir = newDir(), todo = entriesOf(40), lines = [];
    let held = true;
    const fsx = { ...nodeFs, renameSync: (from, to) => { if (held) throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' }); nodeFs.renameSync(from, to); } };
    const store = tool.openStore(dir, { freeBytes: () => 50 * GIB, fs: fsx, sleep: () => {}, retries: 1 });
    const engine = pretend({ '*': () => { if (engine.calls.length >= 14) held = false; return spoken(); } });
    const result = await tool.run(todo, { form: 'bare', shardEvery: 10 }, depsOf(engine, store, { log: (line) => lines.push(line) }));
    expect(result).toMatchObject({ voiced: 40, exitCode: 0, stoppedBecause: '' });
    expect(lines.filter((line) => /^Could not save yet \(EPERM/.test(line))).toHaveLength(1);
    expect(tool.openStore(dir).count()).toBe(40);
    expect(filesOf(dir).some((name) => /\.tmp$/.test(name))).toBe(false);
    // Held all night: four misses in a row end the run, and nothing half-written is left.
    held = true;
    const dirTwo = newDir(), stuck = tool.openStore(dirTwo, { freeBytes: () => 50 * GIB, fs: fsx, sleep: () => {}, retries: 1 });
    const never = await tool.run(entriesOf(60), { form: 'bare', shardEvery: 10 }, depsOf(pretend(), stuck));
    expect(never.exitCode).toBe(1);
    expect(never.stoppedBecause).toMatch(/^saving kept failing: EPERM/);
    expect(never.unsaved).toBe(true);
    expect(filesOf(dirTwo)).toEqual([]);
  });

  it('Ctrl-C: finishes the word in hand, saves, and says so', async () => {
    const dir = newDir(), store = tool.openStore(dir, { freeBytes: () => 50 * GIB }), engine = pretend();
    const result = await tool.run(entriesOf(40), { form: 'bare' }, depsOf(engine, store, { stopRequested: () => engine.calls.length >= 7 }));
    expect(result).toMatchObject({ voiced: 7, exitCode: 0, stoppedBecause: 'stopped by the user' });
    expect(tool.openStore(dir).count()).toBe(7);
  });

  it('engine trouble: one restart and the word is voiced; a word is never marked failed for it; three in a row stop the run', async () => {
    const dir = newDir(), store = tool.openStore(dir, { freeBytes: () => 50 * GIB }), todo = entriesOf(6);
    let trips = 1;
    const engine = pretend({ [todo[2].word]: () => { if (trips-- > 0) throw new tool.EngineError('the page crashed'); return spoken(); } });
    const lines = [];
    const result = await tool.run(todo, { form: 'bare' }, depsOf(engine, store, { log: (line) => lines.push(line) }));
    expect(result).toMatchObject({ voiced: 6, failed: 0, skipped: 0, engineRestarts: 1, exitCode: 0 });
    expect(engine.restarts).toBe(1);
    expect(lines.join('\n')).toMatch(/Engine trouble at "[a-z]+": the page crashed\. Restarting the browser\./);
    const broken = pretend({ '*': () => { throw new tool.EngineError('no voice'); } });
    const dirTwo = newDir(), storeTwo = tool.openStore(dirTwo, { freeBytes: () => 50 * GIB });
    const stopped = await tool.run(todo, { form: 'bare' }, depsOf(broken, storeTwo));
    expect(stopped).toMatchObject({ voiced: 0, failed: 0, skipped: 3, exitCode: 4, stoppedBecause: 'the speech engine failed on 3 words in a row' });
    expect(stopped.engineSkipped).toEqual(todo.slice(0, 3).map((e) => e.word));
    expect(storeTwo.failedWords()).toEqual({});
    expect(existsSync(dirTwo)).toBe(false);
    const dead = pretend({ '*': () => { throw new tool.EngineError('no voice'); } });
    dead.restart = async () => { throw new Error('the browser did not start'); };
    expect(await tool.run(todo, { form: 'bare' }, depsOf(dead, tool.openStore(newDir(), { freeBytes: () => 50 * GIB })))).toMatchObject({ exitCode: 4, stoppedBecause: 'the browser would not restart: the browser did not start' });
  });

  it('twenty failed checks in a row stop the run: that is the voice, not the words', async () => {
    const store = tool.openStore(newDir(), { freeBytes: () => 50 * GIB });
    const result = await tool.run(entriesOf(40), { form: 'bare' }, depsOf(pretend({ '*': () => spoken({ body: 2.8 }) }), store));
    expect(result).toMatchObject({ voiced: 0, failed: 20, exitCode: 4 });
    expect(result.stoppedBecause).toMatch(/20 words in a row failed the checks/);
  });

  it('--lanes 2 voices two words at a time and stores each word once; a fresh browser every N words', async () => {
    const dir = newDir(), store = tool.openStore(dir, { freeBytes: () => 50 * GIB }), engine = pretend(), todo = entriesOf(61);
    const result = await tool.run(todo, { form: 'bare', lanes: 2, recycle: 25 }, depsOf(engine, store));
    expect(result).toMatchObject({ voiced: 61, failed: 0, lanes: 2, exitCode: 0 });
    expect(engine.mostBusy).toBe(2);
    expect(engine.calls.slice().sort()).toEqual(todo.map((e) => e.word).sort());
    expect(engine.restarts).toBe(2);
    expect(tool.openStore(dir).words()).toEqual(todo.map((e) => e.word).sort());
    const single = pretend();
    await tool.run(entriesOf(5), { form: 'bare', lanes: 1 }, depsOf(single, tool.openStore(newDir(), { freeBytes: () => 50 * GIB })));
    expect(single.mostBusy).toBe(1);
  });
});

describe('(e) the word list reads the shard index for its clip flag', () => {
  // A fixture store: three words that have no clip in either bank today.
  const fixture = newDir();
  const store = tool.openStore(fixture, { freeBytes: () => 50 * GIB });
  const three = work.entries.slice(0, 3).map((e) => e.word);
  for (const word of three) store.add(word, clip(1));
  store.flush();
  const load = (source) => { const module = { exports: {} }; new Function('window', 'module', source)({}, module); return module.exports; };
  const withShards = wordlistTool.build({ shardIndex: join(fixture, 'index.json') });
  const without = wordlistTool.build({ shardIndex: join(fixture, 'no-such-index.json') });

  it('flags the store\'s words as having a clip, from a third source', () => {
    expect(wordlistTool.FLAGS.shards).toBe(128);
    expect(withShards.counts.shards).toBe(3);
    const list = load(wordlistTool.render(withShards)), plain = load(wordlistTool.render(without));
    for (const word of three) {
      expect(plain.get(word), word).toMatchObject({ shards: false, hasClip: false });
      expect(list.get(word), word).toMatchObject({ shards: true, hasClip: true, kokoro: false, recorded: false });
    }
    expect(list.get('cat')).toMatchObject({ shards: false, hasClip: true });
    expect(list.get(work.entries[3].word)).toMatchObject({ shards: false, hasClip: false });
    expect(list.rows().filter((row) => row.shards).map((row) => row.word).sort()).toEqual(three.slice().sort());
    expect(list.FLAGS.shards).toBe(128);
    // The picker, which asks for a clip by default, now offers them.
    const before = builder.pickWords({ count: 1e9, stage: 'K early' }, { wordlist: plain, core, dictionary, seed: 1 }).words;
    const after = builder.pickWords({ count: 1e9, stage: 'K early' }, { wordlist: list, core, dictionary, seed: 1 }).words;
    expect(after.slice().sort()).toEqual([...before, ...three].sort());
  }, 60000);

  it('with no store the list is as it was, and a file that is not an index is refused', () => {
    expect(without.counts.shards).toBe(0);
    expect(without.rows).not.toEqual(withShards.rows);
    expect(load(wordlistTool.render(without)).rows().some((row) => row.shards)).toBe(false);
    const wrong = join(fixture, 'wrong.json');
    writeFileSync(wrong, JSON.stringify({ words: { cat: 'c' } }));
    expect(() => wordlistTool.build({ shardIndex: wrong })).toThrow(/Not a word audio index/);
    expect(() => tool.readIndexWords(wrong)).toThrow(/Not a alloflow-word-audio-index\/1 file/);
    expect(tool.readIndexWords(join(fixture, 'no-such-index.json'))).toEqual([]);
    expect(wordlistTool.SHARDS_INDEX.replace(/\\/g, '/')).toMatch(/\/word_audio_shards\/index\.json$/);
    expect(tool.DEFAULT_OUT.replace(/\\/g, '/')).toMatch(/\/word_audio_shards$/);
  }, 60000);
});
