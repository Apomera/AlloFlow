# Symbol Studio correctness enhancements

Implemented the three Priority 1 items from [NEXT-OPPORTUNITIES.md](NEXT-OPPORTUNITIES.md), plus a Garden toolbar layout fix found during browser verification.

## Review-aware automatic reuse

Exact-label reuse now ranks approved assets above unreviewed assets, then assets marked `needs_changes`. Preferred, validated, locked, and favorite attributes break ties within a review tier. An asset without an image cannot satisfy image reuse.

Board generation, text-to-symbol mapping, sequences, and Garden reuse actions summarize any unreviewed or flagged fallback. The mapping preview also shows the reused asset's review status. Garden actions take the image and asset reference from the same selected asset; creating a Garden Board preserves those references. Existing saved boards are not rewritten by this ranking change.

## Consistent AAC activity metrics

The session summary, Garden activity displays, practice report, CSV, and sidebar tap counts use a shared calculation:

- **Symbol taps:** recorded non-message events with a nonempty label.
- **Unique tapped labels:** case-insensitive, canonically equivalent Unicode labels grouped together.
- **Speech requests:** explicit `__UTTERANCE__` markers. These record pressing Speak, not confirmed audible playback.
- **Mean symbols per message:** the mean of valid positive integer lengths recorded on those markers. Removed symbols, cleared strips, and trailing unsent taps do not create or enlarge messages. Repeated Speak presses count as separate requests.
- **Legacy unknown lengths:** retained and counted separately; excluded from the mean. If no length is known, the mean is blank in CSV rather than an inferred zero.

New sessions carry `metricsVersion: 2`. Their speech-request entries retain the phrase and ordered symbol labels/source cell IDs. Saved legacy sessions remain readable without fabricated composition data. Printed reports use descriptive activity counts rather than the previous Rich/Developing/Emerging/Limited ratio classifications.

**CSV compatibility:** aggregate columns `total_utterances`, `unique_utterances`, and `lexical_diversity` become `symbol_taps`, `unique_tapped_labels`, and `tap_type_token_ratio`. The existing `mean_symbols_per_message` column now uses recorded lengths. Added columns are `speech_requests`, `known_message_lengths`, `unknown_message_lengths`, and `metrics_version`. Downstream scripts using the old names or column positions need updating. Function and growth columns still describe resource coverage; they are not clinical outcome measures.

## Unicode activity and spelling

Garden aggregation, practice lookup/recording, Quest pool deduplication, spelling checks, wishes, and saved-session counts use canonical Unicode normalization. Café and Café share one activity identity, as do composed and decomposed Hangul syllables. Accents, Indic marks, punctuation, and compatibility-only differences remain meaningful for spelling and activity identity. Search continues to use its separate discovery normalization.

When separate legacy familiarity buckets exist for equivalent labels, their valid counters are summed, earliest first-seen and latest last-seen dates are preserved, and the next practice event consolidates them into one canonical key. Consolidation is idempotent: later events increment once instead of merging the old buckets again. Original labels and symbol assets remain intact.

## Garden layout

Search, sorting, and action buttons now wrap with usable widths. Explanatory text, unassigned-wish review, and wish entry occupy separate rows. The changed toolbar inputs and action buttons have 44-pixel minimum heights. This corrects the previously compressed search field and clipped action labels seen when several Garden actions are available.

## Verification

- 116 tests across 11 affected regression files, including 14 new activity/reuse tests. See [final test results](correctness-final-tests.json).
- Reviewed and updated the Garden layout snapshot; the other snapshot cases remain unchanged by the toolbar edit.
- Chromium workflows at 1440, 390, and 320 pixels verify approved reuse, fallback notices, one Garden card for equivalent Unicode labels, legacy message counts, persisted composition, a two-symbol summary after three taps and one deletion, aggregate counts after session exit, summary dismissal, and no page errors. See [browser checks](correctness-browser/checks.json) and [reproducible runner](correctness-browser.cjs).
- Inspected the desktop and narrow Garden screenshots and the 320-pixel session summary. No horizontal overflow was detected in the exercised Garden layout; the summary fits all three widths.
- Root and desktop/public modules remain byte-identical. JavaScript syntax and scoped whitespace checks pass.

Tests and browser fixtures use synthetic learners and local data. Cloud generation and real audible TTS playback were not exercised. This is focused regression verification, not a full repository test run or accessibility conformance audit.

The remaining roadmap includes separating resource coverage from practice evidence, saving completed stories and Quick Boards as named resources, import previews, library selection actions, and broader save-failure recovery. Language-aware matching inside unspaced CJK story text remains separate from the canonical-equivalence fix.
