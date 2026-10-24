import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Cell Simulator — Library reference tables owned by lane DATAB2.
 *
 * Several of these tables were generated filler: field values that cycle through a
 * fixed list in id order regardless of the row (the urea cycle "happening in all
 * cells", a beaker priced "$50K+", the Mariana Trench filed as a "Common" niche, the
 * same placeholder sentence as the "microbes" of all 103 niches), plus a quick-facts
 * table whose second half was a copy of the first. These gates keep that from coming
 * back and pin the factual corrections made in the rebuild.
 */

const req = createRequire(resolve(process.cwd(), 'tests/_x.js'));
const { parse } = req('acorn');
const SRC = 'stem_lab/stem_tool_cell.js';
const source = readFileSync(SRC, 'utf8');

const TABLES = {
  METABOLIC_PATHWAYS: 'pathway',
  SIGNAL_PATHWAYS: 'pathway',
  MICRO_NICHES: 'niche',
  ANTIBIOTICS: 'name',
  INHERITANCE: 'pattern',
  DNA_REFERENCE: 'concept',
  QUICK_FACTS: 'fact',
  MICROBIOME_STUDIES: 'microbiome',
  CELL_PROCESSES: 'process',
  LAB_EQUIPMENT: 'item',
};

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit)); return; }
  if (typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
    walk(node[k], visit);
  }
}

function extractTables(src) {
  const ast = parse(src, { ecmaVersion: 2022, sourceType: 'script' });
  const out = {};
  walk(ast, (n) => {
    if (n.type === 'VariableDeclarator' && n.id && Object.prototype.hasOwnProperty.call(TABLES, n.id.name)
        && n.init && n.init.type === 'ArrayExpression') {
      // Pure data literals: evaluate them in isolation.
      // eslint-disable-next-line no-new-func
      out[n.id.name] = new Function('return ' + src.slice(n.init.start, n.init.end))();
    }
  });
  return out;
}

/**
 * Generated-filler detector. For one field of a table (rows in id order) it flags:
 *  - a constant value repeated across many rows (one placeholder sentence everywhere);
 *  - a value that repeats with a short period p >= 2 (v[i] === v[i+p] for >= 90% of i)
 *    much more often than it repeats in neighbouring rows (p = 1). Real categorical
 *    data comes in runs (grouped rows), so it has a high p = 1 match; cycling filler
 *    has a high p-match and a low run-match.
 */
function fillerFindings(rows, field) {
  const vals = rows.map((r) => r[field]).filter((v) => typeof v === 'string');
  const findings = [];
  if (vals.length < 8) return findings;
  const distinct = new Set(vals).size;
  if (distinct === 1) { findings.push(field + ': the same value in all ' + vals.length + ' rows'); return findings; }
  const match = (p) => {
    let m = 0, n = 0;
    for (let i = 0; i + p < vals.length; i++) { n++; if (vals[i] === vals[i + p]) m++; }
    return n ? m / n : 0;
  };
  const run = match(1);
  for (let p = 2; p <= 12; p++) {
    const mp = match(p);
    if (mp >= 0.9 && mp - run >= 0.25) {
      findings.push(field + ': cycles with period ' + p + ' (' + Math.round(mp * 100) + '% vs ' + Math.round(run * 100) + '% in neighbouring rows)');
      break;
    }
  }
  return findings;
}

// Whole-value placeholders and tautologies seen in the old filler.
const PLACEHOLDER = /^(various|variable|rare|many processes|many downstream effects|n\/?a|tbd|todo|placeholder|unknown|none|foundational(\. key concept)?|essential|important|specialized|step pathway|multiple cells|-+|\?+)\.?$/i;
const TAUTOLOGY = /\bis important for\b|variable \+ often unique communities/i;

let T;
beforeAll(() => { T = extractTables(source); });

describe('DATAB2 reference tables — structure', () => {
  it('finds all ten tables, each a non-empty array of objects with sequential ids', () => {
    for (const name of Object.keys(TABLES)) {
      const rows = T[name];
      expect(Array.isArray(rows), name + ' should be an array literal').toBe(true);
      expect(rows.length, name + ' rows').toBeGreaterThan(10);
      rows.forEach((r, i) => {
        expect(typeof r, name + ' row ' + i).toBe('object');
        expect(r.id, name + ' row ' + i + ' id').toBe(i + 1);
        expect(typeof r[TABLES[name]], name + ' row ' + (i + 1) + ' title field ' + TABLES[name]).toBe('string');
      });
    }
  });

  it('the filler detector flags cycling and constant columns but not grouped categories', () => {
    // Self-test on synthetic data so the gate below is known to be able to fail.
    const cycle = Array.from({ length: 30 }, (_, i) => ({ v: ['A', 'B', 'C', 'D', 'E'][i % 5] }));
    const constant = Array.from({ length: 30 }, () => ({ v: 'Same sentence.' }));
    const twoValueCycle = Array.from({ length: 30 }, (_, i) => ({ v: i % 5 === 0 ? 'Key' : 'Plain' }));
    const grouped = Array.from({ length: 30 }, (_, i) => ({ v: ['Microscopy', 'Separation', 'Heating'][Math.floor(i / 10)] }));
    const unique = Array.from({ length: 30 }, (_, i) => ({ v: 'row ' + i }));
    expect(fillerFindings(cycle, 'v')).toHaveLength(1);
    expect(fillerFindings(constant, 'v')).toHaveLength(1);
    expect(fillerFindings(twoValueCycle, 'v')).toHaveLength(1);
    expect(fillerFindings(grouped, 'v')).toEqual([]);
    expect(fillerFindings(unique, 'v')).toEqual([]);
  });
});

describe('DATAB2 reference tables — no generated filler', () => {
  for (const name of Object.keys(TABLES)) {
    it(name + ' has no cycling or constant columns', () => {
      const rows = T[name];
      const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== 'id');
      const findings = fields.flatMap((f) => fillerFindings(rows, f));
      expect(findings, name).toEqual([]);
    });

    it(name + ' has no empty, placeholder or tautological values', () => {
      const bad = [];
      T[name].forEach((r) => {
        for (const [k, v] of Object.entries(r)) {
          if (k === 'id') continue;
          if (typeof v !== 'string') { bad.push(r.id + '.' + k + ' is not a string'); continue; }
          const s = v.trim();
          if (s.length < 2) bad.push(r.id + '.' + k + ' is empty');
          else if (PLACEHOLDER.test(s)) bad.push(r.id + '.' + k + ' = "' + s + '"');
          else if (TAUTOLOGY.test(s)) bad.push(r.id + '.' + k + ' = "' + s + '"');
          else if (/\bundefined\b|\bNaN\b/.test(s)) bad.push(r.id + '.' + k + ' shows undefined/NaN');
          else if (k !== TABLES[name] && s.toLowerCase() === String(r[TABLES[name]]).trim().toLowerCase()) bad.push(r.id + '.' + k + ' repeats the title');
        }
      });
      expect(bad, name).toEqual([]);
    });

    it(name + ' has no duplicate rows or duplicate titles', () => {
      const titles = new Map();
      const bodies = new Map();
      const dupes = [];
      for (const r of T[name]) {
        const t = String(r[TABLES[name]]).trim().toLowerCase();
        if (titles.has(t)) dupes.push('title "' + r[TABLES[name]] + '" (ids ' + titles.get(t) + ', ' + r.id + ')');
        else titles.set(t, r.id);
        const body = JSON.stringify(Object.entries(r).filter(([k]) => k !== 'id' && k !== TABLES[name]));
        if (bodies.has(body)) dupes.push('content of ids ' + bodies.get(body) + ' and ' + r.id);
        else bodies.set(body, r.id);
      }
      expect(dupes, name).toEqual([]);
    });
  }
});

describe('DATAB2 reference tables — content corrections', () => {
  const by = (name, title) => T[name].find((r) => r[TABLES[name]] === title);

  it('metabolic yields are stated per the right unit and hedged', () => {
    expect(by('METABOLIC_PATHWAYS', 'Glycolysis').outputs).toMatch(/^Net 2 ATP \+ 2 NADH per glucose/);
    const krebs = T.METABOLIC_PATHWAYS.find((r) => /^Krebs cycle/.test(r.pathway));
    expect(krebs.outputs).toMatch(/Per turn: 3 NADH \+ 1 FADH2 \+ 1 ATP/);
    expect(krebs.outputs).not.toMatch(/per pyruvate/i);
    expect(by('METABOLIC_PATHWAYS', 'Oxidative phosphorylation').outputs).toMatch(/about 30-32.*estimates vary/);
    expect(by('METABOLIC_PATHWAYS', 'Calvin cycle').outputs).not.toMatch(/dark reactions/i);
    expect(by('METABOLIC_PATHWAYS', 'Gluconeogenesis').outputs).not.toMatch(/^Reverse of glycolysis/);
  });

  it('signalling rows name a receptor, relay and outcome separately', () => {
    for (const r of T.SIGNAL_PATHWAYS) {
      for (const k of ['ligand', 'receptor', 'relay', 'outcome', 'example']) {
        expect(typeof r[k] === 'string' && r[k].length > 3, r.pathway + ' ' + k).toBe(true);
      }
    }
    expect(by('SIGNAL_PATHWAYS', 'cAMP signalling').relay).toMatch(/protein kinase A/);
    expect(by('SIGNAL_PATHWAYS', 'Inositol trisphosphate (IP3)').outcome).toMatch(/Releases Ca2\+ stored in the ER/);
  });

  it('antibiotic mechanism classes hit the right bacterial target', () => {
    const want = [
      [/aminoglycoside|^tetracyclines$|glycylcycline/i, /^30S ribosomal subunit$/],
      [/macrolide|lincosamide|oxazolidinone/i, /^50S ribosomal subunit$/],
      [/beta-lactam|glycopeptide/i, /^Cell wall/],
      [/fluoroquinolone/i, /^DNA gyrase \+ topoisomerase IV$/],
      [/polymyxin|lipopeptide/i, /membrane/i],
      [/rifamycin/i, /^RNA polymerase$/],
      [/sulfonamide/i, /^Folate synthesis/],
    ];
    let checked = 0;
    for (const r of T.ANTIBIOTICS) {
      for (const [cls, target] of want) {
        if (cls.test(r.class)) { expect(r.target, r.name).toMatch(target); checked++; }
      }
      expect(r.resistance.length, r.name + ' resistance').toBeGreaterThan(10);
    }
    expect(checked).toBeGreaterThanOrEqual(T.ANTIBIOTICS.length - 1);
    expect(by('ANTIBIOTICS', 'Amoxicillin').mechanism).toMatch(/penicillin-binding proteins/);
  });

  it('antibiotics carry no dosing or prescribing advice and stay grade gated', () => {
    const advice = /\b\d+(\.\d+)?\s?(mg|mcg|g|ml|mL)\b|\bdos(e|es|age|ing)\b|\btwice daily\b|\bper day\b|\btake\b|\bprescri|\balternative for\b|\bZ-pa/i;
    for (const r of T.ANTIBIOTICS) {
      for (const [k, v] of Object.entries(r)) if (k !== 'id') expect(String(v), r.name + '.' + k).not.toMatch(advice);
    }
    const gate = source.indexOf('if (cellBandAllowsClinical) {');
    expect(gate).toBeGreaterThan(-1);
    expect(source.slice(gate, gate + 600)).toContain("data: ANTIBIOTICS");
  });

  it('cell processes say where they really happen', () => {
    expect(by('CELL_PROCESSES', 'Urea cycle').cellTypes).toMatch(/^Liver/);
    expect(by('CELL_PROCESSES', 'Antibody production').cellTypes).toMatch(/^Plasma cells/);
    expect(by('CELL_PROCESSES', 'DNA replication (semi-conservative)').cellTypes).toBe('All dividing cells');
    expect(T.CELL_PROCESSES.find((r) => /^Mitosis/.test(r.process)).cellTypes).not.toMatch(/^All cells/);
    expect(T.CELL_PROCESSES.every((r) => !('importance' in r))).toBe(true);
  });

  it('lab equipment has real categories and uses, and no invented prices', () => {
    expect(T.LAB_EQUIPMENT.every((r) => !('priceRange' in r) && typeof r.use === 'string')).toBe(true);
    expect(by('LAB_EQUIPMENT', 'Stereo microscope (dissecting microscope)').category).toBe('Microscopy');
    expect(by('LAB_EQUIPMENT', 'Beaker').category).toBe('Glassware & plasticware');
    expect(by('LAB_EQUIPMENT', 'Autoclave').use).toMatch(/121 °C/);
    expect(by('LAB_EQUIPMENT', 'Laminar flow clean bench').use).toMatch(/does not protect the user/);
  });

  it('microbial niches are typed by their real conditions and name real microbes', () => {
    expect(by('MICRO_NICHES', 'Mariana Trench (Challenger Deep) seafloor').type).toMatch(/^Extreme/);
    expect(by('MICRO_NICHES', 'Dead Sea').type).toBe('Extreme (salt)');
    expect(by('MICRO_NICHES', 'Yogurt').type).toBe('Food');
    expect(T.MICRO_NICHES.some((r) => /bermuda/i.test(r.niche))).toBe(false);
    expect(by('MICRO_NICHES', 'Mono Lake, California').microbes).toMatch(/refuted in 2012 and retracted in 2025/);
  });

  it('quick facts replace the 10:1 myth with the ~1:1 estimate and hedge contested claims', () => {
    const ratio = T.QUICK_FACTS.find((r) => /roughly equal in number/.test(r.fact));
    expect(ratio && ratio.detail).toMatch(/38 trillion bacteria and 30 trillion human cells.*Sender, Fuchs and Milo, 2016/);
    for (const r of T.QUICK_FACTS) {
      expect(r.fact, 'fact ' + r.id).not.toMatch(/\b10\s?(x|×|times)\s+more bacteri/i);
      expect(r.fact, 'fact ' + r.id).not.toMatch(/most atmospheric O2/i);
    }
    expect(T.QUICK_FACTS.find((r) => /mood/.test(r.fact)).fact).toMatch(/^Gut microbes may influence/);
    expect(T.MICROBIOME_STUDIES.find((r) => r.microbiome === 'Human gut microbiome').description).not.toMatch(/100 trillion/);
  });

  it('inheritance and DNA reference numbers are right and hedged', () => {
    expect(by('INHERITANCE', 'Codominance').example).toMatch(/AB/);
    expect(by('INHERITANCE', 'Uniparental disomy').example).toMatch(/Prader-Willi/);
    expect(by('DNA_REFERENCE', 'Codon').detail).toMatch(/61 code for the 20 standard amino acids and 3 are stop signals/);
    expect(by('DNA_REFERENCE', 'Human genome size').description).toMatch(/About 3\.1 billion base pairs per haploid set/);
    expect(by('DNA_REFERENCE', 'Human protein-coding genes').detail).toMatch(/roughly 19,000-20,000/);
  });

  it('every cited study is one that was checked (no invented citations)', () => {
    // Each entry was checked for existence, year, journal and the finding stated.
    const VERIFIED = [
      'Brock & Freeze 1969', 'Takai et al. 2008', 'Kato et al. 1998', 'Friedmann 1982', 'Wierzchos et al. 2006',
      'Edwards et al. 2000', 'Chivian et al. 2008', 'Christner et al. 2014', 'Christner et al. 2008', 'Williamson et al. 2020',
      'Dadachova et al. 2007', 'Sarbu et al. 1996', 'Bhullar et al. 2012', 'Manske et al. 2005', 'Sunagawa et al. 2015',
      'Hovanec et al. 1998', 'Zettler, Mincer & Amaral-Zettler 2013', 'Rodrigues et al. 2013', 'Zalar et al. 2011',
      'Cardinale et al. 2017', 'Meadow, Altrichter & Green 2014', 'Flores et al. 2011', 'Lax et al. 2017',
      'Afshinnekoo et al. 2015', 'Wolfe et al. 2014', 'Landis et al. 2021', 'Sender, Fuchs & Milo 2016', 'Qin et al. 2010',
      'Grice et al. 2009', 'Human Oral Microbiome Database', 'Ravel et al. 2011', 'Field et al. 1998', 'Chisholm et al. 1988',
      'Kwong & Moran 2016', 'Spribille et al. 2016',
    ];
    const cited = [];
    for (const name of ['MICRO_NICHES', 'MICROBIOME_STUDIES']) {
      for (const r of T[name]) {
        if (!('source' in r)) continue;
        // Split multi-study sources on ';' and strip the trailing "(Journal), note".
        for (const part of r.source.split(';')) cited.push([name + ' ' + r.id, part.trim().replace(/\s*\(.*$/, '')]);
      }
    }
    expect(cited.length).toBeGreaterThan(20);
    for (const [where, study] of cited) expect(VERIFIED, where + ' cites "' + study + '"').toContain(study);
  });
});

describe('DATAB2 reference tables — rendered in the Library', () => {
  let H;
  beforeAll(async () => {
    H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  });
  beforeEach(() => { H.resetStemLab(); H.loadTool(SRC, 'cell'); });

  const SHELVES = [
    ['Processes', 'CELL_PROCESSES', 'Cell processes'], ['Processes', 'METABOLIC_PATHWAYS', 'Metabolic pathways'],
    ['Processes', 'SIGNAL_PATHWAYS', 'Signalling pathways'], ['Processes', 'DNA_REFERENCE', 'DNA reference'],
    ['Processes', 'INHERITANCE', 'Inheritance patterns'], ['Lab & technique', 'LAB_EQUIPMENT', 'Lab equipment'],
    ['Ecology', 'MICRO_NICHES', 'Microbial niches'], ['Ecology', 'MICROBIOME_STUDIES', 'Microbiome studies'],
    ['Facts & culture', 'QUICK_FACTS', 'Quick facts'],
  ];
  for (const [group, id, title] of SHELVES) {
    it('renders ' + id + ' with its real entry count and no undefined/NaN', () => {
      const html = H.renderTool('cell', { cell: { mode: 'library', _cellPicked: true, _libGroup: group, _libSection: id } });
      // The Library pages long tables, so the full count lives in the status attribute.
      expect(html.includes('data-cell-lib-count="' + T[id].length + '"'), id + ' entry count').toBe(true);
      expect(html.includes(title), id + ' title').toBe(true);
      expect(/>[^<]*\b(undefined|NaN)\b/.test(html), id + ' shows undefined/NaN').toBe(false);
    });
  }

  it('shows the antibiotics shelf only to grades 6-12', () => {
    const state = { cell: { mode: 'library', _cellPicked: true, _libGroup: 'Health & disease', _libSection: 'ANTIBIOTICS' } };
    const young = H.renderTool('cell', state, { gradeLevel: '5th Grade' });
    expect(young.includes('30S ribosomal subunit')).toBe(false);
    expect(young.includes('data-cell-lib-count="' + T.ANTIBIOTICS.length + '"')).toBe(false);
    const older = H.renderTool('cell', state, { gradeLevel: '9' });
    expect(older.includes('data-cell-lib-count="' + T.ANTIBIOTICS.length + '"')).toBe(true);
    expect(older.includes('30S ribosomal subunit')).toBe(true);
  });
});
