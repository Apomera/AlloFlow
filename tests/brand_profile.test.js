// Unit tests for the pure functions of brand_profile_module.js
// (window.AlloModules.BrandProfile): isValidHex, contrastRatio,
// validateBrandProfile, and the HTML emitters' escaping.
//
// These gate whether a school's brand colors pass WCAG AA before they're baked
// into exported/remediated documents, and the header/footer emitters are an XSS
// boundary (user-supplied text/alt is injected into HTML). Storage-backed
// functions are out of scope.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let BP;
beforeAll(() => {
  loadAlloModule('brand_profile_module.js');
  BP = window.AlloModules.BrandProfile;
  if (!BP) throw new Error('BrandProfile failed to register');
});

describe('isValidHex', () => {
  it('accepts 3- and 6-digit hex with or without #', () => {
    expect(BP.isValidHex('#fff')).toBe(true);
    expect(BP.isValidHex('#ffffff')).toBe(true);
    expect(BP.isValidHex('aabbcc')).toBe(true);
  });
  it('rejects malformed or non-string values', () => {
    expect(BP.isValidHex('#xyzxyz')).toBe(false);
    expect(BP.isValidHex('#ff')).toBe(false);
    expect(BP.isValidHex(123)).toBe(false);
    expect(BP.isValidHex(null)).toBe(false);
  });
});

describe('contrastRatio (WCAG)', () => {
  it('computes the canonical black-on-white ratio of 21:1', () => {
    expect(BP.contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('is 1:1 for identical colors', () => {
    expect(BP.contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
  it('returns 0 for invalid input', () => {
    expect(BP.contrastRatio('not-a-color', '#fff')).toBe(0);
  });
});

describe('validateBrandProfile', () => {
  it('rejects a null / non-object profile', () => {
    const r = BP.validateBrandProfile(null);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('Profile is missing or not an object');
  });
  it('requires a name', () => {
    const r = BP.validateBrandProfile({ name: '', colors: BP.DEFAULT_COLORS });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /name is required/i.test(e))).toBe(true);
  });
  it('accepts the shipped default colors (they must pass WCAG AA)', () => {
    const r = BP.validateBrandProfile({ name: 'Test School', colors: BP.DEFAULT_COLORS });
    expect(r.ok).toBe(true);
  });
  it('blocks a profile whose body text fails AA contrast on its background', () => {
    const r = BP.validateBrandProfile({
      name: 'Low Contrast',
      colors: { ...BP.DEFAULT_COLORS, body: '#eeeeee', bg: '#ffffff' },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /body text vs background contrast/i.test(e))).toBe(true);
  });
});

describe('brandProfileToHeaderHTML (XSS escaping)', () => {
  it('escapes user-supplied header text', () => {
    const html = BP.brandProfileToHeaderHTML({
      name: 'x',
      header: { text: '<script>alert(1)</script>', showLogo: false },
      colors: BP.DEFAULT_COLORS,
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
  it('returns empty string when there is no header content', () => {
    expect(BP.brandProfileToHeaderHTML(null)).toBe('');
    expect(BP.brandProfileToHeaderHTML({ header: { text: '', showLogo: false } })).toBe('');
  });
});

describe('brandProfileToFooterHTML', () => {
  it('renders the page number when enabled', () => {
    const html = BP.brandProfileToFooterHTML({ footer: { text: '', showPageNumber: true } }, 5);
    expect(html).toContain('Page 5');
  });
});
