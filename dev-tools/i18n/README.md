# Behavior Lens i18n Tooling

Two scripts that keep `behavior_lens_module.js` translatable end-to-end:

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

**Cost estimate:** ~46 new keys × 56 langs × ~50 output tokens ≈ 130K output tokens. Single-digit USD on `gemini-3-flash-preview`.

## 4. `verify_orphans_full_repo.cjs` + `purge_dead_orphans.cjs`

The extractor's "orphan" list (keys defined in `ui_strings.js` but never referenced from `behavior_lens_module.js`) is a starting point, not a verdict — many keys are referenced from `src/App.jsx`, `teacher_module.js`, or via dynamic key construction (`t(item.tKey)`) and must be kept.

```bash
# Cross-check every orphan against the FULL repo (1226 files / 159 MB)
node dev-tools/i18n/verify_orphans_full_repo.cjs
# → orphan_verified_dead.json + orphan_verified_kept.json

# Dry-run preview
node dev-tools/i18n/purge_dead_orphans.cjs

# Apply: remove from ui_strings.js + all 56 lang packs (each backs up first)
node dev-tools/i18n/purge_dead_orphans.cjs --write
```

## 5. Translator handoff workflow

When new keys are added to source:

1. **Wrap the new string** in source with `t('behavior_lens.X') || 'English'`. Aim for a clear namespace (`consent.X`, `toast.X`, `ui.X`, `aria.X` are established).
2. **Run the extractor** with `--write` to add the new key to `ui_strings.js` automatically (uses the English fallback as the canonical English).
3. **Run the gap report** to regenerate per-language `missing` lists.
4. **Translate the delta** with `merge_missing_translations.cjs` (incremental, cheap) OR `dev-tools/build_language_pack.cjs --lang="<Language Name>"` (full rebuild, expensive — only when a pack is severely out of date).
5. **Re-run the gap report** to confirm `missingKeys` dropped to 0 for the updated pack.

## 4. Verification

Two scripts confirm the i18n chain is healthy:

```bash
# Repo-wide check: every t('X.Y') call in any module has a defined English string
node dev-tools/check_translation_keys.cjs

# Per-pack-format check: lang/*.js parses as valid JSON and matches the
# canonical namespace shape
node dev-tools/check_lang_json.cjs
```

`check_translation_keys.cjs` runs in `verify_all` (the pre-deploy gate) — any missing key blocks deploy.

## Memory link

See `~/.claude/projects/.../memory/project_behavior_lens_golden_master.md` (4-pass audit history) and `project_lang_pack_phases_t_x.md` (history of large-scale pack rebuilds) for context.
