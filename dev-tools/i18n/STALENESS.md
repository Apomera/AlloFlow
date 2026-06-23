# Translation staleness detection

The gap reports (`lang_pack_gap_report.cjs`, `help_mode_gap_report.cjs`) tell you which
keys are **missing** or still **English passthrough** in each pack. They are blind to one
failure mode: a key that *is* present and *does* have a real translation, but whose
**English source was reworded after that translation was made**. The translation still
looks done, yet now describes the old wording — and nothing flags it until the next full
re-translation wave or a user complaint.

This tooling closes that gap with a committed **English baseline snapshot**.

## Files

| File | Role |
|------|------|
| `lang_src_lib.cjs` | shared loaders (canonical English from `ui_strings.js` + `help_strings.js`, hashing, pack flatten) |
| `bless_lang_sources.cjs` | writes/updates `lang_source_baseline.json` — the English each translation is "current against" |
| `check_lang_staleness.cjs` | flags packs whose translations predate a reworded English string |
| `lang_source_baseline.json` | **committed** snapshot: `{ "<key>": "<englishHash>" }` |
| `lang_staleness/<lang>.json` | per-pack stale report (gitignored — regenerated on demand) |

## Workflow

```bash
# 1. One-time: establish the baseline (asserts "all current translations are correct as of now").
npm run i18n:bless           # refuses to clobber an existing baseline

# 2. Anytime you want to know which packs need editing after English changed:
npm run verify:stale         # report; writes lang_staleness/<lang>.json + _summary.json
#   add --gate to make it exit 1 (for CI), --quiet for a one-line summary

# 3. After you re-translate the flagged keys, clear just those (per-key, so unrelated
#    flags and other packs' state are untouched):
node dev-tools/i18n/bless_lang_sources.cjs --key common.foo --key alerts.bar
```

`_summary.json.changedKeys` is the list of English strings that moved since baseline;
each `lang_staleness/<lang>.json` has a `stale: { key: currentEnglish }` block in the
same shape the `merge_*_missing` tools consume, so a re-translation pass can read it directly.

## Notes / limits

- **Baseline assumption:** the first bless treats all *existing* translations as correct.
  It catches all *future* drift (the actual concern); it can't retroactively detect
  translations that were already stale before the baseline existed.
- **Granularity:** the baseline is per-key (one English hash), not per-(key, language).
  Re-blessing a key with `--key` asserts it's current in every pack — appropriate because
  the `merge_*_missing` flow re-translates a key across all packs in one run. If you
  re-translate a key in only *some* packs (e.g. while native-review holds lag), re-bless
  it only after the lagging packs are caught up, or the held packs will read as current.
- **Not wired into `verify:gate`** by default: a hard staleness gate would block every
  deploy the moment any English string is reworded until it's re-translated/re-blessed.
  That's a deliberate policy call — to opt in, append to the `verify:gate` chain in
  `package.json`: `&& node dev-tools/i18n/check_lang_staleness.cjs --gate --quiet`.
