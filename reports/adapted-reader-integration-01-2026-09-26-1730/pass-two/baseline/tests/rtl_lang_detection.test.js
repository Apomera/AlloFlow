// RTL language detection (audit #12, 2026-06-15). isRtlLang was an exact case-sensitive English
// NAME match (Arabic/Hebrew/Persian/Urdu/Kurdish/Pashto/Farsi/Yiddish), so "arabic", any BCP-47
// CODE, and Dari/Sindhi/Uyghur/Divehi/Sorani all fell through to LTR — wrong text direction in the
// HTML download AND the typeset tagged PDF. Now accepts code OR name, case-insensitively.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'module_scope_extras_source.jsx'), 'utf8');
const start = src.indexOf('const isRtlLang =');
const end = src.indexOf('const getContentDirection');
if (start === -1 || end === -1) throw new Error('isRtlLang extraction markers missing');
const { isRtlLang } = new Function(src.slice(start, end) + '; return { isRtlLang };')();

describe('isRtlLang', () => {
  it('keeps the original RTL names (no regression) and is now case-insensitive', () => {
    for (const n of ['Arabic', 'Hebrew', 'Persian', 'Urdu', 'Kurdish', 'Pashto', 'Farsi', 'Yiddish']) {
      expect(isRtlLang(n), n).toBe(true);
      expect(isRtlLang(n.toLowerCase()), n.toLowerCase()).toBe(true);
    }
  });
  it('recognizes BCP-47 codes (the reliable signal), incl. region subtags', () => {
    for (const c of ['ar', 'he', 'fa', 'fa-AF', 'prs', 'ur', 'ps', 'ckb', 'sd', 'ug', 'dv', 'yi']) {
      expect(isRtlLang(c), c).toBe(true);
    }
  });
  it('recognizes the previously-missing RTL languages by name', () => {
    for (const n of ['Dari', 'Sindhi', 'Uyghur', 'Divehi', 'Maldivian', 'Sorani', 'Persian (Farsi)']) {
      expect(isRtlLang(n), n).toBe(true);
    }
  });
  it('returns false for LTR languages and codes', () => {
    for (const n of ['English', 'en', 'Spanish', 'es', 'French', 'fr', 'Mandarin', 'zh', 'Swahili', 'Vietnamese']) {
      expect(isRtlLang(n), n).toBe(false);
    }
  });
  it('does NOT substring-false-trigger ("Mandarin" contains the letters d-a-r-i)', () => {
    expect(isRtlLang('Mandarin')).toBe(false);
  });
  it('handles empty / nullish input', () => {
    expect(isRtlLang('')).toBe(false);
    expect(isRtlLang(null)).toBe(false);
    expect(isRtlLang(undefined)).toBe(false);
  });
});
