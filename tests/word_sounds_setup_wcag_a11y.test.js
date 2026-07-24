import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('word_sounds_setup_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8');

describe('Word Sounds Setup WCAG interaction behavior', () => {
  it('provides keyboard alternatives for each draggable workflow', () => {
    expect(source.match(/data-keyboard-alternative=/g)).toHaveLength(3);
    expect(source).toContain("movePhoneme(idx, i, 'left')");
    expect(source).toContain("movePhoneme(idx, i, 'right')");
    expect(source).toContain('aria-label={`Move ${p} left`}');
    expect(source).toContain('aria-label={`Move ${p} right`}');
    expect(source).toContain('disabled={i === 0}');
    expect(source).toContain('disabled={i === word.phonemes.length - 1}');
  });

  it('announces phoneme reordering and its resulting position', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true">{phonemeReorderStatus}');
    expect(source).toContain('moved to position ${toIndex + 1} of ${phonemes.length}.');
  });

  it('retains visible focus rings without redundant outline suppression', () => {
    expect(source).not.toContain('focus-within:outline-none');
    expect(source).not.toContain('p-4 outline-none" role="dialog"');
    expect(source).toContain('focus-within:ring-2');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-violet-600');
  });

  it('uses explicit non-submit types for all native buttons', () => {
    expect(source.match(/<button\b/g)).toHaveLength(73);
    expect(source.match(/\btype="button"/g)).toHaveLength(73);
  });

  it('does not make the image wrapper a pointer-only interaction', () => {
    expect(source).toContain('<div className="relative group/img">');
    expect(source).not.toContain('className="relative group/img" onClick=');
  });
});

describe('Word Sounds Setup reduced motion and generated copies', () => {
  it('adds an operating-system fallback to every persistent and entrance animation', () => {
    for (const line of source.split(/\r?\n/)) {
      if (/animate-(?:pulse|spin|bounce)|animate-in/.test(line)) {
        expect(line).toContain('motion-reduce:animate-none');
      }
    }
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('phonemeReorderStatus');
    expect(moduleSource).toContain('data-keyboard-alternative');
    expect(publicModule).toBe(moduleSource);
  });
});
