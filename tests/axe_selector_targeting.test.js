// Slice 3 (2026-06-16): surgical fixes for axe-detected issues now target the EXACT element via
// axe's CSS-selector `target`, not a fragile ordinal "Nth-of-tag" index. The runner applies
// directives sequentially to mutating html, so a frozen ordinal drifts — an earlier insert/removal
// makes "the 5th <img>" point at the WRONG element (fails WRONG). Resolving the selector against the
// CURRENT html lands on the right element; a selector MISS returns the html unchanged (fails SAFE).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
// P5 (2026-07-02): _applyToAxeTarget is now a thin wrapper over _applyToAxeTargetDoc (the
// shared-doc core), so the eval slice must start at the Doc variant or the wrapper calls
// an undefined helper inside this harness.
const start = src.indexOf('function _applyToAxeTargetDoc(doc, rawTarget, mutateFn) {');
const end = src.indexOf('\nvar createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _applyToAxeTargetDoc/_applyToAxeTarget missing');
const { _applyToAxeTarget } = new Function(src.slice(start, end) + '\n; return { _applyToAxeTarget };')();

const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

describe('_applyToAxeTarget — deterministic, fail-safe element targeting', () => {
  it('mutates EXACTLY the selector-matched element, regardless of ordinal position', () => {
    const html = '<!DOCTYPE html><html><body><p><img alt="" class="a"></p><figure><img alt="" class="b"></figure></body></html>';
    const out = _applyToAxeTarget(html, 'img.b', (el) => el.setAttribute('alt', 'fixed'));
    const d = parse(out);
    expect(d.querySelector('img.b').getAttribute('alt')).toBe('fixed'); // the targeted one
    expect(d.querySelector('img.a').getAttribute('alt')).toBe('');      // the other one untouched
  });

  it('a selector MISS returns the html UNCHANGED (fail-safe, never mutates the wrong node)', () => {
    const html = '<body><img alt="" class="a"></body>';
    const out = _applyToAxeTarget(html, 'img.does-not-exist', (el) => el.setAttribute('alt', 'WRONG'));
    expect(out).toBe(html);
    expect(out).not.toContain('WRONG');
  });

  it('mutateFn returning false declines the change (html unchanged)', () => {
    const html = '<body><a class="x">click here</a></body>';
    const out = _applyToAxeTarget(html, 'a.x', () => false);
    expect(out).toBe(html);
  });

  it("resolves axe's nested-frame array target form (uses the last selector)", () => {
    const html = '<body><h2 id="t"></h2></body>';
    const out = _applyToAxeTarget(html, [['#t']], (el) => el.remove());
    expect(parse(out).querySelector('#t')).toBeNull();
  });

  it('preserves a leading <!DOCTYPE> on serialize', () => {
    const html = '<!DOCTYPE html><html><body><iframe class="f"></iframe></body></html>';
    const out = _applyToAxeTarget(html, 'iframe.f', (el) => el.setAttribute('title', 'Embedded'));
    expect(out).toMatch(/^<!DOCTYPE html>/i);
    expect(parse(out).querySelector('iframe.f').getAttribute('title')).toBe('Embedded');
  });

  it('null target / no-DOMParser is a no-op', () => {
    expect(_applyToAxeTarget('<p>x</p>', null, () => {})).toBe('<p>x</p>');
  });
});

describe('anti-drift: the axe-mapped tools + map use the selector path', () => {
  it('the 5 ordinal tools each have a target branch that routes through _applyToAxeTarget', () => {
    for (const tool of ['fix_alt_text', 'fix_link_text', 'fix_button_name', 'fix_iframe_title', 'fix_remove_empty_heading']) {
      const i = src.indexOf(tool + ': {');
      const body = src.slice(i, i + 700);
      expect(body, `${tool} missing selector branch`).toMatch(/if \(p\.target != null\) return _applyToAxeTarget\(html, p\.target,/);
    }
  });

  it('fix_color_contrast was refactored onto the shared helper', () => {
    const i = src.indexOf('fix_color_contrast: {');
    // P5: the mutator is shared between the string path and fnDoc — both must ride it.
    expect(src.slice(i, i + 2500)).toContain('return _applyToAxeTarget(html, p.target, _mutColorContrast(_fix));');
    expect(src.slice(i, i + 2500)).toContain('return _applyToAxeTargetDoc(doc, p.target, _mutColorContrast(_fix));');
  });

  it('every axe-map mapper that fixes a node threads target: n.target', () => {
    // image-alt / button-name(x2) / link-name / frame-title / empty-heading
    expect((src.match(/params: \{ target: n\.target,/g) || []).length).toBeGreaterThanOrEqual(6);
  });

  it('the direct-map runner applies element-structural fixes LAST (so positional selectors stay valid)', () => {
    expect(src).toContain('const _structuralLast = { fix_remove_empty_heading: 1, fix_add_landmark: 1, fix_skip_nav: 1 };');
    expect(src).toContain('_directives.filter((d) => !_structuralLast[d.tool]).concat(_directives.filter((d) => _structuralLast[d.tool]))');
  });
});

describe('form-label rules (3.3.2) joined the direct-map (follow-up #2, 2026-06-16)', () => {
  it('label + select-name map to fix_input_label, threading the exact selector', () => {
    for (const rule of ["'label':", "'select-name':"]) {
      const i = src.indexOf(rule, src.indexOf('AXE_RULE_TO_TOOL'));
      const body = src.slice(i, i + 320);
      expect(body, `${rule} should map to fix_input_label`).toContain("tool: 'fix_input_label'");
      expect(body, `${rule} should thread target: n.target`).toContain('target: n.target');
    }
  });

  it('fix_input_label gained a selector branch (so it fixes select/textarea too, fail-safe)', () => {
    const i = src.indexOf('fix_input_label: {');
    const body = src.slice(i, i + 600);
    expect(body).toMatch(/if \(p\.target != null\) return _applyToAxeTarget\(html, p\.target, _mutInputLabel\(p\)\);/);
    // the shared mutator declines (returns false) when the field is already named — never
    // clobbers a real label (P5: the decline lives in _mutInputLabel, used by BOTH paths)
    expect(src).toContain("if (el.getAttribute('aria-label')) return false; // already named");
  });

  it("the selector branch adds an aria-label by selector, and declines when one already exists", () => {
    const add = _applyToAxeTarget(
      '<body><input class="q1" placeholder="answer"></body>', 'input.q1',
      (el) => { if (el.getAttribute('aria-label')) return false; el.setAttribute('aria-label', 'Question 1 (needs a label)'); });
    expect(parse(add).querySelector('input.q1').getAttribute('aria-label')).toBe('Question 1 (needs a label)');
    const keep = '<body><select class="g" aria-label="Grade level"><option>K</option></select></body>';
    const out = _applyToAxeTarget(keep, 'select.g',
      (el) => { if (el.getAttribute('aria-label')) return false; el.setAttribute('aria-label', 'WRONG'); });
    expect(out).toBe(keep); // already named → unchanged
  });
});
