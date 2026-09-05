# Reading first-use refinement - 2026-09-04

Implemented locally:

- Reduced the newly selected Adapt a reading preset from 12 steps to 7: Source Material, Analyze Source Material, Glossary, Text Adaptation, Assignment Directions & Goals, Preview/Package/Deliver, and Review/Finish.
- Kept the other tools available through customization. Existing saved selections are preserved; reopening a longer reading path does not silently replace it with the new preset.
- Displayed actual step counts on the initial preset choices, including review and delivery.
- Prevented the example passage from overwriting a nonempty source, including drafts of 20 characters or fewer. Whitespace-only input can still load the sample; loading is blocked while busy.
- Added a reminder to compare adapted text with the original for accuracy and preservation of the learning goal.
- Rebuilt GuidedModeConfig and GuidedModeBanner from source and synchronized their public mirrors and the English UI strings.

Validation:

- 111 tests passed across six Guided Mode files, including seven new regression cases for the new preset, saved-path compatibility, step-count display, and sample loading.
- Corrected two pre-existing stale checks: the worked-example list omitted Memory Aid, and the delivery-anchor check did not include the extracted FullPackRun view. Baseline inspection confirmed both failures predated this change.
- Root/public module and UI-string mirrors are byte-identical. Scoped diff whitespace checks passed.
- Browser evidence is recorded separately in reading-browser.json and reading-desktop.png / reading-mobile.png under reports/classroom-review-2026-09-04.

Scope: These are focused first-use improvements, not a complete classroom-readiness release. The browser check mounts the real built GuidedModeBanner and GuidedModeConfig with a small test host; it does not exercise the entire application, live AI generation, saving projects, or exported files. No deployment was performed. The new English copy uses the existing localization fallback; additional translations have not been authored in this change.
