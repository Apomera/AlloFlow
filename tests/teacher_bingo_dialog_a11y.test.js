import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Teacher Bingo generator and caller accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog', (_path, source) => {
    expect(source).toContain('bingo-generator-title');
    expect(source).toContain('bingoDialogRef');
    expect(source).toContain('bingoCloseRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it('associates visible labels with generator and caller inputs', () => {
    const source = files[0][1];
    expect(source).toContain('htmlFor="bingo-card-count"');
    expect(source).toContain('id="bingo-card-count"');
    expect(source).toContain('htmlFor="bingo-call-speed"');
    expect(source).toContain('id="bingo-call-speed"');
  });

  it('announces caller readiness, clues, and autoplay state', () => {
    const source = files[0][1];
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain("setAnnouncement(t('bingo.ready'))");
    expect(source).toContain("t('bingo.current_clue')");
    expect(source).toContain("newState ? t('bingo.start_auto') : t('bingo.stop_auto')");
  });

  it('exposes accurate disclosure and toggle state', () => {
    const source = files[0][1];
    expect(source).toContain('aria-expanded={isHistoryVisible}');
    expect(source).toContain('aria-controls="bingo-called-history"');
    expect(source).toContain('id="bingo-called-history"');
    expect(source).toContain('aria-pressed={isAutoPlaying}');
  });

  it('provides 44 CSS-pixel close and caller navigation targets with visible focus', () => {
    const source = files[0][1];
    expect(source).toContain('ref={bingoCloseRef}');
    expect(source.match(/min-w-11 min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('min-h-11 px-3');
    expect(source).toContain('focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2');
  });

  it('hides decorative icons and honors reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Gamepad2 className="text-rose-500" aria-hidden="true" />');
    expect(source).toContain('<X size={24} aria-hidden="true" />');
    expect(source).toContain('motion-safe:animate-indeterminate-slide');
    expect(source).toContain('motion-safe:slide-in-from-left-2');
    expect(source).toContain('motion-safe:active:scale-95');
  });
});