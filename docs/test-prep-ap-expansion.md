# Test Prep Hub broad AP expansion plan

Last reviewed: 2026-07-29  
Status: Maintained direction; this plan does not make any AP pack official, released, or College Board endorsed.  
Companion: [Test Prep Hub legacy-parity and reuse audit](test-prep-legacy-parity.md)

## Decision

Preserve broad AP preparation as a Test Prep Hub expansion opportunity, but begin with one bounded pilot instead of creating a separate AP Psychology pathway or attempting all AP courses at once. Reuse the pack-agnostic Hub and retain its independent-content, transparent-evidence, accessibility, and no-official-score posture.

## Market hypothesis

Strong free AP resources already exist, but the learner experience is fragmented, some practice is teacher-assigned, and depth varies by subject. AlloFlow may fill a useful self-study gap by combining original blueprint-mapped practice, native chapters, flashcards, memory aids, transparent feedback and provenance, progress tools, and hands-free and large-text access in one workspace.

Treat this as a hypothesis. Re-check competitor coverage and pricing, College Board policy, current course and exam descriptions, and learner demand before making public market claims or funding a broad build-out.

## Constraints

- State clearly that AlloFlow is independent and is not affiliated with or endorsed by College Board. Do not claim official forms, official AP scores, score predictions, or equivalence to a released exam.
- Never copy secure or released questions. Author original material and use public course and exam descriptions only as blueprints; link learners to public official free-response materials where appropriate.
- Version every course against a named course and exam description and exam year. Blueprint drift triggers a new review rather than silently changing an existing pack.
- The current runtime is single-choice. Existing written-response workshops support planning and self-check; they are not automated FRQ scoring.
- The current release builder hardcodes pack names and counts and embeds large banks. Broad AP expansion requires a manifest-driven catalog and lazy CDN pack loading.
- Visual and source-heavy courses require structured stimuli, meaningful alt text, accessible math, tables and media, rights review, and narration that does not erase information conveyed visually.
- Release requires original content, source review, accessibility QA, production validation, and independent course expertise. Psychometric or automated-writing claims require separate evidence.

## Phases

1. **Foundation:** Replace hardcoded catalog and release counts with manifest-driven registration and lazy pack loading; strengthen schema, library, accessibility, and build-parity validation.
2. **Pilot:** Build one AP Psychology pilot containing original multiple-choice practice, native learning content, and clearly unscored FRQ planning workshops.
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