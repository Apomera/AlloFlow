# Main 24 resources: foundation quality follow-up

Date: 2026-09-07. Reviewed the current local working tree against the September 4 review and implemented-refinements notes. Existing unrelated edits were preserved. This is a focused source/component follow-up, not a live-provider or full-browser audit.

## Implemented improvements

- **Lesson Images:** A delayed AI description could overwrite a teacher's newer description or decorative-image choice for the same image URL. The completion now compares the captured description, provenance, image hash, decorative choice, and prompt against the current artifact before saving. Busy state belongs to the requested image; moving to another image permits a new request, and superseded requests cannot overwrite the new request or clear its busy indicator. Unmounting invalidates the pending completion. Rejected generation reports a useful error and permits retry.
- **Writing Scaffolds:** Every paragraph input previously exposed the same generic accessible name, even after its placeholder disappeared on completion. Inputs now identify the blank number and prompt. List-response fields have a distinct numbered name and an explicit accessible description pointing to the visible scaffold prompt. Existing saved response keys are unchanged.
- **Typography:** Converted the only ordinary inline fixed pixel font size found across the nine assigned view sources (the Lesson Images upload symbol) from 18px to 1.125rem. Other fixed `fontSize` attributes belong to the Directions SVG coordinate system and remain unchanged. Shared family, size, and spacing integration is handled by the parent workstream.
- **Regression quality:** Replaced two obsolete glossary assertions: one assumed the former literal sidebar prop order; the other incorrectly required all glossary images to be decorative despite the existing description-aware helper. The updated checks verify actual generator props and authored/decorative/stale-image description behavior.

## Coverage and disposition

| Resource | Finding and action |
| --- | --- |
| Analyze Source Material | Existing grammar persistence fixes remain in place. Existing grammar component regression coverage rerun. The source/editor use `font-serif`; shared font customization must override this class. |
| Adapted Reading | The immersive view already intentionally supports its own `immersiveSettings.fontFamily`; ordinary display uses shared classes. Existing accessibility regressions rerun. Saved-resource versus ambient-language playback remains a targeted follow-up from the prior review; no new playback failure was reproduced here. |
| Vocabulary / Glossary | Existing image descriptions are preserved only for matching image bytes, while explicitly decorative images stay silent. Updated the stale regression expectations and reran helper/accessibility coverage. Phonetic/IPA displays use serif/mono classes; reported to the shared typography owner. |
| Graphic Organizer | Reviewed the isolated view and its static/interactive/3D/remix handoffs. No new defect established. The prior static branch versus saved interactive node consistency question remains unconfirmed and requires a host-level saved-map round trip. |
| Lesson Images | Implemented pending-description author-edit protection, request ownership, failure feedback, and scalable upload-symbol type size. |
| Writing Scaffolds | Implemented numbered, context-bearing accessible response names/descriptions and verified previous save/error/response-serialization behavior. |
| FAQ | Existing localized disclosure/read-aloud controls and separate accordion/audio button semantics retained. Existing focused audio/control regressions rerun. |
| Assignment Directions | Existing translated choice references, optional goals, missing-choice feedback, and accessible station-list fallback retained. Existing objectives/extraction regressions rerun. SVG coordinate font sizes were not converted to rem. |
| Word Sounds | Existing teacher review, learner launch, prepared activity sequence, localized readiness copy, and logical text alignment retained. Existing learner-surface/package contract regressions rerun. |

## Validation

Both affected view modules were regenerated with `_build_view_image_module.js` and `_build_view_sentence_frames_module.js`; each compiler also writes the matching `desktop/web-app/public` runtime mirror. No corresponding source mirrors exist for these two extracted views.

Focused new/retained foundation functional cases: 19 passed, including author edits during AI, resource switching, superseded responses, failure/retry, unmount, accessible blank prompts, saved scaffold responses, and image replacement persistence. Visual Supports polish: 5 passed.

The final wider batch passed **151/151 tests across 13 files** with zero failures (including the focused tests above). Result: `scratch/main24-foundations-2026-09-07-results.json`; test log beside it. The initial 34-test batch exposed two pre-existing, obsolete glossary source assertions; both were updated to the current meaningful contracts before this successful final batch.

Final byte comparison: `view_image_module.js` and `view_sentence_frames_module.js` each exactly match their `desktop/web-app/public` copies. No application source changed after the successful final test batch.

No deployment or commit was performed. Live model quality, live delivery, manual screen-reader use, and every complete browser journey were outside this focused pass.
