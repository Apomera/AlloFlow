#!/usr/bin/env node
'use strict';

// Pictures for Word Sounds packets. Matches the usable words of the word list to Mulberry Symbols
// (data/vendor/mulberry: CC BY-SA 4.0, Steve Lee) and writes
//   data/word_sounds_symbols_map_en.json   every matched word: word, file, status, note
//   word_sounds_symbols_en.js              which words have a picture a packet can use today, and where it is
//   word_sounds_symbols/en-<n>.json        those pictures, in files of at most about 1 MB
//
//   node dev-tools/build_word_sounds_symbols.cjs                     re-make all three from data/vendor/mulberry
//   node dev-tools/build_word_sounds_symbols.cjs --check             fail when any of them is out of date
//   node dev-tools/build_word_sounds_symbols.cjs --from <folder>     also copy the symbol files that are needed
//                                                                    from an unzipped Mulberry release
//   node dev-tools/build_word_sounds_symbols.cjs --review <file> [--doubtful <json>]   write the review sheet
//   node dev-tools/build_word_sounds_symbols.cjs --report            print the counts and write nothing
//
// No network: a person downloads the release once (data/vendor/mulberry/source.json says from where).
//
// Matching is deliberately narrow. A word gets a picture on its own ("auto") only when the symbols
// named exactly that word are all of one kind, or the word is the plain plural of such a name and the
// picture is of a thing. Where symbols of different kinds share the name nothing is chosen
// ("ambiguous"), unless CHILD_SENSE names the everyday one. HELD and REJECTED are the script author's
// doubts. A person's decisions go in data/word_sounds_symbols_review_en.json and win over everything
// here. Only "auto" and "reviewed" words reach a packet.
//
// The page data holds only the words that have a recording, because a packet cannot use a word
// without one: re-run this script after recordings are added.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'data/vendor/mulberry');
const SYMBOL_DIR = path.join(VENDOR, 'symbols');
const MAP_FILE = path.join(ROOT, 'data/word_sounds_symbols_map_en.json');
const REVIEW_FILE = path.join(ROOT, 'data/word_sounds_symbols_review_en.json');
const INDEX_FILE = path.join(ROOT, 'word_sounds_symbols_en.js');
const SHARD_DIR = 'word_sounds_symbols';
const SHARD_MAX = 1000000;
const STATUSES = ['auto', 'ambiguous', 'rejected', 'reviewed'];
const STAGE_ORDER = ['K early', 'K late', 'G1 early', 'G1 late', 'G2'];

// Symbols that are never a picture of a practice word: flags and outline maps are named after
// countries, and the alphabet symbols are letters.
const SKIP_CATEGORIES = ['Country Flags', 'Country Maps', 'Alphabet'];
// A plural word may borrow the picture of ONE thing only when that picture is of a thing: not from these.
const NOT_A_THING = /^(Descriptive |Verb$|Question$|People Feelings$|People Actions$|People Descriptive$|Number|Computer Icon$|Communication |Art |Environment Weather$|Work and School Subjects$|Work and School Timetable$|Healthcare Medical conditions$|Science Eco$|Science$|Politics$|Religion |Celebration Event$|.* [Aa]ctions$|.* activities$|Animal Activity |Building Household tasks$)/;
// Names whose plural is not "more than one of the picture" (woods is a forest, papers are documents).
const NOT_PLURAL = ['art', 'charge', 'food', 'grass', 'ground', 'paper', 'skin', 'travel', 'water', 'wood', 'world', 'test', 'stock', 'money', 'meat', 'bread', 'rice', 'cheese', 'butter', 'cream', 'honey', 'milk', 'tea', 'coffee', 'toast', 'soup', 'wool', 'furniture', 'jam', 'jelly', 'salt', 'soap', 'chalk', 'glue', 'glitter', 'clay', 'plastic', 'fabric', 'glass', 'cardboard', 'beef', 'bacon', 'ham', 'salad', 'cereal', 'porridge', 'pastry', 'spaghetti', 'stuffing', 'lemonade', 'medicine', 'perfume', 'toothpaste'];

// Symbols of different kinds share the word. The everyday thing a young child means is named here by
// the author of this script, from the names, the categories and a look at every drawing (2026-11-11).
// A person's review (the review file) still wins. Keep this list short and obvious: a thing over "to do it".
const CHILD_SENSE = {
  drink: 'drink.svg',       // a drink, not "to drink"
  fish: 'fish.svg',         // the animal, not "to fish"
  iron: 'iron.svg',         // the thing, not "to iron"
  paint: 'paint.svg',
  rake: 'rake.svg',
  salt: 'salt.svg',
  shower: 'shower.svg',
  slide: 'slide.svg',       // the playground slide, not "to slide"
  swing: 'swing.svg',
  whisk: 'whisk.svg',
  lamb: 'lamb_2.svg',       // the animal, not the meat
  rocket: 'rocket.svg',     // the space rocket, not the firework
  plant: 'plant.svg',       // a plant, not "to plant"
  scoop: 'scoop.svg',
  bone: 'bone.svg',         // both drawings are a bone; this is the shape a child draws
  mirror: 'mirror.svg',     // all three are mirrors
  saddle: 'saddle.svg',     // both are horse saddles
  open: 'open.svg',         // an open door, not a hand opening a jar
  short: 'short.svg',       // a short person beside a tall one
  sink: 'sink.svg',         // a sink, not a ship sinking
  thin: 'thin_2.svg',       // a thin rod beside a thick one; the other drawing compares two people's bodies
};
// One kind of symbol has the name, but the script author doubts it: very likely another meaning than
// a young child's (often a British one: the set is British), or a drawing a child would not read as the
// word. Held for a person ("ambiguous"): never used until reviewed. Plurals of a held word are held too.
const HELD = {
  chicken: 'a roast chicken (the food), not the bird',
  cracker: 'a Christmas cracker (British), not the food',
  cream: 'the first drawing is a speck in a huge empty page (a fault in the file); cream_2 is the other drawing',
  lump: 'a lump on the body',
  operation: 'a surgery scene',
  box: 'the only symbol is "to box" (boxing); a child means the container',
  dice: 'the only symbol is "to dice" (cutting food); a child means the game dice',
  park: 'the only symbol is "to park" (a car); a child means the playground',
  sign: 'the only symbol is "to sign"; a child may mean a road sign',
  stamp: 'the only symbol is "to stamp"; a child may mean a postage stamp',
  tear: 'the only symbol is "to tear" (rip); the word is also the tear of crying, said differently',
  lead: 'a dog lead (British for leash); the word is also the metal and "to lead", said differently',
  bow: 'a ribbon bow; the word is also "to bow", said differently, and a bow and arrow',
  light: 'the symbol means "not heavy"; a child usually means a lamp or daylight',
  tap: 'a water tap (British for faucet)',
  chips: 'British chips (fries)',
  pants: 'British pants (underwear)',
  plaster: 'British plaster (a bandage)',
  football: 'a soccer ball (British football)',
  lift: 'a lift (British for elevator)',
  coach: 'a coach (British for a long-distance bus), not a sports coach',
  cot: 'a baby cot (British for crib)',
  jelly: 'British jelly (a gelatin dessert)',
  biscuits: 'British biscuits (cookies)',
  trainers: 'British trainers (sneakers)',
  tin: 'a tin (British for a food can)',
  mole: 'a mole on the skin; a child usually means the animal',
  calf: 'the calf of the leg; a child usually means the young cow',
  temple: 'the temple of the head, not the building',
  gum: 'the gums of the mouth; a child usually means chewing gum',
  plane: 'a woodworking plane; a child means an airplane',
  file: 'a metal file (the tool)',
  vice: 'a workshop vice (British spelling of vise)',
  stock: 'cooking stock',
  letter: 'a letter in an envelope; in a phonics lesson a child means a letter of the alphabet',
  paste: 'the computer "paste" icon; a child means glue',
  save: 'the computer "save" icon',
  cross: 'a Christian cross',
  bless: 'a religious blessing',
  fight: 'the drawing shows people fighting',
  steal: 'the drawing shows a theft',
  arrest: 'the drawing shows an arrest',
  cheat: 'the drawing shows cheating',
  even: 'two pairs of arrows; a child will not read it as "even"',
  pupil: 'the pupil of the eye, not a school pupil',
  front: 'the front of the body',
};
// Never used, whatever the word list says.
const REJECTED = {
  smoke: 'the only symbol is "to smoke" (a cigarette)',
  risen: 'a religious picture',
  guy: 'a "guy" burning on a bonfire (British Bonfire Night)',
  drinks: 'the drawing shows a glass of wine',
  soldier: 'the drawing shows a rifle',
};

// Written with character codes: a byte-order mark, and the two line ends JSON allows but a script does not.
const BOM = new RegExp('^' + String.fromCharCode(0xFEFF));
const LINE_ENDS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const writeAtomic = (file, content) => {
  const tmp = file + '.sym-' + process.pid + '.tmp';
  fs.writeFileSync(tmp, content);
  if (fs.readFileSync(tmp, 'utf8') !== content) { fs.unlinkSync(tmp); throw new Error('Short write: ' + file); }
  fs.renameSync(tmp, file);
};

// RFC 4180 cells: quoted cells may hold commas and doubled quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const body = text.replace(BOM, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && body[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

// A symbol name as the set writes it: words joined by "_", then (in this order from the end)
// "_,_to" for a verb ("run_,_to" is "to run"), "_2" or "_1a" for another drawing, and
// "_-_qualifier" for a kind ("hat_-_ladies").
function nameParts(name) {
  let rest = String(name), verb = false, variant = '', qualifier = '';
  if (/_,_to$/.test(rest)) { verb = true; rest = rest.slice(0, -5); }
  const numbered = /_(\d+[a-z]?)$/.exec(rest);
  if (numbered) { variant = numbered[1]; rest = rest.slice(0, numbered.index); }
  const dash = rest.indexOf('_-_');
  if (dash > 0) { qualifier = rest.slice(dash + 3).replace(/_/g, ' '); rest = rest.slice(0, dash); }
  const single = /^[A-Za-z]+$/.test(rest);
  return { head: rest, label: rest.toLowerCase(), single, proper: /^[A-Z]/.test(rest), verb, variant, qualifier };
}

function symbolRows(csvText) {
  const rows = parseCsv(csvText);
  const head = rows.shift();
  const at = (name) => { const i = head.indexOf(name); if (i < 0) throw new Error('symbol-info.csv has no column ' + name); return i; };
  const col = { id: at('symbol-id'), grammar: at('grammar'), rated: at('rated'), tags: at('tags'), name: at('symbol-en'), category: at('category-en') };
  return rows.map((r) => {
    const name = r[col.name];
    return Object.assign({ id: r[col.id], name, file: name + '.svg', grammar: r[col.grammar], rated: r[col.rated] !== '0', tags: r[col.tags], category: r[col.category] }, nameParts(name));
  });
}

// The words a packet may be made of: the picker's own default rule (word_sounds_packet_builder.js
// pickWords), without its recording and stage tests.
function usableWords(wordlist, builder) {
  const minZipf = builder.DEFAULT_MIN_ZIPF, minBooks = builder.DEFAULT_MIN_BOOKS;
  return wordlist.rows().filter((row) => /^[a-z]{2,10}$/.test(row.word) && /[aeiouy]/.test(row.word)
    && !row.blocked && !row.nearBlocked && (row.known || (row.zipf >= minZipf && row.books >= minBooks)));
}

// The plain singulars a plural word could come from: cats > cat, boxes > box, puppies > puppy.
function singularsOf(word) {
  const out = [];
  if (/[^s]s$/.test(word)) out.push(word.slice(0, -1));
  if (/(?:s|x|z|ch|sh)es$/.test(word)) out.push(word.slice(0, -2));
  if (/[^aeiou]ies$/.test(word)) out.push(word.slice(0, -3) + 'y');
  return out.filter((w, i, all) => w.length >= 2 && all.indexOf(w) === i);
}

// Returns one map entry per usable word that has at least one symbol to show a person.
// context: { rows: symbol rows, words: usable word rows, isWord(word), review: { word: {file,status,note} } | null, refused: { file: reason } }
function matchWords(context) {
  const byLabel = new Map();
  const qualified = new Map();
  context.rows.forEach((s) => {
    if (s.rated || SKIP_CATEGORIES.indexOf(s.category) >= 0 || !s.single) return;
    const bucket = s.qualifier ? qualified : byLabel;
    if (!bucket.has(s.label)) bucket.set(s.label, []);
    bucket.get(s.label).push(s);
  });
  // The plain drawing first, then numbered ones in order; things before "to do it".
  const order = (list) => list.slice().sort((a, b) => (a.verb - b.verb) || (a.variant ? 1 : 0) - (b.variant ? 1 : 0) || (a.variant < b.variant ? -1 : a.variant > b.variant ? 1 : 0) || (a.file < b.file ? -1 : 1));
  const uniq = (list) => list.filter((v, i, all) => all.indexOf(v) === i);
  const about = (s) => (s.verb ? 'a verb ("to ' + s.label + '")' : s.category);
  const refused = context.refused || {};
  const review = context.review || {};
  const reviewUsed = {};
  // A person's decision on a word, laid over what the script decided.
  const withReview = (word, d) => {
    const mine = review[word];
    if (!mine || !d) return d;
    reviewUsed[word] = true;
    const all = uniq((d.candidates || []).concat(d.file ? [d.file] : []));
    const status = String(mine.status || '');
    if (status === 'reviewed') {
      const file = String(mine.file || d.file || '');
      if (!file || all.indexOf(file) < 0) throw new Error('Review file: "' + word + '" names ' + (file || 'no file') + ', which is not one of its symbols (' + all.join(', ') + ')');
      if (refused[file]) throw new Error('Review file: "' + word + '" names ' + file + ', which the safety test refuses');
      return { file, status: 'reviewed', note: String(mine.note || d.note || ''), candidates: all.length > 1 ? all : undefined, symbol: context.rows.filter((s) => s.file === file)[0] };
    }
    if (status === 'rejected') return { file: '', status: 'rejected', note: String(mine.note || 'rejected by a reviewer'), candidates: all };
    throw new Error('Review file: "' + word + '" has status "' + status + '" (use reviewed or rejected)');
  };
  // What a symbol name stands for, whether or not the name is a usable word itself.
  const decided = new Map();
  const decide = (label) => {
    if (decided.has(label)) return decided.get(label);
    let d = null;
    const exact = byLabel.get(label) || [];
    if (exact.length) {
      const list = order(exact);
      const kinds = uniq(list.map((s) => (s.verb ? 'verb' : s.category)));
      const files = list.map((s) => s.file);
      if (REJECTED[label]) d = { file: '', status: 'rejected', note: REJECTED[label], candidates: files };
      else if (HELD[label]) d = { file: '', status: 'ambiguous', note: 'held by the script author: ' + HELD[label], candidates: files };
      else if (kinds.length === 1) {
        d = { file: list[0].file, status: 'auto', symbol: list[0], note: about(list[0]) + (list.length > 1 ? '; ' + list.length + ' drawings of it, the first is used' : '') };
      } else if (CHILD_SENSE[label] && files.indexOf(CHILD_SENSE[label]) >= 0) {
        d = { file: CHILD_SENSE[label], status: 'auto', candidates: files, symbol: list.filter((s) => s.file === CHILD_SENSE[label])[0],
          note: 'symbols of different kinds share this name (' + uniq(list.map(about)).join(' / ') + '); the everyday thing is used: chosen by the script author, not yet by a reviewer' };
      } else {
        d = { file: '', status: 'ambiguous', candidates: files, note: 'symbols of different kinds share this name: ' + list.map((s) => s.file + ' (' + about(s) + ')').join(', ') };
      }
      // A file the safety test refuses is never used.
      if (d.file && refused[d.file]) d = { file: '', status: 'rejected', note: 'the symbol file is not used: ' + refused[d.file], candidates: [d.file] };
    } else if (qualified.has(label)) {
      const list = order(qualified.get(label));
      d = { file: '', status: 'ambiguous', candidates: list.map((s) => s.file),
        note: 'no symbol is named just "' + label + '"; these are kinds of it: ' + list.map((s) => s.file + ' (' + s.qualifier + ')').join(', ') };
    }
    d = withReview(label, d);
    decided.set(label, d);
    return d;
  };
  const isThing = (s) => !!s && !s.verb && !s.proper && s.grammar === 'Noun' && !NOT_A_THING.test(s.category);
  const entries = [];
  context.words.forEach((row) => {
    const word = row.word;
    let d = decide(word), entry = null;
    if (d) entry = { word, file: d.file, status: d.status, note: d.note, candidates: d.candidates };
    else {
      // plural -> singular: the singular is a real word of the list, and the picture is of a thing.
      const singles = singularsOf(word).filter((s) => context.isWord(s) && NOT_PLURAL.indexOf(s) < 0);
      for (const single of singles) {
        const s = decide(single);
        if (!s) continue;
        const symbols = uniq((s.candidates || []).concat(s.file ? [s.file] : [])).map((f) => context.rows.filter((r) => r.file === f)[0]);
        if (!symbols.some(isThing)) break;
        let p;
        if (s.status === 'auto' || s.status === 'reviewed') {
          if (!isThing(s.symbol)) break;
          p = { file: s.file, status: s.status, note: 'plural of ' + single + ': the picture shows one; ' + s.note, candidates: s.candidates };
        } else p = { file: '', status: s.status, note: 'plural of ' + single + '; ' + s.note, candidates: s.candidates };
        p = review[word] ? withReview(word, p) : p;
        entry = { word, file: p.file, status: p.status, note: p.note, candidates: p.candidates };
        break;
      }
    }
    if (!entry) return;
    if (!entry.candidates || !entry.candidates.length) delete entry.candidates;
    entries.push(entry);
  });
  Object.keys(review).forEach((word) => { if (!reviewUsed[word]) throw new Error('Review file: "' + word + '" is not a matched word'); });
  return entries.sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

// Lossless only: the XML prolog, comments, metadata, editor elements and attributes, the space
// between tags and at the ends. The drawing instructions are not touched. A file with <text> keeps
// its inner spacing.
function minifySvg(svg) {
  let out = String(svg).replace(BOM, '').replace(/\r\n?/g, '\n');
  out = out.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>\[]*(\[[\s\S]*?\])?\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<(metadata|title|desc)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<(metadata|title|desc)\b[^>]*\/>/gi, '');
  out = out.replace(/<((?:sodipodi|inkscape|rdf|cc|dc):[\w.-]+)\b[^>]*>[\s\S]*?<\/\1\s*>/g, '').replace(/<(?:sodipodi|inkscape|rdf|cc|dc):[\w.-]+\b[^>]*\/>/g, '');
  out = out.replace(/\s(?:sodipodi|inkscape):[\w.-]+\s*=\s*(?:"[^"]*"|'[^']*')/g, '').replace(/\sxmlns:(?:sodipodi|inkscape|rdf|cc|dc)\s*=\s*(?:"[^"]*"|'[^']*')/g, '');
  if (!/<text\b/i.test(out)) out = out.replace(/>\s+</g, '><');
  return out.trim();
}

function loadParts() {
  const tool = require(path.join(ROOT, 'dev-tools/make_word_sounds_packet.cjs'));
  return tool.loadParts();
}

function loadReview() {
  if (!fs.existsSync(REVIEW_FILE)) return {};
  const data = JSON.parse(read(REVIEW_FILE).replace(BOM, ''));
  return data && data.words && typeof data.words === 'object' ? data.words : {};
}

// "<svg ..." text for JSON, with nothing a <script> block or an old parser could trip on.
const jsonText = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(LINE_ENDS, (ch) => (ch.charCodeAt(0) === 0x2028 ? '\\u2028' : '\\u2029'));

// Everything the outputs are made from. `from` (optional) is an unzipped release: symbol files that
// are needed and not yet vendored are read from it (main() copies them).
function compute(options) {
  const opts = options || {};
  const parts = opts.parts || loadParts();
  const { core, dictionary, wordlist, builder } = parts;
  const source = JSON.parse(read(path.join(VENDOR, 'source.json')));
  const rows = symbolRows(read(path.join(VENDOR, 'symbol-info.csv')));
  const words = usableWords(wordlist, builder);
  const isWord = (w) => !!wordlist.get(w) && !wordlist.get(w).notInDictionary;
  const review = loadReview();
  const fromDir = opts.from ? path.join(path.resolve(opts.from), fs.existsSync(path.join(path.resolve(opts.from), 'EN-symbols')) ? 'EN-symbols' : '') : null;
  const svgCache = new Map();
  const missing = [];
  const svgOf = (file) => {
    if (svgCache.has(file)) return svgCache.get(file);
    let text = null;
    const here = path.join(SYMBOL_DIR, file);
    if (fs.existsSync(here)) text = read(here);
    else if (fromDir && fs.existsSync(path.join(fromDir, file))) text = read(path.join(fromDir, file));
    else missing.push(file);
    svgCache.set(file, text);
    return text;
  };
  const filesOf = (entries) => {
    const set = new Set();
    entries.forEach((e) => { if (e.file) set.add(e.file); (e.candidates || []).forEach((f) => set.add(f)); });
    return Array.from(set).sort();
  };
  // First pass with nothing refused and no review, to learn which files are in play; then the safety test on each.
  const refused = {};
  filesOf(matchWords({ rows, words, isWord, review: null })).forEach((file) => {
    const text = svgOf(file);
    if (text == null) return;
    const why = builder.svgRefusal(minifySvg(text));
    if (why) refused[file] = why;
  });
  const entries = matchWords({ rows, words, isWord, review, refused });
  const inPlay = filesOf(entries);
  inPlay.forEach(svgOf);
  // The pictures a packet can use today: used words that have a recording.
  const recorded = new Set(words.filter((row) => row.hasClip).map((row) => row.word));
  const used = entries.filter((e) => e.status === 'auto' || e.status === 'reviewed');
  const symbols = {}, wordFiles = {};
  let rawBytes = 0, changed = 0;
  used.filter((e) => recorded.has(e.word)).forEach((e) => {
    const text = svgOf(e.file);
    if (text == null) return;
    wordFiles[e.word] = e.file;
    if (symbols[e.file] != null) return;
    const small = minifySvg(text);
    rawBytes += Buffer.byteLength(text);
    if (small !== text) changed++;
    symbols[e.file] = small;
  });
  // Counts, with the stage rows a word fits (a later stage holds the earlier ones).
  const B = builder._internals;
  const stages = STAGE_ORDER.map((id) => B.stageOf(id, wordlist.stages)).filter(Boolean);
  const byWord = new Map(entries.map((e) => [e.word, e]));
  const byStage = {};
  stages.forEach((s) => { byStage[s.id] = { usable: 0, withPicture: 0, ambiguous: 0, recorded: 0, recordedWithPicture: 0 }; });
  words.forEach((row) => {
    const found = dictionary.lookup(row.word)[0];
    const sounds = found && found.length ? Array.prototype.slice.call(found) : (core.dictionarySounds(row.word) || {}).sounds;
    if (!sounds) return;
    const units = B.wordUnits(core, row.word, sounds);
    if (!units || B.suspectSplit(units)) return;
    const e = byWord.get(row.word);
    const has = !!e && (e.status === 'auto' || e.status === 'reviewed');
    stages.forEach((s) => {
      if (!B.fitsStage(s, units)) return;
      const c = byStage[s.id];
      c.usable++;
      if (has) c.withPicture++;
      if (e && e.status === 'ambiguous') c.ambiguous++;
      if (row.hasClip) { c.recorded++; if (has) c.recordedWithPicture++; }
    });
  });
  const tally = (status) => entries.filter((e) => e.status === status).length;
  const counts = { usableWords: words.length, usableWithRecording: recorded.size, matched: entries.length, auto: tally('auto'), reviewed: tally('reviewed'), ambiguous: tally('ambiguous'), rejected: tally('rejected'),
    viaPlural: entries.filter((e) => e.status === 'auto' && /^plural of /.test(e.note)).length, symbolsVendored: inPlay.length,
    packetWords: Object.keys(wordFiles).length, packetSymbols: Object.keys(symbols).length, byStage };
  const header = {
    about: 'Generated by dev-tools/build_word_sounds_symbols.cjs. Do not edit: put decisions in data/word_sounds_symbols_review_en.json and re-run. Only "auto" and "reviewed" words get a picture in a packet.',
    version: 1, language: 'en',
    source: { id: source.id, name: source.name, version: source.version, license: source.license, licenseUrl: source.licenseUrl, symbolInfoSha256: source.symbolInfo.sha256 },
    statuses: { auto: 'the symbols named exactly this word are of one kind (or this word is the plain plural of such a name, or the script author chose the everyday meaning: the note says so); used',
      ambiguous: 'symbols of different kinds share the name, or the script author doubts the meaning; NOT used until a person decides',
      rejected: 'not used', reviewed: 'a person chose this symbol; used' },
    fields: 'word; file (in data/vendor/mulberry/symbols; empty when none is used); status; note; candidates (the files a reviewer can choose from, when there is more than one)',
    counts,
  };
  // One word a line, so a change to one word is one line in a diff.
  const mapText = JSON.stringify(header, null, 1).replace(/\n\}$/, ',\n "words": [\n' + entries.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n ]\n}\n');
  const made = { parts, source, rows, words, entries, refused, missing, symbols, wordFiles, counts, mapText, rawBytes, changed, inPlay, svgOf };
  Object.assign(made, dataFiles({ source, symbols, wordFiles, rows }));
  return made;
}

// The page data: shard files of at most about SHARD_MAX bytes of drawings each (symbols in name
// order), and the index script that knows which word is where.
function dataFiles(input) {
  const { source, symbols, wordFiles, rows } = input;
  const labelOf = {};
  rows.forEach((s) => { labelOf[s.file] = s.label; });
  const files = Object.keys(symbols).sort();
  const groups = [];
  let now = null;
  files.forEach((f) => {
    const size = Buffer.byteLength(symbols[f]);
    if (!now || (now.size + size > SHARD_MAX && now.files.length)) { now = { files: [], size: 0 }; groups.push(now); }
    now.files.push(f); now.size += size;
  });
  const credit = { set: 'Mulberry Symbols', author: source.author, license: source.licenseShort, licenseUrl: source.licenseUrl, url: source.homepage, version: source.version };
  const aboutLine = 'Mulberry Symbols ' + source.version + ' (' + source.homepage + '), ' + source.copyright + ', licensed under the Creative Commons Attribution-ShareAlike 4.0 International License ('
    + source.licenseUrl + '). These drawings are a separate work from the program that shows them and stay under that license. Each is the original file from the set, unchanged but for file tidying.';
  const fileShard = {};
  const shards = groups.map((group, i) => {
    const url = SHARD_DIR + '/en-' + (i + 1) + '.json';
    group.files.forEach((f) => { fileShard[f] = i; });
    const text = '{"about":' + jsonText(aboutLine) + ',"version":1,"language":"en","shard":' + (i + 1) + ',"of":' + groups.length + ',"symbols":{\n'
      + group.files.map((f) => jsonText(f) + ':' + jsonText(symbols[f])).join(',\n') + '\n}}\n';
    return { url, text, bytes: Buffer.byteLength(text), sha256: sha256(text), symbols: group.files.length };
  });
  const index = {};
  files.forEach((f, i) => { index[f] = i; });
  const words = {};
  Object.keys(wordFiles).sort().forEach((w) => { if (index[wordFiles[w]] != null) words[w] = index[wordFiles[w]]; });
  const notice = read(path.join(VENDOR, 'LICENSE.txt')).replace(/\r\n?/g, '\n').trim();
  const indexText = [
    '// Generated by dev-tools/build_word_sounds_symbols.cjs. Do not edit.',
    '// Which Word Sounds words have a picture a packet can use, and which file of ' + SHARD_DIR + '/ holds it.',
    '// The pictures are Mulberry Symbols ' + source.version + ' (' + source.homepage + '), ' + source.copyright + ',',
    '// licensed under the Creative Commons Attribution-ShareAlike 4.0 International License',
    '// (' + source.licenseUrl + '). They are a separate work from the program around them and',
    '// stay under that license. Which word gets which symbol, and why: data/word_sounds_symbols_map_en.json.',
    '// Only words that have a recording are here: a packet cannot use a word without one.',
    'var createWordSoundsSymbols = (function () {',
    "  'use strict';",
    '  var cached;',
    '  return function createWordSoundsSymbols() {',
    '    if (cached) return cached;',
    '    var credit = Object.freeze(' + JSON.stringify(credit) + ');',
    '    var notice = ' + JSON.stringify(notice) + ';',
    '    // The data files, the same ones whatever words are chosen. bytes and sha256 are of each file as it is on the site.',
    '    var shards = Object.freeze(' + JSON.stringify(shards.map((s) => ({ url: s.url, bytes: s.bytes, sha256: s.sha256, symbols: s.symbols }))) + '.map(Object.freeze));',
    '    var files = ' + JSON.stringify(files) + ';',
    '    var labels = ' + JSON.stringify(files.map((f) => labelOf[f] || '')) + ';',
    '    var fileShard = ' + JSON.stringify(files.map((f) => fileShard[f])) + ';',
    '    var words = ' + JSON.stringify(words) + ';',
    '    var svgs = {}, added = {};',
    "    function key(word) { return String(word == null ? '' : word).trim().toLowerCase(); }",
    '    function has(word) { return Object.prototype.hasOwnProperty.call(words, key(word)); }',
    '    // Takes one data file as parsed JSON. Only drawings this index knows are kept. Returns how many it took.',
    '    function add(data) {',
    '      var list = data && data.symbols && typeof data.symbols === \'object\' ? data.symbols : null, n = 0;',
    '      if (!list) return 0;',
    '      files.forEach(function (file, i) {',
    "        if (!Object.prototype.hasOwnProperty.call(list, file) || typeof list[file] !== 'string') return;",
    '        if (svgs[i] == null) n++;',
    '        svgs[i] = list[file];',
    '        added[fileShard[i]] = true;',
    '      });',
    '      return n;',
    '    }',
    '    // { file, svg, label } for a word whose picture has been added, else null.',
    '    function get(word) {',
    '      if (!has(word)) return null;',
    '      var i = words[key(word)];',
    '      return svgs[i] == null ? null : { file: files[i], svg: svgs[i], label: labels[i] };',
    '    }',
    '    function ready() { return shards.every(function (s, i) { return !!added[i]; }); }',
    "    cached = Object.freeze({ version: 1, language: 'en', credit: credit, notice: notice, count: " + Object.keys(words).length + ', symbols: files.length,',
    '      bytes: ' + shards.reduce((n, s) => n + s.bytes, 0) + ', shards: shards, has: has, file: function (word) { return has(word) ? files[words[key(word)]] : null; },',
    '      add: add, get: get, ready: ready, words: function () { return Object.keys(words); } });',
    '    return cached;',
    '  };',
    '})();',
    '(function (root) {',
    '  var api = createWordSoundsSymbols();',
    '  if (root) {',
    '    root.AlloModules = root.AlloModules || {};',
    '    root.AlloModules.WordSoundsSymbols = api;',
    '  }',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = api;",
    "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));",
    '',
  ].join('\n');
  return { indexText, shards };
}

// The pictures for node (tests, command-line builds): the index with every data file added.
function loadSymbols() {
  delete require.cache[require.resolve(INDEX_FILE)];
  const api = require(INDEX_FILE);
  api.shards.forEach((s) => api.add(JSON.parse(read(path.join(ROOT, s.url)))));
  return api;
}

// The digest source.json records for the vendored symbol files: "<sha256>  <name>" lines, sorted by name.
function symbolsDigest(dir) {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.svg$/.test(f)).sort() : [];
  let bytes = 0;
  const lines = names.map((name) => { const data = fs.readFileSync(path.join(dir, name)); bytes += data.length; return sha256(data) + '  ' + name; });
  return { count: names.length, bytes, sha256: sha256(lines.join('\n') + '\n') };
}

function reportText(made) {
  const c = made.counts, lines = [];
  lines.push('Usable words (not blocked, familiar by the default rule): ' + c.usableWords + ', of which ' + c.usableWithRecording + ' have a recording');
  lines.push('Matched to at least one symbol: ' + c.matched + ' (auto ' + c.auto + ', of which ' + c.viaPlural + ' through a plural; reviewed ' + c.reviewed + '; ambiguous ' + c.ambiguous + '; rejected ' + c.rejected + ')');
  lines.push('Symbol files vendored (used, held and rejected candidates): ' + c.symbolsVendored);
  lines.push('In the page data (used words that have a recording): ' + c.packetWords + ' words, ' + c.packetSymbols + ' symbols, ' + made.rawBytes + ' bytes of drawings (' + made.changed + ' files changed by tidying), in '
    + made.shards.length + ' files: ' + made.shards.map((s) => s.url + ' ' + s.bytes).join(', ') + '; index ' + Buffer.byteLength(made.indexText) + ' bytes');
  lines.push('By stage (a stage holds the earlier ones): usable words | with a picture | held | with a recording | with a recording and a picture');
  Object.keys(c.byStage).forEach((id) => { const s = c.byStage[id]; lines.push('  ' + id + ': ' + s.usable + ' | ' + s.withPicture + ' (' + (s.usable ? Math.round(100 * s.withPicture / s.usable) : 0) + '%) | ' + s.ambiguous + ' | ' + s.recorded + ' | ' + s.recordedWithPicture + ' (' + (s.recorded ? Math.round(100 * s.recordedWithPicture / s.recorded) : 0) + '%)'); });
  lines.push('Map: ' + Buffer.byteLength(made.mapText) + ' bytes');
  if (Object.keys(made.refused).length) lines.push('Refused by the safety test: ' + Object.keys(made.refused).map((f) => f + ' (' + made.refused[f] + ')').join(', '));
  return lines.join('\n');
}

// The review sheet: one HTML file, no network. Used pictures first, then the held ones side by side.
function reviewSheet(made, doubtful) {
  const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const recorded = new Set(made.words.filter((row) => row.hasClip).map((row) => row.word));
  const uris = new Map();
  const img = (file) => {
    const text = made.svgOf(file);
    if (text == null) return '<span class="none">(file not here)</span>';
    if (!uris.has(file)) uris.set(file, 'data:image/svg+xml;base64,' + Buffer.from(minifySvg(text), 'utf8').toString('base64'));
    return '<img alt="" width="96" height="96" src="' + uris.get(file) + '">';
  };
  const mark = (word) => (recorded.has(word) ? ' <span class="rec" title="has a recording">&#9679;</span>' : '');
  const card = (e) => '<figure><div class="pic">' + img(e.file) + '</div><figcaption><b>' + esc(e.word) + '</b>' + mark(e.word) + '<br><code>' + esc(e.file) + '</code></figcaption></figure>';
  const plural = (e) => /^plural of /.test(e.note);
  const auto = made.entries.filter((e) => e.status === 'auto' && !plural(e) && !e.candidates);
  const chosen = made.entries.filter((e) => e.status === 'auto' && !plural(e) && e.candidates);
  const plurals = made.entries.filter((e) => e.status === 'auto' && plural(e));
  const reviewed = made.entries.filter((e) => e.status === 'reviewed');
  const ambiguous = made.entries.filter((e) => e.status === 'ambiguous');
  const rejected = made.entries.filter((e) => e.status === 'rejected');
  const c = made.counts;
  const section = (title, intro, body) => '<section><h2>' + esc(title) + '</h2><p>' + intro + '</p>' + body + '</section>';
  const grid = (list) => '<div class="grid">' + list.map(card).join('') + '</div>';
  const rowsOf = (list) => list.map((e) => '<div class="row"><div class="word"><b>' + esc(e.word) + '</b>' + mark(e.word) + '<br><span class="note">' + esc(e.note) + '</span></div><div class="cands">'
    + (e.candidates || (e.file ? [e.file] : [])).map((f) => '<figure' + (f === e.file ? ' class="chosen"' : '') + '><div class="pic">' + img(f) + '</div><figcaption><code>' + esc(f) + '</code>' + (f === e.file ? '<br>used now' : '') + '</figcaption></figure>').join('') + '</div></div>').join('');
  const byWord = new Map(made.entries.map((e) => [e.word, e]));
  const doubt = (doubtful || []).filter((d) => byWord.has(d.word));
  const first = (list) => list.slice().sort((a, b) => (recorded.has(b.word) - recorded.has(a.word)) || (a.word < b.word ? -1 : 1));
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">'
    + '<title>Word Sounds pictures: review sheet</title><style>'
    + 'body{font:15px/1.4 system-ui,Segoe UI,Arial,sans-serif;margin:24px;color:#1d2433;background:#fff}h1{font-size:1.5rem}h2{font-size:1.2rem;margin-top:32px;border-top:2px solid #c9cede;padding-top:16px}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}figure{margin:0;border:1px solid #c9cede;border-radius:8px;padding:6px;text-align:center;break-inside:avoid}'
    + '.pic{height:100px;display:flex;align-items:center;justify-content:center}figcaption{font-size:.8rem;overflow-wrap:anywhere}code{font-size:.72rem;color:#4a5468}.rec{color:#1d6b3a}'
    + '.row{display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid #e3e6ef;padding:8px 0;break-inside:avoid}.word{width:260px;flex:none}.note{font-size:.78rem;color:#4a5468}.cands{display:flex;flex-wrap:wrap;gap:8px}'
    + '.cands figure{width:132px}.chosen{border:3px solid #1d6b3a}.none{color:#8a4b00;font-size:.8rem}ol.doubt li{margin:6px 0;break-inside:avoid}.dpic{display:inline-block;vertical-align:middle;margin-right:8px}'
    + '@media print{body{margin:8mm}.grid{grid-template-columns:repeat(6,1fr)}}'
    + '</style></head><body><h1>Word Sounds pictures: review sheet</h1>'
    + '<p>Pictures: Mulberry Symbols ' + esc(made.source.version) + ' by Steve Lee, CC BY-SA 4.0, mulberrysymbols.org. This sheet loads nothing from the internet.</p>'
    + '<p><b>' + c.usableWords + '</b> usable words. <b>' + (c.auto + c.reviewed) + '</b> have a picture (' + c.auto + ' matched by the script, ' + c.reviewed + ' chosen by a reviewer). '
    + '<b>' + c.ambiguous + '</b> are held until a person decides. ' + c.rejected + ' are rejected. '
    + 'A green dot <span class="rec">&#9679;</span> marks a word that has a recording: only those ' + c.packetWords + ' can be in a packet today, so check them first. In each list they come first.</p>'
    + '<p>How to use it: circle any picture that is wrong for its word. To change one, add the word to <code>data/word_sounds_symbols_review_en.json</code> '
    + '(<code>{"status":"rejected"}</code>, or <code>{"status":"reviewed","file":"name.svg"}</code>) and run <code>node dev-tools/build_word_sounds_symbols.cjs</code>. A decision on a word also holds for its plural.</p>'
    + (doubt.length ? section('Doubtful: ' + doubt.length + ' the script author would check first', 'These are used now. Each one says why it is doubtful.',
      '<ol class="doubt">' + doubt.map((d) => { const e = byWord.get(d.word); return '<li><span class="dpic">' + (e.file ? img(e.file).replace('width="96" height="96"', 'width="56" height="56"') : '') + '</span><b>' + esc(d.word) + '</b>' + mark(d.word) + ' <code>' + esc(e.file || e.status) + '</code>: ' + esc(d.why) + '</li>'; }).join('') + '</ol>') : '')
    + section('1. Used now: the word is the name of the symbol (' + auto.length + ')', 'Each word, its symbol at 96 pixels, and the file name.', grid(first(auto)))
    + (chosen.length ? section('2. Used now: symbols of different kinds, the everyday one chosen by the script author (' + chosen.length + ')', 'The green box is the one used.', rowsOf(first(chosen))) : '')
    + (plurals.length ? section('3. Used now: a plural word with the picture of one (' + plurals.length + ')', 'The word is a plural; the picture shows one of the thing.', grid(first(plurals))) : '')
    + (reviewed.length ? section('Chosen by a reviewer (' + reviewed.length + ')', '', rowsOf(reviewed)) : '')
    + section('4. Held: a person must choose (' + ambiguous.length + ')', 'Not used in any packet until someone decides. The candidates are side by side.', rowsOf(first(ambiguous)))
    + (rejected.length ? section('5. Rejected (' + rejected.length + ')', 'Never used.', rowsOf(rejected)) : '')
    + '</body></html>\n';
}

function staleList(made) {
  const stale = [];
  if (made.missing.length) stale.push(made.missing.length + ' symbol files are not in data/vendor/mulberry/symbols (' + made.missing.slice(0, 5).join(', ') + '): run with --from <unzipped release>');
  if (!fs.existsSync(MAP_FILE) || read(MAP_FILE) !== made.mapText) stale.push(path.relative(ROOT, MAP_FILE));
  if (!fs.existsSync(INDEX_FILE) || read(INDEX_FILE) !== made.indexText) stale.push(path.relative(ROOT, INDEX_FILE));
  made.shards.forEach((s) => { const file = path.join(ROOT, s.url); if (!fs.existsSync(file) || read(file) !== s.text) stale.push(s.url); });
  const dir = path.join(ROOT, SHARD_DIR);
  const wanted = made.shards.map((s) => path.basename(s.url));
  (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => wanted.indexOf(f) < 0).forEach((f) => stale.push(SHARD_DIR + '/' + f + ' (not expected)'));
  const digest = symbolsDigest(SYMBOL_DIR), source = made.source;
  if (digest.sha256 !== source.symbols.sha256 || digest.count !== source.symbols.count || digest.bytes !== source.symbols.bytes) stale.push('data/vendor/mulberry/source.json (the symbols digest)');
  const extra = (fs.existsSync(SYMBOL_DIR) ? fs.readdirSync(SYMBOL_DIR) : []).filter((f) => made.inPlay.indexOf(f) < 0);
  if (extra.length) stale.push(extra.length + ' vendored symbol files match no word (' + extra.slice(0, 5).join(', ') + ')');
  return stale;
}

function main(argv) {
  const flag = (name) => argv.indexOf(name) >= 0;
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const from = value('--from');
  const made = compute({ from });
  if (flag('--check')) {
    const stale = staleList(made);
    if (stale.length) { console.error('Word Sounds symbols are stale: ' + stale.join('; ')); process.exitCode = 1; return made; }
    console.log('Word Sounds symbols are current (' + made.counts.auto + ' auto, ' + made.counts.reviewed + ' reviewed, ' + made.counts.ambiguous + ' ambiguous, ' + made.counts.rejected + ' rejected; '
      + made.counts.packetWords + ' words in the page data)');
    return made;
  }
  const review = value('--review');
  if (review) {
    const doubtFile = value('--doubtful');
    const doubtful = doubtFile ? JSON.parse(read(doubtFile)) : [];
    fs.mkdirSync(path.dirname(path.resolve(review)), { recursive: true });
    fs.writeFileSync(path.resolve(review), reviewSheet(made, doubtful));
    console.log('Review sheet: ' + path.resolve(review) + ' (' + fs.statSync(path.resolve(review)).size + ' bytes)');
    return made;
  }
  if (flag('--report')) { console.log(reportText(made)); return made; }
  if (from) {
    // Vendor exactly the files in play; drop any that no longer are.
    fs.mkdirSync(SYMBOL_DIR, { recursive: true });
    const dir = path.join(path.resolve(from), fs.existsSync(path.join(path.resolve(from), 'EN-symbols')) ? 'EN-symbols' : '');
    made.inPlay.forEach((file) => {
      const target = path.join(SYMBOL_DIR, file);
      if (fs.existsSync(target)) return;
      const src = path.join(dir, file);
      if (!fs.existsSync(src)) throw new Error('Not in the release folder: ' + file);
      fs.copyFileSync(src, target);
      if (fs.statSync(target).size !== fs.statSync(src).size) throw new Error('Short copy: ' + file);
    });
    fs.readdirSync(SYMBOL_DIR).filter((f) => made.inPlay.indexOf(f) < 0).forEach((f) => fs.unlinkSync(path.join(SYMBOL_DIR, f)));
    const digest = symbolsDigest(SYMBOL_DIR);
    const sourceFile = path.join(VENDOR, 'source.json');
    const source = JSON.parse(read(sourceFile));
    source.symbols = Object.assign({}, source.symbols, digest);
    const text = JSON.stringify(source, null, 2) + '\n';
    if (read(sourceFile) !== text) writeAtomic(sourceFile, text);
    made.source = source;
    console.log('Vendored ' + digest.count + ' symbol files, ' + digest.bytes + ' bytes');
  } else if (made.missing.length) throw new Error(made.missing.length + ' symbol files are not in data/vendor/mulberry/symbols (' + made.missing.slice(0, 8).join(', ') + '): run with --from <unzipped release>');
  if (!fs.existsSync(MAP_FILE) || read(MAP_FILE) !== made.mapText) writeAtomic(MAP_FILE, made.mapText);
  if (!fs.existsSync(INDEX_FILE) || read(INDEX_FILE) !== made.indexText) writeAtomic(INDEX_FILE, made.indexText);
  const dir = path.join(ROOT, SHARD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  made.shards.forEach((s) => { const file = path.join(ROOT, s.url); if (!fs.existsSync(file) || read(file) !== s.text) writeAtomic(file, s.text); });
  const wanted = made.shards.map((s) => path.basename(s.url));
  fs.readdirSync(dir).filter((f) => /^en-\d+\.json$/.test(f) && wanted.indexOf(f) < 0).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  console.log(reportText(made));
  return made;
}

module.exports = { parseCsv, nameParts, symbolRows, usableWords, singularsOf, matchWords, minifySvg, compute, dataFiles, loadSymbols, symbolsDigest, reviewSheet, reportText, staleList,
  STATUSES, STAGE_ORDER, SKIP_CATEGORIES, NOT_PLURAL, CHILD_SENSE, HELD, REJECTED, VENDOR, SYMBOL_DIR, MAP_FILE, INDEX_FILE, REVIEW_FILE, SHARD_DIR, SHARD_MAX };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
