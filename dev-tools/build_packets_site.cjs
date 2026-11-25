#!/usr/bin/env node
'use strict';
// AlloFlow Packets as a web site of its own (2026-11-23). Copies, byte for byte, the Packets pages and every file they
// load into one folder that can be uploaded as its own Cloudflare Pages project, and writes that folder's _headers.
// Why: a browser keeps localStorage and IndexedDB per web address. On apomera.github.io every page of the AlloFlow app
// can read what Packets keeps in the teacher's browser; on an address of its own, nothing else can.
//
//   node dev-tools/build_packets_site.cjs --out=<folder> [--meaning-audio=<folder>]
//
// --out is required. It must be outside this repository, or a path in it that git ignores. A folder that is already
// there is emptied only when it holds a packets-site-manifest.json (a folder this script made).
// What is copied, and why, is read from the code, not guessed:
//   1. every packets*.html page at the repository root, and index.html = packets.html;
//   2. every <script src>, <link href>, <img src> and page link of those pages, and url()/@import in their style sheets;
//   3. RUNTIME below: files a script loads while the page runs (a script it adds, a file it fetches). Each entry names the
//      script and the address as that script writes it; the build fails if the script no longer says it;
//   4. INDEXES below: the files named by a list the page reads (the word store's index, the picture and vocabulary
//      shards, the voice's checked runtime);
//   5. LICENSE, THIRD_PARTY_LICENSES.md and licenses/;
//   6. with --meaning-audio=<folder>: the meaning recordings, which are not in the repository (copyMeaningAudio).
// A drift check reads every copied script for a quoted address of a file in this repository that is not copied; it
// fails unless that address is in NOT_LOADED with the reason. Files on other sites are never copied (OTHER_SITES).
// Nothing is deployed and no account is used.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_FILES = 20000; // Cloudflare Pages: files in one deployment
const MAX_FILE_BYTES = 25 * 1024 * 1024; // Cloudflare Pages: one file
const MANIFEST = 'packets-site-manifest.json';

// Files the pages load while they run. `from` writes each address in `files` as a quoted string.
const RUNTIME = [
  { from: 'packets-make.js', how: 'fetch (sound banks, word store index)', files: ['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json', 'word_audio_shards/index.json'] },
  { from: 'packets-make.js', how: 'adds a script', files: ['packets_audio_kit.js', 'word_picture_matcher.js'] },
  { from: 'packets-symbol-runner.js', how: 'fetch (sound banks, word store index)', files: ['audio_bank/phonemes.json', 'audio_bank/letters.json', 'audio_bank/words.json', 'word_audio_shards/index.json'] },
  { from: 'packets-present-export.js', how: 'fetch / adds a script', files: ['audio_bank/phonemes.json', 'vendor/pptxgenjs-3.12.0.bundle.js'] },
  { from: 'packets_vocab_media.js', how: 'fetch / adds a script', files: ['word_audio_shards/index.json', 'packets_audio_kit.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js'] },
  { from: 'packets-read-along.js', how: 'adds a script', files: ['word_sounds_symbols_en.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js', 'word_picture_matcher.js', 'packets_my_words.js', 'packets_vocab_bank_en.js'] },
  { from: 'packets-vocab.js', how: 'adds a script', files: ['packets_audio_kit.js', 'syllable_table_en.js'] },
  { from: 'packets-print-cards.js', how: 'adds a script', files: ['syllable_table_en.js', 'packets_docx.js'] },
  { from: 'word_practice_media.js', how: 'adds a script', files: ['syllable_table_en.js'] },
  { from: 'packets-pictures.js', how: 'adds a script', files: ['word_picture_matcher.js'] },
  { from: 'packets_audio_kit.js', how: 'adds a script (MP3 encoder)', files: ['lame.min.js'] },
  { from: 'word_sounds_core.js', how: 'adds a script', files: ['word_sounds_pronunciations.js', 'word_sounds_phonemes_en.js'] },
  { from: 'packets_voice_engine.js', how: 'adds a script / fetch (computer voice)', files: ['packets_audio_kit.js', 'runtime_graph_delivery_policy.js', 'runtime_graph_host.js', 'engine_runtime_integrity.json', 'kokoro_tts_loader.js'] },
];
// Lists the pages read, and the files they name.
const INDEXES = [
  { from: 'packets-make.js', list: 'word_audio_shards/index.json', how: 'the word store: fetches only the files its index names', kind: 'word-audio-index' },
  { from: 'word_sounds_symbols_en.js', how: 'picture shards ("url" in its shard list), fetched by packets-make.js, packets-read-along.js, packets_vocab_media.js', kind: 'url-list' },
  { from: 'packets_vocab_bank_en.js', how: 'vocabulary bank shards ("url"), fetched by its load()/loadLetter()', kind: 'url-list' },
  { from: 'reading_symbols_ext_en.js', how: 'more picture shards ("url"), fetched through its fetchFn', kind: 'url-list' },
  { from: 'packets_voice_engine.js', list: 'engine_runtime_integrity.json', graph: 'kokoro', how: 'the checked voice runtime (graph "kokoro") that kokoro_tts_loader.js starts with __alloCreateVerifiedWorker; fetched from this site first (runtime_graph_delivery_policy.js)', kind: 'runtime-graph' },
];
// Quoted addresses of files in this repository that a copied script names but the Packets pages never load.
const NOT_LOADED = {
  'audio_bank/words.json@packets-make.js': 'a comment: the maker does not use the 11 MB bank (packets-symbol-runner.js does, and it is copied)',
  'data/vendor/fonts/source.json': 'a comment naming where the embedded fonts came from',
  'data/word_sounds_blocklist_en.txt': 'a comment naming the source list',
  'word_sounds_module.js': 'a comment naming the app module a rule was copied from',
  'student_analytics_module.js': 'a comment naming the app module a rule was copied from',
  'math_fluency_module.js': 'a comment naming the app module a rule was copied from',
};
// Other sites the pages may contact (never copied). For the report and docs/packets-own-site.md.
const OTHER_SITES = [
  { site: 'huggingface.co (and its *.hf.co file servers)', pages: ['packets-voice.html', 'packets-read-along.html'], when: 'the voice model (about 88 MB), after the teacher presses "Get the voice" (kokoro_tts_loader.js)' },
  { site: 'alloflow-cdn.pages.dev', pages: ['packets-voice.html', 'packets-read-along.html'], when: 'only if this site\'s copy of the voice runtime does not arrive (runtime_graph_delivery_policy.js tries this site first)' },
  { site: 'globalsymbols.com, api.openverse.org, commons/thumb/upload.wikimedia.org', pages: ['packets-pictures.html'], when: 'a picture search the teacher starts (packets-pictures.js, word_picture_matcher.js)' },
  { site: 'api.dictionaryapi.dev', pages: ['packets-vocab-lookup.html'], when: 'a word the teacher looks up (packets-vocab-lookup.js)' },
  { site: 'script.google.com, script.googleusercontent.com', pages: ['packets-open.html'], when: 'a student file made with a Class Mailbox sends its results (word_sounds_take_home_loader.js takeHomeMailbox)' },
  { site: 'alloflow-catalog-submit.aaron-pomeranz.workers.dev', pages: ['packets-feedback.html'], when: 'a teacher ticks the confirmation box and presses Send on Send feedback (packets-feedback.js)' },
  { site: 'github.com', pages: ['packets.html', 'packets-about.html', 'packets-it.html'], when: 'plain links, followed only when pressed' },
];
// Device features, all off but where a page needs one (the page reads the code that asks for it).
const PERMISSIONS = ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'serial', 'hid', 'bluetooth', 'midi', 'magnetometer', 'gyroscope', 'accelerometer', 'display-capture', 'xr-spatial-tracking', 'browsing-topics'];
const ALLOW = {
  'packets-qr.html': { camera: 'packets-qr.js asks for the camera to read a sealed QR code (getUserMedia video)' },
  'packets-make.html': { microphone: 'packets-words.js records a word for My words (getUserMedia audio, MediaRecorder)' },
  'packets-read-along.html': { microphone: 'packets-read-along.js records the teacher reading each sentence (getUserMedia audio, MediaRecorder)' },
};
// Never copied, whatever names it.
const EXCLUDED = [/(^|\/)\.env(\.|$)/i, /\.(key|pem|p12|pfx)$/i, /credential/i, /secret/i, /(^|\/)tests?\//i, /(^|\/)reports\//i,
  /(^|\/)docs\/drafts\//i, /(^|\/)node_modules\//i, /(^|\/)\.git(\/|$)/i, /(^|\/)\.claude\//i, /\.(map|log)$/i];
const LICENSES = ['LICENSE', 'THIRD_PARTY_LICENSES.md'];

const rel = (p) => p.split(path.sep).join('/');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const isLocal = (v) => !!v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith('//') && !v.startsWith('#');
const clean = (v) => v.split('#')[0].split('?')[0].replace(/^\.\//, '');
function lineOf(text, needle) { const at = text.indexOf(needle); return at < 0 ? 0 : text.slice(0, at).split('\n').length; }
function isFile(p) { try { return fs.statSync(path.join(ROOT, p)).isFile(); } catch (_) { return false; } }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function fail(msg) { const e = new Error(msg); e.packetsSite = true; throw e; }

// What goes in the folder: { files: Map(path -> [reasons]), runtime: [...], external: [...], pages: [...] }
function plan(options) {
  const opt = options || {};
  const allPages = fs.readdirSync(ROOT).filter((f) => /^packets[\w-]*\.html$/.test(f)).sort();
  const pages = opt.pages ? allPages.filter((p) => opt.pages.includes(p)) : allPages;
  if (!pages.includes('packets.html')) fail('packets.html (the front door, copied as index.html) must be among the pages.');
  const files = new Map();
  const runtime = [];
  const external = new Map();
  const missing = [];
  const add = (p, why) => { if (!files.has(p)) files.set(p, []); files.get(p).push(why); };
  const want = (p, why) => { if (isFile(p)) add(p, why); else missing.push(p + ' (' + why + ')'); };
  for (const page of pages) {
    add(page, 'page');
    const html = read(page);
    html.split('\n').forEach((ln, i) => {
      for (const m of ln.matchAll(/<(script|link|img|a|source|audio|video|iframe)\b[^>]*?\s(src|href)="([^"]*)"/gi)) {
        const v = m[3];
        if (!isLocal(v)) { if (/^https?:/i.test(v)) { const host = new URL(v).host; external.set(host + ' <- ' + page, { host, page, how: m[1] + ' ' + m[2] }); } continue; }
        const p = clean(v);
        if (p === '' || p === './') continue; // "./": the folder's own front door (index.html)
        if (/^packets[\w-]*\.html$/.test(p) && !pages.includes(p) && opt.pages) continue; // a subset build leaves other pages out
        want(p, page + ':' + (i + 1) + ' <' + m[1].toLowerCase() + ' ' + m[2] + '>');
      }
    });
  }
  // Style sheets: url() and @import.
  for (const p of [...files.keys()].filter((f) => f.endsWith('.css'))) {
    const css = read(p);
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
      const v = m[1] || m[2];
      if (isLocal(v) && !/^data:/i.test(v)) want(clean(v), p + ':' + lineOf(css, v) + ' (css)');
    }
  }
  const loadsOf = (from) => files.has(from);
  // A script added at run time is itself followed below, so its own RUNTIME entries apply too.
  let grew = true;
  const seenRuntime = new Set();
  while (grew) {
    grew = false;
    for (const entry of RUNTIME) {
      if (!loadsOf(entry.from) || seenRuntime.has(entry)) continue;
      seenRuntime.add(entry);
      grew = true;
      const text = read(entry.from);
      for (const f of entry.files) {
        // The first line that names it in code (not in a comment).
        const line = text.split('\n').findIndex((ln) => !/^\s*(\/\/|\*|\/\*)/.test(ln) && (ln.includes("'" + f + "'") || ln.includes('"' + f + '"'))) + 1;
        if (!line) fail(entry.from + ' no longer names ' + f + ': read it again and update RUNTIME in dev-tools/build_packets_site.cjs.');
        runtime.push({ file: f, from: entry.from + ':' + line, how: entry.how });
        want(f, entry.from + ':' + line + ' (' + entry.how + ')');
      }
    }
  }
  for (const idx of INDEXES) {
    if (!loadsOf(idx.from)) continue;
    const text = read(idx.from);
    if (idx.kind === 'word-audio-index') {
      if (!files.has(idx.list)) continue;
      const index = JSON.parse(read(idx.list));
      if (index.format !== 'alloflow-word-audio-index/1' || !index.shards) fail(idx.list + ' is not a word store index.');
      const dir = path.posix.dirname(idx.list);
      const names = Object.values(index.shards).map((s) => s.file);
      names.forEach((n) => { if (!/^[a-z0-9_][a-z0-9_-]*\.json$/.test(n)) fail(idx.list + ' names an odd file: ' + n); want(dir + '/' + n, idx.list + ' (' + idx.how + ')'); });
      runtime.push({ file: dir + '/<' + names.length + ' files named by index.json>', from: idx.from + ':' + lineOf(text, idx.list), how: idx.how });
    } else if (idx.kind === 'url-list') {
      const urls = [...new Set([...text.matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]).filter(isLocal))];
      if (!urls.length) fail(idx.from + ' names no shard files any more: update INDEXES.');
      urls.forEach((u) => want(u, idx.from + ' (' + idx.how + ')'));
      runtime.push({ file: urls.length + ' shards: ' + [...new Set(urls.map((u) => path.posix.dirname(u)))].join(', '), from: idx.from + ':' + lineOf(text, '"url":"' + urls[0] + '"'), how: idx.how });
    } else if (idx.kind === 'runtime-graph') {
      if (!files.has(idx.list)) continue;
      const cat = JSON.parse(read(idx.list));
      const graph = cat.graphs && cat.graphs[idx.graph];
      if (!graph) fail(idx.list + ' has no graph ' + idx.graph + '.');
      const ids = new Set();
      const walk = (id) => { if (ids.has(id)) return; const a = cat.assets[id]; if (!a) fail(idx.list + ' names no asset ' + id); ids.add(id); (a.parts || []).concat(a.dependencies || []).forEach(walk); };
      graph.assets.forEach(walk);
      for (const id of ids) { const a = cat.assets[id]; if (a.path) want(a.path, idx.list + ' graph ' + idx.graph + ' (' + idx.how + ')'); }
      runtime.push({ file: [...ids].map((id) => cat.assets[id].path).filter(Boolean).join(', '), from: 'kokoro_tts_loader.js:' + lineOf(read('kokoro_tts_loader.js'), "__alloCreateVerifiedWorker('kokoro'"), how: idx.how });
    }
  }
  for (const f of LICENSES) want(f, 'license');
  for (const f of fs.readdirSync(path.join(ROOT, 'licenses')).sort()) if (isFile('licenses/' + f)) want('licenses/' + f, 'license');
  if (missing.length) fail('A page or script names a file that is not in the repository:\n  ' + missing.join('\n  '));
  for (const p of files.keys()) if (EXCLUDED.some((re) => re.test(p))) fail('Refusing to copy ' + p + ': it matches a private or test path (' + files.get(p)[0] + ').');
  // Drift: a quoted address of a repository file, on a line that is not a comment, in a copied script, that is not copied.
  const unknown = [];
  for (const p of [...files.keys()].filter((f) => f.endsWith('.js') && !f.startsWith('vendor/') && !/\.min\.js$/.test(f))) {
    read(p).split('\n').forEach((ln, i) => {
      const code = ln.trim();
      if (/^(\/\/|\*|\/\*)/.test(code)) return;
      for (const m of ln.matchAll(/['"`]([A-Za-z0-9_][\w\-./]*\.(?:js|json|css|svg|png|webp|jpe?g|gif|woff2?|ttf|mp3|wav|ogg|wasm|mjs|data|onnx|txt))['"`]/g)) {
        const v = m[1];
        if (v.includes('//') || files.has(v) || !isFile(v)) continue;
        if (opt.pages && /^packets[\w-]*\.html$/.test(v)) continue; // a subset build leaves other pages out
        if (NOT_LOADED[v] || NOT_LOADED[v + '@' + p]) continue;
        // Inside a comment at the end of a line.
        const before = ln.slice(0, m.index);
        if (/\/\/[^'"]*$/.test(before) || /\/\*[^*]*$/.test(before)) continue;
        unknown.push(p + ':' + (i + 1) + ' names ' + v);
      }
    });
  }
  if (unknown.length) fail('A copied script names a repository file that is not copied. Add it to RUNTIME if a page loads it, or to NOT_LOADED with the reason:\n  ' + unknown.join('\n  '));
  return { pages, files, runtime, external: [...external.values()] };
}

function headersText(pages) {
  const off = (allow) => PERMISSIONS.map((f) => f + '=' + (allow && allow[f] ? '(self)' : '()')).join(', ');
  const out = [
    '# AlloFlow Packets, its own site. Written by dev-tools/build_packets_site.cjs: change that script, not this file.',
    '# No Packets page is shown in a frame by another page, by another Packets page, or by the AlloFlow app (the app',
    '# opens Packets in a tab). Open a practice file and Try it show a student file in a frame of their own (srcdoc and',
    '# blob:), which frame-ancestors of the page does not reach. So framing is refused everywhere.',
    '# Each page carries its own Content-Security-Policy (a meta tag); nothing here replaces it.',
    '/*',
    '  X-Frame-Options: DENY',
    "  Content-Security-Policy: frame-ancestors 'none'",
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '# Device features: all off, but the camera on Collect by sealed QR and the microphone on the two pages that record.',
    '# Cloudflare serves /packets-qr.html at /packets-qr, so each page has both rules; "/" is index.html (the front door).',
  ];
  const rule = (route, allow) => { out.push(route, '  Permissions-Policy: ' + off(allow)); };
  for (const page of pages) {
    const allow = ALLOW[page];
    if (allow) Object.keys(allow).forEach((f) => out.push('# ' + page + ' ' + f + ': ' + allow[f]));
    rule('/' + page.replace(/\.html$/, ''), allow);
    rule('/' + page, allow);
  }
  rule('/', null);
  rule('/index.html', null);
  return out.join('\n') + '\n';
}

function checkOut(outArg) {
  if (!outArg || outArg === true) fail('Say where to build: --out=<folder> (outside this repository, or a git-ignored path in it).');
  const out = path.resolve(String(outArg));
  const fromRepo = path.relative(ROOT, out);
  const inside = fromRepo === '' || (!fromRepo.startsWith('..') && !path.isAbsolute(fromRepo));
  if (path.parse(out).root === out) fail('Refusing to build into a drive root: ' + out);
  if (fromRepo === '') fail('Refusing to build into the repository itself.');
  const upFromOut = path.relative(out, ROOT);
  if (!upFromOut.startsWith('..') && !path.isAbsolute(upFromOut)) fail('Refusing to build into a folder that holds the repository: ' + out);
  if (inside) {
    let ignored = false;
    try { execFileSync('git', ['check-ignore', '-q', '--', rel(fromRepo) + '/'], { cwd: ROOT, stdio: 'ignore' }); ignored = true; } catch (_) { ignored = false; }
    if (!ignored) fail('Refusing to build into ' + out + ': it is inside the repository and git does not ignore it (git check-ignore).');
  }
  return out;
}

// The meaning recordings (2026-11-23) are not in the repository: dev-tools/build_packets_meaning_audio.cjs makes them
// outside it, and --meaning-audio=<that folder> copies its index.json and the m-XXXX.json files the index names into
// packets_meaning_audio/ (what packets_vocab_media.js fetches). Without it, the site reads meanings with the device voice.
const MEANING_DIR = 'packets_meaning_audio';
function copyMeaningAudio(dir, out, entries, log) {
  const src = path.resolve(dir), indexFile = path.join(src, 'index.json');
  if (!fs.existsSync(indexFile)) fail('--meaning-audio: no index.json in ' + src);
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  if (index.format !== 'alloflow-meaning-audio-index/1' || !index.buckets || typeof index.buckets !== 'object') fail('--meaning-audio: ' + indexFile + ' is not a meaning recording index');
  const names = Object.keys(index.buckets).sort();
  for (const n of names) if (!/^m-[0-9a-f]{4}$/.test(n)) fail('--meaning-audio: the index names an odd file: ' + n);
  fs.mkdirSync(path.join(out, MEANING_DIR), { recursive: true });
  const put = (file, dest) => {
    const b = fs.readFileSync(file);
    if (b.length > MAX_FILE_BYTES) fail(file + ' is ' + b.length + ' bytes; Cloudflare Pages takes at most 25 MiB for one file.');
    fs.writeFileSync(path.join(out, dest), b);
    if (!fs.readFileSync(path.join(out, dest)).equals(b)) fail('The copy of ' + file + ' differs from the file.');
    entries.push({ path: dest, bytes: b.length, sha256: sha256(b) });
  };
  let clips = 0;
  for (const n of names) {
    const file = path.join(src, n + '.json');
    if (!fs.existsSync(file)) fail('--meaning-audio: the index names ' + n + '.json, which is not in ' + src);
    const shard = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (shard.format !== 'alloflow-meaning-audio-shard/1' || !shard.clips || typeof shard.clips !== 'object') fail('--meaning-audio: ' + file + ' is not a meaning recording file');
    clips += Object.keys(shard.clips).length;
    put(file, MEANING_DIR + '/' + n + '.json');
  }
  put(indexFile, MEANING_DIR + '/index.json');
  log('  Meaning recordings: ' + clips + ' in ' + names.length + ' files, from ' + src + '.');
}

function build(options) {
  const opt = options || {};
  const out = checkOut(opt.out);
  const log = opt.quiet ? () => {} : (s) => console.log(s);
  const p = plan({ pages: opt.pages });
  if (fs.existsSync(out)) {
    const there = fs.readdirSync(out);
    if (there.length) {
      if (!there.includes(MANIFEST)) fail('Refusing to empty ' + out + ': it has files and no ' + MANIFEST + ' (not a folder this script made).');
      fs.rmSync(out, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(out, { recursive: true });
  const entries = [];
  const copy = (src, dest) => {
    const from = path.join(ROOT, src);
    const to = path.join(out, dest);
    const st = fs.statSync(from);
    if (st.size > MAX_FILE_BYTES) fail(src + ' is ' + st.size + ' bytes; Cloudflare Pages takes at most 25 MiB (' + MAX_FILE_BYTES + ') for one file.');
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    const a = fs.readFileSync(from), b = fs.readFileSync(to);
    if (!a.equals(b)) fail('The copy of ' + src + ' differs from the file.');
    entries.push({ path: dest, bytes: b.length, sha256: sha256(b) });
  };
  for (const f of [...p.files.keys()].sort()) copy(f, f);
  copy('packets.html', 'index.html');
  if (opt.meaningAudio) copyMeaningAudio(String(opt.meaningAudio), out, entries, log);
  const headers = headersText(p.pages);
  fs.writeFileSync(path.join(out, '_headers'), headers);
  entries.push({ path: '_headers', bytes: Buffer.byteLength(headers), sha256: sha256(Buffer.from(headers)) });
  entries.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
  const count = entries.length + 1;
  if (count > MAX_FILES) fail(count + ' files; Cloudflare Pages takes at most ' + MAX_FILES + ' in one project.');
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  const manifest = { kind: 'alloflow-packets-site/1', built: new Date().toISOString(), source: 'dev-tools/build_packets_site.cjs', files: entries.length, bytes: total,
    runtime: p.runtime, otherSites: OTHER_SITES, entries };
  fs.writeFileSync(path.join(out, MANIFEST), JSON.stringify(manifest, null, 1) + '\n');
  log('Built ' + out);
  log('  ' + count + ' files (with ' + MANIFEST + '), ' + total + ' bytes (' + (total / 1048576).toFixed(1) + ' MiB) besides the manifest.');
  log('  Largest:');
  entries.slice().sort((x, y) => y.bytes - x.bytes).slice(0, 10).forEach((e) => log('    ' + (e.bytes / 1048576).toFixed(2).padStart(7) + ' MiB  ' + e.path));
  log('  Loaded at run time (read from the code):');
  p.runtime.forEach((r) => log('    ' + r.from + '  ' + r.file + '  [' + r.how + ']'));
  log('  Other sites the pages may contact (not copied):');
  OTHER_SITES.forEach((s) => log('    ' + s.site + ' <- ' + s.pages.join(', ') + ': ' + s.when));
  return { out, count, total, entries, plan: p, headers };
}

function inspectMeaningAudio(dir) {
  const src = path.resolve(dir), indexFile = path.join(src, 'index.json');
  if (!fs.existsSync(indexFile)) fail('--meaning-audio: no index.json in ' + src);
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  if (index.format !== 'alloflow-meaning-audio-index/1' || !index.buckets || typeof index.buckets !== 'object') fail('--meaning-audio: ' + indexFile + ' is not a meaning recording index');
  const names = Object.keys(index.buckets).sort();
  let bytes = fs.statSync(indexFile).size, maxBytes = bytes, clips = 0;
  for (const n of names) {
    if (!/^m-[0-9a-f]{4}$/.test(n)) fail('--meaning-audio: the index names an odd file: ' + n);
    const file = path.join(src, n + '.json');
    if (!fs.existsSync(file)) fail('--meaning-audio: the index names ' + n + '.json, which is not in ' + src);
    const st = fs.statSync(file);
    if (st.size > MAX_FILE_BYTES) fail(file + ' is ' + st.size + ' bytes; Cloudflare Pages takes at most 25 MiB for one file.');
    if (st.size > maxBytes) maxBytes = st.size;
    bytes += st.size;
    clips += Number(index.buckets[n]) || 0;
  }
  return { src, files: names.length + 1, shards: names.length, clips, bytes, maxBytes };
}

if (require.main === module) {
  const arg = (name) => { const hit = process.argv.slice(2).find((a) => a === '--' + name || a.startsWith('--' + name + '=')); return hit ? (hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true) : null; };
  try {
    if (arg('plan')) {
      const p = plan({ pages: arg('pages') ? String(arg('pages')).split(',').filter(Boolean) : undefined });
      let repoBytes = 0;
      for (const f of p.files.keys()) repoBytes += fs.statSync(path.join(ROOT, f)).size;
      repoBytes += fs.statSync(path.join(ROOT, 'packets.html')).size;
      const meanArg = arg('meaning-audio');
      const mean = meanArg ? inspectMeaningAudio(String(meanArg)) : null;
      // +3 for index.html, _headers, and packets-site-manifest.json
      const totalFiles = p.files.size + 3 + (mean ? mean.files : 0);
      const totalBytes = repoBytes + (mean ? mean.bytes : 0);
      if (totalFiles > MAX_FILES) fail(totalFiles + ' files; Cloudflare Pages takes at most ' + MAX_FILES + ' in one project.');
      console.log('Packets site plan OK (' + p.pages.length + ' pages)');
      console.log('  Site files: ' + (p.files.size + 3) + ' (' + (repoBytes / 1048576).toFixed(1) + ' MiB)');
      if (mean) console.log('  Meaning audio: ' + mean.clips + ' clips in ' + mean.files + ' files (' + (mean.bytes / 1048576).toFixed(1) + ' MiB; largest shard ' + (mean.maxBytes / 1024).toFixed(1) + ' KB)');
      console.log('  Total: ' + totalFiles + ' / ' + MAX_FILES + ' Cloudflare Pages file limit (' + (totalBytes / 1048576).toFixed(1) + ' MiB)');
    } else {
      build({ out: arg('out'), meaningAudio: arg('meaning-audio') });
    }
  } catch (e) { console.error(e.packetsSite ? 'build_packets_site: ' + e.message : e); process.exitCode = 1; }
}
module.exports = { plan, build, headersText, checkOut, copyMeaningAudio, inspectMeaningAudio, MEANING_DIR, RUNTIME, INDEXES, OTHER_SITES, PERMISSIONS, ALLOW, EXCLUDED, MANIFEST, MAX_FILES, MAX_FILE_BYTES };
