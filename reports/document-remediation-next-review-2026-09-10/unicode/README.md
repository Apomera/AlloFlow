# Accessible text normalization review

## [P2] Compatibility normalization hides changed measurement units

The strict gate's shared `norm` at [doc_pipeline_source.jsx:10116](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10116) uses NFKC. Form names and descriptions use that normalizer at [lines 10293 onward](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10293), before comparison at [line 10315](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10315). NFKC makes meaningful superscript digits equal to ordinary digits.

Two harmful candidates pass both the actual strict gate and `aiFixChunked` with only the response transport mocked:

- `unit-name-compatibility-fold`: keep the visible label `Area (m²)` unchanged, but add `aria-label="Area (m2)"` to its input. Chromium's native textbox name changes from `Area (m²)` to `Area (m2)`.
- `unit-description-compatibility-fold`: change an existing `aria-description` from `Answer in m²` to `Answer in m2`. Chromium's native description reflects the changed units.

Neither case reports a candidate rejection; the mocked pipeline returns the changed candidate. This is an accessible-name/description comparison gap, separate from the earlier visible-math fixes.

Two controls remain accepted: precomposed/decomposed `Café` naming and adding a matching `Area (m²)` accessible name. A refinement should use canonical NFC normalization for semantic names/descriptions and their text-alternative constituents. Preserve ordinary whitespace equivalence and canonical accent equivalence while retaining superscript/subscript distinctions. Add the bad cases and controls as permanent behavioral regressions; avoid a blind global normalization change without auditing its other uses.

## Evidence

[results.json](results.json) contains exact source/candidate HTML, strict decisions, mocked pipeline evidence, and native Chromium AX names/descriptions. [probe.cjs](probe.cjs) reproduces the review and refuses to overwrite existing results; copy it to a fresh output location to rerun. Chromium 148.0.7778.96; policy `20260909-6`; source SHA-256 `2a246d27928524c54ee16c8419dfd04904f4a05dfbacd07bd94ffb2825419909`, unchanged during execution.

No application code changes, live model calls, downstream export claim, or human screen-reader conclusion are included in this review.
