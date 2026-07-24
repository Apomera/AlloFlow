import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_platetectonics.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_platetectonics.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Plate Tectonics responsive canvases', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses fluid display dimensions while preserving logical drawing ratios', () => {
    const text = source();
    expect(text.match(/canvas\.style\.width = '100%'; canvas\.style\.height = 'auto';/g)).toHaveLength(2);
    expect(text).toContain("aspectRatio: W_CANVAS + ' / ' + H_CANVAS");
    expect(text).toContain("aspectRatio: '540 / 300'");
    expect(text).not.toContain("canvas.style.width = W_CANVAS + 'px'");
    expect(text).not.toContain("canvas.style.width = W + 'px'");
    expect(text).not.toContain("style: { width: 540, height: 300");
  });
});
