# Test Prep Hub broad AP expansion plan

Last reviewed: 2026-07-29  
Status: Maintained direction; this plan does not make any AP pack official, released, or College Board endorsed.  
Companion: [Test Prep Hub legacy-parity and reuse audit](test-prep-legacy-parity.md)

## Decision

Preserve broad AP preparation as a Test Prep Hub expansion opportunity, but begin with one bounded pilot instead of creating a separate AP Psychology pathway or attempting all AP courses at once. Reuse the pack-agnostic Hub and retain its independent-content, transparent-evidence, accessibility, and no-official-score posture.

## Implemented internal foundation

As of 2026-07-29, the repository has an explicit three-category pack registry, a generated CDN manifest, and one lazy AP Psychology vertical slice. The internal pilot contains 20 original selected-response items across the five current units; a native five-chapter library with 15 sections, 15 flashcards, 10 memory aids, and five original accessible diagram placements; and separate original AAQ- and EBQ-style planning workshops that are explicitly unscored.

The AP assets are not embedded in the size-limited Hub bundle and do not use the legacy `*_pack.json` pipeline. The manifest-aware catalog keeps bundled public packs usable while it loads or if it fails, displays lazy-pack metadata without prefetching content, and downloads a lazy pack only after activation. The AP entry requires both internal-QA mode and an exact pack-ID allowlist; it remains hidden on ordinary mounts even after a prior QA session registered it.

The canonical build mirrors the pack, library, native QA report, and manifest to the deploy tree, validates byte parity, and binds each asset with SHA-256; the runtime verifies exact asset bytes before parsing. These hashes detect drift relative to the retrieved manifest, not coordinated replacement of both manifest and asset, which would require a signed manifest or separately pinned verification key. Deterministic QA currently reports zero structural findings and zero diagram-coverage advisories. The item bank's answer-transition dominance is 36.8%, its longest same-key run is one, its keyed/distractor median-length ratio is 0.978, and severe length-cue, categorical, lexical, and feedback-restatement advisories are zero.

Internal visibility is a product and release gate, not confidentiality or authentication. Because these files are in the repository and on a public CDN, their contents must always be safe to treat as publicly retrievable; no secure questions, secrets, or personally identifiable information belong in them.

The shared Hub now supports hands-free question, option, feedback, and navigation narration; bounded voice commands; guarded AI clarification; and quiet prewarming of the next three questions when configured TTS is available and data-saver mode is not active. Essential-visual or explicitly incompatible content cannot claim complete hands-free access without a declared accessible equivalent, and the UI states that configured speech/AI processing may be local or remote and that learners should not speak PII.

This is architecture and automated content-QA progress, not a release decision. AP subject-expert, rights, independent accessibility, hands-free production, field-testing, and psychometric gates remain closed. The current engine supports the pilot multiple-choice items; the workshops are planning/self-check resources only.

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
2. **Pilot (internal QA):** Original AP Psychology multiple-choice practice, native learning content, accessible diagram placements, and clearly unscored FRQ planning workshops are implemented; all independent release gates remain open.
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