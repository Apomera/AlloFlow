# How to Create an AlloFlow Language Pack (Any Language)

**Audience:** Claude in a future session, or any contributor
**Companion docs:** [`lang/README.md`](README.md) (high-level workflow + CLI batch path) · [`lang/SPANISH_TRANSLATION_HANDOFF.md`](SPANISH_TRANSLATION_HANDOFF.md) (Spanish-specific state)
**Source of truth:** `dev-tools/build_language_pack.cjs` — the CLI mirrors the runtime exactly, so it's the canonical reference for pack structure.

> **Currency note (2026-07-09):** The workflow remains useful, but exact line numbers, pack counts, matcher aliases, and model names drift. Use `lang/README.md`, the current `lang/manifest.json`, and the i18n verification tools before relying on any dated examples below.

This guide is the **in-chat** workflow — for when Aaron wants top-quality hand-translated packs that exceed the live runtime translation fallback. For batch generation of long-tail languages where runtime-model quality is acceptable, use the CLI path documented in `lang/README.md`.

## Why this matters

A language pack does three things:

1. **Lets PPS families pick their home language** from the AlloFlow language picker and immediately see the UI in that language, without any per-user API cost or latency.
2. **Skips runtime translation** for that language — every user who picks it gets the cached pack instead of triggering live `translateChunk` calls to the configured Gemini translation model. Shared across all users, server-side cost = 0.
3. **Provides higher quality** than the runtime fallback. Runtime translation uses DNT masking + domain glossary (decent quality). Hand-translated in chat uses richer cultural context, pedagogical register, and consistency across the entire pack — meaningfully better, and the only path that meets Aaron's "top quality is everything" bar.

---

## 1. How packs plug into AlloFlow at runtime

When a user picks a language, the runtime block in `AlloFlowANTI.txt` (near the `AvailableLanguagesView` component; verify the current line before editing) does this in order:

1. **Fuzzy match the user's input** via `window.AlloLangMatcher.match(userInput)`. The matcher (in `language_matcher_module.js`) has 291 aliases covering:
   - Display name variants (`Spanish (Latin America)` ↔ `spanish_latin_america`)
   - Endonyms (`Soomaali` → Somali, `Kreyòl ayisyen` → Haitian Creole, `普通话` → Chinese Simplified, `العربية` → Arabic)
   - Common misspellings (`spanis` → Spanish, `mandarin chinese` → Chinese Simplified)
   - Locale-aware routing (`Spanish for Mexico` → Spanish Latin America, `Chinese for Taiwan` → Chinese Traditional)
   - Levenshtein fallback ≥0.7 similarity for anything that doesn't hit a direct alias
2. **Try Cloudflare** at `https://alloflow-cdn.pages.dev/lang/<slug>.js`. This is the primary CDN, auto-synced from `desktop/web-app/public/lang/` on every git push.
3. **Fall back to GitHub raw** at `https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/<slug>.js` if Cloudflare is slow.
4. **Fall back to live `translateChunk`** (configured Gemini translation model + DNT masking + domain glossary) for anything without a pre-built pack.

**Important consequence:** Any language without a pre-built pack still works at runtime — it just costs an API call per chunk per user. Pre-built packs are an optimization for the most-used languages, not a gate.

## 2. File layout — where packs live

```
lang/<slug>.js                        # canonical pack (this is what you edit)
desktop/web-app/public/lang/<slug>.js   # exact copy, served by Cloudflare
lang/manifest.json                    # fuzzy matcher reads this to know what packs exist
desktop/web-app/public/lang/manifest.json   # Cloudflare-served copy of manifest
```

The `desktop/web-app/public/lang/` directory is the Cloudflare Pages publish root for the CDN. Files in this directory get served verbatim from `alloflow-cdn.pages.dev/lang/<slug>.js`. The repo's `lang/` directory is the canonical source — you always edit there and mirror via `cp`.

**Critical:** never edit only `desktop/web-app/public/lang/<slug>.js` — the build watcher in `build.js` overwrites it from `lang/<slug>.js` on the next deploy. Edit `lang/<slug>.js` first, then `cp` to the deploy mirror.

## 3. Slug naming convention

Slugs are lowercase ASCII, underscores for spaces, no parentheses or punctuation. The CLI's `localeSlug()` function (`dev-tools/build_language_pack.cjs:276`) is the authority:

```js
function localeSlug(lang) {
  return lang.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
```

Examples (display → slug):

| Display name | Slug |
|---|---|
| Spanish (Latin America) | `spanish_latin_america` |
| Spanish (Castilian) | `spanish_castilian` |
| Haitian Creole | `haitian_creole` |
| Portuguese (Brazil) | `portuguese_brazil` |
| Portuguese (Angola) | `portuguese_angola` |
| Chinese (Simplified) | `chinese_simplified` |
| Chinese (Traditional) | `chinese_traditional` |
| Arabic | `arabic` |
| Arabic (Levantine) | `arabic_levantine` |
| Chin (Hakha) | `chin_hakha` |
| Somali | `somali` |
| Vietnamese | `vietnamese` |
| Karen | `karen` |
| Tigrinya | `tigrinya` |

When in doubt, run the function locally:

```bash
node -e "const s = (lang) => lang.toLowerCase().replace(/[()]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''); console.log(s('Your Language Name (Variant)'));"
```

## 4. Locale variants — when to make a separate pack vs reuse

Mostly captured in `UI_STRINGS_TAXONOMY.md`, but the short version:

| Language family | Default pack | Separate pack(s) for explicit selection |
|---|---|---|
| Spanish | Latin America (most US schools) | Castilian (vosotros, ordenador, móvil, vale) |
| French | French (defaults to European) | French (Canadian) for explicit selection (courriel, magasiner, fin de semaine) |
| Portuguese | Brazil (default in US schools) | Portugal, Angola — separate packs |
| Chinese | Simplified (mainland/Singapore audiences) | Traditional (Taiwan, HK, Macau) |
| Arabic | MSA written | Spoken variants (Levantine, Egyptian, Gulf, Maghrebi, Sudanese) only if explicitly selected |
| Chin | Each variant is a separate pack | Hakha, Falam, Matu, Zomi — PPS has Chin refugee families speaking all of these |

If a user just types "Chinese", the fuzzy matcher routes to `chinese_simplified`. If they type "Chinese (Traditional)" or "繁體中文" or "Chinese for Taiwan", they get `chinese_traditional`. The matcher is in `language_matcher_module.js` — when you add a new language, you may need to add aliases there too.

## 5. Pack structure — what goes inside `lang/<slug>.js`

A pack is **nested JSON** matching the shape of `ui_strings.js` + a special `help_mode` key that merges `help_strings.js`:

```json
{
  "common": { "save": "Guardar", "cancel": "Cancelar", ... },
  "header": { "app_name": "AlloFlow", "tagline": "...", ... },
  "sidebar": { ... },
  ...
  (143 top-level sections from ui_strings.js)
  ...
  "help_mode": {
    "activate": "...",       // 25 keys from ui_strings.help_mode
    "header_ai_backend": "...", // 782 keys from help_strings.js
    ...
  }
}
```

This is what `dev-tools/build_language_pack.cjs:292` produces: `helpFlat['help_mode.' + k] = HELP_STRINGS[k]` for each `help_strings.js` key, merged into the flat translation set, then `unflattenObject()` produces the final nested JSON. You replicate this by writing translations directly under `help_mode`.

The runtime loads the pack and merges it into the global `UI_STRINGS`/`HELP_STRINGS` objects. Missing keys fall back to English (or to runtime translateChunk if configured). **Partial packs are valid** — you can ship a 26% pack and the runtime handles the rest gracefully.

## 6. Source files you'll translate from

| Source | Top-level keys | Total leaf keys | Purpose |
|---|---|---|---|
| `ui_strings.js` | 143 sections | ~8,525 | Every visible UI string |
| `help_strings.js` | 1 flat object | 782 long-form descriptions | Hover-help text shown when user activates Help Mode |

`UI_STRINGS_TAXONOMY.md` documents every section of `ui_strings.js` with key counts and grouping rationale. Use it to estimate batch sizes and pick translation priority order.

## 7. The translation workflow (proven over 30 batches in May 2026)

### Phase A — set up

```bash
mkdir -p c:/tmp/lang_src
# Make sure the pack doesn't already exist:
ls lang/<slug>.js 2>/dev/null && echo "EXISTS — check coverage before starting" || echo "fresh pack"
```

If a partial pack exists (like Haitian Creole at 925 / 10%), continue from where it left off rather than restarting. Run the coverage check:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/<slug>.js','utf8')); function c(o,a){a=a||{n:0};for(const k in o){const v=o[k];if(typeof v==='object'&&v!==null)c(v,a);else a.n++;}return a.n;} console.log('keys:', c(p), 'sections:', Object.keys(p).length);"
```

### Phase B — translate in priority order

Suggested order (most user-visible first, so even a 20%-coverage pack feels useful):

1. `common` (533 keys) — every UI surface uses these
2. Chrome (`header`, `sidebar`, `toolbar`, `launch_pad`, `welcome`, `splash`, `entry`, `meta`, `status`, `errors`, `feedback`, `quick_start`, `codenames`, `fab`, `tools`, `actions`, `large_file`, `formatting`, `audio_player`, `a11y`, `read_this_page`, `roles`, `guided`) — ~400 keys
3. Settings ecosystem (`settings`, `project_settings`, `ai_backend`, `profiles`, `chat`, `chat_guide`, `input`, `prompts`, `language_selector`, `languages`, `languages_list`, `translate`) — ~200 keys
4. Generation pipeline (`wizard`, `process`, `status_steps`, `progression`, `output`, `fullpack`) — ~210 keys
5. `toasts` (184) — appears on every user action
6. Content output types (`analysis`, `simplified`, `outline`, `scaffolds`, `brainstorm`, `glossary`, `glossary_health`, `udl_advice`, `lesson_plan`, `lesson_headers`, `faq`, `quiz`, `visuals`, `visual_director`, `math`) — ~530 keys
7. Teacher block (`alignment`, `standards`, `dashboard`, `session`, `live_polling`, `student`, `student_dashboard`, `teacher`, `tips`, `bot`, `bot_events`, `hints`, `bridge`, `history`, `class_analytics`, `mastery`, `fluency`, `fluency_maze`, `probes`, `games`, `bingo`, `memory`, `matching`, `review_game`, `baking`, `pictionary`, `flashcards`) — ~975 keys
8. Interactive activities (`timeline`, `concept_sort`, `concept_map`, `groups`, `roster`) — ~490 keys
9. `word_sounds` (220), `escape_room` (186) — biggest individual game sections
10. `dbq` (88), `pdf_audit` (71), `persona` (95), `immersive` (48) — content tools
11. Smaller sections + `tour` (52 long-form) + `about` + remaining ~30 small ones — ~600 keys
12. `behavior_lens` (296 + huge nested sub-objects = ~1100 leaf keys) — the largest single section, school-psych clinical
13. `adventure` (432) — biggest student-facing game
14. `help_strings.js` (782 long-form, ~1.2 MB source) — last and largest by character count

Total: ~9,307 leaf keys. Expect ~30 batches of 75 keys each at the proven pace.

### Phase C — the per-batch pattern (75 keys per Edit)

For each batch:

**1. Dump source.** Use the right source file for the section you're on:

```bash
# For ui_strings sections — dump a specific section:
node -e "const fs=require('fs'); const u=new Function('return '+fs.readFileSync('ui_strings.js','utf8').replace(/^\s*\/\/.*\$/gm,'').trim())(); fs.writeFileSync('c:/tmp/lang_src/section.json', JSON.stringify(u.SECTION_NAME, null, 2)); console.log('keys:', Object.keys(u.SECTION_NAME).length);"

# For help_strings (always flat, slice indices):
node -e "const fs=require('fs'); const h=new Function('return '+fs.readFileSync('help_strings.js','utf8').replace(/^\s*\/\/.*\$/gm,'').trim())(); const keys=Object.keys(h).slice(START,END); const b={}; for(const k of keys) b[k]=h[k]; fs.writeFileSync('c:/tmp/lang_src/help_X.json', JSON.stringify(b,null,2)); console.log('keys:', keys.length, 'KB:', Math.round(fs.statSync('c:/tmp/lang_src/help_X.json').size/1024));"
```

**2. Read the dump** with the `Read` tool. Verify it fits in one read (< 25K tokens) — if not, split into two halves.

**3. Translate.** Apply the language-specific quality standards (see section 9 below). Preserve all DNT terms and placeholders verbatim.

**4. Edit the pack.** Use a unique anchor that exists exactly once. For the first section in a new pack, the file ends `}` (single closing brace). After the first section, find the previous section's closing `},` followed by the start of the next section, or use the last entry's value + closing pattern.

For appending to `help_mode`, the proven anchor pattern from the Spanish pack:

```
old_string: "    \"<last_key>\": \"<full value>\"\n  },"
new_string: "    \"<last_key>\": \"<full value>\",\n    \"<new_key_1>\": \"<translation>\",\n    ... 75 entries ...\n    \"<new_key_75>\": \"<translation>\"\n  },"
```

**5. Verify the JSON parses.** Critical — a single unescaped quote breaks the whole file:

```bash
node -e "const fs=require('fs'); try { const p=JSON.parse(fs.readFileSync('lang/<slug>.js','utf8')); function c(o,a){a=a||{n:0};for(const k in o){const v=o[k];if(typeof v==='object'&&v!==null)c(v,a);else a.n++;}return a.n;} console.log('OK', c(p), 'keys'); } catch(e) { console.log('PARSE ERROR:', e.message.slice(0,300)); }"
```

If parse fails, `git checkout lang/<slug>.js` to revert, fix the issue, re-Edit.

**6. Mirror, manifest, commit, push:**

```bash
cp lang/<slug>.js desktop/web-app/public/lang/<slug>.js && \
node dev-tools/update_lang_manifest.cjs && \
git add lang/<slug>.js desktop/web-app/public/lang/<slug>.js lang/manifest.json desktop/web-app/public/lang/manifest.json && \
git commit -m "lang: <Display Name> +75 keys (X total, Y% coverage) - <section> batch N/M" && \
git push origin main
```

**7. Verify Cloudflare** is serving the update (usually 15-30 sec after push):

```bash
curl -sI "https://alloflow-cdn.pages.dev/lang/<slug>.js" | head -3
```

Should return `HTTP/1.1 200 OK` with `Content-Type: application/javascript`.

## 8. The Edit tool — pitfalls and patterns

**Anchor must be unique.** If "    \"close\": \"...\"" appears in multiple sections, the Edit fails. Include enough surrounding context (sibling keys, section boundary `},`) to make the anchor unique.

**Don't break the JSON envelope.** The pack file is a single root `{ ... }` object. When appending sections, change the trailing `}` to `,` then add new content then close with `}`. Track the section boundaries carefully — easy to introduce a missing or extra comma.

**Quotes inside translations.** JSON requires `\"` for literal quotes inside string values. When a source has `"Tip: Click \"Save\" to..."`, your Spanish translation has to maintain the escaping: `"Consejo: Haz clic en \"Guardar\" para..."`. Quote characters used naturally in the language (Spanish ¿¡, French «», CJK 「」, Arabic «») don't need escaping but watch for embedded English in your translation that uses quotes.

**Don't translate keys.** Only translate the values. Keys stay verbatim (`"save": "Guardar"` not `"guardar": "Guardar"`).

**Don't translate source-bug entries.** Some keys have values like `"common.url_placeholder"` (a leaked key path). Preserve these as-is.

## 9. Language-specific quality standards

### Universal DNT (do-not-translate) — preserve verbatim in every language

- **Brand names:** `AlloFlow`, `AlloBot`, `AlloHaven`, `StoryForge`, `LitLab`, `PoetTree`, `SEL Hub`, `STEM Lab`, `Word Sounds Studio`, `BehaviorLens`, `Report Writer`, `Symbol Studio`, `Nano Banana`, `Gemini`, `Imagen`, `Kokoro`, `BINGO`
- **Acronyms (US K-12 SpEd field):** `UDL`, `SEL`, `RTI`, `IEP`, `FERPA`, `FAPE`, `LRE`, `MTSS`, `ELL`, `ASD`, `ADHD`, `CASEL`, `CCSS`, `NGSS`, `TEKS`, `DBQ`, `DOK`, `WCAG`, `ADA`, `BCBA`, `BIP`, `FBA`, `ABA`, `IOA`, `DTT`, `MSWO`, `CBM`, `QTI`, `IMS`, `CDN`, `OCR`, `TTS`, `WCPM`, `DCPM`, `LMS`, `RSVP`, `IPA` (becomes `AFI` in Spanish/French/Italian only)
- **All placeholders:** `{name}`, `{count}`, `{grade}`, `{lang}`, `{score}`, `{{double}}`, `${expr}` — copy braces and inside text exactly
- **All emoji, hex colors, URLs, units** (`5MB`, `24°C`, `60fps`)
- **Markdown:** `**bold**`, `*italic*`, headings, bullets — translate text inside, keep syntax

### Per-language tone guidance

- **Spanish (Latin America):** informal `tú` form for student-facing; "computadora" not "ordenador"; "celular" not "móvil"; "Pestaña" for browser tab; sentence-case headings; "Docente" for gender-neutral teacher
- **Spanish (Castilian):** `tú` for kids, `vosotros` in group contexts; "ordenador", "móvil", "vale" (OK), "ratón" (mouse)
- **French:** `tu` for kids in student-facing UI (NOT `vous` — that's too formal for K-12); standard French unless flagged Canadian
- **French (Canadian):** "courriel" (email), "magasiner" (to shop), "fin de semaine" (weekend); `tu` form
- **Portuguese (Brazil):** "você" informal; "celular" (cell phone); avoid Portuguese-from-Portugal vocabulary like "telemóvel", "computador" (use "celular", "computador" is shared)
- **Haitian Creole:** IPN orthography (not French-influenced spellings); "Anrejistre" (save), "Klike" (click), "Pwofesè" (teacher), "Elèv" (student)
- **Somali:** Latin script (Maxaa-tiri); Northern Somali standard; "Kaydi" (save), "Riix" (click), "Macallin" (teacher), "Arday" (student)
- **Arabic (MSA):** Modern Standard Arabic for written UI; right-to-left rendering handled by browser; use Arabic numerals for in-running-text but Western for code/version refs; honor formal but accessible register
- **Vietnamese:** Use proper diacritics (á, à, ả, ã, ạ, etc.); "bạn" (informal you for kids); "Lưu" (save), "Giáo viên" (teacher)
- **Chinese (Simplified):** Use 简体字; "保存" (save), "教师" (teacher), "学生" (student); use 全角 punctuation in Chinese sentences (，。？！) but 半角 in mixed-language contexts
- **Chinese (Traditional):** Use 繁體字 (Taiwan standard preferred over HK unless flagged); "儲存" (save in Taiwan), "教師", "學生"
- **Tagalog:** Modern Filipino register; "I-save" (save — using "i-" prefix for English borrowings is standard in Pinoy tech UI), "Guro" (teacher), "Mag-aaral" (student)
- **Korean:** 존댓말 (respectful) for student-facing; "저장" (save), "선생님" (teacher), "학생" (student)
- **Japanese:** です・ます form (polite-neutral); "保存" (save), "先生" (teacher), "生徒" (student); use 漢字 for content words, ひらがな for grammar
- **Russian:** Informal "ты" for kids in K-12 (this differs from many adult-facing Russian UIs); "Сохранить" (save), "Учитель" (teacher), "Ученик" (student)
- **Lingala / Kinyarwanda / Swahili / Amharic / Tigrinya / Pashto / Dari / Farsi / Hindi / Bengali / Urdu / Punjabi:** Match the orthography conventions of mainstream educational materials in those languages; use the variant most commonly taught in PPS heritage-language programs; ASK Aaron if uncertain about specific PPS family preferences before committing a stylistic choice

### Pedagogical terms — translate consistently across the pack

These appear hundreds of times. Establish your translation choice early and stick with it:

- scaffold / scaffolding
- differentiation / differentiated instruction
- formative assessment
- reinforcement (in ABA context — different from "refuerzo positivo" everyday usage)
- behavioral function / functional behavior
- antecedent / behavior / consequence (ABC model)
- replacement behavior
- emotional regulation
- growth mindset
- text complexity
- decoding / encoding
- phonemic awareness / phonological awareness / phonics
- multi-tiered system of supports (MTSS) / Response to Intervention (RTI)

A consistency check at the end of the pack: grep the pack for English versions of these terms — they should all be translated. If you find untranslated instances, fix them.

## 10. The fuzzy matcher — adding aliases for new languages

`language_matcher_module.js` has an `ALIASES` map with 291 entries. When you add a new language, also add aliases so users can type variations and reach your pack. Examples for adding Tigrinya:

```js
// Inside ALIASES = { ... }
'tigrinya': 'Tigrinya',
'ትግርኛ': 'Tigrinya',         // endonym
'tigrina': 'Tigrinya',         // common misspelling
'tigrigna': 'Tigrinya',        // alternate Romanization
```

The `_normalize()` function in the matcher lowercases and strips diacritics for matching, so you don't need every casing/accent variant — just the canonical forms. Test additions:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('language_matcher_module.js','utf8');
global.window = {}; global.fetch = async () => ({ ok: false, status: 404 });
eval(src);
(async () => {
  for (const input of ['tigrinya', 'ትግርኛ', 'tigrigna']) {
    const r = await global.window.AlloLangMatcher.match(input);
    console.log(input, '→', r && r.slug, '(conf', r && r.confidence.toFixed(2), ')');
  }
})();
"
```

After editing the matcher, the change ships with the next deploy (no separate step). Aliases never need to wait for a pack to exist — the matcher returns the slug confidence even if no pack is built yet, and the runtime falls through to GitHub raw / live translate accordingly.

## 11. The manifest — what the matcher reads at runtime

`lang/manifest.json` is regenerated automatically by `dev-tools/update_lang_manifest.cjs`. It looks like:

```json
{
  "version": 2,
  "generated": "2026-05-17T...",
  "count": 2,
  "total_keys_expected": 9307,
  "available": [
    { "slug": "haitian_creole", "display": "Haitian Creole", "keys": 925, "bytes": 49293, "updated": "2026-05-17" },
    { "slug": "spanish_latin_america", "display": "Spanish (Latin America)", "keys": 7827, "bytes": 678123, "updated": "2026-05-17" }
  ]
}
```

The matcher's `_loadManifest()` fetches this from Cloudflare and uses the `available` list as the authoritative set of slugs that have pre-built packs. The script automatically converts slug → display name using a `known` dictionary at `dev-tools/update_lang_manifest.cjs:18`. **When you add a new language whose display name doesn't follow the simple title-case pattern, edit that `known` map.** For example:

```js
const known = {
  spanish_latin_america: 'Spanish (Latin America)',
  spanish_castilian: 'Spanish (Castilian)',
  // ... add yours:
  arabic_levantine: 'Arabic (Levantine)',
  chin_hakha: 'Chin (Hakha)',
};
```

## 12. Verification — the full end-to-end check

After committing and pushing your first batch for a new language:

```bash
# 1. Confirm Cloudflare is serving:
curl -sI "https://alloflow-cdn.pages.dev/lang/<slug>.js" | head -3
# Expect: HTTP/1.1 200 OK, application/javascript

# 2. Confirm manifest includes your language:
curl -s "https://alloflow-cdn.pages.dev/lang/manifest.json" | node -e "const i = JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('Manifest has', i.available.length, 'packs:', i.available.map(p => p.slug).join(', '));"

# 3. Confirm matcher resolves the language (run locally, sim. the runtime):
node -e "
const fs=require('fs');
const src = fs.readFileSync('language_matcher_module.js','utf8');
global.window = {}; global.fetch = async () => ({ ok: false, status: 404 });
eval(src);
(async () => {
  for (const input of ['<your language display>', '<endonym>', '<common misspell>']) {
    const r = await global.window.AlloLangMatcher.match(input);
    console.log(input, '→', r && r.slug);
  }
})();
"
```

If all three pass, the pack is live and discoverable. A user in AlloFlow can now pick the language from the dropdown and see translated UI.

## 13. The priority order — which languages to build

This is from `dev-tools/build_priority_packs.cjs` and reflects actual PPS family-language populations:

**Tier 1 (largest PPS populations + critical refugee communities):**
- Spanish (Latin America)
- Haitian Creole
- Somali
- Arabic

**Tier 2 (significant PPS populations + Maine-statewide ELL):**
- Portuguese (Brazil)
- French
- Vietnamese
- Chinese (Simplified)
- Russian

**Tier 3 (long-tail coverage):**
- Tagalog
- Korean
- Japanese
- Ukrainian
- Lingala
- Kinyarwanda
- Swahili
- Amharic

**Tier 4 (extended PPS reach, ~85 more languages):**
- Tigrinya, Pashto, Dari, Farsi, Hindi, Bengali, Urdu, Punjabi, Thai, Khmer, Burmese, Karen, Hmong, Nepali, Mongolian, Spanish (Castilian), Portuguese (Portugal/Angola), Chinese (Traditional), Cantonese, Chin (Hakha/Falam/Matu/Zomi), Rohingya, Yoruba, Igbo, Hausa, Wolof, Twi, Akan, Lao, Indonesian, Malay, Cebuano, Ilocano, Samoan, Fijian, Marshallese, Hebrew, Yiddish, Persian variants, Kurdish variants, additional African/Pacific/indigenous languages...

The priority order is captured in the `TIERS` constant in `dev-tools/build_priority_packs.cjs` — edit there to add new languages to the batch flow.

## 14. When to build a new pack vs let runtime translateChunk handle it

Cost-benefit:

- **Build pre-built pack** if: the language is a Tier 1-3 PPS priority, OR if you (Aaron or Claude) have done at least one careful pass through the pack and want the cached quality for all users.
- **Skip and let runtime handle** if: the language is rare in PPS (handful of families), the time investment is high, AND the runtime model quality with DNT + glossary is acceptable. Users still get a working translated UI — just at slightly lower quality and per-user API cost.

Threshold rule of thumb from Aaron's prior decisions: anything with **>3 PPS families** speaking it gets a pre-built pack; rare languages can wait for runtime.

## 15. Pitfalls log (things prior sessions got wrong)

1. **Delegating to Task agents.** General-purpose Task agents reliably write dictionary-substitution scripts instead of doing actual LLM translation. Output is Spanglish for long passages. Documented in `memory/feedback_agents_take_shortcuts_on_translation.md`. **Never use sub-agents for translation work** — do it directly in chat or run the CLI.
2. **Running CLI batch after hand-translating.** `npm run build:lang -- --lang="Spanish (Latin America)"` would overwrite the hand-translated pack with Flash output. Lower quality. Don't.
3. **Editing only deploy mirror.** Edits to `desktop/web-app/public/lang/<slug>.js` get overwritten on the next deploy by the build watcher copying from `lang/<slug>.js`. Always edit canonical first, mirror after.
4. **Not updating the manifest.** If you commit a new pack without running `node dev-tools/update_lang_manifest.cjs`, the runtime matcher won't know it exists and will fall through to runtime translate. Always regenerate manifest before commit.
5. **Translating DNT terms.** Breaking the DNT list breaks search alignment, breaks brand recognition, breaks placeholder substitution. Especially watch for: `BINGO` (looks translatable but it's a brand), `XP` (gaming term, don't translate), `RTI` / `MTSS` / `IEP` (legal/educational terms that translate differently per country and would confuse PPS-aligned content).
6. **Mixing locale variants.** A "Spanish" pack with mixed Castilian and Latin American vocabulary creates inconsistency. Pick one variant per pack and stick with it.
7. **Forgetting to push to origin.** Cloudflare deploys from GitHub `main` branch. A local commit doesn't ship. Always `git push origin main` after committing.

## 16. Working with Aaron

He's the solo creator of AlloFlow, school psychologist at King Middle (Portland Public Schools, Maine). He values:

- **Honest assessment over optimistic excuses.** If you can't finish 100 languages in one session, say so upfront.
- **Top quality over speed.** He has Claude Max — he'd rather you take more turns to get the translation right than rush through with mediocre output.
- **Persistence over apologizing.** When a task is genuinely big, just keep working through it batch by batch. He's said "I'm not in a rush" multiple times.
- **Concrete progress over status hedging.** Commit and push frequently so he can verify the work is real.

Memory notes about Aaron that matter for this work:

- He explicitly rejected agent-delegated translation after seeing the Spanglish output (May 2026)
- He explicitly chose in-chat Claude translation (his "Option B") over CLI Flash batch
- He acknowledged the task is herculean and is fine with multi-session
- He doesn't use em dashes or en dashes in user-facing writing (saved in memory)
- He prefers shipping content and iterating from real feedback over gating on pre-deploy review

## 17. Quick reference — the most-used commands

```bash
# Check coverage of any pack:
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/<slug>.js','utf8')); function c(o,a){a=a||{n:0};for(const k in o){const v=o[k];if(typeof v==='object'&&v!==null)c(v,a);else a.n++;}return a.n;} console.log(c(p), 'keys •', Object.keys(p).length, 'sections •', Math.round(fs.statSync('lang/<slug>.js').size/1024), 'KB');"

# Dump a section from ui_strings.js:
node -e "const fs=require('fs'); const u=new Function('return '+fs.readFileSync('ui_strings.js','utf8').replace(/^\s*\/\/.*\$/gm,'').trim())(); fs.writeFileSync('c:/tmp/lang_src/<name>.json', JSON.stringify(u.<SECTION>, null, 2)); console.log('keys:', Object.keys(u.<SECTION>).length);"

# Dump help_strings slice:
node -e "const fs=require('fs'); const h=new Function('return '+fs.readFileSync('help_strings.js','utf8').replace(/^\s*\/\/.*\$/gm,'').trim())(); const keys=Object.keys(h).slice(START,END); const b={}; for(const k of keys) b[k]=h[k]; fs.writeFileSync('c:/tmp/lang_src/help_X.json', JSON.stringify(b,null,2)); console.log('keys:', keys.length);"

# Validate JSON parse:
node -e "try { JSON.parse(require('fs').readFileSync('lang/<slug>.js','utf8')); console.log('OK'); } catch(e) { console.log('ERR:', e.message.slice(0,200)); }"

# Mirror + manifest + commit + push (the standard per-batch ending):
cp lang/<slug>.js desktop/web-app/public/lang/<slug>.js && \
node dev-tools/update_lang_manifest.cjs && \
git add lang/<slug>.js desktop/web-app/public/lang/<slug>.js lang/manifest.json desktop/web-app/public/lang/manifest.json && \
git commit -m "lang: <Display Name> +N keys (TOTAL total, X% coverage) - <section> batch M/N" && \
git push origin main

# Verify Cloudflare:
curl -sI "https://alloflow-cdn.pages.dev/lang/<slug>.js" | head -3

# Test the matcher resolves to your slug:
node -e "
const fs=require('fs');
const src = fs.readFileSync('language_matcher_module.js','utf8');
global.window = {}; global.fetch = async () => ({ ok: false, status: 404 });
eval(src);
(async () => {
  const r = await global.window.AlloLangMatcher.match('<USER INPUT>');
  console.log('→', r);
})();
"
```

## 18. TL;DR

1. Pick a target language. Confirm slug, locale variant choice, and PPS priority tier.
2. Add aliases for the language to `language_matcher_module.js` if it's not already there.
3. Add the slug → display mapping to `dev-tools/update_lang_manifest.cjs` if non-trivial.
4. Create `lang/<slug>.js` starting with `{}` or copy structure from another pack.
5. Translate in priority order (common → chrome → settings → toasts → content → games → behavior_lens → adventure → help_strings).
6. 75 keys per batch. One Edit per batch. Verify parse. Mirror to deploy. Regenerate manifest. Commit with descriptive message. Push.
7. Verify Cloudflare serves the pack and the matcher resolves user input to your slug.
8. Repeat until ~92% coverage (the manifest counter's effective cap due to array entries).
9. Aaron sees the pack live in production at `alloflow-cdn.pages.dev/lang/<slug>.js` and PPS families can pick it from the language selector.

The work is mechanical once the workflow is internalized. The quality is in the translation craft — get the locale right, preserve DNT terms religiously, maintain consistent pedagogical vocabulary across the whole pack, and respect the K-12 SpEd register.
