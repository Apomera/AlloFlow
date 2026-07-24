import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_adventure_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8');

describe('Adventure View WCAG focus behavior', () => {
  it('retains setup focus rings without suppressing the native outline', () => {
    expect(source).not.toContain('focus-within:outline-none');
    expect(source.match(/focus-within:ring-2 focus-within:ring-indigo-700/g)).toHaveLength(7);
  });

  it('allows both programmatically focused dialogs to show native focus', () => {
    expect(source).toContain('ref={ledgerDialogRef} tabIndex={-1}');
    expect(source).toContain('ref={inventoryDialogRef} tabIndex={-1}');
    expect(source).not.toContain('motion-reduce:animate-none focus:outline-none');
  });

  it('keeps every native button explicitly non-submit', () => {
    // 41: 39 - 2 inline per-sentence speaker buttons (removed 2026-07-16; the sentence
    // span is the control) + 2 free-response hint buttons + 2 hint sentence-starter
    // buttons (the nudge-with-XP-cost feature, same day).
    const buttons = source.match(/<button\b/g);
    expect(buttons).toHaveLength(41);
    // The real invariant: every native button declares type="button" (non-submit).
    expect(source.match(/\btype="button"/g)).toHaveLength(buttons.length);
  });
});

describe('Adventure View reduced motion and generated copies', () => {
  it('adds fallbacks to every pulse and every entrance-animation line', () => {
    expect(source).not.toMatch(/animate-pulse(?!\s+motion-reduce:animate-none)/);
    for (const line of source.split(/\r?\n/)) {
      if (line.includes('animate-in')) expect(line).toContain('motion-reduce:animate-none');
    }
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('focus-within:ring-2');
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(publicModule).toBe(moduleSource);
  });
});
