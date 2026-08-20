# Community translation corrections

User-submitted fixes to the language packs — same architecture as the community lesson
catalog (`catalog/`), reused for translations.

## Flow (mirrors the lesson-catalog flow)

1. **In-app submit.** A multilingual user in help-mode clicks a string and gets a
   "✎ Suggest a better <language> translation" pill → modal (`translation_feedback_module.js`).
2. **Worker.** The modal POSTs to the shared Cloudflare Worker `alloflow-catalog-submit`
   (`catalog/cloudflare-worker/`), route **`POST /submitTranslation`**. The worker validates,
   runs the defense-in-depth PII scan, and commits one record to **`translations/pending/`**
   via the GitHub API (same `GITHUB_PAT` secret as lesson submissions). If the worker is
   unreachable, the modal falls back to the pre-filled bug-report Google Form so input is never lost.
3. **Review + apply (maintainer).** Triage and apply with the same i18n guards:
   ```bash
   node dev-tools/i18n/ingest_translation_feedback.cjs            # dry-run: accepted vs needs-review
   node dev-tools/i18n/ingest_translation_feedback.cjs --apply    # write accepted → lang/*, archive records
   npm run check:lang-json && node dev-tools/i18n/check_safety_string_spanglish.cjs
   git add lang/ translations/ && git commit -m "i18n: apply community translation corrections"
   ```
   `--apply` writes accepted corrections into `lang/<slug>.js`, then moves the applied record
   files from `pending/` to `applied/`. Records that fail a guard (unknown language, key not
   found, placeholder mismatch, still-Spanglish, no-op) stay in `pending/` flagged "needs review".
4. **Deploy.** The corrections ship with the next `deploy.sh` like any other lang-pack change.

## AlloBot hand-translation batches

AlloBot tips and completion messages are maintained as two namespaces in
`ui_strings.js` (`tips.*` and `bot_events.*`). The catalog currently contains
319 strings, including 116 strings with runtime placeholders. Reviewed hand
translations can be merged with the stricter AlloBot contract:

```bash
node dev-tools/i18n/apply_allobot_hand_translations.cjs translations/pending/allobot-<batch>.json --dry-run
node dev-tools/i18n/apply_allobot_hand_translations.cjs translations/pending/allobot-<batch>.json
npm run verify:allobot-i18n -- --gate
```

The payload is keyed by language slug and dotted AlloBot key. The contract
rejects unknown keys, placeholder drift, exact English copies, and pre-existing
drift in the AlloBot namespaces. It writes each AlloBot value to both pack trees
while preserving unrelated staged differences and existing values unless
`--replace` is explicitly supplied. This is a
review gate: it does not silently fill missing language values with English.

The current reviewed pass covers all 63 language packs (319/319 AlloBot keys
per pack). Long-tail packs use the hand-authored phrase sets in
`dev-tools/i18n/generate_allobot_hand_packs.cjs`; the generated payloads remain
in `translations/pending/` so language reviewers can refine individual wording
without losing placeholder or root/public parity checks.

## Record shape (`translations/pending/<ts>-<lang>-<keyslug>.json`)

```json
{
  "schema_version": "1.0",
  "kind": "translation_correction",
  "submitted_at": "<ISO 8601>",
  "language": "Greek",
  "key": "help_mode.pdf_audit_view_web_audit_btn",
  "current": "<current value the user saw>",
  "suggested": "<user's correction>",
  "english": "<English source>",
  "note": "<optional reason>",
  "pii_scan": { "ran_server_side": true, "findings": [] },
  "submitter": { "ip_country": "GR", "user_agent": "<first 200 chars>" }
}
```

Unlike the lesson catalog, corrections are **submit-only** — the app never reads them back,
so there is no public manifest/`index.json`.

## Worker setup (one-time, Aaron)

The `/submitTranslation` route lives in the existing worker and reuses its `GITHUB_PAT` secret —
just redeploy it:
```bash
cd catalog/cloudflare-worker && npx wrangler deploy
```
No new secret or binding is needed.
