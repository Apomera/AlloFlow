# i18n Tooling

Scripts that keep AlloFlow translatable end-to-end — key extraction, per-language
gap reporting, incremental translation, orphan cleanup, a blocking Spanglish guard,
and community-correction ingest. (Originally built around `behavior_lens_module.js`;
the gap/merge/guard tooling now applies repo-wide.)

> **Currency note (2026-07-09):** The repo currently has 63 mirrored `lang/*.js` pack files. Re-run the gap/staleness tools before using older sample counts below for planning.

## 1. `extract_behavior_lens_keys.cjs`

Scans `behavior_lens_module.js` for every `t('behavior_lens.X') || 'English'` call site, compares the keys + fallbacks against the canonical English in `ui_strings.js`, and emits three diagnostic JSON files plus a merge mode that auto-fills any missing English keys.

**Run modes:**

```bash
# Dry-run: report gaps, no file mutation
node dev-tools/i18n/extract_behavior_lens_keys.cjs

# Auto-merge: any key used in source but missing from ui_strings.js
# is added using the English fallback found in the source
node dev-tools/i18n/extract_behavior_lens_keys.cjs --write
```

**Outputs (always written, even on dry-run):**

- `missing_behavior_lens_keys.json` — keys used in source but absent from `ui_strings.js`. With `--write`, these get added automatically using the source's English fallback.
- `drift_behavior_lens_keys.json` — keys whose source-code fallback diverges from `ui_strings.js` value. Categorized informally:
  - **Placeholder drift** (`${count}` in source vs `N` in ui_strings.js) — intentional; ui_strings.js uses `N` as a translator-readable placeholder marker.
  - **Truncated fallbacks** (ui_strings.js value cut off mid-sentence) — bug from prior extraction; needs hand-merge.
  - **Real text change** (source updated, ui_strings.js stale) — judgment call; ui_strings.js wins if it's been translated, source wins if it's a fresh copy edit.
- `orphan_behavior_lens_keys.json` — keys defined in `ui_strings.js` but never referenced from source. Most are flat-name legacy duplicates (e.g. `behavior_lens.abc_title` co-existing with the nested `behavior_lens.abc.title`). Safe to leave; cheap dead weight.

## 2. `lang_pack_gap_report.cjs`

For every `lang/*.js`, computes what fraction of the canonical `behavior_lens.*` namespace is actually translated (i.e. has a non-passthrough value). Emits per-language gap reports to `lang_pack_gaps/<lang>.json` listing exactly which keys still need translation.

```bash
node dev-tools/i18n/lang_pack_gap_report.cjs
```

**Output per language** (`lang_pack_gaps/<lang>.json`):

```json
{
  "langName": "spanish_latin_america",
  "totalEnglishKeys": 1529,
  "translatedKeys": 1480,
  "missingKeys": 46,
  "passthroughKeys": 3,
  "coveragePct": 96.8,
  "missing": { "behavior_lens.ai.consent_title": "Enable AI assistance?", ... }
}
```

## 3. `merge_missing_translations.cjs`

Incrementally translates the per-language `missing` block from each `lang_pack_gaps/<lang>.json` into the matching `lang/<lang>.js` using Gemini. **~95% cheaper than `build_language_pack.cjs`** for delta updates because it only sends the new keys (typically 10-100), not the full 1,400-key namespace.

```bash
# Translate all languages with missing keys
GEMINI_API_KEY=... node dev-tools/i18n/merge_missing_translations.cjs

# Single language
GEMINI_API_KEY=... node dev-tools/i18n/merge_missing_translations.cjs --lang=spanish_latin_america

# Dry run (echoes English back; no API calls, no cost)
node dev-tools/i18n/merge_missing_translations.cjs --dry-run

# Concurrency / model override
GEMINI_API_KEY=... node dev-tools/i18n/merge_missing_translations.cjs --concurrency=3 --model=gemini-3-flash-preview
```

Each touched pack gets a `*.bak.<timestamp>` backup. Output validates that the LLM returned every input key and ignores any extras it hallucinated.

**Token scale estimate:** ~46 new keys x 63 languages x ~50 output tokens is about 145K output tokens before prompt overhead. Check current provider pricing and the active model before running an apply pass.

## 4. `verify_orphans_full_repo.cjs` + `purge_dead_orphans.cjs`

The extractor's "orphan" list (keys defined in `ui_strings.js` but never referenced from `behavior_lens_module.js`) is a starting point, not a verdict — many keys are referenced from `src/App.jsx`, `teacher_module.js`, or via dynamic key construction (`t(item.tKey)`) and must be kept.

```bash
# Cross-check every orphan against the FULL repo (1226 files / 159 MB)
node dev-tools/i18n/verify_orphans_full_repo.cjs
# → orphan_verified_dead.json + orphan_verified_kept.json

# Dry-run preview
node dev-tools/i18n/purge_dead_orphans.cjs

# Apply: remove from ui_strings.js + all mirrored lang packs (63 pack files as of 2026-07-09; each backs up first)
node dev-tools/i18n/purge_dead_orphans.cjs --write
```

## 5. Translator handoff workflow

When new keys are added to source:

1. **Wrap the new string** in source with `t('behavior_lens.X') || 'English'`. Aim for a clear namespace (`consent.X`, `toast.X`, `ui.X`, `aria.X` are established).
2. **Run the extractor** with `--write` to add the new key to `ui_strings.js` automatically (uses the English fallback as the canonical English).
3. **Run the gap report** to regenerate per-language `missing` lists.
4. **Translate the delta** with `merge_missing_translations.cjs` (incremental, cheap) OR `dev-tools/build_language_pack.cjs --lang="<Language Name>"` (full rebuild, expensive — only when a pack is severely out of date).
5. **Re-run the gap report** to confirm `missingKeys` dropped to 0 for the updated pack.

## 6. Safety-string Spanglish guard — `check_safety_string_spanglish.cjs`

A blocking CI guard (added June 2026) that catches half-translated `alerts.*` /
`confirms.*` strings — native text with English words still embedded, which the
exact-match passthrough metric does not detect. Script-aware + cognate-safe
(non-Latin packs flag Latin residue; Latin-script packs use an English-only word
set so Romance cognates like "note" don't false-positive). Excludes `maay_maay`.

```bash
npm run verify:spanglish          # or: node dev-tools/i18n/check_safety_string_spanglish.cjs
```

Wired into `verify_all.cjs` and the `verify:gate` CI chain — a new half-translated
safety string blocks deploy.

## 7. Community translation corrections — `ingest_translation_feedback.cjs`

Applies multilingual-user correction suggestions submitted in-app
(`translation_feedback_module.js` → Cloudflare worker `/submitTranslation` →
`translations/pending/*.json`). Validates each (lang→slug map, key exists,
placeholder integrity, no new Spanglish, no-op rejection), then a **manual review
gate** before anything lands.

```bash
# Dry-run: validate pending corrections, write feedback_patches/<slug>.json
node dev-tools/i18n/ingest_translation_feedback.cjs

# Apply accepted corrections to lang/* and archive to translations/applied/
node dev-tools/i18n/ingest_translation_feedback.cjs --apply
```

## 8. Verification

Two scripts confirm the i18n chain is healthy:

```bash
# Repo-wide check: every t('X.Y') call in any module has a defined English string
node dev-tools/check_translation_keys.cjs

# Per-pack-format check: lang/*.js parses as valid JSON and matches the
# canonical namespace shape
node dev-tools/check_lang_json.cjs
```

`check_translation_keys.cjs` runs in `verify_all` (the pre-deploy gate) — any missing key blocks deploy.

## 9. Registry reconciliation for the full runtime

The shell catalog is not the only source of user-facing strings. These dry-run
by default and update both the canonical and deployed mirrors only with missing
leaves when `--apply` is supplied:

```bash
# Main UI/runtime keys identified by the manifest
node dev-tools/i18n/merge_main_ui_missing.cjs --apply

# Every literal STEM key used by stem_lab/*.js (AST-backed); also backfills
# missing leaves for already-registered STEM calls without replacing translations
node dev-tools/i18n/reconcile_stem_registry.cjs --apply

# Literal fallback keys in the host, modules, STEM, and SEL tools
node dev-tools/i18n/reconcile_literal_fallback_registry.cjs --apply

# Keep explicit renamed labels aligned across all packs
node dev-tools/i18n/sync_renamed_ui_labels.cjs --apply
```

`reconcile_literal_fallback_registry.cjs` has an explicit placeholder map for
fallbacks assembled from runtime values, so dynamic strings are registered as
translatable `{placeholder}` templates instead of losing their runtime detail.
The normal verification command runs the two reconciliation checks in dry-run
mode, and `node dev-tools/check_translation_keys.cjs --show-safe-fallbacks`
reports any fallback-only keys that still need registration.

## 10. Command-palette pack coverage

`check_cmd_i18n.cjs` checks the canonical `cmd.*` and `palette.*` manifest, but
it does not fill a newly added key. Use the reconciler to close that shape gap
without replacing existing translations:

```bash
# Report missing command/palette leaves; no files are changed
node dev-tools/i18n/reconcile_cmd_pack_coverage.cjs

# Add a reviewed catalog value where available, otherwise the canonical
# English fallback, to both root and deployed mirror packs
node dev-tools/i18n/reconcile_cmd_pack_coverage.cjs --apply
```

The report distinguishes out-of-band catalog translations from English
fallbacks. English fallback presence keeps the runtime safe and makes the
remaining translation work measurable; it is not counted as a reviewed
translation.

The quality pass has a separate guarded fixer for the eight residual English
tokens that were found in the BehaviorLens home-log description. It is dry-run
by default and only accepts the exact values listed in the script:

```bash
node dev-tools/i18n/fix_homelog_quality.cjs
node dev-tools/i18n/fix_homelog_quality.cjs --apply
```

`merge_cmd_catalog_translations.cjs` is a dry-run recovery check for reviewed
values in `cmd_translations/*.json` that might be masked by an English
passthrough in a pack. It only considers an exact English current value,
requires matching placeholder/tag tokens, and never overwrites an existing
non-English value:

```bash
node dev-tools/i18n/merge_cmd_catalog_translations.cjs --quiet
node dev-tools/i18n/merge_cmd_catalog_translations.cjs --lang=french --apply
```

`merge_cmd_ui_translations.cjs` performs the complementary recovery pass against
the main `ui_strings.js` catalog. For each command/palette value that is still
identical to English, it looks for exactly one placeholder-safe, non-English
value attached to an identical English UI leaf in the same pack. It updates both
pack mirrors only with those unique matches, never overwrites an existing
translation, and leaves ambiguous or context-sensitive fragments in the report:

```bash
node dev-tools/i18n/merge_cmd_ui_translations.cjs --quiet
node dev-tools/i18n/merge_cmd_ui_translations.cjs --apply
node dev-tools/i18n/merge_cmd_ui_translations.cjs --gate --quiet
```

The guarded `cmd.read_this_page_of` fragment is intentionally excluded because
its correct translation depends on the sentence that follows it. The report at
`dev-tools/i18n/cmd_ui_reuse/_summary.json` records the remaining identities and
the per-pack reuse decisions.

`audit_cmd_hand_sources.cjs` audits the reviewed command/palette hand batches
themselves. It checks every fixed-slot payload against the current English key
set and all 63 root packs, including placeholder parity, duplicate-source
conflicts, English hand values, and candidates that are ready to merge. It is
read-only; newer pack translations are reported as superseded rather than
overwritten:

```bash
node dev-tools/i18n/audit_cmd_hand_sources.cjs --quiet
node dev-tools/i18n/audit_cmd_hand_sources.cjs --gate --quiet
node dev-tools/i18n/audit_cmd_hand_sources.cjs --json
```

The report is written to
`dev-tools/i18n/cmd_hand_source_audit/_summary.json`. The translation and
all-verification chains run the gate automatically, so a newly added reviewed
hand batch cannot silently drift away from the packs.

`check_cmd_value_staleness.cjs` is the identity-value gate for the command
surface. It keeps the reviewed identity allowlist and `palette.ctx.*`
passthrough convention separate from actual translation debt. Its JSON worklist
also classifies every English identity as a catalog gap, catalog-English value,
placeholder-invalid candidate, or token-safe candidate ready for merge. A
present English fallback is valid shape coverage, but it remains a visible
translation backlog:

```bash
node dev-tools/i18n/check_cmd_value_staleness.cjs --quiet
node dev-tools/i18n/check_cmd_value_staleness.cjs --gate --quiet
```

The gate ratchets per-pack identity counts and fails if a catalog translation is
available but not merged, or if a candidate breaks the placeholder contract.
The checked-in baseline is refreshed only after an intentional command/palette
coverage change or a reviewed translation batch. `verify:translations` runs
this gate together with the complete runtime and catalog coverage gates.

## 11. Full catalog coverage and guided-tour namespace reuse

`audit_ui_pack_coverage.cjs` is a leaf audit of `ui_strings.js` against all 63
canonical packs. The complete catalog includes large content/simulation trees;
they now have explicit canonical-English fallback presence while native review
remains a separate quality concern. Use a namespace filter when checking one
runtime surface:

```bash
# Compact whole-catalog summary
node dev-tools/i18n/audit_ui_pack_coverage.cjs --quiet

# A runtime namespace can be made a hard coverage gate
node dev-tools/i18n/audit_ui_pack_coverage.cjs --namespace=tour --quiet --gate

# Inspect per-namespace missing/passthrough/translated totals
node dev-tools/i18n/audit_ui_pack_coverage.cjs --quiet --by-namespace
```

`reconcile_ui_pack_coverage.cjs` is the write companion for the complete
catalog. It adds only missing non-empty `ui_strings.js` leaves, never replaces
an existing value, preserves root/deployed mirror parity, and is dry-run by
default. The added English values are measurable fallbacks, not reviewed
translations:

```bash
# Report the catalog fallback backlog
node dev-tools/i18n/reconcile_ui_pack_coverage.cjs --quiet

# Close the complete catalog shape gap
node dev-tools/i18n/reconcile_ui_pack_coverage.cjs --all --apply

# Gate the complete catalog in CI
npm run verify:ui-pack-coverage
```

`verify:translations` includes this catalog gate after the narrower runtime,
STEM, literal-fallback, and command contracts.

When a new runtime key has an already reviewed equivalent under another
namespace, keep the reuse explicit and guarded. The guided-tour seed pass is
dry-run by default and writes both pack mirrors only with `--apply`:

```bash
node dev-tools/i18n/sync_tour_related_copy.cjs
node dev-tools/i18n/sync_tour_related_copy.cjs --apply
```

The four guided-tour keys seeded this way are also in the main-shell parity
contract, so a future pack edit cannot silently remove them.

For a broader runtime view, `audit_runtime_pack_coverage.cjs` reuses the
literal `t()` consumer scanner and reports missing, English-identical,
translated, and placeholder-safe values for both the source and deployed
mirror packs. Legacy STEM and simulation callers are included, so the complete
runtime surface can be gated after its pack shape is reconciled.

```bash
# Runtime-only summary, excluding dormant catalog leaves
node dev-tools/i18n/audit_runtime_pack_coverage.cjs --quiet

# Compare runtime debt by namespace
node dev-tools/i18n/audit_runtime_pack_coverage.cjs --quiet --by-namespace

# Gate one runtime namespace after its pack contract is complete
node dev-tools/i18n/audit_runtime_pack_coverage.cjs --namespace=tour --quiet --gate
```

## 12. Targeted runtime reconciliation

`reconcile_runtime_missing.cjs` is the write companion for the runtime audit.
It considers only literal `t('namespace.key')` leaves in an explicitly selected
namespace or key list, so it does not inflate sparse content catalogs. It is
dry-run by default.

```bash
# Inspect the active Guided Mode gaps
node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided

# Reuse a same-namespace value only when its English source is identical and
# the pack has one unambiguous translated candidate
node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided --reuse-exact --apply

# Explicitly close the remaining shape gap with canonical English fallbacks
# (these are measurable fallbacks, not reviewed translations)
node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided --fallback --apply
```

`--apply` requires `--reuse-exact` and/or `--fallback`, checks root/deployed
mirror parity first, preserves placeholders, and writes both mirrors atomically.
Use the read-only `audit_runtime_pack_coverage.cjs` afterward to confirm the
selected runtime surface.

The currently promoted runtime surfaces have a compact gate suitable for CI:

```bash
npm run verify:runtime-i18n
```

It checks Guided Mode, storage recovery, common labels, directions, voice
control, and math creation without treating the large legacy catalogs as fully
translated.

## 13. Broad runtime pack reconciliation

`reconcile_runtime_pack_coverage.cjs` closes the full literal-runtime pack
shape gap with canonical English fallbacks only. It never replaces a non-empty
value, and `--apply` requires an explicit scope. Use `--all` for the complete
runtime surface; use `--namespace=` for a smaller rollout:

```bash
# Report the full runtime fallback backlog
node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --quiet

# Add absent leaves to every parity-safe pack pair
node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --all --apply

# Merge absent leaves independently into one deliberately drifted pair,
# preserving unique content on each side
node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --all --lang=dari --merge-drift --apply

# Full root/mirror coverage gate
npm run verify:runtime-pack-coverage
```

`--skip-drift` is available for a staged rollout, but the coverage gate still
fails until skipped pairs are reconciled. These English values are explicit
fallbacks, not reviewed translations.

## 14. Placeholder and pack-shape repair

`repair_runtime_placeholders.cjs` fixes only reviewed legacy placeholder-loss
patterns (standalone `N` markers, the stale `{count}` token, and one exact
Hmong duplicate-token anomaly). The Hmong repair uses the canonical English
fallback because there is no reliable native correction in the repository;
other placeholder mismatches remain in the report for native/API review:

```bash
node dev-tools/i18n/repair_runtime_placeholders.cjs --skip-drift
node dev-tools/i18n/repair_runtime_placeholders.cjs --skip-drift --apply
```

`repair_pack_shape_anomalies.cjs` normalizes exact lossless character-map
anomalies (`stem.on`/`stem.off` and the reviewed `stem.volume_label` cases) and
checks the known Amharic mirror placeholder drift:

```bash
node dev-tools/i18n/repair_pack_shape_anomalies.cjs --quiet
node dev-tools/i18n/repair_pack_shape_anomalies.cjs --apply --quiet
```

## 15. Placeholder-alias repair

`sync_session_placeholder_label.cjs` handles one guarded alias in the header:
`common.session_default_placeholder` is the ARIA label for the same input whose
visible placeholder is `session.default_placeholder`. It updates the canonical
English value to `Default: {id}` and repairs only pack entries whose placeholder
signature is wrong, using that pack's existing session translation.

```bash
node dev-tools/i18n/sync_session_placeholder_label.cjs
node dev-tools/i18n/sync_session_placeholder_label.cjs --apply
```

## 16. Contract-focused audits and safe mirror repair

The coverage audits distinguish missing leaves, non-string values, English
passthroughs, translated values, placeholder mismatches, and root/deploy
mirror drift. Placeholder checks preserve multiplicity: repeated use of the
same placeholder is valid only when the source uses it the same number of
times:

```bash
node dev-tools/i18n/audit_ui_pack_coverage.cjs --quiet --json
node dev-tools/i18n/audit_runtime_pack_coverage.cjs --quiet --json
```

Behavior Lens toasts use named runtime parameters (`{n}`, `{name}`, and so on).
The normalizer changes only legacy `N`/`${value}` markers and refuses a pack
whose root and deploy mirror already differ:

```bash
node dev-tools/i18n/normalize_behavior_lens_placeholders.cjs
node dev-tools/i18n/normalize_behavior_lens_placeholders.cjs --apply
```

The PDF audit score already renders its total before the translated label, so
`pdf_audit.score.confirmed_issues` must not contain `{count}`. Its normalizer
also removes dangling classifiers left by an earlier token-only repair:

```bash
node dev-tools/i18n/normalize_pdf_audit_count_placeholder.cjs
node dev-tools/i18n/normalize_pdf_audit_count_placeholder.cjs --apply
```

When a pair has drifted, use the three-way reconciler. It copies a leaf across
only when the other side is unchanged from `HEAD` and stops on true conflicts:

```bash
node dev-tools/i18n/reconcile_lang_mirror_three_way.cjs --slug=dari
node dev-tools/i18n/reconcile_lang_mirror_three_way.cjs --slug=dari --apply
```

For a deliberate root/deployed drift, `merge_pack_mirror_drift.cjs` provides a
JSON-aware three-way diagnosis and refuses to write on conflicts:

```bash
node dev-tools/i18n/merge_pack_mirror_drift.cjs --lang=dari
node dev-tools/i18n/merge_pack_mirror_drift.cjs --lang=dari --apply
```

## Memory link

See `~/.claude/projects/.../memory/project_behavior_lens_golden_master.md` (4-pass audit history) and `project_lang_pack_phases_t_x.md` (history of large-scale pack rebuilds) for context.
