import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_playlab.js');
const publicPath = resolve(process.cwd(), 'prismflow-deploy/public/stem_lab/stem_tool_playlab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('PlayLab responsive field canvas', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('keeps the drawing buffer logical while the displayed canvas remains fluid', () => {
    const text = source();
    expect(text).toContain('height:auto;aspect-ratio:2/1');
    expect(text).toContain("canvas.style.width = '100%'");
    expect(text).toContain("canvas.style.height = 'auto'");
    expect(text).not.toContain("canvas.style.width = logicalW + 'px'");
    expect(text).not.toContain('width: 720, height: 360,');
    expect(text).toContain('_plSetupHiDPI(canvas, 720, 360)');
  });
});
