import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Pipeline Builder dialog accessibility', () => {
  it.each(files)('%s exposes named workspace and completion dialogs', (_path, source) => {
    expect(source).toContain('pipeline-game-title');
    expect(source).toContain('pipeline-victory-title');
    expect(source).toContain('pipeline-victory-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s provides initial completion focus and containment', (_path, source) => {
    expect(source).toContain('pipelinePlayAgainRef');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('retains keyboard connection building and replay focus return', () => {
    const source = files[0][1];
    expect(source).toContain('handleNodeKeyDown');
    expect(source).toContain('keyboardSelectedId');
    expect(source).toContain('pipelineDialogRef.current?.focus()');
  });

  it('uses unique refs and 44 CSS-pixel actions', () => {
    const source = files[0][1];
    expect(source.match(/const pipelineCloseRef/g)).toHaveLength(1);
    expect(source).toContain('ref={pipelineCloseRef}');
    expect(source.match(/min-h-11/g).length).toBeGreaterThanOrEqual(3);
  });
});