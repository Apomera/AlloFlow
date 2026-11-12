#!/usr/bin/env node
'use strict';

// Voices the Word Sounds practice words that have no recording, with the app's own local Kokoro
// voice: the same engine files (runtime_assets/engine through kokoro_tts_loader.js), model (q8),
// voice (af_heart), speed (1) and clean-up (trim + ramps + ffmpeg libopus 48k mono webm) as the
// first word bank (dev-tools/kokoro_audio_manifest.json) and the syllable top-up
// (dev-tools/build_word_sounds_syllable_audio.cjs). The model is a free 88 MB download from
// Hugging Face on first use, then kept in --work; no hosted speech service; no word leaves the machine.
//
//   node dev-tools/build_word_sounds_word_audio.cjs --plan       the work list counts, nothing else
//   node dev-tools/build_word_sounds_word_audio.cjs --dry        what a run would do: no engine, no writes
//   node dev-tools/build_word_sounds_word_audio.cjs              the long run (hours); Ctrl-C is safe
//   node dev-tools/build_word_sounds_word_audio.cjs --resume     carry on: skips the words already stored
//
//   --limit N            at most N words this run
//   --stage "<id>"       one part of the work list: "K early" ... "G3+", "no stage", "choices"
//   --only-list <file>   only the words in this file (spaces, commas or lines between them)
//   --include-review     with --only-list: also voice listed words that are held for review because the
//                        sound dictionary has more than one pronunciation, or the first bank's cull dropped them
//   --retry-failed       with --resume: try again the words that failed the checks before
//   --out <dir>          the store (default: word_audio_shards/ in the repo)
//   --work <dir>         browser profile, saved model, log, summary (default: .tmp/word-sounds-word-audio/)
//   --browser <name>     msedge | chrome | chromium (Playwright's own; x64-emulated on Windows on ARM)
//   --form <name>        the text the voice reads for a word: bare | period | capital
//   --lanes N            voice N words at once, one browser page each (default 1; each lane takes one
//                        processor core and about 1 GB of memory; 4 at most)
//   --recycle N          a fresh browser every N words (default 500; 0 = never)
//   --port N             the local port (default 17391)
//   --no-keep-awake      do not ask Windows to stay awake during the run
//
// The store: <out>/<first letter>.json = { "_meta": {...}, "<word>": "data:audio/webm;base64,..." },
// <out>/index.json = this store's words -> shard, counts, engine, voice, dates, and <out>/review.txt =
// the words held back or failed, for a person. Shards are written whole to a temporary file in the
// same folder, flushed, checked, then renamed over the old one: a full disk or a kill leaves the old file.
// Needs Playwright (already in the repo) and ffmpeg on PATH. Nothing here is installed or downloaded
// except the voice model.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'word_audio_shards');
const DEFAULT_WORK = path.join(ROOT, '.tmp', 'word-sounds-word-audio');
const DEFAULT_PORT = 17391;
// Measured on this laptop (Windows on ARM) on 2026-11-11, the same 20 words in each, one page: Chrome 5.1 s a
// word (median), Edge 5.3 s, Playwright's own Chromium (x64, emulated) 6.3 s; the WAV bytes were the same in
// all three, and the same again on a second try, so a retry with the same text can never help.
const DEFAULT_BROWSER = 'chrome';
// "bare" (the word alone) is what the syllable top-up sent, and it gives the first bank's clips back:
// 7 bank words voiced again were 3 ms apart in length (loudness envelope r = 0.998); with a full stop
// ("period") or a capital and a full stop ("capital": the same sound as "period") 23 ms apart (r = 0.93).
const DEFAULT_FORM = 'bare';
const RETRY_FORM = { bare: 'period', period: 'bare', capital: 'bare' };
const ENGINE = Object.freeze({
  engine: 'kokoro-js@1.2.1 / onnx-community/Kokoro-82M-v1.0-ONNX (q8, wasm)',
  voice: 'af_heart', speed: 1, language: 'en-US', source: 'generated_speech',
  post: 'trim(1% peak, 30ms/60ms margins) + ramp(2ms/6ms) + ffmpeg libopus 48kbps mono webm',
});
const SHARD_FORMAT = 'alloflow-word-audio-shard/1';
const INDEX_FORMAT = 'alloflow-word-audio-index/1';
const URI_PREFIX = 'data:audio/webm;base64,';
const MIN_FREE_BYTES = 3 * 1024 * 1024 * 1024;
const SHARD_EVERY = 50;
const LOG_EVERY = 25;
const GIB = 1024 * 1024 * 1024;

// The text the voice is given for one word. "bare" is what the syllable top-up sent (the word alone).
const FORMS = Object.freeze({
  bare: word => word,
  period: word => word + '.',
  capital: word => word.charAt(0).toUpperCase() + word.slice(1) + '.',
});

// ---------------------------------------------------------------------------
// The work list
// ---------------------------------------------------------------------------
const REASONS = Object.freeze({
  pronunciations: 'the sound dictionary has more than one pronunciation: the voice may say the other one',
  culled: 'dropped from the first word bank by its 2026-08-23 cull',
  blocked: 'on the blocklist',
  'sounds-like-blocked': 'sounds the same as a blocklist word',
  'not-a-word': 'letters only, one letter, or not 2 to 10 plain letters with a vowel',
  'not-in-dictionary': 'not in the sound dictionary',
});
const clean = word => String(word || '').normalize('NFC').trim().toLowerCase();
// A byte-order mark at the start of a file (code 65279), written as a number so no invisible character sits in this source.
const stripMark = text => (text.charCodeAt(0) === 65279 ? text.slice(1) : text);
const plainWord =word => /^[a-z]{2,10}$/.test(word) && /[aeiouy]/.test(word);

function loadParts(root = ROOT) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const dictionary = require(path.join(root, 'word_sounds_phonemes_en.js'));
  const pronunciations = require(path.join(root, 'word_sounds_pronunciations.js'));
  const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore(arguments[0]);')({ phonemes: dictionary, pronunciations });
  const wordlist = require(path.join(root, 'word_sounds_wordlist_en.js'));
  const builder = require(path.join(root, 'word_sounds_packet_builder.js'));
  return { dictionary, core, wordlist, builder, hasClip: clipLookup(root, wordlist), culled: readCull(root) };
}

// A word has a clip when either bank holds it. The banks are read here as well as the word list's
// flags, so a stale word list cannot put a recorded word on the work list. This store's own words
// are not counted: they are "done", which --resume skips.
function clipLookup(root, wordlist) {
  const words = new Set();
  const keys = (file, pick) => {
    try { for (const word of Object.keys(pick(JSON.parse(stripMark(fs.readFileSync(path.join(root, file), 'utf8')))) || {})) words.add(clean(word)); }
    catch (error) { throw new Error('Could not read ' + file + ' to see which words have a clip: ' + error.message); }
  };
  keys('audio_bank/words.json', bank => bank);
  keys('word_audio_kokoro_bank.json', bank => bank.words);
  return word => { const row = wordlist.get(word); return words.has(word) || (!!row && (row.recorded || row.kokoro)); };
}

// Words the first bank's cull dropped (adult, rare, archaic, sensitivity...): word -> its reason.
function readCull(root = ROOT) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dev-tools/kokoro_audio_manifest.json'), 'utf8'));
    return Object.assign({}, manifest.cull && manifest.cull.drops);
  } catch (_) { return {}; }
}

function stageIdsOf(builder, wordlist) {
  const listed = typeof builder.stageList === 'function' ? builder.stageList(wordlist.stages).filter(stage => stage.isDefault).map(stage => stage.id) : [];
  return listed.length ? listed : (builder.STAGES || []).slice();
}

function pronunciationsOf(core, word) {
  const entry = core.dictionarySounds(word);
  if (!entry || !entry.sounds || !entry.sounds.length) return null;
  const all = [entry.sounds].concat(entry.alternates || []).map(sounds => Array.from(sounds).join(' '));
  return { sounds: entry.sounds.length, distinct: Array.from(new Set(all)) };
}

// Why a word without a clip is not voiced, or null. The order is the order of seriousness.
function heldReason(word, parts, pronunciations) {
  const row = parts.wordlist.get(word);
  if (parts.wordlist.isBlocked(word)) return { reason: 'blocked', detail: '' };
  if (row && row.nearBlocked) return { reason: 'sounds-like-blocked', detail: '' };
  if (!plainWord(word)) return { reason: 'not-a-word', detail: '' };
  if (!row || row.notInDictionary || !pronunciations) return { reason: 'not-in-dictionary', detail: '' };
  if (pronunciations.distinct.length > 1) return { reason: 'pronunciations', detail: pronunciations.distinct.join(' | ') };
  if (parts.culled && parts.culled[word]) return { reason: 'culled', detail: String(parts.culled[word]) };
  return null;
}

// List 1: every word of the default pool (pickWords with no stage, familiar, not blocked) that has no
// clip, by stage (the builder's own stage logic: the first stage the word fits), then child-book
// frequency, highest first. List 2 ("choices"): the app-list words the practice activities draw answer
// choices from that have no clip and are not in list 1. Words held for review are in neither.
function buildWorkList(parts) {
  const { wordlist, core, dictionary, builder } = parts;
  const hasClip = parts.hasClip || (word => { const row = wordlist.get(word); return !!row && (row.recorded || row.kokoro); });
  const context = { wordlist, core, dictionary, seed: 1 };
  const everything = { count: 1e9, requireClip: false };
  const pool = builder.pickWords(everything, context).words;
  const stageIds = stageIdsOf(builder, wordlist);
  const firstStage = new Map();
  stageIds.forEach((id, index) => {
    for (const word of builder.pickWords(Object.assign({}, everything, { stage: id }), context).words) if (!firstStage.has(word)) firstStage.set(word, index);
  });
  const groups = stageIds.concat(['no stage', 'choices']);
  const counts = { pool: pool.length, poolWithClip: 0, poolNoClip: 0, perGroup: {}, heldByReason: {}, toVoice: 0, held: 0 };
  for (const id of groups) counts.perGroup[id] = { noClip: 0, toVoice: 0, held: 0 };
  const entries = [], held = [];
  const consider = (word, list, stageIndex) => {
    const row = wordlist.get(word) || {};
    const pronunciations = pronunciationsOf(core, word);
    const stage = groups[stageIndex];
    const entry = { word, list, stage, stageIndex, zipf: row.zipf || 0, books: row.books || 0, known: !!row.known, sounds: pronunciations ? pronunciations.sounds : 0 };
    const why = heldReason(word, parts, pronunciations);
    counts.perGroup[stage].noClip++;
    if (why) {
      held.push(Object.assign(entry, why));
      counts.perGroup[stage].held++; counts.held++;
      counts.heldByReason[why.reason] = (counts.heldByReason[why.reason] || 0) + 1;
    } else { entries.push(entry); counts.perGroup[stage].toVoice++; counts.toVoice++; }
  };
  const inPool = new Set(pool);
  for (const word of pool) {
    if (hasClip(word)) { counts.poolWithClip++; continue; }
    counts.poolNoClip++;
    consider(word, 'pool', firstStage.has(word) ? firstStage.get(word) : stageIds.length);
  }
  // The answer-choice pool of buildPacket: the app's own lists (the word list's "known" rows) and the builder's common words.
  const known = wordlist.rows().filter(row => row.known).map(row => row.word);
  const logic = builder._internals && typeof builder._internals.createPackLogic === 'function'
    ? builder._internals.createPackLogic({ core, knownWords: known, seed: 1 }) : null;
  const choices = Array.from(new Set((logic ? Array.from(logic.k2KnownWords()) : known).map(clean).filter(Boolean)));
  counts.choicePool = choices.length;
  counts.choiceNoClip = choices.filter(word => !hasClip(word)).length;
  for (const word of choices) if (!inPool.has(word) && !hasClip(word)) consider(word, 'choices', stageIds.length + 1);
  const byPriority = (a, b) => a.stageIndex - b.stageIndex || b.zipf - a.zipf || b.books - a.books || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0);
  entries.sort(byPriority);
  held.sort(byPriority);
  return { groups, entries, held, counts };
}

function readWordFile(file) {
  return Array.from(new Set(stripMark(fs.readFileSync(file, 'utf8')).split(/[\s,]+/).map(clean).filter(Boolean)));
}

// --only-list: the listed words, in work-list order where the work list has them, then the others in
// file order. A listed word outside the default lists is voiced when it is a usable dictionary word
// with no clip. Words held for review stay held unless includeReview is set, and then only the two
// "a person may decide" reasons are lifted: never a blocked word or a non-word.
function applyOnlyList(work, parts, listed, includeReview) {
  const want = new Set(listed);
  const liftable = reason => includeReview && (reason === 'pronunciations' || reason === 'culled');
  const hasClip = parts.hasClip || (word => { const row = parts.wordlist.get(word); return !!row && (row.recorded || row.kokoro); });
  const entries = work.entries.filter(entry => want.has(entry.word));
  const held = [], skipped = { hasClip: [] };
  for (const item of work.held) {
    if (!want.has(item.word)) continue;
    if (liftable(item.reason)) entries.push(Object.assign({}, item, { lifted: item.reason }));
    else held.push(item);
  }
  const seen = new Set(entries.map(entry => entry.word).concat(held.map(item => item.word)));
  for (const word of listed) {
    if (seen.has(word)) continue;
    if (hasClip(word)) { skipped.hasClip.push(word); continue; }
    const row = parts.wordlist.get(word) || {};
    const pronunciations = pronunciationsOf(parts.core, word);
    const entry = { word, list: 'listed', stage: 'listed', stageIndex: work.groups.length, zipf: row.zipf || 0, books: row.books || 0, known: !!row.known, sounds: pronunciations ? pronunciations.sounds : 0 };
    const why = heldReason(word, parts, pronunciations);
    if (why && !liftable(why.reason)) held.push(Object.assign(entry, why));
    else entries.push(why ? Object.assign(entry, { lifted: why.reason }) : entry);
  }
  return { entries, held, skipped };
}

const sameStage = (a, b) => String(a).trim().toLowerCase().replace(/\s+/g, ' ') === String(b).trim().toLowerCase().replace(/\s+/g, ' ');

// What this run does: the work list, narrowed by --only-list and --stage, minus the words the store
// already holds (and the ones that failed before, unless --retry-failed), cut to --limit.
function selectWork(work, options, store) {
  let entries = work.entries;
  if (options.stage) {
    const valid = work.groups.concat(['listed']);
    if (!valid.some(id => sameStage(id, options.stage))) throw new Error('Unknown --stage "' + options.stage + '": use one of ' + work.groups.map(id => '"' + id + '"').join(', '));
    entries = entries.filter(entry => sameStage(entry.stage, options.stage));
  }
  const total = entries.length;
  const stored = store ? entries.filter(entry => store.has(entry.word)).length : 0;
  const failedBefore = store && !options.retryFailed ? entries.filter(entry => !store.has(entry.word) && store.failedReason(entry.word)).length : 0;
  let todo = entries.filter(entry => !(store && store.has(entry.word)) && !(store && !options.retryFailed && store.failedReason(entry.word)));
  const left = todo.length;
  if (options.limit > 0) todo = todo.slice(0, options.limit);
  return { todo, total, stored, failedBefore, left };
}

const pad = (value, width) => String(value).padStart(width);
function planText(work, selection) {
  const c = work.counts, lines = [];
  lines.push('Word Sounds word audio: the work list');
  lines.push('Default pool: ' + c.pool + ' words; ' + c.poolWithClip + ' have a recording, ' + c.poolNoClip + ' do not.');
  lines.push('');
  lines.push('  part of the list      no clip   to voice   held for review');
  for (const id of work.groups) {
    const g = c.perGroup[id];
    const label = id === 'choices' ? 'answer choices (2nd)' : id === 'no stage' ? 'no stage (pool)' : id;
    lines.push('  ' + label.padEnd(20) + pad(g.noClip, 9) + pad(g.toVoice, 11) + pad(g.held, 18));
  }
  lines.push('  ' + 'total'.padEnd(20) + pad(c.toVoice + c.held, 9) + pad(c.toVoice, 11) + pad(c.held, 18));
  lines.push('');
  lines.push('Second list: the app lists hold ' + c.choicePool + ' answer-choice words; ' + c.choiceNoClip + ' have no clip; ' + work.counts.perGroup.choices.noClip +
    ' of those are outside the default pool (the rest are in the first list or its review list).');
  lines.push('Held for review, not voiced: ' + c.held + (c.held ? ' (' + Object.keys(c.heldByReason).sort().map(reason => reason + ' ' + c.heldByReason[reason]).join(', ') + ')' : ''));
  for (const reason of Object.keys(c.heldByReason).sort()) lines.push('  ' + reason + ': ' + REASONS[reason]);
  if (selection) {
    lines.push('');
    lines.push('This run: ' + selection.total + ' words in scope; ' + selection.stored + ' already in the store; ' + selection.failedBefore +
      ' failed the checks before; ' + selection.left + ' left; ' + selection.todo.length + ' to do now.');
  }
  return lines.join('\n');
}

function reviewText(work, store, when) {
  const lines = ['Word Sounds word audio: words for a person to review', 'Written by dev-tools/build_word_sounds_word_audio.cjs on ' + when + '.',
    'Tab-separated: stage, word, note. Unless a section says otherwise, its words have no clip in this store.', ''];
  const failed = store ? store.failedWords() : {};
  const failedKeys = Object.keys(failed).sort();
  lines.push('== Voiced but failed the automatic checks, twice: ' + failedKeys.length + ' ==');
  for (const word of failedKeys) lines.push(['', word, failed[word]].join('\t'));
  const other = store ? store.otherForms() : {};
  if (Object.keys(other).length) {
    lines.push('', '== IN the store, but voiced from the second text form after the first try failed a check (listen to these first): ' + Object.keys(other).length + ' ==');
    for (const word of Object.keys(other).sort()) lines.push(['', word, other[word]].join('\t'));
  }
  for (const reason of ['pronunciations', 'culled', 'blocked', 'sounds-like-blocked', 'not-a-word', 'not-in-dictionary']) {
    const rows = work.held.filter(item => item.reason === reason);
    if (!rows.length) continue;
    lines.push('', '== Held back, ' + REASONS[reason] + ': ' + rows.length + ' ==');
    for (const item of rows) lines.push([item.stage, item.word, item.detail].join('\t'));
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Sound: the trim of the first bank, the measures, the checks
// ---------------------------------------------------------------------------
function assert(condition, message) { if (!condition) throw new Error(message); }

// The same cut as trimWav in dev-tools/build_word_sounds_syllable_audio.cjs (a test compares the two):
// silence is what stays under 1% of the clip's peak; 30 ms is kept before the first louder sample and
// 60 ms after the last; the new edges get 2 ms and 6 ms linear ramps. Nothing is made louder or quieter.
function trimWav(raw) {
  assert(raw.length >= 46 && raw.toString('ascii', 0, 4) === 'RIFF' && raw.toString('ascii', 36, 40) === 'data', 'Expected loader PCM WAV');
  assert(raw.readUInt16LE(20) === 1 && raw.readUInt16LE(22) === 1 && raw.readUInt16LE(34) === 16, 'Expected mono 16-bit PCM');
  const rate = raw.readUInt32LE(24), length = Math.min(raw.readUInt32LE(40), raw.length - 44) >> 1;
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(raw.readInt16LE(44 + i * 2)));
  assert(peak > 0, 'Silent source PCM');
  let first = 0, last = length - 1;
  while (first < last && Math.abs(raw.readInt16LE(44 + first * 2)) < peak * 0.01) first++;
  while (last > first && Math.abs(raw.readInt16LE(44 + last * 2)) < peak * 0.01) last--;
  const start = Math.max(0, first - Math.round(rate * 0.03));
  const end = Math.min(length, last + 1 + Math.round(rate * 0.06));
  const count = end - start;
  const wav = Buffer.alloc(44 + count * 2);
  raw.copy(wav, 0, 0, 44); wav.writeUInt32LE(36 + count * 2, 4); wav.writeUInt32LE(count * 2, 40);
  const fadeIn = Math.min(Math.round(rate * 0.002), Math.floor(count / 2));
  const fadeOut = Math.min(Math.round(rate * 0.006), Math.floor(count / 2));
  const samples = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    const gain = Math.min(1, i / fadeIn, (count - 1 - i) / fadeOut);
    samples[i] = Math.round(raw.readInt16LE(44 + (start + i) * 2) * gain);
    wav.writeInt16LE(samples[i], 44 + i * 2);
  }
  return { wav, samples, rate, sourceDurationSeconds: length / rate, trimmedLeadingSeconds: start / rate, trimmedTrailingSeconds: (length - end) / rate,
    // How much quiet the voice itself left around the word: none means the word ran into the edge of its buffer.
    sourceLeadSilenceSeconds: first / rate, sourceTailSilenceSeconds: (length - 1 - last) / rate };
}

// Measures of 16-bit mono samples, on a 0..1 scale. lead/tail = quiet (under 1% of peak) at each end.
function measurePcm(samples, rate) {
  const n = samples.length;
  let peakInt = 0, squares = 0, audible = 0, clipped = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(samples[i]);
    if (a > peakInt) peakInt = a;
    squares += samples[i] * samples[i];
    if (a > 327) audible++;
    if (a >= 32736) clipped++;
  }
  const floor = peakInt * 0.01;
  let first = 0, last = n - 1;
  while (first < last && Math.abs(samples[first]) < floor) first++;
  while (last > first && Math.abs(samples[last]) < floor) last--;
  const tail = Math.min(n, Math.round(rate * 0.03));
  let tailSquares = 0;
  for (let i = n - tail; i < n; i++) tailSquares += samples[i] * samples[i];
  return { durationSeconds: n / rate, sampleRate: rate, peak: peakInt / 32768, rms: n ? Math.sqrt(squares / n) / 32768 : 0,
    audibleSeconds: audible / rate, clippedFraction: n ? clipped / n : 0, leadSilenceSeconds: n ? first / rate : 0, tailSilenceSeconds: n ? (n - 1 - last) / rate : 0,
    tailRms: tail ? Math.sqrt(tailSquares / tail) / 32768 : 0 };
}

// How long a clip of the first bank is for a word of n sounds: a line fitted to its 1,053 dictionary
// words on 2026-11-11 (0.415 s + 0.046 s a sound; every one of them within -0.20 / +0.15 s of it).
const expectedSeconds = sounds => 0.415 + 0.046 * sounds;
// Loudness: the bank was never made louder or quieter, and the voice is steady: 20 bank clips measured
// 0.089 to 0.103 rms (peak 0.38 to 0.69), 20 new ones 0.093 +/- 0.003. A clip far outside that is not like the bank.
const GATES = Object.freeze({ minSeconds: 0.25, maxSeconds: 2.5, under: 0.28, over: 0.45, minPeak: 0.2, minRms: 0.05, maxRms: 0.16, minAudibleSeconds: 0.08,
  maxClippedFraction: 0.0005, maxTailRatio: 0.02, minSourceTailSeconds: 0.06, minSourceLeadSeconds: 0.01, encodedDurationSlack: 0.08 });

// The automatic checks on one trimmed clip. `trimmed` is what trimWav returned; `sounds` the word's sound count.
function checkClip(trimmed, sounds) {
  const m = measurePcm(trimmed.samples, trimmed.rate);
  const failures = [];
  const seconds = value => value.toFixed(2) + ' s';
  if (m.durationSeconds < GATES.minSeconds || m.durationSeconds > GATES.maxSeconds) failures.push('duration ' + seconds(m.durationSeconds) + ' is outside 0.25 to 2.5 s');
  else if (sounds > 0) {
    const expected = expectedSeconds(sounds);
    if (m.durationSeconds < expected - GATES.under || m.durationSeconds > expected + GATES.over) {
      failures.push('duration ' + seconds(m.durationSeconds) + ' is not plausible for ' + sounds + ' sounds (' + seconds(Math.max(GATES.minSeconds, expected - GATES.under)) + ' to ' + seconds(expected + GATES.over) + ')');
    }
  }
  if (m.peak < GATES.minPeak || m.rms < GATES.minRms || m.audibleSeconds < GATES.minAudibleSeconds) failures.push('silent or much quieter than the bank (peak ' + m.peak.toFixed(3) + ', rms ' + m.rms.toFixed(3) + ')');
  else if (m.rms > GATES.maxRms) failures.push('much louder than the bank (rms ' + m.rms.toFixed(3) + '; its clips are near 0.09)');
  if (m.clippedFraction > GATES.maxClippedFraction || m.peak >= 0.999) failures.push('clipping (' + (m.clippedFraction * 100).toFixed(2) + '% of samples at full scale)');
  if (m.peak > 0 && m.tailRms / m.peak > GATES.maxTailRatio) failures.push('the end is cut off (the last 30 ms are not quiet)');
  else if (trimmed.sourceTailSilenceSeconds < GATES.minSourceTailSeconds) failures.push('the end is cut off (the voice stopped ' + Math.round(trimmed.sourceTailSilenceSeconds * 1000) + ' ms after the last sound)');
  if (trimmed.sourceLeadSilenceSeconds < GATES.minSourceLeadSeconds) failures.push('the start is cut off (sound from the first sample)');
  return { ok: !failures.length, failures, measures: m };
}

// ffmpeg, as the syllable top-up ran it. Two small files in --work are reused for every word.
function createEncoder(work) {
  const wavPath = path.join(work, 'clip-' + process.pid + '.wav'), outPath = path.join(work, 'clip-' + process.pid + '.webm');
  return {
    encode(wav) {
      fs.writeFileSync(wavPath, wav);
      const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wavPath, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', outPath],
        { encoding: 'utf8', windowsHide: true, timeout: 120000 });
      if (result.status !== 0) throw new Error('ffmpeg failed: ' + String((result.error && result.error.message) || result.stderr || 'no message').trim());
      return fs.readFileSync(outPath);
    },
    close() { for (const file of [wavPath, outPath]) { try { fs.unlinkSync(file); } catch (_) { /* never made */ } } },
  };
}

// Any clip (a data URI or bytes) decoded by ffmpeg to 48 kHz mono and measured: for comparing banks.
function measureEncoded(clip) {
  const bytes = Buffer.isBuffer(clip) ? clip : Buffer.from(String(clip).slice(String(clip).indexOf(',') + 1), 'base64');
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', '48000', 'pipe:1'], { input: bytes, maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 120000 });
  if (result.status !== 0) throw new Error('ffmpeg could not decode the clip: ' + String(result.stderr || (result.error && result.error.message) || '').trim());
  const pcm = new Int16Array(result.stdout.buffer, result.stdout.byteOffset, result.stdout.length >> 1);
  return Object.assign(measurePcm(pcm, 48000), { bytes: bytes.length });
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------
class LowDiskError extends Error {
  constructor(free, need, where) {
    super('Only ' + (free / GIB).toFixed(2) + ' GB free on the disk of ' + where + ': this tool stops under ' + (need / GIB).toFixed(0) + ' GB. Free some space, then run again with --resume.');
    this.name = 'LowDiskError'; this.code = 'LOW_DISK';
  }
}
function freeBytesAt(dir) {
  let at = path.resolve(dir);
  while (!fs.existsSync(at)) { const up = path.dirname(at); if (up === at) break; at = up; }
  const stat = fs.statfsSync(at);
  return Number(stat.bavail) * Number(stat.bsize);
}
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

// The whole file goes to a temporary file beside the target, is flushed to the disk and read back,
// and only then takes the target's name. A failure at any point leaves the target as it was.
function atomicWrite(file, data, options = {}) {
  const fsx = options.fs || fs, retries = options.retries == null ? 8 : options.retries, sleep = options.sleep || sleepSync;
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  if (!bytes.length) throw new Error('Refusing to write an empty file: ' + file);
  const temporary = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  let fd = null, renamed = false;
  try {
    fd = fsx.openSync(temporary, 'wx');
    for (let offset = 0; offset < bytes.length;) {
      const wrote = fsx.writeSync(fd, bytes, offset, bytes.length - offset);
      if (!(wrote > 0)) throw new Error('Short write: ' + file);
      offset += wrote;
    }
    fsx.fsyncSync(fd);
    fsx.closeSync(fd); fd = null;
    const back = fsx.readFileSync(temporary);
    if (back.length !== bytes.length || !back.equals(bytes)) throw new Error('Short write (' + back.length + ' of ' + bytes.length + ' bytes reached the disk): ' + file);
    for (let attempt = 0; ; attempt++) {
      try { fsx.renameSync(temporary, file); renamed = true; break; }
      catch (error) {
        // OneDrive or antivirus may hold the old file open for a moment.
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= retries) throw error;
        sleep(Math.min(2000, 100 * 2 ** attempt));
      }
    }
  } finally {
    if (fd !== null) { try { fsx.closeSync(fd); } catch (_) { /* already closed */ } }
    if (!renamed) { try { fsx.unlinkSync(temporary); } catch (_) { /* never made */ } }
  }
  return bytes.length;
}

const shardOf = word => (/^[a-z]/.test(word) ? word.charAt(0) : '_');
const SHARD_FILE = /^([a-z_])\.json$/;
// The small files of dev-tools/repack_word_sounds_word_audio.cjs (s-01.json ...): not read here.
const REGROUPED_FILE = /^[a-z_]-\d{2,3}\.json$/;

// Opens (and, on flush, makes) the store folder. Shards are the record: the index is rebuilt from them.
function openStore(dir, options = {}) {
  const fsx = options.fs || fs;
  const freeBytes = options.freeBytes || (() => freeBytesAt(dir));
  const minFree = options.minFreeBytes == null ? MIN_FREE_BYTES : options.minFreeBytes;
  const now = options.now || (() => new Date());
  const meta = Object.assign({}, ENGINE, { textForm: options.textForm || DEFAULT_FORM });
  const shards = new Map();
  // failed: word -> why its clip was refused. otherForm: word -> the text form used when it was not the store's own.
  let failed = Object.create(null), otherForm = Object.create(null), started = null, dirtyIndex = false;
  if (fsx.existsSync(dir)) {
    // A regrouped store would look empty here, and --resume would voice every word again.
    const regrouped = fsx.readdirSync(dir).filter(name => REGROUPED_FILE.test(name)).sort();
    if (regrouped.length) {
      throw new Error('The store ' + dir + ' is regrouped into small files (' + regrouped.slice(0, 3).join(', ') + (regrouped.length > 3 ? ', ...' : '') +
        '), which this tool does not read. Run node dev-tools/repack_word_sounds_word_audio.cjs --per-letter' + (path.resolve(dir) === DEFAULT_OUT ? '' : ' --store ' + dir) +
        ' first, then regroup again after this run.');
    }
    for (const name of fsx.readdirSync(dir)) {
      const hit = SHARD_FILE.exec(name);
      if (!hit) continue;
      const file = path.join(dir, name);
      let data;
      try { data = JSON.parse(fsx.readFileSync(file, 'utf8')); }
      catch (error) { throw new Error('Shard ' + file + ' is not readable JSON (' + error.message + '). Move it away before running: this tool will not write over it.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data) || !data._meta || data._meta.format !== SHARD_FORMAT) throw new Error('Shard ' + file + ' is not a ' + SHARD_FORMAT + ' file. Move it away before running.');
      const words = {};
      for (const word of Object.keys(data)) {
        if (word === '_meta') continue;
        if (typeof data[word] !== 'string' || !data[word].startsWith(URI_PREFIX) || shardOf(word) !== hit[1]) throw new Error('Shard ' + file + ' has an entry that does not belong: ' + word);
        words[word] = data[word];
      }
      shards.set(hit[1], { words, dirty: false, bytes: fsx.statSync(file).size });
    }
    const indexFile = path.join(dir, 'index.json');
    if (fsx.existsSync(indexFile)) {
      try {
        const index = JSON.parse(fsx.readFileSync(indexFile, 'utf8'));
        if (index && index.failed && typeof index.failed === 'object') Object.assign(failed, index.failed);
        if (index && index.otherTextForm && typeof index.otherTextForm === 'object') Object.assign(otherForm, index.otherTextForm);
        if (index && typeof index.started === 'string') started = index.started;
      } catch (_) { dirtyIndex = true; /* rebuilt from the shards at the next flush */ }
    }
  }
  const has = word => { const shard = shards.get(shardOf(word)); return !!shard && Object.prototype.hasOwnProperty.call(shard.words, word); };
  for (const word of Object.keys(failed)) if (has(word)) delete failed[word];
  for (const word of Object.keys(otherForm)) if (!has(word)) delete otherForm[word];
  const count =() => { let n = 0; for (const shard of shards.values()) n += Object.keys(shard.words).length; return n; };
  const ensureFree = () => { const free = freeBytes(); if (free < minFree) throw new LowDiskError(free, minFree, dir); return free; };
  const sorted = object => Object.keys(object).sort().reduce((out, key) => { out[key] = object[key]; return out; }, {});
  function indexObject() {
    const words = {}, files = {};
    let bytes = 0;
    for (const name of Array.from(shards.keys()).sort()) {
      const shard = shards.get(name), keys = Object.keys(shard.words);
      if (!keys.length) continue;
      files[name] = { file: name + '.json', words: keys.length, bytes: shard.bytes };
      bytes += shard.bytes;
      for (const word of keys) words[word] = name;
    }
    return Object.assign({ format: INDEX_FORMAT, started: started, updated: now().toISOString() }, meta, { humanReviewed: false,
      note: 'Machine-made word clips for Word Sounds, one file per first letter. Only the words of THIS store are listed: the recorded bank and word_audio_kokoro_bank.json keep their own. ' +
        'To use a word: read shards[words[word]].file and take its entry (a webm/opus data URI). Automatic checks passed; no person has listened.',
      counts: { words: Object.keys(words).length, shards: Object.keys(files).length, bytes: bytes, failed: Object.keys(failed).length },
      shards: files, words: sorted(words), otherTextForm: sorted(otherForm), failed: sorted(failed) });
  }
  return {
    dir, has, count,
    get: word => (has(word) ? shards.get(shardOf(word)).words[word] : null),
    words: () => { const out = []; for (const shard of shards.values()) out.push(...Object.keys(shard.words)); return out.sort(); },
    failedReason: word => failed[word] || '',
    failedWords: () => Object.assign({}, failed),
    otherForms: () => Object.assign({}, otherForm),
    dirty: () => dirtyIndex || Array.from(shards.values()).some(shard => shard.dirty),
    add(word, uri, form) {
      if (typeof uri !== 'string' || !uri.startsWith(URI_PREFIX) || uri.length < URI_PREFIX.length + 400) throw new Error('Not a webm clip for ' + word);
      const name = shardOf(word);
      if (!shards.has(name)) shards.set(name, { words: {}, dirty: false, bytes: 0 });
      const shard = shards.get(name);
      shard.words[word] = uri; shard.dirty = true;
      delete failed[word];
      if (form && form !== meta.textForm) otherForm[word] = form; else delete otherForm[word];
      dirtyIndex = true;
    },
    fail(word, reason) { if (!has(word)) { failed[word] = String(reason); dirtyIndex = true; } },
    ensureFree,
    // Writes every changed shard, then the index, then the review file; nothing when nothing changed.
    // Throws LowDiskError before touching anything when the disk is under the limit; what is in
    // memory stays for a later flush.
    flush(review) {
      const dirtyShards = Array.from(shards.keys()).filter(name => shards.get(name).dirty).sort();
      if (!dirtyShards.length && !dirtyIndex) return [];
      ensureFree();
      fsx.mkdirSync(dir, { recursive: true });
      if (!started) started = now().toISOString();
      const written = [];
      for (const name of dirtyShards) {
        const shard = shards.get(name), keys = Object.keys(shard.words).sort();
        const body = { _meta: Object.assign({ format: SHARD_FORMAT, shard: name, words: keys.length, updated: now().toISOString() }, meta, { humanReviewed: false }) };
        for (const word of keys) body[word] = shard.words[word];
        ensureFree();
        shard.bytes = atomicWrite(path.join(dir, name + '.json'), JSON.stringify(body), { fs: fsx, sleep: options.sleep, retries: options.retries });
        shard.dirty = false;
        written.push(name + '.json');
      }
      ensureFree();
      atomicWrite(path.join(dir, 'index.json'), JSON.stringify(indexObject(), null, 1) + '\n', { fs: fsx, sleep: options.sleep, retries: options.retries });
      dirtyIndex = false;
      written.push('index.json');
      if (review != null) { atomicWrite(path.join(dir, 'review.txt'), review, { fs: fsx, sleep: options.sleep, retries: options.retries }); written.push('review.txt'); }
      return written;
    },
    // Temporary files a killed run left behind (never a shard: their names end in .tmp).
    sweep() {
      if (!fsx.existsSync(dir)) return 0;
      let removed = 0;
      for (const name of fsx.readdirSync(dir)) if (/^(?:[a-z_]|index)\.json\.\d+\.[0-9a-f]{8}\.tmp$|^review\.txt\.\d+\.[0-9a-f]{8}\.tmp$/.test(name)) { try { fsx.unlinkSync(path.join(dir, name)); removed++; } catch (_) { /* in use */ } }
      return removed;
    },
    index: indexObject,
  };
}

// The words of a store's index: what dev-tools/build_word_sounds_wordlist.cjs flags as having a clip.
function readIndexWords(indexFile) {
  if (!fs.existsSync(indexFile)) return [];
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  if (!index || index.format !== INDEX_FORMAT || !index.words || typeof index.words !== 'object') throw new Error('Not a ' + INDEX_FORMAT + ' file: ' + indexFile);
  return Object.keys(index.words).map(clean).filter(Boolean).sort();
}

// ---------------------------------------------------------------------------
// The engine: the app's Kokoro loader in a headless browser, fed from this repo
// ---------------------------------------------------------------------------
class EngineError extends Error { constructor(message) { super(message); this.name = 'EngineError'; } }
function withTimeout(promise, ms, what) {
  let timer;
  const late = new Promise((_, reject) => { timer = setTimeout(() => reject(new EngineError(what + ' took longer than ' + Math.round(ms / 1000) + ' s')), ms); });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}
const HUGGING_FACE = host => host === 'huggingface.co' || host.endsWith('.huggingface.co') || host === 'hf.co' || host.endsWith('.hf.co');

function createEngine(options) {
  const root = options.root || ROOT, work = options.work, browserName = options.browser || DEFAULT_BROWSER, port = options.port || DEFAULT_PORT;
  const log = options.log || (() => {});
  const minFree = options.minFreeBytes == null ? MIN_FREE_BYTES : options.minFreeBytes;
  const origin = 'http://127.0.0.1:' + port;
  const profileName = 'wswa-profile-' + browserName;
  const profile = path.join(work, profileName), cacheDir = path.join(work, 'model-cache');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'engine_runtime_integrity.json'), 'utf8'));
  const served = new Map([['/app/kokoro_tts_loader.js', 'kokoro_tts_loader.js'], ['/app/runtime_graph_delivery_policy.js', 'runtime_graph_delivery_policy.js'], ['/app/runtime_graph_host.js', 'runtime_graph_host.js']]);
  for (const id of manifest.graphs.kokoro.assets) served.set('/app/' + manifest.assets[id].path, manifest.assets[id].path);
  const lanes = Math.max(1, Math.min(4, options.lanes || 1));
  let server = null, context = null, pages = [], lastConsole = '';
  const state = { loadSeconds: 0, starts: 0, outside: new Set(), blocked: new Set(), modelFromDisk: 0, modelSaved: 0 };

  const cacheFile = url => path.join(cacheDir, crypto.createHash('sha256').update(url).digest('hex'));
  function handle(req, res) {
    const url = new URL(req.url, origin);
    if (url.pathname === '/app/' && req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word Sounds word audio build</title></head><body>Local speech generation</body></html>');
      return;
    }
    // The saved voice model: the loader asks its host for the big model files before the network.
    if (url.pathname === '/__model_cache__') {
      const target = url.searchParams.get('u') || '';
      const file = cacheFile(target);
      if (req.method === 'GET') {
        if (!target || !fs.existsSync(file + '.bin') || !fs.statSync(file + '.bin').size) { res.statusCode = 404; res.end(); return; }
        let type = 'application/octet-stream';
        try { type = JSON.parse(fs.readFileSync(file + '.json', 'utf8')).contentType || type; } catch (_) { /* default */ }
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Length', fs.statSync(file + '.bin').size);
        state.modelFromDisk++;
        fs.createReadStream(file + '.bin').pipe(res);
        return;
      }
      if (req.method === 'PUT') {
        let host = '';
        try { host = new URL(target).hostname; } catch (_) { /* refused below */ }
        if (!HUGGING_FACE(host) || freeBytesAt(work) < minFree) { res.statusCode = 507; res.end(); req.resume(); return; }
        fs.mkdirSync(cacheDir, { recursive: true });
        const temporary = file + '.' + process.pid + '.tmp';
        const out = fs.createWriteStream(temporary);
        let size = 0;
        req.on('data', chunk => { size += chunk.length; });
        req.pipe(out);
        const fail = () => { try { out.destroy(); fs.unlinkSync(temporary); } catch (_) { /* gone */ } if (!res.headersSent) { res.statusCode = 500; res.end(); } };
        req.on('error', fail); out.on('error', fail);
        out.on('finish', () => {
          try {
            if (!size || fs.statSync(temporary).size !== size) throw new Error('short');
            fs.renameSync(temporary, file + '.bin');
            fs.writeFileSync(file + '.json', JSON.stringify({ url: target, contentType: url.searchParams.get('t') || '', bytes: size, saved: new Date().toISOString() }));
            state.modelSaved++;
            res.statusCode = 204; res.end();
          } catch (_) { fail(); }
        });
        return;
      }
    }
    const local = req.method === 'GET' && !url.search ? served.get(url.pathname) : null;
    if (!local) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', /\.wasm$/.test(local) ? 'application/wasm' : 'text/javascript; charset=utf-8');
    fs.createReadStream(path.join(root, local)).on('error', () => { res.statusCode = 500; res.end(); }).pipe(res);
  }
  function listen() {
    if (server) return Promise.resolve();
    return new Promise((resolve, reject) => {
      server = http.createServer(handle);
      server.once('error', error => { server = null; reject(new Error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is in use: is another run of this tool going? (or pass --port)' : error.message)); });
      server.listen(port, '127.0.0.1', resolve);
    });
  }
  async function start() {
    const { chromium } = require('playwright');
    await listen();
    fs.mkdirSync(profile, { recursive: true });
    const launch = { headless: true, timeout: 180000, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, serviceWorkers: 'block',
      args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] };
    if (browserName !== 'chromium') launch.channel = browserName;
    try { context = await chromium.launchPersistentContext(profile, launch); }
    catch (error) { throw new EngineError('The browser "' + browserName + '" did not start: ' + String(error.message).split('\n')[0]); }
    // Engine code comes only from this repo; the only outside address is Hugging Face, for the model, by GET.
    // (A request still in flight when the browser closes makes these calls fail: that is not an error.)
    await context.route('**/*', route => {
      const request = route.request(), quiet = () => {};
      let url;
      try { url = new URL(request.url()); } catch (_) { return route.abort().catch(quiet); }
      if (url.origin === origin) return route.continue().catch(quiet);
      if (request.method() === 'GET' && url.protocol === 'https:' && HUGGING_FACE(url.hostname)) { state.outside.add(url.hostname); return route.continue().catch(quiet); }
      state.blocked.add(url.origin);
      return route.abort().catch(quiet);
    });
    // One page a lane: each has its own worker and its own copy of the model, exactly as one app tab has.
    try {
      const began = Date.now();
      for (let lane = 0; lane < lanes; lane++) {
        const page = (lane === 0 && context.pages()[0]) || await context.newPage();
        page.on('pageerror', error => log('Browser error: ' + String(error.message).slice(0, 300)));
        page.on('console', message => {
          const text = message.text();
          if (/Kokoro TTS\]|Verified runtime/i.test(text) && text !== lastConsole) { lastConsole = text; if (options.verbose || /fail|error|stall|retry|Repairing/i.test(text)) log('  ' + text.slice(0, 220)); }
        });
        await page.goto(origin + '/app/');
        await page.addScriptTag({ url: '/app/runtime_graph_delivery_policy.js' });
        await page.addScriptTag({ url: '/app/runtime_graph_host.js' });
        await page.evaluate(graphs => {
          window._alloInstallRuntimeGraphHost(graphs, window);
          window.AlloModules = window.AlloModules || {};
          window.AlloModules.AlloCommands = { modelCache: {
            match: async url => { const reply = await fetch('/__model_cache__?u=' + encodeURIComponent(url)); return reply.ok ? reply : null; },
            put: async (url, buffer, contentType) => {
              const reply = await fetch('/__model_cache__?u=' + encodeURIComponent(url) + '&t=' + encodeURIComponent(contentType || ''), { method: 'PUT', body: buffer });
              if (!reply.ok) throw new Error('The model was not saved');
            },
          } };
        }, manifest);
        await page.addScriptTag({ url: '/app/kokoro_tts_loader.js' });
        // First use downloads 88 MB; the loader has its own stall watchdog and one retry.
        await withTimeout(page.evaluate(() => window._kokoroTTS.init()), 20 * 60000, 'Loading the voice model');
        pages.push(page);
      }
      state.loadSeconds = (Date.now() - began) / 1000;
      state.starts++;
    } catch (error) {
      await stopBrowser();
      throw error instanceof EngineError ? error : new EngineError('The voice did not start: ' + String(error.message).split('\n')[0]);
    }
  }
  async function stopBrowser() {
    const closing = context;
    context = null; pages = [];
    if (closing) { try { await withTimeout(closing.close(), 30000, 'Closing the browser'); } catch (_) { /* already gone */ } }
  }
  async function stop() {
    await stopBrowser();
    if (server) { const closing = server; server = null; await new Promise(resolve => { closing.close(() => resolve()); if (closing.closeAllConnections) closing.closeAllConnections(); }); }
  }
  async function evaluate(lane, fn, argument, ms, what) {
    const page = pages[(lane || 0) % Math.max(1, pages.length)];
    if (!page) throw new EngineError('The browser is not running');
    try { return await withTimeout(page.evaluate(fn, argument), ms, what); }
    catch (error) { throw error instanceof EngineError ? error : new EngineError(String(error.message).split('\n')[0]); }
  }
  // One word (or any short text) -> the loader's WAV bytes: 24 kHz, 16-bit, mono, untrimmed.
  async function synth(text, lane) {
    const base64 = await evaluate(lane, async input => {
      const url = await window._kokoroTTS.speak(input.text, input.voice, input.speed, { force: true });
      if (!url) throw new Error('Local speech generation failed: ' + input.text);
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
      try { window._kokoroTTS.invalidateUrl(url); } catch (_) { /* the loader keeps at most 100 */ }
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 16384));
      return btoa(binary);
    }, { text, voice: ENGINE.voice, speed: ENGINE.speed }, options.wordTimeoutMs || 180000, 'Voicing "' + text + '"');
    return Buffer.from(base64, 'base64');
  }
  // The finished clip decoded by the browser itself: what a learner's browser will be asked to do.
  function decodeCheck(uri, lane) {
    return evaluate(lane, async clip => {
      const bytes = await (await fetch(clip)).arrayBuffer();
      const decoded = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes);
      const samples = decoded.getChannelData(0);
      let squares = 0, peak = 0;
      for (let i = 0; i < samples.length; i++) { squares += samples[i] * samples[i]; if (Math.abs(samples[i]) > peak) peak = Math.abs(samples[i]); }
      return { durationSeconds: decoded.duration, sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, peak: peak, rms: Math.sqrt(squares / Math.max(1, samples.length)) };
    }, uri, 60000, 'Decoding a clip');
  }
  // One restart at a time: lanes that ask while one is under way wait for that one.
  let restarting = null;
  const restart = () => restarting || (restarting = (async () => { await stopBrowser(); await start(); })().finally(() => { restarting = null; }));
  return { start, stop, synth, decodeCheck, restart, state, profileName, name: browserName, origin, lanes };
}

// Windows: the browser's processes, by the profile folder in their command line. Sets each to
// below-normal priority and returns how many there are and their working sets added up.
function tendProcesses(token) {
  if (process.platform !== 'win32') return null;
  const script = "$p = @(Get-CimInstance Win32_Process -Filter \"CommandLine LIKE '%" + token + "%'\"); $sum = 0; foreach ($x in $p) { $sum += $x.WorkingSetSize; " +
    "try { (Get-Process -Id $x.ProcessId -ErrorAction Stop).PriorityClass = 'BelowNormal' } catch {} }; Write-Output ('{0} {1}' -f $p.Count, $sum)";
  try {
    const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    const hit = /(\d+) (\d+)/.exec(result.stdout || '');
    return hit ? { processes: Number(hit[1]), workingSetBytes: Number(hit[2]) } : null;
  } catch (_) { return null; }
}

// Windows: ask the system not to sleep while this process lives. The helper ends when we do.
function keepAwake() {
  if (process.platform !== 'win32') return null;
  const script = "$t = Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);' -Name Awake -Namespace WsWordAudio -PassThru; " +
    'while (Get-Process -Id ' + process.pid + ' -ErrorAction SilentlyContinue) { [void]$t::SetThreadExecutionState(2147483649); Start-Sleep -Seconds 20 }';
  try {
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
    return child;
  } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
// One word: voice, trim, check; on a failed check, once more with the other text form. Returns
// { ok, uri, bytes, measures, form, attempts, failures }. Engine trouble is thrown as EngineError.
async function voiceWord(entry, deps, options, lane) {
  const failures = [];
  const forms = [options.form || DEFAULT_FORM, options.retryForm || RETRY_FORM[options.form || DEFAULT_FORM]];
  for (let attempt = 0; attempt < 2; attempt++) {
    const form = forms[attempt], note = problem => failures.push('try ' + (attempt + 1) + ' (' + form + '): ' + problem);
    const raw = await deps.engine.synth(FORMS[form](entry.word), lane);
    let trimmed;
    try { trimmed = trimWav(raw); } catch (error) { note(error.message); continue; }
    const checked = checkClip(trimmed, entry.sounds);
    if (!checked.ok) { note(checked.failures.join('; ')); continue; }
    const webm = deps.encode(trimmed.wav);
    if (webm.length < 800 || webm.length > 60000) { note('the encoded clip is ' + webm.length + ' bytes'); continue; }
    const uri = URI_PREFIX + webm.toString('base64');
    if (typeof deps.engine.decodeCheck === 'function') {
      let decoded = null;
      try { decoded = await deps.engine.decodeCheck(uri, lane); } catch (error) { if (error instanceof EngineError && /longer than|not running/.test(error.message)) throw error; note('the browser could not decode the encoded clip'); continue; }
      if (decoded.channels !== 1 || Math.abs(decoded.durationSeconds - checked.measures.durationSeconds) > GATES.encodedDurationSlack || decoded.peak < GATES.minPeak * 0.6) {
        note('the encoded clip decodes to ' + decoded.durationSeconds.toFixed(2) + ' s, peak ' + decoded.peak.toFixed(3) + ', ' + decoded.channels + ' channel(s)');
        continue;
      }
    }
    return { ok: true, uri, bytes: webm.length, form, attempts: attempt + 1, failures, measures: Object.assign({}, checked.measures, {
      sourceDurationSeconds: trimmed.sourceDurationSeconds, sourceLeadSilenceSeconds: trimmed.sourceLeadSilenceSeconds, sourceTailSilenceSeconds: trimmed.sourceTailSilenceSeconds }) };
  }
  return { ok: false, attempts: 2, failures };
}

const clock = date => date.toTimeString().slice(0, 8);
function duration(seconds) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min' : minutes + ' min';
}
const median = values => { const sorted = values.slice().sort((a, b) => a - b); return sorted.length ? sorted[sorted.length >> 1] : 0; };

// The loop. deps: { engine, encode, store, log, stopRequested, freeBytes, now, tend, review }. Everything
// that touches the machine comes in through deps, so a test runs this with a pretend engine.
// options.lanes > 1 voices that many words at once (one browser page each); the bookkeeping below runs
// between awaits on one thread, so the store and the counters need no locks.
async function run(todo, options, deps) {
  const { engine, store, log } = deps;
  const now = deps.now || (() => Date.now());
  const minFree = options.minFreeBytes == null ? MIN_FREE_BYTES : options.minFreeBytes;
  const shardEvery = options.shardEvery || SHARD_EVERY, logEvery = options.logEvery || LOG_EVERY;
  const lanes = Math.max(1, Math.min(4, options.lanes || 1));
  const result = { planned: todo.length, voiced: 0, failed: 0, skipped: 0, processed: 0, retried: 0, engineRestarts: 0, stoppedBecause: '', exitCode: 0, lanes,
    seconds: [], clipBytes: [], clipSeconds: [], failures: [], engineSkipped: [], words: [], peakWorkingSetBytes: 0, flushes: 0 };
  let sinceFlush = 0, failuresInARow = 0, engineTroubleInARow = 0, saveTroubleInARow = 0, cursor = 0, halted = false, restarting = null;
  const began = now();
  const halt = (reason, code) => { halted = true; if (!result.stoppedBecause) { result.stoppedBecause = reason; result.exitCode = code || 0; } };
  const stopAsked = () => !!(deps.stopRequested && deps.stopRequested());
  const flush = () => { const written = store.flush(deps.review ? deps.review() : undefined); if (written.length) result.flushes++; sinceFlush = 0; return written; };
  // One restart for all lanes: a lane whose word died because another lane is restarting waits for that restart.
  const restartEngine = () => restarting || (restarting = Promise.resolve().then(() => engine.restart()).then(() => true, error => { halt('the browser would not restart: ' + error.message, 4); return false; })
    .finally(() => { restarting = null; }));
  const progress = last => {
    const elapsed = (now() - began) / 1000, rate = result.processed / Math.max(1, elapsed), left = todo.length - result.processed;
    const sample = deps.tend ? deps.tend() : null;
    if (sample && sample.workingSetBytes > result.peakWorkingSetBytes) result.peakWorkingSetBytes = sample.workingSetBytes;
    log(result.processed + ' / ' + todo.length + ' done (' + (100 * result.processed / Math.max(1, todo.length)).toFixed(1) + '%), ' + (rate * 60).toFixed(1) + ' words a minute, ' +
      (left && rate ? 'finish about ' + clock(new Date(now() + 1000 * left / rate)) + ' (' + duration(left / rate) + ' left)' : 'finished') + ', failures ' + result.failed +
      ', in the store ' + store.count() + (last ? ', at "' + last.word + '" (' + last.stage + ')' : '') +
      (sample ? ', browser memory ' + (sample.workingSetBytes / GIB).toFixed(2) + ' GB' : '') + (deps.freeBytes ? ', disk free ' + (deps.freeBytes() / GIB).toFixed(1) + ' GB' : ''));
  };
  async function lane(id) {
    while (!halted) {
      if (stopAsked()) { halt('stopped by the user'); break; }
      if (deps.freeBytes && deps.freeBytes() < minFree) { halt(new LowDiskError(deps.freeBytes(), minFree, store.dir).message, 3); break; }
      if (restarting) { await restarting; continue; }
      if (cursor >= todo.length) break;
      const entry = todo[cursor++];
      const t0 = now();
      let voiced = null;
      for (let engineTry = 0; !voiced && !halted; engineTry++) {
        try { voiced = await voiceWord(entry, deps, options, id); engineTroubleInARow = 0; }
        catch (error) {
          if (stopAsked()) break;
          if (!(error instanceof EngineError)) throw error;
          // Another lane is already restarting the browser: that is why this word died. Wait, and it does not count.
          if (restarting) { await restarting; engineTry--; continue; }
          if (engineTry >= 1) { voiced = { ok: false, engine: true, attempts: 2, failures: ['the speech engine failed twice on this word: ' + error.message] }; break; }
          log('Engine trouble at "' + entry.word + '": ' + error.message + '. Restarting the browser.');
          result.engineRestarts++;
          await restartEngine();
        }
      }
      if (!voiced) { if (!halted) halt('stopped by the user'); break; }
      result.processed++;
      result.seconds.push((now() - t0) / 1000);
      if (voiced.ok) {
        store.add(entry.word, voiced.uri, voiced.form);
        result.voiced++; sinceFlush++; failuresInARow = 0;
        if (voiced.attempts > 1) result.retried++;
        result.clipBytes.push(voiced.bytes); result.clipSeconds.push(voiced.measures.durationSeconds);
        result.words.push({ word: entry.word, stage: entry.stage, sounds: entry.sounds, form: voiced.form, bytes: voiced.bytes, seconds: Number(((now() - t0) / 1000).toFixed(2)),
          durationSeconds: Number(voiced.measures.durationSeconds.toFixed(3)), peak: Number(voiced.measures.peak.toFixed(3)), rms: Number(voiced.measures.rms.toFixed(4)),
          leadSilenceSeconds: Number(voiced.measures.leadSilenceSeconds.toFixed(3)), tailSilenceSeconds: Number(voiced.measures.tailSilenceSeconds.toFixed(3)),
          sourceTailSilenceSeconds: Number(voiced.measures.sourceTailSilenceSeconds.toFixed(3)), retriedBecause: voiced.failures.length ? voiced.failures : undefined });
      } else if (voiced.engine) {
        // Not the word's fault: it is not written down as failed, so --resume voices it again.
        result.skipped++; engineTroubleInARow++;
        result.engineSkipped.push(entry.word);
        log('Skipped for now: "' + entry.word + '": ' + voiced.failures.join(' / '));
      } else {
        const reason = voiced.failures.join(' / ');
        store.fail(entry.word, reason);
        result.failed++; failuresInARow++;
        result.failures.push({ word: entry.word, stage: entry.stage, reason });
        log('Not stored: "' + entry.word + '": ' + reason);
      }
      if (sinceFlush >= shardEvery) {
        try { flush(); saveTroubleInARow = 0; }
        catch (error) {
          if (error instanceof LowDiskError) { halt(error.message, 3); break; }
          // A file held by OneDrive or antivirus for longer than the retries: the clips stay in memory
          // and the next save takes them along. Four misses in a row end the run.
          saveTroubleInARow++; sinceFlush = Math.max(0, shardEvery - 10);
          log('Could not save yet (' + error.message + '): trying again in a few words.');
          if (saveTroubleInARow >= 4) { halt('saving kept failing: ' + error.message, 1); break; }
        }
      }
      if (result.processed % logEvery === 0) progress(entry);
      if (engineTroubleInARow >= 3) { halt('the speech engine failed on 3 words in a row', 4); break; }
      if (failuresInARow >= (options.maxFailuresInARow || 20)) { halt(failuresInARow + ' words in a row failed the checks: something is wrong with the voice, not the words', 4); break; }
      // A fresh browser now and then keeps a long night from piling up memory.
      if (options.recycle > 0 && result.processed % options.recycle === 0 && cursor < todo.length && !halted && !stopAsked()) await restartEngine();
    }
  }
  const guarded = id => lane(id).catch(error => { halt('an error: ' + error.message, error instanceof LowDiskError ? 3 : 1); });
  await Promise.all(Array.from({ length: Math.min(lanes, Math.max(1, todo.length)) }, (_, id) => guarded(id)));
  try { flush(); }
  catch (error) {
    if (!result.stoppedBecause || result.exitCode === 0) { result.stoppedBecause = error.message; result.exitCode = error instanceof LowDiskError ? 3 : 1; }
    result.unsaved = true;
  }
  result.elapsedSeconds = (now() - began) / 1000;
  if (result.processed % logEvery !== 0) progress(null);
  return result;
}

function parseArgs(argv) {
  const args = {};
  const flags = ['plan', 'dry', 'resume', 'retry-failed', 'include-review', 'no-keep-awake', 'verbose', 'help'];
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!/^--[a-z-]+$/.test(name)) throw new Error('Unexpected argument: ' + name);
    const key = name.slice(2);
    if (flags.includes(key)) args[key] = true;
    else if (['limit', 'stage', 'only-list', 'out', 'work', 'browser', 'form', 'recycle', 'port', 'lanes'].includes(key)) {
      if (i + 1 >= argv.length) throw new Error('Missing value for ' + name);
      args[key] = argv[++i];
    } else throw new Error('Unknown option: ' + name);
  }
  const number = (key, fallback) => {
    if (args[key] == null) return fallback;
    if (!/^\d+$/.test(args[key])) throw new Error('--' + key + ' needs a whole number');
    return Number(args[key]);
  };
  const options = { plan: !!args.plan, dry: !!args.dry, resume: !!args.resume, retryFailed: !!args['retry-failed'], includeReview: !!args['include-review'],
    keepAwake: !args['no-keep-awake'], verbose: !!args.verbose, help: !!args.help, limit: number('limit', 0), stage: args.stage || '', onlyList: args['only-list'] || '',
    out: path.resolve(args.out || DEFAULT_OUT), work: path.resolve(args.work || DEFAULT_WORK), browser: args.browser || DEFAULT_BROWSER, form: args.form || DEFAULT_FORM,
    recycle: number('recycle', 500), port: number('port', DEFAULT_PORT), lanes: number('lanes', 1) };
  if (options.lanes < 1 || options.lanes > 4) throw new Error('--lanes is 1 to 4');
  if (!FORMS[options.form]) throw new Error('--form is one of ' + Object.keys(FORMS).join(', '));
  if (!['msedge', 'chrome', 'chromium'].includes(options.browser)) throw new Error('--browser is one of msedge, chrome, chromium');
  if (options.includeReview && !options.onlyList) throw new Error('--include-review needs --only-list: a person names the held words to voice');
  if (options.retryFailed && !options.resume) throw new Error('--retry-failed needs --resume');
  return options;
}

function takeLock(dir) {
  const file = path.join(dir, '.run.lock');
  try {
    const other = Number(fs.readFileSync(file, 'utf8'));
    let alive = false;
    try { alive = other > 0 && other !== process.pid && (process.kill(other, 0), true); } catch (error) { alive = error.code === 'EPERM'; }
    if (alive) throw new Error('Another run (process ' + other + ') is writing ' + dir + '. Wait for it, or stop it first. (If process ' + other + ' is not this tool, delete ' + file + '.)');
  } catch (error) { if (error.code !== 'ENOENT' && !/ENOENT/.test(error.message)) { if (/Another run/.test(error.message)) throw error; } }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, String(process.pid));
  return () => { try { if (Number(fs.readFileSync(file, 'utf8')) === process.pid) fs.unlinkSync(file); } catch (_) { /* gone */ } };
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 37).map(line => line.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
  const parts = loadParts(ROOT);
  let work = buildWorkList(parts);
  const full = work;
  let listNote = '';
  if (options.onlyList) {
    const listed = readWordFile(path.resolve(options.onlyList));
    const narrowed = applyOnlyList(work, parts, listed, options.includeReview);
    work = Object.assign({}, work, { entries: narrowed.entries, held: narrowed.held });
    listNote = '--only-list: ' + listed.length + ' words named; ' + narrowed.entries.length + ' can be voiced' + (narrowed.entries.some(entry => entry.lifted) ? ' (' + narrowed.entries.filter(entry => entry.lifted).length + ' of them lifted from the review list)' : '') +
      '; ' + narrowed.held.length + ' held for review' + (narrowed.held.length ? ' (' + narrowed.held.map(item => item.word + ': ' + item.reason).slice(0, 12).join(', ') + (narrowed.held.length > 12 ? ', ...' : '') + ')' : '') +
      '; ' + narrowed.skipped.hasClip.length + ' already have a clip in a bank.';
  }
  const store = openStore(options.out, { textForm: options.form });
  const selection = selectWork(work, options, store);
  console.log(planText(full, selection));
  if (listNote) console.log(listNote);
  console.log('Store: ' + options.out + ' (' + store.count() + ' words now). Text form: ' + options.form + '. Browser: ' + options.browser + '.');
  if (options.plan) return 0;

  const free = freeBytesAt(options.out);
  const ffmpeg = (() => { try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0; } catch (_) { return false; } })();
  if (options.dry) {
    console.log('\n--dry: nothing is voiced or written.');
    console.log('Would voice ' + selection.todo.length + ' words' + (selection.todo.length ? ', starting with: ' + selection.todo.slice(0, 25).map(entry => entry.word).join(' ') : '') + '.');
    console.log('Disk free: ' + (free / GIB).toFixed(1) + ' GB (stops under ' + MIN_FREE_BYTES / GIB + ' GB). ffmpeg on PATH: ' + (ffmpeg ? 'yes' : 'NO') + '. Work folder: ' + options.work + '.');
    if (store.count() && !options.resume) console.log('The store already holds words: a real run needs --resume.');
    return 0;
  }
  if (store.count() && !options.resume) throw new Error('The store ' + options.out + ' already holds ' + store.count() + ' words. Pass --resume to carry on (stored words are skipped), or --out for another folder.');
  if (!ffmpeg) throw new Error('ffmpeg is not on PATH: it encodes the clips.');
  if (free < MIN_FREE_BYTES) throw new LowDiskError(free, MIN_FREE_BYTES, options.out);
  if (!selection.todo.length) { console.log('Nothing to do.'); return 0; }

  // Below-normal priority: the browser and ffmpeg are started from here and take the same class.
  try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (_) { /* not allowed: carry on */ }
  fs.mkdirSync(options.work, { recursive: true });
  const unlock = takeLock(options.out);
  const logFile = path.join(options.work, 'word_audio_run.log'), summaryFile = path.join(options.work, 'word_audio_summary.json');
  const log = line => {
    const text = '[' + clock(new Date()) + '] ' + line;
    console.log(text);
    try { fs.appendFileSync(logFile, text + '\n'); } catch (_) { /* a full disk must not stop the save */ }
  };
  store.sweep();
  let stop = false;
  const review = () => reviewText(work, store, new Date().toISOString());
  const onSignal = name => {
    if (!stop) log('Stop asked (' + name + '): finishing the current word, then saving. Run again with --resume to carry on.');
    stop = true;
    // Save what is finished right away: a closed console window gives a process only seconds.
    try { store.flush(review()); } catch (error) { log('Could not save yet: ' + error.message); }
  };
  for (const name of ['SIGINT', 'SIGBREAK', 'SIGHUP', 'SIGTERM']) process.on(name, () => onSignal(name));
  // A stray rejected promise from the browser layer (a page that died mid-call) must not end a night's
  // run: the loop's own time limits deal with the dead page. A real crash saves first, then ends.
  process.on('unhandledRejection', error => { log('Ignored a stray browser error: ' + String((error && error.message) || error).split('\n')[0]); });
  process.on('uncaughtException', error => {
    log('Unexpected error: ' + String((error && error.stack) || error));
    try { store.flush(review()); } catch (again) { log('Could not save: ' + again.message); }
    unlock();
    process.exit(1);
  });
  const awake = options.keepAwake ? keepAwake() : null;
  const engine = createEngine({ root: ROOT, work: options.work, browser: options.browser, port: options.port, lanes: options.lanes, log, verbose: options.verbose });
  const encoder = createEncoder(options.work);
  const startedAt = new Date();
  log('Run started: ' + selection.todo.length + ' words to voice (' + process.argv.slice(2).join(' ') + '). Log: ' + logFile);
  let result = null, fatal = null;
  try {
    await engine.start();
    const first = tendProcesses(engine.profileName);
    log('Voice ready in ' + engine.state.loadSeconds.toFixed(1) + ' s (' + options.browser + ', ' + options.lanes + (options.lanes > 1 ? ' lanes' : ' lane') + (first ? ', ' + first.processes + ' browser processes at below-normal priority' : '') +
      (engine.state.outside.size ? '; model fetched from ' + Array.from(engine.state.outside).join(', ') : '; no outside address was contacted') + ').');
    result = await run(selection.todo, { form: options.form, recycle: options.recycle, lanes: options.lanes }, { engine, encode: wav => encoder.encode(wav), store, log,
      stopRequested: () => stop, freeBytes: () => freeBytesAt(options.out), tend: () => tendProcesses(engine.profileName), review });
  } catch (error) { fatal = error; }
  try { await engine.stop(); } catch (_) { /* closing */ }
  encoder.close();
  if (awake) { try { awake.kill(); } catch (_) { /* gone */ } }
  if (fatal && store.dirty()) { try { store.flush(review()); } catch (error) { log('Could not save: ' + error.message); } }
  const seconds = result ? result.seconds : [];
  const summary = { tool: 'dev-tools/build_word_sounds_word_audio.cjs', started: startedAt.toISOString(), finished: new Date().toISOString(), arguments: process.argv.slice(2),
    out: options.out, work: options.work, log: logFile, browser: options.browser, engine: ENGINE, textForm: options.form, retryForm: RETRY_FORM[options.form],
    stoppedBecause: fatal ? fatal.message : (result.stoppedBecause || 'finished the list'), modelLoadSeconds: Number(engine.state.loadSeconds.toFixed(1)),
    outsideAddresses: Array.from(engine.state.outside), blockedAddresses: Array.from(engine.state.blocked), modelReadFromDisk: engine.state.modelFromDisk, modelSavedToDisk: engine.state.modelSaved,
    counts: result ? { planned: result.planned, processed: result.processed, voiced: result.voiced, failed: result.failed, retried: result.retried, engineRestarts: result.engineRestarts, shardWrites: result.flushes,
      skippedOnEngineTrouble: result.skipped, lanes: result.lanes, leftInScope: selection.left - result.voiced - result.failed } : null,
    speed: result && seconds.length ? { elapsedSeconds: Number(result.elapsedSeconds.toFixed(1)), secondsPerWordMean: Number((seconds.reduce((a, b) => a + b, 0) / seconds.length).toFixed(2)),
      secondsPerWordMedian: Number(median(seconds).toFixed(2)), wordsPerMinute: Number((result.processed / Math.max(1, result.elapsedSeconds) * 60).toFixed(1)) } : null,
    clips: result && result.clipBytes.length ? { bytesMin: Math.min(...result.clipBytes), bytesMedian: median(result.clipBytes), bytesMean: Math.round(result.clipBytes.reduce((a, b) => a + b, 0) / result.clipBytes.length),
      bytesMax: Math.max(...result.clipBytes), secondsMedian: Number(median(result.clipSeconds).toFixed(3)) } : null,
    peakBrowserWorkingSetBytes: result ? result.peakWorkingSetBytes : 0, store: { words: store.count(), bytes: store.index().counts.bytes, failed: Object.keys(store.failedWords()).length },
    failures: result ? result.failures : [], skippedOnEngineTrouble: result ? result.engineSkipped : [], words: result ? result.words : [] };
  try { atomicWrite(summaryFile, JSON.stringify(summary, null, 1) + '\n'); } catch (error) { log('Could not write the summary: ' + error.message); }
  unlock();
  if (fatal) { log('STOPPED: ' + fatal.message); return fatal instanceof LowDiskError ? 3 : 4; }
  log((result.exitCode ? 'STOPPED: ' : 'Done: ') + (result.stoppedBecause || 'finished the list') + '. Voiced ' + result.voiced + ', failed ' + result.failed + ', left ' + (selection.left - result.voiced - result.failed) +
    '. Store: ' + store.count() + ' words, ' + (store.index().counts.bytes / 1e6).toFixed(1) + ' MB. Summary: ' + summaryFile);
  if (result.unsaved) log('The last words were NOT saved (see above). They are voiced again on --resume.');
  return result.exitCode;
}

module.exports = { ROOT, DEFAULT_OUT, DEFAULT_WORK, ENGINE, FORMS, RETRY_FORM, GATES, REASONS, SHARD_FORMAT, INDEX_FORMAT, URI_PREFIX, MIN_FREE_BYTES, SHARD_EVERY, LOG_EVERY,
  loadParts, clipLookup, readCull, buildWorkList, applyOnlyList, selectWork, planText, reviewText, readWordFile,
  trimWav, measurePcm, checkClip, expectedSeconds, createEncoder, measureEncoded,
  LowDiskError, EngineError, freeBytesAt, atomicWrite, openStore, readIndexWords, shardOf,
  createEngine, tendProcesses, keepAwake, voiceWord, run, parseArgs, main };
if (require.main === module) {
  main(process.argv.slice(2)).then(code => { process.exit(code || 0); }, error => { console.error(error.message); process.exit(error instanceof LowDiskError ? 3 : 1); });
}
