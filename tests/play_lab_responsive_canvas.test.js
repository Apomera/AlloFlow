import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_playlab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_playlab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('PlayLab responsive field canvas', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('keeps the drawing buffer logical while the displayed canvas remains fluid', () => {
    const text = source();
    // 2026-11-23: the field is drawn play-art style (offense at the bottom) and needs
    // height, so the box is 9:5 on a wide screen and 4:3 on a phone. The buffer used to be a
    // fixed 720 x 360 scaled down by CSS, which made 8 px labels 4 px tall at 390 px wide.
    // It now follows the box (CSS pixels), so 12 px text is 12 px at every width.
    expect(text).toContain('height:auto;aspect-ratio:9/5');
    expect(text).toContain('.playlab-field-canvas{aspect-ratio:4/3');
    expect(text).not.toContain('aspect-ratio:2/1');
    expect(text).toContain("canvas.style.width = '100%'");
    expect(text).toContain("canvas.style.height = 'auto'");
    expect(text).not.toContain("canvas.style.width = logicalW + 'px'");
    expect(text).not.toContain('width: 720, height: 360,');
    expect(text).not.toContain('_plSetupHiDPI(canvas, 720, 360)');
    expect(text).toContain('var logicalW = Math.round(canvas.clientWidth || 0) || 720;');
    expect(text).toContain('_plSetupHiDPI(canvas, logicalW, logicalH)');
    // A ResizeObserver keeps the buffer in step with the box, and is released on unmount.
    expect(text).toContain('new window.ResizeObserver(measure)');
    expect(text).toContain('ro.disconnect()');
  });
});
