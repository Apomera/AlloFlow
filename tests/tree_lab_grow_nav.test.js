import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });
function grown(species = 'oak', years = 30) {
  let tree = E.newTree(species); const sp = E.speciesById(species);
  for (let y = 1; y < years; y++) tree = E.simulateYear(tree, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
  return tree;
}
const mount = (data = {}, overrides) => {
  const host = document.createElement('div');
  host.innerHTML = renderTool('treeLab', { treeLab: Object.assign({ view: 'grow', tree: grown(), speciesId: 'oak', playing: false }, data) }, overrides);
  return host;
};
const IDS = ['grow-sec-clock', 'grow-sec-budget', 'grow-sec-memory', 'grow-sec-conditions', 'grow-sec-surplus'];

describe('Grow view section navigator', () => {
  it('links to five labelled, focusable landmark sections that exist in the document', () => {
    const host = mount();
    const nav = host.querySelector('.allo-tree-grow-nav');
    expect(nav).not.toBeNull();
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBe('Jump to a step');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map(a => a.getAttribute('href'))).toEqual(IDS.map(id => '#' + id));
    // Every link target exists, is a labelled region and is programmatically focusable.
    for (const id of IDS) {
      const section = host.querySelector('#' + id);
      expect(section, id).not.toBeNull();
      expect(section.tagName).toBe('SECTION');
      expect(section.getAttribute('tabindex')).toBe('-1');
      expect(section.getAttribute('aria-label')).toBeTruthy();
      expect(section.classList.contains('allo-tree-grow-section')).toBe(true);
    }
    // Link text matches the section it points at, so the nav cannot drift from the content.
    links.forEach((a, i) => expect(a.textContent).toBe(host.querySelector('#' + IDS[i]).getAttribute('aria-label')));
    expect(new Set(IDS.map(id => host.querySelectorAll('#' + id).length))).toEqual(new Set([1]));
  });

  it('wraps the real panels, keeps them in document order, and appears only in the Grow view', () => {
    const host = mount();
    const order = [...host.querySelectorAll('.allo-tree-grow-section')].map(s => s.id);
    expect(order).toEqual(IDS);
    // Each section still contains its panel's own heading text, so nothing was left outside.
    expect(host.querySelector('#grow-sec-clock').textContent).toContain('Run the clock');
    expect(host.querySelector('#grow-sec-budget').textContent).toContain('carbon budget');
    expect(host.querySelector('#grow-sec-conditions').textContent).toContain('Conditions');
    expect(host.querySelector('#grow-sec-surplus').textContent).toContain('surplus');
    for (const view of ['chem', 'spread', 'quiz']) {
      const other = mount({ view });
      expect(other.querySelector('.allo-tree-grow-nav'), view).toBeNull();
      expect(other.querySelectorAll('.allo-tree-grow-section'), view).toHaveLength(0);
    }
  });

  it('keeps the navigator and its sections in the K-2 band, where the folded panels differ', () => {
    const k2 = mount({ bandOverride: 'k2' });
    expect(k2.querySelector('.allo-tree-grow-nav')).not.toBeNull();
    for (const id of IDS) expect(k2.querySelector('#' + id), id).not.toBeNull();
    expect([...k2.querySelectorAll('.allo-tree-grow-nav a')]).toHaveLength(5);
  });
});
