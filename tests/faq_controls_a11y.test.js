import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_faq_source.jsx', 'utf8');

describe('FAQ keyboard and control semantics', () => {
  it('uses named native buttons for question and answer sentence audio', () => {
    expect(source.match(/<button type="button" key=\{sIdx\} id=\{`sentence-/g)?.length).toBe(2);
    expect(source.match(/aria-label=\{`Read sentence: \$\{s\}`\}/g)?.length).toBe(2);
    expect(source).not.toContain('return <span key={sIdx} id={`sentence-');
  });

  it('uses a dedicated accordion button instead of a button role containing controls', () => {
    expect(source).toContain('onClick={() => toggleFaq(idx)} aria-expanded={isExpanded}');
    expect(source).toContain('aria-controls={`faq-answer-${idx}`}');
    expect(source).not.toContain('role={!isEditingFaq ? "button" : undefined}');
  });

  it('provides a visible 32 pixel focus target for answer expansion', () => {
    expect(source).toContain('w-8 h-8 inline-flex items-center justify-center');
    expect(source).toContain('focus:ring-2 focus:ring-cyan-500');
    expect(fs.readFileSync('prismflow-deploy/public/view_faq_module.js', 'utf8')).toBe(fs.readFileSync('view_faq_module.js', 'utf8'));
  });
});
