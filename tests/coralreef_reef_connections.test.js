import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
const htmlFor = (id, theme = 'light') => renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: id } }, { theme });
function parse(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }
async function mount(id) {
  let data = { coralReef: { section: 'guide', guideSpeciesId: id, speciesFieldNotes: { clownfish: 'Orange and white bands' }, speciesBookmarks: { clownfish: true }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function click(element) {
  expect(element, 'connection target exists').toBeTruthy();
  await React.act(async () => { element.focus(); element.click(); await new Promise(resolve => setTimeout(resolve, 35)); });
}

describe('sourced relationships between reef organisms', () => {
  it('shows the same directional evidence from either partner, with a live target and source', () => {
    const relations = X.marineReefConnections((key, fallback) => fallback);
    expect(relations).toHaveLength(5);
    expect(new Set(relations.map(r => r.id)).size).toBe(relations.length);
    const known = X.SPECIES_META.map(m => m.id);
    for (const relation of relations) {
      expect(relation.species).toHaveLength(2); expect(relation.species[0]).not.toBe(relation.species[1]);
      relation.species.forEach(id => expect(known).toContain(id));
      for (const id of relation.species) {
        const target = relation.species.find(other => other !== id), host = parse(htmlFor(id));
        const card = host.querySelector('[data-reef-connection="' + relation.id + '"]');
        expect(card, relation.id + ' from ' + id).toBeTruthy();
        expect(card.textContent).toContain(relation.text);
        expect(card.querySelector('[data-connection-profile]').dataset.connectionProfile).toBe(target);
        const source = card.querySelector('a');
        expect(source.href).toBe(relation.source.url); expect(source.textContent).toBe(relation.source.title);
        expect(source.rel.split(' ')).toContain('noopener'); expect(source.rel.split(' ')).toContain('noreferrer');
      }
    }
  });

  it('keeps the captive feeding observation and genus-level coral relationship qualified', () => {
    const relations = X.marineReefConnections((key, fallback) => fallback);
    const feeding = relations.find(r => r.id === 'harlequin-blue-star');
    expect(feeding.text).toContain('in captivity'); expect(feeding.text).toContain('Linckia laevigata');
    expect(feeding.source.url).toBe('https://doi.org/10.11609/JoTT.o3506.4819-21');
    const shelter = relations.find(r => r.id === 'chromis-branching-coral');
    expect(shelter.text).toContain('branching Acropora'); expect(shelter.text).toContain('represents this branching coral group');
    const crown = parse(htmlFor('crown_of_thorns')).querySelector('[data-reef-connections]');
    expect([...crown.querySelectorAll('[data-connection-profile]')].map(b => b.dataset.connectionProfile)).toEqual(['giant_triton', 'humphead_wrasse']);
    expect(parse(htmlFor('reef_manta')).querySelector('[data-reef-connections]')).toBeNull();
  });

  it('navigates between connected profiles with heading focus and preserves learner work', async () => {
    const t = await mount('clownfish');
    const initial = { notes: JSON.stringify(t.data.speciesFieldNotes), bookmarks: JSON.stringify(t.data.speciesBookmarks), log: JSON.stringify(t.data.speciesLog) };
    await click(t.host.querySelector('[data-connection-profile="magnificent_anemone"]'));
    let profile = t.host.querySelector('[data-marine-profile="magnificent_anemone"]');
    expect(profile).toBeTruthy(); expect(document.activeElement).toBe(profile.querySelector('h3'));
    await click(t.host.querySelector('[data-connection-profile="clownfish"]'));
    profile = t.host.querySelector('[data-marine-profile="clownfish"]');
    expect(profile).toBeTruthy(); expect(document.activeElement).toBe(profile.querySelector('h3'));
    expect(JSON.stringify(t.data.speciesFieldNotes)).toBe(initial.notes);
    expect(JSON.stringify(t.data.speciesBookmarks)).toBe(initial.bookmarks);
    expect(JSON.stringify(t.data.speciesLog)).toBe(initial.log);
    expect(t.data.speciesPractice).toBeUndefined(); expect(t.host.querySelector('canvas')).toBeNull();
  });

  it('keeps connection cards accessible in every theme', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const host = parse(htmlFor('crown_of_thorns', theme)), panel = host.querySelector('[data-reef-connections]');
      expect(panel.querySelector('h4').textContent).toBe('Reef connections');
      expect(panel.querySelectorAll('h5')).toHaveLength(2);
      const result = await runIsolatedAxe(panel.outerHTML);
      expect(result.violations.map(v => v.id), theme).toEqual([]);
    }
  }, 60000);
});
