---
name: ui-strings-management
description: Safe editing and validation of ui_strings.js — prevents JSON parse errors, verifies key coverage, handles nested section structure
---

# UI Strings Management Skill

## Context
`ui_strings.js` is a **pure JSON file** fetched at runtime from `raw.githubusercontent.com/Apomera/AlloFlow/main/ui_strings.js`. The app calls `JSON.parse()` on it — any syntax error (e.g., trailing commas) causes a **silent failure** leaving `UI_STRINGS` empty and breaking all localized text.

## Validation After Every Edit

After modifying `ui_strings.js`, always run this validation:

```python
import json
with open('ui_strings.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix trailing commas (JSON doesn't allow them)
import re
fixed = re.sub(r',(\s*[\]}])', r'\1', content)

try:
    data = json.loads(fixed)
    print(f"✅ Valid JSON: {len(data)} top-level keys")
    if fixed != content:
        with open('ui_strings.js', 'w', encoding='utf-8') as f:
            f.write(fixed)
        print("⚠️ Fixed trailing commas and saved")
except json.JSONDecodeError as e:
    print(f"❌ INVALID: {e.msg} at L{e.lineno}, col {e.colno}")
```

## Structure
The file is a flat JSON object with nested sections:
```json
{
  "common": { "ok": "OK", "cancel": "Cancel", ... },
  "settings": { "voice": { "label": "Voice" }, ... },
  "word_sounds": { ... },
  "adventure": { ... },
  ...
}
```

## Key Rules
1. **No trailing commas** — JSON is NOT JavaScript
2. **No comments** — JSON doesn't support `//` or `/* */`
3. **Escape unicode properly** — Avoid raw surrogate pairs (`\uD83C\uDFAF`); use the actual emoji character instead
4. **Keys must be double-quoted strings**
5. **After every edit**: run the validation script above
6. **Test locally**: The app fetches from GitHub raw URL, so changes won't appear until pushed to `main`

## Propagating new strings to the 56 language packs

`ui_strings.js` is the **English master**. There are 56 pre-built translation
packs in `lang/*.js` (mirrored to `desktop/web-app/public/lang/`) that must
gain any key you add here, or non-English users see English fallback. The
toolchain (see `dev-tools/i18n/README.md` and `lang/README.md` for full detail):

- `npm run build:lang:resume` — adds new keys to every existing pack via the
  Gemini builder, preserving existing translations verbatim.
- `npm run build:lang:manifest` — regenerates `lang/manifest.json`.
- Validators (run by the deploy gate): `dev-tools/check_lang_json.cjs`
  (`verify:translations`-adjacent; ensures every pack is valid JSON) and
  `dev-tools/i18n/check_safety_string_spanglish.cjs` (blocks half-translated
  `alerts.*`/`confirms.*` safety strings).
- Community translation corrections arrive via the Cloudflare worker
  (`/submitTranslation`) and are applied with
  `dev-tools/i18n/ingest_translation_feedback.cjs --apply` (manual review gate).

Document any `{placeholders}` on the source line — the builder and validators
key on them.
