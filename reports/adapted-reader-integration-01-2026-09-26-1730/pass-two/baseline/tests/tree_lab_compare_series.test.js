import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); });
const mount = (overrides) => {
  const host = document.createElement('div');
  host.innerHTML = renderTool('treeLab', { treeLab: { view: 'compare', speciesId: 'oak' } }, overrides);
  return host;
};

// The five growth lines share a chart, so hue alone cannot carry identity: validated across
// all pairs, the dark magenta and aqua steps are 1.6 apart under deuteranopia. The dash
// pattern is the secondary channel that makes the palette legitimate.
describe('Compare chart series identity', () => {
  const themes = [['light', {}], ['dark', { isDark: true }], ['high contrast', { isContrast: true }]];

  it('gives every growth line a distinct dash pattern in every theme', () => {
    for (const [name, overrides] of themes) {
      const host = mount(overrides);
      const lines = [...host.querySelectorAll('polyline[data-species]')];
      expect(lines.length, name).toBeGreaterThanOrEqual(5);
      const dashes = lines.map(l => l.getAttribute('stroke-dasharray') || 'solid');
      // Exactly one solid line; the rest are distinct patterns, so no two lines match.
      expect(new Set(dashes).size, name).toBe(dashes.length);
      expect(dashes.filter(d => d === 'solid'), name).toHaveLength(1);
    }
  });

  it('matches each legend swatch to the dash of the line it names', () => {
    for (const [name, overrides] of themes) {
      const host = mount(overrides);
      const lineDashes = [...host.querySelectorAll('polyline[data-species]')].map(l => l.getAttribute('stroke-dasharray') || 'solid');
      const swatches = [...host.querySelectorAll('svg[width="18"] line')].map(l => l.getAttribute('stroke-dasharray') || 'solid');
      expect(swatches.length, name).toBe(lineDashes.length);
      expect(swatches, name).toEqual(lineDashes);
    }
  });

  it('keeps colour as a second channel where the theme has colour to give', () => {
    const light = mount({});
    const strokes = [...light.querySelectorAll('polyline[data-species]')].map(l => l.getAttribute('stroke'));
    expect(new Set(strokes).size).toBe(strokes.length);
    // High contrast collapses every hue onto the one accent, so the dash carries identity alone.
    const contrast = mount({ isContrast: true });
    const hcStrokes = [...contrast.querySelectorAll('polyline[data-species]')].map(l => l.getAttribute('stroke'));
    expect(new Set(hcStrokes).size).toBe(1);
    const hcDashes = [...contrast.querySelectorAll('polyline[data-species]')].map(l => l.getAttribute('stroke-dasharray') || 'solid');
    expect(new Set(hcDashes).size).toBe(hcDashes.length);
  });
});

// A seedling's whole-year gross photosynthesis is well under 1 kg C. One decimal rounded the
// axis maximum to "0", matching the axis floor, so on first load both ends of every Chemistry
// curve read zero.
describe('Chemistry curve axis labels', () => {
  const axisLabels = (tree) => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('treeLab', { treeLab: Object.assign({ view: 'chem' }, tree ? { tree, speciesId: tree.speciesId } : {}) });
    return [...host.querySelectorAll('.allo-tree-curve-panel')].map(p => {
      // The limiting panel adds a headroom annotation with the same end anchor, and the x
      // axis carries units, so the two y bounds are the only purely numeric labels.
      const axis = [...p.querySelectorAll('text')].map(t => t.textContent).filter(t => /^[0-9]+([.][0-9]+)?$/.test(t));
      return { top: axis[0], bottom: axis[axis.length - 1] };
    });
  };

  it('never labels the top of the axis with the same value as its floor', () => {
    const E = window.__alloTreeLabEngine;
    for (const [name, tree] of [['default seedling', null], ['grown oak', (() => {
      let t = E.newTree('oak'); const sp = E.speciesById('oak');
      for (let y = 1; y < 30; y++) t = E.simulateYear(t, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
      return t;
    })()]]) {
      const panels = axisLabels(tree);
      expect(panels.length, name).toBeGreaterThanOrEqual(4);
      for (const p of panels) {
        expect(p.bottom, name).toBe('0');
        expect(p.top, name).not.toBe('0');
        expect(Number(p.top), name).toBeGreaterThan(0);
      }
    }
  });
});
