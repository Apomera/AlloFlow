import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Syntax Builder dialog accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog', (_path, source) => {
    expect(source).toContain('syntax-game-title');
    expect(source).toContain('syntaxDialogRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s exposes and focuses completion status', (_path, source) => {
    expect(source).toContain('syntax-complete-title');
    expect(source).toContain('syntaxFinishRef');
    expect(source).toMatch(/role"?\s*[:=]\s*["']status/);
  });

  it('uses named 44 CSS-pixel Close and Finish controls', () => {
    const source = files[0][1];
    expect(source).toContain('ref={syntaxCloseRef}');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('ref={syntaxFinishRef}');
  });

  it('hides decorative icons and respects reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Layout size={24} aria-hidden="true"/>');
    expect(source).toContain('<Trophy size={64} className="text-yellow-500 mx-auto mb-4" aria-hidden="true"/>');
    expect(source).toContain("useReducedMotion() ? '' : ' animate-in zoom-in-95'");
  });
});