# Lesson plan refinements - 2026-09-12

Second review pass, implemented locally and saved on the separate local branch `codex/lesson-plan-refinements-2026-09-12`. The shared checkout retains these changes; its existing staged work is untouched. Nothing pushed or deployed.

## Script reliability

- Cancellation finishes promptly even when an AI adapter or research loader ignores its abort signal. Late failures are observed, and rejected research downloads are stopped.
- Native quiz resources now supply their teacher answer keys, rubrics, evidence choices, and sequencing information to the script generator.
- Changes beyond prompt character limits, and changes in omitted materials, invalidate a running generation. Teachers can preview which plan fields/materials will be shortened or omitted.
- Blank, removed, and duplicate resources cannot silently become usable selections. Materials that become blank during generation invalidate the result.
- Drafts stay attached to their original script version. Saving compares the original steps with the latest saved wording, preserving newer edits when there is a conflict.
- Oversized teaching fields are rejected explicitly instead of being silently shortened.

## Usability

- Unedited settings refresh when the lesson changes; customized settings stay intact, with an option to use the current lesson defaults.
- Saved scripts indicate when the lesson has changed since the script was generated.
- Cancel stays available with either the settings or the entire panel collapsed.
- Save, discard, and cancel restore keyboard focus to a visible control.
- Removed selections explain the problem and offer a direct recovery action.
- Saved scripts appear sooner, with generation settings behind Create another script.

## Copy and print

- Copy includes the essential question, objectives, materials, all teaching phases, closure, extensions, and teacher guides, using saved lesson metadata.
- The lesson's PDF/print actions print only the selected saved lesson. They no longer inherit pack settings that can omit the lesson or duplicate it in a teacher-key appendix.
- Deleted or ambiguous saved lessons cannot accidentally export another resource.
- Export preparation handles supported scalar/structured legacy fields without modifying saved data. Empty extension sections are omitted.
- Legacy activities and assessment ideas are preserved in printed lessons as well as copied text.

## Validation

**381 tests passed across 15 files, with no failures or skipped tests.** Results are recorded in regression-results.json. Browser results are in ui-browser-results.json. Desktop (1280px), phone (375px), small-phone (320px), and the new-script phone form have no detected axe violations, horizontal overflow, or page errors. Verified interactions include script edit/save, simulated generation, refreshed defaults, retained custom settings, collapsed-settings cancellation, missing-selection recovery, and keyboard focus.

The print integration uses the actual document pipeline and checks lesson content, legacy fields, omitted unrelated resources, and absence of duplicate lesson/empty extension sections. Generated modules/public mirrors and shell outputs are synchronized. The document pipeline matches a fresh build byte for byte; view-prop checks found no missing references, and all 192 registered module consumers resolve.

This review uses deterministic AI/research fixtures. Live provider output quality, a packaged desktop release, and production deployment have not been tested.

## Evidence

- [Desktop view](lesson-script-desktop.png)
- [Small-phone controls](lesson-script-small-phone-viewport.png)
- [New-script phone form](lesson-script-new-phone.png)
- [Browser results](ui-browser-results.json)
- [Browser harness](verify-ui.cjs)
