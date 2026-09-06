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
      expect(section.classList.contains('allo-tree-lab-section')).toBe(true);
    }
    // Link text matches the section it points at, so the nav cannot drift from the content.
    links.forEach((a, i) => expect(a.textContent).toBe(host.querySelector('#' + IDS[i]).getAttribute('aria-label')));
    expect(new Set(IDS.map(id => host.querySelectorAll('#' + id).length))).toEqual(new Set([1]));
  });

  it('wraps the real panels, keeps them in document order, and appears only in the Grow view', () => {
    const host = mount();
    const order = [...host.querySelectorAll('.allo-tree-lab-section')].map(s => s.id);
    expect(order).toEqual(IDS);
    // Each section still contains its panel's own heading text, so nothing was left outside.
    expect(host.querySelector('#grow-sec-clock').textContent).toContain('Run the clock');
    expect(host.querySelector('#grow-sec-budget').textContent).toContain('carbon budget');
    expect(host.querySelector('#grow-sec-conditions').textContent).toContain('Conditions');
    expect(host.querySelector('#grow-sec-surplus').textContent).toContain('surplus');
    // Spread and Check are short enough that they carry no navigator at all.
    for (const view of ['spread', 'quiz']) {
      const other = mount({ view });
      expect(other.querySelector('.allo-tree-grow-nav'), view).toBeNull();
      expect(other.querySelectorAll('.allo-tree-lab-section'), view).toHaveLength(0);
    }
    // Chemistry and Transport have navigators of their own, but never Grow's sections.
    for (const view of ['chem', 'transport']) {
      const other = mount({ view });
      expect(other.querySelector('.allo-tree-grow-nav'), view).not.toBeNull();
      for (const id of IDS) expect(other.querySelector('#' + id), view + ' ' + id).toBeNull();
    }
  });

  it('keeps the navigator and its sections in the K-2 band, where the folded panels differ', () => {
    const k2 = mount({ bandOverride: 'k2' });
    expect(k2.querySelector('.allo-tree-grow-nav')).not.toBeNull();
    for (const id of IDS) expect(k2.querySelector('#' + id), id).not.toBeNull();
    expect([...k2.querySelectorAll('.allo-tree-grow-nav a')]).toHaveLength(5);
  });
});

const XPORT_IDS = ['xport-sec-pipes', 'xport-sec-sugar', 'xport-sec-trunk', 'xport-sec-girdling'];

describe('Transport view section navigator', () => {
  it('reuses the shared navigator for its four cards', () => {
    const host = mount({ view: 'transport' });
    const nav = host.querySelector('.allo-tree-grow-nav');
    expect(nav).not.toBeNull();
    const links = [...nav.querySelectorAll('a')];
    expect(links.map(a => a.getAttribute('href'))).toEqual(XPORT_IDS.map(id => '#' + id));
    for (const id of XPORT_IDS) {
      const section = host.querySelector('#' + id);
      expect(section, id).not.toBeNull();
      expect(section.tagName).toBe('SECTION');
      expect(section.getAttribute('tabindex')).toBe('-1');
      expect(section.classList.contains('allo-tree-lab-section')).toBe(true);
    }
    links.forEach((a, i) => expect(a.textContent).toBe(host.querySelector('#' + XPORT_IDS[i]).getAttribute('aria-label')));
    expect([...host.querySelectorAll('.allo-tree-lab-section')].map(s => s.id)).toEqual(XPORT_IDS);
  });

  it('keeps each Transport card intact inside its section and does not leak Grow ids', () => {
    const host = mount({ view: 'transport' });
    expect(host.querySelector('#xport-sec-pipes').textContent).toContain('Two separate plumbing systems');
    expect(host.querySelector('#xport-sec-trunk').textContent).toContain('Inside the trunk');
    expect(host.querySelector('#xport-sec-girdling').textContent).toContain('ring of bark');
    // The card classes still live inside the wrapper, so styling and other tests are unaffected.
    expect(host.querySelector('#xport-sec-pipes .allo-tree-transport-story')).not.toBeNull();
    expect(host.querySelector('#xport-sec-sugar .allo-tree-sugar-map')).not.toBeNull();
    expect(host.querySelector('#xport-sec-trunk .allo-tree-trunk-card')).not.toBeNull();
    expect(host.querySelector('#xport-sec-girdling .allo-tree-girdling-card')).not.toBeNull();
    for (const id of IDS) expect(host.querySelector('#' + id), id).toBeNull();
    const grow = mount();
    for (const id of XPORT_IDS) expect(grow.querySelector('#' + id), id).toBeNull();
  });
});

describe('Chemistry view navigator adapts to the band', () => {
  const linkIds = host => [...host.querySelectorAll('.allo-tree-grow-nav a')].map(a => a.getAttribute('href').slice(1));

  it('lists only the sections that actually rendered for the band', () => {
    // Grades 9-12 get every card, including the two gated ones.
    const g912 = mount({ view: 'chem', bandOverride: 'g912' });
    expect(linkIds(g912)).toEqual(['chem-sec-reaction', 'chem-sec-curves', 'chem-sec-limits', 'chem-sec-trade', 'chem-sec-bill']);
    // Grades 6-8 lose the respiration bill; the navigator must lose that link too.
    const g68 = mount({ view: 'chem', bandOverride: 'g68' });
    expect(linkIds(g68)).toEqual(['chem-sec-reaction', 'chem-sec-curves', 'chem-sec-limits', 'chem-sec-trade']);
    expect(g68.querySelector('#chem-sec-bill')).toBeNull();
    // Grades 3-5 lose the trade card as well.
    const g35 = mount({ view: 'chem', bandOverride: 'g35' });
    expect(linkIds(g35)).toEqual(['chem-sec-reaction', 'chem-sec-curves', 'chem-sec-limits']);
    expect(g35.querySelector('#chem-sec-trade')).toBeNull();
    // Every link in every band resolves to a real section: no dangling targets.
    for (const host of [g912, g68, g35]) {
      for (const id of linkIds(host)) {
        const section = host.querySelector('#' + id);
        expect(section, id).not.toBeNull();
        expect(section.getAttribute('tabindex')).toBe('-1');
        expect(section.classList.contains('allo-tree-lab-section')).toBe(true);
      }
    }
  });

  it('keeps the K-2 chemistry view free of a navigator it does not need', () => {
    const k2 = mount({ view: 'chem', bandOverride: 'k2' });
    expect(k2.querySelector('.allo-tree-grow-nav')).toBeNull();
    expect(k2.querySelectorAll('.allo-tree-lab-section')).toHaveLength(0);
  });

  it('puts the navigator first and keeps each chemistry card inside its section', () => {
    const host = mount({ view: 'chem', bandOverride: 'g912' });
    const panel = host.querySelector('.allo-tree-panel');
    expect(panel.firstElementChild.classList.contains('allo-tree-grow-nav')).toBe(true);
    expect(host.querySelector('#chem-sec-curves .allo-tree-curves-card')).not.toBeNull();
    expect(host.querySelector('#chem-sec-limits .allo-tree-chem-limits')).not.toBeNull();
    expect(host.querySelector('#chem-sec-trade .allo-tree-chem-trade')).not.toBeNull();
    expect(host.querySelector('#chem-sec-bill .allo-tree-chem-bill')).not.toBeNull();
    const links = [...host.querySelectorAll('.allo-tree-grow-nav a')];
    links.forEach(a => expect(a.textContent).toBe(host.querySelector('#' + a.getAttribute('href').slice(1)).getAttribute('aria-label')));
  });
});

const CMP_IDS = ['cmp-sec-experiment', 'cmp-sec-trail', 'cmp-sec-species', 'cmp-sec-next'];

describe('Compare view section navigator', () => {
  it('gives the longest unaided view the same four jump targets', () => {
    const host = mount({ view: 'compare' });
    const nav = host.querySelector('.allo-tree-grow-nav');
    expect(nav).not.toBeNull();
    expect([...nav.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(CMP_IDS.map(id => '#' + id));
    expect(host.querySelector('.allo-tree-panel').firstElementChild.classList.contains('allo-tree-grow-nav')).toBe(true);
    for (const id of CMP_IDS) {
      const section = host.querySelector('#' + id);
      expect(section, id).not.toBeNull();
      expect(section.tagName).toBe('SECTION');
      expect(section.getAttribute('tabindex')).toBe('-1');
      expect(section.getAttribute('aria-label'), id).toBeTruthy();
      expect(host.querySelectorAll('#' + id), id).toHaveLength(1);
    }
    // Every link is named by the region it opens, so the two are never heard as different places.
    [...nav.querySelectorAll('a')].forEach(a => expect(a.textContent).toBe(host.querySelector('#' + a.getAttribute('href').slice(1)).getAttribute('aria-label')));
  });

  it('keeps each compare block whole and leaves the species landmark single', () => {
    const host = mount({ view: 'compare' });
    expect(host.querySelector('#cmp-sec-experiment .allo-tree-compare-hero')).not.toBeNull();
    expect(host.querySelector('#cmp-sec-next .allo-tree-compare-conclusion')).not.toBeNull();
    expect(host.querySelector('#cmp-sec-species .allo-tree-species-grid')).not.toBeNull();
    // The species stage was already a labelled section; it is the jump target itself rather
    // than a second wrapper repeating the same name.
    expect(host.querySelectorAll('.allo-tree-species-stage')).toHaveLength(1);
    expect(host.querySelector('#cmp-sec-species').classList.contains('allo-tree-species-stage')).toBe(true);
    expect(host.querySelectorAll('#cmp-sec-species .allo-tree-species-card').length).toBe(5);
    for (const id of IDS.concat(XPORT_IDS)) expect(host.querySelector('#' + id), id).toBeNull();
    const grow = mount();
    for (const id of CMP_IDS) expect(grow.querySelector('#' + id), id).toBeNull();
  });

  it('drops any link whose block the band does not render', () => {
    // K-2 has no Compare tab at all (min g35), so asking for the view lands back in Grow.
    const k2 = mount({ view: 'compare', bandOverride: 'k2' });
    expect(k2.querySelectorAll('[id^="cmp-sec-"]')).toHaveLength(0);
    for (const band of ['g35', 'g68', 'g912']) {
      const host = mount({ view: 'compare', bandOverride: band });
      const ids = [...host.querySelectorAll('.allo-tree-grow-nav a')].map(a => a.getAttribute('href').slice(1));
      expect(ids.length, band).toBeGreaterThanOrEqual(2);
      for (const id of ids) expect(host.querySelector('#' + id), band + ' ' + id).not.toBeNull();
      // Document order, not the order the blocks were authored in.
      expect([...host.querySelectorAll('[id^="cmp-sec-"]')].map(s => s.id), band).toEqual(ids);
    }
    // Four full Compare renders (five simulated species each) run past the 5s default.
  }, 30000);
});
