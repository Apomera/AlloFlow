#!/usr/bin/env node
'use strict';
// Records the meanings of the Packets vocabulary bank (packets_vocab/, packets_vocab_ext/) ahead of time with the
// Kokoro voice of the Word Sounds word recordings (af_heart, speed 1, fp32 on WebGPU, -20 LUFS: the engine, trim and
// loudness of dev-tools/build_word_sounds_word_audio.cjs, required from it), as small MP3 files. 2026-11-23.
//
// The store is NOT kept in git (Aaron, 2026-11-23): the recordings are made from the bank's text and can be made
// again, and git history would keep every old copy. It lives outside the repository and is copied into the Packets
// site by dev-tools/build_packets_site.cjs --meaning-audio=<dir>; the GitHub copy of Packets has none and reads
// meanings with the device voice.
//
//   node dev-tools/build_packets_meaning_audio.cjs --plan             counts, sizes and time, nothing else
//   node dev-tools/build_packets_meaning_audio.cjs --pilot 200        a listening sample: whole questions (a word's
//                                                                     meaning and its 3 wrong answers), + listen.html
//   node dev-tools/build_packets_meaning_audio.cjs                    every meaning not yet in the store (nights)
//   --out <dir>      the store (default: <home>/AlloFlow-media/packets_meaning_audio)
//   --work <dir>     browser profile, saved model, log, listen.html (default: <home>/AlloFlow-media/meaning-audio-work)
//   --limit N        at most N meanings this run      --only-words <file>  only the meanings of these words
//   --dtype, --device, --browser, --port: as build_word_sounds_word_audio.cjs (default fp32, webgpu, chrome, 17393)
//   --bitrate <kbps> MP3 bit rate (default 32)        --recycle N  a fresh browser every N meanings (default 400)
//
// A meaning's recording is found by its exact text (spaces squeezed): key = the first 16 hex digits of
// sha256("alloflow-meaning|" + text), in one of 8,192 files (m-0000.json ... m-1fff.json, by the key), so a packet's
// 80 or so meanings come from about 80 small files (about 70 KB each when all are made), and a reworded meaning just
// gets a new key. Cloudflare Pages allows 20,000 files and 25 MiB a file on the free plan.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const W = require('./build_word_sounds_word_audio.cjs');

const STORE_FORMAT = 'alloflow-meaning-audio-index/1';
const SHARD_FORMAT = 'alloflow-meaning-audio-shard/1';
const BUCKETS = 8192;
const MEDIA_HOME = path.join(os.homedir(), 'AlloFlow-media');
const DEFAULT_OUT = path.join(MEDIA_HOME, 'packets_meaning_audio');
const DEFAULT_WORK = path.join(MEDIA_HOME, 'meaning-audio-work');
const DEFAULT_PORT = 17393;
const URI_PREFIX = 'data:audio/mpeg;base64,';
// Kokoro at speed 1 reads about 13 to 15 characters a second (the check directions, 2026-11-17); a take far off that
// is cut short or rambling and is held back for a person to hear.
const CHARS_PER_SECOND = 14;

// The text shown, with its spaces squeezed: what packet_vocab_builder.js and the question adapters keep.
const shownText = (def) => String(def == null ? '' : def).replace(/\s+/g, ' ').trim();
// What the voice is given: a blank (___) is said "blank" with a pause on each side ("..."; Kokoro pauses 105 to 240 ms
// after "..." but hardly at a comma: build_word_sounds_word_audio.cjs, measured 2026-11-13), and a meaning without a
// full stop gets one, so the voice ends it as a sentence. A comma right after the blank goes (the pause is there).
function spokenText(def) {
  let t = shownText(def).replace(/\s*_{2,}\s*,?\s*/g, '... blank... ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^\.\.\.\s*/, '').replace(/\.\.\.\s*([.!?])$/, '$1').replace(/\.\.\.$/, '.');
  if (!/[.!?]$/.test(t)) t += '.';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const keyOf = (def) => crypto.createHash('sha256').update('alloflow-meaning|' + shownText(def), 'utf8').digest('hex').slice(0, 16);
const bucketOf = (key) => 'm-' + (parseInt(key.slice(0, 4), 16) % BUCKETS).toString(16).padStart(4, '0');

// Every meaning of the bank, as the vocabulary maker loads it: core (packets_vocab/en-N.json, in part order, with the
// ranked wrong answers as positions in that order) and extended (packets_vocab_ext/*.json). One entry per text.
function collectMeanings(root = ROOT) {
  const core = [], byText = new Map();
  const parts = fs.readdirSync(path.join(root, 'packets_vocab')).filter((n) => /^en-\d+\.json$/.test(n)).sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10));
  const take = (word, r, part, rank) => {
    const text = shownText(r[1]);
    if (!text) return null;
    const flags = r[4] || 0;
    const sense = { id: word + '|' + r[0].charAt(0) + '|' + r[0].slice(1), word, text, part, rank, checked: !!(flags & 6) };
    if (!byText.has(text)) byText.set(text, { key: keyOf(text), text, senses: [] });
    byText.get(text).senses.push(sense);
    return sense;
  };
  let rank = 0;
  for (const name of parts) {
    for (const [word, senses] of JSON.parse(fs.readFileSync(path.join(root, 'packets_vocab', name), 'utf8')).words) {
      rank++;
      for (const r of senses) { const s = take(word, r, 'core', rank); core.push({ sense: s, wrong: typeof r[5] === 'string' && r[5] ? r[5].split(' ').map((n) => parseInt(n, 36)) : [] }); }
    }
  }
  const extNames = fs.readdirSync(path.join(root, 'packets_vocab_ext')).filter((n) => /\.json$/.test(n)).sort();
  for (const name of extNames) {
    const part = name === 'phrases.json' ? 'phrase' : 'ext';
    for (const [word, senses] of JSON.parse(fs.readFileSync(path.join(root, 'packets_vocab_ext', name), 'utf8')).words) for (const r of senses) take(word, r, part, 0);
  }
  return { meanings: [...byText.values()], core };
}

// The pilot: whole questions, so a listener hears what a student hears. The most common checked core words, each with
// its first meaning and its first 3 ranked wrong answers, until n meanings; about a quarter of the words first have a
// right meaning with a blank (___), so the way a blank is said is heard too.
function pilotOf(collected, n) {
  const picked = new Map(), questions = [], used = new Set();
  const byText = new Map(collected.meanings.map((m) => [m.text, m]));
  const pass = (limit, want) => {
    for (let i = 0; i < collected.core.length && picked.size < limit; i++) {
      const row = collected.core[i];
      if (used.has(i) || !row.sense || !row.sense.checked || row.sense.id.split('|')[2] !== '1' || row.wrong.length < 3 || !want(row.sense.text)) continue;
      const wrong = row.wrong.slice(0, 3).map((at) => collected.core[at] && collected.core[at].sense).filter(Boolean);
      if (wrong.length < 3) continue;
      const texts = [row.sense.text, ...wrong.map((s) => s.text)];
      if (picked.size + texts.filter((t) => !picked.has(t)).length > limit) break;
      for (const t of texts) picked.set(t, byText.get(t));
      used.add(i);
      questions.push({ word: row.sense.word, right: row.sense.text, wrong: wrong.map((s) => ({ word: s.word, text: s.text })) });
    }
  };
  pass(Math.round(n / 4), (t) => /_{2,}/.test(t));
  pass(n, () => true);
  return { meanings: [...picked.values()], questions };
}

// The store: index.json (made from the shards on every save) and m-XXXX.json. Only the shards a run touches are read
// and written; the keys already made are read from the index at the start.
function openStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const indexFile = path.join(dir, 'index.json');
  let index = null;
  if (fs.existsSync(indexFile)) {
    index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    if (index.format !== STORE_FORMAT) throw new Error(indexFile + ' is not a meaning recording store (' + index.format + ')');
  }
  const done = new Set(), counts = new Map(Object.entries((index && index.buckets) || {}));
  for (const name of counts.keys()) {
    const shard = readShard(path.join(dir, name + '.json'));
    for (const k of Object.keys(shard.clips)) done.add(k);
  }
  const pending = new Map();
  function readShard(file) {
    if (!fs.existsSync(file)) return { format: SHARD_FORMAT, clips: {} };
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (s.format !== SHARD_FORMAT || !s.clips || typeof s.clips !== 'object') throw new Error(file + ' is not a meaning recording file');
    return s;
  }
  return {
    dir, done,
    has: (key) => done.has(key) || [...pending.values()].some((m) => m.has(key)),
    add(key, entry) { const b = bucketOf(key); if (!pending.has(b)) pending.set(b, new Map()); pending.get(b).set(key, entry); },
    count: () => done.size + [...pending.values()].reduce((n, m) => n + m.size, 0),
    flush(meta) {
      const written = [];
      for (const [b, clips] of pending) {
        const file = path.join(dir, b + '.json');
        const shard = readShard(file);
        for (const [k, e] of clips) { shard.clips[k] = e; done.add(k); }
        const sorted = {};
        for (const k of Object.keys(shard.clips).sort()) sorted[k] = shard.clips[k];
        W.atomicWrite(file, JSON.stringify({ format: SHARD_FORMAT, bucket: b, updated: new Date().toISOString(), clips: sorted }));
        counts.set(b, Object.keys(sorted).length);
        written.push(b);
      }
      pending.clear();
      if (written.length || !fs.existsSync(indexFile)) {
        const buckets = {};
        for (const b of [...counts.keys()].sort()) buckets[b] = counts.get(b);
        W.atomicWrite(indexFile, JSON.stringify(Object.assign({ format: STORE_FORMAT }, meta, { updated: new Date().toISOString(),
          counts: { meanings: done.size, files: counts.size }, keyRule: 'sha256("alloflow-meaning|" + text with spaces squeezed), first 16 hex digits',
          bucketRule: 'm- + (first 4 hex digits of the key as a number, mod ' + BUCKETS + ') in 4 hex digits', buckets }), null, 1));
      }
      return written;
    },
  };
}

function encodeMp3(work, wav, bitrate) {
  const wavPath = path.join(work, 'meaning-' + process.pid + '.wav'), outPath = path.join(work, 'meaning-' + process.pid + '.mp3');
  fs.writeFileSync(wavPath, wav);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wavPath, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', bitrate + 'k', '-f', 'mp3', outPath],
    { encoding: 'utf8', windowsHide: true, timeout: 120000 });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + String((r.error && r.error.message) || r.stderr || 'no message').trim());
  const bytes = fs.readFileSync(outPath);
  for (const f of [wavPath, outPath]) { try { fs.unlinkSync(f); } catch (_) { /* gone */ } }
  return bytes;
}

// One meaning: voice, trim, loudness, MP3, and the checks a take must pass.
async function recordOne(m, engine, opts) {
  const spoken = spokenText(m.text);
  const raw = await engine.synth(spoken, 0);
  const trimmed = W.gentleTrim(raw);
  const level = W.normalizeLoudness(trimmed);
  const seconds = trimmed.samples.length / trimmed.rate;
  const expected = spoken.length / CHARS_PER_SECOND;
  const problems = level.ok ? [] : level.failures.slice();
  if (seconds < expected * 0.45) problems.push('much shorter than the text (' + seconds.toFixed(1) + ' s for ' + spoken.length + ' characters): words may be missing');
  if (seconds > expected * 2.4 + 1) problems.push('much longer than the text (' + seconds.toFixed(1) + ' s for ' + spoken.length + ' characters)');
  if (problems.length) return { ok: false, problems };
  const mp3 = encodeMp3(opts.work, level.wav, opts.bitrate);
  return { ok: true, entry: { text: m.text, spoken, seconds: Number(seconds.toFixed(2)), audio: URI_PREFIX + mp3.toString('base64') } };
}

function listenPage(questions, clipsByText, meta) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const row = (label, text) => {
    const c = clipsByText.get(text);
    return '<tr><td>' + esc(label) + '</td><td>' + esc(text) + (c && c.spoken !== text ? '<br><small>said: ' + esc(c.spoken) + '</small>' : '') + '</td><td>' +
      (c ? '<audio controls preload="none" src="' + c.audio + '"></audio> <small>' + c.seconds + ' s</small>' : '<em>not recorded</em>') + '</td></tr>';
  };
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Meaning recordings: listening sample</title>' +
    '<style>body{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%;margin:0 0 1.5rem}' +
    'td{border-top:1px solid #ccc;padding:.4rem;vertical-align:top}td:first-child{width:9rem;color:#444}h2{font-size:1.1rem;margin:1.5rem 0 .3rem}</style></head><body>' +
    '<h1>Meaning recordings: listening sample</h1><p>' + esc(meta) + '</p><p>Each word: the right meaning first, then the 3 wrong answers a student hears with it. ' +
    'Listen for words said wrong, a meaning cut short, odd pauses, and "blank" where a meaning has a blank.</p>' +
    questions.map((q, i) => '<h2>' + (i + 1) + '. ' + esc(q.word) + '</h2><table>' + row('right meaning', q.right) + q.wrong.map((w) => row('wrong (' + w.word + ')', w.text)).join('') + '</table>').join('') +
    '</body></html>';
}

function parseArgs(argv) {
  const o = { out: DEFAULT_OUT, work: DEFAULT_WORK, dtype: 'fp32', device: 'webgpu', browser: 'chrome', port: DEFAULT_PORT, bitrate: 32, recycle: 400, limit: 0, pilot: 0, plan: false, onlyWords: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value'); return argv[++i]; };
    const [flag, inline] = a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, null];
    const val = () => (inline != null ? inline : next());
    switch (flag) {
      case '--plan': o.plan = true; break;
      case '--pilot': o.pilot = Number(val()); break;
      case '--limit': o.limit = Number(val()); break;
      case '--out': o.out = path.resolve(val()); break;
      case '--work': o.work = path.resolve(val()); break;
      case '--only-words': o.onlyWords = path.resolve(val()); break;
      case '--dtype': o.dtype = val(); break;
      case '--device': o.device = val(); break;
      case '--browser': o.browser = val(); break;
      case '--port': o.port = Number(val()); break;
      case '--bitrate': o.bitrate = Number(val()); break;
      case '--recycle': o.recycle = Number(val()); break;
      default: throw new Error('Unknown option: ' + a);
    }
  }
  if (!W.DTYPES.includes(o.dtype) || !W.DEVICES.includes(o.device)) throw new Error('--dtype is one of ' + W.DTYPES.join(', ') + '; --device one of ' + W.DEVICES.join(', '));
  if (!(o.bitrate >= 16 && o.bitrate <= 128)) throw new Error('--bitrate is 16 to 128');
  const inside = (p) => { const rel = path.relative(ROOT, p); return !rel.startsWith('..') && !path.isAbsolute(rel); };
  if (inside(o.out)) throw new Error('--out must be outside the repository: the recordings are not kept in git');
  return o;
}

async function main(argv) {
  const o = parseArgs(argv);
  const collected = collectMeanings();
  const all = collected.meanings;
  if (o.plan) {
    const chars = all.reduce((n, m) => n + spokenText(m.text).length, 0), secs = chars / CHARS_PER_SECOND + all.length * 0.3;
    const parts = { core: 0, ext: 0, phrase: 0 };
    for (const m of all) parts[m.senses[0].part]++;
    console.log('meanings (one per text): ' + all.length + ' (core ' + parts.core + ', extended ' + parts.ext + ', phrases ' + parts.phrase + '; checked ' + all.filter((m) => m.senses.some((s) => s.checked)).length + ')');
    console.log('speech about ' + (secs / 3600).toFixed(1) + ' h; at ' + o.bitrate + ' kbps about ' + Math.round(secs * o.bitrate / 8 * 1.34 / 1024) + ' MB in the store (' + (secs / all.length * o.bitrate / 8 * 1.34).toFixed(0) + ' KB a meaning)');
    if (fs.existsSync(path.join(o.out, 'index.json'))) { const st = openStore(o.out); console.log('in the store now: ' + st.done.size + '; still to make: ' + all.filter((m) => !st.done.has(m.key)).length); }
    return 0;
  }
  let todo = all, questions = null;
  if (o.pilot) { const p = pilotOf(collected, o.pilot); todo = p.meanings; questions = p.questions; }
  if (o.onlyWords) { const want = new Set(fs.readFileSync(o.onlyWords, 'utf8').split(/[\s,]+/).filter(Boolean).map((w) => w.toLowerCase())); todo = todo.filter((m) => m.senses.some((s) => want.has(s.word))); }
  fs.mkdirSync(o.work, { recursive: true });
  const lockFile = path.join(o.out, '.lock');
  fs.mkdirSync(o.out, { recursive: true });
  try { fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' }); }
  catch (_) { throw new Error('Another run holds ' + lockFile + ' (pid ' + fs.readFileSync(lockFile, 'utf8') + '). If it is not running, delete the file.'); }
  const logFile = path.join(o.work, 'run-' + new Date().toISOString().replace(/[:.]/g, '-') + '.log');
  const log = (line) => { const s = new Date().toISOString().slice(11, 19) + ' ' + line; console.log(s); fs.appendFileSync(logFile, s + '\n'); };
  let engine = null;
  try {
    const store = openStore(o.out);
    const left = todo.filter((m) => !store.has(m.key));
    const run = o.limit > 0 ? left.slice(0, o.limit) : left;
    log('Meanings: ' + todo.length + ' wanted, ' + (todo.length - left.length) + ' already in ' + o.out + ', ' + run.length + ' to make now (' + o.dtype + ', ' + o.device + ', ' + o.bitrate + ' kbps).');
    const meta = { engine: 'kokoro-js@1.2.1 / ' + W.MODEL_ID + ' (' + o.dtype + ', ' + o.device + ')', voice: W.ENGINE.voice, speed: W.ENGINE.speed, language: 'en-US',
      source: 'generated_speech', humanReviewed: false, post: 'gentle trim + loudness -20 LUFS (true peak <= -1.5 dBTP) + ffmpeg libmp3lame ' + o.bitrate + ' kbps mono 24 kHz',
      note: 'Machine-made recordings of the meanings in the Packets vocabulary bank, made ahead of time. No person has listened to each one. Not kept in git: made by dev-tools/build_packets_meaning_audio.cjs.' };
    const failures = [], clipsByText = new Map();
    if (run.length) {
      W.keepAwake();
      engine = W.createEngine({ root: ROOT, work: o.work, browser: o.browser, port: o.port, dtype: o.dtype, device: o.device, lanes: 1, log });
      const t0 = Date.now();
      await engine.start();
      log('Voice ready in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s.');
      const began = Date.now();
      let made = 0, sinceFlush = 0, troubleInARow = 0;
      for (let i = 0; i < run.length; i++) {
        const m = run[i];
        let got = null;
        for (let attempt = 0; attempt < 2 && !got; attempt++) {
          try { got = await recordOne(m, engine, o); troubleInARow = 0; }
          catch (error) {
            if (!(error instanceof W.EngineError) || attempt) { got = { ok: false, problems: ['the voice failed: ' + String(error.message).split('\n')[0]] }; break; }
            log('Engine trouble at "' + m.text.slice(0, 60) + '": ' + error.message + '. Restarting the browser.');
            await engine.restart();
          }
        }
        if (got.ok) { store.add(m.key, got.entry); clipsByText.set(m.text, got.entry); made++; sinceFlush++; }
        else { failures.push({ text: m.text, words: m.senses.map((s) => s.word), problems: got.problems }); troubleInARow++; log('Held back: "' + m.text.slice(0, 80) + '": ' + got.problems.join(' / ')); }
        if (troubleInARow >= 10) { log('10 meanings in a row failed: stopping (something is wrong with the voice, not the meanings).'); break; }
        if (sinceFlush >= 50) { store.flush(meta); sinceFlush = 0; }
        if ((i + 1) % 25 === 0 || i === run.length - 1) {
          const per = (Date.now() - began) / 1000 / (i + 1), rest = (run.length - i - 1) * per;
          log((i + 1) + ' / ' + run.length + ' (' + per.toFixed(1) + ' s a meaning; about ' + (rest / 3600).toFixed(1) + ' h left), held back ' + failures.length);
        }
        if (o.recycle > 0 && (i + 1) % o.recycle === 0 && i + 1 < run.length) {
          if (sinceFlush > 0) { store.flush(meta); sinceFlush = 0; }
          let recycled = false;
          for (let rTry = 0; rTry < 3 && !recycled; rTry++) {
            try {
              await engine.restart();
              recycled = true;
            } catch (recycleErr) {
              if (rTry === 2) throw recycleErr;
              log('Browser recycle attempt ' + (rTry + 1) + ' failed (' + String(recycleErr.message || recycleErr).split('\n')[0] + '); waiting 8 s to retry.');
              await new Promise((resolve) => setTimeout(resolve, 8000));
            }
          }
        }
      }
      store.flush(meta);
      const total = (Date.now() - began) / 1000;
      log('Made ' + made + ' in ' + (total / 60).toFixed(1) + ' min (' + (total / Math.max(1, made)).toFixed(1) + ' s a meaning); held back ' + failures.length + '.');
    } else store.flush(meta);
    if (failures.length) fs.writeFileSync(path.join(o.work, 'held_back.json'), JSON.stringify(failures, null, 1));
    if (questions) {
      // The page reads the store for meanings made in an earlier run.
      for (const m of todo) if (!clipsByText.has(m.text)) {
        const file = path.join(o.out, bucketOf(m.key) + '.json');
        if (fs.existsSync(file)) { const c = JSON.parse(fs.readFileSync(file, 'utf8')).clips[m.key]; if (c) clipsByText.set(m.text, c); }
      }
      const page = path.join(o.work, 'listen.html');
      fs.writeFileSync(page, listenPage(questions, clipsByText, meta.engine + ', voice ' + meta.voice + ', ' + meta.post + '. ' + questions.length + ' words, ' + todo.length + ' meanings.'));
      log('Listening page: ' + page);
    }
    return failures.length && !clipsByText.size ? 1 : 0;
  } finally {
    if (engine) { try { await engine.stop(); } catch (_) { /* gone */ } }
    try { fs.unlinkSync(lockFile); } catch (_) { /* gone */ }
  }
}

module.exports = { STORE_FORMAT, SHARD_FORMAT, BUCKETS, URI_PREFIX, DEFAULT_OUT, shownText, spokenText, keyOf, bucketOf, collectMeanings, pilotOf, openStore, listenPage, parseArgs };
if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code || 0), (error) => { console.error(error.message); process.exit(1); });
}
