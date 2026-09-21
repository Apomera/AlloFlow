# STEM screen-reader translation gap — scope

**Date:** 2026-09-20
**Status:** Scope + three changes landed — a ratchet gate (`check_hardcoded_aria_text.cjs`) and
translator fixes for Renewables and Circuit, the two worst offenders (377 strings, now 0). The 63 `lang/*.js` packs are unchanged by THIS document; the separate
migration fact corrections did touch 28 of them (see the staleness section).
**Reproduce:** `node dev-tools/stem_i18n_a11y_coverage.cjs french arabic` (add `I18N_LIST=1` for the per-tool table).

---

## The problem

A STEM tool calls `__alloT('some.key', 'English fallback')`. When the key is missing from a
language pack the call returns the fallback, so the page still renders correctly and no gate
fires — but that string is permanently English and no translator is ever shown it.

This failure mode is **invisible by construction**, and it has landed almost entirely on the
accessibility layer. Visible copy is well translated; screen-reader copy is not.

| Key class | Asked for | Absent from French pack | Untranslated |
|---|---|---|---|
| Accessibility (`sr_` / `a11y_`) | 4,426 | 4,271 | **96%** |
| Everything else | 51,283 | 5,771 | 11% |

Arabic is the same shape (4,263 of 4,426 absent). The result: a French or Arabic student sees
a fully localized tool, while a French or Arabic student **using a screen reader hears English**.
This fails precisely the users the accessibility layer exists for.

The paired per-tool numbers make it concrete:

| Tool | Visible strings missing | Screen-reader strings missing |
|---|---|---|
| raptorhunt | 7 / 1548 | **225 / 227** |
| birdlab | 3 / 1724 | **109 / 113** |
| beehive | 4 / 707 | **132 / 136** |
| magnetism | 2 / 3 | **288 / 290** |

---

## Scale

- **4,426** distinct `sr_`/`a11y_` keys across **89** STEM tools
- **63** language packs
- **269,850** untranslated (key × pack) pairs
- **45** tools have *no* accessibility string translated in French
- Every pack has some a11y coverage, but barely: the best (`spanish_latin_america`) has 168 of 4,426

## Why this is more tractable than 269,850 suggests

The keys are heavily concentrated. Translating the top tools covers most of the surface:

| Tools translated | a11y keys covered | Share |
|---|---|---|
| 10 | 1,865 | 42% |
| **14** | **2,299** | **52%** |
| 20 | 2,866 | 65% |
| 30 | 3,511 | 79% |
| 40 | 3,901 | 88% |

**The top 14 tools hold half of every accessibility string in the STEM suite.**

| Tool | a11y keys | Missing (French) |
|---|---|---|
| magnetism | 290 | 288 |
| artstudio | 282 | 279 |
| raptorhunt | 227 | 225 |
| spacestation | 211 | 211 |
| optics | 167 | 167 |
| autorepair | 164 | 161 |
| evolab | 144 | 143 |
| beehive | 136 | 132 |
| dissection | 126 | 126 |
| geometryworld | 118 | 117 |
| birdlab | 113 | 109 |
| gisstudio | 111 | 111 |
| lifeskills | 105 | 105 |
| companionplanting | 105 | 104 |

---

## A second gap the gates cannot see

62 tools register **zero** `sr_`/`a11y_` keys. That is not an absence of accessibility text —
it is a different convention, and part of it bypasses i18n completely.

Two distinct sub-cases, which matter differently:

1. **Derived labels (mostly fine).** Many `aria-label`s are composed from already-translated
   visible strings (`option.label`, `visibleLabel`). These inherit translation and need no key.

2. **Hardcoded English literals (a real gap).** Other `aria-label`s are plain English strings
   that never pass through `__alloT`, so they are invisible to *every* i18n gate — including
   the coverage tool used for this report. The true gap is therefore **larger** than 4,426.

Worst offenders by count of hardcoded English `aria-label` literals:

| Tool | Hardcoded aria-labels |
|---|---|
| ~~renewables~~ | ~~212~~ → **0** (fixed) |
| ~~circuit~~ | ~~165~~ → **0** (fixed) |
| particlelab3d | 73 (next) |
| geometryworld_builder | 70 |
| semiconductor | 65 |
| learning_lab | 49 |
| autorepair | 43 |

Samples: `'Interactive energy pathway'`, `'Energy balance graphic'` (renewables);
`'Oscilloscope time window'`, `'Scrollable oscilloscope chart'` (circuit).

### This gap is actively growing

The uncommitted work in progress on `stem_tool_renewables.js` **adds 8 new hardcoded English
`aria-label`s**, e.g. `'One-input comparison checks'`, `'Scenario comparison window results'`.
New accessibility text is still being written in a form no translator will ever see.

**This is the cheapest thing to fix and the only part that is getting worse.** A gate that fails
on a hardcoded `aria-label` literal would stop the bleeding regardless of what is decided about
the 269,850-pair backlog.

---

## Gate added: `check_hardcoded_aria_text.cjs` (2026-09-20)

The growth is now blocked. `dev-tools/check_hardcoded_aria_text.cjs` is a **ratchet** on
accessibility text written as bare English literals — text with no key, which therefore
reaches no translator and no i18n gate.

AST-based (acorn), same approach and file scope as its sibling `check_aria_handler.cjs`,
because a regex cannot tell `'aria-label': 'Save'` from a comment mentioning aria-label.
Run it with `npm run verify:hardcoded-aria`.

**Wired into `verify:gate`** and available as `npm run verify:hardcoded-aria`. This was held back
until the Renewables blocker below was fixed, because the baseline records that file’s post-fix
count — so the gate and that fix must land in the same change.

**Real scope is larger than first reported.** The earlier regex estimate looked only at STEM
tools. The AST scan across all `*_module.js` + `stem_lab/` + `sel_hub/`:

| | |
|---|---|
| Hardcoded spoken strings | **4,987** (at HEAD) |
| Files affected | 219 |
| Worst | behavior_lens_module.js 681, symbol_studio_module.js 275, allohaven_module.js 221 |

That is larger than the 4,426 *registered* a11y keys — so the true translation gap is roughly
double what the coverage tool can see.

**Baselined from HEAD, not the dirty tree.** Deliberate: baselining the working tree would have
baked the in-flight additions in as "already fine" and the gate could never catch them. It did
immediately catch them — `stem_lab/stem_tool_renewables.js 187 → 193 (+6)` — which is what
prompted the structural fix below. The baseline now stands at **4,638** after the Renewables and Circuit fixes.

**Behaviour:** counts may only go down. `--update` re-baselines downward and *refuses* an
increase (exit 1) unless `--allow-increase` is passed. `--list <file>` shows the offending
lines. Verified end to end on a fixture: detects bare literals, ignores `__alloT`-wrapped
values, URLs, slugs and short tokens; fails on a new label; passes once it is wrapped.

### Fixed: the renewables component family now has a translator (2026-09-20)

The +6 could not simply be wrapped. `__alloT` was defined only inside functions spanning lines
4123-4254 and 4671-8862; the labels sit at ~3197-3232 with their call site at 3515 — none
inside either scope, so wrapping them would have raised a ReferenceError. The cause was
structural: all **16** `RenewablesEnergy*` components were module-scope siblings with **zero**
translation calls, even though the file as a whole calls `__alloT` 653 times.

**The fix** follows the precedent already in this file (`RenewablesLandscape`, line ~4122),
which solved the same problem with a `props.t`-based resolver rather than reaching for a
module-level `ctx` — the latter is a free variable and `check_free_vars` blocks it.

1. `RenewablesEnergyLab` is the family root and the only one handed `ctx`. It now derives
   `rnT` from `props.ctx.t` once.
2. All 16 child call sites receive `t` beside the `React` they already got — 10 as `t:rnT`
   inside the Lab, 6 as `t:props.t` where the call site is inside another component and `rnT`
   is out of scope. Verified by AST that every reference resolves.
3. A shared `rnEnergyT(props)` helper resolves the translator, keeping the English fallback as
   the contract; each component declares `var __alloT=rnEnergyT(props);`.
4. 89 hardcoded spoken strings converted to `__alloT('stem.renewables.<key>', 'English')`,
   fallbacks preserved **verbatim** so behaviour is unchanged, and single-quoted because the
   drift gate's extractor only matches `'...'`.
5. All 89 keys registered in `ui_strings.js` via `register_ui_strings.cjs` — a key that never
   lands there is never translated, however correctly its call site is wrapped.

| | Before | After |
|---|---|---|
| Hardcoded strings in the file | 193 | **0** |
| Translatable keys the coverage gate sees | 701 | **893** |
| Components with a translator | 0 / 26 | **26 / 26** |

**Verified:** 636 renewables tests pass (28 files); `check_stem_render` clean across 152 tools;
`check_free_vars`, `check_aria_handler` and `check_ui_strings_drift` all green; a harness proves
the translator threads through *and* degrades to English when absent, throwing, or returning null.

**Second pass (same day)** extended the identical pattern to the rest of the file:
`RenewablesMicrogridLab` and `RenewablesTransition` are two further roots handed `ctx`, and
8 descendants hang off them (deepest chain: MicrogridLab → GridStudy → GridPair → GridPeriods,
where the last two forward `props.t` because `rnT` is out of scope). 104 more strings converted,
105 more keys registered.

**stem_tool_renewables.js now has ZERO hardcoded accessibility strings** — it dropped out of the
gate’s file list entirely (219 → 218 files). Baseline ratcheted 4,987 → **4,800**.

A harness executes the real resolver through three hops and confirms `t` survives root →
GridStudy → GridPair → GridPeriods, and still degrades to English when the translator is absent,
throwing, or returns null.

### Fixed: Circuit, the second-worst offender (2026-09-20)

Same shape, same fix. `stem_tool_circuit.js` had **one** `__alloT`, declared inside `render()`
(lines 3772-8356), while 154 hardcoded strings sat in `Circuit*` components declared *above* it
(lines 209-3092) with no translator in scope.

The audit that made this cheap: of 162 hardcoded strings, **8** already had `__alloT` in scope,
**154** were in functions taking `props`, and **0** needed genuinely new plumbing.

Three workbench roots (`CircuitNetworkWorkbench`, `CircuitActiveWorkbench`,
`CircuitMixedWorkbench`) are each handed `ctx` at line 6002, so each derives `cktT` from it. 68
call sites now pass `t` — 27 as `cktT`, 41 forwarding `props.t` — and 46 components resolve it
through a `circuitToolT(props)` helper. The 8 inside `render()` were wrapped with the `__alloT`
already there.

| | Before | After |
|---|---|---|
| Hardcoded strings | 162 | **0** |
| Translatable keys | 273 | **436** |
| Components with a translator | 0 / 46 | **46 / 46** |

One wrinkle worth recording: two components are rendered through a conditional,
`h(orbit ? CircuitNetworkOrbitBoard : CircuitNetworkDiagram, {…})`. A mapper that only matches
a plain identifier reports them as having *no call site* and silently skips them; the patcher
handles `ConditionalExpression` arguments so both branches get `t`.

**Verified:** 854 circuit tests pass (53 files); `check_stem_render` clean across 152 tools;
`check_free_vars` and `check_ui_strings_drift` green; 163 keys registered. A harness confirms
`t` survives three hops and still falls back to English when the translator is absent, throwing,
or returns null.

### Note on the baseline after these fixes

`--update` was **not** used to re-baseline. It would have absorbed an unrelated +1 regression in
`report_writer_module.js` that another session introduced while this work was in progress.
Instead the two fixed files were removed from the baseline by hand (4,800 → **4,638**), leaving
`report_writer_module.js` at 99 so the gate still reports that regression to whoever owns it.

## Recommended order

1. ~~Add a gate for hardcoded `aria-label` literals.~~ **Done** — see above. Growth is blocked.
2. ~~Give the `RenewablesEnergy*` components a translator.~~ **Done** — 16/16 now translate;
   the gate is green and is wired into `verify:gate`.
3. **Decide the translation policy for the backlog.** 269,850 pairs is not hand-writable. The
   existing pipeline (`dev-tools/i18n/`) can machine-fill it, but the main UI parity gate already
   carries a baselined backlog noted as *"needs native speakers, not code"* — so machine output
   in the screen-reader layer is a judgment call, not a default.
4. **If translating, go tool-first, not pack-first.** The top 14 tools reach 50% coverage; the
   top 30 reach 79%. The 34 packs still stale on the migration fact corrections (374 entries)
   are the concrete next batch.
5. **Chip at the remaining 4,638 hardcoded strings** whenever a file is open for other reasons. The
   ratchet means every removal is permanent; `--update` locks in the lower number.

---

## Related: the same failure one layer deeper (found 2026-09-20)

Correcting the English is not enough. The 63 language packs **override** both the source
fallback and `ui_strings.js`, so a fact fixed in English still ships wrong in every other
language until the packs are re-translated.

Concretely, after the migration fact corrections landed, the French pack still read:

> "Comment un colibri (**4 g**, traversée de **1 500 km** du golfe du Mexique)…"

— the figures that were just corrected to 3 g and ~800 km. All 63 packs carried the
debunked 29,000 ft goose claim; 56 of them in real translation, 7 as English passthrough.

`dev-tools/i18n/check_lang_staleness.cjs` exists for exactly this and now records it:

| | Stale translations |
|---|---|
| From the 17 English fact/copy corrections | **1,178** across 62 packs |
| Pre-existing (other uncommitted in-flight work in this tree) | 7,303 |
| Total currently reported | 8,481 |

At HEAD the backlog was genuinely zero (last watermark commit: *"staleness backlog reaches
zero"*), so the 7,303 belong to other work in progress in this shared tree, not to `main`.

**Worklists written** (gitignored, regenerable): `dev-tools/i18n/lang_staleness/<lang>.json`,
e.g. French lists 139 stale keys, 11 of them from these corrections.

**Deliberately NOT done:** `bless_lang_sources.cjs` was not run. Blessing is global per key —
it would clear the flag for all 63 packs at once, including the 34 nobody has translated.
`lang_source_baseline.json` and `lang_staleness_watermark.json` remain untouched.

### Hand-translated: 28 of 62 packs (2026-09-20)

The 11 stranded keys were hand-translated into 28 languages and recorded per-pack with
`record_pack_translation_review.cjs --reason=hand-translated-2026-09-20-fact-correction`,
following the repo's existing practice (`git log --grep="hand-translate"`).

| | |
|---|---|
| Languages translated | 28 of 62 |
| Values written | 616 (28 langs × 11 keys × 2 mirrors) |
| Ledger entries recorded | 308 (28 × 11) |
| Remaining for native speakers | 34 packs × 11 keys = 374 |

Translated: French (+ Canadian), German, Dutch, Spanish (LatAm + Castilian), Portuguese
(Brazil, Portugal, Angola), Italian, Romanian, Polish, Russian, Ukrainian, Greek, Esperanto,
Latin, Japanese, Korean, Chinese (Simplified + Traditional), Vietnamese, Indonesian, Turkish,
Tagalog, Hebrew, Arabic, Hindi.

Conventions followed from the existing packs: imperial units kept (ft / pieds / Fuß, mph, °F),
locale number separators (French `29 000`, German `29.000`), English bird species names,
and each pack's existing dash style.

**The last 12 of those (Japanese onward) are marked for native review** — the register is
technical (induced drag, span loading, dopant density) and confidence is lower there than in
the Romance/Germanic/Slavic set. The ledger's `reviewReason` makes them greppable.

**Not attempted**, and left flagged stale for native speakers: the 34 remaining packs,
including the native-review-hold set (Acholi, Chin Falam/Hakha, Karen, Marshallese, Lingala)
plus Amharic, Bengali, Burmese, Dari, Farsi, Gujarati, Haitian Creole, Hausa, Hmong, Igbo,
Kannada, Khmer, Kinyarwanda, Kirundi, Lao, Malayalam, Marathi, Nepali, Pashto, Punjabi,
Somali, Swahili, Tamil, Telugu, Thai, Tigrinya, Urdu, Yoruba. Producing confident scientific
prose in these is beyond what can be verified here, and `2f18a8c68` ("repair 264 German
strings mangled by the old substring substitution") is the record of what shipping unverified
output into a pack costs.

**Consequence to expect:** `check_lang_staleness --ratchet` still fails against the committed
watermark of 0 — both for the 374 entries left here and for the ~7,300 from other in-flight
work. The watermark says *"Do not raise by hand — re-translate or bless instead."*

**The general lesson:** an English-only fix to a fact is incomplete by construction. Any
correction to a translated string strands N packs, and the strand count belongs in the same
change description as the fix.

## Caveats

- Per-tool figures are measured against **French** as the representative pack; Arabic differs by
  only ~8 keys in total, so the ranking holds, but other packs were not individually ranked.
- The `sr_`/`a11y_` convention is what the gate counts. Hardcoded `aria-label`s are excluded
  from the 4,426, so treat that number as a **floor**.
- Hardcoded-label counts come from a literal-matching heuristic
  (`'aria-label':\s*'[A-Z]...'`) and may include a small number of non-user-facing strings.
