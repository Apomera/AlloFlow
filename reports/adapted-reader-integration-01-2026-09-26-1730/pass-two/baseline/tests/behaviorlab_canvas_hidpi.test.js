import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_behaviorlab.js');

// Every canvas in this tool is a scientific instrument read by the SHAPE of a
// thin stroke: an FR post-reinforcement pause, a VR straight line, an FI
// scallop. The chamber canvas scaled its backing store by devicePixelRatio;
// the two that carry the actual data did not, so on any 2x display the curves
// the tool teaches slope-reading on were upscaled and soft.
describe('Behavior Lab canvas rendering fidelity', () => {
  it('scales every canvas backing store by devicePixelRatio', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');

    // One getContext('2d') per canvas surface; each needs its own DPR scale.
    const contexts = (src.match(/getContext\('2d'\)/g) || []).length;
    const dprReads = (src.match(/devicePixelRatio/g) || []).length;
    const transforms = (src.match(/setTransform\(/g) || []).length;

    expect(contexts).toBeGreaterThan(0);
    expect(dprReads, 'a canvas is missing its devicePixelRatio scale').toBe(contexts);
    expect(transforms, 'a canvas scales its backing store but never applies the transform').toBe(contexts);
  });

  it('never sets a backing store straight from an unscaled CSS width', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');

    // The defect shape: `canvas.width = canvas.offsetWidth` assigns CSS pixels
    // to the backing store, which is what produced the blur.
    expect(src).not.toMatch(/\.width\s*=\s*\w*\.?offsetWidth/);
    expect(src).not.toMatch(/\.height\s*=\s*\d+\s*;/);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
