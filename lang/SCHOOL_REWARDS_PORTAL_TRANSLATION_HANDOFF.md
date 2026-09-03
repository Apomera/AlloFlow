# School Rewards Portal Translation Handoff

**As of:** 2026-09-03

The School Rewards portal is the one AlloFlow surface that cannot use the shared
translation helper or the 63 `lang/*.js` packs: Google serves it from the school's
own Apps Script project, so it has no access to the app's runtime. Its English lives
in `apps_script/school_rewards/portal_strings.json` and each language is a file in
`apps_script/school_rewards/i18n_src/`. Run `node _build_school_rewards_i18n.js` after
editing either.

## What a translator does

1. Copy `i18n_src/es.json` to `i18n_src/<code>.json` and set `code`, `name` (the
   language's own name, shown in the menu), and `englishName`.
2. Translate the values under `strings`. Keys are shared with the catalogue; the
   English for each key is in `portal_strings.json`.
3. Translate the values under `patterns`. These contain numbered placeholders such
   as `{1}`. Every placeholder in the English must appear in the translation, and
   they may be reordered freely. The build fails if one is dropped or invented.
4. Leave a key out rather than guessing. Missing keys fall back to English at
   runtime, and the language menu shows each language's coverage.

## Do not translate

School-entered content: prize names, recognition category names, student names,
the school name, and store window names. Those belong to the school.

## Current coverage

| Language | Coverage | Entries |
| --- | --- | --- |
| English (en) | 100% | 353/353 |
| Español (es) | 100% | 353/353 |

A language is treated as complete at 95% or above; below that the menu
shows the percentage so nobody chooses a language expecting a translated portal.

## Not covered by these packs

Balance statement emails are rendered by `Code.gs`, not the portal, and exist only in
English and Spanish. A student whose portal is set to another language still receives
English email. That is a separate piece of work in `statementCopy_`.

## Untranslated entries (0 of 353)

| Key | English | Have |
| --- | --- | --- |
