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
    expect(fs.readFileSync('desktop/web-app/public/view_faq_module.js', 'utf8')).toBe(fs.readFileSync('view_faq_module.js', 'utf8'));
  });

  it('announces FAQ audio loading with a motion-safe busy status', () => {
    expect(source).toContain('var isGeneratingAudio = !!props.isGeneratingAudio;');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" aria-busy={isGeneratingAudio}');
    expect(source).toContain('Loading FAQ audio...');
    expect(source).toContain('animate-spin motion-reduce:animate-none text-cyan-600');
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
    expect(source).toContain('prepState.busy ? `${prepState.done}/${prepState.total');
  });

  it('uses the shared sanitizer and compatibility-aware audio statuses', () => {
    expect(source).toContain("typeof phaseK.toSpokenText === 'function'");
    expect(source).toContain('return phaseK.toSpokenText(sentence);');
    expect(source).toContain("return String(sentence || '').replace(");
    expect(source).toContain('st.getCompatible(sentence, {');
    expect(source).toContain('voice: selectedVoice');
    expect(source).toContain('language: effectiveLanguage');
    expect(source).toContain("return compatible ? 'ready' : 'stale';");
    expect(source).toContain('TTS {summary.ready}/{summary.total} ready');
    expect(source).not.toContain('summary.saved');
    expect(source).not.toContain('hasStoredReadAloudAudio');
  });
});
