import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
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
    expect(source).toContain("e.key === 'Enter' || e.key === ' '");
  });

  it('does not expose the noninteractive free space as a button', () => {
    const source = files[0][1];
    expect(source).toContain("role={cell.type === 'free' ? undefined : 'button'}");
    expect(source).toContain("tabIndex={cell.type === 'free' ? -1 : 0}");
    expect(source).toContain("aria-pressed={cell.type === 'free' ? undefined : isMarked}");
  });

  it('hides decorative icons and respects reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Gamepad2 size={24} aria-hidden="true" />');
    expect(source).toContain('<X size={24} aria-hidden="true" />');
    expect(source).toContain('motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95');
    expect(source).toContain('motion-safe:animate-bounce');
    expect(source).toContain('motion-safe:animate-[stamp_0.3s_ease-out_forwards]');
  });
});