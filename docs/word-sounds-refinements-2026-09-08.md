# Word Sounds refinements — 2026-09-08

This pass improves activity transitions and the accuracy of saved learning evidence.

## Changes

- Activity switches now calculate automatic difficulty from the destination activity and its support context before creating its queue. Recovery from an empty queue also takes a word from the destination activity. Manual difficulty remains authoritative.
- Practice queues honor the current-word exclusion when an alternative exists, removing exactly the item served. Fixed forms and probes retain their authored order, including intentional repetitions. Single-word queues still drain normally.
- Phoneme mastery accepts prepared pronunciation objects as well as legacy strings. It resolves a displayed label from grapheme, phoneme, or IPA, ignores malformed entries, and counts each distinct label once per response. Object data no longer accumulates under an object-string key.
- Saved responses record printed-word and printed-label support. Text shown as success feedback does not retroactively change the submitted response. Always-visible text settings are also reflected in evidence and adaptive context.
- Printed support remains successful practice but does not increase independent mastery counts or independent streaks. Phoneme records separately count text-supported attempts and successes; existing AAC and retry fields remain available.
- Exposed-answer responses cannot advance automatic difficulty, including records without a connected-text task label.

## Compatibility and limits

Existing totals are retained. Earlier malformed object-string entries are not deleted or redistributed: their underlying sounds cannot reliably be inferred from the aggregate. Sound labels preserve the existing spelling-based key convention; this is not a migration to a universal IPA inventory.

The new evidence describes support present at submission. It does not reconstruct old rows or create a complete timeline of every support toggled during a presentation. Connected-text tasks retain their explicit picture-cloze or visible-answer-matching classification.

## Verification

- Tests execute the actual runtime callbacks for destination difficulty, queue consumption, and mastery updates.
- Mounted React tests submit answers with and without printed labels and verify saved evidence, including the post-answer feedback boundary.
- Shared-core synchronization, JavaScript syntax, generated setup build, and runtime/setup public-mirror parity are checked.
- All 603 tests across 55 files passed across the full run and targeted rerun. The initial run had 599 passes and four timeouts in accessibility/audio tests; both affected files passed all 27 tests when rerun with a 20-second timeout. No assertions or application code changed between runs. Original results, the rerun, and `validation-summary.json` are retained in `reports/word-sounds-refinements-2026-09-08/`.

Changes are local; no deployment was performed.
