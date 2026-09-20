# Lesson script keyboard actions and deletion — September 19, 2026

Editing now focuses the first step title. A shortcut above the steps reaches a named save/discard region, including any validation feedback, without changing the draft.

Version deletion focuses Keep version first, supports Escape to cancel, and restores focus to a useful control after cancellation or success, including deletion of the last version. Pending requests cannot be duplicated or overlap script generation. Structured errors and non-Error rejections produce readable retry feedback without dropping the confirmation.

Validation: 113 tests passed across four affected suites, including nine new regression cases. Real Chromium workflows passed at 1280 and 320 px: edit focus, save controls navigation, delete confirmation/Escape focus, failure and retry, last-version focus, and existing spoken/fullscreen/export/draft/list workflows. No browser errors, horizontal overflow or axe violations in the checked views. Phone deletion confirmation screenshot visually reviewed. Source/module/public mirrors rebuilt.

The browser fixture simulates persistence callbacks. Live AI/TTS provider generation remains unverified. No push or deployment.
