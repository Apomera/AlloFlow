import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Matching Game full-screen dialog accessibility', () => {
  it.each(files)('%s exposes a named modal dialog', (_path, source) => {
    expect(source).toContain('matching-game-title');
    expect(source).toMatch(/(?:aria-modal="true"|"aria-modal":\s*"true")/);
    expect(source).toContain('matchingDialogRef');
  });

  it.each(files)('%s uses shared focus containment and restoration', (_path, source) => {
    expect(source).toContain('useGameDialogFocus');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('previousFocus?.isConnected');
  });

  it('focuses a named 44 CSS-pixel Close control', () => {
    const source = files[0][1];
    expect(source).toContain('ref={matchingCloseRef}');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('aria-label={t(\'matching.close_aria\')}');
  });

  it('keeps reduced-motion entry behavior', () => {
    expect(files[0][1]).toContain("useReducedMotion() ? '' : ' animate-in fade-in duration-300'");
  });
});