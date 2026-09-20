# Lesson teaching workflow enhancements — September 19, 2026

- Spoken directions now have a labeled step selector. Returning from the full script retains the selected step for that script in the current mounted lesson view; switching to another version starts at its first step. Positions are clamped if step counts change. Jumping stops pending audio and announces the new step heading.
- Script editing explains invalid character lengths and minute values beside the corresponding fields, using stable accessible names, aria-invalid and linked descriptions. An unsaved-edits summary shows the current timing total and a Go to first issue control focuses the relevant field. Overlong recovered titles are blocked before saving.
- Starting script editing or spoken playback is disabled while a version deletion is pending.

Validation: 93 tests passed across four files, including navigation, cancellation of late audio, validation focus, pending deletion, and draft recovery. The first run included a test expecting the old step-reset behavior; it now checks retained position before explicitly selecting the edited step. One UI suite did not start in that run; both affected suites passed in the rerun. validation-summary.json combines the latest passing result for each file.

Real Chromium workflows at 1280 and 320 px passed direct selection, closing/reopening at the same step, full-screen lifecycle, Undo, editor focus, and overflow checks. No browser errors or axe violations in the checked spoken, list and validation views. Phone field-feedback screenshot visually reviewed. Generated script-view mirrors rebuilt.

Live provider generation remains unverified; the previously requested app URL/provider is still outstanding. No deployment performed.
