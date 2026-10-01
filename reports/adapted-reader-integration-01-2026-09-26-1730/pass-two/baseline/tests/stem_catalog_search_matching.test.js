import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// The hub's tool search used to be a single indexOf of the whole query against
// the haystack, so a multi-word search only hit when the words happened to sit
// adjacent and in that order: "water cycle" found Water Cycle Explorer,
// "water evaporation" found nothing.
//
// These tests run the SHIPPED functions, lifted out of the module by source
// position — they never restate the matching rule, so a regression in the hub
// reds them rather than passing against a private copy of the logic.

const HUB = 'stem_lab/stem_lab_module.js';
const readHost = () => readFileSync(HUB, 'utf8');

function extractBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = openAt; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) return source.slice(openAt, i + 1);
    }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar + ' block');
}

// Lift a `function NAME(...) { ... }` declaration out of the hub source.
function extractFunction(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\(').exec(source);
  expect(declaration, 'hub no longer declares ' + name).not.toBeNull();
  const openAt = source.indexOf('{', declaration.index);
  const body = extractBalanced(source, openAt, '{', '}');
  return source.slice(declaration.index, openAt) + body;
}

function extractObject(source, declarationText) {
  const at = source.indexOf(declarationText);
  expect(at, 'hub no longer declares ' + declarationText).toBeGreaterThanOrEqual(0);
  const openAt = source.indexOf('{', at);
  return extractBalanced(source, openAt, '{', '}');
}

// Build a sandbox holding the REAL normalizer, the REAL haystack builder and
// the REAL alias table, then expose the shipped per-tool predicate.
function loadMatcher() {
  const source = readHost();
  const sandbox = {
    window: {},
    _stemToolIndexById: null,
    expectMissing: null
  };
  const code = [
    'var _searchAliasMap = ' + extractObject(source, 'var _searchAliasMap = {') + ';',
    extractFunction(source, '_normalizeToolSearchText'),
    extractFunction(source, '_stemToolIndexEntry'),
    extractFunction(source, '_stemToolSearchHaystack'),
    // The predicate closes over _searchWords in the module; recreate that
    // binding here rather than restating the loop.
    'function makeMatcher(query) {',
    '  var _searchLower = _normalizeToolSearchText(query);',
    '  var _searchWords = _searchLower ? _searchLower.split(" ").filter(Boolean) : [];',
    '  ' + extractFunction(source, '_stemToolSearchMatches'),
    '  return { matches: _stemToolSearchMatches, phrase: _searchLower };',
    '}',
    'this.makeMatcher = makeMatcher;',
    'this.haystack = _stemToolSearchHaystack;',
    'this.aliasMap = _searchAliasMap;'
  ].join('\n');
  runInNewContext(code, sandbox);
  return sandbox;
}

// Every tool id in the shipped alias table, as the catalog would present it.
function aliasTools(sandbox) {
  return Object.keys(sandbox.aliasMap).map((id) => ({ id, label: id, desc: '', category: '' }));
}

describe('STEM hub tool search', () => {
  it('lifts the shipped matcher, normalizer and alias table', () => {
    const sandbox = loadMatcher();
    expect(Object.keys(sandbox.aliasMap).length).toBeGreaterThan(20);
    expect(sandbox.haystack({ id: 'waterCycle', label: 'Water Cycle Explorer' }))
      .toContain('water cycle');
  });

  it('still matches an exact phrase', () => {
    const { matches } = loadMatcher().makeMatcher('water cycle');
    expect(matches({ id: 'waterCycle', label: 'Water Cycle Explorer', desc: '' })).toBe(true);
  });

  // The regression itself.
  it('matches words that are present but not adjacent', () => {
    const { matches } = loadMatcher().makeMatcher('water evaporation');
    expect(matches({ id: 'waterCycle', label: 'Water Cycle Explorer', desc: '' })).toBe(true);
  });

  it('matches words typed in any order', () => {
    const { matches } = loadMatcher().makeMatcher('evaporation water');
    expect(matches({ id: 'waterCycle', label: 'Water Cycle Explorer', desc: '' })).toBe(true);
  });

  it('requires EVERY word, so adding a word can only narrow', () => {
    const sandbox = loadMatcher();
    const tool = { id: 'waterCycle', label: 'Water Cycle Explorer', desc: '' };
    expect(sandbox.makeMatcher('water').matches(tool)).toBe(true);
    // "kangaroo" appears nowhere in the water cycle entry.
    expect(sandbox.makeMatcher('water kangaroo').matches(tool)).toBe(false);
  });

  it('does not match a word that is absent from every source', () => {
    const sandbox = loadMatcher();
    const hits = aliasTools(sandbox).filter(sandbox.makeMatcher('zzzznotatool').matches);
    expect(hits).toEqual([]);
  });

  // Realistic two-word teacher queries. Each pair is two real terms from one
  // tool's own alias string that do NOT sit next to each other, which is
  // exactly what the old single-indexOf could not find.
  const REALISTIC = [
    ['water evaporation', 'waterCycle'],
    ['magnet compass', 'magnetism'],
    ['bacteria antibiotic', 'microbiology'],
    ['nutrition vitamins', 'nutritionLab'],
    ['welding defects', 'weldLab'],
    ['echolocation headphones', 'echoTrainer']
  ];

  it.each(REALISTIC)('finds the right tool for %j', (query, expectedId) => {
    const sandbox = loadMatcher();
    const { matches } = sandbox.makeMatcher(query);
    const hits = aliasTools(sandbox).filter(matches).map((tool) => tool.id);
    expect(hits).toContain(expectedId);
  });

  it('leaves every realistic query with at least one result', () => {
    const sandbox = loadMatcher();
    const empty = REALISTIC.filter(([query]) => {
      const { matches } = sandbox.makeMatcher(query);
      return aliasTools(sandbox).filter(matches).length === 0;
    });
    expect(empty).toEqual([]);
  });

  it('ignores punctuation and repeated spaces', () => {
    const sandbox = loadMatcher();
    const tool = { id: 'waterCycle', label: 'Water Cycle Explorer', desc: '' };
    expect(sandbox.makeMatcher('  water,   cycle  ').matches(tool)).toBe(true);
  });

  it('treats a camelCase id as separate words', () => {
    const sandbox = loadMatcher();
    // The normalizer splits waterCycle -> "water cycle".
    expect(sandbox.haystack({ id: 'waterCycle', label: '', desc: '' })).toContain('water cycle');
  });
});

describe('STEM hub search ranking', () => {
  // The ranking pass floats exact-phrase hits to the top of their own section.
  // It is inline in the render, so this test pins the invariant it must hold:
  // a header is never separated from the tiles that follow it.
  it('keeps the phrase-first partition inside a category run', () => {
    const source = readFileSync(HUB, 'utf8');
    const at = source.indexOf('Float exact-phrase hits to the top');
    expect(at, 'ranking pass is gone').toBeGreaterThanOrEqual(0);
    const region = source.slice(at, at + 1600);
    // It must flush at each header rather than sorting the flat array.
    expect(region).toContain('_flushRun');
    expect(region).not.toMatch(/_filteredTools\.sort\(/);
  });
});
