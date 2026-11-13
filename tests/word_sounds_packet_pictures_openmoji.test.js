// @vitest-environment jsdom
// Pictures in Word Sounds packets, second pass (2026-11-12): smarter Mulberry matching (verb forms, joined names,
// spellings, and kinds only a person may accept) and OpenMoji as a second open set, used only where Mulberry has
// nothing. The first pass (Mulberry by name and plural, the builder's pictures option, the player's rule) is
// tests/word_sounds_packet_pictures.test.js.
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
const parts = tool.loadParts();
const { dictionary, core, loader, wordlist, builder } = parts;
const read = (file) => readFileSync(file, 'utf8');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const OM = JSON.parse(read('data/vendor/openmoji/source.json'));
const MAP = JSON.parse(read('data/word_sounds_symbols_map_en.json'));
const TABLE = JSON.parse(read('data/vendor/openmoji/openmoji-names.json'));
const OM_ROWS = symbolsTool.openMojiRows(TABLE);
const MUL_ROWS = symbolsTool.symbolRows(read('data/vendor/mulberry/symbol-info.csv'));
const symbols = symbolsTool.loadSymbols();
const made = symbolsTool.compute({ parts });
const entry = (word) => MAP.words.find((e) => e.word === word);
const isOm = (file) => String(file).indexOf(symbolsTool.OM_PREFIX) === 0;
const omPath = (file) => 'data/vendor/openmoji/symbols/' + file.slice(symbolsTool.OM_PREFIX.length);

const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const bank = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: bank('words'), phonemes: bank('phonemes'), isolation: bank('isolation'), instructions: bank('instructions') };
const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log', 'hen', 'net', 'lip', 'bug', 'rug'];
const build = (over = {}) => builder.buildPacket({ activities: ['isolation'], title: 'Pictures', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: KNOWN,
  createdAt: '2026-11-12T00:00:00.000Z', pictures: true, symbols, ...over });
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const svgOfUri = (uri) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64').toString('utf8');
const MULBERRY_LINE = 'Pictures: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org';
const OM_LINE = (words) => 'Pictures for ' + words.join(', ') + ': designed by OpenMoji - the open-source emoji and icon project. License: CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), openmoji.org';
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

describe('OpenMoji, the second set: where it came from and what is kept', () => {
  it('source.json names one pinned release, its license and the credit it asks for', () => {
    expect(OM).toMatchObject({ id: 'openmoji', name: 'OpenMoji', version: '17.0.0', homepage: 'https://openmoji.org', repository: 'https://github.com/hfg-gmuend/openmoji',
      licenseShort: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', retrieved: '2026-11-12' });
    expect(OM.license).toBe('Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)');
    expect(OM.url).toBe('https://github.com/hfg-gmuend/openmoji/releases/download/17.0.0/openmoji-svg-color.zip');
    expect(OM.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(OM.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(OM.data.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(OM.attributionSuggested).toBe('All emojis designed by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0');
    expect(OM.attribution).toBe('Emoji pictures designed by OpenMoji - the open-source emoji and icon project. License: CC BY-SA 4.0');
    for (const field of ['licenseEvidence', 'matching', 'exclusions', 'changes', 'remake', 'scope', 'shareAlike', 'limitations']) expect(OM[field].length, field).toBeGreaterThan(80);
    // The license text, unchanged, by hash.
    const license = readFileSync('data/vendor/openmoji/LICENSE.txt');
    expect(sha256(license)).toBe(OM.licenseFiles['LICENSE.txt'].sha256);
    expect(license.toString('utf8')).toMatch(/^Attribution-ShareAlike 4\.0 International/);
  });

  it('the names table is the one recorded, holds only one-word names without a skin tone, and the vendored files are exactly the ones in play', () => {
    expect(sha256(read('data/vendor/openmoji/openmoji-names.json'))).toBe(OM.table.sha256);
    expect(TABLE.source.sha256).toBe(OM.data.sha256);
    expect(TABLE.rows.length).toBe(OM.table.count);
    for (const row of OM_ROWS) expect(row.label, row.hex).toMatch(/^[a-z]+$/);
    // No skin-tone variant: the release marks them with a skin tone code in the hexcode.
    expect(OM_ROWS.filter((row) => /-1F3F[B-F]/.test(row.hex))).toEqual([]);
    const digest = symbolsTool.symbolsDigest('data/vendor/openmoji/symbols');
    expect(digest).toEqual({ count: OM.symbols.count, bytes: OM.symbols.bytes, sha256: OM.symbols.sha256 });
    const vendored = readdirSync('data/vendor/openmoji/symbols').sort();
    const named = new Set(MAP.words.flatMap((e) => [e.file, ...(e.candidates || [])]).filter(isOm).map((f) => f.slice(symbolsTool.OM_PREFIX.length)));
    expect(vendored.filter((name) => !named.has(name))).toEqual([]);
    expect([...named].filter((name) => !vendored.includes(name))).toEqual([]);
    // They are build inputs, kept out of the site upload as the Mulberry ones are.
    const ignore = read('.assetsignore').split(/\r?\n/);
    expect(ignore).toContain('data/vendor/mulberry/symbols/');
    expect(ignore).toContain('data/vendor/openmoji/symbols/');
  });
});

describe('OpenMoji only where Mulberry has nothing', () => {
  const mulberryNames = new Set();
  for (const s of MUL_ROWS) {
    if (s.rated || symbolsTool.SKIP_CATEGORIES.includes(s.category)) continue;
    mulberryNames.add(s.label);
    if (!s.single && !s.qualifier) mulberryNames.add(s.head.replace(/_/g, '').toLowerCase());
  }
  it('a word shows an OpenMoji picture only when no Mulberry symbol has its name or its singular\'s, and only by the emoji\'s own name', () => {
    const om = MAP.words.filter((e) => e.set === 'openmoji');
    expect(om.length).toBeGreaterThan(100);
    for (const e of om) {
      expect(e.kind, e.word).toBe('openmoji');
      expect(['auto', 'reviewed'], e.word).toContain(e.status);
      const single = (/^plural of (\w+)/.exec(e.note) || [])[1];
      expect(mulberryNames.has(e.word), e.word).toBe(false);
      if (single) { expect(mulberryNames.has(single), e.word).toBe(false); expect(symbolsTool.singularsOf(e.word), e.word).toContain(single); }
      // Matched by its name, never by a keyword.
      const row = OM_ROWS.find((r) => r.file === e.file);
      expect(row.label, e.word).toBe(single || e.word);
      expect(symbolsTool.openMojiExclusion(row, e.word), e.word).toBe('');
    }
    // A word with a used Mulberry picture never shows an OpenMoji one, and a word Mulberry holds is never given one on its own.
    for (const e of MAP.words) if (e.set === 'mulberry') expect(isOm(e.file), e.word).toBe(false);
    for (const e of MAP.words.filter((x) => !x.kind && (x.candidates || []).some(isOm))) expect(['ambiguous', 'rejected', 'reviewed'], e.word).toContain(e.status);
    // The owner's examples: pig, bed, ship have no Mulberry symbol; watch and chicken are Mulberry words held for a person.
    expect(entry('pig')).toMatchObject({ set: 'openmoji', status: 'auto', file: 'openmoji/1F416.svg' });
    expect(entry('pigs')).toMatchObject({ set: 'openmoji', status: 'auto', file: 'openmoji/1F416.svg' });
    expect(entry('pigs').note).toMatch(/^plural of pig: the picture shows one/);
    expect(entry('ship')).toMatchObject({ set: 'openmoji', status: 'auto' });
    expect(entry('chicken')).toMatchObject({ file: '', status: 'ambiguous', candidates: ['chicken.svg', 'openmoji/1F414.svg'] });
    expect(entry('watch')).toMatchObject({ file: '', status: 'ambiguous' });
    expect(entry('cat')).toMatchObject({ set: 'mulberry', file: 'cat.svg' });
    // The index says each picture's set.
    expect(symbols.get('pig')).toMatchObject({ file: 'openmoji/1F416.svg', set: 'openmoji', label: 'pig' });
    expect(symbols.get('cat')).toMatchObject({ file: 'cat.svg', set: 'mulberry', label: 'cat' });
    expect(symbols.set('pig')).toBe('openmoji');
    expect(symbols.credits.openmoji).toEqual({ set: 'OpenMoji', author: OM.author, license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', url: 'https://openmoji.org', version: '17.0.0' });
    expect(symbols.credits.mulberry).toBe(symbols.credit);
    expect(symbols.notices.openmoji).toContain(OM.attribution);
    // Each data file holds one set, and says which.
    for (const shard of symbols.shards) {
      const data = JSON.parse(read(shard.url));
      expect(data.set, shard.url).toBe(shard.set);
      for (const file of Object.keys(data.symbols)) expect(isOm(file), shard.url + ' ' + file).toBe(shard.set === 'openmoji');
    }
  });

  it('with matchWords: an emoji fills a gap, never a Mulberry name; several of one name wait unless one is in Unicode', () => {
    const rows = symbolsTool.symbolRows('symbol-id,category-id,grammar,rated,tags,symbol-en,category-en,symbol-fr,category-fr\n'
      + '1,1,Noun,0,,cat,Animal Mammal,,\n2,1,Noun,0,,watch,Clothes Jewellery,,\n3,1,Verb,0,,"watch_,_to",Verb,,\n');
    const om = (hex, name, group, subgroup, unicode = 1, tags = '') => [hex, name, group, subgroup, unicode, tags, '', 'someone'];
    const table = { columns: ['hexcode', 'annotation', 'group', 'subgroups', 'unicode', 'tags', 'openmoji_tags', 'openmoji_author'], rows: [
      om('1F408', 'cat', 'animals-nature', 'animal-mammal'), om('1F416', 'pig', 'animals-nature', 'animal-mammal'), om('231A', 'watch', 'travel-places', 'time'),
      om('1F6D7', 'elevator', 'objects', 'household'), om('E204', 'elevator', 'extras-openmoji', 'travel-places', 0), om('AAAA', 'kite', 'activities', 'game'),
      om('BBBB', 'kite', 'activities', 'game'), om('1F37A', 'beer', 'food-drink', 'drink', 1, 'bar, beer, drink, mug'), om('E1D2', 'drone', 'extras-openmoji', 'technology', 0)] };
    const words = ['cat', 'pig', 'pigs', 'watch', 'elevator', 'kite', 'beer', 'drone'].map((word) => ({ word }));
    const match = (review) => Object.fromEntries(symbolsTool.matchWords({ rows, openmoji: symbolsTool.openMojiRows(table), words, isWord: () => true, review }).map((e) => [e.word, e]));
    const got = match(null);
    expect(got.cat).toMatchObject({ file: 'cat.svg', status: 'auto' });
    expect(got.cat.kind).toBeUndefined();
    expect(got.pig).toMatchObject({ file: 'openmoji/1F416.svg', status: 'auto', kind: 'openmoji' });
    expect(got.pigs).toMatchObject({ file: 'openmoji/1F416.svg', status: 'auto', kind: 'openmoji' });
    expect(got.watch).toMatchObject({ file: '', status: 'ambiguous', candidates: ['watch.svg', 'watch_,_to.svg', 'openmoji/231A.svg'] });
    expect(got.elevator).toMatchObject({ file: 'openmoji/1F6D7.svg', status: 'auto', candidates: ['openmoji/1F6D7.svg', 'openmoji/E204.svg'] });
    expect(got.kite).toMatchObject({ file: '', status: 'ambiguous', kind: 'openmoji', candidates: ['openmoji/AAAA.svg', 'openmoji/BBBB.svg'] });
    expect(got.beer).toBeUndefined();
    expect(got.drone).toBeUndefined();
    // A person may choose the emoji for a word Mulberry holds; a refused file can never be chosen.
    expect(match({ watch: { status: 'reviewed', file: 'openmoji/231A.svg' } }).watch).toMatchObject({ file: 'openmoji/231A.svg', status: 'reviewed' });
    expect(() => match({ pig: { status: 'reviewed', file: 'openmoji/231A.svg' } })).toThrow('which is not one of its symbols');
  });
});

describe('what OpenMoji pictures are never used', () => {
  const row = (name, group, subgroup, tags = '') => ({ om: true, label: name, name, group, subgroup, tags, openmojiTags: '', file: 'openmoji/X.svg' });
  it('each written rule excludes what it says, and a plain picture passes', () => {
    const BAD = [
      [row('flag', 'flags', 'flag'), 'pirate', 'a flag'], [row('chad', 'flags', 'country-flag'), 'chad', 'a flag'], [row('beer', 'food-drink', 'drink', 'bar, beer'), 'beer', 'alcohol'],
      [row('cigarette', 'objects', 'other-object', 'smoking'), 'cigarette', 'tobacco'], [row('pistol', 'activities', 'game', 'gun, weapon'), 'pistol', 'weapons'],
      [row('dagger', 'objects', 'tool', 'knife, weapon'), 'dagger', 'weapons'], [row('axe', 'objects', 'tool', 'chop, hatchet'), 'axe', 'weapons'],
      [row('coffin', 'objects', 'other-object', 'death, vampire'), 'coffin', 'violence'], [row('church', 'travel-places', 'place-religious'), 'church', 'religious'],
      [row('menorah', 'symbols', 'religion'), 'menorah', 'religious'], [row('tree', 'activities', 'event', 'christmas'), 'tree', 'religion'],
      [row('ballot', 'objects', 'office', 'vote, ballot'), 'ballot', 'politics'], [row('pride', 'extras-openmoji', 'queer-symbols'), 'pride', 'movement'],
      [row('fist', 'people-body', 'hand-fingers-closed'), 'fist', 'gesture'], [row('ogre', 'smileys-emotion', 'face-costume'), 'ogre', 'costume'],
      [row('vampire', 'people-body', 'person-fantasy'), 'vampire', 'fantasy'], [row('kiss', 'people-body', 'family'), 'kiss', 'kiss'],
      [row('pill', 'objects', 'medical'), 'pill', 'medicine'], [row('github', 'extras-openmoji', 'brand'), 'github', 'logo'], [row('copy', 'extras-openmoji', 'ui-element'), 'copy', 'screen icon'],
      [row('slot', 'activities', 'game', 'gambling'), 'slot', 'gambling'], [row('bikini', 'objects', 'clothing', 'bikini, swim'), 'bikini', 'underwear'],
      [row('poo', 'smileys-emotion', 'face-costume', 'poo'), 'poo', 'costume'], [row('mate', 'food-drink', 'drink'), 'mate', 'drink mate'], [row('led', 'extras-openmoji', 'technology'), 'led', 'LED'],
    ];
    for (const [r, word, why] of BAD) expect(symbolsTool.openMojiExclusion(r, word), word).toContain(why);
    for (const r of [row('pig', 'animals-nature', 'animal-mammal', 'farm, pork'), row('candy', 'food-drink', 'food-sweet', 'dessert, halloween'), row('hospital', 'travel-places', 'place-building', 'doctor, medicine'),
      row('handshake', 'people-body', 'hands'), row('robot', 'smileys-emotion', 'face-costume', 'monster'), row('mermaid', 'people-body', 'person-fantasy')]) expect(symbolsTool.openMojiExclusion(r, r.label), r.label).toBe('');
    // "flag" itself may show a flag.
    expect(symbolsTool.openMojiExclusion(row('flag', 'flags', 'flag'), 'flag')).toBe('');
  });

  it('on the real table: the emoji found unsuitable are left out, every used one passes, and the review sheet lists the rules', () => {
    const byName = (name) => OM_ROWS.filter((r) => r.label === name);
    for (const name of ['kiss', 'pill', 'vampire', 'ogre', 'goblin', 'axe', 'shield', 'mate', 'led', 'sake', 'lighter', 'wedding', 'town', 'pride', 'opera']) {
      const list = byName(name);
      expect(list.length, name).toBeGreaterThan(0);
      for (const r of list) expect(symbolsTool.openMojiExclusion(r, name), name).not.toBe('');
      expect(entry(name) && isOm(entry(name).file), name).toBeFalsy();
    }
    for (const e of MAP.words) for (const file of [e.file, ...(e.candidates || [])].filter(isOm)) {
      const r = OM_ROWS.find((x) => x.file === file);
      expect(r, file).toBeTruthy();
      expect(symbolsTool.openMojiExclusion(r, e.word), e.word + ' ' + file).toBe('');
      // A gendered variant only when its own name is the word (mermaid).
      if (r.gendered) expect([e.word, ...symbolsTool.singularsOf(e.word)], file).toContain(r.label);
    }
    const sheet = symbolsTool.reviewSheet(made, []);
    for (const key of Object.keys(symbolsTool.OPENMOJI_EXCLUDED_SUBGROUPS)) expect(sheet, key).toContain(key);
    for (const reason of Object.keys(symbolsTool.OPENMOJI_EXCLUDED_TAGS)) expect(sheet, reason).toContain(reason);
  });
});

describe('the new Mulberry rules: auto only by a stated rule, everything else waits for a person', () => {
  const rows = symbolsTool.symbolRows('symbol-id,category-id,grammar,rated,tags,symbol-en,category-en,symbol-fr,category-fr\n'
    + '1,1,Verb,0,,"jump_,_to",Verb,,\n2,1,Verb,0,,"hop_,_to",Verb,,\n3,1,Verb,0,,"hope_,_to",Verb,,\n4,1,Verb,0,,"build_,_to",Verb,,\n5,1,Verb,0,,"run_,_to",Verb,,\n'
    + '6,1,Verb,0,,"smoke_,_to",Verb,,\n7,1,Verb,0,,"park_,_to",Verb,,\n8,1,Noun,0,,arm_chair,Building Furniture,,\n9,1,Noun,0,,tall,People Descriptive,,\n'
    + '10,1,Noun,0,,happy_lady,People Feelings,,\n11,1,Noun,0,,happy_man,People Feelings,,\n12,1,Verb,0,,"kick_ball_,_to",Verb,,\n13,1,Noun,0,,lorry,Transport Road,,\n'
    + '14,1,Noun,0,,colour,Art Colour,,\n15,1,Noun,0,,potato,Food Vegetables and salads,,\n16,1,Noun,0,,fish,Animal Fish and Marine mammals,,\n17,1,Verb,0,,"fish_,_to",Verb,,\n');
  const words = ['jumping', 'jumped', 'jumps', 'hopping', 'hopped', 'hoped', 'building', 'built', 'ran', 'smoking', 'parked', 'armchair', 'taller', 'tallest', 'happy', 'kick',
    'truck', 'color', 'potatoes', 'fishing'].map((word) => ({ word }));
  const match = (review) => Object.fromEntries(symbolsTool.matchWords({ rows, words, isWord: () => true, review }).map((e) => [e.word, e]));
  it('verb forms, joined names, spellings and -oes plurals are used; -s forms, comparatives, faces, objects and other names are held', () => {
    const got = match(null);
    const used = (word, file, kind) => expect(got[word], word).toMatchObject({ file, status: 'auto', ...(kind ? { kind } : {}) });
    used('jumping', 'jump_,_to.svg', 'verb form'); used('jumped', 'jump_,_to.svg', 'verb form');
    used('hopping', 'hop_,_to.svg', 'verb form'); used('hopped', 'hop_,_to.svg', 'verb form');
    // "hoped" is "to hope", not "to hop": the spelling rules say which.
    used('hoped', 'hope_,_to.svg', 'verb form');
    used('built', 'build_,_to.svg', 'verb form'); used('ran', 'run_,_to.svg', 'verb form');
    // The ending makes it the action: fishing takes "to fish", whatever fish itself shows.
    used('fishing', 'fish_,_to.svg', 'verb form');
    used('armchair', 'arm_chair.svg', 'joined'); used('color', 'colour.svg', 'spelling'); used('potatoes', 'potato.svg');
    const held = (word, kind) => expect(got[word], word).toMatchObject({ file: '', status: 'ambiguous', kind });
    held('building', 'verb form'); held('jumps', 's form'); held('taller', 'adjective form'); held('tallest', 'adjective form');
    held('happy', 'feeling faces'); held('kick', 'action with an object'); held('truck', 'other name'); held('parked', 'verb form');
    expect(got.happy.candidates).toEqual(['happy_lady.svg', 'happy_man.svg']);
    expect(got.building.note).toContain('also a building');
    expect(got.parked.note).toContain('the base word is held');
    // A rejected base rejects its forms.
    expect(got.smoking).toMatchObject({ file: '', status: 'rejected' });
    // A person's decisions: one on a held form, one on a base that its forms follow.
    const reviewed = match({ jumps: { status: 'reviewed', file: 'jump_,_to.svg' }, jumping: { status: 'rejected' }, happy: { status: 'reviewed', file: 'happy_man.svg' } });
    expect(reviewed.jumps).toMatchObject({ file: 'jump_,_to.svg', status: 'reviewed', kind: 's form' });
    expect(reviewed.jumping).toMatchObject({ file: '', status: 'rejected' });
    expect(reviewed.happy).toMatchObject({ file: 'happy_man.svg', status: 'reviewed' });
  });

  it('the spelling rules make the forms a reader expects', () => {
    expect(symbolsTool.inflections('jump')).toEqual({ s: ['jumps'], ing: ['jumping'], ed: ['jumped'], er: ['jumper'], est: ['jumpest'] });
    expect(symbolsTool.inflections('hop')).toMatchObject({ ing: ['hopping'], ed: ['hopped'] });
    expect(symbolsTool.inflections('hope')).toMatchObject({ ing: ['hoping'], ed: ['hoped'] });
    expect(symbolsTool.inflections('carry')).toMatchObject({ s: ['carries'], ing: ['carrying'], ed: ['carried'] });
    expect(symbolsTool.inflections('tie')).toMatchObject({ ing: ['tying'], ed: ['tied'] });
    expect(symbolsTool.inflections('see')).toMatchObject({ ing: ['seeing'] });
    expect(symbolsTool.inflections('visit')).toMatchObject({ ing: ['visiting'], ed: ['visited'] });
    expect(symbolsTool.inflections('fix')).toMatchObject({ s: ['fixes'], ing: ['fixing'] });
    expect(symbolsTool.inflections('big')).toMatchObject({ er: ['bigger'], est: ['biggest'] });
    expect(symbolsTool.singularsOf('potatoes')).toContain('potato');
    expect(symbolsTool.singularsOf('does')).toEqual([]);
  });

  it('on the real map: every used new kind is one of the stated auto kinds, and its picture is the base word\'s', () => {
    for (const e of MAP.words) {
      if (!e.kind) continue;
      expect(symbolsTool.KINDS, e.word).toContain(e.kind);
      if (e.status === 'auto') expect(symbolsTool.AUTO_KINDS, e.word).toContain(e.kind);
      if (e.kind === 'verb form' && e.status === 'auto') {
        const symbol = MUL_ROWS.find((s) => s.file === e.file);
        expect(symbol.verb || /^Verb/.test(symbol.grammar), e.word).toBe(true);
        expect(symbolsTool.FORM_HELD[e.word], e.word).toBeUndefined();
        const base = symbol.label;
        const forms = symbolsTool.inflections(base);
        expect([...forms.ing, ...forms.ed, ...(symbolsTool.IRREGULAR_PAST[base] || [])], e.word).toContain(e.word);
        expect(symbolsTool.HELD[base] || symbolsTool.REJECTED[base], e.word).toBeUndefined();
      }
    }
    expect(entry('jumping')).toMatchObject({ set: 'mulberry', file: 'jump_,_to.svg', status: 'auto', kind: 'verb form' });
    expect(entry('ran')).toMatchObject({ file: 'run_,_to.svg', status: 'auto', kind: 'verb form' });
    expect(entry('building')).toMatchObject({ file: '', status: 'ambiguous', kind: 'verb form' });
    expect(entry('smoking')).toMatchObject({ file: '', status: 'rejected' });
    expect(entry('happy')).toMatchObject({ status: 'ambiguous', kind: 'feeling faces' });
    for (const word of ['jumps', 'runs']) expect(entry(word), word).toMatchObject({ status: 'ambiguous', kind: 's form' });
  });
});

describe('credits name each set a file actually uses', () => {
  // What the index handed the builder before OpenMoji existed: { file, svg, label }, no set, no credits.
  const legacy = { credit: symbols.credit, has: (w) => symbols.has(w) && symbols.set(w) === 'mulberry', get: (w) => { const g = symbols.has(w) && symbols.set(w) === 'mulberry' ? symbols.get(w) : null; return g ? { file: g.file, svg: g.svg, label: g.label } : null; } };

  it('Mulberry only: the file is byte for byte what the Mulberry-only index makes, with the one credit and notice of before', async () => {
    for (const activities of [['isolation'], builder.SUPPORTED_ACTIVITIES]) {
      const words = ['cat', 'dog', 'sun', 'pen', 'top', 'jumping'];
      const now = await build({ words, activities });
      const before = await build({ words, activities, symbols: legacy });
      expect(now.html === before.html, activities.join()).toBe(true);
      expect(now.manifest).toEqual(before.manifest);
      const m = manifestOf(now.html);
      expect(m.attributions[m.attributions.length - 1]).toBe(MULBERRY_LINE);
      expect(m.attributions.join('\n')).not.toContain('OpenMoji');
      expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'mulberry']);
      expect(m.notices[1].text).toBe(builder.MULBERRY_NOTICE);
      expect(m.pictures).toEqual({ set: 'Mulberry Symbols', version: '3.6.1', license: 'CC BY-SA 4.0', wordsWithPicture: 6, wordsWithoutPicture: 0 });
      expect(now.manifest.pictures).not.toHaveProperty('openmoji');
    }
    // The credit and the notice are still the literal sentences of 2026-11-11.
    expect(builder.pictureCredit()).toBe(MULBERRY_LINE);
    expect(builder.mulberryNotice()).toBe(builder.MULBERRY_NOTICE);
  });

  it('OpenMoji only: its credit and its CC BY-SA notice, and no word of Mulberry', async () => {
    const on = await build({ words: ['pig', 'bed', 'ship'] });
    const m = manifestOf(on.html);
    expect(m.attributions[m.attributions.length - 1]).toBe(OM_LINE(['pig', 'bed', 'ship']));
    expect(JSON.stringify(m.attributions) + JSON.stringify(m.notices)).not.toContain('Mulberry');
    expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'openmoji']);
    expect(m.notices[1]).toEqual({ id: 'openmoji', name: 'OpenMoji', text: builder.openMojiNotice(['pig', 'bed', 'ship'], '17.0.0') });
    expect(m.notices[1].text).toContain('Creative Commons Attribution-ShareAlike 4.0 International License');
    expect(m.notices[1].text).toContain('share changed pictures under the same license');
    expect(m.pictures).toEqual({ wordsWithPicture: 3, wordsWithoutPicture: 0, openmoji: { set: 'OpenMoji', version: '17.0.0', license: 'CC BY-SA 4.0', words: 3 } });
    expect(on.manifest.pictures).toMatchObject({ files: { pig: 'openmoji/1F416.svg', bed: 'openmoji/1F6CF.svg' }, openmoji: { set: 'OpenMoji', version: '17.0.0', words: ['pig', 'bed', 'ship'] }, counts: { withPicture: 3, openmoji: 3 } });
    const images = Object.values(lessonOf(on.html).images).map(svgOfUri).sort();
    expect(images).toEqual(['pig', 'bed', 'ship'].map((w) => symbols.get(w).svg).sort());
  });

  it('both sets: each credit names its own words, each notice is carried once, and the file still reaches nothing', async () => {
    const on = await build({ words: ['cat', 'pig', 'sun', 'bed'] });
    const m = manifestOf(on.html);
    expect(m.attributions.slice(-2)).toEqual(['Pictures for cat, sun: Mulberry Symbols by Steve Lee, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), mulberrysymbols.org', OM_LINE(['pig', 'bed'])]);
    expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'mulberry', 'openmoji']);
    expect(m.notices[1].text).toBe(builder.mulberryNotice(['cat', 'sun']));
    expect(m.notices[1].text).toContain('The pictures in this file for cat, sun are from that set');
    expect(m.pictures).toMatchObject({ set: 'Mulberry Symbols', wordsWithPicture: 4, openmoji: { words: 2 } });
    expect(on.html).not.toMatch(/https?:\/\//);
    expect(on.html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video|svg)\b/i);
    // "About this file", word for word.
    const dom = new JSDOM(on.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) { w.Audio = class { play() { return Promise.resolve(); } pause() {} }; } });
    opened.push(dom.window);
    dom.window.document.querySelector('[data-about-open]').click();
    const about = dom.window.document.getElementById('about-panel').textContent;
    expect(about).toContain('Pictures for cat, sun: Mulberry Symbols by Steve Lee');
    expect(about).toContain(OM_LINE(['pig', 'bed']));
  });
});

describe('the build and the review sheet', () => {
  it('--check passes on the repo, and fails when an OpenMoji input is out of date', () => {
    const run = spawnSync(process.execPath, ['dev-tools/build_word_sounds_symbols.cjs', '--check'], { encoding: 'utf8', timeout: 120000 });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toMatch(/^Word Sounds symbols are current \(\d+ auto, \d+ reviewed, \d+ ambiguous, \d+ rejected; \d+ words in the page data: \d+ Mulberry, \d+ OpenMoji\)/);
    expect(symbolsTool.staleList(made), symbolsTool.staleList(made).join('; ')).toEqual([]);
    const om = made.openmoji;
    expect(symbolsTool.staleList({ ...made, openmoji: { ...om, source: { ...om.source, symbols: { ...om.source.symbols, sha256: 'x' } } } })).toEqual(['data/vendor/openmoji/source.json (the symbols digest)']);
    expect(symbolsTool.staleList({ ...made, openmoji: { ...om, source: { ...om.source, table: { ...om.source.table, sha256: 'x' } } } })).toEqual(['data/vendor/openmoji/source.json (the names table digest)']);
    expect(symbolsTool.staleList({ ...made, inPlay: made.inPlay.filter((f) => f !== 'openmoji/1F416.svg') })).toEqual(['1 vendored OpenMoji files match no word (1F416.svg)']);
    expect(symbolsTool.staleList({ ...made, missing: ['openmoji/FFFF.svg'] })[0]).toMatch(/^1 symbol files are not vendored/);
  });

  it('the data files stay about 1 MB each and the index stays small', () => {
    const total = symbols.shards.reduce((n, s) => n + s.bytes, 0);
    expect(total).toBe(symbols.bytes);
    expect(total).toBeLessThan(8000000);
    for (const shard of symbols.shards) expect(shard.bytes, shard.url).toBeLessThan(1200000);
    expect(Buffer.byteLength(read('word_sounds_symbols_en.js'))).toBeLessThan(40000);
    expect(MAP.counts.packetWordsBySet.mulberry + MAP.counts.packetWordsBySet.openmoji).toBe(MAP.counts.packetWords);
    for (const id of symbolsTool.STAGE_ORDER) expect(MAP.counts.byStage[id], id).toBeTruthy();
  });

  it('the review sheet loads nothing, groups the held words by kind, and its buttons write lines the review file takes', () => {
    const html = symbolsTool.reviewSheet(made, []);
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i);
    expect(html).not.toMatch(/https?:\/\//);
    const policy = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    expect(policy).toMatch(/^default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'sha256-[A-Za-z0-9+/=]+'$/);
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
    expect(policy).toContain("'sha256-" + createHash('sha256').update(script).digest('base64') + "'");
    for (const title of ['The -s form of an action', 'Feelings drawn as a lady', 'Actions drawn only with an object', 'The same thing by another name', 'Mulberry holds the word; OpenMoji',
      'Used now, new: verb forms', 'Used now, new: OpenMoji']) expect(html, title).toContain(title);
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    opened.push(dom.window);
    const d = dom.window.document;
    const pick = (word, value) => { const input = [...d.querySelectorAll('.row[data-word="' + word + '"] input')].find((i) => i.value === value); input.checked = true; input.dispatchEvent(new dom.window.Event('change', { bubbles: true })); };
    pick('happy', 'happy_lady.svg');
    pick('jumps', 'jump_,_to.svg');
    pick('chicken', 'openmoji/1F414.svg');
    pick('kick', '');
    const lines = d.getElementById('out').value;
    const decisions = JSON.parse('{' + lines + '}');
    expect(decisions).toEqual({ happy: { status: 'reviewed', file: 'happy_lady.svg' }, jumps: { status: 'reviewed', file: 'jump_,_to.svg' }, chicken: { status: 'reviewed', file: 'openmoji/1F414.svg' }, kick: { status: 'rejected' } });
    // Fed back as the review file, they decide those words.
    const again = symbolsTool.compute({ parts, review: decisions });
    const byWord = new Map(again.entries.map((e) => [e.word, e]));
    expect(byWord.get('happy')).toMatchObject({ set: 'mulberry', file: 'happy_lady.svg', status: 'reviewed' });
    expect(byWord.get('chicken')).toMatchObject({ set: 'openmoji', file: 'openmoji/1F414.svg', status: 'reviewed' });
    expect(byWord.get('chickens')).toMatchObject({ file: 'openmoji/1F414.svg', status: 'reviewed' });
    expect(byWord.get('kick')).toMatchObject({ file: '', status: 'rejected' });
  });
});
