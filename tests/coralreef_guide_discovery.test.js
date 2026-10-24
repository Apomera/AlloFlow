import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Description search broadens discovery without silently changing the existing
// name search or creating scientific content beyond the displayed field files.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, TX, profiles;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
  profiles = X.marineProfiles((key, fallback) => fallback);
});

const normalized = (value) => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]|['.,()\u2019-]/g, '').replace(/\s+/g, ' ').trim();
// Pin the previous public behavior independently, including underscore queries.
const priorNameMatch = (query, tx, meta) => {
  const q = normalized(query);
  const hay = normalized(tx.name) + ' ' + normalized(meta.scientific) + ' ' + meta.id.replace(/_/g, ' ');
  return q.split(' ').every((word) => hay.includes(word));
};
const metaFor = (id) => X.SPECIES_META.find((meta) => meta.id === id);
const search = (query, id, mode = 'description') => X.marineGuideSearch(query, TX[id], metaFor(id), profiles[id], mode);

describe('marine guide discovery search', () => {
  it('preserves Names matching across all existing names, IDs and scientific names', () => {
    const queries = ['', '  ', 'BLUE tang', 'Paracanthurus hepatus', 'blue_tang', 'blue tang', "BLEEKER’S parrotfish", 'Acropora', 'reef star', 'white bands', 'impossible organism'];
    for (const meta of X.SPECIES_META) {
      const tx = TX[meta.id];
      const allQueries = queries.concat([tx.name, meta.id, meta.id.replace(/_/g, ' '), meta.scientific || '']);
      for (const query of allQueries) {
        const expected = priorNameMatch(query, tx, meta);
        expect(X.marineGuideSearch(query, tx, meta, profiles[meta.id], 'names'), meta.id + ' names: ' + query).toBe(expected);
        expect(X.marineGuideSearch(query, tx, meta, profiles[meta.id]), meta.id + ' default: ' + query).toBe(expected);
      }
    }
  });

  it('finds existing field marks and ecological details while requiring every query token', () => {
    expect(search('white bands anemone', 'clownfish')).toBe(true);
    expect(search('three bands sheltered lagoons', 'clownfish')).toBe(true);
    expect(search('plankton branching coral', 'blue_tang')).toBe(true);
    expect(search('palette yellow tail currents', 'blue_tang')).toBe(true);
    expect(search('fish Paracanthurus', 'blue_tang')).toBe(true);
    expect(search('white bands absentword', 'clownfish')).toBe(false);
    expect(search('anemone', 'blue_tang')).toBe(false);
    expect(search('white bands', 'clownfish', 'names')).toBe(false);
    expect(search('currents', 'blue_tang', 'names')).toBe(false);
  });

  it('normalizes case, accents, punctuation and whitespace across localized text', () => {
    const tx = { name: 'Poisson céleste', marks: ['Lignes bleu-vert'], role: 'Broute les algues.', fact: 'Vit près d’un récif.' };
    const meta = { id: 'poisson_celeste', scientific: 'Exemplum testé', group: 'fish' };
    const profile = { habitat: 'Lagons abrités', diet: 'Petits crustacés', behavior: 'Un couple', observe: 'Regardez la nageoire.' };
    expect(X.marineGuideSearch(' CÉLESTE   bleu-vert abrites crustaces COUPLE nageoire ', tx, meta, profile, 'description')).toBe(true);
    expect(X.marineGuideSearch('poisson celeste', {}, meta, {}, 'description')).toBe(true);
    expect(X.marineGuideSearch('testé poissons', tx, meta, profile, 'description')).toBe(false);
    expect(X.marineGuideSearch('crustacés', tx, meta, profile, 'names')).toBe(false);
  });

  it('indexes every specified field, without indexing source IDs or unrelated metadata', () => {
    const tx = { name: 'common', marks: ['markfirst', 'marksecond'], role: 'roleword', fact: 'factword' };
    const meta = { id: 'sample_id', scientific: 'scientificword', group: 'groupword', iucn: 'privateStatus' };
    const profile = { habitat: 'habitatword', diet: 'dietword', behavior: 'behaviorword', observe: 'observeword', sources: ['sourceHidden'] };
    const query = 'common scientificword sample id groupword markfirst marksecond roleword habitatword dietword behaviorword observeword';
    expect(X.marineGuideSearch(query, tx, meta, profile, 'description')).toBe(true);
    expect(X.marineGuideSearch('sourceHidden', tx, meta, profile, 'description')).toBe(false);
    expect(X.marineGuideSearch('privateStatus', tx, meta, profile, 'description')).toBe(false);
    expect(X.marineGuideSearch('factword', tx, meta, profile, 'description')).toBe(false);
  });

  it('handles empty and malformed input safely without matching object serializations', () => {
    for (const value of [undefined, null, '', '  ', [], {}, false]) {
      expect(X.marineGuideSearch(value, null, null, null, 'names')).toBe(true);
      expect(X.marineGuideSearch(value, null, null, null, 'description')).toBe(true);
    }
    for (const value of [undefined, null, [], 'bad', true, 7]) {
      expect(X.marineGuideSearch('reef', value, value, value, 'names')).toBe(false);
      expect(X.marineGuideSearch('reef', value, value, value, 'description')).toBe(false);
    }
    const invalid = { name: {}, marks: [{ text: 'reef' }, null, 42, 'actualmark'], role: ['reef'], fact: false };
    const meta = { id: null, scientific: {}, group: ['reef'] };
    const profile = { habitat: {}, diet: ['reef'], behavior: false, observe: 12 };
    expect(X.marineGuideSearch('reef', invalid, meta, profile, 'description')).toBe(false);
    expect(X.marineGuideSearch('object', invalid, meta, profile, 'description')).toBe(false);
    expect(X.marineGuideSearch('actualmark', invalid, meta, profile, 'description')).toBe(true);
    expect(X.marineGuideSearch('actualmark', invalid, meta, profile, 'unknown-mode')).toBe(false);
  });
});

describe('marine guide search evidence', () => {
  const evidence = (query, id) => X.marineGuideSearchEvidence(query, TX[id], metaFor(id), profiles[id]);

  it('explains existing habitat, diet and field-mark matches with original displayed text', () => {
    const turtle = evidence('seagrass', 'green_turtle');
    expect(turtle.length).toBeGreaterThan(0);
    expect(turtle.length).toBeLessThanOrEqual(2);
    expect(['habitat', 'diet', 'role']).toContain(turtle[0].field);
    expect(turtle[0].text.toLowerCase()).toContain('seagrass');
    const grouper = evidence('blue spots', 'peacock_grouper');
    expect(grouper[0].field).toBe('marks');
    expect(grouper[0].text.toLowerCase()).toContain('blue');
    expect(grouper[0].text.toLowerCase()).toContain('spots');
    for (const snippet of turtle.concat(grouper)) {
      expect(Object.keys(snippet).sort()).toEqual(['field', 'text']);
      expect(typeof snippet.text).toBe('string');
    }
  });

  it('prefers complementary descriptions over repeating words already explained by the name', () => {
    const tx = { name: 'Blue fish', marks: ['Blue fish with golden dots', 'Golden dots beside the eye'], role: 'Grazes algae', fact: 'Hidden facttoken' };
    const meta = { id: 'blue_fish', scientific: 'Taxon exemplum', group: 'fish' };
    const profile = { habitat: 'Sheltered lagoon', diet: 'Small crustaceans', behavior: 'Pairs at dusk', observe: 'Golden dots beside the eye' };
    expect(X.marineGuideSearchEvidence('blue fish golden lagoon', tx, meta, profile)).toEqual([
      { field: 'marks', text: 'Blue fish with golden dots' },
      { field: 'habitat', text: 'Sheltered lagoon' }
    ]);
    expect(X.marineGuideSearchEvidence('golden dots eye', tx, meta, profile)).toEqual([
      { field: 'marks', text: 'Golden dots beside the eye' }
    ]);
    expect(X.marineGuideSearchEvidence('blue Taxon fish', tx, meta, profile)).toEqual([]);
    expect(X.marineGuideSearchEvidence('facttoken', tx, meta, profile)).toEqual([]);
  });

  it('ignores unrelated or malformed values and normalizes query text without changing excerpts', () => {
    const tx = { name: 'Exemple', marks: [null, 1, {}, 'Écailles bleu-vert'], role: ['poison'], fact: 'facttoken' };
    const meta = { id: 'exemple', scientific: null, group: 'fish' };
    const profile = { habitat: 'Lagon abrité', diet: ['poison'], behavior: null, observe: {}, sources: ['sourceHidden'] };
    expect(X.marineGuideSearchEvidence('ECAILLES BLEU-VERT abrite', tx, meta, profile)).toEqual([
      { field: 'marks', text: 'Écailles bleu-vert' },
      { field: 'habitat', text: 'Lagon abrité' }
    ]);
    for (const query of ['sourceHidden', 'facttoken', 'poison', 'object', 'absent']) expect(X.marineGuideSearchEvidence(query, tx, meta, profile)).toEqual([]);
    for (const query of ['', '  ', undefined, null, {}, []]) expect(X.marineGuideSearchEvidence(query, tx, meta, profile)).toEqual([]);
    for (const invalid of [null, undefined, [], 'bad', true]) expect(X.marineGuideSearchEvidence('reef', invalid, invalid, invalid)).toEqual([]);
  });
});
