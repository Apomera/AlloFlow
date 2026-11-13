#!/usr/bin/env node
'use strict';

// Pictures for Word Sounds packets. Matches the usable words of the word list to two open picture
// sets, Mulberry Symbols first (data/vendor/mulberry: CC BY-SA 4.0, Steve Lee) and OpenMoji only for a
// word Mulberry has nothing for (data/vendor/openmoji: CC BY-SA 4.0, the OpenMoji project), and writes
//   data/word_sounds_symbols_map_en.json   every matched word: word, set, file, status, kind, note
//   word_sounds_symbols_en.js              which words have a picture a packet can use today, and where it is
//   word_sounds_symbols/en-<n>.json        those pictures, in files of at most about 1 MB, one set per file
//
//   node dev-tools/build_word_sounds_symbols.cjs                     re-make all three from data/vendor
//   node dev-tools/build_word_sounds_symbols.cjs --check             fail when any of them is out of date
//   node dev-tools/build_word_sounds_symbols.cjs --from <folder>     also copy the Mulberry files that are needed
//                                                                    from an unzipped Mulberry release
//   node dev-tools/build_word_sounds_symbols.cjs --openmoji-from <folder>   the same for an unzipped OpenMoji
//                                                                    release (color SVGs) with its openmoji.json
//   node dev-tools/build_word_sounds_symbols.cjs --review <file>     write the review sheet
//   node dev-tools/build_word_sounds_symbols.cjs --report            print the counts and write nothing
//
// No network: a person downloads the releases once (each source.json says from where).
//
// Matching is deliberately narrow, and a child must never see the wrong picture. Every way a word can
// get a picture has a kind and a status. "auto" (used) only by a stated rule that leaves one meaning:
//   name      the Mulberry symbols named exactly that word are all of one kind (or CHILD_SENSE names
//             the everyday one); plural: the word is the plain plural of such a name and the picture is
//             of a thing
//   joined    a Mulberry symbol named with two words that spell the word when joined (arm_chair: armchair)
//   verb form the word is the -ing or -ed form (or, from IRREGULAR_PAST, the past) of a Mulberry action
//             ("to jump": jumping, jumped). The ending makes it the action, so the action drawing is used,
//             unless FORM_HELD says the word has another everyday meaning (a building, a drawing, a saw)
//   spelling  the British spelling of the same word (colour: color)
//   openmoji  no Mulberry symbol has the word's name (or its singular's); exactly one OpenMoji emoji
//             (after OPENMOJI_EXCLUDED) is named exactly the word, or the word is its plain plural and it
//             shows a thing. Several emoji of one name: the one in Unicode, when only one is
// Everything else waits for a person ("ambiguous", never used until reviewed):
//   s form    the -s form of a Mulberry action (jumps): it may also be the plural of a noun not shown
//   adjective form  the -er or -est form of a Mulberry describing word (taller, longest)
//   feeling faces   a feeling the set draws twice, as a lady's face and a man's face (happy_lady, happy_man)
//   action with an object   the set has the action only with an object or a direction (kick_ball, wake_up)
//   other name the set's name for the thing is another word (truck: lorry, mom: mum_parent: OTHER_NAMES)
//   and any Mulberry word held as before; OpenMoji and OTHER_NAMES pictures are added to its choices.
// HELD and REJECTED are the script author's doubts. A person's decisions go in
// data/word_sounds_symbols_review_en.json and win over everything here. Only "auto" and "reviewed"
// words reach a packet.
//
// The page data holds only the words that have a recording, because a packet cannot use a word
// without one: re-run this script after recordings are added.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'data/vendor/mulberry');
const SYMBOL_DIR = path.join(VENDOR, 'symbols');
const OM_VENDOR = path.join(ROOT, 'data/vendor/openmoji');
const OM_SYMBOL_DIR = path.join(OM_VENDOR, 'symbols');
const OM_TABLE = path.join(OM_VENDOR, 'openmoji-names.json');
const OM_PREFIX = 'openmoji/';
const MAP_FILE = path.join(ROOT, 'data/word_sounds_symbols_map_en.json');
const REVIEW_FILE = path.join(ROOT, 'data/word_sounds_symbols_review_en.json');
const INDEX_FILE = path.join(ROOT, 'word_sounds_symbols_en.js');
const SHARD_DIR = 'word_sounds_symbols';
const SHARD_MAX = 1000000;
const STATUSES = ['auto', 'ambiguous', 'rejected', 'reviewed'];
const SETS = ['mulberry', 'openmoji'];
const KINDS = ['joined', 'verb form', 'spelling', 'openmoji', 's form', 'adjective form', 'feeling faces', 'action with an object', 'other name'];
const AUTO_KINDS = ['joined', 'verb form', 'spelling', 'openmoji'];
const STAGE_ORDER = ['K early', 'K late', 'G1 early', 'G1 late', 'G2', 'G3+'];

// Symbols that are never a picture of a practice word: flags and outline maps are named after
// countries, and the alphabet symbols are letters.
const SKIP_CATEGORIES = ['Country Flags', 'Country Maps', 'Alphabet'];
// A plural word may borrow the picture of ONE thing only when that picture is of a thing: not from these.
const NOT_A_THING = /^(Descriptive |Verb$|Question$|People Feelings$|People Actions$|People Descriptive$|Number|Computer Icon$|Communication |Art |Environment Weather$|Work and School Subjects$|Work and School Timetable$|Healthcare Medical conditions$|Science Eco$|Science$|Politics$|Religion |Celebration Event$|.* [Aa]ctions$|.* activities$|Animal Activity |Building Household tasks$)/;
// Names whose plural is not "more than one of the picture" (woods is a forest, papers are documents).
const NOT_PLURAL = ['art', 'charge', 'food', 'grass', 'ground', 'paper', 'skin', 'travel', 'water', 'wood', 'world', 'test', 'stock', 'money', 'meat', 'bread', 'rice', 'cheese', 'butter', 'cream', 'honey', 'milk', 'tea', 'coffee', 'toast', 'soup', 'wool', 'furniture', 'jam', 'jelly', 'salt', 'soap', 'chalk', 'glue', 'glitter', 'clay', 'plastic', 'fabric', 'glass', 'cardboard', 'beef', 'bacon', 'ham', 'salad', 'cereal', 'porridge', 'pastry', 'spaghetti', 'stuffing', 'lemonade', 'medicine', 'perfume', 'toothpaste'];
// Words that look like a plain plural and are not one (does is "to do"; childs is not English).
const NOT_A_PLURAL_WORD = ['does', 'childs', 'news', 'its', 'has', 'was', 'is', 'us', 'yes', 'bus', 'gas'];

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
// word. Held for a person ("ambiguous"): never used until reviewed. Plurals and verb forms of a held word are held too.
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

// Verb forms. The past of an action that is not "-ed": only the forms listed, of the actions the set has.
const IRREGULAR_PAST = {
  run: ['ran'], sit: ['sat'], eat: ['ate'], go: ['went'], come: ['came'], give: ['gave'], get: ['got'], take: ['took'], make: ['made'], find: ['found'],
  hold: ['held'], stand: ['stood'], sing: ['sang'], swim: ['swam'], drive: ['drove'], write: ['wrote'], draw: ['drew'], dig: ['dug'], keep: ['kept'],
  think: ['thought'], hear: ['heard'], bring: ['brought'], catch: ['caught'], build: ['built'], bend: ['bent'], blow: ['blew'], grow: ['grew'],
  meet: ['met'], shake: ['shook'], spin: ['spun'], throw: ['threw'], sleep: ['slept'], swing: ['swung'], fly: ['flew'], drink: ['drank'], ride: ['rode'],
  wake: ['woke'], sweep: ['swept'], wear: ['wore'], teach: ['taught'], buy: ['bought'], hide: ['hid'], speak: ['spoke'], fall: ['fell'], see: ['saw'],
  bite: ['bit'], feel: ['felt'], leave: ['left'], lie: ['lay'], tear: ['tore'], steal: ['stole'], fight: ['fought'], sell: ['sold'], tell: ['told'],
  win: ['won'], lose: ['lost'], send: ['sent'], spend: ['spent'], lend: ['lent'], hang: ['hung'], stick: ['stuck'], kneel: ['knelt'], freeze: ['froze'],
};
// A verb form that is also an everyday word with another meaning (a noun or a describing word): held for a person.
const FORM_HELD = {
  building: 'also a building (a house or block)', drawing: 'also a drawing (the picture made)', painting: 'also a painting (the picture made)',
  meeting: 'also a meeting', filling: 'also a filling (in a tooth or a sandwich)', hanging: 'the word can mean a killing', wrestling: 'a fight sport',
  boxing: 'a fight sport', separated: 'also said of parents who live apart', strained: 'also means tired or tense', crossing: 'also a road crossing',
  opening: 'also an opening (a gap)', dressing: 'also salad dressing or a bandage', setting: 'also a setting (a place)', cutting: 'also a cutting of a plant',
  landing: 'also the landing at the top of stairs', lighting: 'also lighting (lamps)', crushed: 'also a feeling', crushing: 'also a feeling',
  saw: 'also a saw (the tool)', bit: 'also "a bit" (a little)', felt: 'also felt (the cloth)', left: 'also left (the side)', lay: 'also the past of "to lie"',
  fell: 'also a hill (British)', stole: 'also a stole (a scarf)', lost: 'also a feeling (lost)', hunted: 'the drawing may show a weapon',
  hunting: 'the drawing shows a spear', fought: 'a fight', stuck: 'also a feeling (stuck)',
  drinking: 'the drawing shows a glass of an amber drink: check it does not look like beer', drank: 'the drawing shows a glass of an amber drink: check it does not look like beer',
};
// -er and -est forms that are not "more" or "most" of the word (offer, inner, a dryer).
const NOT_A_COMPARATIVE = ['bother', 'dryer', 'offer', 'inner', 'upper', 'outer', 'lighter', 'number', 'never', 'liver', 'finer', 'finest', 'greater', 'greatest'];
// The set's name for the thing is another word (often the British one), or a symbol that adds a word to
// the name. Never automatic: each is offered to a person ("other name").
const OTHER_NAMES = {
  plane: ['aeroplane.svg'], airplane: ['aeroplane.svg'], truck: ['lorry.svg', 'lorry_2.svg'], trucks: ['lorry.svg', 'lorry_2.svg'], mom: ['mum_parent.svg'], dad: ['dad_parent.svg'],
  flashlight: ['torch.svg'], sweater: ['jumper.svg'], pants: ['trousers.svg'], stove: ['cooker.svg'], crib: ['cot.svg'], can: ['tin.svg'], soccer: ['football.svg'],
  closet: ['wardrobe.svg'], bandage: ['plaster.svg'], math: ['maths.svg'], chips: ['crisps.svg'], cookies: ['biscuits.svg'], fall: ['autumn.svg'], elevator: ['lift.svg'],
};
// The British spelling of the same word: the picture is the word's own. Used ("spelling").
const SPELLING = { color: 'colour', gray: 'grey', center: 'centre', theater: 'theatre', pajamas: 'pyjamas', jewelry: 'jewellery', tire: 'tyre', mustache: 'moustache', aluminum: 'aluminium' };
const ADJECTIVE_CATEGORY = /^(?:Descriptive (?:Quantity|State|Shape)|People Descriptive)$/;

// OpenMoji: what is never used, whatever its name. Each rule is written as data so the review sheet,
// source.json and the tests can say it. A group/subgroup, or one of these words among an emoji's own
// keywords (tags), or the emoji's name, excludes it.
const OPENMOJI_EXCLUDED_SUBGROUPS = {
  'flags/*': 'a flag', 'extras-openmoji/flags': 'a flag', 'extras-unicode/subdivision-flag': 'a flag', 'extras-unicode/regional-indicator': 'a flag letter',
  'component/*': 'a skin tone or hair part, not a picture', 'extras-openmoji/brand': 'a company logo', 'extras-openmoji/ui-element': 'a screen icon, not a picture of the word',
  'extras-openmoji/interaction': 'a screen icon, not a picture of the word', 'symbols/av-symbol': 'a screen icon', 'symbols/alphanum': 'a letter or number',
  'symbols/keycap': 'a letter or number', 'symbols/gender': 'a gender sign', 'symbols/religion': 'a religious symbol', 'symbols/zodiac': 'an astrology sign',
  'travel-places/place-religious': 'a religious building', 'extras-openmoji/queer-symbols': 'a flag or symbol of a movement or cause',
  'people-body/hand-fingers-open': 'a hand gesture (some are rude)', 'people-body/hand-fingers-closed': 'a hand gesture (some are rude)',
  'people-body/hand-fingers-partial': 'a hand gesture (some are rude)', 'people-body/hand-single-finger': 'a hand gesture (some are rude)',
  'people-body/hands': 'a hand gesture (some are rude)', 'people-body/person-gesture': 'a gesture', 'people-body/family': 'a couple or a kiss',
  'people-body/person-fantasy': 'a fantasy figure (some are frightening or religious)', 'smileys-emotion/face-costume': 'a costume face (some are frightening)',
  'smileys-emotion/face-negative': 'a cursing, devil or skull face', 'smileys-emotion/emotion': 'a sign for a feeling, not a picture of the word',
  'objects/medical': 'a medicine, needle or blood', 'extras-openmoji/healthcare': 'a medicine or medical scene', 'extras-openmoji/emergency': 'an emergency sign',
};
// Allowed although their subgroup is not: plainly a child's picture.
const OPENMOJI_ALLOWED = { handshake: true, fairy: true, mermaid: true, merman: true, merperson: true, superhero: true, robot: true, alien: true };
const OPENMOJI_EXCLUDED_TAGS = {
  alcohol: ['alcohol', 'bar', 'beer', 'booze', 'cocktail', 'liquor', 'pub', 'wine', 'whisky', 'whiskey', 'champagne', 'sake', 'drunk', 'drinking'],
  'tobacco or drugs': ['cigarette', 'cigar', 'smoking', 'tobacco', 'drug', 'drugs', 'pill', 'pills', 'syringe', 'injection', 'cannabis', 'marijuana', 'narcotic'],
  weapons: ['weapon', 'weapons', 'gun', 'pistol', 'revolver', 'rifle', 'firearm', 'knife', 'dagger', 'sword', 'blade', 'bomb', 'explosive', 'grenade', 'ammunition', 'bullet', 'arrow', 'archer', 'axe', 'hatchet'],
  'violence, death or crime': ['violence', 'violent', 'fight', 'fighting', 'fighter', 'punch', 'kill', 'murder', 'blood', 'bleed', 'bleeding', 'death', 'dead', 'die', 'coffin', 'funeral', 'grave', 'cemetery', 'skull', 'crime', 'criminal', 'prison', 'jail', 'handcuffs', 'war', 'military', 'injury', 'wound', 'poison', 'toxic'],
  'frightening': ['horror', 'scary', 'monster', 'demon', 'devil', 'evil', 'ghost', 'zombie', 'vampire', 'creepy'],
  'romance or underwear': ['kiss', 'kissing', 'romance', 'romantic', 'sexy', 'sex', 'underwear', 'lingerie', 'bikini', 'bra', 'nude', 'naked'],
  gambling: ['gamble', 'gambling', 'casino', 'bet', 'betting', 'lottery'],
  'religion or a religious holiday': ['religion', 'religious', 'christian', 'christianity', 'jewish', 'judaism', 'muslim', 'islam', 'hindu', 'hinduism', 'buddhist', 'buddhism', 'sikh', 'shinto', 'taoism', 'prayer', 'pray', 'worship', 'church', 'mosque', 'synagogue', 'temple', 'shrine', 'god', 'angel', 'saint', 'christmas', 'santa', 'easter', 'hanukkah', 'diwali', 'ramadan', 'bible', 'quran', 'holy'],
  politics: ['politics', 'political', 'protest', 'election', 'vote', 'ballot', 'revolution', 'propaganda'],
  'rude': ['rude', 'insult', 'offensive', 'swear', 'swearing', 'cursing', 'poo', 'poop', 'fart'],
  flags: ['flag'],
};
// The emoji is another word that is spelled the same (mate is the drink, led is a lamp), or its picture is
// not what a child means: never used for that word.
const OPENMOJI_NOT_THE_WORD = { mate: 'the drink mate (yerba mate), not a friend', led: 'an LED lamp, not the past of "to lead"', pick: 'a pickaxe, not "to pick"',
  lighter: 'a cigarette lighter', wedding: 'a wedding chapel (a religious building)', town: 'the drawing has a church with a cross', dizzy: 'a star sign for dizzy', tablet: 'a computer tablet; the word is also a pill',
  switch: 'an electronics switch symbol', motor: 'an electronics motor symbol', cable: 'an electronics cable symbol', wire: 'an electronics wire symbol', drone: 'a flying drone; the word is also a sound and a bee' };
// Groups an OpenMoji picture of ONE thing comes from, so that a plural word may borrow it.
const OPENMOJI_THINGS = /^(?:animals-nature|food-drink|objects|travel-places|activities|extras-openmoji)\/|^people-body\/(?:person|person-role|body-parts)$/;

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
const isOpenMoji = (file) => String(file).indexOf(OM_PREFIX) === 0;
const setOf = (file) => (isOpenMoji(file) ? 'openmoji' : 'mulberry');

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

// OpenMoji: an emoji may be shown when no rule above excludes it. Returns the reason, or ''.
function openMojiExclusion(row, word) {
  const name = String(row.label || '');
  if (name === 'flag' && word === 'flag') return '';
  if (OPENMOJI_NOT_THE_WORD[name]) return OPENMOJI_NOT_THE_WORD[name];
  // The allowed few were each looked at: their subgroup and their keywords do not exclude them.
  if (OPENMOJI_ALLOWED[name]) return '';
  const sub = row.group + '/' + row.subgroup;
  const why = OPENMOJI_EXCLUDED_SUBGROUPS[sub] || OPENMOJI_EXCLUDED_SUBGROUPS[row.group + '/*'];
  if (why) return why;
  if (/flag/.test(row.subgroup)) return 'a flag';
  const tags = (String(row.tags || '') + ',' + String(row.openmojiTags || '')).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const words = new Set(tags.concat([name]));
  for (const reason of Object.keys(OPENMOJI_EXCLUDED_TAGS)) {
    const hit = OPENMOJI_EXCLUDED_TAGS[reason].filter((t) => words.has(t));
    if (hit.length) return reason + ' (' + hit.join(', ') + ')';
  }
  return '';
}

// The vendored OpenMoji table (only emoji with a one-word name and no skin tone; openmoji-names.json) as rows.
function openMojiRows(table) {
  if (!table || !Array.isArray(table.rows)) return [];
  const col = table.columns;
  const at = (name) => { const i = col.indexOf(name); if (i < 0) throw new Error('openmoji-names.json has no column ' + name); return i; };
  const c = { hex: at('hexcode'), name: at('annotation'), group: at('group'), subgroup: at('subgroups'), unicode: at('unicode'), tags: at('tags'), om: at('openmoji_tags'), author: at('openmoji_author') };
  return table.rows.map((r) => ({ om: true, hex: r[c.hex], file: OM_PREFIX + r[c.hex] + '.svg', label: String(r[c.name]).toLowerCase(), name: r[c.name], group: r[c.group], subgroup: r[c.subgroup],
    unicode: !!r[c.unicode], tags: r[c.tags], openmojiTags: r[c.om], author: r[c.author],
    gendered: /200D-26(?:40|42)|^1F46[89]-200D/.test(r[c.hex]) }));
}

// The table vendored from a release's openmoji.json: what matching needs, nothing else.
function openMojiTable(json, sourceSha) {
  const columns = ['hexcode', 'annotation', 'group', 'subgroups', 'unicode', 'tags', 'openmoji_tags', 'openmoji_author'];
  const rows = json.filter((e) => !e.skintone && /^[a-z]+$/i.test(String(e.annotation || '').trim()))
    .map((e) => columns.map((k) => (k === 'unicode' ? (Number(e.unicode) ? 1 : 0) : String(e[k] == null ? '' : e[k]))))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const head = { about: 'Generated by dev-tools/build_word_sounds_symbols.cjs --openmoji-from <release>. From the release\'s data/openmoji.json: only the emoji named with one word and without a skin tone (the only ones a word can be matched to), and only the fields matching reads. Do not edit.',
    source: { file: 'data/openmoji.json', sha256: sourceSha, entries: json.length }, columns, count: rows.length };
  return JSON.stringify(head, null, 1).replace(/\n\}$/, ',\n "rows": [\n' + rows.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}\n');
}

// The words a packet may be made of: the picker's own default rule (word_sounds_packet_builder.js
// pickWords), without its recording and stage tests.
function usableWords(wordlist, builder) {
  const minZipf = builder.DEFAULT_MIN_ZIPF, minBooks = builder.DEFAULT_MIN_BOOKS;
  return wordlist.rows().filter((row) => /^[a-z]{2,10}$/.test(row.word) && /[aeiouy]/.test(row.word)
    && !row.blocked && !row.nearBlocked && (row.known || (row.zipf >= minZipf && row.books >= minBooks)));
}

// The plain singulars a plural word could come from: cats > cat, boxes > box, puppies > puppy, potatoes > potato.
function singularsOf(word) {
  const out = [];
  if (NOT_A_PLURAL_WORD.indexOf(word) >= 0) return out;
  if (/[^s]s$/.test(word)) out.push(word.slice(0, -1));
  if (/(?:s|x|z|ch|sh)es$/.test(word)) out.push(word.slice(0, -2));
  if (/[^aeiou]oes$/.test(word)) out.push(word.slice(0, -2));
  if (/[^aeiou]ies$/.test(word)) out.push(word.slice(0, -3) + 'y');
  return out.filter((w, i, all) => w.length >= 2 && all.indexOf(w) === i);
}

// The regular forms of a word, by the spelling rules: { s, ing, ed, er, est }, each a list.
// A one-syllable word ending in one vowel letter and one consonant doubles it (hop: hopping, big: bigger).
function inflections(base) {
  const b = String(base);
  const doubles = /^[^aeiou]*[aeiou][bdfgklmnprstvz]$/.test(b) && /^[^aeiouy]*[aeiouy][^aeiouy]*$/.test(b);
  const last = b.slice(-1);
  const out = { s: [], ing: [], ed: [], er: [], est: [] };
  if (/(?:s|x|z|ch|sh)$/.test(b)) out.s.push(b + 'es');
  else if (/[^aeiou]y$/.test(b)) out.s.push(b.slice(0, -1) + 'ies');
  else if (/[^aeiou]o$/.test(b)) out.s.push(b + 'es', b + 's');
  else out.s.push(b + 's');
  if (/ie$/.test(b)) out.ing.push(b.slice(0, -2) + 'ying');
  else if (/ee$/.test(b) || /ye$/.test(b) || /oe$/.test(b)) out.ing.push(b + 'ing');
  else if (/e$/.test(b)) out.ing.push(b.slice(0, -1) + 'ing');
  else if (doubles) out.ing.push(b + last + 'ing');
  else out.ing.push(b + 'ing');
  const grow = (ending) => {
    if (/e$/.test(b)) return [b + ending.slice(1)];
    if (/[^aeiou]y$/.test(b)) return [b.slice(0, -1) + 'i' + ending];
    if (doubles) return [b + last + ending];
    return [b + ending];
  };
  out.ed = grow('ed'); out.er = grow('er'); out.est = grow('est');
  return out;
}

// Returns one map entry per usable word that has at least one picture to show a person.
// context: { rows: Mulberry rows, openmoji: OpenMoji rows (optional), words: usable word rows, isWord(word),
//            review: { word: {file,status,note} } | null, refused: { file: reason } }
function matchWords(context) {
  const byLabel = new Map();
  const qualified = new Map();
  const joinedLabel = new Map();
  const multi = [];
  context.rows.forEach((s) => {
    if (s.rated || SKIP_CATEGORIES.indexOf(s.category) >= 0) return;
    if (!s.single) {
      multi.push(s);
      // Two or more words that spell one word when joined: arm_chair is armchair.
      if (!s.qualifier && /^[A-Za-z]+(?:_[A-Za-z]+)+$/.test(s.head)) {
        const joined = s.head.replace(/_/g, '').toLowerCase();
        if (!joinedLabel.has(joined)) joinedLabel.set(joined, []);
        joinedLabel.get(joined).push(s);
      }
      return;
    }
    const bucket = s.qualifier ? qualified : byLabel;
    if (!bucket.has(s.label)) bucket.set(s.label, []);
    bucket.get(s.label).push(s);
  });
  const omRows = context.openmoji || [];
  const byFile = new Map();
  context.rows.forEach((s) => byFile.set(s.file, s));
  omRows.forEach((o) => byFile.set(o.file, o));
  const symbolOf = (file) => byFile.get(file);
  const omByLabel = new Map();
  omRows.forEach((o) => { if (!omByLabel.has(o.label)) omByLabel.set(o.label, []); omByLabel.get(o.label).push(o); });
  // The plain drawing first, then numbered ones in order; things before "to do it".
  const order = (list) => list.slice().sort((a, b) => (a.verb - b.verb) || (a.variant ? 1 : 0) - (b.variant ? 1 : 0) || (a.variant < b.variant ? -1 : a.variant > b.variant ? 1 : 0) || (a.file < b.file ? -1 : 1));
  const uniq = (list) => list.filter((v, i, all) => all.indexOf(v) === i);
  const about = (s) => (s.verb ? 'a verb ("to ' + s.label + '")' : s.category);
  const refused = context.refused || {};
  const review = context.review || {};
  const reviewUsed = {};
  const isWord = context.isWord || (() => true);
  // A person's decision on a word, laid over what the script decided.
  const withReview = (word, d) => {
    const mine = review[word];
    if (!mine || !d) return d;
    reviewUsed[word] = true;
    const all = uniq((d.candidates || []).concat(d.file ? [d.file] : []));
    const status = String(mine.status || '');
    const kind = d.kind ? { kind: d.kind } : {};
    if (status === 'reviewed') {
      const file = String(mine.file || d.file || '');
      if (!file || all.indexOf(file) < 0) throw new Error('Review file: "' + word + '" names ' + (file || 'no file') + ', which is not one of its symbols (' + all.join(', ') + ')');
      if (refused[file]) throw new Error('Review file: "' + word + '" names ' + file + ', which the safety test refuses');
      return Object.assign({ file, status: 'reviewed', note: String(mine.note || d.note || ''), candidates: all.length > 1 ? all : undefined, symbol: symbolOf(file) }, kind);
    }
    if (status === 'rejected') return Object.assign({ file: '', status: 'rejected', note: String(mine.note || 'rejected by a reviewer'), candidates: all }, kind);
    throw new Error('Review file: "' + word + '" has status "' + status + '" (use reviewed or rejected)');
  };
  // OpenMoji emoji named exactly label that may be shown, and why the others may not.
  const omUsable = (label, word) => (omByLabel.get(label) || []).filter((o) => !refused[o.file] && !openMojiExclusion(o, word || label));
  // OpenMoji's decision for a name: one emoji (or one Unicode emoji among several) is used; several are held.
  const omDecide = (label, word) => {
    const list = omUsable(label, word);
    if (!list.length) return null;
    const unicode = list.filter((o) => o.unicode);
    const pick = list.length === 1 ? list[0] : unicode.length === 1 ? unicode[0] : null;
    const say = (o) => 'OpenMoji "' + o.name + '" (' + o.group + ' / ' + o.subgroup + ', by ' + (o.author || 'the OpenMoji project') + ')';
    if (pick) return { file: pick.file, status: 'auto', kind: 'openmoji', symbol: pick, candidates: list.length > 1 ? list.map((o) => o.file) : undefined,
      note: say(pick) + (list.length > 1 ? '; ' + list.length + ' emoji share the name, the one in Unicode is used' : '') };
    return { file: '', status: 'ambiguous', kind: 'openmoji', candidates: list.map((o) => o.file), note: 'several OpenMoji emoji share this name: ' + list.map((o) => o.file + ' (' + o.group + ' / ' + o.subgroup + ')').join(', ') };
  };
  // More choices for a word Mulberry holds: OpenMoji's same-name emoji and the set's other names for it.
  const extraChoices = (label) => {
    const om = omUsable(label, label).map((o) => o.file);
    const other = (OTHER_NAMES[label] || []).filter((f) => byFile.has(f) && !refused[f]);
    return uniq(om.concat(other));
  };
  // What a symbol name stands for, whether or not the name is a usable word itself.
  const decided = new Map();
  const decide = (label) => {
    if (decided.has(label)) return decided.get(label);
    let d = null;
    const exact = byLabel.get(label) || [];
    const joined = exact.length ? [] : (joinedLabel.get(label) || []);
    if (exact.length || joined.length) {
      const list = order(exact.length ? exact : joined);
      const kinds = uniq(list.map((s) => (s.verb ? 'verb' : s.category)));
      const files = list.map((s) => s.file);
      const kind = exact.length ? {} : { kind: 'joined' };
      const joinedNote = exact.length ? '' : 'the symbol is named "' + list[0].head.replace(/_/g, ' ') + '", the same word written apart; ';
      if (REJECTED[label]) d = Object.assign({ file: '', status: 'rejected', note: REJECTED[label], candidates: files }, kind);
      else if (HELD[label]) d = Object.assign({ file: '', status: 'ambiguous', note: 'held by the script author: ' + HELD[label], candidates: files }, kind);
      else if (kinds.length === 1) {
        d = Object.assign({ file: list[0].file, status: 'auto', symbol: list[0], note: joinedNote + about(list[0]) + (list.length > 1 ? '; ' + list.length + ' drawings of it, the first is used' : '') }, kind);
      } else if (CHILD_SENSE[label] && files.indexOf(CHILD_SENSE[label]) >= 0) {
        d = { file: CHILD_SENSE[label], status: 'auto', candidates: files, symbol: list.filter((s) => s.file === CHILD_SENSE[label])[0],
          note: 'symbols of different kinds share this name (' + uniq(list.map(about)).join(' / ') + '); the everyday thing is used: chosen by the script author, not yet by a reviewer' };
      } else {
        d = Object.assign({ file: '', status: 'ambiguous', candidates: files, note: joinedNote + 'symbols of different kinds share this name: ' + list.map((s) => s.file + ' (' + about(s) + ')').join(', ') }, kind);
      }
      // A file the safety test refuses is never used.
      if (d.file && refused[d.file]) d = { file: '', status: 'rejected', note: 'the symbol file is not used: ' + refused[d.file], candidates: [d.file] };
    } else if (qualified.has(label)) {
      const list = order(qualified.get(label));
      d = { file: '', status: 'ambiguous', candidates: list.map((s) => s.file),
        note: 'no symbol is named just "' + label + '"; these are kinds of it: ' + list.map((s) => s.file + ' (' + s.qualifier + ')').join(', ') };
    }
    // A word Mulberry holds: OpenMoji's emoji of the same name, and the set's other names, are more choices for a person.
    if (d && d.status === 'ambiguous') {
      const more = extraChoices(label).filter((f) => (d.candidates || []).indexOf(f) < 0);
      if (more.length) { d.candidates = (d.candidates || []).concat(more); d.note += '; more choices: ' + more.map((f) => f + (isOpenMoji(f) ? ' (OpenMoji "' + symbolOf(f).name + '")' : ' (Mulberry: another name for it)')).join(', '); }
    }
    d = withReview(label, d);
    decided.set(label, d);
    return d;
  };
  const isThing = (s) => !!s && !s.om && !s.verb && !s.proper && s.grammar === 'Noun' && !NOT_A_THING.test(s.category);
  const omIsThing = (s) => !!s && s.om && OPENMOJI_THINGS.test(s.group + '/' + s.subgroup);
  const isAction = (s) => !!s && !s.om && (s.verb || /^Verb/.test(s.grammar));
  const entryOf = (word, d) => {
    const e = { word, file: d.file, status: d.status };
    if (d.kind) e.kind = d.kind;
    e.note = d.note;
    e.candidates = d.candidates;
    return e;
  };
  // The actions the set draws for a base word ("to jump"), the plain drawing first; a person's choice for the base counts.
  const actionsOf = (base) => {
    const mine = review[base];
    if (mine && mine.status === 'reviewed' && isAction(symbolOf(mine.file))) return [symbolOf(mine.file)];
    return order((byLabel.get(base) || []).filter(isAction));
  };
  const blockedBase = (base) => (REJECTED[base] ? 'rejected' : HELD[base] ? 'held' : (review[base] && review[base].status === 'rejected') ? 'rejected by a reviewer' : '');
  // The word's -ing / -ed / past form of an action: { base, ending }.
  const verbFormOf = (word) => {
    const found = [];
    const tryBase = (base, ending) => { if (base.length >= 2 && actionsOf(base).length && found.every((f) => f.base !== base)) found.push({ base, ending }); };
    const stems = [];
    if (/ing$/.test(word)) { const s = word.slice(0, -3); stems.push(s, s + 'e', s.slice(0, -1), s.replace(/y$/, 'ie')); }
    if (/ed$/.test(word)) { const s = word.slice(0, -2); stems.push(s, s + 'e', s.slice(0, -1), s.replace(/i$/, 'y')); }
    if (/d$/.test(word)) stems.push(word.slice(0, -1));
    uniq(stems).forEach((base) => { const f = inflections(base); if (f.ing.indexOf(word) >= 0) tryBase(base, '-ing'); if (f.ed.indexOf(word) >= 0) tryBase(base, '-ed'); });
    Object.keys(IRREGULAR_PAST).forEach((base) => { if (IRREGULAR_PAST[base].indexOf(word) >= 0) tryBase(base, 'past'); });
    return found;
  };
  const sFormOf = (word) => uniq([word.slice(0, -1), word.slice(0, -2), word.slice(0, -3) + 'y'].filter((b) => b.length >= 2 && inflections(b).s.indexOf(word) >= 0 && actionsOf(b).length));
  const comparativeOf = (word) => {
    if (NOT_A_COMPARATIVE.indexOf(word) >= 0) return [];
    const stems = [];
    [['er', 2], ['est', 3]].forEach(([end, n]) => { if (word.slice(-end.length) === end) { const s = word.slice(0, -n); stems.push(s, s + 'e', s.slice(0, -1), s.replace(/i$/, 'y')); } });
    return uniq(stems).filter((b) => {
      const list = byLabel.get(b) || [];
      if (!list.length || !list.every((s) => !s.verb && ADJECTIVE_CATEGORY.test(s.category))) return false;
      const f = inflections(b);
      return f.er.indexOf(word) >= 0 || f.est.indexOf(word) >= 0;
    });
  };
  const entries = [];
  context.words.forEach((row) => {
    const word = row.word;
    let d = decide(word), entry = null;
    if (d) entry = entryOf(word, d);
    if (!entry) {
      // plural -> singular: the singular is a real word of the list, and the picture is of a thing.
      const singles = singularsOf(word).filter((s) => isWord(s) && NOT_PLURAL.indexOf(s) < 0);
      for (const single of singles) {
        const s = decide(single);
        if (!s) continue;
        const symbols = uniq((s.candidates || []).concat(s.file ? [s.file] : [])).map(symbolOf);
        if (!symbols.some((x) => isThing(x) || omIsThing(x))) break;
        let p;
        if (s.status === 'auto' || s.status === 'reviewed') {
          if (!isThing(s.symbol) && !omIsThing(s.symbol)) break;
          p = { file: s.file, status: s.status, note: 'plural of ' + single + ': the picture shows one; ' + s.note, candidates: s.candidates };
        } else p = { file: '', status: s.status, note: 'plural of ' + single + '; ' + s.note, candidates: s.candidates };
        if (s.kind) p.kind = s.kind;
        p = review[word] ? withReview(word, p) : p;
        entry = entryOf(word, p);
        break;
      }
    }
    if (!entry) {
      // -ing, -ed, or an irregular past of an action the set draws: the action's own drawing.
      const forms = verbFormOf(word);
      if (forms.length) {
        const bases = forms.map((f) => f.base);
        const files = uniq(forms.flatMap((f) => actionsOf(f.base).map((s) => s.file)));
        const say = forms.map((f) => (f.ending === 'past' ? 'the past of' : 'the ' + f.ending + ' form of') + ' "to ' + f.base + '"').join(' or ');
        const blocked = bases.map(blockedBase).filter(Boolean)[0];
        let p;
        if (blocked) p = { file: '', status: blocked === 'held' ? 'ambiguous' : 'rejected', kind: 'verb form', candidates: files, note: say + '; the base word is ' + blocked + ': ' + (REJECTED[bases[0]] || HELD[bases[0]] || '') };
        else if (FORM_HELD[word]) p = { file: '', status: 'ambiguous', kind: 'verb form', candidates: files, note: say + '; held by the script author: ' + FORM_HELD[word] };
        else if (forms.length > 1) p = { file: '', status: 'ambiguous', kind: 'verb form', candidates: files, note: say + ': two different words' };
        else {
          const acts = actionsOf(bases[0]);
          const ok = acts.filter((s) => !refused[s.file]);
          if (!ok.length) p = { file: '', status: 'rejected', kind: 'verb form', candidates: files, note: say + '; the symbol file is not used: ' + refused[files[0]] };
          else {
            const reviewedBase = review[bases[0]] && review[bases[0]].status === 'reviewed';
            p = { file: ok[0].file, status: reviewedBase ? 'reviewed' : 'auto', kind: 'verb form', candidates: files.length > 1 ? files : undefined,
              note: say + ': the drawing of the action' + (files.length > 1 ? '; ' + files.length + ' drawings of it, the first is used' : '') + (reviewedBase ? '; chosen for "' + bases[0] + '" by a reviewer' : '') };
          }
        }
        entry = entryOf(word, review[word] ? withReview(word, p) : p);
      }
    }
    if (!entry && SPELLING[word] && isWord(word)) {
      const s = decide(SPELLING[word]);
      if (s && (s.status === 'auto' || s.status === 'reviewed')) entry = entryOf(word, withReview(word, { file: s.file, status: s.status, kind: 'spelling', candidates: s.candidates, note: 'the American spelling of "' + SPELLING[word] + '"; ' + s.note }));
    }
    // OpenMoji, only where Mulberry has nothing by name: the emoji named exactly the word, or its singular.
    if (!entry && omRows.length) {
      let p = omDecide(word, word);
      if (!p) {
        for (const single of singularsOf(word).filter((s) => isWord(s) && NOT_PLURAL.indexOf(s) < 0)) {
          if (byLabel.has(single) || joinedLabel.has(single) || qualified.has(single)) break;
          const s = omDecide(single, word);
          if (!s) continue;
          if (s.status === 'auto' && omIsThing(s.symbol)) p = { file: s.file, status: 'auto', kind: 'openmoji', candidates: s.candidates, note: 'plural of ' + single + ': the picture shows one; ' + s.note };
          else if (s.status !== 'auto') p = { file: '', status: 'ambiguous', kind: 'openmoji', candidates: s.candidates, note: 'plural of ' + single + '; ' + s.note };
          break;
        }
      }
      if (p) entry = entryOf(word, review[word] ? withReview(word, p) : p);
    }
    // The kinds that only a person may accept.
    if (!entry) {
      let p = null;
      const blocked = (base) => blockedBase(base);
      // The word's own review is applied to its entry below; only the script author's doubts keep it out here.
      const authorBlocked = (w) => !!(REJECTED[w] || HELD[w]);
      const sBase = sFormOf(word).filter((b) => !blocked(b) || blocked(b) === 'held');
      const comp = comparativeOf(word).filter((b) => !blocked(b));
      const faceSets = ['_lady', '_man'].map((end) => order(multi.filter((s) => !s.verb && s.head.toLowerCase() === word + end)));
      const faces = faceSets.every((list) => list.length) ? faceSets.flat() : [];
      const objects = order(multi.filter((s) => s.verb && s.head.toLowerCase().indexOf(word + '_') === 0)).slice(0, 6);
      const other = (OTHER_NAMES[word] || []).filter((f) => byFile.has(f) && !refused[f]);
      if (sBase.length) {
        const files = uniq(sBase.flatMap((b) => actionsOf(b).map((s) => s.file)));
        p = { file: '', status: 'ambiguous', kind: 's form', candidates: files, note: 'the -s form of "to ' + sBase.join('" or "to ') + '" (she ' + word + '): the word may also be the plural of a noun the drawing does not show' + (sBase.some((b) => blocked(b)) ? '; the base word is held' : '') };
      } else if (comp.length) {
        const files = uniq(comp.flatMap((b) => order(byLabel.get(b)).map((s) => s.file)));
        p = { file: '', status: 'ambiguous', kind: 'adjective form', candidates: files, note: 'the ' + (/est$/.test(word) ? '-est' : '-er') + ' form of "' + comp.join('" or "') + '": the drawing shows the plain word' };
      } else if (faces.length && !authorBlocked(word)) {
        p = { file: '', status: 'ambiguous', kind: 'feeling faces', candidates: faces.map((s) => s.file), note: 'the set draws this feeling twice, as a lady\'s face and a man\'s face: choose one, or neither' };
      } else if (objects.length && !authorBlocked(word)) {
        p = { file: '', status: 'ambiguous', kind: 'action with an object', candidates: objects.map((s) => s.file), note: 'the set has the action only with an object or a direction: ' + objects.map((s) => s.head.replace(/_/g, ' ')).join(', ') };
      } else if (other.length) {
        p = { file: '', status: 'ambiguous', kind: 'other name', candidates: other, note: 'the set calls it ' + other.map((f) => '"' + f.replace(/(?:_\d+)?\.svg$/, '').replace(/_/g, ' ') + '"').join(' or ') + ': the same thing by another name, to be checked' };
      }
      if (p) entry = entryOf(word, review[word] ? withReview(word, p) : p);
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

// The OpenMoji set as vendored: source.json and the names table, or null when it is not here.
function loadOpenMoji(omFrom) {
  const sourceFile = path.join(OM_VENDOR, 'source.json');
  if (!fs.existsSync(sourceFile)) return null;
  const source = JSON.parse(read(sourceFile));
  let tableText = fs.existsSync(OM_TABLE) ? read(OM_TABLE) : null;
  let releaseDir = null;
  if (omFrom) {
    const root = path.resolve(omFrom);
    const jsonFile = [path.join(root, 'openmoji.json'), path.join(root, 'data', 'openmoji.json')].filter((f) => fs.existsSync(f))[0];
    if (!jsonFile) throw new Error('No openmoji.json in ' + root);
    const raw = fs.readFileSync(jsonFile);
    if (source.data && source.data.sha256 && sha256(raw) !== source.data.sha256) throw new Error('openmoji.json is not the one data/vendor/openmoji/source.json names (sha256 ' + sha256(raw) + ')');
    tableText = openMojiTable(JSON.parse(raw.toString('utf8').replace(BOM, '')), sha256(raw));
    releaseDir = [path.join(root, 'color', 'svg'), path.join(root, 'svg'), path.join(root, 'x'), root].filter((d) => fs.existsSync(path.join(d, '1F600.svg')))[0] || null;
  }
  if (!tableText) return { source, table: null, tableText: null, rows: [], releaseDir };
  const table = JSON.parse(tableText);
  return { source, table, tableText, rows: openMojiRows(table), releaseDir };
}

// Everything the outputs are made from. `from` (optional) is an unzipped Mulberry release and
// `openmojiFrom` an unzipped OpenMoji one: symbol files that are needed and not yet vendored are read
// from them (main() copies them).
function compute(options) {
  const opts = options || {};
  const parts = opts.parts || loadParts();
  const { core, dictionary, wordlist, builder } = parts;
  const source = JSON.parse(read(path.join(VENDOR, 'source.json')));
  const rows = symbolRows(read(path.join(VENDOR, 'symbol-info.csv')));
  const openmoji = opts.noOpenMoji ? null : loadOpenMoji(opts.openmojiFrom);
  const omRows = openmoji ? openmoji.rows : [];
  const words = usableWords(wordlist, builder);
  const isWord = (w) => !!wordlist.get(w) && !wordlist.get(w).notInDictionary;
  const review = opts.review !== undefined ? opts.review : loadReview();
  const fromDir = opts.from ? path.join(path.resolve(opts.from), fs.existsSync(path.join(path.resolve(opts.from), 'EN-symbols')) ? 'EN-symbols' : '') : null;
  const svgCache = new Map();
  const missing = [];
  const svgOf = (file) => {
    if (svgCache.has(file)) return svgCache.get(file);
    let text = null;
    if (isOpenMoji(file)) {
      const name = file.slice(OM_PREFIX.length);
      const here = path.join(OM_SYMBOL_DIR, name);
      if (fs.existsSync(here)) text = read(here);
      else if (openmoji && openmoji.releaseDir && fs.existsSync(path.join(openmoji.releaseDir, name))) text = read(path.join(openmoji.releaseDir, name));
    } else {
      const here = path.join(SYMBOL_DIR, file);
      if (fs.existsSync(here)) text = read(here);
      else if (fromDir && fs.existsSync(path.join(fromDir, file))) text = read(path.join(fromDir, file));
    }
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
  filesOf(matchWords({ rows, openmoji: omRows, words, isWord, review: null })).forEach((file) => {
    const text = svgOf(file);
    if (text == null) return;
    const why = builder.svgRefusal(minifySvg(text));
    if (why) refused[file] = why;
  });
  const entries = matchWords({ rows, openmoji: omRows, words, isWord, review, refused }).map((e) => {
    // The set of the picture used, beside its file.
    if (!e.file) return e;
    const out = { word: e.word, set: setOf(e.file) };
    Object.keys(e).forEach((k) => { if (k !== 'word') out[k] = e[k]; });
    return out;
  });
  const inPlay = filesOf(entries);
  inPlay.forEach(svgOf);
  // Missing: the files in play that are neither vendored nor in a release folder handed in (only these: the
  // review sheet also asks for emoji that are not in play).
  inPlay.forEach((file) => { if (svgCache.get(file) == null) missing.push(file); });
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
  stages.forEach((s) => { byStage[s.id] = { usable: 0, withPicture: 0, mulberry: 0, openmoji: 0, ambiguous: 0, recorded: 0, recordedWithPicture: 0 }; });
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
      if (has) { c.withPicture++; c[e.set]++; }
      if (e && e.status === 'ambiguous') c.ambiguous++;
      if (row.hasClip) { c.recorded++; if (has) c.recordedWithPicture++; }
    });
  });
  const tally = (status) => entries.filter((e) => e.status === status).length;
  const usedBy = (set) => used.filter((e) => e.set === set).length;
  const byKind = {};
  entries.forEach((e) => { const k = e.kind || (/^plural of /.test(e.note) ? 'plural' : 'name'); byKind[k] = byKind[k] || { auto: 0, reviewed: 0, ambiguous: 0, rejected: 0 }; byKind[k][e.status]++; });
  const counts = { usableWords: words.length, usableWithRecording: recorded.size, matched: entries.length, auto: tally('auto'), reviewed: tally('reviewed'), ambiguous: tally('ambiguous'), rejected: tally('rejected'),
    viaPlural: entries.filter((e) => e.status === 'auto' && /^plural of /.test(e.note)).length, symbolsVendored: inPlay.filter((f) => !isOpenMoji(f)).length,
    openmojiVendored: inPlay.filter(isOpenMoji).length, usedBySet: { mulberry: usedBy('mulberry'), openmoji: usedBy('openmoji') }, byKind,
    packetWords: Object.keys(wordFiles).length, packetSymbols: Object.keys(symbols).length,
    packetWordsBySet: { mulberry: Object.keys(wordFiles).filter((w) => !isOpenMoji(wordFiles[w])).length, openmoji: Object.keys(wordFiles).filter((w) => isOpenMoji(wordFiles[w])).length }, byStage };
  const omSource = openmoji ? openmoji.source : null;
  const header = {
    about: 'Generated by dev-tools/build_word_sounds_symbols.cjs. Do not edit: put decisions in data/word_sounds_symbols_review_en.json and re-run. Only "auto" and "reviewed" words get a picture in a packet.',
    version: 2, language: 'en',
    source: { id: source.id, name: source.name, version: source.version, license: source.license, licenseUrl: source.licenseUrl, symbolInfoSha256: source.symbolInfo.sha256 },
    sources: Object.assign({ mulberry: { name: source.name, version: source.version, license: source.licenseShort, folder: 'data/vendor/mulberry/symbols' } },
      omSource ? { openmoji: { name: omSource.name, version: omSource.version, license: omSource.licenseShort, folder: 'data/vendor/openmoji/symbols', tableSha256: openmoji.tableText ? sha256(openmoji.tableText) : '' } } : {}),
    statuses: { auto: 'used: matched by a stated rule that leaves one meaning (see kinds); the note says which',
      ambiguous: 'symbols of different kinds share the name, the match is one only a person may accept, or the script author doubts the meaning; NOT used until a person decides',
      rejected: 'not used', reviewed: 'a person chose this symbol; used' },
    kinds: { name: '(no kind field) a Mulberry symbol named exactly the word, or the word is the plain plural of one ("plural of" in the note)',
      joined: 'a Mulberry symbol named with two words that are the word written apart (arm_chair: armchair); used as a name is',
      'verb form': 'the -ing, -ed or past form of a Mulberry action; the action drawing is used unless the word has another everyday meaning',
      spelling: 'the American spelling of a Mulberry name (colour: color); used',
      openmoji: 'no Mulberry symbol has the word\'s name: one OpenMoji emoji is named the word (or its singular); used. Several of one name: held',
      's form': 'the -s form of a Mulberry action: it may also be a plural noun; held', 'adjective form': 'the -er or -est form of a Mulberry describing word; held',
      'feeling faces': 'a feeling drawn as a lady\'s and a man\'s face; held', 'action with an object': 'a Mulberry action drawn only with an object or direction; held',
      'other name': 'the Mulberry name is another word for the thing (lorry: truck); held' },
    fields: 'word; set (mulberry or openmoji: the set of the file used, when one is); file (a Mulberry file in data/vendor/mulberry/symbols, or "openmoji/<code>.svg", a file in data/vendor/openmoji/symbols; empty when none is used); status; kind (how it matched, when not by name); note; candidates (the files a reviewer can choose from, when there is more than one, from either set)',
    counts,
  };
  // One word a line, so a change to one word is one line in a diff.
  const mapText = JSON.stringify(header, null, 1).replace(/\n\}$/, ',\n "words": [\n' + entries.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n ]\n}\n');
  const made = { parts, source, rows, omRows, openmoji, words, entries, refused, missing, symbols, wordFiles, counts, mapText, rawBytes, changed, inPlay, svgOf };
  Object.assign(made, dataFiles({ source, omSource, symbols, wordFiles, rows, omRows }));
  return made;
}

// The OpenMoji credit and the short notice the index carries (the full license is data/vendor/openmoji/LICENSE.txt).
function openMojiCredit(omSource) {
  return { set: omSource.name, author: omSource.author, license: omSource.licenseShort, licenseUrl: omSource.licenseUrl, url: omSource.homepage, version: omSource.version };
}
function openMojiNotice(omSource) {
  return omSource.name + ' ' + omSource.version + '\n' + '='.repeat((omSource.name + ' ' + omSource.version).length) + '\n\n' + omSource.attribution + '\n\n' + omSource.licenseStatement;
}

// The page data: shard files of at most about SHARD_MAX bytes of drawings each, one set to a file
// (Mulberry first, symbols in name order), and the index script that knows which word is where.
function dataFiles(input) {
  const { source, omSource, symbols, wordFiles, rows, omRows } = input;
  const labelOf = {};
  rows.forEach((s) => { labelOf[s.file] = s.label; });
  (omRows || []).forEach((o) => { labelOf[o.file] = o.label; });
  const mulFiles = Object.keys(symbols).filter((f) => !isOpenMoji(f)).sort();
  const omFiles = Object.keys(symbols).filter(isOpenMoji).sort();
  if (omFiles.length && !omSource) throw new Error('OpenMoji pictures without data/vendor/openmoji/source.json');
  const groups = [];
  [['mulberry', mulFiles], ['openmoji', omFiles]].forEach(([set, list]) => {
    let now = null;
    list.forEach((f) => {
      const size = Buffer.byteLength(symbols[f]);
      if (!now || (now.size + size > SHARD_MAX && now.files.length)) { now = { set, files: [], size: 0 }; groups.push(now); }
      now.files.push(f); now.size += size;
    });
  });
  const credit = { set: 'Mulberry Symbols', author: source.author, license: source.licenseShort, licenseUrl: source.licenseUrl, url: source.homepage, version: source.version };
  const aboutLine = 'Mulberry Symbols ' + source.version + ' (' + source.homepage + '), ' + source.copyright + ', licensed under the Creative Commons Attribution-ShareAlike 4.0 International License ('
    + source.licenseUrl + '). These drawings are a separate work from the program that shows them and stay under that license. Each is the original file from the set, unchanged but for file tidying.';
  const omAbout = omSource ? omSource.name + ' ' + omSource.version + ' (' + omSource.homepage + '): ' + omSource.attribution + ' Licensed under the Creative Commons Attribution-ShareAlike 4.0 International License ('
    + omSource.licenseUrl + '). These drawings are a separate work from the program that shows them and stay under that license. Each is the original file from the set, unchanged but for file tidying.' : '';
  const fileShard = {};
  const shards = groups.map((group, i) => {
    const url = SHARD_DIR + '/en-' + (i + 1) + '.json';
    group.files.forEach((f) => { fileShard[f] = i; });
    const text = '{"about":' + jsonText(group.set === 'openmoji' ? omAbout : aboutLine) + ',"version":1,"language":"en","set":' + jsonText(group.set) + ',"shard":' + (i + 1) + ',"of":' + groups.length + ',"symbols":{\n'
      + group.files.map((f) => jsonText(f) + ':' + jsonText(symbols[f])).join(',\n') + '\n}}\n';
    return { url, text, bytes: Buffer.byteLength(text), sha256: sha256(text), symbols: group.files.length, set: group.set };
  });
  const files = mulFiles.concat(omFiles);
  const index = {};
  files.forEach((f, i) => { index[f] = i; });
  // The index is kept small: Mulberry names without ".svg", OpenMoji codes, the label only where the
  // name does not give it, the first file of each data file, and the words with the file of each.
  const derivedLabel = (name) => name.replace(/_,_to$/, '').replace(/_\d+[a-z]?$/, '').replace(/_-_.*$/, '').toLowerCase();
  const names = mulFiles.map((f) => f.slice(0, -4));
  const codes = omFiles.map((f) => f.slice(OM_PREFIX.length, -4));
  names.concat(codes).forEach((n) => { if (/\s/.test(n)) throw new Error('A symbol name holds a space: ' + n); });
  const labelExceptions = {};
  mulFiles.forEach((f, i) => { if ((labelOf[f] || '') !== derivedLabel(names[i])) labelExceptions[i] = labelOf[f] || ''; });
  const omLabels = omFiles.map((f) => labelOf[f] || '');
  const starts = shards.map((s, i) => files.indexOf(groups[i].files[0]));
  const wordList = Object.keys(wordFiles).sort().filter((w) => index[wordFiles[w]] != null);
  wordList.forEach((w) => { if (!/^[a-z]+$/.test(w)) throw new Error('A word that is not plain letters: ' + w); });
  const notice = read(path.join(VENDOR, 'LICENSE.txt')).replace(/\r\n?/g, '\n').trim();
  const omCredit = omSource ? openMojiCredit(omSource) : null;
  const notices = Object.assign({ mulberry: notice }, omSource ? { openmoji: openMojiNotice(omSource) } : {});
  const credits = Object.assign({ mulberry: credit }, omCredit ? { openmoji: omCredit } : {});
  const indexText = [
    '// Generated by dev-tools/build_word_sounds_symbols.cjs. Do not edit.',
    '// Which Word Sounds words have a picture a packet can use, and which file of ' + SHARD_DIR + '/ holds it.',
    '// The pictures are Mulberry Symbols ' + source.version + ' (' + source.homepage + '), ' + source.copyright + ',',
    '// licensed under the Creative Commons Attribution-ShareAlike 4.0 International License',
    '// (' + source.licenseUrl + ')' + (omSource ? ', and, for words Mulberry has no symbol for, ' + omSource.name + ' ' + omSource.version : '') + '.',
    omSource ? '// (' + omSource.homepage + ', ' + omSource.licenseShort + '): ' + omSource.attribution : '// ',
    '// They are a separate work from the program around them and stay under that license. Which word gets',
    '// which picture, and why: data/word_sounds_symbols_map_en.json. Each picture says its set: get(word).set.',
    '// Only words that have a recording are here: a packet cannot use a word without one.',
    'var createWordSoundsSymbols = (function () {',
    "  'use strict';",
    '  var cached;',
    '  return function createWordSoundsSymbols() {',
    '    if (cached) return cached;',
    '    // credit and notice are Mulberry\'s (most pictures); credits and notices hold one for each set.',
    '    var credit = Object.freeze(' + JSON.stringify(credit) + ');',
    '    var notice = ' + JSON.stringify(notice) + ';',
    '    var credits = Object.freeze({ mulberry: credit' + (omCredit ? ', openmoji: Object.freeze(' + JSON.stringify(omCredit) + ')' : '') + ' });',
    '    var notices = Object.freeze({ mulberry: notice' + (omSource ? ', openmoji: ' + JSON.stringify(notices.openmoji) : '') + ' });',
    '    // The data files, the same ones whatever words are chosen. bytes and sha256 are of each file as it is on the site.',
    '    var shards = Object.freeze(' + JSON.stringify(shards.map((s) => ({ url: s.url, bytes: s.bytes, sha256: s.sha256, symbols: s.symbols, set: s.set }))) + '.map(Object.freeze));',
    '    var names = ' + JSON.stringify(names.join(' ')) + ".split(' ');",
    '    var codes = ' + JSON.stringify(codes.join(' ')) + ".split(' ').filter(Boolean);",
    '    var omLabels = ' + JSON.stringify(omLabels.join(' ')) + ".split(' ').filter(Boolean);",
    '    var labelExceptions = ' + JSON.stringify(labelExceptions) + ';',
    '    var starts = ' + JSON.stringify(starts) + ';',
    '    var wordList = ' + JSON.stringify(wordList.join(' ')) + ".split(' ').filter(Boolean);",
    '    var wordFile = ' + JSON.stringify(wordList.map((w) => index[wordFiles[w]])) + ';',
    "    var files = names.map(function (n) { return n + '.svg'; }).concat(codes.map(function (c) { return '" + OM_PREFIX + "' + c + '.svg'; }));",
    '    var labels = names.map(function (n, i) { return Object.prototype.hasOwnProperty.call(labelExceptions, i) ? labelExceptions[i] : n.replace(/_,_to$/, \'\').replace(/_\\d+[a-z]?$/, \'\').replace(/_-_.*$/, \'\').toLowerCase(); }).concat(omLabels);',
    "    var sets = files.map(function (f, i) { return i < names.length ? 'mulberry' : 'openmoji'; });",
    '    var fileShard = files.map(function (f, i) { var s = 0; while (s + 1 < starts.length && starts[s + 1] <= i) s++; return s; });',
    '    var words = {};',
    '    wordList.forEach(function (w, i) { words[w] = wordFile[i]; });',
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
    '    // { file, svg, label, set } for a word whose picture has been added, else null. set is "mulberry" or "openmoji".',
    '    function get(word) {',
    '      if (!has(word)) return null;',
    '      var i = words[key(word)];',
    '      return svgs[i] == null ? null : { file: files[i], svg: svgs[i], label: labels[i], set: sets[i] };',
    '    }',
    '    function ready() { return shards.every(function (s, i) { return !!added[i]; }); }',
    "    cached = Object.freeze({ version: 2, language: 'en', credit: credit, notice: notice, credits: credits, notices: notices, count: wordList.length, symbols: files.length,",
    '      bytes: ' + shards.reduce((n, s) => n + s.bytes, 0) + ', shards: shards, has: has, file: function (word) { return has(word) ? files[words[key(word)]] : null; },',
    '      set: function (word) { return has(word) ? sets[words[key(word)]] : null; },',
    '      add: add, get: get, ready: ready, words: function () { return wordList.slice(); } });',
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

// The digest a source.json records for the vendored symbol files: "<sha256>  <name>" lines, sorted by name.
function symbolsDigest(dir) {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.svg$/.test(f)).sort() : [];
  let bytes = 0;
  const lines = names.map((name) => { const data = fs.readFileSync(path.join(dir, name)); bytes += data.length; return sha256(data) + '  ' + name; });
  return { count: names.length, bytes, sha256: sha256(lines.join('\n') + '\n') };
}

function reportText(made) {
  const c = made.counts, lines = [];
  lines.push('Usable words (not blocked, familiar by the default rule): ' + c.usableWords + ', of which ' + c.usableWithRecording + ' have a recording');
  lines.push('Matched to at least one picture: ' + c.matched + ' (auto ' + c.auto + ', of which ' + c.viaPlural + ' through a plural; reviewed ' + c.reviewed + '; ambiguous ' + c.ambiguous + '; rejected ' + c.rejected + ')');
  lines.push('Used, by set: Mulberry ' + c.usedBySet.mulberry + ', OpenMoji ' + c.usedBySet.openmoji);
  lines.push('By kind (auto / reviewed / ambiguous / rejected): ' + Object.keys(c.byKind).sort().map((k) => k + ' ' + ['auto', 'reviewed', 'ambiguous', 'rejected'].map((s) => c.byKind[k][s]).join('/')).join('; '));
  lines.push('Symbol files vendored (used, held and rejected candidates): Mulberry ' + c.symbolsVendored + ', OpenMoji ' + c.openmojiVendored);
  lines.push('In the page data (used words that have a recording): ' + c.packetWords + ' words (Mulberry ' + c.packetWordsBySet.mulberry + ', OpenMoji ' + c.packetWordsBySet.openmoji + '), ' + c.packetSymbols + ' symbols, ' + made.rawBytes + ' bytes of drawings (' + made.changed + ' files changed by tidying), in '
    + made.shards.length + ' files: ' + made.shards.map((s) => s.url + ' ' + s.bytes + (s.set === 'openmoji' ? ' (OpenMoji)' : '')).join(', ') + '; total ' + made.shards.reduce((n, s) => n + s.bytes, 0) + '; index ' + Buffer.byteLength(made.indexText) + ' bytes');
  lines.push('By stage (a stage holds the earlier ones): usable words | with a picture (Mulberry + OpenMoji) | held | with a recording | with a recording and a picture');
  Object.keys(c.byStage).forEach((id) => { const s = c.byStage[id]; lines.push('  ' + id + ': ' + s.usable + ' | ' + s.withPicture + ' (' + (s.usable ? Math.round(100 * s.withPicture / s.usable) : 0) + '%: ' + s.mulberry + ' + ' + s.openmoji + ') | ' + s.ambiguous + ' | ' + s.recorded + ' | ' + s.recordedWithPicture + ' (' + (s.recorded ? Math.round(100 * s.recordedWithPicture / s.recorded) : 0) + '%)'); });
  lines.push('Map: ' + Buffer.byteLength(made.mapText) + ' bytes');
  if (Object.keys(made.refused).length) lines.push('Refused by the safety test: ' + Object.keys(made.refused).map((f) => f + ' (' + made.refused[f] + ')').join(', '));
  return lines.join('\n');
}

// OpenMoji emoji whose name is a usable word with no picture, left out by a rule: what the rules cost.
function openMojiLeftOut(made) {
  const byWord = new Map(made.entries.map((e) => [e.word, e]));
  const out = [];
  made.words.forEach((row) => {
    const e = byWord.get(row.word);
    if (e && (e.status === 'auto' || e.status === 'reviewed')) return;
    (made.omRows || []).filter((o) => o.label === row.word).forEach((o) => { const why = openMojiExclusion(o, row.word); if (why) out.push({ word: row.word, file: o.file, name: o.name, why }); });
  });
  return out;
}

// The review sheet: one HTML file, no network. Held pictures first, grouped by how they matched, each with
// buttons that write the decision lines for the review file; then the used pictures to look over.
function reviewSheet(made, doubtful) {
  const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const recorded = new Set(made.words.filter((row) => row.hasClip).map((row) => row.word));
  const uris = new Map();
  const img = (file, side) => {
    const text = made.svgOf(file);
    if (text == null) return '<span class="none">(file not here)</span>';
    if (!uris.has(file)) uris.set(file, 'data:image/svg+xml;base64,' + Buffer.from(minifySvg(text), 'utf8').toString('base64'));
    return '<img alt="" width="' + (side || 96) + '" height="' + (side || 96) + '" src="' + uris.get(file) + '">';
  };
  const setName = (file) => (isOpenMoji(file) ? 'OpenMoji' : 'Mulberry');
  const mark = (word) => (recorded.has(word) ? ' <span class="rec" title="has a recording">&#9679;</span>' : '');
  const card = (e) => '<figure><div class="pic">' + img(e.file) + '</div><figcaption><b>' + esc(e.word) + '</b>' + mark(e.word) + '<br><code>' + esc(e.file) + '</code>' + (e.note && e.kind ? '<br><span class="note">' + esc(e.note.split(';')[0]) + '</span>' : '') + '</figcaption></figure>';
  const plural = (e) => /^plural of /.test(e.note);
  const kindOf = (e) => e.kind || (plural(e) ? 'plural' : 'name');
  const c = made.counts;
  const section = (id, title, intro, body) => '<section id="' + id + '"><h2>' + esc(title) + '</h2><p>' + intro + '</p>' + body + '</section>';
  const grid = (list) => '<div class="grid">' + list.map(card).join('') + '</div>';
  const first = (list) => list.slice().sort((a, b) => (recorded.has(b.word) - recorded.has(a.word)) || (a.word < b.word ? -1 : 1));
  // A held word: its candidates side by side, and one button for each choice.
  const decideRow = (e) => {
    const files = e.candidates || (e.file ? [e.file] : []);
    const choice = (value, label) => '<label class="pick"><input type="radio" name="w-' + esc(e.word) + '" value="' + esc(value) + '"> ' + label + '</label>';
    return '<div class="row" data-word="' + esc(e.word) + '"><div class="word"><b>' + esc(e.word) + '</b>' + mark(e.word) + '<br><span class="note">' + esc(e.note) + '</span></div><div class="cands">'
      + files.map((f) => '<figure' + (f === e.file ? ' class="chosen"' : '') + '><div class="pic">' + img(f) + '</div><figcaption><code>' + esc(f) + '</code><br>' + setName(f) + (f === e.file ? ', used now' : '') + '<br>'
        + choice(f, 'use this') + '</figcaption></figure>').join('')
      + '<div class="none-choice">' + choice('', 'none: reject') + '<br>' + choice('-', 'not sure') + '</div></div></div>';
  };
  const listRows = (list) => list.map((e) => '<div class="row"><div class="word"><b>' + esc(e.word) + '</b>' + mark(e.word) + '<br><span class="note">' + esc(e.note) + '</span></div><div class="cands">'
    + (e.candidates || (e.file ? [e.file] : [])).map((f) => '<figure' + (f === e.file ? ' class="chosen"' : '') + '><div class="pic">' + img(f) + '</div><figcaption><code>' + esc(f) + '</code><br>' + setName(f) + (f === e.file ? ', used now' : '') + '</figcaption></figure>').join('') + '</div></div>').join('');
  const held = made.entries.filter((e) => e.status === 'ambiguous');
  const used = made.entries.filter((e) => e.status === 'auto');
  const HELD_GROUPS = [
    ['h-openmoji-more', 'Mulberry holds the word; OpenMoji or another Mulberry name offers a picture', (e) => !e.kind && e.note.indexOf('; more choices: ') >= 0],
    ['h-verb', 'Verb forms the script author doubts (another everyday meaning, or the base word is held)', (e) => e.kind === 'verb form'],
    ['h-s', 'The -s form of an action (jumps): may also be a plural noun', (e) => e.kind === 's form'],
    ['h-adj', 'The -er or -est form of a describing word (taller, longest)', (e) => e.kind === 'adjective form'],
    ['h-faces', 'Feelings drawn as a lady\'s face and a man\'s face: pick one or neither', (e) => e.kind === 'feeling faces'],
    ['h-objects', 'Actions drawn only with an object or direction (kick a ball, wake up)', (e) => e.kind === 'action with an object'],
    ['h-other', 'The same thing by another name (truck: lorry, mom: mum)', (e) => e.kind === 'other name'],
    ['h-om', 'Several OpenMoji emoji share the name', (e) => e.kind === 'openmoji'],
    ['h-mulberry', 'Held as before: Mulberry symbols of different kinds, kinds of a thing, or the author\'s doubts', () => true],
  ];
  const placed = new Set();
  const heldSections = HELD_GROUPS.map(([id, title, test]) => {
    const list = first(held.filter((e) => !placed.has(e.word) && test(e)));
    list.forEach((e) => placed.add(e.word));
    return list.length ? { id, title, list } : null;
  }).filter(Boolean);
  const USED_GROUPS = [
    ['u-verb', 'Used now, new: verb forms of an action (jumping, jumped, ran)', (e) => e.kind === 'verb form'],
    ['u-om', 'Used now, new: OpenMoji, for words Mulberry has nothing for', (e) => e.kind === 'openmoji'],
    ['u-joined', 'Used now, new: a two-word name that is the word, and American spellings', (e) => e.kind === 'joined' || e.kind === 'spelling'],
    ['u-name', 'Used now: the word is the name of the Mulberry symbol', (e) => !e.kind && !plural(e) && !e.candidates],
    ['u-chosen', 'Used now: Mulberry symbols of different kinds, the everyday one chosen by the script author', (e) => !e.kind && !plural(e) && e.candidates],
    ['u-plural', 'Used now: a plural word with the picture of one', (e) => !e.kind && plural(e)],
  ];
  const usedSections = USED_GROUPS.map(([id, title, test]) => { const list = first(used.filter(test)); return list.length ? { id, title, list } : null; }).filter(Boolean);
  const reviewed = made.entries.filter((e) => e.status === 'reviewed');
  const rejected = made.entries.filter((e) => e.status === 'rejected');
  const byWord = new Map(made.entries.map((e) => [e.word, e]));
  const doubt = (doubtful || []).filter((d) => byWord.has(d.word));
  const leftOut = openMojiLeftOut(made);
  const omv = made.openmoji ? made.openmoji.source : null;
  // The only script: it reads the choices on this page and writes the lines to paste. Nothing leaves the page.
  const script = 'function picked(){var out={};document.querySelectorAll(".row[data-word]").forEach(function(row){var w=row.getAttribute("data-word");var c=row.querySelector("input:checked");if(!c||c.value==="-")return;'
    + 'out[w]=c.value?{status:"reviewed",file:c.value}:{status:"rejected"};});return out;}'
    + 'function show(){var o=picked();var keys=Object.keys(o);var t=keys.map(function(k){return "    "+JSON.stringify(k)+": "+JSON.stringify(o[k]);}).join(",\\n");'
    + 'document.getElementById("out").value=t;document.getElementById("out-count").textContent=keys.length+" decisions";}'
    + 'document.addEventListener("change",show);show();';
  const scriptHash = crypto.createHash('sha256').update(script).digest('base64');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; script-src \'sha256-' + scriptHash + '\'">'
    + '<title>Word Sounds pictures: review sheet</title><style>'
    + 'body{font:15px/1.4 system-ui,Segoe UI,Arial,sans-serif;margin:24px;color:#1d2433;background:#fff}h1{font-size:1.5rem}h2{font-size:1.2rem;margin-top:32px;border-top:2px solid #c9cede;padding-top:16px}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}figure{margin:0;border:1px solid #c9cede;border-radius:8px;padding:6px;text-align:center;break-inside:avoid}'
    + '.pic{height:100px;display:flex;align-items:center;justify-content:center}figcaption{font-size:.8rem;overflow-wrap:anywhere}code{font-size:.72rem;color:#4a5468}.rec{color:#1d6b3a}'
    + '.row{display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid #e3e6ef;padding:8px 0;break-inside:avoid}.word{width:260px;flex:none}.note{font-size:.78rem;color:#4a5468}.cands{display:flex;flex-wrap:wrap;gap:8px}'
    + '.cands figure{width:140px}.chosen{border:3px solid #1d6b3a}.none{color:#8a4b00;font-size:.8rem}ol.doubt li{margin:6px 0;break-inside:avoid}.dpic{display:inline-block;vertical-align:middle;margin-right:8px}'
    + '.pick{display:inline-block;margin-top:4px;font-size:.8rem;cursor:pointer}.none-choice{align-self:center;font-size:.8rem}nav ul{columns:2}#decide{position:sticky;bottom:0;background:#f4f6fb;border-top:2px solid #c9cede;padding:10px}'
    + '#out{width:100%;height:7em;font:12px ui-monospace,Consolas,monospace}table.rules td{vertical-align:top;padding:2px 8px;border-bottom:1px solid #e3e6ef;font-size:.85rem}'
    + '@media (max-width:640px){body{margin:12px}.row{flex-direction:column}.word{width:auto}}@media print{body{margin:8mm}.grid{grid-template-columns:repeat(6,1fr)}#decide,.pick,.none-choice{display:none}}'
    + '</style></head><body><h1>Word Sounds pictures: review sheet</h1>'
    + '<p>Pictures: Mulberry Symbols ' + esc(made.source.version) + ' by Steve Lee, CC BY-SA 4.0, mulberrysymbols.org' + (omv ? '; and, for words Mulberry has no symbol for, OpenMoji ' + esc(omv.version) + ', the open-source emoji and icon project, CC BY-SA 4.0, openmoji.org' : '') + '. This sheet loads nothing from the internet.</p>'
    + '<p><b>' + c.usableWords + '</b> usable words. <b>' + (c.auto + c.reviewed) + '</b> have a picture (' + c.usedBySet.mulberry + ' Mulberry, ' + c.usedBySet.openmoji + ' OpenMoji; ' + c.reviewed + ' chosen by a reviewer). '
    + '<b>' + c.ambiguous + '</b> are held until a person decides. ' + c.rejected + ' are rejected. '
    + 'A green dot <span class="rec">&#9679;</span> marks a word that has a recording: only those can be in a packet today, so they come first in each list.</p>'
    + '<p><b>How to decide.</b> For each held word, click "use this" under the right picture, or "none: reject". Leave a word alone (or click "not sure") to keep it held. The box at the bottom of the page fills with the lines to paste under <code>"words"</code> in <code>data/word_sounds_symbols_review_en.json</code>; then run <code>node dev-tools/build_word_sounds_symbols.cjs</code>. '
    + 'To take a used picture out, add <code>"word": {"status": "rejected"}</code> the same way. A decision on a word also holds for its plural and its verb forms.</p>'
    + '<nav><b>On this sheet</b><ul>' + heldSections.map((s) => '<li><a href="#' + s.id + '">Held: ' + esc(s.title) + ' (' + s.list.length + ')</a></li>').join('')
    + usedSections.map((s) => '<li><a href="#' + s.id + '">' + esc(s.title) + ' (' + s.list.length + ')</a></li>').join('') + '<li><a href="#rules">The matching rules and the OpenMoji exclusions</a></li></ul></nav>'
    + (doubt.length ? section('doubt', 'Doubtful: ' + doubt.length + ' the script author would check first', 'These are used now. Each one says why it is doubtful.',
      '<ol class="doubt">' + doubt.map((d) => { const e = byWord.get(d.word); return '<li><span class="dpic">' + (e.file ? img(e.file, 56) : '') + '</span><b>' + esc(d.word) + '</b>' + mark(d.word) + ' <code>' + esc(e.file || e.status) + '</code>: ' + esc(d.why) + '</li>'; }).join('') + '</ol>') : '')
    + heldSections.map((s) => section(s.id, 'Held: ' + s.title + ' (' + s.list.length + ')', 'Not used in any packet until someone decides. The candidates are side by side.', s.list.map(decideRow).join(''))).join('')
    + usedSections.map((s) => section(s.id, s.title + ' (' + s.list.length + ')', 'Circle any picture that is wrong for its word, and reject it in the review file.', grid(s.list))).join('')
    + (reviewed.length ? section('reviewed', 'Chosen by a reviewer (' + reviewed.length + ')', '', listRows(reviewed)) : '')
    + (rejected.length ? section('rejected', 'Rejected (' + rejected.length + ')', 'Never used.', listRows(rejected)) : '')
    + section('rules', 'The matching rules and the OpenMoji exclusions', 'How each word got its picture, and what OpenMoji pictures are never used.',
      '<table class="rules"><tr><td><b>auto</b></td><td>' + AUTO_KINDS.map(esc).join(', ') + ', and the name and plural rules of before</td></tr><tr><td><b>held</b></td><td>' + KINDS.filter((k) => AUTO_KINDS.indexOf(k) < 0).map(esc).join(', ') + ', and the held words of before</td></tr>'
      + Object.keys(OPENMOJI_EXCLUDED_SUBGROUPS).map((k) => '<tr><td><code>' + esc(k) + '</code></td><td>' + esc(OPENMOJI_EXCLUDED_SUBGROUPS[k]) + '</td></tr>').join('')
      + Object.keys(OPENMOJI_EXCLUDED_TAGS).map((k) => '<tr><td>' + esc(k) + '</td><td>any of: ' + esc(OPENMOJI_EXCLUDED_TAGS[k].join(', ')) + '</td></tr>').join('')
      + Object.keys(OPENMOJI_NOT_THE_WORD).map((k) => '<tr><td><code>' + esc(k) + '</code></td><td>' + esc(OPENMOJI_NOT_THE_WORD[k]) + '</td></tr>').join('') + '</table>'
      + (leftOut.length ? '<p>OpenMoji emoji named like a usable word and left out by these rules (' + leftOut.length + '):</p><div class="grid">' + leftOut.map((o) => '<figure><div class="pic">' + img(o.file) + '</div><figcaption><b>' + esc(o.word) + '</b><br>' + esc(o.why) + '</figcaption></figure>').join('') + '</div>' : ''))
    + '<div id="decide"><b>Your decisions</b> (<span id="out-count">0 decisions</span>): paste these lines under "words" in data/word_sounds_symbols_review_en.json (add a comma between blocks).<br><textarea id="out" readonly aria-label="Decision lines to paste"></textarea></div>'
    + '<script>' + script + '</script></body></html>\n';
}

function staleList(made) {
  const stale = [];
  if (made.missing.length) stale.push(made.missing.length + ' symbol files are not vendored (' + made.missing.slice(0, 5).join(', ') + '): run with --from / --openmoji-from <unzipped release>');
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
  if (made.openmoji) {
    const om = made.openmoji.source;
    const omDigest = symbolsDigest(OM_SYMBOL_DIR);
    if (!om.symbols || omDigest.sha256 !== om.symbols.sha256 || omDigest.count !== om.symbols.count || omDigest.bytes !== om.symbols.bytes) stale.push('data/vendor/openmoji/source.json (the symbols digest)');
    if (!made.openmoji.tableText) stale.push('data/vendor/openmoji/openmoji-names.json (missing: run with --openmoji-from <release>)');
    else {
      if (!om.table || sha256(made.openmoji.tableText) !== om.table.sha256) stale.push('data/vendor/openmoji/source.json (the names table digest)');
      if (fs.existsSync(OM_TABLE) && read(OM_TABLE) !== made.openmoji.tableText) stale.push('data/vendor/openmoji/openmoji-names.json');
    }
    const omExtra = (fs.existsSync(OM_SYMBOL_DIR) ? fs.readdirSync(OM_SYMBOL_DIR) : []).filter((f) => made.inPlay.indexOf(OM_PREFIX + f) < 0);
    if (omExtra.length) stale.push(omExtra.length + ' vendored OpenMoji files match no word (' + omExtra.slice(0, 5).join(', ') + ')');
  }
  return stale;
}

// Copies the files in play from a release folder into a vendor folder, drops the rest, returns the digest.
function vendorFiles(files, fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  files.forEach((file) => {
    const target = path.join(toDir, file);
    if (fs.existsSync(target)) return;
    const src = path.join(fromDir, file);
    if (!fs.existsSync(src)) throw new Error('Not in the release folder: ' + file);
    fs.copyFileSync(src, target);
    if (fs.statSync(target).size !== fs.statSync(src).size) throw new Error('Short copy: ' + file);
  });
  fs.readdirSync(toDir).filter((f) => files.indexOf(f) < 0).forEach((f) => fs.unlinkSync(path.join(toDir, f)));
  return symbolsDigest(toDir);
}

function main(argv) {
  const flag = (name) => argv.indexOf(name) >= 0;
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const from = value('--from');
  const openmojiFrom = value('--openmoji-from');
  const made = compute({ from, openmojiFrom });
  if (flag('--check')) {
    const stale = staleList(made);
    if (stale.length) { console.error('Word Sounds symbols are stale: ' + stale.join('; ')); process.exitCode = 1; return made; }
    console.log('Word Sounds symbols are current (' + made.counts.auto + ' auto, ' + made.counts.reviewed + ' reviewed, ' + made.counts.ambiguous + ' ambiguous, ' + made.counts.rejected + ' rejected; '
      + made.counts.packetWords + ' words in the page data: ' + made.counts.packetWordsBySet.mulberry + ' Mulberry, ' + made.counts.packetWordsBySet.openmoji + ' OpenMoji)');
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
    // Vendor exactly the Mulberry files in play; drop any that no longer are.
    const dir = path.join(path.resolve(from), fs.existsSync(path.join(path.resolve(from), 'EN-symbols')) ? 'EN-symbols' : '');
    const digest = vendorFiles(made.inPlay.filter((f) => !isOpenMoji(f)), dir, SYMBOL_DIR);
    const sourceFile = path.join(VENDOR, 'source.json');
    const source = JSON.parse(read(sourceFile));
    source.symbols = Object.assign({}, source.symbols, digest);
    const text = JSON.stringify(source, null, 2) + '\n';
    if (read(sourceFile) !== text) writeAtomic(sourceFile, text);
    made.source = source;
    console.log('Vendored ' + digest.count + ' Mulberry symbol files, ' + digest.bytes + ' bytes');
  }
  if (openmojiFrom && made.openmoji) {
    if (!made.openmoji.releaseDir) throw new Error('No OpenMoji SVG files (1F600.svg) in ' + path.resolve(openmojiFrom));
    const digest = vendorFiles(made.inPlay.filter(isOpenMoji).map((f) => f.slice(OM_PREFIX.length)), made.openmoji.releaseDir, OM_SYMBOL_DIR);
    if (!fs.existsSync(OM_TABLE) || read(OM_TABLE) !== made.openmoji.tableText) writeAtomic(OM_TABLE, made.openmoji.tableText);
    const sourceFile = path.join(OM_VENDOR, 'source.json');
    const source = JSON.parse(read(sourceFile));
    source.symbols = Object.assign({}, source.symbols, digest);
    source.table = Object.assign({}, source.table, { sha256: sha256(made.openmoji.tableText), bytes: Buffer.byteLength(made.openmoji.tableText), count: made.openmoji.table.count });
    const text = JSON.stringify(source, null, 2) + '\n';
    if (read(sourceFile) !== text) writeAtomic(sourceFile, text);
    made.openmoji.source = source;
    console.log('Vendored ' + digest.count + ' OpenMoji files, ' + digest.bytes + ' bytes');
  }
  const stillMissing = made.missing.filter((f) => (isOpenMoji(f) ? !openmojiFrom : !from));
  if (stillMissing.length) throw new Error(stillMissing.length + ' symbol files are not vendored (' + stillMissing.slice(0, 8).join(', ') + '): run with --from / --openmoji-from <unzipped release>');
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

module.exports = { parseCsv, nameParts, symbolRows, usableWords, singularsOf, inflections, matchWords, minifySvg, compute, dataFiles, loadSymbols, symbolsDigest, reviewSheet, reportText, staleList,
  openMojiRows, openMojiTable, openMojiExclusion, openMojiLeftOut, loadOpenMoji,
  STATUSES, SETS, KINDS, AUTO_KINDS, STAGE_ORDER, SKIP_CATEGORIES, NOT_PLURAL, CHILD_SENSE, HELD, REJECTED, IRREGULAR_PAST, FORM_HELD, OTHER_NAMES, SPELLING,
  OPENMOJI_EXCLUDED_SUBGROUPS, OPENMOJI_EXCLUDED_TAGS, OPENMOJI_NOT_THE_WORD, OPENMOJI_ALLOWED, OM_PREFIX,
  VENDOR, SYMBOL_DIR, OM_VENDOR, OM_SYMBOL_DIR, OM_TABLE, MAP_FILE, INDEX_FILE, REVIEW_FILE, SHARD_DIR, SHARD_MAX };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
