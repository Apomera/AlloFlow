# Portuguese (Brazil) Language Pack — Handoff

**Last updated:** 2026-05-18 (Session 2)
**Current state:** 6,847 / ~9,307 keys (74% coverage), 143 sections, 445 KB
**Slug:** `portuguese_brazil`
**Dialect:** Brazilian Portuguese (PT-BR), informal "você" register for K-12 student-facing UI
**Live URL:** https://alloflow-cdn.pages.dev/lang/portuguese_brazil.js
**Matcher status:** All common Portuguese aliases (`portuguese`, `Portuguese (Brazil)`, `brasileiro`, `português`, `portuges` misspelling) already route to `portuguese_brazil` — no matcher edits needed.

## Sections complete (143)

**Foundation (Session 1 — ~1,602 keys, 17%):**
- All foundational chrome: common, header, sidebar, toolbar, welcome, splash, entry, meta, status, errors, feedback, quick_start, codenames, fab, tools, actions, large_file, formatting, audio_player, a11y, read_this_page, roles, guided, launch_pad
- toasts (184), settings + project_settings + ai_backend
- Settings ecosystem: profiles, chat, chat_guide, input, prompts, language_selector, languages, languages_list, translate
- Generation pipeline: wizard, process, status_steps, progression, output, fullpack

**Session 2 additions (+5,245 keys, brought to 74%):**
- Content output types: analysis, simplified, outline, scaffolds, brainstorm, glossary, glossary_health, udl_advice, lesson_plan, lesson_headers, faq, visuals, visual_director, math
- quiz (96 + nested tour/help/quick_start/boss/teams/status)
- Teacher block: alignment, standards, dashboard (172 incl. class_notebook/bulk/comments), session, live_polling, student, student_dashboard, teacher, tips, bot, bot_events, hints, bridge, history, class_analytics, mastery, fluency, fluency_maze, probes
- Games batch: games (135 incl. all *_sort variants), bingo, memory, matching, review_game, baking (167 incl. leavening/emulsion/scaler/oven/diagnosis/gluten/browning), pictionary, flashcards
- Interactive: timeline, concept_sort, concept_map, groups, roster (with bridge_f2f)
- Large sections: word_sounds (220), escape_room (186), adventure (529)
- Misc batch A: tour, text_tools, export_menu, export, export_status
- Misc batch B: modals, immersive, timer, help_mode, grades, grades_short, error, socratic, blueprint, organizer, stem_lab, explore, survey, rti, learner, research, resource_builder, print, educator_hub, report_writer, learning_hub, sel_hub, _version, adventure_title, cancel, move_down, move_up, bl, docbuilder, note_taking, anchor_chart, lms, annotation, visual_support, canvas_settings, diff_view, volume_builder, notes_feedback, note_insights
- about (146 incl. features_list with 24 tool cards)
- persona (113 incl. badges/summary/toasts)
- dbq (88 incl. all 5 analysis modes)
- pdf_audit (281 incl. all WCAG knowbility/ADA content, live_chunk, integrity, preview, toolbar)
- stem partial (177 small subsections only)
- behavior_lens batch 1 (380 leaves: title, abc, obs, overview, hub catalog with 70+ tool cards, abc, overview, token, hotspot, export, record, hypothesis, goals, contract, cycle, reinforcer, audit, triangulation, impact, crisis, traffic, datasheet, homenote, fidelity, feasibility, gas, pocket, plus inline fields through coping_movement)

## Sections NOT YET started (~2,460 keys remaining)

**behavior_lens batches 2-4** (~1,103 leaves remaining, school-psych clinical):
Top-level keys from `bcba` through end of section. The four planned batch splits:
- Batch 1: title→coping_movement (380 leaves) ✅ DONE
- Batch 2: keys through "toast" (~409 leaves)
- Batch 3: keys through "raw" (~641 leaves)
- Batch 4: keys through "sandbox" (~53 leaves)

**help_strings** (782 keys, 1.2 MB source) — biggest single remaining work
- File: `help_strings.js` at repo root
- Long-form hover-help descriptions
- Plan: 6-10 batches of 75-100 keys each
- Per the guide section 7, these go under `help_mode` nested key in the pack
- Add using template: `out.help_mode = out.help_mode || {}; for(const k of help_strings_keys) out.help_mode[k] = translation`

**stem section (~792 keys remaining)** — periodic(196), dissection(217), synth(97), synth_ui(115), galaxy(71), rocks(53), planet_view(43)
- Many of these have auto-generated keys with emoji-escape values (e.g. `"u2b50": "\\u2B50 +"`)
- Periodic table elements, dissection terminology, synthesizer parameters
- Lower user-visibility priority since most STEM Lab tools are highly specialized

**Smaller misc still missing**: a handful of orphan top-level keys not in standard sections.

## Translation conventions established

**Register:** Informal `você` form throughout (student-facing K-12). Avoid `vós`/Portugal-formal constructs.

**Vocabulary choices (consistency reference):**
- "Aluno/a" (student), "Professor/a" (teacher), "Pai/Mãe ou Responsável" (parent)
- "Salvar" (save), "Cancelar" (cancel), "Excluir" (delete), "Editar" (edit)
- "Configurações" (settings), "Padrão" (default + standard — context-dependent)
- "Pesquisar" (search), "Buscar" (fetch/get), "Encontrar" (find)
- "Próximo" (next), "Anterior" (previous), "Voltar" (back)
- "Aba" (browser tab), "Cartão" (flashcard), "Cartela" (bingo card)
- "Série" (grade level), "Nível" (level/tier)
- "Recurso" (resource), "Pacote" (pack), "Ficha" (worksheet)
- "Suportes" (scaffolds), "Diferenciação" (differentiation), "Reforço" (reinforcement)
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
- BehaviorLens clinical: ABC (Antecedente/Comportamento/Consequência), FBA, BIP, MTSS, RTI, DRA, DRI, DRO, DRL, DTT, IOA, MSWO, TARF, IRP-15, Tau-U, NAP, PND — all kept as acronyms
- "Reforçador" (reinforcer), "Comportamento Alternativo" (replacement behavior), "Função" (function), "Ambiente" (setting)

**Series/grade names:**
- "Educação Infantil" (Kindergarten)
- "1º Ano" through "9º Ano" — elementary + middle
- "10º/11º/12º Ano" — high school (also referred as "1º/2º/3º do Ensino Médio")
- "Faculdade" (College), "Pós-Graduação" (Graduate Level)

**DNT preserved verbatim:** all brand names (AlloFlow, BehaviorLens, etc.), all acronyms (UDL, SEL, IEP, etc.), all placeholders (`{name}`, `{count}`, `${i+1}` etc.), all leaked-key-path values.

**PT-BR-specific:** "computador" + "celular" (not "telemóvel"), "tela" (not "ecrã"), "arquivo" (not "ficheiro"), proper ã/õ/ç diacritics.

## Commit log highlights (Session 2)

```
9d22b273 (S1) +81 keys (81 total) - common batch 1/?
89bd5800 (S1) +263 keys (344) - common batches 2-4
dbaad00d (S1) +189 keys (533) - common section COMPLETE
0b08966b (S1) +144 keys (677) - header/sidebar/welcome/splash/entry/meta/status
80a38388 (S1) +247 keys (924) - chrome batch 2
37ab0679 (S1) +263 keys (1,187) - toasts + settings + ai_backend
f43118c1 (S1) +191 keys (1,378) - settings ecosystem
d6f5cbcc (S1) +224 keys (1,602) - generation pipeline
f9f11627 (S2) +378 keys (1,980) - content batch 1
0b6bf36f (S2) +228 keys (2,208) - content batch 2 (lesson_plan/faq/visuals/math)
584df291 (S2) +234 keys (2,442) - quiz section
a9e18e22 (S2) +322 keys (2,764) - teacher block 1
[swept] (S2) +353 keys (3,117) - teacher block 2 (rolled into Arabic agent commit)
af24853a (S2) +434 keys (3,551) - games batch
2905aa7e (S2) +488 keys (4,039) - interactive batch
d2800303 (S2) +406 keys (4,445) - word_sounds + escape_room
d79593ea (S2) +529 keys (4,974) - adventure section COMPLETE
c5a7047f (S2) +172 keys (5,146) - misc batch A
b5cfb307 (S2) +516 keys (5,662) - misc batch B
d1a4b72e (S2) +347 keys (6,009) - about + persona + dbq
c441f4de (S2) +281 keys (6,290) - pdf_audit
6f3ef731 (S2) +177 keys (6,467) - stem small subsections
e11f49e4 (S2) +380 keys (6,847) - behavior_lens batch 1
```

## How to continue (next session)

1. **Read this doc + `lang/LANGUAGE_PACK_GUIDE.md`** first
2. **Pick the next priority section:**
   - Recommended: continue behavior_lens batches 2-4 (clinical content, school-psych priority)
   - Then: help_strings (largest remaining; 782 keys; high user-visibility for Help Mode)
   - Optional: remaining stem subsections (auto-generated content, lower priority)
3. **Use the pre-commit pattern** (per `feedback_deploy_must_pre_commit.md`):
   ```bash
   cp lang/portuguese_brazil.js prismflow-deploy/public/lang/portuguese_brazil.js && \
   node dev-tools/update_lang_manifest.cjs && \
   git add lang/portuguese_brazil.js prismflow-deploy/public/lang/portuguese_brazil.js lang/manifest.json prismflow-deploy/public/lang/manifest.json && \
   git commit -m "lang: Portuguese (Brazil) +N keys (TOTAL total, X% coverage) - <section description>" && \
   git push origin main
   ```
4. **Validate parse after each Edit:**
   ```bash
   node -e "try { const p = JSON.parse(require('fs').readFileSync('lang/portuguese_brazil.js','utf8')); console.log('OK'); } catch(e) { console.log('ERR:', e.message.slice(0,300)); }"
   ```

## NEVER do these

1. **Don't delegate to Task agents** — Spanglish output guaranteed. Per [feedback_agents_take_shortcuts_on_translation.md](../memory/feedback_agents_take_shortcuts_on_translation.md). Translate directly in chat only.
2. **Don't run the CLI Flash batch** — would overwrite hand-translated pack with lower-quality Flash output.
3. **Don't edit only the deploy mirror** — build watcher overwrites it from `lang/portuguese_brazil.js`. Edit canonical first, mirror second.
4. **Don't translate DNT terms** — breaks brand recognition, placeholder substitution, and SpEd legal terminology.
5. **Don't mix Portugal/Angola vocabulary** — keep PT-BR consistent (no "telemóvel", "ecrã", "ficheiro", "rato", "comboio", etc.)
6. **Don't translate leaked-key-path values** — patterns like `common.url_placeholder`, `adventure.social_story_focus_placeholder` are source bugs; preserve verbatim.
7. **Don't translate auto-generated stem keys** with "u2b50"-style escape values — preserve the escape sequences in values verbatim.

## Quality bar

Translated by Claude in chat following Aaron's explicit preference for top-quality hand translation over CLI Flash batch ("Option B"). Every entry has been considered for context, K-12 register, and Brazilian Portuguese idiom. Continuation sessions should maintain this bar.
