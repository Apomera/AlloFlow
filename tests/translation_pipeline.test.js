// Translation pipeline unit tests
// ==============================================================================
// Tests the DNT masking + unmasking + glossary preamble logic from
// AlloFlowANTI.txt. We extract the pure functions here as JS so they can be
// tested without a browser or API key. If you change the source, mirror the
// changes here and re-run `node tests/translation_pipeline.test.js`.
// ==============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ─── Re-implementation of the pure functions for testing ────────────────────
// (mirrors AlloFlowANTI.txt _maskDNT / _unmaskDNT / _buildGlossaryPreamble)

const _DNT_REGEX_PATTERNS = [
  /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,
  /\d+(\.\d+)?(MB|KB|GB|cm|mm|km|kg|°C|°F|fps|Hz|ms|nm|μm|AU|ly)\b/g,
  /v\d+(\.\d+)?/g,
  /#[A-Fa-f0-9]{3,8}\b/g,
  /https?:\/\/[^\s\)\]]+/g
];

function _escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function _maskDNT(strings, glossary) {
  const tokens = [];
  const dntTerms = (glossary && glossary.DO_NOT_TRANSLATE) || [];
  const sortedTerms = dntTerms.slice().sort((a, b) => b.length - a.length);
  function maskOne(str) {
    if (typeof str !== 'string') return str;
    let masked = str;
    _DNT_REGEX_PATTERNS.forEach((re) => {
      masked = masked.replace(re, (match) => {
        const id = tokens.length;
        tokens.push(match);
        return '‹dnt:' + id + '›';
      });
    });
    sortedTerms.forEach((term) => {
      const re = new RegExp('\\b' + _escapeRe(term) + '\\b', 'gi');
      masked = masked.replace(re, (match) => {
        const id = tokens.length;
        tokens.push(match);
        return '‹dnt:' + id + '›';
      });
    });
    return masked;
  }
  const result = {};
  for (const k in strings) result[k] = maskOne(strings[k]);
  return { masked: result, tokens };
}

function _unmaskDNT(strings, tokens) {
  function unmaskOne(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/‹dnt:(\d+)›/g, (m, id) => {
      const tok = tokens[parseInt(id, 10)];
      return tok !== undefined ? tok : m;
    });
  }
  const result = {};
  for (const k in strings) result[k] = unmaskOne(strings[k]);
  return result;
}

function _buildGlossaryPreamble(glossary, targetLanguage) {
  if (!glossary || !glossary.DOMAIN_GLOSSARY) return '';
  const entries = [];
  const groups = glossary.DOMAIN_GLOSSARY;
  for (const groupKey in groups) {
    for (const term in groups[groupKey]) {
      entries.push('  - "' + term + '" — ' + groups[groupKey][term]);
    }
  }
  if (entries.length === 0) return '';
  return [
    'DOMAIN GLOSSARY — translate these English terms consistently. Use the standard ' + targetLanguage + ' equivalent for K-12 special education. If a term is a proper noun, brand, or acronym, keep it verbatim.',
    entries.join('\n'),
    ''
  ].join('\n');
}

// ─── Load the real glossary file ────────────────────────────────────────────

function loadGlossary() {
  const text = fs.readFileSync(path.join(__dirname, '..', 'translation_glossary.js'), 'utf8');
  const cleaned = text.replace(/^\s*\/\/.*$/gm, '').trim();
  return JSON.parse(cleaned);
}

// ─── Tiny test harness (mirrors clinical_tests.js style) ────────────────────

let _passed = 0;
let _failed = 0;
const _failures = [];

function test(name, fn) {
  try {
    fn();
    _passed++;
  } catch (e) {
    _failed++;
    _failures.push({ name, message: e.message });
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const glossary = loadGlossary();

test('glossary file parses + has version', function () {
  assert.strictEqual(typeof glossary.version, 'number');
  assert.ok(glossary.DO_NOT_TRANSLATE.length > 20, 'expected >20 DNT terms, got ' + glossary.DO_NOT_TRANSLATE.length);
});

test('glossary includes core brand names', function () {
  ['AlloFlow', 'AlloBot', 'AlloHaven', 'StoryForge', 'LitLab', 'PoetTree'].forEach(function (term) {
    assert.ok(glossary.DO_NOT_TRANSLATE.includes(term), 'DNT list missing: ' + term);
  });
});

test('glossary includes critical acronyms', function () {
  ['UDL', 'SEL', 'RTI', 'IEP', 'FERPA'].forEach(function (term) {
    assert.ok(glossary.DO_NOT_TRANSLATE.includes(term), 'DNT list missing: ' + term);
  });
});

test('DNT masking preserves brand name', function () {
  const { masked, tokens } = _maskDNT({ a: 'Welcome to AlloFlow!' }, glossary);
  assert.ok(/‹dnt:\d+›/.test(masked.a), 'no DNT token in masked output');
  assert.ok(tokens.includes('AlloFlow'), 'AlloFlow not captured in tokens');
});

test('DNT unmasking restores brand name exactly', function () {
  const { masked, tokens } = _maskDNT({ a: 'Welcome to AlloFlow!' }, glossary);
  const restored = _unmaskDNT(masked, tokens);
  assert.strictEqual(restored.a, 'Welcome to AlloFlow!');
});

test('DNT round-trip preserves placeholder {grade}', function () {
  const input = { a: 'You are in grade {grade}' };
  const { masked, tokens } = _maskDNT(input, glossary);
  // The {grade} placeholder should be masked
  assert.ok(/‹dnt:\d+›/.test(masked.a), 'placeholder not masked');
  assert.ok(tokens.includes('{grade}'), '{grade} not captured');
  // Simulate translation: model might translate other text but should keep ‹dnt:N›
  const fakeTranslated = { a: masked.a.replace('You are in grade', 'Estás en el grado') };
  const restored = _unmaskDNT(fakeTranslated, tokens);
  assert.strictEqual(restored.a, 'Estás en el grado {grade}');
});

test('DNT round-trip preserves multiple placeholders', function () {
  const input = { a: 'Hello {name}, you scored {score} on grade {grade}' };
  const { masked, tokens } = _maskDNT(input, glossary);
  // All three placeholders should be tokens
  assert.ok(tokens.includes('{name}'), '{name} missing');
  assert.ok(tokens.includes('{score}'), '{score} missing');
  assert.ok(tokens.includes('{grade}'), '{grade} missing');
  // Simulate Spanish translation
  const fakeTranslated = { a: masked.a.replace('Hello', 'Hola').replace(', you scored', ', sacaste').replace(' on grade ', ' en el grado ') };
  const restored = _unmaskDNT(fakeTranslated, tokens);
  assert.strictEqual(restored.a, 'Hola {name}, sacaste {score} en el grado {grade}');
});

test('DNT preserves units (5 MB, 24°C)', function () {
  const input = { a: 'Upload up to 5MB at 24°C', b: 'Speed 60fps' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('5MB'), '5MB not captured');
  assert.ok(tokens.includes('24°C'), '24°C not captured');
  assert.ok(tokens.includes('60fps'), '60fps not captured');
});

test('DNT preserves URLs', function () {
  const input = { a: 'See https://example.com/foo for details' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.some(function (t) { return t.indexOf('https://example.com/foo') === 0; }), 'URL not captured');
});

test('DNT preserves hex colors', function () {
  const input = { a: 'Color is #f97316 or #fff' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('#f97316'), '#f97316 not captured');
  assert.ok(tokens.includes('#fff'), '#fff not captured');
});

test('DNT preserves version tags', function () {
  const input = { a: 'Using v1.2 of the API' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('v1.2'), 'v1.2 not captured');
});

test('DNT matches whole-word brand names (not substring)', function () {
  // "PoetTreeHouse" shouldn't match "PoetTree" — but we DO want to match
  // PoetTree at word boundaries. JS regex \b is letter-digit boundary.
  const input = { a: 'PoetTree is great' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('PoetTree'), 'PoetTree not captured');
});

test('DNT works on multi-word brands (SEL Hub, STEM Lab)', function () {
  const input = { a: 'Visit SEL Hub for emotions practice. Also try STEM Lab.' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('SEL Hub'), 'SEL Hub not captured');
  assert.ok(tokens.includes('STEM Lab'), 'STEM Lab not captured');
});

test('DNT round-trip on multi-string object', function () {
  const input = {
    'welcome': 'Welcome to AlloFlow',
    'goodbye': 'See you in AlloHaven',
    'tier1': 'You are on Tier 1 of the RTI system'
  };
  const { masked, tokens } = _maskDNT(input, glossary);
  // Imagine the model translated everything around the masks
  const restored = _unmaskDNT(masked, tokens);
  // The masks should restore exactly back to source
  assert.strictEqual(restored.welcome, 'Welcome to AlloFlow');
  assert.strictEqual(restored.goodbye, 'See you in AlloHaven');
  assert.strictEqual(restored.tier1, 'You are on Tier 1 of the RTI system');
});

test('glossary preamble is non-empty for known languages', function () {
  const preamble = _buildGlossaryPreamble(glossary, 'Spanish (Latin America)');
  assert.ok(preamble.length > 100, 'preamble too short');
  assert.ok(preamble.indexOf('Spanish (Latin America)') > -1, 'language not interpolated');
  // Some core terms should be in the preamble
  assert.ok(/exit ticket/.test(preamble), 'exit ticket not in preamble');
  assert.ok(/scaffold/.test(preamble), 'scaffold not in preamble');
});

test('glossary preamble contains both general + udl groups', function () {
  const preamble = _buildGlossaryPreamble(glossary, 'French');
  // From 'general' group
  assert.ok(/anchor chart/.test(preamble), 'anchor chart missing');
  // From 'udl' group
  assert.ok(/Universal Design for Learning/.test(preamble), 'UDL definition missing');
  // From 'sel' group
  assert.ok(/self-awareness/.test(preamble), 'self-awareness missing');
  // From 'rti_mtss' group
  assert.ok(/Tier 1/.test(preamble), 'Tier 1 missing');
  // From 'iep_sped' group
  assert.ok(/accommodation/.test(preamble), 'accommodation missing');
});

test('empty glossary yields empty preamble', function () {
  const preamble = _buildGlossaryPreamble({ DOMAIN_GLOSSARY: {} }, 'Spanish');
  assert.strictEqual(preamble, '');
});

test('null glossary is handled gracefully', function () {
  const preamble = _buildGlossaryPreamble(null, 'Spanish');
  assert.strictEqual(preamble, '');
});

test('DNT masking is idempotent for repeated terms', function () {
  const input = { a: 'AlloFlow, AlloFlow, and AlloFlow again' };
  const { masked, tokens } = _maskDNT(input, glossary);
  // Each AlloFlow gets its own token (so order is preserved)
  const matches = masked.a.match(/‹dnt:\d+›/g);
  assert.strictEqual(matches.length, 3, 'expected 3 DNT tokens, got ' + (matches && matches.length));
  // Restoration should give back exact original
  const restored = _unmaskDNT(masked, tokens);
  assert.strictEqual(restored.a, 'AlloFlow, AlloFlow, and AlloFlow again');
});

test('case-insensitive match still captures correct case', function () {
  // "alloflow" (lowercase) should match the term AlloFlow but the captured
  // token preserves the user's casing (because we store the matched substring)
  const input = { a: 'visit alloflow today' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.ok(tokens.includes('alloflow'), 'lowercase alloflow not captured');
  const restored = _unmaskDNT(masked, tokens);
  assert.strictEqual(restored.a, 'visit alloflow today');
});

test('regex patterns sort before terms (URL with brand inside)', function () {
  // A URL pattern matches first; brand name inside the URL shouldn't double-mask
  const input = { a: 'See https://AlloFlow.example.com/docs' };
  const { masked, tokens } = _maskDNT(input, glossary);
  // The URL was masked as a whole — no inner-AlloFlow re-masking should occur
  const dntCount = (masked.a.match(/‹dnt:\d+›/g) || []).length;
  assert.strictEqual(dntCount, 1, 'expected single DNT token for the URL, got ' + dntCount);
});

test('non-string values pass through unchanged', function () {
  const input = { a: 42, b: true, c: null, d: 'AlloFlow' };
  const { masked, tokens } = _maskDNT(input, glossary);
  assert.strictEqual(masked.a, 42);
  assert.strictEqual(masked.b, true);
  assert.strictEqual(masked.c, null);
  assert.ok(/‹dnt:\d+›/.test(masked.d), 'string value still masked');
});

// ─── Results ────────────────────────────────────────────────────────────────

console.log('');
console.log('Translation pipeline tests: ' + _passed + ' passed, ' + _failed + ' failed');
if (_failures.length > 0) {
  console.log('');
  console.log('FAILURES:');
  _failures.forEach(function (f) { console.log('  ✗ ' + f.name + ' — ' + f.message); });
  process.exit(1);
}
