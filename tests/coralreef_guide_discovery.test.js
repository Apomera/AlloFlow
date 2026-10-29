import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Description search broadens discovery without silently changing the existing
// name search or creating scientific content beyond the displayed field files.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, TX, profiles, contexts;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
  profiles = X.marineProfiles((key, fallback) => fallback);
  contexts = X.marineGuideLearningContext((key, fallback) => fallback, TX);
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
const search = (query, id, mode = 'description') => X.marineGuideSearch(query, TX[id], metaFor(id), profiles[id], mode, contexts[id]);

describe('marine guide discovery search', () => {
  it('preserves Names matching across all existing names, IDs and scientific names', () => {
    const queries = ['', '  ', 'BLUE tang', 'Paracanthurus hepatus', 'blue_tang', 'blue tang', "BLEEKER’S parrotfish", 'Acropora', 'reef star', 'white bands', 'notochord', 'Porifera', 'magnificent anemone', 'impossible organism'];
    for (const meta of X.SPECIES_META) {
      const tx = TX[meta.id];
      const allQueries = queries.concat([tx.name, meta.id, meta.id.replace(/_/g, ' '), meta.scientific || '']);
      for (const query of allQueries) {
        const expected = priorNameMatch(query, tx, meta);
        expect(X.marineGuideSearch(query, tx, meta, profiles[meta.id], 'names', contexts[meta.id]), meta.id + ' names: ' + query).toBe(expected);
        expect(X.marineGuideSearch(query, tx, meta, profiles[meta.id], undefined, contexts[meta.id]), meta.id + ' default: ' + query).toBe(expected);
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
    const context = { animalGroup: { label: 'animalword', text: 'anatomyword', source: { title: 'citationTitle', url: 'https://unindexed.example' } },
      connections: [{ partnerName: 'partnerword', text: 'relationshipword', source: { title: 'sourceSecret' } }], hidden: 'privateContext' };
    const query = 'common scientificword sample id groupword markfirst marksecond roleword factword habitatword dietword behaviorword observeword animalword anatomyword partnerword relationshipword';
    expect(X.marineGuideSearch(query, tx, meta, profile, 'description', context)).toBe(true);
    for (const word of ['sourceHidden', 'privateStatus', 'citationTitle', 'unindexed', 'sourceSecret', 'privateContext']) {
      expect(X.marineGuideSearch(word, tx, meta, profile, 'description', context), word).toBe(false);
      expect(X.marineGuideSearchEvidence(word, tx, meta, profile, context), word).toEqual([]);
    }
    expect(X.marineGuideSearch('factword', tx, meta, profile, 'description')).toBe(true);
  });

  it('finds existing deeper facts, animal groups and named ecological partners', () => {
    expect(search('notochord', 'goldmouth_sea_squirt')).toBe(true);
    expect(search('Porifera water outlet', 'barrel_sponge')).toBe(true);
    expect(search('bivalve hinged', 'giant_clam')).toBe(true);
    expect(search('magnificent anemone water movement', 'clownfish')).toBe(true);
    expect(search('harlequin captivity', 'blue_sea_star')).toBe(true);
    expect(search('Porifera notochord', 'goldmouth_sea_squirt')).toBe(false);
    for (const [word, id] of [['notochord', 'goldmouth_sea_squirt'], ['Porifera', 'barrel_sponge'], ['magnificent anemone', 'clownfish']]) expect(search(word, id, 'names')).toBe(false);
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
    const malformedContexts = [undefined, null, [], 'reef', false, 3, { animalGroup: 'reef', connections: 'reef' },
      { animalGroup: { label: ['reef'], text: { value: 'reef' } }, connections: [null, ['reef'], 'reef', 4, { text: ['reef'], partnerName: { value: 'reef' } }] }];
    for (const context of malformedContexts) {
      expect(X.marineGuideSearch('reef', {}, {}, {}, 'description', context)).toBe(false);
      expect(X.marineGuideSearch('object', {}, {}, {}, 'description', context)).toBe(false);
      expect(X.marineGuideSearchEvidence('reef', {}, {}, {}, context)).toEqual([]);
    }
  });
});

describe('marine guide search evidence', () => {
  const evidence = (query, id) => X.marineGuideSearchEvidence(query, TX[id], metaFor(id), profiles[id], contexts[id]);

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
    const tx = { name: 'Blue fish', marks: ['Blue fish with golden dots', 'Golden dots beside the eye'], role: 'Grazes algae', fact: 'Deeper facttoken' };
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
    expect(X.marineGuideSearchEvidence('facttoken', tx, meta, profile)).toEqual([{ field: 'fact', text: tx.fact }]);
  });

  it('ignores unrelated or malformed values and normalizes query text without changing excerpts', () => {
    const tx = { name: 'Exemple', marks: [null, 1, {}, 'Écailles bleu-vert'], role: ['poison'], fact: 'facttoken' };
    const meta = { id: 'exemple', scientific: null, group: 'fish' };
    const profile = { habitat: 'Lagon abrité', diet: ['poison'], behavior: null, observe: {}, sources: ['sourceHidden'] };
    expect(X.marineGuideSearchEvidence('ECAILLES BLEU-VERT abrite', tx, meta, profile)).toEqual([
      { field: 'marks', text: 'Écailles bleu-vert' },
      { field: 'habitat', text: 'Lagon abrité' }
    ]);
    expect(X.marineGuideSearchEvidence('facttoken', tx, meta, profile)).toEqual([{ field: 'fact', text: 'facttoken' }]);
    for (const query of ['sourceHidden', 'poison', 'object', 'absent']) expect(X.marineGuideSearchEvidence(query, tx, meta, profile)).toEqual([]);
    for (const query of ['', '  ', undefined, null, {}, []]) expect(X.marineGuideSearchEvidence(query, tx, meta, profile)).toEqual([]);
    for (const invalid of [null, undefined, [], 'bad', true]) expect(X.marineGuideSearchEvidence('reef', invalid, invalid, invalid)).toEqual([]);
  });

  it('quotes visible facts, group explanations and partner connections without altering their wording', () => {
    expect(evidence('notochord', 'goldmouth_sea_squirt')).toEqual([{ field: 'fact', text: TX.goldmouth_sea_squirt.fact }]);
    const sponge = contexts.barrel_sponge.animalGroup;
    expect(evidence('Porifera', 'barrel_sponge')).toEqual([{ field: 'animalGroup', text: sponge.label + '. ' + sponge.text }]);
    const relation = contexts.blue_sea_star.connections[0];
    expect(evidence('captivity', 'blue_sea_star')).toEqual([{ field: 'connection', text: relation.partnerName + ': ' + relation.text }]);
    const context = { animalGroup: { label: 'Échinoderme', text: 'Bras articulés' }, connections: [{ partnerName: 'Étoile bleue', text: 'Observation en captivité' }] };
    expect(X.marineGuideSearch('echinoderme etoile captivite', {}, {}, {}, 'description', context)).toBe(true);
    expect(X.marineGuideSearchEvidence('ECHINODERME captivite', {}, {}, {}, context)).toEqual([
      { field: 'animalGroup', text: 'Échinoderme. Bras articulés' }, { field: 'connection', text: 'Étoile bleue: Observation en captivité' }
    ]);
    const all = X.marineGuideSearchEvidence('facttoken echinoderme captivite', { fact: 'facttoken' }, {}, {}, context);
    expect(all).toHaveLength(2); expect(all[0].field).toBe('fact');
  });
});

describe('field-guide learning context', () => {
  it('builds a fresh, localized map with reciprocal connections and only displayed text', () => {
    expect(Object.keys(contexts)).toEqual(X.SPECIES_META.map(meta => meta.id));
    expect(contexts.clownfish.connections).toHaveLength(1); expect(contexts.crown_of_thorns.connections).toHaveLength(2);
    expect(contexts.reef_manta).toEqual({ connections: [] });
    expect(Object.keys(contexts.goldmouth_sea_squirt.animalGroup).sort()).toEqual(['label', 'text']);
    for (const connection of X.marineReefConnections((key, fallback) => fallback)) {
      for (const [index, id] of connection.species.entries()) {
        const partnerId = connection.species[1 - index];
        const item = contexts[id].connections.find(item => item.text === connection.text);
        expect(item).toBeTruthy(); expect(Object.keys(item).sort()).toEqual(['partnerName', 'text']);
        expect(TX[partnerId].name).toContain(item.partnerName);
      }
    }
    const localized = X.marineGuideLearningContext((key, fallback) => 'Translated ' + fallback, { ...TX, magnificent_anemone: { ...TX.magnificent_anemone, name: 'Anémone magnifique' } });
    expect(localized.clownfish.connections[0].partnerName).toBe('Anémone magnifique');
    expect(localized.clownfish.connections[0].text).toMatch(/^Translated /);
    expect(localized.giant_clam.animalGroup.label).toMatch(/^Translated /);
    localized.clownfish.connections.length = 0;
    expect(contexts.clownfish.connections).toHaveLength(1);
    expect(X.marineGuideLearningContext((key, fallback) => fallback).clownfish.connections).toHaveLength(1);
  });
});
