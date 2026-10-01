import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_brainatlas.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_brainatlas.js');

const readSource = () => fs.readFileSync(sourcePath, 'utf8');

describe('Brain Atlas diagram overlap regressions', () => {
  it('keeps the source and desktop deploy mirror identical', () => {
    expect(readSource()).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives 3D cutaway labels a fixed measured box instead of a wrapping height mismatch', () => {
    const source = readSource();

    expect(source).toContain('.brainatlas-3d-section-label{position:absolute;display:grid;align-content:center;');
    expect(source).toContain('box-sizing:border-box;width:min(220px,35%);height:64px;');
    expect(source).toContain('padding:5px 7px;overflow:hidden;');
    expect(source).toContain('.brainatlas-3d-section-label strong{-webkit-line-clamp:2;');
    expect(source).toContain('.brainatlas-3d-section-label small{-webkit-line-clamp:2;');
  });

  it('reserves overlay blockers and reduces label density before placing collision-free boxes', () => {
    const source = readSource();

    expect(source).toContain('var labelHeight = 64;');
    expect(source).toContain('var labelGap = 8;');
    expect(source).toContain("stage.querySelector(side === 'left' ? '[data-brainatlas-3d-slice-badge]' : '.brainatlas-3d-credit')");
    expect(source).toContain("stage.querySelector('.brainatlas-3d-selection')");
    expect(source).toContain('Math.floor((availableHeight + labelGap) / (labelHeight + labelGap))');
    expect(source).toContain('visibleEntries.push(entries[Math.round(sampleIndex * (entries.length - 1) / (maxLabels - 1))]);');
    expect(source).toContain('var top = Math.max(desiredTop, previousBottom + labelGap);');
    expect(source).toContain('previousBottom = top + labelHeight;');
    expect(source).toContain("overlay.setAttribute('data-visible', overlay.childNodes.length ? 'true' : 'false')");
    expect(source).not.toContain('Math.min(height - 64, Math.max(entry.y - 20, previousTop))');
  });

  it('moves the neurotransmitter mitochondria and truncates the drug note into dedicated lanes', () => {
    const source = readSource();

    expect(source).toContain('var mitochondriaX = W * 0.80, mitochondriaY = H * 0.255;');
    expect(source).toContain('ctx.fillText(\'Mitochondria\', mitochondriaX, mitochondriaY + H * 0.042);');
    expect(source).toContain('var safeMechText = brainAtlasEllipsizeCanvasText(mechText, mechMaxW - 16);');
    expect(source).toContain('var mechW = Math.min(mechMaxW, ctx.measureText(safeMechText).width + 16);');
    expect(source).toContain("ctx.fillText(safeMechText, W * 0.5, banY + banH + 12);");
  });
});
