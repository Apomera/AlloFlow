# Portuguese (Brazil) Language Pack — Handoff

> **Historical language-pack handoff (2026-07-09):** This records the May 19 Portuguese (Brazil) completion pass. The repo's language inventory has grown since then; verify `lang/portuguese_brazil.js`, the mirrored public copy, and current i18n reports before relying on the key counts or "complete" status below.

**Last updated:** 2026-05-19 (Session 4 — 100% COMPLETE)
**Current state:** 9,513 / 9,307+ keys (100% coverage, exceeds target), 163 sections, ~1029 KB
**Slug:** `portuguese_brazil`
**Dialect:** Brazilian Portuguese (PT-BR), informal "você" register for K-12 student-facing UI
**Live URL:** https://alloflow-cdn.pages.dev/lang/portuguese_brazil.js
**Matcher status:** All common Portuguese aliases (`portuguese`, `Portuguese (Brazil)`, `brasileiro`, `português`, `portuges` misspelling) already route to `portuguese_brazil` — no matcher edits needed.

## Status: 100% COMPLETE ✓

Portuguese (Brazil) is now one of **six fully complete** language packs (alongside Arabic, Chinese Simplified, French, Somali, Spanish LatAm). The manifest shows ✓ status. All sections — including behavior_lens (1,483 leaves), help_strings (782 long-form pedagogical descriptions), and the STEM Lab subsections (periodic table elements, dissection anatomy, music synthesis, brain atlas, galaxy/rocks/planet terms) — are translated.

## Sections complete (156)

**Foundation (Session 1 — ~1,602 keys):**
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
- Misc batch B: modals, immersive, timer, help_mode (25 initial), grades, grades_short, error, socratic, blueprint, organizer, stem_lab, explore, survey, rti, learner, research, resource_builder, print, educator_hub, report_writer, learning_hub, sel_hub, _version, adventure_title, cancel, move_down, move_up, bl, docbuilder, note_taking, anchor_chart, lms, annotation, visual_support, canvas_settings, diff_view, volume_builder, notes_feedback, note_insights
- about (146 incl. features_list with 24 tool cards)
- persona (113 incl. badges/summary/toasts)
- dbq (88 incl. all 5 analysis modes)
- pdf_audit (281 incl. all WCAG knowbility/ADA content, live_chunk, integrity, preview, toolbar)
- stem partial (177 small subsections only)
- behavior_lens batch 1 (380 leaves)

**Session 3 additions (+1,874 keys, brought to 94%):**
- **behavior_lens COMPLETE (1,483 total leaves):**
  - Batch 2 (+409): abc/func short labels, reinforcers (reinf_*), coping strategies, cycle phases, analysis nested, ph (placeholders, ~75), toast (~190 messages)
  - Batch 3 (+641): ui (232 leaves — all clinical tool labels), top-level scalars (toast_*, stat_*, etc.), nested objects (abaguide, allobot_chat, consent, counseling, freq, homelog, interval, intervention, obs, profile, progress, selfcheck, snapshot, workflow), raw catalog (340 leaves of all individual data labels)
  - Batch 4 (+53): dq (Data Quality scorecard), fba (workflow steps), heatmap, sandbox
- **help_strings COMPLETE (782 keys → merged under help_mode, now 796 keys total):**
  - Batch 1 (98): adventure_*, ai_backend_*, alignment, anchor_chart, bingo, bl_*, blueprint, bot_*
  - Batch 2 (98): bot/brainstorm/bridge_*, chat, concept_sort, cornell, crossword, dashboard
  - Batch 3 (98): dashboard rti/safety, dbq, educator hub cards, entry codename, escape_room, export formats, fab, faq, flashcard, fluency, fullpack, glossary
  - Batch 4 (98): glossary deep, group, header, hints, history, immersive
  - Batch 5 (98): immersive, input, lab_report, learner_progress, lesson, math, matching, memory, note_taking, outline, pdf_audit, persona, perspective_crawl, quiz csv
  - Batch 6 (98): quiz deep, read_this_page, reading_response, roles, roster, scaffolds, settings, sidebar, simplified deep, socratic open
  - Batch 7 (98): socratic, source, standards, syntax, teacher gate, timeline deep, timer, tool catalog (20 cards), tour, ui_lang, venn, visuals open
  - Batch 8 (96, 11 overwrites): visuals deep, volume_builder, welcome, wizard (full), word_sounds, ws_gen, xp_modal

## Sections NOT YET started

**NONE — pack is at 100% coverage.** Session 4 closed the final gap by translating the 7 remaining STEM Lab subsections (792 leaves):
- periodic (196): full periodic table with PT-BR IUPAC element names (Hidrogênio → Oganessônio) + element-description blurbs + common compounds (Dióxido de Carbono, Bicarbonato de Sódio, etc.)
- dissection (217): Virtual Dissection Lab anatomy terms — earthworm/eye/heart/brain structures + cardiac valves + neural/excretory/respiratory pathways
- synth (97) + synth_ui (115): music synthesizer (escalas, acordes, intervalos, ADSR) + brain atlas anatomy (lobos, áreas de Broca/Wernicke, gânglios basais, etc.)
- galaxy (71): astronomy — star types (O-M), nebulae (Órion, Caranguejo, Águia, Lagoa), stellar lifecycle (protoestrela → supernova → estrela de nêutrons / buraco negro)
- rocks (53): geology — rock types (Ígnea/Sedimentar/Metamórfica), mineral identification (quartzo, calcita, hematita), Mohs hardness
- planet_view (43): planetary geography mission briefings — Olympus Mons, Valles Marineris, Fossa das Marianas, Grande Mancha Vermelha, anel de Saturno, etc.

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
- "Andaime" (scaffold), "Cartaz-Âncora" (anchor chart)
- "Mestre de Jogo" (Game Master, for Adventure mode)
- "Fluxograma" / "Mapa de Conceitos" / "Diagrama de Venn" (graphic organizers)
- "Mantido por Fuga" / "Mantido por Atenção" / "Mantido por Tangível" (function-of-behavior phrasings)
- "Notas Cornell" / "Resposta de Leitura" / "Relatório de Laboratório" (note-taking templates)
- "Educação Infantil" (K), "1º Ano" through "12º Ano" (grade levels)
- BehaviorLens clinical: ABC (Antecedente/Comportamento/Consequência), FBA, BIP, MTSS, RTI, DRA, DRI, DRO, DRL, DTT, IOA, MSWO, TARF, IRP-15, Tau-U, NAP, PND — all kept as acronyms
- "Reforçador" (reinforcer), "Comportamento Alternativo" (replacement behavior), "Função" (function), "Ambiente" (setting)
- CER framework: "Afirmação / Evidência / Raciocínio"
- "DUA" (UDL — Desenho Universal para Aprendizagem) for the framework
- DOK kept as "DOK" (Profundidade do Conhecimento)
- Tier 2/Tier 3 vocabulary kept as "Nível 2" / "Nível 3"

**Series/grade names:**
- "Educação Infantil" (Kindergarten)
- "1º Ano" through "9º Ano" — elementary + middle
- "10º/11º/12º Ano" — high school (also referred as "1º/2º/3º do Ensino Médio")
- "Faculdade" (College), "Pós-Graduação" (Graduate Level)

**DNT preserved verbatim:** all brand names (AlloFlow, BehaviorLens, AlloBot, Cornell, Pomodoro, etc.), all acronyms (UDL, SEL, IEP, FERPA, etc.), all placeholders (`{name}`, `{count}`, `${i+1}` etc.), all leaked-key-path values.

**PT-BR-specific:** "computador" + "celular" (not "telemóvel"), "tela" (not "ecrã"), "arquivo" (not "ficheiro"), proper ã/õ/ç diacritics.

## Commit log highlights

```
Session 1 + early Session 2: foundation + content + teacher + games + interactive + adventure → 6,290 keys (68%)
c441f4de (S2) pdf_audit (281 keys) → 6,290
6f3ef731 (S2) stem small subsections (177) → 6,467
e11f49e4 (S2) behavior_lens batch 1 (380) → 6,847 (74%)

64167d0a (S3) behavior_lens batch 2 (409) → 7,256 (78%)
f9b26361 (S3) behavior_lens batch 3 (641) → 7,897 (85%)
5728f2e3 (S3) behavior_lens batch 4 (53) — behavior_lens COMPLETE → 7,950 (85%)
2b0cfe5a (S3) help_strings batch 1/8 (98) → 8,048 (86%)
d925979f (S3) help_strings batch 2/8 (98) → 8,146 (88%)
cb5009be (S3) help_strings batch 3/8 (98) → 8,244 (89%)
11029c84 (S3) help_strings batch 4/8 (98) → 8,342 (90%)
1c610cdc (S3) help_strings batch 5/8 (98) → 8,440 (91%)
876072bb (S3) help_strings batch 6/8 (98) → 8,538 (92%)
02c44218 (S3) help_strings batch 7/8 (98) → 8,636 (93%)
86e4ba90 (S3) help_strings batch 8/8 (96) — help_strings COMPLETE → 8,721 (94%)
```

## How to continue (next session, if any)

The pack is **100% COMPLETE** — no continuation work required. Only follow-ups would be:

1. **Polish pass** if any specific term reads wrong in classroom use (PT-BR speakers reporting issues)
2. **New-feature backfill** as AlloFlow ships new English UI strings — run the standard merge pattern:
   ```bash
   # Edit lang/portuguese_brazil.js directly OR use a merge script like:
   node c:/tmp/merge_help_mode.js c:/tmp/<new_translations>.json
   ```
3. **Ship with the pre-commit pattern** (per [feedback_deploy_must_pre_commit.md](../memory/feedback_deploy_must_pre_commit.md)):
   ```bash
   cp lang/portuguese_brazil.js desktop/web-app/public/lang/portuguese_brazil.js && \
   node dev-tools/update_lang_manifest.cjs && \
   git add lang/portuguese_brazil.js desktop/web-app/public/lang/portuguese_brazil.js lang/manifest.json desktop/web-app/public/lang/manifest.json && \
   git commit -m "lang: Portuguese (Brazil) +N keys (<reason>)" && \
   git push origin main
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

Translated by Claude in chat following Aaron's explicit preference for top-quality hand translation over CLI Flash batch ("Option B"). Every entry has been considered for context, K-12 register, and Brazilian Portuguese idiom. The behavior_lens clinical section (1,483 leaves) and help_strings pedagogical descriptions (782 keys) were translated with particular care to preserve clinical accuracy (BACB-aligned terminology), pedagogical nuance (Hattie's feedback research, McNeill & Krajcik CER framework, Keene & Zimmermann's Mosaic of Thought, NGSS science practices), and Brazilian educational context (Educação Infantil → Ensino Médio progression).
