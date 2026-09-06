// Answer-position bias guard.
//
// Before this pass, 23 of the 30 quiz answers sat at option index 1, and the three
// banks a student meets first (crust, geode, deepEarth) were 100% index 1 — so a
// student who never read a question and always tapped the second option scored 100%
// on those scenes and 77% overall. That is a measurement failure, not a style nit:
// the quiz stops reporting what the student knows.
//
// These tests pin the PROPERTY (positions are mixed), plus the science of every item
// that was reordered, so a future edit cannot quietly re-stack the answers.
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

const allItems = () => Object.entries(P.quizBanks()).flatMap(([scene, bank]) =>
  bank.items.map((item, index) => ({ scene, index, item })));

describe('Geology Explorer quiz answer positions', () => {
  it('gives no single option position a passing score across the whole tool', () => {
    const items = allItems();
    expect(items.length).toBeGreaterThanOrEqual(29);
    const tally = {};
    for (const { item } of items) tally[item.correct] = (tally[item.correct] || 0) + 1;
    const best = Math.max(...Object.values(tally));
    // Every item offers three options, so an even spread is ~33% each. The current
    // spread is 10/10/9 across 29 items, so the best fixed-position guess scores 34%.
    expect(best / items.length, `positions ${JSON.stringify(tally)}`).toBeLessThanOrEqual(0.45);
  });

  // A two-option item is a coin flip: a student who knows nothing scores ~50%, and the
  // tool's own quizByScene {answered, correct} then reports that as partial mastery.
  // Every item carries a third option, which puts blind guessing at 33%.
  it('never lets blind guessing approach a passing score', () => {
    const items = allItems();
    for (const { scene, index, item } of items) {
      expect(item.opts.length, `${scene}:${index} has only ${item.opts.length} options`)
        .toBeGreaterThanOrEqual(3);
    }
    const chance = items.reduce((sum, { item }) => sum + 1 / item.opts.length, 0) / items.length;
    expect(chance, 'expected score from pure guessing').toBeLessThanOrEqual(0.35);
  });

  it('never stacks a whole scene bank on one position', () => {
    for (const [scene, bank] of Object.entries(P.quizBanks())) {
      const positions = bank.items.map((q) => q.correct);
      const distinct = new Set(positions);
      expect(distinct.size, `${scene} answers all at index ${positions[0]}: ${JSON.stringify(positions)}`)
        .toBeGreaterThan(1);
    }
  });

  it('varies the position of each bank’s opening question', () => {
    const openers = Object.values(P.quizBanks()).map((bank) => bank.items[0].correct);
    expect(new Set(openers).size, `openers ${JSON.stringify(openers)}`).toBeGreaterThan(1);
  });

  it('keeps every correct answer in range and every option distinct', () => {
    for (const { scene, index, item } of allItems()) {
      const where = `${scene}:${index}`;
      expect(item.correct, where).toBeGreaterThanOrEqual(0);
      expect(item.correct, where).toBeLessThan(item.opts.length);
      expect(new Set(item.opts).size, `${where} has a duplicated option`).toBe(item.opts.length);
      for (const opt of item.opts) expect(opt.trim().length, where).toBeGreaterThan(0);
    }
  });

  // The science of every item whose options were reordered. Content-based, so the
  // options may be reordered again freely — but the ANSWER may not change.
  it('pins the science of every reordered item', () => {
    const b = P.quizBanks();
    const answer = (id, i) => b[id].items[i].opts[b[id].items[i].correct];
    expect(answer('crust', 0)).toMatch(/limestone/i);          // lower layer is older
    expect(answer('crust', 2)).toMatch(/baked the limestone/i); // contact metamorphism
    expect(answer('crust', 3)).toMatch(/shale/i);               // fossils in sedimentary rock
    expect(answer('geode', 0)).toMatch(/slowly/i);              // slow growth = big crystals
    expect(answer('geode', 2)).toMatch(/iron/i);                // amethyst colour
    expect(answer('deepEarth', 1)).toMatch(/s-waves cannot/i);  // liquid outer core
    expect(answer('deepEarth', 3)).toMatch(/outer core/i);      // geodynamo
    expect(answer('ridge', 0)).toMatch(/spreads out from the axis/i);
    expect(answer('hotspot', 0)).toMatch(/plate/i);             // the plate moves, not the plume
  });

  // Length is the OTHER free signal. Before this pass 25 of 29 correct answers were the
  // longest option (avg 28.8 chars vs 19.6 for distractors), so "pick the longest" scored
  // 86% — better than the position guess it replaced.
  it('does not let option length give the answer away', () => {
    const items = allItems();
    let longest = 0, correctChars = 0, distractorChars = 0;
    for (const { item } of items) {
      const lengths = item.opts.map((o) => o.length);
      const max = Math.max(...lengths), min = Math.min(...lengths);
      if (lengths[item.correct] === max && max !== min) longest++;
      correctChars += lengths[item.correct];
      distractorChars += lengths.filter((_, j) => j !== item.correct)
        .reduce((a, b) => a + b, 0) / (lengths.length - 1);
    }
    // With three options, chance alone puts the answer at "longest" ~33% of the time.
    // Currently 12/29 (41%).
    expect(longest / items.length, `${longest}/${items.length} answers are the longest option`)
      .toBeLessThanOrEqual(0.55);
    // Mean length must be comparable either way. Currently 1.03.
    expect(correctChars / distractorChars, 'mean correct/distractor length ratio')
      .toBeLessThanOrEqual(1.15);
  });

  it('gives every distractor enough substance to name a misconception', () => {
    const words = (s) => s.trim().split(/\s+/).length;
    for (const { scene, index, item } of allItems()) {
      // The bar is symmetric: a distractor only needs substance when the ANSWER has
      // substance. 'Sandstone' opposite 'Limestone' is a fair one-word item; 'Copper'
      // opposite 'Trace iron plus natural irradiation' is a stub that no one picks for
      // the right reason, and that names no misconception when someone does.
      const floor = Math.min(3, words(item.opts[item.correct]));
      item.opts.forEach((opt, j) => {
        if (j === item.correct) return;
        expect(words(opt), `${scene}:${index} distractor "${opt}" is a stub beside "${item.opts[item.correct]}"`)
          .toBeGreaterThanOrEqual(floor);
      });
    }
  });

  // Per-option remediation. Before this, every wrong answer on an item produced identical
  // feedback — and giving each item a third option made that worse, two distractors sharing
  // one response. These notes are keyed by option TEXT because the options have been
  // reordered twice; an index-keyed table would misalign silently and confidently explain
  // the wrong choice, which is worse than saying nothing.
  describe('per-option remediation', () => {
    it('answers every distractor in the tool specifically', () => {
      const missing = [];
      for (const { scene, index, item } of allItems()) {
        item.opts.forEach((opt, j) => {
          if (j === item.correct) return;
          if (!P.quizOptionNote(scene, index, opt)) missing.push(`${scene}:${index} → "${opt}"`);
        });
      }
      expect(missing, `distractors with no targeted note: ${missing.join(' | ')}`).toEqual([]);
    });

    it('has no note keyed to text that is no longer an option', () => {
      // The failure mode of text keys: reword an option and its note silently goes dead.
      const orphans = [];
      const table = P.quizOptionNotes();
      for (const [scene, items] of Object.entries(table)) {
        const bank = P.quizBanks()[scene];
        expect(bank, `notes for unknown scene ${scene}`).toBeTruthy();
        items.forEach((notes, index) => {
          const opts = bank.items[index] ? bank.items[index].opts : [];
          for (const key of Object.keys(notes)) {
            if (opts.indexOf(key) < 0) orphans.push(`${scene}:${index} → "${key}"`);
          }
        });
      }
      expect(orphans, `notes keyed to text no option uses: ${orphans.join(' | ')}`).toEqual([]);
    });

    it('never attaches a note to the correct answer', () => {
      for (const { scene, index, item } of allItems()) {
        const note = P.quizOptionNote(scene, index, item.opts[item.correct]);
        expect(note, `${scene}:${index} correct answer carries remediation`).toBe('');
      }
    });

    it('says something different about each wrong option', () => {
      for (const { scene, index, item } of allItems()) {
        const notes = item.opts
          .filter((_, j) => j !== item.correct)
          .map((opt) => P.quizOptionNote(scene, index, opt));
        expect(new Set(notes).size, `${scene}:${index} reuses one note for both distractors`)
          .toBe(notes.length);
        for (const note of notes) expect(note.length, `${scene}:${index}`).toBeGreaterThan(40);
      }
    });

    it('still answers the two-argument call, without a note', () => {
      const entry = P.quizRemediation('collision', 0);
      expect(entry.remedy.length).toBeGreaterThan(40);
      expect(entry.note).toBeUndefined();
      const targeted = P.quizRemediation('collision', 0, 'Birds carried the shells up');
      expect(targeted.note).toMatch(/inside solid limestone/i);
      expect(targeted.remedy).toBe(entry.remedy);
    });
  });

  it('keeps each item’s explanation attached to its own answer', () => {
    for (const { scene, index, item } of allItems()) {
      expect(item.why.length, `${scene}:${index}`).toBeGreaterThan(20);
      expect(P.quizRemediation(scene, index).id, `${scene}:${index}`).toBeTruthy();
    }
  });
});
