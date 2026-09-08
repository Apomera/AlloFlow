import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The other AP packs reach zero on character-length parity. This one cannot,
// honestly: many of its items ask a learner to name a construct, so all four
// options are domain terms and the keyed term is sometimes just the longest
// word in that topic's vocabulary. Padding a term would falsify it, and pulling
// a longer term from another topic would hand the learner an obvious
// elimination. So the pass did three things instead: it made concept
// distractors length-aware within their own topic, it rewrote the three
// reviewed seed items whose options were prose or had a weak short distractor,
// and it capped what remains so the count can only fall.
const packPath = resolve(process.cwd(), 'test_prep/ap_psychology_pilot.json');
const qaScriptPath = resolve(process.cwd(), 'dev-tools/qa_ap_psychology_pilot.cjs');
const builderPath = resolve(process.cwd(), 'dev-tools/build_ap_psychology_500_bank.cjs');
const ALLOWANCE = 18;
let cachedPack;
const readPack = () => {
  if (!cachedPack) cachedPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  return cachedPack;
};
const looksLikeProse = (choice) => String(choice || '').length > 45 || /[.!?]$/.test(String(choice || '').trim());
const cued = (item) => {
  const lengths = item.choices.map((choice) => String(choice || '').length);
  const key = lengths[item.answerIndex];
  const longest = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  return { isCued: !(longest > 0 && key < longest * 1.25), key, longest };
};
const SLOW = 30_000;

describe('AP Psychology choice-length parity', () => {
  it('length-matches every item whose options are prose', () => {
    readPack().items.forEach((item) => {
      if (!item.choices.some(looksLikeProse)) return;
      const { isCued, key, longest } = cued(item);
      expect(isCued, `${item.id} keyed prose option runs ${key} against ${longest}`).toBe(false);
    });
  }, SLOW);

  it('leaves only bare-term items above the ratio, and no more than the allowance', () => {
    const remaining = readPack().items.filter((item) => cued(item).isCued);
    expect(remaining.length).toBeLessThanOrEqual(ALLOWANCE);
    // Every one of them is a name-the-construct item: four short domain terms.
    remaining.forEach((item) => {
      item.choices.forEach((choice) => expect(looksLikeProse(choice), `${item.id} :: ${choice}`).toBe(false));
    });
  }, SLOW);

  it('chooses concept distractors by length within their own topic', () => {
    const source = fs.readFileSync(builderPath, 'utf8');
    expect(source).toContain('chooseConceptDistractorLabels');
    // The helper must not reach outside the topic for a longer label; an
    // off-topic distractor is easier to eliminate than a short on-topic one.
    expect(source).toContain('concepts.filter((_, index) => index !== blueprint.conceptIndex).map((concept) => concept.label)');
  });

  it('repairs the three reviewed seed items', () => {
    const byId = new Map(readPack().items.map((item) => [item.id, item]));
    // Habituation was the shortest option and the least tempting one; vicarious
    // reinforcement is the near neighbour a learner actually has to rule out.
    const modeling = byId.get('ap-psych-u3-004');
    expect(modeling.choices).toContain('Vicarious reinforcement');
    expect(modeling.choices).not.toContain('Habituation');
    expect(modeling.choiceRationales[modeling.choices.indexOf('Vicarious reinforcement')]).toMatch(/rewarding consequence/);
    // Actor-observer asymmetry is the current name for the same idea.
    const attribution = byId.get('ap-psych-u4-001');
    expect(attribution.choices).toContain('The actor-observer asymmetry');
    expect(attribution.choiceRationales[attribution.choices.indexOf('The actor-observer asymmetry')]).toMatch(/^Actor-observer asymmetry/);
    // Prose options, so these were simply stated at the length of the key.
    const heritability = byId.get('ap-psych-u1-005');
    expect(cued(heritability).isCued).toBe(false);
    heritability.choices.forEach((choice) => expect(choice.length).toBeGreaterThan(95));
  });

  it('is guarded by a QA gate rather than an advisory alone', () => {
    const source = fs.readFileSync(qaScriptPath, 'utf8');
    expect(source).toContain("'choice-length-parity'");
    expect(source).toContain('TERM_ONLY_LENGTH_CUE_ALLOWANCE = ' + ALLOWANCE);
  });
});
