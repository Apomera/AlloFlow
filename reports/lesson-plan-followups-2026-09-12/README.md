# Lesson follow-ups - 2026-09-12

Implemented in the shared checkout. This follow-up and the still-unmerged second-pass refinements are saved on the separate local branch codex/lesson-plan-followups-2026-09-12; the earlier refinement branch remains available. Nothing pushed or deployed.

## Draft recovery

- Unsaved teaching-script edits and generation settings recover after navigation or refresh in the same browser-tab session.
- Recovery is keyed by teacher, profile, workspace, and saved plan. Parent/student views cannot display those drafts.
- Recovered edits retain the original version and step baseline. A changed or removed saved version leaves the draft available for copying/discarding while blocking an overwrite.
- Save and Discard clear the draft while retaining generation settings. A save that completes after navigation clears only the exact submitted draft.
- Unavailable/full storage is explained in the panel. Refresh protection is enabled when an active draft cannot be recovered; successful storage does not add a confirmation prompt.
- Draft recovery is separate from saving edits to the lesson. Closing the tab ends the session recovery guarantee.
- In-progress generation is also scoped to the workspace, so switching workspaces cannot attach a result to another copy of a lesson.

## Printed translations

- Labels use the lesson's recorded translation target, with a localized neutral Translation label for older/malformed metadata.
- Source and translated blocks use their recorded text direction, including Arabic and English combinations.
- Separately generated extension guides have no recorded translation target, so their translated blocks use a neutral label and automatic direction.
- Native bilingual fields, guides, legacy activities/assessments, and additional saved text after a delimiter remain complete.

## Other verified correction

Native timelines store entries in data.items with an event field. These entries now supply teaching content to the script generator and participate in change detection.

## Validation

422 distinct regression tests across 17 files passed after one unchanged translation-file recheck. The combined run passed 421 tests and reported a runner STACK_TRACE_ERROR for the first translation test after 26 seconds; that file then passed all 12 tests in 3.83 seconds. Both original and recheck reports are retained. No product change was needed for the rerun.

Browser checks passed at desktop and 320px width: navigation/reload recovery, teacher/profile/workspace isolation, save/discard cleanup, retained settings/research opt-out, and unavailable-storage refresh protection. There were no page errors, axe violations, or horizontal overflow. Phone screenshots, including the storage-failure notice, were visually reviewed. See [browser evidence](ui-browser-results.json).

Generated script/view modules and public mirrors match; all 66 checked views have no parse failures or missing-prop findings. Shell generation and document pipeline build parity passed.

## Live test status

The real allowlisted research reader retrieved and verified six recommendation passages from [WWC's elementary mathematics intervention guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/26). The fractions-specific guide timed out; that warning remains in the prepared evidence. No invented or canned research was substituted.

The exact synthetic lesson prompt and evidence snapshot are in [the prepared bundle](live-2026-09-13T01-32-01-766Z-43636/bundle.json), with [live retrieval status](live-2026-09-13T01-32-01-766Z-43636/summary.json). The prompt contains only a synthetic fourth-grade fraction lesson.

Gemini was opened for the user to sign in. Browser generation is pending sign-in; the browser connector subsequently reported that its Chrome profile was already in use. No AI-provider request has been made. No configured API credentials or reachable local AI service were available. A Gemini browser response can validate real model output through the application's script validation, save, edit, reopen, and export path; it does not establish that AlloFlow's own provider connection works.

The reusable harness is dev-tools/check_lesson_teaching_script_live.cjs. It requires an explicit mode, never accepts credentials on the command line, and records failures without substituting a simulated response. Run --help for direct-provider or prepared browser-response modes.
