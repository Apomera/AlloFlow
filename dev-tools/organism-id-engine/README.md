# Organism ID & Taxonomy Tool — prototype

A working slice of the STEM Lab organism-identification tool: the **deterministic
layer** that sits after Gemini's vision call and makes the tool honest and safe.

See [`SPEC.md`](./SPEC.md) for the full design. This folder is a standalone prototype
meant to be dropped into the AlloFlow STEM Lab; it has **no dependencies** (Node ≥ 18
for global `fetch`).

## Run it

```bash
node pipeline.mjs   # full loop: mock Gemini vision → live GBIF/Wikipedia → hazards → render
node demo.mjs       # the stakes-not-confidence invariant, 3 cases
node enrich.mjs     # the opt-in grounded enrichment call, firewalled (browntail-moth/Maine)
node image-privacy.mjs  # EXIF/GPS scrub on a synthetic photo — coordinates provably removed
node audit-taxa.mjs # live GBIF check that every hazard trigger resolves (no silently-dead rules)
node --test         # 29 tests: invariant, firewall (+negation), grouping, quality, monotonic ladder, EXIF, fail-safe, rank/review gates
```

`demo.mjs` runs three cases live against GBIF + Wikipedia (falls back to embedded
fixtures offline):

- **A — Monarch (benign):** verified links resolve; field ethics + a mimicry note; no hazard.
- **B — "Portobello" @ 85%:** **DEADLY** warnings fire *despite* 85% confidence,
  because a death cap shares its neighborhood. This is the core invariant.
- **C — Oyster mushroom (no specific rule):** the category fail-safe still fires DEADLY.

## Files

- **`vision-prompt.mjs`** — the contract with Gemini: `buildVisionPrompt()` +
  `VISION_SCHEMA` + `parseVisionResponse()`. Per-rank qualitative confidence, observe-first
  scaffold, and hard rules forbidding any edibility/toxicity/handling claim from the model.
- **`pipeline.mjs`** — `identify({callVision, rules})` runs the whole loop and returns a
  render model (narrowing ladder, candidates + verified links, warnings, guards). Ships a
  mock model so it runs end-to-end.
- **`taxon-resolver.mjs`** — `resolveTaxon(name)` → canonical GBIF Linnaean ladder +
  stable keys; `getReferences()` → only Wikipedia/GBIF/iNat links that actually resolve.
  The model never emits a URL.
- **`hazard-matcher.mjs`** — `matchHazards({primary, candidates}, rules)` → tiered
  warnings from 3 rule types (category net · confusion edges · direct hazards). Confidence
  is **never** consulted to gate a DEADLY/CONTACT warning. `outputGuards()` → hard flags
  (`blockEdibilityClaims` always true).
- **`hazard-rules.json`** — Layer-1 field ethics + 6 category nets + 19 confusion edges +
  11 direct hazards. **Starter data: every DEADLY/CONTACT entry needs expert sign-off
  before ship (`needsExpertReview: true`).**
- **`enrich.mjs`** — the ONLY place Google-Search grounding is used: a separate, opt-in
  call for local/invasive context, behind a firewall that can only make the tool *more*
  cautious (strips web all-clears, caps web advisories at CONTACT, never touches the
  deterministic warnings). See SPEC §6.1.
- **`image-privacy.mjs`** — scrubs EXIF/GPS from a student's photo before it reaches
  Gemini: `sanitizeForUpload()` (canvas re-encode, default) + `stripJpegMetadata()`
  (lossless, Node-testable). Closes the ingest-privacy pre-ship blocker. See SPEC §7.
- **`audit-taxa.mjs`** — live GBIF audit: every hazard trigger must resolve to a real
  backbone taxon at a rank the matcher can see. Caught a dead snake rule (Squamata is a
  *class* in GBIF, not an order). Network, so run by hand / in CI, not in the unit suite.
- **`REVIEW.md`** — the mycologist/naturalist sign-off checklist that turnkeys blocker #1;
  the data gate enforces its workflow (no clearing an entry without a named reviewer).
- **`allo-adapter.mjs`** — the single seam for dropping this into the STEM Lab: inject
  `callGeminiVision` / `callGemini` / `t()` and it returns `{ identifyFromImage, enrichResult }`,
  wiring EXIF scrub → vision → pipeline → localization. See `INTEGRATION.md`.
- **`INTEGRATION.md`** — the four bindings, render-model shape, safety-copy i18n policy, checklist.
- **`taxonomy-explorer.html`** — interactive companion Artifact: hazard tree map, all
  categories/groupings, the deadly-lookalike graph, and a taxonomy-science explainer.
- **`build-backbone.mjs`** + **`local-backbone.json`** — bundled offline lineages for 60 hazard
  genera (generated from GBIF). When the sandbox can't reach GBIF, the resolver falls back to
  these so the category nets and ladder still fire — fail toward caution, never toward silence.
  Regenerate with `node build-backbone.mjs`.
- **`guided-key.mjs`** — `buildGuidedObservation(model)`: turns a result into "observe before
  you decide" steps (from the confusion tells + distinguishing question), ending in a hard stop
  that never clears anything. The pedagogical core, surfaced in the result mock's Guided-look panel.
- **`cv-classifier.mjs`** — phase-2 blend of an injected CV classifier (iNat/Pl@ntNet): the
  classifier owns calibrated scores, Gemini owns teaching, and the union never drops a hazard.
- **`geo-privacy.mjs`** — phase-3 location handling for the class biodiversity map: coarsen to a
  cell (never a precise point), and a journal-entry shape with no time-of-day.
- **`taxonomy-data.mjs`** + **`build-explorer.mjs`** — the explorer's single data source; run
  `node build-explorer.mjs` to regenerate `taxonomy-explorer.html` so it can't drift.
- **`test.mjs`** — 39 zero-dep tests; adds multi-frame merge, CV blend, geo-privacy, and the
  explorer-data drift guard to the safety suite.
- **`demo.mjs`** — the stakes-not-confidence proof.

## Two things it proves

1. **Honest links** — real GBIF hierarchy + verified Wikipedia URLs, keyless, live.
2. **Stakes over confidence** — the safety layer keys off *what it could be*, not *how
   sure the model is*.

## Not built here (see SPEC §3, §8)

The Gemini vision call, the narrowing-ladder UI, EXIF stripping, and the phase-2 CV
classifier. This prototype is the trustworthy spine those attach to.
