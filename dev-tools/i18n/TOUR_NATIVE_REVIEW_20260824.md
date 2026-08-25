# Tour native-review drafts — 2026-08-24

Status: **draft, not native-approved**.

These drafts cover `tour.actions_text`, `tour.brainstorm_text`, and
`tour.note_taking_text` for:

- Acholi (`acholi`)
- Chin Falam (`chin_falam`)
- Chin Hakha (`chin_hakha`)
- Karen (`karen`)
- Lingala (`lingala`)
- Marshallese (`marshallese`)

The drafts reuse translated terminology already present in each pack. Technical names,
product names, and classroom-protocol names are intentionally retained where the pack
already mixes them with the target language.

The values are written to both `lang/<slug>.js` and
`desktop/web-app/public/lang/<slug>.js`, but they are deliberately **not** recorded in
`lang_pack_review_baseline.json`. Therefore all 18 entries remain in the stale report
until a native reviewer approves or edits them.

After native review, keep the root/deploy files byte-identical and record approval:

```bash
node dev-tools/i18n/record_pack_translation_review.cjs \
  --lang=<slug> \
  --key=tour.actions_text \
  --key=tour.brainstorm_text \
  --key=tour.note_taking_text \
  --reason=native-reviewed --apply
```

Then run:

```bash
node dev-tools/i18n/check_lang_staleness.cjs --quiet --ratchet
node dev-tools/i18n/audit_ui_pack_coverage.cjs --namespace=tour --quiet --gate
node dev-tools/i18n/reconcile_lang_mirror_three_way.cjs
```

Draft source payloads:

- `tour_native_review_drafts_20260824.json`
- `tour_native_review_note_drafts_20260824.json`
