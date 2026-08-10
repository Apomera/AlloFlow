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

1. Refresh the June inventory so it covers all 140 registered tools.
2. Do render-scope extraction per tool with the codemod, one tool per commit,
   `node --check` plus render smoke each time. Note `calculus`, `algebraCAS` and
   `logicLab` share the `stem_graph_tools_golden` snapshots, which were already
   stale before this work — rebaseline those by hand, not with a blanket `-u`.
3. Treat static module-level strings as a separate, hand-reviewed pass, prose
   buckets before risky ones.
4. Translation itself stays a hand pass into `lang/<slug>.js`. It is not
   delegated and it is not part of extraction.

Related: `STEM_LAB_CATEGORY_AUDIT.md`.
