// Ratchet gate for the longest-answer tell in TOOL quiz banks (stem_lab + sel_hub).
//
// The licensure packs already have this gate (tests/answer_length_clue_ratchet
// .test.js); the ~216 tool files had nothing, and the first sweep found 32 of 43
// measurable banks with the key uniquely longest in >=40% of questions -
// civicaction and swimlab at 100%. A length tell SURVIVES shuffling and
// rotation, so a position-clean bank can still be answered by "pick the
// longest".
//
// Same hard-won policy as the packs (f6e08fe43): the fix is hand-authored
// distractors of matched specificity, never padding, never editing the key.
// The counts in dev-tools/tool_answer_length_clue_baseline.json may only go
// DOWN; pay the debt bank by bank and commit the new baseline with the
// authoring change so the drop is attributable.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

describe('tool answer-length-clue ratchet', () => {
  it('no measurable bank got worse than the committed baseline', () => {
    // The scanner exits 1 and prints RATCHET FAIL lines when a count rises.
    const out = execFileSync('node', ['dev-tools/scan_tool_answer_length_clue.cjs', '--check'], {
      encoding: 'utf8',
    });
    expect(out).toContain('ratchet OK');
  });

  it('civicaction stays clear: the first paid-down bank must not regress', () => {
    // 2026-08-23: 24/24 keys uniquely longest (16 severe) -> 0/0 by hand-
    // rewriting all 72 distractors as plausible misconceptions of matched
    // length. Keys byte-untouched, answer index unchanged (the module-load
    // rotation still spreads positions). If this fails, someone re-introduced
    // quip distractors ("A pirate ship") - rewrite them, do not pad them.
    const base = JSON.parse(fs.readFileSync('dev-tools/tool_answer_length_clue_baseline.json', 'utf8'));
    expect(base.tools['sel_hub/civicaction']).toEqual({ uniq: 0, severe: 0, items: 24 });
  });

  it('string-valued answers are measured: schema D coverage cannot silently regress', () => {
    // 2026-08-25: `correct: 'Nitrite'` / `answer: '...'` banks were invisible
    // to the scanner. Adding schema D lifted aquarium from 100 to 146 measured
    // items and made flightsim (50 items) appear at all; both were then paid
    // down to zero by hand. The ITEM counts are the coverage pin - if someone
    // narrows the answer-field regexes again, aquarium falls back to 100 and
    // flightsim disappears, and this test says so.
    const base = JSON.parse(fs.readFileSync('dev-tools/tool_answer_length_clue_baseline.json', 'utf8'));
    expect(base.tools['stem_lab/aquarium']).toEqual({ uniq: 0, severe: 0, items: 146 });
    expect(base.tools['stem_lab/flightsim']).toEqual({ uniq: 0, severe: 0, items: 50 });
    expect(base.tools['stem_lab/companionplanting']).toEqual({ uniq: 0, severe: 0, items: 18 });
    expect(base.tools['stem_lab/fisherlab']).toEqual({ uniq: 0, severe: 0, items: 70 });
    expect(base.tools['stem_lab/beehive']).toEqual({ uniq: 0, severe: 0, items: 24 });
  });
});
