import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Timeline Game full-screen dialog accessibility', () => {
  it.each(files)('%s exposes a named modal dialog using shared focus management', (_path, source) => {
    expect(source).toContain('timeline-game-title');
    expect(source).toContain('timelineDialogRef');
    expect(source).toContain('useGameDialogFocus');
    expect(source).toMatch(/(?:aria-modal="true"|"aria-modal":\s*"true")/);
  });

  it.each(files)('%s retains keyboard drag alternatives', (_path, source) => {
    expect(source).toContain('keyboardLiftedIdx');
    expect(source).toContain('handleKeyDown');
    expect(source).toContain('moveItem');
  });

  it('focuses a named 44 CSS-pixel Close control and hides its icon', () => {
    const source = files[0][1];
    expect(source).toContain('ref={timelineCloseRef}');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('<X size={24} aria-hidden="true"/>');
  });

  it('retains reduced-motion-aware entry', () => {
    expect(files[0][1]).toContain("useReducedMotion() ? '' : ' animate-in fade-in duration-300'");
  });
});