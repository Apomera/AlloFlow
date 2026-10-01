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
    const epicenter = text.slice(text.indexOf('window.AlloTectonicsEpicenter = function(props)'), text.indexOf('window.AlloX.InteractiveEpicenter = window.AlloTectonicsEpicenter'));
    const boundary = text.slice(text.indexOf('window.AlloTectonicsInteractive = function(props)'), text.indexOf('window.AlloTectonicsForces = function'));
    expect(boundary).toContain("canvas.style.width = '100%'; canvas.style.height = 'auto';");
    // The event-driven epicenter canvas declares CSS size on its element; its
    // backing store now scales independently for sharper desktop rendering.
    expect(epicenter).toMatch(/style: \{ width: '100%', height: 'auto', aspectRatio: W_CANVAS \+ ' \/ ' \+ H_CANVAS/);
    expect(text).toContain("aspectRatio: W_CANVAS + ' / ' + H_CANVAS");
    expect(text).toContain("aspectRatio: '540 / 300'");
    expect(text).not.toContain("canvas.style.width = W_CANVAS + 'px'");
    expect(text).not.toContain("canvas.style.width = W + 'px'");
    expect(text).not.toContain("style: { width: 540, height: 300");
  });
});
