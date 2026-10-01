import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for the Punnett Square Lab genetics engine.
// The tool had only crash-smoke coverage; every ratio below is derived
// independently in this file, never copied from the tool's own output.

const sourcePath = 'stem_lab/stem_tool_punnett.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_punnett.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function renderPunnett(state = {}) {
  return renderTool('punnett', { punnett: state });
}

// Extract a top-level `var NAME = <literal>;` data block from the tool
// source and evaluate it. Bounded by the next landmark so nested
// braces inside the literal cannot truncate the slice.
function extractLiteral(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker + ' present in source').toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  const chunk = src.slice(start, end);
  const objText = chunk.slice(chunk.indexOf('=') + 1, chunk.lastIndexOf(';'));
  // eslint-disable-next-line no-new-func
  return new Function('return (' + objText + ')')();
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'punnett');
});

describe('monohybrid cross engine', () => {
  it('Tt × Tt yields the 1:2:1 genotype and 3:1 phenotype ratios', () => {
    const html = renderPunnett({ inheritMode: 'complete', parent1: ['T', 't'], parent2: ['T', 't'] });
    expect(html).toContain('Genotype Ratios: TT: 1/4 | Tt: 2/4 | tt: 1/4');
    expect(html).toContain('Phenotype: 3/4 Dominant, 1/4 Recessive');
  });

  it('normalizes reversed heterozygotes so tT and Tt count as one genotype', () => {
    // The parent selector legitimately echoes the raw 'tT' state; only the
    // computed ratios must never contain a reversed genotype.
    const html = renderPunnett({ inheritMode: 'complete', parent1: ['t', 'T'], parent2: ['T', 't'] });
    const ratios = html.match(/Genotype Ratios:[^<]*/);
    expect(ratios).toBeTruthy();
    expect(ratios[0]).toContain('Tt: 2/4');
    expect(ratios[0]).not.toContain('tT');
  });

  it('Bb × bb is a 1:1 test cross', () => {
    const html = renderPunnett({ inheritMode: 'complete', parent1: ['B', 'b'], parent2: ['b', 'b'] });
    expect(html).toContain('Genotype Ratios: Bb: 2/4 | bb: 2/4');
    expect(html).toContain('Phenotype: 2/4 Dominant, 2/4 Recessive');
  });

  it('incomplete dominance Rr × Rr shows the intermediate class matching the genotype ratio', () => {
    const html = renderPunnett({ inheritMode: 'incomplete', parent1: ['R', 'r'], parent2: ['R', 'r'] });
    expect(html).toContain('Genotype Ratios: RR: 1/4 | Rr: 2/4 | rr: 1/4');
    expect(html).toContain('Phenotype: 1/4 Dominant, 2/4 Intermediate, 1/4 Recessive');
  });
});

describe('codominant cross engine (allele-identity classification)', () => {
  it('AB × AB reads 1 Type-A : 2 Type-AB : 1 Type-B, not 2 Dominant', () => {
    const html = renderPunnett({ inheritMode: 'codominant', parent1: ['A', 'B'], parent2: ['A', 'B'] });
    expect(html).toContain('Genotype Ratios: AA: 1/4 | AB: 2/4 | BB: 1/4');
    expect(html).toContain('Phenotype: 1/4 Dominant, 2/4 Codominant, 1/4 Recessive');
  });

  it('AB × Ai (ABO with the recessive i allele) never produces Type O', () => {
    const html = renderPunnett({ inheritMode: 'codominant', parent1: ['A', 'B'], parent2: ['A', 'i'] });
    expect(html).toContain('AA: 1/4');
    expect(html).toContain('Ai: 1/4');
    expect(html).toContain('AB: 1/4');
    expect(html).toContain('Bi: 1/4');
    expect(html).not.toContain('ii: 1/4');
  });

  it('single-codominant-allele Roan Rr × Rr classifies the heterozygote as the mixed class', () => {
    const html = renderPunnett({ inheritMode: 'codominant', parent1: ['R', 'r'], parent2: ['R', 'r'] });
    expect(html).toContain('Genotype Ratios: RR: 1/4 | Rr: 2/4 | rr: 1/4');
    expect(html).toContain('Phenotype: 1/4 Dominant, 2/4 Codominant, 1/4 Recessive');
  });
});

describe('X-linked recessive cross engine', () => {
  it('carrier mother × unaffected father: half of sons affected, half of daughters carriers', () => {
    const html = renderPunnett({ inheritMode: 'sexLinked', parent1: ['C', 'c'], parent2: ['C', 'Y'] });
    expect(html).toContain('XCXC: 1/4 | XCY: 1/4 | XcXC: 1/4 | XcY: 1/4');
    expect(html).toContain('Phenotype: 3/4 Unaffected in model, 1/4 Affected in model');
    expect(html).toContain('1/2 sons affected');
    expect(html).toContain('1/2 daughters are carriers.');
  });

  it('affected father × non-carrier mother: no affected children, all daughters carriers', () => {
    const html = renderPunnett({ inheritMode: 'sexLinked', parent1: ['C', 'C'], parent2: ['c', 'Y'] });
    expect(html).toContain('Phenotype: 4/4 Unaffected in model');
    expect(html).toContain('no sons affected');
    expect(html).toContain('2/2 daughters are carriers.');
  });
});

describe('dihybrid cross engine', () => {
  it('AaBb × AaBb yields the 9:3:3:1 phenotype ratio', () => {
    const html = renderPunnett({ _isDihybrid: true });
    expect(html).toContain('9/16');
    expect(html).toContain('Classic 9:3:3:1 ratio!');
  });

  it('AaBb × aabb yields the 1:1:1:1 dihybrid test cross', () => {
    const html = renderPunnett({ _isDihybrid: true, _diP2G1: ['a', 'a'], _diP2G2: ['b', 'b'] });
    expect(html).toContain('4/16');
    expect(html).toContain('1:1:1:1 ratio!');
  });
});

describe('codon table', () => {
  // Standard genetic code, authored independently here (RNA codons →
  // three-letter abbreviations), so a typo in the tool cannot self-verify.
  const STANDARD = {
    UUU: 'Phe', UUC: 'Phe', UUA: 'Leu', UUG: 'Leu',
    CUU: 'Leu', CUC: 'Leu', CUA: 'Leu', CUG: 'Leu',
    AUU: 'Ile', AUC: 'Ile', AUA: 'Ile', AUG: 'Met',
    GUU: 'Val', GUC: 'Val', GUA: 'Val', GUG: 'Val',
    UCU: 'Ser', UCC: 'Ser', UCA: 'Ser', UCG: 'Ser',
    CCU: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
    ACU: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr',
    GCU: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',
    UAU: 'Tyr', UAC: 'Tyr', UAA: 'Stop', UAG: 'Stop',
    CAU: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln',
    AAU: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys',
    GAU: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu',
    UGU: 'Cys', UGC: 'Cys', UGA: 'Stop', UGG: 'Trp',
    CGU: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg',
    AGU: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg',
    GGU: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly'
  };

  it('matches the standard genetic code for all 64 codons', () => {
    const table = extractLiteral('var CODON_TABLE =', 'var AMINO_CAT');
    expect(Object.keys(table).sort()).toEqual(Object.keys(STANDARD).sort());
    for (const codon of Object.keys(STANDARD)) {
      expect(table[codon], codon).toBe(STANDARD[codon]);
    }
  });

  it('gives every coded amino acid a polarity category and a full name', () => {
    const cat = extractLiteral('var AMINO_CAT =', 'var AMINO_COLORS');
    const full = extractLiteral('var AMINO_FULL =', '// ── Challenge questions');
    const aminos = [...new Set(Object.values(STANDARD))];
    for (const amino of aminos) {
      expect(cat[amino], amino + ' category').toBeTruthy();
      expect(full[amino], amino + ' full name').toBeTruthy();
    }
  });
});

describe('question banks', () => {
  const challenge = extractLiteral('var CHALLENGE_QS =', 'var BATTLE_QS');
  const battle = extractLiteral('var BATTLE_QS =', '// ── Learn topics');

  const allQuestions = [
    ...challenge.easy.map((q) => ({ ...q, bank: 'easy' })),
    ...challenge.medium.map((q) => ({ ...q, bank: 'medium' })),
    ...challenge.hard.map((q) => ({ ...q, bank: 'hard' })),
    ...battle.map((q) => ({ ...q, bank: 'battle' }))
  ];

  it('collects all four banks at their expected sizes', () => {
    expect(challenge.easy.length).toBe(12);
    expect(challenge.medium.length).toBe(12);
    expect(challenge.hard.length).toBe(12);
    expect(battle.length).toBeGreaterThanOrEqual(15);
  });

  it('every question has 4 options, an in-range key, and feedback aligned to that key', () => {
    for (const q of allQuestions) {
      const label = q.bank + ' :: ' + q.q;
      expect(q.a.length, label).toBe(4);
      expect(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, label).toBe(true);
      expect(q.wrongFeedback.length, label).toBe(4);
      // The correct slot is blank; every distractor explains itself. A
      // misaligned answer key breaks this pairing immediately.
      expect(q.wrongFeedback[q.correct], label + ' (correct slot must be blank)').toBe('');
      q.wrongFeedback.forEach((fb, i) => {
        if (i !== q.correct) {
          expect(typeof fb === 'string' && fb.length > 0, label + ' (distractor ' + i + ')').toBe(true);
        }
      });
    }
  });

  it('pins the quantitative genetics answer keys', () => {
    const byPrompt = (needle) => {
      const q = allQuestions.find((x) => x.q.includes(needle));
      expect(q, needle).toBeTruthy();
      return q;
    };
    expect(byPrompt('phenotype ratio of Bb').a[byPrompt('phenotype ratio of Bb').correct]).toBe('3:1');
    expect(byPrompt('q = 0.3, what is 2pq').a[byPrompt('q = 0.3, what is 2pq').correct]).toBe('0.42');
    expect(byPrompt('p=0.6 in Hardy-Weinberg').a[byPrompt('p=0.6 in Hardy-Weinberg').correct]).toBe('0.4');
    expect(byPrompt('Which is a stop codon').a[byPrompt('Which is a stop codon').correct]).toBe('UAA');
    expect(byPrompt('Cc × Cc have CF').a[byPrompt('Cc × Cc have CF').correct]).toBe('25%');
  });
});

describe('preset data consistency', () => {
  const presets = extractLiteral('var PRESETS_BY_MODE =', '// ── Dihybrid cross presets');
  const dihybrids = extractLiteral('var DIHYBRID_PRESETS =', '// ── Pedigree preset data');

  it('every cross preset label states the same parent genotypes as its data', () => {
    // Regression pin: the sex-linked labels shipped as "Cc × cY" while the
    // data crossed a normal CY father — a student hand-building the square
    // from the label got a different grid than the tool rendered.
    for (const mode of Object.keys(presets)) {
      for (const preset of presets[mode]) {
        // "BB × bb (All Hetero)" keeps the genotypes outside the parens, so
        // anchor on the × itself rather than requiring a parenthesized pair.
        const match = preset.label.match(/([A-Za-z]+) × ([A-Za-z]+)/);
        expect(match, preset.label + ' has a P1 × P2 genotype readout').toBeTruthy();
        const expectedP1 = preset.p1.join('');
        const expectedP2 = mode === 'sexLinked' ? preset.p2[0] + 'Y' : preset.p2.join('');
        expect(match[1], preset.label).toBe(expectedP1);
        expect(match[2], preset.label).toBe(expectedP2);
      }
    }
  });

  it('every dihybrid preset label matches its allele data (test crosses use the recessive pair)', () => {
    for (const preset of dihybrids) {
      const match = preset.label.match(/([A-Za-z]+) × ([A-Za-z]+)/);
      expect(match, preset.label).toBeTruthy();
      const parent = preset.g1.join('') + preset.g2.join('');
      const testCrossParent2 = preset.g1[1] + preset.g1[1] + preset.g2[1] + preset.g2[1];
      expect(match[1], preset.label).toBe(parent);
      expect([parent, testCrossParent2], preset.label).toContain(match[2]);
    }
  });

  it('sex-linked presets model the father as one X allele plus Y', () => {
    for (const preset of presets.sexLinked) {
      expect(preset.p2[1], preset.label).toBe('Y');
      expect(preset.p2[0], preset.label).not.toBe('Y');
    }
  });
});

describe('population genetics', () => {
  it('samples the full 2N allele pool for drift (no silent cap below the slider range)', () => {
    expect(src).toContain('var n2 = 2 * popSize;');
    expect(src).not.toContain('Math.min(popSize, 500)');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
