# STEM Lab i18n — measured scope, 2026-08-09

Scope survey only. **No strings were wrapped and nothing was translated.** This
exists so the localization work can be sequenced against real numbers instead of
a guess, and so the two ways of measuring it stop disagreeing.

## Correction to the first pass

An initial sweep counted `__alloT(` and `ctx.t(` per tool and reported 14 large
tools with "zero localization". That regex was wrong: most tools alias the
helper (`var t = ctx.t;`) and then call `t('stem.…', 'English')`, which the
pattern never matched.

Counting any call of the form `<ident>('stem.…')` instead:

| tool | keyed calls | verdict |
| --- | ---: | --- |
| `evoLab` | 923 | fully localized, first pass was wrong |
| `dna` | 698 | fully localized, first pass was wrong |
| `gisStudio` | 81 | partly localized |

So the unlocalized set is **11 tools, not 14**: `aquaculture`, `fisherLab`,
`weatherSystems`, `petsLab`, `coasterLab`, `universe`, `nuclearLab`,
`cellAtlas`, `particleLab3d`, `consciousness`, `calculus`.

Use `<ident>\('stem\.` to measure localization coverage. Do not grep for
`ctx.t(` or `__alloT(`, and per the existing note on `ui_strings.js`, do not try
to prove coverage by grepping dotted keys — that file is nested JSON.

## Two different problems, very different costs

`dev-tools/stem_extract_tool.cjs` wraps **render-scope** literals in
`t('stem.<tool>.<key>', '<English>')`. It only touches strings inside `render(ctx)`
after `var t = ctx.t`, because that is where `t` is in scope. That part is
mechanical and gated by `node --check`.

**Static module-level** strings are the hard half. They live in arrays and config
objects evaluated at load time, before `t` exists, so they cannot simply be
wrapped — they need restructuring by hand. Current count from
`node dev-tools/stem_static_tally.cjs` (read-only) across all 137 tool files:

| bucket | count |
| --- | ---: |
| **total unwrapped static strings** | **38,648** |
| risky (`label` / `name` / `title` / `id` keys — may be used as logic keys) | 16,798 |
| prose (`desc` / `fact` / `explanation` etc — usually display-safe) | 21,850 |

Worst offenders: `assessmentliteracy` 5,638 · `optics` 4,005 · `aquaculture`
3,136 · `nutritionlab` 2,158 · `learning_lab` 1,834 · `fisherlab` 1,603 ·
`aquarium` 1,504 · `raptorhunt` 1,435 · `applab` 1,206 · `pets` 1,160.

The `risky` column is the one to respect: wrapping a string that is also used as
a lookup key changes behaviour, it does not just change display.

## What was already done in June (context this survey initially missed)

Render-scope extraction is **not** greenfield. A June pass ran the codemod across
all 104 tools that had render-scope strings and injected **48,513**
`stem.<tool>.*` keys into `ui_strings.js`, verified by a 108/108 render-throw
smoke. A follow-up static pass added 636 more keys and concluded that ~636 of
~35K static strings is the safe automatable ceiling; the rest needs per-tool
hand work or stays on English fallback.

That reframes the 11 tools above into two groups:

- **All-static, 0 render-scope, so the codemod had nothing to wrap:**
  `aquaculture`, `fisherLab`, `petsLab` (plus `cellular`). Known and deferred
  since June.
- **Added after the June inventory, never extracted at all:**
  `weatherSystems`, `coasterLab`, `nuclearLab`, `cellAtlas`, `particleLab3d`,
  `consciousness`, and `universe`/`calculus` at the margins. These are the
  genuinely new gap, and they are the reason a catalog-wide gate matters: nothing
  currently stops a new tool from shipping unlocalized.

It also means the **largest remaining value is translation, not extraction** —
48,513 English keys exist and still need to reach the 60 packs.

### Landmine before wrapping anything else

The real `ctx.t` is **single-argument**: it ignores a fallback second arg. The
`var __alloT = ctx.t || function(k, fb){…}` idiom therefore makes `__alloT ===
ctx.t` and the fallback branch dead code, so any key missing from the pack
renders the literal string `"undefined"`. The smoke and golden harnesses do
**not** catch this, because their stub `t(key, fb)` returns `fb`. Use the
wrapper form that applies the fallback itself.

## State of the existing tooling

- `dev-tools/stem_i18n_report/` holds a per-tool extraction from June covering
  **108** tools (`summary.csv`, `inventory.json`, `ui_strings_stem_<tool>.json`).
  Six of the 11 unlocalized tools are **absent** from it — `weathersystems`,
  `coasterlab`, `nuclearlab`, `cellatlas`, `particlelab3d`, `consciousness` —
  so that inventory needs a refresh before it is used for planning.
- `dev-tools/stem_static_tally.cjs` is read-only and current. It exits non-zero
  while work remains, so do not wire it into a gate as-is.
- `dev-tools/stem_static_batch.cjs` and `stem_extract_tool.cjs` **write**.
- `dev-tools/verify_stem_namespace.cjs` is per-tool (`--tool=<slug>`), not a
  catalog-wide gate. There is no catalog-wide i18n gate today, so a newly added
  tool can ship unlocalized without anything complaining.

## Suggested sequencing

1. Refresh the June inventory so it covers all 140 registered tools (it is at
   108 today).
2. Extract the post-June tools that were never processed — `weatherSystems`,
   `coasterLab`, `nuclearLab`, `cellAtlas`, `particleLab3d`, `consciousness` —
   one tool per commit, `node --check` plus render smoke each time. Note
   `calculus`, `algebraCAS` and `logicLab` share the `stem_graph_tools_golden`
   snapshots, which were already stale before this work; rebaseline those by
   hand, not with a blanket `-u`.
3. Add a catalog-wide i18n gate so this cannot silently regress again. That is
   the cheapest item here and the reason the post-June tools slipped.
4. Translation of the existing 48,513 keys into the packs is the largest
   remaining value, ahead of squeezing more static strings.
5. Treat the residual static module-level strings as a separate hand-reviewed
   pass, prose buckets before risky ones, accepting the ~636-key automatable
   ceiling found in June.

Related: `STEM_LAB_CATEGORY_AUDIT.md`.
