// Cell Simulator — generated-filler detector for the quiz bank and the Library
// reference tables (EXTRA_QUIZ, QUIZ_BANK, FAMOUS_EXPERIMENTS, MICRO_MYTHS,
// CELL_RECORDS, MICROSCOPY, CELL_QUOTES, CASE_STUDIES, LAB_SAFETY, STUDY_QS,
// MICRO_CASES).
//
// WHY: in 2026-10 these tables were found to be partly machine filler. EXTRA_QUIZ
// "200 questions" was 10 questions repeated 20 times, with difficulty cycling
// easy/medium/hard and category cycling through five labels in id order, and every
// explanation was "Detailed explanation of why this is the correct answer.".
// STUDY_QS was 30 prompts repeated to 200 with cycling level/topic. (The same
// disease in MICROBE_SPECIES gave the syphilis bacterium "Pathogenicity: None".)
// Field values that cycle with a short period in id order, regardless of the row,
// are the signature. This suite evaluates the real literals and checks every field
// for that signature, plus placeholder text and near-duplicate rows.
//
// The detector is exercised on synthetic filler first, so a detector that cannot
// fire fails loudly instead of passing silently.
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_cell.js';
const END = '\n          ];';
const TABLES = {
  EXTRA_QUIZ: 'question',
  QUIZ_BANK: 'q',
  FAMOUS_EXPERIMENTS: 'name',
  MICRO_MYTHS: 'myth',
  CELL_RECORDS: 'category',
  MICROSCOPY: 'technique',
  CELL_QUOTES: 'quote',
  CASE_STUDIES: 'event',
  LAB_SAFETY: 'scenario',
  STUDY_QS: 'question',
  MICRO_CASES: 'process',
};

function loadTable(src, name) {
  const head = 'var ' + name + ' = [';
  const i = src.indexOf(head);
  if (i < 0) throw new Error('missing table ' + name);
  const j = src.indexOf(END, i);
  return runInNewContext('(function(){ ' + src.slice(i, j + END.length) + '; return ' + name + '; })()');
}

// ── the detector ────────────────────────────────────────────────────────────
// Returns a list of human-readable problems for one table.
function detectFiller(rows, titleKey) {
  const problems = [];
  const keys = new Set();
  rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
  keys.delete('id');
  for (const k of keys) {
    const vals = rows.map((r) => JSON.stringify(r[k] === undefined ? null : r[k]));
    const present = rows.filter((r) => r[k] !== undefined && r[k] !== null).length;
    if (present < 6) continue;
    const distinct = new Set(vals).size;
    // 1. short-period cycling in id order (not just runs of equal values)
    let adj = 0;
    for (let i = 1; i < vals.length; i++) if (vals[i] === vals[i - 1]) adj++;
    const adjRatio = adj / (vals.length - 1);
    for (let p = 2; p <= 12; p++) {
      let same = 0;
      let tot = 0;
      for (let i = 0; i + p < vals.length; i++) {
        tot++;
        if (vals[i] === vals[i + p]) same++;
      }
      if (tot >= 6 && distinct >= 2 && same / tot >= 0.9 && adjRatio < 0.5) {
        problems.push(`field "${k}" cycles with period ${p} (${same}/${tot} rows repeat)`);
        break;
      }
    }
    // 2. one free-text value pasted into many rows
    const strings = rows.map((r) => r[k]).filter((v) => typeof v === 'string');
    if (strings.length >= 6) {
      const counts = {};
      strings.forEach((s) => { if (s.length >= 25) counts[s] = (counts[s] || 0) + 1; });
      const top = Math.max(0, ...Object.values(counts));
      if (top > Math.max(2, strings.length * 0.1)) {
        problems.push(`field "${k}" repeats one long value in ${top}/${strings.length} rows`);
      }
    }
  }
  // 3. placeholder text anywhere
  const PLACEHOLDER = /detailed explanation of why|think about basic cell biology|lorem ipsum|\bTODO\b|\bTBD\b|\bplaceholder\b|^various$|not microbial but|\(not microbial\)/i;
  rows.forEach((r, i) => {
    Object.keys(r).forEach((k) => {
      const v = r[k];
      const list = Array.isArray(v) ? v : [v];
      list.forEach((x) => {
        if (typeof x === 'string' && PLACEHOLDER.test(x)) problems.push(`row ${i + 1} field "${k}" is placeholder text: ${x.slice(0, 60)}`);
        if (typeof x === 'string' && !x.trim() && !(k === 'wrongFeedback')) problems.push(`row ${i + 1} field "${k}" is empty`);
      });
    });
  });
  // 4. duplicate / near-duplicate rows (by their title field)
  const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
  const titles = rows.map((r) => r[titleKey]);
  const seen = new Map();
  titles.forEach((t, i) => {
    const n = norm(t);
    if (seen.has(n)) problems.push(`rows ${seen.get(n) + 1} and ${i + 1} share the title "${t}"`);
    else seen.set(n, i);
  });
  const ws = titles.map(words);
  for (let a = 0; a < ws.length; a++) {
    for (let b = a + 1; b < ws.length; b++) {
      const A = ws[a]; const B = ws[b];
      if (A.size < 3 || B.size < 3) continue;
      let inter = 0;
      A.forEach((w) => { if (B.has(w)) inter++; });
      const jac = inter / (A.size + B.size - inter);
      if (jac >= 0.8 && norm(titles[a]) !== norm(titles[b])) problems.push(`rows ${a + 1} and ${b + 1} are near-duplicates ("${titles[a]}" / "${titles[b]}")`);
    }
  }
  // 5. near-duplicate rows by whole-row wording (array fields such as quiz
  // options are ignored: distractors legitimately recur). Catches re-worded
  // repeats like "Avery DNA experiments (1944)" / "Avery DNA evidence (1944)".
  const STOP = new Set(['the', 'and', 'for', 'from', 'with', 'that', 'this', 'into', 'are', 'was', 'its', 'their', 'about', 'not', 'but', 'can', 'has', 'have', 'one', 'all']);
  const rowWords = rows.map((r) => new Set(norm(Object.keys(r).filter((k) => k !== 'id' && typeof r[k] === 'string').map((k) => r[k]).join(' '))
    .split(' ').filter((w) => w.length > 2 && !STOP.has(w))));
  for (let a = 0; a < rowWords.length; a++) {
    for (let b = a + 1; b < rowWords.length; b++) {
      const A = rowWords[a]; const B = rowWords[b];
      if (A.size < 4 || B.size < 4) continue;
      let inter = 0;
      A.forEach((w) => { if (B.has(w)) inter++; });
      const jac = inter / (A.size + B.size - inter);
      if (jac >= 0.5) problems.push(`rows ${a + 1} and ${b + 1} say nearly the same thing (${Math.round(jac * 100)}% word overlap)`);
    }
  }
  return problems;
}

describe('filler detector can fire (synthetic fixtures)', () => {
  it('flags values cycling in id order', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      title: 'Distinct real title number ' + i,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
    }));
    const p = detectFiller(rows, 'title');
    expect(p.some((x) => /difficulty.*cycles with period 3/.test(x)), p.join('\n')).toBe(true);
  });

  it('flags a repeated block of rows (the old EXTRA_QUIZ shape)', () => {
    const base = ['What is the basic unit of life?', 'Who discovered cells?', 'What organelle produces ATP?', 'What controls what enters and leaves?'];
    const rows = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, question: base[i % 4] }));
    const p = detectFiller(rows, 'question');
    expect(p.some((x) => /cycles with period 4/.test(x)), p.join('\n')).toBe(true);
    expect(p.some((x) => /share the title/.test(x)), p.join('\n')).toBe(true);
  });

  it('flags pasted placeholder text and near-duplicate titles', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: i === 9 ? 'Watson Crick double helix model (1953)' : (i === 8 ? 'Watson Crick double helix (1953)' : 'Unique experiment ' + i + ' alpha beta'),
      explanation: 'Detailed explanation of why this is the correct answer.',
    }));
    const p = detectFiller(rows, 'name');
    expect(p.some((x) => /placeholder/.test(x)), p.join('\n')).toBe(true);
    expect(p.some((x) => /repeats one long value/.test(x)), p.join('\n')).toBe(true);
    expect(p.some((x) => /near-duplicates/.test(x)), p.join('\n')).toBe(true);
  });

  it('flags a re-worded repeat of the same row (the old Avery 1944 pair)', () => {
    const rows = [
      { id: 1, name: 'Avery DNA experiments (1944)', scientist: 'Avery, MacLeod, McCarty', method: 'Pneumococcus transformation', significance: 'DNA carries genetic info' },
      { id: 2, name: 'Meselson Stahl (1958)', scientist: 'Meselson and Stahl', method: 'Density-gradient centrifugation', significance: 'Semi-conservative DNA replication' },
      { id: 3, name: 'Avery DNA evidence (1944)', scientist: 'Avery, MacLeod, McCarty', method: 'Pneumococcus experiments', significance: 'DNA = genes' },
      { id: 4, name: 'Operon model (1961)', scientist: 'Jacob and Monod', method: 'E. coli genetic studies', significance: 'Gene regulation mechanism' },
    ];
    const p = detectFiller(rows, 'name');
    expect(p.some((x) => /rows 1 and 3 say nearly the same thing/.test(x)), p.join('\n')).toBe(true);
  });

  it('does not flag a clean table, or values grouped in runs', () => {
    const W = ['ribosome', 'nucleus', 'membrane', 'vacuole', 'lysosome', 'chloroplast', 'mitochondrion', 'centriole',
      'flagellum', 'cilium', 'cytoplasm', 'peroxisome', 'vesicle', 'plasmid', 'capsule', 'nucleolus', 'chromatin',
      'spindle', 'thylakoid', 'stroma', 'matrix', 'crista', 'granum', 'cytosol'];
    const rows = Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      question: 'Explain ' + W[i] + ' with ' + W[(i + 5) % 24] + ' and ' + W[(i + 11) % 24],
      topic: ['Anatomy', 'Genetics', 'Lab'][Math.floor(i / 8)],
    }));
    expect(detectFiller(rows, 'question')).toEqual([]);
  });
});

describe('cell quiz bank and reference tables carry no generated filler', () => {
  let src;
  beforeAll(() => { src = fs.readFileSync(SRC_PATH, 'utf8'); });

  for (const [name, titleKey] of Object.entries(TABLES)) {
    it(name + ': no cycling fields, placeholder text or duplicate rows', () => {
      const rows = loadTable(src, name);
      expect(rows.length).toBeGreaterThanOrEqual(10);
      const problems = detectFiller(rows, titleKey);
      expect(problems, name + ':\n' + problems.join('\n')).toEqual([]);
    });
  }

  it('the old placeholder strings are gone from the whole file', () => {
    expect(src.includes('Detailed explanation of why this is the correct answer.')).toBe(false);
    expect(src.includes('Think about basic cell biology principles.')).toBe(false);
  });
});
