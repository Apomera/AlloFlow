import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Memory Game accessibility', () => {
  it.each(files)('%s exposes a named region and completion focus target', (_path, source) => {
    expect(source).toContain('memory-game-title');
    expect(source).toContain('memoryPlayAgainRef');
    expect(source).toContain('memory.victory');
  });

  it('uses button-group semantics for an independently operable card board', () => {
    const source = files[0][1];
    const component = source.slice(source.indexOf('const MemoryGame ='), source.indexOf('const MatchingGame ='));
    expect(component).toContain('role="group"');
    expect(component).not.toContain('role="grid"');
    expect(component).toContain('role="button"');
    expect(component).toContain("e.key === 'Enter' || e.key === ' '");
  });

  it('provides 44 CSS-pixel header controls and exposes fullscreen state', () => {
    const source = files[0][1];
    const component = source.slice(source.indexOf('const MemoryGame ='), source.indexOf('const MatchingGame ='));
    expect(component.match(/min-w-11 min-h-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(component.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(6);
    expect(component).toContain('aria-pressed={isFullscreen}');
    expect(component).toContain('focus:ring-2 focus:ring-indigo-500');
  });

  it('exposes completion as status and moves focus to Play again', () => {
    const source = files[0][1];
    expect(source).toContain('role="status" className={`flex flex-col');
    expect(source).toContain('ref={memoryPlayAgainRef}');
    expect(source).toContain('requestAnimationFrame(() => memoryPlayAgainRef.current?.focus())');
  });

  it('hides decorative icons and honors reduced motion for card and control transforms', () => {
    const source = files[0][1];
    expect(source).toContain('<Brain size={20} aria-hidden="true" />');
    expect(source).toContain('<HelpCircle size={20} strokeWidth={2.25} aria-hidden="true" />');
    expect(source).toContain("!useReducedMotion() ? 'transition-all duration-500");
    expect(source).toContain("!isFlipped && !isMatched && !useReducedMotion()");
    expect(source).toContain('motion-safe:active:scale-95');
  });
});