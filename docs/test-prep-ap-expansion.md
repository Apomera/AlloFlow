# Test Prep Hub broad AP expansion plan

Last reviewed: 2026-08-20
Status: Maintained direction; this plan does not make any AP pack official, released, or College Board endorsed.  
Companion: [Test Prep Hub legacy-parity and reuse audit](test-prep-legacy-parity.md)

## Decision

Preserve broad AP preparation as a Test Prep Hub expansion opportunity, but begin with one bounded pilot instead of creating a separate AP Psychology pathway or attempting all AP courses at once. Reuse the pack-agnostic Hub and retain its independent-content, transparent-evidence, accessibility, and no-official-score posture.

## Implemented internal foundation

As of 2026-08-20, the repository has an explicit three-category pack registry, a generated CDN manifest, and three lazy internal AP vertical slices. The internal 0.5.0 AP Psychology preview contains 500 original selected-response items across the five current units, arranged as 25 balanced 20-item banks with 100 items per unit and coverage across all 35 framework topics; every item now carries an internal learning target, chapter/lesson route, and practice-specific cognitive process so feedback can lead directly into study. It also includes a native five-chapter library with 15 expanded textbook-style lessons, 25 section and chapter knowledge checks, 30 flashcards, 15 memory aids, and five original accessible diagram placements; and separate original AAQ- and EBQ-style planning workshops that are explicitly unscored.

The AP Biology foundation pilot now contains 500 original selected-response items distributed across all eight current units, all six science practices, all 60 public framework topics as remediation targets, and one hundred five-item internal banks. The unit distribution is intentionally narrow enough for balanced practice while adding more applied data interpretation, experimental design, quantitative reasoning, evidence claims, phylogenetic reasoning, gene-expression transfer, ecosystem modeling, cumulative multi-unit scenarios, evidence-evaluation reasoning, molecular tracing, pathway-rescue reasoning, quantitative genetics, energy-flow accounting, population-genetic calculation, and cell-cycle pathway analysis. It adds eight structured native chapter lessons, eight retrieval checks, eight flashcards, eight reasoning aids, a public-source catalog, and deterministic QA. It does not claim a full AP Biology exam simulation, FRQ scoring, laboratory competency, score prediction, or release readiness. The eight-unit blueprint and current exam-format boundary are reverified against the public AP Biology Course and Exam Description before any future release decision.

The AP U.S. History foundation pilot now contains 600 original single-choice items across all nine public framework periods, all 105 current public framework topic IDs, and all six historical-thinking skills, arranged as sixty ten-item internal banks. Two original depth slices provide at least two practice angles for every current public framework topic, a 60-item balance slice strengthens lighter skill and reasoning combinations, a 40-item completion slice brings every topic to at least three original practice angles, a 100-item fourth-layer slice brings every topic to at least four original practice angles, an 80-item fifth-layer balance slice deepens practice across 80 topics, a 40-item fifth-layer completion slice brings every topic to at least five original practice angles, and a 60-item sixth-layer balance slice adds another angle across 60 topics. The pack preserves the nine native period chapters with 27 structured sections and retrieval checks, 27 flashcards, nine memory aids, optional original text-equivalent reasoning diagrams, and three explicitly unscored SAQ-, DBQ-, and LEQ-style planning workshops. It remains an internal foundation rather than an official exam form or calibrated score simulation, does not reproduce source-set stimuli or official questions, and makes no score or readiness claim; its current public-framework target year remains unset pending re-verification.

The AP U.S. Government and Politics foundation pilot now contains 200 original single-choice items across all five current units and all 60 current public framework topic IDs, arranged as forty five-item internal banks. The unit distribution follows the public weighting ranges as a deliberately approximate foundation sample (36/60/30/24/50), every topic has at least two practice angles, all five course skill categories and 23 named subskills are represented, and every item routes to one of five structured unit chapters, fifteen lesson sections, native retrieval aids, linked foundation/depth study routes, and topic-level drill maps. It remains text-first, nonpartisan, unscored, unofficial, and release-blocked; it does not reproduce official source sets, questions, rubrics, or FRQ scoring.

The AP assets are not embedded in the size-limited Hub bundle and do not use the legacy `*_pack.json` pipeline. The manifest-aware catalog keeps bundled public packs usable while it loads or if it fails, displays lazy-pack metadata without prefetching content, and downloads a lazy pack only after activation. The AP entry requires both internal-QA mode and an exact pack-ID allowlist; it remains hidden on ordinary mounts even after a prior QA session registered it.

The canonical build mirrors the pack, library, native QA report, and manifest to the deploy tree, validates byte parity, and binds each asset with SHA-256; the runtime verifies exact asset bytes before parsing. These hashes detect drift relative to the retrieved manifest, not coordinated replacement of both manifest and asset, which would require a signed manifest or separately pinned verification key. Deterministic QA currently reports zero structural findings and zero diagram-coverage advisories. The 500-item bank has exact 325/125/50 Practice 1/2/3 allocation, 125 keys in each answer position, 500/500 item-to-learning routes, a 28.1% dominant answer-transition rate, a longest same-key run of five, a 1.010 keyed/distractor mean-length ratio, zero severe length cues, zero exact or near-duplicate prompt pairs, 460 generated stems ending in one terminal question, zero generic generated-feedback placeholders, 13 categorical-cue advisories, and two lexical-cue advisories queued for human review.

Internal visibility is a product and release gate, not confidentiality or authentication. Because these files are in the repository and on a public CDN, their contents must always be safe to treat as publicly retrievable; no secure questions, secrets, or personally identifiable information belong in them.

The shared Hub now supports hands-free question, option, feedback, and navigation narration; bounded voice commands; guarded AI clarification; and quiet prewarming of the next three questions when configured TTS is available and data-saver mode is not active. Essential-visual or explicitly incompatible content cannot claim complete hands-free access without a declared accessible equivalent, and the UI states that configured speech/AI processing may be local or remote and that learners should not speak PII.

This is architecture and automated content-QA progress, not a release decision. AP subject-expert, rights, independent accessibility, hands-free production, field-testing, and psychometric gates remain closed. The current engine supports the 500 pilot multiple-choice items; the workshops are planning/self-check resources only.

The AP Chemistry foundation pilot now contains 180 original single-choice items across the nine current units, all six chemistry science practices, and all 91 public framework topics as remediation targets, arranged as thirty-six five-item internal banks. It adds nine text-first textbook-style unit chapters with examples, boundaries, misconception guidance, worked data, retrieval, transfer moves, chapter checks, flashcards, memory aids, and deterministic QA. It remains unofficial, uncalibrated, internal-only, and release-blocked; it does not claim a complete AP Chemistry exam simulation, FRQ scoring, laboratory competency, score prediction, or readiness prediction.

## Market hypothesis

Strong free AP resources already exist, but the learner experience is fragmented, some practice is teacher-assigned, and depth varies by subject. AlloFlow may fill a useful self-study gap by combining original blueprint-mapped practice, native chapters, flashcards, memory aids, transparent feedback and provenance, progress tools, and hands-free and large-text access in one workspace.

Treat this as a hypothesis. Re-check competitor coverage and pricing, College Board policy, current course and exam descriptions, and learner demand before making public market claims or funding a broad build-out.

## Constraints

- State clearly that AlloFlow is independent and is not affiliated with or endorsed by College Board. Do not claim official forms, official AP scores, score predictions, or equivalence to a released exam.
- Never copy secure or released questions. Author original material and use public course and exam descriptions only as blueprints; link learners to public official free-response materials where appropriate.
- Version every course against a named course and exam description and exam year. Blueprint drift triggers a new review rather than silently changing an existing pack.
- The current runtime is single-choice. Existing written-response workshops support planning and self-check; they are not automated FRQ scoring.
- The manifest-driven catalog and lazy CDN loader now keep AP assets outside the size-limited bundle. Broad expansion still requires schema-v2 stimulus and response types, catalog-scale usability testing, and per-course release gates.
- Visual and source-heavy courses require structured stimuli, meaningful alt text, accessible math, tables and media, rights review, and narration that does not erase information conveyed visually.
- Release requires original content, source review, accessibility QA, production validation, and independent course expertise. Psychometric or automated-writing claims require separate evidence.

## Phases

1. **Foundation (implemented):** Manifest-driven registration, lazy pack loading, schema/library validation, accessible failure states, explicit internal-QA controls, deterministic QA, and build-parity validation.
2. **Pilot (internal QA):** Original AP Psychology multiple-choice practice, native learning content, accessible diagram placements, clearly unscored FRQ planning workshops, the bounded AP Biology eight-unit foundation pilot, the AP U.S. History nine-period, 600-item five-item-per-topic foundation pilot, and the AP U.S. Government five-unit, 200-item all-topic foundation pilot with two practice angles per topic are implemented; all independent release gates remain open.
3. **Schema v2:** Add reusable stimulus groups; multi-select, numeric, short-response, and constructed-response records; accessible media, math, and tables; and rubric-grounded self-check.
4. **Course expansion:** Add subjects only when their current blueprint crosswalk, original item bank, learning library, rights and accessibility review, and subject-expert release gate are complete.

## Non-goals until evidence exists

- Official-equivalent forms or copied College Board content
- Scaled-score, pass, or college-credit predictions
- Automated FRQ scores
- A universal hands-free claim for content whose essential visual meaning is not yet represented accessibly
- Releasing all AP subjects before the pilot and shared architecture pass their gates

## Review triggers

Review this direction when College Board changes a course description or exam policy; the Hub schema, catalog, or loading model changes; new response types ship; a market claim is proposed; or an AP course moves from pilot to ready.
