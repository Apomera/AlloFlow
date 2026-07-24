import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Shared game controls and review accessibility', () => {
  it.each(files)('%s provides 44 CSS-pixel theme and speech controls', (_path, source) => {
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('w-11 h-11');
    expect(source).toContain('GameThemeToggle');
    expect(source).toContain('SpeakButton');
  });

  it('gives both shared controls visible keyboard focus', () => {
    const source = files[0][1];
    expect(source).toContain('focus:ring-2 focus:ring-white focus:ring-offset-2');
    expect(source).toContain('focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2');
  });

  it('hides visual-only theme and speech glyphs', () => {
    const source = files[0][1];
    expect(source).toContain('<span aria-hidden="true">{isContrast');
    expect(source).toContain('<StopCircle size={size} aria-hidden="true" />');
    expect(source).toContain('<Volume2 size={size} aria-hidden="true" />');
  });

  it('preserves speech toggle state and honors reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('aria-pressed={isThisPlaying}');
    expect(source).toContain('motion-safe:animate-pulse');
    expect(source).not.toContain("text-rose-600 animate-pulse' : 'bg-indigo-100");
  });

  it.each(files)('%s exposes review content as a named region', (_path, source) => {
    expect(source).toContain('reviewTitleId');
    expect(source).toContain('aria-labelledby');
    expect(source).toContain('GameReviewScreen');
  });

  it('provides explicit text status for review results and hides the visual mark', () => {
    const source = files[0][1];
    expect(source).toContain('<div aria-hidden="true" className={`w-6 h-6');
    expect(source).toContain('<span className="sr-only">{item.status');
    expect(source).toContain("t('common.incorrect')");
  });

  it('provides 44 CSS-pixel review actions with visible focus and decorative replay icon hiding', () => {
    const source = files[0][1];
    const review = source.slice(source.indexOf('const GameReviewScreen ='), source.indexOf('const MemoryGame ='));
    expect(review.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(review.match(/focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2/g)?.length).toBeGreaterThanOrEqual(2);
    expect(review).toContain('<RefreshCw size={14} aria-hidden="true" />');
  });
});