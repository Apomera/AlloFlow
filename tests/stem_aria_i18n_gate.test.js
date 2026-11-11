// The untranslated-accessible-name gate (dev-tools/check_stem_aria_i18n.cjs) must tell a
// translated label from a hardcoded one. It used to count every label that went through a
// tool's OWN translation helper as hardcoded (Access Lens: 24 findings, all false; Scale
// Explorer: 564), and it skipped two valid tools it could not parse. These pin both sides:
// the helper shapes are recognised, and a real hardcoded label is still caught beside them.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { scan } = require('../dev-tools/check_stem_aria_i18n.cjs');
const texts = (src) => scan(src).map((h) => h.text);

describe('translation helpers are a boundary', () => {
  it('a guarded wrapper that passes its own key and fallback to __alloT (Access Lens shape)', () => {
    const src = "var _t = function (k, fb) { var v = __alloT(k, fb); return (v == null || v === k) ? fb : v; };\n"
      + "h('button', { 'aria-label': _t('stem.x.take_photo', 'Take a photo') });";
    expect(texts(src)).toEqual([]);
  });
  it('a wrapper that adds a literal key prefix (Scale Explorer shape)', () => {
    const src = "function S(key, fb, vars) { var v = t('stem.scaleExplorer.' + key, fb); return vars ? fmt(v, vars) : v; }\n"
      + "h('div', { 'aria-label': S('atlas_nav', 'Learning workspace') });";
    expect(texts(src)).toEqual([]);
  });
  it('a translator made by a factory, even when the factory is declared after its use (Nuclear Lab shape)', () => {
    const src = "function Panel(props) { var nt = make(props.ctx); return h('div', { 'aria-label': nt('group', 'Choose a nucleus') }); }\n"
      + "function make(ctx) { return function (key, fallback, values) { var text; try { text = ctx.t('stem.n.studio_' + key, fallback); } catch (_) {} if (text == null) text = fallback; return String(text); }; }";
    expect(texts(src)).toEqual([]);
  });
  it('the original single-return wrapper still counts', () => {
    const src = "function L(key, fallback) { return t('stem.g.' + key, fallback); }\nh('i', { title: L('a', 'Sculpt') });";
    expect(texts(src)).toEqual([]);
  });
});

describe('real hardcoded names are still caught', () => {
  it('a literal label beside a recognised wrapper', () => {
    const src = "var _t = function (k, fb) { var v = __alloT(k, fb); return v == null ? fb : v; };\n"
      + "h('button', { 'aria-label': _t('stem.x.ok', 'Fine') });\nh('button', { 'aria-label': 'Delete photo' });";
    expect(texts(src)).toEqual(['Delete photo']);
  });
  it('a helper that only MENTIONS t() is not a boundary for what its callers pass', () => {
    const src = "function label(name, unit) { var s = t('stem.x.of', 'of'); return name + ' ' + s + ' ' + unit; }\n"
      + "h('div', { 'aria-label': label('Speed', 'meters') });";
    expect(texts(src)).toEqual(['Speed', 'meters']);
  });
  it('a wrapper that swaps its parameters, or passes a different key, is not trusted', () => {
    const swapped = "function w(a, b) { var v = t(b, a); return v; }\nh('div', { title: w('Hello there', 'some.key') });";
    expect(texts(swapped)).toEqual(['Hello there', 'some.key']);
    const fixed = "function w(a, b) { var v = t('stem.fixed', b); return v + a; }\nh('div', { title: w('Hello there', 'fb text') });";
    expect(texts(fixed)).toEqual(['Hello there', 'fb text']);
  });
  it('a helper that forwards the key but not the fallback its caller gave is not trusted', () => {
    const src = "function w(a, b) { var v = t(a, 'fixed text'); return v + b; }\nh('div', { title: w('some.key', 'Caller words') });";
    expect(texts(src)).toEqual(['some.key', 'Caller words']);
  });
  it('a long function that happens to forward its params is not a wrapper', () => {
    const src = "function big(k, fb) { var a = 1; var b = 2; var c = 3; var d = 4; return t(k, fb) + a + b + c + d; }\nh('div', { title: big('key', 'Words here') });";
    expect(texts(src)).toEqual(['key', 'Words here']);
  });
  it('a function returning a non-translator is not a factory', () => {
    const src = "function make(ctx) { return function (key, fallback) { return fallback + key; }; }\nvar nt = make(c);\nh('div', { title: nt('some.key', 'Plain words') });";
    expect(texts(src)).toEqual(['some.key', 'Plain words']);
  });
});

describe('placeholder tokens', () => {
  it('a bare {token} handed to .replace() is not prose, but words around a token still are', () => {
    const ok = "h('button', { 'aria-label': t('stem.x.quality', 'Quality: {mode}').replace('{mode}', names[mode]) });";
    expect(texts(ok)).toEqual([]);
    const bad = "h('button', { 'aria-label': 'Quality: {mode}'.replace('{mode}', names[mode]) });";
    expect(texts(bad)).toEqual(['Quality: {mode}']);
  });
});

describe('every tool is actually scanned', () => {
  it('parses current syntax such as ??= instead of skipping the file', () => {
    expect(texts("class C { get v() { return (this._v ??= 1); } }\nh('div', { title: 'Raw title' });")).toEqual(['Raw title']);
  });
  it('no STEM tool fails to parse', () => {
    const failed = fs.readdirSync('stem_lab').filter((f) => /^stem_tool_.+\.js$/.test(f) && !f.endsWith('.bak')).filter((f) => {
      try { scan(fs.readFileSync('stem_lab/' + f, 'utf8')); return false; } catch (_) { return true; }
    });
    expect(failed).toEqual([]);
  }, 180000);
  it('Access Lens has no untranslated accessible names', () => {
    expect(scan(fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8'))).toEqual([]);
  });
});
