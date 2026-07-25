import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const paths = [
  'games_source.jsx',
  'desktop/web-app/src/games_source.jsx',
  'games_module.js',
  'desktop/web-app/public/games_module.js',
];
const files = paths.map((path) => [path, readFileSync(path, 'utf8')]);

describe('Games shared focus, target, and motion styles', () => {
  it.each(files)('%s does not suppress native focus without a replacement', (_path, source) => {
    expect(source).not.toMatch(/outline\s*:\s*none/);
    expect(source).toContain('.bridge-send-input:focus-visible');
    expect(source).toContain('.visual-label input:focus-visible');
    expect(source).toContain('.visual-panel-actions button:focus-visible');
    expect(source).toContain('outline: 3px solid #1d4ed8');
  });

  it.each(files)('%s provides AA-sized shared targets', (_path, source) => {
    expect(source).toContain('.bridge-send-btn { min-height: 44px; }');
    expect(source).toContain('.visual-panel-actions button { min-width: 32px; min-height: 32px;');
    expect(source).toContain('.visual-undo-redo button { min-width: 32px; min-height: 32px;');
    expect(source).toContain('.drawing-toolbar .color-dot { width: 32px; height: 32px;');
    expect(source).toContain('.visual-grid-controls button { min-height: 32px;');
  });

  it.each(files)('%s honors reduced motion and forced colors', (_path, source) => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.visual-panel.adding-label::after { animation: none !important; }');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('outline-color: Highlight');
  });

  it('keeps authored and generated mirrors synchronized', () => {
    expect(files[1][1]).toBe(files[0][1]);
    expect(files[3][1]).toBe(files[2][1]);
  });
});
