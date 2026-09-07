# Story Forge UI, UX, and functionality audit

Reviewed September 7, 2026. The strongest opportunity is to make the existing feature set safer and easier to navigate. Story Forge already includes guided phases, project recovery, checkpoints, export checks, writing scaffolds, comic production, and narration. The next iteration should prioritize preservation of student work, consistent progress rules, and more space for actual writing.

**Scope and evidence.** Reviewed the local Story Forge source and generated module, ran the existing Story Forge tests, and mounted the generated component in an isolated Playwright browser. Exercised Plan, Draft, Review, Design, Audio, and Publish with synthetic prose at 1280 × 900 and 390 × 844. Reproduced two functional failures. Comic-specific findings below are source-based; this was not an end-to-end comic export test. The harness uses the repository's cached Tailwind CSS and English strings, without the complete host shell or icon provider. Screen dimensions are useful directional evidence, not production-device certification. No real AI calls, student records, classroom publishing, microphone capture, or final file exports were used. Application source was not changed.

**Fix first: preservation and progression.**

1. **High priority — generating a plan can remove authored scenes. Confirmed in browser.**

   With two authored scenes, return a valid AI response containing one scaffold frame. The handler replaces the entire paragraph array with the returned frame list. The second scene disappears. The comic path similarly replaces the panel array, and merges generated speech/direction over existing authored values. The response parser does not enforce the requested count; prose frames also lack the comic path's eight-item cap. Because generation closes over the old paragraphs, typing while a request runs also needs protection.

   Change: treat generated plans as suggestions. Merge by stable section ID, preserve all authored text and dialogue, validate response shape/count, and show a preview before replacing existing planning data. Create a checkpoint for bulk changes. Guard against stale results after edits/imports.

   Acceptance: short, empty, malformed, oversized, and delayed responses never delete or overwrite authored work without an explicit replacement action. Browser reproduction: `functional-results.json` reports one remaining scene and `secondScenePresent: false`.

   Source: `story_forge_source.jsx:4694`, especially `:4744`, `:4784`, and `:4796`.

2. **High priority — Skip self-assessment can create a dead end. Confirmed in browser without AI.**

   Submitting self-assessment records the current review signature. Skipping sets the submitted flag but does not record a completed review. The self-assessment card disappears, Design remains disabled, and Get Feedback silently returns if no AI callback exists. The tested screen had no Submit Self-Assessment button remaining. An unavailable or failing AI service therefore needs an explicit recovery path.

   Change: offer clear alternatives: “Complete my self-check” and “Get AI feedback.” If skipping means AI is now required, state that before the action and retain “Return to self-check.” Keep independent writing/review usable without AI.

   Acceptance: a student can complete the workflow with no AI callback, rejected requests, and failed feedback. No action should silently do nothing.

   Source: `story_forge_source.jsx:4408`, `:5930`, `:10889`, `:10922`. Browser evidence: `functional-results.json` reports `designDisabled: true` and `selfAssessmentAvailable: 0`.

3. **High priority — comic grading omits authored speech and thought bubbles. Source-confirmed.**

   The primary gradeStory prompt uses only `paragraphs[].text`. Its vocabulary report and context samples use the same caption-only text. A comic whose vocabulary or key narrative action is in speech bubbles will be evaluated without that content. The current review signature does include dialogue, so changing a bubble can invalidate feedback even though the regenerated grading prompt still omits it. Several word/vocabulary analytics also use paragraph text only.

   Change: introduce a shared authored-content representation containing captions, speech, thoughts, and relevant speaker attribution. Use it consistently for grading and vocabulary coverage; define which fields belong in word counts and narration. Keep specialized Comic Flow feedback distinct from the general rubric.

   Acceptance: vocabulary used only in a speech bubble is recognized; the grading request includes that bubble; caption-free storytelling is evaluated coherently.

   Source: `story_forge_source.jsx:999`, `:3754`, `:3755`, `:5929`.

**Improve the core experience next.**

4. **High UX value — give mobile users substantially more working space. Browser-measured.**

   At 390 × 844, the Draft work region was 329 px high, and Review was 313 px. The header, six-step navigation, build checklist, recommendation, step explanation, requirement banner, and footer consume the rest. The empty Draft screen shows little of the actual writing field before the footer; Review requires scrolling even to complete the first small task. The phase navigation also extends horizontally beyond the viewport.

   Change: a compact title/save bar, “Step 3 of 6” switcher, one contextual requirement, and a compact bottom action row. Collapse the checklist behind a progress control. Move optional project-health detail out of the permanently fixed area. Make Focus mode discoverable beside the editor rather than only among setup tools.

   Target: at least 60% of the phone viewport available to the work region before the virtual keyboard opens. Validate again with the keyboard open, 200% zoom, and the real host shell.

   Source: `story_forge_source.jsx:8448`, `:8489`, `:8519`, `:12035`. Screens: `mobile-draft.png`, `mobile-review.png`.

5. **High UX value — use one definition of “ready.” Browser-confirmed contradiction.**

   Before self-assessment, the checklist said “Ready to export with 4 refinements available,” while the step banner said “Required to continue: complete the self-check or run feedback,” and Design was disabled. The readiness helper treats missing review as a warning, while navigation treats it as required. A fresh Plan screen also presents “Draft is empty” as a production blocker before the student has begun writing.

   Change: derive checklist status, navigation permissions, and export permissions from one shared result. Separate “required now,” “required before publishing,” and “optional improvement.” On a fresh project, show a welcoming next action instead of presenting normal incompleteness as an error.

   Acceptance: “Ready to publish” never appears while required review is incomplete. The primary action resolves the actual blocking requirement before promoting optional vocabulary goals.

   Source: `story_forge_source.jsx:675`, `:709`, `:788`, `:4408`, `:7957`.

6. **Medium priority — streamline Plan and start with the artifact choice. Observed layout and design judgment.**

   Desktop Plan repeats its title and instructions in the fixed step guide and the content. Title/pen name and the full genre grid appear before “What are you making?” The mobile planning content was 1,660 px tall for a 329 px work region. “Import classmate's draft” is prominent even for someone simply starting a story.

   Change: put Story/Comic first, then “What is your idea?” and “Start writing.” Let the title be provisional where appropriate. Group genre, vocabulary, rubric, and additional setup under optional or assignment-specific settings. Place all import/restore choices together in Project. Preserve teacher-required constraints.

   Acceptance: a new student can reach a usable blank editor with one meaningful choice; existing-project users have one obvious route to restore/import.

   Source: `story_forge_source.jsx:8546`, `:8552`, `:8590`, `:8610`, `:8625`. Screen: `desktop-plan.png`.

7. **Medium priority — make selected choices perceivable without their color. Source-confirmed.**

   Genre buttons visually mark the selected genre through classes, but do not expose a selected/pressed state. The Draft writing-view picker similarly lacks the `aria-pressed` present on its Plan counterpart. Existing focus styling and other accessible controls are a good foundation; the remaining issue is consistent semantics across duplicate controls.

   Change: use labeled radio groups for mutually exclusive settings, or consistent pressed-button semantics. Preserve keyboard focus when revealing tools, and add browser assertions for the actual accessible state.

   Acceptance: a screen reader can announce the selected genre and writing view without interpreting color or tooltips.

   Source: `story_forge_source.jsx:8611`, `:8662`, `:8980`.

8. **Medium priority — clarify AI availability and recovery across tools. Source-confirmed; one path reproduced.**

   Several handlers immediately return when an AI callback is missing, while their buttons remain visible and enabled based only on processing state. Generate Scene Plan and Get Feedback are examples. The user receives no explanation of why clicking did nothing. A shared processing flag also provides less useful feedback than identifying the particular operation.

   Change: centralize capability status, explain unavailable actions inline, and offer manual alternatives. Use per-operation progress, retry, cancellation where supported, and stale-result protection. Preserve completed batch work when a later item fails.

   Acceptance: every visible action either works or gives a clear next step. Simulated network failure cannot strand the workflow or erase work.

   Source: `story_forge_source.jsx:4695`, `:5930`, `:8929`, `:10864`.

9. **Medium priority — make writing analytics appropriate to language and purpose. Source-confirmed.**

   Reading grade uses English vowel heuristics and removes non-ASCII letters while counting syllables. It runs over paragraph text without checking the selected writing language. It can also produce a precise-looking grade from very short text; the browser showed a 6.5 reading grade and an above-target warning for a 21-word draft. That is a poor basis for an evaluative message to a student.

   Change: label it as an approximate text-complexity estimate, suppress the grade for unsupported languages and insufficient samples, and keep it separate from writing quality. Prefer concrete revision prompts such as sentence clarity. Ensure comic analytics reflect the defined authored text model.

   Acceptance: unsupported-language stories do not receive an English-derived grade; short drafts do not receive an authoritative-looking above/below-level judgment.

   Source: `story_forge_source.jsx:1678`, `:3790`, `:11383`.

10. **Medium priority — reduce review and publishing distractions. Browser-observed; design recommendation.**

    Review includes self-ratings, AI feedback, analytics, narrative arc, and word frequency. Publish repeats readiness information, adds achievements, and exposes several overlapping notions of project files, vault, backup, draft JSON, and finished output. The difference between an editable project backup and a finished story deserves clearer treatment than the file extension alone. A self-check defaults all ratings to 3, which also makes “submitted” a weak signal of actual reflection.

    Change: keep Review centered on one strength and one next revision, with analytics under a disclosure. Use labeled rating anchors or a short explicit self-check. In Publish, separate “Download finished story,” “Save editable backup,” and “Share with class,” explaining what each includes. Move achievements below completion or make them optional. Preserve existing privacy boundaries and export checks.

    Acceptance: users can identify the appropriate output without knowing JSON or .storyforge, and can complete review without navigating unrelated analytics.

    Source: `story_forge_source.jsx:10808`, `:10910`, `:11383`, `:11597`, `:11960`.

11. **Engineering improvement — replace fragile source-text checks with behavioral coverage. Verified test limitation.**

    Existing run: **135 tests, 132 passed, 3 failed across 19 files**. All three failures are in `story_forge_guided_flow.test.js` and compare multiline source snippets. The failed snippet prefixes are present after CRLF-to-LF normalization and absent in the raw Windows source. Treat these as newline-sensitive test failures, not evidence that the corresponding runtime behavior is missing.

    Change: normalize text in static checks; use AST assertions when checking structure. Add mounted/browser regressions for shortened AI output, skipped self-check without AI, dialogue-inclusive grading, and readiness consistency. Existing recovery, export, privacy, and accessibility tests should be retained.

    Acceptance: the suite behaves consistently across line endings and fails on the two reproduced product defects. Avoid replacing runtime coverage with more string-presence checks.

12. **Future functionality — make project identity and scale explicit. Source-based opportunity, not a reproduced privacy incident.**

    The draft storage key is derived from a sanitized codename, defaulting to `anon`; different names can normalize to the same value. XP uses one global localStorage key. The eight-section limit is also built into both UI and sanitizers, limiting longer stories and comics.

    Change: use a stable student/project identifier independently of display names and offer a project library if multiple concurrent stories are a goal. Decide deliberately whether progress/XP is per student, project, or device. If extending beyond eight sections, update storage/import/export and all validators together; do not simply raise the UI limit.

    Acceptance: independent projects do not overwrite one another because of display-name normalization. Any longer-project mode preserves every section through save, import, export, and recovery.

    Source: `story_forge_source.jsx:71`, `:2279`, `:2290`, `:2352`.

**Suggested implementation sequence.** First protect generated edits and fix the skipped-review recovery path. Next unify readiness and comic authored-content handling. Then simplify the mobile shell and Plan flow, improve selection semantics, and clarify analytics/output choices. Finally extract a small tested project model and operation layer from the roughly 12,000-line component so future UI changes do not have to duplicate persistence, review, and export rules.

**Evidence files.** `audit.cjs` is the isolated browser reproduction; `functional-results.json` records the two reproduced failures; `initial-results.json` records phase text, controls, viewport measurements, and browser errors; `tests.json` contains the regression results. PNG files show the inspected screens. These are local audit artifacts, not deployed changes.