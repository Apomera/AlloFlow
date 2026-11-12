#!/usr/bin/env node
'use strict';

// Regroups a finished word-audio store (word_audio_shards/, made by dev-tools/build_word_sounds_word_audio.cjs)
// into small files, so that a page which needs a few words downloads a few small files and not a
// whole letter (the s file alone is about 6 MB).
//
//   node dev-tools/repack_word_sounds_word_audio.cjs                 regroup word_audio_shards/: at most 40 words a file
//   node dev-tools/repack_word_sounds_word_audio.cjs --check         compare the store with its index; writes nothing
//   node dev-tools/repack_word_sounds_word_audio.cjs --max 25        another file size
//   node dev-tools/repack_word_sounds_word_audio.cjs --store <dir>   another store folder
//   node dev-tools/repack_word_sounds_word_audio.cjs --per-letter    back to one file per first letter: the only layout the
//                                                                    generator reads. Run it before the generator's --resume
//                                                                    adds words, then regroup again.
//   --keep-old            keep the folder as it was before (<store>.repack-old) instead of deleting it
//
// The layout: within a first letter the words are in alphabetical order, cut into files of at most --max
// words, as even as they come: s-01.json, s-02.json ... (two digits; three when a letter needs over 99 files).
// index.json keeps its format (alloflow-word-audio-index/1): words -> shard key, shards -> { file, words,
// bytes }, counts. A reader follows the index and never guesses a file name, so both layouts read the same.
//
// What it will not do: run while the generator's .run.lock is in the folder (only --check may); write into the
// store. The new layout goes to a folder beside it (<store>.repack-new), is read back from the disk and compared
// with the old one: every word there once, every clip the same bytes (sha256). Only then do the two folders
// change places. Run on a store that already has the layout asked for, it changes nothing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STORE = path.join(ROOT, 'word_audio_shards');
const DEFAULT_MAX = 40;
// The same names as dev-tools/build_word_sounds_word_audio.cjs (a test compares them).
const SHARD_FORMAT = 'alloflow-word-audio-shard/1';
const INDEX_FORMAT = 'alloflow-word-audio-index/1';
const URI_PREFIX = 'data:audio/webm;base64,';
const LOCK_FILE = '.run.lock';
const SHARD_NAME = /^[a-z0-9_][a-z0-9_-]*\.json$/;
const NOTE_TAIL = 'Only the words of THIS store are listed: the recorded bank and word_audio_kokoro_bank.json keep their own. ' +
  'To use a word: read shards[words[word]].file and take its entry (a webm/opus data URI). Automatic checks passed; no person has listened.';
const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const megabytes = bytes => (bytes / 1e6).toFixed(1) + ' MB';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

class RefusedError extends Error { constructor(message) { super(message); this.name = 'RefusedError'; this.code = 'REFUSED'; } }

function clipBytes(uri) { return Buffer.from(String(uri).slice(URI_PREFIX.length), 'base64'); }
function clipHash(uri) { return crypto.createHash('sha256').update(clipBytes(uri)).digest('hex'); }
// A clip is a webm data address with a real base64 body (the generator refuses anything under 400 characters).
function clipProblem(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(URI_PREFIX)) return 'is not a webm clip';
  const body = uri.slice(URI_PREFIX.length);
  if (body.length < 400) return 'is too short to be a clip';
  if (body.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return 'is not whole base64';
  return '';
}

// Who holds the lock, in words. The generator writes its process number into the file.
function lockNote(dir, fsx = fs) {
  const file = path.join(dir, LOCK_FILE);
  if (!fsx.existsSync(file)) return '';
  let pid = 0, alive = false;
  try { pid = Number(String(fsx.readFileSync(file, 'utf8')).trim()); } catch (_) { pid = 0; }
  if (pid > 0) { try { process.kill(pid, 0); alive = true; } catch (error) { alive = error.code === 'EPERM'; } }
  return LOCK_FILE + (pid > 0 ? ' names process ' + pid + ', which is ' + (alive ? 'running' : 'not running') : ' is there');
}

// Reads a store by following its index, and lists everything that does not agree. It never writes.
// -> { index, clips: Map(word -> { uri, key }), files: Map(key -> { file, words, bytes }), others, temporary, problems }
function readStore(dir, fsx = fs) {
  const problems = [], clips = new Map(), files = new Map(), others = [], temporary = [];
  const out = { dir, index: null, clips, files, others, temporary, problems };
  if (!fsx.existsSync(dir) || !fsx.statSync(dir).isDirectory()) { problems.push('There is no store folder at ' + dir + '.'); return out; }
  const indexFile = path.join(dir, 'index.json');
  if (!fsx.existsSync(indexFile)) { problems.push('The store has no index.json.'); return out; }
  let index;
  try { index = JSON.parse(fsx.readFileSync(indexFile, 'utf8')); } catch (error) { problems.push('index.json is not readable JSON (' + error.message + ').'); return out; }
  if (!isObject(index) || index.format !== INDEX_FORMAT || !isObject(index.words) || !isObject(index.shards)) { problems.push('index.json is not a ' + INDEX_FORMAT + ' file.'); return out; }
  out.index = index;
  const named = new Set();
  for (const key of Object.keys(index.shards)) {
    const info = index.shards[key];
    const name = isObject(info) ? info.file : null;
    if (typeof name !== 'string' || !SHARD_NAME.test(name) || name === 'index.json') { problems.push('Shard "' + key + '" has no usable file name in the index (' + JSON.stringify(name) + ').'); continue; }
    if (named.has(name)) { problems.push('The index names ' + name + ' for two shards.'); continue; }
    named.add(name);
    const file = path.join(dir, name);
    if (!fsx.existsSync(file)) { problems.push('The index names ' + name + ', and that file is missing.'); continue; }
    let data;
    try { data = JSON.parse(fsx.readFileSync(file, 'utf8')); } catch (error) { problems.push(name + ' is not readable JSON (' + error.message + ').'); continue; }
    if (!isObject(data) || !isObject(data._meta) || data._meta.format !== SHARD_FORMAT) { problems.push(name + ' is not a ' + SHARD_FORMAT + ' file.'); continue; }
    const words = Object.keys(data).filter(word => word !== '_meta');
    const bytes = fsx.statSync(file).size;
    files.set(key, { file: name, words: words.slice().sort(compare), bytes, meta: data._meta });
    for (const word of words) {
      const wrong = clipProblem(data[word]);
      if (wrong) { problems.push('"' + word + '" in ' + name + ' ' + wrong + '.'); continue; }
      if (clips.has(word)) { problems.push('"' + word + '" is in two files: ' + files.get(clips.get(word).key).file + ' and ' + name + '.'); continue; }
      clips.set(word, { uri: data[word], key });
      if (!own(index.words, word)) problems.push('"' + word + '" is in ' + name + ', and the index does not list it.');
      else if (index.words[word] !== key) problems.push('"' + word + '" is in ' + name + ', and the index sends it to shard "' + index.words[word] + '".');
    }
    if (info.words !== words.length) problems.push('The index says ' + name + ' holds ' + info.words + ' words; it holds ' + words.length + '.');
    if (info.bytes !== bytes) problems.push('The index says ' + name + ' is ' + info.bytes + ' bytes; it is ' + bytes + '.');
  }
  for (const word of Object.keys(index.words)) {
    const key = index.words[word];
    if (!own(index.shards, key)) problems.push('"' + word + '" is listed under shard "' + key + '", which the index does not have.');
    else if (files.has(key) && !(clips.has(word) && clips.get(word).key === key)) problems.push('"' + word + '" is listed in ' + files.get(key).file + ', and is not there.');
  }
  for (const name of fsx.readdirSync(dir).sort(compare)) {
    if (name === 'index.json' || name === LOCK_FILE || named.has(name)) continue;
    if (fsx.statSync(path.join(dir, name)).isDirectory()) { problems.push('There is a folder inside the store: ' + name + '.'); continue; }
    if (/\.tmp$/.test(name)) { temporary.push(name); continue; }
    if (/\.json$/.test(name)) { problems.push(name + ' is in the folder, and the index does not name it.'); continue; }
    others.push(name);
  }
  const counts = isObject(index.counts) ? index.counts : {};
  let bytes = 0;
  for (const file of files.values()) bytes += file.bytes;
  if (counts.words !== Object.keys(index.words).length) problems.push('counts.words is ' + counts.words + '; the index lists ' + Object.keys(index.words).length + ' words.');
  if (counts.shards !== Object.keys(index.shards).length) problems.push('counts.shards is ' + counts.shards + '; the index lists ' + Object.keys(index.shards).length + ' shards.');
  if (files.size === Object.keys(index.shards).length && counts.bytes !== bytes) problems.push('counts.bytes is ' + counts.bytes + '; the files add up to ' + bytes + '.');
  return out;
}

const letterOf = word => (/^[a-z]/.test(word) ? word.charAt(0) : '_');
// The layout a store should have: [{ key, file, words }], words in alphabetical order.
// perLetter: one file per first letter (a.json), the generator's own layout.
function planLayout(words, options = {}) {
  const max = options.max > 0 ? Math.floor(options.max) : DEFAULT_MAX;
  const letters = new Map();
  for (const word of Array.from(new Set(words)).sort(compare)) {
    if (!letters.has(letterOf(word))) letters.set(letterOf(word), []);
    letters.get(letterOf(word)).push(word);
  }
  const plan = [];
  for (const letter of Array.from(letters.keys()).sort(compare)) {
    const list = letters.get(letter);
    if (options.perLetter) { plan.push({ key: letter, file: letter + '.json', words: list }); continue; }
    const count = Math.ceil(list.length / max), width = Math.max(2, String(count).length);
    for (let i = 0; i < count; i++) {
      const key = letter + '-' + String(i + 1).padStart(width, '0');
      plan.push({ key, file: key + '.json', words: list.slice(Math.floor(i * list.length / count), Math.floor((i + 1) * list.length / count)) });
    }
  }
  return plan;
}
function hasLayout(store, plan) {
  if (store.files.size !== plan.length) return false;
  return plan.every(part => { const now = store.files.get(part.key); return !!now && now.file === part.file && now.words.join(' ') === part.words.join(' '); });
}
function layoutName(store) {
  const keys = Array.from(store.files.keys());
  if (!keys.length) return 'empty';
  if (keys.every(key => /^[a-z_]$/.test(key))) return 'one file per first letter';
  if (keys.every(key => /^[a-z_]-\d+$/.test(key))) return 'small files (' + Math.max(...Array.from(store.files.values(), file => file.words.length)) + ' words at most)';
  return 'mixed';
}
function largestFile(store) {
  let best = null;
  for (const file of store.files.values()) if (!best || file.bytes > best.bytes) best = file;
  return best;
}
function facts(store) {
  let bytes = 0;
  for (const file of store.files.values()) bytes += file.bytes;
  const largest = largestFile(store);
  return { words: store.clips.size, files: store.files.size, bytes, layout: layoutName(store),
    largest: largest ? { file: largest.file, bytes: largest.bytes, words: largest.words.length } : null };
}

// --check: the store against its own index. -> { ok, problems, facts, lock }
function checkStore(dir, options = {}) {
  const fsx = options.fs || fs;
  const store = readStore(dir, fsx);
  return { ok: !store.problems.length, problems: store.problems, facts: facts(store), lock: lockNote(dir, fsx), temporary: store.temporary };
}

function freeBytesAt(dir) {
  try { const stat = fs.statfsSync(dir); return Number(stat.bavail) * Number(stat.bsize); } catch (_) { return Infinity; }
}
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
// OneDrive or antivirus may hold a folder for a moment: wait and try again, then give up.
function renameWithRetry(from, to, fsx, retries, sleep) {
  for (let attempt = 0; ; attempt++) {
    try { fsx.renameSync(from, to); return; }
    catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= retries) throw error;
      sleep(Math.min(2000, 100 * 2 ** attempt));
    }
  }
}

// Regroups the store. -> { changed, facts, note }
// options: max, perLetter, keepOld, now(), fs, retries, sleep, freeBytes().
function repack(dir, options = {}) {
  const fsx = options.fs || fs;
  const now = options.now || (() => new Date());
  const retries = options.retries == null ? 8 : options.retries, sleep = options.sleep || sleepSync;
  const max = options.max > 0 ? Math.floor(options.max) : DEFAULT_MAX;
  const fresh = dir + '.repack-new', old = dir + '.repack-old';
  // A run that was killed between the two renames left the store under its old name: put it back first.
  if (!fsx.existsSync(dir) && fsx.existsSync(old)) renameWithRetry(old, dir, fsx, retries, sleep);
  const lock = lockNote(dir, fsx);
  if (lock) throw new RefusedError('A run is writing this store, or was stopped without tidying up (' + lock + '). Wait for it to end. If no run is going, delete ' + path.join(dir, LOCK_FILE) + ' and run again. Nothing was changed.');
  const store = readStore(dir, fsx);
  if (store.problems.length) {
    throw new Error('The store does not agree with its index, so it was not touched (' + store.problems.length + (store.problems.length === 1 ? ' problem' : ' problems') + '):\n  ' +
      store.problems.slice(0, 20).join('\n  ') + (store.problems.length > 20 ? '\n  ...' : ''));
  }
  const plan = planLayout(Array.from(store.clips.keys()), { max, perLetter: !!options.perLetter });
  const leftover = fsx.existsSync(old) ? ' The folder ' + old + ' is left from an earlier run and can be deleted.' : '';
  if (hasLayout(store, plan)) return { changed: false, facts: facts(store), note: 'Nothing to do: the store already has this layout.' + leftover };
  if (fsx.existsSync(old)) throw new Error('The folder ' + old + ' is in the way (left from an earlier run). Delete it or move it away, then run again. Nothing was changed.');
  const before = facts(store);
  const free = (options.freeBytes || (() => freeBytesAt(path.dirname(path.resolve(dir)))))();
  if (free < before.bytes * 1.2 + 50e6) throw new Error('Not enough free disk space to write the new layout beside the old one (' + megabytes(free) + ' free, the store is ' + megabytes(before.bytes) + '). Nothing was changed.');

  // 1. The new layout, in a folder beside the store.
  if (fsx.existsSync(fresh)) fsx.rmSync(fresh, { recursive: true, force: true });
  fsx.mkdirSync(fresh, { recursive: true });
  const cleanUp = () => { try { fsx.rmSync(fresh, { recursive: true, force: true }); } catch (_) { /* reported by the next run */ } };
  let after;
  try {
    const index = store.index, stamp = now().toISOString();
    const meta = {};
    for (const key of ['engine', 'voice', 'speed', 'language', 'source', 'post', 'textForm']) if (own(index, key)) meta[key] = index[key];
    const shards = {}, words = {};
    let bytes = 0;
    for (const part of plan) {
      const body = { _meta: Object.assign({ format: SHARD_FORMAT, shard: part.key, words: part.words.length, updated: stamp }, meta, { humanReviewed: index.humanReviewed === true }) };
      for (const word of part.words) { body[word] = store.clips.get(word).uri; words[word] = part.key; }
      const text = JSON.stringify(body);
      fsx.writeFileSync(path.join(fresh, part.file), text);
      const size = Buffer.byteLength(text);
      shards[part.key] = { file: part.file, words: part.words.length, bytes: size };
      bytes += size;
    }
    const first = options.perLetter ? 'Machine-made word clips for Word Sounds, one file per first letter.'
      : 'Machine-made word clips for Word Sounds, in files of at most ' + max + ' words: alphabetical within a first letter, regrouped by dev-tools/repack_word_sounds_word_audio.cjs.';
    // The rest of the generator's note is kept as it stands; only its first sentence, which names the layout, is rewritten.
    const tailAt = typeof index.note === 'string' ? index.note.indexOf(NOTE_TAIL.slice(0, 28)) : -1;
    const tail = tailAt >= 0 ? index.note.slice(tailAt) : NOTE_TAIL;
    const next = Object.assign({}, index, { updated: stamp, note: first + ' ' + tail,
      counts: Object.assign({}, index.counts, { words: Object.keys(words).length, shards: plan.length, bytes }), shards, words });
    fsx.writeFileSync(path.join(fresh, 'index.json'), JSON.stringify(next, null, 1) + '\n');
    for (const name of store.others) fsx.copyFileSync(path.join(dir, name), path.join(fresh, name));

    // 2. Read it back from the disk and compare: every word once, every clip the same bytes.
    after = readStore(fresh, fsx);
    const wrong = after.problems.slice();
    if (after.clips.size !== store.clips.size) wrong.push('The new layout holds ' + after.clips.size + ' words; the store holds ' + store.clips.size + '.');
    for (const [word, clip] of store.clips) {
      const copy = after.clips.get(word);
      if (!copy) { wrong.push('"' + word + '" is missing from the new layout.'); continue; }
      if (copy.uri !== clip.uri || clipHash(copy.uri) !== clipHash(clip.uri)) wrong.push('The clip of "' + word + '" changed.');
    }
    if (!hasLayout(after, plan)) wrong.push('The new layout is not the one planned.');
    for (const part of plan) if (!options.perLetter && part.words.length > max) wrong.push(part.file + ' holds more than ' + max + ' words.');
    for (const name of store.others) if (!fsx.readFileSync(path.join(fresh, name)).equals(fsx.readFileSync(path.join(dir, name)))) wrong.push(name + ' was not copied whole.');
    for (const key of ['failed', 'otherTextForm', 'started']) if (JSON.stringify(after.index && after.index[key]) !== JSON.stringify(index[key])) wrong.push('index.json lost "' + key + '".');
    if (wrong.length) throw new Error('The new layout did not pass its checks, so the store was not touched:\n  ' + wrong.slice(0, 20).join('\n  ') + (wrong.length > 20 ? '\n  ...' : ''));
  } catch (error) { cleanUp(); throw error; }

  // 3. The two folders change places. If the second step fails, the first is undone.
  try { renameWithRetry(dir, old, fsx, retries, sleep); }
  catch (error) { cleanUp(); throw new Error('Could not move the store aside (' + (error.code || error.message) + '): a program is holding the folder. Nothing was changed. Close it, or pause OneDrive, and run again.'); }
  try { renameWithRetry(fresh, dir, fsx, retries, sleep); }
  catch (error) {
    renameWithRetry(old, dir, fsx, retries, sleep);
    cleanUp();
    throw new Error('Could not move the new layout into place (' + (error.code || error.message) + '). The store was put back as it was. Run again.');
  }
  let note = 'The old layout was deleted.';
  if (options.keepOld) note = 'The old layout is kept in ' + old + '.';
  else { try { fsx.rmSync(old, { recursive: true, force: true }); } catch (error) { note = 'The old layout could not be deleted (' + (error.code || error.message) + '): delete ' + old + ' by hand.'; } }
  return { changed: true, before, facts: facts(after), note, temporary: store.temporary };
}

function parseArgs(argv) {
  const options = { store: DEFAULT_STORE, max: DEFAULT_MAX, check: false, perLetter: false, keepOld: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (name === '--check') options.check = true;
    else if (name === '--per-letter') options.perLetter = true;
    else if (name === '--keep-old') options.keepOld = true;
    else if (name === '--help') options.help = true;
    else if (name === '--store' || name === '--max') {
      if (i + 1 >= argv.length) throw new Error('Missing value for ' + name);
      const value = argv[++i];
      if (name === '--store') options.store = path.resolve(value);
      else {
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000) throw new Error('--max needs a whole number from 1 to 1000');
        options.max = Number(value);
      }
    } else throw new Error('Unknown option: ' + name);
  }
  if (options.perLetter && argv.includes('--max')) throw new Error('--per-letter makes one file per first letter: --max does not go with it');
  return options;
}

const factsLine = f => f.words + ' words in ' + f.files + (f.files === 1 ? ' file' : ' files') + ', ' + megabytes(f.bytes) + ', ' + f.layout +
  (f.largest ? '; the largest file is ' + f.largest.file + ' (' + f.largest.words + ' words, ' + megabytes(f.largest.bytes) + ')' : '');

// -> exit code: 0 done or nothing to do, 1 a problem, 2 refused because a run holds the lock.
function main(argv, log = console.log) {
  const options = parseArgs(argv);
  if (options.help) { log(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 25).map(line => line.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
  if (options.check) {
    const result = checkStore(options.store);
    log('Store: ' + options.store);
    if (result.lock) log('Note: a run may be writing this store (' + result.lock + '). A check made in the middle of a save can show problems that are gone a moment later.');
    if (result.temporary.length) log('Note: ' + result.temporary.length + ' temporary file(s) left by a stopped run: ' + result.temporary.slice(0, 5).join(', ') + '.');
    if (!result.ok) {
      log('NOT OK: ' + result.problems.length + (result.problems.length === 1 ? ' problem.' : ' problems.'));
      for (const line of result.problems.slice(0, 40)) log('  ' + line);
      if (result.problems.length > 40) log('  ...');
      return 1;
    }
    log('OK: ' + factsLine(result.facts) + '. Every word is in the file the index names, once; counts and sizes agree.');
    return 0;
  }
  let result;
  try { result = repack(options.store, { max: options.max, perLetter: options.perLetter, keepOld: options.keepOld }); }
  catch (error) { if (error instanceof RefusedError) { log(error.message); return 2; } throw error; }
  log('Store: ' + options.store);
  if (!result.changed) { log(result.note + ' ' + factsLine(result.facts) + '.'); return 0; }
  log('Before: ' + factsLine(result.before) + '.');
  log('After:  ' + factsLine(result.facts) + '.');
  log('Checked before the change: every word there once, every clip the same bytes (sha256). ' + result.note);
  if (result.temporary && result.temporary.length) log('Not carried over: ' + result.temporary.length + ' temporary file(s) left by a stopped run.');
  log('Next: node dev-tools/build_word_sounds_wordlist.cjs (the word list carries the size of the largest file).');
  return 0;
}

module.exports = { ROOT, DEFAULT_STORE, DEFAULT_MAX, SHARD_FORMAT, INDEX_FORMAT, URI_PREFIX, LOCK_FILE, RefusedError,
  readStore, checkStore, planLayout, hasLayout, layoutName, facts, repack, parseArgs, main, clipHash };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
