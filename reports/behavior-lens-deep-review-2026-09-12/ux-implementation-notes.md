# UI implementation notes — 2026-09-12

Implemented in canonical `behavior_lens_module.js`; coordinating agent owns the deployment mirror.

- ABC narratives remain visible and editable for preset, custom, imported, and AI-filled values. Buttons retain meaningful names and selected state.
- Editing spreads original canonical metadata before applying field changes. Occurrence date/time is editable; recordedAt is preserved. Intensity defaults to Not rated and zero duration survives editing.
- Main header Close has its own reserved action, with status controls wrapping below. Observation overlays can scroll on small screens. Injected accessibility/mobile CSS is scoped to `.bl-root`.
- Category chips, accordions, wizard answers, back/export/family controls, related tools and workflow links have specific accessible names and state where relevant. Panel focus is scoped to module content. Hub cards retain article semantics without invalid role=group. Progress labels and sandbox text contrast were corrected.
- Hub provides a short task path and shared prerequisites for entry points. Family Mode changes its task path and suppresses specialist quick launch/recommendations. Backup controls now say Download backup and distinguish file backups from automatic browser saves.
- Live Observation, Frequency Counter, Interval Grid and Choice Board share keyboard containment, background inertness and opener restoration.
- Live/frequency/interval recordings keep per-student drafts in sessionStorage. Drafts survive reload in the same tab and restore paused; they expire after seven days. Close asks to keep the draft, explicit discard confirms, successful Save clears it, and failed draft storage prevents closing through the keep-draft path. Drafts are tab-scoped and are not a replacement for saved workspace observations/backups.

Validation: `node node_modules/vitest/vitest.mjs run tests/behavior_lens_ux_recovery.test.js --maxWorkers=1 --pool=threads --testTimeout=30000` passed **9/9** mounted tests. Verified metadata/date/intensity round-trip; visible custom narratives and meaningful choice names; wizard prerequisites; Tab containment and opener/inert restoration; keep/resume; zero-event timed save and clear; student isolation and explicit discard; and storage-error protection. A first test run failed to start its fork worker. A subsequent run exposed the test-only duplicate-module guard, which was fixed before the passing run. Source syntax checked after each implementation pass.

`tests/behavior_lens_confirmations_a11y.test.js` now covers the two additional observation exit decisions alongside the seven preexisting confirmations. Coordinating agent owns full-suite/golden/Chromium verification. Analytics agent owns the additional Live Observation partial-interval pause arithmetic fix identified during this implementation.
