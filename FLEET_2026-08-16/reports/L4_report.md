# Lane 4 — Translations architecture (T1, T2, T2b)

**Lane:** L4 · **Branch:** main · **Date:** 2026-08-16
Status: **complete.** Audit delivered, control designed and built, setting reaches every path in
the inventory except Adventure (Lane 10's file, contract handed over). Two pre-existing
UI-language leaks found and fixed. `verify:gate` fails on two other sessions' in-flight files;
details under "Verified".

---

## T2 — Audit: what emits translations today

### The three language variables

Before the table, the vocabulary, because the whole confusion turns on it:

| Variable | Set by | Means |
|---|---|---|
| `leveledTextLanguage` | Universal Settings, "Output language" select — [view_sidebar_panels_source.jsx:558](../../view_sidebar_panels_source.jsx#L558) | The language generated **content** is written in. Options are `English`, the languages in `selectedLanguages`, and `All Selected Languages`. Declared [AlloFlowANTI.txt:14586](../../AlloFlowANTI.txt#L14586), default `'English'`. |
| `selectedLanguages` | Universal Settings, "Add languages" chip list (max 4) — [view_sidebar_panels_source.jsx:577](../../view_sidebar_panels_source.jsx#L577) | A shared list with three consumers: it populates the output-language select, Adventure's language mode, and Glossary's `translations` object. |
| `currentUiLanguage` | The app UI language selector — [ui_language_selector_source.jsx](../../ui_language_selector_source.jsx) | The language the **interface chrome** is in. Declared [AlloFlowANTI.txt:4996](../../AlloFlowANTI.txt#L4996), default `'English'`. |

Inside the dispatcher, `effectiveLanguage = langOverride || leveledTextLanguage`
([generate_dispatcher_source.jsx:1817](../../generate_dispatcher_source.jsx#L1817)).

### Answer to Aaron's question

**The translation target is hardcoded to the literal string "English" on every content path
but one, and the exception uses the app UI language.** He was right that it differs by path,
and right to be unsure which, because both are true depending on which resource he generated.

There is no setting anywhere that turns translations on or off. The only control is indirect:
translations appear because the output language is not English, and the gate is almost always
the same expression, `effectiveLanguage !== 'English'`.

### Inventory

`Always` below means "always, given a non-English output language". Line numbers are the root
copies, which are the live sources.

| # | Path | File:line | Emitted | Gate | Target language |
|---|---|---|---|---|---|
| 1 | Glossary, cloud backend | [generate_dispatcher_source.jsx:2048-2087](../../generate_dispatcher_source.jsx#L2048) | Conditional | `langsReq.length > 0` | `selectedLanguages` + output language. **The one genuinely language-agnostic path.** |
| 2 | Glossary, local backend | [generate_dispatcher_source.jsx:2000-2014](../../generate_dispatcher_source.jsx#L2000) | Conditional | `langsReq.length > 0`, else literal `'Do not include translations.'` | same as #1 |
| 3 | Glossary etymology prose | [generate_dispatcher_source.jsx:2069-2072](../../generate_dispatcher_source.jsx#L2069) | Conditional | `includeEtymology && langsReq.length > 0` | `['English', ...langsReq]` — English force-prepended |
| 4 | Adapted text ("simplified") | [generate_dispatcher_source.jsx:2514-2669](../../generate_dispatcher_source.jsx#L2514) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English.** Second LLM round trip per chunk via `translateCitationSafe` |
| 5 | Adapted text, generic helper | [text_pipeline_helpers_source.jsx:9-48](../../text_pipeline_helpers_source.jsx#L9) | Always | `targetLang !== 'English'` | **Hardcoded English**, appends `--- ENGLISH TRANSLATION ---` |
| 6 | Bilingual prompt block | [AlloFlowANTI.txt:5309-5326](../../AlloFlowANTI.txt#L5309) | Always | `targetLang !== 'English'` | **Hardcoded English** |
| 7 | Graphic organizer / outline | [generate_dispatcher_source.jsx:2789](../../generate_dispatcher_source.jsx#L2789) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English** (`main_en`, `title_en`, `items_en`) |
| 8 | Quiz questions/options/reflections | [generate_dispatcher_source.jsx:3144-3227](../../generate_dispatcher_source.jsx#L3144) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English** (`_en` suffix fields) |
| 9 | Quiz answer explanations | [generate_dispatcher_source.jsx:3346](../../generate_dispatcher_source.jsx#L3346) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English**, `--- English Translation ---` delimiter |
| 10 | **Analyze Source Material** | [generate_dispatcher_source.jsx:3590-3636](../../generate_dispatcher_source.jsx#L3590) | Always | `currentUiLanguage !== 'English' && !usesLocalTextBackend` | **The app UI language.** Ignores the output language entirely. See "UI language leak" below. |
| 11 | FAQ | [generate_dispatcher_source.jsx:3882-3885](../../generate_dispatcher_source.jsx#L3882) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English** (`question_en`, `answer_en`) |
| 12 | Brainstorm | [generate_dispatcher_source.jsx:4045-4060](../../generate_dispatcher_source.jsx#L4045) | Always | `effectiveLanguage !== 'English'`, else explicit `'Do NOT provide translations.'` | **Hardcoded English** (`text_en`) |
| 13 | Timeline | [generate_dispatcher_source.jsx:4742-4754](../../generate_dispatcher_source.jsx#L4742) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English** (`progressionLabel_en`, `date_en`, `event_en`) |
| 14 | Math, dispatcher copy | [generate_dispatcher_source.jsx:4914,4941](../../generate_dispatcher_source.jsx#L4914) | Always | `effectiveLanguage !== 'English'` | **Hardcoded English**, inline in parentheses |
| 15 | Math / quiz, helper copies | [generation_helpers_source.jsx:210,273,306](../../generation_helpers_source.jsx#L210), [math_helpers_source.jsx:147](../../math_helpers_source.jsx#L147) | Always | `leveledTextLanguage !== 'English'` | **Hardcoded English**, inline in parentheses |
| 16 | Difficulty re-level of quiz | [generation_helpers_source.jsx:1184](../../generation_helpers_source.jsx#L1184) | Always | `leveledTextLanguage !== 'English'` | **Hardcoded English** (`_en`) |
| 17 | Lesson plan, Full Pack entry | [generate_dispatcher_source.jsx:5440](../../generate_dispatcher_source.jsx#L5440) -> [prompts_library_source.jsx:142-153](../../prompts_library_source.jsx#L142) | Always | `language !== 'English'` | **Hardcoded English** |
| 18 | Lesson plan, sidebar-button entry | [concept_map_handlers_source.jsx:543](../../concept_map_handlers_source.jsx#L543) -> same builder | Always | `language !== 'English'` | **The app UI language.** Different entry point, different variable. See below. |
| 19 | Family guide (parent mode) | [concept_map_handlers_source.jsx:541](../../concept_map_handlers_source.jsx#L541) / [generate_dispatcher_source.jsx:5438](../../generate_dispatcher_source.jsx#L5438) -> [prompts_library_source.jsx:198-206](../../prompts_library_source.jsx#L198) | Always | `language !== 'English'` | **Hardcoded English**; source variable differs by entry point as in #17/#18 |
| 20 | Study guide (independent mode) | [concept_map_handlers_source.jsx:539](../../concept_map_handlers_source.jsx#L539) / [generate_dispatcher_source.jsx:5436](../../generate_dispatcher_source.jsx#L5436) -> [prompts_library_source.jsx:244-252](../../prompts_library_source.jsx#L244) | Always | `language !== 'English'` | **Hardcoded English**; same split |
| 21 | Persona debate dialogue | [personas_source.jsx:1863,1932](../../personas_source.jsx#L1863) | Always | non-English target | **Hardcoded English**, separate `translation` field |
| 22 | Persona interview reply | [personas_source.jsx:2220,2271](../../personas_source.jsx#L2220) | Always | non-English target | **Hardcoded English**, separate `translation` field |
| 23 | Adventure turn / setup / recap | [adventure_handlers_source.jsx:155-160, 648-653, 1048-1053, 1418-1423, 1592](../../adventure_handlers_source.jsx#L155) | Conditional | `adventureLanguageMode` (its own tri-state: multilingual / target+English / target only) | **Hardcoded English.** Already has a working "no translations" state, but only for Adventure and only via its own control. |
| 24 | Adventure, dispatcher entry | [generate_dispatcher_source.jsx:5501](../../generate_dispatcher_source.jsx#L5501) | Never | explicit `'Do NOT provide English translations for this JSON output.'` | n/a |
| 25 | Cloze / re-level repair | [phase_k_helpers_source.jsx:2741-2802](../../phase_k_helpers_source.jsx#L2741) | Always | source contains the delimiter, or `targetLanguage` non-English | **Hardcoded English** (`_en` fields, delimiter) |
| 26 | Sentence frames, concept sort, DBQ, note-taking, anchor chart, gemini-bridge, image, alignment report | dispatcher branches at [3991](../../generate_dispatcher_source.jsx#L3991), [5049](../../generate_dispatcher_source.jsx#L5049), [5216](../../generate_dispatcher_source.jsx#L5216), [5632](../../generate_dispatcher_source.jsx#L5632), [5817](../../generate_dispatcher_source.jsx#L5817), [5009](../../generate_dispatcher_source.jsx#L5009), [2828](../../generate_dispatcher_source.jsx#L2828), [4083](../../generate_dispatcher_source.jsx#L4083) | **Never** | they use the shared `languageDirective` only | n/a. Eight resource types emit no translation at all, which is itself an inconsistency Aaron did not know about. |

**Out of scope, deliberately.** [`translateAccessibleHtml`](../../doc_pipeline_source.jsx) (PDF/document
translation, invoked from `view_pdf_audit_source.jsx:15589`) is an explicit user action with its
own target-language picker (`pdfTranslateLang`). It is not "generated content came back with a
translation attached", so the new setting must not gate it. That file family is also off-limits
to this fleet.

### Is the app UI language leaking into generated content?

**Yes, on three paths, and it is a real bug independent of the new feature.**

1. **Analyze Source Material** ([generate_dispatcher_source.jsx:3590](../../generate_dispatcher_source.jsx#L3590))
   reads `currentUiLanguage`, not `leveledTextLanguage`. Set the UI to Spanish and the analysis
   body, key concepts, accuracy reasons and grammar notes all come back in Spanish, plus a full
   `translatedText` rendering of the source, regardless of the output language. Set the output
   language to Spanish and leave the UI in English and the analysis stays entirely English.
   This is documented as intended in [view_guided_mode_banner_source.jsx:72](../../view_guided_mode_banner_source.jsx#L72)
   ("UI language (currentUiLanguage) — adds translatedText when non-English"), so it is
   long-standing rather than accidental, but it directly contradicts the Universal Settings
   panel's promise that "Output language" governs generated resources.

2. **Lesson plan, family guide, study guide have two entry points that disagree.** The sidebar
   button ([view_sidebar_panels_source.jsx:3483](../../view_sidebar_panels_source.jsx#L3483))
   calls `handleGenerateLessonPlan`, which passes `currentUiLanguage`
   ([concept_map_handlers_source.jsx:539-543](../../concept_map_handlers_source.jsx#L539)).
   The Full Pack / dispatcher path passes `effectiveLanguage`
   ([generate_dispatcher_source.jsx:5436-5440](../../generate_dispatcher_source.jsx#L5436)).
   Same builder, same prompt, two different languages depending on which button was pressed.
   **This is the mechanism behind Lane 3's T3** ("lesson plan generation is inconsistent about
   honoring a non-English output language"). It is not model flakiness; the two call sites
   genuinely send different arguments.

3. **AI-generated source material** ([content_engine_source.jsx:734](../../content_engine_source.jsx#L734))
   sets `effectiveLanguage = currentUiLanguage`. Here the code carries a comment explaining the
   choice: the source is the canonical input and must not be pre-translated. That reasoning is
   sound for the translation question, but it still means a teacher with a Spanish interface and
   an English output language gets Spanish source text. Reported, not changed — see "For Aaron".

### What the audit changes about the size of the job

The behavior is **not** consistent, so this is not a small job. Concretely:

- 3 different gate variables (`effectiveLanguage`, `leveledTextLanguage`, `currentUiLanguage`).
- 4 different output shapes (`_en` sibling fields; a `--- ENGLISH TRANSLATION ---` delimiter
  inside a string; a separate `translation` field; inline parentheses).
- 1 path (glossary) that is already language-agnostic and 25 that are not.
- 8 resource types that emit nothing.
- 2 entry points to the same lesson-plan prompt that disagree about which language variable to read.

---

## T2b — The control: what I chose and why

**One selector, labelled "Translations", directly under Output language, hidden unless it is
meaningful.** Stored as a string with three kinds of value:

| Value | Meaning |
|---|---|
| `auto` (the default, and what every existing install has) | Gloss into **the app UI language**, whenever the content is in a different language. |
| `off` | No translations anywhere. |
| a language name | Gloss into exactly that language. |

### Why one selector and not a toggle plus a picker

"Include translations?" and "into which language?" really are two questions, and Aaron is right
that collapsing them is what makes the design feel wrong in either direction. But a second
widget would sit in the panel greyed out for every teacher who never turns the first one off,
and Universal Settings is already a dense panel that four other lanes are adding to. Folding
"None" into the same option list answers both questions with one control and no dead state.

The discoverability cost of hiding "off" inside a list is real, and it is paid down by the
hint line under the control, which always states in words what will happen: "Resources in
Spanish will also include an English version", or "Resources will be in Spanish only, with no
second-language version." A teacher does not have to open the list to know where they stand.

### Why `auto` resolves to the UI language rather than to English

This is the decision that makes the feature language-agnostic rather than English-with-options.

Today's rule, spelled out, is "translate into English whenever the content is not English."
The honest generalisation of that is not "translate into English" but **"translate into the
language the teacher reads, whenever the content is in a different language."** The app already
knows which language the teacher reads: it is the one they set the interface to.

What this preserves and what it changes:

| UI language | Output language | Before | After (`auto`) |
|---|---|---|---|
| English | Spanish | English gloss | English gloss — **identical** |
| English | English | none | none — **identical** |
| Spanish | Nahuatl | English gloss | Spanish gloss — **better** |
| Spanish | Spanish | English gloss | none — **changed, deliberately** |
| Spanish | English | none | Spanish gloss — **changed, deliberately** |

The top two rows are the overwhelming majority of installs, and nothing moves for them. The
bottom two rows are the English-centrism: a Spanish-interface teacher writing Spanish content
was being handed English glosses nobody asked for, and the same teacher writing English content
got nothing, because the code treated English as the language that never needs explaining.
Both are now symmetric. Both are reversible from the control.

### Why the control hides itself

`isTranslationControlRelevant` returns false when `auto` would resolve to no translation, that
is, when the output language and the UI language are the same. English UI plus English output
means the control is not rendered at all, so the large majority of users never see it. It
appears the moment the output language differs, which is Aaron's "only when you are doing
other languages."

One extra clause: once a teacher has set anything other than `auto`, the control stays visible
even if it would otherwise hide. Without that, "off" would be a one-way door, since the control
that set it would vanish as soon as the output language went back to English.

### How the multi-state read is made safe

The regression this codebase has already suffered is a multi-state setting read with
`!== 'off'`, where an unrecognised value read as "on" for everybody. The structural fix here is
that **no consumer ever sees the raw string.** They call one resolver and read a struct:

```js
const _xlate = resolveTranslationPolicy(translationMode, effectiveLanguage, currentUiLanguage, choices);
if (_xlate.enabled) { /* ask for a translation into _xlate.target */ }
```

Inside the resolver the read is exhaustive:

- Anything that is not a string is rejected **by type**, before any coercion, so a stray number
  or object can never become a language named `42` or `[object Object]`.
- `'off'` (trimmed, case-insensitive) is the only value that disables.
- `''`, `'auto'`, `null` and `undefined` take the `auto` rule.
- An explicit language that is **not among the destinations the picker currently offers** falls
  back to `auto` rather than being sent to the model. This catches the real case where a teacher
  picks Haitian Creole and later removes it from the shared language list.
- A disabled policy carries `target: ''`, not `undefined`, so an interpolation into a prompt
  cannot leak the string "undefined" to the model.

The fail-safe direction is `auto`, not `off`, and that is deliberate. "Unset" is the majority
state: every teacher who has never opened this control must keep the behaviour the app has
always had. Failing to `off` would silently strip translations from everyone.

And the panel reads the same resolver the generators read: it is passed down from the host
(`resolveTranslationPolicy`, `isTranslationControlRelevant`, `translationTargetChoices` are
props), and it binds the select's `value` to `policy.mode` rather than to the raw stored string.
So what the teacher sees selected is what generation will actually do, including when the
stored value is stale. The resolver returns the **canonical** spelling from the offered list, so
a stored `'spanish'` still matches the `Spanish` option instead of rendering the select blank —
the exact failure the DoK "Mixed" option hit in this same panel.

---

## T1 / T2b — What was built

### The resolver, and where it lives

[`text_pipeline_helpers_source.jsx:20-108`](../../text_pipeline_helpers_source.jsx#L20) now exports
`resolveTranslationPolicy`, `isTranslationControlRelevant`, `translationTargetChoices`,
`isSameLanguage`, and the two mode constants. That file was already the home of
`generateBilingualText` and `extractSourceTextForProcessing`, so the policy sits with the code
that produces and parses the bilingual output rather than in a new module needing loader
registration.

`AlloFlowANTI.txt` carries thin shims for all three (same idiom as the existing
`generateBilingualText` shim), each with an inline fallback so a slow CDN reproduces the
historical behaviour instead of silently dropping translations.

### Setting storage

- Declared in `AlloFlowANTI.txt`: `const [translationMode, setTranslationMode] = useState(TRANSLATION_MODE_AUTO);`
- Saved into every payload that already saves `leveledTextLanguage` (14 sites).
- Restored in all three restore paths (autosave parse, teacher project profile, preset apply),
  each guarded with `typeof x === 'string'` so an older save cannot clobber the live value.
- Threaded into the dispatcher deps, `_alloCmapHandlersDeps`, `_alloPhaseKHelpersDeps`,
  `_alloPhaseNHelpersDeps`, `_alloTextUtilityHelpersDeps`, `_alloGenerationHelpersDeps`, the
  `handleMathEdit` inline deps, and `_personasLiveRef`.

### Coverage against the T2 inventory

Every row of the audit table, and what it does now. This is the part most likely to be done
incompletely, so it is enumerated rather than summarised.

| # | Path | State | Where |
|---|---|---|---|
| 1,2 | Glossary, cloud + local | **Honours it.** `off` empties `langsReq`; the resolved gloss language is added if absent; the output language is filtered out so it never asks to translate Spanish into Spanish. | [generate_dispatcher_source.jsx:2024](../../generate_dispatcher_source.jsx#L2024) |
| 3 | Glossary etymology prose | **Honours it.** The force-prepended `'English'` is now `effectiveLanguage`, so the prose list is content-language plus requested glosses. | dispatcher, etymology block |
| 4 | Adapted text, per-chunk | **Honours it.** When off, the second LLM round trip per chunk is not spent at all. | `if (_xlate.enabled)` around the translate step |
| 5 | `generateBilingualText` | **Honours it.** Takes an optional policy; returns a single block with no delimiter when off, and asks for `policy.target` when on. | [text_pipeline_helpers_source.jsx:104](../../text_pipeline_helpers_source.jsx#L104) |
| 6 | `getBilingualPromptInstruction` | **Honours it.** Emits a "SINGLE LANGUAGE OUTPUT REQUIRED" block when off. | `AlloFlowANTI.txt` |
| 7 | Outline / graphic organizer | **Honours it.** `_en` field names kept (renderer contract), language asked for is resolved. | dispatcher outline JSON shape |
| 8,9 | Quiz items + explanations | **Honours it.** | dispatcher quiz branch |
| 10 | **Analyze Source Material** | **Fixed and honours it.** No longer reads `currentUiLanguage`. | dispatcher analysis branch |
| 11 | FAQ | **Honours it.** | dispatcher faq branch |
| 12 | Brainstorm | **Honours it.** | dispatcher brainstorm branch |
| 13 | Timeline | **Honours it.** | dispatcher timeline branch |
| 14,15 | Math, all three prompt copies | **Honours it.** | dispatcher, `generation_helpers_source.jsx`, `math_helpers_source.jsx` |
| 16 | Quiz difficulty re-level | **Honours it.** | `generation_helpers_source.jsx` |
| 17,18 | Lesson plan, both entry points | **Fixed and honours it.** Both now send `leveledTextLanguage`; the builder takes a `translationPolicy`. | [concept_map_handlers_source.jsx](../../concept_map_handlers_source.jsx#L538), [prompts_library_source.jsx:109](../../prompts_library_source.jsx#L109) |
| 19,20 | Family guide, study guide | **Honours it.** | `prompts_library_source.jsx` |
| 21,22 | Persona debate and interview | **Honours it.** The `translation` field is set to null when off. | `personas_source.jsx` |
| 23 | Adventure turn/setup/recap | **Not changed.** Lane 10 owns the file. Contract handed over in `CROSS_LANE_REQUESTS.md`; `translationMode` and the resolver are already in the deps object their module receives, so it is a prompt-string change on their side with no plumbing. |
| 24 | Adventure, dispatcher entry | **Honours it** (emitted none before, now says so against the resolved language). |
| 25 | `translateResourceItem` (artifact re-translate) | **Deliberately NOT gated.** |
| 26 | 8 types that emit nothing | Still emit nothing. Left alone; see "For Aaron". |
| out | `translateAccessibleHtml` (PDF/doc translate) | **Deliberately NOT gated.** |

**Why 25 and the PDF path are excluded, explicitly:** both are user-invoked "translate this
artifact into X" actions with their own target-language input. They are not "I generated a
resource and a translation came back attached". Gating them on an include-translations
preference would make an explicitly requested action silently do nothing, which is a worse
failure than the one being fixed.

### New `ui_strings.js` keys, for Lane 5

Added to `ui_strings.js` and mirrored to `desktop/web-app/public/ui_strings.js`:

| Key | English value |
|---|---|
| `universal.translations` | Translations |
| `universal.translations_auto` | Automatic ({language}) |
| `universal.translations_auto_plain` | Automatic |
| `universal.translations_none` | None |
| `universal.translations_on_hint` | Resources in {output} will also include a {target} version. |
| `universal.translations_off_hint` | Resources will be in {output} only, with no second-language version. |
| `output.translation_block` | Translation |
| `output.translation_into` | Translation ({language}) |

`{language}`, `{output}` and `{target}` are runtime placeholders and must survive translation.
Language names themselves are interpolated as data and are not translated. No em dashes or en
dashes; a test asserts that.

One new help key is referenced but not yet defined: `data-help-key="universal_translations"` on
the control. `help_strings.js` is Lane 5's exclusive file, so I did not add the entry.

---

## Verified

| What | Command or observation | Result |
|---|---|---|
| Resolver logic, all branches | `npx vitest run tests/translation_policy.test.js` | 24 passed. New file. Covers the historical default, the immersion case, `off`, non-string junk rejected by type, stale-language fallback, canonical spelling, the empty-target guard, and `generateBilingualText` spending one call instead of two when off. |
| Setting reaches every audited path | `npx vitest run tests/translation_setting_coverage.test.js` | 51 passed. New file. One assertion per inventory row, plus a tripwire on the four "Provide English translations" phrasings, plus a guard that no consumer compares `translationMode` by string. |
| Universal Settings panel not broken | `npx vitest run tests/universal_settings_panel.test.js` | 15 passed, unchanged. Read before editing; the new control adds no `UniversalApplicability` chip, so its `axisFor` map and coverage assertions are untouched. |
| Existing language behaviour | `npx vitest run tests/dispatcher_language_coverage.test.js tests/english_translation_direction.test.js tests/dispatcher_refine_scope.test.js` | 32 passed. |
| Full pack and persistence | `npx vitest run tests/full_pack_generation_diagnostics.test.js tests/full_pack_lesson_dna_guardrails.test.js tests/generation_persistence_migrations.test.js` | 44 passed. |
| Adapted-text citation guards | `npx vitest run tests/citation_repair_conservation.test.js tests/leveled_text_citation_resilience.test.js` | 24 passed. The bilingual compose path was edited, so these matter. |
| Persona helpers | `npx vitest run tests/persona_dialogue_translation.test.js` | 55 passed. |
| Every module I built | `node --check` on all 8 built modules | all parse. |
| `AlloFlowANTI.txt` | `node dev-tools/check_build_smoke.cjs` | "Source: parses cleanly". Run after the last ANTI edit. |
| Deps actually carry the setting | Scripted scan of each `_allo*Deps` builder and the `handleGenerate` shim block | `translationMode` and `resolveTranslationPolicy` present in dispatcher, cmap, phaseK, phaseN, generation-helpers, math-edit, and the personas ref. |

**`npm run verify:gate` fails, on two things I did not touch:**

1. `doc_pipeline_module.js: does NOT parse — Unexpected token (41655:41)`. That file is held by
   another session (`fable-callvolume`), which had the lock for 11 minutes while I worked. It is
   mid-edit, not broken by this lane.
2. `cmd i18n manifest STALE` — 21 missing `cmd.*` keys (`cmd.describe_current_media`,
   `cmd.open_learning_web_explorer`, `cmd.read_media_descriptions`, and others). Those are
   command-palette / AlloBot keys, another lane's in-flight work. My keys are
   `universal.translations*` and `output.translation_*`, none of which are `cmd.*`.

Per RULES section 4 I am reporting these rather than fixing them. Everything before those two
checks passes: `check_render_refs` (448 modules), `check_keyless_map`, `check_stem_render` (144
tools), `check_sel_render` (70 tools), `check_module_render`, `check_lang_json` (63 packs).

**Not verified:** I did not render the control in a browser. The panel builds, the module
parses, and the visibility logic is unit-tested, but I have not looked at the select in the
sidebar. `desktop/web-app/src/App.jsx` is also stale relative to my `AlloFlowANTI.txt` edits,
because nobody in this fleet runs `build.js`; the new state and control will not appear in the
desktop build until you build.

---

## For Aaron

### Decisions I made on your behalf

1. **One selector, not a toggle plus a picker,** with "None" as an option in the same list.
   Reasoning above. If you want the toggle-plus-picker shape instead, the resolver does not
   change; only the panel block does.

2. **`auto` glosses into the app UI language, not into English.** This is the call that makes it
   language-agnostic. It changes nothing for an English interface, which is nearly everyone. It
   changes two cases deliberately: a Spanish-interface teacher writing Spanish content stops
   getting unrequested English glosses, and the same teacher writing English content now gets
   Spanish ones. The second is a small new token cost for non-English-interface users, and it is
   the price of the app not treating English as the language that never needs explaining. Both
   are one selection away from being changed back.

3. **The `--- ENGLISH TRANSLATION ---` delimiter is unchanged, on purpose.** It is a machine
   token parsed in at least five places (`extractSourceTextForProcessing`,
   `BilingualFieldRenderer`, `ENGLISH_TRANSLATION_DELIMITER_RE`, `phase_k_helpers`'s cloze
   repair, `content_engine`'s edit pipeline). Renaming it per language would break every parser
   over an English word no user reads. What the teacher sees is now language-correct: the block
   label resolves to "Translation (Spanish)" when the gloss is Spanish. Same reasoning for the
   `_en` field suffix, which is a data contract with the renderers.

4. **Two "translate this" features are deliberately outside the setting:** the document/PDF
   translate action and `translateResourceItem`. Both are explicit user requests with their own
   target language. If you disagree, that is a one-line change in each, but making an explicitly
   requested action silently no-op seems worse than the bug being fixed.

### Two bugs found and fixed that were not the feature

- **The analysis language leak.** Analyze Source Material read the app UI language, so the whole
  analysis followed the interface language and ignored the Output language setting entirely.
  That is the thing you were unsure about, and you were right to be: it genuinely differed by
  path. It now follows the output language like every other resource.
- **Lesson plan had two entry points sending two different languages.** The sidebar button sent
  the UI language, Full Pack sent the output language, same prompt builder. That is the whole of
  Lane 3's T3, and it was a wiring split rather than a prompt-strength problem. Both now send the
  output language. Noted to Lane 3 in `CROSS_LANE_REQUESTS.md`.

### Deliberately left

- **Adventure** (`adventure_handlers_source.jsx`) is Lane 10's file. Its own three-state language
  control has a "multilingual mix" mode with no equivalent anywhere else, so it may be right for
  it to keep its own control rather than defer to the universal one. Either way its five
  hardcoded "English" gloss strings should become the resolved target. Contract handed over; no
  plumbing needed on their side.
- **Eight resource types emit no translation at all** (sentence frames, concept sort, DBQ,
  note-taking, anchor chart, gemini-bridge, image, alignment report). That is a pre-existing gap
  the audit surfaced, not something the setting caused. I did not add translations to them,
  because "make eight resource types bilingual" is a product decision with a real token cost, not
  a bug fix. If you want it, each is a one-line prompt addition now that the policy is resolved
  in scope.
- **AI-generated source material** (`content_engine_source.jsx:734`) generates in the app UI
  language, with a comment explaining why (the source is the canonical input and must not be
  pre-translated). The reasoning holds for the translation question, but it still means a
  Spanish-interface teacher with an English output language gets Spanish source text. Reported,
  not changed: it is not a translation, it is the primary language of generated content, and
  changing it would move behaviour well outside this lane.
- **The `help_strings.js` entry** for `universal_translations` — Lane 5's exclusive file.

### One thing worth knowing about the shape of the fix

The real defect was never "there is no setting". It was that twenty-six sites each decided for
themselves whether a translation was wanted, and twenty-five of them hardcoded the destination.
Adding a setting on top of that would have produced a control that half the app ignored. So the
change is mostly the consolidation: one resolver, read as a struct, threaded everywhere, with a
test that names each path. The control itself is about forty lines.
