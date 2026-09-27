> This document records the original 66-key batch. The recovery follow-up, current coverage and final integration instructions are in `docs/reader-recovery-localization.md`.

# Track 17 — reader localization integration

## Delivery and baseline

- Base: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
- Isolated validation workspace: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-localization-track17`.
- Managed worktree creation (operation `0007d311-1a46-4446-aa16-9a4d89cc3107`) failed with **No space left on device** during checkout. Its partial checkout was cleaned up automatically. The remaining work used an ignored, task-specific snapshot of 33 required files from the exact base, with existing dependency directories linked read-only for consumption. Test tools may write ordinary caches under those dependencies.
- No shared reader, host, generation source, English catalog, or live application state was changed. No deployment, publishing, push, or commit was performed.
- The user authorized implementation; coordination narrowed this track to stable translations and fixtures. Behavior fixes remain with 06/07/11 and integrator 01. No other chats were contacted.

## Implemented locale scope

66 frozen `simplified.*` strings cover place/bookmark/outline (15), section prompts (11), review summaries (18), student preview (3), and adaptation choices/notices (19).

The five packs are Spanish Latin America, Spanish Castilian, Arabic, Simplified Chinese, and Thai. Each receives 66 translations in its root and public copy: **330 locale/key translations, 10 pack files**. On this base each selected pack rises from 114/448 to **180/448** simplified string leaves. **268 leaves remain untranslated per selected pack**; the rest of the reader and Lumen are not represented as fully localized.

- Frozen English copy and translations: `translations/reader-contract-locales.json`.
- Guarded merge: `dev-tools/i18n/apply_reader_contract_locales.cjs`.
- `--check` is read-only and checks the complete scoped payload, source copy, placeholders and target keys.
- `--apply` merges only the owned keys into each pack separately. It refuses differing existing translations and changed English wording, preserves unrelated fields, checks concurrent changes, and writes through temporary files.
- English `ui_strings.js` is never written. Neither all-language regeneration nor a broad app build is needed.
- Arabic, Chinese and Thai term hints explicitly name the ASCII comma accepted by the current reader.
- Translations are AI-authored; no native-speaker review or linguistic certification is claimed.

## Tests actually run

1. Scoped catalog, runtime, handoff, existing reader-i18n/place-review-adapt, and translation-policy tests:
   **80 passed; 3 expected failures** across six files.
2. Strict handoff reproduction with `ALLO_READER_CONTRACT_STRICT=1`:
   **3 failed at the intended behavioral assertions**, documented below. These are unfixed behavior bugs, not passing acceptance.
3. Chromium layout suite with `ALLO_READER_LOCALE_LAYOUT=1`:
   **8 passed**. Spanish, Arabic, Chinese, Thai; 320 CSS-pixel viewport at 1x and 2x device scale; expanded adaptation controls, outline, prompts, review summary and student preview. Two labels are doubled to stress wrapping. Network is blocked; no app server or live state is used.
   This does not claim assistive-technology testing or native browser-menu zoom testing. An initial CSS-zoom fixture produced a false layout failure because media-query breakpoints remained wider than its effective content area; the final fixture correctly uses a narrow CSS viewport.
4. Scoped merge `--apply`, then `--check`: 10 changed files, then zero pending changes.
5. All five root/public locale pairs are byte-identical after the merge.
6. The 66 frozen English values still matched the active shared catalog at the final copy check.

Named data fixtures are in `tests/fixtures/reader_locales.json`:
`reader_en_contract_v1`, `reader_es419_long_labels_v1`, `reader_ar_rtl_mixed_v1`, `reader_zh_hans_unspaced_v1`, `reader_th_unspaced_v1`.
Tests exercise translated review/prompts/bookmarks/adaptation/preview, English fallback for missing/echoed keys, placeholder reordering, preview storage isolation, actual passage language, Arabic arrows, and Chinese/Thai segmentation with and without Intl.Segmenter.

## Reproduced behavior handoff — owners 06/07/11, integration 01

`tests/reader_language_contract_handoff.test.js` defaults to explicit `it.fails` cases. **Remove expected-failure treatment after implementing each fix.** Strict mode runs them as ordinary failing assertions.

1. **reader_bilingual_target_v1 — DOM metadata.** Spanish source plus saved Arabic translation, with `translationTarget: 'Arabic'` at both artifact and config levels, renders the Arabic paragraph with `lang: 'en', dir: 'ltr'`. Required: `ar/rtl`.
2. **reader_bilingual_target_v1 — adaptation retention.** The same stored target is passed to `generateBilingualText` as `target: 'English'` when adapting, even after ambient translation is disabled. Required: retain Arabic from the saved artifact.
3. **English → Arabic generation.** Explicit enabled Arabic translation of English output makes one model call and returns only the English block. Required: two blocks and a translation request for Arabic.

Proposed contract:
- UI language controls interface copy only; passage language comes from the artifact.
- Source language and translation target are separate metadata.
- Save and reuse the actual target for labels, DOM language/direction, speech entries, comparison, previews and adaptation.
- Preserve the existing `--- ENGLISH TRANSLATION ---` machine delimiter; it does not prove the target is English.
- When old bilingual artifacts lack target metadata, preserve the documented legacy English assumption, without silently overwriting explicit targets.
- A target other than English must work even when the source is English.
- Keep source text, learner responses, terms and snippets verbatim.
- Independently check overlays' metadata, unspaced diff/snippet bounds, and localized term separators before marking the broader language contract complete.

## Pending copy delta and ownership

The active shared English catalog added these **16 persistence keys** while this isolated batch was prepared; none changed the frozen 66:
`place_bookmark_temporary`, `place_saved_device`, `place_saving`, `place_preview_only`, `place_page_only`, `place_save_failed`, `place_save_ready`, `place_save_conflict`, `place_save_version_conflict`, `place_save_corrupt`, `place_save_large`, `place_save_capacity`, `place_save_coordination`, `place_retry`, `place_copy_answers`, `place_answers_to_copy`.
Keep them as a small follow-up once the owning persistence track freezes wording. Do not overwrite or rename their English copy to make this batch fit.

One locale owner should integrate this payload, resolve any competing translations explicitly, then apply later copy deltas. Shared reader/host/generated behavior files belong to their existing owners. This package informs 06/07/10/11/16 and integrator 01.

Lumen reading-workspace hardcoded strings, 33 unregistered immersive-reader fallback keys, and the larger inline word-help translation backlog remain outside this stable 66-key patch. English fallback should be reported honestly.

## Integration commands (no deployment)

From the integration checkout, first check and apply the supplied patch normally, preserving concurrent edits. Then:

```powershell
node dev-tools/i18n/apply_reader_contract_locales.cjs --check
node node_modules/vitest/vitest.mjs run tests/reader_locale_catalogs.test.js tests/reader_locale_runtime.test.js tests/reader_language_contract_handoff.test.js tests/reader_i18n.test.js tests/reader_place_review_adapt.test.js tests/translation_policy.test.js --maxWorkers=1 --testTimeout=30000
$env:ALLO_READER_LOCALE_LAYOUT='1'
node node_modules/vitest/vitest.mjs run tests/reader_locale_layout.test.js --maxWorkers=1 --testTimeout=30000
Remove-Item Env:ALLO_READER_LOCALE_LAYOUT
```

For strict behavioral reproduction, set `ALLO_READER_CONTRACT_STRICT=1` and run only `tests/reader_language_contract_handoff.test.js`. Expected current result is three red assertions; this is not a release gate claiming the defects are fixed.

Recheck source HEAD and final persistence-copy delta before integration. Local mirror parity is not evidence of the deployed revision or cached client packs.
