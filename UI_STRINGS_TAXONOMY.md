# UI_STRINGS Taxonomy

**As of**: 2026-05-17
**Total keys**: 9,307 (8,525 in `ui_strings.js` + 782 in `help_strings.js`)
**Top-level sections**: 143

This doc maps every section of `ui_strings.js` so future maintainers know
where new UI copy goes — and where language packs may have gaps when new
features ship.

## How to use this doc

**Adding new UI copy?** Find the closest section below. If none fits, add a new
top-level section and update this doc.

**Spot-checking a language pack for gaps?** Compare the pack's top-level keys
to this list. Missing sections = either new feature added after pack was built,
or the translator dropped a section. The build script's coverage report will
also flag this.

**Translator brief?** Section names act as context hints. A string in
`launch_pad` is for the initial mode-picker shown on first load. A string in
`adventure` is for the Adventure Mode game UI. Translators should consider
register (formal vs. casual) accordingly.

## Sections by role

### Bootstrap + first contact (~120 keys)
- `tour` (52) — first-time guided tour overlays for new users
- `launch_pad` (20) — initial Full Platform / Guided / Learning Tools / Educator Tools picker
- `guided` (10) — guided-mode walkthrough prompts
- `welcome` (4) — welcome banners
- `splash` (8) — loading screen / splash text
- `entry` (4) — entry-point dispatch
- `quick_start` (8) — quickstart wizard
- `codenames` (4) — privacy-safe student codename picker

### Core chrome + meta (~150 keys)
- `meta` (21) — page titles, document metadata
- `header` (41) — global header bar
- `sidebar` (39) — left-rail tool category labels
- `toolbar` (16) — main-area toolbar
- `fab` (1) — floating action button
- `tools` (6) — generic tool-grid copy
- `actions` (4) — generic action verbs
- `feedback` (4) — global generic feedback strings

### Status, feedback, errors (~290 keys)
- `status` (27) — generic status strings shown in the UI
- `toasts` (184) — pop-up toast notifications across all features
- `errors` (23) — error messages (network, API, validation)
- `error` (1) — single fallback error
- `large_file` (14) — large-file upload progress/errors
- `formatting` (6) — text-formatting toggle labels
- `audio_player` (4) — generic audio controls

### Accessibility + a11y (~30 keys)
- `a11y` (10) — accessibility-specific aria-labels + helper text
- `read_this_page` (6) — read-aloud panel for current view
- `roles` (13) — role/persona labels (teacher/student/parent)

### Settings + preferences (~100 keys)
- `settings` (18) — main settings panel
- `project_settings` (21) — per-project settings
- `canvas_settings` (7) — Canvas LMS integration
- `ai_backend` (27) — model picker + API config
- `profiles` (17) — user profile management
- `chat` (5) + `chat_guide` (28) — AI chat interface

### Input + source material (~30 keys)
- `input` (27) — main input panel (paste/upload/URL/generate)
- `prompts` (4) — prompt builder

### Language + translation (~50 keys)
- `language_selector` (19) — the language picker itself
- `languages` (3) — generic language references
- `languages_list` (18) — language names in a list view
- `translate` (4) — translate-resources controls

### Generation pipeline (~180 keys)
- `wizard` (97) — the topic/grade/tone wizard
- `process` (23) — generation progress steps
- `status_steps` (30) — finer-grained generation status
- `progression` (10) — content-progression markers
- `output` (36) — generated-output common labels
- `fullpack` (14) — Full Resource Pack generator

### Output types (~430 keys)
- `analysis` (16) — text analysis output
- `simplified` (76) — text simplification output
- `outline` (50) — outline generator
- `scaffolds` (33) — writing scaffold cards
- `brainstorm` (30) — brainstorm activity ideas
- `glossary` (76) — visual glossary builder
- `glossary_health` (5) — glossary diagnostics
- `udl_advice` (2) — UDL-aligned suggestions
- `lesson_plan` (55) — lesson plan + study + family guides
- `lesson_headers` (6) — lesson plan section headers
- `faq` (12) — FAQ generator

### Quiz + assessment (~170 keys)
- `quiz` (96) — quiz generator + builder
- `mastery` (26) — concept-mastery celebrations + tracking
- `fluency` (64) — math fluency + reading fluency
- `fluency_maze` (6) — fluency maze game
- `probes` (18) — assessment probes

### Visuals (~75 keys)
- `visuals` (26) — visual generator
- `visual_director` (9) — visual director
- `visual_support` (1) — visual support builder
- `visuals` strings overlap with `concept_map` (20)
- `concept_sort` (55) — concept-sort game/activity

### Document tools (~125 keys)
- `dbq` (88) — Document Based Question analyzer
- `note_taking` (6) + `notes_feedback` (16) + `note_insights` (17) — Note-Taking Templates
- `anchor_chart` (7) — Anchor Chart builder
- `docbuilder` (2) — Doc Builder
- `volume_builder` (7) — Volume builder for serial docs

### Games + interactivity (~390 keys)
- `games` (30) — games hub
- `bingo` (36) — bingo game
- `memory` (21) — memory match
- `matching` (18) — match game
- `review_game` (14) — generic review game shell
- `escape_room` (186) — escape-room style review activity
- `pictionary` (2) — concept pictionary
- `baking` (13) — baking-themed game

### Standards + alignment (~50 keys)
- `alignment` (17) — standards alignment UI
- `standards` (27) — standards picker + display
- `dashboard` (35) — student/teacher dashboard

### Adventure mode (the BIG section)
- `adventure` (432) — entire Adventure Mode game UI
- `adventure_title` (scalar) — top-level title string

### Behavior + analytics (~440 keys)
- `behavior_lens` (296) — Behavior Lens observation tool
- `bl` (29) — short-form Behavior Lens strings
- `class_analytics` (64) — class-wide analytics
- `groups` (62) — student grouping
- `roster` (140) — class roster management

### Sessions + collaboration (~75 keys)
- `session` (68) — live class session controls
- `live_polling` (2) — live polling
- `student` (8) + `student_dashboard` (4) — student-facing surfaces
- `teacher` (5) — teacher-facing surfaces

### Personas + AI (~95 keys)
- `persona` (95) — persona builder for AI chat

### Tips + bot (~80 keys)
- `tips` (33) — proactive AlloBot tips
- `bot` (21) — AlloBot text
- `bot_events` (27) — AlloBot event reactions
- `hints` (8) — generic hint system

### Export (~140 keys)
- `export` (70) — export pipeline + presets
- `export_menu` (8) — export menu
- `export_status` (19) — export progress
- `print` (29) — print-specific copy
- `pdf_audit` (71) — PDF accessibility audit results
- `diff_view` (15) — diff viewer for revisions

### Immersive + reader modes (~50 keys)
- `immersive` (48) — Immersive Reader mode
- `timer` (8) — study timer

### Reports + clinical (~30 keys)
- `report_writer` (2) — Report Writer (psychoed reports)
- `rti` (11) — RTI tier UI
- `learner` (30) — learner profile

### Modals + popups (~40 keys)
- `modals` (26) — generic modal copy
- `educator_hub` (21) — educator hub modal
- `learning_hub` (13) — learning hub modal (STEM Lab / SEL Hub / etc.)
- `stem_lab` (3) — STEM Lab landing
- `sel_hub` (2) — SEL Hub landing

### Word study + literacy (~225 keys)
- `word_sounds` (220) — Word Sounds Studio (phonemic awareness)
- `common` (533) — shared / generic UI words (Save / Cancel / etc.)
- `text_tools` (9) — text manipulation toolbar

### Numeracy (~40 keys)
- `math` (39) — math-mode UI
- `flashcards` (37) — flashcard study mode

### History + version control (~25 keys)
- `history` (25) — generation history panel

### Survey + research (~30 keys)
- `survey` (8) — user feedback survey
- `research` (22) — research/citation tools

### About + meta (~40 keys)
- `about` (23) — about dialog
- `socratic` (12) — Socratic dialogue mode

### Misc small sections
- `lms` (3), `annotation` (7), `live_polling` (2), `organizer` (1), etc.

### help_mode + help_strings (782 keys)
- `help_mode` (25) — help mode toggle UI
- `help_strings.js` (782) — long-form tooltip + help-mode descriptions
  shown when user hovers any UI element with Help Mode active.
  This file is separate from `ui_strings.js` and is fetched on-demand.
  Translator note: these are LONG paragraphs (often 200-500 words each)
  describing each feature. Translation should preserve markdown structure.

## When you add a new feature

**Required steps to keep language packs in sync:**

1. Add UI strings to the appropriate section in `ui_strings.js` (or create a new section if needed)
2. If the strings include `{placeholders}`, document them in the source comment
3. After deploy, run `npm run build:lang -- --lang="Spanish (Latin America)" --resume` to add the new strings to that language pack. The `--resume` flag preserves existing translations; only new keys are sent to Gemini.
4. Repeat for each language pack in `lang/`
5. Or: ask Claude in chat to fill the gap with high-quality translations matching the existing pack's style.

**Coverage check:** A future automated check (`dev-tools/check_lang_coverage.cjs`)
should be added that diffs each pack's keys against `ui_strings.js` keys and
fails CI if coverage drops below 99%.

## Locale variants — when to make a new pack vs reuse

- **Spanish:** `Spanish (Latin America)` is the default. `Spanish (Castilian)` is a separate pack only for users who explicitly select it (vosotros, ordenador, móvil, vale).
- **French:** `French` defaults to European French; `French (Canadian)` only for explicit selection (courriel, magasiner, fin de semaine).
- **Portuguese:** `Portuguese (Brazil)` is the default in US schools; `Portuguese (Portugal)` and `Portuguese (Angola)` are separate packs.
- **Chinese:** `Chinese (Simplified)` for mainland/Singapore audiences; `Chinese (Traditional)` for Taiwan/HK/Macau.
- **Arabic:** Use MSA (Modern Standard Arabic) for written UI. Spoken variants (Levantine, Egyptian, Gulf, Maghrebi, Sudanese) are separate packs only for explicit selection.
- **Chin languages:** Hakha, Falam, Matu, Zomi are distinct enough that each warrants its own pack. PPS has Chin refugee families.

## Strings to NEVER translate (mirrored in `translation_glossary.js`)

- All brand names: AlloFlow, AlloBot, AlloHaven, StoryForge, LitLab, PoetTree, SEL Hub, STEM Lab, etc.
- All acronyms: UDL, SEL, RTI, IEP, FERPA, FAPE, LRE, MTSS, etc.
- All `{placeholders}`: `{name}`, `{count}`, `{grade}`, etc.
- All units: 5MB, 24°C, 60fps, etc.
- All URLs and hex colors
- The token `‹dnt:N›` if it ever appears (used by translateChunk runtime — should not reach a final pack)
