# Lane W1 — i18n completion: cmd manifest, help strings, pack propagation

**Lane:** W1 (wave 2) · **Continues:** wave-1 Lane 5 (`reports/L5_report.md`)
**Status:** in progress · written incrementally

---

## GATE STATUS (task 1) — DONE

**`check_cmd_i18n` now passes. The gate advances past it and every other i18n check.**

```
check_cmd_i18n: 567 canonical keys (524 cmd + 43 palette)
  lang: 63/63 packs complete
  mirror: 63/63 packs complete
✓ check_cmd_i18n: command palette i18n complete + manifest fresh.
```

### Where `npm run verify:gate` lands now

**Final answer: `npm run verify:gate` exits 0. The whole gate passes.**

That took two steps and only the first was mine. Clearing `check_cmd_i18n` moved the failure to
`check_iife_lazy_lookup`, which I reported and filed to W5 (below). By my final run that had
been fixed too, and the chain now runs green end to end. The `check_lang_staleness` warning it
prints at the end is advisory and exits 0 (see "For Aaron").

**One caveat, and it is live drift, not a stale observation.** Running the checks individually
straight after that green gate run, `check_aria_handler` failed:

```
PARSE-FAIL stem_lab\stem_tool_particlelab3d.js: Unexpected token (1296:7)
```

It passed inside the gate minutes earlier, so another session is mid-edit on that file right
now. Not mine, not i18n, not reported as my failure. Expect the gate to flicker on
`check_aria_handler` until that lane finishes.

### The intermediate state (kept, because the filing to W5 depended on it)

After my task 1 the gate failed at `check_iife_lazy_lookup` — second-to-last, after 16 passing
checks. Per-check exit codes at that point:

| Check | Exit |
|---|---|
| `check_cmd_i18n` | 0 |
| `i18n/check_safety_string_spanglish` | 0 |
| `check_build_smoke` | 0 |
| `verify_module_registry` | 0 |
| `check_view_props` | 0 |
| `check_window_icons` | 0 |
| **`check_iife_lazy_lookup`** | **1** |
| `i18n/check_lang_staleness` | 0 |

The `check_iife_lazy_lookup` failure is **not mine and not wave 2's**. Three modules take a
top-level snapshot of `window.AlloModules.X` instead of a lazy getter:

- `mailbox_script_source_module.js:4` — `var previous = window.AlloModules.MailboxScriptSource`
- `walkthrough_copilot_cdn_module.js:3043` — `var wcopCoreApi = window.AlloModules.WalkthroughCopilot`
- `walkthrough_script_source_module.js:14` — `var previous = window.AlloModules.WalkthroughScriptSource`

All three files are **clean in git** and dated Aug 13, before this fleet started. Two of them
(`mailbox_script_source_module.js`, `walkthrough_script_source_module.js`) have **no
`*_source.jsx` pair**, so they are the source and must be edited directly;
`walkthrough_copilot_cdn_module.js` does have `walkthrough_copilot_source.jsx`. None are in my
ownership list, so per RULES §4 I reported rather than fixed, and filed it to W5. **That filing
has since been actioned and this check now passes.**

**Net effect for other lanes:** the i18n block of the gate is clear, and with W5's IIFE fix on
top of it the whole chain is green.

### What the gate failure actually was (found)

Not what the lane prompt assumed. Check A (manifest freshness) was **already passing** — a
fresh `node dev-tools/i18n/extract_cmd_keys.cjs` produced a byte-identical
`cmd_keys_en.json`, so re-extracting changed nothing. The failure was entirely **check B**:
21 `cmd.*` / `palette.*` keys existed in the manifest and in `allo_commands_source.jsx` but
were absent from all 63 packs, so every pack failed the hard coverage check.

The 21 keys, grouped:

| Group | Keys |
|---|---|
| media description reader | `cmd.describe_current_media{,_done,_hint,_none}`, `cmd.read_media_descriptions{,_count,_hint,_none}` |
| Learning Web: Explore | `cmd.open_learning_web_explorer{,_done,_hint}`, `palette.ctx.learningWebExplorer` |
| contextual next steps | `cmd.suggest_contextual_next_steps{,_hint,_working}`, `cmd.surprise_me_contextually{,_hint,_working}`, `cmd.use_contextual_suggestion{,_hint,_working}` |

### Changed

Hand-translated all 21 into **all 63 packs** rather than English-passthrough-filling them.
New files, all in `dev-tools/i18n/**` (my ownership):

- `cmd_delta_hand_20260816_part1.cjs` — 21 languages (acholi … hebrew)
- `cmd_delta_hand_20260816_part2.cjs` — 21 languages (hindi … pashto)
- `cmd_delta_hand_20260816_part3.cjs` — 21 languages (polish … yoruba)
- `apply_cmd_delta_20260816.cjs` — validates and folds the delta into
  `cmd_translations/<slug>.json`

Each language carries 19 slots; slot 3 feeds two keys because
`cmd.describe_current_media_none` and `cmd.read_media_descriptions_none` have identical
English source strings. The 21st key, `palette.ctx.learningWebExplorer`, is deliberately left
to English fallback (see the decision below).

Then the standard pipeline, unchanged:

```
node dev-tools/i18n/apply_cmd_delta_20260816.cjs      # 63 translation files updated
node dev-tools/i18n/merge_cmd_keys.cjs --no-backup    # lang/      +1701 keys / 63 packs
node dev-tools/i18n/merge_cmd_keys.cjs --no-backup --lang-dir=desktop/web-app/public/lang
```

`--no-backup` on purpose: this is a shared tree, and 63 `.bak.manual` files in `lang/` would
be noise for every other session. The packs are tracked, `merge_cmd_keys` never overwrites an
existing key without `--overwrite`, and it JSON-round-trips before writing, so the change is
recoverable from git and additive by construction.

### Decisions made on Aaron's behalf

1. **Surface names stay English.** `Learning Web: Explore` is not translated in any pack. This
   matches the existing house convention verified across 8 packs: `cmd.open_stem_lab` is
   "Abrir el STEM Lab" / "STEM Lab öffnen" / "STEM Lab を開く" — the verb and grammar are
   translated, the surface name is not.
2. **`palette.ctx.learningWebExplorer` left as English "Here — Learning Web: Explore".** All
   22 keys in the `palette.ctx.*` namespace are English passthrough in all 63 packs today.
   Translating exactly one row of that dropdown would look like a bug. Consistency wins in
   this pass; the namespace is filed as a known gap below.
3. **`--overwrite` deliberately not used.** It would have been the obvious way to refresh
   values, but `merge_cmd_keys` substitutes English for any key missing from the translation
   file, so `--overwrite` on a 325-key translation file against a 567-key manifest would have
   destroyed ~240 existing hand translations per pack. The additive path was the only safe one.

### Verified

- `node --check` on all four new `.cjs` files: clean.
- `apply_cmd_delta_20260816.cjs` validates before writing and refuses on failure: 63 languages
  x 19 slots, no blanks, `{index}` / `{count}` present verbatim exactly where the English has
  them and nowhere else, no em or en dash in any value. Passed.
- `node dev-tools/check_lang_json.cjs` → `✓ 63 lang pack(s) valid JSON` after the merge.
- `node dev-tools/check_cmd_i18n.cjs` → 63/63 lang, 63/63 mirror, manifest fresh.
- Placeholder integrity matters here specifically: `lang/PACK_QUALITY_STATUS.md` records 151
  past bugs where translators localized the placeholder name itself (Amharic `{score}` →
  `{ውጤት}`). The validator makes that class impossible for this delta.

### For Aaron — two things I found and did not fix

1. **The manifest grew from 561 to 567 keys while I was working.** A concurrent lane (W3 owns
   `allo_commands_source.jsx`, which is modified in the tree) added 6 more `cmd.*` keys and
   re-ran the extractor mid-flight. My merge ran after that, so all 567 are present in all 63
   packs and the gate is green — but those 6 landed as **English fallback**, not translation.
   They are inside the 213 below.

2. **`check_cmd_i18n` checks presence, not translation, and the real gap is much larger than
   21.** In `lang/spanish_castilian.js`, **213 of 567** `cmd.*` / `palette.*` values are
   byte-identical to English. This is pre-existing and invisible to the gate. Concretely it
   includes the whole `palette.ctx.*` namespace (22 keys) and the entire Learning Web: Unit
   Path command group. Worse, `palette.ctx.mindMap` reads **"Here — Throughline"** in all 63
   packs while the English source now says **"Here — Learning Web: Unit Path"** — the packs are
   pinning a feature name that was renamed. Every non-English user sees a name that no longer
   exists in the product. That is a value-staleness class the gate cannot see; it needs its own
   check.

3. **Editorial:** all 22 `palette.ctx.*` English strings in `allo_commands_source.jsx` use the
   form `"Here — X"`, an em dash, against RULES §5. That file is W3's; filed as a cross-lane
   request rather than edited here.

---

## The finding that reframed tasks 2 and 3

Before propagating anything I checked what a **missing** pack key actually does at runtime.
`AlloFlowANTI.txt:4983-4985`:

```js
let result = getVal(languagePack, keys);
if (!result) result = getVal(UI_STRINGS, keys);
```

**`t()` already falls back from the pack to the English `ui_strings.js`.** A key absent from a
pack renders correct English, not a raw key and not a blank. Two consequences that shaped
everything below:

1. **English-passthrough filling is worse than doing nothing.** The obvious way to "propagate
   every wave-1 key to 63 packs" is to write the English value into every pack. That produces
   the same pixels today, and then *freezes* them: every future English edit stops reaching
   non-English users, because the pack now shadows `UI_STRINGS`. The repo has done this before
   (`PACK_QUALITY_STATUS.md`: "Filled 198 new keys with English passthrough across 21 lagging
   packs") and the residue is visible in the numbers below. I did not repeat it. Propagation
   here means translation or nothing.
2. **A stale pack value is a bug; a missing one is not.** Because the pack wins, a value left
   behind by an English rename actively shows a retired name where the fallback would have
   shown the current one. That inverted my priority order: fixing stale overrides beats adding
   new translations, and I did the stale ones first.

Scale, measured rather than assumed. Comparing `ui_strings.js` (69,262 leaf keys) against
`lang/spanish_castilian.js`: **40,216 keys missing**, of which **38,394 are `stem.*`** (the
STEM Lab content program, its own separate track). Excluding that, ~1,822, dominated by
`guided` (337), `lingua` (305), `share_collect` (122). The lane prompt's "~150 new keys" is
the wave-1 delta specifically; the standing backlog behind it is an order of magnitude larger
and predates this fleet.

---

## S2 — Help strings

### Found

`help_strings.js` holds **990 entries** and contains two clearly different eras of writing:

- A **modern layer**, short, second-person, at the target reading level. The six entries L5
  added on 2026-08-16 (`universal_translations`, `role_voice_access`, `glossary_prepare_audio`
  and three others) are this layer, as is `tool_glossary`.
- A **legacy layer**: long adult-register paragraphs with jargon ("Tier 3 vocabulary", "API
  credits", "content-filtered"), "Pro tip:" asides, and em dashes. Some of it is now factually
  wrong.

**The clearest wrong entry, and it is the kind the prompt said is worse than none.**
`glossary_definition_level` described four options: *"Same as Source, On Grade, Simplified, and
Kindergarten"*, and gave two paragraphs of advice built on "Simplified". I read the control
(`view_sidebar_panels_source.jsx:2432-2452`). It offers **Same as Source Text**, **Same as
Global Level ({grade})**, and then grade levels. There is no "On Grade" option and no
"Simplified" option. Every sentence of advice in that entry pointed at a control that does not
exist. Rewritten from the JSX.

**Also found while reading that control, and filed rather than fixed:** the grade list runs
Kindergarten, 1st-6th, then jumps to 9th-12th and College. **7th and 8th grade are missing.**
That is a source change in a locked file; filed to W5/W3.

**`universal_translations` was present but inaccurate.** L5 had already added the entry the
lane prompt asks for, so the task was verification rather than authoring. It said *"Automatic
uses the first language on your list."* `resolveTranslationPolicy` (`AlloFlowANTI.txt:5352-5359`)
returns `{ target: ui }` in auto mode: the target is the **UI language**, not the first entry
of the teacher's list. W2 independently observed the same thing from the rendered control.
Corrected, and extended to explain that the control is hidden when no second language is
possible (`showTranslationControl` / `isTranslationControlRelevant`).

### Changed

| Entry | What was wrong | Now |
|---|---|---|
| `glossary_definition_level` | described 4 options, 2 of which do not exist | rewritten from the JSX, grade level framing, ~3rd-4th grade |
| `universal_translations` | "first language on your list" | "the language the app itself is set to", plus when the control appears |
| `generator_actions` | exhaustive generator list, "Simplified Text" | short, current names, "adapted text" |
| `sidebar_tab_create` | same, plus "Simplified Text" | same treatment |
| `fab_ruler` | "Simplified Text"; also asserted the ruler is "particularly helpful for users with dyslexia, ADHD" | "adapted text"; the efficacy claim softened to "Many readers find it easier to stay on the right line", per the no-contested-science-as-fact rule |

**Em dashes: 325 entries, 452 occurrences, now zero.** `dev-tools/i18n/fix_help_dashes_20260816.cjs`.
This is not a character swap. A dash there also fights the reading-level target by welding two
clauses into one long sentence, so the rewrite splits instead:

- numeric range `1–10` → `1 to 10`
- dash followed by a coordinating conjunction → `, ` (a period would strand the sentence on "And ...")
- inside an unclosed parenthesis → `, ` (`"(20 seconds. Gives time to search)"` reads wrong)
- otherwise → `. ` with the next word capitalized, turning one long sentence into two short ones

Every one of the 452 replacements was dumped to a review file and read before the write, not
trusted blind. Two of the four rules exist only because reading that dump showed the naive
version producing bad English.

### The rename sweep, including where I did *not* rename

- **"Visual Support" in `help_strings.js`: 4 entries, none of them stale.** All four use
  "visual support" as the general UDL principle (`glossary_filter_tier3`,
  `group_visual_density_select`, `simplified_emojis`, `settings_perm_visuals`), not as the name
  of the panel L10 renamed. Renaming them would have been the regression L3 warned about.
  **No change needed**, verified rather than assumed.
- **"Simplified": 58 key *names* match, but only 4 *values* used it as the feature name.**
  Key names are stable identifiers and were left alone. Three of the four values are fixed
  above; `glossary_definition_level`'s was fixed by rewriting the whole entry.

### Verified

- `new Function()` load of `help_strings.js` after every burst: **990 keys before and after**,
  0 lost, 0 em/en dashes remaining, and **0 values changed that did not contain a dash** (an
  explicit assertion, not an eyeball).
- The runtime load path is `JSON.parse` → `new Function` → regex cleanup
  (`AlloFlowANTI.txt:4292-4305`). The file already fails `JSON.parse` (single-quoted keys) and
  has always loaded via `new Function`, which my edits preserve.
- Control text checked against `view_sidebar_panels_source.jsx` and `AlloFlowANTI.txt`, not
  against the previous entry's claims.

### Not done, and why

The em-dash rule is violated far more widely than `help_strings.js`: **5,438 values in
`ui_strings.js`** (463 excluding `stem.*`) and **12,584 in the packs' `help_mode` sections**.
I did not sweep those. W4's report records that Aaron already ruled the repo-wide em-dash
sweep report-only; I applied that ruling and confined the fix to my own exclusive file.

I did not rewrite the whole legacy layer of `help_strings.js`. 990 entries at this level of
verification is a multi-session job, and a half-verified sweep would leave no way to tell which
entries had been checked. The five above were chosen because they were provably wrong or
carried a retired name.

---

## S2b — Propagation of wave-1 keys

Ordered by the reframing above: stale overrides first, then translation.

### 1. G3 rename — 189 values, the largest single wrong-text bug I found

L1 shortened `sidebar.tool_glossary` / `glossary.title` / `tools.glossary` to "Glossary" in
English and filed the packs to Lane 5. All 63 packs still carried "Glossary & Language
Selection" in all three keys. Because the pack wins over `UI_STRINGS`, **every non-English user
was seeing the retired label while English users saw the new one** — exactly what L1 predicted.

`dev-tools/i18n/apply_glossary_rename_20260816.cjs`. Per-pack term derived from that pack's own
existing string, per L1's derivation note. L1's warning about hybrids was well founded: about a
third of the packs read like `"መዝገበ ቃላት & ቋንቋ Selection"` or `"Glossary & leb Selection"`, so a
blind split on the connector would have produced garbage for those. Those packs keep the head
word they already had rather than having a term invented for them.

A first dry run rewrote 354 of 378 and **reported the 24 it would not touch** rather than
guessing: Chinese (`选择` / `選擇`), Hebrew (`בחירת`) and Somali (`Doorashada`) were outside my
staleness pattern. Extended the pattern, re-ran: **378 values rewritten (189 in `lang/`, 189 in
the mirror), 0 skipped, 0 packs unmapped.** A value is only rewritten if it still matches the
stale shape, so anything a concurrent lane had already changed would have been left alone and
reported.

### 2. The same class, found by scanning for it — 164 more values

Having established the pattern I scanned all 63 packs for other retired names rather than
waiting to be told. Two more live cases, fixed in
`dev-tools/i18n/apply_stale_overrides_20260816.cjs`:

- **`palette.ctx.mindMap` = "Here — Throughline" in all 63 packs**, against an English source
  that now reads "Here — Learning Web: Unit Path". "Throughline" is a name the product no
  longer uses. 126 values (both dirs) set to the current English, since that whole namespace is
  English passthrough.
- **"Visual Support" → "Lesson Images" (L10's rename)**: 7 packs pinned the old name in
  `sidebar.tool_visual` / `visuals.title` / `quiz.help.sidebar_visuals_title`. The other 56 lack
  the key and were already falling through to correct English. 38 values.

Deliberately **not** touched: `about.rep_desc`, `fab.visual_supports`, `simplified.use_emojis`,
`visual_support.teacher_modal_aria`, `groups.visual_density_tooltip`,
`educator_hub.symbol_studio_desc`, `adventure.word_sounds_review_image_gen`. Those still say
"visual support(s)" in English today because they mean the UDL principle.

### 3. Stale help translations — 504 entries removed

I changed the English of four `help_strings.js` entries, which left 63 packs holding
translations of the superseded text, including 40+ languages describing
`glossary_definition_level`'s non-existent options. Since
`helpText = localizedHelp || _helpLookup(key)` (`AlloFlowANTI.txt:16196`), **removing** a stale
`help_mode` entry makes that pack fall back to the corrected English. 504 entries removed
across 126 pack files. Self-correcting: the next help-translation wave picks them up from the
current English rather than re-translating text that was wrong.

### 4. New-key translation — L4 + L3, hand-translated into all 63 packs

13 keys, 819 strings, in `ui_delta_hand_20260816_partA/partB.cjs` +
`apply_ui_delta_20260816.cjs`:

- `universal.translations{,_auto,_auto_plain,_none,_on_hint,_off_hint}` and
  `output.translation_{block,into}` — L4's Translations control, on the main sidebar.
- `simplified.measured_{level_label,on_target,above,below,note}` — L3's measured-level chip
  (Aaron's manual test #10).

**`simplified.measured_note` needed a mechanism, not just a translation.** The English is
"Flesch-Kincaid, measured on this passage. Use **Check Level** for a fuller review." That
button *is* translated per pack (`simplified.check_level` → "Verificar Nivel", "Vérifier le
niveau", "レベルを確認"). Writing the English button name into 63 translated sentences would have
told users to press a button that does not exist in their language. So the delta carries a
`{btn}` slot and the applier substitutes each pack's own label at merge time. 10 packs have no
localized label and correctly fall back to "Check Level"; that count is reported, not hidden.
"Flesch-Kincaid" is a proper noun and is not translated.

`+1638 values, 0 already present` (819 x 2 dirs). Additive only.

### 5. W2's cross-lane request — fixed

`ui_strings.js:3005` `universal.translations_on_hint` had `a` hardcoded before an interpolated
language name, rendering "will also include **a English** version". Applied W2's suggested
wording, which avoids pushing article agreement onto 63 packs:
`"Resources in {output} will also include a version in {target}."` Done under
`fleet_lock.cjs acquire ui_strings.js --lane=W1`, Edit only, re-read after acquiring, mirrored,
lock released. My 63 pack translations were written against the corrected English, so the packs
never carried the bug. The stale inline `|| '...'` fallback at the call site is in a locked file
and is filed to W5.

### What I did not propagate, honestly

Translation, not passthrough, is the only propagation worth doing here (see the reframing
above), and hand-translating into 63 packs costs roughly one authored string per pack per key.
Landed this wave: **34 keys x 63 packs** (21 cmd + 13 ui). Still English-only, with counts
measured against `lang/spanish_castilian.js`:

| Source | Keys | Note |
|---|---|---|
| L1 `glossary.empty_*` + `games.crossword.rtl_note` | 8 | `{query}` / `{filter}` placeholders |
| L7 `voice_control.*` + `bot.mic_*` | 10 | `{action}` / `{topic}` placeholders |
| L8 `export_preview.*` | 9 | long paragraphs, the most expensive per key |
| L9 `guided`, `sidebar.tool_finder_*`, `hints`, `tour`, `canvas_settings`, `platform_diag`, `storage`, `pdf_audit` | ~390 | `guided` alone is 337 and mostly predates wave 1 |
| L10 adventure + Lesson Images | 34 | rename half already done above |
| L5 wave-1 `share_collect` | 122 | L5's own burst-2 namespace |
| pre-existing `lingua`, `persona`, `dynamic_assessment`, `readinglib_*`, `catalog_*` | ~700 | not wave-1 work |
| `stem.*` | 38,394 | separate program |

All of these render correct English today. None is a defect; each is a quality gap.

### L10's `FLASHCARD_NO_ANSWER` — filed, not done

The lane prompt offered the choice of editing `AlloFlowANTI.txt` under lock or filing to W5.
Filed: the edit is a new `t()` call site in the hot file plus a new key, W5 already holds that
file for other work, and a lock round-trip on the 55,094-line monolith for one string is a poor
trade against the wave's critical path.

### L8's exported-quiz defect — diagnosed, filed

L8 reported the exported quiz rendering literal `output.quiz_mcq` / `output.quiz_reflection`
plus an `undefined` reflection prompt. Both keys **exist** in `ui_strings.js`, so this is not a
missing-entry problem in my file: it is a call site rendering the key string itself, which means
`t()` returned undefined and the caller had no `|| 'fallback'`. That is the export path, which
is `doc_pipeline_source.jsx` — on wave 2's lock list and W5's. Filed with that diagnosis rather
than guessed at from my side.

---

## S1 — Extraction sweep (continued from L5)

**Scanner: 883 → 869. `AlloFlowANTI.txt` 635 → 621.** Two complete cards, no partials.

This is the small end of the elastic task, and I want to be plain about why: tasks 1-3 took the
lane. Rather than open the 38-string storage-and-recovery panel and leave it half-localized in a
lock-protected 55,094-line file, I finished two self-contained cards inside it. A half-done panel
in `AlloFlowANTI.txt` is worse than an untouched one, both for readers and for the next lane.

### Changed (both under `fleet_lock.cjs acquire AlloFlowANTI.txt --lane=W1`, Edit only)

- **Retention policy presets**, `AlloFlowANTI.txt:45874-45890` — the `policyOptions` array
  supplying the Automatic / Compact / Standard names and their detail lines. This is the class
  L5 flagged as scanner-visible but easy to miss: user-facing copy living in a plain object
  literal, not in JSX.
- **On-device speech models card**, `AlloFlowANTI.txt:45937-45963` — heading, explanatory note,
  both model labels and descriptions, the "On this device" badge, the download button, and the
  model-cache line.

New keys: 16 under `storage.*` in `ui_strings.js` (3 → 19), added under its own lock and
mirrored.

**Three of those strings were invisible to the scanner**, which is the point of L5's method
note. `'Downloading…'` sat in a ternary, and both `'Download ' + m.size` and
`'Model cache on this device: ~' + _alloFormatWorkspaceBytes(...)` were **string concatenations**
rather than literals in a translatable position. Concatenation is also the wrong shape for
translation because it fixes word order, so both became interpolated keys
(`storage.model_download` = `"Download {size}"`, `storage.model_cache` =
`"Model cache on this device: ~{size}"`). The count went down by 14 but 17 strings were actually
routed.

`Whisper` and `Kokoro` stay untranslated inside their labels; the `✓` stays in the JSX rather
than inside the key, so no translator can drop it.

### Verified

- `@babel/parser` full-file parse of `AlloFlowANTI.txt`: clean.
- Re-scan of lines 45870-45970: **zero findings remain in either card**; the residual entries in
  that range (`Storage status`, `Persistence`, `Recovery workspaces`, `target ·`,
  `AlloFlow-managed browser data`) belong to the surrounding panel, which I deliberately did not
  start.
- `check_render_refs`, `check_lang_json`, `check_cmd_i18n`, `check_safety_string_spanglish`,
  `check_lang_staleness`: all exit 0. `fleet_lock.cjs status`: no locks held.

### Remaining, for whoever continues

`AlloFlowANTI.txt` at 621. The real clusters, measured with `--csv` rather than taken from the
truncated console output (the scanner prints ~40 per file then `... 595 more`, so reading the
console listing badly understates every cluster):

| Lines | Findings | What |
|---|---|---|
| 47000-47500 | **120** | Class Mailbox / live session / FERPA and privacy copy |
| 35500-36500 | 72 | saved-work encryption, recovery keys |
| 45500-46000 | 38 | rest of the storage and recovery manager |
| 51500-52000 | 34 | AlloHaven |
| 2500-3000 | 27 | scattered labels |
| 7500-8000 | 21 | scattered |
| 46000-46500 | 21 | Share & Collect residue |
| 23000-23500 | 15 | scattered |

The 47000 block is the single biggest win left and is one coherent feature. It is also the one
to be most careful with: it contains the FERPA and privacy-disclosure copy, where a loose
translation is a compliance statement rather than a UI string.

Per-file baseline (`node dev-tools/scan_shell_i18n.cjs`, 11 files, 869 total):

| File | Unlocalized |
|---|---|
| `AlloFlowANTI.txt` | 621 |
| `view_sidebar_panels_source.jsx` | 102 |
| `view_renderers_source.jsx` | 59 |
| `reading_library_module.js` | 48 |
| `misc_components_source.jsx` | 12 |
| `quickstart_source.jsx` | 10 |
| `view_header_source.jsx` | 8 |
| `catalog_module.js` | 5 |
| `view_fab_stack_source.jsx` | 3 |
| `onboarding_coach_source.jsx` | 1 |

L5 took `AlloFlowANTI.txt` from 770 to 635; this lane took it to 621. L5's method note is the
thing to read first: the scanner resolves the translator alias per file (`t`, `tr`, `tx`, `ts`,
`__alloT` and, in `AlloFlowANTI.txt`, 22 distinct aliases), and it judges coverage at the call
site, so key presence in `ui_strings.js` proves nothing. Add one correction from this lane:
**string concatenation hides user-facing text from the scanner entirely**, and it is common in
this panel family.

---

## For Aaron

**Decisions I made on your behalf**

1. **Did not English-passthrough-fill the packs**, though that is the literal reading of
   "propagate every wave-1 key". It would have frozen 63 packs against future English edits for
   zero visible gain. Reasoning above; reverse it if you disagree and it is one script.
2. **Prioritized stale values over new translations.** 693 wrong-text values fixed (378 glossary
   + 164 stale overrides + 504 removed stale help entries, counting both dirs) before any new
   translation went in.
3. **Confined the em-dash fix to `help_strings.js`**, following the report-only ruling you gave
   W4, and reported the wider counts instead.
4. **Kept `palette.ctx.learningWebExplorer` in English** so the palette's context row stays
   internally consistent; the whole 22-key namespace is English today.
5. **Filed rather than edited**: 3 IIFE files, `allo_commands_source.jsx` em dashes,
   `view_sidebar_panels_source.jsx` stale fallback and its missing 7th/8th grades,
   `FLASHCARD_NO_ANSWER`, L8's export defect.

**The thing most worth your attention, and I had this wrong at first**

My first draft of this section said nothing in the repo checks value staleness, and proposed
building it. That was wrong, and the correct version is more useful.

**`dev-tools/i18n/check_lang_staleness.cjs` already does exactly this**, it already ran in the
gate, and it had **already named every key in this report**. Its output for
`lang/spanish_castilian.js` listed `sidebar.tool_glossary`, `glossary.title`, `tools.glossary`,
`sidebar.tool_visual` and `visuals.title` among 403 stale keys. Repo-wide:

```
check_lang_staleness: 542 English key(s) changed since baseline; 11425 new key(s)
⚠ 23659 stale translation(s) across 62 pack(s)
```

The tool works. It is **warn-only** in `verify:gate` (it has a `--gate` flag that would exit 1;
the chain does not use it). So it has been printing the answer, exiting 0, and accumulating:
23,659 stale translations, including the ones that were showing every non-English teacher a
retired panel name.

The workflow has a second half I had not run either: after re-translating you re-bless with
`bless_lang_sources.cjs --key <key>`, or the key keeps reporting stale forever. I have now
blessed the 6 keys I brought current; the count moved **23,659 → 23,302**.

So the recommendation is not "build a staleness check". It is:

1. **Decide whether `check_lang_staleness --gate` should block.** It cannot today: 23,302 stale
   translations would fail every run. But nothing shrinks that number while it is advisory,
   which is how these 189 values survived.
2. A middle option that would work now: gate on a **denylist of high-visibility namespaces**
   (`sidebar.*`, `tools.*`, `glossary.*`, `visuals.*`, `universal.*`), so a renamed surface
   cannot ship stale, while the long tail stays advisory.
3. Separately, `check_cmd_i18n` checks key **presence** only, and the `cmd.*` namespace is
   outside the staleness baseline's reach in practice: **213 of 567** `cmd.*`/`palette.*` values
   in `lang/spanish_castilian.js` are byte-identical to English behind a green check.

**Worth knowing:** the `help_strings.js` last-resort load path
(`AlloFlowANTI.txt:4303`) does `.replace(/'/g, '"')`, which would corrupt every value containing
an apostrophe. It only runs when CSP blocks `new Function`, so it is latent, and it is
pre-existing. Not mine to fix, and not filed as urgent.

## Files I changed

- `help_strings.js` — 5 entries rewritten, 325 de-dashed, 990 keys intact
- `AlloFlowANTI.txt` — 2 cards routed through `t()` (17 strings), under lock, Edit only
- `ui_strings.js` + `desktop/web-app/public/ui_strings.js` — W2's fix + 16 new `storage.*` keys, under lock
- `lang/*.js` + `desktop/web-app/public/lang/*.js` — all 63 x 2: cmd delta, ui delta, glossary
  rename, stale overrides, stale help removal; manifest regenerated
- `dev-tools/i18n/cmd_translations/*.json` — 63 files, 21 keys each
- New in `dev-tools/i18n/`: `cmd_delta_hand_20260816_part1/2/3.cjs`,
  `apply_cmd_delta_20260816.cjs`, `ui_delta_hand_20260816_partA/partB.cjs`,
  `apply_ui_delta_20260816.cjs`, `apply_glossary_rename_20260816.cjs`,
  `apply_stale_overrides_20260816.cjs`, `fix_help_dashes_20260816.cjs`

No commits, no pushes, no deploys, no staging. Locks acquired and released.
