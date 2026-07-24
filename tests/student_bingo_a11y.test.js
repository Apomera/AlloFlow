import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Student Bingo accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog', (_path, source) => {
    expect(source).toContain('student-bingo-title');
    expect(source).toContain('studentBingoDialogRef');
    expect(source).toContain('studentBingoCloseRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it('announces mark changes and wins', () => {
    const source = files[0][1];
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain("newMarks.has(key) ? 'marked' : 'unmarked'");
    expect(source).toContain("setAnnouncement(t('bingo.win_message'))");
  });

  it('provides keyboard-visible 44 CSS-pixel controls and cells', () => {
    const source = files[0][1];
    expect(source).toContain('ref={studentBingoCloseRef}');
    expect(source.match(/min-w-11 min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('focus:ring-4 focus:ring-indigo-600 focus:ring-offset-2');
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-pressed={isMarked}');
  });

  it('uses native buttons while keeping the free space noninteractive', () => {
    const source = files[0][1];
    expect(source).toContain("if (cell.type === 'free')");
    expect(source).toContain('return <div key={key}');
    expect(source).toContain('<button');
    expect(source).not.toContain("role={cell.type === 'free' ? undefined : 'button'}");
    expect(source).not.toContain("tabIndex={cell.type === 'free' ? -1 : 0}");
  });

  it('hides decorative icons and respects reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Gamepad2 size={24} aria-hidden="true" />');
    expect(source).toContain('<X size={24} aria-hidden="true" />');
    expect(source).toContain('motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95');
    expect(source).toContain('motion-safe:animate-bounce');
    expect(source).toContain('motion-safe:animate-[stamp_0.3s_ease-out_forwards]');
    expect(source).toContain('isWon && !reducedMotion && <ConfettiExplosion />');
    expect(source).toContain('alt="" aria-hidden="true"');
    expect(source).toContain('flex flex-wrap justify-between');
    expect(source).toContain('overflow-auto');
  });
});