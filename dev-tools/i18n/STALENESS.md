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
| `check_staleness_delta.cjs` | point-of-edit check: which packs the English edit you are *committing right now* strands (see below) |

## Workflow

```bash
# 1. One-time: establish the baseline (asserts "all current translations are correct as of now").
npm run i18n:bless           # refuses to clobber an existing baseline

# 2. Anytime you want to know which packs need editing after English changed:
npm run verify:stale         # report; writes lang_staleness/<lang>.json + _summary.json
#   add --gate to make it exit 1 (for CI), --quiet for a one-line summary

# 3. Re-translate the flagged keys (the companion to merge_missing_translations.cjs;
#    REPLACES stale translations rather than filling blanks). Dry-run by default:
npm run i18n:merge-stale                        # preview: what would change, in which packs
GEMINI_API_KEY=... npm run i18n:merge-stale -- --apply   # actually write (with *.bak.stale backups)
#    Native-review-hold packs (lingala, acholi, marshallese, chin_falam/hakha, karen) are
#    SKIPPED by default and reported for a human; --include-held overrides. A placeholder
#    guard refuses any translation that drops/adds a ${slot}.

# 4. After review, clear the keys you re-translated (per-key, so unrelated flags and
#    other packs' state are untouched). merge-stale --bless auto-clears keys that end
#    up stale in zero packs; otherwise do it explicitly:
node dev-tools/i18n/bless_lang_sources.cjs --key common.foo --key alerts.bar
```

`merge_stale_translations.cjs` deliberately defaults to a dry run and never auto-blesses
(replacing a stale string with fresh AI output doesn't prove it's correct) — re-blessing
stays a deliberate act after review.

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
- **Non-string keys:** the detector flags array/object-valued keys too (e.g. the 3 in
  `ui_strings.js`: `codenames.adjectives`, `codenames.animals`, `about.features_list.items`),
  but `merge_stale` will NOT machine-translate them — feeding structured data to a
  string-translation prompt would mangle it. It skips them and lists them for manual handling.
- **Not wired into `verify:gate`** by default: a hard staleness gate would block every
  deploy the moment any English string is reworded until it's re-translated/re-blessed.
  That's a deliberate policy call — to opt in, append to the `verify:gate` chain in
  `package.json`: `&& node dev-tools/i18n/check_lang_staleness.cjs --gate --quiet`.

## Point-of-edit detection (`check_staleness_delta.cjs`)

`check_lang_staleness.cjs` is *cumulative*: it answers "what is stale right now, in
total?" against the blessed baseline. That is the correct accounting, but it fires at
`verify:gate` — by which time the English edit that caused the drift is several commits
back, and the symptom reaches you as a "localization regression" report instead.

`check_staleness_delta.cjs` answers the same question at the moment it is cheapest to
answer: **the English strings I am about to commit — which packs do they make stale?**
It diffs `ui_strings.js` + `help_strings.js` between a git ref and the version being
committed, and for each key whose *wording* moved it lists the packs that already hold a
real (non-passthrough) translation. Pure additions are counted but not flagged — those
are gap-report territory.

```bash
npm run verify:stale-delta                                    # staged (index) vs HEAD
npm run i18n:delta                                            # working tree vs HEAD
node dev-tools/i18n/check_staleness_delta.cjs --base <ref> --worktree   # since any ref
node dev-tools/i18n/check_staleness_delta.cjs --gate          # exit 1 on ANY stranding reword
```

Exit policy matches the cumulative gate: a reword in a **GUARDED** namespace (the same
list `check_lang_staleness.cjs` hard-gates on) always exits 1, because there a stale pack
value *overrides* the rename on a visible surface. Everything else reports and exits 0
unless `--gate`.

It is installed in `.git/hooks/pre-commit` (step 4). Cost is ~1.5s when the English
sources are untouched — the 62 packs are only loaded once a reword is actually found.

Output `lang_staleness/_delta.json` uses the same `{ key: { english, packs } }` shape the
`merge_*` tools consume, so a re-translation pass can read the worklist directly.

Coverage: `tests/i18n_cli_tools.test.js`, calibrated against a known-bad range of real
history (the Nano Banana → Image Editor rename) so a silently-blind "0 findings" fails.

## Hand-translation workflow (`apply_stale_hand_fix.cjs`)

AlloFlow's standing policy is hand-translated packs, so the translation itself is
authored by hand and `apply_stale_hand_fix.cjs` is only the guarded write path for it:
key parity against the English, placeholder/tag parity, a passthrough refusal, and an
array mode whose shape is checked against the *pack's* own array (packs legitimately
hold fewer entries than the English). It writes `lang/` and the
`desktop/web-app/public/lang/` mirror together, with `*.bak.<stamp>` backups.

`splice_tour_section.cjs` handles the long `tour.*` markdown bodies, where a reword
usually touches one span. It replaces the Pro Tip paragraph (and optionally the bullet
above the Pro Tip heading) in place, and refuses any pack whose markdown skeleton does
not match rather than guessing.

**Two rules, both learned the hard way:**

1. **Never pipe an `--apply` run through `head`/`tail`.** The truncated pipe sends
   SIGPIPE and the writes silently do not land, while the summary line still reads
   "WRITTEN". Redirect to a file instead.
2. **Re-run the payload in dry run after applying**, and require
   `0 to write, N already correct`. Anything else means the write did not land -
   and blessing a key whose packs never changed is worse than not fixing it, because
   the baseline then certifies stale text as current.

## Triaging a backlog (`classify_stale_drift.cjs`)

Not every English edit invalidates a translation. The 2026-08-16 style pass stripped em
dashes from the English (`outcomes—a spell` → `outcomes. A spell`), which changed the hash
of hundreds of keys without changing what a single one of them MEANS. Re-translating
those in 62 languages would spend enormous effort reproducing the same sentences, and
every unnecessary hand-edit is a chance to damage a good translation.

`classify_stale_drift.cjs` splits the backlog into **PUNCTUATION** / **TRIVIAL** (the
existing translation is still accurate → bless) and **SEMANTIC** (words moved → must be
re-translated). It is deliberately conservative: a removed or added word is SEMANTIC even
when it looks like tidying.

```bash
node dev-tools/i18n/classify_stale_drift.cjs --search 90 --json cls.json   # resolve per key
node dev-tools/i18n/classify_stale_drift.cjs --base <rev> --prefix help_mode.
node dev-tools/i18n/bless_lang_sources.cjs --keys-file cosmetic.json
```

**The guard that makes it trustworthy:** the baseline stores hashes only, so the old
English has to be recovered from git. `--search` resolves, *per key*, the newest revision
whose hash matches the baseline; anything it cannot resolve is reported as **WRONG-BASE**
and left unclassified. Without that check, pointing the tool at a revision where
before == after classifies every key as cosmetic and looks like a clean result — the
first run of this tool did exactly that, reporting 60/60 keys cosmetic, all of them wrong.

**Never bless on the classifier alone.** Cross-check with an independent method before
blessing: extract the sequence of word tokens (`/[\p{L}\p{N}]+/gu`, case-folded) from the
blessed English and from the current English and require the sequences to be identical.
Two routes, one answer. On 2026-08-23 that confirmed 296/296 keys, and the calibration
probe (a real reword must NOT read as cosmetic) proved the check could fail.

Coverage: `tests/i18n_cli_tools.test.js` pins both properties — that a wrong base is
refused rather than classified, and that the tokeniser can tell a real reword apart.
