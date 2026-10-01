import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Multi-Bucket Sort dialog accessibility', () => {
  it.each(files)('%s exposes named workspace and completion dialogs', (_path, source) => {
    expect(source).toContain('multi-bucket-game-title');
    expect(source).toContain('mb-victory-title');
    expect(source).toContain('mb-victory-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s provides initial completion focus and containment', (_path, source) => {
    expect(source).toContain('playAgainRef');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
  });

  it('retains native keyboard placement and origin focus return', () => {
    const source = files[0][1];
    expect(source).toContain('data-multi-bucket-item-id');
    expect(source).toContain('handleKeyboardMove');
    expect(source).toContain('focusMultiBucketItem');
    expect(source).toContain('cancelMultiBucketSelection');
  });

  it('uses unique refs and 44 CSS-pixel actions', () => {
    const source = files[0][1];
    expect(source.match(/const multiBucketCloseRef/g)).toHaveLength(1);
    expect(source).toContain('ref={multiBucketCloseRef}');
    expect(source.match(/min-h-11/g).length).toBeGreaterThanOrEqual(3);
  });
});