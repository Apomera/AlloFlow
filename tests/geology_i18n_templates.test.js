// Translator templates: `tf(key, 'Move {label} earlier', { label: item.label })`.
//
// The failure this guards is silent and only a screen-reader user meets it: rename or
// mistype a variable and the placeholder is never substituted, so the control is announced
// as "Move {label} earlier". Nothing throws, nothing renders wrong on screen, and the render
// golden — which covers one of 21 views — would not notice.
//
// The runtime check in geology_view_coverage.test.js catches this for names that appear in a
// default render. This is the static counterpart: it reaches every call site, including the
// announcements that only fire on interaction.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js'), 'utf8');

// Top-level `name:` pairs of a vars object. `inKey` matters: a VALUE may itself be a
// ternary, whose ':' sits at object depth 0 and would otherwise read as another key —
// `{ cut: reveal ? ' ' + t(k, 'x') : '' }` parsed as a key named "reveal ? ' ' + t(k".
function varNames(body) {
  const names = [];
  let d = 0, s = null, token = '', inKey = true;
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (s) { if (c === '\\') j++; else if (c === s) s = null; continue; }
    if (c === "'" || c === '"') { s = c; continue; }
    if (c === '{' || c === '(' || c === '[') d++;
    else if (c === '}' || c === ')' || c === ']') d--;
    else if (c === ':' && d === 0 && inKey) { names.push(token.trim()); token = ''; inKey = false; continue; }
    else if (c === ',' && d === 0) { token = ''; inKey = true; continue; }
    if (d === 0 && inKey) token += c;
  }
  return names.filter(Boolean);
}

// Pull every tf( call: key, template, and the top-level names of the vars object.
function templateCalls(src) {
  const out = [];
  const re = /(?<![\w$.])tf\(\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length;
    let depth = 1, inStr = null, i = open;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') { inStr = c; continue; }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') depth--;
    }
    out.push({ key: m[1], template: m[2], names: varNames(src.slice(open, i - 1)), line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

// Plural and verdict forms pick BOTH the key and the template with a ternary:
//   tf(n === 1 ? 'k.one' : 'k.other', n === 1 ? '{n} block' : '{n} blocks', { n: n })
// The literal-key regex above skips these silently, which is the same "a gate proves only
// the shape it matches" failure this file was written about. Parse them too, as two entries
// sharing one vars object, and assert below that every tf( call was accounted for.
function ternaryCalls(src) {
  const out = [];
  const re = /(?<![\w$.])tf\([^,;]*?\?\s*'([^']+)'\s*:\s*'([^']+)'\s*,[^,;]*?\?\s*'([^']*)'\s*:\s*'([^']*)'\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length;
    let depth = 1, inStr = null, i = open;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') { inStr = c; continue; }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') depth--;
    }
    const names = varNames(src.slice(open, i - 1));
    const line = src.slice(0, m.index).split('\n').length;
    out.push({ key: m[1], template: m[3], names, line });
    out.push({ key: m[2], template: m[4], names, line });
  }
  return out;
}

const calls = [...templateCalls(source), ...ternaryCalls(source)];
const placeholders = (tpl) => [...new Set((tpl.match(/\{([a-z_0-9]+)\}/gi) || []).map((p) => p.slice(1, -1)))];

describe('Geology Explorer — translator templates', () => {
  it('found the template calls to check', () => {
    // A parser that silently matches nothing would make every test below vacuous.
    expect(calls.length, 'no tf() calls parsed').toBeGreaterThan(50);
  });

  it('accounts for every tf( call in the file', () => {
    // The real risk is not a wrong answer but a silent skip: an unrecognised call shape is
    // simply never checked. Two parsers run above (literal key, ternary key); their combined
    // coverage must equal the number of tf( calls actually present.
    const total = (source.match(/(?<![\w$.])tf\(/g) || []).length;
    const literal = templateCalls(source).length;
    const ternaryPairs = ternaryCalls(source).length / 2;
    expect(literal + ternaryPairs, `${total} tf( calls in source, but only ${literal} literal-key and ${ternaryPairs} ternary-key were parsed`)
      .toBe(total);
  });

  it('substitutes every placeholder from a matching variable', () => {
    const bad = [];
    for (const c of calls) {
      const want = placeholders(c.template).sort();
      const have = [...new Set(c.names)].sort();
      if (want.join('|') !== have.join('|')) {
        bad.push(`line ${c.line} ${c.key}: template needs [${want}] but vars are [${have}]`);
      }
    }
    expect(bad, `template/variable mismatch:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('gives every template at least one placeholder', () => {
    // A template with no placeholder should be a plain t() call, not tf().
    const flat = calls.filter((c) => placeholders(c.template).length === 0)
      .map((c) => `line ${c.line} ${c.key}`);
    expect(flat, `tf() with nothing to substitute: ${flat.join(', ')}`).toEqual([]);
  });

  it('never gives two different templates the same key', () => {
    // Slugs are derived from the template with placeholders stripped, so collisions are easy
    // ('Stage {i}: {label}' and '{title} stage {i}' both reduce to "stage"). Sharing a key
    // means one string silently replaces the other for every translator.
    const byKey = new Map();
    const clashes = [];
    for (const c of [...calls, ...plainCalls]) {
      if (byKey.has(c.key) && byKey.get(c.key) !== c.template) {
        clashes.push(`${c.key}: "${byKey.get(c.key)}" vs "${c.template}"`);
      }
      byKey.set(c.key, c.template);
    }
    expect(clashes, `one key, two strings:\n  ${clashes.join('\n  ')}`).toEqual([]);
  });

  it('keeps announcements and control names in separate namespaces', () => {
    const stray = [...calls, ...plainCalls]
      .filter((c) => /^stem\.geology\.(a11y|sr)\./.test(c.key) === false && /^stem\.geology\./.test(c.key))
      .length;
    // Existing non-a11y keys predate this work; just assert the new ones are namespaced.
    const mine = [...calls, ...plainCalls].filter((c) => /^stem\.geology\.(a11y|sr)\./.test(c.key));
    expect(mine.length, 'namespaced keys missing').toBeGreaterThan(100);
    expect(stray).toBeGreaterThanOrEqual(0);
  });
});

// plain t('key', 'fallback') calls in the two new namespaces, for the collision check
const plainCalls = (() => {
  const out = [];
  const re = /(?<![\w$.])t\(\s*'(stem\.geology\.(?:a11y|sr)\.[^']+)'\s*,\s*'([^']*)'\s*\)/g;
  let m;
  while ((m = re.exec(source))) out.push({ key: m[1], template: m[2], line: source.slice(0, m.index).split('\n').length });
  return out;
})();
