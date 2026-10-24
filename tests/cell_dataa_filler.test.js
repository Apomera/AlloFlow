import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { auditTable, extractTables, hasFindings, libraryTitleKeys, ENFORCED_TABLES, REPORTED_TABLES } from './cell_dataa_table_audit.js';

/**
 * Cell Simulator reference tables: the data has to be TRUE, not just present.
 *
 * Found 2026-10-18: MICROBE_SPECIES (213 rows) carried habitat, pathogenicity and culturable
 * values that cycled through fixed lists in id order, regardless of species. E. coli was
 * "Culturable: Difficult", Staphylococcus aureus "Habitat: Aquatic", Treponema pallidum
 * (syphilis) "Pathogenicity: None, Culturable: Yes", Borrelia burgdorferi "Habitat: Marine".
 * HUMAN_CELLS.lifespan cycled (Neutrophil "Months"), CELL_CAREERS education/salary/employer
 * cycled (Hospital Lab Tech "PhD + Postdoc, $100-200K") and CELL_TRIVIA.category cycled
 * ("Mitochondria have their own circular DNA" filed under Disease). The Library showed all of
 * it to students as fact. Every structural gate passed, because every value was a real word.
 */
const SRC = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
const TITLE_KEYS = libraryTitleKeys(SRC);
const T = extractTables(SRC, ENFORCED_TABLES.concat(REPORTED_TABLES));
const byName = (table, name) => T[table].find((r) => r.name === name || r.title === name || r.event === name);

describe('cell library tables — no filler patterns', () => {
  it('finds every table it is asked to audit (the gate cannot pass by reading nothing)', () => {
    for (const name of ENFORCED_TABLES.concat(REPORTED_TABLES)) {
      expect(Array.isArray(T[name]), name + ' should be found in the source').toBe(true);
      expect(T[name].length, name + ' should not be empty').toBeGreaterThan(5);
    }
    for (const name of ENFORCED_TABLES) expect(TITLE_KEYS[name], name + ' should be a library table').toBeTruthy();
  });

  it('detects the original cycling filler (calibration on a synthetic copy of the old data)', () => {
    const habitats = ['Various', 'Aquatic', 'Soil', 'Mammalian host', 'Marine'];
    const fake = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: 'Species ' + i, kingdom: i < 25 ? 'Bacteria' : 'Archaea', habitat: habitats[i % 5], culturable: i % 3 === 0 ? 'Difficult' : 'Yes' }));
    const audit = auditTable(fake, { titleKey: 'name' });
    expect(audit.cycles.map((c) => c.key).sort()).toEqual(['culturable', 'habitat']);
    // A column sorted into blocks is a real grouping, not filler.
    expect(audit.cycles.find((c) => c.key === 'kingdom')).toBeUndefined();
    expect(auditTable([...fake, { id: 41, name: 'Species 0' }], { titleKey: 'name' }).duplicateTitles).toHaveLength(1);
  });

  for (const name of ENFORCED_TABLES) {
    it(`${name} has no cycling fields, constant text fields or duplicate headings`, () => {
      const audit = auditTable(T[name], { titleKey: TITLE_KEYS[name] });
      expect({ cycles: audit.cycles, constants: audit.constants, duplicateTitles: audit.duplicateTitles },
        name + ' still contains filler').toEqual({ cycles: [], constants: [], duplicateTitles: [] });
    });
  }

  it('reports (without failing) the same audit for library tables owned by other work streams', () => {
    const report = [];
    for (const name of REPORTED_TABLES) {
      const audit = auditTable(T[name], { titleKey: TITLE_KEYS[name] || null });
      if (!hasFindings(audit) && !audit.boilerplate.length) continue;
      report.push(name + ': '
        + audit.cycles.map((c) => `cycle ${c.key} every ${c.period} (${c.sample.join(' | ')})`).concat(
          audit.constants.map((c) => `constant ${c.key}="${c.value}"`),
          audit.duplicateTitles.length ? [`${audit.duplicateTitles.length} duplicated headings (e.g. "${audit.duplicateTitles[0].title}" x${audit.duplicateTitles[0].count})`] : [],
          audit.boilerplate.map((b) => `boilerplate ${b.key} x${b.count}`)).join('; '));
    }
    // Advisory until those tables are fixed; move each into ENFORCED_TABLES once clean.
    console.warn('[cell library audit] advisory findings in non-enforced tables:\n  ' + (report.join('\n  ') || 'none'));
    expect(Array.isArray(report)).toBe(true);
  });
});

describe('cell library tables — corrected facts', () => {
  it('MICROBE_SPECIES: E. coli is easy to culture and mostly harmless; S. aureus lives on people', () => {
    const ecoli = byName('MICROBE_SPECIES', 'Escherichia coli');
    expect(ecoli.culturable).toMatch(/^Yes/);
    expect(ecoli.habitat).toMatch(/intestine/i);
    expect(ecoli.pathogenicity).toMatch(/harmless/i);
    const staph = byName('MICROBE_SPECIES', 'Staphylococcus aureus');
    expect(staph.habitat).toMatch(/nose|skin/i);
    expect(staph.pathogenicity).toMatch(/^Opportunistic pathogen/);
  });

  it('MICROBE_SPECIES: Treponema pallidum is a pathogen that cannot be grown on lab media', () => {
    const tp = byName('MICROBE_SPECIES', 'Treponema pallidum');
    expect(tp.pathogenicity).toMatch(/^Pathogen — causes syphilis/);
    expect(tp.culturable).toMatch(/^Not on lab media/);
    expect(tp.habitat).toMatch(/humans only/i);
    expect(tp.clinical).toBe(true);
  });

  it('MICROBE_SPECIES: tick-borne, gut and soil organisms have their real habitats', () => {
    expect(byName('MICROBE_SPECIES', 'Borrelia burgdorferi').habitat).toMatch(/tick/i);
    expect(byName('MICROBE_SPECIES', 'Lactobacillus acidophilus').pathogenicity).toMatch(/^Not known to cause disease/);
    expect(byName('MICROBE_SPECIES', 'Bacillus subtilis').habitat).toMatch(/soil/i);
    expect(byName('MICROBE_SPECIES', 'Mycobacterium leprae').culturable).toMatch(/^No/);
    expect(byName('MICROBE_SPECIES', 'Chlamydia trachomatis').culturable).toMatch(/inside living cells/);
  });

  it('MICROBE_SPECIES: no invented taxa, no duplicate organisms under two names', () => {
    const names = T.MICROBE_SPECIES.map((r) => r.name);
    expect(names).not.toContain('Cuoarchaeota');
    expect(names).not.toContain('Thermophilic archaea');
    expect(names.filter((n) => /Trichomonas vaginalis/.test(n))).toHaveLength(1);
    expect(names.filter((n) => /fischeri/.test(n))).toHaveLength(1);
    expect(names.filter((n) => /carotovor/.test(n))).toHaveLength(1);
    // "Kingdom: Parasite / Algae / Cyanobacteria" were not kingdoms; the field is now a labelled
    // group with a separate, real domain.
    expect(new Set(T.MICROBE_SPECIES.map((r) => r.domain))).toEqual(new Set(['Bacteria', 'Archaea', 'Eukarya']));
    expect(T.MICROBE_SPECIES.filter((r) => r.kingdom === 'Cyanobacteria').every((r) => r.domain === 'Bacteria')).toBe(true);
  });

  it('MICROBE_SPECIES: every disease-causing or STI row is flagged clinical (grade-gated)', () => {
    const unflagged = T.MICROBE_SPECIES.filter((r) =>
      (/^(Pathogen|Opportunistic pathogen|Animal pathogen)\b/.test(r.pathogenicity) || /sexually transmitted/i.test(JSON.stringify(r)))
      && r.clinical !== true).map((r) => r.name);
    expect(unflagged).toEqual([]);
    // ...and the flag is not blanket: harmless and plant-only organisms stay visible to K-5.
    expect(T.MICROBE_SPECIES.filter((r) => r.clinical !== true).length).toBeGreaterThan(90);
  });

  it('HUMAN_CELLS: lifespans are real ranges (neutrophils are short-lived, neurons are not replaced)', () => {
    expect(byName('HUMAN_CELLS', 'Neutrophil').lifespan).toMatch(/hours|day/i);
    expect(byName('HUMAN_CELLS', 'Neutrophil').lifespan).not.toMatch(/month|year/i);
    expect(byName('HUMAN_CELLS', 'Red blood cell (erythrocyte)').lifespan).toMatch(/120 days/);
    expect(byName('HUMAN_CELLS', 'Neuron').lifespan).toMatch(/decades|never replaced/i);
    expect(byName('HUMAN_CELLS', 'Platelet (thrombocyte)').lifespan).toMatch(/7.10 days/);
    expect(T.HUMAN_CELLS.map((r) => r.lifespan).filter((v) => /^(Days|Weeks|Months|Years|Lifetime)$/.test(v || ''))).toEqual([]);
  });

  it('ORGANELLE_ATLAS / EVOLUTION_LINEAGES / CELL_TRIVIA: known errors stay fixed', () => {
    expect(T.ORGANELLE_ATLAS.map((r) => r.name).join(' ')).not.toMatch(/10\+9/);
    expect(T.ORGANELLE_ATLAS.find((r) => /Cilium axoneme/.test(r.name)).name).toMatch(/9\+2/);
    expect(T.ORGANELLE_ATLAS.filter((r) => r.name === 'Plasma membrane')).toHaveLength(0);
    expect(byName('EVOLUTION_LINEAGES', 'First insects').significance).not.toMatch(/first land animals/i);
    const lichen = T.CELL_TRIVIA.find((r) => /lichen is/i.test(r.fact));
    expect(lichen.fact).toMatch(/fungus/);
    expect(lichen.fact).toMatch(/alga|cyanobacteri/);
    expect(T.CELL_TRIVIA.some((r) => /Single-cell technologies are revolutionizing/.test(r.fact))).toBe(false);
    expect(T.CELL_TRIVIA.some((r) => /100 trillion bacteria/.test(r.fact))).toBe(false);
  });

  it('CELL_TRIVIA: health facts and only health facts are grade-gated', () => {
    const mismatched = T.CELL_TRIVIA.filter((r) => (r.category === 'Health') !== (r.clinical === true)).map((r) => r.id);
    expect(mismatched).toEqual([]);
  });

  it('CELL_CAREERS: no invented salary figures; pathologists are physicians', () => {
    expect(T.CELL_CAREERS.some((r) => 'salary' in r)).toBe(false);
    expect(byName('CELL_CAREERS', 'Pathologist').education).toMatch(/Medical degree/);
    expect(byName('CELL_CAREERS', 'Hospital lab technician').education).toMatch(/Associate/);
  });

  it('LESSON_PLANS: no alcohol-brewing labs; culture labs carry a safety note', () => {
    expect(T.LESSON_PLANS.some((r) => /beer|wine/i.test(r.title + ' ' + r.materials))).toBe(false);
    const cultures = T.LESSON_PLANS.filter((r) => /petri|disk/i.test(r.materials));
    expect(cultures.length).toBeGreaterThan(2);
    for (const r of cultures) expect(r.safety, r.title).toMatch(/never reopen/);
    expect(byName('LESSON_PLANS', 'Egg in Corn Syrup').concept).not.toMatch(/reverse osmosis/i);
  });
});
