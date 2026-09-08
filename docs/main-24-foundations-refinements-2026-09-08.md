# Main 24 resources: foundation refinements

Date: 2026-09-08. Reviewed the current working tree against the September 4 and September 7 foundation reviews. Existing unrelated work was preserved. This workstream covered seven main resources and changed six view modules; glossary games and Definition Detective were outside its scope.

## Changes and coverage

| Main resource | Review disposition and implemented refinement |
| --- | --- |
| Analyze Source Material | Correction checkboxes now identify the specific factual or grammar note, including its position, instead of exposing an identical generic toggle name. A failed built-in AI prompt now destroys its session before falling back to the configured provider. Existing grammar dismissal, correction, and persistence regression tests remain passing. |
| Glossary & Language Selection | Reviewed current edit/filter/empty-state, language and pronunciation controls, image-description helpers, and modal focus contracts. Existing glossary helper, empty-state/print, control, and dialog suites passed. No additional confirmed defect was established in this bounded pass, so its source and recently enhanced games were left unchanged. |
| Text Adaptation | Collapsed teacher tools now leave the accessibility tree, layout, and keyboard navigation, and their toggle exposes expanded state and its controlled panel. Save TTS catches errors, announces retry guidance in the ordinary reading view, aborts its own preparation on text/resource/settings changes or unmount, and ignores obsolete progress/results. A real Chromium check found the instructional-role selector exceeded a 320px viewport; its intrinsic width is now constrained to its container. |
| Word Sounds | Deferred missing-audio confirmation callbacks belong to the originating resource, word data, saved configuration, activity sequence, and teacher/learner role. They cannot launch after navigation, lesson changes, unmount, or a repeated confirmation. The prepared activity sequence is retained. A failed synchronous practice setup releases the launch guard and displays retry guidance. |
| Visual Organizer | The header and toolbar can wrap at small widths. Decorative invitation/setup animations now respect reduced motion. Existing organizer hardening and live-contract checks passed. |
| Lesson Images / Visual Supports | Overlapping replacement uploads now honor the latest file selected for each resource. A late file read cannot overwrite a newer uploaded, restored, or regenerated image; pending readers abort on unmount and late callbacks are ignored. The existing ability to finish an upload into its originating resource after navigation remains intact. Earlier description/provenance protections remain passing. |
| FAQ | Save and sentence-regeneration failures are caught and announced with retry guidance. Save and regenerate cannot run over each other; synchronous request guards prevent duplicate work. Preparation uses its own abort signal and ignores stale progress/results after content, voice, language, or resource changes. Partial completion is distinguished from success. Missing tools provide feedback. Accordion state resets between resources; the speed slider follows external changes. Disclosure/regeneration controls have 44px minimum targets, sentence alignment supports RTL, and answer transitions respect reduced motion. |

## Validation

- **192/192 tests passed across 18 files**, including **21 new behavior checks**: scratch/main24-foundations-20260908-final.json.
- The new cases exercise rejected and partial audio saves, retries, unavailable tools, cancellation, delayed progress, resource navigation, failed sentence regeneration, disclosure state, external speed changes, upload ordering, author changes during file reads, unmount cleanup, deferred lesson launches, hidden reading tools, contextual correction labels, and built-in AI cleanup.
- **9 Chromium resource/viewport cases passed:** FAQ, Word Sounds preview, and Adapted Reading at 1280px, 390px, and 320px widths, using production React, Tailwind, and application styles. No captured page errors or horizontal overflow remained. Keyboard Tab navigation explicitly skips collapsed reading tools and enters the expanded tools.
- Browser evidence: reports/main24-foundations-20260908/browser-results.json; screenshots in the same directory. The final 320px reading screenshot was visually inspected.
- The six generated root view modules exactly match their desktop public mirrors. Hashes and the test summary are recorded in scratch/main24-foundations-20260908-summary.json.
- Browser QA runner: dev-tools/check_main24_foundations_20260908.cjs.

The initial wider run exposed an obsolete test that assumed exactly 49 Adapted Reading buttons; the current view already had 50. It now checks that every actual native button has a non-submit type. The initial browser run exposed the 320px selector overflow described above; the complete browser matrix passed after that final CSS refinement.

## Integration and limits

The parent workstream owns English catalog additions and host cache pins. This workstream did not edit host sources or publish/deploy anything.

This is a focused source, component, and browser follow-up, not a complete live-provider evaluation or manual screen-reader audit. Browser checks cover the named views and their controls, not every diagram renderer or the full Word Sounds game modal. Existing language-pack translations were not newly authored.

The prior organizer question about saved interactive nodes versus edited static branches still needs a dedicated host-level saved-map round trip; no new failure was established here. The prior saved-resource versus ambient-language reading investigation also remains a targeted integration question; this pass protects preparation state but does not claim an audit of every pronunciation/model/language combination.

