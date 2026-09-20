# Assess student visibility and presentation review

Completed September 19, 2026. Local changes only; no deployment.

## What was wrong

Ordinary Student View could access presentation and review-game controls. Presentation choices called the host grading handler, which could reveal correctness and award practice XP immediately. Facilitator flags could also remain set after switching roles, and an already-open game setup could survive that change.

## Result

| Experience | Behavior |
| --- | --- |
| Ordinary Student View | Assessment instructions, responses, configured feedback, progress, and review/submission. No presentation, authoring, answer-key, or self-launch game tools. Stale facilitator flags cannot enable them. |
| Teacher or parent facilitation | Present questions, navigate slides, and explicitly reveal answer guides or explanations. |
| Independent study | Practice games remain available, with a note that games can reveal answers and do not submit an assessment. Presentation remains available in the app's actual independent-study role. |

Presentation is a local discussion display. It does not submit learner responses or control student screens. A learner watching a projector or screen share sees whatever the presenter reveals.

Selecting either a correct or incorrect choice now uses the same neutral selection style. It does not invoke the host grader, award XP, play grading sounds, or write a learner record. Only an explicit reveal exposes the answer guide or correctness. Explanation reveals are also explicit.

The presentation displays how many questions have visible guides, including other slides, and offers **Hide all answers and explanations**. Reveals clear on exit/reentry and changes to the assessment, question content, role, session, or user. Ordinary Student View also suppresses already-open board game, connected escape room, and Concept Quest setup screens.

Student assessment instructions are simpler, and option letters and presentation feedback have stronger contrast. Existing student response checking and submission behavior is preserved. Authored question content and sequence order are not rewritten.

## Verification

- 171 tests passed across 15 focused test files. Coverage includes all nine presentation item formats, stale display flags, three already-open game setups, parent and independent-study access, disclosure/reset boundaries, drafts, numeric grading, review-game coverage, voice behavior, answer matching, and AlloSheet handoff.
- 116 browser assertions passed using the built QuizView module and actual application theme styles. Viewports: 320, 390, and 1280 pixels, each in light and dark themes.
- No reported automated accessibility violations on 24 checked surfaces: Student View, concealed presentation, correct reveal, and incorrect reveal in each viewport/theme combination. These axe checks do not replace a complete manual accessibility audit.
- Keyboard reveal/hide, role and resource transitions, ordinary response selection, review-before-submission, and practice-game access verified. No browser runtime errors or horizontal overflow in checked views.
- Existing Assess games browser harness passed at 1280 and 390 pixels: presentation images/navigation, numeric reveal, mixed-format review-game reveal, and Concept Quest launch/encounter.
- Root and desktop QuizView bundles are byte-identical. Root CDN revision: d3fe25a193. Desktop loaders use the corresponding bundled local module. Ten new English strings match between root and desktop.

The browser harness uses fixture assessment data and mocked host callbacks. No live classroom transport, real AI generation, or deployment was exercised. A pre-existing answer-matcher source test was updated to follow the grader's extraction into host_handlers_source.jsx.

## Important boundary

This fixes accidental answer disclosure through the interface. Assessment answer data still reaches the browser for local grading, including student resources delivered by the existing session transport. Someone inspecting browser data could retrieve it. Secure exam delivery would require a separate student payload without keys and grading on a trusted server. Normal formative feedback can still reveal information after a learner checks a response.

## Artifacts and reproduction

- [Unit results](vitest-results.json)
- [Browser checks and accessibility results](browser-results.json)
- [Games regression results](games-regression/browser-results.json)
- [Desktop presentation with answers hidden](presentation-hidden-1280.png)
- [Desktop explicit reveal](presentation-revealed-1280.png)
- [Phone Student View](student-390.png)
- [Phone Student View in dark theme](student-390-dark.png)

Run node dev-tools/check_assess_student_visibility.cjs for the focused browser checks. Run node dev-tools/check_assess_refresh.cjs reports/assess-student-visibility-2026-09-19/games-regression for the game regression fixture.
