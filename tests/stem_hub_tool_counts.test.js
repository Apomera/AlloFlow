import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { indexOfOrThrow } from './helpers/anchored_slice.js';

// Numbers the STEM hub shows about a tool must come from that tool's own data.
// Two had drifted: the Mastery Atlas capped Bird Lab's life list at 15 while
// BIRDS holds 20 (a full list read "15 / 15" and five birds never counted),
// and the Raptor Hunt tile promised "8 species" in English and 57 languages
// while SPECIES holds 20.

const HOSTS = process.env.STEM_HUB_SOURCE ? [process.env.STEM_HUB_SOURCE] : [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
];
const BIRDLAB = process.env.BIRDLAB_SOURCE || 'stem_lab/stem_tool_birdlab.js';
const RAPTOR = process.env.RAPTORHUNT_SOURCE || 'stem_lab/stem_tool_raptorhunt.js';
const UI_STRINGS = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const LANG_DIR = process.env.STEM_HUB_LANG_DIR || 'lang';
const TILE_KEY = 'three_js_stoop_simulator_deep_science';

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

// Evaluate a data literal from a tool file, with its render helpers stubbed.
function literal(src, declaration, open, close) {
  const at = indexOfOrThrow(src, declaration);
  const text = extractBalanced(src, indexOfOrThrow(src, open, { from: at }), open, close);
  return runInNewContext('(' + text + ')', { h: () => null, __alloT: (k, f) => f });
}

// Module-scope BIRDS (two-space indent) is the I-Spy roster the life list fills;
// two deeper `var BIRDS` tables are local drawing profiles.
const birdCount = () => Object.keys(literal(readFileSync(BIRDLAB, 'utf8'), '\n  var BIRDS = {', '{', '}')).length;
const raptorSpecies = () => literal(readFileSync(RAPTOR, 'utf8'), 'var SPECIES = [', '[', ']').length;

function varFn(src, name) {
  const at = indexOfOrThrow(src, 'var ' + name + ' = function');
  const braceAt = indexOfOrThrow(src, '{', { from: at });
  return src.slice(at, braceAt) + extractBalanced(src, braceAt, '{', '}') + ';';
}

function atlasEntry(src, id) {
  const entriesAt = indexOfOrThrow(src, 'var _atlasEntries = [');
  const sandbox = { window: {}, localStorage: { getItem: () => null }, JSON, Object, Math, isFinite, Number, Array, t: () => null };
  runInNewContext([
    varFn(src, '_readSlot'), varFn(src, '_atlasCardCount'), varFn(src, '_atlasMapCount'),
    varFn(src, '_atlasClamp'), varFn(src, '_countPetsDecoderMastery'),
    'var _atlasEntries = ' + extractBalanced(src, indexOfOrThrow(src, '[', { from: entriesAt }), '[', ']') + ';',
    'this.entries = _atlasEntries;',
  ].join('\n'), sandbox);
  const entry = sandbox.entries.find((e) => e.id === id);
  expect(entry, 'no atlas entry ' + id).toBeTruthy();
  return { entry, sandbox };
}

// The English fallback the hub renders for the Raptor Hunt tile.
function raptorTileFallback(src) {
  const m = src.match(new RegExp("desc: t\\('stem\\.tools_menu\\." + TILE_KEY + "'\\) \\|\\| ('(?:[^'\\\\]|\\\\.)*')"));
  expect(m, 'Raptor Hunt tile description moved').toBeTruthy();
  return runInNewContext(m[1]);
}

// Native digits (Bengali, Devanagari, Thai, Myanmar, Persian...) read as ASCII.
const DIGIT_ZEROS = [0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0E50, 0x0ED0, 0x1040, 0x17E0];
function asciiDigits(s) {
  return s.replace(/[٠-٩۰-۹०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩]/g, (c) => {
    const cp = c.codePointAt(0);
    const zero = DIGIT_ZEROS.filter((z) => z <= cp).pop();
    return String(cp - zero);
  });
}
const hasNumber = (s, n) => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(asciiDigits(s));
// Packs that spell the number as a word instead of digits.
const NUMBER_WORDS = { latin: { 20: 'Viginti' } };

describe('Bird Lab life list in the Mastery Atlas', () => {
  it.each(HOSTS)('%s counts against every bird in BIRDS', (host) => {
    const total = birdCount();
    const { entry, sandbox } = atlasEntry(readFileSync(host, 'utf8'), 'birdLab');
    expect(entry.total, 'atlas total vs BIRDS').toBe(total);
    // A complete life list must read N / N, not stop short at a stale cap.
    const full = {};
    for (let i = 0; i < 500; i++) full['bird' + i] = { firstSeen: '2026-01-01' };
    sandbox.window[entry.slot] = { lifeList: full };
    expect(entry.count(), 'clamp vs BIRDS').toBe(total);
  });
});

describe('Raptor Hunt tile species count', () => {
  it.each(HOSTS)('%s English fallback names the real roster size', (host) => {
    const desc = raptorTileFallback(readFileSync(host, 'utf8'));
    const n = raptorSpecies();
    expect(hasNumber(desc, n) && desc.includes(n + ' species'), 'tile says: ' + desc).toBe(true);
  });

  it('ui_strings English matches the hub fallback in both copies', () => {
    const fallback = raptorTileFallback(readFileSync(HOSTS[0], 'utf8'));
    for (const file of UI_STRINGS) {
      const raw = readFileSync(file, 'utf8');
      // ui_strings.js is plain JSON; parsing it whole fails loudly if that changes.
      const ui = JSON.parse(raw);
      expect(ui.stem.tools_menu[TILE_KEY], file).toBe(fallback);
    }
  }, 60000);

  it('every translated pack carries the same species count', () => {
    const n = raptorSpecies();
    const wrong = [];
    let checked = 0;
    for (const file of readdirSync(LANG_DIR).filter((f) => f.endsWith('.js'))) {
      const text = readFileSync(LANG_DIR + '/' + file, 'utf8');
      const m = text.match(new RegExp('"' + TILE_KEY + '":\\s*("(?:[^"\\\\]|\\\\.)*")'));
      if (!m) continue;
      checked++;
      const value = JSON.parse(m[1]);
      const lang = file.replace(/\.js$/, '');
      const word = NUMBER_WORDS[lang] && NUMBER_WORDS[lang][n];
      if (!(word ? value.includes(word) : hasNumber(value, n))) wrong.push(lang);
    }
    expect(checked, 'no pack translates the tile').toBeGreaterThan(0);
    expect(wrong, 'packs whose tile states another species count').toEqual([]);
  }, 60000);
});
