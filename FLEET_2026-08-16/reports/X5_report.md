# X5 report — ANTI extraction: FERPA cluster + saved-work encryption (wave 3)

**Status: the two priority clusters are DONE (0 findings each); long tail reported honestly.**
2026-08-17 · run inline by the coordinator.

## Per-cluster before/after (scanner numbers)

| Cluster | Before | After | Keys |
|---|---|---|---|
| 46900–47700 Class Mailbox / live session / FERPA | **121** | **0** | 126 (`share_collect.*` ≤47228, `mailbox.*` beyond — matching the namespaces the surrounding code already called) |
| 35400–36600 saved-work encryption / recovery keys | **76** | **0** | 64 (`storage.*`) |
| ANTI total (scanner --csv) | 1205 | **1008** | |
| ANTI per-file ratchet (the --gate ledger) | 621 | 473 | |

Method per the binding W1/L5 notes: exact-match-once or skip loudly (never guess), verbatim
English values (extraction is not rewording), `@babel/parser` full-file parse after every
burst, `JSON.parse` on ui_strings after every write, both files mirrored to
`desktop/web-app/public/`, all edits under fleet lock. Scripts kept at
`_dev_scratch/x5_extract_mailbox{,_p2}.py`, `x5_extract_storage.py`; key inventories at
`_dev_scratch/x5_{mailbox,storage}_keys.json`.

## FERPA-tagged keys — reviewed translation ONLY, never casual

These are compliance/privacy statements. English kept verbatim; a loose translation here is
a compliance statement, not a UI string. X3 and future translators: translate with review,
or leave English until reviewed.

- `mailbox.k_12_privacy_ferpa_checklist_is`, `mailbox.a_google_account_alone_does_not`,
  `mailbox.use_a_school_managed_google_workspace`, `mailbox.use_student_codenames_do_not_ask`,
  `mailbox.treat_each_qr_link_as_a`, `mailbox.keep_the_admin_token_private_rotate`,
  `mailbox.use_only_for_students_and_purposes`
- Storage/retention disclosures: `mailbox.what_is_stored_where_and_for`,
  `mailbox.live_messages_and_class_state_bounded`, `mailbox.session_recovery_marker_and_random_secret`,
  `mailbox.hosted_homework_and_completed_mailbox_submission`, `mailbox.admin_token_recovery_note_the_same`,
  `mailbox.no_mailbox_content_is_stored_on`, `mailbox.save_submit_uploads_json`,
  `mailbox.live_quiz_answer_content_travels_peer`, `mailbox.work_stays_on_the_student`
- OAuth-warning honesty copy: `mailbox.google_can_show_this_warning_because`,
  `mailbox.the_script_requests_google_drive_access`, `mailbox.why_might_google_say_unverified`
- Token/QR security: `mailbox.students_never_receive_this_token_the`,
  `mailbox.admin_token_save_it_like`, `mailbox.the_saved_file_holds_an_access`
- Encryption honesty: `storage.optional_aes_gcm_encryption_summary`,
  `storage.the_key_cannot_be_looked_up`, and the `storage.*` erase/import/verify confirmations.

## Keys for X3 (all of them)

All 190 new keys are additive in `ui_strings.js` (`share_collect.*` +~60, `mailbox.*` +~66,
`storage.*` +64; exact inventories in the two JSON files above). FERPA-tagged subset above
needs reviewed translation; the rest are normal UI strings.

## Honest remainder (not worked)

- 45500–46000 storage/recovery manager remainder: ~18 findings.
- 51500–52000 AlloHaven: ~32.
- Lines 0–3500: ~400 findings the scanner now surfaces (labels/object-literal seeded content;
  many are the scanner-invisible classes W1 documented, needing per-site judgment).
- Long tail elsewhere: the rest of the 1008.

## Gate note (filed in CROSS_LANE_REQUESTS)

`scan_shell_i18n --gate` is red at HEAD **only** because a concurrent session's uncommitted
`educator_evaluation_source.jsx` work added +10 hardcoded strings (488 → 498). I did not run
`--update-baseline` — it would bless their regression along with my wins. The ratchet keeps
my improvement either way.
