import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Word Scramble accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog', (_path, source) => {
    expect(source).toContain('word-scramble-title');
    expect(source).toContain('scrambleDialogRef');
    expect(source).toContain('scrambleInputRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it('announces answers, hints, progress, skips, and completion', () => {
    const source = files[0][1];
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain("setAnnouncement(t('games.scramble.correct')");
    expect(source).toContain("setAnnouncement(t('games.scramble.incorrect')");
    expect(source).toContain("t('games.scramble.progress'");
    expect(source).toContain("t('games.scramble.hint_label')");
    expect(source).toContain("t('common.skip')");
  });

  it('moves initial and round focus to the guess field without native autofocus competition', () => {
    const source = files[0][1];
    expect(source).toContain('ref={scrambleInputRef}');
    expect(source).toContain('requestAnimationFrame(() => scrambleInputRef.current?.focus())');
    expect(source).not.toMatch(/const WordScrambleGame[\s\S]*?autoFocus[\s\S]*?const _MultiZoneColorMap/);
  });

  it('provides a visible 44 CSS-pixel close target and keyboard focus indicators', () => {
    const source = files[0][1];
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2');
    expect(source).toContain("e.key === 'Enter' && handleCheck()");
  });

  it('hides decorative icons and honors reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Type size={32} aria-hidden="true" />');
    expect(source).toContain('<Trophy size={64} className="text-yellow-500 mx-auto mb-4" aria-hidden="true"/>');
    expect(source).toContain('<Search size={12} aria-hidden="true"/>');
    expect(source).toContain('motion-safe:animate-shake');
    expect(source).toContain('motion-safe:animate-in motion-safe:zoom-in-95');
  });
});