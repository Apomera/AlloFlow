# Reader recovery localization — final track 17 follow-up

## Delivered scope

This follow-up adds **34 recovery keys across five locale packs: 170 translations**, in both root/public mirrors. It covers saving, failed saves, temporary work, retry, version conflicts, review/choice controls, readable work copying and temporary recovery copies. The packs are Spanish Latin America, Spanish Castilian, Arabic, Simplified Chinese and Thai.

The earlier 66-key batch remains intact. Together the batches cover **100 keys / 500 translations**. In the captured English catalog, each selected pack contains **214 of 490** `simplified` string leaves; **276 remain untranslated** and use English fallback. No full-reader or Lumen localization is claimed. The two older answer-copy labels remain translated for compatibility, although the integrated reader uses the new work-copy labels.

Translations are AI-authored. Native-speaker review, screen-reader pronunciation review, native browser-menu zoom testing and deployed-release verification remain outstanding.

## Baseline and copy assumptions

- Local HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`; this is not a deployed-release assertion.
- Isolated validation snapshot: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-localization-recovery-track17`.
- Current uncommitted English catalogs, reader JSX, `reader_place_store.js` and `reader_support_drafts.js` were copied as validation inputs. JSX and both embedded helpers are compiled in memory. Shared source/helper/English files are excluded from the patches.
- During work, integration replaced the raw-JSON copy box with readable text, added conflict-review controls and changed `place_save_conflict`. The English-copy guard caught the change. This final batch and its fixtures use that integrated contract; the earlier 16-key draft and earlier test counts are superseded.
- Concurrent track 13 `share_collect` translations are outside this scope. They are preserved. The combined patch is reconstructed against original Git-verified locale blobs, never by replacing current files from the snapshot.
- Exact source hashes, current-copy checks, concurrent locale deltas and test outcomes are in `reports/reader-localization-recovery-2026-09-26/files-and-validation.json`.
- Managed worktree creation previously failed due to disk capacity. This is a small isolated snapshot, not a Git checkout. Existing installed dependencies are linked; ordinary test caches may be written there.
- No shared runtime source edits, deployment, publication, push, commit, live-data changes or cross-session messages were performed by this follow-up.

## Owned files

- `translations/reader-recovery-locales.json`: 34 frozen English values and 170 translations.
- `dev-tools/i18n/apply_reader_contract_locales.cjs`: scoped `--batch=contract|recovery|all`; the default remains the original 66-key contract.
- Five `lang/*.js` packs and their five `desktop/web-app/public/lang/*.js` mirrors: exactly 34 additional keys per file relative to the first batch.
- `tests/fixtures/reader_recovery_locales.json`.
- `tests/helpers/reader_recovery_locale_harness.js`.
- `tests/reader_recovery_locale_catalogs.test.js`.
- `tests/reader_recovery_locales.test.js`.
- `tests/reader_recovery_locale_layout.test.js`.
- `docs/reader-recovery-localization.md`.

`--check` is read-only. The updater checks exact English copy in both catalogs, key coverage, placeholders and competing translations before any pack writes. It preserves unrelated keys and rechecks each target before atomic replacement. It is not a transaction across every file.

## Validation

The final machine-readable test reports accompany this document. The focused gate comprises **88 unit/catalog checks** and **8 browser cases**, with no expected-failure tests in either set.

The 67 real-reader cases exercise translated ready/saving/saved states, failed writes, temporary bookmarks, retry, preview/anonymous retention, all six original failure reasons, conflict-review choices, changed-review notices and retained recovery copies. Learner answers containing Unicode, markup-like text, literal dollar signs and placeholder-like characters remain unchanged. Missing/echoed keys fall back to readable English.

Catalog/updater checks cover all five packs and their mirrors, unchanged unrelated values, idempotency, read-only checking and refusal to write any locale when English copy, mirror copy or existing translations conflict.

Browser cases use Spanish, Arabic, Chinese and Thai at **320 CSS pixels**, with **16px and 32px root text sizes**. Conflict review is open, work-copy controls are expanded, retry receives keyboard focus, translated text fits the viewport width and copied answers remain intact. All network requests are blocked; there is no app server or live application state. Root text enlargement is not native browser-menu zoom.

The browser fixture initially had an irrelevant button-type assumption, which was removed while retaining its focus check. After source integration, an actual Spanish retained-copy sentence overflowed by 10 pixels at doubled text size. Its wording was simplified without changing the meaning. Final test results supersede those earlier runs.

The earlier visual raw-JSON finding is **resolved by the integrated reader owner's changes**, not by a production-code edit in this patch. New fixtures verify readable, localized question labels instead of internal field names and exact learner answer content.

The three earlier bilingual language-target/generation regressions remain separate owner work. They were not rerun or claimed repaired by this recovery gate.

## Integration handoff

The first locale batch was integrated into the shared checkout during the final preflight. **Use `supplement.patch` for that checkout.**

Use **`combined.patch`** only for a checkout where the first locale patch has not been applied; it supersedes the first standalone patch. Use **`supplement.patch`** only after the first patch is applied. Do not apply both alternatives. The manifest lists exact files and preflight results.

The shared reader, place store and support-draft helper belong to their existing owners. Integration 01 should merge the selected locale patch after its source/helper integration, preserving track 13 delivery translations, then run:

```powershell
git apply --check reports/reader-localization-recovery-2026-09-26/supplement.patch
# Apply the chosen patch after its preflight succeeds.
node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=all
node node_modules/vitest/vitest.mjs run tests/reader_locale_catalogs.test.js tests/reader_recovery_locale_catalogs.test.js tests/reader_recovery_locales.test.js --maxWorkers=1 --testTimeout=30000
$env:ALLO_READER_RECOVERY_LAYOUT='1'
node node_modules/vitest/vitest.mjs run tests/reader_recovery_locale_layout.test.js --maxWorkers=1 --testTimeout=30000
Remove-Item Env:ALLO_READER_RECOVERY_LAYOUT
```

These are focused integration-gate commands; repository-wide CI is unchanged. English keys must already be present from their owning integrations. Exact-copy checks should stop integration if wording changes again. Mirror equality does not establish deployed bytes or client cache freshness.

## Remaining bounded work

- Eight newer audio/layout-preview keys are outside this recovery batch: `review_audio_unavailable`, `review_audio_current_detail`, `layout_preview_open`, `layout_preview_title`, `layout_preview_note`, `layout_preview_limits`, `layout_preview_word_help`, `layout_preview_chart`. Translate them as a small follow-up after their owners freeze the contracts.
- The locale reviewer should check natural wording, consistent bookmark/version terms, tab terminology and accurate device-versus-temporary storage claims. Preserve `{snippet}` and `{number}` literally; do not translate learner text. Review remains pending for all five packs.
- 06/07/11 retain the earlier passage-target, adaptation-retention and English-to-Arabic generation fixes. Their expected-failure fixtures should become ordinary passing tests when those fixes land.
- Reader owners retain Chinese/Thai snippet/diff bounds and localized vocabulary separators. Track 18 retains assistive-technology and actual browser-menu zoom checks on the assembled UI.

Named fixtures: `reader_en_contract_recovery_v1`, `reader_es419_long_labels_recovery_v1`, `reader_ar_rtl_mixed_recovery_v1`, `reader_zh_hans_unspaced_recovery_v1`, `reader_th_unspaced_recovery_v1`.
