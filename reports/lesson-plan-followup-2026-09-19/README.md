# Lesson plan follow-up — September 19, 2026

- Replaced the generation form's outdated three-version retention message with the same explicit-deletion guidance shown in the history controls.
- New script versions record fingerprints of their supplied teaching materials. Saved scripts warn about changed, missing, or ambiguous material IDs independently of the current generation-form selection. Older scripts explicitly disclose when content versions were not recorded. Learner responses, unrelated resources, and title-only edits do not trigger a content-change warning.
- Objective/material removal offers Undo while that list remains unchanged. Undo restores the full structured item at its original position and focuses it, preserving translations and metadata. A later change to that list invalidates Undo instead of overwriting the new work. Undo is scoped to the current plan and edit session.

Validation: 185 tests passed in 8 files, zero failures. Real Chromium workflows passed at 1280 px and 320 px, including restoration and focus after Undo, fullscreen lifecycle, overflow and automated accessibility checks. No reported browser errors or checked axe violations. The phone Undo screenshot was visually reviewed. Generated core and view mirrors were rebuilt.

Live AI/TTS verification remains blocked: the Chrome debugging connection reported a locked profile, and the alternate browser connection failed during sandbox initialization. No live provider request was made. Requested the AlloFlow URL and connected provider; API keys should remain in app settings. Nothing deployed.

Commit checks: all six guard checks passed against the isolated lesson branch index. Source-pair validation used exact staged copies because unrelated content-engine edits currently diverge in the shared checkout. Git comparisons used this branch’s actual parent so newer main-branch STEM edits were excluded. Concurrent work and the primary index were not modified.
