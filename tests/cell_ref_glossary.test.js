// REF lane: glossary topics, diagrams and the self-test's answer balance.
import { beforeAll, describe, expect, it } from 'vitest';
import { extractArray, harness, leaks } from './cell_ref_helpers.js';

let R, H, GL;
beforeAll(async () => {
  H = await harness();
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  R = window.__alloCellRef;
  GL = extractArray('CELL_GLOSSARY');
});

describe('REF glossary data', () => {
  it('files every term under a real topic, with enough terms per topic for a quiz', () => {
    const topics = R.CELL_REF_GLOSS_TOPICS.map(t => t.id);
    expect(GL.length).toBeGreaterThanOrEqual(130);
    const ids = new Set(), terms = new Set();
    for (const g of GL) {
      expect(topics, g.term).toContain(g.topic);
      expect(typeof g.definition === 'string' && g.definition.length > 15, g.term).toBe(true);
      expect(ids.has(g.id), 'duplicate id ' + g.id).toBe(false);
      expect(terms.has(g.term.toLowerCase()), 'duplicate term ' + g.term).toBe(false);
      ids.add(g.id); terms.add(g.term.toLowerCase());
    }
    for (const t of topics) expect(GL.filter(g => g.topic === t).length, t).toBeGreaterThanOrEqual(4);
  });

  it('links the ten core process terms to a diagram that exists and renders cleanly', () => {
    const want = { Diffusion: 'diffusion', Osmosis: 'osmosis', 'Active transport': 'active', Endocytosis: 'endocytosis', Exocytosis: 'exocytosis', Mitosis: 'mitosis', Meiosis: 'meiosis', Transcription: 'transcription', Translation: 'translation', Apoptosis: 'apoptosis' };
    const linked = GL.filter(g => g.diagram);
    expect(linked.length).toBe(10);
    for (const [term, key] of Object.entries(want)) {
      expect(GL.find(g => g.term === term).diagram, term).toBe(key);
      const svg = H.ReactDOMServer.renderToStaticMarkup(R.renderCellRefDiagram(H.React.createElement, key));
      expect(svg, key).toContain('role="img"');
      expect(svg, key).toContain('Schematic, not to scale.');
      expect(leaks(svg), key).toEqual([]);
    }
  });

  it('keeps diagram facts correct: codon/anticodon pairs and amino acids match the code', () => {
    const svg = H.ReactDOMServer.renderToStaticMarkup(R.renderCellRefDiagram(H.React.createElement, 'translation'));
    const pair = { A: 'U', U: 'A', G: 'C', C: 'G' };
    // P-site tRNA AAG sits on codon UUC (Phe); A-site CCU on GGA (Gly)
    for (const [codon, anti] of [['UUC', 'AAG'], ['GGA', 'CCU']]) expect(codon.split('').map(c => pair[c]).join('')).toBe(anti);
    for (const aa of ['Met', 'Ala', 'Phe', 'Gly']) expect(svg).toContain('>' + aa + '<');
    expect(R.CELL_REF_DIAGRAMS.translation.caption).toContain('AUG = Met, GCU = Ala, UUC = Phe, GGA = Gly');
  });
});

describe('REF glossary self-test', () => {
  it('rotates the answer through every slot evenly in every round', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const items = R.cellRefGlossQuiz(GL, seed, 8, 'all');
      expect(items.length).toBe(8);
      const slots = [0, 0, 0, 0];
      items.forEach(it => slots[it.answer]++);
      expect(slots, 'seed ' + seed).toEqual([2, 2, 2, 2]);
    }
  });

  it('builds fair cards: answer present once, distinct choices, no giveaway in the prompt', () => {
    let longest = 0, total = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const topic of ['all', 'transport', 'genetics', 'scale']) {
        for (const it of R.cellRefGlossQuiz(GL, seed, 8, topic)) {
          total++;
          expect(it.choices[it.answer]).toBe(it.term);
          expect(new Set(it.choices).size).toBe(it.choices.length);
          expect(it.choices.length).toBe(4);
          expect(it.prompt.toLowerCase(), it.term).not.toContain(it.term.toLowerCase());
          for (const c of it.choices) if (c !== it.term) expect(it.prompt.toLowerCase(), it.term + ' vs ' + c).not.toContain(c.toLowerCase());
          const lens = it.choices.map(c => c.length), max = Math.max(...lens);
          if (lens[it.answer] === max && lens.filter(l => l === max).length === 1) longest++;
        }
      }
    }
    // the right answer must not be guessable as "the longest option"
    expect(longest / total).toBeLessThan(0.4);
    // terms marked quiz:false (synonym/plural entries) never become questions
    for (let seed = 1; seed <= 50; seed++) for (const it of R.cellRefGlossQuiz(GL, seed, 8, 'all')) expect(['Plasma membrane', 'Stoma']).not.toContain(it.term);
  });

  it('is deterministic per seed and tolerates malformed saved rounds', () => {
    expect(R.cellRefGlossQuiz(GL, 77, 8, 'all')).toEqual(R.cellRefGlossQuiz(GL, 77, 8, 'all'));
    const items = R.cellRefGlossQuiz(GL, 77, 8, 'all');
    expect(R.cellRefQuizState({ picks: ['x', 9, -1, 2.5, null], idx: 'bad' }, items)).toMatchObject({ idx: 0, picks: [-1, -1, -1, -1, -1], score: 0, done: false });
    expect(R.cellRefQuizState('nope', items)).toBeNull();
    for (const raw of [{ seed: 'x' }, { seed: -5, picks: 'all', done: true }, { seed: 3, topic: 'bogus', idx: 99, picks: [0, 1, 2, 3, 0, 1, 2, 3], done: true }]) {
      const html = H.renderTool('cell', { cell: { mode: 'glossary', _glossMode: 'test', _glossQuiz: raw, _glossBest: 'many' } });
      expect(html).toContain('data-cell-ref="glossary"');
      expect(leaks(html)).toEqual([]);
    }
    const card = H.renderTool('cell', { cell: { mode: 'glossary', _glossMode: 'test', _glossQuiz: { seed: 5, idx: 0, picks: [] } } });
    expect(card).toContain('Card 1 of 8');
  });
});
