# Organism ID & Taxonomy Tool — Design Spec (v0.1 draft)

**Status:** prototype + spec for review. The deterministic layers (resolver, hazard
matcher, hazard data) are built and pass a live end-to-end demo. The model layer
and UI are specified but not built.

**One-line:** Students photograph an organism; the tool shows a ranked ID with the
Linnaean ladder, confidence that *narrows* down the ladder, verified reference
links, and — the spine of the tool — context-aware misidentification-danger
warnings that fire on the **stakes** of what it could be, never on the model's
confidence that it got the answer right.

---

## 1. Non-negotiables (the thesis)

1. **Warnings fire on stakes, not confidence.** An 85%-confident "portobello" still
   gets the full death-cap warning, because the 15% residual is exactly where a
   deadly lookalike lives. High confidence must never suppress a hazard warning.
2. **The tool never clears anything to eat or handle.** No edibility verdict, ever,
   for any confidence. `blockEdibilityClaims` is hard-wired `true`.
3. **The model proposes; authoritative sources dispose.** Gemini never emits a URL
   or a taxonomy. Names are resolved and verified against GBIF + Wikipedia; only
   links that actually resolve are shown. An unmatched name is surfaced as
   *unverified*, never dressed up as authoritative.
4. **Life-safety copy is expert-reviewed, not model-authored.** Every DEADLY/CONTACT
   entry carries `needsExpertReview: true` until a named mycologist/naturalist signs
   off.

---

## 2. Why it's worth building (pedagogy)

- **Place-based & phenomenon-first.** Kids classify their *own* schoolyard, turning
  abstract Linnaean ranks into something they found under a log.
- **The uncertainty is the curriculum.** Confidence that narrows down the ladder
  (Class 99% → Family 80% → Species 40%) teaches *why* species-level ID is hard and
  what evidence would settle it — real scientific reasoning, not answer-lookup.
- **Misidentification danger is the highest-stakes answer to "why does classification
  matter?"** Two mushrooms in the same *order* (Agaricales), one edible and one that
  destroys your liver, separated at the *family* level — that is the purpose of
  careful taxonomy made vivid.
- **NGSS fit:** 3-LS4-2, MS-LS4-2 (patterns/anatomical similarity for classification);
  practices of *analyzing & interpreting data*, *engaging in argument from evidence*,
  and *obtaining, evaluating & communicating information*.
- **Citizen-science bridge (later phase):** deep-link to iNaturalist so observations
  can feed real biodiversity data.

**Designed against the failure mode:** it must not become an answer machine that stops
kids from observing. The flow asks the student to hypothesize and note distinguishing
features *before* revealing candidates; Gemini's job is dichotomous-key coaching
("to tell these apart, check the spore print / leaf margin / hindwing line"), not a
magic verdict.

---

## 3. Architecture

```
 photo/video
     │
     ▼
 [Gemini Vision]  callGeminiVision — proposes RANKED NAME CANDIDATES + per-rank
     │            qualitative confidence + "what feature would distinguish these"
     │            (JSON mode ON; no Google-Search grounding — see §6)
     ▼
 [taxon-resolver.mjs]  each candidate name → GBIF species/match
     │                 → canonical Linnaean ladder + stable keys
     │                 → Wikipedia REST summary (verified URL/extract/thumb)
     │                 → iNaturalist deep-link
     │                 (unmatched name → flagged unverified, not shown as fact)
     ▼
 [hazard-matcher.mjs]  in-play taxa (top ID + ALL candidates, confidence ignored)
     │                 → category fail-safe net  (kingdom Fungi, family Apiaceae, …)
     │                 → confusion graph edges    (Agaricus↔Amanita, Daucus↔Cicuta, …)
     │                 → tiered warnings (DEADLY/CONTACT/MILD/INFO) + render guards
     ▼
 [UI]  narrowing ladder · ranked candidates · Layer-1 field ethics (always) ·
       Layer-2 hazard interstitial (DEADLY = blocking) · verified links ·
       "verify with a human / never eat or handle" everywhere
```

Both external APIs are **keyless, public GETs with permissive CORS**, verified live
(GBIF returns the full hierarchy + keys; Wikipedia auto-resolves a binomial to its
canonical page). The one platform-specific unknown is whether the Canvas sandbox
permits these outbound calls — confirm before committing.

---

## 4. The two-layer safety model

**Layer 1 — always-on field ethics** (identical on every result): observe don't
disturb; safe distance, don't touch/handle/feed; never eat/taste/brew; some
organisms & habitats are legally protected.

**Layer 2 — context-sensitive misID hazard**, from `hazard-rules.json`:

- **Category fail-safe net** — coarse rules keyed high in the tree so coverage gaps
  degrade to a strong generic warning, never to silence. *Any* wild fungus trips
  "no app can make a wild mushroom safe to eat," even one we have no specific rule
  for (demo Case C).
- **Confusion graph** — hand-curated edible↔deadly "lookalike" edges (death cap,
  water hemlock, false morel, coral snake, giant hogweed, …). Fires on the
  *neighborhood* of the ID: a benign top ID whose deadly twin is nearby still warns
  (demo Case B).
- **Direct hazards** — a third rule type for organisms that *are* dangerous rather
  than confusable (oleander, manchineel, castor bean, blue-ringed octopus, cone
  snail, pufferfish, black widow, cane toad, lionfish, man o' war, …). "We think this
  IS a dangerous thing" is pedagogically distinct from "this could be confused with
  one," and both obey the stakes-not-confidence rule.
- **Tiers prevent alarm fatigue.** DEADLY gets a blocking red interstitial; reserving
  it for genuinely lethal categories keeps it credible. CONTACT/MILD/INFO step down.

Each warning carries a **tell** (the distinguishing feature — the teaching moment) and
a **consequence** (what happens if you're wrong).

---

## 5. Confidence, honestly

- Present **ranked candidates + a narrowing ladder**, not a single false-precision
  percentage. LLM self-reported confidence is not calibrated; don't render it as a
  probability.
- **GBIF's `confidence` is name-match confidence, not photo-ID confidence.** The
  resolver names the field `gbifNameMatchConfidence` so the two never blur in the UI.
- Phase 2 can back the numbers with a purpose-built classifier (iNaturalist CV /
  Pl@ntNet) for real top-k scores; keep Gemini for the teaching layer.

---

## 6. Reference links + the grounding constraint

- Verify-then-show: resolve the name against GBIF/Wikipedia and render only links
  that resolve. This doubles as a hallucination check — no GBIF match ⇒ flag the ID.
- **Known platform constraint:** Gemini's Google-Search grounding can't combine with
  JSON output mode. Good news — links don't need grounding. Keep JSON mode ON for
  structured candidates and do links as this separate deterministic pass. Cleaner and
  more reliable than trusting grounded output.

### 6.1 Grounding: the walled-off enrichment layer (`enrich.mjs`)

The core uses **zero** grounding, on purpose: it lives in JSON mode, and links +
taxonomy are more reliable resolved deterministically. Grounding earns its keep in
exactly one place — **jurisdictional / time-sensitive context that has no clean API**:
invasive & reportable status in *this* state, current local advisories. (Range/season
→ GBIF/iNat occurrence; conservation → IUCN. Those beat grounding; grounding is the
fallback for the local tail.) Grounding does **not** improve the ID — it's text search,
not vision.

- **Two-call pattern.** Enrichment is a SEPARATE, on-demand Gemini call — JSON mode
  OFF, parse the text (the Timeline tool's pattern) — fired only when a student taps
  "Is this local? / Tell me more". Not per-observation (grounded calls are slower/pricier).
- **The firewall (asymmetric by design): web context may only make the tool MORE
  cautious, never less.**
  1. It can never remove, downgrade, or gate a deterministic hazard warning (the
     `warnings` array is cloned untouched).
  2. It can never emit an all-clear. Reassurance phrasing ("safe to eat", "harmless",
     "non-toxic") is stripped and never shown — a web all-clear is a false-negative
     machine. `blockEdibilityClaims` stays `true` regardless of what the web said.
  3. Web advisories are capped at **CONTACT** — DEADLY belongs only to the vetted layer.
  4. Everything is provenance-tagged **"web — verify"**, visually distinct from the
     authoritative GBIF/Wikipedia facts (and a nice information-literacy lesson).
- Locked by tests; the browntail-moth (Maine) demo shows a hallucinated "generally safe
  to handle" line being stripped while the real rash advisory + invasive-report note pass.

---

## 7. Privacy

- **Strip EXIF/geotags on ingest — built (`image-privacy.mjs`).** Phone photos embed
  GPS, timestamps, and device IDs; a photo taken at school leaks precise location. The
  module sanitizes every image *before* it reaches Gemini, two ways:
  - `sanitizeForUpload()` / `browserStripViaCanvas()` — the default: re-encodes pixels
    through a canvas, dropping ALL metadata by construction and baking in orientation.
  - `stripJpegMetadata()` — a pure, lossless fallback that surgically removes the
    metadata segments (APP1 EXIF/GPS/XMP, COM) while preserving the pixel data. No DOM,
    so it is unit-tested in Node (fake-GPS JPEG → coordinates provably gone, frame intact).
  - `identify()` documents the precondition: the image must be scrubbed before the vision
    call is bound. No precise geolocation is ever surfaced in the UI.
- Treat student-captured media under the platform's existing FERPA posture.

---

## 8. Phasing

- **v1 (Gemini-only, ships fast):** vision ID → narrowing ladder → GBIF/Wikipedia
  verified links → two-layer safety → EXIF stripping. No third-party CV yet.
- **v2:** add a purpose-built CV model (iNaturalist/Pl@ntNet) for calibrated top-k;
  expand the hazard graph under expert review; multilingual common names via existing
  i18n.
- **v3:** citizen-science contribution to iNaturalist; observation journal / class
  biodiversity map (location-blurred).

---

## 9. What's in this prototype

| File | Role | State |
|---|---|---|
| `vision-prompt.mjs` | the Gemini contract: prompt + JSON schema + parser; forbids edibility claims; per-rank confidence | working |
| `pipeline.mjs` | full loop: vision → resolve → hazard → render model; includes a mock model | working, live |
| `taxon-resolver.mjs` | name → GBIF ladder + verified links; falls back to the offline backbone when GBIF is unreachable | working, live |
| `build-backbone.mjs` + `local-backbone.json` | bundled offline lineages for 60 hazard genera so category nets + ladder work with no network | generated |
| `hazard-matcher.mjs` | fires warnings on stakes-not-confidence; 3 rule types; render guards | working |
| `hazard-rules.json` | Layer-1 ethics + 6 category nets + 19 confusion edges + 11 direct hazards | **starter data, expert-review pending** |
| `enrich.mjs` | opt-in grounded call for local/invasive context, behind the safety firewall | working, mock |
| `image-privacy.mjs` | EXIF/GPS scrub on ingest — canvas re-encode + lossless JPEG segment strip | working, tested |
| `audit-taxa.mjs` | live GBIF check that every hazard trigger resolves at a rank the matcher can see | working |
| `REVIEW.md` | expert sign-off checklist to turnkey the mycologist/naturalist review (blocker #1) | ready |
| `allo-adapter.mjs` | DI adapter: binds callGeminiVision/callGemini/classifyImage, wires EXIF ingest, multi-frame, localizes chrome | working, tested |
| `INTEGRATION.md` | drop-in guide: the four bindings, render-model shape, safety-copy i18n policy, checklist | ready |
| `guided-key.mjs` | pedagogy: turns a result's tells + confusion warnings into "observe before you decide" steps that never conclude "safe" | working, tested |
| `cv-classifier.mjs` | phase 2: blend an injected iNat/Pl@ntNet classifier — CV owns calibrated scores, Gemini owns teaching (union, never drops a hazard) | working, mock |
| `geo-privacy.mjs` | phase 3: coarsen location for the biodiversity map + safe journal-entry shape (never precise, no time-of-day) | working, tested |
| `taxonomy-data.mjs` + `build-explorer.mjs` | single source for the explorer's tree/edges; build injects it so the artifact can't drift | working |
| `taxonomy-explorer.html` | interactive companion: hazard tree map + categories/groupings + lookalike graph + taxonomy-science explainer; deep-links via `#t=<taxon>` | published |
| `test.mjs` | 46 tests: + multi-frame, CV blend, geo-privacy, explorer drift guard, guided observation, offline backbone | 46/46 passing |
| `demo.mjs` | invariant proof (3 cases), live w/ offline fixtures | passing |

**Pipeline result (mock Gemini + live GBIF/Wikipedia):** observe-first scaffold →
narrowing ladder (confident to *genus*, species flagged a guess) → 3 candidates each
with a verified Wikipedia link (incl. the destroying angel it ruled out) →
distinguishing question ("spore print color?") → 4 DEADLY warnings + blocking
interstitial.

**Demo result (live GBIF + Wikipedia):**
- *Case A (monarch, benign):* verified links resolve (→ "Monarch butterfly" page);
  Layer-1 ethics + an INFO mimicry note; no hazard.
- *Case B (portobello @ 85%):* **DEADLY fires anyway** — Fungi net + Agaricus↔Amanita +
  Amanita-lookalike edges; blocking interstitial on, at every confidence level.
- *Case C (oyster, no specific rule):* category net still fires DEADLY. Fail-safe holds.

**Test result:** the invariant is regression-locked — `node --test` asserts that
warning sets are identical across confidence 0.01/0.5/0.99, that a death cap as a
0.1%-confidence candidate still forces DEADLY, and that no lethal copy ships without
`needsExpertReview`.

**Refinements (round 1):**
- **Warning grouping.** Confusion edges sharing a `group` (e.g. the three Amanita
  lookalikes) collapse to one primary + `related` list via `matchHazards().groups`, so a
  deadly-fungus result shows one strong banner, not four near-identical ones (alarm
  fatigue). The flat `warnings` array stays intact as the source of truth.
- **Resolver match-quality honesty.** A GBIF `FUZZY` (approximate spelling) or
  `HIGHERRANK` (resolved only above the requested rank) match now sets `approximate:true`
  + a `matchNote`, so a tentative match is never rendered as certain.
- **Monotonic ladder.** `buildLadder` clamps each rank's confidence to ≤ its parent, so a
  malformed model response can't render certainty that *widens* going down the ladder.

**Hardening (round 2) — make every failure mode fail toward caution:**
- **Fail-safe resolution.** If GBIF can't resolve a name, the matcher now derives a genus
  key from the name itself, so a deadly organism can never drop out of hazard matching on
  a network hiccup; the pipeline flags `identityUnverified` for the UI. (Was a real hole:
  an unresolved death cap previously got *zero* warnings.)
- **Negation-aware firewall.** Reassurance stripping no longer guts a negated caution —
  "not safe to eat" survives intact while "safe to eat" is removed. Patterns expanded and
  battery-tested.
- **No silently-dead rules.** A pure test gates every trigger to a GBIF-visible rank, and
  `audit-taxa.mjs` verifies each resolves live. This caught a genuinely dead rule: snakes
  sit at `class: Squamata` in GBIF (empty order), so the old suborder/order rule never
  fired — now `class: Squamata`, locked by a snake-coverage test.
- **Review workflow enforced.** The data gate now fails if a DEADLY/CONTACT entry is
  cleared (`needsExpertReview:false`) without a `reviewedBy` + `reviewedDate`. See `REVIEW.md`.

---

## 10. Open questions / before shipping

1. **Expert review** of every DEADLY/CONTACT entry — a named mycologist/naturalist
   sign-off (blocking). *Turnkey now:* `REVIEW.md` is a per-entry checklist + sign-off
   workflow, and the data gate + `audit-taxa.mjs` enforce it. Still needs the human.
2. **Canvas sandbox reachability** for GBIF/Wikipedia outbound calls. *De-risked:* if GBIF
   is unreachable, the resolver falls back to `local-backbone.json`, so the category nets,
   ladder, and hazard rules still fire for the bundled hazard taxa — only the live links go
   missing (a degraded view, not a safety failure). Still worth confirming reachability for
   the full experience.
3. ~~**Warning relevance tuning**~~ — *done*: same-danger edges now collapse via the
   `group` key (see Refinements above). EXIF/GPS ingest scrub is also *done*
   (`image-privacy.mjs`, §7). Remaining blockers are #1 and #2.
4. **Fungi policy** — recommend the tool *never* renders a confident single "it's edible
   species X" framing for any wild fungus, regardless of ID certainty.
5. **Video handling** — sample frames? live overlay? (v1 can be photo-only.)
6. **Coverage roadmap** for the confusion graph — target the ~25–30 classic deadly
   confusions first (highest real-world risk per entry).
