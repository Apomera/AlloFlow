import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });
function grown(species = 'oak', years = 30) {
  let tree = E.newTree(species); const sp = E.speciesById(species);
  for (let y = 1; y < years; y++) tree = E.simulateYear(tree, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
  return tree;
}
const outline = (data = {}) => {
  const host = document.createElement('div');
  host.innerHTML = renderTool('treeLab', { treeLab: Object.assign({ view: 'grow', tree: grown(), speciesId: 'oak', playing: false }, data) });
  return [...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el => ({
    level: Number(el.tagName.slice(1)),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    hidden: el.classList.contains('allo-tree-sr-only')
  }));
};
const VIEWS = ['grow', 'chem', 'transport', 'spread', 'grove', 'compare', 'quiz'];

// The tool's name was an h3 sitting above the chapter title's h2, so the outline opened one
// level down and then jumped back up. No axe rule catches that: heading-order only reports
// skipped levels going down, and a heading whose level rises is legal to it.
describe('Heading outline', () => {
  it('opens every view with the tool name as its highest heading', () => {
    for (const view of VIEWS) {
      const heads = outline({ view });
      expect(heads.length, view).toBeGreaterThan(1);
      expect(heads[0].level, view).toBe(2);
      expect(heads[0].text, view).toContain('Tree Life Lab');
      // Nothing later outranks it, so no card can read as a peer of the lab itself.
      expect(Math.min(...heads.map(h => h.level)), view).toBe(2);
    }
  }, 20000);

  it('never skips a level on the way down and never leaves a heading empty', () => {
    for (const view of VIEWS) {
      const heads = outline({ view });
      let deepest = heads[0].level;
      for (const head of heads) {
        expect(head.level, view + ': ' + head.text).toBeLessThanOrEqual(deepest + 1);
        deepest = Math.max(deepest, head.level);
        expect(head.text, view).not.toBe('');
      }
    }
  }, 20000);

  it('keeps exactly two top-level headings: the lab and the chapter it is showing', () => {
    for (const view of VIEWS) {
      const tops = outline({ view }).filter(h => h.level === 2);
      expect(tops.length, view).toBe(2);
      expect(tops[0].text, view).toContain('Tree Life Lab');
      expect(tops[1].text.length, view).toBeGreaterThan(0);
    }
  }, 20000);

  it('holds the same shape in every band, where the copy and the cards differ', () => {
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      for (const view of VIEWS) {
        const heads = outline({ view, bandOverride: band });
        const label = band + ' ' + view;
        expect(heads[0].level, label).toBe(2);
        expect(heads.filter(h => h.level === 2).length, label).toBe(2);
        let deepest = heads[0].level;
        for (const head of heads) {
          expect(head.level, label + ': ' + head.text).toBeLessThanOrEqual(deepest + 1);
          deepest = Math.max(deepest, head.level);
        }
      }
    }
  }, 30000);
});
