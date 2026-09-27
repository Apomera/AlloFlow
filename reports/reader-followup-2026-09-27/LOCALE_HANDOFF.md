# Frozen reader locale delta — track 01 to localization owner

Track 01 completed the bounded reader follow-up catalog delta before receiving the new overlap notice. No messages were sent to other sessions. Further locale writes by track 01 stopped after the already-running final apply completed. Track 17 should own subsequent edits to this set; reconcile against these current bytes rather than applying the old preview supplement or replacing whole packs.

Baseline: `452e7cd230b62f4e192f055826817653d5b997f4`. Frozen completed bytes are in `validation-before.json` (2026-09-27T03:26:32.899Z). The `translations/reader-followup-locales.json` payload has 70 keys × five locales, SHA-256 `3777036f53ff0bdca05602d5457900fd3069a03bb3e353e42c229fbcce7d3825` at that snapshot. Existing contract/recovery/terms batches are unchanged. The `--batch=all` guard now covers 187 keys.

Owned delta:

- 36 previously inline English fallbacks registered verbatim in `ui_strings.js` and `desktop/web-app/public/ui_strings.js`; see `english-registration.json` for exact keys.
- 70 new simplified keys per pack in Spanish Latin America, Spanish Castilian, Arabic, Simplified Chinese and Thai, with exact public mirrors. The initial 69-key inventory was extended with `save_audio_stop` so the cancellation instruction names the translated visible button.
- `dev-tools/i18n/apply_reader_contract_locales.cjs` adds the frozen `followup` batch (70) and its parser option. The merge refuses overwriting a different existing translation and validates English and placeholders before writes.
- `tests/reader_followup_locales.test.js` covers catalog/mirror guards and current preview refresh, independent lookup retry, and explicit recovery-save semantics in the five locales. Existing narrow preview/browser tests are also run.

The payload preserves the finalized preview note and refresh semantics, unknown audio settings, protected recordings, unconfirmed device saves, independent dictionary/AI failures, and restored drafts requiring explicit save. These are AI-authored translations; native-speaker review remains pending. This does not complete every reader, research, Storybook or simulator translation.

`prepare-locales.cjs` is the historical one-shot preparation script for the initial 69-key delta, not a general updater. Do not rerun it on the completed packs. The payload and scoped updater are the authoritative repeatable validation path. English before-images are retained under `before/`; use `git diff` against the recorded HEAD for other source deltas.

Read-only validation: `node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=all`. It was clean at the frozen handoff. Re-run it after any localization reconciliation and compare placeholders/current English. Do not infer deployed-language coverage from these local bytes: language caching and actual served URLs still require the next authorized release validation.

Parent-owned test paths from the coordination notice were left untouched: student_assignment_restore_readiness, novak_original_reader_handlers, mailbox_activity_only_intake, helpers/live_hydration_harness, live_session_learner_recovery, live_session_reliability, homework_selection_integrity, instructional_role_ui and karaoke_tts_review_runtime.
