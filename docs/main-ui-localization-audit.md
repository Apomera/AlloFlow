# Main UI localization audit

Audited on 2026-08-20 with Playwright by comparing the English and Spanish (Latin America) main-shell UI, then tracing visible English text back to source and checking every deployed language pack.

## Surfaces found

| Surface | Main-shell keys | Missing pack entries | Packs affected |
| --- | ---: | ---: | ---: |
| Reading Library | 373 | 4,535 | 14 |
| AI setup | 123 | 1,231 | 14 |
| Tool finder | 25 | 306 | 14 |
| Documents / export menu | 29 | 274 | 14 |
| Quick Start | 6 | 44 | 14 |
| Student tools | 5 | 56 | 14 |
| Canvas local storage | 3 | 42 | 14 |
| Header voice controls | 2 | 9 | 7 |
| AlloBot landmark / movement help | 2 | 28 | 14 |
| Header recall hint | 1 | 14 | 14 |
| Pane-resize accessibility text | 1 | 14 | 14 |
| Error reporter badge | 1 | 14 | 14 |
| **Total** | **571** | **6,567** | **14 packs with gaps** |

Counts represent missing key/pack combinations, not unique English phrases. Exact translations already present elsewhere in the same pack filled 2,789 entries, and compatible regional-pack reuse plus reviewed text filled another 12,440. Forty-nine packs now cover all 571 audited keys: Acholi, Amharic, Arabic, Bengali, Burmese, both Chinese variants, Hakha Chin, Dari, Dutch, Esperanto, Farsi, French, French Canadian, German, Greek, Gujarati, Haitian Creole, Hebrew, Hindi, Hmong, Indonesian, Italian, Japanese, Kannada, Korean, Malayalam, Marathi, Nepali, Pashto, Polish, all three Portuguese variants, Punjabi, Romanian, Russian, Castilian Spanish, Latin American Spanish, Somali, Swahili, Tagalog, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, and Vietnamese. Fourteen packs still have at least one Reading Library gap and need broader catalog work.

## Source fixes made

- Replaced the audited hardcoded display text with localization lookups in Quick Start, Student Tools, AlloBot, header voice controls, and AI setup.
- Follow-up shell scans removed hardcoded labels from the language selector, study timer, XP modal, persona private-session controls, onboarding coach, and sentence-frame controls by reusing keys already translated in all 63 packs.
- Added the missing English registry keys so every literal localization call resolves.
- Corrected language-code selection for Spanish, French, Portuguese, Chinese, and Latin variants so the document language and speech language do not silently fall back to English.
- Added an incremental translation sync tool and a CI parity check for the audited main-shell surfaces. The sync preserves placeholders and existing translations and writes both root and desktop mirrors.
- Added safe offline reuse for exact in-pack translations and explicitly compatible regional variants. Existing regional text always wins, and mirror drift blocks writes.

## Verification

- `node dev-tools/check_translation_keys.cjs` — passes; no missing literal keys.
- `node dev-tools/check_lang_json.cjs` — passes for all 63 packs.
- `node dev-tools/check_lang_duplicate_keys.cjs` — passes; no duplicate object keys are hidden by JSON parsing.
- `npm exec -- vitest run tests/speech_language_codes.test.js` — passes.
- `node dev-tools/check_main_ui_pack_parity.cjs` — intentionally fails until the missing translations above are supplied.

To inspect current counts without writing files:

```powershell
node dev-tools/i18n/sync_main_ui_translations.cjs
```

To add only missing translations when an authorized translation provider is available:

```powershell
node dev-tools/i18n/sync_main_ui_translations.cjs --apply --translate --provider=google-cloud --api-key=YOUR_KEY
```

The tool also supports the public NLLB Space for its exact FLORES-200 language mappings. Because that sends English UI strings to a third party, use it only with explicit data-sharing approval:

```powershell
node dev-tools/i18n/sync_main_ui_translations.cjs --apply --translate --provider=nllb-space --supported-only
```

To apply safe offline translation-memory and regional-variant reuse:

```powershell
node dev-tools/i18n/sync_main_ui_translations.cjs --apply --sibling-reuse
```

Do not use `--fallback-english` to claim completion: it makes pack shape complete but leaves the UI English.
