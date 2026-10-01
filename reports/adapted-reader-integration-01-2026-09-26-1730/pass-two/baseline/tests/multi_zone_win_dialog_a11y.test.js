import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Multi-Zone Sort win dialog accessibility', () => {
  it.each(files)('%s exposes a named and described modal dialog', (_path, source) => {
    expect(source).toContain('multi-zone-win-title');
    expect(source).toContain('multi-zone-win-description');
    expect(source).toMatch(/(?:aria-modal="true"|"aria-modal":\s*"true")/);
  });

  it.each(files)('%s contains Tab, supports Escape, and has initial focus', (_path, source) => {
    expect(source).toContain('playAgainRef');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('returns focus to the game after Play again and respects reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('gameContainerRef.current?.focus()');
    expect(source).toContain("reducedMotion ? '' : ' animate-in zoom-in-95 duration-300'");
  });

  it('provides 44 CSS-pixel actions and hides the celebration emoji', () => {
    const source = files[0][1];
    expect(source.match(/min-h-11 px-4 py-2/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('className="text-5xl mb-3" aria-hidden="true"');
  });
});