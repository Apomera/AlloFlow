import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Complement to microbiology_resistance_sim.test.js: verifies the quiz bank,
// whose authored answers sat at index 1 for 12 of 15 questions ("always pick
// B" scored 80%) until the deterministic rotation was added.

const src = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_microbiology.js', 'utf8');

function loadBank(withRotation) {
  const start = src.indexOf('var QUIZ_QUESTIONS = [');
  const endMarker = withRotation ? '// ──────────────────────────────────────────────────────────────────\n  // INTERACTIVE WIDGETS' : '// The authored bank put 12 of 15';
  const end = src.indexOf(endMarker, start);
  expect(start).toBeGreaterThan(-1);
  expect(end, endMarker.slice(0, 30)).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn QUIZ_QUESTIONS;')();
}

describe('quiz bank rotation (regression pins)', () => {
  const raw = loadBank(false);
  const rotated = loadBank(true);

  it('spreads correct answers across the slots instead of stacking them on B', () => {
    const rawSlots = [0, 0, 0, 0];
    raw.forEach((q) => rawSlots[q.answer]++);
    expect(Math.max(...rawSlots)).toBeGreaterThanOrEqual(12); // the authored tell
    const slots = [0, 0, 0, 0];
    rotated.forEach((q) => slots[q.answer]++);
    expect(slots.filter((c) => c > 0).length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...slots)).toBeLessThanOrEqual(6);
  });

  it('rotation preserves each question\'s correct answer TEXT and full option set', () => {
    expect(rotated.length).toBe(raw.length);
    rotated.forEach((q, i) => {
      expect(q.choices[q.answer], 'q' + i).toBe(raw[i].choices[raw[i].answer]);
      expect(q.choices.slice().sort(), 'q' + i).toEqual(raw[i].choices.slice().sort());
    });
  });

  it('every question is well-formed: 4 unique choices, in-range answer, explanation', () => {
    for (const q of rotated) {
      expect(q.choices.length, q.q).toBe(4);
      expect(new Set(q.choices).size, q.q).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length, q.q).toBeGreaterThan(40);
    }
  });

  it('spot-checks the science of key answers', () => {
    const byQ = (needle) => rotated.find((q) => q.q.includes(needle));
    expect(byQ('gut microbiome').choices[byQ('gut microbiome').answer]).toContain('fiber');
    expect(byQ('fungi closest').choices[byQ('fungi closest').answer]).toBe('Animals');
    expect(byQ('DOMAINS').choices[byQ('DOMAINS').answer]).toContain('Three');
    expect(byQ('antibiotic resistance evolve').choices[byQ('antibiotic resistance evolve').answer]).toContain('Random mutations');
    expect(byQ('1854 London cholera').choices[byQ('1854 London cholera').answer]).toContain('mapped');
    expect(byQ('2016 reference-adult').choices[byQ('2016 reference-adult').answer]).toContain('38 trillion bacteria and 30 trillion human cells');
    expect(byQ('2016 reference-adult').explain).toContain('not exact counts for every person');
  });

  it('keeps the Snow quiz and case study consistent with the limits of the historical evidence', () => {
    const snow = rotated.find(q => q.q.includes('1854 London cholera'));
    expect(raw.find(q => q.q.includes('1854 London cholera')).answer).toBe(1);
    expect(snow.choices[snow.answer]).toContain('mapped where deaths occurred');
    expect(snow.choices[snow.answer]).toContain('which water people drank');
    expect(snow.explain).toContain('already declining before removal');
    expect(snow.explain).toContain('decline alone does not measure');
    expect(snow.explain).not.toMatch(/every cholera death|founded.*data visualization/);
    const start = src.indexOf("id: 'snow', name:");
    const card = src.slice(start, src.indexOf("id: 'penicillin', name:", start));
    expect(card).toContain('attacks were already declining before the closure');
    expect(card).toContain('households using other sources');
    expect(card).not.toContain('mapped every death');
    expect(card).not.toContain('map proved');
  });

  it('bounds fermentation preservation claims and retains the authored answer position', () => {
    const question = raw.find(q => q.q.includes('lactic acid fermentation'));
    const displayed = rotated.find(q => q.q === question.q);
    expect(question.answer).toBe(1);
    expect(displayed.choices[displayed.answer]).toContain('lower the pH');
    expect(displayed.explain).toContain('does not sterilize food or guarantee safe storage');
    expect(displayed.explain).toContain('refrigeration when required');
    expect(displayed.q).not.toContain('even at room temperature');
    expect(displayed.explain).not.toContain('preserved without refrigeration');
  });

  it('compares stated linear dimensions without inventing a volume or resolution limit', () => {
    const question = raw.find(q => q.q.includes('2 µm long'));
    const displayed = rotated.find(q => q.q === question.q);
    expect(question.answer).toBe(1);
    expect(displayed.q).toContain('20 µm across');
    expect(displayed.choices[displayed.answer]).toContain('one-tenth');
    expect(displayed.explain).toContain('does not by itself give a volume ratio');
    expect(displayed.explain).toContain('Many bacteria can be resolved');
    expect(displayed.explain).not.toMatch(/1000x less volume|Most bacteria are at the resolution limit/);
  });

  it('identifies organelles and evidence for endosymbiosis without claiming every cell has them', () => {
    const question = raw.find(q => q.q.includes('organelles have bacterial ancestors'));
    const displayed = rotated.find(q => q.q === question.q);
    expect(question.answer).toBe(1);
    expect(displayed.choices[displayed.answer]).toBe('Mitochondria and chloroplasts');
    expect(displayed.explain).toContain('DNA and bacterial-like ribosomes');
    expect(displayed.explain).toContain('most eukaryotic cells');
    expect(displayed.explain).toContain('many algae');
    expect(displayed.explain).not.toContain('in all eukaryotic cells');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
