#!/usr/bin/env node
'use strict';

// Try the packet builder from the command line: a Word Sounds practice file with no AI.
//   node dev-tools/make_word_sounds_packet.cjs --words "cat,dog,sun" --activities blending,segmentation,mapping --seed 7 --out packet.html
//   node dev-tools/make_word_sounds_packet.cjs --sound sh --position first --shape CVC --count 10 --stage "G1 early" --activities isolation,counting --out packet.html
// Other flags: --sounds 3  --spelling a_e  --max-rank 4000  --any-word (no recording needed)  --title "..."  --learner "..."
//   --length 10  --show-letters  --keep-webm (ship WebM clips as they are when ffmpeg is missing)
// WebM clips are converted to WAV with ffmpeg when it is on PATH.
// Words voiced into word_audio_shards/ are read too, by following that store's index (any file layout).
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file).replace(/^﻿/, ''));

function loadParts() {
  const dictionary = require(path.join(ROOT, 'word_sounds_phonemes_en.js'));
  const pronunciations = require(path.join(ROOT, 'word_sounds_pronunciations.js'));
  const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore(arguments[0]);')({ phonemes: dictionary, pronunciations });
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
  const loader = g.AlloWordSoundsTakeHome;
  if (!loader) throw new Error('The take-home loader did not register');
  const wordlist = require(path.join(ROOT, 'word_sounds_wordlist_en.js'));
  const builder = require(path.join(ROOT, 'word_sounds_packet_builder.js'));
  return { dictionary, core, loader, wordlist, builder };
}

// Every clip of the word-audio store (word_audio_shards/, made by dev-tools/build_word_sounds_word_audio.cjs), read by
// following its index: index.words[word] names a shard, index.shards[shard].file names the file. No file name is
// guessed, so the one-file-per-letter layout and the regrouped one (dev-tools/repack_word_sounds_word_audio.cjs)
// read the same. No store = no clips. A file the index names that is missing or damaged is an error, never a gap.
const SHARD_STORE = path.join(ROOT, 'word_audio_shards');
function loadShardClips(dir = SHARD_STORE) {
  const indexFile = path.join(dir, 'index.json');
  if (!fs.existsSync(indexFile)) return {};
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8').replace(/^﻿/, ''));
  if (!index || index.format !== 'alloflow-word-audio-index/1' || !index.words || !index.shards) throw new Error('Not a word audio index (alloflow-word-audio-index/1): ' + indexFile);
  const files = new Map(), clips = {};
  for (const word of Object.keys(index.words)) {
    const shard = index.shards[index.words[word]];
    const name = shard && shard.file;
    if (typeof name !== 'string' || !/^[a-z0-9_][a-z0-9_-]*\.json$/.test(name)) throw new Error('The word audio index names no usable file for "' + word + '": ' + indexFile);
    if (!files.has(name)) {
      try { files.set(name, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))); }
      catch (error) { throw new Error('Could not read ' + path.join(dir, name) + ', which the word audio index names (' + error.message + ')'); }
    }
    const clip = files.get(name)[word];
    if (typeof clip !== 'string' || !/^data:audio\//.test(clip)) throw new Error('The word audio index lists "' + word + '" in ' + name + ', and it is not there');
    clips[word] = clip;
  }
  return clips;
}

// options.shards: the store folder to read too (default word_audio_shards/), or false for the bank files alone.
// A word in both keeps the bank's clip.
function loadBanks(options = {}) {
  const kokoroWords = json('word_audio_kokoro_bank.json').words;
  const shardClips = options.shards === false ? {} : loadShardClips(typeof options.shards === 'string' ? options.shards : SHARD_STORE);
  return { phonemes: json('audio_bank/phonemes.json'), isolation: json('audio_bank/isolation.json'), instructions: json('audio_bank/instructions.json'),
    words: json('audio_bank/words.json'), kokoroWords: Object.assign({}, shardClips, kokoroWords), gapFill: json('audio_bank_kokoro.json') };
}

function ffmpegOnPath() {
  try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch (_) { return false; }
}

// Any clip -> 22,050 Hz 16-bit mono WAV, as the app's portableAudio makes in a browser.
function ffmpegToWav() {
  const cache = new Map();
  return async uri => {
    if (cache.has(uri)) return cache.get(uri);
    const input = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
    const out = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', '-bitexact', '-map_metadata', '-1', '-f', 'wav', 'pipe:1'],
      { input, maxBuffer: 64 * 1024 * 1024 });
    // Written to a pipe, the two length fields are unknown: fill them in.
    const data = out.indexOf('data', 12, 'latin1');
    if (out.toString('latin1', 0, 4) !== 'RIFF' || data < 0) throw new Error('ffmpeg did not return a WAV');
    out.writeUInt32LE(out.length - 8, 4);
    out.writeUInt32LE(out.length - data - 8, data + 4);
    const wav = 'data:audio/wav;base64,' + out.toString('base64');
    cache.set(uri, wav);
    return wav;
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!/^--[a-z-]+$/.test(name)) throw new Error('Unexpected argument: ' + name);
    const key = name.slice(2);
    if (['any-word', 'keep-webm', 'show-letters', 'help'].includes(key)) args[key] = true;
    else { if (i + 1 >= argv.length) throw new Error('Missing value for ' + name); args[key] = argv[++i]; }
  }
  return args;
}

function summary(result, picked) {
  const m = result.manifest, lines = [];
  if (picked) {
    lines.push(`Picked ${picked.words.length} of ${picked.pool} words that fit: ${picked.words.join(', ') || '(none)'}`);
    lines.push('  ' + Object.entries(picked.reasons).map(([k, v]) => k + ' ' + v).join(', '));
    if (picked.criteria.stageNote) lines.push('  ' + picked.criteria.stageNote);
  }
  lines.push(`Builder ${m.builder}, seed ${m.seed}, AI: ${m.ai}`);
  lines.push(`Words: asked ${m.words.asked.length}, used ${m.words.used.length} (${m.words.used.join(', ')})`);
  lines.push(`Activities: asked ${m.activities.asked.join(', ')}; built ${m.activities.built.join(', ') || '(none)'}`);
  lines.push('Items: ' + m.items.total + ' (' + Object.entries(m.items.byActivity).map(([k, v]) => k + ' ' + v).join(', ') + ')');
  lines.push('Clips: ' + m.audio.clips + ' (' + Object.entries(m.audio.bySource).map(([k, v]) => k + ' ' + v).join(', ') + ')');
  lines.push('Exceptions: ' + (m.exceptions.length || 'none'));
  for (const e of m.exceptions) lines.push(`  ${e.word || '(all words)'} / ${e.activity || '(whole word)'}: ${e.reason}`);
  lines.push('Credits written into the file: ' + (m.creditsInFile ? 'yes' : 'NO'));
  return lines.join('\n');
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.out || (!args.words && !args.sound && !args.shape && !args.spelling && !args.stage && !args.sounds)) {
    console.log(read('dev-tools/make_word_sounds_packet.cjs').split('\n').slice(3, 10).map(line => line.replace(/^\/\/ ?/, '')).join('\n'));
    process.exitCode = args.help ? 0 : 1;
    return;
  }
  const { dictionary, core, loader, wordlist, builder } = loadParts();
  const seed = args.seed == null ? 1 : (/^\d+$/.test(args.seed) ? Number(args.seed) : args.seed);
  let words = args.words ? args.words.split(',').map(word => word.trim()).filter(Boolean) : null;
  let picked = null;
  if (!words) {
    picked = builder.pickWords({ count: args.count ? Number(args.count) : 10, sounds: args.sounds ? Number(args.sounds) : undefined, shape: args.shape,
      targetSound: args.sound, spellingPattern: args.spelling, position: args.position, stage: args.stage,
      maxRank: args['max-rank'] ? Number(args['max-rank']) : undefined, requireClip: !args['any-word'] }, { wordlist, core, dictionary, seed });
    words = picked.words;
  }
  const hasFfmpeg = ffmpegOnPath();
  if (!hasFfmpeg) console.log(args['keep-webm'] ? 'ffmpeg is not on PATH: WebM clips ship unconverted.' : 'ffmpeg is not on PATH: items whose clips are WebM become exceptions (or pass --keep-webm).');
  const result = await builder.buildPacket({ words, activities: (args.activities || 'isolation').split(',').map(id => id.trim()).filter(Boolean),
    length: args.length ? Number(args.length) : undefined, title: args.title, learnerLabel: args.learner, seed, core, dictionary, banks: loadBanks(), loader, wordlist,
    showLetters: !!args['show-letters'], toWav: hasFfmpeg ? ffmpegToWav() : undefined, allowUnconverted: !!args['keep-webm'], picked });
  console.log(summary(result, picked));
  if (!result.html) { console.log('Nothing could be built: no file written.'); process.exitCode = 1; return; }
  const out = path.resolve(args.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, result.html);
  if (fs.readFileSync(out, 'utf8') !== result.html) throw new Error('Short write: ' + out);
  console.log(`Wrote ${out}: ${Math.round(Buffer.byteLength(result.html) / 1024)} KB, sha256 ${result.sha256}`);
}

module.exports = { loadParts, loadBanks, loadShardClips, SHARD_STORE, ffmpegOnPath, ffmpegToWav, summary };
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
