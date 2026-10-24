import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// After a right answer in the dive, the reveal tells the student when the organism
// they found has bleached (anemone, giant clam, coral) or recently died (coral), from
// the dive snapshot's health field. Nothing is said for healthy organisms or for
// species with no algae partners, and nothing is shown before an identification.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(resolve(process.cwd(), TOOL), 'utf8');
const tail = SRC.lastIndexOf('})(');
let notes;
function load() {
  if (notes) return notes;
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  new Function('window', SRC.slice(0, tail) + 'window.__healthNote = healthNote; window.__meta = SPECIES_META;\n' + SRC.slice(tail))(win);
  const t = (k, f) => f;
  const meta = (id) => win.__meta.filter((m) => m.id === id)[0];
  notes = (id, health) => win.__healthNote(id, meta(id), health, t);
  return notes;
}

describe('dive reveal health notes', () => {
  it('explains bleaching for the species with algae partners, and recent death for corals', () => {
    const n = load();
    expect(n('magnificent_anemone', 'bleached')).toMatch(/anemone has bleached/);
    expect(n('magnificent_anemone', 'bleached')).toMatch(/clownfish stay/);
    expect(n('giant_clam', 'bleached')).toMatch(/clam has bleached/);
    expect(n('brain_coral', 'bleached')).toMatch(/coral has bleached/);
    expect(n('staghorn_coral', 'dead')).toMatch(/died recently/);
  });

  it('says nothing for healthy organisms or for species without algae partners', () => {
    const n = load();
    for (const id of ['magnificent_anemone', 'giant_clam', 'brain_coral', 'clownfish']) expect(n(id, 'healthy')).toBeNull();
    for (const id of ['soft_coral', 'sea_fan', 'barrel_sponge', 'clownfish', 'christmas_tree_worm']) expect(n(id, 'bleached')).toBeNull();
    expect(n('giant_clam', 'dead')).toBeNull();
  });

  it('only the reveal (after a right answer) receives the health, and the heatwave site names the partners', () => {
    expect(SRC.includes("right ? h(SpeciesFacts, { env: env, id: f.speciesId, TX: TX, compact: true, health: f.health,")).toBe(true);
    expect(/data-health-note/.test(SRC)).toBe(true);
    const about = SRC.match(/dive_heatwave_about', '([^']*)'/)[1];
    expect(about).toMatch(/Anemones and giant clams have algae partners too/);
    expect(about).toMatch(/tree soft corals and giant sea fans here have none/);
    for (const id of ['hobbs2013', 'beldade2017', 'brahmi2021', 'fabricius1995', 'vanoppen2005']) expect(SRC.includes("id: '" + id + "'"), id).toBe(true);
  });
});
