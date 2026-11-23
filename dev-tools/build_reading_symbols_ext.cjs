#!/usr/bin/env node
'use strict';

// Extended reading symbol bank for Read-Along, Glossary, and Reading Supports.
// Decoupled from Word Sounds' narrow phonics/hasClip rules (word_sounds_symbols_en.js stays untouched
// so all pinned Word Sounds phonics fixtures remain invariant).
//
// Harvests verified, child-safe SVGs already vendored in data/vendor/mulberry/symbols and
// data/vendor/openmoji/symbols (and optional --from <mulberry-dir> / --openmoji-from <openmoji-dir>
// / --bioicons-from <dir> for future offline releases), filters every SVG through svgRefusal(),
// and writes:
//   reading_symbols_ext_en.js          runtime index (window.AlloReadingSymbolsExt / AlloModules.ReadingSymbolsExt)
//   reading_symbols/en-ext-<n>.json    CC BY-SA 4.0 / CC0 SVG shards (one set per shard, <= 1 MB each)
//
// Usage:
//   node dev-tools/build_reading_symbols_ext.cjs              build index + shards
//   node dev-tools/build_reading_symbols_ext.cjs --check      fail if outputs are out of date
//   node dev-tools/build_reading_symbols_ext.cjs --report     print counts and write nothing

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const MUL_VENDOR = path.join(ROOT, 'data/vendor/mulberry');
const MUL_DIR = path.join(MUL_VENDOR, 'symbols');
const OM_VENDOR = path.join(ROOT, 'data/vendor/openmoji');
const OM_DIR = path.join(OM_VENDOR, 'symbols');
const OM_PREFIX = 'openmoji/';
const SHARD_DIR = 'reading_symbols';
const INDEX_FILE = path.join(ROOT, 'reading_symbols_ext_en.js');
const SHARD_MAX = 950000;

const BOM = new RegExp('^' + String.fromCharCode(0xFEFF));
const LINE_ENDS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const jsonText = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(LINE_ENDS, (ch) => (ch.charCodeAt(0) === 0x2028 ? '\\u2028' : '\\u2029'));
const isOpenMoji = (file) => String(file).indexOf(OM_PREFIX) === 0;

function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.ext-' + process.pid + '.tmp';
  fs.writeFileSync(tmp, content);
  if (fs.readFileSync(tmp, 'utf8') !== content) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw new Error('Short write: ' + file);
  }
  fs.renameSync(tmp, file);
}

// Curated, child-safe reading symbols from already-vendored Mulberry Symbols & OpenMoji SVGs
// that Word Sounds holds out only because of single-meaning phonics isolation.
// Each entry: { file, label, words: [...] }. Words already present in word_sounds_symbols_en.js are skipped.
const CURATED_READING_EXT = [
  // OpenMoji (6 vendored symbols held from Word Sounds due to multi-sense Mulberry collisions)
  { file: 'openmoji/1F414.svg', label: 'chicken', words: ['chicken', 'chickens', 'hen', 'hens', 'poultry'] },
  { file: 'openmoji/1F468.svg', label: 'man', words: ['man', 'men'] },
  { file: 'openmoji/1F997.svg', label: 'cricket', words: ['cricket', 'crickets'] },
  { file: 'openmoji/231A.svg', label: 'watch', words: ['watch', 'watches', 'wristwatch'] },
  { file: 'openmoji/E1D1.svg', label: 'keyboard', words: ['keyboard', 'keyboards'] },
  { file: 'openmoji/E204.svg', label: 'elevator', words: ['elevator', 'elevators'] },

  // Mulberry feeling faces (11 clear expressions)
  { file: 'afraid_lady.svg', label: 'afraid', words: ['afraid', 'scared', 'frightened', 'fearful'] },
  { file: 'angry_lady.svg', label: 'angry', words: ['angry', 'angrier', 'angriest', 'mad', 'furious'] },
  { file: 'confused_lady.svg', label: 'confused', words: ['confused', 'puzzled', 'baffled'] },
  { file: 'disgusted_lady.svg', label: 'disgusted', words: ['disgusted', 'grossed'] },
  { file: 'excited_lady.svg', label: 'excited', words: ['excited', 'thrilled', 'eager'] },
  { file: 'happy_lady.svg', label: 'happy', words: ['happy', 'happier', 'happiest', 'glad', 'cheerful', 'joyful'] },
  { file: 'jealous_lady.svg', label: 'jealous', words: ['jealous', 'envious'] },
  { file: 'laughing_lady.svg', label: 'laugh', words: ['laugh', 'laughs', 'laughing', 'laughed', 'giggle', 'chuckle'] },
  { file: 'sad_lady.svg', label: 'sad', words: ['sad', 'sadder', 'saddest', 'unhappy', 'gloomy'] },
  { file: 'surprised_lady.svg', label: 'surprised', words: ['surprised', 'surprise', 'amazed', 'astonished'] },
  { file: 'worried_lady.svg', label: 'worried', words: ['worried', 'worry', 'worries', 'worrying', 'anxious'] },

  // Mulberry clear concrete nouns / family / everyday objects
  { file: 'aeroplane.svg', label: 'airplane', words: ['airplane', 'airplanes', 'plane', 'planes', 'aeroplane', 'jet'] },
  { file: 'dad_parent.svg', label: 'dad', words: ['dad', 'dads', 'daddy', 'father', 'fathers', 'papa'] },
  { file: 'mum_parent.svg', label: 'mom', words: ['mom', 'moms', 'mommy', 'mother', 'mothers', 'mama'] },
  { file: 'hat_-_mans.svg', label: 'hat', words: ['hat', 'hats'] },
  { file: 'shoe_-_mans.svg', label: 'shoe', words: ['shoe', 'shoes'] },
  { file: 'suit_-_mans.svg', label: 'suit', words: ['suit', 'suits'] },
  { file: 'letter.svg', label: 'letter', words: ['letter', 'letters', 'envelope', 'mail'] },
  { file: 'cream_2.svg', label: 'cream', words: ['cream', 'creamy'] },
  { file: 'sweet.svg', label: 'candy', words: ['sweet', 'sweets', 'candy', 'candies'] },
  { file: 'tie.svg', label: 'tie', words: ['tie', 'ties', 'necktie'] },
  { file: 'bow.svg', label: 'bow', words: ['bow', 'bows', 'ribbon', 'ribbons'] },
  { file: 'tin.svg', label: 'can', words: ['can', 'cans', 'tin', 'tins'] },
  { file: 'squash.svg', label: 'squash', words: ['squash', 'squashes'] },
  { file: 'lady_-_face.svg', label: 'lady', words: ['lady', 'ladies'] },
  { file: 'torch_2.svg', label: 'flashlight', words: ['flashlight', 'flashlights'] },
  { file: 'trainers.svg', label: 'sneakers', words: ['sneaker', 'sneakers'] },
  { file: 'biscuits.svg', label: 'cookie', words: ['cookie', 'cookies', 'biscuit', 'biscuits'] },
  { file: 'cot.svg', label: 'crib', words: ['crib', 'cribs'] },
  { file: 'tap.svg', label: 'faucet', words: ['faucet', 'faucets', 'tap', 'taps'] },
  { file: 'break_2.svg', label: 'break', words: ['break', 'breaks', 'breaking', 'broke', 'broken'] },
  { file: 'second.svg', label: 'second', words: ['second'] },
  { file: 'lorry_2.svg', label: 'truck', words: ['truck', 'trucks', 'lorry'] },

  // Mulberry clear everyday actions (action with an object / multi-sense)
  { file: 'brush_teeth_,_to.svg', label: 'brush', words: ['brush', 'brushes', 'brushing', 'brushed'] },
  { file: 'call_out_,_to.svg', label: 'call', words: ['call', 'calls', 'calling', 'called'] },
  { file: 'clap_hands_,_to.svg', label: 'clap', words: ['clap', 'claps', 'clapping', 'clapped', 'applaud'] },
  { file: 'clean_window_,_to.svg', label: 'clean', words: ['clean', 'cleans', 'cleaning', 'cleaned', 'cleaner', 'cleanest'] },
  { file: 'climb_tree_,_to.svg', label: 'climb', words: ['climb', 'climbs', 'climbing', 'climbed'] },
  { file: 'copy.svg', label: 'copy', words: ['copy', 'copies', 'copying', 'copied'] },
  { file: 'cover_food_,_to.svg', label: 'cover', words: ['cover', 'covers', 'covering', 'covered'] },
  { file: 'cut_,_to.svg', label: 'cut', words: ['cut', 'cuts', 'cutting'] },
  { file: 'dip_food_,_to.svg', label: 'dip', words: ['dip', 'dips', 'dipping', 'dipped'] },
  { file: 'fall_over_,_to.svg', label: 'fall', words: ['fall', 'falls', 'falling', 'fell', 'fallen'] },
  { file: 'feed_dog_,_to.svg', label: 'feed', words: ['feed', 'feeds', 'feeding', 'fed'] },
  { file: 'fold_clothes_,_to.svg', label: 'fold', words: ['fold', 'folds', 'folding', 'folded'] },
  { file: 'join_,_to.svg', label: 'join', words: ['join', 'joins', 'joining', 'joined'] },
  { file: 'kick_ball_,_to.svg', label: 'kick', words: ['kick', 'kicks', 'kicking', 'kicked'] },
  { file: 'pack_suitcase_,_to.svg', label: 'pack', words: ['pack', 'packs', 'packing', 'packed'] },
  { file: 'pat_dog_,_to.svg', label: 'pat', words: ['pat', 'pats', 'patting', 'patted'] },
  { file: 'press_button_,_to.svg', label: 'press', words: ['press', 'presses', 'pressing', 'pressed'] },
  { file: 'reach_for_,_to.svg', label: 'reach', words: ['reach', 'reaches', 'reaching', 'reached'] },
  { file: 'ride_horse_,_to.svg', label: 'ride', words: ['ride', 'rides', 'riding', 'rode', 'ridden'] },
  { file: 'roll_dice_,_to.svg', label: 'roll', words: ['roll', 'rolls', 'rolling', 'rolled'] },
  { file: 'score_goal_,_to.svg', label: 'score', words: ['score', 'scores', 'scoring', 'scored'] },
  { file: 'show_me_,_to.svg', label: 'show', words: ['show', 'shows', 'showing', 'showed', 'shown'] },
  { file: 'sign_,_to.svg', label: 'sign', words: ['sign', 'signs', 'signing', 'signed'] },
  { file: 'sleep_female_,_to.svg', label: 'sleep', words: ['sleep', 'sleeps', 'sleeping', 'slept', 'slumber'] },
  { file: 'stamp_,_to.svg', label: 'stamp', words: ['stamp', 'stamps', 'stamping', 'stamped'] },
  { file: 'tear_,_to.svg', label: 'tear', words: ['tear', 'tears', 'tearing', 'tore', 'torn', 'rip'] },
  { file: 'text_mobile_message_,_to.svg', label: 'text', words: ['text', 'texts', 'texting', 'texted'] },
  { file: 'throw_away_,_to.svg', label: 'throw', words: ['throw', 'throws', 'throwing', 'threw', 'thrown'] },
  { file: 'toss_pancake_,_to.svg', label: 'toss', words: ['toss', 'tosses', 'tossing', 'tossed'] },
  { file: 'transport_car_,_to.svg', label: 'transport', words: ['transport', 'transports', 'transporting', 'transported'] },
  { file: 'wag_tail_,_to.svg', label: 'wag', words: ['wag', 'wags', 'wagging', 'wagged'] },
  { file: 'wake_up_,_to.svg', label: 'wake', words: ['wake', 'wakes', 'waking', 'woke', 'woken', 'awake'] },
  { file: 'wash_hands_,_to.svg', label: 'wash', words: ['wash', 'washes', 'washing', 'washed'] },
  { file: 'wear_helmet_,_to.svg', label: 'wear', words: ['wear', 'wears', 'wearing', 'wore', 'worn'] },
  { file: 'wipe_table_,_to.svg', label: 'wipe', words: ['wipe', 'wipes', 'wiping', 'wiped'] },
];

function compute() {
  const symTool = require(path.join(ROOT, 'dev-tools/build_word_sounds_symbols.cjs'));
  const packetTool = require(path.join(ROOT, 'dev-tools/make_word_sounds_packet.cjs'));
  const { builder } = packetTool.loadParts();
  const baseSymbols = symTool.loadSymbols();
  const mulSource = JSON.parse(read(path.join(MUL_VENDOR, 'source.json')));
  const omSource = JSON.parse(read(path.join(OM_VENDOR, 'source.json')));

  const symbols = {};
  const labelOf = {};
  const wordFiles = {};
  const skippedExisting = [];
  const missingFiles = [];
  const refusedFiles = [];

  for (const item of CURATED_READING_EXT) {
    const file = item.file;
    const diskPath = isOpenMoji(file)
      ? path.join(OM_DIR, file.slice(OM_PREFIX.length))
      : path.join(MUL_DIR, file);
    if (!fs.existsSync(diskPath)) {
      missingFiles.push(file);
      continue;
    }
    const rawSvg = read(diskPath);
    const minSvg = symTool.minifySvg(rawSvg);
    const why = builder.svgRefusal(minSvg);
    if (why) {
      refusedFiles.push({ file, why });
      continue;
    }
    let addedWord = false;
    for (const rawW of item.words) {
      const w = String(rawW || '').trim().toLowerCase();
      if (!/^[a-z]{2,24}$/.test(w)) continue;
      if (baseSymbols.has(w)) {
        skippedExisting.push(w);
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(wordFiles, w)) {
        wordFiles[w] = file;
        addedWord = true;
      }
    }
    if (addedWord) {
      symbols[file] = minSvg;
      labelOf[file] = item.label;
    }
  }

  if (missingFiles.length) throw new Error('Missing vendored SVG files: ' + missingFiles.join(', '));
  if (refusedFiles.length) throw new Error('Refused SVG files: ' + JSON.stringify(refusedFiles));

  const mulFiles = Object.keys(symbols).filter((f) => !isOpenMoji(f)).sort();
  const omFiles = Object.keys(symbols).filter(isOpenMoji).sort();
  const groups = [];
  [['mulberry', mulFiles], ['openmoji', omFiles]].forEach(([set, list]) => {
    let now = null;
    list.forEach((f) => {
      const size = Buffer.byteLength(symbols[f]);
      if (!now || (now.size + size > SHARD_MAX && now.files.length)) {
        now = { set, files: [], size: 0 };
        groups.push(now);
      }
      now.files.push(f);
      now.size += size;
    });
  });

  const mulCredit = { set: 'Mulberry Symbols', author: mulSource.author, license: mulSource.licenseShort, licenseUrl: mulSource.licenseUrl, url: mulSource.homepage, version: mulSource.version };
  const omCredit = { set: omSource.name, author: omSource.author, license: omSource.licenseShort, licenseUrl: omSource.licenseUrl, url: omSource.homepage, version: omSource.version };
  const mulAbout = 'Mulberry Symbols ' + mulSource.version + ' (' + mulSource.homepage + '), ' + mulSource.copyright + ', licensed under ' + mulSource.licenseShort + ' (' + mulSource.licenseUrl + '). Extended reading symbols for Read-Along and Glossary.';
  const omAbout = omSource.name + ' ' + omSource.version + ' (' + omSource.homepage + '): ' + omSource.attribution + ' Licensed under ' + omSource.licenseShort + ' (' + omSource.licenseUrl + '). Extended reading symbols for Read-Along and Glossary.';

  const shards = groups.map((group, i) => {
    const url = SHARD_DIR + '/en-ext-' + (i + 1) + '.json';
    const text = '{"about":' + jsonText(group.set === 'openmoji' ? omAbout : mulAbout) + ',"version":1,"language":"en","set":' + jsonText(group.set) + ',"shard":' + (i + 1) + ',"of":' + groups.length + ',"symbols":{\n'
      + group.files.map((f) => jsonText(f) + ':' + jsonText(symbols[f])).join(',\n') + '\n}}\n';
    return { url, text, bytes: Buffer.byteLength(text), sha256: sha256(text), symbols: group.files.length, set: group.set };
  });

  const files = mulFiles.concat(omFiles);
  const fileIndex = {};
  files.forEach((f, i) => { fileIndex[f] = i; });
  const starts = shards.map((s, i) => files.indexOf(groups[i].files[0]));
  const labels = files.map((f) => labelOf[f] || '');
  const sets = files.map((f) => (isOpenMoji(f) ? 'openmoji' : 'mulberry'));
  const wordList = Object.keys(wordFiles).sort().filter((w) => fileIndex[wordFiles[w]] != null);
  const wordFileIdx = wordList.map((w) => fileIndex[wordFiles[w]]);

  const mulNotice = read(path.join(MUL_VENDOR, 'LICENSE.txt')).replace(/\r\n?/g, '\n').trim();
  const omNotice = omSource.name + ' ' + omSource.version + '\n' + '='.repeat((omSource.name + ' ' + omSource.version).length) + '\n\n' + omSource.attribution + '\n\n' + omSource.licenseStatement;
  const credits = { mulberry: mulCredit, openmoji: omCredit };
  const notices = { mulberry: mulNotice, openmoji: omNotice };

  const indexText = [
    '// Generated by dev-tools/build_reading_symbols_ext.cjs. Do not edit.',
    '// Extended offline reading symbols (Mulberry Symbols + OpenMoji, CC BY-SA 4.0) for Read-Along, Glossary, and Picture Reader.',
    '// Keeps word_sounds_symbols_en.js untouched so Word Sounds phonics fixtures stay invariant.',
    'var createReadingSymbolsExt = (function () {',
    "  'use strict';",
    '  var cached;',
    '  return function createReadingSymbolsExt() {',
    '    if (cached) return cached;',
    '    var credit = Object.freeze(' + JSON.stringify(mulCredit) + ');',
    '    var notice = ' + JSON.stringify(mulNotice) + ';',
    '    var credits = Object.freeze({ mulberry: credit, openmoji: Object.freeze(' + JSON.stringify(omCredit) + ') });',
    '    var notices = Object.freeze({ mulberry: notice, openmoji: ' + JSON.stringify(omNotice) + ' });',
    '    var shards = Object.freeze(' + JSON.stringify(shards.map((s) => ({ url: s.url, bytes: s.bytes, sha256: s.sha256, symbols: s.symbols, set: s.set }))) + '.map(Object.freeze));',
    '    var files = ' + JSON.stringify(files) + ';',
    '    var labels = ' + JSON.stringify(labels) + ';',
    '    var sets = ' + JSON.stringify(sets) + ';',
    '    var starts = ' + JSON.stringify(starts) + ';',
    '    var wordList = ' + JSON.stringify(wordList.join(' ')) + ".split(' ').filter(Boolean);",
    '    var wordFile = ' + JSON.stringify(wordFileIdx) + ';',
    '    var fileShard = files.map(function (f, i) { var s = 0; while (s + 1 < starts.length && starts[s + 1] <= i) s++; return s; });',
    '    var words = Object.create(null);',
    '    wordList.forEach(function (w, i) { words[w] = wordFile[i]; });',
    '    var svgs = Object.create(null), added = Object.create(null), loading = null;',
    "    function key(word) { return String(word == null ? '' : word).trim().toLowerCase(); }",
    '    function has(word) { return Object.prototype.hasOwnProperty.call(words, key(word)); }',
    '    function add(data) {',
    "      var list = data && data.symbols && typeof data.symbols === 'object' ? data.symbols : null, n = 0;",
    '      if (!list) return 0;',
    '      files.forEach(function (file, i) {',
    "        if (!Object.prototype.hasOwnProperty.call(list, file) || typeof list[file] !== 'string') return;",
    '        if (svgs[i] == null) n++;',
    '        svgs[i] = list[file];',
    '        added[fileShard[i]] = true;',
    '      });',
    '      return n;',
    '    }',
    '    function get(word) {',
    '      if (!has(word)) return null;',
    '      var i = words[key(word)];',
    '      return svgs[i] == null ? null : { file: files[i], svg: svgs[i], label: labels[i], set: sets[i] };',
    '    }',
    '    function ready() { return shards.every(function (s, i) { return !!added[i]; }); }',
    '    function load(opts) {',
    '      if (ready()) return Promise.resolve(true);',
    '      if (loading) return loading;',
    "      var fetchFn = (opts && opts.fetch) || (typeof fetch === 'function' ? fetch : null);",
    '      if (!fetchFn) return Promise.resolve(false);',
    '      var base = (opts && typeof opts.base === \'string\') ? opts.base : \'\';',
    '      loading = Promise.all(shards.map(function (sh, idx) {',
    '        if (added[idx]) return Promise.resolve();',
    '        return Promise.resolve(fetchFn(base + sh.url)).then(function (r) { return r && r.ok ? r.text() : null; }).then(function (txt) {',
    '          if (!txt || txt.length > 4 * 1024 * 1024) return;',
    "          var data = JSON.parse(txt, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });",
    '          if (data) add(data);',
    '        }, function () {});',
    '      })).then(function () { loading = null; return ready(); }, function () { loading = null; return false; });',
    '      return loading;',
    '    }',
    "    cached = Object.freeze({ version: 1, language: 'en', credit: credit, notice: notice, credits: credits, notices: notices, count: wordList.length, symbols: files.length,",
    '      bytes: ' + shards.reduce((n, s) => n + s.bytes, 0) + ', shards: shards, has: has, file: function (word) { return has(word) ? files[words[key(word)]] : null; },',
    '      set: function (word) { return has(word) ? sets[words[key(word)]] : null; },',
    '      add: add, get: get, ready: ready, load: load, words: function () { return wordList.slice(); } });',
    '    return cached;',
    '  };',
    '})();',
    '(function (root) {',
    '  var api = createReadingSymbolsExt();',
    '  if (root) {',
    '    root.AlloReadingSymbolsExt = api;',
    '    root.AlloModules = root.AlloModules || {};',
    '    root.AlloModules.ReadingSymbolsExt = api;',
    '  }',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = api;",
    "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));",
    '',
  ].join('\n');

  return { indexText, shards, wordList, files, skippedExisting };
}

function loadReadingSymbolsExt() {
  delete require.cache[require.resolve(INDEX_FILE)];
  const api = require(INDEX_FILE);
  api.shards.forEach((s) => api.add(JSON.parse(read(path.join(ROOT, s.url)))));
  return api;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const report = args.includes('--report');
  const made = compute();
  const totalBytes = made.shards.reduce((n, s) => n + s.bytes, 0);
  if (report) {
    console.log('Extended reading symbols:', made.wordList.length, 'words,', made.files.length, 'SVGs,', made.shards.length, 'shards,', totalBytes, 'bytes; index', Buffer.byteLength(made.indexText), 'bytes; skipped already-in-base:', made.skippedExisting.length);
    return;
  }
  if (check) {
    const problems = [];
    if (!fs.existsSync(INDEX_FILE) || read(INDEX_FILE) !== made.indexText) problems.push('reading_symbols_ext_en.js differs');
    for (const sh of made.shards) {
      const p = path.join(ROOT, sh.url);
      if (!fs.existsSync(p) || read(p) !== sh.text) problems.push(sh.url + ' differs');
    }
    const dir = path.join(ROOT, SHARD_DIR);
    if (fs.existsSync(dir)) {
      const want = new Set(made.shards.map((s) => path.basename(s.url)));
      for (const f of fs.readdirSync(dir)) {
        if (/^en-ext-\d+\.json$/.test(f) && !want.has(f)) problems.push('stale shard: ' + f);
      }
    }
    if (problems.length) {
      console.error('Reading symbols ext check failed:\n  ' + problems.join('\n  '));
      process.exit(1);
    }
    console.log('Reading symbols ext OK:', made.wordList.length, 'words,', made.files.length, 'SVGs,', made.shards.length, 'shards.');
    return;
  }
  const dir = path.join(ROOT, SHARD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const want = new Set(made.shards.map((s) => path.basename(s.url)));
  for (const f of fs.readdirSync(dir)) {
    if (/^en-ext-\d+\.json$/.test(f) && !want.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  for (const sh of made.shards) writeAtomic(path.join(ROOT, sh.url), sh.text);
  writeAtomic(INDEX_FILE, made.indexText);
  console.log('Built reading_symbols_ext_en.js +', made.shards.length, 'shards:', made.wordList.length, 'words,', made.files.length, 'SVGs,', totalBytes, 'bytes.');
}

if (require.main === module) main();
module.exports = { CURATED_READING_EXT, compute, loadReadingSymbolsExt };
