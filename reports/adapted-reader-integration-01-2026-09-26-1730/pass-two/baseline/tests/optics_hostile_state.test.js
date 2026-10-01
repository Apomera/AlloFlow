import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

const HELPER_OPEN = 'function _opArray(value) {';
const HELPER = sliceBetween(SRC, HELPER_OPEN, 'var OP_LENS_DEFAULTS',
  { file: 'stem_lab/stem_tool_optics.js' });

const { _opArray } = vm.runInNewContext(
  `(function () { ${HELPER} return { _opArray: _opArray }; })()`, { Array });

// The shapes a corrupt or hand-edited save actually produces. Every one of
// these passes `x || []` and then throws on the first array method.
const HOSTILE = [
  {}, { 0: 'a' }, 'five', '', 'abc', 42, 0, true, false, null, undefined, NaN,
];

describe('Optics — _opArray coerces any persisted shape to an array', () => {
  it('returns a real array for every hostile value', () => {
    for (const bad of HOSTILE) {
      const out = _opArray(bad);
      expect(Array.isArray(out), `_opArray(${JSON.stringify(bad)}) is not an array`).toBe(true);
      // and it must be SAFE to call the methods the call sites use
      expect(() => out.map(String)).not.toThrow();
      expect(() => out.filter(Boolean)).not.toThrow();
      expect(() => out.slice()).not.toThrow();
      expect(() => out.concat([1])).not.toThrow();
      expect(() => out.indexOf('x')).not.toThrow();
    }
  });

  it('passes real arrays through untouched', () => {
    const arr = [1, 2, 3];
    expect(_opArray(arr)).toBe(arr);
    expect(_opArray([])).toEqual([]);
  });

  it('does not mistake an array-like object for an array', () => {
    // {length: 3} has a length but no array methods — the exact shape that
    // makes a naive `x.length` guard look like it worked.
    expect(_opArray({ length: 3 })).toEqual([]);
    expect(_opArray({ 0: 'a', 1: 'b', length: 2 })).toEqual([]);
  });
});

describe('Optics — every persisted array read is coerced', () => {
  // `(d.x || [])` is the pattern that fails open: it only replaces a FALSY
  // value, so {} / 'str' / 42 reach the array method and throw.
  it('leaves no `(d.X || []).<arrayMethod>` call sites', () => {
    const bad = SRC.match(
      /\(\s*(?:d|prev\.opticsLab)\.[A-Za-z0-9_]+\s*\|\|\s*\[\]\s*\)\s*\.\s*(?:map|filter|slice|forEach|reduce|some|every|concat|indexOf|join|sort)/g) || [];
    expect(bad, 'these crash the whole tool on a corrupt save').toEqual([]);
  });

  it('leaves no unguarded `d.X.<arrayMethod>` call sites', () => {
    // `d.quizQuestions.map(` is legitimate: the panel's FIRST statement is an
    // Array.isArray early return, so those sites cannot be reached with a
    // non-array. Every other bare `d.X.<method>` is a real exposure.
    const all = SRC.match(/\bd\.([A-Za-z0-9_]+)\.(?:map|filter|forEach|reduce|some|every)\(/g) || [];
    const guarded = new Set(['d.quizQuestions.map(']);
    const bad = all.filter((hit) => !guarded.has(hit));
    expect(bad, 'a persisted value is used as an array with no Array check').toEqual([]);

    // ...and that exemption is only valid while the early return is really
    // the first thing the panel does. Pin it, or the exemption becomes a hole.
    const panelHead = sliceBetween(SRC,
      'function _renderQuizPanel(d, upd, h, addToast, awardXP, setOpCeleb) {',
      'return h(', { file: 'stem_lab/stem_tool_optics.js' });
    const beforeGuard = panelHead.slice(
      panelHead.indexOf('{') + 1,
      panelHead.indexOf('if (!Array.isArray(d.quizQuestions)'));
    expect(beforeGuard.trim(), 'the quiz type guard is no longer the first statement').toBe('');
  });

  it('routes the known crash sites through the helper', () => {
    // Named explicitly so a rename cannot silently drop one.
    for (const site of [
      '_opArray(prev.opticsLab.opticsRecentModes).filter(',
      '_opArray(d.opticsRecentModes).indexOf(',
      // The photon run reads its stored dots here, then keeps only {s, u} points.
      '_opArray(state.phenoQuantumDots)',
      '_opArray(d.quizAnswers).slice()',
      '_opArray(d.quizAnswers)[qi]',
    ]) {
      expect(SRC, `crash site no longer coerced: ${site}`).toContain(site);
    }
  });

  it('guards the quiz question list by type, not just by falsiness', () => {
    // `if (!d.quizQuestions)` caught null but let {} and 'five' reach .map,
    // which blanked the ENTIRE tool — the render is one component.
    const guard = sliceBetween(SRC, 'if (!Array.isArray(d.quizQuestions)', 'return h(',
      { file: 'stem_lab/stem_tool_optics.js' });
    expect(guard).toContain('d.quizQuestions.length === 0');
    expect(SRC, 'the falsy-only quiz guard is back').not.toContain('if (!d.quizQuestions) {');
  });
});
