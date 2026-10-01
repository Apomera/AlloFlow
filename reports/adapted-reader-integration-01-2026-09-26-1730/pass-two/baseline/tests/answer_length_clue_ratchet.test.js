// Ratchet gate for the answer-length clue in the licensure item banks.
//
// WHY THIS EXISTS. On 2026-08-03 an automated normalization pass tried to clear
// `severe-answer-length-clue` by appending boilerplate to answer choices
// ("...in this case as presented for this item in context under these facts").
// It drove the metric to 0% and shipped 30,215 padded choices plus ungrammatical
// rationales to people studying for licensure exams. That was reverted in
// f6e08fe43, which re-exposed the underlying defect: 3,188 of 12,520 items
// (25.5%) have a key that is >= 20 chars AND >= 75% longer than its longest
// distractor.
//
// The lesson is that this metric is trivially gamed by padding text, so a plain
// "must be 0" gate is actively dangerous — it rewards exactly the thing that
// caused the incident. Instead this is a RATCHET: each pack's count may fall,
// never rise. Paying the debt down is real authoring work and can land pack by
// pack, while a regression fails loudly.
//
// HOW TO FIX AN ITEM (not by shortening the key, and never by padding):
// praxis_core_5752 averages 29-word keys against 26-word distractors and sits at
// 10%, while educational_leadership_5412 averages 24.5 against 14.7 and sits at
// 42.8%. Length is not the problem, PARALLELISM is. The offending items pair a
// key that enumerates the full correct procedure with strawman distractors
// ("Replace the objective with coloring"). The fix is distractors that are
// plausible and matched in specificity — which is also what makes an item
// diagnostic rather than guessable.
//
// TO RE-BASELINE after genuine authoring: regenerate the counts and commit the
// new numbers with the authoring change, so the drop is attributable.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { canonical } = require('../dev-tools/non_eppp_warning_checks.cjs');
const baseline = JSON.parse(
  fs.readFileSync('dev-tools/answer_length_clue_baseline.json', 'utf8'),
);

// Mirrors the rule in dev-tools/non_eppp_warning_checks.cjs. Kept as its own
// copy so a change to the shared checker shows up here as a diff to review
// rather than silently moving every number in the baseline.
function hasSevereLengthClue(choices, answerIndex) {
  if (!Array.isArray(choices) || choices.length !== 4) return false;
  if (typeof answerIndex !== 'number' || !choices[answerIndex]) return false;
  const lengths = choices.map((choice) => canonical(choice).length);
  const key = lengths[answerIndex];
  const longestWrong = Math.max(...lengths.filter((_, i) => i !== answerIndex));
  return key >= longestWrong + 20 && key >= longestWrong * 1.75;
}

function measure(packId) {
  const file = path.join('test_prep', `${packId}_pack.json`);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const items = Array.isArray(parsed) ? parsed : parsed.items || [];
  let severe = 0;
  let counted = 0;
  for (const item of items) {
    const choices = item.choices || item.options;
    const answerIndex = item.answerIndex;
    if (!Array.isArray(choices) || typeof answerIndex !== 'number') continue;
    if (!choices[answerIndex]) continue;
    counted += 1;
    if (hasSevereLengthClue(choices, answerIndex)) severe += 1;
  }
  return { severe, items: counted };
}

const packIds = Object.keys(baseline.packs);

describe('answer-length clue ratchet', () => {
  it('covers every shipped pack', () => {
    expect(packIds.length).toBeGreaterThan(0);
    const shipped = fs
      .readdirSync('test_prep')
      .filter((f) => /_pack\.json$/.test(f))
      .map((f) => f.replace('_pack.json', ''))
      .filter((id) => measure(id) && measure(id).items > 0);
    // A new pack must be added to the baseline deliberately, so it cannot
    // arrive already carrying the defect without someone recording it.
    expect(shipped.filter((id) => !packIds.includes(id))).toEqual([]);
  });

  packIds.forEach((packId) => {
    it(`${packId}: severe-length-clue count does not rise`, () => {
      const actual = measure(packId);
      expect(actual, `pack missing: ${packId}`).not.toBeNull();
      const recorded = baseline.packs[packId];
      expect(
        actual.severe,
        `${packId}: ${actual.severe} severe items vs baseline ${recorded.severe}. ` +
          'If this ROSE, do not pad the choices to fix it — that is the 2026-08-03 ' +
          'incident. Make the distractors parallel in specificity instead. If it ' +
          'FELL, regenerate the baseline and commit it with the authoring change.',
      ).toBeLessThanOrEqual(recorded.severe);
    });
  });

  it('does not let the metric be gamed by boilerplate padding', () => {
    // The incident signature: identical filler appended across many choices.
    // Catch it directly, because it moves the ratchet the wrong way for the
    // right-looking reason.
    const suspicious = [];
    for (const packId of packIds) {
      const file = path.join('test_prep', `${packId}_pack.json`);
      const raw = fs.readFileSync(file, 'utf8');
      if (/in this case as presented for this item in context under these facts/.test(raw)) {
        suspicious.push(packId);
      }
    }
    // Two packs still carry the original padding: reverting them would have
    // deleted 300 newly authored items each that have no clean ancestor.
    expect(suspicious.sort()).toEqual(
      ['reading_specialist_5302', 'speech_language_pathology_5331'].sort(),
    );
  });
});
