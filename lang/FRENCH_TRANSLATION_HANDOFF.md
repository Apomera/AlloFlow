# French (Parisian/Metropolitan) Translation Handoff

> **Historical batch handoff, not current pack status (2026-07-09):** This May 2026 note preserves the workflow that finished early French sections. The current workspace pack is much larger (`lang/french.js`: 17,370 keys, 162 top-level sections in this checkout). Use `lang/README.md`, `PACK_QUALITY_STATUS.md`, and the current i18n verification tools before treating any remaining-task list below as active.

**Original recipient:** Claude, for the May 2026 French pack translation work
**As of:** 2026-05-18, commit `03773062` on `main` branch
**Status:** 8,748 / ~9,500 keys (~92% coverage). All 143 ui_strings sections COMPLETE. Only help_strings.js (782 hover-help keys) remain.

## The job in one sentence

Historical May task: translate the then-remaining `ui_strings.js` and `help_strings.js` entries into Parisian/Metropolitan French, adding them to the existing sections of `lang/french.js`, in batches of 75-200 keys per Edit depending on section size.

## What's DONE

37 sections (5,164 keys) are 100% complete and live on Cloudflare. Highlights:
- All foundation sections (common, header, sidebar, wizard, toasts, tour, etc.)
- Word Sounds Studio, Adventure Mode (432 keys), BehaviorLens (~1100 leaves), Escape Room
- Quiz, Persona, DBQ, Glossary, Simplified Text, Lesson Plan, Concept Sort
- Roster, Class Analytics, Fluency, Groups, PDF Audit (massive section), Export, Session

Earlier session details preserved below for reference:

| Section | Keys | Notes |
|---|---|---|
| `common` | 533 | Core UI vocabulary used everywhere |
| `header` | 41 | Top bar, language picker, export, AI backend |
| `sidebar` | 39 | Tool navigation menu (left rail) |
| `history` | 25 | Session/project history panel |
| `input` | 27 | Source input panel + grade levels (K → Terminale) |
| `meta` | 21 | Resource metadata badges |
| `errors` | 23 | Error toast messages |
| `status` | 27 | Status indicators (Loading, Saving, Syncing) |
| `formatting` | 6 | Markdown formatting hints |
| `feedback` | 4 | Level-up celebration UI |
| `translate` | 4 | Translation panel labels |
| `a11y` | 10 | Accessibility shortcuts |
| `settings` | 25 | Reading/typography/voice settings (incl. nested) |
| `large_file` | 14 | Audio/video chunking flow |
| `tour` | 52 | Full onboarding walkthrough (long pedagogical descriptions) |
| `launch_pad` | 20 | App-mode selector home screen |
| `guided` | 10 | Guided-mode navigation |
| `wizard` | 97 | Quick Start wizard (first-user setup) + nested tones/lengths/dok_levels |
| `toasts` | 184 | All user-facing feedback messages |

## What's REMAINING

~124 sections, ~7,500 keys. Big sections still to do (sorted by impact):

| Section | Keys | Priority |
|---|---|---|
| `word_sounds` | 220 | Word Sounds Studio (phonics — high impact for early grades) |
| `help_mode` | ~810 | Hover-help text (`ui_strings.help_mode` + entire `help_strings.js`) |
| `adventure` | ? | Adventure Mode (gamified narrative) |
| `quiz` | ? | Quiz tool |
| `glossary` | ? | Glossary tool |
| `simplified` | ? | Text adaptation tool |
| `lesson_plan` | ? | Lesson plan generator |
| (~115 more tool-specific sections) | | |

Find next section sizes:

```bash
node -e "const fs=require('fs'); const u=new Function('return '+fs.readFileSync('ui_strings.js','utf8').replace(/^\s*export\s+const\s+\w+\s*=/m, 'return').replace(/^\s*\/\/.*\$/gm,'').trim().replace(/^return/,'').trim())(); const p=JSON.parse(fs.readFileSync('lang/french.js','utf8')); const done=Object.keys(p); const remaining=Object.keys(u).filter(s=>!done.includes(s)).sort((a,b)=>Object.keys(u[b]||{}).length-Object.keys(u[a]||{}).length); for(const s of remaining.slice(0,20)) console.log(Object.keys(u[s]||{}).length.toString().padStart(4), s);"
```

## The per-batch workflow (proven, ~5-15 min/batch depending on section size)

### Step 1 — Dump a section's English keys to a tmp file

```bash
# Pick a section by name. Example: "word_sounds" (220 keys)
node -e "const fs=require('fs'); const u=new Function('return '+fs.readFileSync('ui_strings.js','utf8').replace(/^\s*export\s+const\s+\w+\s*=/m, 'return').replace(/^\s*\/\/.*\$/gm,'').trim().replace(/^return/,'').trim())(); fs.writeFileSync('c:/tmp/lang_src/fr_word_sounds.json', JSON.stringify(u.word_sounds,null,2)); console.log('word_sounds keys:', Object.keys(u.word_sounds).length);"
```

For sections >150 keys, slice into 75-key chunks:
```bash
# Example: chunk 1 of word_sounds (keys 0-75)
node -e "...; const keys=Object.keys(u.word_sounds); const chunk={}; for(const k of keys.slice(0,75)) chunk[k]=u.word_sounds[k]; fs.writeFileSync('c:/tmp/lang_src/fr_word_sounds_a.json', JSON.stringify(chunk,null,2));"
```

### Step 2 — Read the chunk

```
Read c:/tmp/lang_src/fr_word_sounds.json
```

### Step 3 — Build the Edit

**Anchor pattern for adding a NEW section** (most common case):

```
old_string:
    "<some unique tail of last section>"
  }
}

new_string:
    "<same unique tail>"
  },
  "<new_section_name>": {
    "<key1>": "<French translation>",
    "<key2>": "<French translation>",
    ...
  }
}
```

**Anchor pattern for adding to an EXISTING section** (e.g., chunked large section):

```
old_string:
    "<last_key_in_section>": "<French translation>"
  },
  "<next_section_name>": {

new_string:
    "<last_key_in_section>": "<French translation>",
    "<new_key>": "<French translation>",
    ...
  },
  "<next_section_name>": {
```

### Step 4 — Verify, mirror, manifest, commit, push (one-liner)

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('lang/french.js','utf8')); let n=0; function c(o){for(const k in o){if(typeof o[k]==='object'&&o[k]!==null)c(o[k]);else n++}} c(p); console.log('French keys:',n,'sections:',Object.keys(p).length);" && cp lang/french.js desktop/web-app/public/lang/french.js && node dev-tools/update_lang_manifest.cjs && git add lang/french.js desktop/web-app/public/lang/french.js lang/manifest.json desktop/web-app/public/lang/manifest.json && git commit -m "lang: French +<N> keys (<total>, <sections>) - <section_name> COMPLETE" && git push origin main
```

## Translation register & conventions

**Variety:** Parisian / Metropolitan French (the slug `french.js` is the matcher default for plain "French" — Canadian French is a separate `french_canadian.js` pack, not yet built).

**Voice:**
- Default to `vous` (formal, second-person plural) for teacher-facing and mixed-audience text. AlloFlow's primary audience is K-12 educators.
- Switch to `tu` (informal, singular) ONLY for clearly student-direct content (e.g., "Pour vérifier tes réponses..."). Match the source text's register: if the English uses "you" in a student-direct way, use `tu`; for instructions to educators, use `vous`.

**Vocabulary:**
- `ordinateur` (not Quebec's `ordinateur` — same), `téléphone` / `portable` (not `cellulaire`)
- `e-mail` or `mail` (not Quebec's `courriel`)
- `enseignant(e)` for "teacher" (gender-neutral default; do NOT use Spanish-style `docent`)
- `élève` for K-12 student (`étudiant` only for university and up)
- `niveau` for grade level; map K–12 to French school terms:
  - K → Maternelle
  - 1st → CP, 2nd → CE1, 3rd → CE2, 4th → CM1, 5th → CM2
  - 6th → 6e, 7th → 5e, 8th → 4e, 9th → 3e
  - 10th → 2nde, 11th → 1re, 12th → Terminale
  - College → Université, Graduate → Niveau master

**Punctuation:**
- French uses non-breaking space before `: ; ! ?` — I have NOT been inserting these consistently (manual typography would slow translation). The runtime renders without them and it reads naturally; acceptable trade-off.
- Use French quotation marks `«` `»` for quoted UI elements (e.g., « Historique »). I did this where natural.
- Em dashes: Aaron's memory says NO em dashes in user-facing writing. Use commas, semicolons, or colons instead.

**DNT (do not translate):**
- Brand names: `AlloFlow`, `AlloBot`, `BehaviorLens`, `Symbol Studio`, `Report Writer`, `StoryForge`, `SEL Hub`, `STEM Lab`, `Word Sounds Studio` (the tool brand — but `word sounds` as a generic phrase can be translated)
- Tool flagships: `Gemini Canvas`, `Nano Banana`, `Pont Gemini` (this is the French gloss of "Gemini Bridge")
- Acronyms preserved verbatim: `AI` (or translated as `IA` — see below), `TTS`, `XP`, `UI`, `IPA`, `RTI`, `IEP` (international audience), `ELL`, `CVC`, `RPG`, `D20`, `MCQ`, `CSV`, `PDF`, `PNG`, `FAB`, `RSVP`, `ORF`, `WCPM`, `DIBELS`, `AIMSweb`, `Acadience`, `MTSS`, `CCSS`, `NGSS`, `TEKS`, `LMS`, `FERPA`, `ADA`, `WCAG`
- `AI` → `IA` (translate as the abstract concept; preserve `AI` only inside brand/feature names like `AI Auto-Search`)
- `UDL` → `CUA` (Conception Universelle de l'Apprentissage) — French academic term; consistent throughout pack
- Placeholders: `{count}`, `${i + 1}`, `{{double}}` — keep verbatim
- Markdown syntax: `###`, `**bold**`, `*italic*`, `• bullets`, `==highlight==`

**Spelling tweaks specifically for Parisian variety:**
- `clé` (not `clef`)
- `événement` (with circumflex)
- `analyse`, not `analyse` (same)
- `dépôt`, `arrêt`, `tâche` (preserve circumflexes — they are still standard in published French)

## Anti-patterns to avoid (lessons learned from this session)

1. **Don't accidentally use Spanish words.** Caught two: "docent" (Spanish loan) and "Hora de Rimar" (Spanish brand). Stay in French register.

2. **Don't drop placeholder syntax.** `${i + 1}` and `{count}` are template variables — preserve verbatim.

3. **Don't translate JSON path strings.** Source values like `"glossary.style_placeholder"` or `"escape_room.enter_answer"` are leaked key paths, not user-visible content. Mirror them verbatim in the French pack.

4. **Long tour entries:** the `tour.*` keys can be multi-paragraph (1000+ chars). Translate the whole structure including markdown formatting (`### Headers`, `**bold**`, `• bullets`, `\n` for newlines). Keep the structure parallel to English.

5. **Aaron's "no em or en dashes" rule.** Memory note `feedback_no_em_en_dashes`. Substitute with commas, semicolons, colons, periods, parentheses. (I caught myself a few times this session — be vigilant.)

## Working with Aaron

- Aaron is enthusiastic and wants top quality. He says "I'm not in a rush — top quality is everything." Multi-session is acceptable.
- He prefers shipping iteratively and seeing live results (memory: `feedback_ship_and_iterate`).
- **DO NOT delegate to Task agents** for translation — memory note `feedback_agents_take_shortcuts_on_translation` documents that agents write dictionary-substitution scripts that produce Spanglish/Franglish. Translate manually in chat.
- **DO NOT run the CLI batch tool** (`build_priority_packs.cjs` or `build_language_pack.cjs`) — those overwrite hand-translations with Flash-quality output.

## Commits this session (most recent first)

- `33c63545` — toasts COMPLETE (+184)
- `3c19e076` — wizard COMPLETE (+97)
- `3f7f9dad` — tour/launch_pad/guided COMPLETE (+82)
- `e976c9b4` — header/sidebar/history/input COMPLETE (+132)
- `38496f05` — 9 small sections COMPLETE (+127)
- `b37316db` — common section COMPLETE (final batch +83)
- `550536b9`, `d93f6b9b`, `7f82209a`, `db9768a6`, `78194925`, `c9668d2e` — common batches 1-5 (+75 each)

## Suggested next-session plan (priority order)

1. **`word_sounds`** (220 keys) — high-impact phonics tool, biggest remaining single section after help_mode. Slice into 3 chunks of ~75.
2. **`adventure`** — gamified narrative; high engagement value.
3. **`quiz`** — second-most-used assessment tool.
4. **`glossary`** — vocabulary tool, used heavily.
5. **`simplified`** — text adaptation, core differentiation tool.
6. **`lesson_plan`** — completes the lesson-creation flow.
7. Remaining ~118 tool sections — sweep in order of size.
8. **`help_mode`** (last, ~810 keys total) — hover-help is least-frequently seen. Save for the long-haul finishing pass like we did with Spanish.
