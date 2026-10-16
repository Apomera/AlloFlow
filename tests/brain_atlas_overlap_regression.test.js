import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_brainatlas.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_brainatlas.js');

const readSource = () => fs.readFileSync(sourcePath, 'utf8');

describe('Brain Atlas diagram overlap regressions', () => {
  it('keeps the source and desktop deploy mirror identical', () => {
    expect(readSource()).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('keeps complete cutaway names selectable outside the unobscured model viewport', () => {
    resetStemLab();
    const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
    const items = Array.from({ length: 18 }, (_, i) => ({ key: 'structure_' + i, label: 'Complete anatomical structure name ' + i, family: 'Named anatomy', icon: 'A' }));
    const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DSliceAxis: 'sagittal', brain3DCutawaySection: { total: items.length, items } } });
    const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
    const nodes = flatten(tool.render(makeCtx({}, store)));
    const stage = nodes.find(el => el.props?.['data-brainatlas-3d-stage'] === 'true');
    const rail = nodes.find(el => el.props?.['data-brainatlas-3d-section-rail'] === 'true');
    const cards = flatten(rail).filter(el => el.props?.className === 'brainatlas-3d-section-item');
    expect(cards).toHaveLength(items.length);
    cards.forEach((card, i) => {
      expect(flatten(card).some(el => el.props?.children === items[i].label)).toBe(true);
      expect(card.props.onClick).toBeTypeOf('function');
    });
    expect(flatten(stage)).not.toContain(rail);
    expect(flatten(stage).some(el => el.props?.['data-brainatlas-3d-section-labels'])).toBe(false);
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
