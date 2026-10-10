# Comparison readability

Compare processes now responds to its actual panel and card widths. Narrow hosts keep process names and water-state descriptions in whole words and preserve the full-size 64px scientific figures. Before and After stack vertically when needed, with a matching downward connector.

## Presentation

- Two process cards require at least 680 CSS pixels of panel space.
- Selectors and question/answer choices use two columns at 440 pixels; smaller panels stack them.
- Before/After figures share a row above 280 pixels of card content; below that they stack.
- Captions, hints and caveats use at least 13px text. Facts, phase descriptions and controls use 14px. From, To and What drives it have clear boxed spacing.
- Dark-mode teal figures use a brighter color. Every final figure measures at least 3:1 contrast against its frame. Forced colors keep system foregrounds and backgrounds.

## Scope

Runtime SHA256: 33b52526fd61b3441d91052c3f2f44e8aa577ffa0d47981fb6a9ac46b62f97fd

The recorded single CSS append reverses exactly to the preceding Land pathway runtime 4fec040c2d54a0df8beedfcf0b8dc93ae332dcab37f9a96c18f82a2aafcced37, referenced at ../watercycle-land-pathway-groups/candidate-runtime.js. Renderers, SVG markup and geometry, scientific descriptions, comparison evaluation, scoring, callbacks and saved writing code remain byte-identical. Latent-heat evidence still appears only after an explicit check.

## Validation

- 83 passing native comparison helper regressions, including all ordered process pairs and saved-state behavior; no failed or skipped tests.
- 569 passing browser checks, forty native interactions and nine scoped accessibility audits with no violations.
- Eight final bounded captures and two matched baseline views: desktop, narrow desktop host, 320px and 390px phones, dark mode, high contrast, forced colors and 150% CSS zoom.
- Native presets, both selectors, both questions, correct/revisit feedback and remembered explanations preserve the paused aquifer parcel, scores and other saved learner fields. Scientific SVG bytes match the frozen baseline.
- Runtime, public copy, served preview, loaded scripts, harness and test input hashes are recorded. Owned QA browser and HTTP server closed.

The first diagnostic identified insufficient connector line-box space. Fieldset columns are measured from actual choice positions because Chromium returns an unresolved grid expression for fieldsets. Visible solid borders are checked in CSS units, including fractional widths under zoom. Final screenshots were reviewed, then dark figure contrast was improved and verified through the complete matrix. Preliminary evidence remains in the task scratch diagnostics directory.

## Verify

Run node reports/watercycle-comparison-readability/verify.cjs from the repository for archived and current-input checks. Add --snapshot-only to verify frozen evidence after future enhancements. verify-source.cjs --installed separately checks both runtime copies and the exact CSS append.

Everything remains uncommitted.
