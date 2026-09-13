# Persona recovery refinement — September 12, 2026

Completed a second Persona pass focused on failed replies, voice submission, and follow-up hints.

## Changes

- **Prevented an Auto-Send retry loop.** A failed reply restores the learner's question. Previously, the restored text could schedule another voice submission automatically. Failed turns now pause Auto-Send until an explicit resend. Pending voice timers also cancel when a reply starts or the learner switches to suggested choices.
- **Made failed replies visible.** Both interview types show a persistent explanation beside the response controls. Written questions remain available for editing and resending; choice-only interviews retain their choices. New turns, closed or reset interviews, and resumed snapshots clear the old error state.
- **Added hint recovery.** Written-response mode now distinguishes preparing hints, unavailable hints, and a failed hint request. “Get question ideas” retries the existing generator while the draft remains editable.
- **Improved long hints on phones.** Single-interview hint cards have a bounded width and wrap their text.

## Validation

- **161/161 unit tests passed across 12 Persona test files.** Eight added regression cases failed before the fix: two real core-handler recovery cases and six tests exercising the actual Auto-Send effects from all three application source entry points.
- **14/14 Chromium checks passed.** Includes five new cases for reply recovery, hint recovery, and long hint wrapping, alongside the previous mode-switching, IME, writing, and setup checks.
- Automated accessibility checks passed for the tested recovery screens. Phone screenshots were visually inspected.
- Edited sources parse; generated Persona handler and chat bundles match their desktop public copies. Module versions are current for CDN loaders, local loaders remain local, and English UI string mirrors match. Targeted whitespace checks passed.

Evidence: [unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/unit-results.json), [browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/browser.log), [before-fix regressions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/before.log).

## Screenshots

- [Panel reply recovery and preserved question](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/browser-tests/persona-refinement-panel-k-27fd7--permits-an-explicit-resend/panel-reply-recovery.png)
- [Single-interview hint recovery](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/browser-tests/persona-refinement-single--d08fd-eping-the-question-editable/single-hint-recovery.png)
- [Panel hint recovery](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-recovery-2026-09-12/browser-tests/persona-refinement-panel-e-34921-eping-the-question-editable/panel-hint-recovery.png)

Tests use controlled provider responses and browser fixtures with the shipped chat renderer. Auto-Send tests exercise the application's React effects with simulated timers; live microphones, voice providers, and paid AI generation were not used. New messages are English. Changes are local; nothing was deployed.
