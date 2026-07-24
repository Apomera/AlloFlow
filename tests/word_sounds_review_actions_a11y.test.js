import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds review-row actions', () => {
  it('does not wrap native image actions in an inert simulated button', () => {
    expect(source).not.toContain('<div role="button" tabIndex={0} className="relative group/img"');
    expect(source).toContain('<div className="relative group/img">');
    expect(source).not.toContain('className="relative group/img" onClick=');
  });

  it('gives audio actions word-specific names and large visible focus targets', () => {
    expect(source).toContain("aria-label={`${t('word_sounds.play_word') || 'Play word'}: ${word.targetWord || word.word}`}");
    expect(source).toContain("aria-label={`${t('common.play_phoneme_sequence')}: ${word.targetWord || word.word}`}");
    expect(source).toContain('aria-busy={playingWordIndex === idx}');
    expect(source.match(/min-w-11 min-h-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-pink-600');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-violet-600');
  });

  it('keeps image generation visible, named, stateful, and pointer-independent', () => {
    expect(source).toContain("aria-label={`${t('common.regenerate_image')}: ${word.targetWord || word.word}`}");
    expect(source).toContain("aria-label={`${t('common.generate_image_for_this_word')}: ${word.targetWord || word.word}`}");
    expect(source.match(/aria-busy=\{generatingImageIndex === idx\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('opacity-0 group-hover/img:opacity-100');
    expect(source).toContain('absolute -top-3 -right-3 min-w-11 min-h-11');
    expect(source).toContain('min-h-11 px-3 py-2 rounded-lg');
  });

  it('uses the select native role and synchronizes generated module copies', () => {
    expect(source).toContain("<select aria-label={`${t('common.selection')}: ${word.targetWord || word.word}`}");
    expect(source).not.toContain('role="dialog" onClick={(e) => e.stopPropagation()}');
    expect(readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8'))
      .toBe(readFileSync('word_sounds_setup_module.js', 'utf8'));
  });
});
