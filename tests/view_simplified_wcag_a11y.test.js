import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_simplified_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_simplified_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/view_simplified_module.js', 'utf8');

describe('Simplified View WCAG controls', () => {
  it('gives every interactive word a strong keyboard focus indicator', () => {
    expect(source.match(/focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1/g)).toHaveLength(5);
  });

  it('uses explicit non-submit types for every native button', () => {
    expect(source.match(/<button\b/g)).toHaveLength(48);
    expect(source.match(/\btype="button"/g)).toHaveLength(48);
  });

  it('keeps cloze completion a non-modal live status', () => {
    expect(source).toContain('data-a11y-overlay="nonmodal-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('fixed inset-0 pointer-events-none');
    expect(source).not.toContain('data-a11y-overlay="nonmodal-status" role="dialog"');
    expect(source).not.toContain('data-a11y-overlay="nonmodal-status" aria-modal');
  });
});

describe('Simplified View reduced motion and generated copies', () => {
  it('adds an immediate reduced-motion fallback to every active animation token', () => {
    expect(source).not.toMatch(/animate-(?:pulse|spin)(?!\s+motion-reduce:animate-none)/);
    expect(source).not.toMatch(/animate-in(?!\s+motion-reduce:animate-none)/);
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('data-a11y-overlay');
    expect(moduleSource).toContain('focus-visible:ring-2');
    expect(publicModule).toBe(moduleSource);
  });
});
