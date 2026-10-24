// Cell Simulator — Library reference tables: content corrections stay fixed.
//
// 2026-10 fact-check of FAMOUS_EXPERIMENTS, MICRO_MYTHS, CELL_RECORDS, MICROSCOPY,
// CELL_QUOTES, CASE_STUDIES, LAB_SAFETY, STUDY_QS and MICRO_CASES found wrong
// dates (hybridomas "1985", Koch postulates "1882"), false superlatives (Dolly
// "first cloned mammal", H. pylori "most acid tolerant"), misattributed quotes
// (Darwin's "most adaptable" line is Leon Megginson's 1963 paraphrase; "all
// cells arise from preexisting cells" credited to Schwann, who believed the
// opposite), "myths" that were true ("Hand-shaking spreads disease: True"),
// outdated safety advice ("bleed wound" after a needlestick), non-outbreaks in
// the outbreak table (Y2K, Tylenol tampering) and an STI organism in an
// ungated table. These spot checks pin the corrections.
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_cell.js';
const END = '\n          ];';
let src;
const T = {};

function loadTable(name) {
  const head = 'var ' + name + ' = [';
  const i = src.indexOf(head);
  if (i < 0) throw new Error('missing table ' + name);
  const j = src.indexOf(END, i);
  return runInNewContext('(function(){ ' + src.slice(i, j + END.length) + '; return ' + name + '; })()');
}
const text = (rows) => rows.map((r) => Object.values(r).join(' | ')).join('\n');

beforeAll(() => {
  src = fs.readFileSync(SRC_PATH, 'utf8');
  ['FAMOUS_EXPERIMENTS', 'MICRO_MYTHS', 'CELL_RECORDS', 'MICROSCOPY', 'CELL_QUOTES', 'CASE_STUDIES',
    'LAB_SAFETY', 'STUDY_QS', 'MICRO_CASES'].forEach((n) => { T[n] = loadTable(n); });
});

describe('CELL_QUOTES — only verifiable quotations', () => {
  it('drops known misattributions and unsourced lines', () => {
    const all = text(T.CELL_QUOTES);
    expect(all).not.toMatch(/strongest of the species/i);              // Megginson 1963, not Darwin
    expect(all).not.toMatch(/All cells arise from preexisting cells/i); // not Schwann's view
    expect(all).not.toMatch(/Nothing in life is to be feared/i);       // Curie: no primary source
    expect(all).not.toMatch(/no one will doubt that DNA/i);            // Crick: unsourced
    expect(all).not.toMatch(/Bacteria can talk\. They have words/i);   // Bassler said the opposite
    expect(all).not.toMatch(/revolutionize all medicine/i);            // Fleming: unsourced
    expect(all).not.toMatch(/wonders of the world will never end/i);   // Leeuwenhoek: unsourced
  });

  it('every quotation carries a source, and verified wording matches it', () => {
    T.CELL_QUOTES.forEach((q) => {
      expect(String(q.source || '').length, q.quote).toBeGreaterThan(8);
      expect(String(q.author || '').length, q.quote).toBeGreaterThan(3);
    });
    const find = (re) => T.CELL_QUOTES.find((q) => re.test(q.quote));
    expect(find(/prepared mind/).quote).toBe('In the fields of observation chance favours only the prepared mind.');
    expect(find(/We wish to suggest/).quote).toContain('deoxyribose nucleic acid (D.N.A.).');
    expect(find(/little Boxes/).author).toBe('Robert Hooke');
    expect(find(/endless forms most beautiful/).author).toBe('Charles Darwin');
  });
});

describe('FAMOUS_EXPERIMENTS — dates and claims', () => {
  const row = (re) => T.FAMOUS_EXPERIMENTS.find((r) => re.test(r.name));
  it('fixes wrong dates and false firsts', () => {
    expect(row(/hybridoma/i).name).toContain('1975');
    expect(row(/Dolly/).significance).toMatch(/adult body cell/);
    expect(text(T.FAMOUS_EXPERIMENTS)).not.toMatch(/Hoppe and Illmensee \| Nuclear transfer \| Cloning mammals/);
    expect(row(/rabies/i).significance).not.toMatch(/first vaccine against (a )?virus/i);
    expect(row(/Human Genome Project/).significance).toMatch(/2022/);
    expect(row(/Spallanzani/).name).toContain('1765');
    expect(text(T.FAMOUS_EXPERIMENTS)).not.toMatch(/Protein folding solved/i);
    expect(text(T.FAMOUS_EXPERIMENTS)).not.toMatch(/Hookworm cure/i);
  });
});

describe('CELL_RECORDS — hedged, verified superlatives', () => {
  it('removes wrong records and the STI organism from this ungated table', () => {
    const all = text(T.CELL_RECORDS);
    expect(all).not.toMatch(/genitalium/i);
    expect(all).not.toMatch(/Outnumber human cells 1:1/);
    expect(all).not.toMatch(/Indian muntjac deer \(1 chromosome\)/);
    expect(all).not.toMatch(/Helicobacter pylori \(pH 1-2\)/);
    expect(all).not.toMatch(/HIV/);
    expect(all).toMatch(/Tmesipteris oblanceolata/);
    expect(all).toMatch(/Methanopyrus kandleri/);
  });
});

describe('MICRO_MYTHS — every myth is false', () => {
  it('each correction starts by saying the myth is false', () => {
    T.MICRO_MYTHS.forEach((m) => expect(m.truth, m.myth).toMatch(/^False\b/));
    expect(text(T.MICRO_MYTHS)).not.toMatch(/Cucumber \+ chocolate|Beard hair|eyes-shut/i);
  });
});

describe('LAB_SAFETY — current practice', () => {
  const resp = (re) => T.LAB_SAFETY.find((r) => re.test(r.scenario)).response;
  it('needlestick: wash, do not squeeze; aerosol: wait ~30 minutes; bites: no automatic rabies shots', () => {
    expect(resp(/Needlestick/)).toMatch(/do not squeeze/i);
    expect(resp(/Needlestick/)).not.toMatch(/^Bleed/i);
    expect(resp(/aerosol/)).toMatch(/30 minutes/);
    expect(resp(/animal bites/i)).not.toMatch(/rabies prophylaxis/i);
    expect(resp(/pipette by mouth/i)).toMatch(/Never pipette by mouth/);
  });
});

describe('CASE_STUDIES — real outbreaks, sourced numbers, still grade-gated', () => {
  it('contains only microbial outbreaks and public-health cases, each with a source', () => {
    const all = text(T.CASE_STUDIES);
    expect(all).not.toMatch(/Y2K|Tylenol|not microbial/i);
    T.CASE_STUDIES.forEach((c) => expect(String(c.source || '').length, c.event).toBeGreaterThan(2));
    expect(T.CASE_STUDIES.find((c) => /basil/i.test(c.event)).event).toContain('2019');
  });

  it('stays behind the clinical grade gate in the Library', () => {
    const gate = src.indexOf('if (cellBandAllowsClinical) {');
    expect(gate).toBeGreaterThan(-1);
    expect(src.slice(gate, gate + 600)).toContain('CASE_STUDIES');
    const ungated = src.slice(src.indexOf('var LIBRARY = ['), gate);
    expect(ungated).not.toContain('CASE_STUDIES');
  });
});

describe('STUDY_QS and MICRO_CASES — distinct, answerable rows', () => {
  it('no repeated prompts or self-contradictory comparisons', () => {
    const qs = T.STUDY_QS.map((r) => r.question.toLowerCase());
    expect(new Set(qs).size).toBe(qs.length);
    expect(qs.some((q) => /passive vs facilitated/.test(q))).toBe(false); // facilitated diffusion IS passive
    expect(qs.some((q) => /dark reactions/.test(q))).toBe(false);         // outdated term
    T.STUDY_QS.forEach((r) => {
      expect(['Basic', 'Intermediate', 'Advanced']).toContain(r.level);
      expect(r.question).toMatch(/[.?]$/);
    });
  });

  it('microbial mechanism rows are not duplicates of each other', () => {
    const names = T.MICRO_CASES.map((r) => r.process.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    T.MICRO_CASES.forEach((r) => expect(r.mechanism.length, r.process).toBeGreaterThan(40));
  });
});
