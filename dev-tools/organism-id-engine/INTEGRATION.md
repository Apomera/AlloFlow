# Integration guide — dropping the Organism ID tool into the STEM Lab

This prototype is dependency-injected: nothing here calls the platform directly.
`allo-adapter.mjs` is the single seam — you supply the platform's functions, it
returns `{ identifyFromImage, enrichResult }`. Copy the module files into the tool's
directory and wire the four bindings below.

## Files to copy

`taxon-resolver.mjs`, `hazard-matcher.mjs`, `hazard-rules.json`, `vision-prompt.mjs`,
`pipeline.mjs`, `enrich.mjs`, `image-privacy.mjs`, `allo-adapter.mjs`. (`demo.mjs`,
`test.mjs`, `audit-taxa.mjs`, `*.md`, `ui-mock.html` are dev artifacts — keep in the repo,
don't ship.)

## The four bindings

```js
import { createOrganismTool } from "./allo-adapter.mjs";
import rules from "./hazard-rules.json" assert { type: "json" };

const tool = createOrganismTool({
  // 1) VISION — JSON mode ON. The adapter passes VISION_SCHEMA; return the raw JSON text.
  callGeminiVision: (imageBlob, prompt, schema) =>
    props.callGeminiVision(imageBlob, prompt, { responseSchema: schema, jsonMode: true }),

  // 2) GROUNDING — a SEPARATE call, JSON mode OFF, google_search ON (the two are
  //    incompatible on this platform). Only used by enrichResult(), on demand.
  callGemini: (prompt, opts) =>
    props.callGemini(prompt, { tools: ["google_search"], jsonMode: false }),

  // 3) i18n — your t(). See the safety-copy policy below.
  t: props.t, // or window.__alloT

  rules,
  // 5) OPTIONAL offline safety: import local-backbone.json and pass it. If GBIF is
  //    unreachable, the resolver uses it so category nets + ladder still fire (links
  //    just go missing). Recommended for Canvas.
  localBackbone,
  // 4) sanitizeImage defaults to the canvas EXIF scrub in image-privacy.mjs; override
  //    only if the platform already sanitizes on upload.
});
```

Then:

```js
const model = await tool.identifyFromImage(fileFromCameraOrPicker, { gradeBand: "6-8", locale: props.locale });
// render model → your UI (see the render model shape below)

// later, only if the student taps "Check local status":
const enriched = await tool.enrichResult(model, model.candidates[0], { region: props.region });

// the "observe before you decide" guide (pure, derived from the model):
const guide = tool.guideFor(model); // { leadQuestion, steps, candidateFeatures, stop, hasHazardSteps }

// multi-frame / video: pass sampled frames (each is EXIF-scrubbed first)
const fromVideo = await tool.identifyFromFrames(frameFilesArray, ctx);
```

## Render model shape (what your UI consumes)

`identifyFromImage` returns:
- `scaffold`, `distinguishingQuestion` — model-authored, already in the requested locale.
- `ladder[]` — `{ rank, name, confidence, rankLabel }`, confidence non-increasing (clamped).
- `candidates[]` — `{ commonName, scientificName, matched, verifiedRefs, distinguishingFeatures }`.
- `warnings[]` (flat) and `groups[]` (collapsed for display: `{ key, primary, related[] }`).
- `fieldEthics` (always-on) + `safetyBanner`.
- `guards` — `{ blockEdibilityClaims:true, requiresBlockingInterstitial, forageWarningActive, handleWarningActive }`.
- `identityUnverified` — if true, GBIF couldn't confirm a candidate: show a "couldn't verify,
  treat with extra caution" state and do NOT present a confident benign result.

`ui-mock.html` is a faithful reference render of this model.

## Safety-copy i18n policy (important)

Deadly/contact hazard messages are expert-reviewed life-safety text (`REVIEW.md`). Do **not**
machine-translate them at runtime. `localize()` looks up `hazard.<id>.message` /
`hazard.<id>.tell` via `t()` and **falls back to the reviewed English** when no key exists —
so an unreviewed locale shows English (safe), never an unverified machine translation
(dangerous). A translated safety string becomes correct only after a native-speaking expert
signs it off, exactly like the English. UI chrome (rank labels, field ethics, banner) may be
translated normally.

## Cost & latency

- `identifyFromImage` is one JSON vision call. Fine per-observation.
- `enrichResult` is a second, grounded call — slower and pricier. Keep it **on demand**
  (a "Check local status" tap), never automatic per observation.

## Before you ship (blockers)

1. **Expert sign-off** on every DEADLY/CONTACT entry — `REVIEW.md` is the checklist; the
   `node --test` data gate + `node audit-taxa.mjs` enforce it.
2. **Confirm GBIF + Wikipedia are reachable** from the Canvas sandbox (both are keyless,
   CORS-enabled GETs). If blocked, proxy them through the platform backend.
3. **Confirm EXIF scrub runs on the real capture path** (the adapter calls it first; verify
   your file source is a `File`/`Blob` the canvas path accepts).

## Wiring checklist

- [ ] Modules copied; `hazard-rules.json` imported.
- [ ] `callGeminiVision` bound with JSON mode + schema; returns raw JSON text.
- [ ] `callGemini` (grounding) bound; JSON mode OFF; used only by `enrichResult`.
- [ ] `t()` bound; safety-copy keys absent ⇒ English fallback verified.
- [ ] EXIF scrub confirmed on the capture path.
- [ ] Render model mapped to UI; `identityUnverified` + `requiresBlockingInterstitial` honored.
- [ ] `node --test` green; `node audit-taxa.mjs` clean in CI.
