# Corpus refinement — Round 11 (2026-08-10)

**Focus:** clearing the round-4/5 backlog — the Artemis colour-space skips and
the 1954 pure-scan honesty path — plus closing the i1040 verification loop.
**Cost: $0 in API fees.** Engine 0.2.4.

## 1. Artemis figures: every real image now extracts (engine 0.2.4)

`extract-images` on the NASA Artemis plan went **144 extracted / 8 skipped ->
156 extracted / 2 skipped**, and the two remaining skips are 3x939-pixel
decorative slivers below the size floor, skipped correctly. Three colour-space
classes were closed in `_resolve_color_space` (now returning a `transform`
tag the caller applies after predictor undo):

| Class | Artemis objects | Treatment |
| --- | --- | --- |
| `/DeviceCMYK` raw samples (+ ICCBased N=4) | 44 | naive CMYK->RGB per pixel; exact colorimetry was never this pathway's claim |
| `[/DeviceN[/one-ink] /alt ...]` | 327, 367 | identity tint: decode as INVERTED gray (0 = no ink = white) instead of executing the embedded Type-4 function |
| `/Indexed` with base and/or lookup behind indirect refs | 309, 376, 409 | resolve the base ref, derive its component count (RGB / Gray / CMYK / ICC N), normalise the palette to RGB triplets |

Every claim above was checked by EYE, not just by PNG validity: obj 44 renders
as the navy/gold Presidential Memorandum panel, obj 327 as a correct-polarity
black-on-white text page, obj 309 as the FY2021-25 budget table with correct
colours. A mis-decode produces a perfectly valid PNG of garbage, so a visual
read is the only honest acceptance here.

Multi-ink DeviceN, Separation, and Lab remain out of deterministic scope and
still skip with honest reasons.

## 2. The 1954 pure scan: refusal works, and a reporting gap is now closed

Probe A — `document_type: "form"` against the true pure scan: **refused** by
plan validation, exit code 3, "Automatic rebuild is blocked for forms, signed
records, and legal records." No artifacts. As designed since round 1.

Probe B — the gap: a `document_type: "other"` plan containing ONE heading
against the 4-page scan produced a tagged PDF that **passed PDF/UA-1 with the
identifier earned, outputTextRecall 1.0, verdict
`pdf_generated_validation_passed_review_required`** — every automated signal
read as success, because each was individually true: the structure tree is
valid, and the PDF does carry the plan. Nothing said the plan covers nothing.
`sourceTextRecall: not_measurable` carried the only warning, one level down.

Fix (0.2.4): when source recall is `not_measurable`, `manualReview` now
carries an engine-authored line — independent of anything the plan author
chose to disclose — stating that NO automated check in the report could
compare the rebuild against the source and that outputTextRecall only proves
the PDF carries the plan.

## 3. i1040 verification loop CLOSED: `result: "verified"`

The 19 discrepancies from the first independent reading were fixed at the
generators and a SECOND fresh-context reader re-attested exactly those 19
items against the corrected artifact (the other 1,644 attestations carry over
byte-identical content, stated in the verifier statement). All 19 verified —
the reader reconstructed the Tax Topics columns from page geometry and
checked the emphasis fixes against resolved font programs.
`verify-check`: **1,663/1,663, 0 discrepancies, `result: "verified"`** —
`verification-report-v2.json` in the ua1-pass run dir. The full protocol
(author -> conform -> independently verify -> fix -> re-verify) has now run
end-to-end on a 126-page document.

## 4. Stale backlog entries cleared, no work needed

* **Inline links in paragraph text** (round-5 carry item): already implemented
  @9d49e6b5c — `runs` take `href`, unsafe schemes are rejected, and the
  finalizer repairs Link annotations for UA-1. The i1040 carries 142 real
  links, all checked by the independent verifier. The round-5 note simply
  outlived the feature.
* **ICCBased/Indexed images** from the round-5 Artemis note: most classes were
  already handled by 0.2.3; this round closed the remainder (above).

## Still queued

* Alt-text-at-volume authoring exercise (usgs-water-cycle, 40pp;
  nist-cyber-framework-quickstart, 32pp) — an authoring round, not an engine
  round.
* The splitter region-classifier round (round-10 ROUND-10.md, fixture pages
  105/121/124/125).
