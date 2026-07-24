# Spanish (Latin America) Translation Handoff

> **Historical batch handoff, not current pack status (2026-07-09):** This May 2026 note is kept as a reference for the successful Spanish help-string workflow. The current workspace pack is much larger (`lang/spanish_latin_america.js`: 17,601 keys, 165 top-level sections in this checkout). Use `lang/README.md`, `PACK_QUALITY_STATUS.md`, and the current i18n verification tools for present coverage/readiness.

**For:** Claude (next session) — Spanish pack is now COMPLETE; this doc is a reference for future language packs.
**As of:** 2026-05-18, commit `e6f108b9` on `main` branch
**Status:** ✅ DONE. 8,440 keys translated, ~90% coverage. All 11 help_strings batches shipped to Cloudflare.

## Final tally (Spanish complete)

- `lang/spanish_latin_america.js` — 1,025 KB, 131 sections, 8,440 total keys
- `help_mode` section: **782/782 help_strings keys translated** + 14 ui_strings.help_mode keys = 796 help_mode entries
- All `ui_strings.js` top-level sections: 100% translated
- Live on Cloudflare CDN at `alloflow-cdn.pages.dev/lang/spanish_latin_america.js`

## The job in one sentence (historical)

Translate the entries of `help_strings.js` (hover-help text shown when users activate Help Mode) into Latin American Spanish, adding them to the existing `help_mode` section of `lang/spanish_latin_america.js`, in batches of 75 keys per Edit.

## Previous pack state (kept for reference of the batch workflow)

- File: `lang/spanish_latin_america.js`
- Top-level sections: 131 (all 100% translated)
- `help_mode` section: 400 keys done (25 from `ui_strings.help_mode` + 375 from `help_strings.js`)
- `help_strings.js` has 782 total keys; **0 remain** ✅

Verify state at any time:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/spanish_latin_america.js','utf8')); function count(o,a){a=a||{n:0}; for(const k in o){const v=o[k]; if(typeof v==='object'&&v!==null)count(v,a); else a.n++} return a.n;} console.log('Spanish:',count(p),'keys •',Object.keys(p).length,'sections •',Math.round(fs.statSync('lang/spanish_latin_america.js').size/1024)+'KB •','help_mode:',Object.keys(p.help_mode).length,'keys');"
```

## The per-batch workflow (proven, ~5 min/batch)

### Step 1 — Dump the next 75 source keys to a tmp file

```bash
# Adjust the slice indices for which batch you're on:
# Batch 6: slice(375, 450)
# Batch 7: slice(450, 525)
# Batch 8: slice(525, 600)
# Batch 9: slice(600, 675)
# Batch 10: slice(675, 750)
# Batch 11: slice(750, 782) — last batch, only 32 keys

node -e "const fs=require('fs'); const h=new Function('return '+fs.readFileSync('help_strings.js','utf8').replace(/^\s*\/\/.*\$/gm,'').trim())(); const keys=Object.keys(h).slice(375,450); const b={}; for(const k of keys) b[k]=h[k]; fs.writeFileSync('c:/tmp/lang_src/help_chunk_f.json', JSON.stringify(b,null,2)); console.log('keys:', keys.length, 'size:', Math.round(fs.statSync('c:/tmp/lang_src/help_chunk_f.json').size/1024)+'KB');"
```

### Step 2 — Read the chunk

```
Read c:/tmp/lang_src/help_chunk_f.json
```

The dump is ~35-45 KB. Reads cleanly in one Read call.

### Step 3 — Build the Edit

Find the **last** key currently in the `help_mode` section. The pack ends `help_mode` with `},` followed by `behavior_lens: {`. You need a unique anchor for the Edit tool.

To find the current last help_mode key:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/spanish_latin_america.js','utf8')); const keys=Object.keys(p.help_mode); console.log('Last key:', keys[keys.length-1]); console.log('Value:', p.help_mode[keys[keys.length-1]].slice(0,80));"
```

Then construct the Edit. The pattern (use the exact ending of the current last entry as your `old_string` anchor):

```
old_string:
    "<last_key>": "<full Spanish translation value>"
  },

new_string:
    "<last_key>": "<full Spanish translation value>",
    "<new_key_1>": "<Spanish translation>",
    "<new_key_2>": "<Spanish translation>",
    ... (all 75 new keys)
    "<new_key_75>": "<Spanish translation>"
  },
```

**Critical:** the trailing `},` after `help_mode` closes the section and `behavior_lens` follows. Don't break that structure.

### Step 4 — Verify, mirror, commit, push

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/spanish_latin_america.js','utf8')); function count(o,a){a=a||{n:0}; for(const k in o){const v=o[k]; if(typeof v==='object'&&v!==null)count(v,a); else a.n++} return a.n;} console.log('Spanish:',count(p),'keys • help_mode:',Object.keys(p.help_mode).length);" && \
cp lang/spanish_latin_america.js desktop/web-app/public/lang/spanish_latin_america.js && \
node dev-tools/update_lang_manifest.cjs && \
git add lang/spanish_latin_america.js desktop/web-app/public/lang/spanish_latin_america.js lang/manifest.json desktop/web-app/public/lang/manifest.json && \
git commit -m "lang: Spanish +75 keys (X total, Y% coverage) - help_strings batch N/11" && \
git push origin main
```

Cloudflare auto-deploys from main. Pack is live within ~30 seconds at `alloflow-cdn.pages.dev/lang/spanish_latin_america.js`.

## Translation quality standards

### Spanish (Latin America) conventions used in the pack so far

- **Computer** → "computadora" (NOT "ordenador" — that's Castilian)
- **Cell phone** → "celular" (NOT "móvil")
- **Click** → "haz clic" (informal "tú" form throughout — student-facing)
- **You** → "tú" (informal; `usted` is too formal for the K-12 register established in this pack)
- **OK / On / Off** → translated as "Aceptar / ENCENDIDO / APAGADO" in toasts but kept short in toggles
- **Save** → "Guardar", **Cancel** → "Cancelar", **Delete** → "Eliminar"
- **Toggle** → "Alternar"
- **Tab (UI)** → "Pestaña"
- **Lesson plan** → "Plan de lección" (LatAm) — NOT "secuencia didáctica" (that's Spain)
- **Grade level** → "Nivel de grado"
- **Student** → "Estudiante" (inclusive); "alumno" only when the source explicitly distinguishes
- **Teacher** → "Docente" (gender-neutral); "Maestro" is fine in elementary context
- **Family** → "Familia" (NOT "padres" — be inclusive of caregivers)
- **English Language Learner / ELL** → "estudiante de inglés como segundo idioma"

### Do-not-translate (DNT) terms — preserve verbatim

- All brand names: `AlloFlow`, `AlloBot`, `AlloHaven`, `StoryForge`, `LitLab`, `PoetTree`, `SEL Hub`, `STEM Lab`, `Word Sounds Studio`, `BehaviorLens`, `Report Writer`, `Symbol Studio`, `Nano Banana`, `Gemini`, `Imagen`, `Kokoro`, `BINGO`
- All acronyms: `UDL`, `SEL`, `RTI`, `IEP`, `FERPA`, `FAPE`, `LRE`, `MTSS`, `ELL`, `ASD`, `ADHD`, `CASEL`, `CCSS`, `NGSS`, `TEKS`, `DBQ`, `DOK`, `WCAG`, `ADA`, `BCBA`, `BIP`, `FBA`, `ABA`, `ABC` (Antecedente-Conducta-Consecuencia uses initials as-is), `IOA`, `DTT`, `MSWO`, `CBM`, `QTI`, `IMS`, `CDN`, `OCR`, `TTS`, `WCPM`, `DCPM`, `LMS`, `RSVP`, `IPA` (becomes AFI in Spanish), `JSON`, `CSV`, `PDF`, `PPTX`, `HTML`
- All `{placeholders}`: `{name}`, `{count}`, `{grade}`, `{lang}`, `{score}`, `${i + 1}` etc. — copy exactly, including the braces
- All `{{double-brace}}` placeholders — copy exactly
- All emoji — keep as-is
- All units: `5MB`, `24°C`, `60fps`, `15px`, `100 XP`, etc.
- All hex colors and URLs
- All `**bold**` and `*italic*` markdown — translate the text inside, preserve the markers

### Source-bug entries (leave as-is)

Some `glossary_*`, `concept_sort_*`, etc. keys have values like `"common.url_placeholder"` (the key path leaked into the value as a bug during i18n consolidation). Preserve these literal strings rather than translating them — they're never user-visible properly anyway.

### Tone / register

- Imperative form for buttons: "Guardar", "Generar", "Comenzar" (NOT "Guarda", "Genera")
- Sentence-form for help text: tutorial-style, second person ("Cuando haces clic...", "Úsalo para...")
- "Consejo:" for "Tip:" callouts
- "Consejo Pro:" for "Pro tip:"
- Pedagogical terms use the K-12 SpEd field standard: "andamiaje" (scaffold), "diferenciación" (differentiation), "evaluación formativa" (formative assessment), "regulación emocional" (emotional regulation), "reforzamiento" (reinforcement, in ABA context), "función conductual" (behavioral function)

## Pace optimization — what works

1. **75 keys per Edit** is the proven sweet spot. The help_strings dump is ~40 KB source, output ~45 KB Spanish. Fits comfortably in one Edit.
2. **Don't over-batch** — 100+ keys per Edit risks JSON corruption if any single translation has a quote issue.
3. **Build the new_string in one shot.** Don't try multiple small Edits to grow the section incrementally.
4. **Verify parse before pushing.** The `node -e` count command will throw on JSON errors. If it does, the Edit broke the JSON — revert with `git checkout lang/spanish_latin_america.js` and rebuild the Edit.
5. **One commit per batch.** Don't accumulate; ship each batch independently. Commit messages follow the pattern: `lang: Spanish +75 keys (X total, Y% coverage) - help_strings batch N/11`.

## Pace optimization — what to avoid

- **Don't translate keys.** Keys stay English (`glossary_etymology_info` etc.). Only values get translated.
- **Don't use the Task agent.** Past sessions tried this; agents wrote dictionary-substitution scripts that produced Spanglish. Translate directly in chat (see memory note `feedback_agents_take_shortcuts_on_translation`).
- **Don't run `npm run build:lang` to fill help_strings.** That would Flash-translate everything and overwrite the careful hand-translations already in the pack. The user explicitly committed to in-chat top-quality translation.
- **Don't restructure the pack.** The `help_mode` section under root is the correct location. The runtime expects nested JSON matching `ui_strings.js` shape, with `help_strings.js` keys merged into `help_mode` (per `dev-tools/build_language_pack.cjs:292`).
- **Don't add new top-level sections.** All 143 ui_strings sections are already present.
- **Don't escape unicode.** Write Spanish characters directly (á, é, í, ñ, ¿, ¡, etc.). The file is UTF-8.

## What's left, batch-by-batch

| Batch | Source slice | Approx coverage after | Themes (from a quick scan) |
|------|--------------|----------------------|----------------------------|
| 6 | `slice(375, 450)` | ~87% | Word Sounds detailed help, scaffolds detail, simplified deep features |
| 7 | `slice(450, 525)` | ~88% | Sidebar tool tours, FAB tools, fluency / probes UI |
| 8 | `slice(525, 600)` | ~89% | Document builder, immersive reader detail, behavior_lens tool help |
| 9 | `slice(600, 675)` | ~90% | Behavior_lens FBA/BIP/SCD/IOA tool descriptions |
| 10 | `slice(675, 750)` | ~91% | Behavior_lens analytics/safety, modals, advanced features |
| 11 | `slice(750, 782)` | ~91-92% | Tail end — small leftovers, ~32 keys |

**Note:** Final coverage tops out around ~92% because the pack count includes some array values (codenames adjectives/animals — 100 leaf strings) that the runtime treats as units. The actual user-facing coverage after batch 11 will be effectively 100% of what users see.

## Verification — what the user sees

After each batch is pushed:

```bash
curl -sI "https://alloflow-cdn.pages.dev/lang/spanish_latin_america.js" | head -3
```

Should return `HTTP/1.1 200 OK` with `Content-Type: application/javascript` within ~30 sec of push.

The runtime in `AlloFlowANTI.txt` (the `AvailableLanguagesView` block around line 1243) tries this URL first when a user picks "Spanish (Latin America)" (or any fuzzy match like "spanish", "español", "Spanish for Mexico" — all resolve to `spanish_latin_america` via the fuzzy matcher).

## Sample of the proven Edit pattern (from batch 5)

```
Edit:
  old_string:
      "quiz_student_question": "La pregunta actual que necesitas responder."
    },
  new_string:
      "quiz_student_question": "La pregunta actual que necesitas responder.",
      "quiz_student_answer_option": "Selecciona esta respuesta si crees que es correcta...",
      ... 74 more new entries ...
      "scaffolds_grading": "Habilita la interfaz de calificación del docente..."
    },
```

The closing `},` belongs to `help_mode`. Don't remove it. Just change the prior key's trailing nothing to `,` and append your new entries before the `},`.

## If something goes wrong

- **JSON parse error after Edit:** `git checkout lang/spanish_latin_america.js` then rebuild the Edit. Check for unescaped quotes inside translation values (use `\"` for literal quotes inside JSON string values).
- **Wrong anchor for Edit:** the file may have changed between sessions. Run the "find last help_mode key" command above to get the current anchor.
- **`update_lang_manifest.cjs` reports lower keys than `count`:** normal — manifest counts leaf scalars only; nested objects count differently. Both numbers are fine.
- **Push rejected (non-fast-forward):** another commit landed first. `git pull --rebase` then push.

## Commit history for context

This session's commits (most recent first):

```
4a962970 lang: Spanish +75 keys (8,044 total, 86% coverage) - help_strings batch 5/11
15bda924 lang: Spanish +75 keys (7,969 total, 86% coverage) - help_strings batch 4/11
6dbb7c30 lang: Spanish +75 keys (7,894 total, 85% coverage) - help_strings batch 3/11
35f6ce8c lang: Spanish +75 keys (7,819 total, 85% coverage) - help_strings batch 2/11
e3d45960 lang: Spanish +75 keys (7,744 total, 83% coverage) - help_strings batch 1/11
4dec037a lang: Spanish +439 keys (7,669 total, 82% coverage) - behavior_lens fully complete
5b877f72 lang: Spanish +263 keys (7,415 total, 79% coverage) - behavior_lens ph+toast
72aa1d2b lang: Spanish +526 keys (6,152 total, 66% coverage) - behavior_lens batch A
... (and many more — full history available via `git log --oneline lang/spanish_latin_america.js`)
```

## The user

Aaron Pomeranz, PsyD, solo creator of AlloFlow. Stationed at King Middle (Portland Public Schools, Maine). PPS has Spanish-speaking families that need this pack. He explicitly:

- Wants top quality (rejected agent shortcuts that produced Spanglish)
- Committed to in-chat translation, not runtime-model batch generation
- Said "I'm not in a rush" — multi-session is fine
- Said "Almost done you're doing great!" after batch 5 — he's been monitoring progress and the pack is loading correctly

When you ship the final batch, mention that `Spanish (Latin America)` is now the first language with full hand-translated Claude-quality coverage and that the same workflow can be applied to `Haitian Creole` (currently at 925 / 10% — only common + chrome + toasts done) and the other PPS-priority languages.

## TL;DR for the next Claude

1. Dump 75 next keys from `help_strings.js` to `c:/tmp/lang_src/help_chunk_X.json`
2. Read it
3. Translate everything to Spanish (LatAm), keeping the quality standards above
4. Edit `lang/spanish_latin_america.js` to insert before `help_mode`'s closing `},`
5. Verify parse, mirror to deploy, regenerate manifest, commit, push
6. Repeat for batches 6 → 11
7. After batch 11, write a final ship commit summarizing the achievement and recommend the same approach for the other priority languages
