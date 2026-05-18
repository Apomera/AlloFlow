# Portuguese (Brazil) Language Pack — Handoff

**Last updated:** 2026-05-18
**Current state:** 1,602 / ~9,307 keys (17% coverage), 43 sections, 86 KB
**Slug:** `portuguese_brazil`
**Dialect:** Brazilian Portuguese (PT-BR), informal "você" register for K-12 student-facing UI
**Live URL:** https://alloflow-cdn.pages.dev/lang/portuguese_brazil.js
**Matcher status:** All common Portuguese aliases (`portuguese`, `Portuguese (Brazil)`, `brasileiro`, `português`, `portuges` misspelling) already route to `portuguese_brazil` — no matcher edits needed.

## Why Brazil?

Per the guide ([lang/LANGUAGE_PACK_GUIDE.md:94](LANGUAGE_PACK_GUIDE.md#L94)): Portuguese (Brazil) is the default for US schools. Portugal + Angola variants exist as separate slugs (`portuguese_portugal`, `portuguese_angola`) and require their own packs if needed. The fuzzy matcher routes a bare "Portuguese" input to `portuguese_brazil`.

## Sections complete (43)

**Core chrome (foundation — every UI surface uses these):**
- `common` (533/533) ✅
- `header` (41/41) ✅
- `sidebar` (39/39) ✅
- `welcome` (4/4) ✅
- `splash` (8/8) ✅
- `entry` (4/4) ✅
- `meta` (21/21) ✅
- `status` (27/27) ✅
- `toolbar` (16/16) ✅
- `launch_pad` (20/20) ✅
- `errors` (23/23) ✅
- `feedback` (4/4) ✅
- `quick_start` (8/8) ✅
- `codenames` (102/102) ✅ — includes 46 PT adjectives + 54 PT animals + 4 strings
- `fab` (1/1) ✅
- `tools` (6/6) ✅
- `actions` (4/4) ✅
- `large_file` (14/14) ✅
- `formatting` (6/6) ✅
- `audio_player` (4/4) ✅
- `a11y` (10/10) ✅
- `read_this_page` (6/6) ✅
- `roles` (13/13) ✅
- `guided` (10/10) ✅
- `toasts` (184/184) ✅
- `settings` (~25/25 incl nested) ✅
- `project_settings` (21/21) ✅
- `ai_backend` (27/27) ✅
- `profiles` (17/17) ✅
- `chat` (5/5) ✅
- `chat_guide` (~74/74 incl nested flow/blueprint/pack) ✅
- `input` (~47/47 incl nested tone_options/level_options/actions) ✅
- `prompts` (4/4) ✅
- `language_selector` (19/19) ✅
- `languages` (3/3) ✅
- `languages_list` (18/18) ✅
- `translate` (4/4) ✅
- `wizard` (~111/111 incl nested tones/lengths/dok_levels) ✅
- `process` (23/23) ✅
- `status_steps` (30/30) ✅
- `progression` (10/10) ✅
- `output` (36/36) ✅
- `fullpack` (14/14) ✅

## Sections NOT YET started (priority for next session)

Following the priority order in [LANGUAGE_PACK_GUIDE.md:152](LANGUAGE_PACK_GUIDE.md#L152), in order of remaining importance:

**Content output types (~530 keys):**
- `analysis`, `simplified`, `outline`, `scaffolds`, `brainstorm`, `glossary`, `glossary_health`, `udl_advice`, `lesson_plan`, `lesson_headers`, `faq`, `quiz`, `visuals`, `visual_director`, `math`

**Teacher block (~975 keys):**
- `alignment`, `standards`, `dashboard`, `session`, `live_polling`, `student`, `student_dashboard`, `teacher`, `tips`, `bot`, `bot_events`, `hints`, `bridge`, `history`, `class_analytics`, `mastery`, `fluency`, `fluency_maze`, `probes`, `games`, `bingo`, `memory`, `matching`, `review_game`, `baking`, `pictionary`, `flashcards`

**Interactive activities (~490 keys):**
- `timeline`, `concept_sort`, `concept_map`, `groups`, `roster`

**Large individual sections:**
- `word_sounds` (220)
- `escape_room` (186)
- `behavior_lens` (~1,100 leaf keys — school-psych clinical, biggest single section)
- `adventure` (432 — biggest student-facing game)
- `help_strings` (782 — last and largest by character count)

**Smaller sections + remaining ~600 keys:**
- `dbq`, `pdf_audit`, `persona`, `immersive`, `tour`, `about`, etc.

## Translation conventions established for this pack

**Register:** Informal `você` form throughout (student-facing K-12). Avoid `vós`/Portugal-formal constructs.

**Vocabulary choices (consistency reference for next session):**
- "Aluno/a" (student), "Professor/a" (teacher), "Pai/Mãe ou Responsável" (parent)
- "Salvar" (save), "Cancelar" (cancel), "Excluir" (delete), "Editar" (edit)
- "Configurações" (settings), "Padrão" (default + standard — context-dependent)
- "Pesquisar" (search), "Buscar" (fetch/get), "Encontrar" (find)
- "Próximo" (next), "Anterior" (previous), "Voltar" (back)
- "Aba" (browser tab), "Cartão" (flashcard), "Cartela" (bingo card)
- "Série" (grade level), "Nível" (level/tier)
- "Recurso" (resource), "Pacote" (pack), "Ficha" (worksheet)
- "Suportes" (scaffolds), "Diferenciação" (differentiation), "Reforço" (reinforcement — context-aware)
- "Texto-Fonte" (source text), "Material-Fonte" (source material)
- "Glossário" (glossary), "Vocabulário-Chave" (key vocabulary)
- "Plano de Aula" (lesson plan), "Padrões" (educational standards)
- "Linha do Tempo" (timeline), "Classificação de Conceitos" (concept sort)
- "Ticket de Saída" (exit ticket — kept as is, common in Brazilian K-12)
- "Modo Aventura" (adventure mode), "Sala de Fuga" (escape room)
- "Brainstorm" (kept English, common in Brazilian academic vocab)
- "Suporte Visual" (visual support), "Organizador Visual" (visual organizer)
- "Ponte" (bridge — for Gemini Bridge)
- "Aprendizagem" (learning — preferred over "aprendizado" in education context)

**Series/grade names:**
- "Educação Infantil" (Kindergarten)
- "1º Ano" through "9º Ano" — elementary + middle school
- "1º/2º/3º do Ensino Médio" — high school (alongside g10, g11, g12 keys)
- "Faculdade" (College), "Pós-Graduação" (Graduate Level)

**DNT preserved verbatim (per universal guide):**
- All brand names: AlloFlow, AlloBot, AlloHaven, StoryForge, LitLab, PoetTree, SEL Hub, STEM Lab, Word Sounds Studio, BehaviorLens, Report Writer, Symbol Studio, Nano Banana, Gemini, Imagen, Kokoro, BINGO
- All acronyms: UDL, SEL, RTI, IEP, FERPA, FAPE, LRE, MTSS, ELL, ASD, ADHD, CASEL, CCSS, NGSS, TEKS, DBQ, DOK, WCAG, ADA, BCBA, BIP, FBA, ABA, IOA, DTT, MSWO, CBM, QTI, IMS, CDN, OCR, TTS, WCPM, DCPM, LMS, RSVP, XP, FAQ
- IPA does NOT become AFI in this pack (per Portuguese, IPA = AFI in Spanish/French/Italian only; Portuguese uses IPA as-is)
- All placeholders: `{name}`, `{count}`, `{grade}`, `{lang}`, `{level}`, `{ext}`, `{type}`, `{score}`, `{label}`, `{current}/{total}`, `${i + 1}` etc — preserved exactly
- Leaked-key-path values like `common.url_placeholder`, `escape_room.enter_answer`, `glossary.style_placeholder`, `modals.save_project.placeholder`, `session.default_placeholder`, `standards.region_framework_placeholder`, `standards.region_optional`, `timeline.revise_placeholder`, `visuals.refiner_placeholder`, `glossary.custom_edit_placeholder`, `groups.new_group_placeholder`, `adventure.social_story_focus_placeholder`, `common.placeholder_*` — preserved as-is per guide section 8

**PT-BR-specific notes:**
- "computador" + "celular" (NOT Portugal's "computador" + "telemóvel")
- "tela" (screen, not "ecrã")
- "arquivo" (file, not "ficheiro")
- "endereço" (address), "URL" stays English
- "marca-texto" (highlighter), "régua" (ruler)
- "atalho" (shortcut)
- Sentence-case for buttons + tabs; Title Case for section headers + major labels
- ã/õ/é/ê/á/à/í/ó/ô/ú/ç diacritics preserved throughout

## Commit log (Portuguese pack)

```
9d22b273 lang: Portuguese (Brazil) +81 keys (81 total, 1% coverage) - common batch 1/?
89bd5800 lang: Portuguese (Brazil) +263 keys (344 total, 4% coverage) - common batches 2-4
dbaad00d (Somali commit that swept my common-COMPLETE work) +189 keys (533 total, 6% coverage) - common section COMPLETE
0b08966b lang: Portuguese (Brazil) +144 keys (677 total, 7% coverage) - header/sidebar/welcome/splash/entry/meta/status
80a38388 lang: Portuguese (Brazil) +247 keys (924 total, 10% coverage) - chrome batch 2
37ab0679 lang: Portuguese (Brazil) +263 keys (1,187 total, 13% coverage) - toasts + settings + project_settings + ai_backend
f43118c1 lang: Portuguese (Brazil) +191 keys (1,378 total, 15% coverage) - settings ecosystem (profiles/chat/chat_guide/input/prompts/language_selector/languages/translate)
d6f5cbcc lang: Portuguese (Brazil) +224 keys (1,602 total, 17% coverage) - generation pipeline (wizard/process/status_steps/progression/output/fullpack)
```

## How to continue (for next Claude session)

1. **Read this doc first** + `lang/LANGUAGE_PACK_GUIDE.md`
2. **Pick the next priority section** from the list above (suggested: content output types — `analysis` first)
3. **Dump the source:**
   ```bash
   node -e "const fs=require('fs'); const u=new Function('return '+fs.readFileSync('ui_strings.js','utf8').replace(/^\s*\/\/.*$/gm,'').trim())(); fs.writeFileSync('c:/tmp/lang_src/SECTION.json', JSON.stringify(u.SECTION, null, 2)); console.log('keys:', Object.keys(u.SECTION).length);"
   ```
4. **Translate one section per Edit**, using the vocabulary conventions above for consistency
5. **Use the anchor pattern:** find the last key of the previous section's closing `}` followed by a unique identifier, replace with `},` + new section
6. **Validate parse after each Edit:**
   ```bash
   node -e "try { const p = JSON.parse(require('fs').readFileSync('lang/portuguese_brazil.js','utf8')); console.log('OK'); } catch(e) { console.log('ERR:', e.message.slice(0,300)); }"
   ```
7. **Pre-commit before pushing** (per [feedback_deploy_must_pre_commit.md](../memory/feedback_deploy_must_pre_commit.md)):
   ```bash
   cp lang/portuguese_brazil.js prismflow-deploy/public/lang/portuguese_brazil.js && \
   node dev-tools/update_lang_manifest.cjs && \
   git add lang/portuguese_brazil.js prismflow-deploy/public/lang/portuguese_brazil.js lang/manifest.json prismflow-deploy/public/lang/manifest.json && \
   git commit -m "lang: Portuguese (Brazil) +N keys (TOTAL total, X% coverage) - <section description>" && \
   git push origin main
   ```
8. **Verify Cloudflare** after each push (15-30 sec lag normal):
   ```bash
   curl -sI "https://alloflow-cdn.pages.dev/lang/portuguese_brazil.js" | head -3
   ```

## NEVER do these

1. **Don't delegate to Task agents** — Spanglish output guaranteed. Per [feedback_agents_take_shortcuts_on_translation.md](../memory/feedback_agents_take_shortcuts_on_translation.md). Translate directly in chat only.
2. **Don't run the CLI Flash batch** — would overwrite hand-translated pack with lower-quality Flash output.
3. **Don't edit only the deploy mirror** — build watcher overwrites it from `lang/portuguese_brazil.js`. Edit canonical first, mirror second.
4. **Don't translate DNT terms** — breaks brand recognition, placeholder substitution, and SpEd legal terminology.
5. **Don't mix Portugal/Angola vocabulary** — keep PT-BR consistent (no "telemóvel", "ecrã", "ficheiro", "rato", "comboio", etc.)
6. **Don't translate leaked-key-path values** — patterns like `common.url_placeholder`, `adventure.social_story_focus_placeholder` are source bugs; preserve verbatim.

## Quality bar

This pack is being translated by Claude in chat, following Aaron's explicit preference for top-quality hand translation over CLI Flash batch ("Option B"). Every entry has been considered for context, K-12 register, and Brazilian Portuguese idiom. Continuation sessions should maintain this bar.
