// Slice 3 (2026-06-16): surgical fixes for axe-detected issues now target the EXACT element via
// axe's CSS-selector `target`, not a fragile ordinal "Nth-of-tag" index. The runner applies
// directives sequentially to mutating html, so a frozen ordinal drifts — an earlier insert/removal
// makes "the 5th <img>" point at the WRONG element (fails WRONG). Resolving the selector against the
// CURRENT html lands on the right element; a selector MISS returns the html unchanged (fails SAFE).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _applyToAxeTarget(html, rawTarget, mutateFn) {');
const end = src.indexOf('\nvar createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _applyToAxeTarget missing');
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
    expect(src.slice(i, i + 2500)).toContain('return _applyToAxeTarget(html, p.target, function(el)');
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
